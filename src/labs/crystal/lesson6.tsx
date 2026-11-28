// 分子的形状和晶体 · 第 6 课 换个晶胞再数：屋子中间东边的展台。氯化铯、金刚石、干冰、铜四种晶胞轮流放上转台，
// 按“切开数一数”：晶胞被切开，顶点、棱、面、体内的粒子依次点亮，面板上一行行列出算式；再按“记录”。
import { useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { CellModel } from './cell'
import { Fin, Row } from './fin'
import { LESSONS, goLesson } from './lessons'
import { frontSites, tally } from './lesson5'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { CELLS, POS, POS_KEYS, count, drawn, type CellKey, type Pos, type V3 } from './physics'
import { VOICE } from './voice'
import { Place, center } from './world'

const ORDER: CellKey[] = ['CsCl', 'diamond', 'dryice', 'Cu']
/** 一个晶胞里各种粒子各有几个：“Cs⁺ 1 个、Cl⁻ 1 个” */
const summary = (c: CellKey) => Object.entries(CELLS[c].kinds).map(([el, name]) => `${name} ${count(c, el)} 个`).join('、')
const TASKS: Task[] = ORDER.map(c => ({ id: c, text: `${CELLS[c].name}：切开数一数，记录`, note: summary(c) }))
const C = center('l6', 3.2), ROT = -2.7 + 0.42, CUT = 1.5, STEP = 1.5
const WHAT: Record<CellKey, string> = { NaCl: '', CsCl: '绿球 Cl⁻ 在顶点，金球 Cs⁺ 在体心', diamond: '全是碳原子，每个连着 4 个', dryice: '每个位置上是一个 CO₂ 分子', Cu: '全是铜原子' }

export default function Lesson6() {
  const T = useTasks('gewu:crystal:6', TASKS)
  const [cell, setCell] = useState<CellKey>('CsCl'), [started, setStarted] = useState(false), [rec, setRec] = useState<CellKey[]>([])
  const classes = POS_KEYS.filter(p => drawn(cell, p) > 0)
  const run = useRun(CUT + classes.length * STEP + 0.3)
  const pick = (c: CellKey) => { setCell(c); setStarted(false); run.snap(0) }
  const resetAll = () => { pick('CsCl'); setRec([]); T.reset() }
  const record = () => { const n = rec.includes(cell) ? rec : [...rec, cell]; setRec(n); T.check(id => n.includes(id as CellKey)) }
  const counted = started && !run.busy
  const cut = !started ? 0 : run.busy ? Math.min(1, run.t / CUT) : 1
  const idx = run.busy && run.t > CUT ? Math.min(classes.length - 1, Math.floor((run.t - CUT) / STEP)) : -1
  const hi: Pos | null = idx >= 0 ? classes[idx] : null, shown = counted ? classes.length : idx + 1
  const want = ORDER.find(c => !rec.includes(c)) ?? null, task = T.current

  const { hint, next }: { hint: string; next: 'cell' | 'run' | 'rec' | null } = !task || !want ? { hint: '四种晶胞都数过了。拖动画面，可以转着看。', next: null }
    : run.busy ? { hint: '按顶点、棱、面、体内的顺序数…', next: null }
    : cell !== want ? { hint: `把晶胞换成${CELLS[want].name}`, next: 'cell' }
    : !started ? { hint: `${CELLS[cell].name}的晶胞：${WHAT[cell]}。切开数一数`, next: 'run' }
    : { hint: `一个${CELLS[cell].name}晶胞里：${summary(cell)}。记录`, next: 'rec' }

  const front = hi ? frontSites(cell, hi, C, ROT, 'l6', hi === 'body' && cell !== 'diamond' ? 1 : 3) : []
  const labels: Label[] = [
    { id: 'n', at: [C[0], C[1] + 2.9, C[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `${CELLS[cell].name}晶胞` },
    ...[0, 1, 2].map(i => ({ id: `f${i}`, at: (front[i] ? [front[i][0], front[i][1] + 0.8, front[i][2]] : C) as V3, ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: hi && front[i] ? 1 : 0 }, children: hi ? POS[hi].text : '' })),
  ]
  return (
    <LabShell title="分子的形状和晶体" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="操作"
      stage={<Place at="l6" labels={labels}><group position={C} rotation-y={ROT}><CellModel key={cell} c={cell} cut={cut} pos={C} rot={ROT} hi={hi} /></group></Place>}
      lesson={<LessonBlock no="6" title="换个晶胞再数" concept="数法不变：看粒子在顶点、棱、面还是体内" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>不管是哪一种晶体，立方晶胞里粒子的数法都一样：顶点 1/8、棱上 1/4、面上 1/2、体内 1。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>氯化铯：Cl⁻ 在 8 个顶点，Cs⁺ 在体心，1 : 1</li>
            <li>金刚石：碳原子在 8 个顶点、6 个面心，体内还有 4 个，共 8 个</li>
            <li>干冰：CO₂ 分子在 8 个顶点和 6 个面心，共 4 个分子；分子晶体要按分子来数</li>
            <li>铜：铜原子在 8 个顶点和 6 个面心，共 4 个</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">干冰晶胞里 CO₂ 分子的朝向是示意；数的时候看分子的中心（碳原子）在哪里。</p>
        </>} />}
      finale={T.finale && <Fin tag="四种晶胞都数过了" big="数法不变：顶点 1/8，棱 1/4，面 1/2，体内 1">氯化铯 Cs⁺、Cl⁻ 各 1 个；金刚石 8 个碳原子；干冰 4 个 CO₂ 分子；铜 4 个铜原子。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[12.5px] text-white/55">一个{CELLS[cell].name}晶胞里</div>
            <div className="mt-1 text-[26px] leading-tight font-bold tracking-tight tabular-nums">{counted ? summary(cell) : '—'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">按位置数</h2>
          <div className="mt-1">{classes.map((p, i) => <Row key={p} name={POS[p].name} on={i < shown}>{tally(cell, p)}</Row>)}</div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <div className="mt-1">{ORDER.map(c => <Row key={c} name={CELLS[c].name} on={rec.includes(c)}>{summary(c)}</Row>)}</div>
        </Panel>
      }
      actions={<>
        <LabButton pulse={next === 'run'} onClick={() => { setStarted(true); run.run() }} disabled={started}>切开数一数</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!counted || rec.includes(cell)}>记录</LabButton>
      </>}
      extras={
        <Control label="晶胞">
          <Segmented label="晶胞" pulse={next === 'cell'} want={next === 'cell' ? want : null} value={cell} onChange={c => pick(c as CellKey)} disabled={run.busy} options={ORDER.map(c => ({ value: c, label: CELLS[c].name }))} />
        </Control>
      }
    />
  )
}
