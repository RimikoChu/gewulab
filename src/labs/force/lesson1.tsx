// 力和运动 · 第 1 课 力的作用效果和三要素：在冰壶道上用推杆推冰壶。力使冰壶由静止变为运动（改变运动状态），也把推杆的海绵头压扁（改变形状）；
// 换大小、换方向、换作用点，效果各不相同。冰壶的位置按计算核心给的加速度逐时刻算出来，停下的位置和面板上的距离一致。
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Force, Place, Spares, Stick, Stone, TIP, useRun } from './gear'
import { LESSONS, goLesson } from './lessons'
import { PUSHES, PUSH_T, STONE, shoveAt, stoneEnd, stoneShove, stoneSpin, tipSquash, type PushKey } from './physics'
import { Diagram } from './views'
import { LANE, M, RINK, U } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS: PushKey[] = ['light', 'heavy', 'back', 'side']
const deg = (k: PushKey) => Math.round(stoneSpin(k, 99) * 180 / Math.PI)
const says = (k: PushKey) => `${PUSHES[k].dir > 0 ? '向前' : '向后'}滑了 ${Math.abs(stoneEnd(k)).toFixed(2)} m${PUSHES[k].off ? `，还转了约 ${deg(k)}°` : ''}`
const TASKS: Task[] = [
  { id: 'light', text: '用 20 N 的力向前推一下冰壶', note: `冰壶由静止变为运动，${says('light')}：力可以改变物体的运动状态。海绵头也被压扁了：力还可以改变物体的形状` },
  { id: 'heavy', text: '换成“重推”（40 N），再推一下', note: `${says('heavy')}：力越大，效果越明显` },
  { id: 'back', text: '换成“反向推”，从另一边推', note: `${says('back')}：力的方向不同，效果不同` },
  { id: 'side', text: '换成“推边上”，推偏离中心 10 cm 的地方', note: `${says('side')}：力的作用点不同，效果也不同` },
]
const X0 = RINK.push, R = STONE.r * M, Y = TIP.y * U
/** 推杆顶着冰壶的那一点离壶心多远（画面单位） */
const edge = (k: PushKey) => Math.sqrt(R * R - (PUSHES[k].off * M) ** 2)
/** 力的箭头：每 10 N 画多长 */
const PER = 0.9

function Rig({ mode, run, onEnd }: { mode: PushKey; run: number; onEnd: () => void }) {
  const p = PUSHES[mode], s = stoneShove(mode)
  const stone = useRef<THREE.Group>(null), turn = useRef<THREE.Group>(null), stick = useRef<THREE.Group>(null), arrow = useRef<THREE.Group>(null), back = useRef<THREE.Group>(null)
  const squash = useRef(0), cur = useRef({ x: 0, a: 0 })
  useRun(run, s.tEnd, (t, dt) => {
    const q = cur.current, k = shoveAt(s, t), ease = 1 - Math.exp(-dt / 0.18)
    if (run === 0) { q.x += (0 - q.x) * ease; q.a += (0 - q.a) * ease } else { q.x = p.dir * k.x * M; q.a = stoneSpin(mode, t) }
    squash.current += ((k.pushing ? tipSquash(p.F) * M : 0) - squash.current) * (1 - Math.exp(-dt / 0.05))
    stone.current?.position.set(X0 + q.x, 0, LANE); if (turn.current) turn.current.rotation.y = q.a
    // 推杆：推的时候顶着壶走，松手以后留在松手的地方
    const sx = X0 + (run === 0 ? q.x : p.dir * Math.min(k.x, s.d1) * M) - p.dir * edge(mode)
    stick.current?.position.set(sx, Y, LANE + p.off * M); arrow.current?.position.set(sx, Y, LANE + p.off * M)
    if (arrow.current) arrow.current.visible = run === 0 ? Math.abs(q.x) < 0.05 : k.pushing
    if (back.current) back.current.visible = run > 0 && k.pushing
  }, onEnd)
  return <>
    <group ref={stone} position={[X0, 0, LANE]}><group ref={turn}><Stone /></group></group>
    <group ref={stick} rotation-y={p.dir > 0 ? 0 : Math.PI}><Stick squash={squash} /></group>
    <group ref={arrow}>
      <Force from={[0, 0, 0]} dir={[p.dir, 0, 0]} len={p.F / 10 * PER} color="#ffd24a" thick={1.3} />
      <group ref={back} visible={false}><Force from={[0, 0.5, 0]} dir={[-p.dir, 0, 0]} len={p.F / 10 * PER} color="#ff7a59" thick={1.3} /></group>
    </group>
  </>
}

export default function Lesson1() {
  const [mode, setMode] = useState<PushKey>('light')
  const [run, setRun] = useState(0), n = useRef(0)
  const [busy, setBusy] = useState(false), [seen, setSeen] = useState<PushKey | null>(null)
  const [rows, setRows] = useState<PushKey[]>([])
  const T = useTasks('gewu:force:1', TASKS)
  const p = PUSHES[mode], s = stoneShove(mode)
  const push = () => { if (busy || run !== 0) return; setSeen(null); setBusy(true); setRun(++n.current) }
  const ended = () => { setBusy(false); setSeen(mode); const next = rows.includes(mode) ? rows : [...rows, mode]; setRows(next); T.check(id => next.includes(id as PushKey)) }
  const home = () => { if (busy) return; setRun(0); setSeen(null) }
  const pick = (k: PushKey) => { if (busy) return; setMode(k); setRun(0); setSeen(null) }
  const resetAll = () => { setMode('light'); setRun(0); setBusy(false); setSeen(null); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'mode' | 'push' | 'home' | null } = !task ? { hint: '力的大小、方向、作用点都会影响力的作用效果，它们叫力的三要素。', next: null }
    : busy ? { hint: `推了 ${PUSH_T} s 就松手，看冰壶怎样滑…`, next: null }
    : mode !== task.id ? { hint: `把推法换成“${PUSHES[task.id as PushKey].name}”`, next: 'mode' }
    : run !== 0 ? { hint: '按“放回原处”，把冰壶和推杆摆回出发点', next: 'home' }
    : { hint: `按“推一下”：用 ${p.F} N 的力${p.dir > 0 ? '向前' : '向后'}推${p.off ? '冰壶的边上' : '冰壶的正中'}`, next: 'push' }
  const endX = X0 + stoneEnd(mode) * M
  const labels: Label[] = [
    { id: 'F', at: [X0 - p.dir * (edge(mode) + 0.2), Y + 2.2, LANE + p.off * M], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: seen ? 0 : 1 }, children: <><small>推力 F</small>{p.F} N</> },
    { id: 'd', at: [endX, 3.6, LANE], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: seen ? 1 : 0 }, children: seen ? says(seen) : null },
    { id: 'stone', at: [X0, 3.4, LANE - 1], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `冰壶 · ${STONE.m} kg` },
    { id: 'stick', at: [X0 - p.dir * 5.5, 5.2, LANE + p.off * M], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '推杆（海绵头）' },
  ]
  return (
    <LabShell title="力和运动" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="推杆"
      stage={<Place at="l1" labels={labels}>
        <Rig mode={mode} run={run} onEnd={ended} />
        <Spares />
        {/* 停下以后，冰面上留一条从出发点到停下的地方的量距线 */}
        {seen && <group position={[(X0 + endX) / 2, 0.02, LANE + 2.6]}>
          <mesh rotation-x={-Math.PI / 2}><planeGeometry args={[Math.abs(endX - X0), 0.09]} /><meshBasicMaterial color="#ffd24a" toneMapped={false} /></mesh>
          {[-1, 1].map(k => <mesh key={k} rotation-x={-Math.PI / 2} position={[k * Math.abs(endX - X0) / 2, 0, 0]}><planeGeometry args={[0.09, 0.9]} /><meshBasicMaterial color="#ffd24a" toneMapped={false} /></mesh>)}
        </group>}
      </Place>}
      lesson={<LessonBlock no="1" title="力的作用效果" concept="力能改变形状，也能改变运动状态" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>力是物体对物体的作用。力可以使物体发生<b className="text-white">形变</b>，也可以使物体的<b className="text-white">运动状态</b>发生改变（由静到动、由动到静、快慢或方向改变）。</p>
          <p className="mt-3">力的<b className="text-white">大小、方向、作用点</b>都影响力的作用效果，叫力的三要素。力的单位是牛顿，简称牛，符号是 N。</p>
          <p className="mt-3">画力的示意图：从作用点起，沿力的方向画一条带箭头的线段，线段越长表示力越大。</p>
          <p className="mt-3 text-[13.5px] text-white/65">推杆推冰壶的时候，冰壶也在推推杆，海绵头就是被它压扁的：物体间力的作用是相互的。画面上橙色的箭头就是这个力。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种推法都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">力的大小、方向、作用点，都影响力的作用效果</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">推力让冰壶由静止变为运动，也把海绵头压扁了：力能改变物体的运动状态，也能改变物体的形状。冰壶同时也在推推杆，力的作用是相互的。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再推几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">冰壶滑行的距离</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{seen ? Math.abs(stoneEnd(seen)).toFixed(2) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">力的三要素</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="F" value={`${p.F} N`} unit="大小" />
            <ParamTile symbol="→" value={p.dir > 0 ? '向前' : '向后'} unit="方向" />
            <ParamTile symbol="O" value={p.off ? `偏 ${p.off * 100} cm` : '正中'} unit="作用点" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">力的示意图（从上往下看）</h2>
          <Diagram round label="推力的示意图" max={40} forces={[{ at: [-p.dir * edge(mode) / R, -p.off / STONE.r], dir: [p.dir, 0], F: p.F, name: `F = ${p.F} N`, color: '#ffd24a' }]} />
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每推一次，冰壶停下后自动记一行。松手时的速度是 {s.v.toFixed(2)} m/s。</p>
            : <table className="mt-1 w-full text-[13px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">推法</th><th className="text-right font-normal">F / N</th><th className="text-right font-normal">结果</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{PUSHES[k].name}</td><td className="text-right tabular-nums">{PUSHES[k].F}</td><td className="text-right font-semibold text-[#7fe3d4]">{says(k).replace('滑了 ', '')}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'push'} onClick={push} disabled={busy || run !== 0}>推一下</LabButton>
        <LabButton pulse={next === 'home'} onClick={home} disabled={busy || run === 0}>放回原处</LabButton>
      </>}
      extras={<Control label="推法"><Segmented label="推法" pulse={next === 'mode'} want={next === 'mode' ? task!.id as PushKey : null} value={mode} disabled={busy} onChange={pick} options={KEYS.map(k => ({ value: k, label: PUSHES[k].name }))} /></Control>}
    />
  )
}
