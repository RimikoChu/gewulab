// 遗传和变异 · 第 4 课 孟德尔的杂交实验：在温室里给高茎豌豆的一朵花去雄、套袋，花成熟后用矮茎的花粉授粉、再套袋；
// 收下结的种子种进子一代畦，长出来全是高茎。
import { useEffect, useState } from 'react'
import { Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { HF } from './pea'
import { F1_N, cross, isTall, phenotype } from './physics'
import { FLOWER_AT, Pots, Work, inFlower } from './scene4'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { BED, POTS, Room } from './world'

const F1 = cross('DD', 'dd'), TALL = F1.every(isTall) ? F1_N : 0
const TASKS: Task[] = [
  { id: 'emasc', text: '花还没开，先去掉雄蕊', note: '去雄：不让这朵花自己的花粉落到柱头上' },
  { id: 'bag', text: '给去了雄的花套上纸袋', note: '套袋：挡住别的花粉' },
  { id: 'poll', text: '花成熟后，用矮茎的花粉授粉，再套袋', note: '花粉来自矮茎，这是人工杂交' },
  { id: 'f1', text: '种下这朵花结的种子，看子一代', note: `子一代 ${F1_N} 株全是${phenotype(F1[0])}` },
]
const STEP_NAME = ['去雄', '套袋', '授粉']
export default function Lesson4() {
  const [step, setStep] = useState(0)          // 下一步要做的：0 去雄，1 套袋，2 授粉，3 都做完
  const [sow, setSow] = useState(false)
  const T = useTasks('gewu:gene:4', TASKS)
  const e = useRun(step >= 1 ? 1 : 0, 4.2), b = useRun(step >= 2 ? 1 : 0, 1.6), p = useRun(step >= 3 ? 1 : 0, 5.2)
  const pod = useRun(sow ? 1 : 0, 3.2), grow = useRun(sow && pod >= 1 ? 1 : 0, 3.4)
  const busy = (step >= 1 && e < 1) || (step >= 2 && b < 1) || (step >= 3 && p < 1) || (sow && grow < 1)
  useEffect(() => { T.check(id => id === 'emasc' ? e >= 1 : id === 'bag' ? b >= 1 : id === 'poll' ? p >= 1 : grow >= 1) }, [e >= 1, b >= 1, p >= 1, grow >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setStep(0); setSow(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'step' | 'sow' | null } = (() => {
    if (!task) return { hint: '高茎和矮茎杂交，子一代全是高茎。', next: null }
    if (busy) return { hint: step === 1 && e < 1 ? '用镊子拨开龙骨瓣，夹出雄蕊…' : step === 2 && b < 1 ? '套上纸袋，扎紧袋口…' : step === 3 && p < 1 ? '取下纸袋，把矮茎的花粉涂在柱头上，再套上…' : pod < 1 ? '花谢了，子房长成豆荚…' : '种子种进子一代畦，长出来了…', next: null }
    if (step === 0) return { hint: '这是高茎豌豆上一朵还没开的花。按“去雄”', next: 'step' }
    if (step === 1) return { hint: '雄蕊去掉了。按“套袋”', next: 'step' }
    if (step === 2) return { hint: '过几天花开了，柱头成熟。按“授粉”', next: 'step' }
    return { hint: '授完粉了。按“种下种子”，看看子一代', next: 'sow' }
  })()
  const onFlower = !sow || pod < 1
  const labels: Label[] = onFlower ? [
    ...(step === 0 ? [{ id: 'k', at: inFlower(HF.keel), ax: 1, className: 'scene-tag -translate-x-6 translate-y-4', children: <><small>龙骨瓣里面</small>雄蕊和雌蕊</> }] : []),
    ...(e >= 1 && b <= 0 ? [{ id: 'st', at: inFlower(HF.stigma), ax: 0, className: 'scene-tag key translate-x-6 -translate-y-1/2', children: '只剩下雌蕊' }] : []),
    ...(p >= 1 && !sow ? [{ id: 'bag', at: [FLOWER_AT[0], FLOWER_AT[1] + 0.6, FLOWER_AT[2]] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>父本</small>矮茎 · <small>母本</small>高茎</> }] : []),
    { id: 'pt', at: [POTS.tall[0] - 2.4, 4, POTS.tall[1]], ax: 1, name: true, className: 'scene-name', children: '高茎' },
  ] : [
    { id: 'f1', at: [(BED.f1.x0 + BED.f1.x1) / 2, 22.5, BED.f1.z], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>子一代</small>{grow >= 1 ? `高茎 ${TALL} 株 · 矮茎 ${F1_N - TALL} 株` : '长出来了…'}</> },
  ]
  return (
    <LabShell title="遗传和变异" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="杂交"
      stage={<Room at={onFlower ? 'flower' : 'f1'} labels={labels} world={{ f1: grow, inside: onFlower ? 'gh' : null }}>
        <Pots />
        <Work e={e} b={b} p={p} pod={pod} />
      </Room>}
      lesson={<LessonBlock no="4" title="孟德尔的杂交实验" concept="高茎和矮茎杂交，子一代全是高茎" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>豌豆是<b className="text-white">自花传粉</b>的植物，而且是在花未开放时就完成了受粉（闭花受粉），所以自然状态下一般是纯种。</p>
          <p className="mt-2">要让两种豌豆杂交，就得人工授粉：在花未成熟时<b className="text-white">去雄</b>，<b className="text-white">套袋</b>；等雌蕊成熟，取另一株的花粉涂在柱头上，再套袋。</p>
          <p className="mt-2">孟德尔用纯种高茎和纯种矮茎杂交，子一代都是高茎。</p>
        </>} />}
      finale={T.finale && <Finale kicker="子一代长出来了" title="子一代全是高茎" text={`高茎（母本）和矮茎（父本）杂交，结出的种子种下去，长出的 ${F1_N} 株子一代全是高茎，没有矮茎。矮茎的性状到哪去了？下一课接着看。`} notes="那朵花是放大了画的；子一代畦的株数是示意。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">人工杂交</div>
          <div className="mt-1 text-center text-[24px] leading-tight font-bold">母本 高茎 × 父本 矮茎</div>
          <H>步骤</H>
          <div className="flex flex-col gap-1.5">
            <Row name="去雄" text="花未成熟时，去掉全部雄蕊" on={step === 0} seen={e >= 1} />
            <Row name="套袋" text="罩上纸袋，挡住别的花粉" on={step === 1} seen={b >= 1} />
            <Row name="授粉" text="雌蕊成熟后，涂上矮茎的花粉，再套袋" on={step === 2} seen={p >= 1} />
          </div>
          <H>子一代</H>
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="高茎" value={grow >= 1 ? String(TALL) : '—'} unit="株" />
            <ParamTile symbol="矮茎" value={grow >= 1 ? String(F1_N - TALL) : '—'} unit="株" />
          </div>
        </Card>
      }
      actions={<>
        <LabButton primary pulse={next === 'step'} onClick={() => setStep(s => Math.min(3, s + 1))} disabled={busy || step >= 3}>{STEP_NAME[Math.min(2, step)]}</LabButton>
        <LabButton pulse={next === 'sow'} onClick={() => setSow(true)} disabled={step < 3 || busy || sow}>种下种子</LabButton>
      </>}
      extras={null}
    />
  )
}
