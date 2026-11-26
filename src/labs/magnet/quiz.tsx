// 电与磁 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是风电场的全景。题目里的数从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { TURBINE, acFreq, flips, genRpm, pins } from './physics'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const F = acFreq(genRpm(TURBINE.rotor, TURBINE.ratio), TURBINE.pairs)
const QS: Q[] = [
  { lesson: '1', q: '把条形磁体分别靠近下列物体，能被吸引的是哪一个？', options: ['铜片', '铝片', '铁钉', '塑料尺'], answer: 2, why: '磁体能吸引铁、钴、镍等物质。铜、铝不能被磁体吸引，这是常见的错误认识。' },
  { lesson: '2', q: '关于磁感线，下列说法正确的是哪一项？', options: ['磁感线是磁场中真实存在的线', '磁体外部的磁感线从 S 极出来，回到 N 极', '磁感线上某点的方向，就是小磁针在那里静止时 N 极所指的方向', '两条磁感线可以相交'], answer: 2, why: '磁感线是为了描述磁场而假想的线，不真实存在；外部从 N 极出来回到 S 极；任何两条都不相交。' },
  { lesson: '3', q: '奥斯特实验说明了什么？', options: ['磁体周围存在磁场', '通电导线周围存在磁场', '磁场对电流有力的作用', '导体切割磁感线会产生电流'], answer: 1, why: '导线通电时，旁边的小磁针转动，说明电流周围存在磁场，这叫电流的磁效应。' },
  { lesson: '3', q: '通电螺线管的电流从左端流入，从正面看，螺线管正面的导线中电流向上。用安培定则判断，哪端是 N 极？', options: ['左端', '右端', '两端都是 N 极', '无法判断'], answer: 0, why: '用右手握住螺线管，四指顺着电流方向弯：正面向上、绕到背面向下，大拇指指向左端，左端是 N 极。注意用的是右手。' },
  { lesson: '4', q: '探究电磁铁磁性强弱与线圈匝数的关系时，应该怎样做？', options: ['只改变匝数，保持电流相同', '匝数和电流一起增大', '只改变电流', '抽出铁芯再比较'], answer: 0, why: `要用控制变量法：只改变匝数，电流保持不变。这间实验室里 1.0 A 时，50 匝吸起 ${pins(50, 1, true)} 枚，100 匝吸起 ${pins(100, 1, true)} 枚（示意）。` },
  { lesson: '5', q: '通电导体在磁场中受力向东。如果同时把电流方向和磁场方向都反过来，它受力向哪？', options: ['向西', '向东', '不受力', '向上'], answer: 1, why: '只改变一个，力的方向反过来；两个同时改变，反了两次，力的方向不变，还是向东。' },
  { lesson: '6', q: '蹄形磁体 N 极在上，导体在两极之间。导体怎样运动时，电路中会产生感应电流？', options: ['竖直向上运动', '竖直向下运动', '水平向左运动', '静止不动'], answer: 2, why: '这里磁感线是竖直的，导体上下运动是顺着磁感线，不切割，没有电流；水平运动才切割磁感线。' },
  { lesson: '7', q: `我国电网的交流电频率是 ${F} Hz，电流方向每秒改变几次？`, options: [`${F / 2} 次`, `${F} 次`, `${flips(F)} 次`, '不改变'], answer: 2, why: `每个周期电流方向改变两次，${F} Hz 就是每秒 ${F} 个周期，方向改变 ${flips(F)} 次。` },
  { lesson: '7', q: '关于电动机和发电机，下列说法正确的是哪一项？', options: ['电动机利用电磁感应，把电能转化为机械能', '发电机利用磁场对电流的作用，把机械能转化为电能', '电动机利用磁场对电流的作用，把电能转化为机械能', '风力发电机把电能转化为风能'], answer: 2, why: '电动机：通电线圈在磁场中受力转动，电能转化为机械能。发电机：电磁感应，机械能转化为电能。两个原理最容易搞混。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:magnet:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="电与磁" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。电与磁你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
