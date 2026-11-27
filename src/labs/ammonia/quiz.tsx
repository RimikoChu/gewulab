// 合成氨工厂 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座化肥厂的鸟瞰。题目里的数都从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { rate1 } from './physics'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const v = rate1()
const QS: Q[] = [
  { lesson: '1', q: `合成氨反应中，2 min 内 v(N₂) = ${v.n2.toFixed(2)} mol/(L·min)，同一时间内 v(H₂) 是多少？`, options: [`${v.n2.toFixed(2)} mol/(L·min)`, `${v.h2.toFixed(2)} mol/(L·min)`, `${v.nh3.toFixed(2)} mol/(L·min)`, '无法确定'], answer: 1, why: 'N₂ + 3H₂ ⇌ 2NH₃，用不同物质表示的速率之比等于化学计量数之比 1 : 3 : 2，所以 v(H₂) = 3v(N₂)。数值不同，说的是同一个反应的快慢。' },
  { lesson: '2', q: '升高温度和使用催化剂都能加快反应，它们的共同原因是什么？', options: ['单位体积内分子总数增多', '活化分子百分数增大', '反应的活化能都降低了', '平衡都向正反应方向移动'], answer: 1, why: '升温使更多分子获得足够的能量；催化剂降低活化能。两者都使活化分子百分数增大。升温并不降低活化能，分子总数也不变。' },
  { lesson: '3', q: '一定条件下 N₂ + 3H₂ ⇌ 2NH₃ 达到平衡，下列说法正确的是哪一项？', options: ['正逆反应都停止了', 'N₂、H₂、NH₃ 的浓度之比一定是 1 : 3 : 2', '正反应速率和逆反应速率相等，但都不为零', 'N₂ 全部转化成了 NH₃'], answer: 2, why: '化学平衡是动态平衡：正逆反应仍在进行，速率相等，各物质浓度保持不变。浓度不变不等于浓度之比等于化学计量数之比。' },
  { lesson: '4', q: '温度不变，增大起始时 N₂ 的浓度，再次达到平衡后，平衡常数 K 怎样变化？', options: ['增大', '减小', '不变', '先增大后减小'], answer: 2, why: '平衡常数只受温度影响，和浓度无关。增大 N₂ 的浓度会改变各物质的平衡浓度和转化率，但 K 不变。' },
  { lesson: '5', q: '把 NO₂ 平衡球的一个泡放进热水里，颜色变深。由此可知 2NO₂ ⇌ N₂O₄ 的正反应是什么反应？', options: ['吸热反应', '放热反应', '既不吸热也不放热', '无法判断'], answer: 1, why: '升温，颜色变深，说明 NO₂ 增多，平衡向逆反应方向移动。升温平衡向吸热方向移动，所以逆反应吸热、正反应放热。' },
  { lesson: '5', q: '用注射器吸入 NO₂ 和 N₂O₄ 的平衡混合气，把活塞推进去使体积减半，最后颜色和原来相比如何？', options: ['比原来浅', '和原来一样', '比原来深', '先变浅后变深'], answer: 2, why: '体积减半时浓度立刻变成 2 倍，颜色变深；随后平衡向生成 N₂O₄ 的方向移动，颜色变浅一些。勒夏特列原理说的是“减弱”而不是“抵消”，所以最后仍比原来深。' },
  { lesson: '6', q: '合成氨的正反应放热，工业上却不用更低的温度，主要原因是什么？', options: ['低温时平衡时氨的含量低', '低温时反应速率太慢，催化剂活性也低', '低温时设备承受不了高压', '低温时氨会分解'], answer: 1, why: '只看平衡，低温有利；但温度太低反应太慢，单位时间产量很低，铁催化剂在 400–500 °C 时活性较高。所以要兼顾速率和平衡。' },
  { lesson: '7', q: '合成氨工业中要及时把氨冷凝分离出去，下列说法正确的是哪一项？', options: ['只是为了得到产品，对平衡没有影响', '减小生成物浓度，使平衡向正反应方向移动', '增大了平衡常数', '加快了正反应速率'], answer: 1, why: '分离出氨，生成物浓度减小，平衡向生成氨的方向移动；同时剩下的 N₂、H₂ 循环使用，提高了原料的利用率。温度不变，K 不变。' },
  { lesson: '4', q: '在 N₂ + 3H₂ ⇌ 2NH₃ 的平衡体系中再充入一些 N₂（温度、容积不变），下列判断正确的是哪一项？', options: ['H₂ 的转化率升高，K 不变', 'H₂ 的转化率降低，K 增大', 'N₂ 的转化率升高，K 不变', '平衡向逆反应方向移动'], answer: 0, why: '增大 N₂ 的浓度，平衡正向移动，另一种反应物 H₂ 的转化率升高，N₂ 自己的转化率降低。温度不变，K 不变。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:ammonia:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="合成氨工厂" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <>
        <p className="text-[18px] leading-snug font-bold">九道题答对了 {right} 道</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{right === QS.length ? '全对。速率、平衡和合成氨条件的选择你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
      </>}
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
