// 质量守恒定律 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座化工厂的全景。
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
  { lesson: '1', q: '红磷燃烧前后质量的测定中，锥形瓶口的玻璃管上套一只气球，它的作用是什么？', options: ['收集生成的白烟', '缓冲瓶内气压，防止塞子被冲开', '给红磷提供氧气', '让天平更灵敏'], answer: 1, why: '红磷燃烧放热，瓶里的气体受热膨胀，气球鼓起来缓冲气压，防止塞子被冲开，装置保持密闭。冷却后氧气被消耗，气球变瘪。' },
  { lesson: '2', q: '质量守恒定律说的是哪一部分物质的质量？', options: ['反应前所有物质的质量', '参加化学反应的各物质的质量总和，等于反应后生成的各物质的质量总和', '反应容器和药品的质量', '只算固体和液体的质量'], answer: 1, why: '只算“参加反应”的物质。没有参加反应的（比如剩下的铁钉、过量的溶液）不算在里面；气体参加或生成的也要算。' },
  { lesson: '3', q: '在敞口烧杯里让碳酸钠粉末和盐酸反应，反应后称量，天平向右盘偏。这说明什么？', options: ['这个反应不遵守质量守恒定律', '生成的二氧化碳逸散到空气中，没有称进去', '盐酸挥发了，所以变重', '天平坏了'], answer: 1, why: '反应生成的二氧化碳跑到空气里去了，没有称到。所有化学反应都遵守质量守恒定律；有气体生成的反应要在密闭容器里验证。' },
  { lesson: '3', q: '镁条在空气中燃烧，生成的氧化镁比原来的镁条重。原因是？', options: ['镁条燃烧时吸收了热量', '生成物里多了参加反应的氧气的质量', '这个反应不遵守质量守恒定律', '陶土网变重了'], answer: 1, why: '镁和空气里的氧气反应生成氧化镁。反应前没有称氧气，反应后的氧化镁里包含它，所以变重。' },
  { lesson: '4', q: '化学反应前后，下列哪一项一定不变？', options: ['分子的种类', '分子的数目', '原子的种类、数目和质量', '物质的种类'], answer: 2, why: '化学反应是分子分成原子、原子重新组合成新分子。原子的种类、数目、质量都不变；分子和物质的种类一定变，分子的数目可能变（电解水 2 个分子变成 3 个）。' },
  { lesson: '5', q: '对 C + O₂ =点燃= CO₂ 的读法，正确的是哪一项？', options: ['碳加氧气等于二氧化碳', '碳和氧气在点燃的条件下反应，生成二氧化碳', '1 g 碳和 1 g 氧气生成 1 g 二氧化碳', '1 份碳和 1 份氧气生成 2 份二氧化碳'], answer: 1, why: '“+”读“和”，“=”读“生成”。质量比是 12 : 32 : 44，不是 1 : 1 : 1；1 : 1 : 1 是粒子个数比。' },
  { lesson: '6', q: '配平化学方程式时，下列做法正确的是哪一项？', options: ['把 H₂O 改写成 H₂O₂，让氧原子数相等', '只在化学式前面配上适当的系数', '在化学式右下角加数字', '两边原子数对不上时，删掉一种生成物'], answer: 1, why: '化学式表示物质的组成，不能改；配平只改化学式前面的系数，使两边每种原子的个数相等。' },
  { lesson: '7', q: '高温煅烧 20 t 碳酸钙（CaCO₃ =高温= CaO + CO₂↑），最多得到多少吨氧化钙？', options: ['5.6 t', '11.2 t', '8.8 t', '20 t'], answer: 1, why: '碳酸钙和氧化钙的质量比是 100 : 56，所以 100 / 56 = 20 t / x，x = 11.2 t。另外 8.8 t 是二氧化碳。' },
  { lesson: '1', q: '密闭容器里，一种物质分解成另外两种物质。反应后测得：甲减少了 18 g，乙增加了 2 g。丙的质量怎样变化？', options: ['减少 16 g', '增加 16 g', '增加 20 g', '不变'], answer: 1, why: '密闭容器里总质量不变。甲减少 18 g，是反应物；乙、丙增加，是生成物：18 g = 2 g + 16 g，丙增加 16 g。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:mass:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="质量守恒定律" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。质量守恒定律和化学方程式你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
