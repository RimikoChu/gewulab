// 分子的形状和晶体 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整间晶体结构实验室。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { voiced } from '@/lab-kit/narration'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: 'BF₃ 分子里，硼原子周围的价层电子对数和分子的空间结构分别是？', options: ['3 对，三角锥形', '3 对，平面三角形', '4 对，三角锥形', '4 对，正四面体形'], answer: 1, why: '硼有 3 个价电子，σ 键电子对 3 对，孤电子对 ½(3 − 3×1) = 0。3 对电子对互相推开，排成平面三角形，键角 120°。不要因为都是“AB₃”就当成和 NH₃ 一样。' },
  { lesson: '2', q: '关于 NH₃，下列说法正确的是？', options: ['VSEPR 模型和分子的空间结构都是三角锥形', 'VSEPR 模型是四面体形，分子的空间结构是三角锥形', 'VSEPR 模型是平面三角形，分子的空间结构是三角锥形', 'VSEPR 模型和分子的空间结构都是四面体形'], answer: 1, why: '氮原子周围有 4 对价层电子对（3 对 σ 键电子对、1 对孤电子对），VSEPR 模型是四面体形；略去孤电子对，只看原子，分子是三角锥形。' },
  { lesson: '2', q: 'CH₄、NH₃、H₂O 的键角依次是 109°28′、107°、105°。键角依次变小的原因是？', options: ['中心原子的半径依次变小', '氢原子的个数依次减少', '孤电子对依次增多，孤电子对的排斥作用更强', '中心原子的杂化方式不同'], answer: 2, why: '三个分子的中心原子都是 4 对价层电子对、sp³ 杂化。孤电子对对成键电子对的排斥更强，孤电子对越多，键角被挤得越小。' },
  { lesson: '3', q: '下列分子中，中心原子的杂化方式是 sp³ 的是？', options: ['CO₂', 'BF₃', 'H₂O', '三个都不是'], answer: 2, why: '杂化轨道数等于价层电子对数。H₂O 的氧原子有 2 对 σ 键电子对和 2 对孤电子对，共 4 对，是 sp³ 杂化。只数连着几个原子会错判成 sp。CO₂ 是 sp，BF₃ 是 sp²。' },
  { lesson: '4', q: '下列分子中，含有极性键、但分子是非极性分子的是？', options: ['H₂O', 'NH₃', 'CO₂', '三个都是极性分子'], answer: 2, why: 'C=O 键是极性键，但 CO₂ 是直线形，两根键的极性大小相等、方向相反，向量和为零，是非极性分子。H₂O（V 形）和 NH₃（三角锥形）抵消不了，是极性分子。' },
  { lesson: '5', q: '立方晶胞中，棱上的一个粒子属于这个晶胞的份额是？', options: ['1/8', '1/4', '1/2', '1'], answer: 1, why: '一条棱被 4 个晶胞合用，棱上的粒子算 1/4。顶点被 8 个晶胞合用，算 1/8；面被 2 个晶胞合用，算 1/2；体内算 1。' },
  { lesson: '6', q: '某晶体的立方晶胞中，A 在 8 个顶点，B 在 6 个面心，C 在体心。它的化学式是？', options: ['A₈B₆C', 'ABC', 'AB₃C', 'A₂B₃C'], answer: 2, why: 'A：8 × 1/8 = 1；B：6 × 1/2 = 3；C：1 × 1 = 1。化学式是 AB₃C。不能直接数图上画了几个球。' },
  { lesson: '7', q: '干冰升华时，被破坏的是？', options: ['C=O 共价键', '离子键', 'CO₂ 分子之间的范德华力', '金属键'], answer: 2, why: '干冰是分子晶体，升华只是 CO₂ 分子之间离远了，克服的是范德华力；分子里的共价键没有被破坏，CO₂ 分子本身不变。' },
  { lesson: '7', q: '某晶体固态时不导电，熔融时能导电，熔点 801 °C。它最可能是？', options: ['金属晶体', '离子晶体', '分子晶体', '共价晶体'], answer: 1, why: '离子晶体里的离子固态时被离子键固定在原位，不能移动；熔融后离子能自由移动，就导电了。金属晶体固态就导电；分子晶体和共价晶体熔融时一般不导电。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:crystal:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="分子的形状和晶体" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION.q, VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。分子的形状和晶体的结构你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
