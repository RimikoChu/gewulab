// 基因的表达 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整个细胞。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { antiparallel, aaName, replicate, variety } from './physics'
import { VOICE } from './voice'
import { Room } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const R2 = replicate(2, 1)
const QS: Q[] = [
  { lesson: '1', q: 'DNA 的一条链是 5′-ATGC-3′，它的互补链按 5′→3′ 写是：', options: ['5′-TACG-3′', `5′-${antiparallel('ATGC')}-3′`, '5′-ATGC-3′', '5′-UACG-3′'], answer: 1, why: `逐个配对得到 TACG，但这条链的方向是 3′→5′。两条链反向平行，按 5′→3′ 写要倒过来：${antiparallel('ATGC')}。` },
  { lesson: '2', q: '把 DNA 两条链都用 ¹⁵N 标记的细菌，放到只含 ¹⁴N 的培养基中繁殖两代，含 ¹⁵N 的 DNA 占全部 DNA 的：', options: ['1/4', '1/2', '3/4', '全部'], answer: 1, why: `半保留复制：两代后共 ${R2.dna} 个 DNA，两条 ¹⁵N 母链分在 ${R2.withParent} 个 DNA 里，占 ${R2.withParent}/${R2.dna} = 1/2。` },
  { lesson: '3', q: '关于基因和 DNA 的关系，正确的是：', options: ['一个 DNA 上只有一个基因', '基因通常是有遗传效应的 DNA 片段，DNA 上还有不属于基因的片段', 'DNA 的全部碱基序列都是基因', '基因由蛋白质组成'], answer: 1, why: `一个 DNA 上有许多基因，基因之间还有别的片段。碱基对的排列方式千变万化：10 对就有 ${variety(10).toLocaleString('en-US')} 种。` },
  { lesson: '4', q: '转录的模板、原料和主要的酶分别是：', options: ['DNA 两条链、脱氧核苷酸、DNA 聚合酶', 'DNA 的一条链、核糖核苷酸、RNA 聚合酶', 'mRNA、氨基酸、RNA 聚合酶', 'DNA 的一条链、脱氧核苷酸、解旋酶'], answer: 1, why: '转录以 DNA 的一条链为模板，以游离的核糖核苷酸为原料，在 RNA 聚合酶的作用下合成 RNA。' },
  { lesson: '5', q: `mRNA 上依次是 AUG、GAG、UAA，翻译出的肽链是：`, options: [`${aaName('AUG')}—${aaName('GAG')}—${aaName('UAA')}`, `${aaName('AUG')}—${aaName('GAG')}`, aaName('GAG'), `${aaName('GAG')}—${aaName('AUG')}`], answer: 1, why: `AUG 是起始密码子，决定${aaName('AUG')}；GAG 决定${aaName('GAG')}；UAA 是终止密码子，不决定氨基酸。` },
  { lesson: '6', q: '反密码子位于：', options: ['DNA 上', 'mRNA 上', 'tRNA 上', '核糖体上'], answer: 2, why: '密码子在 mRNA 上，反密码子在 tRNA 上，两者互补配对。' },
  { lesson: '7', q: '镰状细胞贫血的根本原因是：', options: ['血红蛋白里一个谷氨酸被缬氨酸替代', '控制血红蛋白的基因中一个碱基对被替换', '红细胞变成镰刀形', '缺少铁'], answer: 1, why: '直接原因是蛋白质（血红蛋白）的结构改变；根本原因是基因突变：一个碱基对被替换，GAG 变成 GUG。' },
  { lesson: '6', q: '一条 mRNA 有 300 个碱基（不算终止密码子），它最多能决定多少个氨基酸？', options: ['300 个', '150 个', '100 个', '900 个'], answer: 2, why: '3 个碱基组成 1 个密码子、决定 1 个氨基酸，300 ÷ 3 = 100。' },
  { lesson: '2', q: '一个 DNA 有 100 个碱基对，其中 A 有 30 个。它复制一次，需要游离的含 G 的脱氧核苷酸多少个？', options: ['30 个', '60 个', '70 个', '140 个'], answer: 2, why: '双链里 A = T = 30，G = C = (200 − 60) ÷ 2 = 70。复制一次新合成两条链，正好相当于一个 DNA，需要 G 70 个。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:expression:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="基因的表达" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Room at="cell" labels={[]} />}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。从 DNA 的结构到蛋白质的合成，这两章你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
