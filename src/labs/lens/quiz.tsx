// 光的折射和凸透镜成像 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是光具座上的一次成像。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import Bench from './bench'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '光从空气斜射入水中，折射角和入射角相比怎样？', options: ['折射角大于入射角', '折射角小于入射角', '两者相等', '无法确定'], answer: 1, why: '光从空气斜射入水或玻璃时，折射光线向法线偏折，折射角小于入射角。' },
  { lesson: '1', q: '光垂直射到水面上，进入水中以后传播方向怎样？', options: ['向左偏折', '向右偏折', '不改变', '被全部反射回来'], answer: 2, why: '垂直入射时入射角是 0°，折射角也是 0°，传播方向不变。' },
  { lesson: '2', q: '下面哪种透镜对光有会聚作用？', options: ['中间厚、边缘薄的凸透镜', '中间薄、边缘厚的凹透镜', '厚薄均匀的玻璃片', '平面镜'], answer: 0, why: '凸透镜中间厚、边缘薄，对光有会聚作用；凹透镜对光有发散作用。' },
  { lesson: '3', q: '凸透镜的焦距是 10 cm，把蜡烛放在离透镜 30 cm 处，光屏上得到的像是怎样的？', options: ['倒立、放大的实像', '倒立、缩小的实像', '正立、放大的虚像', '倒立、等大的实像'], answer: 1, why: '物距 30 cm 大于二倍焦距 20 cm，成倒立、缩小的实像。照相机就是这样用的。' },
  { lesson: '3', q: '还是这块焦距 10 cm 的凸透镜，把蜡烛移到离透镜 6 cm 处，会怎样？', options: ['光屏上得到倒立、放大的实像', '光屏上得到正立、放大的像', '光屏上接不到像，透过透镜能看到正立、放大的虚像', '什么像都没有'], answer: 2, why: '物距小于一倍焦距时成正立、放大的虚像。虚像不能用光屏接住，只能用眼睛透过透镜看。' },
  { lesson: '4', q: '通过凸透镜光心的光线，穿过透镜后怎样传播？', options: ['经过焦点', '平行于主光轴', '传播方向不变', '被反射回去'], answer: 2, why: '过光心的光线方向不变；平行于主光轴的光线过焦点；过焦点的光线平行于主光轴射出。' },
  { lesson: '5', q: '用投影仪放映时，要在屏幕上看到正立的画面，胶片应该怎样放？', options: ['正着放', '倒着放', '怎样放都行', '斜着放'], answer: 1, why: '投影仪成的是倒立、放大的实像，所以胶片要倒着放，屏幕上的画面才是正的。' },
  { lesson: '6', q: '近视眼看不清远处的东西，是因为像成在了哪里？应该戴什么透镜？', options: ['视网膜后面，戴凸透镜', '视网膜前面，戴凸透镜', '视网膜前面，戴凹透镜', '视网膜后面，戴凹透镜'], answer: 2, why: '近视眼的晶状体太厚，折光太强，像成在视网膜前面。凹透镜能先把光发散一些，让像落回视网膜上。' },
  { lesson: '7', q: '望远镜的物镜对远处的物体成的是什么样的像？', options: ['正立、放大的虚像', '倒立、放大的实像', '倒立、缩小的实像', '正立、缩小的虚像'], answer: 2, why: '远处的物体在物镜的二倍焦距以外，成倒立、缩小的实像；目镜再像放大镜一样把它放大。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:lens:q'

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
    <LabShell narration={voiced(NARRATION['q'], VOICE)} autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="折射和凸透镜" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Bench u={30} image rays={3} labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。折射和凸透镜成像你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
