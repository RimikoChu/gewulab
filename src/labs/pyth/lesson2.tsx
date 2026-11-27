// 勾股定理 · 第 2 课 拼图证明：木工台上一只 7 dm 见方的木框、四块全等的直角三角板。
// 先摆成第一种（四个直角各对着木框的一个角，中间空出边长 c 的斜正方形），再只平移三块，挪成第二种（空出边长 a、b 的两个正方形）。
// 木框没变、四块板没变，空出来的面积就没变：c² = a² + b²。换一套三角板再做一遍。
import { useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, Glove, gripAt, Place, PolySlab, Square, TriPiece, ease, onPlane, sideStyle, useRun } from './parts'
import { FRAME, SETS2, corners, holes, puzzle, type Pose, type Set2 } from './physics'
import { woodDark, woodPlank } from './mats'
import { BENCH_H, ST } from './world'

const KEYS = Object.keys(SETS2) as Set2[]
const K = 0.1                      // 1 dm = 0.1 m
const T = 0.16                     // 三角板厚 1.6 cm（dm）
const O: [number, number, number] = [ST.l2.x - 0.25, BENCH_H + 0.012, ST.l2.z + FRAME * K / 2]
const at = onPlane(O, K)
const TASKS: Task[] = [
  { id: 'one', text: '把四块三角板摆进木框：四个直角各对着一个角', note: `中间空出一个斜着的正方形，面积 ${holes(3, 4).left} dm²，就是 c²` },
  { id: 'two', text: '只挪三块三角板，摆成第二种', note: `空出两个正方形：${holes(3, 4).a2} + ${holes(3, 4).b2} = ${holes(3, 4).left} dm²，就是 a² + b²` },
  { id: 'other', text: '换一套 2 dm × 5 dm 的三角板，再摆、再挪', note: `空出来的还是一样大：${holes(2, 5).a2} + ${holes(2, 5).b2} = ${holes(2, 5).left} dm²` },
]
/** 一摞没用的三角板放在木框右边 */
const pile = (i: number): Pose => ({ x: FRAME + 0.8, y: 0.6 + i * 0.12, th: 0 })
const lift = (i: number) => i * T

export default function Lesson2() {
  const [set, setSet] = useState<Set2>('t34')
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  const [done2, setDone2] = useState<Set2[]>([])
  const T2 = useTasks('gewu:pyth:2', TASKS)
  const m1 = useRun(5.2, () => { setStage(1); if (set === 't34') T2.check(id => id === 'one') })
  const m2 = useRun(4.2, () => { setStage(2); const n = [...done2, set]; setDone2(n); T2.check(id => id === 'two' && n.includes('t34') || id === 'other' && n.includes('t25')) })
  const { a, b } = SETS2[set], h = holes(a, b), s = a + b
  const busy = m1.busy || m2.busy
  const pick = (k: Set2) => { if (busy) return; setSet(k); setStage(0); m1.snap(0); m2.snap(0) }
  const resetAll = () => { setSet('t34'); setStage(0); setDone2([]); m1.snap(0); m2.snap(0); T2.reset() }

  // 四块板现在在哪：第一段从一摞里拿进木框（一块一块，转到位），第二段平移三块
  const P1 = puzzle(a, b, 1), P2 = puzzle(a, b, 2)
  const order2 = [3, 0, 2]          // 第二段先挪第 4 块，再第 1 块、第 3 块；第 2 块不动
  let mover = -1
  const poses = P1.map((p1, i) => {
    let from = pile(i), to = p1, t = 0, y = lift(3 - i)
    if (m1.k < 1) { t = Math.min(1, Math.max(0, m1.k * 4 - i)); if (t > 0 && t < 1) mover = i }
    else { from = p1; to = P2[i]; y = 0; const j = order2.indexOf(i); t = j < 0 ? 0 : Math.min(1, Math.max(0, m2.k * 3 - j)); if (t > 0 && t < 1) mover = i }
    const e = ease(t), th = from.th + (to.th - from.th) * e
    const hy = m1.k < 1 ? y * (1 - e) : 0
    return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, th, up: hy + Math.sin(Math.PI * t) * 0.9 }
  })
  const show1 = stage === 1 && !busy, show2 = stage === 2 && !busy

  const task = T2.current
  const { hint, next }: { hint: string; next: 'set' | 'one' | 'two' | null } = (() => {
    if (!task) return { hint: '木框没变，四块三角板没变，空出来的面积也没变：c² = a² + b²。', next: null }
    const want: Set2 = task.id === 'other' ? 't25' : 't34'
    if (set !== want && !busy) return { hint: '换一套三角板：2 dm × 5 dm', next: 'set' }
    if (m1.busy) return { hint: '三角板一块一块放进木框…', next: null }
    if (m2.busy) return { hint: '三块三角板平移过去，第二块不动…', next: null }
    if (stage === 0) return { hint: '把四块三角板摆进木框：四个直角各对着木框的一个角', next: 'one' }
    if (stage === 1) return { hint: `中间空出的斜正方形边长是 c，面积 ${h.left} dm²。再挪三块，摆成第二种`, next: 'two' }
    return { hint: '换一套三角板：2 dm × 5 dm', next: 'set' }
  })()

  const labels: Label[] = [
    ...(show1 ? [{ id: 'c2', at: at(s / 2, s / 2, 0.03), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <><small>c²</small>{h.left} dm²</> }] : []),
    ...(show2 ? [
      { id: 'a2', at: at(a / 2, a / 2, 0.03), ax: 0.5, className: 'scene-tag -translate-y-1/2', style: sideStyle('a'), children: <><small style={{ color: '#fff' }}>a²</small>{h.a2}</> },
      { id: 'b2', at: at(a + b / 2, a + b / 2, 0.03), ax: 0.5, className: 'scene-tag -translate-y-1/2', style: sideStyle('b'), children: <><small style={{ color: '#3a2600' }}>b²</small>{h.b2}</> },
    ] : []),
    { id: 'sa', at: at(a / 2, -0.55, 0.03), ax: 0.5, className: 'scene-tag -translate-y-1/2', style: sideStyle('a'), children: <><small style={{ color: '#fff' }}>a</small>{a} dm</> },
    { id: 'sb', at: at(a + b / 2, -0.55, 0.03), ax: 0.5, className: 'scene-tag -translate-y-1/2', style: sideStyle('b'), children: <><small style={{ color: '#3a2600' }}>b</small>{b} dm</> },
    { id: 'n1', at: at(s / 2, s + 0.7, 0.03), ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: `木框 ${FRAME} dm 见方` },
  ]
  const glove = mover >= 0 ? gripAt(corners(a, b, poses[mover]), [s / 2, s / 2], 0.45) : null
  return (
    <LabShell title="勾股定理" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T2.banner} onReset={resetAll} hint={hint} actionsLabel="三角板"
      stage={<Place at="l2" labels={labels}>
        <group position={O}>
          <Frame />
          <group scale={[K, K, K]}>
            {/* 空出来的地方：第一种是绿色的斜正方形，第二种是蓝色、橙色两个正方形 */}
            {show1 && <PolySlab pts={[[a, 0], [s, a], [b, s], [0, b]]} h={0.02} y={0.003} color={COL.c} opacity={0.5} emissive={0.15} />}
            {show2 && <>
              <PolySlab pts={[[0, 0], [a, 0], [a, a], [0, a]]} h={0.02} y={0.003} color={COL.a} opacity={0.5} emissive={0.15} />
              <PolySlab pts={[[a, a], [s, a], [s, s], [a, s]]} h={0.02} y={0.003} color={COL.b} opacity={0.5} emissive={0.15} />
            </>}
            {poses.map((p, i) => <group key={`${set}${i}`} position={[p.x, p.up, -p.y]} rotation-y={p.th}><TriPiece a={a} b={b} t={T} tint="#e8d2ae" /></group>)}
          </group>
        </group>
        {glove && <group position={at(glove.u, glove.v, (poses[mover].up + T) * K)} rotation-y={glove.yaw}><Glove arm={0.18} /></group>}
        {/* 一把木工角尺放在木框左边 */}
        <group position={[O[0] - 0.12, O[1] + 0.001, O[2] - 0.05]} rotation-y={Math.PI / 2}><Square /></group>
      </Place>}
      lesson={<LessonBlock no="2" title="拼图证明" concept="面积没变：c² = a² + b²" tasks={TASKS} done={T2.done} current={task?.id}
        theory={<>
          <p>四块全等的直角三角板，两条直角边 a、b，斜边 c。木框是边长 a + b 的正方形。</p>
          <p className="mt-3">第一种摆法：四个直角各对着木框的一个角，中间空出一个边长为 c 的正方形，空出的面积是 c²。</p>
          <p className="mt-3">第二种摆法：只平移，不转动，空出两个正方形，边长分别是 a 和 b，空出的面积是 a² + b²。</p>
          <p className="mt-3">两次都是“木框面积 − 四块三角板的面积”，所以 c² = a² + b²。三角板换成别的大小，这个道理不变。</p>
        </>} />}
      finale={T2.finale && <>
        <p className="text-[17px] leading-snug font-bold">木框和四块三角板都没变，空出来的面积一样：c² = a² + b²</p>
        <p className="mt-1 text-[14px] text-white/70">3 × 4 的板：25 = 9 + 16；2 × 5 的板：29 = 4 + 25。不管三角板多大，都成立。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">空出来的面积</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{stage === 0 || busy ? '—' : stage === 1 ? `${h.left}` : `${h.a2} + ${h.b2}`}<span className="ml-1 text-[15px] font-medium text-white/55">dm²</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="木框" value={`${FRAME} × ${FRAME} = ${h.frame}`} unit="dm²" />
            <ParamTile symbol="四块板" value={`4 × ${a * b / 2} = ${h.tris}`} unit="dm²" />
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5 text-[15px] leading-relaxed tabular-nums">
            <div><span className="text-white/55">第一种：</span>{h.frame} − {h.tris} = <b style={{ color: COL.c }}>c²</b> = {stage >= 1 ? h.left : '?'}</div>
            <div><span className="text-white/55">第二种：</span>{h.frame} − {h.tris} = <b style={{ color: COL.a }}>a²</b> + <b style={{ color: COL.b }}>b²</b> = {stage === 2 ? `${h.a2} + ${h.b2}` : '?'}</div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'one'} onClick={() => { if (stage === 0 && !busy) m1.run() }} disabled={busy || stage !== 0}>摆成第一种</LabButton>
        <LabButton primary pulse={next === 'two'} onClick={() => { if (stage === 1 && !busy) m2.run() }} disabled={busy || stage !== 1}>挪成第二种</LabButton>
      </>}
      extras={<Control label="三角板（两条直角边）"><Segmented label="三角板" pulse={next === 'set'} want={next === 'set' ? 't25' : null} disabled={busy} value={set} onChange={pick} options={KEYS.map(k => ({ value: k, label: SETS2[k].name }))} /></Control>}
    />
  )
}

/** 木框：四根木条用斜角拼成，内边 7 dm 见方，底下垫一块胶合板 */
function Frame() {
  const dark = woodDark(), ply = woodPlank()
  const w = 0.04, h = 0.035, L = FRAME * K
  return <group>
    <RoundedBox args={[L + 2 * w + 0.06, 0.012, L + 2 * w + 0.06]} radius={0.004} position={[L / 2, -0.006, -L / 2]} receiveShadow castShadow><meshStandardMaterial map={ply} roughness={0.75} color="#efe0c4" /></RoundedBox>
    {[[L / 2, -w / 2, L + 2 * w, w], [L / 2, L + w / 2, L + 2 * w, w]].map(([u, v, len, wd], i) => <RoundedBox key={i} args={[len, h, wd]} radius={0.006} position={[u, h / 2, -v]} castShadow receiveShadow><meshStandardMaterial map={dark} roughness={0.6} /></RoundedBox>)}
    {[[-w / 2, L / 2], [L + w / 2, L / 2]].map(([u, v], i) => <RoundedBox key={i} args={[w, h, L]} radius={0.006} position={[u, h / 2, -v]} castShadow receiveShadow><meshStandardMaterial map={dark} roughness={0.6} /></RoundedBox>)}
  </group>
}
