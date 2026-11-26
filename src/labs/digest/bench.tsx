// 展厅左边的生物实验台：左半边是第 1 课的三个鉴定实验（馒头和碘液、花生和白纸、纱布包的面团和一烧杯清水），
// 右半边是第 3 课“馒头在口腔中的变化”（试管架、三支试管、一大烧杯水浴、温度计、碘液滴瓶）。
// 坐标是世界的，1 个单位 = 10 cm。器材按实物尺寸做：试管 Φ16 mm × 100 mm，1000 mL 大烧杯，250 mL 小烧杯。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { GLASS } from './props'
import { fbm, noise, type V3 } from './sdf'
import { ease } from './parts'
import type { Blue, Temp, TubeNo } from './physics'

export const BENCH = { at: [-22, 0, 2.2] as V3, top: 9.0, w: 7.4, d: 2.8 }
export const L1_AT: V3 = [-24.0, BENCH.top, 2.45]
export const L3_AT: V3 = [-20.0, BENCH.top, 2.4]

// ---------- 实验台 ----------
/** 黑色环氧树脂台面、浅灰的柜子和抽屉、不锈钢拉手，后面一层试剂架 */
function Table() {
  const { at, top, w, d } = BENCH
  return <group position={at}>
    <RoundedBox args={[w, 0.24, d]} radius={0.05} smoothness={3} position={[0, top - 0.12, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#1c1f22" roughness={0.38} clearcoat={0.5} clearcoatRoughness={0.35} /></RoundedBox>
    <RoundedBox args={[w - 0.3, top - 0.6, d - 0.4]} radius={0.04} smoothness={2} position={[0, (top - 0.6) / 2 + 0.36, -0.05]} castShadow receiveShadow><meshStandardMaterial color="#c9ccc9" roughness={0.6} /></RoundedBox>
    {/* 踢脚 */}
    <mesh position={[0, 0.18, -0.1]}><boxGeometry args={[w - 0.5, 0.36, d - 0.7]} /><meshStandardMaterial color="#2a2d30" roughness={0.7} /></mesh>
    {/* 抽屉和柜门的缝、拉手 */}
    {[-2.75, -0.92, 0.92, 2.75].map(x => <group key={x} position={[x, 0, d / 2 - 0.25 + 0.005]}>
      <mesh position={[0, top - 0.95, 0]}><boxGeometry args={[1.76, 0.5, 0.012]} /><meshStandardMaterial color="#d6d8d5" roughness={0.55} /></mesh>
      <mesh position={[0, top - 2.3 - 2.0, 0]}><boxGeometry args={[1.76, 4.6, 0.012]} /><meshStandardMaterial color="#d3d5d2" roughness={0.58} /></mesh>
      <mesh position={[0, top - 0.95, 0.04]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.022, 0.022, 0.7, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
      <mesh position={[0.62, top - 2.0, 0.04]}><cylinderGeometry args={[0.022, 0.022, 0.8, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
      {[-0.32, 0.32].map(dx => <mesh key={dx} position={[dx, top - 0.95, 0.02]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.018, 0.018, 0.04, 10]} /><Metal kind="stainless" /></mesh>)}
    </group>)}
    {/* 后面的试剂架：两根立柱，一块玻璃隔板 */}
    {[-w / 2 + 0.08, w / 2 - 0.08].map(x => <mesh key={x} position={[x, top + 1.0, -d / 2 + 0.25]} castShadow><boxGeometry args={[0.08, 2.0, 0.08]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    <mesh position={[0, top + 1.25, -d / 2 + 0.32]}><boxGeometry args={[w - 0.6, 0.04, 0.5]} /><meshPhysicalMaterial {...GLASS} opacity={0.2} /></mesh>
    <mesh position={[0, top + 2.0, -d / 2 + 0.25]}><boxGeometry args={[w - 0.6, 0.06, 0.1]} /><Metal kind="aluminum" grain="brushed" /></mesh>
  </group>
}

// ---------- 通用器材 ----------
const TT = { r: 0.08, h: 1.0 }
let TUBE_G: THREE.BufferGeometry | null = null
/** 试管：圆底、有壁厚、管口外翻一圈 */
const tubeGeo = () => (TUBE_G ??= shell([[0, 0], [TT.r * 0.6, 0.006], [TT.r * 0.93, 0.035], [TT.r, 0.085], [TT.r, TT.h - 0.012], [TT.r + 0.01, TT.h]], 0.007, { segs: 40 }))
/** 烧杯：平底、杯口外翻带一个倒水嘴（嘴用一点外凸近似） */
function beakerGeo(r: number, h: number) {
  return shell([[0, 0], [r - 0.03, 0], [r, 0.03], [r, h - 0.02], [r + 0.025, h]], 0.012, { segs: 64 })
}
/** 烧杯上的刻度：几道白色细线和数字旁的短线 */
function Graduations({ r, h, n, y0 }: { r: number; h: number; n: number; y0: number }) {
  return <group>
    {Array.from({ length: n }, (_, i) => { const y = y0 + (h * (i + 1)) / (n + 1); return <mesh key={i} position={[0, y, 0]} rotation-y={0.5}><cylinderGeometry args={[r + 0.002, r + 0.002, 0.008, 24, 1, true, -0.25, i % 2 ? 0.22 : 0.4]} /><meshBasicMaterial color="#f4f4f2" side={THREE.DoubleSide} transparent opacity={0.85} /></mesh> })}
  </group>
}
/** 液体：一段圆柱，顶上一圈弯月面（中间低、贴壁处翘起） */
function Liquid({ r, h, color, opacity = 0.75, rough = 0.08, env = 0.6 }: { r: number; h: number; color: THREE.ColorRepresentation; opacity?: number; rough?: number; env?: number }) {
  const men = useMemo(() => lathe([[0, 0], [r * 0.85, 0.002], [r * 0.97, 0.012], [r, 0.03]], { segs: 40 }), [r])
  return <group>
    <mesh position={[0, h / 2, 0]} renderOrder={2}><cylinderGeometry args={[r, r, h, 40]} /><meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={rough} depthWrite={false} envMapIntensity={env} /></mesh>
    <mesh position={[0, h - 0.002, 0]} geometry={men} renderOrder={3}><meshPhysicalMaterial color={color} transparent opacity={Math.min(1, opacity + 0.1)} roughness={0.02} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group>
}
/** 滴瓶：棕色玻璃瓶，里面是碘液；滴管插在瓶口，橡胶头。drawn：滴管拿出来的位置（相对瓶子），null 就插在瓶里 */
function DropBottle({ at, dropper, drip, fall = 0.6 }: { at: V3; dropper: THREE.Vector3 | null; drip: number; fall?: number }) {
  const g = useMemo(() => ({
    bottle: shell([[0, 0], [0.19, 0], [0.21, 0.03], [0.21, 0.4], [0.17, 0.5], [0.075, 0.56], [0.075, 0.64]], 0.01, { segs: 40 }),
    pipe: lathe([[0, 0], [0.012, 0.004], [0.018, 0.05], [0.022, 0.5], [0.022, 0.62], [0, 0.62]], { segs: 20 }),
    bulb: lathe([[0, 0], [0.045, 0], [0.05, 0.04], [0.058, 0.13], [0.04, 0.2], [0, 0.215]], { segs: 24 }),
    collar: disc(0.085, 0.04, { hole: 0.02, segs: 32 }),
  }), [])
  const dropRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const m = dropRef.current; if (!m) return
    const t = (clock.elapsedTime * 1.6) % 1
    m.visible = !!dropper && drip > 0 && drip < 1
    m.position.set(0, -0.53 - t * t * fall, 0); m.scale.setScalar(0.022 * (t < 0.1 ? t * 10 : 1))
  })
  const hold = dropper ?? new THREE.Vector3(at[0], at[1] + 0.56, at[2])
  return <group>
    <group position={at}>
      <mesh geometry={g.bottle} renderOrder={3} castShadow><meshPhysicalMaterial color="#5a2a0c" transparent opacity={0.78} roughness={0.08} clearcoat={1} envMapIntensity={1.4} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <group position={[0, 0.02, 0]}><Liquid r={0.195} h={0.3} color="#2a0f05" opacity={0.9} /></group>
    </group>
    <group position={hold}>
      <mesh geometry={g.pipe} position={[0, -0.5, 0]} renderOrder={4}><meshPhysicalMaterial {...GLASS} opacity={0.22} /></mesh>
      <mesh position={[0, -0.46, 0]}><cylinderGeometry args={[0.012, 0.009, 0.1, 12]} /><meshStandardMaterial color="#6a2a0a" transparent opacity={0.85} /></mesh>
      <mesh geometry={g.collar} position={[0, 0.06, 0]}><meshStandardMaterial color="#1a1a1a" roughness={0.6} /></mesh>
      <mesh geometry={g.bulb} position={[0, 0.1, 0]} castShadow><meshPhysicalMaterial color="#2b2b2b" roughness={0.55} clearcoat={0.3} /></mesh>
      <mesh ref={dropRef} position={[0, -0.52, 0]} visible={false} scale={0.02}><sphereGeometry args={[1, 12, 10]} /><meshPhysicalMaterial color="#5c2408" roughness={0.05} clearcoat={1} /></mesh>
    </group>
  </group>
}
/** 不锈钢试管架：两层带孔的板、四根立柱 */
function Rack({ n = 5 }: { n?: number }) {
  const plate = useMemo(() => {
    const W = n * 0.1 + 0.05, s = new THREE.Shape(); s.moveTo(-W, -0.13); s.lineTo(W, -0.13); s.lineTo(W, 0.13); s.lineTo(-W, 0.13); s.lineTo(-W, -0.13)
    for (let i = 0; i < n; i++) { const h = new THREE.Path(); h.absarc(-W + 0.15 + i * 0.2, 0, 0.092, 0, Math.PI * 2, true); s.holes.push(h) }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 24 }); g.rotateX(-Math.PI / 2); return g
  }, [n])
  const W = n * 0.1 + 0.05
  return <group>
    <mesh position={[0, 0.008, 0]} castShadow receiveShadow><boxGeometry args={[W * 2, 0.016, 0.26]} /><Metal kind="stainless" grain="brushed" /></mesh>
    {[0.42].map(y => <mesh key={y} geometry={plate} position={[0, y, 0]} castShadow><Metal kind="stainless" grain="brushed" /></mesh>)}
    {[-W + 0.02, W - 0.02].flatMap(x => [-0.11, 0.11].map(z => <mesh key={`${x}${z}`} position={[x, 0.22, z]} castShadow><cylinderGeometry args={[0.011, 0.011, 0.44, 10]} /><Metal kind="stainless" /></mesh>))}
  </group>
}

// ---------- 第 1 课 ----------
/** 馒头内部的气孔：浅米白底上一个个大小不一的小孔 */
function crumbTex() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!; g.fillStyle = '#f8f5ee'; g.fillRect(0, 0, S, S)
  let sd = 77; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 1400; i++) { const x = rnd() * S, y = rnd() * S, r = 0.6 + rnd() ** 3 * 3.2; g.fillStyle = `rgba(170,155,130,${0.18 + rnd() * 0.22})`; g.beginPath(); g.ellipse(x, y, r * 1.3, r, rnd() * 3, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,250,0.5)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.4, 0, 0, Math.PI * 2); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1.6); t.anisotropy = 8; return t
}
/** 一块洇开的斑：中间深、边缘不规则地淡出去。color 是斑的颜色 */
function stainTex(rgb: string, seed: number) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, img = g.createImageData(S, S), [r, gg, b] = rgb.split(',').map(Number)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x / S * 2 - 1, dy = y / S * 2 - 1, a = Math.atan2(dy, dx), d = Math.hypot(dx, dy) / (0.82 + 0.12 * noise(Math.cos(a) * 2 + seed, Math.sin(a) * 2, 0) + 0.05 * Math.sin(a * 7 + seed))
    const al = Math.max(0, Math.min(1, (1 - d) * 4)) * (0.75 + 0.25 * fbm(x * 0.05, y * 0.05, seed, 2))
    const k = (y * S + x) * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = al * 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
/** 纱布：细密的经纬线 */
function gauzeTex() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!; g.fillStyle = 'rgba(205,198,178,0.35)'; g.fillRect(0, 0, S, S)
  g.strokeStyle = 'rgba(255,253,246,1)'; g.lineWidth = 3
  for (let i = 0; i < S; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.anisotropy = 8; return t
}

/** 第 1 课交给世界的：三个实验各做到哪了（0–1） */
export interface L1Want { iodine: number; peanut: number; dough: number }
const L1 = {
  bun: [-1.05, 0, 0.05] as V3, bottle: [-0.45, 0, -0.75] as V3,
  paper: [0.12, 0, 0.12] as V3, pestle: [0.75, 0.115, -0.5] as V3,
  beaker: [1.05, 0, -0.05] as V3,
}
export const L1_SPOTS = { bun: [L1_AT[0] + L1.bun[0], L1_AT[1] + 0.4, L1_AT[2] + L1.bun[2]] as V3, paper: [L1_AT[0] + L1.paper[0], L1_AT[1] + 0.02, L1_AT[2] + L1.paper[2]] as V3, beaker: [L1_AT[0] + L1.beaker[0], L1_AT[1] + 0.7, L1_AT[2] + L1.beaker[2]] as V3 }

function Lesson1Kit({ w }: { w: L1Want }) {
  const tex = useMemo(() => ({ crumb: crumbTex(), blue: stainTex('22,26,78', 3), oil: stainTex('150,140,110', 9), gauze: gauzeTex() }), [])
  const geo = useMemo(() => {
    // 切开的半个馒头：圆顶、平底，从正中竖着切开；切面朝上放在盘里（切面贴气孔贴图，表皮微黄）
    const prof: [number, number][] = [[0, 0], [0.31, 0], [0.345, 0.02], ...Array.from({ length: 18 }, (_, i) => { const a = (i / 17) * Math.PI / 2; return [0.36 * Math.cos(a), 0.06 + 0.36 * Math.sin(a)] as [number, number] })]
    const skin = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64, 0, Math.PI), sp = skin.attributes.position
    for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), k = 1 + 0.012 * noise(x * 14, y * 14, z * 14); sp.setXYZ(i, x * k, y, z * k) }
    skin.computeVertexNormals()
    const cs = new THREE.Shape(); cs.moveTo(prof[0][0], prof[0][1]); prof.forEach(([r, y]) => cs.lineTo(r, y)); [...prof].reverse().forEach(([r, y]) => cs.lineTo(-r, y))
    const face = new THREE.ShapeGeometry(cs, 24); face.rotateY(-Math.PI / 2)
    const plate = lathe([[0, 0], [0.32, 0], [0.36, 0.012], [0.5, 0.04], [0.56, 0.06], [0.55, 0.068], [0.49, 0.05], [0.34, 0.028], [0, 0.028]], { segs: 64 })
    const peanut = new THREE.SphereGeometry(1, 28, 20), pp = peanut.attributes.position
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); pp.setXYZ(i, x * 0.065 * (1 - 0.1 * z * z), y * 0.05, z * 0.1) }
    peanut.computeVertexNormals()
    const pestle = lathe([[0, 0], [0.09, 0.005], [0.12, 0.04], [0.1, 0.12], [0.05, 0.22], [0.042, 0.6], [0.05, 0.66], [0, 0.68]], { segs: 40 })
    const beaker = beakerGeo(0.34, 0.92)
    const bundle = new THREE.SphereGeometry(1, 40, 28), bp = bundle.attributes.position
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i), k = 1 + 0.1 * fbm(x * 3, y * 3, z * 3, 2) + 0.04 * Math.sin(Math.atan2(z, x) * 7) * (1 - Math.abs(y)); bp.setXYZ(i, x * k * 0.2, y * k * 0.1, z * k * 0.17) }
    bundle.computeVertexNormals()
    const knot = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.02, 0.06, 0), new THREE.Vector3(0.12, 0.2, -0.02), new THREE.Vector3(0.24, 0.44, -0.03), new THREE.Vector3(0.36, 0.48, -0.03), new THREE.Vector3(0.42, 0.36, -0.03)]), 40, 0.025, 8)
    const gluten = new THREE.SphereGeometry(1, 32, 22), gp = gluten.attributes.position
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), y = gp.getY(i), z = gp.getZ(i), k = 1 + 0.2 * fbm(x * 2 + 3, y * 2, z * 2, 3); gp.setXYZ(i, x * k * 0.11, y * k * 0.07, z * k * 0.12) }
    gluten.computeVertexNormals()
    return { skin, face, plate, peanut, pestle, beaker, bundle, knot, gluten }
  }, [])
  const bunMats = useMemo(() => [new THREE.MeshPhysicalMaterial({ map: tex.crumb, roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') }), new THREE.MeshPhysicalMaterial({ color: '#f6f1e6', roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') })], [tex])
  // 滴碘液：滴管从瓶里抽出来，移到馒头上方，滴两滴，蓝斑洇开
  const ki = w.iodine, lift = ease(Math.min(1, ki / 0.25)), back = ease(Math.max(0, (ki - 0.85) / 0.15))
  const bottleW = new THREE.Vector3(L1_AT[0] + L1.bottle[0], L1_AT[1] + L1.bottle[1], L1_AT[2] + L1.bottle[2])
  const overBun = new THREE.Vector3(L1_AT[0] + L1.bun[0] - 0.02, L1_AT[1] + 1.0, L1_AT[2] + L1.bun[2] + 0.06)
  const up = bottleW.clone().add(new THREE.Vector3(0, 1.15, 0))
  const dropper = ki <= 0 || ki >= 1 ? null : (ki < 0.25 ? bottleW.clone().add(new THREE.Vector3(0, 0.56, 0)).lerp(up, lift).lerp(overBun, Math.max(0, lift * 2 - 1)) : ki < 0.85 ? overBun : overBun.clone().lerp(up, back))
  const blue = ease(Math.max(0, (ki - 0.35) / 0.5))
  // 挤压花生：杵落下，花生压扁，油斑洇开
  const kp = w.peanut, press = kp < 0.6 ? ease(kp / 0.6) : 1 - ease((kp - 0.75) / 0.25) * (kp > 0.75 ? 1 : 0), flat = ease(Math.min(1, kp / 0.55)), oil = ease(Math.max(0, (kp - 0.3) / 0.6))
  const pest = new THREE.Vector3(L1.paper[0], 0.32 - 0.26 * press, L1.paper[2]).lerp(new THREE.Vector3(...L1.pestle), kp <= 0 || kp >= 1 ? 1 : 0)
  // 揉洗面团：纱布包在水里一下下挤，水变成乳白；最后剩下的面筋放到小碟上
  const kd = w.dough, milky = ease(Math.min(1, kd / 0.8)), squeeze = kd > 0 && kd < 0.85 ? 0.18 * Math.abs(Math.sin(kd * Math.PI * 10)) : 0
  const waterCol = '#' + new THREE.Color('#d8ecf0').lerp(new THREE.Color('#f3f1ea'), milky).getHexString()
  const done = kd >= 1
  return <group position={L1_AT}>
    {/* 馒头片和瓷盘 */}
    <group position={L1.bun}>
      <mesh geometry={geo.plate} castShadow receiveShadow><meshPhysicalMaterial color="#f7f6f2" roughness={0.18} clearcoat={0.9} /></mesh>
      <group position={[-0.2, 0.39, 0.0]} rotation={[0, 0.35, -Math.PI / 2]}>
        <mesh geometry={geo.skin} castShadow receiveShadow><meshPhysicalMaterial color="#f1e4c4" roughness={0.6} sheen={0.7} sheenColor="#fffaf0" clearcoat={0.12} side={THREE.DoubleSide} /></mesh>
        <mesh geometry={geo.face} material={bunMats[0]} receiveShadow />
      </group>
      <mesh position={[-0.02, 0.394, 0.06]} rotation-x={-Math.PI / 2} scale={0.04 + 0.13 * blue} renderOrder={4}><circleGeometry args={[1, 40]} /><meshStandardMaterial map={tex.blue} transparent opacity={blue > 0 ? 0.95 : 0} roughness={0.7} depthWrite={false} polygonOffset polygonOffsetFactor={-2} /></mesh>
    </group>
    <DropBottle at={L1.bottle} fall={0.15} dropper={dropper ? dropper.clone().sub(new THREE.Vector3(...L1_AT)) : null} drip={ki > 0.35 && ki < 0.8 ? 0.5 : 0} />
    {/* 白纸、花生、瓷杵 */}
    <group position={L1.paper}>
      <mesh position={[0, 0.003, 0]} rotation-y={0.12} receiveShadow><boxGeometry args={[0.85, 0.006, 0.85]} /><meshStandardMaterial color="#f6f5f0" roughness={0.9} /></mesh>
      <mesh position={[0.02, 0.0075, 0.02]} rotation-x={-Math.PI / 2} scale={0.04 + 0.3 * oil} renderOrder={4}><circleGeometry args={[1, 40]} /><meshPhysicalMaterial map={tex.oil} transparent opacity={oil > 0 ? 0.7 : 0} roughness={0.15} clearcoat={1} depthWrite={false} polygonOffset polygonOffsetFactor={-2} /></mesh>
      <mesh geometry={geo.peanut} position={[0.02, 0.05 * (1 - 0.75 * flat) + 0.006, 0.02]} scale={[1 + 0.6 * flat, 1 - 0.75 * flat, 1 + 0.4 * flat]} castShadow><meshPhysicalMaterial color={flat > 0.5 ? '#e9d6b4' : '#b8584a'} roughness={0.5} clearcoat={0.4} /></mesh>
      {[[-0.25, -0.2, 0.8], [0.27, -0.24, 2.1]].map(([x, z, r], i) => <mesh key={i} geometry={geo.peanut} position={[x, 0.056, z]} rotation-y={r} castShadow><meshPhysicalMaterial color="#b0503f" roughness={0.5} clearcoat={0.4} /></mesh>)}
    </group>
    <group position={pest.toArray()} rotation={kp <= 0 || kp >= 1 ? [0, 0.5, Math.PI / 2] : [0, 0, 0]}><mesh geometry={geo.pestle} castShadow><meshPhysicalMaterial color="#f2f1ec" roughness={0.35} clearcoat={0.6} /></mesh></group>
    {/* 烧杯、纱布包 */}
    <group position={L1.beaker}>
      <mesh geometry={geo.beaker} renderOrder={5} castShadow><meshPhysicalMaterial {...GLASS} /></mesh>
      <Graduations r={0.35} h={0.7} n={4} y0={0.05} />
      <group position={[0, 0.013, 0]}><Liquid r={0.325} h={0.58} color={waterCol} opacity={0.32 + 0.5 * milky} /></group>
      {!done && <group position={[0, 0.5, 0]} scale={[1 + squeeze, 1 - squeeze, 1 + squeeze]}>
        <mesh geometry={geo.bundle} castShadow><meshPhysicalMaterial color={new THREE.Color('#efe6cf').lerp(new THREE.Color('#d9c48e'), milky)} roughness={0.75} sheen={0.6} sheenColor="#ffffff" /></mesh>
        <mesh geometry={geo.bundle} scale={1.04}><meshStandardMaterial map={tex.gauze} transparent roughness={0.9} depthWrite={false} /></mesh>
        <mesh geometry={geo.knot}><meshStandardMaterial color="#f4f1e6" map={tex.gauze} roughness={0.9} /></mesh>
      </group>}
    </group>
    {/* 洗出来的面筋放在小碟上，旁边是摊开的纱布 */}
    <group position={[L1.beaker[0] + 0.05, 0, L1.beaker[2] + 0.62]}>
      <mesh geometry={useMemo(() => lathe([[0, 0], [0.2, 0], [0.24, 0.02], [0.28, 0.04], [0.27, 0.046], [0.2, 0.03], [0, 0.03]], { segs: 48 }), [])} castShadow receiveShadow><meshPhysicalMaterial color="#f7f6f2" roughness={0.2} clearcoat={0.9} /></mesh>
      {done && <>
        <mesh position={[0, 0.034, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.2, 32]} /><meshStandardMaterial map={tex.gauze} transparent roughness={0.9} /></mesh>
        <mesh geometry={geo.gluten} position={[0, 0.08, 0]} castShadow><meshPhysicalMaterial color="#e2c98a" roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.2} sheen={0.5} sheenColor="#fff2c0" /></mesh>
      </>}
    </group>
  </group>
}

// ---------- 第 3 课 ----------
/** 第 3 课交给世界的：水温、保温的进度（0–1：放进去、等、拿出来）、滴碘液的进度、三支试管的颜色 */
export interface L3Want { temp: Temp; warm: number; drop: number; color: Record<TubeNo, Blue>; minutes: number }
const L3 = { rack: [-0.55, 0, 0.12] as V3, bath: [0.5, 0, -0.12] as V3, bottle: [-1.2, 0, -0.45] as V3 }
const RACK_X = (n: TubeNo) => -0.2 + (n - 1) * 0.2
/** 试管在世界里的位置（底部中心） */
export const tubeAt = (n: TubeNo): V3 => [L3_AT[0] + L3.rack[0] + RACK_X(n), L3_AT[1] + 0.03, L3_AT[2] + L3.rack[2]]
export const BATH_AT: V3 = [L3_AT[0] + L3.bath[0], L3_AT[1], L3_AT[2] + L3.bath[2]]
const IODINE: Record<Blue, string> = { none: '#c98a2a', part: '#3a4296', blue: '#16207a' }

/** 一支试管里的东西：碎屑或一小块馒头，2 mL 的液体（唾液略混、清水清），滴了碘液后变色 */
function TubeContent({ n, color, dropped }: { n: TubeNo; color: Blue; dropped: number }) {
  const crumbs = useMemo(() => {
    let sd = n * 31; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    return Array.from({ length: 18 }, (_, i) => ({ p: [(rnd() - 0.5) * 0.1, 0.025 + (i < 10 ? rnd() * 0.03 : 0.04 + rnd() * 0.17), (rnd() - 0.5) * 0.1] as V3, r: [rnd() * 3, rnd() * 3, rnd() * 3] as V3, s: 0.008 + rnd() * 0.011 }))
  }, [n])
  const bit = useMemo(() => new THREE.DodecahedronGeometry(1, 0), [])
  const base = n === 2 ? '#dfeff4' : '#ecede6'
  // 颜色每次算一个新的字符串交出去（同一个颜色对象改了值，画面不会跟着变）
  const liq = '#' + new THREE.Color(base).lerp(new THREE.Color(IODINE[color]), dropped * (color === 'none' ? 0.55 : color === 'part' ? 0.75 : 0.95)).getHexString()
  const crumbCol = '#' + new THREE.Color('#f1ebdc').lerp(new THREE.Color(color === 'blue' ? '#141a5c' : color === 'part' ? '#2a2f6e' : '#d8b874'), dropped * (color === 'none' ? 0.5 : 0.92)).getHexString()
  return <group>
    <group position={[0, 0.012, 0]}><Liquid r={TT.r - 0.008} h={0.28} color={liq} env={0.25} opacity={0.3 + 0.62 * dropped * (color === 'none' ? 0.5 : 1)} /></group>
    {n === 3
      ? <group position={[0, 0.055, 0]}>
          <mesh castShadow scale={0.75}><boxGeometry args={[0.1, 0.1, 0.1]} /><meshPhysicalMaterial color="#f1ebdc" roughness={0.85} /></mesh>
          {/* 整块不搅拌：表面一层被唾液分解，里面还是淀粉，滴碘液后芯是蓝的、外层不太蓝 */}
          <mesh scale={0.54}><boxGeometry args={[0.1, 0.1, 0.1]} /><meshStandardMaterial color={dropped > 0 ? '#141a5c' : '#f1ebdc'} roughness={0.85} transparent opacity={dropped} /></mesh>
          <mesh scale={0.77}><boxGeometry args={[0.1, 0.1, 0.1]} /><meshStandardMaterial color="#cfc0a0" roughness={0.85} transparent opacity={0.4 * (1 - dropped * 0.5)} depthWrite={false} /></mesh>
        </group>
      : crumbs.map((c, i) => <mesh key={i} geometry={bit} position={c.p} rotation={c.r} scale={[c.s * 1.3, c.s * 0.8, c.s]} renderOrder={1}><meshPhysicalMaterial color={crumbCol} roughness={0.7} transparent opacity={0.85} sheen={0.4} sheenColor="#ffffff" /></mesh>)}
  </group>
}

function Lesson3Kit({ w }: { w: L3Want }) {
  const geo = useMemo(() => ({ tube: tubeGeo(), bath: beakerGeo(0.55, 1.45), thermo: lathe([[0, 0], [0.022, 0.01], [0.028, 0.05], [0.022, 0.1], [0.018, 0.12], [0.018, 1.75], [0.012, 1.78], [0, 1.78]], { segs: 20 }) }), [])
  // 保温：0–0.2 放进水浴，0.2–0.8 在水里，0.8–1 拿回试管架
  const k = w.warm, into = ease(Math.min(1, k / 0.2)), out = ease(Math.max(0, (k - 0.8) / 0.2)), inBath = k > 0 && k < 1 ? into * (1 - out) : 0
  const cold = w.temp === 0
  const ice = useMemo(() => {
    let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    return Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * Math.PI * 2 + rnd() * 0.4, r: 0.33 + rnd() * 0.12, s: 0.07 + rnd() * 0.03, rot: [rnd() * 0.5, rnd() * 3, rnd() * 0.5] as V3 }))
  }, [])
  // 滴碘液：滴管依次停在 1、2、3 号试管上方
  const kd = w.drop, which = Math.min(2, Math.floor(kd * 3)) as 0 | 1 | 2, local = kd * 3 - which
  const dropAt = (n: TubeNo) => { const p = tubeAt(n); return new THREE.Vector3(p[0] - L3_AT[0], 1.55, p[2] - L3_AT[2]) }
  const dropper = kd > 0 && kd < 1 ? dropAt((which + 1) as TubeNo) : null
  const dropped = (n: TubeNo) => (kd >= 1 ? 1 : n - 1 < which ? 1 : n - 1 === which ? ease(Math.max(0, (local - 0.4) / 0.5)) : 0)
  return <group position={L3_AT}>
    <group position={L3.rack}><Rack n={5} /></group>
    {([1, 2, 3] as TubeNo[]).map(n => {
      const home = new THREE.Vector3(L3.rack[0] + RACK_X(n), 0.03, L3.rack[2])
      const bath = new THREE.Vector3(L3.bath[0] - 0.22 + (n - 1) * 0.22, 0.04, L3.bath[2] + (n === 2 ? -0.12 : 0.08))
      const p = home.clone().lerp(bath, inBath); p.y += Math.sin(inBath * Math.PI) * 1.2 * (into < 1 || out > 0 ? 1 : 0)
      return <group key={n} position={p} rotation-z={inBath * (n - 2) * 0.12}>
        <mesh geometry={geo.tube} renderOrder={6} castShadow><meshPhysicalMaterial {...GLASS} opacity={0.16} /></mesh>
        <TubeContent n={n} color={w.color[n]} dropped={dropped(n)} />
        {/* 记号笔写的号码：管壁上一小条白色胶带 */}
        <mesh position={[0, 0.78, TT.r + 0.002]}><planeGeometry args={[0.1, 0.12]} /><meshStandardMaterial color="#f4f2ea" roughness={0.8} /></mesh>
      </group>
    })}
    {/* 水浴：1000 mL 大烧杯，温水（或冰水），温度计 */}
    <group position={L3.bath}>
      <mesh geometry={geo.bath} renderOrder={7} castShadow><meshPhysicalMaterial {...GLASS} /></mesh>
      <Graduations r={0.56} h={1.1} n={4} y0={0.1} />
      <group position={[0, 0.013, 0]}><Liquid r={0.535} h={0.82} color={cold ? '#d6eef7' : '#cfe8ee'} opacity={0.3} /></group>
      {cold && ice.map((c, i) => <mesh key={i} position={[Math.cos(c.a) * c.r, 0.81, Math.sin(c.a) * c.r]} rotation={c.rot} scale={[c.s * 0.75, c.s * 0.55, c.s * 0.7]} renderOrder={8}><dodecahedronGeometry args={[1, 0]} /><meshPhysicalMaterial color="#f2fbff" transparent opacity={0.55} roughness={0.15} clearcoat={1} depthWrite={false} /></mesh>)}
      <group position={[0.34, 0.06, -0.28]} rotation-z={0.12}>
        <mesh geometry={geo.thermo} renderOrder={8}><meshPhysicalMaterial {...GLASS} opacity={0.3} /></mesh>
        <mesh position={[0, 0.05, 0]}><sphereGeometry args={[0.02, 14, 10]} /><meshStandardMaterial color="#c8202a" /></mesh>
        <mesh position={[0, 0.05 + (cold ? 0.3 : 0.95) / 2, 0]}><cylinderGeometry args={[0.006, 0.006, cold ? 0.3 : 0.95, 8]} /><meshStandardMaterial color="#d02a30" /></mesh>
        <mesh position={[0, 0.82, 0.019]}><planeGeometry args={[0.03, 1.25]} /><meshStandardMaterial color="#f4f4ee" transparent opacity={0.8} /></mesh>
      </group>
    </group>
    <DropBottle at={L3.bottle} fall={0.75} dropper={dropper} drip={dropper && local > 0.25 && local < 0.75 ? 0.5 : 0} />
  </group>
}

export function Bench({ l1, l3 }: { l1?: L1Want; l3?: L3Want }) {
  return <group>
    <Table />
    <Lesson1Kit w={l1 ?? { iodine: 0, peanut: 0, dough: 0 }} />
    <Lesson3Kit w={l3 ?? { temp: 37, warm: 0, drop: 0, color: { 1: 'none', 2: 'none', 3: 'none' }, minutes: 0 }} />
  </group>
}
