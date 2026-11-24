// 呼吸 · 拓展：测胸围差、海姆立克急救。软尺绕在胸腔模型的胸前，尽力吸气、尽力呼气各量一次，量三次算平均；
// 再看气管被异物堵住时，从腹部向上冲击怎样把膈往上推、肺内气压升高，把异物冲出去。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { LOOK, Place, useRun } from './parts'
import { GIRTH, LUNG, THRUST_DV, girthAvg, girthDiff, thrust } from './physics'
import { breathLive } from './chest'
import { Sweep } from './sweep'

type Part = 'girth' | 'heim'
const TASKS: Task[] = [
  { id: 'girth', text: '尽力吸气、尽力呼气各量一次胸围，量三次', note: '每次吸气后的胸围都比呼气后大' },
  { id: 'avg', text: '算胸围差的平均值', note: `三次的胸围差取平均：${girthAvg()} cm` },
  { id: 'push', text: '换到海姆立克急救，向上冲击腹部', note: '膈被推上去，胸腔变小，肺内气压升高，把异物冲出气管' },
]
const PART_NAME: Record<Part, string> = { girth: '测胸围差', heim: '海姆立克急救' }

/** 绕在胸前的软尺：一圈扁带，跟着胸廓的大小变 */
function Tape() {
  const sw = useMemo(() => new Sweep(97, 4), [])
  const pts = useMemo(() => Array.from({ length: 97 }, () => new THREE.Vector3()), [])
  useFrame(() => {
    const k = Math.max(0, breathLive.rib), rx = 1.6 * (1 + 0.05 * k), rz = 1.0 * (1 + 0.06 * k)
    for (let i = 0; i < 97; i++) { const a = i / 96 * Math.PI * 2; pts[i].set(Math.sin(a) * rx, 13.0, -0.04 + Math.cos(a) * rz) }
    sw.update(pts, () => 0.09, () => 0.008, p => new THREE.Vector3(p.x, 0, p.z + 0.04))
  })
  return <mesh geometry={sw.geo} renderOrder={9}><meshPhysicalMaterial color="#f0d24a" roughness={0.45} clearcoat={0.4} /></mesh>
}
/** 卡在气管里的异物（一粒花生），u 从 0（卡着）到 1（被冲出口外） */
const OUT = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 14.5, -0.24), new THREE.Vector3(0, 15.4, -0.22), new THREE.Vector3(0, 16.05, 0.3), new THREE.Vector3(0, 16.1, 1.3), new THREE.Vector3(0, 15.6, 2.4)])
function Peanut({ u }: { u: number }) {
  const p = OUT.getPointAt(Math.min(1, Math.max(0, u)))
  return <mesh position={p} scale={[0.07, 0.1, 0.07]} renderOrder={11}><sphereGeometry args={[1, 18, 12]} /><meshPhysicalMaterial color="#c08a4a" roughness={0.6} clearcoat={0.3} depthTest={false} /></mesh>
}

export default function LessonX() {
  const [part, setPart] = useState<Part>('girth')
  const [rows, setRows] = useState<[number, number][]>([])
  const [avg, setAvg] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle')
  const T = useTasks('gewu:breath:x', TASKS)
  const rowsRef = useRef(rows); rowsRef.current = rows
  const out = useRun(1.6, () => {
    const i = rowsRef.current.length, next = [...rowsRef.current, GIRTH[i]]; setRows(next); setPhase('idle')
    if (next.length >= GIRTH.length) T.check(id => id === 'girth')
  })
  const inn = useRun(1.6, () => { setPhase('out'); setTimeout(() => out.run(0), 700) })
  const measure = () => { if (rows.length >= GIRTH.length) return; setPhase('in'); inn.run(1, 0); out.snap(1) }
  const push = useRun(1.0, () => setTimeout(() => T.check(id => id === 'push'), 1200))
  const resetAll = () => { inn.snap(0); out.snap(0); push.snap(0); setRows([]); setAvg(false); setPhase('idle'); setPart('girth'); T.reset() }
  const task = T.current
  const busy = inn.busy || out.busy || phase !== 'idle'
  const rib = phase === 'in' ? inn.k : phase === 'out' ? out.k : 0
  // 冲击：前 0.25 把膈猛地往上推，然后放松；异物在推到顶时被冲出去
  const pk = push.k, shove = pk < 0.25 ? pk / 0.25 : Math.max(0, 1 - (pk - 0.25) / 0.5)
  const flew = Math.max(0, Math.min(1, (pk - 0.15) / 0.6))
  const rise = pk > 0 && pk < 0.75 ? thrust(THRUST_DV * shove) : 0
  const want: Part | null = task?.id === 'push' && part !== 'heim' ? 'heim' : (task?.id === 'girth' || task?.id === 'avg') && part !== 'girth' ? 'girth' : null
  const { hint, next }: { hint: string; next: 'measure' | 'avg' | 'push' | 'part' | null } = !task ? { hint: '胸围差越大，说明呼吸时胸廓的变化越大；海姆立克急救用的是“胸腔变小，肺内气压升高”。', next: null }
    : want ? { hint: `把上面换成“${PART_NAME[want]}”`, next: 'part' }
    : busy ? { hint: phase === 'in' ? '尽力吸气，量一次…' : '尽力呼气，再量一次…', next: null }
    : push.busy ? { hint: '向上冲击！', next: null }
    : task.id === 'girth' ? { hint: rows.length ? `量了 ${rows.length} 次。再按“量一次”` : '软尺绕在胸前。按“量一次”：先尽力吸气量，再尽力呼气量', next: 'measure' }
    : task.id === 'avg' ? { hint: '三次都量完了。按“算平均”', next: 'avg' }
    : { hint: '一粒花生卡在了气管里，人说不出话、喘不上气。按“向上冲击腹部”', next: 'push' }
  const labels: Label[] = part === 'girth' ? [
    { id: 'tape', at: [1.7, 13.0, 0.4], ax: 0, className: `scene-tag ${busy ? 'key' : ''} -translate-y-1/2`, children: <><small>胸围</small>{phase === 'in' && inn.k > 0.99 ? `${GIRTH[rows.length][0].toFixed(1)} cm` : phase === 'out' && out.k < 0.01 ? `${GIRTH[rows.length]?.[1].toFixed(1)} cm` : rows.length ? `${rows[rows.length - 1][1].toFixed(1)} cm` : '软尺'}</> },
  ] : [
    { id: 'pea', at: flew > 0.9 ? [0.2, 15.7, 2.4] : [0.25, 14.55, -0.2], ax: 0, className: `scene-tag ${flew > 0.9 ? 'key' : ''} -translate-y-1/2`, children: flew > 0.9 ? '异物冲出来了' : '异物堵住气管' },
    { id: 'pr', at: [-1.6, 13.3, 0.4], ax: 1, className: `scene-tag ${rise > 0.5 ? 'key' : ''} -translate-y-1/2`, children: <><small>肺内气压</small>{rise > 0 ? `升高 ${rise.toFixed(1)} kPa` : pk > 0.99 ? `最高升高了 ${thrust(THRUST_DV).toFixed(1)} kPa` : '和平时一样'}</> },
    { id: 'ab', at: [0.3, 10.7, 1.4], ax: 0, className: 'scene-name -translate-y-1/2', name: true, children: '肚脐稍上方' },
  ]
  return (
    <LabShell title="呼吸" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={PART_NAME[part]}
      stage={<Place at={part === 'heim' ? 'heim' : 'front'} labels={labels} want={{ rib, dia: part === 'heim' ? -0.9 * shove : rib, look: { ...LOOK, lungs: 0.8 } }}>
        {part === 'girth' && <Tape />}
        {part === 'heim' && <Peanut u={flew} />}
        {part === 'heim' && push.busy && pk < 0.3 && <ForceArrow tip={[0, 11.1, 0.95]} dir={[0, 0.8, -0.6]} len={0.7} color="#ffe9a8" thick={1.3} />}
      </Place>}
      lesson={<LessonBlock no="拓展" title="胸围差 · 海姆立克" concept="胸廓变小，肺内气压就升高" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">胸围差</b>：尽力吸气结束时的胸围减去尽力呼气结束时的胸围。量三次，取平均值。经常锻炼的人胸围差一般比较大。</p>
          <p className="mt-3"><b className="text-white">海姆立克急救</b>：异物堵住气管时，救助者从背后抱住患者，一手握拳顶在肚脐稍上方，另一手抓住拳头，快速向内向上冲击。腹部受压把膈往上推，胸腔变小，肺里的气体出不去，气压骤然升高，就把异物冲出来。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里只讲原理。三次测量的数据、气压升高多少都是示意；急救的动作要按专业培训的要求学。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">胸围差量了，急救的原理也看了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">胸廓变大，肺内气压降低；胸廓变小，肺内气压升高</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">这位同学的胸围差平均 {girthAvg()} cm。气道堵住时，肺里 {LUNG.rest} L 气体被压小 {THRUST_DV} L，气压就升高约 {thrust(THRUST_DV)} kPa。</p>
          <p className="mt-2 text-[12.5px] text-white/50">数据是示意。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {part === 'girth' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">胸围差的平均值</div>
              <div className="mt-1 text-[44px] leading-none font-bold tabular-nums">{avg ? girthAvg() : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">cm</span></div>
            </div>
            <table className="mt-4 w-full text-center text-[13px] tabular-nums">
              <thead><tr className="text-white/55"><th className="pb-1 font-medium">次</th><th className="pb-1 font-medium">吸气后</th><th className="pb-1 font-medium">呼气后</th><th className="pb-1 font-medium">差</th></tr></thead>
              <tbody>{GIRTH.map((_, i) => { const r = rows[i]; return <tr key={i} className={r ? 'row-in bg-white/10' : 'bg-white/[0.04]'}><td className="rounded-l-lg py-1.5">{i + 1}</td><td>{r ? r[0].toFixed(1) : '—'}</td><td>{r ? r[1].toFixed(1) : '—'}</td><td className="rounded-r-lg font-semibold">{r ? girthDiff(i).toFixed(1) : '—'}</td></tr> })}</tbody>
            </table>
            <p className="mt-2 text-[12.5px] text-white/50">单位 cm，一位同学的示意数据</p>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">{pk > 0.99 ? '刚才肺内气压最高升高了' : '肺内气压比平时高'}</div>
              <div className="mt-1 text-[44px] leading-none font-bold tabular-nums">{pk > 0.99 ? thrust(THRUST_DV).toFixed(1) : rise > 0 ? rise.toFixed(1) : '0.0'}<span className="ml-1 text-[15px] font-medium text-white/55">kPa</span></div>
            </div>
            <p className="mt-4 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/70">气管堵住了，肺里的 {LUNG.rest} L 气出不去。腹部受到冲击，膈往上顶，肺被压小 {THRUST_DV} L，气压就升高约 {thrust(THRUST_DV)} kPa，像拔开瓶塞一样把异物冲出来。</p>
          </>}
        </Glass>
      }
      actions={part === 'girth' ? <>
        <LabButton primary={next === 'measure'} pulse={next === 'measure'} onClick={measure} disabled={busy || rows.length >= GIRTH.length}>量一次</LabButton>
        <LabButton primary={next === 'avg'} pulse={next === 'avg'} onClick={() => { setAvg(true); T.check(id => id === 'avg') }} disabled={rows.length < GIRTH.length || avg}>算平均</LabButton>
      </> : <>
        <LabButton primary={next === 'push'} pulse={next === 'push'} onClick={() => push.run(1, 0)} disabled={push.busy || push.k > 0.99}>向上冲击腹部</LabButton>
      </>}
      extras={
        <Control label="拓展">
          <Segmented label="拓展" pulse={next === 'part'} want={want} value={part} onChange={k => setPart(k as Part)} options={(['girth', 'heim'] as Part[]).map(k => ({ value: k, label: PART_NAME[k] }))} />
        </Control>
      }
    />
  )
}
