// 电功率和生活用电 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是小区的全景。题目里的数从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { KITCHEN, amps, powerFromFlashes, round } from './physics'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const P2 = powerFromFlashes(160, 180)
const QS: Q[] = [
  { lesson: '1', q: '月初电能表示数是 1385.6 kW·h，月末是 1498.2 kW·h，这个月用了多少电？', options: ['1498.2 kW·h', '112.6 kW·h', '1126 kW·h', '112.6 J'], answer: 1, why: '用的电等于两次示数之差：1498.2 − 1385.6 = 112.6 kW·h，示数的最后一位是小数。单位是千瓦时，不是焦耳。' },
  { lesson: '2', q: '电能表上标着 3200 imp/(kW·h)，只让电暖器工作，3 分钟内指示灯闪了 160 次，电暖器的功率是多少？', options: ['50 W', '0.05 kW', `${round(P2)} W`, '3200 W'], answer: 2, why: `W = 160/3200 kW·h = 0.05 kW·h，t = 3 min = 0.05 h，P = W/t = 1 kW = ${round(P2)} W。0.05 是电能，不是功率。` },
  { lesson: '3', q: '“220 V 40 W”的灯泡接在 110 V 的电路中（灯丝电阻不变），实际功率是多少？', options: ['40 W', '20 W', '10 W', '80 W'], answer: 2, why: '电阻不变，由 P = U²/R，电压变为一半，功率变为四分之一：40 W ÷ 4 = 10 W。不是一半。灯会比正常发光时暗。' },
  { lesson: '4', q: '把 5 Ω 和 10 Ω 的电阻丝串联起来通电，相同时间内哪一段产生的热量多？', options: ['5 Ω 的多', '10 Ω 的多', '一样多', '无法判断'], answer: 1, why: '串联时电流相同，通电时间也相同，由 Q = I²Rt，电阻大的产生的热量多，10 Ω 的是 5 Ω 的 2 倍。' },
  { lesson: '5', q: '控制电灯的开关应该怎样接？', options: ['接在零线上，和灯串联', '接在火线上，和灯串联', '接在火线上，和灯并联', '接在哪根线上都一样'], answer: 1, why: '开关和它控制的灯串联，并且接在火线上：断开开关后灯上不带电，换灯泡时更安全。接在零线上虽然也能控制灯，但断开后灯仍和火线相连。' },
  { lesson: '6', q: '用试电笔辨别火线和零线，正确的做法是哪一项？', options: ['手接触笔尖金属体', '手接触笔尾金属体，笔尖接触导线', '手不接触试电笔的任何金属部分', '用两只手分别捏住笔尖和笔尾'], answer: 1, why: '手要接触笔尾的金属体，不能碰笔尖。笔尖接触火线时，电流经过试电笔、人体流入大地，氖管发光；手不碰笔尾就构不成通路，氖管不会亮。' },
  { lesson: '6', q: '洗衣机要用三孔插座，插座上面那个孔接的是什么？', options: ['火线', '零线', '地线', '什么也不接'], answer: 2, why: '三孔插座“左零右火上接地”。上面那个孔接地线，插头上对应的那一脚和洗衣机的金属外壳相连；外壳万一带电，电流会经地线流入大地。' },
  { lesson: '7', q: `厨房插座这一路的空气开关额定电流 ${KITCHEN.breaker} A。同时使用下面哪一组会跳闸？`, options: ['电饭煲 900 W 和电水壶 1800 W', '电水壶 1800 W 和微波炉 1000 W', '电水壶 1800 W 和电烤箱 2000 W', '电饭煲 900 W 和电烤箱 2000 W'], answer: 2, why: `I = P/U。1800 W + 2000 W = 3800 W，I ≈ ${round(amps(3800), 1)} A，超过 ${KITCHEN.breaker} A；其余几组都没超过（最大的 2900 W，约 ${round(amps(2900), 1)} A）。` },
  { lesson: '7', q: '家里的保险丝熔断了，可能的原因是什么？', options: ['只可能是电路中某处断路', '电路中发生了短路，或者用电器的总功率过大', '电路中的电压太低', '开关接在了零线上'], answer: 1, why: '保险丝熔断是因为电流过大，原因有两个：短路，或者同时使用的用电器总功率过大。查清原因、排除故障后再换上新的保险丝，不能用铜丝代替。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:power:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="电功率和生活用电" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} world={{ lamp: true, tv: true, tall: true }} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <div>
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-1 text-[19px] leading-snug font-bold">答对 {right} / {QS.length}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{right === QS.length ? '全对。电功率和生活用电你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
        </div>
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
