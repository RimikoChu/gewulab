// 电解和金属防护 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是氯碱车间里一排离子膜电解槽和整流柜。
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
  { lesson: '1', q: '用石墨电极电解 CuCl₂ 溶液，下列说法正确的是哪一项？', options: ['和电源正极相连的电极上析出铜', '和电源负极相连的是阴极，阴极上析出铜', '阴极上放出能使湿润的淀粉碘化钾试纸变蓝的气体', '通电后溶液的蓝绿色越来越深'], answer: 1, why: '和电源负极相连的是阴极，Cu²⁺ 在阴极得电子析出铜；和正极相连的是阳极，Cl⁻ 在阳极失电子放出氯气，氯气使湿润的淀粉碘化钾试纸变蓝。Cu²⁺ 不断减少，溶液颜色变浅。' },
  { lesson: '2', q: '电解池工作时，关于电子和离子的移动，下列说法正确的是哪一项？', options: ['电子从电源负极出发，经过溶液流回电源正极', '溶液里阳离子移向阳极', '电子从电源负极流向阴极，溶液里阳离子移向阴极', '阴离子在阴极上失电子'], answer: 2, why: '电子只在导线和电极里移动，不进溶液；溶液靠离子导电。阳离子移向阴极得电子（还原），阴离子移向阳极失电子（氧化）。' },
  { lesson: '2', q: '电解池和原电池相比，下列说法正确的是哪一项？', options: ['两者都把化学能转化为电能', '电解池的阳极和原电池的负极上都发生氧化反应', '电解池不需要外加电源', '原电池的正极上发生氧化反应'], answer: 1, why: '电解池把电能转化为化学能，需要外加电源；原电池把化学能转化为电能。发生氧化反应的，在电解池里叫阳极，在原电池里叫负极。' },
  { lesson: '3', q: '用惰性电极电解 CuSO₄ 溶液，阴极和阳极的产物分别是什么？', options: ['Cu 和 O₂', 'H₂ 和 O₂', 'Cu 和 SO₂', 'H₂ 和 Cu'], answer: 0, why: '阴极上 Cu²⁺ 比 H⁺ 先得电子，析出铜；阳极上 SO₄²⁻ 不放电，是水电离出的 OH⁻ 失电子放出氧气，阳极附近溶液酸性增强。' },
  { lesson: '4', q: '氯碱工业的离子膜电解槽里，阳离子交换膜的作用是哪一项？', options: ['让 Cl⁻ 进入阴极室', '只让 Na⁺ 等阳离子通过，挡住 Cl⁻、OH⁻ 和气体', '让氯气和氢气充分混合', '让 OH⁻ 进入阳极室'], answer: 1, why: 'Na⁺ 穿过膜进入阴极室，和阴极生成的 OH⁻ 成为烧碱溶液。膜挡住 Cl⁻，烧碱里就不混食盐；挡住气体和 OH⁻，氯气就不会和氢气混合，也不会和烧碱反应。' },
  { lesson: '5', q: '在铁制品上镀铜，下列做法正确的是哪一项？', options: ['铁制品做阳极，铜做阴极', '铜做阳极，铁制品做阴极，CuSO₄ 溶液做电镀液', '铜做阳极，铁制品做阴极，FeSO₄ 溶液做电镀液', '两极都用石墨'], answer: 1, why: '电镀时镀层金属做阳极，镀件做阴极，电镀液含镀层金属的离子。阳极溶解多少铜，阴极就析出多少，电镀液里 Cu²⁺ 的浓度不变。' },
  { lesson: '5', q: '电解精炼铜时，粗铜里含有的锌、铁、银、金去了哪里？', options: ['都在阴极析出', '锌、铁成为离子留在溶液里，银、金沉在槽底成为阳极泥', '都成为阳极泥', '银、金成为离子进入溶液'], answer: 1, why: '粗铜做阳极。比铜活泼的锌、铁先失电子成为离子，但它们不会在阴极析出；不如铜活泼的银、金不失电子，随着粗铜溶解掉下来，沉在槽底。' },
  { lesson: '6', q: '把用食盐水浸过的铁钉放进密闭的具支试管，几分钟后导管里的水柱上升。铁钉发生了什么？', options: ['析氢腐蚀，正极放出氢气', '吸氧腐蚀，正极反应是 O₂ + 2H₂O + 4e⁻ = 4OH⁻', '化学腐蚀，铁直接和氯化钠反应', '铁做正极被还原'], answer: 1, why: '食盐水是中性的，铁钉发生吸氧腐蚀：铁做负极失电子，氧气在正极（碳）上得电子。试管里氧气被消耗，气体减少，水柱上升。' },
  { lesson: '7', q: '用外加电流法保护海水里的钢闸门，钢闸门应该怎样接？', options: ['接直流电源的正极', '接直流电源的负极', '和一块铜连在一起', '不接电源，接一块石墨'], answer: 1, why: '钢闸门接电源负极做阴极，电子不断送到钢闸门上，铁就不会失电子。接正极成了阳极，腐蚀反而加快；连铜或石墨，铁成了原电池的负极，也会加快腐蚀。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:electrolysis:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="电解和金属防护" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。电解和金属防护你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
