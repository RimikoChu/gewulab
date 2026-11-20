// 光合作用和呼吸作用 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座大棚。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import House from './house'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '做“绿叶在光下制造有机物”的实验前，为什么要把天竺葵放在黑暗处一昼夜？', options: ['让叶片多吸收水分', '把叶片里原有的淀粉运走、耗尽', '让叶片长出更多叶绿体', '让气孔全部关闭'], answer: 1, why: '叶片里原来就存着淀粉。不先耗尽，后面滴碘液变蓝，就分不清是原有的还是实验中新制造的。' },
  { lesson: '1', q: '用酒精给叶片脱色时，为什么要把装酒精的小烧杯放在水里加热，而不是直接加热？', options: ['酒精容易燃烧，直接加热有危险', '水能让叶绿素溶解得更快', '直接加热会把淀粉烧掉', '这样更省酒精'], answer: 0, why: '酒精易燃、易挥发。隔水加热温度不会太高，也不接触明火，安全。' },
  { lesson: '2', q: '金鱼藻在光下冒出的气泡，能让带火星的木条重新燃烧。这种气体是什么？', options: ['二氧化碳', '氧气', '水蒸气', '氮气'], answer: 1, why: '氧气能助燃，让带火星的木条复燃。光合作用在制造有机物的同时放出氧气。' },
  { lesson: '3', q: '探究“二氧化碳是不是光合作用的原料”时，钟罩里放氢氧化钠溶液是为了什么？', options: ['给植物提供养料', '吸收罩里的二氧化碳', '吸收罩里的氧气', '保持罩里湿润'], answer: 1, why: '氢氧化钠溶液能吸收二氧化碳。这一罩没有二氧化碳，另一罩放清水做对照，两罩只差这一样。' },
  { lesson: '4', q: '光合作用主要在叶片的哪一部分进行？', options: ['表皮细胞', '叶肉细胞的叶绿体', '叶脉里的导管', '保卫细胞之间的气孔'], answer: 1, why: '叶绿体是光合作用的场所。叶肉细胞里叶绿体最多；表皮细胞没有叶绿体。' },
  { lesson: '4', q: '气孔的张开和关闭是由什么控制的？', options: ['叶脉', '表皮细胞', '保卫细胞', '叶绿体'], answer: 2, why: '气孔由一对保卫细胞围成。保卫细胞吸水鼓起来，气孔张开；失水瘪下去，气孔关闭。' },
  { lesson: '5', q: '把萌发的种子放在密闭的瓶里一段时间，瓶里的气体能使澄清的石灰水变浑浊。这说明什么？', options: ['种子吸收了氧气', '种子放出了二氧化碳', '种子放出了热量', '种子吸收了水分'], answer: 1, why: '二氧化碳能使澄清的石灰水变浑浊。萌发的种子呼吸作用旺盛，放出了二氧化碳。' },
  { lesson: '6', q: '晴天，一座关紧门窗的大棚里，一天中二氧化碳浓度最低大约在什么时候？', options: ['清晨日出前后', '正午', '傍晚日落前后', '半夜'], answer: 2, why: '整个白天光合作用吸收的二氧化碳都比呼吸作用放出的多，浓度一路下降，到傍晚光很弱时降到最低。' },
  { lesson: '7', q: '大棚夜间适当降低温度可以增产，原因是什么？', options: ['低温让光合作用更强', '低温减弱了呼吸作用，有机物消耗少了', '低温让植物多吸水', '低温能杀死害虫'], answer: 1, why: '夜里没有光，只有呼吸作用在消耗有机物。温度低，呼吸作用弱，白天攒下的有机物就留得多。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:leaf:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="光合作用和呼吸作用" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<House t={10} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。光合作用和呼吸作用你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
