// 酸、碱和中和 · 第 4 课 常见的碱：化验台第 4 格。左边表面皿上几粒氢氧化钠，中间一只盛水的烧杯，右边一只盛澄清石灰水的烧杯插着吸管；
// 后面是氢氧化钠和氢氧化钙的试剂瓶。氢氧化钠在空气里放一会儿表面变潮；放进水里，烧杯外壁发热；往石灰水里吹气，石灰水变浑浊。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Glass as Panel, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { shell, useTasks, type Label } from '@/lab-kit'
import { Beaker, Glove, LOOK, Straw, WatchGlass, m, u } from './gear'
import { Bubbles, Puffs } from './fx'
import { bottleLabel, rng } from './mats'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, mixHex, seg, useRun } from './parts'
import { BZ, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l4, Y = TOP, Z = BZ + 1.1
const WG: V3 = [X0 - u(0.11), Y, Z + u(0.07)]
const BW: V3 = [X0 + u(0.01), Y, Z + u(0.04)]
const BL: V3 = [X0 + u(0.12), Y, Z + u(0.05)]
const TASKS: Task[] = [
  { id: 'wet', text: '氢氧化钠放在表面皿上，放一会儿', note: '表面变潮湿：氢氧化钠易吸收空气里的水分而潮解，可以做干燥剂' },
  { id: 'hot', text: '把氢氧化钠放进水里，摸一摸烧杯', note: '烧杯外壁发热：氢氧化钠溶于水时放出大量的热' },
  { id: 'milky', text: '用吸管向澄清石灰水里吹气', note: '石灰水变浑浊：CO₂ + Ca(OH)₂ = CaCO₃↓ + H₂O' },
]
const LIME_LV = 0.06, WATER_LV = 0.05

/** 几粒氢氧化钠：白色的小片。wet：表面潮湿的程度（0–1），越湿越亮、越透 */
function Pellets({ wet, n = 7, seed = 4, spread = 0.02 }: { wet: number; n?: number; seed?: number; spread?: number }) {
  const g = useMemo(() => { const r = rng(seed), gs: THREE.BufferGeometry[] = []; for (let i = 0; i < n; i++) { const s = u(0.0042 + r() * 0.001), gg = new THREE.SphereGeometry(s, 16, 10); gg.scale(1, 0.42, 1); gg.translate(u((r() - 0.5) * spread), s * 0.42, u((r() - 0.5) * spread)); gs.push(gg) } return mergeGeometries(gs) }, [n, seed, spread])
  return <mesh geometry={g} castShadow><meshPhysicalMaterial color={mixHex('#f4f3ee', '#e8eeec', wet)} roughness={0.75 - wet * 0.7} clearcoat={wet} clearcoatRoughness={0.05} transmission={wet * 0.25} thickness={0.2} /></mesh>
}
/** 塑料广口试剂瓶：白色瓶身、蓝色螺口盖、正面贴标签。原点在瓶底 */
function ReagentJar({ label, sub, band }: { label: string; sub: string; band: string }) {
  const g = useMemo(() => shell(m([[0, 0], [0.026, 0], [0.028, 0.004], [0.028, 0.07], [0.022, 0.078], [0.02, 0.08]]), u(0.0016), { segs: 40 }), [])
  return <group>
    <mesh geometry={g} castShadow><meshPhysicalMaterial color="#f1f0ea" roughness={0.45} clearcoat={0.3} /></mesh>
    <mesh position-y={u(0.088)} castShadow><cylinderGeometry args={[u(0.022), u(0.022), u(0.018), 32]} /><meshPhysicalMaterial color="#2f62a8" roughness={0.4} clearcoat={0.4} /></mesh>
    <mesh position-y={u(0.04)} rotation-y={0.2}><cylinderGeometry args={[u(0.0284), u(0.0284), u(0.036), 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band, sub)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
  </group>
}
/** 药匙：不锈钢的小勺，原点在勺头 */
function Spoon() {
  return <group>
    <mesh scale={[1, 0.35, 1.4]}><sphereGeometry args={[u(0.006), 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color="#c9cdd0" metalness={1} roughness={0.25} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, u(0.002), u(0.05)]} rotation-x={Math.PI / 2 - 0.15}><boxGeometry args={[u(0.004), u(0.09), u(0.0012)]} /><meshStandardMaterial color="#c9cdd0" metalness={1} roughness={0.25} /></mesh>
  </group>
}

export default function Lesson4() {
  const [wet, setWet] = useState(false)
  const [dissolved, setDissolved] = useState(false)
  const [milky, setMilky] = useState(false)
  const T = useTasks('gewu:acid:4', TASKS)
  const sit = useRun(4, () => { setWet(true); T.check(id => id === 'wet') })
  const drop = useRun(5.4, () => { setDissolved(true); T.check(id => id === 'hot') })
  const blow = useRun(5.2, () => { setMilky(true); T.check(id => id === 'milky') })
  const busy = sit.busy || drop.busy || blow.busy
  const resetAll = () => { sit.snap(0); drop.snap(0); blow.snap(0); setWet(false); setDissolved(false); setMilky(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'sit' | 'drop' | 'blow' | null } = !task ? { hint: '氢氧化钠易潮解、溶于水放热；碱能和二氧化碳反应。', next: null }
    : sit.busy ? { hint: '氢氧化钠在空气里放着…', next: null }
    : drop.busy ? { hint: '用药匙把氢氧化钠放进水里，用手背摸一摸烧杯外壁…', next: null }
    : blow.busy ? { hint: '用吸管向石灰水里慢慢吹气…', next: null }
    : task.id === 'wet' ? { hint: '把氢氧化钠放在表面皿上，在空气里放一会儿', next: 'sit' }
    : task.id === 'hot' ? { hint: '表面变潮了。把氢氧化钠放进水里，摸一摸烧杯', next: 'drop' }
    : { hint: '向澄清石灰水里吹气', next: 'blow' }

  const wetK = wet ? 1 : sit.busy ? seg(sit.t, 0.4, 3.6) : 0
  // 放进水里：药匙舀起几粒，移到烧杯上方，倒进去；颗粒在水里慢慢变小、消失；手背贴一下外壁
  const dt = drop.t, sk = drop.busy ? ease(seg(dt, 0, 1.3)) - ease(seg(dt, 2.0, 2.8)) : 0
  const spoonAt: V3 = liftPath([WG[0], Y + u(0.01), WG[2]], [BW[0] - u(0.01), Y + u(0.13), BW[2]], Y + u(0.15), sk)
  const tipped = drop.busy && dt > 1.3 && dt < 2.0
  const inWater = drop.busy && dt > 1.5 ? 1 - seg(dt, 1.8, 3.8) : 0
  const pelletsLeft = dissolved || (drop.busy && dt > 1.3) ? 3 : 7
  const touch = drop.busy && dt > 3.6
  // 吹气：手拿着吸管，吸管下端在石灰水里冒泡，石灰水慢慢变白
  const bt = blow.t, cloud = milky ? 1 : blow.busy ? seg(bt, 0.8, 4.8) : 0
  const limeLook = { color: mixHex('#d7e8ec', '#f2f3f0', cloud), opacity: 0.26 + 0.64 * cloud, vivid: false }

  const labels: Label[] = [
    { id: 'n1', at: [WG[0], Y - u(0.004), WG[2] + u(0.05)], ax: 0.5, name: true, className: 'scene-name', children: '氢氧化钠' },
    { id: 'n2', at: [BW[0], Y - u(0.004), BW[2] + u(0.05)], ax: 0.5, name: true, className: 'scene-name', children: '水' },
    { id: 'n3', at: [BL[0], Y - u(0.004), BL[2] + u(0.05)], ax: 0.5, name: true, className: 'scene-name', children: '澄清石灰水' },
    ...(wetK > 0.5 ? [{ id: 'r1', at: [WG[0] - u(0.03), Y + u(0.03), WG[2]] as V3, ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>表面</small>潮湿</> }] : []),
    ...(touch || dissolved ? [{ id: 'r2', at: [BW[0] - u(0.04), Y + u(0.09), BW[2]] as V3, ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>外壁</small>发热</> }] : []),
    ...(cloud > 0.5 ? [{ id: 'r3', at: [BL[0] + u(0.045), Y + u(0.045), BL[2]] as V3, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>石灰水</small>变浑浊</> }] : []),
  ]
  return (
    <LabShell title="酸、碱和中和" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="试一试"
      stage={<Place at="l4" labels={labels}>
        <group position={[X0 - u(0.06), Y, Z - u(0.08)]}><ReagentJar label="氢氧化钠" sub="NaOH" band="#2f6fb3" /></group>
        <group position={[X0 + u(0.07), Y, Z - u(0.09)]} rotation-y={-0.3}><ReagentJar label="氢氧化钙" sub="Ca(OH)₂" band="#3f8f6b" /></group>
        <group position={WG}><WatchGlass r={0.04}><group position-y={u(0.004)}><Pellets wet={wetK} n={pelletsLeft} spread={0.025} /></group></WatchGlass></group>
        {/* 表面变潮：表面皿上出现一小摊水膜 */}
        {wetK > 0.2 && <mesh position={[WG[0], Y + u(0.0035), WG[2]]} rotation-x={-Math.PI / 2} renderOrder={7}><circleGeometry args={[u(0.016) * wetK, 32]} /><meshPhysicalMaterial color="#e8f2f2" transparent opacity={0.35} roughness={0.02} clearcoat={1} depthWrite={false} /></mesh>}
        <group position={BW}>
          <Beaker vol={250} level={WATER_LV} look={LOOK.clear}>
            {inWater > 0.02 && <group scale={[1, Math.max(0.1, inWater), 1]}><Pellets wet={1} n={4} seed={9} spread={0.03} /></group>}
          </Beaker>
        </group>
        <Puffs at={[BW[0], Y + u(WATER_LV + 0.01), BW[2]]} on={drop.busy && dt > 2 || dissolved} opt={{ rate: 3, life: 2.2, size: [u(0.02), u(0.06)], speed: u(0.02), dir: [0, 1, 0], spread: 0.25, color: '#f6f6f2', opacity: 0.1, accel: [0, u(0.01), 0], drag: 0.4, jitter: u(0.012) }} seed={5} />
        {drop.busy && dt < 2.9 && <group position={spoonAt} rotation-z={tipped ? 1.0 : 0}>
          <Spoon />
          {(dt < 1.3) && <group position-y={u(0.001)}><Pellets wet={1} n={4} seed={9} spread={0.006} /></group>}
          <group position={[0, u(0.01), u(0.1)]} rotation={[1.2, 0, 0]}><Glove s={u(0.0055)} /></group>
        </group>}
        {touch && <group position={[BW[0] - u(0.05), Y + u(0.05), BW[2] + u(0.01)]} rotation={[0.1, 0.4, -1.3]}><Glove s={u(0.006)} /></group>}
        {/* 石灰水和吸管 */}
        <group position={BL}><Beaker vol={250} level={LIME_LV} look={limeLook} /></group>
        <group position={blow.busy ? [BL[0] + u(0.008), Y + u(0.006), BL[2]] : [BL[0] + u(0.012), Y + u(0.004), BL[2] - u(0.01)]} rotation-z={blow.busy ? 0.08 : -0.28}>
          <Straw />
          {blow.busy && <group position={[0, u(0.13), u(0.004)]} rotation={[0.3, 0, 0.1]}><Glove s={u(0.0055)} /></group>}
        </group>
        <Bubbles at={[BL[0] + u(0.008), Y + u(0.008), BL[2]]} top={u(LIME_LV - 0.006)} on={blow.busy && bt > 0.6 && bt < 4.8} rate={26} r={u(0.0016)} spread={u(0.003)} speed={u(0.07)} seed={4} opacity={0.6} />
      </Place>}
      lesson={<LessonBlock no="4" title="常见的碱" concept="氢氧化钠易潮解，碱能和二氧化碳反应" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>氢氧化钠俗称火碱、烧碱、苛性钠，是白色固体，易吸收空气中的水分而潮解，溶于水时放出大量的热，有强烈的腐蚀性。</p>
          <p className="mt-2">氢氧化钙俗称熟石灰、消石灰，是白色粉末，微溶于水，它的水溶液俗称石灰水。用生石灰和水反应可以制得：CaO + H₂O = Ca(OH)₂。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>碱能和二氧化碳反应：CO₂ + Ca(OH)₂ = CaCO₃↓ + H₂O；2NaOH + CO₂ = Na₂CO₃ + H₂O</li>
            <li>所以氢氧化钠要密封保存：既会吸水潮解，又会和空气里的二氧化碳反应而变质</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">污水厂加药间里的液碱是氢氧化钠溶液，石灰乳是熟石灰和水调成的浆，都用来中和酸性废水。画面里潮解的过程加快了。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种碱都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">氢氧化钠易潮解，碱能和二氧化碳反应</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">氢氧化钠溶于水放出大量的热；石灰水遇二氧化碳变浑浊。氢氧化钠要密封保存。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">两种常见的碱</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium"></th><th className="pb-1 font-medium">氢氧化钠</th><th className="pb-1 font-medium">氢氧化钙</th></tr></thead>
            <tbody>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left text-white/60">俗名</td><td className="text-[12.5px]">火碱、烧碱</td><td className="rounded-r-lg text-[12.5px]">熟石灰、消石灰</td></tr>
              <tr><td className="px-2 py-1.5 text-left text-white/60">放在空气里</td><td>{wetK > 0.5 ? '潮解' : '—'}</td><td>—</td></tr>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left text-white/60">溶于水</td><td>{touch || dissolved ? '易溶，放热' : '—'}</td><td className="rounded-r-lg">微溶</td></tr>
              <tr><td className="px-2 py-1.5 text-left text-white/60">遇二氧化碳</td><td>—</td><td>{cloud > 0.5 ? '变浑浊' : '—'}</td></tr>
            </tbody>
          </table>
          {T.done.milky && <p className="hint-in mt-3 rounded-xl bg-white/8 px-3 py-2.5 text-[14px] tabular-nums text-white/85">CO₂ + Ca(OH)₂ = CaCO₃↓ + H₂O</p>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'sit'} pulse={next === 'sit'} onClick={() => sit.run()} disabled={busy || wet}>放一会儿</LabButton>
        <LabButton primary={next === 'drop'} pulse={next === 'drop'} onClick={() => drop.run()} disabled={busy || !wet || dissolved}>放进水里</LabButton>
        <LabButton primary={next === 'blow'} pulse={next === 'blow'} onClick={() => blow.run()} disabled={busy || !dissolved || milky}>向石灰水吹气</LabButton>
      </>}
      extras={null}
    />
  )
}
