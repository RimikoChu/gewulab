// 电功率和生活用电 · 第 3 课 额定功率和实际功率：电工值班室的工作台。学生电源 4.5 V、开关、电流表、滑动变阻器和标着“2.5 V 0.3 A”的小灯泡串联，
// 电压表接在灯两端。把灯两端的电压调到 2.5 V（额定）、2.0 V、3.0 V，各记一组电流，算出实际功率，看灯的亮度。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { BULB, L3, glow, lampAt, pForLampU, powerUI, readA02, readV } from './physics'
import { useSettled, useTween, f1, f2 } from './parts'
import { Big, Table } from './views'
import { Place } from './world'
import { Cm, type V3 } from './layout'
import { BLACK, Bulb, KnifeSwitch, Meter, RED, Rheostat, Supply, Wire, add, bulbPosts, meterPosts, rheoPosts, supPosts, switchPosts } from './bench'

const TASKS: Task[] = [
  { id: '2.5', text: '闭合开关，把电压调到 2.5 V，记一组', note: '2.5 V、0.30 A：0.75 W，正常发光' },
  { id: '2', text: '调到 2.0 V，再记一组', note: '实际电压低于额定电压，灯较暗' },
  { id: '3', text: '调到 3.0 V，再记一组', note: '实际电压高于额定电压，灯更亮' },
]
/** 台面上这一课的中心（场景坐标）和各样器材的位置（厘米，相对中心） */
const C: V3 = [92.2, 8, -41.6]
const POS = { sup: [-21, 0, -9] as V3, sw: [-9, 0, 7] as V3, amp: [1, 0, -11] as V3, rh: [5, 0, 8] as V3, bulb: [21, 0, 2] as V3, volt: [23, 0, -12] as V3 }
const W = (p: V3): V3 => [C[0] + p[0] * 0.1, C[1] + p[1] * 0.1, C[2] + p[2] * 0.1]
const key = (u: number) => u === 2.5 ? '2.5' : u === 2 ? '2' : '3'

export default function Lesson3() {
  const [on, setOn] = useState(false)
  const [rows, setRows] = useState<{ u: number; i: number }[]>([])
  const T = useTasks('gewu:power:3', TASKS)
  const p = useTween(1, 0.3)
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99
  const c = lampAt(p.x * L3.rMax), uR = readV(c.u), iR = readA02(c.i)
  const settled = useSettled(`${on}${p.x.toFixed(4)}`, 1200) && live && !p.moving
  const target = L3.targets.find(t => !rows.some(r => r.u === t))
  const atTarget = target !== undefined && Math.abs(uR - target) < 1e-6
  const dup = rows.some(r => r.u === uR)
  const record = () => { if (!settled || dup || !atTarget) return; const n = [...rows, { u: uR, i: iR }]; setRows(n); T.check(id => n.some(r => key(r.u) === id)) }
  const goto = () => { if (target !== undefined) p.go(pForLampU(target)) }
  const resetAll = () => { setOn(false); p.snap(1); setRows([]); T.reset() }
  const P = live ? powerUI(c.u, c.i) : 0

  const task = T.current
  const { hint, next }: { hint: string; next: 'switch' | 'goto' | 'record' | null } = !task ? { hint: '灯的亮度由它的实际功率决定。', next: null }
    : !on ? { hint: '滑片已经放在阻值最大的一端。闭合开关', next: 'switch' }
    : !live ? { hint: '合上开关…', next: null }
    : p.moving ? { hint: '移动滑片，电压表的示数在变…', next: null }
    : !settled ? { hint: '等指针停稳…', next: null }
    : atTarget && !dup ? { hint: `读两只表，按“记录数据”：${f1(uR)} V，${f2(iR)} A`, next: 'record' }
    : { hint: `把灯两端的电压调到 ${f1(target!)} V`, next: 'goto' }

  const S = supPosts(), SW = switchPosts(), A = meterPosts(), R = rheoPosts(), B = bulbPosts(), V = meterPosts()
  const I = live ? c.i : 0
  const wires = <>
    <Wire a={add(POS.sup, S.plus)} b={add(POS.sw, SW.a)} color={RED} flow={I} />
    <Wire a={add(POS.sw, SW.b)} b={add(POS.amp, A.lo)} color={RED} flow={I} />
    <Wire a={add(POS.amp, A.neg)} b={add(POS.rh, R.lo)} color={BLACK} flow={I} via={[[-4, 0.2, 2]]} />
    <Wire a={add(POS.rh, R.hi)} b={add(POS.bulb, B.a)} color={BLACK} flow={I} />
    <Wire a={add(POS.bulb, B.b)} b={add(POS.sup, S.minus)} color={BLACK} flow={I} via={[[29, 0.2, 9], [26, 0.2, 15], [-10, 0.2, 16], [-17, 0.2, 7]]} />
    <Wire a={add(POS.volt, V.lo)} b={add(POS.bulb, B.a)} color={RED} lift={2.4} />
    <Wire a={add(POS.volt, V.neg)} b={add(POS.bulb, B.b)} color={BLACK} lift={3.2} via={[[27, 0.2, -3]]} />
  </>
  const labels: Label[] = [
    { id: 'u', at: W(add(POS.volt, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>U</small>{f1(uR)} V</> },
    { id: 'i', at: W(add(POS.amp, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>I</small>{f2(iR)} A</> },
    { id: 'p', at: W(add(POS.bulb, [0, 10, 0])), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: live && settled ? 1 : 0 }, children: <><small>实际功率</small>{f2(powerUI(uR, iR))} W</> },
    { id: 'n1', at: W(add(POS.bulb, [0, -1, 4])), ax: 0.5, name: true, className: 'scene-name', children: '小灯泡 2.5 V 0.3 A' },
    { id: 'n2', at: W(add(POS.sup, [0, 12, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '学生电源 4.5 V' },
    { id: 'n3', at: W(add(POS.rh, [-13, 3, 3])), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '滑动变阻器 20 Ω' },
  ]
  return (
    <LabShell title="电功率和生活用电" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="电路"
      stage={<Place at="l3" labels={labels}>
        <Cm p={C}>
          <group position={POS.sup}><Supply u={L3.us} on /></group>
          <group position={POS.sw}><KnifeSwitch close={knife} /></group>
          <group position={POS.amp}><Meter kind="A" k={live ? c.i / 0.6 : 0} /></group>
          <group position={POS.volt}><Meter kind="V" k={live ? c.u / 3 : 0} /></group>
          <group position={POS.rh}><Rheostat p={p.x} /></group>
          <group position={POS.bulb}><Bulb b={live ? glow(P) : 0} /></group>
          {wires}
        </Cm>
      </Place>}
      lesson={<LessonBlock no="3" title="额定功率和实际功率" concept="灯的亮度由实际功率决定" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用电器正常工作时的电压叫额定电压，在额定电压下工作时的功率叫额定功率。“2.5 V 0.3 A”的小灯泡，额定功率 P = UI = 2.5 V × 0.3 A = 0.75 W。</p>
          <p className="mt-3">实际电压低于额定电压时，实际功率小于额定功率，灯较暗；高于额定电压时，实际功率大于额定功率，灯更亮，但容易烧坏。<b className="text-white">灯的亮度由实际功率决定。</b></p>
          <p className="mt-3 text-[13.5px] text-white/65">实验时电压最高调到额定电压的 1.2 倍左右（这里是 3.0 V），不能再高。每次算出的功率不同，不能求平均值。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据比一比</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">电压越高，实际功率越大，灯越亮</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">2.5 V 时 0.75 W，正常发光；2.0 V 时 0.52 W，较暗；3.0 V 时 1.02 W，更亮。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-3 gap-1">
            <Big label="电压表" value={live ? f1(uR) : '—'} unit="V" dim={!settled} />
            <Big label="电流表" value={live ? f2(iR) : '—'} unit="A" dim={!settled} />
            <Big label="P = UI" value={live ? f2(powerUI(uR, iR)) : '—'} unit="W" dim={!settled} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="U额" value={f1(BULB.u)} unit="V · 额定电压" />
            <ParamTile symbol="P额" value={f2(BULB.u * BULB.i)} unit="W · 额定功率" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">数据</h2>
          <div className="mt-1.5"><Table head={['U / V', 'I / A', 'P / W', '亮度']} rows={rows.map(r => [f1(r.u), f2(r.i), f2(powerUI(r.u, r.i)), r.u === 2.5 ? '正常' : r.u < 2.5 ? '较暗' : '更亮'])} hl={rows.length - 1} /></div>
          {!rows.length && <p className="mt-1 text-center text-[13px] text-white/45">还没有记录</p>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={knife > 0.01 && knife < 0.99}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton pulse={next === 'goto'} onClick={goto} disabled={!live || p.moving || target === undefined}>{`调到 ${f1(target ?? 3)} V`}</LabButton>
        <LabButton primary={next === 'record'} pulse={next === 'record'} onClick={record} disabled={!settled || dup || !atTarget}>记录数据</LabButton>
      </>}
      extras={null}
    />
  )
}
