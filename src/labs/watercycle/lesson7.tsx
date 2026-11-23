// 水循环 · 第 7 课 一年的水账（水量平衡）
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import Basin from './basin'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { BUDGET, landGain, seaLoss, type LinkKey } from './physics'
import { pathMid } from './world'

const TASKS: Task[] = [
  { id: 'sea', text: '记下海洋的账：蒸发多少，降水多少', note: `蒸发 ${BUDGET.seaEvap}，降水 ${BUDGET.seaRain}：每年多蒸发掉 ${seaLoss()}` },
  { id: 'land', text: '记下陆地的账：降水多少，蒸发多少', note: `降水 ${BUDGET.landRain}，蒸发 ${BUDGET.landEvap}：每年多落下 ${landGain()}` },
  { id: 'same', text: '比一比两个差额', note: `都是 ${seaLoss()}：海洋多蒸发的水，被风送到陆地，又从河里流回了海洋` },
]

export default function Lesson7() {
  const [sea, setSea] = useState(false)
  const [land, setLand] = useState(false)
  const T = useTasks('gewu:watercycle:7', TASKS)
  const ok = (s: boolean, l: boolean) => (id: string) => id === 'sea' ? s : id === 'land' ? l : s && l
  const resetAll = () => { setSea(false); setLand(false); T.reset() }
  const task = T.current
  const hint = !task ? '账平了：海洋少掉的，正好是陆地多出来的，又顺着河流回海洋。' : task.id === 'sea' ? '按“记下海洋的账”' : '按“记下陆地的账”'
  const links: LinkKey[] = [...(sea ? ['evap', 'seaRain'] as LinkKey[] : []), ...(land ? ['rain', 'landEvap'] as LinkKey[] : []), ...(sea && land ? ['move', 'runoff'] as LinkKey[] : [])]
  const NUM: Partial<Record<LinkKey, [string, number]>> = { evap: ['海洋蒸发', BUDGET.seaEvap], seaRain: ['海上降水', BUDGET.seaRain], rain: ['陆地降水', BUDGET.landRain], landEvap: ['陆地蒸发', BUDGET.landEvap], move: ['水汽输送', seaLoss()], runoff: ['入海径流', landGain()] }
  const labels: Label[] = links.map(k => ({ id: k, at: pathMid(k), ax: 0.5, className: `scene-tag -translate-y-full${k === 'move' || k === 'runoff' ? ' key' : ''}`, children: <><small>{NUM[k]![0]}</small>{NUM[k]![1]}</> }))

  return (
    <LabShell title="水循环" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="全球一年的水量"
      stage={<Basin labels={labels} want={{ links, rain: [...(sea ? ['sea' as const] : []), ...(land ? ['land' as const] : [])] }} />}
      lesson={<LessonBlock no="7" title="一年的水账" concept="多年平均来看，收入等于支出" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>从多年平均来看，全球的水量是平衡的：</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">海洋：</b>蒸发量 = 降水量 + 入海径流量</li>
            <li><b className="text-[#7fe3d4]">陆地：</b>降水量 = 蒸发量 + 入海径流量</li>
            <li><b className="text-[#7fe3d4]">全球：</b>蒸发量 = 降水量</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">数字是全球估算值，单位是千立方千米每年。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">账平了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">海洋每年少掉的 {seaLoss()}，正好是陆地多出来的 {landGain()}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">这些水由风送到陆地，再由河流送回海洋。所以海不会干，陆地也不会被淹。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">两边的差额</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{sea && land ? seaLoss() : '—'}</div>
            <div className="mt-1 text-[12.5px] text-white/50">千立方千米每年</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal"></th><th className="text-right font-normal">蒸发</th><th className="text-right font-normal">降水</th><th className="text-right font-normal">差额</th></tr></thead>
            <tbody>
              <tr className="border-t border-white/12"><td className="py-1.5 text-white/80">海洋</td><td className="text-right tabular-nums">{sea ? BUDGET.seaEvap : '—'}</td><td className="text-right tabular-nums">{sea ? BUDGET.seaRain : '—'}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{sea ? `少 ${seaLoss()}` : '—'}</td></tr>
              <tr className="border-t border-white/12"><td className="py-1.5 text-white/80">陆地</td><td className="text-right tabular-nums">{land ? BUDGET.landEvap : '—'}</td><td className="text-right tabular-nums">{land ? BUDGET.landRain : '—'}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{land ? `多 ${landGain()}` : '—'}</td></tr>
            </tbody>
          </table>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="水汽输送" value={sea && land ? String(seaLoss()) : '—'} unit="从海上到陆地" />
            <ParamTile symbol="入海径流" value={sea && land ? String(landGain()) : '—'} unit="从陆地回海洋" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={!sea} pulse={task?.id === 'sea'} onClick={() => { setSea(true); T.check(ok(true, land)) }} disabled={sea}>记下海洋的账</LabButton>
        <LabButton primary={sea} pulse={task?.id === 'land' || (task?.id === 'same' && !land)} onClick={() => { setLand(true); T.check(ok(sea, true)) }} disabled={land}>记下陆地的账</LabButton>
      </>}
      extras={null}
    />
  )
}
