// 图形的变换 · 第 7 课 印一块花布：印花长桌上铺着一块白布，旁边一块刻着一片花瓣的木模和一盘蓝靛。
// 布上已经印了一片花瓣。木模绕团花中心每次转 90° 再印，印出一朵四瓣团花（旋转）；把整朵团花向右平移 28 cm 再印一朵（平移）；最后印满两行三列。
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, PLine, Place, Plane, ease, seg, shapeOf, spot, toWorld, useRun } from './parts'
import { GRID7, PETAL, STEP7, print7, rotate, type P } from './physics'
import { makeCotton, woodLight } from './mats'
import { indigoPetal } from './crafts'
import { ST } from './world'

const TASKS: Task[] = [
  { id: 'rot', text: '旋转：木模绕中心转 90° 再印，印成一朵团花', note: '一片花瓣转三次、印三次，四片围成一朵团花' },
  { id: 'move', text: '平移：把团花向右平移 28 cm，再印一朵', note: '平移后的团花和原来的一模一样' },
  { id: 'fill', text: '印满整块布：两行三列', note: '先旋转得到团花，再平移铺满整块布' },
]
const K = 0.01, O: [number, number, number] = [ST.l7.x, ST.l7.y, ST.l7.z]
const W = toWorld(O, K)
const INK = '#21386f'
/** 花瓣绕团花中心转 a 度后放到中心 c 上 */
const petalAt = (c: P, a: number) => PETAL.map(p => { const q = rotate(p, [0, 0], a); return [q[0] + c[0], q[1] + c[1]] as P })
const PC: P = [6.75, 1.35]   // 花瓣的大致中心：木模就压在这里

export default function Lesson7() {
  const [stage, setStage] = useState(0)          // 0 只有第一片；1–3 转了几次；4 平移印了第二朵；5 印满
  const Tk = useTasks('gewu:transform:7', TASKS)
  const run = useRun(2.6, () => { const s = stage + 1; setStage(s); Tk.check(id => (id === 'rot' && s >= 3) || (id === 'move' && s >= 4) || (id === 'fill' && s >= 5)) })
  const fill = useRun(4.2, () => { setStage(5); Tk.check(id => id === 'fill') })
  const busy = run.busy || fill.busy
  const resetAll = () => { setStage(0); run.snap(0); fill.snap(0); Tk.reset() }
  const step = () => { if (stage === 4) fill.run(); else run.run() }

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'rot' | 'move' | 'fill' | null } = (() => {
    if (!task) return { hint: '一片花瓣，转着印成团花，再平移铺满：图案就是这样设计出来的。', next: null }
    if (busy) return { hint: stage < 3 ? '转过去，按下去…' : stage === 3 ? '平移过去，再印…' : '一朵一朵印下去…', next: null }
    if (stage < 3) return { hint: stage === 0 ? '布上印了一片花瓣。把木模绕团花中心转 90°，再印一片' : `再转 90° 印一片（已经 ${stage + 1} 片）`, next: 'rot' }
    if (stage === 3) return { hint: '团花印好了。把整朵团花向右平移 28 cm，再印一朵', next: 'move' }
    return { hint: '按同样的办法平移，印满两行三列', next: 'fill' }
  })()

  // 机位：先推近到第一朵团花和木模，平移时拉开到两朵，印满时看整块布
  const view = useMemo(() => {
    const f = (u: number, v: number, w: number, h: number) => spot(ST.l7.x + u * K, ST.l7.y, ST.l7.z - v * K, w, h, 0.22, 0.95)
    if (stage < 3 || (stage === 3 && !run.busy)) return f(GRID7[0][0] + 6, GRID7[0][1] + 2, 0.46, 0.36)
    if (stage === 3 || (stage === 4 && !fill.busy)) return f(GRID7[0][0] + 16, GRID7[0][1] + 1, 0.72, 0.5)
    return f(2, 2, 1.12, 0.8)
  }, [stage, run.busy, fill.busy])
  const done = stage >= 5 ? print7().petals : stage >= 4 ? 8 : stage + 1
  const labels: Label[] = [
    { id: 'p0', at: W(GRID7[0][0] + 12, GRID7[0][1] - 1, 0.01), ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { background: COL.src, color: '#fff', boxShadow: 'none', opacity: stage < 4 && !busy ? 1 : 0 }, children: '第一片' },
    { id: 'c0', at: W(GRID7[0][0] - 0.8, GRID7[0][1] + 0.8, 0.01), ax: 1, className: 'scene-tag -translate-y-full transition-opacity', style: { background: '#1d2327', color: '#fff', boxShadow: 'none', opacity: stage < 4 ? 1 : 0, fontSize: 13, padding: '1px 6px' }, children: '中心' },
    { id: 'r', at: W(GRID7[0][0] - 11, GRID7[0][1] + 10, 0.01), ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: run.busy && stage < 3 ? 1 : 0 }, children: '转 90°' },
    { id: 'm', at: W(GRID7[0][0] + 14, GRID7[0][1] + 13, 0.01), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: (run.busy && stage === 3) || (stage === 4 && !fill.busy) ? 1 : 0 }, children: `平移 ${STEP7} cm` },
    { id: 'n1', at: W(-48, -32, 0), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '白布 100 cm × 60 cm' },
    { id: 'n2', at: W(14, 41, 0.06), ax: 0, name: true, className: 'scene-name -translate-y-full', children: '花瓣木模' },
  ]
  return (
    <LabShell title="图形的变换" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="印花"
      stage={<Place at="l7" view={view} labels={labels}><ClothScene stage={stage} k={run.busy ? run.k : 0} fk={fill.busy ? fill.k : 0} /></Place>}
      lesson={<LessonBlock no="7" title="印一块花布" concept="一片花瓣，转着印、移着印" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>许多图案都是由一个基本图形经过<b className="text-white">平移、轴对称、旋转</b>组合得到的。</p>
          <p className="mt-3">这块布上：一片花瓣绕中心每次旋转 90°，转三次得到一朵四瓣团花，团花绕中心转 90° 就和自己重合；再把整朵团花一次次平移 28 cm，铺满整块布。</p>
          <p className="mt-3">设计图案时，先想好基本图形，再想用哪种变换、变换几次。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">先旋转出团花，再平移铺满：一片花瓣印出了一整块布</p>
        <p className="mt-1 text-[14px] text-white/70">花瓣绕中心转 90°、180°、270° 得到四瓣团花；团花平移 28 cm 一朵，两行三列共 24 片花瓣。每一片都和第一片全等。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">布上的花瓣</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{done}<span className="ml-1 text-[16px] font-medium text-white/55">片</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="旋转" value={`${Math.min(stage, 3)} 次`} unit="每次绕中心 90°" />
            <ParamTile symbol="平移" value={stage >= 5 ? '5 次' : stage >= 4 ? '1 次' : '0 次'} unit={`每次 ${STEP7} cm`} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">用到的变换</h2>
          <ul className="mt-1.5 flex flex-col gap-1 text-[14px]">
            <li className={stage >= 3 ? 'text-white' : 'text-white/35'}>旋转：花瓣 → 团花</li>
            <li className={stage >= 4 ? 'text-white' : 'text-white/35'}>平移：团花 → 一行</li>
            <li className={stage >= 5 ? 'text-white' : 'text-white/35'}>平移：一行 → 两行三列</li>
          </ul>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'rot'} onClick={step} disabled={busy || stage >= 3}>旋转 90° 再印</LabButton>
        <LabButton pulse={next === 'move'} onClick={step} disabled={busy || stage !== 3}>平移再印一朵</LabButton>
        <LabButton primary pulse={next === 'fill'} onClick={step} disabled={busy || stage !== 4}>印满整块布</LabButton>
      </>}
      extras={null}
    />
  )
}

/** 印上去的一片花瓣：蓝印花布那样靛蓝底、白色花纹的一片，贴在布面上 */
const PBOX: [number, number, number, number] = [1.4, -1.3, 11.6, 4.3]
function Print({ c, a, op = 1, edge }: { c: P; a: number; op?: number; edge?: string }) {
  const map = indigoPetal(PETAL, PBOX)
  const pts = useMemo(() => petalAt(c, a), [c[0], c[1], a])   // eslint-disable-line react-hooks/exhaustive-deps
  if (op <= 0) return null
  return <group>
    <group position={[c[0] * K, c[1] * K, 0.0012]} rotation-z={a * Math.PI / 180}>
      <mesh position={[(PBOX[0] + PBOX[2]) / 2 * K, (PBOX[1] + PBOX[3]) / 2 * K, 0]} renderOrder={2}>
        <planeGeometry args={[(PBOX[2] - PBOX[0]) * K, (PBOX[3] - PBOX[1]) * K]} />
        <meshStandardMaterial map={map} transparent opacity={op} alphaTest={0.05} roughness={0.95} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
    {edge && <PLine pts={[...pts, pts[0]]} k={K} z={0.0016} color={edge} w={2.2} dashed={false} opacity={op} />}
  </group>
}

/** 花瓣木模：梨木方块，底面凸刻一片花瓣（蘸了靛蓝），顶上一个圆把手。原点在花瓣中心 PC，朝向和印出的花瓣一致 */
function Stamp() {
  const wood = woodLight()
  const relief = useMemo(() => { const g = new THREE.ExtrudeGeometry(shapeOf(PETAL.map(([u, v]) => [u - PC[0], v - PC[1]] as P), K), { depth: 0.004, bevelEnabled: false }); return g }, [])
  return <group>
    <mesh geometry={relief} position={[0, 0, 0]} castShadow><meshStandardMaterial color={INK} roughness={0.6} /></mesh>
    <RoundedBox args={[0.15, 0.1, 0.045]} radius={0.006} smoothness={2} position={[0, 0, 0.004 + 0.0225]} castShadow><meshStandardMaterial map={wood} color="#c79c6a" roughness={0.6} /></RoundedBox>
    <mesh position={[0, 0, 0.05 + 0.016]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.014, 0.018, 0.035, 20]} /><meshStandardMaterial map={wood} color="#a9784a" roughness={0.55} /></mesh>
    <mesh position={[0, 0, 0.05 + 0.036]} castShadow><sphereGeometry args={[0.02, 20, 14]} /><meshStandardMaterial map={wood} color="#a9784a" roughness={0.5} /></mesh>
  </group>
}

/** 印花长桌上的器材：白布、已经印上的花瓣、木模（抬起、转过去或平移过去、按下）、平移时团花的虚线轮廓、一盘蓝靛 */
function ClothScene({ stage, k, fk }: { stage: number; k: number; fk: number }) {
  const cot = useMemo(() => { const t = makeCotton().clone(); t.needsUpdate = true; t.repeat.set(4, 2.4); return t }, [])
  const f0 = GRID7[0]
  // 已经印好的
  const prints: { c: P; a: number; op: number; edge?: string }[] = []
  for (let j = 0; j <= Math.min(stage, 3); j++) prints.push({ c: f0, a: j * 90, op: 1, edge: j === 0 && stage < 4 ? COL.src : undefined })
  if (stage >= 4) for (let j = 0; j < 4; j++) prints.push({ c: GRID7[1], a: j * 90, op: 1 })
  if (stage >= 5) for (let i = 2; i < 6; i++) for (let j = 0; j < 4; j++) prints.push({ c: GRID7[i], a: j * 90, op: 1 })
  // 木模的位置：c 是团花中心，a 是转角，lift 是抬起多高
  let stamp: { c: P; a: number; lift: number } | null = { c: [999, 0], a: 0, lift: 0 }
  let ghost: { from: P; to: P; t: number }[] = []
  if (k > 0 && stage < 3) {
    const a0 = stage * 90, a1 = a0 + 90
    stamp = { c: f0, a: a0 + 90 * ease(seg(k, 0.2, 0.68)), lift: 0.05 * (k < 0.2 ? ease(k / 0.2) : k < 0.7 ? 1 : k < 0.86 ? 1 - ease(seg(k, 0.7, 0.86)) : ease(seg(k, 0.9, 1))) }
    if (k >= 0.86) prints.push({ c: f0, a: a1, op: seg(k, 0.86, 0.9), edge: COL.img })
  } else if (k > 0 && stage === 3) {
    ghost = [{ from: f0, to: GRID7[1], t: ease(seg(k, 0, 0.38)) }]
    for (let j = 0; j < 4; j++) { const t0 = 0.44 + j * 0.14; if (k >= t0 + 0.08) prints.push({ c: GRID7[1], a: j * 90, op: seg(k, t0 + 0.08, t0 + 0.11), edge: COL.img }) }
    const j = Math.min(3, Math.max(0, Math.floor((k - 0.44) / 0.14))), local = seg(k, 0.44 + j * 0.14, 0.58 + j * 0.14)
    stamp = k < 0.4 ? { c: f0, a: 270 * (1 - ease(seg(k, 0, 0.38))), lift: 0.05 } : { c: GRID7[1], a: j * 90, lift: 0.05 * Math.abs(Math.cos(local * Math.PI)) }
  } else if (fk > 0) {
    ghost = GRID7.slice(2).map(to => ({ from: f0, to, t: ease(seg(fk, 0, 0.3)) }))
    for (let i = 2; i < 6; i++) for (let j = 0; j < 4; j++) { const t0 = 0.32 + ((i - 2) * 4 + j) * 0.04; if (fk >= t0) prints.push({ c: GRID7[i], a: j * 90, op: seg(fk, t0, t0 + 0.03) }) }
    stamp = null
  } else if (stage >= 5) stamp = { c: [999, 0], a: 0, lift: 0 }
  const restTray = !(k > 0 && stage < 4)
  return (
    <Plane o={O}>
      {/* 白布：比桌面小一圈，四边卷一道边 */}
      <mesh position={[0, 0, 0.0005]} receiveShadow><planeGeometry args={[1.0, 0.6]} /><meshStandardMaterial map={cot} roughness={0.95} /></mesh>
      {[[0, 0.3, 1.0, 0.008], [0, -0.3, 1.0, 0.008], [0.5, 0, 0.008, 0.6], [-0.5, 0, 0.008, 0.6]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0.0015]} receiveShadow><boxGeometry args={[w, h, 0.002]} /><meshStandardMaterial map={cot} color="#e4ddcc" roughness={0.95} /></mesh>)}
      {prints.map((p, i) => <Print key={i} c={p.c} a={p.a} op={p.op} edge={p.edge} />)}
      {/* 平移时：团花的虚线轮廓滑过去 */}
      {ghost.map((g, gi) => { const c: P = [g.from[0] + (g.to[0] - g.from[0]) * g.t, g.from[1] + (g.to[1] - g.from[1]) * g.t]; return <group key={gi}>{[0, 90, 180, 270].map(a => { const pts = petalAt(c, a); return <PLine key={a} pts={[...pts, pts[0]]} k={K} z={0.003} color={COL.img} w={1.8} dash={0.006} opacity={g.t < 1 ? 1 : 0.5} /> })}</group> })}
      {/* 团花中心的十字 */}
      {stage < 4 && <PLine pts={[[f0[0] - 1.2, f0[1]], [f0[0] + 1.2, f0[1]]]} k={K} z={0.002} color="#1d2327" w={1.6} dashed={false} />}
      {stage < 4 && <PLine pts={[[f0[0], f0[1] - 1.2], [f0[0], f0[1] + 1.2]]} k={K} z={0.002} color="#1d2327" w={1.6} dashed={false} />}
      {/* 蓝靛盘：浅木盘里一层靛蓝的浆 */}
      <group position={[-0.22, 0.4, 0]}>
        <RoundedBox args={[0.16, 0.12, 0.02]} radius={0.006} smoothness={2} position={[0, 0, 0.01]} castShadow receiveShadow><meshStandardMaterial map={woodLight()} color="#b88d5c" roughness={0.6} /></RoundedBox>
        <mesh position={[0, 0, 0.0205]}><planeGeometry args={[0.14, 0.1]} /><meshStandardMaterial color="#13234d" roughness={0.2} /></mesh>
      </group>
      {stamp && (() => {
        const rest = restTray && stamp.c[0] === 999
        const q = rest ? [0.04, 0.41] : (() => { const r = rotate(PC, [0, 0], stamp.a); return [(r[0] + stamp.c[0]) * K, (r[1] + stamp.c[1]) * K] })()
        return <group position={[q[0], q[1], (rest ? 0 : 0.0012) + stamp.lift]} rotation-z={rest ? 0.3 : stamp.a * Math.PI / 180}><Stamp /></group>
      })()}
    </Plane>
  )
}
