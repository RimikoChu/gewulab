// 质量与密度 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是天平上称着的一块铜。题目里的数都从计算核心取。
import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { Balance, WeightSet } from './balance'
import { LESSONS, goLesson } from './lessons'
import { BASE2, BOX2 } from './lesson2'
import { Block, Room, newLive } from './parts'
import { BRINE, COPPER, ICE_M, RHO, STONE, brineAll, brinePart, displaced, massOf, reading, sci, stoneV2, toSI, volumeOf, weigh, weightsText } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const W = weigh(COPPER), A = brineAll(), P = brinePart(), FE = 158, BALL_V = 30, feV = volumeOf('fe', FE)
const QS: Q[] = [
  { lesson: '1', q: `一块 ${ICE_M} g 的冰全部熔化成水，下面哪种说法对？`, options: ['质量变小，体积不变', '质量不变，体积变小', '质量变大，体积变大', '质量和体积都不变'], answer: 1, why: `质量不随状态改变，还是 ${ICE_M} g。冰的体积是 ${volumeOf('ice', ICE_M)} cm³，化成水是 ${volumeOf('water', ICE_M)} cm³，体积变小了。` },
  { lesson: '2', q: '调节天平时，游码已经归零，指针偏向分度盘的左侧。应该怎么办？', options: ['把平衡螺母向左调', '把平衡螺母向右调', '向右盘加砝码', '向右移动游码'], answer: 1, why: '指针偏左说明左边沉，要把平衡螺母向右调。称量之前不能用砝码和游码来调平。' },
  { lesson: '2', q: `天平平衡时，右盘里有 ${weightsText(W.on).replace(/ \+ /g, '、')} 的砝码各一个，游码在标尺上对着 ${W.rider.toFixed(1)} g。物体的质量是多少？`, options: [`${W.sum} g`, `${reading(W.on, W.rider)} g`, `${W.sum - W.rider} g`, `${W.sum + 2 * W.rider} g`], answer: 1, why: `物体的质量 = 砝码的总质量 + 游码的示数 = ${W.sum} g + ${W.rider.toFixed(1)} g = ${reading(W.on, W.rider)} g。` },
  { lesson: '3', q: '用量筒量水的体积，读数时俯视凹液面，读出来的数和真实值相比怎样？', options: ['偏大', '偏小', '一样', '有时大有时小'], answer: 0, why: '俯视时视线落在比液面高的刻线上，读数偏大；仰视偏小。视线要和凹液面的最低处相平。' },
  { lesson: '3', q: `量筒里原来有 ${STONE.v1} mL 水，把一块石头浸没进去，水面升到 ${stoneV2()} mL。石头的体积是多少？`, options: [`${stoneV2()} cm³`, `${STONE.v1} cm³`, `${displaced(STONE.v1, stoneV2())} cm³`, `${STONE.v1 + stoneV2()} cm³`], answer: 2, why: `石头的体积等于它排开的水的体积：${stoneV2()} mL − ${STONE.v1} mL = ${displaced(STONE.v1, stoneV2())} mL = ${displaced(STONE.v1, stoneV2())} cm³。` },
  { lesson: '4', q: `10 cm³ 的铝块质量是 ${massOf('al', 10)} g。同样的铝做成 30 cm³ 的一块，质量是多少？`, options: [`${massOf('al', 10)} g`, `${massOf('al', 20)} g`, `${massOf('al', 30)} g`, `${massOf('al', 10) / 3} g`], answer: 2, why: `同种物质的质量和体积成正比：体积是 3 倍，质量也是 3 倍，${massOf('al', 10)} g × 3 = ${massOf('al', 30)} g。` },
  { lesson: '5', q: '把一块铝切掉一半，剩下的这一半，密度怎样？', options: ['变成原来的一半', '变成原来的两倍', '不变', '无法确定'], answer: 2, why: `密度是物质的一种特性。切掉一半，质量和体积都减半，比值不变，还是 ${RHO.al.rho} g/cm³，也就是 ${sci(toSI(RHO.al.rho))} kg/m³。` },
  { lesson: '6', q: '测盐水的密度：先称出烧杯和盐水的总质量，再把盐水全部倒进量筒读体积。这样算出的密度会怎样？', options: ['偏大', '偏小', '正好', '无法判断'], answer: 0, why: `烧杯壁上总会沾着一些盐水，量筒里的体积偏小，算出的密度偏大。实验室里那杯盐水，全倒算出约 ${A.rho.toFixed(2)} g/cm³，只倒出 ${BRINE.part} mL 再称剩下的，算出 ${P.rho.toFixed(2)} g/cm³。` },
  { lesson: '7', q: `一只铁球质量 ${FE} g，体积 ${BALL_V} cm³，铁的密度是 ${RHO.fe.rho} g/cm³。它是空心的还是实心的？`, options: ['实心的', `空心的，空心部分 ${BALL_V - feV} cm³`, `空心的，空心部分 ${feV} cm³`, '无法判断'], answer: 1, why: `${FE} g 铁的体积是 ${FE} g ÷ ${RHO.fe.rho} g/cm³ = ${feV} cm³，比球的体积 ${BALL_V} cm³ 小，所以是空心的，空心部分 ${BALL_V} − ${feV} = ${BALL_V - feV} cm³。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:density:q'

export default function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<(number | null)[]>(() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) && a.length === QS.length ? a : QS.map(() => null) } catch { return QS.map(() => null) } })
  const [finale, setFinale] = useState(false)
  const live = useRef(newLive())
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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="质量与密度" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Room at="s2" labels={[]}>
        <Balance at={BASE2} left={COPPER} right={reading(W.on, W.rider)} rider={W.rider} nut={0.2} live={live} leftPan={<Block kind="cu" size={[2.5, 2, 2]} />} />
        <WeightSet box={BOX2} base={BASE2} on={W.on} live={live} snap="q" />
      </Room>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。质量和密度你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
