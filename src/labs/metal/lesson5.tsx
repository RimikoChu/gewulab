// 金属和炼铁 · 第 5 课 金属活动性顺序：化验台第 5 格，后墙挂着一张空的金属活动性顺序表，表下一条木搁板；台上摆着前几课用过的五种金属样块。
// 按“排进顺序表”，样块按前三课的结果一个个放到表下对应的位置（氢的两边），表上写出它们的名字，最后整行补齐。
// 再用这张表判断三个反应能不能发生：选“能”或“不能”，按“判断”。判断以后画面上画一支箭头，从金属指向要被置换的那一格。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, Metal, useTasks, type Label } from '@/lab-kit'
import { METAL_LOOK } from './gear'
import { orderChart, symTag } from './mats'
import { LESSONS, goLesson } from './lessons'
import { liftPath, seg, useRun, type P3 } from './parts'
import { JUDGE, NAME, ORDER, SAMPLES, judge, rank, sorted, type Sym } from './physics'
import { HALL, M, ST, TOP, Place, spot, type V3 } from './world'

const X0 = ST.l5, Y = TOP
const CH = { w: 1.2, h: 0.42, y: 0.585, z: HALL.z0 + 0.04 }          // 挂图：宽、高、中心离台面多高（m）、贴在后墙上
const LEDGE = { y: 0.285, z: -16.85, d: 0.17 }                       // 挂图下面的木搁板（y 离台面 m，z 画面单位）
const colX = (s: Sym) => X0 + (-CH.w / 2 + (rank(s) + 0.5) * CH.w / ORDER.length * 0.94 + CH.w * 0.03) * M
const BLOCK = 0.09
const VIEW = spot(X0, Y + 0.44 * M, -16.6, 7.4, 4.5, [0, 0.05], true)
const homeAt = (i: number): P3 => [X0 + (-0.32 + i * 0.16) * M, Y, -16.3]
const SORT_SEC = 1.3, SORT = sorted(SAMPLES)
type Ans = 'yes' | 'no' | ''
const TASKS: Task[] = [
  { id: 'sort', text: '把五种金属排进顺序表', note: '镁、锌、铁排在氢前面，铜、银排在氢后面' },
  { id: 'zn', text: '判断：锌能和硫酸亚铁溶液反应吗', note: '能：锌排在铁前面，Zn + FeSO₄ = ZnSO₄ + Fe' },
  { id: 'ag', text: '判断：银能和稀盐酸反应吗', note: '不能：银排在氢后面，不能置换出酸中的氢' },
  { id: 'cu', text: '判断：铜能和硝酸汞溶液反应吗', note: '能：铜排在汞前面，Cu + Hg(NO₃)₂ = Cu(NO₃)₂ + Hg' },
]

/** 一块金属样块：带倒角的小方块，前面一块小铭牌 */
function Block({ s }: { s: Sym }) {
  const look = METAL_LOOK[s]
  return <group>
    <RoundedBox args={[BLOCK * M, BLOCK * M * 0.8, BLOCK * M]} radius={0.004 * M} smoothness={3} position-y={BLOCK * M * 0.4} castShadow receiveShadow><Metal kind={look.kind} rough={look.rough} grain={s === 'Fe' || s === 'Zn' ? 'cast' : 'brushed'} /></RoundedBox>
    <mesh position={[0, BLOCK * M * 0.4, BLOCK * M / 2 + 0.002]}><planeGeometry args={[BLOCK * M * 0.86, BLOCK * M * 0.43]} /><meshStandardMaterial map={symTag(s, NAME[s])} roughness={0.6} /></mesh>
  </group>
}

export default function Lesson5() {
  const T = useTasks('gewu:metal:5', TASKS)
  const sort = useRun(SORT_SEC * SORT.length + 1.6, () => T.check(id => id === 'sort'))
  const [ans, setAns] = useState<Ans>('')
  const [say, setSay] = useState<string | null>(null)
  const resetAll = () => { sort.snap(0); setAns(''); setSay(null); T.reset() }
  const task = T.current?.id
  const sorted5 = !!T.done.sort
  const qi = JUDGE.findIndex(j => j.id === task), q = qi >= 0 ? JUDGE[qi] : null
  const right: Ans = q ? (judge(q) ? 'yes' : 'no') : ''
  useEffect(() => { setAns(''); setSay(null) }, [task])
  const submit = () => {
    if (!q || !ans) return
    if (ans === right) T.check(id => id === q.id)
    else setSay(q.acid ? `再看看表：${NAME[q.metal]}排在氢的${judge(q) ? '前' : '后'}面` : `再看看表：${NAME[q.metal]}排在${NAME[q.other]}的${judge(q) ? '前' : '后'}面`)
  }

  // 样块的位置：排序时按顺序一个个飞到搁板上它那一格
  const blockAt = (s: Sym): P3 => {
    // 铁和锌在表上挨着，样块比格子宽一点，铁往前错开一排
    const i = SAMPLES.indexOf(s), j = SORT.indexOf(s), dst: P3 = [colX(s), Y + LEDGE.y * M, LEDGE.z + (s === 'Fe' ? 0.26 : -0.24)]
    if (sorted5) return dst
    if (!sort.busy) return homeAt(i)
    return liftPath(homeAt(i), dst, Y + (LEDGE.y + 0.12) * M, seg(sort.t, j * SORT_SEC, j * SORT_SEC + SORT_SEC * 0.9))
  }
  const landed = (s: Sym) => sorted5 || (sort.busy && sort.t > SORT.indexOf(s) * SORT_SEC + SORT_SEC * 0.9)
  const allIn = sorted5 || (sort.busy && sort.t > SORT.length * SORT_SEC + 0.6)
  const filled = useMemo(() => new Set<string>(allIn ? ORDER : ['H', ...SORT.filter(landed)]), [allIn, ...SORT.map(landed)])   // eslint-disable-line react-hooks/exhaustive-deps
  const chart = useMemo(() => orderChart(ORDER, NAME, filled), [filled])

  // 判断题：要比的两格各挂一个标签；判断对了，从金属那一格画一支箭头指向被置换的那一格
  const done = (id: string) => !!T.done[id]
  const lastJudged = [...JUDGE].reverse().find(j => done(j.id))
  const show = q ?? lastJudged ?? null
  const lift = (s: Sym) => show && s === show.metal && sorted5 ? 0.03 : 0
  const arrowY = Y + (LEDGE.y + 0.115) * M   // 箭头画在样块上方、挂图下沿的空白处
  const next = sort.busy ? null : !sorted5 ? 'sort' : q ? (ans !== right ? 'ans' : 'judge') : null
  const hint = !task ? '前面的金属能把后面的从它的盐溶液里置换出来；氢前面的能和酸反应放出氢气。'
    : sort.busy ? '按前几课的结果，一块一块排进去…'
    : !sorted5 ? '把前几课用过的五种金属排进顺序表'
    : say ?? `用顺序表判断：${q!.text}`

  const labels: Label[] = [
    ...(!sorted5 && !sort.busy ? SAMPLES.map((s, i) => ({ id: `h${s}`, at: [homeAt(i)[0], Y + 0.075 * M, homeAt(i)[2]] as V3, ax: 0.5, className: 'scene-name -translate-y-full', children: NAME[s] })) : []),
    ...(show && sorted5 ? [
      { id: 'qa', at: [colX(show.metal), Y + (LEDGE.y - 0.03) * M, LEDGE.z + 0.6] as V3, ax: colX(show.metal) < colX(show.other) ? 0.9 : 0.1, className: 'scene-tag key', children: <><small>金属</small>{NAME[show.metal]}</> },
      { id: 'qb', at: [colX(show.other), Y + (LEDGE.y - 0.03) * M, LEDGE.z + 0.6] as V3, ax: colX(show.metal) < colX(show.other) ? 0.1 : 0.9, className: 'scene-tag', children: <><small>{show.acid ? '酸中的' : '溶液中的'}</small>{NAME[show.other]}</> },
    ] : []),
  ]
  const judged = show && done(show.id)
  const can = show ? judge(show) : false
  const ax0 = show ? colX(show.metal) : 0, ax1 = show ? colX(show.other) : 0
  return (
    <LabShell title="金属和炼铁" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="活动性顺序"
      stage={<Place at={VIEW} labels={labels}>
        {/* 挂图：一块白色的板，四边铝框 */}
        <mesh position={[X0, Y + CH.y * M, CH.z + 0.06]}><planeGeometry args={[CH.w * M, CH.h * M]} /><meshStandardMaterial map={chart} roughness={0.7} /></mesh>
        {([[0, 1], [0, -1], [1, 0], [-1, 0]] as [number, number][]).map(([sx, sy], i) => <mesh key={i} position={[X0 + sx * CH.w * M / 2, Y + CH.y * M + sy * CH.h * M / 2, CH.z + 0.08]}><boxGeometry args={[sx ? 0.08 : CH.w * M + 0.08, sy ? 0.08 : CH.h * M + 0.08, 0.1]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
        {/* 搁板和托架 */}
        <RoundedBox args={[(CH.w + 0.06) * M, 0.012 * M, LEDGE.d * M]} radius={0.003 * M} position={[X0, Y + (LEDGE.y - 0.006) * M, LEDGE.z]} castShadow receiveShadow><meshStandardMaterial color="#b48a5a" roughness={0.6} /></RoundedBox>
        {[-0.7, 0, 0.7].map(x => <mesh key={x} position={[X0 + x * M, Y + (LEDGE.y - 0.03) * M, LEDGE.z - 0.2]}><boxGeometry args={[0.012 * M, 0.05 * M, LEDGE.d * M * 0.8]} /><Metal kind="steel" /></mesh>)}
        {SAMPLES.map(s => { const p = blockAt(s); return <group key={s} position={[p[0], p[1] + lift(s) * M, p[2]]}><Block s={s} /></group> })}
        {judged && <ForceArrow tip={[ax1 + (ax1 > ax0 ? -0.12 : 0.12), arrowY, LEDGE.z]} dir={[ax1 > ax0 ? 1 : -1, 0, 0]} len={Math.max(0.45, Math.abs(ax1 - ax0) - 0.24)} color={can ? '#35c7b3' : '#ff6b6b'} thick={0.7} />}
      </Place>}
      lesson={<LessonBlock no="5" title="金属活动性顺序" concept="前面的金属能把后面的换出来" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>常见金属在溶液中的活动性顺序：<span className="font-formula">K Ca Na Mg Al Zn Fe Sn Pb (H) Cu Hg Ag Pt Au</span>，金属活动性由强逐渐减弱。</p>
          <p className="mt-3">1. 在金属活动性顺序里，金属的位置越靠前，它的活动性就越强。<br />2. 位于<b className="text-white">氢前面</b>的金属能置换出盐酸、稀硫酸中的氢。<br />3. 位于<b className="text-white">前面</b>的金属能把位于后面的金属从它们化合物的溶液里置换出来。</p>
          <p className="mt-3 text-[13.5px] text-white/65">第 3 条里，钾、钙、钠太活泼，放进盐溶液里会先和水反应，不适用。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">前面的金属能把后面的从盐溶液里置换出来</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">五种金属排好是镁、锌、铁、铜、银，氢夹在铁和铜之间。用这张表：锌能换出铁，铜能换出汞，银不能和稀盐酸反应。</p>
      </>}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">前几课的结果</h2>
          <ul className="mt-2 flex flex-col gap-1 text-[13.5px] text-white/85">
            <li className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">镁、锌、铁和稀盐酸反应放出氢气，镁最快</li>
            <li className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">铜不和稀盐酸反应</li>
            <li className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">铁能换出铜，铜能换出银</li>
          </ul>
          {sorted5 && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">{q ? `第 ${qi + 1} 个判断` : '判断都做完了'}</h2>
            {q && <p className="mt-1.5 text-[16px] leading-relaxed font-medium">{q.text}</p>}
            <ul className="mt-3 flex flex-col gap-1 text-[13.5px]">
              {JUDGE.map(j => <li key={j.id} className={`flex justify-between rounded-lg px-2.5 py-1.5 ${j.id === task ? 'bg-white/10' : 'bg-white/[0.04]'}`}><span className="text-white/80">{j.text.replace('吗？', '')}</span><span className={done(j.id) ? (judge(j) ? 'font-semibold text-[#7fe3d4]' : 'font-semibold text-[#ffb0a8]') : 'text-white/40'}>{done(j.id) ? (judge(j) ? '能' : '不能') : '—'}</span></li>)}
            </ul>
          </>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'sort'} pulse={next === 'sort'} disabled={sort.busy || sorted5} onClick={() => sort.run()}>排进顺序表</LabButton>
        <LabButton primary={next === 'judge'} pulse={next === 'judge'} disabled={!q || !ans} onClick={submit}>判断</LabButton>
      </>}
      extras={sorted5 && q ? <Control label="能不能反应">
        <Segmented label="能不能反应" pulse={next === 'ans'} want={right || null} value={ans} onChange={v => { setAns(v as Ans); setSay(null) }} options={[{ value: 'yes', label: '能' }, { value: 'no', label: '不能' }]} />
      </Control> : null}
    />
  )
}
