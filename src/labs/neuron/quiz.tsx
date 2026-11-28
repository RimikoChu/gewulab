// 兴奋的传导和传递 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是从另一侧看的整个神经元。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { ION, NA_OUT, PROBE, SITES, THRESHOLD, deflect, meterV, peakV, postV } from './physics'
import { mv } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const dm = deflect(SITES.mid), dl = deflect(SITES.left)
const QS: Q[] = [
  { lesson: '1', q: '在一个神经元里，兴奋通常的走向是：', options: ['轴突 → 细胞体 → 树突', '树突 → 细胞体 → 轴突', '细胞体 → 树突 → 轴突', '轴突 → 树突 → 细胞体'], answer: 1, why: '树突接受信息并传到细胞体，轴突把信息从细胞体传向其他神经元、肌肉或腺体。' },
  { lesson: '2', q: '静息电位主要是由哪种离子的流动形成的？', options: ['Na⁺ 内流', 'K⁺ 外流', 'K⁺ 内流', 'Cl⁻ 内流'], answer: 1, why: `静息时膜主要对 K⁺ 有通透性，K⁺ 外流，膜外正、膜内负。把微电极插进膜内，读到约 ${mv(meterV(true, 'normal'))} mV。` },
  { lesson: '3', q: '动作电位上升阶段，Na⁺ 进入细胞的方式是：', options: ['主动运输，消耗能量', '协助扩散，不消耗能量', '自由扩散', '胞吞'], answer: 1, why: 'Na⁺ 顺浓度梯度、经通道蛋白内流，是协助扩散，不消耗能量。把 Na⁺ 送出去、把 K⁺ 接回来的钠钾泵才是主动运输。' },
  { lesson: '4', q: '兴奋在神经纤维上传导时，传导方向和局部电流的方向：', options: ['和膜外电流方向一致', '和膜内电流方向一致', '和两者都一致', '和两者都相反'], answer: 1, why: '膜内的电流从兴奋部位流向未兴奋部位，和兴奋传导的方向一致；膜外的电流方向相反。' },
  { lesson: '5', q: `两个电极 a、b 都搭在神经纤维膜外，在 a、b 正中间给一次刺激，电表指针：`, options: ['偏转 1 次', '偏转 2 次，方向相反', '偏转 2 次，方向相同', '不偏转'], answer: 3, why: `兴奋同时到达 a 和 b（都是 ${dm.ta.toFixed(1)} ms），两处膜外同时变负，没有电位差，偏转 ${dm.times} 次。` },
  { lesson: '6', q: '兴奋在神经元之间只能单向传递，原因是：', options: ['突触间隙太宽', '神经递质只能由突触前膜释放，作用于突触后膜', '突触后膜没有离子通道', '兴奋在神经纤维上只能单向传导'], answer: 1, why: '神经递质只存在于突触小泡中，只能由突触前膜释放，然后作用于突触后膜。' },
  { lesson: '7', q: '抑制性递质和突触后膜上的受体结合后，突触后膜：', options: ['Na⁺ 内流，产生动作电位', 'Cl⁻ 内流，膜内更负，更难兴奋', 'K⁺ 内流，产生动作电位', '没有任何电位变化'], answer: 1, why: `抑制性递质使 Cl⁻ 内流，后膜电位从 ${mv(meterV(true, 'normal'))} 降到约 ${mv(postV('inh').v)} mV，离阈电位 ${mv(THRESHOLD)} mV 更远了。` },
  { lesson: '5', q: `电极 a 在 ${PROBE.a} cm 处、b 在 ${PROBE.b} cm 处，都搭在膜外。在 ${SITES.left} cm 处给一次刺激，指针偏转几次？`, options: ['0 次', '1 次', '2 次，方向相反', '2 次，方向相同'], answer: 2, why: `兴奋 ${dl.ta.toFixed(1)} ms 到 a、${dl.tb.toFixed(1)} ms 到 b，先后到达，指针偏转 ${dl.times} 次，方向相反。` },
  { lesson: '3', q: '把神经纤维放进 Na⁺ 浓度减半的溶液里再刺激，和正常时相比：', options: ['静息电位绝对值变大', '动作电位的峰值变低', '动作电位的峰值变高', '不能产生静息电位'], answer: 1, why: `动作电位的上升靠 Na⁺ 内流。膜外 Na⁺ 从 ${ION.naOut} 降到 ${NA_OUT.half} mmol/L，峰值从约 ${mv(peakV())} 降到约 ${mv(peakV({ ...ION, naOut: NA_OUT.half }))} mV；静息电位主要由 K⁺ 决定，基本不变。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:neuron:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title={TITLE} lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Room at="quiz" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。从膜电位到突触传递，这一节你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
