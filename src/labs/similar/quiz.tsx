// 相似和测量 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整所学校和东边的古塔。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Place, spot } from './parts'
import { f1, f2, mirror5, pole4, trig6 } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const T30 = trig6('s30'), T45 = trig6('s45'), P4 = pole4('low'), M5 = mirror5(18)
const QS: Q[] = [
  { lesson: '1', q: '两个长方形，四个角都是 90°。它们一定相似吗？', options: ['一定相似', '不一定，还要看对应边是否成比例', '一定不相似', '面积相等才相似'], answer: 1, why: '相似多边形要对应角相等、对应边也成比例。长 2 宽 1 和长 3 宽 3 的两个长方形，角都相等，边不成比例，不相似。' },
  { lesson: '2', q: '△ABC 中 ∠A = 50°、∠B = 60°；△DEF 中 ∠D = 50°、∠F = 70°。这两个三角形', options: ['相似，因为两角分别相等', '不相似，因为没有一组 60° 的角', '不一定，要量边', '全等'], answer: 0, why: '△DEF 的第三个角 ∠E = 180° − 50° − 70° = 60°，所以两个三角形的角分别相等，相似。只说相似，不一定一样大。' },
  { lesson: '3', q: '两个相似三角形的相似比是 2 ∶ 3，它们的面积比是', options: ['2 ∶ 3', '4 ∶ 9', '4 ∶ 6', '8 ∶ 27'], answer: 1, why: '面积比等于相似比的平方：(2 ∶ 3)² = 4 ∶ 9。2 ∶ 3 是周长比。' },
  { lesson: '3', q: '一个三角形的三条边都放大到原来的 3 倍，周长变成原来的', options: ['3 倍', '6 倍', '9 倍', '27 倍'], answer: 0, why: '每条边都是 3 倍，加起来也是 3 倍：周长比等于相似比。面积才是 9 倍。' },
  { lesson: '4', q: `同一时刻，身高 1.60 m 的同学影长 ${f2(P4.s1)} m，旗杆影长 ${f2(P4.s2)} m。旗杆高`, options: [`${f1(P4.h)} m`, '18.75 m', '9.6 m', '量的时间不同也能算'], answer: 0, why: `旗杆高 ∶ ${f2(P4.s2)} = 1.60 ∶ ${f2(P4.s1)}，旗杆高 = 1.60 × ${f2(P4.s2)} ÷ ${f2(P4.s1)} = ${f1(P4.h)} m。两条影子必须同一时刻量。` },
  { lesson: '5', q: `镜子平放在离楼 18 m 处，人眼高 1.50 m，退到离镜子 ${f2(M5.d1)} m 时正好看见楼顶。两个三角形相似的理由是`, options: ['反射角等于入射角，再加上两个直角', '镜子是圆的', '人和楼一样高', '光线是曲的'], answer: 0, why: `反射角等于入射角，两条光线和地面的夹角相等；人和楼都垂直于地面。两角相等，相似：楼高 = 1.50 × 18 ÷ ${f2(M5.d1)} = ${f1(M5.h)} m。` },
  { lesson: '6', q: '在直角三角形中，30° 角的正弦 sin30° 等于', options: [`${f2(T30.sin)}`, `${f2(T30.cos)}`, `${f2(T30.tan)}`, '1.73'], answer: 0, why: `sin30° = 对边 ÷ 斜边 = ${f2(T30.sin)}。${f2(T30.cos)} 是 cos30°（邻边 ÷ 斜边），${f2(T30.tan)} 是 tan30°。tan45° = ${f2(T45.tan)}。` },
  { lesson: '6', q: '一段斜坡的坡度是 i = 1 ∶ 2，意思是', options: ['竖直高 ∶ 水平长 = 1 ∶ 2', '竖直高 ∶ 沿坡长 = 1 ∶ 2', '坡角是 30°', '坡角是 50°'], answer: 0, why: '坡度是竖直高度和水平长度的比，也就是坡角的正切：tanα = 0.5。不是和沿坡长的比；30° 坡的坡度是 1 ∶ 1.73。' },
  { lesson: '7', q: '在离塔中心 30 m 处，用测角仪测得塔顶仰角 45°，眼睛离地 1.50 m。塔高', options: ['30 m', '31.5 m', '28.5 m', '42.4 m'], answer: 1, why: '塔顶比眼睛高 30 × tan45° = 30 m，还要加上眼高：30 + 1.50 = 31.5 m。只算 30 m 是漏了眼高。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:similar:q'
const VIEW = spot(20, 6, -6, 150, 58, -0.42, 0.32)

export default function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<(number | null)[]>(() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) && a.length === QS.length ? a : QS.map(() => null) } catch { return QS.map(() => null) } })
  const [finale, setFinale] = useState(() => picked.every(x => x !== null))
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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="相似和测量" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place view={VIEW} labels={[]} elev={45} shadow={90} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <>
        <p className="text-[17px] leading-snug font-bold">九道题答对 {right} 道</p>
        <p className="mt-1 text-[14px] text-white/70">{right === QS.length ? '全对。相似和测量你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
      </>}
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
