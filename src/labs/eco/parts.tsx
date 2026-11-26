// 生态系统实验室里反复用到的造型工具和材质：可重复的随机数、合并模型、弯管、草叶和叶片（带弧度的薄曲面）、
// 毛皮材质（细密的毛纹和绒光）、眼睛、玻璃、木纹贴图、按时间走的进度。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export type V3 = [number, number, number]
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
export const ease = (t: number) => { const k = clamp01(t); return k * k * (3 - 2 * k) }
export const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
/** 可重复的随机数 */
export function rng(seed: number) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 }
const col = (c: string | THREE.Color) => (typeof c === 'string' ? new THREE.Color(c) : c)

/** 给模型刷上顶点色（从下到上 color → top） */
export function tint(g: THREE.BufferGeometry, color: string | THREE.Color, top?: string | THREE.Color) {
  const c0 = col(color), c1 = top ? col(top) : c0, c = new THREE.Color()
  g.computeBoundingBox(); const y0 = g.boundingBox!.min.y, h = Math.max(1e-6, g.boundingBox!.max.y - y0)
  const p = g.attributes.position, a = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) { c.copy(c0).lerp(c1, (p.getY(i) - y0) / h); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return g
}
/** 先缩放，再绕 x 俯仰，再绕 y 转向，最后平移 */
export function place(g: THREE.BufferGeometry, p: V3, yaw = 0, pitch = 0, s: number | V3 = 1, roll = 0) {
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s)
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'))
  return g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), q, sc))
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

const toV = (p: V3 | THREE.Vector3) => (Array.isArray(p) ? new THREE.Vector3(...p) : p)
/** 一根由粗到细的弯管（茎、枝、尾巴、触角）。末端收成一个尖 */
export function tube(pts: (V3 | THREE.Vector3)[], r0: number, r1: number, c0: string, c1 = c0, radial = 7, segs = Math.max(6, pts.length * 5), pow = 1) {
  const curve = new THREE.CatmullRomCurve3(pts.map(toV), false, 'centripetal')
  const fr = curve.computeFrenetFrames(segs, false), a = col(c0), b = col(c1), c = new THREE.Color()
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
  pos.set([p.x + t1.x * r1 * 0.9, p.y + t1.y * r1 * 0.9, p.z + t1.z * r1 * 0.9], tip * 3); nor.set([t1.x, t1.y, t1.z], tip * 3); cl.set([b.r, b.g, b.b], tip * 3); uv.set([0.5, 1], tip * 2)
  for (let j = 0; j < radial; j++) idx.push(segs * ring + j, segs * ring + j + 1, tip)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

// ---------- 叶片、草叶、花瓣 ----------
export interface LeafOpt { len: number; wid: number; basePow?: number; tipPow?: number; curl?: number; fold?: number; cup?: number; wave?: number; base: string; tip: string; back?: string; nu?: number; nv?: number }
/** 一片叶（或草叶、花瓣）：基部在原点，主脉朝 +z，正面朝 +y；沿主脉下垂、两半对折、边缘起伏；颜色从基部到尖端渐变，背面另一种颜色 */
export function leafGeo(o: LeafOpt) {
  const NU = o.nu ?? 8, NV = o.nv ?? 1, bp = o.basePow ?? 0.7, tp = o.tipPow ?? 1, curl = o.curl ?? 0.15, fold = o.fold ?? 0.25, cup = o.cup ?? 0, wave = o.wave ?? 0
  const cb = col(o.base), ct = col(o.tip), bk = o.back ? col(o.back) : cb.clone().lerp(new THREE.Color('#d9e2c0'), 0.3), c = new THREE.Color()
  const cols = NV * 2 + 1, n = (NU + 1) * cols
  const pos = new Float32Array(n * 6), cl = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx: number[] = []
  for (let i = 0; i <= NU; i++) for (let j = 0; j < cols; j++) {
    const u = i / NU, v = j / NV - 1, w = (o.wid / 2) * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, bp))), tp) + (i === 0 ? o.wid * 0.035 : 0)
    const x = v * w, z = u * o.len
    const y = -curl * o.len * u * u + fold * Math.abs(x) + cup * (x * x / o.wid + u * (1 - u) * o.len * 0.5) + wave * o.wid * Math.sin(u * 15 + v * 2.2) * v * v
    const k = i * cols + j
    for (const s of [0, 1]) {
      const q = (s * n + k) * 3
      pos[q] = x; pos[q + 1] = y - s * 0.0008; pos[q + 2] = z
      if (s === 0) { c.copy(cb).lerp(ct, Math.pow(u, 1.1)); c.multiplyScalar(0.9 + 0.14 * Math.abs(v)) } else c.copy(bk).lerp(ct, u * 0.25)
      cl[q] = c.r; cl[q + 1] = c.g; cl[q + 2] = c.b
      uv[(s * n + k) * 2] = 0.5 + v * 0.46; uv[(s * n + k) * 2 + 1] = 0.03 + u * 0.94
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < cols - 1; j++) {
    const a = i * cols + j, b = a + 1, d = a + cols, e = d + 1
    idx.push(a, d, b, b, d, e, n + a, n + b, n + d, n + b, n + e, n + d)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}
/** 一根草叶：竖着长、向一侧弯，窄而尖。原点在基部，高 1 */
export function bladeGeo(bend = 0.35, wid = 0.06, base = '#4d6b2c', tip = '#a9b860') {
  const g = leafGeo({ len: 1, wid, basePow: 0.25, tipPow: 0.9, curl: bend, fold: 0.6, base, tip, back: base, nu: 5, nv: 1 })
  g.rotateX(-Math.PI / 2)                  // 主脉从 +z 转到 +y：竖起来
  return g
}

// ---------- 材质 ----------
/**
 * 毛皮：顶点色打底，粗糙、带一层绒光；片元里按模型自身坐标加一层很细的毛纹（法线的细小起伏和明暗），
 * 近看是一丝一丝的，不是光滑的塑料。grain：毛纹的密度（每米多少道），stretch：毛顺着哪个方向拉长
 */
export function makeFur({ grain = 260, bump = 0.5, rough = 0.86, sheen = 0.35, sheenColor = '#ffffff', tone = 0.22 }: { grain?: number; bump?: number; rough?: number; sheen?: number; sheenColor?: string; tone?: number } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: rough, metalness: 0, sheen, sheenRoughness: 0.6, sheenColor: new THREE.Color(sheenColor), envMapIntensity: 0.6 })
  m.onBeforeCompile = s => {
    s.uniforms.uGrain = { value: grain }; s.uniforms.uBump = { value: bump }; s.uniforms.uTone = { value: tone }
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position;')
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vObjP; uniform float uGrain; uniform float uBump; uniform float uTone;
float fh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float fn(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(fh(i), fh(i+vec3(1,0,0)), f.x), mix(fh(i+vec3(0,1,0)), fh(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(fh(i+vec3(0,0,1)), fh(i+vec3(1,0,1)), f.x), mix(fh(i+vec3(0,1,1)), fh(i+vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec3 fp = vObjP * uGrain * vec3(1.0, 0.35, 1.0);
float strand = fn(fp) * 0.6 + fn(fp * 2.7) * 0.4;
diffuseColor.rgb *= 1.0 - uTone + uTone * 2.0 * strand;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec3 q = vObjP * uGrain * 1.6;
normal = normalize(normal + uBump * (vec3(fn(q), fn(q + 19.1), fn(q + 41.7)) - 0.5));`)
  }
  return m
}
export function useFur(opt: Parameters<typeof makeFur>[0] = {}) {
  const m = useMemo(() => makeFur(opt), [JSON.stringify(opt)])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => m.dispose(), [m])
  return m
}
/** 眼睛：深色、很亮的角膜高光 */
export const Eye = ({ color = '#120d0a' }: { color?: string }) => <meshPhysicalMaterial color={color} roughness={0.08} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={1.6} />
/** 玻璃容器：里面还要画东西，所以不用折射，只做半透明加清漆高光 */
export const Glass = ({ opacity = 0.14, color = '#a9c7cc', env = 1.1 }: { opacity?: number; color?: string; env?: number }) =>
  <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.05} metalness={0} clearcoat={1} clearcoatRoughness={0.06} envMapIntensity={env} side={THREE.DoubleSide} depthWrite={false} />
/** 植物的顶点色材质（叶、草） */
export const Plant = ({ rough = 0.75, double = true }: { rough?: number; double?: boolean }) => <meshStandardMaterial vertexColors roughness={rough} metalness={0} side={double ? THREE.DoubleSide : THREE.FrontSide} envMapIntensity={0.6} />
/** 有顶点色的实体（石头、蘑菇、树干） */
export const Flesh = ({ rough = 0.8, color = '#ffffff', emissive = '#000000', glow = 0 }: { rough?: number; color?: string; emissive?: string; glow?: number }) =>
  <meshStandardMaterial vertexColors color={color} roughness={rough} metalness={0} emissive={emissive} emissiveIntensity={glow} envMapIntensity={0.7} />

// ---------- 贴图 ----------
/** 木板：顺纹的细线、几道板缝 */
export function makeWood(base = '#9a7448', dark = '70,48,26', light = '196,160,112', planks = 4, seed = 3) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  for (let p = 0; p < planks; p++) { g.fillStyle = `rgba(${r() < 0.5 ? dark : light},${0.03 + r() * 0.07})`; g.fillRect(0, p * S / planks, S, S / planks) }
  for (let i = 0; i < 520; i++) {
    const y = r() * S, x = r() * S, len = 80 + r() * 300
    g.strokeStyle = `rgba(${r() < 0.6 ? dark : light},${0.08 + r() * 0.16})`; g.lineWidth = 0.6 + r() * 1.6
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len / 3, y + (r() - 0.5) * 5, x + len * 2 / 3, y + (r() - 0.5) * 5, x + len, y + (r() - 0.5) * 3); g.stroke()
  }
  for (let p = 0; p < planks; p++) { g.fillStyle = 'rgba(30,20,10,0.55)'; g.fillRect(0, p * S / planks, S, 2.5); g.fillStyle = `rgba(${light},0.25)`; g.fillRect(0, p * S / planks + 2.5, S, 1.5) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}

// ---------- 时间 ----------
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

// ---------- 快速合并 ----------
/** 把同一个小模型（一片叶、一根草）按不同的位置、朝向、大小、颜色复制很多份，直接写进一个大数组：比一份份建好再合并快得多 */
export class Batch {
  pos: number[] = []; nor: number[] = []; col: number[] = []
  private m = new THREE.Matrix4(); private n = new THREE.Matrix3(); private v = new THREE.Vector3(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private s = new THREE.Vector3(); private t = new THREE.Vector3()
  /** tpl 要是没有索引的模型；yaw/pitch/roll 和 place() 的次序一样 */
  add(tpl: THREE.BufferGeometry, p: V3, yaw: number, pitch: number, scale: number | V3, roll: number, color: THREE.Color) {
    this.q.setFromEuler(this.e.set(pitch, yaw, roll, 'YXZ'))
    typeof scale === 'number' ? this.s.set(scale, scale, scale) : this.s.set(...scale)
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
/** 一片椭圆的小叶（没有索引），给 Batch 用 */
export function leafCard(len: number) { const g = new THREE.CircleGeometry(len / 2, 7).toNonIndexed(); g.scale(1.5, 0.75, 1); return g }
