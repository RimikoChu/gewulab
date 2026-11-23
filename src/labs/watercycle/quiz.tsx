// 水循环 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整个流域。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import Basin from './basin'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '地球上的水，绝大部分是哪一种？', options: ['冰川', '地下水', '海洋水', '河流和湖泊水'], answer: 2, why: '海洋水约占全球水量的 96.5%。淡水只有约 2.5%。' },
  { lesson: '1', q: '陆地上的淡水里，数量最多的是哪一种？', options: ['河水', '湖泊水', '地下淡水', '冰川'], answer: 3, why: '冰川约占淡水的 68.7%，其次是地下淡水。河流、湖泊加起来只有 1% 左右。' },
  { lesson: '2', q: '风把海洋上空的水汽吹到陆地上空，这个环节叫什么？', options: ['蒸发', '水汽输送', '降水', '地表径流'], answer: 1, why: '水汽输送把海上蒸发的水带到陆地上空，是海洋和陆地之间的“空中桥梁”。' },
  { lesson: '3', q: '能让陆地上的淡水不断得到补充和更新的，是哪一种水循环？', options: ['海陆间循环', '陆地内循环', '海上内循环', '三种都一样'], answer: 0, why: '只有海陆间循环把海洋的水送到陆地上。海上内循环水量最大，但到不了陆地。' },
  { lesson: '3', q: '塔里木河流到沙漠里就消失了，不流进海洋。它参与的主要是哪种水循环？', options: ['海陆间循环', '陆地内循环', '海上内循环', '不参与水循环'], answer: 1, why: '内流河不通海洋，它的水靠蒸发回到大气，再降在陆地上，属于陆地内循环。' },
  { lesson: '4', q: '同样一场雨，下面哪种地面渗进地下的水最多？', options: ['水泥广场', '裸露的土坡', '草地', '茂密的树林'], answer: 3, why: '树冠和落叶拦住雨水，根系让土壤疏松，下渗最多，地表径流最少。' },
  { lesson: '5', q: '修建水库，主要改变了水循环的哪个环节？', options: ['水汽输送', '降水', '地表径流', '蒸发'], answer: 2, why: '水库在汛期蓄水、枯水期放水，改变的是地表径流在时间上的分配。' },
  { lesson: '6', q: '城市地面大量硬化以后，下面哪种变化最可能出现？', options: ['下渗增加，地下水位上升', '地表径流减少', '暴雨后河水涨得更快、更高', '蒸发明显增加'], answer: 2, why: '硬化地面不透水，下渗减少、地表径流增加，汇流又快，所以洪峰又高又早，容易内涝。' },
  { lesson: '7', q: '从多年平均来看，海洋的蒸发量比降水量多。多出来的这部分水去了哪里？', options: ['留在大气里越积越多', '被送到陆地上空，降下来，再经径流回到海洋', '渗进了海底', '变成了冰川'], answer: 1, why: '海洋多蒸发的水由水汽输送带到陆地，变成降水，再由径流流回海洋。水量是平衡的。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:watercycle:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="水循环" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Basin labels={[]} want={{ links: ['evap', 'move', 'runoff'] }} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。水循环你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
