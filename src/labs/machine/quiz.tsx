// 简单机械 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整个工地。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { classify, effort, groupForce, hooksN, lift, pct, ropeEnd, round } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const E = lift(4)
const QS: Q[] = [
  { lesson: '1', q: '关于力臂，下面哪种说法对？', options: ['力臂是支点到力的作用点的距离', '力臂是支点到力的作用线的距离', '力臂一定在杠杆上', '力的方向改变，力臂不变'], answer: 1, why: '力臂是从支点到力的作用线的垂直距离，不是到作用点的距离。作用点不变、方向一变，力臂就变；力臂也不一定落在杠杆上。' },
  { lesson: '2', q: `杠杆在水平位置平衡：左边第 2 格挂 3 只钩码（每只 ${hooksN(1)} N）。右边挂 2 只钩码，要挂在第几格才能再次平衡？`, options: ['第 2 格', '第 3 格', '第 4 格', '第 6 格'], answer: 1, why: `F₁l₁ = F₂l₂：${hooksN(3)} N × 2 格 = ${hooksN(2)} N × l₂，l₂ = ${effort(hooksN(3), 2, hooksN(2))} 格。` },
  { lesson: '2', q: '探究杠杆的平衡条件时，为什么要先调节杠杆在水平位置平衡？', options: ['这样杠杆更好看', '便于直接从杠杆上读出力臂', '使钩码的重力变小', '使支点受力变小'], answer: 1, why: '杠杆在水平位置平衡时，竖直向下的钩码拉力和杠杆垂直，支点到挂钩码处的距离就是力臂，可以直接读出；调平还能消除杠杆自重的影响。' },
  { lesson: '3', q: '杠杆在水平位置平衡时，弹簧测力计由竖直向上拉改为斜向上拉，仍使杠杆在水平位置平衡，测力计的示数会怎样？', options: ['变大', '变小', '不变', '先变小后变大'], answer: 0, why: '阻力和阻力臂不变；拉力方向变斜，动力臂变短，由 F₁l₁ = F₂l₂ 可知动力变大。' },
  { lesson: '4', q: '下列工具在正常使用时，属于费力杠杆的是哪一个？', options: ['撬棍', '钢丝钳', '钓鱼竿', '手推车'], answer: 2, why: `钓鱼竿的动力臂比阻力臂短，是${classify(0.3, 2)}：费了力，却省了距离。撬棍、钢丝钳、手推车都是省力杠杆。` },
  { lesson: '5', q: '旗杆顶上的滑轮是定滑轮。使用它的好处是什么？', options: ['省力', '省距离', '改变力的方向', '既省力又省距离'], answer: 2, why: '定滑轮实质是等臂杠杆，不省力也不省距离，但可以改变力的方向：在下面往下拉，旗子就往上升。' },
  { lesson: '6', q: `用 3 段绳子吊着动滑轮的滑轮组提起 300 N 的重物，不计滑轮重、绳重和摩擦，拉力多大？重物升高 2 m 时绳端移动多远？`, options: ['300 N，2 m', '150 N，4 m', '100 N，6 m', '100 N，2 m'], answer: 2, why: `F = G ÷ n = 300 N ÷ 3 = ${groupForce(300, 3)} N；s = n h = 3 × 2 m = ${ropeEnd(2, 3)} m。` },
  { lesson: '7', q: '用同一个滑轮组先后提起轻重不同的两个物体，提哪个时机械效率高？', options: ['提轻的', '提重的', '一样高', '无法判断'], answer: 1, why: '额外功（提动滑轮、克服摩擦）差不多不变，提的物体越重，有用功在总功里占的比例越大，机械效率越高。' },
  { lesson: '7', q: `用滑轮组把 ${E.G} N 的钩码匀速提升 ${E.h} m，拉力 ${E.F.toFixed(2)} N，绳端移动 ${round(E.s, 2)} m。机械效率约是多少？`, options: [pct(E.Wx / E.Wt), pct(E.eta), '100%', pct(E.F / E.G)], answer: 1, why: `W有 = G h = ${E.G} N × ${E.h} m = ${round(E.Wu, 2)} J，W总 = F s = ${E.F.toFixed(2)} N × ${round(E.s, 2)} m = ${round(E.Wt, 2)} J，η = W有 ÷ W总 ≈ ${pct(E.eta)}。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:machine:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="简单机械" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。简单机械你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
