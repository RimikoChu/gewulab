// 万有引力与航天 · 第 1 课 行星的运动（开普勒第一、第二定律）
import { useEffect, useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene1, { type Sector } from './scene1'
import { LESSONS, goLesson } from './lessons'
import { SHOW, aphelion, areaShare, perihelion, showState, toAU } from './physics'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'orbit', text: '让行星绕太阳走一圈', note: '轨道是椭圆，太阳在一个焦点上；离太阳近时走得快' },
  { id: 'near', text: '在近日点附近扫一个月', note: '近日点附近走得快，扫出一块又短又宽的扇形' },
  { id: 'far', text: '在远日点附近也扫一个月', note: '远日点附近的扇形又细又长，面积和近日点那块一样' },
]
const MONTH = 1 / 12
const NEAR0 = -MONTH / 2, FAR0 = 0.5 - MONTH / 2

export default function Lesson1() {
  const [goal, setGoal] = useState(0.25)              // 行星要走到的时刻（以周期计，0 是近日点）
  const [sectors, setSectors] = useState<Sector[]>([])
  const [sweep, setSweep] = useState<{ from: number; color: string } | null>(null)
  const T = useTasks('gewu:gravity:1', TASKS)
  // 行星按真实的时间匀速“走时间”：一圈 8 秒。离太阳近时同样的时间里走过的路长，看起来就快
  const frac = useSlide(goal, sweep ? 1 / 20 : 1 / 8)
  const moving = Math.abs(frac - goal) > 1e-6
  const lapRef = useRef(false)
  useEffect(() => {
    if (moving) return
    if (lapRef.current) { lapRef.current = false; T.check(id => id === 'orbit') }
    if (sweep) {
      const s: Sector = { from: sweep.from, to: sweep.from + MONTH, color: sweep.color }
      const next = [...sectors, s]; setSectors(next); setSweep(null)
      T.check(id => (id === 'near' && next.some(x => x.color === '#35c7b3')) || (id === 'far' && next.some(x => x.color === '#ffb347')))
    }
  }, [moving])   // eslint-disable-line react-hooks/exhaustive-deps

  const atNear = !moving && Math.abs(goal - NEAR0 - Math.round(goal - NEAR0)) < 1e-6
  const atFar = !moving && Math.abs(goal - FAR0 - Math.round(goal - FAR0)) < 1e-6
  const lap = () => { lapRef.current = true; setGoal(g => g + 1) }
  const wantFar = !!T.done.near
  const go = () => { const base = Math.floor(goal) + 1; setGoal(wantFar ? base + FAR0 : base + NEAR0) }
  const doSweep = () => { setSweep({ from: ((goal % 1) + 1) % 1, color: wantFar ? '#ffb347' : '#35c7b3' }); setGoal(g => g + MONTH) }
  const resetAll = () => { setGoal(0.25); setSectors([]); setSweep(null); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'lap' | 'go' | 'sweep' | null } = (() => {
    if (!task) return { hint: '都做完了。两块扇形形状不同，面积一样大。', next: null }
    if (moving) return { hint: sweep ? '扫着…' : '行星在走：看它在哪儿快、在哪儿慢', next: null }
    if (task.id === 'orbit') return { hint: '让行星绕太阳走一圈', next: 'lap' }
    if (task.id === 'near') return atNear ? { hint: '在近日点扫一个月', next: 'sweep' } : { hint: '让行星走到近日点', next: 'go' }
    return atFar ? { hint: '在远日点扫一个月', next: 'sweep' } : { hint: '让行星走到远日点', next: 'go' }
  })()
  const { r, v } = showState(frac)
  const share = (c: string) => { const s = sectors.find(x => x.color === c); return s ? `${(100 * areaShare(s.from, s.to)).toFixed(1)}%` : '—' }

  return (
    <LabShell narration={voiced(NARRATION['1'], VOICE)} title="万有引力与航天" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="行星"
      stage={<Scene1 frac={frac} sectors={sectors} sweeping={sweep ? { from: sweep.from, to: sweep.from + (frac - (goal - MONTH)), color: sweep.color } : null} />}
      lesson={<LessonBlock no="1" title="行星的运动" concept="行星走椭圆，离太阳近时走得快" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">开普勒第一定律：</b>所有行星绕太阳运动的轨道都是椭圆，太阳处在椭圆的一个焦点上。</p>
          <p className="mt-2"><b className="text-white">开普勒第二定律：</b>对任意一个行星来说，它与太阳的连线在相等的时间内扫过的面积相等。所以近日点附近走得快，远日点附近走得慢。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这颗行星的轨道故意画得很扁（偏心率 0.5），是示意。真实行星的轨道都很接近圆，地球轨道的偏心率只有约 0.017。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="px-6 py-5">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两块扇形都扫出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">行星走椭圆；相等时间扫过的面积相等</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/70">近日点附近扇形短而宽，远日点附近细而长，各占椭圆的 {share('#35c7b3')}。所以离太阳近时走得快。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">行星此刻的速度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{(v / 1000).toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">km/s</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="r" value={toAU(r).toFixed(2)} unit="AU · 到太阳" />
            <ParamTile symbol="a" value={toAU(SHOW.a).toFixed(1)} unit="AU · 半长轴" />
            <ParamTile symbol="e" value={String(SHOW.e)} unit="偏心率" />
          </div>
          <div className="mt-5 text-[12.5px] text-white/55">一个月扫过的面积（占整个椭圆）</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#35c7b3]/15 px-3 py-2.5"><div className="text-[12px] text-white/60">近日点附近</div><div className="text-[22px] font-bold tabular-nums">{share('#35c7b3')}</div></div>
            <div className="rounded-xl bg-[#ffb347]/15 px-3 py-2.5"><div className="text-[12px] text-white/60">远日点附近</div><div className="text-[22px] font-bold tabular-nums">{share('#ffb347')}</div></div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/55">示意行星：半长轴 1 AU，一年绕一圈；近日点 {toAU(perihelion(SHOW.a, SHOW.e)).toFixed(1)} AU，远日点 {toAU(aphelion(SHOW.a, SHOW.e)).toFixed(1)} AU。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'lap'} onClick={lap} disabled={moving}>走一圈</LabButton>
        <LabButton pulse={next === 'go'} onClick={go} disabled={moving}>{wantFar ? '到远日点' : '到近日点'}</LabButton>
        <LabButton primary pulse={next === 'sweep'} onClick={doSweep} disabled={moving}>扫一个月</LabButton>
      </>}
      extras={null}
    />
  )
}
