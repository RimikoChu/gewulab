// 沙盘上各课自己的标记：从震源升到地面的虚线、地面上的连线、落在地面上的圆点和小旗。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Y, height } from './terrain'

type V3 = [number, number, number]
/** 一段发光的虚线（k：从起点画出去多少，0–1） */
export function Dashed({ from, to, k = 1, color = '#ffe9a8', r = 0.18, dash = 1.2 }: { from: V3; to: V3; k?: number; color?: string; r?: number; dash?: number }) {
  const segs = useMemo(() => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), len = a.distanceTo(b), n = Math.max(1, Math.floor(len / (dash * 2)))
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    return Array.from({ length: n }, (_, i) => ({ t0: i / n, t1: (i + 0.5) / n, q, a, b }))
  }, [from[0], from[1], from[2], to[0], to[1], to[2], dash])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>{segs.filter(s => s.t0 < k).map((s, i) => {
    const t1 = Math.min(s.t1, k), p = s.a.clone().lerp(s.b, (s.t0 + t1) / 2), l = s.a.distanceTo(s.b) * (t1 - s.t0)
    return <mesh key={i} position={p} quaternion={s.q} renderOrder={11}><cylinderGeometry args={[r, r, l, 8]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent /></mesh>
  })}</group>
}
/** 贴着地面的一条线：从 a 到 b（沙盘坐标 km），k 是画出去多少 */
export function GroundLine({ a, b, k = 1, color = '#ffe9a8', r = 0.3 }: { a: [number, number]; b: [number, number]; k?: number; color?: string; r?: number }) {
  const geo = useMemo(() => {
    if (k < 0.01) return null
    const n = 80, pts = Array.from({ length: n + 1 }, (_, i) => { const t = (i / n) * k, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; return new THREE.Vector3(x, Y(height(x, z)) + 0.5, z) })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, r, 8)
  }, [a[0], a[1], b[0], b[1], Math.round(k * 60), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return geo ? <mesh geometry={geo} renderOrder={9}><meshBasicMaterial color={color} toneMapped={false} /></mesh> : null
}
/** 地面上一点：一根细杆顶着一个亮点，脚下一个圆圈 */
export function Pin({ at, color = '#ffe9a8', s = 1 }: { at: [number, number]; color?: string; s?: number }) {
  const y = Y(height(at[0], at[1]))
  return <group position={[at[0], y, at[1]]} scale={s}>
    <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.08, 0.08, 2.8, 8]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <mesh position={[0, 2.9, 0]}><sphereGeometry args={[0.45, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <mesh position={[0, 0.25, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[1.1, 1.5, 40]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} /></mesh>
  </group>
}
/** 地震台（第 5 课 A、B、C）：一座小房子的符号，顶上一个三角 */
export function StationMark({ at, hot }: { at: [number, number]; hot: boolean }) {
  const y = Y(height(at[0], at[1]))
  return <group position={[at[0], y, at[1]]} scale={3.6}>
    <mesh position={[0, 0.12, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[1.1, 32]} /><meshBasicMaterial color="#0f1418" transparent opacity={0.55} /></mesh>
    <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.1, 0.1, 1.8, 8]} /><meshStandardMaterial color="#d9dde0" metalness={0.5} roughness={0.4} /></mesh>
    <mesh position={[0, 2.4, 0]} rotation-x={Math.PI}><coneGeometry args={[1.3, 2.2, 3]} /><meshBasicMaterial color={hot ? '#ffe9a8' : '#7fe3d4'} toneMapped={false} /></mesh>
  </group>
}
