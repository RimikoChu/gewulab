// 分子的形状和晶体 · 第 5 课 晶胞里数粒子：屋子中间西边的展台，转台上一个氯化钠晶胞（绿球 Cl⁻，紫球 Na⁺）。
// 先沿六个面把晶胞切开：顶点上的球只剩 1/8，棱上的剩 1/4，面上的剩一半。再按位置一类一类点亮、记下来，合计，最后用晶胞的边长算密度。
import { useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { CellModel, local, toWorld } from './cell'
import { Fin, Row } from './fin'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { CELLS, POS, POS_KEYS, count, density, drawn, sites, type CellKey, type Pos, type V3 } from './physics'
import { VOICE } from './voice'
import { Place, SPOT, center, type SpotKey } from './world'

const TASKS: Task[] = [
  { id: 'cut', text: '切开晶胞', note: '顶点、棱、面上的粒子只有一部分在晶胞里面' },
  { id: 'four', text: '顶点、棱上、面上、体内，四类各记一次', note: '顶点 1/8，棱上 1/4，面上 1/2，体内 1' },
  { id: 'sum', text: '合计 Na⁺ 和 Cl⁻ 各有几个', note: `Na⁺ ${count('NaCl', 'Na')} 个，Cl⁻ ${count('NaCl', 'Cl')} 个，1 : 1` },
  { id: 'dens', text: '用晶胞算出氯化钠的密度', note: `${density('NaCl').toFixed(2)} g/cm³，和实际测得的相符` },
]
const C = center('l5', 3.2), ROT = 2.75 - 0.42
/** 这一类位置的算式：8 个 Cl⁻ × 1/8 = 1 */
export function tally(c: CellKey, pos: Pos) {
  return Object.entries(CELLS[c].kinds).filter(([el]) => drawn(c, pos, el) > 0).map(([el, name]) => { const n = drawn(c, pos, el); return `${n} 个 ${name} × ${POS[pos].text} = ${n * POS[pos].share}` }).join('；')
}
/** 这一类位置上最靠近镜头的几个粒子在世界里的位置：标签贴在它们旁边 */
export function frontSites(c: CellKey, pos: Pos, at: V3, rot: number, spot: SpotKey, n = 3): V3[] {
  const [az, el] = SPOT[spot].view, d = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]
  return sites(c).filter(s => s.pos === pos).map(s => toWorld(local(s.p), at, rot)).map(p => ({ p, k: (p[0] - at[0]) * d[0] + (p[1] - at[1]) * d[1] + (p[2] - at[2]) * d[2] })).sort((a, b) => b.k - a.k).slice(0, n).map(x => x.p)
}

export default function Lesson5() {
  const T = useTasks('gewu:crystal:5', TASKS)
  const [open, setOpen] = useState(false), [pos, setPos] = useState<Pos>('corner'), [rec, setRec] = useState<Pos[]>([])
  const [summed, setSummed] = useState(false), [dens, setDens] = useState(false)
  const cut = useRun(1.8, () => T.check(id => id === 'cut'))
  const resetAll = () => { setOpen(false); cut.snap(0); setPos('corner'); setRec([]); setSummed(false); setDens(false); T.reset() }
  const record = () => { if (rec.includes(pos)) return; const n = [...rec, pos]; setRec(n); T.check(id => id === 'four' && n.length === 4) }
  const total = () => { if (!summed) { setSummed(true); T.check(id => id === 'sum') } else { setDens(true); T.check(id => id === 'dens') } }
  const k = open ? (cut.busy ? cut.k : 1) : 0, ready = open && !cut.busy, all = rec.length === 4
  const want = POS_KEYS.find(p => !rec.includes(p)) ?? null, task = T.current

  const { hint, next }: { hint: string; next: 'cut' | 'pos' | 'rec' | 'sum' | null } = !task ? { hint: '都做完了。拖动画面，可以转着看切开的晶胞。', next: null }
    : cut.busy ? { hint: '沿着晶胞的六个面切开…', next: null }
    : !open ? { hint: '这些球有多少是属于这一个晶胞的？先把晶胞切开', next: 'cut' }
    : want && pos !== want ? { hint: `换一类位置：选“${POS[want].name}”`, next: 'pos' }
    : want ? { hint: want === 'body' ? '体内的粒子整个在晶胞里面，算 1 个。记下这一类' : `${POS[want].name}的粒子被 ${POS[want].by} 个晶胞合用，每个只算 ${POS[want].text}。记下这一类`, next: 'rec' }
    : !summed ? { hint: '四类都记下了。合计', next: 'sum' }
    : { hint: 'Na⁺ 和 Cl⁻ 各 4 个。再用晶胞的边长算密度', next: 'sum' }

  const hi = ready && !summed ? pos : null
  const front = frontSites('NaCl', pos, C, ROT, 'l5', pos === 'body' ? 1 : 3)
  const labels: Label[] = [
    { id: 'n', at: [C[0], C[1] + 2.9, C[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '氯化钠晶胞：绿球 Cl⁻，紫球 Na⁺' },
    ...[0, 1, 2].map(i => ({ id: `f${i}`, at: (front[i] ? [front[i][0], front[i][1] + 0.75, front[i][2]] : C) as V3, ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: hi && front[i] ? 1 : 0 }, children: POS[pos].text })),
  ]
  const a = CELLS.NaCl.a
  return (
    <LabShell title="分子的形状和晶体" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="操作"
      stage={<Place at="l5" labels={labels}><group position={C} rotation-y={ROT}><CellModel c="NaCl" cut={k} pos={C} rot={ROT} hi={hi} /></group></Place>}
      lesson={<LessonBlock no="5" title="晶胞里数粒子" concept="粒子被几个晶胞合用，就只算几分之一" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>晶胞是描述晶体结构的基本单元，整块晶体可以看作数量巨大的晶胞“无隙并置”而成。所以晶胞顶点、棱、面上的粒子，是和相邻的晶胞合用的。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>顶点：8 个晶胞合用，算 1/8；棱上：4 个晶胞合用，算 1/4</li>
            <li>面上：2 个晶胞合用，算 1/2；体内：只属于这一个晶胞，算 1</li>
            <li>密度 = 一个晶胞里粒子的质量 ÷ 晶胞的体积 = N·M ÷ (N<sub>A</sub>·a³)</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">这里说的是立方晶胞。为了看清里面，模型里的球画得比实际小。</p>
        </>} />}
      finale={T.finale && <Fin tag="数完了，也算完了" big="一个氯化钠晶胞里有 4 个 Na⁺、4 个 Cl⁻">顶点 1/8、棱上 1/4、面上 1/2、体内 1。由晶胞边长 {a} pm 算出密度 {density('NaCl').toFixed(2)} g/cm³。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">按位置记</h2>
          <div className="mt-1">{POS_KEYS.map(p => <Row key={p} name={POS[p].name} on={rec.includes(p)}>{tally('NaCl', p)}</Row>)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="Na⁺" value={summed ? String(count('NaCl', 'Na')) : '—'} unit="个 · 棱上 3 + 体内 1" />
            <ParamTile symbol="Cl⁻" value={summed ? String(count('NaCl', 'Cl')) : '—'} unit="个 · 顶点 1 + 面上 3" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">由晶胞算密度</h2>
          <div className="mt-1.5 rounded-xl bg-white/8 px-3 py-2.5 text-[14px] leading-relaxed">
            <div className="font-formula text-[16px] italic text-white/70">ρ = N·M ÷ (N<sub>A</sub>·a³)</div>
            {dens ? <>
              <div className="mt-1 text-white/75 tabular-nums">4 × {CELLS.NaCl.M} g ÷ (6.02×10²³ × ({(a / 100).toFixed(2)}×10⁻⁸ cm)³)</div>
              <div className="mt-1 text-[22px] font-bold tabular-nums">{density('NaCl').toFixed(2)} <span className="text-[14px] font-medium text-white/55">g/cm³</span></div>
            </> : <div className="mt-1 text-white/45">晶胞边长 a = {a} pm，M = {CELLS.NaCl.M} g/mol</div>}
          </div>
        </Panel>
      }
      actions={<>
        <LabButton pulse={next === 'cut'} onClick={() => { setOpen(true); cut.run() }} disabled={open}>切开晶胞</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!ready || rec.includes(pos) || summed}>记下这一类</LabButton>
        <LabButton pulse={next === 'sum'} onClick={total} disabled={!all || dens}>{summed ? '算密度' : '合计'}</LabButton>
      </>}
      extras={
        <Control label="位置">
          <Segmented label="位置" pulse={next === 'pos'} want={next === 'pos' ? want : null} value={pos} onChange={p => setPos(p as Pos)} disabled={!ready || summed} options={POS_KEYS.map(p => ({ value: p, label: POS[p].name }))} />
        </Control>
      }
    />
  )
}
