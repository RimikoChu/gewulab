// 馆外的火箭发动机试车台：混凝土承力墩、测推力的力传感器、钢推力架、横卧的液体火箭发动机、动架和导轨、导流槽，
// 旁边是球形贮罐、管廊、控制掩体和避雷塔。原点在喷管出口正下方的地面上，发动机朝 +x 喷火，推力朝 -x 顶在承力墩上。
// Plume 是点火时的火焰和导流槽里翻上来的水汽，由第 7 课交给它一个 0–1 的强度。
import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal, Painted, bolts, disc, mergeParts, shell, useConcrete, type Part, type RY } from '@/lab-kit'
import { STAND, type V3 } from './layout'
import { makeSign, once } from './mats'

const AX = STAND.axis
/** 发动机的长度、喷管出口的半径、承力墩正面的位置 */
export const ENGINE = { len: 3.1, exit: 0.86, block: -5.4 }
const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, r?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c, r })
const cyl = (x: number, y0: number, z: number, r: number, h: number, c: string, rot?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [r, h, 0], c, cyl: true, r: rot })

const ENGINE_G = once(() => {
  // 截面沿轴线从喷注器（0）到喷管出口（len）：头部圆顶、燃烧室、收缩段、喉部、钟形喷管
  const bell: RY[] = []
  for (let i = 0; i <= 14; i++) { const k = i / 14; bell.push([0.21 + (ENGINE.exit - 0.21) * Math.pow(k, 0.62), 1.3 + (ENGINE.len - 1.3) * k]) }
  const outer: RY[] = [[0, 0], [0.2, 0.01], [0.34, 0.08], [0.4, 0.2], [0.4, 0.92], [0.36, 1.02], [0.25, 1.2], ...bell]
  const tube = (pts: V3[], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.3), 40, r, 12)
  return {
    wall: shell(outer, 0.028, { segs: 64 }),
    head: disc(0.46, 0.07, { hole: 0.1 }), headBolts: bolts(18, 0.415, 0.05),
    flange: disc(0.3, 0.06), flangeBolts: bolts(10, 0.25, 0.04),
    // 推进剂管：液氧（蓝）从上面进泵，燃料（橙）从侧面进，泵后高压管接到头部和喷管的集液环
    lox: tube([[-2.2, 0.95, 0.1], [-2.2, 1.7, 0.1], [-2.6, 2.3, -0.6], [-2.8, 2.5, -2.4], [-2.8, 2.5, -5.2]], 0.09),
    fuel: tube([[-1.75, 0.8, -0.35], [-1.75, 1.2, -0.9], [-2.0, 1.9, -1.6], [-2.2, 2.15, -3], [-2.2, 2.15, -5.2]], 0.075),
    hp1: tube([[-2.45, 0.78, 0.12], [-2.95, 0.72, 0.16], [-3.14, 0.4, 0.1], [-3.12, 0.12, 0]], 0.05),
    hp2: tube([[-1.55, 0.72, 0.05], [-1.1, 0.7, 0.3], [-0.5, 0.84, 0.46], [-0.08, 0.82, 0.3]], 0.045),
    gas: tube([[-2.0, 0.78, 0.26], [-1.6, 0.6, 0.6], [-1.1, 0.48, 0.62], [-0.7, 0.46, 0.5]], 0.06),
  }
})

/** 横卧的发动机：轴线在 y = 轴线高度，喷管出口在 x = 0 */
function Engine() {
  const G = ENGINE_G(), L = ENGINE.len
  const along = (a: number) => a - L       // 轴线上的位置换成 x
  return <group position-y={AX}>
    <group rotation-z={-Math.PI / 2} position-x={-L}>
      <mesh geometry={G.wall} castShadow receiveShadow><Metal kind="stainless" grain="turned" repeat={[1, 26]} rough={0.34} /></mesh>
      <mesh geometry={G.head} position-y={-0.035} castShadow><Metal kind="steel" grain="turned" /></mesh>
      <mesh geometry={G.headBolts} position-y={0.035}><Metal kind="steel" /></mesh>
    </group>
    {/* 喷管上的加强箍和集液环，燃烧室的两道卡箍 */}
    {[[1.55, 0.385, 0.022], [1.95, 0.53, 0.022], [2.4, 0.675, 0.022], [3.02, 0.875, 0.05], [1.26, 0.27, 0.05]].map(([a, r, t], i) => <mesh key={i} position-x={along(a)} rotation-y={Math.PI / 2} castShadow><torusGeometry args={[r, t, 10, 56]} /><Metal kind={t > 0.03 ? 'steel' : 'stainless'} rough={0.4} /></mesh>)}
    {[0.3, 0.82].map(a => <mesh key={a} position-x={along(a)} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.415, 0.415, 0.07, 40]} /><Metal kind="steel" grain="brushed" /></mesh>)}
    {/* 涡轮泵：横在燃烧室上方，两头是泵壳 */}
    <group position={[along(0.95), 0.82, 0.1]}>
      <mesh rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.2, 0.2, 0.95, 28]} /><Metal kind="steel" grain="cast" /></mesh>
      {[-0.5, 0.5].map(s => <mesh key={s} position-x={s} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.3, 0.3, 0.22, 32]} /><Metal kind="aluminum" grain="cast" /></mesh>)}
      {[-0.62, 0.62].map(s => <mesh key={s} position-x={s} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.12, 0.12, 0.06, 20]} /><Metal kind="steel" /></mesh>)}
    </group>
    <mesh geometry={G.lox} castShadow><meshPhysicalMaterial color="#3d78b8" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={G.fuel} castShadow><meshPhysicalMaterial color="#c9772e" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={G.hp1} castShadow><Metal kind="stainless" rough={0.3} /></mesh>
    <mesh geometry={G.hp2} castShadow><Metal kind="stainless" rough={0.3} /></mesh>
    <mesh geometry={G.gas} castShadow><Metal kind="copper" rough={0.4} /></mesh>
  </group>
}

/** 推力架：四根斜撑从发动机头部收到力传感器上；力传感器顶在承力墩正面的钢板上 */
function ThrustFrame() {
  const L = ENGINE.len, x0 = -L - 0.07, x1 = ENGINE.block + 0.62, G = ENGINE_G()
  const struts = useMemo(() => [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sy, sz]) => {
    const a = new THREE.Vector3(x0, sy * 0.3, sz * 0.3), b = new THREE.Vector3(x1, sy * 0.1, sz * 0.1), d = b.clone().sub(a)
    return { p: a.clone().add(b).multiplyScalar(0.5), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() }
  }), [x0, x1])
  return <group position-y={AX}>
    {struts.map((s, i) => <mesh key={i} position={s.p} quaternion={s.q} castShadow><cylinderGeometry args={[0.055, 0.055, s.len, 14]} /><meshPhysicalMaterial color="#c8a22c" roughness={0.45} clearcoat={0.4} /></mesh>)}
    <mesh position-x={x1} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.24, 0.24, 0.08, 28]} /><meshPhysicalMaterial color="#c8a22c" roughness={0.45} clearcoat={0.4} /></mesh>
    {/* 力传感器：一段不锈钢圆柱，两头法兰，侧面引出信号线 */}
    <mesh position-x={x1 - 0.28} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.19, 0.19, 0.44, 32]} /><Metal kind="stainless" grain="turned" /></mesh>
    <group position-x={x1 - 0.53} rotation-z={Math.PI / 2}><mesh geometry={G.flange}><Metal kind="steel" grain="turned" /></mesh><mesh geometry={G.flangeBolts} position-y={0.03}><Metal kind="steel" /></mesh></group>
    <mesh position={[x1 - 0.28, 0.2, 0]}><cylinderGeometry args={[0.035, 0.035, 0.08, 12]} /><meshStandardMaterial color="#1c1e21" roughness={0.6} /></mesh>
    <mesh position={[ENGINE.block + 0.03, 0, 0]}><boxGeometry args={[0.06, 1.5, 1.5]} /><Metal kind="steel" grain="brushed" rough={0.5} /></mesh>
  </group>
}

function standParts() {
  const C: Part[] = [], S: Part[] = [], W: Part[] = []
  const L = ENGINE.len, bx = ENGINE.block
  // 动架：托着发动机的钢架，四只滚轮坐在两条导轨上，发动机可以沿轴线微微前后动，力全部传到传感器上
  for (const sz of [-0.75, 0.75]) {
    S.push(box(-1.9, 0.25, sz, 6.4, 0.1, 0.12, '#4a5158'), box(-1.9, 0.35, sz, 6.4, 0.05, 0.07, '#8c949b'))             // 导轨
    S.push(box(-1.9, 0.62, sz, 3.0, 0.16, 0.14, '#2f5d8a'))                                                             // 动架的纵梁
    for (const sx of [-3.1, -0.7]) { S.push(cyl(sx, 0.4, sz, 0.11, 0.1, '#30353a', [Math.PI / 2, 0, 0])); S.push(box(sx, 0.7, sz, 0.14, AX - 1.25, 0.14, '#2f5d8a')) }
    S.push(box(-1.9, 1.2, sz, 2.55, 0.1, 0.1, '#2f5d8a', [0, 0, 0.42]), box(-1.9, 1.2, sz, 2.55, 0.1, 0.1, '#2f5d8a', [0, 0, -0.42]))
  }
  for (const sx of [-3.1, -0.7]) S.push(box(sx, AX - 0.62, 0, 0.14, 0.14, 1.64, '#2f5d8a'), box(sx, 0.62, 0, 0.12, 0.12, 1.5, '#2f5d8a'))
  // 托住燃烧室和喷管的两道鞍座
  S.push(box(-L + 0.56, AX - 0.56, 0, 0.16, 0.16, 0.6, '#3a4046'), box(-0.9, AX - 0.8, 0, 0.16, 0.14, 0.9, '#3a4046'))
  // 检修平台：格栅板、栏杆、梯子（在发动机北侧）
  S.push(box(-2.2, 1.5, -1.9, 4.4, 0.06, 1.2, '#6f777e'))
  for (const sx of [-4.3, -2.2, -0.1]) { S.push(box(sx, 0.25, -2.4, 0.08, 1.25, 0.08, '#6f777e'), box(sx, 0.25, -1.4, 0.08, 1.25, 0.08, '#6f777e'), box(sx, 1.56, -2.46, 0.05, 1.05, 0.05, '#d1b02e')) }
  S.push(box(-2.2, 2.58, -2.46, 4.3, 0.05, 0.05, '#d1b02e'), box(-2.2, 2.08, -2.46, 4.3, 0.04, 0.04, '#d1b02e'))
  for (let i = 0; i < 6; i++) S.push(box(-4.75, 0.42 + i * 0.2, -1.9, 0.3, 0.03, 0.7, '#6f777e'))
  // 管廊：液氧管和燃料管从贮罐区架过来
  for (let pz = -5.6; pz >= -17; pz -= 3.8) S.push(box(-2.5, 0.25, pz, 0.12, AX + 2.0, 0.12, '#59626a'), box(-2.5, AX + 2.25, pz, 1.4, 0.1, 0.12, '#59626a'))
  W.push({ p: [-2.8, AX + 2.5, -11.2], s: [0.09, 12, 0], c: '#3d78b8', cyl: true, r: [Math.PI / 2, 0, 0] }, { p: [-2.2, AX + 2.15, -11.2], s: [0.075, 12, 0], c: '#c9772e', cyl: true, r: [Math.PI / 2, 0, 0] })
  // 贮罐区：两只球罐（液氧）、一只卧罐（燃料），都有支腿和爬梯
  for (const [tx, tz] of [[-9, -22], [0.5, -22]]) for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; S.push(box(tx + Math.cos(a) * 2.5, 0, tz + Math.sin(a) * 2.5, 0.2, 3.6, 0.2, '#8f979e')) }
  for (const sx of [10, 16]) C.push(box(sx, 0, -22.5, 0.6, 1.5, 3, '#e2e0d8'))
  W.push({ p: [13, 2.9, -22.5], s: [1.7, 9, 0], c: '#d9dde0', cyl: true, r: [0, 0, Math.PI / 2] })
  // 避雷塔：两座格构塔
  for (const [tx, tz] of [[-13, -9], [24, -12]]) {
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.push(box(tx + a * 0.55, 0, tz + b * 0.55, 0.1, 30, 0.1, '#b6453a'))
    for (let y = 1.5; y < 30; y += 3) { S.push(box(tx, y, tz - 0.55, 1.2, 0.06, 0.06, '#d9dde0'), box(tx, y, tz + 0.55, 1.2, 0.06, 0.06, '#d9dde0'), box(tx - 0.55, y, tz, 0.06, 0.06, 1.2, '#d9dde0'), box(tx + 0.55, y, tz, 0.06, 0.06, 1.2, '#d9dde0'))
      S.push(box(tx, y, tz + 0.55, 0.05, 3.2, 0.05, y % 6 < 3 ? '#b6453a' : '#d9dde0', [0, 0, 0.36]), box(tx - 0.55, y, tz, 0.05, 3.2, 0.05, y % 6 < 3 ? '#b6453a' : '#d9dde0', [0.36, 0, 0])) }
    S.push(box(tx, 30, tz, 0.05, 4, 0.05, '#aab2b9'))
  }
  // 混凝土：场坪、承力墩和它后面的斜撑墩、导流槽的两道侧墙、控制掩体
  C.push(box(4, 0, 0, 40, 0.25, 15, '#e2e0d8'))
  C.push(box(bx - 1.6, 0.25, 0, 3.2, 4.5, 4.4, '#e8e6de'), box(bx - 4.1, 0.25, 0, 2.6, 2.4, 3.6, '#dcdad2'), box(bx - 3.55, 2.0, 0, 3.4, 1.6, 3.6, '#dcdad2', [0, 0, 0.62]))
  C.push(box(bx - 1.6, 4.75, 0, 3.4, 0.14, 4.6, '#cfcdc5'))
  // 导流槽只砌北面一道侧墙和后墙，朝镜头的一面敞着，看得见火焰怎样拐弯
  C.push(box(6.6, 0.25, -3.3, 7, 2.6, 0.7, '#d6d4cc'), box(8.2, 2.85, -3.3, 3.8, 3.2, 0.7, '#d6d4cc'))
  C.push(box(10.1, 0.25, -0.35, 0.9, 5.8, 6.6, '#cdcbc3'))
  C.push(box(-24, 0, -34, 11, 3.4, 7, '#dedcd4'), box(-24, 3.4, -34, 11.6, 0.3, 7.6, '#c6c4bc'), box(-24, 1.9, -30.48, 6, 0.5, 0.06, '#1a2026'), box(-28.4, 0, -30.46, 1.1, 2.2, 0.08, '#4a5a66'))
  // 场坪边上的警戒桩、通到冰球馆的路
  for (let sx = -14; sx <= 24; sx += 3.8) for (const sz of [7.2]) { S.push(cyl(sx, 0.25, sz, 0.07, 0.9, '#d8b22a')); S.push(cyl(sx, 0.75, sz, 0.074, 0.14, '#1d1f22')) }
  C.push(box(-64, -0.03, 10.5, 96, 0.06, 5.5, '#4a4e52'))
  return { C, S, W }
}

const DEFLECTOR = once(() => {
  // 导流槽底的导流板：先平后翘，把水平喷来的燃气拐向上方。离喷管 3.4 m
  const s = new THREE.Shape(); s.moveTo(3.4, 0.25); s.lineTo(5, 0.25); s.quadraticCurveTo(8.3, 0.4, 8.9, 5.8); s.lineTo(9.7, 5.8); s.lineTo(9.7, 0.25); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: 5.9, bevelEnabled: false, curveSegments: 20 }); g.translate(0, 0, -2.95); g.scale(1, 1, 0.98)
  return g
})

/** 整座试车台（静止的部分） */
export function TestStand() {
  const geo = useMemo(() => { const p = standParts(); return { C: mergeParts(p.C), S: mergeParts(p.S), W: mergeParts(p.W) } }, [])
  const [d, n, r] = useConcrete(3, 3)
  const sign = useMemo(() => makeSign(['试车台', '点火时请撤到警戒线以外'], '#b6453a', '#f4efe2', 512, 192), [])
  return <group>
    <mesh geometry={geo.C} castShadow receiveShadow><meshStandardMaterial vertexColors map={d} normalMap={n} roughnessMap={r} /></mesh>
    <mesh geometry={geo.S} castShadow receiveShadow><Painted rough={0.5} metal={0.55} /></mesh>
    <mesh geometry={geo.W} castShadow receiveShadow><Painted rough={0.4} metal={0.2} /></mesh>
    {[[-9, -22], [0.5, -22]].map(([x, z], i) => <group key={i} position={[x, 5.6, z]}>
      <mesh castShadow receiveShadow><sphereGeometry args={[3.3, 40, 28]} /><meshPhysicalMaterial color="#dfe3e6" roughness={0.4} clearcoat={0.3} /></mesh>
      <mesh rotation-x={Math.PI / 2}><torusGeometry args={[3.31, 0.06, 8, 48]} /><meshStandardMaterial color="#3d78b8" roughness={0.5} /></mesh>
    </group>)}
    <mesh geometry={DEFLECTOR()} castShadow receiveShadow><meshStandardMaterial color="#3b3a39" roughness={0.55} metalness={0.6} /></mesh>
    {/* 喷管前面一片熏黑的场坪 */}
    <mesh rotation-x={-Math.PI / 2} position={[2.2, 0.256, 0]}><planeGeometry args={[4.2, 3.4]} /><meshStandardMaterial color="#1e1d1c" roughness={0.9} transparent opacity={0.55} polygonOffset polygonOffsetFactor={-2} /></mesh>
    <mesh position={[-13, 2.1, 7.25]}><planeGeometry args={[3.4, 1.3]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
    {[-14.5, -11.5].map(x => <mesh key={x} position={[x, 0.9, 7.2]}><boxGeometry args={[0.08, 1.8, 0.08]} /><meshStandardMaterial color="#59626a" roughness={0.5} metalness={0.6} /></mesh>)}
    <Engine />
    <ThrustFrame />
  </group>
}

const PUFFS = 46
/** 点火时的火焰：喷管里喷出来的一条焰柱（里面白热、外面橙红，带一串马赫环），在导流板上拐向天空，翻成一团团水汽。power 是 0–1 的强度 */
export function Plume({ power }: { power: RefObject<number> }) {
  const root = useRef<THREE.Group>(null), core = useRef<THREE.Mesh>(null), mid = useRef<THREE.Mesh>(null), outer = useRef<THREE.Mesh>(null), glow = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null), rings = useRef<THREE.Group>(null), puffs = useRef<THREE.InstancedMesh>(null)
  const seeds = useMemo(() => Array.from({ length: PUFFS }, (_, i) => ({ o: i / PUFFS, z: Math.sin(i * 12.9898) * 2.2, w: 0.7 + (Math.sin(i * 78.233) * 0.5 + 0.5) * 0.7, dx: Math.sin(i * 3.7) })), [])
  // 一截焰柱：越往后越淡（顶点颜色的透明度从 1 降到 0）
  const cone = (r0: number, r1: number, len: number) => {
    const g = new THREE.CylinderGeometry(r1, r0, len, 28, 10, true); g.rotateZ(-Math.PI / 2); g.translate(len / 2, 0, 0)
    const p = g.attributes.position, c = new Float32Array(p.count * 4)
    for (let i = 0; i < p.count; i++) { const k = Math.min(1, Math.max(0, p.getX(i) / len)); c.set([1, 1, 1, Math.pow(1 - k, 1.4)], i * 4) }
    g.setAttribute('color', new THREE.BufferAttribute(c, 4))
    return g
  }
  const geo = useMemo(() => ({ core: cone(0.5, 0.12, 4.6), mid: cone(0.78, 0.6, 6.6), outer: cone(0.86, 1.3, 7.6), puff: new THREE.SphereGeometry(1, 14, 10) }), [])   // eslint-disable-line react-hooks/exhaustive-deps
  const m = useMemo(() => new THREE.Object3D(), [])
  const clock = useRef(0)
  useFrame((_, d) => {
    const k = power.current ?? 0, t = (clock.current += Math.min(d, 1 / 30))
    if (root.current) root.current.visible = k > 0.004
    const f = 1 + Math.sin(t * 47) * 0.03 + Math.sin(t * 31.7) * 0.025
    core.current?.scale.set(k * f, 0.6 + 0.4 * k, 0.6 + 0.4 * k); mid.current?.scale.set(k * (2 - f), 0.7 + 0.3 * k, 0.7 + 0.3 * k); outer.current?.scale.set(k, f, f)
    if (light.current) light.current.intensity = k * 110 * f
    if (glow.current) (glow.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, k * 1.4)
    rings.current?.children.forEach((c, i) => { const s = k * (1 + Math.sin(t * 40 + i * 1.7) * 0.12); c.scale.set(s * 1.8, s, s) })
    const P = puffs.current
    if (P) {
      seeds.forEach((s, i) => {
        const life = (t * 0.22 * s.w + s.o) % 1, y = 3.5 + life * 13, r = (1.1 + life * 3.6) * Math.min(1, life * 8) * (1 - Math.max(0, life - 0.75) * 4) * k
        m.position.set(8 + life * 5 + s.dx * life * 3, y, s.z * (0.6 + life * 1.6)); m.scale.setScalar(Math.max(0.001, r)); m.updateMatrix(); P.setMatrixAt(i, m.matrix)
      })
      P.instanceMatrix.needsUpdate = true
    }
  })
  const add = (color: string, opacity: number, glow = false, fade = true) => <meshBasicMaterial color={color} vertexColors={fade} transparent opacity={opacity} blending={glow ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
  return <group ref={root} position={[0, AX, 0]} visible={false}>
    <mesh ref={outer} geometry={geo.outer}>{add('#ff5a1a', 0.12, true)}</mesh>
    <mesh ref={mid} geometry={geo.mid} renderOrder={4}>{add('#ff7417', 0.75)}</mesh>
    <mesh ref={core} geometry={geo.core} renderOrder={5}>{add('#ffd070', 0.95)}</mesh>
    <group ref={rings}>{[0.9, 1.8, 2.7, 3.6, 4.4].map((x, i) => <mesh key={x} position-x={x} scale={0} renderOrder={6}><sphereGeometry args={[0.22 - i * 0.025, 16, 12]} />{add('#fff4d6', 0.8 - i * 0.1, false, false)}</mesh>)}</group>
    <mesh ref={glow} position-x={-0.25} rotation-y={Math.PI / 2}><circleGeometry args={[0.8, 32]} /><meshBasicMaterial color="#fff0c4" transparent opacity={0} toneMapped={false} /></mesh>
    <pointLight ref={light} position={[3, 0.6, 2.5]} color="#ffb061" intensity={0} distance={70} decay={1.6} />
    <instancedMesh ref={puffs} args={[geo.puff, undefined, PUFFS]} position={[0, -AX, 0]} frustumCulled={false}><meshStandardMaterial color="#d6dade" roughness={1} transparent opacity={0.6} depthWrite={false} /></instancedMesh>
  </group>
}
