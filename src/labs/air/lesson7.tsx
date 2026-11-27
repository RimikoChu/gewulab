// 空气和氧气 · 第 7 课 工厂里怎么制氧：冷箱和精馏塔朝镜头剖开。先把塔里的空气降到 −196 ℃ 以下，全部变成液体（上段液氮、下段淡蓝色的液氧）；
// 再慢慢升温：到 −196 ℃ 氮先沸腾，从塔顶出去，占 78%；到 −183 ℃ 氧才沸腾，占 21%。没有生成新物质，是物理变化。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Bubbles, Puffs, SMOKE } from './fx'
import { LESSONS, goLesson } from './lessons'
import { scaleTex } from './mats'
import { BOX, REC, REC_H, REC_R, REC_Y, REC_Z } from './plant'
import { AIR, BOIL, T_COLD, T_ROOM, distill } from './physics'
import { Place, TOWER, type V3 } from './world'

const { x: TX, z: TZ, r: R, low: LOW, up: UP } = TOWER
/** 温度的写法：负号用“−” */
const deg = (t: number) => t.toFixed(0).replace('-', '−')
/** 塔旁的温度标尺：只画最冷的一段（−200 到 −170 ℃），两条红线是氮和氧的沸点 */
const SC = { lo: -200, hi: -170, x: -BOX.half - 4.4, y: 21, w: 4.2, h: 30 }
const scaleY = (T: number) => SC.y + (0.5 - (30 + (SC.hi - Math.min(SC.hi, Math.max(SC.lo, T))) / (SC.hi - SC.lo) * 964) / 1024) * SC.h
/** 上段最多盛多高的液氮、下段最多盛多高的液氧（画面单位） */
const N_MAX = 17, O_MAX = 10
const TASKS: Task[] = [
  { id: 'cool', text: '把温度降到 −196 ℃ 以下，看空气全部变成液体', note: '空气变成了液体：上段是液氮，下段是淡蓝色的液氧' },
  { id: 'n2', text: '升到 −196 ℃，看氮先馏出，占 78%', note: '液氮的沸点低，先沸腾，氮气从塔顶出去' },
  { id: 'o2', text: '升到 −183 ℃，看氧馏出，占 21%', note: '液氧的沸点高，后沸腾；剩下的主要是液氧' },
]

/** 半边的一段液体：靠后的半个圆柱，加上朝镜头的剖面。原点在液体底面的圆心 */
function HalfLiquid({ h, color, opacity }: { h: number; color: string; opacity: number }) {
  const g = useMemo(() => { const c = new THREE.CylinderGeometry(R - 0.34, R - 0.34, 1, 48, 1, false, Math.PI / 2, Math.PI); c.translate(0, 0.5, 0); return c }, [])
  if (h < 0.05) return null
  return <group scale={[1, h, 1]}>
    <mesh geometry={g} renderOrder={5}><meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.1} clearcoat={0.5} depthWrite={false} /></mesh>
    <mesh position={[0, 0.5, 0.02]} renderOrder={6}><planeGeometry args={[(R - 0.34) * 2, 1]} /><meshPhysicalMaterial color={color} transparent opacity={Math.min(0.92, opacity + 0.2)} roughness={0.08} clearcoat={0.8} depthWrite={false} /></mesh>
  </group>
}

export default function Lesson7() {
  const [goal, setGoal] = useState(T_ROOM)
  const [speed, setSpeed] = useState(45)
  const [cooled, setCooled] = useState(false)
  const [out, setOut] = useState({ n2: false, o2: false })
  const [rec, setRec] = useState({ n2: false, o2: false })
  const T = useSlide(goal, speed)
  const K = useTasks('gewu:air:7', TASKS)
  const D = distill(T)
  const liqO = useSlide(cooled || T <= BOIL.o2 - 0.5 ? 1 : 0, 0.45), liqN = useSlide(cooled || T <= BOIL.n2 - 0.5 ? 1 : 0, 0.4)
  const n2 = useSlide(out.n2 ? D.n2 || AIR.n2 : 0, 13), o2 = useSlide(out.o2 ? AIR.o2 : 0, 4.2)
  useEffect(() => { if (!cooled && T <= BOIL.n2 - 0.5 && liqN >= 1) { setCooled(true); K.check(id => id === 'cool') } }, [T, liqN, cooled])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cooled) return
    if (!out.n2 && goal >= BOIL.n2 && D.stage !== 'liquid') setOut(o => ({ ...o, n2: true }))
    if (out.n2 && !out.o2 && n2 >= AIR.n2 && D.stage === 'o2') setOut(o => ({ ...o, o2: true }))
  }, [cooled, goal, D.stage, n2, out.n2, out.o2])
  const go = (t: number, v = 45) => { setSpeed(v); setGoal(t) }
  const warm = () => (out.n2 ? go(BOIL.o2, 2.6) : go(BOIL.n2, 1.3))
  const canRec = (n2 >= AIR.n2 && !rec.n2) || (o2 >= AIR.o2 && !rec.o2)
  const record = () => { if (!canRec) return; const r = { n2: rec.n2 || n2 >= AIR.n2, o2: rec.o2 || o2 >= AIR.o2 }; setRec(r); K.check(id => (id === 'n2' ? r.n2 : id === 'o2' && r.o2)) }
  const resetAll = () => { setSpeed(1e4); setGoal(T_ROOM); setCooled(false); setOut({ n2: false, o2: false }); setRec({ n2: false, o2: false }); K.reset() }

  const task = K.current, moving = Math.abs(T - goal) > 0.05
  const { hint, next }: { hint: string; next: 'cool' | 'warm' | 'rec' | null } = !task ? { hint: '液氮和液氧的沸点不同，升温时氮先沸腾、氧后沸腾，就把它们分开了。这是物理变化。', next: null }
    : task.id === 'cool' ? (goal > BOIL.n2 - 0.5 ? { hint: '把塔里的温度降到 −196 ℃ 以下', next: 'cool' } : moving ? { hint: `正在降温：${deg(T)} ℃…`, next: null } : { hint: '空气全部变成了液体…', next: null })
    : task.id === 'n2' ? (!out.n2 ? (goal >= BOIL.n2 ? { hint: `正在升温：${deg(T)} ℃…`, next: null } : { hint: '慢慢升温到 −196 ℃，看谁先沸腾', next: 'warm' }) : n2 < AIR.n2 ? { hint: '−196 ℃：液氮沸腾，氮气从塔顶的管道出去…', next: null } : { hint: '氮先馏出，占空气体积的 78%。记录下来', next: 'rec' })
    : !out.o2 ? (out.n2 && goal >= BOIL.o2 ? { hint: `正在升温：${deg(T)} ℃…`, next: null } : { hint: '再升温到 −183 ℃', next: 'warm' }) : o2 < AIR.o2 ? { hint: '−183 ℃：液氧沸腾，氧气从塔底的管道出去…', next: null } : { hint: '氧后馏出，占空气体积的 21%。记录下来', next: 'rec' }

  const hN = N_MAX * liqN * (1 - n2 / AIR.n2), hO = O_MAX * liqO * (1 - o2 / AIR.o2)
  const boilN = out.n2 && n2 < AIR.n2, boilO = out.o2 && o2 < AIR.o2
  const scale = useMemo(() => scaleTex(SC.lo, SC.hi, [BOIL.n2, BOIL.o2]), [])
  const P = (x: number, y: number, z = 0): V3 => [TX + x, y, TZ + z]
  const labels: Label[] = [
    { id: 't', at: P(SC.x - SC.w / 2 - 0.5, scaleY(T), 1), ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>塔内温度</small>{deg(T)} ℃</> },
    { id: 'bn', at: P(SC.x + SC.w / 2 + 0.4, scaleY(BOIL.n2), 1), ax: 0, className: 'scene-name -translate-y-1/2', children: '氮 −196 ℃' },
    { id: 'bo', at: P(SC.x + SC.w / 2 + 0.4, scaleY(BOIL.o2), 1), ax: 0, className: 'scene-name -translate-y-1/2', children: '氧 −183 ℃' },
    ...(hN > 1 ? [{ id: 'ln', at: P(0, UP[0] + hN / 2, 1), ax: 0.5, className: 'scene-name -translate-y-1/2', children: '液氮' } as Label] : []),
    ...(hO > 1 ? [{ id: 'lo', at: P(0, LOW[0] + hO / 2, 1), ax: 0.5, className: 'scene-name -translate-y-1/2', children: '液氧 · 淡蓝色' } as Label] : []),
    ...(!cooled && liqO < 0.02 ? [{ id: 'air', at: P(0, 38, 1), ax: 0.5, className: 'scene-name -translate-y-1/2', children: '塔里是压缩、净化过的空气' } as Label] : []),
    { id: 'rn', at: P(REC[0], REC_Y + REC_H + 1.2, REC_Z), ax: 0.5, className: `scene-tag ${n2 >= AIR.n2 ? 'key' : ''} -translate-y-full`, children: <><small>氮</small>{n2.toFixed(0)}%</> },
    { id: 'ro', at: P(REC[1], REC_Y + REC_H + 1.2, REC_Z), ax: 0.5, className: `scene-tag ${o2 >= AIR.o2 ? 'key' : ''} -translate-y-full`, children: <><small>氧</small>{o2.toFixed(0)}%</> },
    { id: 'n1', at: P(-BOX.half + 1.6, 52, 0.5), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '冷箱（剖开）' },
    { id: 'n2', at: P(R + 0.4, 42, 0.5), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '精馏塔 · 上段' },
    { id: 'n3', at: P(R + 0.4, 18, 0.5), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '下段' },
  ]
  return (
    <LabShell title="空气和氧气" lessons={LESSONS} current="7" onLesson={goLesson} banner={K.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="塔内温度"
      stage={<Place at="l7" labels={labels} bloom={0.3}>
        <group position={[TX, 0, TZ]}>
          {/* 塔里的液体：上段液氮（清亮），下段液氧（淡蓝色） */}
          <group position-y={UP[0]}><HalfLiquid h={hN} color="#bfe8f8" opacity={0.78} /></group>
          <group position-y={LOW[0]}><HalfLiquid h={hO} color="#63b4f2" opacity={0.8} /></group>
          {/* 温度标尺和指针 */}
          <mesh position={[SC.x, SC.y, 0.6]} castShadow><boxGeometry args={[SC.w + 0.5, SC.h + 0.8, 0.3]} /><meshStandardMaterial color="#3d444a" roughness={0.6} metalness={0.3} /></mesh>
          <mesh position={[SC.x, SC.y, 0.77]}><planeGeometry args={[SC.w, SC.h]} /><meshStandardMaterial map={scale} roughness={0.6} /></mesh>
          {[-1.4, 1.4].map(dx => <mesh key={dx} position={[SC.x + dx, 3, 0.5]} castShadow><boxGeometry args={[0.35, 6, 0.35]} /><meshStandardMaterial color="#6f767b" roughness={0.6} metalness={0.3} /></mesh>)}
          <mesh position={[SC.x - SC.w / 2 + 0.35, scaleY(T), 0.9]} rotation-z={-Math.PI / 2}><coneGeometry args={[0.6, 1.3, 3]} /><meshBasicMaterial color="#ff5a3c" toneMapped={false} /></mesh>
          {/* 两只产品罐前的液位窗：馏出多少，亮条就升多高 */}
          {REC.map((x, i) => { const v = (i ? o2 : n2) / 100, H = REC_H - 5; return <group key={x} position={[x, REC_Y + 2.5, REC_Z + REC_R + 0.06]}>
            <mesh position-y={H / 2}><planeGeometry args={[1.1, H + 0.3]} /><meshStandardMaterial color="#182026" roughness={0.4} /></mesh>
            {v > 0.004 && <mesh position={[0, H * v / 2, 0.02]}><planeGeometry args={[0.8, H * v]} /><meshBasicMaterial color={i ? '#6fc4ff' : '#ffd95a'} toneMapped={false} /></mesh>}
          </group> })}
        </group>
        {/* 沸腾：液体里往上冒的气泡；冷箱脚下漫出的冷雾 */}
        <Bubbles at={P(0, UP[0] + 0.3, -1.6)} top={Math.max(0.4, hN - 0.4)} on={boilN} rate={46} r={0.34} spread={5} speed={5.5} seed={3} opacity={0.75} />
        <Bubbles at={P(0, LOW[0] + 0.3, -1.6)} top={Math.max(0.4, hO - 0.4)} on={boilO} rate={34} r={0.32} spread={5} speed={4} seed={5} opacity={0.75} />
        <Puffs at={P(0, UP[0] + hN + 0.6, -1.5)} on={boilN} opt={{ ...SMOKE.steam(2.2), rate: 9, opacity: 0.28, life: 1.8 }} seed={4} />
        <Puffs at={P(0, LOW[0] + hO + 0.6, -1.5)} on={boilO} opt={{ ...SMOKE.steam(1.8), rate: 7, opacity: 0.28, life: 1.6 }} seed={6} />
        <Puffs at={P(2, 3.4, 1.2)} on={T < -120} opt={{ ...SMOKE.fog(5), rate: 5, opacity: 0.16, life: 4 }} seed={8} />
      </Place>}
      lesson={<LessonBlock no="7" title="工厂里怎么制氧" concept="不用化学，靠“谁先沸腾”" tasks={TASKS} done={K.done} current={task?.id}
        theory={<>
          <p>工业上需要大量氧气，原料就是空气。先把空气除尘、净化，在低温下加压，使它变成液态；液氮的沸点（−196 ℃）比液氧的沸点（−183 ℃）低，升温时氮气先从液态空气里蒸发出来，剩下的主要是液态氧。</p>
          <p className="mt-2">这个过程只是把空气里本来就有的氮气和氧气分开，<b className="text-white">没有生成新物质，是物理变化</b>。实验室里用高锰酸钾、过氧化氢制氧气，生成了新物质，是分解反应。</p>
          <p className="mt-2 text-[13px] text-white/60">画面是示意：真实的精馏塔里，液体和气体在一层层塔板上反复接触，才能分得干净。工业上把氧气加压后贮存在钢瓶里，或以液氧的形式贮存在储罐里。</p>
        </>} />}
      finale={K.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">氮和氧分开了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">分离液态空气：利用液氮和液氧的沸点不同，是物理变化</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">升温到 −196 ℃，氮先沸腾出去，占空气体积的 78%；到 −183 ℃，氧才沸腾，占 21%。没有生成新物质。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">塔内温度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{deg(T)}<span className="ml-1 text-[15px] font-medium text-white/55">℃</span></div>
            <div className="mt-1.5 text-[13px] text-white/60">{!cooled ? (liqO > 0.5 ? '空气正在变成液体' : '空气还是气体') : boilN ? '液氮在沸腾' : boilO ? '液氧在沸腾' : out.o2 ? '氮和氧都馏出了' : out.n2 ? '剩下的主要是液氧' : '全部是液体'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="t(氮)" value={deg(BOIL.n2)} unit="℃ · 液氮的沸点" />
            <ParamTile symbol="t(氧)" value={deg(BOIL.o2)} unit="℃ · 液氧的沸点" />
            <ParamTile symbol="φ(氮)" value={n2.toFixed(0)} unit="% · 已馏出的氮" />
            <ParamTile symbol="φ(氧)" value={o2.toFixed(0)} unit="% · 已馏出的氧" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">记录</h2>
          <div className="mt-2 flex flex-col gap-1.5 text-[14px]">
            <div className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-2"><span className="text-white/70">−196 ℃ 先馏出</span><span className="font-semibold">{rec.n2 ? `氮气 ${AIR.n2}%` : '—'}</span></div>
            <div className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-2"><span className="text-white/70">−183 ℃ 后馏出</span><span className="font-semibold">{rec.o2 ? `氧气 ${AIR.o2}%` : '—'}</span></div>
          </div>
          <p className="mt-3 text-[12.5px] text-white/50">其余约 1% 是稀有气体等</p>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'cool'} pulse={next === 'cool'} onClick={() => go(T_COLD)} disabled={goal === T_COLD}>降到 {deg(T_COLD)} ℃</LabButton>
        <LabButton primary={next === 'warm'} pulse={next === 'warm'} onClick={warm} disabled={!cooled || moving || out.o2 || (out.n2 && n2 < AIR.n2)}>{out.n2 ? '升到 −183 ℃' : '升到 −196 ℃'}</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!canRec}>记录</LabButton>
      </>}
      extras={null}
    />
  )
}
