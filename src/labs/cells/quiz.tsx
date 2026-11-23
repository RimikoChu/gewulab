// 细胞 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是模型台上的植物细胞。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LabStage } from '@/lab-kit'
import { Cell } from './models'
import { SPAN, SPOT, ST, TOP } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '2', q: '目镜上标着“10×”，物镜上标着“40×”，这台显微镜此时的放大倍数是多少？', options: ['50 倍', '30 倍', '400 倍', '4 倍'], answer: 2, why: '放大倍数是目镜和物镜两个倍数的乘积：10 × 40 = 400。' },
  { lesson: '2', q: '把低倍物镜换成高倍物镜后，视野里看到的细胞会怎样？', options: ['数目变多，个头变小', '数目变少，个头变大，视野变暗', '数目变少，视野变亮', '没有变化'], answer: 1, why: '放大倍数越大，看到的细胞越大，视野里装下的细胞越少，进入的光也越少，所以变暗。' },
  { lesson: '3', q: '显微镜视野里的物像偏在左下方。要把它移到中央，玻片应该往哪边移？', options: ['右上方', '左下方', '右下方', '左上方'], answer: 1, why: '显微镜成倒像，玻片移动的方向和物像移动的方向相反。物像偏在哪边，玻片就往哪边移。' },
  { lesson: '3', q: '在玻片上写一个字母“p”，在显微镜下看到的是什么？', options: ['p', 'b', 'q', 'd'], answer: 3, why: '倒像是上下、左右都颠倒，相当于把字旋转 180°：“p”变成“d”。' },
  { lesson: '4', q: '盖盖玻片时，要让它的一边先接触水滴，再慢慢放平。这样做是为了什么？', options: ['防止产生气泡', '防止水流出来', '让材料展得更平', '防止盖玻片破碎'], answer: 0, why: '一边先接触水滴再放平，水会把空气慢慢赶出去，不容易留下气泡。' },
  { lesson: '4', q: '做人的口腔上皮细胞装片时，载玻片上滴的是生理盐水而不是清水，原因是什么？', options: ['生理盐水能杀菌', '让细胞保持原来的形状', '给细胞染色', '让细胞分散开'], answer: 1, why: '动物细胞没有细胞壁，在清水里会吸水涨破。生理盐水的浓度和细胞里的差不多，细胞能保持原形。' },
  { lesson: '6', q: '下面哪一组结构，是植物细胞有而动物细胞没有的？', options: ['细胞膜、细胞质', '细胞核、线粒体', '细胞壁、液泡、叶绿体', '细胞质、细胞核'], answer: 2, why: '细胞膜、细胞质、细胞核、线粒体两种细胞都有。细胞壁、液泡、叶绿体是植物细胞特有的。' },
  { lesson: '5', q: '细胞里含有遗传物质、起控制作用的结构是什么？', options: ['细胞膜', '细胞质', '细胞核', '液泡'], answer: 2, why: '细胞核里有遗传物质，是细胞的控制中心。克隆羊多莉长得像提供细胞核的那只羊，就是证据。' },
  { lesson: '7', q: '一个细胞有 20 条染色体。它分裂一次后，每个新细胞里有多少条染色体？', options: ['10 条', '20 条', '40 条', '5 条'], answer: 1, why: '分裂前染色体先复制加倍，再平均分到两个新细胞里，所以每个新细胞的染色体和原来一样多。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:cells:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="细胞" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<LabStage labels={[]} target={SPOT.model} span={SPAN.model}><Cell position={[ST.model, TOP + 0.95, 0]} kind="plant" /></LabStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。细胞这一章你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
