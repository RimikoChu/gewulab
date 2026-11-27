// 管道和设备里流动的气体、液体：沿折线走的一串发光小球。颜色可以按走到哪（u）变，表示温度或成分在变。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { V3 } from './parts'

/** 预先算好一条折线的累计长度，按 0–1 取点 */
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
 * paths：几条折线；density：每米几颗；speed：每秒走多少米；size：小球半径；
 * color(u, path)：走到 u 处的颜色；on：0–1，0 时全部隐去（淡出）
 */
export function Flow({ paths, density = 1.2, speed = 2, size = 0.08, color, on = 1, max = 600 }: { paths: V3[][]; density?: number; speed?: number; size?: number; color: (u: number, path: number) => string | THREE.Color; on?: number; max?: number }) {
  const lines = useMemo(() => paths.map(polyline), [paths])
  const items = useMemo(() => {
    const out: { p: number; u: number }[] = []
    lines.forEach((l, p) => { const n = Math.max(2, Math.round(l.total * density)); for (let i = 0; i < n && out.length < max; i++) out.push({ p, u: i / n }) })
    return out
  }, [lines, density, max])
  const mesh = useRef<THREE.InstancedMesh>(null)
  const k = useRef(on), tmp = useMemo(() => ({ o: new THREE.Object3D(), v: new THREE.Vector3(), c: new THREE.Color() }), [])
  const colors = useRef(new Map<string, THREE.Color>())
  useFrame((_, d) => {
    const m = mesh.current; if (!m) return
    const dt = Math.min(d, 1 / 30)
    k.current += (on - k.current) * (1 - Math.exp(-dt / 0.4))
    const vis = k.current
    m.visible = vis > 0.02
    if (!m.visible) return
    items.forEach((it, i) => {
      const l = lines[it.p]
      it.u = (it.u + dt * speed / l.total) % 1
      l.at(it.u, tmp.v)
      const fade = Math.min(1, it.u / 0.04, (1 - it.u) / 0.04)
      tmp.o.position.copy(tmp.v); tmp.o.scale.setScalar(size * vis * fade); tmp.o.updateMatrix(); m.setMatrixAt(i, tmp.o.matrix)
      const c = color(it.u, it.p)
      if (typeof c === 'string') { let cc = colors.current.get(c); if (!cc) { cc = new THREE.Color(c); colors.current.set(c, cc) } m.setColorAt(i, cc) } else m.setColorAt(i, c)
    })
    m.count = items.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[ball, undefined, Math.max(1, items.length)]} frustumCulled={false} renderOrder={5}>
    <meshBasicMaterial toneMapped={false} transparent opacity={0.95} depthWrite={false} />
  </instancedMesh>
}
