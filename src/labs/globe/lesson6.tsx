// 地球和经纬网 · 第 6 课 半球的划分：用赤道、用 0° 和 180°、用 20°W 和 160°E 三种分法把地球仪分成两半，看城市落在哪边
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { CITIES, eastCenter, hemiOf, type CityKey, type Split } from './physics'
import { GR, faceLon, globeToWorld, onSphere } from './globe'
import { LESSONS, goLesson } from './lessons'
import { GLOBE_VIEWS, INDOOR } from './views'
import { ST, type Want } from './world'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'eq', text: '用赤道把地球分成两半', note: '赤道以北是北半球，以南是南半球' },
  { id: 'zero', text: '试试用 0° 和 180° 经线分', note: '这样分会把欧洲、非洲劈成两块' },
  { id: 'std', text: '换成 20°W 和 160°E 分东西半球', note: '这条经线圈几乎都从海上过，欧洲、非洲整个在东半球' },
]
const SPLITS: { value: Split; label: string }[] = [{ value: 'eq', label: '赤道' }, { value: 'zero', label: '0° 和 180°' }, { value: 'std', label: '20°W 和 160°E' }]
/** 每种分法让哪条经线正对镜头 */
const FACE: Record<Split, number> = { eq: faceLon(100), zero: faceLon(5), std: faceLon(-25) }
const NAMES: Record<Split, [string, string]> = { eq: ['北半球', '南半球'], zero: ['东半球', '西半球'], std: ['东半球', '西半球'] }
const PIN: Record<CityKey, string> = { beijing: '#ff5a3c', london: '#ffe14d', newyork: '#6db8ff', sydney: '#b48cff' }
const CK = Object.keys(CITIES) as CityKey[]

export default function Lesson6() {
  const [split, setSplit] = useState<Split>('eq')
  const [cut, setCut] = useState(false)
  const [rows, setRows] = useState<Split[]>([])
  const [nudge, setNudge] = useState(0)
  const T = useTasks('gewu:globe:6', TASKS)
  const spin = useSlide(FACE[split] + nudge, 70), turning = Math.abs(spin - FACE[split] - nudge) > 0.5
  const k = useSlide(cut ? 1 : 0, 0.8), opening = Math.abs(k - (cut ? 1 : 0)) > 0.001
  const choose = (s: Split) => { setSplit(s); setCut(false); setNudge(0) }
  const dup = rows.includes(split)
  const record = () => { if (!cut || opening || dup) return; const next = [...rows, split]; setRows(next); T.check(id => next.includes(id as Split)) }
  const resetAll = () => { setSplit('eq'); setCut(false); setRows([]); setNudge(0); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'split' | 'cut' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。抓住地球仪转一转，看看中国在哪两个半球。', next: null }
    if (split !== task.id) return { hint: `把分法换成${SPLITS.find(x => x.value === task.id)!.label}`, next: 'split' }
    if (turning || opening) return { hint: '地球仪在转…', next: null }
    if (!cut) return { hint: '把地球仪分成两半', next: 'cut' }
    if (dup) return { hint: '这种分法记过了', next: null }
    return split === 'zero' ? { hint: '看分界线经过的地方：欧洲、非洲被劈开了。记下来', next: 'record' } : { hint: '看四座城市各在哪一半：记下来', next: 'record' }
  })()

  const at = ST.globe
  const n: 'n' | number = split === 'eq' ? 'n' : eastCenter(split)
  const side = (a: number, b: number) => globeToWorld(at, onSphere(a, b, GR * 1.02), spin)
  const front = -90 - spin
  const labels: Label[] = [
    { id: 'a', at: split === 'eq' ? side(38, front - 8) : side(10, n as number), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: k > 0.5 ? 1 : 0, background: '#35e0c8', color: '#06231f' }, children: NAMES[split][0] },
    { id: 'b', at: split === 'eq' ? side(-38, front - 8) : side(10, (n as number) + 180), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: k > 0.5 ? 1 : 0, background: '#ffa64d', color: '#3a1d00' }, children: NAMES[split][1] },
    ...CK.map(c => { const p = globeToWorld(at, onSphere(CITIES[c].lat, CITIES[c].lon, GR * 1.08), spin); return { id: c, at: p, ax: 0, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: p[2] > at.z + 0.05 ? 1 : 0 }, children: CITIES[c].name } as Label }),
  ]
  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title="地球和经纬网" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球仪（也可以抓住球面直接拨）"
      stage={<LabStage<Want> labels={labels} {...GLOBE_VIEWS.hemi} {...INDOOR} world={{ globe: { spin, hemi: { n, k }, pins: CK.map(c => ({ lat: CITIES[c].lat, lon: CITIES[c].lon, color: PIN[c] })), lons: split === 'eq' ? [] : [{ lon: split === 'zero' ? 0 : -20, color: '#ffffff', full: true }], lats: split === 'eq' ? [{ lat: 0, color: '#ffffff' }] : [], onSpin: d => setNudge(x => x + d) } }}>{null}</LabStage>}
      lesson={<LessonBlock no="6" title="半球的划分" concept="赤道分南北，20°W 和 160°E 分东西" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>赤道把地球平分为两个半球：赤道以北是<b className="text-white">北半球</b>，赤道以南是<b className="text-white">南半球</b>。</p>
          <p className="mt-2">东西半球的分界，习惯上用 <b className="text-white">20°W 和 160°E</b> 组成的经线圈：20°W 以东、160°E 以西是东半球，另一半是西半球。</p>
          <p className="mt-2">为什么不用 0° 和 180°？0° 经线穿过欧洲和非洲，用它来分，会把这些国家分在两个半球里。20°W 和 160°E 这个经线圈基本都在海上。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种分法都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">赤道分南北半球，20°W 和 160°E 分东西半球</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">伦敦在 0° 经线上，却属于东半球：它在 20°W 以东。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再转转看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">分界线</div>
            <div className="mt-1 text-[30px] leading-tight font-bold tracking-tight text-[#7fe3d4]">{split === 'eq' ? '赤道（0°）' : split === 'zero' ? '0° 和 180°' : '20°W 和 160°E'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">四座城市在哪一半</h2>
          <table className="mt-1 w-full text-[13.5px] tabular-nums">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">城市</th><th className="font-normal">经纬度</th><th className="text-right font-normal">半球</th></tr></thead>
            <tbody>{CK.map(c => {
              const h = hemiOf(c, split), first = h === NAMES[split][0]
              return <tr key={c} className="border-t border-white/12"><td className="py-1.5 text-white/85"><span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: PIN[c] }} />{CITIES[c].name}</td><td className="text-white/65">{Math.abs(CITIES[c].lat)}°{CITIES[c].lat > 0 ? 'N' : 'S'} {Math.abs(CITIES[c].lon)}°{CITIES[c].lon > 0 ? 'E' : CITIES[c].lon < 0 ? 'W' : ''}</td><td className="text-right font-semibold" style={{ color: k > 0.5 ? (first ? '#35e0c8' : '#ffa64d') : 'rgba(255,255,255,0.4)' }}>{k > 0.5 ? h : '—'}</td></tr>
            })}</tbody>
          </table>
          {rows.length > 0 && <p className="mt-3 text-[13px] leading-relaxed text-white/60">记过：{rows.map(r => SPLITS.find(x => x.value === r)!.label).join('、')}</p>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'cut'} onClick={() => setCut(c => !c)} disabled={turning || opening}>{cut ? '合起来' : '分成两半'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!cut || opening || dup}>记录</LabButton>
      </>}
      extras={
        <Control label="分法">
          <Segmented label="分法" pulse={next === 'split'} want={(task?.id as Split) ?? null} value={split} onChange={k2 => choose(k2 as Split)} options={SPLITS} />
        </Control>
      }
    />
  )
}
