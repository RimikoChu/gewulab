// 机械振动和机械波 · 拓展：两个课本以外的小实验。
// 驻波：造波板推出的波垂直撞上码头的岸壁再弹回来，来回两列波叠在一起，有的地方始终不动，有的地方起伏加倍。
// 艏波：小艇开得比水波还快，一圈圈的波面追不上它，叠成一个 V 字。
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Paddle, WorkBoat } from './boats'
import { Dim, Floats, num, useRun } from './gear'
import { AT, PATCH, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { FAST, STAND, TONES, WATER, firstNode, lambda, standAmp, towField, travel, wedge, type FastKey, type ToneKey } from './physics'
import { WavePatch, makeGrid } from './sea'
import { VOICE } from './voice'
import { Place } from './world'

type Sub = 'stand' | 'bow'
const ORDER: Sub[] = ['stand', 'bow']
const SUBS: Record<Sub, { name: string; opts: [string, string]; title: string; say: string }> = {
  stand: { name: '岸壁前的驻波', opts: ['0.5 Hz 起波', '1.0 Hz 起波'], title: '入射波和反射波叠加，波节始终不动',
    say: '波撞上直立的岸壁会原样反射回来。入射波和反射波频率相同、方向相反，叠加以后波形不再向前走：有些点始终不动，叫波节；有些点振幅是原来的 2 倍，叫波腹。相邻两个波节相隔半个波长。岸壁挡着水不能前后流，水面在这里起伏最大，是波腹；离岸壁 λ/4 的地方是第一个波节。弦乐器的弦、管乐器里的空气柱，发声时也是驻波。' },
  bow: { name: '比波还快的艇', opts: ['艇速 3 m/s', '艇速 4 m/s'], title: '艇比波快，波面叠成 V 形',
    say: '波源的速度 u 超过波速 v 以后，它发出的波永远追不上它：先后发出的一圈圈波面在艇的两侧叠成一个 V 形的波前，半顶角 θ 满足 sinθ = v / u，艇越快，V 字越尖。超音速飞机的激波（“音爆”）是同样的道理。' },
}
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：两种情况各做一次`, note: SUBS[k].title }))
const TONE: ToneKey[] = ['slow', 'fast'], BOAT: FastKey[] = ['a', 'b']
/** 驻波：岸壁在 z = 0，造波板在 z = ZS，波朝岸壁传；一串浮子从岸壁往外排 */
const SX = AT.stand[0], ZS = -9.3, NF = 12, fz = (i: number) => -0.5 * (i + 1)
const STAND_T = (-ZS + 6) / WATER.v + 2.5
/** 艏波：起波锤每秒拍一下；小艇从 BX0 出发开 8 s */
const BX0 = AT.tow[0] - 20, BZ0 = AT.tow[1], BOW = { f: 1, A: 0.12, T: 8 }

function StandRig({ tone, run, onDone }: { tone: ToneKey; run: number; onDone: () => void }) {
  const grid = useMemo(() => makeGrid(PATCH.stand), [])
  const win = useMemo(() => Float32Array.from(grid.xs, x => { const k = Math.min(1, Math.max(0, (6.2 - Math.abs(x - SX)) / 1.6)); return k * k * (3 - 2 * k) }), [grid])
  const f = TONES[tone].f, lam = lambda(f), t = useRef(0), amp = useRef(0), flap = useRef<THREE.Group>(null)
  const at = (z: number) => { const zz = Math.min(z, 0); return travel(STAND.A, f, zz - ZS, t.current) + travel(STAND.A, f, -ZS - zz, t.current) }
  useRun(run, (tt, dt) => {
    if (run !== 0) { t.current = tt; amp.current = 1 } else { t.current += dt; amp.current = Math.max(0, amp.current - dt * 1.4) }
    if (flap.current) flap.current.rotation.z = -0.1 * amp.current * Math.sin(2 * Math.PI * f * t.current)
  }, [STAND_T], onDone)
  // 最靠近第一个波节的那只浮子标成红的
  const node = Math.round(firstNode(lam) / 0.5) - 1
  return <>
    <WavePatch grid={grid} high={STAND.A * 1.8} fill={out => { const { zs, n } = grid, a = amp.current; for (let k = 0; k < n; k++) out[k] = a * win[k] * at(zs[k]) }} />
    <Floats n={NF} r={0.21} mark={node} place={(i, p) => { p[0] = SX; p[1] = amp.current * at(fz(i)); p[2] = fz(i) }} />
    <group position={[SX, 0, ZS - 1.72]} rotation-y={-Math.PI / 2}><Paddle flap={flap} /></group>
  </>
}

function BowRig({ boat, run, hold, onDone, tag }: { boat: FastKey; run: number; hold: boolean; onDone: () => void; tag: V3 }) {
  const grid = useMemo(() => makeGrid(PATCH.tow), [])
  const u = FAST[boat].u, t = useRef(0), hull = useRef<THREE.Group>(null), ham = useRef<THREE.Group>(null)
  useRun(run, tt => {
    t.current = tt
    hull.current?.position.set(BX0 + u * tt, 0, BZ0)
    if (ham.current) ham.current.position.y = 0.05 - (run === 0 ? 0 : 0.14 * Math.sin(2 * Math.PI * BOW.f * tt))
    tag[0] = BX0 + u * tt - 5
  }, [BOW.T], onDone, hold)
  const th = (wedge(u) * Math.PI) / 180, nose = BX0 + u * BOW.T, len = 13
  return <>
    <WavePatch grid={grid} chop={0.01} high={BOW.A * 1.3} fill={out => { const { xs, zs, n } = grid, tt = t.current; if (tt <= 0) { out.fill(0); return } for (let k = 0; k < n; k++) out[k] = towField(BOW.A, BOW.f, u, xs[k] - BX0, zs[k] - BZ0, tt) }} />
    <WorkBoat ref={hull} plunger={ham} />
    {hold && [-1, 1].map(s => <Dim key={s} a={[nose, 0.5, BZ0]} b={[nose - len * Math.cos(th), 0.5, BZ0 + s * len * Math.sin(th)]} thick={0.1} tick={0.1} />)}
  </>
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('stand')
  const [opt, setOpt] = useState<0 | 1>(0)
  const [run, setRun] = useState(0), n = useRef(0)
  const [ended, setEnded] = useState(false)
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:wave:x', TASKS)
  const tag = useRef<V3>([BX0 - 5, 4.2, BZ0]).current
  const busy = run !== 0 && !ended
  const go = (i: 0 | 1) => { if (run !== 0) return; setOpt(i); setEnded(false); setRun(++n.current) }
  const home = () => { if (busy) return; setRun(0); setEnded(false) }
  const done = () => { setEnded(true); const next = rows.includes(sub + opt) ? rows : [...rows, sub + opt]; setRows(next); T.check(id => next.includes(id + '0') && next.includes(id + '1')) }
  const pick = (k: Sub) => { if (busy) return; setSub(k); setRun(0); setEnded(false); setOpt(0) }
  const resetAll = () => { setSub('stand'); setOpt(0); setRun(0); setEnded(false); setRows([]); T.reset() }

  const task = T.current, S = SUBS[sub]
  const todo = ([0, 1] as const).find(i => !rows.includes(sub + i))
  const { hint, next }: { hint: string; next: 'sub' | 'o0' | 'o1' | 'home' | null } = (() => {
    if (!task) return { hint: '驻波和艏波，都是波的叠加。', next: null }
    if (busy) return { hint: sub === 'stand' ? '波撞上岸壁弹回来了，看哪只浮子不动…' : '艇跑在自己发出的波前面，看波面叠成什么形状…', next: null }
    if (run !== 0) return { hint: '按“放回原处”，让水面静下来', next: 'home' }
    if (sub !== task.id) return { hint: `把专题换成“${SUBS[task.id as Sub].name}”`, next: 'sub' }
    return { hint: `按“${S.opts[todo ?? 0]}”`, next: todo === 1 ? 'o1' : 'o0' }
  })()
  const tone = TONE[opt], lam = lambda(TONES[tone].f), fast = BOAT[opt]
  const labels: Label[] = sub === 'stand' ? [
    { id: 'node', at: [SX, 0.9, -firstNode(lam)], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: ended ? 1 : 0 }, children: <><small>波节 · 离岸壁 {num(firstNode(lam), 1)} m</small>振幅 {num(standAmp(firstNode(lam), lam))} m</> },
    { id: 'anti', at: [SX, 1.9, -lam / 2], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: ended ? 1 : 0 }, children: <><small>波腹 · 离岸壁 {num(lam / 2, 1)} m</small>振幅 {num(standAmp(lam / 2, lam))} m</> },
    { id: 'nW', at: [SX - 3, 1.9, 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '码头岸壁' },
    { id: 'nP', at: [SX, 2.0, ZS], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '造波板' },
  ] : [
    { id: 'boat', at: tag, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>波速 {num(WATER.v, 1)} m/s</small>艇速 {num(FAST[fast].u, 0)} m/s</> },
    { id: 'th', at: [BX0 + FAST[fast].u * BOW.T - 9, 0.8, BZ0 + 5.5], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: ended ? 1 : 0 }, children: <><small>半顶角</small>θ = {num(wedge(FAST[fast].u), 1)}°</> },
  ]
  return (
    <LabShell title="机械振动和机械波" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={S.name}
      stage={<Place at={sub === 'stand' ? 'xs' : 'xb'} labels={labels}>{sub === 'stand' ? <StandRig key={`s${opt}`} tone={tone} run={run} onDone={done} /> : <BowRig key={`b${opt}`} boat={fast} run={run} hold={ended} onDone={done} tag={tag} />}</Place>}
      lesson={<LessonBlock no="拓展" title="驻波和艏波" concept="两列波叠在一起，会出现新的图样" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">{S.name}</b>：{S.say}</p>
          <p className="mt-3 text-[13.5px] text-white/65">这一页是课本以外的内容，随堂检测不考。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个专题都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">波叠加以后，会出现不动的点和 V 形的波前</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">岸壁前的驻波：波节离岸壁 λ/4（波长 4 m 时是 {num(firstNode(4), 1)} m，2 m 时是 {num(firstNode(2), 1)} m），波腹的振幅是 {num(standAmp(0, 4))} m。比波快的艇：sinθ = v/u，3 m/s 时半顶角 {num(wedge(3), 1)}°，4 m/s 时 {num(wedge(4), 1)}°。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <p className="text-[12.5px] text-white/55">{S.name}</p>
          <p className="mt-1 text-[19px] leading-snug font-bold">{S.title}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {sub === 'stand' ? <>
              <ParamTile symbol="λ" value={num(lam, 0)} unit="m · 波长" />
              <ParamTile symbol="λ/4" value={num(firstNode(lam), 1)} unit="m · 第一个波节" />
              <ParamTile symbol="A" value={num(STAND.A)} unit="m · 入射波振幅" />
              <ParamTile symbol="2A" value={ended ? num(standAmp(0, lam)) : '—'} unit="m · 波腹振幅" />
            </> : <>
              <ParamTile symbol="v" value={num(WATER.v, 1)} unit="m/s · 波速" />
              <ParamTile symbol="u" value={num(FAST[fast].u, 0)} unit="m/s · 艇速" />
              <ParamTile symbol="v/u" value={num(WATER.v / FAST[fast].u)} unit="= sinθ" />
              <ParamTile symbol="θ" value={ended ? `${num(wedge(FAST[fast].u), 1)}°` : '—'} unit="半顶角" />
            </>}
          </div>
          <p className="mt-4 text-[13.5px] leading-relaxed text-white/70">{sub === 'stand' ? '红浮子在波节上，几乎不动；它两边的浮子起伏得最厉害。波形只在原地一鼓一瘪，不往前走。' : '起波锤每秒拍一下水。每一圈波面都以 2 m/s 向外扩，艇却跑得更快：所有的圆都被甩在后面，它们的公切线就是 V 形的波前。'}</p>
        </Glass>
      }
      actions={<>
        {([0, 1] as const).map(i => <LabButton key={i} primary={i === 0} pulse={next === `o${i}`} onClick={() => go(i)} disabled={run !== 0}>{S.opts[i]}</LabButton>)}
        <LabButton pulse={next === 'home'} onClick={home} disabled={busy || run === 0}>放回原处</LabButton>
      </>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task?.id as Sub : null} value={sub} disabled={busy} onChange={pick} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
