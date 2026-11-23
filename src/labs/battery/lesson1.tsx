// 原电池 · 第 1 课 连上导线以后（原电池把化学能变成电能）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { METALS, negativeOf, reactsWithAcid } from './physics'
import Rig, { X } from './rig'
import { TOP } from './world'

type Link = 'off' | 'on'
const TASKS: Task[] = [
  { id: 'off', text: '不连导线：看两片金属各有什么现象，记下来', note: '锌片上冒气泡，铜片上没有：锌能和稀硫酸反应，铜不能' },
  { id: 'on', text: '连上导线：再看一次，记下来', note: '气泡改从铜片上冒出来，电流表指针偏转，灯亮了' },
]
const SEE: Record<Link, { zn: string; cu: string; meter: string }> = { off: { zn: '冒气泡', cu: '没有变化', meter: '不偏转' }, on: { zn: '慢慢溶解', cu: '冒气泡', meter: '偏转' } }

export default function Lesson1() {
  const [link, setLink] = useState<Link>('off')
  const [rows, setRows] = useState<Link[]>([])
  const T = useTasks('gewu:battery:1', TASKS)
  const on = link === 'on', dup = rows.includes(link)
  const record = () => { if (dup) return; const next = [...rows, link]; setRows(next); T.check(id => next.includes(id as Link)) }
  const resetAll = () => { setLink('off'); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'link' | 'record' | null } = !task ? { hint: '都记完了。导线里有了电流：化学能变成了电能。', next: null }
    : link !== task.id ? { hint: task.id === 'on' ? '把导线连上' : '先把导线断开', next: 'link' } : { hint: '看清两片金属上的现象，按“记录”', next: 'record' }
  const labels: Label[] = [
    { id: 'zn', at: [X - 0.3, TOP + 0.62, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>锌片</small>{SEE[link].zn}</> },
    { id: 'cu', at: [X + 0.3, TOP + 0.62, 0], className: `scene-tag -translate-y-1/2${on ? ' key' : ''}`, children: <><small>铜片</small>{SEE[link].cu}</> },
    { id: 'nAcid', at: [X, TOP + 0.02, 0.36], ax: 0.5, name: true, className: 'scene-name', children: '稀硫酸' },
    { id: 'nMeter', at: [X - 0.2, TOP + 0.3, -0.5], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '电流表' },
  ]

  return (
    <LabShell title="原电池" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="锌片和铜片"
      stage={<Rig left="Zn" right="Cu" joined={on} flow={on ? 1 : 0} gasL={on ? 0 : 0.8} gasR={on ? 0.9 : 0} labels={labels} />}
      lesson={<LessonBlock no="1" title="连上导线以后" concept="把化学能直接变成电能的装置，叫原电池" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>{METALS.Zn.name}{reactsWithAcid('Zn') ? '能' : '不能'}和稀硫酸反应放出氢气，{METALS.Cu.name}{reactsWithAcid('Cu') ? '能' : '不能'}。所以不连导线时，只有锌片上冒气泡。</p>
          <p className="mt-3">用导线把两片连起来以后，气泡改从<b className="text-white">铜片</b>上冒出，电流表的指针偏转了：导线里有电流通过。反应还是锌和稀硫酸的反应，但反应放出的能量有一部分变成了<b className="text-white">电能</b>。</p>
          <p className="mt-3">这种把化学能转化为电能的装置叫<b className="text-white">原电池</b>。这里{METALS[negativeOf('Zn', 'Cu')!].name}是负极。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两次的现象不一样</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">连上导线，气泡跑到了铜片上，导线里有了电流</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">铜并没有和酸反应。为什么气泡会从铜片上冒出来？下一课放大了看。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">电流表的指针</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight text-[#7fe3d4]">{SEE[link].meter}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="锌片" value={SEE[link].zn} unit="较活泼的金属" />
            <ParamTile symbol="铜片" value={SEE[link].cu} unit="不和稀硫酸反应" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">两种接法各记一次。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">导线</th><th className="font-normal">锌片</th><th className="font-normal">铜片</th><th className="font-normal">电流表</th></tr></thead>
                <tbody>{rows.map(r => <tr key={r} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{r === 'on' ? '连上' : '不连'}</td><td>{SEE[r].zn}</td><td className="font-semibold text-[#7fe3d4]">{SEE[r].cu}</td><td>{SEE[r].meter}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'record'} onClick={record} disabled={dup}>记录</LabButton></>}
      extras={<Control label="导线"><Segmented label="导线" pulse={next === 'link'} want={next === 'link' ? task!.id as Link : null} value={link} onChange={setLink} options={[{ value: 'off', label: '不连' }, { value: 'on', label: '连上' }]} /></Control>}
    />
  )
}
