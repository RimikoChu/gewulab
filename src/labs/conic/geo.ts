// 拼模型用的几何：两点之间的杆、能只转半圈并带剖面的回转体（剖开的天线、剖开的穹顶）、椭圆形的墙。
import * as THREE from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'
import type { RY } from '@/lab-kit'

export type V3 = [number, number, number]

/** 两点之间的一根圆杆 */
export function strut(a: V3, b: V3, r: number, radial = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), g = new THREE.CylinderGeometry(r, r, d.length(), radial)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()))
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
  return g
}
export const fuse = (list: THREE.BufferGeometry[]) => mergeGeometries(list.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n }))

/**
 * 回转体：把一圈闭合的截面（[半径, 高]，外面在右手边）绕 y 轴转 len 弧度（从 phi0 起）。
 * 不满一圈时两头补上剖面。角度 φ 处的点是 (r cos φ, y, −r sin φ)：φ 在 0–π 之间是背对镜头的那一半（z < 0）。
 */
export function revolve(profile: RY[], phi0 = 0, len = Math.PI * 2, segs = 64, crease = 0.6) {
  const n = profile.length, cols = segs + 1, pos: number[] = [], uv: number[] = [], idx: number[] = []
  let per = 0; const along = profile.map((p, i) => (per += i ? Math.hypot(p[0] - profile[i - 1][0], p[1] - profile[i - 1][1]) : 0))
  per += Math.hypot(profile[0][0] - profile[n - 1][0], profile[0][1] - profile[n - 1][1])
  for (let i = 0; i <= n; i++) {
    const [r, y] = profile[i % n], v = i === n ? 1 : along[i] / per
    for (let j = 0; j < cols; j++) { const t = phi0 + len * j / segs; pos.push(r * Math.cos(t), y, -r * Math.sin(t)); uv.push(j / segs, v) }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < segs; j++) {
    const a0 = i * cols + j, a1 = a0 + 1, b0 = a0 + cols, b1 = b0 + 1
    if (profile[i][0] > 1e-9) idx.push(a0, a1, b1)
    if (profile[(i + 1) % n][0] > 1e-9) idx.push(a0, b1, b0)
  }
  if (len < Math.PI * 2 - 1e-6) {
    const tris = THREE.ShapeUtils.triangulateShape(profile.map(p => new THREE.Vector2(p[0], p[1])), [])
    for (const [k, t] of [[0, phi0], [1, phi0 + len]] as const) {
      const base = pos.length / 3
      for (const [r, y] of profile) { pos.push(r * Math.cos(t), y, -r * Math.sin(t)); uv.push(0.5, 0.5) }
      for (const [a, b, c] of tris) if (k) idx.push(base + a, base + b, base + c); else idx.push(base + a, base + c, base + b)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx)
  return toCreasedNormals(g, crease)
}

/** 椭圆形的一圈墙：中心线的半轴 a、b，墙厚 t、高 h；gap 是留出的缺口（参数角的起止，弧度）。底面在 y = 0，椭圆在 x–z 平面里 */
export function ellipseWall(a: number, b: number, t: number, h: number, gap: [number, number], segs = 120) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [], t0 = gap[1], t1 = gap[0] + Math.PI * 2
  for (let i = 0; i <= segs; i++) {
    const u = t0 + (t1 - t0) * i / segs, x = a * Math.cos(u), z = -b * Math.sin(u), nl = Math.hypot(x / a ** 2, z / b ** 2), nx = x / a ** 2 / nl, nz = z / b ** 2 / nl
    for (const [d, y] of [[-t / 2, 0], [-t / 2, h], [t / 2, h], [t / 2, 0]]) { pos.push(x + nx * d, y, z + nz * d); uv.push(i / segs, y / h) }
  }
  for (let i = 0; i < segs; i++) for (let k = 0; k < 3; k++) { const p = i * 4 + k, q = p + 4; idx.push(p, q, q + 1, p, q + 1, p + 1) }
  const end = segs * 4; idx.push(0, 1, 2, 0, 2, 3, end, end + 2, end + 1, end, end + 3, end + 2)
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx)
  return toCreasedNormals(g, 0.7)
}
