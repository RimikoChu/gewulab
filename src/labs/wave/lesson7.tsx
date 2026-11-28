// 机械振动和机械波 · 第 7 课 多普勒效应：小艇船头挂着一只起波锤，每 2 秒拍一下水。艇停着，四周的波纹一样密；
// 艇往前开，前面的波纹挤在一起，后面的拉开了。前后各有一只浮标，数一数它们每秒起伏几次。
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { MarkerBuoy, WorkBoat } from './boats'
import { num, useRun, useSpace } from './gear'
import { AT, COL, PATCH, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BOATS, HORN, TOW, WATER, doppler, lamAhead, lamBehind, towField, type BoatKey } from './physics'
import { WavePatch, makeGrid } from './sea'
import { VOICE } from './voice'
import { Place } from './world'

const KEYS: BoatKey[] = ['rest', 'half', 'full']
const fa = (k: BoatKey) => doppler(TOW.f, BOATS[k].u), fb = (k: BoatKey) => doppler(TOW.f, -BOATS[k].u)
const TASKS: Task[] = [
  { id: 'rest', text: '艇停着起波，读两只浮标的频率', note: `波源不动：前后两只浮标都是 ${num(fa('rest'))} Hz` },
  { id: 'half', text: '让艇以 0.5 m/s 向前开，再读一次', note: `前方 ${num(fa('half'))} Hz，后方 ${num(fb('half'))} Hz：前高后低` },
  { id: 'full', text: '把艇速加到 1.0 m/s，再读一次', note: `前方 ${num(fa('full'))} Hz，后方 ${num(fb('full'))} Hz：艇越快，差得越多` },
]
/** 起波锤出发的位置；前方浮标 A、后方浮标 B */
const X0 = AT.tow[0] - 1, Z0 = AT.tow[1]
const A: V3 = [X0 + TOW.ahead, 0, Z0], B: V3 = [X0 - TOW.behind, 0, Z0]
/** 浮标的读数什么时候出来：波传到以后再等两次起伏 */
const tA = (k: BoatKey) => Math.min(TOW.T - 0.6, TOW.ahead / WATER.v + 2 / fa(k)), tB = (k: BoatKey) => Math.min(TOW.T - 0.4, TOW.behind / WATER.v + 2 / fb(k))

function Rig({ boat, run, hold, onMark, tag }: { boat: BoatKey; run: number; hold: boolean; onMark: (i: number) => void; tag: V3 }) {
  const grid = useMemo(() => makeGrid(PATCH.tow), [])
  const u = BOATS[boat].u, t = useRef(0)
  const hull = useRef<THREE.Group>(null), ham = useRef<THREE.Group>(null), a = useRef<THREE.Group>(null), b = useRef<THREE.Group>(null)
  const marks = useMemo(() => [tA(boat), tB(boat), TOW.T].sort((p, q) => p - q), [boat])
  const order = useMemo(() => [tA(boat), tB(boat), TOW.T].map(x => marks.indexOf(x)), [boat, marks])
  useRun(run, tt => {
    t.current = tt
    hull.current?.position.set(X0 + u * tt, 0, Z0)
    if (ham.current) ham.current.position.y = 0.05 - (run === 0 ? 0 : 0.14 * Math.sin(2 * Math.PI * TOW.f * tt))
    a.current?.position.setY(towField(TOW.A, TOW.f, u, TOW.ahead, 0, tt)); b.current?.position.setY(towField(TOW.A, TOW.f, u, -TOW.behind, 0, tt))
    tag[0] = X0 + u * tt - 5
  }, marks, i => onMark(order.indexOf(i)), hold)
  return <>
    <WavePatch grid={grid} chop={0.01} high={TOW.A} fill={out => { const { xs, zs, n } = grid, tt = t.current; if (tt <= 0) { out.fill(0); return } for (let k = 0; k < n; k++) out[k] = towField(TOW.A, TOW.f, u, xs[k] - X0, zs[k] - Z0, tt) }} />
    <WorkBoat ref={hull} plunger={ham} />
    <MarkerBuoy ref={a} color={COL.red} position={A} size={2.2} />
    <MarkerBuoy ref={b} color="#3f8fd6" position={B} size={2.2} />
  </>
}

export default function Lesson7() {
  const [boat, setBoat] = useState<BoatKey>('rest')
  const [run, setRun] = useState(0), n = useRef(0)
  const [seen, setSeen] = useState({ a: false, b: false, end: false })
  const [rows, setRows] = useState<BoatKey[]>([])
  const T = useTasks('gewu:wave:7', TASKS)
  const tag = useRef<V3>([X0 - 5, 4.2, Z0]).current
  const u = BOATS[boat].u, busy = run !== 0 && !seen.end
  const go = () => { if (run !== 0) return; setSeen({ a: false, b: false, end: false }); setRun(++n.current) }
  const home = () => { if (busy) return; setRun(0); setSeen({ a: false, b: false, end: false }) }
  const mark = (i: number) => {
    if (i === 0) setSeen(s => ({ ...s, a: true })); else if (i === 1) setSeen(s => ({ ...s, b: true }))
    else { setSeen({ a: true, b: true, end: true }); const next = rows.includes(boat) ? rows : [...rows, boat]; setRows(next); T.check(id => next.includes(id as BoatKey)) }
  }
  const resetAll = () => { setBoat('rest'); setRun(0); setSeen({ a: false, b: false, end: false }); setRows([]); T.reset() }
  useSpace(go)

  const task = T.current, want = (task?.id ?? null) as BoatKey | null
  const { hint, next }: { hint: string; next: 'boat' | 'go' | 'home' | null } = (() => {
    if (!task) return { hint: '波源和观察者互相靠近，接收到的频率变高；互相远离，频率变低。', next: null }
    if (busy) return { hint: u === 0 ? '波一圈圈传开，等它传到两只浮标…' : '看艇前艇后的波纹，哪边密、哪边疏…', next: null }
    if (run !== 0) return { hint: '按“放回原处”，让水面静下来', next: 'home' }
    if (boat !== want) return { hint: `把艇速换成“${BOATS[want!].name}”`, next: 'boat' }
    return { hint: u === 0 ? '按“开始起波”：艇停在原地，起波锤每 2 秒拍一下水' : `按“开始起波”：艇以 ${num(u, 1)} m/s 向前开，起波锤照样每 2 秒拍一下`, next: 'go' }
  })()
  const labels: Label[] = [
    { id: 'A', at: [A[0] + 0.9, 3.6, A[2]], ax: 1, className: `scene-tag ${seen.a ? 'key' : ''} -translate-y-full`, children: <><small>前方 A</small>{seen.a ? `${num(fa(boat))} Hz` : '等波'}</> },
    { id: 'B', at: [B[0] - 0.9, 3.6, B[2]], ax: 0, className: `scene-tag ${seen.b ? 'key' : ''} -translate-y-full`, children: <><small>后方 B</small>{seen.b ? `${num(fb(boat))} Hz` : '等波'}</> },
    { id: 'boat', at: tag, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>起波锤 {num(TOW.f, 1)} Hz</small>艇速 {num(u, 1)} m/s</> },
  ]
  return (
    <LabShell title="机械振动和机械波" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="小艇"
      stage={<Place at="l7" labels={labels}><Rig key={boat} boat={boat} run={run} hold={seen.end} onMark={mark} tag={tag} /></Place>}
      lesson={<LessonBlock no="7" title="多普勒效应" concept="波源靠近，接收到的频率变高" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>波源和观察者之间有相对运动时，观察者接收到的频率和波源的频率不一样，这种现象叫<b className="text-white">多普勒效应</b>。</p>
          <p className="mt-3">波源自己的频率没有变。它一边振动一边往前走，前一个波峰还没走远，下一个波峰已经在更靠前的地方发出：前方的波长被压短成 (v − u)/f，后方被拉长成 (v + u)/f。波速 v 不变，所以前方的观察者每秒接到的波峰更多：<span className="font-formula italic">f′ = f·v / (v − u)</span>；后方是 <span className="font-formula italic">f·v / (v + u)</span>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">声波也一样。鸣着笛的船驶来时笛声尖，驶过以后变低。测速雷达、彩色超声查血流、天文学上测星体的远离速度，用的都是多普勒效应。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种艇速都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">波源靠近，频率变高；远离，变低</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">起波锤一直是 {num(TOW.f, 1)} Hz。艇以 1.0 m/s 开时，前方浮标接到 {num(fa('full'))} Hz，后方 {num(fb('full'))} Hz。鸣笛的船也一样：{HORN.f} Hz 的汽笛，船以 {HORN.u} m/s 驶来，岸上听到约 {Math.round(doppler(HORN.f, HORN.u, HORN.v))} Hz，驶离时约 {Math.round(doppler(HORN.f, -HORN.u, HORN.v))} Hz。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">f′ = f · v / (v ∓ u)</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-left">
              <div className="rounded-xl bg-white/8 px-3 py-2"><div className="text-[12px] text-white/55">前方 A 接收到</div><div className="text-[30px] leading-tight font-bold tabular-nums" style={{ color: '#ff9a8a' }}>{seen.a ? num(fa(boat)) : '—'}<span className="ml-1 text-[13px] font-medium text-white/55">Hz</span></div></div>
              <div className="rounded-xl bg-white/8 px-3 py-2"><div className="text-[12px] text-white/55">后方 B 接收到</div><div className="text-[30px] leading-tight font-bold tabular-nums" style={{ color: '#8fc4f5' }}>{seen.b ? num(fb(boat)) : '—'}<span className="ml-1 text-[13px] font-medium text-white/55">Hz</span></div></div>
            </div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="f" value={num(TOW.f, 1)} unit="Hz · 波源" />
            <ParamTile symbol="v" value={num(WATER.v, 1)} unit="m/s · 波速" />
            <ParamTile symbol="u" value={num(u, 1)} unit="m/s · 艇速" />
          </div>
          {rows.length > 0 && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
            <table className="mt-1 w-full text-[13px]">
              <thead><tr className="text-[11.5px] text-white/50"><th className="py-1 text-left font-normal">u / (m/s)</th><th className="text-right font-normal">前方 λ / m</th><th className="text-right font-normal">A / Hz</th><th className="text-right font-normal">后方 λ / m</th><th className="text-right font-normal">B / Hz</th></tr></thead>
              <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{num(BOATS[k].u, 1)}</td><td className="text-right tabular-nums">{num(lamAhead(TOW.f, BOATS[k].u), 0)}</td><td className="text-right font-semibold tabular-nums" style={{ color: '#ff9a8a' }}>{num(fa(k))}</td><td className="text-right tabular-nums">{num(lamBehind(TOW.f, BOATS[k].u), 0)}</td><td className="text-right font-semibold tabular-nums" style={{ color: '#8fc4f5' }}>{num(fb(k))}</td></tr>)}</tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={run !== 0}>开始起波</LabButton>
        <LabButton pulse={next === 'home'} onClick={home} disabled={busy || run === 0}>放回原处</LabButton>
      </>}
      extras={<Control label="艇速"><Segmented label="艇速" pulse={next === 'boat'} want={next === 'boat' ? want : null} value={boat} disabled={run !== 0} onChange={setBoat} options={KEYS.map(k => ({ value: k, label: BOATS[k].name }))} /></Control>}
    />
  )
}
