// 图形的变换 · 第 2 课 对折剪窗花：剪纸桌上一张 24 cm 见方的红纸。对折（右半边翻到左半边上），两层一起沿画好的半边花样剪下来，再展开。
// 展开后连对应点，量一量它们到折痕的距离：折痕就是对称轴，它垂直平分对应点的连线。两个花样：蝴蝶、花瓶。
import { useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, Dot, GloveOn, PLine, Place, Plane, RightMark, Scissors, ease, pt, seg, tagStyle, toWorld, useRun } from './parts'
import { CUT2, PAPER2, cm, cut2, reflectU, type Cut2, type P } from './physics'
import { makeRedPaper } from './mats'
import { paperCut } from './crafts'
import * as THREE from 'three'
import { ST } from './world'

const KEYS = Object.keys(CUT2) as Cut2[]
const TASKS: Task[] = [
  { id: 'fly', text: '对折红纸，剪出蝴蝶，展开', note: '两层一起剪的，展开后折痕两边完全一样' },
  { id: 'link', text: '连对应点：量一量到折痕的距离', note: 'A 和 A′ 到折痕一样远，连线和折痕成直角' },
  { id: 'vase', text: '换成花瓶，再剪一个', note: '花瓶沿折痕对折，两边也完全重合' },
]
const K = 0.01, O: [number, number, number] = [ST.l2.x, ST.l2.y, ST.l2.z]
const W = toWorld(O, K)
const T = 0.0008, H = PAPER2 / 2
type Phase = 'flat' | 'folded' | 'cut' | 'open'

export default function Lesson2() {
  const [pat, setPat] = useState<Cut2>('fly')
  const [phase, setPhase] = useState<Phase>('flat')
  const [linked, setLinked] = useState(false)
  const Tk = useTasks('gewu:transform:2', TASKS)
  const fold = useRun(1.8, () => setPhase('folded'))
  const cut = useRun(5.5, () => setPhase('cut'))
  const open = useRun(1.8, () => { setPhase('open'); Tk.check(id => id === pat) })
  const link = useRun(1.8, () => { setLinked(true); Tk.check(id => id === 'link') })
  const busy = fold.busy || cut.busy || open.busy || link.busy
  const r = useMemo(() => cut2(pat), [pat])
  const pick = (k: Cut2) => { if (busy) return; setPat(k); setPhase('flat'); setLinked(false); fold.snap(0); cut.snap(0); open.snap(0); link.snap(0) }
  const resetAll = () => { pick('fly'); Tk.reset() }
  const toggle = () => { if (phase === 'flat') fold.run(); else if (phase === 'cut') open.run() }

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'pat' | 'fold' | 'cut' | 'link' | null } = (() => {
    if (!task) return { hint: '折痕就是对称轴：它垂直平分每一对对应点的连线。', next: null }
    if (busy) return { hint: fold.busy ? '对折…' : cut.busy ? '两层一起剪…' : open.busy ? '展开…' : '连对应点…', next: null }
    const want: Cut2 = task.id === 'vase' ? 'vase' : 'fly'
    if (task.id === 'link') {
      if (phase !== 'open') return { hint: '把纸展开', next: 'fold' }
      return { hint: '连对应点：A 连 A′，B 连 B′，C 连 C′，量到折痕的距离', next: 'link' }
    }
    if (pat !== want) return { hint: `换成“${CUT2[want].name}”`, next: 'pat' }
    if (phase === 'flat') return { hint: '对折：把红纸的右半边往背面折，压在左半边下面，边对齐', next: 'fold' }
    if (phase === 'folded') return { hint: '两层纸叠在一起，沿画好的半边花样剪下来', next: 'cut' }
    if (phase === 'cut') return { hint: '把纸展开，看看折痕两边', next: 'fold' }
    return { hint: '把纸展开，看看折痕两边', next: null }
  })()

  // 右半边翻过去的角度：对折时 0 → π，展开时 π → 0
  // 对折进度：0 平铺，1 折好（右半边压到左半边下面）。对折、展开时纸被拿起来一点
  const fk = phase === 'flat' ? ease(fold.k) : phase === 'folded' || (phase === 'cut' && !open.busy) ? 1 : phase === 'cut' ? 1 - ease(open.k) : 0
  const bend = phase === 'flat' && fold.busy ? Math.sin(Math.PI * fold.k) : 0
  const opened = phase === 'open', lk = linked ? 1 : link.k
  const labels: Label[] = [
    ...r.pairs.map((x, i): Label => ({ id: `s${i}`, at: W(x.p[0] - 0.9, x.p[1], 0.002), ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: tagStyle('src', { opacity: opened ? 1 : 0 }), children: pt('src', i) })),
    ...r.pairs.map((x, i): Label => ({ id: `i${i}`, at: W(x.q[0] + 0.9, x.q[1], 0.004), ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: tagStyle('img', { opacity: opened ? 1 : 0 }), children: pt('img', i) })),
    ...r.pairs.map((x, i): Label => ({ id: `d${i}`, at: W(x.p[0] / 2, x.p[1] + 0.9, 0.004), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: seg(lk, 0.5 + i * 0.15, 0.65 + i * 0.15), fontSize: 14 }, children: cm(x.dp) })),
    ...r.pairs.map((x, i): Label => ({ id: `e${i}`, at: W(x.q[0] / 2, x.q[1] + 0.9, 0.004), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: seg(lk, 0.5 + i * 0.15, 0.65 + i * 0.15), fontSize: 14 }, children: cm(x.dq) })),
    { id: 'ax', at: W(0, H + 0.6, 0.004), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: tagStyle('axis', { opacity: opened ? 1 : 0 }), children: '折痕（对称轴）' },
    { id: 'n1', at: W(-H + 1, -H - 1, 0), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '红纸 24 cm 见方' },
    { id: 'n2', at: W(H + 9, -H + 4, 0.01), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '剪刀' },
  ]
  return (
    <LabShell title="图形的变换" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="剪纸"
      stage={<Place at="l2" labels={labels}><PaperScene pat={pat} fk={fk} bend={bend} phase={phase} cutK={cut.k} cutting={cut.busy} link={lk} /></Place>}
      lesson={<LessonBlock no="2" title="对折剪窗花" concept="对称轴垂直平分对应点连线" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>如果一个平面图形沿一条直线折叠，直线两旁的部分能够互相重合，这个图形就叫做<b className="text-white">轴对称图形</b>，这条直线就是它的<b className="text-white">对称轴</b>。折叠后重合的点是<b className="text-white">对应点</b>，叫做对称点。</p>
          <p className="mt-3">对折以后两层纸一起剪，剪下的两半本来就是重合的，所以展开后是轴对称图形，折痕就是对称轴。</p>
          <p className="mt-3">对称轴经过对称点所连线段的中点，并且垂直于这条线段：对称轴<b className="text-white">垂直平分</b>对应点的连线。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">折痕就是对称轴，它垂直平分每一对对应点的连线</p>
        <p className="mt-1 text-[14px] text-white/70">蝴蝶的 A、B、C 到折痕是 10.0、7.0、5.6 cm，A′、B′、C′ 也是；三条连线都和折痕成 90°。两层纸一起剪，展开后两边沿折痕对折能完全重合。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">连线和折痕的夹角</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{lk >= 1 ? `${Math.round(r.pairs[0].angle)}°` : '—'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="花样" value={CUT2[pat].name} unit="半边画在纸上" />
            <ParamTile symbol="纸" value={phase === 'flat' ? '一层' : phase === 'open' ? '展开' : '两层'} unit="对折后两层一起剪" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">到折痕的距离</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">点</th><th className="font-normal">到折痕</th><th className="font-normal">对应点</th><th className="font-normal">到折痕</th></tr></thead>
            <tbody>{r.pairs.map((x, i) => { const on = lk >= 1; return <tr key={i} className={on ? 'text-white' : 'text-white/30'}><td className="py-1" style={{ color: on ? COL.src : undefined }}>{pt('src', i)}</td><td className="text-center">{on ? cm(x.dp) : '—'}</td><td className="text-center" style={{ color: on ? COL.img : undefined }}>{pt('img', i)}</td><td className="text-center">{on ? cm(x.dq) : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'fold'} onClick={toggle} disabled={busy || (phase !== 'flat' && phase !== 'cut')}>{phase === 'cut' || phase === 'open' ? '展开' : '对折'}</LabButton>
        <LabButton pulse={next === 'cut'} onClick={cut.run} disabled={busy || phase !== 'folded'}>沿线剪</LabButton>
        <LabButton primary pulse={next === 'link'} onClick={link.run} disabled={busy || phase !== 'open' || linked}>连对应点</LabButton>
      </>}
      extras={<Control label="花样"><Segmented label="花样" pulse={next === 'pat'} want={next === 'pat' ? (task?.id === 'vase' ? 'vase' : 'fly') : null} disabled={busy} value={pat} onChange={pick} options={KEYS.map(k => ({ value: k, label: CUT2[k].name }))} /></Control>}
    />
  )
}

/** 剪纸桌上的器材：红纸（左半边铅笔描好半边花样；对折时右半边折到左半边下面，纸稍微弯一点）、剪刀和按纸的手套、剪好展开的镂空窗花、对称轴和对应点连线 */
function PaperScene({ pat, fk, bend, phase, cutK, cutting, link }: { pat: Cut2; fk: number; bend: number; phase: Phase; cutK: number; cutting: boolean; link: number }) {
  const red = makeRedPaper(), d = CUT2[pat], r = useMemo(() => cut2(pat), [pat])
  const tx = useMemo(() => paperCut(pat, [-H, -H, 0, H], d.half, d.holes, pat === 'fly' ? 5 : 9, p => p[0] < -0.6), [pat, d])
  const halfL = d.half
  const done = phase === 'cut' || phase === 'open'
  const showDesign = done || (cutting && cutK >= 0.88)
  const scrap = cutting ? seg(cutK, 0.88, 1) : 0
  // 剪刀沿着半边花样走：按弧长取位置和方向
  const path = useMemo(() => { const L = [0]; for (let i = 1; i < halfL.length; i++) L.push(L[i - 1] + Math.hypot(halfL[i][0] - halfL[i - 1][0], halfL[i][1] - halfL[i - 1][1])); return L }, [halfL])
  const at = (k: number) => {
    const s = k * path[path.length - 1]; let i = 1; while (i < path.length - 1 && path[i] < s) i++
    const a = halfL[i - 1], b = halfL[i], f = (s - path[i - 1]) / (path[i] - path[i - 1] || 1)
    return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] as P, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), i }
  }
  const ck = seg(cutK, 0, 0.86), sc = at(ck)
  const cutLine: P[] = cutting ? [...halfL.slice(0, sc.i), sc.p] : []
  const lift = 0.07 * Math.sin(Math.PI * fk)          // 对折、展开的途中把纸拿起来
  const W2 = H * K                                     // 半张纸宽 12 cm
  /** 半张没剪的纸：一块薄板，顶面贴 map；u 从 u0 到 u0 + w（cm） */
  const sheet = (u0: number, w: number, map: THREE.Texture, opacity = 1) => <mesh key={`sheet${u0}${w}${opacity < 1 ? 'f' : ''}`} position={[(u0 + w / 2) * K, 0, T / 2]} castShadow={opacity === 1} receiveShadow>
    <boxGeometry args={[w * K, 2 * W2, T]} />
    <meshStandardMaterial map={map} color="#ffffff" roughness={0.85} transparent={opacity < 1} opacity={opacity} />
  </mesh>
  /** 剪好的半边窗花：镂空的地方透明 */
  const cutHalf = <mesh key="cut" position={[-W2 / 2, 0, T]} castShadow receiveShadow><planeGeometry args={[W2, 2 * W2]} /><meshStandardMaterial map={tx.cut} alphaTest={0.5} transparent={false} opacity={1} roughness={0.85} side={THREE.DoubleSide} /></mesh>
  const redHalf = useMemo(() => { const t = red.clone(); t.needsUpdate = true; t.repeat.set(0.5, 1); return t }, [red])
  return (
    <Plane o={O}>
      <group position={[0, 0, lift]}>
        {/* 左半边：铅笔描好的半边花样；对折时右半边从下面折过来，它被托高一层 */}
        <group position={[0, 0, T * fk]}>
          {showDesign ? cutHalf : sheet(-H, H, tx.pencil)}
          {cutting && scrap < 1 && <group position={[0, 0, 0.0002 + 0.004 * scrap]}>{sheet(-H, H, tx.pencil, 1 - scrap)}</group>}
        </group>
        {/* 右半边：绕折痕往下折到左半边下面；没剪的时候分两段，折的途中外段多弯一点 */}
        <group position={[0, 0, T / 2]} rotation-y={Math.PI * fk}>
          <group position={[0, 0, -T / 2]}>
            {showDesign
              ? <group scale={[-1, 1, 1]}>{cutHalf}</group>
              : <>
                {sheet(0, H / 2, redHalf)}
                <group position={[H / 2 * K, 0, 0]} rotation-y={0.55 * bend}>{sheet(0, H / 2, redHalf)}</group>
              </>}
            {cutting && scrap < 1 && <group position={[0, 0, -0.0002 - 0.004 * scrap]}>{sheet(0, H, redHalf, 1 - scrap)}</group>}
          </group>
        </group>
      </group>
      {cutting && cutLine.length > 1 && <PLine pts={cutLine} k={K} z={2 * T + 0.0006} color="#1a0d08" w={2.4} dashed={false} />}
      {/* 剪刀：不剪的时候放在纸的右下方；剪的时候刀尖顺着花样往前走，一张一合 */}
      {cutting && cutK < 0.9
        ? <group position={[sc.p[0] * K, sc.p[1] * K, 2 * T + 0.002]} rotation-z={sc.ang}>
          <group position={[-0.07, 0, 0]}><Scissors open={0.12 + 0.18 * Math.abs(Math.sin(cutK * 60))} /></group>
        </group>
        : <group position={[(H + 5) * K, (-H + 1) * K, 0]} rotation-z={0.35}><Scissors open={0.08} /></group>}
      {/* 剪的时候另一只手按住纸角 */}
      {cutting && <GloveOn x={-H * K + 0.012} y={-H * K + 0.016} yaw={-0.75} lift={2 * T} arm={0.05} scale={0.72} />}
      {/* 展开以后：折痕（对称轴）、对应点、连线、直角记号 */}
      {phase === 'open' && <>
        <PLine pts={[[0, -H], [0, H]]} k={K} z={T + 0.0003} color="#5a0a0a" w={1.2} dashed={false} opacity={0.5} />
        <PLine pts={[[0, -H - 1], [0, H + 1]]} k={K} z={0.002} color={COL.axis} w={3} dash={0.008} />
        {r.pairs.map((x, i) => <group key={i}>
          <Dot at={x.p} k={K} z={T} who="src" r={0.0035} />
          <Dot at={x.q} k={K} z={T} who="img" r={0.0035} />
          {link > 0 && <PLine pts={[x.p, [x.p[0] + (x.q[0] - x.p[0]) * seg(link, i * 0.15, 0.5 + i * 0.15), x.p[1]]]} k={K} z={0.002} w={2.2} dash={0.005} />}
          {link >= 0.5 + i * 0.15 && <RightMark foot={[0, x.p[1]]} d1={[1, 0]} d2={[0, 1]} s={0.8} k={K} z={0.002} />}
        </group>)}
      </>}
    </Plane>
  )
}
