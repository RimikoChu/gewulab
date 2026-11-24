// 板块运动 · 第 5 课 大陆和大陆相撞：印度和亚洲。印度洋板块带着印度往北推，两块大陆之间的海洋越来越窄，最后两块大陆撞在一起；
// 地壳被挤得又厚又高，升起喜马拉雅山和青藏高原。山上的岩层原来是海底的沉积物，里面有海洋生物的化石。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { EVEREST, INDIA_RATE, TIBET, peakAt } from './physics'
import { X, heightAt, indiaShift } from './shape'
import { VOICE } from './voice'
import { DAYLIGHT, SPOT, type Want } from './world'

const TASKS: Task[] = [
  { id: 'close', text: '让印度洋板块向北推进', note: '两块大陆之间的海洋越来越窄，洋底俯冲到亚洲下面，最后海洋消失' },
  { id: 'rise', text: '继续挤压', note: '两块大陆撞在一起，地壳被挤得又厚又高，升起喜马拉雅山' },
  { id: 'fossil', text: '在山上的岩层里找一找', note: '喜马拉雅山的岩层里有海洋生物的化石：这里曾经是海洋' },
]

export default function Lesson5() {
  const [goal, setGoal] = useState(0)
  const c = useSlide(goal, 0.1), moving = Math.abs(c - goal) > 1e-3
  const [look, setLook] = useState(false)
  const fossil = useSlide(look ? 1 : 0, 0.8)
  const T = useTasks('gewu:plate:5', TASKS)
  useEffect(() => { if (moving) return; T.check(id => (id === 'close' && goal >= 0.5) || (id === 'rise' && goal >= 1)) }, [moving, goal])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (fossil > 0.99) T.check(id => id === 'fossil') }, [fossil > 0.99])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setGoal(0); setLook(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'push' | 'look' | null } = (() => {
    if (!task) return { hint: '都做完了。大陆和大陆相撞，挤出高大的山脉。', next: null }
    if (moving) return { hint: c < 0.5 ? '印度一点点往北靠，中间的海洋越来越窄…' : '两块大陆挤在一起，地壳越来越厚，山越升越高…', next: null }
    if (task.id === 'close') return { hint: '让印度洋板块带着印度向北推进', next: 'push' }
    if (task.id === 'rise') return { hint: '印度撞上了亚洲。继续挤压', next: 'push' }
    return fossil > 0 ? { hint: '看山上的岩层…', next: null } : { hint: '在山上的岩层里找一找，有没有化石', next: 'look' }
  })()

  const peak = peakAt(c), off = indiaShift(c), peakX = X.suture - 6, ph = heightAt(peakX, 0, { rift: 1, collide: c }, peak)
  const labels: Label[] = [
    { id: 'pk', at: [peakX, ph + 0.8, 0], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: peak > 100 ? 1 : 0 }, children: <><small>最高峰</small>{peak > EVEREST - 1 ? EVEREST.toFixed(2) : Math.round(peak).toLocaleString('en-US')} m</> },
    { id: 'in', at: [X.suture - 18 + off - 24 * Math.max(0, (c - 0.5) * 2), 3.4, 0], ax: 0.5, className: 'scene-tag -translate-y-full', children: '印度（印度洋板块）' },
    { id: 'as', at: [X.suture + 6, 10.5, 0], ax: 0.5, className: 'scene-tag -translate-y-full', children: '亚洲（亚欧板块）' },
    { id: 'sea', at: [X.suture - 14 + off / 2, -1.2, 0], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: c < 0.42 ? 1 : 0 }, children: '海洋' },
    ...(c > 0.9 ? [{ id: 'tb', at: [X.suture + 40, 3.2, 0] as [number, number, number], ax: 0.5, className: 'scene-name -translate-y-full', children: '青藏高原' }] : []),
    { id: 'fo', at: [peakX - 2, ph - 3, 0.3], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: fossil > 0.5 ? 1 : 0 }, children: '海洋生物化石（菊石）' },
    { id: 'ns', at: [X.suture - 22, -30, 0], ax: 0.5, className: 'scene-name -translate-y-full', children: '← 南　　北 →' },
  ]
  const s = SPOT.collide
  return (
    <LabShell narration={voiced(NARRATION['5'], VOICE)} title="板块运动" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="印度洋板块"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...DAYLIGHT} world={{ shape: { rift: 1, collide: c }, peakM: peak, fossil }}>
        {moving && <ForceArrow tip={[X.suture - 20 + off, 3.6, 0.5]} dir={[1, 0, 0]} len={14} color="#ffe9a8" thick={1.8} />}
      </LabStage>}
      lesson={<LessonBlock no="5" title="大陆和大陆相撞" concept="大陆相撞，挤出高大的山脉" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>两个板块彼此靠近、挤压的地方叫<b className="text-white">碰撞</b>。两块大陆相撞，谁也沉不下去，地壳被挤压、抬升，形成高大的山脉。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">喜马拉雅山：</b>印度洋板块和亚欧板块碰撞挤压形成，主峰珠穆朗玛峰海拔 {EVEREST} 米</li>
            <li><b className="text-[#7fe3d4]">青藏高原：</b>也被挤压抬升，平均海拔 {TIBET} 米以上</li>
            <li><b className="text-[#7fe3d4]">海洋生物化石：</b>说明这里很久以前是海洋</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">这一段剖面左边是南、右边是北。印度洋板块现在仍以每年几厘米的速度向北推进，喜马拉雅山还在缓慢升高。画面竖直方向放大了很多倍，示意。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">喜马拉雅山升起来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">大陆和大陆相撞，挤出高大的山脉</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">印度洋板块和亚欧板块碰撞，海洋消失，海底的岩层被抬上了世界最高峰。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">最高峰的海拔</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{peak < 1 ? '—' : peak > EVEREST - 1 ? EVEREST.toFixed(2) : Math.round(peak)}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="两块大陆" value={c < 0.47 ? '隔着海洋' : '撞在一起'} unit={c < 0.47 ? '中间的洋底往下俯冲' : '地壳挤压、加厚'} />
            <ParamTile symbol="v" value={`约 ${INDIA_RATE}`} unit="cm/年 · 向北推进" />
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">珠穆朗玛峰 {EVEREST} 米（2020 年测定）；青藏高原平均海拔 {TIBET} 米以上。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'push'} pulse={next === 'push'} onClick={() => setGoal(g => (g < 0.5 ? 0.5 : 1))} disabled={moving || goal >= 1}>{goal < 0.5 ? '向北推进' : '继续挤压'}</LabButton>
        <LabButton primary={next === 'look'} pulse={next === 'look'} onClick={() => setLook(true)} disabled={moving || goal < 1 || look}>看山上的岩层</LabButton>
      </>}
      extras={null}
    />
  )
}
