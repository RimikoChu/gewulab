// 神经调节 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座展馆。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { BRAIN, IMPULSE_PATH, NERVE_PAIRS, NEURON } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '下列结构中，属于中枢神经系统的是哪一个？', options: ['脑神经', '脊神经', '脊髓', '神经纤维'], answer: 2, why: `脑和脊髓是中枢神经系统；脑神经（${NERVE_PAIRS.cranial} 对）和脊神经（${NERVE_PAIRS.spinal} 对）是周围神经系统。` },
  { lesson: '2', q: '神经冲动在一个神经元里传导的方向是：', options: ['轴突 → 细胞体 → 树突', '树突 → 细胞体 → 轴突', '细胞体 → 树突 → 轴突', '轴突 → 树突 → 细胞体'], answer: 1, why: `树突接受信号传向细胞体，再由轴突传出去，到神经末梢：${IMPULSE_PATH.map(k => NEURON[k].name).join(' → ')}。` },
  { lesson: '3', q: '某人的传出神经受了损伤，他的手碰到很烫的东西时会怎样？', options: ['能缩手，有感觉', '不能缩手，没有感觉', '不能缩手，但有感觉', '能缩手，没有感觉'], answer: 2, why: '传入神经完好，冲动能传到脊髓，再沿脊髓上传到大脑，所以觉得烫；传出神经断了，指令传不到肌肉，所以不能缩手。' },
  { lesson: '4', q: '下列反射中，属于复杂反射的是：', options: ['膝跳反射', '吃到梅子分泌唾液', '望梅止渴', '手碰到烫的东西缩回'], answer: 2, why: '望梅止渴是吃过梅子以后才形成的，要有大脑皮层参与，是复杂反射。其余三个生来就有，是简单反射。' },
  { lesson: '4', q: '下列反射中，只有人类才有的是：', options: ['谈虎色变', '望梅止渴', '膝跳反射', '眨眼反射'], answer: 0, why: '谈虎色变和语言、文字有关，要有大脑皮层的语言中枢参与，是人类特有的。望梅止渴是复杂反射，但动物也能形成类似的反射。' },
  { lesson: '5', q: '看东西时，视觉是在哪里形成的？', options: ['角膜', '晶状体', '视网膜', '大脑皮层的视觉中枢'], answer: 3, why: '物像落在视网膜上，视网膜产生的神经冲动经视神经传到大脑皮层的视觉中枢，才形成视觉。视网膜上形成的是物像，不是视觉。' },
  { lesson: '5', q: '近视眼看远处物体时，物像落在哪里？应该怎样矫正？', options: ['视网膜前方，配戴凹透镜', '视网膜前方，配戴凸透镜', '视网膜后方，配戴凹透镜', '视网膜后方，配戴凸透镜'], answer: 0, why: `近视眼的眼球前后径过长（或晶状体曲度过大），像落在视网膜前方；凹透镜让光线先发散，像落回视网膜上。` },
  { lesson: '6', q: '耳中对声波敏感、能产生神经冲动的感觉细胞在：', options: ['鼓膜', '听小骨', '耳蜗', '半规管'], answer: 2, why: `鼓膜振动、听小骨传递振动，耳蜗里的感觉细胞受刺激才产生神经冲动。听觉在大脑皮层的听觉中枢形成。半规管和身体平衡有关。` },
  { lesson: '7', q: '醉酒的人走路摇摇晃晃、站立不稳，主要是因为酒精麻醉了：', options: ['大脑', '小脑', '脑干', '脊髓'], answer: 1, why: `${BRAIN.cerebellum.name}：${BRAIN.cerebellum.job}。小脑被麻醉，动作就不协调，也难保持平衡。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:nerve:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="神经调节" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} want={{}} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。神经调节你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
