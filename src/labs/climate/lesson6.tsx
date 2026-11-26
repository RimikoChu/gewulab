// 天气和气候 · 第 6 课 气温曲线和降水柱状图：站房东边的气候资料板。把山前气象站的逐月资料描成气温曲线、画成降水柱，
// 再从图上读出最热月、最冷月、年较差和雨季。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, Rows, nameTag } from './parts'
import { MONTHS, RAIN, TEMP, coldest, hottest, rainySeason, yearRange } from './physics'
import { P } from './station'
import { VOICE } from './voice'
import { NEAR, SPOT, type Want } from './world'

const H = hottest(), C = coldest(), [WA, WB] = rainySeason(), RANGE = yearRange()
const TASKS: Task[] = [
  { id: 'curve', text: '把 12 个月的气温描成曲线', note: '气温曲线夏季高、冬季低' },
  { id: 'bars', text: '把 12 个月的降水量画成柱', note: '降水柱夏季高、冬季矮' },
  { id: 'hotcold', text: '标出最热月和最冷月', note: `最热月 ${H.i + 1} 月 ${H.t} ℃，最冷月 ${C.i + 1} 月 ${C.t} ℃` },
  { id: 'range', text: '算出气温年较差', note: `年较差 = ${H.t} − (${C.t}) = ${RANGE} ℃` },
  { id: 'wet', text: '找出雨季', note: '' },
]
const STEP_NAME: Record<string, string> = { hotcold: '标出最热月和最冷月', range: '算年较差', wet: '找出雨季' }

export default function Lesson6() {
  const [drawT, setDrawT] = useState(false), [drawP, setDrawP] = useState(false), [step, setStep] = useState(0)
  const tN = useSlide(drawT ? 12 : 0, 2.4), pN = useSlide(drawP ? 12 : 0, 2.4)
  const T = useTasks('gewu:climate:6', TASKS)
  const busy = (drawT && tN < 12) || (drawP && pN < 12)
  const draw = (k: 'curve' | 'bars') => { if (busy) return; if (k === 'curve') setDrawT(true); else setDrawP(true) }
  // 画完的那一刻打勾
  useEffect(() => { if (drawT && tN >= 12) T.check(id => id === 'curve') }, [drawT, tN >= 12])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (drawP && pN >= 12) T.check(id => id === 'bars') }, [drawP, pN >= 12])   // eslint-disable-line react-hooks/exhaustive-deps
  const feature = () => { if (busy || !drawT || !drawP || step >= 3) return; const n = step + 1; setStep(n); T.check(id => id === ['hotcold', 'range', 'wet'][n - 1]) }
  const resetAll = () => { setDrawT(false); setDrawP(false); setStep(0); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'curve' | 'bars' | 'feat' | null } = (() => {
    if (!task) return { hint: '都做完了。一张图看出一个地方的气候。', next: null }
    if (busy) return { hint: drawT && tN < 12 ? '一个月一个点，把气温连成曲线…' : '一个月一根柱，画出降水量…', next: null }
    if (task.id === 'curve') return { hint: '把 12 个月的平均气温描成一条曲线', next: 'curve' }
    if (task.id === 'bars') return { hint: '把 12 个月的降水量画成柱', next: 'bars' }
    return { hint: `从图上读：${STEP_NAME[task.id]}`, next: 'feat' }
  })()

  const [x, , z] = P.chart
  const labels: Label[] = [nameTag('nb', [x, 3.75, z], '气候资料板')]
  const s = SPOT.chart
  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title="天气和气候" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="资料板"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...NEAR} sun={2.8}
        world={{ chart: { tN, pN, marks: { hot: step >= 1, cold: step >= 1, range: step >= 2, wet: step >= 3 } } }}>{null}</LabStage>}
      lesson={<LessonBlock no="6" title="气温曲线和降水柱状图" concept="一张图看出一个地方的气候" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>把一个地方各月的平均气温画成<b className="text-white">曲线</b>、各月降水量画成<b className="text-white">柱</b>，画在同一张图上：横轴是月份，左边纵轴是气温，右边纵轴是降水量。</p>
          <p className="mt-2">读图：曲线最高的一月是<b className="text-white">最热月</b>，最低的是<b className="text-white">最冷月</b>；两者之差是<b className="text-white">气温年较差</b>。降水柱明显高、降水集中的几个月是<b className="text-white">雨季</b>。</p>
          <p className="mt-2 text-[13.5px] text-white/65">山前气象站的资料是示意数据。</p>
        </>} />}
      finale={T.finale && <Fin kicker="图画好了，也读完了" big="一张图看出一个地方的气候" small={`最热月 ${H.i + 1} 月 ${H.t} ℃，最冷月 ${C.i + 1} 月 ${C.t} ℃，年较差 ${RANGE} ℃；雨季在 ${WA + 1}–${WB + 1} 月。夏季高温多雨，冬季寒冷干燥。`} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{step >= 3 ? '雨季' : step >= 2 ? '气温年较差' : '最热月 − 最冷月'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{step >= 3 ? `${WA + 1}–${WB + 1}` : step >= 2 ? RANGE : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">{step >= 3 ? '月' : '℃'}</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="最热月" value={step >= 1 ? `${H.i + 1} 月 ${H.t} ℃` : '—'} unit="曲线最高处" />
            <ParamTile symbol="最冷月" value={step >= 1 ? `${C.i + 1} 月 ${C.t} ℃` : '—'} unit="曲线最低处" />
          </div>
          {step >= 2 && <p className="mt-2 text-center font-formula text-[15px] text-white/80">年较差 = {H.t} − ({C.t}) = {RANGE} ℃</p>}
          <h2 className="mt-5 text-[12.5px] text-white/55">逐月资料（示意）</h2>
          <Rows head={['月', '气温 ℃', '降水 mm']} rows={MONTHS.map((m, i) => [`${m} 月`, String(TEMP[i]), String(RAIN[i])])} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'curve'} pulse={next === 'curve'} onClick={() => draw('curve')} disabled={busy || drawT}>描气温曲线</LabButton>
        <LabButton primary={next === 'bars'} pulse={next === 'bars'} onClick={() => draw('bars')} disabled={busy || drawP || !drawT}>画降水柱</LabButton>
        <LabButton primary={next === 'feat'} pulse={next === 'feat'} onClick={feature} disabled={busy || !drawT || !drawP || step >= 3}>{STEP_NAME[['hotcold', 'range', 'wet'][Math.min(2, step)]]}</LabButton>
      </>}
      extras={null}
    />
  )
}
