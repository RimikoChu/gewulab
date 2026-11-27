// 图形的变换 · 拓展课 团花和铺地：两个课本之外的小实验。
// 团花：西头剪纸桌上，红纸折成 4 层或 8 层（扇形）剪好，展开后数一数有几条对称轴、转多少度和自己重合。
// 铺地：院子东南的空地上，用正六边形、正五边形地砖围着一点拼（每块是上一块绕这一点转一个内角），看能不能拼满 360°。
import { useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Arc, COL, Fig, PLine, Place, Plane, TILE, ease, seg, tagStyle, toWorld, useRun } from './parts'
import { TESS, TUAN, deg, tess, tuan, type P } from './physics'
import * as THREE from 'three'
import { makeRedPaper } from './mats'
import { paperCut, polyFace } from './crafts'
import { ST } from './world'

type Opt = 'w4' | 'w8' | 'n6' | 'n5'
const OPTS: { value: Opt; label: string }[] = [{ value: 'w4', label: '团花 · 4 层' }, { value: 'w8', label: '团花 · 8 层' }, { value: 'n6', label: '正六边形' }, { value: 'n5', label: '正五边形' }]
const WEDGES: Record<'w4' | 'w8', number> = { w4: TUAN.w4.wedges, w8: TUAN.w8.wedges }
const SIDES: Record<'n6' | 'n5', number> = { n6: TESS.n6.n, n5: TESS.n5.n }
const TASKS: Task[] = [
  { id: 'w4', text: '折成 4 层剪的团花：展开，画对称轴', note: `${tuan(4).axes} 条对称轴，转 ${tuan(4).turn}° 和自己重合` },
  { id: 'w8', text: '折成 8 层剪的团花：有几条对称轴', note: `${tuan(8).axes} 条对称轴，转 ${tuan(8).turn}° 和自己重合` },
  { id: 'n6', text: '正六边形地砖：围着一点拼一圈', note: `3 块 × 120° = 360°，正好拼满` },
  { id: 'n5', text: '正五边形地砖：围着一点拼一圈', note: `3 块 × 108° = 324°，留下 ${tess(5).gap.toFixed(0)}° 的缝` },
]
const isTuan = (o: Opt): o is 'w4' | 'w8' => o === 'w4' || o === 'w8'

// ---------- 团花 ----------
const KT = 0.01, OT: [number, number, number] = [ST.tuan.x, ST.tuan.y, ST.tuan.z]
const WT = toWorld(OT, KT)
/** 一层扇形里剪下的花样：(r, t)，r 是到中心的距离（cm），t 是在扇形里转过的比例（0 到 1） */
const UNIT: [number, number][] = [[0, 0], [3, 0], [4, 0.45], [5, 0], [8, 0], [9.5, 0.28], [11.5, 0.15], [12, 0.5], [11.5, 0.85], [9.5, 0.72], [8, 1], [6.5, 1], [5.5, 0.55], [4.5, 1], [0, 1]]
const HOLE: [number, number][] = [[6.4, 0.5], [7.2, 0.25], [8, 0.5], [7.2, 0.75]]
const polar = (q: [number, number][], th: number): P[] => q.map(([r, t]) => [r * Math.cos(t * th), r * Math.sin(t * th)])
// ---------- 铺地 ----------
const KF = 0.3, OF: [number, number, number] = [ST.tess.x, 0.002, ST.tess.z]
const WF = toWorld(OF, KF)
/** 正 n 边形：一个顶点在原点，两条边沿 0° 和内角方向 */
function ngon(n: number): P[] { const out: P[] = []; let p: P = [0, 0], d = 0; for (let i = 0; i < n; i++) { out.push(p); p = [p[0] + Math.cos(d), p[1] + Math.sin(d)]; d += 2 * Math.PI / n } return out }

export default function LessonX() {
  const [opt, setOpt] = useState<Opt>('w4')
  const [opened, setOpened] = useState(false)
  const [axes, setAxes] = useState(false)
  const Tk = useTasks('gewu:transform:x', TASKS)
  const go = useRun(isTuan(opt) ? 2.6 : 3.2, () => { setOpened(true); if (!isTuan(opt)) Tk.check(id => id === opt) })
  const ax = useRun(1.6, () => { setAxes(true); Tk.check(id => id === opt) })
  const busy = go.busy || ax.busy
  const pick = (o: Opt) => { if (busy) return; setOpt(o); setOpened(false); setAxes(false); go.snap(0); ax.snap(0) }
  const resetAll = () => { pick('w4'); Tk.reset() }

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'opt' | 'go' | 'ax' | null } = (() => {
    if (!task) return { hint: '团花的每道折痕都是对称轴；拼地砖要看围着一点的角能不能凑满 360°。', next: null }
    if (go.busy) return { hint: isTuan(opt) ? '展开…' : '一块一块拼上去…', next: null }
    if (ax.busy) return { hint: '画对称轴…', next: null }
    if (opt !== task.id) return { hint: `换成“${OPTS.find(o => o.value === task.id)!.label}”`, next: 'opt' }
    if (isTuan(opt)) {
      if (!opened) return { hint: `红纸折成 ${WEDGES[opt]} 层剪好了，把它展开`, next: 'go' }
      return { hint: '画出对称轴：每一道折痕都是一条', next: 'ax' }
    }
    return { hint: `把${OPTS.find(o => o.value === opt)!.label}地砖围着一点拼，每一块都是上一块绕这一点转过去`, next: 'go' }
  })()

  const tu = isTuan(opt) ? tuan(WEDGES[opt]) : null, te = !isTuan(opt) ? tess(SIDES[opt]) : null
  const gk = opened ? 1 : go.k
  const labels: Label[] = isTuan(opt) ? [
    { id: 'ax', at: WT(0, 14.5, 0.004), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: tagStyle('axis', { opacity: axes || ax.k > 0.5 ? 1 : 0 }), children: `${tu!.axes} 条对称轴` },
    { id: 'tn', at: WT(0, -14.5, 0.004), ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: axes ? 1 : 0 }, children: `转 ${tu!.turn}° 和自己重合` },
    { id: 'n1', at: WT(-15, -10, 0), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: `红纸折成 ${WEDGES[opt]} 层` },
  ] : [
    { id: 'sum', at: WF(0.25, -1.2, 0.02), ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: opened ? 1 : 0, ...(te!.fit ? {} : { background: '#c0442f' }) }, children: te!.fit ? `${te!.count} × ${deg(te!.angle)} = 360°` : `${te!.count} × ${deg(te!.angle)} = ${deg(te!.sum)}，差 ${deg(te!.gap)}` },
    { id: 'n1', at: WF(-1.6, 1.6, 0), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '地砖边长 30 cm' },
  ]
  return (
    <LabShell title="图形的变换" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel={isTuan(opt) ? '团花' : '地砖'}
      stage={isTuan(opt)
        ? <Place at="tuan" labels={labels}><TuanScene wedges={WEDGES[opt]} k={gk} axes={axes ? 1 : ax.k} /></Place>
        : <Place at="tess" labels={labels}><TessScene n={SIDES[opt]} k={gk} /></Place>}
      lesson={<LessonBlock no="拓展" title="团花和铺地" concept="折痕是对称轴，围一点要凑满 360°" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p><b className="text-white">团花</b>：红纸绕中心折成 2n 层扇形，一起剪，展开后相邻两层互为轴对称，每道折痕都是对称轴：一共 n 条。它还是旋转对称的：转 360° ÷ n 就和自己重合。</p>
          <p className="mt-3"><b className="text-white">铺地</b>：同一种正多边形地砖要铺满地面，围着一点的几个内角加起来必须正好是 360°。正六边形一个内角 120°，3 块正好；正五边形一个内角 108°，3 块是 324°，4 块又超过 360°，所以铺不满。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">折痕都是对称轴；拼地砖，围着一点的角要凑满 360°</p>
        <p className="mt-1 text-[14px] text-white/70">折 4 层的团花 2 条对称轴，折 8 层的 4 条。正六边形 3 块拼满 360°；正五边形 3 块只有 324°，留下 36° 的缝。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          {tu ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">对称轴</div>
              <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{axes ? tu.axes : '—'}<span className="ml-1 text-[16px] font-medium text-white/55">条</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="层数" value={String(WEDGES[opt as 'w4'])} unit={`每层 ${tu.wedge}°`} />
              <ParamTile symbol="转角" value={axes ? `${tu.turn}°` : '—'} unit="和自己重合" />
            </div>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">围着一点的角</div>
              <div className="mt-1 text-[36px] leading-none font-bold tracking-tight tabular-nums">{opened ? `${deg(te!.sum)}` : '—'}</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="内角" value={deg(te!.angle)} unit="一块地砖" />
              <ParamTile symbol="块数" value={opened ? String(te!.count) : '—'} unit={opened ? (te!.fit ? '正好拼满' : `留缝 ${deg(te!.gap)}`) : '围着一点'} />
            </div>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'go'} onClick={go.run} disabled={busy || opened}>{isTuan(opt) ? '展开' : '围着一点拼'}</LabButton>
        {isTuan(opt) && <LabButton primary pulse={next === 'ax'} onClick={ax.run} disabled={busy || !opened || axes}>画对称轴</LabButton>}
      </>}
      extras={<Control label="小实验"><Segmented label="小实验" pulse={next === 'opt'} want={next === 'opt' ? task!.id as Opt : null} disabled={busy} value={opt} onChange={pick} options={OPTS} /></Control>}
    />
  )
}

/** 团花：折好的一叠扇形（每层错开一点，看得出层数，最上面一层铅笔描着花样）；展开时一层一层转出去，是剪好的镂空窗花；画对称轴时一道道紫色虚线从中心画出去 */
const BOXT: [number, number, number, number] = [-13, -13, 13, 13]
function TuanScene({ wedges, k, axes }: { wedges: number; k: number; axes: number }) {
  const th = 2 * Math.PI / wedges, n = wedges / 2
  const tx = useMemo(() => paperCut(`tuan${wedges}`, BOXT, polar(UNIT, th), [polar(HOLE, th)], 20 + wedges), [wedges, th])
  const red = makeRedPaper()
  const sector = useMemo(() => { const out: P[] = [[0, 0]]; for (let i = 0; i <= 16; i++) { const a = i / 16 * th; out.push([12.4 * Math.cos(a), 12.4 * Math.sin(a)]) } return out }, [th])
  const plane = <mesh><planeGeometry args={[0.26, 0.26]} /><meshStandardMaterial map={tx.cut} alphaTest={0.5} roughness={0.85} side={THREE.DoubleSide} /></mesh>
  return (
    <Plane o={OT}>
      {k <= 0 && Array.from({ length: wedges }, (_, i) => <group key={i} position={[0, 0, 0.0008 * i]} rotation-z={-(wedges - 1 - i) * 0.02}>
        <Fig pts={sector} k={KT} t={0.0008} color="#ffffff" kind="paper" map={i === wedges - 1 ? tx.pencil : red} uvBox={i === wedges - 1 ? BOXT : undefined} cell={0.12} />
      </group>)}
      {k > 0 && Array.from({ length: wedges }, (_, j) => {
        // 第 j 层从第 0 层的位置转出去；奇数层是翻过来的
        const f = j === 0 ? 1 : ease(seg(k, (j - 1) / (wedges - 1) * 0.7, (j - 1) / (wedges - 1) * 0.7 + 0.3))
        const z = 0.0009 * (k < 1 ? wedges - j : 0)
        return <group key={j} position={[0, 0, 0.0008 + z]} rotation-z={(j % 2 ? (j + 1) * th : j * th) - (1 - f) * j * th}>
          {j % 2 ? <group scale={[1, -1, 1]}>{plane}</group> : plane}
        </group>
      })}
      {axes > 0 && Array.from({ length: n }, (_, i) => { const a = i * th, s = seg(axes, i / n * 0.6, i / n * 0.6 + 0.4); if (s <= 0) return null; const r = 13.5 * s; return <PLine key={i} pts={[[-r * Math.cos(a), -r * Math.sin(a)], [r * Math.cos(a), r * Math.sin(a)]]} k={KT} z={0.004} color={COL.axis} w={3} dash={0.008} /> })}
    </Plane>
  )
}

/** 铺地：正多边形釉面砖围着一点拼。第一块蓝色，之后每块是上一块绕这一点转一个内角（橙色）；拼不满时留下的缝标红 */
function TessScene({ n, k }: { n: number; k: number }) {
  const t = tess(n), poly = useMemo(() => ngon(n), [n])
  const box = useMemo<[number, number, number, number]>(() => [Math.min(...poly.map(p => p[0])), Math.min(...poly.map(p => p[1])), Math.max(...poly.map(p => p[0])), Math.max(...poly.map(p => p[1]))], [poly])
  const a = t.angle
  return (
    <Plane o={OF}>
      {Array.from({ length: t.count }, (_, j) => {
        const f = j === 0 ? 1 : ease(seg(k, (j - 1) / t.count, (j - 1) / t.count + 0.4))
        if (j > 0 && f <= 0) return null
        return <group key={j} rotation-z={(j - 1 + f) * a * Math.PI / 180 * (j === 0 ? 0 : 1)} position={[0, 0, j === 0 ? 0 : 0.002 * (1 - f)]}>
          <Fig pts={poly} k={KF} t={0.022} color="#ffffff" map={polyFace(poly, TILE[j === 0 ? 'src' : 'img'].base, TILE[j === 0 ? 'src' : 'img'].ink, TILE[j === 0 ? 'src' : 'img'].light)} uvBox={box} side={TILE.body} />
        </group>
      })}
      {k >= 1 && Array.from({ length: t.count }, (_, j) => <Arc key={j} o={[0, 0]} r={0.34 + j * 0.05} a0={j * a + 4} a1={(j + 1) * a - 4} w={3} k={KF} z={0.03} />)}
      {k >= 1 && !t.fit && <>
        <group position={[0, 0, 0.022]}><Fig pts={[[0, 0], [1.05 * Math.cos(t.sum * Math.PI / 180), 1.05 * Math.sin(t.sum * Math.PI / 180)], [1.05, 0]]} k={KF} t={0.002} color="#e0473a" kind="paper" opacity={0.55} /></group>
        <Arc o={[0, 0]} r={0.55} a0={t.sum} a1={360} k={KF} z={0.03} color="#ff6b5a" w={4} />
        <PLine pts={[[0, 0], [1.1 * Math.cos(t.sum * Math.PI / 180), 1.1 * Math.sin(t.sum * Math.PI / 180)]]} k={KF} z={0.03} color="#ff6b5a" w={2.5} dashed={false} />
        <PLine pts={[[0, 0], [1.1, 0]]} k={KF} z={0.03} color="#ff6b5a" w={2.5} dashed={false} />
      </>}
    </Plane>
  )
}
