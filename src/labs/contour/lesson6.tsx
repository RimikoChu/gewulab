// 等高线地形图 · 第 6 课 鞍部和陡崖：A、B 两峰之间最低的那一处是鞍部；高原南缘几条等高线挤成一条，是陡崖，崖上挂着瀑布。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './stage'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Flag, OnLand, Trail } from './marks'
import { CLIFF, CLIFF_LINE, SADDLE, TOP_A, TOP_B, Y, altitude, cliffRange, levels, overlapCount, overlapLevels } from './physics'

type Where = 'saddle' | 'cliff'
const NAME: Record<Where, string> = { saddle: '鞍部', cliff: '陡崖' }
const LO = Math.floor(SADDLE.h / 100) * 100, HI = LO + 100
const N = overlapCount(CLIFF.top, CLIFF.foot), RANGE = cliffRange(N, 100), OVER = overlapLevels(CLIFF.top, CLIFF.foot)
const TASKS: Task[] = [
  { id: 'find', text: '在 A、B 两峰之间找出鞍部', note: '鞍部：两个山顶之间相对低洼的地方' },
  { id: 'read', text: '读出鞍部的海拔在哪两条线之间', note: `在 ${LO} m 和 ${HI} m 之间` },
  { id: 'count', text: '换到高原南缘，数一数重合在一起的等高线', note: `${OVER.join('、')} m 三条线重合在一起：这里是陡崖` },
  { id: 'calc', text: '算出陡崖相对高度的范围', note: `${RANGE[0]} m ≤ 相对高度 < ${RANGE[1]} m` },
]
const LINES = levels(100, 1600)

export default function Lesson6() {
  const [where, setWhere] = useState<Where>('saddle')
  const [found, setFound] = useState(false)
  const [read, setRead] = useState(false)
  const [counted, setCounted] = useState(false)
  const [calc, setCalc] = useState(false)
  const [settled, setSettled] = useState(true)
  const T = useTasks('gewu:contour:6', TASKS)
  const flat = where === 'cliff' && counted
  useEffect(() => { if (!counted) return; setSettled(false); const t = setTimeout(() => { setSettled(true); T.check(id => id === 'count') }, 1900); return () => clearTimeout(t) }, [counted])   // eslint-disable-line react-hooks/exhaustive-deps
  const b1 = () => { if (where === 'saddle') { setFound(true); T.check(id => id === 'find') } else setCounted(true) }
  const b2 = () => { if (where === 'saddle') { setRead(true); T.check(id => id === 'read') } else { setCalc(true); T.check(id => id === 'calc') } }
  const resetAll = () => { setWhere('saddle'); setFound(false); setRead(false); setCounted(false); setCalc(false); T.reset() }

  const task = T.current
  const want: Where = task && (task.id === 'count' || task.id === 'calc') ? 'cliff' : task ? 'saddle' : where
  const { hint, next }: { hint: string; next: 'where' | 'b1' | 'b2' | null } = (() => {
    if (!task) return { hint: '都做完了。鞍部在两峰之间，陡崖处等高线重合。', next: null }
    if (!settled) return { hint: '压成地图…', next: null }
    if (where !== want) return { hint: `换到“${NAME[want]}”`, next: 'where' }
    if (task.id === 'find') return { hint: '两个山顶之间，山脊最低的那一处在哪里？标出来', next: 'b1' }
    if (task.id === 'read') return { hint: '看鞍部夹在哪两条等高线之间', next: 'b2' }
    if (task.id === 'count') return { hint: '瀑布从高原的陡崖上跌下来：压成地图，数一数那里重合的线', next: 'b1' }
    return { hint: `${N} 条线重合，等高距 100 m：算一算陡崖有多高`, next: 'b2' }
  })()

  const k = flat ? 0.006 : 1
  const all: Label[] = [
    { id: 'a', at: [TOP_A[0], Y(altitude(TOP_A)) + 0.8, TOP_A[1]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `A 峰 ${altitude(TOP_A)} m` },
    { id: 'b', at: [TOP_B[0], Y(altitude(TOP_B)) + 0.8, TOP_B[1]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `B 峰 ${altitude(TOP_B)} m` },
    { id: 's', at: [SADDLE.at[0], Y(SADDLE.h) + 2.2, SADDLE.at[1]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: found ? 1 : 0 }, children: read ? <><small>鞍部</small>{LO} ~ {HI} m</> : '鞍部' },
    { id: 'lo', at: [SADDLE.at[0] + 3, Y(LO) + 0.2, SADDLE.at[1] + 2.6], className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: read ? 1 : 0 }, children: `${LO} m 线：把两峰围在一起` },
    { id: 'hi', at: [SADDLE.at[0] - 6.5, Y(HI) + 0.2, SADDLE.at[1] + 2.6], ax: 1, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: read ? 1 : 0 }, children: `${HI} m 线：两峰各围一圈` },
    { id: 'wf', at: [CLIFF.at[0] + 1.2, Y(CLIFF.top) * k + 0.4, CLIFF.at[1]], name: true, className: 'scene-name -translate-y-full', children: '瀑布' },
    { id: 'c', at: [CLIFF.at[0] - 4, Y(CLIFF.top) * k + 0.3, CLIFF.at[1] + 0.6], ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: flat && settled ? 1 : 0 }, children: calc ? <><small>相对高度</small>{RANGE[0]} ~ {RANGE[1]} m</> : <><small>{OVER.join('、')} m</small>{N} 条线重合</> },
  ]
  const mine = where === 'saddle' ? ['a', 'b', 's', 'lo', 'hi'] : ['wf', 'c']
  const labels = all.filter(l => mine.includes(l.id))
  const view = where === 'saddle' ? 'saddle' : flat ? 'cliffMap' : 'cliff'
  return (
    <LabShell title="等高线地形图" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={NAME[where]}
      stage={<Spot at={view} labels={labels} want={{ flat, lines: LINES, glow: where === 'saddle' && read ? [LO, HI] : where === 'cliff' && counted ? OVER : [] }}>
        {where === 'cliff' && counted && <OnLand lift={0.12}><Trail pts={CLIFF_LINE} color="#ff4a3a" width={7} drape={0.05} /><CliffTeeth /></OnLand>}
        {found && <Flag x={SADDLE.at[0]} z={SADDLE.at[1]} color="#35c7b3" s={2} />}
      </Spot>}
      lesson={<LessonBlock no="6" title="鞍部和陡崖" concept="鞍部在两峰之间，陡崖处等高线重合" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">鞍部</b>：两个山顶之间相对低洼的部位，形状像马鞍。图上是两组闭合等高线之间的那一处。</p>
          <p className="mt-2"><b className="text-white">陡崖</b>：近于垂直的山坡，几条等高线在图上<b className="text-white">重合</b>在一起，常画成专门的符号。河流流过陡崖，就形成瀑布。</p>
          <p className="mt-2">陡崖的相对高度：有 n 条等高线重合、等高距为 d 时，(n − 1)d ≤ H &lt; (n + 1)d。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">鞍部在 {LO} ~ {HI} m 之间；陡崖 {N} 条线重合，相对高度 {RANGE[0]} ~ {RANGE[1]} m</p>
        <p className="mt-1 text-[14px] text-white/70">(n − 1)d ≤ H &lt; (n + 1)d：({N} − 1) × 100 ≤ H &lt; ({N} + 1) × 100。崖顶到崖脚实际差 {CLIFF.top - CLIFF.foot} m，在这个范围里。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          {where === 'saddle' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">鞍部的海拔</div>
              <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{read ? `${LO} ~ ${HI}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="A 峰" value={String(altitude(TOP_A))} unit="m" />
              <ParamTile symbol="B 峰" value={String(altitude(TOP_B))} unit="m" />
            </div>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">陡崖的相对高度</div>
              <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{calc ? `${RANGE[0]} ~ ${RANGE[1]}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="n" value={counted && settled ? String(N) : '—'} unit="条 · 重合的等高线" />
              <ParamTile symbol="d" value="100" unit="m · 等高距" />
            </div>
            <p className="mt-3 text-center font-formula text-[16px] italic text-white/70">(n − 1)d ≤ H &lt; (n + 1)d</p>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'b1'} onClick={b1} disabled={where === 'saddle' ? found : counted}>{where === 'saddle' ? '标出鞍部' : '压成地图数一数'}</LabButton>
        <LabButton primary pulse={next === 'b2'} onClick={b2} disabled={where === 'saddle' ? !found || read : !counted || !settled || calc}>{where === 'saddle' ? '读鞍部海拔' : '算陡崖高度'}</LabButton>
      </>}
      extras={<Control label="看哪里"><Segmented label="看哪里" pulse={next === 'where'} want={next === 'where' ? want : null} value={where} onChange={setWhere} options={(['saddle', 'cliff'] as Where[]).map(w => ({ value: w, label: NAME[w] }))} /></Control>}
    />
  )
}

/** 陡崖符号：沿崖顶一排指向崖下的短齿 */
function CliffTeeth() {
  const pts = CLIFF_LINE.filter((_, i) => i % 2 === 0)
  return <>{pts.map(([x, z], i) => <Trail key={i} pts={[[x, z], [x, z + 0.7]]} color="#ff4a3a" width={4} drape={0.05} />)}</>
}
