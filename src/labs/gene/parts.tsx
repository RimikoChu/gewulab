// 遗传和变异实验室里反复用到的造型工具和材质：带弧度的叶片和花瓣、由粗到细的弯管、顶点色合并、程序画的贴图（木纹、砖墙、木牌）、玻璃。
// 生物体都是薄片和曲面，颜色写在顶点上，从基部到尖端渐变。
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

// ---------- 叶片、花瓣 ----------
export interface LeafOpt {
  len: number; wid: number
  /** 最宽处靠基部（<1）还是靠尖端（>1） */ basePow?: number
  /** 尖端尖（>1）还是圆（<1） */ tipPow?: number
  /** 沿主脉下垂（负数上翘） */ curl?: number
  /** 两半沿主脉向上对折 */ fold?: number
  /** 兜成勺形（花瓣） */ cup?: number
  /** 叶缘起伏 */ wave?: number
  /** 横向的弯（龙骨瓣、旗瓣向后翻） */ bend?: number
  /** 顶端中间凹进去一个缺口（旗瓣） */ notch?: number
  base: string; tip: string; back?: string; nu?: number; nv?: number
}
/** 一片叶或花瓣：基部在原点，主脉朝 +z，正面朝 +y。正反两层，背面另一种颜色 */
export function leafGeo(o: LeafOpt) {
  const NU = o.nu ?? 10, NV = o.nv ?? 3, bp = o.basePow ?? 0.7, tp = o.tipPow ?? 1, curl = o.curl ?? 0.15, fold = o.fold ?? 0.25, cup = o.cup ?? 0, wave = o.wave ?? 0.03, bend = o.bend ?? 0
  const cb = col(o.base), ct = col(o.tip), bk = o.back ? col(o.back) : cb.clone().lerp(new THREE.Color('#d9e2c0'), 0.42), c = new THREE.Color()
  const cols = NV * 2 + 1, n = (NU + 1) * cols
  const pos = new Float32Array(n * 6), cl = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx: number[] = []
  for (let i = 0; i <= NU; i++) for (let j = 0; j < cols; j++) {
    const u = i / NU, v = j / NV - 1, w = (o.wid / 2) * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, bp))), tp) + (i === 0 ? o.wid * 0.03 : 0)
    const x = v * w, z = u * o.len - (o.notch ?? 0) * o.len * Math.pow(Math.max(0, 1 - Math.abs(v) * 2.2), 2) * Math.pow(u, 10)
    const y = -curl * o.len * u * u + fold * Math.abs(x) + cup * (x * x / o.wid + u * (1 - u) * o.len * 0.5) + wave * o.wid * Math.sin(u * 13 + v * 2.2) * v * v - bend * x * x / o.wid
    const k = i * cols + j
    for (const s of [0, 1]) {
      const q = (s * n + k) * 3
      pos[q] = x; pos[q + 1] = y - s * 0.002; pos[q + 2] = z
      if (s === 0) c.copy(cb).lerp(ct, Math.pow(u, 1.1)).multiplyScalar(0.9 + 0.14 * Math.abs(v)); else c.copy(bk).lerp(ct, u * 0.25)
      cl[q] = c.r; cl[q + 1] = c.g; cl[q + 2] = c.b
      uv[(s * n + k) * 2] = 0.5 + v * 0.46; uv[(s * n + k) * 2 + 1] = 0.03 + u * 0.94
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < cols - 1; j++) { const a = i * cols + j, b = a + 1, d = a + cols, e = d + 1; idx.push(a, d, b, b, d, e, n + a, n + b, n + d, n + b, n + e, n + d) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}
let _vein: THREE.CanvasTexture | null = null
/** 豌豆小叶的叶脉：一条主脉、两侧弧形的侧脉，加一层细网 */
export function veinTex() {
  if (_vein) return _vein
  const W = 256, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, r = rng(11)
  g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '96,96,96'},0.06)`; g.fillRect(r() * W, r() * H, 3, 3) }
  g.lineCap = 'round'
  for (let k = 1; k <= 8; k++) for (const s of [-1, 1]) {
    const y = H - k * 56 + (s > 0 ? 12 : 0)
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2.2
    g.beginPath(); g.moveTo(W / 2, y); g.quadraticCurveTo(W / 2 + s * 70, y - 30, W / 2 + s * 118, y - 110); g.stroke()
  }
  g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.moveTo(W / 2, H); g.lineTo(W / 2, 12); g.stroke()
  g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, 8, 8)
  _vein = new THREE.CanvasTexture(c); _vein.colorSpace = THREE.SRGBColorSpace; _vein.anisotropy = 8
  return _vein
}
let _petal: THREE.CanvasTexture | null = null
/** 花瓣的脉纹：从基部扇形散开的细线 */
export function petalTex() {
  if (_petal) return _petal
  const W = 256, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, r = rng(5)
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '150,150,150'},0.07)`; g.fillRect(r() * W, r() * H, 3, 3) }
  for (let k = -11; k <= 11; k++) { g.strokeStyle = `rgba(120,90,130,${0.36 - Math.abs(k) * 0.012})`; g.lineWidth = k % 3 === 0 ? 1.8 : 1; g.beginPath(); g.moveTo(W / 2 + k * 2, H); g.quadraticCurveTo(W / 2 + k * 9, H * 0.5, W / 2 + k * 11.5 + (r() - 0.5) * 6, 6); g.stroke() }
  _petal = new THREE.CanvasTexture(c); _petal.colorSpace = THREE.SRGBColorSpace; _petal.anisotropy = 8
  return _petal
}
/** 叶片、花瓣的材质：顶点色乘脉纹 */
export const LeafMat = ({ petal = false, rough = 0.6, opacity = 1 }: { petal?: boolean; rough?: number; opacity?: number }) =>
  <meshStandardMaterial vertexColors map={petal ? petalTex() : veinTex()} roughness={rough} metalness={0} side={THREE.FrontSide} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} envMapIntensity={0.7} />
/** 茎、豆荚、种子这些带顶点色的实体 */
export const Flesh = ({ rough = 0.65, opacity = 1, glow = 0, emissive = '#000000', clear = 0 }: { rough?: number; opacity?: number; glow?: number; emissive?: string; clear?: number }) =>
  clear > 0
    ? <meshPhysicalMaterial vertexColors roughness={rough} clearcoat={clear} clearcoatRoughness={0.3} transparent={opacity < 1} opacity={opacity} emissive={emissive} emissiveIntensity={glow} envMapIntensity={0.8} />
    : <meshStandardMaterial vertexColors roughness={rough} metalness={0} transparent={opacity < 1} opacity={opacity} emissive={emissive} emissiveIntensity={glow} envMapIntensity={0.7} />

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

// ---------- 贴图 ----------
const canvasTex = (c: HTMLCanvasElement, wrap = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
/** 木板：顺纹细线和几道板缝，四边能拼接 */
export function makeWood(base = '#9a7448', dark = '70,48,26', light = '196,160,112', planks = 4, seed = 3) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  for (let p = 0; p < planks; p++) { g.fillStyle = `rgba(${r() < 0.5 ? dark : light},${0.03 + r() * 0.07})`; g.fillRect(0, p * S / planks, S, S / planks) }
  for (let i = 0; i < 520; i++) {
    const y = r() * S, x = r() * S, len = 80 + r() * 300
    g.strokeStyle = `rgba(${r() < 0.6 ? dark : light},${0.08 + r() * 0.16})`; g.lineWidth = 0.6 + r() * 1.6
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len / 3, y + (r() - 0.5) * 5, x + len * 2 / 3, y + (r() - 0.5) * 5, x + len, y + (r() - 0.5) * 3); g.stroke()
    if (x + len > S) { g.beginPath(); g.moveTo(x - S, y); g.lineTo(x + len - S, y); g.stroke() }
  }
  for (let p = 0; p < planks; p++) { g.fillStyle = 'rgba(30,20,10,0.55)'; g.fillRect(0, p * S / planks, S, 2.5); g.fillStyle = `rgba(${light},0.25)`; g.fillRect(0, p * S / planks + 2.5, S, 1.5) }
  return canvasTex(c)
}
/** 红砖墙：一顺一丁的砌法，砖色深浅不一，灰缝略凹（另给一张法线用的灰度） */
export function makeBrick(seed = 4) {
  const W = 512, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, r = rng(seed), bw = 64, bh = 24
  g.fillStyle = '#b9ad9a'; g.fillRect(0, 0, W, H)
  for (let row = 0; row < H / bh; row++) for (let x = (row % 2) * -bw / 2; x < W; x += bw) {
    const k = r(), base = [[148, 70, 48], [128, 58, 42], [160, 84, 58], [118, 62, 46]][Math.floor(k * 4)]
    g.fillStyle = `rgb(${base.map(v => v + (r() - 0.5) * 18).join(',')})`; g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4)
    for (let i = 0; i < 24; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,20,14' : '220,170,140'},${0.08 + r() * 0.12})`; g.fillRect(x + 2 + r() * (bw - 6), row * bh + 2 + r() * (bh - 6), 1 + r() * 3, 1 + r() * 2) }
    if (x < 0) { g.fillStyle = g.fillStyle as string; g.fillRect(x + W + 2, row * bh + 2, bw - 4, bh - 4) }
  }
  return canvasTex(c)
}
/** 插在土里或台上的小木牌上的字 */
export function makeSign(text: string, sub = '') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160
  const g = c.getContext('2d')!
  g.fillStyle = '#efe9d8'; g.fillRect(0, 0, 256, 160)
  const r = rng(text.length * 7 + 1); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.08})`; g.fillRect(r() * 256, r() * 160, 30 * r(), 1.5) }
  g.fillStyle = '#2c3a2a'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = '700 56px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillText(text, 128, sub ? 62 : 82)
  if (sub) { g.font = '500 30px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillStyle = '#5a6a55'; g.fillText(sub, 128, 122) }
  return canvasTex(c, false)
}

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

/** 插在土里的小木牌 */
export function Stake({ at, text, sub, yaw = 0, s = 1 }: { at: V3; text: string; sub?: string; yaw?: number; s?: number }) {
  const tex = useMemo(() => makeSign(text, sub), [text, sub])
  return (
    <group position={at} rotation-y={yaw} scale={s}>
      <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.1, 1.5, 0.05]} /><meshStandardMaterial color="#a88758" roughness={0.9} /></mesh>
      <mesh position={[0, 1.25, 0.04]} rotation-x={-0.12} castShadow><boxGeometry args={[1.5, 0.94, 0.05]} /><meshStandardMaterial color="#e6dfcc" roughness={0.85} /></mesh>
      <mesh position={[0, 1.25, 0.071]} rotation-x={-0.12}><planeGeometry args={[1.42, 0.86]} /><meshStandardMaterial map={tex} roughness={0.85} /></mesh>
    </group>
  )
}

// ---------- 成批的小叶片（远处的树冠） ----------
/** 把同一个小模型摆很多份，合成一个带顶点色的模型。模板要是没有索引的 */
export class Batch {
  pos: number[] = []; nor: number[] = []; col: number[] = []
  private m = new THREE.Matrix4(); private n = new THREE.Matrix3(); private v = new THREE.Vector3(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private s = new THREE.Vector3(); private t = new THREE.Vector3()
  add(tpl: THREE.BufferGeometry, p: V3, yaw: number, pitch: number, scale: number | V3, roll: number, color: THREE.Color) {
    this.q.setFromEuler(this.e.set(pitch, yaw, roll, 'YXZ'))
    if (typeof scale === 'number') this.s.set(scale, scale, scale); else this.s.set(...scale)
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
    g.computeBoundingSphere()
    return g
  }
}
/** 一片椭圆的小叶（没有索引） */
export function leafCard(len: number) { const g = new THREE.CircleGeometry(len / 2, 7).toNonIndexed(); g.scale(1.5, 0.75, 1); return g }
/**
 * 一棵阔叶树：树干分出几根主枝，每根枝头是一团叶片（每片一张小叶，朝向各不相同），远看是蓬松、透光的树冠，不是一个球。原点在树根，h 是树高
 */
export function leafyTree(seed: number, h: number, cards = 520) {
  const r = rng(seed), wood: THREE.BufferGeometry[] = [], B = new Batch(), L = leafCard(h * 0.03), c0 = new THREE.Color('#25401f'), c1 = new THREE.Color('#76994a'), c = new THREE.Color()
  const top: V3 = [(r() - 0.5) * h * 0.04, h * 0.45, (r() - 0.5) * h * 0.04]
  wood.push(tube([[0, -0.4, 0], [h * 0.01, h * 0.22, 0], top], h * 0.035, h * 0.022, '#4a3a2c', '#5d4a38', 8, 10))
  const nb = 6 + Math.floor(r() * 3)
  for (let b = 0; b < nb; b++) {
    const a = (b / nb) * 6.28 + r() * 0.6, up = 0.45 + r() * 0.7, len = h * (0.24 + r() * 0.12)
    const end: V3 = [top[0] + Math.cos(a) * Math.cos(up) * len, top[1] + Math.sin(up) * len, top[2] + Math.sin(a) * Math.cos(up) * len]
    wood.push(tube([top, [(top[0] + end[0]) / 2, (top[1] + end[1]) / 2 + h * 0.03, (top[2] + end[2]) / 2], end], h * 0.016, h * 0.005, '#4a3a2c', '#5d4a38', 5, 7))
    const R = h * (0.15 + r() * 0.06)
    for (let k = 0; k < cards; k++) {
      const th = r() * 6.28, ph = Math.acos(2 * r() - 1), rr = R * Math.pow(r(), 0.35)
      const p: V3 = [end[0] + Math.sin(ph) * Math.cos(th) * rr, end[1] + Math.cos(ph) * rr * 0.75, end[2] + Math.sin(ph) * Math.sin(th) * rr]
      c.copy(c0).lerp(c1, Math.max(0, Math.min(1, (p[1] - h * 0.5) / (h * 0.6) + (r() - 0.5) * 0.5)))
      B.add(L, p, r() * 6.28, r() * 3, 1 + r() * 0.8, r() * 3, c)
    }
  }
  return { wood: fuse(wood), leaves: B.build() }
}
