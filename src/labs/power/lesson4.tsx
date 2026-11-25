// 电功率和生活用电 · 第 4 课 焦耳定律：工作台东头。两只烧瓶里装着质量相等、初温相同的煤油，瓶里的电阻丝 5 Ω、10 Ω 串联，
// 再和滑动变阻器、电流表、开关接到学生电源上。通电以后看两支温度计：电阻大的升温多；通电时间加倍，升温加倍；电流加倍，升温变成 4 倍。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { JOULE, heat, rise } from './physics'
import { useRun, useTween, f0, f1 } from './parts'
import { Big, Table } from './views'
import { Place } from './world'
import { Cm, type V3 } from './layout'
import { BLACK, Flask, KnifeSwitch, Meter, RED, Rheostat, Supply, Wire, add, flaskPosts, meterPosts, rheoPosts, supPosts, switchPosts } from './bench'

const TASKS: Task[] = [
  { id: 'a', text: '电流 1.0 A，通电 2 分钟，记下两瓶的温度', note: '10 Ω 那瓶升温是 5 Ω 的 2 倍' },
  { id: 'b', text: '再通电 2 分钟，记下温度', note: '通电时间加倍，升温也加倍' },
  { id: 'c', text: '换新煤油，电流调到 2.0 A，通电 2 分钟，记下温度', note: '电流加倍，升温变成 4 倍' },
]
type Cur = '1' | '2'
const C: V3 = [111.4, 8, -41.6]
const POS = { sup: [-21, 0, -10] as V3, sw: [-14, 0, 8] as V3, amp: [-4, 0, -11] as V3, rh: [2, 0, 4.5] as V3, f1: [12, 0, -4] as V3, f2: [25, 0, -4] as V3 }
const Wd = (p: V3): V3 => [C[0] + p[0] * 0.1, C[1] + p[1] * 0.1, C[2] + p[2] * 0.1]

export default function Lesson4() {
  const [cur, setCur] = useState<Cur>('1')
  const [t, setT] = useState(0)                       // 这瓶煤油已经通电多少秒
  const [base, setBase] = useState<[number, number]>([JOULE.t0, JOULE.t0])
  const [rows, setRows] = useState<{ i: number; t: number; d1: number; d2: number; id: string }[]>([])
  const T = useTasks('gewu:power:4', TASKS)
  const I = cur === '1' ? 1 : 2
  const run = useRun(5, () => { setT(x => x + JOULE.step); setBase(b => [b[0] + rise(I, JOULE.r1, JOULE.step), b[1] + rise(I, JOULE.r2, JOULE.step)]) })
  const dt = run.busy ? run.k * JOULE.step : 0
  const temp1 = base[0] + rise(I, JOULE.r1, dt), temp2 = base[1] + rise(I, JOULE.r2, dt)
  const rh = useTween(0.7, 0.5); const rhGoal = cur === '1' ? 0.7 : 0.25
  useEffect(() => { rh.go(rhGoal) }, [rhGoal])   // eslint-disable-line react-hooks/exhaustive-deps
  const live = run.busy
  const which = (): string | null => {
    if (run.busy) return null
    // 只有从新煤油开始、一直用同一个电流加热的数据才算数
    if (rows.some(r => r.t === t && r.i === I && Math.abs(r.d2 - (base[1] - JOULE.t0)) < 1e-9)) return null
    if (I === 1 && t === 120) return 'a'
    if (I === 1 && t === 240) return 'b'
    if (I === 2 && t === 120) return 'c'
    return null
  }
  const [mix, setMix] = useState(false)               // 中途换过电流：这瓶煤油的数据不能用
  const rec = mix ? null : which()
  const record = () => { if (!rec) return; const r = [...rows, { i: I, t, d1: base[0] - JOULE.t0, d2: base[1] - JOULE.t0, id: rec }]; setRows(r); T.check(id => r.some(x => x.id === id)) }
  const fresh = () => { if (run.busy) return; setT(0); setBase([JOULE.t0, JOULE.t0]); setMix(false) }
  const pick = (c: Cur) => { if (run.busy) return; if (t > 0 && c !== cur) setMix(true); setCur(c) }
  const resetAll = () => { run.snap(0); setCur('1'); setT(0); setBase([JOULE.t0, JOULE.t0]); setRows([]); setMix(false); rh.snap(0.7); T.reset() }

  const task = T.current
  const has = (id: string) => rows.some(r => r.id === id)
  const { hint, next, want }: { hint: string; next: 'heat' | 'fresh' | 'rec' | 'cur' | null; want?: Cur } = !task ? { hint: '电流通过导体产生的热量 Q = I²Rt。', next: null }
    : run.busy ? { hint: '通电加热中，看两支温度计…', next: null }
    : rec && !has(rec) ? { hint: `两支温度计：5 Ω 瓶 ${f1(temp1)} ℃，10 Ω 瓶 ${f1(temp2)} ℃。按“记录数据”`, next: 'rec' }
    : task.id === 'a' ? (mix || t > 0 && I !== 1 || t > 120 ? { hint: '换一瓶新煤油，重新开始', next: 'fresh' } : I !== 1 ? { hint: '把电流调到 1.0 A', next: 'cur', want: '1' } : { hint: '闭合开关，通电 2 分钟', next: 'heat' })
    : task.id === 'b' ? (mix || I !== 1 || t !== 120 ? (t === 0 && I === 1 ? { hint: '闭合开关，通电 2 分钟', next: 'heat' } : t === 0 ? { hint: '把电流调到 1.0 A', next: 'cur', want: '1' } : { hint: '换一瓶新煤油，重新开始', next: 'fresh' }) : { hint: '电流不变，再通电 2 分钟', next: 'heat' })
    : t > 0 && !(I === 2 && t < 120 && !mix) ? { hint: '换一瓶新煤油：两瓶都回到 20.0 ℃', next: 'fresh' }
    : I !== 2 ? { hint: '把电流调到 2.0 A', next: 'cur', want: '2' }
    : { hint: '闭合开关，通电 2 分钟', next: 'heat' }

  const S = supPosts(), SW = switchPosts(), A = meterPosts(), R = rheoPosts(), F = flaskPosts()
  const flow = live ? I : 0
  const labels: Label[] = [
    { id: 't1', at: Wd(add(POS.f1, [0, 24, 0])), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>5 Ω</small>{f1(temp1)} ℃</> },
    { id: 't2', at: Wd(add(POS.f2, [0, 24, 0])), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>10 Ω</small>{f1(temp2)} ℃</> },
    { id: 'i', at: Wd(add(POS.amp, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>I</small>{f1(I)} A</> },
    { id: 'n1', at: Wd(add(POS.f1, [-5, 2, 4])), ax: 1, name: true, className: 'scene-name', children: '煤油 0.1 kg' },
    { id: 'n2', at: Wd(add(POS.f2, [5, 2, 4])), ax: 0, name: true, className: 'scene-name', children: '电阻丝串联' },
  ]
  return (
    <LabShell title="电功率和生活用电" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="加热"
      stage={<Place at="l4" labels={labels}>
        <Cm p={C}>
          <group position={POS.sup}><Supply u={12} on /></group>
          <group position={POS.sw}><KnifeSwitch close={live ? 1 : 0} /></group>
          <group position={POS.amp}><Meter kind="A" k={live ? I / 3 : 0} /></group>
          <group position={POS.rh}><Rheostat p={rh.x} /></group>
          <group position={POS.f1}><Flask temp={temp1} heat={live ? I / 2 * 0.5 : 0} /></group>
          <group position={POS.f2}><Flask temp={temp2} heat={live ? I / 2 : 0} /></group>
          <Wire a={add(POS.sup, S.plus)} b={add(POS.sw, SW.a)} color={RED} flow={flow} />
          <Wire a={add(POS.sw, SW.b)} b={add(POS.amp, A.hi)} color={RED} flow={flow} via={[[-6, 0.2, 10], [4, 0.2, 9], [4, 0.2, -4]]} />
          <Wire a={add(POS.amp, A.neg)} b={add(POS.rh, R.lo)} color={BLACK} flow={flow} via={[[-11, 0.2, -2]]} />
          <Wire a={add(POS.rh, R.hi)} b={add(POS.f1, F.a)} color={BLACK} flow={flow} lift={3} />
          <Wire a={add(POS.f1, F.b)} b={add(POS.f2, F.a)} color={BLACK} flow={flow} lift={2} />
          <Wire a={add(POS.f2, F.b)} b={add(POS.sup, S.minus)} color={BLACK} flow={flow} lift={2} via={[[32, 0.2, 4], [26, 0.2, 14], [-14, 0.2, 15], [-21, 0.2, 6]]} />
        </Cm>
      </Place>}
      lesson={<LessonBlock no="4" title="焦耳定律" concept="电流产生的热量 Q = I²Rt" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电流通过导体时电能转化为内能，这叫电流的热效应。两段电阻丝串联，通过它们的电流和通电时间都相同，电阻大的放出的热量多。</p>
          <p className="mt-3"><b className="text-white">焦耳定律：电流通过导体产生的热量跟电流的二次方成正比，跟导体的电阻成正比，跟通电时间成正比。Q = I²Rt。</b></p>
          <p className="mt-3 text-[13.5px] text-white/65">用煤油而不用水：煤油的比热容小，吸收同样的热量温度升高得多，现象明显。这里不计热量损失：Δt = Q/(cm)，c = 2.1×10³ J/(kg·℃)，m = 0.1 kg。电热水壶、电饭煲、电烤箱都是利用电流的热效应工作的。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据比一比</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">电流产生的热量 Q = I²Rt</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">电阻 2 倍，热量 2 倍；时间 2 倍，热量 2 倍；电流 2 倍，热量 4 倍。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Big label="5 Ω 瓶" value={f1(temp1)} unit="℃" />
            <Big label="10 Ω 瓶" value={f1(temp2)} unit="℃" />
          </div>
          <p className="mt-2 text-center text-[12.5px] text-white/50">{run.busy ? `通电 ${f0(t + dt)} s · 时间加快` : t ? `已通电 ${t / 60} 分钟` : '新煤油，初温 20.0 ℃'}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol="I" value={f1(I)} unit="A" />
            <ParamTile symbol="R" value="5 · 10" unit="Ω" />
            <ParamTile symbol="t" value={String(t / 60 + (run.busy ? 2 : 0))} unit="min" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">数据（升高的温度）</h2>
          <div className="mt-1.5"><Table head={['I / A', 't / min', '5 Ω / ℃', '10 Ω / ℃', 'Q₁₀ / J']} rows={rows.map(r => [f1(r.i), String(r.t / 60), f1(r.d1), f1(r.d2), f0(heat(r.i, JOULE.r2, r.t))])} hl={rows.length - 1} /></div>
          {!rows.length && <p className="mt-1 text-center text-[13px] text-white/45">还没有记录</p>}
          <p className="mt-2 text-center font-formula text-[15px] italic text-white/65">Q = I²Rt</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'heat'} pulse={next === 'heat'} onClick={() => run.run()} disabled={run.busy || mix}>{t > 0 ? '再通电 2 分钟' : '通电 2 分钟'}</LabButton>
        <LabButton pulse={next === 'fresh'} onClick={fresh} disabled={run.busy || t === 0}>换新煤油</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!rec || has(rec)}>记录数据</LabButton>
      </>}
      extras={
        <Control label="电流">
          <Segmented label="电流" pulse={next === 'cur'} want={want ?? null} disabled={run.busy} value={cur} onChange={k => pick(k as Cur)} options={[{ value: '1', label: '1.0 A' }, { value: '2', label: '2.0 A' }]} />
        </Control>
      }
    />
  )
}
