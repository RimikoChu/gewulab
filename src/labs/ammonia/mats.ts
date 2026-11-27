// 程序画出来的贴图：厂区沥青、化验室地砖和台面、墙面、彩钢板、格栅板、保温层的铝皮、剖面的斜线、催化剂颗粒、牌子。不用下载素材。
import * as THREE from 'three'
import { rng } from './parts'

function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
export const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif'
/** 复制一张贴图并设重复次数 */
export const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c }
/** 在画布上撒噪点：n 个，颜色 a/b 各一半 */
function speck(g: CanvasRenderingContext2D, S: number, n: number, a: string, b: string, r: () => number, big = 1.5, alpha = [0.08, 0.16]) {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < 0.5 ? a : b},${alpha[0] + r() * alpha[1]})`; g.fillRect(r() * S, r() * S, 1 + r() * big, 1 + r() * big) }
}

/** 厂区的沥青和混凝土：深灰带斑驳 */
export const asphaltTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(13)
  g.fillStyle = '#4d4e4c'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 120; i++) { const x = r() * S, y = r() * S, R = 20 + r() * 70; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(40,38,36,0.35)' : 'rgba(110,106,98,0.25)'); q.addColorStop(1, 'rgba(70,70,70,0)'); for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.fillStyle = q; g.save(); g.translate(ox, oy); g.fillRect(x - R, y - R, R * 2, R * 2); g.restore() } }
  speck(g, S, 26000, '30,30,30', '140,138,132', r, 1.5, [0.1, 0.2])
  return tex(c)
})
/** 混凝土地坪：浅灰，按 6 m 一块分缝 */
export const slabTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(19)
  g.fillStyle = '#a9a69e'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 60; i++) { const x = r() * S, y = r() * S, R = 30 + r() * 80; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(90,86,80,0.18)' : 'rgba(200,198,190,0.18)'); q.addColorStop(1, 'rgba(160,160,160,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  speck(g, S, 16000, '90,88,84', '220,218,210', r)
  g.fillStyle = 'rgba(60,58,54,0.55)'; g.fillRect(0, 0, S, 3); g.fillRect(0, 0, 3, S)
  return tex(c)
})
/** 化验室和中控室的地面：浅灰的 60 cm 方砖 */
export const tileTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 200 + Math.floor(r() * 10); g.fillStyle = `rgb(${v - 4},${v},${v + 2})`; g.fillRect(i * 256, j * 256, 256, 256) }
  speck(g, S, 5000, '120,124,126', '250,252,252', r)
  g.fillStyle = '#8c9294'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, S); g.fillRect(0, k, S, 3) }
  return tex(c)
})
/** 化验台面：深灰的理化板，有细小的斑点 */
export const benchTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#2c2d2e'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 50; i++) { const x = r() * S, y = r() * S, R = 10 + r() * 40; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(20,20,20,0.25)' : 'rgba(80,80,80,0.16)'); q.addColorStop(1, 'rgba(50,50,50,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  speck(g, S, 5000, '16,16,16', '120,120,118', r, 0, [0.1, 0.12])
  return tex(c)
})
/** 室内墙面：浅色乳胶漆，墙脚一道踢脚 */
export const wallTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(47)
  g.fillStyle = '#e6e5df'; g.fillRect(0, 0, S, S)
  speck(g, S, 4000, '150,144,132', '255,255,250', r, 1, [0.04, 0.08])
  return tex(c)
})
/** 厂房外墙：浅灰的压型钢板，一道道竖肋，下面有雨水留下的污渍 */
export const cladTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(43)
  for (let x = 0; x < S; x++) { const k = (x % 32) / 32, v = k < 0.1 ? 0.78 : k < 0.18 ? 1.08 : 0.95; g.fillStyle = `rgb(${Math.round(200 * v)},${Math.round(204 * v)},${Math.round(204 * v)})`; g.fillRect(x, 0, 1, S) }
  for (let i = 0; i < 26; i++) { const x = r() * S, w = 4 + r() * 18; const q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, 'rgba(90,80,66,0.2)'); q.addColorStop(1, 'rgba(90,80,66,0)'); g.fillStyle = q; g.fillRect(x, 0, w, S * (0.3 + r() * 0.6)) }
  return tex(c)
})
/** 保温层外面包的铝皮：横向一道道搭接缝，竖向一条接缝 */
export const jacketTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(71)
  g.fillStyle = '#c9ccce'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '120,124,128'},${0.05 + r() * 0.08})`; g.fillRect(0, r() * S, S, 1) }
  g.fillStyle = 'rgba(80,84,88,0.7)'; g.fillRect(0, 0, S, 3); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, 3, S, 2)
  g.fillStyle = 'rgba(80,84,88,0.5)'; g.fillRect(0, 0, 2, S)
  return tex(c)
})
/** 剖面：浅灰底上 45° 的细斜线（机械制图里金属剖面的画法） */
export const hatchTex = once(() => {
  const S = 128, { c, g } = canvas(S)
  g.fillStyle = '#b9bdc0'; g.fillRect(0, 0, S, S)
  g.strokeStyle = 'rgba(70,74,78,0.55)'; g.lineWidth = 3
  for (let k = -S; k < S * 2; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke() }
  return tex(c)
})
/** 催化剂：一堆黑灰色、带金属光泽的不规则颗粒（熔铁催化剂） */
export const catalystTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(33)
  g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 2600; i++) {
    const x = r() * S, y = r() * S, R = 5 + r() * 9, v = 40 + r() * 50
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      g.beginPath(); const k = 5 + Math.floor(r() * 3); for (let j = 0; j < k; j++) { const a = j / k * Math.PI * 2 + r() * 0.6, rr = R * (0.7 + r() * 0.4); g.lineTo(x + ox + Math.cos(a) * rr, y + oy + Math.sin(a) * rr * 0.85) } g.closePath()
      g.fillStyle = `rgb(${v},${v + 2},${v + 6})`; g.fill()
      g.fillStyle = 'rgba(200,205,215,0.18)'; g.fillRect(x + ox - R * 0.4, y + oy - R * 0.5, R * 0.5, R * 0.25)
    }
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
/** 试剂瓶、设备上的小标签：白底，一条色带，一行字 */
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
/** 中控室操作台上的流程画面：深灰底，几台设备的方框和圆筒、彩色的管线和几个读数框 */
export const dcsTex = once(() => {
  const W = 512, H = 312, { c, g } = canvas(W, H), r = rng(91)
  g.fillStyle = '#20262b'; g.fillRect(0, 0, W, H); g.fillStyle = '#2f3940'; g.fillRect(0, 0, W, 22)
  g.lineWidth = 4
  for (const [col, y] of [['#5b8cff', 90], ['#35c7b3', 170], ['#ff9b4a', 240]] as const) { g.strokeStyle = col; g.beginPath(); g.moveTo(20, y); for (let x = 20; x < W - 20; x += 60) g.lineTo(x + 60, y + (r() < 0.3 ? 30 : 0)); g.stroke() }
  g.fillStyle = '#8e9aa3'; for (const x of [80, 200, 330, 430]) { g.fillRect(x - 18, 50, 36, 150 + r() * 40) }
  g.fillStyle = '#0d1114'; for (let i = 0; i < 8; i++) { const x = 30 + r() * (W - 100), y = 40 + r() * (H - 80); g.fillRect(x, y, 64, 22); g.fillStyle = '#7dffb0'; g.fillRect(x + 6, y + 8, 30 + r() * 20, 6); g.fillStyle = '#0d1114' }
  return tex(c)
})
