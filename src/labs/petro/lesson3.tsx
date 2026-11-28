// 从石油到塑料 · 第 3 课 甲烷和取代反应。化验台第一格：一支倒扣在饱和食盐水里的大试管，里面是甲烷和氯气，旁边一盏灯。
// 开了灯，黄绿色慢慢变浅、管里液面上升、管壁出现油状液滴。放大窗里氯原子一个一个把氢换下来。
import { useEffect, useMemo, useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { lathe, useSlide, useTasks, type Label } from '@/lab-kit'
import { methaneFrame } from './frames'
import { Lamp, LiquidMat, Stand, Trough, Tube } from './glass'
import { LESSONS, goLesson } from './lessons'
import { Lens, Mol, lensPoint, type LensSpec } from './mol'
import { NARRATION } from './narration'
import { ease, rng, useRun, type V3 } from './parts'
import { METHANE_ANGLE, substituted } from './physics'
import { BENCH_TOP as TOP, BZ, ST } from './room'
import { VOICE } from './voice'
import { Place, spot } from './world'

const TASKS: Task[] = [
  { id: 'dark', text: '不开灯，让一个氯分子过来', note: '没有光照，甲烷和氯气不反应' },
  { id: 'one', text: '开灯，取代一个氢', note: 'CH₄ + Cl₂ → CH₃Cl + HCl：一个氯换下一个氢，另一个氯和氢结成氯化氢' },
  { id: 'two', text: '再取代一个，得到二氯甲烷', note: 'CH₃Cl + Cl₂ → CH₂Cl₂ + HCl：二氯甲烷是油状液体' },
  { id: 'four', text: '一直取代到四氯化碳', note: '四个氢都换成了氯：用了 4 个 Cl₂，生成 4 个 HCl' },
]
const X = ST.l3, VIEW: [number, number] = [-0.16, 0.33]
const SPOT = spot(X + 0.08, TOP + 0.37, BZ, 0.9, 0.5, VIEW, true)
const LENS: LensSpec = { at: [X + 0.385, TOP + 0.36, BZ + 0.02], R: 0.17, rotY: VIEW[0] }
const U = LENS.R / 5.5
const TUBE = { x: X, r: 0.032, h: 0.3, y: TOP + 0.022 }       // 倒扣的大试管：管口朝下，离槽底 2 cm
const LEVEL0 = TOP + 0.075                                     // 槽里的液面

export default function Lesson3() {
  const T = useTasks('gewu:petro:3', TASKS)
  const [light, setLight] = useState(false)
  const [n, setN] = useState(0)                 // 已经取代了几个氢
  const [waiting, setWaiting] = useState(false) // 有一个氯分子等在旁边
  const come = useRun(1.1, () => { setWaiting(true); if (!light) T.check(id => id === 'dark') })
  const react = useRun(2.6, () => { const m = n + 1; setN(m); setWaiting(false); T.check(id => (id === 'one' && m >= 1) || (id === 'two' && m >= 2) || (id === 'four' && m >= 4)) })
  const busy = come.busy || react.busy
  // 有光、有等着的氯分子，就反应
  useEffect(() => { if (light && waiting && !react.busy && n < 4) react.run() }, [light, waiting])   // eslint-disable-line react-hooks/exhaustive-deps
  const call = () => { if (busy || waiting || n >= 4) return; come.run() }
  const resetAll = () => { setLight(false); setN(0); setWaiting(false); come.snap(0); react.snap(0); T.reset() }

  const task = T.current?.id
  const next: 'light' | 'cl' | null = !task || busy ? null : task === 'dark' ? (light ? 'light' : waiting ? null : 'cl') : !light ? 'light' : waiting ? null : 'cl'
  const hint = !task ? '甲烷里的氢可以被氯一个一个取代，每取代一个都生成一个氯化氢。'
    : react.busy ? (n === 0 ? '看放大窗：一个氯原子换下一个氢，另一个氯原子带着氢走了' : `看放大窗：又一个氢被氯换了下来，这是第 ${n + 1} 个`)
    : come.busy ? '氯分子过来了…'
    : task === 'dark' ? (light ? '先把灯关上' : '不开灯，让一个氯分子过来')
    : !light ? (waiting ? '氯分子就在旁边，没有光照不反应。把灯打开' : '把灯打开')
    : n === 1 ? '再让一个氯分子过来' : '继续：再让一个氯分子过来'

  const s = substituted(n), prog = useSlide(n / 4, 0.12)
  const a = react.busy ? methaneFrame(n, true) : come.busy ? methaneFrame(n, false) : methaneFrame(n, waiting)
  const b = react.busy ? methaneFrame(n + 1, false) : come.busy ? methaneFrame(n, true) : a
  const k = react.busy ? ease(react.k) : come.busy ? ease(come.k) : 0
  const gasTop = TUBE.y + TUBE.h - 0.004, level = LEVEL0 + 0.15 * prog
  const geo = useMemo(() => ({ gas: lathe([[0, 0], [TUBE.r - 0.003, 0], [TUBE.r - 0.003, 1], [0, 1]], { segs: 24 }) }), [])
  const drops = useMemo(() => { const r = rng(3); return Array.from({ length: 14 }, () => ({ a: Math.PI * (0.1 + r() * 0.8), y: 0.25 + r() * 0.65, s: 0.003 + r() * 0.0028 })) }, [])
  const labels: Label[] = [
    { id: 'lens', at: [LENS.at[0], LENS.at[1] + LENS.R + 0.012, LENS.at[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{s.product.name}</small>{s.product.formula} · {s.product.state}</> },
    { id: 'hcl', at: lensPoint(LENS, 0, -4.4, U), ax: 0.5, className: 'scene-name', style: { opacity: n > 0 ? 1 : 0 }, children: `氯化氢 HCl × ${s.hcl}` },
    { id: 'ang', at: lensPoint(LENS, -2.6, 1.8, U), ax: 1, className: 'scene-name', style: { opacity: n === 0 && !busy ? 1 : 0 }, children: `正四面体 · 键角 ${METHANE_ANGLE}` },
    { id: 'tube', at: [TUBE.x - 0.045, TUBE.y + 0.25, BZ], ax: 1, name: true, className: 'scene-name', children: '甲烷和氯气' },
    { id: 'salt', at: [X - 0.14, TOP + 0.04, BZ + 0.14], ax: 1, name: true, className: 'scene-name', children: '饱和食盐水' },
    { id: 'lv', at: [TUBE.x + 0.045, level, BZ + 0.03], ax: 0, className: 'scene-tag -translate-y-1/2', style: { opacity: n > 0 ? 1 : 0, transition: 'opacity .5s' }, children: <><small>液面</small>上升了</> },
  ]
  const gasColor = '#b9d23a'
  return (
    <LabShell title="从石油到塑料" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="光照和氯气"
      stage={<Place at={SPOT} labels={labels}>
        <group position={[X, TOP, BZ]}>
          <Trough r={0.15} h={0.1} level={LEVEL0 - TOP} />
          {/* 铁架台夹着倒扣的大试管 */}
          <group position={[0.21, 0, 0]}><Stand y={0.27} reach={-0.21} h={0.5} clamp={TUBE.r} /></group>
          <group position={[-0.29, 0, 0.04]} rotation-y={0.2} scale={1.2}><Lamp on={light} /></group>
        </group>
        <group position={[TUBE.x, TUBE.y + TUBE.h, BZ]} rotation-z={Math.PI}><Tube r={TUBE.r} h={TUBE.h} /></group>
        {/* 管里的气体：黄绿色随着反应变浅；下面是升上来的食盐水 */}
        <mesh geometry={geo.gas} position={[TUBE.x, level, BZ]} scale={[1, gasTop - level, 1]} renderOrder={3}><meshBasicMaterial color={gasColor} transparent opacity={0.55 * (1 - prog * 0.85)} depthWrite={false} /></mesh>
        <mesh geometry={geo.gas} position={[TUBE.x, TUBE.y + 0.004, BZ]} scale={[1, level - TUBE.y - 0.004, 1]} renderOrder={2}><LiquidMat color="#6fa3b3" o={0.22} /></mesh>
        {/* 管壁上的油状液滴：取代到两个以上才有 */}
        {drops.map((d, i) => { const on = prog * 14 - 3 - i * 0.7; if (on <= 0) return null; const y = level + (gasTop - level) * d.y; return <mesh key={i} position={[TUBE.x + Math.cos(d.a) * (TUBE.r - 0.004), y, BZ + Math.sin(d.a) * (TUBE.r - 0.004)]} scale={[1, 1.5, 1]} renderOrder={4}><sphereGeometry args={[d.s * Math.min(1, on), 10, 8]} /><meshBasicMaterial color="#e9e2a8" transparent opacity={0.9} toneMapped={false} /></mesh> })}
        <Lens spec={LENS} point={[TUBE.x + 0.03, TUBE.y + 0.24, BZ + 0.03] as V3}><Mol a={a} b={b} k={k} u={U} /></Lens>
      </Place>}
      lesson={<LessonBlock no="3" title="甲烷和取代反应" concept="一个氢换成一个氯，同时生成氯化氢" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>甲烷 CH₄ 是最简单的烃。它的分子是<b className="text-white">正四面体</b>：碳原子在中心，四个氢原子在四个顶点，四个 C—H 键完全相同，键角 {METHANE_ANGLE}。</p>
          <p className="mt-3">甲烷和氯气在<b className="text-white">光照</b>下反应：甲烷分子里的氢原子被氯原子一个一个取代，依次生成一氯甲烷、二氯甲烷、三氯甲烷（氯仿）、四氯化碳，同时生成氯化氢。有机物分子里的某些原子或原子团被其他原子或原子团代替的反应，叫<b className="text-white">取代反应</b>。</p>
          <p className="mt-3">实验里能看到：气体的黄绿色变浅，试管里液面上升，管壁出现油状液滴。一氯甲烷是气体，另外三种是油状液体；氯化氢溶在水里。</p>
          <p className="mt-3">真实的反应里四种氯代物同时生成，得到的是混合物；这里一步一步画。液面升了多少是示意。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">光照下，甲烷里的氢被氯一个一个取代</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">每取代 1 个氢，消耗 1 个 Cl₂，生成 1 个 HCl：氯分子里只有一半的氯进了有机物。取代到底一共用了 4 个 Cl₂。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="text-[13px] text-white/60">现在的有机物</div>
          <div className="mt-1 font-formula text-[40px] leading-none font-bold tracking-tight">{s.product.formula}</div>
          <div className="mt-1.5 text-[13.5px] text-white/65">{s.product.name} · {s.product.state} · 相对分子质量 {s.mass}</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ParamTile symbol="换下的 H" value={String(n)} unit="个" />
          <ParamTile symbol="用掉 Cl₂" value={String(s.cl2)} unit="个" />
          <ParamTile symbol="生成 HCl" value={String(s.hcl)} unit="个" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">试管里看到的</h2>
        <ul className="mt-1.5 space-y-1 text-[14px] text-white/80">
          <li className={n > 0 ? '' : 'text-white/35'}>气体的黄绿色变浅</li>
          <li className={n > 0 ? '' : 'text-white/35'}>试管里液面上升</li>
          <li className={n > 1 ? '' : 'text-white/35'}>管壁出现油状液滴</li>
        </ul>
        <p className="mt-3 text-[12.5px] text-white/50">灯：{light ? '开着' : '关着'}{waiting ? ' · 有一个氯分子等在旁边' : ''}</p>
      </Panel>}
      actions={<>
        <LabButton pulse={next === 'light'} disabled={react.busy} onClick={() => setLight(l => !l)}>{light ? '关灯' : '开灯'}</LabButton>
        <LabButton primary pulse={next === 'cl'} disabled={busy || waiting || n >= 4} onClick={call}>来一个氯分子</LabButton>
      </>}
      extras={null}
    />
  )
}
