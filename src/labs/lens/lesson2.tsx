// 光的折射和凸透镜成像 · 第 2 课 聚拢还是散开（凸透镜会聚、凹透镜发散；焦点和焦距）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Axis, Dark, Lens, Ray } from './optics'
import { F, LENSES, type LensKey } from './physics'
import { AXIS, CM, ST } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS = Object.keys(LENSES) as LensKey[]
const TASKS: Task[] = [
  { id: 'convex', text: '让一束平行光穿过凸透镜，记下它怎样了', note: `会聚到一点：这一点是焦点，它到透镜中心的距离是焦距，这里是 ${F} cm` },
  { id: 'concave', text: '换成凹透镜，再记一次', note: '散开了：凹透镜对光有发散作用' },
]
const X = (cm: number) => ST.bench + cm * CM, Y = (cm: number) => AXIS + cm * CM, HS = [-6, -3, 0, 3, 6]

export default function Lesson2() {
  const [kind, setKind] = useState<LensKey>('convex')
  const [rows, setRows] = useState<LensKey[]>([])
  const T = useTasks('gewu:lens:2', TASKS)
  const dup = rows.includes(kind), cx = kind === 'convex'
  const record = () => { if (dup) return; const next = [...rows, kind]; setRows(next); T.check(id => next.includes(id as LensKey)) }
  const resetAll = () => { setKind('convex'); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'kind' | 'record' | null } = !task ? { hint: '两种透镜都看过了。中间厚的会聚，中间薄的发散。', next: null }
    : kind !== task.id ? { hint: `换成“${LENSES[task.id as LensKey].name}”`, next: 'kind' } : { hint: '看光通过透镜以后是聚拢还是散开，按“记录”', next: 'record' }
  const labels: Label[] = [
    { id: 'f', at: [X(cx ? F : -F), Y(-1.6), 0.34], ax: 0.5, className: 'scene-tag key', children: cx ? <><small>焦点 F</small>焦距 {F} cm</> : <><small>虚焦点</small>反向延长才相交</> },
    { id: 'n', at: [X(0), Y(9.5), 0.34], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `${LENSES[kind].name}：${LENSES[kind].shape}` },
    { id: 'src', at: [X(-34.5), Y(8.5), 0.34], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '平行光源' },
  ]

  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title="折射和凸透镜" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="透镜"
      stage={<Dark at="bench" labels={labels}>
        <Axis x0={X(-36)} x1={X(36)} y={AXIS} marks={[X(cx ? F : -F)]} />
        <mesh position={[X(-34.5), AXIS, 0]}><boxGeometry args={[0.16, 0.86, 0.4]} /><meshStandardMaterial color="#2b3136" metalness={0.5} roughness={0.5} /></mesh>
        <Lens x={X(0)} y={AXIS} kind={kind} />
        {HS.map(h => <group key={h}>
          <Ray a={[X(-33), Y(h)]} b={[X(0), Y(h)]} />
          {cx ? <Ray a={[X(0), Y(h)]} b={[X(32), Y(h - h * 32 / F)]} /> : <><Ray a={[X(0), Y(h)]} b={[X(22), Y(h + h * 22 / F)]} /><Ray a={[X(0), Y(h)]} b={[X(-F), Y(0)]} dash color="#9fd8ff" /></>}
        </group>)}
      </Dark>}
      lesson={<LessonBlock no="2" title="聚拢还是散开" concept="凸透镜会聚光，凹透镜发散光" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">{KEYS.map(k => <li key={k}><b className="text-[#7fe3d4]">{LENSES[k].name}（{LENSES[k].shape}）：</b>{LENSES[k].say}</li>)}</ul>
          <p className="mt-3">通过透镜中心（<b className="text-white">光心</b>）的光，传播方向不变。焦点到光心的距离叫<b className="text-white">焦距</b>，用 f 表示。凸透镜的两侧各有一个焦点。</p>
          <p className="mt-3">透镜能改变光的方向，靠的就是上一课的折射：光进出玻璃时各偏折一次。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种透镜都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">凸透镜把平行光聚到焦点，凹透镜把它散开</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">这块凸透镜的焦距是 {F} cm，后面几课都用它。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{LENSES[kind].name}对光有</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight text-[#7fe3d4]">{LENSES[kind].act}作用</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="形状" value={cx ? '中间厚' : '中间薄'} unit={LENSES[kind].shape} />
            <ParamTile symbol="f" value={cx ? `${F} cm` : '—'} unit={cx ? '焦距' : '虚焦点，不是实际会聚的点'} />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">透镜</th><th className="font-normal">形状</th><th className="text-right font-normal">对光的作用</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{LENSES[k].name}</td><td>{LENSES[k].shape}</td><td className="text-right font-semibold text-[#7fe3d4]">{LENSES[k].act}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'record'} onClick={record} disabled={dup}>记录</LabButton></>}
      extras={<Control label="透镜"><Segmented label="透镜" pulse={next === 'kind'} want={next === 'kind' ? task!.id as LensKey : null} value={kind} onChange={setKind} options={KEYS.map(k => ({ value: k, label: LENSES[k].name }))} /></Control>}
    />
  )
}
