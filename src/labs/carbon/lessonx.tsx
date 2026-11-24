// 碳和二氧化碳 · 拓展课 干冰：化验台第 6 格。一只泡沫保温箱里装着干冰，一台电子天平上垫着玻璃片，一只烧杯盛着温水，一支数字温度计。
// 一、干冰升华：用坩埚钳夹一块干冰放到天平的玻璃片上，读数一直在减少，玻璃片上却没有液体；测它的温度。
// 二、舞台烟雾：把干冰放进温水，冒出大量白雾，白雾沿着桌面往下流。白雾是水蒸气遇冷凝结成的小水滴，不是二氧化碳。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Led, Metal, useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, GlassPlate, Glove } from './gear'
import { Bubbles, Puffs, SMOKE } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useClock, useRun } from './parts'
import { DRY, DRY_ICE_T, sublime } from './physics'
import { rng } from './mats'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.x, Y = TOP, Z = BZ + 0.1
const u = (v: number) => v * M
const BOX: V3 = [X0 + u(-0.27), Y, Z + u(-0.06)]          // 保温箱
const BAL: V3 = [X0 + u(-0.1), Y, Z + u(0.03)]           // 电子天平
const PAN_Y = 0.052                                         // 秤盘上玻璃片的上表面（m）
const WB: V3 = [X0 + u(0.11), Y, Z + u(0.02)]             // 温水烧杯
const TH: V3 = [X0 + u(0.24), Y, Z + u(0.07)]             // 温度计
const TASKS: Task[] = [
  { id: 'put', text: '把一块干冰放到天平的玻璃片上', note: '读数一直在减少，玻璃片上却没有液体：干冰直接变成了气体，这叫升华' },
  { id: 'temp', text: '测一测干冰的温度', note: `约 ${DRY_ICE_T} °C：干冰升华时要吸收大量的热` },
  { id: 'fog', text: '把一块干冰放进温水', note: '冒出大量白雾：干冰升华吸热，空气里的水蒸气遇冷凝结成小水滴' },
]

/** 一块干冰：白色、带霜的方块，边角磨圆了一点。s 是边长（m） */
function DryIce({ s = 0.03 }: { s?: number }) {
  return <RoundedBox args={[u(s), u(s * 0.7), u(s * 0.85)]} radius={u(s * 0.12)} smoothness={2} position-y={u(s * 0.35)} castShadow><meshPhysicalMaterial color="#f4f7f8" roughness={0.75} sheen={0.6} sheenColor="#ffffff" emissive="#9fb7c4" emissiveIntensity={0.05} /></RoundedBox>
}
/** 泡沫保温箱：白色的厚壁箱子，盖子斜靠在旁边，里面一堆干冰块。原点在箱底正中 */
function Cooler() {
  const ice = useMemo(() => { const r = rng(5), gs: THREE.BufferGeometry[] = []; for (let i = 0; i < 14; i++) { const g = new THREE.BoxGeometry(u(0.03), u(0.02), u(0.026)); g.rotateY(r() * 3); g.rotateZ((r() - 0.5) * 0.5); g.translate(u((r() - 0.5) * 0.12), u(0.09 + r() * 0.02), u((r() - 0.5) * 0.09)); gs.push(g) } return mergeGeometries(gs) }, [])
  const foam = <meshStandardMaterial color="#f2f1ec" roughness={0.95} />
  return <group>
    <RoundedBox args={[u(0.2), u(0.012), u(0.15)]} radius={u(0.004)} position-y={u(0.006)} castShadow receiveShadow>{foam}</RoundedBox>
    {[-1, 1].map(s => <RoundedBox key={`x${s}`} args={[u(0.02), u(0.11), u(0.15)]} radius={u(0.004)} position={[s * u(0.09), u(0.055), 0]} castShadow>{foam}</RoundedBox>)}
    {[-1, 1].map(s => <RoundedBox key={`z${s}`} args={[u(0.2), u(0.11), u(0.02)]} radius={u(0.004)} position={[0, u(0.055), s * u(0.065)]} castShadow>{foam}</RoundedBox>)}
    <mesh geometry={ice} castShadow><meshPhysicalMaterial color="#f4f7f8" roughness={0.8} sheen={0.6} /></mesh>
    <RoundedBox args={[u(0.2), u(0.02), u(0.15)]} radius={u(0.004)} position={[u(0.12), u(0.07), -u(0.09)]} rotation={[0.2, 0.3, 1.25]} castShadow>{foam}</RoundedBox>
  </group>
}
/** 电子天平：浅灰的机身，前面斜面上一块读数屏，顶上一只不锈钢秤盘。原点在底面正中 */
function Balance({ text }: { text: string }) {
  return <group>
    <RoundedBox args={[u(0.2), u(0.04), u(0.26)]} radius={u(0.008)} smoothness={3} position-y={u(0.02)} castShadow receiveShadow><meshPhysicalMaterial color="#dfe2e3" roughness={0.42} clearcoat={0.4} /></RoundedBox>
    <group position={[0, u(0.03), u(0.105)]} rotation-x={-0.6}>
      <RoundedBox args={[u(0.17), u(0.004), u(0.05)]} radius={u(0.0015)}><meshStandardMaterial color="#2a3036" roughness={0.5} /></RoundedBox>
      <Led text={text} w={u(0.1)} h={u(0.03)} position={[-u(0.02), u(0.0022), 0]} rotation-x={-Math.PI / 2} />
    </group>
    <mesh position-y={u(0.043)}><cylinderGeometry args={[u(0.075), u(0.075), u(0.004), 48]} /><Metal kind="stainless" grain="turned" /></mesh>
    <mesh position-y={u(0.04)}><cylinderGeometry args={[u(0.012), u(0.012), u(0.006), 16]} /><Metal kind="steel" /></mesh>
  </group>
}
/** 坩埚钳：两条不锈钢钳臂，前端弯成小钩。原点在钳尖，钳柄朝 +y */
function Tongs() {
  return <group>
    {[-1, 1].map(s => <mesh key={s} position={[s * u(0.006), u(0.08), 0]} rotation-z={s * 0.06}><boxGeometry args={[u(0.003), u(0.16), u(0.004)]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    <mesh position-y={u(0.12)} rotation-x={Math.PI / 2}><torusGeometry args={[u(0.008), u(0.0015), 8, 20]} /><Metal kind="stainless" /></mesh>
  </group>
}
/** 数字温度计：黑色的手持表头，一根不锈钢探针。原点在探针尖，表头朝 +y */
function ProbeThermo({ text }: { text: string }) {
  return <group>
    <mesh position-y={u(0.06)}><cylinderGeometry args={[u(0.0018), u(0.0018), u(0.12), 10]} /><Metal kind="stainless" grain="turned" /></mesh>
    <RoundedBox args={[u(0.05), u(0.09), u(0.022)]} radius={u(0.006)} position-y={u(0.16)} castShadow><meshStandardMaterial color="#2b2f33" roughness={0.6} /></RoundedBox>
    <Led text={text} w={u(0.04)} h={u(0.02)} position={[0, u(0.18), u(0.0115)]} />
  </group>
}

export default function LessonX() {
  const [onPan, setOnPan] = useState(false)
  const [measured, setMeasured] = useState(false)
  const [inWater, setInWater] = useState(false)
  const T = useTasks('gewu:carbon:x', TASKS)
  const clock = useClock()
  const put = useRun(3, () => { setOnPan(true); clock.start() })
  const probe = useRun(3.6, () => { setMeasured(true); T.check(id => id === 'temp') })
  const drop = useRun(3, () => setInWater(true))
  const fogClock = useClock()
  useEffect(() => { if (inWater) fogClock.start() }, [inWater])   // eslint-disable-line react-hooks/exhaustive-deps
  const m = onPan ? sublime(clock.t) : 0
  useEffect(() => { if (onPan && clock.t > 3.2) T.check(id => id === 'put') }, [onPan && clock.t > 3.2])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (inWater && fogClock.t > 3) T.check(id => id === 'fog') }, [inWater && fogClock.t > 3])   // eslint-disable-line react-hooks/exhaustive-deps
  const busy = put.busy || probe.busy || drop.busy
  const resetAll = () => { put.snap(0); probe.snap(0); drop.snap(0); clock.stop(); fogClock.stop(); setOnPan(false); setMeasured(false); setInWater(false); T.reset() }

  // 夹干冰：从保温箱里夹起，平移，放下
  const from: V3 = [BOX[0], Y + u(0.1), BOX[2]]
  const tongAt = (r: typeof put, to: V3): V3 => liftPath(from, to, Y + u(0.15), ease(seg(r.t, 0.2, 2.2)))
  const panTop: V3 = [BAL[0], Y + u(PAN_Y), BAL[2]]
  const carrying = put.busy ? tongAt(put, panTop) : drop.busy ? tongAt(drop, [WB[0], Y + u(BEAKER[500].h + 0.02), WB[2]]) : null
  const side = Math.cbrt(Math.max(0.05, m / DRY.m0)) * 0.03
  const probeAt: V3 = probe.busy ? liftPath([TH[0], Y + u(0.004), TH[2]], [panTop[0] + u(0.004), panTop[1] + u(0.012), panTop[2]], Y + u(0.22), ease(seg(probe.t, 0, 1.4)) - ease(seg(probe.t, 2.8, 3.6))) : [TH[0], Y + u(0.004), TH[2]]
  const reading = probe.busy && probe.t > 1.6 && probe.t < 2.9
  const tText = reading || measured ? DRY_ICE_T.toFixed(1) : '20.0'
  const ft = inWater ? fogClock.t : 0

  const task = T.current
  const { hint, next }: { hint: string; next: 'put' | 'probe' | 'drop' | null } = !task ? { hint: '干冰是固态的二氧化碳，常温下直接升华成气体，同时吸收大量的热。', next: null }
    : put.busy || drop.busy ? { hint: '用坩埚钳夹一块干冰…', next: null }
    : probe.busy ? { hint: '把温度计的探针贴在干冰上…', next: null }
    : task.id === 'put' ? (onPan ? { hint: '看天平的读数和玻璃片…', next: null } : { hint: '干冰不能用手直接拿。用坩埚钳夹一块放到天平的玻璃片上', next: 'put' })
    : task.id === 'temp' ? { hint: '读数一直在减少。测一测干冰的温度', next: 'probe' }
    : inWater ? { hint: '看烧杯口…', next: null }
    : { hint: '再夹一块干冰，放进温水', next: 'drop' }

  const labels: Label[] = [
    { id: 'm', at: [BAL[0] - u(0.12), Y + u(0.05), BAL[2]], ax: 1, className: `scene-tag ${onPan ? 'key' : ''} -translate-y-1/2`, children: <><small>天平</small>{m.toFixed(2)} g</> },
    ...(onPan ? [{ id: 'dry', at: [BAL[0], Y + u(PAN_Y + 0.05), BAL[2]] as V3, ax: 0.5, className: 'scene-name -translate-y-full', children: '玻璃片上没有液体' }] : []),
    ...(reading || measured ? [{ id: 't', at: [TH[0] + u(0.04), Y + u(0.18), TH[2]] as V3, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>温度</small>{DRY_ICE_T} °C</> }] : []),
    ...(inWater ? [{ id: 'fog', at: [WB[0] - u(0.08), Y + u(BEAKER[500].h + 0.06), WB[2]] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '白雾是小水滴' }] : []),
    { id: 'n1', at: [BOX[0], Y + u(0.13), BOX[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '干冰（保温箱）' },
    { id: 'n2', at: [WB[0], Y - u(0.006), WB[2] + u(0.06)], ax: 0.5, name: true, className: 'scene-name', children: '温水' },
  ]
  return (
    <LabShell title="碳和二氧化碳" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel="干冰"
      stage={<Place at="x" labels={labels}>
        <group position={BOX}><Cooler /></group>
        <group position={BAL}>
          <Balance text={m.toFixed(2)} />
          <group position-y={u(0.045)}><GlassPlate /></group>
        </group>
        {onPan && m > 0.1 && <group position={panTop}><DryIce s={side} /></group>}
        <Puffs at={[panTop[0], panTop[1] + u(0.01), panTop[2]]} on={onPan && m > 0.5} opt={{ rate: 7, life: 2.2, size: [u(0.01), u(0.05)], speed: u(0.02), dir: [0, -0.2, 1], spread: 0.6, color: '#f4f7f8', opacity: 0.22, accel: [0, -u(0.02), 0], drag: 0.6 }} seed={2} />
        {/* 温水烧杯：干冰放进去以后剧烈冒泡，白雾从杯口溢出来，顺着桌面流下去 */}
        <group position={WB}><Beaker vol={500} fill={0.55} color="#d6e8ee" opacity={0.4} /></group>
        {inWater && <group position={[WB[0], Y + u(0.004), WB[2]]}><DryIce s={0.026} /></group>}
        <Bubbles at={[WB[0], Y + u(0.012), WB[2]]} top={u(BEAKER[500].h * 0.55 - 0.012)} on={inWater} rate={90} r={u(0.003)} spread={u(0.012)} speed={u(0.12)} seed={6} />
        <Puffs at={[WB[0], Y + u(BEAKER[500].h * 0.6), WB[2]]} on={inWater} opt={SMOKE.fog(u(0.05))} seed={4} />
        <Puffs at={[WB[0], Y + u(BEAKER[500].h + 0.005), WB[2] + u(0.03)]} on={inWater && ft > 1} opt={{ ...SMOKE.fog(u(0.05)), rate: 12, speed: u(0.03), dir: [0.2, -0.6, 1], accel: [0, -u(0.04), 0] }} seed={8} />
        <Puffs at={[WB[0], Y + u(0.01), WB[2] + u(0.06)]} on={inWater && ft > 2} opt={{ rate: 8, life: 4, size: [u(0.02), u(0.08)], speed: u(0.03), dir: [0.3, 0, 1], spread: 0.9, color: '#f2f5f6', opacity: 0.3, accel: [0, 0, 0], drag: 0.5, jitter: u(0.02) }} seed={9} />
        {/* 坩埚钳和手 */}
        {carrying && <group position={carrying}>
          <group position-y={-u(0.004)}><Tongs /></group>
          {(put.busy ? put.t : drop.t) < 2.2 && <DryIce s={0.026} />}
          <group position={[0, u(0.15), 0]} rotation={[0.3, 0, 0.15]}><Glove /></group>
        </group>}
        <group position={probeAt} rotation-z={probe.busy ? -0.25 : Math.PI / 2 - 0.05}>
          <ProbeThermo text={tText} />
          {probe.busy && <group position={[0, u(0.17), -u(0.005)]} rotation={[0.3, 0, 0.1]}><Glove /></group>}
        </group>
      </Place>}
      lesson={<LessonBlock no="拓展" title="干冰" concept="干冰升华吸热" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>固态的二氧化碳叫干冰。常温常压下，干冰不经过液态，直接变成二氧化碳气体，这叫升华。升华时吸收大量的热。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>冷藏食品、运输疫苗：用干冰降温，化了也不留水</li>
            <li>人工降雨：干冰升华吸热，云里的水蒸气凝结成小水滴、小冰晶，聚大了落下来</li>
            <li>舞台烟雾：把干冰放进水里，冒出的白雾是空气里的水蒸气遇冷凝结成的小水滴，不是二氧化碳气体（二氧化碳是无色的）</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">干冰温度很低，不能用手直接拿，要用钳子或戴厚手套；也不能放进密封的瓶子里，升华出的气体会把瓶子胀破。天平上的减少过程加快了。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">干冰的两个实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">干冰升华，吸收大量的热</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">干冰直接变成气体，不留液体，温度约 {DRY_ICE_T} °C。放进温水冒出的白雾是小水滴。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">天平上的干冰</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{m.toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="m₀" value={DRY.m0.toFixed(2)} unit="g · 放上去时 · 过程加快" />
            <ParamTile symbol="t" value={measured ? DRY_ICE_T.toFixed(1) : '—'} unit="°C · 干冰的温度" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'put'} pulse={next === 'put'} onClick={() => put.run()} disabled={busy || onPan}>放上干冰</LabButton>
        <LabButton primary={next === 'probe'} pulse={next === 'probe'} onClick={() => probe.run()} disabled={busy || !onPan || measured}>测温度</LabButton>
        <LabButton primary={next === 'drop'} pulse={next === 'drop'} onClick={() => drop.run()} disabled={busy || inWater || !measured}>放进温水</LabButton>
      </>}
      extras={null}
    />
  )
}
