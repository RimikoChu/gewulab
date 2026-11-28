// 各课共用的小工具：确定的伪随机数、按时长走完的动作、缓动；拼工厂设备用的零件（剖开的回转体、带弯头的管子、环形平台、直梯、钢框架）。
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Part } from '@/lab-kit'

export type V3 = [number, number, number]
export type RY = [number, number]
/** 确定的伪随机数：同一个种子每次给出同一串数 */
export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
/** 缓入缓出 */
export const ease = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x) }
/** t 落在 [a, b] 里时从 0 走到 1 */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** 一个按时长走完的动作：run() 开始，k 从 0 走到 1，走完调用 onEnd；snap(v) 直接跳到某处 */
export function useRun(sec: number, onEnd?: () => void) {
  const [k, setK] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ k: 0, raf: 0 }), cb = useRef(onEnd); cb.current = onEnd
  const run = () => {
    cancelAnimationFrame(s.current.raf); s.current.k = 0; setK(0); setBusy(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      s.current.k = Math.min(1, s.current.k + dt / sec); setK(s.current.k)
      if (s.current.k < 1) s.current.raf = requestAnimationFrame(f); else { setBusy(false); cb.current?.() }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  return { k, busy, run, snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.k = v; setK(v); setBusy(false) } }
}

/** 一块方块，底面在 y0 */
export const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, r?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c, r })
/** 一根竖的圆柱，底面在 y0 */
export const cyl = (x: number, y0: number, z: number, rad: number, h: number, c: string): Part => ({ p: [x, y0 + h / 2, z], s: [rad, h, rad], c, cyl: true })
/** 两点之间的一根方杆（斜撑、横梁） */
export function beam(a: V3, b: V3, t: number, c: string): Part {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len)), e = new THREE.Euler().setFromQuaternion(q)
  return { p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: [t, len, t], c, r: [e.x, e.y, e.z] }
}
/** 把一批零件整体挪一下 */
export const shift = (P: Part[], dx: number, dy: number, dz: number): Part[] => P.map(p => ({ ...p, p: [p.p[0] + dx, p.p[1] + dy, p.p[2] + dz] }))

/** 椭圆封头的截面点：半径 r，从 y 处凸出 h（dir 1 向上、-1 向下），从筒体边走到轴线 */
export const headPts = (r: number, y: number, h: number, dir: number, n = 10): RY[] => Array.from({ length: n + 1 }, (_, i) => { const a = i / n * Math.PI / 2; return [r * Math.cos(a), y + dir * h * Math.sin(a)] })
/** 立式容器的外形截面（两头椭圆封头），从下往上 */
export const vesselPts = (r: number, y0: number, y1: number, h = r * 0.5): RY[] => [...headPts(r, y0, h, -1).reverse(), ...headPts(r, y1, h, 1)]

/**
 * 剖开的回转体：闭合的截面多边形绕 y 轴只转 phi0 到 phi0 + len 这一段，两个剖面封上。
 * 截面按“外面在右手边”走（外壁从下往上、内壁从上往下）。拐角大于 crease 度的地方是硬边。
 * 几何体分两组：0 是曲面，1 是剖面（好换材质）。角度 t 处的点是 (r cos t, y, −r sin t)：0 到 π 是背对镜头的那一半。
 */
export function latheArc(profile: RY[], phi0: number, len: number, { segs = 48, crease = 32 } = {}) {
  const n = profile.length, cosC = Math.cos(crease * Math.PI / 180)
  const nrm = profile.map((a, i) => { const b = profile[(i + 1) % n], dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1; return [dy / l, -dr / l] as RY })
  const blend = (own: RY, other: RY): RY => { if (own[0] * other[0] + own[1] * other[1] <= cosC) return own; const x = own[0] + other[0], y = own[1] + other[1], l = Math.hypot(x, y) || 1; return [x / l, y / l] }
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [], cols = segs + 1
  let run = 0
  for (let i = 0; i < n; i++) {
    const a = profile[i], b = profile[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (a[0] < 1e-9 && b[0] < 1e-9) continue
    const na = blend(nrm[i], nrm[(i - 1 + n) % n]), nb = blend(nrm[i], nrm[(i + 1) % n]), base = pos.length / 3
    for (const [p, q, v] of [[a, na, run], [b, nb, run + L]] as const) for (let j = 0; j < cols; j++) {
      const t = phi0 + len * j / segs, c = Math.cos(t), s = Math.sin(t)
      pos.push(p[0] * c, p[1], -p[0] * s); nor.push(q[0] * c, q[1], -q[0] * s); uv.push(len * Math.max(p[0], 0.5) * j / segs, v)
    }
    for (let j = 0; j < segs; j++) { const a0 = base + j, b0 = base + cols + j; idx.push(a0, a0 + 1, b0 + 1, a0, b0 + 1, b0) }
    run += L
  }
  const side = idx.length
  if (len < Math.PI * 2 - 1e-6) {
    const contour = profile.map(([r, y]) => new THREE.Vector2(r, y)), tris = THREE.ShapeUtils.triangulateShape(contour, []), cw = THREE.ShapeUtils.isClockWise(contour)
    for (const [t, end] of [[phi0, false], [phi0 + len, true]] as const) {
      const c = Math.cos(t), s = Math.sin(t), base = pos.length / 3, k = end ? -1 : 1
      for (const [r, y] of profile) { pos.push(r * c, y, -r * s); nor.push(k * s, 0, k * c); uv.push(r, y) }
      for (const [p, q, r] of tris) (cw === end) ? idx.push(base + p, base + q, base + r) : idx.push(base + p, base + r, base + q)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx); g.addGroup(0, side, 0); if (idx.length > side) g.addGroup(side, idx.length - side, 1)
  return g
}

/** 沿折线走的管子：拐角按 bend 的半径圆过去，像真的弯头 */
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
  return new THREE.TubeGeometry(path, Math.max(8, Math.ceil(L / Math.max(r, 0.05) * 0.5) + P.length * 6), r, radial, false)
}
/** 管子接头上的一对法兰：在 at 处，沿 axis 方向（'x' | 'y' | 'z'） */
export function flangeParts(at: V3, axis: 'x' | 'y' | 'z', r: number, c = '#8d9296'): Part[] {
  const rot: V3 = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]
  return [{ p: at, s: [r * 1.75, r * 0.7, r * 1.75], c, cyl: true, r: rot }]
}

/** 沿圆弧的一段平台：立柱、两道栏杆、踢脚板、下面的托梁。半径 r（设备外壁），高 y，角度 a0 到 a1，宽 w */
export function platformParts(r: number, y: number, a0: number, a1: number, w = 1.0, c = '#d9a51c'): Part[] {
  const P: Part[] = [], n = Math.max(3, Math.round((a1 - a0) * (r + w) / 1.2)), ro = r + w
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, x = Math.cos(a), z = -Math.sin(a)
    P.push({ p: [x * ro, y + 0.55, z * ro], s: [0.05, 1.1, 0.05], c })
    P.push(beam([x * r, y - 0.5, z * r], [x * (ro - 0.1), y - 0.06, z * (ro - 0.1)], 0.07, '#6d7275'))   // 斜托架
    if (i < n) {
      const b = a0 + (a1 - a0) * (i + 0.5) / n, len = 2 * ro * Math.sin((a1 - a0) / n / 2) + 0.04, bx = Math.cos(b), bz = -Math.sin(b)
      for (const yy of [0.55, 1.08]) P.push({ p: [bx * ro, y + yy, bz * ro], s: [0.045, 0.045, len], c, r: [0, b, 0] })
      P.push({ p: [bx * ro, y + 0.07, bz * ro], s: [0.03, 0.14, len], c, r: [0, b, 0] })
    }
  }
  return P
}
/** 平台的格栅板：一段扇环 */
export const deckGeo = (r: number, y: number, a0: number, a1: number, w = 1.0) => latheArc([[r, y - 0.07], [r + w, y - 0.07], [r + w, y], [r, y]], a0, a1 - a0, { segs: Math.max(8, Math.round((a1 - a0) * 12)) })
/** 一段直梯加护笼：在角度 a 处，贴着半径 r 的设备，从 y0 爬到 y1 */
export function ladderParts(r: number, a: number, y0: number, y1: number, c = '#d9a51c'): Part[] {
  const P: Part[] = [], x = Math.cos(a), z = -Math.sin(a), tx = -Math.sin(a), tz = -Math.cos(a), ro = r + 0.25
  for (const k of [-0.22, 0.22]) P.push({ p: [x * ro + tx * k, (y0 + y1) / 2, z * ro + tz * k], s: [0.05, y1 - y0, 0.05], c })
  for (let y = y0 + 0.3; y < y1; y += 0.3) P.push({ p: [x * ro, y, z * ro], s: [0.44, 0.03, 0.03], c, r: [0, a + Math.PI / 2, 0] })
  for (let y = y0 + 2.4; y < y1; y += 0.9) for (let k = 0; k < 5; k++) { const b = a + (k - 2) * 0.5; P.push({ p: [x * ro + Math.cos(b) * 0.38, y, z * ro - Math.sin(b) * 0.38], s: [0.03, 0.03, 0.34], c, r: [0, b + Math.PI / 2, 0] }) }
  for (let k = 0; k < 5; k++) { const b = a + (k - 2) * 0.5; P.push({ p: [x * ro + Math.cos(b) * 0.4, (y0 + 2.4 + y1) / 2, z * ro - Math.sin(b) * 0.4], s: [0.03, Math.max(0.1, y1 - y0 - 2.4), 0.03], c }) }
  return P
}
/** 直的走道栏杆：从 a 到 b（同一高度），立柱加两道横杆和踢脚板 */
export function railParts(a: V3, b: V3, c = '#d9a51c'): Part[] {
  const P: Part[] = [], len = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(1, Math.round(len / 1.4))
  for (let i = 0; i <= n; i++) P.push(box(lerp(a[0], b[0], i / n), a[1], lerp(a[2], b[2], i / n), 0.05, 1.1, 0.05, c))
  for (const yy of [0.55, 1.08]) P.push(beam([a[0], a[1] + yy, a[2]], [b[0], b[1] + yy, b[2]], 0.045, c))
  P.push(beam([a[0], a[1] + 0.07, a[2]], [b[0], b[1] + 0.07, b[2]], 0.03, c))
  return P
}
/**
 * 一座钢框架：四角（或多跨）立柱、每层的梁、侧面的斜撑、每层一圈栏杆和楼板。
 * xs、zs 是柱网的坐标，levels 是各层楼面的高度（最后一层是顶）。
 */
export function frameParts(xs: number[], zs: number[], levels: number[], { col = '#5d6468', deck = true, rails = true, brace = true, skip = [] as number[] } = {}): Part[] {
  const P: Part[] = [], top = levels[levels.length - 1], x0 = xs[0], x1 = xs[xs.length - 1], z0 = zs[0], z1 = zs[zs.length - 1]
  for (const x of xs) for (const z of zs) P.push(box(x, 0, z, 0.26, top, 0.26, col), box(x, 0, z, 0.6, 0.3, 0.6, '#a5a39b'))
  levels.forEach((y, li) => {
    for (const z of zs) P.push(box((x0 + x1) / 2, y - 0.3, z, x1 - x0, 0.3, 0.2, col))
    for (const x of xs) P.push(box(x, y - 0.3, (z0 + z1) / 2, 0.2, 0.3, z1 - z0, col))
    if (skip.includes(li)) return
    if (deck) P.push(box((x0 + x1) / 2, y, (z0 + z1) / 2, x1 - x0 + 0.5, 0.05, z1 - z0 + 0.5, '#70767a'))
    if (rails) { const e = 0.25; P.push(...railParts([x0 - e, y, z1 + e], [x1 + e, y, z1 + e]), ...railParts([x0 - e, y, z0 - e], [x1 + e, y, z0 - e]), ...railParts([x0 - e, y, z0 - e], [x0 - e, y, z1 + e]), ...railParts([x1 + e, y, z0 - e], [x1 + e, y, z1 + e])) }
  })
  if (brace) {
    let y0 = 0
    for (const y of levels) {
      for (let i = 0; i < xs.length - 1; i++) P.push(beam([xs[i], y0 + 0.2, z0], [xs[i + 1], y - 0.3, z0], 0.12, col), beam([xs[i + 1], y0 + 0.2, z0], [xs[i], y - 0.3, z0], 0.12, col))
      y0 = y
    }
  }
  return P
}
/** 一段斜楼梯：从 a 走到 b，宽 w（沿 z 方向），带两侧扶手 */
export function stairParts(a: V3, b: V3, w = 0.9, c = '#d9a51c'): Part[] {
  const P: Part[] = [], n = Math.max(2, Math.round((b[1] - a[1]) / 0.22))
  for (let i = 0; i < n; i++) { const k = (i + 0.5) / n; P.push(box(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k), Math.abs(b[0] - a[0]) / n + 0.06, 0.04, w, '#70767a')) }
  for (const s of [-1, 1]) {
    const dz = s * w / 2
    P.push(beam([a[0], a[1], a[2] + dz], [b[0], b[1], b[2] + dz], 0.1, '#5d6468'), beam([a[0], a[1] + 1.0, a[2] + dz], [b[0], b[1] + 1.0, b[2] + dz], 0.045, c))
    for (let i = 0; i <= 4; i++) { const k = i / 4; P.push(box(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k) + dz, 0.045, 1.0, 0.045, c)) }
  }
  return P
}
