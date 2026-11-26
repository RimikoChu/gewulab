// 天气和气候 · 第 4 课 降水的测量：观测场南边的雨量器。下过雨的早上，取下承水器，拿出储水瓶，把水倒进专用量杯读毫米数；
// 量杯一次最多量 10 mm，雨大就分几杯倒。三个雨天各量一次，定出降水等级；最后把全年各月的降水量加起来。
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, Rows, nameTag, valTag } from './parts'
import { CUP_MAX, GRADES, MONTHS, RAIN, RAIN_DAYS, annual, bottleMl, cupsFor, rainGrade, type RainDay } from './physics'
import { GAUGE, P } from './station'
import { VOICE } from './voice'
import { NEAR, SPOT, type Want } from './world'

const DAYS = Object.keys(RAIN_DAYS) as RainDay[]
const TASKS: Task[] = [
  { id: 'd3', text: '量 7 月 3 日的雨', note: '6.4 mm，小雨' },
  { id: 'd9', text: '量 7 月 9 日的雨', note: '18.0 mm，中雨' },
  { id: 'd21', text: '量 7 月 21 日的雨', note: '一杯装不下，分 6 杯量：52.0 mm，暴雨' },
  { id: 'year', text: '把全年各月的降水量加起来', note: '' },
]
// 一次测量的过程（秒）：取下承水器、拿出储水瓶、倾斜、一杯杯倒、放回去
const A = 0.8, B = 1.6, C = 0.5, POUR = 1.4, EMPTY = 0.5, BACK = 1.6
function timeline(mm: number, t: number) {
  const cups = cupsFor(mm), n = cups.length, pourEnd = A + B + C + n * POUR + (n - 1) * EMPTY
  const lift = Math.min(1, t / A) - Math.max(0, Math.min(1, (t - pourEnd - BACK + A) / A))
  let bottle = Math.min(0.85, Math.max(0, (t - A) / B) * 0.85)
  if (t > A + B) bottle = 0.85 + 0.15 * Math.min(1, (t - A - B) / C)
  if (t > pourEnd) bottle = Math.max(0, 1 - (t - pourEnd) / (BACK - A * 0.2))
  let cup = 0, poured = 0, pour = false, done = 0
  const t1 = t - A - B - C
  if (t1 > 0) for (let i = 0; i < n; i++) {
    const s = i * (POUR + EMPTY), k = (t1 - s) / POUR
    if (k < 0) break
    if (k <= 1) { cup = cups[i] * k; pour = true; poured = done + cups[i] * k; break }
    done += cups[i]; poured = done
    cup = i < n - 1 && t1 - s - POUR < EMPTY ? cups[i] * (1 - (t1 - s - POUR) / EMPTY) : i === n - 1 ? cups[i] : 0
  }
  return { lift: Math.max(0, lift), bottle, water: Math.max(0, 1 - poured / mm), cup, pour, poured, cupNo: Math.min(n, Math.floor(Math.max(0, t1) / (POUR + EMPTY)) + 1), n, end: pourEnd + BACK, read: t >= pourEnd }
}

export default function Lesson4() {
  const [day, setDay] = useState<RainDay>('d3')
  const [t, setT] = useState(-1)                 // 正在量：过了几秒；-1 没在量
  const [got, setGot] = useState<RainDay[]>([])
  const [year, setYear] = useState(false)
  const T = useTasks('gewu:climate:4', TASKS)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const mm = RAIN_DAYS[day].mm, tl = timeline(mm, Math.max(0, t)), running = t >= 0 && t < tl.end
  const measure = () => {
    if (running || got.includes(day)) return
    const t0 = performance.now(), d = day, end = timeline(RAIN_DAYS[d].mm, 0).end
    let recorded = false
    const f = (now: number) => {
      const s = (now - t0) / 1000, cur = timeline(RAIN_DAYS[d].mm, s)
      setT(Math.min(s, end))
      if (cur.read && !recorded) { recorded = true; setGot(g => { const n = g.includes(d) ? g : [...g, d]; T.check(id => n.includes(id as RainDay)); return n }) }
      if (s < end) raf.current = requestAnimationFrame(f)
    }
    raf.current = requestAnimationFrame(f)
  }
  const pick = (d: RainDay) => { if (running) return; setDay(d); setT(-1) }
  const showYear = () => { if (got.length < 3) return; setYear(true); T.check(id => id === 'year') }
  const resetAll = () => { cancelAnimationFrame(raf.current); setDay('d3'); setT(-1); setGot([]); setYear(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'day' | 'go' | 'year' | null } = (() => {
    if (!task) return { hint: '都做完了。降水量是落到地面的水层有多深。', next: null }
    if (running) return { hint: tl.cupNo <= 1 ? '取下承水器，把储水瓶里的水倒进量杯…' : tl.n > 2 ? '量杯满了就倒掉，再倒下一杯…' : '一杯不够，再倒一杯…', next: null }
    if (task.id === 'year') return { hint: '三个雨天都量完了。把全年各月的降水量加起来', next: 'year' }
    if (day !== task.id) return { hint: `把日期换到“${RAIN_DAYS[task.id as RainDay].name}”`, next: 'day' }
    return { hint: '取出储水瓶，把水倒进量杯读数', next: 'go' }
  })()

  const [gx, , gz] = P.gauge, cx = gx + GAUGE.cupAt[0], cz = gz + GAUGE.cupAt[2]
  const shown = t >= 0 ? tl.poured : got.includes(day) ? mm : 0
  const labels: Label[] = [
    nameTag('ng', [gx - 0.16, 0.45, gz], '雨量器', 1),
    nameTag('nr', [gx - 0.13, GAUGE.rim + 0.03, gz], '承水口直径 20 cm，离地 70 cm', 1),
    nameTag('nc', [cx + 0.05, 0.66, cz], '专用量杯', 0),
    valTag('cup', [cx + 0.045, 0.76, cz], tl.n > 1 && t >= 0 ? `第 ${tl.cupNo} 杯` : '量杯', `${tl.cup.toFixed(1)} mm`, true, t >= 0 && tl.cup > 0.05),
  ]
  // 倒水的时候镜头推近量杯
  const s = t >= A + B * 0.6 && t < tl.end - 0.4 ? SPOT.cup : SPOT.gauge
  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} title="天气和气候" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="雨量器"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...NEAR} sun={2.4}
        world={{ wx: 'cloud', gauge: t >= 0 ? { lift: tl.lift, bottle: tl.bottle, water: tl.water, cup: tl.cup, pour: tl.pour } : { lift: 0, bottle: 0, water: got.includes(day) ? 0 : 1, cup: 0, pour: false } }}>{null}</LabStage>}
      lesson={<LessonBlock no="4" title="降水的测量" concept="降水量是落到地面的水层有多深" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>降水量用<b className="text-white">雨量器</b>测量。雨水落进承水器（漏斗），流到储水瓶里存着；观测时把瓶里的水倒进专用量杯，量杯上直接刻着毫米数。降水量的单位是毫米（mm），意思是这些水平铺在地面上有多深。</p>
          <p className="mt-2">24 小时降水量划分等级：</p>
          <p className="mt-1 text-[13.5px] text-white/75">{GRADES.slice(0, 4).map(([lim, n], i) => `${n} ${i ? `${GRADES[i - 1][0]}～` : '小于 '}${i ? (lim - 0.1).toFixed(1) : lim}`).join('；')} mm</p>
          <p className="mt-2">把一年各月的降水量加起来，就是<b className="text-white">年降水量</b>。</p>
          <p className="mt-2 text-[13.5px] text-white/65">这一年的数是示意数据。</p>
        </>} />}
      finale={T.finale && <Fin kicker="雨量都量完了" big="降水量是落到地面的水层有多深" small={`三天分别是 6.4 mm 小雨、18.0 mm 中雨、52.0 mm 暴雨；这里一年各月加起来，年降水量 ${annual()} mm，7、8 月最多。`} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{year ? '年降水量' : `${RAIN_DAYS[day].name} · 24 小时降水量`}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{year ? annual() : shown > 0 ? shown.toFixed(1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">mm</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="瓶里的水" value={`${bottleMl(mm)} mL`} unit="承水口面积 314 cm²" />
            <ParamTile symbol="等级" value={got.includes(day) ? rainGrade(mm) : '—'} unit={`量杯一次最多 ${CUP_MAX} mm`} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">测量记录</h2>
          {got.length ? <Rows head={['日期', '降水量', '等级']} rows={got.map(d => [RAIN_DAYS[d].name, `${RAIN_DAYS[d].mm.toFixed(1)} mm`, rainGrade(RAIN_DAYS[d].mm)])} /> : <p className="mt-2 text-[13.5px] text-white/50">还没有记录</p>}
          {year && <>
            <h2 className="mt-5 text-[12.5px] text-white/55">各月降水量（mm，示意）</h2>
            <svg viewBox="0 0 296 120" className="mt-2 w-full">
              {RAIN.map((r, i) => <g key={i}><rect x={8 + i * 24} y={100 - r / 2} width="16" height={r / 2} rx="2" fill="#4f9fe0" /><text x={16 + i * 24} y={114} fontSize="10" fill="rgb(255 255 255 / 0.5)" textAnchor="middle">{MONTHS[i]}</text></g>)}
            </svg>
            <p className="text-center font-formula text-[14px] text-white/80">{RAIN.join(' + ')} = {annual()} mm</p>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={measure} disabled={running || got.includes(day)}>取瓶，倒进量杯</LabButton>
        <LabButton primary={next === 'year'} pulse={next === 'year'} onClick={showYear} disabled={got.length < 3 || year}>看全年</LabButton>
      </>}
      extras={
        <Control label="哪一天的雨">
          <Segmented label="日期" pulse={next === 'day'} want={next === 'day' ? (task?.id as RainDay) : null} value={day} onChange={v => pick(v as RainDay)} disabled={running} options={DAYS.map(d => ({ value: d, label: RAIN_DAYS[d].name }))} />
        </Control>
      }
    />
  )
}
