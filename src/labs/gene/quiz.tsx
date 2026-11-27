// 遗传和变异 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座试验园。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { CHROMOSOMES, KARYOTYPE, cross, gamete, tally, testCross } from './physics'
import { VOICE } from './voice'
import { Room } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const F2 = tally(cross('Dd', 'Dd')), TC = tally(testCross('Dd'))
const QS: Q[] = [
  { lesson: '1', q: '下面哪一组是相对性状？', options: ['豌豆的高茎和圆粒', '豌豆的紫花和白花', '豌豆的皱粒和人的卷发', '豌豆的矮茎和绿色豆荚'], answer: 1, why: '相对性状是同种生物同一性状的不同表现形式。紫花和白花说的都是豌豆花的颜色；高茎和圆粒是两种性状，皱粒和卷发不是同一种生物。' },
  { lesson: '2', q: '染色体、DNA、基因三者的关系，说法正确的是：', options: ['基因由染色体组成', 'DNA 上有许多基因，染色体主要由 DNA 和蛋白质组成', '一条染色体上只有一个基因', 'DNA 主要由染色体和蛋白质组成'], answer: 1, why: '细胞核里有染色体，染色体主要由 DNA 和蛋白质组成，DNA 上有许多有遗传效应的片段，就是基因。' },
  { lesson: '3', q: `豌豆的体细胞有 ${CHROMOSOMES.pea} 条染色体，它的卵细胞里有几条？`, options: [`${CHROMOSOMES.pea * 2} 条`, `${CHROMOSOMES.pea} 条`, `${gamete(CHROMOSOMES.pea)} 条`, `${gamete(CHROMOSOMES.pea)} 对`], answer: 2, why: `形成生殖细胞时每对染色体只有一条进入，生殖细胞里是 ${gamete(CHROMOSOMES.pea)} 条，而且不成对。` },
  { lesson: '4', q: '用豌豆做杂交实验，给母本去雄、套袋，是为了：', options: ['让花开得更快', '防止自花传粉和外来花粉的干扰', '给花保温', '防止害虫咬花'], answer: 1, why: '豌豆自花传粉、闭花受粉。花未成熟时去雄，免得自己的花粉落到柱头上；套袋，挡住别的花粉。这样柱头上只有人工授的花粉。' },
  { lesson: '5', q: '子二代里的一株矮茎豌豆，它的基因组成是：', options: ['DD', 'Dd', 'dd', 'DD 或 Dd'], answer: 2, why: '矮茎是隐性性状，只有两个基因都是隐性的 d 才表现出来，所以是 dd。DD 和 Dd 都表现高茎。' },
  { lesson: '5', q: '子一代 Dd 自花传粉，子二代的高茎里，基因组成是 DD 的占：', options: ['1/4', '1/3', '1/2', '3/4'], answer: 1, why: `子二代 DD∶Dd∶dd = ${F2.DD}∶${F2.Dd}∶${F2.dd}。高茎是 DD 和 Dd，一共 ${F2.DD + F2.Dd} 份，其中 DD 占 ${F2.DD} 份，是 1/3。别和“DD 占全部子二代的 1/4”弄混。` },
  { lesson: '6', q: '生男孩还是女孩，取决于：', options: ['卵细胞含 X 还是含 Y', '精子含 X 还是含 Y', '母亲的体质', '受精卵的大小'], answer: 1, why: `女性是 ${KARYOTYPE.female.sex}，卵细胞都含 X；男性是 ${KARYOTYPE.male.sex}，精子有含 X 和含 Y 两种。含 Y 的精子和卵细胞结合，发育成男孩。` },
  { lesson: '7', q: '下列变异中，能遗传给后代的是：', options: ['经常晒太阳，皮肤变黑', '大花生种在贫瘠的土里结的果实小', '通过杂交选育出的矮秆抗倒伏小麦', '水肥充足的玉米长得粗壮'], answer: 2, why: '杂交育种改变了遗传物质，能遗传。另外三个都只是环境引起的，遗传物质没有改变，不能遗传。' },
  { lesson: '5', q: '一株高茎豌豆和一株矮茎豌豆杂交，后代高茎、矮茎各占一半。这株高茎的基因组成是：', options: ['DD', 'Dd', 'dd', '无法判断'], answer: 1, why: `后代里出现了矮茎（dd），说明高茎亲本也给了一个 d，它是 Dd。Dd × dd，后代 Dd∶dd = ${TC.Dd}∶${TC.dd}，正好一半高茎一半矮茎。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:gene:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="遗传和变异" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Room at="field" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。从性状到基因、从亲代到子二代，这一章你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
