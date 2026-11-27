// 静电场 · 第 5 课 电容器：平行板电容器接静电计。先充电到 1000 V 再断开电源，极板上的电荷量就不变了；
// 然后把板距加倍、把正对面积减半、插入介质板，看静电计的电压怎样变，倒推出电容怎样变；最后放电。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LESSONS, goLesson } from './lessons'
import { ST, TOP } from './layout'
import { CAP, CAP_MODES, capCharge, capOf, capVoltage, meterAngle, sci, type CapMode } from './physics'
import { R5, Rig5 } from './scene5'
import { useSeq } from './anim'
import { Big, Final, Sub } from './ui'
import { Place } from './world'

const pf = (m: CapMode) => (capOf(m) * 1e12).toFixed(1)
const uv = (m: CapMode) => capVoltage(m).toFixed(0)
const TASKS: Task[] = [
  { id: 'charge', text: `充电到 ${CAP.U0} V，然后断开电源`, note: `极板带电 Q = CU ≈ ${sci(capCharge())} C；断开以后 Q 不再变` },
  { id: 'far', text: '把板距加倍', note: `电压升到 ${uv('far')} V：Q 不变，电容减半` },
  { id: 'half', text: '把正对面积减半', note: `电压也升到 ${uv('half')} V：电容减半` },
  { id: 'slab', text: '插入介质板', note: `电压降到 ${uv('slab')} V：电容变成 ${CAP.eps} 倍` },
  { id: 'dis', text: '放电', note: '两板的电荷中和，电压回到 0' },
]
const X = ST.l5

export default function Lesson5() {
  const [mode, setMode] = useState<CapMode>('base')
  const [charged, setCharged] = useState(false)
  const [k1, setK1] = useState(0), [k2, setK2] = useState(0), [fire, setFire] = useState(0)
  const T = useTasks('gewu:efield:5', TASKS), seq = useSeq()
  const M = CAP_MODES[mode]
  const shiftTo = mode === 'half' ? R5.r * 0.808 : 0, slabTo = mode === 'slab' ? 1 : 0
  const d = useSlide(M.d, 0.02), shift = useSlide(shiftTo, 0.08), slab = useSlide(slabTo, 0.7)
  const goal = charged ? capVoltage(mode) : 0, U = useSlide(goal, 1400)
  const s1 = useSlide(k1, 4), s2 = useSlide(k2, 4)
  const still = d === M.d && shift === shiftTo && slab === slabTo && U === goal && !seq.busy
  useEffect(() => { if (still && charged) T.check(id => id === 'charge' || (id === mode && !!T.done.charge)) }, [still, charged, mode])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (still && !charged && T.done.slab) T.check(id => id === 'dis') }, [still, charged])   // eslint-disable-line react-hooks/exhaustive-deps
  const charge = () => { setMode('base'); seq.run([[300, () => setK1(1)], [500, () => setCharged(true)], [1500, () => setK1(0)], [500, () => { }]]) }
  const discharge = () => seq.run([[0, () => setK2(1)], [280, () => { setFire(f => f + 1); setCharged(false) }], [1200, () => setK2(0)], [400, () => { }]])
  const resetAll = () => { seq.stop(); setMode('base'); setCharged(false); setK1(0); setK2(0); T.reset() }

  const task = T.current
  type Next = 'charge' | 'mode' | 'dis' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: 'C = Q / U；平行板电容器 C = ε_r ε₀ S / d。', next: null }
    if (task.id === 'charge') return seq.busy || charged ? { hint: '正在充电，充好就断开电源…', next: null } : { hint: '给电容器充电，然后断开电源', next: 'charge' }
    if (task.id === 'dis') return seq.busy ? { hint: '放电了，看静电计…', next: null } : { hint: '合上放电开关', next: 'dis' }
    if (!charged) return { hint: '电容器没有电了，先重新充电', next: 'charge' }
    if (mode !== task.id) return { hint: `电容器改成：${CAP_MODES[task.id as CapMode].name}`, next: 'mode' }
    return { hint: '看静电计的指针怎样变…', next: null }
  })()

  const labels: Label[] = [
    { id: 'n1', at: [X - d / 2, TOP + R5.y + R5.r + 0.05, shift / 2], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '平行板电容器' },
    { id: 'n2', at: [X + R5.meter[0] + 0.09, TOP + R5.meter[1] + 0.05, R5.meter[2]], ax: 0, name: true, className: 'scene-name', children: '静电计' },
    { id: 'n3', at: [X - CAP.d / 2, TOP + R5.y + 0.13, -0.3 * (1 - slab)], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '介质板' },
    { id: 'n4', at: [X + 0.06, TOP + 0.05, 0.27], ax: 0.5, name: true, className: 'scene-name', children: '充电开关' },
    { id: 'n5', at: [X + 0.33, TOP + 0.05, 0.25], ax: 0.5, name: true, className: 'scene-name', children: '放电开关' },
    { id: 'u', at: [X + R5.meter[0], TOP + R5.meter[1] - 0.1, R5.meter[2] + 0.03], ax: 0.5, className: 'scene-tag key', children: <><small>U</small>{U.toFixed(0)} V</> },
    { id: 'd', at: [X - d / 2, TOP + R5.y - R5.r - 0.012, shift / 2 + 0.02], ax: 0.5, className: 'scene-tag', children: <><small>d</small>{(d * 100).toFixed(1)} cm</> },
  ]
  return (
    <LabShell title="静电场" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="开关"
      stage={<Place at="l5" cur="l5" labels={labels}><Rig5 d={d} shift={shift} slab={slab} U={U} angle={meterAngle(U)} k1={s1} k2={s2} fire={fire} /></Place>}
      lesson={<LessonBlock no="5" title="电容器" concept="板距小、正对面积大、有介质，电容就大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>两个彼此绝缘又相距很近的导体组成一个<b className="text-white">电容器</b>。让两板带上等量异种电荷叫充电，让它们的电荷中和叫放电。</p>
          <p className="mt-3">电容器所带的电荷量 Q 与两板间电势差 U 的比值叫电容：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">C = Q / U</p>
          <p className="mt-3">单位是法（F），1 pF = 10⁻¹² F。电容表示电容器容纳电荷的本领，由电容器本身决定。平行板电容器：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">C = ε<sub>r</sub> ε₀ S / d</p>
          <p className="mt-3">这个实验的关键：充电以后<b className="text-white">断开电源，Q 不变</b>。这时电压升高说明电容变小，电压降低说明电容变大。静电计指针张开的角度越大，两板间的电压越高。</p>
        </>} />}
      finale={T.finale && <Final kicker="五步都做完了" title="C = ε_r ε₀ S / d：板距小、正对面积大、有介质，电容就大"
        body={<>Q 不变时：原样 {uv('base')} V，板距加倍 {uv('far')} V，面积减半 {uv('half')} V，插入介质板 {uv('slab')} V。</>} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="U = Q / C" value={U.toFixed(0)} unit="V" note="静电计量到的两板间电压" />
          <Sub>电容器</Sub>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="C" value={pf(mode)} unit="pF · 电容" />
            <ParamTile symbol="Q" value={charged ? sci(capCharge(), 2) : '0'} unit="C · 电荷量" />
          </div>
          <Sub>关键参数</Sub>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="S" value={M.S.toFixed(3)} unit="m²" />
            <ParamTile symbol="d" value={M.d.toFixed(3)} unit="m" />
            <ParamTile symbol={<>ε<sub>r</sub></>} value={String(M.eps)} unit={M.eps > 1 ? '介质板' : '空气'} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'charge'} pulse={next === 'charge'} onClick={charge} disabled={seq.busy || charged}>充电并断开</LabButton>
        <LabButton pulse={next === 'dis'} onClick={discharge} disabled={seq.busy || !charged}>放电</LabButton>
      </>}
      extras={<Control label="电容器"><Segmented label="电容器" pulse={next === 'mode'} want={next === 'mode' ? task!.id as CapMode : null} value={mode} onChange={setMode} disabled={seq.busy || !charged} options={(Object.keys(CAP_MODES) as CapMode[]).map(k => ({ value: k, label: CAP_MODES[k].name }))} /></Control>}
    />
  )
}
