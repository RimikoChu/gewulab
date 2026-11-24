// 碳和二氧化碳 · 第 4 课 二氧化碳与水、石灰水：化验台第 4 格。左边一套正在产生二氧化碳的发生装置（锥形瓶里大理石和稀盐酸），
// 导管接一段胶管，胶管头上一根玻璃导管；试管架上一支紫色石蕊溶液、一支澄清石灰水；右边一盏点着的酒精灯和一只试管夹。
// 通入石蕊溶液：紫色变红；用试管夹夹住加热：红色退回紫色；通入石灰水：出现白色浑浊。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, FLASK, Flask, GlassTube, Glove, Hose, LAMP_TOP, LongFunnel, Stopper, TUBE, TestTube, TubeHolder, TubeRack } from './gear'
import { Bubbles, Flame } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, liftPath, seg, useRun } from './parts'
import { FLOW, HEAT_SEC, LIME_SEC, LITMUS_SEC, MR, caco3FromCO2 } from './physics'
import { rng } from './mats'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l4, Y = TOP, Z = BZ + 0.1
const u = (v: number) => v * M
const GX = X0 + u(-0.17)                                   // 发生装置
const RX = X0 + u(0.0)                                    // 试管架
const LX = X0 + u(0.15)                                   // 酒精灯
type Tube = 'litmus' | 'lime'
const SLOT: Record<Tube, number> = { litmus: RX + u(-0.035), lime: RX }
const NAME: Record<Tube, string> = { litmus: '紫色石蕊溶液', lime: '澄清石灰水' }
const TB = 0.008                                          // 试管底在试管架底板上
const TIP_HOME: V3 = [RX + u(0.035), Y + u(TB + 0.05), Z]          // 不用时插在架子上一支空试管里
const PURPLE = new THREE.Color('#4a14a8'), RED = new THREE.Color('#c8081f')
const TASKS: Task[] = [
  { id: 'litmus', text: '向紫色石蕊溶液中通入二氧化碳', note: '溶液变红：二氧化碳和水反应生成了碳酸，碳酸使紫色石蕊变红' },
  { id: 'heat', text: '用试管夹夹住变红的试管，加热', note: '红色退回紫色：碳酸不稳定，受热分解，二氧化碳从溶液里逸出' },
  { id: 'lime', text: '向澄清石灰水中通入二氧化碳', note: '石灰水变浑浊：生成了不溶于水的碳酸钙。常用它检验二氧化碳' },
]

function Chips() {
  const g = useMemo(() => {
    const r = rng(11), gs: THREE.BufferGeometry[] = []
    for (let i = 0; i < 8; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.025, s = 0.0065 + r() * 0.004; const q = new THREE.IcosahedronGeometry(u(s), 0); q.scale(1, 0.8, 0.9); q.translate(Math.cos(a) * u(rr), u(0.007 + (i % 3) * 0.004), Math.sin(a) * u(rr)); gs.push(q) }
    return mergeGeometries(gs)
  }, [])
  return <mesh geometry={g} castShadow><meshStandardMaterial color="#e6e3dc" roughness={0.85} flatShading /></mesh>
}

export default function Lesson4() {
  const [tube, setTube] = useState<Tube>('litmus')
  const [red, setRed] = useState(false)
  const [heated, setHeated] = useState(false)
  const [milky, setMilky] = useState(false)
  const [vol, setVol] = useState<Record<Tube, number>>({ litmus: 0, lime: 0 })
  const T = useTasks('gewu:carbon:4', TASKS)
  const RUN = (k: Tube) => (k === 'litmus' ? LITMUS_SEC : LIME_SEC) + 2.6
  const gas = useRun(RUN(tube), () => {
    setVol(v => ({ ...v, [tube]: v[tube] + FLOW * (RUN(tube) - 2.6) }))
    if (tube === 'litmus') { setRed(true); T.check(id => id === 'litmus') } else { setMilky(true); T.check(id => id === 'lime') }
  })
  const heat = useRun(HEAT_SEC + 3, () => { setHeated(true); T.check(id => id === 'heat') })
  const busy = gas.busy || heat.busy
  const resetAll = () => { gas.snap(0); heat.snap(0); setTube('litmus'); setRed(false); setHeated(false); setMilky(false); setVol({ litmus: 0, lime: 0 }); T.reset() }

  // 通气：导管从架子上方移到选中的试管，插到管底，冒气泡，抽出来回到原处
  const gt = gas.t, gk = gas.busy ? seg(gt, 0, 1.2) - seg(gt, RUN(tube) - 1.2, RUN(tube)) : 0
  const bubbling = gas.busy && gt > 1.2 && gt < RUN(tube) - 1.3
  const into = gas.busy ? seg(gt, 1.2, RUN(tube) - 1.3) : 0
  const tip: V3 = gas.busy ? liftPath(TIP_HOME, [SLOT[tube], Y + u(TB + 0.022), Z], Y + u(0.21), Math.max(0, gk)) : TIP_HOME
  // 石蕊的颜色：通气时变红，加热时变回紫色
  const litmusRed = red ? (heated ? 0 : heat.busy ? 1 - seg(heat.t, 1.6, 1.6 + HEAT_SEC * 0.8) : 1) : gas.busy && tube === 'litmus' ? seg(into, 0.1, 0.8) : 0
  const litmusCol = `#${PURPLE.clone().lerp(RED, litmusRed).getHexString()}`
  const cloud = milky ? 1 : gas.busy && tube === 'lime' ? seg(into, 0.1, 0.85) : 0
  // 加热：试管夹夹住石蕊试管，提起来，斜着放到火焰上，来回移动着加热，放回
  const ht = heat.t, hk = heat.busy ? seg(ht, 0, 1.4) - seg(ht, HEAT_SEC + 1.6, HEAT_SEC + 3) : 0
  const over: V3 = [LX - u(0.03), Y + u(LAMP_TOP + 0.03), Z]
  const tubeBase: V3 = heat.busy ? liftPath([SLOT.litmus, Y + u(TB), Z], [over[0] + Math.sin(ht * 5) * u(0.004), over[1], over[2]], Y + u(0.24), Math.max(0, hk)) : [SLOT.litmus, Y + u(TB), Z]
  const hTilt = heat.busy ? ease(seg(ht, 1.0, 1.5)) * (1 - ease(seg(ht, HEAT_SEC + 1.4, HEAT_SEC + 1.9))) * 0.85 : 0
  const boiling = heat.busy && ht > 1.8 && ht < HEAT_SEC + 1.3

  const task = T.current
  const want: Tube = task?.id === 'lime' ? 'lime' : 'litmus'
  const { hint, next }: { hint: string; next: 'gas' | 'heat' | 'tube' | null } = !task ? { hint: '二氧化碳和水反应生成碳酸，碳酸不稳定；二氧化碳使澄清石灰水变浑浊。', next: null }
    : gas.busy ? { hint: tube === 'litmus' ? '把导管伸进紫色石蕊溶液，通入二氧化碳…' : '把导管伸进澄清石灰水，通入二氧化碳…', next: null }
    : heat.busy ? { hint: '用试管夹夹住试管，在酒精灯上加热…', next: null }
    : tube !== want ? { hint: `选“${NAME[want]}”`, next: 'tube' }
    : task.id === 'litmus' ? { hint: '向紫色石蕊溶液中通入二氧化碳', next: 'gas' }
    : task.id === 'heat' ? { hint: '溶液变红了。用试管夹夹住这支试管，在酒精灯上加热', next: 'heat' }
    : { hint: '向澄清石灰水中通入二氧化碳', next: 'gas' }

  // 发生装置的导管：从塞子出来往右，接胶管，胶管另一头接着玻璃导管
  const genTop: V3 = [GX + u(0.006), Y + u(FLASK.top + 0.035), Z]
  const hosePts: V3[] = useMemo(() => [genTop, [genTop[0] + u(0.06), genTop[1] + u(0.02), Z + u(0.03)], [(genTop[0] + tip[0]) / 2, Math.max(genTop[1], tip[1]) + u(0.06), Z + u(0.04)], [tip[0] - u(0.004), tip[1] + u(0.12), tip[2] + u(0.01)], [tip[0], tip[1] + u(0.1), tip[2]]], [tip[0], tip[1], tip[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  const labels: Label[] = [
    { id: 't1', at: [SLOT.litmus - u(0.05), Y + u(0.14), Z], ax: 1, className: `scene-tag ${red && !heated ? 'key' : ''} -translate-y-1/2`, children: <><small>石蕊溶液</small>{litmusRed > 0.5 ? '红色' : '紫色'}</> },
    { id: 't2', at: [SLOT.lime + u(0.085), Y + u(0.14), Z], ax: 0, className: `scene-tag ${milky ? 'key' : ''} -translate-y-1/2`, children: <><small>石灰水</small>{cloud > 0.5 ? '浑浊' : '澄清'}</> },
    ...(boiling ? [{ id: 'b', at: [over[0] - u(0.07), over[1] + u(0.05), Z] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '冒出小气泡' }] : []),
    { id: 'n1', at: [GX, Y + u(0.26), Z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '二氧化碳发生装置' },
    { id: 'n2', at: [LX, Y - u(0.006), Z + u(0.05)], ax: 0.5, name: true, className: 'scene-name', children: '酒精灯' },
  ]
  return (
    <LabShell title="碳和二氧化碳" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="通入二氧化碳"
      stage={<Place at="l4" labels={labels}>
        {/* 发生装置：一直在冒气泡 */}
        <group position={[GX, Y, Z]}><Flask level={0.03} color="#dde8e9" opacity={0.36}><Chips /></Flask></group>
        <group position={[GX, Y + u(FLASK.top - 0.016), Z]}><Stopper holes={[-0.005, 0.006]} /></group>
        <group position={[GX - u(0.005), Y + u(0.008), Z]}><LongFunnel len={0.21} /></group>
        <GlassTube pts={[[GX + u(0.006), Y + u(FLASK.top - 0.01), Z], [GX + u(0.006), genTop[1], Z]]} />
        <Bubbles at={[GX, Y + u(0.008), Z]} top={u(0.022)} on rate={50} r={u(0.0016)} spread={u(0.024)} speed={u(0.05)} seed={4} />
        <Hose pts={hosePts} r={u(0.0042)} color="#7d3527" />
        <group position={tip}><GlassTube pts={[[0, 0, 0], [0, u(0.1), 0]]} /></group>
        {bubbling && <Bubbles at={[tip[0], tip[1] + u(0.002), tip[2]]} top={u(TUBE.h * 0.56 - 0.025)} on rate={26} r={u(0.0014)} spread={u(0.002)} speed={u(0.06)} seed={7} />}
        {/* 试管架和两支试管；石蕊试管加热时被拿走 */}
        <group position={[RX, Y, Z]}><TubeRack n={3} gap={0.035} /></group>
        <group position={[RX + u(0.035), Y + u(TB), Z]}><TestTube fill={0} /></group>
        <group position={tubeBase} rotation-z={-hTilt}>
          <TestTube fill={0.56} color={litmusCol} opacity={0.96} vivid />
          {heat.busy && hk > 0 && <group position={[0, u(0.12), 0]}>
            <group rotation-y={Math.PI}><TubeHolder /></group>
            <group position={[-u(0.17), 0, -u(0.01)]} rotation={[0.4, 0, 0.9]}><Glove /></group>
          </group>}
        </group>
        {boiling && <Bubbles at={[tubeBase[0] + u(0.01), tubeBase[1] + u(0.012), Z]} top={u(0.03)} on rate={22} r={u(0.0011)} spread={u(0.004)} speed={u(0.05)} seed={9} />}
        <group position={[SLOT.lime, Y + u(TB), Z]}><TestTube fill={0.56} color={`#${new THREE.Color('#e3eeee').lerp(new THREE.Color('#f6f6f1'), cloud).getHexString()}`} opacity={lerp(0.35, 0.95, cloud)} /></group>
        {/* 酒精灯 */}
        <group position={[LX, Y, Z]}><AlcoholLamp /></group>
        <Flame at={[LX, Y + u(LAMP_TOP), Z]} w={u(0.014)} h={u(0.04)} kind="alcohol" level={1} seed={3} light={0.7} />
        {gas.busy && gk > 0 && gk < 1 && <group position={[tip[0] + u(0.03), tip[1] + u(0.1), tip[2] + u(0.01)]} rotation={[0.3, 0, -0.5]}><Glove /></group>}
      </Place>}
      lesson={<LessonBlock no="4" title="与水、石灰水" concept="遇水成碳酸，遇石灰水变浑浊" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>二氧化碳和水反应生成碳酸，碳酸使紫色石蕊溶液变红；碳酸很不稳定，受热就分解：</p>
          <p className="mt-2 text-center font-formula text-[16px]">CO<sub>2</sub> + H<sub>2</sub>O = H<sub>2</sub>CO<sub>3</sub></p>
          <p className="mt-1 text-center font-formula text-[16px]">H<sub>2</sub>CO<sub>3</sub> = H<sub>2</sub>O + CO<sub>2</sub>↑</p>
          <p className="mt-3">二氧化碳和石灰水（氢氧化钙溶液）反应，生成不溶于水的碳酸钙，石灰水变浑浊。实验室常用澄清石灰水检验二氧化碳：</p>
          <p className="mt-2 text-center font-formula text-[16px]">CO<sub>2</sub> + Ca(OH)<sub>2</sub> = CaCO<sub>3</sub>↓ + H<sub>2</sub>O</p>
          <p className="mt-3 text-[13.5px] text-white/65">使石蕊变红的是碳酸，不是二氧化碳本身：把干燥的紫色石蕊小花直接放进二氧化碳里，它不变色。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两支试管都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">遇水生成碳酸，使澄清石灰水变浑浊</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">紫色石蕊变红，加热又变回紫色：碳酸不稳定。石灰水变浑浊，生成了碳酸钙，可以用来检验二氧化碳。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">通入{NAME[tube]}的二氧化碳（示意）</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{Math.round(vol[tube] + (gas.busy ? FLOW * into * (RUN(tube) - 2.6) : 0))}<span className="ml-1 text-[15px] font-medium text-white/55">mL</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">二氧化碳和石灰水</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="m(CO₂)" value={String(MR.CO2)} unit="g · 二氧化碳" />
            <ParamTile symbol="m(CaCO₃)" value={caco3FromCO2(MR.CO2).toFixed(0)} unit="g · 生成碳酸钙" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'gas'} pulse={next === 'gas'} onClick={() => gas.run()} disabled={busy || (tube === 'litmus' ? red : milky)}>通入二氧化碳</LabButton>
        <LabButton primary={next === 'heat'} pulse={next === 'heat'} onClick={() => heat.run()} disabled={busy || !red || heated || tube !== 'litmus'}>加热</LabButton>
      </>}
      extras={
        <Control label="试管">
          <Segmented label="试管" pulse={next === 'tube'} want={want} value={tube} disabled={busy} onChange={k => setTube(k as Tube)} options={(['litmus', 'lime'] as Tube[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
