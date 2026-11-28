// 光的波动性和光电效应 · 第 3 课 用条纹量出波长（用双缝干涉测量光的波长）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Dark, useSpace } from './gear'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { RIG, fringeGap, headReading, wavelengthFrom, type FilterKey } from './physics'
import { RIG_X, Rig } from './rig'
import { Eyepiece } from './views'
import { VOICE } from './voice'

const N = 6, FS: FilterKey[] = ['red', 'green']
const TASKS: Task[] = [
  { id: 'red:1', text: '红色滤光片：让分划板的刻线对准第 1 条亮纹，记下读数', note: `x₁ = ${headReading('red', 1).toFixed(3)} mm` },
  { id: `red:${N}`, text: `转动手轮，对准第 ${N} 条亮纹，再记一次`, note: `x₆ = ${headReading('red', N).toFixed(3)} mm，算出红光波长 ${wavelengthFrom(headReading('red', 1), headReading('red', N), N).toFixed(0)} nm` },
  { id: 'green:1', text: '换上绿色滤光片，对准第 1 条亮纹，记下读数', note: `x₁ = ${headReading('green', 1).toFixed(3)} mm` },
  { id: `green:${N}`, text: `再对准第 ${N} 条亮纹，记一次`, note: `x₆ = ${headReading('green', N).toFixed(3)} mm，算出绿光波长 ${wavelengthFrom(headReading('green', 1), headReading('green', N), N).toFixed(0)} nm` },
]
/** 手轮没对准任何亮纹时停在哪里：第 1 条亮纹外面一点 */
const rest = (f: FilterKey) => headReading(f, 1) - 0.62 * fringeGap(RIG.L, RIG.filters[f].nm, RIG.d)

export default function Lesson3() {
  const [f, setF] = useState<FilterKey>('red')
  const [n, setN] = useState(0)                      // 刻线对准了第几条亮纹；0 是还没对
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:light:3', TASKS)
  const goal = n ? headReading(f, n) : rest(f), at = useSlide(goal, 3.2), steady = at === goal
  const key = `${f}:${n}`, dup = rows.includes(key)
  const record = () => { if (!steady || !n || dup) return; const next = [...rows, key]; setRows(next); T.check(k => next.includes(k)) }
  const swap = (k: FilterKey) => { setF(k); setN(0) }
  useSpace(record)
  const resetAll = () => { setF('red'); setN(0); setRows([]); T.reset() }
  const task = T.current, [tf, tn] = (task?.id ?? ':').split(':') as [FilterKey, string]
  const { hint, next }: { hint: string; next: 'f' | 'n1' | 'n6' | 'record' | null } = !task ? { hint: '两种光的波长都测出来了。', next: null }
    : f !== tf ? { hint: `换上${RIG.filters[tf].name}`, next: 'f' }
    : n !== Number(tn) ? { hint: `按“对准第 ${tn} 条亮纹”`, next: tn === '1' ? 'n1' : 'n6' }
    : steady ? { hint: '读出手轮上的读数，按“记录读数”', next: 'record' } : { hint: '手轮在转…', next: null }
  const { nm, hex, name, x1 } = RIG.filters[f], gap = fringeGap(RIG.L, nm, RIG.d)
  const got = (k: FilterKey, m: number) => rows.includes(`${k}:${m}`)
  const X = RIG_X
  const labels: Label[] = [
    { id: 'lamp', at: [X.lamp, 2.28, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '光源' },
    { id: 'filter', at: [X.filter, 2.02, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: name },
    { id: 'single', at: [X.single, 1.2, 0.3], ax: 0.5, name: true, className: 'scene-name', children: '单缝' },
    { id: 'double', at: [X.double, 2.02, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '双缝' },
    { id: 'tube', at: [(X.tube0 + X.tube1) / 2, 2.0, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `遮光筒 · 双缝到屏 ${RIG.L.toFixed(3)} m` },
    { id: 'head', at: [X.head - 0.1, 2.08, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '测量头' },
    { id: 'read', at: [X.head + 0.1, 1.3, 0.5], ax: 1, className: 'scene-tag key', children: <><small>手轮读数</small>{at.toFixed(3)} mm</> },
  ]
  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title={TITLE} lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="测量头的手轮"
      stage={<Dark at="rig" dx={-0.32} dy={0.28} span={[3.85, 1.7]} view={[-0.26, 0.17]} lamp={120} labels={labels}><Rig color={hex} turn={at * Math.PI * 2} /></Dark>}
      lesson={<LessonBlock no="3" title="用条纹量出波长" concept="量出条纹间距，就能算出光的波长" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>由 Δx = <i>L</i>λ/<i>d</i> 得 <b className="text-white">λ = <i>d</i>Δx / <i>L</i></b>。缝距 <i>d</i> 和屏距 <i>L</i> 是仪器上给定的，只要量出条纹间距 Δx。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>灯发出的白光先过滤光片变成单色光，再过单缝、双缝，在遮光筒另一头的毛玻璃屏上产生干涉条纹</li>
            <li>一条条纹太窄，量不准。先对准第 1 条亮纹读 <i>x</i>₁，再对准第 {N} 条读 <i>x</i>₆，中间隔着 {N - 1} 个间距</li>
            <li>Δx = (<i>x</i>₆ − <i>x</i>₁) / {N - 1}</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">光的波长只有几百纳米，直接量不了。借助干涉，把它放大成了毫米级的条纹间距。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种光都测完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">λ = dΔx/L：红光 {RIG.filters.red.nm} nm，绿光 {RIG.filters.green.nm} nm</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">隔着 {N - 1} 个间距量，再除以 {N - 1}，比只量一条准得多。红光的条纹比绿光宽，因为它的波长长。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">目镜里看到的 · 手轮读数</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{at.toFixed(3)}<span className="ml-1 text-[15px] font-medium text-white/55">mm</span></div>
          </div>
          <Eyepiece at={at} x1={x1} gap={gap} hex={hex} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="d" value={RIG.d.toFixed(2)} unit="mm · 缝距" />
            <ParamTile symbol="L" value={RIG.L.toFixed(3)} unit="m · 双缝到屏" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">数据表</h2>
          <table className="mt-1 w-full text-[13px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">滤光片</th><th className="text-right font-normal">x₁ / mm</th><th className="text-right font-normal">x₆ / mm</th><th className="text-right font-normal">Δx / mm</th><th className="text-right font-normal">λ / nm</th></tr></thead>
            <tbody>{FS.map(k => { const a = got(k, 1), b = got(k, N), x1k = headReading(k, 1), x6k = headReading(k, N); return (
              <tr key={k} className="border-t border-white/12"><td className="py-1.5 text-white/80">{k === 'red' ? '红' : '绿'}</td><td className="text-right tabular-nums">{a ? x1k.toFixed(3) : '—'}</td><td className="text-right tabular-nums">{b ? x6k.toFixed(3) : '—'}</td>
                <td className="text-right tabular-nums">{a && b ? ((x6k - x1k) / (N - 1)).toFixed(3) : '—'}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{a && b ? wavelengthFrom(x1k, x6k, N).toFixed(0) : '—'}</td></tr>) })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'n1'} onClick={() => setN(1)} disabled={!steady || n === 1}>对准第 1 条亮纹</LabButton>
        <LabButton pulse={next === 'n6'} onClick={() => setN(N)} disabled={!steady || n === N}>对准第 {N} 条亮纹</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || !n || dup}>记录读数</LabButton>
      </>}
      extras={<Control label="滤光片"><Segmented label="滤光片" pulse={next === 'f'} want={next === 'f' ? tf : null} value={f} onChange={swap} options={FS.map(k => ({ value: k, label: k === 'red' ? '红色' : '绿色' }))} /></Control>}
    />
  )
}
