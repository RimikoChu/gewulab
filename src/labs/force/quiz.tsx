// 力和运动 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是铁架台上挂着钩码的测力计。题目里的数都从计算核心取。
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { Hooks, Place, Plumb, SCALE_RING, STAND, SpringScale, Stand } from './gear'
import { LESSONS, goLesson } from './lessons'
import { G, SCALE, friction, hooks, pull, weight } from './physics'
import { BENCH_Z, ST, TOP, U } from './world'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const F7 = friction('base').toFixed(2), DX = 7.5, M4 = 2
const QS: Q[] = [
  { lesson: '1', q: '下面哪个现象，主要说明力可以改变物体的运动状态？', options: ['用手把橡皮泥捏扁', '运动员把静止的冰壶推出去', '跳板被运动员压弯', '弹簧被拉长'], answer: 1, why: '冰壶由静止变为运动，运动状态改变了。另外三个都是物体的形状发生了改变。' },
  { lesson: '1', q: '用同样大小、同样方向的力推冰壶的正中和推它的边上，冰壶的运动不一样。这说明力的作用效果跟什么有关？', options: ['力的大小', '力的方向', '力的作用点', '冰壶的质量'], answer: 2, why: '大小和方向都没变，变的只是作用点。力的大小、方向、作用点都影响力的作用效果，叫力的三要素。' },
  { lesson: '2', q: `一只弹簧测力计，量程 ${SCALE.max} N，在弹性限度内每受 1 N 的拉力弹簧伸长 ${SCALE.cmPerN} cm。弹簧伸长 ${DX} cm 时，拉力是多少？`, options: [`${DX} N`, `${DX / SCALE.cmPerN} N`, `${DX * SCALE.cmPerN} N`, `${SCALE.max} N`], answer: 1, why: `在弹性限度内，弹簧的伸长与拉力成正比：${DX} cm ÷ ${SCALE.cmPerN} cm/N = ${DX / SCALE.cmPerN} N，没有超过量程。` },
  { lesson: '3', q: `质量是 ${M4} kg 的物体，受到的重力是多少？（g 取 ${G} N/kg）`, options: [`${M4} N`, `${G} N`, `${weight(M4)} N`, `${weight(M4) * 10} N`], answer: 2, why: `G = mg = ${M4} kg × ${G} N/kg = ${weight(M4)} N。挂 ${hooks(4).m} kg 的钩码时，测力计的示数是 ${hooks(4).G.toFixed(2)} N，也是这样算出来的。` },
  { lesson: '3', q: '建筑工人用重垂线检查墙砌得直不直，利用的是什么？', options: ['重力的方向总是垂直于地面向下', '重力的方向总是竖直向下', '重力的大小跟质量成正比', '重心总在物体的中心'], answer: 1, why: '重力的方向总是竖直向下。“垂直向下”是垂直于某个面，地面要是斜的就不对了：把铁架台垫斜，重垂线并不跟着斜。' },
  { lesson: '4', q: '运动的小车冲上水平面。假如水平面绝对光滑，小车不受阻力，它将怎样运动？', options: ['慢慢停下来', '立刻停下来', '越来越快', '一直做匀速直线运动'], answer: 3, why: '阻力越小，速度减小得越慢；没有阻力，速度就不会减小。物体的运动不需要力来维持，力是改变物体运动状态的原因。' },
  { lesson: '5', q: '关于惯性，下面哪种说法正确？', options: ['物体运动得越快，惯性越大', '静止的物体没有惯性', '惯性的大小只跟物体的质量有关', '急刹车时乘客向前倾，是因为受到了惯性'], answer: 2, why: '一切物体在任何时候都有惯性，它的大小只跟质量有关，跟运动得快慢无关。惯性是物体的性质，不是力，不能说“受到惯性”。' },
  { lesson: '6', q: '一只木块静止在水平桌面上。下面哪一对力是平衡力？', options: ['木块受到的重力和桌面对木块的支持力', '木块对桌面的压力和桌面对木块的支持力', '木块受到的重力和木块对桌面的压力', '木块对桌面的压力和桌子受到的重力'], answer: 0, why: `重力和支持力都作用在木块上，大小相等、方向相反、在同一直线上，是一对平衡力，就像小卡片两边各 ${pull(2).toFixed(2)} N 的拉力。压力和支持力作用在两个物体上，是一对相互作用的力。` },
  { lesson: '7', q: `用测力计拉着木块在水平木板上做匀速直线运动，示数是 ${F7} N。把拉力增大到 1 N，木块加速运动，这时它受到的滑动摩擦力是多少？`, options: ['1 N', `${F7} N`, '0 N', `比 ${F7} N 大，比 1 N 小`], answer: 1, why: `滑动摩擦力的大小只跟压力和接触面的粗糙程度有关。这两样都没变，摩擦力还是 ${F7} N；拉力比它大，所以木块加速。` },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:force:q'

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
    <LabShell autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="力和运动" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<Place at="q" labels={[]}>
        <group position={[ST.l3, TOP, BENCH_Z]}>
          <Stand />
          <group position={[STAND.hookX * U, STAND.hang * U - SCALE_RING, 0.1 * U]}><SpringScale force={hooks(2).G}><Hooks n={2} /></SpringScale></group>
          <group position={[STAND.plumbX * U, STAND.hang * U, 0]}><Plumb len={42} /></group>
        </group>
      </Place>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="w-[min(92vw,400px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[44px] leading-none font-bold tabular-nums">{right}<span className="text-[20px] font-medium text-white/55"> / {QS.length}</span></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。力和运动你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
