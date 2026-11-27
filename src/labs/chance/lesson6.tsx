// 概率 · 第 6 课 抛硬币：培训桌上一只绒布托盘、一枚 1 元硬币。抛 10 次、100 次、1000 次，前几次一次一次地抛，后面快进。
// 面板里实时画出正面朝上的频率折线：次数少时忽高忽低，次数多了稳定在 0.5 附近。换第二组从头再做，前面走法不一样，最后也在 0.5 附近。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { FELT_Y, FeltTray, FreqChart, Glove, Place, ease, freqLine, useTally, type V3 } from './parts'
import { COIN_P, CREW, STOPS, count, f3, flips, running, type Crew } from './physics'
import { makeCoin } from './mats'
import { ST, TABLE_H } from './world'

const X = ST.l6.x, Z = ST.l6.z
const TRAY: V3 = [X, TABLE_H, Z + 0.02]
const CR = 0.0125, CT = 0.00185   // 1 元硬币：直径 25 mm，厚 1.85 mm
const HITS = { a: flips('a'), b: flips('b') }, RUN = { a: running(HITS.a), b: running(HITS.b) }
const fr = (c: Crew, n: number) => f3(count(HITS[c], n) / n)
const TASKS: Task[] = [
  { id: 'a10', text: '第一组：抛 10 次', note: `正面 ${count(HITS.a, 10)} 次，频率 ${fr('a', 10)}：次数少，离 0.5 还远` },
  { id: 'a100', text: '接着抛到 100 次', note: `频率 ${fr('a', 100)}，近了一些` },
  { id: 'a1000', text: '抛到 1000 次，看折线停在哪', note: `频率 ${fr('a', 1000)}：稳定在 0.5 附近` },
  { id: 'b1000', text: '换第二组，从头抛到 1000 次', note: `前面走法不一样，1000 次时 ${fr('b', 1000)}，也在 0.5 附近` },
]

export default function Lesson6() {
  const [crew, setCrew] = useState<Crew>('a')
  const [best, setBest] = useState<Record<Crew, number>>({ a: 0, b: 0 })
  const T = useTasks('gewu:chance:6', TASKS)
  const tally = useTally(5, 0.9, 2.4, n => { const b = { ...best, [crew]: Math.max(best[crew], n) }; setBest(b); T.check(id => (id === 'a10' && b.a >= 10) || (id === 'a100' && b.a >= 100) || (id === 'a1000' && b.a >= 1000) || (id === 'b1000' && b.b >= 1000)) })
  const n = tally.n, busy = tally.busy
  const pickCrew = (c: Crew) => { if (busy) return; setCrew(c); tally.reset() }
  const resetAll = () => { setCrew('a'); setBest({ a: 0, b: 0 }); tally.reset(); T.reset() }
  const m = count(HITS[crew], n)

  const task = T.current
  const { hint, next }: { hint: string; next: 10 | 100 | 1000 | 'crew' | null } = (() => {
    if (!task) return { hint: '两组都抛了 1000 次：次数越多，频率越稳定在 0.5 附近，用它估计概率。', next: null }
    if (busy) return { hint: tally.slowPhase ? `抛第 ${n + 1} 次…` : '快进…', next: null }
    const want: Crew = task.id === 'b1000' ? 'b' : 'a'
    if (crew !== want) return { hint: '换第二组，从头再抛', next: 'crew' }
    const who = crew === 'b' ? '第二组：' : ''
    if (n < 10) return { hint: `${who}先抛 10 次，数一数正面朝上几次`, next: 10 }
    if (n < 100) return { hint: `${who}10 次的频率是 ${fr(crew, 10)}。接着抛到 100 次`, next: 100 }
    return { hint: `${who}100 次的频率是 ${fr(crew, 100)}。再抛到 1000 次，看折线最后停在哪`, next: 1000 }
  })()

  // 硬币：慢的几次一次一次地抛起、翻转、落下；快进时在托盘上方快速翻
  const up = HITS[crew][Math.max(0, (tally.slowPhase ? n : n - 1))]
  const k = tally.k, flying = tally.slowPhase && k < 0.75, hop = flying ? Math.sin((k / 0.75) * Math.PI) * 0.14 : busy ? 0.03 : 0
  const turns = flying ? (1 - ease(k / 0.75)) * Math.PI * 8 : busy ? (performance.now() / 40) % (Math.PI * 2) : 0
  const face = (tally.slowPhase ? (k > 0.5 ? up : HITS[crew][Math.max(0, n - 1)]) : up) ?? true
  const max = n > 100 ? 1000 : n > 10 ? 100 : 10
  const other: Crew = crew === 'a' ? 'b' : 'a'
  const labels: Label[] = [
    { id: 'res', at: [TRAY[0], TABLE_H + 0.06, TRAY[2] + 0.02], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: n > 0 && !flying ? 1 : 0 }, children: <><small>第 {n} 次</small>{face ? '正面' : '反面'}</> },
    { id: 'cnt', at: [TRAY[0] + 0.17, TABLE_H + 0.01, TRAY[2] - 0.06], ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>正面</small>{m} / {n} 次</> },
    { id: 'n1', at: [TRAY[0] - 0.17, TABLE_H + 0.01, TRAY[2] - 0.08], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '1 元硬币' },
  ]
  return (
    <LabShell title="概率" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="抛硬币"
      stage={<Place at="l6" labels={labels}>
        <FeltTray at={TRAY} r={0.14} />
        <group position={[TRAY[0] + (flying ? (1 - k / 0.75) * 0.05 : 0), TABLE_H + FELT_Y + CT / 2 + hop, TRAY[2]]} rotation-x={turns + (face ? 0 : Math.PI)}><Coin /></group>
        <group position={[TRAY[0] - 0.19, TABLE_H + 0.05, TRAY[2] - 0.03]} rotation={[0, -Math.PI / 2 + 0.25, 0.15]}><Glove pinch={flying && k < 0.2 ? 0.2 : 0.5} arm={0.3} /></group>
      </Place>}
      lesson={<LessonBlock no="6" title="抛硬币" concept="做得够多，频率稳定在概率附近" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在 n 次重复试验中，事件 A 发生了 m 次，m/n 叫事件 A 发生的<b className="text-white">频率</b>。</p>
          <p className="mt-3">频率每做一轮都可能不一样，次数少时可能离概率很远（10 次里 7 次正面）。试验次数很大时，频率会稳定在一个常数附近，这个常数就是概率，所以可以<b className="text-white">用频率估计概率</b>。</p>
          <p className="mt-3">硬币质地均匀，正面朝上的概率是 0.5。1000 次的频率是 0.506，不正好是 0.5，但离 0.5 很近。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">两组 10 次时一个 0.700、一个 0.300，到 1000 次都在 0.5 附近（0.506、0.504）</p>
        <p className="mt-1 text-[14px] text-white/70">试验次数很大时，频率稳定在概率附近，可以用频率估计概率。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{CREW[crew].name} · 正面朝上的频率</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{n ? f3(m / n) : '—'}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="n" value={String(n)} unit="次 · 抛的次数" />
            <ParamTile symbol="m" value={String(m)} unit="次 · 正面朝上" />
          </div>
          <div className="mt-3 rounded-xl bg-white/6 px-2 pt-2 pb-1">
            <FreqChart series={RUN[crew]} n={n} max={max} p={COIN_P} pLabel="0.5" other={best[other] ? { series: RUN[other], n: Math.min(best[other], max), color: '#ffffff' } : undefined} />
          </div>
          <table className="mt-2 w-full text-[13.5px] tabular-nums">
            <thead><tr className="text-white/50"><th className="py-1 text-left font-normal">次数</th>{(['a', 'b'] as Crew[]).map(c => <th key={c} className="text-right font-normal">{CREW[c].name}</th>)}</tr></thead>
            <tbody>{STOPS.map(s => <tr key={s}><td className="py-0.5 text-white/70">{s}</td>{(['a', 'b'] as Crew[]).map(c => { const have = c === crew ? n >= s : best[c] >= s; return <td key={c} className={have ? 'text-right' : 'text-right text-white/30'}>{have ? fr(c, s) : '—'}</td> })}</tr>)}</tbody>
          </table>
          <p className="mt-1 text-[12.5px] text-white/50">频率 = {freqLine(m, n)}</p>
          <CoinZoom heads={n > 0 && !flying ? face : null} />
        </Glass>
      }
      actions={<>
        {STOPS.map(s => <LabButton key={s} primary={s === 1000} pulse={next === s} onClick={() => { if (!busy && n < s) tally.go(s) }} disabled={busy || n >= s}>{s === 10 ? '抛 10 次' : `抛到 ${s} 次`}</LabButton>)}
      </>}
      extras={<Control label="组别"><Segmented label="组别" pulse={next === 'crew'} want={next === 'crew' ? 'b' : null} disabled={busy} value={crew} onChange={pickCrew} options={(['a', 'b'] as Crew[]).map(c => ({ value: c, label: CREW[c].name }))} /></Control>}
    />
  )
}

/** 1 元硬币：镍色，边上一圈细齿；正面一个“1”，反面一朵花 */
function Coin() {
  const { heads, tails } = makeCoin()
  const geo = useMemo(() => new THREE.CylinderGeometry(CR, CR, CT, 96), [])
  const mats = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: '#c9ccce', metalness: 0.9, roughness: 0.32 }),
    new THREE.MeshStandardMaterial({ map: heads, metalness: 0.85, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ map: tails, metalness: 0.85, roughness: 0.3 }),
  ], [heads, tails])
  return <mesh geometry={geo} material={mats} castShadow receiveShadow />
}

/** 面板里放大的硬币：正面、反面两张图，刚抛出的那一面亮起来 */
function CoinZoom({ heads }: { heads: boolean | null }) {
  const src = useMemo(() => { const { heads: h, tails: t } = makeCoin(); return { h: (h.image as HTMLCanvasElement).toDataURL(), t: (t.image as HTMLCanvasElement).toDataURL() } }, [])
  return <div className="mt-3 flex items-center justify-center gap-5">
    {([['h', '正面'], ['t', '反面']] as const).map(([k, name]) => { const on = heads !== null && (k === 'h') === heads; return <div key={k} className="flex flex-col items-center gap-1">
      <img src={src[k]} alt={name} className={`size-16 rounded-full transition ${on ? 'ring-2 ring-[#7fe3d4]' : heads === null ? '' : 'opacity-35'}`} />
      <span className={`text-[12.5px] ${on ? 'text-white' : 'text-white/55'}`}>{name}</span>
    </div> })}
  </div>
}
