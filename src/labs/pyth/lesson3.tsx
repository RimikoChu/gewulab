// 勾股定理 · 第 3 课 赵爽弦图：四角亭的方石桌上，四块朱红的直角三角形（朱实）围着一块黄色小正方形（黄实），拼成边长为 c 的大正方形。
// 先拼出弦图，算面积：4 × ½ab + (b − a)² = c²；再把两块三角形各绕一个顶点转 90°（出入相补），拼成边长 a、b 的两个正方形。
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, Glove, gripAt, Place, PolySlab, Strip, TriPiece, ease, onPlane, sideStyle, useRun } from './parts'
import { ZHAO, corners, zhao, type Pose } from './physics'
import { ST, TABLE_TOP } from './world'

const { a, b } = ZHAO, Z = zhao(a, b), S = a + b
const K = 0.1, T = 0.14
const O: [number, number, number] = [ST.l3.x - S * K / 2, TABLE_TOP + 0.001, ST.l3.z + S * K / 2]
const at = onPlane(O, K)
const TASKS: Task[] = [
  { id: 'build', text: '用四块朱红三角形和一块黄色小正方形拼出弦图', note: '四条斜边围成一个大正方形，边长是 c' },
  { id: 'area', text: '算一算大正方形的面积', note: `4 × ${Z.tri} + ${Z.inner} = ${Z.big} dm²：4 × ½ab + (b − a)² = c²` },
  { id: 'move', text: '把两块三角形各转 90°，拼成两个正方形', note: `${Z.a2} + ${Z.b2} = ${Z.big}：a² + b² = c²` },
]
/** 开始时四块散放在桌上：从弦图的位置往外挪开一点、歪一点 */
const loose: Pose[] = Z.xian.map((p, i) => { const c = corners(a, b, p), cx = (c[0][0] + c[1][0] + c[2][0]) / 3 - S / 2, cy = (c[0][1] + c[1][1] + c[2][1]) / 3 - S / 2, l = Math.hypot(cx, cy) || 1; return { x: p.x + cx / l * 1.9, y: p.y + cy / l * 1.9, th: p.th + (i % 2 ? 0.35 : -0.3) } })
/** 绕点 (px, py) 转 φ 以后的位置 */
const spin = (p: Pose, [px, py]: [number, number], f: number): Pose => { const c = Math.cos(f), s = Math.sin(f), dx = p.x - px, dy = p.y - py; return { x: px + dx * c - dy * s, y: py + dx * s + dy * c, th: p.th + f } }

export default function Lesson3() {
  const [stage, setStage] = useState(0)            // 0 散着，1 拼好，2 算过面积，3 转过去了
  const Tk = useTasks('gewu:pyth:3', TASKS)
  const build = useRun(3.2, () => { setStage(1); Tk.check(id => id === 'build') })
  const area = useRun(2.4, () => { setStage(2); Tk.check(id => id === 'area') })
  const turn = useRun(4.4, () => { setStage(3); Tk.check(id => id === 'move') })
  const busy = build.busy || area.busy || turn.busy
  const resetAll = () => { setStage(0); build.snap(0); area.snap(0); turn.snap(0); Tk.reset() }

  // 四块现在的位置：先从散放的地方合拢；再第 1、2 块依次绕顶点转过去
  let mover = -1
  const poses: (Pose & { up: number })[] = Z.xian.map((p, i) => {
    if (build.k < 1) { const t = ease(Math.min(1, Math.max(0, build.k * 1.6 - i * 0.2))); if (t > 0 && t < 1) mover = i; return { x: loose[i].x + (p.x - loose[i].x) * t, y: loose[i].y + (p.y - loose[i].y) * t, th: loose[i].th + (p.th - loose[i].th) * t, up: Math.sin(Math.PI * t) * 0.5 } }
    if (i > 1) return { ...p, up: 0 }
    const t = ease(Math.min(1, Math.max(0, turn.k * 2 - i))); if (t > 0 && t < 1) mover = i
    return { ...spin(p, Z.pivots[i], Z.turn[i] * t), up: Math.sin(Math.PI * t) * 0.35 }
  })
  const innerUp = build.k < 1 ? (1 - ease(Math.min(1, build.k * 1.3))) * 2.2 : 0
  const cent = (p: Pose) => { const c = corners(a, b, p); return [(c[0][0] + c[1][0] + c[2][0]) / 3, (c[0][1] + c[1][1] + c[2][1]) / 3] as [number, number] }

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'build' | 'area' | 'turn' | null } = (() => {
    if (!task) return { hint: '弦图算出来是 c²，转过去拼成的是 a² + b²，用的是同样五块：a² + b² = c²。', next: null }
    if (build.busy) return { hint: '四块三角形围过来…', next: null }
    if (area.busy) return { hint: '四块三角形加一块小正方形…', next: null }
    if (turn.busy) return { hint: '两块三角形绕着顶点转过去…', next: null }
    if (stage === 0) return { hint: '把四块三角形的斜边朝外围成一圈，中间放黄色小正方形', next: 'build' }
    if (stage === 1) return { hint: '算一算大正方形的面积：四块三角形加中间的小正方形', next: 'area' }
    return { hint: '出入相补：把上面两块三角形各绕一个顶点转 90°', next: 'turn' }
  })()

  const showArea = area.k > 0.3 && stage < 3 && !turn.busy, sq = stage === 3
  const labels: Label[] = [
    ...(showArea ? [
      ...Z.xian.map((p, i) => { const [u, v] = cent(p); return { id: `t${i}`, at: at(u, v, 0.03), ax: 0.5, className: 'scene-tag -translate-y-1/2', children: <><small>½ab</small>{Z.tri}</> } }),
      { id: 'in', at: at(a + (b - a) / 2, a + (b - a) / 2 + 0.0, 0.03), ax: 0, className: 'scene-tag -translate-y-1/2', style: { background: '#e9b824', color: '#3a2600', boxShadow: 'none', transform: 'translate(14px,-50%)' }, children: <><small style={{ color: '#3a2600' }}>(b−a)²</small>{Z.inner}</> },
    ] : []),
    { id: 'big', at: at(b, S + 0.3, 0.03), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: stage >= 2 && !sq && !turn.busy ? 1 : 0 }, children: <><small>c²</small>4 × {Z.tri} + {Z.inner} = {Z.big} dm²</> },
    ...(sq ? [
      { id: 'A', at: at(b + a / 2, a / 2, 0.03), ax: 0.5, className: 'scene-tag -translate-y-1/2', style: sideStyle('a'), children: <><small style={{ color: '#fff' }}>a²</small>{Z.a2}</> },
      { id: 'B', at: at(b / 2, b / 2 + 0.9, 0.03), ax: 0.5, className: 'scene-tag -translate-y-1/2', style: sideStyle('b'), children: <><small style={{ color: '#3a2600' }}>b²</small>{Z.b2}</> },
    ] : []),
    { id: 'sa', at: at(S + 0.35, a / 2, 0.03), ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('a', { opacity: stage >= 1 && !busy ? 1 : 0 }), children: <><small style={{ color: '#fff' }}>a</small>{a} dm</> },
    { id: 'sb', at: at(-0.35, b / 2, 0.03), ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('b', { opacity: stage >= 1 && !busy ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>b</small>{b} dm</> },
    { id: 'n1', at: at(S / 2, -0.9, 0.03), ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '朱实（四块三角形）· 黄实（小正方形）' },
  ]
  const g = mover >= 0 ? gripAt(corners(a, b, poses[mover]), [S / 2, S / 2], 0.45) : null
  return (
    <LabShell title="勾股定理" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="弦图"
      stage={<Place at="l3" labels={labels}>
        <group position={O}>
          <group scale={[K, K, K]}>
            {/* 转过去以后：两个正方形的边框（a 蓝、b 橙） */}
            {sq && <>
              {([[[b, 0], [S, 0]], [[S, 0], [S, a]], [[S, a], [b, a]], [[b, a], [b, 0]]] as [number, number][][]).map(([p, q], i) => <Strip key={`a${i}`} p={p} q={q} w={0.12} h={0.01} y={T + 0.02} color={COL.a} glow />)}
              {([[[0, 0], [b, 0]], [[b, 0], [b, b]], [[b, b], [0, b]], [[0, b], [0, 0]]] as [number, number][][]).map(([p, q], i) => <Strip key={`b${i}`} p={p} q={q} w={0.12} h={0.01} y={T + 0.03} color={COL.b} glow />)}
            </>}
            {/* 弦图拼好、算面积时：大正方形的绿色边框 */}
            {stage >= 1 && stage < 3 && !turn.busy && Z.bigCorners.map((p, i) => <Strip key={`c${i}`} p={p} q={Z.bigCorners[(i + 1) % 4]} w={0.12} h={0.01} y={T + 0.02} color={COL.c} glow />)}
            {poses.map((p, i) => <group key={i} position={[p.x, p.up, -p.y]} rotation-y={p.th}><TriPiece a={a} b={b} t={T} tint="#b8321f" map={false} /></group>)}
            {/* 黄实：中间的小正方形 */}
            <group position={[0, innerUp, 0]}><PolySlab pts={[[a, a], [b, a], [b, b], [a, b]]} h={T} color="#e9b824" /></group>
          </group>
        </group>
        {g && <group position={at(g.u, g.v, (poses[mover].up + T) * K)} rotation-y={g.yaw}><Glove arm={0.18} /></group>}
      </Place>}
      lesson={<LessonBlock no="3" title="赵爽弦图" concept="4 × ½ab + (b − a)² = c²" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>我国古代把直角三角形较短的直角边叫<b className="text-white">勾</b>，较长的直角边叫<b className="text-white">股</b>，斜边叫<b className="text-white">弦</b>。</p>
          <p className="mt-3">赵爽弦图：四个全等的直角三角形（朱实）围成一个边长为 c 的大正方形，中间空出一个边长为 b − a 的小正方形（黄实）。</p>
          <p className="mt-3">大正方形的面积 c² = 4 × ½ab + (b − a)² = 2ab + b² − 2ab + a² = a² + b²。</p>
          <p className="mt-3">也可以不用算：把其中两块三角形各绕一个顶点转过去，五块正好拼成边长 a、b 的两个正方形。这种移补的办法古人叫“出入相补”。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">同样五块，拼成 c² 的大正方形，也拼成 a² 和 b² 两个正方形：a² + b² = c²</p>
        <p className="mt-1 text-[14px] text-white/70">4 × {Z.tri} + {Z.inner} = {Z.big}，{Z.a2} + {Z.b2} = {Z.big}。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{sq ? '两个正方形' : '大正方形的面积'}</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{sq ? `${Z.a2} + ${Z.b2}` : stage >= 2 ? Z.big : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">dm²</span></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol={<span style={{ color: COL.a }}>a</span>} value={`${a}`} unit="dm · 勾" />
            <ParamTile symbol={<span style={{ color: COL.b }}>b</span>} value={`${b}`} unit="dm · 股" />
            <ParamTile symbol={<span style={{ color: COL.c }}>c</span>} value={stage >= 2 ? `${Math.sqrt(Z.big)}` : '?'} unit="dm · 弦" />
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5 text-[15px] leading-relaxed tabular-nums">
            <div className="text-[12.5px] text-white/55">c² = 4 × ½ab + (b − a)²</div>
            <div className="mt-0.5">{stage >= 2 ? `= 4 × ${Z.tri} + ${Z.inner} = ${Z.big}` : '—'}</div>
            <div className="mt-1.5 text-[12.5px] text-white/55">两个正方形 a² + b²</div>
            <div className="mt-0.5">{sq ? `= ${Z.a2} + ${Z.b2} = ${Z.big}` : '—'}</div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'build'} onClick={() => { if (stage === 0 && !busy) build.run() }} disabled={busy || stage !== 0}>拼成弦图</LabButton>
        <LabButton pulse={next === 'area'} onClick={() => { if (stage === 1 && !busy) area.run() }} disabled={busy || stage !== 1}>算面积</LabButton>
        <LabButton primary pulse={next === 'turn'} onClick={() => { if (stage === 2 && !busy) turn.run() }} disabled={busy || stage !== 2}>转两块三角形</LabButton>
      </>}
      extras={null}
    />
  )
}
