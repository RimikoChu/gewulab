// 力和运动 · 第 4 课 阻力对物体运动的影响：小车每次从斜面上同一高度放开，到水平面时速度一样；水平面依次铺毛巾、棉布、不铺，
// 阻力越小滑得越远；再推理到没有阻力：小车将一直匀速运动下去（牛顿第一定律）。小车在每个时刻的位置和速度都由计算核心给出，轮子转过的角度等于走过的路程除以轮半径。
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { CART, Cart, PLANK_Y, Place, RampTrack, cartPose, useRun, type V3 } from './gear'
import { LESSONS, goLesson } from './lessons'
import { RAMP, SURF, TRACK, cartAt, cartDist, cartEnd, rampSpeed, type Surf } from './physics'
import { Bars } from './views'
import { BENCH_Z, ST, TOP, U } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS: Surf[] = ['towel', 'cotton', 'wood', 'none']
const TINT: Record<Surf, string> = { towel: '#d9b64a', cotton: '#7fb0d8', wood: '#d9a070', none: '#7fe3d4' }
const TASKS: Task[] = [
  { id: 'towel', text: '水平面铺毛巾，从斜面顶端放开小车', note: `毛巾表面最粗糙，阻力最大：只滑了 ${cartDist('towel').toFixed(2)} m` },
  { id: 'cotton', text: '换成棉布，再放一次', note: `阻力小了，滑了 ${cartDist('cotton').toFixed(2)} m` },
  { id: 'wood', text: '不铺东西，直接在木板上滑', note: `阻力最小，滑了 ${cartDist('wood').toFixed(2)} m：阻力越小，速度减小得越慢` },
  { id: 'none', text: '推理：假如水平面没有阻力', note: '小车的速度不会减小，将以恒定不变的速度永远运动下去' },
]
/** 斜面底端在台面上的位置 */
const X = ST.l4 - 3.2, Y = TOP + PLANK_Y
const P = (m: number, y: number, z = 0): V3 => [X + m * 100 * U, Y + y * U, BENCH_Z + z * U]

function Rig({ surf, run, onEnd }: { surf: Surf; run: number; onEnd: () => void }) {
  const cart = useRef<THREE.Group>(null), roll = useRef(0), cur = useRef(0)
  useRun(run, cartEnd(surf), (t, dt) => {
    const k = cartAt(surf, t), s = k.ramp + k.flat
    cur.current = run === 0 ? cur.current + (0 - cur.current) * (1 - Math.exp(-dt / 0.2)) : s      // 没在跑的时候，把小车顺着路推回斜面顶端
    const d = cur.current, pose = cartPose(Math.min(d, RAMP.L), Math.max(0, d - RAMP.L), surf)
    roll.current = d / (CART.r / 100)
    const g = cart.current; if (!g) return
    g.position.set(pose.x, pose.y, 0); g.rotation.z = pose.ang
    g.scale.setScalar(surf === 'none' && run > 0 ? Math.min(1, Math.max(0.001, (TRACK - (d - RAMP.L)) / 0.05)) : 1)   // 没有阻力：到木板尽头还在走，从画面里淡出去
  }, onEnd)
  return <group ref={cart}><Cart roll={roll} /></group>
}

export default function Lesson4() {
  const [surf, setSurf] = useState<Surf>('towel')
  const [run, setRun] = useState(0), n = useRef(0)
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<Surf[]>([])
  const T = useTasks('gewu:force:4', TASKS)
  const go = () => { if (busy || run !== 0) return; setBusy(true); setRun(++n.current) }
  const ended = () => { setBusy(false); const next = rows.includes(surf) ? rows : [...rows, surf]; setRows(next); T.check(id => next.includes(id as Surf)) }
  const home = () => { if (!busy) setRun(0) }
  const pick = (k: Surf) => { if (busy) return; setSurf(k); setRun(0) }
  const resetAll = () => { setSurf('towel'); setRun(0); setBusy(false); setRows([]); T.reset() }
  const task = T.current, v0 = rampSpeed(), seen = run !== 0 && !busy
  const { hint, next }: { hint: string; next: 'surf' | 'go' | 'home' | null } = !task ? { hint: '一切物体在没有受到力的作用时，总保持静止状态或匀速直线运动状态。', next: null }
    : busy ? { hint: surf === 'none' ? '没有阻力，速度一点也不减小…' : `小车以 ${v0.toFixed(2)} m/s 冲上${SURF[surf].name}，越走越慢…`, next: null }
    : surf !== task.id ? { hint: task.id === 'none' ? '把水平面换成“没有阻力”' : `把水平面换成${SURF[task.id as Surf].name}`, next: 'surf' }
    : run !== 0 ? { hint: '按“拿回斜面顶端”', next: 'home' }
    : { hint: '按“放开小车”：每次都从斜面上同一个高度放开', next: 'go' }
  const labels: Label[] = [
    ...rows.filter(k => k !== 'none').map((k, i): Label => ({ id: `d${k}`, at: P(cartDist(k), 9 + i * 0), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{SURF[k].name}</small>{cartDist(k).toFixed(2)} m</> })),
    { id: 'inf', at: P(TRACK - 0.08, 9), ax: 1, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: surf === 'none' && seen ? 1 : 0 }, children: <><small>到木板尽头时</small>仍是 {v0.toFixed(2)} m/s</> },
    { id: 'n1', at: P(-0.36, 16), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `斜面 · 高 ${RAMP.h * 100} cm 处放开` },
    { id: 'n2', at: P(0.5, -3, 9), ax: 0.5, name: true, className: 'scene-name', children: surf === 'none' ? '假想的光滑面' : surf === 'wood' ? '木板' : `木板上铺着${SURF[surf].name}` },
  ]
  return (
    <LabShell title="力和运动" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="小车"
      stage={<Place at="l4" labels={labels}>
        <group position={[X, Y, BENCH_Z]}>
          <RampTrack surf={surf} />
          <Rig surf={surf} run={run} onEnd={ended} />
          {/* 记过的地方各插一面小旗：小车车身中点停在这里 */}
          {rows.filter(k => k !== 'none').map(k => <group key={k} position={[cartDist(k) * 100 * U, 0, -6.6 * U]}>
            <mesh position={[0, 3.4 * U, 0]}><cylinderGeometry args={[0.1 * U, 0.1 * U, 6.8 * U, 8]} /><meshStandardMaterial color="#d8dde1" metalness={0.8} roughness={0.3} /></mesh>
            <mesh position={[1.2 * U, 5.9 * U, 0]}><boxGeometry args={[2.4 * U, 1.6 * U, 0.05 * U]} /><meshStandardMaterial color={TINT[k]} roughness={0.7} /></mesh>
            <mesh position={[0, -0.6 * U, 0]}><cylinderGeometry args={[0.9 * U, 1 * U, 1.6 * U, 14]} /><meshStandardMaterial color="#2a2f33" roughness={0.7} /></mesh>
          </group>)}
        </group>
      </Place>}
      lesson={<LessonBlock no="4" title="阻力和运动" concept="阻力越小，小车滑得越远" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>让小车每次都从斜面上<b className="text-white">同一高度</b>由静止滑下，是为了让它到达水平面时的速度相同，这样比的才只是阻力。</p>
          <p className="mt-3">水平面越光滑，小车受到的阻力越小，速度减小得越慢，滑行的距离越远。由此推理：如果水平面绝对光滑，小车受到的阻力为零，它的速度将不会减小，会一直运动下去。</p>
          <p className="mt-3"><b className="text-white">牛顿第一定律</b>：一切物体在没有受到力的作用时，总保持静止状态或匀速直线运动状态。它是在大量经验事实的基础上，通过进一步的推理概括出来的，不能用实验直接验证。</p>
          <p className="mt-3 text-[13.5px] text-white/65">所以力不是维持物体运动的原因，而是改变物体运动状态的原因。画面里“没有阻力”那一项是推理出来的情形，实验室里做不到。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次实验加一次推理</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">物体不受力时，总保持静止或匀速直线运动状态</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">毛巾 {cartDist('towel').toFixed(2)} m、棉布 {cartDist('cotton').toFixed(2)} m、木板 {cartDist('wood').toFixed(2)} m：阻力越小，滑得越远。没有阻力，就永远不会停。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再放几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">在水平面上滑行的距离</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{!seen ? '—' : surf === 'none' ? '不会停' : cartDist(surf).toFixed(2)}{seen && surf !== 'none' && <span className="ml-1 text-[15px] font-medium text-white/55">m</span>}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="h" value={`${RAMP.h * 100} cm`} unit="放开时的高度" />
            <ParamTile symbol="v" value={`${v0.toFixed(2)} m/s`} unit="到水平面时的速度" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">滑行的距离</h2>
          <Bars label="各种表面上滑行的距离" unit="m" max={TRACK} rows={KEYS.map(k => ({ name: SURF[k].name, value: k === 'none' ? (rows.includes(k) ? null : 0) : rows.includes(k) ? cartDist(k) : 0, text: !rows.includes(k) ? '—' : k === 'none' ? '一直运动下去' : cartDist(k).toFixed(2) }))} />
          <p className="mt-3 rounded-xl bg-white/6 px-3 py-2.5 text-[13px] leading-relaxed text-white/60">木板前沿贴着刻度条，一小格 1 cm。小旗插在每次小车停下的地方。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={busy || run !== 0}>放开小车</LabButton>
        <LabButton pulse={next === 'home'} onClick={home} disabled={busy || run === 0}>拿回斜面顶端</LabButton>
      </>}
      extras={<Control label="水平面"><Segmented label="水平面" pulse={next === 'surf'} want={next === 'surf' ? task!.id as Surf : null} value={surf} disabled={busy} onChange={pick} options={KEYS.map(k => ({ value: k, label: SURF[k].name }))} /></Control>}
    />
  )
}
