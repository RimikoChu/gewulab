// 分子和原子 · 第 5 课 分子分成原子：左边一台水电解器（两支带刻度的玻璃管、中间一支长颈的贮水管，管底的电极接学生电源），
// 右前方一只模型盘，上面摆着两个水分子的比例模型。先接通电源：负极、正极都冒气泡，负极的气体是正极的两倍；
// 再在模型盘上把水分子拆成氢原子和氧原子，重新组合成两个氢分子和一个氧分子：分子变了，原子的种类和个数都没变。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Led, Metal, lathe, shell, useTasks, type Label } from '@/lab-kit'
import { Glass, Marks, Notebook, m as mm } from './gear'
import { Bubbles } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, seg, useRun } from './parts'
import { GAS_FULL, REACTION, electrolysis } from './physics'
import { EL, atomMat, type El } from './mol'
import { BZ, M, Place, ST, TOP, u, type V3 } from './world'

const X0 = ST.l5, Z0 = BZ + u(0.0)
const HX = X0 - u(0.1)                                   // 电解器的中心
const TUBE_X = [-0.055, 0.055], RI = 0.0095, TUBE_Y0 = 0.07, TUBE_Y1 = 0.38
const AREA = Math.PI * RI * RI
const gasH = (mL: number) => mL * 1e-6 / AREA                 // 多少 mL 气体占多高的管（m）
const SUPPLY: V3 = [X0 - u(0.06), TOP, Z0 - u(0.2)]
const JACK = u(0.14)                                     // 升降台把模型盘托高 14 cm
const TRAY: V3 = [X0 + u(0.12), TOP + JACK, Z0 + u(0.05)]
const S = u(0.016)                                      // 模型盘上 1 Å 画多大
const TASKS: Task[] = [
  { id: 'power', text: '接通电源，电解水', note: '负极、正极的气体体积比约为 2 : 1' },
  { id: 'split', text: '在模型盘上把两个水分子拆成原子', note: '水分子分成了氢原子和氧原子' },
  { id: 'join', text: '把原子重新组合成新的分子', note: '组成 2 个氢分子和 1 个氧分子：原子的种类和个数都没变' },
]

// 模型盘上六个原子：拆开前、拆开后、组合后的位置（Å）
const sinH = Math.sin(104.5 / 2 * Math.PI / 180) * 0.96, cosH = Math.cos(104.5 / 2 * Math.PI / 180) * 0.96
const ATOMS6: { el: El; a: V3; b: V3; c: V3 }[] = [
  { el: 'O', a: [-2.6, 0.3, 0], b: [-2.9, 1.1, 0], c: [2.0, 0.9, 0] },
  { el: 'H', a: [-2.6 - sinH, 0.3 - cosH, 0], b: [-4.6, -0.4, 0.4], c: [-3.6 - 0.37, 0.7, 0] },
  { el: 'H', a: [-2.6 + sinH, 0.3 - cosH, 0], b: [-1.2, -0.6, 0.3], c: [-3.6 + 0.37, 0.7, 0] },
  { el: 'O', a: [2.6, 0.3, 0], b: [2.9, 1.1, 0], c: [2.0 + 1.21, 0.9, 0] },
  { el: 'H', a: [2.6 - sinH, 0.3 - cosH, 0], b: [1.2, -0.6, 0.3], c: [-0.9 - 0.37, 0.7, 0] },
  { el: 'H', a: [2.6 + sinH, 0.3 - cosH, 0], b: [4.6, -0.4, 0.4], c: [-0.9 + 0.37, 0.7, 0] },
]
const ball = new THREE.SphereGeometry(1, 32, 22)
/** 模型盘上的原子：phase 0 水分子，1 拆成原子，2 组合成氢分子和氧分子；中间的小数是过渡 */
function Models({ phase }: { phase: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]), cur = useRef(phase), v = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, d) => {
    cur.current += (phase - cur.current) * Math.min(1, Math.min(d, 1 / 30) * 2.6)
    const p = cur.current
    ATOMS6.forEach((it, i) => {
      const m = refs.current[i]; if (!m) return
      const [A, B] = p <= 1 ? [it.a, it.b] : [it.b, it.c], k = ease(p <= 1 ? p : p - 1)
      v.set(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k + Math.sin(k * Math.PI) * 0.6, A[2] + (B[2] - A[2]) * k)
      m.position.copy(v)
    })
  })
  return <group>{ATOMS6.map((it, i) => <mesh key={i} ref={e => { refs.current[i] = e }} geometry={ball} material={atomMat(it.el)} scale={EL[it.el].r} position={it.a} castShadow />)}</group>
}

/** 水电解器：o2、h2 是两支管里已经有多少 mL 气体 */
function Apparatus({ h2, o2, on }: { h2: number; o2: number; on: boolean }) {
  const g = useMemo(() => ({
    tube: shell(mm([[RI + 0.0013, TUBE_Y0], [RI + 0.0013, TUBE_Y1], [0.0045, TUBE_Y1 + 0.008], [0.0028, TUBE_Y1 + 0.016], [0.0028, TUBE_Y1 + 0.04]]), u(0.0013), { segs: 40 }),
    mid: shell(mm([[0.006, 0.05], [0.006, 0.36], [0.008, 0.37], [0.03, 0.395], [0.034, 0.42], [0.03, 0.445], [0.013, 0.462], [0.013, 0.475]]), u(0.0013), { segs: 48 }),
    bridge: new THREE.CylinderGeometry(u(0.0065), u(0.0065), u(0.124), 24).rotateZ(Math.PI / 2),
    cock: lathe(mm([[0, 0], [0.006, 0], [0.006, 0.014], [0, 0.014]]), { segs: 24 }),
  }), [])
  const liq = '#cfe6ee'
  return <group position={[HX, TOP, Z0]}>
    {/* 底座和立杆、两只夹子 */}
    <RoundedBox args={[u(0.24), u(0.016), u(0.13)]} radius={u(0.005)} position-y={u(0.008)} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[0, u(0.25), -u(0.045)]} castShadow><cylinderGeometry args={[u(0.0055), u(0.0055), u(0.48), 20]} /><Metal kind="chrome" grain="turned" /></mesh>
    {[0.16, 0.3].map(y => <RoundedBox key={y} args={[u(0.15), u(0.012), u(0.01)]} radius={u(0.002)} position={[0, u(y), -u(0.012)]} castShadow><Metal kind="steel" grain="brushed" /></RoundedBox>)}
    {/* 两支刻度管：里面的水，上面一截是收集到的气体 */}
    {TUBE_X.map((x, i) => {
      const gas = i === 0 ? h2 : o2, top = TUBE_Y1 - gasH(gas)
      return <group key={x} position-x={u(x)}>
        <mesh geometry={g.tube} renderOrder={6}><Glass opacity={0.2} /></mesh>
        <mesh position-y={u((TUBE_Y0 - 0.02 + top) / 2)} renderOrder={5}><cylinderGeometry args={[u(RI), u(RI), u(top - TUBE_Y0 + 0.02), 28]} /><meshStandardMaterial color={liq} transparent opacity={0.4} depthWrite={false} /></mesh>
        <mesh position-y={u(top)} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[u(RI), 28]} /><meshPhysicalMaterial color={liq} transparent opacity={0.7} clearcoat={1} depthWrite={false} /></mesh>
        <Marks r={u(RI + 0.0016)} y0={u(TUBE_Y1 - gasH(25))} y1={u(TUBE_Y1)} lo={0} hi={25} step={1} major={5} arc={0.9} unit="" />
        {/* 活塞（玻璃旋塞） */}
        <mesh geometry={g.cock} position-y={u(TUBE_Y1 + 0.02)} rotation-z={Math.PI / 2} position-x={u(0.007)}><Glass opacity={0.5} /></mesh>
        {/* 电极：管底伸进去的一小片铂，下面是橡胶塞和接线柱 */}
        <mesh position-y={u(TUBE_Y0 + 0.012)}><boxGeometry args={[u(0.006), u(0.018), u(0.0006)]} /><Metal kind="stainless" /></mesh>
        <mesh position-y={u(TUBE_Y0 - 0.008)}><cylinderGeometry args={[u(RI + 0.002), u(RI), u(0.016), 24]} /><meshStandardMaterial color="#2b2b2d" roughness={0.7} /></mesh>
        <mesh position-y={u(TUBE_Y0 - 0.022)}><cylinderGeometry args={[u(0.0025), u(0.0025), u(0.012), 12]} /><Metal kind="brass" /></mesh>
        <Bubbles at={[0, u(TUBE_Y0 + 0.008), 0]} top={u(top - TUBE_Y0 - 0.01)} on={on} rate={i === 0 ? 34 : 17} r={u(0.0009)} spread={u(0.008)} speed={u(0.12)} seed={i + 3} />
      </group>
    })}
    {/* 中间的贮水管和上面的球 */}
    <mesh geometry={g.mid} renderOrder={6}><Glass opacity={0.2} /></mesh>
    <mesh position-y={u((0.05 + 0.36 + gasH(h2 + o2) * (AREA / (Math.PI * 0.0035 ** 2)) * 0) / 2 + 0.002)} renderOrder={5}><cylinderGeometry args={[u(0.0047), u(0.0047), u(0.31), 20]} /><meshStandardMaterial color={liq} transparent opacity={0.4} depthWrite={false} /></mesh>
    <mesh position-y={u(0.38 + Math.min(0.03, (h2 + o2) * 1e-6 / (Math.PI * 0.026 ** 2)) / 2)} renderOrder={5}><cylinderGeometry args={[u(0.02), u(0.012), u(0.02 + Math.min(0.03, (h2 + o2) * 1e-6 / (Math.PI * 0.026 ** 2))), 32]} /><meshStandardMaterial color={liq} transparent opacity={0.4} depthWrite={false} /></mesh>
    <mesh geometry={g.bridge} position-y={u(0.058)} renderOrder={6}><Glass opacity={0.25} /></mesh>
  </group>
}

/** 学生电源：灰色机箱，前面板一块电压表、一只旋钮、红黑两个接线柱 */
function Supply({ on }: { on: boolean }) {
  return <group position={SUPPLY}>
    <RoundedBox args={[u(0.2), u(0.1), u(0.14)]} radius={u(0.008)} smoothness={4} position-y={u(0.05)} castShadow receiveShadow><meshPhysicalMaterial color="#c9cdc9" roughness={0.45} clearcoat={0.4} /></RoundedBox>
    <mesh position={[0, u(0.05), u(0.0705)]}><planeGeometry args={[u(0.19), u(0.09)]} /><meshStandardMaterial color="#2c3338" roughness={0.6} /></mesh>
    <Led text={on ? '12.0' : '0.0'} w={u(0.06)} h={u(0.024)} position={[-u(0.05), u(0.068), u(0.072)]} />
    <mesh position={[u(0.035), u(0.06), u(0.074)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.012), u(0.013), u(0.012), 28]} /><meshPhysicalMaterial color="#1b1d1f" roughness={0.4} clearcoat={0.5} /></mesh>
    {[[-0.04, '#c62828'], [0.0, '#1b1d1f']].map(([x, c]) => <mesh key={x as number} position={[u(x as number), u(0.028), u(0.076)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.0055), u(0.0065), u(0.014), 20]} /><meshPhysicalMaterial color={c as string} roughness={0.35} clearcoat={0.6} /></mesh>)}
    <mesh position={[u(0.075), u(0.03), u(0.073)]}><circleGeometry args={[u(0.004), 16]} /><meshBasicMaterial color={on ? '#5cff7a' : '#2a3a2e'} toneMapped={false} /></mesh>
  </group>
}
function Wire({ pts, color }: { pts: V3[]; color: string }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 64, u(0.0022), 10), [JSON.stringify(pts)])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} castShadow><meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.5} /></mesh>
}

export default function Lesson5() {
  const T = useTasks('gewu:atom:5', TASKS)
  const run = useRun(8, () => T.check(id => id === 'power'))
  const [phase, setPhase] = useState(0)
  const split = useRun(2.4, () => T.check(id => id === 'split'))
  const join = useRun(2.6, () => T.check(id => id === 'join'))
  const busy = run.busy || split.busy || join.busy
  const resetAll = () => { run.snap(0); split.snap(0); join.snap(0); setPhase(0); T.reset() }
  const k = T.done.power ? 1 : run.busy ? seg(run.t, 0.8, 7.6) : 0
  const gas = electrolysis(k), on = run.busy && run.t > 0.6 && run.t < 7.7

  const task = T.current
  const { hint, next }: { hint: string; next: 'power' | 'split' | 'join' | null } = !task ? { hint: '化学变化中，分子分成原子，原子重新组合成新的分子；原子是化学变化中的最小粒子。', next: null }
    : run.busy ? { hint: '通电以后，两个电极上都冒出气泡…（画面快进）', next: null }
    : split.busy ? { hint: '水分子分成了氢原子和氧原子…', next: null }
    : join.busy ? { hint: '每两个氢原子结合成一个氢分子，两个氧原子结合成一个氧分子…', next: null }
    : task.id === 'power' ? { hint: '接通电源，电解水', next: 'power' }
    : task.id === 'split' ? { hint: '负极得到氢气，正极得到氧气。在模型盘上看看：先把水分子拆开', next: 'split' }
    : { hint: '再把这些原子重新组合成新的分子', next: 'join' }

  const [hx0, hx1] = TUBE_X.map(x => HX + u(x))
  const labels: Label[] = [
    { id: 'h', at: [hx0 - u(0.012), TOP + u(TUBE_Y1 - 0.01), Z0], ax: 1, className: `scene-tag ${T.done.power ? 'key' : ''} -translate-y-1/2`, children: <><small>负极 · 氢气</small>{Math.round(gas.h2)} mL</> },
    { id: 'o', at: [hx1 + u(0.014), TOP + u(TUBE_Y1 - 0.01), Z0], ax: 0, className: `scene-tag ${T.done.power ? 'key' : ''} -translate-y-1/2`, children: <><small>正极 · 氧气</small>{Math.round(gas.o2)} mL</> },
    { id: 'm1', at: [TRAY[0], TRAY[1] + u(0.095), TRAY[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: phase < 0.5 ? <><small>模型盘</small>2 个水分子</> : phase < 1.5 ? <><small>模型盘</small>4 个氢原子、2 个氧原子</> : <><small>模型盘</small>2 个氢分子 + 1 个氧分子</> },
    { id: 'n1', at: [SUPPLY[0], TOP + u(0.11), SUPPLY[2]], ax: 0.5, name: true, className: 'scene-name', children: '学生电源' },
    { id: 'n2', at: [HX, TOP - u(0.006), Z0 + u(0.07)], ax: 0.5, name: true, className: 'scene-name', children: '水电解器' },
  ]
  // 导线：负极（左管）接黑色接线柱，正极（右管）接红色接线柱
  const post = (x: number): V3 => [SUPPLY[0] + u(x), TOP + u(0.028), SUPPLY[2] + u(0.083)]
  return (
    <LabShell title="分子和原子" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="操作"
      stage={<Place at="l5" labels={labels}>
        <Apparatus h2={gas.h2} o2={gas.o2} on={on} />
        <Supply on={run.busy || !!T.done.power} />
        <group position={[X0 - u(0.03), TOP, Z0 + u(0.16)]}><Notebook rot={0.12} /></group>
        <Wire pts={[[hx0, TOP + u(TUBE_Y0 - 0.028), Z0], [hx0 - u(0.01), TOP + u(0.008), Z0 + u(0.04)], [hx0 - u(0.04), TOP + u(0.005), Z0 - u(0.02)], [post(0)[0], TOP + u(0.008), post(0)[2] + u(0.04)], post(0)]} color="#1d1f22" />
        <Wire pts={[[hx1, TOP + u(TUBE_Y0 - 0.028), Z0], [hx1 + u(0.01), TOP + u(0.008), Z0 + u(0.04)], [hx1 + u(0.03), TOP + u(0.005), Z0 - u(0.04)], [post(-0.04)[0], TOP + u(0.008), post(-0.04)[2] + u(0.05)], post(-0.04)]} color="#c62828" />
        {/* 模型盘：白色亚克力盘，四周一道边 */}
        {/* 升降台：上下两块不锈钢板，中间交叉的剪式支架 */}
        <group position={[TRAY[0], TOP, TRAY[2]]}>
          {[0.006, JACK / M - 0.006].map(y => <RoundedBox key={y} args={[u(0.2), u(0.012), u(0.1)]} radius={u(0.002)} position-y={u(y)} castShadow receiveShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>)}
          {[-1, 1].map(sg => [-0.045, 0.045].map(z => <mesh key={`${sg}${z}`} position={[0, JACK / 2, u(z)]} rotation-z={sg * Math.atan2(JACK - u(0.024), u(0.15))} castShadow><boxGeometry args={[Math.hypot(JACK - u(0.024), u(0.15)), u(0.008), u(0.004)]} /><Metal kind="stainless" grain="brushed" /></mesh>))}
          <mesh position={[0, JACK / 2, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.004), u(0.004), u(0.1), 12]} /><Metal kind="steel" /></mesh>
        </group>
        <group position={TRAY}>
          <RoundedBox args={[u(0.26), u(0.008), u(0.1)]} radius={u(0.003)} position-y={u(0.004)} castShadow receiveShadow><meshPhysicalMaterial color="#f2f2ee" roughness={0.3} clearcoat={0.6} /></RoundedBox>
          <group position={[0, u(0.008) + S * 1.6, 0]} scale={S}><Models phase={phase} /></group>
        </group>
      </Place>}
      lesson={<LessonBlock no="5" title="分子分成原子" concept="分子可以再分，原子重新组合" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>水通电分解，生成氢气和氧气：</p>
          <p className="mt-2 text-center font-formula text-[16px]">2H<sub>2</sub>O =通电= 2H<sub>2</sub>↑ + O<sub>2</sub>↑</p>
          <p className="mt-2">在这个化学变化里，水分子分成氢原子和氧原子，每两个氢原子结合成一个氢分子，每两个氧原子结合成一个氧分子。</p>
          <p className="mt-2">在化学变化中，分子可以分成原子，原子却不能再分，只是重新组合：原子是化学变化中的最小粒子。由分子构成的物质，分子是保持其化学性质的最小粒子。</p>
          <p className="mt-2 text-[13.5px] text-white/65">水蒸发时，水分子本身没有变，只是分子之间的间隔变大了，这是物理变化。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">2 个水分子 → 2 个氢分子 + 1 个氧分子</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">分子可以再分，原子重新组合</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">化学变化中，分子分成原子，原子重新组合成新分子。分子的种类和个数变了，原子的种类和个数都没有变。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">负极、正极气体的体积</div>
            <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{Math.round(gas.h2)}<span className="text-[22px] text-white/55"> : </span>{Math.round(gas.o2)}<span className="ml-1 text-[15px] font-medium text-white/55">mL</span></div>
            <div className="mt-2 text-[13px] text-white/55">{gas.o2 > 0.5 ? `约 ${(gas.h2 / gas.o2).toFixed(0)} : 1` : `满刻度 ${GAS_FULL} mL`}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">模型盘上的粒子</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="分子" value={phase < 0.5 ? String(REACTION.before.mol) : phase < 1.5 ? '0' : String(REACTION.after.mol)} unit="个" />
            <ParamTile symbol="H 原子" value={String(phase < 1.5 ? REACTION.before.H : REACTION.after.H)} unit="个" />
            <ParamTile symbol="O 原子" value={String(phase < 1.5 ? REACTION.before.O : REACTION.after.O)} unit="个" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'power'} pulse={next === 'power'} onClick={() => run.run()} disabled={busy || !!T.done.power}>接通电源</LabButton>
        <LabButton primary={next === 'split'} pulse={next === 'split'} onClick={() => { setPhase(1); split.run() }} disabled={busy || !T.done.power || phase >= 1}>拆成原子</LabButton>
        <LabButton primary={next === 'join'} pulse={next === 'join'} onClick={() => { setPhase(2); join.run() }} disabled={busy || phase !== 1 || !T.done.split}>组合成新分子</LabButton>
      </>}
      extras={null}
    />
  )
}
