// 地球的运动 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是轨道全景。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { LabStage } from '@/lab-kit'
import { S_ORBIT, SPACE, T_ORBIT, V_ORBIT } from './space'
import type { Want } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '从北极上空看，地球自转的方向是怎样的？', options: ['顺时针', '逆时针', '自东向西', '有时顺时针有时逆时针'], answer: 1, why: '地球自西向东自转。从北极上空看是逆时针，从南极上空看是顺时针。' },
  { lesson: '2', q: '甲地在乙地东边，两地经度相差 30°。同一时刻，甲地的时间比乙地怎样？', options: ['早 2 小时', '晚 2 小时', '早 30 分钟', '一样'], answer: 0, why: '经度每差 15°，时间差 1 小时，30° 就是 2 小时。地球自西向东转，东边的地方时间早。' },
  { lesson: '3', q: '地球绕太阳公转的过程中，地轴的指向怎样变化？', options: ['始终指向太阳', '春夏指向太阳，秋冬背向太阳', '始终不变，北极总是指向北极星附近', '每个月变一次'], answer: 2, why: '地轴的空间指向不变。北极有时偏向太阳、有时背向太阳，是因为地球转到了太阳的不同侧。' },
  { lesson: '4', q: '夏至这一天，太阳直射在哪条纬线上？', options: ['赤道', '北回归线', '南回归线', '北极圈'], answer: 1, why: '夏至太阳直射北回归线（北纬 23.5°），这是直射点能到的最北的位置。' },
  { lesson: '5', q: '北半球夏至这一天，下面哪个地方会出现极昼？', options: ['赤道', '北回归线', '北京', '北极圈以内'], answer: 3, why: '夏至这天，北极圈以内的整条纬线都在被照亮的半边，太阳整天不落。' },
  { lesson: '6', q: '在北京，一年里哪一天正午旗杆的影子最长？', options: ['春分', '夏至', '秋分', '冬至'], answer: 3, why: '冬至太阳直射南回归线，离北京最远，北京的正午太阳高度最小，影子最长。' },
  { lesson: '7', q: '五带之中，有太阳直射现象的是哪一带？', options: ['热带', '北温带', '南温带', '北寒带'], answer: 0, why: '太阳直射点只在南北回归线之间移动，这个范围就是热带。' },
  { lesson: '6', q: '北半球夏天比冬天热，主要原因是什么？', options: ['夏天地球离太阳近', '夏天正午太阳高度大，而且白天长', '夏天太阳本身更热', '夏天地球转得慢'], answer: 1, why: '夏天太阳高，地面得到的阳光集中，白天又长，积累的热量多。和地球离太阳的远近关系不大。' },
  { lesson: '5', q: '春分这一天，全球各地的昼夜长短是怎样的？', options: ['北半球昼长夜短', '南半球昼长夜短', '全球昼夜等长', '只有赤道昼夜等长'], answer: 2, why: '春分和秋分太阳直射赤道，晨昏线正好经过南北两极，把每条纬线都平分，全球昼夜等长。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:orbit:q'

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
    <LabShell narration={voiced(NARRATION['q'], VOICE)} autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="地球的运动" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<LabStage<Want> labels={[]} target={T_ORBIT} span={S_ORBIT} view={V_ORBIT} {...SPACE} world={{ day: 60, ray: true }}>{null}</LabStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。地球的运动你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
