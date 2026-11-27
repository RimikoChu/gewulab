// 电解和金属防护 · 第 4 课 电解饱和食盐水：氯碱车间最前面一台朝镜头剖开的离子膜单元槽。
// 左边阳极室进精制饱和食盐水、出淡盐水和氯气；右边阴极室进含少量 NaOH 的水、出 NaOH 溶液和氢气；中间一张阳离子交换膜。
// 送电后两室冒泡，放大看膜让谁通过，等转移的电子到 2 mol 时记录三种产物的量。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Bubbles, Puffs } from './fx'
import { ELECTRODE, Legend, Micro, SP, type MicroCfg } from './micro'
import { LESSONS, goLesson } from './lessons'
import { useClock, useRun } from './parts'
import { Fin } from './fin'
import { BRINE, chlorAlkali } from './physics'
import { CELL as C } from './plant'
import { SPOT, Place, type V3 } from './world'

const GOAL = 2, RATE = 0.2          // 转移到 2 mol 电子时记录；读数每秒走 0.2 mol（示意，放慢了）
const TASKS: Task[] = [
  { id: 'on', text: '给电解槽送电', note: '阳极室冒出黄绿色的氯气，阴极室冒出氢气' },
  { id: 'mem', text: '放大看中间的离子交换膜让谁通过', note: '只有 Na⁺ 能穿过去：阴极室里 Na⁺ 和 OH⁻ 聚在一起，就是烧碱溶液' },
  { id: 'rec', text: '转移 2 mol 电子时，记录三种产物的量', note: '1 mol H₂、1 mol Cl₂、2 mol NaOH' },
]
const MICRO: MicroCfg = {
  left: { color: ELECTRODE.titanium, tag: '阳极 +', e: -1, take: { Cl: { to: 'gas', as: 'Cl2' } } },
  right: { color: ELECTRODE.nickel, tag: '阴极 −', e: 1, take: { H: { to: 'gas', as: 'H2' }, Na: { to: 'gone' } }, emit: [{ sp: 'OH', rate: 0.9 }] },
  ions: { Na: 12, Cl: 12, H: 4 }, half: { Na: 'L', Cl: 'L', H: 'R' }, field: -1, membrane: ['Na', 'H'],
}

/** 槽里穿过膜的 Na⁺：几颗紫色的小球从阳极室慢慢漂到阴极室 */
function NaDrift({ on }: { on: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { ref.current?.children.forEach((m, i) => { const k = (clock.elapsedTime * 0.16 + i / 7) % 1; m.position.set(C.x - 1.2 + k * 2.4, C.y0 + 1.6 + (i * 2.9) % (C.h * C.level - 1.6), C.z + 1 + (i % 3) * 0.9); m.visible = on; m.scale.setScalar(Math.sin(k * Math.PI) * 0.22 + 0.02) }) })
  return <group ref={ref}>{Array.from({ length: 7 }, (_, i) => <mesh key={i} renderOrder={9}><sphereGeometry args={[1, 14, 10]} /><meshBasicMaterial color={SP.Na.color} toneMapped={false} /></mesh>)}</group>
}

export default function Lesson4() {
  const [on, setOn] = useState(false)
  const [mem, setMem] = useState(false)
  const [rec, setRec] = useState(false)
  const T = useTasks('gewu:electrolysis:4', TASKS)
  const clock = useClock()
  const look = useRun(5, () => T.check(id => id === 'mem'))
  const start = () => { setOn(true); clock.start(); setTimeout(() => T.check(id => id === 'on'), 1600) }
  const zoom = () => { setMem(true); look.run() }
  const nE = on ? Math.min(GOAL, Math.round(clock.t * RATE * 10) / 10) : 0, full = nE >= GOAL
  const record = () => { if (!full) return; setRec(true); T.check(id => id === 'rec') }
  const resetAll = () => { setOn(false); setMem(false); setRec(false); clock.stop(); look.snap(0); T.reset() }
  const now = chlorAlkali(nE), end = chlorAlkali(GOAL)
  const task = T.current
  const { hint, next }: { hint: string; next: 'on' | 'mem' | 'rec' | null } = !task ? { hint: '电解饱和食盐水，同时得到氢气、氯气和烧碱。', next: null }
    : task.id === 'on' ? (on ? { hint: '整流柜送出直流电…', next: null } : { hint: '给电解槽送电', next: 'on' })
    : task.id === 'mem' ? (look.busy ? { hint: 'Na⁺ 穿过膜到了阴极室，Cl⁻ 和 OH⁻ 被挡住…', next: null } : { hint: '两室都在冒气泡。放大看中间那张离子交换膜', next: 'mem' })
    : full ? { hint: '转移了 2 mol 电子。记录三种产物的量', next: 'rec' } : { hint: '转移的电子还不到 2 mol，等一等…', next: null }

  const yaw = SPOT.l4m.view[0], top = C.y0 + C.h, xl = C.x - C.w / 4, xr = C.x + C.w / 4, yb = C.y0 + C.wall, lv = C.h * C.level
  const MIC: V3 = [C.x - 0.5, top + 5.3, C.z + 3.6], mr = 3.8
  const labels: Label[] = [
    { id: 'an', at: [xl - 1.6, yb + lv * 0.5, C.z + 3.3], ax: 0.5, className: 'scene-tag', children: <><small>钛网</small>阳极室</> },
    { id: 'ca', at: [xr + 1.6, yb + lv * 0.5, C.z + 3.3], ax: 0.5, className: 'scene-tag', children: <><small>镍网</small>阴极室</> },
    { id: 'me', at: [C.x, C.y0 - 0.5, C.z + 3.3], ax: 0.5, className: 'scene-tag key', children: '阳离子交换膜' },
    { id: 'cl', at: [xl + 0.9, top + 0.9, C.z - 0.6], className: 'scene-tag -translate-y-1/2', style: { opacity: on ? 1 : 0.55 }, children: 'Cl₂' },
    { id: 'h2', at: [xr + 0.9, top + 0.9, C.z - 0.6], className: 'scene-tag -translate-y-1/2', style: { opacity: on ? 1 : 0.55 }, children: 'H₂' },
    { id: 'in1', at: [C.x - C.w / 2 + 1.4, C.y0 - 2.2, C.z + 2], ax: 1, className: 'scene-name', children: '精制饱和食盐水 →' },
    { id: 'out1', at: [C.x - C.w / 2 - 3.2, C.y0 + C.h * 0.74, C.z], ax: 1, className: 'scene-name -translate-y-1/2', children: '← 淡盐水' },
    { id: 'in2', at: [C.x + C.w / 2 - 1.4, C.y0 - 2.2, C.z + 2], className: 'scene-name', children: '← 水（含少量 NaOH）' },
    { id: 'out2', at: [C.x + C.w / 2 + 3.2, C.y0 + C.h * 0.74, C.z], className: 'scene-name -translate-y-1/2', children: 'NaOH 溶液 →' },
    { id: 'p', at: [C.x - C.w / 2 - 2.2, C.y0 + C.h * 0.45 + 1.2, C.z + 1.6], ax: 1, name: true, className: 'scene-name -translate-y-full', children: '接整流柜正极' },
    { id: 'n', at: [C.x + C.w / 2 + 2.2, C.y0 + C.h * 0.45 + 1.2, C.z + 1.6], name: true, className: 'scene-name -translate-y-full', children: '接整流柜负极' },
    ...(on && !mem ? [{ id: 'na', at: [C.x, yb + lv * 0.72, C.z + 3.3] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: 'Na⁺ →' }] : []),
  ]
  return (
    <LabShell title="电解和金属防护" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="离子膜电解槽"
      stage={<Place at={mem ? 'l4m' : 'l4'} labels={labels}>
        <Bubbles at={[C.x - 1.9, yb + 0.4, C.z + 0.4]} top={lv - 0.6} on={on} rate={70} r={0.11} spread={[0.3, 2.3]} speed={2.4} color="#dff08a" opacity={0.75} seed={2} />
        <Bubbles at={[C.x + 1.9, yb + 0.4, C.z + 0.4]} top={lv - 0.6} on={on} rate={70} r={0.11} spread={[0.3, 2.3]} speed={2.6} opacity={0.95} seed={3} />
        <Puffs at={[xl + 1, yb + lv + 0.5, C.z + 0.6]} on={on} opt={{ rate: 6, life: 2.2, size: [1.6, 3.4], speed: 0.5, color: '#c9dc5a', opacity: 0.22, spread: 0.6, jitter: 2.5 }} seed={7} />
        <NaDrift on={on} />
        {/* 进料、出料、出气的方向 */}
                {mem && <Micro at={MIC} r={mr} yaw={yaw} from={[C.x, C.y0 + C.h * 0.62, C.z + C.d / 2]} cfg={MICRO} on={on} seed={5} />}
      </Place>}
      lesson={<LessonBlock no="4" title="电解饱和食盐水" concept="食盐水通电，得到氢气、氯气和烧碱" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电解饱和食盐水制烧碱、氯气和氢气，是氯碱工业的基础。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>阳极：{BRINE.anodeEq}</li>
            <li>阴极：{BRINE.cathodeEq}</li>
            <li>总反应：{BRINE.total}（条件：电解）</li>
            <li>阳离子交换膜只让 Na⁺ 等阳离子通过，Cl⁻、OH⁻ 和气体过不去：氯气不会和氢气混合，也不会和烧碱反应，得到的烧碱里几乎不含食盐</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">真实的电解槽由许多这样的单元槽压在一起，这里只剖开一个。“转移的电子”读数放慢了，是示意。</p>
        </>} />}
      finale={T.finale && <Fin tag="产量记下了" big="每转移 2 mol 电子：1 mol H₂、1 mol Cl₂、2 mol NaOH">也就是标准状况下 {end.h2L} L 氢气、{end.cl2L} L 氯气和 {end.naohG} g 烧碱。离子交换膜把两室隔开，只让 Na⁺ 通过。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[12.5px] text-white/55">转移的电子（示意）</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{nE.toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">mol</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">产物</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol={<>n(H₂)</>} value={now.h2.toFixed(2)} unit="mol · 阴极" />
            <ParamTile symbol={<>n(Cl₂)</>} value={now.cl2.toFixed(2)} unit="mol · 阳极" />
            <ParamTile symbol="n(NaOH)" value={now.naoh.toFixed(1)} unit="mol · 阴极室" />
          </div>
          {rec && <div className="hint-in mt-3 rounded-xl bg-white/8 px-3.5 py-3 text-[14px] leading-relaxed">转移 2 mol 电子：H₂ {end.h2L} L、Cl₂ {end.cl2L} L（标准状况），NaOH {end.naohG} g。</div>}
          {mem && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">放大窗里的粒子（示意）</h2>
            <Legend items={['Na', 'Cl', 'OH', 'H', 'Cl2', 'H2']} />
          </>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={start} disabled={on}>送电</LabButton>
        <LabButton primary={next === 'mem'} pulse={next === 'mem'} onClick={zoom} disabled={!on || mem}>看离子交换膜</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!full || rec || !T.done.mem}>记录产量</LabButton>
      </>}
      extras={null}
    />
  )
}
