// 物态变化 · 第 5 课 液化（两种办法：降低温度、压缩体积；“白气”是小水滴，不是水蒸气）
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Bubbles, Micro, Puffs } from './fx'
import { Beaker, Clamp, Cradle, FLASK, Flask, GAUZE_T, Gauze, Glass3, Lamp, Ring, STAND, Stand, Syringe, Tint } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Big, Done, H2, Room, useRun } from './parts'
import { DEW_TIME, LIQUEFY, SYRINGE, dewOn, etherLiquid } from './physics'
import { ST, TOP } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Way = keyof typeof LIQUEFY
const WAYS: Way[] = ['cool', 'press']
const TASKS: Task[] = [
  { id: 'mist', text: '点燃酒精灯把水烧开，看管口喷出的“白气”', note: '紧挨管口的一小段看不见，那才是水蒸气；“白气”是它遇冷液化成的小水滴' },
  { id: 'dew', text: '把冷玻璃片放到管口前，看上面出现什么', note: '水蒸气遇到冷玻璃片，液化成水珠往下流：降低温度可以使气体液化' },
  { id: 'push', text: '换成“压缩体积”，向里推注射器的活塞', note: `推到 ${SYRINGE.dew} mL 以后，针筒里出现了液态的乙醚：压缩体积也能使气体液化` },
  { id: 'pull', text: '再向外拉活塞', note: '液态的乙醚又不见了：它汽化成了看不见的蒸气' },
]
const X = ST.s5, Z = 0.3, FX = X - 0.8, CX = FX + 0.12, RING = 0.86, CUP = TOP + RING + GAUZE_T
/** 玻璃弯管的出口 */
const OUT: [number, number, number] = [CX + 0.72, CUP + 1.22, Z]
const PX = X + 0.95, SX = X + 3.1, SY = TOP + 0.36
const BEND = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.8, 0], [0, 1.1, 0], [0.04, 1.2, 0], [0.14, 1.22, 0], [0.72, 1.22, 0]].map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.2), 40, 0.022, 10)
const SPOTS = Array.from({ length: 34 }, (_, i) => { const r = (k: number) => { const s = Math.sin(i * 12.9 + k * 78.2) * 43758.5; return s - Math.floor(s) }; return { y: (r(1) - 0.5) * 0.56, z: (r(2) - 0.5) * 0.46, s: 0.012 + r(3) * 0.022, th: r(4) * 0.7 } })

/** 冷玻璃片：斜着立在管口前面，wet 从 0 到 1 是水珠长到多大；水珠多了会顺着往下流，滴进下面的小烧杯 */
function ColdPlate({ wet }: { wet: number }) {
  const drip = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { const m = drip.current; if (!m) return; const p = (clock.elapsedTime * 0.8) % 1; m.visible = wet > 0.75; m.position.set(-0.03, -0.36 - p * p * 0.75, 0) })
  return <group rotation={[0, -0.85, -0.3]}>
    <mesh renderOrder={2}><boxGeometry args={[0.022, 0.72, 0.56]} /><Tint color="#b9ccd6" /></mesh>
    <mesh renderOrder={3} castShadow><boxGeometry args={[0.022, 0.72, 0.56]} /><Glass3 o={0.2} /></mesh>
    {SPOTS.map((d, i) => { const k = Math.min(1, Math.max(0, (wet * 1.7 - d.th) / 0.6)); return k > 0.02 && <mesh key={i} position={[-0.012, d.y - (wet > 0.8 ? (wet - 0.8) * 0.2 * (i % 3) : 0), d.z]} scale={[0.5, 1 + (wet > 0.7 ? 0.6 : 0), 1]} renderOrder={4}><sphereGeometry args={[d.s * k, 10, 8]} /><meshPhysicalMaterial color="#7fb9e6" transparent opacity={0.8} roughness={0.03} clearcoat={1} envMapIntensity={2.4} /></mesh> })}
    <mesh ref={drip} visible={false}><sphereGeometry args={[0.022, 10, 8]} /><meshPhysicalMaterial color="#bfe4ff" roughness={0.05} clearcoat={1} /></mesh>
  </group>
}

export default function Lesson5() {
  const [way, setWay] = useState<Way>('cool')
  const [fire, setFire] = useState(false), [plate, setPlate] = useState(false)
  const [goal, setGoal] = useState<number>(SYRINGE.open), [pushed, setPushed] = useState(false)
  const lit = useSlide(fire ? 1 : 0, 2.5), steam = useSlide(fire ? 1 : 0, 0.3), py = useSlide(plate ? 0 : 1, 1.2)
  const V = useSlide(goal, 5)
  const [td, setTd] = useRun(plate && py === 0 && steam === 1, 1, DEW_TIME)
  const T = useTasks('gewu:phase:5', TASKS)
  const wet = dewOn(td), liq = etherLiquid(V)
  useEffect(() => { if (V === SYRINGE.shut && !pushed) setPushed(true); T.check(id => id === 'mist' ? steam === 1 : id === 'dew' ? wet >= 1 : id === 'push' ? V === SYRINGE.shut : pushed && V === SYRINGE.open) })
  const resetAll = () => { setWay('cool'); setFire(false); setPlate(false); setGoal(SYRINGE.open); setPushed(false); setTd(0); T.reset() }
  const task = T.current, need: Way = task && (task.id === 'push' || task.id === 'pull') ? 'press' : 'cool'
  const moving = V !== goal
  const { hint, next }: { hint: string; next: 'way' | 'a' | 'b' | null } = !task ? { hint: '使气体液化有两种办法：降低温度，压缩体积。', next: null }
    : way !== need ? { hint: `换成“${LIQUEFY[need]}”`, next: 'way' }
    : task.id === 'mist' ? (fire ? { hint: '水快烧开了，看弯管的出口…', next: null } : { hint: '烧瓶里的水已经很热了。按“点燃酒精灯”', next: 'a' })
    : task.id === 'dew' ? (plate ? { hint: '水蒸气碰到冷玻璃片，上面的水珠越来越大…', next: null } : { hint: '看清了吗：紧挨管口的一段是透明的。按“放上冷玻璃片”', next: 'b' })
    : task.id === 'push' ? (moving ? { hint: '活塞在往里走，盯着针筒的下壁…', next: null } : { hint: `针筒里封着乙醚的蒸气，看不见。按“向里推活塞”`, next: 'a' })
    : moving ? { hint: '活塞在往外走…', next: null } : { hint: '按“向外拉活塞”', next: 'b' }
  const A = way === 'cool' ? { text: '点燃酒精灯', run: () => setFire(true), off: fire } : { text: '向里推活塞', run: () => setGoal(SYRINGE.shut), off: moving || goal === SYRINGE.shut }
  const B = way === 'cool' ? { text: '放上冷玻璃片', run: () => setPlate(true), off: plate || steam < 1 } : { text: '向外拉活塞', run: () => setGoal(SYRINGE.open), off: moving || goal === SYRINGE.open }
  const plateY = OUT[1] + 0.05 + py * 0.6
  const lens = useMemo<[number, number, number]>(() => [SX + 0.1, SY + 1.0, Z - 0.2], [])
  const labels: Label[] = way === 'cool' ? [
    { id: 'v', at: [OUT[0] + 0.1, OUT[1] + 0.06, Z], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: steam === 1 ? 1 : 0 }, children: '看不见：水蒸气' },
    { id: 'w', at: [OUT[0] + 0.7, OUT[1] + 0.32, Z], className: 'scene-name -translate-y-full transition-opacity', style: { opacity: steam === 1 && !plate ? 1 : 0 }, children: '“白气”：小水滴' },
    { id: 'p', at: [PX + 0.42, plateY + 0.1, Z], name: true, className: 'scene-name -translate-y-1/2', children: '冷玻璃片' },
    { id: 'f', at: [CX + 0.34, CUP + 0.2, Z + 0.2], name: true, className: 'scene-name', children: '烧瓶里的水' },
  ] : [
    { id: 's', at: [SX - 0.1, SY + 0.2, Z + 0.1], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>活塞</small>{V.toFixed(0)} mL</> },
    { id: 'm', at: [lens[0], lens[1] + 0.52, lens[2]], ax: 0.5, className: 'scene-name -translate-y-full', children: '放大看：针筒里乙醚的粒子' },
    { id: 'c', at: [SX - 0.62, SY - 0.02, Z + 0.2], ax: 1, name: true, className: 'scene-name', children: '橡皮帽堵住针嘴' },
  ]
  return (
    <LabShell title="物态变化" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={way === 'cool' ? '烧瓶和玻璃片' : '注射器'}
      stage={<Room at={way === 'cool' ? 's5' : 's5b'} labels={labels} bloom={0.3}>
        {/* 烧水的一套：铁架台、酒精灯、石棉网、塞着橡皮塞和玻璃弯管的烧瓶 */}
        <Stand at={[FX, TOP, Z]}><Ring y={RING} /><Clamp y={RING + GAUZE_T + 0.72} grip={FLASK.neck} /></Stand>
        <Lamp at={[CX, TOP + STAND.baseH, Z]} lit={lit} capAt={[-0.1, -STAND.baseH, 0.78]} />
        <Gauze at={[CX, TOP + RING, Z]} />
        <group position={[CX, CUP, Z]}>
          <Flask plug="rubber" level={0.24}><Bubbles r={0.25} h={0.24} kind={fire ? 'boil' : 'none'} vigor={steam} n={30} size={0.42} /></Flask>
          <mesh geometry={BEND} renderOrder={3}><Glass3 o={0.3} /></mesh>
        </group>
        <Puffs at={OUT} on={steam} dir={[1, 0.28, 0]} len={plate && py < 0.3 ? 0.42 : 1.15} size={0.5} spread={0.12} dense={2.2} skip={0.2} n={30} speed={0.5} color="#eef2f5" />
        {/* 冷玻璃片：夹在第二只铁架台上，放下来正好挡在管口前面；下面一只小烧杯接水 */}
        <Stand at={[PX + 0.1, TOP, Z]}><Clamp y={plateY - TOP + 0.3} cx={-0.12} grip={0.02} /></Stand>
        <group position={[PX, plateY, Z]}><ColdPlate wet={wet} /></group>
        <Beaker at={[PX - 0.14, TOP, Z + 0.02]} k={0.55} level={0.05 + 0.12 * wet} marks={false} />
        {/* 注射器：平放在木托上 */}
        <Cradle at={[SX + 0.05, TOP, Z]} w={0.8} />
        <Syringe at={[SX, SY, Z]} V={V} liquid={liq} />
        {way === 'press' && <Micro at={lens} R={0.44} from={[SX - 0.2, SY + 0.05, Z + 0.1]} liquid={1} gas={1 - liq} pool tone="#e8d36a" />}
      </Room>}
      lesson={<LessonBlock no="5" title="液化" concept="降低温度、压缩体积，都能使气体液化" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物质从气态变成液态叫<b className="text-white">液化</b>。液化要放热。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">降低温度</b>：水蒸气遇冷变成小水滴。烧开水时的“白气”、冬天呼出的“白气”、夏天冰棒周围的“白气”都是这样来的</li>
            <li><b className="text-white">压缩体积</b>：在一定温度下把气体压到足够小的体积。打火机里的燃料、液化石油气就是这样装进去的</li>
            <li>水蒸气是看不见的；看得见的“白气”已经是液态的小水滴</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">被 100 ℃ 的水蒸气烫伤比被 100 ℃ 的水烫伤更厉害，因为水蒸气液化时还要放出一部分热。</p>
        </>} />}
      finale={T.finale && <Done head="两种办法都试过了" title="降低温度、压缩体积，都能使气体液化" onClose={() => T.setFinale(false)}>水蒸气遇到冷玻璃片变成水珠；乙醚蒸气被压缩到 {SYRINGE.dew} mL 以下变成液体。“白气”不是气体，是液化成的小水滴。</Done>}
      panel={
        <Glass className="px-4 py-4">
          {way === 'cool' ? <>
            <Big label="冷玻璃片上的水珠" value={wet <= 0 ? '没有' : wet < 1 ? '在长大' : '往下流'} unit="" />
            <div className="mt-4 grid grid-cols-2 gap-2"><ParamTile symbol="办法" value={LIQUEFY.cool} unit="水蒸气遇冷" /><ParamTile symbol="吸放热" value="放热" unit="玻璃片会变热" /></div>
          </> : <>
            <Big label="活塞对着的刻度" value={V.toFixed(0)} unit="mL" />
            <div className="mt-4 grid grid-cols-2 gap-2"><ParamTile symbol="办法" value={LIQUEFY.press} unit="乙醚蒸气" /><ParamTile symbol="液态乙醚" value={liq <= 0 ? '没有' : liq < 1 ? '出现了' : '最多'} unit="针筒的下壁" /></div>
          </>}
          <H2>看到了什么</H2>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13.5px] text-white/75">
            {TASKS.filter(k => T.done[k.id]).map(k => <li key={k.id} className="row-in rounded-lg bg-white/6 px-3 py-2">{k.note}</li>)}
            {!Object.keys(T.done).length && <li className="rounded-lg bg-white/6 px-3 py-3 text-white/55">先把水烧开，看管口。</li>}
          </ul>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'a'} onClick={A.run} disabled={A.off}>{A.text}</LabButton>
        <LabButton pulse={next === 'b'} onClick={B.run} disabled={B.off}>{B.text}</LabButton>
      </>}
      extras={<Control label="液化的办法"><Segmented label="液化的办法" pulse={next === 'way'} want={next === 'way' ? need : null} value={way} onChange={setWay} options={WAYS.map(k => ({ value: k, label: LIQUEFY[k] }))} /></Control>}
    />
  )
}
