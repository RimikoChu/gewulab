// 空气和氧气 · 随堂检测：九道选择题，每课一道易错题，另加两道综合题。答完立刻看对错和讲解。背景是整座空分厂的全景。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '空气的成分里含量最多的是哪一种气体？“约占 78%”指的是什么？', options: ['氧气，质量分数', '氮气，质量分数', '氮气，体积分数', '二氧化碳，体积分数'], answer: 2, why: '空气的成分按体积计算：氮气约占 78%，氧气约占 21%。这里说的是体积分数，不是质量分数。' },
  { lesson: '2', q: '收集氧气可以用向上排空气法，也可以用排水法。依据分别是什么？', options: ['氧气的密度比空气略大；氧气不易溶于水', '氧气的密度比空气小；氧气易溶于水', '氧气无色无味；氧气能支持燃烧', '氧气的密度比空气略大；氧气易溶于水'], answer: 0, why: '同样 250 mL，氧气 0.357 g，空气 0.323 g，氧气的密度比空气略大，所以瓶口向上；氧气不易溶于水，所以可以用排水法。' },
  { lesson: '3', q: '硫在氧气里燃烧，火焰是什么颜色？', options: ['微弱的淡蓝色', '明亮的蓝紫色', '黄色', '发出白光，没有火焰'], answer: 1, why: '硫在空气里燃烧发出微弱的淡蓝色火焰，在氧气里燃烧发出明亮的蓝紫色火焰，都生成有刺激性气味的气体。' },
  { lesson: '4', q: '下面哪个反应是化合反应？', options: ['石蜡 + 氧气 → 二氧化碳 + 水', '过氧化氢 → 水 + 氧气', '铁 + 氧气 → 四氧化三铁', '高锰酸钾 → 锰酸钾 + 二氧化锰 + 氧气'], answer: 2, why: '化合反应是“多变一”。铁和氧气两种物质生成四氧化三铁一种物质。石蜡燃烧生成两种物质；另外两个是“一变多”的分解反应。' },
  { lesson: '5', q: '加热高锰酸钾制氧气，用排水法收集完毕后，正确的操作顺序是什么？', options: ['先熄灭酒精灯，再把导管移出水面', '先把导管移出水面，再熄灭酒精灯', '两步同时做', '先拆下试管，再熄灭酒精灯'], answer: 1, why: '先撤导管、再熄灯。如果先熄灭酒精灯，试管里气体变冷、压强减小，水槽里的水会倒流进热的试管，使试管炸裂。' },
  { lesson: '6', q: '关于催化剂，下面哪句话是错的？', options: ['催化剂能改变化学反应的速率', '反应前后，催化剂的质量不变', '反应前后，催化剂的化学性质不变', '催化剂一定能加快化学反应的速率'], answer: 3, why: '催化剂是“改变”反应速率，可以加快，也可以减慢。它本身的质量和化学性质在反应前后都不变。' },
  { lesson: '7', q: '工业上用分离液态空气的方法制氧气，这个过程属于什么变化？', options: ['化学变化，因为得到了氧气', '物理变化，因为没有生成新物质', '分解反应', '化合反应'], answer: 1, why: '氧气本来就在空气里。分离液态空气只是利用液氮和液氧的沸点不同把它们分开，没有生成新物质，是物理变化。' },
  { lesson: '1', q: '钟罩里原有 10.0 L 空气，红磷燃烧并冷却后，水面上升了 105 mm（钟罩截面积 200 cm²）。这说明氧气约占空气体积的多少？', options: ['约 78%', '约 50%', '约 21%', '约 10.5%'], answer: 2, why: '进入的水的体积是 200 cm² × 10.5 cm = 2100 cm³ = 2.1 L，占 10.0 L 的 21%，约五分之一。' },
  { lesson: '2', q: '三瓶无色气体分别是空气、氧气和二氧化碳。怎样把它们区分开？', options: ['看颜色', '闻气味', '把燃着的木条分别伸进三瓶', '分别称一称集气瓶的质量'], answer: 2, why: '燃着的木条在空气里照常燃烧，在氧气里烧得更旺，在二氧化碳里熄灭。三种气体都是无色无味的，看和闻分不出来。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:air:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="空气和氧气" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。空气和氧气这一单元你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
