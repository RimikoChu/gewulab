// 机械运动 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是站外的正线。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import At from './at'
import { LINE, Train, lineX } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '用分度值是 1 mm 的刻度尺量一支铅笔，下面哪个记录是对的？', options: ['17.8 cm', '17.82 cm', '17.820 cm', '178 mm'], answer: 1, why: '要读到分度值的下一位。分度值 1 mm 也就是 0.1 cm，所以用 cm 做单位时要有两位小数。' },
  { lesson: '1', q: '关于误差和错误，下面哪句话是对的？', options: ['误差就是错误', '认真测量就可以消除误差', '多次测量取平均值可以减小误差', '用精密的仪器就没有误差'], answer: 2, why: '错误可以避免；误差只能减小，不能消除。多次测量取平均值是减小误差的常用办法。' },
  { lesson: '2', q: '停表的小表盘指针刚过 1，大表盘指针指着 36.5。这次计时是多少秒？', options: ['36.5 s', '1.365 s', '96.5 s', '136.5 s'], answer: 2, why: '小表盘读分，是 1 分钟，也就是 60 秒；大表盘读秒，是 36.5 秒。加起来 96.5 秒。' },
  { lesson: '3', q: '坐在行驶的列车里的乘客，说自己是静止的。他选的参照物是什么？', options: ['路边的树', '站台', '他坐的这节车厢', '迎面开来的列车'], answer: 2, why: '乘客相对车厢的位置没有变，所以以车厢为参照物他是静止的。以树或站台为参照物，他是运动的。' },
  { lesson: '3', q: '加油机在空中给战斗机加油时，以加油机为参照物，战斗机是怎样的？', options: ['静止的', '向前运动', '向后运动', '无法判断'], answer: 0, why: '两架飞机速度的大小和方向都相同，相对位置不变，所以互相看对方都是静止的。' },
  { lesson: '4', q: '72 km/h 合多少 m/s？', options: ['7.2 m/s', '20 m/s', '72 m/s', '259.2 m/s'], answer: 1, why: '1 m/s = 3.6 km/h，所以 72 ÷ 3.6 = 20 m/s。' },
  { lesson: '4', q: '甲 10 秒跑了 80 m，乙 20 秒跑了 150 m。谁跑得快？', options: ['甲', '乙', '一样快', '无法比较'], answer: 0, why: '甲的速度是 80 ÷ 10 = 8 m/s，乙是 150 ÷ 20 = 7.5 m/s。甲快。' },
  { lesson: '5', q: '做匀速直线运动的物体，它的路程和时间的图像是什么样的？', options: ['一条水平的直线', '一条过原点的倾斜直线', '一条越来越陡的曲线', '一条越来越平的曲线'], answer: 1, why: '匀速时路程和时间成正比，图像是过原点的斜直线。越来越陡的曲线说明越走越快。' },
  { lesson: '7', q: '一列长 200 m 的列车，以 20 m/s 的速度完全通过一座长 1800 m 的大桥，需要多长时间？', options: ['80 s', '90 s', '100 s', '110 s'], answer: 2, why: '完全通过要走桥长加车长：1800 + 200 = 2000 m，2000 ÷ 20 = 100 s。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:motion:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="机械运动" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<At at="line" labels={[]}><Train x={lineX(420)} z={LINE.z} len={25} s={0.8} y={0.3} /></At>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。机械运动你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
