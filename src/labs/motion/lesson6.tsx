// 机械运动 · 第 6 课 测一次平均速度（小车从斜面上滑下，分段量路程和时间）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Led, useSlide, useTasks, type Label } from '@/lab-kit'
import At from './at'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { PARTS, RAMP as R, part, rampTime, type PartKey } from './physics'
import { RAMP } from './world'

const KEYS = Object.keys(PARTS) as PartKey[], K = 4, TILT = 0.2     // 画面里把斜面放大 4 倍；倾角是示意
const TASKS: Task[] = [
  { id: 'whole', text: '量全程：放开小车，记下路程和时间', note: `${part('whole').s.toFixed(2)} m ÷ ${part('whole').t.toFixed(2)} s = ${part('whole').v.toFixed(2)} m/s` },
  { id: 'upper', text: '把挡板移到中点，量上半段', note: `${part('upper').s.toFixed(2)} m ÷ ${part('upper').t.toFixed(2)} s ≈ ${part('upper').v.toFixed(2)} m/s` },
  { id: 'lower', text: '算出下半段的平均速度', note: `路程、时间都用全程减去上半段：${part('lower').s.toFixed(2)} m ÷ ${part('lower').t.toFixed(2)} s ≈ ${part('lower').v.toFixed(2)} m/s，比上半段快` },
]

export default function Lesson6() {
  const [which, setWhich] = useState<PartKey>('whole')
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<PartKey[]>([])
  const T = useTasks('gewu:motion:6', TASKS)
  const stop = which === 'upper' ? R.s / 2 : R.s, tEnd = rampTime(stop)
  const t = useSlide(goal, 1.2), moving = Math.abs(t - goal) > 0.01, done = goal > 0 && !moving
  const s = Math.min(stop, R.s * (t / R.t) ** 2), dup = rows.includes(which), p = part(which)
  const canLower = rows.includes('whole') && rows.includes('upper'), ready = which === 'lower' ? canLower : done
  const pick = (k: PartKey) => { if (moving) return; setWhich(k); setGoal(0) }
  const record = () => { if (!ready || dup) return; const next = [...rows, which]; setRows(next); T.check(id => next.includes(id as PartKey)) }
  const resetAll = () => { setWhich('whole'); setGoal(0); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'which' | 'go' | 'record' | null } = !task ? { hint: '三段都有了。小车越滑越快，下半段比上半段快。', next: null }
    : moving ? { hint: '小车在滑：撞到挡板的一瞬间停表', next: null }
    : which !== task.id ? { hint: `换到“${PARTS[task.id as PartKey].name}”`, next: 'which' }
    : which === 'lower' ? { hint: '下半段不用再放小车：用全程减去上半段，按“记录”', next: 'record' }
    : done && !dup ? { hint: `路程 ${p.s.toFixed(2)} m，时间 ${p.t.toFixed(2)} s：按“记录”`, next: 'record' } : { hint: '按“放开小车”', next: 'go' }
  const at = (d: number, up = 0): [number, number, number] => [RAMP[0] - 1.8 + d * K * Math.cos(TILT), RAMP[1] + 1.0 - d * K * Math.sin(TILT) + up, RAMP[2]]
  const labels: Label[] = [
    { id: 's', at: at(s, 0.75), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>{Math.min(t, tEnd).toFixed(2)} s</small>{s.toFixed(2)} m</> },
    { id: 'a', at: at(0, 0.5), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '起点' },
    { id: 'b', at: at(stop, 0.6), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: which === 'upper' ? '挡板（中点）' : '挡板（终点）' },
  ]

  return (
    <LabShell title="机械运动" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="小车"
      stage={<At at="ramp" labels={labels}>
        <group position={[RAMP[0] - 1.8, RAMP[1] + 1.0, RAMP[2]]} rotation-z={-TILT}>
          <mesh position={[R.s * K / 2, -0.08, 0]} castShadow><boxGeometry args={[R.s * K + 0.3, 0.1, 0.7]} /><meshStandardMaterial color="#b98650" roughness={0.8} /></mesh>
          {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[i * R.s * K / 9, -0.025, 0.3]}><boxGeometry args={[0.012, 0.012, 0.1]} /><meshBasicMaterial color="#30343a" /></mesh>)}
          <group position={[s * K, 0.1, 0]}>
            <mesh castShadow><boxGeometry args={[0.36, 0.16, 0.4]} /><meshStandardMaterial color="#2f7fb8" roughness={0.5} /></mesh>
            {[-0.11, 0.11].map(x => <mesh key={x} position={[x, -0.08, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.06, 0.06, 0.46, 14]} /><meshStandardMaterial color="#20262b" /></mesh>)}
          </group>
          <mesh position={[stop * K + 0.22, 0.14, 0]}><boxGeometry args={[0.04, 0.34, 0.7]} /><meshStandardMaterial color="#c9ced2" metalness={0.7} roughness={0.3} /></mesh>
        </group>
        <mesh position={[RAMP[0] - 1.9, RAMP[1] + 0.5, RAMP[2]]}><boxGeometry args={[0.16, 1.0, 0.6]} /><meshStandardMaterial color="#6d767b" /></mesh>
        <Led text={Math.min(t, tEnd).toFixed(2)} w={0.7} h={0.26} position={[RAMP[0] + 1.6, RAMP[1] + 1.7, RAMP[2]]} />
      </At>}
      lesson={<LessonBlock no="6" title="测一次平均速度" concept="量出路程和时间，再用 v = s/t" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>测平均速度的办法：用刻度尺量出路程 s，用停表测出时间 t，再用 <b className="text-white">v = s/t</b> 算出来。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">斜面要缓一点：</b>太陡了小车滑得太快，时间不好测</li>
            <li><b className="text-[#7fe3d4]">下半段不能单独放：</b>从中点由静止放开的小车，和滑到中点时已经有速度的小车不一样。要用全程减去上半段</li>
            <li><b className="text-[#7fe3d4]">平均速度不是速度的平均：</b>全程的平均速度不等于上下两段平均速度相加除以二</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">斜面全长 {R.s} m、全程用 {R.t.toFixed(1)} s 是为了好算取的数；画面里把斜面放大了。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三段的平均速度都有了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">上半段 {part('upper').v.toFixed(2)} m/s，下半段 {part('lower').v.toFixed(2)} m/s</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">小车越滑越快，这是变速直线运动。全程的平均速度是 {part('whole').v.toFixed(2)} m/s。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">v = s / t</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{ready || dup ? p.v.toFixed(2) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m/s</span></div>
            <div className="mt-1 text-[12.5px] text-white/50">{PARTS[which].name}的平均速度</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="s" value={ready || dup ? p.s.toFixed(2) : '—'} unit="m · 这一段的路程" />
            <ParamTile symbol="t" value={ready || dup ? p.t.toFixed(2) : '—'} unit="s · 这一段的时间" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">先量全程和上半段，下半段是算出来的。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">哪一段</th><th className="text-right font-normal">s / m</th><th className="text-right font-normal">t / s</th><th className="text-right font-normal">v / (m/s)</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{PARTS[k].name}</td><td className="text-right tabular-nums">{part(k).s.toFixed(2)}</td><td className="text-right tabular-nums">{part(k).t.toFixed(2)}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{part(k).v.toFixed(2)}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'go'} onClick={() => setGoal(tEnd)} disabled={moving || goal > 0 || which === 'lower'}>放开小车</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!ready || dup}>记录</LabButton>
      </>}
      extras={<Control label="量哪一段"><Segmented label="量哪一段" pulse={next === 'which'} want={next === 'which' ? task!.id as PartKey : null} value={which} disabled={moving} onChange={pick} options={KEYS.map(k => ({ value: k, label: PARTS[k].name }))} /></Control>}
    />
  )
}
