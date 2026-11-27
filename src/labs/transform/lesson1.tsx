// 图形的变换 · 第 1 课 地砖上的平移：院子里铺着 30 cm 的青砖，地上嵌着一块蓝色的小旗花砖。照着它再放一块橙色的，沿砖缝推过去，
// 看它怎么动；再把对应点连起来，量一量。三种平移：右 5 格、上 3 格、右 4 上 3。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Dot, Fig, GloveOn, TILE, PLine, Place, Plane, ease, pt, seg, tagStyle, toWorld, useRun } from './parts'
import { FLAG, FLAG_ABC, TILE1, VEC1, cm, shift1, type P, type Vec1 } from './physics'
import { ST } from './world'
import { tileFace } from './crafts'

const KEYS = Object.keys(VEC1) as Vec1[]
const TASKS: Task[] = [
  { id: 'r5', text: '向右平移 5 格，连对应点', note: 'AA′、BB′、CC′ 都是 150.0 cm，方向相同' },
  { id: 'u3', text: '向上平移 3 格，再连一次', note: '换了方向和距离，三条连线还是一样长、互相平行' },
  { id: 'd43', text: '斜着平移：右 4 格、上 3 格', note: '斜着推也一样：对应点连线平行且相等' },
]
const K = TILE1 / 100, O: [number, number, number] = [ST.l1.x, 0.002, ST.l1.z]
const W = toWorld(O, K)
const T = 0.022   // 花砖厚 2.2 cm

export default function Lesson1() {
  const [vec, setVec] = useState<Vec1>('r5')
  const [rows, setRows] = useState<Vec1[]>([])
  const Tk = useTasks('gewu:transform:1', TASKS)
  const move = useRun(2.6), link = useRun(1.6)
  const r = shift1(vec), moved = move.k >= 1, linked = link.k >= 1, recorded = rows.includes(vec)
  const pick = (k: Vec1) => { if (move.busy || link.busy) return; setVec(k); move.snap(0); link.snap(0) }
  const record = () => { if (!linked || recorded) return; const n = [...rows, vec]; setRows(n); Tk.check(id => n.includes(id as Vec1)) }
  const resetAll = () => { setVec('r5'); setRows([]); move.snap(0); link.snap(0); Tk.reset() }

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'vec' | 'move' | 'link' | 'rec' | null } = (() => {
    if (!task) return { hint: '三次平移都量完了：对应点连线平行且相等。', next: null }
    if (vec !== task.id) return { hint: `换成“${VEC1[task.id as Vec1].name}”`, next: 'vec' }
    if (move.busy) return { hint: '推过去…', next: null }
    if (!moved) return { hint: `把橙色花砖沿砖缝推过去：${VEC1[vec].name}`, next: 'move' }
    if (link.busy) return { hint: '连对应点…', next: null }
    if (!linked) return { hint: '连对应点：A 连 A′，B 连 B′，C 连 C′', next: 'link' }
    return { hint: `三条连线都是 ${cm(r.len)}，记下来`, next: 'rec' }
  })()

  const e = ease(move.k), off: P = [r.v[0] * e, r.v[1] * e]
  const lk = link.k
  const labels: Label[] = [
    ...FLAG_ABC.map((p, i): Label => ({ id: `s${i}`, at: W(p[0] + (i === 1 ? 0.25 : -0.25), p[1] + (i === 0 ? 0.3 : 0), 0.03), ax: i === 1 ? 0 : 1, className: 'scene-tag -translate-y-1/2', style: tagStyle('src'), children: pt('src', i) })),
    ...r.pairs.map((x, i): Label => ({ id: `i${i}`, at: W(x.q[0] + (i === 1 ? 0.25 : -0.25), x.q[1] + (i === 0 ? 0.3 : 0), 0.05), ax: i === 1 ? 0 : 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: tagStyle('img', { opacity: moved ? 1 : 0 }), children: pt('img', i) })),
    ...r.pairs.map((x, i): Label => ({ id: `d${i}`, at: W((x.p[0] + x.q[0]) / 2 + (r.v[1] ? 0.35 : 0), (x.p[1] + x.q[1]) / 2 + (r.v[1] ? 0 : 0.3), 0.05), ax: r.v[1] ? 0 : 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: seg(lk, 0.6 + i * 0.12, 0.75 + i * 0.12) }, children: <><small>{pt('src', i)}{pt('img', i)}</small>{cm(x.len)}</> })),
    { id: 'n1', at: W(0.5, -0.5, 0.03), ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '原图（蓝）' },
    { id: 'n2', at: W(r.v[0] + 0.5, r.v[1] - 0.5, 0.05), ax: 0.5, name: true, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: moved ? 1 : 0 }, children: '像（橙）' },
    { id: 'n3', at: W(-1.5, 2.5, 0), ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '一块青砖 30 cm' },
  ]
  return (
    <LabShell title="图形的变换" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="花砖"
      stage={<Place at="l1" labels={labels}><FloorScene off={off} moving={move.busy} v={r.v} pairs={r.pairs} link={lk} /></Place>}
      lesson={<LessonBlock no="1" title="地砖上的平移" concept="对应点连线平行且相等" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>在平面内，把一个图形整体沿某一直线方向移动一定的距离，这样的图形运动叫做<b className="text-white">平移</b>。平移不改变图形的形状和大小。</p>
          <p className="mt-3">平移由<b className="text-white">方向</b>和<b className="text-white">距离</b>决定。原来的点和移动后的点是一对<b className="text-white">对应点</b>。</p>
          <p className="mt-3">新图形和原图形的对应点所连的线段<b className="text-white">平行（或在同一条直线上）且相等</b>，都等于平移的距离。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">平移由方向和距离决定：对应点连线平行且相等</p>
        <p className="mt-1 text-[14px] text-white/70">右 5 格是 150.0 cm，上 3 格是 90.0 cm，右 4 上 3 也是 150.0 cm。每一次，三条连线都一样长、方向一样；花砖的形状和大小没有变。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">AA′ = BB′ = CC′</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{linked ? cm(r.len).replace(' cm', '') : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">cm</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="方向" value={moved ? (r.v[0] && r.v[1] ? '右上' : r.v[0] ? '向右' : '向上') : '—'} unit="平移的方向" />
            <ParamTile symbol="格数" value={moved ? VEC1[vec].name : '—'} unit="一格 30 cm" />
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5 text-[14px] leading-relaxed">
            <div className="text-[12.5px] text-white/55">三条连线</div>
            <div className="mt-0.5 font-medium">{linked ? '一样长，互相平行' : '—'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">平移</th><th className="font-normal">AA′</th><th className="font-normal">BB′</th><th className="font-normal">CC′</th></tr></thead>
            <tbody>{KEYS.map(k => { const x = shift1(k), on = rows.includes(k); return <tr key={k} className={on ? 'text-white' : 'text-white/30'}><td className="py-1">{VEC1[k].name}</td>{x.pairs.map((p, i) => <td key={i} className="text-center">{on ? p.len.toFixed(1) : '—'}</td>)}</tr> })}</tbody>
          </table>
          <p className="mt-1 text-[12px] text-white/45">单位：cm</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'move'} onClick={move.run} disabled={move.busy || moved}>平移</LabButton>
        <LabButton pulse={next === 'link'} onClick={link.run} disabled={!moved || link.busy || linked}>连对应点</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!linked || recorded}>记录数据</LabButton>
      </>}
      extras={<Control label="平移"><Segmented label="平移" pulse={next === 'vec'} want={next === 'vec' ? task!.id as Vec1 : null} disabled={move.busy || link.busy} value={vec} onChange={pick} options={KEYS.map(k => ({ value: k, label: VEC1[k].name }))} /></Control>}
    />
  )
}

/** 地上的器材：蓝色原图嵌在砖上，橙色的像压在上面滑过去；手套推着它走；对应点的白虚线一条条画出来，箭头指向像 */
function FloorScene({ off, moving, v, pairs, link }: { off: P; moving: boolean; v: P; pairs: { p: P; q: P }[]; link: number }) {
  const ang = Math.atan2(v[1], v[0]), len = Math.hypot(v[0], v[1])
  return (
    <Plane o={O}>
      {/* 原图：嵌在砖面上的蓝色釉面砖 */}
      <Fig pts={FLAG} k={K} t={T * 0.6} color="#ffffff" map={tileFace(TILE.src.base, TILE.src.ink, TILE.src.light)} cell={K} side={TILE.body} />
      {FLAG_ABC.map((p, i) => <Dot key={i} at={p} k={K} z={T * 0.6} who="src" r={0.02} />)}
      {/* 像：橙色的花砖，从原图上面滑过去 */}
      {(moving || off[0] !== 0 || off[1] !== 0) && <group position={[off[0] * K, off[1] * K, T * 0.6 + 0.001]}>
        <Fig pts={FLAG} k={K} t={T} color="#ffffff" map={tileFace(TILE.img.base, TILE.img.ink, TILE.img.light)} cell={K} side={TILE.body} />
        {FLAG_ABC.map((p, i) => <Dot key={i} at={p} k={K} z={T} who="img" r={0.02} />)}
        {moving && <GloveOn x={0.5 * K - Math.cos(ang) * 0.05} y={1.6 * K - Math.sin(ang) * 0.05} yaw={ang - Math.PI / 2} lift={T} arm={0.12} />}
      </group>}
      {/* 对应点连线：一条条画出来，末端一个小箭头 */}
      {pairs.map((x, i) => {
        const k = seg(link, i * 0.2, 0.5 + i * 0.2); if (k <= 0) return null
        const end: P = [x.p[0] + (x.q[0] - x.p[0]) * k, x.p[1] + (x.q[1] - x.p[1]) * k]
        const a = 0.28, c = Math.cos(ang), s = Math.sin(ang)
        return <group key={i}>
          <PLine pts={[x.p, end]} k={K} z={T * 2} w={2.6} dash={0.06} />
          {k >= 1 && len > 0 && <PLine pts={[[end[0] - a * (c - s * 0.6), end[1] - a * (s + c * 0.6)], end, [end[0] - a * (c + s * 0.6), end[1] - a * (s - c * 0.6)]]} k={K} z={T * 2} w={2.6} dashed={false} />}
        </group>
      })}
    </Plane>
  )
}
