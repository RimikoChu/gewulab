// 管道和设备里流动的气体、液体：沿折线走的一串发光小球。颜色可以按走到哪（u）变，表示成分或温度在变。
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
/** 全实验室统一的颜色：SO₂ 黄、SO₃ 青绿、空气浅蓝、水和水蒸气白、矿尘灰褐、酸淡黄、热橙、冷蓝 */
export const GAS = { so2: '#ffd24a', so3: '#4fe0c8', air: '#9cc8ff', water: '#f2f6fa', dust: '#8a6a4a', acid: '#e9d9a0', hot: '#ff7a3c', cold: '#6fb3ff' }
const cache = new Map<string, THREE.Color>()
const col = (c: string) => { let v = cache.get(c); if (!v) { v = new THREE.Color(c); cache.set(c, v) } return v }
const mixed = new THREE.Color()
/** 两种颜色按 k 混合（每帧复用同一个对象，拿到就用） */
export const mix = (a: string, b: string, k: number) => mixed.copy(col(a)).lerp(col(b), Math.max(0, Math.min(1, k)))

const ball = new THREE.SphereGeometry(1, 10, 8)
/**
 * paths：几条折线；density：每米几颗；speed：每秒走多少米；size：小球半径；
 * color(u, path, i)：走到 u 处的颜色；on：0–1，0 时全部隐去（淡出）；jitter：横向散开多少（m），让一股气看着有粗细
 */
export function Flow({ paths, density = 1.2, speed = 2, size = 0.08, color, on = 1, max = 700, jitter = 0 }: { paths: V3[][]; density?: number; speed?: number; size?: number; color: (u: number, path: number, i: number) => string | THREE.Color; on?: number; max?: number; jitter?: number }) {
  const lines = useMemo(() => paths.map(polyline), [paths])
  const items = useMemo(() => {
    const out: { p: number; u: number; j: V3 }[] = []
    let s = 7; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
    lines.forEach((l, p) => { const n = Math.max(2, Math.round(l.total * density)); for (let i = 0; i < n && out.length < max; i++) out.push({ p, u: (i + r() * 0.6) / n, j: [(r() - 0.5) * 2 * jitter, (r() - 0.5) * 2 * jitter, (r() - 0.5) * 2 * jitter] }) })
    return out
  }, [lines, density, max, jitter])
  const mesh = useRef<THREE.InstancedMesh>(null)
  const k = useRef(on), tmp = useMemo(() => ({ o: new THREE.Object3D(), v: new THREE.Vector3() }), [])
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
      const fade = Math.min(1, it.u / 0.05, (1 - it.u) / 0.05)
      tmp.o.position.set(tmp.v.x + it.j[0], tmp.v.y + it.j[1], tmp.v.z + it.j[2]); tmp.o.scale.setScalar(size * vis * fade); tmp.o.updateMatrix(); m.setMatrixAt(i, tmp.o.matrix)
      const c = color(it.u, it.p, i)
      m.setColorAt(i, typeof c === 'string' ? col(c) : c)
    })
    m.count = items.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[ball, undefined, Math.max(1, items.length)]} frustumCulled={false} renderOrder={5}>
    <meshBasicMaterial toneMapped={false} transparent opacity={0.95} depthWrite={false} />
  </instancedMesh>
}

/**
 * 一团雾或烟：若干半透明的软球在一个范围里慢慢翻动、上飘。at 中心，size 范围的宽高深，n 个，on 0–1 浓淡，rise 上飘的速度
 */
export function Mist({ at, size, n = 18, color = '#ffffff', on = 0, rise = 0.3, r = 0.5, opacity = 0.16 }: { at: V3; size: V3; n?: number; color?: string; on?: number; rise?: number; r?: number; opacity?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null), mat = useRef<THREE.MeshBasicMaterial>(null)
  const seeds = useMemo(() => { let s = 31; const f = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; return Array.from({ length: n }, () => ({ x: f() - 0.5, y: f(), z: f() - 0.5, s: 0.6 + f() * 0.8, w: f() * 6 })) }, [n])
  const k = useRef(on), o = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }, d) => {
    const m = mesh.current; if (!m) return
    k.current += (on - k.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.8))
    m.visible = k.current > 0.02
    if (!m.visible) return
    if (mat.current) mat.current.opacity = opacity * k.current
    const t = clock.elapsedTime
    seeds.forEach((sd, i) => {
      const y = (sd.y + t * rise / size[1]) % 1, grow = 0.7 + y * 0.6
      o.position.set(at[0] + (sd.x + Math.sin(t * 0.4 + sd.w) * 0.08) * size[0], at[1] + (y - 0.5) * size[1], at[2] + (sd.z + Math.cos(t * 0.33 + sd.w) * 0.08) * size[2])
      o.scale.setScalar(r * sd.s * grow * Math.min(1, y / 0.15, (1 - y) / 0.15)); o.updateMatrix(); m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, n]} frustumCulled={false} renderOrder={6}>
    <sphereGeometry args={[1, 14, 10]} />
    <meshBasicMaterial ref={mat} color={color} transparent opacity={0} depthWrite={false} />
  </instancedMesh>
}
