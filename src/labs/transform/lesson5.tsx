// 图形的变换 · 第 5 课 转半圈：彩绘瓷砖台上铺着白釉方砖，画着 5 cm 一格的铅笔线。台面上一颗黄铜钉是中心 O。
// 先把蓝色小旗绕 O 旋转 180°，连对应点：都经过 O，被 O 平分——这就是中心对称。再把平行四边形和正三角形花砖各绕自己的中心转半圈，看能不能和自己重合。
import { useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { BrassPin, COL, Dot, Fig, GloveOn, TILE, PLine, Place, Plane, ease, pt, seg, tagStyle, toWorld, useRun } from './parts'
import { FLAG, FLAG_ABC, GRID5, O5, SELF5, center, cm, half5, selfTurn5, type P, type Self5 } from './physics'
import { ST } from './world'
import { tileFace } from './crafts'

type Shape = 'flag' | Self5
const SHAPES: { value: Shape; label: string }[] = [{ value: 'flag', label: '小旗' }, { value: 'para', label: SELF5.para.name }, { value: 'tri', label: SELF5.tri.name }]
const TASKS: Task[] = [
  { id: 'rot', text: '把小旗绕 O 旋转 180°', note: '转半圈得到的橙色小旗，和蓝色小旗关于 O 中心对称' },
  { id: 'link', text: '连对应点：看它们经过哪里', note: 'AA′、BB′、CC′ 都经过 O，并且被 O 平分' },
  { id: 'para', text: '平行四边形花砖转半圈', note: '和原来重合：平行四边形是中心对称图形' },
  { id: 'tri', text: '正三角形花砖转半圈', note: '不重合：正三角形不是中心对称图形' },
]
const K = GRID5 / 100
const O: [number, number, number] = [ST.l5.x - O5[0] * K, ST.l5.y, ST.l5.z + O5[1] * K]
const W = toWorld(O, K)
const T = 0.009
const H5 = half5()
/** 两块花砖：挪到中心正好在 O 上 */
const SELF = (k: Self5) => { const pts = SELF5[k].pts, c = center(pts); return pts.map(([u, v]) => [u - c[0] + O5[0], v - c[1] + O5[1]] as P) }

export default function Lesson5() {
  const [shape, setShape] = useState<Shape>('flag')
  const [turned, setTurned] = useState(false)
  const [linked, setLinked] = useState(false)
  const Tk = useTasks('gewu:transform:5', TASKS)
  const turn = useRun(2.4, () => { setTurned(true); Tk.check(id => (id === 'rot' && shape === 'flag') || id === shape) })
  const link = useRun(2.0, () => { setLinked(true); Tk.check(id => id === 'link') })
  const busy = turn.busy || link.busy
  const pick = (s: Shape) => { if (busy) return; setShape(s); setTurned(false); setLinked(false); turn.snap(0); link.snap(0) }
  const resetAll = () => { pick('flag'); Tk.reset() }
  const same = shape === 'flag' ? null : selfTurn5(shape).same

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'shape' | 'turn' | 'link' | null } = (() => {
    if (!task) return { hint: '中心对称：对称点的连线都经过对称中心，并且被它平分。', next: null }
    if (turn.busy) return { hint: '绕 O 转半圈…', next: null }
    if (link.busy) return { hint: '连对应点…', next: null }
    const want: Shape = task.id === 'para' ? 'para' : task.id === 'tri' ? 'tri' : 'flag'
    if (shape !== want) return { hint: `换成${SHAPES.find(s => s.value === want)!.label}`, next: 'shape' }
    if (want === 'flag') {
      if (!turned) return { hint: '把蓝色小旗绕 O 旋转 180°', next: 'turn' }
      return { hint: '连对应点：A 连 A′，B 连 B′，C 连 C′，看它们经过哪里', next: 'link' }
    }
    return { hint: `把${SHAPES.find(s => s.value === want)!.label}花砖绕它的中心 O 转 180°，看能不能和自己重合`, next: 'turn' }
  })()

  const pts = useMemo(() => shape === 'flag' ? FLAG : SELF(shape), [shape])
  const lk = linked ? 1 : link.k, tk = turned ? 1 : turn.k
  const labels: Label[] = [
    { id: 'o', at: W(O5[0] + 0.35, O5[1] - 0.45, 0.02), ax: 0, className: 'scene-tag -translate-y-1/2', style: { background: '#1d2327', color: '#fff', boxShadow: 'none' }, children: 'O' },
    ...(shape === 'flag' ? [
      ...FLAG_ABC.map((p, i): Label => ({ id: `s${i}`, at: W(p[0] + (i === 1 ? 0.4 : -0.4), p[1] + (i === 0 ? 0.4 : 0), 0.02), ax: i === 1 ? 0 : 1, className: 'scene-tag -translate-y-1/2', style: tagStyle('src'), children: pt('src', i) })),
      ...H5.pairs.map((x, i): Label => ({ id: `i${i}`, at: W(x.q[0] + (i === 1 ? -0.4 : 0.4), x.q[1] + (i === 0 ? -0.4 : 0), 0.02), ax: i === 1 ? 1 : 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: tagStyle('img', { opacity: turned ? 1 : 0 }), children: pt('img', i) })),
      ...H5.pairs.slice(0, 1).flatMap((x, i): Label[] => [
        { id: `op${i}`, at: W((x.p[0] + O5[0]) / 2 - 0.3, (x.p[1] + O5[1]) / 2 - 0.3, 0.02), ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: seg(lk, 0.75, 0.9), fontSize: 14 }, children: <><small>OA</small>{cm(x.op)}</> },
        { id: `oq${i}`, at: W((x.q[0] + O5[0]) / 2 + 0.3, (x.q[1] + O5[1]) / 2 + 0.3, 0.02), ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: seg(lk, 0.75, 0.9), fontSize: 14 }, children: <><small>OA′</small>{cm(x.oq)}</> },
      ]),
    ] : [
      { id: 'res', at: W(O5[0], O5[1] - 3.6, 0.02), ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: turned ? 1 : 0, ...(same ? {} : { background: '#c0442f' }) }, children: same ? '和自己重合' : '不重合' },
    ]),
  ]
  return (
    <LabShell title="图形的变换" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="花砖"
      stage={<Place at="l5" labels={labels}><TileScene pts={pts} shape={shape} turn={tk} link={lk} moving={turn.busy} /></Place>}
      lesson={<LessonBlock no="5" title="转半圈" concept="对称点连线都经过对称中心" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>把一个图形绕着某一点旋转 180°，如果它能够与另一个图形重合，就说这两个图形关于这个点<b className="text-white">对称</b>或<b className="text-white">中心对称</b>，这个点叫做<b className="text-white">对称中心</b>。</p>
          <p className="mt-3">中心对称的两个图形，对称点所连线段都经过对称中心，而且被对称中心所<b className="text-white">平分</b>。</p>
          <p className="mt-3">一个图形绕着某一个点旋转 180°，如果旋转后的图形能够与原来的图形重合，这个图形叫做<b className="text-white">中心对称图形</b>。平行四边形是中心对称图形，正三角形不是。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">绕 O 转 180° 就是中心对称：对称点连线都经过 O，被 O 平分</p>
        <p className="mt-1 text-[14px] text-white/70">OA = OA′ = 21.2 cm，OB = OB′ = 10.0 cm，OC = OC′ = 11.2 cm。平行四边形转半圈和自己重合，是中心对称图形；正三角形转半圈不重合，不是。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{shape === 'flag' ? '对称点连线' : '转 180° 以后'}</div>
            <div className="mt-1 text-[30px] leading-tight font-bold tracking-tight">{shape === 'flag' ? (lk >= 1 ? '都经过 O' : '—') : turned ? (same ? '重合' : '不重合') : '—'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="旋转角" value={tk >= 1 ? '180°' : `${Math.round(180 * ease(tk))}°`} unit="绕 O 逆时针" />
            <ParamTile symbol="一格" value="5.0" unit="cm · 铅笔格" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">到中心 O 的距离</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">点</th><th className="font-normal">到 O</th><th className="font-normal">对称点</th><th className="font-normal">到 O</th></tr></thead>
            <tbody>{H5.pairs.map((x, i) => { const on = shape === 'flag' && lk >= 1; return <tr key={i} className={on ? 'text-white' : 'text-white/30'}><td className="py-1" style={{ color: COL.src }}>{pt('src', i)}</td><td className="text-center">{on ? cm(x.op) : '—'}</td><td className="text-center" style={{ color: on ? COL.img : undefined }}>{pt('img', i)}</td><td className="text-center">{on ? cm(x.oq) : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'turn'} onClick={turn.run} disabled={busy || turned}>转 180°</LabButton>
        <LabButton primary pulse={next === 'link'} onClick={link.run} disabled={busy || shape !== 'flag' || !turned || linked}>连对应点</LabButton>
      </>}
      extras={<Control label="花砖"><Segmented label="花砖" pulse={next === 'shape'} want={next === 'shape' ? (task?.id === 'para' ? 'para' : task?.id === 'tri' ? 'tri' : 'flag') : null} disabled={busy} value={shape} onChange={pick} options={SHAPES} /></Control>}
    />
  )
}

/** 瓷砖台上的器材：蓝色的原图、绕 O 转过去的橙色像、黄铜钉 O；小旗还有三条经过 O 的连线 */
function TileScene({ pts, shape, turn, link, moving }: { pts: P[]; shape: Shape; turn: number; link: number; moving: boolean }) {
  const a = 180 * ease(turn) * Math.PI / 180
  const far = useMemo(() => pts.reduce((b, p) => Math.hypot(p[0] - O5[0], p[1] - O5[1]) > Math.hypot(b[0] - O5[0], b[1] - O5[1]) ? p : b, pts[0]), [pts])
  return (
    <Plane o={O}>
      <Fig pts={pts} k={K} t={T} color="#ffffff" map={tileFace(TILE.src.base, TILE.src.ink, TILE.src.light)} cell={K * 2} side={TILE.body} />
      {/* 像：从原图上面出发，绕 O 转过去 */}
      {turn > 0 && <group position={[O5[0] * K, O5[1] * K, T + 0.001]} rotation-z={a}>
        <group position={[-O5[0] * K, -O5[1] * K, 0]}>
          <Fig pts={pts} k={K} t={T * (shape === 'flag' ? 1 : 0.6)} color="#ffffff" map={tileFace(TILE.img.base, TILE.img.ink, TILE.img.light)} cell={K * 2} side={TILE.body} opacity={shape === 'flag' ? 1 : 0.8} />
          {moving && <GloveOn x={(far[0] * 0.75 + O5[0] * 0.25) * K} y={(far[1] * 0.75 + O5[1] * 0.25) * K} yaw={Math.atan2(far[1] - O5[1], far[0] - O5[0]) - Math.PI / 2} lift={T} arm={0.05} scale={0.72} />}
        </group>
      </group>}
      {shape === 'flag' && <>
        {FLAG_ABC.map((p, i) => <Dot key={i} at={p} k={K} z={T} who="src" r={0.005} />)}
        {turn >= 1 && H5.pairs.map((x, i) => <Dot key={`q${i}`} at={x.q} k={K} z={2 * T} who="img" r={0.005} />)}
        {H5.pairs.map((x, i) => { const k = seg(link, i * 0.2, 0.5 + i * 0.2); if (k <= 0) return null; return <PLine key={i} pts={[x.p, [x.p[0] + (x.q[0] - x.p[0]) * k, x.p[1] + (x.q[1] - x.p[1]) * k]]} k={K} z={2 * T + 0.002} w={2.4} dash={0.008} /> })}
      </>}
      <group position={[O5[0] * K, O5[1] * K, (shape === 'flag' ? 2 : 1.6) * T + 0.002]}><BrassPin r={0.008} /></group>
    </Plane>
  )
}
