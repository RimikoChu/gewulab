// 机械振动和机械波 · 第 6 课 波的衍射：外海的波垂直打在防波堤上，只有口门能进。开闸放波，看波进了港池以后怎么走：
// 口门比波长宽得多，波基本直着进来，堤后是一片静水；口门和波长差不多，波就绕到堤后面去了。
// 堤后的波场按惠更斯原理算（口门上每一小段都是新的波源），换条件时现算一次，之后每帧只做两次乘法。
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { MarkerBuoy } from './boats'
import { num, useRun, useSpace } from './gear'
import { COL, PATCH, WALL, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BREAK, GAPS, WATER, axisAmp, axisZ, bend, gapField, gapRatio, lambda, shadowAmp, type GapKey } from './physics'
import { WavePatch, makeGrid, type Grid } from './sea'
import { VOICE } from './voice'
import { Place } from './world'

const KEYS: GapKey[] = ['wide', 'narrow', 'long']
const pct = (k: GapKey) => `${Math.round(bend(k) * 100)}%`
const TASKS: Task[] = [
  { id: 'wide', text: '口门 16 m、波长 4 m：开闸放波', note: `波几乎直着进港，堤后的 B 点只有正后方 C 点的 ${pct('wide')}` },
  { id: 'narrow', text: '把口门收到 4 m，再放一次', note: `口门和波长一样宽：波成了一圈圈的圆弧，B 点是 C 点的 ${pct('narrow')}` },
  { id: 'long', text: '口门 8 m、波长 8 m，再放一次', note: `口门宽了一倍，波长也长了一倍：照样绕到堤后，B 点是 C 点的 ${pct('long')}` },
]
const GX = WALL.gx, ZI = WALL.inner
const B: V3 = [GX + BREAK.bx, 0, ZI + BREAK.bz], C: V3 = [GX, 0, ZI + axisZ()]
/** 开闸要多久（s）；波从口门传到 C 点、再稳定两个周期 */
const OPEN = 1.6
const steadyT = (k: GapKey) => OPEN + axisZ() / WATER.v + 2.2 / GAPS[k].f

/** 一种条件下整张网格的复振幅：外海和口门通道里是入射波，港池里是口门上各点子波的叠加，堤身底下是 0 */
function field(grid: Grid, key: GapKey) {
  const { d, f } = GAPS[key], lam = lambda(f), k = (2 * Math.PI) / lam, n = grid.n, re = new Float32Array(n), im = new Float32Array(n), r = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = grid.xs[i] - GX, z = grid.zs[i] - ZI
    r[i] = Math.hypot(x, z)
    if (z > 0) { const [a, b] = gapField(d, lam, x, z); re[i] = a; im[i] = b; r[i] = Math.max(0, r[i] - d / 2) }
    else if (z < -9 || Math.abs(x) < WALL.gap / 2) { re[i] = Math.cos(k * z); im[i] = Math.sin(k * z); r[i] = -1 }
    else r[i] = -2
  }
  return { re, im, r }
}

function Rig({ gap, run, onSteady }: { gap: GapKey; run: number; onSteady: () => void }) {
  const grid = useMemo(() => makeGrid(PATCH.gap), [])
  const F = useMemo(() => field(grid, gap), [grid, gap])
  const f = GAPS[gap].f, t = useRef(0), open = useRef(0), inAmp = useRef(0), sea = useRef(0)
  const b = useRef<THREE.Group>(null), c = useRef<THREE.Group>(null)
  const at = useMemo(() => [B, C].map(p => gapField(GAPS[gap].d, lambda(f), p[0] - GX, p[2] - ZI)), [gap, f])
  useRun(run, (tt, dt) => {
    t.current += dt
    open.current = run === 0 ? 0 : tt; inAmp.current = run === 0 ? Math.max(0, inAmp.current - dt * 0.9) : 1
    sea.current = Math.min(1, sea.current + dt * 0.8)           // 换了波长：外海的波重新涨起来
    const w = 2 * Math.PI * f * t.current, cs = Math.cos(w), sn = Math.sin(w), R = WATER.v * (open.current - OPEN)
    ;[b, c].forEach((g, i) => { const d = Math.hypot((i ? C : B)[0] - GX, (i ? C : B)[2] - ZI); g.current?.position.setY(inAmp.current * front(R - d + GAPS[gap].d / 2) * BREAK.A * (at[i][0] * cs + at[i][1] * sn)) })
  }, [steadyT(gap)], onSteady)
  return <>
    <WavePatch grid={grid} high={BREAK.A} fill={out => {
      const { re, im, r } = F, n = grid.n, w = 2 * Math.PI * f * t.current, cs = Math.cos(w) * BREAK.A, sn = Math.sin(w) * BREAK.A, R = WATER.v * (open.current - OPEN), a = inAmp.current, s = sea.current
      for (let i = 0; i < n; i++) out[i] = r[i] === -2 ? 0 : r[i] === -1 ? s * (re[i] * cs + im[i] * sn) : a * front(R - r[i]) * (re[i] * cs + im[i] * sn)
    }} />
    <MarkerBuoy ref={b} color={COL.red} position={B} size={2} />
    <MarkerBuoy ref={c} color={COL.yellow} position={C} size={2} />
  </>
}
/** 波前：还没传到的地方是 0，传到以后 3 m 之内涨满 */
const front = (d: number) => { const k = Math.min(1, Math.max(0, d / 3)); return k * k * (3 - 2 * k) }

export default function Lesson6() {
  const [gap, setGap] = useState<GapKey>('wide')
  const [run, setRun] = useState(0), n = useRef(0)
  const [steady, setSteady] = useState(false)
  const [rows, setRows] = useState<GapKey[]>([])
  const T = useTasks('gewu:wave:6', TASKS)
  const g = GAPS[gap], lam = lambda(g.f)
  const go = () => { if (run !== 0) return; setSteady(false); setRun(++n.current) }
  const shut = () => { setRun(0); setSteady(false) }
  const done = () => { setSteady(true); const next = rows.includes(gap) ? rows : [...rows, gap]; setRows(next); T.check(id => next.includes(id as GapKey)) }
  const resetAll = () => { setGap('wide'); shut(); setRows([]); T.reset() }
  useSpace(go)

  const task = T.current, want = (task?.id ?? null) as GapKey | null
  const { hint, next }: { hint: string; next: 'gap' | 'go' | 'shut' | null } = (() => {
    if (!task) return { hint: '缝、孔的宽度跟波长差不多，或者比波长更小时，才能看到明显的衍射。', next: null }
    if (gap !== want && run !== 0) return { hint: '先按“关闸”，让港池静下来', next: 'shut' }
    if (gap !== want) return { hint: `把条件换成“${GAPS[want!].name}”`, next: 'gap' }
    if (run === 0) return { hint: '按“开闸放波”：让外海的波从口门进来', next: 'go' }
    if (!steady) return { hint: '波正从口门往港池里传，看它往哪边走…', next: null }
    return { hint: '先按“关闸”，让港池静下来', next: 'shut' }
  })()
  const labels: Label[] = [
    { id: 'B', at: [B[0], 3.3, B[2]], ax: 0.5, className: `scene-tag ${steady ? 'key' : ''} -translate-y-full`, children: <><small>B · 堤后</small>{steady ? `约 ${num(shadowAmp(gap))} m` : '浮标'}</> },
    { id: 'C', at: [C[0], 3.3, C[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>C · 正后方</small>{steady ? `约 ${num(axisAmp(gap))} m` : '浮标'}</> },
    { id: 'gap', at: [GX, 3.2, ZI], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>口门</small>{run === 0 ? '关着' : `${g.d} m`}</> },
    { id: 'sea', at: [GX - 5, 0.6, WALL.z - 14], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>外海来波</small>λ = {num(lam, 0)} m</> },
  ]
  return (
    <LabShell title="机械振动和机械波" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="口门的闸门"
      stage={<Place at="l6" labels={labels} gate={run === 0 ? 0 : g.d}><Rig key={gap} gap={gap} run={run} onSteady={done} /></Place>}
      lesson={<LessonBlock no="6" title="波的衍射" concept="缝宽和波长差不多时衍射明显" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>波可以绕过障碍物继续传播，这种现象叫<b className="text-white">波的衍射</b>。衍射是波特有的现象，一切波都能发生衍射。</p>
          <p className="mt-3"><b className="text-white">发生明显衍射的条件</b>：缝、孔的宽度或障碍物的尺寸跟波长相差不多，或者比波长更小。</p>
          <p className="mt-3">口门比波长宽得多时，波几乎沿直线进来，堤后留下一片“影子”，这就是防波堤能挡浪的道理。口门和波长差不多时，口门就像一个新的波源，波向堤后各个方向散开。</p>
          <p className="mt-3 text-[13.5px] text-white/65">B 点在堤的“影子”里，C 点在口门正后方，两点离口门中心一样远。比的是 B 和 C 的振幅之比：窄口门放进来的波本来就少，不能只看 B 点自己有多高。读数是按惠更斯原理算出来的近似值。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种情况都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">缝宽和波长差不多，衍射才明显</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">口门是波长的 {gapRatio('wide')} 倍时，堤后 B 点的振幅只有正后方的 {pct('wide')}；口门和波长一样宽时（4 m 对 4 m、8 m 对 8 m），是 {pct('narrow')} 和 {pct('long')}。看的是口门宽和波长的比，不是口门本身有多宽。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/65">堤后 B 点的振幅是正后方 C 点的</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{steady ? pct(gap) : '—'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="d" value={String(g.d)} unit="m · 口门宽" />
            <ParamTile symbol="λ" value={num(lam, 0)} unit="m · 波长" />
            <ParamTile symbol="d/λ" value={num(gapRatio(gap), 0)} unit="倍" />
          </div>
          {rows.length > 0 && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
            <table className="mt-1 w-full text-[13px]">
              <thead><tr className="text-[11.5px] text-white/50"><th className="py-1 text-left font-normal">d / m</th><th className="text-right font-normal">λ / m</th><th className="text-right font-normal">B / m</th><th className="text-right font-normal">C / m</th><th className="text-right font-normal">B : C</th></tr></thead>
              <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{GAPS[k].d}</td><td className="text-right tabular-nums">{num(lambda(GAPS[k].f), 0)}</td><td className="text-right tabular-nums">{num(shadowAmp(k))}</td><td className="text-right tabular-nums">{num(axisAmp(k))}</td><td className="text-right font-semibold tabular-nums" style={{ color: bend(k) > 0.4 ? COL.ok : COL.warn }}>{pct(k)}</td></tr>)}</tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={run !== 0}>开闸放波</LabButton>
        <LabButton pulse={next === 'shut'} onClick={shut} disabled={run === 0}>关闸</LabButton>
      </>}
      extras={<Control label="口门和波长"><Segmented label="口门和波长" pulse={next === 'gap'} want={next === 'gap' ? want : null} value={gap} disabled={run !== 0} onChange={k => { setGap(k); setSteady(false) }} options={KEYS.map(k => ({ value: k, label: GAPS[k].name.replace('口门 ', '').replace('波长 ', 'λ ') }))} /></Control>}
    />
  )
}
