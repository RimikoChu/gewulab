// 质量守恒定律 · 第 6 课 配平化学方程式：中控室。大屏前一张长展台，按化学式前面的系数摆分子的球棍模型（示意）：
// 系数加上去，台上就多出几个分子。磷燃烧用最小公倍数法、炼铁用观察法，一步配一个系数；配完数两边的原子，再把短线改成等号、注明条件。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Column, molHeight, molWidth } from './molecules'
import { LESSONS, goLesson } from './lessons'
import { type V3 } from './parts'
import { BAL, EL_NAME, EQ, atomCount, eqText, pretty, type El, type L6Key } from './physics'
import { SHOW, Place } from './world'

const S = 1.1, DY = 1.55
const TASKS: Task[] = [
  { id: 'phos', text: '磷燃烧：用最小公倍数法配平', note: '4P + 5O₂ — 2P₂O₅：两边都是 4 个磷原子、10 个氧原子' },
  { id: 'phosw', text: '数一数原子，写上等号和条件', note: '4P + 5O₂ =点燃= 2P₂O₅' },
  { id: 'iron', text: '炼铁：用观察法配平', note: 'Fe₂O₃ + 3CO — 2Fe + 3CO₂' },
  { id: 'ironw', text: '数一数原子，写上等号和条件', note: 'Fe₂O₃ + 3CO =高温= 2Fe + 3CO₂' },
]
const NAME: Record<L6Key, string> = { phos: '磷燃烧', iron: '炼铁' }

/** 展台上各列分子的位置（模型单位，0 在展台中心）：左边的物质、箭头、右边的物质 */
function columns(k: L6Key) {
  const e = EQ[k], all = [...e.left, ...e.right], ws = all.map(s => molWidth(s.f))
  const xs: number[] = []; let x = 0
  all.forEach((_, i) => { if (i === e.left.length) x += 3.6; else if (i) x += 1.6; xs.push(x + ws[i] / 2); x += ws[i] })
  const mid = x / 2
  return { xs: xs.map(v => v - mid), arrow: (xs[e.left.length - 1] + ws[e.left.length - 1] / 2 + 1.8) - mid, ws }
}

export default function Lesson6() {
  const [mode, setMode] = useState<L6Key>('phos')
  const [step, setStep] = useState(0)
  const [counted, setCounted] = useState(false)
  const [written, setWritten] = useState(false)
  const T = useTasks('gewu:mass:6', TASKS)
  const bal = BAL[mode], e = EQ[mode]
  const coef = step === 0 ? bal.start : bal.steps[step - 1].coef
  const cnt = atomCount(e, coef), done = step === bal.steps.length
  const apply = () => { if (done) return; const n = step + 1; setStep(n); setCounted(false); if (n === bal.steps.length) T.check(id => id === mode) }
  const count = () => setCounted(true)
  const write = () => { if (!done || !counted) return; setWritten(true); T.check(id => id === `${mode}w`) }
  const pick = (k: L6Key) => { if (k === mode) return; setMode(k); setStep(0); setCounted(false); setWritten(false) }
  const resetAll = () => { setMode('phos'); setStep(0); setCounted(false); setWritten(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'step' | 'count' | 'write' | 'mode' | null } = !task ? { hint: '配平只改化学式前面的系数，让两边每种原子一样多。', next: null }
    : task.id.startsWith('iron') && mode !== 'iron' ? { hint: '换成“炼铁”', next: 'mode' }
    : !done ? { hint: bal.steps[step].note, next: 'step' }
    : !counted ? { hint: '数一数两边的原子', next: 'count' }
    : !written ? { hint: '两边每种原子一样多了：把短线改成等号，注明条件', next: 'write' }
    : { hint: '这个方程式配平了', next: null }

  const C = columns(mode), y0 = SHOW.top + 0.45, z = SHOW.z
  const wx = (v: number) => SHOW.x + v * S
  const all = [...e.left, ...e.right]
  const sideX = (left: boolean) => { const xs = C.xs.filter((_, i) => (i < e.left.length) === left); return wx((Math.min(...xs) + Math.max(...xs)) / 2) }
  const tally = (left: boolean) => cnt.els.map(el => `${el} ${(left ? cnt.left : cnt.right)[el as El]}`).join(' · ')
  const tallyTop = y0 + Math.max(...all.map((s, i) => coef[i] * Math.max(DY, molHeight(s.f)))) * S + 0.3
  const labels: Label[] = [
    ...all.map((s, i) => ({ id: `f${i}`, at: [wx(C.xs[i]), SHOW.top + 0.05, z + 2.2] as V3, ax: 0.5, className: 'scene-tag', children: <><span className={coef[i] > 1 ? 'text-[#0b8277]' : ''}>{coef[i] > 1 ? coef[i] : ''}</span>{pretty(s.f)}</> })),
    ...all.slice(1).map((_, i) => i + 1 === e.left.length ? null : { id: `p${i}`, at: [wx((C.xs[i] + C.xs[i + 1]) / 2), SHOW.top + 0.05, z + 2.2] as V3, ax: 0.5, className: 'scene-name', children: '+' }).filter(Boolean) as Label[],
    { id: 'arrow', at: [wx(C.arrow), SHOW.top + 0.05, z + 2.2], ax: 0.5, className: `scene-tag ${written ? 'key' : ''}`, children: written ? `=${e.cond}=` : '—' },
    ...(counted ? [
      { id: 'tl', at: [sideX(true), tallyTop, z] as V3, ax: 0.5, className: `scene-tag ${cnt.ok ? 'key' : ''} -translate-y-full`, children: <><small>左边</small>{tally(true)}</> },
      { id: 'tr', at: [sideX(false), tallyTop, z] as V3, ax: 0.5, className: `scene-tag ${cnt.ok ? 'key' : ''} -translate-y-full`, children: <><small>右边</small>{tally(false)}</> },
    ] : []),
  ]
  return (
    <LabShell title="质量守恒定律" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel={`${NAME[mode]} · ${bal.method}`}
      stage={<Place at="l6" labels={labels}>
        {all.map((s, i) => <group key={`${mode}${i}`} position={[wx(C.xs[i]), y0, z]} scale={S}><Column f={s.f} n={coef[i]} x={0} dy={Math.max(DY, molHeight(s.f))} /></group>)}
      </Place>}
      lesson={<LessonBlock no="6" title="配平化学方程式" concept="只改系数，让两边每种原子一样多" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>书写化学方程式要遵守两个原则：以客观事实为基础；遵守质量守恒定律，等号两边各原子的种类和数目必须相同。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">最小公倍数法</b>：找出两边各出现一次、个数相差较多的原子（磷燃烧里的氧），求它两边个数的最小公倍数，由此定出系数</li>
            <li><b className="text-white">观察法</b>：炼铁时，每个 CO 夺取一个氧原子变成 CO₂；Fe₂O₃ 有 3 个氧原子，就要 3 个 CO</li>
            <li>只能改化学式前面的系数，不能改化学式里的小数字：改了就成了另一种物质</li>
            <li>配平后把短线改成等号，注明条件（点燃、加热“△”、高温、通电）；生成物里的气体标“↑”、溶液中的沉淀标“↓”</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Panel className="px-1 py-0">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个方程式都配平了</p>
          <p className="mt-1 text-[19px] leading-snug font-bold">配平只改系数，让两边每种原子的个数相等</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">4P + 5O₂ =点燃= 2P₂O₅；Fe₂O₃ + 3CO =高温= 2Fe + 3CO₂。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAME[mode]} · {bal.method}</div>
            <div className="mt-1 font-formula text-[22px] leading-snug">{written ? eqText(e, coef).replace('=', `=${e.cond}=`) : eqText(e, coef, true)}</div>
          </div>
          <table className="mt-4 w-full text-[14px] tabular-nums">
            <thead><tr className="text-[12.5px] text-white/50"><td className="pb-1">原子</td><td className="pb-1 text-right">左边</td><td className="pb-1 text-right">右边</td></tr></thead>
            <tbody>{cnt.els.map(el => { const ok = cnt.left[el as El] === cnt.right[el as El]; return <tr key={el} className="border-t border-white/10">
              <td className="py-1.5">{EL_NAME[el as El]}原子 {el}</td><td className="py-1.5 text-right font-semibold">{cnt.left[el as El]}</td>
              <td className={`py-1.5 text-right font-semibold ${ok ? 'text-[#7fe3d4]' : 'text-[#ffb4a8]'}`}>{cnt.right[el as El]}</td></tr> })}</tbody>
          </table>
          <h2 className="mt-5 text-[12.5px] text-white/55">已经配的</h2>
          <ol className="mt-1.5 flex list-decimal flex-col gap-1 pl-5 text-[13.5px] text-white/75">{bal.steps.slice(0, step).map(s => <li key={s.note}>{s.note}</li>)}{step === 0 && <li className="list-none text-white/40">还没有配</li>}</ol>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'step'} pulse={next === 'step'} onClick={apply} disabled={done}>配一个系数</LabButton>
        <LabButton primary={next === 'count'} pulse={next === 'count'} onClick={count} disabled={counted}>数原子</LabButton>
        <LabButton primary={next === 'write'} pulse={next === 'write'} onClick={write} disabled={!done || !counted || written}>写等号和条件</LabButton>
      </>}
      extras={
        <Control label="方程式">
          <Segmented label="方程式" pulse={next === 'mode'} want={task?.id.startsWith('iron') ? 'iron' : 'phos'} value={mode} onChange={k => pick(k as L6Key)} options={(['phos', 'iron'] as L6Key[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
