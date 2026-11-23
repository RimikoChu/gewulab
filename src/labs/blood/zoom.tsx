// 悬在人体旁边的两个放大模型（第 7 课）：一串肺泡和缠在外面的毛细血管、一片肌肉细胞和穿过去的毛细血管；
// 以及拓展课的电子血压计（袖带、气管、主机）。坐标是模型自己的，1 个单位 = 10 cm 的画面长度（放大的示意）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, disc, lathe } from '@/lab-kit'
import { BLUE, RED, rbcGeo } from './heart'
import { curveOf, ellipsoid, fbm, roundCone, sminAll, surfaceNets, type V3 } from './sdf'

/** 边缘亮、中间透的薄膜 */
export function ghost(color: string, base: number, rim: number, pow = 2.2) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: base }, uRim: { value: rim }, uPow: { value: pow } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uBase; uniform float uRim; uniform float uPow; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), uPow); gl_FragColor = vec4(uColor * (uBase + uRim * f), 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })
}
const cRed = new THREE.Color(RED), cBlue = new THREE.Color(BLUE)
const ease = (t: number) => t * t * (3 - 2 * t)

/** 沿一条曲线走的红细胞，颜色从 from 慢慢变到 to（毛细血管里换气） */
function Flowing({ curve, n, from, to, on, size = 0.1, speed = 0.12 }: { curve: THREE.Curve<THREE.Vector3>; n: number; from: 'a' | 'v'; to: 'a' | 'v'; on: boolean; size?: number; speed?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null), geo = useMemo(() => rbcGeo(size), [size])
  const table = useMemo(() => curve.getSpacedPoints(400), [curve])
  const st = useMemo(() => Array.from({ length: n }, (_, i) => ({ s: i / n, a: i * 2.1, b: i * 1.3 })), [n])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), sc: new THREE.Vector3(1, 1, 1), c: new THREE.Color() }), [])
  useFrame((s, dt0) => {
    const m = mesh.current; if (!m) return
    const dt = Math.min(dt0, 1 / 30)
    st.forEach((c, i) => {
      if (on) c.s = (c.s + dt * speed) % 1
      const x = c.s * 400, a = Math.floor(x), f = x - a, p0 = table[a], p1 = table[Math.min(400, a + 1)]
      tmp.v.set(p0.x + (p1.x - p0.x) * f, p0.y + (p1.y - p0.y) * f, p0.z + (p1.z - p0.z) * f)
      tmp.q.setFromEuler(tmp.e.set(c.a + s.clock.elapsedTime * 0.6, c.b, 0))
      m.setMatrixAt(i, tmp.m.compose(tmp.v, tmp.q, tmp.sc))
      // 在中间那一段（贴着肺泡或细胞走的地方）换颜色
      const k = ease(Math.min(1, Math.max(0, (c.s - 0.3) / 0.4)))
      m.setColorAt(i, tmp.c.copy(from === 'v' ? cBlue : cRed).lerp(to === 'a' ? cRed : cBlue, k))
    })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geo, undefined, n]} frustumCulled={false}><meshPhysicalMaterial roughness={0.35} clearcoat={0.5} /></instancedMesh>
}
/** 一根毛细血管：半透明的薄壁细管，颜色沿着走向从 from 变到 to */
function CapTube({ curve, r, from, to }: { curve: THREE.Curve<THREE.Vector3>; r: number; from: 'a' | 'v'; to: 'a' | 'v' }) {
  const geo = useMemo(() => {
    const g = new THREE.TubeGeometry(curve, 160, r, 14), n = g.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color()
    for (let v = 0; v < n; v++) { const t = Math.floor(v / 15) / 160, k = ease(Math.min(1, Math.max(0, (t - 0.3) / 0.4))); c.copy(from === 'v' ? cBlue : cRed).lerp(to === 'a' ? cRed : cBlue, k); col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g
  }, [curve, r, from, to])
  return <mesh geometry={geo} renderOrder={4}><meshPhysicalMaterial vertexColors transparent opacity={0.42} roughness={0.25} clearcoat={0.8} depthWrite={false} side={THREE.DoubleSide} /></mesh>
}
/**
 * 气体小球：每颗按自己的节拍从 A 走到 B，再从头来。paths 给出每颗的起点和终点（还可以有第三个点，接着往外走）
 * on 为假时都藏起来
 */
function Gas({ paths, color, on, r = 0.04, rate = 0.22 }: { paths: V3[][]; color: string; on: boolean; r?: number; rate?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), sc: new THREE.Vector3() }), [])
  const t0 = useRef<number | null>(null)
  useFrame(s => {
    const m = mesh.current; if (!m) return
    if (on && t0.current === null) t0.current = s.clock.elapsedTime
    if (!on) t0.current = null
    const t = t0.current === null ? 0 : s.clock.elapsedTime - t0.current
    paths.forEach((p, i) => {
      const ph = ((t * rate + i / paths.length) % 1), legs = p.length - 1, x = ph * legs, k = Math.min(legs - 1, Math.floor(x)), f = ease(x - k)
      tmp.v.set(p[k][0] + (p[k + 1][0] - p[k][0]) * f, p[k][1] + (p[k + 1][1] - p[k][1]) * f, p[k][2] + (p[k + 1][2] - p[k][2]) * f)
      const vis = on && t > (i / paths.length) / rate ? Math.min(1, ph / 0.08, (1 - ph) / 0.08) : 0
      m.setMatrixAt(i, tmp.m.compose(tmp.v, tmp.q, tmp.sc.setScalar(Math.max(0.0001, vis))))
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, paths.length]} frustumCulled={false}><sphereGeometry args={[r, 14, 10]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.4} /></instancedMesh>
}
const rnd0 = (seed: number) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647 }

// ---------- 肺泡 ----------
const ALV: { c: V3; r: number }[] = [{ c: [0, 0, 0], r: 0.72 }, { c: [0.95, 0.5, -0.45], r: 0.5 }, { c: [0.62, -0.85, -0.35], r: 0.55 }, { c: [-0.55, -0.8, -0.55], r: 0.5 }, { c: [0.25, 0.9, -0.65], r: 0.45 }, { c: [1.1, -0.2, -0.85], r: 0.46 }, { c: [-0.2, 0.55, -1.05], r: 0.48 }]
const BRONCH: V3[] = [[-2.0, 1.45, -0.4], [-1.2, 0.85, -0.25], [-0.55, 0.32, -0.1]]
/** 缠在中间那个肺泡外面的毛细血管：从左边进来（静脉血），在肺泡表面绕几圈，从右边出去（动脉血） */
export const ALV_CAP = curveOf([[-2.1, -0.75, 0.55], [-1.3, -0.55, 0.55], ...Array.from({ length: 9 }, (_, i) => { const t = i / 8, th = -2.2 + 4.4 * t, ph = 0.55 * Math.sin(t * Math.PI * 3) ; return [Math.sin(th) * 0.78 * Math.cos(ph), Math.sin(ph) * 0.78 - 0.1 + 0.25 * t, Math.cos(th) * 0.78 * Math.cos(ph) * 0.9 + 0.06] as V3 }).filter(p => p[2] > -0.3), [1.35, 0.55, 0.55], [2.1, 0.7, 0.55]], 0.4)
/** 其余几个肺泡外面的细毛细血管：一圈圈绕在球面上，从蓝渐变到红 */
const NET = ALV.slice(0, 5).flatMap((a, k) => [-0.45, 0.05, 0.5].map((lat, j) => {
  const R = a.r * 1.04, pts: V3[] = []
  for (let i = 0; i <= 14; i++) { const th = -2.4 + 4.8 * i / 14 + k, la = lat + 0.18 * Math.sin(i * 1.3 + j); pts.push([a.c[0] + Math.sin(th) * Math.cos(la) * R, a.c[1] + Math.sin(la) * R, a.c[2] + Math.cos(th) * Math.cos(la) * R]) }
  return curveOf(pts.filter(p => p[2] > a.c[2] - a.r * 0.2))
})).filter(c => c.points.length > 3)
export function Alveoli({ on }: { on: boolean }) {
  const geo = useMemo(() => surfaceNets((x, y, z) => sminAll([...ALV.map(a => ellipsoid(x, y, z, a.c, [a.r, a.r, a.r])), roundCone(x, y, z, BRONCH[0], BRONCH[1], 0.2, 0.18), roundCone(x, y, z, BRONCH[1], BRONCH[2], 0.18, 0.2)], 0.14) + 0.02 * fbm(x * 4, y * 4, z * 4, 2), [[-2.3, -1.5, -1.7], [1.8, 1.7, 1.0]], 0.06), [])
  const mem = useMemo(() => ghost('#ffb3bf', 0.06, 0.85, 1.7), [])
  const gas = useMemo(() => {
    const rnd = rnd0(19), pts = ALV_CAP.getSpacedPoints(60).slice(14, 46)
    const inside = (): V3 => { const a = rnd() * 6.28, b = (rnd() - 0.5) * 2, rr = 0.45 * Math.cbrt(rnd()); return [Math.cos(a) * rr * Math.sqrt(1 - b * b), b * rr, Math.sin(a) * rr * Math.sqrt(1 - b * b)] }
    const cap = (): V3 => { const p = pts[Math.floor(rnd() * pts.length)]; return [p.x, p.y, p.z] }
    // 氧：从支气管进来，到肺泡里，再穿过肺泡壁和毛细血管壁进到血液；二氧化碳：从血液出来进肺泡，再从支气管出去
    const o2 = Array.from({ length: 26 }, () => [BRONCH[1], inside(), cap()])
    const co2 = Array.from({ length: 20 }, () => [cap(), inside(), BRONCH[1]])
    return { o2, co2 }
  }, [])
  return <group>
    <mesh geometry={geo} material={mem} renderOrder={6} />
    <CapTube curve={ALV_CAP} r={0.075} from="v" to="a" />
    {NET.map((c, i) => <CapTube key={i} curve={c} r={0.03} from="v" to="a" />)}
    <Flowing curve={ALV_CAP} n={22} from="v" to="a" on={on} size={0.11} />
    <Gas paths={gas.o2} color="#ff9b2f" on={on} />
    <Gas paths={gas.co2} color="#a493d6" on={on} rate={0.2} />
  </group>
}

// ---------- 组织细胞 ----------
export const TIS_CAP = curveOf([[-2.1, -0.1, 0.72], [-1.1, 0.06, 0.7], [0, -0.05, 0.68], [1.1, 0.08, 0.7], [2.1, -0.05, 0.72]], 0.5)
const CELLS: { a: V3; b: V3; r: number }[] = (() => {
  const out: { a: V3; b: V3; r: number }[] = [], rnd = rnd0(41)
  for (const [y, z] of [[0.68, 0.2], [-0.68, 0.2], [0.05, -0.38], [1.25, -0.4], [-1.25, -0.4], [0.62, -1.0], [-0.62, -1.0]] as [number, number][]) {
    const off = (rnd() - 0.5) * 0.8
    out.push({ a: [-1.9 + off, y + (rnd() - 0.5) * 0.1, z], b: [-0.15 + off, y + (rnd() - 0.5) * 0.1, z], r: 0.27 + rnd() * 0.05 }, { a: [0.15 + off, y, z + (rnd() - 0.5) * 0.1], b: [1.9 + off, y, z], r: 0.27 + rnd() * 0.05 })
  }
  return out
})()
export function Tissue({ on }: { on: boolean }) {
  const geo = useMemo(() => surfaceNets((x, y, z) => { let d = 1e9; for (const c of CELLS) d = Math.min(d, roundCone(x, y, z, c.a, c.b, c.r, c.r * 0.92)); return d + 0.025 * fbm(x * 5, y * 5, z * 5, 2) }, [[-2.4, -1.7, -1.5], [2.4, 1.7, 0.65]], 0.06), [])
  const nuclei = useMemo(() => CELLS.map(c => [(c.a[0] + c.b[0]) / 2, (c.a[1] + c.b[1]) / 2 + c.r * 0.55, (c.a[2] + c.b[2]) / 2 + c.r * 0.45] as V3), [])
  const gas = useMemo(() => {
    const rnd = rnd0(77), pts = TIS_CAP.getSpacedPoints(60).slice(16, 44)
    const cap = (): V3 => { const p = pts[Math.floor(rnd() * pts.length)]; return [p.x, p.y, p.z] }
    const cell = (): V3 => { const c = CELLS[Math.floor(rnd() * 6)], t = 0.2 + rnd() * 0.6; return [c.a[0] + (c.b[0] - c.a[0]) * t, c.a[1] + (rnd() - 0.5) * 0.2, c.a[2] + c.r * 0.9] }
    return { o2: Array.from({ length: 24 }, () => [cap(), cell()]), co2: Array.from({ length: 20 }, () => [cell(), cap()]) }
  }, [])
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><meshPhysicalMaterial color="#c4646e" roughness={0.5} clearcoat={0.35} sheen={0.5} sheenColor="#ffb0b0" /></mesh>
    {nuclei.map((p, i) => <mesh key={i} position={p} scale={[0.16, 0.07, 0.07]}><sphereGeometry args={[1, 16, 10]} /><meshStandardMaterial color="#6a2a52" roughness={0.5} /></mesh>)}
    <CapTube curve={TIS_CAP} r={0.13} from="a" to="v" />
    <Flowing curve={TIS_CAP} n={16} from="a" to="v" on={on} size={0.18} speed={0.09} />
    <Gas paths={gas.o2} color="#ff9b2f" on={on} />
    <Gas paths={gas.co2} color="#a493d6" on={on} rate={0.2} />
  </group>
}

/** 放大镜：一圈淡淡的球壳把模型罩住，一根细线连回身体上的那一处 */
export function Magnifier({ at, site, r }: { at: V3; site: V3; r: number }) {
  const shell = useMemo(() => ghost('#9ad8ff', 0.0, 0.35, 3.2), [])
  const line = useMemo(() => {
    const d = new THREE.Vector3(...site).sub(new THREE.Vector3(...at)), e = new THREE.Vector3(...at).addScaledVector(d.clone().normalize(), r)
    return new THREE.BufferGeometry().setFromPoints([e, new THREE.Vector3(...site)])
  }, [at, site, r])
  return <group>
    <mesh position={at} material={shell}><sphereGeometry args={[r, 48, 32]} /></mesh>
    <lineSegments geometry={line}><lineBasicMaterial color="#9ad8ff" transparent opacity={0.55} /></lineSegments>
    <mesh position={site}><sphereGeometry args={[0.07, 16, 12]} /><meshBasicMaterial color="#9ad8ff" toneMapped={false} /></mesh>
  </group>
}

// ---------- 拓展：电子血压计 ----------
/** 缠在上臂的袖带：a、b 是上臂的两端，袖带套在中间 */
export function Cuff({ a, b, r, squeeze }: { a: V3; b: V3; r: number; squeeze: number }) {
  const { pos, quat } = useMemo(() => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); return { pos: A.clone().lerp(B, 0.42), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()) } }, [a, b])
  const geo = useMemo(() => lathe([[r + 0.06, -0.62], [r + 0.13, -0.56], [r + 0.15, 0], [r + 0.13, 0.56], [r + 0.06, 0.62], [r, 0.62], [r, -0.62]], { segs: 40, closed: true }), [r])
  return <group position={pos} quaternion={quat} scale={[1 + squeeze * 0.06, 1, 1 + squeeze * 0.06]}>
    <mesh geometry={geo} castShadow><meshPhysicalMaterial color="#25405f" roughness={0.85} sheen={0.6} sheenColor="#6a8bb0" /></mesh>
    {[-0.6, 0.6].map(y => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[r + 0.08, 0.018, 8, 40]} /><meshStandardMaterial color="#e7e4dc" roughness={0.7} /></mesh>)}
    {/* 魔术贴的一条和接气管的嘴 */}
    <mesh position={[r + 0.15, 0, 0]} rotation-z={Math.PI / 2}><boxGeometry args={[0.9, 0.012, 0.26]} /><meshStandardMaterial color="#1b2f46" roughness={0.95} /></mesh>
    <mesh position={[0, 0.2, r + 0.18]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.04, 0.05, 0.12, 12]} /><meshStandardMaterial color="#d9d9d6" roughness={0.4} /></mesh>
  </group>
}
/** 血压计主机：白色外壳、灰色面板、三行读数、开始键。lines 是三行字 */
export function Monitor({ at, lines, busy }: { at: V3; lines: [string, string, string]; busy: boolean }) {
  const btn = useMemo(() => disc(0.11, 0.03, { chamfer: 0.008 }), [])
  return <group position={at} rotation-y={-0.28}>
    <RoundedBox args={[1.3, 0.42, 0.95]} radius={0.12} smoothness={4} position={[0, 0.21, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#eeeeea" roughness={0.35} clearcoat={0.5} /></RoundedBox>
    {/* 斜着的面板和屏幕 */}
    <group position={[0, 0.36, 0.12]} rotation-x={-0.9}>
      <RoundedBox args={[1.12, 0.62, 0.05]} radius={0.03} smoothness={3}><meshStandardMaterial color="#3a4046" roughness={0.5} /></RoundedBox>
      <Led text={lines[0]} w={0.62} h={0.17} position={[-0.12, 0.17, 0.03]} />
      <Led text={lines[1]} w={0.62} h={0.17} position={[-0.12, -0.01, 0.03]} />
      <Led text={lines[2]} w={0.62} h={0.17} position={[-0.12, -0.19, 0.03]} />
      <mesh geometry={btn} position={[0.38, -0.06, 0.02]} rotation-x={Math.PI / 2}><meshStandardMaterial color={busy ? '#35c7b3' : '#2f7ad8'} emissive={busy ? '#35c7b3' : '#000000'} emissiveIntensity={busy ? 0.4 : 0} roughness={0.4} /></mesh>
    </group>
    {/* 接气管的口 */}
    <mesh position={[-0.66, 0.2, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.04, 0.05, 0.08, 12]} /><Metal kind="chrome" /></mesh>
  </group>
}
/** 一张小圆桌 */
export function SideTable({ at, top }: { at: V3; top: number }) {
  const g = useMemo(() => ({ top: disc(0.95, 0.07, { chamfer: 0.02, segs: 64 }), base: disc(0.6, 0.06, { chamfer: 0.02, segs: 48 }) }), [])
  return <group position={at}>
    <mesh geometry={g.top} position={[0, top - 0.07, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#e9e6df" roughness={0.3} clearcoat={0.4} /></mesh>
    <mesh position={[0, (top - 0.07) / 2, 0]} castShadow><cylinderGeometry args={[0.06, 0.08, top - 0.07, 20]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh geometry={g.base} castShadow receiveShadow><Metal kind="stainless" grain="turned" /></mesh>
  </group>
}
/** 一根软管 */
export function Hose({ pts }: { pts: V3[] }) {
  const geo = useMemo(() => new THREE.TubeGeometry(curveOf(pts), 60, 0.028, 8), [pts])
  return <mesh geometry={geo} castShadow><meshStandardMaterial color="#c9ccd0" roughness={0.45} /></mesh>
}
