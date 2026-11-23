// 地球的运动 · 第 1 课 地球在自转（自转的方向和周期；昼夜更替）
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import Scene1, { DAY0, type Look } from './scene1'
import { LESSONS, goLesson } from './lessons'
import { CITIES, clockText, isDay, localTime, utcForNoon } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'turn', text: '让地球转一圈，盯住北京', note: '北京从白天转进黑夜，又转回白天：转一圈大约 24 小时，这就是一天' },
  { id: 'north', text: '到北极上空，再看它转', note: '从北极上空看，地球是逆时针转的' },
  { id: 'south', text: '到南极上空，再看它转', note: '同一个转法，从南极上空看却是顺时针' },
]
const LOOKS: Record<Look, string> = { side: '侧面', north: '北极上空', south: '南极上空' }

export default function Lesson1() {
  const B = CITIES.beijing
  const [goal, setGoal] = useState(utcForNoon(B.lon))
  const [look, setLook] = useState<Look>('side')
  const [touched, setTouched] = useState(false)
  const T = useTasks('gewu:orbit:1', TASKS)
  const utc = useSlide(goal, 5), moving = Math.abs(utc - goal) > 0.01
  // 记下在每个机位上各转了多少小时
  const acc = useRef({ all: 0, north: 0, south: 0, last: utc })
  useEffect(() => {
    const d = Math.abs(utc - acc.current.last); acc.current.last = utc
    acc.current.all += d; if (look !== 'side') acc.current[look] += d
    const a = acc.current
    T.check(id => id === 'turn' ? a.all >= 23.9 : id === 'north' ? a.north >= 11.9 : a.south >= 11.9)
  }, [utc])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setGoal(utcForNoon(B.lon)); setLook('side'); setTouched(false); acc.current = { all: 0, north: 0, south: 0, last: utcForNoon(B.lon) }; T.reset() }
  const spin = (h: number) => { setTouched(true); setGoal(g => g + h) }

  const task = T.current, day = isDay(B.lat, B.lon, DAY0, utc)
  const wantLook: Look = task?.id === 'north' ? 'north' : task?.id === 'south' ? 'south' : look
  const { hint, next }: { hint: string; next: 'turn' | 'look' | null } = (() => {
    if (!task) return { hint: '都做完了。自己拨一拨地球，看晨昏线扫过哪些地方。', next: null }
    if (look !== wantLook) return { hint: `把镜头换到${LOOKS[wantLook]}`, next: 'look' }
    if (moving) return { hint: task.id === 'turn' ? '盯住北京：它什么时候进了黑夜？' : '看它朝哪个方向转…', next: null }
    return { hint: '按“转一圈”，或者抓住地球往右拨', next: 'turn' }
  })()

  return (
    <LabShell narration={voiced(NARRATION['1'], VOICE)} title="地球的运动" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球（也可以直接抓住它拨）"
      stage={<Scene1 utc={utc} look={look} cities={['beijing']} onSpin={spin} dragHint={!touched} />}
      lesson={
        <LessonBlock no="1" title="地球在自转" concept="地球转一圈，就是一天" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>地球绕着地轴不停地旋转，叫<b className="text-white">自转</b>。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">方向：</b>自西向东。从北极上空看是逆时针，从南极上空看是顺时针</li>
              <li><b className="text-[#7fe3d4]">周期：</b>转一圈约 24 小时，也就是一天</li>
              <li><b className="text-[#7fe3d4]">结果：</b>地球不透明，太阳只能照亮一半；它一转，各地就有了昼夜更替</li>
            </ul>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个角度都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">地球自西向东自转，一圈约 24 小时</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">太阳只照亮半个地球。地球一转，每个地方都轮流经过白天和黑夜。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再拨一拨看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">北京现在</div>
            <div key={String(day)} className="pop mt-1 text-[44px] leading-none font-bold tracking-tight" style={{ color: day ? '#ffe9a8' : '#9fb6ff' }}>{day ? '白天' : '黑夜'}</div>
            <div className="mt-2 text-[13px] text-white/55 tabular-nums">当地时间 {clockText(localTime(utc, B.lon))}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="周期" value="约 24" unit="小时 · 转一圈" />
            <ParamTile symbol="方向" value={look === 'south' ? '顺时针' : look === 'north' ? '逆时针' : '自西向东'} unit={look === 'side' ? '从侧面看' : `从${LOOKS[look]}看`} />
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-white/65">亮的半边是白天，暗的半边是黑夜，中间那条分界线叫晨昏线。红点是北京。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'turn'} onClick={() => spin(24)} disabled={moving}>转一圈</LabButton>
        <LabButton onClick={() => spin(6)} disabled={moving}>转 6 小时</LabButton>
      </>}
      extras={
        <Control label="从哪里看">
          <Segmented label="从哪里看" pulse={next === 'look'} want={wantLook} value={look} onChange={k => setLook(k as Look)} options={(Object.keys(LOOKS) as Look[]).map(k => ({ value: k, label: LOOKS[k] }))} />
        </Control>
      }
    />
  )
}
