// 内能和热机 · 随堂检测：九道选择题，每题对应前面的一课，含易错题。答完立刻看对错和讲解。背景是比热容那一课的两只烧杯。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X as Cross } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import { BEAKER, Beaker, Clamp, Heater, Stand, Thermo, WATER } from './gear'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { C_WATER, HEAT, Q_PETROL, ROOM, depthIn, heatQ, sci } from './physics'
import { VOICE } from './voice'
import { BZ, LINE_Z, PLINTH, Room, SHOW_Z, ST, TOP } from './world'
import { Cutaway } from './cutaway'
import { Cut4 } from './cut4'
import { RoundedBox } from '@react-three/drei'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '同时往一杯冷水和一杯热水里各滴一滴红墨水，看到热水里的红墨水先散匀。这说明什么？', options: ['热水的密度小', '温度越高，分子的无规则运动越剧烈', '红墨水在热水里变多了', '冷水里的分子不运动'], answer: 1, why: '扩散是分子无规则运动的结果。温度越高，分子运动越剧烈，扩散越快。冷水里的分子也在运动，只是慢一些。' },
  { lesson: '1', q: '做气体扩散实验时，装二氧化氮的瓶子要放在下面。这样做是为了什么？', options: ['二氧化氮有毒，放下面安全', '排除重力对实验的影响：二氧化氮密度比空气大，跑到上面去只能是分子运动的结果', '让颜色看得更清楚', '没有什么讲究，放上面也一样'], answer: 1, why: '二氧化氮的密度比空气大。如果把它放在上面，它往下跑可能是重力造成的，就说明不了分子在运动。' },
  { lesson: '2', q: '两块铅柱的断面刮干净、紧压在一起后，下面能吊起钩码。这主要说明什么？', options: ['大气压把它们压在一起', '分子之间存在引力', '分子之间存在斥力', '铅有磁性'], answer: 1, why: '断面紧压后，两边的分子靠得很近，分子之间的引力使两块铅柱结合在一起。这是分子引力，不是大气压的作用。' },
  { lesson: '3', q: '关于温度、热量和内能，下面说法正确的是哪一个？', options: ['温度高的物体含有的热量多', '物体吸收热量，温度一定升高', '同一物体温度升高，内能增大', '0 ℃ 的冰没有内能'], answer: 2, why: '热量是热传递过程中传递的能量，不能说“含有”。物体吸热温度不一定升高（比如水沸腾时）。一切物体都有内能，同一物体温度越高，内能越大。' },
  { lesson: '4', q: `用两个相同的电加热器给质量相同的水和食用油同时加热 ${HEAT.first} 分钟，食用油升温多。下面说法正确的是哪一个？`, options: ['食用油吸收的热量多', '水吸收的热量多', '两者吸收的热量相同，水的比热容大', '两者吸收的热量相同，食用油的比热容大'], answer: 2, why: '加热器相同、时间相同，吸收的热量就相同。质量相同、吸热相同时，升温少的比热容大，所以水的比热容大。' },
  { lesson: '5', q: `5 kg 的水，温度升高了 20 ℃，吸收的热量是多少？（c水 = 4.2×10³ J/(kg·℃)）`, options: [`${sci(heatQ(C_WATER, 5, 20))} J`, `${sci(heatQ(C_WATER, 5, 20 + ROOM))} J`, `${sci(heatQ(C_WATER, 1, 20))} J`, `${sci(heatQ(C_WATER, 5, 20) / 10)} J`], answer: 0, why: `“升高了 20 ℃”就是 Δt = 20 ℃。Q吸 = c m Δt = 4.2×10³ × 5 × 20 = ${sci(heatQ(C_WATER, 5, 20))} J。不要把“升高了”当成“升高到”。` },
  { lesson: '6', q: '汽油机的四个冲程中，把内能转化为机械能的是哪一个？', options: ['吸气冲程', '压缩冲程', '做功冲程', '排气冲程'], answer: 2, why: '做功冲程中，燃气推动活塞向下运动，内能转化为机械能。压缩冲程正好相反，是机械能转化为内能。' },
  { lesson: '6', q: '四冲程汽油机完成一个工作循环，曲轴转几周、对外做功几次？', options: ['一周，一次', '两周，一次', '两周，两次', '四周，一次'], answer: 1, why: '一个工作循环有四个冲程，活塞往复两次，曲轴转两周，只有做功冲程对外做功一次。' },
  { lesson: '7', q: `一箱汽油用掉一半以后，剩下的汽油的热值怎样变化？（汽油的热值 ${sci(Q_PETROL, 1)} J/kg）`, options: ['变为原来的一半', '不变', '变为原来的两倍', '无法确定'], answer: 1, why: '热值是燃料本身的一种特性，只和燃料的种类有关，和质量、是否完全燃烧无关。用掉一半，放出的热量变少了，但热值不变。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:heat:q'
const X = ST.s4, Z = BZ + 0.15, WX = X - 0.7, OX = X + 0.75

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="内能和热机" lessons={LESSONS} current="q" narration={voiced(NARRATION['q'], VOICE)} onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Room at="all" labels={[]} fog={[260, 900]} bayA={{ run: 1, hot: 0.6 }} bayB={{ run: 1, hot: 0.6 }}>
        {/* 总览：实验台上的器材、培训区的剖开汽油机、总装线线头的四缸机 */}
        {([[WX, WATER, 'water'], [OX, '#d9a521', 'oil']] as [number, string, 'water' | 'oil'][]).map(([x, col, s]) => <group key={x}>
          <Beaker at={[x, TOP, Z]} level={depthIn(s, 0.0338) * 10} color={col} o={s === 'oil' ? 0.62 : 0.5}><Heater at={[0.05, 0, 0]} /></Beaker>
          <Thermo at={[x - 0.17, TOP + BEAKER.floor + 0.1, Z - 0.05]} T={ROOM} />
          <Stand at={[x - 0.3, TOP, Z - 0.75]} h={3.4} w={1.0}><Clamp y={2.9} cx={0.13} grip={0.035} cz={0.7} /></Stand>
        </group>)}
        <RoundedBox args={[4.4, PLINTH, 3.2]} radius={0.08} smoothness={3} position={[ST.s6, PLINTH / 2, SHOW_Z - 0.4]} castShadow receiveShadow><meshPhysicalMaterial color="#2d3237" roughness={0.5} clearcoat={0.4} /></RoundedBox>
        <Cutaway at={[ST.s6, PLINTH + 1.62, SHOW_Z]} angle={430} />
        <RoundedBox args={[7.2, PLINTH, 3.0]} radius={0.06} smoothness={2} position={[ST.sx, PLINTH / 2, LINE_Z + 3.6]} castShadow receiveShadow><meshPhysicalMaterial color="#2d3237" roughness={0.5} clearcoat={0.4} /></RoundedBox>
        <Cut4 at={[ST.sx, PLINTH + 1.62, LINE_Z + 4]} angle={430} diesel={false} />
      </Room>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。内能和热机你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
                  <span className={cn('grid size-6 flex-none place-items-center rounded-full text-[13px] font-semibold', isRight ? 'bg-[#35c7b3] text-[#06231f]' : isWrong ? 'bg-[#ff6b6b] text-white' : 'bg-white/12')}>{isRight ? <Check className="size-3.5" strokeWidth={3.5} /> : isWrong ? <Cross className="size-3.5" strokeWidth={3.5} /> : 'ABCD'[k]}</span>{o}
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
