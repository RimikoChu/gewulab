// 减数分裂和遗传规律 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景从果蝇台斜着望过细胞模型台到白板。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { CHROMOSOMES, DI_ORDER, count, diPunnett, diRatio, fstr, frac, gametesFrom, pBoth, phenoRatio, punnett } from './physics'
import { VOICE } from './voice'
import { Room } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const FLY = CHROMOSOMES.fly, A2 = count('ana2', FLY).chr, T1 = count('pro1', FLY)
const [TD, TR] = phenoRatio(punnett('Vv', 'vv'))
const R = diRatio(diPunnett('EeVv', 'EeVv').cells), ebLong = frac(R[2], 16)
const BOTH = pBoth(frac(1, 2), frac(1, 2))
const QS: Q[] = [
  { lesson: '1', q: '关于四分体，说法正确的是：', options: ['一个四分体就是四条染色体', '一个四分体含一对同源染色体、四条染色单体', '有丝分裂前期也会形成四分体', '四分体中的姐妹染色单体之间交叉互换'], answer: 1, why: `联会后的每对同源染色体含有四条染色单体，叫四分体。果蝇 2n = ${FLY}，前期Ⅰ有 ${T1.tetrad} 个四分体、${T1.chromatid} 条染色单体。交叉互换发生在四分体的非姐妹染色单体之间。` },
  { lesson: '1', q: '减数分裂过程中，染色体数目减半发生在：', options: ['间期', '减数第一次分裂', '减数第二次分裂', '受精作用'], answer: 1, why: '减数第一次分裂后期同源染色体分离，分别进入两个子细胞，染色体数目减半。减数第二次分裂只是着丝粒分裂，数目不再减少。' },
  { lesson: '2', q: `果蝇体细胞有 ${FLY} 条染色体。减数第二次分裂后期，一个细胞里有几条染色体？`, options: [`${FLY / 2} 条`, `${FLY} 条`, `${FLY * 2} 条`, `${FLY / 4} 条`], answer: [FLY / 2, FLY, FLY * 2, FLY / 4].indexOf(A2), why: `次级精母细胞里只有 ${FLY / 2} 条，后期Ⅱ着丝粒分裂，姐妹染色单体分开成为染色体，暂时变成 ${A2} 条；但这时已经没有同源染色体了。` },
  { lesson: '3', q: '一个初级卵母细胞经过减数分裂，最后形成：', options: ['4 个卵细胞', '2 个卵细胞和 2 个极体', `${gametesFrom('egg')} 个卵细胞和 3 个极体`, '1 个卵细胞和 1 个极体'], answer: 2, why: '卵细胞形成时细胞质不均等分裂：减数第一次分裂得到次级卵母细胞和一个极体，减数第二次分裂得到卵细胞和一个极体，第一极体也分成两个。所以是 1 个卵细胞、3 个极体。' },
  { lesson: '4', q: '关于受精卵，说法正确的是：', options: ['受精卵中的遗传物质一半来自父方，一半来自母方', '受精卵细胞核中的染色体一半来自父方，一半来自母方', '受精卵的染色体数是体细胞的两倍', '一个卵细胞可以和多个精子结合'], answer: 1, why: '细胞核里的染色体一半来自精子、一半来自卵细胞；但细胞质几乎全部来自卵细胞，所以不能说“遗传物质”各占一半。受精卵的染色体数和体细胞相同；一个精子进入后，卵细胞会阻止其他精子再进入。' },
  { lesson: '5', q: '长翅 Vv 的果蝇和残翅 vv 的果蝇交配（测交），后代长翅∶残翅约为：', options: ['3∶1', `${TD}∶${TR}`, '1∶2∶1', '全是长翅'], answer: 1, why: `Vv 产生 V、v 两种配子各占 1/2，vv 只产生 v。后代 Vv∶vv = ${TD}∶${TR}。测交后代的比例反映了子一代产生的配子种类和比例。` },
  { lesson: '6', q: '灰体长翅 EeVv 的雌雄果蝇相互交配，子代中黑檀体长翅占：', options: ['1/16', '3/16', '9/16', '1/4'], answer: ['1/16', '3/16', '9/16', '1/4'].indexOf(fstr(ebLong)), why: `子代 ${DI_ORDER.join('∶')} = ${R.join('∶')}，黑檀体长翅占 ${R[2]}/16。也可以分开算：黑檀体 1/4，长翅 3/4，相乘得 3/16。` },
  { lesson: '7', q: '一个红绿色盲男孩，父母色觉都正常，他的色盲基因来自：', options: ['父亲', '母亲', '父亲和母亲各一个', '祖父'], answer: 1, why: '男孩的 X 染色体只能来自母亲，Y 来自父亲。他是 XᵇY，Xᵇ 一定来自母亲，母亲是携带者 XᴮXᵇ。' },
  { lesson: '6', q: '两对基因独立遗传。AaBb × aabb，后代中 aabb 占：', options: ['1/16', '1/8', `${fstr(BOTH)}`, '1/2'], answer: 2, why: `分开看：Aa × aa，aa 占 1/2；Bb × bb，bb 占 1/2。两对自由组合，相乘：1/2 × 1/2 = ${fstr(BOTH)}。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:meiosis:q'

export default function Quiz() {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<(number | null)[]>(() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) && a.length === QS.length ? a : QS.map(() => null) } catch { return QS.map(() => null) } })
  const [finale, setFinale] = useState(false)
  const q = QS[i], mine = picked[i]
  const answered = picked.filter(x => x !== null).length, right = picked.filter((x, k) => x === QS[k].answer).length
  const choose = (k: number) => {
    if (mine !== null) return
    const n = picked.map((x, j) => (j === i ? k : x)); setPicked(n); try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* 忽略 */ }
    if (n.every(x => x !== null)) setTimeout(() => setFinale(true), 1400)
  }
  const resetAll = () => { setPicked(QS.map(() => null)); setI(0); setFinale(false); try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }
  const done = { all: answered === QS.length, pass: right >= 7 }
  const hint = mine === null ? '选一个答案' : mine === q.answer ? '答对了' : `答错了：可以回到第 ${q.lesson} 课再做一遍`
  return (
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="减数分裂和遗传规律" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Room at="room" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。从减数分裂到遗传规律，这一章你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
