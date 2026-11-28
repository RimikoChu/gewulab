// 管道和设备里流动的东西：沿折线走的一串小球（油气、物料、颗粒）。颜色可以按走到哪变；开和关都有淡入淡出。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { V3 } from './parts'

/** 一条折线：按 0–1 取点 */
export function polyline(pts: V3[]) {
  const L: number[] = [0]
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]))
  const total = L[L.length - 1] || 1
  return {
    total,
    at(u: number, out: THREE.Vector3) {
      const s = Math.max(0, Math.min(1, u)) * total
      let i = 1; while (i < L.length - 1 && L[i] < s) i++
      const k = (s - L[i - 1]) / ((L[i] - L[i - 1]) || 1), a = pts[i - 1], b = pts[i]
      return out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k)
    },
  }
}
const ball = new THREE.SphereGeometry(1, 10, 8)
/**
 * paths：几条折线；density：每米几颗；speed：每秒走多少米；size：小球半径；color(u, 第几条)：走到 u 处的颜色；
 * on：0–1，0 时全部隐去；jitter：垂直于路径的抖动幅度（气体用）；glow：自发光（不受灯光影响）
 */
export function Flow({ paths, density = 1.2, speed = 2, size = 0.08, color, on = 1, max = 500, jitter = 0, glow = true }: { paths: V3[][]; density?: number; speed?: number; size?: number; color: (u: number, path: number) => string; on?: number; max?: number; jitter?: number; glow?: boolean }) {
  const lines = useMemo(() => paths.map(polyline), [paths])
  const items = useMemo(() => {
    const out: { p: number; u: number; a: number; b: number }[] = []
    let s = 7; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
    lines.forEach((l, p) => { const n = Math.max(2, Math.round(l.total * density)); for (let i = 0; i < n && out.length < max; i++) out.push({ p, u: (i + r() * 0.6) / n, a: r() * 6.28, b: r() }) })
    return out
  }, [lines, density, max])
  const mesh = useRef<THREE.InstancedMesh>(null), k = useRef(on), t = useRef(0)
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), v: new THREE.Vector3(), c: new THREE.Color() }), [])
  useFrame((_, d) => {
    const m = mesh.current; if (!m) return
    const dt = Math.min(d, 1 / 30)
    k.current += (on - k.current) * (1 - Math.exp(-dt / 0.35)); t.current += dt
    m.visible = k.current > 0.01
    if (!m.visible) return
    items.forEach((it, i) => {
      const l = lines[it.p]
      it.u += dt * speed / l.total; if (it.u > 1) it.u -= 1
      l.at(it.u, tmp.v)
      if (jitter) { const w = t.current * (1.2 + it.b) + it.a; tmp.v.x += Math.sin(w) * jitter; tmp.v.z += Math.cos(w * 1.3) * jitter; tmp.v.y += Math.sin(w * 0.7 + 1) * jitter * 0.5 }
      const edge = Math.min(1, it.u * 12, (1 - it.u) * 12)
      tmp.o.position.copy(tmp.v); tmp.o.scale.setScalar(size * (0.7 + 0.5 * it.b) * k.current * edge); tmp.o.updateMatrix(); m.setMatrixAt(i, tmp.o.matrix)
      m.setColorAt(i, tmp.c.set(color(it.u, it.p)))
    })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[ball, undefined, items.length]} frustumCulled={false}>
    {glow ? <meshBasicMaterial toneMapped={false} /> : <meshStandardMaterial roughness={0.5} />}
  </instancedMesh>
}
