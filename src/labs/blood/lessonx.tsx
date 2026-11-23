// 血液循环 · 拓展课 量血压 · 数脉搏：给展厅里的这个人量一次血压（电子血压计，袖带缠在左上臂），把读数换成 kPa 和正常范围比；
// 再按住他左手腕上的桡动脉数 15 秒脉搏，乘以 4 得到每分钟的次数，和心率一样。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { BP_NORMAL, BP_READ, HR_X, beats, bpOk, cuffAt, kPa } from './physics'
import { ARM, MONITOR_AT, onBody } from './world'

const N = beats(HR_X, 15)
const TASKS: Task[] = [
  { id: 'bp', text: '绑好袖带，量一次血压', note: `收缩压 ${BP_READ.sys} mmHg，舒张压 ${BP_READ.dia} mmHg` },
  { id: 'kpa', text: '把读数换成 kPa，和正常范围比一比', note: `${kPa(BP_READ.sys).toFixed(1)} kPa / ${kPa(BP_READ.dia).toFixed(1)} kPa，在正常范围内` },
  { id: 'pulse', text: '按住手腕数 15 秒脉搏，算出每分钟跳几次', note: `15 秒 ${N} 次，× 4 = ${N * 4} 次/分，和心率一样` },
]
type Mode = 'bp' | 'pulse'
const pad = (s: string, n: number) => s.padStart(n, ' ')

/** 手腕上的桡动脉：前臂里那根动脉靠近手腕的一段，随着心跳一鼓一鼓的；手指按的地方套一个小圈 */
const RA0 = onBody([2.92, 10.1, 0.3]), RA1 = onBody([3.18, 9.0, 0.38])
function Radial({ on }: { on: boolean }) {
  const g = useRef<THREE.Mesh>(null)
  const { mid, len, q, ring } = useMemo(() => {
    const a = new THREE.Vector3(...RA0), b = new THREE.Vector3(...RA1), d = b.clone().sub(a)
    return { mid: a.clone().add(b).multiplyScalar(0.5), len: d.length(), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), ring: a.clone().lerp(b, 0.8) }
  }, [])
  useFrame(s => { if (!g.current) return; const ph = (s.clock.elapsedTime * HR_X / 60) % 1, k = on ? Math.exp(-ph * 9) : 0; g.current.scale.set(1 + k * 0.7, 1, 1 + k * 0.7) })
  return <group visible={on}>
    <mesh ref={g} position={mid} quaternion={q}><cylinderGeometry args={[0.045, 0.045, len, 16]} /><meshPhysicalMaterial color="#e0343f" emissive="#7a0a14" emissiveIntensity={0.8} roughness={0.3} clearcoat={0.6} /></mesh>
    <mesh position={ring} quaternion={q}><torusGeometry args={[0.13, 0.012, 8, 40]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh>
  </group>
}

export default function LessonX() {
  const [mode, setMode] = useState<Mode>('bp')
  const [done, setDone] = useState(false)
  const [unit, setUnit] = useState<'mmHg' | 'kPa'>('mmHg')
  const [count, setCount] = useState(0)
  const T = useTasks('gewu:blood:x', TASKS)
  const m = useRun(6.5, () => { setDone(true); T.check(id => id === 'bp') })
  const c = useRun(15, () => T.check(id => id === 'pulse'))
  const sec = c.k * 15
  const shown = c.k >= 1 ? N : count
  useEffect(() => { if (c.busy) setCount(beats(HR_X, sec)) }, [sec, c.busy])
  const resetAll = () => { m.snap(0); c.snap(0); setDone(false); setUnit('mmHg'); setCount(0); setMode('bp'); T.reset() }
  const task = T.current
  const want: Mode | null = task?.id === 'pulse' && mode !== 'pulse' ? 'pulse' : task && task.id !== 'pulse' && mode !== 'bp' ? 'bp' : null
  const { hint, next }: { hint: string; next: 'bp' | 'kpa' | 'count' | 'mode' | null } = !task ? { hint: '血压是血液对血管壁的侧压力；脉搏是动脉随心跳一张一缩的搏动，次数和心率一样。', next: null }
    : want ? { hint: `换到“${want === 'pulse' ? '数脉搏' : '量血压'}”`, next: 'mode' }
    : m.busy ? { hint: m.k < 0.3 ? '袖带在充气，压住上臂的动脉…' : '慢慢放气，血压计在听血管的搏动…', next: null }
    : c.busy ? { hint: `数着呢：${shown} 次…`, next: null }
    : task.id === 'bp' ? { hint: '袖带已经缠在左上臂，和心脏差不多高。按“测血压”', next: 'bp' }
    : task.id === 'kpa' ? { hint: '课本上的血压用 kPa。按“换成 kPa”', next: 'kpa' }
    : { hint: '手指按在左手腕靠拇指一侧的桡动脉上。按“开始数”，数 15 秒', next: 'count' }
  const p = cuffAt(m.k)
  const lines: [string, string, string] = m.busy ? [`SYS${pad(String(p), 5)}`, 'DIA   --', 'PUL   --'] : done ? (unit === 'kPa' ? [`SYS${pad(kPa(BP_READ.sys).toFixed(1), 5)}`, `DIA${pad(kPa(BP_READ.dia).toFixed(1), 5)}`, `PUL${pad(String(HR_X), 5)}`] : [`SYS${pad(String(BP_READ.sys), 5)}`, `DIA${pad(String(BP_READ.dia), 5)}`, `PUL${pad(String(HR_X), 5)}`]) : ['SYS  ---', 'DIA  ---', 'PUL  ---']
  const labels: Label[] = mode === 'bp' ? [
    { id: 'm', at: [MONITOR_AT[0] + 0.2, MONITOR_AT[1] + 0.9, MONITOR_AT[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: done ? <><small>{unit}</small>{unit === 'kPa' ? `${kPa(BP_READ.sys).toFixed(1)} / ${kPa(BP_READ.dia).toFixed(1)}` : `${BP_READ.sys} / ${BP_READ.dia}`}</> : <><small>袖带气压</small>{m.busy ? `${p} mmHg` : '—'}</> },
    { id: 'c', at: [ARM.a[0] + 0.9, (ARM.a[1] + ARM.b[1]) / 2 + 0.3, ARM.a[2] + 0.4], ax: 0, name: true, className: 'scene-name', children: '袖带 · 缠在左上臂' },
  ] : [
    { id: 'w', at: [RA1[0] + 0.3, RA1[1] + 0.15, RA1[2] + 0.2], ax: 0, className: `scene-tag ${c.busy ? 'key' : ''} -translate-y-1/2`, children: c.busy || c.k >= 1 ? <><small>{sec.toFixed(0)} 秒</small>{shown} 次</> : <><small>按在这里</small>桡动脉</> },
  ]
  return (
    <LabShell title="血液循环" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={mode === 'bp' ? '血压计' : '数脉搏'}
      stage={<Place at={mode === 'bp' ? 'bp' : 'wrist'} labels={labels} want={{ look: { shell: 0.9, lungs: 0.25, tree: 0.85 }, bp: { on: true, lines, busy: m.busy, squeeze: m.busy ? (m.k < 0.3 ? m.k / 0.3 : 1 - (m.k - 0.3) / 0.7) : 0 } }}>
        <Radial on={mode === 'pulse'} />
      </Place>}
      lesson={<LessonBlock no="拓展" title="量血压 · 数脉搏" concept="脉搏的次数和心率一样" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">血压</b>是流动的血液对血管壁的侧压力，一般指体循环的动脉血压，在上臂的肱动脉处测。心脏收缩时动脉血压最高，叫<b className="text-white">收缩压</b>；心脏舒张时最低，叫<b className="text-white">舒张压</b>。</p>
          <p className="mt-3">健康成年人的动脉血压一般维持在：收缩压 {BP_NORMAL.sys[0]}–{BP_NORMAL.sys[1]} kPa，舒张压 {BP_NORMAL.dia[0]}–{BP_NORMAL.dia[1]} kPa。血压计常用 mmHg，1 mmHg 约等于 0.133 kPa。</p>
          <p className="mt-3"><b className="text-white">脉搏</b>是动脉随着心脏的收缩和舒张一张一缩的搏动，在手腕的桡动脉处摸得到。正常情况下，脉搏的次数和心率相同。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">血压和脉搏都测好了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">血压 {kPa(BP_READ.sys).toFixed(1)} / {kPa(BP_READ.dia).toFixed(1)} kPa，脉搏 {N * 4} 次/分，和心率一样</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">{BP_READ.sys} mmHg = {kPa(BP_READ.sys).toFixed(1)} kPa，{BP_READ.dia} mmHg = {kPa(BP_READ.dia).toFixed(1)} kPa，都在正常范围内。15 秒数到 {N} 次，乘以 4 是 {N * 4} 次/分。</p>
          <p className="mt-2 text-[12.5px] text-white/50">这位同学的读数是示意。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {mode === 'bp' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">血压（收缩压 / 舒张压）</div>
              <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{done ? (unit === 'kPa' ? `${kPa(BP_READ.sys).toFixed(1)}/${kPa(BP_READ.dia).toFixed(1)}` : `${BP_READ.sys}/${BP_READ.dia}`) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="收缩压" value={done ? `${kPa(BP_READ.sys).toFixed(1)} kPa` : '—'} unit={`正常 ${BP_NORMAL.sys[0]}–${BP_NORMAL.sys[1]} kPa`} />
              <ParamTile symbol="舒张压" value={done ? `${kPa(BP_READ.dia).toFixed(1)} kPa` : '—'} unit={`正常 ${BP_NORMAL.dia[0]}–${BP_NORMAL.dia[1]} kPa`} />
            </div>
            {unit === 'kPa' && <p className="hint-in mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/75">{bpOk(BP_READ.sys, BP_READ.dia) ? '两个数都在正常范围内。' : '不在正常范围内。'}</p>}
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">15 秒里数到</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{c.busy || c.k >= 1 ? shown : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">次</span></div>
              <div className="mt-2 text-[14px] text-white/70">{c.k >= 1 ? `× 4 = ${N * 4} 次/分` : `已经数了 ${sec.toFixed(0)} 秒`}</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="脉搏" value={c.k >= 1 ? `${N * 4}` : '—'} unit="次/分" />
              <ParamTile symbol="心率" value={done ? `${HR_X}` : '—'} unit="次/分 · 血压计测的" />
            </div>
          </>}
        </Glass>
      }
      actions={mode === 'bp' ? <>
        <LabButton primary={next === 'bp'} pulse={next === 'bp'} onClick={() => { setUnit('mmHg'); setDone(false); m.run() }} disabled={m.busy}>测血压</LabButton>
        <LabButton primary={next === 'kpa'} pulse={next === 'kpa'} onClick={() => { setUnit('kPa'); T.check(id => id === 'kpa') }} disabled={!done || unit === 'kPa' || m.busy}>换成 kPa</LabButton>
      </> : <>
        <LabButton primary={next === 'count'} pulse={next === 'count'} onClick={() => { setCount(0); c.run() }} disabled={c.busy}>开始数</LabButton>
      </>}
      extras={
        <Control label="做哪一个">
          <Segmented label="做哪一个" pulse={next === 'mode'} want={want} disabled={m.busy || c.busy} value={mode} onChange={k => setMode(k as Mode)} options={[{ value: 'bp' as Mode, label: '量血压' }, { value: 'pulse' as Mode, label: '数脉搏' }]} />
        </Control>
      }
    />
  )
}
