// 等高线地形图 · 第 4 课 山峰和盆地：两处都是闭合的等高线，标上数值、画上示坡线才分得清哪里中间高、哪里中间低。
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './stage'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { SlopeTicks } from './marks'
import { BASIN_C, TOP_A, Y, altitude, innerRing, levels, outerRing, rayToLevel, slopeTicks } from './physics'

type Where = 'peak' | 'basin'
const SPOT: Record<Where, { name: string; at: readonly [number, number] }> = { peak: { name: '山顶', at: TOP_A }, basin: { name: '盆地', at: BASIN_C } }
const rings = (w: Where) => [innerRing(SPOT[w].at as [number, number], w), outerRing(SPOT[w].at as [number, number], w)]
const TASKS: Task[] = [
  { id: 'peak', text: '在山顶这里标出两圈等高线的数值', note: `里圈 ${rings('peak')[0]} m，外圈 ${rings('peak')[1]} m：中间高、四周低，是山峰` },
  { id: 'basin', text: '换到盆地，也标出数值', note: `里圈 ${rings('basin')[0]} m，外圈 ${rings('basin')[1]} m：中间低、四周高，是盆地` },
  { id: 'ticks', text: '画上示坡线，看坡往哪边下', note: '示坡线画在等高线上，指向低处' },
  { id: 'solid', text: '把地图立起来，看看两处的样子', note: '山峰凸起，盆地凹下' },
]
const LINES = levels(100, 1600)
/** 标数字的方向：山顶往西南，盆地往东南 */
const DIR: Record<Where, [number, number]> = { peak: [-1, 0.6], basin: [0.7, 0.7] }

export default function Lesson4() {
  const [where, setWhere] = useState<Where>('peak')
  const [vals, setVals] = useState<Where[]>([])
  const [ticks, setTicks] = useState(false)
  const [flat, setFlat] = useState(true)
  const [settled, setSettled] = useState(true)
  const T = useTasks('gewu:contour:4', TASKS)
  useEffect(() => { setSettled(false); const t = setTimeout(() => { setSettled(true); if (!flat) T.check(id => id === 'solid') }, 1900); return () => clearTimeout(t) }, [flat])   // eslint-disable-line react-hooks/exhaustive-deps
  const label = () => { if (vals.includes(where)) return; const n = [...vals, where]; setVals(n); T.check(id => n.includes(id as Where)) }
  const tick = () => { setTicks(true); T.check(id => id === 'ticks') }
  const resetAll = () => { setWhere('peak'); setVals([]); setTicks(false); setFlat(true); T.reset() }
  const tk = useMemo(() => ({ peak: rings('peak').map(lv => slopeTicks(TOP_A, lv, 10)), basin: rings('basin').map(lv => slopeTicks(BASIN_C, lv, 12)) }), [])

  const task = T.current
  const { hint, next }: { hint: string; next: 'where' | 'label' | 'ticks' | 'solid' | null } = (() => {
    if (!task) return { hint: '都做完了。闭合等高线中间高是山峰，中间低是盆地。', next: null }
    if (!settled) return { hint: '地图正在变化…', next: null }
    if (task.id === 'peak' || task.id === 'basin') return where !== task.id ? { hint: `换到“${SPOT[task.id as Where].name}”`, next: 'where' } : { hint: task.id === 'peak' ? '这里是一圈套一圈的闭合曲线：标出数值' : '这里也是闭合曲线：标出数值', next: 'label' }
    if (task.id === 'ticks') return { hint: '画上示坡线，看坡往哪边下', next: 'ticks' }
    return { hint: '把地图立起来，看看真实的样子', next: 'solid' }
  })()

  const k = flat ? 0.006 : 1, [r0, r1] = rings(where)
  const labels: Label[] = (['peak', 'basin'] as Where[]).flatMap((w): Label[] => {
    const show = vals.includes(w) && settled
    return [
      ...rings(w).map((lv, i): Label => { const [x, z] = rayToLevel(SPOT[w].at as [number, number], DIR[w], lv); return { id: `${w}${i}`, at: [x, Y(lv) * k + 0.1, z], ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: show ? 1 : 0 }, children: `${lv}` } }),
      { id: `${w}c`, at: [SPOT[w].at[0], Y(altitude(SPOT[w].at as [number, number])) * k + 0.2, SPOT[w].at[1]], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: show ? 1 : 0 }, children: `中心 ${altitude(SPOT[w].at as [number, number])} m` },
    ]
  })
  const view = where === 'peak' ? (flat ? 'top' : 'top3d') : (flat ? 'basin' : 'basin3d')
  return (
    <LabShell title="等高线地形图" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="读图"
      stage={<Spot at={view} labels={labels} want={{ flat, lines: LINES, glow: [r0, r1] }}>
        {(['peak', 'basin'] as Where[]).map(w => rings(w).map((lv, i) => <SlopeTicks key={`${w}${lv}`} ticks={tk[w][i]} level={lv} on={ticks} />))}
      </Spot>}
      lesson={<LessonBlock no="4" title="山峰和盆地" concept="闭合等高线：中间高是山峰，中间低是盆地" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>山峰和盆地的等高线都是<b className="text-white">闭合曲线</b>，只看形状分不出来，要看数值：</p>
          <ul className="mt-2 flex flex-col gap-1 text-white/85">
            <li><b className="text-[#7fe3d4]">山峰：</b>中间数值大、四周数值小</li>
            <li><b className="text-[#7fe3d4]">盆地：</b>中间数值小、四周数值大</li>
          </ul>
          <p className="mt-2">没有标数值时，可以画<b className="text-white">示坡线</b>：垂直于等高线的短线，指向坡下降的方向。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">山顶这里里圈 {rings('peak')[0]} m、外圈 {rings('peak')[1]} m；盆地这里里圈 {rings('basin')[0]} m、外圈 {rings('basin')[1]} m</p>
        <p className="mt-1 text-[14px] text-white/70">都是闭合的等高线：中间高、四周低是山峰；中间低、四周高是盆地。示坡线指向低处。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SPOT[where].name} · 中心海拔</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{vals.includes(where) ? altitude(SPOT[where].at as [number, number]) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="里圈" value={vals.includes(where) ? String(r0) : '—'} unit="m" />
            <ParamTile symbol="外圈" value={vals.includes(where) ? String(r1) : '—'} unit="m" />
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5 text-[14px]">
            {vals.includes(where) ? <><b className="text-[#7fe3d4]">{where === 'peak' ? '里高外低' : '里低外高'}</b>：{where === 'peak' ? '这是山峰' : '这是盆地'}</> : <span className="text-white/55">标出数值才分得清是山峰还是盆地</span>}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'label'} onClick={label} disabled={!settled || vals.includes(where)}>标出数值</LabButton>
        <LabButton pulse={next === 'ticks'} onClick={tick} disabled={ticks || vals.length < 2}>画示坡线</LabButton>
        <LabButton primary pulse={next === 'solid'} onClick={() => setFlat(f => !f)} disabled={!settled || !ticks}>{flat ? '立起来看' : '压回地图'}</LabButton>
      </>}
      extras={<Control label="看哪里"><Segmented label="看哪里" pulse={next === 'where'} want={next === 'where' ? task!.id as Where : null} value={where} onChange={setWhere} options={(['peak', 'basin'] as Where[]).map(w => ({ value: w, label: SPOT[w].name }))} /></Control>}
    />
  )
}
