// 压强 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整座水电站的全景。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { LabStage } from './stage'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '同一块砖分别平放、侧放、立放在水平地面上，哪种放法对地面的压强最大？', options: ['平放', '侧放', '立放', '三种一样大'], answer: 2, why: '砖对地面的压力都等于它的重力，没有变。立放时着地的面积最小，压强最大。' },
  { lesson: '2', q: '一辆 20 吨的卡车停在水平地面上，6 个轮子每个着地 0.05 m²（g 取 9.8 N/kg）。它对地面的压强约是多少？', options: ['6.5×10⁴ Pa', '6.5×10⁵ Pa', '3.9×10⁶ Pa', '5.9×10⁴ Pa'], answer: 1, why: 'F = G = 20000 × 9.8 = 1.96×10⁵ N；受力面积要用 6 个轮子的总面积 0.3 m²；p = F/S ≈ 6.5×10⁵ Pa。' },
  { lesson: '3', q: '把压强计的探头放在水中同一深度，让橡皮膜分别朝上、朝下、朝侧面，读数怎样？', options: ['朝下时最大', '朝上时最大', '朝侧面时最大', '三次一样大'], answer: 3, why: '在液体内部同一深度，向各个方向的压强都相等。' },
  { lesson: '4', q: '三个底面积相同、形状不同的容器，装着深度相同的水。容器底受到水的压强哪个大？', options: ['上面开口大的那个', '上面开口小的那个', '直筒的那个', '三个一样大'], answer: 3, why: '液体压强只和液体密度、深度有关（p = ρgh），和容器形状、水的多少无关。' },
  { lesson: '5', q: '下面哪一个不是利用连通器原理？', options: ['茶壶', '船闸', '锅炉水位计', '拦河大坝做成上窄下宽'], answer: 3, why: '大坝上窄下宽，是因为水越深压强越大。另外三个都是上端开口、底部连通的容器。' },
  { lesson: '6', q: '做托里拆利实验时，把玻璃管稍微倾斜一些，管内水银柱的长度和竖直高度怎样变化？', options: ['长度变长，高度不变', '长度不变，高度变小', '长度和高度都变大', '长度和高度都不变'], answer: 0, why: '大气压没变，它能托住的水银柱竖直高度就不变。管子斜了，同样的高度要占更长的一段管。' },
  { lesson: '7', q: '列车进站时，人要站在安全线以外。这是因为列车驶过时，人和车之间的空气怎样？', options: ['流速大，压强大', '流速大，压强小', '流速小，压强小', '流速小，压强大'], answer: 1, why: '列车带动身边的空气快速流动，流速大的地方压强小；人身后的空气压强大，会把人推向列车。' },
  { lesson: '4', q: '水库里水面下 20 m 深的地方，水的压强是多少（ρ水 = 1.0×10³ kg/m³，g 取 9.8 N/kg）？', options: ['1.96×10⁴ Pa', '9.8×10⁴ Pa', '1.96×10⁵ Pa', '2.0×10³ Pa'], answer: 2, why: 'p = ρgh = 1.0×10³ × 9.8 × 20 = 1.96×10⁵ Pa。' },
  { lesson: '2', q: '下面的做法中，哪一个是为了增大压强？', options: ['书包带做得宽一些', '铁轨铺在枕木上', '把刀刃磨得很薄', '坦克装上履带'], answer: 2, why: '刀刃磨薄，受力面积变小，压强变大。另外三个都是增大受力面积、减小压强。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:pressure:q'
const TARGET = new THREE.Vector3(-70, -42, -20), SPAN: [number, number] = [520, 210], VIEW: [number, number] = [0.1, 0.16], FOG: [number, number] = [900, 5000]

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
    <LabShell title="压强" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<LabStage labels={[]} target={TARGET} span={SPAN} view={VIEW} fog={FOG}>{null}</LabStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。压强这一章你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
