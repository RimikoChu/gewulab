// 光的波动性和光电效应 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是激光双缝台。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import Bench from './bench'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { L1 } from './physics'
import { VOICE } from './voice'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '双缝干涉实验中，屏上出现亮条纹的位置，到两条缝的路程差是多少？', options: ['半波长的奇数倍', '波长的整数倍', '任意值都行', '一定等于零'], answer: 1, why: '路程差是波长的整数倍，两束光互相加强，出现亮条纹；是半波长的奇数倍，互相削弱，出现暗条纹。' },
  { lesson: '2', q: '双缝干涉实验里，只把红色激光换成蓝色激光，屏上的条纹会怎样？', options: ['条纹间距变大', '条纹间距变小', '条纹间距不变', '条纹消失'], answer: 1, why: '由 Δx = Lλ/d，蓝光的波长比红光短，条纹间距变小。' },
  { lesson: '2', q: '想让屏上的干涉条纹变宽，下面哪种做法可行？', options: ['换用缝距更大的双缝', '把光屏移近双缝', '换用缝距更小的双缝', '把激光器的功率调大'], answer: 2, why: '由 Δx = Lλ/d，缝距 d 越小，间距越大。把屏移近、把缝距加大都会让条纹变窄；光的强弱不影响间距。' },
  { lesson: '3', q: '用双缝干涉测波长时，测出第 1 条到第 6 条亮纹中心的距离是 a，条纹间距 Δx 等于多少？', options: ['a / 6', 'a / 5', 'a / 7', 'a'], answer: 1, why: '第 1 条到第 6 条之间隔着 5 个间距，所以 Δx = a/5。把它除以 6 是最常见的错误。' },
  { lesson: '4', q: '竖直放置的肥皂膜在单色光照射下出现水平的明暗条纹，是因为什么？', options: ['膜的前后两个表面反射的光发生了干涉', '光通过肥皂膜发生了色散', '光在膜的边缘发生了衍射', '肥皂膜是一块偏振片'], answer: 0, why: '这是薄膜干涉：膜前后两个表面的反射光叠加。膜上薄下厚，同一高度厚度相同，所以条纹是水平的。' },
  { lesson: '5', q: '单色光通过一条狭缝，把缝调得更窄，屏上的中央亮纹会怎样？', options: ['变窄变亮', '变宽', '宽度不变', '变成等间距的条纹'], answer: 1, why: '缝越窄，衍射越明显，中央亮纹越宽（同时变暗）。单缝衍射的条纹中央最宽，不是等间距的。' },
  { lesson: '5', q: '光的偏振现象说明了什么？', options: ['光是纵波', '光是横波', '光沿直线传播', '光具有粒子性'], answer: 1, why: '只有横波才有偏振现象。两片偏振片透振方向垂直时光过不去，说明光的振动方向垂直于传播方向。' },
  { lesson: '6', q: '用某种频率的光照射金属，没有光电子逸出。要让它发生光电效应，应该怎么做？', options: ['把光调得更强', '照射更长的时间', '换用频率更高的光', '换用波长更长的光'], answer: 2, why: '能不能发生光电效应只看频率是否高于截止频率，和光的强弱、照射时间无关。波长更长就是频率更低。' },
  { lesson: '7', q: '频率一定的光照射光电管，把光强加倍，遏止电压和饱和光电流各怎样变？', options: ['都加倍', '遏止电压加倍，饱和光电流不变', '遏止电压不变，饱和光电流加倍', '都不变'], answer: 2, why: '由 Ek = hν − W₀，最大初动能只由频率决定，所以遏止电压不变；光强加倍，每秒打出的光电子加倍，饱和光电流加倍。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:light:q'

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
    <LabShell narration={voiced(NARRATION['q'], VOICE)} autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title={TITLE} lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Bench light="green" d={L1.d} L={L1.L} labels={[]} view={[-0.55, 0.2]} span={[4.5, 2.2]} dx={0.1} dy={0.1} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。光的波动性和光电效应你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
