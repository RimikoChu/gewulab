// 原电池 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是一号台上接通的铜锌原电池。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import Rig from './rig'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '原电池是把什么能直接转化成什么能的装置？', options: ['电能转化为化学能', '化学能转化为电能', '热能转化为电能', '化学能转化为热能'], answer: 1, why: '原电池里发生的是氧化还原反应，反应放出的能量直接以电能的形式输出。' },
  { lesson: '4', q: '锌片和铜片插在稀硫酸里组成原电池，负极是哪一个？', options: ['铜片', '锌片', '稀硫酸', '导线'], answer: 1, why: '锌比铜活泼，更容易失去电子，做负极。' },
  { lesson: '2', q: '在铜锌原电池的导线里，电子是怎样流动的？', options: ['从铜片流向锌片', '从锌片流向铜片', '从溶液流向锌片', '电子不流动'], answer: 1, why: '锌失去的电子经导线流到铜片。电流的方向和电子流动的方向相反，是从铜片到锌片。' },
  { lesson: '2', q: '铜锌原电池工作时，铜片上能看到什么现象？', options: ['铜片逐渐溶解', '铜片上有气泡冒出', '铜片变黑', '没有任何现象'], answer: 1, why: '溶液里的氢离子在铜片上得到电子，变成氢气：2H⁺ + 2e⁻ = H₂↑。铜本身不反应。' },
  { lesson: '3', q: '下面哪一种装置能形成原电池？', options: ['两片铜片插在稀硫酸里，用导线相连', '锌片和铜片插在酒精里，用导线相连', '锌片和铜片分别插在两杯稀硫酸里，用导线相连', '锌片和铜片插在同一杯稀硫酸里，用导线相连'], answer: 3, why: '要有两个活泼性不同的电极、电解质溶液、闭合回路和能自发进行的氧化还原反应。前三种各缺一样。' },
  { lesson: '2', q: '原电池工作时，电解质溶液里的阳离子向哪一极移动？', options: ['负极', '正极', '不移动', '两极都去'], answer: 1, why: '正极上聚集了从导线过来的电子，带正电的阳离子被吸引过去；阴离子则移向负极。' },
  { lesson: '5', q: '在带盐桥的铜锌原电池里，盐桥的作用是什么？', options: ['提供电子', '参加电极反应', '连通两边的溶液，平衡电荷', '加快锌的溶解'], answer: 2, why: '盐桥里的离子能移动，把两只烧杯里的溶液连成通路，并让两边保持电中性。它不参加电极反应。' },
  { lesson: '6', q: '普通锌锰干电池的负极是什么？', options: ['石墨棒', '二氧化锰', '锌筒', '氯化铵糊'], answer: 2, why: '锌筒既是电池的外壳，又是负极；中间的石墨棒是正极。所以旧电池的外壳会变薄、漏液。' },
  { lesson: '7', q: '氢氧燃料电池工作时，生成的产物是什么？', options: ['二氧化碳', '水', '氢气和氧气', '过氧化氢'], answer: 1, why: '总反应是 2H₂ + O₂ = 2H₂O，产物只有水，所以它是一种清洁的电源。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:battery:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="原电池" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Rig left="Zn" right="Cu" joined flow={1} gasR={0.9} labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。原电池你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
