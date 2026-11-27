// 把看不见的大气画出来的几样东西：剖面上沿环流圈走的气流粒子、地球表面随风流动的白色箭头、一团空气走过的路线。
// 配色全间统一：暖红、冷蓝；高压蓝、低压红；风的箭头白色，被跟踪的一团空气淡黄。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { surfaceWind, type Air } from './physics'

type V3 = [number, number, number]
export const WARM = '#ff5a3c', COLD = '#3f8cff', TRACE = '#ffe17a'
const RAD = Math.PI / 180
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
/** 地球半径、大气层厚度（放大很多倍，示意） */
export const R = 10, H = 5
/** 地球上一点（经度、纬度、离球心的距离）在地球自己的坐标里的位置：东经 90° 在 −z 方向 */
export const sph = (lon: number, lat: number, r = R): V3 => [r * Math.cos(lat * RAD) * Math.cos(lon * RAD), r * Math.sin(lat * RAD), -r * Math.cos(lat * RAD) * Math.sin(lon * RAD)]

// ---------- 剖面上的环流圈 ----------
/** 一条流线：一串点（首尾相接），heat 是每个点的冷暖（−1–1），粒子按它着色 */
export interface Stream { pts: V3[]; heat: number[] }
/**
 * 剖面上的一个环流圈：在纬度 φa–φb、离地 ha–hb 之间的圆角矩形（超椭圆），up 是空气上升的那一侧的纬度。
 * toWorld 把（纬度、离地高度）换成场景里的位置。
 */
export function cellLoop(pa: number, pb: number, ha: number, hb: number, up: number, toWorld: (lat: number, h: number) => V3): Stream {
  const pc = (pa + pb) / 2, dp = Math.abs(pb - pa) / 2, hc = (ha + hb) / 2, dh = (hb - ha) / 2, n = 64
  const pts: V3[] = [], heat: number[] = []
  const sg = (x: number) => Math.sign(x) * Math.pow(Math.abs(x), 0.32)
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, lat = pc + dp * sg(Math.cos(t)), h = hc + dh * sg(Math.sin(t))
    pts.push(toWorld(lat, h)); heat.push(clamp(1 - Math.abs(lat) / 40, -1, 1) * 1.1 - (Math.abs(lat) > 55 ? 0.4 : 0))
  }
  // t 增大时：在 φ 大的一侧上升。上升的一侧是 φ 小的那一边就倒过来走
  if (Math.abs(up - Math.max(pa, pb)) > Math.abs(up - Math.min(pa, pb))) { pts.reverse(); heat.reverse() }
  return { pts, heat }
}
const UP = new THREE.Vector3(0, 1, 0)
/** 沿流线走的箭头粒子，外加一条淡淡的线。on 0–1 淡入淡出；speed 场景单位/秒 */
export function Streams({ streams, on, speed = 1.8, per = 0.9, size = 0.8, line = 0.5 }: { streams: Stream[]; on: number; speed?: number; per?: number; size?: number; line?: number }) {
  const data = useMemo(() => streams.map(s => {
    const curve = new THREE.CatmullRomCurve3(s.pts.map(p => new THREE.Vector3(...p)), true, 'centripetal')
    const len = curve.getLength(), n = Math.max(4, Math.round(len * per / 1.1))
    const heatAt = (t: number) => { const f = t * s.heat.length, i = Math.floor(f) % s.heat.length, j = (i + 1) % s.heat.length; return s.heat[i] + (s.heat[j] - s.heat[i]) * (f - Math.floor(f)) }
    return { curve, len, n, heatAt, line: new THREE.TubeGeometry(curve, 160, 0.035 * size / 0.5, 6, true) }
  }), [streams])   // eslint-disable-line react-hooks/exhaustive-deps
  const total = data.reduce((a, d) => a + d.n, 0)
  const mesh = useMemo(() => {
    const cone = new THREE.ConeGeometry(0.2 * size, 0.62 * size, 10); cone.translate(0, 0.1 * size, 0)
    const tail = new THREE.CylinderGeometry(0.075 * size, 0.015 * size, 1.1 * size, 6); tail.translate(0, -0.7 * size, 0)
    const a = cone.toNonIndexed(), b = tail.toNonIndexed(), merged = new THREE.BufferGeometry()
    merged.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...(a.attributes.position.array as Float32Array), ...(b.attributes.position.array as Float32Array)]), 3))
    const m = new THREE.InstancedMesh(merged, new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }), Math.max(1, total))
    m.frustumCulled = false; m.renderOrder = 9
    const white = new THREE.Color('#ffffff'); for (let i = 0; i < Math.max(1, total); i++) m.setColorAt(i, white)
    return m
  }, [total, size])
  const lineMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e8f1ff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), [])
  const fade = useRef(0), clock = useRef(0)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), t: new THREE.Vector3(), c: new THREE.Color(), w: new THREE.Color(WARM), k: new THREE.Color(COLD), n: new THREE.Color('#f4f8ff') }), [])
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30); clock.current += dt
    fade.current += (on - fade.current) * Math.min(1, dt * 2.2)
    lineMat.opacity = fade.current * line
    const mat = mesh.material as THREE.MeshBasicMaterial; mat.opacity = fade.current; mesh.visible = fade.current > 0.01
    if (!mesh.visible) return
    let i = 0
    for (const s of data) for (let k = 0; k < s.n; k++) {
      const u = ((clock.current * speed) / s.len + k / s.n) % 1
      s.curve.getPointAt(u, tmp.p); s.curve.getTangentAt(u, tmp.t)
      tmp.q.setFromUnitVectors(UP, tmp.t.normalize())
      tmp.m.compose(tmp.p, tmp.q, tmp.s.set(1, 1, 1)); mesh.setMatrixAt(i, tmp.m)
      const h = s.heatAt(u); tmp.c.copy(tmp.n).lerp(h > 0 ? tmp.w : tmp.k, Math.min(1, Math.abs(h)))
      mesh.setColorAt(i, tmp.c); i++
    }
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return <group>
    <primitive object={mesh} />
    {data.map((s, i) => <mesh key={i} geometry={s.line} material={lineMat} renderOrder={8} />)}
  </group>
}

// ---------- 地表的风 ----------
/** 一枚平贴在地面上的箭头：箭头朝 +y，面朝 +z */
function arrowGeo(s: number) {
  const sh = new THREE.Shape()
  sh.moveTo(0, 0.62 * s); sh.lineTo(-0.27 * s, 0.12 * s); sh.lineTo(-0.085 * s, 0.17 * s); sh.lineTo(-0.05 * s, -0.9 * s); sh.lineTo(0.05 * s, -0.9 * s); sh.lineTo(0.085 * s, 0.17 * s); sh.lineTo(0.27 * s, 0.12 * s); sh.closePath()
  return new THREE.ShapeGeometry(sh)
}
/**
 * 地球表面随风流动的白色箭头：每枚箭头在球面上沿 surfaceWind 走，走一段寿命后在随机的地方重新出现。
 * air 是这一刻的大气（每一帧现取，所以季节、自转一变，风跟着变）；on 0–1 淡入淡出。
 * box：只在这个经纬度范围里放箭头（推近看某一处时用，箭头密一些）
 */
export function Winds({ air, on, n = 1400, size = 0.55, box, speed = 7, cut }: { air: Air; on: number; n?: number; size?: number; box?: [number, number, number, number]; speed?: number; cut?: [number, number] }) {
  const [l0, l1, b0, b1] = box ?? [-180, 180, -84, 84]
  const st = useMemo(() => {
    let s = 91; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647
    const born = () => { const lat = Math.asin(Math.sin(b0 * RAD) + rn() * (Math.sin(b1 * RAD) - Math.sin(b0 * RAD))) / RAD; return { lon: l0 + rn() * (l1 - l0), lat } }
    return { rn, born, pts: Array.from({ length: n }, () => ({ ...born(), age: rn() * 4, life: 2.6 + rn() * 2.4 })) }
  }, [n, l0, l1, b0, b1])
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(arrowGeo(size), new THREE.MeshBasicMaterial({ color: '#f6f9ff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), n)
    m.frustumCulled = false; m.renderOrder = 6
    return m
  }, [n, size])
  const a = useRef(air); a.current = air
  const fade = useRef(0)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), e: new THREE.Vector3(), nn: new THREE.Vector3(), up: new THREE.Vector3(), d: new THREE.Vector3(), x: new THREE.Vector3(), p: new THREE.Vector3() }), [])
  useFrame((_, dd) => {
    const dt = Math.min(dd, 1 / 30)
    fade.current += (on - fade.current) * Math.min(1, dt * 2)
    const mat = mesh.material as THREE.MeshBasicMaterial; mat.opacity = 0.92 * fade.current; mesh.visible = fade.current > 0.01
    if (!mesh.visible) return
    for (let i = 0; i < st.pts.length; i++) {
      const q = st.pts[i]
      q.age += dt
      if (q.age > q.life || Math.abs(q.lat) > 86) { Object.assign(q, st.born()); q.age = 0 }
      const [we, wn] = surfaceWind(q.lon, q.lat, a.current), mag = Math.hypot(we, wn)
      const v = speed * clamp(mag, 0.12, 1.2)
      if (mag > 1e-5) { q.lat += (wn / mag) * v * dt; q.lon += (we / mag) * v * dt / Math.max(0.15, Math.cos(q.lat * RAD)) }
      if (box && (q.lon < l0 - 4 || q.lon > l1 + 4 || q.lat < b0 - 4 || q.lat > b1 + 4)) q.age = q.life + 1
      const lo = q.lon * RAD, la = q.lat * RAD
      tmp.p.set(...sph(q.lon, q.lat, R * 1.012))
      tmp.up.copy(tmp.p).normalize()
      tmp.e.set(-Math.sin(lo), 0, -Math.cos(lo))
      tmp.nn.set(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo))
      tmp.d.copy(tmp.e).multiplyScalar(we).addScaledVector(tmp.nn, wn)
      if (tmp.d.lengthSq() < 1e-10) tmp.d.copy(tmp.nn)
      tmp.d.normalize(); tmp.x.crossVectors(tmp.d, tmp.up)
      const k = q.age / q.life
      let sc = Math.min(1, k * 5, (1 - k) * 4) * (0.55 + 0.45 * clamp(mag, 0, 1))
      if (cut && (((Math.atan2(tmp.p.x, tmp.p.z) - cut[0]) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) < cut[1] + 0.04) sc = 0   // 切掉的那一块里不画
      tmp.m.makeBasis(tmp.x.multiplyScalar(sc), tmp.d.multiplyScalar(sc), tmp.up)
      tmp.m.setPosition(tmp.p)
      mesh.setMatrixAt(i, tmp.m)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh} />
}

/** 一团空气走过的路线：pts 是经纬度点列，r 是离球心的距离；t 0–1 是走到了哪（路线只画到这里，头上一颗亮点） */
export function Path({ pts, r = R * 1.02, t = 1, color = TRACE, width = 0.09, heads = true }: { pts: [number, number][]; r?: number | ((i: number) => number); t?: number; color?: string; width?: number; heads?: boolean }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts.map(([lo, la], i) => new THREE.Vector3(...sph(lo, la, typeof r === 'number' ? r : r(i / Math.max(1, pts.length - 1)))))), [pts, r])
  const geo = useMemo(() => new THREE.TubeGeometry(curve, Math.max(40, pts.length * 2), width, 8, false), [curve, width, pts.length])
  const tt = clamp(t, 0, 1)
  const head = curve.getPointAt(Math.max(0.001, tt)), dir = curve.getTangentAt(Math.max(0.001, tt))
  const q = useMemo(() => new THREE.Quaternion(), [])
  q.setFromUnitVectors(UP, dir.clone().normalize())
  geo.setDrawRange(0, Math.round(tt * (geo.index ? geo.index.count : 0) / 6) * 6)   // 路线只画到走到的地方
  return <group>
    <mesh geometry={geo} renderOrder={11}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.95} /></mesh>
    {heads && tt > 0.01 && <mesh position={head} quaternion={q} renderOrder={12}><coneGeometry args={[width * 3.4, width * 9, 14]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>}
  </group>
}
