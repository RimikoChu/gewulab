// 导线和电流的亮点。导线从一个接线柱侧面拧出来，先往上弯一点，落到台面上顺着走，再拐进下一个接线柱，不穿过别的器材。
// 电流方向用沿导线流动的一串亮点表示：从电源正极出发，经过用电器回到负极；电流越大跑得越快。
// 全部按厘米写，和器材在同一个坐标里。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { V3 } from './world'

/** 导线的半径（cm）：常见的实验导线外径约 3 mm */
const R = 0.16
const flat = (a: V3, b: V3) => { const d = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]); return d.lengthSq() < 1e-6 ? new THREE.Vector3(1, 0, 0) : d.normalize() }

/** 从 a 到 b 的导线的走向。via：中途要经过的台面上的点（y 省略时贴着台面）；lift：中间拱起来多高（短导线跨过器材用） */
export function wirePath(a: V3, b: V3, via: V3[] = [], lift = 0) {
  const first = via[0] ?? b, last = via[via.length - 1] ?? a
  const da = flat(a, first), db = flat(b, last)
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b)
  const span = Math.hypot(b[0] - a[0], b[2] - a[2])
  const out = Math.min(3.2, Math.max(1.4, span * 0.22))
  const pts: THREE.Vector3[] = [
    A.clone().addScaledVector(da, 0.32),
    A.clone().addScaledVector(da, 1.3).add(new THREE.Vector3(0, 0.55, 0)),
  ]
  if (lift > 0) {
    const m = A.clone().lerp(B, 0.5); m.y = Math.max(a[1], b[1]) + lift
    pts.push(m)
  } else {
    pts.push(A.clone().addScaledVector(da, out + 0.8).setY(R))
    for (const v of via) pts.push(new THREE.Vector3(v[0], v[1] ?? R, v[2]))
    pts.push(B.clone().addScaledVector(db, out + 0.8).setY(R))
  }
  pts.push(B.clone().addScaledVector(db, 1.3).add(new THREE.Vector3(0, 0.55, 0)), B.clone().addScaledVector(db, 0.32))
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
}

/**
 * 一根导线。flow：流过它的电流（A），正数表示从 a 流向 b；0 不画亮点。show：要不要画亮点
 * 两头各一片黄铜的叉形线鼻子压在接线柱下。
 */
export function Wire({ a, b, color, via, lift = 0, flow = 0, show = true }: { a: V3; b: V3; color: string; via?: V3[]; lift?: number; flow?: number; show?: boolean }) {
  const key = `${a}|${b}|${via?.join(';') ?? ''}|${lift}`
  const { geo, curve, len } = useMemo(() => {
    const curve = wirePath(a, b, via, lift), len = curve.getLength()
    return { curve, len, geo: new THREE.TubeGeometry(curve, Math.max(24, Math.round(len * 3)), R, 8, false) }
  }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  const ends = useMemo(() => [a, b].map((p, i) => { const d = flat(p, i === 0 ? (via?.[0] ?? b) : (via?.[via.length - 1] ?? a)); return { p, ang: Math.atan2(-d.z, d.x) } }), [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.38} clearcoat={0.4} clearcoatRoughness={0.35} /></mesh>
    {ends.map((e, i) => <mesh key={i} position={[e.p[0], e.p[1] - 0.12, e.p[2]]} rotation-y={e.ang}><boxGeometry args={[0.9, 0.05, 0.42]} /><meshStandardMaterial color="#c9a55a" metalness={1} roughness={0.3} /></mesh>)}
    {show && Math.abs(flow) > 1e-6 && <Flow curve={curve} len={len} flow={flow} />}
  </group>
}

/** 沿着一条线流动的亮点：每 2.4 cm 一个，速度按电流定（短路时很快） */
const DOT = new THREE.SphereGeometry(0.24, 10, 8)
function Flow({ curve, len, flow }: { curve: THREE.Curve<THREE.Vector3>; len: number; flow: number }) {
  const n = Math.max(2, Math.round(len / 2.4)), ref = useRef<THREE.InstancedMesh>(null), phase = useRef(0)
  const m = useMemo(() => new THREE.Matrix4(), []), p = useMemo(() => new THREE.Vector3(), [])
  const speed = Number.isFinite(flow) ? Math.sign(flow) * (4 + Math.min(1, Math.abs(flow)) * 26) : 70   // cm/s
  useFrame((_, d) => {
    const im = ref.current; if (!im) return
    phase.current = (phase.current + Math.min(d, 1 / 30) * speed / len + 1) % 1
    for (let i = 0; i < n; i++) {
      const u = (phase.current + i / n) % 1
      curve.getPointAt(u, p)
      const s = Math.min(1, u * 8, (1 - u) * 8)        // 进出接线柱时淡入淡出
      m.makeScale(s, s, s).setPosition(p); im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[DOT, undefined, n]} frustumCulled={false}><meshBasicMaterial color="#ffe27a" toneMapped={false} /></instancedMesh>
}
