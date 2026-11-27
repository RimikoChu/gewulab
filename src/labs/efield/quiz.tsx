// 静电场 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是车间的全景。题目里的数从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LESSONS, goLesson } from './lessons'
import { CAP, DOME, JET, capVoltage, deflect, fieldWork, gunSpeed, pointField, sci } from './physics'
import { Final } from './ui'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const mm = (y: number) => (y * 1e3).toFixed(1)
const QS: Q[] = [
  { lesson: '1', q: '两个点电荷之间的静电力是 F。把它们的距离增大到原来的 2 倍，同时把其中一个的电荷量增大到原来的 2 倍，力变成多少？', options: ['F', 'F/2', 'F/4', '2F'], answer: 1, why: 'F = kq₁q₂/r²。电荷量加倍，力变 2 倍；距离加倍，力变成四分之一。合起来是 F/2。距离是按平方算的。' },
  { lesson: '2', q: `带电金属球周围某一点的电场强度是 ${sci(pointField(DOME.Q, DOME.r[0]))} N/C。把放在那里的试探电荷拿走，这一点的电场强度是多少？`, options: ['变为 0', `仍是 ${sci(pointField(DOME.Q, DOME.r[0]))} N/C`, '变大', '无法确定'], answer: 1, why: '电场强度由场源电荷和位置决定，与放不放试探电荷、试探电荷多大都无关。第 2 课换了小球，F/q 没有变。' },
  { lesson: '2', q: `离点电荷 ${DOME.r[0].toFixed(2)} m 处的电场强度是 ${sci(pointField(DOME.Q, DOME.r[0]))} N/C。离它 ${DOME.r[2].toFixed(2)} m 处是多少？`, options: [`${sci(pointField(DOME.Q, DOME.r[0]) / 3)} N/C`, `${sci(pointField(DOME.Q, DOME.r[2]))} N/C`, `${sci(pointField(DOME.Q, DOME.r[1]))} N/C`, `${sci(pointField(DOME.Q, DOME.r[0]) * 3)} N/C`], answer: 1, why: `E = kQ/r²。距离变成 3 倍，电场强度变成九分之一：${sci(pointField(DOME.Q, DOME.r[2]))} N/C。` },
  { lesson: '3', q: '两个等量同种点电荷，它们连线的中点处电场强度怎样？', options: ['最大', '为 0', '等于一个电荷单独产生的 2 倍', '方向指向其中一个电荷'], answer: 1, why: '两个电荷在中点产生的电场大小相等、方向相反，叠加以后是 0。第 3 课里那里一条电场线也没有。等量异种电荷的中点才是两者相加。' },
  { lesson: '4', q: '在电场中把一个电荷沿同一个等势面从 B 点移到 C 点，电场力做的功怎样？', options: ['一定做正功', '一定做负功', '不做功', '与电荷的正负有关'], answer: 2, why: 'W = qU。同一个等势面上各点电势相等，U = 0，所以电场力不做功。等势面与电场线垂直，力与位移垂直。' },
  { lesson: '4', q: `一个带负电的粒子从电势 500 V 的 A 点移到电势 100 V 的 B 点，它的电势能怎样变？（正电荷 2.0×10⁻⁸ C 走这一段，电场力做功 ${sci(fieldWork('A', 'B'))} J。）`, options: ['减少', '增加', '不变', '先增后减'], answer: 1, why: '负电荷受的电场力与电场方向相反。它顺着电场线从高电势到低电势，电场力做负功，电势能增加。正电荷才是减少。' },
  { lesson: '5', q: '平行板电容器充电后与电源断开，再把两板的距离拉大。下列说法正确的是哪一项？', options: ['电荷量减小，电压不变', '电荷量不变，电压升高', '电荷量不变，电压降低', '电容增大'], answer: 1, why: `断开电源，电荷没有地方去，Q 不变。板距增大，电容减小，U = Q/C 升高。第 5 课板距加倍，电压从 ${CAP.U0} V 升到 ${capVoltage('far').toFixed(0)} V。` },
  { lesson: '6', q: `电子从静止经 500 V 的电压加速后速度是 ${sci(gunSpeed(500), 2)} m/s。要让它的速度变成 2 倍，加速电压应该是多少？`, options: ['1000 V', '2000 V', '250 V', '4000 V'], answer: 1, why: `qU = ½mv²，速度与电压的平方根成正比。速度变 2 倍，电压要变 4 倍，是 2000 V，这时 v = ${sci(gunSpeed(2000), 2)} m/s。` },
  { lesson: '7', q: `打印头里，带 ${sci(JET.q[1])} C 的墨滴落点的侧移是 ${mm(deflect(JET.q[1]).y)} mm。把墨滴的电荷量加倍，同时把偏转电压减半，落点的侧移是多少？`, options: [`${mm(deflect(JET.q[1]).y / 2)} mm`, `${mm(deflect(JET.q[2], JET.U / 2).y)} mm`, `${mm(deflect(JET.q[2]).y)} mm`, `${mm(deflect(JET.q[2]).y * 2)} mm`], answer: 1, why: '加速度 a = qU/(md)，侧移与 q 和 U 的乘积成正比。q 加倍、U 减半，乘积不变，落点不变。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:efield:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="静电场" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" cur="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <Final kicker="九道题都答完了" title={`答对 ${right} / ${QS.length}`}
        body={right === QS.length ? '全对。静电场这一单元你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="flex items-center justify-between text-[12.5px] text-white/55"><span>第 {i + 1} / {QS.length} 题 · 对应第 {q.lesson} 课</span><span className="tabular-nums">答对 {right} / {answered}</span></div>
          <div className="mt-2 flex gap-1">{QS.map((x, k) => <button key={k} onClick={() => setI(k)} aria-label={`第 ${k + 1} 题`} className={cn('h-1.5 flex-1 rounded-full', picked[k] === null ? 'bg-white/15' : picked[k] === x.answer ? 'bg-[#35c7b3]' : 'bg-[#ff6b6b]', k === i && 'ring-2 ring-white/60')} />)}</div>
          <p className="mt-4 text-[16px] leading-relaxed font-medium">{q.q}</p>
          <div className="mt-4 flex flex-col gap-2">
            {q.options.map((o, k) => {
              const show = mine !== null, isAns = k === q.answer, isMine = k === mine
              return <button key={k} onClick={() => choose(k)} disabled={show}
                className={cn('flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14.5px] transition-colors', !show && 'bg-white/8 hover:bg-white/14', show && isAns && 'bg-[#35c7b3]/25 text-white', show && isMine && !isAns && 'bg-[#ff6b6b]/25', show && !isAns && !isMine && 'bg-white/5 text-white/50')}>
                <span className="grid size-6 flex-none place-items-center rounded-full border border-white/30 text-[12.5px]">{show && isAns ? <Check className="size-3.5" strokeWidth={3} /> : show && isMine ? <X className="size-3.5" strokeWidth={3} /> : 'ABCD'[k]}</span>{o}
              </button>
            })}
          </div>
          {mine !== null && <p className="hint-in mt-4 rounded-xl bg-white/6 px-3 py-2.5 text-[14px] leading-relaxed text-white/80">{q.why}</p>}
        </Glass>
      }
      actions={<>
        <LabButton onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}><ArrowLeft className="size-4" />上一题</LabButton>
        <LabButton primary onClick={() => setI(Math.min(QS.length - 1, i + 1))} disabled={i === QS.length - 1}>下一题<ArrowRight className="size-4" /></LabButton>
        {mine !== null && mine !== q.answer && <LabButton onClick={() => goLesson(q.lesson)}>回到第 {q.lesson} 课</LabButton>}
      </>}
      extras={null}
    />
  )
}
