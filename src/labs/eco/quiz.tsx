// 生态系统 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整片草原。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { DARK, RATES, WOODLICE, average, chainsOf, energyAt, levelsOf, summary, simulate } from './physics'
import { VOICE } from './voice'
import { Room } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const S = summary(simulate('many'))
const QS: Q[] = [
  { lesson: '1', q: '探究“光对鼠妇分布的影响”时，实验盒两侧唯一不同的条件应该是什么？', options: ['土壤的湿度', '光照', '温度', '鼠妇的数量'], answer: 1, why: '要探究光的影响，就只让光不同（一侧阴暗、一侧明亮），湿度、温度等其他条件都相同。这叫控制单一变量。' },
  { lesson: '1', q: `实验中用 ${WOODLICE} 只鼠妇、每分钟统计一次共 10 次，再取平均值，主要是为了什么？`, options: ['让鼠妇适应环境', '减少偶然因素造成的误差', '让实验做得久一点', '让数据更大'], answer: 1, why: `只用一只、只数一次，结果可能是偶然的。多只、多次取平均值（这次阴暗一侧平均 ${average(DARK).toFixed(1)} 只），结论更可靠。` },
  { lesson: '2', q: '草原上枯木上长出的蘑菇，在生态系统中属于哪一部分？', options: ['生产者', '消费者', '分解者', '非生物部分'], answer: 2, why: '蘑菇是真菌，不能进行光合作用，靠分解动植物遗体中的有机物生活，是分解者。' },
  { lesson: '3', q: '下面哪一条食物链的写法是正确的？', options: ['阳光 → 草 → 兔 → 狐', '草 → 兔 → 狐 → 细菌', '狐 → 兔 → 草', '草 → 鼠 → 蛇 → 鹰'], answer: 3, why: '食物链从生产者开始，箭头指向吃它的一方；阳光是非生物部分，细菌是分解者，都不写进食物链。' },
  { lesson: '4', q: '在“草、兔、鼠、狐、蛇、鹰”组成的草原食物网里（兔、鼠吃草；狐吃兔和鼠；鹰吃兔、鼠和蛇；蛇吃鼠），一共有几条食物链？', options: ['3 条', '4 条', '5 条', '6 条'], answer: 2, why: `${chainsOf().map(c => c.join('→')).join('；')}。一共 ${chainsOf().length} 条；鹰是第${levelsOf('鹰').join('、')}营养级。` },
  { lesson: '5', q: '在“草 → 鼠 → 蛇 → 鹰”中，为什么鹰得到的能量最少？', options: ['鹰吃得最少', '能量沿食物链流动时逐级递减', '鹰不需要能量', '能量会越传越多'], answer: 1, why: `每一级都有大部分能量在呼吸作用中散失，只有大约 10%–20% 传到下一级。草固定 10000 kJ 时，按 10% 传到鹰只剩 ${energyAt(4, RATES.low)} kJ。` },
  { lesson: '6', q: '一片草地被喷洒了不易分解的农药，一段时间后，哪种生物体内的农药含量最高？', options: ['草', '鼠', '蛇', '鹰'], answer: 3, why: '有毒物质在生物体内不易分解、不易排出，会沿着食物链积累，营养级越高积累越多。鹰在最高营养级。' },
  { lesson: '7', q: '草原上的狼被大量捕杀以后，兔的数量会怎样变化？', options: ['一直增加', '先增加，后减少', '一直减少', '基本不变'], answer: 1, why: `狼少了，兔先大量增加（模型里多到约 ${Math.round(S.maxRabbit)} 只）；兔把草吃光以后，因缺少食物又大量减少。` },
  { lesson: '7', q: '关于生态系统的自我调节能力，下列说法正确的是：', options: ['自我调节能力是无限的', '农田比森林的调节能力强', '外界干扰超过一定限度，生态系统会遭到破坏', '生态平衡时各种生物的数量固定不变'], answer: 2, why: '生态系统有一定的自我调节能力，但这种能力是有限的。生态平衡是一种相对稳定，数量在一定范围内变化。森林生物种类多，调节能力比农田强。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:eco:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="生态系统" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Room at="q" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。从一只鼠妇到整片草原，你都弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
