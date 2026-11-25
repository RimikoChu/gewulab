// 程序画出来的贴图：化验室的地砖和台面、厂房外墙和彩钢板、格栅板、原料堆、锈、挂图、牌子和标签。不用下载素材。
import * as THREE from 'three'
import { rng } from './parts'

function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
export const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif'
/** 复制一张贴图并设重复次数 */
export const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c }

/** 化验室的地砖：浅灰的 60 cm 方砖 */
export const tileTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 196 + Math.floor(r() * 12); g.fillStyle = `rgb(${v - 4},${v},${v + 2})`; g.fillRect(i * 256, j * 256, 256, 256) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,124,126' : '250,252,252'},${0.06 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  g.fillStyle = '#8c9294'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, S); g.fillRect(0, k, S, 3) }
  return tex(c)
})

/** 化验台面：深灰的理化板，有细小的斑点 */
export const benchTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#2b2c2d'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 50; i++) { const x = r() * S, y = r() * S, R = 10 + r() * 40; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(20,20,20,0.25)' : 'rgba(80,80,80,0.16)'); q.addColorStop(1, 'rgba(50,50,50,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '16,16,16' : '120,120,118'},${0.1 + r() * 0.12})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
})

/** 厂区的沥青和混凝土：深灰带斑驳 */
export const asphaltTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(13)
  g.fillStyle = '#4b4c4b'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 120; i++) { const x = r() * S, y = r() * S, R = 20 + r() * 70; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(40,38,36,0.35)' : 'rgba(110,106,98,0.25)'); q.addColorStop(1, 'rgba(70,70,70,0)'); for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.fillStyle = q; g.save(); g.translate(ox, oy); g.fillRect(x - R, y - R, R * 2, R * 2); g.restore() } }
  for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '30,30,30' : '140,138,132'},${0.1 + r() * 0.2})`; g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5) }
  return tex(c)
})

/** 厂房的外墙：浅灰的压型钢板，一道道竖肋，下面有雨水留下的污渍 */
export const cladTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(43)
  for (let x = 0; x < S; x++) { const k = (x % 32) / 32, v = k < 0.1 ? 0.78 : k < 0.18 ? 1.08 : 0.95; g.fillStyle = `rgb(${Math.round(196 * v)},${Math.round(200 * v)},${Math.round(200 * v)})`; g.fillRect(x, 0, 1, S) }
  for (let i = 0; i < 26; i++) { const x = r() * S, w = 4 + r() * 18; const q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, 'rgba(90,80,66,0.22)'); q.addColorStop(1, 'rgba(90,80,66,0)'); g.fillStyle = q; g.fillRect(x, 0, w, S * (0.3 + r() * 0.6)) }
  const q = g.createLinearGradient(0, S, 0, S * 0.7); q.addColorStop(0, 'rgba(70,60,50,0.35)'); q.addColorStop(1, 'rgba(70,60,50,0)'); g.fillStyle = q; g.fillRect(0, S * 0.7, S, S * 0.3)
  return tex(c)
})
/** 彩钢屋面：灰蓝的压型钢板 */
export const roofTex = once(() => {
  const S = 256, { c, g } = canvas(S)
  for (let x = 0; x < S; x++) { const k = (x % 32) / 32, v = k < 0.12 ? 0.7 : k < 0.2 ? 1.15 : 0.95; g.fillStyle = `rgb(${Math.round(70 * v)},${Math.round(92 * v)},${Math.round(110 * v)})`; g.fillRect(x, 0, 1, S) }
  return tex(c)
})
/** 化验楼的外墙：浅色的真石漆墙面，按 1.2 m 一块分格 */
export const wallTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(47)
  g.fillStyle = '#e1ddd2'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '150,144,132' : '250,248,240'},${0.08 + r() * 0.12})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  g.fillStyle = 'rgba(120,114,102,0.5)'; for (const k of [0, 256]) { g.fillRect(k, 0, 2, S); g.fillRect(0, k, S, 2) }
  return tex(c)
})
/** 钢格栅板（平台的走道）：一道道扁钢 */
export const gratingTex = once(() => {
  const S = 128, { c, g } = canvas(S)
  g.fillStyle = '#1c1d1e'; g.fillRect(0, 0, S, S)
  g.fillStyle = '#7b7a72'; for (let x = 0; x < S; x += 8) g.fillRect(x, 0, 3, S)
  g.fillStyle = '#5f5e58'; for (let y = 0; y < S; y += 32) g.fillRect(0, y, S, 3)
  return tex(c)
})
/** 耐火砖墙：暗红褐色的砖，砖缝浅 */
export const brickTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(29)
  g.fillStyle = '#9a948a'; g.fillRect(0, 0, S, S)
  for (let row = 0; row < 16; row++) for (let i = -1; i < 5; i++) {
    const x = i * 128 + (row % 2) * 64, y = row * 32, v = r()
    g.fillStyle = `rgb(${110 + v * 40},${66 + v * 22},${48 + v * 16})`; g.fillRect(x + 2, y + 2, 124, 28)
  }
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,26,20' : '200,170,150'},${0.1 + r() * 0.15})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1) }
  return tex(c)
})
/** 原料堆：base 是底色，a、b 是颗粒的两种颜色，size 颗粒大小（像素） */
const pileCache = new Map<string, THREE.CanvasTexture>()
export function pileTex(base: string, a: string, b: string, size: number, seed = 7) {
  const key = `${base}${a}${b}${size}`, hit = pileCache.get(key); if (hit) return hit
  const S = 256, { c, g } = canvas(S), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  const n = Math.round(S * S / (size * size) * 1.3)
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, R = size * (0.35 + r() * 0.5)
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.fillStyle = r() < 0.5 ? a : b; g.beginPath(); g.ellipse(x + ox, y + oy, R * 1.2, R, r() * 3, 0, 7); g.fill() }
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(x - R * 0.3, y - R * 0.3, R * 0.4, R * 0.3, 0, 0, 7); g.fill()
  }
  const t = tex(c); pileCache.set(key, t)
  return t
}
/** 铁锈：红褐色的斑块，边缘不规则。用作铁钉表面的颜色贴图，k 是锈了多少（只在 0–1 里取几档） */
export const rustTex = once(() => {
  const W = 256, H = 64, { c, g } = canvas(W, H), r = rng(61)
  g.fillStyle = '#8a8d90'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 420; i++) { const x = r() * W, y = r() * H, R = 2 + r() * 9; const q = g.createRadialGradient(x, y, 0, x, y, R); const col = r() < 0.5 ? '128,58,22' : r() < 0.6 ? '158,82,34' : '92,42,18'; q.addColorStop(0, `rgba(${col},0.95)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
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
/** 规程牌：白底，一个标题、几条规矩 */
export function makeBoard(title: string, rules: string[], band = '#2a6f9e') {
  const W = 384, H = 512, { c, g } = canvas(W, H)
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, W, H); g.fillStyle = band; g.fillRect(0, 0, W, 86)
  g.fillStyle = '#fff'; g.font = `700 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, W / 2, 44)
  g.fillStyle = '#2a2b2d'; g.textAlign = 'left'; g.font = `500 25px ${FONT}`
  rules.forEach((s, i) => { g.fillText(`${i + 1}. ${s}`, 24, 130 + i * 58, W - 40) })
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
/** 试剂瓶、试管的标签：白底，一条色带，一行字 */
const labelCache = new Map<string, THREE.CanvasTexture>()
export function bottleLabel(text: string, band = '#2f6fb3') {
  const hit = labelCache.get(text + band); if (hit) return hit
  const W = 256, H = 160, { c, g } = canvas(W, H)
  g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H); g.fillStyle = band; g.fillRect(0, 0, W, 26); g.fillRect(0, H - 14, W, 14)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${text.length > 4 ? 40 : 52}px ${FONT}`; g.fillText(text, W / 2, 86, W - 16)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  labelCache.set(text + band, t)
  return t
}
/** 金属样块上的小铭牌：元素符号和名称 */
const tagCache = new Map<string, THREE.CanvasTexture>()
export function symTag(sym: string, name: string) {
  const hit = tagCache.get(sym); if (hit) return hit
  const W = 256, H = 128, { c, g } = canvas(W, H)
  g.fillStyle = '#f3f1ea'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `700 64px Georgia, "Times New Roman", serif`; g.fillText(sym, W * 0.34, H / 2 + 2)
  g.font = `600 48px ${FONT}`; g.fillText(name, W * 0.74, H / 2 + 2)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  tagCache.set(sym, t)
  return t
}

/** 金属活动性顺序挂图：一行 15 格，filled 里的格子写上符号和名称，其余是空格；H 那一格单独标出来 */
export function orderChart(order: readonly string[], names: Record<string, string>, filled: Set<string>) {
  const W = 2048, H = 720, { c, g } = canvas(W, H)
  g.fillStyle = '#f5f3ec'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#2b5f86'; g.fillRect(0, 0, W, 96)
  g.fillStyle = '#fff'; g.font = `700 58px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('金属活动性顺序', W / 2, 50)
  const n = order.length, x0 = 60, bw = (W - 120) / n, y0 = 160, bh = 380
  order.forEach((s, i) => {
    const x = x0 + i * bw, on = filled.has(s), isH = s === 'H'
    g.fillStyle = isH ? '#e9eef2' : on ? '#ffffff' : '#ebe8df'; g.fillRect(x + 6, y0, bw - 12, bh)
    g.strokeStyle = isH ? '#2b5f86' : '#9a968a'; g.lineWidth = isH ? 5 : 3; g.strokeRect(x + 6, y0, bw - 12, bh)
    if (on || isH) {
      g.fillStyle = '#1e1f21'; g.font = `700 84px Georgia, "Times New Roman", serif`; g.fillText(s, x + bw / 2, y0 + 130)
      g.font = `600 62px ${FONT}`; g.fillStyle = '#3a3b3d'; g.fillText(names[s], x + bw / 2, y0 + 270)
    }
  })
  // 底下一条箭头：越往左越活泼
  g.strokeStyle = '#2b5f86'; g.lineWidth = 8; g.beginPath(); g.moveTo(W - 90, 610); g.lineTo(90, 610); g.stroke()
  g.fillStyle = '#2b5f86'; g.beginPath(); g.moveTo(60, 610); g.lineTo(110, 585); g.lineTo(110, 635); g.fill()
  g.font = `600 44px ${FONT}`; g.fillText('金属活动性由强逐渐减弱', W / 2, 678)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
/** 安全标志：黄底黑字的警示牌 */
export function warnSign(text: string) {
  const W = 512, H = 256, { c, g } = canvas(W, H)
  g.fillStyle = '#f0c419'; g.fillRect(0, 0, W, H); g.fillStyle = '#1d1d1b'; g.fillRect(0, 0, W, 14); g.fillRect(0, H - 14, W, 14)
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 92px ${FONT}`; g.fillText(text, W / 2, H / 2 + 4, W - 30)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

/** 石棉网（陶土网）的铁丝网：灰色的细铁丝方格，透明底；中间的陶土圆另画 */
export const gauzeTex = once(() => {
  const S = 256, { c, g } = canvas(S)
  g.clearRect(0, 0, S, S); g.strokeStyle = 'rgba(70,72,74,0.95)'; g.lineWidth = 2
  for (let k = 0; k <= S; k += 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, S); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(S, k); g.stroke() }
  g.lineWidth = 6; g.strokeStyle = 'rgba(55,56,58,1)'; g.strokeRect(3, 3, S - 6, S - 6)
  return tex(c)
})
