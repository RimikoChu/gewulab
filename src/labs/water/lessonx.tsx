// 水的净化和组成 · 拓展课 开放日展台：厂门口的一张展台上做两件小事。
// 一、自制简易净水器：剪掉瓶底的塑料瓶倒过来，从瓶口往上依次装蓬松棉、活性炭、石英砂、小卵石，倒进浑水，看流出来的水。
// 二、一只滴水的龙头：每秒滴一滴，用量筒接一分钟，算一算一天、一年漏掉多少水。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, shell, useTasks, type Label } from '@/lab-kit'
import { Beaker, Glass, Glove, IronStand, m, waterLook } from './gear'
import { Drips } from './fx'
import { LESSONS, goLesson } from './lessons'
import { seg, useRun } from './parts'
import { DAY, LAYERS, RIVER_NTU, YEAR, diyTurb, drip, fmtNtu, murk } from './physics'
import { expoTex, grainTex, rng, scaleTex } from './mats'
import { M, SITE, TOP, Place, type V3 } from './world'

const X0 = SITE.expo.x, Y = TOP, Z = SITE.expo.z
const DIY: V3 = [X0 - 0.2 * M, Y, Z], TAP: V3 = [X0 + 0.26 * M, Y, Z - 0.02 * M]
/** 倒过来的瓶子：瓶口朝下在 NECK，各层从下往上的高度（m，相对瓶口） */
const NECK = 0.12
const BANDS: [number, number][] = [[0.03, 0.07], [0.07, 0.11], [0.11, 0.15], [0.15, 0.185]]   // 蓬松棉、活性炭、石英砂、小卵石
const FILL_ORDER = [3, 2, 1, 0]     // 从瓶口往上装：先装最下层（LAYERS 里排在最后的蓬松棉）
type Part = 'diy' | 'drip'
const TASKS: Task[] = [
  { id: 'layers', text: '从瓶口往上装好四层', note: '从上到下：小卵石、石英砂、活性炭、蓬松棉' },
  { id: 'pour', text: '倒进一杯浑水，看流出来的水', note: `流出来的水约 ${fmtNtu(diyTurb(4))} NTU，清多了；但它还不是纯水` },
  { id: 'drip', text: '用量筒接一分钟的滴水', note: `每秒一滴，一分钟约 ${Math.round(drip(1, 60))} mL` },
  { id: 'calc', text: '算一算一天、一年漏掉多少', note: `一天约 ${(drip(1, DAY) / 1000).toFixed(2)} L，一年约 ${Math.round(drip(1, YEAR) / 1000)} L` },
]

/** 剪掉瓶底、倒过来的塑料瓶：原点在瓶口 */
function Bottle() {
  const g = useMemo(() => shell(m([[0.0125, 0], [0.0125, 0.02], [0.016, 0.03], [0.042, 0.065], [0.045, 0.08], [0.045, 0.2]]), 0.0008 * M, { segs: 48 }), [])
  return <mesh geometry={g} renderOrder={7}><meshPhysicalMaterial color="#22302f" transparent opacity={0.28} roughness={0.12} clearcoat={0.8} envMapIntensity={2.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
}
/** 瓶子里 y0 到 y1 这一段的内半径（瓶肩往下收） */
const rAt = (y: number) => y < 0.03 ? 0.011 : y < 0.065 ? 0.015 + (y - 0.03) / 0.035 * 0.026 : 0.044
/** 一层滤料：按瓶子的形状车出来的实心段，k 是装了多少（0–1） */
function Layer({ i, k }: { i: number; k: number }) {
  const id = LAYERS[i].id, [y0, y1] = BANDS[3 - i], top = y0 + (y1 - y0) * k
  const g = useMemo(() => {
    if (id === 'pebble') {   // 小卵石：一颗颗扁圆的石子
      const r = rng(5), gs: THREE.BufferGeometry[] = []
      for (let n = 0; n < 34; n++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.034, s = 0.006 + r() * 0.004; const s2 = new THREE.IcosahedronGeometry(s * M, 1); s2.scale(1.2, 0.7, 1); s2.translate(Math.cos(a) * rr * M, (y0 + 0.006 + (n % 3) * 0.009) * M, Math.sin(a) * rr * M); gs.push(s2) }
      return mergeGeometries(gs)
    }
    const pts: [number, number][] = [[0, y0]]; for (let y = y0; y <= y1 + 1e-6; y += 0.005) pts.push([rAt(y) - 0.0008, y]); pts.push([0, y1])
    return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * M, y * M)), 40)
  }, [id, y0, y1])
  const mat = useMemo(() => {
    if (id === 'cotton') return <meshStandardMaterial color="#f4f2ec" roughness={1} />
    if (id === 'carbon') return <meshStandardMaterial map={grainTex('#1d1e1f', '#2e3032', '#0f1010', 7, 17)} roughness={1} />
    if (id === 'sand') return <meshStandardMaterial map={grainTex('#c7b48a', '#d9c9a2', '#a89270', 5, 11)} roughness={1} />
    return <meshStandardMaterial color="#9a958a" roughness={0.7} />
  }, [id])
  if (k < 0.02) return null
  return id === 'pebble' ? <mesh geometry={g} castShadow scale={[1, 1, 1]} visible={k > 0.5}>{mat}</mesh> : <mesh geometry={g} scale={[1, (top - y0) / (y1 - y0), 1]} position-y={y0 * M * (1 - (top - y0) / (y1 - y0))}>{mat}</mesh>
}
/** 量筒：10 mL，带刻度。原点在底座正中；v 是接了多少 mL */
function Cylinder({ v }: { v: number }) {
  const g = useMemo(() => shell(m([[0, 0], [0.0085, 0], [0.0085, 0.14], [0.0095, 0.143]]), 0.001 * M, { segs: 28 }), [])
  const H10 = 0.12, h = v / 10 * H10
  return <group>
    <mesh position-y={0.003 * M} castShadow><cylinderGeometry args={[0.022 * M, 0.024 * M, 0.006 * M, 6]} /><meshPhysicalMaterial color="#eef6f6" transparent opacity={0.5} roughness={0.1} clearcoat={1} /></mesh>
    <group position-y={0.006 * M}>
      <mesh geometry={g} renderOrder={7}><Glass opacity={0.2} /></mesh>
      {h > 0.001 && <mesh position-y={(0.001 + h / 2) * M} renderOrder={5}><cylinderGeometry args={[0.0074 * M, 0.0074 * M, h * M, 20]} /><meshStandardMaterial color="#b9dbe4" transparent opacity={0.6} depthWrite={false} /></mesh>}
      <mesh position={[0, (0.001 + H10 / 2) * M, 0.0087 * M]}><planeGeometry args={[0.008 * M, (H10 + 0.004) * M]} /><meshBasicMaterial map={scaleTex(10, false)} color="#2a3a44" transparent depthWrite={false} /></mesh>
    </group>
  </group>
}
/** 一只水龙头：从台面立起的不锈钢管，鹅颈弯下来，顶上一只把手。原点在底座；出水口在 SPOUT */
const SPOUT: V3 = [0.06, 0.28, 0]
function Faucet() {
  const neck = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.2, 0], [0, 0.32, 0], [0.03, 0.345, 0], [0.06, 0.32, 0], [0.06, 0.29, 0]].map(([x, y, z]) => new THREE.Vector3(x * M, y * M, z * M))), 40, 0.006 * M, 16), [])
  return <group>
    <mesh position-y={0.006 * M}><cylinderGeometry args={[0.025 * M, 0.028 * M, 0.012 * M, 32]} /><Metal kind="chrome" rough={0.1} /></mesh>
    <mesh position-y={0.105 * M} castShadow><cylinderGeometry args={[0.011 * M, 0.012 * M, 0.19 * M, 24]} /><Metal kind="chrome" rough={0.1} /></mesh>
    <mesh geometry={neck} castShadow><Metal kind="chrome" rough={0.1} /></mesh>
    <mesh position={[0, 0.215 * M, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.013 * M, 0.013 * M, 0.03 * M, 20]} /><Metal kind="chrome" rough={0.1} /></mesh>
    <mesh position={[-0.03 * M, 0.235 * M, 0]} rotation-z={0.5}><boxGeometry args={[0.008 * M, 0.06 * M, 0.012 * M]} /><Metal kind="chrome" rough={0.1} /></mesh>
  </group>
}

export default function LessonX() {
  const [part, setPart] = useState<Part>('diy')
  const [layers, setLayers] = useState(0)
  const [poured, setPoured] = useState(false)
  const [caught, setCaught] = useState(false)
  const [calc, setCalc] = useState(false)
  const T = useTasks('gewu:water:x', TASKS)
  const fill = useRun(1.4, () => { const n = layers + 1; setLayers(n); if (n >= 4) T.check(id => id === 'layers') })
  const pour = useRun(7, () => { setPoured(true); T.check(id => id === 'pour') })
  const catchR = useRun(6, () => { setCaught(true); T.check(id => id === 'drip') })
  const busy = fill.busy || pour.busy || catchR.busy
  const doCalc = () => { if (!caught || calc) return; setCalc(true); T.check(id => id === 'calc') }
  const resetAll = () => { fill.snap(0); pour.snap(0); catchR.snap(0); setPart('diy'); setLayers(0); setPoured(false); setCaught(false); setCalc(false); T.reset() }

  const layerK = (i: number) => { const order = FILL_ORDER.indexOf(i); return order < layers ? 1 : order === layers && fill.busy ? seg(fill.t, 0.2, 1.3) : 0 }
  const pt = pour.t, topWater = pour.busy ? Math.min(seg(pt, 0.4, 1.6), 1 - seg(pt, 3.5, 6.2)) : 0
  const outFill = poured ? 0.45 : pour.busy ? 0.45 * seg(pt, 2, 6.8) : 0
  const outNtu = diyTurb(layers), kOut = murk(outNtu)
  const ml = caught ? drip(1, 60) : catchR.busy ? drip(1, 60 * catchR.t / 6) : 0

  const task = T.current
  const wantPart: Part = task && (task.id === 'drip' || task.id === 'calc') ? 'drip' : 'diy'
  const { hint, next }: { hint: string; next: 'a' | 'b' | 'part' | null } = !task ? { hint: '自制净水器能让浑水变清，但除不掉溶在水里的物质，不能直接喝。一滴水也要珍惜。', next: null }
    : busy ? { hint: fill.busy ? `装进${LAYERS[FILL_ORDER[layers]].name}…` : pour.busy ? '浑水一层层往下渗…' : '每秒一滴，接一分钟（过程加快）…', next: null }
    : part !== wantPart ? { hint: wantPart === 'drip' ? '换到“滴水的龙头”' : '换到“简易净水器”', next: 'part' }
    : task.id === 'layers' ? { hint: `往瓶里装${LAYERS[FILL_ORDER[layers]].name}（${LAYERS[FILL_ORDER[layers]].what}）`, next: 'a' }
    : task.id === 'pour' ? { hint: '四层装好了。倒进一杯浑水', next: 'b' }
    : task.id === 'drip' ? { hint: '这只龙头没关紧，每秒滴一滴。用量筒接一分钟', next: 'a' }
    : { hint: `一分钟接了 ${Math.round(drip(1, 60))} mL。算一算一天、一年漏掉多少`, next: 'b' }

  const labels: Label[] = [
    ...LAYERS.map((l, i) => ({ id: `l${i}`, at: [DIY[0] + 0.05 * M, Y + (NECK + (BANDS[3 - i][0] + BANDS[3 - i][1]) / 2) * M, DIY[2]] as V3, ax: 0, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: layerK(i) > 0.5 ? 1 : 0 }, children: l.name })),
    ...(poured ? [{ id: 'o', at: [DIY[0] - 0.06 * M, Y + 0.06 * M, DIY[2]] as V3, ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>流出来的水</small>约 {fmtNtu(outNtu)} NTU</> }] : []),
    ...(caught ? [{ id: 'c', at: [TAP[0] + SPOUT[0] * M + 0.03 * M, Y + 0.1 * M, TAP[2]] as V3, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>一分钟</small>{ml.toFixed(0)} mL</> }] : []),
    { id: 'n1', at: [DIY[0], Y + 0.36 * M, DIY[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '简易净水器' },
    { id: 'n2', at: [TAP[0] + 0.03 * M, Y + 0.37 * M, TAP[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '滴水的龙头' },
  ]
  return (
    <LabShell title="水的净化和组成" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={part === 'diy' ? '简易净水器' : '滴水的龙头'}
      stage={<Place at="x" labels={labels}>
        {/* 展台后面的一面展板：铝框、两根立柱，印着“一滴水的旅程” */}
        <group position={[X0, 0, Z - 1.9 * M]}>
          <mesh position-y={1.35 * M}><planeGeometry args={[2.6 * M, 1.3 * M]} /><meshStandardMaterial map={expoTex()} color="#c9cfd2" roughness={0.85} /></mesh>
          <mesh position={[0, 1.35 * M, -0.03]} castShadow><boxGeometry args={[2.66 * M, 1.36 * M, 0.04]} /><Metal kind="aluminum" grain="brushed" /></mesh>
          {[-1, 1].map(s => <mesh key={s} position={[s * 1.34 * M, 1.1 * M, -0.03]} castShadow><boxGeometry args={[0.05 * M, 2.2 * M, 0.05 * M]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
          {[-1, 1].map(s => <mesh key={s} position={[s * 1.34 * M, 0.02 * M, 0]}><boxGeometry args={[0.08 * M, 0.04 * M, 0.5 * M]} /><Metal kind="aluminum" /></mesh>)}
        </group>
        {/* 简易净水器：铁架台的铁圈托着倒过来的瓶子，下面接一只烧杯 */}
        <group position={[DIY[0], Y, DIY[2] - 0.06 * M]}><IronStand ringY={NECK + 0.075} reach={0.1} ring={0.047} rodH={0.42} /></group>
        <group position={[DIY[0], Y + NECK * M, DIY[2]]}>
          <Bottle />
          {LAYERS.map((_, i) => <Layer key={i} i={i} k={layerK(i)} />)}
          {topWater > 0.02 && <mesh position-y={(0.19 + 0.012 * topWater) * M} renderOrder={5}><cylinderGeometry args={[0.043 * M, 0.043 * M, 0.024 * topWater * M, 36]} /><meshStandardMaterial color={waterLook(murk(RIVER_NTU)).color} transparent opacity={0.85} depthWrite={false} /></mesh>}
        </group>
        <Drips at={[DIY[0], Y + NECK * M, DIY[2]]} drop={0.05 * M} on={pour.busy && pt > 2} every={0.3} r={0.003 * M} color={waterLook(kOut).color} />
        <group position={[DIY[0], Y, DIY[2]]}><Beaker vol={250} fill={outFill} k={kOut} /></group>
        {/* 倒浑水的烧杯 */}
        {pour.busy && pt < 2 && <group position={[DIY[0] + 0.07 * M, Y + (NECK + 0.24) * M, DIY[2]]} rotation-z={1.6 * seg(pt, 0.2, 0.8)}><group position={[0, -0.095 * M, 0]}><Beaker vol={250} fill={0.6 * (1 - seg(pt, 0.5, 1.6))} k={murk(RIVER_NTU)} /></group>
          <group position={[0.06 * M, -0.05 * M, 0.01 * M]} rotation={[0.5, 0, -Math.PI / 2 - 0.35]}><Glove /></group></group>}
        {/* 滴水的龙头和量筒 */}
        <group position={TAP}><Faucet /></group>
        <group position={[TAP[0] + SPOUT[0] * M, Y, TAP[2]]}><Cylinder v={ml} /></group>
        <Drips at={[TAP[0] + SPOUT[0] * M, Y + SPOUT[1] * M, TAP[2]]} drop={(SPOUT[1] - 0.02 - ml / 10 * 0.12) * M} on every={catchR.busy ? 0.18 : 1.0} r={0.0025 * M} />
      </Place>}
      lesson={<LessonBlock no="拓展" title="开放日展台" concept="浑水能变清，一滴水也值得珍惜" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>简易净水器里，小卵石、石英砂起过滤作用，活性炭起吸附作用，蓬松棉托住滤料。它能除去不溶性杂质、色素和异味，但除不掉溶在水里的钙、镁化合物，也不能杀菌，得到的水不能直接喝。</p>
          <p className="mt-3">一滴水约 0.05 mL（估算）。每秒一滴：一分钟 3 mL，一天约 4.32 L，一年约 1577 L。地球上的淡水只占很小一部分，要节约用水。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">展台上的两件事都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">自制净水器让浑水变清；一只滴水的龙头一年漏掉约 {Math.round(drip(1, YEAR) / 1000)} L</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          {part === 'diy' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">流出来的水的浊度</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{poured ? fmtNtu(outNtu) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">NTU</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="浑水" value={`约 ${fmtNtu(RIVER_NTU)}`} unit="NTU · 倒进去的" />
              <ParamTile symbol="滤料" value={`${layers} / 4`} unit="层" />
            </div>
            <h2 className="mt-4 text-[12.5px] text-white/55">从上到下</h2>
            <ul className="mt-2 flex flex-col gap-1 text-[13.5px]">{LAYERS.map((l, i) => <li key={l.id} className={`flex justify-between rounded-lg px-2 py-1.5 ${layerK(i) > 0.5 ? 'bg-white/[0.08]' : 'bg-white/[0.03] text-white/45'}`}><span>{l.name}</span><span className="text-white/65">{l.what}</span></li>)}</ul>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">一年漏掉</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{calc ? `约 ${Math.round(drip(1, YEAR) / 1000)}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">L</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="一滴" value="约 0.05" unit="mL · 估算" />
              <ParamTile symbol="一秒" value="1" unit="滴" />
            </div>
            <table className="mt-4 w-full text-center text-[13.5px]">
              <tbody>{([['一分钟', caught ? `${drip(1, 60).toFixed(0)} mL` : '—'], ['一天', calc ? `约 ${(drip(1, DAY) / 1000).toFixed(2)} L` : '—'], ['一年', calc ? `约 ${Math.round(drip(1, YEAR) / 1000)} L` : '—']] as [string, string][]).map(([a, b]) => <tr key={a} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{a}</td><td className="rounded-r-lg tabular-nums">{b}</td></tr>)}</tbody>
            </table>
          </>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'a'} pulse={next === 'a'} onClick={() => part === 'diy' ? fill.run() : catchR.run()} disabled={busy || (part === 'diy' ? layers >= 4 : caught)}>{part === 'diy' ? '装一层' : '接一分钟'}</LabButton>
        <LabButton primary={next === 'b'} pulse={next === 'b'} onClick={() => part === 'diy' ? pour.run() : doCalc()} disabled={busy || (part === 'diy' ? layers < 4 || poured : !caught || calc)}>{part === 'diy' ? '倒入浑水' : '算一天、一年'}</LabButton>
      </>}
      extras={
        <Control label="展台">
          <Segmented label="展台" pulse={next === 'part'} want={next === 'part' ? wantPart : null} disabled={busy} value={part} onChange={k => setPart(k as Part)} options={[{ value: 'diy', label: '简易净水器' }, { value: 'drip', label: '滴水的龙头' }]} />
        </Control>
      }
    />
  )
}
