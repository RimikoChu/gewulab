// 化验室里各课共用的小东西：这一课的舞台、把东西“拿起—平移—放下”的搬运、几个计时用的状态，
// 以及金属块、石块、橡皮泥、装冰的密封杯、铁球、眼睛。大小按真实尺寸乘 CM。
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, Metal, Rod, disc, makeGrain, makeGround, shell, type Label } from '@/lab-kit'
import type { Metal3 } from './physics'
import { AIR, CM, SPOT, type SpotKey, type Want } from './world'

export type V3 = [number, number, number]
/** 天平此刻的状态：左右两只托盘比水平位置高出多少、横梁的倾角。天平每帧写，盘里的东西每帧读 */
export interface Live { yL: number; yR: number; th: number }
export const newLive = (): Live => ({ yL: 0, yR: 0, th: 0 })

/** 这一课的舞台：选一处机位。在料场时开阳光，在屋里靠世界里的灯 */
export function Room({ at, labels, children = null }: { at: SpotKey; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, yard: v.yard }), [v])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.yard ? 2.6 : 0} {...AIR} world={want}>{children}</LabStage>
}

/** 一件事变了以后，过 ms 毫秒才算“稳住了”：天平摆动、砝码还在半路的时候不许读数 */
export function useSettled(sig: string | number, ms = 2200) {
  const [seen, setSeen] = useState(sig)
  useEffect(() => { if (seen === sig) return; const t = setTimeout(() => setSeen(sig), ms); return () => clearTimeout(t) }, [sig, seen, ms])
  return seen === sig
}
/** 分几段走完的一个动作（比如端过去、倾倒、端回来）：run() 开始，ph 是现在在第几段，0 是没在动 */
export function usePhase(ms: number[]) {
  const [ph, setPh] = useState(0), timers = useRef<number[]>([])
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => stop, [])
  const run = () => { stop(); setPh(1); let t = 0; ms.forEach((d, i) => { t += d; timers.current.push(window.setTimeout(() => setPh(i + 1 < ms.length ? i + 2 : 0), t)) }) }
  return { ph, run, cancel: () => { stop(); setPh(0) } }
}

/** 晚 ms 毫秒才跟上的值：东西还在半路上的时候，天平先不动 */
export function useLag<T>(v: T, ms: number) {
  const [seen, setSeen] = useState(v)
  useEffect(() => { if (Object.is(seen, v)) return; const t = setTimeout(() => setSeen(v), ms); return () => clearTimeout(t) }, [v, ms])   // eslint-disable-line react-hooks/exhaustive-deps
  return seen
}
/** 真正落在右盘里的砝码：夹走的很快就不算了，新加的要等镊子把它放稳 */
export function useLanded(on: readonly number[], ms = 850) {
  const [landed, setLanded] = useState<readonly number[]>(on), key = on.join()
  useEffect(() => {
    const a = setTimeout(() => setLanded(l => l.filter(i => on.includes(i))), 220), b = setTimeout(() => setLanded(on), ms)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [key, ms])   // eslint-disable-line react-hooks/exhaustive-deps
  return landed
}

const ease = (t: number) => t * t * t * (t * (6 * t - 15) + 10)
/**
 * 搬运：at 一变，里面的东西先竖直提起来，平移过去，再竖直放下，不会横着撞到别的器材。
 * ride：落在哪只托盘上（落稳以后跟着托盘上下）；lift：平移时比两头高出多少；snap 变了就直接到位，不走过程；
 * extra：只在搬的过程中出现的东西（夹着它的镊子）；flag：每帧报告是不是还在路上。
 */
export function Carry({ at, ride = null, live, lift = 0.45, speed = 2, snap, extra, grip, held = false, flag, children }: { at: V3; ride?: 'L' | 'R' | null; live?: RefObject<Live>; lift?: number; speed?: number; snap?: string | number; extra?: ReactNode; grip?: [number, number, number?]; held?: boolean; flag?: (moving: boolean) => void; children: ReactNode }) {
  const g = useRef<THREE.Group>(null), ex = useRef<THREE.Group>(null)
  const s = useRef({ p: new THREE.Vector3(...at), from: new THREE.Vector3(...at), to: new THREE.Vector3(...at), t: 1, a: 0, b: 0, c: 0 })
  useLayoutEffect(() => { const q = s.current; q.p.set(...at); q.to.set(...at); q.t = 1 }, [snap])   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const q = s.current
    if (q.to.x === at[0] && q.to.y === at[1] && q.to.z === at[2]) return
    q.from.copy(q.p); q.to.set(...at); q.t = 0
    const dh = Math.hypot(at[0] - q.from.x, at[2] - q.from.z), top = Math.max(q.from.y, at[1]) + lift
    if (dh < 0.01) { q.a = 0; q.b = 0; q.c = Math.abs(at[1] - q.from.y) } else { q.a = top - q.from.y; q.b = dh; q.c = top - at[1] }
  }, [at[0], at[1], at[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    const q = s.current, dt = Math.min(d, 1 / 30), total = q.a + q.b + q.c
    if (q.t < 1) {
      q.t = Math.min(1, q.t + dt * speed / Math.max(total, 0.5))
      const u = ease(q.t) * total
      if (q.b === 0) q.p.set(q.to.x, q.from.y + (q.to.y - q.from.y) * ease(q.t), q.to.z)
      else if (u < q.a) q.p.set(q.from.x, q.from.y + u, q.from.z)
      else if (u < q.a + q.b) { const k = (u - q.a) / q.b; q.p.set(q.from.x + (q.to.x - q.from.x) * k, q.from.y + q.a, q.from.z + (q.to.z - q.from.z) * k) }
      else q.p.set(q.to.x, q.from.y + q.a - (u - q.a - q.b), q.to.z)
    }
    const off = ride && live?.current ? (ride === 'L' ? live.current.yL : live.current.yR) * q.t ** 6 : 0
    g.current?.position.set(q.p.x, q.p.y + off, q.p.z)
    if (ex.current) ex.current.visible = q.t < 1 || held
    flag?.(q.t < 1)
  })
  return <group ref={g} position={at}>{children}{(extra || grip) && <group ref={ex} visible={false}>{extra}{grip && <group position={[grip[2] ?? 0, grip[1], 0]}><Tongs w={grip[0]} /></group>}</group>}</group>
}

/**
 * 坩埚钳：两根钢杆在中间用一颗铆钉铰在一起，下面是往里弯的钳口，上面是两只指环。夹着 w 这么宽的东西，原点在钳口正中。
 * 东西不是自己飞过去的：搬的时候有它夹着
 */
export function Tongs({ w }: { w: number }) {
  const a = w / 2, py = Math.max(0.2, w * 0.9), top = py + 0.34
  const steel = <Metal kind="stainless" env={2} />
  return <group rotation-y={0.5}>
    {[-1, 1].map(s => <group key={s}>
      <Rod from={[s * (a - 0.012), 0.012, 0]} to={[s * (a + 0.02), 0.07, 0]} r={0.009}>{steel}</Rod>
      <Rod from={[s * (a + 0.02), 0.07, 0]} to={[0, py, 0]} r={0.009}>{steel}</Rod>
      <Rod from={[0, py, 0]} to={[-s * 0.07, top, 0]} r={0.009}>{steel}</Rod>
      <mesh position={[-s * 0.09, top + 0.035, 0]}><torusGeometry args={[0.04, 0.008, 8, 20]} />{steel}</mesh>
      <mesh position={[s * (a - 0.006), 0.012, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.05, 10]} /><meshStandardMaterial color="#2a2f33" roughness={0.8} /></mesh>
    </group>)}
    <mesh position={[0, py, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.014, 0.014, 0.03, 12]} />{steel}</mesh>
  </group>
}

// ---------- 金属块 ----------
/** 三种金属块的底色（线性空间）：铝银白、铜发红、铁发灰 */
const TONE: Record<Metal3, V3> = { al: [0.84, 0.86, 0.88], cu: [0.8, 0.34, 0.2], fe: [0.36, 0.37, 0.4] }
/**
 * 一块金属：长宽高按厘米给。表面是拉丝的加工纹，棱上有小倒角。底面在 y = 0。
 * 没有用公共的 Metal：平直的小面在摄影棚式的环境里只映出一片黑，三种金属分不出颜色；这里留一点漫反射，颜色才看得出来。
 */
export function Block({ kind, size }: { kind: Metal3; size: V3 }) {
  const [w, h, d] = size.map(x => x * CM)
  const grain = useMemo(() => makeGrain('brushed', [3, 5]), [])
  const color = useMemo(() => new THREE.Color().setRGB(...TONE[kind]), [kind])
  return <RoundedBox args={[w, h, d]} radius={0.007} smoothness={3} position={[0, h / 2, 0]} castShadow><meshStandardMaterial color={color} metalness={0.62} roughness={0.62} roughnessMap={grain} envMapIntensity={1.8} /></RoundedBox>
}
/** 一只铁球：车出来的，中间一道合缝 */
export function Ball({ r }: { r: number }) {
  return <group position={[0, r, 0]}>
    <mesh castShadow><sphereGeometry args={[r, 32, 24]} /><Metal kind="steel" grain="turned" rough={0.4} env={1.5} /></mesh>
    <mesh rotation-x={Math.PI / 2}><torusGeometry args={[r, r * 0.02, 6, 40]} /><Metal kind="iron" /></mesh>
  </group>
}

// ---------- 石块 ----------
/** 不规则的多面体：一个二十面体，每个顶点往里往外挪一点，再压成长条。半径按厘米给 */
function rock(rx: number, ry: number, rz: number) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, seen = new Map<string, number>()
  let s = 17; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`
    if (!seen.has(key)) seen.set(key, 0.9 + rnd() * 0.2)
    const k = seen.get(key)!
    p.setXYZ(i, p.getX(i) * k * rx * CM, p.getY(i) * k * ry * CM, p.getZ(i) * k * rz * CM)
  }
  g.computeVertexNormals()
  return g
}
const ROCK = rock(1.25, 3.3, 1.2)
export const STONE_H = 3.3 * CM          // 石块的半高
/**
 * 石块，拴着一根细线。thread：'coil' 放在台面上，线盘在旁边；'wrap' 平放，线绕在石块上；'hook' 竖着吊在量筒里，线顺着筒壁上去、搭在筒口外面，up 是石块中心到筒口的高度。
 * 平放时底面在 y = 0；竖放时原点在石块中心
 */
export function Stone({ thread, up = 0.6 }: { thread: 'coil' | 'hook' | 'wrap'; up?: number }) {
  const map = useMemo(() => { const t = makeGround('#3d3935', '78,72,64', '22,21,20', 23); t.repeat.set(2, 2); return t }, [])
  const line = useMemo(() => {
    const pts: V3[] = thread === 'hook'
      ? [[0, STONE_H * 0.92, 0], [0.03, STONE_H + 0.1, 0], [0.075, up - 0.12, 0], [0.085, up - 0.01, 0], [0.11, up + 0.012, 0], [0.135, up - 0.03, 0], [0.13, up - 0.26, 0]]
      : [[0, 0.07, 0.03], [0.1, 0.09, 0.08], [0.22, 0.012, 0.12], [0.34, 0.008, 0.02], [0.4, 0.008, 0.12], [0.3, 0.008, 0.2], [0.22, 0.008, 0.12], [0.3, 0.008, 0.06], [0.44, 0.008, 0.1]]
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.4), 48, 0.0045, 6)
  }, [thread, up])
  const lying = thread !== 'hook'
  return <group>
    <mesh geometry={ROCK} castShadow {...(lying ? { rotation: [0, 0.4, Math.PI / 2 - 0.08] as V3, position: [0, 1.22 * CM, 0] as V3 } : {})}><meshStandardMaterial map={map} color="#b9b2a8" roughness={0.92} flatShading /></mesh>
    {thread === 'wrap'
      ? [-0.02, 0.012].map(x => <mesh key={x} position={[x, 1.22 * CM, 0]} rotation={[0, Math.PI / 2 + 0.4, 0]}><torusGeometry args={[0.079, 0.0045, 6, 28]} /><meshStandardMaterial color="#e9e4d4" roughness={0.9} /></mesh>)
      : <mesh geometry={line}><meshStandardMaterial color="#e9e4d4" roughness={0.9} /></mesh>}
  </group>
}

// ---------- 橡皮泥 ----------
const LUMP = (() => { const g = new THREE.SphereGeometry(0.135, 40, 28), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + 0.035 * Math.sin(p.getX(i) * 40) * Math.cos(p.getZ(i) * 34 + p.getY(i) * 20); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k) } g.computeVertexNormals(); return g })()
/** 一块橡皮泥：flat 从 0 到 1，由一个球慢慢压成一张饼，体积不变。底面在 y = 0 */
export function Clay({ flat }: { flat: number }) {
  const w = 1 + 0.62 * flat, h = 1 / (w * w)
  return <mesh geometry={LUMP} scale={[w, h, w]} position={[0, 0.135 * h, 0]} castShadow><meshStandardMaterial color="#c8663f" roughness={0.82} /></mesh>
}

// ---------- 装着冰的密封杯 ----------
const CUP = shell([[0, 0], [0.15, 0], [0.165, 0.016], [0.165, 0.3], [0.172, 0.31]], 0.008, { segs: 40 })
const LID = disc(0.18, 0.02, { chamfer: 0.006 }), LID_KNOB = disc(0.05, 0.03, { chamfer: 0.008 })
const ICE: [number, number, number, number][] = [[-0.05, 0.03, 0.02, 0.3], [0.055, 0.035, -0.03, 1.1], [0.0, 0.12, 0.03, 0.7], [-0.02, 0.2, -0.02, 2.0]]
/** 一只盖着盖子的小杯，里面几块冰。melt 从 0 到 1：冰块化小，杯底的水涨到 water 这么高（画面里的单位）。底面在 y = 0 */
export function IceCup({ melt, water }: { melt: number; water: number }) {
  const k = 1 - melt, lv = water * melt
  return <group>
    <mesh geometry={CUP} renderOrder={3}><meshPhysicalMaterial color="#2c4149" transparent opacity={0.14} roughness={0.03} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={2.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={LID} position-y={0.31} castShadow><meshPhysicalMaterial color="#2f6f8f" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={LID_KNOB} position-y={0.33}><meshPhysicalMaterial color="#2f6f8f" roughness={0.4} clearcoat={0.5} /></mesh>
    {lv > 0.002 && <mesh position={[0, 0.008 + lv / 2, 0]} renderOrder={2}><cylinderGeometry args={[0.155, 0.15, lv, 32]} /><meshPhysicalMaterial color="#8cc4e4" transparent opacity={0.5} roughness={0.08} depthWrite={false} /></mesh>}
    {k > 0.03 && ICE.map(([x, y, z, r], i) => <RoundedBox key={i} args={[0.11, 0.1, 0.1]} radius={0.02} smoothness={3} position={[x * (0.4 + 0.6 * k), 0.012 + (y + 0.05) * k + lv * 0.6, z * (0.4 + 0.6 * k)]} rotation={[r, r * 1.7, r * 0.6]} scale={Math.max(0.05, k)}><meshPhysicalMaterial color="#eef7fb" transparent opacity={0.82} roughness={0.25} clearcoat={0.8} envMapIntensity={1.6} /></RoundedBox>)}
  </group>
}

/** 读数的人的眼睛：只画一只眼球，瞳孔朝 +x */
export function Eye() {
  return <group>
    <mesh castShadow><sphereGeometry args={[0.075, 24, 18]} /><meshPhysicalMaterial color="#f1ebe4" roughness={0.35} clearcoat={0.8} /></mesh>
    <mesh position={[0.058, 0, 0]} rotation-z={-Math.PI / 2}><sphereGeometry args={[0.042, 20, 10, 0, Math.PI * 2, 0, 1.1]} /><meshStandardMaterial color="#4a6f8f" roughness={0.4} /></mesh>
    <mesh position={[0.071, 0, 0]} rotation-z={-Math.PI / 2}><sphereGeometry args={[0.03, 16, 8, 0, Math.PI * 2, 0, 0.75]} /><meshStandardMaterial color="#14181c" roughness={0.3} /></mesh>
  </group>
}

/** 一条细线（视线、尺寸线）：从 a 到 b，不受光照影响 */
export function Line({ a, b, color = '#ffd24a', r = 0.006, dash = false }: { a: V3; b: V3; color?: string; r?: number; dash?: boolean }) {
  const n = dash ? Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.07)) : 1
  return <>{Array.from({ length: n }, (_, i) => {
    if (dash && i % 2) return null
    const p = (k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], p0 = p(i / n), p1 = p((i + 1) / n)
    const d = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]), len = d.length()
    return <mesh key={i} position={[(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())}><cylinderGeometry args={[r, r, len, 8]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
  })}</>
}
