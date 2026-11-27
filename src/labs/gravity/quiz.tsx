// 万有引力与航天 · 随堂检测：九道选择题，每题对应前面的一课。答完立刻看对错和讲解。背景是发射场全景。
import { useState } from 'react'
import * as THREE from 'three'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'
import { LabStage } from '@/lab-kit'
import { PAD_Y, Rocket } from './site'
import { LESSONS, goLesson } from './lessons'
import { GROUND } from './views'
import { ST, type Want } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

interface Q { lesson: string; q: string; options: string[]; answer: number; why: string }
const QS: Q[] = [
  { lesson: '1', q: '行星绕太阳沿椭圆轨道运动，它在近日点的速度和在远日点比怎样？', options: ['近日点大', '远日点大', '一样大', '无法判断'], answer: 0, why: '开普勒第二定律：相等时间扫过的面积相等。近日点离太阳近，要扫出同样的面积就得走得快。' },
  { lesson: '2', q: '一颗行星绕太阳的轨道半长轴是地球的 4 倍，它的公转周期约是多少年？', options: ['4 年', '8 年', '16 年', '64 年'], answer: 1, why: 'a³/T² 相同：a 变成 4 倍，a³ 变成 64 倍，T² 也要 64 倍，T 是 8 倍，即 8 年。' },
  { lesson: '3', q: '卡文迪什扭秤实验中，用小镜子反射光线，主要是为了什么？', options: ['照亮小球', '把很小的扭转角放大，便于测量', '减小空气阻力', '平衡大球的引力'], answer: 1, why: '引力很小，石英丝只扭过很小的角度。镜子转 θ，反射光转 2θ，落到远处的尺上就成了明显的移动。这是放大的思想。' },
  { lesson: '4', q: '已知月球绕地球的轨道半径 r 和周期 T，再知道 G，可以求出哪个物理量？', options: ['月球的质量', '地球的质量', '月球的密度', '太阳的质量'], answer: 1, why: 'GMm/r² = m(2π/T)²r 中，月球的质量 m 约掉了，能求出的是中心天体地球的质量 M = 4π²r³/(GT²)。' },
  { lesson: '5', q: '关于第一宇宙速度 7.9 km/s，下列说法正确的是？', options: ['是卫星绕地球运行的最小速度', '是发射卫星的最小速度，也是卫星绕地球的最大环绕速度', '达到它卫星就会飞离地球', '是飞出太阳系需要的速度'], answer: 1, why: '贴着地面绕地球需要 7.9 km/s。轨道越高环绕速度越小，所以它是最大环绕速度；比它小就会落回地面，所以它是最小发射速度。' },
  { lesson: '6', q: '两颗卫星绕地球做匀速圆周运动，轨道高的那颗：', options: ['线速度大，周期大', '线速度小，周期小', '线速度小，周期大', '线速度大，周期小'], answer: 2, why: 'v = √(GM/r)，T = 2π√(r³/GM)：r 越大，v 越小，T 越大——高轨低速长周期。' },
  { lesson: '6', q: '地球同步卫星能不能定点在北京的正上方？', options: ['能，只要高度合适', '不能，同步卫星只能在赤道上空', '能，只要周期是 24 小时', '不能，北京上空引力太小'], answer: 1, why: '卫星的轨道平面必须过地心。要和地面相对静止，轨道只能在赤道平面内，所以同步卫星都在赤道上空约 3.6 × 10⁴ km 处。' },
  { lesson: '7', q: '卫星从近地圆轨道变到更高的圆轨道，应该怎么做？', options: ['在近地点减速', '在近地点加速，到远地点再加速', '一直减速', '在远地点减速'], answer: 1, why: '近地点加速进入椭圆转移轨道，沿椭圆上升时速度变小，到远地点再加速才能在高圆轨道上运行。到了高轨道，速度反而比原来小。' },
  { lesson: '5', q: '物体在地面附近的发射速度达到 11.2 km/s，会怎样？', options: ['绕地球做椭圆运动', '落回地面', '挣脱地球引力，绕太阳运动', '飞出太阳系'], answer: 2, why: '11.2 km/s 是第二宇宙速度：达到它就挣脱地球的引力，成为绕太阳运动的天体。要飞出太阳系，需要 16.7 km/s。' },
]
const TASKS: Task[] = [{ id: 'all', text: '做完九道题', note: '全部答过了' }, { id: 'pass', text: '答对七道以上', note: '掌握得不错' }]
const KEY = 'gewu:gravity:q'
/** 背景：发射场全景，火箭立在塔架旁，后面是海和天空 */
const VIEW: [number, number] = [0.42, 0.1]
const TARGET = ST.site.clone().add(new THREE.Vector3(-6, 40, -10))
const SPAN: [number, number] = [150, 95]

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
    <LabShell narration={voiced(NARRATION['q'], VOICE)} autoStep={() => { if (mine === null) choose(q.answer); else if (i < QS.length - 1) setI(i + 1); return true }} title="万有引力与航天" lessons={LESSONS} current="q" onLesson={goLesson} onReset={resetAll} hint={hint} actionsLabel={`第 ${i + 1} / ${QS.length} 题`}
      stage={<LabStage<Want> labels={[]} target={TARGET} span={SPAN} view={VIEW} {...GROUND} world={{}}>
        <group position={[ST.site.x, PAD_Y, ST.site.z]}><Rocket /></group>
      </LabStage>}
      lesson={<LessonBlock no="随堂检测" title="随堂检测" concept="九道题，看看都弄懂了没有" tasks={TASKS} done={done}
        theory={<p>每道题对应前面的一课。答错的题，回到那一课把任务再做一遍，比看答案更管用。题目可以反复做，点右上角“重做本课”清空。</p>} />}
      finale={finale && (
        <Glass className="px-6 py-5">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">九道题都答完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">答对 {right} / {QS.length}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/75">{right === QS.length ? '全对。万有引力与航天你已经弄懂了。' : right >= 7 ? '掌握得不错。答错的题回到对应那一课再看看。' : '有几处还不稳。把答错的题对应的那一课再做一遍。'}</p>
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
