// 右边实验台上的器材：钟罩模型（第 4 课）和两瓶澄清石灰水（第 7 课）。器材按 1 cm 一个单位做，放上台时乘 0.1（场景 1 单位 = 10 cm）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { JAR, balloonR, balloonsGain, cloud } from './physics'
import { curveOf, type V3 } from './sdf'

/** 玻璃：便宜的做法（不折射），容器里的东西看得清 */
function Glass({ opacity = 0.16 }: { opacity?: number }) {
  return <meshPhysicalMaterial color="#e8f4f6" roughness={0.04} metalness={0} clearcoat={1} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} envMapIntensity={1.8} />
}
const Rubber = ({ color = '#b8583c' }: { color?: string }) => <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.4} clearcoatRoughness={0.4} />

/** 实验台：黑色环氧树脂台面、钢架、前面一条挡板 */
export function Bench({ at, top, w, d }: { at: V3; top: number; w: number; d: number }) {
  return <group position={at}>
    <RoundedBox args={[w, 0.32, d]} radius={0.05} position={[0, top - 0.16, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#1b1e22" roughness={0.3} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
    <RoundedBox args={[w - 0.4, 0.8, d - 0.4]} radius={0.03} position={[0, top - 0.75, 0]} castShadow><meshPhysicalMaterial color="#2c3137" roughness={0.45} clearcoat={0.3} /></RoundedBox>
    {/* 抽屉：三格，每格一个拉手 */}
    {[-1, 0, 1].map(i => <group key={i} position={[i * (w - 0.6) / 3, top - 0.75, d / 2 - 0.19]}>
      <mesh><boxGeometry args={[(w - 0.6) / 3 - 0.06, 0.7, 0.02]} /><meshStandardMaterial color="#353b42" roughness={0.5} /></mesh>
      <mesh position={[0, 0.12, 0.04]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.025, 0.025, 0.6, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
    </group>)}
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.35), (top - 1.15) / 2, sz * (d / 2 - 0.35)]} castShadow><boxGeometry args={[0.32, top - 1.15, 0.32]} /><Metal kind="steel" grain="brushed" /></mesh>)}
    {/* 台面四周的一道缝 */}
    <mesh position={[0, top - 0.31, d / 2 - 0.02]}><boxGeometry args={[w - 0.1, 0.02, 0.02]} /><meshBasicMaterial color="#000" /></mesh>
  </group>
}

// ---------- 钟罩模型 ----------
/** 钟罩的尺寸（cm）：内半径 JAR.r，罩高 H，下口离台面 LIFT */
const H = 19, LIFT = 9, WALL = 0.35
/** 两个气球挂在 Y 形管两个分支的末端 */
const ARM_X = 3.4, ARM_Y = 9.5
/** 气球的泡：一个略长、上面收尖的泡，半径 1（用时按体积缩放），顶在 y = 1.15 */
function balloonGeo() {
  const pts: [number, number][] = []
  for (let i = 0; i <= 28; i++) { const t = i / 28, a = Math.PI * t; pts.push([Math.max(0.001, Math.sin(a) * (1 - 0.22 * t * t)), -Math.cos(a) * 1.12]) }
  return lathe(pts, { segs: 40, crease: 60 })
}
/** k：橡皮膜拉下的程度（0–1）；钟罩模型自己的坐标原点在罩下口的中心 */
export function BellJar({ k }: { k: number }) {
  const R = JAR.r
  const jar = useMemo(() => shell([[R + WALL, 0], [R + WALL, H - 6], [R * 0.75, H - 2.2], [3.1, H - 0.6], [2.6, H], [2.6, H + 1.4]], WALL, { segs: 72 }), [R])
  const lip = useMemo(() => disc(R + WALL + 0.35, 0.6, { hole: R + WALL - 0.05, chamfer: 0.12, segs: 72 }), [R])
  const stopper = useMemo(() => lathe([[0.001, H - 0.4], [2.35, H - 0.4], [2.7, H + 2.8], [0.001, H + 2.8]], { segs: 40, closed: false }), [])
  const tube = useMemo(() => {
    const stem = curveOf([[0, H + 5.5, 0], [0, H, 0], [0, ARM_Y + 3.5, 0], [0, ARM_Y + 2.2, 0]], 0.2)
    const arm = (s: number) => curveOf([[0, ARM_Y + 2.2, 0], [s * 1.2, ARM_Y + 1.5, 0], [s * ARM_X, ARM_Y + 0.4, 0], [s * ARM_X, ARM_Y - 0.6, 0]], 0.4)
    return [stem, arm(1), arm(-1)].map(c => new THREE.TubeGeometry(c, 40, 0.45, 16))
  }, [])
  const bal = useMemo(() => balloonGeo(), [])
  const mem = useMemo(() => new THREE.CircleGeometry(R + WALL + 0.2, 64, 0, Math.PI * 2), [R])
  const base = useMemo(() => (mem.attributes.position.array as Float32Array).slice(), [mem])
  // 橡皮膜往下凸成一个球冠；中间系着一根拉绳
  useFrame(() => {
    const P = mem.attributes.position.array as Float32Array, h = JAR.pull * k, Rr = R + WALL
    for (let i = 0; i < P.length; i += 3) { const x = base[i], y = base[i + 1], rr = Math.hypot(x, y) / Rr; P[i + 2] = rr < 1 ? h * (1 - rr * rr) : 0 }
    mem.attributes.position.needsUpdate = true; mem.computeVertexNormals()
  })
  const each = JAR.balloon0 + balloonsGain(k) / 2, br = balloonR(each)
  return <group>
    <mesh geometry={jar} renderOrder={6}><Glass /></mesh>
    <mesh geometry={lip} position={[0, -0.3, 0]}><Glass opacity={0.3} /></mesh>
    <mesh geometry={stopper}><meshPhysicalMaterial color="#5a5550" roughness={0.75} /></mesh>
    {tube.map((g, i) => <mesh key={i} geometry={g} renderOrder={5}><Glass opacity={0.35} /></mesh>)}
    {[-1, 1].map(s => <group key={s} position={[s * ARM_X, ARM_Y - 0.6, 0]}>
      {/* 气球的颈套在玻璃管口上，用细绳扎住；泡的大小按里面的气算 */}
      <mesh position={[0, -0.7, 0]}><cylinderGeometry args={[0.55, 0.32, 1.6, 20]} /><meshPhysicalMaterial color="#d84a58" roughness={0.3} clearcoat={0.8} /></mesh>
      <mesh position={[0, -0.25, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.55, 0.1, 8, 24]} /><Rubber color="#d9c86a" /></mesh>
      <mesh geometry={bal} scale={[br, br, br]} position={[0, -1.4 - br * 1.12, 0]} castShadow><meshPhysicalMaterial color="#e0505f" roughness={0.3} clearcoat={0.8} transparent opacity={0.9} sheen={0.4} sheenColor="#ffb0b8" /></mesh>
    </group>)}
    {/* 橡皮膜、扎口的橡皮筋、拉绳 */}
    <mesh geometry={mem} rotation-x={Math.PI / 2} position={[0, 0.05, 0]} castShadow><meshPhysicalMaterial color="#c8553f" roughness={0.55} clearcoat={0.3} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.55, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[R + WALL + 0.12, 0.18, 10, 72]} /><Rubber color="#c09a3a" /></mesh>
    <mesh position={[0, -JAR.pull * k - 1.5, 0]}><cylinderGeometry args={[0.07, 0.07, 3, 8]} /><meshStandardMaterial color="#e8e2d0" roughness={0.9} /></mesh>
    <mesh position={[0, -JAR.pull * k - 3.2, 0]}><sphereGeometry args={[0.55, 20, 14]} /><meshPhysicalMaterial color="#2c6f8f" roughness={0.3} clearcoat={0.8} /></mesh>
  </group>
}
/** 铁架台：底座、立杆、十字夹、夹住罩颈的烧瓶夹 */
export function Stand({ height, clampY, reach }: { height: number; clampY: number; reach: number }) {
  return <group>
    <RoundedBox args={[16, 1.2, 11]} radius={0.3} position={[0, 0.6, 0]} castShadow receiveShadow><meshStandardMaterial color="#2b3036" roughness={0.55} metalness={0.4} /></RoundedBox>
    <mesh position={[0, height / 2, 0]} castShadow><cylinderGeometry args={[0.6, 0.6, height, 24]} /><Metal kind="chrome" /></mesh>
    <RoundedBox args={[2.2, 2.2, 2.2]} radius={0.3} position={[0, clampY, 0]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[reach / 2, clampY, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.4, 0.4, reach, 16]} /><Metal kind="chrome" /></mesh>
    <mesh position={[reach, clampY, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[2.9, 0.35, 10, 40]} /><Metal kind="aluminum" grain="cast" /></mesh>
    <mesh position={[0.9, clampY + 0.4, 1.4]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.5, 0.5, 1.2, 6]} /><Metal kind="brass" grain="turned" /></mesh>
  </group>
}

// ---------- 两瓶澄清石灰水 ----------
const FL = { r: 4.2, h: 14.2, neck: 1.6, level: 4.8 }
const flaskOuter: [number, number][] = [[0, 0], [FL.r - 0.4, 0], [FL.r, 0.45], [FL.r - 0.05, 1.4], [FL.neck + 0.15, FL.h - 3.4], [FL.neck, FL.h - 2.6], [FL.neck, FL.h - 0.3], [FL.neck + 0.25, FL.h]]
/** 锥形瓶里 h 以下的液体（沿瓶的内壁） */
function liquidGeo(h: number) {
  const inR = (y: number) => { if (y < 1.4) return FL.r - 0.25; const t = (y - 1.4) / (FL.h - 3.4 - 1.4); return FL.r - 0.25 + (FL.neck - 0.05 - (FL.r - 0.25)) * t }
  return lathe([[0.001, 0.2], [inR(0.3), 0.2], [inR(1.4), 1.4], [inR(h), h], [0.001, h]], { segs: 48 })
}
/** 一个装石灰水的锥形瓶：瓶塞上插两根玻璃管，长管通到液面下。murk：浑浊程度；bubbling：正在冒泡 */
export function Flask({ murk, bubbling }: { murk: number; bubbling: boolean }) {
  const glass = useMemo(() => shell(flaskOuter, 0.18, { segs: 56 }), [])
  const liq = useMemo(() => liquidGeo(FL.level), [])
  const stopper = useMemo(() => lathe([[0.001, FL.h - 2.0], [FL.neck - 0.15, FL.h - 2.0], [FL.neck + 0.3, FL.h + 0.6], [0.001, FL.h + 0.6]], { segs: 32 }), [])
  const tubes = useMemo(() => [
    new THREE.TubeGeometry(curveOf([[-0.6, 1.2, 0], [-0.6, FL.h + 2.4, 0], [-1.2, FL.h + 3.6, 0], [-3.0, FL.h + 3.9, 0]]), 40, 0.28, 12),
    new THREE.TubeGeometry(curveOf([[0.6, FL.h - 1.0, 0], [0.6, FL.h + 1.8, 0], [1.4, FL.h + 2.6, 0]]), 24, 0.28, 12),
  ], [])
  const bub = useRef<THREE.InstancedMesh>(null)
  const N = 30
  const t0 = useRef(0)
  const mats = useMemo(() => ({ liq: new THREE.MeshPhysicalMaterial({ color: '#dff2f4', roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.35, depthWrite: false }) }), [])
  useFrame((s, dt0) => {
    const dt = Math.min(dt0, 1 / 30); if (bubbling) t0.current += dt
    // 越浑越白、越不透明
    mats.liq.color.set('#dff2f4').lerp(new THREE.Color('#f4f3ee'), murk); mats.liq.opacity = 0.32 + 0.6 * murk; mats.liq.roughness = 0.1 + 0.6 * murk
    const m = bub.current; if (!m) return
    const mx = new THREE.Matrix4(), t = t0.current
    for (let i = 0; i < N; i++) {
      const ph = (t * 0.9 + i / N) % 1, y = 1.3 + ph * (FL.level - 1.3), on = bubbling && t > i / N / 0.9
      const r = on ? 0.18 + 0.12 * ((i * 7) % 3) / 2 : 0.0001
      mx.makeScale(r, r * 0.85, r).setPosition(-0.6 + Math.sin(i * 3.1 + ph * 6) * 0.35 * ph, y, Math.cos(i * 2.3) * 0.3 * ph)
      m.setMatrixAt(i, mx)
    }
    m.instanceMatrix.needsUpdate = true
    void s
  })
  return <group>
    <mesh geometry={liq} material={mats.liq} renderOrder={4} />
    <mesh position={[0, FL.level, 0]} rotation-x={-Math.PI / 2} renderOrder={4}><circleGeometry args={[FL.r - 0.25 - (FL.r - FL.neck) * (FL.level - 1.4) / (FL.h - 4.8), 48]} /><meshPhysicalMaterial color="#eaf6f6" roughness={0.05} clearcoat={1} transparent opacity={0.3 + 0.5 * murk} depthWrite={false} /></mesh>
    <instancedMesh ref={bub} args={[undefined, undefined, N]} frustumCulled={false} renderOrder={5}><sphereGeometry args={[1, 12, 8]} /><meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={1} transparent opacity={0.55} depthWrite={false} /></instancedMesh>
    <mesh geometry={glass} renderOrder={6}><Glass /></mesh>
    <mesh geometry={stopper}><meshPhysicalMaterial color="#5a5550" roughness={0.75} /></mesh>
    {tubes.map((g, i) => <mesh key={i} geometry={g} renderOrder={5}><Glass opacity={0.35} /></mesh>)}
  </group>
}
/** 注射器（100 mL）：透明针筒、黑色胶塞、推杆。k：推进去多少（0–1） */
export function Syringe({ k }: { k: number }) {
  const L = 16, r = 1.9
  const barrel = useMemo(() => shell([[r, 0], [r, L], [r + 0.8, L + 0.05], [r + 0.8, L + 0.4]], 0.15, { segs: 40 }), [])
  const tip = useMemo(() => lathe([[0.3, -1.6], [0.45, -1.6], [r, 0], [0.001, 0]], { segs: 32 }), [])
  const ticks = useMemo(() => Array.from({ length: 11 }, (_, i) => 1 + i * 1.3), [])
  const pos = 1.2 + (L - 2.4) * (1 - k)
  return <group>
    <mesh geometry={barrel} renderOrder={6}><Glass opacity={0.22} /></mesh>
    <mesh geometry={tip} renderOrder={6}><Glass opacity={0.3} /></mesh>
    {ticks.map(y => <mesh key={y} position={[r + 0.01, y, 0]}><boxGeometry args={[0.02, 0.05, y % 2.6 < 1.3 ? 1.0 : 0.6]} /><meshBasicMaterial color="#1c2a33" /></mesh>)}
    <mesh position={[0, pos, 0]}><cylinderGeometry args={[r - 0.17, r - 0.17, 1.0, 32]} /><meshPhysicalMaterial color="#202224" roughness={0.5} clearcoat={0.3} /></mesh>
    <mesh position={[0, pos + (L + 4 - pos) / 2, 0]}><boxGeometry args={[0.35, L + 4 - pos, 1.6]} /><meshPhysicalMaterial color="#eef1f2" roughness={0.3} transparent opacity={0.85} /></mesh>
    <mesh position={[0, L + 4, 0]}><cylinderGeometry args={[2.3, 2.3, 0.35, 32]} /><meshPhysicalMaterial color="#eef1f2" roughness={0.3} /></mesh>
  </group>
}
/** 一根胶皮管 */
export function Hose({ pts, r = 0.4 }: { pts: V3[]; r?: number }) {
  const g = useMemo(() => new THREE.TubeGeometry(curveOf(pts, 0.5), 64, r, 12), [pts, r])
  return <mesh geometry={g} castShadow><meshPhysicalMaterial color="#b4613f" roughness={0.42} clearcoat={0.5} transparent opacity={0.92} /></mesh>
}
/** 顺着胶皮管往瓶里走的一串气（淡蓝的小团），on 为假时不画 */
export function HoseFlow({ pts, on, back = false }: { pts: V3[]; on: boolean; back?: boolean }) {
  const curve = useMemo(() => curveOf(pts, 0.5), [pts])
  const m = useRef<THREE.InstancedMesh>(null), N = 14, t0 = useRef(0)
  useFrame((_, dt) => {
    if (on) t0.current += Math.min(dt, 1 / 30)
    const mesh = m.current; if (!mesh) return
    const mx = new THREE.Matrix4()
    for (let i = 0; i < N; i++) {
      const ph = (t0.current * 0.5 + i / N) % 1, u = back ? 1 - ph : ph, p = curve.getPointAt(u), s = on ? 0.28 * Math.min(1, ph / 0.1, (1 - ph) / 0.1) : 0.0001
      mesh.setMatrixAt(i, mx.makeScale(s, s, s).setPosition(p))
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={m} args={[undefined, undefined, N]} frustumCulled={false} renderOrder={7}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color="#bfe9ff" transparent opacity={0.8} toneMapped={false} depthTest={false} /></instancedMesh>
}
/** 吹气嘴：一截玻璃管口 */
export function Mouthpiece() {
  return <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.5, 0.45, 3, 20, 1, true]} /><Glass opacity={0.4} /></mesh>
}
export { cloud, FL }
