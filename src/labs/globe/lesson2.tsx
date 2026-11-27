// 地球和经纬网 · 第 2 课 地球仪（地球的大小；地球仪是缩小的地球模型；地轴、两极、自西向东转）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { D_EARTH, GLOBE_D, AXIS_TO_GROUND, R_EARTH, equatorLength, globeScale, wan } from './physics'
import { GR, faceLon, globeToWorld, onSphere } from './globe'
import { LESSONS, goLesson } from './lessons'
import { GLOBE_VIEWS, INDOOR } from './views'
import { ST, type Want } from './world'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'spin', text: '让地球仪自西向东转一圈', note: '地球仪绕着地轴转；地轴的两头是北极和南极' },
  { id: 'size', text: '量一量地球仪的直径，算出比例', note: '直径 1.27 m，把地球缩小了约一千万倍' },
  { id: 'tilt', text: '量一量地轴的倾斜', note: '地轴和地面的夹角是 66.5°' },
]
const START = faceLon(110)

export default function Lesson2() {
  const [goal, setGoal] = useState(START)
  const [cal, setCal] = useState(0)
  const [axis, setAxis] = useState(false)
  const T = useTasks('gewu:globe:2', TASKS)
  const spin = useSlide(goal, 80), spinning = Math.abs(spin - goal) > 0.01
  const k = useSlide(cal, 0.6), measuring = Math.abs(k - cal) > 0.001
  useEffect(() => { if (!spinning && goal >= START + 359) T.check(id => id === 'spin') }, [spinning])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (cal === 1 && k >= 0.999) T.check(id => id === 'size') }, [k])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!axis) return; const t = setTimeout(() => T.check(id => id === 'tilt'), 900); return () => clearTimeout(t) }, [axis])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setGoal(START); setCal(0); setAxis(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'spin' | 'cal' | 'axis' | null } = (() => {
    if (!task) return { hint: '都做完了。抓住地球仪拨一拨，找找中国在哪。', next: null }
    if (spinning) return { hint: '盯住北极：地球仪绕着地轴转', next: null }
    if (measuring) return { hint: '卡尺正在合拢…', next: null }
    if (task.id === 'spin') return { hint: '先让地球仪转一圈', next: 'spin' }
    if (task.id === 'size') return { hint: '用卡尺量一量地球仪的直径', next: 'cal' }
    return { hint: '量一量地轴和地面的夹角', next: 'axis' }
  })()

  const at = ST.globe, P = (p: [number, number, number]) => globeToWorld(at, p, 0)
  const labels: Label[] = [
    { id: 'n', at: P([0, GR + 0.07, 0]), ax: 0, className: 'scene-tag -translate-y-1/2', children: '北极' },
    { id: 's', at: P([0, -GR - 0.07, 0]), ax: 0, className: 'scene-tag -translate-y-1/2', children: '南极' },
    { id: 'eq', at: globeToWorld(at, onSphere(0, -90 - spin, GR), spin), ax: 0, className: 'scene-name -translate-y-full', name: true, children: '赤道' },
    { id: 'ring', at: [at.x - GR - 0.06, at.y + 1.42 + 0.12, at.z], ax: 1, className: 'scene-name -translate-y-1/2', name: true, children: '子午圈' },
    { id: 'stand', at: [at.x + 0.3, at.y + 0.35, at.z + 0.3], ax: 0, className: 'scene-name -translate-y-1/2', name: true, children: '支架' },
    { id: 'ang', at: [at.x + GR + 0.25, at.y + 1.42 + 0.2, at.z], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: axis ? 1 : 0 }, children: <><small>地轴与地面</small>{AXIS_TO_GROUND}°</> },
    { id: 'd', at: [at.x, at.y + 1.42 - GR - 0.2, at.z + 0.05], ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: k > 0.99 ? 1 : 0 }, children: <><small>直径</small>{GLOBE_D.toFixed(2)} m</> },
  ]
  const V = GLOBE_VIEWS.whole
  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title="地球和经纬网" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球仪（也可以抓住球面直接拨）"
      stage={<LabStage<Want> labels={labels} {...V} {...INDOOR} world={{ globe: { spin, caliper: k, axis, onSpin: d => setGoal(g => g + d) } }}>{null}</LabStage>}
      lesson={<LessonBlock no="2" title="地球仪" concept="地球仪是缩小的地球模型" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>地球是一个两极稍扁、赤道略鼓的不规则球体，平均半径 {R_EARTH} 千米，赤道周长约 4 万千米。</p>
          <p className="mt-2">人们按照地球的形状，把它缩小，做成地球仪。地球仪绕着一根轴转，这根轴叫<b className="text-white">地轴</b>；地轴和地球表面相交的两点，是<b className="text-white">北极</b>和<b className="text-white">南极</b>。</p>
          <p className="mt-2">地球仪的地轴是斜着装的，和地面成 66.5° 的夹角。从北极上空看，地球仪逆时针转，也就是自西向东。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三件事都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">地球仪把地球缩小了约一千万倍</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">地轴穿过南北两极，斜着和地面成 66.5°；地球仪绕地轴自西向东转。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再转一转</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">地球仪的比例</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{k > 0.99 ? `1 : ${Math.round(globeScale() / 1e4)} 万` : '—'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="R" value={`${R_EARTH} km`} unit="地球平均半径" />
            <ParamTile symbol="赤道" value={`${wan(equatorLength())} 万 km`} unit="赤道周长约 4 万 km" />
            <ParamTile symbol="D" value={k > 0.99 ? `${GLOBE_D.toFixed(2)} m` : '—'} unit="地球仪直径" />
            <ParamTile symbol="地轴" value={axis ? `${AXIS_TO_GROUND}°` : '—'} unit="和地面的夹角" />
          </div>
          {k > 0.99 && <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">{D_EARTH.toLocaleString('en-US')} km ÷ {GLOBE_D.toFixed(2)} m ≈ <b className="text-white">1000 万</b></p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'spin'} pulse={next === 'spin'} onClick={() => setGoal(g => g + 360)} disabled={spinning}>转一圈</LabButton>
        <LabButton pulse={next === 'cal'} onClick={() => setCal(c => (c ? 0 : 1))} disabled={measuring}>{cal ? '收起卡尺' : '量直径'}</LabButton>
        <LabButton pulse={next === 'axis'} onClick={() => setAxis(a => !a)}>{axis ? '收起夹角' : '量倾角'}</LabButton>
      </>}
      extras={null}
    />
  )
}
