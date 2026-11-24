// 汽水厂的灌装车间和厂区：钢结构厂房（门式钢架、压型钢板墙面和屋面、高侧窗、采光带），前墙剖开；
// 车间里有碳化罐（朝镜头剖开）、糖浆罐、冷水机、灌装转台、输送线、抽检台；车间外是液态二氧化碳储罐和汽化器、锅炉房和烟囱。
// 尺寸在这里按画面单位写（1 m = 6 个单位）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, bolts, lathe, mergeParts, type Part, type RY } from '@/lab-kit'
import { dialTex, epoxyTex, makeSign, ribTex, tankLabel } from './mats'

/** 车间：x 的范围、后墙和前沿的 z、檐口和屋脊的高度 */
export const PH = { x0: -84, x1: 44, z0: -54, z1: 10, eave: 54, ridge: 62 }
const FRAMES = [-84, -52, -20, 12, 44]
/** 碳化罐：中心、外半径、罐底（下封头起点）离地多高、直筒段多高、封头多高。剖面在 z = CARB.z */
export const CARB = { x: -48, z: -28, r: 3.6, y0: 4.2, h: 13, head: 1.8 }
export const CARB_TOP = CARB.y0 + CARB.head * 2 + CARB.h
/** 碳化罐里的水面高度（画面单位） */
export const CARB_LEVEL = CARB.y0 + CARB.head + CARB.h * 0.55
/** 罐顶进气管上的压力表：表盘中心、半径 */
export const GAUGE = { at: [CARB.x + 2.6, CARB_TOP + 4.2, CARB.z + 0.9] as [number, number, number], r: 0.95, max: 400 }
/** 灌装转台的中心、输送线的走向（先沿 +x，再转向 +z 到抽检台） */
export const FILL = { x: -6, z: -28, r: 4.8 }
const LINE: [number, number][] = [[0, -28], [28, -28], [28, -4]]
export const TABLE = { x: 30.4, z: 0.2 }

const STEEL = '#64717c', CLAD = '#d9dcd8'

/** 半边罐子：给出外壁截面（从下往上，起点和终点在转轴上），壁厚 t，只转半圈（留下 z < 0 的那一半），切口贴剖面 */
function halfTank(outer: RY[], t: number) {
  const inner = outer.map(([r, y], i): RY => [Math.max(0, r - t), i === 0 ? y + t : i === outer.length - 1 ? y - t : y]).reverse()
  const loop = [...outer, ...inner]
  const pts = loop.map(([r, y]) => new THREE.Vector2(r, y))
  const body = new THREE.LatheGeometry(pts, 48, Math.PI / 2, Math.PI)
  const s = new THREE.Shape(loop.map(([r, y]) => new THREE.Vector2(r, y)))
  const capR = new THREE.ShapeGeometry(s), capL = new THREE.ShapeGeometry(s); capL.scale(-1, 1, 1)
  return { body, cap: mergeGeometries([capR, capL]) }
}
/** 立式罐的截面（画面单位）：半椭圆的上下封头，直筒段 */
export function tankProfile(R: number, y0: number, h: number, head: number): RY[] {
  const p: RY[] = []
  for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; p.push([Math.sin(a) * R, y0 + head - Math.cos(a) * head]) }
  for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; p.push([Math.cos(a) * R, y0 + head + h + Math.sin(a) * head]) }
  return p
}

function hallParts() {
  const P: Part[] = [], H = PH
  // 门式钢架：两根柱子、两段斜梁，柱脚一块底板
  for (const x of FRAMES) {
    for (const z of (x === H.x0 || x === H.x1 ? [H.z0 + 0.6, H.z1 - 0.6] : [H.z0 + 0.6])) { P.push({ p: [x, H.eave / 2, z], s: [1.2, H.eave, 1.6], c: STEEL }, { p: [x, 0.25, z], s: [2.4, 0.5, 2.6], c: '#4b555e' }) }
    const run = (H.z1 - H.z0) / 2, rise = H.ridge - H.eave, len = Math.hypot(run, rise), a = Math.atan2(rise, run)
    for (const s of [-1, 1]) P.push({ p: [x, (H.eave + H.ridge) / 2 - 0.6, (H.z0 + H.z1) / 2 + s * run / 2], s: [1.1, 1.8, len], c: STEEL, r: [s * a, 0, 0] })
  }
  // 檩条：顺着 x 方向，每 3 m 一道；墙梁：后墙上每 2.4 m 一道
  const run = (H.z1 - H.z0) / 2, rise = H.ridge - H.eave
  for (let k = 0; k <= 5; k++) for (const s of [-1, 1]) { const q = k / 5, z = (H.z0 + H.z1) / 2 + s * run * (1 - q), y = H.eave + rise * q - 1.2; P.push({ p: [(H.x0 + H.x1) / 2, y, z], s: [H.x1 - H.x0, 0.6, 0.35], c: '#7c8992' }) }
  for (let y = 12; y < H.eave; y += 14.4) P.push({ p: [(H.x0 + H.x1) / 2, y, H.z0 + 1.6], s: [H.x1 - H.x0, 0.5, 0.3], c: '#7c8992' })
  // 地面上的黄色通道线
  for (const z of [-8, -12]) P.push({ p: [(H.x0 + H.x1) / 2, 0.16, z], s: [H.x1 - H.x0 - 4, 0.02, 0.35], c: '#e3b21c' })
  // 抽检台：不锈钢台面、四条腿、一层搁板
  const T = TABLE, top = 0.85 * 6
  P.push({ p: [T.x, top - 0.15, T.z], s: [9, 0.3, 4.6], c: '#c9cdd0' }, { p: [T.x, 1.2, T.z], s: [8.4, 0.2, 4.2], c: '#b8bdc0' })
  for (const s of [-1, 1]) for (const t of [-1, 1]) P.push({ p: [T.x + s * 4.1, (top - 0.3) / 2, T.z + t * 1.9], s: [0.3, top - 0.3, 0.3], c: '#b8bdc0' })
  // 车间后面码着的一垛垛成箱的汽水：托盘加纸箱
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const x = 6 + i * 8.4, z = -46 + j * 7.4
    P.push({ p: [x, 0.45, z], s: [7, 0.9, 6.4], c: '#9c7a52' })
    for (let k = 0; k < 4; k++) P.push({ p: [x, 1.9 + k * 2.1, z], s: [6.6, 2, 6], c: k % 2 ? '#c9a77b' : '#c19f72' })
  }
  // 冷水机：一台箱体，正面一块仪表盘
  P.push({ p: [-72, 5, -44], s: [10, 10, 6], c: '#d4d8d8' }, { p: [-72, 7.2, -40.9], s: [4, 2.2, 0.2], c: '#2c3236' })
  return P
}
/** 压型钢板的墙面和屋面：后墙、两端山墙、两坡屋面；后墙高处一条窗带（深色玻璃），屋面一道采光带 */
function useCladding() {
  return useMemo(() => {
    const H = PH, run = (H.z1 - H.z0) / 2, rise = H.ridge - H.eave, len = Math.hypot(run, rise), a = Math.atan2(rise, run)
    const back = mergeGeometries([new THREE.PlaneGeometry(H.x1 - H.x0, 36).translate((H.x0 + H.x1) / 2, 18, H.z0), new THREE.PlaneGeometry(H.x1 - H.x0, 8).translate((H.x0 + H.x1) / 2, 50, H.z0)])
    const gable = (x: number, s: number) => { const sh = new THREE.Shape([new THREE.Vector2(H.z0, 0), new THREE.Vector2(H.z1, 0), new THREE.Vector2(H.z1, H.eave), new THREE.Vector2((H.z0 + H.z1) / 2, H.ridge), new THREE.Vector2(H.z0, H.eave)]); const g = new THREE.ShapeGeometry(sh); g.rotateY(-Math.PI / 2); g.translate(x + s * 0.01, 0, 0); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) / 8, p.getY(i) / 8); return g }
    const ends = mergeGeometries([gable(H.x0, -1), gable(H.x1, 1)])
    const roof = mergeGeometries([-1, 1].map(s => { const g = new THREE.BoxGeometry(H.x1 - H.x0 + 2, 0.4, len + 1.2); g.rotateX(s * a); g.translate((H.x0 + H.x1) / 2, (H.eave + H.ridge) / 2 + 0.3, (H.z0 + H.z1) / 2 + s * run / 2); return g }))
    const sky = mergeGeometries([-1, 1].map(s => { const g = new THREE.PlaneGeometry(H.x1 - H.x0 - 6, 5); g.rotateX(-Math.PI / 2 + s * a); g.translate((H.x0 + H.x1) / 2, H.eave + rise * 0.55 - 0.2, (H.z0 + H.z1) / 2 + s * run * 0.45); return g }))
    const back2 = back.clone(); const uv = back2.attributes.uv, p = back2.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 8, p.getY(i) / 8)
    return { back: back2, ends, roof, sky, win: new THREE.PlaneGeometry(H.x1 - H.x0 - 8, 6).translate((H.x0 + H.x1) / 2, 42, H.z0 + 0.05) }
  }, [])
}

/** 一段管子加两头的法兰 */
function pipe(P: Part[], a: [number, number, number], b: [number, number, number], r: number, c = '#c8cdd0') {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q)
  P.push({ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: [r, len, r], c, r: [e.x, e.y, e.z], cyl: true })
  for (const t of [0.01, 0.99]) P.push({ p: [a[0] + d.x * t, a[1] + d.y * t, a[2] + d.z * t], s: [r * 1.5, 0.3, r * 1.5], c, r: [e.x, e.y, e.z], cyl: true })
}
function pipeParts() {
  const P: Part[] = [], T = CARB_TOP
  // 二氧化碳管：从东墙外的汽化器进来，沿后墙走到碳化罐上方，下来接罐顶
  pipe(P, [PH.x1 + 20, 30, -12], [PH.x1 + 20, 30, -50], 0.35, '#e0e2df')
  pipe(P, [PH.x1 + 20, 30, -50], [CARB.x, 30, -50], 0.35, '#e0e2df')
  pipe(P, [CARB.x, 30, -50], [CARB.x, 30, CARB.z - 1], 0.35, '#e0e2df')
  pipe(P, [CARB.x, 30, CARB.z - 1], [CARB.x + 2.6, 30, CARB.z - 1], 0.35, '#e0e2df')
  pipe(P, [CARB.x + 2.6, 30, CARB.z - 1], [CARB.x + 2.6, T - 0.6, CARB.z - 1], 0.35, '#e0e2df')
  // 进水管：冷水机出来的冷水送到罐顶的喷头
  pipe(P, [-72, 10, -41], [-72, 26, -41], 0.45); pipe(P, [-72, 26, -41], [CARB.x - 1.6, 26, -41], 0.45); pipe(P, [CARB.x - 1.6, 26, -41], [CARB.x - 1.6, 26, CARB.z - 1.2], 0.45); pipe(P, [CARB.x - 1.6, 26, CARB.z - 1.2], [CARB.x - 1.6, T - 0.4, CARB.z - 1.2], 0.45)
  // 出料管：罐底出来，沿地面去灌装机
  pipe(P, [CARB.x, CARB.y0 - 0.2, CARB.z - 1.5], [CARB.x, 1.4, CARB.z - 1.5], 0.5); pipe(P, [CARB.x, 1.4, CARB.z - 1.5], [FILL.x - 5, 1.4, CARB.z - 1.5], 0.5)
  // 糖浆罐到碳化罐的管
  pipe(P, [-72, 3, -20], [CARB.x - 3, 3, -20], 0.45)
  return P
}

/** 碳化罐：不锈钢的立式压力罐，朝镜头剖开；四条腿、罐顶的人孔、侧面的视镜和铭牌 */
function Carbonator() {
  const g = useMemo(() => {
    const prof = tankProfile(CARB.r, CARB.y0, CARB.h, CARB.head)
    const out: RY[] = [[0, CARB.y0], ...prof.slice(1, -1), [0, CARB_TOP]]
    return halfTank(out, 0.14)
  }, [])
  const legs = useMemo(() => mergeGeometries([0, 1, 2, 3].map(i => { const a = Math.PI / 2 + Math.PI / 6 + i * Math.PI / 4.5; const c = new THREE.CylinderGeometry(0.32, 0.36, CARB.y0 + 1.2, 12); c.translate(Math.sin(a) * (CARB.r - 0.4), (CARB.y0 + 1.2) / 2, Math.cos(a) * (CARB.r - 0.4)); return c })), [])
  const hatch = useMemo(() => { const t = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!; x.fillStyle = '#c4c8ca'; x.fillRect(0, 0, 64, 64); x.strokeStyle = 'rgba(70,76,80,0.55)'; x.lineWidth = 3; for (let k = -64; k < 128; k += 12) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 64, 64); x.stroke() } return c })()); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 6); return t }, [])
  const man = useMemo(() => lathe([[0, 0], [0.95, 0], [0.95, 0.8], [1.25, 0.8], [1.25, 1.2], [0, 1.2]]), [])
  const label = useMemo(() => tankLabel('碳化罐', 'CO₂ + H₂O'), [])
  const ring = useMemo(() => bolts(12, 1.1, 0.24), [])
  return <group position={[CARB.x, 0, CARB.z]}>
    <mesh geometry={g.body} castShadow receiveShadow><meshStandardMaterial color="#dde1e4" metalness={0.55} roughness={0.32} envMapIntensity={1.4} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.cap}><meshStandardMaterial map={hatch} roughness={0.6} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={legs} castShadow><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh geometry={man} position={[-1.2, CARB_TOP - 0.5, -1.4]} castShadow><Metal kind="stainless" grain="turned" /></mesh>
    <mesh geometry={ring} position={[-1.2, CARB_TOP + 0.7, -1.4]}><Metal kind="steel" /></mesh>
    {/* 背后罐壁上的铭牌（从剖开的口子里看得到它的背面，所以贴在外壁朝后的地方不画）；罐侧一块标识牌朝镜头 */}
    <mesh position={[-CARB.r - 0.06, CARB.y0 + CARB.head + CARB.h * 0.72, -0.2]} rotation-y={-Math.PI / 2 + 0.5}><planeGeometry args={[3.2, 1.6]} /><meshStandardMaterial map={label} roughness={0.6} /></mesh>
  </group>
}
/** 压力表：表壳、表盘、玻璃。指针由第 5 课画。原点在表盘中心，朝 +z */
function Gauge() {
  const dial = useMemo(() => dialTex(GAUGE.max), [])
  return <group position={GAUGE.at}>
    <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[GAUGE.r + 0.12, GAUGE.r + 0.12, 0.5, 40]} /><Metal kind="chrome" rough={0.15} /></mesh>
    <mesh position-z={0.26}><circleGeometry args={[GAUGE.r, 48]} /><meshStandardMaterial map={dial} roughness={0.5} /></mesh>
    <mesh position={[0, -GAUGE.r - 0.9, -0.2]}><cylinderGeometry args={[0.18, 0.18, 1.8, 12]} /><Metal kind="brass" grain="turned" /></mesh>
  </group>
}

/** 汽水瓶（500 mL 的 PET 瓶）的模型：原点在瓶底正中，高 0.22 m 乘 6。瓶底是五瓣花瓣形，这里简化成一圈 */
export const BOTTLE_PROFILE: RY[] = [[0, 0.004], [0.012, 0], [0.026, 0.004], [0.032, 0.014], [0.033, 0.03], [0.031, 0.06], [0.033, 0.11], [0.033, 0.14], [0.026, 0.17], [0.016, 0.19], [0.0135, 0.2], [0.0135, 0.215]]
const bottleGeo = () => lathe(BOTTLE_PROFILE.map(([r, y]) => [r * 6, y * 6] as RY), { segs: 20 })

/** 灌装转台：不锈钢的底座，转台上一圈瓶子，上面一只环形的储液缸和一圈灌装阀；外面一圈防护罩。转台一直在慢慢转 */
function Filler() {
  const spin = useRef<THREE.Group>(null)
  useFrame((_, d) => { if (spin.current) spin.current.rotation.y += Math.min(d, 1 / 30) * 0.4 })
  const g = useMemo(() => {
    const ring = 24, bs: THREE.BufferGeometry[] = [], vs: THREE.BufferGeometry[] = []
    const b = bottleGeo()
    for (let i = 0; i < ring; i++) {
      const a = i / ring * Math.PI * 2
      bs.push(b.clone().translate(Math.cos(a) * FILL.r, 5.6, Math.sin(a) * FILL.r))
      const v = new THREE.CylinderGeometry(0.28, 0.2, 2.4, 10); v.translate(Math.cos(a) * FILL.r, 8.8, Math.sin(a) * FILL.r); vs.push(v)
    }
    return { bottles: mergeGeometries(bs), valves: mergeGeometries(vs) }
  }, [])
  const base = useMemo(() => lathe([[0, 0], [FILL.r + 1.4, 0], [FILL.r + 1.4, 4.6], [FILL.r + 1.1, 5.0], [0, 5.0]]), [])
  const bowl = useMemo(() => lathe([[FILL.r - 1.1, 0], [FILL.r + 1.1, 0], [FILL.r + 1.1, 1.6], [FILL.r + 0.9, 1.8], [FILL.r - 0.9, 1.8], [FILL.r - 1.1, 1.6]], { closed: true }), [])
  return <group position={[FILL.x, 0, FILL.z]}>
    <mesh geometry={base} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.3} /></mesh>
    <group ref={spin}>
      <mesh position-y={5.3}><cylinderGeometry args={[FILL.r + 0.6, FILL.r + 0.6, 0.4, 48]} /><Metal kind="stainless" grain="turned" /></mesh>
      <mesh geometry={g.bottles} castShadow><meshPhysicalMaterial color="#9fd3b0" transparent opacity={0.6} roughness={0.08} clearcoat={1} envMapIntensity={1.8} /></mesh>
      <mesh geometry={g.valves} castShadow><Metal kind="stainless" grain="turned" /></mesh>
      <mesh geometry={bowl} position-y={10} castShadow><Metal kind="stainless" grain="brushed" rough={0.28} /></mesh>
      <mesh position-y={8}><cylinderGeometry args={[0.8, 0.8, 8, 20]} /><Metal kind="stainless" /></mesh>
    </group>
    {/* 防护罩：四根立柱、顶框，几块透明的护板 */}
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([s, t]) => <mesh key={`${s}${t}`} position={[s * 7.4, 7.5, t * 7.4]} castShadow><boxGeometry args={[0.36, 15, 0.36]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    {[-1, 1].map(t => <mesh key={t} position={[0, 15, t * 7.4]}><boxGeometry args={[15.2, 0.36, 0.36]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * 7.4, 15, 0]}><boxGeometry args={[0.36, 0.36, 15.2]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    <mesh position={[0, 9.5, -7.4]} renderOrder={3}><planeGeometry args={[14.8, 10]} /><meshPhysicalMaterial color="#cfe0e6" transparent opacity={0.14} roughness={0.05} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group>
}

/** 输送线：不锈钢的机架、两道护栏、深色的链板，瓶子一只只往前走。 */
function Conveyor() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const { segs, total, frame } = useMemo(() => {
    const segs = LINE.slice(1).map((b, i) => { const a = LINE[i]; return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) } })
    const total = segs.reduce((s, q) => s + q.len, 0)
    const P: Part[] = []
    for (const { a, b, len } of segs) {
      const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, alongX = Math.abs(b[0] - a[0]) > 0.1, sx = alongX ? len + 1.2 : 1.6, sz = alongX ? 1.6 : len + 1.2
      P.push({ p: [cx, 4.9, cz], s: [sx, 0.35, sz], c: '#2b2f33' }, { p: [cx, 4.5, cz], s: [alongX ? sx : 2, 0.5, alongX ? 2 : sz], c: '#c9cdd0' })
      for (const o of [-1, 1]) P.push({ p: [cx + (alongX ? 0 : o * 1), 6.0, cz + (alongX ? o * 1 : 0)], s: [alongX ? sx : 0.14, 0.14, alongX ? 0.14 : sz], c: '#d7dadc' })
      for (let k = 0; k <= Math.floor(len / 6); k++) { const q = k / Math.max(1, Math.floor(len / 6)), x = a[0] + (b[0] - a[0]) * q, z = a[1] + (b[1] - a[1]) * q; for (const o of [-1, 1]) P.push({ p: [x + (alongX ? 0 : o * 0.8), 2.1, z + (alongX ? o * 0.8 : 0)], s: [0.3, 4.2, 0.3], c: '#bfc4c7' }) }
    }
    return { segs, total, frame: mergeParts(P) }
  }, [])
  const N = 30, dummy = useMemo(() => new THREE.Object3D(), []), geo = useMemo(() => bottleGeo(), [])
  const t0 = useRef(0)
  useFrame((_, d) => {
    const m = ref.current; if (!m) return
    t0.current += Math.min(d, 1 / 30) * 2.2
    for (let i = 0; i < N; i++) {
      let s = (t0.current + i * total / N) % total
      let x = 0, z = 0
      for (const q of segs) { if (s <= q.len) { const k = s / q.len; x = q.a[0] + (q.b[0] - q.a[0]) * k; z = q.a[1] + (q.b[1] - q.a[1]) * k; break } s -= q.len }
      dummy.position.set(x, 5.1, z); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <group>
    <mesh geometry={frame} castShadow receiveShadow><Painted rough={0.35} metal={0.6} /></mesh>
    <instancedMesh ref={ref} args={[geo, undefined, N]} castShadow frustumCulled={false}><meshPhysicalMaterial color="#9fd3b0" transparent opacity={0.7} roughness={0.08} clearcoat={1} envMapIntensity={1.8} /></instancedMesh>
  </group>
}

/** 车间外：液态二氧化碳储罐（白色的立式保温罐，带爬梯）、旁边的汽化器、锅炉房和烟囱 */
function Yard() {
  const tank = useMemo(() => lathe(tankProfile(6, 4, 30, 3), { segs: 48 }), [])
  const label = useMemo(() => tankLabel('液态二氧化碳', 'CO₂'), [])
  const parts = useMemo(() => {
    const P: Part[] = []
    // 储罐的裙座、爬梯和护笼、顶上的平台
    P.push({ p: [62, 2.5, -30], s: [5.6, 5, 5.6], c: '#cfd2cf', cyl: true })
    for (const s of [-1, 1]) P.push({ p: [62 + s * 0.7, 22, -23.4], s: [0.14, 38, 0.14], c: '#d9b21c', cyl: true })
    for (let y = 4; y < 41; y += 1.6) P.push({ p: [62, y, -23.4], s: [1.4, 0.1, 0.1], c: '#d9b21c' })
    for (let y = 10; y < 41; y += 3) P.push({ p: [62, y, -22.4], s: [2.2, 0.12, 0.12], c: '#d9b21c' })
    // 汽化器：一排竖着的铝翅片管
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { P.push({ p: [58 + i * 1.6, 7, -12 + j * 1.6], s: [0.5, 12, 0.5], c: '#d6d9dc', cyl: true }); for (let k = 0; k < 4; k++) P.push({ p: [58 + i * 1.6, 7, -12 + j * 1.6], s: [1.3, 12, 0.06], c: '#c9ced2', r: [0, k * Math.PI / 4, 0] }) }
    P.push({ p: [60.4, 13.4, -11.2], s: [6, 0.6, 3.4], c: '#c9ced2' })
    // 储罐区的护栏
    for (let x = 50; x <= 74; x += 3) for (const z of [-44, -4]) P.push({ p: [x, 2, z], s: [0.2, 4, 0.2], c: '#d9b21c', cyl: true })
    for (const z of [-44, -4]) P.push({ p: [62, 3.8, z], s: [24, 0.16, 0.16], c: '#d9b21c' })
    for (const x of [50, 74]) for (let z = -44; z <= -4; z += 4) P.push({ p: [x, 2, z], s: [0.2, 4, 0.2], c: '#d9b21c', cyl: true })
    for (const x of [50, 74]) P.push({ p: [x, 3.8, -24], s: [0.16, 0.16, 40], c: '#d9b21c' })
    // 锅炉房：一座砖红色的平顶小楼，女儿墙；旁边一根钢烟囱
    P.push({ p: [70, 12, -96], s: [30, 24, 22], c: '#b3735a' }, { p: [70, 24.8, -96], s: [31, 1.6, 23], c: '#9b6450' })
    for (let i = 0; i < 4; i++) P.push({ p: [58 + i * 8, 15, -84.9], s: [4, 4.5, 0.2], c: '#3b4248' })
    P.push({ p: [88, 36, -96], s: [1.8, 72, 1.8], c: '#8c9196', cyl: true })
    for (const y of [24, 48, 70]) P.push({ p: [88, y, -96], s: [2.3, 0.8, 2.3], c: '#6d7378', cyl: true })
    return P
  }, [])
  const yard = useMemo(() => mergeParts(parts), [parts])
  return <group>
    <mesh geometry={tank} position={[62, 0, -30]} castShadow receiveShadow><meshPhysicalMaterial color="#eeeeea" roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh position={[62, 22, -23.9]} rotation-y={0}><planeGeometry args={[7, 3.5]} /><meshStandardMaterial map={label} roughness={0.6} /></mesh>
    <mesh geometry={yard} castShadow receiveShadow><Painted rough={0.6} metal={0.15} /></mesh>
  </group>
}

export function Plant() {
  const clad = useCladding()
  const tex = useMemo(() => {
    const wall = ribTex([216, 220, 216]).clone(); wall.needsUpdate = true
    const roof = ribTex([150, 160, 168]).clone(); roof.repeat.set(16, 1); roof.needsUpdate = true
    const floor = epoxyTex().clone(); floor.repeat.set(8, 4); floor.needsUpdate = true
    return { wall, roof, floor, sign: makeSign(['清柠饮料 · 灌装车间'], '#1f7a4d', '#ffffff', 1024, 128) }
  }, [])
  const geo = useMemo(() => ({ hall: mergeParts(hallParts()), pipes: mergeParts(pipeParts()) }), [])
  const syrup = useMemo(() => lathe(tankProfile(3, 3.6, 10, 1.5), { segs: 40 }), [])
  return <group>
    {/* 车间的地坪 */}
    <mesh rotation-x={-Math.PI / 2} position={[(PH.x0 + PH.x1) / 2, 0.12, (PH.z0 + PH.z1) / 2]} receiveShadow><planeGeometry args={[PH.x1 - PH.x0, PH.z1 - PH.z0]} /><meshStandardMaterial map={tex.floor} roughness={0.35} metalness={0.05} /></mesh>
    <mesh geometry={clad.back} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.55} metalness={0.2} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={clad.ends} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.55} metalness={0.2} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={clad.win}><meshPhysicalMaterial color="#25323c" roughness={0.1} clearcoat={1} envMapIntensity={1.4} /></mesh>
    <mesh geometry={clad.roof} castShadow receiveShadow><meshStandardMaterial map={tex.roof} roughness={0.55} metalness={0.25} /></mesh>
    <mesh geometry={clad.sky}><meshBasicMaterial color="#f3f6f2" toneMapped={false} side={THREE.DoubleSide} /></mesh>
    <mesh position={[24, 38, PH.z0 + 0.1]}><planeGeometry args={[22, 2.8]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
    <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.5} metal={0.3} /></mesh>
    <mesh geometry={geo.pipes} castShadow><Painted rough={0.3} metal={0.7} /></mesh>
    <Carbonator />
    <Gauge />
    <mesh geometry={syrup} position={[-72, 0, -20]} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.3} /></mesh>
    <Filler />
    <Conveyor />
    <Yard />
  </group>
}
