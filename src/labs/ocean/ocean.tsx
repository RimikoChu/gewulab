// 把看不见的海水运动画出来的几样东西：贴着海面流动的洋流箭头（暖流红、寒流蓝），白色的风，剖面上的水流，
// 跟踪一个漂流物走过的路线，以及海上的云和雨。地球的尺寸、坐标换算也在这里。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LL } from './physics'

export type V3 = [number, number, number]
export const WARM = '#ff5a3c', COLD = '#3f8cff', WIND = '#f4f8ff', TRACE = '#ffe17a'
const RAD = Math.PI / 180
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
/** 地球半径（场景单位） */
export const R = 10
/** 地球上一点：东经 90° 在 −z 方向 */
export const sph = (lon: number, lat: number, r = R): V3 => [r * Math.cos(lat * RAD) * Math.cos(lon * RAD), r * Math.sin(lat * RAD), -r * Math.cos(lat * RAD) * Math.sin(lon * RAD)]
/** 镜头的方位角（弧度）：从这个经度的正上方斜着看过去 */
export const azFor = (lon: number) => (lon + 90) * RAD

// ---------- 切开的地球 ----------
/** 沿纬度 lat 这个平面切掉南边的整块地球，镜头从下面（南边）看剖面，东在右、西在左，和地图一样；剖面上 z 是从海面往下的深度（以剖面那一层的厚度 D 为单位，负数是海面以上的空气） */
export interface CutGeo { lat: number; D: number }
export const cutY = (c: CutGeo) => R * Math.sin(c.lat * RAD)
export const cutRc = (c: CutGeo) => R * Math.cos(c.lat * RAD)
export function facePoint(c: CutGeo, lon: number, z: number, lift = 0.01): V3 {
  const r = cutRc(c) - z * c.D
  return [r * Math.cos(lon * RAD), cutY(c) - lift, -r * Math.sin(lon * RAD)]
}
/** 从剖面正下方看过去、让这个经度的海面朝画面上方的机位（方位角、仰角） */
export const faceView = (lon: number, el = 1.36): [number, number] => [azFor(lon), -el]

// ---------- 摆放在地球上的东西 ----------
/** 海面上一处的位置和朝向：船头朝 heading（度，正北 0、正东 90），模型的 +x 是船头、+y 朝天 */
export function onSurface(lon: number, lat: number, heading: number, lift = 0) {
  const lo = lon * RAD, la = lat * RAD
  const up = new THREE.Vector3(...sph(lon, lat, 1))
  const e = new THREE.Vector3(-Math.sin(lo), 0, -Math.cos(lo)), n = new THREE.Vector3(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo))
  const f = e.multiplyScalar(Math.sin(heading * RAD)).add(n.multiplyScalar(Math.cos(heading * RAD))).normalize()
  const m = new THREE.Matrix4().makeBasis(f, up, f.clone().cross(up))
  return { position: up.clone().multiplyScalar(R + lift).toArray() as V3, quaternion: new THREE.Quaternion().setFromRotationMatrix(m) }
}
/** 剖面边上（海面）的一处：船身侧面朝镜头。east 为真时船头朝东 */
export function onRim(c: CutGeo, lon: number, east: boolean, out = 0.01) {
  const lo = lon * RAD
  const up = new THREE.Vector3(Math.cos(lo), 0, -Math.sin(lo))
  const f = new THREE.Vector3(-Math.sin(lo), 0, -Math.cos(lo)).multiplyScalar(east ? 1 : -1)
  const m = new THREE.Matrix4().makeBasis(f, up, f.clone().cross(up))
  const p = up.clone().multiplyScalar(cutRc(c)); p.y = cutY(c) - out
  return { position: p.toArray() as V3, quaternion: new THREE.Quaternion().setFromRotationMatrix(m) }
}

// ---------- 流动的箭头 ----------
/** 一枚平贴的箭头：朝 +y，面朝 +z */
function arrowGeo(s: number, slim = 1) {
  const sh = new THREE.Shape(), w = slim
  sh.moveTo(0, 0.62 * s); sh.lineTo(-0.3 * s * w, 0.08 * s); sh.lineTo(-0.1 * s * w, 0.14 * s); sh.lineTo(-0.07 * s * w, -0.7 * s); sh.lineTo(0.07 * s * w, -0.7 * s); sh.lineTo(0.1 * s * w, 0.14 * s); sh.lineTo(0.3 * s * w, 0.08 * s); sh.closePath()
  return new THREE.ShapeGeometry(sh)
}
/** 一条流线：场景里的一串点和颜色 */
export interface Line { pts: V3[]; color: string; closed?: boolean }
/**
 * 沿流线匀速前进的箭头，外加一条淡淡的线。normal 不给时箭头平贴在球面上（法向朝外），给了就平贴在那个平面上（剖面用）。
 * on 0–1 淡入淡出；speed 场景单位/秒；gap 箭头间距
 */
export function Flow({ lines, on, speed = 1, size = 0.42, gap = 1.1, normal, line = 0.35, order = 7 }: { lines: Line[]; on: number; speed?: number; size?: number; gap?: number; normal?: V3; line?: number; order?: number }) {
  const data = useMemo(() => lines.filter(l => l.pts.length > 1).map(l => {
    const curve = new THREE.CatmullRomCurve3(l.pts.map(p => new THREE.Vector3(...p)), !!l.closed, 'centripetal')
    const len = curve.getLength(), n = Math.max(2, Math.round(len / gap))
    return { curve, len, n, color: new THREE.Color(l.color), closed: !!l.closed, tube: new THREE.TubeGeometry(curve, Math.max(24, Math.round(len * 6)), 0.035 * size / 0.42, 5, !!l.closed) }
  }), [lines, gap, size])
  const total = Math.max(1, data.reduce((a, d) => a + d.n, 0))
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(arrowGeo(size), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), total)
    m.frustumCulled = false; m.renderOrder = order
    for (let i = 0; i < total; i++) m.setColorAt(i, new THREE.Color('#fff'))
    return m
  }, [total, size, order])
  const lineMats = useMemo(() => data.map(d => new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })), [data])
  const fade = useRef(0), clock = useRef(0)
  const t = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), d: new THREE.Vector3(), up: new THREE.Vector3(), x: new THREE.Vector3(), nn: normal ? new THREE.Vector3(...normal) : null }), [normal])
  useFrame((_, dd) => {
    const dt = Math.min(dd, 1 / 30); clock.current += dt
    fade.current += (on - fade.current) * Math.min(1, dt * 2.2)
    for (const m of lineMats) m.opacity = fade.current * line
    const mat = mesh.material as THREE.MeshBasicMaterial; mat.opacity = 0.95 * fade.current; mesh.visible = fade.current > 0.01
    if (!mesh.visible) return
    let i = 0
    for (const s of data) for (let k = 0; k < s.n; k++) {
      const u = ((clock.current * speed) / s.len + k / s.n) % 1
      s.curve.getPointAt(u, t.p); s.curve.getTangentAt(u, t.d)
      if (t.nn) t.up.copy(t.nn); else t.up.copy(t.p).normalize()
      t.d.addScaledVector(t.up, -t.d.dot(t.up)).normalize(); t.x.crossVectors(t.d, t.up)
      const sc = s.closed ? 1 : Math.min(1, u * 8, (1 - u) * 8)      // 开口的流线：两头渐隐
      t.m.makeBasis(t.x.multiplyScalar(sc), t.d.multiplyScalar(sc), t.up); t.m.setPosition(t.p)
      mesh.setMatrixAt(i, t.m); mesh.setColorAt(i, s.color); i++
    }
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return <group>
    <primitive object={mesh} />
    {data.map((s, i) => <mesh key={i} geometry={s.tube} material={lineMats[i]} renderOrder={order - 1} />)}
  </group>
}
/** 一串经纬度换成贴着海面的流线点 */
export const surfaceLine = (pts: LL[], color: string, lift = 1.004, closed = false): Line => ({ pts: pts.map(([lo, la]) => sph(lo, la, R * lift)), color, closed })

/** 一个漂流物走过的路线：pts 是经纬度点列，t 0–1 是走到了哪（只画到这里，头上一颗亮点） */
export function Track({ pts, t, color = TRACE, width = 0.05, lift = 1.006 }: { pts: LL[]; t: number; color?: string; width?: number; lift?: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts.map(([lo, la]) => new THREE.Vector3(...sph(lo, la, R * lift)))), [pts, lift])
  const geo = useMemo(() => new THREE.TubeGeometry(curve, Math.max(60, pts.length * 4), width, 6, false), [curve, width, pts.length])
  const tt = clamp(t)
  geo.setDrawRange(0, Math.round(tt * (geo.index ? geo.index.count : 0) / 6) * 6)
  return <mesh geometry={geo} renderOrder={11}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} depthWrite={false} /></mesh>
}
/** 沿路线走到 t 的位置和朝向（度，正北 0） */
export function alongTrack(pts: LL[], t: number): { lon: number; lat: number; heading: number } {
  const n = pts.length - 1, f = clamp(t) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i
  const [a, b] = [pts[i], pts[i + 1]]
  const lon = a[0] + (b[0] - a[0]) * k, lat = a[1] + (b[1] - a[1]) * k
  const heading = Math.atan2((b[0] - a[0]) * Math.cos(lat * RAD), b[1] - a[1]) / RAD
  return { lon, lat, heading }
}

// ---------- 云和雨 ----------
/** 一团积云：几个软边的白球挤在一起，下面拖着雨丝。amt 0–1 是云的多少，rain 下雨的多少 */
export function Cloud({ at, up, amt, rain = 0, scale = 1, seed = 3, flat = false }: { at: V3; up: V3; amt: number; rain?: number; scale?: number; seed?: number; flat?: boolean }) {
  const puffs = useMemo(() => {
    let s = seed * 9973 + 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    return Array.from({ length: 9 }, () => ({ p: [(r() - 0.5) * 1.4, r() * 0.5, (r() - 0.5) * 1.0] as V3, s: 0.28 + r() * 0.3 }))
  }, [seed])
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...up).normalize()), [up])
  const g = useRef<THREE.Group>(null), cur = useRef(0), rr = useRef<THREE.Group>(null), rc = useRef(0)
  useFrame((st, d) => {
    cur.current += (amt - cur.current) * Math.min(1, d * 1.5); rc.current += (rain - rc.current) * Math.min(1, d * 1.5)
    if (g.current) { const k = Math.max(0.001, cur.current) * scale; g.current.scale.set(k * (flat ? 1.6 : 1), k * (flat ? 0.22 : 1), k * (flat ? 1.3 : 1)); g.current.visible = cur.current > 0.02 }
    if (rr.current) { rr.current.visible = rc.current > 0.03; rr.current.children.forEach((c, i) => { c.position.y = -0.2 - ((st.clock.elapsedTime * 2.2 + i * 0.37) % 1) * 0.9; (((c as THREE.Mesh).material) as THREE.MeshBasicMaterial).opacity = 0.55 * rc.current }) }
  })
  return <group position={at} quaternion={q}>
    <group ref={g}>
      {puffs.map((p, i) => <mesh key={i} position={p.p}><sphereGeometry args={[p.s, 20, 14]} /><meshStandardMaterial color="#f3f5f8" emissive="#8d97a3" emissiveIntensity={0.55} roughness={1} transparent opacity={0.95} /></mesh>)}
      <group ref={rr}>
        {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[((i * 37) % 13) / 13 * 1.2 - 0.6, -0.4, ((i * 53) % 11) / 11 * 0.8 - 0.4]}><cylinderGeometry args={[0.012, 0.012, 0.32, 4]} /><meshBasicMaterial color="#cfe3ff" transparent opacity={0.5} depthWrite={false} /></mesh>)}
      </group>
    </group>
  </group>
}
