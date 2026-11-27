// 减数分裂和遗传规律 · 第 7 课 伴性遗传：摩尔根的果蝇杂交实验。红眼雌蝇 × 白眼雄蝇，子一代全是红眼；子一代相互交配，子二代红眼∶白眼约 3∶1，
// 白眼全是雄蝇。白板上用 X、Y 染色体模型解释：白眼基因 w 在 X 染色体上，Y 上没有它的等位基因。再到大屏上看人的红绿色盲的遗传图解。
import { useEffect, useState } from 'react'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { BoardInk, INK, Magnet, SCR, ScreenInk, drawPunnett, onBoard, richOf, type Pen } from './board'
import type { FlyLook } from './bench'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BenchView, benchLabels, groupTag, layout, useFlies, type BenchSet } from './pad'
import { useRun } from './parts'
import { COLORBLIND, FLY_F1, FLY_F2, XF2_SAMPLE, cbOdds, eyeTally, fstr, isMale, showsRecessive, type CbKey, type SexGeno } from './physics'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

type Part = 'fly' | 'cb'
const F1 = Array.from({ length: 16 }, (_, i) => FLY_F1[i % 4])
const TALLY = eyeTally(XF2_SAMPLE)
const GROUPS = ['红眼雌蝇', '红眼雄蝇', '白眼雄蝇'] as const
const groupOf = (g: SexGeno) => (showsRecessive(g) ? 2 : isMale(g) ? 1 : 0)
const COUNT = GROUPS.map((_, i) => XF2_SAMPLE.filter(g => groupOf(g) === i).length)
const F2T = eyeTally(FLY_F2)
const ODDS = { carrier: cbOdds('carrier'), affected: cbOdds('affected') }
const RF: FlyLook = { eye: 'red', body: 'gray', wing: 'long', sex: 'f' }, RM: FlyLook = { ...RF, sex: 'm' }, WM: FlyLook = { ...RM, eye: 'white' }
const P_FLIES = layout([0, 1, 2, 3, 4, 5].map(i => ({ o: i < 3 ? RF : WM, group: i < 3 ? 0 : 1 })), 2, 13)
const look = (g: SexGeno): FlyLook => ({ eye: showsRecessive(g) ? 'white' : 'red', body: 'gray', wing: 'long', sex: isMale(g) ? 'm' : 'f' })
const TASKS: Task[] = [
  { id: 'f1', text: '让红眼雌蝇和白眼雄蝇杂交，看子一代', note: '子一代不论雌雄全是红眼' },
  { id: 'f2', text: '让子一代相互交配，按眼色和性别数子二代', note: `红眼 ${TALLY.red} 只、白眼 ${TALLY.white} 只，白眼的全是雄蝇` },
  { id: 'why', text: '在白板上看白眼为什么只出现在雄蝇', note: '白眼基因 w 在 X 染色体上，Y 染色体上没有它的等位基因' },
  { id: 'cb1', text: '换成人的红绿色盲：携带者女性 × 正常男性', note: `儿子 ${fstr(ODDS.carrier.son)} 色盲；女儿都不色盲，${fstr(ODDS.carrier.carrier)} 是携带者` },
  { id: 'cb2', text: '再看色盲女性 × 正常男性', note: '儿子全是色盲，女儿全是携带者' },
]
const xr = (g: string[]) => g.map(x => (x === 'Y' ? 'Y' : `X^${x[1]}`)).join('')
const fill = (g: string) => (g.includes('^w') && !g.includes('^W') ? 'rgba(240,240,240,0.9)' : 'rgba(220,80,60,0.18)')
function drawBoard(p: Pen, show: boolean) {
  p.text('伴性遗传：果蝇的白眼', -122, 56, 8, INK.black, 'left', 700)
  p.rich([['F', ''], ['1', 'sub'], ...richOf('   红眼♀ X^WX^w  ×  红眼♂ X^WY')], -122, 43, 5.6, INK.black, 'left')
  p.circle(-100, 10, 22, INK.green, 0.6); p.circle(-52, 10, 22, INK.green, 0.6)
  p.text('雌蝇', -100, -18, 5.4, INK.mom); p.text('雄蝇', -52, -18, 5.4, INK.dad)
  p.text('w 只在 X 上，Y 上没有它的等位基因', -76, -34, 5, INK.blue)
  p.rich([['F', ''], ['1', 'sub'], [' × F', ''], ['1', 'sub']], 16, 56, 6, INK.black, 'left')
  const top = ['X^W', 'X^w'], left = ['X^W', 'Y'], cells = FLY_F2.map(g => xr(g))
  drawPunnett(p, 10, 46, top, left, cells, 34, 22, fill, g => (g.includes('Y') ? (g.includes('^w') ? '白眼♂' : '红眼♂') : '红眼♀'), show, 6.4)
  if (show) p.text(`红眼∶白眼 = ${F2T.red}∶${F2T.white}，白眼全是雄蝇`, 126, -46, 6.4, INK.red, 'right', 700)
}
/** 大屏：红绿色盲的遗传图解（亲代、配子、子代、比例） */
function drawScreen(p: Pen, k: CbKey, show: boolean) {
  const m = COLORBLIND[k], o = cbOdds(k), sexName = (g: SexGeno) => (isMale(g) ? '男' : '女')
  const state = (g: SexGeno) => (showsRecessive(g) ? '色盲' : !isMale(g) && g.includes('Xb') ? '携带者' : '正常')
  p.text('人的红绿色盲（伴 X 染色体隐性遗传）', -88, 44, 6.6, SCR.fg, 'left', 700)
  p.text('亲代', -86, 28, 5, SCR.dim, 'left')
  p.rich(richOf(xr(m.mom)), -36, 30, 7.4, SCR.red, 'center', 700); p.text(`女性 ${state(m.mom)}`, -36, 22, 4.4, SCR.dim)
  p.text('×', 0, 28, 6.4, SCR.fg)
  p.rich(richOf(xr(m.dad)), 36, 30, 7.4, SCR.blue, 'center', 700); p.text(`男性 ${state(m.dad)}`, 36, 22, 4.4, SCR.dim)
  p.text('配子', -86, 8, 5, SCR.dim, 'left')
  const gm = [...new Set(m.mom)], gd = m.dad
  const gx = (i: number, n: number, c: number) => c + (i - (n - 1) / 2) * 18
  gm.forEach((g, i) => { p.circle(gx(i, gm.length, -36), 8, 6, SCR.red, 0.35); p.rich(richOf(xr([g])), gx(i, gm.length, -36), 8, 5.4, SCR.fg); p.line([[-36, 18], [gx(i, gm.length, -36), 14.5]], SCR.dim, 0.3) })
  gd.forEach((g, i) => { p.circle(gx(i, 2, 36), 8, 6, SCR.blue, 0.35); p.rich(richOf(xr([g])), gx(i, 2, 36), 8, 5.4, SCR.fg); p.line([[36, 18], [gx(i, 2, 36), 14.5]], SCR.dim, 0.3) })
  p.text('子代', -86, -14, 5, SCR.dim, 'left')
  if (!show) { p.text('？', 0, -16, 8, SCR.dim); return }
  const kids = o.kids, n = kids.length
  kids.forEach((g, i) => {
    const x = -54 + i * 36
    p.rich(richOf(xr(g)), x, -12, 6.2, showsRecessive(g) ? SCR.warm : SCR.fg, 'center', 700)
    p.text(`${sexName(g)}性${state(g)}`, x, -20, 4.4, showsRecessive(g) ? SCR.warm : SCR.dim)
  })
  p.text(Array.from({ length: n }, () => '1').join('  ∶  '), 0, -29, 5, SCR.dim)
  p.text(`儿子中色盲 ${fstr(o.son)}　女儿中携带者 ${fstr(o.carrier)}　女儿中色盲 ${fstr(o.girl)}`, 0, -42, 5, SCR.key, 'center', 700)
}

export default function Lesson7() {
  const [part, setPart] = useState<Part>('fly')
  const [gen, setGen] = useState(0)
  const [sorted, setSorted] = useState(false)
  const [board, setBoard] = useState(false)
  const [cb, setCb] = useState<CbKey>('carrier')
  const [shown, setShown] = useState<CbKey[]>([])
  const T = useTasks('gewu:meiosis:7', TASKS)
  const se = useRun(sorted ? 1 : 0, 2.8), sorting = sorted && se < 1
  const f1 = useFlies(F1, look, () => 0, 1, 21)
  const f2 = useFlies(XF2_SAMPLE, look, groupOf, 3, 22)
  useEffect(() => {
    if (sorting) return
    T.check(id => (id === 'f1' && gen >= 1) || (id === 'f2' && sorted) || (id === 'why' && board) || (id === 'cb1' && shown.includes('carrier')) || (id === 'cb2' && shown.includes('affected')))
  }, [gen, sorted, sorting, board, shown])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setPart('fly'); setGen(0); setSorted(false); setBoard(false); setCb('carrier'); setShown([]); T.reset() }
  const task = T.current
  const show = shown.includes(cb)
  const { hint, next }: { hint: string; next: 'a' | 'b' | 'c' | 'part' | null } = (() => {
    if (!task) return { hint: '伴性遗传：基因在性染色体上，遗传总是和性别相关联。', next: null }
    if (sorting) return { hint: '按眼色和性别把果蝇拨开…', next: null }
    if (task.id.startsWith('cb') && part !== 'cb') return { hint: '在“看哪一种”里选“红绿色盲”', next: 'part' }
    if (part === 'cb') {
      if (task.id === 'cb2' && cb !== 'affected') return { hint: '按“换一种婚配”，看色盲女性和正常男性', next: 'a' }
      return { hint: `${COLORBLIND[cb].name}，孩子会怎样？按“看图解”`, next: 'c' }
    }
    if (gen === 0) return { hint: '亲代：红眼雌蝇和白眼雄蝇。按“下一代”', next: 'a' }
    if (gen === 1) return { hint: '子一代全是红眼。按“下一代”，让子一代相互交配', next: 'a' }
    if (!sorted) return { hint: '子二代又出现了白眼。按“数一数”，按眼色和性别分开', next: 'b' }
    return { hint: '白眼的全是雄蝇。按“看图解”', next: 'c' }
  })()
  const at = part === 'cb' ? 'screen' : board ? 'board' : 'pad'
  const counted = gen === 2 && sorted && !sorting
  const set: BenchSet = {
    vials: gen === 0 ? [RF, WM] : [RF, RM], vialNames: gen === 0 ? ['亲代 ♀ 红眼', '亲代 ♂ 白眼'] : ['子一代 ♀', '子一代 ♂'],
    flies: gen === 0 ? P_FLIES : gen === 1 ? f1 : f2, e: gen === 2 ? se : 0,
    loupe: gen === 2 ? [{ o: RF, name: '红眼 ♀' }, { o: RM, name: '红眼 ♂' }, { o: WM, name: '白眼 ♂' }] : gen === 1 ? [{ o: RF, name: '子一代 ♀ 红眼' }, { o: RM, name: '子一代 ♂ 红眼' }] : [{ o: RF, name: '亲代 ♀ 红眼' }, { o: WM, name: '亲代 ♂ 白眼' }],
    card: p => {
      p.text('杂交记录', -7, 3.4, 1.05, INK.black, 'left', 700)
      p.rich([['P   红眼♀ X', ''], ['W', 'sup'], ['X', ''], ['W', 'sup'], [' × 白眼♂ X', ''], ['w', 'sup'], ['Y', '']], -7, 1.9, 0.9, INK.black, 'left')
      if (gen >= 1) p.rich([['F', ''], ['1', 'sub'], ['  全是红眼', '']], -7, 0.5, 0.9, INK.black, 'left')
      if (gen >= 2) p.rich([['F', ''], ['2', 'sub'], [counted ? `  红眼 ${TALLY.red} ∶ 白眼 ${TALLY.white}` : '  红眼、白眼都有', '']], -7, -0.9, 0.9, INK.black, 'left')
      if (counted) p.text('白眼全是雄蝇', 6.8, -2.6, 1.05, INK.red, 'right', 700)
    },
    cardDeps: [gen, counted],
  }
  const labels: Label[] = at === 'pad' ? benchLabels(set) : []
  if (at === 'pad' && gen === 2 && sorted && !sorting) GROUPS.forEach((n, g) => labels.push({ id: `c${g}`, at: groupTag(g, 3).at, ax: groupTag(g, 3).ax, className: `scene-tag ${g === 2 ? 'key ' : ''}${groupTag(g, 3).cls}`, children: <><small>{n}</small>{COUNT[g]} 只</> }))
  if (at === 'board') {
    const tag = 'scene-tag !px-1.5 !py-0 -translate-y-full'
    labels.push({ id: 'w1', at: onBoard(-106, 21), ax: 0.5, className: tag, children: <>X<sup>W</sup></> }, { id: 'w2', at: onBoard(-94, 21), ax: 0.5, className: tag, children: <>X<sup>w</sup></> }, { id: 'w3', at: onBoard(-58, 21), ax: 0.5, className: tag, children: <>X<sup>W</sup></> }, { id: 'y', at: onBoard(-46, 13), ax: 0.5, className: tag, children: 'Y' })
  }
  const btnA = part === 'cb' ? '换一种婚配' : '下一代'
  return (
    <LabShell title="减数分裂和遗传规律" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={part === 'cb' ? '遗传图解' : '杂交实验'}
      stage={<Room at={at} labels={labels}>
        <BenchView key={gen} s={set} />
        <BoardInk draw={p => drawBoard(p, board)} deps={[board]} />
        <ScreenInk draw={p => drawScreen(p, cb, show)} deps={[cb, show]} />
        {/* 子一代雌蝇：一条 Xᵂ（来自母本，橙红）、一条 Xʷ（来自父本，蓝）；雄蝇：Xᵂ 和 Y */}
        <Magnet pair={0} who={0} at={[-106, 10]} scale={1.25} />
        <Magnet pair={0} who={1} at={[-94, 10]} scale={1.25} />
        <Magnet pair={0} who={0} at={[-58, 10]} scale={1.25} />
        <Magnet pair={1} who={1} at={[-46, 6]} scale={1.25} gene={false} />
      </Room>}
      lesson={<LessonBlock no="7" title="伴性遗传" concept="基因在 X 染色体上，遗传和性别相关联" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>摩尔根在一群红眼果蝇中发现了一只白眼雄蝇。让它和红眼雌蝇交配，子一代全是红眼；子一代雌雄交配，子二代红眼和白眼之比是 3∶1，但白眼的全是雄性。</p>
          <p className="mt-2">他假设控制白眼的基因 w 在 X 染色体上，而 Y 染色体上不含有它的等位基因，就能解释这个结果；后来又用测交等方法验证了假设，证明了<b className="text-white">基因在染色体上</b>。</p>
          <p className="mt-2">位于性染色体上的基因控制的性状，在遗传上总是和性别相关联，叫<b className="text-white">伴性遗传</b>。人的红绿色盲是伴 X 染色体隐性遗传：男性患者多于女性；女性患者的父亲和儿子一定是患者。</p>
        </>} />}
      finale={T.finale && <Finale kicker="伴性遗传" title="白眼只在雄蝇，色盲男多于女" text={`白眼基因 w 在 X 染色体上，雄蝇只有一条 X，有 w 就是白眼；雌蝇要两条 X 都是 w 才白眼。子二代红眼∶白眼 = ${F2T.red}∶${F2T.white}，白眼全是雄蝇。红绿色盲也一样：携带者女性和正常男性的儿子 ${fstr(ODDS.carrier.son)} 色盲；色盲女性的儿子全是色盲。`} notes="麻醉板上的子二代是按 1∶1∶1∶1 的机会抽出来的一批；雌蝇腹部尖、条纹分开，雄蝇腹部末端圆而黑。白板上的 X、Y 染色体只表示有没有这个基因，没有按真实形状画。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          {part === 'fly' ? <>
            <div className="grid grid-cols-3 gap-2">{GROUPS.map((g, i) => <ParamTile key={g} symbol={g.replace('蝇', '')} value={gen === 2 && sorted && !sorting ? String(COUNT[i]) : '—'} unit="只" />)}</div>
            <H>杂交过程</H>
            <div className="flex flex-col gap-1.5">
              <Row name="亲代" text={<>红眼♀ X<sup>W</sup>X<sup>W</sup> × 白眼♂ X<sup>w</sup>Y</>} seen />
              <Row name="子一代" text={gen >= 1 ? '全是红眼' : '—'} seen={gen >= 1} />
              <Row name="子二代" text={gen >= 2 ? (sorted && !sorting ? `红眼 ${TALLY.red} · 白眼 ${TALLY.white}（全是♂）` : '红眼、白眼都有') : '—'} seen={gen >= 2} on={gen >= 2} />
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">W：红眼（显性），w：白眼（隐性），都在 X 染色体上。</p>
          </> : <>
            <div className="grid grid-cols-2 gap-2">
              <ParamTile symbol="儿子色盲" value={show ? fstr(ODDS[cb].son) : '—'} unit="的可能" />
              <ParamTile symbol="女儿携带者" value={show ? fstr(ODDS[cb].carrier) : '—'} unit="的可能" />
            </div>
            <H>两种婚配</H>
            <div className="flex flex-col gap-1.5">
              {(Object.keys(COLORBLIND) as CbKey[]).map(k => <Row key={k} name={k === 'carrier' ? '携带者女' : '色盲女'} text={shown.includes(k) ? `儿子色盲 ${fstr(ODDS[k].son)} · 女儿携带者 ${fstr(ODDS[k].carrier)}` : `${COLORBLIND[k].name}`} seen={shown.includes(k)} on={cb === k} />)}
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">B：正常（显性），b：色盲（隐性），都在 X 染色体上。</p>
          </>}
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'a'} onClick={() => (part === 'cb' ? setCb(c => (c === 'carrier' ? 'affected' : 'carrier')) : (setGen(g => g + 1), setSorted(false)))} disabled={part === 'fly' && (gen >= 2 || sorting)}>{btnA}</LabButton>
        <LabButton primary pulse={next === 'b'} onClick={() => setSorted(true)} disabled={part === 'cb' || gen !== 2 || sorted}>数一数</LabButton>
        <LabButton pulse={next === 'c'} onClick={() => (part === 'cb' ? setShown(s => (s.includes(cb) ? s : [...s, cb])) : setBoard(true))} disabled={part === 'cb' ? show : (gen !== 2 || !sorted || sorting || board)}>看图解</LabButton>
      </>}
      extras={
        <Control label="看哪一种">
          <Segmented label="看哪一种" pulse={next === 'part'} want={next === 'part' ? 'cb' : null} value={part} onChange={v => setPart(v as Part)} options={[{ value: 'fly', label: '果蝇的眼色' }, { value: 'cb', label: '红绿色盲' }]} />
        </Control>
      }
    />
  )
}
