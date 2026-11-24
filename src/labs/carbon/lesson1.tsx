// 碳和二氧化碳 · 第 1 课 碳的单质：化验台第 1 格。台上立着金刚石、石墨、C₆₀ 三个球棍模型（原子位置由 physics.ts 按晶体结构算出），
// 前面一块垫在白瓷砖上的玻璃片、一把玻璃刀（刀头是金刚石）、一根石墨棒，右边一个电池盒和小灯泡接成的电路。
// 用金刚石、石墨各在玻璃上划一下；把石墨棒接进电路；数一数 C₆₀ 的原子。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { Glove, Hose, Plinth, Tile } from './gear'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { ALLOTROPES, C60_BOND, DIAMOND_BOND, bonds, c60Atoms, diamondAtoms, graphiteAtoms, type Allotrope, type P3 } from './physics'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l1, Y = TOP, Z = BZ + 0.1
const u = (v: number) => v * M
/** 三个模型的位置（相对 X0，m）、模型中心的高度 */
const MX: Record<Allotrope, number> = { diamond: -0.19, graphite: 0.0, c60: 0.19 }
const MY = 0.16
const PLATE: V3 = [X0 + u(-0.07), Y, Z + u(0.15)]       // 玻璃片
const CIRC: V3 = [X0 + u(0.1), Y, Z + u(0.19)]          // 电路：两只夹子中间放样品
const KEYS: Allotrope[] = ['diamond', 'graphite', 'c60']
const TASKS: Task[] = [
  { id: 'dHard', text: '用金刚石在玻璃上划一下', note: '划出一道痕：金刚石是天然存在最硬的物质，可以裁玻璃' },
  { id: 'gSoft', text: '用石墨在玻璃上划一下', note: '划不动，只留下一道黑印：石墨很软，可以做铅笔芯' },
  { id: 'gElec', text: '把石墨接进电路', note: '小灯泡亮了：石墨能导电，可以做电极' },
  { id: 'c60', text: '数一数 C₆₀ 模型的原子', note: '60 个碳原子构成一个分子，形状像足球' },
]

/** 一个球棍模型：原子是深灰的小球，键是浅灰的细棍。lit 个原子点亮（数原子时用）；spin 慢慢转 */
function BallStick({ atoms, len, scale, r = 0.009, lit = 0, spin = false, glow = false }: { atoms: P3[]; len: number; scale: number; r?: number; lit?: number; spin?: boolean; glow?: boolean }) {
  const bs = useMemo(() => bonds(atoms, len), [atoms, len])
  const geo = useMemo(() => ({ atom: new THREE.SphereGeometry(1, 20, 14), bond: new THREE.CylinderGeometry(1, 1, 1, 8) }), [])
  const ref = useMemo(() => ({ g: null as THREE.Group | null }), [])
  useFrame((_, d) => { if (spin && ref.g) ref.g.rotation.y += Math.min(d, 1 / 30) * 0.35 })
  const setAtoms = (m: THREE.InstancedMesh | null) => {
    if (!m) return
    const o = new THREE.Object3D(), c = new THREE.Color()
    atoms.forEach((p, i) => { o.position.set(p[0] * scale, p[1] * scale, p[2] * scale); o.scale.setScalar(u(r)); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(i < lit ? '#ffcf5c' : '#34383c')) })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  }
  const setBonds = (m: THREE.InstancedMesh | null) => {
    if (!m) return
    const o = new THREE.Object3D(), a = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
    bs.forEach(([i, j], k) => {
      a.set(...atoms[i]).multiplyScalar(scale); b.set(...atoms[j]).multiplyScalar(scale)
      o.position.copy(a).add(b).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize()); o.scale.set(u(r) * 0.3, a.distanceTo(b), u(r) * 0.3); o.updateMatrix(); m.setMatrixAt(k, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }
  return <group ref={g => { ref.g = g }}>
    <instancedMesh key={`a${lit}`} ref={setAtoms} args={[geo.atom, undefined, atoms.length]} castShadow frustumCulled={false}><meshPhysicalMaterial roughness={0.22} clearcoat={0.8} emissive={glow ? '#3a2a08' : '#000000'} /></instancedMesh>
    <instancedMesh ref={setBonds} args={[geo.bond, undefined, bs.length]} castShadow frustumCulled={false}><meshStandardMaterial color="#c9ccc8" roughness={0.35} metalness={0.2} /></instancedMesh>
  </group>
}

/** 玻璃刀：镀铬的刀杆，一头一个球，一头是刀头，刀头底下镶着一小粒金刚石。原点在刀尖，刀杆朝 +y */
function GlassCutter() {
  return <group>
    <mesh position-y={u(0.004)}><octahedronGeometry args={[u(0.0025)]} /><meshPhysicalMaterial color="#ffffff" roughness={0} transmission={0.6} thickness={0.1} ior={2.4} envMapIntensity={3} /></mesh>
    <RoundedBox args={[u(0.014), u(0.016), u(0.008)]} radius={u(0.002)} position-y={u(0.014)}><Metal kind="steel" grain="cast" /></RoundedBox>
    <mesh position-y={u(0.075)}><cylinderGeometry args={[u(0.0045), u(0.004), u(0.11), 16]} /><Metal kind="chrome" rough={0.12} /></mesh>
    <mesh position-y={u(0.1)}><cylinderGeometry args={[u(0.0058), u(0.0058), u(0.05), 16]} /><meshStandardMaterial color="#1c1d1f" roughness={0.7} /></mesh>
    <mesh position-y={u(0.135)}><sphereGeometry args={[u(0.0065), 16, 12]} /><Metal kind="chrome" rough={0.12} /></mesh>
  </group>
}
/** 石墨棒：深灰、带一点金属光泽。原点在下端，朝 +y，长 0.1 m */
function GraphiteRod({ len = 0.1 }: { len?: number }) {
  return <mesh position-y={u(len / 2)} castShadow><cylinderGeometry args={[u(0.0045), u(0.0045), u(len), 16]} /><meshStandardMaterial color="#4d5054" roughness={0.42} metalness={0.55} /></mesh>
}
/** C₆₀ 样品：一只小玻璃瓶里一点黑色粉末。原点在瓶底 */
function Vial() {
  return <group>
    <mesh position-y={u(0.025)} renderOrder={6}><cylinderGeometry args={[u(0.011), u(0.011), u(0.05), 24, 1, true]} /><meshPhysicalMaterial color="#1a2629" transparent opacity={0.25} roughness={0.03} clearcoat={1} envMapIntensity={2.6} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh position-y={u(0.006)}><cylinderGeometry args={[u(0.0102), u(0.0102), u(0.01), 24]} /><meshStandardMaterial color="#141414" roughness={0.95} /></mesh>
    <mesh position-y={u(0.056)}><cylinderGeometry args={[u(0.0118), u(0.0118), u(0.012), 24]} /><meshStandardMaterial color="#2a2d31" roughness={0.6} /></mesh>
  </group>
}
/** 电路：两节干电池的电池盒、灯座上的小灯泡，两根导线，导线头上是鳄鱼夹。原点在两只夹子中间，夹子之间 0.08 m */
function Circuit({ on }: { on: boolean }) {
  const red: V3[] = [[-u(0.045), u(0.008), 0], [-u(0.07), u(0.01), -u(0.03)], [-u(0.05), u(0.01), -u(0.09)], [-u(0.02), u(0.012), -u(0.1)]]
  const blk: V3[] = [[u(0.045), u(0.008), 0], [u(0.07), u(0.01), -u(0.03)], [u(0.08), u(0.01), -u(0.09)], [u(0.1), u(0.03), -u(0.1)]]
  return <group>
    {/* 电池盒 */}
    <group position={[0, 0, -u(0.1)]}>
      <RoundedBox args={[u(0.07), u(0.02), u(0.04)]} radius={u(0.003)} position-y={u(0.01)} castShadow><meshStandardMaterial color="#1d1f22" roughness={0.6} /></RoundedBox>
      {[-1, 1].map(s => <mesh key={s} position={[0, u(0.021), s * u(0.0095)]} rotation-z={Math.PI / 2}><cylinderGeometry args={[u(0.007), u(0.007), u(0.05), 20]} /><meshStandardMaterial color={s > 0 ? '#c23a2a' : '#2a62b8'} roughness={0.4} /></mesh>)}
    </group>
    {/* 灯座和小灯泡 */}
    <group position={[u(0.1), 0, -u(0.1)]}>
      <RoundedBox args={[u(0.04), u(0.012), u(0.03)]} radius={u(0.002)} position-y={u(0.006)} castShadow><meshStandardMaterial color="#e8e4da" roughness={0.5} /></RoundedBox>
      <mesh position-y={u(0.02)}><cylinderGeometry args={[u(0.006), u(0.006), u(0.014), 16]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh position-y={u(0.034)} renderOrder={6}><sphereGeometry args={[u(0.009), 24, 16]} /><meshPhysicalMaterial color={on ? '#fff3c4' : '#e9eef0'} transparent opacity={on ? 0.9 : 0.3} roughness={0.05} emissive={on ? '#ffd36a' : '#000000'} emissiveIntensity={on ? 3 : 0} toneMapped={!on} depthWrite={false} /></mesh>
      {on && <pointLight position-y={u(0.034)} color="#ffd890" intensity={3} distance={u(0.6)} decay={1.6} />}
    </group>
    <Hose pts={red} r={u(0.0018)} color="#c0281e" />
    <Hose pts={blk} r={u(0.0018)} color="#1b1b1b" />
    {[-1, 1].map(s => <group key={s} position={[s * u(0.045), u(0.008), 0]}>
      <RoundedBox args={[u(0.02), u(0.006), u(0.008)]} radius={u(0.0015)} position={[-s * u(0.004), 0, 0]}><meshStandardMaterial color={s < 0 ? '#c0281e' : '#1b1b1b'} roughness={0.5} /></RoundedBox>
      <mesh position={[-s * u(0.016), 0, 0]}><boxGeometry args={[u(0.012), u(0.004), u(0.007)]} /><Metal kind="steel" grain="brushed" /></mesh>
    </group>)}
  </group>
}

export default function Lesson1() {
  const [pick, setPick] = useState<Allotrope>('diamond')
  const [marks, setMarks] = useState<{ diamond?: boolean; graphite?: boolean }>({})
  const [lit, setLit] = useState(false)
  const [counted, setCounted] = useState(false)
  const T = useTasks('gewu:carbon:1', TASKS)
  const scratch = useRun(3.4, () => { setMarks(s => ({ ...s, [pick]: true })); T.check(id => (id === 'dHard' && pick === 'diamond') || (id === 'gSoft' && pick === 'graphite')) })
  const plug = useRun(3.0, () => { setLit(true); T.check(id => id === 'gElec') })
  const count = useRun(4.2, () => { setCounted(true); T.check(id => id === 'c60') })
  const busy = scratch.busy || plug.busy || count.busy
  const resetAll = () => { scratch.snap(0); plug.snap(0); count.snap(0); setPick('diamond'); setMarks({}); setLit(false); setCounted(false); T.reset() }
  const choose = (k: Allotrope) => { if (busy) return; setPick(k) }

  const atoms = useMemo(() => ({ diamond: diamondAtoms(), graphite: graphiteAtoms(), c60: c60Atoms() }), [])
  const nLit = counted ? 60 : count.busy ? Math.min(60, Math.floor(seg(count.t, 0.3, 3.6) * 60)) : 0

  const task = T.current
  const want: Allotrope = task?.id === 'dHard' ? 'diamond' : task?.id === 'c60' ? 'c60' : 'graphite'
  const { hint, next }: { hint: string; next: 'scratch' | 'plug' | 'count' | 'pick' | null } = !task ? { hint: '金刚石、石墨、C₆₀ 都由碳元素组成，碳原子的排列方式不同，物理性质差异很大。', next: null }
    : scratch.busy ? { hint: `拿${ALLOTROPES[pick].name}在玻璃上用力划一下…`, next: null }
    : plug.busy ? { hint: '把石墨棒夹在两只夹子中间…', next: null }
    : count.busy ? { hint: '一个一个数 C₆₀ 模型上的原子…', next: null }
    : pick !== want ? { hint: `选“${ALLOTROPES[want].name}”`, next: 'pick' }
    : task.id === 'dHard' || task.id === 'gSoft' ? { hint: `用${ALLOTROPES[pick].name}在玻璃上划一下`, next: 'scratch' }
    : task.id === 'gElec' ? { hint: '把石墨棒接进电路，看小灯泡', next: 'plug' }
    : { hint: '看 C₆₀ 的模型，数一数有多少个原子', next: 'count' }

  // 划玻璃：手拿着玻璃刀或石墨棒，从台上拿到玻璃片上，划过去，放回
  const toolHome: Record<'diamond' | 'graphite', V3> = { diamond: [X0 + u(-0.22), Y + u(0.006), Z + u(0.14)], graphite: [X0 + u(-0.22), Y + u(0.006), Z + u(0.19)] }
  const st = scratch.t, sk = scratch.busy ? seg(st, 0, 1.0) - seg(st, 2.6, 3.4) : 0
  const stroke = scratch.busy ? ease(seg(st, 1.1, 2.3)) : 0
  const plateTop = Y + u(0.009)
  const toolAt = (k: 'diamond' | 'graphite'): V3 => (scratch.busy && pick === k) ? liftPath(toolHome[k], [PLATE[0] - u(0.03) + u(0.06) * stroke, plateTop, PLATE[2] - u(0.005)], plateTop + u(0.06), Math.max(0, sk)) : toolHome[k]
  const inHand = (k: 'diamond' | 'graphite') => scratch.busy && pick === k
  // 接电路：石墨棒从台上拿到两只夹子中间
  const pk = plug.busy ? ease(seg(plug.t, 0, 1.5)) : lit ? 1 : 0
  const rodAt: V3 = lit || plug.busy ? liftPath(toolHome.graphite, [CIRC[0] - u(0.05), Y + u(0.012), CIRC[2]], Y + u(0.08), pk) : toolAt('graphite')
  const rodLying = lit || plug.busy
  const bulbOn = lit || (plug.busy && plug.t > 1.7)
  // 划痕：金刚石一道细白线，石墨一道宽一点的灰黑印
  const scratchLen = (k: 'diamond' | 'graphite') => marks[k] ? 1 : scratch.busy && pick === k ? stroke : 0

  const sel = (k: Allotrope) => pick === k
  const labels: Label[] = [
    ...KEYS.map(k => ({ id: `m${k}`, at: [X0 + u(MX[k]), Y + u(0.018), Z + u(0.065)] as V3, ax: 0.5, className: `scene-tag ${sel(k) ? 'key' : ''}`, children: <><small>{k === 'c60' && (count.busy || counted) ? '原子数' : '碳单质'}</small>{k === 'c60' && (count.busy || counted) ? nLit : ALLOTROPES[k].name}</> })),
    ...(marks.diamond ? [{ id: 'r1', at: [PLATE[0] + u(0.07), plateTop + u(0.012), PLATE[2] - u(0.01)] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: '金刚石：划出一道痕' }] : []),
    ...(marks.graphite ? [{ id: 'r2', at: [PLATE[0] + u(0.07), plateTop - u(0.01), PLATE[2] + u(0.02)] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: '石墨：只留下黑印' }] : []),
    ...(bulbOn ? [{ id: 'r3', at: [CIRC[0] + u(0.12), Y + u(0.06), CIRC[2] - u(0.1)] as V3, ax: 0, className: 'scene-name -translate-y-1/2', children: '灯泡亮了' }] : []),
    { id: 'n1', at: [PLATE[0], Y - u(0.004), PLATE[2] + u(0.05)], ax: 0.5, name: true, className: 'scene-name', children: '玻璃片' },
    { id: 'n2', at: [CIRC[0], Y - u(0.004), CIRC[2] + u(0.03)], ax: 0.5, name: true, className: 'scene-name', children: '电池和小灯泡' },
  ]
  const a = ALLOTROPES[pick]
  return (
    <LabShell title="碳和二氧化碳" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="试一试"
      stage={<Place at="l1" labels={labels}>
        {/* 三个模型：黑色圆底座、一根立杆、模型在上面慢慢转；选中的那一个转 */}
        {KEYS.map(k => <group key={k} position={[X0 + u(MX[k]), Y, Z]}>
          <Plinth r={0.055} h={0.016} />
          <mesh position-y={u(0.05)}><cylinderGeometry args={[u(0.003), u(0.003), u(0.07), 10]} /><Metal kind="chrome" rough={0.15} /></mesh>
          <group position-y={u(MY)}>
            {k === 'diamond' && <BallStick atoms={atoms.diamond} len={DIAMOND_BOND} scale={u(0.105)} r={0.0068} spin={sel(k)} />}
            {k === 'graphite' && <group rotation-x={0.12}><BallStick atoms={atoms.graphite} len={1} scale={u(0.022)} r={0.0052} spin={sel(k)} /></group>}
            {k === 'c60' && <BallStick atoms={atoms.c60} len={C60_BOND} scale={u(0.0145)} r={0.0052} lit={nLit} spin={sel(k) && !count.busy} glow={nLit > 0} />}
          </group>
        </group>)}
        {/* 玻璃片垫在白瓷砖上；划痕 */}
        <group position={PLATE}>
          <Tile w={0.16} d={0.12} />
          <RoundedBox args={[u(0.12), u(0.003), u(0.08)]} radius={u(0.001)} position-y={u(0.0075)} renderOrder={6}><meshPhysicalMaterial color="#d8eaea" transparent opacity={0.45} roughness={0.04} clearcoat={1} envMapIntensity={2} depthWrite={false} /></RoundedBox>
          {scratchLen('diamond') > 0 && <mesh position={[-u(0.03) + u(0.03) * scratchLen('diamond'), u(0.0093), -u(0.005)]} rotation-x={-Math.PI / 2}><planeGeometry args={[u(0.06) * scratchLen('diamond'), u(0.0012)]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>}
          {scratchLen('graphite') > 0 && <mesh position={[-u(0.03) + u(0.03) * scratchLen('graphite'), u(0.0093), u(0.018)]} rotation-x={-Math.PI / 2}><planeGeometry args={[u(0.06) * scratchLen('graphite'), u(0.004)]} /><meshStandardMaterial color="#3a3c3f" transparent opacity={0.75} roughness={0.5} metalness={0.4} /></mesh>}
        </group>
        {/* 玻璃刀和石墨棒：平放在台上，拿起来时立起来 */}
        <group position={toolAt('diamond')} rotation={inHand('diamond') ? [0, 0, -0.5] : [0, 0.2, Math.PI / 2]}>
          <GlassCutter />
          {inHand('diamond') && <group position={[0, u(0.095), 0]} rotation={[0.3, 0, 0.1]}><Glove /></group>}
        </group>
        <group position={rodAt} rotation={rodLying ? [0, 0, -Math.PI / 2] : inHand('graphite') ? [0, 0, -0.5] : [0, 0.2, Math.PI / 2]}>
          <GraphiteRod />
          {inHand('graphite') && <group position={[0, u(0.07), 0]} rotation={[0.3, 0, 0.1]}><Glove /></group>}
        </group>
        {plug.busy && plug.t < 1.9 && <group position={[rodAt[0] + u(0.05), rodAt[1] + u(0.012), rodAt[2]]} rotation={[0.4, 0, 0.1]}><Glove /></group>}
        <group position={[X0 + u(0.29), Y, Z + u(0.06)]}><Vial /></group>
        <group position={CIRC}><Circuit on={bulbOn} /></group>
      </Place>}
      lesson={<LessonBlock no="1" title="碳的单质" concept="同是碳原子，排法不同，性质大不同" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>金刚石、石墨和 C₆₀ 都是由碳元素组成的单质。它们的物理性质差异很大，原因是碳原子的排列方式不同。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">金刚石</b>：每个碳原子和 4 个碳原子相连，构成空间网状结构。无色透明，是天然存在最硬的物质，用来裁玻璃、做钻头</li>
            <li><b className="text-white">石墨</b>：碳原子排成一层层六边形的平面，层与层之间结合得弱，容易滑动。深灰色，很软，有滑腻感，能导电，用来做铅笔芯、电极、润滑剂</li>
            <li><b className="text-white">C₆₀</b>：由 60 个碳原子构成的分子，形似足球</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">木炭、活性炭、焦炭、炭黑的主要成分也是碳单质。木炭、活性炭疏松多孔，有吸附性。模型里原子和键的大小是为了看清，不按比例。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种碳单质都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">同是碳原子，排法不同，性质大不同</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">金刚石硬，能裁玻璃；石墨软，能导电；C₆₀ 是 60 个碳原子构成的分子。它们都由碳元素组成。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{pick === 'c60' ? 'C₆₀ 分子里的碳原子' : `${a.name}的硬度（莫氏）`}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{pick === 'c60' ? (count.busy || counted ? nLit : '—') : a.hard}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">三种碳单质</h2>
          <table className="mt-2 w-full text-center text-[13px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium"></th><th className="pb-1 font-medium">金刚石</th><th className="pb-1 font-medium">石墨</th><th className="pb-1 font-medium">C₆₀</th></tr></thead>
            <tbody>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left text-white/60">硬度</td><td>{marks.diamond ? '很硬' : '—'}</td><td>{marks.graphite ? '很软' : '—'}</td><td className="rounded-r-lg">—</td></tr>
              <tr><td className="px-2 py-1.5 text-left text-white/60">导电</td><td>不导电</td><td>{lit ? '能导电' : '—'}</td><td>—</td></tr>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left text-white/60">结构</td><td className="text-[12px]">空间网状</td><td className="text-[12px]">层状</td><td className="rounded-r-lg text-[12px]">{counted ? '60 个原子的分子' : '球形分子'}</td></tr>
            </tbody>
          </table>
          <p className="mt-3 text-[13px] leading-relaxed text-white/65">用途：{a.use}</p>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'scratch'} pulse={next === 'scratch'} onClick={() => scratch.run()} disabled={busy || pick === 'c60'}>在玻璃上划一下</LabButton>
        <LabButton primary={next === 'plug'} pulse={next === 'plug'} onClick={() => plug.run()} disabled={busy || pick !== 'graphite' || lit}>接进电路</LabButton>
        <LabButton primary={next === 'count'} pulse={next === 'count'} onClick={() => count.run()} disabled={busy || pick !== 'c60' || counted}>数原子</LabButton>
      </>}
      extras={
        <Control label="碳单质">
          <Segmented label="碳单质" pulse={next === 'pick'} want={want} value={pick} disabled={busy} onChange={k => choose(k as Allotrope)} options={KEYS.map(k => ({ value: k, label: ALLOTROPES[k].name }))} />
        </Control>
      }
    />
  )
}
