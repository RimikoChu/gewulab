// 细胞 · 第 2 课 放大多少倍（放大倍数 = 目镜 × 物镜；倍数越大，细胞越大、越少，视野越暗）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Microscope } from './models'
import { EYEPIECE, OBJECTIVES, brightness, cellsInRow, magnify } from './physics'
import View from './view'
import { SPAN, SPOT, ST, TOP } from './world'

type Ob = '4' | '10' | '40'
const TASKS: Task[] = OBJECTIVES.map(o => ({ id: String(o), text: `用 ${o} 倍物镜，记下看到的`, note: `放大 ${magnify(o)} 倍，一行看到 ${cellsInRow(magnify(o))} 个细胞` }))

export default function Lesson2() {
  const [ob, setOb] = useState<Ob>('4')
  const [rows, setRows] = useState<Ob[]>([])
  const T = useTasks('gewu:cells:2', TASKS)
  const mag = magnify(Number(ob)), dup = rows.includes(ob)
  const record = () => { if (dup) return; const next = [...rows, ob]; setRows(next); T.check(id => next.includes(id as Ob)) }
  const resetAll = () => { setOb('4'); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'ob' | 'record' | null } = !task ? { hint: '都记完了。倍数越大，细胞越大、越少，视野越暗。', next: null }
    : ob !== task.id ? { hint: `转动转换器，换成 ${task.id} 倍物镜`, next: 'ob' } : { hint: '数一数视野里一行有几个细胞，按“记录”', next: 'record' }

  return (
    <LabShell title="细胞" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="显微镜"
      stage={<LabStage labels={[{ id: 'ob', at: [ST.scope + 0.14, TOP + 0.52, 0.12], className: 'scene-tag key -translate-y-1/2', children: <><small>物镜</small>{ob} 倍</> }, { id: 'eye', at: [ST.scope + 0.1, TOP + 1.14, 0.08], className: 'scene-tag -translate-y-1/2', children: <><small>目镜</small>{EYEPIECE} 倍</> }]} target={SPOT.scope} span={SPAN.scope}><Microscope position={[ST.scope, TOP, 0]} glow={null} objective={OBJECTIVES.indexOf(Number(ob) as 4)} /></LabStage>}
      lesson={<LessonBlock no="2" title="放大多少倍" concept="放大倍数 = 目镜的倍数 × 物镜的倍数" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>显微镜的放大倍数是目镜和物镜两个倍数的<b className="text-white">乘积</b>。目镜 10 倍、物镜 40 倍，就放大 400 倍。</p>
          <p className="mt-3">放大倍数越大，看到的细胞<b className="text-white">越大</b>，视野里的细胞<b className="text-white">越少</b>，视野<b className="text-white">越暗</b>。所以总是先用低倍镜找到要看的东西，再换高倍镜。</p>
          <p className="mt-3 text-[13.5px] text-white/65">“一行看到几个”是为了看清规律取的示意数：它和放大倍数成反比。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个物镜都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">从 {magnify(4)} 倍换到 {magnify(40)} 倍，一行从 {cellsInRow(magnify(4))} 个变成 {cellsInRow(magnify(40))} 个</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">看得更大，也就看得更少、更暗。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[16px] italic text-white/65">{EYEPIECE} × {ob}</div>
            <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{mag}<span className="ml-1 text-[15px] font-medium text-white/55">倍</span></div>
          </div>
          <View mode="sharp" row={cellsInRow(mag)} light={brightness(mag)} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="一行" value={`${cellsInRow(mag)} 个`} unit="视野直径上的细胞" />
            <ParamTile symbol="视野" value={brightness(mag) >= 1 ? '亮' : brightness(mag) > 0.6 ? '稍暗' : '暗'} unit="倍数越大越暗" />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">物镜</th><th className="text-right font-normal">放大</th><th className="text-right font-normal">一行</th></tr></thead>
            <tbody>{rows.map(o => <tr key={o} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{o} 倍</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{magnify(Number(o))} 倍</td><td className="text-right tabular-nums">{cellsInRow(magnify(Number(o)))} 个</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'record'} onClick={record} disabled={dup}>记录</LabButton></>}
      extras={<Control label="物镜"><Segmented label="物镜" pulse={next === 'ob'} want={next === 'ob' ? task!.id as Ob : null} value={ob} onChange={setOb} options={OBJECTIVES.map(o => ({ value: String(o) as Ob, label: `${o} 倍` }))} /></Control>}
    />
  )
}
