// 声现象 · 第 7 课 把噪声挡在外面（控制噪声的三条途径：声源处、传播途中、人耳处）：后台的一台风机，和几米外的一只人工头
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, Rod, bolts, disc, lathe, shell, useSlide, useTasks, type Label } from '@/lab-kit'
import { ENV, Hall, P, Readout, Rings } from './gear'
import { LESSONS, goLesson } from './lessons'
import { CUT, NOISE, WAYS, noiseAfter, verdict, type WayKey } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const ORDER: WayKey[] = ['source', 'path', 'ear']
const TASKS: Task[] = [
  { id: '0', text: '什么都不做，先记下耳朵里听到多少分贝', note: `${NOISE} dB：${verdict(NOISE)}` },
  { id: '1', text: '在声源处：给风机罩上隔音罩，记录', note: `降到约 ${noiseAfter(1)} dB：${WAYS.source.say}` },
  { id: '2', text: '在传播途中：再推来隔音屏，记录', note: `降到约 ${noiseAfter(2)} dB：${WAYS.path.say}` },
  { id: '3', text: '在人耳处：再戴上耳罩，记录', note: `降到约 ${noiseAfter(3)} dB：${WAYS.ear.say}` },
]
const FX = -4.1, HX = 3.7, FY = 1.5, EAR = 4.35                  // 风机、人工头的位置；风机轴线、耳朵的高度
const DUCT = (() => { const g = shell([[1.0, -0.65], [1.0, 0.65]], 0.05, { segs: 48 }); g.rotateZ(-Math.PI / 2); return g })()
const FLANGE = (() => { const g = mergeGeometries([disc(1.12, 0.07, { hole: 0.98 }), bolts(12, 1.05, 0.07, 0.11)]); g.rotateZ(-Math.PI / 2); return g })()
const HUB = (() => { const g = lathe([[0, 0], [0.26, 0], [0.26, 0.2], [0.18, 0.34], [0, 0.38]], { segs: 24 }); g.rotateZ(-Math.PI / 2); return g })()
const BLADES = mergeGeometries(Array.from({ length: 7 }, (_, i) => { const g = new THREE.BoxGeometry(0.03, 0.66, 0.34); g.rotateY(0.6); g.translate(0, 0.56, 0); g.rotateX(i / 7 * Math.PI * 2); return g }))
const GRILLE = mergeGeometries([...[0.3, 0.52, 0.74, 0.96].map(r => { const g = new THREE.TorusGeometry(r, 0.014, 6, 48); g.rotateY(Math.PI / 2); return g }), ...Array.from({ length: 6 }, (_, i) => { const g = new THREE.CylinderGeometry(0.014, 0.014, 1.96, 6); g.rotateX(i / 6 * Math.PI); return g })])
const HEAD = lathe([[0, 0], [0.2, 0], [0.2, 0.3], [0.3, 0.42], [0.41, 0.62], [0.45, 0.86], [0.42, 1.08], [0.32, 1.26], [0.16, 1.36], [0, 1.38]], { segs: 32, crease: 60 })
const CUP = lathe([[0, 0], [0.24, 0], [0.26, 0.04], [0.24, 0.14], [0.14, 0.2], [0, 0.21]], { segs: 28 })
const FOOT = disc(0.16, 0.05)

/** 隔音屏和隔音罩上的吸音板：一排排小孔 */
function makePanel() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#48525c'; g.fillRect(0, 0, S, S); g.fillStyle = '#262c33'
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.beginPath(); g.arc(x * 16 + 8 + (y % 2) * 0, y * 16 + 8, 3.2, 0, 7); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}

/** 风机：一截风筒里装着叶轮，后面是电动机，坐在一副钢架上 */
function Fan() {
  const spin = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (spin.current) spin.current.rotation.x += dt * 14 })
  const paint = <meshPhysicalMaterial color="#3f6f63" roughness={0.42} clearcoat={0.6} clearcoatRoughness={0.3} side={THREE.DoubleSide} />
  return <group position={[FX, 0, 0]}>
    {[-0.72, 0.72].map(z => <group key={z}>
      <mesh position={[-0.3, 0.14, z]} castShadow><boxGeometry args={[3.0, 0.2, 0.26]} /><Metal kind="iron" grain="cast" env={ENV} /></mesh>
      {[-1.5, 0.9].map(x => <mesh key={x} position={[x, 0.02, z]}><boxGeometry args={[0.36, 0.04, 0.36]} /><meshStandardMaterial color="#101113" roughness={0.9} /></mesh>)}
      <mesh position={[0, 0.5, z * 0.78]} rotation-x={z > 0 ? 0.25 : -0.25} castShadow><boxGeometry args={[0.9, 0.62, 0.1]} />{paint}</mesh>
    </group>)}
    <group position-y={FY}>
      <mesh geometry={DUCT} castShadow>{paint}</mesh>
      {[-0.68, 0.61].map(x => <mesh key={x} geometry={FLANGE} position-x={x}><Metal kind="steel" grain="turned" env={ENV} /></mesh>)}
      <mesh geometry={GRILLE} position-x={0.7}><Metal kind="chrome" rough={0.2} env={ENV} /></mesh>
      <group ref={spin} position-x={0.1}><mesh geometry={HUB}><meshStandardMaterial color="#1b1d20" roughness={0.4} metalness={0.5} /></mesh><mesh geometry={BLADES}><Metal kind="aluminum" grain="brushed" env={ENV} /></mesh></group>
      {/* 电动机 */}
      <mesh position-x={-1.15} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.46, 0.46, 1.0, 28]} /><meshPhysicalMaterial color="#27333d" roughness={0.45} clearcoat={0.5} /></mesh>
      {[-1.45, -1.3, -1.15, -1.0, -0.85].map(x => <mesh key={x} position-x={x} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.5, 0.5, 0.04, 28]} /><meshPhysicalMaterial color="#27333d" roughness={0.45} clearcoat={0.5} /></mesh>)}
      <mesh position={[-1.15, 0.52, 0]}><boxGeometry args={[0.4, 0.2, 0.36]} /><meshStandardMaterial color="#1b1d20" roughness={0.5} /></mesh>
    </group>
    <mesh position={[-1.15, 0.6, 0]}><boxGeometry args={[0.7, 0.86, 0.5]} /><Metal kind="iron" grain="cast" env={ENV} /></mesh>
  </group>
}

export default function Lesson7() {
  const [way, setWay] = useState<WayKey>('source')
  const [on, setOn] = useState<Record<WayKey, boolean>>({ source: false, path: false, ear: false })
  const [rows, setRows] = useState<number[]>([])
  const T = useTasks('gewu:sound:7', TASKS)
  const panel = useMemo(() => { const t = makePanel(); t.repeat.set(6, 6); return t }, [])
  const hood = useSlide(on.source ? 1 : 0, 0.7), wall = useSlide(on.path ? 1 : 0, 0.7), muff = useSlide(on.ear ? 1 : 0, 1.1)
  const steady = hood === +on.source && wall === +on.path && muff === +on.ear
  const n = ORDER.filter(k => on[k]).length, db = noiseAfter(n), dup = rows.includes(n)
  const toggle = () => { if (steady) setOn(o => ({ ...o, [way]: !o[way] })) }
  const record = () => { if (!steady || dup) return; const r = [...rows, n]; setRows(r); T.check(id => r.includes(Number(id))) }
  const resetAll = () => { setWay('source'); setOn({ source: false, path: false, ear: false }); setRows([]); T.reset() }
  const task = T.current, need = Number(task?.id ?? 0)
  // 这一步该是什么样：前 need 种办法用上，其余的不用。找出第一处不一样的
  const wrong = task ? ORDER.find((k, i) => on[k] !== (i < need)) : undefined
  const { hint, next }: { hint: string; next: 'way' | 'toggle' | 'record' | null } = !task ? { hint: '三处都用上了：声源处、传播途中、人耳处，都可以控制噪声。', next: null }
    : !steady ? { hint: '正在就位…', next: null }
    : wrong && way !== wrong ? { hint: `选“${WAYS[wrong].name}”`, next: 'way' }
    : wrong ? { hint: on[wrong] ? `这一步先不用它：按“撤掉”` : `按“${WAYS[wrong].how}”`, next: 'toggle' } : { hint: `人工头的耳朵里现在是约 ${db} dB，按“记录”`, next: 'record' }
  const hy = 3.5 * (1 - hood) + 0.02, wz = -5.2 * (1 - wall), e = muff * muff * (3 - 2 * muff)
  const labels: Label[] = [
    { id: 'db', at: P('noise', HX - 0.75, EAR + 0.2), ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>耳朵里</small>约 {db} dB</> },
    { id: 'f', at: P('noise', FX, 0.1, 1.5), ax: 0.5, name: true, className: 'scene-name', children: '风机（噪声的声源）' },
    { id: 'h', at: P('noise', HX, EAR + 1.15), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '人工头 · 耳朵里装着话筒' },
    ...(on.path || way === 'path' ? [{ id: 'w', at: P('noise', -0.6, 4.5, wz), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '隔音屏' } as Label] : []),
    ...(on.source || way === 'source' ? [{ id: 'c', at: P('noise', FX, hy + 3.3), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '隔音罩' } as Label] : []),
  ]
  const foam = <meshStandardMaterial map={panel} roughness={0.95} />
  const alu = <meshStandardMaterial color="#4d545b" roughness={0.6} metalness={0.4} />
  const post = <meshPhysicalMaterial color="#a67c14" roughness={0.55} clearcoat={0.4} />
  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title="声现象" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={WAYS[way].name}
      stage={<Hall at="noise" labels={labels}>
        <Fan />
        {/* 隔音罩：吊在一副门架上，放下来把风机整个罩住 */}
        {[-2.05, 2.05].map(s => <group key={s} position={[FX + s, 0, -0.2]}>
          <mesh position-y={0.04}><boxGeometry args={[0.6, 0.08, 1.5]} /><Metal kind="iron" grain="cast" env={ENV} /></mesh>
          <mesh position-y={3.75} castShadow><boxGeometry args={[0.2, 7.4, 0.2]} />{post}</mesh>
        </group>)}
        <mesh position={[FX, 7.5, -0.2]} castShadow><boxGeometry args={[4.5, 0.24, 0.24]} />{post}</mesh>
        {[-1, 1].map(s => <mesh key={s} position={[FX + s * 0.9, (7.38 + hy + 3.0) / 2, -0.2]}><cylinderGeometry args={[0.03, 0.03, Math.max(0.01, 7.38 - hy - 3.0), 8]} /><meshStandardMaterial color="#2a2d31" roughness={0.5} metalness={0.6} /></mesh>)}
        <group position={[FX - 0.2, hy, 0]}>
          {/* 五块吸音板拼成的罩子，棱上包着铝条；朝着镜头的那一面留了一扇观察窗 */}
          <mesh position={[0, 3.0 - 0.06, 0]} castShadow><boxGeometry args={[3.5, 0.12, 2.6]} />{foam}</mesh>
          <mesh position={[0, 1.5, -1.24]} castShadow><boxGeometry args={[3.5, 3.0, 0.12]} />{foam}</mesh>
          {[-1, 1].map(s => <mesh key={s} position={[s * 1.69, 1.5, 0]} castShadow><boxGeometry args={[0.12, 3.0, 2.6]} />{foam}</mesh>)}
          <mesh position={[-1.1, 1.5, 1.24]} castShadow><boxGeometry args={[1.3, 3.0, 0.12]} />{foam}</mesh>
          <mesh position={[1.1, 1.5, 1.24]} castShadow><boxGeometry args={[1.3, 3.0, 0.12]} />{foam}</mesh>
          <mesh position={[0, 0.4, 1.24]} castShadow><boxGeometry args={[0.9, 0.8, 0.12]} />{foam}</mesh>
          <mesh position={[0, 2.6, 1.24]} castShadow><boxGeometry args={[0.9, 0.8, 0.12]} />{foam}</mesh>
          <mesh position={[0, 1.5, 1.24]} renderOrder={5}><boxGeometry args={[0.9, 1.4, 0.05]} /><meshPhysicalMaterial color="#cfe8f0" transparent opacity={0.14} roughness={0.04} clearcoat={1} depthWrite={false} envMapIntensity={2} /></mesh>
          {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 1.72, 1.5, sz * 1.27]}><boxGeometry args={[0.1, 3.02, 0.1]} />{alu}</mesh>))}
          {[-1, 1].map(sz => <mesh key={sz} position={[0, 3.0, sz * 1.27]}><boxGeometry args={[3.54, 0.1, 0.1]} />{alu}</mesh>)}
          {[-1, 1].map(sx => <mesh key={sx} position={[sx * 1.72, 3.0, 0]}><boxGeometry args={[0.1, 0.1, 2.64]} />{alu}</mesh>)}
        </group>
        {/* 隔音屏：一面带轮子的吸音板，从后面推到风机和人之间 */}
        <group position={[-0.6, 0, wz]}>
          <RoundedBox args={[0.3, 4.0, 3.8]} radius={0.04} position={[0, 2.35, 0]} castShadow>{foam}</RoundedBox>
          {[-1, 1].map(s => <mesh key={s} position={[0, 2.35, s * 1.93]}><boxGeometry args={[0.36, 4.1, 0.1]} />{alu}</mesh>)}
          <mesh position={[0, 4.4, 0]}><boxGeometry args={[0.36, 0.1, 3.96]} />{alu}</mesh>
          <mesh position={[0, 0.32, 0]}><boxGeometry args={[0.36, 0.1, 3.96]} />{alu}</mesh>
          {[-1.6, 1.6].map(z => <group key={z} position-z={z}>
            <mesh position-y={0.24}><boxGeometry args={[1.5, 0.08, 0.14]} />{alu}</mesh>
            {[-0.65, 0.65].map(x => <mesh key={x} position={[x, 0.1, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.1, 0.1, 0.08, 14]} /><meshStandardMaterial color="#101113" roughness={0.85} /></mesh>)}
          </group>)}
        </group>
        {/* 人工头：立在一根杆子上，面朝风机；耳罩平时挂在旁边的挂钩上 */}
        <group position={[HX, 0, 0]}>
          {[0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + 0.5; return <group key={i}><Rod from={[Math.cos(a) * 1.0, 0.06, Math.sin(a) * 1.0]} to={[0, 0.9, 0]} r={0.035}><Metal kind="chrome" rough={0.16} env={ENV} /></Rod><mesh geometry={FOOT} position={[Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0]}><meshStandardMaterial color="#101113" roughness={0.85} /></mesh></group> })}
          <mesh position-y={2.15}><cylinderGeometry args={[0.045, 0.045, 2.7, 14]} /><Metal kind="chrome" rough={0.16} env={ENV} /></mesh>
          <mesh position-y={0.95}><cylinderGeometry args={[0.09, 0.1, 0.18, 14]} /><meshStandardMaterial color="#15171a" roughness={0.5} /></mesh>
          <mesh geometry={HEAD} position-y={3.5} scale={[1.12, 1, 0.9]} castShadow><meshStandardMaterial color="#7d8288" roughness={0.75} /></mesh>
          <mesh position={[-0.5, EAR + 0.02, 0]} scale={[0.6, 1, 0.7]}><sphereGeometry args={[0.1, 14, 10]} /><meshStandardMaterial color="#7d8288" roughness={0.75} /></mesh>
          {[-1, 1].map(s => <group key={s} position={[0.03, EAR, s * 0.4]}><mesh scale={[0.6, 1, 0.35]}><sphereGeometry args={[0.13, 16, 12]} /><meshStandardMaterial color="#6d7278" roughness={0.75} /></mesh><mesh position-z={s * 0.045}><sphereGeometry args={[0.03, 10, 8]} /><meshBasicMaterial color="#0c0c0d" /></mesh></group>)}
          <mesh position={[0.9, 3.9, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, 1.8, 10]} /><Metal kind="chrome" rough={0.16} env={ENV} /></mesh>
          <mesh position={[1.8, 3.65, 0]}><cylinderGeometry args={[0.03, 0.03, 0.56, 10]} /><Metal kind="chrome" rough={0.16} env={ENV} /></mesh>
          <mesh position={[0.9, 3.9, 0]}><sphereGeometry args={[0.07, 12, 10]} /><meshStandardMaterial color="#15171a" roughness={0.5} /></mesh>
          {/* 耳罩：两只红色的罩杯和一道头箍 */}
          <group position={[1.8 * (1 - e), 2.78 + (EAR - 2.78) * e + Math.sin(e * Math.PI) * 1.2, 0]}>
            <mesh position-y={0.12} rotation-y={Math.PI / 2}><torusGeometry args={[0.5, 0.035, 10, 32, Math.PI]} /><meshStandardMaterial color="#15171a" roughness={0.5} /></mesh>
            {[-1, 1].map(s => <group key={s} position={[0, 0, s * 0.43]} rotation-x={s * Math.PI / 2}><mesh geometry={CUP} castShadow><meshPhysicalMaterial color="#c8372d" roughness={0.4} clearcoat={0.6} /></mesh><mesh position-y={-0.03}><cylinderGeometry args={[0.25, 0.25, 0.06, 24]} /><meshStandardMaterial color="#15171a" roughness={0.9} /></mesh></group>)}
          </group>
        </group>
        <group position={[HX + 2.3, 0, 0.9]}>
          <RoundedBox args={[1.5, 2.2, 1.1]} radius={0.05} position-y={1.2} castShadow><meshStandardMaterial color="#17181b" roughness={0.6} /></RoundedBox>
          {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 0.55, 0.06, sz * 0.4]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.07, 12]} /><meshStandardMaterial color="#0c0c0d" /></mesh>))}
          <group position-y={2.3}><Readout x={0} text={`${db} dB`} w={1.2} /></group>
        </group>
        {/* 噪声的波：出了隔音罩弱一截，过了隔音屏又弱一截 */}
        <Rings at={[FX + 0.3, FY, 0]} level={() => 1 - 0.62 * hood} color="#ff9a6a" r0={1.3} r1={4.2} n={4} speed={0.45} half />
        <Rings at={[FX + 0.3, FY, 0]} level={() => (1 - 0.62 * hood) * (1 - 0.62 * wall)} color="#ff9a6a" r0={4.4} r1={8.6} n={4} speed={0.45} half />
      </Hall>}
      lesson={<LessonBlock no="7" title="把噪声挡在外面" concept="声源处、传播途中、人耳处都能减弱噪声" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>妨碍人们正常休息、学习和工作的声音，都属于<b className="text-white">噪声</b>。声音从产生到引起听觉有三个环节，控制噪声也就有三条途径：</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">防止噪声产生</b>：在声源处想办法，比如给机器加隔音罩、给摩托车装消声器</li>
            <li><b className="text-white">阻断噪声传播</b>：在传播途中想办法，比如路边的隔音屏、关上门窗</li>
            <li><b className="text-white">防止噪声进入耳朵</b>：在人耳处想办法，比如戴耳罩、耳塞</li>
          </ul>
          <p className="mt-3">人们用分贝（dB）表示声音强弱的等级。为了保护听力，声音不能超过 90 dB；为了保证工作和学习，不能超过 70 dB；为了保证休息和睡眠，不能超过 50 dB。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里设定风机在人耳处是 {NOISE} dB，每用上一种办法降约 {CUT} dB，是示意：真实的降噪效果要看材料和做法。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三条途径都用上了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">声源处、传播途中、人耳处</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">从 {NOISE} dB 一步步降到约 {noiseAfter(3)} dB：从“{verdict(NOISE)}”到了“{verdict(noiseAfter(3))}”。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">人工头的耳朵里</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">约 {db}<span className="ml-1 text-[15px] font-medium text-white/55">dB</span></div>
            <div className="mt-1 text-[14px] font-medium text-[#7fe3d4]">{verdict(db)}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">{ORDER.map(k => <ParamTile key={k} symbol={WAYS[k].name} value={on[k] ? '用上了' : '没用'} unit={WAYS[k].say} />)}</div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每多用上一种办法，记一次。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">用了几种办法</th><th className="text-right font-normal">耳朵里</th><th className="text-right font-normal">意味着</th></tr></thead>
                <tbody>{rows.map(r => <tr key={r} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{r} 种</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">约 {noiseAfter(r)} dB</td><td className="text-right text-[12.5px] text-white/75">{verdict(noiseAfter(r))}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'toggle'} onClick={toggle} disabled={!steady}>{on[way] ? '撤掉' : WAYS[way].how}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="在哪里控制"><Segmented label="在哪里控制" pulse={next === 'way'} want={next === 'way' ? wrong ?? null : null} value={way} disabled={!steady} onChange={setWay} options={ORDER.map(k => ({ value: k, label: WAYS[k].name }))} /></Control>}
    />
  )
}
