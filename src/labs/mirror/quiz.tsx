// 光的反射和平面镜 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是第 2 课的光屏。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import Board from './board'
import { LESSONS, TITLE, goLesson } from './lessons'
import { Finale } from './ui'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '用一个很小的孔给蜡烛成像，屏上的像是怎样的？', options: ['正立的实像', '倒立的实像', '正立的虚像', '倒立的虚像'], answer: 1, why: '光沿直线传播：烛焰上面发出的光穿过小孔落到屏的下面，所以像是倒立的；它是实际的光照在屏上形成的，是实像。' },
  { lesson: '1', q: '把蜡烛向小孔移近一些，屏不动，屏上的像会怎样？', options: ['变小', '变大', '大小不变', '变成正立的'], answer: 1, why: '蜡烛离小孔越近，穿过小孔的光线张得越开，屏上的像越大。像始终是倒立的。' },
  { lesson: '2', q: '一束光射到平面镜上，光线和镜面的夹角是 30°，反射角是多少度？', options: ['30°', '60°', '90°', '120°'], answer: 1, why: '入射角是光线和法线的夹角：90° − 30° = 60°。反射角等于入射角，也是 60°。' },
  { lesson: '2', q: '做反射实验时把光屏的右半边向后折，上面看不到反射光线了。这说明什么？', options: ['反射光线消失了', '反射角不再等于入射角', '反射光线、入射光线和法线在同一平面内', '光路是可逆的'], answer: 2, why: '反射光线还在原来的位置，只是光屏折到别的平面上去了，接不到它。这说明三条线在同一平面内。' },
  { lesson: '3', q: '坐在教室各个位置的同学都能看清黑板上的字，是因为光在黑板上发生了什么？', options: ['镜面反射', '漫反射', '光沿直线传播', '没有发生反射'], answer: 1, why: '黑板表面粗糙，光射上去发生漫反射，反射光线射向四面八方。漫反射的每一条光线也遵守反射定律。' },
  { lesson: '4', q: '一个人站在竖直的平面镜前，向镜子走近时，他在镜中的像怎样变化？', options: ['变大', '变小', '大小不变', '先变大后变小'], answer: 2, why: '平面镜成的像和物体大小相等，和离镜子多远无关。走近时觉得像变大，是因为像离眼睛近了，看起来大。' },
  { lesson: '5', q: '平面镜成的像为什么是虚像？', options: ['因为像比物体暗', '因为像是左右相反的', '因为它是反射光线的反向延长线相交形成的，不是实际光线会聚成的', '因为平面镜是平的'], answer: 2, why: '镜子后面并没有光到达。眼睛顺着反射光线反着看过去，觉得光是从镜后那一点发出的。虚像用光屏接不到。' },
  { lesson: '6', q: '身高 1.6 m 的人要在竖直的平面镜里看到自己的全身，镜子至少要多长？', options: ['1.6 m', '1.2 m', '0.8 m', '0.4 m'], answer: 2, why: '来自头顶和脚尖的光在镜面上的两个落点之间，长度是身高的一半：0.8 m。和人离镜子多远没有关系。' },
  { lesson: '7', q: '路口拐弯处的反光镜用的是哪种镜子？为什么？', options: ['平面镜，因为成的像和物体等大', '凹面镜，因为能把光会聚', '凸面镜，因为能看到的范围更大', '凹面镜，因为能看到的范围更大'], answer: 2, why: '凸面镜对光有发散作用，镜子里能照到的范围比同样大小的平面镜大得多。汽车的后视镜也是凸面镜。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:mirror:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title={TITLE} lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Board i={45} labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && <Finale kicker="九道题都答完了" title={`答对 ${right} / ${QS.length}`} onClose={() => setFinale(false)}>{right === QS.length ? '全对。光的反射和平面镜成像你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</Finale>}
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
