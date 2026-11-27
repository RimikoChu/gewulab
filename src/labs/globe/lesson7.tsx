// 地球和经纬网 · 第 7 课 经纬网上的方向：在海图桌的纸海图上，从出发点画航线到三个目的地，判断方向
import { useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { DIR_OPTIONS, GOALS, START, direction, latShort, lonShort, type Dir } from './physics'
import { PAPER_AT, paperWorld } from './bridge'
import { LESSONS, goLesson } from './lessons'
import type { Want } from './world'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = GOALS.map(g => ({ id: g.id, text: `画一条到${g.name}的航线，判断方向`, note: { jia: '同一条经线上往北：正北。经线指示南北', yi: '同一条纬线上往东：正东。纬线指示东西', bing: '纬度大了、经度也大了：往北又往东，是东北' }[g.id]! }))
const TARGET = new THREE.Vector3(PAPER_AT.c.x, PAPER_AT.c.y, PAPER_AT.c.z + 0.02)

export default function Lesson7() {
  const [lines, setLines] = useState<string[]>([])
  const [drawing, setDrawing] = useState<string | null>(null)
  const [dir, setDir] = useState<Dir | ''>('')
  const T = useTasks('gewu:globe:7', TASKS)
  const t = useSlide(drawing ? 1 : 0, 0.7), busy = drawing !== null && t < 0.999
  const task = T.current, goal = task ? GOALS.find(g => g.id === task.id)! : null
  const answer = goal ? direction(START, goal) : null
  const drawn = goal ? drawing === goal.id && !busy : false
  const draw = () => { if (!goal) return; setDrawing(goal.id); setDir('') }
  const pick = (d: Dir) => {
    setDir(d)
    if (!goal || !drawn || d !== answer) return
    const next = [...lines, goal.id]; setLines(next); setDrawing(null); setTimeout(() => setDir(''), 600)
    T.check(id => next.includes(id))
  }
  const resetAll = () => { setLines([]); setDrawing(null); setDir(''); T.reset() }

  const { hint, next }: { hint: string; next: 'draw' | 'dir' | null } = (() => {
    if (!task || !goal) return { hint: '都做完了。看海图上的三条铅笔线：沿经线是南北，沿纬线是东西。', next: null }
    if (!drawing) return { hint: `从出发点画一条到${goal.name}的航线`, next: 'draw' }
    if (busy) return { hint: '正在画线…', next: null }
    if (dir && dir !== answer) {
      const dLat = goal.lat - START.lat, dLon = goal.lon - START.lon
      return { hint: `不对。${goal.name}的纬度${dLat > 0 ? '大' : dLat < 0 ? '小' : '一样'}，经度${dLon > 0 ? '大' : dLon < 0 ? '小' : '一样'}：${dLat === 0 ? '在同一条纬线上，' : ''}${dLon === 0 ? '在同一条经线上，' : ''}再想想`, next: 'dir' }
    }
    return { hint: `${goal.name}在出发点的哪个方向？`, next: 'dir' }
  })()

  const labels: Label[] = [
    { id: 'st', at: paperWorld(START.lat, START.lon), ax: 1, className: 'scene-tag -translate-x-3 translate-y-2', children: <><small>出发</small>{latShort(START.lat)} {lonShort(START.lon)}</> },
    ...GOALS.map(g => ({ id: g.id, at: paperWorld(g.lat, g.lon), ax: 0, className: `scene-tag ${lines.includes(g.id) ? 'key' : ''} translate-x-3 -translate-y-full`, children: <><small>{g.name}</small>{lines.includes(g.id) ? direction(START, g) : `${latShort(g.lat)} ${lonShort(g.lon)}`}</> }) as Label),
    { id: 'tb', at: [PAPER_AT.c.x - PAPER_AT.w / 2 - 0.05, PAPER_AT.c.y, PAPER_AT.c.z + PAPER_AT.h / 2], ax: 1, className: 'scene-name', name: true, children: '海图桌' },
  ]
  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title="地球和经纬网" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="海图"
      stage={<LabStage<Want> labels={labels} target={TARGET} span={[1.45, 1.1]} view={[0.0, 1.05]} env={0.7} sun={1.6} fog={[150, 1500]} world={{ paper: { start: START, goals: GOALS, lines, drawing: drawing ? { id: drawing, t } : null } }}>{null}</LabStage>}
      lesson={<LessonBlock no="7" title="经纬网上的方向" concept="经线指南北，纬线指东西" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在经纬网上判断方向：<b className="text-white">经线指示南北方向，纬线指示东西方向</b>。</p>
          <p className="mt-2">两点在同一条经线上，就是正南正北：纬度大的在北边（北半球）。两点在同一条纬线上，就是正东正西：东经度数大的在东边。</p>
          <p className="mt-2">经度、纬度都不一样，就把两个方向合起来，比如“东北”“西南”。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三条航线都画完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">沿经线是南北，沿纬线是东西</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">经度、纬度都不同时，两个方向合起来：往北又往东，就是东北。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{goal ? `出发点 → ${goal.name}` : '三条航线'}</div>
            <div className="mt-1 text-[38px] leading-none font-bold tracking-tight text-[#7fe3d4]">{goal ? (dir === answer ? answer : '？') : '画完了'}</div>
          </div>
          {goal && <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="纬度" value={`${latShort(START.lat)} → ${latShort(goal.lat)}`} unit={goal.lat === START.lat ? '一样：同一条纬线' : goal.lat > START.lat ? '变大：往北' : '变小：往南'} />
            <ParamTile symbol="经度" value={`${lonShort(START.lon)} → ${lonShort(goal.lon)}`} unit={goal.lon === START.lon ? '一样：同一条经线' : goal.lon > START.lon ? '变大：往东' : '变小：往西'} />
          </div>}
          <h2 className="mt-5 text-[12.5px] text-white/55">航线记录</h2>
          {lines.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">还没有记录。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <tbody>{lines.map(id => { const g = GOALS.find(x => x.id === id)!; return <tr key={id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">到{g.name}</td><td className="text-white/65">{latShort(g.lat)} {lonShort(g.lon)}</td><td className="text-right font-semibold text-[#7fe3d4]">{direction(START, g)}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'draw'} onClick={draw} disabled={!goal || drawing !== null}>画航线</LabButton>
      </>}
      extras={
        <Control label="方向">
          <Segmented label="方向" pulse={next === 'dir'} want={answer} disabled={!drawn} value={dir as Dir} onChange={k => pick(k as Dir)} options={DIR_OPTIONS.map(d => ({ value: d, label: d }))} />
        </Control>
      }
    />
  )
}
