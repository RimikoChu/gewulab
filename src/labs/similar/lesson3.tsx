// 相似和测量 · 第 3 课 周长比和面积比：篮球场上一个小三角形（木条围的，里面放一块同样大的三角形板）和一个按相似比 2、3 放大的大三角形。
// 绕两个三角形各量一圈周长：大的是小的 k 倍；再用和小三角形一样大的板去铺满大三角形：要 k² 块，面积是 k² 倍。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Basketball, Clipboard, Place, Seg, ease, spot, tag, tagStyle, useRun, type V3 } from './parts'
import { Figure, onPlane } from './figure'
import { K3, TRI3, f2, tiles3, tri3, type P2 } from './physics'
import { ST } from './world'

type K = '2' | '3'
const TASKS: Task[] = [
  { id: 'p2', text: '相似比 2：绕两个三角形量周长', note: `周长 ${f2(tri3(2).p0)} m 和 ${f2(tri3(2).p)} m：周长比是 2` },
  { id: 's2', text: '相似比 2：用小三角形板铺满大三角形', note: '铺了 4 块：面积比是 4，是 2 的平方' },
  { id: 'k3', text: '相似比 3：再量周长、再铺一遍', note: '周长比 3，铺了 9 块：面积比 9' },
]
const GAP = 1.25
const O: V3 = [ST.l3.x - 2.1, 0.022, ST.l3.z + 0.9]
const at = onPlane(O)
const TRI_COL = ['#f3b56b', '#c9772f']   // 小三角形板：正放、倒放两种颜色深浅

/** 一块三角形塑料板：顶点按平面坐标，厚 1 cm，边上倒角 */
function Plate({ pts, color, lift = 0, opacity = 1 }: { pts: P2[]; color: string; lift?: number; opacity?: number }) {
  const geo = useMemo(() => {
    const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3
    const shrink = (p: P2): THREE.Vector2 => new THREE.Vector2(cx + (p[0] - cx) * 0.96, cy + (p[1] - cy) * 0.96)   // 留一道缝，块与块分得清
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(shrink)), { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.004, bevelSegments: 1 })
    g.rotateX(-Math.PI / 2); return g
  }, [pts.map(p => p.join()).join(';')])   // eslint-disable-line react-hooks/exhaustive-deps
  if (opacity <= 0.01) return null
  return <mesh geometry={geo} position={[O[0], O[1] + 0.004 + lift, O[2]]} castShadow receiveShadow>
    <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.6} transparent={opacity < 1} opacity={opacity} />
  </mesh>
}

export default function Lesson3() {
  const [k, setK] = useState<K>('2')
  const [did, setDid] = useState<string[]>([])     // 做过的：p2、s2、p3、s3
  const T = useTasks('gewu:similar:3', TASKS)
  const mark = (id: string) => { const n = [...did, id]; setDid(n); T.check(t => t === 'k3' ? n.includes('p3') && n.includes('s3') : n.includes(t)) }
  const per = useRun(3.2, () => mark(`p${k}`)), tile = useRun(k === '2' ? 2.6 : 4.2, () => mark(`s${k}`))
  const kk = +k, r = tri3(kk), big = useMemo(() => r.big.map(([x, y]) => [x + GAP, y] as P2), [r.big])
  const tiles = useMemo(() => tiles3(kk).map(t => ({ ...t, pts: t.pts.map(([x, y]) => [x + GAP, y] as P2) })), [kk])
  const pDone = did.includes(`p${k}`) || per.k >= 1, sDone = did.includes(`s${k}`) || tile.k >= 1
  const pick = (v: K) => { if (per.busy || tile.busy) return; setK(v); per.snap(0); tile.snap(0) }
  const resetAll = () => { setK('2'); setDid([]); per.snap(0); tile.snap(0); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'k' | 'per' | 'tile' | null } = (() => {
    if (!task) return { hint: '周长比等于相似比，面积比等于相似比的平方。', next: null }
    if (task.id === 'k3' && k !== '3') return { hint: '换成相似比 3', next: 'k' }
    if (per.busy) return { hint: '沿着三条边量一圈…', next: null }
    if (tile.busy) return { hint: '一块一块铺进去…', next: null }
    if (!pDone) return { hint: `相似比 ${k}：绕两个三角形各量一圈周长`, next: 'per' }
    if (!sDone) return { hint: '用和小三角形一样大的板，铺满大三角形', next: 'tile' }
    return { hint: '换成相似比 3', next: 'k' }
  })()

  // 量周长：一条亮线先绕小三角形一圈，再绕大三角形一圈
  const trace = (pts: P2[], q: number) => {
    const L = r.p0 * (pts === TRI3 ? 1 : kk), segs: { a: V3; b: V3 }[] = []
    let left = q * L
    for (let i = 0; i < 3 && left > 0; i++) {
      const a = pts[i], b = pts[(i + 1) % 3], l = Math.hypot(b[0] - a[0], b[1] - a[1]), f = Math.min(1, left / l)
      segs.push({ a: at(a[0], a[1], 0.05), b: at(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0.05) }); left -= l
    }
    return segs
  }
  const q1 = pDone ? 1 : Math.min(1, per.k * 2), q2 = pDone ? 1 : Math.max(0, per.k * 2 - 1)
  const nTiles = sDone ? tiles.length : Math.floor(tile.k * tiles.length + 1e-6)
  const view = useMemo(() => spot(O[0] + (GAP + 0.8 * kk) / 2 + 0.05, 0.1, O[2] - 0.35 * kk - 0.35, GAP + 0.8 * kk + 0.4, 0.6 * kk + 0.7, -0.3, 0.4), [kk])
  const cBig = at(GAP + 0.37 * kk, 0.2 * kk, 0.05)
  const labels: Label[] = [
    { id: 'p0', at: at(0.37, -0.22, 0.05), ax: 0.5, className: `${tag} transition-opacity`, style: { opacity: q1 >= 1 ? 1 : 0 }, children: <><small>周长</small>{f2(r.p0)} m</> },
    { id: 'p1', at: at(GAP + 0.4 * kk, -0.22, 0.05), ax: 0.5, className: `${tag} transition-opacity`, style: { opacity: q2 >= 1 ? 1 : 0 }, children: <><small>周长</small>{f2(r.p)} m</> },
    { id: 's0', at: at(0.37, 0.2, 0.05), ax: 0.5, className: `${tag} transition-opacity`, style: tagStyle(TRI_COL[0], { opacity: 1 }), children: '1 块' },
    { id: 's1', at: cBig, ax: 0.5, className: `${tag} key transition-opacity`, style: { opacity: nTiles > 0 ? 1 : 0 }, children: <><small>铺了</small>{nTiles} 块</> },
    { id: 'n0', at: at(-0.05, 0.62, 0.05), ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '小三角形' },
    { id: 'n1', at: at(GAP + 0.1, 0.62 * kk, 0.05), ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: `放大 ${k} 倍` },
  ]
  return (
    <LabShell title="相似和测量" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="量和铺"
      stage={<Place view={view} labels={labels} elev={58}>
        <Basketball at={at(1.0, 1.05, 0.021)} />
        <Clipboard at={at(-0.45, -0.3, 0.021)} yaw={0.25} />
        <Figure pts={TRI3} at={at} arcs={0} />
        <Figure pts={big} at={at} arcs={0} />
        <Plate pts={TRI3} color={TRI_COL[0]} />
        {tiles.map((t, i) => {
          const f = sDone ? 1 : Math.min(1, Math.max(0, tile.k * tiles.length - i))
          return f > 0 && <Plate key={`${k}${i}`} pts={t.pts} color={TRI_COL[t.up ? 0 : 1]} lift={(1 - ease(f)) * 0.25} opacity={Math.min(1, f * 3)} />
        })}
        {trace(TRI3, q1).map((s, i) => <Seg key={`a${i}`} a={s.a} b={s.b} color="#fff6c8" r={0.012} />)}
        {trace(big, q2).map((s, i) => <Seg key={`b${i}`} a={s.a} b={s.b} color="#fff6c8" r={0.012} />)}
      </Place>}
      lesson={<LessonBlock no="3" title="周长比和面积比" concept="周长比等于相似比，面积比等于相似比的平方" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>相似比是 k：每条边都是原来的 k 倍，三条边加起来也是 k 倍，所以<b className="text-white">周长比等于相似比</b>。</p>
          <p className="mt-3">面积不一样：长和宽（底和高）都变成 k 倍，面积就变成 k × k = k² 倍。用小三角形去铺，相似比 2 要 4 块，相似比 3 要 9 块。</p>
          <p className="mt-3">所以<b className="text-white">面积比等于相似比的平方</b>。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">周长比等于相似比，面积比等于相似比的平方</p>
        <p className="mt-1 text-[14px] text-white/70">相似比 2：周长 2 倍，面积 4 倍；相似比 3：周长 3 倍，面积 9 倍。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center"><div className="text-[13px] text-white/60">相似比</div><div className="mt-1 text-[44px] leading-none font-bold tabular-nums">{k}</div></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="C 大 ÷ C 小" value={pDone ? r.pRatio.toFixed(0) : '—'} unit={pDone ? `周长比 · ${f2(r.p)} ÷ ${f2(r.p0)}` : '周长比'} />
            <ParamTile symbol="S 大 ÷ S 小" value={sDone ? `${r.tiles}` : '—'} unit={sDone ? `面积比 · ${f2(r.s)} ÷ ${f2(r.s0)} m²` : '面积比'} />
          </div>
          <table className="mt-4 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">相似比</th><th className="font-normal">周长比</th><th className="font-normal">面积比</th></tr></thead>
            <tbody>{K3.map(x => <tr key={x} className={did.includes(`p${x}`) || did.includes(`s${x}`) ? 'text-white' : 'text-white/30'}><td className="py-1">{x}</td><td className="text-center">{did.includes(`p${x}`) ? x : '—'}</td><td className="text-center">{did.includes(`s${x}`) ? x * x : '—'}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'per'} onClick={per.run} disabled={per.busy || tile.busy || pDone}>量周长</LabButton>
        <LabButton primary pulse={next === 'tile'} onClick={tile.run} disabled={!pDone || per.busy || tile.busy || sDone}>铺小三角形板</LabButton>
      </>}
      extras={<Control label="相似比"><Segmented label="相似比" pulse={next === 'k'} want={next === 'k' ? '3' : null} disabled={per.busy || tile.busy} value={k} onChange={pick} options={K3.map(x => ({ value: String(x) as K, label: `${x}` }))} /></Control>}
    />
  )
}
