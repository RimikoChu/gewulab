// 程序画出来的贴图：化验室的地砖、墙裙和台面，厂区的草地、压型钢板、池壁剖面，各种牌子和标签，
// 滴定管的刻度、仪器屏幕上的曲线。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const clampT = <T extends THREE.Texture>(t: T) => { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
export const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif'

/** 地砖：浅灰的 60 cm 方砖 */
export const tileTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 198 + Math.floor(r() * 12); g.fillStyle = `rgb(${v - 4},${v},${v + 2})`; g.fillRect(i * 256, j * 256, 256, 256) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,124,126' : '250,252,252'},${0.06 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  g.fillStyle = '#8c9294'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, S); g.fillRect(0, k, S, 3) }
  return tex(c)
})
/** 墙裙：白色的 10 cm 小方瓷砖 */
export const wallTileTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(13)
  g.fillStyle = '#c9ccc8'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 234 + Math.floor(r() * 10); const q = g.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64); q.addColorStop(0, `rgb(${v},${v + 1},${v})`); q.addColorStop(1, `rgb(${v - 8},${v - 7},${v - 8})`); g.fillStyle = q; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60) }
  return tex(c)
})
/** 化验台面：深灰的理化板，有细小的斑点 */
export const benchTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#4a5457'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 50; i++) { const x = r() * S, y = r() * S, R = 10 + r() * 40; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(40,46,50,0.22)' : 'rgba(120,130,134,0.2)'); q.addColorStop(1, 'rgba(90,100,104,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '30,34,38' : '150,158,162'},${0.12 + r() * 0.15})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
})
/** 草地 */
export const grassTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(3)
  g.fillStyle = '#5f7c3c'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 160; i++) { const x = r() * S, y = r() * S, R = 20 + r() * 60; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(70,96,40,0.5)' : 'rgba(120,140,70,0.4)'); q.addColorStop(1, 'rgba(90,120,60,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 30000; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(48,72,28,0.5)' : v < 0.85 ? 'rgba(120,150,70,0.45)' : 'rgba(170,170,100,0.4)'; g.fillRect(r() * S, r() * S, 1, 2 + r() * 3) }
  return tex(c)
})
/** 远处楼房和厂房的立面：浅灰的墙，一格格深色的窗 */
export const facadeTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(71)
  g.fillStyle = '#a7a9a4'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const k = r(); g.fillStyle = k < 0.06 ? '#c9c2a4' : k < 0.5 ? '#3e4852' : '#4d5862'; g.fillRect(i * 32 + 5, j * 32 + 7, 22, 18) }
  for (let j = 0; j < 8; j++) { g.fillStyle = 'rgba(120,122,118,0.5)'; g.fillRect(0, j * 32 + 28, S, 2) }
  return tex(c)
})
/** 压型钢板（加药间的墙和屋面）：一道道梯形的肋 */
const ribCache = new Map<string, THREE.CanvasTexture>()
export function ribTex(base: [number, number, number]) {
  const key = base.join(), hit = ribCache.get(key); if (hit) return hit
  const S = 256, { c, g } = canvas(S)
  for (let x = 0; x < S; x++) { const k = (x % 32) / 32, v = k < 0.1 ? 0.72 : k < 0.18 ? 1.12 : k < 0.6 ? 0.98 : 0.92; g.fillStyle = `rgb(${Math.round(base[0] * v)},${Math.round(base[1] * v)},${Math.round(base[2] * v)})`; g.fillRect(x, 0, 1, S) }
  const r = rng(61); for (let i = 0; i < 12; i++) { const x = r() * S, w = 4 + r() * 14; const q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, 'rgba(70,66,60,0.14)'); q.addColorStop(1, 'rgba(70,66,60,0)'); g.fillStyle = q; g.fillRect(x, 0, w, S * (0.3 + r() * 0.5)) }
  const t = tex(c); ribCache.set(key, t)
  return t
}
/** 混凝土池壁的外面：浅灰，带模板的横缝和一点水渍 */
export const wallTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(29)
  g.fillStyle = '#b9b7ae'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, R = 20 + r() * 60; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(120,118,108,0.25)' : 'rgba(210,208,198,0.22)'); q.addColorStop(1, 'rgba(160,160,150,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let y = 0; y < S; y += 128) { g.fillStyle = 'rgba(90,88,80,0.35)'; g.fillRect(0, y, S, 2) }
  for (let x = 0; x < S; x += 256) for (let y = 64; y < S; y += 128) { g.fillStyle = 'rgba(80,78,72,0.4)'; g.beginPath(); g.arc(x + 128, y, 3, 0, 7); g.fill() }
  for (let i = 0; i < 8000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,90,84' : '230,230,222'},${0.06 + r() * 0.08})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
})
/** 剖开的池壁：混凝土剖面的灰底加 45° 斜线 */
export const cutTex = once(() => {
  const S = 128, { c, g } = canvas(S)
  g.fillStyle = '#a9a69d'; g.fillRect(0, 0, S, S)
  g.strokeStyle = 'rgba(60,58,54,0.45)'; g.lineWidth = 2.5
  for (let k = -S; k < S * 2; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke() }
  const r = rng(31); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,58,54' : '200,198,190'},0.4)`; g.fillRect(r() * S, r() * S, 2, 2) }
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
  return clampT(tex(c))
}
/** 规程牌：白底，一个标题、几条规矩 */
export function makeBoard(title: string, rules: string[], band = '#2a6f9e') {
  const W = 384, H = 512, { c, g } = canvas(W, H)
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, W, H); g.fillStyle = band; g.fillRect(0, 0, W, 86)
  g.fillStyle = '#fff'; g.font = `700 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, W / 2, 44)
  g.fillStyle = '#2a2b2d'; g.textAlign = 'left'; g.font = `500 25px ${FONT}`
  rules.forEach((s, i) => { g.fillText(`${i + 1}. ${s}`, 24, 130 + i * 58, W - 40) })
  return clampT(tex(c))
}
/** 流程牌：一排方框和箭头 */
export function flowBoard(steps: string[], band = '#2a6f9e') {
  const W = 1024, H = 256, { c, g } = canvas(W, H)
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, W, H); g.fillStyle = band; g.fillRect(0, 0, W, 54)
  g.fillStyle = '#fff'; g.font = `700 32px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('污水处理工艺流程', W / 2, 28)
  const w = (W - 40) / steps.length
  steps.forEach((s, i) => {
    const x = 20 + i * w
    g.fillStyle = i === 2 ? '#2f8f6b' : '#dfe6ea'; g.fillRect(x + 8, 96, w - 40, 90)
    g.fillStyle = i === 2 ? '#fff' : '#22313a'; g.font = `700 28px ${FONT}`; g.fillText(s, x + 8 + (w - 40) / 2, 141, w - 48)
    if (i < steps.length - 1) { g.fillStyle = '#6a7a84'; g.beginPath(); g.moveTo(x + w - 28, 128); g.lineTo(x + w - 10, 141); g.lineTo(x + w - 28, 154); g.fill() }
  })
  return clampT(tex(c))
}
/** 试剂瓶的标签：白底，一条色带，一行字（可带第二行小字） */
const labelCache = new Map<string, THREE.CanvasTexture>()
export function bottleLabel(text: string, band = '#2f6fb3', sub = '') {
  const k = text + band + sub, hit = labelCache.get(k); if (hit) return hit
  const W = 256, H = 160, { c, g } = canvas(W, H)
  g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H); g.fillStyle = band; g.fillRect(0, 0, W, 24); g.fillRect(0, H - 12, W, 12)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${text.length > 4 ? 36 : 46}px ${FONT}`; g.fillText(text, W / 2, sub ? 72 : 84, W - 16)
  if (sub) { g.font = `600 26px ${FONT}`; g.fillStyle = '#4a4c50'; g.fillText(sub, W / 2, 118, W - 16) }
  const t = clampT(tex(c)); labelCache.set(k, t)
  return t
}
/** 储罐上的标识：白底，罐名、化学式，一道黄黑警示条 */
export function tankLabel(name: string, formula: string) {
  const W = 512, H = 256, { c, g } = canvas(W, H)
  g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `700 70px ${FONT}`; g.fillText(name, W / 2, 88, W - 30)
  g.font = `600 48px ${FONT}`; g.fillText(formula, W / 2, 166)
  g.fillStyle = '#e3b21c'; g.fillRect(0, H - 36, W, 36); g.fillStyle = '#1d1d1b'; for (let x = -36; x < W; x += 36) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 18, H); g.lineTo(x + 36, H - 36); g.lineTo(x + 18, H - 36); g.fill() }
  return clampT(tex(c))
}

/** 滴定管的刻度：从上往下 0 到 25 mL，每 0.1 mL 一短线，每 0.5 mL 中线，每 1 mL 长线和一个数。贴在管子正面的一条窄带上 */
export const buretteTex = once(() => {
  const W = 128, H = 4096, CAP = 25, { c, g } = canvas(W, H)
  const per = H / (CAP + 2), y0 = per                 // 0 刻度在上面留一格的位置
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, 0, W, H)   // 刻度背后一条乳白的衬底，看得清
  g.fillStyle = '#16233f'; g.textBaseline = 'middle'; g.font = `700 44px ui-monospace, Menlo, monospace`
  for (let i = 0; i <= CAP * 10; i++) {
    const y = y0 + i / 10 * per, big = i % 10 === 0, mid = i % 5 === 0
    g.fillRect(0, y - (big ? 3 : 1.5), big ? 64 : mid ? 46 : 28, big ? 6 : 3)
    if (big) g.fillText(String(i / 10), 70, y)
  }
  const tx = tex(c); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping
  return tx
})

/** 化验楼的外墙：浅米色的涂料墙，一排排铝合金窗（深色玻璃、白窗框、窗台），一层楼一行。贴图一格是一层楼高、三扇窗宽 */
export const buildingTex = once(() => {
  const W = 512, H = 256, { c, g } = canvas(W, H), r = rng(91)
  g.fillStyle = '#e4ded2'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '170,162,150' : '250,248,240'},0.15)`; g.fillRect(r() * W, r() * H, 2, 2) }
  g.fillStyle = 'rgba(150,140,128,0.5)'; g.fillRect(0, H - 10, W, 4)
  for (let i = 0; i < 3; i++) {
    const x = 26 + i * 168
    g.fillStyle = '#f4f4f0'; g.fillRect(x - 6, 54, 128, 132)
    const q = g.createLinearGradient(0, 60, 0, 180); q.addColorStop(0, '#5f7684'); q.addColorStop(0.5, '#3c4d58'); q.addColorStop(1, '#2c3a43')
    g.fillStyle = q; g.fillRect(x, 60, 116, 120)
    g.fillStyle = '#f4f4f0'; g.fillRect(x + 56, 60, 5, 120); g.fillRect(x, 112, 116, 4)
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(x + 8, 64); g.lineTo(x + 40, 64); g.lineTo(x + 8, 104); g.fill()
    g.fillStyle = '#cfc8ba'; g.fillRect(x - 10, 186, 136, 8)
  }
  return tex(c)
})
