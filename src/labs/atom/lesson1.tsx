// 分子和原子 · 第 1 课 一滴水：实验台上一只表面皿、一只装蒸馏水的滴瓶。用滴管往表面皿上滴一滴水，
// 然后一级级放大：先看清这滴水，再推进到水里，看见一个个水分子在动。最后缩回实验台。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Beaker, DropBottle, Dropper, Hand, WatchGlass, beakerFill } from './gear'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { STOPS, magnify, dropVolume, fmtWidth, moleculesInDrop, sci, viewWidth, waterMoleculeMass } from './physics'
import { Micro, sm, useLevels } from './zoom'
import { BZ, Place, ST, TOP, Zoomed, u, type V3 } from './world'

const X0 = ST.l1, Z0 = BZ + u(0.12)
/** 落在表面皿上的那滴水：一个球冠，底半径 3.7 mm、高 2.0 mm（体积约 0.05 mL） */
const DROP = { a: 0.0037, h: 0.002 }
const BOT = TOP + u(0.0016)                          // 表面皿里面的最低点（表面皿直接放在黑色台面上）
export const P1: V3 = [X0, BOT + u(DROP.h * 0.5), Z0]
const BOTTLE: V3 = [X0 - u(0.12), TOP, Z0 - u(0.03)]
const STOPS_1 = [STOPS.bench1, STOPS.drop, STOPS.mol]
const TASKS: Task[] = [
  { id: 'drop', text: '用滴管往表面皿上滴一滴水', note: '一滴水大约 0.05 mL' },
  { id: 'see', text: '放大，看清这滴水', note: '视野只有 1 厘米多宽，还看不见分子' },
  { id: 'mol', text: '继续放大，看见水分子', note: '水由水分子构成，分子一直在动' },
  { id: 'back', text: '缩回实验台', note: '这么小的一滴水里，有约 1.67×10²¹ 个水分子' },
]

/** 落下的水滴和落在碟里的水滴 */
function Drop({ k }: { k: number }) {
  const g = useMemo(() => { const R = (DROP.a ** 2 + DROP.h ** 2) / (2 * DROP.h), th = Math.acos((R - DROP.h) / R); const s = new THREE.SphereGeometry(u(R), 64, 32, 0, Math.PI * 2, 0, th); s.translate(0, -u(R - DROP.h), 0); return s }, [])
  return <mesh geometry={g} scale={[k, Math.max(0.01, k), k]} renderOrder={8} castShadow>
    <meshPhysicalMaterial color="#eef8fb" transmission={1} thickness={u(0.002)} roughness={0.02} ior={1.33} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={2.2} attenuationColor="#cfeaf2" attenuationDistance={u(0.02)} />
  </mesh>
}

export default function Lesson1() {
  const T = useTasks('gewu:atom:1', TASKS)
  const dropped = !!T.done.drop
  const zoom = useLevels(STOPS_1)
  const fall = useRun(2.6, () => T.check(id => id === 'drop'))
  const z = zoom.z.z
  const level = zoom.level
  const resetAll = () => { fall.snap(0); zoom.set(0); zoom.z.snap(STOPS.bench1); T.reset() }
  // 推到某一级、停稳了，就把那一级的任务打勾
  const settled = zoom.z.moving ? -1 : level
  useEffect(() => {
    if (settled === 1 && dropped) T.check(id => id === 'see')
    if (settled === 2 && T.done.see) T.check(id => id === 'mol')
    if (settled === 0 && T.done.mol) T.check(id => id === 'back')
  }, [settled])   // eslint-disable-line react-hooks/exhaustive-deps

  // 滴水：手拿着滴管从滴瓶里吸水，移到表面皿正上方，捏胶头，一滴水落下
  // 一开始手就拿着吸了水的滴管，停在表面皿正上方；捏一下胶头，一滴水落下，然后把滴管拿开
  const ft = fall.t, tipOver: V3 = [X0, BOT + u(0.014), Z0], tipAway: V3 = [X0 - u(0.1), BOT + u(0.16), Z0 - u(0.04)]
  const tip: V3 = fall.busy && ft > 1.4 ? liftPath(tipOver, tipAway, BOT + u(0.16), seg(ft, 1.4, 2.6)) : tipOver
  const squeeze = fall.busy ? seg(ft, 0.15, 0.45) * (1 - seg(ft, 0.75, 1.0)) : 0
  const fallY = fall.busy && ft > 0.42 && ft < 0.62 ? tipOver[1] - u(0.028) * ease(seg(ft, 0.42, 0.6)) ** 2 : null
  const spreadK = dropped ? 1 : fall.busy ? ease(seg(ft, 0.58, 0.9)) : 0
  const holding = !dropped || fall.busy
  const s = Math.pow(10, Math.min(z, 3.2))

  const task = T.current
  const { hint, next }: { hint: string; next: 'drop' | 'in' | 'out' | null } = !task ? { hint: '水由水分子构成。分子很小，一滴水里就有约 1.67×10²¹ 个水分子。', next: null }
    : fall.busy ? { hint: '用滴管吸一点水，在表面皿上方轻轻捏一下胶头…', next: null }
    : zoom.z.moving ? { hint: z > 2.6 && zoom.goal > z ? '镜头推进到水滴里面…' : zoom.goal > z ? '放大…' : '缩小…', next: null }
    : task.id === 'drop' ? { hint: '用滴管往表面皿上滴一滴水', next: 'drop' }
    : task.id === 'see' ? { hint: '放大，看清这滴水', next: 'in' }
    : task.id === 'mol' ? { hint: '这滴水宽不到 1 厘米。继续放大，看看水是由什么构成的', next: 'in' }
    : { hint: '看到了一个个水分子，它们一直在动。缩回实验台', next: 'out' }

  const molView = sm(7.2, 7.7, z)
  /** 台上东西跟着放大以后在哪：标签挂在放大后的位置上 */
  const zp = (q: V3): V3 => [P1[0] + (q[0] - P1[0]) * s, P1[1] + (q[1] - P1[1]) * s, P1[2] + (q[2] - P1[2]) * s]
  const labels: Label[] = [
    { id: 'w', at: [X0 + u(0.0045), P1[1] + u(0.0015), Z0], ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: dropped && Math.abs(z - STOPS.drop) < 0.15 ? 1 : 0 }, children: <><small>一滴水</small>约 {dropVolume()} mL</> },
    { id: 'm', at: [X0 + 0.22, P1[1] + 0.2, Z0], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: molView * (1 - sm(7.95, 8.1, z)) }, children: <><small>比例模型</small>一个水分子</> },
    { id: 'o', at: [X0 - 0.12, P1[1] - 0.12, Z0], ax: 1, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: molView > 0.9 && !zoom.z.moving ? 1 : 0 }, children: '红色：氧原子 · 白色：氢原子' },
    ...(z - STOPS.bench1 < 0.02 ? [
      { id: 'n1', at: zp([BOTTLE[0], TOP - u(0.004), BOTTLE[2] + u(0.03)]), ax: 0.5, name: true, className: 'scene-name', children: '蒸馏水' },
      { id: 'n2', at: zp([X0 + u(0.05), TOP + u(0.012), Z0 + u(0.02)]), ax: 0, name: true, className: 'scene-name', children: '表面皿' },
    ] : []),
  ]
  return (
    <LabShell title="分子和原子" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="放大和缩小"
      stage={<Place at="l1" labels={labels} s={s} P={P1} aim={level === 0 && !zoom.z.moving ? [P1[0], P1[1] + u(0.065), P1[2]] : P1}>
        <Zoomed s={s} P={P1}>
          <group position={[X0, TOP, Z0]}><WatchGlass /></group>
          {spreadK > 0 && <group position={[X0, BOT, Z0]}><Drop k={spreadK} /></group>}
          {fallY !== null && <mesh position={[X0, fallY, Z0]} scale={[0.85, 1.15, 0.85]}><sphereGeometry args={[u(0.0023), 24, 16]} /><meshPhysicalMaterial color="#d7eef6" transparent opacity={0.55} roughness={0.02} clearcoat={1} envMapIntensity={3} depthWrite={false} /></mesh>}
          <group position={BOTTLE}><DropBottle label="蒸馏水" band="#2f6fb3" dropper={!holding} /></group>
          <group position={[X0 + u(0.13), TOP, Z0 - u(0.04)]}><Beaker vol={100} fill={beakerFill(100, 60)} /></group>
          {holding && <group position={tip} rotation-z={0.16}>
            <Dropper squeeze={squeeze} fill={fall.busy && ft > 0.5 ? 0.2 : 0.35} />
            <group position={[0, u(0.118), 0]} rotation={[0.15, 0.4, -0.25]}><group><Hand grip={0.6 + squeeze * 0.3} /></group></group>
          </group>}
        </Zoomed>
        <Micro P={P1} z={z} />
      </Place>}
      lesson={<LessonBlock no="1" title="一滴水" concept="水由水分子构成，分子很小很小" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物质是由分子、原子等微观粒子构成的。水由水分子构成，一个水分子由两个氢原子和一个氧原子构成。</p>
          <p className="mt-2">分子很小：一个水分子的质量约是 3×10⁻²⁶ kg；一滴水（按 20 滴为 1 mL 算）里大约有 1.67×10²¹ 个水分子。</p>
          <p className="mt-2 text-[13.5px] text-white/65">画面里的水分子是比例模型：球的大小按原子的大小画，颜色是常用的习惯配色，真实的原子没有颜色。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">从一滴水推进到水分子</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">水由水分子构成，分子很小很小</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">视野从 20 cm 缩到 4 nm，才看见一个个水分子。一滴水里约有 1.67×10²¹ 个水分子，它们一直在不停地运动。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">视野宽度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{fmtWidth(viewWidth(z))}</div>
            <div className="mt-2 text-[13px] text-white/55 tabular-nums">放大约 {z - STOPS.bench1 < 0.05 ? 1 : sci(magnify(z, STOPS.bench1), 1)} 倍</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">一滴水</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="N" value={sci(moleculesInDrop(), 2)} unit="个 · 水分子" />
            <ParamTile symbol="m" value={sci(waterMoleculeMass(), 0)} unit="kg · 一个水分子" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'drop'} pulse={next === 'drop'} onClick={() => fall.run()} disabled={dropped || fall.busy}>滴一滴水</LabButton>
        <LabButton primary={next === 'in'} pulse={next === 'in'} onClick={() => zoom.set(Math.min(STOPS_1.length - 1, level + 1))} disabled={!dropped || zoom.z.moving || level >= STOPS_1.length - 1}>放大</LabButton>
        <LabButton pulse={next === 'out'} onClick={() => zoom.set(0)} disabled={zoom.z.moving || level === 0}>缩小</LabButton>
      </>}
      extras={null}
    />
  )
}
