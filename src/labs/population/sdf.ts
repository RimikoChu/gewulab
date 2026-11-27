// 有机形体的造型工具：用“到表面的有符号距离”（里面为负、外面为正）描述一只动物，再用表面网格法变成三角网格。
// 动物的躯干、头、腿都是几个椭球和圆锥台平滑地融在一起，再加一点起伏，不是几个球拼起来的样子。
// 网格法写成可以分段做的生成器（每做完一层就让出一次），配合 job.ts 分几帧做完，进页面不卡。
import * as THREE from 'three'

export type V3 = [number, number, number]
export type SDF = (x: number, y: number, z: number) => number

// ---------- 噪声 ----------
const hash = (x: number, y: number, z: number) => { let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
const fade = (t: number) => t * t * (3 - 2 * t)
/** 三维值噪声，-1 到 1 */
export function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = fade(x - xi), v = fade(y - yi), w = fade(z - zi)
  const l = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz)
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1
}
export const fbm = (x: number, y: number, z: number, oct = 3) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f, z * f); a *= 0.5; f *= 2.03 } return s }

// ---------- 基本形体 ----------
/** 椭球（近似距离）。c 中心，r 三个半轴，rz 绕 z 轴转（正值把 +x 转向 +y），ry 绕 y 轴转 */
export function ell(x: number, y: number, z: number, c: V3, r: V3, rz = 0, ry = 0) {
  let px = x - c[0], py = y - c[1], pz = z - c[2]
  if (ry) { const co = Math.cos(-ry), si = Math.sin(-ry), qx = px * co + pz * si; pz = -px * si + pz * co; px = qx }
  if (rz) { const co = Math.cos(-rz), si = Math.sin(-rz), qx = px * co - py * si; py = px * si + py * co; px = qx }
  const k0 = Math.hypot(px / r[0], py / r[1], pz / r[2]), k1 = Math.hypot(px / (r[0] * r[0]), py / (r[1] * r[1]), pz / (r[2] * r[2]))
  return k1 < 1e-12 ? -Math.min(...r) : k0 * (k0 - 1) / k1
}
/** 两头粗细不同、两端圆的棒 */
export function cone(x: number, y: number, z: number, a: V3, b: V3, ra: number, rb: number) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2]
  const l2 = bx * bx + by * by + bz * bz, t = Math.min(1, Math.max(0, (px * bx + py * by + pz * bz) / l2))
  return Math.hypot(px - bx * t, py - by * t, pz - bz * t) - (ra + (rb - ra) * t)
}
/** 棒上离 p 最近的位置（0–1） */
export function along(x: number, y: number, z: number, a: V3, b: V3) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2]
  return Math.min(1, Math.max(0, ((x - a[0]) * bx + (y - a[1]) * by + (z - a[2]) * bz) / (bx * bx + by * by + bz * bz)))
}
/** 平滑并集：k 越大，接缝处融得越开 */
export function smin(a: number, b: number, k: number) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
export function U(k: number, ...ds: number[]) { let d = ds[0]; for (let i = 1; i < ds.length; i++) d = smin(d, ds[i], k); return d }
/** 平滑差集：从 a 里挖掉 b */
export function ssub(a: number, b: number, k: number) { const h = Math.max(k - Math.abs(-b - a), 0) / k; return Math.max(a, -b) + h * h * k * 0.25 }
export const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

// ---------- 颜色 ----------
export const lin = (hex: string): V3 => { const c = new THREE.Color(hex); return [c.r, c.g, c.b] }
export const mix3 = (a: V3, b: V3, t: number): V3 => { const k = Math.min(1, Math.max(0, t)); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k] }
export const shade = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]

// ---------- 表面网格法（可分段） ----------
export interface Shape { f: SDF; lo: V3; hi: V3; cell: number; color?: (p: V3, n: V3) => V3 }
/**
 * 把 f < 0 的区域的表面变成三角网格：每个跨过表面的小格子里放一个顶点，相邻格子连成四边形。法线取 f 的梯度，所以是光滑的。
 * 这是一个生成器：每算完一层就 yield 一次，交给 job.ts 分几帧做完。
 */
export function* nets({ f, lo, hi, cell, color }: Shape): Generator<void, THREE.BufferGeometry> {
  const nx = Math.ceil((hi[0] - lo[0]) / cell) + 1, ny = Math.ceil((hi[1] - lo[1]) / cell) + 1, nz = Math.ceil((hi[2] - lo[2]) / cell) + 1
  const val = new Float32Array(nx * ny * nz)
  const id = (i: number, j: number, k: number) => (k * ny + j) * nx + i
  for (let k = 0; k < nz; k++) { for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[id(i, j, k)] = f(lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell); yield }
  const vIdx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1)
  const cid = (i: number, j: number, k: number) => (k * (ny - 1) + j) * (nx - 1) + i
  const pos: number[] = []
  const E: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
  const CX = [0, 1, 0, 1, 0, 1, 0, 1], CY = [0, 0, 1, 1, 0, 0, 1, 1], CZ = [0, 0, 0, 0, 1, 1, 1, 1]
  const cv = new Float32Array(8)
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let mask = 0
      for (let c = 0; c < 8; c++) { cv[c] = val[id(i + CX[c], j + CY[c], k + CZ[c])]; if (cv[c] < 0) mask |= 1 << c }
      if (mask === 0 || mask === 255) continue
      let sx = 0, sy = 0, sz = 0, n = 0
      for (const [a, b] of E) {
        const fa = cv[a], fb = cv[b]
        if ((fa < 0) === (fb < 0)) continue
        const t = fa / (fa - fb)
        sx += CX[a] + (CX[b] - CX[a]) * t; sy += CY[a] + (CY[b] - CY[a]) * t; sz += CZ[a] + (CZ[b] - CZ[a]) * t; n++
      }
      vIdx[cid(i, j, k)] = pos.length / 3
      pos.push(lo[0] + (i + sx / n) * cell, lo[1] + (j + sy / n) * cell, lo[2] + (k + sz / n) * cell)
    }
    if (k % 4 === 0) yield
  }
  const idx: number[] = []
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d) }
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = val[id(i, j, k)] < 0, b = val[id(i + 1, j, k)] < 0; if (a === b) continue
    quad(vIdx[cid(i, j - 1, k - 1)], vIdx[cid(i, j, k - 1)], vIdx[cid(i, j, k)], vIdx[cid(i, j - 1, k)], !a)
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = val[id(i, j, k)] < 0, b = val[id(i, j + 1, k)] < 0; if (a === b) continue
    quad(vIdx[cid(i - 1, j, k - 1)], vIdx[cid(i - 1, j, k)], vIdx[cid(i, j, k)], vIdx[cid(i, j, k - 1)], !a)
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = val[id(i, j, k)] < 0, b = val[id(i, j, k + 1)] < 0; if (a === b) continue
    quad(vIdx[cid(i - 1, j - 1, k)], vIdx[cid(i, j - 1, k)], vIdx[cid(i, j, k)], vIdx[cid(i - 1, j, k)], !a)
  }
  yield
  const nrm = new Float32Array(pos.length), h = cell * 0.5
  for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v], y = pos[v + 1], z = pos[v + 2]
    const gx = f(x + h, y, z) - f(x - h, y, z), gy = f(x, y + h, z) - f(x, y - h, z), gz = f(x, y, z + h) - f(x, y, z - h), l = Math.hypot(gx, gy, gz) || 1
    nrm[v] = gx / l; nrm[v + 1] = gy / l; nrm[v + 2] = gz / l
    if (v % 3000 === 0) yield
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
  for (let t = 0; t < idx.length; t += 3) {
    const A = idx[t] * 3, B = idx[t + 1] * 3, C = idx[t + 2] * 3
    const ux = pos[B] - pos[A], uy = pos[B + 1] - pos[A + 1], uz = pos[B + 2] - pos[A + 2], vx = pos[C] - pos[A], vy = pos[C + 1] - pos[A + 1], vz = pos[C + 2] - pos[A + 2]
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx
    if (cx * nrm[A] + cy * nrm[A + 1] + cz * nrm[A + 2] < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s }
  }
  g.setIndex(idx)
  if (color) {
    const col = new Float32Array(pos.length)
    for (let v = 0; v < pos.length; v += 3) { const c = color([pos[v], pos[v + 1], pos[v + 2]], [nrm[v], nrm[v + 1], nrm[v + 2]]); col[v] = c[0]; col[v + 1] = c[1]; col[v + 2] = c[2] }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  }
  g.computeBoundingSphere()
  return g
}
/** 一次做好几块（比如身体和四条腿），一块做完接着做下一块 */
export function* netsAll(list: Shape[]): Generator<void, THREE.BufferGeometry[]> {
  const out: THREE.BufferGeometry[] = []
  for (const s of list) out.push(yield* nets(s))
  return out
}
