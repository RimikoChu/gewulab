// 接触法制硫酸 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座硫酸厂的鸟瞰。题目里的数都从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { T3, T5, fmt1, gainByPressure, xTable } from './physics'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '硫铁矿进沸腾炉之前要先粉碎，主要目的是什么？', options: ['提高 SO₂ 的平衡产率', '增大矿石和空气的接触面积，加快反应、烧得更充分', '降低反应需要的温度', '减少炉渣的质量'], answer: 1, why: '粉碎增大了固体的表面积，反应更快、矿石利用得更充分。它改变的是快慢和利用率，和平衡没有关系。' },
  { lesson: '2', q: '从沸腾炉出来的炉气，进接触室之前必须除尘、洗涤、干燥，最主要的原因是什么？', options: ['提高 SO₂ 的浓度', '杂质会使催化剂中毒', '降低炉气的温度', '除去多余的氧气'], answer: 1, why: '矿尘、砷和硒的化合物会使催化剂失去活性（中毒），水蒸气对设备和生产也有不良影响，所以炉气必须先净化。氧气是下一步反应要用的，不能除去。' },
  { lesson: '3', q: '接触室里用 V₂O₅ 作催化剂，下列说法正确的是哪一项？', options: ['提高了 SO₂ 的平衡转化率', '使反应能进行到底', '加快了反应速率，平衡转化率不变', '使平衡向生成 SO₃ 的方向移动'], answer: 2, why: '催化剂同等程度地加快正、逆反应，缩短达到平衡的时间，但不能使平衡移动，不改变平衡转化率。' },
  { lesson: '3', q: `${T3} °C、常压下 SO₂ 的平衡转化率是 ${fmt1(xTable(T3, 0.1))}%。这说明什么？`, options: ['催化剂的用量不够', '反应时间不够长', '这个反应是可逆反应，SO₂ 不能全部转化', '氧气不足'], answer: 2, why: '2SO₂ + O₂ ⇌ 2SO₃ 是可逆反应，达到平衡时正逆反应速率相等，反应物不可能全部转化。再延长时间、再加催化剂，转化率也不会变。' },
  { lesson: '4', q: 'SO₂ 催化氧化的正反应放热，低温时平衡转化率更高。工业上却用 400–500 °C，主要原因是什么？', options: ['温度低时反应速率太慢，催化剂活性也低', '温度低时 SO₃ 会分解', '温度低时设备容易腐蚀', '温度低时平衡向逆反应方向移动'], answer: 0, why: '只看平衡，低温有利；但温度太低反应太慢，催化剂的活性也低，单位时间的产量很低。400–500 °C 时速率和平衡转化率都比较理想。' },
  { lesson: '5', q: `${T5} °C 时，压强从 0.1 MPa 加到 10 MPa，SO₂ 的平衡转化率只提高 ${fmt1(gainByPressure(10))} 个百分点。工业上采用常压，理由是什么？`, options: ['加压使平衡向逆反应方向移动', '常压下转化率已经很高，加压要耐压设备和更多动力，不划算', '加压会使催化剂中毒', '加压使反应速率减小'], answer: 1, why: '加压对平衡是有利的，但常压下转化率已经很高，再加压提高得很少，却大大增加设备和动力的成本。' },
  { lesson: '5', q: '接触室里通入过量的空气，主要目的是什么？', options: ['提高 O₂ 的转化率', '提高 SO₂ 的转化率', '降低反应的温度', '增大平衡常数'], answer: 1, why: '增大一种反应物（便宜的 O₂）的浓度，平衡正向移动，可以提高另一种反应物（更贵的 SO₂）的转化率。O₂ 自己的转化率反而降低，平衡常数只和温度有关。' },
  { lesson: '6', q: '吸收塔里用 98.3% 的浓硫酸而不是用水来吸收 SO₃，原因是什么？', options: ['SO₃ 不溶于水', '用水吸收会形成酸雾，吸收速率慢、不完全', '浓硫酸比水便宜', '水会和 SO₃ 生成亚硫酸'], answer: 1, why: 'SO₃ 和水反应放出大量的热，容易形成酸雾，阻碍吸收。用 98.3% 的浓硫酸吸收不起酸雾，吸收得快而完全。' },
  { lesson: '7', q: '把浓硫酸倒进蔗糖里，蔗糖变黑、膨胀。“变黑”主要体现了浓硫酸的什么性质？', options: ['吸水性', '脱水性', '酸性', '难挥发性'], answer: 1, why: '蔗糖里没有现成的水。浓硫酸把蔗糖里的氢、氧元素按水的组成比脱去，留下黑色的炭，这是脱水性。吸水性吸走的是现成的水（水蒸气、结晶水）。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:sulfuric:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="接触法制硫酸" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} hot={0.3} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <>
        <p className="text-[18px] leading-snug font-bold">九道题答对了 {right} 道</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{right === QS.length ? '全对。造气、催化氧化、吸收三步和条件的选择你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
