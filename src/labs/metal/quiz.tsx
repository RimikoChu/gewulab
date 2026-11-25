// 金属和炼铁 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座钢铁厂的全景。题目里的数都从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { fmtG, h2Mass } from './physics'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '把黄铜片和铜片互相刻画，结果是哪一种？', options: ['黄铜片上留下划痕', '铜片上留下划痕', '两片上都留下划痕', '两片上都没有划痕'], answer: 1, why: '黄铜是铜和锌的合金。合金的硬度一般比组成它的纯金属大，所以较软的铜片上留下划痕。' },
  { lesson: '2', q: '铝比铁活泼，可铝制品却比铁制品耐腐蚀，原因是什么？', options: ['铝不和氧气反应', '铝的密度小', '铝表面生成一层致密的氧化铝薄膜', '铝的熔点高'], answer: 2, why: '铝在空气中和氧气反应，表面生成致密的氧化铝薄膜，阻止里面的铝进一步氧化。并不是铝不和氧气反应。' },
  { lesson: '3', q: `等质量的镁、锌、铁分别和足量的稀盐酸反应，下列说法正确的是哪一项？`, options: ['生成氢气最多的是锌', '锌生成的氢气比铁多，所以锌比铁活泼', `镁生成的氢气最多，1 g 镁约生成 ${fmtG(h2Mass('Mg', 1))} g`, '三种金属生成的氢气一样多'], answer: 2, why: `1 g 镁、锌、铁生成氢气约 ${fmtG(h2Mass('Mg', 1))} g、${fmtG(h2Mass('Zn', 1))} g、${fmtG(h2Mass('Fe', 1))} g。生成氢气的多少和活泼程度不是一回事，判断活泼程度要看反应的快慢。` },
  { lesson: '4', q: '把铁丝放进硫酸铜溶液里，一段时间后看到的现象是什么？', options: ['铁丝表面有银白色固体，溶液变黄', '铁丝表面有红色固体，溶液由蓝色变成浅绿色', '铁丝表面有气泡冒出', '没有明显变化'], answer: 1, why: 'Fe + CuSO₄ = FeSO₄ + Cu：生成红色的铜覆盖在铁丝表面；生成的硫酸亚铁溶液是浅绿色的，不是黄色。' },
  { lesson: '5', q: '下列反应能发生的是哪一个？', options: ['铜和稀硫酸', '银和硫酸铜溶液', '锌和硫酸亚铁溶液', '铁和硫酸锌溶液'], answer: 2, why: '锌排在铁前面，能把铁从硫酸亚铁溶液里置换出来。铜排在氢后面，不和稀硫酸反应；银排在铜后面，铁排在锌后面，都不能置换。' },
  { lesson: '5', q: '只用一种溶液验证铁、铜、银三种金属的活动性顺序，可以选哪一种？', options: ['稀盐酸', '硫酸铜溶液', '硫酸亚铁溶液', '硝酸银溶液'], answer: 1, why: '把铁和银分别放进硫酸铜溶液：铁表面析出铜，说明铁比铜活泼；银没有变化，说明铜比银活泼。这是“两边的金属、中间的盐”。' },
  { lesson: '6', q: '用一氧化碳还原氧化铁时，要先通一氧化碳再加热，原因是什么？', options: ['使氧化铁先变成黑色', '排净装置里的空气，防止加热时发生爆炸', '节约一氧化碳', '使澄清石灰水先变浑浊'], answer: 1, why: '一氧化碳是可燃性气体，和空气混合遇热可能爆炸。先通一氧化碳把装置里的空气排净，再加热。' },
  { lesson: '7', q: '下列条件下，铁钉最容易生锈的是哪一种？', options: ['浸没在煮沸后迅速冷却、上面有油封的蒸馏水里', '放在干燥的空气里', '一半浸在水里、一半露在空气中', '浸没在植物油里'], answer: 2, why: '铁生锈要同时接触水和氧气。一半浸在水里的铁钉在水面附近既有水又有氧气，最容易生锈。' },
  { lesson: '6', q: '关于工业上用高炉炼铁，下列说法正确的是哪一项？', options: ['得到的产品是纯铁', '原料只有铁矿石和焦炭', '焦炭的作用只是提供热量', '铁水从出铁口放出，炉渣从出渣口放出'], answer: 3, why: '高炉的原料是铁矿石、焦炭、石灰石和空气；焦炭既燃烧供热，又生成一氧化碳作还原剂；炼出的是含碳较多的生铁，不是纯铁。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:metal:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="金属和炼铁" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <>
        <p className="text-[18px] leading-snug font-bold">九道题答对了 {right} 道</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{right === QS.length ? '全对。金属的性质、活动性顺序和炼铁、防锈你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
