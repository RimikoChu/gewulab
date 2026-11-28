// 功和机械能 · 第 2 课 功的计算：大道上匀速推一辆售货车，换推力（空车 100 N、满载 200 N）和距离（2 m、4 m），
// 算三次功：W = F s，力越大、距离越长，做的功越多。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { makeScale } from './mats'
import { NARRATION } from './narration'
import { PUSH, fmt, pushWork, type ForceKey } from './physics'
import { ease, useRun } from './run'
import { Big, COL, Finale, Records } from './views'
import { VOICE } from './voice'
import { Follow, P, Place } from './world'
import { Glove, VendorCart } from './yard'

const NAMES: Record<ForceKey, string> = { small: '空车', big: '满载' }
const WANT: Record<string, [ForceKey, number]> = { a: ['small', 2], b: ['small', 4], c: ['big', 4] }
const TASKS: Task[] = [
  { id: 'a', text: '空车（推力 100 N）：推 2 m', note: 'W = 100 N × 2 m = 200 J' },
  { id: 'b', text: '还是空车：推 4 m', note: '力不变，距离加倍：W = 100 N × 4 m = 400 J，功也加倍' },
  { id: 'c', text: '装满货（推力 200 N）：推 4 m', note: '距离不变，力加倍：W = 200 N × 4 m = 800 J，功也加倍' },
]
/** 握着推手的手套：握的杆沿 z，手腕朝车后上方 */
const GRIP = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-0.92, 0.39, 0), new THREE.Vector3(-0.39, -0.92, 0)))

export default function Lesson2() {
  const [load, setLoad] = useState<ForceKey>('small')
  const [dist, setDist] = useState<number | null>(null)
  const [rows, setRows] = useState<[ForceKey, number][]>([])
  const T = useTasks('gewu:energy:2', TASKS)
  const run = useRun(dist === 4 ? 4 : 2.6)
  useEffect(() => { run.reset(); setDist(null) }, [load])   // eslint-disable-line react-hooks/exhaustive-deps
  const x = run.t === null || dist === null ? 0 : dist * ease(run.t / (dist === 4 ? 4 : 2.6)), arrived = run.done && dist !== null
  useEffect(() => { if (!arrived) return; setRows(r => r.some(q => q[0] === load && q[1] === dist) ? r : [...r, [load, dist!]]); T.check(id => WANT[id][0] === load && WANT[id][1] === dist) }, [arrived])   // eslint-disable-line react-hooks/exhaustive-deps
  const push = (d: number) => { if (run.running) return; setDist(d); run.start() }
  const resetAll = () => { setLoad('small'); setDist(null); setRows([]); run.reset(); T.reset() }
  const task = T.current, F = PUSH.forces[load]
  const { hint, next }: { hint: string; next: 'load' | '2' | '4' | null } = !task ? { hint: '功等于力和物体在力的方向上移动的距离的乘积：W = F s。', next: null }
    : run.running ? { hint: `匀速往前推：推力 ${F} N…`, next: null }
    : load !== WANT[task.id][0] ? { hint: `把车换成“${NAMES[WANT[task.id][0]]}”`, next: 'load' }
    : { hint: `按“推 ${WANT[task.id][1]} m”`, next: String(WANT[task.id][1]) as '2' | '4' }
  const scale = useMemo(() => makeScale(4, 0.2, 5), [])
  const [ox, , oz] = P.cart, cx = ox + x
  const labels: Label[] = [
    { id: 'f', at: [cx - 1.9, 1.95, oz], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>推力</small>{F} N →</> },
    { id: 's', at: [cx - 0.5, 0.1, oz + 0.75], ax: 0.5, className: 'scene-tag', style: { opacity: run.t !== null ? 1 : 0 }, children: <><small>移动了</small>{fmt(x, 1)} m</> },
    { id: 'w', at: [cx + 0.2, 2.9, oz], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: arrived ? 1 : 0 }, children: <><small>W = F s</small>{arrived ? fmt(pushWork(load, dist!)) : ''} J</> },
    ...[0, 2, 4].map(m => ({ id: `m${m}`, at: [ox + 0.15 + m, 0.05, oz + 1.5] as [number, number, number], ax: 0.5, className: 'scene-name', children: `${m} m` })),
  ]
  return (
    <LabShell title="功和机械能" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="推车"
      stage={<Place at="cart" cur={['cart']} labels={labels}>
        <Follow dx={x} />
        <group position={[cx, 0, oz]}>
          <VendorCart spin={x} full={load === 'big'} />
          {[-0.34, 0.34].map(z => <group key={z} position={[-1.02, 1.02, z]} quaternion={GRIP}><Glove scale={1.35} /></group>)}
        </group>
        <ForceArrow tip={[cx - 1.25, 1.75, oz]} dir={[1, 0, 0]} len={F / 125} color={COL.f} thick={1.4} />
        {x > 0.05 && <ForceArrow tip={[cx + 0.15, 0.05, oz + 0.78]} dir={[1, 0, 0]} len={x} color={COL.s} thick={0.7} />}
        {/* 地上的米尺：从车头的位置量起，每米一格 */}
        <mesh rotation-x={-Math.PI / 2} position={[ox + 2.15, 0.022, oz + 1.15]}><planeGeometry args={[4, 0.3]} /><meshStandardMaterial map={scale} roughness={0.8} polygonOffset polygonOffsetFactor={-2} /></mesh>
      </Place>}
      lesson={<LessonBlock no="2" title="功的计算" concept="功 = 力 × 沿力的方向移动的距离" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>力学里规定：<b className="text-white">功等于力与物体在力的方向上移动的距离的乘积</b>。</p>
          <p className="mt-2 font-formula text-[17px] italic">W = F s</p>
          <p className="mt-3">F 的单位是牛（N），s 的单位是米（m），功的单位是焦耳，简称焦（J）：1 J = 1 N · m。</p>
          <p className="mt-3 text-[13.5px] text-white/65">匀速推车时，推力和车受到的阻力大小相等。车装满货更重，阻力更大，要用更大的推力。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三次都算完了" title="W = F s：力加倍或距离加倍，功都加倍" more="200 J、400 J、800 J。功的单位是焦耳（J），1 J = 1 N · m。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="W = F s" value={arrived ? fmt(pushWork(load, dist!)) : '—'} unit="J" />
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol={<span style={{ color: COL.f }}>F</span>} value={String(F)} unit={`N · ${NAMES[load]}的推力`} />
            <ParamTile symbol={<span style={{ color: COL.s }}>s</span>} value={run.t === null ? '—' : fmt(x, 1)} unit="m · 推过的距离" />
          </div>
          <Records title="记录" head={['车', 'F / N', 's / m', 'W / J']} rows={rows.map(([f, s]) => [NAMES[f], String(PUSH.forces[f]), String(s), fmt(pushWork(f, s))])} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === '2'} pulse={next === '2'} onClick={() => push(2)} disabled={run.running}>推 2 m</LabButton>
        <LabButton primary={next === '4'} pulse={next === '4'} onClick={() => push(4)} disabled={run.running}>推 4 m</LabButton>
      </>}
      extras={
        <Control label="售货车">
          <Segmented label="售货车" pulse={next === 'load'} want={next === 'load' ? WANT[task!.id][0] : null} value={load} onChange={k => { if (!run.running) setLoad(k) }} options={(Object.keys(NAMES) as ForceKey[]).map(k => ({ value: k, label: `${NAMES[k]} · ${PUSH.forces[k]} N` }))} />
        </Control>
      }
    />
  )
}
