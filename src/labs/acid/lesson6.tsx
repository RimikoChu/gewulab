// 酸、碱和中和 · 第 6 课 溶液的酸碱度：排放口旁的不锈钢取样台。三只取样瓶（调节池进水、中和池出水、加药间碱液），
// 一块白瓷板上三条 pH 试纸，一张立着的标准比色卡，一根玻璃棒。用玻璃棒蘸取水样滴在试纸上，再和比色卡对照，读出 pH。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { shell, useTasks, type Label } from '@/lab-kit'
import { GlassRod, Glove, LiquidMat, Tile, m, u } from './gear'
import { bottleLabel, chartTex, paperTex } from './mats'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { DISCHARGE, WATERS, acidity, canDischarge, paperColor, paperRead, type WaterKey } from './physics'
import { SAMPLE_T } from './plant'
import { TOP, Place, type V3 } from './world'

const X0 = SAMPLE_T.x, Y = TOP, Z = SAMPLE_T.z
const KEYS: WaterKey[] = ['inflow', 'outflow', 'alkali']
const BOT: Record<WaterKey, V3> = { inflow: [X0 - u(0.17), Y, Z - u(0.08)], outflow: [X0 - u(0.07), Y, Z - u(0.1)], alkali: [X0 + u(0.03), Y, Z - u(0.09)] }
const TILE: V3 = [X0 - u(0.06), Y, Z + u(0.07)]
const STRIP_X = [-0.035, 0, 0.035]
const stripAt = (i: number): V3 => [TILE[0] + u(STRIP_X[i]), Y + u(0.0062), TILE[2]]
const CHART: V3 = [X0 + u(0.16), Y, Z + u(0.02)]
const ROD_HOME: V3 = [X0 + u(0.05), Y + u(0.004), Z + u(0.1)]
const TASKS: Task[] = [
  { id: 'inflow', text: '测调节池进水的 pH', note: 'pH 2：小于 7，显酸性。这样的废水不能直接排放' },
  { id: 'outflow', text: '测中和池出水的 pH', note: 'pH 7：中性，在 6～9 之间，可以排放' },
  { id: 'alkali', text: '测加药间碱液的 pH', note: 'pH 12：大于 7，显碱性。pH 越大，碱性越强' },
]
/** 取样瓶：白色的塑料广口瓶，瓶盖拧下来放在旁边，瓶身贴着水样标签。原点在瓶底 */
function SampleBottle({ label, look, cap }: { label: string; look: { color: string; opacity: number; vivid: boolean }; cap: boolean }) {
  const g = useMemo(() => shell(m([[0, 0], [0.028, 0], [0.031, 0.004], [0.031, 0.085], [0.024, 0.096], [0.02, 0.1], [0.02, 0.11]]), u(0.0015), { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><meshPhysicalMaterial color="#eef0ec" transparent opacity={0.55} roughness={0.35} clearcoat={0.3} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh position-y={u(0.04)} renderOrder={5}><cylinderGeometry args={[u(0.029), u(0.029), u(0.072), 32]} /><LiquidMat {...look} /></mesh>
    <mesh position-y={u(0.05)} rotation-y={0.2}><cylinderGeometry args={[u(0.0313), u(0.0313), u(0.04), 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, '#2f8f6b', '水样')} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    <group position={cap ? [0, u(0.11), 0] : [u(0.05), 0, u(0.02)]} rotation-x={cap ? 0 : Math.PI}>
      <mesh position-y={u(cap ? 0.007 : -0.007)} castShadow><cylinderGeometry args={[u(0.023), u(0.023), u(0.014), 32]} /><meshPhysicalMaterial color="#2f62a8" roughness={0.4} clearcoat={0.4} /></mesh>
    </group>
  </group>
}

export default function Lesson6() {
  const [pick, setPick] = useState<WaterKey>('inflow')
  const [wet, setWet] = useState<Record<string, boolean>>({})
  const [read, setRead] = useState<Record<string, boolean>>({})
  const T = useTasks('gewu:acid:6', TASKS)
  const dip = useRun(3.4, () => setWet(w => ({ ...w, [pick]: true })))
  const look = useRun(1.8, () => { setRead(r => ({ ...r, [pick]: true })); T.check(id => id === pick) })
  const busy = dip.busy || look.busy
  const resetAll = () => { dip.snap(0); look.snap(0); setPick('inflow'); setWet({}); setRead({}); T.reset() }

  const task = T.current
  const want = (task?.id as WaterKey) ?? pick
  const W = WATERS[pick], idx = KEYS.indexOf(pick)
  const { hint, next }: { hint: string; next: 'dip' | 'look' | 'pick' | null } = !task ? { hint: 'pH 小于 7 显酸性，等于 7 显中性，大于 7 显碱性。排放的水 pH 要在 6～9 之间。', next: null }
    : dip.busy ? { hint: '用干净的玻璃棒蘸取水样，滴在试纸上…', next: null }
    : look.busy ? { hint: '把试纸显示的颜色和标准比色卡比较…', next: null }
    : pick !== want ? { hint: `选“${WATERS[want].name}”`, next: 'pick' }
    : !wet[pick] ? { hint: `用玻璃棒蘸取${W.name}，滴在 pH 试纸上`, next: 'dip' }
    : { hint: '试纸变色了。和标准比色卡对照，读出 pH', next: 'look' }

  // 蘸取：玻璃棒从台上拿起，伸进瓶口，移到试纸上点一下，再放下
  const t = dip.t
  const mouth: V3 = [BOT[pick][0], Y + u(0.09), BOT[pick][2]], strip = stripAt(idx)
  const rodAt: V3 = !dip.busy ? ROD_HOME : t < 1.2 ? liftPath(ROD_HOME, mouth, Y + u(0.22), seg(t, 0, 1.2)) : t < 2.3 ? liftPath(mouth, [strip[0], strip[1] + u(0.001), strip[2]], Y + u(0.22), seg(t, 1.2, 2.3)) : liftPath([strip[0], strip[1], strip[2]], ROD_HOME, Y + u(0.22), seg(t, 2.6, 3.4))
  const stripCol = (i: number) => { const k = KEYS[i]; const on = wet[k] || (dip.busy && k === pick && t > 2.2); return on ? paperColor(WATERS[k].pH) : null }
  const tex = useMemo(() => ({ paper: paperTex(), chart: chartTex() }), [])
  const shown = read[pick] || (look.busy && look.t > 1.0)
  const reading = paperRead(W.pH)
  // 比色卡上对应的那一格：一圈亮框
  const cw = (1 - 60 / 1024) / 14, cu = (30 / 1024) + (reading - 0.5) * cw

  const labels: Label[] = [
    ...KEYS.map((k, i) => ({ id: `s${k}`, at: [stripAt(i)[0], Y, TILE[2] + u(0.05)] as V3, ax: 0.5, className: k === pick ? 'scene-tag key' : 'scene-name', children: read[k] ? `pH ${paperRead(WATERS[k].pH)}` : WATERS[k].name.slice(-2) })),
    ...(shown ? [{ id: 'r', at: [CHART[0] - u(0.09) + u(0.18) * cu, Y + u(0.07), CHART[2]] as V3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>比色卡</small>pH {reading}</> }] : []),
    { id: 'n1', at: [CHART[0], Y - u(0.004), CHART[2] + u(0.045)], ax: 0.5, name: true, className: 'scene-name', children: '标准比色卡' },
  ]
  return (
    <LabShell title="酸、碱和中和" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="测 pH"
      stage={<Place at="l6" labels={labels}>
        {KEYS.map(k => <group key={k} position={BOT[k]} rotation-y={0.15}><SampleBottle label={WATERS[k].name} cap={false} look={k === 'inflow' ? { color: '#c9cfbc', opacity: 0.42, vivid: false } : k === 'alkali' ? { color: '#dfe6e4', opacity: 0.32, vivid: false } : { color: '#cfe3e6', opacity: 0.28, vivid: false }} /></group>)}
        <group position={TILE}><Tile w={0.13} d={0.08} /></group>
        {STRIP_X.map((x, i) => { const c = stripCol(i); return <group key={i} position={stripAt(i)}>
          <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[u(0.012), u(0.055)]} /><meshStandardMaterial map={tex.paper} roughness={0.9} /></mesh>
          {c && <mesh position-y={u(0.0003)} rotation-x={-Math.PI / 2}><circleGeometry args={[u(0.0075), 24]} /><meshStandardMaterial color={c} roughness={0.85} emissive={c} emissiveIntensity={0.15} /></mesh>}
        </group> })}
        {/* 比色卡：插在一个小支架上，斜着朝向镜头 */}
        <group position={CHART}>
          <RoundedBox args={[u(0.2), u(0.008), u(0.03)]} radius={u(0.002)} position-y={u(0.004)} castShadow><meshStandardMaterial color="#2b3035" roughness={0.5} /></RoundedBox>
          <group position={[0, u(0.03), -u(0.004)]} rotation-x={-0.35}>
            <mesh castShadow><boxGeometry args={[u(0.19), u(0.06), u(0.002)]} /><meshStandardMaterial color="#f2f0ea" roughness={0.8} /></mesh>
            <mesh position-z={u(0.0011)}><planeGeometry args={[u(0.18), u(0.056)]} /><meshStandardMaterial map={tex.chart} roughness={0.75} /></mesh>
            {shown && <mesh position={[u(-0.09 + 0.18 * cu), u(0.0035), u(0.0016)]}><planeGeometry args={[u(0.18 * cw + 0.004), u(0.032)]} /><meshBasicMaterial color="#ffe9a8" transparent opacity={0.35} toneMapped={false} /></mesh>}
          </group>
        </group>
        <group position={rodAt} rotation={dip.busy ? [0, 0, -0.2] : [0, 0.4, Math.PI / 2]}>
          <GlassRod len={0.2} wet={dip.busy && t > 1.1 && t < 2.4 ? { color: '#dfe8e6', opacity: 0.6, vivid: false } : undefined} />
          {dip.busy && <group position={[0, u(0.12), 0]} rotation={[0.3, 0, 0.1]}><Glove s={u(0.0055)} /></group>}
        </group>
        {look.busy && <group position={[stripAt(idx)[0] + u(0.01), Y + u(0.02), stripAt(idx)[2] + u(0.02)]} rotation={[1.3, 0.3, 0]}><Glove s={u(0.005)} /></group>}
      </Place>}
      lesson={<LessonBlock no="6" title="溶液的酸碱度" concept="pH 小于 7 显酸性，大于 7 显碱性" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>溶液的酸碱度常用 pH 表示，范围通常在 0～14 之间：</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>酸性溶液的 pH &lt; 7，pH 越小，酸性越强</li>
            <li>中性溶液的 pH = 7</li>
            <li>碱性溶液的 pH &gt; 7，pH 越大，碱性越强</li>
          </ul>
          <p className="mt-3">测定 pH 最简便的方法是用 pH 试纸：在白瓷板或玻璃片上放一小片 pH 试纸，用玻璃棒蘸取待测液滴到试纸上，把试纸显示的颜色和标准比色卡比较，读出 pH。</p>
          <p className="mt-3 text-[13.5px] text-white/65">不能把试纸直接伸进待测液里（会污染试剂），也不能先把试纸润湿（会把溶液稀释）。pH 试纸只能读到整数，要测得更准用 pH 计。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三瓶水样都测过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">pH 小于 7 显酸性，大于 7 显碱性</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">进水 pH 2，酸性；出水 pH 7，中性，可以排放；碱液 pH 12，碱性。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{W.name}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{read[pick] ? reading : '—'}</div>
            <div className="mt-1 text-[13px] text-white/60">{read[pick] ? acidity(W.pH) : 'pH'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">水样记录 · 排放要求 pH {DISCHARGE[0]}～{DISCHARGE[1]}</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium">水样</th><th className="pb-1 font-medium">pH</th><th className="pb-1 font-medium">酸碱性</th><th className="pb-1 font-medium">排放</th></tr></thead>
            <tbody>{KEYS.map((k, i) => <tr key={k} className={i % 2 ? '' : 'bg-white/[0.04]'}>
              <td className="rounded-l-lg px-2 py-1.5 text-left text-white/70">{WATERS[k].name}</td>
              <td className="tabular-nums">{read[k] ? paperRead(WATERS[k].pH) : '—'}</td>
              <td>{read[k] ? acidity(WATERS[k].pH) : '—'}</td>
              <td className="rounded-r-lg">{read[k] ? (canDischarge(WATERS[k].pH) ? '可以' : '不行') : '—'}</td>
            </tr>)}</tbody>
          </table>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full">{Array.from({ length: 14 }, (_, i) => <div key={i} className="flex-1" style={{ background: paperColor(i + 1) }} />)}</div>
          <div className="mt-1 flex justify-between text-[11.5px] text-white/50"><span>1 酸性</span><span>7 中性</span><span>碱性 14</span></div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'dip'} pulse={next === 'dip'} onClick={() => dip.run()} disabled={busy || !!wet[pick]}>蘸取，滴在试纸上</LabButton>
        <LabButton primary={next === 'look'} pulse={next === 'look'} onClick={() => look.run()} disabled={busy || !wet[pick] || !!read[pick]}>对照比色卡</LabButton>
      </>}
      extras={
        <Control label="水样">
          <Segmented label="水样" pulse={next === 'pick'} want={want} value={pick} disabled={busy} onChange={k => setPick(k as WaterKey)} options={KEYS.map(k => ({ value: k, label: WATERS[k].name }))} />
        </Control>
      }
    />
  )
}
