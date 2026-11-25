// 金属和炼铁 · 第 2 课 金属和氧气：化验台第 2 格的通风橱里，一盏酒精灯，右边一只蒸发皿里放着镁条、铝箔、铜丝、金丝，左边一块陶土网接产物。
// 选一种金属，用坩埚钳夹住放到外焰上加热：镁条剧烈燃烧、发出耀眼的白光，生成白色固体落在陶土网上；铝箔里的铝熔化了却被外面的氧化膜兜住不滴落；
// 铜丝表面变黑；金丝烧红了，拿开冷却后仍是金黄色。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, disc, lathe, useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, Glove, IronStand, LAMP_TOP, Tongs, Wire, coilPts, m } from './gear'
import { gauzeTex } from './mats'
import { Flame, Glow, Puffs } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun, type P3 } from './parts'
import { MG_RIBBON, OXY, fmtG, oxideMass, type OxMetal } from './physics'
import { BZ, M, ST, TOP, Place, spot, type V3 } from './world'

const X0 = ST.l2, Y = TOP, Z = BZ + 0.15
const at = (x: number, y = 0, z = 0): V3 => [X0 + x * M, Y + y * M, Z + z * M]
const VIEW = spot(X0 - 0.03 * M, Y + 0.14 * M, Z + 0.3, 3.9, 2.15, [0.12, 0.1], true)
const METALS: OxMetal[] = ['Mg', 'Al', 'Cu', 'Au']
const DISH = { x: 0.17 }, NET = { x: -0.17, y: 0.08 }
/** 蒸发皿里各样东西的位置（m，相对皿心） */
const SLOT: Record<OxMetal, [number, number]> = { Mg: [-0.018, -0.01], Al: [0.016, -0.012], Cu: [-0.012, 0.016], Au: [0.018, 0.014] }
/** 加热的时间轴（s）：夹起、送到火焰上、加热、拿开放下 */
const SEC: Record<OxMetal, number> = { Mg: 10, Al: 9.5, Cu: 9, Au: 9 }
const T_PICK = 1.2, T_FIRE = 2.4
const TASKS: Task[] = [
  { id: 'Mg', text: '点燃镁条', note: '剧烈燃烧，发出耀眼的白光，生成白色固体（氧化镁）' },
  { id: 'Al', text: '加热铝箔', note: '铝表面有一层致密的氧化铝薄膜，里面的铝不再被氧化' },
  { id: 'Cu', text: '加热铜丝', note: '红色的铜丝表面变黑，生成了氧化铜' },
  { id: 'Au', text: '加热金丝', note: '金在高温下也不和氧气反应，冷却后仍是金黄色' },
]

export default function Lesson2() {
  const [metal, setMetal] = useState<OxMetal>('Mg')
  const T = useTasks('gewu:metal:2', TASKS)
  const [used, setUsed] = useState<Partial<Record<OxMetal, boolean>>>({})
  const run = useRun(SEC[metal], () => { setUsed(u => ({ ...u, [metal]: true })); T.check(id => id === metal) })
  const resetAll = () => { run.snap(0); setUsed({}); setMetal('Mg'); T.reset() }
  const task = T.current?.id as OxMetal | undefined
  const t = run.t, busy = run.busy, sec = SEC[metal]

  // 坩埚钳的钳口：从皿里夹起，送到外焰上，最后放回（镁的产物落到陶土网上）
  const home = (k: OxMetal): P3 => at(DISH.x + SLOT[k][0], 0.035, SLOT[k][1])
  const over: P3 = at(0, LAMP_TOP + 0.045, 0), drop: P3 = metal === 'Mg' ? at(NET.x, NET.y + 0.02, 0) : home(metal)
  const backAt = sec - 1.4
  const rest: P3 = at(DISH.x + 0.07, 0.012, 0.075), top = at(0, 0.15)[1]
  const jaw: P3 = !busy ? rest : t < T_PICK ? liftPath(rest, home(metal), top, seg(t, 0, T_PICK)) : t < T_FIRE ? liftPath(home(metal), over, top, seg(t, T_PICK, T_FIRE)) : t < backAt ? over : liftPath(over, drop, top, seg(t, backAt, sec - 0.2))
  const holding = busy && t > T_PICK
  const heat = busy ? ease(seg(t, T_FIRE, T_FIRE + 1.2)) * (1 - ease(seg(t, backAt, backAt + 0.5))) : 0
  // 各种金属的变化
  const mgBurn = metal === 'Mg' && busy ? seg(t, T_FIRE + 0.8, backAt - 0.3) : used.Mg ? 1 : 0
  const mgFlare = metal === 'Mg' && busy && t > T_FIRE + 0.8 && t < backAt - 0.1 ? Math.min(1, (t - T_FIRE - 0.8) * 3) * (1 - seg(t, backAt - 0.6, backAt - 0.1) * 0.9) : 0
  const cuBlack = used.Cu ? 1 : metal === 'Cu' && busy ? ease(seg(t, T_FIRE + 0.6, backAt - 0.4)) : 0
  const auGlow = metal === 'Au' && busy ? heat : 0
  const alSag = used.Al ? 1 : metal === 'Al' && busy ? ease(seg(t, T_FIRE + 0.8, backAt - 0.5)) : 0
  const alHot = metal === 'Al' && busy ? heat : 0

  const want = task ?? null
  const hint = !task ? '四种金属都试过了。' : busy
    ? ({ Mg: '镁条在外焰上被点燃…', Al: '铝箔在外焰上加热…', Cu: '铜丝在外焰上加热…', Au: '金丝在外焰上加热…' } as Record<OxMetal, string>)[metal]
    : metal !== task ? `选“${OXY[task].sample}”` : `用坩埚钳夹住${OXY[task].sample}，放到外焰上加热`
  const next = !task || busy ? null : metal !== task ? 'pick' : 'heat'

  const labels: Label[] = [
    { id: 'n1', at: at(DISH.x, 0.05, 0.03), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蒸发皿里的样品' },
    { id: 'n2', at: at(NET.x, NET.y + 0.02, 0.03), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '陶土网' },
    { id: 'n3', at: at(0.03, 0.02, 0.05), ax: 0, name: true, className: 'scene-name', children: '酒精灯' },
    ...(mgFlare > 0.3 ? [{ id: 'k1', at: at(-0.05, LAMP_TOP + 0.1, 0) as V3, ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>镁条</small>耀眼的白光</> }] : []),
    ...(used.Mg && !(busy && metal === 'Mg') ? [{ id: 'k2', at: at(NET.x, NET.y + 0.03, -0.01) as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>白色固体</small>氧化镁</> }] : []),
    ...(cuBlack > 0.6 ? [{ id: 'k3', at: [...(metal === 'Cu' && busy ? jaw : home('Cu'))].map((v, i) => v + [0.25, 0.25, 0][i]) as V3, ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>铜丝</small>表面变黑</> }] : []),
    ...(alSag > 0.5 ? [{ id: 'k4', at: [...(metal === 'Al' && busy ? jaw : home('Al'))].map((v, i) => v + [0.3, 0.05, 0][i]) as V3, ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>铝箔</small>熔而不滴</> }] : []),
    ...(used.Au && !(busy && metal === 'Au') ? [{ id: 'k5', at: [...home('Au')].map((v, i) => v + [0.25, 0.2, 0][i]) as V3, ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>金丝</small>仍是金黄色</> }] : []),
  ]
  const dish = useMemo(() => lathe(m([[0, 0], [0.02, 0], [0.034, 0.008], [0.044, 0.022], [0.046, 0.024], [0.043, 0.024], [0.041, 0.022], [0.031, 0.01], [0.018, 0.004], [0, 0.004]]), { segs: 48, closed: false }), [])
  const net = useMemo(() => disc(0.035 * M, 0.0025 * M), [])

  /** 一份样品：在皿里，或被钳子夹着（at 是钳口位置） */
  const sample = (k: OxMetal, p: P3, held: boolean) => {
    const rot = held ? 0 : 0.5
    if (k === 'Mg') { const L = 0.05 * (1 - mgBurn * 0.85); return <group position={p} rotation-y={rot}>
      {L > 0.006 && <mesh position={[-L / 2 * M, 0, 0]} rotation-z={Math.PI / 2}><boxGeometry args={[0.003 * M, L * M, 0.0004 * M]} /><Metal kind="aluminum" grain="brushed" rough={0.45} /></mesh>}
      {mgBurn > 0.05 && <mesh position={[-(L + 0.008) * M, -0.002 * M * mgBurn, 0]}><sphereGeometry args={[0.0035 * M * (0.6 + mgBurn), 10, 8]} /><meshStandardMaterial color="#f5f4ee" roughness={1} /></mesh>}
    </group> }
    if (k === 'Al') return <group position={p} rotation-y={rot}>
      <mesh position={[-0.014 * M, -alSag * 0.004 * M, 0]} rotation={[0, 0, alSag * 0.35]} scale={[1, 1, 1 - alSag * 0.15]}><boxGeometry args={[0.028 * M, 0.0004 * M, 0.02 * M]} /><meshStandardMaterial color={new THREE.Color('#e2e4e6').lerp(new THREE.Color('#a6a9ab'), alSag)} metalness={0.55 - alSag * 0.2} roughness={0.32 + alSag * 0.35} emissive="#ff6a1a" emissiveIntensity={alHot * 0.6} /></mesh>
      {alSag > 0.3 && <mesh position={[-0.02 * M, -0.006 * M * alSag, 0]} scale={[1.4, 0.8, 1]}><sphereGeometry args={[0.0045 * M * alSag, 14, 10]} /><meshStandardMaterial color="#b8babc" metalness={0.7} roughness={0.35} emissive="#ff6a1a" emissiveIntensity={alHot * 0.4} /></mesh>}
    </group>
    const coil = coilPts(0.0035 * M, 0.018 * M, 3, 0.012 * M)
    return <group position={p} rotation={[0, rot, Math.PI / 2]}>
      <group position={[0, -0.03 * M, 0]}>
        {k === 'Cu'
          ? <Wire pts={coil} r={0.0006 * M} kind="copper" coat="#1a1614" coatK={cuBlack} />
          : <Wire pts={coil} r={0.0006 * M} kind="brass" rough={0.16} />}
      </group>
      {k === 'Au' && <Glow at={[0, -0.02 * M, 0]} size={0.06 * M} color="#ff8a3a" level={auGlow * 0.9} flicker={0.05} />}
    </group>
  }

  return (
    <LabShell title="金属和炼铁" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="加热"
      stage={<Place at={VIEW} labels={labels}>
        <group position={at(0, 0, 0)}><AlcoholLamp /></group>
        <Flame at={at(0, LAMP_TOP, 0)} w={0.032 * M} h={0.07 * M} kind="alcohol" level={1} seed={2} />
        {/* 陶土网：铁架台的铁圈上放一张方形铁丝网，中间一块陶土圆 */}
        <group position={at(NET.x, 0, 0)}>
          <IronStand rodH={0.22}>
            {/* 双顶丝和铁圈的柄：从立杆伸到铁圈 */}
            <RoundedBox args={[0.02 * M, 0.022 * M, 0.02 * M]} radius={0.003 * M} position-y={(NET.y - 0.004) * M} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
            <mesh position={[0, (NET.y - 0.004) * M, 0.012 * M]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.0028 * M, 0.0028 * M, 0.024 * M, 10]} /><Metal kind="steel" /></mesh>
          </IronStand>
          <mesh position-y={(NET.y - 0.004) * M} rotation-x={Math.PI / 2}><torusGeometry args={[0.04 * M, 0.0028 * M, 10, 48]} /><Metal kind="steel" /></mesh>
          <mesh position-y={NET.y * M - 0.0035 * M} rotation-x={-Math.PI / 2}><planeGeometry args={[0.125 * M, 0.125 * M]} /><meshStandardMaterial map={gauzeTex()} transparent alphaTest={0.3} metalness={0.6} roughness={0.5} side={THREE.DoubleSide} /></mesh>
          <mesh position-y={NET.y * M - 0.002 * M} geometry={net} castShadow receiveShadow><meshStandardMaterial color="#e6dfd2" roughness={1} /></mesh>
          {/* 燃烧后落下的白色氧化镁 */}
          {used.Mg && !(busy && metal === 'Mg') && <group position-y={NET.y * M + 0.003 * M}>{[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.cos(i * 2.2) * 0.006 * M, 0, Math.sin(i * 2.2) * 0.006 * M]} scale={[1.3, 0.6, 1]}><sphereGeometry args={[0.004 * M, 10, 8]} /><meshStandardMaterial color="#f4f3ee" roughness={1} /></mesh>)}</group>}
        </group>
        {/* 蒸发皿和样品 */}
        <group position={at(DISH.x, 0, 0)}><mesh geometry={dish} castShadow receiveShadow><meshPhysicalMaterial color="#f2f0ea" roughness={0.25} clearcoat={0.6} side={THREE.DoubleSide} /></mesh></group>
        {METALS.map(k => (holding && k === metal) || (k === 'Mg' && used.Mg) ? null : <group key={k}>{sample(k, home(k).map((v, i) => i === 1 ? v - 0.024 * M : v) as P3, false)}</group>)}
        {/* 坩埚钳和手 */}
        <group position={jaw} rotation-y={-0.5}>
          <Tongs />
          {holding && (metal !== 'Mg' || mgBurn < 1) && sample(metal, [0, 0, 0], true)}
          {busy && <group position={[0.19 * M, 0.03 * M, 0]} rotation={[0, 0, -Math.PI / 2 - 0.15]}><Glove s={0.006 * M} /></group>}
        </group>
        {/* 镁条燃烧：白光、白烟 */}
        <Glow at={over.map((v, i) => i === 0 ? v - 0.03 * M : v) as V3} size={0.5 * M} color="#ffffff" level={mgFlare} flicker={0.25} light={mgFlare > 0 ? 40 : 0} distance={30} />
        <Puffs at={over.map((v, i) => i === 0 ? v - 0.03 * M : v) as V3} on={mgFlare > 0.2} opt={{ rate: 14, life: 2.2, size: [0.03 * M, 0.16 * M], speed: 0.06 * M, dir: [0, 1, 0], spread: 0.6, color: '#f4f4f0', opacity: 0.55, jitter: 0.01 * M }} seed={5} />
      </Place>}
      lesson={<LessonBlock no="2" title="金属和氧气" concept="越活泼的金属，越容易和氧气反应" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>大多数金属都能和氧气反应，但反应的难易和剧烈程度不同：<b className="text-white">镁、铝</b>在常温下就能和氧气反应；<b className="text-white">铜</b>在加热时才能反应；<b className="text-white">金</b>即使在高温时也不和氧气反应——“真金不怕火炼”。</p>
          <p className="mt-3">铝在空气中和氧气反应，表面生成一层致密的<b className="text-white">氧化铝薄膜</b>，阻止里面的铝进一步氧化，所以铝有很好的抗腐蚀性能。</p>
          <p className="mt-3 text-[13.5px] text-white/65">镁条燃烧发出的白光很强，不要长时间直视；做这个实验要用坩埚钳夹持，下面放陶土网。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">镁、铝比铜活泼，铜比金活泼</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">镁点燃就剧烈燃烧，铝常温下就生成氧化膜，铜要加热才变黑，金高温下也不变。{fmtG(MG_RIBBON)} g 镁条燃烧生成 {fmtG(oxideMass('Mg', MG_RIBBON))} g 氧化镁。</p>
      </>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{OXY[metal].name}和氧气</div>
            <div className="mt-1 text-[22px] leading-tight font-bold">{OXY[metal].cond}</div>
            <div className="mt-2 font-formula text-[16px] text-white/80">{OXY[metal].eq ?? '不反应'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="m(Mg)" value={fmtG(MG_RIBBON)} unit="g · 镁条" />
            <ParamTile symbol="m(MgO)" value={used.Mg ? fmtG(oxideMass('Mg', MG_RIBBON)) : '—'} unit="g · 生成的氧化镁" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">四种金属</h2>
          <table className="mt-2 w-full text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium" /><th className="pb-1 text-left font-medium">条件</th><th className="pb-1 text-left font-medium">现象</th></tr></thead>
            <tbody>{METALS.map(k => <tr key={k} className={k === metal ? 'bg-white/10' : 'bg-white/[0.04]'}><td className="rounded-l-lg px-2 py-1.5">{OXY[k].name}</td><td className="py-1.5 pr-2 whitespace-nowrap">{used[k] ? OXY[k].cond : '—'}</td><td className="rounded-r-lg py-1.5 pr-2 text-white/80">{used[k] ? OXY[k].see : '—'}</td></tr>)}</tbody>
          </table>
        </Panel>
      }
      actions={<LabButton primary pulse={next === 'heat'} disabled={busy || !!used[metal]} onClick={() => run.run()}>夹住加热</LabButton>}
      extras={<Control label="金属">
        <Segmented label="金属" pulse={next === 'pick'} want={want} disabled={busy} value={metal} onChange={k => { setMetal(k as OxMetal); run.snap(0) }} options={METALS.map(k => ({ value: k, label: OXY[k].sample }))} />
      </Control>}
    />
  )
}
