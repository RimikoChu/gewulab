// 相似和测量 · 第 4 课 影子测旗杆：楼前广场上的旗杆和一个学生，太阳斜照，两条影子落在地上。
// 用卷尺量人影、皮尺量旗杆影，按“旗杆高 ∶ 旗杆影 = 身高 ∶ 人影”算出旗杆高；太阳升高后两条影子一起变短，再测一次，旗杆还是一样高。
// 影子是平行光真投出来的；画上去的光线、物高、影长和影子末端对齐。
import { useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { ANG, Arc, Dot, Person, Place, RAY, RightMark, SHADOW, SIDE, Seg, Tape, spot, tag, tagStyle, useFollow, useRun, type V3 } from './parts'
import { PERSON_H, POLE_H, SUN4, elev4, f1, f2, pole4, type Sun4 } from './physics'
import { ST } from './world'

const TASKS: Task[] = [
  { id: 'shadow', text: '量出人影和旗杆影', note: `人影 ${f2(pole4('low').s1)} m，旗杆影 ${f2(pole4('low').s2)} m` },
  { id: 'calc', text: '算出旗杆有多高', note: `旗杆高 = 1.60 × ${f2(pole4('low').s2)} ÷ ${f2(pole4('low').s1)} = ${f1(pole4('low').h)} m` },
  { id: 'again', text: '太阳升高以后，再测一次', note: '两条影子都变短了，算出来还是 12.0 m' },
]
const F: V3 = [ST.flag.x, 0, ST.flag.z]
const [SX, SZ] = SHADOW
const NX = SZ, NZ = -SX                       // 和影子垂直、朝镜头的方向
const P: V3 = [F[0] + NX * 1.4 - SX * 4.6, 0, F[2] + NZ * 1.4 - SZ * 4.6]   // 学生站的地方：旗杆朝太阳一侧、离镜头近一点，两条影子不重叠
const along = (o: V3, d: number, y = 0): V3 => [o[0] + SX * d, y, o[2] + SZ * d]
const YAW = Math.atan2(SZ, -SX)               // 面朝太阳
const VIEW = spot(F[0] + SX * 5.2 + NX * 0.6, 6.6, F[2] + SZ * 5.2 + NZ * 0.6, 24, 13.4, Math.atan2(NX, NZ) - 0.12, 0.3)

export default function Lesson4() {
  const [sun, setSun] = useState<Sun4>('low')
  const [meas, setMeas] = useState<Sun4[]>([])
  const [calc, setCalc] = useState<Sun4[]>([])
  const T = useTasks('gewu:similar:4', TASKS)
  const m = useRun(4.2, () => { const n = [...meas, sun]; setMeas(n); T.check(id => id === 'shadow' && n.includes('low')) })
  const c = useRun(1.4, () => { const n = [...calc, sun]; setCalc(n); T.check(id => (id === 'calc' && n.includes('low')) || (id === 'again' && n.includes('high'))) })
  const tan = useFollow(SUN4[sun].tan, 0.5)          // 太阳高度慢慢变：影子连续变长变短
  const elev = Math.atan(tan) * 180 / Math.PI, settled = Math.abs(tan - SUN4[sun].tan) < 0.003
  const r = pole4(sun), measured = meas.includes(sun), computed = calc.includes(sun)
  const pick = (v: Sun4) => { if (m.busy || c.busy) return; setSun(v); m.snap(0); c.snap(0) }
  const resetAll = () => { setSun('low'); setMeas([]); setCalc([]); m.snap(0); c.snap(0); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'sun' | 'm' | 'c' | null } = (() => {
    if (!task) return { hint: '同一时刻，物高和影长成正比。', next: null }
    if (task.id === 'again' && sun !== 'high') return { hint: '过一会儿，太阳升高了一些', next: 'sun' }
    if (!settled) return { hint: '影子在变短…', next: null }
    if (m.busy) return { hint: '拉卷尺量影子…', next: null }
    if (!measured) return { hint: sun === 'low' ? '同一时刻，量人的影子和旗杆的影子' : '太阳高了，两条影子都短了：马上再量一次', next: 'm' }
    if (c.busy) return { hint: '列比例式…', next: null }
    if (!computed) return { hint: `人影 ${f2(r.s1)} m、旗杆影 ${f2(r.s2)} m：按比例算出旗杆高`, next: 'c' }
    return { hint: '过一会儿，太阳升高了一些', next: 'sun' }
  })()

  // 现在的影长（跟着太阳连续变）；量过、算过的读数只在太阳停稳后显示
  const s1 = PERSON_H / tan, s2 = POLE_H / tan
  const k1 = measured ? 1 : Math.min(1, m.k * 2.2), k2 = measured ? 1 : Math.max(0, (m.k - 0.4) / 0.6)
  const tip1 = along(P, s1), tip2 = along(F, s2), top1: V3 = [P[0], PERSON_H, P[2]], top2: V3 = [F[0], POLE_H, F[2]]
  const show = settled
  const labels: Label[] = [
    { id: 'h1', at: [P[0] + NX * 0.25, PERSON_H / 2, P[2] + NZ * 0.25], ax: 0, className: tag, style: tagStyle(SIDE[0]), children: <><small style={{ color: '#fff' }}>身高</small>1.60 m</> },
    { id: 's1', at: along(P, s1 / 2, 0.02), ax: 0.5, className: `${tag} translate-y-3 transition-opacity`, style: tagStyle(SIDE[1], { opacity: show && k1 >= 1 ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>人影</small>{f2(r.s1)} m</> },
    { id: 'h2', at: [F[0] - 0.3 * SX, POLE_H * 0.55, F[2] - 0.3 * SZ], ax: 0, className: `${tag} ${computed ? 'key' : ''}`, style: computed ? undefined : tagStyle(SIDE[0]), children: <><small style={{ color: '#fff' }}>旗杆</small>{computed && show ? `${f1(r.h)} m` : '?'}</> },
    { id: 's2', at: along(F, s2 * 0.55, 0.02), ax: 0.5, className: `${tag} translate-y-3 transition-opacity`, style: tagStyle(SIDE[1], { opacity: show && k2 >= 1 ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>旗杆影</small>{f2(r.s2)} m</> },
    { id: 'ray', at: [(top2[0] + tip2[0]) / 2 - NX * 0.2, POLE_H / 2 + 0.6, (top2[2] + tip2[2]) / 2 - NZ * 0.2], ax: 1, className: tag, style: tagStyle(RAY), children: '太阳光线' },
    { id: 'n1', at: [P[0] + NX * 0.3, PERSON_H + 0.25, P[2] + NZ * 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '学生' },
    { id: 'n2', at: [F[0], POLE_H + 0.45, F[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '旗杆' },
  ]
  const tape1 = useMemo(() => along(P, 0.06), []), tape2 = useMemo(() => along(F, 0.12), [])
  return (
    <LabShell title="相似和测量" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="卷尺和皮尺"
      stage={<Place view={VIEW} labels={labels} elev={elev} shadow={22}>
        <Person at={P} yaw={YAW} />
        {/* 两个三角形：物高（蓝）、影长（橙）、光线（黄），影子末端的角相等 */}
        <Seg a={[P[0], 0.03, P[2]]} b={top1} color={SIDE[0]} r={0.012} opacity={0.85} />
        <Seg a={[P[0], 0.03, P[2]]} b={[tip1[0], 0.03, tip1[2]]} color={SIDE[1]} r={0.008} />
        <Seg a={top1} b={[tip1[0], 0.03, tip1[2]]} color={RAY} r={0.018} />
        <Seg a={[F[0], 0.03, F[2]]} b={top2} color={SIDE[0]} r={0.03} opacity={0.85} />
        <Seg a={[F[0], 0.03, F[2]]} b={[tip2[0], 0.03, tip2[2]]} color={SIDE[1]} r={0.016} />
        <Seg a={top2} b={[tip2[0], 0.03, tip2[2]]} color={RAY} r={0.04} />
        {/* 光线从更高处照下来：延长一截虚线 */}
        <Seg a={top2} b={[top2[0] - SX * 3, POLE_H + 3 * tan, top2[2] - SZ * 3]} color={RAY} r={0.03} dash={0.25} opacity={0.7} />
        <Seg a={top1} b={[top1[0] - SX * 3, PERSON_H + 3 * tan, top1[2] - SZ * 3]} color={RAY} r={0.015} dash={0.12} opacity={0.7} />
        <Arc v={[tip1[0], 0.03, tip1[2]]} p={[P[0], 0.03, P[2]]} q={top1} rad={0.45} color={ANG[0]} r={0.015} />
        <Arc v={[tip2[0], 0.03, tip2[2]]} p={[F[0], 0.03, F[2]]} q={top2} rad={2.2} color={ANG[0]} r={0.04} />
        <RightMark v={[P[0], 0.03, P[2]]} p={top1} q={tip1} s={0.18} />
        <RightMark v={[F[0], 0.03, F[2]]} p={top2} q={tip2} s={0.7} />
        <Dot at={[tip1[0], 0.03, tip1[2]]} color={SIDE[1]} r={0.05} />
        <Dot at={[tip2[0], 0.03, tip2[2]]} color={SIDE[1]} r={0.12} />
        {/* 量影子：钢卷尺量人影，皮尺量旗杆影 */}
        {k1 > 0 && <Tape a={tape1} b={along(P, 0.06 + (s1 - 0.06) * k1)} />}
        {k2 > 0 && <Tape a={tape2} b={along(F, 0.12 + (s2 - 0.12) * k2)} reel />}
        {k2 > 0 && <Person at={along(F, 0.12 + (s2 - 0.12) * k2 + 0.35)} yaw={YAW} rh={[0.32, 0.55, 0.22]} />}
      </Place>}
      lesson={<LessonBlock no="4" title="影子测旗杆" concept="同一时刻，物高和影长成正比" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>太阳离得很远，照到地上的光线可以看成<b className="text-white">平行的</b>。同一时刻，光线和地面的夹角处处一样。</p>
          <p className="mt-3">人和旗杆都垂直于地面。人、人影、光线围成一个直角三角形；旗杆、旗杆影、光线也围成一个。两个三角形有一个直角、一个角相等，所以<b className="text-white">相似</b>：</p>
          <p className="mt-2 font-formula text-[17px] italic">旗杆高 ∶ 旗杆影 = 身高 ∶ 人影</p>
          <p className="mt-3">两条影子要<b className="text-white">同时</b>量。太阳一动，影子就变了。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">同一时刻，物高和影长成正比：旗杆高 12.0 m</p>
        <p className="mt-1 text-[14px] text-white/70">太阳低时 1.60 × 15.00 ÷ 2.00，太阳高时 1.60 × 9.60 ÷ 1.28，算出来都是 12.0 m。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[17px] italic text-white/65">旗杆高 = 身高 × 旗杆影 ÷ 人影</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{computed && show ? f1(r.h) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="身高" value="1.60" unit="m" />
            <ParamTile symbol="人影" value={measured && show ? f2(r.s1) : '—'} unit="m" />
            <ParamTile symbol="旗杆影" value={measured && show ? f2(r.s2) : '—'} unit="m" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">太阳</th><th className="font-normal">人影</th><th className="font-normal">旗杆影</th><th className="font-normal">旗杆高</th></tr></thead>
            <tbody>{(Object.keys(SUN4) as Sun4[]).map(x => { const q = pole4(x); return <tr key={x} className={calc.includes(x) ? 'text-white' : 'text-white/30'}><td className="py-1">{x === 'low' ? '低' : '高'}</td><td className="text-center">{meas.includes(x) ? f2(q.s1) : '—'}</td><td className="text-center">{meas.includes(x) ? f2(q.s2) : '—'}</td><td className="text-center">{calc.includes(x) ? f1(q.h) : '—'}</td></tr> })}</tbody>
          </table>
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">太阳高度角约 {Math.round(elev4(sun))}°</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'm'} onClick={m.run} disabled={!settled || m.busy || c.busy || measured}>量影子</LabButton>
        <LabButton primary pulse={next === 'c'} onClick={c.run} disabled={!measured || c.busy || computed}>算旗杆高</LabButton>
      </>}
      extras={<Control label="太阳"><Segmented label="太阳" pulse={next === 'sun'} want={next === 'sun' ? 'high' : null} disabled={m.busy || c.busy} value={sun} onChange={pick} options={(Object.keys(SUN4) as Sun4[]).map(x => ({ value: x, label: SUN4[x].name }))} /></Control>}
    />
  )
}
