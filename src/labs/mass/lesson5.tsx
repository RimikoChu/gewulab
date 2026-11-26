// 质量守恒定律 · 第 5 课 化学方程式的意义：反应车间。燃烧炉朝镜头剖开，炉底燃烧器，左边燃料计量罐和氧气缓冲罐，右边产品罐。
// 三种读法各一个按钮：读物质和条件（炉子点火，标出反应物、生成物、条件）；读质量比（两只进料罐按质量比走空，产品罐计满）；
// 读粒子个数比（炉口上方的分子模型拆开、重组）。再换成氢气燃烧读一次质量比。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { Led, useTasks, type Label } from '@/lab-kit'
import { Flame } from './fx'
import { Reaction } from './molecules'
import { FEED, FEED_H } from './plant'
import { LESSONS, goLesson } from './lessons'
import { ease, seg, useRun, type V3 } from './parts'
import { AR, EQ, l5Feed, l5Ratio, mr, pretty, type L5Key } from './physics'
import { FURN, Place } from './world'

const TASKS: Task[] = [
  { id: 'what', text: '读出反应物、生成物和反应条件', note: '碳和氧气在点燃的条件下反应，生成二氧化碳' },
  { id: 'mass', text: '读出各物质的质量比', note: '每 12 份质量的碳和 32 份质量的氧气完全反应，生成 44 份质量的二氧化碳' },
  { id: 'ratio', text: '读出粒子个数比', note: '每 1 个碳原子和 1 个氧分子反应，生成 1 个二氧化碳分子' },
  { id: 'h2', text: '换成氢气燃烧，读质量比', note: '每 4 份质量的氢气和 32 份质量的氧气完全反应，生成 36 份质量的水' },
]
const NAME: Record<L5Key, string> = { carbon: '碳燃烧', h2: '氢气燃烧' }
const SPEC = (k: L5Key) => EQ[k]
/** 分子模型摆在产品罐上方 */
const MOL: V3 = [FURN.x + 15, 27, FURN.z + 9]
const ledAt = (f: { x: number; z: number }): V3 => [f.x, FEED_H.y0 + 4.3, f.z + FEED_H.r + 0.32]
/** 相对分子质量的算式：CO₂ → 12 + 16 × 2 = 44 */
const mrText = (f: string) => { const parts = [...f.matchAll(/([A-Z][a-z]?)(\d*)/g)].map(m => (m[2] ? `${AR[m[1] as keyof typeof AR]} × ${m[2]}` : `${AR[m[1] as keyof typeof AR]}`)); return parts.length === 1 && !/\d/.test(f) ? `${mr(f)}` : `${parts.join(' + ')} = ${mr(f)}` }

export default function Lesson5() {
  const [mode, setMode] = useState<L5Key>('carbon')
  const [read, setRead] = useState<Record<string, boolean>>({})
  const T = useTasks('gewu:mass:5', TASKS)
  const what = useRun(3, () => { setRead(r => ({ ...r, what: true })); T.check(id => id === 'what') })
  const mass = useRun(6, () => { setRead(r => ({ ...r, mass: true })); T.check(id => id === (mode === 'h2' ? 'h2' : 'mass')) })
  const ratio = useRun(6, () => { setRead(r => ({ ...r, ratio: true })); T.check(id => id === 'ratio') })
  const busy = what.busy || mass.busy || ratio.busy
  const pick = (k: L5Key) => { if (busy || k === mode) return; setMode(k); setRead({}); what.snap(0); mass.snap(0); ratio.snap(0) }
  const resetAll = () => { setMode('carbon'); setRead({}); what.snap(0); mass.snap(0); ratio.snap(0); T.reset() }
  const E = SPEC(mode), feed = l5Feed(mode), coef = l5Ratio(mode)

  const task = T.current
  const { hint, next }: { hint: string; next: 'what' | 'mass' | 'ratio' | 'mode' | null } = !task ? { hint: '化学方程式表示反应物、生成物和反应条件，各物质的质量比，以及粒子的个数比。', next: null }
    : task.id === 'h2' && mode !== 'h2' ? { hint: '换成“氢气燃烧”', next: 'mode' }
    : what.busy ? { hint: `燃烧炉点火，${E.left[0].name}在氧气里燃烧…`, next: null }
    : mass.busy ? { hint: '两只进料罐按质量比把料送进炉子，产品罐计量生成的物质…', next: null }
    : ratio.busy ? { hint: '分子拆成原子，再组合成新的分子…', next: null }
    : task.id === 'what' ? { hint: '读一读：哪些是反应物、生成物，条件是什么', next: 'what' }
    : task.id === 'mass' ? { hint: '读一读：各物质的质量比', next: 'mass' }
    : task.id === 'ratio' ? { hint: '读一读：粒子的个数比', next: 'ratio' }
    : { hint: '读一读：氢气燃烧时各物质的质量比', next: 'mass' }

  const lit = read.what || read.mass || read.ratio || what.busy || mass.busy || ratio.busy
  const fk = what.busy ? seg(what.t, 0.4, 1.2) : lit ? 1 : 0
  const mk = mass.busy ? ease(seg(mass.t, 0.5, 5.5)) : read.mass ? 1 : 0
  const phase = ratio.busy ? Math.min(2, ratio.t / 2.5) : read.ratio ? 2 : 0
  const roles = read.what || what.busy
  const [a, b, c] = feed
  const fmt = (v: number) => `${v.toFixed(1)} kg`
  const burner: V3 = [FURN.x, FURN.y0 + 2.7, FURN.z]
  const labels: Label[] = [
    ...(roles ? [
      { id: 'r1', at: [FEED.fuel.x, FEED_H.y0 + FEED_H.h + 1.2, FEED.fuel.z] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>反应物</small>{E.left[0].name}</> },
      { id: 'r2', at: [FEED.o2.x, FEED_H.y0 + FEED_H.h + 1.2, FEED.o2.z] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>反应物</small>氧气</> },
      { id: 'r3', at: [FEED.prod.x, FEED_H.y0 + FEED_H.h + 4, FEED.prod.z] as V3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>生成物</small>{E.right[0].name}</> },
      { id: 'r4', at: [burner[0] + 2.2, burner[1] + 3, burner[2] + 2] as V3, ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>条件</small>{E.cond}</> },
    ] : []),
    ...(mk > 0 ? [
      { id: 'm1', at: [ledAt(FEED.fuel)[0], ledAt(FEED.fuel)[1] - 1.3, ledAt(FEED.fuel)[2]] as V3, ax: 0.5, className: 'scene-name', children: `送入 ${fmt(a * mk)}` },
      { id: 'm2', at: [ledAt(FEED.o2)[0], ledAt(FEED.o2)[1] - 1.3, ledAt(FEED.o2)[2]] as V3, ax: 0.5, className: 'scene-name', children: `送入 ${fmt(b * mk)}` },
    ] : []),
    ...(phase > 0 ? [{ id: 'p', at: [MOL[0], MOL[1] + 4.6, MOL[2]] as V3, ax: 0.5, className: `scene-tag ${phase >= 2 ? 'key' : ''} -translate-y-full`, children: <><small>粒子个数比</small>{coef.join(' : ')}</> }] : []),
    { id: 'n1', at: [FURN.x + FURN.r + 0.8, FURN.y0 + FURN.h * 0.75, FURN.z + 1] as V3, ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '燃烧炉（剖开）' },
  ]
  return (
    <LabShell title="质量守恒定律" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel={`读 ${NAME[mode]} 的方程式`}
      stage={<Place at="l5" labels={labels}>
        <Flame at={burner} w={3.6} h={9} kind={mode === 'h2' ? 'h2' : 'wood'} level={fk} seed={3} light={60} lightColor={mode === 'h2' ? '#9fb8ff' : '#ff9a44'} />
        <Led text={fmt(a * (1 - mk))} w={3.0} h={1.25} position={ledAt(FEED.fuel)} />
        <Led text={fmt(b * (1 - mk))} w={3.0} h={1.25} position={ledAt(FEED.o2)} />
        <Led text={fmt(c * mk)} w={3.0} h={1.25} position={ledAt(FEED.prod)} />
        <group position={MOL} scale={3.2}><Reaction key={mode} eq={E} phase={phase} /></group>
      </Place>}
      lesson={<LessonBlock no="5" title="化学方程式的意义" concept="一个方程式，读出物质、条件、质量比、个数比" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p className="text-center font-formula text-[16px]">C + O<sub>2</sub> =点燃= CO<sub>2</sub></p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">质的方面</b>：碳和氧气在点燃的条件下反应，生成二氧化碳</li>
            <li><b className="text-white">量的方面</b>：每 12 份质量的碳和 32 份质量的氧气完全反应，生成 44 份质量的二氧化碳。质量比等于“系数 × 相对分子质量”之比</li>
            <li><b className="text-white">粒子方面</b>：每 1 个碳原子和 1 个氧分子反应，生成 1 个二氧化碳分子</li>
          </ul>
          <p className="mt-3">读的时候，“+”读作“和”，“=”读作“生成”，不能读成“加”“等于”。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="px-1 py-0">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个方程式都读过了</p>
          <p className="mt-1 text-[19px] leading-snug font-bold">化学方程式表示：反应物、生成物和条件；质量比；粒子个数比</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">碳燃烧 12 : 32 : 44，氢气燃烧 4 : 32 : 36。质量比是“系数 × 相对分子质量”之比，左右两边的总和相等。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAME[mode]}</div>
            <div className="mt-1 font-formula text-[24px] leading-snug">{(() => { const s = E; const side = (l: typeof s.left, o: number) => l.map((x, i) => `${coef[o + i] === 1 ? '' : coef[o + i]}${pretty(x.f)}`).join(' + '); return `${side(s.left, 0)} =${s.cond}= ${side(s.right, s.left.length)}` })()}</div>
          </div>
          <table className="mt-4 w-full text-[14px] tabular-nums">
            <thead><tr className="text-[12.5px] text-white/50"><td className="pb-1">物质</td><td className="pb-1 text-right">相对分子质量</td><td className="pb-1 text-right">质量比</td></tr></thead>
            <tbody>{[...E.left, ...E.right].map((s, i) => <tr key={s.f + i} className="border-t border-white/10">
              <td className="py-1.5">{s.name} {pretty(s.f)}</td><td className="py-1.5 text-right text-white/70">{mrText(s.f)}</td>
              <td className={`py-1.5 text-right font-semibold ${read.mass ? 'text-[#7fe3d4]' : 'text-white/35'}`}>{read.mass ? `${coef[i] === 1 ? '' : `${coef[i]} × ${mr(s.f)} = `}${feed[i]}` : '—'}</td></tr>)}</tbody>
          </table>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-[12px] text-white/55">质量比</div><div className={`mt-0.5 text-[20px] font-bold tabular-nums ${read.mass ? '' : 'text-white/30'}`}>{read.mass ? feed.join(' : ') : '—'}</div></div>
            <div className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-[12px] text-white/55">粒子个数比</div><div className={`mt-0.5 text-[20px] font-bold tabular-nums ${read.ratio ? '' : 'text-white/30'}`}>{read.ratio ? coef.join(' : ') : '—'}</div></div>
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'what'} pulse={next === 'what'} onClick={() => what.run()} disabled={busy}>物质和条件</LabButton>
        <LabButton primary={next === 'mass'} pulse={next === 'mass'} onClick={() => mass.run()} disabled={busy}>质量比</LabButton>
        <LabButton primary={next === 'ratio'} pulse={next === 'ratio'} onClick={() => ratio.run()} disabled={busy}>粒子个数比</LabButton>
      </>}
      extras={
        <Control label="方程式">
          <Segmented label="方程式" pulse={next === 'mode'} want={task?.id === 'h2' ? 'h2' : 'carbon'} value={mode} disabled={busy} onChange={k => pick(k as L5Key)} options={(['carbon', 'h2'] as L5Key[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
