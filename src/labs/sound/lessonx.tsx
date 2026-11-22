// 声现象 · 拓展课：三个小专题。一支音叉让另一支响起来（共鸣，声能传递能量）、听不见的声音（超声波和次声波）、用声音量海深（声呐）。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, lathe, useTasks, type Label } from '@/lab-kit'
import { BallStand, ENV, FORK, Fork, Hall, Hose, Mallet, P, Readout, Rings, SWING, Scope, ringing, useWood, type Hit, type Pose } from './gear'
import { LESSONS, goLesson } from './lessons'
import { FORK_HZ, HEAR, SONAR_T, V_WATER, band, frontAt, seaDepth, sweep } from './physics'

type Sub = 'reso' | 'hear' | 'sonar'
const SUBS: Record<Sub, { name: string; title: string; say: string; button: string }> = {
  reso: { name: '隔空把它敲响', title: '声音能传递能量', button: '敲响左边的音叉', say: `两支音叉都是 ${FORK_HZ} Hz，共鸣箱的开口相对。敲响左边那支，声波穿过空气传到右边，右边那支也跟着振动起来，把乒乓球弹开：这叫共鸣。没有人碰右边的音叉，是声波把能量带了过去。用超声波清洗眼镜、击碎人体内的结石，也是在用声音传递的能量。` },
  hear: { name: '听不见的声音', title: `人只能听到 ${HEAR[0]} Hz 到 ${HEAR[1]} Hz 的声音`, button: '从低到高扫一遍', say: `频率低于 ${HEAR[0]} Hz 的声音叫次声波，高于 ${HEAR[1]} Hz 的叫超声波，人都听不到，但它们和听得见的声音一样是物体振动产生的。蝙蝠用超声波探路，医院用超声波做检查；地震、台风会发出次声波。` },
  sonar: { name: '用声音量海深', title: '声呐：靠回声测距离', button: '发出超声波', say: `船底的声呐向海底发出一束超声波，${SONAR_T} s 后收到回声。海水里的声速约 ${V_WATER} m/s，声音走了一个来回，所以海深是 ${V_WATER} × ${SONAR_T} ÷ 2 = ${seaDepth(SONAR_T)} m。倒车雷达、医院的超声检查用的是同一个办法。` },
}
const ORDER: Sub[] = ['reso', 'hear', 'sonar']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))
const AX = -1.9, BX = 1.3
const REST: Pose = { p: [AX - 0.5, 0.11, 1.08], a: 0.06 }, STRIKE: Pose = { p: [AX - FORK.dx - FORK.half - 0.11, FORK.top - 0.3, 0], a: 0.75 }
const CONE = lathe([[0, 0.02], [0.14, 0.02], [0.2, 0.08], [0.42, 0.2], [0.47, 0.22], [0.5, 0.2], [0.52, 0.2], [0.52, 0.16], [0, 0.0]], { segs: 40 })
const hz = (f: number) => f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k` : f.toFixed(0)
/** 船身的侧面轮廓 */
const HULL = (() => {
  const s = new THREE.Shape(); s.moveTo(-0.75, 0.12); s.lineTo(0.9, 0.12); s.lineTo(0.7, -0.14); s.lineTo(-0.62, -0.14); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.44, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }); g.translate(0, 0, -0.22)
  return g
})()
const WD = 2.0, TANK = { w: 5.6, d: 1.5 }       // 水深（画面里）、水槽的宽和进深

/** 扬声器的纸盆：响的时候前后颤 */
function Cone({ level }: { level: () => number }) {
  const g = useRef<THREE.Group>(null), f = useRef(level); f.current = level
  useFrame(({ clock }) => { if (g.current) g.current.position.z = 0.02 * f.current() * Math.sin(clock.elapsedTime * 30) })
  return <group ref={g}><mesh geometry={CONE} rotation-x={Math.PI / 2}><meshStandardMaterial color="#23262a" roughness={0.8} side={THREE.DoubleSide} /></mesh><mesh position-z={0.06}><sphereGeometry args={[0.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#15171a" roughness={0.5} /></mesh></group>
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('reso')
  const [did, setDid] = useState<Sub[]>([])
  const [t0, setT0] = useState<number | null>(null)      // 这个专题的按钮是什么时候按下的
  const [tr, setTr] = useState(0)                         // 按下之后过了几秒
  const T = useTasks('gewu:sound:x', TASKS)
  const wood = useWood('dark')
  const LEN: Record<Sub, number> = { reso: 2.2, hear: 9, sonar: SONAR_T }
  const on = did.includes(sub), busy = t0 != null && tr < LEN[sub]
  useEffect(() => {
    if (t0 == null) return
    let raf = 0
    const frame = () => { const t = Math.min(LEN[sub], (performance.now() - t0) / 1000); setTr(t); if (t < LEN[sub]) raf = requestAnimationFrame(frame); else setDid(d => { const n = d.includes(sub) ? d : [...d, sub]; T.check(id => n.includes(id as Sub)); return n }) }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [t0])   // eslint-disable-line react-hooks/exhaustive-deps
  const act = () => { if (busy) return; setTr(0); setT0(performance.now()) }
  const pick = (s: Sub) => { if (busy) return; setSub(s); setT0(null); setTr(0) }
  const resetAll = () => { setSub('reso'); setDid([]); setT0(null); setTr(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '三个专题都看完了。', next: null }
    : busy ? { hint: sub === 'reso' ? '盯住右边那只乒乓球…' : sub === 'hear' ? '频率在升高：看它什么时候进入、什么时候离开听得见的范围' : '超声波朝海底去了…', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }
  // 共鸣：左边的音叉被敲响；右边的慢半拍跟着响起来
  const hitA: Hit | null = useMemo(() => sub === 'reso' && t0 != null ? { t: t0 + SWING, amp: 1 } : null, [sub, t0])
  const lvA = () => ringing(hitA, 3), lvB = () => !hitA ? 0 : Math.min(1, Math.max(0, (performance.now() - hitA.t) / 900)) * 0.75 * ringing(hitA, 3.4)
  // 扫频
  const f = sweep(sub === 'hear' && t0 != null ? tr / LEN.hear : 0), heardNow = band(f) === '听得见', sweeping = sub === 'hear' && t0 != null && busy
  // 声呐：波前现在在水下多深（按 3000 m 对应画面里的水深换算）
  const depth = seaDepth(SONAR_T), pinging = sub === 'sonar' && t0 != null && busy, back = sub === 'sonar' && t0 != null && !busy
  const labels: Label[] = sub === 'reso' ? [
    { id: 'a', at: P('fork', AX, FORK.top + 0.2), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `被敲的音叉 · ${FORK_HZ} Hz` },
    { id: 'b', at: P('fork', BX, FORK.top + 0.2), ax: 0.5, className: `scene-tag -translate-y-full${on || busy ? ' key' : ''}`, children: on || (busy && tr > 1) ? '没人碰它，也振动起来了' : `另一支音叉 · ${FORK_HZ} Hz` },
  ] : sub === 'hear' ? [
    { id: 'f', at: P('ruler', -2.4, 2.25), ax: 0.5, className: `scene-tag -translate-y-full${heardNow && t0 != null ? ' key' : ''}`, children: <><small>{t0 == null ? '信号源' : band(f)}</small>{hz(f)} Hz</> },
    { id: 's', at: P('ruler', -2.4, 0.05, 1.2), ax: 0.5, name: true, className: 'scene-name', children: '扬声器' },
  ] : [
    { id: 't', at: P('hall', 1.2, WD + 0.95), className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: t0 != null ? 1 : 0 }, children: <><small>{back ? '回声回来用了' : '已经过了'}</small>{tr.toFixed(1)} s</> },
    { id: 'd', at: P('hall', -1.3, WD / 2 + 0.3, 0.8), ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: back || (on && t0 == null) ? 1 : 0 }, children: <><small>海深</small>{depth} m</> },
    { id: 'n', at: P('hall', 0, 0.05, 1.3), ax: 0.5, name: true, className: 'scene-name', children: '海的剖面模型 · 不按比例' },
  ]
  const stage = sub === 'reso' ? (
    <Hall at="fork" labels={labels}>
      <Fork x={AX} level={lvA} open={1} />
      <Fork x={BX} level={lvB} open={-1} />
      <BallStand x={BX + 1.75} to={[BX + FORK.dx + FORK.half + 0.1, FORK.top + 0.85]} len={1.05} dir={1} level={lvB} />
      <Mallet rest={REST} hit={STRIKE} t0={hitA ? hitA.t - SWING : null} />
      <Rings at={[AX, FORK.top - 0.4, 0]} level={lvA} r0={0.25} r1={3.2} n={6} />
      <Rings at={[BX, FORK.top - 0.4, 0]} level={lvB} r0={0.2} r1={1.2} n={3} color="#7fe3d4" />
    </Hall>
  ) : sub === 'hear' ? (
    <Hall at="ruler" labels={labels}>
      {/* 扬声器：一只木箱，正面一只纸盆 */}
      <group position={[-2.4, 0, 0]}>
        <RoundedBox args={[1.5, 1.8, 1.2]} radius={0.05} position-y={0.94} castShadow><meshPhysicalMaterial map={wood} roughness={0.45} clearcoat={0.5} /></RoundedBox>
        {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 0.6, 0.02, sz * 0.45]}><cylinderGeometry args={[0.07, 0.07, 0.04, 12]} /><meshStandardMaterial color="#101113" roughness={0.85} /></mesh>))}
        <mesh position={[0, 1.0, 0.6]}><torusGeometry args={[0.54, 0.035, 10, 40]} /><Metal kind="aluminum" grain="turned" env={ENV} /></mesh>
        <group position={[0, 1.0, 0.42]}><Cone level={() => sweeping ? 1 : 0} /></group>
      </group>
      <Readout x={0.1} z={0.3} text={`${hz(f)} Hz`} w={1.5} />
      <Hose r={0.018} pts={[[-1.65, 0.3, -0.3], [-1.2, 0.03, -0.4], [-0.4, 0.03, -0.2], [0.1, 0.2, 0.02]]} />
      <Hose r={0.018} pts={[[0.6, 0.2, 0.05], [1.2, 0.03, 0.2], [2.2, 0.03, 1.1], [3.4, 0.1, 1.05], [3.83, 0.42, 0.84]]} />
      <Scope x={3.3} trace={t => !sweeping ? null : u => 0.8 * Math.sin(Math.PI * 2 * (1.2 + 13 * tr / LEN.hear) * u - t * 5)} />
      <Rings at={[-2.4, 1.0, 0.65]} level={() => sweeping ? 1 : 0} color={heardNow ? '#8fd3ff' : '#8a8f96'} r0={0.5} r1={2.6} n={Math.round(3 + 5 * tr / LEN.hear)} speed={0.4} />
    </Hall>
  ) : (
    <Hall at="hall" labels={labels}>
      {/* 一只玻璃水槽当作海：水面上一条船，槽底铺着沙和几块石头 */}
      <RoundedBox args={[TANK.w + 0.3, 0.12, TANK.d + 0.3]} radius={0.03} position-y={0.06} castShadow><meshStandardMaterial color="#17181a" roughness={0.6} /></RoundedBox>
      <mesh position-y={0.12 + 0.13}><boxGeometry args={[TANK.w - 0.02, 0.26, TANK.d - 0.02]} /><meshStandardMaterial color="#b89a66" roughness={1} /></mesh>
      {([[-1.9, 0.2, 0.3], [-0.9, 0.14, -0.3], [1.4, 0.24, 0.2], [2.2, 0.16, -0.35]] as const).map(([x, r, z]) => <mesh key={x} position={[x, 0.38 + r * 0.4, z]} scale={[1.5, 0.8, 1.1]}><dodecahedronGeometry args={[r, 1]} /><meshStandardMaterial color="#6b6257" roughness={0.95} flatShading /></mesh>)}
      <mesh position-y={0.12 + (WD + 0.26) / 2} renderOrder={3}><boxGeometry args={[TANK.w - 0.04, WD + 0.26, TANK.d - 0.04]} /><meshStandardMaterial color="#1d5f9a" transparent opacity={0.24} roughness={0.15} depthWrite={false} /></mesh>
      <mesh position-y={0.12 + (WD + 0.7) / 2} renderOrder={4}><boxGeometry args={[TANK.w, WD + 0.7, TANK.d]} /><meshPhysicalMaterial color="#d4ecf2" transparent opacity={0.1} roughness={0.03} clearcoat={1} envMapIntensity={2.4} depthWrite={false} /></mesh>
      {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * TANK.w / 2, 0.12 + (WD + 0.7) / 2, sz * TANK.d / 2]}><boxGeometry args={[0.035, WD + 0.7, 0.035]} /><Metal kind="aluminum" grain="brushed" rough={0.5} env={1.2} /></mesh>))}
      <group position={[0, 0.38 + WD, 0]}>
        <mesh geometry={HULL} castShadow><meshPhysicalMaterial color="#b8372d" roughness={0.4} clearcoat={0.6} /></mesh>
        <RoundedBox args={[0.6, 0.26, 0.36]} radius={0.03} position={[-0.2, 0.28, 0]}><meshStandardMaterial color="#e9e3d2" roughness={0.6} /></RoundedBox>
        <mesh position={[0.05, 0.52, 0]}><cylinderGeometry args={[0.07, 0.08, 0.26, 14]} /><meshStandardMaterial color="#23262a" roughness={0.6} /></mesh>
        <mesh position={[0, -0.19, 0]}><cylinderGeometry args={[0.08, 0.06, 0.08, 14]} /><Metal kind="brass" env={ENV} /></mesh>
      </group>
      {/* 超声波：三道横着的亮带，往下是蓝的，回来是黄的 */}
      {pinging && [0, 1, 2].map(i => { const tt = tr - i * 0.12; if (tt <= 0) return null; const s = frontAt(tt, depth, V_WATER); return <mesh key={i} position={[0, 0.38 + WD - 0.24 - s / depth * (WD - 0.3), 0]} renderOrder={6}><boxGeometry args={[0.9 + s / depth * 1.2, 0.03, 0.9]} /><meshBasicMaterial color={tt * V_WATER <= depth ? '#8fd3ff' : '#ffd24a'} transparent opacity={[0.42, 0.24, 0.12][i]} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh> })}
      <Readout x={3.9} z={0.5} text={`${t0 == null ? '0.0' : tr.toFixed(1)} s`} w={1.1} />
    </Hall>
  )
  return (
    <LabShell title="声现象" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={stage}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">声音能传递能量，也能传递信息</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">共鸣是声音在传递能量；声呐靠回声带回了海底的信息；超声波和次声波，是我们听不见的声音。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
            <div className="mt-1 text-[22px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
          </div>
          {sub === 'hear' && <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="频率" value={`${hz(f)} Hz`} unit="扬声器现在发出的" />
            <ParamTile symbol="人耳" value={t0 == null ? '—' : heardNow ? '听得见' : '听不见'} unit={t0 == null ? '还没开始' : band(f)} />
          </div>}
          {sub === 'sonar' && <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="v" value={`${V_WATER}`} unit="m/s · 海水里" />
            <ParamTile symbol="t" value={back || (on && t0 == null) ? `${SONAR_T}` : t0 != null ? tr.toFixed(1) : '—'} unit="s · 一个来回" />
            <ParamTile symbol="s" value={back || (on && t0 == null) ? `${depth}` : '—'} unit="m · 海深" />
          </div>}
          {sub === 'reso' && <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="左边" value={`${FORK_HZ} Hz`} unit="被槌敲响" />
            <ParamTile symbol="右边" value={`${FORK_HZ} Hz`} unit={on || (busy && tr > 1) ? '跟着振动' : '静止'} />
          </div>}
          {on && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={act} disabled={busy}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} disabled={busy} onChange={pick} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
