// 声现象实验室里反复用到的器材：音叉和共鸣箱、吊着小球的铁架台、橡皮槌、鼓、示波器、话筒、分贝仪，以及画出来的声波。
// 器材都用“工作台上的坐标”：原点在这一课那张工作台台面的正中，y 从台面往上算。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Led, Metal, Rod, bolts, disc, lathe, type Label } from '@/lab-kit'
import { ROOM, SPOT, ST, TOP, makeWood, type Spot } from './world'

/** 舞台上环境光弱，金属件把反射调亮一些 */
export const ENV = 3
type V3 = [number, number, number]

/** 这一课的舞台：选一处机位，把器材摆到那张工作台上 */
export function Hall({ at, labels, children = null }: { at: Spot; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  return <LabStage<Spot> labels={labels} target={v.target} span={v.span} view={v.view} {...ROOM} world={at}>
    <group position={[ST[at], at === 'noise' ? 0 : TOP, 0]}>{children}</group>
  </LabStage>
}
/** 工作台上的一点在整个场景里的位置，给标签用 */
export const P = (at: Spot, x: number, y: number, z = 0): V3 => [ST[at] + x, (at === 'noise' ? 0 : TOP) + y, z]

// ---------- 敲一下以后的余音 ----------
/** 一次敲击：t 是槌碰到的时刻（毫秒），amp 是敲得多重 */
export interface Hit { t: number; amp: number }
/** 槌从抬起到碰上要多久（毫秒） */
export const SWING = 300
/** 现在还剩多少振动：碰到之后按指数慢慢衰减，tau 是衰减到约三分之一要几秒 */
export const ringing = (hit: Hit | null, tau = 2.6, now = performance.now()) => !hit || now < hit.t ? 0 : hit.amp * Math.exp(-(now - hit.t) / 1000 / tau)

// ---------- 画出来的声波：一圈圈向外扩的波阵面 ----------
/** level：现在有多响（0–1）；r0、r1：从多大扩到多大；flat：平躺着画；half：只画上半圈 */
export function Rings({ at, level, color = '#8fd3ff', r0 = 0.25, r1 = 2.4, n = 5, speed = 0.5, flat = false, half = false }: { at: V3; level: () => number; color?: string; r0?: number; r1?: number; n?: number; speed?: number; flat?: boolean; half?: boolean }) {
  const f = useRef(level); f.current = level
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const geo = useMemo(() => new THREE.RingGeometry(0.978, 1, 96, 1, 0, half ? Math.PI : Math.PI * 2), [half])
  useFrame(({ clock }) => {
    const a = Math.min(1, Math.max(0, f.current())), t = clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const p = (t * speed + i / n) % 1
      m.scale.setScalar(r0 + p * (r1 - r0)); m.visible = a > 0.01
      ;(m.material as THREE.MeshBasicMaterial).opacity = a * Math.min(1, p * 5) * (1 - p) ** 1.2 * 0.9
    })
  })
  return <group position={at} rotation-x={flat ? -Math.PI / 2 : 0}>
    {Array.from({ length: n }, (_, i) => <mesh key={i} ref={e => { refs.current[i] = e }} geometry={geo} renderOrder={6} visible={false}><meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} /></mesh>)}
  </group>
}

// ---------- 木头 ----------
export function useWood(kind: 'beech' | 'spruce' | 'dark' = 'beech') {
  return useMemo(() => kind === 'beech' ? makeWood('#c59a62', '92,58,24', 21, 2, 1) : kind === 'spruce' ? makeWood('#d9a85c', '128,70,22', 5, 1, 3) : makeWood('#3a2518', '10,5,2', 13, 2, 1), [kind])
}
const Rubber = () => <meshStandardMaterial color="#101113" roughness={0.85} />

// ---------- 音叉和共鸣箱 ----------
const BOX = { L: 1.5, H: 0.5, D: 0.7, t: 0.05, foot: 0.04 }
/** 共鸣箱顶面、叉臂根部、叉臂顶端各有多高；两条叉臂离中线多远 */
export const FORK = { y0: BOX.foot + BOX.H, root: BOX.foot + BOX.H + 0.4825, top: BOX.foot + BOX.H + 1.4825, dx: 0.14, half: 0.0425 }
const COLLAR = lathe([[0, 0], [0.12, 0], [0.12, 0.03], [0.07, 0.06], [0, 0.06]], { segs: 28 })
const UBEND = (() => {
  const s = new THREE.Shape(), R = FORK.dx + FORK.half, r = FORK.dx - FORK.half
  s.moveTo(-R, 0); s.absarc(0, 0, R, Math.PI, Math.PI * 2, false); s.lineTo(r, 0); s.absarc(0, 0, r, Math.PI * 2, Math.PI, true); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2, curveSegments: 20 }); g.translate(0, 0, -0.05)
  return g
})()
/** 一支音叉，插在共鸣箱上。level：现在振动得多厉害（0–1）；open：共鸣箱哪一头开口（1 朝右，−1 朝左）。叉臂的摆动是放慢、放大了画的 */
export function Fork({ x, z = 0, level, open = 1 }: { x: number; z?: number; level: () => number; open?: 1 | -1 }) {
  const wood = useWood('beech'), f = useRef(level); f.current = level
  const a = useRef<THREE.Group>(null), b = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { const q = 0.05 * Math.min(1, f.current()) * Math.sin(clock.elapsedTime * 22); if (a.current) a.current.rotation.z = q; if (b.current) b.current.rotation.z = -q })
  const W = <meshPhysicalMaterial map={wood} roughness={0.55} clearcoat={0.35} clearcoatRoughness={0.4} />
  const { L, H, D, t, foot } = BOX
  const steel = <Metal kind="stainless" grain="brushed" rough={0.22} env={ENV} />
  return <group position={[x, 0, z]}>
    {/* 共鸣箱：四块木板围成、一头开口的空箱子，下面四只橡胶脚 */}
    <RoundedBox args={[L, t, D]} radius={0.012} position={[0, foot + t / 2, 0]} castShadow>{W}</RoundedBox>
    <RoundedBox args={[L, t, D]} radius={0.012} position={[0, foot + H - t / 2, 0]} castShadow>{W}</RoundedBox>
    {[-1, 1].map(s => <mesh key={s} position={[0, foot + H / 2, s * (D / 2 - t / 2)]} castShadow><boxGeometry args={[L - 0.01, H - 2 * t, t]} />{W}</mesh>)}
    <mesh position={[-open * (L / 2 - t / 2), foot + H / 2, 0]}><boxGeometry args={[t, H - 2 * t, D - 2 * t]} />{W}</mesh>
    <mesh position={[0, foot + H / 2, 0]}><boxGeometry args={[L - 0.12, H - 2 * t - 0.01, D - 2 * t - 0.01]} /><meshStandardMaterial color="#2a1a0e" roughness={1} side={THREE.BackSide} /></mesh>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * (L / 2 - 0.14), foot / 2, sz * (D / 2 - 0.12)]}><cylinderGeometry args={[0.06, 0.06, foot, 14]} /><Rubber /></mesh>))}
    {/* 音叉：柄、U 形的弯、两条叉臂 */}
    <mesh geometry={COLLAR} position-y={FORK.y0}>{steel}</mesh>
    <mesh position-y={FORK.y0 + 0.16}><cylinderGeometry args={[0.045, 0.045, 0.32, 20]} />{steel}</mesh>
    <mesh geometry={UBEND} position-y={FORK.root} castShadow>{steel}</mesh>
    {[[-1, a], [1, b]].map(([s, ref]) => <group key={s as number} ref={ref as React.RefObject<THREE.Group | null>} position={[(s as number) * FORK.dx, FORK.root, 0]}>
      <RoundedBox args={[FORK.half * 2, 1.0, 0.1]} radius={0.01} position-y={0.5} castShadow>{steel}</RoundedBox>
    </group>)}
  </group>
}

// ---------- 铁架台上吊着的小球 ----------
const BOSS = lathe([[0, 0], [0.012, 0], [0.012, 0.03], [0.04, 0.03], [0.045, 0.036], [0.045, 0.06], [0.04, 0.066], [0, 0.066]], { segs: 16 })
/** x、z：底座的位置；to：线挂在哪（工作台坐标）；len：线长；dir：小球被弹向哪边；level：音叉振动得多厉害 */
export function BallStand({ x, z = -0.6, to, len, dir, level }: { x: number; z?: number; to: [number, number]; len: number; dir: 1 | -1; level: () => number }) {
  const f = useRef(level); f.current = level
  const swing = useRef<THREE.Group>(null), amp = useRef(0)
  useFrame(({ clock }, dt) => {
    amp.current += (Math.min(1, f.current() * 1.5) - amp.current) * Math.min(1, dt * 6)
    if (swing.current) swing.current.rotation.z = dir * 0.6 * amp.current * Math.abs(Math.sin(clock.elapsedTime * 7.5))
  })
  const top = to[1] + 0.3
  return <group>
    <RoundedBox args={[1.1, 0.09, 0.75]} radius={0.025} position={[x, 0.045, z + 0.2]} castShadow><meshPhysicalMaterial color="#27333d" roughness={0.5} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
    <mesh position={[x, 0.09 + top / 2, z]} castShadow><cylinderGeometry args={[0.035, 0.035, top, 16]} /><Metal kind="chrome" rough={0.14} env={ENV} /></mesh>
    <mesh position={[x, 0.11, z]}><cylinderGeometry args={[0.07, 0.08, 0.05, 6]} /><Metal kind="steel" env={ENV} /></mesh>
    {/* 十字夹和横杆 */}
    <RoundedBox args={[0.16, 0.16, 0.16]} radius={0.02} position={[x, to[1], z]}><Metal kind="aluminum" grain="cast" env={ENV} /></RoundedBox>
    <mesh geometry={BOSS} position={[x, to[1], z - 0.08]} rotation-x={-Math.PI / 2}><Metal kind="steel" env={ENV} /></mesh>
    <Rod from={[x + (to[0] > x ? -0.2 : 0.2), to[1], z]} to={[to[0], to[1], 0]} r={0.022}><Metal kind="chrome" rough={0.14} env={ENV} /></Rod>
    <group ref={swing} position={[to[0], to[1], 0]}>
      <mesh position-y={-len / 2}><cylinderGeometry args={[0.006, 0.006, len, 6]} /><meshStandardMaterial color="#d9d4c6" roughness={0.9} /></mesh>
      <mesh position-y={-len} castShadow><sphereGeometry args={[0.1, 28, 20]} /><meshPhysicalMaterial color="#f08a2c" roughness={0.35} clearcoat={0.4} /></mesh>
    </group>
  </group>
}

// ---------- 橡皮槌、手套 ----------
/** 摆放的姿势：槌头（或手心）的位置，和绕着朝向镜头那根轴转过的角度 */
export interface Pose { p: V3; a: number; rx?: number }
const ease = (k: number) => k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2
/** 橡皮槌：平时躺在 rest，敲的时候挥到 hit 再收回来。t0：这一下是什么时候开始挥的（毫秒） */
export function Mallet({ rest, hit, t0 }: { rest: Pose; hit: Pose; t0: number | null }) {
  const g = useRef<THREE.Group>(null), wood = useWood('beech')
  useFrame(() => {
    if (!g.current) return
    const dt = t0 == null ? 1e9 : performance.now() - t0
    const k = dt < 0 ? 0 : dt < SWING ? (dt / SWING) ** 2.2 : Math.max(0, 1 - ease(Math.min(1, (dt - SWING) / 800)))
    g.current.position.set(rest.p[0] + (hit.p[0] - rest.p[0]) * k, rest.p[1] + (hit.p[1] - rest.p[1]) * k + Math.sin(k * Math.PI) * 0.35, rest.p[2] + (hit.p[2] - rest.p[2]) * k)
    g.current.rotation.z = rest.a + (hit.a - rest.a) * k
  })
  return <group ref={g} position={rest.p} rotation-z={rest.a}>
    <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.11, 0.11, 0.28, 24]} /><meshStandardMaterial color="#1a1b1e" roughness={0.75} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position-z={s * 0.142} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.1, 0.1, 0.006, 24]} /><meshStandardMaterial color="#2c2d31" roughness={0.6} /></mesh>)}
    <mesh position-x={-0.72} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.03, 0.036, 1.3, 14]} /><meshPhysicalMaterial map={wood} roughness={0.5} clearcoat={0.4} /></mesh>
    <mesh position-x={-0.115} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.042, 0.042, 0.05, 14]} /><Metal kind="brass" rough={0.3} env={ENV} /></mesh>
  </group>
}
/** 一只白手套：k 从 0 到 1，从 rest 挪到 hold（按住正在振动的东西）。手指朝下 */
export function Glove({ rest, hold, k }: { rest: Pose; hold: Pose; k: number }) {
  const e = ease(k), m = <meshStandardMaterial color="#e6e2d6" roughness={0.95} />
  return <group position={[rest.p[0] + (hold.p[0] - rest.p[0]) * e, rest.p[1] + (hold.p[1] - rest.p[1]) * e + Math.sin(e * Math.PI) * 0.5, rest.p[2] + (hold.p[2] - rest.p[2]) * e]} rotation={[(rest.rx ?? 0) + ((hold.rx ?? 0) - (rest.rx ?? 0)) * e, 0, rest.a + (hold.a - rest.a) * e]}>
    <RoundedBox args={[0.46, 0.4, 0.2]} radius={0.08} castShadow>{m}</RoundedBox>
    {[-0.165, -0.055, 0.055, 0.165].map((x, i) => <mesh key={x} position={[x, -0.3 - (i === 1 || i === 2 ? 0.03 : 0), 0.03]} rotation-x={0.25} castShadow><capsuleGeometry args={[0.048, 0.22 + (i === 1 || i === 2 ? 0.06 : 0), 6, 12]} />{m}</mesh>)}
    <mesh position={[-0.27, -0.1, 0.06]} rotation-z={-0.7} castShadow><capsuleGeometry args={[0.052, 0.16, 6, 12]} />{m}</mesh>
    <mesh position-y={0.27}><cylinderGeometry args={[0.2, 0.23, 0.16, 20]} /><meshStandardMaterial color="#cfcabb" roughness={1} /></mesh>
  </group>
}

// ---------- 鼓 ----------
const DRUM_SHELL = lathe([[0, 0.18], [0.7, 0.18], [0.745, 0.3], [0.745, 0.86], [0.7, 0.98], [0, 0.98]], { segs: 56 })
const DRUM_HOOP = lathe([[0.715, 0], [0.79, 0], [0.8, 0.012], [0.8, 0.058], [0.79, 0.07], [0.715, 0.07]], { segs: 56, closed: true })
const DRUM_HEAD = disc(0.72, 0.03, { segs: 56 })
const DRUM_LUGS = mergeGeometries(Array.from({ length: 8 }, (_, i) => {
  const a = i / 8 * Math.PI * 2 + 0.2, c = Math.cos(a), s = Math.sin(a)
  const lug = new THREE.BoxGeometry(0.06, 0.2, 0.09); lug.rotateY(-a); lug.translate(0.765 * c, 0.58, 0.765 * s)
  const rod = new THREE.CylinderGeometry(0.013, 0.013, 0.8, 8); rod.translate(0.775 * c, 0.58, 0.775 * s)
  return mergeGeometries([lug, rod])
}))
const DRUM_NUTS = (() => { const g = bolts(8, 0.775, 0.05, 0.04); g.rotateY(-0.2); return g })()
/** 鼓面有多高 */
export const DRUM_TOP = 1.01
const SCRAPS = Array.from({ length: 14 }, (_, i) => { const a = i * 2.4, r = 0.12 + (i * 37 % 100) / 100 * 0.42; return { x: Math.cos(a) * r, z: Math.sin(a) * r, w: 6 + (i * 7 % 5), ph: i * 1.7, h: 0.5 + (i * 53 % 100) / 100, c: ['#f4f1e6', '#ffd24a', '#7fe3d4', '#ff8fb3'][i % 4] } })
/** 一面小鼓，鼓面朝上，上面撒着碎纸屑。level：鼓面振动得多厉害（0–1），纸屑跟着跳 */
export function Drum({ x, z = 0, level, jump = 0.5 }: { x: number; z?: number; level: () => number; jump?: number }) {
  const f = useRef(level); f.current = level
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const a = Math.min(1.5, f.current()), t = clock.elapsedTime
    refs.current.forEach((m, i) => { if (!m) return; const s = SCRAPS[i], up = a * jump * s.h * Math.abs(Math.sin(t * s.w + s.ph)); m.position.y = DRUM_TOP + 0.006 + up; m.rotation.set(up * 3 * Math.sin(s.ph), s.ph + up * 2, up * 4 * Math.cos(s.ph)) })
  })
  return <group position={[x, 0, z]}>
    {[0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + 0.5; return <group key={i} position={[Math.cos(a) * 0.52, 0, Math.sin(a) * 0.52]}><mesh position-y={0.11}><cylinderGeometry args={[0.035, 0.035, 0.16, 12]} /><Metal kind="chrome" rough={0.15} env={ENV} /></mesh><mesh position-y={0.02}><cylinderGeometry args={[0.055, 0.06, 0.04, 14]} /><Rubber /></mesh></group> })}
    <mesh geometry={DRUM_SHELL} castShadow><meshPhysicalMaterial color="#8c1a1c" roughness={0.3} clearcoat={1} clearcoatRoughness={0.12} envMapIntensity={1.6} /></mesh>
    <mesh geometry={DRUM_HOOP} position-y={0.15} castShadow><Metal kind="chrome" rough={0.12} env={ENV} /></mesh>
    <mesh geometry={DRUM_HOOP} position-y={0.94} castShadow><Metal kind="chrome" rough={0.12} env={ENV} /></mesh>
    <mesh geometry={DRUM_LUGS}><Metal kind="chrome" rough={0.16} env={ENV} /></mesh>
    <mesh geometry={DRUM_NUTS} position-y={1.01}><Metal kind="steel" env={ENV} /></mesh>
    <mesh geometry={DRUM_HEAD} position-y={0.98} receiveShadow><meshStandardMaterial color="#b3aa94" roughness={0.8} /></mesh>
    {SCRAPS.map((s, i) => <mesh key={i} ref={e => { refs.current[i] = e }} position={[s.x, DRUM_TOP + 0.006, s.z]}><boxGeometry args={[0.075, 0.006, 0.05]} /><meshStandardMaterial color={s.c} roughness={0.9} /></mesh>)}
  </group>
}

// ---------- 示波器 ----------
const KNOB = lathe([[0, 0], [0.085, 0], [0.085, 0.02], [0.062, 0.02], [0.058, 0.09], [0.05, 0.1], [0, 0.1]], { segs: 24 })
const BNC = lathe([[0, 0], [0.05, 0], [0.05, 0.02], [0.034, 0.02], [0.034, 0.08], [0, 0.08]], { segs: 16 })
/** trace：给出现在屏上那条曲线，u 从 0 到 1 是屏的左边到右边，返回 −1 到 1；返回 null 就是一条平线 */
export function Scope({ x, z = 0, ry = 0, trace }: { x: number; z?: number; ry?: number; trace: (t: number) => ((u: number) => number) | null }) {
  const f = useRef(trace); f.current = trace
  const { tex, g } = useMemo(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { tex: t, g: c.getContext('2d')! } }, [])
  useFrame(({ clock }) => {
    const W = 320, H = 240, y = f.current(clock.elapsedTime)
    g.shadowBlur = 0; g.fillStyle = '#04120d'; g.fillRect(0, 0, W, H)
    g.strokeStyle = '#17463a'; g.lineWidth = 1; g.beginPath()
    for (let i = 1; i < 8; i++) { g.moveTo(i * W / 8, 0); g.lineTo(i * W / 8, H) }
    for (let i = 1; i < 6; i++) { g.moveTo(0, i * H / 6); g.lineTo(W, i * H / 6) }
    g.stroke()
    g.strokeStyle = '#8dffc0'; g.lineWidth = 3.2; g.shadowColor = '#3dffa0'; g.shadowBlur = 9; g.lineJoin = 'round'; g.beginPath()
    for (let i = 0; i <= 160; i++) { const u = i / 160, v = y ? y(u) : 0, py = H / 2 - v * H * 0.4; if (i) g.lineTo(u * W, py); else g.moveTo(u * W, py) }
    g.stroke(); tex.needsUpdate = true
  })
  const paint = <meshPhysicalMaterial color="#b8b3a4" roughness={0.45} clearcoat={0.5} clearcoatRoughness={0.3} />
  return <group position={[x, 0, z]} rotation-y={ry}>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 0.9, 0.05, sz * 0.55]}><cylinderGeometry args={[0.08, 0.09, 0.1, 14]} /><Rubber /></mesh>))}
    <RoundedBox args={[2.3, 1.45, 1.5]} radius={0.06} position={[0, 0.825, 0]} castShadow>{paint}</RoundedBox>
    {/* 面板：一块深色的铝板，四角四颗螺丝；左边是屏，右边是旋钮和接口 */}
    <RoundedBox args={[2.16, 1.31, 0.05]} radius={0.02} position={[0, 0.825, 0.745]}><meshStandardMaterial color="#22272c" roughness={0.5} metalness={0.5} /></RoundedBox>
    {[-1, 1].flatMap(sx => [-1, 1].map(sy => <mesh key={`${sx}${sy}`} position={[sx * 1.02, 0.825 + sy * 0.6, 0.772]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.022, 0.022, 0.012, 6]} /><Metal kind="steel" env={ENV} /></mesh>))}
    <RoundedBox args={[1.3, 1.02, 0.05]} radius={0.04} position={[-0.36, 0.86, 0.765]}><meshStandardMaterial color="#0c0e10" roughness={0.4} /></RoundedBox>
    <mesh position={[-0.36, 0.86, 0.792]}><planeGeometry args={[1.16, 0.87]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    {([[0.56, 1.18], [0.9, 1.18], [0.56, 0.82], [0.9, 0.82]] as const).map(([kx, ky], i) => <group key={i} position={[kx, ky, 0.77]} rotation-x={Math.PI / 2} scale={i < 2 ? 1 : 0.8}>
      <mesh geometry={KNOB} castShadow><meshStandardMaterial color="#15171a" roughness={0.45} /></mesh>
      <mesh position={[0, 0.101, -0.03]}><boxGeometry args={[0.012, 0.004, 0.04]} /><meshBasicMaterial color="#e9e4d4" /></mesh>
    </group>)}
    {[0.5, 0.73, 0.96].map(bx => <mesh key={bx} geometry={BNC} position={[bx, 0.42, 0.77]} rotation-x={Math.PI / 2}><Metal kind="stainless" grain="turned" env={ENV} /></mesh>)}
    <mesh position={[0.73, 0.6, 0.775]}><boxGeometry args={[0.5, 0.012, 0.004]} /><meshBasicMaterial color="#7a8088" /></mesh>
    <mesh position={[-0.9, 0.3, 0.775]}><sphereGeometry args={[0.022, 10, 8]} /><meshBasicMaterial color="#7dffb0" toneMapped={false} /></mesh>
    {/* 顶上的提手 */}
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.5, 1.6, 0]}><boxGeometry args={[0.06, 0.12, 0.2]} /><meshStandardMaterial color="#15171a" roughness={0.5} /></mesh>)}
    <RoundedBox args={[1.06, 0.06, 0.18]} radius={0.025} position={[0, 1.67, 0]}><meshStandardMaterial color="#15171a" roughness={0.5} /></RoundedBox>
  </group>
}

// ---------- 话筒 ----------
const MIC_BASE = disc(0.3, 0.06)
const MIC_BODY = lathe([[0, 0], [0.05, 0], [0.055, 0.02], [0.07, 0.4], [0.075, 0.42], [0.075, 0.46], [0, 0.46]], { segs: 24 })
/** 一支话筒，立在小圆座上，话筒头朝 dir 那一边（−1 朝左），头在 h 高处 */
export function Mic({ x, z = 0, h = 1.2, dir = -1 }: { x: number; z?: number; h?: number; dir?: 1 | -1 }) {
  return <group position={[x, 0, z]}>
    <mesh geometry={MIC_BASE} castShadow><Metal kind="iron" grain="cast" env={ENV} /></mesh>
    <mesh position-y={0.06 + (h - 0.06) / 2}><cylinderGeometry args={[0.022, 0.022, h - 0.06, 14]} /><Metal kind="chrome" rough={0.14} env={ENV} /></mesh>
    <mesh position-y={h} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 0.12, 14]} /><Rubber /></mesh>
    <group position-y={h + 0.04} rotation-z={dir * (Math.PI / 2 - 0.12)}>
      <group position-y={-0.2}>
        <mesh geometry={MIC_BODY} castShadow><meshStandardMaterial color="#1b1d21" roughness={0.4} metalness={0.6} envMapIntensity={ENV} /></mesh>
        <mesh position-y={0.44}><cylinderGeometry args={[0.078, 0.078, 0.03, 24]} /><Metal kind="chrome" rough={0.12} env={ENV} /></mesh>
        <mesh position-y={0.54}><sphereGeometry args={[0.105, 24, 18]} /><Metal kind="stainless" grain="cast" rough={0.5} env={ENV} /></mesh>
      </group>
    </group>
  </group>
}
/** 话筒头在工作台上的位置 */
export const micHead = (x: number, h = 1.2, dir: 1 | -1 = -1): [number, number] => [x + dir * 0.36, h + 0.08]

// ---------- 分贝仪 ----------
/** 一只手持式分贝仪，架在小三脚架上，顶上是套着防风球的话筒。text 是屏上的读数 */
export function Meter({ x, z = 0, text }: { x: number; z?: number; text: string }) {
  return <group position={[x, 0, z]}>
    {[0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + Math.PI / 6; return <group key={i}><Rod from={[Math.cos(a) * 0.36, 0.02, Math.sin(a) * 0.36]} to={[Math.cos(a) * 0.04, 0.46, Math.sin(a) * 0.04]} r={0.02}><Metal kind="aluminum" grain="brushed" env={ENV} /></Rod><mesh position={[Math.cos(a) * 0.36, 0.02, Math.sin(a) * 0.36]}><sphereGeometry args={[0.035, 10, 8]} /><Rubber /></mesh></group> })}
    <mesh position-y={0.5}><cylinderGeometry args={[0.06, 0.07, 0.12, 16]} /><meshStandardMaterial color="#15171a" roughness={0.5} /></mesh>
    <mesh position-y={0.59}><sphereGeometry args={[0.05, 16, 12]} /><Metal kind="steel" env={ENV} /></mesh>
    <group position-y={0.62}>
      <RoundedBox args={[0.5, 0.96, 0.2]} radius={0.06} position-y={0.48} castShadow><meshStandardMaterial color="#e2681c" roughness={0.6} /></RoundedBox>
      <RoundedBox args={[0.43, 0.9, 0.2]} radius={0.04} position={[0, 0.48, 0.015]}><meshStandardMaterial color="#24282d" roughness={0.45} /></RoundedBox>
      <Led text={text} w={0.36} h={0.2} position={[0, 0.72, 0.117]} />
      {[-0.1, 0, 0.1].flatMap(bx => [0.4, 0.28].map(by => <RoundedBox key={`${bx}${by}`} args={[0.075, 0.065, 0.02]} radius={0.008} position={[bx, by, 0.12]}><meshStandardMaterial color={bx === -0.1 && by === 0.4 ? '#c8372d' : '#5a626b'} roughness={0.6} /></RoundedBox>))}
      <mesh position-y={1.02}><cylinderGeometry args={[0.03, 0.05, 0.14, 14]} /><Metal kind="aluminum" grain="turned" env={ENV} /></mesh>
      <mesh position-y={1.2} castShadow><sphereGeometry args={[0.15, 24, 18]} /><meshStandardMaterial color="#17181a" roughness={1} /></mesh>
    </group>
  </group>
}
/** 分贝仪的防风球有多高 */
export const METER_MIC = 1.82

// ---------- 读数盒、软管 ----------
/** 一只带屏的小盒子（计时器、信号源的读数） */
export function Readout({ x, z = 0, text, w = 1.0 }: { x: number; z?: number; text: string; w?: number }) {
  return <group position={[x, 0, z]}>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.1), 0.015, sz * 0.17]}><cylinderGeometry args={[0.04, 0.04, 0.03, 10]} /><Rubber /></mesh>))}
    <RoundedBox args={[w, 0.46, 0.5]} radius={0.04} position-y={0.26} castShadow><meshPhysicalMaterial color="#2c3238" roughness={0.45} clearcoat={0.4} /></RoundedBox>
    <Led text={text} w={w - 0.2} h={0.3} position={[0, 0.27, 0.252]} />
  </group>
}
/** 一根软管或电线：顺着几个点弯过去 */
export function Hose({ pts, r = 0.035, color = '#1b1c1f' }: { pts: V3[]; r?: number; color?: string }) {
  const key = pts.flat().map(v => v.toFixed(2)).join(',')
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 48, r, 10), [key, r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} castShadow><meshStandardMaterial color={color} roughness={0.6} /></mesh>
}
