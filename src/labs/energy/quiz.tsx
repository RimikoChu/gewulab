// 功和机械能 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座游乐园的全景。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '下面哪种情形里，人对物体做了功？', options: ['用力推一块大石头，没有推动', '提着水桶在水平路上匀速走', '把一箱书从地上搬到桌上', '踢出去的足球在草地上滚'], answer: 2, why: '把书搬到桌上：有向上的力，书也向上移动了。推不动是有力没有距离；提桶水平走，力向上而移动是水平的；球滚动时脚已经不再对它用力。' },
  { lesson: '1', q: '叉车端着货箱在水平地面上匀速开了 3 m，叉车对货箱的举力：', options: ['做了功，因为货箱移动了', '做了功，因为举力很大', '没有做功，因为货箱没有在举力的方向上移动', '没有做功，因为是匀速的'], answer: 2, why: '举力竖直向上，货箱是水平移动的，在举力的方向上没有移动距离，所以举力不做功。和快慢、力的大小无关。' },
  { lesson: '2', q: '用 50 N 的水平推力，推着重 200 N 的箱子在水平地面上前进了 4 m。推力做的功是：', options: ['200 J', '800 J', '1000 J', '0 J'], answer: 0, why: 'W = F s = 50 N × 4 m = 200 J。要用推力乘以沿推力方向移动的距离；重力 200 N 是竖直方向的，箱子在竖直方向上没有移动。' },
  { lesson: '3', q: '甲、乙两台机器，甲的功率比乙大。这说明：', options: ['甲做的功一定比乙多', '甲做功一定比乙快', '甲用的时间一定比乙短', '甲用的力一定比乙大'], answer: 1, why: '功率表示做功的快慢。功率大只说明单位时间里做的功多；做功的多少还要看做了多长时间。' },
  { lesson: '3', q: '升降机在 4 s 内把重 1960 N 的货物匀速升高 6 m，它对货物做功的功率是：', options: ['490 W', '2940 W', '11760 W', '47040 W'], answer: 1, why: 'W = G h = 1960 N × 6 m = 11760 J，P = W ÷ t = 11760 J ÷ 4 s = 2940 W。' },
  { lesson: '4', q: '探究动能跟哪些因素有关时，让同一只钢球从斜面上不同的高度滚下，是为了研究动能和什么的关系？', options: ['质量', '速度', '高度', '木块的质量'], answer: 1, why: '同一只球，质量不变；从不同高度滚下，到达水平面时的速度不同。所以研究的是动能和速度的关系。' },
  { lesson: '5', q: '下面哪个物体具有弹性势能？', options: ['举在高处的重锤', '在水平轨道上行驶的列车', '被压缩的弹簧', '静止在地面上的木箱'], answer: 2, why: '弹性势能是物体由于发生弹性形变而具有的能。被压缩的弹簧发生了弹性形变。举高的重锤具有的是重力势能，行驶的列车具有的是动能。' },
  { lesson: '6', q: '过山车从坡顶冲向谷底的过程中（不计摩擦和空气阻力）：', options: ['动能减小，重力势能增大', '动能增大，重力势能减小', '动能和重力势能都增大', '动能和重力势能都减小'], answer: 1, why: '下坡时高度降低，重力势能减小；速度变大，动能增大。重力势能转化为动能。' },
  { lesson: '7', q: '荡起来的秋千，如果没有人再推，会越荡越低，最后停下来。这个过程中：', options: ['机械能守恒', '机械能增加', '机械能减少，转化成了内能', '能量消失了'], answer: 2, why: '秋千要克服空气阻力和摩擦做功，一部分机械能转化为内能，所以机械能减少。能量不会消失，只是转化成了别的形式。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:energy:q'

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
  const hint = mine === null ? '选一个答案' : mine === q.answer ? '答对了' : `答错了：可以回到第 ${q.lesson} 课再做一遍`
  return (
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="功和机械能" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="over" cur={[]} labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。功和机械能你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>看每题的讲解</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="flex items-center justify-between text-[12.5px] text-white/55"><span>第 {i + 1} / {QS.length} 题 · 对应第 {q.lesson} 课</span><span className="tabular-nums">答对 {right} / {answered}</span></div>
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
        {mine !== null && mine !== q.answer && <LabButton onClick={() => goLesson(q.lesson)}>回第 {q.lesson} 课</LabButton>}
      </>}
      extras={null}
    />
  )
}
