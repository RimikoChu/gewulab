// 消化和吸收 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整个展厅。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { ABSORB, PAGODA, PRODUCTS, SMALL_LEN, WARM_MIN } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '往馒头上滴碘液，馒头变蓝。这说明馒头里含有什么？', options: ['葡萄糖', '淀粉', '蛋白质', '脂肪'], answer: 1, why: '淀粉遇碘变蓝，碘液是用来检验淀粉的。葡萄糖遇碘不变蓝。' },
  { lesson: '2', q: '下列器官中，不属于消化道的是哪一个？', options: ['咽', '食道', '肝', '大肠'], answer: 2, why: `肝是消化腺，分泌胆汁，不是消化道的一段。消化道是口腔、咽、食道、胃、小肠（长约 ${SMALL_LEN[0]}–${SMALL_LEN[1]} m）、大肠、肛门。` },
  { lesson: '3', q: `“馒头在口腔中的变化”实验，37 ℃ 保温 ${WARM_MIN} 分钟后滴碘液，不变蓝的是哪一支？`, options: ['馒头碎屑 + 清水，搅拌', '馒头碎屑 + 唾液，搅拌', '馒头块 + 唾液，不搅拌', '三支都不变蓝'], answer: 1, why: '只有加了唾液、又充分搅拌的那支，淀粉被唾液淀粉酶分解成麦芽糖，不变蓝。清水不能分解淀粉；馒头块不搅拌，里面的淀粉还在，部分变蓝。' },
  { lesson: '4', q: '胃液能初步分解哪种物质？', options: ['淀粉', '蛋白质', '脂肪', '维生素'], answer: 1, why: '胃液里有胃蛋白酶，能把蛋白质初步分解。淀粉、脂肪在胃里基本不被消化。' },
  { lesson: '5', q: '关于胆汁，下列说法正确的是：', options: ['含有分解脂肪的酶', '把脂肪分解成甘油和脂肪酸', '不含消化酶，能把脂肪乳化成微粒', '由胆囊分泌'], answer: 2, why: '胆汁由肝分泌、储存在胆囊里。它不含消化酶，只把大的脂肪滴变成微小的颗粒，增加和消化酶的接触面积。' },
  { lesson: '5', q: '蛋白质在消化道里最终被分解成什么？', options: ['多肽', '葡萄糖', PRODUCTS.protein, '甘油和脂肪酸'], answer: 2, why: `蛋白质在胃里被初步分解，在小肠里被胰液、肠液彻底分解成${PRODUCTS.protein}。淀粉 → ${PRODUCTS.starch}；脂肪 → ${PRODUCTS.fat}。` },
  { lesson: '6', q: '能吸收少量水和酒精的器官是哪一个？', options: ['口腔', '食道', '胃', '大肠'], answer: 2, why: `${ABSORB.stomach.name}能吸收${ABSORB.stomach.what}。口腔、食道基本不吸收；大肠吸收${ABSORB.large.what}。` },
  { lesson: '7', q: '平衡膳食宝塔最底层、每天吃得最多的是哪类食物？', options: [PAGODA[0].name, PAGODA[1].name, PAGODA[2].name, PAGODA[4].name], answer: 0, why: `${PAGODA[0].name}在宝塔最底层（${PAGODA[0].amount}），是能量的主要来源；油和盐在塔顶，要少吃。` },
  { lesson: '3', q: '淀粉、蛋白质、脂肪开始被消化的部位依次是：', options: ['口腔、胃、小肠', '胃、口腔、小肠', '口腔、小肠、胃', '小肠、小肠、小肠'], answer: 0, why: '淀粉在口腔里就开始被唾液分解，蛋白质从胃开始，脂肪从小肠开始；三者最后都在小肠被彻底分解。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:digest:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="消化和吸收" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && <div>
        <p className="text-[12.5px] text-[#7fe3d4]">九道题都答完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">答对 {right} / {QS.length}</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">{right === QS.length ? '全对。消化和吸收你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
      </div>}
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
