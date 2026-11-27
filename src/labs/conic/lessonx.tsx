// 圆锥曲线 · 拓展课：三个小专题。回音壁（椭圆的光学性质）、双曲线镜（双曲线的光学性质）、冷却塔（双曲线转出来的曲面上全是直线）。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import At, { Local, toWorld, type Frame } from './at'
import { fuse, strut } from './geo'
import { COL, Dot, FrontCtx, Path, Seg, Tip, pathLen, pt, upto } from './graph'
import { useRun } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { MIRROR_U, TOWER, WALL, WALL_T, ellipseBounce, ellipsePoint, fmt, hyperBounce, hyperPoint, towerLine, towerR, type P2 } from './physics'
import { AX4, F, P, SPOT } from './world'

type Sub = 'echo' | 'mirror' | 'tower'
const SUBS: Record<Sub, { name: string; title: string; button: string; say: string }> = {
  echo: { name: '回音壁', title: '从椭圆的一个焦点出发，反射后都到另一个焦点', button: '说一句话', say: '这圈矮墙是一个椭圆，长半轴 5 m、短半轴 4 m，两个焦点相距 6 m，地上各嵌着一块铜牌。站在一个焦点上轻声说话，声音碰到墙反射以后都经过另一个焦点；每一路的路程都是 2a = 10 m，所以同时到达，站在那里听得特别清楚。光线也一样：从椭圆的一个焦点发出的光，经椭圆反射后都经过另一个焦点。' },
  mirror: { name: '双曲线镜', title: '从一个焦点发出的光，反射后好像是从另一个焦点发出的', button: '打开光源', say: '把双曲线 x²/9 − y²/16 = 1 的右支当作一面镜子，光源放在右焦点 F₂(5, 0)。光线经双曲线反射后向外散开，把每条反射光线反向延长，都经过左焦点 F₁(−5, 0)：看上去光像是从 F₁ 发出来的。' },
  tower: { name: '冷却塔', title: '双曲线绕轴转一圈，转出来的曲面上全是直线', button: '画出直线', say: '发电厂的冷却塔，侧面轮廓是双曲线，绕竖直的轴转一圈就是塔面（单叶双曲面）。这座塔最细处（喉部）半径 24 m，离地 80 m。这种曲面上的每一点都有两条直线经过，整个塔面可以用两族斜着的直钢筋编出来，又省料又结实。' },
}
const ORDER: Sub[] = ['echo', 'mirror', 'tower']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))
const H = { a: 3, b: 4, c: 5 }
const FT: Frame = { origin: P.tower, az: SPOT.tower.view[0] }
const NL = 30

function TowerLines({ t }: { t: number }) {
  const geo = useMemo(() => {
    const list: THREE.BufferGeometry[] = []
    for (let i = 0; i < NL; i++) for (const d of [1, -1] as const) {
      const a = towerLine(i / NL * Math.PI * 2, d, TOWER.foot), b = towerLine(i / NL * Math.PI * 2, d, TOWER.top)
      list.push(strut([a[0] * 1.012, a[1], a[2] * 1.012], [b[0] * 1.012, b[1], b[2] * 1.012], 0.32, 5))
    }
    return fuse(list)
  }, [])
  const per = geo.attributes.position.count / (NL * 2)
  geo.setDrawRange(0, Math.round(t * NL * 2) * per)
  return <mesh geometry={geo} position={P.tower} frustumCulled={false}><meshBasicMaterial color={COL.curve} toneMapped={false} /></mesh>
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('echo')
  const [did, setDid] = useState<Sub[]>([])
  const T = useTasks('gewu:conic:x', TASKS)
  const run = useRun(sub === 'tower' ? 3.5 : 4.5)
  const on = did.includes(sub), t = on ? 1 : run.t
  useEffect(() => { if (!run.done) return; const next = did.includes(sub) ? did : [...did, sub]; setDid(next); T.check(id => next.includes(id as Sub)) }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (s: Sub) => { run.reset(); setSub(s) }
  const resetAll = () => { run.reset(); setSub('echo'); setDid([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '三个专题都看完了。', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : run.running ? { hint: '正在走…', next: null } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }

  let stage: React.ReactNode
  if (sub === 'echo') {
    const { a, b, c } = WALL, W = (x: number, y: number) => toWorld(F.wall, x, y, 0.1)
    const rays = WALL_T.map(u => { const r = ellipseBounce(a, b, u); return [[-c, 0], r.hit, [c, 0]] as P2[] })
    const rim: P2[] = Array.from({ length: 181 }, (_, i) => ellipsePoint(a, b, -1.25 + i / 180 * (Math.PI * 2 - 0.64)))
    const labels: Label[] = [
      { id: 'f1', at: W(-c, -0.5), ax: 0.5, className: 'scene-tag', children: <><span className="font-formula italic">F₁</span> · 在这里说话</> },
      { id: 'f2', at: W(c, -0.5), ax: 0.5, className: 'scene-tag', children: <><span className="font-formula italic">F₂</span> · 在这里听</> },
      ...(on ? [{ id: 'r', at: W(0, b + 0.9), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <>八路声音同时到 · 路程都是 {fmt(ellipseBounce(a, b, 1).path)} m</> } satisfies Label] : []),
      { id: 'n', at: W(-a - 0.3, -b * 0.6), ax: 1, name: true, className: 'scene-name', children: '回音壁：椭圆形的矮墙' },
    ]
    stage = <At at="wall" labels={labels} bloom={0.4}><Local f={F.wall}><FrontCtx.Provider value={true}>
      <Path pts={rim} width={0.07} opacity={0.9} z={0.0} />
      {rays.map((r, i) => { const u = upto(r, t * 2 * a); return <group key={i}><Path pts={u.pts} color={COL.ray} width={0.06} z={0.02} />{t > 0.01 && t < 1 && <Tip at={u.head} dir={u.dir} size={0.3} z={0.03} />}</group> })}
      <Dot at={[-c, 0]} color={COL.focus} r={0.16} /><Dot at={[c, 0]} color={COL.focus} r={0.16} />
    </FrontCtx.Provider></Local></At>
  } else if (sub === 'mirror') {
    const q = (x: number, y: number) => pt(AX4, x, y), W = (x: number, y: number) => toWorld(F.hyper, ...q(x, y), 0.06)
    const branch = (side: 1 | -1): P2[] => Array.from({ length: 101 }, (_, i) => q(...hyperPoint(H.a, H.b, -1.25 + 2.5 * i / 100, side)))
    const rays = MIRROR_U.map(u => { const r = hyperBounce(H.a, H.b, u), far = 3.4; return { hit: r.hit, pts: [q(H.c, 0), q(...r.hit), q(r.hit[0] + r.out[0] * far, r.hit[1] + r.out[1] * far)] as P2[] } })
    const L = Math.max(...rays.map(r => pathLen(r.pts)))
    const labels: Label[] = [
      { id: 'f1', at: W(-H.c, -0.3), ax: 0.5, className: 'scene-tag', children: <><span className="font-formula italic">F₁</span>(−5, 0)</> },
      { id: 'f2', at: W(H.c, -0.3), ax: 0.5, className: 'scene-tag', children: <><span className="font-formula italic">F₂</span>(5, 0) · 光源</> },
      ...(on ? [{ id: 'r', at: W(-3.4, 2.6), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <>反向延长线都过 F₁</> } satisfies Label] : []),
    ]
    stage = <At at="hyper" labels={labels}><Local f={F.hyper}>
      <Path pts={branch(-1)} width={0.03} opacity={0.3} /><Path pts={branch(1)} width={0.06} />
      {rays.map((r, i) => { const u = upto(r.pts, t * L); return <group key={i}>
        <Path pts={u.pts} color={COL.ray} width={0.035} z={0.026} />
        {t > 0.01 && t < 1 && <Tip at={u.head} dir={u.dir} size={0.14} z={0.03} />}
        {on && <Seg a={q(-H.c, 0)} b={q(...r.hit)} color={COL.ray} dash={0.12} width={0.02} opacity={0.6} />}
      </group> })}
      <Dot at={q(-H.c, 0)} color={COL.focus} /><Dot at={q(H.c, 0)} color={COL.focus} />
    </Local></At>
  } else {
    const W = (x: number, y: number) => toWorld(FT, x, y, 0)
    const side = (s: 1 | -1): P2[] => Array.from({ length: 61 }, (_, i) => { const y = TOWER.foot + (TOWER.top - TOWER.foot) * i / 60; return [s * towerR(y), y] })
    const labels: Label[] = [
      { id: 'th', at: W(TOWER.a + 3, TOWER.throat), className: 'scene-tag -translate-y-1/2', children: <><small>喉部</small>半径 {TOWER.a} m</> },
      { id: 'k', at: W(-towerR(30) - 3, 30), ax: 1, className: 'scene-tag -translate-y-1/2', style: { borderLeft: `4px solid ${COL.curve}` }, children: <>侧面轮廓：双曲线</> },
      ...(on ? [{ id: 'r', at: W(0, TOWER.top + 12), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <>塔面上的两族直线</> } satisfies Label] : []),
    ]
    stage = <At at="tower" labels={labels}>
      <TowerLines t={t} />
      <Local f={FT}><FrontCtx.Provider value={true}><Path pts={side(1)} width={1.3} /><Path pts={side(-1)} width={1.3} /><Seg a={[0, 0]} b={[0, TOWER.top + 8]} color={COL.ghost} dash={4} width={0.6} /></FrontCtx.Provider></Local>
    </At>
  }

  return (
    <LabShell title="圆锥曲线" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={stage}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">椭圆、双曲线、抛物线各有一条和焦点有关的反射性质，建筑和仪器里到处在用</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
            <div className="mt-1 text-[20px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
          </div>
          {sub === 'echo' && <div className="mt-4 grid grid-cols-3 gap-2"><ParamTile symbol="a" value={String(WALL.a)} unit="m" /><ParamTile symbol="b" value={String(WALL.b)} unit="m" /><ParamTile symbol="2a" value={on ? fmt(WALL.a * 2) : '—'} unit="m · 每一路的路程" /></div>}
          {sub === 'mirror' && <div className="mt-4 grid grid-cols-3 gap-2"><ParamTile symbol="a" value={String(H.a)} unit="" /><ParamTile symbol="b" value={String(H.b)} unit="" /><ParamTile symbol="c" value={String(H.c)} unit="焦点 (±5, 0)" /></div>}
          {sub === 'tower' && <div className="mt-4 grid grid-cols-3 gap-2"><ParamTile symbol="喉部" value={String(TOWER.a)} unit="m · 半径" /><ParamTile symbol="塔底" value={fmt(towerR(0), 1)} unit="m · 半径" /><ParamTile symbol="塔高" value={String(TOWER.top)} unit="m" /></div>}
          {on && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={run.start} disabled={on || run.running}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={pick} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
