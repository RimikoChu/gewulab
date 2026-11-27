// 圆锥曲线 · 第 7 课 行星的椭圆轨道（太阳在椭圆的一个焦点上；离心率决定轨道有多扁）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene7 from './scene7'
import { useRun } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { ORBITS, ORBIT_KEYS, aphelion, fmt, orbitAt, perihelion, type OrbitKey } from './physics'

const TASKS: Task[] = [
  { id: 'earth', text: '让地球绕太阳转一圈', note: 'e 只有 0.017：地球的轨道几乎是圆，近日点和远日点只差 3% 左右' },
  { id: 'mars', text: '换成火星，转一圈', note: 'e = 0.093：太阳明显偏离中心，轨道仍然很接近圆' },
  { id: 'halley', text: '换成哈雷彗星，转一圈', note: 'e = 0.967：又扁又长的椭圆。离太阳近时走得快，远时走得慢' },
]

export default function Lesson7() {
  const [k, setK] = useState<OrbitKey>('earth')
  const [seen, setSeen] = useState<OrbitKey[]>([])
  const T = useTasks('gewu:conic:7', TASKS)
  const run = useRun(8)
  const o = ORBITS[k], e = useSlide(o.e, 0.7), settled = e === o.e
  useEffect(() => { if (!run.done) return; const next = seen.includes(k) ? seen : [...seen, k]; if (next !== seen) setSeen(next); T.check(id => next.includes(id as OrbitKey)) }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (q: OrbitKey) => { run.reset(); setK(q) }
  const resetAll = () => { run.reset(); setK('earth'); setSeen([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'seg' | 'go' | null } = !task ? { hint: '三个天体都转过了。离心率越大，轨道越扁。', next: null }
    : k !== task.id ? { hint: `把天体换成${ORBITS[task.id as OrbitKey].name}`, next: 'seg' }
    : run.running || !settled ? { hint: run.running ? `${o.name}在走…看它到太阳的距离` : '轨道在变…', next: null } : { hint: '按“转一圈”：从近日点出发绕太阳一圈', next: 'go' }
  const r = orbitAt(1, o.e, run.t).r * o.a

  return (
    <LabShell title="圆锥曲线" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="轨道盘"
      stage={<Scene7 k={k} e={e} t={settled ? run.t : 0} moving={run.running} />}
      lesson={<LessonBlock no="7" title="行星的椭圆轨道" concept="太阳在椭圆轨道的一个焦点上" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>行星绕太阳运行的轨道是椭圆，太阳在椭圆的一个焦点上。轨道上离太阳最近的点叫<b className="text-white">近日点</b>，最远的点叫<b className="text-white">远日点</b>，它们是长轴的两个端点。</p>
          <p className="mt-3">设长半轴是 <span className="font-formula italic">a</span>、半焦距是 <span className="font-formula italic">c</span>，近日点到太阳 <span className="font-formula italic">a − c = a</span>(1 − <span className="font-formula italic">e</span>)，远日点到太阳 <span className="font-formula italic">a + c = a</span>(1 + <span className="font-formula italic">e</span>)。</p>
          <p className="mt-3">AU 是天文单位，1 AU 约等于地球到太阳的平均距离。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个天体都转过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">轨道都是椭圆，太阳在一个焦点上；离心率越大，轨道越扁</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再转一转</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{o.name}到太阳的距离</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{fmt(r, 2)}<span className="ml-1 text-[15px] font-medium text-white/55">AU</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="a" value={fmt(o.a, 3)} unit="AU · 长半轴" />
            <ParamTile symbol="e" value={fmt(o.e, 3)} unit="离心率" />
            <ParamTile symbol="a − c" value={fmt(perihelion(o.a, o.e), 3)} unit="AU · 近日点" />
            <ParamTile symbol="a + c" value={fmt(aphelion(o.a, o.e), 3)} unit="AU · 远日点" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">转过的</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">天体</th><th className="font-normal">e</th><th className="text-right font-normal">远日点 ÷ 近日点</th></tr></thead>
            <tbody>{ORBIT_KEYS.filter(q => seen.includes(q)).map(q => <tr key={q} className="row-in border-t border-white/12"><td className="py-1.5">{ORBITS[q].name}</td><td className="tabular-nums">{ORBITS[q].e}</td><td className="text-right tabular-nums">{fmt(aphelion(1, ORBITS[q].e) / perihelion(1, ORBITS[q].e), 2)}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'go'} onClick={run.start} disabled={run.running || !settled}>转一圈</LabButton></>}
      extras={<Control label="天体"><Segmented label="天体" pulse={next === 'seg'} want={next === 'seg' ? task!.id as OrbitKey : null} value={k} onChange={pick} options={ORBIT_KEYS.map(q => ({ value: q, label: ORBITS[q].name }))} /></Control>}
    />
  )
}
