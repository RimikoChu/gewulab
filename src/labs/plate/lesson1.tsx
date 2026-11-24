// 板块运动 · 第 1 课 大陆漂移的猜想：太空里看大西洋两岸。把南美洲转回去和非洲拼在一起，看轮廓能不能吻合；
// 再看两岸的中龙化石和古老岩层能不能接上；最后让大陆漂回今天的位置。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { globeFacing, globePoint } from './globe'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { FOSSIL, OLD_ROCK, OPEN_AGE, ageAt, atlanticGap, driftSA } from './physics'
import type { LL } from './plates'
import { VOICE } from './voice'
import { SPACE, SPOT, type Want } from './world'

type Ev = 'shape' | 'fossil' | 'rock'
const EVS: { value: Ev; label: string }[] = [{ value: 'shape', label: '轮廓' }, { value: 'fossil', label: '化石' }, { value: 'rock', label: '岩层' }]
const TASKS: Task[] = [
  { id: 'fit', text: '把南美洲和非洲合拢', note: '南美洲东边凸出的一角，正好嵌进非洲西边凹进去的海湾' },
  { id: 'fossil', text: '看两岸的化石', note: '只能在淡水里生活的中龙，化石只出现在两岸正好接得上的地方' },
  { id: 'rock', text: '看两岸的岩层', note: '两岸相同年代的古老岩层也接得上' },
  { id: 'apart', text: '让大陆漂回今天的位置', note: '大陆原来连在一起，后来漂移分开，中间成了大西洋' },
]
const FACE: LL = [-14, -8]
const mid = (a: LL[]): LL => [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2]

export default function Lesson1() {
  const [goal, setGoal] = useState(0)
  const k = useSlide(goal, 0.25), moving = Math.abs(k - goal) > 1e-3
  const [ev, setEv] = useState<Ev>('shape')
  const T = useTasks('gewu:plate:1', TASKS)
  const move = (g: number) => {
    setGoal(g)
    setTimeout(() => T.check(id => (g === 1 && (id === 'fit' || (id === ev && !!T.done.fit))) || (g === 0 && id === 'apart' && !!T.done.fossil && !!T.done.rock)), 4100)
  }
  const pick = (v: Ev) => { setEv(v); if (goal === 1 && !moving) T.check(id => id === v) }
  const resetAll = () => { setGoal(0); setEv('shape'); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'join' | 'apart' | 'ev' | null } = (() => {
    if (!task) return { hint: '都做完了。大西洋两岸原来是连在一起的。', next: null }
    if (moving) return { hint: goal === 1 ? '南美洲一点点往非洲靠过去…' : '大陆漂移分开，大西洋越来越宽…', next: null }
    if (task.id === 'fit') return { hint: '把南美洲和非洲合拢，看两岸的轮廓', next: 'join' }
    if (task.id === 'apart') return { hint: '让大陆漂回今天的位置', next: 'apart' }
    if (goal !== 1) return { hint: '先把南美洲和非洲合拢', next: 'join' }
    return { hint: task.id === 'fossil' ? '证据换成“化石”，看两岸的中龙化石' : '证据换成“岩层”，看两岸的古老岩层', next: 'ev' }
  })()

  const sa = (p: LL) => driftSA(p, k)
  const tag = (id: string, p: LL, text: string, name = true): Label => ({ id, at: globePoint(p, FACE, 1.02), ax: 0.5, name, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: globeFacing(p, FACE) ? undefined : 0 }, children: text })
  const labels: Label[] = [
    tag('sa', sa([-58, -12]), '南美洲'), tag('af', [20, 4], '非洲'),
    { ...tag('at', [-24, -14], '大西洋', false), style: { opacity: k < 0.6 ? 1 : 0 } },
    ...(ev === 'fossil' ? [{ ...tag('f1', sa(mid(FOSSIL.sa)), '中龙化石', false), ax: 1.08, className: 'scene-tag -translate-y-1/2' }, { ...tag('f2', mid(FOSSIL.af), '中龙化石', false), ax: -0.08, className: 'scene-tag -translate-y-1/2' }] : []),
    ...(ev === 'rock' ? [{ ...tag('r1', sa(mid(OLD_ROCK.sa)), '古老岩层', false), ax: 1.1, className: 'scene-tag -translate-y-1/2' }, { ...tag('r2', mid(OLD_ROCK.af), '古老岩层', false), ax: -0.1, className: 'scene-tag -translate-y-1/2' }] : []),
  ]
  const s = SPOT.globe, gap = atlanticGap(k)
  return (
    <LabShell narration={voiced(NARRATION['1'], VOICE)} title="板块运动" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="大陆"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...SPACE} world={{ globe: { face: FACE, drift: k, evidence: ev === 'shape' ? null : ev } }}>{null}</LabStage>}
      lesson={<LessonBlock no="1" title="大陆漂移的猜想" concept="大陆原来连在一起，后来漂移分开" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>看世界地图时，有人发现大西洋两岸的轮廓很像，能拼在一起。由此提出了<b className="text-white">大陆漂移</b>的假说：大陆原来是连在一起的，后来分裂、漂移，才成了今天的样子。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">轮廓：</b>南美洲东岸和非洲西岸凹凸吻合</li>
            <li><b className="text-[#7fe3d4]">化石：</b>中龙是生活在淡水里的小型爬行动物，游不过大洋，它的化石却在两岸都有</li>
            <li><b className="text-[#7fe3d4]">岩层：</b>两岸相同年代的古老岩层，拼起来正好接上</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">提出这个假说的是德国科学家魏格纳。当时说不清大陆靠什么力量漂移，后来的海底扩张、板块构造学说才回答了这个问题。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三样证据都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">大陆原来连在一起，后来漂移分开</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">轮廓吻合、化石相同、岩层相接，都说明大西洋两岸曾经是一块大陆。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">大西洋的宽度（巴西纳塔尔到对面的非洲海岸）</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{gap < 50 ? 0 : `约 ${Math.round(gap / 100) * 100}`}<span className="ml-1 text-[15px] font-medium text-white/55">km</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="时间" value={k < 0.01 ? '今天' : `约 ${ageAt(k).toFixed(1)} 亿年前`} unit="大西洋开始张开前" />
            <ParamTile symbol="两岸" value={gap < 50 ? '拼合' : '分开'} unit={gap < 50 ? '轮廓吻合' : '中间是大西洋'} />
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">大西洋约从 {OPEN_AGE} 亿年前开始张开。这里按匀速漂移估算年代，示意。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'join'} pulse={next === 'join'} onClick={() => move(1)} disabled={moving || goal === 1}>合拢两岸</LabButton>
        <LabButton primary={next === 'apart'} pulse={next === 'apart'} onClick={() => move(0)} disabled={moving || goal === 0}>漂回今天</LabButton>
      </>}
      extras={
        <Control label="看哪一样证据">
          <Segmented label="证据" pulse={next === 'ev'} want={next === 'ev' ? (task?.id as Ev) : null} value={ev} onChange={v => pick(v as Ev)} disabled={moving} options={EVS} />
        </Control>
      }
    />
  )
}
