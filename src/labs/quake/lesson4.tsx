// 地震 · 第 4 课 地震预警：地面上纵波（蓝圈）、横波（橙圈）扩开；最近的地震台测到纵波，处理 8 s 后发出警报，各城市同时收到；
// 读成都、绵阳能提前几秒；都江堰离得太近，警报发出时横波已经到了，在盲区里。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './world'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { CITIES, PROC, STATIONS, VP, VS, WARN_CITIES, WENCHUAN, alertTime, blindRadius, epiDist, groundRadius, leadTime, nearestStation, tP, tS, type CityKey } from './physics'
import { Y, height } from './terrain'
import { WarnChart } from './charts'
import { useClock, useLater } from './clock'

type Pick = 'dujiangyan' | 'chengdu' | 'mianyang'
const H = WENCHUAN.h, TA = alertTime(), NS = nearestStation(), END = 38
const lead = (k: CityKey) => leadTime(k)
const TASKS: Task[] = [
  { id: 'alert', text: '发生地震，看警报怎样发出', note: `最近的地震台测到纵波，约 ${TA.toFixed(1)} s 后发出警报` },
  { id: 'chengdu', text: '读出成都能提前几秒', note: `成都约提前 ${lead('chengdu').toFixed(0)} s 收到警报` },
  { id: 'mianyang', text: '再看更远的绵阳', note: `绵阳更远，约提前 ${lead('mianyang').toFixed(0)} s` },
  { id: 'dujiangyan', text: '看都江堰为什么来不及', note: '都江堰离震中太近：警报发出时，横波已经到了' },
]
const NAMES: Record<Pick, string> = { dujiangyan: '都江堰', chengdu: '成都', mianyang: '绵阳' }

export default function Lesson4() {
  const [run, setRun] = useState(false)
  const [pick, setPick] = useState<Pick>('chengdu')
  const [seen, setSeen] = useState(false)
  const T = useTasks('gewu:quake:4', TASKS)
  const t = useClock(run, 2, END)
  const over = run && t >= END
  useLater(over, 200, () => { setSeen(true); T.check(id => id === 'alert') }, [over])
  useLater(seen, 900, () => T.check(id => id === pick), [seen, pick])
  const fire = () => { setRun(false); requestAnimationFrame(() => setRun(true)) }
  const resetAll = () => { setRun(false); setPick('chengdu'); setSeen(false); T.reset() }

  const task = T.current, going = run && !over
  const { hint, next }: { hint: string; next: 'fire' | 'pick' | null } = (() => {
    if (!task) return { hint: '都做完了。纵波先到报信，横波后到破坏。', next: null }
    if (going) {
      if (t < tP(NS.d, H)) return { hint: '纵波、横波从震中向四周传开…', next: null }
      if (t < TA) return { hint: `最近的地震台测到了纵波，系统正在算震级和位置…`, next: null }
      return { hint: '警报发出：各城市同时收到，横波还在路上…', next: null }
    }
    if (over && !seen) return { hint: '警报发出：各城市同时收到，横波还在路上…', next: null }
    if (task.id === 'alert') return { hint: '发生地震，看警报怎样发出', next: 'fire' }
    if (pick !== task.id) return { hint: `看看${NAMES[task.id as Pick]}`, next: 'pick' }
    return { hint: '读一读面板上的数', next: null }
  })()

  const alerted = run && t >= TA
  const cityLabel = (k: CityKey): Label => {
    const c = CITIES[k], ls = lead(k), sArr = tS(epiDist(k), H), hit = run && t >= sArr
    let body: React.ReactNode = c.name, cls = 'scene-name'
    if (alerted || seen) { cls = ls > 0 ? 'scene-tag key' : 'scene-tag'; body = ls > 0 ? <><small>{c.name}</small>{hit || seen ? `提前 ${ls.toFixed(1)} s` : `还有 ${(sArr - t).toFixed(1)} s`}</> : <><small>{c.name}</small>来不及</> }
    else if (hit) { cls = 'scene-tag'; body = <><small>{c.name}</small>横波到了</> }
    return { id: k, at: [c.at[0], Y(c.elev) + 3.5, c.at[1]], ax: 0.5, className: `${cls} -translate-y-full`, children: body }
  }
  const st = STATIONS[NS.i]
  const labels: Label[] = [
    ...WARN_CITIES.map(cityLabel),
    { id: 'st', at: [st[0], Y(height(st[0], st[1])) + 4.2, st[1]], ax: 0, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: run && t >= tP(NS.d, H) && t < TA + 3 ? 1 : 0 }, children: '最近的地震台' },
    { id: 'bl', at: [-blindRadius() * 0.7, Y(1.2), blindRadius() * 0.7], ax: 0.5, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: alerted || seen ? 1 : 0 }, children: '盲区' },
  ]
  const ls = lead(pick)
  return (
    <LabShell title="地震" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地震"
      stage={<Spot at="warn" labels={labels} want={{ region: { stations: 'net', hot: run && t >= tP(NS.d, H) ? [NS.i] : [], blind: alerted || seen ? blindRadius() : 0, waves: going ? { p: groundRadius(VP, t, H), s: groundRadius(VS, t, H), pf: 0, sf: 0, epi: WENCHUAN.epi } : null } }} />}
      lesson={<LessonBlock no="4" title="地震预警" concept="纵波先到报信，横波后到破坏" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>地震预警利用了两个“快”：纵波比破坏性大的横波跑得快；电信号（每秒约 30 万千米）比地震波快得多。</p>
          <p className="mt-2">离震中近的地震台先测到纵波，系统几秒内算出地震的位置和震级，立刻通过手机、电视、广播发出警报。离得远的地方，在横波到达之前就能收到。</p>
          <p className="mt-2">离震中太近的地方，警报发出时横波已经到了，这一圈叫<b className="text-white">盲区</b>。离得越远，提前的时间越多，但那里的晃动也越小。</p>
          <p className="mt-3 text-[13.5px] text-white/65">2008 年时还没有地震预警系统，这里是“同样的地震今天再发生一次”的示意：台站间距约 25 km、处理用时 {PROC} s 都是示意值。时钟快放 2 倍。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三座城市都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">纵波先到报信，横波后到破坏</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">警报在地震后约 {TA.toFixed(1)} s 发出。成都提前约 {lead('chengdu').toFixed(0)} s，绵阳约 {lead('mianyang').toFixed(0)} s；都江堰在盲区里，来不及。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAMES[pick]}能提前</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{seen ? (ls > 0 ? ls.toFixed(1) : '来不及') : '—'}{seen && ls > 0 && <span className="ml-1 text-[15px] font-medium text-white/55">s</span>}</div>
            <div className="mt-2 text-[13px] text-white/60">{seen ? `离震中约 ${Math.round(epiDist(pick))} km，横波 ${tS(epiDist(pick), H).toFixed(1)} s 到` : ' '}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">横波什么时候到（条的尽头）、警报什么时候发（竖线）</h2>
          <div className="mt-2"><WarnChart t={seen ? END : run ? t : 0} pick={pick} /></div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="警报发出" value={alerted || seen ? TA.toFixed(1) : '—'} unit="s · 地震后" />
            <ParamTile symbol="盲区半径" value={alerted || seen ? `约 ${Math.round(blindRadius())}` : '—'} unit="km" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'fire'} onClick={fire} disabled={going}>发生地震</LabButton>
      </>}
      extras={<Control label="看哪座城市"><Segmented label="看哪座城市" pulse={next === 'pick'} want={next === 'pick' ? (task!.id as Pick) : null} value={pick} disabled={going} onChange={v => setPick(v as Pick)} options={[{ value: 'dujiangyan', label: '都江堰' }, { value: 'chengdu', label: '成都' }, { value: 'mianyang', label: '绵阳' }]} /></Control>}
    />
  )
}
