// 呼吸 · 第 4 课 呼吸运动：膈。拉下、松开钟罩模型底部的橡皮膜，看两个气球鼓起、变瘪；再对照旁边的胸腔模型，
// 橡皮膜和膈同步动，认出钟罩、Y 形管、气球、橡皮膜各代表什么，看膈肌收缩时膈顶往哪里动。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { LOOK, Place, useRun } from './parts'
import { JAR, balloonsGain, diaDrop, jarExtra } from './physics'
import { JAR_AT, JAR_LIFT, at } from './world'
import type { V3 } from './sdf'

const TASKS: Task[] = [
  { id: 'pull', text: '拉下橡皮膜，看气球怎样', note: '橡皮膜往下，钟罩里的空间变大，气球鼓起来' },
  { id: 'release', text: '松开橡皮膜，看气球怎样', note: '橡皮膜回去，钟罩里的空间变小，气球变瘪' },
  { id: 'map', text: '对照人体，再拉下一次', note: '钟罩是胸廓，Y 形管是气管和支气管，气球是肺，橡皮膜是膈' },
  { id: 'dome', text: '松开，看膈顶往哪里动', note: '膈肌收缩时膈顶下降，舒张时膈顶回升' },
]
/** 钟罩模型上的一点（cm，相对罩下口中心）在展厅里的位置 */
const J = (p: V3): V3 => at(JAR_AT, [p[0] * 0.1, (JAR_LIFT + p[1]) * 0.1, (p[2] - 1) * 0.1])

export default function Lesson4() {
  const [pair, setPair] = useState(false)
  const T = useTasks('gewu:breath:4', TASKS)
  const dir = useRef(1), pairRef = useRef(false); pairRef.current = pair
  const run = useRun(1.8, () => {
    if (dir.current > 0) T.check(id => id === 'pull' || (id === 'map' && pairRef.current))
    else T.check(id => id === 'release' || (id === 'dome' && pairRef.current && !!T.done.map))
  })
  const k = run.k, down = k > 0.999, up = k < 0.001
  const pull = () => { dir.current = 1; run.run(1) }
  const release = () => { dir.current = -1; run.run(0) }
  const resetAll = () => { run.snap(0); setPair(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'pull' | 'release' | 'pair' | null } = !task ? { hint: '膈肌收缩，膈顶下降，胸廓上下径变大，肺扩张；膈肌舒张，膈顶回升，肺回缩。', next: null }
    : run.busy ? { hint: dir.current > 0 ? '往下拉橡皮膜…' : '橡皮膜弹回去…', next: null }
    : task.id === 'pull' ? { hint: '钟罩底部扎着一张橡皮膜。按“拉下橡皮膜”', next: 'pull' }
    : task.id === 'release' ? { hint: '按“松开橡皮膜”', next: 'release' }
    : task.id === 'map' ? (!pair ? { hint: '对面就是胸腔模型。按“对照人体”', next: 'pair' } : up ? { hint: '两边一起看，再按“拉下橡皮膜”', next: 'pull' } : { hint: '按“松开橡皮膜”', next: 'release' })
    : down ? { hint: '看胸腔模型的膈顶，按“松开橡皮膜”', next: 'release' } : { hint: '按“拉下橡皮膜”', next: 'pull' }
  const extra = jarExtra(k), gain = balloonsGain(k)
  const labels: Label[] = [
    { id: 'jar', at: J([-7.6, 13, 0]), ax: 1, className: 'scene-tag -translate-y-1/2', children: pair ? <><small>钟罩</small>胸廓</> : '钟罩' },
    { id: 'y', at: J([1.0, 21.5, 0]), ax: 0, className: 'scene-tag -translate-y-1/2', children: pair ? <><small>Y 形管</small>气管、支气管</> : 'Y 形管' },
    { id: 'bal', at: J([7.6, 6.5, 0]), ax: 0, className: `scene-tag ${run.busy ? 'key' : ''} -translate-y-1/2`, children: pair ? <><small>气球</small>肺</> : '气球' },
    { id: 'mem', at: J([7.6, -1.2 - 3 * k, 0]), ax: 0, className: 'scene-tag -translate-y-1/2', children: pair ? <><small>橡皮膜</small>膈</> : '橡皮膜' },
    ...(pair ? [
      { id: 'dia', at: [1.45, 12.15 - diaDrop(k) * 0.1, 0.5] as V3, ax: 0, className: `scene-tag ${run.busy ? 'key' : ''} -translate-y-1/2`, children: <><small>膈</small>{k > 0.5 ? '收缩，膈顶下降' : '舒张'}</> },
      { id: 'lu', at: [-1.45, 13.8, 0.4] as V3, ax: 1, className: 'scene-name -translate-y-1/2', name: true, children: '肺' },
    ] : []),
  ]
  return (
    <LabShell title="呼吸" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="钟罩模型"
      stage={<Place at={pair ? 'pair' : 'jar'} labels={labels} want={{ jar: k, dia: pair ? k : 0, rib: 0, look: { ...LOOK, inter: 0.35, lungs: 0.8, hl: 'dia' } }}>
        {run.busy && <ForceArrow tip={J([0, dir.current > 0 ? -7.5 : -1.5, 3])} dir={[0, -dir.current, 0]} len={0.45} color="#ffe9a8" />}
        {pair && run.busy && <ForceArrow tip={[0.55, dir.current > 0 ? 11.85 : 12.45, 1.1]} dir={[0, -dir.current, 0]} len={0.4} color="#ffe9a8" />}
      </Place>}
      lesson={<LessonBlock no="4" title="呼吸运动：膈" concept="膈肌收缩，膈顶下降，胸廓上下变长" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">膈</b>是分隔胸腔和腹腔的一层肌肉，平时向上隆起，像一个穹顶。膈肌收缩时，膈顶部下降，胸廓的上下径增大；膈肌舒张时，膈顶部回升。</p>
          <p className="mt-3">钟罩模型里，玻璃钟罩代表胸廓，Y 形玻璃管代表气管和支气管，两个小气球代表肺，底部的橡皮膜代表膈。往下拉橡皮膜，钟罩里的空间变大，气球就鼓起来——这模拟的是吸气。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这个模型只模拟了膈的运动；真实的胸廓还会在肋间肌的作用下向前后左右扩大，钟罩是硬的，做不到这一点。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">橡皮膜和膈对上了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">膈肌收缩，膈顶下降，胸廓上下径变大，肺扩张</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">橡皮膜拉下 {JAR.pull} cm，钟罩里多出约 {Math.round(jarExtra(1))} mL 空间，两个气球也一共鼓起约这么多。</p>
          <p className="mt-2 text-[12.5px] text-white/50">胸腔模型里膈的动作放大了。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">钟罩里多出来的空间</div>
            <div className="mt-1 text-[44px] leading-none font-bold tabular-nums">{Math.round(extra)}<span className="ml-1 text-[15px] font-medium text-white/55">mL</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="h" value={(JAR.pull * k).toFixed(1)} unit="cm · 橡皮膜拉下" />
            <ParamTile symbol="r" value={String(JAR.r)} unit="cm · 钟罩内半径" />
          </div>
          <div className="mt-3 rounded-xl bg-white/8 px-3 py-2.5 text-[14px]">两个气球一共鼓起 <b className="tabular-nums">{Math.round(gain)}</b> mL</div>
          <p className="mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/70">空间一变大，罩里的气压就比外界低，外面的空气顺着 Y 形管进到气球里，直到里外气压相等。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'pull'} pulse={next === 'pull'} onClick={pull} disabled={run.busy || down}>拉下橡皮膜</LabButton>
        <LabButton primary={next === 'release'} pulse={next === 'release'} onClick={release} disabled={run.busy || up}>松开橡皮膜</LabButton>
        <LabButton primary={next === 'pair'} pulse={next === 'pair'} onClick={() => setPair(p => !p)} disabled={run.busy || !T.done.release}>{pair ? '只看钟罩' : '对照人体'}</LabButton>
      </>}
      extras={null}
    />
  )
}
