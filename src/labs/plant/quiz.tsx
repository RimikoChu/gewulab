// 植物的一生 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整块试验田。题目里的内容都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { BECOMES, BUD, CONTROL, FALLS, FIRST_OUT, GROUPS, JARS, MAIN_PARTS, SAMPLE, SEEDS, absorber, developsInto, embryoOf, fastest, germRate, lacking, meanRate, storeOf, variable } from './physics'
import { Room } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const J = (n: number) => JARS.find(j => j.no === n)!, name = (k: keyof typeof BECOMES) => SEEDS.bean.parts.find(p => p.key === k)!.name
const QS: Q[] = [
  { lesson: '1', q: '菜豆种子和玉米种子都有的结构是哪一组？', options: ['种皮和胚乳', '种皮和胚', '胚乳和子叶', '果皮和胚乳'], answer: 1, why: `两种种子都有种皮和胚，胚都由${embryoOf('bean').join('、')}组成。菜豆种子没有胚乳，营养物质贮存在${storeOf('bean')}里；玉米种子的营养物质贮存在${storeOf('corn')}里。` },
  { lesson: '1', q: '在玉米种子的纵剖面上滴一滴碘液，变蓝的部分是什么？', options: ['胚芽', '子叶', '胚乳', '果皮和种皮'], answer: 2, why: `淀粉遇碘液变蓝。玉米种子的营养物质（主要是淀粉）贮存在${storeOf('corn')}里，所以${storeOf('corn')}变蓝。` },
  { lesson: '2', q: `${J(4).no} 号瓶里的水没过了种子，种子没有萌发。它缺少的条件是什么？`, options: ['一定的水分', '适宜的温度', '充足的空气', '充足的光照'], answer: 2, why: `水没过种子，种子接触不到空气，缺的是${lacking(J(4))}。种子萌发的环境条件是一定的水分、充足的空气和适宜的温度。` },
  { lesson: '2', q: `要探究“温度对种子萌发的影响”，应该拿哪两个瓶来比？`, options: ['1 号和 2 号', '2 号和 3 号', '1 号和 3 号', '3 号和 4 号'], answer: 1, why: `${CONTROL} 号和 3 号只有${variable(J(3), J(CONTROL))}不同，可以比。1 号和 3 号水分、温度都不同，变量不止一个，不能比。` },
  { lesson: '3', q: '种子萌发时，最先突破种皮的是哪一部分？它发育成什么？', options: ['胚芽，发育成茎和叶', '胚根，发育成根', '胚轴，发育成茎', '子叶，发育成叶'], answer: 1, why: `${name(FIRST_OUT)}最先突破种皮，发育成${BECOMES[FIRST_OUT]}。随后胚轴伸长，胚芽发育成${BECOMES.plumule}。` },
  { lesson: '4', q: '在幼根上画等距的线，一天后线的间距变得最大的是哪个区？', options: ['根冠', '分生区', '伸长区', '成熟区'], answer: 2, why: `${fastest().name}的细胞迅速伸长，是根生长最快的部位。吸收水和无机盐的主要部位是${absorber().name}，不要弄混。` },
  { lesson: '5', q: '叶芽里的芽原基，将来发育成什么？', options: ['叶', '茎', '芽', '花'], answer: 2, why: `${BUD.map(b => `${b.name}发育成${b.becomes}`).join('，')}。` },
  { lesson: '6', q: '一朵花里，和结出果实、种子直接有关的主要结构是哪一组？', options: ['花瓣和萼片', '雄蕊和雌蕊', '花柄和花托', '花瓣和雄蕊'], answer: 1, why: `${MAIN_PARTS.join('和')}是花的主要结构：雄蕊的花药里有花粉，雌蕊的子房里有胚珠。` },
  { lesson: '7', q: '我们吃的桃肉，是由花的哪一部分发育来的？', options: ['胚珠', '受精卵', '子房壁', '花托'], answer: 2, why: `桃肉是果皮的一部分，果皮由子房壁发育来。子房发育成${developsInto('子房')}，胚珠发育成${developsInto('胚珠')}，受精卵发育成${developsInto('受精卵')}；${FALLS.join('、')}在受精后凋落。` },
]
const EXTRA = `拓展课里测发芽率的那三组（每组 ${SAMPLE} 粒，发芽 ${GROUPS.join('、')} 粒），发芽率分别是 ${GROUPS.map(n => `${germRate(n, SAMPLE)}%`).join('、')}，平均 ${meanRate(GROUPS).toFixed(0)}%。`
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:plant:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="植物的一生" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Room at="field" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<><p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p><p className="mt-3 text-white/70">{EXTRA}</p></>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。从种子到果实，这一圈你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
