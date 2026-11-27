// 勾股定理 · 第 1 课 方砖上的发现：广场地砖上用三根彩色木条摆一个直角三角形，在三条边外侧铺正方形，数一数各用了几块砖。
// 两条直角边上的正方形一块一块铺上去、数得出来；斜边上的正方形是斜的，套一个大正方形、减去四个角来数。换三个三角形，找出规律。
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, Place, PolySlab, Strip, ease, onPlane, sideStyle, spot, useRun } from './parts'
import { TILE, TRI1, cutCount, fmtLen, row1, type Tri1 } from './physics'
import { ST } from './world'

const KEYS = Object.keys(TRI1) as Tri1[]
const TASKS: Task[] = KEYS.map(k => { const r = row1(k); return { id: k, text: `两条直角边是 ${TRI1[k].name} 块砖：铺正方形，数一数`, note: `${r.A} + ${r.B} = ${r.C}：两直角边上的正方形加起来，等于斜边上的` } })
const O: [number, number, number] = [ST.l1.x, 0, ST.l1.z]
const at = onPlane(O, TILE)

export default function Lesson1() {
  const [tri, setTri] = useState<Tri1>('iso')
  const [rows, setRows] = useState<Tri1[]>([])
  const T = useTasks('gewu:pyth:1', TASKS)
  const lay = useRun(3.2), cut = useRun(5)
  const { a, b } = TRI1[tri], r = row1(tri), cc = cutCount(a, b)
  // 机位跟着三角形的大小走：三个正方形都装得下
  const view = useMemo(() => { const c = at(a / 2, b / 2); return spot(c[0] + 0.1, 0, c[2], (a + 2 * b) * TILE + 0.45, (2 * a + b) * TILE + 0.3, 0, 0.95) }, [a, b])
  const laid = lay.k >= 1, counted = cut.k >= 1, recorded = rows.includes(tri)
  const pick = (k: Tri1) => { if (lay.busy || cut.busy) return; setTri(k); lay.snap(0); cut.snap(0) }
  const record = () => { if (!counted || recorded) return; const next = [...rows, tri]; setRows(next); T.check(id => next.includes(id as Tri1)) }
  const resetAll = () => { setTri('iso'); setRows([]); lay.snap(0); cut.snap(0); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'tri' | 'lay' | 'cut' | 'rec' | null } = (() => {
    if (!task) return { hint: '三组都数完了：两直角边上的正方形加起来，正好等于斜边上的正方形。', next: null }
    if (tri !== task.id) return { hint: `换成两条直角边是 ${TRI1[task.id as Tri1].name} 块砖的三角形`, next: 'tri' }
    if (lay.busy) return { hint: '一块一块铺上去…', next: null }
    if (!laid) return { hint: '在两条直角边外侧各铺一个正方形，数一数用了几块砖', next: 'lay' }
    if (cut.busy) return { hint: '大正方形减去四个角…', next: null }
    if (!counted) return { hint: '斜边上的正方形是斜的：套一个大正方形，减去四个角', next: 'cut' }
    return { hint: `记下这一组：${r.A} + ${r.B} 和 ${r.C}`, next: 'rec' }
  })()

  // 标签：三条边的长、三个正方形的面积
  const nA = Math.min(r.A, Math.floor(lay.k * (r.A + r.B) + 1e-6)), nB = Math.max(0, Math.min(r.B, Math.floor(lay.k * (r.A + r.B) + 1e-6) - r.A))
  const labels: Label[] = [
    { id: 'a', at: at(a / 2, 0.3, 0.05), ax: 0.5, className: 'scene-tag -translate-y-1/2', style: sideStyle('a'), children: <><small style={{ color: '#fff' }}>a</small>{a}</> },
    { id: 'b', at: at(0.22, b / 2 + 0.2, 0.05), ax: 0, className: 'scene-tag -translate-y-1/2', style: sideStyle('b'), children: <><small style={{ color: '#3a2600' }}>b</small>{b}</> },
    { id: 'c', at: at(a / 2 + 0.45 * b / Math.hypot(a, b), b / 2 + 0.45 * a / Math.hypot(a, b), 0.05), ax: 0, className: 'scene-tag -translate-y-1/2', style: sideStyle('c'), children: <><small style={{ color: '#fff' }}>c</small>{counted ? fmtLen(r.C) : '?'}</> },
    { id: 'A', at: at(a / 2, -a / 2, 0.05), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: nA > 0 ? 1 : 0 }, children: <><small>a²</small>{nA} 块</> },
    { id: 'B', at: at(-b / 2, b / 2, 0.05), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: nB > 0 ? 1 : 0 }, children: <><small>b²</small>{nB} 块</> },
    { id: 'C', at: at((a + b) / 2 + 0.3 * b / Math.hypot(a, b), (a + b) / 2 + 0.3 * a / Math.hypot(a, b), 0.05), ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: counted ? 1 : 0 }, children: <><small>c²</small>{cc.outer} − {cc.corners} = {r.C} 块</> },
    { id: 'big', at: at(a + b, a + b + 0.2, 0.05), ax: 1, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: cut.k > 0.15 && !counted ? 1 : 0 }, children: <><small>大正方形</small>{a + b} × {a + b} = {cc.outer} 块</> },
    { id: 'cor', at: at(a + b - 0.1, 0.2, 0.05), ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: cut.k > 0.45 && !counted ? 1 : 0 }, children: <><small>四个角</small>4 × {cc.corner} = {cc.corners} 块</> },
    { id: 'n1', at: at(-0.2, -0.3, 0.05), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '直角' },
  ]
  return (
    <LabShell title="勾股定理" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地砖"
      stage={<Place at="l1" view={view} labels={labels}><TileScene a={a} b={b} lay={lay.k} cut={cut.k} /></Place>}
      lesson={<LessonBlock no="1" title="方砖上的发现" concept="两直角边上正方形之和等于斜边上的" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>直角三角形里，夹着直角的两条边叫<b className="text-white">直角边</b>（a、b），对着直角的边叫<b className="text-white">斜边</b>（c）。</p>
          <p className="mt-3">在三条边上各画一个正方形，数一数面积：两条直角边上的正方形面积之和，等于斜边上的正方形面积，也就是 a² + b² = c²。</p>
          <p className="mt-3">斜边上的正方形是斜着的，不好直接数。在它外面套一个边长 a + b 的大正方形，大正方形比它多出四个角，每个角都是和原来一样的直角三角形（面积 ½ab），所以 c² = (a + b)² − 4 × ½ab。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">三组都是：两直角边上的正方形加起来，等于斜边上的正方形</p>
        <p className="mt-1 text-[14px] text-white/70">4 + 4 = 8，9 + 16 = 25，4 + 9 = 13：a² + b² = c²。这只是三个例子里的猜想，下面两课来证明它。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">两直角边上的正方形 · 斜边上的正方形</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight tabular-nums">{laid ? `${r.A} + ${r.B}` : '—'}<span className="mx-2 text-[22px] text-white/55">{counted ? '=' : '·'}</span>{counted ? r.C : '?'}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol={<span style={{ color: COL.a }}>a²</span>} value={laid ? String(r.A) : '—'} unit="块" />
            <ParamTile symbol={<span style={{ color: COL.b }}>b²</span>} value={laid ? String(r.B) : '—'} unit="块" />
            <ParamTile symbol={<span style={{ color: COL.c }}>c²</span>} value={counted ? String(r.C) : '—'} unit="块" />
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5">
            <div className="text-[12.5px] text-white/55">c² = (a + b)² − 4 × ½ab</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums">{counted ? `${cc.outer} − ${cc.corners} = ${r.C}` : '—'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">a, b</th><th className="font-normal">a²</th><th className="font-normal">b²</th><th className="font-normal">c²</th></tr></thead>
            <tbody>{KEYS.map(k => { const x = row1(k), on = rows.includes(k); return <tr key={k} className={on ? 'text-white' : 'text-white/30'}><td className="py-1">{TRI1[k].name}</td><td className="text-center">{on ? x.A : '—'}</td><td className="text-center">{on ? x.B : '—'}</td><td className="text-center">{on ? x.C : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'lay'} onClick={lay.run} disabled={lay.busy || laid}>铺正方形</LabButton>
        <LabButton pulse={next === 'cut'} onClick={cut.run} disabled={!laid || cut.busy || counted}>数斜边上的</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!counted || recorded}>记录数据</LabButton>
      </>}
      extras={<Control label="直角边（块砖）"><Segmented label="直角边" pulse={next === 'tri'} want={next === 'tri' ? task!.id as Tri1 : null} disabled={lay.busy || cut.busy} value={tri} onChange={pick} options={KEYS.map(k => ({ value: k, label: TRI1[k].name }))} /></Control>}
    />
  )
}

/** 地砖上的器材：三根彩色木条、两直角边外的彩色釉面砖、斜边上的绿色石板，以及“大正方形减四个角”的粉笔线和灰色的四个角 */
function TileScene({ a, b, lay, cut }: { a: number; b: number; lay: number; cut: number }) {
  const A = a * a, B = b * b, n = lay * (A + B)
  const tiles: { u: number; v: number; s: 'a' | 'b'; k: number }[] = []
  for (let i = 0; i < A; i++) tiles.push({ u: i % a, v: -1 - Math.floor(i / a), s: 'a', k: Math.min(1, Math.max(0, n - i)) })
  for (let i = 0; i < B; i++) tiles.push({ u: -1 - (i % b), v: Math.floor(i / b), s: 'b', k: Math.min(1, Math.max(0, n - A - i)) })
  const s = a + b, k1 = Math.min(1, cut / 0.3), k2 = Math.min(1, Math.max(0, (cut - 0.35) / 0.3)), k3 = Math.min(1, Math.max(0, (cut - 0.7) / 0.3))
  const corners: [number, number][][] = [[[0, 0], [a, 0], [0, b]], [[a, 0], [s, 0], [s, a]], [[s, a], [s, s], [b, s]], [[b, s], [0, s], [0, b]]]
  const W = 0.06 / TILE, H = 0.05   // 木条宽 6 cm（换成砖的单位）、高 5 cm
  return (
    <group position={O}>
      <group scale={[TILE, 1, TILE]}>
        {/* 两直角边外的釉面砖：一块一块弹上来 */}
        {tiles.map((t, i) => t.k > 0 && <group key={i} position={[t.u + 0.5, 0, -(t.v + 0.5)]} scale={[ease(t.k) * 0.94, 1, ease(t.k) * 0.94]}>
          <RoundedBox args={[1, 0.016, 1]} radius={0.006} smoothness={2} position={[0, 0.008 + (1 - ease(t.k)) * 0.08, 0]} receiveShadow castShadow>
            <meshPhysicalMaterial color={COL[t.s]} roughness={0.28} clearcoat={0.6} clearcoatRoughness={0.2} />
          </RoundedBox>
        </group>)}
        {/* 大正方形的粉笔线：从直角顶点往外画开 */}
        {k1 > 0 && cut < 1 && <>
          <Strip p={[0, 0]} q={[s * k1, 0]} w={0.07 / TILE} h={0.003} color="#fffbe8" y={0.003} glow />
          <Strip p={[0, 0]} q={[0, s * k1]} w={0.07 / TILE} h={0.003} color="#fffbe8" y={0.003} glow />
          <Strip p={[s, 0]} q={[s, s * k1]} w={0.07 / TILE} h={0.003} color="#fffbe8" y={0.003} glow />
          <Strip p={[0, s]} q={[s * k1, s]} w={0.07 / TILE} h={0.003} color="#fffbe8" y={0.003} glow />
        </>}
        {/* 四个角：先变灰，再淡出 */}
        {k2 > 0 && k3 < 1 && corners.map((c, i) => <PolySlab key={i} pts={c} h={0.004} y={0.004} color="#22262b" opacity={0.72 * k2 * (1 - k3)} />)}
      </group>
      {/* 斜边上的正方形：绿色的薄石板，套大正方形的过程里慢慢显出来 */}
      {cut > 0.7 && <group scale={[TILE, 1, TILE]}><PolySlab pts={[[a, 0], [s, a], [b, s], [0, b]]} h={0.012} y={0.002} color={COL.c} opacity={0.3 + 0.35 * k3} emissive={0.12} /></group>}
      {/* 三个正方形的粉笔轮廓：一开始就画在地上，铺砖、数砖都在轮廓里 */}
      <group scale={[TILE, 1, TILE]}>
        {([[[0, 0], [a, 0], [a, -a], [0, -a]], [[0, 0], [0, b], [-b, b], [-b, 0]], [[a, 0], [s, a], [b, s], [0, b]]] as [number, number][][]).map((q, j) => q.map((p, i) => <Strip key={`${j}${i}`} p={p} q={q[(i + 1) % 4]} w={0.035 / TILE} h={0.002} y={0.0025} color={j === 0 ? '#bcd4ff' : j === 1 ? '#ffe2a8' : '#bff0d2'} />))}
      </group>
      {/* 三根彩色木条：两条直角边和斜边 */}
      <group scale={[TILE, 1, TILE]}>
        <Strip p={[0, 0]} q={[a, 0]} w={W} h={H} color={COL.a} />
        <Strip p={[0, 0]} q={[0, b]} w={W} h={H} color={COL.b} />
        <Strip p={[a, 0]} q={[0, b]} w={W} h={H} color={COL.c} />
        {/* 直角记号 */}
        <Strip p={[0.3, 0]} q={[0.3, 0.3]} w={0.025 / TILE} h={0.006} color="#f4f1e6" y={0.002} />
        <Strip p={[0, 0.3]} q={[0.3, 0.3]} w={0.025 / TILE} h={0.006} color="#f4f1e6" y={0.002} />
      </group>
    </group>
  )
}
