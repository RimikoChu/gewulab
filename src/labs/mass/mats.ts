// 程序画出来的贴图：化验室的地砖、台面和墙裙，厂房的压型钢板和环氧地坪，厂区的碎石和草地，远处楼房的立面，
// 各种牌子、试剂瓶标签、储罐标识、中控室屏幕。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
export const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif'

/** 地砖：浅灰的 60 cm 方砖，砖缝深一点 */
export const tileTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 198 + Math.floor(r() * 14); g.fillStyle = `rgb(${v - 5},${v - 1},${v + 1})`; g.fillRect(i * 256, j * 256, 256, 256) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,124,126' : '250,252,252'},${0.05 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  g.fillStyle = '#868c8f'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, S); g.fillRect(0, k, S, 3) }
  return tex(c)
})
/** 墙裙：白色 10 cm 小方瓷砖，灰白勾缝，釉面带一点明暗 */
export const wallTileTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(13)
  g.fillStyle = '#c3c7c4'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 232 + Math.floor(r() * 12); const q = g.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64); q.addColorStop(0, `rgb(${v},${v + 1},${v})`); q.addColorStop(1, `rgb(${v - 9},${v - 8},${v - 9})`); g.fillStyle = q; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60) }
  return tex(c)
})
/** 化验台面：深灰的理化板，细小的斑点 */
export const benchTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#4c5559'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 50; i++) { const x = r() * S, y = r() * S, R = 10 + r() * 40; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(40,46,50,0.22)' : 'rgba(120,130,134,0.2)'); q.addColorStop(1, 'rgba(90,100,104,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '30,34,38' : '150,158,162'},${0.12 + r() * 0.15})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
})
/** 车间的环氧地坪：灰绿，带斑驳 */
export const epoxyTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(19)
  g.fillStyle = '#7f9590'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 120; i++) { const x = r() * S, y = r() * S, R = 20 + r() * 70; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(100,118,112,0.35)' : 'rgba(160,176,170,0.3)'); q.addColorStop(1, 'rgba(140,160,150,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '80,90,86' : '220,228,222'},${0.06 + r() * 0.08})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
})
/** 厂区的碎石地：灰白的石子，偶尔一块深色 */
export const gravelTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(29)
  g.fillStyle = '#a29d92'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 9000; i++) { const x = r() * S, y = r() * S, rr = 1 + r() * 3.2, v = 120 + Math.floor(r() * 110); g.fillStyle = `rgba(${v},${v - 4},${v - 10},${0.5 + r() * 0.4})`; g.beginPath(); g.ellipse(x, y, rr * 1.3, rr, r() * 3, 0, 7); g.fill() }
  for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, R = 20 + r() * 60; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(240,238,230,0.22)'); q.addColorStop(1, 'rgba(240,238,230,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  return tex(c)
})
/** 草地 */
export const grassTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(3)
  g.fillStyle = '#5f7a3e'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 160; i++) { const x = r() * S, y = r() * S, R = 20 + r() * 60; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(70,96,40,0.5)' : 'rgba(120,140,70,0.4)'); q.addColorStop(1, 'rgba(90,120,60,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 30000; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(48,72,28,0.5)' : v < 0.85 ? 'rgba(120,150,70,0.45)' : 'rgba(170,170,100,0.4)'; g.fillRect(r() * S, r() * S, 1, 2 + r() * 3) }
  return tex(c)
})
/** 远处楼房的立面：浅灰的墙，一格格深色的窗 */
export const facadeTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(71)
  g.fillStyle = '#a3a6a2'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const k = r(); g.fillStyle = k < 0.06 ? '#c9c2a4' : k < 0.5 ? '#3e4852' : '#4d5862'; g.fillRect(i * 32 + 5, j * 32 + 7, 22, 18) }
  for (let j = 0; j < 8; j++) { g.fillStyle = 'rgba(120,122,118,0.5)'; g.fillRect(0, j * 32 + 28, S, 2) }
  return tex(c)
})
/** 压型钢板：一道道梯形的肋，base 是漆色 */
const ribCache = new Map<string, THREE.CanvasTexture>()
export function ribTex(base: [number, number, number]) {
  const key = base.join(), hit = ribCache.get(key); if (hit) return hit
  const S = 256, { c, g } = canvas(S)
  for (let x = 0; x < S; x++) { const k = (x % 32) / 32, v = k < 0.1 ? 0.72 : k < 0.18 ? 1.12 : k < 0.6 ? 0.98 : 0.92; g.fillStyle = `rgb(${Math.round(base[0] * v)},${Math.round(base[1] * v)},${Math.round(base[2] * v)})`; g.fillRect(x, 0, 1, S) }
  const r = rng(61); for (let i = 0; i < 12; i++) { const x = r() * S, w = 4 + r() * 14; const q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, 'rgba(70,66,60,0.12)'); q.addColorStop(1, 'rgba(70,66,60,0)'); g.fillStyle = q; g.fillRect(x, 0, w, S * (0.3 + r() * 0.5)) }
  const t = tex(c); ribCache.set(key, t)
  return t
}
/** 耐火砖砌的窑身：一层层错缝的砖，颜色深浅不一，砖缝灰白 */
export const brickTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(41)
  g.fillStyle = '#c9c1b2'; g.fillRect(0, 0, S, S)
  for (let row = 0; row < 16; row++) for (let k = -1; k < 8; k++) {
    const x = k * 64 + (row % 2) * 32, y = row * 32, v = r()
    g.fillStyle = v < 0.3 ? '#b4a98f' : v < 0.7 ? '#c2b8a0' : '#a89c84'; g.fillRect(x + 2, y + 2, 60, 28)
  }
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,80,64' : '230,226,214'},${0.08 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1) }
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
/** 试剂瓶的标签：白底，一条色带，一行字 */
const labelCache = new Map<string, THREE.CanvasTexture>()
export function bottleLabel(text: string, band = '#2f6fb3') {
  const hit = labelCache.get(text + band); if (hit) return hit
  const W = 256, H = 160, { c, g } = canvas(W, H)
  g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H); g.fillStyle = band; g.fillRect(0, 0, W, 26); g.fillRect(0, H - 14, W, 14)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${text.length > 4 ? 38 : 50}px ${FONT}`; g.fillText(text, W / 2, 86, W - 16)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  labelCache.set(text + band, t)
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
/** 储罐、设备上的标识：白底，名字、化学式，一道黄黑警示条 */
export function tankLabel(name: string, formula: string) {
  const W = 512, H = 256, { c, g } = canvas(W, H)
  g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `700 70px ${FONT}`; g.fillText(name, W / 2, 88, W - 30)
  g.font = `600 48px ${FONT}`; g.fillText(formula, W / 2, 166)
  g.fillStyle = '#e3b21c'; g.fillRect(0, H - 36, W, 36); g.fillStyle = '#1d1d1b'; for (let x = -36; x < W; x += 36) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 18, H); g.lineTo(x + 36, H - 36); g.lineTo(x + 18, H - 36); g.fill() }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
/** 中控室的大屏：深蓝底，一张简化的工艺流程图（方框、管线、几个绿色的数） */
export const screenTex = once(() => {
  const W = 1024, H = 512, { c, g } = canvas(W, H), r = rng(51)
  g.fillStyle = '#0d1c2c'; g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(120,170,210,0.18)'; g.lineWidth = 1; for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke() } for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke() }
  g.fillStyle = '#16324a'; g.fillRect(0, 0, W, 48); g.fillStyle = '#cfe3f2'; g.font = `600 26px ${FONT}`; g.textBaseline = 'middle'; g.fillText('石灰窑 — 碳化 工艺总貌', 24, 25)
  const box = (x: number, y: number, w: number, h: number, t: string) => { g.strokeStyle = '#7fb6dd'; g.lineWidth = 3; g.strokeRect(x, y, w, h); g.fillStyle = '#cfe3f2'; g.font = `500 22px ${FONT}`; g.textAlign = 'center'; g.fillText(t, x + w / 2, y + h / 2); g.textAlign = 'left' }
  box(80, 140, 150, 220, '石灰窑'); box(380, 120, 130, 120, '洗涤塔'); box(380, 300, 130, 110, '化灰机'); box(660, 110, 140, 280, '碳化塔'); box(880, 200, 110, 120, '过滤')
  g.strokeStyle = '#3fd27f'; g.lineWidth = 4; for (const [a, b, d, e] of [[230, 180, 380, 180], [510, 180, 660, 180], [230, 330, 380, 350], [800, 260, 880, 260]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(d, e); g.stroke() }
  g.fillStyle = '#3fd27f'; g.font = '600 24px ui-monospace, Menlo, monospace'
  for (let i = 0; i < 9; i++) g.fillText(`${(20 + r() * 80).toFixed(1)}`, 60 + (i % 5) * 190, 430 + Math.floor(i / 5) * 34)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
})
/** 操作台上的小屏：几条趋势曲线 */
export const trendTex = once(() => {
  const W = 512, H = 288, { c, g } = canvas(W, H), r = rng(57)
  g.fillStyle = '#0c1a26'; g.fillRect(0, 0, W, H)
  for (const [col, base] of [['#3fd27f', 90], ['#f2c14e', 160], ['#6fb6ff', 220]] as [string, number][]) {
    g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); let y = base
    for (let x = 0; x <= W; x += 8) { y += (r() - 0.5) * 10; y = Math.max(base - 30, Math.min(base + 30, y)); g.lineTo(x, y) }
    g.stroke()
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
})
