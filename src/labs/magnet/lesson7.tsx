// 电与磁 · 第 7 课 发电机：先在实验台第 7 格摇一台交流发电机模型，看电流计的指针左右摆、小灯泡一闪一闪；
// 再出门到山坡上那台风机：松开刹车让叶轮转起来，剖开机舱看主轴、齿轮箱、发电机，最后看发电机送出的交流电。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { MODEL, TURBINE, acFreq, coilCurrent, flips, genRpm, period } from './physics'
import { Scene7 } from './scene7'
import { Bench, Place, onT7, toWorld } from './world'
import { TB } from './turbine'
import { useSettled } from './anim'

const TASKS: Task[] = [
  { id: 'crank', text: '摇动发电机模型的手柄', note: '线圈每转一圈，电流方向改变两次：这是交流电' },
  { id: 'wind', text: '去风电场，让风机转起来', note: '风推动叶片，叶轮带着主轴转：风的机械能' },
  { id: 'open', text: '剖开机舱，看齿轮箱和发电机', note: '齿轮箱把每分钟约 15 转提高到约 1500 转，带动发电机' },
  { id: 'ac', text: '看发电机发出的交流电', note: '' },
]
const F = acFreq(genRpm(TURBINE.rotor, TURBINE.ratio), TURBINE.pairs)

export default function Lesson7() {
  const [crank, setCrank] = useState(false)
  const [where, setWhere] = useState<'desk' | 'turbine'>('desk')
  const [wind, setWind] = useState(false)
  const [open, setOpen] = useState(false)
  const [ac, setAc] = useState(false)
  const T = useTasks('gewu:magnet:7', TASKS.map(t => t.id === 'ac' ? { ...t, note: `我国交流电的频率是 ${F} Hz，电流方向每秒改变 ${flips(F)} 次` } : t))
  // 手摇：每秒 1 圈（MODEL.rps），线圈转过的角度累加
  const [theta, setTheta] = useState(0), sp = useRef({ w: 0, a: 0 })
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now
      const s = sp.current, goal = crank ? MODEL.rps * Math.PI * 2 : 0
      s.w += (goal - s.w) * (1 - Math.exp(-dt / 0.4)); s.a += s.w * dt
      setTheta(s.a); if (crank || s.w > 0.01) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [crank])
  const rev = theta / (Math.PI * 2), k = sp.current.w > 0.3 ? coilCurrent(theta) * 0.85 * Math.min(1, sp.current.w / (Math.PI * 2)) : 0
  const cut = useSlide(open ? 1 : 0, 0.45)
  const spun = useSettled(`${wind}`, 4500) && wind
  const acSeen = useSettled(`${ac}`, 3500) && ac
  const resetAll = () => { setCrank(false); sp.current = { w: 0, a: 0 }; setTheta(0); setWhere('desk'); setWind(false); setOpen(false); setAc(false); T.reset() }
  useEffect(() => { if (crank && rev >= 3) { T.check(id => id === 'crank'); setCrank(false) } }, [rev >= 3])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (spun) T.check(id => id === 'wind') }, [spun])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (cut > 0.999 && open) T.check(id => id === 'open') }, [cut > 0.999])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (acSeen) T.check(id => id === 'ac') }, [acSeen])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'crank' | 'go' | 'ac' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '发电机把机械能转化为电能。', next: null }
    if (task.id === 'crank') return crank ? { hint: '线圈在转，看电流计的指针和小灯泡…', next: null } : { hint: '摇动手柄，让线圈在磁场里转起来', next: 'crank' }
    if (task.id === 'wind') return where === 'desk' ? { hint: '去山坡上那台风机', next: 'go' } : wind ? { hint: '叶轮转起来了…', next: null } : { hint: '起风了。松开刹车，让叶轮转起来', next: 'go' }
    if (task.id === 'open') return open ? { hint: '剖开机舱…', next: null } : { hint: '剖开机舱，看里面', next: 'go' }
    return ac ? { hint: '看发电机送出的电流…', next: null } : { hint: '看发电机发出的电流', next: 'ac' }
  })()

  const W = (p: [number, number, number]) => toWorld('l7', p)
  const d = TB.deck, ax = TB.axis
  const labels: Label[] = where === 'desk' ? [
    { id: 'n1', at: W([-26, 13.5, -6]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '灵敏电流计' },
    { id: 'n2', at: W([0, 22.5, -1.6]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '线圈在两极之间转' },
    { id: 'n3', at: W([0, 6, 9.5]), ax: 0, name: true, className: 'scene-name', children: '滑环和电刷' },
  ] : open ? [
    { id: 'c1', at: onT7([2.2, d + ax - 1.0, 3.4]), ax: 0.5, className: 'scene-tag transition-opacity', style: { opacity: cut > 0.95 ? 1 : 0 }, children: <><small>主轴</small>约 {TURBINE.rotor} r/min</> },
    { id: 'c2', at: onT7([2.2, d + ax + 2.2, -0.3]), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: cut > 0.95 ? 1 : 0 }, children: <><small>齿轮箱</small>增速约 {TURBINE.ratio} 倍</> },
    { id: 'c3', at: onT7([2.2, d + ax + 1.6, -3.6]), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: cut > 0.95 ? 1 : 0 }, children: <><small>发电机</small>约 {genRpm(TURBINE.rotor, TURBINE.ratio)} r/min</> },
    { id: 'c4', at: onT7([2.2, d + ax - 0.6, -1.4]), ax: 0, className: 'scene-name transition-opacity', style: { opacity: cut > 0.95 ? 1 : 0 }, children: '制动盘' },
  ] : [
    { id: 't1', at: onT7([0, d + 6, -2]), ax: 0.5, className: 'scene-name -translate-y-full', children: '机舱' },
    { id: 't2', at: onT7([0, 40, 2.5]), ax: 0, className: 'scene-name', children: '塔筒高约 80 m' },
  ]
  // 交流电的波形：两个周期
  const wave = Array.from({ length: 121 }, (_, i) => `${i === 0 ? 'M' : 'L'}${(i / 120 * 260).toFixed(1)} ${(40 - 30 * Math.sin(i / 120 * Math.PI * 4)).toFixed(1)}`).join(' ')
  const goBtn = where === 'desk' ? '去风电场' : !wind ? '松开刹车' : '剖开机舱'
  return (
    <LabShell title="电与磁" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel={where === 'desk' ? '发电机模型' : '风机'}
      stage={<Place at={where === 'desk' ? 'l7' : open ? 'l7c' : 'l7t'} labels={labels} world={{ spin: where === 'desk' ? false : wind, cut, flow: ac ? 1 : 0 }}>
        <Bench at="l7"><Scene7 theta={theta} k={k} glow={Math.abs(k)} crank={crank} /></Bench>
      </Place>}
      lesson={<LessonBlock no="7" title="发电机" concept="发电机把机械能转化为电能" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">发电机</b>是根据电磁感应的原理制成的：线圈在磁场中转动，切割磁感线，产生感应电流。它把机械能转化为电能。</p>
          <p className="mt-3">线圈每转一圈，切割磁感线的方向变两次，电流的方向也改变两次。这种周期性改变方向的电流叫<b className="text-white">交流电</b>。电流完成一次周期性变化的时间叫周期，1 s 内完成周期性变化的次数叫频率，单位是赫兹（Hz）。</p>
          <p className="mt-3">我国电网的交流电频率是 50 Hz，周期 0.02 s，电流方向每秒改变 100 次。</p>
          <p className="mt-3 text-[13.5px] text-white/65">风力发电机：风推动叶片，叶轮每分钟只转十几圈，齿轮箱把转速提高约 100 倍，带动发电机。画面里机舱中高速轴的转动放慢了，实际快得看不清。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">模型和风机都看过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">发电机利用电磁感应，把机械能转化为电能</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">线圈转动时电流方向周期性改变，是交流电；我国交流电 50 Hz，周期 0.02 s。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          {where === 'desk' ? <>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/[0.06] py-3"><div className="text-[12.5px] text-white/55">线圈转过</div><div className="mt-1 text-[38px] leading-none font-bold tabular-nums">{Math.floor(rev)}<span className="ml-1 text-[14px] font-medium text-white/55">圈</span></div></div>
              <div className="rounded-xl bg-white/[0.06] py-3"><div className="text-[12.5px] text-white/55">指针</div><div className="mt-1 text-[30px] leading-none font-bold">{Math.abs(k) < 0.15 ? '0' : k > 0 ? '右偏' : '左偏'}</div></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ParamTile symbol="n" value={String(MODEL.rps)} unit="r/s · 手摇" />
              <ParamTile symbol="换向" value={String(flips(acFreq(MODEL.rps * 60, MODEL.pairs)))} unit="次 / 秒" />
            </div>
          </> : <>
            <div className="grid grid-cols-3 gap-2">
              <ParamTile symbol="叶轮" value={`约 ${TURBINE.rotor}`} unit="r/min" />
              <ParamTile symbol="增速" value={`约 ${TURBINE.ratio}`} unit="倍" />
              <ParamTile symbol="发电机" value={`约 ${genRpm(TURBINE.rotor, TURBINE.ratio)}`} unit="r/min" />
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">发电机发出的电流</h2>
            <svg viewBox="0 0 260 80" className="mt-2 w-full" style={{ opacity: ac ? 1 : 0.25 }}>
              <line x1="0" y1="40" x2="260" y2="40" stroke="rgb(255 255 255 / 0.25)" />
              <path d={wave} fill="none" stroke="#ffd34d" strokeWidth="2.2" />
              <line x1="0" y1="74" x2="130" y2="74" stroke="rgb(255 255 255 / 0.5)" /><text x="65" y="70" textAnchor="middle" fontSize="10" fill="rgb(255 255 255 / 0.7)">一个周期 {period(F)} s</text>
            </svg>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ParamTile symbol="f" value={ac ? String(F) : '—'} unit="Hz · 频率" />
              <ParamTile symbol="换向" value={ac ? String(flips(F)) : '—'} unit="次 / 秒" />
            </div>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'crank'} pulse={next === 'crank'} onClick={() => setCrank(c => !c)} disabled={where !== 'desk' || !!T.done.crank}>{crank ? '停下' : '摇动手柄'}</LabButton>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={() => { if (where === 'desk') setWhere('turbine'); else if (!wind) setWind(true); else setOpen(true) }} disabled={!T.done.crank || (where === 'turbine' && wind && (!spun || open))}>{goBtn}</LabButton>
        <LabButton pulse={next === 'ac'} onClick={() => setAc(true)} disabled={!T.done.open || ac}>看输出的电流</LabButton>
      </>}
      extras={null}
    />
  )
}
