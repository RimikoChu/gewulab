// 公园里的阔叶树：树干分出几根主枝，枝头一团团小叶片（每片朝向不同），远看是蓬松、透光的树冠，不是一个球。
// 写法照勾股定理实验室（pyth）的树，复制到这里改了参数（叶片少一些，树多）。每棵树分开在空闲时生成，进页面不卡。
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { rng } from './mats'

type V3 = [number, number, number]
const col = (c: string | THREE.Color) => (typeof c === 'string' ? new THREE.Color(c) : c)

/** 整个模型刷一种顶点色 */
function tint(g: THREE.BufferGeometry, color: string) {
  const c = col(color), p = g.attributes.position, a = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return g
}
/** 合并前把属性对齐，去掉索引 */
function fuse(list: THREE.BufferGeometry[]) {
  return mergeGeometries(list.map(g => {
    const n = g.index ? g.toNonIndexed() : g
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(k)) n.deleteAttribute(k)
    if (!n.attributes.color) tint(n, '#ffffff')
    return n
  }))
}
/** 由粗到细的弯管（树干、树枝），顶点色从 c0 渐变到 c1 */
function tube(pts: V3[], r0: number, r1: number, c0: string, c1: string, radial = 7, segs = 10) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal')
  const fr = curve.computeFrenetFrames(segs, false), a = col(c0), b = col(c1), c = new THREE.Color()
  const ring = radial + 1, pos: number[] = [], nor: number[] = [], cl: number[] = [], idx: number[] = []
  const p = new THREE.Vector3(), d = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, r = r0 + (r1 - r0) * u; curve.getPointAt(u, p); c.copy(a).lerp(b, u)
    for (let j = 0; j < ring; j++) { const t = j / radial * Math.PI * 2; d.copy(fr.normals[i]).multiplyScalar(Math.cos(t)).addScaledVector(fr.binormals[i], Math.sin(t)); pos.push(p.x + d.x * r, p.y + d.y * r, p.z + d.z * r); nor.push(d.x, d.y, d.z); cl.push(c.r, c.g, c.b) }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const q = i * ring + j, s = q + ring; idx.push(q, q + 1, s, s, q + 1, s + 1) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); g.setIndex(idx)
  return g
}

/** 把同一片小叶摆很多份，合成一个带顶点色的模型 */
class Batch {
  pos: number[] = []; nor: number[] = []; col: number[] = []
  private m = new THREE.Matrix4(); private n = new THREE.Matrix3(); private v = new THREE.Vector3(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private s = new THREE.Vector3(); private t = new THREE.Vector3()
  add(tpl: THREE.BufferGeometry, p: V3, yaw: number, pitch: number, scale: number, roll: number, color: THREE.Color) {
    this.q.setFromEuler(this.e.set(pitch, yaw, roll, 'YXZ')); this.s.set(scale, scale, scale)
    this.m.compose(this.t.set(...p), this.q, this.s); this.n.getNormalMatrix(this.m)
    const P = tpl.attributes.position, N = tpl.attributes.normal
    for (let i = 0; i < P.count; i++) {
      this.v.fromBufferAttribute(P, i).applyMatrix4(this.m); this.pos.push(this.v.x, this.v.y, this.v.z)
      this.v.fromBufferAttribute(N, i).applyMatrix3(this.n).normalize(); this.nor.push(this.v.x, this.v.y, this.v.z)
      this.col.push(color.r, color.g, color.b)
    }
  }
  build() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3))
    return g
  }
}

/** 一棵阔叶树，原点在树根，h 是树高；x、z 是它在世界里的位置 */
function leafyTree(seed: number, h: number, x: number, z: number, cards = 90) {
  const r = rng(seed), wood: THREE.BufferGeometry[] = [], B = new Batch()
  const L = new THREE.CircleGeometry(h * 0.05 / 2, 6).toNonIndexed(); L.scale(1.5, 0.75, 1)
  const c0 = new THREE.Color('#25401f'), c1 = new THREE.Color('#7a9c4c'), c = new THREE.Color()
  const top: V3 = [x + (r() - 0.5) * h * 0.05, h * 0.45, z + (r() - 0.5) * h * 0.05]
  wood.push(tube([[x, -0.3, z], [x + h * 0.012, h * 0.22, z], top], h * 0.035, h * 0.022, '#4a3a2c', '#5d4a38', 8, 10))
  const nb = 6 + Math.floor(r() * 3)
  for (let b = 0; b < nb; b++) {
    const a = (b / nb) * 6.28 + r() * 0.6, up = 0.45 + r() * 0.7, len = h * (0.24 + r() * 0.12)
    const end: V3 = [top[0] + Math.cos(a) * Math.cos(up) * len, top[1] + Math.sin(up) * len, top[2] + Math.sin(a) * Math.cos(up) * len]
    wood.push(tube([top, [(top[0] + end[0]) / 2, (top[1] + end[1]) / 2 + h * 0.03, (top[2] + end[2]) / 2], end], h * 0.016, h * 0.006, '#4a3a2c', '#5d4a38', 5, 7))
    const R = h * (0.16 + r() * 0.06)
    for (let k = 0; k < cards; k++) {
      const th = r() * 6.28, ph = Math.acos(2 * r() - 1), rr = R * Math.pow(r(), 0.35)
      const p: V3 = [end[0] + Math.sin(ph) * Math.cos(th) * rr, end[1] + Math.cos(ph) * rr * 0.75, end[2] + Math.sin(ph) * Math.sin(th) * rr]
      c.copy(c0).lerp(c1, Math.max(0, Math.min(1, (p[1] - h * 0.5) / (h * 0.6) + (r() - 0.5) * 0.5)))
      B.add(L, p, r() * 6.28, r() * 3, 1 + r() * 0.8, r() * 3, c)
    }
  }
  return { wood: fuse(wood), leaves: B.build() }
}

/** 一棵树：挂上以后在空闲时才生成，生成好了再画 */
export function Tree({ x, z, h, seed }: { x: number; z: number; h: number; seed: number }) {
  const [g, setG] = useState<ReturnType<typeof leafyTree> | null>(null)
  useEffect(() => { const t = setTimeout(() => setG(leafyTree(seed, h, x, z)), 200 + seed % 7 * 120); return () => clearTimeout(t) }, [x, z, h, seed])
  if (!g) return null
  return <>
    <mesh geometry={g.wood} castShadow><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
    <mesh geometry={g.leaves} castShadow><meshStandardMaterial vertexColors roughness={0.8} side={THREE.DoubleSide} envMapIntensity={0.6} /></mesh>
  </>
}
