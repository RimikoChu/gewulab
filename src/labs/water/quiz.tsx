// 水的净化和组成 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座水厂的全景。题目里的数都从计算核心取。
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
  { lesson: '1', q: '下列几种水中，属于纯净物的是哪一种？', options: ['矿泉水', '澄清的河水', '蒸馏水', '自来水'], answer: 2, why: '蒸馏水只含水一种物质，是纯净物。矿泉水、河水、自来水里都溶有其他物质，即使看起来很清，也是混合物。' },
  { lesson: '2', q: '净水时向浑水中加入明矾，它的作用是什么？', options: ['杀死水里的细菌', '使悬浮的杂质聚集沉降', '把硬水变成软水', '除去水里的异味'], answer: 1, why: '明矾溶于水生成的胶状物能吸附悬浮的细小杂质，使它们聚成矾花沉下去。明矾不能杀菌，也不能降低水的硬度。' },
  { lesson: '3', q: '过滤后滤液仍然浑浊，可能的原因是什么？', options: ['滤纸没有用水润湿', '漏斗下端紧靠烧杯内壁', '滤纸破损', '玻璃棒靠在三层滤纸一边'], answer: 2, why: '滤纸破损，或者漏斗里的液面高于滤纸边缘，浑水会不经过滤纸直接流下去，滤液就浑浊。另外三项都是正确的操作。' },
  { lesson: '4', q: '活性炭在净水中的主要作用是什么？', options: ['吸附色素和异味', '杀菌消毒', '降低水的硬度', '使泥沙沉降'], answer: 0, why: '活性炭疏松多孔，能吸附水里的色素和有异味的物质。它不能杀菌，也除不掉溶在水里的钙、镁化合物。' },
  { lesson: '5', q: '自来水厂的净水过程中，属于化学变化的是哪一步？', options: ['沉淀', '过滤', '活性炭吸附', '投药消毒'], answer: 3, why: '消毒剂和水里的细菌等微生物发生反应，生成了新物质，是化学变化。沉淀、过滤、吸附只是把杂质和水分开，是物理变化。' },
  { lesson: '6', q: '要区分一杯水是硬水还是软水，最简便的方法是什么？', options: ['看水是否澄清', '尝一尝味道', '加肥皂水振荡，看泡沫多少', '用滤纸过滤'], answer: 2, why: '加肥皂水振荡，泡沫少、浮渣多的是硬水，泡沫多的是软水。硬水也可能很澄清，看是看不出来的。' },
  { lesson: '6', q: '下列净水方法中，净化程度最高的是哪一种？', options: ['静置沉淀', '过滤', '活性炭吸附', '蒸馏'], answer: 3, why: '蒸馏把水变成水蒸气再冷凝，溶在水里的物质都留在烧瓶里，得到的蒸馏水是纯净物。' },
  { lesson: '7', q: '电解水时，下列说法正确的是哪一项？', options: ['正极产生氢气', '负极产生的气体能使带火星的木条复燃', '正极和负极产生气体的体积比约为 1∶2', '正极和负极产生气体的质量比约为 1∶2'], answer: 2, why: '正极产生氧气，负极产生氢气，体积比约为 1∶2（“正氧负氢，氢二氧一”）。说的是体积比，不是质量比。' },
  { lesson: '7', q: '电解水的实验说明了什么？', options: ['水由氢气和氧气组成', '水由氢元素和氧元素组成', '水是一种单质', '水中含有氢分子'], answer: 1, why: '水分解生成氢气和氧气，化学反应前后元素的种类不变，所以水由氢、氧两种元素组成。水里并没有氢气和氧气。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:water:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="水的净化和组成" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。水的净化和水的组成你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
