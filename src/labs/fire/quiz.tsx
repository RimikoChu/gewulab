// 燃烧和灭火 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是整个消防训练基地。题目里的数都从计算核心取。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { IGNITE, SIGNS } from './physics'
import { M, YARD, Place } from './world'
import { BurnBox, ExtRack, Extinguisher, FileCabinet, GasCylinder, OilPan, SteelTable, SteelTray, Stove, TABLE_H, Wok, WoodCrib } from './yardgear'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '把下面几样东西分别放到酒精灯火焰上加热，能燃烧的是哪一个？', options: ['小石块', '蘸水的棉球', '蘸酒精的棉球', '玻璃片'], answer: 2, why: '酒精是可燃物，蘸酒精的棉球一碰到火就燃烧。石块、玻璃、水都不是可燃物。' },
  { lesson: '2', q: '用烧杯罩住燃着的蜡烛，过一会儿蜡烛熄灭了。主要原因是什么？', options: ['烧杯把蜡烛压灭了', '罩里的氧气不足了', '蜡烛的着火点升高了', '罩里的温度太高了'], answer: 1, why: '罩上烧杯，外面的空气进不来，罩里的氧气越来越少，燃烧就停止了。燃烧需要氧气。' },
  { lesson: '3', q: `铜片实验里，80 °C 的热水上，铜片上的白磷燃烧而红磷不燃烧。这说明什么？`, options: ['燃烧需要可燃物', '燃烧需要氧气', '燃烧需要温度达到着火点', '红磷不是可燃物'], answer: 2, why: `两样东西都有氧气。白磷的着火点 ${IGNITE.whiteP} °C，热水能让它达到；红磷的着火点 ${IGNITE.redP} °C，达不到。红磷也是可燃物。` },
  { lesson: '3', q: '同一个实验里，铜片上的白磷燃烧，热水里的白磷不燃烧。这组对比说明什么？', options: ['燃烧需要氧气', '燃烧需要温度达到着火点', '水能降低白磷的着火点', '白磷在水里不是可燃物'], answer: 0, why: '两块白磷温度一样，都达到了着火点；水里的那块被水隔开、接触不到氧气，所以不燃烧。通入氧气后它就燃烧了。' },
  { lesson: '4', q: '下面关于燃烧条件的说法，正确的是哪一项？', options: ['只要温度达到着火点，物质就能燃烧', '可燃物只要和氧气接触就能燃烧', '可燃物、氧气、温度达到着火点，三个条件要同时具备', '着火点越高的物质越容易燃烧'], answer: 2, why: '三个条件缺一不可。木柴放在空气里不点火，温度达不到着火点，就不会燃烧。' },
  { lesson: '5', q: '炒菜时油锅着火了，正确的做法是什么？', options: ['马上浇水', '盖上锅盖', '用嘴吹灭', '把油锅端到外面'], answer: 1, why: '盖上锅盖，隔绝了空气，火就灭了。油锅着火不能浇水：水变成水蒸气，会把着火的油溅出来。' },
  { lesson: '6', q: '图书馆里的图书档案着火，最好用哪种灭火器？', options: ['水基型灭火器', '干粉灭火器', '二氧化碳灭火器', '用水桶浇水'], answer: 2, why: '二氧化碳灭火器喷出的二氧化碳很快变成气体散开，不留痕迹，不会把图书档案弄坏。' },
  { lesson: '7', q: '面粉厂的车间里，面粉的粉尘遇到明火可能发生爆炸。主要原因是什么？', options: ['面粉的着火点很低', '粉尘和空气的接触面积很大，燃烧非常剧烈', '面粉里含有炸药', '车间里的氧气特别多'], answer: 1, why: '面粉散成粉尘，和空气的接触面积变得很大，遇到明火在很短的时间里全部燃烧，放出大量的热，气体急剧膨胀，引起爆炸。' },
  { lesson: '7', q: '加油站最应该张贴下面哪一个标志？', options: [SIGNS.fire.name, '注意安全', '禁止停车', '当心滑倒'], answer: 0, why: '汽油容易挥发，空气里混有汽油蒸气，遇到明火可能爆炸。加油站要严禁烟火。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:fire:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="燃烧和灭火" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} narration={voiced(NARRATION['q'], VOICE)} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]}>
        {/* 训练场上各课用过的器材都摆在原处，全景里看得见 */}
        <group position={[YARD.box.x, 0, YARD.box.z]}><BurnBox door={0} damper={0} /></group>
        {[YARD.gas, YARD.oil].map((p, i) => <group key={i} position={[p.x, TABLE_H * M, p.z]}><SteelTable w={1.1} d={0.65} /><Stove />{i === 1 && <group position-y={0.06 * M}><Wok /></group>}</group>)}
        <group position={[YARD.gas.x + 0.95 * M, 0, YARD.gas.z - 0.15 * M]}><GasCylinder open={1} /></group>
        {[YARD.wood5, YARD.wood6].map((p, i) => <group key={i} position={[p.x, 0, p.z]}><SteelTray w={1} d={1} /><group position-y={0.02 * M}><WoodCrib n={5} len={0.7} sec={0.08} /></group></group>)}
        <group position={[YARD.rack.x, 0, YARD.rack.z - 0.05 * M]}><ExtRack w={1.5} /></group>
        {(['water', 'powder', 'co2'] as const).map((e, i) => <group key={e} position={[YARD.rack.x + (i - 1) * 0.45 * M, 0.04 * M, YARD.rack.z]}><Extinguisher e={e} /></group>)}
        <group position={[YARD.oil6.x, 0, YARD.oil6.z]}><OilPan dia={1.2} /></group>
        <group position={[YARD.file.x, 0, YARD.file.z]} rotation-y={-0.5}><FileCabinet /></group>
      </Place>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。拓展课的内容不考。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。燃烧的条件和灭火的原理你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
