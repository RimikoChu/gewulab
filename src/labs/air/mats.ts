// 程序画出来的贴图：化验室的地砖和台面、厂房的压型钢板、厂区的草地、各种牌子和标签、反应牌。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif'

/** 地砖：浅灰的 60 cm 方砖 */
export const tileTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 200 + Math.floor(r() * 12); g.fillStyle = `rgb(${v - 4},${v},${v + 2})`; g.fillRect(i * 256, j * 256, 256, 256) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,124,126' : '250,252,252'},${0.06 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  g.fillStyle = '#8c9294'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, S); g.fillRect(0, k, S, 3) }
  return tex(c)
})
/** 化验台后面的墙裙：白色的 10 cm 小方瓷砖，灰白的勾缝，带一点釉面的明暗 */
export const wallTileTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(13)
  g.fillStyle = '#c9ccc8'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 236 + Math.floor(r() * 10); const q = g.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64); q.addColorStop(0, `rgb(${v},${v + 1},${v})`); q.addColorStop(1, `rgb(${v - 8},${v - 7},${v - 8})`); g.fillStyle = q; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60) }
  return tex(c)
})
/** 远处楼房的立面：浅灰的墙，一格格深色的窗，偶尔亮着灯 */
export const facadeTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(71)
  g.fillStyle = '#a3a6a2'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const k = r(); g.fillStyle = k < 0.06 ? '#c9c2a4' : k < 0.5 ? '#3e4852' : '#4d5862'; g.fillRect(i * 32 + 5, j * 32 + 7, 22, 18) }
  for (let j = 0; j < 8; j++) { g.fillStyle = 'rgba(120,122,118,0.5)'; g.fillRect(0, j * 32 + 28, S, 2) }
  return tex(c)
})
/** 车间的环氧地坪：浅绿灰，带一点斑驳；黄色的通道线另画 */
export const epoxyTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(19)
  g.fillStyle = '#8fa39a'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 120; i++) { const x = r() * S, y = r() * S, R = 20 + r() * 70; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(120,138,130,0.35)' : 'rgba(170,184,176,0.3)'); q.addColorStop(1, 'rgba(140,160,150,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,100,96' : '220,228,222'},${0.06 + r() * 0.08})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
})
/** 化验台面：深灰的理化板，有细小的斑点 */
export const benchTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#4f585c'; g.fillRect(0, 0, S, S)
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
/** 压型钢板（厂房外墙、屋面）：一道道梯形的肋，base 是漆色 */
const ribCache = new Map<string, THREE.CanvasTexture>()
export function ribTex(base: [number, number, number]) {
  const key = base.join(), hit = ribCache.get(key); if (hit) return hit
  const S = 256, { c, g } = canvas(S)
  for (let x = 0; x < S; x++) { const k = (x % 32) / 32, v = k < 0.1 ? 0.72 : k < 0.18 ? 1.12 : k < 0.6 ? 0.98 : 0.92; g.fillStyle = `rgb(${Math.round(base[0] * v)},${Math.round(base[1] * v)},${Math.round(base[2] * v)})`; g.fillRect(x, 0, 1, S) }
  const r = rng(61); for (let i = 0; i < 12; i++) { const x = r() * S, w = 4 + r() * 14; const q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, 'rgba(70,66,60,0.12)'); q.addColorStop(1, 'rgba(70,66,60,0)'); g.fillStyle = q; g.fillRect(x, 0, w, S * (0.3 + r() * 0.5)) }
  const t = tex(c); ribCache.set(key, t)
  return t
}

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
/** 储罐上的标识：白底，罐名、化学式，一道黄黑警示条 */
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
/** 压力表的表盘：白底，0 到 max（kPa）的刻度，每 50 一短线、每 100 一个数 */
const dialCache = new Map<number, THREE.CanvasTexture>()
export function dialTex(max: number) {
  const hit = dialCache.get(max); if (hit) return hit
  const S = 256, { c, g } = canvas(S)
  g.fillStyle = '#f4f3ee'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill()
  g.strokeStyle = '#1d1d1b'; g.fillStyle = '#1d1d1b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 26px sans-serif'
  for (let v = 0; v <= max; v += 25) {
    const a = Math.PI * 0.75 + v / max * Math.PI * 1.5, big = v % 100 === 0
    g.lineWidth = big ? 4 : 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * (big ? 92 : 102), 128 + Math.sin(a) * (big ? 92 : 102)); g.lineTo(128 + Math.cos(a) * 114, 128 + Math.sin(a) * 114); g.stroke()
    if (big) g.fillText(String(v), 128 + Math.cos(a) * 72, 128 + Math.sin(a) * 72)
  }
  g.font = '600 20px sans-serif'; g.fillText('kPa', 128, 190)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  dialCache.set(max, t)
  return t
}
/** 反应牌：木纹底的牌面，上面一行反应名，中间一行文字表达式，下面一行“反应物几种 → 生成物几种”；右上角一枚圆章表示有氧气参加 */
const cardCache = new Map<string, THREE.CanvasTexture>()
export function cardTex(name: string, reactants: readonly string[], products: readonly string[], withO2: boolean) {
  const hit = cardCache.get(name); if (hit) return hit
  const W = 640, H = 420, { c, g } = canvas(W, H), r = rng(name.length * 13 + 5)
  g.fillStyle = '#e2c79c'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 70; i++) { const y = r() * H; g.strokeStyle = `rgba(${130 + r() * 40},${95 + r() * 30},${55 + r() * 20},${0.08 + r() * 0.12})`; g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + (r() - 0.5) * 16, W * 0.7, y + (r() - 0.5) * 16, W, y + (r() - 0.5) * 10); g.stroke() }
  g.strokeStyle = 'rgba(90,60,30,0.55)'; g.lineWidth = 6; g.strokeRect(10, 10, W - 20, H - 20)
  g.fillStyle = '#2a1d10'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `800 84px ${FONT}`; g.fillText(name, W / 2 - (withO2 ? 30 : 0), 96)
  g.font = `600 46px ${FONT}`; g.fillText(`${reactants.join(' + ')} → ${products.join(' + ')}`, W / 2, 214, W - 50)
  g.fillStyle = 'rgba(42,29,16,0.2)'; g.fillRect(40, 268, W - 80, 3)
  g.fillStyle = '#5a3a1a'; g.font = `600 42px ${FONT}`; g.fillText(`反应物 ${reactants.length} 种 → 生成物 ${products.length} 种`, W / 2, 334, W - 50)
  if (withO2) { g.fillStyle = '#1f7a6d'; g.beginPath(); g.arc(W - 78, 92, 50, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `700 30px ${FONT}`; g.fillText('有氧气', W - 78, 78); g.fillText('参加', W - 78, 112) }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  cardCache.set(name, t)
  return t
}
/** 软木板：细碎的深浅颗粒 */
export const corkTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(23)
  g.fillStyle = '#b98e5e'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '96,66,36' : '226,190,140'},${0.12 + r() * 0.25})`; const s = 1 + r() * 3; g.fillRect(r() * S, r() * S, s, s) }
  return tex(c)
})
/** 一条竖的温度刻度：从 lo 到 hi（℃），每 25 一条长线带数字；marks 是要特别标出来的温度（红线） */
export function scaleTex(lo: number, hi: number, marks: number[]) {
  const W = 192, H = 1024, { c, g } = canvas(W, H), y = (t: number) => 30 + (hi - t) / (hi - lo) * (H - 60)
  g.fillStyle = '#f3f2ec'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#1d2327'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.font = '700 34px ui-monospace, Menlo, monospace'
  for (let t = Math.ceil(lo / 5) * 5; t <= hi; t += 5) { const big = t % 25 === 0; g.fillRect(0, y(t) - (big ? 2.5 : 1), big ? 58 : 30, big ? 5 : 2); if (big) g.fillText(String(t), W - 12, y(t)) }
  g.fillStyle = '#c8372d'; for (const t of marks) g.fillRect(0, y(t) - 3, 96, 6)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
/** 氧气指示表的表盘：半圆的刻度，左边“少”、右边“多”，没有数字（只比相对多少） */
export const gaugeTex = once(() => {
  const S = 256, { c, g } = canvas(S)
  g.fillStyle = '#f4f3ee'; g.fillRect(0, 0, S, S)
  g.strokeStyle = '#1d1d1b'; g.fillStyle = '#1d1d1b'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI, big = i % 5 === 0; g.lineWidth = big ? 5 : 2.5; g.beginPath(); g.moveTo(128 + Math.cos(a) * (big ? 78 : 86), 150 + Math.sin(a) * (big ? 78 : 86)); g.lineTo(128 + Math.cos(a) * 98, 150 + Math.sin(a) * 98); g.stroke() }
  g.font = `700 30px ${FONT}`; g.fillText('少', 34, 186); g.fillText('多', 222, 186); g.font = `700 34px ${FONT}`; g.fillText('氧气', 128, 214)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
})
