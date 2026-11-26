// 磁体和看磁场用的器材：条形磁体、蹄形磁体、支架式小磁针、铁屑、发光的磁感线、玻璃板、地球仪、回形针、铁钉、铜片、铝片、悬挂架。
// 按厘米写（外面套 Bench），原点在器材底面正中，正面朝 +z。桌面上的 [u, v] 对应 x、z。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, disc, lathe } from '@/lab-kit'
import { BAR, HORSE, rng, type Filing, type P2 } from './physics'
import { makeLetter } from './mats'
import type { V3 } from './gear'

export const N_RED = '#c3302a', S_BLUE = '#2b55a3'
const paint = (c: string) => <meshPhysicalMaterial color={c} roughness={0.3} clearcoat={0.7} clearcoatRoughness={0.18} />
/** 刻在磁体表面的一个字母 */
function Letter({ ch, at, size = 1.4, rot = [-Math.PI / 2, 0, 0] }: { ch: string; at: V3; size?: number; rot?: [number, number, number] }) {
  return <mesh position={at} rotation={rot}><planeGeometry args={[size, size]} /><meshStandardMaterial map={makeLetter(ch)} transparent roughness={0.4} depthWrite={false} polygonOffset polygonOffsetFactor={-2} /></mesh>
}

// ---------- 条形磁体 ----------
/** 条形磁体：长 20 cm，宽 3 cm，厚 1.5 cm。东头（+x）红色是 N 极，西头蓝色是 S 极，顶面刻着 N、S。原点在底面正中 */
export function BarMagnet({ len = BAR.len, w = BAR.w, h = BAR.h }: { len?: number; w?: number; h?: number }) {
  return <group>
    <RoundedBox args={[len / 2 - 0.02, h, w]} radius={0.18} smoothness={3} position={[len / 4, h / 2, 0]} castShadow receiveShadow>{paint(N_RED)}</RoundedBox>
    <RoundedBox args={[len / 2 - 0.02, h, w]} radius={0.18} smoothness={3} position={[-len / 4, h / 2, 0]} castShadow receiveShadow>{paint(S_BLUE)}</RoundedBox>
    <mesh position={[0, h / 2, 0]}><boxGeometry args={[0.06, h - 0.1, w - 0.1]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
    <Letter ch="N" at={[len / 2 - 2.2, h + 0.005, 0]} size={Math.min(1.8, w * 0.7)} />
    <Letter ch="S" at={[-len / 2 + 2.2, h + 0.005, 0]} size={Math.min(1.8, w * 0.7)} />
  </group>
}

// ---------- 蹄形磁体 ----------
const TIP = 1.6
/** 蹄形磁体的 U 形红漆部分：平放时两脚朝 +z，N 脚在西（−x）。截面在 x–(−z) 平面里画，再竖着挤出厚度 */
function horseGeo() {
  const g0 = HORSE.gap / 2, o = g0 + 2, back = -3, tipZ = HORSE.tipV
  const s = new THREE.Shape()
  s.moveTo(g0, -(tipZ - TIP)); s.lineTo(o, -(tipZ - TIP)); s.lineTo(o, -back)
  s.absarc(0, -back, o, 0, Math.PI, false)
  s.lineTo(-o, -(tipZ - TIP)); s.lineTo(-g0, -(tipZ - TIP)); s.lineTo(-g0, -back)
  s.absarc(0, -back, g0, Math.PI, 0, true)
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.8, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 28 })
  g.rotateX(-Math.PI / 2); g.translate(0, 0.12, 0)
  return g
}
const HORSE_GEO = horseGeo()
/** 蹄形磁体。平放（默认）：两脚朝 +z、N 脚在西，底面在 y = 0。stand：侧过来立着，两脚朝 +z，N 极在上、S 极在下（flip 时反过来），下脚的底面在 y = 0 */
export function HorseMagnet({ stand = false, flip = false, scale = 1 }: { stand?: boolean; flip?: boolean; scale?: number }) {
  const g0 = HORSE.gap / 2, tipZ = HORSE.tipV
  const body = <>
    <mesh geometry={HORSE_GEO} castShadow receiveShadow>{paint('#c7332b')}</mesh>
    {[-1, 1].map(s => <RoundedBox key={s} args={[2, 2.04, TIP]} radius={0.12} smoothness={2} position={[s * (g0 + 1), 1.02, tipZ - TIP / 2]} castShadow><Metal kind="steel" grain="brushed" rough={0.34} /></RoundedBox>)}
    {/* 字母：平放时刻在顶面；两脚端面也刻一份（侧立时朝镜头，字转正） */}
    {!stand && <><Letter ch="N" at={[-(g0 + 1), 2.05, tipZ - TIP / 2]} size={1.3} /><Letter ch="S" at={[g0 + 1, 2.05, tipZ - TIP / 2]} size={1.3} /></>}
    {stand && <><Letter ch="N" at={[-(g0 + 1), 1.02, tipZ + 0.005]} size={1.5} rot={[0, 0, flip ? -Math.PI / 2 : Math.PI / 2]} />
    <Letter ch="S" at={[g0 + 1, 1.02, tipZ + 0.005]} size={1.5} rot={[0, 0, flip ? -Math.PI / 2 : Math.PI / 2]} /></>}
  </>
  if (!stand) return <group scale={scale}>{body}</group>
  // 侧立：绕 z 轴转 −90°（西脚到上面），再抬起来让下脚落在桌面上；flip 时绕 z 转 +90°
  return <group scale={scale}><group position={[flip ? 1.02 : -1.02, g0 + 2, 0]} rotation-z={flip ? Math.PI / 2 : -Math.PI / 2}>{body}</group></group>
}

// ---------- 小磁针 ----------
const NEEDLE_BASE = lathe([[0, 0], [1.05, 0], [1.1, 0.1], [0.95, 0.42], [0.34, 0.68], [0.16, 0.72], [0, 0.72]], { segs: 32, crease: 40 })
function halfNeedle(sign: 1 | -1) {
  const s = new THREE.Shape([new THREE.Vector2(0, 0.34), new THREE.Vector2(sign * 2.3, 0), new THREE.Vector2(0, -0.34)])
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 1 })
  g.rotateX(-Math.PI / 2); g.translate(0, -0.04, 0)
  return g
}
const NEEDLE_N = halfNeedle(1), NEEDLE_S = halfNeedle(-1)
const CAP = lathe([[0, 0], [0.22, 0], [0.12, 0.28], [0, 0.32]], { segs: 16 })
/** 支架式小磁针：黑色底座，黄铜顶针，菱形磁针一半红（N）一半深蓝（S）。angle：N 极静止时的朝向（弧度，从 +x 量起，桌面上 +z 为 v 的正方向）。磁针带阻尼摆动 */
export function Needle({ angle, at = [0, 0, 0], scale = 1 }: { angle: number; at?: V3; scale?: number }) {
  const ref = useRef<THREE.Group>(null), s = useRef({ a: angle, v: 0, init: false }), goal = useRef(angle); goal.current = angle
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), q = s.current
    if (!q.init) { q.a = goal.current; q.init = true }
    let e = goal.current - q.a; e = Math.atan2(Math.sin(e), Math.cos(e))
    for (let i = 0; i < 3; i++) { const h = dt / 3, w = 6, z = 0.22; q.v += (w * w * e - 2 * z * w * q.v) * h; q.a += q.v * h; e = Math.atan2(Math.sin(goal.current - q.a), Math.cos(goal.current - q.a)) }
    if (ref.current) ref.current.rotation.y = -q.a
  })
  return <group position={at} scale={scale}>
    <mesh geometry={NEEDLE_BASE} castShadow receiveShadow><meshPhysicalMaterial color="#1b1c1e" roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh position={[0, 1.95, 0]} castShadow><cylinderGeometry args={[0.05, 0.08, 2.5, 8]} /><Metal kind="brass" /></mesh>
    <group ref={ref} position={[0, 3.25, 0]}>
      <mesh geometry={NEEDLE_N} castShadow>{paint(N_RED)}</mesh>
      <mesh geometry={NEEDLE_S} castShadow><meshPhysicalMaterial color="#e9e7e0" roughness={0.35} clearcoat={0.5} /></mesh>
      <mesh geometry={CAP} position={[0, 0.03, 0]}><Metal kind="brass" rough={0.2} /></mesh>
    </group>
  </group>
}

// ---------- 铁屑 ----------
/**
 * 撒在玻璃板上的铁屑。list：计算核心给出的位置和朝向（cm）；y：玻璃板上表面的高度。
 * shown 从假变真：铁屑从上方一把撒下，朝向是乱的；tapped 变真：轻敲几下，一根根转到磁场方向（带一点抖动）
 */
export function Filings({ list, y, shown, tapped, seed = 3 }: { list: Filing[]; y: number; shown: boolean; tapped: boolean; seed?: number }) {
  const inst = useRef<THREE.InstancedMesh>(null)
  const rand = useMemo(() => { const r = rng(seed); return list.map(() => ({ a: r() * Math.PI, dx: (r() - 0.5) * 0.5, dz: (r() - 0.5) * 0.5, delay: r() * 0.5, spin: r() })) }, [list, seed])
  const st = useRef({ drop: 0, align: 0 }), m = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(), []), p = useMemo(() => new THREE.Vector3(), []), sc = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => { if (!shown) st.current.drop = 0; if (!tapped) st.current.align = 0 }, [shown, tapped])
  useFrame((_, d) => {
    const im = inst.current; if (!im) return
    const dt = Math.min(d, 1 / 30), s = st.current
    s.drop = shown ? Math.min(1.6, s.drop + dt) : 0
    s.align = tapped ? Math.min(1, s.align + dt / 1.3) : 0
    const k = 1 - Math.pow(1 - s.align, 3)
    for (let i = 0; i < list.length; i++) {
      const f = list[i], r = rand[i]
      const t = Math.min(1, Math.max(0, (s.drop - r.delay) / 0.55))
      // 对齐：铁屑没有头尾，转到和磁场平行就行，选转得少的那个方向
      let da = f.a - r.a; da = Math.atan2(Math.sin(2 * da), Math.cos(2 * da)) / 2
      const jitter = tapped ? Math.sin(s.align * 40 + r.spin * 9) * 0.25 * (1 - k) : 0
      const a = r.a + da * k + jitter
      const hop = tapped ? Math.sin(Math.min(1, s.align * 3) * Math.PI) * 0.25 * r.spin : 0
      p.set(f.u + r.dx * (1 - k), y + 0.03 + (1 - t) * (3 + r.delay * 4) + hop, f.v + r.dz * (1 - k))
      e.set(0, -a, (r.spin - 0.5) * 0.3); q.setFromEuler(e)
      const vis = shown && t > 0 ? 1 : 0
      sc.set(f.len * vis, 0.05 * vis, 0.05 * vis)
      m.compose(p, q, sc); im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={inst} args={[undefined, undefined, list.length]} castShadow frustumCulled={false}>
    <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#3b3d40" metalness={0.75} roughness={0.42} />
  </instancedMesh>
}

// ---------- 磁感线 ----------
/**
 * 发光的磁感线：每条线是一根细管，沿线一只箭头指向 S 极，还有几颗亮点从 N 极往 S 极流。
 * lines：平面上的点（cm）；to3：平面上的点换成三维位置；show 从 0 到 1 时一条条画出来
 */
export function FieldLines({ lines, to3, show, color = '#62f0ff', r = 0.07 }: { lines: P2[][]; to3: (p: P2) => V3; show: number; color?: string; r?: number }) {
  const data = useMemo(() => lines.filter(l => l.length > 4).map(l => {
    const pts = l.filter((_, i) => i % 2 === 0 || i === l.length - 1).map(p => new THREE.Vector3(...to3(p)))
    const c = new THREE.CatmullRomCurve3(pts)
    const geo = new THREE.TubeGeometry(c, Math.min(260, pts.length * 2), r, 6)
    const mid = c.getPointAt(0.5), tan = c.getTangentAt(0.5)
    return { c, geo, mid, quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan), len: c.getLength(), total: geo.index!.count }
  }), [lines, to3, r])
  useEffect(() => () => data.forEach(d => d.geo.dispose()), [data])
  data.forEach((d, i) => { const k = Math.min(1, Math.max(0, show * (1 + data.length * 0.06) - i * 0.06)); d.geo.setDrawRange(0, Math.floor(d.total * k / 6) * 6) })
  const dots = useRef<THREE.InstancedMesh>(null), m = useMemo(() => new THREE.Matrix4(), []), ph = useRef(0), PER = 3
  useFrame((_, dt) => {
    const im = dots.current; if (!im) return
    ph.current += Math.min(dt, 1 / 30) * 0.18
    data.forEach((d, i) => { for (let j = 0; j < PER; j++) { const u = (ph.current * 22 / Math.max(6, d.len) + j / PER) % 1, s = show > 0.98 ? 1 : 0; m.makeScale(s, s, s).setPosition(d.c.getPointAt(u)); im.setMatrixAt(i * PER + j, m) } })
    im.instanceMatrix.needsUpdate = true
  })
  const mat = <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
  return <group visible={show > 0.001}>
    {data.map((d, i) => <mesh key={i} geometry={d.geo} renderOrder={7}>{mat}</mesh>)}
    {data.map((d, i) => <mesh key={`a${i}`} position={d.mid} quaternion={d.quat} visible={show > 0.98} renderOrder={7}><coneGeometry args={[r * 4.2, r * 11, 12]} />{mat}</mesh>)}
    <instancedMesh ref={dots} args={[undefined, undefined, Math.max(1, data.length * PER)]} frustumCulled={false} renderOrder={8}>
      <sphereGeometry args={[r * 2.4, 10, 8]} /><meshBasicMaterial color="#e8feff" toneMapped={false} transparent opacity={0.95} />
    </instancedMesh>
  </group>
}

// ---------- 玻璃板 ----------
/** 一块 w × d、厚 0.4 cm 的玻璃板，四角垫着四块透明的有机玻璃垫块，下面能放磁体。底面在 y0 */
export function GlassPlate({ w, d, y0 }: { w: number; d: number; y0: number }) {
  return <group>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 1.2), y0 / 2, sz * (d / 2 - 1.2)]} castShadow><boxGeometry args={[1.6, y0, 1.6]} /><meshPhysicalMaterial color="#dfe9ea" roughness={0.1} transparent opacity={0.5} /></mesh>))}
    <RoundedBox args={[w, 0.4, d]} radius={0.06} smoothness={2} position={[0, y0 + 0.2, 0]} renderOrder={3}>
      <meshPhysicalMaterial color="#d8ece8" roughness={0.04} transparent opacity={0.16} envMapIntensity={1.6} depthWrite={false} clearcoat={1} />
    </RoundedBox>
    {/* 玻璃的侧边：青绿色、更不透明 */}
    {[-1, 1].map(s => <mesh key={`e${s}`} position={[0, y0 + 0.2, s * d / 2]}><boxGeometry args={[w - 0.1, 0.38, 0.02]} /><meshPhysicalMaterial color="#9cc9bd" transparent opacity={0.55} roughness={0.1} /></mesh>)}
    {[-1, 1].map(s => <mesh key={`f${s}`} position={[s * w / 2, y0 + 0.2, 0]}><boxGeometry args={[0.02, 0.38, d - 0.1]} /><meshPhysicalMaterial color="#9cc9bd" transparent opacity={0.55} roughness={0.1} /></mesh>)}
  </group>
}

// ---------- 地球仪 ----------
/** 地球仪：半径 R（cm）的地球装在黄铜子午圈里，地轴倾斜 23.5°（在 x–y 平面里，北极偏向 −x）。原点在底座底面 */
export const GLOBE = { R: 12, cy: 17, tilt: 23.5 * Math.PI / 180 }
const GLOBE_BASE = lathe([[0, 0], [7, 0], [7.2, 0.4], [6.4, 1.2], [2.2, 2.0], [1.2, 3.0], [1.0, 4.4], [0, 4.4]], { segs: 48, crease: 40 })
export function Globe({ spin = true }: { spin?: boolean }) {
  const map = useTexture('/assets/tex/earth_day.jpg')
  const ball = useRef<THREE.Mesh>(null)
  useFrame((_, d) => { if (ball.current && spin) ball.current.rotation.y += Math.min(d, 1 / 30) * 0.12 })
  const { R, cy, tilt } = GLOBE
  const ring = useMemo(() => { const g = new THREE.TorusGeometry(R + 0.9, 0.35, 10, 96, Math.PI * 1.25); g.rotateZ(-Math.PI * 0.125 - Math.PI / 2); return g }, [R])
  return <group>
    <mesh geometry={GLOBE_BASE} castShadow receiveShadow><meshPhysicalMaterial color="#3b2a1e" roughness={0.35} clearcoat={0.7} /></mesh>
    <mesh position={[0, 4.4 + (cy - R - 1.3 - 4.4) / 2, 0]}><cylinderGeometry args={[0.45, 0.6, cy - R - 1.3 - 4.4, 16]} /><Metal kind="brass" grain="turned" /></mesh>
    <group position={[0, cy, 0]} rotation-z={tilt}>
      <mesh geometry={ring} castShadow><Metal kind="brass" grain="turned" rough={0.28} /></mesh>
      <mesh ref={ball} castShadow><sphereGeometry args={[R, 72, 48]} /><meshStandardMaterial map={map} roughness={0.55} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[0, s * (R + 0.5), 0]}><cylinderGeometry args={[0.18, 0.18, 1.2, 10]} /><Metal kind="brass" /></mesh>)}
    </group>
  </group>
}

// ---------- 回形针、铁钉、铜片、铝片 ----------
/** 一枚回形针：长约 2.8 cm 的钢丝弯成两道 U 形，平放在 x–z 平面里，原点在中心 */
export const CLIP = (() => {
  const P = (x: number, z: number) => new THREE.Vector3(x, 0, z)
  const pts: THREE.Vector3[] = []
  const arc = (cx: number, r: number, a0: number, a1: number) => { for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8; pts.push(P(cx + Math.cos(a) * r, Math.sin(a) * r)) } }
  pts.push(P(0.6, -0.22)); arc(1.0, 0.22, -Math.PI / 2, Math.PI / 2); pts.push(P(-1.0, 0.22)); arc(-1.0, 0.36 / 1.0 * 0.62, Math.PI / 2, Math.PI * 1.5)
  pts.push(P(0.75, -0.22)); pts.push(P(0.75, -0.22))
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.045, 5)
  return g
})()
/** 一堆回形针：n 枚随手散放，合成一个模型 */
export function clipPile(n: number, w: number, d: number, seed = 9) {
  const r = rng(seed), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
  return mergeGeometries(Array.from({ length: n }, (_, i) => {
    const g = CLIP.clone(); e.set((r() - 0.5) * 0.4, r() * Math.PI * 2, (r() - 0.5) * 0.4); q.setFromEuler(e)
    m.compose(new THREE.Vector3((r() - 0.5) * w, 0.05 + (i % 3) * 0.09, (r() - 0.5) * d), q, new THREE.Vector3(1, 1, 1))
    g.applyMatrix4(m); return g
  }))
}
/** 铁钉：长 5 cm，原点在钉帽，钉尖朝 +x */
export const NAIL = (() => { const g = lathe([[0, 0], [0.42, 0], [0.42, 0.12], [0.14, 0.16], [0.13, 4.3], [0, 5.0]], { segs: 16, crease: 40 }); g.rotateZ(-Math.PI / 2); return g })()
/** 平放在桌上的一根铁钉 */
export function Nail({ at = [0, 0, 0], yaw = 0 }: { at?: V3; yaw?: number }) {
  return <group position={at} rotation-y={yaw}><mesh geometry={NAIL} position={[-2.5, 0.42, 0]} castShadow><Metal kind="steel" rough={0.38} /></mesh></group>
}
/** 一片金属片：铜或铝，4 × 1.6 cm，厚 0.1 cm */
export function Strip({ kind, at = [0, 0, 0], yaw = 0 }: { kind: 'copper' | 'aluminum'; at?: V3; yaw?: number }) {
  return <RoundedBox args={[4, 0.12, 1.6]} radius={0.04} smoothness={2} position={[at[0], at[1] + 0.06, at[2]]} rotation-y={yaw} castShadow receiveShadow><Metal kind={kind} grain="brushed" /></RoundedBox>
}

/** 浅浅的白色塑料盘：w × d，盘沿高 1 cm（有壁厚） */
export function Tray({ w, d, h = 1, color = '#f0efe9' }: { w: number; d: number; h?: number; color?: string }) {
  const m = <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.4} />
  return <group>
    <RoundedBox args={[w, 0.25, d]} radius={0.1} smoothness={2} position={[0, 0.125, 0]} receiveShadow castShadow>{m}</RoundedBox>
    {[-1, 1].map(s => <RoundedBox key={`a${s}`} args={[w, h, 0.25]} radius={0.1} smoothness={2} position={[0, h / 2, s * (d / 2 - 0.125)]} castShadow>{m}</RoundedBox>)}
    {[-1, 1].map(s => <RoundedBox key={`b${s}`} args={[0.25, h, d]} radius={0.1} smoothness={2} position={[s * (w / 2 - 0.125), h / 2, 0]} castShadow>{m}</RoundedBox>)}
  </group>
}

/** 一枚车削的黄铜小零件（悬挂架的夹头） */
export const KNOB = disc(0.9, 0.7, { segs: 24 })
