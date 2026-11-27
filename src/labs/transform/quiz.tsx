// 图形的变换 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座工坊院子。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Place } from './parts'
import { blades4, cm, reflectU } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const B4 = blades4('a90'), P3 = reflectU([-3, 2], 0)
const QS: Q[] = [
  { lesson: '1', q: '把一个图形平移以后，对应点所连的线段', options: ['相交于一点', '平行（或在同一条直线上）且相等', '互相垂直', '长短不一'], answer: 1, why: '平移是整体沿同一方向移动同样的距离，所以每对对应点的连线都平行（或在同一直线上），而且都等于平移的距离。' },
  { lesson: '2', q: '轴对称图形中，对称轴和一对对称点所连的线段是什么关系？', options: ['对称轴平行于这条线段', '对称轴垂直于这条线段', '对称轴垂直平分这条线段', '对称轴经过线段的一个端点'], answer: 2, why: '对称轴不只是垂直于对称点的连线，还经过它的中点：对称轴垂直平分对应点的连线。' },
  { lesson: '3', q: '点 (−3, 2) 关于 y 轴的对称点是', options: ['(3, −2)', `(${P3[0]}, ${P3[1]})`, '(−3, −2)', '(2, −3)'], answer: 1, why: `关于 y 轴对称：过点作 y 轴的垂线，另一侧截取一样长，横坐标变成相反数，纵坐标不变，得到 (${P3[0]}, ${P3[1]})。` },
  { lesson: '4', q: `叶片 OAB 绕点 O 逆时针旋转 90° 得到 OA′B′，OA = ${cm(B4.OA)}，那么 OA′ 是`, options: [cm(B4.OA1), '90 cm', '不能确定', cm(B4.OA / 2)], answer: 0, why: `旋转时对应点到旋转中心的距离相等：OA′ = OA = ${cm(B4.OA1)}。90° 是旋转角，不是距离。` },
  { lesson: '5', q: '两个图形关于点 O 中心对称，下面说法正确的是', options: ['对称点的连线都互相平行', '对称点的连线都经过 O，并且被 O 平分', '点 O 一定在图形上', '把一个图形翻折就和另一个重合'], answer: 1, why: '中心对称就是绕 O 旋转 180°：对称点的连线都经过对称中心 O，并且被 O 平分。O 不一定在图形上；“翻折重合”说的是轴对称。' },
  { lesson: '5', q: '下面哪个图形是中心对称图形？', options: ['正三角形', '平行四边形', '等腰三角形', '正五边形'], answer: 1, why: '平行四边形绕两条对角线的交点旋转 180° 和自己重合，是中心对称图形。正三角形、等腰三角形、正五边形转 180° 都不能和自己重合，它们是轴对称图形。' },
  { lesson: '6', q: '对一个图形做平移、轴对称或旋转，下面哪一项可能改变？', options: ['边的长度', '角的大小', '图形的位置', '图形的面积'], answer: 2, why: '三种变换都只改变位置，不改变形状和大小，变换前后的图形全等，所以边长、角度、面积都不变。' },
  { lesson: '7', q: '一朵四瓣团花由一片花瓣绕中心旋转得到，它至少绕中心旋转多少度能和自己重合？', options: ['45°', '90°', '180°', '360°'], answer: 1, why: '四片花瓣均匀分布，每片之间相隔 360° ÷ 4 = 90°，所以转 90° 就和自己重合。转 360° 任何图形都重合，不算“至少”。' },
  { lesson: '6', q: '关于平移、轴对称、旋转，下面说法正确的是', options: ['只有平移不改变图形的大小', '轴对称会把图形变小', '三种变换前后的图形都全等', '旋转会改变图形的形状'], answer: 2, why: '平移、轴对称、旋转都是全等变换：形状和大小都不变，只改变位置（轴对称还会把绕行方向反过来）。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:transform:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="图形的变换" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <>
        <p className="text-[17px] leading-snug font-bold">九道题答完了：答对 {right} / {QS.length}</p>
        <p className="mt-1 text-[14px] text-white/70">{right === QS.length ? '全对。平移、轴对称、旋转你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
