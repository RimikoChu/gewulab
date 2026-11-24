// 欧姆定律 · 拓展课 色环电阻质检 · 油量表：车间西头的质检台。
// 左半张：一批“10 Ω ±5%”的色环电阻，先读色环，再把三只样品依次放上测试夹具，读数字电压表、电流表，用 R = U/I 算阻值，阻值在 9.5–10.5 Ω 之间的放进合格盒。
// 右半张：一只剖开的油箱模型：浮子连着杠杆，杠杆带着滑动变阻器的滑片；油多，浮子高，接入的电阻小，电流大，油量表（一只电流表）的指针偏得多。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Led, Metal, lathe, useTasks, type Label, type RY } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { BATCH, COLORS, FUEL, SAMPLES, fuelI, fuelR, gaugeK, nominal, passes, range, sampleR } from './physics'
import { BLACK, Glove, Post, RED, Supply, add, supplyPosts, type V3 } from './gear'
import { Wire } from './wires'
import { BAND_RGB, makeBands, makeCoil, makeFuelDial, makeText } from './mats'
import { ease, f1, f2, useRun, useTween } from './parts'
import { Bench, Place, toWorld } from './world'

const TASKS: Task[] = [
  { id: 'read', text: '读出色环电阻的标称值', note: '棕 1、黑 0、黑 ×1、金 ±5%：10 Ω，允许 9.5–10.5 Ω' },
  { id: 'm12', text: '测 1 号、2 号，判断合格不合格', note: '1 号、2 号都在 9.5–10.5 Ω 之间：合格' },
  { id: 'm3', text: '测 3 号，判断合格不合格', note: '3 号超出了范围：不合格，挑出来' },
  { id: 'full', text: '给油箱加满油，看油量表', note: `油满了：浮子最高，接入的电阻 0 Ω，电流 ${f2(fuelI(1))} A` },
  { id: 'drain', text: '把油放掉一大半，再看油量表', note: '' },
]
const BANDS = [COLORS[BATCH.bands[0]], COLORS[BATCH.bands[1]], COLORS[BATCH.bands[2]], '金']
const NOMS = ['1 Ω', '10 Ω', '100 Ω']
type Verdict = 'ok' | 'bad'
// ---------- 台上的东西（台子的厘米坐标） ----------
const SUP_A: V3 = [-42, 0, -20], BOX: V3 = [-14, 0, -21], FIX: V3 = [-13, 0, 6], TRAY: V3 = [-34, 0, 13], BIN_OK: V3 = [2, 0, 15], BIN_BAD: V3 = [13, 0, 15]
const TANK: V3 = [40, 0, -8], GAUGE: V3 = [64, 0, 8], SUP_B: V3 = [72, 0, -18]
const slot = (k: number): V3 => add(TRAY, [-4 + k * 4, 1.2, 0])
const inBin = (k: number, ok: boolean): V3 => add(ok ? BIN_OK : BIN_BAD, [-1.5 + k * 1.5, 1.2, 0])
const FIX_AT: V3 = add(FIX, [0, 2.6, 0])

// ---------- 色环电阻 ----------
const BODY = lathe(([[0, -0.78], [0.2, -0.78], [0.27, -0.7], [0.28, -0.5], [0.24, -0.38], [0.24, 0.38], [0.28, 0.5], [0.27, 0.7], [0.2, 0.78], [0, 0.78]] as RY[]), { segs: 28, crease: 70 })
function Resistor() {
  const bands = useMemo(() => makeBands(BANDS), [])
  return <group rotation-z={Math.PI / 2}>
    <mesh geometry={BODY} castShadow><meshPhysicalMaterial map={bands} roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh><cylinderGeometry args={[0.04, 0.04, 4.6, 8]} /><Metal kind="zinc" rough={0.3} /></mesh>
  </group>
}
/** 测试夹具：黑色防静电底座，两只镀金的弹簧夹 */
function Fixture() {
  return <group>
    <RoundedBox args={[12, 1.6, 6]} radius={0.3} smoothness={2} position={[0, 0.8, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#202326" roughness={0.5} clearcoat={0.3} /></RoundedBox>
    {[-1, 1].map(s => <group key={s} position={[s * 2.2, 1.6, 0]}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.8, 1, 1.8]} /><Metal kind="brass" rough={0.2} /></mesh>
      <mesh position={[0, 1.15, 0]} rotation-z={s * 0.25}><boxGeometry args={[0.5, 0.12, 1.6]} /><Metal kind="brass" rough={0.18} /></mesh>
    </group>)}
    <Post at={[-5, 1.6, 1.6]} color={RED} /><Post at={[5, 1.6, 1.6]} />
  </group>
}
/** 放大镜台灯：夹在台子后沿，一根两节的臂，头上一圈 LED 灯珠围着一块玻璃镜片 */
function Magnifier({ to }: { to: V3 }) {
  const base: V3 = [to[0] + 20, 0, -28]
  const elbow: V3 = [to[0] + 22, 26, -22], head: V3 = [to[0] + 13, 11, to[2] - 4]
  const seg = (a: V3, b: V3, r: number) => { const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = v.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={q} castShadow><cylinderGeometry args={[r, r, len, 12]} /><meshPhysicalMaterial color="#e9eaea" roughness={0.35} clearcoat={0.5} /></mesh> }
  return <group>
    <RoundedBox args={[4, 3, 6]} radius={0.3} position={[base[0], 1.5, base[2]]} castShadow><meshPhysicalMaterial color="#2a2d30" roughness={0.4} /></RoundedBox>
    {seg([base[0], 3, base[2]], elbow, 0.5)}{seg(elbow, [head[0] + 5, head[1] + 2, head[2]], 0.45)}
    <mesh position={elbow}><sphereGeometry args={[0.9, 16, 12]} /><meshStandardMaterial color="#2a2d30" /></mesh>
    <group position={head}>
      <mesh rotation-x={Math.PI / 2}><torusGeometry args={[6, 1.1, 14, 48]} /><meshPhysicalMaterial color="#eef0f0" roughness={0.3} clearcoat={0.6} /></mesh>
      <mesh position={[0, -0.9, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[5.6, 0.35, 8, 48]} /><meshBasicMaterial color="#fffaf0" toneMapped={false} /></mesh>
      <mesh rotation-x={-Math.PI / 2} renderOrder={6}><circleGeometry args={[5.1, 40]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.12} roughness={0.02} clearcoat={1} depthWrite={false} envMapIntensity={1.6} /></mesh>
      <pointLight position={[0, -2, 0]} intensity={14} distance={30} decay={1.6} color="#fff6ea" />
    </group>
  </group>
}
/** 数字电压表、电流表：一只黑色的仪表箱，前面斜着两块数字屏 */
function Instruments({ u, i }: { u: string; i: string }) {
  const tx = useMemo(() => ({ v: makeText(['电压 V'], { w: 256, h: 64, bg: '#1b1e21', fg: '#c9d0d6', size: 36, weight: 600 }), a: makeText(['电流 A'], { w: 256, h: 64, bg: '#1b1e21', fg: '#c9d0d6', size: 36, weight: 600 }) }), [])
  return <group>
    <RoundedBox args={[22, 9, 14]} radius={0.6} smoothness={3} position={[0, 4.5, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#1b1e21" roughness={0.45} clearcoat={0.4} /></RoundedBox>
    <group position={[0, 6.2, 7.02]} rotation-x={-0.12}>
      {[-5.2, 5.2].map((x, k) => <group key={x} position={[x, 0, 0]}>
        <Led text={k ? i : u} w={8.6} h={3.3} position={[0, 0.4, 0.02]} />
        <mesh position={[0, -2.6, 0.02]}><planeGeometry args={[5, 1.25]} /><meshStandardMaterial map={k ? tx.a : tx.v} roughness={0.6} /></mesh>
      </group>)}
    </group>
    <Post at={[-8, 0.2, 7.6]} color={RED} /><Post at={[-5, 0.2, 7.6]} /><Post at={[5, 0.2, 7.6]} color={RED} /><Post at={[8, 0.2, 7.6]} />
  </group>
}
/** 料盘和合格、不合格两只盒子 */
function Trays() {
  const tx = useMemo(() => ({ ok: makeText(['合格'], { w: 128, h: 64, bg: '#2f8a4a', fg: '#fff', size: 40 }), bad: makeText(['不合格'], { w: 192, h: 64, bg: '#b8352a', fg: '#fff', size: 40 }), n: makeText(['1   2   3'], { w: 256, h: 64, bg: '#5c6670', fg: '#fff', size: 40 }) }), [])
  const bin = (at: V3, c: string, t: THREE.Texture) => <group position={at}>
    <RoundedBox args={[8, 0.4, 6]} radius={0.15} position={[0, 0.2, 0]} castShadow receiveShadow><meshPhysicalMaterial color={c} roughness={0.5} /></RoundedBox>
    {[[0, 3], [0, -3]].map(([x, z], i) => <mesh key={i} position={[x, 1.4, z]}><boxGeometry args={[8, 2.8, 0.3]} /><meshPhysicalMaterial color={c} roughness={0.5} /></mesh>)}
    {[-4, 4].map(x => <mesh key={x} position={[x, 1.4, 0]}><boxGeometry args={[0.3, 2.8, 6]} /><meshPhysicalMaterial color={c} roughness={0.5} /></mesh>)}
    <mesh position={[0, 1.4, 3.16]}><planeGeometry args={[t === tx.bad ? 4.5 : 3, 1.5]} /><meshStandardMaterial map={t} roughness={0.6} /></mesh>
  </group>
  return <group>
    <group position={TRAY}>
      <RoundedBox args={[15, 1.2, 7]} radius={0.3} smoothness={2} position={[0, 0.6, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#5c6670" roughness={0.55} /></RoundedBox>
      <mesh position={[0, 0.6, 3.51]}><planeGeometry args={[7, 1.1]} /><meshStandardMaterial map={tx.n} roughness={0.6} /></mesh>
    </group>
    {bin(BIN_OK, '#2f8a4a', tx.ok)}{bin(BIN_BAD, '#b8352a', tx.bad)}
  </group>
}

// ---------- 油箱和油量表 ----------
const TK = { w: 30, h: 20, d: 16, wall: 0.5 }
/** 杠杆的转轴（油箱坐标）和长度：浮子随油面升降，杠杆另一头带着滑片在弧形电阻上转 */
const PIV = { x: -10, y: TK.h - 6.5, L: 15 }
const armAngle = (level: number) => Math.asin(Math.min(0.95, Math.max(-0.95, (PIV.y - (TK.h - 3) * level) / PIV.L)))
function Tank({ level }: { level: number }) {
  const coil = useMemo(() => { const t = makeCoil().clone(); t.repeat.set(1, 12); t.needsUpdate = true; return t }, [])
  const a = armAngle(level), fx = PIV.x + PIV.L * Math.cos(a), fy = PIV.y - PIV.L * Math.sin(a)
  const oilH = Math.max(0.2, (TK.h - 3) * level)
  const glass = <meshPhysicalMaterial color="#e8f2f4" transparent opacity={0.16} roughness={0.04} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} envMapIntensity={1.4} />
  return <group>
    {/* 剖开的油箱：亚克力的四壁和顶盖，朝前的那面去掉，看得见里面 */}
    <RoundedBox args={[TK.w + 1, 1, TK.d + 1]} radius={0.3} position={[0, 0.5, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#3a4048" roughness={0.45} /></RoundedBox>
    {[-1, 1].map(s => <mesh key={s} position={[s * TK.w / 2, 1 + TK.h / 2, 0]} renderOrder={6}><boxGeometry args={[TK.wall, TK.h, TK.d]} />{glass}</mesh>)}
    <mesh position={[0, 1 + TK.h / 2, -TK.d / 2]} renderOrder={6}><boxGeometry args={[TK.w, TK.h, TK.wall]} />{glass}</mesh>
    <mesh position={[0, 1 + TK.h, 0]} renderOrder={6}><boxGeometry args={[TK.w + TK.wall, TK.wall, TK.d]} />{glass}</mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * TK.w / 2, 1 + TK.h / 2, TK.d / 2]}><boxGeometry args={[0.6, TK.h, 0.6]} /><meshStandardMaterial color="#3a4048" roughness={0.45} /></mesh>)}
    <mesh position={[0, 1 + TK.h, TK.d / 2]}><boxGeometry args={[TK.w + 0.6, 0.6, 0.6]} /><meshStandardMaterial color="#3a4048" roughness={0.45} /></mesh>
    {/* 油：琥珀色，剖面一侧是平的 */}
    <mesh position={[0, 1 + oilH / 2, 0]} renderOrder={4}><boxGeometry args={[TK.w - TK.wall, oilH, TK.d - TK.wall]} /><meshPhysicalMaterial color="#c58a1c" transparent opacity={0.55} roughness={0.08} clearcoat={1} depthWrite={false} /></mesh>
    {/* 弧形电阻、滑片、杠杆、浮子 */}
    <group position={[PIV.x, 1 + PIV.y, 0]}>
      <mesh rotation-z={Math.PI / 2 - 0.2}><torusGeometry args={[4, 0.5, 12, 40, 1.5]} /><meshStandardMaterial map={coil} metalness={0.7} roughness={0.35} /></mesh>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.7, 0.7, 2, 20]} /><Metal kind="steel" grain="turned" /></mesh>
      <group rotation-z={-a}>
        <mesh position={[PIV.L / 2, 0, 0.6]}><boxGeometry args={[PIV.L, 0.35, 0.35]} /><Metal kind="brass" /></mesh>
        <mesh position={[-1.6, 2.0, 0.6]} rotation-z={0.65}><boxGeometry args={[0.3, 4.6, 0.3]} /><Metal kind="copper" /></mesh>
      </group>
    </group>
    <mesh position={[fx, 1 + fy, 0.6]} castShadow><sphereGeometry args={[2.2, 24, 18]} /><meshStandardMaterial color="#b88a52" roughness={0.85} /></mesh>
    <Post at={[-12, 1 + TK.h + 0.25, -3]} color={RED} /><Post at={[-4, 1 + TK.h + 0.25, -3]} />
  </group>
}
function Gauge({ k }: { k: number }) {
  const dial = makeFuelDial(), ref = useRef<THREE.Group>(null), s = useRef(k)
  useFrame((_, d) => { s.current += (k - s.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.35)); if (ref.current) ref.current.rotation.z = -(-0.87 + 1.74 * s.current) })
  return <group>
    <RoundedBox args={[10, 2, 7]} radius={0.3} position={[0, 1, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#2a2d30" roughness={0.45} /></RoundedBox>
    <group position={[0, 7.5, 0]} rotation-x={-0.25}>
      <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[5, 5, 3, 40]} /><meshPhysicalMaterial color="#17191b" roughness={0.3} clearcoat={0.6} /></mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0, 1.55]}><torusGeometry args={[4.6, 0.35, 10, 40]} /><Metal kind="chrome" /></mesh>
      <mesh position={[0, 0, 1.52]}><circleGeometry args={[4.4, 40]} /><meshBasicMaterial map={dial} /></mesh>
      <group ref={ref} position={[0, -2.6, 1.6]}><mesh position={[0, 2.6, 0]}><boxGeometry args={[0.16, 5.4, 0.05]} /><meshBasicMaterial color="#ff6a3a" toneMapped={false} /></mesh></group>
      <mesh position={[0, -2.6, 1.65]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.5, 0.5, 0.2, 20]} /><meshStandardMaterial color="#111" /></mesh>
    </group>
    <mesh position={[0, 4, -0.8]}><boxGeometry args={[1.6, 5, 1.6]} /><meshStandardMaterial color="#2a2d30" /></mesh>
    <Post at={[-3, 2, 2.4]} color={RED} /><Post at={[3, 2, 2.4]} />
  </group>
}

export default function LessonX() {
  const [nom, setNom] = useState<string | null>(null)
  const [cur, setCur] = useState<number | null>(null)            // 夹具上是几号
  const [verdict, setVerdict] = useState<(Verdict | null)[]>([null, null, null])
  const [wrongV, setWrongV] = useState<Verdict | null>(null)
  const T = useTasks('gewu:ohm:x', TASKS)
  const put = useRun(1.6)
  const bin = useRun(1.2)
  const oil = useTween(0.35, 0.22)
  const partB = !!T.done.m3
  const nextSample = verdict.findIndex(v => v === null)
  const measured = cur !== null && !put.busy
  const place = () => { if (put.busy || bin.busy || nextSample < 0 || cur !== null) return; setCur(nextSample); put.run() }
  const judge = (v: Verdict) => {
    if (cur === null || put.busy || bin.busy) return
    const ok = passes(sampleR(cur))
    if ((v === 'ok') !== ok) { setWrongV(v); return }
    setWrongV(null)
    const n = verdict.map((x, k) => k === cur ? v : x); setVerdict(n)
    bin.run(); setTimeout(() => { setCur(null); T.check(id => (id === 'm12' && !!n[0] && !!n[1]) || (id === 'm3' && !!n[2])) }, 1250)
  }
  const fill = () => { oil.go(1); setTimeout(() => T.check(id => id === 'full'), 4000) }
  const drain = () => { oil.go(0.2); setTimeout(() => T.check(id => id === 'drain'), 4000) }
  const resetAll = () => { setNom(null); setCur(null); setVerdict([null, null, null]); setWrongV(null); put.snap(0); bin.snap(0); oil.snap(0.35); T.reset() }

  const task = T.current
  type Next = 'nom' | 'place' | 'judge' | 'fill' | 'drain' | null
  const { hint, next }: { hint: string; next: Next } = !task ? { hint: '用伏安法测出阻值，就能判断合格不合格；油量表靠浮子带动变阻器改变电流。', next: null }
    : task.id === 'read' ? (nom && nom !== '10 Ω' ? { hint: '不对：第一、二环是有效数字 1、0，第三环黑色表示乘 1。再选一次', next: 'nom' } : { hint: '看色环：棕、黑、黑、金。这批电阻的标称值是多少？', next: 'nom' })
    : put.busy ? { hint: '把样品放上测试夹具…', next: null }
    : bin.busy ? { hint: '放进料盒…', next: null }
    : task.id === 'm12' || task.id === 'm3' ? (cur === null ? { hint: `把 ${nextSample + 1} 号放上测试夹具`, next: 'place' }
      : wrongV ? { hint: `不对：${f1(sampleR(cur))} Ω ${passes(sampleR(cur)) ? '在' : '不在'} 9.5–10.5 Ω 之间。再判断一次`, next: 'judge' }
      : { hint: `R = U ÷ I = ${f2(SAMPLES[cur].U)} V ÷ ${SAMPLES[cur].I.toFixed(3)} A ≈ ${f1(sampleR(cur))} Ω。合格吗？`, next: 'judge' })
    : oil.moving ? { hint: oil.goal > oil.x ? '加油…浮子往上浮' : '放油…浮子往下沉', next: null }
    : task.id === 'full' ? { hint: '油量表就是一只电流表。给油箱加满油', next: 'fill' }
    : { hint: '把油放掉一大半，看油量表', next: 'drain' }

  // 样品的位置：在料盘里、被拿到夹具上、被放进料盒
  const where = (k: number): V3 => {
    if (k === cur) {
      if (put.busy) { const e = ease(put.k), a = slot(k), b = FIX_AT; return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e + Math.sin(Math.PI * e) * 6, a[2] + (b[2] - a[2]) * e] }
      if (bin.busy) { const e = ease(bin.k), a = FIX_AT, b = inBin(k, verdict[k] === 'ok'); return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e + Math.sin(Math.PI * e) * 6, a[2] + (b[2] - a[2]) * e] }
      return FIX_AT
    }
    return verdict[k] ? inBin(k, verdict[k] === 'ok') : slot(k)
  }
  const handAt = cur !== null && (put.busy || bin.busy) ? where(cur) : null
  const U = measured ? f2(SAMPLES[cur!].U) : '0.00', I = measured ? SAMPLES[cur!].I.toFixed(3) : '0.000'
  const W = (p: V3) => toWorld('x', p)
  const labels: Label[] = partB ? [
    { id: 'i', at: W(add(GAUGE, [0, 14, 0])), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>I</small>{f2(fuelI(oil.x))} A</> },
    { id: 'r', at: W(add(TANK, [-10, 26, -3])), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>接入</small>{f1(fuelR(oil.x))} Ω</> },
    { id: 'n1', at: W(add(TANK, [12, 6, 8])), ax: 0, name: true, className: 'scene-name', children: '浮子' },
    { id: 'n2', at: W(add(GAUGE, [6, 3, 4])), ax: 0, name: true, className: 'scene-name', children: '油量表（电流表）' },
  ] : [
    { id: 'n1', at: W(add(FIX, [0, 1, 4])), ax: 0.5, name: true, className: 'scene-name', children: '测试夹具' },
    { id: 'n2', at: W(add(TRAY, [0, 1, 4])), ax: 0.5, name: true, className: 'scene-name', children: '待检样品' },
    { id: 'n3', at: W(add(BOX, [0, 11, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '数字电压表 · 电流表' },
  ]
  const PA = supplyPosts(), PB = supplyPosts()
  const [lo, hi] = range()
  return (
    <LabShell title="欧姆定律" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={partB ? '油箱' : '质检'}
      stage={<Place at={partB ? 'xFuel' : 'x'} labels={labels}>
        <Bench at="x">
          {/* 左半张：色环电阻质检 */}
          <group position={SUP_A}><Supply u={2} /></group>
          <group position={BOX}><Instruments u={U} i={I} /></group>
          <group position={FIX}><Fixture /></group>
          <Magnifier to={add(FIX, [0, 0, 0])} />
          <Trays />
          {[0, 1, 2].map(k => <group key={k} position={where(k)}><Resistor /></group>)}
          {handAt && <group position={[handAt[0], handAt[1] + 0.4, handAt[2] + 0.6]}><Glove scale={0.26} /></group>}
          <Wire a={{ p: add(SUP_A, PA.plus), d: [0, 0, 1] }} b={{ p: add(BOX, [-8, 0.65, 7.6]) }} color={RED} />
          <Wire a={{ p: add(BOX, [-5, 0.65, 7.6]) }} b={{ p: add(SUP_A, PA.minus), d: [0, 0, 1] }} color={BLACK} via={[[-28, 2]]} />
          <Wire a={{ p: add(BOX, [5, 0.65, 7.6]) }} b={{ p: add(FIX, [-5, 2.05, 1.6]) }} color={RED} />
          <Wire a={{ p: add(BOX, [8, 0.65, 7.6]) }} b={{ p: add(FIX, [5, 2.05, 1.6]) }} color={BLACK} via={[[-1, 2]]} />
          {/* 右半张：油量表 */}
          <group position={TANK}><Tank level={oil.x} /></group>
          <group position={GAUGE}><Gauge k={gaugeK(oil.x)} /></group>
          <group position={SUP_B}><Supply u={FUEL.U} /></group>
          <Wire a={{ p: add(SUP_B, PB.plus), d: [0, 0, 1] }} b={{ p: add(GAUGE, [3, 2.45, 2.4]) }} color={RED} flow={fuelI(oil.x)} />
          <Wire a={{ p: add(GAUGE, [-3, 2.45, 2.4]) }} b={{ p: add(TANK, [-12, 21.7, -3]) }} color={RED} flow={fuelI(oil.x)} via={[[54, 16], [52, -20], [22, -20]]} />
          <Wire a={{ p: add(TANK, [-4, 21.7, -3]) }} b={{ p: add(SUP_B, PB.minus), d: [0, 0, 1] }} color={BLACK} flow={fuelI(oil.x)} via={[[36, -21], [58, -28], [84, -2]]} />
        </Bench>
      </Place>}
      lesson={<LessonBlock no="拓展" title="色环电阻 · 油量表" concept="测出阻值判断合格；变阻器能当传感器" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>小电阻上印不下数字，就用色环表示阻值。四环电阻：第一、二环是两位有效数字，第三环是乘数（乘 10 的几次方），第四环是允许的误差，金色表示 ±5%。黑 0、棕 1、红 2、橙 3、黄 4、绿 5、蓝 6、紫 7、灰 8、白 9。</p>
          <p className="mt-3">质检时用伏安法测出实际阻值，在允许范围内的算合格。</p>
          <p className="mt-3">油量表：浮子随油面升降，通过杠杆带动滑动变阻器的滑片。油多时接入电路的电阻小，电流大，电流表（油量表）的指针偏得多。这里的电路参数是示意的数。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">质检做完，油量表也看懂了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">R = U ÷ I 判合格；油多电阻小，电流大</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">三只样品 {[0, 1, 2].map(k => f1(sampleR(k))).join('、')} Ω，3 号不合格；油量表的电流从 {f2(fuelI(1))} A 降到 {f2(fuelI(0.2))} A（示意）。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          {!partB ? <>
            {/* 放大的色环 */}
            <svg viewBox="0 0 290 70" className="w-full" role="img" aria-label="色环电阻">
              <line x1={8} y1={35} x2={282} y2={35} stroke="#b8bcc0" strokeWidth={3} />
              <rect x={70} y={14} width={150} height={42} rx={18} fill="#b3c2cb" />
              {BANDS.map((b, i) => <rect key={i} x={[92, 114, 136, 188][i]} y={14} width={12} height={42} fill={BAND_RGB[b]} />)}
            </svg>
            <div className="mt-1 grid grid-cols-4 text-center text-[12.5px] text-white/70">{BANDS.map((b, i) => <span key={i}>{b}{T.done.read ? ` · ${['1', '0', '×1', '±5%'][i]}` : ''}</span>)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ParamTile symbol="标称" value={T.done.read ? String(nominal()) : '?'} unit="Ω" />
              <ParamTile symbol="合格" value={T.done.read ? `${f1(lo)}–${f1(hi)}` : '?'} unit="Ω" />
            </div>
            <h2 className="mt-4 text-[12.5px] text-white/55">样品</h2>
            <table className="mt-2 w-full text-center text-[13.5px] tabular-nums">
              <thead><tr className="text-white/55"><th className="pb-1 font-medium">号</th><th className="pb-1 font-medium">U / V</th><th className="pb-1 font-medium">I / A</th><th className="pb-1 font-medium">R / Ω</th><th className="pb-1 font-medium">结果</th></tr></thead>
              <tbody>{[0, 1, 2].map(k => { const seen = verdict[k] !== null || (k === cur && measured); return <tr key={k} className={k === cur ? 'bg-white/10' : 'bg-white/[0.04]'}><td className="rounded-l-lg py-1.5">{k + 1}</td><td>{seen ? f2(SAMPLES[k].U) : '—'}</td><td>{seen ? SAMPLES[k].I.toFixed(3) : '—'}</td><td>{seen ? f1(sampleR(k)) : '—'}</td><td className={`rounded-r-lg font-semibold ${verdict[k] === 'ok' ? 'text-[#7fe3d4]' : verdict[k] === 'bad' ? 'text-[#ff8a7a]' : ''}`}>{verdict[k] === 'ok' ? '合格' : verdict[k] === 'bad' ? '不合格' : '—'}</td></tr> })}</tbody>
            </table>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">油量表里的电流（示意）</div>
              <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{f2(fuelI(oil.x))}<span className="ml-1 text-[15px] font-medium text-white/55">A</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="油量" value={`${Math.round(oil.x * 100)}`} unit="%" />
              <ParamTile symbol="R接入" value={f1(fuelR(oil.x))} unit="Ω · 变阻器" />
              <ParamTile symbol="U" value={String(FUEL.U)} unit="V · 电源" />
              <ParamTile symbol="R₀" value={String(FUEL.R0)} unit="Ω · 保护电阻" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/60">I = U ÷ (R₀ + R接入)：油越多，R接入越小，电流越大。</p>
          </>}
        </Glass>
      }
      actions={partB ? <>
        <LabButton primary={next === 'fill'} pulse={next === 'fill'} onClick={fill} disabled={oil.moving || !!T.done.full}>加满油</LabButton>
        <LabButton primary={next === 'drain'} pulse={next === 'drain'} onClick={drain} disabled={oil.moving || !T.done.full || !!T.done.drain}>放掉一大半</LabButton>
      </> : <>
        <LabButton primary={next === 'place'} pulse={next === 'place'} onClick={place} disabled={!T.done.read || cur !== null || put.busy || bin.busy || nextSample < 0}>放上测试夹具</LabButton>
      </>}
      extras={!partB &&
        <Control label={task?.id === 'read' ? '标称值' : '这只电阻'}>
          {task?.id === 'read'
            ? <Segmented label="标称值" pulse={next === 'nom'} want={next === 'nom' ? '10 Ω' : null} value={nom ?? 'none'} onChange={v => { setNom(v); if (v === '10 Ω') T.check(id => id === 'read') }} options={NOMS.map(o => ({ value: o, label: o }))} />
            : <Segmented label="合格还是不合格" pulse={next === 'judge'} want={next === 'judge' && cur !== null ? (passes(sampleR(cur)) ? 'ok' : 'bad') : null} disabled={next !== 'judge'} value={(wrongV ?? 'none') as Verdict} onChange={v => judge(v as Verdict)} options={[{ value: 'ok', label: '合格' }, { value: 'bad', label: '不合格' }]} />}
        </Control>
      }
    />
  )
}
