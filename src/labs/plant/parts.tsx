// 植物的一生实验室里反复用到的造型工具和材质：叶片和花瓣（带弧度的薄曲面）、根粗梢细的茎、剖开的回转体、程序画的贴图、玻璃。
// 生物体都是薄片和曲面，不用实心方块；颜色写在顶点上，从基部到尖端渐变，正面和背面两种颜色。
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'
import type { RY } from '@/lab-kit'

export type V3 = [number, number, number]
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
/** 缓入缓出 */
export const ease = (t: number) => { const k = clamp01(t); return k * k * (3 - 2 * k) }
/** 总进度 t 落在 a 到 b 这一段里走了多少（0–1，缓入缓出） */
export const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
/** 可重复的随机数 */
export function rng(seed: number) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 }
const col = (c: string | THREE.Color) => (typeof c === 'string' ? new THREE.Color(c) : c)
/** 两种颜色按比例调和，返回 #rrggbb */
export const mixHex = (a: string, b: string, k: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getHexString()}`

/** 给一个模型整体刷上一种颜色（顶点色），好和别的模型合并 */
export function tint(g: THREE.BufferGeometry, color: string | THREE.Color, top?: string | THREE.Color) {
  const c0 = col(color), c1 = top ? col(top) : c0, c = new THREE.Color()
  g.computeBoundingBox(); const y0 = g.boundingBox!.min.y, h = Math.max(1e-6, g.boundingBox!.max.y - y0)
  const p = g.attributes.position, a = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) { c.copy(c0).lerp(c1, (p.getY(i) - y0) / h); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return g
}
/** 把模型挪到某处、转个方向、缩放（先缩放，再绕 x 俯仰，再绕 y 转向，最后平移） */
export function place(g: THREE.BufferGeometry, p: V3, yaw = 0, pitch = 0, s: number | V3 = 1, roll = 0) {
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s)
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'))
  return g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), q, sc))
}
/** 合并前把各个模型的属性对齐（只留位置、法线、颜色、贴图坐标），并去掉索引 */
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
  /** 最宽处靠基部（小于 1）还是靠尖端（大于 1） */ basePow?: number
  /** 尖端尖（大于 1）还是圆（小于 1） */ tipPow?: number
  /** 沿主脉往下垂多少（负数是往上翘） */ curl?: number
  /** 两半叶片沿主脉向上对折多少 */ fold?: number
  /** 向上兜成勺形多少（花瓣用） */ cup?: number
  /** 叶缘的起伏 */ wave?: number
  base: string; tip: string; back?: string; edge?: string; nu?: number; nv?: number
}
/**
 * 一片叶或一片花瓣：基部在原点，主脉朝 +z 伸出去，正面朝 +y。是一张有弧度的薄曲面，不是平板：
 * 沿主脉下垂或上翘，两半向上对折，边缘起伏。颜色从基部到尖端渐变，背面另一种颜色（单独一层面，朝下）。
 * 贴图坐标：横向 0–1 是叶宽，纵向 0–1 是从基部到尖端，配 veinTex、petalTex 用。
 */
export function leafGeo(o: LeafOpt) {
  const NU = o.nu ?? 12, NV = o.nv ?? 3, bp = o.basePow ?? 0.7, tp = o.tipPow ?? 1, curl = o.curl ?? 0.15, fold = o.fold ?? 0.25, cup = o.cup ?? 0, wave = o.wave ?? 0.04
  const cb = col(o.base), ct = col(o.tip), bk = o.back ? col(o.back) : cb.clone().lerp(new THREE.Color('#d9e2c0'), 0.42), ce = o.edge ? col(o.edge) : null, c = new THREE.Color()
  const cols = NV * 2 + 1, n = (NU + 1) * cols
  const pos = new Float32Array(n * 6), cl = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx: number[] = []
  for (let i = 0; i <= NU; i++) for (let j = 0; j < cols; j++) {
    const u = i / NU, v = j / NV - 1, w = (o.wid / 2) * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, bp))), tp) + (i === 0 ? o.wid * 0.035 : 0)
    const x = v * w, z = u * o.len
    const y = -curl * o.len * u * u + fold * Math.abs(x) + cup * (x * x / o.wid + u * (1 - u) * o.len * 0.5) + wave * o.wid * Math.sin(u * 15 + v * 2.2) * v * v
    const k = i * cols + j
    for (const s of [0, 1]) {
      const q = (s * n + k) * 3
      pos[q] = x; pos[q + 1] = y - s * 0.0015; pos[q + 2] = z
      if (s === 0) { c.copy(cb).lerp(ct, Math.pow(u, 1.1)); if (ce) c.lerp(ce, Math.pow(Math.abs(v), 2.5) * 0.8 + Math.pow(u, 4) * 0.5); else c.multiplyScalar(0.9 + 0.14 * Math.abs(v)) } else c.copy(bk).lerp(ct, u * 0.25)
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

let _vein: THREE.CanvasTexture | null = null
/** 叶脉：中间一条主脉，两侧羽状的侧脉，再加一层细网。浅色的线画在灰底上，叶面的颜色乘上它 */
export function veinTex() {
  if (_vein) return _vein
  const W = 256, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, r = rng(11)
  g.fillStyle = '#c4c4c4'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '96,96,96'},0.06)`; g.fillRect(r() * W, r() * H, 3, 3) }
  g.lineCap = 'round'
  for (let k = 1; k <= 11; k++) for (const s of [-1, 1]) {
    const y = H - k * 42 + (s > 0 ? 9 : 0)
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2.4 - k * 0.1
    g.beginPath(); g.moveTo(W / 2, y); g.quadraticCurveTo(W / 2 + s * 60, y - 34, W / 2 + s * 122, y - 92); g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1
    for (let m = 1; m <= 3; m++) { const x = W / 2 + s * m * 28, yy = y - m * 20; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + s * 14, yy + 16); g.stroke() }
  }
  g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.moveTo(W / 2, H); g.lineTo(W / 2, 12); g.stroke()
  g.fillStyle = '#c4c4c4'; g.fillRect(0, 0, 8, 8)                 // 左下角留一块没有脉纹的：茎、柄这些不要纹路的把贴图坐标放在这里
  _vein = new THREE.CanvasTexture(c); _vein.colorSpace = THREE.SRGBColorSpace; _vein.anisotropy = 8
  return _vein
}
let _petal: THREE.CanvasTexture | null = null
/** 花瓣的脉纹：从基部呈扇形散开的细线，颜色比花瓣略深 */
export function petalTex() {
  if (_petal) return _petal
  const W = 256, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, r = rng(5)
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '150,150,150'},0.07)`; g.fillRect(r() * W, r() * H, 3, 3) }
  for (let k = -9; k <= 9; k++) {
    g.strokeStyle = `rgba(150,120,130,${0.34 - Math.abs(k) * 0.012})`; g.lineWidth = k % 3 === 0 ? 1.8 : 1
    g.beginPath(); g.moveTo(W / 2 + k * 2, H); g.quadraticCurveTo(W / 2 + k * 9, H * 0.5, W / 2 + k * 13.5 + (r() - 0.5) * 6, 8); g.stroke()
  }
  _petal = new THREE.CanvasTexture(c); _petal.colorSpace = THREE.SRGBColorSpace; _petal.anisotropy = 8
  return _petal
}
/** 叶片、花瓣的材质：顶点色乘脉纹贴图 */
export const LeafMat = ({ petal = false, rough = 0.62, opacity = 1 }: { petal?: boolean; rough?: number; opacity?: number }) =>
  <meshStandardMaterial vertexColors map={petal ? petalTex() : veinTex()} roughness={rough} metalness={0} side={THREE.FrontSide} transparent={opacity < 1} opacity={opacity} envMapIntensity={0.7} />
/** 茎、根、果实这些有顶点色的实体 */
export const Flesh = ({ rough = 0.7, opacity = 1, color = '#ffffff', emissive = '#000000', glow = 0, double = false }: { rough?: number; opacity?: number; color?: string; emissive?: string; glow?: number; double?: boolean }) =>
  <meshStandardMaterial vertexColors color={color} roughness={rough} metalness={0} transparent={opacity < 1} opacity={opacity} emissive={emissive} emissiveIntensity={glow} side={double ? THREE.DoubleSide : THREE.FrontSide} envMapIntensity={0.7} />

// ---------- 茎、根、枝 ----------
const toV = (p: V3 | THREE.Vector3) => (Array.isArray(p) ? new THREE.Vector3(...p) : p)
/**
 * 一根由粗到细的弯管：沿着几个点画一条光滑的曲线，半径从 r0 变到 r1，颜色从 c0 变到 c1。茎、根、叶柄、花丝、树枝都用它。
 * pow 大于 1 时前面粗得久、末端才收细。末端收成一个尖。
 */
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
  // 末端的尖
  const tip = n - 1, t1 = fr.tangents[segs]; curve.getPointAt(1, p)
  pos.set([p.x + t1.x * r1 * 0.9, p.y + t1.y * r1 * 0.9, p.z + t1.z * r1 * 0.9], tip * 3); nor.set([t1.x, t1.y, t1.z], tip * 3); cl.set([b.r, b.g, b.b], tip * 3); uv.set([0.5, 1], tip * 2)
  for (let j = 0; j < radial; j++) idx.push(segs * ring + j, segs * ring + j + 1, tip)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}
/** 一个椭球（顶点色从下到上渐变） */
export function blob(rx: number, ry: number, rz: number, c0: string, c1 = c0, ws = 20, hs = 14) {
  const g = new THREE.SphereGeometry(1, ws, hs); g.scale(rx, ry, rz)
  return tint(g, c0, c1)
}

// ---------- 剖开的回转体 ----------
/**
 * 把一个闭合的截面绕 y 轴只转一部分（从 a0 到 a1），两头用截面封口。剖开的子房、花托、果实、种子都用它：
 * 剖面露出来的是实心的壁，不是空壳。color 是外表面的颜色（可以给 top 做上下渐变），cap 是剖面的颜色。
 * 角度从 +x 起，朝 −z 转（和 lab-kit 的 lathe 一致）。配双面材质用。
 */
export function wedge(profile: RY[], a0: number, a1: number, color: string, cap: string, segs = 28, top?: string, only?: 'body' | 'caps') {
  const n = profile.length, cols = segs + 1
  const pos: number[] = [], idx: number[] = []
  for (let i = 0; i < n; i++) for (let j = 0; j < cols; j++) { const t = lerp(a0, a1, j / segs), [r, y] = profile[i]; pos.push(r * Math.cos(t), y, -r * Math.sin(t)) }
  for (let i = 0; i < n; i++) for (let j = 0; j < segs; j++) {
    const a = i * cols + j, b = ((i + 1) % n) * cols + j
    if (profile[i][0] > 1e-9) idx.push(a, a + 1, b + 1)
    if (profile[(i + 1) % n][0] > 1e-9) idx.push(a, b + 1, b)
  }
  const side = new THREE.BufferGeometry(); side.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); side.setIndex(idx)
  const body = tint(toCreasedNormals(side, 0.7), color, top)
  if (Math.abs(a1 - a0) > Math.PI * 2 - 1e-6 || only === 'body') return body
  const tri = THREE.ShapeUtils.triangulateShape(profile.map(([r, y]) => new THREE.Vector2(r, y)), [])
  const caps = [a0, a1].map(t => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(profile.flatMap(([r, y]) => [r * Math.cos(t), y, -r * Math.sin(t)]), 3)); g.setIndex(tri.flat()); g.computeVertexNormals()
    return tint(g.toNonIndexed(), cap)
  })
  return fuse(only === 'caps' ? caps : [body, ...caps])
}
/** 椭圆弧的截面点：从最下面沿外侧走到最上面。rx、ry 是两个半轴，y0 是中心的高度，bulge 让上半截瘦一些（像桃） */
export function arc(rx: number, ry: number, y0 = 0, n = 18, from = -Math.PI / 2, to = Math.PI / 2, bulge = 0): RY[] {
  return Array.from({ length: n + 1 }, (_, i) => { const t = lerp(from, to, i / n), s = Math.sin(t); return [Math.max(0, rx * Math.cos(t) * (1 - bulge * Math.max(0, s))), y0 + ry * s] as RY })
}
/** 一圈有厚度的壳的闭合截面：外面一条椭圆弧，里面一条小一圈的 */
export const ring = (rx: number, ry: number, t: number, y0 = 0, n = 18, bulge = 0): RY[] => [...arc(rx, ry, y0, n, -Math.PI / 2, Math.PI / 2, bulge), ...arc(rx - t, ry - t, y0, n, Math.PI / 2, -Math.PI / 2, bulge)]

// ---------- 贴图 ----------
/** 木板：顺纹的细线，几道板缝。四边能拼接 */
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
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 树皮：竖向的裂纹，加桃树那种横着的皮孔 */
export function makeBark() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(9)
  g.fillStyle = '#b9b0a6'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(${r() < 0.6 ? '60,44,36' : '230,220,205'},${0.1 + r() * 0.2})`; g.lineWidth = 1 + r() * 2.4; const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + 20 + r() * 60); g.stroke() }
  for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(70,46,36,${0.3 + r() * 0.3})`; g.fillRect(r() * S, r() * S, 10 + r() * 22, 2 + r() * 2) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 一块写着字的小牌子用的贴图：白漆木牌，深色的字 */
export function makeSign(text: string, sub = '') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160
  const g = c.getContext('2d')!
  g.fillStyle = '#efe9d8'; g.fillRect(0, 0, 256, 160)
  const r = rng(text.length * 7 + 1); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.08})`; g.fillRect(r() * 256, r() * 160, 30 * r(), 1.5) }
  g.fillStyle = '#2c3a2a'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = '700 62px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillText(text, 128, sub ? 64 : 84)
  if (sub) { g.font = '500 30px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillStyle = '#5a6a55'; g.fillText(sub, 128, 124) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

// ---------- 玻璃、小件 ----------
/** 玻璃容器：里面还要画东西，所以不用折射，只做半透明加一层清漆的高光 */
export const Glass = ({ opacity = 0.14, color = '#9fc2c9', env = 1.1 }: { opacity?: number; color?: string; env?: number }) =>
  <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.06} metalness={0} clearcoat={1} clearcoatRoughness={0.08} envMapIntensity={env} side={THREE.DoubleSide} depthWrite={false} />

/** 用完就释放的模型：deps 变了就重建，旧的丢掉。会长的茎、根、花粉管都这样画 */
export function useGeo(make: () => THREE.BufferGeometry, deps: unknown[]) {
  const g = useMemo(make, deps)   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => g.dispose(), [g])
  return g
}
/** 一个按时间走的进度：to 变了以后，用 sec 秒从现在的值匀速走到 to（画面上再套缓动）。返回当前值 */
export function useRun(to: number, sec: number) {
  const [x, setX] = useState(to)
  useEffect(() => {
    let raf = 0, last = performance.now(), cur = x
    if (cur === to) return
    const frame = (now: number) => {
      const dt = Math.max(0, Math.min(1 / 30, (now - last) / 1000)); last = now   // 这一帧的时间戳可能比开始计时还早一点，不能让它倒着走
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
/** 插在土里或摆在台上的小木牌 */
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
export type Kids = { children?: ReactNode }
