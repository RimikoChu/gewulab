// 碳和二氧化碳 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座汽水厂和温室的全景。
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
  { lesson: '1', q: '金刚石和石墨的物理性质差异很大，原因是什么？', options: ['组成它们的元素不同', '碳原子的排列方式不同', '一个是单质，一个是化合物', '碳原子的大小不同'], answer: 1, why: '金刚石和石墨都是由碳元素组成的单质，碳原子的排列方式不同，所以硬度、导电性等物理性质差异很大。' },
  { lesson: '2', q: '实验室制取二氧化碳，最合适的药品是哪一组？', options: ['大理石和稀硫酸', '碳酸钠粉末和稀盐酸', '大理石和稀盐酸', '木炭和氧气'], answer: 2, why: '大理石和稀盐酸反应速率适中，便于收集。稀硫酸生成的硫酸钙微溶，盖住大理石，反应很快停止；碳酸钠粉末反应太快；木炭燃烧得到的气体不纯，也不便收集。' },
  { lesson: '2', q: '检验集气瓶里的二氧化碳是否集满，正确的做法是什么？', options: ['把燃着的木条伸入瓶中', '把燃着的木条放在瓶口', '往瓶里倒澄清石灰水', '把带火星的木条放在瓶口'], answer: 1, why: '验满要把燃着的木条放在集气瓶口，木条熄灭说明已集满。伸入瓶中只能说明瓶里有二氧化碳；倒石灰水是检验气体是不是二氧化碳。' },
  { lesson: '3', q: '向放着阶梯蜡烛的烧杯中倾倒二氧化碳，下层蜡烛先熄灭。这说明二氧化碳具有什么性质？', options: ['密度比空气小，能燃烧', '密度比空气大，不能燃烧也不支持燃烧', '能溶于水', '有毒'], answer: 1, why: '二氧化碳先积在杯底，下层蜡烛先灭，说明它密度比空气大；蜡烛熄灭说明它不能燃烧，也不支持燃烧。这两条性质让它能用来灭火。' },
  { lesson: '4', q: '把二氧化碳通入紫色石蕊溶液，溶液变红。使石蕊变红的是什么？', options: ['二氧化碳', '水', '碳酸', '氧气'], answer: 2, why: '二氧化碳和水反应生成碳酸，是碳酸使紫色石蕊变红。干燥的石蕊小花放进二氧化碳里不变色。碳酸不稳定，加热分解，溶液又变紫。' },
  { lesson: '5', q: '打开汽水瓶盖，汽水里冒出大量气泡，主要原因是什么？', options: ['温度升高，二氧化碳的溶解度变大', '压强减小，二氧化碳的溶解度变小', '汽水里的水变成了气体', '打开瓶盖后发生了新的化学反应'], answer: 1, why: '汽水是加压溶入二氧化碳制成的。打开瓶盖，压强减小，二氧化碳的溶解度变小，从水里逸出。' },
  { lesson: '6', q: '用一氧化碳还原氧化铜，下列操作顺序正确的是哪一项？', options: ['先加热，再通一氧化碳', '先通一氧化碳，再加热；结束时先停止通气', '先通一氧化碳，再加热；结束时先停止加热，冷却后停止通气', '尾气可以直接排到空气里'], answer: 2, why: '先通一氧化碳排尽空气，防止加热时爆炸；结束先停止加热，继续通气到冷却，防止铜被重新氧化。一氧化碳有毒，尾气要点燃或收集。' },
  { lesson: '7', q: '自然界中，下列哪个过程消耗二氧化碳？', options: ['动植物的呼吸作用', '化石燃料的燃烧', '绿色植物的光合作用', '微生物分解动植物遗体'], answer: 2, why: '绿色植物的光合作用吸收二氧化碳，放出氧气。呼吸作用、燃料燃烧、微生物分解都会放出二氧化碳。' },
  { lesson: '7', q: '下列做法中，不符合“低碳”理念的是哪一项？', options: ['出门多坐公交车或骑自行车', '用完电器及时关掉电源', '大量使用一次性筷子和塑料袋', '植树造林'], answer: 2, why: '大量使用一次性用品，生产和处理它们都要消耗能源、排放二氧化碳。绿色出行、节约用电、植树造林都能减少大气中的二氧化碳。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:carbon:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="碳和二氧化碳" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。碳和碳的氧化物你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
