// 减数分裂和遗传规律实验室里反复用到的造型工具和材质：顶点色合并、由粗到细的弯管、椭球、玻璃、按时间走的进度。
// 写法参考遗传和变异实验室（复制过来改的，不引用别的实验室）。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { rng } from './physics'

export { rng }
export type V3 = [number, number, number]
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
export const ease = (t: number) => { const k = clamp01(t); return k * k * (3 - 2 * k) }
/** 总进度 t 落在 a 到 b 之间走了多少（0–1，缓入缓出） */
export const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const col = (c: string | THREE.Color) => (typeof c === 'string' ? new THREE.Color(c) : c)

/** 整个模型刷一种顶点色（可以从下到上渐变到 top） */
export function tint(g: THREE.BufferGeometry, color: string | THREE.Color, top?: string | THREE.Color) {
  const c0 = col(color), c1 = top ? col(top) : c0, c = new THREE.Color()
  g.computeBoundingBox(); const y0 = g.boundingBox!.min.y, h = Math.max(1e-6, g.boundingBox!.max.y - y0)
  const p = g.attributes.position, a = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) { c.copy(c0).lerp(c1, (p.getY(i) - y0) / h); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return g
}
/** 缩放 → 绕 x 俯仰 → 绕 y 转向 → 平移 */
export function place(g: THREE.BufferGeometry, p: V3, yaw = 0, pitch = 0, s: number | V3 = 1, roll = 0) {
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s)
  return g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')), sc))
}
/** 合并前把属性对齐（位置、法线、颜色、贴图坐标），去掉索引 */
export function fuse(list: THREE.BufferGeometry[]) {
  const out = list.map(g => {
    const n = g.index ? g.toNonIndexed() : g
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(k)) n.deleteAttribute(k)
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2).fill(0.012), 2))
    if (!n.attributes.color) tint(n, '#ffffff')
    if (!n.attributes.normal) n.computeVertexNormals()
    return n
  })
  return mergeGeometries(out)
}


// ---------- 弯管 ----------
const toV = (p: V3 | THREE.Vector3) => (Array.isArray(p) ? new THREE.Vector3(...p) : p)
/** 一根由粗到细的弯管：茎、叶柄、卷须、竹竿、麻绳、DNA 的长链都用它。末端收成一个尖（cap 为 false 时开口） */
export function tube(pts: (V3 | THREE.Vector3)[], r0: number, r1: number, c0: string, c1 = c0, radial = 7, segs = Math.max(6, pts.length * 5), pow = 1, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts.map(toV), closed, 'centripetal')
  const fr = curve.computeFrenetFrames(segs, closed), a = col(c0), b = col(c1), c = new THREE.Color()
  const ring = radial + 1, n = (segs + 1) * ring + 1
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), cl = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx: number[] = []
  const p = new THREE.Vector3(), d = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, r = lerp(r0, r1, Math.pow(u, pow)); curve.getPointAt(u, p); c.copy(a).lerp(b, u)
    for (let j = 0; j < ring; j++) {
      const t = j / radial * Math.PI * 2, k = i * ring + j
      d.copy(fr.normals[i]).multiplyScalar(Math.cos(t)).addScaledVector(fr.binormals[i], Math.sin(t))
      pos.set([p.x + d.x * r, p.y + d.y * r, p.z + d.z * r], k * 3); nor.set([d.x, d.y, d.z], k * 3); cl.set([c.r, c.g, c.b], k * 3); uv.set([j / radial, u], k * 2)
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const q = i * ring + j, s = q + ring; idx.push(q, q + 1, s, s, q + 1, s + 1) }
  const tip = n - 1, t1 = fr.tangents[segs]; curve.getPointAt(1, p)
  pos.set([p.x + t1.x * r1 * 0.9, p.y + t1.y * r1 * 0.9, p.z + t1.z * r1 * 0.9], tip * 3); nor.set([t1.x, t1.y, t1.z], tip * 3); cl.set([b.r, b.g, b.b], tip * 3); uv.set([0.012, 0.012], tip * 2)
  for (let j = 0; j < radial; j++) idx.push(segs * ring + j, segs * ring + j + 1, tip)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}
/** 一个椭球（顶点色从下到上渐变） */
export function blob(rx: number, ry: number, rz: number, c0: string, c1 = c0, ws = 18, hs = 12) {
  const g = new THREE.SphereGeometry(1, ws, hs); g.scale(rx, ry, rz)
  return tint(g, c0, c1)
}
/** 一段螺旋上的点：卷须、DNA 的长链、染色质丝都用它。axis 沿 +y，从 y0 到 y1，绕 turns 圈 */
export function helix(r: number, y0: number, y1: number, turns: number, phase = 0, n = Math.max(12, Math.round(turns * 14))): V3[] {
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = phase + t * turns * Math.PI * 2; return [Math.cos(a) * r, lerp(y0, y1, t), Math.sin(a) * r] as V3 })
}


const canvasTex = (c: HTMLCanvasElement, wrap = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
export { canvasTex }

// ---------- 玻璃 ----------
/** 玻璃容器、温室玻璃：里面还要画东西，不用折射，只做半透明加清漆的高光 */
export const Glass = ({ opacity = 0.14, color = '#a9c8cc', env = 1.2 }: { opacity?: number; color?: string; env?: number }) =>
  <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.05} metalness={0} clearcoat={1} clearcoatRoughness={0.06} envMapIntensity={env} side={THREE.DoubleSide} depthWrite={false} />

// ---------- 过程 ----------
/** 一个按时间走的进度：to 变了以后，用 sec 秒从现在的值匀速走到 to */
export function useRun(to: number, sec: number) {
  const [x, setX] = useState(to)
  useEffect(() => {
    let raf = 0, last = performance.now(), cur = x
    if (cur === to) return
    const frame = (now: number) => {
      const dt = Math.max(0, Math.min(1 / 30, (now - last) / 1000)); last = now
      const d = to - cur, step = dt / sec
      cur = Math.abs(d) <= step ? to : cur + Math.sign(d) * step
      setX(cur)
      if (cur !== to) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [to, sec])   // eslint-disable-line react-hooks/exhaustive-deps
  return x
}
/** 用完就释放的模型 */
export function useGeo(make: () => THREE.BufferGeometry, deps: unknown[]) {
  const g = useMemo(make, deps)   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => g.dispose(), [g])
  return g
}

