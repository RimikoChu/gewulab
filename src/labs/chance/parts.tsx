// 各课共用的东西：这一课的舞台和机位、按时长走完的动作、重复试验的计数器、频率折线图，
// 以及桌上的道具：骰子、乒乓球、摸球箱、手套、绒布托盘、小旗。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Metal, disc, shell, type Label } from '@/lab-kit'
import { f3 } from './physics'
import { makeFelt, makeWood } from './mats'
import { INSPECT_H, ST, TABLE_H, type Want } from './world'

export type V3 = [number, number, number]
export const spot = (x: number, y: number, z: number, w: number, h: number, az: number, el: number) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view: [az, el] as [number, number] })
const T = TABLE_H
/** 各课的机位：做试验时道具占画面中间 */
export const SPOT = {
  l1: spot(ST.l1.x, T + 0.2, ST.l1.z + 0.1, 1.3, 0.62, 0.0, 0.36),
  l2: spot(ST.l2.x - 0.02, T + 0.03, ST.l2.z + 0.0, 0.64, 0.3, -0.08, 0.66),
  l3: spot(ST.l3.x - 0.4, T + 0.26, ST.l3.z - 0.05, 0.62, 0.5, 0.12, 0.16),
  l3c: spot(ST.l3.x + 0.4, T + 0.02, ST.l3.z + 0.06, 0.5, 0.26, -0.05, 0.85),
  l4: spot(ST.l4.x, 1.2, ST.l4.z - 0.2, 1.0, 1.06, 0.0, 0.1),
  l5: spot(ST.l5.x, 1.1, ST.l5.z - 0.35, 1.1, 0.86, 0.05, 0.14),
  l6: spot(ST.l6.x + 0.02, T + 0.06, ST.l6.z + 0.0, 0.4, 0.24, -0.1, 0.52),
  l7: spot(ST.l7.x - 0.05, INSPECT_H + 0.05, ST.l7.z - 0.65, 2.6, 1.35, 0.32, 0.45),
  x: spot(ST.x.x - 0.15, T + 0.01, ST.x.z + 0.02, 0.7, 0.38, 0.0, 0.88),
  xt: spot(ST.x.x + 0.36, T + 0.01, ST.x.z + 0.02, 0.56, 0.3, 0.0, 0.8),
  q: spot(9, 1.3, -5.2, 7.5, 3.6, 1.12, 0.13),
}
export type SpotKey = keyof typeof SPOT

/** 这一课的舞台：选一处机位。车间里自己打光：摄影棚式的环境光、工作灯跟到这一课 */
export function Place({ at, labels, children = null, ownLine }: { at: SpotKey; labels: Label[]; children?: ReactNode; ownLine?: boolean }) {
  const v = SPOT[at]
  const w = useMemo<Want>(() => ({ x: v.target.x, z: v.target.z, y: v.target.y, ownLine }), [v, ownLine])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sky={false} backdrop="#1b1f22" sun={1.1} env={0.55} studio fog={[60, 300]} bloom={0.35} world={w}>{children}</LabStage>
}

/** 缓入缓出 */
export const ease = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * k * (k * (6 * k - 15) + 10) }
/** 一个按时长走完的动作：run() 开始，k 从 0 匀速走到 1，走完调用 onEnd */
export function useRun(sec: number, onEnd?: () => void) {
  const [k, setK] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ k: 0, raf: 0 }), cb = useRef(onEnd); cb.current = onEnd
  const run = () => {
    cancelAnimationFrame(s.current.raf); s.current.k = 0; setK(0); setBusy(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      s.current.k = Math.min(1, s.current.k + dt / sec); setK(s.current.k)
      if (s.current.k < 1) s.current.raf = requestAnimationFrame(f); else { setBusy(false); cb.current?.() }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  return { k, busy, run, snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.k = v; setK(v); setBusy(false) } }
}

/**
 * 重复试验的计数器：做到第几次了。前 slow 次一次一次地做（每次 per 秒，k 是这一次做到哪了），后面快进，fast 秒数到目标。
 * 只用来驱动画面；结果都从计算核心按次数取。
 */
export function useTally(slow: number, per: number, fast: number, onEnd?: (n: number) => void) {
  const [n, setN] = useState(0), [k, setK] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ x: 0, raf: 0 }), cb = useRef(onEnd); cb.current = onEnd
  const go = (to: number) => {
    cancelAnimationFrame(s.current.raf); setBusy(true)
    const from = s.current.x, slowTo = Math.min(to, Math.max(from, slow))
    let last = performance.now(), t = 0
    const fastFrom = slowTo, fastDur = to > slowTo ? fast : 0, slowDur = (slowTo - from) * per
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt
      let x: number, kk = 0
      if (t < slowDur) { x = from + Math.floor(t / per); kk = (t / per) % 1 }
      else if (t < slowDur + fastDur) { const q = (t - slowDur) / fastDur; x = Math.floor(fastFrom + (to - fastFrom) * (1 - Math.pow(1 - q, 2))) }
      else x = to
      s.current.x = x; setN(x); setK(kk)
      if (x < to) s.current.raf = requestAnimationFrame(f); else { setBusy(false); setK(0); cb.current?.(to) }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  const reset = () => { cancelAnimationFrame(s.current.raf); s.current.x = 0; setN(0); setK(0); setBusy(false) }
  const jump = (to: number) => { cancelAnimationFrame(s.current.raf); s.current.x = to; setN(to); setK(0); setBusy(false) }
  return { n, k, busy, go, reset, jump, slowPhase: busy && n < slow }
}

// ---------- 频率折线图（面板里） ----------
/** 横轴是试验次数，纵轴是频率；p 处一条虚线。series 是累计频率，只画前 n 个 */
export function FreqChart({ series, n, max, p, pLabel, color = '#7fe3d4', other, ymax = 1 }: { series: number[]; n: number; max: number; p?: number; pLabel?: string; color?: string; other?: { series: number[]; n: number; color: string }; ymax?: number }) {
  const W = 290, H = 158, L = 34, R = 10, Tp = 10, B = 26
  const x = (i: number) => L + (i / max) * (W - L - R), y = (v: number) => Tp + (1 - Math.min(v, ymax) / ymax) * (H - Tp - B)
  const path = (s: number[], m: number) => { const k = Math.max(0, Math.min(m, s.length)), step = Math.max(1, Math.floor(k / 300)); let d = ''; for (let i = 0; i < k; i += step) d += `${d ? 'L' : 'M'}${x(i + 1).toFixed(1)},${y(s[i]).toFixed(1)}`; if (k) d += `L${x(k).toFixed(1)},${y(s[k - 1]).toFixed(1)}`; return d }
  const ticks = [0, max / 2, max]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="频率折线图">
      {[0, ymax / 2, ymax].map(v => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.12)" /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.55)">{v}</text></g>)}
      {ticks.map(t => <text key={t} x={x(t)} y={H - 8} textAnchor={t === 0 ? 'start' : t === max ? 'end' : 'middle'} fontSize="11" fill="rgba(255,255,255,0.55)">{t}</text>)}
      {p !== undefined && <g><line x1={L} x2={W - R} y1={y(p)} y2={y(p)} stroke="#ffe9a8" strokeDasharray="4 4" strokeWidth="1.5" />{pLabel && <text x={W - R} y={y(p) - 5} textAnchor="end" fontSize="11" fill="#ffe9a8">{pLabel}</text>}</g>}
      {other && <path d={path(other.series, other.n)} fill="none" stroke={other.color} strokeWidth="1.6" opacity="0.55" />}
      <path d={path(series, n)} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {n > 0 && series[Math.min(n, series.length) - 1] !== undefined && <circle cx={x(Math.min(n, series.length))} cy={y(series[Math.min(n, series.length) - 1])} r="3.5" fill={color} />}
      <text x={W - R} y={H - 20} textAnchor="end" fontSize="10.5" fill="rgba(255,255,255,0.4)">试验次数</text>
    </svg>
  )
}
/** 读数里的一行：频率 = 成功次数 ÷ 试验次数 */
export const freqLine = (m: number, n: number) => (n ? `${m} ÷ ${n} = ${f3(m / n)}` : '—')

// ---------- 骰子 ----------
/** 每一面的点：在 3 × 3 的格子里的位置 */
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
}
/** 每一面朝哪：1 朝上，6 朝下，2 朝前，5 朝后，3 朝右，4 朝左（相对两面加起来是 7） */
const FACE_N: Record<number, V3> = { 1: [0, 1, 0], 6: [0, -1, 0], 2: [0, 0, 1], 5: [0, 0, -1], 3: [1, 0, 0], 4: [-1, 0, 0] }
/** 让第 v 面朝上要转多少 */
export const FACE_UP: Record<number, V3> = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] }
/** 骰子的点坑：一张圆形贴图，画成凹下去的样子（上沿一道暗影、下沿一道亮边，坑底略浅），贴在面上 */
const pitCache = new Map<string, THREE.Texture>()
function pitTex(col: string) {
  const hit = pitCache.get(col); if (hit) return hit
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d')!
  const C = new THREE.Color(col), rgb = (k: number) => `rgb(${Math.round(Math.min(255, C.r * 255 * k))},${Math.round(Math.min(255, C.g * 255 * k))},${Math.round(Math.min(255, C.b * 255 * k))})`
  // 坑口一圈：下沿亮（光从上方来，照到坑的下壁），上沿暗
  const rim = g.createLinearGradient(0, 0, 0, S); rim.addColorStop(0, 'rgba(0,0,0,0.75)'); rim.addColorStop(1, 'rgba(255,255,255,0.75)')
  g.fillStyle = rim; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); g.fill()
  // 坑底：本色，往上偏一点，越往中心越亮一点
  const lo = C.getHSL({ h: 0, s: 0, l: 0 }).l < 0.2
  const q = g.createRadialGradient(S / 2, S * 0.56, 2, S / 2, S * 0.5, S * 0.44)
  q.addColorStop(0, rgb(lo ? 1 : 1.12)); q.addColorStop(0.75, rgb(lo ? 1 : 0.95)); q.addColorStop(1, rgb(0.7))
  g.fillStyle = lo ? '#202226' : q; g.beginPath(); g.arc(S / 2, S * 0.47, S * 0.42, 0, Math.PI * 2); g.fill()
  if (lo) { const d = g.createRadialGradient(S / 2, S * 0.6, 2, S / 2, S * 0.5, S * 0.44); d.addColorStop(0, 'rgba(70,72,78,0.9)'); d.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = d; g.beginPath(); g.arc(S / 2, S * 0.47, S * 0.42, 0, Math.PI * 2); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; pitCache.set(col, t); return t
}
/** 一种颜色的全部点坑合成一个模型：每个点是贴在面上的一片圆 */
function pipGeo(red: boolean) {
  const gs: THREE.BufferGeometry[] = []
  for (const v of [1, 2, 3, 4, 5, 6]) {
    if ((v === 1 || v === 4) !== red) continue
    const n = new THREE.Vector3(...FACE_N[v]), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
    const r = v === 1 ? 0.15 : 0.09, gap = 0.26
    for (const [a, b] of PIPS[v]) {
      const g = new THREE.CircleGeometry(r, 32)
      const p = new THREE.Vector3(a * gap, b * gap, 0.502).applyQuaternion(q)
      g.applyQuaternion(q); g.translate(p.x, p.y, p.z); gs.push(g)
    }
  }
  return mergeGeometries(gs)
}
let PIP: { black: THREE.BufferGeometry; red: THREE.BufferGeometry } | null = null
/** 一枚骰子：size 是边长（m），body 是骰子的颜色。圆角，点是凹下去的坑；1 点和 4 点红色（中国骰子的习惯），pips 给了就全用这个颜色 */
export function Die({ size = 0.025, body = '#f5f2ea', glow = false, pips }: { size?: number; body?: string; glow?: boolean; pips?: string }) {
  PIP ??= { black: pipGeo(false), red: pipGeo(true) }
  return <group scale={size}>
    <RoundedBox args={[1, 1, 1]} radius={0.14} smoothness={4} castShadow receiveShadow><meshPhysicalMaterial color={body} roughness={0.32} clearcoat={0.7} clearcoatRoughness={0.25} emissive={glow ? '#ffd76a' : '#000'} emissiveIntensity={glow ? 0.35 : 0} /></RoundedBox>
    <mesh geometry={PIP.black}><meshStandardMaterial map={pitTex(pips ?? '#17181b')} transparent alphaTest={0.02} roughness={0.55} polygonOffset polygonOffsetFactor={-2} /></mesh>
    <mesh geometry={PIP.red}><meshStandardMaterial map={pitTex(pips ?? '#c3271d')} transparent alphaTest={0.02} roughness={0.5} polygonOffset polygonOffsetFactor={-2} /></mesh>
  </group>
}
/**
 * 掷出去的骰子：k 从 0 到 1，从手里抛出、在空中翻滚、落到 to、弹两下停住，最后第 face 面朝上。
 * from、to 是骰子中心的位置；yaw 是停住时绕竖直轴的转角
 */
export function RollingDie({ k, from, to, face, yaw, size = 0.025, body, pips, spin = [1, 0.4, 0.7], glow }: { k: number; from: V3; to: V3; face: number; yaw: number; size?: number; body?: string; pips?: string; spin?: V3; glow?: boolean }) {
  const end = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...FACE_UP[face]))), [face, yaw])
  const axis = useMemo(() => new THREE.Vector3(...spin).normalize(), [spin[0], spin[1], spin[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  const a = ease(Math.min(1, k / 0.8)), fly = Math.min(1, k / 0.55)
  const q = k <= 0 ? end : end.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(axis, (1 - a) * Math.PI * 5))   // 没掷之前平放在桌上
  const x = from[0] + (to[0] - from[0]) * (1 - (1 - fly) ** 2), z = from[2] + (to[2] - from[2]) * (1 - (1 - fly) ** 2)
  const arc = fly < 1 ? from[1] + (to[1] - from[1]) * fly + Math.sin(fly * Math.PI) * 0.12 : to[1] + Math.abs(Math.sin((k - 0.55) / 0.45 * Math.PI * 2)) * 0.02 * (1 - (k - 0.55) / 0.45)
  return <group position={[x, arc, z]} quaternion={q}><Die size={size} body={body} pips={pips} glow={glow} /></group>
}

// ---------- 球、箱、托盘 ----------
export const BALL_R = 0.02
export const BALL_COL = { red: '#d4372c', white: '#f3f1ea' }
/** 一个乒乓球大小的塑料球 */
export function Ball({ color, at, r = BALL_R }: { color: string; at: V3; r?: number }) {
  return <mesh position={at} castShadow><sphereGeometry args={[r, 32, 20]} /><meshPhysicalMaterial color={color} roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.2} /></mesh>
}

/** 摸球箱：30 cm 见方的木箱，顶上一块盖板，中间一个手伸得进去的圆洞，洞口一圈黑布。opaque 为假时前后两面是透明亚克力（第 5 课） */
export function BallBox({ at, w = 0.3, h = 0.28, opaque = true, children }: { at: V3; w?: number; h?: number; opaque?: boolean; children?: ReactNode }) {
  const wood = makeWood()
  const top = useMemo(() => { const s = new THREE.Shape([new THREE.Vector2(-w / 2, -w / 2), new THREE.Vector2(w / 2, -w / 2), new THREE.Vector2(w / 2, w / 2), new THREE.Vector2(-w / 2, w / 2)]); s.holes.push(new THREE.Path().absarc(0, 0, 0.065, 0, Math.PI * 2, true)); const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 40 }); g.rotateX(-Math.PI / 2); return g }, [w])
  const ring = useMemo(() => disc(0.075, 0.006, { hole: 0.058 }), [])
  const t = 0.012
  const panel = (p: V3, s: V3, key: string, clear = false) => clear
    ? <mesh key={key} position={p} renderOrder={6}><boxGeometry args={s} /><meshPhysicalMaterial color="#e8f2f4" transparent opacity={0.16} roughness={0.04} depthWrite={false} /></mesh>
    : <mesh key={key} position={p} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial map={wood} roughness={0.6} color="#f3e6cf" /></mesh>
  return <group position={at}>
    {panel([0, t / 2, 0], [w, t, w], 'b')}
    {panel([-w / 2 + t / 2, h / 2, 0], [t, h, w], 'l')}
    {panel([w / 2 - t / 2, h / 2, 0], [t, h, w], 'r')}
    {panel([0, h / 2, -w / 2 + t / 2], [w - 2 * t, h, t], 'k', !opaque)}
    {panel([0, h / 2, w / 2 - t / 2], [w - 2 * t, h, t], 'f', !opaque)}
    <mesh geometry={top} position={[0, h, 0]} castShadow receiveShadow><meshStandardMaterial map={wood} roughness={0.55} color="#efdcbc" /></mesh>
    <mesh geometry={ring} position={[0, h + 0.015, 0]}><meshStandardMaterial color="#1b1c1e" roughness={0.9} /></mesh>
    <mesh position={[0, h + 0.004, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.064, 32]} /><meshStandardMaterial color="#0d0e10" roughness={1} /></mesh>
    {/* 四个角的铝包角 */}
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.004), h / 2, sz * (w / 2 - 0.004)]} castShadow><boxGeometry args={[0.014, h + 0.002, 0.014]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    {children}
  </group>
}

/** 绒布托盘：木框，里面铺深绿绒布，骰子、硬币落在里面。底面在 y = 0 */
export function FeltTray({ at, r = 0.17, rot = 0 }: { at: V3; r?: number; rot?: number }) {
  const frame = useMemo(() => shell([[r, 0], [r, 0.035], [r - 0.004, 0.04]], 0.014, { segs: 64 }), [r])
  const base = useMemo(() => disc(r, 0.01), [r])
  const felt = useMemo(() => { const t = makeFelt().clone(); t.repeat.set(2, 2); t.needsUpdate = true; return t }, [])
  return <group position={at} rotation-y={rot}>
    <mesh geometry={base} receiveShadow castShadow><meshStandardMaterial map={makeWood()} color="#8a5a32" roughness={0.6} /></mesh>
    <mesh geometry={frame} castShadow receiveShadow><meshStandardMaterial map={makeWood()} color="#9a6a3e" roughness={0.5} /></mesh>
    <mesh position={[0, 0.0105, 0]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[r - 0.014, 64]} /><meshStandardMaterial map={felt} roughness={1} /></mesh>
  </group>
}
/** 绒布托盘里落东西的高度 */
export const FELT_Y = 0.0105

/** 插在概率尺上的小旗：一根细杆、一面三角旗 */
export function Flag({ at, color, h = 0.09 }: { at: V3; color: string; h?: number }) {
  return <group position={at}>
    <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.0015, 0.0015, h, 6]} /><Metal kind="steel" /></mesh>
    <mesh position={[0, h - 0.012, 0]} castShadow><shapeGeometry args={[new THREE.Shape([new THREE.Vector2(0, 0.012), new THREE.Vector2(0.032, 0), new THREE.Vector2(0, -0.012)])]} /><meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.7} /></mesh>
  </group>
}

// ---------- 手套 ----------
const FINGER = new THREE.CapsuleGeometry(1, 3.2, 6, 14)
/**
 * 戴蓝色丁腈手套的右手，接一截白大褂的袖子（写法参照原子实验室的手，复制在这里）。按真手的大小：手掌宽约 8 cm。
 * 摆放约定和以前一样：手心朝下，手指朝 -z，袖子朝 +z，原点在手掌靠手指的一端。pinch：手指弯曲的程度（0 伸直，1 捏住）；arm：袖子露出多长（m）
 */
export function Glove({ pinch = 0, arm = 0.3 }: { pinch?: number; arm?: number }) {
  const glove = <meshStandardMaterial color="#4a76bd" roughness={0.62} />   // 丁腈手套：哑光，不加清漆，强光下也不发白
  const cloth = <meshStandardMaterial color="#eeefea" roughness={0.88} />
  const grip = 0.15 + pinch * 0.75, sl = Math.max(10, arm * 100)
  return <group rotation-z={Math.PI}><group rotation-x={Math.PI / 2}><group scale={0.01}>
    <RoundedBox args={[8.2, 8.6, 3.4]} radius={1.5} smoothness={4} position={[0, 4.4, 0]} castShadow>{glove}</RoundedBox>
    {[-2.85, -0.95, 0.95, 2.85].map((x, i) => <group key={x} position={[x, 0.2, 0]} rotation-x={-grip * 1.1}>
      <mesh geometry={FINGER} position={[0, -2.2 + Math.abs(i - 1.5) * 0.4, 0]} scale={[0.95, 0.95 - Math.abs(i - 1.5) * 0.08, 0.95]} castShadow>{glove}</mesh>
    </group>)}
    <group position={[4.4, 3.4, -0.6]} rotation={[-grip * 0.6, 0, 0.75]}><mesh geometry={FINGER} position-y={-2.4} scale={[1.08, 0.82, 1.08]} castShadow>{glove}</mesh></group>
    {/* 手套口翻边、手腕、白大褂袖子和袖口 */}
    <mesh position={[0, 10.2, 0]} castShadow><cylinderGeometry args={[3.7, 4.3, 3.2, 28]} />{glove}</mesh>
    <mesh position={[0, 11.9, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[3.75, 0.4, 8, 28]} />{glove}</mesh>
    <mesh position={[0, 12 + sl / 2, 0]} castShadow><cylinderGeometry args={[5.4, 4.9, sl, 28]} />{cloth}</mesh>
    <mesh position={[0, 12.4, 0]} castShadow><cylinderGeometry args={[4.95, 4.95, 1.2, 28]} /><meshStandardMaterial color="#e2e3de" roughness={0.9} /></mesh>
  </group></group></group>
}
