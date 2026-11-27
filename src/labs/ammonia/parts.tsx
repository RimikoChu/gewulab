// 各课共用的小工具：确定的伪随机数、按时长走完的动作、缓动，以及拼模型用的“剖开的车削件”和沿折线走的管子。
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Part } from '@/lab-kit'

export type V3 = [number, number, number]
/** 一个确定的伪随机数发生器：同一个种子每次给出同一串数，画面不会每次刷新都变 */
export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
/** 五次平滑的缓入缓出 */
export const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * x * (x * (6 * x - 15) + 10) }
/** t 落在 [a, b] 里时从 0 走到 1 */
export const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** 一个按时长走完的动作：run() 开始，t 从 0 按真实时间走到 sec，走完调用 onEnd。snap() 直接跳到某处 */
export function useRun(sec: number, onEnd?: () => void) {
  const [t, setT] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ t: 0, raf: 0 }), cb = useRef(onEnd); cb.current = onEnd
  const run = () => {
    cancelAnimationFrame(s.current.raf); s.current.t = 0; setT(0); setBusy(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      s.current.t = Math.min(sec, s.current.t + dt); setT(s.current.t)
      if (s.current.t < sec) s.current.raf = requestAnimationFrame(f); else { setBusy(false); cb.current?.() }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  return { t, k: t / sec, busy, run, snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.t = v; setT(v); setBusy(false) } }
}

/** 一块立方体，按“底面在 y0”放 */
export const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, r?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c, r })
/** 一根竖的圆柱，底面在 y0 */
export const cyl = (x: number, y0: number, z: number, rad: number, h: number, c: string): Part => ({ p: [x, y0 + h / 2, z], s: [rad, h, rad], c, cyl: true })

/**
 * 剖开的车削件：截面线绕 y 轴只转 phi0 到 phi0 + len 这一段，两个剖面用截面多边形封上（剖面单独一组，好换材质）。
 * 截面按“外面在右手边”走，首尾相接成一个闭合的多边形（例如外壁从下往上、内壁从上往下）。拐角大于 crease 度保持硬边。
 * 返回的几何体有两组：0 是曲面，1 是剖面。
 */
export function latheArc(profile: [number, number][], phi0: number, len: number, { segs = 48, crease = 32 } = {}) {
  const n = profile.length, cos = Math.cos(crease * Math.PI / 180)
  const sn = profile.map((a, i) => { const b = profile[(i + 1) % n], dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1; return [dy / l, -dr / l] })
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = []
  const cols = segs + 1
  let along = 0
  for (let i = 0; i < n; i++) {
    const a = profile[i], b = profile[(i + 1) % n], na = sn[(i - 1 + n) % n], nb = sn[i], nc = sn[(i + 1) % n]
    if (a[0] < 1e-9 && b[0] < 1e-9) continue   // 贴着转轴的那一段不出曲面
    // 这一段两头的法线：和相邻段拐得缓就取平均
    const end = (p: number[], q: number[]) => p[0] * q[0] + p[1] * q[1] > cos ? (() => { const x = p[0] + q[0], y = p[1] + q[1], l = Math.hypot(x, y) || 1; return [x / l, y / l] })() : q
    const n0 = end(na, nb), n1 = end(nc, nb)
    const seglen = Math.hypot(b[0] - a[0], b[1] - a[1])
    const base = pos.length / 3
    for (const [p, nn, v] of [[a, n0, along], [b, n1, along + seglen]] as const) for (let j = 0; j < cols; j++) {
      const t = phi0 + len * j / segs, c = Math.cos(t), s = Math.sin(t)
      pos.push(p[0] * c, p[1], -p[0] * s); nor.push(nn[0] * c, nn[1], -nn[0] * s); uv.push(len * p[0] * j / segs, v)
    }
    for (let j = 0; j < segs; j++) { const a0 = base + j, a1 = a0 + 1, b0 = base + cols + j, b1 = b0 + 1; idx.push(a0, a1, b1, a0, b1, b0) }
    along += seglen
  }
  const nSide = idx.length
  // 两个剖面：截面多边形三角化
  const contour = profile.map(([r, y]) => new THREE.Vector2(r, y))
  const tris = THREE.ShapeUtils.triangulateShape(contour, [])
  for (const [t, flip] of [[phi0, false], [phi0 + len, true]] as const) {
    const c = Math.cos(t), s = Math.sin(t), base = pos.length / 3
    // 剖面的法线：朝着被切掉的那一侧
    const nx = flip ? -s : s, nz = flip ? -c : c
    for (const [r, y] of profile) { pos.push(r * c, y, -r * s); nor.push(nx, 0, nz); uv.push(r, y) }
    const ccw = THREE.ShapeUtils.isClockWise(contour) === flip
    for (const [a, b, d] of tris) ccw ? idx.push(base + a, base + b, base + d) : idx.push(base + a, base + d, base + b)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx); g.addGroup(0, nSide, 0); g.addGroup(nSide, idx.length - nSide, 1)
  return g
}

/** 沿折线走的管子：拐角处按 bend 的半径圆过去（像真的弯头），返回 TubeGeometry */
export function pipeGeo(pts: V3[], r: number, bend = r * 2.6, radial = 14) {
  const P = pts.map(p => new THREE.Vector3(...p)), path = new THREE.CurvePath<THREE.Vector3>()
  let cur = P[0].clone()
  for (let i = 1; i < P.length; i++) {
    const a = P[i], next = P[i + 1]
    if (!next) { path.add(new THREE.LineCurve3(cur, a)); break }
    const d0 = a.clone().sub(P[i - 1]).normalize(), d1 = next.clone().sub(a).normalize()
    const k = Math.min(bend, a.distanceTo(P[i - 1]) / 2, a.distanceTo(next) / 2)
    const p0 = a.clone().addScaledVector(d0, -k), p1 = a.clone().addScaledVector(d1, k)
    path.add(new THREE.LineCurve3(cur, p0)); path.add(new THREE.QuadraticBezierCurve3(p0, a, p1)); cur = p1
  }
  const L = path.getLength()
  return new THREE.TubeGeometry(path, Math.max(8, Math.ceil(L / Math.max(r, 0.05) * 0.6) + P.length * 6), r, radial, false)
}

/** 沿一条折线按长度取点：u 从 0 到 1 */
export function polyAt(pts: V3[], u: number, out = new THREE.Vector3()) {
  const L: number[] = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]))
  const s = Math.max(0, Math.min(1, u)) * L[L.length - 1]
  let i = 1; while (i < L.length - 1 && L[i] < s) i++
  const k = (s - L[i - 1]) / ((L[i] - L[i - 1]) || 1), a = pts[i - 1], b = pts[i]
  return out.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k))
}
