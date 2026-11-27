// 水溶液里的离子平衡 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是从室外高处斜看检测中心大楼、河道和对岸的自来水厂。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '下列物质溶于水后，属于弱电解质的是哪一种？', options: ['HCl', 'NaOH', 'CH₃COOH', 'NaCl'], answer: 2, why: '醋酸在水中只部分电离，是弱电解质；盐酸、氢氧化钠、氯化钠在水中完全电离，是强电解质。判断强弱看能不能完全电离，不看溶液导电能力的强弱（导电能力还和浓度有关）。' },
  { lesson: '2', q: '把 0.10 mol/L 醋酸加水稀释十倍，下列说法正确的是哪一项？', options: ['c(H⁺) 增大', '电离度增大，Ka 不变', 'Ka 增大', 'pH 增大 1'], answer: 1, why: '稀释使电离平衡向电离的方向移动，电离度增大；但溶液体积变大，c(H⁺) 减小，pH 从 2.88 变为 3.39，增大不到 1。Ka 只随温度变化。' },
  { lesson: '3', q: '100 °C 时纯水的 pH 约为 6，此时纯水显什么性？', options: ['酸性', '中性', '碱性', '无法判断'], answer: 1, why: '纯水中 c(H⁺) 始终等于 c(OH⁻)，所以是中性。升温促进水的电离，Kw 增大，pH 变小，但 pH < 7 并不说明它是酸性。' },
  { lesson: '4', q: 'pH 都是 2 的盐酸和醋酸，各稀释 100 倍后，pH 的关系是哪一项？', options: ['盐酸 pH = 4，醋酸 pH < 4', '盐酸 pH = 4，醋酸 pH > 4', '两者都等于 4', '两者都小于 4'], answer: 0, why: '强酸稀释 100 倍，c(H⁺) 变为百分之一，pH 增大 2；醋酸稀释时电离平衡右移，又电离出 H⁺，pH 增大不到 2。' },
  { lesson: '5', q: '用 0.1000 mol/L NaOH 溶液滴定盐酸，以酚酞为指示剂，怎样判断到达终点？', options: ['溶液刚出现红色就停', '滴入最后半滴，溶液由无色变为浅红色，且半分钟内不褪色', '溶液变成深红色', 'pH 计读数正好是 7.00 才停'], answer: 1, why: '终点附近 pH 突跃，最后半滴就让酚酞变色；要等半分钟不褪色，说明盐酸确实反应完了。' },
  { lesson: '5', q: '强碱滴定强酸的滴定曲线上，终点附近 pH 突跃有什么意义？', options: ['说明滴定管漏液', '少加或多加一点碱，pH 变化很大，指示剂在这里变色，终点误差很小', '说明反应放热', '说明酸过量很多'], answer: 1, why: '20.00 mL 盐酸用 0.1000 mol/L NaOH 滴定，从 19.98 mL 到 20.02 mL，pH 从 4.30 突跃到 9.70。变色范围落在突跃里的指示剂，误差都很小。' },
  { lesson: '6', q: '浓度都是 0.10 mol/L 的 CH₃COONa、NH₄Cl、NaCl 溶液，pH 由大到小是哪一项？', options: ['NaCl > CH₃COONa > NH₄Cl', 'CH₃COONa > NaCl > NH₄Cl', 'NH₄Cl > NaCl > CH₃COONa', '三者相同'], answer: 1, why: '谁弱谁水解，谁强显谁性：CH₃COONa 是强碱弱酸盐显碱性（8.88），NaCl 不水解（7.00），NH₄Cl 是强酸弱碱盐显酸性（5.13）。' },
  { lesson: '7', q: '向某溶液中加入试剂后，离子积 Q 大于溶度积 Ksp，会发生什么？', options: ['沉淀溶解', '有沉淀析出', '处于平衡，不变', '无法判断'], answer: 1, why: 'Q > Ksp 时溶液过饱和，有沉淀析出，直到 Q = Ksp；Q < Ksp 时，若有固体则会继续溶解。' },
  { lesson: '7', q: '向 AgCl 悬浊液中滴加 KI 溶液，白色沉淀变黄，原因是哪一项？', options: ['KI 把 AgCl 氧化了', 'AgI 的 Ksp 比 AgCl 小得多，沉淀向更难溶的 AgI 转化', 'AgCl 受光分解', '溶液里生成了 I₂'], answer: 1, why: 'AgCl(s) + I⁻ ⇌ AgI(s) + Cl⁻，K = Ksp(AgCl)/Ksp(AgI) ≈ 2.1×10⁶，正向进行得很完全。沉淀一般向溶解度更小的方向转化。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:ionic:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="水溶液里的离子平衡" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。水溶液里的离子平衡你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
