// 质量守恒定律 · 第 7 课 根据化学方程式计算：石灰窑。要制取 5.6 t 氧化钙（生石灰），需要多少碳酸钙？
// 一步一步写出解题过程（设、写、找、列、求、答）；再按算出的 10 t 投料：卡车过汽车衡称重，料车沿斜桥送上窑顶，煅烧后出灰称量斗称出 5.6 t。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { Led, Metal, useTasks, type Label } from '@/lab-kit'
import { Puffs, SMOKE } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, seg, useRun, type V3 } from './parts'
import { L7, kiln, solveLime } from './physics'
import { BIN, FOOT as FOOT0, KILN, PIT, SCALE, Place } from './world'
import { KIOSK } from './plant'

const S = solveLime(L7.cao), OUT = kiln(S.x)
const t1 = (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)} t`
/** 解题的七行，和每一行之前的提示 */
const LINES: { say: string; text: string }[] = [
  { say: '设未知量', text: `解：设需要碳酸钙的质量为 x。` },
  { say: '写出化学方程式', text: 'CaCO₃ =高温= CaO + CO₂↑' },
  { say: '写出相关物质的相对质量', text: `${S.mrA}　　　${S.mrB}` },
  { say: '在相对质量下面写出已知量和未知量', text: `x　　　${L7.cao} t` },
  { say: '列比例式', text: `${S.mrA} / ${S.mrB} = x / ${L7.cao} t` },
  { say: '求解', text: `x = ${L7.cao} t × ${S.mrA} / ${S.mrB} = ${Math.round(S.x * 10) / 10} t` },
  { say: '简明地写出答案', text: `答：需要碳酸钙 ${Math.round(S.x * 10) / 10} t。` },
]
const TASKS: Task[] = [
  { id: 'set', text: '设未知量，写出化学方程式', note: '设需要碳酸钙的质量为 x；CaCO₃ =高温= CaO + CO₂↑' },
  { id: 'ratio', text: '写出相关量，列出比例式', note: `100 / 56 = x / ${L7.cao} t` },
  { id: 'solve', text: '求解，写出答案', note: `x = ${t1(S.x)}` },
  { id: 'run', text: '按算出的量投料，称一称得到的生石灰', note: `投入 ${t1(S.x)} 碳酸钙，得到 ${t1(OUT.cao)} 生石灰` },
]
const KT = KILN.base + KILN.h
const FOOT: V3 = [FOOT0.x, 2.5, FOOT0.z], HEAD: V3 = [KILN.x - 7, KT + 3, KILN.z]

/** 自卸卡车：驾驶室、底盘、车厢、六个轮子。原点在车底正中，车头朝 +x。tip：车厢绕后端铰点抬起的角度；load：车厢里还剩多少料 */
function Truck({ load, tip = 0 }: { load: number; tip?: number }) {
  const wheel = useMemo(() => { const g = new THREE.CylinderGeometry(2.4, 2.4, 1.6, 24); g.rotateX(Math.PI / 2); return g }, [])
  const wheels: [number, number][] = [[16, 1], [16, -1], [-8, 1], [-8, -1], [-14, 1], [-14, -1]]
  return <group>
    <RoundedBox args={[44, 1.6, 6]} radius={0.4} position={[0, 3.6, 0]} castShadow><meshStandardMaterial color="#26292c" roughness={0.6} metalness={0.4} /></RoundedBox>
    <RoundedBox args={[10, 10, 14.6]} radius={1} smoothness={3} position={[17, 9.4, 0]} castShadow><meshPhysicalMaterial color="#d9a224" roughness={0.4} clearcoat={0.6} /></RoundedBox>
    <mesh position={[22.1, 11.5, 0]}><boxGeometry args={[0.2, 4.4, 12]} /><meshPhysicalMaterial color="#26343e" roughness={0.1} clearcoat={1} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[18, 11.5, s * 7.33]}><boxGeometry args={[5.4, 3.8, 0.1]} /><meshPhysicalMaterial color="#26343e" roughness={0.1} clearcoat={1} /></mesh>)}
    {/* 车厢：铰点在车尾，倒料时前端抬起；举升油缸从底盘顶到车厢底 */}
    <group position={[-20, 5, 0]} rotation-z={tip}>
      <group position={[15, 4, 0]}>
        <RoundedBox args={[30, 8, 15]} radius={0.5} smoothness={3} castShadow receiveShadow><meshStandardMaterial color="#9a3a2a" roughness={0.55} metalness={0.3} /></RoundedBox>
        {[-10, 0, 10].map(x => <mesh key={x} position={[x, 0, 7.55]}><boxGeometry args={[0.6, 8, 0.2]} /><meshStandardMaterial color="#7d2e22" roughness={0.6} /></mesh>)}
        {load > 0.01 && <mesh position={[0, 4 + load * 1.2, 0]} scale={[14 * Math.max(0.4, load), 2.4 * load, 6.6]}><sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#d3cec2" roughness={1} flatShading /></mesh>}
      </group>
    </group>
    {tip > 0.02 && <mesh position={[-2, 5 + Math.sin(tip) * 9, 0]} rotation-z={-0.35}><cylinderGeometry args={[0.5, 0.5, 2 + Math.sin(tip) * 22, 12]} /><Metal kind="chrome" /></mesh>}
    {wheels.map(([x, s]) => <group key={`${x}${s}`} position={[x, 2.4, s * 6.4]}><mesh geometry={wheel} castShadow><meshStandardMaterial color="#1b1c1e" roughness={0.9} /></mesh><mesh position-z={s * 0.82} rotation-x={Math.PI / 2}><cylinderGeometry args={[1.2, 1.2, 0.1, 16]} /><Metal kind="steel" /></mesh></group>)}
  </group>
}
/** 窑身中部的煅烧带：一圈从观察孔里透出来的红光 */
function Calcine({ k }: { k: number }) {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.1, 0.3), transparent: true, toneMapped: false, depthWrite: false }), [])
  useFrame(({ clock }) => { m.opacity = k * (0.8 + 0.2 * Math.sin(clock.elapsedTime * 7)) })
  return <group position={[KILN.x, KILN.base + KILN.h * 0.42, KILN.z]}>
    {Array.from({ length: 5 }, (_, i) => { const a = -0.9 + i * 0.45; return <mesh key={i} position={[Math.sin(a) * (KILN.r + 0.05), 0, Math.cos(a) * (KILN.r + 0.05)]} rotation-y={a} material={m}><circleGeometry args={[0.7, 20]} /></mesh> })}
  </group>
}

export default function Lesson7() {
  const [lines, setLines] = useState(0)
  const [ran, setRan] = useState(false)
  const T = useTasks('gewu:mass:7', TASKS)
  const run = useRun(22, () => { setRan(true); T.check(id => id === 'run') })
  const write = () => { const n = Math.min(LINES.length, lines + 1); setLines(n); T.check(id => (id === 'set' && n >= 2) || (id === 'ratio' && n >= 5) || (id === 'solve' && n >= 7)) }
  const resetAll = () => { setLines(0); setRan(false); run.snap(0); T.reset() }
  const t = run.t, busy = run.busy

  const task = T.current
  const { hint, next }: { hint: string; next: 'write' | 'run' | null } = !task ? { hint: '根据化学方程式里的质量比，由产品的质量算出要用多少原料。', next: null }
    : lines < LINES.length ? { hint: `写下一步：${LINES[lines].say}`, next: 'write' }
    : busy ? (t < 6 ? { hint: '卡车开上汽车衡，称出石灰石…', next: null } : t < 12.5 ? { hint: '卡车把石灰石倒进卸料坑…', next: null } : t < 16.5 ? { hint: '料车沿斜桥把石灰石送上窑顶，在窑里高温煅烧…', next: null } : { hint: '生石灰从窑底落进称量斗…', next: null })
    : { hint: `按算出的 ${t1(S.x)} 投料煅烧`, next: 'run' }

  // 卡车开上汽车衡、停下称重、再开走
  const tx = !busy ? (ran ? 460 : 190) : t < 3.5 ? 190 + (SCALE.x - 190) * ease(seg(t, 0, 3.5)) : t < 6 ? SCALE.x : t < 8.5 ? SCALE.x + (PIT.x + 20 - SCALE.x) * ease(seg(t, 6, 8.5)) : t < 12 ? PIT.x + 20 : PIT.x + 20 + 190 * seg(t, 12, 15) ** 2
  const tip = busy ? 0.75 * (ease(seg(t, 8.6, 10)) - ease(seg(t, 11, 12))) : 0
  const load = !busy ? (ran ? 0 : 1) : 1 - seg(t, 9.4, 11)
  const parked = busy && t > 3.6 && t < 6.2
  const skip = busy ? ease(seg(t, 12.5, 15)) : 0
  const skipAt: V3 = [FOOT[0] + (HEAD[0] - FOOT[0]) * skip, FOOT[1] + (HEAD[1] - FOOT[1]) * skip + 1.6, FOOT[2]]
  const glow = busy ? seg(t, 14.5, 16) : ran ? 0.6 : 0
  const out = ran ? 1 : busy ? ease(seg(t, 16.5, 21)) : 0
  const scaleLed: V3 = [KIOSK.x + 10, 13.4, KIOSK.z + 1]
  const binLed: V3 = [BIN.x, 3.2, BIN.z + 4.2]
  const labels: Label[] = [
    ...(parked || ran ? [{ id: 's', at: [scaleLed[0], scaleLed[1] + 1.8, scaleLed[2]] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>石灰石（碳酸钙）</small>{t1(S.x)}</> }] : []),
    ...(out > 0.98 ? [{ id: 'b', at: [BIN.x + 4, 9, BIN.z + 3] as V3, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>生石灰（氧化钙）</small>{t1(OUT.cao)}</> }] : []),
    { id: 'n1', at: [KILN.x, KT + 8, KILN.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '石灰窑' },
    { id: 'n2', at: [SCALE.x, 0.6, SCALE.z + SCALE.d / 2 + 1], ax: 0.5, name: true, className: 'scene-name', children: '汽车衡' },
    { id: 'n5', at: [PIT.x, 0.6, PIT.z + 8], ax: 0.5, name: true, className: 'scene-name', children: '卸料坑' },
    { id: 'n3', at: [BIN.x - 4, 6, BIN.z + 3], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '出灰称量斗' },
    { id: 'n4', at: [(FOOT[0] + HEAD[0]) / 2 - 4, (FOOT[1] + HEAD[1]) / 2, FOOT[2]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '上料斜桥' },
  ]
  return (
    <LabShell title="质量守恒定律" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="煅烧石灰石制生石灰"
      stage={<Place at="l7" labels={labels}>
        <group position={[tx, 0.65, SCALE.z]}><Truck load={load} tip={tip} /></group>
        {/* 倒料：车尾落下一股石灰石和灰尘 */}
        <Puffs at={[PIT.x, 4, PIT.z]} on={busy && t > 9.3 && t < 11.2} opt={{ ...SMOKE.dark(3), color: '#cfc9bc', opacity: 0.45 }} seed={6} />
        {busy && t > 9.3 && t < 11.2 && <mesh position={[PIT.x - 1, 3.2, PIT.z]} scale={[2.2, 6, 5]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#cdc7ba" roughness={1} transparent opacity={0.85} /></mesh>}
        <Led text={parked || ran ? t1(S.x) : '0.0 t'} w={7.2} h={2.4} position={scaleLed} />
        <mesh position={[scaleLed[0], 6, scaleLed[2] - 0.3]}><cylinderGeometry args={[0.3, 0.3, 12, 12]} /><Metal kind="steel" /></mesh>
        <Led text={t1(OUT.cao * out)} w={7} h={2.4} position={binLed} />
        <mesh position={[binLed[0], 1.5, binLed[2] - 0.2]}><boxGeometry args={[0.4, 3, 0.4]} /><Metal kind="steel" /></mesh>
        {/* 料车：沿斜桥上去 */}
        <group position={skipAt} rotation-z={Math.atan2(HEAD[1] - FOOT[1], HEAD[0] - FOOT[0])}>
          <RoundedBox args={[4.6, 2.8, 3.6]} radius={0.3} castShadow><meshStandardMaterial color="#5f6a72" roughness={0.6} metalness={0.4} /></RoundedBox>
        </group>
        <Calcine k={glow} />
        <Puffs at={[KILN.x, KT + 10, KILN.z]} on={glow > 0.3} opt={{ ...SMOKE.steam(4), opacity: 0.25 }} seed={3} />
        {/* 落进称量斗的生石灰 */}
        {out > 0.02 && <mesh position={[BIN.x, 9 + out * 2.2, BIN.z]} scale={[3, 1.6 * out + 0.2, 3]}><sphereGeometry args={[1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f1efe8" roughness={1} /></mesh>}
      </Place>}
      lesson={<LessonBlock no="7" title="根据化学方程式计算" concept="按方程式里的质量比算原料和产品" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>工业上高温煅烧石灰石（主要成分碳酸钙）制取生石灰（氧化钙），同时得到二氧化碳。纯碱厂把二氧化碳送去碳化塔用。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>解题步骤：设未知量 → 写出化学方程式 → 写出相关物质的相对质量（系数 × 相对分子质量）和已知量、未知量 → 列比例式 → 求解 → 简明地写出答案</li>
            <li>已知量要带单位；设的未知量 x 不带单位</li>
            <li>只写和计算有关的物质，无关的（这里的二氧化碳）不用写相对质量</li>
          </ul>
          <p className="mt-3">这里按纯碳酸钙算。真实的石灰石含有杂质，要先换算成碳酸钙的质量。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="px-1 py-0">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">算出来、投进去、称出来都对得上</p>
          <p className="mt-1 text-[19px] leading-snug font-bold">制取 {L7.cao} t 氧化钙，需要碳酸钙 {t1(S.x)}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">按方程式里 100 : 56 的质量比算。另外的 {t1(OUT.co2)} 是生成的二氧化碳，从窑顶送去碳化塔。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-[13px] text-white/60">例：要制取 {L7.cao} t 氧化钙，需要碳酸钙多少吨？</div>
          <div className="mt-3 flex min-h-[208px] flex-col gap-1.5 font-formula text-[16px] leading-snug">
            {LINES.slice(0, lines).map((l, i) => <p key={i} className={`hint-in ${i === 2 || i === 3 ? 'pl-[5.6em]' : ''} ${i === lines - 1 ? 'text-white' : 'text-white/75'}`}>{l.text}</p>)}
            {lines === 0 && <p className="text-white/35">按“写下一步”，一行一行写</p>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-[12px] text-white/55">投入碳酸钙</div><div className="mt-0.5 text-[20px] font-bold tabular-nums">{parked || ran ? t1(S.x) : '—'}</div></div>
            <div className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-[12px] text-white/55">得到生石灰</div><div className={`mt-0.5 text-[20px] font-bold tabular-nums ${ran ? 'text-[#7fe3d4]' : ''}`}>{out > 0 ? t1(OUT.cao * out) : '—'}</div></div>
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'write'} pulse={next === 'write'} onClick={write} disabled={lines >= LINES.length}>写下一步</LabButton>
        <LabButton primary={next === 'run'} pulse={next === 'run'} onClick={() => run.run()} disabled={lines < LINES.length || busy || ran}>投料煅烧</LabButton>
      </>}
      extras={null}
    />
  )
}
