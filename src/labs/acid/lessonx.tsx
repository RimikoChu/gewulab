// 酸、碱和中和 · 拓展课 紫甘蓝和中和热：化验台最东一格。
// 一、紫甘蓝指示剂：左边三只小烧杯（稀盐酸、清水、石灰水），一瓶紫甘蓝汁；把紫甘蓝汁分别滴进去，红、紫、绿。
// 二、中和放热：右边一只烧杯盛 50 mL 0.50 mol/L 盐酸，插着温度计；把 50 mL 0.50 mol/L 氢氧化钠溶液倒进去，温度升高约 3.4 °C。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Beaker, Dropper, Glove, LOOK, NarrowBottle, Thermometer, u, type Look } from './gear'
import { Drop, Stream } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, mixHex, seg, useRun } from './parts'
import { HEAT, SAMPLES, cabbage, heatRise, type Hue, type SampleKey } from './physics'
import { BZ, ST, TOP, Place, type V3 } from './world'

const X0 = ST.x, Y = TOP, Z = BZ + 1.05
const KEYS: SampleKey[] = ['acid', 'salt', 'lime']
const CUP: Record<SampleKey, V3> = { acid: [X0 - u(0.19), Y, Z + u(0.07)], salt: [X0 - u(0.125), Y, Z + u(0.07)], lime: [X0 - u(0.06), Y, Z + u(0.07)] }
const JUICE: V3 = [X0 - u(0.005), Y, Z - u(0.05)]
const HB: V3 = [X0 + u(0.07), Y, Z + u(0.06)]      // 盛盐酸的烧杯
const NB: V3 = [X0 + u(0.165), Y, Z + u(0.0)]     // 盛氢氧化钠溶液的烧杯
const NAMES: Record<SampleKey, string> = { acid: '稀盐酸', salt: '清水', lime: '石灰水' }
const TASKS: Task[] = [
  { id: 'cab', text: '把紫甘蓝汁分别滴进三只烧杯', note: '稀盐酸里变红，清水里紫色，石灰水里变绿：紫甘蓝汁也能当酸碱指示剂' },
  { id: 'mix', text: '把氢氧化钠溶液倒进盐酸里', note: '酸和碱发生中和反应，溶液里生成了氯化钠和水' },
  { id: 'heat', text: '读温度计', note: `从 ${HEAT.t0.toFixed(1)} °C 升到约 ${(HEAT.t0 + heatRise()).toFixed(1)} °C：中和反应放出热量` },
]
const cabLook = (h: Hue): Look => h === 'red' ? { color: '#c8235a', opacity: 0.6, vivid: true } : h === 'green' ? { color: '#3aa05a', opacity: 0.62, vivid: true } : { color: '#6e3f9e', opacity: 0.6, vivid: true }

export default function LessonX() {
  const [cab, setCab] = useState(false)
  const [mixed, setMixed] = useState(false)
  const [readT, setReadT] = useState(false)
  const T = useTasks('gewu:acid:x', TASKS)
  const drip = useRun(6, () => { setCab(true); T.check(id => id === 'cab') })
  const pour = useRun(4.4, () => { setMixed(true); T.check(id => id === 'mix') })
  const read = useRun(3.2, () => { setReadT(true); T.check(id => id === 'heat') })
  const busy = drip.busy || pour.busy || read.busy
  const resetAll = () => { drip.snap(0); pour.snap(0); read.snap(0); setCab(false); setMixed(false); setReadT(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'cab' | 'pour' | 'read' | null } = !task ? { hint: '紫甘蓝汁遇酸变红、遇碱变绿；中和反应放出热量。', next: null }
    : drip.busy ? { hint: '用滴管把紫甘蓝汁依次滴进三只烧杯…', next: null }
    : pour.busy ? { hint: '把氢氧化钠溶液慢慢倒进盐酸里，轻轻搅动…', next: null }
    : read.busy ? { hint: '看温度计的液柱…', next: null }
    : task.id === 'cab' ? { hint: '把紫甘蓝汁分别滴进稀盐酸、清水和石灰水', next: 'cab' }
    : task.id === 'mix' ? { hint: '50 mL 盐酸里插着温度计。把 50 mL 氢氧化钠溶液倒进去', next: 'pour' }
    : { hint: '读一读温度计', next: 'read' }

  // 滴紫甘蓝汁：滴管依次到三只烧杯上方，每只滴一下
  const dt = drip.t, which = Math.min(2, Math.floor(seg(dt, 0.8, 5.2) * 3))
  const target = (i: number): V3 => [CUP[KEYS[i]][0], Y + u(0.09), CUP[KEYS[i]][2]]
  const dropperAt: V3 = !drip.busy ? JUICE : dt < 0.8 ? liftPath([JUICE[0], Y + u(0.12), JUICE[2]], target(0), Y + u(0.16), seg(dt, 0, 0.8)) : dt < 5.2 ? (() => { const q = seg(dt, 0.8, 5.2) * 3, i = Math.min(2, Math.floor(q)), f = ease(Math.min(1, (q - i) * 2.5)); const a = target(Math.max(0, i - 1)), b = target(i); return i === 0 ? b : [a[0] + (b[0] - a[0]) * f, b[1], b[2]] as V3 })() : liftPath(target(2), [JUICE[0], Y + u(0.12), JUICE[2]], Y + u(0.16), seg(dt, 5.2, 6))
  const colored = (i: number) => cab ? 1 : drip.busy ? seg(dt, 0.8 + i * 1.47 + 0.9, 0.8 + i * 1.47 + 1.4) : 0
  const cupLook = (i: number): Look => { const k = colored(i), to = cabLook(cabbage(SAMPLES[KEYS[i]].pH)); return k > 0 ? { color: mixHex('#cfe4ea', to.color, k), opacity: 0.26 + (to.opacity - 0.26) * k, vivid: k > 0.3 } : LOOK.clear }
  // 倒在一起：右手拿起氢氧化钠烧杯，倾斜着倒进左边烧杯
  const pt = pour.t, pk = pour.busy ? ease(seg(pt, 0, 1.0)) - ease(seg(pt, 3.4, 4.4)) : 0
  const nbAt: V3 = pk > 0 ? liftPath(NB, [HB[0] + u(0.075), Y + u(0.075), HB[2]], Y + u(0.1), pk) : NB
  const tilt = pour.busy ? ease(seg(pt, 1.0, 1.5)) - ease(seg(pt, 2.9, 3.4)) : 0
  const flowing = pour.busy && pt > 1.4 && pt < 3.0
  const hbLevel = 0.012 + 0.012 * (mixed ? 1 : pour.busy ? seg(pt, 1.4, 3.0) : 0)
  const nbLevel = 0.012 * (mixed ? 0 : pour.busy ? 1 - seg(pt, 1.4, 3.0) : 1)
  // 温度：倒完以后慢慢升到最高
  const rise = heatRise(), heatK = mixed ? 1 : pour.busy ? seg(pt, 1.6, 4.4) : 0
  const temp = HEAT.t0 + rise * heatK
  const col = 0.3 + (temp - HEAT.t0) / 40

  const labels: Label[] = [
    ...KEYS.map(k => ({ id: `c${k}`, at: [CUP[k][0], Y - u(0.004), CUP[k][2] + u(0.035)] as V3, ax: 0.5, className: 'scene-name', children: NAMES[k] })),
    { id: 'n1', at: [JUICE[0] + u(0.04), Y + u(0.08), JUICE[2]], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '紫甘蓝汁' },
    { id: 'n2', at: [HB[0], Y - u(0.004), HB[2] + u(0.045)], ax: 0.5, name: true, className: 'scene-name', children: '盐酸 50 mL' },
    { id: 'n3', at: [NB[0], Y - u(0.004), NB[2] + u(0.045)], ax: 0.5, name: true, className: 'scene-name', children: '氢氧化钠溶液 50 mL' },
    { id: 't', at: [HB[0] - u(0.03), Y + u(0.16), HB[2]], ax: 1, className: `scene-tag ${readT || read.busy ? 'key' : ''} -translate-y-1/2`, children: <><small>温度</small>{temp.toFixed(1)} °C</> },
  ]
  return (
    <LabShell title="酸、碱和中和" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel="试一试"
      stage={<Place at="x" labels={labels}>
        {KEYS.map((k, i) => <group key={k} position={CUP[k]}><Beaker vol={100} level={0.032} look={cupLook(i)} /></group>)}
        <group position={JUICE} scale={0.8}><NarrowBottle label="紫甘蓝汁" band="#6e3f9e" look={{ color: '#5d2f8a', opacity: 0.7, vivid: true }} plug={!drip.busy} /></group>
        {drip.busy && <group position={dropperAt}>
          <Dropper fill={0.4} look={{ color: '#5d2f8a', opacity: 0.7, vivid: true }} />
          <group position={[0, u(0.1), 0]} rotation={[0.25, 0.3, 0.1]}><Glove s={u(0.0055)} /></group>
        </group>}
        {drip.busy && dt > 0.8 && dt < 5.2 && <Drop at={target(which)} drop={u(0.05)} t={((seg(dt, 0.8, 5.2) * 3) % 1) * 2.2 - 0.9} r={u(0.002)} color="#6e3f9e" />}
        {/* 中和放热 */}
        <group position={HB}><Beaker vol={100} level={hbLevel} look={LOOK.clear} /></group>
        <group position={[HB[0] - u(0.008), Y + u(0.004), HB[2] + u(0.004)]} rotation-z={-0.12}><Thermometer col={col} /></group>
        <group position={nbAt} rotation-z={tilt * 1.6}>
          <Beaker vol={100} level={nbLevel} look={LOOK.clear} />
          {pour.busy && <group position={[u(0.035), u(0.04), 0]} rotation={[0.2, 0, 0.4]}><Glove s={u(0.006)} /></group>}
        </group>
        <Stream top={[HB[0] + u(0.03), Y + u(0.07), HB[2]]} bottom={[HB[0] + u(0.012), Y + u(hbLevel + 0.002), HB[2]]} r={u(0.0022)} on={flowing} />
        {read.busy && <group position={[HB[0] - u(0.03), Y + u(0.16), HB[2] + u(0.03)]} rotation={[0.2, 0.3, -1.2]}><Glove s={u(0.0055)} /></group>}
      </Place>}
      lesson={<LessonBlock no="拓展" title="紫甘蓝和中和热" concept="自制指示剂；中和反应放出热量" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>许多植物的花瓣、果实里含有遇酸碱变色的色素。紫甘蓝汁就是一种：遇酸变红，遇碱变绿，在中性的水里是紫色。牵牛花、月季花的花瓣也能这样自制指示剂。</p>
          <p className="mt-3">中和反应放出热量。50 mL 0.50 mol/L 盐酸和 50 mL 0.50 mol/L 氢氧化钠溶液混合，反应了 0.025 mol，溶液温度升高约 3.4 °C。</p>
          <p className="mt-3 text-[13.5px] text-white/65">温度的数按不计散热、溶液比热容 4.18 J/(g·°C) 算，实际测到的会低一点。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个小实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">自制指示剂；中和反应放出热量</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">紫甘蓝汁遇酸变红、遇碱变绿；盐酸和氢氧化钠溶液混合后温度升高约 {rise.toFixed(1)} °C。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">混合后的温度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{temp.toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">°C</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="t₀" value={HEAT.t0.toFixed(1)} unit="°C · 混合前" />
            <ParamTile symbol="Δt" value={readT ? `约 ${rise.toFixed(1)}` : '—'} unit="°C · 升高" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">紫甘蓝汁的颜色</h2>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[13.5px]">{KEYS.map(k => <div key={k} className="rounded-xl bg-white/[0.06] py-2"><div className="text-white/60">{NAMES[k]}</div><div className="mt-0.5 font-semibold">{cab ? ({ red: '红色', purple: '紫色', green: '绿色' } as Record<string, string>)[cabbage(SAMPLES[k].pH)] : '—'}</div></div>)}</div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'cab'} pulse={next === 'cab'} onClick={() => drip.run()} disabled={busy || cab}>滴紫甘蓝汁</LabButton>
        <LabButton primary={next === 'pour'} pulse={next === 'pour'} onClick={() => pour.run()} disabled={busy || !cab || mixed}>倒在一起</LabButton>
        <LabButton primary={next === 'read'} pulse={next === 'read'} onClick={() => read.run()} disabled={busy || !mixed || readT}>读温度</LabButton>
      </>}
      extras={null}
    />
  )
}
