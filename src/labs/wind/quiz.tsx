// 热力环流和风 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座海滨城市的全景。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LabStage } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { SPOT, skyFor, type Want } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '民航飞机常在平流层底部飞行，主要是因为平流层：', options: ['气温随高度降低，对流旺盛', '大气以水平运动为主，天气晴朗', '有电离层，能反射无线电', '离地面近，安全'], answer: 1, why: '平流层气温下低上高，大气稳定，以水平运动为主，云雨很少，适合飞行。云雨天气都发生在对流层。' },
  { lesson: '2', q: '近地面大气主要的、直接的热源是：', options: ['太阳辐射', '地面', '大气逆辐射', '臭氧层'], answer: 1, why: '大气直接吸收的太阳辐射很少。地面吸收太阳辐射增温，再放出长波辐射，近地面大气吸收它而增温。' },
  { lesson: '3', q: '深秋晴朗的夜晚容易出现霜冻，主要原因是：', options: ['太阳辐射弱', '大气逆辐射弱，地面散热多', '地面辐射弱', '大气吸收的太阳辐射少'], answer: 1, why: '晴夜云少，大气逆辐射弱，还给地面的热量少，地面降温多，容易出现霜冻。' },
  { lesson: '3', q: '冬季塑料大棚里比外面暖，主要因为棚膜：', options: ['吸收了大量太阳辐射', '能放出热量', '让太阳短波辐射进来，又挡住地面长波辐射', '挡住了太阳辐射'], answer: 2, why: '棚膜让太阳短波辐射进来，又把棚里地面放出的长波辐射挡在棚里，热量散失少。' },
  { lesson: '4', q: '同一高度上，等压面向上凸起的地方是：', options: ['高压', '低压', '气温最高的地方', '无法判断'], answer: 0, why: '等压面上凸，说明那里同一高度上的气压比四周高：上凸为高压，下凹为低压。' },
  { lesson: '5', q: '北半球高空，只受水平气压梯度力和地转偏向力，风向最终：', options: ['垂直于等压线，指向低压', '和等压线平行', '和等压线斜交', '指向高压'], answer: 1, why: '风不断右偏，直到地转偏向力和水平气压梯度力平衡，风向和等压线平行。' },
  { lesson: '6', q: '关于近地面的风，说法正确的是：', options: ['风向和等压线平行', '摩擦力越大，风向和等压线的夹角越小', '风向和等压线斜交，摩擦越大夹角越大', '摩擦力不影响风速'], answer: 2, why: '近地面还有摩擦力：风向斜穿等压线；摩擦越大，风速越小，夹角越大。' },
  { lesson: '7', q: '晴朗的白天，海边近地面通常吹：', options: ['从陆地吹向海洋的陆风', '从海洋吹向陆地的海风', '沿海岸线吹的风', '没有风'], answer: 1, why: '白天陆地升温快，陆地上空气上升成低压，海面是高压，风从海洋吹向陆地，叫海风。' },
  { lesson: 'x', q: '为减轻城市热岛环流带来的污染，有大量烟尘的工厂应建在：', options: ['市中心', '城市风下沉的近郊', '城市风的范围以外', '城区上风的近郊'], answer: 2, why: '建在城市风的范围以内，烟尘会被近地面的城市风带回城里；要建在范围以外。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:wind:q'

export default function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<(number | null)[]>(() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) && a.length === QS.length ? a : QS.map(() => null) } catch { return QS.map(() => null) } })
  const [finale, setFinale] = useState(false)
  const q = QS[i], mine = picked[i]
  const answered = picked.filter(x => x !== null).length, right = picked.filter((x, k) => x === QS[k].answer).length
  const choose = (k: number) => {
    if (mine !== null) return
    const n = picked.map((x, j) => j === i ? k : x); setPicked(n); try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* 忽略 */ }
    if (n.every(x => x !== null)) setTimeout(() => setFinale(true), 1400)
  }
  const resetAll = () => { setPicked(QS.map(() => null)); setI(0); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  const done = { all: answered === QS.length, pass: right >= 7 }
  const hint = mine === null ? '选一个答案' : mine === q.answer ? '答对了' : `答错了：可以回到${q.lesson === 'x' ? '拓展课' : `第 ${q.lesson} 课`}再做一遍`
  const s = SPOT.overview
  return (
    <LabShell narration={voiced(NARRATION['q'], VOICE)} autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="热力环流和风" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<LabStage<Want> labels={[]} target={s.target} span={s.span} view={s.view} {...skyFor(1, [400, 2000])} world={{ day: 1 }}>{null}</LabStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。热力环流和风你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="flex items-center justify-between text-[12.5px] text-white/55"><span>第 {i + 1} / {QS.length} 题 · 对应{q.lesson === 'x' ? '拓展课' : `第 ${q.lesson} 课`}</span><span className="tabular-nums">答对 {right} / {answered}</span></div>
          <div className="mt-2 flex gap-1">{QS.map((x, k) => <button key={k} onClick={() => setI(k)} aria-label={`第 ${k + 1} 题`} className={cn('h-1.5 flex-1 rounded-full', picked[k] === null ? 'bg-white/15' : picked[k] === x.answer ? 'bg-[#35c7b3]' : 'bg-[#ff6b6b]', k === i && 'ring-2 ring-white/60')} />)}</div>
          <p className="mt-4 text-[16px] leading-relaxed font-medium">{q.q}</p>
          <div className="mt-4 flex flex-col gap-2">
            {q.options.map((o, k) => {
              const isRight = mine !== null && k === q.answer, isWrong = mine === k && k !== q.answer
              return (
                <button key={k} onClick={() => choose(k)} disabled={mine !== null}
                  className={cn('flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition-colors', isRight ? 'bg-[#35c7b3]/25 text-white' : isWrong ? 'bg-[#ff6b6b]/25 text-white' : mine !== null ? 'bg-white/6 text-white/50' : 'bg-white/10 hover:bg-white/18')}>
                  <span className={cn('grid size-6 flex-none place-items-center rounded-full text-[13px] font-semibold', isRight ? 'bg-[#35c7b3] text-[#06231f]' : isWrong ? 'bg-[#ff6b6b] text-white' : 'bg-white/12')}>{isRight ? <Check className="size-3.5" strokeWidth={3.5} /> : isWrong ? <X className="size-3.5" strokeWidth={3.5} /> : 'ABCD'[k]}</span>{o}
                </button>
              )
            })}
          </div>
          {mine !== null && <p className="hint-in mt-4 rounded-xl bg-white/8 px-3.5 py-3 text-[14px] leading-relaxed text-white/85">{q.why}</p>}
        </Glass>
      }
      actions={<>
        <LabButton onClick={() => setI(k => Math.max(0, k - 1))} disabled={i === 0}><ArrowLeft className="size-4" />上一题</LabButton>
        <LabButton primary={mine !== null} pulse={mine !== null && i < QS.length - 1} onClick={() => setI(k => Math.min(QS.length - 1, k + 1))} disabled={i === QS.length - 1}>下一题<ArrowRight className="size-4" /></LabButton>
        {mine !== null && mine !== q.answer && <LabButton onClick={() => goLesson(q.lesson)}>回{q.lesson === 'x' ? '拓展课' : `第 ${q.lesson} 课`}</LabButton>}
      </>}
      extras={null}
    />
  )
}
