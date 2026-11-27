// 圆锥曲线 · 第 6 课 天线为什么是抛物面（抛物线的光学性质：平行于轴的光线反射后过焦点，反过来也成立）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene6, { type Mode } from './scene6'
import { useRun } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { DISH, RAY_TILT, RAY_TOP, dishPath, fmt } from './physics'

const TASKS: Task[] = [
  { id: 'par', text: '让电波平行于轴射下来', note: '六条电波反射后都过焦点，而且同时到：馈源就装在焦点上' },
  { id: 'tilt', text: `让电波偏 ${RAY_TILT}° 射进来`, note: '不平行于轴，反射后汇不到一点：所以天线要对准天体' },
  { id: 'emit', text: '反过来：从焦点往反射面发射', note: '反射后都平行于轴射出去：探照灯、汽车前灯就是这样做的' },
]
const ROW: Record<Mode, [string, string]> = { par: ['平行于轴', '都过焦点'], tilt: [`偏 ${RAY_TILT}°`, '汇不到一点'], emit: ['从焦点发出', '都平行于轴'] }
const ORDER: Mode[] = ['par', 'tilt', 'emit']

export default function Lesson6() {
  const [mode, setMode] = useState<Mode | null>(null)
  const [seen, setSeen] = useState<Mode[]>([])
  const T = useTasks('gewu:conic:6', TASKS)
  const run = useRun(4.2)
  useEffect(() => { if (!run.done || !mode) return; const next = seen.includes(mode) ? seen : [...seen, mode]; if (next !== seen) setSeen(next); T.check(id => next.includes(id as Mode)) }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const go = (m: Mode) => { if (run.running) return; setMode(m); run.start() }
  const resetAll = () => { run.reset(); setMode(null); setSeen([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: Mode | null } = !task ? { hint: '三种情况都看过了。只有平行于轴的电波才汇到焦点。', next: null }
    : run.running ? { hint: '电波在走…', next: null }
    : task.id === 'par' ? { hint: '按“平行电波”：让电波平行于轴射下来', next: 'par' }
    : task.id === 'tilt' ? { hint: '按“斜着进来”：让电波偏一个角度', next: 'tilt' } : { hint: '按“从焦点发射”：在焦点放一个波源', next: 'emit' }

  return (
    <LabShell title="圆锥曲线" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="电波"
      stage={<Scene6 mode={mode} t={run.t} />}
      lesson={<LessonBlock no="6" title="天线为什么是抛物面" concept="平行于轴的光线，反射后过焦点" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>抛物线有一条<b className="text-white">光学性质</b>：平行于对称轴的光线（电波也一样），经抛物线反射后都经过焦点；反过来，从焦点发出的光线，反射后都平行于对称轴。</p>
          <p className="mt-3">把抛物线绕对称轴转一圈就是抛物面。来自遥远天体的电波几乎是平行的，天线对准它，电波就都汇到焦点上的馈源里。探照灯、手电筒、汽车前灯把灯泡放在焦点上，射出去的是一束平行光。</p>
          <p className="mt-3">从同一个波前出发，各条电波到焦点的路程都相等，所以它们同时到达，互相加强。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种情况都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">平行于轴进来的汇到焦点；从焦点出去的变成平行的一束</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">各条电波从波前到焦点的路程</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{seen.includes('par') ? fmt(dishPath(DISH.p, 5, RAY_TOP)) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="p" value={String(DISH.p)} unit="m" />
            <ParamTile symbol="p/2" value={fmt(DISH.p / 2)} unit="m · 焦点离顶点" />
            <ParamTile symbol="口径" value={String(DISH.R * 2)} unit="m" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">看过的</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">电波怎么来</th><th className="text-right font-normal">反射以后</th></tr></thead>
            <tbody>{ORDER.filter(m => seen.includes(m)).map(m => <tr key={m} className="row-in border-t border-white/12"><td className="py-1.5">{ROW[m][0]}</td><td className="text-right font-semibold">{ROW[m][1]}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'par'} onClick={() => go('par')} disabled={run.running}>平行电波</LabButton>
        <LabButton pulse={next === 'tilt'} onClick={() => go('tilt')} disabled={run.running}>斜着进来</LabButton>
        <LabButton pulse={next === 'emit'} onClick={() => go('emit')} disabled={run.running}>从焦点发射</LabButton>
      </>}
      extras={null}
    />
  )
}
