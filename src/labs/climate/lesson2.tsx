// 天气和气候 · 第 2 课 气温的测量：观测场里的百叶箱。在 2、8、14、20 时各开一次箱读干球温度表，
// 算日平均气温；再读最高、最低温度表，算日较差。镜头在北边：百叶箱的门朝北开。
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, Rows, nameTag, valTag } from './parts'
import { H_MAX, OBS_HOURS, T_MAX, T_MIN, dailyMean, dailyRange, dayTemp, readAt } from './physics'
import { BOX, P } from './station'
import { VOICE } from './voice'
import { NEAR, SPOT, type Want } from './world'

const TASKS: Task[] = [
  { id: '2', text: '2 时开箱，读干球温度表', note: '夜里 2 时 19.1 ℃' },
  { id: '8', text: '8 时再读一次', note: '太阳出来了，8 时升到 21.0 ℃' },
  { id: '14', text: '14 时再读一次', note: '午后 2 时 30.0 ℃，是一天里最热的时候' },
  { id: '20', text: '20 时再读一次', note: '傍晚 20 时降到 25.9 ℃' },
  { id: 'calc', text: '算日平均气温和日较差', note: '' },
]
/** 各个时刻的天色：夜里不画天空，换成深色背景，箱边点一盏灯 */
const SKY: Record<number, { sky?: boolean; backdrop?: string; sun: number; env: number; lamp: number }> = {
  2: { sky: false, backdrop: '#0b1322', sun: 0, env: 0.1, lamp: 1.6 },
  8: { sun: 1.5, env: 0.55, lamp: 0 },
  14: { sun: 3.4, env: 0.85, lamp: 0 },
  20: { sky: false, backdrop: '#2a3150', sun: 0.12, env: 0.22, lamp: 1.2 },
}
const MEAN = dailyMean(OBS_HOURS.map(readAt)), RANGE = dailyRange(T_MAX, T_MIN)

export default function Lesson2() {
  const [at, setAt] = useState(0)                         // 第几个观测时刻（0–3）
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<number[]>([])          // 已经读过的时刻
  const [calc, setCalc] = useState(false)
  const [busy, setBusy] = useState(false)
  const T = useTasks('gewu:climate:2', TASKS)
  const hour = OBS_HOURS[at], door = useSlide(open ? 1 : 0, 1.1), t = useSlide(readAt(hour), 5)
  const settled = open && door > 0.99 && Math.abs(t - readAt(hour)) < 0.05
  const read = () => {
    if (open) return
    setOpen(true)
    setTimeout(() => { setRows(r => { const n = r.includes(hour) ? r : [...r, hour]; T.check(id => n.includes(+id)); return n }) }, 2400)
  }
  const advance = () => { if (at >= 3 || busy) return; setBusy(true); setOpen(false); setTimeout(() => { setAt(a => Math.min(3, a + 1)); setBusy(false) }, 1400) }
  const doCalc = () => { if (rows.length < 4) return; setOpen(true); setCalc(true); T.check(id => id === 'calc') }
  const resetAll = () => { setAt(0); setOpen(false); setBusy(false); setRows([]); setCalc(false); T.reset() }

  const task = T.current, readNow = rows.includes(hour)
  const { hint, next }: { hint: string; next: 'read' | 'next' | 'calc' | null } = (() => {
    if (!task) return { hint: '都做完了。日平均气温是四次观测的平均。', next: null }
    if (task.id === 'calc') return { hint: '四次都读完了。算一算日平均气温和日较差', next: 'calc' }
    if (busy) return { hint: '关上箱门，等下一个观测时刻…', next: null }
    if (open && !readNow) return { hint: '门开了，看干球温度表的液柱…', next: null }
    if (!readNow) return { hint: `现在是 ${hour} 时。打开百叶箱，读干球温度表`, next: 'read' }
    return { hint: '记下了。关上箱门，等到下一个观测时刻', next: 'next' }
  })()

  const sky = SKY[hour], s = open ? SPOT.screenIn : SPOT.screen
  const [bx, , bz] = P.screen
  const labels: Label[] = [
    nameTag('nb', [bx, BOX.y0 + BOX.h + 0.25, bz], '百叶箱'),
    nameTag('nl', [bx + BOX.w / 2 + 0.05, BOX.y0 + 0.45, bz], '百叶：挡住阳光，又能通风', 0),
    valTag('h', [bx - BOX.w / 2 - 0.4, 0.8, bz - 0.3], '温度表球部', '离地 1.5 m', false, !open, 1),
    valTag('t', [bx + 0.03, BOX.y0 + 0.5, bz - 0.24], '干球温度表', `${t.toFixed(1)} ℃`, true, open && door > 0.9),
    valTag('mx', [bx - 0.17, BOX.y0 + 0.215, bz - 0.2], '最高', `${T_MAX.toFixed(1)} ℃`, false, open && calc),
    valTag('mn', [bx - 0.17, BOX.y0 + 0.165, bz - 0.2], '最低', `${T_MIN.toFixed(1)} ℃`, false, open && calc),
  ]
  // 一天的气温曲线（面板里的小图）
  const X = (h: number) => 12 + (h / 24) * 272, Y = (v: number) => 92 - ((v - 16) / 16) * 80
  const curve = Array.from({ length: 49 }, (_, i) => `${i ? 'L' : 'M'}${X(i / 2).toFixed(1)} ${Y(dayTemp(i / 2)).toFixed(1)}`).join(' ')
  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title="天气和气候" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="百叶箱"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...NEAR} sky={sky.sky ?? true} backdrop={sky.backdrop} sun={sky.sun} env={sky.env}
        world={{ wx: hour === 14 ? 'sun' : 'cloud', screen: { door, t, tmax: calc || at === 3 ? T_MAX : t, tmin: T_MIN, lamp: sky.lamp } }}>
        {/* 量高度的标尺：从地面量到温度表的球部 */}
        {!open && <group position={[bx - BOX.w / 2 - 0.32, 0, bz - 0.3]}>
          <mesh position-y={0.75}><cylinderGeometry args={[0.008, 0.008, 1.5, 8]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh>
          {[0.004, 1.5].map(y => <mesh key={y} position-y={y}><boxGeometry args={[0.14, 0.012, 0.012]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh>)}
          <mesh position={[0.18, 1.5, 0.15]} rotation-y={-0.6}><boxGeometry args={[0.42, 0.006, 0.006]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} transparent opacity={0.7} /></mesh>
        </group>}
      </LabStage>}
      lesson={<LessonBlock no="2" title="气温的测量" concept="日平均气温是四次观测的平均" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>气温用温度表测量。温度表放在<b className="text-white">百叶箱</b>里：箱子漆成白色，反射阳光；四面是百叶，空气能流通；温度表的球部离地 <b className="text-white">1.5 m</b>。这样测到的是阴凉通风处空气的温度。</p>
          <p className="mt-2">一天观测 4 次：2 时、8 时、14 时、20 时。<b className="text-white">日平均气温</b> = 四次读数之和 ÷ 4。</p>
          <p className="mt-2">一天中气温最高出现在<b className="text-white">午后 2 时</b>左右，最低出现在日出前后。最高气温与最低气温的差是<b className="text-white">日较差</b>。</p>
          <p className="mt-2 text-[13.5px] text-white/65">箱门朝北开：开门读数时阳光照不进箱里。这一天的读数是示意数据。</p>
        </>} />}
      finale={T.finale && <Fin kicker="一天的气温测完了" big="日平均气温是四次观测的平均" small={`(19.1 + 21.0 + 30.0 + 25.9) ÷ 4 = ${MEAN.toFixed(1)} ℃；最高 ${T_MAX.toFixed(1)} ℃ 出现在午后 ${H_MAX} 时左右，最低 ${T_MIN.toFixed(1)} ℃ 在日出前，日较差 ${RANGE.toFixed(1)} ℃。`} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{calc ? '日平均气温' : `${hour} 时 · 干球温度表`}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{calc ? MEAN.toFixed(1) : readNow || settled ? readAt(hour).toFixed(1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">℃</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="最高" value={calc ? `${T_MAX.toFixed(1)} ℃` : '—'} unit="最高温度表" />
            <ParamTile symbol="最低" value={calc ? `${T_MIN.toFixed(1)} ℃` : '—'} unit="最低温度表" />
          </div>
          {calc && <p className="mt-2 text-center font-formula text-[15px] text-white/80">日较差 = {T_MAX.toFixed(1)} − {T_MIN.toFixed(1)} = {RANGE.toFixed(1)} ℃</p>}
          <h2 className="mt-5 text-[12.5px] text-white/55">观测记录</h2>
          {rows.length ? <Rows head={['时刻', '气温']} rows={[...rows.map(h => [`${h} 时`, `${readAt(h).toFixed(1)} ℃`]), ...(calc ? [['平均', <b key="m">{MEAN.toFixed(1)} ℃</b>]] : [])]} /> : <p className="mt-2 text-[13.5px] text-white/50">还没有记录</p>}
          <svg viewBox="0 0 296 112" className="mt-3 w-full">
            {[0, 6, 12, 18, 24].map(h => <text key={h} x={X(h)} y={109} fontSize="10" fill="rgb(255 255 255 / 0.45)" textAnchor="middle">{h}时</text>)}
            <path d={curve} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="1.5" strokeDasharray={calc ? undefined : '3 3'} />
            {rows.map(h => <circle key={h} cx={X(h)} cy={Y(readAt(h))} r="4" fill="#ff8a65" />)}
            {calc && <circle cx={X(H_MAX)} cy={Y(T_MAX)} r="7" fill="none" stroke="#ffe9a8" strokeWidth="2" />}
          </svg>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'read'} pulse={next === 'read'} onClick={read} disabled={open || readNow || !!(task && task.id === 'calc')}>开箱读数</LabButton>
        <LabButton pulse={next === 'next'} onClick={advance} disabled={!readNow || at >= 3 || busy}>到下一个观测时刻</LabButton>
        <LabButton primary={next === 'calc'} pulse={next === 'calc'} onClick={doCalc} disabled={rows.length < 4 || calc}>算一算</LabButton>
      </>}
      extras={null}
    />
  )
}
