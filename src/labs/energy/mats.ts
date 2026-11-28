// 功和机械能实验室用到的程序贴图和拼模型的小函数：铺地砖、草地、彩条篷布、木纹、文字牌、刻度尺。不用下载素材。
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Part } from '@/lab-kit'

export type V3 = [number, number, number]
export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
export const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'
export function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
export function tex(c: HTMLCanvasElement, wrap = false) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const cache = new Map<string, THREE.Texture>()
export const once = (key: string, f: () => THREE.Texture) => { let t = cache.get(key); if (!t) { t = f(); cache.set(key, t) } return t }
export const rep = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c }

/** 按底面放的方块、立着的圆柱：省掉高度除以 2 的心算 */
export const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, r?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c, r })
export const cyl = (x: number, y0: number, z: number, r: number, h: number, c: string, rot?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [r, h, 0], c, cyl: true, r: rot })
/** 两点之间的一根方杆（桁架的斜撑、支架的腿） */
export function beam(a: V3, b: V3, t: number, c: string): Part {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length()
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()))
  return { p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: [t, len, t], c, r: [e.x, e.y, e.z] }
}
/** 整个模型刷一种顶点色，去掉索引和贴图坐标（方便合并） */
export function tint(g: THREE.BufferGeometry, color: string) {
  const n = g.index ? g.toNonIndexed() : g, c = new THREE.Color(color), k = n.attributes.position.count, a = new Float32Array(k * 3)
  for (let i = 0; i < k; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  n.setAttribute('color', new THREE.BufferAttribute(a, 3))
  for (const key of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(key)) n.deleteAttribute(key)
  return n
}
export const fuse = (list: THREE.BufferGeometry[]) => mergeGeometries(list)

/** 广场的铺地：错缝的浅色地砖，缝是深色的 */
export function makePaving() {
  return once('paving', () => {
    const S = 512, { c, g } = canvas(S), r = rng(3)
    g.fillStyle = '#8f8a80'; g.fillRect(0, 0, S, S)
    const w = 128, h = 64
    for (let j = 0; j < S / h; j++) for (let i = -1; i < S / w + 1; i++) {
      const v = 150 + r() * 34, x = i * w + (j % 2 ? w / 2 : 0)
      g.fillStyle = `rgb(${v + 6},${v},${v - 10})`; g.fillRect(x + 2, j * h + 2, w - 4, h - 4)
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + r() * 0.07})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
    return tex(c, true)
  })
}
/** 草地：深浅不一的绿，上面一层细草叶 */
export function makeGrass() {
  return once('grass', () => {
    const S = 512, { c, g } = canvas(S), r = rng(5)
    g.fillStyle = '#5f8a48'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 220; i++) {
      const x = r() * S, y = r() * S, rad = 18 + r() * 60, col = r() < 0.5 ? '120,160,80' : '50,90,50'
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); q.addColorStop(0, `rgba(${col},0.4)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2) }
    }
    // 割草机来回留下的条纹：一条深一条浅，每条宽半张图
    g.fillStyle = 'rgba(255,255,210,0.1)'; g.fillRect(0, 0, S / 4, S); g.fillRect(S / 2, 0, S / 4, S); g.fillStyle = 'rgba(0,30,0,0.08)'; g.fillRect(S / 4, 0, S / 4, S); g.fillRect(S * 3 / 4, 0, S / 4, S)
    for (let i = 0; i < 24000; i++) { const x = r() * S, y = r() * S, l = 2 + r() * 4; g.strokeStyle = r() < 0.5 ? `rgba(150,190,100,${0.2 + r() * 0.3})` : `rgba(35,70,35,${0.2 + r() * 0.3})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y - l); g.stroke() }
    return tex(c, true)
  })
}
/** 沙：细颗粒 */
export function makeSand() {
  return once('sand', () => {
    const S = 256, { c, g } = canvas(S), r = rng(9)
    g.fillStyle = '#cdb98c'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 16000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,70,40' : '255,245,215'},${0.06 + r() * 0.14})`; g.fillRect(r() * S, r() * S, 1 + r(), 1 + r()) }
    return tex(c, true)
  })
}
/** 彩条篷布：n 道两色相间的竖条 */
export function makeStripes(a: string, b: string, n = 8) {
  return once(`stripes${a}${b}${n}`, () => {
    const { c, g } = canvas(256, 64)
    for (let i = 0; i < n * 2; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 256 / (n * 2), 0, 256 / (n * 2) + 1, 64) }
    const q = g.createLinearGradient(0, 0, 0, 64); q.addColorStop(0, 'rgba(0,0,0,0.18)'); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(0, 0, 256, 64)
    return tex(c, true)
  })
}
/** 木纹：base 是底色 */
export function makeWood(base = '#b88a56', seed = 4) {
  return once(`wood${base}${seed}`, () => {
    const S = 256, { c, g } = canvas(S), r = rng(seed)
    g.fillStyle = base; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 90; i++) { const y = r() * S; g.strokeStyle = `rgba(${r() < 0.6 ? '70,40,15' : '240,210,160'},${0.08 + r() * 0.16})`; g.lineWidth = 0.6 + r() * 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= S; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 2.5); g.stroke() }
    return tex(c, true)
  })
}
/** 文字牌 */
export function makeSign(lines: string[], bg: string, fg: string, w = 512, h = 128) {
  return once(`sign${lines.join('|')}${bg}${fg}${w}x${h}`, () => {
    const { c, g } = canvas(w, h)
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
    const size = Math.min(h / lines.length * 0.62, w / Math.max(...lines.map(l => l.length)) * 0.9)
    g.font = `700 ${size}px ${FONT}`
    lines.forEach((l, i) => g.fillText(l, w / 2, h * (i + 0.5) / lines.length + size * 0.04))
    return tex(c)
  })
}
/** 刻度尺：长 len 米，每 step 米一格，每 major 格一个数；unit 是数字乘的倍数（厘米尺用 100）。vertical：竖着用的尺，0 在下面 */
export function makeScale(len: number, step: number, major: number, unit = 1, vertical = false) {
  return once(`scale${len}:${step}:${major}:${unit}:${vertical}`, () => {
    const n = Math.round(len / step), px = 1024 / n, { c, g } = vertical ? canvas(128, 1024) : canvas(1024, 128)
    g.fillStyle = '#f4f1e4'; g.fillRect(0, 0, c.width, c.height)
    g.fillStyle = '#1d2327'; g.font = `700 ${Math.max(22, Math.min(46, px * major * 0.5))}px Geist, Arial, sans-serif`
    g.textAlign = vertical ? 'left' : 'center'; g.textBaseline = vertical ? 'middle' : 'alphabetic'
    for (let i = 0; i <= n; i++) {
      const q = Math.min(1021, Math.max(3, i * px)), big = i % major === 0, l = big ? 52 : 28, w = big ? 5 : 2.5
      if (vertical) g.fillRect(0, 1024 - q - w / 2, l, w); else g.fillRect(q - w / 2, 0, w, l)
      if (big && i > 0 && i < n) { const txt = String(Math.round(i * step * unit * 100) / 100); if (vertical) g.fillText(txt, 60, 1024 - q + 2); else g.fillText(txt, q, 112) }
    }
    return tex(c)
  })
}
/** 大片草地上的明暗：一张透明的图，上面是很淡的大块深色和浅色斑，盖在草地上，远看不再是一整片纯色 */
export function makeBlotch() {
  return once('blotch', () => {
    const S = 512, { c, g } = canvas(S), r = rng(41)
    for (let i = 0; i < 46; i++) {
      const x = r() * S, y = r() * S, rad = 40 + r() * 110, col = r() < 0.55 ? '20,50,20' : '225,235,150', al = 0.1 + r() * 0.14
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); q.addColorStop(0, `rgba(${col},${al})`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2) }
    }
    return tex(c, true)
  })
}
