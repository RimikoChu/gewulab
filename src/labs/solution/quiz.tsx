// 溶液 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座盐场的全景。题目里的数都从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { crossing, fraction, g1, solubility } from './physics'
import { Place } from './world'

const C = crossing()
interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '把下列物质分别放入水中，充分搅拌，能得到溶液的是哪一种？', options: ['植物油', '泥沙', '蔗糖', '面粉'], answer: 2, why: '蔗糖溶于水，形成均一、稳定的溶液。植物油形成乳浊液，泥沙、面粉形成悬浊液，静置都会分层。溶液也不一定是无色的，比如硫酸铜溶液是蓝色的。' },
  { lesson: '2', q: '下列物质溶于水时，溶液温度明显降低的是哪一种？', options: ['氢氧化钠', '硝酸铵', '氯化钠', '蔗糖'], answer: 1, why: '硝酸铵溶解时吸收热量，温度明显降低；氢氧化钠溶解时放出热量，温度升高；氯化钠溶解时温度几乎不变。' },
  { lesson: '3', q: '要使一杯接近饱和的硝酸钾溶液变成饱和溶液，下列方法中不可行的是哪一种？', options: ['加入硝酸钾', '蒸发部分水', '降低温度', '升高温度'], answer: 3, why: '硝酸钾的溶解度随温度升高而增大，升温会让它更能溶，溶液更不饱和。加溶质、蒸发溶剂、降温都能使它达到饱和。' },
  { lesson: '4', q: `“20 ℃ 时氯化钠的溶解度是 ${g1(solubility('NaCl', 20))} g”，下列说法正确的是哪一项？`, options: [`20 ℃ 时 100 g 氯化钠溶液里含 ${g1(solubility('NaCl', 20))} g 氯化钠`, `20 ℃ 时 100 g 水里最多能溶解 ${g1(solubility('NaCl', 20))} g 氯化钠`, `100 g 水里最多能溶解 ${g1(solubility('NaCl', 20))} g 氯化钠`, `20 ℃ 时 ${g1(solubility('NaCl', 20))} g 氯化钠溶于 100 g 水形成不饱和溶液`], answer: 1, why: '溶解度说的是一定温度下、100 g 溶剂（不是 100 g 溶液）里达到饱和时溶解的质量。温度、100 g 溶剂、饱和、质量单位 g，四个要素缺一不可。' },
  { lesson: '4', q: '打开汽水瓶盖，有大量气泡冒出。这说明什么？', options: ['温度升高，气体溶解度增大', '压强减小，气体溶解度减小', '压强减小，气体溶解度增大', '气体的溶解度与压强无关'], answer: 1, why: '打开瓶盖，瓶内压强减小，二氧化碳的溶解度随之减小，多出来的气体就冒出来。喝下汽水会打嗝，是因为体内温度高，气体溶解度变小。' },
  { lesson: '5', q: `溶解度曲线上，硝酸钾和氯化钠两条线交于约 ${Math.round(C.t)} ℃。这个交点表示什么？`, options: ['该温度下两种饱和溶液的质量相等', '该温度下两种物质的溶解度相等', '该温度下两种溶液都是不饱和的', '该温度以上氯化钠的溶解度更大'], answer: 1, why: `交点表示在约 ${Math.round(C.t)} ℃ 时两种物质的溶解度相等（约 ${Math.round(C.s)} g），饱和溶液的溶质质量分数也相等；但溶液的质量不一定相等。高于这个温度，硝酸钾的溶解度更大。` },
  { lesson: '6', q: '硝酸钾中混有少量氯化钠，要得到较纯的硝酸钾，宜采用哪种方法？', options: ['蒸发结晶', '降温结晶（冷却热饱和溶液）', '过滤', '加水溶解'], answer: 1, why: '硝酸钾的溶解度受温度影响大，氯化钠受温度影响小。把混合物配成热的饱和溶液再冷却，硝酸钾大量析出，氯化钠留在溶液里。' },
  { lesson: '6', q: '盐场里“晒盐”得到氯化钠，主要利用的是什么？', options: ['降低温度使氯化钠析出', '蒸发水分使氯化钠结晶析出', '氯化钠与水发生化学反应', '过滤除去卤水里的水'], answer: 1, why: '氯化钠的溶解度受温度影响很小，降温几乎析不出来。盐田靠风吹日晒蒸发水分，卤水达到饱和后，氯化钠结晶析出。' },
  { lesson: '7', q: '把 100 g 溶质质量分数为 10% 的氯化钠溶液加 100 g 水稀释，所得溶液的溶质质量分数是多少？', options: ['20%', '10%', `${fraction(10, 200).toFixed(0)}%`, '1%'], answer: 2, why: `稀释前后溶质的质量不变：100 g × 10% = 10 g；溶液变成 200 g，质量分数 = 10 g ÷ 200 g × 100% = ${fraction(10, 200).toFixed(0)}%。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:solution:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="溶液" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。溶解、溶解度和质量分数你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
