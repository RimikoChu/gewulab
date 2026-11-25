// 电功率和生活用电 · 第 7 课 家庭电路中电流过大的原因：厨房。台面上一只插线板接在墙上的插座上，配电箱里厨房插座这一路是 16 A 的空气开关。
// 一样样插上电饭煲、电水壶、电烤箱，总功率越来越大，总电流 I = P/U 超过 16 A，空气开关跳闸；拔掉电烤箱再合上。
// 换成保险丝，电水壶的电线绝缘皮破了，火线和零线碰在一起——短路，电流极大，保险丝立刻熔断。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { KITCHEN, U_HOME, amps, breakerTrips, kitchenP, shortI } from './physics'
import { useLater, f0, f1 } from './parts'
import { Big } from './views'
import { Place } from './world'
import { BACK, COUNTER, Cm, DB, KIT_SOCKETS, type V3 } from './layout'
import { Cord, Kettle, Oven, Plug, PowerStrip, RiceCooker, STRIP_SLOTS } from './home'
import { BOX_ON, Spark, modX } from './panel'

const TASKS: Task[] = [
  { id: 'two', text: '插上电饭煲和电水壶，看总电流', note: '2700 W，12.3 A：没超过 16 A' },
  { id: 'trip', text: '再插上电烤箱', note: '4700 W，21.4 A：总功率过大，空气开关跳闸' },
  { id: 'back', text: '拔掉电烤箱，重新合上空气开关', note: '总功率小了，电路恢复' },
  { id: 'short', text: '换成保险丝，看电线短路时会怎样', note: '短路电流极大，保险丝立刻熔断' },
]
type Dev = 'breaker' | 'fuse'
const Y = COUNTER.y
const POS = { oven: [-25.4, Y, -42.4] as V3, cooker: [-19.8, Y, -42.6] as V3, kettle: [-14.8, Y, -42.4] as V3, strip: [-20, Y, -39.9] as V3 }
const ITEMS = ['cooker', 'kettle', 'oven'] as const
/** 插线板上第 i 个孔位的场景坐标 */
const slot = (i: number): V3 => [POS.strip[0] + STRIP_SLOTS[i] * 0.1, Y + 0.36, POS.strip[2]]
/** 电水壶电线上破了皮的那一处 */
const DAMAGE: V3 = [(POS.strip[0] + STRIP_SLOTS[1] * 0.1 + POS.kettle[0]) / 2, Y + 0.04, POS.kettle[2] + 1.6]

export default function Lesson7() {
  const [n, setN] = useState(0)                   // 插上了几样
  const [on, setOn] = useState(true)              // 空气开关合着（或保险丝完好）
  const [dev, setDev] = useState<Dev>('breaker')
  const [shorted, setShorted] = useState(false)
  const [spark, setSpark] = useState(0)
  const [pending, setPending] = useState(false)   // 过载，过一会儿才跳
  const T = useTasks('gewu:power:7', TASKS)
  const later = useLater()
  const P = on ? kitchenP(n) : 0, I = on ? (shorted ? shortI() : amps(P)) : 0
  const plug = () => {
    if (!on || pending || n >= 3) return
    const m = n + 1; setN(m)
    if (m === 2) T.check(id => id === 'two')
    if (breakerTrips(amps(kitchenP(m)))) { setPending(true); later.after(2200, () => { setPending(false); setOn(false); setSpark(performance.now()); T.check(id => id === 'trip') }) }
  }
  const unplug = () => { if (pending) return; setN(2) }
  const restore = () => { if (on || pending) return; if (breakerTrips(amps(kitchenP(n)))) return; setOn(true); setShorted(false); if (T.done.trip && n === 2 && dev === 'breaker') T.check(id => id === 'back') }
  const short = () => { if (!on || pending) return; setShorted(true); setSpark(performance.now()); later.after(120, () => { setOn(false); if (dev === 'fuse') T.check(id => id === 'short') }) }
  const pick = (d: Dev) => { if (pending) return; setDev(d); setOn(true); setShorted(false) }
  const resetAll = () => { later.clear(); setN(0); setOn(true); setDev('breaker'); setShorted(false); setPending(false); setSpark(0); T.reset() }

  const task = T.current
  const { hint, next, want }: { hint: string; next: 'plug' | 'unplug' | 'restore' | 'dev' | 'short' | null; want?: Dev } = !task ? { hint: '总功率过大和短路，都会使电路中的电流过大。', next: null }
    : pending ? { hint: '总电流超过了 16 A…', next: null }
    : task.id === 'two' || task.id === 'trip' ? (n < 3 ? { hint: `插上${KITCHEN.items[n].name}`, next: 'plug' } : { hint: '等一等…', next: null })
    : task.id === 'back' ? (n === 3 ? { hint: '拔掉电烤箱', next: 'unplug' } : !on ? { hint: '总功率小了。重新合上空气开关', next: 'restore' } : { hint: '空气开关合上了', next: null })
    : dev !== 'fuse' ? { hint: '老房子用的是保险丝。换成保险丝', next: 'dev', want: 'fuse' }
    : !on ? { hint: '换上新保险丝', next: 'restore' }
    : { hint: '电水壶的电线破了皮，火线和零线碰在一起。让电线短路', next: 'short' }

  const bk: V3 = [DB[0] + modX.kitchen * 0.1, DB[1] + 0.2, DB[2] + 0.8]
  const labels: Label[] = [
    { id: 'I', at: [POS.strip[0], Y + 3.4, POS.strip[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: shorted && I ? <><small>短路电流</small>约 {f0(I)} A</> : <><small>总电流</small>{f1(I)} A</> },
    { id: 'bk', at: [bk[0] + 2.4, bk[1], bk[2]], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>{dev === 'fuse' ? '保险丝' : '空气开关'} 16 A</small>{dev === 'fuse' ? (on ? '完好' : '熔断') : (on ? '合着' : '跳闸')}</> },
    { id: 'dmg', at: [DAMAGE[0], DAMAGE[1] + 0.3, DAMAGE[2] + 0.3], ax: 0, className: 'scene-name', name: true, children: '破损的电线' },
    ...ITEMS.map(k => ({ id: k, at: [POS[k][0], POS[k][1] - 0.4, POS[k][2] + 3.4] as V3, ax: 0.5, name: true, className: 'scene-name', children: `${KITCHEN.items.find(x => x.key === k)!.name} ${KITCHEN.items.find(x => x.key === k)!.p} W` })),
  ]
  const live = (i: number) => on && n > i && !shorted
  return (
    <LabShell title="电功率和生活用电" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="插线板"
      stage={<Place at={dev === 'fuse' || pending || !on ? 'l7b' : 'l7'} labels={labels} world={{ box: { ...BOX_ON, kitchen: on, fuse: dev === 'fuse' ? (on ? 'ok' : 'blown') : null } }}>
        <Cm p={POS.cooker}><RiceCooker on={live(0)} /></Cm>
        <Cm p={POS.kettle} yaw={1.1}><Kettle on={live(1)} /></Cm>
        <Cm p={POS.oven}><Oven on={live(2)} /></Cm>
        <Cm p={POS.strip}><PowerStrip lit={on} /></Cm>
        {/* 插头：插上的立在插线板上，没插的躺在台面上 */}
        {ITEMS.map((k, i) => n > i
          ? <Cm key={k} p={slot(i)}><group rotation-x={Math.PI / 2}><Plug three={k !== 'kettle'} /></group></Cm>
          : <Cm key={k} p={[slot(i)[0] + 0.2, Y + 0.12, POS.strip[2] + 1.3]}><group rotation-x={-Math.PI / 2}><Plug three={k !== 'kettle'} /></group></Cm>)}
        <Cm p={[0, 0, 0]}>
          {ITEMS.map((k, i) => { const s = n > i ? slot(i) : [slot(i)[0] + 0.2, Y, POS.strip[2] + 1.3 + 0.4]; const a = POS[k]; return <Cord key={k} pts={[[s[0] * 10, (n > i ? Y + 0.7 : Y + 0.25) * 10, (s[2] - 0.35) * 10], [s[0] * 10 + 1, Y * 10 + 0.4, (s[2] - 1.2) * 10], [(s[0] + a[0]) * 5, Y * 10 + 0.4, (a[2] + 1.2) * 10 + 4], [a[0] * 10 + (k === 'oven' ? 18 : 6), Y * 10 + 1, a[2] * 10 - (k === 'oven' ? 10 : 6)]]} r={0.3} color={k === 'kettle' ? '#2a2b2d' : '#f1f0ec'} /> })}
          {/* 插线板的电线插在墙上的插座里 */}
          <Cord pts={[[POS.strip[0] * 10 + 20, Y * 10 + 1.5, POS.strip[2] * 10], [POS.strip[0] * 10 + 26, Y * 10 + 0.4, POS.strip[2] * 10 - 6], [KIT_SOCKETS[1][0] * 10, Y * 10 + 0.5, BACK * 10 + 3], [KIT_SOCKETS[1][0] * 10, KIT_SOCKETS[1][1] * 10 - 6, BACK * 10 + 2.6]]} r={0.35} />
        </Cm>
        <Cm p={[KIT_SOCKETS[1][0], KIT_SOCKETS[1][1] - 0.2, BACK + 0.1]}><Plug three /></Cm>
        {/* 破了皮的一段：露出两股铜线 */}
        <Cm p={DAMAGE}>{[-0.25, 0.25].map(z => <mesh key={z} position={[0, 0.3, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.14, 0.14, 1.6, 8]} /><meshStandardMaterial color="#c9824a" metalness={1} roughness={0.35} /></mesh>)}</Cm>
        <Spark at={shorted ? DAMAGE : bk} t={spark} />
      </Place>}
      lesson={<LessonBlock no="7" title="电流过大的原因" concept="总功率过大和短路都会使电流过大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>家庭电路的电压 U = 220 V 不变，由 P = UI，<b className="text-white">同时使用的用电器总功率越大，电路中的总电流越大</b>。插上电饭煲、电水壶、电烤箱，总功率 4700 W，总电流 I = P/U ≈ 21.4 A，超过了 16 A。</p>
          <p className="mt-3"><b className="text-white">短路</b>时，电流不经过用电器，火线和零线直接连通，电路中的电阻很小，电流非常大，可能引起火灾。</p>
          <p className="mt-3 text-[13.5px] text-white/65">保险丝用电阻比较大、熔点比较低的铅锑合金制成，电流过大时自动熔断，切断电路；不能用铜丝、铁丝代替。空气开关在电流过大时“跳闸”，排除故障后可以重新合上。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种原因</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">总功率过大和短路，都会使电流过大</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">保险丝熔断、空气开关跳闸，切断电路，保护线路不因过热起火。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Big label="总功率" value={on && !shorted ? f0(P) : '—'} unit="W" />
            <Big label="总电流" value={shorted && I ? f0(I) : f1(I)} unit="A" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="U" value={String(U_HOME)} unit="V" />
            <ParamTile symbol="I额" value={String(KITCHEN.breaker)} unit={`A · ${dev === 'fuse' ? '保险丝' : '空气开关'}`} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">插在插线板上的</h2>
          <div className="mt-1.5 flex flex-col gap-1 text-[13.5px] tabular-nums">
            {KITCHEN.items.map((x, i) => <div key={x.key} className={`flex justify-between rounded-lg px-2.5 py-1.5 ${n > i ? 'bg-white/10' : 'bg-white/[0.03] text-white/40'}`}><span>{x.name}</span><span>{x.p} W · {f1(amps(x.p))} A</span></div>)}
          </div>
          <p className="mt-3 text-center font-formula text-[15px] italic text-white/65">I = P / U</p>
          {shorted && <p className="hint-in mt-1 text-center text-[12.5px] text-white/50">短路电流按导线回路电阻 0.5 Ω 估算（示意）</p>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'plug' || next === 'unplug'} onClick={n === 3 && !on ? unplug : plug} disabled={pending || (n === 3 ? on : !on)}>{n === 3 ? '拔掉电烤箱' : '插上下一个电器'}</LabButton>
        <LabButton primary={next === 'restore'} pulse={next === 'restore'} onClick={restore} disabled={on || pending || breakerTrips(amps(kitchenP(n)))}>{dev === 'fuse' ? '换上新保险丝' : '合上空气开关'}</LabButton>
        <LabButton primary={next === 'short'} pulse={next === 'short'} onClick={short} disabled={!on || pending || n < 2}>让电线短路</LabButton>
      </>}
      extras={
        <Control label="保护装置">
          <Segmented label="保护装置" pulse={next === 'dev'} want={want ?? null} disabled={pending} value={dev} onChange={d => pick(d as Dev)} options={[{ value: 'breaker', label: '空气开关' }, { value: 'fuse', label: '保险丝' }]} />
        </Control>
      }
    />
  )
}
