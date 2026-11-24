// 碳和二氧化碳 · 第 5 课 汽水厂：灌装车间里的碳化罐朝镜头剖开。冷水从罐顶的喷头喷下来，罐里充着二氧化碳，压强越大，溶进水里的二氧化碳越多。
// 先用 100 kPa 充一次，再加到 300 kPa 充一次，比一比溶解量；然后灌装封盖，镜头移到输送线末端的抽检台，打开一瓶：压强减小，二氧化碳冒出来。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { lathe, useTasks, type Label, type RY } from '@/lab-kit'
import { Glove } from './gear'
import { Bubbles, Haze, Puffs } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, seg, useClock, useRun } from './parts'
import { ATM, CARB_SEC, CARB_T, FIZZ_SEC, PRESSURES, afterOpen, dissolved, volumes, type Pressure } from './physics'
import { BOTTLE_PROFILE, CARB, CARB_LEVEL, CARB_TOP, GAUGE, TABLE } from './plant'
import { sodaLabel } from './mats'
import { M, TOP, Place, type V3 } from './world'

const u = (v: number) => v * M
const IN = CARB.r - 0.14                                  // 罐的内半径（画面单位）
const B: V3 = [TABLE.x, TOP, TABLE.z]                     // 抽检台上那瓶汽水
const FILL_Y = 0.175                                      // 瓶里的液面（m）
const TASKS: Task[] = [
  { id: 'p1', text: '用 100 kPa 的二氧化碳充气，读溶解量', note: `5 °C、100 kPa 时，每升水约溶解 ${dissolved(CARB_T, 100).toFixed(1)} g 二氧化碳` },
  { id: 'p3', text: '把压强加到 300 kPa，再充一次', note: `约 ${dissolved(CARB_T, 300).toFixed(1)} g/L：压强越大，溶解的二氧化碳越多` },
  { id: 'fill', text: '灌装、封盖', note: '汽水在压强下灌进瓶里，马上拧紧瓶盖' },
  { id: 'open', text: '打开一瓶汽水', note: '瓶里的压强减小，二氧化碳的溶解度变小，从水里冒出来' },
]

/** 罐里剖开的那一半水：半个圆柱，朝镜头的剖面贴一层上亮下暗的渐变，最上面一道亮线是水面 */
function TankWater({ c, charging }: { c: number; charging: boolean }) {
  const y0 = CARB.y0 + CARB.head * 0.35, h = CARB_LEVEL - y0
  const face = useMemo(() => {
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256
    const g = cv.getContext('2d')!, q = g.createLinearGradient(0, 0, 0, 256)
    q.addColorStop(0, '#d9eef2'); q.addColorStop(0.08, '#a9d3de'); q.addColorStop(1, '#5d93a6')
    g.fillStyle = q; g.fillRect(0, 0, 4, 256); g.fillStyle = 'rgba(250,255,255,0.95)'; g.fillRect(0, 0, 4, 3)
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return <group position={[CARB.x, 0, CARB.z]}>
    <mesh position-y={y0 + h / 2} renderOrder={2}><cylinderGeometry args={[IN - 0.05, IN - 0.05, h, 40, 1, false, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#6fa6b8" transparent opacity={0.55} roughness={0.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, y0 + h / 2, 0.02]} renderOrder={3}><planeGeometry args={[(IN - 0.05) * 2, h]} /><meshBasicMaterial map={face} transparent opacity={0.72} depthWrite={false} toneMapped={false} /></mesh>
    {/* 溶进去的二氧化碳越多，水里细小的气泡越密（示意） */}
    {/* 充气时：罐底的分布器冒出细小的气泡，一边往上走一边变小、消失，就是溶进了水里（示意） */}
    {[[-1.6, 0.6], [0, 0.45], [1.6, 0.6], [-0.8, 0.5], [0.8, 0.5]].map(([x, k], i) => <Bubbles key={i} at={[x, y0 + 0.3, -IN * 0.35]} top={h * k} on={charging} rate={40} r={0.06} spread={0.9} speed={1.6} seed={11 + i} opacity={0.85} shrink />)}
    {/* 溶进去的二氧化碳越多，水里悬着的细小气泡越密 */}
    <Bubbles at={[0, y0 + 0.4, -IN * 0.45]} top={h - 0.6} on={c > 0.2} rate={10 + c * 20} r={0.045} spread={IN * 0.6} speed={0.9} seed={8} opacity={0.7} />
    {/* 剖开的罐里补一盏灯，内壁和水看得清 */}
    <pointLight position={[0, CARB.y0 + CARB.head + CARB.h * 0.6, 1.5]} intensity={28} distance={18} decay={1.6} color="#f4f8ff" />
  </group>
}
/** 罐顶喷头：充气时冷水从这里喷成细小的水流落下 */
function Spray({ on }: { on: boolean }) {
  return <Puffs at={[CARB.x, CARB_TOP - CARB.head - 0.6, CARB.z - 1.2]} on={on} opt={{ rate: 30, life: 1.2, size: [0.12, 0.3], speed: 5, dir: [0, -1, 0], spread: 0.35, color: '#e6f4f8', opacity: 0.5, accel: [0, -6, 0], drag: 0 }} seed={4} />
}
/** 压力表的指针：从 0 转到 p（kPa） */
function Needle({ p }: { p: number }) {
  const a = -(Math.PI * 0.75 + Math.min(p, GAUGE.max) / GAUGE.max * Math.PI * 1.5) + Math.PI   // 表盘上 0 在左下，顺时针转
  return <group position={[GAUGE.at[0], GAUGE.at[1], GAUGE.at[2] + 0.3]} rotation-z={a}>
    <mesh position-x={GAUGE.r * 0.38}><boxGeometry args={[GAUGE.r * 0.82, 0.06, 0.03]} /><meshBasicMaterial color="#c0281e" /></mesh>
    <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.09, 0.09, 0.05, 16]} /><meshStandardMaterial color="#1d1d1b" /></mesh>
  </group>
}

/** 一瓶汽水：绿色透明的 PET 瓶，环形瓶贴，里面是淡黄绿的汽水；open 0–1 瓶盖拧开的进度 */
function SodaBottle({ open = 0, foam = 0 }: { open?: number; foam?: number }) {
  const g = useMemo(() => {
    const prof = BOTTLE_PROFILE.map(([r, y]) => [r * M, y * M] as RY)
    const inner: RY[] = [[0, 0.004 * M]]; for (const [r, y] of BOTTLE_PROFILE) if (y > 0.004 && y <= FILL_Y) inner.push([(r - 0.0012) * M, y * M]); inner.push([0.0195 * M, FILL_Y * M], [0, FILL_Y * M])
    return { glass: lathe(prof, { segs: 48, crease: 50 }), liquid: lathe(inner, { segs: 48, crease: 50 }) }
  }, [])
  const label = useMemo(() => sodaLabel(), [])
  return <group>
    <mesh geometry={g.glass} renderOrder={7} castShadow><meshPhysicalMaterial color="#8ccfa4" transparent opacity={0.32} roughness={0.06} clearcoat={1} envMapIntensity={2.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.liquid} renderOrder={5}><meshPhysicalMaterial color="#d9e8a0" transparent opacity={0.55} roughness={0.1} clearcoat={0.5} depthWrite={false} /></mesh>
    <mesh position-y={u(0.088)}><cylinderGeometry args={[u(0.0322), u(0.0322), u(0.05), 48, 1, true]} /><meshStandardMaterial map={label} roughness={0.5} side={THREE.DoubleSide} /></mesh>
    {foam > 0.02 && <mesh position-y={u(FILL_Y) + u(0.006) * foam} renderOrder={6}><cylinderGeometry args={[u(0.019), u(0.024), u(0.012) * foam, 32]} /><meshStandardMaterial color="#fbfbf2" roughness={0.9} transparent opacity={0.9} /></mesh>}
    {/* 瓶盖：拧开时转着往上走，最后拿开 */}
    <group position-y={u(0.205) + u(0.012) * open} rotation-y={open * 7}>
      <mesh castShadow><cylinderGeometry args={[u(0.0148), u(0.0148), u(0.016), 36]} /><meshPhysicalMaterial color="#e0e3df" roughness={0.35} clearcoat={0.5} /></mesh>
      {Array.from({ length: 30 }, (_, i) => <mesh key={i} position={[Math.cos(i / 30 * 6.283) * u(0.0149), 0, Math.sin(i / 30 * 6.283) * u(0.0149)]}><boxGeometry args={[u(0.0011), u(0.014), u(0.0011)]} /><meshStandardMaterial color="#cfd3cf" roughness={0.5} /></mesh>)}
    </group>
  </group>
}

export default function Lesson5() {
  const [p, setP] = useState<Pressure>(100)
  const [rows, setRows] = useState<Partial<Record<Pressure, number>>>({})
  const [filled, setFilled] = useState(false)
  const [opened, setOpened] = useState(false)
  const T = useTasks('gewu:carbon:5', TASKS)
  const charge = useRun(CARB_SEC, () => { setRows(r => ({ ...r, [p]: dissolved(CARB_T, p) })); T.check(id => (id === 'p1' && p === 100) || (id === 'p3' && p === 300)) })
  const fill = useRun(2.2, () => { setFilled(true); T.check(id => id === 'fill') })
  const fizz = useClock()
  const open = useRun(1.8, () => { setOpened(true); fizz.start() })
  const busy = charge.busy || fill.busy || open.busy
  const resetAll = () => { charge.snap(0); fill.snap(0); open.snap(0); fizz.stop(); setP(100); setRows({}); setFilled(false); setOpened(false); T.reset() }
  const ft = opened ? fizz.t : 0
  const settled = opened && ft > FIZZ_SEC
  useEffect(() => { if (settled) T.check(id => id === 'open') }, [settled])   // eslint-disable-line react-hooks/exhaustive-deps

  // 充气：压强从 0 升到选的压强，溶解量跟着升
  const pNow = charge.busy ? p * ease(seg(charge.t, 0, CARB_SEC * 0.5)) : rows[p] !== undefined || filled ? p : 0
  const cNow = charge.busy ? dissolved(CARB_T, p) * seg(charge.t, 0.2, CARB_SEC) : rows[p] ?? 0
  const c3 = dissolved(CARB_T, 300)
  const inBottle = opened ? afterOpen(c3, ft) : c3
  const rate = opened ? Math.exp(-ft / 2.2) : 0
  const cap = filled && open.busy ? ease(seg(open.t, 0, 1.6)) : opened ? 1 : 0

  const task = T.current
  const want: Pressure = task?.id === 'p1' ? 100 : 300
  const { hint, next }: { hint: string; next: 'charge' | 'fill' | 'open' | 'p' | null } = !task ? { hint: '气体的溶解度随压强增大而增大。打开瓶盖，压强减小，二氧化碳从汽水里冒出来。', next: null }
    : charge.busy ? { hint: '二氧化碳充进碳化罐，冷水从喷头喷下来，吸收二氧化碳…', next: null }
    : fill.busy ? { hint: '汽水灌进瓶里，拧紧瓶盖…', next: null }
    : open.busy ? { hint: '拧开瓶盖…', next: null }
    : opened ? { hint: '大量气泡从汽水里冒出来…', next: null }
    : (task.id === 'p1' || task.id === 'p3') && p !== want ? { hint: `把罐内压强调到 ${want} kPa`, next: 'p' }
    : task.id === 'p1' ? { hint: '用 100 kPa 的二氧化碳充气', next: 'charge' }
    : task.id === 'p3' ? { hint: '压强加到 300 kPa 了，再充一次', next: 'charge' }
    : task.id === 'fill' ? { hint: '灌装、封盖', next: 'fill' }
    : { hint: '这瓶汽水在输送线末端的抽检台上。打开瓶盖', next: 'open' }

  const atTable = filled || fill.busy && fill.t > 1.4
  const labels: Label[] = atTable ? [
    { id: 'c', at: [B[0] + u(0.045), B[1] + u(0.12), B[2]], ax: 0, className: `scene-tag ${opened ? 'key' : ''} -translate-y-1/2`, children: <><small>溶解的二氧化碳</small>{inBottle.toFixed(1)} g/L</> },
    ...(opened ? [{ id: 'o', at: [B[0] - u(0.045), B[1] + u(0.2), B[2]] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '压强减小，二氧化碳冒出来' }] : []),
    { id: 'n1', at: [B[0], B[1] - u(0.01), B[2] + u(0.04)], ax: 0.5, name: true, className: 'scene-name', children: '抽检的一瓶汽水' },
  ] : [
    { id: 'p', at: [GAUGE.at[0] + 1.4, GAUGE.at[1], GAUGE.at[2]], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>罐内压强</small>{Math.round(pNow)} kPa</> },
    { id: 'c', at: [CARB.x + IN + 0.8, CARB_LEVEL - 4, CARB.z], ax: 0, className: `scene-tag ${cNow > 0 ? 'key' : ''} -translate-y-1/2`, children: <><small>每升水溶解</small>{cNow.toFixed(1)} g</> },
    { id: 'g', at: [CARB.x - IN + 0.6, CARB_TOP - CARB.head - 1.2, CARB.z], ax: 1, className: 'scene-name -translate-y-1/2', children: '二氧化碳（示意）' },
    { id: 'n1', at: [CARB.x, CARB_TOP + 1.6, CARB.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '碳化罐（剖开）' },
    { id: 'n2', at: [-6, 17, -28], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '灌装转台' },
    { id: 'n3', at: [14, 7.5, -28], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '输送线' },
  ]
  return (
    <LabShell title="碳和二氧化碳" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="碳化、灌装"
      stage={<Place at={atTable ? 'l5b' : 'l5a'} labels={labels}>
        <TankWater c={cNow / c3} charging={charge.busy} />
        <Spray on={charge.busy} />
        {/* 罐顶空间里的二氧化碳（示意）：压强越大越浓 */}
        <group position={[CARB.x, CARB_LEVEL + 0.05, CARB.z - 0.4]} scale={[1, 1, 0.5]}><Haze r={IN - 0.2} h={CARB_TOP - CARB.head * 0.5 - CARB_LEVEL} opacity={0.05 + 0.2 * pNow / 300} /></group>
        <Needle p={pNow} />
        {/* 抽检台上的汽水 */}
        <group position={B}><SodaBottle open={cap} foam={opened ? Math.min(1, ft / 0.6) * Math.exp(-ft / 3) * 1.6 : 0} /></group>
        {[[-0.12, -0.12], [0.13, -0.1]].map(([x, z], i) => <group key={i} position={[B[0] + u(x), B[1], B[2] + u(z)]}><SodaBottle /></group>)}
        <Bubbles at={[B[0], B[1] + u(0.01), B[2]]} top={u(FILL_Y - 0.012)} on={opened && rate > 0.06} rate={320 * rate} r={u(0.0022)} spread={u(0.026)} speed={u(0.14)} seed={5} opacity={0.9} />
        <Bubbles at={[B[0], B[1] + u(0.05), B[2]]} top={u(FILL_Y - 0.052)} on={opened && rate > 0.1} rate={200 * rate} r={u(0.0016)} spread={u(0.028)} speed={u(0.16)} seed={6} opacity={0.9} />
        <Puffs at={[B[0], B[1] + u(0.215), B[2]]} on={opened && ft < 1.2} opt={{ rate: 30, life: 0.9, size: [u(0.006), u(0.03)], speed: u(0.12), dir: [0, 1, 0], spread: 0.35, color: '#f4f8f6', opacity: 0.35, accel: [0, 0, 0], drag: 2 }} seed={7} />
        {open.busy && <group position={[B[0] + u(0.005), B[1] + u(0.215), B[2] + u(0.01)]} rotation={[0.2, open.t * 3, 0]}><group rotation-x={Math.PI}><Glove s={u(0.0062)} /></group></group>}
        {open.busy && <group position={[B[0] + u(0.04), B[1] + u(0.09), B[2] + u(0.02)]} rotation={[0.3, 0, -0.9]}><Glove /></group>}
      </Place>}
      lesson={<LessonBlock no="5" title="汽水厂" concept="压强越大，溶进去的二氧化碳越多" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>气体在水里的溶解度，随压强增大而增大，随温度升高而减小。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>汽水厂先把水冷却，再在碳化罐里加压充入二氧化碳，二氧化碳大量溶进水里；部分二氧化碳和水生成碳酸</li>
            <li>灌装后马上封盖，瓶里保持着较大的压强</li>
            <li>打开瓶盖，压强减小，二氧化碳的溶解度变小，从水里逸出，冒出大量气泡</li>
            <li>喝下汽水后常会打嗝：体内温度高，二氧化碳的溶解度变小</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">溶解量按“溶解的二氧化碳与它的压强成正比”算：5 °C 时一个大气压下每升水约溶解 2.8 g。碳化罐朝镜头剖开，罐里的二氧化碳本来是无色的，画成淡淡的灰白只为看清。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">汽水做好了，也打开了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">压强越大，溶进去的二氧化碳越多</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">100 kPa 时每升水约溶解 {dissolved(CARB_T, 100).toFixed(1)} g，300 kPa 时约 {c3.toFixed(1)} g。打开瓶盖，压强减小，二氧化碳的溶解度变小，从汽水里冒出来。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{atTable ? '瓶里每升汽水溶解的二氧化碳' : '每升水溶解的二氧化碳'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{(atTable ? inBottle : cNow).toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">g/L</span></div>
            <div className="mt-1 text-[12.5px] text-white/55">约合 {volumes(atTable ? inBottle : cNow).toFixed(1)} 升二氧化碳（标准状况）</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="p" value={String(Math.round(atTable ? (opened ? ATM : 300) : pNow))} unit="kPa · 二氧化碳的压强" />
            <ParamTile symbol="t" value={String(CARB_T)} unit="°C · 水温" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">压强和溶解量</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 font-medium">压强</th><th className="pb-1 font-medium">每升水溶解</th></tr></thead>
            <tbody>{PRESSURES.map(q => <tr key={q} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 tabular-nums">{q} kPa</td><td className={`rounded-r-lg tabular-nums ${rows[q] !== undefined ? 'font-semibold text-[#7fe3d4]' : ''}`}>{rows[q] !== undefined ? `${rows[q]!.toFixed(1)} g` : '—'}</td></tr>)}</tbody>
          </table>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'charge'} pulse={next === 'charge'} onClick={() => charge.run()} disabled={busy || filled}>充入二氧化碳</LabButton>
        <LabButton primary={next === 'fill'} pulse={next === 'fill'} onClick={() => fill.run()} disabled={busy || filled || rows[300] === undefined}>灌装封盖</LabButton>
        <LabButton primary={next === 'open'} pulse={next === 'open'} onClick={() => open.run()} disabled={busy || !filled || opened}>打开瓶盖</LabButton>
      </>}
      extras={
        <Control label="罐内压强">
          <Segmented label="罐内压强" pulse={next === 'p'} want={String(want)} value={String(p)} disabled={busy || filled} onChange={k => setP(Number(k) as Pressure)} options={PRESSURES.map(q => ({ value: String(q), label: `${q} kPa` }))} />
        </Control>
      }
    />
  )
}
