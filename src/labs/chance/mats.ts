// 程序画出来的贴图：车间的压型钢板墙、环氧地坪、标牌、骰子点、扑克牌面、硬币、白板和电子屏的底。不用下载素材。
import * as THREE from 'three'

export const prng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
export function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
export function tex(c: HTMLCanvasElement, srgb = true, wrap = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
export const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif'
export const NUM = 'Geist, "Helvetica Neue", Arial, sans-serif'

/** 压型钢板：竖向的波峰波谷，浅灰白的彩钢板，下面有一点灰 */
export const makeCladding = once(() => {
  const W = 256, H = 256, { c, g } = canvas(W, H), b = canvas(W, H), r = prng(5)
  for (let x = 0; x < W; x++) {
    const k = (x % 32) / 32, v = k < 0.18 ? 0.62 : k < 0.3 ? 0.9 : k < 0.7 ? 0.8 : k < 0.82 ? 0.98 : 0.72
    const s = Math.round(206 * v + 30)
    g.fillStyle = `rgb(${s},${s + 2},${s + 3})`; g.fillRect(x, 0, 1, H)
    const h = Math.round((k < 0.24 ? k / 0.24 : k < 0.76 ? 1 : (1 - k) / 0.24) * 255); b.g.fillStyle = `rgb(${h},${h},${h})`; b.g.fillRect(x, 0, 1, H)
  }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,124,126' : '255,255,255'},${0.04 + r() * 0.06})`; g.fillRect(r() * W, r() * H, 1, 2 + r() * 6) }
  return { map: tex(c), bump: tex(b.c, false) }
})

/** 环氧地坪：灰绿色，有细小的色点和一点磨痕 */
export const makeEpoxy = once(() => {
  const S = 512, { c, g } = canvas(S), r = prng(9)
  g.fillStyle = '#7f8c84'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, R = 30 + r() * 110, q = g.createRadialGradient(x, y, 0, x, y, R), d = r() < 0.5 ? '96,108,100' : '150,162,154'; q.addColorStop(0, `rgba(${d},0.16)`); q.addColorStop(1, `rgba(${d},0)`); g.fillStyle = q; g.fillRect(x - R, y - R, 2 * R, 2 * R) }
  for (let i = 0; i < 9000; i++) { const u = r(); g.fillStyle = u < 0.5 ? 'rgba(60,66,62,0.35)' : 'rgba(220,226,222,0.3)'; g.fillRect(r() * S, r() * S, 1.2, 1.2) }
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(40,44,42,${0.05 + r() * 0.08})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 200, y + (r() - 0.5) * 40); g.stroke() }
  return tex(c)
})

/** 培训桌的桌面：浅色三聚氰胺板，细微的颗粒 */
export const makeDesk = once(() => {
  const S = 256, { c, g } = canvas(S), r = prng(21)
  g.fillStyle = '#e9e6df'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '200,196,188' : '255,255,252'},${0.2 + r() * 0.3})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
})

/** 骰子盘、硬币盘里的绒布：深绿，绒毛的细碎明暗 */
export const makeFelt = once(() => {
  const S = 256, { c, g } = canvas(S), r = prng(33)
  g.fillStyle = '#1f5a45'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '10,40,30' : '60,120,96'},${0.25 + r() * 0.3})`; g.fillRect(r() * S, r() * S, 1, 1 + r() * 2) }
  return tex(c)
})

/** 木纹：摸球箱、托盘、转盘底座 */
export const makeWood = once(() => {
  const W = 256, H = 512, { c, g } = canvas(W, H), r = prng(41)
  g.fillStyle = '#d8b88a'; g.fillRect(0, 0, W, H)
  for (let x = 0; x < W; x += 1) { const v = Math.sin(x * 0.11 + Math.sin(x * 0.023) * 4) * 0.5 + 0.5; g.fillStyle = `rgba(120,80,40,${0.03 + v * 0.07})`; g.fillRect(x, 0, 1, H) }
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(100,64,32,${0.05 + r() * 0.09})`; g.lineWidth = 0.6 + r() * 1.2; const x = r() * W; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= H; y += 16) g.lineTo(x + Math.sin(y * 0.02 + i) * 6, y); g.stroke() }
  return tex(c)
})

/** 一块标牌：底色、字色、几行字 */
export function makeSign(lines: string[], bg: string, fg: string, w = 1024, h = 256) {
  const { c, g } = canvas(w, h)
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
  const fs = Math.min(h * 0.62 / lines.length, w * 0.9 / Math.max(...lines.map(l => l.length)))
  g.font = `700 ${fs}px ${FONT}`
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.3))
  return tex(c, true, false)
}

/** 墙上的海报：标题加几条 */
export function makeBoard(title: string, items: string[], color = '#2a6f9e') {
  const W = 512, H = 720, { c, g } = canvas(W, H)
  g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H)
  g.fillStyle = color; g.fillRect(0, 0, W, 120)
  g.fillStyle = '#fff'; g.font = `700 52px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, W / 2, 62)
  g.fillStyle = '#2f3336'; g.font = `500 34px ${FONT}`; g.textAlign = 'left'
  items.forEach((t, i) => { g.fillStyle = color; g.fillRect(40, 186 + i * 96, 12, 12); g.fillStyle = '#2f3336'; g.fillText(t, 70, 192 + i * 96) })
  return tex(c, true, false)
}

/** 扑克牌面：黑桃，角上点数和小黑桃，中间一个大黑桃（J、Q、K 写字母加一圈框） */
const spade = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  g.beginPath(); g.moveTo(x, y - s)
  g.bezierCurveTo(x + s * 0.2, y - s * 0.55, x + s * 1.05, y - s * 0.25, x + s * 0.72, y + s * 0.35)
  g.bezierCurveTo(x + s * 0.5, y + s * 0.72, x + s * 0.12, y + s * 0.6, x + s * 0.06, y + s * 0.35)
  g.lineTo(x + s * 0.28, y + s * 0.95); g.lineTo(x - s * 0.28, y + s * 0.95); g.lineTo(x - s * 0.06, y + s * 0.35)
  g.bezierCurveTo(x - s * 0.12, y + s * 0.6, x - s * 0.5, y + s * 0.72, x - s * 0.72, y + s * 0.35)
  g.bezierCurveTo(x - s * 1.05, y - s * 0.25, x - s * 0.2, y - s * 0.55, x, y - s); g.fill()
}
const cardCache = new Map<string, THREE.Texture>()
export function makeCardFace(rank: string) {
  const hit = cardCache.get(rank); if (hit) return hit
  const W = 252, H = 352, { c, g } = canvas(W, H)
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#16181b'; g.font = `700 46px ${NUM}`; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(rank, 32, 38); spade(g, 32, 82, 14)
  g.save(); g.translate(W, H); g.rotate(Math.PI); g.fillText(rank, 32, 38); spade(g, 32, 82, 14); g.restore()
  if (['J', 'Q', 'K'].includes(rank)) {
    g.strokeStyle = '#a8862c'; g.lineWidth = 4; g.strokeRect(62, 70, W - 124, H - 140)
    g.fillStyle = '#b3261e'; g.font = `700 110px ${NUM}`; g.fillText(rank, W / 2, H / 2 - 6)
    g.fillStyle = '#16181b'; spade(g, W / 2, H / 2 + 86, 16)
  } else spade(g, W / 2, H / 2 - 10, rank === 'A' ? 52 : 38)
  const t = tex(c, true, false); cardCache.set(rank, t); return t
}
/** 扑克牌背：深蓝底、白边、斜格纹 */
export const makeCardBack = once(() => {
  const W = 252, H = 352, { c, g } = canvas(W, H)
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#1f3f7a'; g.fillRect(14, 14, W - 28, H - 28)
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2
  for (let k = -H; k < W + H; k += 16) { g.beginPath(); g.moveTo(k, 14); g.lineTo(k + H, H); g.stroke(); g.beginPath(); g.moveTo(k + H, 14); g.lineTo(k, H); g.stroke() }
  g.strokeStyle = '#fbfaf6'; g.lineWidth = 3; g.strokeRect(24, 24, W - 48, H - 48)
  return tex(c, true, false)
})

/** 硬币两面：正面大写“1”，反面一朵花 */
export const makeCoin = once(() => {
  const mk = (heads: boolean) => {
    const S = 256, { c, g } = canvas(S)
    g.fillStyle = '#c9ccce'; g.fillRect(0, 0, S, S)
    g.strokeStyle = 'rgba(90,94,98,0.7)'; g.lineWidth = 5; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke()
    g.fillStyle = '#7d8286'
    if (heads) { g.font = `700 140px ${NUM}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1', 128, 128) }
    else for (let i = 0; i < 8; i++) { g.save(); g.translate(128, 128); g.rotate(i * Math.PI / 4); g.beginPath(); g.ellipse(0, -44, 16, 40, 0, 0, 7); g.fill(); g.restore() }
    if (!heads) { g.fillStyle = '#5d6266'; g.beginPath(); g.arc(128, 128, 18, 0, 7); g.fill() }
    return tex(c, true, false)
  }
  return { heads: mk(true), tails: mk(false) }
})

/** 投针用的纸：白纸上等距的平行线（间距 6 cm），纸宽 54 cm、高 36 cm */
export const makeLinedPaper = once(() => {
  const W = 1080, H = 720, { c, g } = canvas(W, H)
  g.fillStyle = '#f7f5ee'; g.fillRect(0, 0, W, H)
  g.strokeStyle = '#2a5ea8'; g.lineWidth = 4
  for (let k = 0; k <= 6; k++) { const y = Math.min(H - 2, Math.max(2, k * 120)); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke() }
  return tex(c, true, false)
})

/** 瓷碗外壁的青花：一圈缠枝的蓝线（画在一张横条上，绕碗一周） */
export const makeBlueWhite = once(() => {
  const W = 1024, H = 128, { c, g } = canvas(W, H)
  g.fillStyle = '#f6f6f1'; g.fillRect(0, 0, W, H)
  g.strokeStyle = '#2b4f9a'; g.lineWidth = 4
  g.beginPath(); for (let x = 0; x <= W; x += 4) g.lineTo(x, 64 + Math.sin(x / W * Math.PI * 16) * 22); g.stroke()
  g.fillStyle = '#2b4f9a'
  for (let i = 0; i < 16; i++) { const x = (i + 0.25) / 16 * W; g.beginPath(); g.ellipse(x, 40, 10, 6, 0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 32, 90, 10, 6, -0.5, 0, 7); g.fill() }
  g.fillRect(0, 8, W, 5); g.fillRect(0, 114, W, 4)
  return tex(c)
})
