// 种群和生态系统 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是从海上看整座岛。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { ENERGY, J_N0, K_OF, MARK, QUADRATS, countQuadrat, efficiency, jGrowth, lincoln, lincolnLost, maxRate, meanDensity, pct } from './physics'
import { VOICE } from './voice'
import { Room } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const CNT = QUADRATS.map(q => countQuadrat(q))
const QS: Q[] = [
  { lesson: '1', q: '用样方法调查蒲公英的种群密度时，压在样方边线上的个体应该怎样计数？', options: ['四条边上的都数', '边线上的都不数', '只数相邻两条边及其夹角上的', '只数上边线上的'], answer: 2, why: '压线的个体只数相邻两边及其夹角上的（“计上不计下，计左不计右”）。四条边都数，压线的个体会被相邻的样方重复计数，结果偏大。' },
  { lesson: '1', q: `五个 1 m² 的样方里分别数出 ${CNT.join('、')} 株蒲公英，这块地蒲公英的种群密度约是多少？`, options: [`${CNT.reduce((a, b) => a + b, 0)} 株/m²`, `${meanDensity('half').toFixed(0)} 株/m²`, `${Math.max(...CNT)} 株/m²`, `${Math.min(...CNT)} 株/m²`], answer: 1, why: `以所有样方种群密度的平均值作为估算值：(${CNT.join(' + ')}) ÷ 5 = ${meanDensity('half').toFixed(0)} 株/m²。不能把各样方的株数加起来，也不能只取最多或最少的一个。` },
  { lesson: '2', q: '用标记重捕法调查兔的数量，如果部分个体的标记物脱落了，估算出的数量会怎样？', options: ['偏大', '偏小', '不受影响', '无法判断'], answer: 0, why: `N = M × n ÷ m。标记物脱落，重捕到的带标记个体数 m 偏小，N 就偏大。第 2 课里 m 从 ${MARK.m} 数成 ${MARK.m - MARK.lost}，估计值从 ${lincoln(MARK.M, MARK.n, MARK.m)} 只变成 ${lincolnLost()} 只。` },
  { lesson: '3', q: '一个种群里幼年个体很多，老年个体很少。在环境不变的情况下，它的数量在一段时间内最可能怎样变化？', options: ['越来越多', '保持稳定', '越来越少', '先减少后增多'], answer: 0, why: '这是增长型的年龄结构：出生率大于死亡率，种群密度会越来越大。年龄结构可以用来预测种群数量的变化趋势。' },
  { lesson: '4', q: `某种群在理想条件下呈 J 形增长，起始数量 ${J_N0} 只，λ = 1.5。2 年后的数量是多少？`, options: ['30 只', `${jGrowth(1.5, 2)} 只`, '50 只', '60 只'], answer: 1, why: `Nt = N0 λ^t = ${J_N0} × 1.5 × 1.5 = ${jGrowth(1.5, 2)} 只。λ 是这一年的数量是前一年的多少倍，不是每年增加的只数，也不是增长率。` },
  { lesson: '5', q: '种群数量呈 S 形增长时，数量达到 K/2 的那一刻，下列哪一项最大？', options: ['种群数量', '种群的增长速率', '环境容纳量', '种内竞争的强度'], answer: 1, why: `K/2 时增长速率最大（第 5 课里是每年约 ${maxRate(K_OF.good).toFixed(0)} 只）。种群数量和种内竞争在 K 值时才最大；环境容纳量由环境决定，不随种群数量变。` },
  { lesson: '6', q: '甲、乙两种动物的数量曲线都在波动：甲先增多先减少，乙总是晚一步跟着增多、减少。它们之间最可能是什么关系？', options: ['种间竞争，甲占优势', '捕食，甲是捕食者', '捕食，乙是捕食者', '互利共生'], answer: 2, why: '捕食关系的两条曲线一先一后地波动：先变化的是猎物，后变化的是捕食者。种间竞争常是此消彼长；互利共生是同增同减。' },
  { lesson: '7', q: `一块草地上，草一年固定 ${ENERGY[0].got} kJ 的能量，兔同化了 ${ENERGY[1].got} kJ，狐同化了 ${ENERGY[2].got} kJ。从第一营养级到第二营养级的能量传递效率是多少？`, options: [pct(efficiency(0)), pct(efficiency(1)), pct(ENERGY[2].got / ENERGY[0].got, 1), pct(1 - efficiency(0))], answer: 0, why: `传递效率 = 下一营养级的同化量 ÷ 这一营养级的同化量 = ${ENERGY[1].got} ÷ ${ENERGY[0].got} = ${pct(efficiency(0))}。${pct(efficiency(1))} 是从兔到狐的传递效率。` },
  { lesson: '7', q: '关于生态系统的能量流动和物质循环，下列说法正确的是：', options: ['能量和物质都可以循环利用', '能量单向流动、逐级递减，物质可以循环往复', '能量可以循环，物质只能单向流动', '两者各自独立进行，互不相关'], answer: 1, why: '能量在每一级都有大部分以热能散失，不能再被利用，所以是单向流动、逐级递减；碳等物质则在生物群落和非生物环境之间循环往复。物质是能量的载体，能量是物质循环的动力。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:population:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="种群和生态系统" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Room at="q" labels={[]} far />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。数量怎样调查、怎样变、怎样算，你都弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
