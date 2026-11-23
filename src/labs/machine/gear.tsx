// 实验台上的器材：弹簧测力计、钩码和钩码盒、杠杆尺和它的支架、滑轮（单只、滑轮组的夹板）、会动的细绳、挂滑轮的铁架、直尺。
// 尺寸在代码里按厘米写，乘 U 变成画面单位；每件器材的原点写在它的说明里。
import { useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, bolts, disc, lathe, type RY } from '@/lab-kit'
import { makeWood } from './mats'
import { RULER, TILT_MAX } from './physics'
import { U } from './world'

const cm = (p: RY[]): RY[] => p.map(([r, y]) => [r * U, y * U])
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
const paint = (color: string, rough = 0.4) => <meshPhysicalMaterial color={color} roughness={rough} clearcoat={0.55} clearcoatRoughness={0.25} />
const rubber = <meshStandardMaterial color="#1b1d20" roughness={0.9} />
const iron = <meshPhysicalMaterial color="#2a2f35" roughness={0.5} metalness={0.35} clearcoat={0.45} clearcoatRoughness={0.45} />
function tube(pts: [number, number, number][], r: number, segs = 32) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0] * U, p[1] * U, p[2] * U))), segs, r * U, 8) }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}

// ---------- 弹簧测力计 ----------
/** 量程 5 N、分度值 0.1 N；每 1 N 弹簧伸长多少厘米 */
export const SCALE = { max: 5, step: 0.1, cmPerN: 2.4 }
const SC = { w: 3.8, len: 20, d: 1.5, zero: 4, rod: 16, hook: 2.2, ring: 2.3 }
/** 拉力 F 时从挂钩尖到提环顶有多长（画面单位）：手套就握在那里 */
export const scaleSpan = (F: number) => (SC.hook + SC.rod + SC.zero + SC.len - SC.zero + SC.ring + Math.max(0, F) * SCALE.cmPerN) * U
const plateTex = once(() => canvasTex(200, 1000, g => {
  const per = 50, n = Math.round(SCALE.max / SCALE.step)      // 每厘米 50 像素，刻度板 20 cm 长
  g.fillStyle = '#f1ecdd'; g.fillRect(0, 0, 200, 1000); g.fillStyle = '#1b2026'
  for (let i = 0; i <= n; i++) {
    const y = (SC.zero - 0.5 + i * SCALE.step * SCALE.cmPerN) * per, big = i % 10 === 0, mid = i % 5 === 0, len = big ? 46 : mid ? 34 : 22, h = big ? 5 : 3
    g.fillRect(0, y - h / 2, len, h); g.fillRect(200 - len, y - h / 2, len, h)
    if (big) { g.font = '700 46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(Math.round(i * SCALE.step)), 100, y + 2) }
  }
  g.font = '700 40px sans-serif'; g.textAlign = 'center'; g.fillText('N', 100, 90)
}))
function makeHelix(coils: number, R: number, w: number, seg = 14, rad = 6) {
  const n = coils * seg + 1, pos = new Float32Array(n * rad * 3), nor = new Float32Array(n * rad * 3), idx: number[] = []
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < rad; j++) { const a = i * rad + j, b = i * rad + (j + 1) % rad; idx.push(a, a + rad, b, b, a + rad, b + rad) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx)
  const set = (len: number) => {
    const k = coils * Math.PI * 2
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), a = t * k, ca = Math.cos(a), sa = Math.sin(a)
      let tx = -R * sa * k, ty = -len, tz = R * ca * k; const l = Math.hypot(tx, ty, tz); tx /= l; ty /= l; tz /= l
      const bx = ty * sa, by = tz * ca - tx * sa, bz = -ty * ca
      for (let j = 0; j < rad; j++) {
        const th = j / rad * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), nx = c * ca + s * bx, ny = s * by, nz = c * sa + s * bz, o = (i * rad + j) * 3
        pos[o] = R * ca + w * nx; pos[o + 1] = -len * t + w * ny; pos[o + 2] = R * sa + w * nz; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz
      }
    }
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.computeBoundingSphere()
  }
  set(1)
  return { g, set }
}
const SHOOK = once(() => tube([[0, SC.hook, 0], [0, 1.4, 0], [0.55, 0.7, 0], [0.1, -0.05, 0], [-0.55, 0.35, 0], [-0.6, 0.95, 0]], 0.12, 28))
/**
 * 弹簧测力计：外壳、提环、刻度板、透明前盖，里面看得见弹簧、指针和拉杆。原点在挂钩的钩尖，外壳朝 +y。
 * force：每帧读的拉力（N）。弹簧的伸长、指针相对刻度板的位置都按拉力算，跟上去时带一点阻尼，轻轻晃一下才停住。
 * 挂钩、拉杆、指针固定在原点上；外壳和提环被手往外拉，离挂钩越来越远。
 */
export function SpringScale({ force }: { force: RefObject<number> }) {
  const body = useRef<THREE.Group>(null), s = useRef({ x: force.current ?? 0, v: 0 })
  const helix = useMemo(() => makeHelix(22, 0.5 * U, 0.07 * U), [])
  const place = () => { const x = Math.max(0, s.current.x); helix.set((3 + x * SCALE.cmPerN) * U); if (body.current) body.current.position.y = (SC.hook + SC.rod + SC.zero + x * SCALE.cmPerN) * U }
  useLayoutEffect(place, [])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    const q = s.current, to = Math.max(0, force.current ?? 0)
    for (let i = 0; i < 2; i++) { const dt = Math.min(d, 1 / 30) / 2; q.v += (-(q.x - to) * 260 - q.v * 18) * dt; q.x += q.v * dt }
    place()
  })
  const blue = paint('#2d5d8c', 0.38), w = SC.w * U, len = SC.len * U, dp = SC.d * U, top = 0
  return <group>
    {/* 跟着挂钩的：指针、拉杆、挂钩 */}
    <mesh geometry={SHOOK()} castShadow><Metal kind="stainless" rough={0.25} /></mesh>
    <mesh position={[0, (SC.hook + SC.rod / 2) * U, 0.1 * U]}><cylinderGeometry args={[0.13 * U, 0.13 * U, SC.rod * U, 10]} /><Metal kind="stainless" rough={0.25} /></mesh>
    <group position={[0, (SC.hook + SC.rod) * U, 0]}>
      <mesh position={[0, 0.25 * U, 0.1 * U]}><boxGeometry args={[1.2 * U, 0.5 * U, 0.5 * U]} /><Metal kind="stainless" grain="brushed" /></mesh>
      <mesh position={[0, 0, -dp / 2 + 0.42 * U]}><boxGeometry args={[3.3 * U, 0.22 * U, 0.1 * U]} /><meshBasicMaterial color="#d2362f" toneMapped={false} /></mesh>
    </group>
    {/* 外壳（被手拉着的那一部分）：原点在零刻线处 */}
    <group ref={body}>
      <group position={[0, SC.zero * U, 0]}>
        <mesh position={[0, 0.3 * U + top, 0]}><cylinderGeometry args={[0.22 * U, 0.22 * U, 0.7 * U, 12]} /><Metal kind="chrome" rough={0.15} /></mesh>
        <mesh position={[0, 1.45 * U, 0]} castShadow><torusGeometry args={[0.85 * U, 0.14 * U, 10, 32]} /><Metal kind="chrome" rough={0.15} /></mesh>
        <RoundedBox args={[w, len, 0.34 * U]} radius={0.008} smoothness={2} position={[0, -len / 2, -dp / 2 + 0.17 * U]} castShadow>{paint('#b9b5a8', 0.6)}</RoundedBox>
        {[-1, 1].map(k => <RoundedBox key={k} args={[0.4 * U, len, dp]} radius={0.008} smoothness={2} position={[k * (w / 2 - 0.2 * U), -len / 2, 0]} castShadow>{blue}</RoundedBox>)}
        {[-0.5, -SC.len + 0.5].map(y => <group key={y} position={[0, y * U, 0]}>
          <RoundedBox args={[w, 1 * U, dp]} radius={0.01} smoothness={2} castShadow>{blue}</RoundedBox>
          {[-1.2, 1.2].map(x => <mesh key={x} position={[x * U, 0, dp / 2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2 * U, 0.2 * U, 0.1 * U, 10]} /><Metal kind="stainless" /></mesh>)}
        </group>)}
        <mesh position={[0, -len / 2, -dp / 2 + 0.35 * U]}><planeGeometry args={[3.2 * U, 20 * U]} /><meshStandardMaterial map={plateTex()} color="#d2cdc0" roughness={0.8} /></mesh>
        <mesh geometry={helix.g} position={[0, -1 * U, 0.1 * U]} frustumCulled={false} castShadow><meshStandardMaterial color="#b9bec4" metalness={0.9} roughness={0.28} side={THREE.DoubleSide} envMapIntensity={1.6} /></mesh>
        <mesh position={[0, -len / 2, dp / 2 - 0.05 * U]} renderOrder={3}><boxGeometry args={[3.2 * U, 19 * U, 0.08 * U]} /><meshPhysicalMaterial color="#dfeef5" transparent opacity={0.1} roughness={0.03} clearcoat={1} depthWrite={false} envMapIntensity={1.4} /></mesh>
      </group>
    </group>
  </group>
}
/** 测力计的外壳顶（提环处）离挂钩尖多远：手套握在这里（画面单位） */
export const ringAt = (F: number) => (SC.hook + SC.rod + SC.zero + Math.max(0, F) * SCALE.cmPerN + 1.45) * U

// ---------- 钩码 ----------
const HOOKW = once(() => ({
  body: lathe(cm([[0, 0], [0.9, 0], [1.05, 0.15], [1.05, 1.25], [0.98, 1.32], [0.98, 1.44], [1.05, 1.5], [1.05, 2.65], [0.9, 2.8], [0.3, 2.8], [0.3, 2.95], [0, 2.95]]), { segs: 36 }),
  hook: tube([[0, 0.15, 0], [0.42, -0.15, 0], [0.48, -0.6, 0], [0.18, -0.9, 0], [0, -1.25, 0]], 0.12, 16),
}))
/** 一只钩码的挂点到下一只的挂点多远（画面单位） */
export const HOOK_PITCH = 4.4 * U
/** 一串钩码：n 只，一只挂一只。黄铜车出来的圆柱，上面一只钩，下面一只环。原点在最上面那只的挂点（钩子弯进去的地方） */
export function Hooks({ n }: { n: number }) {
  const H = HOOKW()
  return <>{Array.from({ length: n }, (_, i) => <group key={i} position={[0, -i * HOOK_PITCH, 0]}>
    <mesh geometry={H.hook}><Metal kind="steel" rough={0.3} /></mesh>
    <mesh position={[0, -1.35 * U, 0]}><cylinderGeometry args={[0.13 * U, 0.13 * U, 0.3 * U, 8]} /><Metal kind="steel" rough={0.3} /></mesh>
    <mesh geometry={H.body} position={[0, -1.45 * U, 0]} rotation-x={Math.PI} castShadow><Metal kind="brass" grain="turned" repeat={[1, 2]} /></mesh>
    <mesh position={[0, -4.25 * U, 0]} rotation-y={Math.PI / 2}><torusGeometry args={[0.3 * U, 0.1 * U, 8, 18]} /><Metal kind="steel" rough={0.3} /></mesh>
  </group>)}</>
}
/** 一串 n 只钩码有多长（画面单位） */
export const chainLen = (n: number) => (n - 1) * HOOK_PITCH + 4.4 * U

const woodTex = once(() => makeWood('#9b6a3c', '70,40,18', 3, 1))
/** 钩码盒：木盒子，里面一块绒垫，钩码一排排立着；盒盖掀开靠在后面。原点在盒底中心 */
export function HookBox({ n = 10 }: { n?: number }) {
  const wood = useMemo(() => new THREE.MeshPhysicalMaterial({ map: woodTex(), roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.3 }), [])
  const H = HOOKW()
  return <group>
    <RoundedBox args={[16 * U, 1 * U, 9 * U]} radius={0.01} smoothness={2} position={[0, 0.5 * U, 0]} castShadow receiveShadow material={wood} />
    {[-1, 1].map(s => <RoundedBox key={s} args={[16 * U, 3 * U, 0.8 * U]} radius={0.01} smoothness={2} position={[0, 1.5 * U, s * 4.1 * U]} castShadow material={wood} />)}
    {[-1, 1].map(s => <RoundedBox key={s} args={[0.8 * U, 3 * U, 8 * U]} radius={0.01} smoothness={2} position={[s * 7.6 * U, 1.5 * U, 0]} castShadow material={wood} />)}
    <mesh position={[0, 1.3 * U, 0]}><boxGeometry args={[14.6 * U, 0.6 * U, 7.6 * U]} /><meshStandardMaterial color="#1d4633" roughness={1} /></mesh>
    <group position={[0, 2.2 * U, -4.4 * U]} rotation-x={-1.9}><RoundedBox args={[16 * U, 0.8 * U, 9 * U]} radius={0.01} smoothness={2} position={[0, 0.4 * U, 4.5 * U]} castShadow material={wood} /></group>
    {Array.from({ length: n }, (_, i) => <group key={i} position={[(-5.6 + (i % 5) * 2.8) * U, 1.6 * U, (i < 5 ? -1.6 : 1.6) * U]}>
      <mesh geometry={H.body} position={[0, 0, 0]} castShadow><Metal kind="brass" grain="turned" repeat={[1, 2]} /></mesh>
      <mesh geometry={H.hook} position={[0, 4.3 * U, 0]}><Metal kind="steel" rough={0.3} /></mesh>
    </group>)}
  </group>
}

// ---------- 杠杆尺和支架 ----------
/** 杠杆尺的格距（画面单位）、转轴离支架底面多高（cm） */
export const GRID = RULER.grid * 100 * U, PIVOT_CM = 45
const RL = 33, RH = 3.2, RT = 0.5           // 尺身半长、高、厚（cm）
const rulerGeo = once(() => {
  const s = new THREE.Shape(), x = RL, y = RH / 2, r = 0.5
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y); s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y)
  for (let i = -RULER.n; i <= RULER.n; i++) { const h = new THREE.Path(); h.absarc(i * 5, 0.35, i === 0 ? 0.42 : 0.3, 0, Math.PI * 2, true); s.holes.push(h) }
  const g = new THREE.ExtrudeGeometry(s, { depth: RT, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2, curveSegments: 14 })
  g.translate(0, 0, -RT / 2); g.scale(U, U, U)
  return g
})
/** 尺面上印的刻度和格数：两边各 6 格，正中一个 0；挂钩码的孔留空 */
const rulerTex = once(() => canvasTex(2112, 128, g => {
  const per = 32                                   // 每厘米 32 像素
  g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, 2112, 128)
  g.fillStyle = '#1b2026'
  for (let c = -RL + 1; c <= RL - 1; c++) { const x = (c + RL) * per, big = c % 5 === 0; g.fillRect(x - 1, 0, 2, big ? 26 : 14) }
  g.font = '800 46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  const hy = (RH / 2 - 0.35) * 128 / RH
  for (let i = -RULER.n; i <= RULER.n; i++) { const x = (i * 5 + RL) * per; g.fillStyle = i === 0 ? '#b5372b' : '#1b2026'; g.fillText(String(Math.abs(i)), x, 104); g.fillStyle = '#3a4046'; g.beginPath(); g.arc(x, hy, (i === 0 ? 0.42 : 0.3) * per * 1.55, 0, 7); g.fill() }
  g.globalCompositeOperation = 'destination-out'
  for (let i = -RULER.n; i <= RULER.n; i++) { g.beginPath(); g.arc((i * 5 + RL) * per, hy, (i === 0 ? 0.42 : 0.3) * per * 1.05, 0, 7); g.fill() }
}))
const NUT = once(() => lathe(cm([[0.32, -0.6], [0.8, -0.6], [0.9, -0.5], [0.9, 0.5], [0.8, 0.6], [0.32, 0.6]]), { segs: 18, closed: true }))
/** 杠杆尺此刻的倾角（弧度，左端下沉为正）：杠杆每帧写，挂在上面的东西每帧读 */
export interface LeverLive { th: number }
/** 第 i 格的孔（side −1 左、1 右）在杠杆倾斜 th 时，相对它水平时的位置挪了多少（画面单位） */
export function holeShift(side: -1 | 1, i: number, th: number): [number, number, number] {
  const x = side * i * GRID
  return [x * Math.cos(th) - x, x * Math.sin(th), 0]
}
/**
 * 杠杆尺和支架。原点在支架底面中心，转轴在原点正上方 PIVOT_CM 处。
 * tilt：要歪到多少度（左端下沉为正，由课里从计算核心取来）；nut：平衡螺母的位置（0 是出厂时的位置，正数往右拧）。
 * 杠杆转到新的位置时按时间算阻尼摆动，碰到限位就停住；此刻的倾角写进 live。
 */
export function Lever({ tilt, nut = 0, live, children }: { tilt: number; nut?: number; live: RefObject<LeverLive>; children?: ReactNode }) {
  const beam = useRef<THREE.Group>(null), st = useRef({ th: tilt * Math.PI / 180, w: 0 })
  const goal = tilt * Math.PI / 180, lim = (TILT_MAX + 0.5) * Math.PI / 180
  useFrame((_, d) => {
    const s = st.current, dt = Math.min(d, 1 / 30), W0 = 3.6
    for (let i = 0; i < 2; i++) { const h = dt / 2; s.w += (-W0 * W0 * (s.th - goal) - 2 * 0.22 * W0 * s.w) * h; s.th += s.w * h }
    if (Math.abs(s.th) > lim) { s.th = Math.sign(s.th) * lim; s.w *= -0.25 }
    if (beam.current) beam.current.rotation.z = s.th
    if (live.current) live.current.th = s.th
  })
  const py = PIVOT_CM * U, chrome = <Metal kind="chrome" rough={0.14} />
  const G = useMemo(() => ({ boss: disc(1.6 * U, 1.2 * U, { chamfer: 0.2 * U }), bolt: bolts(4, 1.15 * U, 0.34 * U), hub: disc(1.1 * U, 0.4 * U, { chamfer: 0.1 * U }) }), [])
  return <group>
    {/* 底座：一块铸铁，四只橡胶脚 */}
    {[-1, 1].flatMap(a => [-1, 1].map(b => <mesh key={`${a}${b}`} position={[a * 12 * U, 0.15 * U, b * 5.5 * U]}><cylinderGeometry args={[0.8 * U, 0.9 * U, 0.3 * U, 14]} />{rubber}</mesh>))}
    <RoundedBox args={[28 * U, 2.2 * U, 14 * U]} radius={0.02} smoothness={3} position={[0, 1.4 * U, 0]} castShadow receiveShadow>{iron}</RoundedBox>
    <mesh geometry={G.boss} position={[0, 2.5 * U, 0]}><Metal kind="iron" grain="cast" /></mesh>
    <mesh geometry={G.bolt} position={[0, 3.7 * U, 0]}><Metal kind="steel" /></mesh>
    {/* 立杆和顶上的叉形支座、两块限位 */}
    <mesh position={[0, (3.7 + (PIVOT_CM - 3.7 - 3) / 2) * U, 0]} castShadow><cylinderGeometry args={[0.7 * U, 0.7 * U, (PIVOT_CM - 3.7 - 3) * U, 20]} />{chrome}</mesh>
    <RoundedBox args={[3 * U, 2.4 * U, 3 * U]} radius={0.01} smoothness={2} position={[0, py - 3.2 * U, 0]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    {[-1, 1].map(k => <RoundedBox key={k} args={[2.2 * U, 4.6 * U, 0.4 * U]} radius={0.006} smoothness={2} position={[0, py - 0.9 * U, k * 0.75 * U]} castShadow><Metal kind="steel" grain="brushed" /></RoundedBox>)}
    {[-1, 1].map(k => <RoundedBox key={k} args={[1.2 * U, 0.8 * U, 1.6 * U]} radius={0.004} smoothness={2} position={[k * 3.6 * U, py - 3.0 * U, 0]}>{rubber}</RoundedBox>)}
    <mesh position={[0, py, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.38 * U, 0.38 * U, 2.6 * U, 12]} /><Metal kind="steel" /></mesh>
    {/* 会转的：尺身、尺面、转轴上的铜套、两端的螺杆和平衡螺母 */}
    <group ref={beam} position={[0, py, 0]}>
      <group position={[0, -0.35 * U, 0]}>
        <mesh geometry={rulerGeo()} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" rough={0.45} /></mesh>
        <mesh position={[0, 0, RT / 2 * U + 0.1 * U]}><planeGeometry args={[RL * 2 * U, RH * U]} /><meshStandardMaterial map={rulerTex()} color="#bcb9ae" roughness={0.7} transparent alphaTest={0.5} /></mesh>
      </group>
      <mesh geometry={G.hub} position={[0, 0, RT / 2 * U + 0.1 * U]} rotation-x={Math.PI / 2}><Metal kind="brass" grain="turned" /></mesh>
      {[-1, 1].map(s => <group key={s}>
        <mesh position={[s * (RL + 3) * U, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.3 * U, 0.3 * U, 6.2 * U, 10]} /><Metal kind="steel" grain="turned" repeat={[1, 14]} /></mesh>
        <mesh geometry={NUT()} position={[(s * (RL + 2.6) + nut * 1.8) * U, 0, 0]} rotation-z={Math.PI / 2} castShadow><Metal kind="brass" grain="turned" /></mesh>
      </group>)}
      {children}
    </group>
  </group>
}

// ---------- 滑轮 ----------
/** 滑轮的半径（cm）：绳子在槽底走 */
export const SHEAVE_R = 3
const sheaveGeo = once(() => { const r = SHEAVE_R; const g = lathe(cm([[0.5, -0.6], [r + 0.55, -0.6], [r + 0.6, -0.5], [r + 0.5, -0.38], [r, -0.12], [r, 0.12], [r + 0.5, 0.38], [r + 0.6, 0.5], [r + 0.55, 0.6], [0.5, 0.6]]), { segs: 48, closed: true }); g.rotateX(Math.PI / 2); return g })
const LOADHOOK = once(() => tube([[0, 0.9, 0], [0, 0.2, 0], [0.5, -0.4, 0], [0.1, -1.0, 0], [-0.45, -0.7, 0]], 0.16, 20))
/** 一只滑轮：带槽的轮子、轮毂上一圈小孔的记号（转起来看得出来）。原点在轮心，轮轴朝 z */
export function Sheave({ spin, light = false }: { spin?: (g: THREE.Group | null) => void; light?: boolean }) {
  return <group ref={spin}>
    <mesh geometry={sheaveGeo()} castShadow>{light ? <meshPhysicalMaterial color="#d8dee4" roughness={0.35} clearcoat={0.5} /> : <Metal kind="steel" grain="turned" rough={0.35} />}</mesh>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.cos(i * 1.2566) * 1.6 * U, Math.sin(i * 1.2566) * 1.6 * U, 0.62 * U]}><circleGeometry args={[0.36 * U, 12]} /><meshStandardMaterial color="#2a2f35" roughness={0.8} /></mesh>)}
  </group>
}
/**
 * 滑轮的夹板：前后两块圆角钢板，把 wheels 处的轮子夹在中间，每只轮子一根轴、一颗螺母。原点在夹板的“挂点”中心（定滑轮是顶上的吊环，动滑轮是下面的挂钩）。
 * wheels：各只轮子的圆心（cm，相对原点）；top：吊环在上（定滑轮）还是挂钩在下（动滑轮）；eyes：额外的拴绳小环（cm）。
 */
export function Block({ wheels, top, eyes = [], spins, light = false }: { wheels: [number, number][]; top: boolean; eyes?: [number, number][]; spins: (i: number) => (g: THREE.Group | null) => void; light?: boolean }) {
  // 夹板只包住轮子和挂点：圆角的一条，轮子露出大半；拴绳的小环另用一根扁钢伸出去
  // 夹板是一条连着各只轮轴的扁钢，中间一根吊杆通到吊环（或挂钩）：轮子大半露在外面，看得清绳子怎样绕
  const xs = wheels.map(w => w[0]), wy = wheels[0][1]
  const x0 = Math.min(...xs) - 1.4, x1 = Math.max(...xs) + 1.4, y0 = wy - 1.2, y1 = wy + 1.2
  const hx = (Math.min(...xs) + Math.max(...xs)) / 2
  const plate = useMemo(() => {
    const s = new THREE.Shape(), r = 1.2
    s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1); s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 12 }); g.scale(U, U, U)
    return g
  }, [x0, x1, y0, y1])
  const steel = light ? <meshPhysicalMaterial color="#3f6f9a" roughness={0.38} metalness={0.25} clearcoat={0.6} clearcoatRoughness={0.25} /> : <Metal kind="steel" grain="brushed" rough={0.36} />
  return <group>
    {/* 前后两块夹板：前面那块在轮子前面，后面那块在轮子后面，中间夹着轮子 */}
    {[-1, 1].map(k => <mesh key={k} geometry={plate} position={[0, 0, (k > 0 ? 0.72 : -0.94) * U]} castShadow>{steel}</mesh>)}
    {[-1, 1].map(k => <RoundedBox key={k} args={[Math.max(1.3, Math.abs(hx) * 2 + 1.3) * U, Math.abs(wy) * U, 0.3 * U]} radius={0.003} smoothness={2} position={[hx / 2 * U, wy / 2 * U, k * 0.83 * U]} castShadow>{steel}</RoundedBox>)}
    {wheels.map(([wx, wy2], i) => <group key={i} position={[wx * U, wy2 * U, 0]}>
      <Sheave spin={spins(i)} light={light} />
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.35 * U, 0.35 * U, 2.4 * U, 10]} /><Metal kind="steel" /></mesh>
      {[-1, 1].map(k => <mesh key={k} position={[0, 0, k * 1.15 * U]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.55 * U, 0.55 * U, 0.3 * U, 6]} /><Metal kind="zinc" /></mesh>)}
    </group>)}
    {eyes.map(([ex, ey], i) => { const from = ex < x0 ? x0 + 0.5 : x1 - 0.5, len = Math.abs(ex - from); return <group key={i}>
      <RoundedBox args={[len * U, 1.0 * U, 0.4 * U]} radius={0.003} smoothness={2} position={[(ex + from) / 2 * U, ey * U, 0.82 * U]} castShadow>{steel}</RoundedBox>
      <mesh position={[ex * U, ey * U, 0.82 * U]} rotation-y={Math.PI / 2}><torusGeometry args={[0.5 * U, 0.13 * U, 8, 18]} /><Metal kind="steel" /></mesh>
    </group> })}
    {top
      ? <mesh rotation-y={Math.PI / 2}><torusGeometry args={[0.8 * U, 0.16 * U, 8, 22]} /><Metal kind="steel" rough={0.3} /></mesh>
      : <mesh geometry={LOADHOOK()}><Metal kind="steel" rough={0.3} /></mesh>}
  </group>
}

// ---------- 会动的细绳 ----------
/** 一根沿折线走的细绳：get 每帧给出一串点（画面单位，在 z = 0 的平面里），粗细 r。点数不超过 max */
export function RopeLine({ get, r = 0.24 * U, max = 200, color = '#e2703a' }: { get: () => [number, number][]; r?: number; max?: number; color?: string }) {
  const RAD = 6
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(max * RAD * 3), nor = new Float32Array(max * RAD * 3), idx: number[] = []
    for (let i = 0; i < max - 1; i++) for (let j = 0; j < RAD; j++) { const a = i * RAD + j, b = i * RAD + (j + 1) % RAD; idx.push(a, a + RAD, b, b, a + RAD, b + RAD) }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx)
    return g
  }, [max])
  useFrame(() => {
    const pts = get(), n = Math.min(max, pts.length), pos = geo.attributes.position.array as Float32Array, nor = geo.attributes.normal.array as Float32Array
    for (let i = 0; i < max; i++) {
      const k = Math.min(i, n - 1), a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)]
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l
      const nx = -ty, ny = tx
      for (let j = 0; j < RAD; j++) { const th = j / RAD * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), o = (i * RAD + j) * 3; pos[o] = pts[k][0] + nx * c * r; pos[o + 1] = pts[k][1] + ny * c * r; pos[o + 2] = s * r; nor[o] = nx * c; nor[o + 1] = ny * c; nor[o + 2] = s }
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.computeBoundingSphere()
  })
  return <mesh geometry={geo} frustumCulled={false} castShadow><meshStandardMaterial color={color} roughness={0.9} /></mesh>
}

// ---------- 挂滑轮的铁架、直尺 ----------
const FOOT = once(() => disc(1.8 * U, 1.2 * U, { chamfer: 0.2 * U }))
/**
 * 铁架：铸铁底座、两根镀铬立杆，顶上一根方钢横梁（挂滑轮的地方）。原点在底座底面中心。w：两根立杆之间多宽，h：横梁底面多高（cm）
 */
export function Frame({ w, h, children }: { w: number; h: number; children?: ReactNode }) {
  const chrome = <Metal kind="chrome" rough={0.14} />
  return <group>
    {[-1, 1].flatMap(a => [-1, 1].map(b => <mesh key={`${a}${b}`} position={[a * (w / 2 + 4) * U, 0.15 * U, b * 6.5 * U]}><cylinderGeometry args={[0.8 * U, 0.9 * U, 0.3 * U, 14]} />{rubber}</mesh>))}
    <RoundedBox args={[(w + 12) * U, 2.2 * U, 16 * U]} radius={0.02} smoothness={3} position={[0, 1.4 * U, 0]} castShadow receiveShadow>{iron}</RoundedBox>
    {[-1, 1].map(k => <group key={k} position={[k * w / 2 * U, 0, -4 * U]}>
      <mesh geometry={FOOT()} position={[0, 2.5 * U, 0]}><Metal kind="iron" grain="cast" /></mesh>
      <mesh position={[0, (2.5 + (h + 1.5) / 2) * U, 0]} castShadow><cylinderGeometry args={[0.8 * U, 0.8 * U, (h + 1.5) * U, 20]} />{chrome}</mesh>
      <RoundedBox args={[3.2 * U, 3.2 * U, 3.2 * U]} radius={0.012} smoothness={2} position={[0, (h + 1.2) * U, 0]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <mesh position={[0, (h + 1.2) * U, 1.9 * U]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.5 * U, 0.6 * U, 0.8 * U, 12]} /><Metal kind="steel" grain="turned" /></mesh>
    </group>)}
    <RoundedBox args={[(w + 4) * U, 2 * U, 2 * U]} radius={0.01} smoothness={2} position={[0, (h + 1) * U, -4 * U]} castShadow><Metal kind="steel" grain="brushed" rough={0.42} /></RoundedBox>
    {/* 横梁上伸到前面来的一条吊板：滑轮就挂在它上面，和绳子在同一个平面里 */}
    <RoundedBox args={[(w - 2) * U, 0.6 * U, 4.6 * U]} radius={0.004} smoothness={2} position={[0, (h + 0.3) * U, -1.7 * U]} castShadow><Metal kind="steel" grain="brushed" rough={0.42} /></RoundedBox>
    {children}
  </group>
}
/** 吊板下面的一只小吊钩：滑轮或绳头挂在这里。原点在钩尖（cm 为单位放在 Frame 的坐标里） */
export function Eye() {
  return <group>
    <mesh position={[0, 0.9 * U, 0]}><cylinderGeometry args={[0.2 * U, 0.2 * U, 1.4 * U, 8]} /><Metal kind="steel" /></mesh>
    <mesh rotation-y={Math.PI / 2}><torusGeometry args={[0.45 * U, 0.12 * U, 8, 18]} /><Metal kind="steel" rough={0.3} /></mesh>
  </group>
}
const meterTex = once(() => canvasTex(96, 1200, g => {
  const per = 12                                   // 每厘米 12 像素，尺长 100 cm
  g.fillStyle = '#e6c766'; g.fillRect(0, 0, 96, 1200); g.fillStyle = '#1b2026'
  for (let c = 0; c <= 100; c++) { const y = 1200 - c * per, big = c % 10 === 0, mid = c % 5 === 0; g.fillRect(0, y - (big ? 1.5 : 0.8), big ? 40 : mid ? 28 : 16, big ? 3 : 1.6); if (big && c > 0 && c < 100) { g.font = '700 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(c), 68, y) } }
}))
/** 竖着立的米尺：一块木座，尺面从 0 到 100 cm。原点在座底，尺面朝 +z，读数从座面往上算 */
export function MeterStick({ len = 100 }: { len?: number }) {
  return <group>
    <RoundedBox args={[6 * U, 1.6 * U, 5 * U]} radius={0.01} smoothness={2} position={[0, 0.8 * U, 0]} castShadow receiveShadow>{iron}</RoundedBox>
    <RoundedBox args={[3 * U, len * U, 0.5 * U]} radius={0.004} smoothness={2} position={[0, (1.6 + len / 2) * U, 0]} castShadow><meshStandardMaterial color="#e2c463" roughness={0.6} /></RoundedBox>
    <mesh position={[0, (1.6 + len / 2) * U, 0.26 * U]}><planeGeometry args={[2.8 * U, len * U]} /><meshStandardMaterial map={meterTex()} roughness={0.6} /></mesh>
  </group>
}
/** 米尺座面的高度（画面单位）：读数 = (位置 − 座面) ÷ U */
export const STICK_BASE = 1.6 * U
