// 欧姆定律 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整间检测车间的全景。题目里的数从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { L6, comboR, ohmI, round, seriesR } from './physics'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '在“探究电流与电压的关系”实验中，得到的结论是哪一项？', options: ['电阻一定时，电压与电流成正比', '电阻一定时，电流与电压成正比', '电压一定时，电流与电阻成反比', '电流与电压无关'], answer: 1, why: '电压是形成电流的原因，所以说“电流与电压成正比”，不能反过来说；而且要加上前提“电阻一定”。' },
  { lesson: '2', q: '探究电流与电阻的关系时，把 5 Ω 的电阻换成 10 Ω，闭合开关后下一步应该做什么？', options: ['直接读电流表', '把滑片向阻值大的一端移，使电压表示数回到原来的值', '把滑片向阻值小的一端移', '换一个电压更高的电源'], answer: 1, why: '换上 10 Ω 后它分到的电压变大，要把滑片向阻值大的一端移，让电压表示数回到原来的值，保持电压不变再读电流。' },
  { lesson: '3', q: '关于 R = U ÷ I，下列说法正确的是哪一项？', options: ['导体的电阻与它两端的电压成正比', '导体的电阻与通过它的电流成反比', '电压为零时，导体的电阻也为零', '导体的电阻等于它两端的电压与通过它的电流之比'], answer: 3, why: '电阻是导体本身的性质，由材料、长度、横截面积等决定。R = U ÷ I 只是计算电阻的方法，电压变了，电流跟着变，比值不变。' },
  { lesson: '4', q: '用伏安法测定值电阻时，要改变电压多测几次，目的是什么？', options: ['求平均值，减小误差', '看电阻随电压怎样变化', '保护电路', '找出电流与电压的关系'], answer: 0, why: '定值电阻的阻值不变，几次测得的结果不同是误差造成的，求平均值可以减小误差。' },
  { lesson: '5', q: '测小灯泡电阻时，几次算出的电阻随电压升高而变大，原因是什么？', options: ['读数有误差', '电压表的接线错了', '灯丝的电阻随温度升高而增大', '滑动变阻器的电阻变了'], answer: 2, why: '电压越高，灯越亮，灯丝温度越高，电阻越大。这不是误差，所以不能求平均值。' },
  { lesson: '6', q: `把 ${L6.R1} Ω 和 ${L6.R2} Ω 的两只电阻并联，总电阻是多少？`, options: [`${seriesR(L6.R1, L6.R2)} Ω`, '12.5 Ω', `${round(comboR('parallel'), 1)} Ω`, '5 Ω'], answer: 2, why: `并联的总电阻比任何一个分电阻都小：1/R = 1/${L6.R1} + 1/${L6.R2}，R = ${round(comboR('parallel'), 1)} Ω。${seriesR(L6.R1, L6.R2)} Ω 是串联的总电阻。` },
  { lesson: '7', q: '为什么不能用湿手碰开关？', options: ['水会使电源电压升高', '皮肤潮湿时人体电阻变小，通过人体的电流变大', '水会使开关的电阻变大', '湿手会使灯泡变暗'], answer: 1, why: '电压不变，人体电阻变小，由 I = U ÷ R，通过人体的电流就变大，更危险。电源电压并没有变。' },
  { lesson: '1', q: '连接电路、闭合开关之前，滑动变阻器的滑片应放在哪里？', options: ['阻值最小的一端', '正中间', '阻值最大的一端', '哪里都可以'], answer: 2, why: '滑片放在阻值最大的一端，闭合开关时电路中的电流最小，可以保护电路。' },
  { lesson: '3', q: '电源电压 6 V，10 Ω 和 20 Ω 的两只电阻串联，电路中的电流是多少？', options: [`${round(ohmI(6, 10), 1)} A`, `${round(ohmI(6, 20), 1)} A`, `${round(ohmI(6, seriesR(10, 20)), 1)} A`, '0.9 A'], answer: 2, why: `串联的总电阻 R = 10 Ω + 20 Ω = 30 Ω，I = U ÷ R = 6 V ÷ 30 Ω = ${round(ohmI(6, 30), 1)} A。只用一只电阻算是常见的错误。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:ohm:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="欧姆定律" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。欧姆定律你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
