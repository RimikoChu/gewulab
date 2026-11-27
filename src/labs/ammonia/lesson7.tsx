// 合成氨工厂 · 第 7 课 分离氨和循环。镜头拉远看整个合成回路：合成气压缩机 → 合成塔 → 水冷器、氨冷器 → 氨分离器 → 循环压缩机 → 回到合成塔。
// 开车以后出塔气里氨只有约 15%；冷凝把氨变成液体分离出去，剩下的 N₂、H₂ 由循环压缩机送回去再反应，原料的利用率一圈圈升高。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow } from './flow'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { CV, LOOPX, LOOP_PIPES, TANK } from './plant'
import { LOOP, LOOP_GOAL, fmt1, loopPass, loopUse, loopsFor, nh3Out } from './physics'
import { COL, MiniChart, type ChartSpec } from './screen'
import { Place } from './world'

const TASKS: Task[] = [
  { id: 'run', text: '开车：原料气进合成塔', note: `出塔气里氨只占约 ${fmt1(nh3Out(LOOP.t, LOOP.p))}%：一次通过只转化约 ${(loopPass() * 100).toFixed(0)}%` },
  { id: 'sep', text: '冷凝，把氨分离出去', note: '氨变成液体流进分离器：生成物浓度减小，平衡正向移动' },
  { id: 'loop', text: '把未反应的气体送回合成塔', note: `循环 ${loopsFor(LOOP_GOAL)} 圈，原料的利用率超过 ${LOOP_GOAL * 100}%` },
]
const PASS = 1.1   // 每一圈画面上走多久（s）
const NL = loopsFor(LOOP_GOAL)
const pipe = (id: string) => LOOP_PIPES.find(p => p.id === id)!.pts

export default function Lesson7() {
  const T = useTasks('gewu:ammonia:7', TASKS)
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0)
  const start = useRun(3.2, () => T.check(id => id === 'run'))
  const sep = useRun(3.2, () => T.check(id => id === 'sep'))
  const loop = useRun(PASS * NL, () => T.check(id => id === 'loop'))
  const n = stage >= 3 ? Math.min(NL, Math.floor(loop.t / PASS)) : 0
  const resetAll = () => { setStage(0); start.snap(0); sep.snap(0); loop.snap(0); T.reset() }
  const busy = start.busy || sep.busy || loop.busy

  const a = loopPass(), use = stage >= 3 ? loopUse(a, Math.max(1, loop.busy ? n + 1 : NL)) : stage >= 1 ? a : 0
  const task = T.current?.id
  const next = !task || busy ? null : task === 'run' ? 'run' : task === 'sep' ? 'sep' : 'loop'
  const hint = !task ? '分离出氨、气体循环，原料几乎都能用上。'
    : start.busy ? '原料气经压缩机进合成塔…'
    : sep.busy ? '水冷器、氨冷器把出塔气冷下来，氨变成液体…'
    : loop.busy ? '循环压缩机把剩下的氮气和氢气送回合成塔…'
    : task === 'run' ? '开车：把原料气送进合成塔'
    : task === 'sep' ? '出塔气里大部分还是氮气和氢气。冷凝，把氨分离出去'
    : '把没反应的氮气和氢气送回合成塔'

  const paths = useMemo(() => ({ feed: [pipe('feed')], hot: [pipe('out'), pipe('wc'), pipe('ac')], gas: [pipe('gas')], back: [pipe('back')], liq: [pipe('liq')] }), [])
  const run = stage >= 1, cooled = stage >= 2, cycling = stage >= 3
  const xs = Array.from({ length: NL + 1 }, (_, i) => i)
  const spec: ChartSpec = {
    x: { max: NL, label: '循环圈数', ticks: [0, 3, 6, 9] },
    y: { max: 100, label: '原料利用率 / %', ticks: [0, 50, 100] },
    lines: [{ color: COL.nh3, xs: xs.slice(0, (cycling ? (loop.busy ? n + 1 : NL) : run ? 1 : 0) + 1), ys: xs.map(i => loopUse(a, i) * 100).slice(0, (cycling ? (loop.busy ? n + 1 : NL) : run ? 1 : 0) + 1) }],
    dots: [{ x: cycling ? (loop.busy ? n + 1 : NL) : run ? 1 : 0, y: use * 100, color: COL.nh3 }],
  }
  const labels: Label[] = [
    { id: 'c', at: [LOOPX.comp.x, 15.5, LOOPX.comp.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '合成气压缩机' },
    { id: 'cv', at: [CV.x, 22.4, CV.z], ax: 0.5, className: `scene-tag ${run && !cooled ? 'key' : ''} -translate-y-full`, children: <><small>合成塔 · 出塔氨含量</small>{fmt1(nh3Out(LOOP.t, LOOP.p))}%</> },
    { id: 'hx', at: [(LOOPX.wc.x + LOOPX.ac.x) / 2, 3.8, LOOPX.wc.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '水冷器 · 氨冷器' },
    { id: 's', at: [LOOPX.sep.x, 12.5, LOOPX.sep.z], ax: 0.5, className: `scene-tag ${cooled && !cycling ? 'key' : ''} -translate-y-full`, children: <><small>氨分离器</small>{cooled ? '液氨' : '—'}</> },
    { id: 'r', at: [LOOPX.rc.x, 3.5, LOOPX.rc.z], ax: 0.5, className: `scene-tag ${cycling ? 'key' : ''} -translate-y-full`, children: <><small>循环压缩机</small>{cycling ? `第 ${Math.min(NL, n + 1)} 圈` : '—'}</> },
    { id: 't', at: [TANK.x, TANK.h + 3, TANK.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '液氨储罐' },
  ]
  return (
    <LabShell title="合成氨工厂" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="合成回路"
      stage={<Place at="l7" labels={labels}>
        <Flow paths={paths.feed} density={0.45} speed={6} size={0.42} color={() => COL.n2} on={run ? 1 : 0} />
        <Flow paths={paths.hot} density={0.45} speed={6} size={0.42} color={u => (cooled && u > 0.6 ? '#9ad8ff' : COL.nh3)} on={run ? 1 : 0} />
        <Flow paths={paths.gas} density={0.45} speed={6} size={0.42} color={() => COL.n2} on={cooled ? 1 : 0} />
        <Flow paths={paths.liq} density={0.8} speed={4} size={0.26} color={() => '#9ad8ff'} on={cooled ? 1 : 0} />
        <Flow paths={paths.back} density={0.45} speed={8} size={0.4} color={() => COL.n2} on={cycling ? 1 : 0} />
      </Place>}
      lesson={<LessonBlock no="7" title="分离氨和循环" concept="分离出氨、气体循环，原料几乎都能用上" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>即使在适宜条件下，一次通过合成塔，平衡混合气里氨也只占一小部分，大部分 N₂ 和 H₂ 没有反应。</p>
          <p className="mt-3"><b className="text-white">及时分离氨</b>：出塔气经冷却，氨液化后从分离器里分出去。减小生成物的浓度，使平衡向生成氨的方向移动。</p>
          <p className="mt-3"><b className="text-white">循环利用</b>：分离出氨以后剩下的 N₂、H₂，由循环压缩机送回合成塔，和新补充的原料气一起再反应。这样原料的总利用率就很高。</p>
          <p className="mt-3">单程转化率由上一课 500 °C、20 MPa 的出塔氨含量算出；累计利用率按“每圈转化同样的比例、不计放空”估算，是示意。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">分离出氨、未反应的气体循环使用</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">一次通过只转化约 {(a * 100).toFixed(0)}%；把氨冷凝分离、剩下的 N₂ 和 H₂ 送回去，循环 {NL} 圈利用率就超过 {LOOP_GOAL * 100}%（示意）。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="text-[13px] text-white/60">原料累计利用率（示意）</div>
          <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{run ? (use * 100).toFixed(0) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">%</span></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ParamTile symbol="出塔" value={`${fmt1(nh3Out(LOOP.t, LOOP.p))}%`} unit={`氨含量 · ${LOOP.t} °C、${LOOP.p} MPa`} />
          <ParamTile symbol="单程" value={`${(a * 100).toFixed(0)}%`} unit="转化率" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">循环圈数和利用率</h2>
        <MiniChart spec={spec} height={140} />
      </Panel>}
      actions={<>
        <LabButton primary={next === 'run'} pulse={next === 'run'} disabled={busy || run} onClick={() => { setStage(1); start.run() }}>开车</LabButton>
        <LabButton primary={next === 'sep'} pulse={next === 'sep'} disabled={busy || !T.done.run || cooled} onClick={() => { setStage(2); sep.run() }}>冷凝分离氨</LabButton>
        <LabButton primary={next === 'loop'} pulse={next === 'loop'} disabled={busy || !T.done.sep || cycling} onClick={() => { setStage(3); loop.run() }}>循环未反应的气体</LabButton>
      </>}
      extras={null}
    />
  )
}
