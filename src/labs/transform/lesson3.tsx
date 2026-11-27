// 图形的变换 · 第 3 课 补全木花窗：木工台上平放着一扇正在做的花窗，左半边的木条已经钉好，中间画了对称轴。
// 照着左半边补出右半边：每个拐点过点作对称轴的垂线，在另一侧截取一样长，得到对称点；四个点都找到了，连成木条；最后把左半边沿对称轴翻过来检验。
import { useMemo, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, Dot, GloveOn, PLine, Place, Plane, RightMark, ease, pt, seg, tagStyle, toWorld, useRun } from './parts'
import { GRID3, WIN3, cm, reflectU, win3, type P } from './physics'
import { makeBoardGrid, woodDark } from './mats'
import { ST } from './world'

const TASKS: Task[] = [
  { id: 'a', text: '作出 A 的对称点 A′', note: '过 A 作对称轴的垂线，另一侧截取一样长：A′ 到轴也是 20.0 cm' },
  { id: 'bcd', text: '作出 B′、C′、D′', note: '每个点都一样：垂直穿过对称轴，两边一样长' },
  { id: 'join', text: '把对称点连起来，补全另一半', note: '按左边的顺序连：上端、A′、B′、C′、D′、下端' },
  { id: 'check', text: '沿对称轴对折，检验是否重合', note: '左半边翻过来正好盖住右半边' },
]
const K = GRID3 / 100
const O: [number, number, number] = [ST.l3.x, ST.l3.y, ST.l3.z + WIN3.h / 2 * K]
const W = toWorld(O, K)
const PTS = win3()
const LEFT: P[] = [WIN3.top, ...WIN3.pts, WIN3.bottom]
const RIGHT: P[] = LEFT.map(p => reflectU(p, 0))

export default function Lesson3() {
  const [made, setMade] = useState(0)          // 已经作出几个对称点
  const [joined, setJoined] = useState(false)
  const [checked, setChecked] = useState(false)
  const Tk = useTasks('gewu:transform:3', TASKS)
  const make = useRun(2.2, () => { const n = made + 1; setMade(n); Tk.check(id => (id === 'a' && n >= 1) || (id === 'bcd' && n >= 4)) })
  const join = useRun(2.4, () => { setJoined(true); Tk.check(id => id === 'join') })
  const flip = useRun(2.6, () => { setChecked(true); Tk.check(id => id === 'check') })
  const busy = make.busy || join.busy || flip.busy
  const resetAll = () => { setMade(0); setJoined(false); setChecked(false); make.snap(0); join.snap(0); flip.snap(0); Tk.reset() }

  const task = Tk.current, cur = Math.min(made, 3)
  const { hint, next }: { hint: string; next: 'make' | 'join' | 'flip' | null } = (() => {
    if (!task) return { hint: '先找对称点，再连成图形：右半边补好了。', next: null }
    if (make.busy) return { hint: `过 ${pt('src', made)} 作垂线，另一侧截取一样长…`, next: null }
    if (join.busy) return { hint: '钉木条…', next: null }
    if (flip.busy) return { hint: '沿对称轴翻过来…', next: null }
    if (made < 4) return { hint: `作 ${pt('src', made)} 的对称点：过 ${pt('src', made)} 作对称轴的垂线，另一侧截取一样长`, next: 'make' }
    if (!joined) return { hint: '四个对称点都有了：按顺序连起来，钉上木条', next: 'join' }
    return { hint: '沿对称轴把左半边翻过来，看能不能和右半边重合', next: 'flip' }
  })()

  // 正在作的那个点：距离标签只给它
  const show = make.busy ? made : made > 0 ? made - 1 : -1
  const mk = make.busy ? make.k : 1
  const labels: Label[] = [
    ...PTS.map((x, i): Label => ({ id: `s${i}`, at: W(x.p[0] - 0.35, x.p[1], 0.03), ax: 1, className: 'scene-tag -translate-y-1/2', style: tagStyle('src'), children: pt('src', i) })),
    ...PTS.map((x, i): Label => ({ id: `i${i}`, at: W(x.q[0] + 0.35, x.q[1], 0.03), ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: tagStyle('img', { opacity: i < made ? 1 : 0 }), children: pt('img', i) })),
    ...(show >= 0 ? [
      { id: 'dl', at: W(PTS[show].p[0] / 2, PTS[show].p[1] + 0.25, 0.03), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: seg(mk, 0.2, 0.4), fontSize: 14 }, children: cm(PTS[show].dp) },
      { id: 'dr', at: W(PTS[show].q[0] / 2, PTS[show].q[1] + 0.25, 0.03), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: seg(mk, 0.75, 0.9), fontSize: 14 }, children: cm(PTS[show].dq) },
    ] as Label[] : []),
    { id: 'ax', at: W(0, WIN3.h + 0.15, 0.03), ax: 0.5, className: 'scene-tag -translate-y-full', style: tagStyle('axis'), children: '对称轴' },
    { id: 'ok', at: W(2.2, -0.35, 0.05), ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: checked ? 1 : 0 }, children: '重合' },
    { id: 'n1', at: W(-WIN3.w / 2 - 0.6, 1, 0), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '花窗内框 80 cm × 90 cm' },
    { id: 'n2', at: W(-4.6, 6.5, 0.02), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '左半边已钉好' },
  ]
  return (
    <LabShell title="图形的变换" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="作图"
      stage={<Place at="l3" labels={labels}><WindowScene made={made} makeK={make.busy ? make.k : 0} join={joined ? 1 : join.k} flip={checked ? 1 : flip.k} /></Place>}
      lesson={<LessonBlock no="3" title="补全木花窗" concept="先找对称点，再连成图形" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>画一个图形关于某条直线的轴对称图形，只要找到图形上几个关键的点（比如拐点）的对称点，再按原来的顺序连起来。</p>
          <p className="mt-3">找点 A 的对称点：过 A 作对称轴的<b className="text-white">垂线</b>，垂足是 O；在垂线上另一侧截取 OA′ = OA，A′ 就是 A 的对称点。</p>
          <p className="mt-3">画好以后可以沿对称轴对折检验：两边应当完全重合。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">先找对称点，再按顺序连起来，就画出了轴对称图形</p>
        <p className="mt-1 text-[14px] text-white/70">A、B、C、D 到对称轴是 20.0、30.0、10.0、30.0 cm，A′、B′、C′、D′ 在另一侧一样远；连成的右半边和左半边沿对称轴对折正好重合。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">已作出的对称点</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{made}<span className="ml-1 text-[18px] font-medium text-white/55">/ 4</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="一格" value="10.0" unit="cm · 铅笔格" />
            <ParamTile symbol="对折" value={checked ? '重合' : '—'} unit="左右两半" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">到对称轴的距离</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">点</th><th className="font-normal">到轴</th><th className="font-normal">对称点</th><th className="font-normal">到轴</th></tr></thead>
            <tbody>{PTS.map((x, i) => { const on = i < made; return <tr key={i} className={on ? 'text-white' : 'text-white/30'}><td className="py-1" style={{ color: COL.src }}>{pt('src', i)}</td><td className="text-center">{cm(x.dp)}</td><td className="text-center" style={{ color: on ? COL.img : undefined }}>{pt('img', i)}</td><td className="text-center">{on ? cm(x.dq) : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'make'} onClick={make.run} disabled={busy || made >= 4}>找对称点{made < 4 ? ` ${pt('src', cur)}` : ''}</LabButton>
        <LabButton pulse={next === 'join'} onClick={join.run} disabled={busy || made < 4 || joined}>连成图形</LabButton>
        <LabButton primary pulse={next === 'flip'} onClick={flip.run} disabled={busy || !joined || checked}>对折检验</LabButton>
      </>}
      extras={null}
    />
  )
}

/** 一根木条：从 a 到 b（格），宽、高 2.4 cm，顶面镶一道细彩条（原图蓝、像橙） */
function Strip({ a, b, who, grow = 1, ghost = 0 }: { a: P; b: P; who: 'src' | 'img'; grow?: number; ghost?: number }) {
  const wood = woodDark()
  if (grow <= 0) return null
  const e: P = [a[0] + (b[0] - a[0]) * grow, a[1] + (b[1] - a[1]) * grow]
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]) * K, ang = Math.atan2(e[1] - a[1], e[0] - a[0]), w = 0.024
  const op = ghost > 0 ? ghost : 1
  return <group position={[(a[0] + e[0]) / 2 * K, (a[1] + e[1]) / 2 * K, w / 2]} rotation-z={ang}>
    <mesh castShadow={ghost === 0} receiveShadow><boxGeometry args={[len + w, w, w]} /><meshStandardMaterial map={ghost ? null : wood} color={ghost ? COL.src : '#ffffff'} roughness={0.6} transparent={ghost > 0} opacity={op} depthWrite={ghost === 0} /></mesh>
    <mesh position={[0, 0, w / 2 + 0.0004]}><boxGeometry args={[len + w * 0.4, w * 0.28, 0.0008]} /><meshBasicMaterial color={COL[who]} toneMapped={false} transparent={ghost > 0} opacity={op} /></mesh>
  </group>
}

/** 木工台上的器材：铅笔格底板、花窗外框、左半边的木条、对称轴、作图的虚线和角尺、右半边的木条、翻折检验 */
function WindowScene({ made, makeK, join, flip }: { made: number; makeK: number; join: number; flip: number }) {
  const grid = useMemo(() => { const t = makeBoardGrid().clone(); t.needsUpdate = true; t.repeat.set(1.1, 1.2); t.offset.set(0.05, 0.05); return t }, [])
  const wood = woodDark()
  const fw = WIN3.w / 2 * K, fh = WIN3.h * K, bar = 0.05
  // 角尺：作哪个点就移到哪个点的垂足，长边沿着垂线朝右
  const cur = makeK > 0 ? made : -1
  const nSeg = RIGHT.length - 1, jk = join * nSeg
  return (
    <Plane o={O}>
      {/* 底板：一张松木板，画着 10 cm 一格的铅笔线 */}
      <mesh position={[0, fh / 2, -0.015]} receiveShadow castShadow><boxGeometry args={[1.1, 1.2, 0.03]} /><meshStandardMaterial map={grid} roughness={0.75} /></mesh>
      {/* 花窗外框：四根带倒角的深色木框，角上做出榫头的缝 */}
      {[[0, -bar / 2, 2 * fw + 2 * bar, bar], [0, fh + bar / 2, 2 * fw + 2 * bar, bar], [-fw - bar / 2, fh / 2, bar, fh], [fw + bar / 2, fh / 2, bar, fh]].map(([x, y, w, h], i) =>
        <mesh key={i} position={[x, y, 0.02]} castShadow receiveShadow><boxGeometry args={[w, h, 0.04]} /><meshStandardMaterial map={wood} roughness={0.55} /></mesh>)}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => <mesh key={`${sx}${sy}`} position={[sx * (fw + bar / 2), sy > 0 ? fh + 0.002 : -0.002, 0.0405]}><boxGeometry args={[bar, 0.002, 0.0008]} /><meshBasicMaterial color="#1a0f08" /></mesh>)}
      {/* 对称轴 */}
      <PLine pts={[[0, -0.6], [0, WIN3.h + 0.6]]} k={K} z={0.045} color={COL.axis} w={3} dash={0.03} />
      {/* 左半边：已经钉好的木条 */}
      {LEFT.slice(1).map((p, i) => <Strip key={i} a={LEFT[i]} b={p} who="src" />)}
      {PTS.map((x, i) => <Dot key={i} at={x.p} k={K} z={0.025} who="src" r={0.007} />)}
      {/* 作图：每个点一条垂线，先画到对称轴，再在另一侧截取一样长 */}
      {PTS.map((x, i) => {
        const k = i < made ? 1 : i === cur ? makeK : 0
        if (k <= 0) return null
        const k1 = seg(k, 0.05, 0.4), k2 = seg(k, 0.5, 0.88)
        const end: P = k2 > 0 ? [x.q[0] * ease(k2), x.p[1]] : [x.p[0] * (1 - ease(k1)), x.p[1]]
        return <group key={i}>
          <PLine pts={[x.p, k2 > 0 ? x.foot : end]} k={K} z={0.03} w={2} dash={0.012} />
          {k2 > 0 && <PLine pts={[x.foot, end]} k={K} z={0.03} w={2} dash={0.012} />}
          {k1 >= 1 && <RightMark foot={x.foot} d1={[-1, 0]} d2={[0, 1]} s={0.18} k={K} z={0.03} />}
          {k >= 0.9 && <Dot at={x.q} k={K} z={0.025} who="img" r={0.007} />}
        </group>
      })}
      {cur >= 0 && <group position={[0, PTS[cur].p[1] * K, 0.028]}>
        <TrySquare />
        <GloveOn x={0.36} y={-0.035} yaw={-0.35} lift={0.003} arm={0.06} scale={0.8} />
      </group>}
      {/* 右半边：按顺序一根根钉上 */}
      {RIGHT.slice(1).map((p, i) => <Strip key={i} a={RIGHT[i]} b={p} who="img" grow={Math.min(1, Math.max(0, jk - i))} />)}
      {/* 对折检验：左半边的影子绕对称轴翻过来，盖到右半边上 */}
      {flip > 0 && <group position={[0, 0, 0.026]} rotation-y={-Math.PI * ease(flip)}>
        <group position={[0, 0, -0.026]}>{LEFT.slice(1).map((p, i) => <Strip key={i} a={LEFT[i]} b={p} who="src" ghost={0.45} />)}</group>
      </group>}
    </Plane>
  )
}

/** 木工角尺：短的木尺座贴着对称轴，长的钢尺片沿垂线朝右；尺片上有刻度 */
function TrySquare() {
  const ticks = useMemo(() => Array.from({ length: 19 }, (_, i) => (i + 1) * 0.02), [])
  return <group>
    {/* 木尺座：沿对称轴（朝下伸出去） */}
    <mesh position={[-0.012, -0.11, 0.008]} castShadow><boxGeometry args={[0.024, 0.24, 0.016]} /><meshStandardMaterial map={woodDark()} color="#c08a5a" roughness={0.6} /></mesh>
    {[0.02, 0.12].map(y => <mesh key={y} position={[-0.012, -y, 0.0165]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.003, 0.003, 0.001, 10]} /><Metal kind="brass" /></mesh>)}
    {/* 钢尺片：沿垂线朝右 */}
    <mesh position={[0.2, 0.012, 0.002]} castShadow><boxGeometry args={[0.4, 0.024, 0.0016]} /><Metal kind="stainless" grain="brushed" /></mesh>
    {ticks.map((x, i) => <mesh key={i} position={[x, 0.012 + (i % 5 === 4 ? 0.004 : 0.007), 0.0029]}><boxGeometry args={[0.0012, i % 5 === 4 ? 0.016 : 0.009, 0.0002]} /><meshBasicMaterial color="#1d1d1d" /></mesh>)}
  </group>
}
