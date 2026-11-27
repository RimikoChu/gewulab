// 概率 · 第 7 课 抽检瓷碗：流水线旁的抽检台。今天这一批 10000 只碗，从皮带上依次取碗，在灯下看一圈，合格的放进蓝色周转箱，有裂纹、缺口的放进红色次品筐。
// 抽检 50、200、1000 只，次品的频率慢慢稳定在 0.04 附近；用它估计次品率，估出这一批大约有 10000 × 0.04 = 400 只次品。
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, disc, shell, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { FreqChart, Glove, Place, ease, freqLine, useRun, useTally, type V3 } from './parts'
import { BATCH, SAMPLES, batchDefects, bowls, count, f3, rateEstimate, running } from './physics'
import { makeBlueWhite } from './mats'
import { INSPECT_H, LINE, ST, useBowlGeo } from './world'

type Size = (typeof SAMPLES)[number]
const X = ST.l7.x, Z = ST.l7.z, TOP = INSPECT_H + 0.03
const CENTER: V3 = [X - 0.08, TOP, Z + 0.02]
const CRATE: V3 = [X + 0.42, TOP, Z + 0.02], BIN: V3 = [X - 0.5, TOP, Z + 0.06]
const PICK: V3 = [X - 0.08, LINE.y, LINE.z]
const B = bowls(), RUN = running(B)
const est = rateEstimate(count(B, 1000), 1000)
const TASKS: Task[] = [
  { id: 's50', text: '抽检 50 只', note: `${count(B, 50)} 只次品，频率 ${f3(count(B, 50) / 50)}：只抽 50 只，还看不准` },
  { id: 's200', text: '抽到 200 只', note: `${count(B, 200)} 只次品，频率 ${f3(count(B, 200) / 200)}` },
  { id: 's1000', text: '抽到 1000 只', note: `${count(B, 1000)} 只次品，频率 ${f3(count(B, 1000) / 1000)}：稳定在 ${est} 附近` },
  { id: 'est', text: '估计这一批 10000 只里有多少只次品', note: `次品率约 ${est}，10000 × ${est} = ${batchDefects(est)} 只` },
]

export default function Lesson7() {
  const [size, setSize] = useState<Size>(50)
  const [best, setBest] = useState(0)
  const [estimated, setEstimated] = useState(false)
  const T = useTasks('gewu:chance:7', TASKS)
  const tally = useTally(4, 1.4, 2.6, n => { const b = Math.max(best, n); setBest(b); T.check(id => (id === 's50' && b >= 50) || (id === 's200' && b >= 200) || (id === 's1000' && b >= 1000)) })
  const calc = useRun(1.8, () => { setEstimated(true); T.check(id => id === 'est') })
  const n = tally.n, busy = tally.busy || calc.busy, m = count(B, n)
  const pick = (s: Size) => { if (!busy) setSize(s) }
  const resetAll = () => { setSize(50); setBest(0); setEstimated(false); tally.reset(); calc.snap(0); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'size' | 'go' | 'est' | null } = (() => {
    if (!task) return { hint: `抽检够多以后，次品的频率稳定在 ${est} 附近：这一批 10000 只约有 ${batchDefects(est)} 只次品。`, next: null }
    if (tally.busy) return { hint: tally.slowPhase ? '取一只碗，在灯下转一圈看…' : '快进…', next: null }
    if (calc.busy) return { hint: '估算…', next: null }
    if (task.id === 'est') return { hint: `1000 只里 ${count(B, 1000)} 只次品，频率 ${f3(count(B, 1000) / 1000)}，稳定在 ${est} 附近。估计这一批的次品数`, next: 'est' }
    const want: Size = task.id === 's50' ? 50 : task.id === 's200' ? 200 : 1000
    if (size !== want) return { hint: n ? `${n} 只里 ${m} 只次品，频率 ${f3(m / n)}。把抽检数量加到 ${want} 只` : `抽检数量选 ${want} 只`, next: 'size' }
    return { hint: n ? `接着抽，抽到 ${want} 只` : '从流水线上随机取碗，抽检 50 只，逐只在灯下检查', next: 'go' }
  })()

  // 慢的几只：手从皮带上取一只碗放到灯下，转一圈，再放进周转箱或次品筐
  const k = tally.k, slow = tally.slowPhase, idx = n, bad = B[Math.min(idx, B.length - 1)]
  const lift = slow ? (k < 0.25 ? ease(k / 0.25) : 1) : 0, look = slow && k >= 0.25 && k < 0.7 ? (k - 0.25) / 0.45 : 0, put = slow && k >= 0.7 ? ease((k - 0.7) / 0.3) : 0
  const dest = bad ? BIN : CRATE
  const at: V3 = slow
    ? (k < 0.25 ? [PICK[0] + (CENTER[0] - PICK[0]) * lift, PICK[1] + (CENTER[1] - PICK[1]) * lift + Math.sin(lift * Math.PI) * 0.12, PICK[2] + (CENTER[2] - PICK[2]) * lift]
      : k < 0.7 ? [CENTER[0], CENTER[1] + 0.05 * Math.sin(look * Math.PI), CENTER[2]]
      : [CENTER[0] + (dest[0] - CENTER[0]) * put, CENTER[1] + Math.sin(put * Math.PI) * 0.1 + (dest[1] + 0.03 - CENTER[1]) * put, CENTER[2] + (dest[2] - CENTER[2]) * put])
    : CENTER
  const spin = look * Math.PI * 2 + (tally.busy && !slow ? performance.now() / 120 : 0)
  const good = n - m
  const labels: Label[] = [
    { id: 'q', at: [CENTER[0], TOP + 0.12, CENTER[2] + 0.05], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: slow && look > 0.6 ? 1 : 0, ...(bad ? { background: '#e5484d', color: '#fff' } : {}) }, children: bad ? '有缺口：次品' : '合格' },
    { id: 'ok', at: [CRATE[0], TOP + 0.2, CRATE[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>合格</small>{good} 只</> },
    { id: 'ng', at: [BIN[0], TOP + 0.2, BIN[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', style: { background: '#e5484d' }, children: <><small>次品</small>{m} 只</> },
    { id: 'n1', at: [PICK[0] + 0.6, LINE.y + 0.12, LINE.z], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '今天这一批：10000 只' },
    { id: 'n2', at: [X - 0.08, TOP + 0.44, Z - 0.26], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '检验灯' },
  ]
  return (
    <LabShell title="概率" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="抽检"
      stage={<Place at="l7" labels={labels}>
        <Bench />
        <Crate good={good} />
        <Bin bad={m} />
        {(tally.busy || n === 0) && <group position={n === 0 && !tally.busy ? [PICK[0], PICK[1], PICK[2]] : at} rotation-y={spin}><Bowl bad={tally.busy && bad && slow} /></group>}
        {slow && <group position={[at[0], at[1] + 0.05, at[2] - 0.13]} rotation={[0.25, Math.PI, 0]}><Glove pinch={0.6} arm={0.32} /></group>}
      </Place>}
      lesson={<LessonBlock no="7" title="抽检瓷碗" concept="用抽检的频率估计次品率" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一批碗有一万只，不能一只一只全检，就随机抽一部分检查。抽到次品的频率 = 次品数 ÷ 抽检数。</p>
          <p className="mt-3">抽得少，频率不稳（50 只里 3 只是 0.060）；抽得多了，频率稳定在一个数附近（1000 只是 0.039），这个数就是次品率的估计值，约 {est}。</p>
          <p className="mt-3">再用它估计整批：10000 × {est} = {batchDefects(est)}，这一批大约有 {batchDefects(est)} 只次品。这是估计，不是准确数。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">次品的频率稳定在 {est} 附近：这一批 10000 只约有 {batchDefects(est)} 只次品</p>
        <p className="mt-1 text-[14px] text-white/70">抽检的数量够多，用频率估计概率；再用概率估计整批里的数量。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">次品的频率</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{n ? f3(m / n) : '—'}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="n" value={String(n)} unit="只 · 抽检" />
            <ParamTile symbol="m" value={String(m)} unit="只 · 次品" />
          </div>
          <div className="mt-3 rounded-xl bg-white/6 px-2 pt-2 pb-1">
            <FreqChart series={RUN} n={n} max={n > 200 ? 1000 : n > 50 ? 200 : 50} ymax={0.2} p={best >= 1000 ? est : undefined} pLabel={`约 ${est}`} color="#ff9b9b" />
          </div>
          <p className="mt-1 text-[12.5px] text-white/50">频率 = {freqLine(m, n)}</p>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5">
            <div className="text-[12.5px] text-white/55">这一批的次品 ≈ 总数 × 次品率</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums">{estimated || calc.k > 0.5 ? `${BATCH} × ${est} = ${batchDefects(est)} 只` : '—'}</div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'go'} onClick={() => { if (!busy && n < size) tally.go(size) }} disabled={busy || n >= size}>抽检</LabButton>
        <LabButton primary pulse={next === 'est'} onClick={() => { if (!busy && !estimated) calc.run() }} disabled={busy || best < 1000 || estimated}>估算</LabButton>
      </>}
      extras={<Control label="抽检数量"><Segmented label="抽检数量" pulse={next === 'size'} want={next === 'size' ? (task!.id === 's50' ? '50' : task!.id === 's200' ? '200' : '1000') : null} disabled={busy} value={String(size)} onChange={v => pick(Number(v) as Size)} options={SAMPLES.map(s => ({ value: String(s), label: `${s} 只` }))} /></Control>}
    />
  )
}

/** 一只青花瓷碗；bad：碗口一个缺口、碗壁一道裂纹 */
function Bowl({ bad }: { bad?: boolean }) {
  const geo = useBowlGeo(), bw = makeBlueWhite()
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><meshPhysicalMaterial map={bw} roughness={0.16} clearcoat={1} clearcoatRoughness={0.08} side={THREE.DoubleSide} /></mesh>
    {bad && <>
      <mesh position={[0.078, 0.066, 0]} rotation-z={0.2}><boxGeometry args={[0.012, 0.012, 0.022]} /><meshStandardMaterial color="#6b5f52" roughness={0.9} /></mesh>
      <mesh position={[0.074, 0.045, 0.006]} rotation={[0, 0, 0.55]}><boxGeometry args={[0.002, 0.04, 0.0015]} /><meshBasicMaterial color="#3a3530" /></mesh>
    </>}
  </group>
}

/** 抽检台：白色台面、一盏带灯罩的检验灯，一块记录夹板 */
function Bench() {
  const shade = useMemo(() => shell([[0.11, 0], [0.1, 0.03], [0.05, 0.08], [0.03, 0.1]], 0.004, { segs: 40 }), [])
  const base = useMemo(() => disc(0.08, 0.02), [])
  const lamp: V3 = [X - 0.08, TOP + 0.4, Z - 0.12]
  return <group>
    <RoundedBox args={[1.4, 0.03, 0.8]} radius={0.008} position={[X, INSPECT_H + 0.015, Z]} castShadow receiveShadow><meshStandardMaterial color="#eceae4" roughness={0.5} /></RoundedBox>
    <mesh position={[X, TOP + 0.001, Z + 0.02]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[0.5, 0.4]} /><meshStandardMaterial color="#26292c" roughness={0.85} /></mesh>
    {/* 检验灯：底座、立杆、横臂、灯罩 */}
    <mesh geometry={base} position={[X - 0.08, TOP, Z - 0.32]} castShadow><Metal kind="iron" grain="cast" /></mesh>
    <mesh position={[X - 0.08, TOP + 0.22, Z - 0.32]} castShadow><cylinderGeometry args={[0.009, 0.009, 0.44, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[X - 0.08, TOP + 0.44, Z - 0.22]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.008, 0.008, 0.2, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh geometry={shade} position={[lamp[0], lamp[1] + 0.04, lamp[2]]} rotation-x={Math.PI} castShadow><meshStandardMaterial color="#2a6f9e" roughness={0.35} metalness={0.3} side={THREE.DoubleSide} /></mesh>
    <mesh position={[lamp[0], lamp[1] + 0.035, lamp[2]]} rotation-x={Math.PI / 2}><circleGeometry args={[0.095, 32]} /><meshBasicMaterial color="#fffaf0" toneMapped={false} /></mesh>
    <pointLight position={[lamp[0], lamp[1] + 0.01, lamp[2]]} intensity={0.6} distance={1.2} decay={1.5} color="#fff6e8" />
    {/* 记录夹板 */}
    <group position={[X + 0.18, TOP, Z + 0.26]} rotation-y={0.2}>
      <RoundedBox args={[0.23, 0.006, 0.31]} radius={0.002} position={[0, 0.003, 0]} castShadow><meshStandardMaterial color="#7a5a3a" roughness={0.6} /></RoundedBox>
      <mesh position={[0, 0.0065, 0.01]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.21, 0.27]} /><meshStandardMaterial color="#f4f2ec" roughness={0.9} /></mesh>
      <mesh position={[0, 0.012, -0.13]}><boxGeometry args={[0.1, 0.012, 0.03]} /><Metal kind="steel" /></mesh>
    </group>
  </group>
}

/** 蓝色周转箱：一摞摞合格的碗叠在里面（最多画 4 摞，每摞 6 只） */
function Crate({ good }: { good: number }) {
  const w = 0.42, d = 0.36, h = 0.16
  const show = good <= 8 ? good : Math.min(24, 8 + Math.floor((good - 8) / 40))
  return <group position={CRATE}>
    {[[0, h / 2, -d / 2 + 0.006, w, h, 0.012], [0, h / 2, d / 2 - 0.006, w, h, 0.012], [-w / 2 + 0.006, h / 2, 0, 0.012, h, d], [w / 2 - 0.006, h / 2, 0, 0.012, h, d], [0, 0.006, 0, w, 0.012, d]].map((b, i) =>
      <RoundedBox key={i} args={[b[3], b[4], b[5]]} radius={0.004} position={[b[0], b[1], b[2]]} castShadow receiveShadow><meshStandardMaterial color="#2f6fb0" roughness={0.55} /></RoundedBox>)}
    {Array.from({ length: show }, (_, i) => { const s = i % 4, k = Math.floor(i / 4); return <group key={i} position={[(s % 2 ? 1 : -1) * 0.09, 0.012 + k * 0.022, (s < 2 ? -1 : 1) * 0.08]}><Bowl /></group> })}
  </group>
}

/** 红色次品筐：次品碗斜着堆在里面（最多画 10 只） */
function Bin({ bad }: { bad: number }) {
  const geo = useMemo(() => shell([[0.13, 0], [0.15, 0.13]], 0.006, { segs: 40 }), [])
  const bottom = useMemo(() => disc(0.13, 0.006), [])
  return <group position={BIN}>
    <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color="#c0392b" roughness={0.5} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={bottom}><meshStandardMaterial color="#a8322a" roughness={0.6} /></mesh>
    {Array.from({ length: Math.min(10, bad) }, (_, i) => <group key={i} position={[Math.cos(i * 2.4) * 0.05, 0.01 + i * 0.012, Math.sin(i * 2.4) * 0.05]} rotation={[0.4 * Math.sin(i), i, 0.3]} scale={0.85}><Bowl bad /></group>)}
  </group>
}
