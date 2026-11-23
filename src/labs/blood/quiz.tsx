// 血液循环 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整个展厅。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { CAP_UM, CHAMBERS, HR, PHASES, period, plasmaPct, thickest, valves } from './physics'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const V = valves('ventricles')
const QS: Q[] = [
  { lesson: '1', q: '新鲜血液加抗凝剂静置后分成三层。中间那一薄层白色的是什么？', options: ['血浆', '红细胞', '白细胞和血小板', '血清'], answer: 2, why: `上层淡黄色、半透明的是血浆（约 ${plasmaPct()}%），下层深红色的是红细胞，两层之间很薄的一层白色物质是白细胞和血小板。` },
  { lesson: '2', q: '只允许红细胞单行通过的血管是哪一种？', options: ['动脉', '静脉', '毛细血管', '主动脉'], answer: 2, why: `毛细血管内径只有 ${CAP_UM[0]}–${CAP_UM[1]} µm，只允许红细胞单行通过；管壁只有一层上皮细胞，血流最慢。` },
  { lesson: '3', q: '心脏的四个腔中，壁最厚的是哪一个？', options: ['右心房', '右心室', '左心房', '左心室'], answer: 3, why: `${CHAMBERS[thickest()].name}的壁最厚：它要把血经主动脉送到全身，路程最远。右心室只把血送到肺。` },
  { lesson: '4', q: '心室收缩时，房室瓣和动脉瓣分别是什么状态？', options: ['都打开', '房室瓣关闭，动脉瓣打开', '房室瓣打开，动脉瓣关闭', '都关闭'], answer: 1, why: `心室收缩：房室瓣${V.av ? '开' : '关'}，动脉瓣${V.sl ? '开' : '关'}，血从心室射进动脉，不会倒流回心房。` },
  { lesson: '5', q: '体循环从哪里开始，到哪里结束？', options: ['右心室 → 左心房', '左心室 → 右心房', '左心房 → 右心室', '右心房 → 左心室'], answer: 1, why: '体循环：左心室 → 主动脉 → 各级动脉 → 全身毛细血管 → 各级静脉 → 上、下腔静脉 → 右心房。' },
  { lesson: '6', q: '肺动脉里流的是什么血？', options: ['动脉血', '静脉血', '一半动脉血一半静脉血', '没有血'], answer: 1, why: '肺动脉把右心室里的静脉血送到肺，所以里面流的是静脉血。动脉、静脉是按血流方向分的，不是按里面的血分的。' },
  { lesson: '7', q: '血液流经哪里以后，由静脉血变成动脉血？', options: ['心脏', '全身组织处的毛细血管', '肺部的毛细血管', '上、下腔静脉'], answer: 2, why: '在肺部毛细血管里，肺泡里的氧扩散进血液，血液里的二氧化碳扩散进肺泡，静脉血变成动脉血。血流经心脏不会换气。' },
  { lesson: '5', q: '在手背的静脉里输液，药物最先到达心脏的哪个腔？', options: ['左心房', '左心室', '右心房', '右心室'], answer: 2, why: '手背静脉 → 上肢的静脉 → 上腔静脉 → 右心房。药物最先到达右心房，再经右心室、肺循环回到左心房、左心室，才送往全身。' },
  { lesson: '4', q: `心率 ${HR} 次/分时，一次心跳 ${period().toFixed(1)} s，其中心室收缩约多长时间？`, options: [`${PHASES[0].sec} s`, `${PHASES[1].sec} s`, `${PHASES[2].sec} s`, `${period().toFixed(1)} s`], answer: 1, why: `心房收缩 ${PHASES[0].sec} s，心室收缩 ${PHASES[1].sec} s，全心舒张 ${PHASES[2].sec} s。心房、心室不会同时收缩，全心舒张的时间最长，让心肌得到休息、血液流回心脏。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:blood:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="血液循环" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]} want={{ stream: 'all' }} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。血液循环你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
