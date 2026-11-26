// 地震 · 第 2 课 震级和烈度：在沙盘上发生一次 8.0 级地震，按烈度给地面上色，读映秀、成都的烈度；换成 7.0 级再来一次，比较能量。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './world'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { CITIES, VP, VS, WENCHUAN, cityIntensity, energy, energyRatio, groundRadius, sci, type CityKey } from './physics'
import { Y } from './terrain'
import { useClock, useLater } from './clock'

type Mag = '8' | '7'
const SHOW: CityKey[] = ['yingxiu', 'beichuan', 'wenchuan', 'dujiangyan', 'chengdu', 'mianyang']
const R = Math.round(energyRatio(1))
const TASKS: Task[] = [
  { id: 'big', text: '发生一次 8.0 级地震', note: '一次地震只有一个震级：8.0 级' },
  { id: 'read', text: '看各地的烈度', note: `映秀 ${cityIntensity('yingxiu', 8)} 度，成都 ${cityIntensity('chengdu', 8)} 度：离震中越远，烈度一般越低` },
  { id: 'small', text: '换成 7.0 级，再发生一次', note: `能量只有 8.0 级的约 1/${R}，各地的烈度都低了` },
]
const ROMAN = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ']
const LEGEND: [number, string][] = [[6, '#fff08c'], [7, '#ffc752'], [8, '#fa8c38'], [9, '#e64d29'], [10, '#bd1f1f'], [11, '#800a1a']]

export default function Lesson2() {
  const [mag, setMag] = useState<Mag>('8')
  const [fired, setFired] = useState<Mag | null>(null)
  const [read, setRead] = useState(false)
  const T = useTasks('gewu:quake:2', TASKS)
  const t = useClock(fired !== null, 6, 60)
  const k = useSlide(fired ? 1 : 0, 0.5)
  const spreading = fired !== null && t < 60
  useLater(fired === '8' && !spreading, 300, () => T.check(id => id === 'big'), [spreading])
  useLater(fired === '7' && !spreading && T.done.read, 300, () => T.check(id => id === 'small'), [spreading])
  useLater(read, 1200, () => T.check(id => id === 'read'), [read])
  const fire = () => { setFired(null); requestAnimationFrame(() => setFired(mag)) }
  const pickMag = (m: Mag) => { setMag(m); setFired(null); setRead(m === '7' ? false : read) }
  const resetAll = () => { setMag('8'); setFired(null); setRead(false); T.reset() }

  const task = T.current, M = fired ? +fired as 7 | 8 : +mag as 7 | 8
  const { hint, next }: { hint: string; next: 'fire' | 'read' | 'mag' | null } = (() => {
    if (!task) return { hint: '都做完了。震级只有一个，烈度处处不同。', next: null }
    if (spreading) return { hint: '地震波向四周传开，各地依次晃起来…', next: null }
    if ((task.id === 'big' && fired === '8') || (task.id === 'small' && fired === '7')) return { hint: '地震波向四周传开，各地依次晃起来…', next: null }
    if (task.id === 'big') return mag !== '8' ? { hint: '把震级换成 8.0 级', next: 'mag' } : { hint: '发生一次 8.0 级地震', next: 'fire' }
    if (task.id === 'read') return { hint: '沙盘按烈度上了色。看看各地的烈度', next: 'read' }
    if (mag !== '7') return { hint: '把震级换成 7.0 级', next: 'mag' }
    return { hint: '在同一个地方发生一次 7.0 级地震', next: 'fire' }
  })()

  const showI = fired !== null && !spreading
  const labels: Label[] = SHOW.map(key => {
    const c = CITIES[key], I = cityIntensity(key, M), on = showI && (read || fired === '7')
    return { id: key, at: [c.at[0], Y(c.elev) + 3, c.at[1]] as [number, number, number], ax: 0.5, className: on ? 'scene-tag -translate-y-full' : 'scene-name -translate-y-full', children: on ? <><small>{c.name}</small>{I} 度</> : c.name }
  })
  return (
    <LabShell title="地震" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地震"
      stage={<Spot at="map" labels={labels} want={{ region: { intensity: fired ? { M, k: Math.min(k, spreading ? t / 60 : 1) } : null, waves: spreading ? { p: groundRadius(VP, t, WENCHUAN.h), s: groundRadius(VS, t, WENCHUAN.h), pf: 0, sf: 0, epi: WENCHUAN.epi } : null } }} />}
      lesson={<LessonBlock no="2" title="震级和烈度" concept="震级只有一个，烈度处处不同" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">震级</b>表示一次地震释放能量的多少。一次地震只有一个震级。震级每大 1 级，释放的能量约大 {R} 倍。</p>
          <p className="mt-2"><b className="text-white">烈度</b>表示地面受到的影响和破坏的程度，我国分 12 度。同一次地震，不同地方的烈度不同：一般离震中越远，烈度越低；震源越深，地面的烈度越低；松软的土层会把晃动放大，房子不结实的地方破坏更重。</p>
          <p className="mt-3 text-[13.5px] text-white/65">汶川地震的最高烈度是 11 度，在映秀和北川一带，沿龙门山呈长条分布。沙盘上的烈度色带按一个简化的衰减关系画，是示意。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两次地震都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">震级只有一个，烈度处处不同</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">8.0 级时映秀 {cityIntensity('yingxiu', 8)} 度、成都 {cityIntensity('chengdu', 8)} 度；7.0 级时映秀 {cityIntensity('yingxiu', 7)} 度、成都 {cityIntensity('chengdu', 7)} 度。震级大 1 级，能量约大 {R} 倍。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">释放的能量</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{sci(energy(M))}<span className="ml-1 text-[15px] font-medium text-white/55">J</span></div>
            <div className="mt-2 text-[14px] text-[#7fe3d4]">{T.done.small ? `8.0 级是 7.0 级的约 ${R} 倍` : ' '}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="震级" value={M.toFixed(1)} unit="级 · 一次地震一个" />
            <ParamTile symbol="震源深度" value={`${WENCHUAN.h}`} unit="km" />
            <ParamTile symbol="映秀" value={showI ? `${cityIntensity('yingxiu', M)} 度` : '—'} unit="烈度 · 震中" />
            <ParamTile symbol="成都" value={showI ? `${cityIntensity('chengdu', M)} 度` : '—'} unit="烈度 · 约 70 km" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">烈度（示意）</h2>
          <div className="mt-2 flex gap-1">{LEGEND.map(([d, c]) => <div key={d} className="flex-1 text-center"><div className="h-3 rounded-sm" style={{ background: c }} /><div className="mt-1 text-[12px] text-white/65 tabular-nums">{ROMAN[d]}</div></div>)}</div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'fire'} onClick={fire} disabled={spreading}>发生地震</LabButton>
        <LabButton pulse={next === 'read'} onClick={() => setRead(true)} disabled={!showI || read || fired !== '8'}>看各地烈度</LabButton>
      </>}
      extras={<Control label="震级"><Segmented label="震级" pulse={next === 'mag'} want={next === 'mag' ? (task?.id === 'small' ? '7' : '8') : null} value={mag} disabled={spreading} onChange={m => pickMag(m as Mag)} options={[{ value: '8', label: '8.0 级' }, { value: '7', label: '7.0 级' }]} /></Control>}
    />
  )
}
