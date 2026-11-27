// 减数分裂和遗传规律 · 第 5 课 分离定律：果蝇的长翅（V）和残翅（v）。长翅 × 残翅，子一代全是长翅；子一代相互交配，子二代长翅∶残翅约 3∶1；
// 白板上用磁性染色体模型看原因：减数分裂时同源染色体分离，等位基因 V、v 分别进入两个配子。最后做测交：子一代 × 残翅，约 1∶1。
import { useEffect, useState } from 'react'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { BoardInk, INK, Magnet, drawPunnett, onBoard, type Pen } from './board'
import type { FlyLook } from './bench'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BenchView, benchLabels, groupAt, groupTag, layout, useFlies, type BenchSet } from './pad'
import { ease, lerp, rng, useRun } from './parts'
import { F2_SAMPLE, MENDEL_F2, TEST_SAMPLE, countWing, dominant, gametesOf, phenoRatio, punnett, ratioStr, tally, wingOf } from './physics'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

type Mode = 'self' | 'test'
const F1 = Array.from({ length: 16 }, () => 'Vv')
const LONG_F: FlyLook = { eye: 'red', body: 'gray', wing: 'long', sex: 'f' }, LONG_M: FlyLook = { ...LONG_F, sex: 'm' }, VEST_F: FlyLook = { ...LONG_F, wing: 'vestigial' }, VEST_M: FlyLook = { ...VEST_F, sex: 'm' }
/** 亲代：3 只长翅雌蝇、3 只残翅雄蝇，麻醉后放在板上 */
const P_FLIES = layout([0, 1, 2, 3, 4, 5].map(i => ({ o: i < 3 ? LONG_F : VEST_M, group: i < 3 ? 0 : 1 })), 2, 4)
const F2C = countWing(F2_SAMPLE), TC = countWing(TEST_SAMPLE)
const F2P = punnett('Vv', 'Vv'), TP = punnett('Vv', 'vv'), F2T = tally(F2P)
const [F2D, F2R] = phenoRatio(F2P), [TD, TR] = phenoRatio(TP)
const sexOf = (seed: number) => { const r = rng(seed); return () => (r() < 0.5 ? 'f' : 'm') as 'f' | 'm' }
const look = (sx: () => 'f' | 'm') => (g: string): FlyLook => ({ eye: 'red', body: 'gray', wing: dominant(g) ? 'long' : 'vestigial', sex: sx() })
const TASKS: Task[] = [
  { id: 'f1', text: '让长翅果蝇和残翅果蝇杂交，看子一代', note: '子一代全是长翅：长翅是显性性状' },
  { id: 'f2', text: '让子一代相互交配，数一数子二代', note: `长翅 ${F2C.long} 只、残翅 ${F2C.short} 只，约 ${F2D}∶${F2R}` },
  { id: 'why', text: '在白板上看 3∶1 是怎么来的', note: `V、v 随同源染色体分离；子二代 VV∶Vv∶vv = ${F2T.VV}∶${F2T.Vv}∶${F2T.vv}` },
  { id: 'test', text: '做测交：子一代 × 残翅，数一数后代', note: `长翅 ${TC.long} 只、残翅 ${TC.short} 只，约 ${TD}∶${TR}` },
]

function drawBoard(p: Pen, mode: Mode, sep: number, show: boolean) {
  p.text('分离定律', -122, 56, 8.5, INK.black, 'left', 700)
  // 左边：子一代 Vv 的一个精原细胞，同源染色体分离，V、v 进入不同的配子
  p.text('子一代 Vv 形成配子', -82, 42, 6, INK.blue)
  p.circle(-82, 12, 23, INK.green, 0.6)
  p.arrow(-92, -13, -103, -24, INK.black, 0.5); p.arrow(-72, -13, -61, -24, INK.black, 0.5)
  for (const [x, t] of [[-108, 'V'], [-56, 'v']] as [number, string][]) {
    p.circle(x, -40, 13, INK.green, 0.55, undefined, sep >= 1 ? undefined : [1.6, 1.2])
    if (sep >= 1) p.text(`配子 ${t}  1/2`, x, -59, 5.6, t === 'V' ? INK.mom : INK.dad, 'center', 700)
  }
  // 右边：遗传图解
  p.rich([['P   长翅 VV × 残翅 vv', '']], -22, 46, 6.2, INK.black, 'left')
  p.rich([['F', ''], ['1', 'sub'], ['   长翅 Vv', '']], -22, 34, 6.2, INK.black, 'left')
  const fill = (g: string) => (dominant(g) ? 'rgba(53,170,120,0.22)' : 'rgba(240,170,60,0.3)')
  if (mode === 'self') {
    p.rich([['F', ''], ['1', 'sub'], [' × F', ''], ['1', 'sub']], 62, 56, 6.2, INK.black, 'left')
    drawPunnett(p, 56, 46, gametesOf('Vv'), gametesOf('Vv'), F2P, 30, 21, fill, wingOf, show, 6.6)
    if (show) {
      p.rich([['F', ''], ['2', 'sub'], [`   VV∶Vv∶vv = ${F2T.VV}∶${F2T.Vv}∶${F2T.vv}`, '']], -22, 10, 6.2, INK.black, 'left')
      p.text(`长翅∶残翅 = ${F2D}∶${F2R}`, -22, -4, 7, INK.red, 'left', 700)
    }
  } else {
    p.text('测交  Vv × vv', 62, 56, 6.2, INK.black, 'left')
    drawPunnett(p, 56, 46, gametesOf('Vv'), gametesOf('vv'), TP, 30, 21, fill, wingOf, show, 6.6)
    if (show) p.text(`长翅∶残翅 = ${TD}∶${TR}`, -22, -4, 7, INK.red, 'left', 700)
  }
}

export default function Lesson5() {
  const [mode, setMode] = useState<Mode>('self')
  const [gen, setGen] = useState(0)
  const [sorted, setSorted] = useState(false)
  const [board, setBoard] = useState(false)
  const [seenBoard, setSeenBoard] = useState<Mode[]>([])
  const T = useTasks('gewu:meiosis:5', TASKS)
  const se = useRun(sorted ? 1 : 0, 2.6), sep = useRun(board ? 1 : 0, 2.2)
  const sorting = sorted && se < 1, separating = board && sep < 1
  const sample = mode === 'self' ? F2_SAMPLE : TEST_SAMPLE
  const f1 = useFlies(F1, look(sexOf(5)), () => 0, 1, 5)
  const f2 = useFlies(sample, look(sexOf(mode === 'self' ? 6 : 8)), g => (dominant(g) ? 0 : 1), 2, mode === 'self' ? 6 : 8)
  const cnt = mode === 'self' ? F2C : TC
  useEffect(() => {
    if (sorting || separating) return
    T.check(id => (id === 'f1' && gen >= 1 && mode === 'self') || (id === 'f2' && mode === 'self' && sorted) || (id === 'why' && seenBoard.includes('self')) || (id === 'test' && seenBoard.includes('test')))
  }, [gen, sorted, sorting, separating, seenBoard, mode])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (board && !separating) setSeenBoard(s => (s.includes(mode) ? s : [...s, mode])) }, [board, separating, mode])
  const resetAll = () => { setMode('self'); setGen(0); setSorted(false); setBoard(false); setSeenBoard([]); T.reset() }
  const pick = (m: Mode) => { setMode(m); setGen(m === 'test' ? 1 : 0); setSorted(false); setBoard(false) }
  const nextGen = () => { setGen(g => g + 1); setSorted(false); setBoard(false) }
  const task = T.current
  const { hint, next }: { hint: string; next: 'gen' | 'count' | 'board' | 'mode' | null } = (() => {
    if (!task) return { hint: '分离定律：成对的遗传因子彼此分离，分别进入不同的配子。', next: null }
    if (sorting) return { hint: '用毛笔把长翅和残翅拨开…', next: null }
    if (separating) return { hint: '同源染色体分离，V 和 v 进入不同的配子…', next: null }
    if (task.id === 'test' && mode !== 'test') return { hint: '在“杂交方式”里选“测交”', next: 'mode' }
    if (mode === 'self') {
      if (gen === 0) return { hint: '麻醉板上是亲代：长翅雌蝇和残翅雄蝇。按“下一代”，看它们的子一代', next: 'gen' }
      if (gen === 1) return { hint: '子一代全是长翅。按“下一代”，让子一代相互交配', next: 'gen' }
      if (!sorted) return { hint: '子二代有长翅也有残翅。按“数一数”', next: 'count' }
      return { hint: `长翅 ${cnt.long} 只，残翅 ${cnt.short} 只。按“看图解”`, next: 'board' }
    }
    if (gen === 1) return { hint: '让子一代和残翅果蝇交配。按“下一代”', next: 'gen' }
    if (!sorted) return { hint: '测交的后代也有长翅和残翅。按“数一数”', next: 'count' }
    return { hint: `长翅 ${cnt.long} 只，残翅 ${cnt.short} 只。按“看图解”`, next: 'board' }
  })()

  const at = board ? 'board' : 'pad'
  const counted = gen === 2 && sorted && !sorting
  const set: BenchSet = {
    vials: mode === 'test' ? [LONG_F, VEST_M] : gen === 0 ? [LONG_F, VEST_M] : [LONG_F, LONG_M],
    vialNames: mode === 'test' ? ['子一代 ♀ 长翅', '残翅 ♂'] : gen === 0 ? ['亲代 ♀ 长翅', '亲代 ♂ 残翅'] : ['子一代 ♀', '子一代 ♂'],
    flies: gen === 0 || (gen === 1 && mode === 'test') ? P_FLIES : gen === 1 ? f1 : f2, e: gen === 2 ? se : 0,
    loupe: gen === 2 ? [{ o: LONG_F, name: '长翅 ♀' }, { o: LONG_M, name: '长翅 ♂' }, { o: VEST_F, name: '残翅 ♀' }, { o: VEST_M, name: '残翅 ♂' }]
      : gen === 1 && mode === 'self' ? [{ o: LONG_F, name: '子一代 ♀ 长翅' }, { o: LONG_M, name: '子一代 ♂ 长翅' }] : [{ o: LONG_F, name: mode === 'test' ? '子一代 ♀ 长翅' : '亲代 ♀ 长翅' }, { o: VEST_M, name: mode === 'test' ? '残翅 ♂' : '亲代 ♂ 残翅' }],
    card: p => {
      p.text('杂交记录', -7, 3.4, 1.05, INK.black, 'left', 700)
      if (mode === 'self') {
        p.text('P   长翅 VV × 残翅 vv', -7, 1.9, 0.95, INK.black, 'left')
        if (gen >= 1) p.rich([['F', ''], ['1', 'sub'], ['  全是长翅 Vv', '']], -7, 0.5, 0.95, INK.black, 'left')
        if (gen >= 2) p.rich([['F', ''], ['2', 'sub'], [counted ? `  长翅 ${F2C.long} ∶ 残翅 ${F2C.short}` : '  长翅、残翅都有', '']], -7, -0.9, 0.95, INK.black, 'left')
        if (counted) p.text(`≈ ${F2D}∶${F2R}`, 6.8, -2.6, 1.2, INK.red, 'right', 700)
      } else {
        p.text('测交  Vv × vv', -7, 1.9, 0.95, INK.black, 'left')
        if (gen >= 2) p.text(counted ? `后代  长翅 ${TC.long} ∶ 残翅 ${TC.short}` : '后代  长翅、残翅都有', -7, 0.5, 0.95, INK.black, 'left')
        if (counted) p.text(`≈ ${TD}∶${TR}`, 6.8, -2.6, 1.2, INK.red, 'right', 700)
      }
    },
    cardDeps: [mode, gen, counted],
  }
  const labels: Label[] = at === 'pad' ? benchLabels(set) : []
  if (at === 'pad' && gen === 2 && sorted && !sorting) [0, 1].forEach(g => labels.push({ id: `c${g}`, at: groupTag(g, 2).at, ax: groupTag(g, 2).ax, className: `scene-tag key ${groupTag(g, 2).cls}`, children: <><small>{g ? '残翅' : '长翅'}</small>{g ? cnt.short : cnt.long} 只</> }))
  if (at === 'board') {
    const k = ease(sep)
    labels.push({ id: 'mV', at: onBoard(lerp(-88, -108, k) + 6, lerp(19, -33, k)), ax: 0, className: 'scene-tag !px-1.5 !py-0 -translate-y-1/2', children: 'V' })
    labels.push({ id: 'mv', at: onBoard(lerp(-76, -56, k) + 6, lerp(19, -33, k)), ax: 0, className: 'scene-tag !px-1.5 !py-0 -translate-y-1/2', children: 'v' })
  }
  const k = ease(sep)
  return (
    <LabShell title="减数分裂和遗传规律" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="杂交实验"
      stage={<Room at={at} labels={labels}>
        <BenchView key={`${mode}${gen}`} s={set} />
        <BoardInk draw={p => drawBoard(p, mode, sep, board && sep >= 1)} deps={[mode, sep >= 1, board]} />
        {/* 磁性染色体：V 在来自长翅亲本的那条上（橙红），v 在来自残翅亲本的那条上（蓝） */}
        <Magnet pair={0} who={0} at={[lerp(-88, -108, k), lerp(12, -40, k)]} scale={lerp(2, 1.3, k)} />
        <Magnet pair={0} who={1} at={[lerp(-76, -56, k), lerp(12, -40, k)]} scale={lerp(2, 1.3, k)} />
      </Room>}
      lesson={<LessonBlock no="5" title="分离定律" concept="等位基因随同源染色体分离而分离" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>孟德尔用纯种高茎豌豆和矮茎豌豆杂交，子一代都是高茎；子一代自交，子二代高茎 {MENDEL_F2.tall} 株、矮茎 {MENDEL_F2.short} 株，约 3∶1。果蝇的长翅和残翅也一样。</p>
          <p className="mt-2"><b className="text-white">分离定律</b>：在生物的体细胞中，控制同一性状的遗传因子成对存在，不相融合；在形成配子时，成对的遗传因子发生分离，分离后的遗传因子分别进入不同的配子中，随配子遗传给后代。</p>
          <p className="mt-2">细胞学基础：等位基因位于一对同源染色体上，减数分裂时随同源染色体的分开而分离。<b className="text-white">测交</b>是让子一代与隐性纯合子杂交，后代的比例反映子一代产生的配子种类和比例。</p>
        </>} />}
      finale={T.finale && <Finale kicker="分离定律" title={`子二代约 ${F2D}∶${F2R}，测交约 ${TD}∶${TR}`} text={`子一代 Vv 形成配子时，V 和 v 随同源染色体分离，产生 V、v 两种配子，各占一半。雌雄配子随机结合，子二代 VV∶Vv∶vv = ${F2T.VV}∶${F2T.Vv}∶${F2T.vv}，长翅∶残翅 = ${F2D}∶${F2R}。数出来的 ${F2C.long}∶${F2C.short}（${ratioStr(F2C.long, F2C.short)}∶1）只是接近 3∶1，只数越多越接近。`} notes="麻醉板上的果蝇是按 3∶1、1∶1 的机会抽出来的一批，每次打开都一样；白板上的染色体画成没有复制的单条。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="长翅" value={gen === 2 && sorted && !sorting ? String(cnt.long) : '—'} unit="只" />
            <ParamTile symbol="残翅" value={gen === 2 && sorted && !sorting ? String(cnt.short) : '—'} unit="只" />
          </div>
          <div className="mt-2 rounded-xl bg-white/6 px-3 py-2 text-center text-[14px] text-white/70">长翅 ÷ 残翅 = <b className="text-[20px] text-white tabular-nums">{gen === 2 && sorted && !sorting ? ratioStr(cnt.long, cnt.short) : '—'}</b></div>
          <H>{mode === 'self' ? '杂交过程' : '测交'}</H>
          <div className="flex flex-col gap-1.5">
            {mode === 'self' ? <>
              <Row name="亲代" text="长翅 VV × 残翅 vv" seen />
              <Row name="子一代" text={gen >= 1 ? '全是长翅 Vv' : '—'} seen={gen >= 1} />
              <Row name="子二代" text={gen >= 2 ? (sorted && !sorting ? `长翅 ${cnt.long} · 残翅 ${cnt.short}` : '长翅、残翅都有') : '—'} seen={gen >= 2} on={gen >= 2} />
            </> : <>
              <Row name="测交" text="子一代 Vv × 残翅 vv" seen />
              <Row name="后代" text={gen >= 2 ? (sorted && !sorting ? `长翅 ${cnt.long} · 残翅 ${cnt.short}` : '长翅、残翅都有') : '—'} seen={gen >= 2} on={gen >= 2} />
            </>}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">V：长翅（显性），v：残翅（隐性）。</p>
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'gen'} onClick={nextGen} disabled={gen >= 2 || sorting}>下一代</LabButton>
        <LabButton primary pulse={next === 'count'} onClick={() => setSorted(true)} disabled={gen !== 2 || sorted}>数一数</LabButton>
        <LabButton pulse={next === 'board'} onClick={() => setBoard(true)} disabled={gen !== 2 || !sorted || sorting || board}>看图解</LabButton>
      </>}
      extras={
        <Control label="杂交方式">
          <Segmented label="杂交方式" pulse={next === 'mode'} want={task?.id === 'test' ? 'test' : null} value={mode} onChange={v => pick(v as Mode)} options={[{ value: 'self', label: '子一代相互交配' }, { value: 'test', label: '测交' }]} />
        </Control>
      }
    />
  )
}
