// 等高线地形图 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整块山地。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import Spot from './stage'
import { TOP_A, VILLAGE, altitude, levels, relHeight } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '海拔是从哪里算起的？', options: ['山脚', '海平面', '当地地面', '测量的人站的地方'], answer: 1, why: '海拔是地面某个地点高出海平面的垂直距离。从别的地点算起的是相对高度。' },
  { lesson: '1', q: `A 峰海拔 ${altitude(TOP_A)} m，山脚村庄海拔 ${altitude(VILLAGE)} m。山顶比村庄高多少？`, options: [`${altitude(TOP_A) + altitude(VILLAGE)} m`, `${relHeight(TOP_A, VILLAGE)} m`, `${altitude(TOP_A)} m`, `${altitude(VILLAGE)} m`], answer: 1, why: `相对高度是两地海拔之差：${altitude(TOP_A)} − ${altitude(VILLAGE)} = ${relHeight(TOP_A, VILLAGE)} m。不是相加。` },
  { lesson: '2', q: '关于等高线，下面说法正确的是哪一个？', options: ['同一条等高线上各点的海拔相同', '同一幅图上的等高距可以不一样', '等高线一般会互相交叉', '等高线画的是地面上真有的线'], answer: 0, why: '等高线是海拔相同的点连成的线，是画在图上的线。同一幅图等高距相同；等高线一般不相交，只有陡崖处会重合。' },
  { lesson: '3', q: '在同一幅等高线地形图上，等高线越密集的地方……', options: ['海拔越高', '海拔越低', '坡越陡', '坡越缓'], answer: 2, why: '升高同样的高度，水平距离越短，坡越陡。疏密说的是坡的陡缓，不是海拔高低。' },
  { lesson: '4', q: '一组闭合的等高线，中间数值小、四周数值大，这里是什么地形？', options: ['山峰', '盆地', '山脊', '鞍部'], answer: 1, why: '中间低、四周高是盆地；中间高、四周低才是山峰。没有数值时看示坡线，示坡线指向低处。' },
  { lesson: '5', q: '等高线从低处向高处凸出的地方是什么？', options: ['山脊', '山谷', '陡崖', '鞍部'], answer: 1, why: '山谷的等高线凸向高处；山脊的等高线凸向低处。记法：“凸高为谷，凸低为脊”。' },
  { lesson: '5', q: '下了一场雨，雨水最可能沿着哪里汇成小河？', options: ['山脊', '山谷', '山顶', '鞍部最高处'], answer: 1, why: '雨水从两侧山坡流到谷底汇集，山谷里容易形成河流。山脊两侧的水流向两边，山脊常是分水岭。' },
  { lesson: '6', q: '某处有 3 条等高线重合在一起，等高距是 100 m。这处陡崖的相对高度可能是多少？', options: ['150 m', '250 m', '400 m', '450 m'], answer: 1, why: '(n − 1)d ≤ H < (n + 1)d，即 200 m ≤ H < 400 m。400 m 取不到。' },
  { lesson: '7', q: '分层设色地形图上，一片地方海拔在 500 m 以上，地面坦荡，边缘比较陡峭。它最可能是：', options: ['平原', '丘陵', '高原', '盆地'], answer: 2, why: '海拔较高、地面坦荡、边缘陡峭是高原。山地海拔也高，但峰峦起伏、坡度陡峭。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:contour:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="等高线地形图" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Spot at="all" labels={[]} want={{ lines: levels(100, 1600) }} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。等高线地形图你已经会读了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
