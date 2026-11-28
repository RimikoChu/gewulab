// 静电场 · 第 2 课 电场强度：把试探小球挂到离带电金属球 0.10、0.20、0.30 m 处，记下它受的力；
// 再换一颗电荷量只有一半的小球回到 0.10 m：力减半，力和电荷量的比值不变。这个比值就是电场强度。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LESSONS, goLesson } from './lessons'
import { ST, TOP } from './layout'
import { DOME, hangAngle, pointField, probeForce, sci } from './physics'
import { R2, Rig2 } from './scene2'
import { useSettled } from './anim'
import { Big, Final, Sub } from './ui'
import { Place } from './world'

const E = (i: number) => sci(pointField(DOME.Q, DOME.r[i]), i === 1 ? 2 : 1)
const TASKS: Task[] = [
  { id: '0-0', text: '把小球挂到 0.10 m 处，记录受力', note: `F = ${sci(probeForce(DOME.q[0], DOME.r[0]))} N，F/q = ${E(0)} N/C` },
  { id: '1-0', text: '挂到 0.20 m 处，再记一次', note: `距离 2 倍，F/q 只有四分之一：${E(1)} N/C` },
  { id: '2-0', text: '挂到 0.30 m 处，再记一次', note: `距离 3 倍，F/q 只有九分之一：${E(2)} N/C` },
  { id: '0-1', text: '回到 0.10 m，换成电荷量一半的小球', note: `力减半，F/q 还是 ${E(0)} N/C：场强与试探电荷无关` },
]
const X = ST.l2
type Pos = '0' | '1' | '2'

export default function Lesson2() {
  const [pos, setPos] = useState<Pos>('0')
  const [which, setWhich] = useState(0)
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:efield:2', TASKS)
  const i = Number(pos), key = `${pos}-${which}`
  const r = useSlide(DOME.r[i], 0.09), settled = useSettled(key, 1700) && r === DOME.r[i]
  const q = DOME.q[which], F = probeForce(q, r), theta = hangAngle(F)
  const dup = rows.includes(key)
  const record = () => { if (!settled || dup) return; const n = [...rows, key]; setRows(n); T.check(id => n.includes(id)) }
  const resetAll = () => { setPos('0'); setWhich(0); setRows([]); T.reset() }

  const task = T.current
  type Next = 'pos' | 'which' | 'record' | null
  const [wp, ww] = task ? task.id.split('-') : ['0', '0']
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: 'E = F / q：电场强度由电场本身决定。', next: null }
    if (String(which) !== ww) return { hint: '换成电荷量一半的小球', next: 'which' }
    if (pos !== wp) return { hint: `把小球挂到 ${DOME.r[Number(wp)].toFixed(2)} m 处`, next: 'pos' }
    return settled ? { hint: '小球停稳了，记录数据', next: 'record' } : { hint: '等小球停稳…', next: null }
  })()

  const bx = X + R2.c[0] + r, by = TOP + R2.c[1]
  const labels: Label[] = [
    { id: 'n1', at: [X + R2.c[0], by + DOME.R + 0.02, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '带电金属球 Q' },
    { id: 'n2', at: [X + R2.c[0] + 0.2, TOP + 0.01, 0.11], ax: 0.5, name: true, className: 'scene-name', children: '米尺（0 对着球心）' },
    { id: 'n4', at: [X + 0.15, TOP + 0.085, 0.17], ax: 0, name: true, className: 'scene-name', children: which ? '电荷量 q 的小球' : '电荷量 q/2 的小球' },
    { id: 'n3', at: [bx, by - 0.03, 0], ax: 0.5, name: true, className: 'scene-name', children: '试探小球 q' },
    { id: 'f', at: [bx + 0.03, by + 0.035, 0], ax: 0, className: 'scene-tag key -translate-y-full', children: <><small>F</small>{sci(F)} N</> },
    { id: 'r', at: [bx, TOP + 0.045, 0.085], ax: 0.5, className: 'scene-tag', children: <><small>r</small>{r.toFixed(2)} m</> },
  ]
  return (
    <LabShell title="静电场" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="试探小球"
      stage={<Place at="l2" cur="l2" labels={labels}><Rig2 r={r} theta={theta} F={F} which={which} /></Place>}
      lesson={<LessonBlock no="2" title="电场强度" concept="E = F/q，由电场本身决定" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电荷周围存在电场，电荷之间的力是通过电场发生的。把一个电荷量很小的<b className="text-white">试探电荷</b> q 放到电场中某一点，它受的力 F 与 q 的比值叫这一点的电场强度：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">E = F / q</p>
          <p className="mt-3">单位是牛每库（N/C）。方向规定为正电荷在该点受力的方向。</p>
          <p className="mt-3">点电荷 Q 的电场：E = kQ / r²。它只由场源电荷 Q 和位置决定；换一个试探电荷，力变了，比值不变；把试探电荷拿走，这一点的电场强度还在。</p>
        </>} />}
      finale={T.finale && <Final kicker="四组数据都记完了" title="E = F/q：离场源越远越弱，与试探电荷无关"
        body={<>0.10、0.20、0.30 m 处的场强是 {E(0)}、{E(1)}、{E(2)} N/C，正好符合 E = kQ/r²。</>} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="E = F / q" value={sci(pointField(DOME.Q, r), 2)} unit="N/C" note="小球所在位置的电场强度" />
          <Sub>关键参数</Sub>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="F" value={sci(F)} unit="N · 小球受的力" />
            <ParamTile symbol="q" value={sci(q)} unit="C · 试探电荷" />
            <ParamTile symbol="r" value={r.toFixed(2)} unit="m · 到球心" />
            <ParamTile symbol="Q" value={sci(DOME.Q)} unit="C · 金属球" />
          </div>
          <Sub>记录</Sub>
          <table className="mt-1.5 w-full text-[13px] tabular-nums">
            <thead><tr className="text-white/50"><th className="py-1 text-left font-normal">r / m</th><th className="text-right font-normal">q / C</th><th className="text-right font-normal">F / N</th><th className="text-right font-normal">F/q / (N/C)</th></tr></thead>
            <tbody>{rows.map(k => { const [a, b] = k.split('-').map(Number); return <tr key={k} className="border-t border-white/10"><td className="py-1">{DOME.r[a].toFixed(2)}</td><td className="text-right">{sci(DOME.q[b])}</td><td className="text-right">{sci(probeForce(DOME.q[b], DOME.r[a]), a === 1 ? 2 : 1)}</td><td className="text-right">{E(a)}</td></tr> })}</tbody>
          </table>
          {!rows.length && <p className="mt-1 text-[13px] text-white/45">还没有记录</p>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'which'} onClick={() => setWhich(w => 1 - w)}>{which ? '换回电荷量 q 的小球' : '换成 q/2 的小球'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!settled || dup}>记录数据</LabButton>
      </>}
      extras={<Control label="小球到球心的距离"><Segmented label="小球到球心的距离" pulse={next === 'pos'} want={next === 'pos' ? wp as Pos : null} value={pos} onChange={setPos} options={[{ value: '0', label: '0.10 m' }, { value: '1', label: '0.20 m' }, { value: '2', label: '0.30 m' }]} /></Control>}
    />
  )
}
