// 概率 · 第 2 课 掷骰子：培训桌上一只绒布骰子盘、一排摆出 1 到 6 点的骰子（全部可能的结果）、一把 0 到 1 的概率尺。
// 先掷一次，再数每个事件包含几种结果：P(A) = m/n。数完在概率尺上插一面小旗，看出 0 ≤ P(A) ≤ 1，必然事件是 1，不可能事件是 0。
import { useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Die, FELT_Y, FeltTray, Flag, Glove, Place, RollingDie, ease, useRun, type V3 } from './parts'
import { DIE_EV, FACES, dieProb, roll2, type DieEv } from './physics'
import { makeWood } from './mats'
import { ST, TABLE_H } from './world'

const KEYS = Object.keys(DIE_EV) as DieEv[]
const X = ST.l2.x, Z = ST.l2.z, S = 0.04
const TRAY: V3 = [X - 0.24, TABLE_H, Z - 0.01]
const ROW = (v: number): V3 => [X - 0.04 + (v - 1) * 0.062, TABLE_H + S / 2, Z - 0.07]
/** 概率尺：0 在左，1 在右，长 0.5 m */
const R0 = X - 0.06, RL = 0.36, RZ = Z + 0.06
const COLOR: Record<DieEv, string> = { six: '#4b8df8', even: '#f5a524', lt7: '#2fbf71', seven: '#e5484d' }
const TASKS: Task[] = [
  { id: 'roll', text: '掷一次骰子，看出几点', note: '掷之前不知道会出几点：每一面朝上的可能性相等' },
  ...KEYS.map(k => { const p = dieProb(k); return { id: k, text: `数一数“${DIE_EV[k].name}”`, note: `${p.m} 种结果，P = ${p.text}${k === 'lt7' ? '：必然事件的概率是 1' : k === 'seven' ? '：不可能事件的概率是 0' : ''}` } }),
]

export default function Lesson2() {
  const [ev, setEv] = useState<DieEv>('six')
  const [rolled, setRolled] = useState(false)
  const [marked, setMarked] = useState<DieEv[]>([])
  const T = useTasks('gewu:chance:2', TASKS)
  const roll = useRun(1.4, () => { setRolled(true); T.check(id => id === 'roll') })
  const cnt = useRun(1.8, () => { const n = [...marked, ev]; setMarked(n); T.check(id => n.includes(id as DieEv)) })
  const busy = roll.busy || cnt.busy
  const pick = (k: DieEv) => { if (!busy) { setEv(k); cnt.snap(0) } }
  const resetAll = () => { setEv('six'); setRolled(false); setMarked([]); roll.snap(0); cnt.snap(0); T.reset() }
  const p = dieProb(ev), done = marked.includes(ev)

  const task = T.current
  const { hint, next }: { hint: string; next: 'roll' | 'count' | 'ev' | null } = (() => {
    if (!task) return { hint: '四个事件都标好了：概率在 0 到 1 之间，必然事件是 1，不可能事件是 0。', next: null }
    if (roll.busy) return { hint: '骰子滚出去了…', next: null }
    if (cnt.busy) return { hint: '一面一面地数…', next: null }
    if (task.id === 'roll') return { hint: '掷一次骰子：掷之前，你能确定出几点吗？', next: 'roll' }
    if (ev !== task.id) return { hint: `换成事件“${DIE_EV[task.id as DieEv].name}”`, next: 'ev' }
    return { hint: `六种结果里，“${DIE_EV[ev].name}”占几种？数一数`, next: 'count' }
  })()

  // 数的时候，符合的那几面一个一个亮起来
  const lit = (v: number) => (done || cnt.busy) && DIE_EV[ev].faces.includes(v) && (done || cnt.k * 1.4 > DIE_EV[ev].faces.indexOf(v) / Math.max(1, DIE_EV[ev].faces.length) + 0.05)
  const rx = (pp: number) => R0 + pp * RL
  const face = roll2()
  const labels: Label[] = [
    { id: 'r0', at: [rx(0), TABLE_H + 0.012, RZ + 0.05], ax: 0.5, className: 'scene-tag', children: '0' },
    { id: 'r5', at: [rx(0.5), TABLE_H + 0.012, RZ + 0.05], ax: 0.5, className: 'scene-tag', children: '1/2' },
    { id: 'r1', at: [rx(1), TABLE_H + 0.012, RZ + 0.05], ax: 0.5, className: 'scene-tag', children: '1' },
    { id: 'pf', at: [rx(p.p), TABLE_H + 0.13, RZ], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: done || cnt.k > 0.8 ? 1 : 0, background: COLOR[ev] }, children: <><small>P</small>{p.text}</> },
    { id: 'got', at: [TRAY[0], TABLE_H + 0.1, TRAY[2]], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: rolled ? 1 : 0 }, children: <><small>掷出</small>{face} 点</> },
    { id: 'n1', at: [X + 0.12, TABLE_H + 0.06, Z - 0.09], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '六种可能的结果' },
    { id: 'n2', at: [rx(0.5), TABLE_H + 0.005, RZ + 0.1], ax: 0.5, name: true, className: 'scene-name', children: '概率尺' },
  ]
  return (
    <LabShell title="概率" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="骰子"
      stage={<Place at="l2" labels={labels}>
        <FeltTray at={TRAY} r={0.13} />
        {/* 掷出去的骰子：没掷之前捏在手里 */}
        <RollingDie k={rolled ? 1 : roll.k} from={[TRAY[0] + 0.03, TABLE_H + S / 2, TRAY[2] + 0.17]} to={[TRAY[0], TABLE_H + FELT_Y + S / 2, TRAY[2]]} face={face} yaw={0.4} size={S} />
        {roll.busy && roll.k < 0.25 && <group position={[TRAY[0] + 0.03 - roll.k * 0.1, TABLE_H + S + 0.01 + roll.k * 0.3, TRAY[2] + 0.06]} rotation={[0, Math.PI - 0.4, 0]}><Glove pinch={0.6} arm={0.3} /></group>}
        {/* 一排六枚骰子，摆出 1 到 6 点 */}
        {FACES.map(v => <group key={v} position={ROW(v)} rotation-y={0} >
          <group rotation={[0, 0, 0]}><Placed v={v} glow={lit(v)} /></group>
        </group>)}
        <Ruler />
        {marked.map(k => <Flag key={k} at={[rx(dieProb(k).p), TABLE_H + 0.012, RZ - 0.012 - KEYS.indexOf(k) * 0.004]} color={COLOR[k]} h={0.08 + KEYS.indexOf(k) * 0.012} />)}
        {cnt.busy && cnt.k > 0.6 && <Flag at={[rx(p.p), TABLE_H + 0.012 + (1 - ease((cnt.k - 0.6) / 0.4)) * 0.05, RZ - 0.012]} color={COLOR[ev]} h={0.08 + KEYS.indexOf(ev) * 0.012} />}
      </Place>}
      lesson={<LessonBlock no="2" title="掷骰子" concept="P(A) = m/n，在 0 和 1 之间" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>表示一个随机事件发生的可能性大小的数，叫这个事件的<b className="text-white">概率</b>，记作 P(A)。</p>
          <p className="mt-3">一次试验中，可能出现的结果有 n 种，而且每种结果出现的可能性相等；事件 A 包含其中 m 种结果，那么 P(A) = m/n。</p>
          <p className="mt-3">0 ≤ m ≤ n，所以 0 ≤ P(A) ≤ 1。必然事件的概率是 1，不可能事件的概率是 0。概率越接近 1，事件发生的可能性越大。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">P(点数为 6) = 1/6，P(偶数) = 1/2，P(小于 7) = 1，P(点数为 7) = 0</p>
        <p className="mt-1 text-[14px] text-white/70">每种结果可能性相等时 P(A) = m/n；概率都在 0 到 1 之间。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">P（{DIE_EV[ev].name}）</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{done ? p.text : '?'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="m" value={done ? String(p.m) : '—'} unit="种 · 事件包含的结果" />
            <ParamTile symbol="n" value="6" unit="种 · 全部可能的结果" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">数过的事件</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <tbody>{KEYS.map(k => { const on = marked.includes(k), q = dieProb(k); return <tr key={k} className={on ? 'text-white' : 'text-white/30'}>
              <td className="py-1"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: COLOR[k] }} />{DIE_EV[k].name}</td>
              <td className="text-right">{on ? (q.m ? DIE_EV[k].faces.join('、') : '没有') : '—'}</td>
              <td className="pl-3 text-right">{on ? q.text : ''}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'roll'} onClick={() => { if (!busy && !rolled) roll.run() }} disabled={busy || rolled}>掷一次</LabButton>
        <LabButton primary pulse={next === 'count'} onClick={() => { if (!busy && !done) cnt.run() }} disabled={busy || !rolled || done}>数一数</LabButton>
      </>}
      extras={<Control label="事件"><Segmented label="事件" pulse={next === 'ev'} want={next === 'ev' ? task!.id as DieEv : null} disabled={busy} value={ev} onChange={pick} options={KEYS.map(k => ({ value: k, label: DIE_EV[k].name }))} /></Control>}
    />
  )
}

/** 摆在桌上、第 v 面朝上的骰子 */
function Placed({ v, glow }: { v: number; glow: boolean }) {
  const r: Record<number, V3> = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] }
  return <group rotation={r[v]}><Die size={S} glow={glow} /></group>
}

/** 概率尺：一条 0.5 m 长的木尺，0、1/2、1 处刻长线，每 1/6 一道短线，每 1/10 一道细线 */
function Ruler() {
  const wood = makeWood()
  return <group>
    <RoundedBox args={[RL + 0.06, 0.012, 0.05]} radius={0.003} position={[R0 + RL / 2, TABLE_H + 0.006, RZ]} castShadow receiveShadow><meshStandardMaterial map={wood} color="#f1dfbf" roughness={0.55} /></RoundedBox>
    {Array.from({ length: 11 }, (_, i) => <mesh key={`d${i}`} position={[R0 + i / 10 * RL, TABLE_H + 0.0125, RZ - 0.017]}><boxGeometry args={[0.0012, 0.001, i % 5 === 0 ? 0.03 : 0.012]} /><meshBasicMaterial color="#3a2a18" /></mesh>)}
    {Array.from({ length: 7 }, (_, i) => <mesh key={`s${i}`} position={[R0 + i / 6 * RL, TABLE_H + 0.0126, RZ + 0.014]}><boxGeometry args={[0.0016, 0.001, 0.016]} /><meshBasicMaterial color="#b3261e" /></mesh>)}
  </group>
}
