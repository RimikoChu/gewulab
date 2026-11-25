// 金属和炼铁 · 第 1 课 金属的物理性质：化验台第 1 格，从左到右四件小事。
// 一、铜丝接进电池和小灯泡的电路，灯亮（导电）；二、铁架台上横夹一根铜棒，下面粘一排蜡粒，酒精灯加热铜棒一端，蜡粒从近到远一颗颗掉下（导热）；
// 三、小锤敲铝块，铝块被敲扁不碎（延展）；四、黄铜片和铜片互相刻画，铜片上留下划痕（合金更硬）。每做一件，镜头移到下一件。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { Metal, lathe, useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, Clamp, Glove, IronStand, LAMP_TOP, Pipe, m } from './gear'
import { Flame, Glow } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, seg, useRun, type P3 } from './parts'
import { CONDUCT, HARD, harder } from './physics'
import { BZ, M, ST, TOP, Place, spot, type V3 } from './world'

const X0 = ST.l1, Y = TOP, Z = BZ + 0.15
const at = (x: number, y = 0, z = 0): V3 => [X0 + x * M, Y + y * M, Z + z * M]
/** 四件事各在台上的什么位置（m，相对 X0） */
const C = { conduct: -0.5, heat: -0.15, ductile: 0.16, scratch: 0.38 }
type Key = keyof typeof C
const ORDER: Key[] = ['conduct', 'heat', 'ductile', 'scratch']
const VIEW: Record<Key | 'all', ReturnType<typeof spot>> = {
  all: spot(X0 - 0.06 * M, Y + 0.5, Z, 4.4, 1.5, [-0.05, 0.2], true),
  conduct: spot(X0 + (C.conduct + 0.005) * M, Y + 0.2, Z - 0.05, 1.35, 0.72, [-0.2, 0.22], true),
  heat: spot(X0 + (C.heat - 0.02) * M, Y + 0.6, Z, 1.75, 1.05, [0.1, 0.14], true),
  ductile: spot(X0 + (C.ductile + 0.02) * M, Y + 0.3, Z, 0.95, 0.6, [-0.32, 0.22], true),
  scratch: spot(X0 + (C.scratch + 0.02) * M, Y + 0.2, Z, 0.85, 0.55, [0.2, 0.36], true),
}
const DUR: Record<Key, number> = { conduct: 2.4, heat: 9, ductile: 4.2, scratch: 4.4 }
const BTN: Record<Key, string> = { conduct: '接通电路', heat: '点燃酒精灯', ductile: '敲铝块', scratch: '互相刻画' }
const TASKS: Task[] = [
  { id: 'conduct', text: '把铜丝接进电路', note: '灯泡亮了：铜能导电' },
  { id: 'heat', text: '加热铜棒的一端', note: '蜡粒从靠近火焰的一头起依次掉下：铜能导热' },
  { id: 'ductile', text: '用小锤敲铝块', note: '铝块被敲扁、变薄，却没有碎：铝有延展性' },
  { id: 'scratch', text: '黄铜片和铜片互相刻画', note: '铜片上留下划痕，黄铜片上没有：合金比纯金属硬' },
]

// ---------- 器材 ----------
/** 一节 1 号干电池：深色外皮、一道铜金色的色环、正极的银色凸头和负极的银色底盖。原点在中心，沿 y */
function Cell() {
  const g = useMemo(() => lathe(m([[0, -0.0305], [0.0155, -0.0305], [0.0165, -0.0295], [0.0165, 0.0295], [0.0155, 0.0305], [0.0065, 0.0305], [0.0065, 0.0325], [0.0055, 0.033], [0, 0.033]]), { segs: 40 }), [])
  return <group>
    <mesh geometry={g} castShadow><meshPhysicalMaterial color="#232528" roughness={0.38} clearcoat={0.7} clearcoatRoughness={0.25} /></mesh>
    <mesh position-y={0.014 * M}><cylinderGeometry args={[0.01665 * M, 0.01665 * M, 0.012 * M, 40, 1, true]} /><meshPhysicalMaterial color="#b98a34" metalness={0.6} roughness={0.32} clearcoat={0.7} /></mesh>
    <mesh position-y={0.0318 * M}><cylinderGeometry args={[0.0066 * M, 0.0066 * M, 0.0026 * M, 24]} /><Metal kind="chrome" rough={0.15} /></mesh>
    <mesh position-y={-0.0306 * M} rotation-x={Math.PI}><circleGeometry args={[0.0152 * M, 32]} /><Metal kind="stainless" grain="turned" /></mesh>
  </group>
}
/** 电池盒：黑色塑料的槽，两节干电池卧在里面串联，两头是接触片（正极一头铜片、负极一头弹簧），侧面伸出两个接线柱。原点在底面正中，沿 x 长 */
function BatteryBox() {
  const wall = <meshStandardMaterial color="#17181a" roughness={0.55} />
  return <group>
    <RoundedBox args={[0.142 * M, 0.004 * M, 0.04 * M]} radius={0.0015 * M} position-y={0.002 * M} castShadow receiveShadow>{wall}</RoundedBox>
    {[-1, 1].map(s => <RoundedBox key={`e${s}`} args={[0.004 * M, 0.026 * M, 0.04 * M]} radius={0.0015 * M} position={[s * 0.069 * M, 0.013 * M, 0]} castShadow>{wall}</RoundedBox>)}
    {[-1, 1].map(s => <RoundedBox key={`s${s}`} args={[0.142 * M, 0.012 * M, 0.003 * M]} radius={0.001 * M} position={[0, 0.008 * M, s * 0.0185 * M]} castShadow>{wall}</RoundedBox>)}
    {[-1, 1].map(s => <group key={s} position={[s * 0.0335 * M, 0.0195 * M, 0]} rotation-z={s * Math.PI / 2}><Cell /></group>)}
    {/* 两头的接触片和弹簧 */}
    <mesh position={[0.0665 * M, 0.0195 * M, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.007 * M, 0.007 * M, 0.001 * M, 20]} /><Metal kind="brass" /></mesh>
    <mesh position={[-0.0655 * M, 0.0195 * M, 0]} rotation-z={Math.PI / 2}><torusGeometry args={[0.005 * M, 0.0007 * M, 6, 20]} /><Metal kind="steel" /></mesh>
    {/* 接线柱：带滚花的铜螺母 */}
    {[-1, 1].map(s => <group key={s} position={[s * 0.074 * M, 0.014 * M, 0.012 * M]}>
      <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0028 * M, 0.0028 * M, 0.01 * M, 12]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh position-x={s * 0.006 * M} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0045 * M, 0.0045 * M, 0.004 * M, 16]} /><meshStandardMaterial color={s > 0 ? '#b8322a' : '#1d1f22'} roughness={0.5} /></mesh>
    </group>)}
  </group>
}
/** 小灯泡和灯座：塑料底座、螺口、玻璃泡和灯丝。on 时灯丝发光。原点在底面正中 */
function Bulb({ on }: { on: number }) {
  const g = useMemo(() => ({
    base: lathe(m([[0, 0], [0.022, 0], [0.023, 0.003], [0.023, 0.01], [0.012, 0.014], [0.009, 0.026], [0, 0.026]]), { segs: 36 }),
    glass: lathe(m([[0.0055, 0.028], [0.007, 0.034], [0.011, 0.044], [0.011, 0.05], [0.007, 0.057], [0, 0.059]]), { segs: 28 }),
  }), [])
  return <group>
    <mesh geometry={g.base} castShadow receiveShadow><meshStandardMaterial color="#e9e6dc" roughness={0.45} /></mesh>
    <mesh position-y={0.027 * M}><cylinderGeometry args={[0.006 * M, 0.006 * M, 0.006 * M, 20]} /><Metal kind="aluminum" grain="turned" /></mesh>
    <mesh geometry={g.glass} renderOrder={7}><meshPhysicalMaterial color="#f4efe2" transparent opacity={0.28 + on * 0.2} roughness={0.05} clearcoat={1} envMapIntensity={2} depthWrite={false} emissive="#ffd98a" emissiveIntensity={on * 0.8} side={THREE.DoubleSide} /></mesh>
    <mesh position-y={0.045 * M} rotation-z={Math.PI / 2}><torusGeometry args={[0.002 * M, 0.0003 * M, 6, 16]} /><meshBasicMaterial color={new THREE.Color('#ffcf7a').multiplyScalar(0.4 + on * 5)} toneMapped={false} /></mesh>
    <Glow at={[0, 0.046 * M, 0]} size={0.12 * M} color="#ffd88a" level={on} flicker={0.02} light={on > 0 ? 6 : 0} distance={3} />
  </group>
}
/** 鳄鱼夹：两片锯齿口的钢片，外面套着红或黑的绝缘套。原点在夹口，沿 +x 伸出 */
function Clip({ color }: { color: string }) {
  return <group>
    {[-1, 1].map(s => <mesh key={s} position={[0.012 * M, s * 0.0018 * M, 0]} rotation-z={s * 0.08}><boxGeometry args={[0.024 * M, 0.0012 * M, 0.006 * M]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    <mesh position={[0.03 * M, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0045 * M, 0.006 * M, 0.024 * M, 14]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
  </group>
}
/** 小锤：木柄、钢锤头。原点在锤头敲击面中心，柄沿 +x */
function Hammer() {
  return <group>
    <RoundedBox args={[0.016 * M, 0.04 * M, 0.016 * M]} radius={0.002 * M} position-y={0.02 * M} castShadow><Metal kind="steel" grain="brushed" /></RoundedBox>
    <mesh position={[0.07 * M, 0.024 * M, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.0042 * M, 0.005 * M, 0.12 * M, 14]} /><meshStandardMaterial color="#a57a4a" roughness={0.6} /></mesh>
  </group>
}

export default function Lesson1() {
  const T = useTasks('gewu:metal:1', TASKS)
  const task = T.current?.id as Key | undefined
  const run = useRun(task ? DUR[task] : 1, () => { if (task) T.check(id => id === task) })
  const doneK = (k: Key) => !!T.done[k]
  const resetAll = () => { run.snap(0); T.reset() }
  /** 每件事的进度：做完是 1，正在做是 0–1，没做是 0 */
  const p = (k: Key) => doneK(k) ? 1 : run.busy && task === k ? run.t / DUR[k] : 0
  const pc = p('conduct'), ph = p('heat'), pd = p('ductile'), ps = p('scratch')
  const view = !task || T.finale ? VIEW.all : VIEW[task]

  // 导电：右边的夹子从一旁移过来，夹上铜丝的一端；夹上以后灯亮
  const clipK = ease(seg(pc * DUR.conduct, 0.2, 1.4))
  const lit = doneK('conduct') ? 1 : ease(seg(pc * DUR.conduct, 1.45, 1.75))
  // 导热：点着的火；蜡粒从右（火焰那头）往左一颗颗掉
  const flame = run.busy && task === 'heat' ? ease(seg(run.t, 0.3, 1.0)) * (1 - ease(seg(run.t, DUR.heat - 0.6, DUR.heat))) : 0
  const BEADS = [0.07, 0.035, 0, -0.035, -0.07]
  const dropAt = (i: number) => 2.0 + i * 1.3
  // 蜡粒落下：画面上放慢的示意
  const beadY = (i: number) => { const t = ph * DUR.heat - dropAt(i); return t <= 0 ? 0 : Math.min(0.122, 0.4 * t * t) }
  // 延展：三锤，每锤铝块扁一点
  const hits = Math.min(3, Math.floor(pd * DUR.ductile / 1.3 + 0.15))
  const hitPhase = (pd * DUR.ductile) % 1.3
  const flat = doneK('ductile') ? 3 : hits
  const hammerLift = run.busy && task === 'ductile' ? (hitPhase < 0.9 ? ease(hitPhase / 0.9) : 1 - ease((hitPhase - 0.9) / 0.25)) : 1
  // 刻画：手拿黄铜片的角，在铜片上划两道；划过的地方出现划痕
  const sk = ps * DUR.scratch
  const strokeK = (n: number) => seg(sk, 0.8 + n * 1.5, 1.9 + n * 1.5)
  const sx = lerp(-0.022, 0.022, ((strokeK(0) < 1 ? strokeK(0) : strokeK(1)))), sz = strokeK(0) < 1 ? -0.006 : 0.004
  const hard = harder('brass', 'copper')

  const step = !task ? null : run.busy ? 'busy' : 'go'
  const hint = !task ? '四件事都做完了。' : run.busy
    ? ({ conduct: '夹上铜丝，看灯泡…', heat: '酒精灯加热铜棒的右端，看蜡粒…', ductile: '用小锤敲铝块…', scratch: '拿黄铜片的一角在铜片上用力划…' } as Record<Key, string>)[task]
    : ({ conduct: '先看导电：把铜丝接进电路', heat: '再看导热：点燃酒精灯，加热铜棒的一端', ductile: '再看延展性：用小锤敲一敲铝块', scratch: '最后比硬度：黄铜片和铜片互相刻画' } as Record<Key, string>)[task]

  const labels: Label[] = [
    { id: 'n1', at: at(C.conduct - 0.03, 0.05, -0.05), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电池和小灯泡' },
    { id: 'n2', at: at(C.heat, 0.2, -0.03), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '铜棒和蜡粒' },
    { id: 'n3', at: at(C.ductile, 0.06, 0.03), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '铝块' },
    { id: 'n4', at: at(C.scratch, 0.04, 0.04), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '黄铜片和铜片' },
    ...(lit > 0.5 ? [{ id: 'k1', at: at(C.conduct + 0.07, 0.07, -0.05), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>灯泡</small>亮了</> }] : []),
    ...(doneK('heat') || (task === 'heat' && run.t > dropAt(0)) ? [{ id: 'k2', at: at(C.heat + 0.15, 0.12, 0), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>蜡粒</small>近处先掉</> }] : []),
    ...(flat === 3 ? [{ id: 'k3', at: at(C.ductile + 0.04, 0.03, 0), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>铝块</small>被敲扁了</> }] : []),
    ...(doneK('scratch') ? [{ id: 'k4', at: at(C.scratch + 0.045, 0.01, 0.0), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>划痕</small>在{hard === 'brass' ? '铜片' : '黄铜片'}上</> }] : []),
  ]

  const rodY = 0.135
  const sq = 1 - 0.18 * flat, wide = 1 + 0.13 * flat
  return (
    <LabShell title="金属和炼铁" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="动手试一试"
      stage={<Place at={view} labels={labels}>
        {/* 一、导电 */}
        <group position={at(C.conduct - 0.05, 0, -0.045)}><BatteryBox /></group>
        <group position={at(C.conduct + 0.07, 0, -0.05)}><Bulb on={lit} /></group>
        <mesh position={at(C.conduct - 0.01, 0.0025, 0.045)} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.0011 * M, 0.0011 * M, 0.09 * M, 12]} /><Metal kind="copper" /></mesh>
        <group position={at(C.conduct - 0.065, 0.0025, 0.045)} rotation-y={Math.PI}><Clip color="#b8322a" /></group>
        <group position={clipK < 1 ? at(lerp(C.conduct + 0.09, C.conduct + 0.045, clipK), lerp(0.02, 0.0025, clipK), lerp(0.08, 0.045, clipK)) : at(C.conduct + 0.045, 0.0025, 0.045)}><Clip color="#1e1f22" /></group>
        <Pipe glass={false} color="#b8322a" r={0.0013 * M} pts={[at(C.conduct - 0.13, 0.014, -0.033), at(C.conduct - 0.14, 0.008, 0.0), at(C.conduct - 0.11, 0.003, 0.045), at(C.conduct - 0.095, 0.003, 0.045)]} />
        <Pipe glass={false} color="#1e1f22" r={0.0013 * M} pts={[at(C.conduct + 0.03, 0.014, -0.033), at(C.conduct + 0.045, 0.004, -0.02), at(C.conduct + 0.07, 0.004, -0.02), at(C.conduct + 0.088, 0.006, -0.04)]} />
        <Pipe glass={false} color="#1e1f22" r={0.0013 * M} pts={[at(C.conduct + 0.052, 0.004, -0.06), at(C.conduct + 0.1, 0.004, -0.02), at(C.conduct + 0.12, 0.004, 0.04), clipK < 1 ? at(lerp(C.conduct + 0.12, C.conduct + 0.075, clipK), lerp(0.02, 0.003, clipK), lerp(0.08, 0.045, clipK)) : at(C.conduct + 0.075, 0.003, 0.045)]} />
        {/* 二、导热：铁架台、铜棒、蜡粒、酒精灯 */}
        <group position={at(C.heat - 0.17, 0, 0.06)}><IronStand rodH={0.3}><group position-y={rodY * M}><Clamp len={0.03} open={0.004} yaw={Math.PI / 2} /></group></IronStand></group>
        <mesh position={at(C.heat - 0.01, rodY, 0)} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.003 * M, 0.003 * M, 0.27 * M, 20]} /><Metal kind="copper" grain="brushed" /></mesh>
        {BEADS.map((x, i) => { const dy = beadY(i), gone = dy > 0.12; return <mesh key={i} position={at(C.heat + x, rodY - 0.0045 - dy, 0)} scale={[1, gone ? 0.55 : 0.85, 1]} castShadow><sphereGeometry args={[0.0032 * M, 14, 10]} /><meshPhysicalMaterial color="#f1e6c4" roughness={0.42} clearcoat={0.3} transmission={0.1} /></mesh> })}
        <group position={at(C.heat + 0.12, 0, 0)}><AlcoholLamp cap={!run.busy || task !== 'heat'} /></group>
        <Flame at={at(C.heat + 0.12, LAMP_TOP, 0)} w={0.03 * M} h={0.06 * M} kind="alcohol" level={flame} seed={1} />
        {/* 三、延展：铁砧上的铝块，手握小锤 */}
        <RoundedBox args={[0.07 * M, 0.03 * M, 0.05 * M]} radius={0.003 * M} position={at(C.ductile, 0.015, 0)} castShadow receiveShadow><Metal kind="steel" grain="cast" /></RoundedBox>
        <RoundedBox args={[0.024 * M * wide, 0.018 * M * sq, 0.02 * M * wide]} radius={0.0015 * M} position={at(C.ductile, 0.03 + 0.009 * sq, 0)} castShadow><Metal kind="aluminum" grain="cast" rough={0.35} /></RoundedBox>
        {run.busy && task === 'ductile' ? <group position={at(C.ductile + 0.005, 0.03 + 0.018 * sq + 0.004 + hammerLift * 0.05, 0)} rotation-z={hammerLift * 0.35}>
          <Hammer />
          <group position={[0.11 * M, 0.024 * M, 0]} rotation={[0, 0, -Math.PI / 2]}><Glove s={0.006 * M} /></group>
        </group> : <group position={at(C.ductile + 0.02, 0.008, 0.06)} rotation={[Math.PI / 2, 0, -0.3]}><Hammer /></group>}
        {/* 四、刻画：铜片平放，手拿黄铜片的一角在上面划 */}
        <mesh position={at(C.scratch, 0.001, 0)} castShadow receiveShadow><boxGeometry args={[0.07 * M, 0.002 * M, 0.045 * M]} /><Metal kind="copper" grain="brushed" /></mesh>
        {[0, 1].map(n => { const k = strokeK(n); return k > 0 && <mesh key={n} position={at(C.scratch - 0.022 + 0.022 * k, 0.0021, n ? 0.004 : -0.006)} rotation-x={-Math.PI / 2}><planeGeometry args={[0.044 * k * M, 0.0012 * M]} /><meshStandardMaterial color="#f2b08c" metalness={0.8} roughness={0.15} /></mesh> })}
        {(() => { const holding = run.busy && task === 'scratch', pos: P3 = holding ? at(C.scratch + sx, 0.014, sz) : at(C.scratch + 0.09, 0.001, 0.0); return <group position={pos} rotation={holding ? [0, 0.3, -1.0] : [0, 0.25, 0]}>
          <mesh position={holding ? [0, 0.02 * M, 0] : [0, 0, 0]} castShadow><boxGeometry args={[0.03 * M, 0.002 * M, 0.04 * M]} /><Metal kind="brass" grain="brushed" /></mesh>
          {holding && <group position={[0, 0.045 * M, 0]} rotation={[0, 0, 0.2]}><Glove s={0.0055 * M} /></group>}
        </group> })()}
      </Place>}
      lesson={<LessonBlock no="1" title="金属的物理性质" concept="金属能导电导热、能延展；合金更硬" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>金属大多有银白色的金属<b className="text-white">光泽</b>（铜呈紫红色，金呈黄色），常温下多为固体（汞是液体），有良好的<b className="text-white">导电性、导热性和延展性</b>。</p>
          <p className="mt-3">在金属中加热熔合某些金属或非金属，制得的具有金属特征的物质叫<b className="text-white">合金</b>。黄铜是铜和锌的合金。合金的硬度一般比组成它的纯金属大，抗腐蚀性能也更好。</p>
          <p className="mt-3 text-[13.5px] text-white/65">物质的用途主要由性质决定，还要考虑价格、资源、是否美观、使用是否便利、是否容易回收和对环境的影响。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">金属能导电、导热，有延展性；合金比纯金属硬</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">铜丝让灯泡亮了，铜棒把热传到了另一头，铝块敲扁了也不碎；黄铜片在铜片上划出了痕。</p>
      </>}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">导电性（以银为 100）</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {CONDUCT.map(([n, v]) => <div key={n} className="flex items-center gap-2 text-[13.5px]">
              <span className={`w-6 ${n === '铜' && lit > 0.5 ? 'font-semibold text-[#7fe3d4]' : 'text-white/80'}`}>{n}</span>
              <div className="h-2 flex-1 rounded-full bg-white/8"><div className={`h-2 rounded-full ${n === '铜' && lit > 0.5 ? 'bg-[#35c7b3]' : 'bg-white/45'}`} style={{ width: `${v}%` }} /></div>
              <span className="w-8 text-right tabular-nums text-white/75">{v}</span>
            </div>)}
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">硬度（以金刚石为 10）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {HARD.map(([n, v]) => <div key={n} className="rounded-xl bg-white/8 px-2 py-2 text-center"><div className="text-[13px] text-white/60">{n}</div><div className="text-[17px] font-bold tabular-nums">{v}</div></div>)}
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">做过的</h2>
          <ul className="mt-2 flex flex-col gap-1 text-[13.5px]">
            {ORDER.map(k => <li key={k} className="flex justify-between rounded-lg bg-white/[0.04] px-2.5 py-1.5"><span className="text-white/75">{({ conduct: '导电性', heat: '导热性', ductile: '延展性', scratch: '合金的硬度' } as Record<Key, string>)[k]}</span><span className={doneK(k) ? 'font-semibold text-[#7fe3d4]' : 'text-white/40'}>{doneK(k) ? ({ conduct: '灯亮', heat: '蜡粒依次掉', ductile: '敲扁不碎', scratch: '黄铜更硬' } as Record<Key, string>)[k] : '—'}</span></li>)}
          </ul>
        </Panel>
      }
      actions={<LabButton primary pulse={step === 'go'} disabled={step !== 'go'} onClick={() => run.run()}>{task ? BTN[task] : '都做完了'}</LabButton>}
      extras={null}
    />
  )
}
