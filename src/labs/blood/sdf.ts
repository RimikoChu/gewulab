// 有机形体的造型工具：用“到表面的有符号距离”（里面为负、外面为正）描述一个形体，再用表面网格法把它变成三角网格。
// 心脏、人体轮廓、肺都这样做：几个椭球、圆锥台平滑地融在一起，再加一点起伏，就不是几个球拼起来的样子。
import * as THREE from 'three'

export type V3 = [number, number, number]
export type SDF = (x: number, y: number, z: number) => number

// ---------- 噪声：三维值噪声，给表面一点起伏 ----------
const hash = (x: number, y: number, z: number) => { let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
const fade = (t: number) => t * t * (3 - 2 * t)
export function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = fade(x - xi), v = fade(y - yi), w = fade(z - zi)
  const l = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz)
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1
}
/** 几层噪声叠起来（越往上越细越弱） */
export const fbm = (x: number, y: number, z: number, oct = 3) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f, z * f); a *= 0.5; f *= 2.03 } return s }

// ---------- 基本形体 ----------
/** 椭球（近似的距离，造型够用）。c 中心，r 三个半轴，rz 绕 z 轴转多少弧度 */
export function ellipsoid(x: number, y: number, z: number, c: V3, r: V3, rz = 0) {
  let px = x - c[0], py = y - c[1]; const pz = z - c[2]
  if (rz) { const co = Math.cos(-rz), si = Math.sin(-rz), qx = px * co - py * si; py = px * si + py * co; px = qx }
  const k0 = Math.hypot(px / r[0], py / r[1], pz / r[2]), k1 = Math.hypot(px / (r[0] * r[0]), py / (r[1] * r[1]), pz / (r[2] * r[2]))
  return k1 < 1e-9 ? -Math.min(...r) : k0 * (k0 - 1) / k1
}
/** 两头粗细不同、两端圆的棒：a、b 两端，ra、rb 两端的半径 */
export function roundCone(x: number, y: number, z: number, a: V3, b: V3, ra: number, rb: number) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2]
  const l2 = bx * bx + by * by + bz * bz, t = Math.min(1, Math.max(0, (px * bx + py * by + pz * bz) / l2))
  return Math.hypot(px - bx * t, py - by * t, pz - bz * t) - (ra + (rb - ra) * t)
}
/** 到一条线段的距离 */
export function segDist(x: number, y: number, z: number, a: V3, b: V3) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2]
  const t = Math.min(1, Math.max(0, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz)))
  return Math.hypot(px - bx * t, py - by * t, pz - bz * t)
}
/** 平滑地合在一起：k 越大，接缝处融得越开 */
export function smin(a: number, b: number, k: number) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
export function sminAll(ds: number[], k: number) { let d = ds[0]; for (let i = 1; i < ds.length; i++) d = smin(d, ds[i], k); return d }

// ---------- 表面网格法 ----------
/**
 * 把 f < 0 的区域的表面变成三角网格。bounds 是取样范围，cell 是格子的边长。
 * 每个跨过表面的小格子里放一个顶点（各条棱上过零点的平均），相邻格子连成四边形。法线取 f 的梯度，所以曲面是光滑的。
 * color：每个顶点的颜色（可选）；extra：每个顶点再带一个数（可选，存进 attribute 'aTag'）
 */
export function surfaceNets(f: SDF, bounds: [V3, V3], cell: number, color?: (p: V3, n: V3) => V3, extra?: (p: V3) => number) {
  const [lo, hi] = bounds
  const nx = Math.ceil((hi[0] - lo[0]) / cell) + 1, ny = Math.ceil((hi[1] - lo[1]) / cell) + 1, nz = Math.ceil((hi[2] - lo[2]) / cell) + 1
  const val = new Float32Array(nx * ny * nz)
  const id = (i: number, j: number, k: number) => (k * ny + j) * nx + i
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[id(i, j, k)] = f(lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell)
  const vIdx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1)
  const cid = (i: number, j: number, k: number) => (k * (ny - 1) + j) * (nx - 1) + i
  const pos: number[] = []
  const E: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
  const corner = (c: number): V3 => [c & 1, (c >> 1) & 1, (c >> 2) & 1]
  const cv = new Float32Array(8)
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0
    for (let c = 0; c < 8; c++) { const [a, b, d] = corner(c); cv[c] = val[id(i + a, j + b, k + d)]; if (cv[c] < 0) mask |= 1 << c }
    if (mask === 0 || mask === 255) continue
    let sx = 0, sy = 0, sz = 0, n = 0
    for (const [a, b] of E) {
      const fa = cv[a], fb = cv[b]
      if ((fa < 0) === (fb < 0)) continue
      const t = fa / (fa - fb), A = corner(a), B = corner(b)
      sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; n++
    }
    vIdx[cid(i, j, k)] = pos.length / 3
    pos.push(lo[0] + (i + sx / n) * cell, lo[1] + (j + sy / n) * cell, lo[2] + (k + sz / n) * cell)
  }
  // 每条跨过表面的棱，四周四个格子的顶点连成一个四边形
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
  // 法线：f 的梯度
  const nrm = new Float32Array(pos.length), h = cell * 0.5
  for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v], y = pos[v + 1], z = pos[v + 2]
    const gx = f(x + h, y, z) - f(x - h, y, z), gy = f(x, y + h, z) - f(x, y - h, z), gz = f(x, y, z + h) - f(x, y, z - h), l = Math.hypot(gx, gy, gz) || 1
    nrm[v] = gx / l; nrm[v + 1] = gy / l; nrm[v + 2] = gz / l
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setIndex(idx)
  // 三角形的朝向和法线对一下：朝里的翻过来
  const ia = g.index!.array as Uint32Array | number[], pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3()
  for (let t = 0; t < idx.length; t += 3) {
    const A = idx[t] * 3, B = idx[t + 1] * 3, C = idx[t + 2] * 3
    pa.set(pos[A], pos[A + 1], pos[A + 2]); pb.set(pos[B], pos[B + 1], pos[B + 2]).sub(pa); pc.set(pos[C], pos[C + 1], pos[C + 2]).sub(pa)
    pb.cross(pc)
    if (pb.x * nrm[A] + pb.y * nrm[A + 1] + pb.z * nrm[A + 2] < 0) { const s = ia[t + 1]; (ia as number[])[t + 1] = ia[t + 2]; (ia as number[])[t + 2] = s }
  }
  g.index!.needsUpdate = true
  if (color) {
    const col = new Float32Array(pos.length)
    for (let v = 0; v < pos.length; v += 3) { const c = color([pos[v], pos[v + 1], pos[v + 2]], [nrm[v], nrm[v + 1], nrm[v + 2]]); col[v] = c[0]; col[v + 1] = c[1]; col[v + 2] = c[2] }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  }
  if (extra) {
    const tag = new Float32Array(pos.length / 3)
    for (let v = 0; v < pos.length; v += 3) tag[v / 3] = extra([pos[v], pos[v + 1], pos[v + 2]])
    g.setAttribute('aTag', new THREE.BufferAttribute(tag, 1))
  }
  g.computeBoundingSphere()
  return g
}

/** 颜色字符串变成线性的 [r, g, b]（顶点颜色用） */
export const lin = (hex: string): V3 => { const c = new THREE.Color(hex); return [c.r, c.g, c.b] }
export const mix3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

// ---------- 有壁厚的管子 ----------
/**
 * 沿一条曲线的管子，有壁厚：外壁、内壁、两头的环面合成一个实体（剖开不是空壳）。
 * r 外半径（可以是沿管子变化的函数，t 从 0 到 1），wall 壁厚。colorAt：沿管子的颜色（可选，t 从 0 到 1）
 */
export function hollowTube(curve: THREE.Curve<THREE.Vector3>, r: number | ((t: number) => number), wall: number, segs = 64, radial = 20, colorAt?: (t: number) => V3) {
  const R = typeof r === 'number' ? () => r : r
  const frames = curve.computeFrenetFrames(segs, false)
  const pos: number[] = [], nor: number[] = [], col: number[] = [], uvs: number[] = [], idx: number[] = []
  const ring = (rad: (t: number) => number, sign: number) => {
    const base = pos.length / 3
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, p = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i], rr = rad(t)
      const c = colorAt ? colorAt(t) : null
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a)
        const nx = N.x * cx + B.x * sy, ny = N.y * cx + B.y * sy, nz = N.z * cx + B.z * sy
        pos.push(p.x + nx * rr, p.y + ny * rr, p.z + nz * rr); nor.push(nx * sign, ny * sign, nz * sign); uvs.push(t, j / radial)
        if (c) col.push(...c)
      }
    }
    for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
      const a = base + i * (radial + 1) + j, b = a + radial + 1
      if (sign > 0) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
    return base
  }
  const o = ring(R, 1), inn = ring(t => R(t) - wall, -1)
  // 两头的环面
  for (const end of [0, segs]) {
    const T = curve.getTangentAt(end / segs).multiplyScalar(end ? 1 : -1), base = pos.length / 3
    for (let j = 0; j <= radial; j++) for (const s of [o, inn]) {
      const k = (s + end * (radial + 1) + j) * 3
      pos.push(pos[k], pos[k + 1], pos[k + 2]); nor.push(T.x, T.y, T.z); uvs.push(end / segs, j / radial); if (colorAt) col.push(col[k], col[k + 1], col[k + 2])
    }
    for (let j = 0; j < radial; j++) { const a = base + j * 2, b = a + 1, c = a + 2, d = a + 3; if (end) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx)
  if (colorAt) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  return g
}

/** 一条折线变成光滑的曲线 */
export const curveOf = (pts: V3[], tension = 0.5) => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', tension)
