// 从石油到塑料 · 第 5 课 苯。化验台第三格：振荡器上一只试管架，两支试管分别装溴水和酸性高锰酸钾溶液，上面各有一只装着苯的滴液漏斗。
// 滴进苯、振荡、静置：都不褪色，溴水里的溴被萃取到上层。放大窗里量苯环的键长，再做溴代。
import { useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BENZENE, BROMINATION, benzeneBond } from './frames'
import { Funnel, LiquidMat, Rack, Shaker, Stand, Tube, column } from './glass'
import { LESSONS, goLesson } from './lessons'
import { Lens, Mol, lensPoint, type LensSpec } from './mol'
import { NARRATION } from './narration'
import { clamp01, ease, seg, useRun, type V3 } from './parts'
import { BOND, fades, type Solution } from './physics'
import { BENCH_TOP as TOP, BZ, ST } from './room'
import { VOICE } from './voice'
import { Place, spot } from './world'

const TASKS: Task[] = [
  { id: 'br2', text: '把苯滴进溴水，振荡，静置', note: '分层了：上层的苯变成橙红色，下层几乎无色。溴只是被萃取到苯里，没有反应' },
  { id: 'kmno4', text: '把苯滴进酸性高锰酸钾溶液，振荡', note: '不褪色：苯不能被酸性高锰酸钾溶液氧化' },
  { id: 'len', text: '量一量苯环上六个碳碳键', note: `六个键一样长，都是 ${BOND.benzene} pm：介于单键 ${BOND.single} pm 和双键 ${BOND.double} pm 之间` },
  { id: 'sub', text: '加液溴和溴化铁，看苯怎样反应', note: '苯环上的一个氢被溴取代，生成溴苯和溴化氢：是取代，不是加成' },
]
const X = ST.l5, VIEW: [number, number] = [-0.14, 0.32]
const SPOT = spot(X + 0.17, TOP + 0.31, BZ, 0.78, 0.52, VIEW, true)
const LENS: LensSpec = { at: [X + 0.4, TOP + 0.33, BZ + 0.02], R: 0.18, rotY: VIEW[0] }
const U = LENS.R / 6.0
const TX: Record<Solution, number> = { br2: -0.025, kmno4: 0.025 }       // 两支试管在架子上的位置
const NAME: Record<Solution, string> = { br2: '溴水', kmno4: '酸性高锰酸钾溶液' }
const R = 0.0135, AQ = 0.055, OIL = 0.032                                   // 试管内半径、水层和苯层的高度
const geo = { aq: column(R, 0.0012, AQ), oil: column(R, AQ, AQ + OIL, false) }

export default function Lesson5() {
  const T = useTasks('gewu:petro:5', TASKS)
  const [sol, setSol] = useState<Solution>('br2')
  const [mixed, setMixed] = useState<Record<Solution, boolean>>({ br2: false, kmno4: false })
  const [active, setActive] = useState<Solution>('br2')
  const [measured, setMeasured] = useState(false)
  const mix = useRun(7, () => { setMixed(m => ({ ...m, [active]: true })); T.check(id => id === active) })
  const sub = useRun(3.2, () => T.check(id => id === 'sub'))
  const busy = mix.busy || sub.busy
  const drip = () => { if (busy || mixed[sol]) return; setActive(sol); mix.run() }
  const measure = () => { if (busy) return; setMeasured(true); T.check(id => id === 'len') }
  const resetAll = () => { setSol('br2'); setMixed({ br2: false, kmno4: false }); setMeasured(false); mix.snap(0); sub.snap(0); T.reset() }

  const task = T.current?.id
  const next: 'seg' | 'drip' | 'len' | 'sub' | null = !task || busy ? null : task === 'len' ? 'len' : task === 'sub' ? 'sub' : sol !== task ? 'seg' : 'drip'
  const hint = !task ? '苯的六个碳碳键完全相同，介于单键和双键之间：不易加成，能取代。'
    : mix.busy ? (mix.k < 0.3 ? '苯从漏斗滴进试管，浮在上面…' : mix.k < 0.65 ? '振荡，让两层充分接触…' : '静置，等它分层…')
    : sub.busy ? '看放大窗：一个溴原子换下苯环上的一个氢'
    : task === 'len' ? '试管里都没有褪色。到放大窗里量一量苯环的键长' : task === 'sub' ? '加液溴和溴化铁' : sol !== task ? `把试管换成${NAME[task as Solution]}那一支` : '打开活塞，把苯滴进去，再振荡'

  // 每支试管的进度：0 还没加苯；0–0.3 滴苯；0.3–0.65 振荡（混成一片）；0.65–1 静置分层
  const kOf = (s: Solution) => mixed[s] ? 1 : mix.busy && active === s ? mix.k : 0
  const shake = mix.busy ? seg(mix.k, 0.3, 0.36) * (1 - seg(mix.k, 0.6, 0.66)) : 0
  const tube = (s: Solution) => {
    const k = kOf(s), added = seg(k, 0.02, 0.3), blend = seg(k, 0.3, 0.4) * (1 - seg(k, 0.66, 0.95)), settled = seg(k, 0.66, 0.95)
    const aq0 = s === 'br2' ? '#d07e12' : '#560f74'
    // 溴水：溴跑到上层，上层橙红、下层变得几乎无色；高锰酸钾：上层的苯无色，下层紫色不变
    const aq = s === 'br2' ? mixc(aq0, '#f1efe2', settled * 0.92) : aq0, oil = s === 'br2' ? mixc('#cfd8d4', '#c23c0c', settled) : '#cfd8d4'
    const cloudy = s === 'br2' ? '#e3a246' : '#9a55a8'
    return <group key={s} position={[TX[s], 0.012, 0]}>
      <Tube r={0.015} h={0.16}>
        <mesh geometry={geo.aq} renderOrder={2}><LiquidMat color={mixc(aq, cloudy, blend)} o={0.95} /></mesh>
        {added > 0.01 && <mesh geometry={geo.oil} scale={[1, 1, 1]} renderOrder={3}><LiquidMat color={mixc(oil, cloudy, blend)} o={0.3 + 0.5 * Math.max(blend, s === 'br2' ? settled : 0) + 0.1} /></mesh>}
      </Tube>
    </group>
  }
  const fill = (s: Solution) => 1 - seg(kOf(s), 0.02, 0.3)
  const dripping = mix.busy && mix.k > 0.02 && mix.k < 0.3
  const [a, b] = BROMINATION, kb = sub.busy ? ease(clamp01((sub.k - 0.15) / 0.7)) : sub.k >= 1 ? 1 : 0
  const subbed = sub.busy || sub.k >= 1
  const labels: Label[] = [
    { id: 'lens', at: [LENS.at[0], LENS.at[1] + LENS.R + 0.012, LENS.at[2]], ax: 0.5, className: `scene-tag ${sub.k >= 1 ? 'key' : ''} -translate-y-full`, children: sub.k >= 1 ? <><small>溴苯和溴化氢</small>C₆H₅Br + HBr</> : <><small>苯</small>C₆H₆ · 平面正六边形</> },
    ...(measured && !subbed ? Array.from({ length: 6 }, (_, i) => { const [x, y] = benzeneBond(i, 3.25); return { id: 'b' + i, at: lensPoint(LENS, x, y, U, 0.02), ax: 0.5, className: 'scene-name -translate-y-1/2', style: { background: 'rgb(53 199 179 / 0.9)', color: '#06231f', fontWeight: 600 }, children: `${BOND.benzene} pm` } as Label }) : []),
    ...(['br2', 'kmno4'] as Solution[]).map(s => ({ id: s, at: [X + TX[s] + (s === 'br2' ? -0.03 : 0.03), TOP + 0.13, BZ + 0.03] as V3, ax: s === 'br2' ? 1 : 0, className: `scene-tag ${mixed[s] ? 'key' : ''} -translate-y-1/2`, children: <><small>{NAME[s]}</small>{mixed[s] ? (s === 'br2' ? '分层，上层橙红' : '分层，不褪色') : s === 'br2' ? '橙黄色' : '紫色'}</> })),
    { id: 'fn', at: [X, TOP + 0.49, BZ], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '滴液漏斗里是苯' },
    { id: 'sh', at: [X - 0.13, TOP + 0.04, BZ + 0.1], ax: 1, name: true, className: 'scene-name', children: '振荡器' },
  ]
  return (
    <LabShell title="从石油到塑料" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="苯"
      stage={<Place at={SPOT} labels={labels}>
        <group position={[X, TOP, BZ]}>
          <Shaker shake={shake}><Rack n={2} pitch={0.05} />{(['br2', 'kmno4'] as Solution[]).map(tube)}</Shaker>
          <group position={[0.2, 0, 0]}><Stand y={0.37} reach={-0.2} h={0.5} clamp={0.03} /></group>
          {(['br2', 'kmno4'] as Solution[]).map(s => <group key={s} position={[TX[s], 0.265, 0]}>
            <Funnel fill={fill(s)} />
            {dripping && active === s && <mesh position-y={-0.05}><cylinderGeometry args={[0.0012, 0.0012, 0.1, 8]} /><LiquidMat color="#dfe6e2" o={0.8} /></mesh>}
          </group>)}
        </group>
        <Lens spec={LENS} point={[X + 0.05, TOP + 0.17, BZ + 0.02]}>
          <Mol a={subbed ? a : BENZENE} b={subbed ? b : BENZENE} k={kb} u={U} />
        </Lens>
      </Place>}
      lesson={<LessonBlock no="5" title="苯" concept="苯的六个碳碳键一样长" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>苯 C₆H₆ 是无色、有特殊气味的液体，不溶于水，密度比水小。它的分子是<b className="text-white">平面正六边形</b>，六个碳原子、六个氢原子在同一个平面上。</p>
          <p className="mt-3">苯环上并不是单键和双键交替：六个碳碳键<b className="text-white">完全相同</b>，键长 {BOND.benzene} pm，是一种介于单键和双键之间的特殊的键。所以苯不能使酸性高锰酸钾溶液褪色，也不能和溴水反应使它褪色。</p>
          <p className="mt-3">把苯加进溴水振荡，溴更容易溶在苯里，从水里跑到了苯里，这叫<b className="text-white">萃取</b>，是物理变化：上层的苯变成橙红色，下层的水几乎无色。</p>
          <p className="mt-3">在溴化铁的催化下，苯和液溴发生<b className="text-white">取代反应</b>，生成溴苯和溴化氢。苯也能加成（比如和氢气生成环己烷），但比乙烯难。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">苯的六个碳碳键完全相同，介于单键和双键之间</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">键长 {BOND.benzene} pm，在单键 {BOND.single} pm 和双键 {BOND.double} pm 之间。苯不能使酸性高锰酸钾溶液褪色；加进溴水只是萃取。有催化剂时，苯和液溴发生取代。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <h2 className="text-[12.5px] text-white/55">碳碳键的键长</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <ParamTile symbol="C—C" value={String(BOND.single)} unit="pm · 单键" />
          <ParamTile symbol="苯" value={measured ? String(BOND.benzene) : '—'} unit="pm · 六个都是" />
          <ParamTile symbol="C=C" value={String(BOND.double)} unit="pm · 双键" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">苯加进去以后</h2>
        <div className="mt-2 space-y-1.5 text-[14px]">
          {(['br2', 'kmno4'] as Solution[]).map(s => <div key={s} className="flex justify-between rounded-lg bg-white/[0.06] px-3 py-2"><span className="text-white/65">{NAME[s]}</span><span className={mixed[s] ? 'text-white' : 'text-white/30'}>{mixed[s] ? `不褪色 · ${fades('benzene', s).why}` : '—'}</span></div>)}
        </div>
        <p className="mt-4 font-formula text-[15px] text-white/85">C₆H₆ + Br₂ → C₆H₅Br + HBr</p>
        <p className="mt-1.5 text-[13px] text-white/55">条件：液溴，溴化铁作催化剂 · 取代反应</p>
      </Panel>}
      actions={<>
        <LabButton primary={next === 'drip'} pulse={next === 'drip'} disabled={busy || mixed[sol]} onClick={drip}>滴入苯并振荡</LabButton>
        <LabButton primary={next === 'len'} pulse={next === 'len'} disabled={busy || measured} onClick={measure}>量键长</LabButton>
        <LabButton primary={next === 'sub'} pulse={next === 'sub'} disabled={busy || sub.k >= 1} onClick={() => sub.run()}>加液溴和溴化铁</LabButton>
      </>}
      extras={
        <Control label="哪一支试管">
          <Segmented label="哪一支试管" pulse={next === 'seg'} want={task === 'br2' || task === 'kmno4' ? task : null} disabled={busy} value={sol} onChange={v => setSol(v as Solution)} options={[{ value: 'br2', label: '溴水' }, { value: 'kmno4', label: '酸性高锰酸钾溶液' }]} />
        </Control>
      }
    />
  )
}
/** 两种颜色按比例混 */
function mixc(a: string, b: string, k: number) { const h = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16); return '#' + [0, 1, 2].map(i => Math.round(h(a, i) + (h(b, i) - h(a, i)) * Math.max(0, Math.min(1, k))).toString(16).padStart(2, '0')).join('') }
