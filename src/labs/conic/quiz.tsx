// 圆锥曲线 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是从广场上空斜着看整个观测站。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import At from './at'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '用一个平行于圆锥某条母线的平面去截圆锥（不过顶点），截口是：', options: ['圆', '椭圆', '抛物线', '双曲线'], answer: 2, why: '平面和轴的夹角正好等于母线和轴的夹角时，截口不闭合，也只切到一个圆锥，是抛物线。再陡一点，上下两个圆锥都切到，才是双曲线。' },
  { lesson: '2', q: '两定点 F₁、F₂ 相距 8。平面内到它们的距离之和等于 8 的点的轨迹是：', options: ['椭圆', '线段 F₁F₂', '圆', '不存在'], answer: 1, why: '椭圆要求距离之和大于 |F₁F₂|。和正好等于 |F₁F₂| 时，绳子被两颗钉子绷直了，笔尖只能在线段 F₁F₂ 上。' },
  { lesson: '3', q: '椭圆 x²/25 + y²/9 = 1 的焦点坐标是：', options: ['(±4, 0)', '(0, ±4)', '(±√34, 0)', '(±5, 0)'], answer: 0, why: 'a² = 25，b² = 9，c² = a² − b² = 16，c = 4。x² 下面的分母大，焦点在 x 轴上。把 c² 算成 a² + b² 是和双曲线记混了。' },
  { lesson: '3', q: '椭圆 x²/25 + y²/16 = 1 的离心率是：', options: ['4/5', '3/5', '3/4', '5/3'], answer: 1, why: 'a = 5，b = 4，c = 3，e = c/a = 3/5。4/5 是 b/a，不是离心率。椭圆的离心率在 0 和 1 之间。' },
  { lesson: '4', q: '双曲线 x²/16 − y²/9 = 1 的渐近线方程是：', options: ['y = ±(3/4)x', 'y = ±(4/3)x', 'y = ±(9/16)x', 'y = ±(5/4)x'], answer: 0, why: 'a = 4，b = 3，渐近线是 y = ±(b/a)x = ±(3/4)x。5/4 是离心率 c/a。' },
  { lesson: '4', q: '双曲线 x²/9 − y²/16 = 1 上一点 P 到焦点 F₁ 的距离是 10，那么 P 到 F₂ 的距离是：', options: ['4', '16', '4 或 16', '6'], answer: 2, why: '定义里是差的绝对值：||PF₁| − |PF₂|| = 2a = 6，所以 |PF₂| = 4 或 16。P 在哪一支上没有说，两个都可能（都不小于 c − a = 2）。' },
  { lesson: '5', q: '抛物线 y² = 8x 的焦点和准线是：', options: ['(2, 0)，x = −2', '(4, 0)，x = −4', '(0, 2)，y = −2', '(2, 0)，x = 2'], answer: 0, why: 'y² = 2px 里 2p = 8，p = 4。焦点是 (p/2, 0) = (2, 0)，准线是 x = −p/2 = −2。焦点和准线分在顶点两侧。' },
  { lesson: '6', q: '探照灯的反射面是抛物面。要让射出去的光是一束平行光，灯泡应该放在：', options: ['顶点', '焦点', '准线上', '口沿的圆心'], answer: 1, why: '从抛物线的焦点发出的光，经反射后都平行于对称轴。反过来，平行于轴进来的电波都汇到焦点，所以天线的馈源也装在焦点上。' },
  { lesson: '7', q: '一颗小行星的轨道长半轴 a = 2 AU，离心率 e = 0.5。它在近日点时离太阳：', options: ['0.5 AU', '1 AU', '2 AU', '3 AU'], answer: 1, why: '太阳在焦点上，c = ae = 1 AU。近日点到太阳 a − c = 1 AU，远日点到太阳 a + c = 3 AU。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:conic:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="圆锥曲线" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<At at="over" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。圆锥曲线你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
