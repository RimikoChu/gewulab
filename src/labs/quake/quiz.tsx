// 地震 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是太空里的地球。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import Spot from './world'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { K, PROC, SHADOW, energyRatio, lagSP, natPeriod } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const R = Math.round(energyRatio(1))
const QS: Q[] = [
  { lesson: '1', q: '震中在哪里？', options: ['岩层断裂、错动的地方', '震源正上方的地面', '离震源最远的地面', '最近的地震台'], answer: 1, why: '岩层断裂、错动的地方是震源，在地下；震源正上方的地面才是震中。' },
  { lesson: '2', q: '一次地震有几个震级、几个烈度？', options: ['震级一个，烈度多个', '震级、烈度都只有一个', '震级多个，烈度一个', '震级、烈度都有多个'], answer: 0, why: '震级表示这次地震释放的能量，只有一个；烈度表示各地受影响的程度，处处不同。' },
  { lesson: '2', q: '一次 8 级地震释放的能量，约是一次 7 级地震的多少倍？', options: ['约 2 倍', '约 10 倍', `约 ${R} 倍`, '约 100 倍'], answer: 2, why: `震级每大 1 级，能量约大 ${R} 倍，不是 10 倍。` },
  { lesson: '3', q: '地震发生时，在湖面船上的人会感到什么？', options: ['只有上下颠', '先上下颠，后左右晃', '只有左右晃', '先左右晃，后上下颠'], answer: 0, why: '横波只能在固体里传播，过不了水；纵波能过水，所以船上只感到上下颠。' },
  { lesson: '3', q: '地面上的房子，地震时先感到哪种波？', options: ['横波，因为它破坏力大', '纵波，因为它传得快', '两种波同时到', '离得近先到横波，离得远先到纵波'], answer: 1, why: `纵波约 6 km/s，横波约 3.5 km/s，纵波总是先到。离得越远，横波晚得越多：60 km 处约晚 ${lagSP(60, 14).toFixed(0)} s。` },
  { lesson: '4', q: '震中附近的地方，为什么收不到有效的地震预警？', options: ['那里没有手机信号', '那里的地震太小', '警报发出之前，横波已经到了', '预警只发给大城市'], answer: 2, why: `台站测到纵波后还要几秒处理（这里取 ${PROC} s），离得太近的地方横波已经到了，这一圈叫盲区。` },
  { lesson: '5', q: '只用两个地震台，为什么定不出震中？', options: ['两个圆一般有两个交点', '两个圆没有交点', '时间差算不出来', '台站离震中太远'], answer: 0, why: `每个台站由时间差算出距离（晚 1 s 约远 ${K.toFixed(1)} km），只能画出一个圆。两个圆一般交出两个点，要第三个圆才能定下来。` },
  { lesson: '6', q: '横波传到地下约 2900 km 处就消失了，这说明什么？', options: ['内核是液态的', '外核可能是液态的', '地幔是液态的', '横波跑不了那么远'], answer: 1, why: `横波只能在固体里传播。在古登堡面横波消失、纵波变慢，说明下面的外核是液态的。离震中 ${SHADOW[0]}°–${SHADOW[1]}° 有影区，也和这一层有关。` },
  { lesson: '7', q: '一次地震的主要周期约 1 s，下面哪栋楼最可能共振？', options: ['3 层楼', '10 层楼', '20 层楼', '一样危险'], answer: 1, why: `楼的固有周期约是层数 × 0.1 s：10 层楼约 ${natPeriod(10)} s，和地震波合拍。不是越高越危险。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:quake:q'

export default function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<(number | null)[]>(() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) && a.length === QS.length ? a : QS.map(() => null) } catch { return QS.map(() => null) } })
  const [finale, setFinale] = useState(false)
  const q = QS[i], mine = picked[i]
  const answered = picked.filter(x => x !== null).length, right = picked.filter((x, k) => x === QS[k].answer).length
  const choose = (k: number) => {
    if (mine !== null) return
    const n = picked.map((x, j) => (j === i ? k : x)); setPicked(n); try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* 忽略 */ }
    if (n.every(x => x !== null)) setTimeout(() => setFinale(true), 1400)
  }
  const resetAll = () => { setPicked(QS.map(() => null)); setI(0); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  const done = { all: answered === QS.length, pass: right >= 7 }
  const hint = mine === null ? '选一个答案' : mine === q.answer ? '答对了' : `答错了：可以回到第 ${q.lesson} 课再做一遍`
  return (
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="地震" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Spot at="globe" labels={[]} want={{ globe: { face: [103.4, 31], belts: ['pacific', 'alpide'] } }} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。地震是怎么回事，你已经弄明白了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
