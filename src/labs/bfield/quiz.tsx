// 带电粒子在磁场中 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是加速器大厅的全景。题目里的数从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { AMP, CYCLO, MEV, ampForce, cycloEk, cycloFreq } from './physics'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: `一根长 ${AMP.L} m 的导线垂直放在 ${AMP.B} T 的匀强磁场中，通以 3 A 的电流。它受到的安培力多大？方向怎样判断？`, options: [`${ampForce(3).toFixed(2)} N，用右手定则`, `${ampForce(3).toFixed(2)} N，用左手定则`, `${(ampForce(3) * 10).toFixed(1)} N，用左手定则`, '0，导线不受力'], answer: 1, why: `F = BIL = ${AMP.B} × 3 × ${AMP.L} N = ${ampForce(3).toFixed(2)} N。判断安培力方向用左手定则：磁感线穿过掌心，四指指电流，拇指指力。右手是判断电流磁场方向用的。` },
  { lesson: '2', q: '电子水平向右飞入垂直纸面向里的匀强磁场，刚进入时它受到的洛伦兹力朝哪？', options: ['向上', '向下', '向左', '垂直纸面向外'], answer: 1, why: '对正电荷，四指向右、磁感线穿过掌心向里，拇指向上；电子带负电，受力方向相反，向下。负电荷要让四指指向它运动的反方向。' },
  { lesson: '2', q: '带电粒子只受洛伦兹力，在磁场中运动了一段时间。下列说法正确的是哪一项？', options: ['速度大小一定变大', '动能一定改变', '洛伦兹力对粒子不做功，速度大小不变', '洛伦兹力的方向与速度方向相同'], answer: 2, why: '洛伦兹力总与速度垂直，只改变速度的方向，对粒子不做功，所以速度大小、动能都不变。' },
  { lesson: '3', q: '同一电子在同一匀强磁场中做匀速圆周运动。若速度变为原来的 2 倍，同时磁感应强度也变为原来的 2 倍，半径怎样变？', options: ['变为 4 倍', '变为 2 倍', '不变', '变为一半'], answer: 2, why: 'r = mv/(qB)：v 加倍半径加倍，B 加倍半径减半，两者一起变，半径不变。第 3 课最后一步就是这样。' },
  { lesson: '4', q: '质子在匀强磁场中做匀速圆周运动。把它的速度增大到 3 倍，它转一圈的时间怎样变？', options: ['变为 3 倍', '变为 1/3', '变为 9 倍', '不变'], answer: 3, why: 'T = 2πm/(qB)，与速度无关。速度变大，半径也按比例变大，路程变长，所用时间不变。' },
  { lesson: '5', q: '速度选择器中，速度为 E/B 的质子恰好沿直线通过。换成速度相同的电子从同一处射入，它会怎样？', options: ['向电场力方向偏转', '向洛伦兹力方向偏转', '仍沿直线通过', '速度减小后停下'], answer: 2, why: '电子带负电，电场力和洛伦兹力都反向，大小仍然 qE = qvB，照样平衡。速度选择器只选择速度，与电性、质量无关。' },
  { lesson: '6', q: '质谱仪中，同一种元素两种同位素的一价离子经同一电压加速后进入同一磁场。打在底片上离狭缝较远的是哪一种？', options: ['质量较大的', '质量较小的', '两种打在同一处', '无法判断'], answer: 0, why: 'r = (1/B)√(2mU/q)，电荷量相同时质量大的半径大，离狭缝远。第 6 课里氖 22 在氖 20 的外侧。' },
  { lesson: '7', q: `回旋加速器中磁场 B = ${CYCLO.B} T，加速质子。D 形盒间交变电压的频率应该是多少？`, options: [`约 ${(cycloFreq() / 2e6).toFixed(1)} MHz`, `约 ${(cycloFreq() / 1e6).toFixed(1)} MHz`, `约 ${(cycloFreq() * 2 / 1e6).toFixed(1)} MHz`, '随质子速度增大而增大'], answer: 1, why: `交变电压的周期要等于质子的回旋周期，f = qB/(2πm) ≈ ${(cycloFreq() / 1e6).toFixed(1)} MHz。回旋周期与速度无关，所以频率固定不变。` },
  { lesson: '7', q: '要提高回旋加速器引出质子的最大动能，下列做法可行的是哪一项？', options: ['只增大两 D 形盒间的电压', '只增大 D 形盒的半径', '只减小磁感应强度', '只增大交变电压的频率'], answer: 1, why: `最大动能 Ek = q²B²R²/(2m)，由 B 和 R 决定，与加速电压无关。这台 R = ${CYCLO.radii[1]} m 时约 ${(cycloEk(CYCLO.radii[1]) / MEV).toFixed(1)} MeV，比 ${CYCLO.radii[0]} m 时大。电压大只是圈数少。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:bfield:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="带电粒子在磁场中" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" cur="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">答对 {right} / {QS.length}</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{right === QS.length ? '全对。带电粒子在磁场中的运动你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
