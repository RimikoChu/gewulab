// 分子和原子 · 第 2 课 分子在运动：通风橱里。左边试管架上一支酚酞溶液，右边一瓶浓氨水；中间两只小烧杯，
// A 盛约 20 mL 加了酚酞的蒸馏水，B 盛约 5 mL 浓氨水；后面立着一只 1000 mL 的大烧杯。
// 先往试管里的酚酞溶液滴浓氨水，看它变红；再用大烧杯罩住 A、B；等几分钟，A 慢慢变红，B 不变——氨分子从 B 跑到了 A。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, Dropper, Hand, NarrowBottle, TUBE, TestTube, TubeRack, beakerFill } from './gear'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, liftPath, seg, useRun } from './parts'
import { COLD, meanSpeed } from './physics'
import { Callout, MolField } from './mol'
import { BZ, Place, ST, TOP, u, type V3 } from './world'

const X0 = ST.l2, Z0 = BZ + u(0.04)
const A: V3 = [X0 - u(0.024), TOP, Z0], B: V3 = [X0 + u(0.026), TOP, Z0]
const COVER_HOME: V3 = [X0 + u(0.17), TOP, Z0 - u(0.06)], COVER_ON: V3 = [X0, TOP, Z0]
const RACK: V3 = [X0 - u(0.13), TOP, Z0 + u(0.02)], TUBE_AT: V3 = [RACK[0], TOP + u(0.008), RACK[2]]
const BOTTLE: V3 = [X0 + u(0.1), TOP, Z0 + u(0.09)]
const CLEAR = new THREE.Color('#eef3f4'), PINK = new THREE.Color('#e8157a')
const TASKS: Task[] = [
  { id: 'test', text: '往试管里的酚酞溶液中滴几滴浓氨水', note: '浓氨水能使酚酞溶液变红' },
  { id: 'cover', text: '用大烧杯罩住 A、B 两只小烧杯', note: 'A 和 B 没有接触，中间隔着空气' },
  { id: 'wait', text: '等几分钟，看 A 和 B 的颜色', note: 'A 变红了，B 没有变：氨分子运动到了 A 里' },
]
const col = (k: number) => `#${CLEAR.clone().lerp(PINK, k).getHexString()}`

export default function Lesson2() {
  const T = useTasks('gewu:atom:2', TASKS)
  const drip = useRun(4.2, () => T.check(id => id === 'test'))
  const cover = useRun(3.6, () => T.check(id => id === 'cover'))
  const wait = useRun(9, () => T.check(id => id === 'wait'))
  const busy = drip.busy || cover.busy || wait.busy
  const resetAll = () => { drip.snap(0); cover.snap(0); wait.snap(0); T.reset() }

  // 第一步：手拿滴管从氨水瓶里吸，移到试管口上方，捏两下
  const dt = drip.t, over: V3 = [TUBE_AT[0], TOP + u(TUBE.h + 0.035), TUBE_AT[2]], home: V3 = [BOTTLE[0], TOP + u(0.1), BOTTLE[2]]
  const tip: V3 = !drip.busy ? home : dt < 1.4 ? liftPath(home, over, TOP + u(0.24), seg(dt, 0, 1.4)) : dt < 3 ? over : liftPath(over, home, TOP + u(0.24), seg(dt, 3, 4.2))
  const sq = drip.busy ? Math.max(seg(dt, 1.5, 1.75) * (1 - seg(dt, 1.9, 2.1)), seg(dt, 2.2, 2.45) * (1 - seg(dt, 2.6, 2.8))) : 0
  const tubeK = T.done.test ? 1 : drip.busy ? ease(seg(dt, 1.8, 3.4)) : 0
  // 第二步：大烧杯提起来、翻过来、罩到 A 和 B 上
  const ct = cover.t, covered = !!T.done.cover
  const cPos: V3 = covered ? COVER_ON : cover.busy ? liftPath(COVER_HOME, COVER_ON, TOP + u(0.22), seg(ct, 0, 3.4)) : COVER_HOME
  const flip = covered ? 1 : cover.busy ? ease(seg(ct, 0.6, 2.2)) : 0
  // 第三步：几分钟后（画面快进）A 从无色慢慢变成红色
  const aK = T.done.wait ? 1 : wait.busy ? ease(seg(wait.t, 1.5, 8.5)) : 0
  const flow = wait.busy || T.done.wait

  const task = T.current
  const { hint, next }: { hint: string; next: 'test' | 'cover' | 'wait' | null } = !task ? { hint: '没有碰 A，A 却变红了：氨分子不断运动，从 B 跑到了 A 里。', next: null }
    : drip.busy ? { hint: '用滴管吸浓氨水，往试管里滴几滴…', next: null }
    : cover.busy ? { hint: '把大烧杯翻过来，罩住 A 和 B…', next: null }
    : wait.busy ? { hint: '几分钟后…（画面快进）', next: null }
    : task.id === 'test' ? { hint: '先试一试：往试管里的酚酞溶液中滴几滴浓氨水', next: 'test' }
    : task.id === 'cover' ? { hint: '酚酞溶液变红了。现在用大烧杯罩住 A 和 B', next: 'cover' }
    : { hint: 'A 和 B 隔开了，谁也没碰谁。等几分钟，看会发生什么', next: 'wait' }

  const big = BEAKER[1000]
  const v = meanSpeed(17, COLD)
  const labels: Label[] = [
    { id: 'a', at: [A[0] - u(0.03), TOP + u(0.035), Z0 + u(0.02)], ax: 1, className: `scene-tag ${aK > 0.5 ? 'key' : ''} -translate-y-1/2`, children: <><small>A · 酚酞溶液</small>{aK > 0.5 ? '红色' : '无色'}</> },
    { id: 'b', at: [B[0] + u(0.03), TOP + u(0.035), Z0 + u(0.02)], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>B · 浓氨水</small>无色</> },
    { id: 't', at: [RACK[0] - u(0.022), TOP + u(0.1), RACK[2]], ax: 1, className: `scene-tag ${tubeK > 0.5 ? 'key' : ''} -translate-y-1/2 transition-opacity`, style: { opacity: covered ? 0 : 1 }, children: <><small>试管</small>{tubeK > 0.5 ? '变红' : '无色'}</> },
    { id: 'm', at: [X0 - u(0.04), TOP + u(0.135), Z0 + u(0.03)], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: flow ? 1 : 0 }, children: '放大示意：氨分子（蓝色）在空气中运动' },
    { id: 'n1', at: [BOTTLE[0], TOP - u(0.006), BOTTLE[2] + u(0.04)], ax: 0.5, name: true, className: 'scene-name', children: '浓氨水' },
    { id: 'n2', at: [COVER_HOME[0], TOP - u(0.006), COVER_HOME[2] + u(0.06)], ax: 0.5, name: true, className: 'scene-name', children: '大烧杯' },
  ]
  return (
    <LabShell title="分子和原子" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="操作"
      stage={<Place at="l2" labels={labels}>
        <group position={A}><Beaker vol={50} fill={beakerFill(50, 20)} color={col(aK)} opacity={0.35 + aK * 0.55} /></group>
        <group position={B}><Beaker vol={50} fill={beakerFill(50, 5)} color="#eef4f4" opacity={0.35} /></group>
        {/* 大烧杯：翻转时绕杯身中间转 */}
        <group position={cPos}>
          <group position-y={u(big.h / 2)} rotation-z={Math.PI * flip}><group position-y={-u(big.h / 2)}><Beaker vol={1000} marks={false} /></group></group>
          {cover.busy && ct < 3.1 && <group position={[u(0.06), u(big.h * 0.5), 0]} rotation={[0, 0, 1.4]}><Hand grip={0.7} /></group>}
        </group>
        <group position={RACK}><TubeRack n={3} gap={0.03} /></group>
        <group position={[TUBE_AT[0] - u(0.03), TUBE_AT[1], TUBE_AT[2]]}><TestTube fill={0.3} color={col(0)} /></group>
        <group position={TUBE_AT}><TestTube fill={0.32} color={col(tubeK)} opacity={0.4 + tubeK * 0.5} /></group>
        <group position={BOTTLE}><NarrowBottle label="浓氨水" band="#3d7bd6" sub="NH₃·H₂O" /></group>
        {drip.busy && <group position={tip}>
          <Dropper squeeze={sq} fill={0.3} />
          <group position={[0, u(0.12), 0]} rotation={[0.1, -0.5, 0.2]}><group><Hand grip={0.55 + sq * 0.35} /></group></group>
        </group>}
        {/* 放大示意：大烧杯里的空气中，氨分子（蓝）从 B 那边一点点跑向 A */}
        <Callout at={[X0 - u(0.04), TOP + u(0.2), Z0 + u(0.03)]} from={[X0, TOP + u(0.09), Z0 + u(0.02)]} r={u(0.06)} fieldR={30} show={flow ? 1 : 0}>
          <MolField species={[{ f: 'N2', share: 0.78 }, { f: 'O2', share: 0.22 }]} R={30} gap={7.2} opacity={flow ? 1 : 0} seed={5} speed={1.4} />
          <MolField species={[{ f: 'NH3', share: 1 }]} R={30} gap={8.5} opacity={flow ? 1 : 0} seed={9} speed={1.4} drift={14} front={{ f: 'NH3', x: lerp(24, -34, T.done.wait ? 1 : seg(wait.t, 0.5, 7)) }} />
        </Callout>
      </Place>}
      lesson={<LessonBlock no="2" title="分子在运动" concept="看不见的氨分子跑进了烧杯 A" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>浓氨水会挥发出氨气。氨分子不断运动，从烧杯 B 跑出来，进入烧杯 A，溶在水里使酚酞溶液变红。</p>
          <p className="mt-2">B 没有变红，是因为 B 里没有酚酞；A 变红而 A 和 B 没有接触，说明分子总是在不断运动着。</p>
          <p className="mt-2 text-[13.5px] text-white/65">浓氨水有刺激性气味，这个实验在通风橱里做。示意圈里的分子是放大画的，氨分子由一个氮原子和三个氢原子构成。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">A 变红，B 不变</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">分子总是在不断运动着</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">氨分子从浓氨水里跑出来，穿过空气进入 A，使酚酞溶液变红。我们看不见分子，但能看见它运动带来的结果。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">烧杯 A 的颜色</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight" style={{ color: aK > 0.5 ? '#ff5fa2' : '#ffffff' }}>{aK > 0.5 ? '红色' : '无色'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">氨分子 NH₃</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="v" value={`约 ${Math.round(v / 10) * 10}`} unit={`m/s · ${COLD} °C 平均速率`} />
            <ParamTile symbol="Mr" value="17" unit="相对分子质量" />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">氨分子跑得很快，但一路不停地和空气分子相撞，所以要几分钟才扩散到 A。</p>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'test'} pulse={next === 'test'} onClick={() => drip.run()} disabled={busy || !!T.done.test}>滴浓氨水</LabButton>
        <LabButton primary={next === 'cover'} pulse={next === 'cover'} onClick={() => cover.run()} disabled={busy || !T.done.test || covered}>罩上大烧杯</LabButton>
        <LabButton primary={next === 'wait'} pulse={next === 'wait'} onClick={() => wait.run()} disabled={busy || !covered || !!T.done.wait}>等几分钟</LabButton>
      </>}
      extras={null}
    />
  )
}
