// 带电粒子在磁场中 · 拓展课的器材：大厅东头的展示角。左边一台磁流体发电机模型：一段方形通道（前壁透明），上下两块铜电极板，
// 前后一对磁极（前磁极透视），磁场垂直纸面向里；通道右端接一只灯泡和一块电压表。右边一只地球仪（地磁场模型），
// 周围画着地磁场的磁感线；太阳风从左边吹来，带电粒子绕着磁感线螺旋前进，落到两极上空，亮起一圈绿色的极光。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, RoundedBox, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, disc } from '@/lab-kit'
import { COL, ST } from './layout'
import { makeText, rng } from './mats'
import { mhdVoltage, type V3 } from './physics'
import { Wire } from './gear'
import { Comet, FieldMarks, Glow } from './fx'

/** 两件展品的位置（相对这一课）：发电机通道的中心、地球仪的球心和半径 */
export const RX = { duct: [-0.55, 1.05, 0] as V3, len: 0.6, h: 0.2, globe: [0.75, 1.1, 0] as V3, R: 0.18 }
const BLUE = '#2d5aa8'

// ---------- 磁流体发电机 ----------
/** 通道里的离子：每颗有自己的高度、速度、正负；charge 从 0 到 1 表示两板上积累的电荷（满了以后离子直着走） */
function Plasma({ on, field, charge }: { on: boolean; field: boolean; charge: () => number }) {
  const N = 70, pos = useRef<THREE.InstancedMesh>(null), neg = useRef<THREE.InstancedMesh>(null)
  const seeds = useMemo(() => { const r = rng(5); return Array.from({ length: N }, () => ({ x: r(), y: (r() - 0.5) * 0.8, v: 0.8 + r() * 0.4, s: r() < 0.5 ? 1 : -1 })) }, [])
  const m = useMemo(() => new THREE.Matrix4(), []), t0 = useRef(0)
  useFrame((_, d) => {
    t0.current += Math.min(d, 1 / 30)
    const P = pos.current, Q = neg.current; if (!P || !Q) return
    let ip = 0, iq = 0
    const L = RX.len, H = RX.h, k = charge()
    for (const s of seeds) {
      const u = ((s.x + t0.current * 0.25 * s.v) % 1), x = -L / 2 + u * L
      // 刚进磁场时偏得多；两板电荷越积越多，电场力抵消洛伦兹力，后来的离子就直着走
      const drift = on && field ? s.s * (1 - k) * Math.min(1, u * 1.6) * (H / 2 - 0.012) : 0
      const y = Math.max(-H / 2 + 0.01, Math.min(H / 2 - 0.01, s.y * H / 2 * (1 - Math.abs(drift) / (H / 2)) + drift))
      const sc = on ? 1 : 0
      m.makeScale(sc, sc, sc).setPosition(RX.duct[0] + x, RX.duct[1] + y, (s.x - 0.5) * 0.06)
      if (s.s > 0) P.setMatrixAt(ip++, m); else Q.setMatrixAt(iq++, m)
    }
    P.count = ip; Q.count = iq; P.instanceMatrix.needsUpdate = true; Q.instanceMatrix.needsUpdate = true
  })
  return <>
    <instancedMesh ref={pos} args={[undefined, undefined, N]} frustumCulled={false} renderOrder={7}><sphereGeometry args={[0.005, 10, 8]} /><meshBasicMaterial color={COL.pos} toneMapped={false} /></instancedMesh>
    <instancedMesh ref={neg} args={[undefined, undefined, N]} frustumCulled={false} renderOrder={7}><sphereGeometry args={[0.005, 10, 8]} /><meshBasicMaterial color={COL.neg} toneMapped={false} /></instancedMesh>
  </>
}

function Generator({ on, lamp, charge, k }: { on: boolean; lamp: boolean; charge: () => number; k: number }) {
  const [x, y] = RX.duct, L = RX.len, H = RX.h
  const ghost = <meshBasicMaterial color="#9fc0ff" transparent opacity={0.03} depthWrite={false} />
  const plus = makeText(['+'], { w: 128, h: 128, bg: 'transparent', fg: '#ff8a7a', size: 110, weight: 700 }), minus = makeText(['−'], { w: 128, h: 128, bg: 'transparent', fg: '#7fb6ff', size: 110, weight: 700 })
  const nozzle = useMemo(() => disc(0.13, 0.05, { hole: 0.02, segs: 40 }), [])
  const lit = lamp && k > 0.6
  const U = mhdVoltage() * k
  return <group>
    {/* 支架 */}
    <mesh position={[x, (y - H / 2 - 0.08) / 2, -0.05]} castShadow><boxGeometry args={[0.08, y - H / 2 - 0.08, 0.08]} /><meshStandardMaterial color="#4a525a" roughness={0.5} metalness={0.4} /></mesh>
    <mesh position={[x, 0.015, -0.05]}><boxGeometry args={[0.5, 0.03, 0.4]} /><meshStandardMaterial color="#3c434a" roughness={0.6} metalness={0.4} /></mesh>
    {/* 通道：后壁深色，前壁透明玻璃；上下两块铜电极 */}
    <mesh position={[x, y, -0.05]}><boxGeometry args={[L, H + 0.02, 0.01]} /><meshStandardMaterial color="#1e2327" roughness={0.6} /></mesh>
    <mesh position={[x, y, 0.05]} renderOrder={9}><boxGeometry args={[L, H + 0.02, 0.006]} /><meshPhysicalMaterial color="#e8f2f5" transparent opacity={0.1} roughness={0.03} clearcoat={1} depthWrite={false} /></mesh>
    {[1, -1].map(s => <group key={s}>
      <RoundedBox args={[L, 0.012, 0.1]} radius={0.002} smoothness={2} position={[x, y + s * (H / 2 + 0.006), 0]} castShadow><Metal kind="copper" grain="brushed" /></RoundedBox>
      <mesh position={[x - L / 2 + 0.03, y + s * (H / 2 - 0.02), 0.054]}><planeGeometry args={[0.03, 0.03]} /><meshBasicMaterial map={s > 0 ? plus : minus} transparent toneMapped={false} opacity={k > 0.2 ? 1 : 0} /></mesh>
    </group>)}
    {/* 左端的燃烧室喷口，后面实画的磁极，前面透视的磁极 */}
    <group position={[x - L / 2 - 0.025, y, 0]} rotation-z={Math.PI / 2}><mesh geometry={nozzle} castShadow><Metal kind="stainless" grain="turned" /></mesh></group>
    <mesh position={[x - L / 2 - 0.09, y, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.1, 0.12, 0.1, 32]} /><Metal kind="steel" grain="turned" /></mesh>
    <RoundedBox args={[L * 0.8, H * 0.95, 0.08]} radius={0.01} smoothness={2} position={[x, y, -0.1]} castShadow><meshPhysicalMaterial color={BLUE} roughness={0.38} clearcoat={0.5} /></RoundedBox>
    <mesh position={[x, y, 0.1]}><boxGeometry args={[L * 0.8, H * 0.95, 0.08]} />{ghost}<Edges threshold={20} color="#8fb0f0" /></mesh>
    <FieldMarks w={L * 0.8} h={H} kind="in" step={0.04} opacity={on ? 0.7 : 0.35} position={[x, y, 0.056]} />
    <Plasma on={on} field charge={charge} />
    {/* 外电路：上板 → 灯泡 → 下板；电压表并在两板上 */}
    <Wire pts={[[x + L / 2 - 0.02, y + H / 2 + 0.012, 0], [x + L / 2 + 0.06, y + H / 2 + 0.07, 0], [x + L / 2 + 0.16, y + 0.06, 0.02], [x + L / 2 + 0.17, y + 0.035, 0.02]]} color="#c4302a" flow={lit ? 1 : 0} />
    <Wire pts={[[x + L / 2 - 0.02, y - H / 2 - 0.012, 0], [x + L / 2 + 0.06, y - H / 2 - 0.07, 0], [x + L / 2 + 0.16, y - 0.08, 0.02], [x + L / 2 + 0.17, y - 0.035, 0.02]]} color="#1c1d1f" flow={lit ? -1 : 0} />
    <group position={[x + L / 2 + 0.17, y, 0.02]}>
      <mesh position={[0, -0.02, 0]}><cylinderGeometry args={[0.012, 0.014, 0.03, 20]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh position={[0, 0.02, 0]}><sphereGeometry args={[0.028, 24, 18]} /><meshPhysicalMaterial color={lit ? '#fff1c4' : '#f4f1e8'} emissive={lit ? '#ffcf6b' : '#000'} emissiveIntensity={lit ? 3 : 0} transparent opacity={lit ? 1 : 0.4} roughness={0.1} toneMapped={!lit} /></mesh>
      {lit && <pointLight position={[0, 0.02, 0.05]} intensity={0.8} distance={1.2} color="#ffd38a" />}
    </group>
    <group position={[x + 0.1, y - H / 2 - 0.09, 0.07]}>
      <RoundedBox args={[0.14, 0.07, 0.04]} radius={0.006} smoothness={2} castShadow><meshPhysicalMaterial color="#e6e2d8" roughness={0.4} clearcoat={0.4} /></RoundedBox>
      <Led text={`${Math.round(U)}V`} w={0.1} h={0.04} position={[0, 0, 0.021]} />
    </group>
  </group>
}

// ---------- 地磁场模型和极光 ----------
/** 偶极磁场的一根磁感线：r = L·sin²θ（θ 从北极量起），φ 是它所在的经度面。返回从北到南的点 */
function dipoleLine(Lr: number, phi: number, R: number): V3[] {
  const pts: V3[] = [], th0 = Math.asin(Math.sqrt(R / Lr))
  for (let i = 0; i <= 60; i++) {
    const th = th0 + (Math.PI - 2 * th0) * i / 60, r = Lr * Math.sin(th) ** 2
    pts.push([r * Math.sin(th) * Math.cos(phi), r * Math.cos(th), r * Math.sin(th) * Math.sin(phi)])
  }
  return pts
}

function Globe({ wind, clock }: { wind: boolean; clock: () => number }) {
  const day = useTexture('/assets/tex/earth_day.jpg')
  const R = RX.R, c = RX.globe
  const lines = useMemo(() => [1.6, 2.2, 3.0].flatMap(L => [0, 1, 2, 3, 4, 5].map(k => dipoleLine(L * R, k * Math.PI / 3 + 0.3, R))), [R])
  // 太阳风的粒子：从左边飞来，抓住一根磁感线，绕着它螺旋着滑向北极或南极
  const tracks = useMemo(() => {
    const r = rng(9)
    return Array.from({ length: 10 }, (_, i) => {
      const north = i % 2 === 0, phi = Math.PI + (r() - 0.5) * 1.2, Lr = (2.4 + r() * 1.2) * R, th0 = Math.asin(Math.sqrt(R / Lr))
      const line = (u: number): V3 => {   // u 从 0（赤道面）到 1（落到大气层）
        const th = Math.PI / 2 + (north ? -1 : 1) * (Math.PI / 2 - th0) * u, rr = Lr * Math.sin(th) ** 2
        return [rr * Math.sin(th) * Math.cos(phi), rr * Math.cos(th), rr * Math.sin(th) * Math.sin(phi)]
      }
      return { line, phase: r(), sign: north ? 1 : -1 }
    })
  }, [R])
  const posOf = (k: number) => (t: number): V3 | null => {
    if (!wind || t < 0) return null
    const tr = tracks[k], u = ((t / 3.2 + tr.phase) % 1)
    // 前 30%：从左边远处直线飞来；之后沿磁感线螺旋滑向两极
    if (u < 0.3) { const a = tr.line(0), s = 1 - u / 0.3; return [c[0] + a[0] - s * 0.9, c[1] + a[1] + s * 0.05 * tr.sign, c[2] + a[2]] }
    const w = (u - 0.3) / 0.7, p = tr.line(w), q = tr.line(Math.min(1, w + 0.01))
    const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]).normalize(), a = new THREE.Vector3(0, 0, 1).cross(d).normalize(), b = d.clone().cross(a)
    const rad = 0.018 * (1 - w * 0.7), ang = w * 60
    return [c[0] + p[0] + (a.x * Math.cos(ang) + b.x * Math.sin(ang)) * rad, c[1] + p[1] + (a.y * Math.cos(ang) + b.y * Math.sin(ang)) * rad, c[2] + p[2] + (a.z * Math.cos(ang) + b.z * Math.sin(ang)) * rad]
  }
  const oval = useRef<THREE.Group>(null), lvl = useRef(0)
  useFrame((_, d) => { lvl.current += ((wind ? 1 : 0) - lvl.current) * Math.min(1, d * 0.8); if (oval.current) oval.current.children.forEach(m => (((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.75 * lvl.current)) })
  const ovalLat = 0.36   // 极光带离磁极的角距离（弧度，约 20°）
  return <group>
    {/* 底座和支架 */}
    <mesh position={[c[0], (c[1] - R - 0.12) / 2, c[2]]} castShadow><cylinderGeometry args={[0.02, 0.03, c[1] - R - 0.12, 20]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[c[0], 0.02, c[2]]}><cylinderGeometry args={[0.18, 0.2, 0.04, 40]} /><meshPhysicalMaterial color="#2a2c2f" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh position={[c[0], c[1], c[2]]} rotation-z={0.2}><torusGeometry args={[R + 0.03, 0.006, 10, 64, Math.PI]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={c} castShadow><sphereGeometry args={[R, 64, 48]} /><meshStandardMaterial map={day} roughness={0.7} /></mesh>
    {/* 磁感线 */}
    {lines.map((l, i) => <Glow key={i} pts={l.map(p => [c[0] + p[0], c[1] + p[1], c[2] + p[2]] as V3)} color={COL.B} level={0.4} r={0.0012} halo={2.5} />)}
    {/* 极光带：两极上空一圈绿光 */}
    <group ref={oval}>
      {[1, -1].map(s => <mesh key={s} position={[c[0], c[1] + s * (R + 0.006) * Math.cos(ovalLat), c[2]]} rotation-x={Math.PI / 2}><torusGeometry args={[(R + 0.006) * Math.sin(ovalLat), 0.0045, 10, 64]} /><meshBasicMaterial color="#5dffa0" transparent opacity={0} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>)}
    </group>
    {tracks.map((_, k) => <Comet key={k} pos={posOf(k)} clock={clock} color={k % 2 ? COL.neg : COL.pos} size={0.006} tail={0.5} n={26} />)}
  </group>
}

/** gen：发电机喷入了等离子体；lamp：接上了灯泡；k：两板电荷积累的程度（0–1）；wind：太阳风吹着；clock：画面里的时间 */
export function RigX({ gen = false, lamp = false, k = 0, wind = false, clock = () => -1 }: { gen?: boolean; lamp?: boolean; k?: number; wind?: boolean; clock?: () => number }) {
  const kk = useRef(k); kk.current = k
  const sign = makeText(['展示角'], { w: 256, h: 64, bg: '#1d4f7a', fg: '#ffffff', size: 36 })
  return <group position={[ST.x, 0, 0]}>
    {/* 展示角的地台：一块深色地毯和一块立牌 */}
    <mesh rotation-x={-Math.PI / 2} position={[0.1, 0.004, 0]} receiveShadow><planeGeometry args={[2.6, 1.4]} /><meshStandardMaterial color="#26292c" roughness={0.95} /></mesh>
    <mesh position={[0.1, 2.0, -0.6]}><planeGeometry args={[0.6, 0.15]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
    <Generator on={gen} lamp={lamp} charge={() => kk.current} k={k} />
    <Globe wind={wind} clock={clock} />
  </group>
}
