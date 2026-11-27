// 勾股定理 · 第 5 课 梯子滑下来：一架 3 m 长的铝梯斜靠在东边的粉墙上，顶端离地 2.5 m。
// 先算梯脚离墙多远（√(3² − 2.5²) ≈ 1.66 m）；让顶端沿墙下滑 0.5 m，梯脚跟着往外滑；再算梯脚移了多远（≈ 0.58 m，不是 0.5 m）。
import { useMemo, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, Place, ease, sideStyle, useRun } from './parts'
import { LADDER, approx, ladder, ladderFoot } from './physics'
import { ST, WALL5 } from './world'

const L = ladder()
const XW = WALL5.x + WALL5.t / 2, Z = ST.l5.z
const TASKS: Task[] = [
  { id: 'foot', text: '算一算梯脚离墙多远', note: `√(3² − 2.5²) = √${L.x0sq} ≈ ${approx(L.x0)} m` },
  { id: 'slide', text: '让梯子顶端沿墙下滑 0.5 m', note: `顶端从 ${L.h0} m 滑到 ${L.h1} m，梯脚往外滑了出去` },
  { id: 'move', text: '算一算梯脚移动了多远', note: `√${L.x1sq} − √${L.x0sq} ≈ ${approx(L.x1)} − ${approx(L.x0)} ≈ ${approx(L.move)} m，不是 0.5 m` },
]

export default function Lesson5() {
  const [stage, setStage] = useState(0)          // 0 开始，1 算过梯脚，2 滑下来了，3 算过移动
  const Tk = useTasks('gewu:pyth:5', TASKS)
  const foot = useRun(1.6, () => { setStage(1); Tk.check(id => id === 'foot') })
  const slide = useRun(3.0, () => { setStage(2); Tk.check(id => id === 'slide') })
  const move = useRun(1.6, () => { setStage(3); Tk.check(id => id === 'move') })
  const busy = foot.busy || slide.busy || move.busy
  const resetAll = () => { setStage(0); foot.snap(0); slide.snap(0); move.snap(0); Tk.reset() }
  const h = L.h0 - LADDER.drop * ease(slide.k), x = ladderFoot(h)

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'foot' | 'slide' | 'move' | null } = (() => {
    if (!task) return { hint: '顶端下滑 0.5 m，梯脚却外移了约 0.58 m：两段不一样长。', next: null }
    if (foot.busy || move.busy) return { hint: '量一量…', next: null }
    if (slide.busy) return { hint: '梯子顶端沿着墙往下滑…', next: null }
    if (stage === 0) return { hint: '梯子长 3 m，顶端离地 2.5 m。算一算梯脚离墙多远', next: 'foot' }
    if (stage === 1) return { hint: '顶端下滑 0.5 m，梯脚会不会也外移 0.5 m？让它滑下来看看', next: 'slide' }
    return { hint: '顶端现在离地 2 m。算一算梯脚移动了多远', next: 'move' }
  })()

  const showX = stage >= 1 || foot.k > 0.6
  const labels: Label[] = [
    { id: 'L', at: [XW + x / 2 + 0.22, h / 2 + 0.18, Z], ax: 0, className: 'scene-tag -translate-y-1/2', style: sideStyle('c'), children: <><small style={{ color: '#fff' }}>梯长</small>{LADDER.L} m</> },
    { id: 'h', at: [XW + 0.02, h * 0.72, Z + 0.32], ax: 1, className: 'scene-tag -translate-y-1/2', style: sideStyle('b'), children: <><small style={{ color: '#3a2600' }}>顶端高</small>{approx(h).replace(/\.?0+$/, '')} m</> },
    { id: 'x', at: [XW + x / 2, 0.02, Z + 0.4], ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('a', { opacity: showX && !slide.busy ? 1 : 0 }), children: <><small style={{ color: '#fff' }}>梯脚到墙</small>{stage >= 2 ? `√${L.x1sq} ≈ ${approx(L.x1)}` : `√${L.x0sq} ≈ ${approx(L.x0)}`} m</> },
    { id: 'd', at: [XW + (L.x0 + L.x1) / 2, 0.02, Z + 1.0], ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: stage === 3 ? 1 : 0 }, children: <><small>梯脚外移</small>≈ {approx(L.move)} m</> },
    { id: 'drop', at: [XW + 0.02, L.h0 - 0.25, Z + 0.32], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: stage >= 2 ? 1 : 0 }, children: <><small>下滑</small>{LADDER.drop} m</> },
    { id: 'n1', at: [XW - 0.4, WALL5.h + 0.1, Z], ax: 1, name: true, className: 'scene-name -translate-y-full', children: '粉墙' },
  ]
  return (
    <LabShell title="勾股定理" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="梯子"
      stage={<Place at="l5" labels={labels}>
        <group position={[XW, 0, Z]}>
          <Ladder h={h} />
          {/* 墙上的顶端高（橙），地上的梯脚到墙（蓝） */}
          <mesh position={[0.012, h / 2, 0.32]}><boxGeometry args={[0.01, h, 0.035]} /><meshBasicMaterial color={COL.b} toneMapped={false} /></mesh>
          {showX && <mesh position={[x / 2 * Math.min(1, foot.k * 1.4 + (stage >= 1 ? 1 : 0)), 0.006, 0.32]}><boxGeometry args={[x * Math.min(1, foot.k * 1.4 + (stage >= 1 ? 1 : 0)), 0.02, 0.05]} /><meshBasicMaterial color={COL.a} toneMapped={false} /></mesh>}
          {/* 下滑之前梯脚、顶端的位置：粉笔记号 */}
          {stage >= 2 && <>
            <mesh position={[L.x0, 0.004, 0]}><boxGeometry args={[0.03, 0.006, 0.7]} /><meshBasicMaterial color="#fffbe8" toneMapped={false} /></mesh>
            <mesh position={[0.01, L.h0, 0]}><boxGeometry args={[0.012, 0.03, 0.7]} /><meshBasicMaterial color="#fffbe8" toneMapped={false} /></mesh>
          </>}
          {/* 梯脚外移的那一段 */}
          {stage === 3 || move.busy ? <mesh position={[L.x0 + (L.x1 - L.x0) / 2 * move.k, 0.012, 0.32]}><boxGeometry args={[(L.x1 - L.x0) * move.k, 0.014, 0.08]} /><meshBasicMaterial color="#35c7b3" toneMapped={false} /></mesh> : null}
        </group>
      </Place>}
      lesson={<LessonBlock no="5" title="梯子滑下来" concept="已知斜边和直角边，b = √(c² − a²)" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>墙、地面和梯子围成一个直角三角形：梯子是斜边，长 3 m 不变；顶端的高和梯脚到墙的距离是两条直角边。</p>
          <p className="mt-3">已知斜边 c 和一条直角边 a，另一条直角边 b = √(c² − a²)。</p>
          <p className="mt-3">开始：√(3² − 2.5²) = √2.75 ≈ 1.66 m；顶端滑到 2 m：√(3² − 2²) = √5 ≈ 2.24 m（都保留两位小数）。梯脚外移约 0.58 m，比 0.5 m 多：两条直角边不是一起增减同样多。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">顶端下滑 0.5 m，梯脚外移约 {approx(L.move)} m</p>
        <p className="mt-1 text-[14px] text-white/70">梯长 3 m 是斜边：梯脚到墙 = √(3² − 顶端高²)，从 √2.75 ≈ 1.66 m 变成 √5 ≈ 2.24 m。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">梯脚到墙</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{stage >= 1 && !slide.busy ? `≈ ${approx(x)}` : '?'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol={<span style={{ color: COL.c }}>c</span>} value={`${LADDER.L}`} unit="m · 梯长" />
            <ParamTile symbol={<span style={{ color: COL.b }}>h</span>} value={approx(h)} unit="m · 顶端高" />
            <ParamTile symbol={<span style={{ color: COL.a }}>x</span>} value={stage >= 1 ? approx(x) : '—'} unit="m · 梯脚" />
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5 text-[15px] leading-relaxed tabular-nums">
            <div className="text-[12.5px] text-white/55">x = √(c² − h²)</div>
            <div>{stage >= 1 ? `下滑前：√(9 − 6.25) = √2.75 ≈ ${approx(L.x0)}` : '下滑前：—'}</div>
            <div>{stage >= 3 ? `下滑后：√(9 − 4) = √5 ≈ ${approx(L.x1)}` : '下滑后：—'}</div>
            <div className="mt-1">{stage >= 3 ? <>外移 ≈ {approx(L.x1)} − {approx(L.x0)} ≈ <b>{approx(L.move)}</b> m</> : '外移：—'}</div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'foot'} onClick={() => { if (stage === 0 && !busy) foot.run() }} disabled={busy || stage !== 0}>算梯脚到墙</LabButton>
        <LabButton primary pulse={next === 'slide'} onClick={() => { if (stage === 1 && !busy) slide.run() }} disabled={busy || stage !== 1}>顶端下滑 0.5 m</LabButton>
        <LabButton pulse={next === 'move'} onClick={() => { if (stage === 2 && !busy) move.run() }} disabled={busy || stage !== 2}>算梯脚移了多远</LabButton>
      </>}
      extras={null}
    />
  )
}

/** 铝合金直梯：两根槽形边梁，一根根圆管踏棍，梯脚套黑色橡胶脚垫，顶端两只灰色护头。h 是顶端离地多高，墙面在 x = 0 */
function Ladder({ h }: { h: number }) {
  const x = ladderFoot(h), ang = Math.atan2(h, x), len = LADDER.L, gap = 0.44
  const rungs = useMemo(() => Array.from({ length: 9 }, (_, i) => 0.28 + i * 0.3), [])
  return <group position={[x, 0, 0]} rotation-z={Math.PI - ang}>
    {/* 沿着 +x 方向是从梯脚到顶端 */}
    {[-gap / 2, gap / 2].map(z => <group key={z} position={[0, 0, z]}>
      <mesh position={[len / 2, 0.035, 0]} castShadow receiveShadow><boxGeometry args={[len, 0.07, 0.028]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[0.05, 0.035, 0]} castShadow><boxGeometry args={[0.1, 0.08, 0.038]} /><meshStandardMaterial color="#1d1f21" roughness={0.9} /></mesh>
      <mesh position={[len - 0.05, 0.035, 0]} castShadow><boxGeometry args={[0.1, 0.078, 0.036]} /><meshStandardMaterial color="#5a5f63" roughness={0.85} /></mesh>
    </group>)}
    {rungs.map(r => <mesh key={r} position={[r, 0.035, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.016, 0.016, gap, 14]} /><Metal kind="aluminum" grain="turned" /></mesh>)}
  </group>
}
