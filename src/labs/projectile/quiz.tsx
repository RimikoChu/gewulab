// 抛体运动 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是山坡脚下的水炮和消防车。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import At from './at'
import { Blaze, Jet, Smoke } from './fx'
import { HILL, landOn } from './physics'
import { MUZZLE } from './terrain'
import { BigMonitor } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '关于做曲线运动的物体，下面说法正确的是：', options: ['速度的大小一定在变', '速度的方向一定在变', '受的合力一定在变', '加速度可以为零'], answer: 1, why: '曲线运动的速度沿轨迹的切线，方向时刻在变，所以一定是变速运动、加速度不为零。速度的大小可以不变（匀速转弯的车），合力也可以不变（平抛只受重力）。' },
  { lesson: '1', q: '物体做曲线运动的条件是：', options: ['受的合力不为零', '受的合力是变力', '合力的方向和速度的方向不在同一条直线上', '合力的方向和速度的方向垂直'], answer: 2, why: '合力和速度在同一条直线上，物体做直线运动（加速或减速）；不在同一条直线上，才做曲线运动。不要求垂直，也不要求是变力。' },
  { lesson: '2', q: '河宽 60 m，船在静水中的速度是 5 m/s，水流速度是 3 m/s。过河最短要多少时间？', options: ['7.5 s', '12 s', '15 s', '20 s'], answer: 1, why: '船头正对对岸时，垂直河岸的分速度最大，是 5 m/s：t = 60 ÷ 5 = 12 s。水流只把船往下游带，不影响过河时间。' },
  { lesson: '2', q: '同一条河（宽 60 m，船速 5 m/s，水速 3 m/s），要让航程最短，过河要多少时间？', options: ['12 s', '15 s', '20 s', '30 s'], answer: 1, why: '航程最短时合速度垂直河岸：v = √(5² − 3²) = 4 m/s，t = 60 ÷ 4 = 15 s。用 60 ÷ 5 = 12 s 是把船速当成了合速度。' },
  { lesson: '3', q: '在同一高度，A 球被水平抛出，同一时刻 B 球自由下落。不计空气阻力：', options: ['A 球先落地', 'B 球先落地', '两球同时落地', '要看 A 球抛出的速度'], answer: 2, why: '平抛在竖直方向就是自由落体，和水平速度无关。两球任何时刻都一样高，同时落地。' },
  { lesson: '4', q: '做平抛实验时，每次都让小球从斜槽上同一位置由静止滚下，是为了：', options: ['让小球飞得更远', '保证每次平抛的初速度相同', '减小小球受的空气阻力', '让斜槽末端保持水平'], answer: 1, why: '几次释放描的是同一条轨迹，所以每次离开槽口的速度要一样。斜槽不必光滑，但释放的位置必须相同。' },
  { lesson: '5', q: '从 20 m 高处以 15 m/s 的速度水平抛出一个小球（g 取 10 m/s²），落地时速度的大小是：', options: ['15 m/s', '20 m/s', '25 m/s', '35 m/s'], answer: 2, why: '下落时间 t = √(2 × 20 ÷ 10) = 2 s，落地时 v_y = gt = 20 m/s，v = √(15² + 20²) = 25 m/s。速度要按平行四边形定则合成，不能直接相加。' },
  { lesson: '6', q: '用同样大小的初速度斜向上抛出两个小球，仰角分别是 30° 和 60°，落回抛出点的高度时：', options: ['30° 的射程大', '60° 的射程大', '射程相同，60° 的射高大', '射程和射高都相同'], answer: 2, why: '射程 R = v₀² sin 2θ ÷ g：sin 60° = sin 120°，两个射程相同。射高 H = v₀² sin² θ ÷ 2g，仰角大的射高大。' },
  { lesson: '7', q: '想让水平抛出的物体落得更远，下面哪个办法不管用？', options: ['加大抛出的速度', '把抛出点升高', '换一个质量更大的物体', '速度和高度都加大'], answer: 2, why: '水平距离 x = v₀ √(2h ÷ g)，只和初速度、高度有关。不计空气阻力时，抛体的运动和质量无关。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:projectile:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="抛体运动" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<At at="over" labels={[]}><group position={MUZZLE}><BigMonitor angle={45} /><Jet v0={21} angle={45} T={landOn(21, 45).t} on thick={3.4} n={560} seed={5} /><Blaze at={[HILL.fire.x + 2.5, HILL.fire.y + 0.9, -1]} w={4.2} h={7} spread={2.8} n={8} /><Smoke at={[HILL.fire.x + 2.5, HILL.fire.y + 4, -1]} size={2.2} rise={16} n={40} /></group></At>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。抛体运动你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
