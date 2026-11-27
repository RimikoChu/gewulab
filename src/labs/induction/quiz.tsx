// 电磁感应和电网 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是电站、升压站和输电线的全景。题目里的数从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { cutEmf, lineLoss, transformer, watt } from './physics'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const t6 = transformer(2200, 220, 1, 10)
const QS: Q[] = [
  { lesson: '1', q: '面积为 S 的线圈放在磁感应强度为 B 的匀强磁场中，线圈平面与磁场方向成 30° 角。穿过线圈的磁通量是多少？', options: ['BS', 'BS sin30° = BS/2', 'BS cos30°', '0'], answer: 1, why: '磁通量要用垂直于磁场方向的投影面积。线圈平面与磁场成 30°，它的法线与磁场成 60°，Φ = BS cos60° = BS sin30° = BS/2。先弄清角是哪两条线之间的。' },
  { lesson: '2', q: '线圈与灵敏电流计组成闭合回路，下列哪种情况电流计的指针会偏转？', options: ['磁铁插在线圈中静止不动', '磁铁和线圈一起以相同速度向右运动', '磁铁正在从线圈中拔出', '线圈不闭合，磁铁插入'], answer: 2, why: '只有穿过闭合回路的磁通量发生变化才有感应电流。磁铁静止、或者和线圈一起运动，磁通量不变；回路不闭合，没有电流。拔出时磁通量减小，指针偏转。' },
  { lesson: '3', q: '条形磁铁的 N 极朝下插入竖直放置的闭合线圈。线圈上端相当于什么极？', options: ['N 极', 'S 极', '不显磁性', '无法判断'], answer: 0, why: '向下的磁通量增大，感应电流的磁场要阻碍它增大，方向向上，所以线圈上端是 N 极，和磁铁的 N 极相对、相斥：增反减同，来拒去留。' },
  { lesson: '3', q: '用细线把一个闭合铝环竖直吊起来，把条形磁铁的一端迅速插向铝环（未穿过）。铝环会怎样？', options: ['向磁铁靠近', '远离磁铁', '不动', '只转动不移动'], answer: 1, why: '磁铁靠近，穿过铝环的磁通量增大，感应电流的磁场阻碍这一变化，铝环受到排斥而远离磁铁。和磁铁是哪一极无关，“来拒去留”。' },
  { lesson: '4', q: '导体棒长 0.10 m，在 0.50 T 的匀强磁场中以 0.20 m/s 的速度垂直切割磁感线。感应电动势多大？', options: [`${(cutEmf(0.2) * 1e3).toFixed(0)} mV`, '0.10 V', '1.0 V', '0.01 mV'], answer: 0, why: `E = BLv = 0.50 × 0.10 × 0.20 V = ${cutEmf(0.2).toFixed(2)} V = ${(cutEmf(0.2) * 1e3).toFixed(0)} mV。这正是第 4 课第三步的读数。` },
  { lesson: '5', q: '交流发电机的线圈转到中性面时，下列说法正确的是哪一项？', options: ['磁通量为零，电动势最大', '磁通量最大，电动势最大', '磁通量最大，电动势为零', '磁通量为零，电动势为零'], answer: 2, why: '中性面上线圈平面和磁场垂直，磁通量最大；但这一瞬间磁通量的变化率为零，电动势为零。转过 90° 后磁通量为零，电动势反而最大。' },
  { lesson: '6', q: `理想变压器原、副线圈匝数比为 1 : 10，原线圈接 220 V 交流电，副线圈接一个 ${watt(t6.P2)} 的负载。原线圈中的电流是多少？`, options: [`${t6.I1.toFixed(0)} A`, `${t6.I2.toFixed(0)} A`, `${(t6.I1 * 100).toFixed(0)} A`, '0'], answer: 0, why: `U₂ = 2200 V，P₁ = P₂ = ${watt(t6.P2)}，I₁ = P/U₁ = ${t6.I1.toFixed(0)} A，I₂ = ${t6.I2.toFixed(0)} A。电流比等于匝数比的倒数。` },
  { lesson: '7', q: '输送功率和线路电阻不变，把输电电压从 10 kV 升高到 100 kV。线路上损失的功率变为原来的多少？', options: ['1/10', '10 倍', '1/100', '100 倍'], answer: 2, why: `I = P/U 变为原来的 1/10，P损 = I²R 变为 1/100。第 7 课里 10 kV 损耗 ${watt(lineLoss(10e3).loss)}，110 kV 只有 ${watt(lineLoss(110e3).loss)}。` },
  { lesson: '7', q: '用 110 kV 输送 11 MW 的电，线路电阻 5 Ω。小明用 P损 = U²/R 算出损耗是 2420 MW。错在哪里？', options: ['电阻应该取 10 Ω', 'U²/R 里的 U 应是导线上的电压降 IR，不是输电电压', '应该用 P损 = UI', '没有错'], answer: 1, why: `输电电压大部分加在用户上，导线两端的电压降只有 IR = 100 × 5 V = 500 V。应该用 P损 = I²R = (P/U)²R = ${watt(lineLoss(110e3).loss)}。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:induction:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="电磁感应和电网" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" cur="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">答对 {right} / {QS.length}</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{right === QS.length ? '全对。从磁通量到远距离输电，你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
      </div>}
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
