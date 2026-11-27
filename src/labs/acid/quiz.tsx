// 酸、碱和中和 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座污水处理厂的全景。
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
  { lesson: '1', q: '下列溶液中，能使无色酚酞溶液变红的是哪一种？', options: ['稀盐酸', '食盐水', '石灰水', '白醋'], answer: 2, why: '酚酞遇碱变红，遇酸和中性溶液不变色。石灰水是氢氧化钙溶液，显碱性；稀盐酸、白醋显酸性，食盐水显中性。' },
  { lesson: '2', q: '稀释浓硫酸，正确的操作是哪一项？', options: ['把水沿器壁慢慢倒进浓硫酸里', '把浓硫酸沿器壁慢慢注入水里，并不断搅拌', '把浓硫酸一下子倒进水里', '在量筒里直接稀释'], answer: 1, why: '浓硫酸溶于水放出大量的热，要酸入水：沿器壁慢慢注入水中，用玻璃棒不断搅拌，让热量及时散开。把水倒进浓硫酸，水浮在上面沸腾，酸液会飞溅出来。' },
  { lesson: '3', q: '把生锈的铁钉放进足量的稀盐酸，一开始看到铁锈溶解，溶液变成什么颜色？', options: ['浅绿色', '黄色', '蓝色', '无色'], answer: 1, why: '铁锈的主要成分是氧化铁，和盐酸反应生成氯化铁，溶液显黄色。铁锈除尽后，铁和盐酸反应生成氯化亚铁（浅绿色）和氢气，铁钉表面冒气泡。' },
  { lesson: '4', q: '氢氧化钠固体必须密封保存，原因是什么？', options: ['它会挥发', '它会吸收空气里的水分而潮解，还会和二氧化碳反应而变质', '它见光会分解', '它会和氧气反应'], answer: 1, why: '氢氧化钠易吸水潮解，又能和空气中的二氧化碳反应生成碳酸钠：2NaOH + CO₂ = Na₂CO₃ + H₂O。' },
  { lesson: '5', q: '向滴有酚酞的氢氧化钠溶液中逐滴加入稀盐酸，红色恰好褪去时，下列说法正确的是哪一项？', options: ['溶液的 pH 大于 7', '盐酸和氢氧化钠恰好完全反应，生成氯化钠和水', '盐酸已经大大过量', '生成了氢气'], answer: 1, why: 'HCl + NaOH = NaCl + H₂O。红色恰好褪去说明氢氧化钠恰好反应完，此时 pH = 7。再多滴一滴盐酸，pH 就会落到 7 以下。' },
  { lesson: '6', q: '用 pH 试纸测溶液的 pH，正确的做法是哪一项？', options: ['把试纸直接伸进待测液里', '先用水把试纸润湿，再滴待测液', '用玻璃棒蘸取待测液滴在试纸上，再和标准比色卡比较', '把待测液倒在试纸上，读出小数点后一位'], answer: 2, why: '试纸伸进待测液会污染试剂；先润湿会把溶液稀释，测得不准；pH 试纸只能读到整数。' },
  { lesson: '6', q: '甲、乙、丙三种溶液的 pH 分别是 2、7、12，下列说法正确的是哪一项？', options: ['甲的酸性最弱', '乙显碱性', '丙显碱性，能使紫色石蕊溶液变蓝', '三种溶液都能使酚酞变红'], answer: 2, why: 'pH 小于 7 显酸性，越小酸性越强；等于 7 显中性；大于 7 显碱性。丙 pH 12 显碱性，使石蕊变蓝、酚酞变红；甲酸性最强。' },
  { lesson: '7', q: '某池废水含硫酸 98 kg，用熟石灰恰好中和，需要熟石灰多少千克？（Ca(OH)₂ + H₂SO₄ = CaSO₄ + 2H₂O）', options: ['37 kg', '74 kg', '98 kg', '148 kg'], answer: 1, why: '硫酸的相对分子质量是 98，熟石灰是 74，两者按 1 : 1 反应：98 kg 硫酸需要 74 kg 熟石灰。' },
  { lesson: '7', q: '下列做法中，没有利用中和反应的是哪一项？', options: ['用熟石灰改良酸性土壤', '服用含氢氧化铝的药物治疗胃酸过多', '用稀盐酸除去铁锈', '用熟石灰处理硫酸厂的酸性废水'], answer: 2, why: '铁锈是氧化铁，属于金属氧化物，不是碱，所以稀盐酸除锈不是中和反应。其余三项都是酸和碱作用生成盐和水。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:acid:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="酸、碱和中和" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。酸、碱和中和反应你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
