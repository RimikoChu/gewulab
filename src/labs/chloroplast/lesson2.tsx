// 光反应和暗反应 · 第 2 课 绿叶中色素的提取和分离：研磨、过滤得到滤液，画滤液细线，纸层析分出四条色素带。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { STRIP } from './gear'
import { useTween, type V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { GREEN_LEAF, PIGMENTS, REAGENTS, bandsTopDown, groupShare, widestBand } from './physics'
import { LEAN, MORTAR, O2, RACK, STRIP_IN, Scene2, TILE } from './scene2'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { M, Place } from './world'

const TASKS: Task[] = [
  { id: 'extract', text: '研磨绿叶，过滤，得到滤液', note: '色素溶解在无水乙醇里，滤液是深绿色的' },
  { id: 'line', text: '在滤纸条上画一条滤液细线', note: '线要细、要直，画在离底端约 1 cm 处' },
  { id: 'run', text: '把滤纸条插入层析液，等色素分开', note: '滤纸条上出现了四条色素带' },
]

export default function Lesson2() {
  const [step, setStep] = useState(0)          // 0 没开始；1 研磨过滤；2 画线；3 层析
  const [jump, setJump] = useState(false)
  const grind = useTween(step >= 1 ? 1 : 0, 0.3, jump), pour = useTween(step >= 1 && grind.done ? 1 : 0, 0.22, jump)
  const line = useTween(step >= 2 ? 1 : 0, 0.4, jump), dip = useTween(step >= 3 ? 1 : 0, 0.5, jump), run = useTween(step >= 3 && dip.done ? 1 : 0, 0.11, jump)
  const [, tick] = useState(0)
  const moving = [grind, pour, line, dip, run].some(x => !x.done) || (step >= 1 && grind.done && pour.at !== 1) || (step >= 3 && dip.done && run.at !== 1)
  useEffect(() => { if (!moving) return; const t = setInterval(() => tick(n => n + 1), 50); return () => clearInterval(t) }, [moving])
  const T = useTasks('gewu:chloroplast:2', TASKS)
  const extracted = step >= 1 && pour.at === 1 && pour.done, lined = step >= 2 && line.done, ran = step >= 3 && run.at === 1 && run.done
  useEffect(() => { T.check(id => id === 'extract' ? extracted : id === 'line' ? lined : ran) }, [extracted, lined, ran])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setJump(true); setStep(0); T.reset(); setTimeout(() => setJump(false), 60) }
  const task = T.current
  const { hint, next }: { hint: string; next: number | null } = (() => {
    if (!task) return { hint: '从上到下：胡萝卜素、叶黄素、叶绿素 a、叶绿素 b。', next: null }
    if (step === 1 && !extracted) return { hint: grind.done ? '用单层尼龙布过滤，滤液流进试管…' : '迅速、充分地研磨…', next: null }
    if (step === 2 && !lined) return { hint: '用毛细吸管吸一点滤液，沿铅笔线画过去…', next: null }
    if (step === 3 && !ran) return { hint: dip.done ? '层析液沿滤纸往上爬，色素跟着走…' : '把滤纸条立进烧杯…', next: null }
    if (step === 0) return { hint: '研钵里是剪碎的菠菜叶，加了二氧化硅、碳酸钙和无水乙醇。按“研磨并过滤”', next: 1 }
    if (step === 1) return { hint: '试管里是深绿色的滤液。按“画滤液细线”', next: 2 }
    return { hint: '细线画好了。按“插入层析液”，注意液面不能没过细线', next: 3 }
  })()
  const at = step === 1 && grind.done && !extracted ? 'pour' : step <= 1 ? 'grind' : step === 2 || (step === 3 && !dip.done && dip.ref.current < 0.3) ? 'strip' : 'chroma'
  const bandY = (rf: number) => (STRIP.line + STRIP.travel * rf * run.ref.current) * M * Math.cos(LEAN)
  const o = (p: V3): V3 => [O2[0] + p[0], O2[1] + p[1], O2[2] + p[2]]
  const labels: Label[] = at === 'grind' ? [
    { id: 'eth', at: o([-0.29 * M, 0.17 * M, -0.11 * M]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '无水乙醇' },
    { id: 'si', at: o([-0.18 * M, 0.125 * M, -0.135 * M]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '二氧化硅 · 碳酸钙' },
    { id: 'mo', at: o([MORTAR[0], -0.012 * M, 0.12 * M]), ax: 0.5, name: true, className: 'scene-name translate-y-1', children: '研钵' },
    { id: 'fu', at: o([RACK[0] + 0.045 * M, 0.23 * M, RACK[2]]), name: true, className: 'scene-name translate-x-1 -translate-y-1/2', children: '漏斗 · 单层尼龙布' },
    ...(extracted ? [{ id: 'fl', at: o([RACK[0] + 0.02 * M, 0.06 * M, RACK[2] + 0.02 * M]) as V3, className: 'scene-tag key translate-x-2 -translate-y-1/2', children: '滤液' }] : []),
  ] : at === 'strip' ? [
    { id: 'st', at: o([TILE[0] + 0.01 * M, 0.02 * M, TILE[2] - 0.03 * M]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '滤纸条（下端剪去两角）' },
    ...(lined ? [{ id: 'ln', at: o([TILE[0] - STRIP.h / 2 * M + STRIP.line * M, 0.012 * M, TILE[2] + 0.012 * M]) as V3, ax: 0.5, className: 'scene-tag key translate-y-3', children: '滤液细线' }] : []),
  ] : [
    ...(run.ref.current > 0.55 ? bandsTopDown().map(p => ({ id: p.key, at: [O2[0] + STRIP_IN[0] + STRIP.w * M * 0.5, O2[1] + STRIP_IN[1] + bandY(p.rf), O2[2] + STRIP_IN[2] - Math.sin(-LEAN) * bandY(p.rf)] as V3, className: 'scene-tag translate-x-3 -translate-y-1/2', children: <><small>{p.hue}</small>{p.name}</> })) : []),
    { id: 'liq', at: o([STRIP_IN[0] - 0.04 * M, 0.006 * M, STRIP_IN[2] + 0.03 * M]), ax: 1, name: true, className: 'scene-name -translate-x-2 -translate-y-1/2', children: '层析液' },
  ]
  const top = bandsTopDown()
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="实验步骤"
      stage={<Place at={at} labels={labels}><Scene2 grind={grind.ref.current} pour={pour.ref.current} line={line.ref.current} dip={dip.ref.current} t={run.ref.current} leaf={GREEN_LEAF} /></Place>}
      lesson={<LessonBlock no="2" title="绿叶中色素的提取和分离" concept="四种色素在层析液中溶解度不同" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">提取</b>：绿叶中的色素能溶解在有机溶剂无水乙醇中，所以用无水乙醇提取。</p>
          <p className="mt-2"><b className="text-white">分离</b>：不同的色素在层析液中的溶解度不同，溶解度高的随层析液在滤纸上扩散得快，反之则慢。这样，色素就会随着层析液在滤纸上的扩散而分开。</p>
          <p className="mt-2">滤液细线不能触及层析液，否则色素会溶解在层析液里，滤纸条上得不到色素带。</p>
        </>} />}
      finale={T.finale && <Finale kicker="滤纸条上分出了四条色素带" title="从上到下：胡萝卜素、叶黄素、叶绿素 a、叶绿素 b" text={`扩散最快的是${top[0].name}（${top[0].hue}），最慢的是${top[3].name}（${top[3].hue}）；最宽的是${widestBand().name}，含量最多。叶绿素约占 ${Math.round(groupShare('叶绿素') * 4)}/4，类胡萝卜素约占 ${Math.round(groupShare('类胡萝卜素') * 4)}/4。`} notes="层析的过程放快了；色素带的位置和宽窄是示意，只表示先后和多少。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>研钵里加了什么</H>
          <div className="flex flex-col gap-1.5">
            <Row wide name="菠菜叶 5 g" text="剪碎" />
            {REAGENTS.map(r => <Row key={r.name} wide name={r.name} text={r.use} />)}
          </div>
          <H>滤纸条上的色素带（从上到下）</H>
          <div className="flex flex-col gap-1.5">{top.map((p, i) => <Row key={p.key} wide dot={p.color} name={p.name} text={ran ? `${p.hue}${i === 0 ? ' · 扩散最快' : i === 3 ? ' · 扩散最慢' : ''}${p.key === widestBand().key ? ' · 最宽' : ''}` : '—'} seen={ran} />)}</div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">{PIGMENTS.length} 种色素：叶绿素 a、叶绿素 b 合称叶绿素；胡萝卜素、叶黄素合称类胡萝卜素。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 1} onClick={() => setStep(1)} disabled={step !== 0}>研磨并过滤</LabButton>
        <LabButton pulse={next === 2} onClick={() => setStep(2)} disabled={step !== 1 || !extracted}>画滤液细线</LabButton>
        <LabButton primary pulse={next === 3} onClick={() => setStep(3)} disabled={step !== 2 || !lined}>插入层析液</LabButton>
      </>}
      extras={null}
    />
  )
}
