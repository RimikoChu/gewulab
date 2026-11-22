// 质量与密度 · 第 3 课 用量筒测体积（量筒的读数：视线与凹液面最低处相平；排水法测不规则固体的体积）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { BEAKER_H, BEAKER_R, Beaker, CYL_IN, CYL_R, Cylinder, ML, RIM, levelY } from './glass'
import { LESSONS, goLesson } from './lessons'
import { Carry, Eye, Line, Room, STONE_H, Stone, usePhase, useSettled, type V3 } from './parts'
import { CYL, SIGHT, STONE, displaced, sightReading, stoneV2 } from './physics'
import { CylView } from './views'
import { ST, TOP } from './world'

type Look = 'down' | 'level' | 'up'
const DEG: Record<Look, number> = { down: SIGHT, level: 0, up: -SIGHT }, NAME: Record<Look, string> = { down: '俯视', level: '平视', up: '仰视' }
const V1 = STONE.v1, V2 = stoneV2()
const TASKS: Task[] = [
  { id: 'pour', text: '往量筒里倒水', note: `倒了 ${V1} mL。这只量筒的量程是 ${CYL.max} mL，分度值是 ${CYL.step} mL` },
  { id: 'look', text: '换成俯视、仰视各看一次，读数变了吗', note: `俯视读成约 ${sightReading(V1, SIGHT).toFixed(0)} mL（偏大），仰视读成约 ${sightReading(V1, -SIGHT).toFixed(0)} mL（偏小）` },
  { id: 'v1', text: '视线和凹液面的最低处相平，记下 V₁', note: `V₁ = ${V1} mL` },
  { id: 'v2', text: '把石块浸没在水里，再读一次，记下 V₂', note: `V₂ = ${V2} mL，石块的体积 V = V₂ − V₁ = ${displaced(V1, V2)} cm³` },
]
const X = ST.s3, CYL_AT: V3 = [X, TOP, 0.3], CUP_AT: V3 = [X + 0.98, TOP, 0.62], ROCK_AT: V3 = [X - 0.95, TOP, 0.72]
const TIP: V3 = [CYL_AT[0] + BEAKER_R + 0.03, TOP + RIM + 0.07 - BEAKER_H, CYL_AT[2]]
const CUP_ML = 150

export default function Lesson3() {
  const [poured, setPoured] = useState(false)
  const [look, setLook] = useState<Look>('level')
  const [seen, setSeen] = useState<Look[]>([])
  const [sunk, setSunk] = useState(false)
  const [rows, setRows] = useState<('v1' | 'v2')[]>([])
  const [warn, setWarn] = useState<string | null>(null)
  const T = useTasks('gewu:density:3', TASKS)
  const P = usePhase([1500, 2100, 1500])
  useEffect(() => { if (!warn) return; const t = setTimeout(() => setWarn(null), 2800); return () => clearTimeout(t) }, [warn])
  const inWater = useSettled(`${sunk}`, 1500) && sunk
  const V = useSlide((poured && P.ph !== 1 ? V1 : 0) + (inWater ? STONE.v : 0), 20)
  const ready = poured && P.ph === 0, steady = ready && (V === V1 || V === V2) && (sunk ? inWater : true)
  useEffect(() => { if (ready) T.check(id => id === 'pour') })
  const pour = () => { if (poured) return; setPoured(true); P.run() }
  const pick = (k: Look) => { setLook(k); if (ready && !seen.includes(k)) { const next = [...seen, k]; setSeen(next); T.check(id => id === 'look' && next.includes('down') && next.includes('up')) } }
  const sink = () => { if (!ready || sunk) return; if (!rows.includes('v1')) { setWarn('先把没放石块时的读数 V₁ 记下来'); return } setSunk(true) }
  const key = sunk ? 'v2' : 'v1', dup = rows.includes(key)
  const record = () => {
    if (!steady || dup) return
    if (look !== 'level') { setWarn(`${NAME[look]}读出来${look === 'down' ? '偏大' : '偏小'}。视线要和凹液面的最低处相平`); return }
    const next = [...rows, key] as ('v1' | 'v2')[]; setRows(next); T.check(id => next.includes(id as 'v1'))
  }
  const resetAll = () => { P.cancel(); setPoured(false); setLook('level'); setSeen([]); setSunk(false); setRows([]); setWarn(null); T.reset() }
  const task = T.current
  const want: Look | null = !task || !ready ? null : task.id === 'look' ? (!seen.includes('down') ? 'down' : 'up') : look !== 'level' && (task.id === 'v1' || (task.id === 'v2' && sunk)) ? 'level' : null
  const { hint, next }: { hint: string; next: 'pour' | 'look' | 'sink' | 'record' | null } = warn ? { hint: warn, next: null }
    : !task ? { hint: `石块的体积是 ${displaced(V1, V2)} cm³：两次读数的差。`, next: null }
    : !poured ? { hint: '量筒放在水平的台面上。按“倒入水”', next: 'pour' }
    : !ready ? { hint: '烧杯里的水顺着杯嘴倒进量筒…', next: null }
    : want ? { hint: task.id === 'look' ? `水面中间低、四周高，是凹的。把视线换成“${NAME[want]}”，看读数怎么变` : '读数时视线要和凹液面的最低处相平：换成“平视”', next: 'look' }
    : task.id === 'v1' ? { hint: `平视：凹液面最低处对着 ${V1} mL。按“记录”`, next: 'record' }
    : !sunk ? { hint: '石块形状不规则，量不出长宽高。按“放入石块”，让它浸没在水里', next: 'sink' }
    : !steady ? { hint: '石块沉下去，水面升上来…', next: null }
    : { hint: `水面升到了 ${V2} mL。按“记录”`, next: 'record' }
  const read = sightReading(V, DEG[look]), yL = TOP + levelY(V)
  // 视线：对准凹液面的最低处；斜多少由读数偏了多少定
  const slope = (read - V) * ML / CYL_R, eye: V3 = [CYL_AT[0] - 1.0, yL + slope * 1.0, CYL_AT[2]]
  const labels: Label[] = [
    { id: 'v', at: [CYL_AT[0] + 0.2, yL, CYL_AT[2]], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: steady ? 1 : 0 }, children: <><small>{NAME[look]}读数</small>{look === 'level' ? '' : '约 '}{read.toFixed(0)} mL</> },
    { id: 'e', at: [eye[0], eye[1] + 0.12, eye[2]], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: steady ? 1 : 0 }, children: `眼睛（${NAME[look]}）` },
    { id: 'c', at: [CYL_AT[0], TOP + RIM + 0.08, CYL_AT[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `量筒 ${CYL.max} mL` },
    { id: 'b', at: [CUP_AT[0], TOP + BEAKER_H + 0.06, CUP_AT[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '烧杯里的水' },
    ...(!sunk ? [{ id: 's', at: [ROCK_AT[0], TOP + 0.24, ROCK_AT[2]] as V3, ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '拴着细线的石块' }] : []),
  ]
  return (
    <LabShell title="质量与密度" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="量筒"
      stage={<Room at="s3" labels={labels}>
        <Cylinder at={CYL_AT} V={V} />
        <Carry at={sunk ? [CYL_AT[0], TOP + CYL_IN + STONE_H + 0.004, CYL_AT[2]] : ROCK_AT} lift={1.14} speed={2.4} grip={sunk ? [0.012, RIM - CYL_IN - STONE_H + 0.004, 0.11] : [0.17, 0.07]}><Stone thread={sunk ? 'hook' : 'coil'} up={RIM - CYL_IN - STONE_H} /></Carry>
        <Carry at={P.ph === 1 || P.ph === 2 ? TIP : CUP_AT} lift={0.3} speed={2.2} grip={[BEAKER_R * 2 + 0.02, BEAKER_H * 0.62]} held={P.ph === 1 || P.ph === 2}><Beaker V={CUP_ML - Math.min(V, V1)} pour={P.ph === 2} drop={RIM + 0.03 - levelY(V)} /></Carry>
        {steady && <>
          <group position={eye} rotation-z={Math.atan2(yL - eye[1], CYL_AT[0] - eye[0])}><Eye /></group>
          <Line a={[eye[0] + 0.09, eye[1] - slope * 0.09, eye[2]]} b={[CYL_AT[0], yL, CYL_AT[2]]} dash={look !== 'level'} />
        </>}
      </Room>}
      lesson={<LessonBlock no="3" title="用量筒测体积" concept="视线与凹液面的最低处相平" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>液体的体积用<b className="text-white">量筒</b>测。量筒上的单位是毫升（mL），1 mL = 1 cm³。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>用之前先看清量程和分度值</li>
            <li>量筒放在水平台上；水在量筒里的液面是凹的，读数时视线要和<b className="text-white">凹液面的最低处</b>相平</li>
            <li>俯视读数偏大，仰视读数偏小</li>
            <li>形状不规则的固体：先读出水的体积 V₁，把固体浸没后再读出 V₂，固体的体积 V = V₂ − V₁（排水法）</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">俯视、仰视时的读数是按视线斜 {SIGHT}° 算出来的，只为了看出偏大还是偏小。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两次读数都记下了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">石块的体积是 {displaced(V1, V2)} cm³</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">V = V₂ − V₁ = {V2} mL − {V1} mL。读数时视线要和凹液面的最低处相平。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{ready ? `${NAME[look]}读到` : '量筒读数'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{steady ? `${look === 'level' ? '' : '≈'}${read.toFixed(0)}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">mL</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">凑近看液面（从侧面看）</h2>
          {ready ? <CylView V={V} deg={DEG[look]} /> : <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">量筒里还没有水。</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="量程" value={`${CYL.max} mL`} unit="最多能量多少" />
            <ParamTile symbol="分度值" value={`${CYL.step} mL`} unit="相邻两条刻线之间" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">数据表</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <tbody>
              <tr className="border-t border-white/12"><td className="py-1.5 text-white/80">水的体积 V₁</td><td className="text-right tabular-nums">{rows.includes('v1') ? `${V1} mL` : '—'}</td></tr>
              <tr className="border-t border-white/12"><td className="py-1.5 text-white/80">水和石块的总体积 V₂</td><td className="text-right tabular-nums">{rows.includes('v2') ? `${V2} mL` : '—'}</td></tr>
              <tr className="border-t border-white/12"><td className="py-1.5 text-white/80">石块的体积 V₂ − V₁</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{rows.includes('v2') ? `${displaced(V1, V2)} cm³` : '—'}</td></tr>
            </tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'pour'} onClick={pour} disabled={poured}>倒入水</LabButton>
        <LabButton pulse={next === 'sink'} onClick={sink} disabled={!ready || sunk}>放入石块</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="视线"><Segmented label="视线" pulse={next === 'look'} want={next === 'look' ? want : null} value={look} disabled={!ready} onChange={pick} options={(['down', 'level', 'up'] as Look[]).map(k => ({ value: k, label: NAME[k] }))} /></Control>}
    />
  )
}
