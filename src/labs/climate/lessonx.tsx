// 天气和气候 · 拓展 翻过这座山：开车沿公路从观测场出发，经迎风坡山腰（在云雾里）、山口，下到背风坡山脚的小气象站，
// 一路读海拔、气温、年降水；最后把季节换成 4 月，看山上的积雪（雪线）降到多低。
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, Rows, valTag } from './parts'
import { JULY, STOPS, TEMP, snowLine, stopTemp, yAt, type StopKey } from './physics'
import { PASS_S, ROAD_LEN, roadAt, roadS } from './terrain'
import { VOICE } from './voice'
import { FAR, SPOT, type Want } from './world'

const ORDER: StopKey[] = ['foot', 'mid', 'pass', 'lee']
const S_AT: Record<StopKey, number> = { foot: 0, mid: roadS(yAt(STOPS.mid.alt)), pass: PASS_S, lee: ROAD_LEN }
type Season = '7' | '4'
/** 跟着车的机位 */
const CAR_SPAN: [number, number] = [240, 140], CAR_VIEW: [number, number] = [-Math.PI / 2 + 0.55, 0.32]
const APRIL = TEMP[3]
const TASKS: Task[] = [
  { id: 'mid', text: '开到迎风坡山腰', note: `山腰在云雾里，正下着雨；气温 ${stopTemp('mid')} ℃，比山脚低 ${JULY - stopTemp('mid')} ℃` },
  { id: 'pass', text: '翻过山口', note: `山口海拔 ${STOPS.pass.alt} m，7 月也只有约 ${stopTemp('pass')} ℃` },
  { id: 'lee', text: '下到背风坡山脚', note: '背风坡晴朗干燥，年降水只有约 200 mm' },
  { id: 'snow', text: '把季节换成 4 月，看山上的积雪', note: '' },
]

export default function LessonX() {
  const [at, setAt] = useState(0)                    // 到了第几站
  const [s, setS] = useState(0)
  const [season, setSeason] = useState<Season>('7')
  const [snow, setSnow] = useState(snowLine(JULY))
  const T = useTasks('gewu:climate:x', TASKS)
  const raf = useRef(0), sRef = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const driving = Math.abs(s - S_AT[ORDER[at]]) > 0.5
  const drive = () => {
    if (driving || at >= 3) return
    const to = S_AT[ORDER[at + 1]], k = ORDER[at + 1]
    setAt(at + 1)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      sRef.current = Math.min(to, sRef.current + dt * 170); setS(sRef.current)
      if (sRef.current < to) raf.current = requestAnimationFrame(f); else T.check(id => id === k)
    }
    raf.current = requestAnimationFrame(f)
  }
  // 换季节：雪线慢慢移到新的高度
  useEffect(() => {
    const goal = snowLine(season === '7' ? JULY : APRIL); let last = performance.now(), id = 0
    const f = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; setSnow(v => { const n = v + Math.sign(goal - v) * Math.min(Math.abs(goal - v), dt * 900); if (n !== goal) id = requestAnimationFrame(f); else if (season === '4') T.check(x => x === 'snow'); return n }) }
    id = requestAnimationFrame(f); return () => cancelAnimationFrame(id)
  }, [season])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { cancelAnimationFrame(raf.current); sRef.current = 0; setS(0); setAt(0); setSeason('7'); T.reset() }

  const task = T.current, stop = ORDER[at]
  const { hint, next }: { hint: string; next: 'drive' | 'season' | null } = (() => {
    if (!task) return { hint: '都做完了。一座山两坡，气候大不一样。', next: null }
    if (driving) return { hint: '车沿着公路开…', next: null }
    if (task.id === 'snow') return season === '4' ? { hint: '雪线往下移…', next: null } : { hint: '把季节换成 4 月，看山上的积雪', next: 'season' }
    return { hint: `开到下一站：${STOPS[task.id as StopKey].name}`, next: 'drive' }
  })()

  const car = roadAt(s).p, view = task?.id === 'snow' || !task
  // 镜头看向这一段要开到的那一站（开车时镜头先飞过去等着）
  const stopAt = useMemo(() => { const p = roadAt(S_AT[ORDER[at]]).p; return new THREE.Vector3(p[0], p[1] + 25, p[2]) }, [at])
  const target = view ? SPOT.profile.target : stopAt
  const t = stopTemp(stop, season === '7' ? JULY : APRIL)
  const labels: Label[] = [
    valTag('car', [car[0], car[1] + 22, car[2]], STOPS[stop].name, `${STOPS[stop].alt} m · ${t} ℃`, true, !driving && !view, 0.5),
    valTag('sn', [700, yAt(snow) + 30, -60], `雪线 · ${season} 月`, `约 ${Math.round(snow / 10) * 10} m`, true, view, 0.5),
  ]
  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="天气和气候" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="翻山公路"
      stage={<LabStage<Want> labels={labels} target={target} span={view ? SPOT.profile.span : CAR_SPAN} view={view ? SPOT.profile.view : CAR_VIEW} {...FAR}
        world={{ car: s, mtn: 0.42, snowAlt: snow, wx: 'sun' }}>{null}</LabStage>}
      lesson={<LessonBlock no="拓展" title="翻过这座山" concept="一座山两坡，气候大不一样" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>沿公路翻过一座大山，一路的景色会变：迎风坡山脚是农田，往上是森林，山腰常在云雾里下雨；越往上越冷，山顶有积雪；翻过山口到背风坡，天晴了，雨很少，是草原和荒漠。</p>
          <p className="mt-2">月平均气温在 0 ℃ 以下的高处，积雪化不完。按“每升高 100 m 降 0.6 ℃”，可以估出 0 ℃ 在多高：春天山脚还不热，这个高度就低，积雪一直盖到半山腰。</p>
          <p className="mt-2 text-[13.5px] text-white/65">这座山和一路的数是示意数据；雪线按月平均气温 0 ℃ 的高度粗略估算。</p>
        </>} />}
      finale={T.finale && <Fin kicker="翻过这座山了" big="一座山两坡，气候大不一样" small={`迎风坡云多雨多、森林茂密，背风坡晴朗干燥；越高越冷，7 月雪线约 ${snowLine(JULY)} m，4 月山脚只有 ${APRIL} ℃，雪线降到约 ${Math.round(snowLine(APRIL) / 10) * 10} m。`} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{STOPS[stop].name} · {season} 月平均气温</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{driving ? '—' : t}<span className="ml-1 text-[15px] font-medium text-white/55">℃</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="海拔" value={`${STOPS[stop].alt} m`} unit={STOPS[stop].sky} />
            <ParamTile symbol="雪线" value={`约 ${Math.round(snow / 10) * 10} m`} unit="月平均 0 ℃ 的高度" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">一路的记录（7 月，示意）</h2>
          <Rows head={['地点', '海拔', '气温', '年降水']} rows={ORDER.slice(0, at + 1).filter((_, i) => i < at || !driving).map(k => [STOPS[k].name, `${STOPS[k].alt} m`, `${stopTemp(k)} ℃`, STOPS[k].rain ? `约 ${STOPS[k].rain} mm` : '—'])} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'drive'} onClick={drive} disabled={driving || at >= 3}>开到下一站</LabButton>
      </>}
      extras={
        <Control label="季节">
          <Segmented label="季节" pulse={next === 'season'} want={next === 'season' ? '4' : null} value={season} onChange={v => setSeason(v as Season)} disabled={driving || at < 3} options={[{ value: '7', label: '7 月' }, { value: '4', label: '4 月' }]} />
        </Control>
      }
    />
  )
}
