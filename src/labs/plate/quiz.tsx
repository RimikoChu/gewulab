// 板块运动 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是画着板块边界的地球。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LabStage } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { SPACE, SPOT, type Want } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '下面哪一条不能作为“大陆漂移”的证据？', options: ['大西洋两岸的轮廓凹凸吻合', '两岸发现同一种淡水爬行动物的化石', '两岸相同年代的古老岩层能接上', '两岸现在的气候差不多'], answer: 3, why: '今天的气候取决于今天的纬度和环境，说明不了两块大陆以前是否连在一起。轮廓、化石、岩层才是证据。' },
  { lesson: '2', q: '在大洋中脊两侧取洋底岩石，发现的规律是：', options: ['离中脊越远，岩石越年轻', '离中脊越远，岩石越老，两侧对称', '两侧岩石年龄完全没有规律', '只有一侧有岩石'], answer: 1, why: '新的洋底在洋中脊生成，再往两侧推开，所以离中脊越远越老，两侧对称。' },
  { lesson: '3', q: '中国所在的板块是：', options: ['太平洋板块', '印度洋板块', '亚欧板块', '美洲板块'], answer: 2, why: '中国在亚欧板块上，西南挨着印度洋板块，东边挨着太平洋板块。' },
  { lesson: '3', q: '关于板块，说法正确的是：', options: ['每个板块就是一块大陆', '板块漂浮在软流层上，不停地运动', '板块内部火山地震最多', '全球只有一个板块'], answer: 1, why: '板块是岩石圈分成的一块块，漂浮在软流层上运动。板块不等于大陆，太平洋板块几乎全是海洋。' },
  { lesson: '4', q: '东非大裂谷、红海是怎样形成的？', options: ['板块张裂', '大陆和大陆碰撞', '大洋板块俯冲', '河流冲刷'], answer: 0, why: '板块张裂的地方，地面被拉开、下陷，形成裂谷；继续张裂，海水灌进来成为狭长的海。' },
  { lesson: '5', q: '喜马拉雅山是哪两个板块碰撞挤压形成的？', options: ['亚欧板块和太平洋板块', '亚欧板块和印度洋板块', '非洲板块和印度洋板块', '美洲板块和太平洋板块'], answer: 1, why: '印度洋板块向北推进，和亚欧板块碰撞挤压，抬升出喜马拉雅山和青藏高原。' },
  { lesson: '5', q: '在喜马拉雅山的岩层里发现了海洋生物的化石，这说明：', options: ['海洋生物会爬山', '这里很久以前是海洋', '这些化石是从别处冲来的', '山上一直有海水'], answer: 1, why: '这些岩层原来是海底的沉积物，板块碰撞时被挤压抬升成了高山：沧海变桑田。' },
  { lesson: '6', q: '大洋板块和大陆板块相撞时，通常会：', options: ['大陆板块俯冲到大洋板块下面', '大洋板块俯冲到大陆板块下面，形成海沟', '两块板块一起抬升成高原', '两块板块分开'], answer: 1, why: '大洋板块密度大、位置低，俯冲到大陆板块下面，海边形成海沟，大陆边缘形成火山山脉。' },
  { lesson: '7', q: '日本多火山、地震，主要原因是：', options: ['日本在板块内部', '日本在亚欧板块和太平洋板块的交界处', '日本四面环海', '日本纬度高'], answer: 1, why: '火山、地震多分布在板块交界处。日本在环太平洋火山地震带上，处于亚欧板块和太平洋板块的交界处。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:plate:q'

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
  const s = SPOT.globe
  return (
    <LabShell narration={voiced(NARRATION['q'], VOICE)} autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="板块运动" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<LabStage<Want> labels={[]} target={s.target} span={s.span} view={s.view} {...SPACE} world={{ globe: { face: [60, 15], lines: 1, fill: 0.7 } }}>{null}</LabStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。板块运动你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
