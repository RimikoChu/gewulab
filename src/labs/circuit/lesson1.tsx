// 电路 · 第 1 课 电路的组成：靠窗工作台的西头，一只电池盒、一只灯座和小灯泡、一只单刀开关，三根导线连成一圈。
// 闭合开关灯亮（通路），断开开关灯灭（断路）；再用一根导线把电池盒的两个接线柱直接连起来：灯不亮，电流全从这根导线走，电池发热（短路）。
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { BLACK, BatteryBox, KnifeSwitch, Lamp, RED, add, boxPosts, lampPosts, switchPosts } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Bench, Place, toWorld } from './parts'
import { LOOP_NAME, U0, loopState, singleLamp } from './physics'
import { Schematic } from './views'
import { Wire } from './wires'
import type { V3 } from './world'

const TASKS: Task[] = [
  { id: 'closed', text: '闭合开关，让灯泡亮起来', note: '通路：电流从电池的正极出发，经过灯泡、开关，回到负极' },
  { id: 'open', text: '断开开关，看灯泡和电流', note: '断路：电路断开了一处，电流就停了，灯不亮' },
  { id: 'short', text: '闭合开关，再用一根导线把电池盒的两个接线柱直接连起来', note: '短路：电流不经过灯泡，从这根导线直接回到负极。电流很大，电池发热' },
  { id: 'safe', text: '赶快拿掉这根导线', note: '短路会烧坏电源，甚至引起火灾，绝不允许' },
]
// 桌上的布置（cm）：电池盒在左后，灯座在右后，开关在前面正中
const BAT: V3 = [-8, 0, -4], LAMP: V3 = [9, 0, -4], SW: V3 = [1, 0, 6]
const BP = boxPosts(2), LP = lampPosts(), SP = switchPosts()
const bPlus = add(BAT, BP.plus), bMinus = add(BAT, BP.minus), lA = add(LAMP, LP.a), lB = add(LAMP, LP.b), sA = add(SW, SP.a), sB = add(SW, SP.b)
const W = (p: V3) => toWorld('l1', p)

export default function Lesson1() {
  const [on, setOn] = useState(false)
  const [short, setShort] = useState(false)
  const [seen, setSeen] = useState({ closed: false, open: false })
  const T = useTasks('gewu:circuit:1', TASKS)
  const state = loopState(on, short), c = singleLamp(state)
  const knife = useSlide(on ? 1 : 0, 2.6)
  const hot = useSlide(state === 'short' ? 1 : 0, state === 'short' ? 0.4 : 0.8)
  const flowing = knife > 0.99 && state === 'closed'
  const toggle = () => {
    const n = !on; setOn(n)
    if (n && !short) { setSeen(s => ({ ...s, closed: true })); T.check(id => id === 'closed') }
    if (!n && seen.closed) { setSeen(s => ({ ...s, open: true })); T.check(id => id === 'open') }
  }
  const toggleShort = () => {
    const n = !short; setShort(n)
    if (n && on && T.done.open) T.check(id => id === 'short')
    if (!n && T.done.short) T.check(id => id === 'safe')
  }
  const resetAll = () => { setOn(false); setShort(false); setSeen({ closed: false, open: false }); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'sw' | 'short' | null } = !task ? { hint: '电流要有一条闭合的路才流得动；电源两极绝不能用导线直接连起来。', next: null }
    : task.id === 'closed' ? (short ? { hint: '先拿掉短路的导线', next: 'short' } : { hint: '按“闭合开关”：刀片合上，电路就连成了一圈', next: 'sw' })
    : task.id === 'open' ? { hint: '灯亮了，亮点是电流的方向。按“断开开关”', next: 'sw' }
    : task.id === 'short' ? (!on ? { hint: '再按“闭合开关”，让灯亮起来', next: 'sw' } : { hint: '按“接上短路导线”：把电池盒的两个接线柱直接连起来', next: 'short' })
    : { hint: '电池在发热！按“拿掉导线”', next: 'short' }
  const labels: Label[] = [
    { id: 'n1', at: W(add(BAT, [0, 5.2, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电池盒 · 电源' },
    { id: 'n2', at: W(add(LAMP, [0, 5, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '小灯泡 · 用电器' },
    { id: 'n3', at: W(add(SW, [0, 3.8, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '开关' },
    { id: 'n4', at: W([-13, 0.4, 7]), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '导线' },
    { id: 's', at: W(add(BAT, [0, -0.2, 3.4])), ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: state === 'short' ? 1 : 0 }, children: <><small>短路</small>电池发热</> },
  ]
  return (
    <LabShell title="电路" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="电路"
      stage={<Place at="l1" labels={labels}>
        <Bench at="l1">
          <group position={BAT}><BatteryBox n={2} hot={hot} /></group>
          <group position={LAMP}><Lamp lit={knife > 0.99 ? c.lit : 0} name="L₁" /></group>
          <group position={SW}><KnifeSwitch on={knife} /></group>
          <Wire a={bPlus} b={lA} color={RED} flow={flowing ? c.i : 0} via={[[3, 0, -7.5]]} />
          <Wire a={lB} b={sB} color="#d8b33a" flow={flowing ? c.i : 0} via={[[13, 0, 3]]} />
          <Wire a={sA} b={bMinus} color={BLACK} flow={flowing ? c.i : 0} via={[[-14, 0, 4]]} />
          {short && <Wire a={bPlus} b={bMinus} color="#2f62b0" lift={3} flow={Infinity} />}
        </Bench>
      </Place>}
      lesson={<LessonBlock no="1" title="电路的组成" concept="电流要有一条闭合的路才流得动" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用导线把电源、用电器、开关连接起来，就组成了<b className="text-white">电路</b>。电源提供电能，用电器消耗电能，开关控制电路的通断，导线输送电能。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">通路</b>：正常接通的电路，用电器能工作</li>
            <li><b className="text-white">断路</b>：某处断开的电路，电路中没有电流</li>
            <li><b className="text-white">短路</b>：用导线直接把电源两极连起来。电流很大，会损坏电源，是绝不允许的</li>
          </ul>
          <p className="mt-3">在电源外部，电流从电源的正极经过用电器流向负极。画面里的亮点只表示电流的方向；金属导线里真正在移动的是自由电子，它们移动的方向和电流方向相反。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种状态都见过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">电路要连成一圈才有电流；电源两极绝不能用导线直接相连</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">通路灯亮；断路没有电流；短路时电流不经过灯泡，从导线直接回到负极，电流很大，会烧坏电源。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">电路的状态</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight" style={{ color: state === 'short' ? '#ff8a7a' : state === 'closed' ? '#7fe3d4' : undefined }}>{LOOP_NAME[state]}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="U" value={`${U0.toFixed(1)} V`} unit="电源 · 两节干电池" />
            <ParamTile symbol="L₁" value={c.lit > 0 && knife > 0.99 ? '亮' : '不亮'} unit="小灯泡" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">电路图</h2>
          <Schematic link="single" on={on} lit1={knife > 0.99 ? c.lit : 0} short={short} hot={{ main: flowing }} />
          <h2 className="mt-4 text-[12.5px] text-white/55">电路的组成</h2>
          <ul className="mt-2 grid grid-cols-4 gap-1 text-center text-[12.5px]">
            {['电源', '用电器', '开关', '导线'].map(n => <li key={n} className="rounded-lg bg-white/6 px-0.5 py-2 text-white/80">{n}</li>)}
          </ul>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'sw'} pulse={next === 'sw'} onClick={toggle}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton primary={next === 'short'} pulse={next === 'short'} onClick={toggleShort} disabled={short ? hot < 0.55 : !(T.done.open && on) && !T.finale}>{short ? '拿掉导线' : '接上短路导线'}</LabButton>
      </>}
      extras={null}
    />
  )
}
