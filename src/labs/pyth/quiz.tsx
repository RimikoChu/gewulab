// 勾股定理 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座广场。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Place } from './parts'
import { approx, fmtLen, hyp, ladder, leg, rootOf, zhao } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const LD = ladder(), Z = zhao(5, 12)
const QS: Q[] = [
  { lesson: '1', q: '直角三角形两条直角边上的正方形面积分别是 9 和 16，斜边上的正方形面积是多少？', options: ['7', '25', '5', '144'], answer: 1, why: '两直角边上的正方形面积之和等于斜边上的正方形面积：9 + 16 = 25。5 是斜边的长，不是面积。' },
  { lesson: '2', q: '拼图证明里，两种摆法空出来的面积为什么相等？', options: ['三角板换小了', '木框和四块三角板都没变，空出的都是“木框面积 − 四块三角板面积”', '第二种摆法把三角板转了方向', '只是凑巧'], answer: 1, why: '挪动三角板只改变位置，不改变面积；木框也没变，所以两次空出来的面积一样：c² = a² + b²。' },
  { lesson: '3', q: `赵爽弦图中，直角三角形的两条直角边是 5 和 12，中间小正方形的面积是多少？`, options: ['7', `${12 * 12 - 5 * 5}`, `${Z.inner}`, '17'], answer: 2, why: `小正方形的边长是 b − a = 12 − 5 = 7，面积是 (b − a)² = ${Z.inner}，不是 b² − a²。大正方形 4 × ${Z.tri} + ${Z.inner} = ${Z.big}。` },
  { lesson: '4', q: '直角三角形的两条直角边分别是 6 和 8，斜边是多少？', options: ['14', '10', '√14', '48'], answer: 1, why: `c = √(6² + 8²) = √100 = ${hyp(6, 8)}。斜边不是两条直角边相加。` },
  { lesson: '5', q: '直角三角形的斜边是 13，一条直角边是 5，另一条直角边是多少？', options: ['12', '18', '8', '√194'], answer: 0, why: `b = √(13² − 5²) = √144 = ${leg(13, 5)}。已知斜边求直角边，用减法。` },
  { lesson: '5', q: '3 m 长的梯子斜靠在墙上，顶端离地 2.5 m。顶端沿墙下滑 0.5 m，梯脚外移多少？', options: ['正好 0.5 m', '约 0.58 m', '约 0.42 m', '不动'], answer: 1, why: `梯脚到墙从 √2.75 ≈ ${approx(LD.x0)} m 变成 √5 ≈ ${approx(LD.x1)} m，外移约 ${approx(LD.move)} m，不是 0.5 m。` },
  { lesson: '6', q: '要在数轴上画出表示 √5 的点，可以先画一个直角三角形，它的两条直角边是', options: ['1 和 4', '2 和 3', '1 和 2', '2 和 2'], answer: 2, why: `1² + 2² = 5，斜边是 ${rootOf(5)}。1 和 4 得到的是 √17，2 和 3 得到的是 √13，2 和 2 得到的是 ${rootOf(8)}。` },
  { lesson: '7', q: '下面哪一组数作为三角形的三边长，能构成直角三角形？', options: ['4、5、6', '5、12、13', '2、3、4', '1、2、3'], answer: 1, why: `5² + 12² = 25 + 144 = 169 = 13²。其余几组都不满足 a² + b² = c²（1、2、3 连三角形都围不成）。3、4、5 和 5、12、13 都是勾股数。` },
  { lesson: '4', q: '一个直角三角形的两条边长是 3 和 4，第三条边长是多少？', options: ['5', '√7', '5 或 √7', '7'], answer: 2, why: `没说哪条是斜边：4 是直角边时，第三边是斜边 ${fmtLen(25)}；4 是斜边时，第三边是直角边 √(4² − 3²) = ${rootOf(7)}。两种都要算。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:pyth:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="勾股定理" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。勾股定理你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
