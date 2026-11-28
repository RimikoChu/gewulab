// 接触法制硫酸 · 第 4 课 温度的选择。镜头绕到接触室的另一侧看整座设备：保温层、人孔、平台和测温点。
// 换 550、400、450 °C 三个床层温度，比较“平衡转化率”（教材数据表）和“气体流过催化剂层后实际达到的转化率”（示意）。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow, GAS } from './flow'
import { LESSONS, goLesson } from './lessons'
import { useRun, type V3 } from './parts'
import { TEMPS, fmt1, xOut, xTable } from './physics'
import { CONV, ride } from './plant'
import { COL, MiniChart, type ChartSpec } from './screen'
import { Place } from './world'

type Tk = `${(typeof TEMPS)[number]}`
const TASKS: Task[] = [
  { id: '550', text: '把床层温度调到 550 °C，记录', note: `反应很快，可平衡转化率只有 ${fmt1(xTable(550, 0.1))}%` },
  { id: '400', text: '调到 400 °C，记录', note: `平衡转化率高达 ${fmt1(xTable(400, 0.1))}%，可反应慢，出口只到约 ${fmt1(xOut(400))}%` },
  { id: '450', text: '调到 450 °C，记录', note: `速率和平衡两头兼顾，出口转化率最高，约 ${fmt1(xOut(450))}%` },
]
const C = CONV

export default function Lesson4() {
  const T = useTasks('gewu:sulfuric:4', TASKS)
  const [tk, setTk] = useState<Tk>('500')
  const [rows, setRows] = useState<Tk[]>([])
  const settle = useRun(1.5)
  const t = +tk, eq = xTable(t, 0.1), out = xOut(t)
  const resetAll = () => { setTk('500'); setRows([]); settle.snap(0); T.reset() }
  const choose = (k: Tk) => { if (settle.busy) return; setTk(k); settle.run() }
  const record = () => { if (settle.busy || rows.includes(tk)) return; setRows(r => [...r, tk]); T.check(id => id === tk) }
  const task = T.current?.id as Tk | undefined
  const next: 'seg' | 'rec' | null = !task || settle.busy ? null : tk !== task ? 'seg' : 'rec'
  const hint = !task ? '温度要兼顾速率和平衡：工业上用 400–500 °C。'
    : settle.busy ? '床层换到新的温度…'
    : tk !== task ? `把床层温度调到 ${task} °C`
    : `床层 ${tk} °C。记录这一组`

  const paths = useMemo<V3[][]>(() => [ride('h2c'), ride('c2h')], [])
  const spec: ChartSpec = {
    x: { min: 380, max: 570, label: 't / °C', ticks: [...TEMPS] }, y: { min: 80, max: 100, label: 'SO₂ 的转化率 / %', ticks: [80, 85, 90, 95, 100] },
    lines: [{ color: COL.eq, xs: [...TEMPS], ys: TEMPS.map(x => xTable(x, 0.1)) }, { color: COL.out, xs: [...TEMPS], ys: TEMPS.map(x => xOut(x)) }],
    dots: [{ x: t, y: eq, color: COL.eq }, { x: t, y: out, color: COL.out }], vline: t,
  }
  const labels: Label[] = [
    { id: 'n', at: [C.x + 1.5, C.y1 + 1.2, 2], ax: 0, name: true, className: 'scene-name -translate-y-full', children: '接触室（外面包着保温层）' },
    { id: 't', at: [C.x - 2.4, 9.2, C.r + 0.2], ax: 0.5, className: `scene-tag ${settle.busy ? '' : 'key'} -translate-y-1/2`, children: <><small>床层温度</small>{t} °C</> },
    { id: 'eq', at: [C.x - 2.4, 7.2, C.r + 0.2], ax: 0.5, className: 'scene-tag -translate-y-1/2', style: { borderLeft: `4px solid ${COL.eq}` }, children: <><small>平衡转化率</small>{fmt1(eq)}%</> },
    { id: 'out', at: [C.x - C.r - 1.4, 5.0, 0.6], ax: 0.5, className: 'scene-tag -translate-y-full', style: { borderLeft: `4px solid ${COL.out}` }, children: <><small>出口转化率（示意）</small>{fmt1(out)}%</> },
    { id: 'in', at: [C.x - 5.5, C.y1 + 2.2, 0.6], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>进</small>SO₂、O₂ · 常压</> },
  ]
  return (
    <LabShell title="接触法制硫酸" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="接触室"
      stage={<Place at="l4" labels={labels} hot={(t - 350) / 250}>
        <Flow paths={paths} density={1.6} speed={3} size={0.13} color={(_u, p, i) => (i % 3 === 0 ? GAS.air : p === 0 ? GAS.so2 : (out / 100 > ((i * 7) % 10) / 10 ? GAS.so3 : GAS.so2))} />
      </Place>}
      lesson={<LessonBlock no="4" title="温度的选择" concept="温度要兼顾速率和平衡" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p><span className="font-formula">2SO₂ + O₂ ⇌ 2SO₃</span> 的正反应<b className="text-white">放热</b>。只看平衡，温度越低，SO₂ 的平衡转化率越高。</p>
          <p className="mt-3">但温度低，反应速率小，催化剂的活性也低，气体流过催化剂层的那点时间里远远达不到平衡，单位时间的产量很低。</p>
          <p className="mt-3">综合考虑，工业上选 <b className="text-white">400–500 °C</b>：这时催化剂的活性较高，反应速率和 SO₂ 的平衡转化率都比较理想。</p>
          <p className="mt-3">平衡转化率取自教材的数据表（常压）。出口转化率是按简化的速率模型画的示意。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">兼顾速率和平衡：400–500 °C</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">常压下平衡转化率：400 °C {fmt1(xTable(400, 0.1))}%，450 °C {fmt1(xTable(450, 0.1))}%，550 °C {fmt1(xTable(550, 0.1))}%。温度太低反应慢、催化剂活性低；温度太高平衡转化率低。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <ParamTile symbol={<span style={{ color: COL.eq }}>平衡</span>} value={`${fmt1(eq)}%`} unit="SO₂ 的转化率" />
          <ParamTile symbol={<span style={{ color: COL.out }}>出口</span>} value={`${fmt1(out)}%`} unit="SO₂ 的转化率 · 示意" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">常压下 <span style={{ color: COL.eq }}>— 平衡</span> <span style={{ color: COL.out }}>— 出口</span></h2>
        <MiniChart spec={spec} height={170} />
        <h2 className="mt-2 text-[12.5px] text-white/55">记录</h2>
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-white/50"><th className="pl-2.5 font-normal">温度</th><th className="text-right font-normal">平衡</th><th className="pr-2 text-right font-normal">出口（示意）</th></tr></thead>
          <tbody>{rows.length === 0 ? <tr className="bg-white/[0.04]"><td colSpan={3} className="rounded-lg px-2.5 py-1.5 text-white/45">还没有记录</td></tr> : rows.map(k => <tr key={k} className="bg-white/[0.04]"><td className="rounded-l-lg px-2.5 py-1.5 tabular-nums">{k} °C</td><td className="text-right tabular-nums">{fmt1(xTable(+k, 0.1))}%</td><td className="rounded-r-lg pr-2 text-right tabular-nums">{fmt1(xOut(+k))}%</td></tr>)}</tbody>
        </table>
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'rec'} disabled={settle.busy || rows.includes(tk)} onClick={record}>记录这一组</LabButton>
      </>}
      extras={
        <Control label="床层温度">
          <Segmented label="床层温度" pulse={next === 'seg'} want={task ?? null} disabled={settle.busy} value={tk} onChange={k => choose(k as Tk)} options={TEMPS.map(x => ({ value: `${x}` as Tk, label: `${x} °C` }))} />
        </Control>
      }
    />
  )
}
