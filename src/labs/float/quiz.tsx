// 浮力 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。
import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { LIQUIDS } from './physics'
import { BRIM, Crane, DockStage, Hoist, Pool, Water } from './dock'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '一只船锚在空气中称，吊秤读数是 29.4 kN；完全浸没在水中称，读数是 25.6 kN。它受到的浮力是多少？', options: ['3.8 kN', '25.6 kN', '29.4 kN', '55.0 kN'], answer: 0, why: '称重法：F浮 = G − F拉 = 29.4 − 25.6 = 3.8 kN。' },
  { lesson: '1', q: '浮力的方向是怎样的？', options: ['竖直向下', '竖直向上', '垂直于物体的表面', '和物体运动的方向相反'], answer: 1, why: '浮力总是竖直向上，和重力的方向相反。' },
  { lesson: '2', q: '浸没在水中的正方体，上表面受到水向下的压力是 4.9 kN，下表面受到水向上的压力是 14.7 kN。它受到的浮力是多少？', options: ['4.9 kN', '14.7 kN', '9.8 kN', '19.6 kN'], answer: 2, why: '浮力是上下表面的压力差：14.7 − 4.9 = 9.8 kN。' },
  { lesson: '3', q: '下面哪一个因素，不影响物体受到的浮力大小？', options: ['液体的密度', '物体排开液体的体积', '物体浸没后所在的深度', '以上三个都有影响'], answer: 2, why: '浮力只和液体密度、排开液体的体积有关。浸没以后放得再深，排开的体积不变，浮力也不变。' },
  { lesson: '4', q: '体积是 2 m³ 的钢锭完全浸没在淡水中（ρ水 = 1.0×10³ kg/m³，g 取 9.8 N/kg），它受到的浮力是多少？', options: ['2.0 kN', '9.8 kN', '19.6 kN', '153.9 kN'], answer: 2, why: 'F浮 = ρ液 g V排 = 1.0×10³ × 9.8 × 2 = 19.6×10³ N = 19.6 kN。和钢的密度没有关系。' },
  { lesson: '4', q: '做阿基米德原理实验时，如果溢水杯一开始没有装满，测出来的 G排 会怎样？', options: ['偏大', '偏小', '不受影响', '无法判断'], answer: 1, why: '水面要先升到溢水口才会往外流，有一部分排开的水留在了杯里，流出来的就少了。' },
  { lesson: '5', q: '一个体积 1 m³、质量 900 kg 的物体放进淡水里，静止以后是什么情况？', options: ['沉底，浮力 9.8 kN', '悬浮，浮力 9.8 kN', '漂浮，浮力 9.8 kN', '漂浮，浮力 8.82 kN'], answer: 3, why: '它的密度比水小，会漂浮。漂浮时浮力等于重力：900 × 9.8 = 8820 N = 8.82 kN。' },
  { lesson: '6', q: '一艘轮船从江里开到海里（海水密度更大），它受到的浮力和吃水深度怎样变化？', options: ['浮力变大，吃水不变', '浮力不变，吃水变浅', '浮力变小，吃水变浅', '浮力不变，吃水变深'], answer: 1, why: '船一直漂浮，浮力始终等于重力，所以不变。海水更密，排开的体积变小，船会浮起来一些。' },
  { lesson: '7', q: '热气球加热球内的空气以后能升空，主要原因是什么？', options: ['球外空气给它的浮力变大了', '球的体积变大了很多', '球内空气变稀，气球的总重力变小了', '空气对气球的压强变小了'], answer: 2, why: '球囊体积基本不变，浮力不变。加热让球内空气密度变小，总重力小于浮力，气球就上升。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:float:q'
const TARGET = new THREE.Vector3(1.1, 3.9, 0), SPAN: [number, number] = [10.4, 10.6]

export default function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<(number | null)[]>(() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) && a.length === QS.length ? a : QS.map(() => null) } catch { return QS.map(() => null) } })
  const [finale, setFinale] = useState(false)
  const stir = useRef(0.12)
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
    <LabShell title="浮力" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<DockStage labels={[]} target={TARGET} span={SPAN}><Pool /><Crane /><Hoist y={6.4} reading="0.00" /><Water levelY={BRIM} color={LIQUIDS.fresh.color} stir={stir} /></DockStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。浮力这一章你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
