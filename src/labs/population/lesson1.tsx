// 种群和生态系统 · 第 1 课 样方法：岛南草地上一块 10 m × 10 m 的调查地块，调查蒲公英的种群密度。
// 五点取样放下五个 1 m² 的样方，逐个数（镜头飞到那个样方上，数到的蒲公英脚下亮起圈），求平均；再换成“压线的全数”比一比。
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Batch, fuse, leafGeo, place, rng, tint, tube, type V3 } from './parts'
import { PLOT_AREA, QUADRATS, RULE_NAME, countQuadrat, meanDensity, plotTotal, type Rule } from './physics'
import { Big, Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { PLOT, Room, ground } from './world'

const TASKS: Task[] = [
  { id: 'place', text: '用五点取样法布设五个 1 m² 的样方', note: '四角附近各一个、中心一个：取样要随机，不能专挑多的地方' },
  { id: 'count', text: '按“计上不计下，计左不计右”数完五个样方', note: `五个样方数出 ${QUADRATS.map(q => countQuadrat(q)).join('、')} 株` },
  { id: 'mean', text: '求平均值，得到种群密度', note: `种群密度约 ${meanDensity('half').toFixed(1)} 株/m²` },
  { id: 'all', text: '换成“压线的全数”，再求一次平均值', note: `算成 ${meanDensity('all').toFixed(1)} 株/m²：压线的个体被相邻样方重复计数，结果偏大` },
]
/** 五点取样：样方中心相对地块中心的位置（m） */
const AT: [number, number][] = [[-3.2, -3.2], [3.2, -3.2], [0, 0], [-3.2, 3.2], [3.2, 3.2]]
/** 样方框在画面里的边长（m）：实际代表 1 m × 1 m，为了看得清放大了，框里的蒲公英也跟着摊开 */
const QS = 1.5
type Edge = 'in' | 'top' | 'left' | 'bottom' | 'right'
interface Dandelion { x: number; z: number; edge: Edge; q: number }
/** 每个样方里的蒲公英：框内的随机散开，压线的正好长在那条边上。“上”是离镜头远的那条边，“左”是画面左边那条 */
const IN_Q: Dandelion[][] = QUADRATS.map((q, k) => {
  const r = rng(k * 31 + 5), [cx, cz] = AT[k], out: Dandelion[] = [], far = (x: number, z: number) => out.every(d => Math.hypot(d.x - x, d.z - z) > 0.3)
  const put = (edge: Edge, n: number) => { for (let i = 0; i < n; i++) for (let t = 0; t < 200; t++) { const u = (r() - 0.5) * 0.7 * QS, v = (r() - 0.5) * 0.7 * QS, x = cx + (edge === 'left' ? -0.5 * QS : edge === 'right' ? 0.5 * QS : u), z = cz + (edge === 'top' ? -0.5 * QS : edge === 'bottom' ? 0.5 * QS : edge === 'in' ? v : u); if (far(x, z)) { out.push({ x, z, edge, q: k }); break } } }
  put('top', q.top); put('left', q.left); put('bottom', q.bottom); put('right', q.right); put('in', q.inside)
  return out
})
const counted = (d: Dandelion, rule: Rule) => d.edge === 'in' || d.edge === 'top' || d.edge === 'left' || rule === 'all'
const wy = (x: number, z: number) => ground(PLOT.x + x, PLOT.z + z)

/** 一片蒲公英的叶：倒披针形，两边一对对向后弯的锯齿，顶上一个大裂片。基部在原点，朝 +z 伸出 */
function toothLeaf(len: number, wid: number, r: () => number) {
  const N = 13, pos: number[] = [], col: number[] = [], idx: number[] = [], c0 = new THREE.Color('#35601f'), c1 = new THREE.Color('#5d9332'), rib = new THREE.Color('#9dbb62'), c = new THREE.Color()
  for (let i = 0; i <= N; i++) {
    const u = i / N, env = (wid / 2) * (0.22 + 0.78 * Math.min(1, u / 0.78)) * (u > 0.8 ? Math.sqrt(Math.max(0, 1 - ((u - 0.8) / 0.2) ** 2)) : 1)
    const tooth = i % 2 === 1 || u > 0.8, w = env * (tooth ? 1 : 0.28) * (0.9 + r() * 0.2), back = tooth && u <= 0.8 ? -0.5 * len / N : 0
    const y = 0.035 * len * Math.sin(Math.PI * u) - 0.25 * len * u * u * 0.3
    c.copy(c0).lerp(c1, u)
    pos.push(-w, y + 0.008, u * len + back, 0, y, u * len, w, y + 0.008, u * len + back)
    col.push(c.r, c.g, c.b, rib.r * 0.8, rib.g * 0.8, rib.b * 0.8, c.r, c.g, c.b)
  }
  for (let i = 0; i < N; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
/** 一株蒲公英：贴地的一圈锯齿叶，细茎顶着黄色的头状花序；puff 为 true 时另有一根茎顶着白绒球 */
function dandelionGeo(seed: number, puff: boolean) {
  const r = rng(seed), list: THREE.BufferGeometry[] = [], n = 9 + Math.floor(r() * 4)
  for (let i = 0; i < n; i++) list.push(place(toothLeaf(0.13 + r() * 0.07, 0.05 + r() * 0.015, r), [0, 0.012, 0], (i / n) * 6.28 + r() * 0.4, -0.12 - r() * 0.35))
  const B = new Batch(), petal = new THREE.PlaneGeometry(0.009, 0.034).toNonIndexed(); petal.translate(0, 0.017, 0); petal.computeVertexNormals()
  const y0 = new THREE.Color('#f5c518'), y1 = new THREE.Color('#ffe14d'), white = new THREE.Color('#f6f6f0'), c = new THREE.Color()
  const stems = puff ? 2 : r() < 0.4 ? 2 : 1
  for (let s = 0; s < stems; s++) {
    const a = r() * 6.28, lean = 0.02 + r() * 0.035, h = 0.15 + r() * 0.08 + (puff && s === 1 ? 0.05 : 0), top: V3 = [Math.cos(a) * lean, h, Math.sin(a) * lean]
    list.push(tube([[0, 0, 0], [top[0] * 0.4, h * 0.55, top[2] * 0.4], top], 0.0048, 0.0036, '#7d9a4a', '#a9b56a', 5, 6))
    if (puff && s === 1) {
      // 白绒球：一根根冠毛从中心向四面伸出去
      list.push(place(tint(new THREE.SphereGeometry(0.008, 8, 6), '#b9b08a'), top))
      for (let k = 0; k < 90; k++) B.add(petal, top, r() * 6.28, Math.acos(2 * r() - 1), [0.45, 1.05, 1], 0, white)
    } else {
      list.push(place(tint(new THREE.SphereGeometry(0.018, 10, 6), '#d99a10', '#f2c21a'), top, 0, 0, [1, 0.55, 1]))
      for (let ring = 0; ring < 3; ring++) for (let k = 0; k < 18; k++) B.add(petal, top, (k / 18) * 6.28 + ring * 0.2 + r() * 0.2, 1.15 - ring * 0.42 + r() * 0.15, 1 - ring * 0.22, 0, c.copy(y0).lerp(y1, r()))
    }
  }
  list.push(B.build())
  return fuse(list)
}
/** 地块里所有的蒲公英：样方里的照表放，样方外面随机长（大约每平方米 8 株） */
function Dandelions() {
  const geos = useMemo(() => [dandelionGeo(1, false), dandelionGeo(2, false), dandelionGeo(3, true)], [])
  const lists = useMemo(() => {
    const r = rng(404), out: THREE.Matrix4[][] = [[], [], []], m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
    const add = (x: number, z: number) => { const s = 1.15 + r() * 0.5; m.compose(new THREE.Vector3(PLOT.x + x, wy(x, z) + 0.005, PLOT.z + z), q.setFromAxisAngle(up, r() * 6.28), new THREE.Vector3(s, s, s)); out[Math.floor(r() * 3)].push(m.clone()) }
    IN_Q.flat().forEach(d => add(d.x, d.z))
    const total = Math.round(meanDensity('half') * (PLOT_AREA + 44)), pts: [number, number][] = []
    for (let i = 0, t = 0; i < total - 40 && t < 20000; t++) {
      const x = (r() - 0.5) * 12, z = (r() - 0.5) * 12
      if (AT.some(([a, b]) => Math.abs(x - a) < QS / 2 + 0.3 && Math.abs(z - b) < QS / 2 + 0.3) || pts.some(p => Math.hypot(p[0] - x, p[1] - z) < 0.16)) continue
      pts.push([x, z]); add(x, z); i++
    }
    return out
  }, [])
  const refs = useRef<(THREE.InstancedMesh | null)[]>([])
  useEffect(() => { lists.forEach((l, k) => { const im = refs.current[k]; if (!im) return; l.forEach((mm, i) => im.setMatrixAt(i, mm)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere() }) }, [lists])
  return <>{lists.map((l, k) => <instancedMesh key={k} ref={e => { refs.current[k] = e }} args={[geos[k], undefined, l.length]} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.6} side={THREE.DoubleSide} envMapIntensity={0.6} /></instancedMesh>)}</>
}
/** 样方框：白色塑料管围成 1 m × 1 m（内边），四角是弯头 */
/** 没用的时候，五个样方框整齐地靠在地块边的木架上 */
const RACK: [number, number] = [-1.2, PLOT.half + 1.5], LEAN = 1.28
function frameGeo() {
  const T = 0.05, h = QS / 2 + T / 2, list: THREE.BufferGeometry[] = []
  for (const [a, b, rot] of [[0, -h, 0], [0, h, 0], [-h, 0, 1], [h, 0, 1]] as [number, number, number][]) { const c = new THREE.BoxGeometry(rot ? T : QS + T * 2, T, rot ? QS : T); c.translate(a, 0, b); list.push(c) }
  return fuse(list)
}
function Frame({ k, down }: { k: number; down: boolean }) {
  const [x, z] = AT[k], p = useSlide(down ? 1 : 0, 0.5 + k * 0.05), g = useMemo(frameGeo, [])
  const tilt = useMemo(() => { const e = 0.5, sx = (wy(x + e, z) - wy(x - e, z)) / (2 * e), sz = (wy(x, z + e) - wy(x, z - e)) / (2 * e); return [Math.atan(sz), 0, -Math.atan(sx)] as V3 }, [x, z])
  const e = p * p * (3 - 2 * p), rz = RACK[1] + 0.3 + k * 0.085, px = RACK[0] + (x - RACK[0]) * e, pz = rz + (z - rz) * e
  const y0 = wy(RACK[0], rz) + (QS / 2 + 0.05) * Math.sin(LEAN), y1 = wy(x, z) + 0.05
  return <mesh geometry={g} position={[PLOT.x + px, y0 + (y1 - y0) * e + Math.sin(e * Math.PI) * 1.2, PLOT.z + pz]} rotation={[LEAN * (1 - e) + tilt[0] * e, 0, tilt[2] * e]} castShadow receiveShadow><meshStandardMaterial color="#f1efe8" roughness={0.62} /></mesh>
}
/** 靠样方框的木架：两根立柱、一道横档 */
function Rack() {
  const y = wy(...RACK)
  return (
    <group position={[PLOT.x + RACK[0], y, PLOT.z + RACK[1]]}>
      {[-0.95, 0.95].map(x => <mesh key={x} position={[x, 0.7, 0]} castShadow><boxGeometry args={[0.07, 1.5, 0.07]} /><meshStandardMaterial color="#7a5c3c" roughness={0.9} /></mesh>)}
      {[-0.95, 0.95].map(x => <mesh key={`f${x}`} position={[x, 0.04, 0.35]} castShadow><boxGeometry args={[0.07, 0.07, 1.0]} /><meshStandardMaterial color="#7a5c3c" roughness={0.9} /></mesh>)}
      <mesh position={[0, 1.36, 0]} castShadow><boxGeometry args={[2.1, 0.07, 0.06]} /><meshStandardMaterial color="#8a6a46" roughness={0.9} /></mesh>
    </group>
  )
}
/** 数到的蒲公英脚下的圈：数进去的是青色，压在下边、右边线上不数的是灰色 */
function Rings({ shown, rule }: { shown: number[]; rule: Rule }) {
  return <>{IN_Q.flatMap((list, k) => list.slice(0, shown[k]).map((d, i) => {
    const ok = counted(d, rule)
    return <mesh key={`${k}-${i}`} position={[PLOT.x + d.x, wy(d.x, d.z) + 0.03, PLOT.z + d.z]} rotation-x={-Math.PI / 2} renderOrder={8}><ringGeometry args={[0.085, 0.112, 28]} /><meshBasicMaterial color={ok ? '#3fe6cf' : '#c9ced2'} transparent opacity={ok ? 0.95 : 0.7} depthTest={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
  }))}</>
}
/** 插在地块边上的一块标牌 */
function Sign() {
  const [x, z] = [-PLOT.half - 0.7, PLOT.half - 1.5]
  return (
    <group position={[PLOT.x + x, wy(x, z), PLOT.z + z]} rotation-y={-0.5}>
      <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.9, 10]} /><Metal kind="zinc" grain="brushed" rough={0.5} /></mesh>
      <mesh position={[0, 0.82, 0.025]} castShadow><boxGeometry args={[0.5, 0.3, 0.02]} /><meshStandardMaterial color="#1f6d4a" roughness={0.5} /></mesh>
    </group>
  )
}

export default function Lesson1() {
  const [placed, setPlaced] = useState(false)
  const [shown, setShown] = useState<number[]>([0, 0, 0, 0, 0])      // 每个样方已经数了几株（含不计的）
  const [cur, setCur] = useState<number | null>(null)                // 镜头正对着哪个样方
  const [busy, setBusy] = useState(false)
  const [rule, setRule] = useState<Rule>('half')
  const [avg, setAvg] = useState<Record<Rule, boolean>>({ half: false, all: false })
  const T = useTasks('gewu:population:1', TASKS)
  const doneQ = shown.map((s, k) => s >= IN_Q[k].length), nDone = doneQ.filter(Boolean).length
  const counts = QUADRATS.map(q => countQuadrat(q, rule))
  // 数一个样方：一株一株地圈出来
  useEffect(() => {
    if (!busy || cur === null) return
    const t = setInterval(() => setShown(s => { if (s[cur] >= IN_Q[cur].length) return s; const n = [...s]; n[cur]++; return n }), 260)
    return () => clearInterval(t)
  }, [busy, cur])
  useEffect(() => { if (busy && cur !== null && shown[cur] >= IN_Q[cur].length) { setBusy(false); if (shown.every((s, k) => s >= IN_Q[k].length)) T.check(id => id === 'count') } }, [busy, cur, shown])   // eslint-disable-line react-hooks/exhaustive-deps
  const place = () => { if (placed) return; setPlaced(true); setTimeout(() => T.check(id => id === 'place'), 2400) }
  const next = () => { if (!placed || busy || nDone >= 5) return; setCur(nDone); setTimeout(() => setBusy(true), 1500) }
  const mean = () => { if (nDone < 5 || busy || avg[rule]) return; setCur(null); setAvg(a => ({ ...a, [rule]: true })); T.check(id => id === (rule === 'half' ? 'mean' : 'all')) }
  const resetAll = () => { setPlaced(false); setShown([0, 0, 0, 0, 0]); setCur(null); setBusy(false); setRule('half'); setAvg({ half: false, all: false }); T.reset() }
  const pending = cur !== null && !busy && !doneQ[cur]

  const task = T.current
  const { hint, nx }: { hint: string; nx: 'place' | 'next' | 'mean' | 'rule' | null } = (() => {
    if (!task) return { hint: '两种数法都算过了：压线的只数相邻两边上的，结果才准。', nx: null }
    if (!placed) return { hint: '草地上围出了一块 10 m × 10 m 的地块。按“布设样方”，用五点取样法放下五个样方', nx: 'place' }
    if (task.id === 'place') return { hint: '样方正在落到草地上…', nx: null }
    if (busy || pending) return { hint: `正在数第 ${cur! + 1} 个样方…`, nx: null }
    if (nDone === 0) return { hint: '按“数下一个样方”，从第 1 个样方数起', nx: 'next' }
    if (nDone < 5) return { hint: `第 ${nDone} 个样方数出 ${counts[nDone - 1]} 株。按“数下一个样方”接着数`, nx: 'next' }
    if (task.id === 'mean') return { hint: '五个样方都数完了。按“求平均值”', nx: 'mean' }
    if (rule !== 'all') return { hint: '把计数规则换成“压线的全数”，看结果差多少', nx: 'rule' }
    return { hint: '压线的都算进来，每个样方都多了几株。再按“求平均值”', nx: 'mean' }
  })()

  const labels: Label[] = [
    ...AT.map(([x, z], k): Label => ({ id: `q${k}`, at: [PLOT.x + x, wy(x, z) + 0.6, PLOT.z + z - QS / 2], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: placed && (cur === null || cur === k) ? 1 : 0 }, children: <><small>样方 {k + 1}</small>{doneQ[k] ? `${counts[k]} 株` : cur === k ? `${IN_Q[k].slice(0, shown[k]).filter(d => counted(d, rule)).length} 株` : '—'}</> })),
    { id: 'avg', at: [PLOT.x, wy(0, 0) + 1.5, PLOT.z], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: avg[rule] && cur === null ? 1 : 0 }, children: <><small>种群密度</small>{meanDensity(rule).toFixed(1)} 株/m²</> },
    { id: 'nPlot', at: [PLOT.x + PLOT.half, wy(PLOT.half, -PLOT.half) + 1.1, PLOT.z - PLOT.half], name: true, className: 'scene-name -translate-y-full', children: '调查地块 10 m × 10 m' },
    { id: 'nFr', at: [PLOT.x + RACK[0], wy(...RACK) + 1.75, PLOT.z + RACK[1]], name: true, ax: 0.5, className: 'scene-name -translate-y-full', children: '样方框（代表 1 m × 1 m，示意大小）' },
  ]
  const Q = cur !== null ? AT[cur] : null
  return (
    <LabShell title="种群和生态系统" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="调查蒲公英的种群密度"
      stage={<Room at="s1" labels={labels} shift={Q ? [Q[0] + 0.4, -0.3, Q[1] + 0.1] : undefined} span={Q ? [3.5, 2.1] : undefined} view={Q ? [-0.15, 0.66] : undefined}>
        <Dandelions />
        {AT.map((_, k) => <Frame key={k} k={k} down={placed} />)}
        <Rings shown={shown} rule={rule} />
        <Sign />
        <Rack />
      </Room>}
      lesson={<LessonBlock no="1" title="样方法" concept="随机取样，数样方，求平均" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>种群在单位面积或单位体积中的个体数就是<b className="text-white">种群密度</b>，它是种群最基本的数量特征。调查植物和活动范围小的动物，常用<b className="text-white">样方法</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>在调查地块里<b className="text-white">随机</b>选取若干个样方（常用五点取样法、等距取样法），数出每个样方里的个体数，求出每个样方的种群密度。</li>
            <li>以所有样方种群密度的<b className="text-white">平均值</b>作为这个种群的种群密度估算值。</li>
            <li>压在边线上的个体：只数相邻两条边和它们夹角上的，习惯上“计上不计下，计左不计右”。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="两种数法都算过了" title={`蒲公英的种群密度约 ${meanDensity('half').toFixed(1)} 株/m²`} text={`五个样方数出 ${QUADRATS.map(q => countQuadrat(q)).join('、')} 株，平均 ${meanDensity('half').toFixed(1)} 株/m²，整个地块约 ${plotTotal('half').toFixed(0)} 株。压线的全都数会算成 ${meanDensity('all').toFixed(1)} 株/m²，偏大：压线的个体只数相邻两边上的。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="种群密度 = 各样方密度的平均值" value={avg[rule] ? meanDensity(rule).toFixed(1) : '—'} unit="株/m²" />
          <H>五个样方（每个 1 m²）· {RULE_NAME[rule]}</H>
          <div className="grid grid-cols-5 gap-1.5">
            {counts.map((c, k) => <div key={k} className={`rounded-xl px-1 py-2 text-center ${cur === k ? 'bg-[#35c7b3]/20' : 'bg-white/6'}`}><div className="text-[11.5px] text-white/50">样方 {k + 1}</div><div className="mt-0.5 text-[19px] font-bold tabular-nums">{doneQ[k] ? c : '—'}</div></div>)}
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            <Row name="按“计上不计下”" value={avg.half ? `${meanDensity('half').toFixed(1)} 株/m²` : '—'} dim={!avg.half} on={rule === 'half' && avg.half} />
            <Row name="压线的全数" value={avg.all ? `${meanDensity('all').toFixed(1)} 株/m²` : '—'} dim={!avg.all} on={rule === 'all' && avg.all} />
          </div>
          <H>关键参数</H>
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="样方" value="1" unit="m² · 5 个" />
            <ParamTile symbol="地块" value={avg[rule] ? plotTotal(rule).toFixed(0) : '—'} unit={`株 · ${PLOT_AREA} m²`} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={nx === 'place'} onClick={place} disabled={placed}>布设样方</LabButton>
        <LabButton pulse={nx === 'next'} onClick={next} disabled={!placed || busy || pending || nDone >= 5 || task?.id === 'place'}>数下一个样方</LabButton>
        <LabButton primary pulse={nx === 'mean'} onClick={mean} disabled={nDone < 5 || busy || avg[rule]}>求平均值</LabButton>
      </>}
      extras={<Control label="计数规则"><Segmented label="计数规则" pulse={nx === 'rule'} want={nx === 'rule' ? 'all' : null} value={rule} disabled={busy || nDone < 5} onChange={v => setRule(v)} options={(['half', 'all'] as Rule[]).map(r => ({ value: r, label: RULE_NAME[r] }))} /></Control>}
    />
  )
}
