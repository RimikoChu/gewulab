// 声现象 · 第 2 课 声音靠什么传播（声音的传播需要介质，真空不能传声）：玻璃罩里的闹钟，用抽气机把空气抽走
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Metal, bolts, disc, lathe, shell, useSlide, useTasks, type Label } from '@/lab-kit'
import { ENV, Hall, Hose, P, Rings } from './gear'
import { LESSONS, goLesson } from './lessons'
import { AIR, heard, heardWord } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: '100', text: '罩上玻璃罩，听一听闹钟的铃声，记录', note: '罩里有空气：铃声隔着玻璃也听得清楚' },
  { id: '50', text: '抽掉一半空气，再记一次', note: '闹钟照样在敲，铃声却变轻了' },
  { id: '5', text: '继续抽，抽到只剩很少的空气，记录', note: '几乎听不到了：空气越少，声音越难传出来' },
  { id: 'back', text: '打开阀门，把空气放回去', note: '铃声又回来了：声音要靠空气这样的介质来传' },
]
const JX = -1.3, PX = 2.15, PLATE = 0.22, CY = PLATE + 0.14 + 0.07 + 0.42     // 玻璃罩和抽气机的位置；底盘顶面、闹钟中心的高度
const PLATE_G = disc(1.3, 0.12), GASKET = lathe([[0.97, 0], [1.16, 0], [1.16, 0.03], [0.97, 0.03]], { segs: 56, closed: true }), FOAM = disc(0.62, 0.14, { chamfer: 0.03 }), PLATE_NUTS = bolts(6, 1.22, 0.07, 0.03)
const JAR = shell([[1.1, 0], [1.1, 0.06], [1.04, 0.09], [1.04, 1.5], [1.0, 1.8], [0.88, 2.06], [0.68, 2.25], [0.42, 2.36], [0.2, 2.4], [0.13, 2.44], [0.11, 2.54]], 0.035, { segs: 64 })
const FIN = lathe([[0.36, 0], [0.4, 0], [0.4, 0.035], [0.36, 0.035]], { segs: 32, closed: true }), CAP = lathe([[0, 0], [0.36, 0], [0.36, 0.05], [0.3, 0.13], [0.12, 0.17], [0, 0.17]], { segs: 32 })
const HEAD_NUTS = bolts(4, 0.3, 0.06, 0.03)
const GAUGE = lathe([[0, 0], [0.3, 0], [0.31, 0.01], [0.31, 0.11], [0.3, 0.12], [0.27, 0.12], [0.27, 0.1], [0, 0.1]], { segs: 40 })

/** 闹钟的表盘 */
function makeFace() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#f1ecdd'; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill()
  g.fillStyle = '#1d2024'; g.font = '700 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let h = 1; h <= 12; h++) { const a = h / 12 * Math.PI * 2; g.fillText(String(h), 128 + Math.sin(a) * 96, 130 - Math.cos(a) * 96) }
  g.strokeStyle = '#1d2024'; g.lineCap = 'round'
  for (const [a, l, w] of [[-1.05, 58, 8], [1.05, 82, 5]]) { g.lineWidth = w; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * l, 128 - Math.cos(a) * l); g.stroke() }
  g.fillStyle = '#c8372d'; g.beginPath(); g.arc(128, 128, 8, 0, 7); g.fill()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/** 真空表的表盘：一圈刻度，右边是“满”，左边是“空” */
function makeDial() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#f4f1e6'; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill()
  g.strokeStyle = '#1d2024'
  for (let i = 0; i <= 20; i++) { const a = -2.2 + i / 20 * 4.4; g.lineWidth = i % 5 ? 3 : 6; g.beginPath(); g.moveTo(128 + Math.sin(a) * 110, 128 - Math.cos(a) * 110); g.lineTo(128 + Math.sin(a) * (i % 5 ? 96 : 86), 128 - Math.cos(a) * (i % 5 ? 96 : 86)); g.stroke() }
  g.strokeStyle = '#c8372d'; g.lineWidth = 9; g.beginPath(); g.arc(128, 128, 104, -Math.PI / 2 - 2.2, -Math.PI / 2 - 1.5); g.stroke()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

const N = 90
/** 罩里的空气粒子（示意）：剩下百分之多少，就画多少颗 */
function Air({ air }: { air: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), live = useRef(air); live.current = air
  const seeds = useMemo(() => {
    let s = 17; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296, out: number[][] = []
    while (out.length < N) { const a = r() * 6.283, q = Math.sqrt(r()) * 0.93, y = 0.16 + r() * 2.0, x = Math.cos(a) * q, z = Math.sin(a) * q; if (y > 1.55 && q > 0.93 - (y - 1.55) * 1.1) continue; if (Math.abs(x) < 0.62 && y < 1.5 && Math.abs(z) < 0.3) continue; out.push([x, y, z, r() * 6.283, 0.8 + r() * 1.4]) }
    return out
  }, [])
  const m = useMemo(() => new THREE.Matrix4(), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime, keep = live.current / 100 * N
    seeds.forEach(([x, y, z, ph, w], i) => { const k = Math.max(0, Math.min(1, keep - i)); m.makeScale(k, k, k); m.setPosition(x + 0.05 * Math.sin(t * w * 2 + ph), PLATE + y + 0.05 * Math.sin(t * w * 2.3 + ph * 2), z + 0.05 * Math.cos(t * w * 1.7 + ph)); ref.current!.setMatrixAt(i, m) })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, N]} position-x={JX} frustumCulled={false}><sphereGeometry args={[0.026, 10, 8]} /><meshBasicMaterial color="#a9dcff" transparent opacity={0.8} toneMapped={false} /></instancedMesh>
}

/** 闹钟：一只双铃闹钟，坐在一块海绵垫上（免得声音顺着底盘传出去）。小锤一直在两只铃之间敲 */
function Clock() {
  const face = useMemo(makeFace, []), hammer = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (hammer.current) hammer.current.rotation.z = 0.42 * Math.sin(clock.elapsedTime * 38) })
  const chrome = <Metal kind="chrome" rough={0.1} env={ENV} />
  return <group position={[JX, CY, 0]}>
    <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.42, 0.42, 0.26, 40]} /><meshPhysicalMaterial color="#1f6f6a" roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} /></mesh>
    <mesh position-z={0.13}><torusGeometry args={[0.41, 0.03, 12, 48]} />{chrome}</mesh>
    <mesh position-z={0.132}><circleGeometry args={[0.39, 40]} /><meshStandardMaterial map={face} roughness={0.6} /></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * 0.27, 0.5, 0]} rotation-z={-s * 0.45}>
      <mesh position-y={-0.08}><cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />{chrome}</mesh>
      <mesh castShadow><sphereGeometry args={[0.17, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><Metal kind="brass" rough={0.18} env={ENV} /></mesh>
      <mesh position-y={0.175}><sphereGeometry args={[0.025, 10, 8]} />{chrome}</mesh>
    </group>)}
    <group ref={hammer} position-y={0.4}>
      <mesh position-y={0.1}><cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />{chrome}</mesh>
      <mesh position-y={0.2}><sphereGeometry args={[0.04, 12, 10]} />{chrome}</mesh>
    </group>
    <mesh position-y={0.52} rotation-x={Math.PI / 2}><torusGeometry args={[0.2, 0.014, 8, 24, Math.PI]} />{chrome}</mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.3, -0.42, 0]} rotation-z={s * 0.4}><cylinderGeometry args={[0.03, 0.02, 0.18, 10]} />{chrome}</mesh>)}
  </group>
}

/** 抽气机：电动机带着一只泵头，进气口接软管。run：正在抽 */
function Pump({ run }: { run: boolean }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (g.current) g.current.position.y = run ? 0.004 * Math.sin(clock.elapsedTime * 90) : 0 })
  const blue = <meshPhysicalMaterial color="#2d4a66" roughness={0.4} clearcoat={0.7} clearcoatRoughness={0.25} />
  return <group position={[PX, 0, 0]}>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 0.75, 0.03, sz * 0.36]}><cylinderGeometry args={[0.07, 0.08, 0.06, 12]} /><meshStandardMaterial color="#101113" roughness={0.85} /></mesh>))}
    <RoundedBox args={[1.8, 0.08, 0.95]} radius={0.025} position-y={0.1} castShadow><Metal kind="iron" grain="cast" env={ENV} /></RoundedBox>
    <group ref={g}>
      {/* 电动机：一只带散热片的圆筒，尾端一只风扇罩 */}
      <group position={[0.42, 0.56, 0]} rotation-z={-Math.PI / 2}>
        <mesh castShadow><cylinderGeometry args={[0.36, 0.36, 0.86, 32]} />{blue}</mesh>
        {[-0.3, -0.18, -0.06, 0.06, 0.18, 0.3].map(y => <mesh key={y} geometry={FIN} position-y={y}>{blue}</mesh>)}
        <mesh geometry={CAP} position-y={0.43}><meshStandardMaterial color="#1b1d20" roughness={0.5} metalness={0.4} /></mesh>
      </group>
      {[-1, 1].map(s => <mesh key={s} position={[0.42 + s * 0.28, 0.2, 0]}><boxGeometry args={[0.12, 0.14, 0.7]} />{blue}</mesh>)}
      {/* 泵头：一块铸铁，正面一只油窗，顶上是进气口和排气的消声器 */}
      <RoundedBox args={[0.7, 0.72, 0.74]} radius={0.05} position={[-0.42, 0.5, 0]} castShadow><Metal kind="iron" grain="cast" rough={0.55} env={ENV} /></RoundedBox>
      <mesh geometry={HEAD_NUTS} position={[-0.42, 0.5, 0.37]} rotation-x={Math.PI / 2}><Metal kind="steel" env={ENV} /></mesh>
      <mesh position={[-0.42, 0.42, 0.372]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.1, 0.1, 0.02, 20]} /><meshPhysicalMaterial color="#c9a23a" roughness={0.1} clearcoat={1} transparent opacity={0.85} /></mesh>
      <mesh position={[-0.42, 0.42, 0.37]} rotation-x={Math.PI / 2}><torusGeometry args={[0.11, 0.018, 8, 24]} /><Metal kind="brass" rough={0.3} env={ENV} /></mesh>
      <mesh position={[-0.58, 0.97, 0]}><cylinderGeometry args={[0.06, 0.07, 0.22, 16]} /><Metal kind="brass" grain="turned" env={ENV} /></mesh>
      <mesh position={[-0.24, 1.04, 0]} castShadow><cylinderGeometry args={[0.13, 0.13, 0.36, 20]} /><meshStandardMaterial color="#1b1d20" roughness={0.6} /></mesh>
      {/* 提手 */}
      <mesh position={[0.42, 0.92, 0]} rotation-y={Math.PI / 2}><torusGeometry args={[0.3, 0.025, 8, 24, Math.PI]} /><Metal kind="chrome" rough={0.15} env={ENV} /></mesh>
    </group>
  </group>
}

export default function Lesson2() {
  const [step, setStep] = useState(0)                      // 抽到第几档
  const [rows, setRows] = useState<number[]>([])
  const [back, setBack] = useState(false)
  const T = useTasks('gewu:sound:2', TASKS)
  const dial = useMemo(makeDial, [])
  const goal = AIR[step], air = useSlide(goal, 22), steady = Math.abs(air - goal) < 0.01, pumping = !steady && air > goal
  const dup = rows.includes(goal)
  const check = (r: number[], b: boolean) => T.check(id => id === 'back' ? b : r.includes(Number(id)))
  const record = () => { if (!steady || dup) return; const n = [...rows, goal]; setRows(n); check(n, back) }
  const pump = () => { if (steady && step < AIR.length - 1) setStep(step + 1) }
  const vent = () => { if (!steady || step === 0) return; const b = back || rows.includes(AIR[2]); setStep(0); setBack(b) }
  useEffect(() => { if (steady && step === 0 && back) check(rows, true) }, [steady, step, back])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setStep(0); setRows([]); setBack(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'pump' | 'vent' | 'record' | null } = !task ? { hint: '都做完了。闹钟一直在响，听不听得到，全看罩里有没有空气。', next: null }
    : !steady ? { hint: pumping ? '抽气机在抽…看罩里的空气粒子越来越少' : '空气在往回灌…', next: null }
    : task.id === 'back' ? (step === 0 ? { hint: '空气回来了，铃声也回来了', next: null } : { hint: '按“放气”，让空气回到罩里', next: 'vent' })
    : goal === Number(task.id) ? { hint: `闹钟还在敲。听一听现在的铃声，按“记录”`, next: 'record' }
    : goal > Number(task.id) ? { hint: '按“抽气”', next: 'pump' } : { hint: '按“放气”，从头再来', next: 'vent' }
  const loud = () => heard(air)
  const labels: Label[] = [
    { id: 'a', at: P('jar', JX + 1.3, 2.75), className: 'scene-tag -translate-y-1/2', children: <><small>罩内空气</small>{air.toFixed(0)}%</> },
    { id: 'h', at: P('jar', JX + 1.3, 2.2), className: 'scene-tag key -translate-y-1/2', children: <><small>罩外听到</small>{heardWord(air)}</> },
    { id: 'c', at: P('jar', JX, 0.2, 1.2), ax: 0.5, name: true, className: 'scene-name', children: '闹钟一直在响 · 垫着海绵' },
    { id: 'p', at: P('jar', PX + 0.2, 1.4), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '抽气机' },
    { id: 'g', at: P('jar', 0.42, 1.55), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '气压表和放气阀' },
    { id: 'n', at: P('jar', JX, 3.0), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蓝点是空气粒子（示意）' },
  ]
  const glass = <meshPhysicalMaterial color="#d4ecf2" transparent opacity={0.08} roughness={0.03} metalness={0} clearcoat={1} clearcoatRoughness={0.03} envMapIntensity={1.3} depthWrite={false} side={THREE.DoubleSide} />
  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title="声现象" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="抽气机"
      stage={<Hall at="jar" labels={labels}>
        {/* 底盘：一块厚铝盘，三只脚，上面一圈橡胶垫；玻璃罩扣在垫上 */}
        <group position-x={JX}>
          {[0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + 0.5; return <mesh key={i} position={[Math.cos(a) * 1.05, 0.05, Math.sin(a) * 1.05]}><cylinderGeometry args={[0.09, 0.1, 0.1, 14]} /><meshStandardMaterial color="#101113" roughness={0.85} /></mesh> })}
          <mesh geometry={PLATE_G} position-y={0.1} castShadow receiveShadow><Metal kind="aluminum" grain="turned" rough={0.5} env={1.2} /></mesh>
          <mesh geometry={PLATE_NUTS} position-y={PLATE}><Metal kind="steel" env={ENV} /></mesh>
          <mesh geometry={GASKET} position-y={PLATE}><meshStandardMaterial color="#17181a" roughness={0.9} /></mesh>
          <mesh geometry={FOAM} position-y={PLATE} castShadow><meshStandardMaterial color="#d9b84a" roughness={1} /></mesh>
          <mesh geometry={JAR} position-y={PLATE + 0.03} renderOrder={5}>{glass}</mesh>
          <mesh position-y={PLATE + 0.03 + 2.66} renderOrder={5}><sphereGeometry args={[0.16, 24, 18]} />{glass}</mesh>
        </group>
        <Clock />
        <Air air={air} />
        {/* 底盘侧面的接口：一只三通，上面立着气压表，前面一只放气阀，右边接软管去抽气机 */}
        <mesh position={[JX + 1.45, 0.16, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.055, 0.055, 0.5, 14]} /><Metal kind="brass" grain="turned" env={ENV} /></mesh>
        <mesh position={[0.42, 0.16, 0]}><boxGeometry args={[0.18, 0.18, 0.18]} /><Metal kind="brass" env={ENV} /></mesh>
        <mesh position={[0.42, 0.42, 0]}><cylinderGeometry args={[0.04, 0.04, 0.4, 12]} /><Metal kind="brass" grain="turned" env={ENV} /></mesh>
        <group position={[0.42, 0.9, -0.05]}>
          <mesh geometry={GAUGE} rotation-x={Math.PI / 2}><Metal kind="stainless" grain="turned" env={ENV} /></mesh>
          <mesh position-z={0.102}><circleGeometry args={[0.27, 36]} /><meshStandardMaterial map={dial} roughness={0.6} /></mesh>
          <group position-z={0.108} rotation-z={2.2 - air / 100 * 4.4}><mesh position-y={0.09}><boxGeometry args={[0.018, 0.24, 0.004]} /><meshBasicMaterial color="#111" /></mesh></group>
          <mesh position-z={0.11}><circleGeometry args={[0.03, 14]} /><meshBasicMaterial color="#111" /></mesh>
        </group>
        <mesh position={[0.42, 0.16, 0.16]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 0.16, 10]} /><Metal kind="brass" env={ENV} /></mesh>
        <mesh position={[0.42, 0.16, 0.27]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.1, 0.1, 0.05, 8]} /><meshStandardMaterial color="#c8372d" roughness={0.5} /></mesh>
        <Hose pts={[[0.5, 0.16, 0], [0.8, 0.14, 0.05], [1.15, 0.2, 0.3], [1.5, 0.75, 0.45], [1.55, 1.2, 0.15], [PX - 0.58, 1.1, 0]]} />
        <Pump run={pumping} />
        <Rings at={[JX, CY + 0.35, 0]} level={loud} r0={0.25} r1={0.95} n={3} speed={0.9} />
        <Rings at={[JX, CY + 0.35, 0]} level={loud} r0={1.5} r1={3.3} n={4} />
      </Hall>}
      lesson={<LessonBlock no="2" title="声音靠什么传播" concept="声音的传播需要介质，真空不能传声" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>声音的传播需要物质，这种物质叫<b className="text-white">介质</b>。气体、液体、固体都能传声；<b className="text-white">真空不能传声</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>把空气一点点抽走，闹钟还在敲，听到的铃声却越来越轻</li>
            <li>抽气机抽不到一点空气都不剩。铃声随空气减少而减弱，由此推想：要是罩里是真空，就完全听不到了</li>
            <li>声音在介质里以波的形式传播，叫声波。隔着门能听见说话、潜水时能听见岸上的声音，都是固体、液体在传声</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">蓝点代表空气，是示意，真实的空气粒子小得多、多得多。“罩外听到”的轻重也是示意。闹钟垫着海绵，是为了不让声音顺着底盘传出来。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">抽气、放气都做过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">声音的传播需要介质，真空不能传声</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">闹钟从头到尾都在响。空气抽走，铃声传不出来；空气回来，铃声也回来。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">罩外听到的铃声</div>
            <div className="mt-1 text-[30px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{heardWord(air)}</div>
            <div className="mx-auto mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#35c7b3]" style={{ width: `${heard(air) * 100}%` }} /></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="罩内空气" value={`${air.toFixed(0)}%`} unit="和抽气之前比" />
            <ParamTile symbol="闹钟" value="一直在响" unit="小锤没有停过" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每抽一次气，听一听，记一次。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">罩内空气</th><th className="font-normal">闹钟</th><th className="font-normal">罩外听到</th></tr></thead>
                <tbody>{rows.map(a => <tr key={a} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums text-white/80">{a}%</td><td>在响</td><td className="font-semibold text-[#7fe3d4]">{heardWord(a)}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'pump'} onClick={pump} disabled={!steady || step === AIR.length - 1}>抽气</LabButton>
        <LabButton pulse={next === 'vent'} onClick={vent} disabled={!steady || step === 0}>放气</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="罩内空气"><div className="flex h-11 items-center rounded-xl bg-white/8 px-3 text-[14px] tabular-nums text-white/80">{air.toFixed(0)}%</div></Control>}
    />
  )
}
