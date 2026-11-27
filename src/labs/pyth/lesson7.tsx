// 勾股定理 · 第 7 课 结绳定直角：一根绳子打 13 个结，分成 12 段等长（每段 0.5 m）。
// 拉成三段，钉在三根木桩上，用木工角尺量最大的那个角：3、4、5 段正好是直角（9 + 16 = 25）；4、4、4 和 2、5、5 都不是。
import { useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, Glove, Place, Rope, Square, Strip, ease, onPlane, sideStyle, useRun } from './parts'
import { KNOT, ROPES, ropeStakes, ropeTri, type RopeKey } from './physics'
import { rng, woodDark } from './mats'
import { ST } from './world'

const KEYS = Object.keys(ROPES) as RopeKey[]
const O: [number, number, number] = [ST.l7.x, 0, ST.l7.z]
const at = onPlane(O, 1)
const name = (k: RopeKey) => ROPES[k].join('、')
const TASKS: Task[] = KEYS.map(k => { const t = ropeTri(k); return { id: k, text: `把绳子拉成 ${name(k)} 段，量最大的角`, note: t.right ? `${t.a}² + ${t.b}² = ${t.c}²：正好是直角` : `${t.a}² + ${t.b}² = ${t.lhs}，${t.c}² = ${t.rhs}，不相等：不是直角` } })

/** 绳子上 13 个结的位置：从 A 出发，A → B（c 段）→ C（a 段）→ A（b 段） */
function knotsOf(k: RopeKey): [number, number][] {
  const [A, B, C] = ropeStakes(k), t = ropeTri(k), out: [number, number][] = []
  const legs: [[number, number], [number, number], number][] = [[A, B, t.c], [B, C, t.a], [C, A, t.b]]
  for (const [p, q, n] of legs) for (let i = 0; i < n; i++) out.push([p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n])
  out.push(A)
  return out
}

export default function Lesson7() {
  const [rope, setRope] = useState<RopeKey>('t345')
  const [stage, setStage] = useState(0)            // 0 绳子散着，1 拉紧了，2 量过了
  const [rows, setRows] = useState<RopeKey[]>([])
  const Tk = useTasks('gewu:pyth:7', TASKS)
  const pull = useRun(2.6, () => setStage(1))
  const meas = useRun(2.0, () => { setStage(2); const n = [...rows, rope]; setRows(n); Tk.check(id => n.includes(id as RopeKey)) })
  const busy = pull.busy || meas.busy
  const t = ropeTri(rope), [A, B, C] = ropeStakes(rope)
  const pick = (k: RopeKey) => { if (busy) return; setRope(k); setStage(0); pull.snap(0); meas.snap(0) }
  const resetAll = () => { setRope('t345'); setStage(0); setRows([]); pull.snap(0); meas.snap(0); Tk.reset() }

  // 绳子：从地上散着的一圈，拉紧成三角形
  const fin = useMemo(() => knotsOf(rope), [rope])
  const loose = useMemo(() => { const r = rng(7), cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3; return fin.map((_, i) => { const a = i / 12 * Math.PI * 2 + 0.4, R = 0.62 + (r() - 0.5) * 0.25; return [cx + R * Math.cos(a) * 1.3, cy + R * Math.sin(a)] as [number, number] }) }, [fin])   // eslint-disable-line react-hooks/exhaustive-deps
  const e = ease(pull.k), done = stage >= 1
  const knots = fin.map(([x, y], i) => { const l = loose[i % 12] ?? loose[0], j = i === 12 ? loose[0] : l; return [j[0] + (x - j[0]) * e, j[1] + (y - j[1]) * e] as [number, number] })
  const pts3 = (y: number) => knots.map(([u, v]) => at(u, v, y))

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'rope' | 'pull' | 'meas' | null } = (() => {
    if (!task) return { hint: '只有三段满足 a² + b² = c² 时，拉出来的才是直角。', next: null }
    if (pull.busy) return { hint: '拉紧…', next: null }
    if (meas.busy) return { hint: '角尺靠上去…', next: null }
    if (rope !== task.id) return { hint: `换成 ${name(task.id as RopeKey)} 段`, next: 'rope' }
    if (stage === 0) return { hint: `把绳子拉成 ${name(rope)} 段，钉在三根木桩上`, next: 'pull' }
    if (stage === 1) return { hint: '用角尺量一量最大的那个角', next: 'meas' }
    return { hint: `换成 ${name(task.id as RopeKey)} 段`, next: 'rope' }
  })()

  // 角尺：直角对着 C，长边贴着 CA；短边贴不贴得住 CB
  const ca = Math.atan2(A[1] - C[1], A[0] - C[0]), cb = Math.atan2(B[1] - C[1], B[0] - C[0])
  const sqIn = ease(Math.min(1, meas.k * 1.4))
  const mid = (p: number[], q: number[]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  const nrm = (p: number[], q: number[], d: number) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [dy / l * d, -dx / l * d] }
  const lab = (id: string, p: number[], q: number[], n: number, s: 'a' | 'b' | 'c', d: number) => { const m = mid(p, q), o = nrm(p, q, d); return { id, at: at(m[0] + o[0], m[1] + o[1], 0.03), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle(s, { opacity: done && !busy ? 1 : 0 }), children: <>{n} 段</> } }
  const labels: Label[] = [
    lab('c', A, B, t.c, 'c', 0.28), lab('a', B, C, t.a, 'a', 0.3), lab('b', C, A, t.b, 'b', 0.3),
    { id: 'ang', at: at(C[0], C[1] + 0.32, 0.03), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: stage === 2 ? 1 : 0, background: t.right ? '#0b8277' : '#c2453b' }, children: t.right ? '正好是直角' : '比直角小' },
    { id: 'n1', at: at(A[0] - 0.2, A[1], 0.03), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '13 个结、12 段的绳子' },
  ]
  return (
    <LabShell title="勾股定理" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="绳子"
      stage={<Place at="l7" labels={labels}>
        {/* 绳子：一圈闭合的麻绳，13 个结 */}
        <Rope pts={pts3(0.012)} r={0.011} color="#cdb88a" knots={pts3(0.014).slice(0, 12)} />
        {/* 三根木桩，拉紧以后钉下去 */}
        {done && [A, B, C].map((p, i) => <group key={i} position={at(p[0], p[1], 0)}><Stake /></group>)}
        {/* 拉紧时三只手套各拽着一个角 */}
        {pull.busy && [0, t.c, t.c + t.a].map((i, j) => <group key={j} position={at(knots[i][0], knots[i][1], 0.02)} rotation-y={j * 2.1}><Glove /></group>)}
        {/* 拉紧以后三边按长短上色：两条短边 a 蓝、b 橙，最长边 c 绿 */}
        {done && !pull.busy && <group position={O}>
          <Strip p={A} q={B} w={0.03} h={0.003} color={COL.c} glow />
          <Strip p={B} q={C} w={0.03} h={0.003} color={COL.a} glow />
          <Strip p={C} q={A} w={0.03} h={0.003} color={COL.b} glow />
        </group>}
        {/* 木工角尺：滑到 C 角上；量完在角里画一道弧：绿色正好贴住，红色贴不住 */}
        {(meas.busy || stage === 2) && <group position={at(C[0] + Math.cos(ca + 0.6) * (1 - sqIn) * 0.8, C[1] + Math.sin(ca + 0.6) * (1 - sqIn) * 0.8, 0.03)} rotation-y={ca}><Square L={0.7} S={0.45} w={0.045} /></group>}
        {stage === 2 && <AngleArc c={C} from={ca} to={cb} ok={t.right} />}
      </Place>}
      lesson={<LessonBlock no="7" title="结绳定直角" concept="a² + b² = c²，就是直角三角形" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p><b className="text-white">勾股定理的逆定理</b>：如果三角形的三边长 a、b、c 满足 a² + b² = c²，那么这个三角形是直角三角形，c 所对的角是直角。</p>
          <p className="mt-3">一根绳子打 13 个结，等分成 12 段，拉成 3、4、5 段的三角形：3² + 4² = 5²，最长边对着的角就是直角。工匠在地上放线、砌墙找直角，就可以这样做。</p>
          <p className="mt-3">能构成直角三角形三边的三个正整数叫<b className="text-white">勾股数</b>，如 3、4、5；5、12、13；把 3、4、5 都乘 2，得 6、8、10，也是勾股数。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">只有 3、4、5 段拉出了直角：3² + 4² = 5²</p>
        <p className="mt-1 text-[14px] text-white/70">三边满足 a² + b² = c²，三角形就是直角三角形，c 对着直角。4、4、4 和 2、5、5 都不满足，就不是。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">最大的角</div>
            <div className="mt-1 text-[36px] leading-none font-bold tracking-tight">{stage === 2 ? (t.right ? '直角' : '不是直角') : '?'}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol={<span style={{ color: COL.a }}>a</span>} value={`${t.a}`} unit={`段 · ${t.a * KNOT} m`} />
            <ParamTile symbol={<span style={{ color: COL.b }}>b</span>} value={`${t.b}`} unit={`段 · ${t.b * KNOT} m`} />
            <ParamTile symbol={<span style={{ color: COL.c }}>c</span>} value={`${t.c}`} unit={`段 · ${t.c * KNOT} m`} />
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5 text-[16px] font-bold tabular-nums">
            <div className="text-[12.5px] font-normal text-white/55">a² + b² 和 c²</div>
            {t.a}² + {t.b}² = {t.lhs} <span className="mx-1 text-white/60">{t.cmp === '=' ? '=' : '≠'}</span> {t.c}² = {t.rhs}
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <tbody>{KEYS.map(k => { const x = ropeTri(k), on = rows.includes(k); return <tr key={k} className={on ? 'text-white' : 'text-white/30'}><td className="py-1">{name(k)}</td><td>{x.lhs} {x.cmp === '=' ? '=' : '≠'} {x.rhs}</td><td className={on ? (x.right ? 'text-right text-[#7fe3d4]' : 'text-right text-[#ff9b9b]') : 'text-right'}>{on ? (x.right ? '直角' : '不是直角') : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'pull'} onClick={() => { if (stage === 0 && !busy) pull.run() }} disabled={busy || stage !== 0}>拉紧绳子</LabButton>
        <LabButton primary pulse={next === 'meas'} onClick={() => { if (stage === 1 && !busy) meas.run() }} disabled={busy || stage !== 1}>用角尺量</LabButton>
      </>}
      extras={<Control label="三段各几段"><Segmented label="三段各几段" pulse={next === 'rope'} want={next === 'rope' ? task!.id as RopeKey : null} disabled={busy} value={rope} onChange={pick} options={KEYS.map(k => ({ value: k, label: name(k) }))} /></Control>}
    />
  )
}

/** 木桩：方截面、顶上被锤子砸毛的一圈 */
function Stake() {
  const wood = woodDark()
  return <group>
    <mesh position={[0, 0.11, 0]} castShadow><boxGeometry args={[0.05, 0.22, 0.05]} /><meshStandardMaterial map={wood} roughness={0.85} /></mesh>
    <mesh position={[0, 0.225, 0]} castShadow><boxGeometry args={[0.056, 0.012, 0.056]} /><meshStandardMaterial color="#6b5038" roughness={0.95} /></mesh>
  </group>
}
/** 角里的一道弧：从 CA 方向转到 CB 方向 */
function AngleArc({ c, from, to, ok }: { c: [number, number]; from: number; to: number; ok: boolean }) {
  const pts: [number, number, number][] = []
  let d = to - from; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
  for (let i = 0; i <= 24; i++) { const a = from + d * i / 24; pts.push(at(c[0] + 0.22 * Math.cos(a), c[1] + 0.22 * Math.sin(a), 0.02)) }
  return <Rope pts={pts} r={0.01} color={ok ? '#35c7b3' : '#ff6b6b'} />
}
