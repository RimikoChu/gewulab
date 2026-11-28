// 从石油到塑料 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座厂的鸟瞰。题目里的数从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { voiced } from '@/lab-kit/narration'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BOND, CRACK, substituted, text } from './physics'
import { VOICE } from './voice'
import { Place, spot } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '石油的分馏属于哪一种变化？依据是什么？', options: ['化学变化，因为得到了汽油、煤油等新物质', '物理变化，因为只是按沸点不同把原有的烃分开', '化学变化，因为要加热到几百摄氏度', '物理变化，因为石油是纯净物'], answer: 1, why: '分馏利用各种烃的沸点不同把它们分开，没有新物质生成，是物理变化。汽油、煤油原来就在石油里。' },
  { lesson: '1', q: '分馏得到的汽油是纯净物吗？', options: ['是，它有固定的沸点', '是，它只含碳、氢两种元素', '不是，它仍是多种烃的混合物', '不是，它里面混有煤油'], answer: 2, why: '每种馏分是沸点在一定范围内的多种烃的混合物，没有固定的沸点。只含碳、氢两种元素不等于是纯净物。' },
  { lesson: '2', q: `十六烷裂化：${text(CRACK[0].from)} → ${text(CRACK[0].a)} + X，X 是什么？`, options: [text(CRACK[0].a), text(CRACK[0].b), 'C₈H₁₄', text(CRACK[1].a)], answer: 1, why: `按原子守恒，X 有 16 − 8 = 8 个碳、34 − 18 = 16 个氢，是 ${text(CRACK[0].b)}（辛烯）。一个烷烃裂化，得到一个烷烃和一个烯烃。` },
  { lesson: '3', q: '1 mol 甲烷和氯气在光照下完全反应，全部变成四氯化碳，消耗氯气多少？', options: ['1 mol', '2 mol', `${substituted(4).cl2} mol`, '8 mol'], answer: 2, why: `每取代 1 个氢原子消耗 1 个 Cl₂，同时生成 1 个 HCl：氯分子里只有一半的氯进了有机物。四个氢都取代，要 ${substituted(4).cl2} mol Cl₂，生成 ${substituted(4).hcl} mol HCl。` },
  { lesson: '4', q: '要除去甲烷里混有的少量乙烯，得到纯净的甲烷，最好把气体通过哪一种试剂？', options: ['酸性高锰酸钾溶液', '溴水（或溴的四氯化碳溶液）', '水', '澄清石灰水'], answer: 1, why: '乙烯和溴加成，生成的 1,2-二溴乙烷留在溶液里。酸性高锰酸钾溶液会把乙烯氧化成二氧化碳，甲烷里又混进了新的杂质：它可以用来鉴别，不能用来除杂。' },
  { lesson: '5', q: '把苯加进溴水里振荡、静置，看到分层，上层橙红色，下层几乎无色。这说明什么？', options: ['苯和溴发生了加成反应', '苯和溴发生了取代反应', '溴被萃取到了苯里，没有发生化学反应', '苯里有碳碳双键'], answer: 2, why: `溴在苯里比在水里好溶，被萃取到了上层的苯里，是物理变化。苯的六个碳碳键都是 ${BOND.benzene} pm，介于单键和双键之间，不能和溴水加成。` },
  { lesson: '6', q: '乙醇在铜催化下被氧气氧化成乙醛，官能团发生了什么变化？', options: ['羟基变成了羧基', '羟基变成了醛基', '醛基变成了羟基', '碳碳双键变成了羟基'], answer: 1, why: '乙醇的官能团是羟基 —OH，乙醛的是醛基 —CHO。乙醛再被氧化，醛基才变成羧基 —COOH。' },
  { lesson: '7', q: '关于聚乙烯，下列说法正确的是哪一项？', options: ['链节是 CH₂=CH₂', '它能使溴的四氯化碳溶液褪色', '单体是 CH₂=CH₂，链节是 —CH₂—CH₂—', '它是纯净物，有固定的相对分子质量'], answer: 2, why: '加聚时双键打开，聚乙烯里已经没有碳碳双键，不能使溴的四氯化碳溶液褪色。链节是 —CH₂—CH₂—。各条链的聚合度不同，所以它是混合物。' },
  { lesson: '2', q: '下列过程里，属于化学变化的一组是哪一项？', options: ['石油的分馏、石油的裂化', '石油的裂化、石油的裂解、乙烯的加聚', '石油的分馏、苯萃取溴水里的溴', '石油的分馏、石油的裂解'], answer: 1, why: '裂化、裂解把长链断成短链，加聚把小分子连成高分子，都生成了新物质。分馏和萃取只是把物质分开，是物理变化。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:petro:q'
const SPOT = spot(66, 27, -10, 92, 36, [-0.44, 0.15], false, [320, 1700])

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="从石油到塑料" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at={SPOT} labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <>
        <p className="text-[18px] leading-snug font-bold">九道题答对了 {right} 道</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{right === QS.length ? '全对。从分馏、裂化到官能团的转化和加聚，你都弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
