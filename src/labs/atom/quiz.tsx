// 分子和原子 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整间化学实验室。
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
  { lesson: '1', q: '一滴水里大约有 1.67×10²¹ 个水分子。这说明什么？', options: ['分子在不断运动', '分子的质量和体积都很小', '分子之间有间隔', '水分子是由原子构成的'], answer: 1, why: '这么小的一滴水里就有这么多个水分子，说明分子的质量和体积都很小。一个水分子的质量约为 3×10⁻²⁶ kg。' },
  { lesson: '2', q: '大烧杯罩住盛酚酞溶液的 A 和盛浓氨水的 B，几分钟后 A 变红。下列解释正确的是？', options: ['酚酞分子运动到了 B 中', '氨分子运动到了 A 中，使酚酞溶液变红', '大烧杯使 A 受热变红', 'A 和 B 中的水分子互换了'], answer: 1, why: '浓氨水挥发出的氨分子不断运动，进入 A 中溶于水，使酚酞溶液变红。B 中没有酚酞，所以不变红。' },
  { lesson: '3', q: '品红在热水中比在冷水中扩散得快，主要原因是？', options: ['热水中的分子间隔更小', '温度越高，分子运动越快', '热水中品红分子变大了', '冷水中品红分子不运动'], answer: 1, why: '温度越高，分子运动的速率越大，品红扩散得越快。冷水中分子也在运动，只是慢一些。' },
  { lesson: '4', q: '50 mL 水和 50 mL 酒精混合后，总体积小于 100 mL。原因是？', options: ['分子变小了', '分子之间有间隔', '一部分分子消失了', '混合后发生了化学变化'], answer: 1, why: '分子之间有间隔，两种液体混合时，一部分分子进入了另一种分子的间隔中。分子本身大小不变，总质量也不变。' },
  { lesson: '5', q: '水通电分解生成氢气和氧气。在这个变化中，没有改变的粒子是？', options: ['水分子', '氢分子和氧分子', '氢原子和氧原子', '所有的分子'], answer: 2, why: '化学变化中，水分子分成氢原子和氧原子，原子重新组合成氢分子和氧分子。原子的种类和个数都不变，原子是化学变化中的最小粒子。' },
  { lesson: '6', q: '原子不显电性，是因为？', options: ['原子中没有带电的粒子', '原子核内质子数和中子数相等', '原子核所带正电荷与核外电子所带负电荷电量相等、电性相反', '电子在核外运动'], answer: 2, why: '质子带正电，电子带负电，中子不带电。原子中质子数等于核外电子数，正、负电荷电量相等、电性相反，整个原子不显电性。' },
  { lesson: '6', q: '下列关于原子核的说法，正确的是？', options: ['所有原子核里都有中子', '原子核里一定有质子', '原子核带负电', '原子核的体积约占原子的一半'], answer: 1, why: '原子核由质子和中子构成，但不是所有原子核都有中子：氢原子核只有 1 个质子。原子核带正电，体积比原子小得多。' },
  { lesson: '7', q: '碳-12 和碳-14 属于同一种元素，是因为它们的原子具有相同的？', options: ['中子数', '质子数', '相对原子质量', '核外电子运动速度'], answer: 1, why: '元素是质子数（核电荷数）相同的一类原子的总称。碳-12 和碳-14 都有 6 个质子，中子数不同。' },
  { lesson: '5', q: '从微观角度看，水蒸发和水通电分解的本质区别是？', options: ['水蒸发时水分子变大了', '水蒸发时水分子本身不变，电解时水分子变成了别的分子', '两者都生成了新分子', '电解时原子也分成了更小的粒子'], answer: 1, why: '水蒸发是物理变化，水分子本身没变，只是间隔变大；水通电分解是化学变化，水分子分成原子，原子重新组合成氢分子和氧分子。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:atom:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="分子和原子" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。分子、原子和元素你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
