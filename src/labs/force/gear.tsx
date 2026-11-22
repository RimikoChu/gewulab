// 力和运动实验室里反复用到的器材：弹簧测力计、钩码、铁架台和重垂线、小车、斜面和木板、带滑轮的立柱、带挂钩的木块、砝码、卷线器，
// 以及冰场上的冰壶、推杆、冰刷、雪橇、木箱、挡板。尺寸在代码里按厘米写，乘 U 变成画面单位；每件器材的原点都在它“坐着”的那个面上。
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { ForceArrow, LabStage, Metal, Rod, bolts, disc, lathe, type Label, type RY } from '@/lab-kit'
import { makeCloth, makeCrate, makeGranite, makeWood } from './mats'
import { RAMP, SCALE, TRACK, rampAngle, type Surf } from './physics'
import { LANE, RINK, SPOT, U, type SpotKey, type Want } from './world'

export type V3 = [number, number, number]
const cm = (p: RY[]): RY[] => p.map(([r, y]) => [r * U, y * U])
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }

/** 这一课的舞台：选一处机位。冰场上靠阳光，器材室里再加一盏跟着走的主灯 */
export function Place({ at, labels, children = null }: { at: SpotKey; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, indoor: v.indoor }), [v])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.indoor ? 1.6 : 2.1} env={v.indoor ? 0.8 : 0.9} fog={[170, 780]} world={want}>{children}</LabStage>
}

/**
 * 一次运动的时钟：id 是 0 时停在起点；id 一变就从 0 秒开始走，每帧把现在的时刻交给 tick，走到 end 秒时报告一次，然后停在终点。
 * 时间按每帧的间隔累加，间隔封顶 1/30 秒：切走再切回来不会跳。
 */
export function useRun(id: number, end: number, tick: (t: number, dt: number) => void, onEnd?: () => void) {
  const s = useRef({ id: -1, t: 0, done: true }), cb = useRef({ tick, onEnd, end }); cb.current = { tick, onEnd, end }
  useFrame((_, d) => {
    const q = s.current, dt = Math.min(d, 1 / 30)
    if (q.id !== id) { q.id = id; q.t = 0; q.done = id === 0 }
    if (!q.done) q.t = Math.min(cb.current.end, q.t + dt)
    cb.current.tick(id === 0 ? 0 : q.t, dt)
    if (!q.done && q.t >= cb.current.end) { q.done = true; cb.current.onEnd?.() }
  })
}

/** 一件事变了以后，过 ms 毫秒才算“稳住了”：指针还在晃的时候不许读数 */
export function useSettled(sig: string | number, ms = 1100) {
  const [seen, setSeen] = useState(sig)
  useEffect(() => { if (seen === sig) return; const t = setTimeout(() => setSeen(sig), ms); return () => clearTimeout(t) }, [sig, seen, ms])
  return seen === sig
}

const UP = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3()
/** 把一根单位长的圆柱摆成从 a 到 b 的一段：会动的细线、绳子每帧用它 */
export function setRod(m: THREE.Object3D | null, a: THREE.Vector3, b: THREE.Vector3) {
  if (!m) return
  tmp.subVectors(b, a); const len = tmp.length() || 1e-6
  m.position.copy(a).addScaledVector(tmp, 0.5); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(UP, tmp.divideScalar(len))
}
/** 一根会动的细线：配合 setRod 用 */
export const Cord = ({ r = 0.008, color = '#e9e4d4', ...rest }: { r?: number; color?: string } & Record<string, unknown>) => <mesh {...rest}><cylinderGeometry args={[r, r, 1, 8]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>

/** 力的示意图上的一个力：从作用点 from 画出，指向 dir，长 len；作用点上有一个小圆点 */
export function Force({ from, dir, len, color, thick = 0.5 }: { from: V3; dir: V3; len: number; color: string; thick?: number }) {
  const n = Math.hypot(...dir) || 1, tip: V3 = [from[0] + dir[0] / n * len, from[1] + dir[1] / n * len, from[2] + dir[2] / n * len]
  return <>
    <ForceArrow tip={tip} dir={dir} len={len} color={color} thick={thick} />
    <mesh position={from} renderOrder={11}><sphereGeometry args={[0.075 * thick, 12, 10]} /><meshBasicMaterial color={color} depthTest={false} transparent toneMapped={false} /></mesh>
  </>
}

function tube(pts: V3[], r: number, segs = 32, tension = 0.5) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0] * U, p[1] * U, p[2] * U)), false, 'catmullrom', tension), segs, r * U, 8) }
const paint = (color: string, rough = 0.4) => <meshPhysicalMaterial color={color} roughness={rough} clearcoat={0.55} clearcoatRoughness={0.25} />
const rubber = <meshStandardMaterial color="#1b1d20" roughness={0.9} />

// ---------- 木头和布：贴图只建一次 ----------
const woodTex = once(() => ({ light: makeWood('#c7a271', '104,68,34', 7), pine: makeWood('#d9bd8c', '150,104,58', 13, 3), dark: makeWood('#8c623c', '54,32,16', 19, 1), towel: makeCloth('towel'), cotton: makeCloth('cotton'), granite: makeGranite(), crate: makeCrate() }))
/** 木头材质：kind 选深浅，rep 是木纹重复几次 */
export function Wood({ kind = 'light', rep = [1, 1] as [number, number] }: { kind?: 'light' | 'pine' | 'dark'; rep?: [number, number] }) {
  const map = useMemo(() => { const t = woodTex()[kind].clone(); t.repeat.set(rep[0], rep[1]); t.needsUpdate = true; return t }, [kind, rep[0], rep[1]])   // eslint-disable-line react-hooks/exhaustive-deps
  return <meshStandardMaterial map={map} roughness={0.62} />
}

/** 毛巾、棉布的材质：rep 是花纹重复几次 */
export function Cloth({ kind, rep }: { kind: 'towel' | 'cotton'; rep: [number, number] }) {
  const map = useMemo(() => { const t = woodTex()[kind].clone(); t.repeat.set(rep[0], rep[1]); t.needsUpdate = true; return t }, [kind, rep[0], rep[1]])   // eslint-disable-line react-hooks/exhaustive-deps
  return <meshStandardMaterial map={map} bumpMap={map} bumpScale={kind === 'towel' ? 2.2 : 0.6} roughness={1} />
}

// ---------- 弹簧测力计 ----------
/** 外壳宽、长、厚；零刻线离外壳顶多远；拉杆多长；挂钩多高（厘米） */
const SC = { w: 4.8, len: 22, d: 1.6, zero: 5, rod: 19.6, hook: 2.25, ring: 2.25 }
/** 每 1 N 弹簧伸长多少（画面单位） */
const N_LEN = SCALE.cmPerN * U
/** 提环顶到外壳顶、外壳顶到挂钩（不受力时）各多远（画面单位）：别的器材靠这两个数和测力计接上 */
export const SCALE_RING = SC.ring * U, SCALE_REACH = (SC.zero + SC.rod + SC.hook) * U
/** 拉力 F 时从提环顶到挂钩一共多长（画面单位） */
export const scaleSpan = (F: number) => SCALE_RING + SCALE_REACH + F * N_LEN

/** 刻度板：0 到 5 N，每 0.1 N 一小格，两边都有刻线，左边标数 */
const plateTex = once(() => {
  const W = 240, H = 1200, per = 60, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#f3efe2'; g.fillRect(0, 0, W, H); g.fillStyle = '#1b2026'
  const n = Math.round(SCALE.max / SCALE.step)
  for (let i = 0; i <= n; i++) {
    const y = (SC.zero - 1 + i * SCALE.step * SCALE.cmPerN) * per, big = i % 10 === 0, mid = i % 5 === 0, len = (big ? 0.62 : mid ? 0.48 : 0.3) * per, h = big ? 5 : 3
    g.fillRect(0, y - h / 2, len, h); g.fillRect(W - len, y - h / 2, len, h)
    if (big) { g.font = '700 46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(Math.round(i * SCALE.step)), 1.02 * per, y + 2) }
  }
  g.font = '700 44px sans-serif'; g.textAlign = 'center'; g.fillText('N', W - 1.0 * per, 2.2 * per)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
})
/** 一根能改长度的螺旋弹簧：coils 圈，R 是圈的半径，w 是钢丝的半径。set(len) 把它拉到 len 长，钢丝粗细不变 */
function makeHelix(coils: number, R: number, w: number, seg = 16, rad = 6) {
  const n = coils * seg + 1, pos = new Float32Array(n * rad * 3), nor = new Float32Array(n * rad * 3), idx: number[] = []
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < rad; j++) { const a = i * rad + j, b = i * rad + (j + 1) % rad; idx.push(a, a + rad, b, b, a + rad, b + rad) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx)
  const set = (len: number) => {
    const k = coils * Math.PI * 2
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), a = t * k, ca = Math.cos(a), sa = Math.sin(a)
      let tx = -R * sa * k, ty = -len, tz = R * ca * k; const l = Math.hypot(tx, ty, tz); tx /= l; ty /= l; tz /= l
      const bx = ty * sa, by = tz * ca - tx * sa, bz = -ty * ca        // 切线 × 径向
      for (let j = 0; j < rad; j++) {
        const th = j / rad * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), nx = c * ca + s * bx, ny = s * by, nz = c * sa + s * bz, o = (i * rad + j) * 3
        pos[o] = R * ca + w * nx; pos[o + 1] = -len * t + w * ny; pos[o + 2] = R * sa + w * nz; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz
      }
    }
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true
  }
  set(1)
  return { g, set }
}
const HOOK_G = once(() => tube([[0, 0, 0], [0, -0.8, 0], [0.42, -1.65, 0], [0, -2.32, 0], [-0.6, -1.9, 0], [-0.62, -1.25, 0]], 0.13, 28))
const KNURL = once(() => lathe(cm([[0, 0], [0.5, 0], [0.56, 0.06], [0.56, 0.5], [0.5, 0.56], [0, 0.56]]), { segs: 12 }))
/**
 * 弹簧测力计：外壳、提环、刻度板、透明前盖，里面看得见弹簧、指针和拉杆，下面是挂钩。原点在外壳顶的正中，挂钩朝下。
 * force：受到多大的拉力（N）；drive：每帧变的拉力从这里读（给了就不看 force）；zero：没调零时指针多出来的示数。
 * 弹簧的长度、指针的位置都按拉力算，跟上去时带一点阻尼，轻轻晃一下才停住。children 挂在钩子上，跟着钩子动。
 */
export function SpringScale({ force = 0, drive, zero = 0, children = null }: { force?: number; drive?: RefObject<number>; zero?: number; children?: ReactNode }) {
  const mov = useRef<THREE.Group>(null), s = useRef({ x: force + zero, v: 0 })
  const helix = useMemo(() => makeHelix(24, 0.55 * U, 0.075 * U), [])
  const place = () => { const x = Math.max(0, s.current.x); helix.set((SC.zero - 1 + x * SCALE.cmPerN) * U); if (mov.current) mov.current.position.y = -SC.zero * U - x * N_LEN }
  useLayoutEffect(place, [])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    const q = s.current, to = Math.max(0, (drive ? drive.current : force) + zero)
    for (let i = 0; i < 2; i++) { const dt = Math.min(d, 1 / 30) / 2; q.v += (-(q.x - to) * 300 - q.v * 19) * dt; q.x += q.v * dt }
    place()
  })
  const blue = paint('#2d5d8c', 0.38), w = SC.w * U, len = SC.len * U, dp = SC.d * U
  return <group>
    {/* 提环：一小段柄和一只环 */}
    <mesh position={[0, 0.3 * U, 0]}><cylinderGeometry args={[0.22 * U, 0.22 * U, 0.7 * U, 12]} /><Metal kind="chrome" rough={0.15} /></mesh>
    <mesh position={[0, 1.4 * U, 0]} castShadow><torusGeometry args={[0.85 * U, 0.14 * U, 10, 32]} /><Metal kind="chrome" rough={0.15} /></mesh>
    {/* 外壳：背板、两条侧边、上下两个端盖，端盖上各两颗螺钉 */}
    <RoundedBox args={[w, len, 0.34 * U]} radius={0.008} smoothness={2} position={[0, -len / 2, -dp / 2 + 0.17 * U]} castShadow>{paint('#b9b5a8', 0.6)}</RoundedBox>
    {[-1, 1].map(k => <RoundedBox key={k} args={[0.4 * U, len, dp]} radius={0.009} smoothness={2} position={[k * (w / 2 - 0.2 * U), -len / 2, 0]} castShadow>{blue}</RoundedBox>)}
    {[-0.5, -SC.len + 0.5].map(y => <group key={y} position={[0, y * U, 0]}>
      <RoundedBox args={[w, 1 * U, dp]} radius={0.01} smoothness={2} castShadow>{blue}</RoundedBox>
      {[-1.5, 1.5].map(x => <mesh key={x} position={[x * U, 0, dp / 2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2 * U, 0.2 * U, 0.1 * U, 10]} /><Metal kind="stainless" /></mesh>)}
    </group>)}
    <mesh position={[0, -len / 2, -dp / 2 + 0.35 * U]}><planeGeometry args={[4 * U, 20 * U]} /><meshStandardMaterial map={plateTex()} color="#c9c5b8" roughness={0.8} /></mesh>
    {/* 弹簧：上头固定在端盖下面，下头连着指针 */}
    <mesh geometry={helix.g} position={[0, -1 * U, 0.1 * U]} frustumCulled={false} castShadow><meshStandardMaterial color="#b9bec4" metalness={0.9} roughness={0.28} side={THREE.DoubleSide} envMapIntensity={1.6} /></mesh>
    {/* 跟着弹簧下头走的：指针、拉杆、挂钩，和挂在钩上的东西 */}
    <group ref={mov}>
      <mesh position={[0, 0, -dp / 2 + 0.42 * U]}><boxGeometry args={[3.9 * U, 0.24 * U, 0.1 * U]} /><meshBasicMaterial color="#d2362f" toneMapped={false} /></mesh>
      <mesh position={[0, -0.25 * U, 0.1 * U]}><boxGeometry args={[1.3 * U, 0.5 * U, 0.5 * U]} /><Metal kind="stainless" grain="brushed" /></mesh>
      <mesh position={[0, -SC.rod / 2 * U, 0.1 * U]}><cylinderGeometry args={[0.13 * U, 0.13 * U, SC.rod * U, 10]} /><Metal kind="stainless" rough={0.25} /></mesh>
      <mesh geometry={HOOK_G()} position={[0, -SC.rod * U, 0.1 * U]} castShadow><Metal kind="stainless" rough={0.25} /></mesh>
      <group position={[0, -(SC.rod + SC.hook) * U, 0.1 * U]}>{children}</group>
    </group>
    {/* 透明的前盖 */}
    <mesh position={[0, -len / 2, dp / 2 - 0.05 * U]} renderOrder={3}><boxGeometry args={[4 * U, 20 * U, 0.08 * U]} /><meshPhysicalMaterial color="#dfeef5" transparent opacity={0.12} roughness={0.03} clearcoat={1} depthWrite={false} envMapIntensity={1.4} /></mesh>
  </group>
}

// ---------- 钩码 ----------
const HOOKW = once(() => ({
  body: lathe(cm([[0, 0], [0.86, 0], [1, 0.14], [1, 0.9], [0.94, 0.96], [0.94, 1.04], [1, 1.1], [1, 1.86], [0.86, 2], [0.26, 2], [0.26, 2.12], [0, 2.12]]), { segs: 40 }),
}))
/** 一只钩码的挂点到下一只的挂点多远（画面单位） */
export const HOOK_PITCH = 3.73 * U
/** 一串钩码：n 只，一只挂一只。黄铜车出来的圆柱，上面一只钩，下面一只环。原点在最上面那只的挂点 */
export function Hooks({ n }: { n: number }) {
  return <>{Array.from({ length: n }, (_, i) => <group key={i} position={[0, -i * HOOK_PITCH, 0]}>
    <mesh position={[0, -0.3 * U, 0]} rotation-z={Math.PI * 0.72}><torusGeometry args={[0.32 * U, 0.075 * U, 8, 22, Math.PI * 1.6]} /><Metal kind="steel" rough={0.3} /></mesh>
    <mesh position={[0, -0.92 * U, 0]}><cylinderGeometry args={[0.075 * U, 0.075 * U, 0.66 * U, 8]} /><Metal kind="steel" rough={0.3} /></mesh>
    <mesh geometry={HOOKW().body} position={[0, -3.2 * U, 0]} castShadow><Metal kind="brass" grain="turned" repeat={[1, 2]} /></mesh>
    <mesh position={[0, -3.48 * U, 0]}><torusGeometry args={[0.3 * U, 0.07 * U, 8, 20]} /><Metal kind="steel" rough={0.3} /></mesh>
  </group>)}</>
}

// ---------- 铁架台和重垂线 ----------
/** 铁架台上横杆的高度、测力计和重垂线各挂在横杆的什么位置、立杆的位置（厘米，从底座中心算） */
export const STAND = { armY: 58, hookX: 5, plumbX: 14, rodX: -7, hang: 56.3, baseW: 26 }
const BOB = once(() => lathe(cm([[0, 0], [0.22, 0.45], [0.95, 2.7], [0.95, 3.3], [0.55, 3.7], [0.22, 3.7], [0.22, 4.1], [0, 4.1]]), { segs: 32 }))
/** 铁架台：铸铁底座（四只胶脚）、镀铬立杆、十字夹和带滚花的紧固螺钉、横杆，横杆上两只挂钩。原点在底座底面的正中 */
export function Stand() {
  const chrome = <Metal kind="chrome" rough={0.14} />, S = STAND
  return <group>
    {[-1, 1].flatMap(a => [-1, 1].map(b => <mesh key={`${a}${b}`} position={[(3 + a * 11) * U, 0.15 * U, b * 5.4 * U]}><cylinderGeometry args={[0.7 * U, 0.8 * U, 0.3 * U, 14]} />{rubber}</mesh>))}
    <RoundedBox args={[S.baseW * U, 1.5 * U, 14 * U]} radius={0.018} smoothness={3} position={[3 * U, 1.05 * U, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#22272c" roughness={0.55} metalness={0.3} clearcoat={0.4} clearcoatRoughness={0.5} /></RoundedBox>
    <mesh geometry={useMemo(() => disc(1.5 * U, 1.3 * U), [])} position={[S.rodX * U, 1.8 * U, 0]}><Metal kind="iron" grain="cast" /></mesh>
    <mesh geometry={useMemo(() => bolts(6, 1.1 * U, 0.3 * U), [])} position={[S.rodX * U, 3.1 * U, 0]}><Metal kind="steel" /></mesh>
    <mesh position={[S.rodX * U, 33 * U, 0]} castShadow><cylinderGeometry args={[0.6 * U, 0.6 * U, 62 * U, 20]} />{chrome}</mesh>
    <mesh position={[S.rodX * U, 64.1 * U, 0]}><sphereGeometry args={[0.6 * U, 14, 10]} />{chrome}</mesh>
    {/* 十字夹：一块铸铁，立杆和横杆都从里面穿过；前面一颗滚花螺钉 */}
    <RoundedBox args={[2.8 * U, 2.8 * U, 2.6 * U]} radius={0.012} smoothness={2} position={[S.rodX * U, S.armY * U, 0]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[S.rodX * U, S.armY * U, 2 * U]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.22 * U, 0.22 * U, 1.6 * U, 10]} /><Metal kind="steel" /></mesh>
    <mesh geometry={KNURL()} position={[S.rodX * U, S.armY * U, 2.6 * U]} rotation-x={Math.PI / 2} scale={1.6}><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[(S.rodX + 11.5) * U, S.armY * U, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.45 * U, 0.45 * U, 27 * U, 16]} />{chrome}</mesh>
    {[S.hookX, S.plumbX].map(x => <mesh key={x} position={[x * U, (S.armY - 1.0) * U, 0]}><torusGeometry args={[0.55 * U, 0.1 * U, 8, 20]} /><Metal kind="steel" rough={0.3} /></mesh>)}
  </group>
}
/** 重垂线的铅锤：黄铜车的，尖朝下。原点在线拴着的地方，len 是线长（厘米） */
export function Plumb({ len }: { len: number }) {
  return <group>
    <mesh position={[0, -len / 2 * U, 0]}><cylinderGeometry args={[0.006, 0.006, len * U, 6]} /><meshStandardMaterial color="#e9e4d4" roughness={0.9} /></mesh>
    <mesh geometry={BOB()} position={[0, -(len + 4.1) * U, 0]} castShadow><Metal kind="brass" grain="turned" /></mesh>
  </group>
}

// ---------- 小车 ----------
const WHEEL = once(() => ({
  tire: lathe(cm([[0.5, -0.36], [1.08, -0.36], [1.16, -0.44], [1.3, -0.3], [1.3, 0.3], [1.16, 0.44], [1.08, 0.36], [0.5, 0.36]]), { segs: 32, closed: true }),
  hub: disc(1.08 * U, 0.84 * U, { hole: 0.2 * U }), nuts: bolts(5, 0.62 * U, 0.26 * U, 0.12 * U),
}))
/** 小车的车长、轮子的半径、前后轮距（厘米） */
export const CART = { len: 10, r: 1.3, base: 6.4 }
/** 实验小车：铝的底盘、红色的车身、两根钢轴、四只带胶圈的轮子。roll 是轮子转过的角度（弧度）。原点在四只轮子着地那个面的正中，车头朝 +x */
export function Cart({ roll }: { roll: RefObject<number> }) {
  const wheels = useRef<(THREE.Group | null)[]>([])
  useFrame(() => { for (const w of wheels.current) if (w) w.rotation.z = -roll.current })
  const W = WHEEL()
  return <group>
    <RoundedBox args={[CART.len * U, 1.2 * U, 4.4 * U]} radius={0.012} smoothness={3} position={[0, 2.1 * U, 0]} castShadow><Metal kind="aluminum" grain="brushed" rough={0.45} /></RoundedBox>
    <RoundedBox args={[8.8 * U, 0.9 * U, 3.8 * U]} radius={0.016} smoothness={3} position={[0, 3.1 * U, 0]} castShadow>{paint('#c5472e', 0.35)}</RoundedBox>
    <RoundedBox args={[4.6 * U, 0.3 * U, 2.6 * U]} radius={0.006} smoothness={2} position={[-0.6 * U, 3.68 * U, 0]}>{paint('#e9e3d2', 0.5)}</RoundedBox>
    <mesh position={[5.25 * U, 2.1 * U, 0]}><torusGeometry args={[0.32 * U, 0.08 * U, 8, 18]} /><Metal kind="steel" /></mesh>
    {[-1, 1].map(a => <group key={a} position={[a * CART.base / 2 * U, CART.r * U, 0]}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2 * U, 0.2 * U, 7.2 * U, 10]} /><Metal kind="steel" rough={0.25} /></mesh>
      {[-1, 1].map(b => <mesh key={b} position={[0, 0.5 * U, b * 1.6 * U]}><boxGeometry args={[1 * U, 0.7 * U, 0.5 * U]} /><Metal kind="aluminum" /></mesh>)}
      {[-1, 1].map(b => <group key={b} ref={e => { wheels.current[(a + 1) + (b + 1) / 2] = e }} position={[0, 0, b * 2.95 * U]}>
        <group rotation-x={b * Math.PI / 2}>
          <mesh geometry={W.tire} castShadow>{rubber}</mesh>
          <mesh geometry={W.hub} position={[0, -0.42 * U, 0]}><Metal kind="aluminum" grain="turned" /></mesh>
          <mesh geometry={W.nuts} position={[0, 0.42 * U, 0]}><Metal kind="steel" /></mesh>
          <mesh position={[0.72 * U, 0.43 * U, 0]}><cylinderGeometry args={[0.2 * U, 0.2 * U, 0.02 * U, 10]} /><meshBasicMaterial color="#f3d24a" /></mesh>
        </group>
      </group>)}
    </group>)}
  </group>
}

// ---------- 斜面、长木板和铺在上面的布 ----------
/** 木板上的刻度条：每厘米一小格，每 10 cm 标一个数 */
const tapeTex = once(() => {
  const n = Math.round(TRACK * 100), W = 2000, H = 40, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#efe6b8'; g.fillRect(0, 0, W, H); g.fillStyle = '#1b2026'
  for (let i = 0; i <= n; i++) { const x = i / n * (W - 4) + 1; g.fillRect(x, 0, i % 10 ? 1.5 : 3, i % 10 === 0 ? 18 : i % 5 === 0 ? 13 : 8); if (i % 10 === 0 && i > 0 && i < n) { g.font = '700 20px sans-serif'; g.textAlign = 'center'; g.fillText(String(i), x, 37) } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16
  return t
})
/** 斜面板实际多长、板多宽、板多厚、布比木板厚出多少（厘米） */
const RAMP_LEN = 42, PLANK_W = 12, PLANK_T = 1.6
/** 长木板的厚度（画面单位）：木板放在台面上，板面比台面高这么多 */
export const PLANK_Y = PLANK_T * U
export const CLOTH_T: Record<Surf, number> = { towel: 0.5, cotton: 0.15, wood: 0, none: 0 }
/** 小车沿路走了 s 厘米（从放开的地方算）时，着地点在哪（厘米，原点在斜面底端的木板面上） */
function onPath(s: number, lift: number): [number, number] {
  const L = RAMP.L * 100, th = rampAngle()
  return s < L ? [-(L - s) * Math.cos(th), (L - s) * Math.sin(th) + lift * Math.min(1, s / L + 0.9)] : [s - L, lift]
}
/** 小车的位置和车身的倾角：前后轮各自落在路面上，过斜面底端时车身慢慢放平。返回画面单位 */
export function cartPose(ramp: number, flat: number, surf: Surf) {
  const s = (ramp + flat) * 100, f = onPath(s + CART.base / 2, CLOTH_T[surf]), r = onPath(s - CART.base / 2, CLOTH_T[surf])
  return { x: (f[0] + r[0]) / 2 * U, y: (f[1] + r[1]) / 2 * U, ang: Math.atan2(f[1] - r[1], f[0] - r[0]) }
}
/**
 * 斜面和长木板：木板平放在台面上，一头搭着斜面，斜面高的一头垫着木块，顶上有一块挡条；木板前沿贴着刻度条，尽头有一块挡块。
 * surf：木板上铺的是毛巾、棉布，还是什么都不铺；none 时换成一块很滑的玻璃板。原点在斜面底端的木板面上
 */
export function RampTrack({ surf }: { surf: Surf }) {
  const th = rampAngle(), T = woodTex()
  const ramp = useMemo(() => {
    const c = Math.cos(th), s = Math.sin(th), sh = new THREE.Shape()
    sh.moveTo(0.4 * U, 0); sh.lineTo(-RAMP_LEN * c * U, RAMP_LEN * s * U); sh.lineTo(-RAMP_LEN * c * U, (RAMP_LEN * s - 1.3) * U); sh.lineTo(-1.3 / Math.tan(th) * U, 0); sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: PLANK_W * U, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }); g.translate(0, 0, -PLANK_W / 2 * U)
    return g
  }, [th])
  const cloth = useMemo(() => surf === 'towel' || surf === 'cotton' ? (() => { const t = T[surf].clone(); t.repeat.set(surf === 'towel' ? 9 : 14, surf === 'towel' ? 1 : 1.6); t.needsUpdate = true; return t })() : null, [surf, T])
  const hx = -RAMP_LEN * Math.cos(th), hy = RAMP_LEN * Math.sin(th), len = TRACK * 100
  return <group>
    {/* 长木板和它前沿的刻度条、尽头的挡块 */}
    <RoundedBox args={[(len + 12) * U, PLANK_T * U, PLANK_W * U]} radius={0.012} smoothness={2} position={[(len / 2 - 2) * U, -PLANK_T / 2 * U, 0]} castShadow receiveShadow><Wood kind="pine" rep={[3, 1]} /></RoundedBox>
    <mesh rotation-x={-Math.PI / 2} position={[len / 2 * U, 0.003, (PLANK_W / 2 - 0.55) * U]}><planeGeometry args={[len * U, 0.9 * U]} /><meshStandardMaterial map={tapeTex()} roughness={0.6} polygonOffset polygonOffsetFactor={-2} /></mesh>
    <RoundedBox args={[1.6 * U, 2.4 * U, PLANK_W * U]} radius={0.01} smoothness={2} position={[(len + 3) * U, 1.2 * U, 0]} castShadow><Wood kind="dark" /></RoundedBox>
    {/* 斜面：一块斜搭着的木板，顶上一块挡条，底下垫着两块叠起来的木块 */}
    <mesh geometry={ramp} castShadow receiveShadow><Wood kind="light" rep={[1.6, 1]} /></mesh>
    <group position={[hx * U, hy * U, 0]} rotation-z={-th}><RoundedBox args={[1.2 * U, 1.6 * U, PLANK_W * U]} radius={0.008} smoothness={2} position={[0.6 * U, 0.8 * U, 0]} castShadow><Wood kind="dark" /></RoundedBox></group>
    {[0, 1].map(i => <RoundedBox key={i} args={[(7 - i * 1.6) * U, (hy - 1.3 + PLANK_T) / 2 * U, (PLANK_W + 1 - i * 2) * U]} radius={0.01} smoothness={2} position={[(hx + 4.4 - i * 0.6) * U, (-PLANK_T + (hy - 1.3 + PLANK_T) * (0.25 + i * 0.5)) * U, 0]} castShadow receiveShadow><Wood kind={i ? 'light' : 'dark'} /></RoundedBox>)}
    {/* 铺在木板上的布，或者推理用的光滑面 */}
    {cloth && <RoundedBox args={[(len - 0.6) * U, CLOTH_T[surf] * U + 0.004, (PLANK_W - 2.6) * U]} radius={Math.min(0.012, CLOTH_T[surf] * U / 2)} smoothness={2} position={[(len / 2 + 0.6) * U, CLOTH_T[surf] / 2 * U, -0.5 * U]} receiveShadow castShadow><meshStandardMaterial map={cloth} bumpMap={cloth} bumpScale={surf === 'towel' ? 2.2 : 0.6} roughness={1} /></RoundedBox>}
    {surf === 'none' && <mesh position={[(len / 2 + 0.6) * U, 0.006, -0.5 * U]} renderOrder={2}><boxGeometry args={[(len - 0.6) * U, 0.008, (PLANK_W - 2.6) * U]} /><meshPhysicalMaterial color="#bfe6f5" transparent opacity={0.45} roughness={0.04} clearcoat={1} envMapIntensity={1.6} depthWrite={false} /></mesh>}
  </group>
}

// ---------- 带滑轮的立柱、小卡片 ----------
/** 滑轮轮心的高度、轮子的半径（厘米） */
export const PULLEY = { y: 34, r: 1.6 }
const SHEAVE = once(() => lathe(cm([[0.25, -0.42], [1.6, -0.42], [1.6, -0.3], [1.22, -0.08], [1.22, 0.08], [1.6, 0.3], [1.6, 0.42], [0.25, 0.42]]), { segs: 40, closed: true }))
/** 一根立柱，顶上叉着一只滑轮（轮轴朝前后）：铸铁圆底座、镀铬立杆、叉架、带槽的铝轮。原点在底座底面的正中 */
export function Post() {
  return <group>
    <mesh geometry={useMemo(() => lathe(cm([[0, 0], [4.3, 0], [4.5, 0.2], [4.5, 0.9], [2.2, 1.7], [1.1, 1.9], [1.1, 3], [0, 3]]), { segs: 40 }), [])} castShadow receiveShadow><meshPhysicalMaterial color="#22272c" roughness={0.55} metalness={0.3} clearcoat={0.4} /></mesh>
    <mesh position={[0, (PULLEY.y - 2.6) / 2 * U + 1.4 * U, 0]} castShadow><cylinderGeometry args={[0.5 * U, 0.5 * U, (PULLEY.y - 5.4) * U, 16]} /><Metal kind="chrome" rough={0.14} /></mesh>
    <mesh position={[0, (PULLEY.y - 2.5) * U, 0]}><boxGeometry args={[1.4 * U, 0.5 * U, 2.2 * U]} /><Metal kind="steel" grain="brushed" /></mesh>
    {[-1, 1].map(k => <mesh key={k} position={[0, (PULLEY.y - 0.9) * U, k * 0.86 * U]}><boxGeometry args={[1.3 * U, 3.4 * U, 0.2 * U]} /><Metal kind="steel" grain="brushed" /></mesh>)}
    <mesh geometry={SHEAVE()} position={[0, PULLEY.y * U, 0]} rotation-x={Math.PI / 2} castShadow><Metal kind="aluminum" grain="turned" /></mesh>
    <mesh position={[0, PULLEY.y * U, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2 * U, 0.2 * U, 2.4 * U, 10]} /><Metal kind="steel" /></mesh>
    {[-1, 1].map(k => <mesh key={k} position={[0, PULLEY.y * U, k * 1.1 * U]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.36 * U, 0.36 * U, 0.24 * U, 6]} /><Metal kind="steel" /></mesh>)}
  </group>
}
/** 小卡片的宽和高（厘米） */
export const CARD = { w: 6, h: 4 }
/** 半张小卡片：side 是 −1 左半、1 右半，原点在整张卡片的中心。靠外的一边打了一个穿线的孔 */
export function HalfCard({ side }: { side: 1 | -1 }) {
  return <group>
    <RoundedBox args={[CARD.w / 2 * U - 0.002, CARD.h * U, 0.012]} radius={0.004} smoothness={2} position={[side * CARD.w / 4 * U, 0, 0]} castShadow><meshStandardMaterial color="#cfc8b6" roughness={0.9} /></RoundedBox>
    <mesh position={[side * (CARD.w / 2 - 0.45) * U, 0, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.14 * U, 0.14 * U, 0.016, 12]} /><meshStandardMaterial color="#3a3d42" /></mesh>
  </group>
}

// ---------- 带挂钩的木块、砝码、卷线器、垫在下面的圆铅笔 ----------
/** 木块的长、宽、高（厘米）：平放时 10 × 6 的面朝下，侧放时 10 × 4 的面朝下 */
export const BLOCK_CM = { l: 10, w: 6, h: 4 }
const LOAD_G = once(() => lathe(cm([[0, 0], [1.75, 0], [1.9, 0.15], [1.9, 2.5], [1.7, 2.7], [0.55, 2.7], [0.42, 2.9], [0.42, 3.1], [0.7, 3.4], [0.7, 3.9], [0.5, 4.1], [0, 4.1]]), { segs: 40 }))
/** 带挂钩的木块：木纹、倒过角的棱，前头拧着一只羊眼螺钉。side：侧放；load：上面放一只砝码。原点在底面正中，挂钩朝 +x */
export function WoodBlock({ side = false, load = false }: { side?: boolean; load?: boolean }) {
  const B = BLOCK_CM, h = side ? B.w : B.h, d = side ? B.h : B.w
  return <group>
    <RoundedBox args={[B.l * U, h * U, d * U]} radius={0.016} smoothness={3} position={[0, h / 2 * U, 0]} castShadow receiveShadow><Wood kind="dark" rep={[1, 1]} /></RoundedBox>
    <mesh position={[(B.l / 2 + 0.25) * U, h / 2 * U, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.12 * U, 0.12 * U, 0.5 * U, 8]} /><Metal kind="steel" /></mesh>
    <mesh position={[(B.l / 2 + 0.85) * U, h / 2 * U, 0]}><torusGeometry args={[0.38 * U, 0.1 * U, 8, 20]} /><Metal kind="steel" rough={0.3} /></mesh>
    {load && <mesh geometry={LOAD_G()} position={[-0.6 * U, h * U, 0]} castShadow><Metal kind="brass" grain="turned" repeat={[1, 2]} /></mesh>}
  </group>
}
/** 木块上的挂钩离底面多高、离木块中心多远（画面单位） */
export const blockEye = (side: boolean) => ({ x: (BLOCK_CM.l / 2 + 1.1) * U, y: (side ? BLOCK_CM.w : BLOCK_CM.h) / 2 * U })
/** 电动卷线器：底板、一只小电动机、一只绕线的轮子。绳子从轮子顶上收进去。原点在底板底面正中，轮子顶离底面 WINCH_Y */
export const WINCH_Y = 3.6 * U
export function Winch({ turn }: { turn: RefObject<number> }) {
  const spool = useRef<THREE.Group>(null)
  useFrame(() => { if (spool.current) spool.current.rotation.z = -turn.current })
  return <group>
    <RoundedBox args={[9 * U, 0.8 * U, 7 * U]} radius={0.01} smoothness={2} position={[1.5 * U, 0.4 * U, 0]} castShadow receiveShadow>{paint('#2b3238', 0.5)}</RoundedBox>
    <mesh geometry={useMemo(() => bolts(4, 4.2 * U, 0.4 * U), [])} position={[1.5 * U, 0.8 * U, 0]} scale={[0.95, 1, 0.72]}><Metal kind="steel" /></mesh>
    {[-1, 1].map(k => <mesh key={k} position={[0, 1.9 * U, k * 1.5 * U]}><boxGeometry args={[1.6 * U, 2.6 * U, 0.3 * U]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    <group ref={spool} position={[0, 2.4 * U, 0]}>
      <mesh rotation-x={Math.PI / 2} geometry={useMemo(() => lathe(cm([[0.2, -1.2], [1.8, -1.2], [1.8, -1], [1.2, -0.9], [1.2, 0.9], [1.8, 1], [1.8, 1.2], [0.2, 1.2]]), { segs: 32, closed: true }), [])} castShadow><Metal kind="aluminum" grain="turned" /></mesh>
      <mesh position={[0.9 * U, 0, 1.22 * U]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2 * U, 0.2 * U, 0.04 * U, 8]} /><meshBasicMaterial color="#d2362f" /></mesh>
    </group>
    <mesh position={[3.4 * U, 2.4 * U, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[1.5 * U, 1.5 * U, 4.2 * U, 24]} /><Metal kind="steel" grain="brushed" rough={0.4} /></mesh>
    <mesh position={[5.6 * U, 2.4 * U, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[1.25 * U, 1.5 * U, 0.4 * U, 24]} />{rubber}</mesh>
  </group>
}

// ---------- 冰壶、推杆、冰刷 ----------
const STONE_G = once(() => ({
  body: lathe(cm([[0, 0.7], [5.6, 0.7], [6.2, 0], [7.2, 0], [8.2, 0.5], [11, 1.5], [13.2, 3], [14.3, 4.6], [14.5, 5.7], [14.3, 6.8], [13.2, 8.4], [11, 9.9], [9.9, 10.5], [9.9, 11], [0, 11]]), { segs: 56, crease: 36 }),
  band: lathe(cm([[14.32, 4.6], [14.56, 5.7], [14.32, 6.8]]), { segs: 56, crease: 60 }),
  cap: lathe(cm([[0, 11], [9.7, 11], [9.7, 11.5], [9.2, 12.1], [3, 12.5], [0, 12.5]]), { segs: 48 }),
  handle: tube([[-5.2, 12.2, 0], [-5.4, 14.4, 0], [-4, 16.2, 0], [-0.5, 16.9, 0], [4, 16.9, 0], [8, 16.5, 0]], 1.15, 30),
  bolt: bolts(1, 0, 1.5 * U, 0.5 * U),
}))
/** 冰壶：花岗岩壶体（中间一圈是磨毛的撞击带，底下一圈凸起的滑行环），上面是彩色的盖板和鹅颈手柄。原点在底面圆心 */
export function Stone({ color = '#b8372d' }: { color?: string }) {
  const S = STONE_G(), map = woodTex().granite
  return <group>
    <mesh geometry={S.body} castShadow receiveShadow><meshPhysicalMaterial map={map} color="#c9ccd0" roughness={0.3} clearcoat={0.7} clearcoatRoughness={0.2} envMapIntensity={0.9} /></mesh>
    <mesh geometry={S.band}><meshStandardMaterial map={map} color="#eef0f2" roughness={0.95} /></mesh>
    <mesh geometry={S.cap} castShadow>{paint(color, 0.3)}</mesh>
    <mesh geometry={S.handle} scale={[1, 1, 1.25]} castShadow>{paint(color, 0.3)}</mesh>
    <mesh position={[8 * U, 16.5 * U, 0]} scale={[1, 1, 1.25]}><sphereGeometry args={[1.15 * U, 14, 10]} />{paint(color, 0.3)}</mesh>
    <mesh geometry={S.bolt} position={[1.6 * U, 12.4 * U, 0]}><Metal kind="stainless" /></mesh>
  </group>
}
/** 推杆头上的海绵多厚、推的地方离冰面多高（厘米） */
export const TIP = { thick: 6, y: 5.7 }
/** 冰壶推杆：一块海绵头、一块托板、一根斜着往后上方伸的碳纤维杆和握把。squash 是海绵被压扁多少（画面单位）。原点在海绵顶着冰壶的那个面的正中，朝 +x 推 */
export function Stick({ squash }: { squash: RefObject<number> }) {
  const pad = useRef<THREE.Mesh>(null), rest = useRef<THREE.Group>(null)
  useFrame(() => { const t = TIP.thick * U, k = Math.max(0.3, (t - squash.current) / t); if (pad.current) { pad.current.scale.x = k; pad.current.position.x = -t * k / 2 } if (rest.current) rest.current.position.x = -t * k })
  return <group>
    <RoundedBox ref={pad} args={[TIP.thick * U, 8 * U, 13 * U]} radius={0.05} smoothness={3} position={[-TIP.thick / 2 * U, 0.6 * U, 0]} castShadow><meshStandardMaterial color="#e0bb3e" roughness={1} /></RoundedBox>
    <group ref={rest}>
      <RoundedBox args={[1 * U, 9 * U, 14 * U]} radius={0.012} smoothness={2} position={[-0.5 * U, 0.6 * U, 0]} castShadow>{paint('#20252a', 0.5)}</RoundedBox>
      <mesh position={[-2 * U, 1.4 * U, 0]} rotation-z={0.9}><cylinderGeometry args={[1.5 * U, 1.8 * U, 4 * U, 14]} />{paint('#20252a', 0.5)}</mesh>
      <Rod from={[-2 * U, 1.4 * U, 0]} to={[-112 * U, 84 * U, 0]} r={1.1 * U}><meshPhysicalMaterial color="#17191c" roughness={0.35} clearcoat={0.8} /></Rod>
      <Rod from={[-92 * U, 69 * U, 0]} to={[-116 * U, 87 * U, 0]} r={1.5 * U}><meshStandardMaterial color="#c5472e" roughness={0.85} /></Rod>
    </group>
  </group>
}
/** 冰刷：一根杆、一个可以转的接头、一块包着布面的刷头。原点在刷头底面正中，刷头横着（沿 z） */
export function Broom() {
  return <group>
    <RoundedBox args={[7 * U, 1.4 * U, 22 * U]} radius={0.02} smoothness={2} position={[0, 0.7 * U, 0]} castShadow><meshStandardMaterial map={woodTex().cotton} color="#f0d9a0" roughness={1} /></RoundedBox>
    <RoundedBox args={[7.6 * U, 2 * U, 23 * U]} radius={0.03} smoothness={3} position={[0, 2.3 * U, 0]} castShadow>{paint('#2a65a0', 0.35)}</RoundedBox>
    <mesh position={[-1 * U, 4.2 * U, 0]} rotation-z={0.7}><cylinderGeometry args={[1.3 * U, 1.6 * U, 3.4 * U, 14]} />{paint('#20252a', 0.5)}</mesh>
    <Rod from={[-1 * U, 4.2 * U, 0]} to={[-78 * U, 96 * U, 0]} r={1.15 * U}><meshPhysicalMaterial color="#17191c" roughness={0.35} clearcoat={0.8} /></Rod>
    <Rod from={[-60 * U, 75 * U, 0]} to={[-80 * U, 98.5 * U, 0]} r={1.5 * U}><meshStandardMaterial color="#2a65a0" roughness={0.85} /></Rod>
  </group>
}

// ---------- 雪橇、木箱、挡板 ----------
/** 雪橇板面的高度、木箱的边长（厘米） */
export const DECK_Y = 19.8, BOX_CM = 30
const RUNNER = once(() => {
  const sh = new THREE.Shape(), u = U
  sh.moveTo(-62 * u, 0); sh.lineTo(46 * u, 0); sh.quadraticCurveTo(63 * u, 0, 68 * u, 14 * u); sh.lineTo(65 * u, 15 * u); sh.quadraticCurveTo(60 * u, 3.4 * u, 46 * u, 3 * u); sh.lineTo(-62 * u, 3 * u); sh.closePath()
  const g = new THREE.ExtrudeGeometry(sh, { depth: 2.6 * u, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 16 }); g.translate(0, 0, -1.3 * u)
  return g
})
/** 雪橇：五根木条拼的板面、三根横档、两条前头翘起来的滑板（底下包着钢条）、六根立撑、前面一只拴绳的环。原点在冰面上、板面正中的下方，车头朝 +x */
export function Sled() {
  return <group>
    {[-20, -10, 0, 10, 20].map(z => <RoundedBox key={z} args={[120 * U, 1.8 * U, 8.6 * U]} radius={0.02} smoothness={2} position={[0, (DECK_Y - 0.9) * U, z * U]} castShadow receiveShadow><Wood kind="pine" rep={[2, 1]} /></RoundedBox>)}
    {[-46, 0, 46].map(x => <RoundedBox key={x} args={[5 * U, 2.6 * U, 50 * U]} radius={0.02} smoothness={2} position={[x * U, (DECK_Y - 3.1) * U, 0]} castShadow><Wood kind="dark" /></RoundedBox>)}
    {[-1, 1].map(k => <group key={k} position={[0, 0, k * 21 * U]}>
      <mesh geometry={RUNNER()} position={[0, 0.4 * U, 0]} castShadow>{paint('#a5392c', 0.4)}</mesh>
      <mesh position={[-8 * U, 0.2 * U, 0]}><boxGeometry args={[108 * U, 0.4 * U, 2.2 * U]} /><Metal kind="steel" grain="brushed" rough={0.3} /></mesh>
      {[-46, 0, 44].map(x => <RoundedBox key={x} args={[3.4 * U, (DECK_Y - 7.8) * U, 2.4 * U]} radius={0.01} smoothness={2} position={[x * U, (3.4 + (DECK_Y - 7.8) / 2) * U, 0]} castShadow>{paint('#a5392c', 0.4)}</RoundedBox>)}
      <Rod from={[66.5 * U, 14.6 * U, 0]} to={[58 * U, (DECK_Y - 1.8) * U, 0]} r={0.9 * U}><Metal kind="steel" rough={0.3} /></Rod>
    </group>)}
    <mesh position={[61.5 * U, (DECK_Y - 1) * U, 0]} rotation-y={Math.PI / 2}><torusGeometry args={[1.6 * U, 0.35 * U, 8, 20]} /><Metal kind="steel" rough={0.3} /></mesh>
  </group>
}
/** 木箱：六面都是钉起来的木板。strap：用两道绑带绑住。原点在底面正中 */
export function Crate({ strap = false }: { strap?: boolean }) {
  const s = BOX_CM * U
  return <group>
    <RoundedBox args={[s, s, s]} radius={0.03} smoothness={2} position={[0, s / 2, 0]} castShadow receiveShadow><meshStandardMaterial map={woodTex().crate} roughness={0.8} /></RoundedBox>
    {strap && [-0.24, 0.24].map(k => <mesh key={k} position={[k * s, s / 2 + 0.006, 0]}><boxGeometry args={[0.2, s + 0.03, s + 0.03]} /><meshStandardMaterial color="#20252a" roughness={0.7} /></mesh>)}
  </group>
}
/** 挡板：两只压着配重的底座、两根立柱、一块包着泡沫的板。原点在迎着雪橇的那个面的底边正中，雪橇从 −x 一侧撞上来 */
export function Bumper() {
  return <group>
    <RoundedBox args={[16 * U, 56 * U, 190 * U]} radius={0.12} smoothness={3} position={[8 * U, 32 * U, 0]} castShadow receiveShadow>{paint('#2a65a0', 0.75)}</RoundedBox>
    <mesh position={[-0.02, 32 * U, 0]}><boxGeometry args={[0.02, 12 * U, 186 * U]} /><meshStandardMaterial color="#e6ecf1" roughness={0.8} /></mesh>
    {[-70, 70].map(z => <group key={z} position={[26 * U, 0, z * U]}>
      <RoundedBox args={[40 * U, 6 * U, 30 * U]} radius={0.03} smoothness={2} position={[6 * U, 3 * U, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <mesh position={[-6 * U, 32 * U, 0]} castShadow><boxGeometry args={[5 * U, 58 * U, 5 * U]} /><Metal kind="steel" grain="brushed" rough={0.45} /></mesh>
      <Rod from={[-4 * U, 44 * U, 0]} to={[22 * U, 6 * U, 0]} r={1.5 * U}><Metal kind="steel" rough={0.4} /></Rod>
    </group>)}
  </group>
}

/** 冰壶道边上备用的东西：一排红黄两色的冰壶、两把靠在架子上的冰刷。放在道的另一侧，不挡镜头 */
export function Spares() {
  return <group position={[RINK.push - 5, 0, LANE - 16]}>
    {Array.from({ length: 6 }, (_, i) => <group key={i} position={[i * 2.3, 0, (i % 2) * 0.5]} rotation-y={i * 1.3}><Stone color={i % 2 ? '#d7a531' : '#b8372d'} /></group>)}
    <group position={[16.5, 0, 0]}>
      {[-1, 1].map(k => <mesh key={k} position={[k * 1.6, 2.7, -0.6]} castShadow><boxGeometry args={[0.22, 5.4, 0.22]} /><Metal kind="steel" grain="brushed" rough={0.45} /></mesh>)}
      <mesh position={[0, 5.3, -0.6]} castShadow><boxGeometry args={[3.6, 0.22, 0.22]} /><Metal kind="steel" grain="brushed" rough={0.45} /></mesh>
      <mesh position={[0, 0.1, -0.6]}><boxGeometry args={[4, 0.2, 1.6]} /><Metal kind="iron" grain="cast" /></mesh>
      {[-0.8, 0.8].map(k => <group key={k} position={[k, 0.2, 0.5]} rotation={[0, Math.PI / 2, 0]}><group rotation-z={-0.42}><Broom /></group></group>)}
    </group>
  </group>
}
