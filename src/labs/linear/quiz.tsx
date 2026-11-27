// 一次函数 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是从高处看下去的整段公路和服务区。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import At from './at'
import { Sedan, Truck } from './car'
import { Milestone } from './equip'
import { LANE } from './world'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '汽车以 100 km/h 匀速行驶，路程 s = 100t。这里哪个是常量？', options: ['s', 't', '100', 's 和 t'], answer: 2, why: '匀速行驶时速度 100 不变，是常量；路程 s 和时间 t 都在变，是变量。' },
  { lesson: '2', q: '下面哪个关系里，y 不是 x 的函数？', options: ['y = 7.5x', 'y = 50 − 0.08x', 'y² = x（x > 0）', 'y = 2x + 4'], answer: 2, why: '函数要求 x 每取一个值，y 只有唯一的值。y² = x 时，x = 4 对应 y = 2 和 y = −2 两个值，所以 y 不是 x 的函数。' },
  { lesson: '3', q: '一辆车出发时有油 50 L，每开 100 km 用 8 L。剩油 y 和里程 x 的关系是：', options: ['y = 0.08x', 'y = 50 + 0.08x', 'y = 50 − 0.08x', 'y = 50 − 8x'], answer: 2, why: '每千米用 0.08 L，开 x 千米用 0.08x L，从 50 L 里减掉：y = 50 − 0.08x。别漏了出发时的 50。' },
  { lesson: '4', q: '正比例函数 y = −3x 的图像经过哪些象限？', options: ['第一、三象限', '第二、四象限', '第一、二象限', '第一、二、四象限'], answer: 1, why: 'k = −3 < 0，图像是过原点、从左往右下降的直线，经过第二、四象限。' },
  { lesson: '5', q: '一次函数 y = 2x − 3 的图像和 y 轴的交点是：', options: ['(0, −3)', '(−3, 0)', '(1.5, 0)', '(0, 2)'], answer: 0, why: '和 y 轴相交时 x = 0，代入得 y = −3，交点是 (0, −3)。(1.5, 0) 是和 x 轴的交点。' },
  { lesson: '5', q: '对于 y = −2x + 1，下面哪句话对？', options: ['b > 0，所以 y 随 x 增大而增大', 'y 随 x 增大而减小', '图像过原点', '图像和 y = 2x + 1 平行'], answer: 1, why: '增减只看 k：k = −2 < 0，y 随 x 增大而减小。b = 1 只决定和 y 轴交于 (0, 1)。k 不同的两条直线不平行。' },
  { lesson: '6', q: '一次函数的图像经过 (1, 3) 和 (2, 5)，它的解析式是：', options: ['y = 2x + 1', 'y = 3x', 'y = x + 2', 'y = 2x + 3'], answer: 0, why: '代入得 3 = k + b，5 = 2k + b，两式相减 k = 2，再得 b = 1，所以 y = 2x + 1。' },
  { lesson: '7', q: '甲运费 y = 5x + 200，乙运费 y = 7x（x 是运距 km）。运 150 km 选哪家便宜？', options: ['甲', '乙', '一样', '无法判断'], answer: 0, why: '甲 5 × 150 + 200 = 950 元，乙 7 × 150 = 1050 元，甲便宜。两条线交于 x = 100，超过 100 km 甲的线在下面。' },
  { lesson: '7', q: '直线 y = 5x + 200 和 y = 7x 交点的横坐标，是哪个方程的解？', options: ['5x + 200 = 0', '7x = 0', '5x + 200 = 7x', '5x = 7x'], answer: 2, why: '交点处两个函数值相等，所以横坐标满足 5x + 200 = 7x，解得 x = 100。' },
]
/** 路上的车：[x, z, 颜色, 是不是货车]。z 为负的在对向车道 */
const TRAFFIC: [number, number, string, boolean][] = [
  [8, -LANE.fast, '#e6e8e9', false], [-22, -LANE.slow, '#2f6fb5', true], [34, -LANE.slow, '#3b3f44', false], [66, -LANE.fast, '#8e1b22', false], [98, -LANE.slow, '#c2452f', true],
  [-8, LANE.slow, '#b9bdc0', false], [24, LANE.fast, '#1f4f8a', false], [52, LANE.slow, '#2b5c9e', true], [85, LANE.fast, '#d8d2c4', false], [118, LANE.slow, '#2f8f6a', false],
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:linear:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="一次函数" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<At at="over" labels={[]}>
        {/* 近处对向车道边的里程碑，路上的车流 */}
        {[0, 25, 50, 75].map((x, i) => <Milestone key={x} km={120 + i} position={[x - 10, 0, -11.2]} rotation-y={Math.PI} />)}
        {TRAFFIC.map(([x, z, c, truck], i) => truck ? <Truck key={i} position={[x, 0, z]} rotation-y={z < 0 ? Math.PI : 0} cab={c} /> : <Sedan key={i} position={[x, 0, z]} rotation-y={z < 0 ? Math.PI : 0} color={c} />)}
      </At>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。一次函数你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
