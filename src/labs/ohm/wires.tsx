// 导线和电流的亮点。导线从接线柱上拧出来，先拱起一点，落到台垫上顺着走，再拐进下一个接线柱；高处的接线柱多伸出去一段再垂下来，不穿过器材。
// 面板上横着的接线柱（电源的输出）给出出线方向 d：导线先顺着它伸出去，再垂到台面。
// 电流用沿导线流动的一串亮点表示：从电源正极出发，经过用电器回到负极；电流越大跑得越快。全部按厘米写。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { V3 } from './gear'

/** 导线的半径（cm）：实验导线外径约 3 mm */
const R = 0.16
/** 导线的一头：接线柱上夹导线的那一点；d 是面板上横着的接线柱朝外的方向 */
export interface End { p: V3; d?: V3; o?: number }
const flat = (a: V3, b: V3) => { const d = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]); return d.lengthSq() < 1e-6 ? new THREE.Vector3(1, 0, 0) : d.normalize() }

/** 一头的引出段：从接线柱出来、落到台面上为止的几个点（顺着导线走的方向） */
function lead(e: End, toward: V3) {
  const A = new THREE.Vector3(...e.p), h = Math.max(0, e.p[1] - R)
  if (e.d) {
    const d = new THREE.Vector3(...e.d).normalize()
    return [A.clone().addScaledVector(d, 0.3), A.clone().addScaledVector(d, 1.5).setY(e.p[1] - 0.15), A.clone().addScaledVector(d, 3.2).setY(R + h * 0.35), A.clone().addScaledVector(d, 4.8).setY(R), A.clone().addScaledVector(d, 6.0).setY(R)]
  }
  const d = flat(e.p, toward), out = (2.6 + h * 0.6) * (e.o ?? 1)
  return [A.clone().addScaledVector(d, 0.32), A.clone().addScaledVector(d, 1.1).setY(e.p[1] + 0.5), A.clone().addScaledVector(d, out * 0.6).setY(R + h * 0.6), A.clone().addScaledVector(d, out).setY(R), A.clone().addScaledVector(d, out + 1.2).setY(R)]
}
/** 从 a 到 b 的导线的走向。via：中途经过台面上的点（y 不写就贴着台面；写了就是从别的导线上搭过去） */
export function wirePath(a: End, b: End, via: (V3 | [number, number])[] = []) {
  const vs = via.map(v => v.length === 3 ? new THREE.Vector3(v[0], v[1], v[2]) : new THREE.Vector3(v[0], R, v[1]))
  const first: V3 = vs[0] ? [vs[0].x, vs[0].y, vs[0].z] : b.p, last: V3 = vs.length ? [vs[vs.length - 1].x, 0, vs[vs.length - 1].z] : a.p
  // 两个接线柱挨得很近（串联的两只电阻之间）：不落到台面，拱成一道弯搭过去
  const span = Math.hypot(b.p[0] - a.p[0], b.p[2] - a.p[2])
  if (!vs.length && !a.d && !b.d && span < 11) {
    const A = new THREE.Vector3(...a.p), B = new THREE.Vector3(...b.p), d = flat(a.p, b.p), top = Math.max(a.p[1], b.p[1]) + 1.2 + span * 0.12
    return new THREE.CatmullRomCurve3([A.clone().addScaledVector(d, 0.32), A.clone().addScaledVector(d, 1.0).setY(a.p[1] + 0.7), A.clone().lerp(B, 0.5).setY(top), B.clone().addScaledVector(d, -1.0).setY(b.p[1] + 0.7), B.clone().addScaledVector(d, -0.32)], false, 'centripetal', 0.5)
  }
  const pts = [...lead(a, first), ...vs, ...lead(b, last).reverse()]
  // 落到台面以后不许钻到台面下面
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
}

/** 一根导线：两头各一片黄铜的叉形线鼻子压在接线柱下。flow：流过它的电流（A），正数表示从 a 流向 b */
export function Wire({ a, b, color, via, flow = 0 }: { a: End; b: End; color: string; via?: (V3 | [number, number])[]; flow?: number }) {
  const key = JSON.stringify([a, b, via])
  const { geo, curve, len } = useMemo(() => {
    const curve = wirePath(a, b, via), len = curve.getLength()
    return { curve, len, geo: new THREE.TubeGeometry(curve, Math.max(28, Math.round(len * 3.2)), R, 8, false) }
  }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  const ends = useMemo(() => [a, b].map((e, i) => {
    const t = curve.getTangentAt(i === 0 ? 0.002 : 0.998)
    return { e, ang: Math.atan2(-t.z * (i ? -1 : 1), t.x * (i ? -1 : 1)) }
  }), [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.38} clearcoat={0.4} clearcoatRoughness={0.35} /></mesh>
    {ends.map(({ e, ang }, i) => e.d
      ? <mesh key={i} position={e.p} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.4, 0.4, 0.05, 16]} /><meshStandardMaterial color="#c9a55a" metalness={1} roughness={0.3} /></mesh>
      : <mesh key={i} position={[e.p[0], e.p[1] - 0.1, e.p[2]]} rotation-y={ang}><boxGeometry args={[0.9, 0.05, 0.42]} /><meshStandardMaterial color="#c9a55a" metalness={1} roughness={0.3} /></mesh>)}
    {Math.abs(flow) > 1e-6 && <Flow curve={curve} len={len} flow={flow} />}
  </group>
}

/** 沿导线流动的亮点：每 2.6 cm 一个，速度按电流定 */
const DOT = new THREE.SphereGeometry(0.22, 10, 8)
function Flow({ curve, len, flow }: { curve: THREE.Curve<THREE.Vector3>; len: number; flow: number }) {
  const n = Math.max(2, Math.round(len / 2.6)), ref = useRef<THREE.InstancedMesh>(null), phase = useRef(0)
  const m = useMemo(() => new THREE.Matrix4(), []), p = useMemo(() => new THREE.Vector3(), [])
  const speed = Math.sign(flow) * (3 + Math.min(1, Math.abs(flow) / 0.6) * 22)   // cm/s
  useFrame((_, d) => {
    const im = ref.current; if (!im) return
    phase.current = (phase.current + Math.min(d, 1 / 30) * speed / len + 1) % 1
    for (let i = 0; i < n; i++) {
      const u = (phase.current + i / n) % 1
      curve.getPointAt(u, p)
      const s = Math.min(1, u * 8, (1 - u) * 8)
      m.makeScale(s, s, s).setPosition(p); im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[DOT, undefined, n]} frustumCulled={false}><meshBasicMaterial color="#ffe27a" toneMapped={false} /></instancedMesh>
}
