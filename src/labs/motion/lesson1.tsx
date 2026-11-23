// 机械运动 · 第 1 课 量一量车票（用刻度尺测长度；读数要估读）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import At from './at'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { DIVISION, TICKET, WAYS, rulerReading, type WayKey } from './physics'
import { DESK } from './world'

const KEYS = Object.keys(WAYS) as WayKey[]
const TASKS: Task[] = [
  { id: 'shifted', text: '左端没对齐零刻度，读一次', note: `读成 ${rulerReading('shifted').toFixed(2)} cm：多出来的正是左端压住的那一段` },
  { id: 'slanted', text: '对齐了，但斜着看，再读一次', note: `读成 ${rulerReading('slanted').toFixed(2)} cm：视线不正，读数偏了` },
  { id: 'good', text: '对齐零刻度、视线正对，读出正确的长度', note: `${rulerReading('good').toFixed(2)} cm：最后一位是估读的` },
]
// 面板上那把尺的特写：1 cm 画 24 个单位
const U = 24, px = (cm: number) => 14 + cm * U

export default function Lesson1() {
  const [way, setWay] = useState<WayKey>('shifted')
  const [rows, setRows] = useState<WayKey[]>([])
  const T = useTasks('gewu:motion:1', TASKS)
  const dup = rows.includes(way), w = WAYS[way], read = rulerReading(way)
  const record = () => { if (dup) return; const next = [...rows, way]; setRows(next); T.check(id => next.includes(id as WayKey)) }
  const resetAll = () => { setWay('shifted'); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'way' | 'record' | null } = !task ? { hint: '三种做法都读过了。只有对齐零刻度、视线正对时才读得对。', next: null }
    : way !== task.id ? { hint: `换成“${WAYS[task.id as WayKey].name}”`, next: 'way' } : { hint: '看右边的特写，读出车票右端对着的刻度，按“记录”', next: 'record' }
  const x0 = px(w.off), x1 = px(w.off + TICKET), eye = x1 + (w.tilt ? 34 : 0)

  return (
    <LabShell title="机械运动" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="刻度尺"
      stage={<At at="desk" labels={[{ id: 'n', at: [DESK[0], DESK[1] + 0.98, DESK[2] + 0.2], ax: 0.5, name: true, className: 'scene-name', children: '刻度尺和一张车票' }]}>
        <group position={[DESK[0], DESK[1] + 0.9, DESK[2]]}>
          <mesh position={[0, 0.006, 0.12]}><boxGeometry args={[1.1, 0.012, 0.14]} /><meshStandardMaterial color="#e9d98a" roughness={0.5} /></mesh>
          {Array.from({ length: 21 }, (_, i) => <mesh key={i} position={[-0.5 + i * 0.05, 0.013, 0.07 + (i % 2 ? 0.015 : 0.03)]}><boxGeometry args={[0.004, 0.002, i % 2 ? 0.03 : 0.06]} /><meshBasicMaterial color="#30343a" /></mesh>)}
          <mesh position={[-0.5 + w.off * 0.1 + TICKET * 0.05, 0.004, -0.08]}><boxGeometry args={[TICKET * 0.1, 0.004, 0.2]} /><meshStandardMaterial color="#7fc4dc" roughness={0.6} /></mesh>
        </group>
      </At>}
      lesson={<LessonBlock no="1" title="量一量车票" concept="读数 = 准确值 + 一位估读值" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用刻度尺量长度，要做到三件事：</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">放对：</b>零刻度线对准被测物体的一端，尺子紧贴、放正</li>
            <li><b className="text-[#7fe3d4]">看对：</b>视线正对刻度线</li>
            <li><b className="text-[#7fe3d4]">读对：</b>读到分度值的下一位。这把尺的分度值是 {DIVISION * 10} mm，所以要读到 0.01 cm</li>
          </ul>
          <p className="mt-3">没对齐、斜着看，读出来的是<b className="text-white">错误</b>，可以避免。就算都做对了，估读的那一位每次也会略有不同，这叫<b className="text-white">误差</b>，只能减小，不能消除。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次读数都记下了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">车票长 {rulerReading('good').toFixed(2)} cm</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">前两次读成 {rulerReading('shifted').toFixed(2)} cm 和 {rulerReading('slanted').toFixed(2)} cm，是做法错了，不是误差。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{w.name} · 读数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{read.toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">cm</span></div>
          </div>
          <svg viewBox="0 0 272 96" className="mt-3 w-full" role="img" aria-label="刻度尺的特写">
            <rect x={x0} y={14} width={x1 - x0} height={22} rx={2} fill="#7fc4dc" />
            <rect x={6} y={42} width={260} height={40} rx={3} fill="#e9d98a" />
            {Array.from({ length: 101 }, (_, i) => <line key={i} x1={px(i / 10)} x2={px(i / 10)} y1={42} y2={42 + (i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 7)} stroke="#30343a" strokeWidth={i % 10 === 0 ? 1.2 : 0.6} />)}
            {Array.from({ length: 11 }, (_, i) => <text key={i} x={px(i)} y={74} textAnchor="middle" fontSize={9} fill="#30343a">{i}</text>)}
            <line x1={eye} y1={2} x2={x1} y2={42} stroke="#ff6b4a" strokeWidth={1.5} strokeDasharray="3 3" /><circle cx={eye} cy={4} r={3.5} fill="#ff6b4a" />
            <line x1={x0} y1={36} x2={x0} y2={42} stroke="#ffffff" strokeWidth={1.2} />
          </svg>
          <p className="mt-2 rounded-xl bg-white/6 px-3 py-2.5 text-[13.5px] leading-relaxed text-white/75">{w.say}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="分度值" value={`${DIVISION * 10} mm`} unit="相邻两条刻度线之间" />
            <ParamTile symbol="左端" value={`${w.off.toFixed(2)} cm`} unit={w.off ? '没有对齐零刻度' : '对齐了零刻度'} />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">做法</th><th className="text-right font-normal">读数</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{WAYS[k].name}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{rulerReading(k).toFixed(2)} cm</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'record'} onClick={record} disabled={dup}>记录</LabButton></>}
      extras={<Control label="做法"><Segmented label="做法" pulse={next === 'way'} want={next === 'way' ? task!.id as WayKey : null} value={way} onChange={setWay} options={KEYS.map(k => ({ value: k, label: k === 'good' ? '对齐、正对' : k === 'shifted' ? '没对齐零刻度' : '斜着看' }))} /></Control>}
    />
  )
}
