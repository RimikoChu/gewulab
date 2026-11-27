// 静电场 · 第 1 课 库仑定律：在库仑扭秤上给两个小球带上电，读出力；把 C 球推近到一半距离，力变成 4 倍；
// 用不带电的同样小球碰一下 C，让它的电荷量减半，力也减半。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LESSONS, goLesson } from './lessons'
import { ST, TOP } from './layout'
import { TORSION, sci, torsionForce, twist } from './physics'
import { R1, Rig1, chordAngle, onRing } from './scene1'
import { Big, Final, Sub } from './ui'
import { Place } from './world'

const f3 = (F: number) => sci(F, 2)
const TASKS: Task[] = [
  { id: 'charge', text: '给两个小球带上电，读出它们之间的力', note: `相距 ${TORSION.r0.toFixed(2)} m，力是 ${f3(torsionForce(false, false))} N` },
  { id: 'near', text: `把 C 球推近到 ${TORSION.r1.toFixed(2)} m`, note: `距离减半，力变成 4 倍：${f3(torsionForce(true, false))} N` },
  { id: 'half', text: '让 C 球的电荷量减半', note: `电荷量减半，力也减半：${f3(torsionForce(true, true))} N` },
]
const X = ST.l1

export default function Lesson1() {
  const [charged, setCharged] = useState(false)
  const [near, setNear] = useState(false)
  const [half, setHalf] = useState(false)
  const [dipTo, setDipTo] = useState(0)
  const T = useTasks('gewu:efield:1', TASKS)
  const r = useSlide(near ? TORSION.r1 : TORSION.r0, 0.03), dip = useSlide(dipTo, 0.9)
  const F = charged ? torsionForce(near, half) : 0, goal = twist(F)
  const shown = useSlide(goal, 45)
  const moving = Math.abs(r - (near ? TORSION.r1 : TORSION.r0)) > 1e-4 || dip > 0
  const settled = charged && !moving && Math.abs(shown - goal) < 0.01
  useEffect(() => { if (dipTo === 1 && dip >= 1) { setHalf(true); const t = setTimeout(() => setDipTo(0), 500); return () => clearTimeout(t) } }, [dip, dipTo])
  useEffect(() => { if (settled) T.check(id => id === 'charge' || (id === 'near' && near) || (id === 'half' && near && half)) }, [settled, near, half])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setCharged(false); setNear(false); setHalf(false); setDipTo(0); T.reset() }

  const task = T.current
  type Next = 'charge' | 'near' | 'half' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '库仑定律：F = k q₁q₂ / r²。', next: null }
    if (task.id === 'charge') return charged ? { hint: 'A 球被推开了，转旋钮把它拉回原位…', next: null } : { hint: '给两个小球带上电', next: 'charge' }
    if (task.id === 'near') return near ? { hint: 'C 球推近了，看旋钮要多转多少…', next: null } : { hint: '把 C 球推近到一半距离', next: 'near' }
    return half || dipTo ? { hint: 'C 球的电荷分走了一半，看旋钮转回多少…', next: null } : { hint: '用不带电的同样小球碰一下 C 球', next: 'half' }
  })()

  const phi = chordAngle(r), mid = onRing(phi / 2), kick = Math.max(-0.3, Math.min(0.3, (goal - shown) / 144 * 0.3))
  const labels: Label[] = [
    { id: 'n1', at: [X + 0.06, TOP + R1.head + 0.06, 0], ax: 0, name: true, className: 'scene-name', children: '悬丝头：刻度盘和旋钮' },
    { id: 'n2', at: [X - 0.16, TOP + 0.26, 0], ax: 1, name: true, className: 'scene-name', children: '玻璃筒' },
    { id: 'n3', at: [X - R1.arm, TOP + R1.y - 0.02, 0], ax: 0.5, name: true, className: 'scene-name', children: '配重片' },
    { id: 'a', at: [X + R1.arm + 0.018, TOP + R1.y + 0.03, -0.01], ax: 0, className: 'scene-name -translate-y-full', children: 'A' },
    { id: 'c', at: [X + onRing(phi)[0] + 0.02, TOP + R1.y + 0.03, onRing(phi)[2]], ax: 0, className: 'scene-name -translate-y-full', children: 'C' },
    { id: 'r', at: [X + mid[0] * 0.8, TOP + R1.y - 0.03, mid[2] * 0.8], ax: 1, className: 'scene-tag', children: <><small>r</small>{r.toFixed(2)} m</> },
    { id: 'f', at: [X + 0.07, TOP + R1.head + 0.02, 0], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: charged ? 1 : 0 }, children: <><small>转角</small>{shown.toFixed(0)}° <small>F</small>{f3(shown * TORSION.perDeg)} N</> },
  ]
  return (
    <LabShell title="静电场" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="库仑扭秤"
      stage={<Place at="l1" cur="l1" labels={labels}><Rig1 charged={charged} r={r} half={half} dip={dip} twistDeg={shown} kick={kick} F={F} /></Place>}
      lesson={<LessonBlock no="1" title="库仑定律" concept="力与电荷量乘积成正比，与距离平方成反比" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>真空中两个静止点电荷之间的相互作用力，与它们电荷量的乘积成正比，与它们距离的二次方成反比，作用力的方向在它们的连线上：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">F = k q₁q₂ / r²</p>
          <p className="mt-3">k 是静电力常量，k = 9.0×10⁹ N·m²/C²。同种电荷相斥，异种电荷相吸。</p>
          <p className="mt-3">库仑扭秤里，A 球被 C 球推开，悬丝被扭转。转动旋钮把 A 球拉回原位，<b className="text-white">旋钮转过的角度和力成正比</b>，所以比较角度就是比较力。</p>
          <p className="mt-3">两个完全相同的金属小球，一个带电、一个不带电，碰一下以后电荷平分，各带一半。</p>
        </>} />}
      finale={T.finale && <Final kicker="三步都做完了" title="F = k q₁q₂ / r²：距离减半力变 4 倍，电荷量减半力减半"
        body={<>三次的力：{f3(torsionForce(false, false))} N、{f3(torsionForce(true, false))} N、{f3(torsionForce(true, true))} N；旋钮转角 36°、144°、72°。</>} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="F = k q₁q₂ / r²" value={charged ? f3(F) : '—'} unit="N" note={charged ? `旋钮转过 ${goal.toFixed(0)}°` : '两个小球还没带电'} />
          <Sub>关键参数</Sub>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="q₁" value={charged ? sci(TORSION.q0) : '0'} unit="C · A 球" />
            <ParamTile symbol="q₂" value={charged ? sci(half ? TORSION.q0 / 2 : TORSION.q0) : '0'} unit="C · C 球" />
            <ParamTile symbol="r" value={(near ? TORSION.r1 : TORSION.r0).toFixed(2)} unit="m · 球心距离" />
            <ParamTile symbol="k" value="9.0×10⁹" unit="N·m²/C²" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'charge'} pulse={next === 'charge'} onClick={() => setCharged(true)} disabled={charged}>带上电</LabButton>
        <LabButton primary={next === 'near'} pulse={next === 'near'} onClick={() => setNear(true)} disabled={!T.done.charge || near}>推近到 {TORSION.r1.toFixed(2)} m</LabButton>
        <LabButton primary={next === 'half'} pulse={next === 'half'} onClick={() => setDipTo(1)} disabled={!T.done.near || half || dipTo === 1}>电荷量减半</LabButton>
      </>}
      extras={null}
    />
  )
}
