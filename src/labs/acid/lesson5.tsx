// 酸、碱和中和 · 第 5 课 中和反应：化验室的滴定台。铁架台上的蝴蝶夹夹着一支 25 mL 酸式滴定管，装着 0.100 mol/L 稀盐酸；
// 下面磁力搅拌器上一只 250 mL 烧杯，盛 20.00 mL 0.100 mol/L 氢氧化钠溶液，杯里插着 pH 电极，电极线接到右边的台式 pH 计。
// 先滴酚酞（变红），快速放到 19.50 mL，再一滴一滴加到红色恰好褪去（20.00 mL，pH 7.0），多滴一滴 pH 落到 3.9。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Glass as Panel, HoldButton, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { lathe, useTasks, type Label } from '@/lab-kit'
import { BUR, Beaker, Burette, ButterflyClamp, DropBottle, Dropper, Electrode, Glove, IronStand, LOOK, MagStirrer, PhMeter, Plinth, StirBar, m, u, type Look } from './gear'
import { Drop, Stream } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, mixHex, seg, useRun } from './parts'
import { PHENOL_TURN, TITR, burette, meter, titrationPH } from './physics'
import { BZ, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l5, Y = TOP, Z = BZ + 0.2
const STIR_TOP = 0.025 + 0.06                 // 搅拌器放在铁架台底座上，顶面离台面多高（m）
const BK: V3 = [X0, Y + u(STIR_TOP), Z + u(0.01)]
const TIP: V3 = [X0 - u(0.01), Y + u(STIR_TOP + 0.085), Z + u(0.01)]   // 滴定管尖嘴，伸进杯口
const STAND: V3 = [X0 + u(0.035), Y, Z + u(0.02)]                    // 底座中心；立杆在它后面 0.09 m，夹爪伸到尖嘴正上方
const CLAMP_Y = STIR_TOP + 0.085 + 0.36
const METER: V3 = [X0 + u(0.25), Y, Z + u(0.07)]
const HOLDER: V3 = [X0 + u(0.15), Y, Z - u(0.02)]
const PHENOL_AT: V3 = [X0 - u(0.16), Y, Z + u(0.11)]
const WASH: V3 = [X0 - u(0.27), Y, Z + u(0.02)]
const TASKS: Task[] = [
  { id: 'phenol', text: '往氢氧化钠溶液里滴两滴酚酞', note: '溶液变红：氢氧化钠溶液显碱性，pH 13.0' },
  { id: 'fast', text: '打开活塞，先放到 19.50 mL', note: '还是红的：氢氧化钠还没反应完，pH 11.1' },
  { id: 'end', text: '一滴一滴加，到红色恰好褪去', note: '20.00 mL 时红色恰好褪去，pH 7.0：酸和碱恰好完全反应' },
  { id: 'over', text: '再多滴一滴，看 pH', note: '只多了一滴，pH 落到 3.9：盐酸过量，溶液显酸性' },
]
/** 体积按百分之一毫升记成整数，免得一滴一滴加出小数误差 */
const toV = (c: number) => c / 100
const FAST = Math.round(TITR.fast * 100), DROP = Math.round(TITR.drop * 100), END = Math.round(TITR.vBase * 100)

/** 烧杯里溶液的样子：没滴酚酞是无色；滴了以后按 pH 由红到无色 */
function solLook(phenol: boolean, pH: number): Look {
  if (!phenol || pH < PHENOL_TURN) return LOOK.clear
  const k = Math.min(1, (pH - PHENOL_TURN) / 1.8)
  return { color: mixHex('#f2c6d6', LOOK.pink.color, k), opacity: 0.3 + 0.35 * k, vivid: true }
}
/** 洗瓶：软塑料的白瓶子，瓶盖上一根弯成鹅颈的细管。原点在瓶底 */
function WashBottle() {
  const g = useMemo(() => ({
    body: lathe(m([[0, 0], [0.03, 0], [0.033, 0.006], [0.033, 0.12], [0.026, 0.145], [0.014, 0.155], [0.014, 0.165], [0, 0.165]]), { segs: 40, crease: 40 }),
    nozzle: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.165, 0], [0, 0.2, 0], [0.01, 0.22, 0], [0.04, 0.215, 0], [0.055, 0.195, 0]].map(p => new THREE.Vector3(p[0] * 6, p[1] * 6, p[2] * 6))), 40, u(0.002), 8),
  }), [])
  return <group>
    <mesh geometry={g.body} castShadow><meshPhysicalMaterial color="#f1f3f1" transparent opacity={0.85} roughness={0.4} clearcoat={0.3} /></mesh>
    <mesh position-y={u(0.17)}><cylinderGeometry args={[u(0.016), u(0.016), u(0.016), 24]} /><meshStandardMaterial color="#d23a3a" roughness={0.5} /></mesh>
    <mesh geometry={g.nozzle} castShadow><meshStandardMaterial color="#eef0ee" roughness={0.4} /></mesh>
  </group>
}
/** 一根电线：沿几个点弯过去 */
function Cable({ pts }: { pts: V3[] }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 48, u(0.0018), 8), [JSON.stringify(pts)])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} castShadow><meshStandardMaterial color="#1c1e21" roughness={0.6} /></mesh>
}

export default function Lesson5() {
  const [phenol, setPhenol] = useState(false)
  const [cV, setCV] = useState(0)                     // 已加入盐酸（0.01 mL）
  const [pts, setPts] = useState<[number, number][]>([[0, titrationPH(0)]])
  const [holding, setHolding] = useState(false)
  const T = useTasks('gewu:acid:5', TASKS)
  const V = toV(cV), pH = titrationPH(V)
  const record = (c: number) => { const v = toV(c); setPts(p => (p.length && Math.abs(p[p.length - 1][0] - v) < 0.2 && v < 19.4 ? p : [...p, [v, titrationPH(v)]])) }
  const drip = useRun(2.8, () => { setPhenol(true); T.check(id => id === 'phenol') })
  const fast = useRun(6, () => { setCV(FAST); record(FAST); T.check(id => id === 'fast') })
  const cRef = useRef(cV); cRef.current = cV
  const drop = useRun(0.9, () => {
    const c = cRef.current + DROP; setCV(c); record(c)
    T.check(id => (id === 'end' && c >= END) || (id === 'over' && c > END))
  })
  // 快速放液：活塞全开，读数匀速往下走
  const fastC = fast.busy ? Math.round(FAST * ease(seg(fast.t, 0.5, 5.4)) / 5) * 5 : null
  useEffect(() => { if (fastC !== null) record(fastC) }, [fastC])   // eslint-disable-line react-hooks/exhaustive-deps
  const shownC = fastC ?? cV, shownV = toV(shownC), shownPH = titrationPH(shownV)
  // 按住“滴一滴”：一滴接一滴
  useEffect(() => { if (holding && !drop.busy && cV < 2500) drop.run() }, [holding, drop.busy])   // eslint-disable-line react-hooks/exhaustive-deps
  const busy = drip.busy || fast.busy
  const resetAll = () => { drip.snap(0); fast.snap(0); drop.snap(0); setHolding(false); setPhenol(false); setCV(0); setPts([[0, titrationPH(0)]]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'phenol' | 'fast' | 'drop' | null } = !task ? { hint: '酸和碱作用生成盐和水，叫做中和反应：HCl + NaOH = NaCl + H₂O。', next: null }
    : drip.busy ? { hint: '用胶头滴管滴两滴无色酚酞溶液…', next: null }
    : fast.busy ? { hint: '打开活塞放盐酸，搅拌子一直在转…', next: null }
    : task.id === 'phenol' ? { hint: '往氢氧化钠溶液里滴两滴无色酚酞溶液', next: 'phenol' }
    : task.id === 'fast' ? { hint: '溶液变红了。打开活塞，先把盐酸放到 19.50 mL', next: 'fast' }
    : task.id === 'end' ? { hint: '一滴一滴加盐酸，看红色什么时候恰好褪去', next: 'drop' }
    : { hint: '红色恰好褪去。再多滴一滴，看 pH 怎么变', next: 'drop' }

  // 滴酚酞：滴管从滴瓶拿到烧杯口上方，挤两滴，放回去
  const dk = drip.busy ? ease(seg(drip.t, 0, 1.0)) - ease(seg(drip.t, 1.8, 2.8)) : 0
  const dropperAt: V3 = liftPath([PHENOL_AT[0], Y + u(0.03), PHENOL_AT[2]], [BK[0] + u(0.012), BK[1] + u(0.11), BK[2] - u(0.012)], Y + u(0.26), dk)
  const look = solLook(phenol || (drip.busy && drip.t > 1.45), shownPH)
  const level = 0.02 + shownV * 0.0006
  const surf = BK[1] + u(0.0018 + level)
  // 局部褪色：盐酸滴进去的地方一闪而过一小团无色，搅一下又红了
  const flash = phenol && ((fast.busy && fast.t > 0.6 && fast.t < 5.4) || (drop.busy && drop.t > 0.55)) && shownPH > PHENOL_TURN
  const open = fast.busy ? ease(seg(fast.t, 0.1, 0.5)) - ease(seg(fast.t, 5.4, 5.9)) : drop.busy ? (drop.t < 0.6 ? 0.35 : 0) : 0
  const burLevel = shownV                                 // 滴定管从 0.00 mL 开始放

  const labels: Label[] = [
    { id: 'v', at: [TIP[0] - u(0.02), TIP[1] + u(BUR.cock + 0.04), TIP[2]], ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>滴定管</small>{burette(shownV)} mL</> },
    { id: 'ph', at: [METER[0] - u(0.02), Y + u(0.1), METER[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>pH</small>{meter(shownPH)}</> },
    { id: 'n1', at: [X0 - u(0.012), TIP[1] + u(BUR.top + 0.01), TIP[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '稀盐酸 0.100 mol/L' },
    { id: 'n2', at: [BK[0] - u(0.04), BK[1] + u(0.03), BK[2] + u(0.02)], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '氢氧化钠溶液 20.00 mL' },
    { id: 'n3', at: [PHENOL_AT[0], Y - u(0.004), PHENOL_AT[2] + u(0.03)], ax: 0.5, name: true, className: 'scene-name', children: '酚酞' },
  ]
  // pH 曲线：横轴加入盐酸 0–25 mL，纵轴 pH 0–14
  const W = 286, H = 150, px = (v: number) => 26 + v / 25 * (W - 34), py = (p: number) => 8 + (14 - p) / 14 * (H - 30)
  const line = pts.map(([v, p]) => `${px(v).toFixed(1)},${py(p).toFixed(1)}`).join(' ')
  return (
    <LabShell title="酸、碱和中和" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="滴定"
      stage={<Place at="l5" labels={labels}>
        {/* 铁架台、蝴蝶夹、滴定管 */}
        <group position={STAND}>
          <IronStand rodH={0.66} rodZ={-0.09} w={0.2} d={0.3}>
            <group position={[0, u(CLAMP_Y), u(-0.09)]}><ButterflyClamp gap={0.045} reach={0.08} /></group>
          </IronStand>
        </group>
        <group position={TIP}><Burette level={burLevel} open={open} /></group>
        {/* 磁力搅拌器、烧杯、搅拌子、电极 */}
        <group position={[X0, Y + u(0.025), Z + u(0.02)]}><MagStirrer on /></group>
        <group position={WASH}><WashBottle /></group>
        <group position={BK}>
          <Beaker vol={250} level={level} look={look}><StirBar on /></Beaker>
        </group>
        {flash && <mesh position={[TIP[0], surf - u(0.004), TIP[2]]} scale={[1, 0.5, 1]} renderOrder={6}><sphereGeometry args={[u(0.009), 20, 12]} /><meshStandardMaterial color="#f6eef1" transparent opacity={0.55} depthWrite={false} /></mesh>}
        <Stream top={[TIP[0], TIP[1], TIP[2]]} bottom={[TIP[0], surf, TIP[2]]} r={u(0.0011)} on={fast.busy && fast.t > 0.5 && fast.t < 5.4} />
        {drop.busy && <Drop at={TIP} drop={TIP[1] - surf} t={drop.t / 0.62} r={u(0.0018)} />}
        <group position={HOLDER}>
          <Plinth r={0.035} h={0.012} />
          <mesh position-y={u(0.17)}><cylinderGeometry args={[u(0.004), u(0.004), u(0.33), 12]} /><meshStandardMaterial color="#cfd3d4" metalness={0.9} roughness={0.25} /></mesh>
          <mesh position={[-u(0.06), u(0.27), u(0.015)]} rotation={[0, -0.25, Math.PI / 2]}><boxGeometry args={[u(0.006), u(0.13), u(0.012)]} /><meshStandardMaterial color="#2a2e32" roughness={0.5} /></mesh>
        </group>
        <group position={[BK[0] + u(0.018), BK[1] + u(0.008), BK[2] + u(0.012)]} rotation-z={-0.08}><Electrode /></group>
        <Cable pts={[[BK[0] + u(0.017), BK[1] + u(0.17), BK[2] + u(0.012)], [BK[0] + u(0.04), BK[1] + u(0.24), BK[2] + u(0.0)], [HOLDER[0] + u(0.04), Y + u(0.2), HOLDER[2] - u(0.03)], [METER[0] - u(0.04), Y + u(0.06), METER[2] - u(0.08)], [METER[0], Y + u(0.03), METER[2] - u(0.075)]]} />
        <group position={METER} rotation-y={-0.35}><PhMeter text={meter(shownPH)} /></group>
        {/* 酚酞滴瓶和滴管 */}
        <group position={PHENOL_AT} rotation-y={-0.3}><DropBottle label="酚酞" band="#c23a6a" look={LOOK.clear} brown dropper={!drip.busy} /></group>
        {drip.busy && <group position={dropperAt}>
          <Dropper fill={drip.t < 1.5 ? 0.4 : 0.1} />
          <group position={[0, u(0.1), 0]} rotation={[0.25, 0.3, 0.1]}><Glove s={u(0.0055)} /></group>
        </group>}
        {drip.busy && <Drop at={[BK[0] + u(0.012), BK[1] + u(0.108), BK[2] - u(0.012)]} drop={BK[1] + u(0.108) - surf} t={seg(drip.t, 1.0, 1.5)} r={u(0.0022)} />}
      </Place>}
      lesson={<LessonBlock no="5" title="中和反应" concept="酸和碱作用生成盐和水" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>酸和碱作用生成盐和水的反应，叫做中和反应。氢氧化钠和盐酸反应：HCl + NaOH = NaCl + H₂O。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>中和反应的实质：酸中的氢离子和碱中的氢氧根离子结合生成水，H⁺ + OH⁻ = H₂O</li>
            <li>这个反应没有明显现象，所以先滴酚酞：红色恰好褪去，说明氢氧化钠恰好反应完</li>
            <li>恰好中和时 pH = 7；盐酸只多了一滴，pH 就从 7 落到 3.9</li>
            <li>生成盐和水的反应不一定是中和反应：二氧化碳和氢氧化钠反应也生成盐和水，但二氧化碳不是酸</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">两种溶液的浓度都是 0.100 mol/L，一滴按 0.05 mL 算；pH 由浓度和体积算出，不计温度的影响。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">一次中和滴定做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">酸和碱作用生成盐和水</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">加到 20.00 mL 时红色恰好褪去，pH 7.0；多一滴，pH 3.9。HCl + NaOH = NaCl + H₂O</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">pH 计读数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{meter(shownPH)}</div>
            <div className="mt-1 text-[13px] text-white/60">{shownPH > 7.05 ? '碱性' : shownPH < 6.95 ? '酸性' : '中性'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="V" value={burette(shownV)} unit="mL · 加入的盐酸" />
            <ParamTile symbol="颜色" value={!phenol ? '—' : shownPH >= PHENOL_TURN ? '红色' : '无色'} unit="滴了酚酞" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">pH 曲线</h2>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full">
            {[0, 7, 14].map(p => <g key={p}><line x1={26} x2={W - 8} y1={py(p)} y2={py(p)} stroke="rgb(255 255 255 / 0.14)" strokeDasharray={p === 7 ? '4 3' : undefined} /><text x={20} y={py(p) + 4} textAnchor="end" fontSize="10.5" fill="rgb(255 255 255 / 0.55)">{p}</text></g>)}
            {[0, 10, 20, 25].map(v => <text key={v} x={px(v)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="rgb(255 255 255 / 0.55)">{v}</text>)}
            <line x1={px(20)} x2={px(20)} y1={py(14)} y2={py(0)} stroke="rgb(255 255 255 / 0.1)" />
            <polyline points={line} fill="none" stroke="#35c7b3" strokeWidth={2.2} strokeLinejoin="round" />
            <circle cx={px(shownV)} cy={py(shownPH)} r={4} fill="#ffe9a8" />
            <text x={W - 8} y={H - 18} textAnchor="end" fontSize="10.5" fill="rgb(255 255 255 / 0.55)">盐酸 / mL</text>
          </svg>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'phenol'} pulse={next === 'phenol'} onClick={() => drip.run()} disabled={busy || drop.busy || phenol}>滴酚酞</LabButton>
        <LabButton primary={next === 'fast'} pulse={next === 'fast'} onClick={() => fast.run()} disabled={busy || drop.busy || !phenol || cV >= FAST}>放到 19.50 mL</LabButton>
        <HoldButton pulse={next === 'drop'} onStep={() => { if (!drop.busy) drop.run() }} onHold={() => setHolding(true)} onRelease={() => setHolding(false)} disabled={busy || cV < FAST || cV >= 2500}>滴一滴</HoldButton>
      </>}
      extras={null}
    />
  )
}
