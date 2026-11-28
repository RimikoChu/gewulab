// 静电场 · 第 7 课 粒子的偏转的器材：一台放大 10 倍的喷码机打印头教学模型，装在一块带方格的背板上。
// 从左到右：喷嘴（不停地喷出一串墨滴）、充电电极（给选中的墨滴带上电）、一对偏转板（上负下正，中间是向上的匀强电场）、
// 回收槽（不带电的墨滴直飞进去，流回墨箱）、纸。带电的墨滴在偏转板里做类平抛运动，出板后沿直线飞到纸上。
// 拓展课也用这台模型：纸带匀速走过，一列一列打出点阵字。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe, shell } from '@/lab-kit'
import { COL, ST, TOP } from './layout'
import { makeGrid, makeText } from './mats'
import { JET, jetPath, type V3 } from './physics'
import { Comet, FieldLines, Glow, Sign } from './fx'
import { Bakelite, Cable, Supply } from './gear'

/** 模型放大的倍数；墨滴轴线的高度；喷嘴口、偏转板入口、回收槽口、纸面的 x（模型里的米） */
const S = 10
export const R7 = { S, y: 0.27, nozzle: -0.335, in: -0.1, gutter: 0.3, paper: -0.1 + (JET.L + JET.D) * S, back: -0.08 }
/** 墨滴飞到模型里 x 处时的位置（q、U 是它的电荷量和偏转电压） */
export const dropAt = (q: number, U: number, x: number, z = 0): V3 => [x, R7.y + S * jetPath(q, U, (x - R7.in) / S), z]

/** 喷嘴不停喷出的那串不带电的墨滴：匀速飞进回收槽 */
function Stream({ speed = 0.5 }: { speed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), n = 15, len = R7.gutter + 0.02 - R7.nozzle, t = useRef(0)
  const m = useMemo(() => new THREE.Matrix4(), [])
  useFrame((_, dt) => {
    t.current += Math.min(dt, 1 / 30) * speed
    for (let i = 0; i < n; i++) { const x = R7.nozzle + ((i / n * len + t.current) % len); m.makeTranslation(x, R7.y, 0); ref.current?.setMatrixAt(i, m) }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}><sphereGeometry args={[0.0046, 14, 10]} /><meshStandardMaterial color="#0d2a3a" emissive={COL.ink} emissiveIntensity={0.6} roughness={0.2} /></instancedMesh>
}

export interface Shot { q: number; U: number; t0: number }
/**
 * U：偏转电压；shots：正在飞的带电墨滴（t0 是出发的时刻）；clock：画面里的时间；speed：墨滴在画面上的速度；
 * trace：画出哪一条轨迹；dots：纸上已经打出的点（y 是真实的侧移，z 是在纸带上的位置）；paperZ：纸带走过的距离；strip：纸换成长纸带
 */
export function Rig7({ U = JET.U, shots = [], clock = () => -1, speed = 0.5, trace = null, dots = [], paperZ = 0, strip = false, screen = [] }: { U?: number; shots?: Shot[]; clock?: () => number; speed?: number; trace?: { q: number; U: number } | null; dots?: { y: number; z: number }[]; paperZ?: number; strip?: boolean; screen?: { c: number; k: number }[] }) {
  const geo = useMemo(() => ({
    nozzle: lathe([[0, 0], [0.022, 0], [0.022, 0.03], [0.008, 0.052], [0.004, 0.065], [0, 0.065]]),
    gutter: shell([[0.009, 0], [0.009, 0.06]], 0.002, { segs: 32 }),
  }), [])
  const grid = makeGrid([45, 21]), paper = makeGrid([15, 10], '#f4f1e8', 'rgba(60,70,80,0.16)', 'rgba(60,70,80,0.34)')
  const plate = makeText(['打印头模型  放大 10 倍'], { w: 640, h: 80, bg: '#d8d6cf', fg: '#22313f', size: 40 })
  const y = R7.y, half = JET.d * S / 2, L = JET.L * S
  const lines = useMemo(() => [0.02, 0.06, 0.1, 0.14, 0.18].map(dx => [[R7.in + dx, y - half + 0.004, 0], [R7.in + dx, y + half - 0.004, 0]] as V3[]), [y, half])
  const tracePts = useMemo(() => trace ? Array.from({ length: 30 }, (_, i) => dropAt(trace.q, trace.U, R7.nozzle + (i / 29) * ((trace.q > 0 ? R7.paper : R7.gutter) - R7.nozzle))) : [], [trace?.q, trace?.U])   // eslint-disable-line react-hooks/exhaustive-deps
  const pw = strip ? 0.5 : 0.24
  return <group position={[ST.l7, TOP, 0]}>
    {/* 底座、带方格的背板（每小格是真实的 2 mm）、铭牌 */}
    <RoundedBox args={[0.94, 0.03, 0.24]} radius={0.006} smoothness={3} position={[0.01, 0.015, -0.01]} castShadow receiveShadow><meshPhysicalMaterial color="#2b3035" roughness={0.45} clearcoat={0.4} /></RoundedBox>
    <RoundedBox args={[0.9, 0.42, 0.01]} radius={0.004} position={[0, 0.24, R7.back - 0.005]} castShadow receiveShadow><meshStandardMaterial color="#20262b" roughness={0.6} /></RoundedBox>
    <mesh position={[0, 0.24, R7.back + 0.0006]}><planeGeometry args={[0.9, 0.42]} /><meshStandardMaterial map={grid} roughness={0.7} /></mesh>
    <mesh position={[-0.28, 0.015, 0.1105]}><planeGeometry args={[0.2, 0.024]} /><meshStandardMaterial map={plate} roughness={0.6} /></mesh>
    {/* 喷嘴：不锈钢喷嘴体，后面接供墨的软管 */}
    <RoundedBox args={[0.07, 0.075, 0.075]} radius={0.006} position={[-0.435, y, 0]} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
    <mesh position={[-0.435, y, -0.06]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.012, 0.012, 0.05, 16]} /><Bakelite /></mesh>
    <mesh geometry={geo.nozzle} position={[-0.4, y, 0]} rotation-z={-Math.PI / 2} castShadow><Metal kind="stainless" grain="turned" /></mesh>
    <Cable r={0.007} color="#1c1d1f" pts={[[-0.435, y + 0.037, 0], [-0.44, y + 0.11, -0.01], [-0.42, y + 0.16, -0.05], [-0.4, y + 0.16, R7.back]]} />
    {/* 充电电极：上下两片黄铜，夹着墨滴的路 */}
    {[-1, 1].map(s => <RoundedBox key={s} args={[0.07, 0.008, 0.05]} radius={0.002} position={[-0.235, y + s * 0.022, 0]} castShadow><Metal kind="brass" grain="brushed" /></RoundedBox>)}
    <RoundedBox args={[0.05, 0.075, 0.05]} radius={0.004} position={[-0.235, y, R7.back + 0.03]} castShadow><Bakelite /></RoundedBox>
    {/* 偏转板：上板接负，下板接正；各由两只胶木座固定在背板上 */}
    {[-1, 1].map(s => <group key={s}>
      <RoundedBox args={[L, 0.008, 0.075]} radius={0.002} position={[R7.in + L / 2, y + s * (half + 0.004), 0]} castShadow><Metal kind="stainless" grain="brushed" rough={0.3} /></RoundedBox>
      {[0.04, 0.16].map(dx => <RoundedBox key={dx} args={[0.022, 0.022, 0.05]} radius={0.003} position={[R7.in + dx, y + s * (half + 0.019), R7.back + 0.026]} castShadow><Bakelite /></RoundedBox>)}
      <Sign at={[R7.in + L + 0.022, y + s * (half + 0.004), 0.02]} kind={s > 0 ? '−' : '+'} size={0.024} />
    </group>)}
    <FieldLines lines={lines} level={0.4 + 0.5 * U / JET.U} head={0.012} r={0.0011} />
    {/* 回收槽：一截不锈钢管对着墨滴的直线，接一根弯管流回底座里的墨箱 */}
    <mesh geometry={geo.gutter} position={[R7.gutter, y - 0.002, 0]} rotation-z={-Math.PI / 2} castShadow><Metal kind="stainless" grain="turned" /></mesh>
    <Cable r={0.0085} color="#9aa0a4" pts={[[R7.gutter + 0.056, y - 0.002, 0], [R7.gutter + 0.075, y - 0.012, 0], [R7.gutter + 0.08, y - 0.06, -0.01], [R7.gutter + 0.08, 0.03, -0.02]]} />
    {/* 纸：夹在一只立架上；拓展课换成会走的长纸带 */}
    <group position={[R7.paper, 0, 0]}>
      <mesh position={[0.012, 0.11, -0.05]} castShadow><boxGeometry args={[0.012, 0.16, 0.012]} /><Metal kind="aluminum" grain="brushed" rough={0.45} /></mesh>
      <mesh position={[0.012, 0.11, 0.05]} castShadow><boxGeometry args={[0.012, 0.16, 0.012]} /><Metal kind="aluminum" grain="brushed" rough={0.45} /></mesh>
      <RoundedBox args={[0.012, 0.22, 0.26]} radius={0.003} position={[0.012, y + 0.02, 0]} castShadow><meshStandardMaterial color="#3a4046" roughness={0.6} /></RoundedBox>
      <group position={[0, 0, strip ? paperZ + 0.1 : 0]}>
        <mesh position={[0.0035, y + 0.02, 0]} castShadow><boxGeometry args={[0.003, 0.2, pw]} /><meshStandardMaterial color="#f4f1e8" roughness={0.9} /></mesh>
        <mesh position={[0.0015, y + 0.02, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[pw, 0.2]} /><meshStandardMaterial map={paper} roughness={0.9} /></mesh>
        {dots.map((d, i) => <mesh key={i} position={[0.001, y + d.y * S, d.z - (strip ? 0.1 : 0)]} rotation-y={-Math.PI / 2}><circleGeometry args={[0.0032, 16]} /><meshBasicMaterial color="#10202c" /></mesh>)}
      </group>
    </group>
    {/* 检视屏（拓展课）：架在背板上方，把纸带上打出的点阵放大显示 */}
    {strip && <group position={[0.08, 0.63, R7.back]}>
      {[-0.13, 0.13].map(x => <mesh key={x} position={[x, -0.155, -0.012]} castShadow><boxGeometry args={[0.014, 0.07, 0.014]} /><Metal kind="aluminum" grain="brushed" rough={0.45} /></mesh>)}
      <RoundedBox args={[0.36, 0.3, 0.022]} radius={0.008} smoothness={3} castShadow><meshPhysicalMaterial color="#1b1f23" roughness={0.4} clearcoat={0.5} /></RoundedBox>
      <mesh position={[0, 0, 0.0115]}><planeGeometry args={[0.335, 0.275]} /><meshBasicMaterial color="#0a1418" /></mesh>
      {Array.from({ length: 35 }, (_, i) => { const c = i % 5, k = 7 - Math.floor(i / 5), on = screen.some(d => d.c === c && d.k === k); return <mesh key={i} position={[(c - 2) * 0.036, (k - 4) * 0.036, 0.012]}><circleGeometry args={[on ? 0.014 : 0.004, 20]} /><meshBasicMaterial color={on ? COL.ink : '#24424c'} toneMapped={false} /></mesh> })}
    </group>}
    {/* 墨滴：不停喷出的那一串，和被充了电的那几滴 */}
    <Stream speed={speed} />
    {trace && <Glow pts={tracePts} color={COL.ink} r={0.0012} level={0.75} halo={3} />}
    {shots.map((s, i) => <Comet key={`${i}-${s.t0}`} color={s.q > 0 ? COL.pos : COL.ink} size={0.0052} tail={0.16} n={18} clock={clock}
      pos={t => { const x = R7.nozzle + (t - s.t0) * speed; return t < s.t0 || x > (s.q > 0 ? R7.paper : R7.gutter + 0.02) ? null : dropAt(s.q, s.U, x) }} />)}
    {/* 偏转电压的电源 */}
    <group position={[-0.02, 0, 0.26]} rotation-y={-0.1}><Supply text={`${U} V`} name="偏转电压" w={0.2} h={0.1} d={0.16} /></group>
  </group>
}
