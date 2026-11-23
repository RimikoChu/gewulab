// 物态变化 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是烧水的那套器材。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X as Cross } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { BEAKER, Beaker, Clamp, GAUZE_T, Gauze, Lamp, Lid, Ring, STAND, Stand, Thermo } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Room } from './parts'
import { BATH, BOIL, BOILING, CHANGES, CLINIC, FACTORS, FREEZE, HYPO_MELT, ROOM, boilAt, boilT, byHeat, heatT, hypoReach } from './physics'
import { ST, TOP } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '用温度计测一杯热水的温度，下面哪种做法是对的？', options: ['玻璃泡碰着杯底，这样测得准', '放进去马上读数', '玻璃泡留在水里，等示数稳定后读，视线和液柱的液面相平', '把温度计从水里拿出来，凑到眼前读'], answer: 2, why: '玻璃泡要全部浸入被测液体，不碰容器底和壁；等示数稳定后再读；读数时玻璃泡留在液体里，视线和液柱的液面相平。' },
  { lesson: '1', q: `摄氏温度是怎样规定的？`, options: [`把冰水混合物的温度定为 ${FREEZE} ℃，标准大气压下沸水的温度定为 ${BOIL} ℃`, `把人的体温定为 ${FREEZE} ℃`, `把室温定为 ${ROOM} ℃`, `把冰的温度定为 ${BOIL} ℃`], answer: 0, why: `在标准大气压下，冰水混合物的温度定为 ${FREEZE} ℃，沸水的温度定为 ${BOIL} ℃，中间分成 100 等份，每一份是 1 ℃。体温计的量程是 ${CLINIC.min} ℃ 到 ${CLINIC.max} ℃。` },
  { lesson: '2', q: `给海波加热，第 ${hypoReach() + 2} 分钟时它正在熔化。这时它的温度和状态是怎样的？`, options: [`${heatT('hypo', hypoReach() + 2)} ℃，固液共存，在吸热`, `${heatT('hypo', hypoReach() + 2)} ℃，固液共存，不吸热`, `高于 ${HYPO_MELT} ℃，全是液态`, `低于 ${HYPO_MELT} ℃，全是固态`], answer: 0, why: `海波是晶体，熔化时温度保持在熔点 ${HYPO_MELT} ℃ 不变，但一直在吸热；这段时间里固态和液态同时存在。` },
  { lesson: '2', q: '石蜡的温度–时间图线上没有水平的一段，这说明什么？', options: ['石蜡熔化时不吸热', '石蜡是非晶体，没有固定的熔化温度', '石蜡不会熔化', '实验做错了'], answer: 1, why: `非晶体熔化时边吸热边变软，温度一直上升，从 ${BATH.start} ℃ 升到 ${heatT('wax', BATH.total)} ℃ 都没有停。晶体才有熔点。` },
  { lesson: '3', q: '把湿衣服晾在向阳、通风的地方，并且摊开，干得快。其中“摊开”是利用了哪一条？', options: [FACTORS.temp.say, FACTORS.area.say, FACTORS.wind.say, '蒸发吸热'], answer: 1, why: `向阳是提高液体的温度，通风是加快液面上方的空气流动，摊开是增大液体的表面积。${FACTORS.area.say}。` },
  { lesson: '4', q: `水从 ${BOILING.start} ℃ 开始加热，每分钟升 ${BOILING.rate} ℃，第 ${boilAt()} 分钟沸腾。第 ${boilAt() + 3} 分钟还在加热，这时水温是多少？`, options: [`${BOILING.start + BOILING.rate * (boilAt() + 3)} ℃`, `${boilT(boilAt() + 3)} ℃`, `${BOIL - 2} ℃`, '无法确定'], answer: 1, why: `水沸腾时虽然继续吸热，温度却保持在沸点不变。标准大气压下水的沸点是 ${BOIL} ℃，所以还是 ${boilT(boilAt() + 3)} ℃。` },
  { lesson: '5', q: '烧开水时壶嘴上方的“白气”是什么？', options: ['水蒸气', '水蒸气遇冷液化成的小水滴', '空气', '烟'], answer: 1, why: '水蒸气是看不见的。“白气”是水蒸气离开壶嘴后遇冷，液化成的大量小水滴。紧挨壶嘴的那一小段看不见，那里才是水蒸气。' },
  { lesson: '6', q: '冬天，一直冻着的湿衣服挂在室外，气温始终低于 0 ℃，衣服也慢慢变干了。这是什么现象？', options: ['熔化', '汽化', '升华', '凝华'], answer: 2, why: `衣服上的冰没有先化成水，而是直接变成了水蒸气：从${CHANGES.sublime.from}直接变成${CHANGES.sublime.to}，是升华，要${CHANGES.sublime.heat}。` },
  { lesson: '7', q: '下面哪一组物态变化都要放热？', options: [byHeat('吸热').map(k => CHANGES[k].name).join('、'), byHeat('放热').map(k => CHANGES[k].name).join('、'), '熔化、液化、凝华', '凝固、汽化、凝华'], answer: 1, why: `${byHeat('放热').map(k => CHANGES[k].name).join('、')}放热；${byHeat('吸热').map(k => CHANGES[k].name).join('、')}吸热。露和雾是液化，霜和雪是凝华，都是放热的。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:phase:q'
const X = ST.s4, Z = 0.3, CX = X + 0.12, RING = 0.86, CUP = TOP + RING + GAUZE_T, BULB = CUP + BEAKER.floor + 0.16

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="物态变化" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Room at="s4" labels={[]}>
        <Stand at={[X, TOP, Z]}><Ring y={RING} /><Clamp y={BULB - TOP + 1.5} grip={0.04} /></Stand>
        <Lamp at={[CX, TOP + STAND.baseH, Z]} lit={0} />
        <Gauze at={[CX, TOP + RING, Z]} />
        <Beaker at={[CX, CUP, Z]} level={0.44} />
        <Lid at={[CX, CUP + BEAKER.h, Z]} />
        <Thermo at={[CX, BULB, Z]} T={ROOM} />
      </Room>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。六种物态变化你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
                  <span className={cn('grid size-6 flex-none place-items-center rounded-full text-[13px] font-semibold', isRight ? 'bg-[#35c7b3] text-[#06231f]' : isWrong ? 'bg-[#ff6b6b] text-white' : 'bg-white/12')}>{isRight ? <Check className="size-3.5" strokeWidth={3.5} /> : isWrong ? <Cross className="size-3.5" strokeWidth={3.5} /> : 'ABCD'[k]}</span>{o}
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
