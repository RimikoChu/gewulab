// 相似和测量 · 第 6 课 斜坡上的比：东边挡土墙上的两段护坡，一段 30°、一段 45°。坡脚立一根标杆，
// 从坡上离坡脚 2 m、4 m 的两处各拉一条水平的卷尺到标杆，读出竖直高和水平长。两个直角三角形相似，对边、邻边、斜边的比都一样：
// 这就是这个角的正弦、余弦、正切。竖直高比水平长就是坡度。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { ANG, Arc, Dot, Person, Place, RangeRod, RightMark, SIDE, Seg, Tape, spot, tag, tagStyle, useRun, type V3 } from './parts'
import { AT6, SLOPE6, f2, slope6, trig6, type Slope6 } from './physics'
import { ST, toeX } from './world'

const KEYS = Object.keys(SLOPE6) as Slope6[]
const TG30 = trig6('s30'), TG45 = trig6('s45')
const TASKS: Task[] = [
  { id: 'm30', text: '30° 坡：在 2 m、4 m 两处量竖直高和水平长', note: '1.00 ÷ 2 = 2.00 ÷ 4：两处的比一样' },
  { id: 'c30', text: '算出 30° 的正弦、余弦、正切', note: `sin30° ≈ ${f2(TG30.sin)}，cos30° ≈ ${f2(TG30.cos)}，tan30° ≈ ${f2(TG30.tan)}` },
  { id: 's45', text: '换 45° 坡：再量两处、再算', note: `sin45° ≈ ${f2(TG45.sin)}，cos45° ≈ ${f2(TG45.cos)}，tan45° = ${f2(TG45.tan)}` },
]
/** 量的那一处剖面：护坡靠镜头的那一头；30° 坡从北边看，45° 坡从南边看（两段坡挨着，不互相挡） */
const ZM: Record<Slope6, number> = { s30: ST.s30.z0 + 0.35, s45: ST.s45.z1 - 0.35 }
const FACE: Record<Slope6, number> = { s30: -1, s45: 1 }          // 镜头在剖面的哪一侧（z 的正负）
const VIEW6 = Object.fromEntries(KEYS.map(k => [k, spot(toeX(SLOPE6[k].a) + 1.3, 1.5, ZM[k], 7.4, 4.6, FACE[k] > 0 ? -0.42 : Math.PI + 0.42, 0.1)])) as Record<Slope6, ReturnType<typeof spot>>

export default function Lesson6() {
  const [k, setK] = useState<Slope6>('s30')
  const [meas, setMeas] = useState<string[]>([])     // 's30:2' 这样
  const [calc, setCalc] = useState<Slope6[]>([])
  const T = useTasks('gewu:similar:6', TASKS)
  const check = (ms: string[], cs: Slope6[]) => T.check(id => id === 'm30' ? ms.includes('s30:2') && ms.includes('s30:4') : id === 'c30' ? cs.includes('s30') : cs.includes('s45'))
  const [at, setAt] = useState<number>(2)
  const run = useRun(2, () => { const n = [...meas, `${k}:${at}`]; setMeas(n); check(n, calc) })
  const comp = useRun(1.4, () => { const n = [...calc, k]; setCalc(n); check(meas, n) })
  const has = (s: number) => meas.includes(`${k}:${s}`)
  const busy = run.busy || comp.busy, both = has(2) && has(4), computed = calc.includes(k)
  const go = (s: number) => { if (busy || has(s)) return; setAt(s); setTimeout(run.run, 0) }
  const pick = (v: Slope6) => { if (busy) return; setK(v); run.snap(0); comp.snap(0) }
  const resetAll = () => { setK('s30'); setMeas([]); setCalc([]); run.snap(0); comp.snap(0); T.reset() }
  const tg = trig6(k), a = SLOPE6[k].a

  const task = T.current
  const { hint, next }: { hint: string; next: 'k' | 'a' | 'b' | 'c' | null } = (() => {
    if (!task) return { hint: '角一定，对边、邻边、斜边的比就一定。', next: null }
    if (busy) return { hint: run.busy ? '拉平卷尺，读标杆上的高度…' : '算三个比…', next: null }
    if (task.id === 's45' && k !== 's45') return { hint: '换到 45° 的那段坡', next: 'k' }
    if (!has(2)) return { hint: `在 ${SLOPE6[k].name}上离坡脚 2 m 处，量竖直高和水平长`, next: 'a' }
    if (!has(4)) return { hint: '再到离坡脚 4 m 处量一次', next: 'b' }
    if (!computed) return { hint: '两处都量好了：算对边、邻边、斜边的比', next: 'c' }
    return { hint: '换到 45° 的那段坡', next: 'k' }
  })()

  // 剖面上的坐标：沿坡往上是 +x，高度 y
  const toe = toeX(a), zm = ZM[k], f = FACE[k]
  const W = (x: number, y: number): V3 => [toe + x, y, zm]
  const pts = AT6.map(s => ({ ...slope6(k, s), on: has(s) || (run.busy && at === s) }))
  const prog = (s: number) => has(s) ? 1 : run.busy && at === s ? run.k : 0
  const labels: Label[] = []
  for (const p of pts) {
    const q = prog(p.s); if (q <= 0) continue
    const op = q >= 1 ? 1 : 0
    labels.push(
      { id: `h${p.s}`, at: W(-0.12, p.h - 0.18), ax: f > 0 ? 1 : 0, className: `${tag} transition-opacity`, style: tagStyle(SIDE[0], { opacity: op }), children: <><small style={{ color: '#fff' }}>高</small>{f2(p.h)}</> },
      { id: `l${p.s}`, at: W(p.l / 2, p.h + 0.12), ax: 0.5, className: `scene-tag -translate-y-full transition-opacity`, style: tagStyle(SIDE[1], { opacity: op }), children: <><small style={{ color: '#3a2600' }}>平</small>{f2(p.l)}</> },
      { id: `s${p.s}`, at: W(p.l * 0.62 + 0.2 * Math.sin(a * Math.PI / 180), p.h * 0.62 - 0.2 * Math.cos(a * Math.PI / 180)), ax: 0.5, className: `${tag} transition-opacity`, style: tagStyle(SIDE[2], { opacity: op }), children: <><small style={{ color: '#fff' }}>沿坡</small>{p.s}.00</> },
    )
  }
  labels.push({ id: 'ang', at: W(1.0, 0.16), ax: 0.5, className: tag, style: tagStyle(ANG[0]), children: `${a}°` })
  labels.push({ id: 'n1', at: W(-0.1, 2.9), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '坡脚的标杆' })
  if (computed) labels.push({ id: 'r', at: W(-1.3, 2.3), ax: 0.5, className: `${tag} key`, children: <><small>坡度 i</small>1 ∶ {f2(tg.m)}</> })
  const view = VIEW6[k]
  return (
    <LabShell title="相似和测量" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="卷尺和标杆"
      stage={<Place view={view} labels={labels} elev={50} shadow={8}>
        <RangeRod at={W(-0.02, 0)} h={3} />
        <Person at={[toe - 0.42, 0, zm - f * 0.45]} yaw={0} rh={[0.4, 1.2, f * 0.36]} lh={[0.4, 0.98, f * 0.38]} />
        <Arc v={W(0, 0.04)} p={W(1, 0.04)} q={W(Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180) + 0.04)} rad={0.55} color={ANG[0]} r={0.018} />
        {pts.map(p => { const q = prog(p.s); if (q <= 0) return null
          const P = W(p.l, p.h + 0.02), R = W(0, p.h + 0.02), end = W(p.l * (1 - q), p.h + 0.02)
          return <group key={p.s}>
            {/* 坡上的木桩，卷尺从桩顶水平拉到标杆 */}
            <mesh position={[P[0], P[1] - 0.05, P[2]]} castShadow><cylinderGeometry args={[0.025, 0.02, 0.22, 10]} /><meshStandardMaterial color="#a77b4f" roughness={0.8} /></mesh>
            <Tape a={P} b={end} up={[0, 0, f]} />
            {q >= 1 && <>
              <Seg a={R} b={W(0, 0.03)} color={SIDE[0]} r={0.014} />
              <Seg a={P} b={R} color={SIDE[1]} r={0.014} />
              <Seg a={P} b={W(0, 0.03)} color={SIDE[2]} r={0.014} />
              <RightMark v={R} p={P} q={W(0, 0)} s={0.14} />
              <Arc v={P} p={R} q={W(0, 0.03)} rad={0.35} color={ANG[0]} r={0.012} />
              <Dot at={P} color="#ffffff" r={0.03} />
            </>}
          </group> })}
      </Place>}
      lesson={<LessonBlock no="6" title="斜坡上的比" concept="角一定，对边、邻边、斜边的比就一定" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在直角三角形里，锐角 A 的<b className="text-white">对边</b>比斜边叫 A 的正弦 sin A，<b className="text-white">邻边</b>比斜边叫余弦 cos A，对边比邻边叫正切 tan A。</p>
          <p className="mt-3">坡上两处量出的直角三角形，有一个锐角都等于坡角，所以相似，三边的比相等：比值只由角的大小决定。</p>
          <p className="mt-3">坡面的竖直高度 h 和水平长度 l 的比叫<b className="text-white">坡度</b> i = h ∶ l，也就是坡角的正切。界面上的三角函数值都保留两位小数。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">角一定，对边、邻边、斜边的比就一定：这就是 sin、cos、tan</p>
        <p className="mt-1 text-[14px] text-white/70">sin30° ≈ 0.50、cos30° ≈ 0.87、tan30° ≈ 0.58；sin45° = cos45° ≈ 0.71、tan45° = 1.00。坡度 = 竖直高 ÷ 水平长 = tan坡角。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center"><div className="text-[13px] text-white/60">坡角</div><div className="mt-1 text-[40px] leading-none font-bold tabular-nums" style={{ color: ANG[0] }}>{a}°</div></div>
          <table className="mt-4 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">沿坡</th><th className="font-normal" style={{ color: SIDE[0] }}>高</th><th className="font-normal" style={{ color: SIDE[1] }}>平</th><th className="font-normal">高 ÷ 沿坡</th></tr></thead>
            <tbody>{pts.map(p => <tr key={p.s} className={has(p.s) ? 'text-white' : 'text-white/30'}><td className="py-1">{p.s}.00</td><td className="text-center">{has(p.s) ? f2(p.h) : '—'}</td><td className="text-center">{has(p.s) ? f2(p.l) : '—'}</td><td className="text-center">{has(p.s) ? f2(p.h / p.s) : '—'}</td></tr>)}</tbody>
          </table>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol={`sin${a}°`} value={computed ? f2(tg.sin) : '—'} unit="对边 ÷ 斜边" />
            <ParamTile symbol={`cos${a}°`} value={computed ? f2(tg.cos) : '—'} unit="邻边 ÷ 斜边" />
            <ParamTile symbol={`tan${a}°`} value={computed ? f2(tg.tan) : '—'} unit="对边 ÷ 邻边" />
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">保留两位小数。坡度 i = 高 ∶ 平{computed ? ` = 1 ∶ ${f2(tg.m)}` : ''}</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'a'} onClick={() => go(2)} disabled={busy || has(2)}>量 2 m 处</LabButton>
        <LabButton pulse={next === 'b'} onClick={() => go(4)} disabled={busy || !has(2) || has(4)}>量 4 m 处</LabButton>
        <LabButton primary pulse={next === 'c'} onClick={comp.run} disabled={busy || !both || computed}>算三个比</LabButton>
      </>}
      extras={<Control label="护坡"><Segmented label="护坡" pulse={next === 'k'} want={next === 'k' ? 's45' : null} disabled={busy} value={k} onChange={pick} options={KEYS.map(x => ({ value: x, label: SLOPE6[x].name }))} /></Control>}
    />
  )
}
