// 从石油到塑料 · 第 7 课 加聚反应。聚乙烯反应器旁边的放大窗里，一排乙烯分子的双键依次打开，连成一条长链；
// 标出链节、换聚合度算相对分子质量；最后开造粒线，熔融的聚乙烯切成白色的颗粒落进料仓。
import { useMemo, useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow } from './flow'
import { MONOMERS, polyFrame } from './frames'
import { LESSONS, goLesson } from './lessons'
import { Lens, Mol, lensPoint, type LensSpec } from './mol'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { DEGREES, UNIT_MASS, polymerMass } from './physics'
import { PE, PELLET_FALL, PE_FEED, PE_OUT } from './poly'
import { VOICE } from './voice'
import { Place, spot } from './world'

const TASKS: Task[] = [
  { id: 'poly', text: '开始聚合', note: '双键打开，乙烯分子一个接一个连成长链：加聚反应' },
  { id: 'unit', text: '在链上标出链节', note: '重复的最小单元 —CH₂—CH₂— 叫链节；它来自单体 CH₂=CH₂' },
  { id: 'n', text: '把聚合度换成 5000，读相对分子质量', note: `28 × 5000 = ${polymerMass(5000).toLocaleString('en-US')}：高分子的相对分子质量能到几万、几十万` },
  { id: 'pellet', text: '开造粒机', note: '熔融的聚乙烯从模头挤出，在水里切成颗粒，甩干后落进料仓' },
]
const VIEW: [number, number] = [-0.24, 0.14]
const SPOT_R = spot(PE.x - 3.4, 13.4, PE.z, 24, 28, VIEW, false, [140, 1000])
const SPOT_P = spot(129.6, 2.9, -3, 19.5, 8, [-0.2, 0.2], false, [140, 1000])
const LENS: LensSpec = { at: [PE.x - 11.2, 15.5, PE.z + 4], R: 5.6, rotY: VIEW[0] }
const UA = LENS.R * 1.84 / 17.4
const FRAMES = Array.from({ length: MONOMERS }, (_, j) => polyFrame(j))
const fmt = (v: number) => v.toLocaleString('en-US')

export default function Lesson7() {
  const T = useTasks('gewu:petro:7', TASKS)
  const [marked, setMarked] = useState(false)
  const [deg, setDeg] = useState<number>(1000)
  const poly = useRun(7, () => T.check(id => id === 'poly'))
  const pel = useRun(8, () => T.check(id => id === 'pellet'))
  const linked = poly.k >= 1, busy = poly.busy || pel.busy
  const mark = () => { if (!linked || busy) return; setMarked(true); T.check(id => id === 'unit') }
  const pick = (v: number) => { setDeg(v); if (linked && marked && v === 5000) T.check(id => id === 'n') }
  const resetAll = () => { setMarked(false); setDeg(1000); poly.snap(0); pel.snap(0); T.reset() }

  const task = T.current?.id
  const next: 'poly' | 'unit' | 'seg' | 'pellet' | null = !task || busy ? null : task === 'poly' ? 'poly' : task === 'unit' ? 'unit' : task === 'n' ? 'seg' : 'pellet'
  const hint = !task ? '乙烯的双键打开，一个个连成长链：这就是加聚反应。'
    : poly.busy ? '看放大窗：乙烯的双键一个个打开，接到链的末端'
    : pel.busy ? '机筒把聚乙烯熔化、推向模头，切下来的颗粒落进料仓…'
    : task === 'poly' ? '往反应器里通乙烯，加入催化剂，开始聚合' : task === 'unit' ? '链连好了。在链上标出链节' : task === 'n' ? '把聚合度换成 5000，看相对分子质量' : '开造粒机'

  const s = poly.k * (MONOMERS - 1), j = Math.min(MONOMERS - 2, Math.floor(s)), f = linked ? 1 : s - j
  const fk = Math.max(0, Math.min(1, (f - 0.15) / 0.7))
  const tint = useMemo(() => marked ? Object.fromEntries(['m2a', 'm2b'].flatMap(id => [[id, '#35c7b3'], [id + 'h1', '#9fe6da'], [id + 'h2', '#9fe6da']])) : undefined, [marked])
  const atPellet = pel.busy || pel.k >= 1
  const paths = useMemo(() => ({ feed: [PE_FEED], out: [PE_OUT], fall: [PELLET_FALL] }), [])
  const labels: Label[] = atPellet ? [
    { id: 'ex', at: [126.3, 2.5, PE.line.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '挤出机（机筒外面是加热圈）' },
    { id: 'die', at: [PE.line.die + 0.4, 2.5, PE.line.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '水下切粒' },
    { id: 'dry', at: [PE.line.dryer, 4.3, PE.line.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '离心干燥器' },
    { id: 'scr', at: [PE.line.screen, 2.4, PE.line.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '振动筛' },
    { id: 'bin', at: [PE.bin.x, 3.4, PE.bin.z], ax: 0.7, className: 'scene-tag key -translate-y-full', children: <><small>聚乙烯颗粒</small>相对分子质量约 {fmt(polymerMass(deg))}</> },
  ] : [
    { id: 'lens', at: [LENS.at[0], LENS.at[1] + LENS.R + 0.3, LENS.at[2]], ax: 0.5, className: `scene-tag ${linked ? 'key' : ''} -translate-y-full`, children: linked ? <><small>聚乙烯</small>—[CH₂—CH₂]—ₙ</> : <><small>单体</small>乙烯 CH₂=CH₂</> },
    ...(marked ? [{ id: 'unit', at: lensPoint(LENS, -1.9, -2.3, UA), ax: 0.5, className: 'scene-tag', children: <><small>链节</small>—CH₂—CH₂—</> } as Label] : []),
    { id: 'n', at: [LENS.at[0], LENS.at[1] - LENS.R - 0.3, LENS.at[2]], ax: 0.5, className: 'scene-tag', style: { opacity: linked ? 1 : 0, transition: 'opacity .5s' }, children: <><small>聚合度 n = {fmt(deg)}</small>相对分子质量 {fmt(polymerMass(deg))}</> },
    { id: 'rx', at: [PE.x + 3.9, 20.8, PE.z + 3.4], ax: 0, name: true, className: 'scene-name', children: '聚合反应器（流化床）' },
  ]
  return (
    <LabShell title="从石油到塑料" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="聚乙烯装置"
      stage={<Place at={atPellet ? SPOT_P : SPOT_R} labels={labels} poly={poly.busy || linked ? 1 : 0} pellet={pel.k}>
        {!atPellet && <Lens spec={LENS} point={[PE.x - 1.3, 11, PE.z + 0.8]}><group position-y={-0.6 * UA}><Mol a={FRAMES[j]} b={FRAMES[j + 1]} k={fk} u={UA} tint={tint} /></group></Lens>}
        <Flow paths={paths.feed} density={1.6} speed={3} size={0.17} on={poly.busy ? 1 : 0} color={() => '#ffe27a'} />
        <Flow paths={paths.out} density={1.6} speed={2.6} size={0.18} on={pel.busy ? 1 : 0} color={() => '#f4f2ea'} />
        <Flow paths={paths.fall} density={9} speed={1.6} size={0.045} jitter={0.05} glow={false} on={pel.busy && pel.k > 0.12 ? 1 : 0} color={() => '#f4f2ea'} />
      </Place>}
      lesson={<LessonBlock no="7" title="加聚反应" concept="双键打开，小分子连成长链" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>在一定条件下，乙烯分子里碳碳双键中的一根键断开，分子之间通过碳原子一个接一个连起来，生成相对分子质量很大的聚乙烯：<span className="font-formula">n CH₂=CH₂ → —[CH₂—CH₂]—ₙ</span>。这样的反应叫<b className="text-white">加成聚合反应</b>，简称加聚反应。</p>
          <p className="mt-3">能合成高分子的小分子叫<b className="text-white">单体</b>（这里是乙烯）；高分子里重复的结构单元叫<b className="text-white">链节</b>（—CH₂—CH₂—）；链节的数目 n 叫<b className="text-white">聚合度</b>。聚乙烯的相对分子质量是 {UNIT_MASS}n。</p>
          <p className="mt-3">同一批聚乙烯里各条链的 n 并不一样，所以高分子材料是混合物，说的相对分子质量是平均值。</p>
          <p className="mt-3">聚乙烯是线型高分子，受热会熔化，可以挤出、切成颗粒，再去吹膜、注塑。放大窗里只画了 {MONOMERS} 个单体。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">乙烯的双键打开，连成聚乙烯的长链</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">单体是 CH₂=CH₂，链节是 —CH₂—CH₂—，聚合度是 n，相对分子质量是 {UNIT_MASS}n。n 取 5000 时是 {fmt(polymerMass(5000))}。聚乙烯里已经没有双键了。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="font-formula text-[17px] text-white/70">M = {UNIT_MASS} n</div>
          <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{linked ? fmt(polymerMass(deg)) : '—'}</div>
          <div className="mt-1 text-[13px] text-white/55">聚乙烯的相对分子质量</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ParamTile symbol="n" value={fmt(deg)} unit="聚合度" />
          <ParamTile symbol="链节" value={String(UNIT_MASS)} unit="—CH₂—CH₂— 的式量" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">三个名词</h2>
        <div className="mt-2 space-y-1.5 text-[14px]">
          <div className="flex justify-between rounded-lg bg-white/[0.06] px-3 py-2"><span className="text-white/65">单体</span><span className="font-formula">CH₂=CH₂</span></div>
          <div className={`flex justify-between rounded-lg px-3 py-2 ${marked ? 'bg-[#35c7b3]/20' : 'bg-white/[0.06]'}`}><span className="text-white/65">链节</span><span className="font-formula">{marked ? '—CH₂—CH₂—' : '—'}</span></div>
          <div className="flex justify-between rounded-lg bg-white/[0.06] px-3 py-2"><span className="text-white/65">聚合度</span><span className="font-formula">n</span></div>
        </div>
        <p className="mt-3 text-[12.5px] text-white/50">已经连上 {linked ? MONOMERS : Math.min(MONOMERS, poly.k > 0 ? j + 1 + (fk >= 1 ? 1 : 0) : 0)} 个单体（放大窗里只画了 {MONOMERS} 个）</p>
      </Panel>}
      actions={<>
        <LabButton primary={next === 'poly'} pulse={next === 'poly'} disabled={busy || linked} onClick={() => poly.run()}>开始聚合</LabButton>
        <LabButton primary={next === 'unit'} pulse={next === 'unit'} disabled={busy || !linked || marked} onClick={mark}>标出链节</LabButton>
        <LabButton primary={next === 'pellet'} pulse={next === 'pellet'} disabled={busy || !linked || pel.k >= 1} onClick={() => pel.run()}>开造粒机</LabButton>
      </>}
      extras={
        <Control label="聚合度 n">
          <Segmented label="聚合度 n" pulse={next === 'seg'} want={task === 'n' ? '5000' : null} disabled={busy} value={String(deg)} onChange={v => pick(+v)} options={DEGREES.map(d => ({ value: String(d), label: fmt(d) }))} />
        </Control>
      }
    />
  )
}
