// 合成氨工厂 · 第 6 课 合成氨的适宜条件。镜头在合成塔的侧下方看整座塔：塔上标着床层温度、压强、出塔气里氨的含量。
// 换温度（300、400、500、600 °C）、加压到 30 MPa，比较“平衡时氨的含量”（课本数据表）和“出塔气里氨的含量”（速率跟不上时达不到平衡，示意）。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { CV } from './plant'
import { P6, TEMPS6, fmt1, nh3Eq, nh3Out } from './physics'
import { COL, MiniChart, type ChartSpec } from './screen'
import { Place } from './world'

type Tk = `${(typeof TEMPS6)[number]}`
const TASKS: Task[] = [
  { id: '300', text: '选 300 °C，看平衡和出塔的氨含量', note: '平衡时氨很多，可反应太慢，出塔气里只有一点点氨' },
  { id: '600', text: '选 600 °C', note: '反应快，很快接近平衡；可平衡时的氨含量太低' },
  { id: '500', text: '选 500 °C', note: '兼顾速率和平衡，出塔的氨含量最高；铁催化剂在这个温度范围活性较高' },
  { id: 'p', text: '加压到 30 MPa', note: '加压既加快反应、又使平衡正向移动，出塔的氨更多' },
]
const SETTLE = 1.6
const CURVE_T = Array.from({ length: 31 }, (_, i) => 300 + i * 10)

export default function Lesson6() {
  const T = useTasks('gewu:ammonia:6', TASKS)
  const [tk, setTk] = useState<Tk>('400')
  const [p, setP] = useState<number>(P6.low)
  const [seen, setSeen] = useState<string | null>(null)
  const settle = useRun(SETTLE, () => setSeen(`${tk}-${p}`))
  const t = +tk
  useEffect(() => {
    if (seen !== `${tk}-${p}`) return
    if (p === P6.high) T.check(id => id === 'p'); else T.check(id => id === tk)
  }, [seen])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setTk('400'); setP(P6.low); setSeen(null); settle.snap(0); T.reset() }
  const choose = (k: Tk) => { if (settle.busy) return; setTk(k); settle.run() }
  const pressUp = () => { if (settle.busy) return; setP(x => (x === P6.low ? P6.high : P6.low)); settle.run() }

  const eq = nh3Eq(t, p), out = nh3Out(t, p)
  const task = T.current?.id
  const wantT: Tk | null = task && task !== 'p' ? (task as Tk) : null
  const next: 'seg' | 'p' | null = !task || settle.busy ? null : task === 'p' ? (tk !== '500' ? 'seg' : p === P6.low ? 'p' : null) : p !== P6.low ? 'p' : tk !== task ? 'seg' : null
  const hint = !task ? '选条件要兼顾速率和平衡，还要考虑催化剂和设备。'
    : settle.busy ? '合成塔换到新的条件…'
    : task === 'p' ? (tk !== '500' ? '先回到 500 °C' : '温度定在 500 °C。再把压强加到 30 MPa') : p !== P6.low ? '先把压强降回 20 MPa' : `把床层温度调到 ${task} °C`

  const spec: ChartSpec = {
    x: { min: 300, max: 600, label: 't / °C', ticks: [300, 400, 500, 600] },
    y: { max: 70, label: '氨的体积分数 / %', ticks: [0, 20, 40, 60] },
    lines: [
      { color: COL.eq, xs: CURVE_T, ys: CURVE_T.map(x => nh3Eq(x, p)) },
      { color: COL.out, xs: CURVE_T, ys: CURVE_T.map(x => nh3Out(x, p)) },
    ],
    dots: [{ x: t, y: eq, color: COL.eq }, { x: t, y: out, color: COL.out }],
    vline: t,
  }
  const labels: Label[] = [
    { id: 'in', at: [CV.x + CV.ro + 1.1, 18.6, CV.z], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>进塔</small>{p} MPa</> },
    { id: 'bed', at: [CV.x + CV.ro + 0.1, 13.5, CV.z + 0.8], ax: 0, className: `scene-tag ${settle.busy ? '' : 'key'} -translate-y-1/2`, children: <><small>床层温度</small>{t} °C</> },
    { id: 'out', at: [CV.x - CV.ro - 1.1, 3.4, CV.z], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>出塔氨含量（示意）</small>{fmt1(out)}%</> },
    { id: 'n', at: [CV.x, 22, CV.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '氨合成塔' },
  ]
  return (
    <LabShell title="合成氨工厂" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="压强"
      stage={<Place at="l6" labels={labels} temp={t} />}
      lesson={<LessonBlock no="6" title="合成氨的适宜条件" concept="选条件要兼顾速率和平衡" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>N₂ + 3H₂ ⇌ 2NH₃ 的正反应放热、气体分子数减小。只看平衡，应该低温、高压；只看速率，应该高温、高压、用催化剂。</p>
          <p className="mt-3"><b className="text-white">温度</b>：温度低，平衡时氨多，但反应太慢，一定时间里离平衡还差得远；温度高，反应快，但平衡时氨少。工业上一般用 <b className="text-white">400–500 °C</b>，这时反应速率较快，铁催化剂的活性也较高。</p>
          <p className="mt-3"><b className="text-white">压强</b>：加压对速率和平衡都有利，但压强越高，对设备的要求越高、压缩气体耗能越多，一般用 <b className="text-white">10–30 MPa</b>。</p>
          <p className="mt-3"><b className="text-white">催化剂</b>：以铁为主体的多成分催化剂，加快反应，但不改变平衡。</p>
          <p className="mt-3">平衡时氨的含量取自课本的数据表（H₂ 与 N₂ 体积比 3 : 1），表中没有的温度、压强按插值算。出塔氨含量是按简化的速率模型画的示意。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">兼顾速率和平衡：约 400–500 °C、10–30 MPa、铁催化剂</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">300 °C 平衡时氨占 {fmt1(nh3Eq(300, P6.low))}%，可出塔只有 {fmt1(nh3Out(300, P6.low))}%；600 °C 平衡时只有 {fmt1(nh3Eq(600, P6.low))}%。500 °C、30 MPa 时出塔约 {fmt1(nh3Out(500, P6.high))}%（示意）。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <ParamTile symbol={<span style={{ color: COL.eq }}>平衡时</span>} value={`${fmt1(eq)}%`} unit="氨的体积分数" />
          <ParamTile symbol={<span style={{ color: COL.out }}>出塔</span>} value={`${fmt1(out)}%`} unit="氨的体积分数 · 示意" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">{p} MPa 时 <span style={{ color: COL.eq }}>— 平衡时</span> <span style={{ color: COL.out }}>— 出塔</span></h2>
        <MiniChart spec={spec} height={170} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ParamTile symbol="t" value={`${t}`} unit="°C · 床层温度" />
          <ParamTile symbol="p" value={`${p}`} unit="MPa · 压强" />
        </div>
      </Panel>}
      actions={<>
        <LabButton primary={next === 'p'} pulse={next === 'p'} disabled={settle.busy} onClick={pressUp}>{p === P6.low ? `加压到 ${P6.high} MPa` : `降回 ${P6.low} MPa`}</LabButton>
      </>}
      extras={
        <Control label="床层温度">
          <Segmented label="床层温度" pulse={next === 'seg'} want={wantT ?? (task === 'p' ? '500' : null)} disabled={settle.busy} value={tk} onChange={k => choose(k as Tk)} options={TEMPS6.map(x => ({ value: `${x}` as Tk, label: `${x} °C` }))} />
        </Control>
      }
    />
  )
}
