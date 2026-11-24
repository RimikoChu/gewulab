// 碳和二氧化碳 · 第 6 课 一氧化碳：化验台第 5 格。储气袋里是一氧化碳，经胶管通进铁架台上横夹着的硬质玻璃管，管里一段黑色的氧化铜；
// 玻璃管下面一盏加了网罩的酒精灯；玻璃管另一头通进澄清石灰水，再从石灰水试管出来，管口对着尾气处的酒精灯。
// 顺序：点燃尾气处的酒精灯 → 通一氧化碳排尽空气 → 加热 → 黑色变红、石灰水变浑浊 → 停止加热，冷却后停止通气。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, Clamp, GlassTube, Hose, IronStand, LAMP_TOP, LampHood, Stopper, TUBE, TestTube, TubeRack } from './gear'
import { Bubbles, Flame } from './fx'
import { LESSONS, goLesson } from './lessons'
import { lerp, seg, useClock } from './parts'
import { COOL_SEC, CUO, PURGE_SEC, REDUCE_SEC, cuFromCuO, fmtG, solidMass } from './physics'
import { bottleLabel } from './mats'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l6, Y = TOP, Z = BZ + 0.1
const u = (v: number) => v * M
/** 硬质玻璃管：两端的 x（m，相对 X0）、离台面的高度、半径；氧化铜那一段 */
const HT = { x0: -0.2, x1: 0.06, y: 0.17, r: 0.011 }
const CU = { x0: -0.1, x1: -0.03 }
const LAMP_X = (CU.x0 + CU.x1) / 2
const LIME_X = 0.13, TAIL_X = 0.24
const TASKS: Task[] = [
  { id: 'tail', text: '点燃导管末端的酒精灯', note: '一氧化碳有毒，尾气要点燃，不能直接排到空气里' },
  { id: 'purge', text: '通入一氧化碳，排尽玻璃管里的空气', note: '尾气燃烧，产生蓝色火焰：一氧化碳能燃烧' },
  { id: 'heat', text: '加热氧化铜', note: '黑色粉末变成红色，澄清石灰水变浑浊：一氧化碳把氧化铜还原成铜，自己变成二氧化碳' },
  { id: 'stop', text: '停止加热，冷却后再停止通气', note: '继续通一氧化碳到玻璃管冷却，防止铜又被氧化' },
]

export default function Lesson6() {
  const [tail, setTail] = useState(false)
  const [co, setCo] = useState(false)
  const [heat, setHeat] = useState(false)
  const [heated, setHeated] = useState(0)          // 已经加热了几秒（停火后保留）
  const [stopped, setStopped] = useState(false)    // 已经停止加热
  const [warn, setWarn] = useState<string | null>(null)
  const T = useTasks('gewu:carbon:6', TASKS)
  const coClock = useClock(), heatClock = useClock(), coolClock = useClock()
  const purged = co && coClock.t >= PURGE_SEC
  const reduce = Math.min(1, (heated + (heat ? heatClock.t : 0)) / REDUCE_SEC)
  const cooled = stopped && coolClock.t >= COOL_SEC
  useEffect(() => { if (!warn) return; const t = setTimeout(() => setWarn(null), 3500); return () => clearTimeout(t) }, [warn])
  useEffect(() => { if (purged) T.check(id => id === 'purge') }, [purged])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (reduce >= 1) T.check(id => id === 'heat') }, [reduce >= 1])   // eslint-disable-line react-hooks/exhaustive-deps

  const lightTail = () => { setTail(true); T.check(id => id === 'tail') }
  const toggleCo = () => {
    if (!co) { if (!tail) { setWarn('先点燃尾气处的酒精灯：一氧化碳有毒，不能直接排出'); return } setCo(true); coClock.start(); return }
    if (heat || (stopped && !cooled)) { setWarn('玻璃管还热着，要继续通一氧化碳，等它冷却，防止铜又被氧化'); return }
    setCo(false); coClock.stop()
    if (cooled) T.check(id => id === 'stop')
  }
  const toggleHeat = () => {
    if (!heat) { if (!purged) { setWarn('先通一氧化碳排尽管里的空气：一氧化碳和空气混合，加热时可能发生爆炸'); return } setHeat(true); heatClock.start(); setStopped(false); coolClock.stop(); return }
    setHeated(h => h + heatClock.t); heatClock.stop(); setHeat(false); setStopped(true); coolClock.start()
  }
  const resetAll = () => { coClock.stop(); heatClock.stop(); coolClock.stop(); setTail(false); setCo(false); setHeat(false); setHeated(0); setStopped(false); setWarn(null); T.reset() }

  const task = T.current
  const { hint: base, next }: { hint: string; next: 'tail' | 'co' | 'heat' | null } = !task ? { hint: '一氧化碳有毒，能燃烧，能把氧化铜还原成铜。先通气后加热，先停热后停气，尾气要处理。', next: null }
    : !tail ? { hint: '先点燃导管末端的酒精灯，准备烧掉尾气', next: 'tail' }
    : !co ? { hint: '打开储气袋，通入一氧化碳，排尽玻璃管里的空气', next: 'co' }
    : !purged ? { hint: '一氧化碳正把管里的空气排出去…', next: null }
    : !heat && reduce < 1 && !stopped ? { hint: '空气排尽了，尾气在燃烧。加热氧化铜', next: 'heat' }
    : heat && reduce < 1 ? { hint: '黑色的氧化铜逐渐变红，石灰水变浑浊…', next: null }
    : heat ? { hint: '黑色粉末全部变红了。停止加热', next: 'heat' }
    : !cooled ? { hint: '继续通一氧化碳，等玻璃管冷却…', next: null }
    : { hint: '玻璃管冷了。停止通一氧化碳', next: 'co' }
  const hint = warn ?? base

  // 各处的坐标
  const tubeY = Y + u(HT.y)
  const gasIn = co && coClock.t > 0.4
  const tailBurn = tail && co && coClock.t > 1.2
  const cloud = Math.min(1, reduce * 1.1)
  const cuoCol = `#${new THREE.Color('#1b1a19').lerp(new THREE.Color('#b4542f'), reduce).getHexString()}`
  // 氧化铜粉末：平铺在管底的一条，截面是弓形，两头削成斜坡
  const powder = useMemo(() => {
    const r = u(HT.r - 0.0012), h = r * 0.9, s = new THREE.Shape()
    const a0 = Math.acos((r - h) / r); s.moveTo(-r * Math.sin(a0), -r + h); s.absarc(0, 0, r, -Math.PI / 2 - a0 + Math.PI, -Math.PI / 2 + a0, false); s.lineTo(-r * Math.sin(a0), -r + h)
    const g = new THREE.ExtrudeGeometry(s, { depth: u(CU.x1 - CU.x0), bevelEnabled: true, bevelThickness: u(0.006), bevelSize: 0, bevelSegments: 2 })
    g.translate(0, 0, -u(CU.x1 - CU.x0) / 2); g.rotateY(Math.PI / 2)
    return g
  }, [])
  const limeTube: V3 = [X0 + u(LIME_X), Y + u(0.008), Z]
  const tubeOut: V3[] = [[X0 + u(HT.x1 + 0.02), tubeY, Z], [X0 + u(LIME_X - 0.03), tubeY, Z], [X0 + u(LIME_X - 0.004), tubeY - u(0.02), Z], [X0 + u(LIME_X - 0.004), Y + u(0.03), Z]]
  const tailPts: V3[] = [[X0 + u(LIME_X + 0.004), Y + u(0.17), Z], [X0 + u(LIME_X + 0.004), Y + u(0.2), Z], [X0 + u(LIME_X + 0.03), Y + u(0.215), Z], [X0 + u(TAIL_X - 0.03), Y + u(0.215), Z], [X0 + u(TAIL_X - 0.008), Y + u(0.21), Z], [X0 + u(TAIL_X), Y + u(0.19), Z]]
  const bag: V3 = [X0 + u(-0.37), Y, Z + u(0.03)]
  const hose: V3[] = [[bag[0] + u(0.1), Y + u(0.03), Z + u(0.01)], [bag[0] + u(0.15), Y + u(0.05), Z], [X0 + u(HT.x0 - 0.06), tubeY - u(0.02), Z], [X0 + u(HT.x0 - 0.02), tubeY, Z]]
  const labels: Label[] = [
    { id: 'cu', at: [X0 + u((CU.x0 + CU.x1) / 2), tubeY + u(0.03), Z], ax: 0.5, className: `scene-tag ${reduce >= 1 ? 'key' : ''} -translate-y-full`, children: <><small>{reduce >= 1 ? '铜' : reduce > 0 ? '变红中' : '氧化铜'}</small>{fmtG(solidMass(reduce * REDUCE_SEC))} g</> },
    { id: 'lime', at: [limeTube[0] - u(0.03), Y + u(0.05), Z], ax: 1, className: `scene-tag ${cloud > 0.5 ? 'key' : ''} -translate-y-1/2`, children: <><small>石灰水</small>{cloud > 0.4 ? '浑浊' : '澄清'}</> },
    ...(tailBurn ? [{ id: 'tf', at: [X0 + u(TAIL_X - 0.02), Y + u(0.25), Z] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '尾气燃烧：蓝色火焰' }] : []),
    { id: 'n1', at: [bag[0], Y + u(0.075), bag[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '储气袋（一氧化碳）' },
    { id: 'n2', at: [X0 + u(HT.x0 + 0.03), tubeY + u(0.03), Z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '硬质玻璃管' },
    { id: 'n3', at: [X0 + u(TAIL_X + 0.065), Y - u(0.006), Z + u(0.05)], ax: 0.5, name: true, className: 'scene-name', children: '尾气处的酒精灯' },
  ]
  return (
    <LabShell title="碳和二氧化碳" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="一氧化碳还原氧化铜"
      stage={<Place at="l6" labels={labels}>
        {/* 储气袋：鼓鼓的橡胶袋，一根胶管，一只止水夹 */}
        <group position={bag}>
          <RoundedBox args={[u(0.18), u(0.06), u(0.11)]} radius={u(0.028)} smoothness={5} position-y={u(0.03)} scale={[1, co ? lerp(1, 0.8, Math.min(1, coClock.t / 30)) : 1, 1]} castShadow><meshStandardMaterial color="#2c2e30" roughness={0.7} /></RoundedBox>
          <mesh position={[0, u(0.061), 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[u(0.08), u(0.05)]} /><meshStandardMaterial map={bottleLabel('一氧化碳', '#c0281e')} roughness={0.7} /></mesh>
          <mesh position={[u(0.1), u(0.03), u(0.01)]} rotation-z={Math.PI / 2}><cylinderGeometry args={[u(0.006), u(0.006), u(0.03), 12]} /><meshStandardMaterial color="#2c2e30" roughness={0.7} /></mesh>
          <RoundedBox args={[u(0.012), u(0.026), u(0.02)]} radius={u(0.002)} position={[u(0.122), u(0.03), u(0.01)]} rotation-z={co ? 0.6 : 0}><meshStandardMaterial color="#c9ccc8" metalness={0.6} roughness={0.35} /></RoundedBox>
        </group>
        <Hose pts={hose} r={u(0.0042)} color="#7d3527" />
        {/* 铁架台横夹着硬质玻璃管，两端塞着单孔塞 */}
        <group position={[X0 + u(HT.x1 - 0.06), Y, Z - u(0.025)]}><IronStand rodH={0.32} rodZ={-0.04} /></group>
        <group position={[X0 + u(HT.x1 - 0.06), tubeY, Z]}><Clamp len={0.065} open={HT.r + 0.001} /></group>
        <mesh position={[X0 + u((HT.x0 + HT.x1) / 2), tubeY, Z]} rotation-z={Math.PI / 2} renderOrder={7}><cylinderGeometry args={[u(HT.r), u(HT.r), u(HT.x1 - HT.x0), 32, 1, true]} /><meshPhysicalMaterial color="#1a2629" transparent opacity={0.24} roughness={0.03} clearcoat={1} envMapIntensity={2.6} depthWrite={false} side={THREE.DoubleSide} /></mesh>
        <mesh geometry={powder} position={[X0 + u((CU.x0 + CU.x1) / 2), tubeY, Z]}><meshStandardMaterial color={cuoCol} roughness={0.85} emissive={heat ? '#ff3a0a' : '#000000'} emissiveIntensity={heat ? 0.06 : 0} /></mesh>
        <group position={[X0 + u(HT.x0 - 0.002), tubeY, Z]} rotation-z={Math.PI / 2}><Stopper r0={0.0095} r1={0.0125} h={0.018} /></group>
        <group position={[X0 + u(HT.x1 + 0.002), tubeY, Z]} rotation-z={-Math.PI / 2}><Stopper r0={0.0095} r1={0.0125} h={0.018} /></group>
        <GlassTube pts={tubeOut} />
        {/* 石灰水：试管架上的一支试管，双孔塞，一管进、一管出 */}
        <group position={[limeTube[0] - u(0.0175), Y, Z]}><TubeRack n={2} gap={0.035} /></group>
        <group position={limeTube}><TestTube fill={0.36} color={`#${new THREE.Color('#e3eeee').lerp(new THREE.Color('#f6f6f1'), cloud).getHexString()}`} opacity={lerp(0.3, 0.9, cloud)} /></group>
        <group position={[limeTube[0], Y + u(0.008 + TUBE.h - 0.012), Z]}><Stopper r0={0.0068} r1={0.0085} h={0.016} /></group>
        <Bubbles at={[limeTube[0] - u(0.004), Y + u(0.03), Z]} top={u(TUBE.h * 0.36 - 0.03)} on={gasIn} rate={18} r={u(0.0012)} spread={u(0.002)} speed={u(0.05)} seed={3} />
        <GlassTube pts={tailPts} />
        {/* 加热的酒精灯（加网罩）和尾气处的酒精灯 */}
        <group position={[X0 + u(LAMP_X), Y, Z]}><AlcoholLamp /><group position-y={u(LAMP_TOP + 0.002)}><LampHood /></group></group>
        <Flame at={[X0 + u(LAMP_X), Y + u(LAMP_TOP), Z]} w={u(0.016)} h={u(0.05)} kind="alcohol" level={heat ? 1 : 0} seed={2} light={0.8} />
        <group position={[X0 + u(TAIL_X + 0.065), Y, Z]}><AlcoholLamp /></group>
        <Flame at={[X0 + u(TAIL_X + 0.065), Y + u(LAMP_TOP), Z]} w={u(0.013)} h={u(0.038)} kind="alcohol" level={tail ? 1 : 0} seed={4} light={0.6} />
        <Flame at={[X0 + u(TAIL_X), Y + u(0.208), Z]} w={u(0.028)} h={u(0.07)} kind="co" level={tailBurn ? 1 : 0} seed={6} light={1.2} lightColor="#8fb4ff" />
      </Place>}
      lesson={<LessonBlock no="6" title="一氧化碳" concept="一氧化碳有毒、能燃烧、能还原氧化铜" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">有毒</b>：一氧化碳极易和血液里的血红蛋白结合，使血红蛋白不能再和氧气结合，人会缺氧中毒。冬天用煤炉取暖要注意通风</li>
            <li><b className="text-white">可燃性</b>：燃烧时产生蓝色火焰，放出大量的热，可以作燃料：2CO + O<sub>2</sub> =点燃= 2CO<sub>2</sub></li>
            <li><b className="text-white">还原性</b>：能把氧化铜还原成铜，可以用于冶金</li>
          </ul>
          <p className="mt-2 text-center font-formula text-[16px]">CO + CuO <span className="text-[13px]">△</span>= Cu + CO<sub>2</sub></p>
          <p className="mt-3">操作顺序：先通一氧化碳，排尽管里的空气，再加热，防止一氧化碳和空气混合加热时爆炸；实验结束先停止加热，继续通一氧化碳到玻璃管冷却，防止生成的铜又被氧化。尾气里有没反应完的一氧化碳，要点燃或收集起来。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">氧化铜还原成了铜</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">一氧化碳有毒、能燃烧、能还原氧化铜</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">{CUO.toFixed(2)} g 黑色的氧化铜变成 {cuFromCuO(CUO).toFixed(2)} g 红色的铜，生成的二氧化碳使石灰水变浑浊。先通气后加热，先停热后停气，尾气点燃。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">玻璃管里固体的质量</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{solidMass(reduce * REDUCE_SEC).toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="m(CuO)" value={CUO.toFixed(2)} unit="g · 加热前" />
            <ParamTile symbol="m(Cu)" value={cuFromCuO(CUO).toFixed(2)} unit="g · 完全反应后" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">现在</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13.5px] text-white/80">
            <li>一氧化碳：{co ? '正在通入' : '没有通入'}</li>
            <li>加热：{heat ? '正在加热' : stopped ? (cooled ? '已冷却' : '停火，冷却中') : '没有加热'}</li>
            <li>尾气：{tailBurn ? '点燃，蓝色火焰' : tail ? '酒精灯已点燃' : '—'}</li>
          </ul>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'tail'} pulse={next === 'tail'} onClick={lightTail} disabled={tail}>点燃尾气处的灯</LabButton>
        <LabButton primary={next === 'co'} pulse={next === 'co'} onClick={toggleCo} disabled={!!T.finale}>{co ? '停止通气' : '通入一氧化碳'}</LabButton>
        <LabButton primary={next === 'heat'} pulse={next === 'heat'} onClick={toggleHeat} disabled={!co && !heat || (stopped && !heat && reduce >= 1)}>{heat ? '停止加热' : '加热'}</LabButton>
      </>}
      extras={null}
    />
  )
}
