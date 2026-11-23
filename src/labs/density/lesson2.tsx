// 质量与密度 · 第 2 课 用天平称质量（托盘天平的使用：调节、左物右码、加减砝码、移游码、读数）
import { useEffect, useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Balance, PIVOT, WeightSet, panAt } from './balance'
import { LESSONS, goLesson } from './lessons'
import { Block, Carry, Room, newLive, useLag, useLanded, useSettled, type V3 } from './parts'
import { COPPER, START, pointerSays, reading, tilt, weigh, weightsText } from './physics'
import { BalanceView } from './views'
import { ST, TOP, CM } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const W = weigh(COPPER), N = W.steps.length
const TASKS: Task[] = [
  { id: 'level', text: '游码归零，再调平衡螺母，让指针指在分度盘中央', note: '称之前先调好：游码归零，指针偏左就把平衡螺母向右调' },
  { id: 'place', text: '把铜块放在左盘', note: '左物右码：物体放左盘，砝码放右盘' },
  { id: 'weights', text: '用镊子从大到小试砝码，太重就取下', note: `留下了 ${weightsText(W.on)}，一共 ${W.sum} g` },
  { id: 'read', text: '移动游码，让天平重新平衡，读出质量', note: `${W.sum} g + ${W.rider.toFixed(1)} g = ${reading(W.on, W.rider).toFixed(1)} g` },
]
export const BASE2: V3 = [ST.s2 - 0.3, TOP, 0.25], BOX2: V3 = [ST.s2 + 1.72, TOP, 0.82]

export default function Lesson2() {
  const [zeroed, setZeroed] = useState(false)
  const [leveled, setLeveled] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [on, setOn] = useState<number[]>([])
  const [i, setI] = useState(0)
  const [trying, setTrying] = useState(false)
  const [slid, setSlid] = useState(false)
  const [warn, setWarn] = useState<string | null>(null)
  const T = useTasks('gewu:density:2', TASKS)
  const live = useRef(newLive())
  useEffect(() => { if (!warn) return; const t = setTimeout(() => setWarn(null), 2800); return () => clearTimeout(t) }, [warn])
  const rider = useSlide(!zeroed ? START.rider : slid ? W.rider : 0, 1.9), nut = useSlide(leveled ? 1 : 0, 0.7)
  const landed = useLanded(on), there = useLag(placed, 1300)
  const left = (there ? COPPER : 0) + START.trim * (1 - nut), right = reading(landed, rider), t = tilt(left, right)
  const settled = useSettled(`${zeroed}${leveled}${placed}${on.join()}${slid}`, slid ? 3600 : 3100)
  const tried = i >= N && !trying
  useEffect(() => { if (settled) T.check(id => ({ level: leveled, place: placed, weights: tried, read: slid } as Record<string, boolean>)[id]) })
  const adjust = () => { if (!settled) return; if (!zeroed) setZeroed(true); else setLeveled(true) }
  const step = () => {
    if (!settled) return
    if (!leveled) { setWarn('天平还没调好。先把游码归零、调平衡螺母，不然称出来不准'); return }
    if (!placed) { setPlaced(true); return }
    if (trying) { setOn(on.filter(k => k !== W.steps[i].i)); setTrying(false); setI(i + 1); return }
    if (i >= N) return
    setOn([...on, W.steps[i].i]); if (W.steps[i].keep) setI(i + 1); else setTrying(true)
  }
  const slide = () => { if (!settled || slid) return; if (!tried) { setWarn('先加砝码。砝码不够用了，最后才移动游码'); return } setSlid(true) }
  const resetAll = () => { setZeroed(false); setLeveled(false); setPlaced(false); setOn([]); setI(0); setTrying(false); setSlid(false); setWarn(null); T.reset() }
  const stepLabel = !placed ? '铜块放左盘' : trying ? `取下 ${W.steps[i].w} g` : i < N ? `加 ${W.steps[i].w} g 砝码` : '砝码试完了'
  const { hint, next }: { hint: string; next: 'adjust' | 'step' | 'slide' | null } = warn ? { hint: warn, next: null }
    : !settled ? { hint: slid ? '游码往右移，横梁慢慢回到水平…' : '等天平停稳…', next: null }
    : !zeroed ? { hint: `天平放在水平的台面上。游码还停在 ${START.rider} g 处：按“游码归零”`, next: 'adjust' }
    : !leveled ? { hint: `指针${pointerSays(t)}，左边沉。把平衡螺母向右调：按“调平衡螺母”`, next: 'adjust' }
    : !placed ? { hint: '指针指在分度盘中央，调好了。左物右码：按“铜块放左盘”', next: 'step' }
    : trying ? { hint: `右盘下沉，指针${pointerSays(t)}：${W.steps[i].w} g 太重了，取下它`, next: 'step' }
    : i < N ? { hint: `${on.length ? `指针${pointerSays(t)}，砝码还不够。` : ''}从大到小试：加 ${W.steps[i].w} g`, next: 'step' }
    : !slid ? { hint: '还差一点，可最小的砝码也用过了：按“移动游码”', next: 'slide' }
    : { hint: `平衡了。质量 = 砝码 ${W.sum} g + 游码 ${W.rider.toFixed(1)} g = ${reading(on, rider).toFixed(1)} g`, next: null }
  const B = BASE2, done = slid && settled
  const labels: Label[] = [
    { id: 'm', at: [B[0], TOP + 1.66, B[2]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: done ? 1 : 0 }, children: <><small>铜块的质量</small>{reading(on, rider).toFixed(1)} g</> },
    { id: 'dial', at: [B[0] + 0.24, TOP + 1.36, B[2]], name: true, className: 'scene-name -translate-y-1/2', children: '分度盘和指针' },
    { id: 'nut', at: [B[0] - 1.06, TOP + PIVOT - 0.1, B[2]], ax: 1, name: true, className: 'scene-name', children: '平衡螺母' },
    { id: 'rider', at: [B[0] - 0.2, TOP + PIVOT - 0.22, B[2] + 0.1], ax: 0.5, name: true, className: 'scene-name', children: '标尺和游码' },
    { id: 'box', at: [BOX2[0], TOP + 0.62, BOX2[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '砝码和镊子' },
  ]
  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title="质量与密度" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="托盘天平"
      stage={<Room at="s2" labels={labels}>
        <Balance at={B} left={left} right={right} rider={rider} nut={-0.7 + nut * 0.9} live={live} />
        <WeightSet box={BOX2} base={B} on={on} live={live} />
        <Carry at={placed ? panAt(B, -1) : [B[0] - 1.5, TOP, B[2] + 0.5]} ride={placed ? 'L' : null} live={live} grip={[2.5 * CM, 1.3 * CM]}><Block kind="cu" size={[2.5, 2, 2]} /></Carry>
      </Room>}
      lesson={<LessonBlock no="2" title="用天平称质量" concept="左物右码，砝码加游码就是质量" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>实验室里用<b className="text-white">托盘天平</b>测质量。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>把天平放在水平台上，游码移到标尺左端的零刻度线处</li>
            <li>调节横梁两端的平衡螺母，使指针指在分度盘的中央：指针偏左向右调，偏右向左调</li>
            <li>被测物体放左盘；用镊子向右盘加减砝码，从大到小试，再移动游码，直到横梁恢复平衡</li>
            <li>物体的质量 = 右盘砝码的总质量 + 游码在标尺上所对的刻度值</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">被测的质量不能超过天平的称量；砝码要用镊子夹，不能用手拿；潮湿的物品和化学药品不能直接放在托盘上。称的过程中不能再动平衡螺母。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">称出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">铜块的质量是 {reading(W.on, W.rider).toFixed(1)} g</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">先调平，再左物右码；砝码从大到小试，最后移游码。读数是砝码 {W.sum} g 加游码 {W.rider.toFixed(1)} g。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">铜块的质量</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{done ? reading(on, rider).toFixed(1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">指针和标尺</h2>
          <BalanceView t={t} rider={rider} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="右盘砝码" value={`${reading(on, 0)} g`} unit={weightsText(on)} />
            <ParamTile symbol="游码" value={`${rider.toFixed(1)} g`} unit="读游码左边对着的刻度" />
          </div>
          <p className="mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/70">{!placed ? '左盘是空的。' : t > 0.03 ? '左盘沉：砝码比铜块轻。' : t < -0.03 ? '右盘沉：砝码比铜块重。' : '横梁水平：两边一样重。'}</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'adjust'} onClick={adjust} disabled={leveled || !settled}>{zeroed ? '调平衡螺母' : '游码归零'}</LabButton>
        <LabButton primary={next !== 'slide'} pulse={next === 'step'} onClick={step} disabled={!settled || (placed && tried)}>{stepLabel}</LabButton>
        <LabButton primary={next === 'slide'} pulse={next === 'slide'} onClick={slide} disabled={!settled || slid}>移动游码</LabButton>
      </>}
      extras={null}
    />
  )
}
