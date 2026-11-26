// 质量守恒定律 · 第 2 课 铁和硫酸铜溶液：化验室第 2 格。锥形瓶里装蓝色的硫酸铜溶液，塞好橡胶塞；几根打磨过的铁钉放在旁边的称量纸上。
// 把锥形瓶和铁钉一起放上左盘称量；拔下塞子把铁钉放进溶液、再塞好；铁钉表面盖上一层红色的铜，溶液由蓝色变成浅绿色；再看天平，仍然平衡。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { FLASK, Flask, Glove, Nail, Stopper } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Carry, ease, liftPath, seg, useRun, type V3 } from './parts'
import { EQ, L2, eqText, g1, l2Parts } from './physics'
import { BenchKit, PTR, bench, dialAt, leftPan, useRig } from './rig'
import { BZ, M, ST, TOP, Place } from './world'

const X0 = ST.l2, B = bench(X0, TOP, BZ)
const u = (v: number) => v * M
const K = 0.8                         // 锥形瓶缩小一点（150 mL），盘上还要放铁钉
const LEVEL = 0.05                    // 溶液的液面（m，缩小前）
const TASKS: Task[] = [
  { id: 'before', text: '把锥形瓶和铁钉一起放上左盘，称出总质量', note: `反应前：${g1(L2.total)} g` },
  { id: 'react', text: '把铁钉放进硫酸铜溶液，塞好塞子', note: '铁钉表面盖上一层红色的铜，溶液由蓝色变成浅绿色' },
  { id: 'after', text: '溶液变色后，再看天平', note: '天平仍然平衡：反应前后总质量不变' },
]
const P = l2Parts()
/** 铁钉在称量纸上、在瓶底各躺在哪（相对锥形瓶底的中心，m）；转角 */
const ON_PAPER: [number, number, number][] = [[0.062, 0.01, 0.4], [0.068, -0.012, -0.3], [0.058, 0.026, 1.3]]
const IN_FLASK: [number, number, number][] = [[-0.008, 0.004, 0.5], [0.009, -0.006, -0.7], [0.0, 0.01, 1.9]]

export default function Lesson2() {
  const rig = useRig(L2.total)
  const [weighed, setWeighed] = useState(false)
  const [inside, setInside] = useState(false)
  const [done, setDone] = useState(false)
  const [rechecked, setRechecked] = useState(false)
  const T = useTasks('gewu:mass:2', TASKS)
  const drop = useRun(5.5, () => { setInside(true); T.check(id => id === 'react'); react.run() })
  const react = useRun(9, () => setDone(true))
  useEffect(() => { if (rig.steady && rig.target != null && !weighed) { setWeighed(true); T.check(id => id === 'before') } }, [rig.steady])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (rig.steady && rechecked) T.check(id => id === 'after') }, [rig.steady, rechecked])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { rig.clear(); drop.snap(0); react.snap(0); setWeighed(false); setInside(false); setDone(false); setRechecked(false); T.reset() }
  const busy = drop.busy || react.busy

  const task = T.current
  const { hint, next }: { hint: string; next: 'weigh' | 'drop' | 'check' | null } = !task ? { hint: '铁和硫酸铜溶液反应，没有气体进出，反应前后总质量不变。', next: null }
    : task.id === 'before' ? (!rig.on ? { hint: '把锥形瓶和铁钉一起放到左盘上，称一称', next: 'weigh' } : { hint: '用镊子往右盘夹砝码，再拨游码，直到指针指在正中…', next: null })
    : task.id === 'react' ? (!drop.busy ? { hint: '拔下塞子，把铁钉放进硫酸铜溶液', next: 'drop' } : { hint: '用手把铁钉轻轻放进溶液，再塞好塞子…', next: null })
    : react.busy ? { hint: '铁钉表面出现红色的铜，溶液的蓝色慢慢变浅…', next: null }
    : !rechecked ? { hint: '溶液变成浅绿色了，再看一次天平', next: 'check' } : { hint: '看指针停在哪…', next: null }

  // 拔塞子、放铁钉、塞塞子
  const dt = drop.t
  const plugOff: V3 = drop.busy ? (dt < 1.2 ? liftPath([0, 0, 0], [u(-0.05), u(0.03), u(0.04)], u(0.06), seg(dt, 0, 1.2)) : dt < 4.2 ? [u(-0.05), u(0.03), u(0.04)] : liftPath([u(-0.05), u(0.03), u(0.04)], [0, 0, 0], u(0.06), seg(dt, 4.2, 5.4))) : [0, 0, 0]
  const nk = drop.busy ? seg(dt, 1.3, 3.9) : inside ? 1 : 0
  const nailAt = (i: number): V3 => {
    const a = ON_PAPER[i], b = IN_FLASK[i]
    if (nk <= 0) return [u(a[0]), u(0.004), u(a[1])]
    if (nk >= 1) return [u(b[0]), u(0.006), u(b[1])]
    return liftPath([u(a[0]), u(0.004), u(a[1])], [u(b[0]), u(0.006), u(b[1])], u(0.2), Math.min(1, Math.max(0, (nk - i * 0.06) / 0.88)))
  }
  const k = done ? 1 : react.busy ? ease(seg(react.t, 0.5, 9)) : 0
  const color = useMemo(() => new THREE.Color('#2a7fd4').lerp(new THREE.Color('#a9cf9c'), k).getStyle(), [Math.round(k * 40)])   // eslint-disable-line react-hooks/exhaustive-deps
  const flaskAt: V3 = rig.on ? leftPan(B) : B.rest
  const handAt = nk > 0 && nk < 1 ? nailAt(1) : null

  const dial = dialAt(B), after = rechecked && rig.steady
  const labels: Label[] = [
    ...(weighed ? [{ id: 'm', at: dial, ax: 0, className: `scene-tag ${after ? 'key' : ''} -translate-y-1/2`, children: <><small>{after ? '反应后' : '反应前'}</small>{g1(L2.total)} g{after && <span className="delta eq">不变</span>}</> }] : []),
    ...(after ? [{ id: 'p', at: [dial[0], dial[1] - 0.3, dial[2]] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: PTR[rig.ptr] }] : []),
    ...(k > 0.3 ? [{ id: 'c', at: [flaskAt[0] - u(0.045), flaskAt[1] + u(0.02), flaskAt[2]] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '铁钉表面有红色的铜' }] : []),
    { id: 'n1', at: [B.base[0], TOP + 0.02, B.base[2] + 0.45], ax: 0.5, name: true, className: 'scene-name', children: '托盘天平' },
    { id: 'n2', at: [B.box[0], TOP + 0.02, B.box[2] + 0.3], ax: 0.5, name: true, className: 'scene-name', children: '砝码盒' },
    { id: 'n3', at: [flaskAt[0] - u(0.045), flaskAt[1] + u(0.09), flaskAt[2]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '硫酸铜溶液' },
    { id: 'n4', at: [flaskAt[0] + u(0.08), flaskAt[1] + u(0.03), flaskAt[2] + u(0.02)], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '铁钉' },
  ]
  return (
    <LabShell title="质量守恒定律" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="铁钉和硫酸铜溶液"
      stage={<Place at={(react.busy || (done && !rechecked)) ? 'l2b' : 'l2'} labels={labels}>
        <BenchKit b={B} rig={rig} />
        <Carry at={flaskAt} ride={rig.on ? 'L' : null} live={rig.live} lift={0.3} speed={1.6} extra={<group position={[u(0.03), u(0.12), 0]} rotation={[0.4, 0, 0.9]}><Glove /></group>}>
          <group position-x={u(-0.025)}>
            <group scale={K}>
              <Flask level={LEVEL} color={color} opacity={0.62 - 0.12 * k} vivid>
                {[0, 1, 2].map(i => inside || nk >= 1 ? <group key={i} position={[u(IN_FLASK[i][0]), u(0.0075 + i * 0.003), u(IN_FLASK[i][1])]} rotation-y={IN_FLASK[i][2]}><group rotation-x={Math.PI / 2} position-z={u(0.03)} scale={[1.4, 1.25, 1.4]}><Nail copper={k} /></group></group> : null)}
              </Flask>
              <group position={plugOff}><group position-y={u(FLASK.top - 0.016)}><Stopper /></group></group>
            </group>
            {/* 称量纸和纸上的铁钉；放进去的过程中跟着手走 */}
            <mesh position={[u(0.065), u(0.0005), u(0.008)]} rotation-x={-Math.PI / 2}><planeGeometry args={[u(0.04), u(0.05)]} /><meshStandardMaterial color="#f4f3ee" roughness={0.9} side={THREE.DoubleSide} /></mesh>
            {[0, 1, 2].map(i => !inside && nk < 1 ? <group key={i} position={nailAt(i)} rotation-y={ON_PAPER[i][2]}><group rotation-x={Math.PI / 2} position-z={u(0.024)} scale={[1.6, 1, 1.6]}><Nail /></group></group> : null)}
            {handAt && <group position={[handAt[0] + u(0.015), handAt[1] + u(0.025), handAt[2]]} rotation={[0.2, 0, 0.5]}><Glove s={u(0.0055)} /></group>}
          </group>
        </Carry>
      </Place>}
      lesson={<LessonBlock no="2" title="铁和硫酸铜溶液" concept="没有气体进出，称出来的质量也不变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>铁和硫酸铜溶液反应，生成铜和硫酸亚铁：</p>
          <p className="mt-2 text-center font-formula text-[16px]">{eqText(EQ.fecu)}</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>铁钉表面覆盖一层红色的铜；溶液由蓝色（含铜离子）逐渐变成浅绿色（含亚铁离子）</li>
            <li>反应物和生成物都没有气体，塞不塞塞子都不会有物质跑出去或进来</li>
            <li>铁钉先用砂纸打磨干净，除去表面的铁锈，反应才明显</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Panel className="px-1 py-0">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">溶液变色前后各看了一次天平</p>
          <p className="mt-1 text-[19px] leading-snug font-bold">铁和硫酸铜溶液反应前后，总质量不变：{g1(L2.total)} g</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">参加反应的铁和硫酸铜的质量总和，等于生成的铜和硫酸亚铁的质量总和。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">锥形瓶和铁钉的总质量</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{weighed ? g1(L2.total) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
          </div>
          <table className="mt-4 w-full text-[14px] tabular-nums">
            <tbody>
              <tr className="border-b border-white/10"><td className="py-1.5 text-white/60">反应前</td><td className="py-1.5 text-right font-semibold">{weighed ? `${g1(L2.total)} g` : '—'}</td></tr>
              <tr><td className="py-1.5 text-white/60">反应后</td><td className={`py-1.5 text-right font-semibold ${T.done.after ? 'text-[#7fe3d4]' : ''}`}>{T.done.after ? `${g1(L2.total)} g` : '—'}</td></tr>
            </tbody>
          </table>
          <h2 className="mt-5 text-[12.5px] text-white/55">参加反应和生成的物质（示意）</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="Fe + CuSO₄" value={`${P.fe.toFixed(2)} + ${P.cuso4.toFixed(2)}`} unit="g · 铁、硫酸铜" />
            <ParamTile symbol="Cu + FeSO₄" value={`${P.cu.toFixed(2)} + ${P.feso4.toFixed(2)}`} unit="g · 铜、硫酸亚铁" />
          </div>
          <p className="mt-2 text-center font-formula text-[15px] text-white/70">{(P.fe + P.cuso4).toFixed(2)} g = {(P.cu + P.feso4).toFixed(2)} g</p>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'weigh'} pulse={next === 'weigh'} onClick={() => { rig.put(true); rig.weigh() }} disabled={rig.on || weighed}>称量</LabButton>
        <LabButton primary={next === 'drop'} pulse={next === 'drop'} onClick={() => drop.run()} disabled={!weighed || busy || inside}>放入铁钉</LabButton>
        <LabButton primary={next === 'check'} pulse={next === 'check'} onClick={() => { setRechecked(true); rig.put(true) }} disabled={!done || rechecked}>再看天平</LabButton>
      </>}
      extras={null}
    />
  )
}
