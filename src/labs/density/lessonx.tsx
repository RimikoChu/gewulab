// 质量与密度 · 拓展课：三个小专题。水结成冰体积变大；冬天的湖为什么不会冻到底（水在 4 ℃ 时密度最大）；热空气为什么上升。
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, disc, lathe, shell, useSlide, useTasks, type Label } from '@/lab-kit'
import { BEAKER_H, Beaker, beakerY } from './glass'
import { LESSONS, goLesson } from './lessons'
import { Room, type V3 } from './parts'
import { FREEZE, LAKE, RHO, density, volumeOf } from './physics'
import { ST, TOP } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Sub = 'freeze' | 'lake' | 'air'
const VW = volumeOf('water', FREEZE.m), VI = volumeOf('ice', FREEZE.m)
const SUBS: Record<Sub, { name: string; title: string; button: string; say: string }> = {
  freeze: { name: '水结成冰', title: '质量不变，体积变大，密度变小', button: '让水结冰', say: `${FREEZE.m} g 水的体积是 ${VW} cm³，结成冰以后质量还是 ${FREEZE.m} g，体积却变成 ${VI} cm³：冰的密度是 ${RHO.ice.rho} g/cm³，比水小。所以冰浮在水面上；冬天水管里的水结冰，会把水管胀裂。` },
  lake: { name: '冬天的湖', title: '水在 4 ℃ 时密度最大，沉在湖底', button: '入冬降温', say: '一般的物质热胀冷缩，水却有些反常：4 ℃ 时密度最大，温度再低反而膨胀。入冬以后，4 ℃ 的水最重，沉到湖底；更冷的水留在上面，最上面结成冰。冰层挡住了冷空气，湖底的水保持在 4 ℃ 左右，鱼可以在那里过冬。' },
  air: { name: '热空气上升', title: '气体受热膨胀，密度变小而上升', button: '点燃酒精灯', say: '气体的密度受温度的影响很明显。酒精灯上方的空气受热膨胀，密度变小，就往上升；周围较冷的空气流过来补充，形成气流，把纸风车吹转了。风的形成、暖气片装在低处，都是这个道理。' },
}
const ORDER: Sub[] = ['freeze', 'lake', 'air']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))
const X = ST.sx, Z = 0.35

// ---------- 水结成冰：烧杯坐在一盆碎冰里，旁边一只装满水的玻璃瓶 ----------
const BASIN = shell([[0, 0], [0.4, 0], [0.45, 0.02], [0.49, 0.075], [0.51, 0.082]], 0.012, { segs: 56 })
const BOTTLE = shell([[0, 0], [0.085, 0], [0.095, 0.012], [0.095, 0.24], [0.08, 0.3], [0.04, 0.34], [0.036, 0.4]], 0.006, { segs: 36 })
const CUBES = Array.from({ length: 46 }, (_, i) => { const a = i * 2.399, r = 0.26 + (i * 37 % 100) / 100 * 0.17; return { p: [Math.cos(a) * r, 0.03 + (i % 2) * 0.03, Math.sin(a) * r] as V3, r: [i * 0.7, i * 1.3, i * 0.4] as V3, s: 0.04 + (i * 13 % 10) / 10 * 0.025 } })
/** on 从 0 到 1：瓶里的水结成冰，瓶身裂开几道纹 */
function Chill({ on }: { on: number }) {
  const crack = Math.max(0, (on - 0.6) / 0.4)
  return <group>
    <mesh geometry={BASIN} castShadow receiveShadow><meshPhysicalMaterial color="#e9ecec" roughness={0.25} clearcoat={0.7} side={THREE.DoubleSide} /></mesh>
    {CUBES.map((c, i) => <RoundedBox key={i} args={[c.s, c.s, c.s]} radius={c.s * 0.2} smoothness={2} position={c.p} rotation={c.r}><meshPhysicalMaterial color="#dff0f7" transparent opacity={0.7} roughness={0.15} clearcoat={1} /></RoundedBox>)}
    <group position={[0.86, 0, 0.05]}>
      <mesh position={[0, 0.16, 0]} renderOrder={2}><cylinderGeometry args={[0.086, 0.082, 0.3, 28]} /><meshBasicMaterial color={new THREE.Color('#5f9fd0').lerp(new THREE.Color('#dcecf3'), on)} transparent opacity={0.4 + 0.4 * on} depthWrite={false} /></mesh>
      <mesh geometry={BOTTLE} renderOrder={3} castShadow><meshPhysicalMaterial color="#2c4149" transparent opacity={0.14} roughness={0.05} clearcoat={0.6} clearcoatRoughness={0.1} envMapIntensity={0.5} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.41, 0]}><cylinderGeometry args={[0.043, 0.043, 0.04, 20]} /><Metal kind="aluminum" grain="turned" /></mesh>
      {/* 裂纹：贴着瓶身的几道折线，结冰到后半段才慢慢显出来 */}
      {crack > 0 && [[0.3, 0.2, 0.5], [0.55, 0.13, -0.6], [0.05, 0.24, -0.3], [0.8, 0.09, 0.9], [0.42, 0.05, 0.2]].map(([a, y, tilt], i) => <mesh key={i} position={[Math.cos(a * 2) * 0.0965, y + 0.03, Math.sin(a * 2) * 0.0965]} rotation={[0, -a * 2 + Math.PI / 2, tilt]} renderOrder={4}><planeGeometry args={[0.004, 0.11]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.85 * crack} side={THREE.DoubleSide} /></mesh>)}
    </group>
  </group>
}

// ---------- 结冰的湖：一只长玻璃缸当湖的剖面 ----------
const LW = 2.2, LH = 0.86, LD = 0.5, MUD = 0.07
/** 湖的剖面：on 从 0 到 1，水面结出一层冰 */
function Lake({ on }: { on: number }) {
  const fish = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { const f = fish.current; if (!f) return; const t = clock.elapsedTime * 0.35, x = Math.sin(t) * 0.62; f.position.set(x, 0.045 + MUD + 0.09 + Math.sin(t * 2.3) * 0.02, 0); f.rotation.y = Math.cos(t) > 0 ? 0 : Math.PI })
  const ice = 0.11 * on
  return <group position={[X, TOP, Z]}>
    <RoundedBox args={[LW + 0.12, 0.045, LD + 0.12]} radius={0.012} smoothness={2} position={[0, 0.0225, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#20262b" roughness={0.4} clearcoat={0.5} /></RoundedBox>
    <mesh position={[0, 0.045 + MUD / 2, 0]}><boxGeometry args={[LW - 0.03, MUD, LD - 0.03]} /><meshStandardMaterial color="#6a5a44" roughness={1} /></mesh>
    <group ref={fish}>
      <mesh scale={[1, 0.5, 0.32]} castShadow><sphereGeometry args={[0.085, 20, 14]} /><meshPhysicalMaterial color="#e5793a" roughness={0.4} clearcoat={0.6} /></mesh>
      <mesh position={[-0.1, 0, 0]} rotation-z={-Math.PI / 2} scale={[1, 1, 0.25]}><coneGeometry args={[0.04, 0.07, 10]} /><meshPhysicalMaterial color="#d9622c" roughness={0.4} /></mesh>
      <mesh position={[0.05, 0.012, 0.022]}><sphereGeometry args={[0.008, 8, 6]} /><meshBasicMaterial color="#14181c" /></mesh>
    </group>
    <mesh position={[0, 0.045 + MUD + (LH - MUD - 0.1 - ice) / 2, 0]} renderOrder={2}><boxGeometry args={[LW - 0.03, LH - MUD - 0.1 - ice, LD - 0.03]} /><meshPhysicalMaterial color="#5f9fd0" transparent opacity={0.36} roughness={0.1} depthWrite={false} /></mesh>
    {ice > 0.004 && <mesh position={[0, 0.045 + LH - 0.1 - ice / 2, 0]}><boxGeometry args={[LW - 0.03, ice, LD - 0.03]} /><meshPhysicalMaterial color="#eef6fa" transparent opacity={0.9} roughness={0.3} clearcoat={0.8} /></mesh>}
    <mesh position={[0, 0.045 + LH / 2, 0]} renderOrder={3}><boxGeometry args={[LW, LH, LD]} /><meshPhysicalMaterial color="#2c4149" transparent opacity={0.1} roughness={0.03} clearcoat={1} envMapIntensity={2.2} depthWrite={false} /></mesh>
    {/* 玻璃缸的四条竖棱和上口的一圈边 */}
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * LW / 2, 0.045 + LH / 2, sz * LD / 2]}><boxGeometry args={[0.018, LH, 0.018]} /><Metal kind="aluminum" grain="brushed" env={1.4} /></mesh>))}
    {[-1, 1].map(sz => <mesh key={sz} position={[0, 0.045 + LH, sz * LD / 2]}><boxGeometry args={[LW + 0.018, 0.018, 0.018]} /><Metal kind="aluminum" grain="brushed" env={1.4} /></mesh>)}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * LW / 2, 0.045 + LH, 0]}><boxGeometry args={[0.018, 0.018, LD]} /><Metal kind="aluminum" grain="brushed" env={1.4} /></mesh>)}
  </group>
}
/** 第 i 层水（0 是紧贴冰层的，最后一层在湖底）在缸里多高 */
const layerY = (i: number) => 0.045 + LH - 0.26 - i * (LH - 0.42) / (LAKE.length - 1)

// ---------- 酒精灯和纸风车 ----------
const G = {
  body: shell([[0, 0], [0.12, 0], [0.17, 0.03], [0.19, 0.09], [0.17, 0.15], [0.09, 0.19], [0.062, 0.2], [0.062, 0.235]], 0.008, { segs: 40, crease: 50 }),
  fuel: lathe([[0, 0.009], [0.115, 0.009], [0.16, 0.035], [0.178, 0.085], [0.17, 0.11], [0, 0.11]], { segs: 32, crease: 50 }),
  collar: lathe([[0, 0.23], [0.078, 0.23], [0.082, 0.236], [0.082, 0.252], [0.04, 0.262], [0.036, 0.3], [0, 0.3]], { segs: 24 }),
  cap: shell([[0, 0.13], [0.06, 0.13], [0.076, 0.115], [0.078, 0], [0.086, -0.004]], 0.007, { segs: 28 }),
  foot: disc(0.2, 0.03, { chamfer: 0.008 }),
  flame: lathe([[0, 0], [0.028, 0.012], [0.042, 0.05], [0.036, 0.1], [0.018, 0.16], [0.006, 0.2], [0, 0.215]], { segs: 20, crease: 80 }),
}
const BLADES = 6
/** 酒精灯上方架着一只纸风车。lit 从 0 到 1：火苗烧起来，热空气往上走，风车越转越快 */
function Lamp({ lit }: { lit: number }) {
  const X = ST.sx - 0.1 + 0.15
  const wheel = useRef<THREE.Group>(null), puffs = useRef<THREE.Group>(null), flame = useRef<THREE.Group>(null)
  useFrame(({ clock }, d) => {
    if (wheel.current) wheel.current.rotation.y += Math.min(d, 1 / 30) * 5.5 * lit
    const t = clock.elapsedTime
    if (flame.current) flame.current.scale.set(1 + Math.sin(t * 13) * 0.06, lit * (1 + Math.sin(t * 9) * 0.08), 1)
    puffs.current?.children.forEach((m, i) => { const k = (t * 0.45 + i / 6) % 1; m.position.set(Math.sin(i * 2.4 + k * 3) * 0.05, 0.52 + k * 0.66, Math.cos(i * 1.7 + k * 2) * 0.04); (m as THREE.Mesh).scale.setScalar(0.5 + k); ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = lit * 0.22 * Math.sin(k * Math.PI) })
  })
  return <group position={[X - 0.15, TOP, Z]}>
    <mesh geometry={G.fuel} renderOrder={2}><meshPhysicalMaterial color="#7fb2de" transparent opacity={0.55} roughness={0.1} depthWrite={false} /></mesh>
    <mesh geometry={G.body} renderOrder={3} castShadow><meshPhysicalMaterial color="#2c4149" transparent opacity={0.16} roughness={0.03} clearcoat={1} envMapIntensity={2.4} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={G.collar} castShadow><meshPhysicalMaterial color="#d9d6cb" roughness={0.35} clearcoat={0.6} /></mesh>
    <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.02, 0.026, 0.27, 10]} /><meshStandardMaterial color="#d8cfb6" roughness={1} /></mesh>
    <mesh geometry={G.cap} position={[0.42, 0.004, 0.2]} renderOrder={3}><meshPhysicalMaterial color="#2c4149" transparent opacity={0.16} roughness={0.03} clearcoat={1} envMapIntensity={2.4} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <group ref={flame} position={[0, 0.335, 0]} scale={[1, 0, 1]}>
      <mesh geometry={G.flame}><meshBasicMaterial color="#ff9a2e" transparent opacity={0.88} toneMapped={false} /></mesh>
      <mesh geometry={G.flame} scale={0.55} position={[0, 0.012, 0]}><meshBasicMaterial color="#fff3b0" toneMapped={false} /></mesh>
      <mesh position={[0, 0.012, 0]}><sphereGeometry args={[0.03, 12, 8]} /><meshBasicMaterial color="#4f8dff" transparent opacity={0.7} toneMapped={false} /></mesh>
    </group>
    {lit > 0.05 && <pointLight position={[0, 0.5, 0.2]} intensity={2.2 * lit} distance={3} decay={1.6} color="#ffb060" />}
    {/* 铁架：底盘、立杆、伸到火苗上方的横臂和一根针，纸风车顶在针尖上 */}
    <group position={[-0.62, 0, -0.12]}>
      <mesh geometry={G.foot} castShadow receiveShadow><Metal kind="iron" grain="cast" env={1.5} /></mesh>
      <mesh position={[0, 0.67, 0]} castShadow><cylinderGeometry args={[0.018, 0.018, 1.3, 14]} /><Metal kind="chrome" rough={0.15} env={1.5} /></mesh>
      <mesh position={[0.31, 1.3, 0.06]} rotation={[0, -0.19, Math.PI / 2]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.66, 12]} /><Metal kind="chrome" rough={0.15} env={1.5} /></mesh>
      <RoundedBox args={[0.07, 0.07, 0.07]} radius={0.01} smoothness={2} position={[0, 1.3, 0]}><Metal kind="steel" env={1.5} /></RoundedBox>
    </group>
    <mesh position={[0, 1.23, 0]}><cylinderGeometry args={[0.004, 0.008, 0.14, 8]} /><Metal kind="steel" env={1.5} /></mesh>
    <group ref={wheel} position={[0, 1.165, 0]}>
      <mesh><cylinderGeometry args={[0.022, 0.022, 0.016, 12]} /><meshStandardMaterial color="#c9453a" roughness={0.6} /></mesh>
      {Array.from({ length: BLADES }, (_, i) => <group key={i} rotation-y={i / BLADES * Math.PI * 2}><mesh position={[0.15, 0, 0]} rotation-x={0.95} castShadow><boxGeometry args={[0.24, 0.003, 0.1]} /><meshStandardMaterial color={i % 2 ? '#e9e2cf' : '#d95b49'} roughness={0.9} side={THREE.DoubleSide} /></mesh></group>)}
    </group>
    <group ref={puffs}>{Array.from({ length: 6 }, (_, i) => <mesh key={i}><sphereGeometry args={[0.05, 10, 8]} /><meshBasicMaterial color="#ffe1b0" transparent opacity={0} depthWrite={false} toneMapped={false} /></mesh>)}</group>
  </group>
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('freeze')
  const [did, setDid] = useState<Sub[]>([])
  const T = useTasks('gewu:density:x', TASKS)
  const on = did.includes(sub)
  const frozen = useSlide(did.includes('freeze') ? 1 : 0, 0.3), winter = useSlide(did.includes('lake') ? 1 : 0, 0.4), lit = useSlide(did.includes('air') ? 1 : 0, 0.7)
  const act = () => { if (on) return; const next = [...did, sub]; setDid(next); T.check(id => next.includes(id as Sub)) }
  const resetAll = () => { setSub('freeze'); setDid([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '三个专题都看完了。', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }
  const V = VW + (VI - VW) * frozen, cup: V3 = [X, TOP, Z]
  const tags = useMemo(() => LAKE.map((t, i) => ({ t, y: layerY(i) })), [])
  const labels: Label[] = sub === 'freeze' ? [
    { id: 'v', at: [X + 0.26, TOP + beakerY(V), Z], className: 'scene-tag key -translate-y-1/2', children: <><small>{frozen > 0.98 ? '冰的体积' : frozen < 0.02 ? '水的体积' : '体积'}</small>{V.toFixed(0)} cm³</> },
    { id: 'n', at: [X, TOP + BEAKER_H + 0.06, Z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `烧杯里 ${FREEZE.m} g 的水` },
    { id: 'b', at: [X + 0.86, TOP + 0.5, Z], ax: 0.5, className: `scene-${frozen > 0.9 ? 'tag key' : 'name'} -translate-y-full`, name: frozen <= 0.9, children: frozen > 0.9 ? '装满水的瓶子被胀裂了' : '装满水、拧紧盖的玻璃瓶' },
    { id: 'i', at: [X - 0.56, TOP + 0.1, Z + 0.2], ax: 1, name: true, className: 'scene-name', children: '碎冰（降温用）' },
  ] : sub === 'lake' ? [
    ...tags.map(({ t, y }, i) => ({ id: `t${i}`, at: [X + LW / 2 + 0.08, TOP + y, Z] as V3, className: `scene-tag -translate-y-1/2 transition-opacity${i === tags.length - 1 ? ' key' : ''}`, style: { opacity: winter > 0.9 ? 1 : 0 }, children: `${t} ℃` })),
    { id: 'ice', at: [X - LW / 2 - 0.08, TOP + 0.045 + LH - 0.15, Z], ax: 1, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: winter > 0.9 ? 1 : 0 }, children: '冰层' },
    { id: 'bed', at: [X - LW / 2 - 0.08, TOP + 0.2, Z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '湖底' },
  ] : [
    { id: 'w', at: [X - 0.15, TOP + 1.3, Z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '纸风车' },
    { id: 'a', at: [X + 0.12, TOP + 0.8, Z], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: lit > 0.9 ? 1 : 0 }, children: '热空气密度小，往上升' },
    { id: 'l', at: [X + 0.1, TOP + 0.14, Z + 0.2], name: true, className: 'scene-name', children: '酒精灯' },
  ]
  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="质量与密度" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={<Room at={sub === 'lake' ? 'sx' : sub === 'air' ? 'sx2' : 'sx3'} labels={labels}>
        {sub === 'freeze' && <group position={cup}><Beaker V={V} frozen={frozen} /><Chill on={frozen} /></group>}
        {sub === 'lake' && <Lake on={winter} />}
        {sub === 'air' && <Lamp lit={lit} />}
      </Room>}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">温度变了，密度也跟着变</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">冰比水轻，4 ℃ 的水最重，热空气比冷空气轻：浮冰、不冻的湖底、风，都和密度有关。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
            <div className="mt-1 text-[22px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
          </div>
          {sub === 'freeze' && <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="m" value={`${FREEZE.m}`} unit="g · 没有变" />
            <ParamTile symbol="V" value={V.toFixed(0)} unit="cm³" />
            <ParamTile symbol="ρ" value={density(FREEZE.m, V).toFixed(1)} unit="g/cm³" />
          </div>}
          {on && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={act} disabled={on}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={setSub} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
