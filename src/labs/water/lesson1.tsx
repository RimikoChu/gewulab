// 水的净化和组成 · 第 1 课 天然水里有什么：河边的取样台。用取样桶从河里打一桶水，倒进烧杯；静置，杯底沉下一层泥，上面的水还是浑的。
// 再判断：河水是纯净物还是混合物？拿一瓶蒸馏水倒进另一只烧杯，再判断一次。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, Painted, mergeParts, shell, useTasks, type Label, type Part } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Beaker, Glove, Hose, Turbidimeter, m } from './gear'
import { ease, lerp, liftPath, seg, useRun } from './parts'
import { KIND_NAME, RIVER_NTU, SETTLE, WATERS, fmtNtu, kindOf, murk, settle, sunk, type Kind, type WaterKey } from './physics'
import { M, RIVER, SITE, TOP, Place, type V3 } from './world'

const X0 = SITE.sample.x, Y = TOP + 0.5, Z = SITE.sample.z      // 折叠桌放在取样平台上，平台面高 0.5
const B1: V3 = [X0 - 0.12 * M, Y, Z + 0.06 * M], B2: V3 = [X0 + 0.14 * M, Y, Z + 0.06 * M]   // 河水烧杯、蒸馏水烧杯
const BUCKET_HOME: V3 = [X0 - 0.36 * M, Y, Z - 0.1 * M]
/** 伸到河面上的取样平台：钢格栅的台面、四根桩、靠岸的一小段和端头有栏杆，两侧敞开好取样。x1 是伸到河里的那一头 */
const PIER = { x0: RIVER.bank + 2, x1: RIVER.bank - 12, z: Z - 0.5, w: 9 }
const T_TAKE = { out: [0, 1.6], dip: [1.6, 2.6], up: [2.8, 4.2], pour: [4.4, 6.0], back: [6.2, 7.4], end: 7.6 } as const
const SETTLE_SEC = 9           // 画面上静置几秒（过程加快）
const TASKS: Task[] = [
  { id: 'take', text: '从河里取一杯河水', note: `河水黄浊，浊度约 ${fmtNtu(RIVER_NTU)} NTU` },
  { id: 'settle', text: '静置一会儿，看杯底', note: '泥沙沉到杯底，上面的水还是浑的' },
  { id: 'river', text: '判断：河水是纯净物还是混合物', note: '河水里有泥沙、溶着的物质、微生物：是混合物' },
  { id: 'distilled', text: '拿一瓶蒸馏水，再判断一次', note: '蒸馏水里只有水一种物质：是纯净物' },
]

/** 不锈钢取样桶：带提梁，原点在桶底正中；fill 盛了多少，k 浑浊程度 */
function Bucket({ fill, k }: { fill: number; k: number }) {
  const g = useMemo(() => shell(m([[0, 0], [0.06, 0], [0.068, 0.006], [0.075, 0.13], [0.078, 0.134]]), 0.0012 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} castShadow><Metal kind="stainless" grain="brushed" /></mesh>
    {fill > 0.02 && <mesh position-y={0.13 * fill / 2 * M} renderOrder={5}><cylinderGeometry args={[(0.06 + 0.015 * fill) * M, 0.06 * M, 0.13 * fill * M, 32]} /><meshStandardMaterial color="#7a5c33" transparent opacity={0.4 + 0.5 * k} roughness={0.3} depthWrite={false} /></mesh>}
    <mesh position-y={0.135 * M} rotation-x={Math.PI / 2} rotation-y={0}><torusGeometry args={[0.076 * M, 0.0025 * M, 8, 40, Math.PI]} /><Metal kind="stainless" /></mesh>
  </group>
}
function Pier() {
  const g = useMemo(() => {
    const P: Part[] = [], { x0, x1, z, w } = PIER, c = '#8a9196', y = 0.35
    P.push({ p: [(x0 + x1) / 2, y, z], s: [x0 - x1, 0.3, w], c: '#6d757a' })
    for (const x of [x1 + 0.5, (x0 + x1) / 2]) for (const s of [-1, 1]) P.push({ p: [x, (y + RIVER.y - 6) / 2, z + s * (w / 2 - 0.4)], s: [0.5, y - RIVER.y + 6, 0.5], c: '#5f666b', cyl: true })
    for (const s of [1]) { for (let x = x0 - 5; x <= x0; x += 2.4) P.push({ p: [x, y + 3.3, z + s * (w / 2 - 0.1)], s: [0.16, 6.6, 0.16], c, cyl: true }); for (const h of [3.4, 6.6]) P.push({ p: [x0 - 2.5, y + h, z + s * (w / 2 - 0.1)], s: [0.12, 5, 0.12], c, r: [0, 0, Math.PI / 2], cyl: true }) }
    for (const h of [3.4, 6.6]) P.push({ p: [x1 + 0.3, y + h, z], s: [0.12, w, 0.12], c, r: [Math.PI / 2, 0, 0], cyl: true })
    P.push({ p: [x1 + 0.3, y + 0.5, z], s: [0.1, 0.8, w], c: '#e2b21c' })
    return mergeParts(P)
  }, [])
  return <mesh geometry={g} castShadow receiveShadow><Painted rough={0.6} metal={0.3} /></mesh>
}
/** 折叠铝桌：浅灰的台面，四条铝腿 */
function FieldTable() {
  const W = 1.1 * M, D = 0.6 * M
  return <group>
    <RoundedBox args={[W, 0.03 * M, D]} radius={0.01 * M} position-y={-0.015 * M} castShadow receiveShadow><meshPhysicalMaterial color="#8f989c" roughness={0.5} clearcoat={0.2} /></RoundedBox>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.05 * M), -TOP / 2, sz * (D / 2 - 0.05 * M)]} castShadow><cylinderGeometry args={[0.012 * M, 0.012 * M, TOP, 12]} /><Metal kind="aluminum" grain="brushed" /></mesh>))}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (W / 2 - 0.05 * M), -TOP * 0.8, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.008 * M, 0.008 * M, D - 0.1 * M, 10]} /><Metal kind="aluminum" /></mesh>)}
  </group>
}
/** 一瓶蒸馏水：白色塑料的洗瓶，弯嘴 */
function WashBottle({ tilt = 0 }: { tilt?: number }) {
  const g = useMemo(() => shell(m([[0, 0], [0.034, 0], [0.038, 0.006], [0.038, 0.14], [0.02, 0.165], [0.012, 0.168], [0.012, 0.178]]), 0.0016 * M, { segs: 36 }), [])
  return <group rotation-z={tilt}>
    <mesh geometry={g} castShadow renderOrder={6}><meshPhysicalMaterial color="#f3f5f4" transparent opacity={0.6} roughness={0.35} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh position-y={0.07 * M} renderOrder={5}><cylinderGeometry args={[0.035 * M, 0.035 * M, 0.13 * M, 28]} /><meshStandardMaterial color="#d8ecf0" transparent opacity={0.3} depthWrite={false} /></mesh>
    <mesh position-y={0.183 * M}><cylinderGeometry args={[0.016 * M, 0.016 * M, 0.012 * M, 20]} /><meshStandardMaterial color="#2f6fb3" roughness={0.5} /></mesh>
    <Hose pts={[[0, 0.19 * M, 0], [0, 0.23 * M, 0], [-0.03 * M, 0.25 * M, 0], [-0.06 * M, 0.235 * M, 0]]} r={0.003 * M} color="#e8ecec" />
    <mesh position-y={0.09 * M} rotation-y={0.4}><cylinderGeometry args={[0.0385 * M, 0.0385 * M, 0.05 * M, 28, 1, true, -0.8, 1.6]} /><meshStandardMaterial color="#2f6fb3" roughness={0.6} side={THREE.DoubleSide} /></mesh>
  </group>
}

export default function Lesson1() {
  const [taken, setTaken] = useState(false)
  const [settled, setSettled] = useState(false)
  const [dist, setDist] = useState(false)            // 蒸馏水倒好了
  const [said, setSaid] = useState<Partial<Record<WaterKey, Kind>>>({})
  const [wrong, setWrong] = useState<WaterKey | null>(null)
  const T = useTasks('gewu:water:1', TASKS)
  const take = useRun(T_TAKE.end, () => { setTaken(true); T.check(id => id === 'take') })
  const rest = useRun(SETTLE_SEC, () => { setSettled(true); T.check(id => id === 'settle') })
  const pourD = useRun(3.2, () => setDist(true))
  const busy = take.busy || rest.busy || pourD.busy
  const target: WaterKey = T.done.river ? 'distilled' : 'river'
  const judge = (k: Kind) => {
    if (busy) return
    const w = target
    if (w === 'distilled' && !dist) return
    setSaid(s => ({ ...s, [w]: k }))
    if (k === kindOf(w)) { setWrong(null); T.check(id => id === w) } else setWrong(w)
  }
  const resetAll = () => { take.snap(0); rest.snap(0); pourD.snap(0); setTaken(false); setSettled(false); setDist(false); setSaid({}); setWrong(null); T.reset() }

  // 取水：桶被提到岸边，沉到河里，提上来，倒进烧杯
  const t = take.t
  const over: V3 = [X0 - 0.2 * M, Y + 0.3 * M, PIER.z - PIER.w / 2 - 1.6], down: V3 = [X0 - 0.2 * M, RIVER.y - 0.06 * M, PIER.z - PIER.w / 2 - 1.6]
  const above: V3 = [B1[0] + 0.135 * M, Y + 0.15 * M, B1[2]]
  let bAt: V3 = BUCKET_HOME, bTilt = 0
  if (take.busy || taken) {
    if (taken && !take.busy) bAt = BUCKET_HOME
    else if (t < T_TAKE.out[1]) bAt = liftPath(BUCKET_HOME, over, over[1], seg(t, ...T_TAKE.out))
    else if (t < T_TAKE.dip[1]) bAt = liftPath(over, down, over[1], seg(t, ...T_TAKE.dip))
    else if (t < T_TAKE.up[1]) bAt = liftPath(down, above, Y + 0.3 * M, seg(t, ...T_TAKE.up))
    else if (t < T_TAKE.back[0]) { bAt = above; bTilt = ease(seg(t, T_TAKE.pour[0], T_TAKE.pour[0] + 0.6)) * (1 - ease(seg(t, T_TAKE.pour[1] - 0.4, T_TAKE.pour[1]))) * 1.3 }
    else bAt = liftPath(above, BUCKET_HOME, Y + 0.3 * M, seg(t, ...T_TAKE.back))
  }
  const bFill = take.busy ? (t < T_TAKE.dip[0] + 0.5 ? 0 : t < T_TAKE.pour[0] + 0.3 ? 0.7 : lerp(0.7, 0.05, seg(t, T_TAKE.pour[0] + 0.3, T_TAKE.pour[1]))) : 0
  const b1Fill = taken ? 0.7 : take.busy ? 0.7 * seg(t, T_TAKE.pour[0] + 0.4, T_TAKE.pour[1]) : 0
  const pouringB = take.busy && t > T_TAKE.pour[0] + 0.4 && t < T_TAKE.pour[1] - 0.2
  // 静置：上层的水慢慢变清一点，杯底的泥慢慢变厚
  const st = settled ? SETTLE_SEC * 4 : rest.busy ? rest.t * 4 : 0
  const ntu = settle(false, st), mud = 0.012 * sunk(false, st)
  const k1 = murk(ntu)
  const dk = dist ? 0.6 : pourD.busy ? 0.6 * seg(pourD.t, 0.8, 2.6) : 0
  const wbTilt = pourD.busy ? ease(seg(pourD.t, 0.3, 0.8)) * (1 - ease(seg(pourD.t, 2.6, 3.1))) * 1.1 : 0

  const task = T.current
  const { hint, next }: { hint: string; next: 'take' | 'rest' | 'dist' | 'judge' | null } = !task ? { hint: '河水里混着、溶着很多东西，是混合物；蒸馏水只有水一种物质，是纯净物。', next: null }
    : take.busy ? { hint: t < T_TAKE.up[0] ? '把取样桶沉到河里，打一桶水…' : '把河水倒进烧杯…', next: null }
    : rest.busy ? { hint: '静置，看杯底…', next: null }
    : pourD.busy ? { hint: '把蒸馏水倒进右边的烧杯…', next: null }
    : !taken ? { hint: '从河里取一杯河水', next: 'take' }
    : !settled ? { hint: '河水是浑的。让它静置一会儿', next: 'rest' }
    : task.id === 'distilled' && !dist ? { hint: '再拿一瓶蒸馏水，倒进右边的烧杯', next: 'dist' }
    : wrong === target ? { hint: target === 'river' ? '不对：河水里不止有水，还有泥沙、溶着的物质和微生物。再选一次' : '不对：蒸馏水里只有水这一种物质。再选一次', next: 'judge' }
    : { hint: target === 'river' ? '判断：这杯河水是纯净物还是混合物？' : '判断：这杯蒸馏水是纯净物还是混合物？', next: 'judge' }

  const labels: Label[] = [
    ...(taken ? [{ id: 'v', at: [B1[0], Y + 0.17 * M, B1[2]] as V3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>浊度</small>约 {fmtNtu(ntu)} NTU</> }] : []),
    ...(settled ? [
      { id: 'h1', at: [B1[0] - 0.07 * M, Y + 0.01 * M, B1[2]] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '泥沙等不溶性杂质：沉到杯底' },
      { id: 'h2', at: [B1[0] - 0.07 * M, Y + 0.06 * M, B1[2]] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '还溶着可溶性杂质、混着细菌等微生物（看不见）' },
    ] : []),
    { id: 'n1', at: [BUCKET_HOME[0], Y + 0.16 * M, BUCKET_HOME[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '取样桶' },
    { id: 'n2', at: [B2[0] + 0.14 * M, Y + 0.22 * M, B2[2] - 0.05 * M], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蒸馏水' },
  ]
  return (
    <LabShell title="水的净化和组成" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="取样"
      stage={<Place at="l1" labels={labels}>
        <Pier />
        <group position={[X0, Y, Z]}><FieldTable /></group>
        <group position={B1}><Beaker vol={1000} fill={b1Fill} k={taken || take.busy ? k1 : 0} mud={mud} /></group>
        <group position={B2}><Beaker vol={1000} fill={dk} k={0} /></group>
        <group position={[X0 - 0.38 * M, Y, Z + 0.12 * M]} rotation-y={0.9}><Turbidimeter text={taken ? fmtNtu(ntu) : '----'} vial={taken} k={k1} /></group>
        {/* 洗瓶：倒蒸馏水时被拿起来 */}
        <group position={pourD.busy ? [B2[0] + 0.1 * M, Y + 0.12 * M, B2[2]] : [B2[0] + 0.14 * M, Y, B2[2] - 0.08 * M]}><WashBottle tilt={wbTilt} />
          {pourD.busy && <group position={[0.005 * M, 0.08 * M, 0.04 * M]} rotation={[0.3, 0, -0.2]}><Glove /></group>}
        </group>
        {/* 取样桶和一只提着它的手 */}
        <group position={bAt}>
          <group position={[-0.078 * M, 0.134 * M, 0]} rotation-z={bTilt}><group position={[0.078 * M, -0.134 * M, 0]}><Bucket fill={bFill} k={0.9} /></group></group>
          {take.busy && <><Hose pts={[[0, 0.135 * M, 0], [0, 0.2 * M, 0], [0, Math.max(0.24 * M, Y + 0.3 * M - bAt[1]), 0]]} r={0.0025 * M} color="#d9c9a0" />
            <group position={[0, Math.max(0.24 * M, Y + 0.3 * M - bAt[1]) + 0.01 * M, 0]} rotation={[0.2, 0, 0]}><Glove /></group></>}
        </group>
        {pouringB && <mesh position={[B1[0] + 0.045 * M, Y + 0.2 * M, B1[2]]} renderOrder={8}><cylinderGeometry args={[0.006 * M, 0.009 * M, 0.16 * M, 10]} /><meshStandardMaterial color="#7a5c33" transparent opacity={0.85} depthWrite={false} /></mesh>}
      </Place>}
      lesson={<LessonBlock no="1" title="天然水里有什么" concept="河水里混着、溶着很多东西，是混合物" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>河水、湖水、井水这些天然水里，含有泥沙等<b className="text-white">不溶性杂质</b>，溶有一些<b className="text-white">可溶性杂质</b>，还有细菌等<b className="text-white">微生物</b>。</p>
          <p className="mt-3">由一种物质组成的叫纯净物，由两种或两种以上物质混合而成的叫混合物。天然水是混合物；蒸馏水只含水一种物质，是纯净物。</p>
          <p className="mt-3 text-[13.5px] text-white/65">静置只能让较重的泥沙沉下去，更细的颗粒还悬浮在水里，所以水还是浑的。接下来几课在化验室里一步步把它变清。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两杯水都判断过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">天然水是混合物，蒸馏水是纯净物</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">河水里有泥沙、可溶性杂质和微生物；静置以后浊度从约 {fmtNtu(RIVER_NTU)} NTU 只降到约 {fmtNtu(SETTLE.plain.floor)} NTU。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">河水的浊度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{taken ? fmtNtu(ntu) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">NTU</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="刚取来" value={`约 ${fmtNtu(RIVER_NTU)}`} unit="NTU · 河水" />
            <ParamTile symbol="静置后" value={settled ? `约 ${fmtNtu(SETTLE.plain.floor)}` : '—'} unit="NTU · 上层的水" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">判断</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium">样品</th><th className="pb-1 font-medium">里面有</th><th className="pb-1 font-medium">是</th></tr></thead>
            <tbody>{(['river', 'distilled'] as WaterKey[]).map(w => { const ok = said[w] === kindOf(w); return <tr key={w} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{WATERS[w].name}</td><td className="px-1 text-[12.5px] text-white/75">{ok ? WATERS[w].has.join('、') : '—'}</td><td className={`rounded-r-lg font-semibold ${ok ? 'text-[#7fe3d4]' : ''}`}>{ok ? KIND_NAME[kindOf(w)] : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'take'} pulse={next === 'take'} onClick={() => take.run()} disabled={busy || taken}>取一杯河水</LabButton>
        <LabButton primary={next === 'rest'} pulse={next === 'rest'} onClick={() => rest.run()} disabled={busy || !taken || settled}>静置</LabButton>
        <LabButton primary={next === 'dist'} pulse={next === 'dist'} onClick={() => pourD.run()} disabled={busy || dist || !T.done.river}>拿一瓶蒸馏水</LabButton>
      </>}
      extras={
        <Control label={target === 'river' ? '河水是' : '蒸馏水是'}>
          <Segmented label="是纯净物还是混合物" pulse={next === 'judge'} want={next === 'judge' ? kindOf(target) : null} disabled={busy || !settled || (target === 'distilled' && !dist)} value={(said[target] ?? 'none') as Kind} onChange={k => judge(k as Kind)} options={(['pure', 'mix'] as Kind[]).map(k => ({ value: k, label: KIND_NAME[k] }))} />
        </Control>
      }
    />
  )
}
