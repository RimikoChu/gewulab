// 水的净化和组成 · 第 4 课 吸附：化验台第 3 格。一杯滴了几滴红墨水的水，直接过滤，滤液还是红的（色素溶在水里，能穿过滤纸）；
// 换一杯同样的红水，加一勺活性炭搅拌后再过滤，滤液几乎没有颜色：色素被活性炭吸附住了。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BEAKER, DropBottle, GlassRod, Glove, JarBottle, Spoon } from './gear'
import { FilterRig, POUR, RIG } from './rig'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { colorLeft, pct } from './physics'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l4, Y = TOP, Z = BZ + 0.15
const RED = '#9e1027'
const SRC: V3 = [X0 + RIG.src * M, Y, Z + 0.02 * M], JAR: V3 = [X0 + 0.33 * M, Y, Z - 0.09 * M]
const CUP = BEAKER[250]
const T_C = { spoon: [0, 1.4], tip: [1.4, 2.2], back: [2.2, 3.0], stir: [3.0, 5.6], end: 5.8 } as const
type Mode = 'plain' | 'carbon'
const TASKS: Task[] = [
  { id: 'plain', text: '把红色的水直接过滤', note: '滤液还是红的：溶在水里的色素能穿过滤纸' },
  { id: 'add', text: '换一杯红色的水，加活性炭搅拌', note: '活性炭疏松多孔，色素分子被吸附在它的表面' },
  { id: 'carbon', text: '再过滤一次，看滤液的颜色', note: `滤液几乎无色，颜色只剩约 ${pct(colorLeft(true))}` },
]

export default function Lesson4() {
  const [mode, setMode] = useState<Mode>('plain')
  const [filtered, setFiltered] = useState<Partial<Record<Mode, boolean>>>({})
  const T = useTasks('gewu:water:4', TASKS)
  const pour = useRun(POUR.end, () => { setFiltered(f => ({ ...f, [mode]: true })); T.check(id => id === mode) })
  const add = useRun(T_C.end, () => { setMode('carbon'); T.check(id => id === 'add') })
  const busy = pour.busy || add.busy
  const rig: Mode = add.busy || mode === 'carbon' ? 'carbon' : 'plain'      // 台上现在是哪一套
  const done = !!filtered[rig] && !pour.busy
  const resetAll = () => { pour.snap(0); add.snap(0); setMode('plain'); setFiltered({}); T.reset() }
  const left = colorLeft(mode === 'carbon')

  // 加活性炭：先把滤过的那一套收拾好（换一张新滤纸、一杯新的红水），药匙舀一勺炭粉倒进烧杯，玻璃棒搅拌
  const a = add.t, adding = add.busy
  const spoonHome: V3 = [JAR[0] - 0.02 * M, Y + 0.1 * M, JAR[2]], spoonOver: V3 = [SRC[0] + 0.015 * M, Y + CUP.h * M + 0.04 * M, SRC[2]]
  const sp = !adding ? spoonHome : a < T_C.tip[0] ? liftPath(spoonHome, spoonOver, spoonOver[1] + 0.04 * M, seg(a, ...T_C.spoon)) : a < T_C.back[0] ? spoonOver : liftPath(spoonOver, spoonHome, spoonOver[1] + 0.04 * M, seg(a, ...T_C.back))
  const flip = adding ? ease(seg(a, T_C.tip[0], T_C.tip[0] + 0.4)) * (1 - ease(seg(a, T_C.tip[1] - 0.2, T_C.tip[1]))) : 0
  const stir = adding && a > T_C.stir[0] && a < T_C.stir[1], ang = (a - T_C.stir[0]) * 9
  const carbonIn = mode === 'carbon' || (adding && a > T_C.tip[0] + 0.3)

  const task = T.current
  const { hint, next }: { hint: string; next: 'pour' | 'add' | null } = !task ? { hint: '活性炭能吸附水里的色素和异味；过滤只能除去不溶性杂质。', next: null }
    : pour.busy ? { hint: '沿玻璃棒倒进漏斗，看滤出来的水…', next: null }
    : adding ? { hint: a < T_C.stir[0] ? '舀一勺活性炭，加进红色的水里…' : '用玻璃棒搅拌，让活性炭和水充分接触…', next: null }
    : task.id === 'plain' ? { hint: '这杯水滴了几滴红墨水。先把它直接过滤', next: 'pour' }
    : task.id === 'add' ? { hint: '滤液还是红的。换一杯同样的红水，加活性炭搅拌', next: 'add' }
    : { hint: '把加了活性炭的水过滤', next: 'pour' }

  const outShown = done || (pour.busy && pour.t > POUR.flow[0])
  const labels: Label[] = [
    ...(outShown ? [{ id: 'v', at: [X0 + 0.06 * M, Y + 0.1 * M, Z + 0.06 * M] as V3, ax: 0, className: `scene-tag ${mode === 'carbon' ? 'key' : ''} -translate-y-1/2`, children: <><small>滤液的颜色</small>{mode === 'carbon' ? '几乎无色' : '还是红的'}</> }] : []),
    { id: 'n1', at: [SRC[0], Y + 0.12 * M, SRC[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '滴了红墨水的水' },
    { id: 'n2', at: [JAR[0], Y + 0.11 * M, JAR[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '活性炭' },
  ]
  return (
    <LabShell title="水的净化和组成" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="吸附"
      stage={<Place at="l4" labels={labels}>
        {/* key 换了，整套装置就换成新的一套：新滤纸、新的一杯红水 */}
        <FilterRig key={rig} x={X0} y={Y} z={Z} t={pour.t} busy={pour.busy} done={done} feed={{ k: carbonIn ? 0.6 : 0.02, tint: RED }} out={{ k: 0.02, tint: RED, tk: left }} carbon={carbonIn} />
        <group position={JAR}><JarBottle label="活性炭" solid="carbon" amount={0.55} band="#3a3a3a" /></group>
        <group position={[X0 + 0.38 * M, Y, Z + 0.06 * M]}><DropBottle label="红墨水" color={RED} band="#c2283f" /></group>
        <group position={sp} rotation-z={Math.PI * 0.85 * flip}><Spoon load={adding && a > 0.3 && a < T_C.tip[0] + 0.3 ? 1 - flip : 0} color="#141414" />
          {adding && a < T_C.back[1] && <group position={[0.15 * M, 0.02 * M, 0.02 * M]} rotation={[0.4, 0, -1.2]}><Glove s={0.0058 * M} /></group>}
        </group>
        {stir && <group position={[SRC[0] + Math.cos(ang) * CUP.r * M * 0.4, Y + 0.01 * M, SRC[2] + Math.sin(ang) * CUP.r * M * 0.4]} rotation={[Math.sin(ang) * 0.18, 0, -Math.cos(ang) * 0.18]}><GlassRod len={0.2} />
          <group position={[0, 0.18 * M, 0]} rotation={[0.3, 0, 0]}><Glove s={0.0058 * M} /></group>
        </group>}
      </Place>}
      lesson={<LessonBlock no="4" title="吸附" concept="活性炭能吸附水里的色素和异味" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>红墨水的色素溶在水里，颗粒比滤纸的小孔小得多，过滤除不掉。</p>
          <p className="mt-3">活性炭有<b className="text-white">疏松多孔</b>的结构，表面积很大，能把水里的色素和有异味的物质吸附在表面，这种作用叫<b className="text-white">吸附</b>。吸附了杂质的活性炭再用过滤除去。</p>
          <p className="mt-3 text-[13.5px] text-white/65">活性炭的吸附是物理变化。它不能除去溶在水里的钙、镁化合物，所以不能把硬水变成软水。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两次过滤都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">活性炭吸附色素，过滤除不掉的颜色被它除去了</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">直接过滤，颜色还剩 {pct(colorLeft(false))}；加活性炭再过滤，只剩约 {pct(colorLeft(true))}。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">滤液的颜色还剩</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{done ? `${mode === 'carbon' ? '约 ' : ''}${Math.round(left * 100)}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">%</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="原来" value="100%" unit="滴了红墨水的水" />
            <ParamTile symbol="活性炭" value={mode === 'carbon' ? '加了' : '没加'} unit="一勺" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">两次过滤</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium" /><th className="pb-1 font-medium">颜色还剩</th><th className="pb-1 font-medium">滤液</th></tr></thead>
            <tbody>{(['plain', 'carbon'] as Mode[]).map(k => <tr key={k} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{k === 'plain' ? '直接过滤' : '加活性炭'}</td><td className="tabular-nums">{filtered[k] ? (k === 'carbon' ? `约 ${pct(colorLeft(true))}` : pct(colorLeft(false))) : '—'}</td><td className={`rounded-r-lg font-semibold ${filtered[k] && k === 'carbon' ? 'text-[#7fe3d4]' : ''}`}>{filtered[k] ? (k === 'carbon' ? '几乎无色' : '红色') : '—'}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'pour'} pulse={next === 'pour'} onClick={() => pour.run()} disabled={busy || done}>过滤</LabButton>
        <LabButton primary={next === 'add'} pulse={next === 'add'} onClick={() => add.run()} disabled={busy || mode === 'carbon' || !filtered.plain}>换一杯，加活性炭搅拌</LabButton>
      </>}
      extras={null}
    />
  )
}
