// 水的净化和组成 · 第 6 课 硬水和软水：化验台第 4 格。试管架上两支试管装着井水和蒸馏水，各加几滴肥皂水振荡：井水泡沫少、浮渣多，是硬水；蒸馏水泡沫多。
// 中间的三脚架上把一杯井水煮沸，杯底结出白色的水垢；倒一支试管再试，泡沫多了。右边是蒸馏装置：烧瓶里的井水沸腾，温度计读 100 °C，
// 水蒸气在冷凝管里变成水，一滴滴流进锥形瓶；蒸馏得到的水再试，泡沫最多。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Metal, Rod, shell, useTasks, type Label, type RY } from '@/lab-kit'
import { AlcoholLamp, Beaker, DropBottle, Glass, Glove, Hose, IronStand, LAMP_TOP, Liquid, TRIPOD, TestTube, Thermometer, Tripod, TubeRack, Clamp, m } from './gear'
import { Bubbles, Drips, Flame, Puffs } from './fx'
import { LESSONS, goLesson } from './lessons'
import { lerp, seg, useRun } from './parts'
import { BOIL, HARD, HARD_NAME, ROOM, foam, foamWord, isHard, type HardKey } from './physics'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l6, Y = TOP, Z = BZ + 0.1
const RACK: V3 = [X0 - 0.3 * M, Y, Z + 0.04 * M], GAP = 0.035
const TUBES: HardKey[] = ['well', 'distilled', 'boiled', 'distilled']
const TUBE_NAME = ['井水', '蒸馏水', '煮沸过的井水', '蒸馏得到的水']
const BOILER: V3 = [X0 - 0.06 * M, Y, Z]
/** 蒸馏装置（m，相对 X0）：烧瓶的球心、侧管口、冷凝管两头、锥形瓶 */
const FL = { x: 0.12, ring: 0.12, r: 0.042 }, FLY = FL.ring + 0.002 + FL.r, ARM_Y = 0.245
const C0: [number, number] = [0.2, 0.226], C1: [number, number] = [0.41, 0.16]
const RECV = 0.43
const T_SOAP = 4.5, T_BOIL = 9, T_STILL = 13
const TASKS: Task[] = [
  { id: 'soap', text: '往井水、蒸馏水里各加肥皂水，振荡', note: '井水泡沫少、浮渣多，是硬水；蒸馏水泡沫多，是软水' },
  { id: 'boil', text: '把井水煮沸，再用肥皂水试', note: '煮沸时钙、镁化合物变成水垢析出，泡沫变多了' },
  { id: 'still', text: '蒸馏井水，再用肥皂水试', note: '蒸馏得到的水泡沫最多：蒸馏得到的是纯水' },
]

/** 蒸馏烧瓶：球形的瓶身、细长的瓶颈。原点在瓶底 */
function Flask() {
  const g = useMemo(() => {
    const p: RY[] = []
    for (let i = 0; i <= 14; i++) { const a = -Math.PI / 2 + i / 14 * (Math.PI - 0.28); p.push([Math.cos(a) * FL.r, FL.r + Math.sin(a) * FL.r]) }
    p.push([0.012, 0.2], [0.012, 0.27], [0.0135, 0.274])
    p[0] = [0, 0]
    return shell(m(p), 0.0016 * M, { segs: 48, crease: 50 })
  }, [])
  return <mesh geometry={g} renderOrder={7}><Glass opacity={0.18} /></mesh>
}

export default function Lesson6() {
  const [tested, setTested] = useState<boolean[]>([false, false, false, false])
  const [boiled, setBoiled] = useState(false)
  const [stilled, setStilled] = useState(false)
  const T = useTasks('gewu:water:6', TASKS)
  const filled = [true, true, boiled, stilled]
  const todo = filled.map((f, i) => f && !tested[i])
  const soap = useRun(T_SOAP, () => {
    const n = tested.map((t, i) => t || filled[i]); setTested(n)
    T.check(id => (id === 'soap' && n[0] && n[1]) || (id === 'boil' && n[2]) || (id === 'still' && n[3]))
  })
  const boil = useRun(T_BOIL, () => setBoiled(true))
  const still = useRun(T_STILL, () => setStilled(true))
  const busy = soap.busy || boil.busy || still.busy
  const resetAll = () => { soap.snap(0); boil.snap(0); still.snap(0); setTested([false, false, false, false]); setBoiled(false); setStilled(false); T.reset() }

  // 加肥皂水：滴管依次在每支要试的试管上方滴几滴，然后试管晃动；泡沫慢慢长起来
  const st = soap.t, which = todo.map((t, i) => t ? i : -1).filter(i => i >= 0)
  const dropAt = soap.busy && which.length ? which[Math.min(which.length - 1, Math.floor(st / (2 / which.length)))] : -1
  const shake = soap.busy && st > 2 ? Math.sin(st * 30) * 0.12 * (1 - seg(st, 3.8, 4.4)) : 0
  const grow = (i: number) => tested[i] ? 1 : soap.busy && todo[i] ? seg(st, 2.2, 4.4) : 0
  // 煮沸：酒精灯点着，杯里冒泡、冒白汽，杯底一层白色的水垢；煮完倒进第三支试管
  const bt = boil.t, boiling = boil.busy && bt > 1.5 && bt < T_BOIL - 1
  const scale = boiled ? 1 : boil.busy ? seg(bt, 2.5, T_BOIL - 1.5) : 0
  // 蒸馏：烧瓶里的井水沸腾，温度计升到 100 °C，冷凝管下端一滴滴流进锥形瓶
  const tt = still.t, lit = still.busy && tt < T_STILL - 0.8
  const temp = stilled ? BOIL : still.busy ? lerp(ROOM, BOIL, seg(tt, 1, 4.5)) : ROOM
  const dripping = still.busy && tt > 5 && tt < T_STILL - 1
  const recv = stilled ? 1 : still.busy ? seg(tt, 5, T_STILL - 1) : 0
  const tubeFill = [0.33, 0.33, boiled ? 0.33 : boil.busy ? 0.33 * seg(bt, T_BOIL - 0.9, T_BOIL) : 0, stilled ? 0.33 : still.busy ? 0.33 * seg(tt, T_STILL - 0.9, T_STILL) : 0]

  const task = T.current
  const { hint, next }: { hint: string; next: 'soap' | 'boil' | 'still' | null } = !task ? { hint: '用肥皂水区分硬水和软水；煮沸能降低水的硬度，蒸馏得到的是纯水。', next: null }
    : soap.busy ? { hint: '滴几滴肥皂水，振荡，看泡沫…', next: null }
    : boil.busy ? { hint: '把一杯井水煮沸，看杯底…', next: null }
    : still.busy ? { hint: temp < BOIL - 1 ? '加热烧瓶里的井水…' : '水蒸气进入冷凝管，变成水滴流下来…', next: null }
    : todo.some(Boolean) ? { hint: task.id === 'soap' ? '往井水和蒸馏水里各加几滴肥皂水，振荡' : '往刚得到的水里加肥皂水，振荡', next: 'soap' }
    : task.id === 'boil' ? { hint: '井水是硬水。把一杯井水煮沸', next: 'boil' }
    : { hint: '再用蒸馏的方法处理井水', next: 'still' }

  const RX = (i: number) => RACK[0] + (i - 1.5) * GAP * M
  const flY = Y + FL.ring * M
  const labels: Label[] = [
    ...TUBES.map((k, i) => ({ id: `t${i}`, at: [RX(i), Y + 0.17 * M + (i % 2) * 0.035 * M, RACK[2]] as V3, ax: 0.5, className: `scene-tag -translate-y-full transition-opacity`, style: { opacity: tested[i] ? 1 : 0 }, children: <><small>{TUBE_NAME[i]}</small>{isHard(HARD[k]) ? '泡沫少' : '泡沫多'}</> })),
    ...(still.busy || stilled ? [{ id: 'th', at: [X0 + FL.x * M - 0.03 * M, Y + 0.34 * M, Z] as V3, ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>温度计</small>{Math.round(temp)} °C</> }] : []),
    ...(scale > 0.4 ? [{ id: 'sc', at: [BOILER[0] - 0.05 * M, Y + (TRIPOD.h + 0.006) * M, BOILER[2]] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '水垢' }] : []),
    { id: 'n1', at: [X0 + (C0[0] + C1[0]) / 2 * M, Y + 0.25 * M, Z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '冷凝管' },
    { id: 'n2', at: [X0 + RECV * M, Y + 0.02 * M, Z + 0.3], ax: 0.5, name: true, className: 'scene-name', children: '锥形瓶' },
    { id: 'n3', at: [RACK[0] - 0.12 * M, Y + 0.05 * M, RACK[2] + 0.05 * M], ax: 0.5, name: true, className: 'scene-name', children: '肥皂水' },
  ]
  return (
    <LabShell title="水的净化和组成" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="硬水和软水"
      stage={<Place at={still.busy ? 'l6b' : 'l6a'} labels={labels}>
        {/* 试管架和四支试管 */}
        <group position={RACK}><TubeRack n={4} gap={GAP} /></group>
        {TUBES.map((k, i) => { const f = foam(HARD[k]), g = grow(i); return <group key={i} position={[RX(i), Y + 0.009 * M, RACK[2]]} rotation-z={todo[i] && soap.busy ? shake : 0}>
          <TestTube fill={tubeFill[i]} k={0.02} foam={f.foam / 100 * g} scum={f.scum * g} />
        </group> })}
        <group position={[RACK[0] - 0.13 * M, Y, RACK[2] + 0.02 * M]}><DropBottle label="肥皂水" color="#efe9d2" band="#2f8f6b" /></group>
        {dropAt >= 0 && <group position={[RX(dropAt), Y + 0.2 * M, RACK[2]]}><mesh position-y={-0.025 * M} renderOrder={7}><cylinderGeometry args={[0.003 * M, 0.0016 * M, 0.06 * M, 12]} /><Glass opacity={0.35} /></mesh>
          <mesh position-y={0.016 * M}><capsuleGeometry args={[0.0065 * M, 0.016 * M, 6, 16]} /><meshStandardMaterial color="#b8352a" roughness={0.55} /></mesh>
          <group position={[0, 0.03 * M, 0.01 * M]} rotation={[0.3, 0, 0]}><Glove s={0.0052 * M} /></group></group>}
        <Drips at={[dropAt >= 0 ? RX(dropAt) : RACK[0], Y + 0.17 * M, RACK[2]]} drop={0.09 * M} on={dropAt >= 0 && st < 2} every={0.35} r={0.002 * M} color="#efe9d2" />
        {/* 煮井水：三脚架、陶土网、烧杯、酒精灯 */}
        <group position={BOILER}>
          <Tripod />
          <group position-y={(TRIPOD.h + 0.004) * M}><Beaker vol={250} fill={boiled ? 0.35 : 0.6 - 0.1 * seg(bt, 2, T_BOIL)} k={0.03} mud={0.0025 * scale} mudColor="#efede4" /></group>
          <group position-y={0.004 * M}><AlcoholLamp /></group>
        </group>
        <Flame at={[BOILER[0], Y + (LAMP_TOP + 0.006) * M, BOILER[2]]} w={0.02 * M} h={0.045 * M} kind="alcohol" level={boil.busy && bt < T_BOIL - 0.8 ? 1 : 0} seed={3} light={1.2} />
        <Bubbles at={[BOILER[0], Y + (TRIPOD.h + 0.01) * M, BOILER[2]]} top={0.05 * M} on={boiling} rate={40} r={0.0018 * M} spread={0.025 * M} speed={0.12 * M} seed={4} />
        <Puffs at={[BOILER[0], Y + (TRIPOD.h + 0.09) * M, BOILER[2]]} on={boiling} opt={{ rate: 10, life: 2, size: [0.02 * M, 0.08 * M], speed: 0.05 * M, spread: 0.2, color: '#f2f4f5', opacity: 0.25, accel: [0, 0.03 * M, 0], drag: 0.5 }} seed={9} />
        {/* 蒸馏装置 */}
        <group position={[X0 + FL.x * M, Y, Z - (0.1 - 0.04) * M]}><IronStand ringY={FL.ring} reach={0.1} ring={0.034} rodH={0.42} /></group>
        <mesh position={[X0 + FL.x * M, flY + 0.003 * M, Z]} castShadow><cylinderGeometry args={[0.05 * M, 0.05 * M, 0.003 * M, 32]} /><meshStandardMaterial color="#8e8d88" roughness={0.9} metalness={0.3} /></mesh>
        <group position={[X0 + FL.x * M, flY + 0.005 * M, Z]}>
          <Flask />
          <mesh position-y={FL.r * M} renderOrder={5}><sphereGeometry args={[(FL.r - 0.002) * M, 28, 16, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58]} /><Liquid color="#cfe6ec" opacity={0.42} /></mesh>
          {/* 橡胶塞、穿过它的温度计（液泡对着侧管口） */}
          <mesh position-y={0.282 * M}><cylinderGeometry args={[0.0145 * M, 0.012 * M, 0.02 * M, 20]} /><meshStandardMaterial color="#2b2b2d" roughness={0.75} /></mesh>
          <group position-y={(ARM_Y - FL.ring - 0.005) * M}><Thermometer temp={temp} /></group>
          {[0, 1, 2].map(i => <mesh key={i} position={[(i - 1) * 0.01 * M, 0.004 * M, (i % 2) * 0.008 * M]}><dodecahedronGeometry args={[0.0025 * M, 0]} /><meshStandardMaterial color="#d6d1c6" roughness={1} /></mesh>)}
        </group>
        <group position={[X0 + FL.x * M, Y + 0.004 * M, Z]}><AlcoholLamp /></group>
        <Flame at={[X0 + FL.x * M, Y + (LAMP_TOP + 0.01) * M, Z]} w={0.02 * M} h={0.045 * M} kind="alcohol" level={lit ? 1 : 0} seed={5} light={1.2} />
        <Bubbles at={[X0 + FL.x * M, flY + 0.01 * M, Z]} top={0.04 * M} on={still.busy && tt > 3 && tt < T_STILL - 1} rate={30} r={0.0018 * M} spread={0.02 * M} speed={0.1 * M} seed={6} />
        {/* 侧管、冷凝管（外套里通冷水，下进上出）、接液管和锥形瓶 */}
        <Rod from={[X0 + (FL.x + 0.012) * M, Y + (ARM_Y + 0.004) * M, Z]} to={[X0 + C0[0] * M, Y + C0[1] * M, Z]} r={0.0035 * M}><Glass opacity={0.3} /></Rod>
        <Rod from={[X0 + C0[0] * M, Y + C0[1] * M, Z]} to={[X0 + C1[0] * M, Y + C1[1] * M, Z]} r={0.0045 * M}><Glass opacity={0.3} /></Rod>
        <Rod from={[X0 + (C0[0] + 0.03) * M, Y + (C0[1] - 0.009) * M, Z]} to={[X0 + (C1[0] - 0.04) * M, Y + (C1[1] + 0.012) * M, Z]} r={0.016 * M}><meshPhysicalMaterial color="#d8eef4" transparent opacity={0.3} roughness={0.05} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} /></Rod>
        {[[C0[0] + 0.045, C0[1] - 0.013, 1], [C1[0] - 0.055, C1[1] + 0.016, -1]].map(([x, y, s], i) => <group key={i}>
          <Rod from={[X0 + x * M, Y + y * M, Z]} to={[X0 + x * M, Y + (y + 0.03 * s) * M, Z + 0.015 * M]} r={0.0035 * M}><Glass opacity={0.35} /></Rod>
          <Hose pts={[[X0 + x * M, Y + (y + 0.03 * s) * M, Z + 0.015 * M], [X0 + x * M, Y + (y + 0.05 * s) * M, Z + 0.05 * M], [X0 + (x + 0.05) * M, Y + 0.01 * M, Z + 0.12 * M]]} r={0.0028 * M} color="#8c3b2e" />
        </group>)}
        <Rod from={[X0 + C1[0] * M, Y + C1[1] * M, Z]} to={[X0 + RECV * M, Y + 0.11 * M, Z]} r={0.004 * M}><Glass opacity={0.3} /></Rod>
        <group position={[X0 + 0.3 * M, Y, Z - 0.1 * M]}><mesh position-y={0.2 * M} castShadow><cylinderGeometry args={[0.005 * M, 0.005 * M, 0.4 * M, 16]} /><Metal kind="chrome" rough={0.12} /></mesh>
          <mesh position-y={0.006 * M} castShadow><boxGeometry args={[0.1 * M, 0.012 * M, 0.12 * M]} /><meshStandardMaterial color="#25292d" roughness={0.45} metalness={0.4} /></mesh></group>
        <group position={[X0 + 0.3 * M, Y + 0.19 * M, Z]} rotation-z={0.29}><Clamp len={0.1} open={0.016} /></group>
        <group position={[X0 + RECV * M, Y, Z]}><ConicalFlask fill={recv * 0.25} /></group>
        <Drips at={[X0 + RECV * M, Y + 0.105 * M, Z]} drop={0.06 * M} on={dripping} every={0.45} r={0.0022 * M} />
      </Place>}
      lesson={<LessonBlock no="6" title="硬水和软水" concept="肥皂水分硬软，煮沸、蒸馏能降低硬度" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>含有较多可溶性钙、镁化合物的水叫<b className="text-white">硬水</b>，不含或含较少的叫<b className="text-white">软水</b>。往水里加肥皂水振荡，泡沫少、浮渣多的是硬水，泡沫多的是软水。</p>
          <p className="mt-3">生活中常用<b className="text-white">煮沸</b>的方法降低水的硬度：一部分钙、镁化合物变成水垢沉出来。实验室用<b className="text-white">蒸馏</b>：把水加热成水蒸气，再冷凝成水，得到的蒸馏水是纯净物，是净化程度最高的方法。</p>
          <p className="mt-3 text-[13.5px] text-white/65">蒸馏时烧瓶里要放几粒沸石，防止暴沸；冷凝管里的冷水从下口进、上口出。硬水洗衣服既浪费肥皂又洗不干净，锅炉用硬水容易结垢。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四支试管都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">肥皂水区分硬水软水；煮沸降低硬度，蒸馏得到纯水</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">井水{foamWord(HARD.well)}；煮沸后{foamWord(HARD.boiled)}；蒸馏得到的水{foamWord(HARD.distilled)}。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">蒸馏时温度计的读数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{still.busy || stilled ? Math.round(temp) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">°C</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="沸点" value={`${BOIL} °C`} unit="水 · 一个大气压" />
            <ParamTile symbol="肥皂水" value="几滴" unit="每支一样多" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">加肥皂水振荡后</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium">水</th><th className="pb-1 font-medium">现象</th><th className="pb-1 font-medium">是</th></tr></thead>
            <tbody>{TUBES.map((k, i) => <tr key={i} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{TUBE_NAME[i]}</td><td className="text-[12.5px]">{tested[i] ? foamWord(HARD[k]) : '—'}</td><td className={`rounded-r-lg font-semibold ${tested[i] && !isHard(HARD[k]) ? 'text-[#7fe3d4]' : ''}`}>{tested[i] ? (isHard(HARD[k]) ? '硬水' : '软水') : '—'}</td></tr>)}</tbody>
          </table>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'soap'} pulse={next === 'soap'} onClick={() => soap.run()} disabled={busy || !todo.some(Boolean)}>加肥皂水，振荡</LabButton>
        <LabButton primary={next === 'boil'} pulse={next === 'boil'} onClick={() => boil.run()} disabled={busy || boiled || !tested[0]}>煮沸井水</LabButton>
        <LabButton primary={next === 'still'} pulse={next === 'still'} onClick={() => still.run()} disabled={busy || stilled || !tested[2]}>蒸馏井水</LabButton>
      </>}
      extras={null}
    />
  )
}

/** 锥形瓶：原点在瓶底正中，fill 盛了多少（0–1） */
function ConicalFlask({ fill }: { fill: number }) {
  const g = useMemo(() => shell(m([[0, 0], [0.036, 0], [0.04, 0.004], [0.014, 0.085], [0.014, 0.105], [0.0155, 0.108]]), 0.0016 * M, { segs: 40 }), [])
  const h = 0.085 * fill
  return <group>
    <mesh geometry={g} renderOrder={7}><Glass opacity={0.18} /></mesh>
    {fill > 0.01 && <mesh position-y={(0.002 + h / 2) * M} renderOrder={5}><cylinderGeometry args={[(0.038 - 0.026 * h / 0.085 * 0.95) * M, 0.037 * M, h * M, 32]} /><Liquid color="#cfe6ec" opacity={0.45} /></mesh>}
  </group>
}
