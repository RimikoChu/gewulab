// 远洋科考船的外观：船体（按站位放样出来的曲面）、甲板、上层建筑、驾驶台、桅杆和雷达、烟囱、尾部 A 形架、吊机、救生艇、栏杆。
// 船长约 96 m、宽 17 m，船头朝 +x。水线在 y = 0。船里面的地球仪大厅、驾驶台在 hall.tsx、bridge.tsx。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal } from '@/lab-kit'

export const SHIP = { L: 96, B: 17, deck: 6 }
/** 船里面几处房间的范围 */
export const HALL = { x0: 0.4, x1: 23.4, z: 6.6, y0: 6, y1: 10.2 }
export const BRIDGE = { x0: 11.6, x1: 25.2, z: 8.2, y0: 16, y1: 19 }

// ---------- 船体 ----------
/** 船体的外形：每个站位的半宽、龙骨高度、甲板高度。u 从船尾 0 到船头 1 */
function station(u: number) {
  const bow = Math.max(0, (u - 0.7) / 0.3), stern = Math.max(0, (0.08 - u) / 0.08)
  const top = SHIP.deck + 2.6 * bow ** 2                         // 甲板向船头翘起（舷弧）
  const keel = -5 + 3.6 * bow ** 3 + 4.2 * stern ** 1.6          // 船头底部收上来，船尾底部翘起到方尾
  const wDeck = (SHIP.B / 2) * (1 - bow ** 2.1) * (1 - 0.1 * stern)   // 甲板边的半宽
  const wLow = (SHIP.B / 2) * (1 - bow ** 0.85) * (1 - 0.35 * stern)   // 船底附近的半宽：船头比甲板收得更快（外飘）
  const rake = 3.2 * bow                                          // 船头柱往下往后斜
  return { top, keel, wDeck, wLow, rake }
}
/** 一个截面上的点：v 从龙骨 0 绕到甲板边 1 */
function section(u: number, v: number) {
  const s = station(u), H = s.top - s.keel
  // 前 30%：船底到舭部；后 70%：舷侧
  let z: number, y: number
  if (v < 0.3) { const a = (v / 0.3) * Math.PI / 2, r = Math.min(2.2, s.wLow * 0.6); z = (s.wLow - r) * (v / 0.3) + r * Math.sin(a) * (v / 0.3) ** 0.2; y = s.keel + r * (1 - Math.cos(a)) * 0.9 }
  else { const k = (v - 0.3) / 0.7, w0 = s.wLow, w1 = s.wDeck; z = w0 + (w1 - w0) * k ** 1.6; y = s.keel + Math.min(2.2, s.wLow * 0.6) * 0.9 + (H - Math.min(2.2, s.wLow * 0.6) * 0.9) * k }
  const x = -SHIP.L / 2 + SHIP.L * u - s.rake * (1 - (y - s.keel) / H)
  return [x, y, z] as const
}
function hullGeometry() {
  const NU = 90, NV = 26, pos: number[] = [], col: number[] = [], idx: number[] = []
  const c = new THREE.Color()
  const paint = (y: number) => y < -0.1 ? c.set('#7a2a22') : y < 0.45 ? c.set('#17191c') : y > SHIP.deck - 0.9 ? c.set('#eef0ee') : c.set('#1d3c63')
  for (const side of [1, -1]) {
    const base = pos.length / 3
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
      const [x, y, z] = section(i / NU, j / NV); pos.push(x, y, z * side); paint(y); col.push(c.r, c.g, c.b)
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a = base + i * (NV + 1) + j, b = a + NV + 1
      if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
/** 方尾：船尾那块平板 */
function transomGeometry() {
  const pts: THREE.Vector2[] = []
  for (let j = 0; j <= 26; j++) { const [, y, z] = section(0, j / 26); pts.push(new THREE.Vector2(z, y)) }
  for (let j = 26; j >= 0; j--) { const [, y, z] = section(0, j / 26); pts.push(new THREE.Vector2(-z, y)) }
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts)); g.rotateY(-Math.PI / 2); g.translate(-SHIP.L / 2, 0, 0)
  return g
}
/** 甲板：每个站位左右两舷之间铺一条 */
function deckGeometry() {
  const NU = 90, pos: number[] = [], idx: number[] = []
  for (let i = 0; i <= NU; i++) { const [x, y, z] = section(i / NU, 1); pos.push(x, y - 0.02, z, x, y - 0.02, -z) }
  for (let i = 0; i < NU; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
/** 甲板边的栏杆：立柱一根根排开，上面两道扶手 */
function railGeometry(from: number, to: number) {
  const parts: THREE.BufferGeometry[] = []
  for (const side of [1, -1]) {
    const pts: THREE.Vector3[] = []
    for (let u = from; u <= to + 1e-6; u += 0.01) { const [x, y, z] = section(u, 1); pts.push(new THREE.Vector3(x, y, (z - 0.08) * side)) }
    for (const h of [0.55, 1.05]) parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => p.clone().setY(p.y + h))), 200, 0.03, 6))
    for (let k = 0; k < pts.length; k += 2) { const s = new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6); s.translate(pts[k].x, pts[k].y + 0.525, pts[k].z); parts.push(s) }
  }
  return mergeGeometries(parts.map(p => p.toNonIndexed()))
}

// ---------- 上层建筑 ----------
/** 舷窗或方窗：深色玻璃加一圈白框 */
function windowsGeometry(rows: { x0: number; x1: number; y: number; z: number; w: number; h: number; step: number; round?: boolean }[]) {
  const glass: THREE.BufferGeometry[] = [], frame: THREE.BufferGeometry[] = []
  for (const r of rows) for (let x = r.x0; x <= r.x1 + 1e-6; x += r.step) for (const s of [1, -1]) {
    const gg = r.round ? new THREE.CircleGeometry(r.w / 2, 24) : new THREE.PlaneGeometry(r.w, r.h)
    if (s < 0) gg.rotateY(Math.PI)
    gg.translate(x, r.y, s * (r.z + 0.02)); glass.push(gg)
    const f = r.round ? new THREE.TorusGeometry(r.w / 2 + 0.03, 0.04, 6, 24) : new THREE.BoxGeometry(r.w + 0.14, r.h + 0.14, 0.03)
    f.translate(x, r.y, s * (r.z + 0.005)); frame.push(f)
  }
  return { glass: mergeGeometries(glass.map(g => g.toNonIndexed())), frame: mergeGeometries(frame.map(g => g.toNonIndexed())) }
}

const WHITE = '#e9ebe8', TRIM = '#c7ccd0'
function Block({ p, s, r = 0.18, c = WHITE }: { p: [number, number, number]; s: [number, number, number]; r?: number; c?: string }) {
  return <RoundedBox args={s} radius={r} smoothness={3} position={p} castShadow receiveShadow><meshPhysicalMaterial color={c} roughness={0.42} clearcoat={0.4} clearcoatRoughness={0.3} /></RoundedBox>
}

/** 雷达天线：一根横着慢慢转的长条 */
function Radar({ at, len, speed }: { at: [number, number, number]; len: number; speed: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * speed })
  return <group position={at}>
    <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.22, 0.28, 0.4, 16]} /><meshStandardMaterial color="#d9dcdc" roughness={0.5} /></mesh>
    <group ref={ref} position={[0, 0.5, 0]}><RoundedBox args={[len, 0.22, 0.28]} radius={0.08} castShadow><meshStandardMaterial color="#f2f3f1" roughness={0.45} /></RoundedBox></group>
  </group>
}

/** 救生艇：橙色全封闭艇，挂在吊艇架上 */
function Lifeboat({ x, z }: { x: number; z: number }) {
  const geo = useMemo(() => { const g = new THREE.CapsuleGeometry(1.1, 5.2, 8, 24); g.rotateZ(Math.PI / 2); g.scale(1, 0.85, 1); return g }, [])
  const s = Math.sign(z)
  return <group position={[x, 11.6, z]}>
    <mesh geometry={geo} castShadow><meshPhysicalMaterial color="#f06a1d" roughness={0.38} clearcoat={0.5} /></mesh>
    <mesh position={[0, -0.55, 0]}><boxGeometry args={[6.6, 0.5, 2.0]} /><meshStandardMaterial color="#f4f2ec" roughness={0.6} /></mesh>
    {[-2.4, 2.4].map(dx => <group key={dx} position={[dx, 0, -s * 0.2]}>
      <mesh position={[0, 1.4, -s * 0.3]} rotation-x={s * 0.35}><boxGeometry args={[0.24, 2.4, 0.24]} /><meshStandardMaterial color="#d7dad8" roughness={0.5} metalness={0.3} /></mesh>
    </group>)}
  </group>
}

export function Ship() {
  const geo = useMemo(() => {
    const hull = hullGeometry(), transom = transomGeometry(), deck = deckGeometry(), rail = railGeometry(0.02, 0.985)
    // 上层建筑的窗：主甲板一层是地球仪大厅的舷窗，上面两层是方窗
    const win = windowsGeometry([
      { x0: 2.5, x1: 21.5, y: 8.4, z: 7, w: 0.75, h: 0.75, step: 2.4, round: true },
      { x0: 3.8, x1: 22.6, y: 11.9, z: 6.6, w: 1.1, h: 0.85, step: 1.9 },
      { x0: 7.6, x1: 22.6, y: 14.7, z: 6.2, w: 1.1, h: 0.85, step: 1.9 },
    ])
    return { hull, transom, deck, rail, win }
  }, [])
  const deckTex = useMemo(() => {
    // 甲板防滑漆：灰绿底加细碎的颗粒
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d')!
    g.fillStyle = '#6f7d6c'; g.fillRect(0, 0, N, N)
    let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 4000; i++) { g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'; g.fillRect(r() * N, r() * N, 1.5, 1.5) }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 8); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group>
      <mesh geometry={geo.hull} castShadow receiveShadow><meshPhysicalMaterial vertexColors roughness={0.38} clearcoat={0.45} clearcoatRoughness={0.3} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.transom} castShadow><meshStandardMaterial color="#1d3c63" roughness={0.45} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.deck} receiveShadow><meshStandardMaterial map={deckTex} roughness={0.85} /></mesh>
      <mesh geometry={geo.rail} castShadow><meshStandardMaterial color="#e8eae6" roughness={0.45} metalness={0.2} /></mesh>

      {/* 上层建筑：主甲板一层（里面是地球仪大厅），往上两层，再上面是驾驶台 */}
      <Block p={[11.9, 8.2, 0]} s={[23.4, 4.4, 14]} />
      <Block p={[13.4, 11.8, 0]} s={[21.2, 2.8, 13.2]} />
      <Block p={[15.4, 14.6, 0]} s={[17.6, 2.8, 12.4]} />
      {/* 每层之间一道外伸的甲板沿 */}
      {[[11.9, 10.45, 23.9, 14.6], [13.4, 13.25, 21.7, 13.8], [15.4, 16.05, 18.1, 17.4]].map(([x, y, l, w], i) => <mesh key={i} position={[x, y, 0]} castShadow receiveShadow><boxGeometry args={[l, 0.16, w]} /><meshStandardMaterial color={TRIM} roughness={0.5} /></mesh>)}
      {/* 驾驶台：两翼伸出到船宽，前窗一排斜着向外 */}
      <Bridgehouse />
      <mesh geometry={geo.win.glass}><meshPhysicalMaterial color="#13202b" roughness={0.08} metalness={0.2} envMapIntensity={1.4} /></mesh>
      <mesh geometry={geo.win.frame}><meshStandardMaterial color="#f4f5f2" roughness={0.5} /></mesh>

      {/* 桅杆：驾驶台顶上，挂雷达、卫星天线 */}
      <group position={[16.5, 19, 0]}>
        <mesh position={[0, 3.2, 0]} castShadow><cylinderGeometry args={[0.22, 0.32, 6.4, 16]} /><meshStandardMaterial color="#eef0ee" roughness={0.45} /></mesh>
        <mesh position={[0, 4.2, 0]} castShadow><boxGeometry args={[0.5, 0.18, 6]} /><meshStandardMaterial color="#eef0ee" roughness={0.45} /></mesh>
        {[-2.4, 2.4].map(z => <mesh key={z} position={[0, 4.6, z]}><sphereGeometry args={[0.32, 20, 14]} /><meshStandardMaterial color="#f7f7f4" roughness={0.4} /></mesh>)}
        <Radar at={[0, 6.4, 0]} len={3.6} speed={1.2} />
        <Radar at={[-3.2, 0.2, 0]} len={2.6} speed={-1.6} />
        <mesh position={[0, 7.6, 0]}><cylinderGeometry args={[0.03, 0.03, 1.6, 8]} /><meshStandardMaterial color="#dddddd" /></mesh>
      </group>
      {/* 烟囱：椭圆截面，顶上一圈黑色，侧面一道蓝色涂装 */}
      <group position={[-3.6, 10.4, 0]}>
        <mesh position={[0, 3.4, 0]} scale={[1.5, 1, 1]} castShadow><cylinderGeometry args={[1.5, 1.7, 6.8, 32]} /><meshPhysicalMaterial color={WHITE} roughness={0.42} clearcoat={0.4} /></mesh>
        <mesh position={[0, 4.6, 0]} scale={[1.5, 1, 1]}><cylinderGeometry args={[1.56, 1.58, 1.1, 32]} /><meshStandardMaterial color="#1d4f8f" roughness={0.45} /></mesh>
        <mesh position={[0, 6.95, 0]} scale={[1.5, 1, 1]}><cylinderGeometry args={[1.51, 1.51, 0.3, 32]} /><meshStandardMaterial color="#1a1a1b" roughness={0.7} /></mesh>
        {[-0.5, 0.6].map(x => <mesh key={x} position={[x, 7.4, 0]}><cylinderGeometry args={[0.32, 0.32, 0.9, 16]} /><meshStandardMaterial color="#2a2b2c" roughness={0.6} metalness={0.4} /></mesh>)}
      </group>
      {/* 救生艇 */}
      <Lifeboat x={4} z={7.6} /><Lifeboat x={4} z={-7.6} />
      {/* 船尾的 A 形架：放调查设备下水用，漆成橙黄色 */}
      <group position={[-45.5, SHIP.deck, 0]} rotation-z={0.22}>
        {[-6.2, 6.2].map(z => <mesh key={z} position={[0, 5, z]} castShadow><boxGeometry args={[0.9, 10, 0.9]} /><meshStandardMaterial color="#f0a321" roughness={0.45} /></mesh>)}
        <mesh position={[0, 10, 0]} castShadow><boxGeometry args={[1.1, 1.1, 13.4]} /><meshStandardMaterial color="#f0a321" roughness={0.45} /></mesh>
        <mesh position={[0.2, 9.2, 0]}><cylinderGeometry args={[0.35, 0.35, 1.2, 20]} /><Metal kind="steel" grain="cast" /></mesh>
      </group>
      {/* 后甲板：绞车、吊机、集装箱实验室 */}
      <group position={[-34, SHIP.deck, 0]}>
        {[-3, 3].map(z => <group key={z} position={[0, 1.1, z]}>
          <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.9, 0.9, 2.2, 28]} /><meshStandardMaterial color="#3a6d4b" roughness={0.5} /></mesh>
          {[-1.15, 1.15].map(dz => <mesh key={dz} position={[0, 0, dz]} rotation-x={Math.PI / 2}><cylinderGeometry args={[1.2, 1.2, 0.12, 28]} /><meshStandardMaterial color="#2c4f37" roughness={0.5} /></mesh>)}
        </group>)}
      </group>
      <group position={[-22, SHIP.deck, -4.5]}>
        <mesh position={[0, 1.6, 0]} castShadow><cylinderGeometry args={[0.8, 1, 3.2, 20]} /><meshStandardMaterial color="#f0a321" roughness={0.45} /></mesh>
        <mesh position={[3.6, 4.4, 0]} rotation-z={-1.05} castShadow><boxGeometry args={[0.55, 9.2, 0.55]} /><meshStandardMaterial color="#f0a321" roughness={0.45} /></mesh>
      </group>
      <Block p={[-14, SHIP.deck + 1.3, 3.6]} s={[6, 2.6, 2.44]} r={0.05} c="#3e78b3" />
      <Block p={[-14, SHIP.deck + 1.3, -0.2]} s={[6, 2.6, 2.44]} r={0.05} c="#e0e2de" />
      {/* 前甲板：锚机、系缆桩 */}
      <group position={[38, SHIP.deck + 1.7, 0]}>
        {[-2.2, 2.2].map(z => <group key={z} position={[0, 0.6, z]}>
          <mesh rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.55, 0.55, 1.1, 24]} /><meshStandardMaterial color="#2f3a33" roughness={0.55} metalness={0.3} /></mesh>
          <mesh position={[0, -0.4, 0]}><boxGeometry args={[1.6, 0.4, 1.4]} /><meshStandardMaterial color="#3c4a40" roughness={0.6} /></mesh>
        </group>)}
        {[-5, 5].map(z => <group key={z} position={[-5, 0, z * 0.9]}>{[-0.4, 0.4].map(dx => <mesh key={dx} position={[dx, 0.35, 0]} castShadow><cylinderGeometry args={[0.2, 0.22, 0.7, 16]} /><meshStandardMaterial color="#26292b" roughness={0.6} metalness={0.4} /></mesh>)}</group>)}
      </group>
    </group>
  )
}

/** 驾驶台的外壳：两翼、斜着的前窗、顶上的罗经甲板和栏杆 */
function Bridgehouse() {
  const front = useMemo(() => {
    // 前窗一整排：玻璃向外斜 12°
    const g: THREE.BufferGeometry[] = [], f: THREE.BufferGeometry[] = []
    for (let z = -7.2; z <= 7.21; z += 1.6) {
      const p = new THREE.PlaneGeometry(1.42, 1.5); p.rotateY(Math.PI / 2); p.rotateZ(-0.21); p.translate(BRIDGE.x1 + 0.12, 17.85, z); g.push(p)
      const m = new THREE.BoxGeometry(0.12, 1.6, 0.12); m.rotateZ(-0.21); m.translate(BRIDGE.x1 + 0.1, 17.85, z + 0.8); f.push(m)
    }
    for (const s of [1, -1]) for (let x = 13; x <= 23.5; x += 1.6) { const p = new THREE.PlaneGeometry(1.3, 1.2); if (s < 0) p.rotateY(Math.PI); p.translate(x, 17.9, s * (BRIDGE.z + 0.31)); g.push(p) }
    return { glass: mergeGeometries(g.map(x => x.toNonIndexed())), mull: mergeGeometries(f.map(x => x.toNonIndexed())) }
  }, [])
  return <group>
    {/* 驾驶台下半截：前、后、两侧四道矮墙（里面是空的，人站在里面） */}
    <mesh position={[(BRIDGE.x0 + BRIDGE.x1) / 2, 16.05, 0]} receiveShadow><boxGeometry args={[BRIDGE.x1 - BRIDGE.x0 + 0.4, 0.1, BRIDGE.z * 2 + 0.6]} /><meshStandardMaterial color={TRIM} roughness={0.6} /></mesh>
    {[1, -1].map(s => <Block key={s} p={[(BRIDGE.x0 + BRIDGE.x1) / 2, 16.55, s * (BRIDGE.z + 0.18)]} s={[BRIDGE.x1 - BRIDGE.x0 + 0.4, 1.1, 0.26]} r={0.06} />)}
    <Block p={[(BRIDGE.x0 + BRIDGE.x1) / 2, 18.75, 0]} s={[BRIDGE.x1 - BRIDGE.x0 + 0.4, 0.5, BRIDGE.z * 2 + 0.6]} r={0.1} />
    {/* 前窗下面那一段斜墙 */}
    <mesh position={[BRIDGE.x1 + 0.05, 16.55, 0]}><boxGeometry args={[0.3, 1.1, BRIDGE.z * 2 + 0.6]} /><meshStandardMaterial color={WHITE} roughness={0.45} /></mesh>
    {/* 后墙和两侧窗间墙 */}
    <mesh position={[BRIDGE.x0 - 0.1, 17.7, 0]} castShadow><boxGeometry args={[0.3, 2.4, BRIDGE.z * 2 + 0.6]} /><meshStandardMaterial color={WHITE} roughness={0.45} /></mesh>
    <mesh geometry={front.glass}><meshPhysicalMaterial color="#1a2c38" roughness={0.04} metalness={0.1} transparent opacity={0.42} envMapIntensity={1.6} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={front.mull} castShadow><meshStandardMaterial color="#f1f2ef" roughness={0.5} /></mesh>
    {/* 顶上的遮阳檐 */}
    <mesh position={[BRIDGE.x1 + 0.6, 19.0, 0]} castShadow><boxGeometry args={[1.4, 0.14, BRIDGE.z * 2 + 0.6]} /><meshStandardMaterial color={WHITE} roughness={0.45} /></mesh>
    {/* 罗经甲板四周的栏杆 */}
    {[[BRIDGE.x0 + 0.2, BRIDGE.x1 - 0.2]].map(([a, b]) => [BRIDGE.z, -BRIDGE.z].map(z => <group key={z}>
      {[0.55, 1.05].map(h => <mesh key={h} position={[(a + b) / 2, 19 + h, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, b - a, 8]} /><meshStandardMaterial color="#e8eae6" roughness={0.45} /></mesh>)}
      {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[a + (b - a) * i / 9, 19.52, z]}><cylinderGeometry args={[0.025, 0.025, 1.05, 6]} /><meshStandardMaterial color="#e8eae6" /></mesh>)}
    </group>))}
    {[BRIDGE.x1 - 0.2].map(x => <group key={x}>{[0.55, 1.05].map(h => <mesh key={h} position={[x, 19 + h, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, BRIDGE.z * 2, 8]} /><meshStandardMaterial color="#e8eae6" /></mesh>)}</group>)}
  </group>
}

/** 远处驶来的远洋货轮：一样的放样方法，船更长，上层建筑在船尾，甲板上堆着集装箱，桅杆最高 40 m */
export function Freighter() {
  const geo = useMemo(() => { const g = hullGeometry(); g.scale(1.6, 1.2, 1.5); return { hull: g, transom: (() => { const t = transomGeometry(); t.scale(1.6, 1.2, 1.5); return t })() } }, [])
  const boxes = useMemo(() => {
    const P: THREE.BufferGeometry[] = [], C: number[] = [], cols = ['#b23a2e', '#2f6a9c', '#e0a43a', '#3f7d4f', '#d8d8d2', '#6b4a8a']
    let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let bay = 0; bay < 11; bay++) for (let row = -4; row <= 4; row++) {
      const h = 2 + Math.floor(r() * 3)
      for (let t = 0; t < h; t++) { const b = new THREE.BoxGeometry(5.8, 2.5, 2.4); b.translate(-20 + bay * 6.2, 7.2 + 1.3 + t * 2.55, row * 2.5); P.push(b.toNonIndexed()); const c = new THREE.Color(cols[Math.floor(r() * cols.length)]); for (let k = 0; k < 36; k++) C.push(c.r, c.g, c.b) }
    }
    const g = mergeGeometries(P); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); return g
  }, [])
  return <group>
    <mesh geometry={geo.hull} castShadow><meshStandardMaterial vertexColors roughness={0.5} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={geo.transom}><meshStandardMaterial color="#1d3c63" roughness={0.5} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={boxes} castShadow><meshStandardMaterial vertexColors roughness={0.7} /></mesh>
    {/* 船尾的生活楼 */}
    <RoundedBox args={[10, 14, 18]} radius={0.3} position={[-58, 14.2, 0]} castShadow><meshStandardMaterial color="#eceae4" roughness={0.5} /></RoundedBox>
    <RoundedBox args={[11, 3, 24]} radius={0.2} position={[-57.5, 22.6, 0]} castShadow><meshStandardMaterial color="#eceae4" roughness={0.5} /></RoundedBox>
    <mesh position={[-52.4, 22.6, 0]}><boxGeometry args={[0.1, 1.2, 22]} /><meshStandardMaterial color="#1a2630" roughness={0.1} /></mesh>
    {/* 雷达桅：立在生活楼顶上的一座塔，最高处离水面 40 m */}
    <mesh position={[-57, 30.1, 0]} castShadow><boxGeometry args={[2.2, 12, 2.2]} /><meshStandardMaterial color="#f0f0ec" roughness={0.5} /></mesh>
    <mesh position={[-57, 33.5, 0]} castShadow><boxGeometry args={[2.6, 0.5, 9]} /><meshStandardMaterial color="#f0f0ec" roughness={0.5} /></mesh>
    <mesh position={[-57, 36.3, 0]} castShadow><boxGeometry args={[1.2, 0.5, 6.5]} /><meshStandardMaterial color="#f7f7f2" roughness={0.45} /></mesh>
    <mesh position={[-57, 38, 0]}><cylinderGeometry args={[0.6, 0.8, 3.2, 12]} /><meshStandardMaterial color="#f0f0ec" roughness={0.5} /></mesh>
    <mesh position={[-57, 39.7, 0]}><sphereGeometry args={[0.6, 14, 10]} /><meshStandardMaterial color="#d6332b" roughness={0.5} /></mesh>
    <mesh position={[-63, 26, 0]} castShadow><cylinderGeometry args={[1.6, 1.8, 7, 20]} /><meshStandardMaterial color="#b23a2e" roughness={0.5} /></mesh>
    {/* 船头的前桅 */}
    <mesh position={[60, 18, 0]} castShadow><cylinderGeometry args={[0.25, 0.35, 12, 10]} /><meshStandardMaterial color="#f0f0ec" roughness={0.5} /></mesh>
  </group>
}
