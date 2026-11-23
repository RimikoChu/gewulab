// 电路 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整套房子。题目里的数都从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { RANGES, U0, ammeterAt, voltmeterAt } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const f2 = (x: number) => x.toFixed(2), f1 = (x: number) => x.toFixed(1)
const I1 = ammeterAt('parallel', 'A'), I2 = ammeterAt('parallel', 'B'), IC = ammeterAt('parallel', 'C')
const U1 = voltmeterAt('series', 'L1'), U2 = voltmeterAt('series', 'L2')
const QS: Q[] = [
  { lesson: '1', q: '用一根导线把电池的正极和负极直接连起来，会怎样？', options: ['没有电流，所以没关系', '电流很大，会损坏电源', '只是灯泡不亮，别的没影响', '电流方向会反过来'], answer: 1, why: '这叫电源短路：电流不经过用电器，直接从导线回到负极，电流很大，会损坏电源，甚至引起火灾，绝不允许。' },
  { lesson: '2', q: '两只灯泡接在电路里，拧下其中一只，另一只也不亮了。两只灯是怎样连接的？', options: ['串联', '并联', '可能串联也可能并联', '无法判断'], answer: 0, why: '串联电路只有一条路径，一处断开整个电路都没有电流。并联时各支路互不影响，拧下一只，另一只照常亮。' },
  { lesson: '3', q: '关于电流表的使用，下面哪种做法是对的？', options: ['电流表和被测用电器并联', '电流从“−”接线柱流入', '不知道电流大小时，先用大量程试触', '可以把电流表直接接在电源两极上'], answer: 2, why: '电流表要串联在电路里，电流从“+”接线柱流入、“−”接线柱流出；不知道电流大小时先用大量程试触；绝不允许不经过用电器把电流表直接接到电源两极上。' },
  { lesson: '3', q: `电流表接“−”和“3”时指针指在 1.5 A。如果改接“−”和“0.6”，指针在同一位置，读数是多少？`, options: ['1.5 A', '0.3 A', '0.15 A', '7.5 A'], answer: 1, why: `两个量程的满偏分别是 ${RANGES.A.hi.max} A 和 ${RANGES.A.lo.max} A，相差 5 倍。指针在同一位置，小量程的读数是大量程的五分之一：1.5 A ÷ 5 = 0.3 A。` },
  { lesson: '4', q: `并联电路中，干路电流 ${f2(IC)} A，通过 L₁ 的电流 ${f2(I1)} A，通过 L₂ 的电流是多少？`, options: [`${f2(IC)} A`, `${f2(I1)} A`, `${f2(I2)} A`, `${f2(IC + I1)} A`], answer: 2, why: `并联电路中干路电流等于各支路电流之和：I₂ = I − I₁ = ${f2(IC)} A − ${f2(I1)} A = ${f2(I2)} A。` },
  { lesson: '5', q: '关于电压表的使用，下面哪种说法是错的？', options: ['电压表要和被测电路并联', '电流要从“+”接线柱流入', '电压表可以直接接在电源两极上', '电压表要和被测电路串联'], answer: 3, why: '电压表要并联在被测电路两端，不能串联。电压表可以直接接在电源两极上，测出的就是电源电压。' },
  { lesson: '6', q: `两只灯串联在 ${f1(U0)} V 的电源上，L₁ 两端的电压是 ${f1(U1)} V，L₂ 两端的电压是多少？`, options: [`${f1(U0)} V`, `${f1(U1)} V`, `${f1(U2)} V`, `${f1(U0 + U1)} V`], answer: 2, why: `串联电路两端的总电压等于各部分电压之和：U₂ = U − U₁ = ${f1(U0)} V − ${f1(U1)} V = ${f1(U2)} V。` },
  { lesson: '7', q: '两根镍铬合金丝，长度相同，一根粗、一根细。哪根的电阻大？', options: ['粗的', '细的', '一样大', '无法比较'], answer: 1, why: '材料和长度相同时，导体的横截面积越小，电阻越大。所以细的电阻大。' },
  { lesson: '7', q: '滑动变阻器接入电路后，移动滑片，电流表的示数一点也不变。最可能是怎样接的？', options: ['一上一下', '同时接了下面两个接线柱', '和灯泡串联', '滑片放在了阻值最大处'], answer: 1, why: '同时接下面两个接线柱时，接入的是整根电阻丝，滑片不起作用，相当于一个定值电阻。要“一上一下”接，移动滑片才能改变接入电路的电阻丝长度。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:circuit:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="电路" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。电路你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
