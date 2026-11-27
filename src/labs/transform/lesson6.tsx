// 图形的变换 · 第 6 课 形状大小不变：拷贝台的灯箱上铺着描图纸，纸上一个蓝色的纸三角形 ABC。
// 分别做一次平移、轴对称、旋转，量像的三条边和三个角：都和原来一样。再看 A→B→C 的绕向：平移、旋转不变，轴对称反过来。
import { useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { BrassPin, COL, Dot, Fig, PLine, Place, Plane, TILE, ease, pt, seg, tagStyle, toWorld, useRun } from './parts'
import { AXIS6, GRID6, MOVE6, PIVOT6, TRI6, VEC6, angles, cm, deg, move6, sides, turnDir, type Move6, type P } from './physics'
import { makeTracing } from './mats'
import { ST } from './world'
import { polyFace } from './crafts'

/** 纸三角形：蓝的和橙的卡纸，面上印一圈边线和一朵花 */
const card = (w: 'src' | 'img') => polyFace(TRI6, TILE[w].base, TILE[w].ink, TILE[w].light)
const BOX6: [number, number, number, number] = [0, 0, 4, 3]

const KEYS = Object.keys(MOVE6) as Move6[]
const TASKS: Task[] = [
  { id: 'shift', text: '平移：量像的边和角', note: '三边、三角都没变；A→B→C 还是逆时针' },
  { id: 'flip', text: '轴对称：量一量，看绕向', note: '三边、三角都没变；A→B→C 变成了顺时针' },
  { id: 'turn', text: '旋转：量一量', note: '三边、三角都没变；A→B→C 还是逆时针' },
]
const K = GRID6 / 100
const C6: P = [5.5, -0.5]   // 整幅图的中心
const O: [number, number, number] = [ST.l6.x - C6[0] * K, ST.l6.y + 0.0015, ST.l6.z - C6[1] * K]
const W = toWorld(O, K)
const T = 0.0012
const S0 = sides(TRI6), A0 = angles(TRI6)
const cen = (t: P[]): P => [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3]

export default function Lesson6() {
  const [mv, setMv] = useState<Move6>('shift')
  const [moved, setMoved] = useState(false)
  const [rows, setRows] = useState<Move6[]>([])
  const Tk = useTasks('gewu:transform:6', TASKS)
  const go = useRun(2.4, () => setMoved(true))
  const meas = useRun(1.6, () => { const n = rows.includes(mv) ? rows : [...rows, mv]; setRows(n); Tk.check(id => n.includes(id as Move6)) })
  const busy = go.busy || meas.busy
  const r = useMemo(() => move6(mv), [mv]), measured = rows.includes(mv) && moved
  const pick = (k: Move6) => { if (busy) return; setMv(k); setMoved(false); go.snap(0); meas.snap(0) }
  const resetAll = () => { setRows([]); pick('shift'); Tk.reset() }

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'mv' | 'go' | 'meas' | null } = (() => {
    if (!task) return { hint: '三种变换都只改变位置，不改变形状和大小。', next: null }
    if (go.busy) return { hint: `${MOVE6[mv].name}…`, next: null }
    if (meas.busy) return { hint: '量三条边、三个角…', next: null }
    if (mv !== task.id) return { hint: `换成${MOVE6[task.id as Move6].name}`, next: 'mv' }
    if (!moved) return { hint: mv === 'shift' ? '把三角形向右平移 6 格、向上 1 格' : mv === 'flip' ? '把三角形沿紫色的对称轴翻过去' : '把三角形绕黄铜钉逆时针旋转 90°', next: 'go' }
    return { hint: '量一量像的三条边和三个角，看 A′→B′→C′ 的绕向', next: 'meas' }
  })()

  const mk = measured ? 1 : meas.k
  const img = r.img, c1 = cen(img), c0 = cen(TRI6)
  const sideMid = (t: P[], i: number, c: P): P => { const a = t[i], b = t[(i + 1) % 3], m: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = Math.hypot(m[0] - c[0], m[1] - c[1]); return [m[0] + (m[0] - c[0]) / d * 0.75, m[1] + (m[1] - c[1]) / d * 0.75] }
  const out = (t: P[], i: number, c: P, s = 0.65): P => { const p = t[i], d = Math.hypot(p[0] - c[0], p[1] - c[1]); return [p[0] + (p[0] - c[0]) / d * s, p[1] + (p[1] - c[1]) / d * s] }
  const labels: Label[] = [
    ...TRI6.map((_, i): Label => ({ id: `s${i}`, at: W(...out(TRI6, i, c0), 0.004), ax: 0.5, className: 'scene-tag -translate-y-1/2', style: tagStyle('src'), children: pt('src', i) })),
    ...img.map((_, i): Label => ({ id: `i${i}`, at: W(...out(img, i, c1), 0.006), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: tagStyle('img', { opacity: moved ? 1 : 0 }), children: pt('img', i) })),
    ...img.map((_, i): Label => ({ id: `l${i}`, at: W(...sideMid(img, i, c1), 0.006), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: seg(mk, 0.1 + i * 0.12, 0.25 + i * 0.12), fontSize: 14 }, children: cm(r.sides[i]) })),
    ...img.map((_, i): Label => ({ id: `g${i}`, at: W(img[i][0] + (c1[0] - img[i][0]) * 0.32, img[i][1] + (c1[1] - img[i][1]) * 0.32, 0.006), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: seg(mk, 0.55 + i * 0.1, 0.7 + i * 0.1), fontSize: 13, padding: '1px 6px' }, children: deg(r.angles[i]) })),
    { id: 'dir0', at: W(c0[0], c0[1] - 0.15, 0.004), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: seg(mk, 0.85, 1), fontSize: 13, padding: '1px 6px' }, children: turnDir(TRI6) === '逆时针' ? '↺ 逆时针' : '↻ 顺时针' },
    { id: 'dir1', at: W(c1[0], c1[1] - 0.15, 0.006), ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: seg(mk, 0.85, 1), fontSize: 13, padding: '1px 6px' }, children: r.dir === '逆时针' ? '↺ 逆时针' : '↻ 顺时针' },
    { id: 'ax', at: W(AXIS6, 4.6, 0.004), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: tagStyle('axis', { opacity: mv === 'flip' ? 1 : 0 }), children: '对称轴' },
    { id: 'pv', at: W(PIVOT6[0] + 0.4, PIVOT6[1] + 0.5, 0.004), ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { background: '#1d2327', color: '#fff', boxShadow: 'none', opacity: mv === 'turn' ? 1 : 0 }, children: '旋转中心' },
    { id: 'n1', at: W(-1.6, -4.6, 0), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '灯箱上的描图纸 · 一格 4 cm' },
  ]
  return (
    <LabShell title="图形的变换" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="三角形"
      stage={<Place at="l6" labels={labels}><BoxScene mv={mv} k={moved ? 1 : go.k} measure={mk} /></Place>}
      lesson={<LessonBlock no="6" title="形状大小不变" concept="三种变换都不改变形状大小" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>平移、轴对称、旋转都只改变图形的<b className="text-white">位置</b>，不改变图形的<b className="text-white">形状和大小</b>：变换前后的两个图形<b className="text-white">全等</b>，对应边相等，对应角相等。</p>
          <p className="mt-3">它们也有不同：平移和旋转以后，A→B→C 的绕行方向不变；轴对称相当于把图形翻过来，绕行方向变成相反的。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">平移、轴对称、旋转都不改变形状和大小，像和原图全等</p>
        <p className="mt-1 text-[14px] text-white/70">三次量到的都是 16.0、17.0、12.6 cm 和 72°、45°、63°。不同的是绕向：平移、旋转后 A′→B′→C′ 还是逆时针，轴对称后变成顺时针。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">像和原图</div>
            <div className="mt-1 text-[32px] leading-tight font-bold tracking-tight">{mk >= 1 ? (r.same ? '形状大小都一样' : '不一样') : '—'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">三边（cm）· 三角 · 绕向</h2>
          <table className="mt-1.5 w-full text-[13.5px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal"></th><th className="font-normal">三边</th><th className="font-normal">三角</th><th className="font-normal">绕向</th></tr></thead>
            <tbody>
              <tr className="text-white"><td className="py-1" style={{ color: COL.src }}>原图</td><td className="text-center">{S0.map(x => x.toFixed(1)).join(' ')}</td><td className="text-center">{A0.map(x => Math.round(x)).join(' ')}</td><td className="text-center">{turnDir(TRI6)}</td></tr>
              {KEYS.map(k => { const x = move6(k), on = rows.includes(k); return <tr key={k} className={on ? 'text-white' : 'text-white/30'}><td className="py-1" style={{ color: on ? COL.img : undefined }}>{MOVE6[k].name}</td><td className="text-center">{on ? x.sides.map(s => s.toFixed(1)).join(' ') : '—'}</td><td className="text-center">{on ? x.angles.map(a => Math.round(a)).join(' ') : '—'}</td><td className="text-center">{on ? x.dir : '—'}</td></tr> })}
            </tbody>
          </table>
          <p className="mt-1 text-[12px] text-white/45">三角依次是 ∠A、∠B、∠C，单位：度</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'go'} onClick={go.run} disabled={busy || moved}>{MOVE6[mv].name}</LabButton>
        <LabButton primary pulse={next === 'meas'} onClick={meas.run} disabled={busy || !moved || measured}>量一量</LabButton>
      </>}
      extras={<Control label="变换"><Segmented label="变换" pulse={next === 'mv'} want={next === 'mv' ? task!.id as Move6 : null} disabled={busy} value={mv} onChange={pick} options={KEYS.map(k => ({ value: k, label: MOVE6[k].name }))} /></Control>}
    />
  )
}

/** 灯箱上的器材：描图纸、蓝色纸三角形、橙色的像（滑过去、翻过去、转过去）、对称轴、旋转中心的黄铜钉、量边时的白虚线 */
function BoxScene({ mv, k, measure }: { mv: Move6; k: number; measure: number }) {
  const paper = useMemo(() => { const t = makeTracing().clone(); t.needsUpdate = true; t.repeat.set(0.62 / 0.4, 0.46 / 0.4); t.offset.set(((0.31 - C6[0] * K) / 0.4) % 1, ((0.23 - C6[1] * K) / 0.4) % 1); return t }, [])
  const e = ease(k)
  const img = move6(mv).img
  // 三种动法：平移整体滑过去；轴对称绕对称轴翻过去；旋转绕钉子转过去
  const moving = mv === 'shift'
    ? <group position={[VEC6[0] * e * K, VEC6[1] * e * K, T]}><Fig pts={TRI6} k={K} t={T} color="#ffffff" kind="paper" map={card('img')} uvBox={BOX6} /></group>
    : mv === 'flip'
      ? <group position={[AXIS6 * K, 0, T + 0.0006]} rotation-y={-Math.PI * e}><group position={[-AXIS6 * K, 0, -0.0006]}><Fig pts={TRI6} k={K} t={T} color="#ffffff" kind="paper" map={card('img')} uvBox={BOX6} /></group></group>
      : <group position={[PIVOT6[0] * K, PIVOT6[1] * K, T]} rotation-z={Math.PI / 2 * e}><group position={[-PIVOT6[0] * K, -PIVOT6[1] * K, 0]}><Fig pts={TRI6} k={K} t={T} color="#ffffff" kind="paper" map={card('img')} uvBox={BOX6} /></group></group>
  return (
    <Plane o={O}>
      {/* 描图纸：比灯箱面小一圈，四角用胶带粘住 */}
      <mesh position={[C6[0] * K, C6[1] * K, 0.0002]} receiveShadow><planeGeometry args={[0.62, 0.46]} /><meshStandardMaterial map={paper} transparent opacity={0.9} roughness={0.8} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => <mesh key={`${sx}${sy}`} position={[C6[0] * K + sx * 0.3, C6[1] * K + sy * 0.22, 0.0005]} rotation-z={sx * sy * 0.7}><planeGeometry args={[0.06, 0.02]} /><meshStandardMaterial color="#efe3b6" transparent opacity={0.75} roughness={0.6} /></mesh>)}
      <Fig pts={TRI6} k={K} t={T} color="#ffffff" kind="paper" map={card('src')} uvBox={BOX6} />
      {TRI6.map((p, i) => <Dot key={i} at={p} k={K} z={T} who="src" r={0.0035} />)}
      {k > 0 && moving}
      {k >= 1 && img.map((p, i) => <Dot key={i} at={p} k={K} z={2 * T} who="img" r={0.0035} />)}
      {mv === 'flip' && <PLine pts={[[AXIS6, -5.2], [AXIS6, 4.6]]} k={K} z={0.003} color={COL.axis} w={3} dash={0.008} />}
      {mv === 'shift' && k >= 1 && <PLine pts={[TRI6[0], img[0]]} k={K} z={0.003} w={2} dash={0.006} />}
      {mv === 'turn' && <group position={[PIVOT6[0] * K, PIVOT6[1] * K, 2 * T + 0.001]}><BrassPin r={0.005} /></group>}
      {/* 量边：像的三条边依次描一遍白线 */}
      {measure > 0 && img.map((p, i) => { const q = img[(i + 1) % 3], s = seg(measure, i * 0.15, 0.15 + i * 0.15); return s > 0 ? <PLine key={i} pts={[p, [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s]]} k={K} z={0.004} w={2.4} dashed={false} color="#ffffff" /> : null })}
    </Plane>
  )
}
