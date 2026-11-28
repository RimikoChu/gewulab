// 机械振动和机械波 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。题目里的数都从计算核心取。
// 背景是从港池上空看防波堤的口门和灯塔，不加新的器材。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import { num } from './gear'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BUOY, HORN, SPRINGS, TWIN, WATER, doppler, gFrom, lambda, pendT, springT } from './physics'
import { VOICE } from './voice'
import { FishingBoat } from './boats'
import { WALL } from './layout'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const Ta = springT(SPRINGS.a.m, SPRINGS.a.k), Tb = springT(SPRINGS.b.m, SPRINGS.b.k), T1 = pendT(1)
const QS: Q[] = [
  { lesson: '1', q: `弹簧振子（${SPRINGS.a.m} kg、${SPRINGS.a.k} N/m）拉下 5 cm 松手，周期是 ${num(Ta)} s。改成拉下 10 cm 松手，周期是多少？`, options: [`${num(Ta * 2)} s`, `${num(Ta)} s`, `${num(Ta / 2)} s`, `${num(Ta * Math.SQRT2)} s`], answer: 1, why: `弹簧振子的周期 T = 2π√(m/k)，只和质量、劲度系数有关，和振幅无关。振幅大了，路程长了，可平均速度也大了，周期还是 ${num(Ta)} s。` },
  { lesson: '1', q: `同一根弹簧（${SPRINGS.a.k} N/m），把砝码从 ${SPRINGS.a.m} kg 换成 ${SPRINGS.b.m} kg，周期变成原来的几倍？`, options: ['4 倍', '2 倍', '1/2', '不变'], answer: 1, why: `T = 2π√(m/k)，周期和质量的平方根成正比。质量是原来的 4 倍，周期是原来的 √4 = 2 倍：${num(Ta)} s → ${num(Tb)} s。` },
  { lesson: '2', q: '摆长 1.00 m 的单摆，把钢球换成同样大小、轻得多的木球（摆角都很小）。周期怎样变？', options: ['变长，因为木球轻、摆得慢', '变短，因为木球轻、好摆动', '不变', '木球太轻，摆不起来'], answer: 2, why: `单摆的周期 T = 2π√(l/g)，只和摆长、重力加速度有关，和摆球的质量无关。两种球测出来都是 ${num(T1)} s。` },
  { lesson: '2', q: `用单摆测重力加速度：摆长 1.00 m，测得 5 次全振动用时 ${num(T1 * 5)} s。g 约是多少？`, options: [`${num(gFrom(1, T1 * 5), 2)} m/s²`, `${num(gFrom(1, T1), 1)} m/s²`, `${num(2 * Math.PI / T1, 1)} m/s²`, `${num(gFrom(1, T1) * 2, 1)} m/s²`], answer: 1, why: `先求周期：T = ${num(T1 * 5)} ÷ 5 = ${num(T1, 3)} s。g = 4π²l / T² = 4π² × 1.00 ÷ ${num(T1, 3)}² ≈ ${num(gFrom(1, T1), 1)} m/s²。把 5 次的总时间当成周期代进去就错了。` },
  { lesson: '3', q: `固有频率 ${num(BUOY.f0, 1)} Hz 的浮标，在 0.25 Hz 的涌浪里稳定以后，它上下起伏的频率是多少？`, options: [`${num(BUOY.f0, 1)} Hz，等于固有频率`, '0.25 Hz，等于涌浪的频率', '0.75 Hz，两者相加', '0.375 Hz，两者的平均'], answer: 1, why: '受迫振动稳定以后，频率等于驱动力的频率，和固有频率无关。固有频率只决定振幅的大小：驱动力的频率越接近固有频率，振幅越大，相等时发生共振。' },
  { lesson: '4', q: `港池里波速是 ${num(WATER.v, 1)} m/s。造波板的频率从 0.5 Hz 调到 1.0 Hz，水面上的波怎样变？`, options: ['波速加倍，波长不变', `波速不变，波长从 ${num(lambda(0.5), 0)} m 变成 ${num(lambda(1), 0)} m`, '波速、波长都加倍', '浮子被波带着走得更快'], answer: 1, why: `波速由介质决定，同一片水里不变；频率由波源决定。λ = v / f：${num(WATER.v, 1)} ÷ 0.5 = ${num(lambda(0.5), 0)} m，${num(WATER.v, 1)} ÷ 1.0 = ${num(lambda(1), 0)} m。浮子只在原地上下振动，不随波迁移。` },
  { lesson: '5', q: `两个步调一致的波源发出波长 ${num(lambda(TWIN.f), 0)} m 的水波。水面上某点到两个波源的距离分别是 12 m 和 10 m，这一点的振动怎样？`, options: ['始终加强', '始终减弱', '一会儿加强一会儿减弱', '和只开一个波源时一样'], answer: 1, why: `路程差 Δr = 12 − 10 = 2 m，正好是半个波长：一列波的波峰到达时，另一列正好是波谷，互相抵消，这一点的振动始终减弱。路程差是波长整数倍的点才是加强点。` },
  { lesson: '6', q: '外海的波从防波堤的口门进港。下面哪种情况，波绕到堤后的现象最明显？', options: ['口门 16 m，波长 4 m', '口门 16 m，波长 2 m', '口门 4 m，波长 4 m', '口门 32 m，波长 4 m'], answer: 2, why: '发生明显衍射的条件是缝的宽度跟波长差不多，或者比波长更小。四个选项里只有“口门 4 m、波长 4 m”缝宽和波长相等；其余三种口门都是波长的好几倍，波基本沿直线进港。' },
  { lesson: '7', q: `一条船鸣着 ${HORN.f} Hz 的汽笛，以 ${HORN.u} m/s 朝码头驶来（声速 ${HORN.v} m/s）。码头上的人听到的笛声是怎样的？`, options: [`${HORN.f} Hz，和汽笛一样`, `约 ${Math.round(doppler(HORN.f, HORN.u, HORN.v))} Hz，因为汽笛自己的频率变高了`, `约 ${Math.round(doppler(HORN.f, HORN.u, HORN.v))} Hz，汽笛的频率没变，是接收到的频率变高了`, `约 ${Math.round(doppler(HORN.f, -HORN.u, HORN.v))} Hz`], answer: 2, why: `多普勒效应：波源靠近观察者，观察者接收到的频率变高，f′ = f·v/(v − u) = ${HORN.f} × ${HORN.v} ÷ ${HORN.v - HORN.u} ≈ ${Math.round(doppler(HORN.f, HORN.u, HORN.v))} Hz。汽笛自己发声的频率始终是 ${HORN.f} Hz。驶离时听到的是约 ${Math.round(doppler(HORN.f, -HORN.u, HORN.v))} Hz。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:wave:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="机械振动和机械波" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]}><FishingBoat x={WALL.gx - 9} z={WALL.z + 26} hull="#2f5d86" /><FishingBoat x={WALL.gx + 9} z={WALL.z + 36} hull="#8a3328" turn /></Place>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。机械振动和机械波你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
