// 呼吸 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整个展厅，胸腔模型在平静地呼吸。题目里的数都从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { AIR, layersToCross } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const o2 = AIR.find(a => a.key === 'o2')!
const QS: Q[] = [
  { lesson: '1', q: '呼吸道中，既是空气的通道、又是食物的通道的是哪一段？', options: ['鼻', '咽', '喉', '气管'], answer: 1, why: '咽是空气和食物的共同通道。喉在咽的下方、气管的上端，只走空气；吞咽时会厌盖住喉口，食物进入食管。' },
  { lesson: '2', q: '下列哪一项不是肺适于气体交换的特点？', options: ['肺泡数目很多', '肺泡外缠绕着毛细血管', '肺泡壁只有一层细胞', '肺泡壁由多层细胞构成，很结实'], answer: 3, why: '肺泡壁和毛细血管壁都只由一层上皮细胞构成，很薄，气体容易穿过。壁厚反而不利于交换。' },
  { lesson: '3', q: '肋间肌收缩时，肋骨和胸骨怎样运动？', options: ['肋骨向下向内，胸骨向下向后', '肋骨向上向外，胸骨向上向前', '肋骨不动，胸骨向前', '肋骨向上向外，胸骨向下向后'], answer: 1, why: '肋间肌收缩，肋骨向上向外运动，胸骨向上向前运动，胸廓的前后径和左右径都增大。' },
  { lesson: '4', q: '钟罩模型中，橡皮膜代表什么？向下拉橡皮膜模拟的是什么？', options: ['肺；呼气', '膈；吸气', '胸廓；吸气', '膈；呼气'], answer: 1, why: '橡皮膜代表膈，气球代表肺。拉下橡皮膜，钟罩里的空间变大，气球鼓起，模拟膈肌收缩、膈顶下降时的吸气。' },
  { lesson: '5', q: '吸气时，肺内气压和外界气压相比怎样？', options: ['高于外界', '低于外界', '等于外界', '有时高有时低'], answer: 1, why: '吸气时胸廓扩大、肺扩张，肺内气压低于外界气压，外界气体才流进肺。吸气停住时两边相等，呼气时肺内气压高于外界。' },
  { lesson: '6', q: '血液流经肺泡周围的毛细血管后，血液成分的变化是', options: ['氧增多，二氧化碳减少', '氧减少，二氧化碳增多', '氧和二氧化碳都增多', '氧和二氧化碳都减少'], answer: 0, why: '肺泡里的氧扩散进血液，血液里的二氧化碳扩散进肺泡，所以流出去的血氧多了、二氧化碳少了，静脉血变成动脉血。' },
  { lesson: '7', q: '向澄清的石灰水里吹气，石灰水变浑浊。关于呼出的气体，下列说法正确的是', options: ['呼出的气体里没有氧', '呼出的气体全是二氧化碳', '呼出的气体里二氧化碳比空气里多', '呼出的气体和吸入的空气成分相同'], answer: 2, why: `二氧化碳使石灰水变浑浊。呼出的气体里二氧化碳比空气里多得多，但大部分仍是氮气，氧也还有约 ${o2.out}%。` },
  { lesson: '2', q: '肺泡里的氧进入血液，要穿过几层细胞？', options: ['1 层', `${layersToCross()} 层`, '3 层', '4 层'], answer: 1, why: `肺泡壁一层、毛细血管壁一层，一共 ${layersToCross()} 层细胞。` },
  { lesson: '4', q: '平静吸气时，膈肌和膈顶部的状态是', options: ['膈肌收缩，膈顶下降', '膈肌收缩，膈顶上升', '膈肌舒张，膈顶下降', '膈肌舒张，膈顶上升'], answer: 0, why: '膈肌收缩时膈顶部下降，胸廓的上下径增大，肺扩张，完成吸气；膈肌舒张时膈顶回升，完成呼气。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:breath:q'

export default function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<(number | null)[]>(() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) && a.length === QS.length ? a : QS.map(() => null) } catch { return QS.map(() => null) } })
  const [finale, setFinale] = useState(false)
  const q = QS[i], mine = picked[i]
  const answered = picked.filter(x => x !== null).length, right = picked.filter((x, j) => x === QS[j].answer).length
  const choose = (c: number) => {
    if (mine !== null) return
    const n = picked.map((x, j) => j === i ? c : x); setPicked(n); try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* 忽略 */ }
    if (n.every(x => x !== null)) setTimeout(() => setFinale(true), 1400)
  }
  const resetAll = () => { setPicked(QS.map(() => null)); setI(0); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  const done = { all: answered === QS.length, pass: right >= 7 }
  const hint = mine === null ? '选一个答案' : mine === q.answer ? '答对了' : `答错了：可以回到第 ${q.lesson} 课再做一遍`
  return (
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="呼吸" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} want={{ idle: true }} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。人体的呼吸你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => setFinale(false)}>看每题的讲解</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="flex items-center justify-between text-[12.5px] text-white/55"><span>第 {i + 1} / {QS.length} 题 · 对应第 {q.lesson} 课</span><span className="tabular-nums">答对 {right} / {answered}</span></div>
          <div className="mt-2 flex gap-1">{QS.map((x, j) => <button key={j} onClick={() => setI(j)} aria-label={`第 ${j + 1} 题`} className={cn('h-1.5 flex-1 rounded-full', picked[j] === null ? 'bg-white/15' : picked[j] === x.answer ? 'bg-[#35c7b3]' : 'bg-[#ff6b6b]', j === i && 'ring-2 ring-white/60')} />)}</div>
          <p className="mt-4 text-[16px] leading-relaxed font-medium">{q.q}</p>
          <div className="mt-4 flex flex-col gap-2">
            {q.options.map((o, c) => {
              const isRight = mine !== null && c === q.answer, isWrong = mine === c && c !== q.answer
              return (
                <button key={c} onClick={() => choose(c)} disabled={mine !== null}
                  className={cn('flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition-colors', isRight ? 'bg-[#35c7b3]/25 text-white' : isWrong ? 'bg-[#ff6b6b]/25 text-white' : mine !== null ? 'bg-white/6 text-white/50' : 'bg-white/10 hover:bg-white/18')}>
                  <span className={cn('grid size-6 flex-none place-items-center rounded-full text-[13px] font-semibold', isRight ? 'bg-[#35c7b3] text-[#06231f]' : isWrong ? 'bg-[#ff6b6b] text-white' : 'bg-white/12')}>{isRight ? <Check className="size-3.5" strokeWidth={3.5} /> : isWrong ? <X className="size-3.5" strokeWidth={3.5} /> : 'ABCD'[c]}</span>{o}
                </button>
              )
            })}
          </div>
          {mine !== null && <p className="hint-in mt-4 rounded-xl bg-white/8 px-3.5 py-3 text-[14px] leading-relaxed text-white/85">{q.why}</p>}
        </Glass>
      }
      actions={<>
        <LabButton onClick={() => setI(j => Math.max(0, j - 1))} disabled={i === 0}><ArrowLeft className="size-4" />上一题</LabButton>
        <LabButton primary={mine !== null} pulse={mine !== null && i < QS.length - 1} onClick={() => setI(j => Math.min(QS.length - 1, j + 1))} disabled={i === QS.length - 1}>下一题<ArrowRight className="size-4" /></LabButton>
        {mine !== null && mine !== q.answer && <LabButton onClick={() => goLesson(q.lesson)}>回第 {q.lesson} 课</LabButton>}
      </>}
      extras={null}
    />
  )
}
