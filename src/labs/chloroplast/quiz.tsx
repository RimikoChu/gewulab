// 光反应和暗反应 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是叶绿体里的一摞摞基粒。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { DARK_SITE, LIGHT_SITE, bandsTopDown, calvin, compensation, fixCO2, photolysis, shift, widestBand } from './physics'
import { VOICE } from './voice'
import { Place } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const BT = bandsTopDown(), SD = shift('dark'), SG = shift('noCO2'), P12 = photolysis(12)
const QS: Q[] = [
  { lesson: '1', q: '叶绿体中吸收光能的色素分布在：', options: ['叶绿体的外膜上', '叶绿体的内膜上', '类囊体的薄膜上', '叶绿体的基质中'], answer: 2, why: '色素分布在类囊体的薄膜上；基质里是与暗反应有关的酶。' },
  { lesson: '2', q: '纸层析后，滤纸条上从上到下第三条色素带是：', options: BT.map(p => `${p.name}（${p.hue}）`), answer: 2, why: `从上到下依次是${BT.map(p => p.name).join('、')}。第三条是${BT[2].name}，也是最宽的一条（${widestBand().name}含量最多）。` },
  { lesson: '2', q: '提取色素时加入碳酸钙，目的是：', options: ['使研磨充分', '溶解色素', '防止研磨中色素被破坏', '使色素分离'], answer: 2, why: '二氧化硅使研磨充分，碳酸钙防止研磨中色素被破坏，无水乙醇用来溶解（提取）色素，分离靠的是层析液。' },
  { lesson: '3', q: '只给植物照下面哪种光，光合作用最弱？', options: ['红光', '蓝紫光', '绿光', '白光'], answer: 2, why: '叶绿素主要吸收红光和蓝紫光，类胡萝卜素主要吸收蓝紫光，绿光被吸收得最少。' },
  { lesson: '4', q: '光反应为暗反应提供的物质是：', options: ['O₂ 和 ATP', 'ATP 和 NADPH', 'CO₂ 和 NADPH', 'ADP 和 Pi'], answer: 1, why: `光反应在${LIGHT_SITE}进行，生成的 ATP 和 NADPH 用于暗反应中 C₃ 的还原；O₂ 直接放出去了。` },
  { lesson: '4', q: `光反应中有 12 个水分子被分解，放出的 O₂ 是：`, options: ['3 个', `${P12.o2} 个`, '12 个', '24 个'], answer: 1, why: `2 H₂O → O₂ + 4 H⁺ + 4 e⁻，12 个水分子放出 ${P12.o2} 个 O₂。光合作用释放的氧全部来自水。` },
  { lesson: '5', q: '暗反应中，CO₂ 中的碳的转移途径是：', options: ['CO₂ → C₅ → 糖类', 'CO₂ → C₃ → 糖类', 'CO₂ → NADPH → 糖类', 'CO₂ → ATP → 糖类'], answer: 1, why: `在${DARK_SITE}，1 个 CO₂ 和 1 个 C₅ 结合成 ${fixCO2(1).c3} 个 C₃，C₃ 被还原后一部分变成糖类。固定 6 个 CO₂ 可以合成 ${calvin(6).glucose} 个葡萄糖。` },
  { lesson: '6', q: '正在进行光合作用的植物，突然停止光照，短时间内叶绿体中：', options: ['C₃ 增多，C₅ 减少', 'C₃ 减少，C₅ 增多', 'C₃、C₅ 都增多', 'C₃、C₅ 都减少'], answer: 0, why: `停光后 ATP、NADPH ${SD.e}，C₃ 的还原受阻，而 CO₂ 的固定还在进行：C₃ ${SD.c3}，C₅ ${SD.c5}。（如果是突然停止供应 CO₂，则 C₃ ${SG.c3}、C₅ ${SG.c5}。）` },
  { lesson: '7', q: '在光补偿点时，植物的：', options: ['光合速率为 0', '呼吸速率为 0', '光合速率等于呼吸速率', '光合速率达到最大'], answer: 2, why: `光补偿点（这株菠菜约在 ${compensation('light').toFixed(0)}，相对值）时，光合作用吸收的 CO₂ 和呼吸作用放出的一样多，净光合速率为 0。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:chloroplast:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title={TITLE} lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="quiz" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。从叶绿体的结构到光反应、暗反应，这一节你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
