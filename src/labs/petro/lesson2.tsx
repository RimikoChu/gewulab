// 从石油到塑料 · 第 2 课 裂化和裂解。管式裂解炉朝镜头的一面炉墙拿掉了：一排炉管烧得发红。
// 把烃送进炉管，放大窗里碳链断开：一头补上氢成为烷烃，另一头出现碳碳双键成为烯烃。面板上对碳、氢原子数和相对分子质量。
import { useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { CK, COIL_PATH, COIL_POINT } from './cracker'
import { Flow } from './flow'
import { CRACK_FRAMES } from './frames'
import { LESSONS, goLesson } from './lessons'
import { Lens, Mol, type LensSpec } from './mol'
import { NARRATION } from './narration'
import { ease, useRun } from './parts'
import { CRACK, CRACK_T, mass, text, type Furnace } from './physics'
import { VOICE } from './voice'
import { Place, spot } from './world'

const eq = (i: number) => `${text(CRACK[i].from)} → ${text(CRACK[i].a)} + ${text(CRACK[i].b)}`
const TASKS: Task[] = [
  { id: 's0', text: '约 500 °C：把十六烷送进炉管', note: `${eq(0)}：断成辛烷和辛烯，都是汽油里的成分` },
  { id: 's1', text: '把辛烷再送进炉管', note: `${eq(1)}：链更短了` },
  { id: 's2', text: '升到约 800 °C，把丁烷送进炉管', note: `${eq(2)}：得到了乙烯` },
  { id: 's3', text: '再送一次丁烷，换一处断开', note: `${eq(3)}：同一种烃可以有不同的断法，这次得到丙烯` },
]
const VIEW: [number, number] = [-0.16, 0.13]
const SPOT = spot(CK.x + 1.2, 10.8, CK.z, 28, 23.5, VIEW, false, [140, 1000])
const LENS: LensSpec = { at: [CK.x - 7.6, 15.9, CK.z + 3.5], R: 4.8, rotY: VIEW[0] }
const SEC = 5

export default function Lesson2() {
  const T = useTasks('gewu:petro:2', TASKS)
  const [mode, setMode] = useState<Furnace>('crack')
  const [n, setN] = useState(0)                       // 已经做完几步
  const heat = useSlide(mode === 'crack' ? 0.5 : 1, 0.35)
  const run = useRun(SEC, () => { T.check(id => id === 's' + n); setN(n + 1) })
  const i = Math.min(3, run.busy ? n : Math.max(0, n - 1)), step = CRACK[i], shown = run.busy || n > 0
  const need: Furnace = n < 4 ? CRACK[n].mode : 'pyro', hot = Math.abs(heat - (need === 'crack' ? 0.5 : 1)) < 0.02
  const send = () => { if (run.busy || n >= 4 || mode !== need || !hot) return; run.run() }
  const resetAll = () => { setMode('crack'); setN(0); run.snap(0); T.reset() }

  const task = T.current?.id
  const next: 'seg' | 'go' | null = !task || run.busy ? null : mode !== need ? 'seg' : hot ? 'go' : null
  const hint = !task ? '裂化和裂解都生成了新物质，是化学变化。'
    : run.busy ? ['看放大窗：十六个碳的链从中间断开，一头补上氢成为烷烃，另一头出现碳碳双键', '看放大窗：辛烷又断成两段，还是一个烷烃、一个烯烃', '看放大窗：丁烷断成乙烷和乙烯', '看放大窗：这次从头上断开，得到甲烷和丙烯'][n]
    : mode !== need ? (need === 'pyro' ? '把炉温升到约 800 °C：裂解要比裂化更高的温度' : '把炉温调回约 500 °C')
    : !hot ? '炉温正在变…'
    : n === 0 ? '把十六烷送进炉管' : n === 1 ? '把断下来的辛烷再送进炉管' : n === 2 ? '把丁烷送进炉管' : '再送一次丁烷，这回换一处断开'

  const [a, b] = CRACK_FRAMES[run.busy ? n : Math.max(0, n - 1)]
  const k = run.busy ? ease((run.k - 0.3) / 0.6) : n > 0 ? 1 : 0
  const carbons = step.from.C!, u = LENS.R * 1.9 / ((carbons - 1) * 1.26 + 5.0)
  const labels: Label[] = [
    { id: 'lens', at: [LENS.at[0], LENS.at[1] - LENS.R - 0.3, LENS.at[2]], ax: 0.5, className: `scene-tag ${shown && !run.busy ? 'key' : ''}`, children: shown ? <>{eq(i)}</> : <><small>{step.names[0]}</small>{text(step.from)}</> },
    { id: 'temp', at: [CK.x + 4.4, 11.6, CK.z + 0.4], ax: 0.5, className: 'scene-tag', children: <><small>炉温</small>约 {CRACK_T[heat > 0.75 ? 'pyro' : 'crack']} °C</> },
    { id: 'coil', at: [CK.x + 2.5, 5.2, CK.z + 0.2], ax: 0, name: true, className: 'scene-name', children: '炉管' },
    { id: 'burn', at: [CK.x - 4.6, 3.6, CK.z + 1.8], ax: 0.5, name: true, className: 'scene-name', children: '火嘴' },
    { id: 'conv', at: [CK.x + 2, 17.6, CK.z + 1.4], ax: 0.5, name: true, className: 'scene-name', children: '对流室（预热原料）' },
    { id: 'tle', at: [CK.x + 4.5, 20.6, CK.z + 2.4], ax: 0, name: true, className: 'scene-name -translate-y-full', children: '急冷换热器' },
    { id: 'qt', at: [CK.x + 14, 12, CK.z], ax: 0, name: true, className: 'scene-name', children: '急冷塔' },
  ]
  const row = (name: string, f: typeof step.from, hi = false) => <div className={`rounded-lg px-2 py-1.5 ${hi ? 'bg-[#ffb347]/18' : 'bg-white/[0.06]'}`}><div className="text-[12px] text-white/55">{name}</div><div className="font-formula text-[17px] font-semibold">{text(f)}</div><div className="text-[12.5px] tabular-nums text-white/60">{mass(f)}</div></div>
  return (
    <LabShell title="从石油到塑料" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="裂解炉"
      stage={<Place at={SPOT} labels={labels} cut="cracker" heat={heat} glow={0.3}>
        <Lens spec={LENS} point={COIL_POINT}><Mol a={a} b={b} k={k} u={u} /></Lens>
        <Flow paths={[COIL_PATH]} density={1.3} speed={7} size={0.2} on={run.busy ? 1 : 0} color={u2 => u2 < 0.45 ? '#ffe2a8' : '#ffb347'} />
      </Place>}
      lesson={<LessonBlock no="2" title="裂化和裂解" concept="长链断开，得到一个烷烃和一个烯烃" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>分馏得到的汽油不够用，重油又太多。在一定条件下（加热，或者加热并使用催化剂），把相对分子质量大、沸点高的烃断裂成相对分子质量小、沸点低的烃，叫<b className="text-white">裂化</b>，可以提高汽油的产量和质量。</p>
          <p className="mt-3">用比裂化更高的温度，让长链烃断裂成乙烯、丙烯等气态短链烃，叫<b className="text-white">裂解</b>，是一种深度裂化。乙烯的产量可以用来衡量一个国家的石油化工发展水平。</p>
          <p className="mt-3">一个烷烃断成两段时氢不够分：一段成为烷烃，另一段两个碳之间多连一根键，成为含碳碳双键的<b className="text-white">烯烃</b>。裂化和裂解都生成了新物质，是<b className="text-white">化学变化</b>。</p>
          <p className="mt-3">真实的产物是很多种烃的混合物；这里每次只画其中一种断法。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">长链烃断成短链烃，是化学变化</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">十六烷经过裂化变成辛烷、丁烷，再经过裂解得到乙烯和丙烯。每一步都是一个烷烃变成一个更短的烷烃和一个烯烃，碳、氢原子数不变。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center font-formula text-[19px] font-semibold">{eq(i)}</div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {row(step.names[0], step.from)}{row(step.names[1], step.a)}{row(step.names[2], step.b, true)}
        </div>
        <p className="mt-1 text-center text-[12px] text-white/45">下面一行是相对分子质量</p>
        <h2 className="mt-4 text-[12.5px] text-white/55">数一数原子</h2>
        <div className="mt-2 space-y-1.5 text-[15px] tabular-nums">
          <div className="flex justify-between rounded-lg bg-white/[0.06] px-3 py-1.5"><span className="text-white/60">碳原子</span><span>{step.from.C} = {step.a.C} + {step.b.C}</span></div>
          <div className="flex justify-between rounded-lg bg-white/[0.06] px-3 py-1.5"><span className="text-white/60">氢原子</span><span>{step.from.H} = {step.a.H} + {step.b.H}</span></div>
          <div className="flex justify-between rounded-lg bg-white/[0.06] px-3 py-1.5"><span className="text-white/60">相对分子质量</span><span>{mass(step.from)} = {mass(step.a)} + {mass(step.b)}</span></div>
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">已经做过的</h2>
        <div className="mt-1.5 space-y-1 font-formula text-[14px] text-white/80">{n === 0 ? <p className="text-white/40">还没有</p> : CRACK.slice(0, n).map((s, j) => <p key={j}>{eq(j)}<span className="ml-2 text-[12px] text-white/45">约 {CRACK_T[s.mode]} °C</span></p>)}</div>
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'go'} disabled={run.busy || n >= 4 || mode !== need || !hot} onClick={send}>送进炉管</LabButton>
      </>}
      extras={
        <Control label="炉温">
          <Segmented label="炉温" pulse={next === 'seg'} want={need} disabled={run.busy} value={mode} onChange={v => setMode(v as Furnace)} options={[{ value: 'crack', label: `约 ${CRACK_T.crack} °C 裂化` }, { value: 'pyro', label: `约 ${CRACK_T.pyro} °C 裂解` }]} />
        </Control>
      }
    />
  )
}
