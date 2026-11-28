// 程序画出来的贴图：厂区沥青和地坪、化验室地砖和台面、墙面、压型钢板、保温层的铝皮、剖面的斜线、耐火砖、
// 钒催化剂颗粒、瓷环填料、矿石、格栅板、牌子。不用下载素材。
import * as THREE from 'three'
import { rng } from './parts'

function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
export const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif'
/** 复制一张贴图并设重复次数 */
export const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c }
function speck(g: CanvasRenderingContext2D, S: number, n: number, a: string, b: string, r: () => number, big = 1.5, alpha = [0.08, 0.16]) {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < 0.5 ? a : b},${alpha[0] + r() * alpha[1]})`; g.fillRect(r() * S, r() * S, 1 + r() * big, 1 + r() * big) }
}
/** 一片片深浅不匀的斑：n 块，半径 r0–r1，两种颜色 */
function blotch(g: CanvasRenderingContext2D, S: number, n: number, r0: number, r1: number, a: string, b: string, r: () => number, wrap = true) {
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, R = r0 + r() * (r1 - r0), q = g.createRadialGradient(x, y, 0, x, y, R)
    q.addColorStop(0, r() < 0.5 ? a : b); q.addColorStop(1, 'rgba(128,128,128,0)')
    for (const [ox, oy] of wrap ? [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]] : [[0, 0]]) { g.fillStyle = q; g.save(); g.translate(ox, oy); g.fillRect(x - R, y - R, R * 2, R * 2); g.restore() }
  }
}

/** 厂区的沥青：深灰带斑驳 */
export const asphaltTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(13)
  g.fillStyle = '#4d4e4c'; g.fillRect(0, 0, S, S)
  blotch(g, S, 120, 20, 90, 'rgba(40,38,36,0.35)', 'rgba(110,106,98,0.25)', r)
  speck(g, S, 26000, '30,30,30', '140,138,132', r, 1.5, [0.1, 0.2])
  return tex(c)
})
/** 混凝土地坪：浅灰，一块块分缝，有水渍 */
export const slabTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(19)
  g.fillStyle = '#a5a29a'; g.fillRect(0, 0, S, S)
  blotch(g, S, 70, 30, 110, 'rgba(84,80,74,0.2)', 'rgba(200,198,190,0.18)', r, false)
  speck(g, S, 16000, '90,88,84', '220,218,210', r)
  g.fillStyle = 'rgba(60,58,54,0.55)'; g.fillRect(0, 0, S, 3); g.fillRect(0, 0, 3, S)
  return tex(c)
})
/** 化验室的地面：浅灰的方砖 */
export const tileTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 198 + Math.floor(r() * 10); g.fillStyle = `rgb(${v - 4},${v},${v + 2})`; g.fillRect(i * 256, j * 256, 256, 256) }
  speck(g, S, 5000, '120,124,126', '250,252,252', r)
  g.fillStyle = '#8c9294'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, S); g.fillRect(0, k, S, 3) }
  return tex(c)
})
/** 化验台面：浅灰的环氧树脂板，有细小的斑点 */
export const benchTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#a7aaa8'; g.fillRect(0, 0, S, S)
  blotch(g, S, 50, 10, 50, 'rgba(120,122,120,0.2)', 'rgba(200,202,200,0.16)', r)
  speck(g, S, 5000, '90,92,90', '225,226,224', r, 0, [0.1, 0.12])
  return tex(c)
})
/** 室内墙面：浅色乳胶漆 */
export const wallTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(47)
  g.fillStyle = '#e6e5df'; g.fillRect(0, 0, S, S)
  speck(g, S, 4000, '150,144,132', '255,255,250', r, 1, [0.04, 0.08])
  return tex(c)
})
/** 厂房外墙：浅灰的压型钢板，一道道竖肋，上面有雨水留下的污渍 */
export const cladTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(43)
  for (let x = 0; x < S; x++) { const k = (x % 32) / 32, v = k < 0.1 ? 0.78 : k < 0.18 ? 1.08 : 0.95; g.fillStyle = `rgb(${Math.round(200 * v)},${Math.round(204 * v)},${Math.round(204 * v)})`; g.fillRect(x, 0, 1, S) }
  for (let i = 0; i < 26; i++) { const x = r() * S, w = 4 + r() * 18, q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, 'rgba(90,80,66,0.2)'); q.addColorStop(1, 'rgba(90,80,66,0)'); g.fillStyle = q; g.fillRect(x, 0, w, S * (0.3 + r() * 0.6)) }
  return tex(c)
})
/** 保温层外面包的铝皮：横向一道道搭接缝，竖向一条接缝，有一点流痕 */
export const jacketTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(71)
  g.fillStyle = '#c9ccce'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '120,124,128'},${0.05 + r() * 0.08})`; g.fillRect(0, r() * S, S, 1) }
  for (let i = 0; i < 6; i++) { const x = r() * S, q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, 'rgba(96,88,74,0.16)'); q.addColorStop(1, 'rgba(96,88,74,0)'); g.fillStyle = q; g.fillRect(x, 0, 3 + r() * 8, S) }
  g.fillStyle = 'rgba(80,84,88,0.7)'; g.fillRect(0, 0, S, 3); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, 3, S, 2)
  g.fillStyle = 'rgba(80,84,88,0.5)'; g.fillRect(0, 0, 2, S)
  return tex(c)
})
/** 钢板的漆面：一种底色上有焊缝、锈迹和流痕。base 是漆色 */
const paintCache = new Map<string, THREE.CanvasTexture>()
export function paintTex(base: string, seed = 3) {
  const hit = paintCache.get(base + seed); if (hit) return hit
  const S = 256, { c, g } = canvas(S), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  blotch(g, S, 26, 14, 60, 'rgba(0,0,0,0.1)', 'rgba(255,255,255,0.08)', r)
  for (let i = 0; i < 9; i++) { const x = r() * S, y0 = r() * S * 0.5, q = g.createLinearGradient(0, y0, 0, y0 + 90); q.addColorStop(0, 'rgba(110,62,30,0.3)'); q.addColorStop(1, 'rgba(110,62,30,0)'); g.fillStyle = q; g.fillRect(x, y0, 2 + r() * 5, 90) }
  g.fillStyle = 'rgba(30,30,30,0.35)'; g.fillRect(0, 0, S, 2); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 2, S, 2)
  speck(g, S, 2500, '40,36,30', '255,255,255', r, 1, [0.03, 0.07])
  const t = tex(c); paintCache.set(base + seed, t)
  return t
}
/** 剖面：浅灰底上 45° 的细斜线（机械制图里金属剖面的画法） */
export const hatchTex = once(() => {
  const S = 128, { c, g } = canvas(S)
  g.fillStyle = '#b9bdc0'; g.fillRect(0, 0, S, S)
  g.strokeStyle = 'rgba(70,74,78,0.55)'; g.lineWidth = 3
  for (let k = -S; k < S * 2; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke() }
  return tex(c)
})
/** 耐火砖：一皮皮错缝砌的砖，米黄到砖红 */
export const brickTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(57)
  g.fillStyle = '#6f6257'; g.fillRect(0, 0, S, S)
  const bh = 32, bw = 64
  for (let j = 0; j < S / bh; j++) for (let i = -1; i < S / bw + 1; i++) {
    const x = i * bw + (j % 2 ? bw / 2 : 0), v = r()
    g.fillStyle = `rgb(${Math.round(196 + v * 30)},${Math.round(150 + v * 34)},${Math.round(104 + v * 30)})`; g.fillRect(x + 2, j * bh + 2, bw - 4, bh - 4)
  }
  speck(g, S, 5000, '90,60,40', '255,240,220', r, 1.5, [0.06, 0.12])
  return tex(c)
})
/** 钒催化剂：一堆黄褐色的短圆柱颗粒 */
export const catalystTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(33)
  g.fillStyle = '#5a4416'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 2400; i++) {
    const x = r() * S, y = r() * S, w = 10 + r() * 6, h = 5 + r() * 3, a = r() * Math.PI, v = r()
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      g.save(); g.translate(x + ox, y + oy); g.rotate(a)
      g.fillStyle = `rgb(${Math.round(196 + v * 40)},${Math.round(146 + v * 40)},${Math.round(40 + v * 30)})`; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.fill()
      g.fillStyle = 'rgba(255,240,190,0.35)'; g.fillRect(-w / 2 + 2, -h / 2 + 1, w - 4, 1.5)
      g.fillStyle = 'rgba(60,40,10,0.35)'; g.fillRect(-w / 2 + 2, h / 2 - 2, w - 4, 1.5)
      g.restore()
    }
  }
  return tex(c)
})
/** 瓷环填料：一堆乱堆的白色小瓷环，看得见环口 */
export const packingTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(21)
  g.fillStyle = '#3d3b37'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 1500; i++) {
    const x = r() * S, y = r() * S, R = 9 + r() * 4, sq = 0.35 + r() * 0.65, a = r() * Math.PI, v = 205 + r() * 40
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      g.save(); g.translate(x + ox, y + oy); g.rotate(a); g.scale(1, sq)
      g.fillStyle = `rgb(${v},${v - 4},${v - 14})`; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill()
      g.fillStyle = 'rgba(40,36,30,0.85)'; g.beginPath(); g.arc(0, 0, R * 0.62, 0, 7); g.fill()
      g.restore()
    }
  }
  return tex(c)
})
/** 硫铁矿：深灰的碎矿，里面有黄铜色的闪光 */
export const oreTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(81)
  g.fillStyle = '#4a463c'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 900; i++) {
    const x = r() * S, y = r() * S, R = 4 + r() * 9, gold = r() < 0.35
    g.beginPath(); const k = 5 + Math.floor(r() * 3); for (let j = 0; j < k; j++) { const a = j / k * Math.PI * 2 + r() * 0.6, rr = R * (0.7 + r() * 0.4); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) } g.closePath()
    const v = r(); g.fillStyle = gold ? `rgb(${Math.round(170 + v * 50)},${Math.round(146 + v * 40)},${Math.round(70 + v * 30)})` : `rgb(${Math.round(60 + v * 40)},${Math.round(58 + v * 38)},${Math.round(50 + v * 34)})`; g.fill()
  }
  return tex(c)
})
/** 钢格栅板（平台的走道）：一道道扁钢 */
export const gratingTex = once(() => {
  const S = 128, { c, g } = canvas(S)
  g.fillStyle = '#1c1d1e'; g.fillRect(0, 0, S, S)
  g.fillStyle = '#8a8a80'; for (let x = 0; x < S; x += 8) g.fillRect(x, 0, 3, S)
  g.fillStyle = '#6a6a62'; for (let y = 0; y < S; y += 32) g.fillRect(0, y, S, 3)
  return tex(c)
})
/** 一块写字的牌子：底色、字色，lines 每行一句，第一行大 */
export function makeSign(lines: string[], bg: string, fg: string, w = 512, h = 160) {
  const { c, g } = canvas(w, h)
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
  const big = Math.round(h * (lines.length > 1 ? 0.36 : 0.5))
  g.font = `700 ${big}px ${FONT}`; g.fillText(lines[0], w / 2, lines.length > 1 ? h * 0.36 : h / 2, w - 16)
  if (lines[1]) { g.font = `500 ${Math.round(h * 0.18)}px ${FONT}`; g.fillText(lines[1], w / 2, h * 0.75, w - 16) }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
/** 安全标志：黄底黑字的警示牌 */
export function warnSign(text: string) {
  const W = 512, H = 200, { c, g } = canvas(W, H)
  g.fillStyle = '#f0c419'; g.fillRect(0, 0, W, H); g.fillStyle = '#1d1d1b'; g.fillRect(0, 0, W, 12); g.fillRect(0, H - 12, W, 12)
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 80px ${FONT}`; g.fillText(text, W / 2, H / 2 + 4, W - 30)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
/** 试剂瓶上的小标签：白底，一条色带，一行字 */
const labelCache = new Map<string, THREE.CanvasTexture>()
export function tagTex(text: string, band = '#2f6fb3') {
  const hit = labelCache.get(text + band); if (hit) return hit
  const W = 256, H = 128, { c, g } = canvas(W, H)
  g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H); g.fillStyle = band; g.fillRect(0, 0, W, 22)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${text.length > 4 ? 36 : 48}px ${FONT}`; g.fillText(text, W / 2, 76, W - 16)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  labelCache.set(text + band, t)
  return t
}
