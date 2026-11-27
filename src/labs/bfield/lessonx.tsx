// 带电粒子在磁场中 · 拓展课 磁流体发电机 · 极光：大厅东头的展示角。先向磁流体发电机的通道里喷入等离子体，
// 正、负离子在磁场里分别偏向上下两块极板，两板间出现电压；接上灯泡，灯亮了。再转到地磁场模型，让太阳风吹向地球，
// 带电粒子绕着磁感线螺旋着落到两极上空，亮起一圈极光。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { MHD, mhdVoltage } from './physics'
import { RX, RigX } from './scenex'
import { Place } from './world'
import { ST } from './layout'
import { useClock, useSettled } from './anim'

type Exp = 'mhd' | 'aurora'
const TASKS: Task[] = [
  { id: 'mhd', text: '向通道里喷入等离子体', note: `正离子偏向上板，负离子偏向下板，两板间的电压升到 U = Bdv = ${mhdVoltage()} V` },
  { id: 'lamp', text: '在两板间接上灯泡', note: '灯亮了：等离子体的动能变成了电能' },
  { id: 'aurora', text: '转到地磁场模型，让太阳风吹向地球', note: '带电粒子被地磁场引到两极上空，撞击高层大气发光，这就是极光' },
]
const X = ST.x

export default function LessonX() {
  const [exp, setExp] = useState<Exp>('mhd')
  const [gen, setGen] = useState(false)
  const [lamp, setLamp] = useState(false)
  const [wind, setWind] = useState(false)
  const T = useTasks('gewu:bfield:x', TASKS)
  const clock = useClock(0.5)
  const k = useSlide(gen ? 1 : 0, 0.4), full = gen && k > 0.999
  const lit = useSettled(`${lamp}${full}`, 1500) && lamp && full
  const seen = useSettled(`${wind}${exp}`, 6500) && wind && exp === 'aurora'
  useEffect(() => { if (wind) clock.start(); else clock.stop() }, [wind])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (full) T.check(id => id === 'mhd') }, [full])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (lit) T.check(id => id === 'lamp') }, [lit])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (seen) T.check(id => id === 'aurora') }, [seen])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setExp('mhd'); setGen(false); setLamp(false); setWind(false); T.reset() }

  const task = T.current
  type Next = 'gen' | 'lamp' | 'exp' | 'wind' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '磁场让带电粒子拐弯：能发电，也把太阳风引向两极。', next: null }
    if (task.id === 'aurora') {
      if (exp !== 'aurora') return { hint: '转到地磁场模型', next: 'exp' }
      return wind ? { hint: '太阳风吹来了，看粒子落到哪里…', next: null } : { hint: '让太阳风吹向地球', next: 'wind' }
    }
    if (exp !== 'mhd') return { hint: '转回磁流体发电机', next: 'exp' }
    if (task.id === 'mhd') return gen ? { hint: '离子在偏转，两板的电压在升高…', next: null } : { hint: '向通道里喷入等离子体', next: 'gen' }
    return lamp ? { hint: '灯泡接上了…', next: null } : { hint: '在两板间接上灯泡', next: 'lamp' }
  })()

  const U = mhdVoltage() * k
  const labels: Label[] = exp === 'mhd' ? [
    { id: 'n1', at: [X + RX.duct[0], RX.duct[1] + RX.h / 2 + 0.06, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '磁流体发电机' },
    { id: 'n2', at: [X + RX.duct[0] - RX.len / 2 - 0.1, RX.duct[1] - 0.15, 0], ax: 0.5, name: true, className: 'scene-name', children: '等离子体喷口' },
    { id: 'u', at: [X + RX.duct[0] + 0.2, RX.duct[1] - RX.h / 2 - 0.05, 0.1], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: gen ? 1 : 0 }, children: <><small>U</small>{Math.round(U)} V</> },
  ] : [
    { id: 'n3', at: [X + RX.globe[0], RX.globe[1] + RX.R * 3.2, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '地磁场模型' },
    { id: 'n4', at: [X + RX.globe[0] - 0.55, RX.globe[1] + 0.04, 0], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: wind ? 1 : 0 }, children: '太阳风' },
    { id: 'n5', at: [X + RX.globe[0], RX.globe[1] + RX.R + 0.03, 0.05], ax: 0, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: seen ? 1 : 0 }, children: '极光' },
  ]
  return (
    <LabShell title="带电粒子在磁场中" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel="展品"
      stage={<Place at={exp === 'mhd' ? 'x' : 'xa'} cur="x" labels={labels}>
        <RigX gen={gen} lamp={lamp} k={k} wind={wind} clock={clock.now} />
      </Place>}
      lesson={<LessonBlock no="拓展" title="磁流体发电机 · 极光" concept="磁场让带电粒子拐弯：能发电，也造出极光" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">磁流体发电机</b>：高温下电离的气体（等离子体）高速喷进磁场，正、负离子受洛伦兹力分别偏向两块极板，两板间出现电压。电压升高到离子受的电场力与洛伦兹力平衡时就不再变：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">qU/d = qvB，U = Bdv</p>
          <p className="mt-3"><b className="text-white">极光</b>：太阳不断吹出带电粒子（太阳风）。地磁场使它们偏转，大多绕过地球；一部分被引着绕磁感线螺旋前进，到达两极附近的高空，撞击大气分子发光。</p>
          <p className="mt-3 text-white/60">这一页的数是模型的取值，随堂检测不考。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三件事都做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">磁场让带电粒子拐弯：能发电，也把太阳风引到两极</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">磁流体发电机两板间的电压 U = Bdv = {mhdVoltage()} V；太阳风里的带电粒子绕着地磁场的磁感线落到两极上空，形成极光。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          {exp === 'mhd' ? <>
            <div className="text-center">
              <div className="font-formula text-[18px] italic text-white/65">U = B d v</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{Math.round(U)}<span className="ml-1 text-[15px] font-medium text-white/55">V</span></div>
              <div className="mt-1.5 text-[13px] text-white/55">{!gen ? '通道里还没有等离子体' : full ? '电场力与洛伦兹力平衡' : '两板上的电荷越积越多'}</div>
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol="B" value={MHD.B.toFixed(1)} unit="T" />
              <ParamTile symbol="d" value={MHD.d.toFixed(2)} unit="m" />
              <ParamTile symbol="v" value={String(MHD.v)} unit="m/s" />
            </div>
          </> : <>
            <h2 className="text-[12.5px] text-white/55">地磁场模型</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-white/85">地球像一块大磁体，磁感线从南极附近出来，绕到北极附近回去。带电粒子顺着磁感线的方向不受力，垂直方向受洛伦兹力，于是一边绕圈一边沿磁感线前进。</p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-white/85">{seen ? '两极上空亮起了一圈绿色的极光。' : wind ? '粒子正沿着磁感线滑向两极…' : '太阳风还没吹来。'}</p>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'gen'} pulse={next === 'gen'} onClick={() => setGen(g => !g)} disabled={exp !== 'mhd'}>{gen ? '停止喷入' : '喷入等离子体'}</LabButton>
        <LabButton pulse={next === 'lamp'} onClick={() => setLamp(l => !l)} disabled={exp !== 'mhd' || !T.done.mhd}>{lamp ? '断开灯泡' : '接上灯泡'}</LabButton>
        <LabButton primary={next === 'wind'} pulse={next === 'wind'} onClick={() => setWind(w => !w)} disabled={exp !== 'aurora'}>{wind ? '停下太阳风' : '吹来太阳风'}</LabButton>
      </>}
      extras={<Control label="展品"><Segmented label="展品" pulse={next === 'exp'} want={next === 'exp' ? (task?.id === 'aurora' ? 'aurora' : 'mhd') : null} value={exp} onChange={k2 => setExp(k2 as Exp)} options={[{ value: 'mhd', label: '磁流体发电机' }, { value: 'aurora', label: '地磁场和极光' }]} /></Control>}
    />
  )
}
