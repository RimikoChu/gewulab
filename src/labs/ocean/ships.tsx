// 海上的船和浮标：远洋科考船（尾部 A 形架、绞车、吊机）、秘鲁的围网渔船（船头驾驶室、船尾网台、动力滑车和小艇）、
// 表层漂流浮标（球形浮体、太阳能板和天线，下面拖着水帆）。模型按米建，水线在 y = 0、船头朝 +x；放到地球上时按比例缩小（示意，放大画）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, lathe } from '@/lab-kit'

// ---------- 船体放样 ----------
interface Hull { L: number; B: number; deck: number; draft: number; sheer: number; bowRake: number; paint: { bottom: string; boot: string; side: string; top: string } }
/** 船体的一个截面：u 从船尾 0 到船头 1，v 从龙骨 0 绕到甲板边 1 */
function section(h: Hull, u: number, v: number) {
  const bow = Math.max(0, (u - 0.68) / 0.32), stern = Math.max(0, (0.08 - u) / 0.08)
  const top = h.deck + h.sheer * bow ** 2
  const keel = -h.draft + h.draft * 0.75 * bow ** 3 + h.draft * 0.8 * stern ** 1.6
  const wDeck = (h.B / 2) * (1 - bow ** 2.1) * (1 - 0.1 * stern), wLow = (h.B / 2) * (1 - bow ** 0.85) * (1 - 0.35 * stern)
  const H = top - keel, rb = Math.min(h.B * 0.13, wLow * 0.6)
  let z: number, y: number
  if (v < 0.3) { const a = (v / 0.3) * Math.PI / 2; z = (wLow - rb) * (v / 0.3) + rb * Math.sin(a) * (v / 0.3) ** 0.2; y = keel + rb * (1 - Math.cos(a)) * 0.9 }
  else { const k = (v - 0.3) / 0.7; z = wLow + (wDeck - wLow) * k ** 1.6; y = keel + rb * 0.9 + (H - rb * 0.9) * k }
  const x = -h.L / 2 + h.L * u - h.bowRake * bow * (1 - (y - keel) / H)
  return [x, y, z] as const
}
function hullGeos(h: Hull) {
  const NU = 70, NV = 22, pos: number[] = [], col: number[] = [], idx: number[] = [], c = new THREE.Color()
  const paint = (y: number) => c.set(y < -0.05 * h.draft ? h.paint.bottom : y < 0.08 * h.deck ? h.paint.boot : y > h.deck * 0.86 ? h.paint.top : h.paint.side)
  for (const side of [1, -1]) {
    const base = pos.length / 3
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const [x, y, z] = section(h, i / NU, j / NV); pos.push(x, y, z * side); paint(y); col.push(c.r, c.g, c.b) }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = base + i * (NV + 1) + j, b = a + NV + 1; if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1) }
  }
  const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hull.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); hull.setIndex(idx); hull.computeVertexNormals()
  // 方尾板
  const pts: THREE.Vector2[] = []
  for (let j = 0; j <= NV; j++) { const [, y, z] = section(h, 0, j / NV); pts.push(new THREE.Vector2(z, y)) }
  for (let j = NV; j >= 0; j--) { const [, y, z] = section(h, 0, j / NV); pts.push(new THREE.Vector2(-z, y)) }
  const transom = new THREE.ShapeGeometry(new THREE.Shape(pts)); transom.rotateY(-Math.PI / 2); transom.translate(-h.L / 2, 0, 0)
  // 甲板
  const dp: number[] = [], di: number[] = []
  for (let i = 0; i <= NU; i++) { const [x, y, z] = section(h, i / NU, 1); dp.push(x, y - 0.02, z, x, y - 0.02, -z) }
  for (let i = 0; i < NU; i++) { const a = i * 2; di.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  const deck = new THREE.BufferGeometry(); deck.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)); deck.setIndex(di); deck.computeVertexNormals()
  // 栏杆：两道扶手加立柱
  const parts: THREE.BufferGeometry[] = []
  for (const side of [1, -1]) {
    const rp: THREE.Vector3[] = []
    for (let u = 0.02; u <= 0.97; u += 0.015) { const [x, y, z] = section(h, u, 1); rp.push(new THREE.Vector3(x, y, (z - 0.06) * side)) }
    for (const hh of [0.5, 1.0]) parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rp.map(p => p.clone().setY(p.y + hh))), 120, 0.03, 5))
    for (let k = 0; k < rp.length; k += 2) { const s = new THREE.CylinderGeometry(0.025, 0.025, 1, 5); s.translate(rp[k].x, rp[k].y + 0.5, rp[k].z); parts.push(s) }
  }
  const rail = mergeGeometries(parts.map(p => p.toNonIndexed()))
  return { hull, transom, deck, rail }
}
function HullMesh({ h, deckColor }: { h: Hull; deckColor: string }) {
  const g = useMemo(() => hullGeos(h), [h])
  return <group>
    <mesh geometry={g.hull} castShadow receiveShadow><meshPhysicalMaterial vertexColors roughness={0.4} clearcoat={0.4} clearcoatRoughness={0.3} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.transom}><meshStandardMaterial color={h.paint.side} roughness={0.45} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.deck}><meshStandardMaterial color={deckColor} roughness={0.85} /></mesh>
    <mesh geometry={g.rail}><meshStandardMaterial color="#e8eae6" roughness={0.45} metalness={0.2} /></mesh>
  </group>
}
const WHITE = '#eceeeb'
function Block({ p, s, r = 0.15, c = WHITE }: { p: [number, number, number]; s: [number, number, number]; r?: number; c?: string }) {
  return <RoundedBox args={s} radius={r} smoothness={3} position={p}><meshPhysicalMaterial color={c} roughness={0.42} clearcoat={0.4} clearcoatRoughness={0.3} /></RoundedBox>
}
/** 一排窗：深色玻璃 */
function Windows({ x0, x1, y, z, w, h, step }: { x0: number; x1: number; y: number; z: number; w: number; h: number; step: number }) {
  const geo = useMemo(() => {
    const gs: THREE.BufferGeometry[] = []
    for (let x = x0; x <= x1 + 1e-6; x += step) for (const s of [1, -1]) { const g = new THREE.PlaneGeometry(w, h); if (s < 0) g.rotateY(Math.PI); g.translate(x, y, s * (z + 0.02)); gs.push(g) }
    return mergeGeometries(gs)
  }, [x0, x1, y, z, w, h, step])
  return <mesh geometry={geo}><meshPhysicalMaterial color="#14202b" roughness={0.08} metalness={0.3} /></mesh>
}

// ---------- 远洋科考船：长约 96 m ----------
const RV: Hull = { L: 96, B: 17, deck: 6, draft: 5.5, sheer: 2.6, bowRake: 3.2, paint: { bottom: '#7a2a22', boot: '#17191c', side: '#1d3c63', top: '#eef0ee' } }
export function ResearchShip({ aframe = 0 }: { aframe?: number }) {
  return <group>
    <HullMesh h={RV} deckColor="#6f7d6c" />
    <Block p={[11.9, 8.2, 0]} s={[23.4, 4.4, 14]} />
    <Block p={[13.4, 11.8, 0]} s={[21.2, 2.8, 13.2]} />
    <Block p={[15.4, 14.6, 0]} s={[17.6, 2.8, 12.4]} />
    <Block p={[17.6, 17.4, 0]} s={[10.5, 2.8, 16.4]} />
    <Windows x0={3} x1={22} y={8.6} z={7} w={1} h={0.9} step={2.2} />
    <Windows x0={4} x1={22.5} y={12} z={6.6} w={1.1} h={0.85} step={1.9} />
    <Windows x0={13} x1={22.4} y={17.6} z={8.2} w={1.3} h={1.1} step={1.6} />
    <mesh position={[22.9, 17.6, 0]}><boxGeometry args={[0.05, 1.1, 14]} /><meshPhysicalMaterial color="#14202b" roughness={0.08} metalness={0.3} /></mesh>
    {/* 桅杆、雷达、卫星天线罩 */}
    <group position={[16.5, 18.8, 0]}>
      <mesh position={[0, 3.2, 0]}><cylinderGeometry args={[0.22, 0.32, 6.4, 14]} /><meshStandardMaterial color={WHITE} roughness={0.45} /></mesh>
      <mesh position={[0, 4.2, 0]}><boxGeometry args={[0.5, 0.18, 6]} /><meshStandardMaterial color={WHITE} roughness={0.45} /></mesh>
      {[-2.4, 2.4].map(z => <mesh key={z} position={[0, 4.65, z]}><sphereGeometry args={[0.4, 18, 12]} /><meshStandardMaterial color="#f7f7f4" roughness={0.4} /></mesh>)}
      <Radar at={[0, 6.4, 0]} len={3.6} />
    </group>
    {/* 烟囱 */}
    <group position={[-3.6, 10.4, 0]}>
      <mesh position={[0, 3.4, 0]} scale={[1.5, 1, 1]}><cylinderGeometry args={[1.5, 1.7, 6.8, 28]} /><meshPhysicalMaterial color={WHITE} roughness={0.42} clearcoat={0.4} /></mesh>
      <mesh position={[0, 4.6, 0]} scale={[1.5, 1, 1]}><cylinderGeometry args={[1.56, 1.58, 1.1, 28]} /><meshStandardMaterial color="#1d4f8f" roughness={0.45} /></mesh>
      <mesh position={[0, 6.95, 0]} scale={[1.5, 1, 1]}><cylinderGeometry args={[1.51, 1.51, 0.3, 28]} /><meshStandardMaterial color="#1a1a1b" roughness={0.7} /></mesh>
    </group>
    {/* 救生艇 */}
    {[7.6, -7.6].map(z => <mesh key={z} position={[4, 11.4, z]} rotation-z={Math.PI / 2} scale={[0.85, 1, 1]}><capsuleGeometry args={[1.1, 5.2, 8, 20]} /><meshPhysicalMaterial color="#f06a1d" roughness={0.38} clearcoat={0.5} /></mesh>)}
    {/* 船尾 A 形架：把浮标、仪器吊下水。aframe 0 竖着，1 向船尾外倾 */}
    <group position={[-44.5, RV.deck, 0]} rotation-z={0.15 + aframe * 0.45}>
      {[-6.2, 6.2].map(z => <mesh key={z} position={[0, 5, z]}><boxGeometry args={[0.9, 10, 0.9]} /><meshStandardMaterial color="#f0a321" roughness={0.45} /></mesh>)}
      <mesh position={[0, 10, 0]}><boxGeometry args={[1.1, 1.1, 13.4]} /><meshStandardMaterial color="#f0a321" roughness={0.45} /></mesh>
      <mesh position={[0.2, 9.2, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.35, 0.35, 1.2, 18]} /><Metal kind="steel" grain="cast" /></mesh>
    </group>
    {/* 后甲板：两台绞车、吊机、集装箱实验室 */}
    {[-3, 3].map(z => <group key={z} position={[-34, RV.deck + 1.1, z]}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.9, 0.9, 2.2, 24]} /><meshStandardMaterial color="#3a6d4b" roughness={0.5} /></mesh>
      {[-1.15, 1.15].map(dz => <mesh key={dz} position={[0, 0, dz]} rotation-x={Math.PI / 2}><cylinderGeometry args={[1.2, 1.2, 0.12, 24]} /><meshStandardMaterial color="#2c4f37" roughness={0.5} /></mesh>)}
    </group>)}
    <group position={[-22, RV.deck, -4.5]}>
      <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.8, 1, 3.2, 18]} /><meshStandardMaterial color="#f0a321" roughness={0.45} /></mesh>
      <mesh position={[3.6, 4.4, 0]} rotation-z={-1.05}><boxGeometry args={[0.55, 9.2, 0.55]} /><meshStandardMaterial color="#f0a321" roughness={0.45} /></mesh>
    </group>
    <Block p={[-14, RV.deck + 1.3, 3.6]} s={[6, 2.6, 2.44]} r={0.05} c="#3e78b3" />
    <Block p={[-14, RV.deck + 1.3, -0.2]} s={[6, 2.6, 2.44]} r={0.05} c="#e0e2de" />
  </group>
}
function Radar({ at, len }: { at: [number, number, number]; len: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 1.2 })
  return <group position={at}>
    <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.22, 0.28, 0.4, 14]} /><meshStandardMaterial color="#d9dcdc" roughness={0.5} /></mesh>
    <group ref={ref} position={[0, 0.5, 0]}><RoundedBox args={[len, 0.22, 0.28]} radius={0.08}><meshStandardMaterial color="#f2f3f1" roughness={0.45} /></RoundedBox></group>
  </group>
}

// ---------- 围网渔船：长约 40 m ----------
const PS: Hull = { L: 40, B: 9, deck: 3.2, draft: 3.4, sheer: 1.6, bowRake: 1.8, paint: { bottom: '#8a2b20', boot: '#1b1c1e', side: '#e9e6dc', top: '#2e6d9e' } }
export function FishingBoat({ hull = '#e9e6dc', net = 1 }: { hull?: string; net?: number }) {
  const h = useMemo(() => ({ ...PS, paint: { ...PS.paint, side: hull } }), [hull])
  const netGeo = useMemo(() => {
    // 船尾网台上堆着的网：一堆起伏的软堆
    const g = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(5.5, 1.3 * net, 3.4)
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (0.85 + 0.15 * Math.sin(p.getX(i) * 2.3) * Math.cos(p.getZ(i) * 3.1)))
    g.computeVertexNormals(); return g
  }, [net])
  return <group>
    <HullMesh h={h} deckColor="#8a8a80" />
    {/* 船头驾驶室：两层，前窗一排 */}
    <Block p={[8, PS.deck + 1.5, 0]} s={[8, 3, 6.6]} r={0.12} />
    <Block p={[8.6, PS.deck + 4.1, 0]} s={[5.4, 2.2, 5.8]} r={0.12} />
    <mesh position={[11.33, PS.deck + 4.3, 0]}><boxGeometry args={[0.05, 0.9, 5]} /><meshPhysicalMaterial color="#14202b" roughness={0.08} metalness={0.3} /></mesh>
    <Windows x0={5.5} x1={10.5} y={PS.deck + 4.3} z={2.9} w={0.9} h={0.8} step={1.2} />
    {/* 桅杆和吊杆、动力滑车 */}
    <mesh position={[4.5, PS.deck + 6, 0]}><cylinderGeometry args={[0.18, 0.24, 12, 12]} /><meshStandardMaterial color="#d8d6cc" roughness={0.5} /></mesh>
    <mesh position={[0, PS.deck + 6.6, 0]} rotation-z={-1.1}><cylinderGeometry args={[0.13, 0.16, 11, 10]} /><meshStandardMaterial color="#d8d6cc" roughness={0.5} /></mesh>
    <mesh position={[-4.6, PS.deck + 8.6, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.7, 0.18, 10, 22]} /><meshStandardMaterial color="#e2a23b" roughness={0.5} /></mesh>
    <mesh position={[4.5, PS.deck + 11.4, 0]}><boxGeometry args={[0.3, 0.12, 3]} /><meshStandardMaterial color="#d8d6cc" /></mesh>
    {/* 船尾网台上的渔网、浮子 */}
    <mesh geometry={netGeo} position={[-12.5, PS.deck, 0]}><meshStandardMaterial color="#2f4a3c" roughness={0.95} /></mesh>
    <mesh position={[-12.5, PS.deck + 1.2 * net, 0]} scale={[5.4, 0.25, 3.3]}><sphereGeometry args={[1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3]} /><meshStandardMaterial color="#e8b23a" roughness={0.7} /></mesh>
    {/* 斜挂在船尾的小艇 */}
    <mesh position={[-19.5, PS.deck + 0.8, 0]} rotation-z={0.5}><boxGeometry args={[3, 2.2, 3.2]} /><meshStandardMaterial color="#d9a52d" roughness={0.6} /></mesh>
  </group>
}

// ---------- 表层漂流浮标：浮体直径约 0.4 m ----------
export function Buoy() {
  const body = useMemo(() => lathe([[0, -0.2], [0.14, -0.18], [0.2, -0.08], [0.21, 0.02], [0.19, 0.1], [0.12, 0.17], [0, 0.19]], { segs: 32 }), [])
  return <group>
    <mesh geometry={body}><meshPhysicalMaterial color="#f2a516" roughness={0.35} clearcoat={0.6} /></mesh>
    <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.214, 0.214, 0.04, 32]} /><meshStandardMaterial color="#f4f4ef" roughness={0.5} /></mesh>
    <mesh position={[0, 0.19, 0]}><cylinderGeometry args={[0.1, 0.1, 0.015, 24]} /><meshPhysicalMaterial color="#1b2a4a" roughness={0.15} metalness={0.4} /></mesh>
    <mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.008, 0.012, 0.3, 8]} /><meshStandardMaterial color="#222" /></mesh>
    {/* 水下的系绳和水帆（让浮标跟着表层海水走，不被风吹跑） */}
    <mesh position={[0, -0.6, 0]}><cylinderGeometry args={[0.006, 0.006, 0.8, 6]} /><meshStandardMaterial color="#ddd" /></mesh>
    <mesh position={[0, -1.4, 0]}><cylinderGeometry args={[0.16, 0.16, 0.8, 16, 1, true]} /><meshStandardMaterial color="#f2f2ee" roughness={0.8} side={THREE.DoubleSide} transparent opacity={0.85} /></mesh>
  </group>
}

/** 船后面拖着的白色尾迹 */
export function Wake({ len = 60, w = 14, on = 1, x0 = -40 }: { len?: number; w?: number; on?: number; x0?: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d')!
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr; g.beginPath(); g.moveTo(28, 0); g.lineTo(36, 0); g.lineTo(64, 256); g.lineTo(0, 256); g.closePath(); g.fill()
    const t = new THREE.CanvasTexture(c); return t
  }, [])
  return <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2} position={[-len / 2 + x0, 0.05, 0]}><planeGeometry args={[w, len]} /><meshBasicMaterial map={tex} transparent opacity={0.55 * on} depthWrite={false} /></mesh>
}
