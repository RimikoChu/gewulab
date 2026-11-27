// 抛体运动 · 第 6 课 水炮的射高和射程（斜抛运动：45° 射程最大，互余的两个仰角射程相同）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene6 from './scene6'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { apexOf, CANNON, flightTime, fly, fmt, rangeOf } from './physics'

const TASKS: Task[] = [
  { id: '30', text: '仰角 30°，喷水，记下射程和射高', note: '射程 17.32 m，射高 2.5 m：够不着 20 m 处的火盆' },
  { id: '60', text: '仰角 60°，再喷一次', note: '射高到了 7.5 m，射程还是 17.32 m：30° 和 60° 落在同一处' },
  { id: '45', text: '仰角 45°，再喷一次', note: '射程 20 m，是最远的：正好浇到火盆' },
]
type AK = '30' | '45' | '60'

export default function Lesson6() {
  const [ak, setAk] = useState<AK>('30')
  const [on, setOn] = useState(false)
  const [landed, setLanded] = useState(false)
  const [rows, setRows] = useState<number[]>([])
  const T = useTasks('gewu:projectile:6', TASKS)
  const angle = +ak, v0 = CANNON.v0
  const barrel = useSlide(angle, 40), turning = barrel !== angle
  useEffect(() => { setOn(false); setLanded(false) }, [ak])
  useEffect(() => { if (!on) { setLanded(false); return } const t = setTimeout(() => setLanded(true), (flightTime(v0, angle) + 0.5) * 1000); return () => clearTimeout(t) }, [on, angle, v0])
  const dup = rows.includes(angle)
  const record = () => { if (!landed || dup) return; const n = [...rows, angle]; setRows(n); T.check(id => n.includes(+id)) }
  const resetAll = () => { setAk('30'); setOn(false); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'ang' | 'on' | 'rec' | null } = !task ? { hint: '同样的出口速度，45° 喷得最远；30° 和 60° 一样远。', next: null }
    : ak !== task.id ? { hint: `把仰角换成 ${task.id}°`, next: 'ang' }
    : turning ? { hint: '炮管正在转…', next: null }
    : !on ? { hint: '按“喷水”：看水柱落在长台的哪一格', next: 'on' }
    : !landed ? { hint: '水柱飞出去了…', next: null }
    : { hint: '按“记录”：记下射程和射高', next: 'rec' }
  const s0 = fly(v0, angle, 0), show = landed || dup

  return (
    <LabShell title="抛体运动" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="水炮"
      stage={<Scene6 angle={angle} barrel={barrel} on={on && !turning} landed={landed} kept={rows} out={rows.includes(45) || (angle === 45 && landed)} />}
      lesson={<LessonBlock no="6" title="水炮的射高和射程" concept="斜抛：45° 射程最大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>以一定的速度斜向上抛出、只受重力的运动叫斜抛运动。把初速度分解：水平 <span className="font-formula italic">v₀ cos θ</span>（匀速），竖直 <span className="font-formula italic">v₀ sin θ</span>（竖直上抛）。</p>
          <p className="mt-3">落回抛出点的高度时：飞行时间 <span className="font-formula italic">t = 2v₀ sin θ ÷ g</span>，射高 <span className="font-formula italic">H = v₀² sin² θ ÷ 2g</span>，射程 <span className="font-formula italic">R = v₀² sin 2θ ÷ g</span>。</p>
          <p className="mt-3">sin 2θ 在 θ = 45° 时最大，所以 45° 射程最大；sin 60° = sin 120°，所以 30° 和 60°（互余的两个角）射程相同。这里 v₀ = 14 m/s，v₀² ÷ g = 20 m。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个仰角都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">45° 射程最大（20 m）；30° 和 60° 射程相同，仰角越大射高越大</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">R = v₀² sin 2θ ÷ g</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{show ? fmt(rangeOf(v0, angle)) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol={<span style={{ color: '#ffd25a' }}>v₀</span>} value={String(v0)} unit="m/s" />
            <ParamTile symbol={<span style={{ color: '#5ad1ff' }}>v₀ cos θ</span>} value={fmt(s0.vx, 1)} unit="m/s" />
            <ParamTile symbol={<span style={{ color: '#ff7a59' }}>v₀ sin θ</span>} value={fmt(s0.vy, 1)} unit="m/s" />
          </div>
          <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">仰角 θ</th><th className="text-right font-normal">射程 R</th><th className="text-right font-normal">射高 H</th><th className="text-right font-normal">时间</th></tr></thead>
            <tbody>{CANNON.angles.map(a => { const ok = rows.includes(a); return <tr key={a} className={`border-t border-white/12 ${ok && a === 45 ? 'font-semibold text-[#7fe3d4]' : ''}`}><td className="py-1.5 tabular-nums">{a}°</td><td className="text-right tabular-nums">{ok ? `${fmt(rangeOf(v0, a))} m` : '—'}</td><td className="text-right tabular-nums">{ok ? `${fmt(apexOf(v0, a), 1)} m` : '—'}</td><td className="text-right tabular-nums">{ok ? `${fmt(flightTime(v0, a))} s` : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={() => setOn(o => !o)} disabled={turning}>{on ? '停水' : '喷水'}</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!landed || dup}>记录</LabButton>
      </>}
      extras={
        <Control label="仰角">
          <Segmented label="仰角" pulse={next === 'ang'} want={next === 'ang' ? task!.id as AK : null} value={ak} onChange={setAk} options={[{ value: '30', label: '30°' }, { value: '45', label: '45°' }, { value: '60', label: '60°' }]} />
        </Control>
      }
    />
  )
}
