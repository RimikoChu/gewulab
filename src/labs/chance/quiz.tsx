// 概率 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整个车间。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Place } from './parts'
import { PAIRS, batchDefects, both5, fracText, wheelProb } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const SUM7 = PAIRS.filter(([a, b]) => a + b === 7).length
const QS: Q[] = [
  { lesson: '1', q: '下列事件中，哪一个是随机事件？', options: ['太阳从东方升起', '掷一枚骰子，点数是 7', '买一张彩票，中了奖', '从只装红球的箱子里摸到红球'], answer: 2, why: '中奖事先不能确定，可能发生也可能不发生，是随机事件。太阳东升、只装红球的箱子摸到红球是必然事件；点数是 7 是不可能事件。可能性很小的事也还是随机事件。' },
  { lesson: '2', q: '掷一枚质地均匀的骰子，点数大于 4 的概率是', options: ['1/6', '1/3', '1/2', '2/3'], answer: 1, why: `大于 4 的点数是 5 和 6，共 2 种，P = ${fracText(2, 6)}。“大于 4”不包括 4。` },
  { lesson: '3', q: '转盘分成 8 个大小相同的扇形，3 个是红色。转动后指针不指向红色的概率是', options: ['3/8', '5/8', '1/3', '3/5'], answer: 1, why: `不指向红色的有 5 格，P = ${wheelProb('notRed').text}；也可以用 1 − 3/8 = 5/8。3/5 是“不红比红”，不是概率。` },
  { lesson: '4', q: '同时掷两枚质地均匀的骰子，点数之和是 7 的概率是', options: ['1/12', '1/11', '1/6', '7/36'], answer: 2, why: `列表有 36 种等可能的结果，和是 7 的有 (1,6)(2,5)(3,4)(4,3)(5,2)(6,1) 共 ${SUM7} 种，P = ${fracText(SUM7, 36)}。(1,6) 和 (6,1) 是两种结果。点数和从 2 到 12 的 11 种不是等可能的。` },
  { lesson: '5', q: '箱里 1 个红球、2 个白球。摸一个不放回，再摸一个，两次都是白球的概率是', options: ['4/9', '1/3', '2/3', '1/9'], answer: 1, why: `不放回时第二次只剩 2 个球，树状图共 3 × 2 = 6 种，两次都白 2 种，P = ${both5('keep').text}。4/9 是放回时的答案。` },
  { lesson: '5', q: '连抛两次硬币，一次正面一次反面的概率是', options: ['1/4', '1/3', '1/2', '2/3'], answer: 2, why: '树状图有 正正、正反、反正、反反 4 种等可能的结果，一正一反有 2 种，P = 2/4 = 1/2。把“正反”“反正”当成一种，就会错算成 1/3。' },
  { lesson: '6', q: '小明抛了 10 次硬币，7 次正面朝上。下面说法正确的是', options: ['正面朝上的概率是 0.7', '再抛 10 次一定有 3 次正面', '频率是 0.7，次数太少，不能用它估计概率', '这枚硬币一定不均匀'], answer: 2, why: '10 次里 7 次，频率 0.7。次数少时频率波动大，要做大量试验，频率才稳定在概率附近。频率每轮都可能不一样，不能说“一定”。' },
  { lesson: '7', q: `抽检 1000 只碗，39 只是次品。估计一批 5000 只碗里大约有多少只次品？`, options: ['39 只', '约 200 只', '约 400 只', '约 4000 只'], answer: 1, why: `次品的频率 39 ÷ 1000 = 0.039，次品率约 0.04；5000 × 0.04 = 200，约 200 只。10000 只的那一批是 ${batchDefects(0.04)} 只。` },
  { lesson: '3', q: '从一副去掉大小王的 52 张扑克里任意抽一张，抽到红桃的概率是', options: ['1/52', '1/13', '1/4', '1/2'], answer: 2, why: `52 张里红桃 13 张，P = ${fracText(13, 52)}。1/2 是抽到红色（红桃或方块）的概率。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:chance:q'

export default function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<(number | null)[]>(() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) && a.length === QS.length ? a : QS.map(() => null) } catch { return QS.map(() => null) } })
  const [finale, setFinale] = useState(false)
  const q = QS[i], mine = picked[i]
  const answered = picked.filter(x => x !== null).length, right = picked.filter((x, k) => x === QS[k].answer).length
  const choose = (k: number) => {
    if (mine !== null) return
    const n = picked.map((x, j) => (j === i ? k : x)); setPicked(n); try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* 忽略 */ }
    if (n.every(x => x !== null)) setTimeout(() => setFinale(true), 1400)
  }
  const resetAll = () => { setPicked(QS.map(() => null)); setI(0); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  const done = { all: answered === QS.length, pass: right >= 7 }
  const hint = mine === null ? '选一个答案' : mine === q.answer ? '答对了' : `答错了：可以回到第 ${q.lesson} 课再做一遍`
  return (
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="概率" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <>
        <p className="text-[17px] leading-snug font-bold">九道题答对 {right} 道</p>
        <p className="mt-1 text-[14px] text-white/70">{right === QS.length ? '全对。概率初步你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
      </>}
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
