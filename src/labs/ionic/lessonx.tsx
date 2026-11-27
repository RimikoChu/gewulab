// 水溶液里的离子平衡 · 拓展课 纯碱和铝盐：大厅最东头的通风橱里。
// 一、纯碱去油污：电热板上一杯热的 0.10 mol/L Na₂CO₃ 溶液（25 °C 时 pH 11.65），把沾了油的表面皿放进去，油膜慢慢褪掉。
// 二、铝盐净水：一杯从窗外河道取来的浑浊河水，滴进明矾溶液、搅一搅，絮状的 Al(OH)₃ 把泥沙裹住沉到杯底，上面清了。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Beaker, DropBottle, Dropper, GlassRod, Glove, LOOK, NarrowBottle, WatchGlass, u, type Look } from './gear'
import { HotPlate } from './rig'
import { Drop, Puffs } from './fx'
import { Legend, Micro } from './micro'
import { Fin } from './fin'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, mixHex, seg, useRun } from './parts'
import { meter, sodaPH } from './physics'
import { BZ, SPOT, ST, TOP, Place, type V3 } from './world'

const X0 = ST.x, Y = TOP, Z = BZ + 0.75
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const PLATE = p(-0.07, 0, 0.0), HOT: V3 = [PLATE[0], PLATE[1] + u(0.07), PLATE[2] - u(0.012)]
const GLASS0 = p(-0.2, 0, 0.09)
const RIVER = p(0.1, 0, 0.03), ALUM = p(0.18, 0, 0.08)
const TASKS: Task[] = [
  { id: 'soda', text: '把沾了油的表面皿放进热纯碱溶液', note: `油膜褪掉了：Na₂CO₃ 水解显碱性（0.10 mol/L 时 pH ${meter(sodaPH())}），油脂在碱性条件下水解；加热促进水解，去污更快` },
  { id: 'alum', text: '往浑浊的河水里滴明矾溶液，搅一搅', note: 'Al³⁺ 水解生成 Al(OH)₃ 胶体，吸附水中的悬浮杂质一起沉下去，水变清了' },
]
const MUD: Look = { color: '#9c8458', opacity: 0.82, vivid: false }

export default function LessonX() {
  const [clean, setClean] = useState(false)
  const [clear, setClear] = useState(false)
  const T = useTasks('gewu:ionic:x', TASKS)
  const dip = useRun(6, () => { setClean(true); T.check(id => id === 'soda') })
  const alum = useRun(7.5, () => { setClear(true); T.check(id => id === 'alum') })
  const busy = dip.busy || alum.busy
  const resetAll = () => { dip.snap(0); alum.snap(0); setClean(false); setClear(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'dip' | 'alum' | null } = !task ? { hint: '盐类水解在生活和生产里处处有用：纯碱去油污、明矾净水。', next: null }
    : dip.busy ? { hint: '表面皿浸在热纯碱溶液里，油膜慢慢褪去…', next: null }
    : alum.busy ? { hint: '滴进明矾溶液，用玻璃棒搅一搅，静置…', next: null }
    : task.id === 'soda' ? { hint: '把沾了油的表面皿放进热的纯碱溶液', next: 'dip' }
    : { hint: '再往浑浊的河水里滴明矾溶液，搅一搅', next: 'alum' }

  // 表面皿：手拿着放进热纯碱溶液，泡一会儿再拿出来
  const dt = dip.t
  const dk = dip.busy ? ease(seg(dt, 0, 1.4)) - ease(seg(dt, 4.6, 6)) : 0
  const inBeaker: V3 = [HOT[0], HOT[1] + u(0.035), HOT[2]]
  const glassAt: V3 = dk > 0 ? liftPath([GLASS0[0], GLASS0[1] + u(0.002), GLASS0[2]], inBeaker, Y + u(0.22), dk) : [GLASS0[0], GLASS0[1] + u(0.002), GLASS0[2]]
  const oil = clean ? 0 : dip.busy ? 1 - seg(dt, 1.8, 4.4) : 1
  // 明矾：滴管滴几滴，玻璃棒搅，絮状物沉下去
  const at = alum.t
  const ak = alum.busy ? ease(seg(at, 0, 0.9)) - ease(seg(at, 2.2, 3.0)) : 0
  const dropperAt: V3 = liftPath([ALUM[0], Y + u(0.03), ALUM[2]], [RIVER[0] + u(0.01), Y + u(0.15), RIVER[2]], Y + u(0.22), ak)
  const settle = clear ? 1 : alum.busy ? seg(at, 3.6, 7.2) : 0
  const water: Look = { color: mixHex(MUD.color, LOOK.clear.color, settle), opacity: MUD.opacity + (LOOK.clear.opacity + 0.06 - MUD.opacity) * settle, vivid: false }
  const stir = alum.busy && at > 2.6 && at < 3.8
  const yaw = SPOT.x.view[0], MIC = p(-0.19, 0.2, -0.03)
  const labels: Label[] = [
    { id: 'soda', at: [HOT[0] + u(0.05), HOT[1] + u(0.04), HOT[2] + u(0.03)], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>Na₂CO₃</small>0.10 mol/L · 热</> },
    { id: 'river', at: [RIVER[0], Y - u(0.004), RIVER[2] + u(0.045)], ax: 0.5, className: 'scene-tag', children: '河水水样' },
    { id: 'al', at: [ALUM[0], Y - u(0.003), ALUM[2] + u(0.03)], ax: 0.5, name: true, className: 'scene-name', children: '明矾溶液' },
    { id: 'wg', at: [GLASS0[0], Y - u(0.003), GLASS0[2] + u(0.045)], ax: 0.5, name: true, className: 'scene-name', children: '沾了油的表面皿' },
  ]
  return (
    <LabShell title="水溶液里的离子平衡" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel="盐类水解的应用"
      stage={<Place at="x" labels={labels}>
        <group position={PLATE}><HotPlate heat={1} /></group>
        <group position={HOT}><Beaker vol={250} level={0.06} look={LOOK.clear} /></group>
        <Puffs at={[HOT[0], HOT[1] + u(0.1), HOT[2]]} on seed={9} opt={{ rate: 4, life: 2.4, size: [u(0.02), u(0.08)], speed: u(0.05), spread: 0.3, color: '#ffffff', opacity: 0.16, jitter: u(0.012) }} />
        <group position={glassAt} rotation-x={dk > 0 ? -0.5 * ease(seg(dt, 0.6, 1.4)) * (1 - ease(seg(dt, 4.6, 5.4))) : 0}>
          <WatchGlass r={0.03}>
            {oil > 0.01 && <mesh position-y={u(0.004)} rotation-x={-Math.PI / 2} renderOrder={9}><circleGeometry args={[u(0.02), 32]} /><meshPhysicalMaterial color="#d9a52a" transparent opacity={0.7 * oil} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>}
          </WatchGlass>
          {dip.busy && <group position={[u(0.035), u(0.06), 0]} rotation={[0.2, -0.5, -0.4]}><Glove s={u(0.0055)} /></group>}
        </group>
        <group position={p(-0.17, 0, -0.1)}><NarrowBottle label="纯碱" sub="Na₂CO₃" /></group>
        <group position={RIVER}>
          <Beaker vol={250} level={0.07} look={water}>
            {settle > 0.02 && <mesh position-y={u(0.003 * settle)} renderOrder={6}><cylinderGeometry args={[u(0.031), u(0.031), u(0.006 * settle), 32]} /><meshStandardMaterial color="#8a7650" roughness={1} /></mesh>}
          </Beaker>
        </group>
        {stir && <group position={[RIVER[0] + u(Math.cos(at * 9) * 0.012), Y + u(0.004), RIVER[2] + u(Math.sin(at * 9) * 0.012)]} rotation-z={0.25}><GlassRod len={0.2} /></group>}
        <group position={ALUM} rotation-y={-0.3}><DropBottle label="明矾" band="#4a8ab0" look={LOOK.clear} dropper={!(alum.busy && at < 3)} /></group>
        {alum.busy && at < 3 && <group position={dropperAt}>
          <Dropper fill={at < 1.5 ? 0.4 : 0.1} />
          <group position={[0, u(0.1), 0]} rotation={[0.25, 0.3, 0.1]}><Glove s={u(0.0055)} /></group>
        </group>}
        {alum.busy && [0, 1, 2].map(i => <Drop key={i} at={[RIVER[0] + u(0.01), Y + u(0.15), RIVER[2]]} drop={u(0.075)} t={seg(at, 1.0, 2.2) * 3 - i} r={u(0.0018)} />)}
        <Micro at={MIC} r={u(0.065)} yaw={yaw} from={[HOT[0] - u(0.02), HOT[1] + u(0.03), HOT[2] + u(0.025)]} mix={{ Na: 7, CO3: 3, HCO3: 1, OH: 1 }} seed={8} />
      </Place>}
      lesson={<LessonBlock no="拓展" title="纯碱和铝盐" concept="水解在生活和生产里处处有用" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>纯碱（Na₂CO₃）溶液显碱性：CO₃²⁻ + H₂O ⇌ HCO₃⁻ + OH⁻。油脂在碱性条件下水解，变成能溶于水的物质；水解吸热，用热的纯碱溶液去油污效果更好。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>明矾 KAl(SO₄)₂·12H₂O 溶于水，Al³⁺ + 3H₂O ⇌ Al(OH)₃（胶体）+ 3H⁺</li>
            <li>Al(OH)₃ 胶体能吸附水中的悬浮杂质，一起沉降，水就变清了；自来水厂常用铝盐、铁盐作混凝剂</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">pH 只算 CO₃²⁻ 的第一步水解，取 25 °C、Ka2(H₂CO₃) = 4.7×10⁻¹¹；加热后的 pH 没有标出。</p>
        </>} />}
      finale={T.finale && <Fin tag="两个小实验做完了" big="盐类水解在生活和生产里处处有用">热的纯碱溶液去油污（0.10 mol/L Na₂CO₃ pH {meter(sodaPH())}）；明矾里的 Al³⁺ 水解生成 Al(OH)₃ 胶体，把河水里的泥沙沉下来。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="pH" value={meter(sodaPH())} unit="0.10 mol/L Na₂CO₃ · 25 °C" />
            <ParamTile symbol="油膜" value={oil > 0.5 ? '还在' : oil > 0.01 ? '变薄' : '褪掉了'} unit="表面皿" />
            <ParamTile symbol="河水" value={settle > 0.8 ? '变清' : settle > 0.05 ? '絮状物下沉' : '浑浊'} unit="水样" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">放大窗 · 纯碱溶液</h2>
          <p className="mt-1 text-[14px] text-white/85">CO₃²⁻ + H₂O ⇌ HCO₃⁻ + OH⁻</p>
          <Legend items={['Na', 'CO3', 'HCO3', 'OH', 'H2O']} />
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'dip'} pulse={next === 'dip'} onClick={() => dip.run()} disabled={busy || clean}>放进热纯碱溶液</LabButton>
        <LabButton primary={next === 'alum'} pulse={next === 'alum'} onClick={() => alum.run()} disabled={busy || clear || !clean}>滴明矾溶液</LabButton>
      </>}
      extras={null}
    />
  )
}
