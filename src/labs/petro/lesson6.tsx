// 从石油到塑料 · 第 6 课 官能团的转化。四台反应装置排成一排：乙烯加水成乙醇，乙醇氧化成乙醛，乙醛氧化成乙酸，乙酸和乙醇酯化成乙酸乙酯。
// 每一步先选加什么，再开反应器；镜头跟着物料飞到下一台，放大窗里看官能团怎么变。
import { useMemo, useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow } from './flow'
import { ROUTE_FRAMES } from './frames'
import { LESSONS, goLesson } from './lessons'
import { Lens, Mol, type LensSpec } from './mol'
import { NARRATION } from './narration'
import { clamp01, ease, useRun } from './parts'
import { ROUTE, STEPS6, esterFromEthene, mass, type Reagent } from './physics'
import { ADDS, ESTER_OUT, ETHENE_IN, LINKS, TRAIN } from './train'
import { VOICE } from './voice'
import { Place, spot } from './world'

const TASKS: Task[] = [
  { id: 's0', text: '乙烯加水，得到乙醇', note: 'CH₂=CH₂ + H₂O → CH₃CH₂OH：双键打开，加上了羟基' },
  { id: 's1', text: '乙醇催化氧化，得到乙醛', note: '2CH₃CH₂OH + O₂ → 2CH₃CHO + 2H₂O：羟基变成了醛基' },
  { id: 's2', text: '乙醛氧化，得到乙酸', note: '2CH₃CHO + O₂ → 2CH₃COOH：醛基变成了羧基' },
  { id: 's3', text: '乙酸和乙醇酯化，得到乙酸乙酯', note: 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O：酸脱羟基、醇脱氢' },
]
const VIEW: [number, number] = [-0.22, 0.14]
const U = TRAIN.units, Z = TRAIN.z
const SPOTS = U.map(u => spot(u.x + 2.6, 9.6, Z, 15.5, 20.5, VIEW, false, [140, 1000]))
const LENSES: LensSpec[] = U.map(u => ({ at: [u.x + 6.3, 12.4, Z + 3], R: 4.1, rotY: VIEW[0] }))
const REAGENT: Record<Reagent, string> = { water: '水', oxygen: '氧气', ethanol: '乙醇' }
const COLOR: Record<Reagent, string> = { water: '#7fd0ff', oxygen: '#ff8a7a', ethanol: '#ffd27a' }
const COND = ['催化剂、加热、加压', '铜或银作催化剂、加热', '催化剂、加热', '浓硫酸、加热 · 可逆']
const GO = ['把乙烯和水送进水合反应器', '把氧气通进乙醇氧化反应器', '把氧气通进乙醛氧化塔', '把乙醇加进酯化釜']
const WHY = ['乙烯要变成乙醇，是在双键上加水', '乙醇要变成乙醛，是去掉氢，要通氧气', '乙醛要变成乙酸，是加上氧，要通氧气', '乙酸要变成酯，要加醇：加乙醇']
const SCALE = [0.62, 0.52, 0.5, 0.56]
const SEC = 5.5

export default function Lesson6() {
  const T = useTasks('gewu:petro:6', TASKS)
  const [n, setN] = useState(0)                         // 已经做完几步
  const [add, setAdd] = useState<Reagent>('ethanol')
  const [oops, setOops] = useState<string | null>(null)
  const run = useRun(SEC, () => { T.check(id => id === 's' + n); setN(n + 1) })
  const i = Math.min(3, n), at = Math.min(3, run.busy ? n : Math.max(0, n === 4 ? 3 : n))
  const need = STEPS6[i].add
  const go = () => { if (run.busy || n >= 4) return; if (add !== need) { setOops(`${WHY[i]}，不是加${REAGENT[add]}`); return } setOops(null); run.run() }
  const resetAll = () => { setN(0); setAdd('ethanol'); setOops(null); run.snap(0); T.reset() }

  const task = T.current?.id
  const next: 'seg' | 'go' | null = !task || run.busy ? null : add !== need ? 'seg' : 'go'
  const hint = !task ? '官能团变了，物质的类别和性质就跟着变。'
    : run.busy ? ['看放大窗：双键打开，一头接上氢，一头接上羟基', '看放大窗：乙醇去掉两个氢，羟基变成了醛基', '看放大窗：醛基上插进一个氧，变成了羧基', '看放大窗：乙酸去掉羟基，乙醇去掉氢，连成了酯'][n]
    : oops && add !== need ? oops
    : add !== need ? `${WHY[i]}：把要加的东西换成${REAGENT[need]}` : GO[i]

  const shown = run.busy ? n : Math.max(0, n - 1), frames = ROUTE_FRAMES[run.busy || n === 0 ? Math.min(3, n) : shown]
  const k = run.busy ? ease(clamp01((run.k - 0.2) / 0.65)) : n > 0 ? 1 : 0
  const fi = run.busy || n === 0 ? Math.min(3, n) : shown
  const product = ROUTE[run.busy ? (run.k > 0.7 ? n + 1 : n) : n], lens = LENSES[run.busy || n === 0 ? at : Math.min(3, n - 1)]
  const camAt = run.busy || n === 0 ? at : Math.min(3, n - 1 + (n < 4 ? 0 : 0))
  const flows = useMemo(() => ({ add: ADDS.map(p => [p]), link: [[ETHENE_IN], ...LINKS.map(p => [p])], out: [ESTER_OUT] }), [])
  const labels: Label[] = [
    { id: 'lens', at: [lens.at[0], lens.at[1] + lens.R + 0.25, lens.at[2]], ax: 0.5, className: `scene-tag ${!run.busy && n > 0 ? 'key' : ''} -translate-y-full`, children: <><small>{product.name}</small>{product.short}</> },
    { id: 'grp', at: [lens.at[0], lens.at[1] - lens.R - 0.25, lens.at[2]], ax: 0.5, className: 'scene-tag', children: <><small>官能团</small>{product.group}</> },
    ...U.map((u, j) => ({ id: 'u' + j, at: [u.x - u.r - 0.5, 5.4, Z + 0.5] as [number, number, number], ax: 1, className: `scene-tag ${j === camAt && run.busy ? 'key' : ''} -translate-y-1/2`, style: { opacity: j === camAt ? 1 : 0, transition: 'opacity .4s' }, children: <><small>{u.name}</small>{COND[j]}</> })),
  ]
  return (
    <LabShell title="从石油到塑料" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel={U[i].name}
      stage={<Place at={SPOTS[camAt]} labels={labels}>
        <Lens spec={lens} point={[U[camAt].x + U[camAt].r * 0.6, 6.2, Z + U[camAt].r * 0.8]}><Mol a={frames[0]} b={frames[1]} k={k} u={lens.R / 6.4 * SCALE[fi] / 0.52} /></Lens>
        {flows.add.map((p, j) => <Flow key={j} paths={p} density={1.5} speed={3.2} size={0.15} on={run.busy && j === n ? 1 : 0} color={() => COLOR[STEPS6[j].add]} />)}
        {flows.link.map((p, j) => <Flow key={'l' + j} paths={p} density={1.2} speed={3.6} size={0.2} on={run.busy && j === n ? 1 : 0} color={() => '#ffe9a8'} />)}
        <Flow paths={flows.out} density={1.4} speed={3} size={0.17} on={run.busy && n === 3 && run.k > 0.6 ? 1 : 0} color={() => '#b8f0c0'} />
      </Place>}
      lesson={<LessonBlock no="6" title="官能团的转化" concept="换一个官能团，就换一类物质" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>决定有机物化学特性的原子或原子团叫<b className="text-white">官能团</b>。烯烃的官能团是碳碳双键，醇是羟基 —OH，醛是醛基 —CHO，羧酸是羧基 —COOH，酯是酯基 —COO—。</p>
          <p className="mt-3">从乙烯出发：和水<b className="text-white">加成</b>得到乙醇；乙醇在铜或银催化下被氧气<b className="text-white">氧化</b>成乙醛；乙醛继续被氧化成乙酸；乙酸和乙醇在浓硫酸作用下<b className="text-white">酯化</b>，生成有香味的乙酸乙酯和水。</p>
          <p className="mt-3">酯化反应是可逆反应，也属于取代反应：酸脱去羟基，醇脱去羟基上的氢。</p>
          <p className="mt-3">这样一步一步换官能团，就能从简单的原料合成需要的物质。装置的外形是示意；下面的产量按每一步都完全转化算。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">乙烯 → 乙醇 → 乙醛 → 乙酸 → 乙酸乙酯</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">加成、氧化、氧化、酯化，官能团依次是碳碳双键、羟基、醛基、羧基、酯基。2 个乙烯分子最后得到 1 个乙酸乙酯分子：56 t 乙烯理论上最多得 {esterFromEthene(56).toFixed(0)} t 乙酸乙酯。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <h2 className="text-[12.5px] text-white/55">一路上的五种物质</h2>
        <div className="mt-2 space-y-1.5">
          {ROUTE.map((r, j) => <div key={r.name} className={`flex items-center justify-between rounded-lg px-3 py-2 ${j === n ? 'bg-[#35c7b3]/20 ring-1 ring-[#35c7b3]/50' : j < n ? 'bg-white/[0.07]' : 'bg-white/[0.03] text-white/35'}`}>
            <div><div className="text-[14.5px] font-semibold">{r.name}<span className="ml-2 font-formula text-[13px] font-normal opacity-75">{r.short}</span></div><div className="text-[12.5px] opacity-70">{r.group}</div></div>
            <div className="text-[18px] font-bold tabular-nums">{mass(r.formula)}</div>
          </div>)}
        </div>
        <p className="mt-1 text-right text-[12px] text-white/45">右边是相对分子质量</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ParamTile symbol="这一步" value={STEPS6[i].kind.replace('（取代反应）', '')} unit={COND[i]} />
          <ParamTile symbol="56 t 乙烯" value={n >= 4 ? esterFromEthene(56).toFixed(0) : '—'} unit="t 乙酸乙酯 · 理论上最多" />
        </div>
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'go'} disabled={run.busy || n >= 4} onClick={go}>开始反应</LabButton>
      </>}
      extras={
        <Control label="加什么">
          <Segmented label="加什么" pulse={next === 'seg'} want={task ? need : null} disabled={run.busy} value={add} onChange={v => { setAdd(v as Reagent); setOops(null) }} options={[{ value: 'water', label: '水' }, { value: 'oxygen', label: '氧气' }, { value: 'ethanol', label: '乙醇' }]} />
        </Control>
      }
    />
  )
}
