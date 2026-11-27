// 酸、碱和中和 · 第 3 课 酸的化学性质：化验台第 3 格。试管架上插着四支干净的试管（后排沥水柱上还倒插着两支）；白瓷砖上一枚生锈的铁钉，一只小广口瓶里装着锌粒，后面一瓶稀盐酸。
// 把生锈的铁钉放进试管、加稀盐酸：铁锈溶解，溶液变黄；铁锈除尽后再等一会儿，铁钉表面冒出气泡。换锌粒再做：锌粒表面冒出大量气泡。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, shell, useTasks, type Label } from '@/lab-kit'
import { Glass, Glove, LOOK, NarrowBottle, TUBE, TestTube, Tile, TubeRack, m, u } from './gear'
import { Bubbles, Stream } from './fx'
import { rng } from './mats'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, mixHex, seg, useClock, useRun } from './parts'
import { BZ, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l3, Y = TOP, Z = BZ + 0.15
type Metal3 = 'nail' | 'zinc'
const RACK: V3 = [X0, Y, Z + u(0.02)]
const TUBE_X: Record<Metal3, number> = { nail: -0.015, zinc: 0.015 }
const TB = 0.042                       // 试管底离台面多高（m）：插在试管架的中层板上
const tubeAt = (k: Metal3): V3 => [RACK[0] + u(TUBE_X[k]), Y + u(TB), RACK[2]]
const NAIL_HOME: V3 = [X0 - u(0.13), Y + u(0.006), Z + u(0.06)]
const ZN_JAR: V3 = [X0 + u(0.11), Y, Z + u(0.1)]
const HCL: V3 = [X0 - u(0.14), Y, Z - u(0.06)]
const FILL = 0.4
const TASKS: Task[] = [
  { id: 'rust', text: '把生锈的铁钉放进稀盐酸', note: '铁锈溶解，溶液变黄：Fe₂O₃ + 6HCl = 2FeCl₃ + 3H₂O' },
  { id: 'iron', text: '铁锈除尽后，再等一会儿', note: '铁钉表面冒出气泡：Fe + 2HCl = FeCl₂ + H₂↑' },
  { id: 'zinc', text: '把锌粒放进稀盐酸', note: '锌粒表面冒出大量气泡：Zn + 2HCl = ZnCl₂ + H₂↑' },
]
const NAMES: Record<Metal3, string> = { nail: '生锈的铁钉', zinc: '锌粒' }

/** 一枚铁钉：钉帽、钉身、钉尖。原点在钉尖，朝 +y，长 0.05 m。rust 0–1 锈的多少 */
function Nail({ rust }: { rust: number }) {
  const col = mixHex('#7d8287', '#8a4a22', rust)
  return <group>
    <mesh position-y={u(0.004)}><coneGeometry args={[u(0.0014), u(0.008), 12]} /><meshStandardMaterial color={col} roughness={0.5 + rust * 0.4} metalness={0.8 - rust * 0.6} /></mesh>
    <mesh position-y={u(0.027)} rotation-x={Math.PI}><cylinderGeometry args={[u(0.0014), u(0.0014), u(0.038), 12]} /><meshStandardMaterial color={col} roughness={0.5 + rust * 0.4} metalness={0.8 - rust * 0.6} /></mesh>
    <mesh position-y={u(0.047)}><cylinderGeometry args={[u(0.0036), u(0.0036), u(0.0016), 20]} /><meshStandardMaterial color={col} roughness={0.5 + rust * 0.4} metalness={0.8 - rust * 0.6} /></mesh>
  </group>
}
/** 几颗锌粒：不规则的银灰色小块 */
function ZincBits({ n = 4, seed = 2 }: { n?: number; seed?: number }) {
  const g = useMemo(() => { const r = rng(seed), gs: THREE.BufferGeometry[] = []; for (let i = 0; i < n; i++) { const s = u(0.0032 + r() * 0.0012), gg = new THREE.DodecahedronGeometry(s, 0); gg.scale(1, 0.7 + r() * 0.4, 1); gg.rotateY(r() * 3); gg.translate(u((r() - 0.5) * 0.009), s * 0.7, u((r() - 0.5) * 0.009)); gs.push(gg) } return mergeGeometries(gs) }, [n, seed])
  return <mesh geometry={g} castShadow><Metal kind="zinc" grain="cast" rough={0.5} /></mesh>
}
/** 广口瓶：装着锌粒，磨口塞放在一边。原点在瓶底 */
function ZnJar() {
  const g = useMemo(() => shell(m([[0, 0], [0.018, 0], [0.021, 0.003], [0.021, 0.045], [0.016, 0.053], [0.015, 0.06]]), 0.0016 * 6, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass opacity={0.22} /></mesh>
    <group position-y={u(0.002)} scale={[1.8, 1, 1.8]}><ZincBits n={14} seed={7} /></group>
  </group>
}

export default function Lesson3() {
  const [pick, setPick] = useState<Metal3>('nail')
  const [inTube, setInTube] = useState<Record<Metal3, boolean>>({ nail: false, zinc: false })
  const [waited, setWaited] = useState(false)
  const T = useTasks('gewu:acid:3', TASKS)
  const rx = useClock(), zx = useClock()
  const add = useRun(4.2, () => { setInTube(s => ({ ...s, [pick]: true })); (pick === 'nail' ? rx : zx).start() })
  const wait = useRun(3.6, () => { setWaited(true); T.check(id => id === 'iron') })
  const rustLeft = inTube.nail ? 1 - Math.min(1, rx.t / 4) : 1
  const yellow = inTube.nail ? Math.min(1, rx.t / 4) : 0
  useEffect(() => { if (inTube.nail && rx.t >= 4) T.check(id => id === 'rust') }, [inTube.nail && rx.t >= 4])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (inTube.zinc && zx.t >= 3) T.check(id => id === 'zinc') }, [inTube.zinc && zx.t >= 3])   // eslint-disable-line react-hooks/exhaustive-deps
  const busy = add.busy || wait.busy
  const resetAll = () => { add.snap(0); wait.snap(0); rx.stop(); zx.stop(); setPick('nail'); setInTube({ nail: false, zinc: false }); setWaited(false); T.reset() }

  const task = T.current
  const want: Metal3 = task?.id === 'zinc' ? 'zinc' : 'nail'
  const { hint, next }: { hint: string; next: 'add' | 'wait' | 'pick' | null } = !task ? { hint: '酸能和铁锈这样的金属氧化物反应，也能和铁、锌这样的活泼金属反应放出氢气。', next: null }
    : add.busy ? { hint: '把它放进试管，再倒入稀盐酸…', next: null }
    : wait.busy ? { hint: '再等一会儿，看铁钉表面…', next: null }
    : pick !== want ? { hint: `选“${NAMES[want]}”`, next: 'pick' }
    : task.id === 'rust' ? (inTube.nail ? { hint: '看铁钉表面的铁锈和溶液的颜色…', next: null } : { hint: '把生锈的铁钉放进试管，加稀盐酸', next: 'add' })
    : task.id === 'iron' ? { hint: '铁锈除尽了。再等一会儿，看铁钉表面', next: 'wait' }
    : inTube.zinc ? { hint: '看锌粒表面…', next: null } : { hint: '把锌粒放进试管，加稀盐酸', next: 'add' }

  // 放进去：手拿起铁钉（或用镊子夹几颗锌粒）放进试管；再拿起稀盐酸瓶倒进去
  const at = add.t, pk = ease(seg(at, 0, 1.4))
  const objFrom: V3 = pick === 'nail' ? NAIL_HOME : [ZN_JAR[0], Y + u(0.04), ZN_JAR[2]]
  const tubeTop = (k: Metal3): V3 => [tubeAt(k)[0], Y + u(TB + TUBE.h + 0.01), tubeAt(k)[2]]
  const tubeBot = (k: Metal3): V3 => [tubeAt(k)[0], Y + u(TB + 0.002), tubeAt(k)[2]]
  const carrying = add.busy && at < 1.6
  const objAt: V3 = add.busy ? (at < 1.4 ? liftPath(objFrom, tubeTop(pick), Y + u(0.3), pk) : [tubeBot(pick)[0], Y + u(TB + 0.002) + u(TUBE.h + 0.01) * (1 - seg(at, 1.4, 1.6)), tubeBot(pick)[2]]) : tubeBot(pick)
  const bk = add.busy ? ease(seg(at, 1.6, 2.4)) - ease(seg(at, 3.5, 4.2)) : 0
  const bottleAt: V3 = bk > 0 ? liftPath(HCL, [tubeTop(pick)[0] - u(0.06), Y + u(0.17), tubeTop(pick)[2]], Y + u(0.26), bk) : HCL
  const tilt = add.busy ? ease(seg(at, 2.3, 2.6)) - ease(seg(at, 3.3, 3.6)) : 0
  const pouring = add.busy && at > 2.55 && at < 3.35
  const fill = (k: Metal3) => inTube[k] ? FILL : add.busy && pick === k ? FILL * seg(at, 2.55, 3.35) : 0
  const look = (k: Metal3) => k === 'nail' && yellow > 0 ? { color: mixHex('#cfe4ea', '#e0a423', yellow), opacity: 0.26 + 0.5 * yellow, vivid: yellow > 0.25 } : LOOK.clear

  const labels: Label[] = [
    { id: 'tn', at: [tubeAt('nail')[0] - u(0.05), Y + u(0.14), RACK[2]], ax: 1, className: `scene-tag ${pick === 'nail' ? 'key' : ''} -translate-y-1/2`, children: <><small>铁钉</small>{inTube.nail ? (yellow > 0.6 ? '溶液变黄' : '铁锈溶解') : '—'}{waited ? '，冒气泡' : ''}</> },
    { id: 'tz', at: [tubeAt('zinc')[0] + u(0.05), Y + u(0.14), RACK[2]], ax: 0, className: `scene-tag ${pick === 'zinc' ? 'key' : ''} -translate-y-1/2`, children: <><small>锌粒</small>{inTube.zinc ? '大量气泡' : '—'}</> },
    { id: 'n1', at: [HCL[0], Y + u(0.12), HCL[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '稀盐酸' },
  ]
  return (
    <LabShell title="酸、碱和中和" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="试一试"
      stage={<Place at="l3" labels={labels}>
        <group position={RACK}><TubeRack n={6} gap={0.03} pegs={2} /></group>
        {[-0.045, 0.045].map(x => <group key={x} position={[RACK[0] + u(x), Y + u(TB), RACK[2]]}><TestTube fill={0} /></group>)}
        {(['nail', 'zinc'] as Metal3[]).map(k => <group key={k} position={tubeAt(k)}>
          <TestTube fill={fill(k)} look={look(k)} />
        </group>)}
        {/* 铁钉：在试管里斜靠着管壁 */}
        {(inTube.nail || !(add.busy && pick === 'nail')) && <group position={inTube.nail ? [tubeBot('nail')[0] + u(0.002), Y + u(TB + 0.004), tubeBot('nail')[2]] : NAIL_HOME} rotation={inTube.nail ? [0, 0, 0.12] : [0, 0.5, Math.PI / 2]}><Nail rust={rustLeft} /></group>}
        {inTube.zinc && <group position={[tubeBot('zinc')[0], Y + u(TB + 0.001), tubeBot('zinc')[2]]} scale={0.8}><ZincBits n={3} seed={3} /></group>}
        {add.busy && <group position={objAt}>
          {pick === 'nail' ? <group rotation-z={carrying ? 0.15 : 0.12}><Nail rust={1} /></group> : <group scale={0.8}><ZincBits n={3} seed={3} /></group>}
          {carrying && <group position={[0, u(0.06), 0]} rotation={[0.3, 0, 0.1]}><Glove s={u(0.005)} /></group>}
        </group>}
        <group position={[X0 - u(0.13), Y, Z + u(0.06)]}><Tile w={0.08} d={0.06} /></group>
        <group position={ZN_JAR}><ZnJar /></group>
        {/* 稀盐酸瓶：拿起来，倾斜着往试管里倒 */}
        <group position={bottleAt} rotation-z={-tilt * 1.5} scale={0.8}>
          <NarrowBottle label="稀盐酸" band="#c23a2a" plug={!add.busy} />
          {bk > 0 && <group position={[-u(0.035), u(0.06), 0]} rotation={[0.2, 0, -0.3]}><Glove s={u(0.006)} /></group>}
        </group>
        <Stream top={[tubeTop(pick)[0] - u(0.004), Y + u(0.24), tubeTop(pick)[2]]} bottom={[tubeTop(pick)[0], Y + u(TB + 0.03), tubeTop(pick)[2]]} r={u(0.0012)} on={pouring} />
        {/* 气泡：铁锈除尽以后铁钉表面少量冒；锌粒表面大量冒 */}
        <Bubbles at={[tubeBot('nail')[0] + u(0.003), Y + u(TB + 0.01), tubeBot('nail')[2]]} top={u(FILL * TUBE.h - 0.012)} on={inTube.nail && (waited || wait.busy)} rate={wait.busy ? 6 : 9} r={u(0.0007)} spread={[u(0.0015), u(0.0015)]} speed={u(0.03)} seed={2} opacity={0.7} />
        <Bubbles at={[tubeBot('zinc')[0], Y + u(TB + 0.005), tubeBot('zinc')[2]]} top={u(FILL * TUBE.h - 0.008)} on={inTube.zinc} rate={40} r={u(0.0008)} spread={[u(0.004), u(0.004)]} speed={u(0.04)} seed={5} opacity={0.75} />
      </Place>}
      lesson={<LessonBlock no="3" title="酸的化学性质" concept="酸能和铁锈、和活泼金属反应" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>酸能和某些金属氧化物反应，生成盐和水；能和活泼金属反应，生成盐和氢气。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">除铁锈</b>：铁锈的主要成分是氧化铁 Fe₂O₃，和盐酸反应生成氯化铁，溶液显黄色</li>
            <li><b className="text-white">再和铁反应</b>：铁锈除尽后，铁和盐酸反应生成氯化亚铁和氢气，所以除锈时铁件不能在酸里泡太久</li>
            <li><b className="text-white">活泼金属</b>：锌、铁、镁都能和稀盐酸、稀硫酸反应放出氢气</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">污水厂检修时，生锈的管件可以用稀盐酸清洗除锈，洗完马上用水冲净。画面里反应的过程加快了。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">铁钉和锌粒都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">酸能和铁锈、和活泼金属反应</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">稀盐酸溶解铁锈，溶液变黄；铁、锌和稀盐酸反应放出氢气。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAMES[pick]} + 稀盐酸</div>
            <div className="mt-1 text-[28px] leading-tight font-bold">{pick === 'nail' ? (inTube.nail ? (waited ? '冒出气泡' : yellow > 0.6 ? '溶液变黄' : '铁锈溶解') : '—') : inTube.zinc ? '大量气泡' : '—'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">化学方程式</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] tabular-nums">
            <li className={T.done.rust ? 'text-white' : 'text-white/35'}>Fe₂O₃ + 6HCl = 2FeCl₃ + 3H₂O</li>
            <li className={T.done.iron ? 'text-white' : 'text-white/35'}>Fe + 2HCl = FeCl₂ + H₂↑</li>
            <li className={T.done.zinc ? 'text-white' : 'text-white/35'}>Zn + 2HCl = ZnCl₂ + H₂↑</li>
          </ul>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'add'} pulse={next === 'add'} onClick={() => add.run()} disabled={busy || inTube[pick]}>放进试管，加稀盐酸</LabButton>
        <LabButton primary={next === 'wait'} pulse={next === 'wait'} onClick={() => wait.run()} disabled={busy || !T.done.rust || waited}>等一会儿</LabButton>
      </>}
      extras={
        <Control label="放什么">
          <Segmented label="放什么" pulse={next === 'pick'} want={want} value={pick} disabled={busy} onChange={k => setPick(k as Metal3)} options={[{ value: 'nail', label: '生锈的铁钉' }, { value: 'zinc', label: '锌粒' }]} />
        </Control>
      }
    />
  )
}
