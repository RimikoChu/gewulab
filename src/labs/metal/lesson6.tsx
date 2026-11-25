// 金属和炼铁 · 第 6 课 铁的冶炼。前半在化验台第 6 格：储气袋里是一氧化碳，经胶管通进铁架台上横夹着的硬质玻璃管，管里一段红棕色的氧化铁粉末；
// 下面一盏酒精喷灯；玻璃管另一头的导管伸进澄清石灰水，再从石灰水试管出来，管口对着一盏点着的酒精灯烧掉尾气。
// 顺序：先通一氧化碳排净空气 → 点燃酒精喷灯加热（红棕色变黑、石灰水变浑浊）→ 停止加热，继续通气到玻璃管冷却 → 停止通气。
// 后半飞到高炉：看原料从炉顶加入、热风从风口鼓入，再打开出铁口，铁水沿铁沟流出，炉渣在撇渣器处分到渣沟，铁水流进罐车。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, Clamp, IronStand, LAMP_TOP, Pipe, SOL, SpiritTorch, Stopper, TORCH_TOP, TestTube, TubeRack, mixSol, tubeIn, Glass } from './gear'
import { Bubbles, Flame } from './fx'
import { LESSONS, goLesson } from './lessons'
import { seg, useRun } from './parts'
import { BF, CAST, Tapping } from './plant'
import { ORE, OXIDE_G, feFromOxide, fmtG, pigIron } from './physics'
import { BZ, M, ST, TOP, Place, spot, type V3 } from './world'

const X0 = ST.l6, Y = TOP, Z = BZ + 0.15
const at = (x: number, y = 0, z = 0): V3 => [X0 + x * M, Y + y * M, Z + z * M]
/** 硬质玻璃管：两端 x、离台面高、半径；粉末那一段 */
const HT = { x0: -0.27, x1: 0.06, y: 0.335, r: 0.011 }, POW = { x0: -0.15, x1: -0.06 }
const TORCH_X = (POW.x0 + POW.x1) / 2, LIME_X = 0.16, TAIL_X = 0.32
const LAB = spot(X0 - 0.02 * M, Y + 0.23 * M, Z, 4.5, 2.0, [-0.08, 0.16], true)
const PURGE = 3, REDUCE = 9, COOL = 4, TAP = 14
const bx = (x: number) => BF.x + x * M, bz = (z: number) => BF.z + z * M
const TASKS: Task[] = [
  { id: 'gas', text: '先通入一氧化碳', note: '先排净玻璃管里的空气，防止加热时一氧化碳和空气混合发生爆炸' },
  { id: 'heat', text: '加热，看粉末和石灰水', note: '红棕色粉末变黑，澄清石灰水变浑浊：生成了铁和二氧化碳' },
  { id: 'cool', text: '停止加热，继续通气到冷却', note: '冷却以后再停止通气，防止生成的铁又被氧化' },
  { id: 'tap', text: '到高炉打开出铁口', note: '铁水从出铁口流出，炉渣浮在上面被分到渣沟' },
]
type Phase = 'lab' | 'bf' | 'tap'

/** 储气袋：一只鼓鼓的塑料袋，一头一根带夹子的胶管。k 0–1 还剩多少气。原点在袋底正中 */
function GasBag({ k }: { k: number }) {
  return <group>
    <mesh position-y={0.1 * M * (0.18 + 0.27 * k) * 0.98} scale={[1.15, 0.18 + 0.27 * k, 0.8 + 0.15 * k]} castShadow><sphereGeometry args={[0.1 * M, 40, 24]} /><meshPhysicalMaterial color="#d9dccf" roughness={0.35} clearcoat={0.6} transparent opacity={0.85} /></mesh>
    <mesh position={[0.118 * M, 0.025 * M, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.006 * M, 0.008 * M, 0.03 * M, 16]} /><meshStandardMaterial color="#3d4246" roughness={0.6} /></mesh>
  </group>
}

export default function Lesson6() {
  const T = useTasks('gewu:metal:6', TASKS)
  const [phase, setPhase] = useState<Phase>('lab')
  const [gas, setGas] = useState(false)
  const [heat, setHeat] = useState(false)
  const [warn, setWarn] = useState<string | null>(null)
  const [heated, setHeated] = useState(0)
  const gasT = useRun(600), heatT = useRun(600), coolT = useRun(COOL)
  const tap = useRun(TAP, () => T.check(id => id === 'tap'))
  const purged = gas && gasT.t >= PURGE
  const red = Math.min(1, (heated + (heat ? heatT.t : 0)) / REDUCE)
  const cooling = !heat && heated > 0 && (coolT.busy || coolT.t >= COOL)
  const cooled = coolT.t >= COOL
  useEffect(() => { if (purged) T.check(id => id === 'gas') }, [purged])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (red >= 1) T.check(id => id === 'heat') }, [red >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!warn) return; const t = setTimeout(() => setWarn(null), 4000); return () => clearTimeout(t) }, [warn])
  const resetAll = () => { setPhase('lab'); setGas(false); setHeat(false); setWarn(null); setHeated(0); gasT.snap(0); heatT.snap(0); coolT.snap(0); tap.snap(0); T.reset() }

  const toggleGas = () => {
    if (!gas) { setGas(true); gasT.run(); return }
    if (heat || (heated > 0 && !cooled)) { setWarn('玻璃管还热着：继续通一氧化碳，等它冷却，防止铁又被氧化'); return }
    setGas(false); gasT.snap(0)
    if (cooled && red >= 1) T.check(id => id === 'cool')
  }
  const toggleHeat = () => {
    if (!heat) {
      if (!purged) { setWarn(gas ? '再等一会儿，让一氧化碳把管里的空气排净' : '先通一氧化碳排净管里的空气：一氧化碳和空气混合，加热时可能爆炸'); return }
      setHeat(true); heatT.run(); coolT.snap(0); return
    }
    setHeated(h => h + heatT.t); heatT.snap(0); setHeat(false); coolT.run()
  }
  const third = () => { if (phase === 'lab') setPhase('bf'); else if (phase === 'bf') { setPhase('tap'); tap.run() } }

  const task = T.current?.id
  const labDone = !!T.done.cool
  const next = phase !== 'lab' ? (phase === 'bf' ? 'third' : null)
    : !T.done.gas ? (gas ? null : 'gas') : !T.done.heat ? (heat ? null : 'heat') : !labDone ? (heat ? 'heat' : cooled ? 'gas' : null) : 'third'
  const hint = warn ?? (!task ? '高炉炼出的铁水含碳较多，是生铁。'
    : phase === 'tap' ? '出铁口打开了，看铁水和炉渣往哪里流…'
    : phase === 'bf' ? '这是高炉。原料从炉顶加入，热风从下部鼓入。打开出铁口'
    : !T.done.gas ? (gas ? '一氧化碳正在把玻璃管里的空气排出去…' : '先通一氧化碳：把玻璃管里的空气排净')
    : !T.done.heat ? (heat ? '高温下，看红棕色粉末和澄清石灰水…' : '空气排净了。点燃酒精喷灯，加热氧化铁')
    : !labDone ? (heat ? '粉末全变黑了。停止加热' : cooled ? '玻璃管冷却了，现在停止通气' : '继续通一氧化碳，等玻璃管冷却…')
    : '实验室里炼出了铁。去高炉看看工业上怎么炼')

  // 画面上的量
  const bag = gas ? Math.max(0.25, 1 - gasT.t / 40) : 1
  const flowing = gas
  const torch = heat ? Math.min(1, heatT.t * 2) : 0
  const lime = mixSol(SOL.lime, SOL.limeMilk, Math.min(1, red * 1.25))
  const powder = new THREE.Color('#8b2d17').lerp(new THREE.Color('#202022'), red)
  const glowHot = heat ? 0.5 * torch : cooling ? 0.5 * (1 - seg(coolT.t, 0, COOL)) : 0
  const mass = OXIDE_G - (OXIDE_G - feFromOxide(OXIDE_G)) * red

  const view = phase === 'lab' ? LAB : phase === 'bf' ? 'bf' : 'tap'
  const labels: Label[] = phase === 'lab' ? [
    { id: 'n1', at: at(-0.42, 0.09, 0), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '一氧化碳（储气袋）' },
    { id: 'n2', at: at(POW.x0 - 0.03, HT.y + 0.03, 0), ax: 0.5, className: `scene-tag ${red >= 1 ? 'key' : ''} -translate-y-full`, children: <><small>硬质玻璃管里</small>{red <= 0.02 ? '红棕色的氧化铁' : red < 1 ? '渐渐变黑…' : '变成黑色的铁粉'}</> },
    { id: 'n3', at: at(TORCH_X - 0.06, 0.12, 0.04), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '酒精喷灯' },
    { id: 'n4', at: at(LIME_X + 0.03, 0.12, 0), ax: 0, className: `scene-tag ${red > 0.6 ? 'key' : ''} -translate-y-1/2`, children: <><small>澄清石灰水</small>{red > 0.5 ? '变浑浊了' : '澄清'}</> },
    { id: 'n5', at: at(TAIL_X, LAMP_TOP + 0.08, 0), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>尾气</small>{flowing ? '燃烧，蓝色火焰' : '点燃处理'}</> },
  ] : [
    ...(phase === 'bf' ? [{ id: 'b1', at: [bx(0), 46 * M, bz(0)] as V3, ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>炉顶加入</small>铁矿石、焦炭、石灰石</> },
    { id: 'b2', at: [bx(-9), 15.6 * M, bz(5)] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>风口鼓入</small>热空气</> },
    { id: 'b3', at: [bx(52), 30 * M, bz(3)] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: '热风炉' }] : []),
    { id: 'b4', at: [bx(CAST.tap[0] - 1), CAST.tap[1] * M + 2, bz(CAST.tap[2] + 1)], ax: 1, className: `scene-tag ${phase === 'tap' ? 'key' : ''} -translate-y-1/2`, children: <><small>出铁口</small>生铁</> },
    { id: 'b5', at: [bx(CAST.slagEnd - 2), (CAST.floor + 1.2) * M, bz(CAST.skim)], ax: 0, className: 'scene-tag -translate-y-full', children: <><small>出渣口</small>炉渣</> },
    ...(phase === 'tap' ? [{ id: 'b6', at: [bx(4), 4 * M, bz(CAST.rail)] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: '铁水罐车' }] : []),
  ]

  const pipeOut: V3[] = useMemo(() => [at(HT.x1 + 0.01, HT.y), at(HT.x1 + 0.06, HT.y), at(LIME_X - 0.004, HT.y - 0.04), at(LIME_X - 0.003, 0.25), at(LIME_X - 0.003, 0.09)], [])
  const pipeTail: V3[] = useMemo(() => [at(LIME_X + 0.003, 0.22), at(LIME_X + 0.004, 0.27), at(LIME_X + 0.05, 0.29), at(TAIL_X - 0.02, LAMP_TOP + 0.07), at(TAIL_X - 0.008, LAMP_TOP + 0.035)], [])
  const pipeIn: V3[] = useMemo(() => [at(-0.345, 0.025), at(-0.32, 0.06), at(-0.31, HT.y - 0.02), at(HT.x0 - 0.01, HT.y)], [])
  return (
    <LabShell title="金属和炼铁" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel={phase === 'lab' ? '一氧化碳还原氧化铁' : '高炉'}
      stage={<Place at={view} labels={labels}>
        {/* 储气袋和进气的胶管 */}
        <group position={at(-0.48, 0, 0)}><GasBag k={bag} /></group>
        <Pipe glass={false} color="#4a2a22" r={0.0035 * M} pts={pipeIn} />
        {/* 铁架台、硬质玻璃管、两头的橡胶塞、管里的氧化铁粉末 */}
        <group position={at(0.025, 0, 0)}><IronStand rodH={0.48}><group position-y={HT.y * M} rotation-z={Math.PI / 2}><Clamp len={0.06} open={HT.r + 0.001} /></group></IronStand></group>
        <group position={at((HT.x0 + HT.x1) / 2, HT.y)} rotation-z={Math.PI / 2}>
          <mesh renderOrder={7}><cylinderGeometry args={[HT.r * M, HT.r * M, (HT.x1 - HT.x0) * M, 28, 1, true]} /><Glass opacity={0.22} /></mesh>
        </group>
        <group position={at(HT.x0 - 0.012, HT.y)} rotation-z={-Math.PI / 2}><Stopper r={HT.r * 1.05} h={0.022} hole /></group>
        <group position={at(HT.x1 + 0.012, HT.y)} rotation-z={Math.PI / 2}><Stopper r={HT.r * 1.05} h={0.022} hole /></group>
        <mesh position={at((POW.x0 + POW.x1) / 2, HT.y - HT.r * 0.55)} rotation-z={Math.PI / 2} scale={[1, 1, 0.55]}><cylinderGeometry args={[HT.r * 0.7 * M, HT.r * 0.7 * M, (POW.x1 - POW.x0) * M, 20]} /><meshStandardMaterial color={powder} roughness={1} emissive="#ff4a10" emissiveIntensity={glowHot * 0.35 * (1 - red * 0.7)} /></mesh>
        {/* 酒精喷灯 */}
        <group position={at(TORCH_X, 0, 0)}><SpiritTorch /></group>
        <Flame at={at(TORCH_X, TORCH_TOP)} w={0.03 * M} h={0.095 * M} kind="torch" level={torch} seed={4} light={torch > 0 ? 3 : 0} lightColor="#9ec0ff" />
        {/* 出气导管、澄清石灰水、尾气导管和尾气处的酒精灯 */}
        <Pipe pts={pipeOut} />
        <group position={at(LIME_X, 0, 0)}><TubeRack n={1} gap={0.04} /></group>
        <group position={at(LIME_X, 0.066)}><TestTube fill={0.08} sol={lime} /></group>
        <group position={at(LIME_X, 0.066 + 0.15 - 0.012)}><Stopper hole /></group>
        {flowing && <Bubbles at={at(LIME_X - 0.003, 0.09)} rate={12} r={0.0012 * M} R={tubeIn() * 0.5} top={0.055 * M} src={0.15} seed={2} />}
        <Pipe pts={pipeTail} />
        <group position={at(TAIL_X, 0, 0)}><AlcoholLamp /></group>
        <Flame at={at(TAIL_X, LAMP_TOP)} w={0.028 * M} h={0.06 * M} kind="alcohol" level={1} seed={5} />
        <Flame at={at(TAIL_X - 0.008, LAMP_TOP + 0.035)} w={0.022 * M} h={0.05 * M} kind="co" level={flowing ? 1 : 0} seed={7} tilt={-0.6} />
        {/* 高炉出铁：放在世界里（只有这一课有） */}
        <Tapping k={phase === 'tap' ? tap.t / TAP : 0} />
      </Place>}
      lesson={<LessonBlock no="6" title="铁的冶炼" concept="一氧化碳把铁从氧化铁里还原出来" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>在高温下，一氧化碳能把铁从氧化铁里还原出来：<span className="font-formula">Fe₂O₃ + 3CO =高温= 2Fe + 3CO₂</span>。生成的二氧化碳使澄清石灰水变浑浊。</p>
          <p className="mt-3">实验时<b className="text-white">先通一氧化碳，再加热</b>：排净装置里的空气，防止加热时发生爆炸。实验结束<b className="text-white">先停止加热，继续通一氧化碳到玻璃管冷却</b>：防止生成的铁又被氧化。一氧化碳有毒，尾气要点燃或收集起来。</p>
          <p className="mt-3">工业上在<b className="text-white">高炉</b>里炼铁：铁矿石、焦炭、石灰石从炉顶加入，热空气从下部鼓入。焦炭燃烧提供热量并生成一氧化碳，石灰石把矿石里的二氧化硅等杂质变成炉渣。生铁从出铁口放出，炉渣从出渣口放出。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">一氧化碳把氧化铁还原成铁</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">玻璃管里 {fmtG(OXIDE_G)} g 氧化铁变成 {fmtG(feFromOxide(OXIDE_G))} g 铁。高炉从上面加料、下面鼓风，铁水和炉渣从炉缸底部分别放出；高炉炼出的是含碳较多的生铁。</p>
      </>}
      panel={phase === 'lab' ?
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">玻璃管里固体的质量</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{fmtG(mass)}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
            <div className="mt-2 font-formula text-[15px] text-white/80">Fe₂O₃ + 3CO =高温= 2Fe + 3CO₂</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="CO" value={gas ? '通着' : '关'} unit={purged ? '空气已排净' : gas ? '排空气中' : '一氧化碳'} />
            <ParamTile symbol="加热" value={heat ? '加热中' : heated > 0 ? (cooled ? '已冷却' : '冷却中') : '没加热'} unit="酒精喷灯" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">两个先后</h2>
          <ul className="mt-2 flex flex-col gap-1 text-[13.5px] text-white/85">
            <li className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">先通一氧化碳，再加热</li>
            <li className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">先停止加热，冷却后再停止通气</li>
          </ul>
        </Panel> :
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">高炉炼铁</h2>
          <table className="mt-2 w-full text-[13.5px]">
            <tbody>
              {[['原料', '铁矿石、焦炭、石灰石、空气'], ['焦炭', '燃烧供热，生成一氧化碳'], ['石灰石', '把杂质变成炉渣'], ['产物', '生铁（出铁口）、炉渣（出渣口）']].map(([a, b]) => <tr key={a} className="bg-white/[0.04]"><td className="rounded-l-lg px-2.5 py-1.5 whitespace-nowrap text-white/60">{a}</td><td className="rounded-r-lg py-1.5 pr-2">{b}</td></tr>)}
            </tbody>
          </table>
          <h2 className="mt-4 text-[12.5px] text-white/55">算一算</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">{ORE.t} t 含氧化铁 {ORE.pct * 100}% 的赤铁矿，理论上能炼出含铁 {ORE.fe * 100}% 的生铁：</p>
          <div className="mt-2 text-center text-[40px] leading-none font-bold tabular-nums">{pigIron(ORE.t, ORE.pct, ORE.fe).toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">t</span></div>
        </Panel>}
      actions={<>
        <LabButton primary={next === 'gas'} pulse={next === 'gas'} disabled={phase !== 'lab' || labDone} onClick={toggleGas}>{gas ? '停止通气' : '通一氧化碳'}</LabButton>
        <LabButton primary={next === 'heat'} pulse={next === 'heat'} disabled={phase !== 'lab' || labDone || (red >= 1 && !heat)} onClick={toggleHeat}>{heat ? '停止加热' : '点燃酒精喷灯'}</LabButton>
        <LabButton primary={next === 'third'} pulse={next === 'third'} disabled={!labDone || phase === 'tap'} onClick={third}>{phase === 'lab' ? '去高炉' : '打开出铁口'}</LabButton>
      </>}
      extras={null}
    />
  )
}
