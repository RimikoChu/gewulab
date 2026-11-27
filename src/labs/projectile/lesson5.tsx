// 抛体运动 · 第 5 课 空投：提前多远投（平抛运动的规律：x = v₀t，y = ½gt²；落地速度的大小和方向）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene5, { LEAD_IN } from './scene5'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { airdrop, fmt, G, HELI, overshoot, type HeightKey } from './physics'
import { useRun } from './run'

const TASKS: Task[] = [
  { id: 'a', text: '在 19.6 m 高，提前 40 m 投放', note: '下落 2 s，这 2 s 里箱子往前走了 20 × 2 = 40 m：正中目标' },
  { id: 'b', text: '升到 44.1 m 高，还是提前 40 m 投放', note: '飞得高了，下落要 3 s，箱子往前走了 60 m：越过目标 20 m' },
  { id: 'c', text: '在 44.1 m 高，改成提前 60 m 投放', note: '提前量 = v₀t = 20 × 3 = 60 m：正中目标' },
  { id: 'd', text: '看箱子落地时的速度', note: '水平 20 m/s，竖直 29.4 m/s，合起来约 35.6 m/s' },
]
const NAMES: Record<HeightKey, string> = { low: '19.6 m', high: '44.1 m' }
const WANT: Record<string, [HeightKey, number]> = { a: ['low', 40], b: ['high', 40], c: ['high', 60], d: ['high', 60] }

export default function Lesson5() {
  const [hk, setHk] = useState<HeightKey>('low')
  const [lead, setLead] = useState<number | null>(null)
  const [showV, setShowV] = useState(false)
  const T = useTasks('gewu:projectile:5', TASKS)
  const H = HELI.heights[hk], h = useSlide(H, 14), climbing = h !== H
  const d = airdrop(H)
  const run = useRun(LEAD_IN + d.t + 0.9)
  useEffect(() => { run.reset(); setLead(null); setShowV(false) }, [hk])   // eslint-disable-line react-hooks/exhaustive-deps
  const landed = run.t !== null && run.t >= LEAD_IN + d.t
  useEffect(() => { if (landed && lead !== null) T.check(id => id !== 'd' && !!WANT[id] && WANT[id][0] === hk && WANT[id][1] === lead) }, [landed])   // eslint-disable-line react-hooks/exhaustive-deps
  const drop = (x: number) => { if (run.running || climbing) return; setShowV(false); setLead(x); run.start() }
  const seeV = () => { if (!landed || hk !== 'high' || lead !== 60) return; setShowV(true); T.check(id => id === 'd') }
  const resetAll = () => { setHk('low'); setLead(null); setShowV(false); run.reset(); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'h' | '40' | '60' | 'v' | null } = !task ? { hint: '飞得越高、越快，越要早投：提前量 = v₀ √(2h ÷ g)。', next: null }
    : run.running ? { hint: tfText(run.t, d.t), next: null }
    : climbing ? { hint: '直升机正在爬升…', next: null }
    : task.id === 'd' && hk === 'high' && landed && lead === 60 ? { hint: '按“看落地速度”：把落地时的速度分成水平和竖直两个分量', next: 'v' }
    : hk !== WANT[task.id][0] ? { hint: `把飞行高度换成 ${NAMES[WANT[task.id][0]]}`, next: 'h' }
    : { hint: `按“提前 ${WANT[task.id][1]} m 投放”`, next: String(WANT[task.id][1]) as '40' | '60' }
  const res = landed && lead !== null ? overshoot(H, lead) : null
  const tf = run.t === null ? null : Math.min(Math.max(0, run.t - LEAD_IN), d.t)

  return (
    <LabShell title="抛体运动" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="直升机"
      stage={<Scene5 h={h} lead={lead} t={run.t} showV={showV} result={res} />}
      lesson={<LessonBlock no="5" title="空投：提前多远投" concept="下落时间由高度定，水平距离 x = v₀t" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>平抛运动的规律（以抛出点为原点，水平方向为 x 轴，竖直向下为 y 轴）：</p>
          <p className="mt-2 font-formula italic">x = v₀t，y = ½gt²；v<sub>x</sub> = v₀，v<sub>y</sub> = gt</p>
          <p className="mt-3">下落时间只由高度决定：<span className="font-formula italic">t = √(2h ÷ g)</span>。这段时间里箱子在水平方向接着以 v₀ 往前走，所以要提前 <span className="font-formula italic">x = v₀t</span> 投放。</p>
          <p className="mt-3">落地速度的大小 <span className="font-formula italic">v = √(v<sub>x</sub>² + v<sub>y</sub>²)</span>，方向和水平方向的夹角 θ 满足 <span className="font-formula italic">tan θ = v<sub>y</sub> ÷ v<sub>x</sub></span>。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">物资投到了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">提前量 x = v₀√(2h ÷ g)；落地速度 v = √(v₀² + (gt)²)，约 35.6 m/s</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">投放后</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{tf === null ? '—' : tf.toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">s</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="h" value={fmt(H, 1)} unit="m · 飞行高度" />
            <ParamTile symbol="t = √(2h ÷ g)" value={fmt(d.t, 1)} unit="s · 下落时间" />
            <ParamTile symbol={<span style={{ color: '#5ad1ff' }}>x = v₀t</span>} value={fmt(d.x, 0)} unit="m · 该提前的量" />
            <ParamTile symbol="落点" value={res === null ? '—' : Math.abs(res) < 0.01 ? '正中' : res > 0 ? `远 ${fmt(res, 0)} m` : `近 ${fmt(-res, 0)} m`} unit={lead === null ? '还没投' : `提前 ${lead} m 投的`} />
          </div>
          {showV && <div className="row-in mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol={<span style={{ color: '#5ad1ff' }}>v<sub>x</sub></span>} value={fmt(d.vx, 0)} unit="m/s" />
            <ParamTile symbol={<span style={{ color: '#ff7a59' }}>v<sub>y</sub> = gt</span>} value={fmt(d.vy, 1)} unit="m/s" />
            <ParamTile symbol={<span style={{ color: '#ffd25a' }}>v</span>} value={fmt(d.v, 1)} unit={`m/s · 斜向下 ${fmt(d.dip, 1)}°`} />
          </div>}
          <p className="mt-3 text-[12.5px] text-white/50">g 取 {G} m/s²，不计空气阻力</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === '40'} pulse={next === '40'} onClick={() => drop(40)} disabled={run.running || climbing}>提前 40 m 投放</LabButton>
        <LabButton primary={next === '60'} pulse={next === '60'} onClick={() => drop(60)} disabled={run.running || climbing}>提前 60 m 投放</LabButton>
        <LabButton primary={next === 'v'} pulse={next === 'v'} onClick={seeV} disabled={!landed || showV || hk !== 'high' || lead !== 60}>看落地速度</LabButton>
      </>}
      extras={
        <Control label="飞行高度">
          <Segmented label="飞行高度" pulse={next === 'h'} want={next === 'h' ? WANT[task!.id][0] : null} value={hk} onChange={k => { if (!run.running) setHk(k) }} options={(Object.keys(NAMES) as HeightKey[]).map(k => ({ value: k, label: NAMES[k] }))} />
        </Control>
      }
    />
  )
}
function tfText(t: number | null, fall: number) { return t !== null && t < LEAD_IN ? '直升机飞过来了…' : t !== null && t < LEAD_IN + fall ? '箱子离开飞机，一边往前一边往下落…' : '落地了' }
