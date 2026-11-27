// 相似和测量 · 第 7 课 测角仪测塔高：公园步道尽头的七层古塔。学生站在塔西边 30 m（再退到 50 m），
// 先用皮尺量到塔基、加上塔基半宽得到到塔中心的距离；再举起自制测角仪（量角器 + 吸管 + 铅垂线）瞄准塔刹顶，读铅垂线所在的刻度，就是仰角；
// 塔高 = 眼高 + 距离 × tan仰角。读数时镜头推近到测角仪。
import { useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { ANG, Arc, Clinometer, Dot, Person, Place, RAY, RightMark, SIDE, Seg, Tape, ease, spot, tag, tagStyle, useRun, type V3 } from './parts'
import { D7, EYE, TOWER, f1, f2, tower7 } from './physics'
import { ST, TER } from './world'

type D = '30' | '50'
const R30 = tower7(30), R50 = tower7(50)
const TASKS: Task[] = [
  { id: 'a30', text: '站在离塔 30 m 处，用测角仪测出仰角', note: `仰角 ${R30.read}°` },
  { id: 'h30', text: '算出塔高', note: `1.50 + 30 × tan${R30.read}° = 1.50 + 30 × ${f2(R30.tan)} = ${f1(R30.h)} m` },
  { id: 'd50', text: '退到 50 m 处再测一次', note: `仰角 ${R50.read}°，tan${R50.read}° ≈ ${f2(R50.tan)}，塔高还是 ${f1(R50.h)} m` },
]
const TX = ST.tower.x, TZ = ST.tower.z
const W = (x: number, y: number): V3 => [x, TER + y, TZ]   // 站的那条线：塔中心往西

export default function Lesson7() {
  const [d, setD] = useState<D>('30')
  const [log, setLog] = useState<string[]>([])            // 'm30'、'a30'、'h30'…
  const T = useTasks('gewu:similar:7', TASKS)
  const add = (s: string) => { const n = [...log, s]; setLog(n); T.check(id => id === 'd50' ? n.includes('h50') : n.includes(id)) }
  const tape = useRun(2.6, () => add(`m${d}`)), aim = useRun(2.4, () => add(`a${d}`)), calc = useRun(1.6, () => add(`h${d}`))
  const has = (s: string) => log.includes(`${s}${d}`)
  const busy = tape.busy || aim.busy || calc.busy
  const r = d === '30' ? R30 : R50, D0 = r.D
  const pick = (v: D) => { if (busy) return; setD(v); tape.snap(0); aim.snap(0); calc.snap(0) }
  const resetAll = () => { setD('30'); setLog([]); tape.snap(0); aim.snap(0); calc.snap(0); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'd' | 'tape' | 'aim' | 'calc' | null } = (() => {
    if (!task) return { hint: '塔高 = 眼高 + 距离 × tan仰角。', next: null }
    if (busy) return { hint: tape.busy ? '拉皮尺量到塔基…' : aim.busy ? '从吸管里瞄准塔刹顶…' : '解直角三角形…', next: null }
    if (task.id === 'd50' && d !== '50') return { hint: '退到离塔 50 m 处', next: 'd' }
    if (!has('m')) return { hint: '先量出到塔中心的距离：皮尺量到塔基，再加塔基半宽', next: 'tape' }
    if (!has('a')) return { hint: '举起测角仪，从吸管里瞄准塔刹顶', next: 'aim' }
    if (!has('h')) return { hint: `铅垂线指着 ${r.read}°：仰角 ${r.read}°，算塔高`, next: 'calc' }
    return { hint: '退到离塔 50 m 处', next: 'd' }
  })()

  const px = TX - D0, E = W(px + 0.09, EYE), top = W(TX, TOWER.h), axisEye = W(TX, EYE)
  const pitch = r.exact * Math.PI / 180 * (has('a') ? 1 : ease(aim.k))
  const C: V3 = [E[0] + Math.cos(pitch) * 0.2, E[1] - 0.005 + Math.sin(pitch) * 0.2 - 0.02, TZ]
  const close = (aim.busy || has('a')) && !has('h') && !calc.busy
  const pf = r.exact * Math.PI / 180, Cx = E[0] + Math.cos(pf) * 0.2, Cy = E[1] + Math.sin(pf) * 0.2 - 0.025   // 举到位以后测角仪在哪：近景对着它
  const view = useMemo(() => close ? spot(Cx + 0.04, Cy - 0.05, TZ, 0.8, 0.52, 0.7, 0.05) : spot(TX - D0 / 2 + 1.5, TER + 15.4, TZ, D0 + 16, 35, 0.04, 0.06), [close, D0, Cx, Cy])
  const shown = has('h') || calc.busy, kc = has('h') ? 1 : calc.k
  const tk = has('m') ? 1 : tape.k
  const labels: Label[] = close ? [
    { id: 'rd', at: [C[0] + 0.16, C[1] - 0.12, TZ], ax: 0, className: `${tag} key transition-opacity`, style: { opacity: has('a') ? 1 : 0 }, children: <><small>铅垂线读数 · 仰角</small>{r.read}°</> },
    { id: 'n1', at: [C[0] - 0.1, C[1] + 0.06, TZ], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '吸管（瞄准管）' },
    { id: 'n2', at: [C[0] - 0.02, C[1] - 0.13, TZ], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '铅垂线' },
  ] : [
    { id: 'H', at: W(TX + 5.2, TOWER.h * 0.6), ax: 0, className: `${tag} ${has('h') ? 'key' : ''}`, style: has('h') ? undefined : tagStyle(SIDE[0]), children: <><small style={{ color: '#fff' }}>塔高</small>{has('h') ? `${f1(r.h)} m` : '?'}</> },
    { id: 'D', at: W(px + D0 / 2, 0), ax: 0.5, className: `${tag} translate-y-4 transition-opacity`, style: tagStyle(SIDE[1], { opacity: has('m') ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>到塔中心</small>{f2(r.tape)} + {f2(TOWER.half)} = {f2(D0)} m</> },
    { id: 'A', at: W(px + 4.2, EYE + 1.2), ax: 0, className: `${tag} transition-opacity`, style: tagStyle(ANG[0], { opacity: has('a') ? 1 : 0 }), children: `仰角 ${r.read}°` },
    { id: 'up', at: W(TX - 4.6, (EYE + TOWER.h) / 2), ax: 1, className: `${tag} transition-opacity`, style: tagStyle(SIDE[0], { opacity: kc >= 1 ? 1 : 0 }), children: <>{D0} × {f2(r.tan)} = {f1(r.rise)} m</> },
    { id: 'e', at: W(px - 0.6, EYE / 2), ax: 1, className: tag, style: tagStyle(SIDE[0]), children: <><small style={{ color: '#fff' }}>眼高</small>1.50 m</> },
    { id: 'n', at: W(TX, TOWER.h + 1.4), ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '塔刹顶' },
  ]
  return (
    <LabShell title="相似和测量" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="皮尺和测角仪"
      stage={<Place view={view} labels={labels} elev={47} shadow={close ? 6 : 40}>
        <Person at={W(px, 0)} yaw={0} pitch={pitch * 0.85}
          rh={has('a') || aim.k > 0 ? [0.09 + 0.11 * Math.cos(pitch), EYE - 0.035 + 0.11 * Math.sin(pitch), -0.045] : undefined}
          lh={has('a') || aim.k > 0 ? [0.09 + 0.29 * Math.cos(pitch), EYE - 0.035 + 0.29 * Math.sin(pitch), -0.045] : undefined} />
        {(has('a') || aim.k > 0) && <Clinometer at={C} yaw={0} pitch={pitch} />}
        {/* 皮尺：从学生脚下拉到塔基边 */}
        {tk > 0 && <Tape a={W(px + 0.2, 0.01)} b={W(px + 0.2 + (D0 - TOWER.half - 0.2) * tk, 0.01)} reel />}
        {has('m') && <Seg a={W(TX - TOWER.half, 0.05)} b={W(TX, 0.05)} color={SIDE[1]} r={0.05} dash={0.3} />}
        {/* 视线、水平线、塔身：直角三角形 */}
        {(has('a') || aim.busy) && <Seg a={E} b={[E[0] + (top[0] - E[0]) * (has('a') ? 1 : aim.k), E[1] + (top[1] - E[1]) * (has('a') ? 1 : aim.k), TZ]} color={RAY} r={close ? 0.0025 : 0.06} opacity={0.9} />}
        {has('a') && !close && <>
          <Seg a={E} b={axisEye} color={SIDE[1]} r={0.06} />
          <Arc v={E} p={axisEye} q={top} rad={3.2} color={ANG[0]} r={0.06} />
          <Seg a={W(TX, 0.05)} b={axisEye} color={SIDE[0]} r={0.06} opacity={0.7} dash={0.15} />
        </>}
        {shown && <>
          <Seg a={axisEye} b={W(TX, EYE + (TOWER.h - EYE) * ease(Math.min(1, kc * 1.2)))} color={SIDE[0]} r={0.08} />
          <RightMark v={axisEye} p={top} q={E} s={1.6} />
        </>}
        {!close && <Dot at={top} color={RAY} r={0.25} />}
      </Place>}
      lesson={<LessonBlock no="7" title="测角仪测塔高" concept="塔高 = 眼高 + 距离 × tan仰角" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>视线在水平线上方，视线和水平线的夹角叫<b className="text-white">仰角</b>。</p>
          <p className="mt-3">自制测角仪：量角器直边上粘一根吸管，圆心挂一根铅垂线。从吸管里瞄准塔顶时，直边抬起了多少度，铅垂线就偏离量角器中间那道红线多少度，读出来就是仰角。</p>
          <p className="mt-3">过眼睛的水平线、塔身、视线组成直角三角形：<span className="font-formula italic">塔顶比眼睛高 = 距离 × tanα</span>，再加上眼高 1.50 m。tan 值保留两位小数。</p>
          <p className="mt-3">距离要量到塔的中心（塔刹正下方）：皮尺量到塔基，再加塔基半宽。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">塔高 = 眼高 + 距离 × tan仰角 = 31.5 m</p>
        <p className="mt-1 text-[14px] text-white/70">30 m 处仰角 45°：1.50 + 30 × 1.00；50 m 处仰角 31°：1.50 + 50 × 0.60。别忘了加眼高。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[17px] italic text-white/65">h = 1.50 + D · tanα</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{has('h') ? f1(r.h) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="D" value={has('m') ? f2(D0) : '—'} unit="m · 到塔中心" />
            <ParamTile symbol="α" value={has('a') ? `${r.read}°` : '—'} unit="仰角" />
            <ParamTile symbol="tanα" value={has('a') ? f2(r.tan) : '—'} unit="两位小数" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">站在</th><th className="font-normal">仰角</th><th className="font-normal">tan</th><th className="font-normal">塔高</th></tr></thead>
            <tbody>{D7.map(x => { const q = tower7(x), k = String(x); return <tr key={x} className={log.includes(`h${k}`) ? 'text-white' : 'text-white/30'}><td className="py-1">{x} m</td><td className="text-center">{log.includes(`a${k}`) ? `${q.read}°` : '—'}</td><td className="text-center">{log.includes(`a${k}`) ? f2(q.tan) : '—'}</td><td className="text-center">{log.includes(`h${k}`) ? f1(q.h) : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'tape'} onClick={tape.run} disabled={busy || has('m')}>量距离</LabButton>
        <LabButton pulse={next === 'aim'} onClick={aim.run} disabled={busy || !has('m') || has('a')}>瞄塔顶</LabButton>
        <LabButton primary pulse={next === 'calc'} onClick={calc.run} disabled={busy || !has('a') || has('h')}>算塔高</LabButton>
      </>}
      extras={<Control label="站在"><Segmented label="站在" pulse={next === 'd'} want={next === 'd' ? '50' : null} disabled={busy} value={d} onChange={pick} options={D7.map(x => ({ value: String(x) as D, label: `离塔 ${x} m` }))} /></Control>}
    />
  )
}
