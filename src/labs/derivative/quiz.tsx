// 导数 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是从坡顶上空看下去的整段山路。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import At, { RoadCar } from './at'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '函数 f(x) = x² 从 x = 1 到 x = 3 的平均变化率是：', options: ['2', '4', '8', '9'], answer: 1, why: '(f(3) − f(1)) ÷ (3 − 1) = (9 − 1) ÷ 2 = 4。它是过 (1, 1)、(3, 9) 两点的割线的斜率。' },
  { lesson: '2', q: '物体的位移 s = 2t² + 1（m），t = 2 s 时的瞬时速度是：', options: ['4 m/s', '8 m/s', '9 m/s', '17 m/s'], answer: 1, why: '(s(2 + Δt) − s(2)) ÷ Δt = 8 + 2Δt，Δt → 0 时趋于 8，所以是 8 m/s。9 是 t = 2 时的位移，不是速度。' },
  { lesson: '3', q: '曲线 y = x³ 在点 (1, 1) 处的切线方程是：', options: ['y = 3x − 2', 'y = 3x + 1', 'y = x', 'y = 3x − 3'], answer: 0, why: 'y′ = 3x²，x = 1 时切线斜率 3。切线 y − 1 = 3(x − 1)，即 y = 3x − 2。' },
  { lesson: '4', q: '下面求导正确的是：', options: ['(cos x)′ = sin x', '(ln x)′ = x', '(sin x)′ = cos x', '(eˣ)′ = xeˣ⁻¹'], answer: 2, why: '(sin x)′ = cos x。(cos x)′ = −sin x，少了负号；(ln x)′ = 1/x；(eˣ)′ = eˣ，指数函数不能套幂函数的公式。' },
  { lesson: '4', q: '(sin 2x)′ 等于：', options: ['cos 2x', '2cos 2x', '−2cos 2x', '2cos x'], answer: 1, why: '令 u = 2x，y = sin u。y′ = cos u · u′ = cos 2x · 2 = 2cos 2x。只写 cos 2x 是漏乘了内层的导数。' },
  { lesson: '5', q: '函数 f(x) = x³ − 3x 的单调递减区间是：', options: ['(−∞, −1)', '(−1, 1)', '(1, +∞)', '(−∞, −1) 和 (1, +∞)'], answer: 1, why: 'f′(x) = 3x² − 3 = 3(x + 1)(x − 1)。f′(x) < 0 时 −1 < x < 1，这一段递减。' },
  { lesson: '6', q: '关于 f(x) = x³ 在 x = 0 处，说法正确的是：', options: ['取得极大值', '取得极小值', 'f′(0) = 0，但 0 不是极值点', 'f′(0) 不存在'], answer: 2, why: 'f′(x) = 3x²，f′(0) = 0；但 0 的左右两边 f′ 都大于 0，不变号，函数一直递增，所以不是极值点。导数为 0 不一定是极值点。' },
  { lesson: '6', q: 'f(x) = x³ − 3x 在 [0, 2] 上的最大值是：', options: ['0', '−2', '2', '18'], answer: 2, why: 'f′(x) = 3(x + 1)(x − 1)，[0, 2] 里只有 x = 1，f(1) = −2 是极小值。再比端点：f(0) = 0，f(2) = 2。最大值 2 在端点 x = 2。' },
  { lesson: '7', q: '容积一定、有盖的圆柱形罐子，用料最省时高 h 和底面半径 r 的关系是：', options: ['h = r', 'h = 2r', 'h = 3r', 'h = πr'], answer: 1, why: 'S = 2πr² + 2V/r，S′ = 4πr − 2V/r² = 0，得 V = 2πr³。又 V = πr²h，所以 h = 2r：高等于底面直径。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:derivative:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="导数" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<At at="over" labels={[]}><RoadCar x={420} /></At>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。导数你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
