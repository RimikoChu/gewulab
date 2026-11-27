// 减数分裂和遗传规律 · 第 6 课 自由组合定律：果蝇的体色（E 灰体、e 黑檀体）和翅形（V 长翅、v 残翅），两对基因在两对同源染色体上。
// 灰体长翅 × 黑檀体残翅，子一代全是灰体长翅；白板上看子一代形成配子时非同源染色体自由组合，得到四种配子；填 4×4 的棋盘格，子二代 9∶3∶3∶1；再数麻醉板上的子二代。
import { useEffect, useState } from 'react'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { BoardInk, INK, Magnet, drawPunnett, onBoard, type Pen } from './board'
import type { FlyLook } from './bench'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BenchView, benchLabels, groupTag, layout, useFlies, type BenchSet } from './pad'
import { ease, lerp, rng, useRun } from './parts'
import { DI_ORDER, DI_SAMPLE, diGametes, diPheno, diPunnett, diRatio, dominant } from './physics'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

type Arr = 'one' | 'two'
const F1 = Array.from({ length: 16 }, () => 'EeVv')
const P16 = diPunnett('EeVv', 'EeVv').cells, RATIO = diRatio(P16)
const COUNT = DI_ORDER.map(ph => DI_SAMPLE.filter(g => diPheno(g) === ph).length)
const GAMETES: Record<Arr, [string, string]> = { one: ['EV', 'ev'], two: ['eV', 'Ev'] }
const look = (seed: number) => { const r = rng(seed); return (g: string): FlyLook => ({ eye: 'red', body: dominant(g.slice(0, 2)) ? 'gray' : 'ebony', wing: dominant(g.slice(2)) ? 'long' : 'vestigial', sex: r() < 0.5 ? 'f' : 'm' }) }
const TASKS: Task[] = [
  { id: 'f1', text: '让灰体长翅和黑檀体残翅果蝇杂交，看子一代', note: '子一代全是灰体长翅' },
  { id: 'gam', text: '在白板上看子一代形成配子，换一种排列方式', note: `非同源染色体自由组合：${diGametes('EeVv').join('、')} 四种配子，各占 1/4` },
  { id: 'grid', text: '填满 4×4 的棋盘格，数四种表型各几格', note: `${DI_ORDER.join('∶')} = ${RATIO.join('∶')}` },
  { id: 'count', text: '让子一代相互交配，数一数子二代', note: `${COUNT.join('∶')}，接近 ${RATIO.join('∶')}` },
]
const GL_F: FlyLook = { eye: 'red', body: 'gray', wing: 'long', sex: 'f' }, GL_M: FlyLook = { ...GL_F, sex: 'm' }, GV_F: FlyLook = { ...GL_F, wing: 'vestigial' }, EL_M: FlyLook = { ...GL_M, body: 'ebony' }, EV_M: FlyLook = { ...GL_M, body: 'ebony', wing: 'vestigial' }
const P_FLIES = layout([0, 1, 2, 3, 4, 5].map(i => ({ o: i < 3 ? GL_F : EV_M, group: i < 3 ? 0 : 1 })), 2, 9)
const PH_COLOR = ['rgba(53,170,120,0.24)', 'rgba(90,150,220,0.24)', 'rgba(240,170,60,0.3)', 'rgba(150,110,90,0.3)']

function drawBoard(p: Pen, arr: Arr, seen: string[], grid: boolean) {
  p.text('自由组合定律', -122, 56, 8.5, INK.black, 'left', 700)
  p.text('子一代 EeVv 形成配子', -84, 43, 6, INK.blue)
  p.circle(-84, 14, 24, INK.green, 0.6)
  p.line([[-84, 38], [-84, -10]], INK.grey, 0.35, [1.4, 1.2])
  p.arrow(-95, -11, -104, -22, INK.black, 0.5); p.arrow(-73, -11, -64, -22, INK.black, 0.5)
  GAMETES[arr].forEach((g, i) => { const x = i ? -62 : -106; p.circle(x, -36, 12, INK.green, 0.55); p.text(g, x, -36, 7, INK.black, 'center', 700) })
  p.text(`配子：${seen.join('  ')}`, -84, -57, 5.6, INK.red, 'center', 700)
  p.text('P  灰体长翅 EEVV × 黑檀体残翅 eevv', -26, 57, 5, INK.black, 'left')
  p.rich([['F', ''], ['1', 'sub'], ['  EeVv × EeVv', '']], -26, 47, 5, INK.black, 'left')
  const top = diGametes('EeVv')
  drawPunnett(p, 6, 40, top, top, P16, 26, 15, g => PH_COLOR[DI_ORDER.indexOf(diPheno(g) as typeof DI_ORDER[number])], () => '', grid, 5.4)
  if (grid) {
    DI_ORDER.forEach((ph, i) => { const x = -26 + i * 38; p.rect(x, -42, 6, 4.4, INK.black, 0.3, PH_COLOR[i]); p.text(`${ph} ${RATIO[i]}`, x + 8, -39.8, 4.6, INK.black, 'left', 600) })
    p.text(`= ${RATIO.join('∶')}`, 126, -54, 7, INK.red, 'right', 700)
  }
}

export default function Lesson6() {
  const [gen, setGen] = useState(0)
  const [board, setBoard] = useState(false)
  const [arr, setArr] = useState<Arr>('one')
  const [seen, setSeen] = useState<string[]>([])
  const [grid, setGrid] = useState(false)
  const [sorted, setSorted] = useState(false)
  const T = useTasks('gewu:meiosis:6', TASKS)
  const flip = useRun(arr === 'two' ? 1 : 0, 1.2), se = useRun(sorted ? 1 : 0, 3)
  const flipping = flip > 0 && flip < 1, sorting = sorted && se < 1
  const f1 = useFlies(F1, look(11), () => 0, 1, 11)
  const f2 = useFlies(DI_SAMPLE, look(12), g => DI_ORDER.indexOf(diPheno(g) as typeof DI_ORDER[number]), 4, 12)
  useEffect(() => { if (board && !flipping) setSeen(s => [...s, ...GAMETES[arr].filter(g => !s.includes(g))]) }, [board, arr, flipping])
  useEffect(() => {
    if (sorting || flipping) return
    T.check(id => (id === 'f1' && gen >= 1) || (id === 'gam' && seen.length >= 4) || (id === 'grid' && grid) || (id === 'count' && sorted))
  }, [gen, seen, grid, sorted, sorting, flipping])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setGen(0); setBoard(false); setArr('one'); setSeen([]); setGrid(false); setSorted(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'gen' | 'board' | 'arr' | 'count' | null } = (() => {
    if (!task) return { hint: '自由组合定律：控制不同性状的遗传因子，在形成配子时自由组合。', next: null }
    if (sorting) return { hint: '用毛笔把四种果蝇拨开…', next: null }
    if (flipping) return { hint: '另一对同源染色体换了个方向…', next: null }
    if (gen === 0) return { hint: '亲代：灰体长翅雌蝇和黑檀体残翅雄蝇。按“下一代”', next: 'gen' }
    if (!board) return { hint: '子一代全是灰体长翅。按“看图解”，看它怎样形成配子', next: 'board' }
    if (seen.length < 4) return { hint: '两对同源染色体分离时还可以换个方向。在“排列方式”里选“另一种”', next: 'arr' }
    if (!grid) return { hint: '四种配子都有了，各占 1/4。按“填棋盘格”', next: 'board' }
    if (gen === 1) return { hint: '棋盘格里是 9∶3∶3∶1。按“下一代”，看真的果蝇', next: 'gen' }
    return { hint: '子二代有四种样子。按“数一数”', next: 'count' }
  })()
  const at = board && gen < 2 ? 'board' : 'pad'
  const counted = gen === 2 && sorted && !sorting
  const set: BenchSet = {
    vials: gen === 0 ? [GL_F, EV_M] : [GL_F, GL_M], vialNames: gen === 0 ? ['亲代 ♀ 灰体长翅', '亲代 ♂ 黑檀体残翅'] : ['子一代 ♀', '子一代 ♂'],
    flies: gen === 0 ? P_FLIES : gen === 1 ? f1 : f2, e: gen === 2 ? se : 0,
    loupe: gen === 2 ? [{ o: GL_F, name: DI_ORDER[0] }, { o: GV_F, name: DI_ORDER[1] }, { o: EL_M, name: DI_ORDER[2] }, { o: EV_M, name: DI_ORDER[3] }]
      : gen === 1 ? [{ o: GL_F, name: '子一代 ♀' }, { o: GL_M, name: '子一代 ♂' }] : [{ o: GL_F, name: '♀ 灰体长翅' }, { o: EV_M, name: '♂ 黑檀体残翅' }],
    card: p => {
      p.text('杂交记录', -7, 3.4, 1.05, INK.black, 'left', 700)
      p.text('P  灰体长翅 EEVV × 黑檀体残翅 eevv', -7, 1.9, 0.82, INK.black, 'left')
      if (gen >= 1) p.rich([['F', ''], ['1', 'sub'], ['  全是灰体长翅 EeVv', '']], -7, 0.6, 0.82, INK.black, 'left')
      if (gen >= 2) p.rich([['F', ''], ['2', 'sub'], [counted ? `  ${COUNT.join(' ∶ ')}` : '  四种样子', '']], -7, -0.7, 0.82, INK.black, 'left')
      if (counted) p.text(`≈ ${RATIO.join('∶')}`, 6.8, -2.6, 1.15, INK.red, 'right', 700)
    },
    cardDeps: [gen, counted],
  }
  const k = ease(flip)
  // 磁性染色体：中期Ⅰ两对同源染色体排在赤道板两侧。第 1 对（翅形 V/v）不动，第 2 对（体色 E/e）换方向
  const mags = [
    { pair: 0, who: 0, at: [-91, 24] as [number, number], L: 'V' }, { pair: 0, who: 1, at: [-77, 24] as [number, number], L: 'v' },
    { pair: 1, who: 0, at: [lerp(-91, -77, k), 2] as [number, number], L: 'E' }, { pair: 1, who: 1, at: [lerp(-77, -91, k), 2] as [number, number], L: 'e' },
  ]
  const labels: Label[] = at === 'pad' ? benchLabels(set) : []
  if (at === 'board') mags.forEach(m => labels.push({ id: `m${m.L}`, at: onBoard(m.at[0] + (m.at[0] < -84 ? -5 : 5), m.at[1] + (m.pair ? 3 : 5)), ax: m.at[0] < -84 ? 1 : 0, className: 'scene-tag !px-1.5 !py-0 -translate-y-1/2', children: m.L }))
  if (at === 'pad' && gen === 2 && sorted && !sorting) DI_ORDER.forEach((ph, g) => labels.push({ id: `c${g}`, at: groupTag(g, 4).at, ax: groupTag(g, 4).ax, className: `scene-tag key ${groupTag(g, 4).cls}`, children: <><small>{ph}</small>{COUNT[g]}</> }))
  return (
    <LabShell title="减数分裂和遗传规律" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="杂交实验"
      stage={<Room at={at} labels={labels}>
        <BenchView key={gen} s={set} />
        <BoardInk draw={p => drawBoard(p, arr, seen, grid)} deps={[arr, seen.join(), grid]} />
        {mags.map(m => <Magnet key={m.L} pair={m.pair} who={m.who} at={m.at} scale={m.pair ? 1.5 : 1.25} />)}
      </Room>}
      lesson={<LessonBlock no="6" title="自由组合定律" concept="非同源染色体上的非等位基因自由组合" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>孟德尔用黄色圆粒豌豆和绿色皱粒豌豆杂交，子二代出现四种性状组合，比例接近 9∶3∶3∶1。这里用果蝇的体色和翅形，道理相同。</p>
          <p className="mt-2"><b className="text-white">自由组合定律</b>：控制不同性状的遗传因子的分离和组合是互不干扰的；在形成配子时，决定同一性状的成对的遗传因子彼此分离，决定不同性状的遗传因子自由组合。</p>
          <p className="mt-2">细胞学基础：减数第一次分裂后期，同源染色体分离的同时，<b className="text-white">非同源染色体自由组合</b>，它们上面的非等位基因也自由组合。每一对单独看仍是 3∶1，两对合在一起就是 (3∶1)×(3∶1) = 9∶3∶3∶1。</p>
        </>} />}
      finale={T.finale && <Finale kicker="自由组合定律" title={`子二代 ${RATIO.join('∶')}`} text={`子一代 EeVv 形成配子时，E、e 随一对同源染色体分离，V、v 随另一对分离，两对之间自由组合，得到 EV、Ev、eV、ev 四种配子，各占 1/4；16 种结合方式，四种表型 ${RATIO.join('∶')}。数出来的 ${COUNT.join('∶')} 接近这个比例。`} notes="麻醉板上的子二代是按 9∶3∶3∶1 的机会抽出来的一批；白板上的染色体画成没有复制的单条，只画了这两对。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            {DI_ORDER.map((ph, i) => <ParamTile key={ph} symbol={ph} value={gen === 2 && sorted && !sorting ? String(COUNT[i]) : grid ? `${RATIO[i]} 格` : '—'} unit={gen === 2 && sorted && !sorting ? '只' : '棋盘格'} />)}
          </div>
          <H>杂交过程</H>
          <div className="flex flex-col gap-1.5">
            <Row name="亲代" text="灰体长翅 EEVV × 黑檀体残翅 eevv" seen />
            <Row name="子一代" text={gen >= 1 ? '全是灰体长翅 EeVv' : '—'} seen={gen >= 1} />
            <Row name="配子" text={seen.length ? seen.join('、') : '—'} seen={seen.length > 0} on={board && gen < 2} />
            <Row name="子二代" text={gen >= 2 ? '四种表型' : '—'} seen={gen >= 2} on={gen >= 2} />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">E：灰体，e：黑檀体；V：长翅，v：残翅。两对基因在两对同源染色体上。</p>
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'gen'} onClick={() => { setGen(g => g + 1); setSorted(false) }} disabled={gen >= 2 || (gen === 1 && !grid)}>下一代</LabButton>
        <LabButton primary pulse={next === 'board'} onClick={() => (board ? setGrid(true) : setBoard(true))} disabled={gen !== 1 || (board && (seen.length < 4 || grid))}>{board ? '填棋盘格' : '看图解'}</LabButton>
        <LabButton pulse={next === 'count'} onClick={() => setSorted(true)} disabled={gen !== 2 || sorted}>数一数</LabButton>
      </>}
      extras={
        <Control label="排列方式">
          <Segmented label="排列方式" pulse={next === 'arr'} want={next === 'arr' ? 'two' : null} value={arr} onChange={v => setArr(v as Arr)} disabled={!board || gen >= 2} options={[{ value: 'one', label: '一种' }, { value: 'two', label: '另一种' }]} />
        </Control>
      }
    />
  )
}
