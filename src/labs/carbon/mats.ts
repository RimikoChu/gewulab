// 程序画出来的贴图：化验室的地砖和台面、厂房的压型钢板、温室外的草地和碎石、各种牌子和标签、汽水瓶的瓶贴。不用下载素材。
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
/** 温室里的地面：铺着白色的地布，中间走道是混凝土；这里只画地布（编织的细格） */
export const clothTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(23)
  g.fillStyle = '#d9dad4'; g.fillRect(0, 0, S, S)
  for (let x = 0; x < S; x += 4) { g.fillStyle = 'rgba(160,162,156,0.35)'; g.fillRect(x, 0, 1, S) }
  for (let y = 0; y < S; y += 4) { g.fillStyle = 'rgba(250,250,246,0.4)'; g.fillRect(0, y, S, 1) }
  for (let i = 0; i < 60; i++) { const x = r() * S, y = r() * S, R = 8 + r() * 30; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(120,110,90,0.12)'); q.addColorStop(1, 'rgba(120,110,90,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
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
/** 汽水瓶的瓶贴：一圈环形贴，绿底白字，一道白色的波浪 */
export const sodaLabel = once(() => {
  const W = 1024, H = 256, { c, g } = canvas(W, H)
  const q = g.createLinearGradient(0, 0, 0, H); q.addColorStop(0, '#1f8a4c'); q.addColorStop(1, '#13663a'); g.fillStyle = q; g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 10; g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, 196 + Math.sin(x / W * Math.PI * 4) * 16); g.stroke()
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (const x of [W * 0.25, W * 0.75]) { g.font = `800 92px ${FONT}`; g.fillText('清柠汽水', x, 96); g.font = `600 30px ${FONT}`; g.fillText('含二氧化碳 · 500 mL', x, 160) }
  const t = tex(c); t.wrapT = THREE.ClampToEdgeWrapping
  return t
})
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
/** 一个白色的小数字屏（浓度计、温度计）的面板背景另用 Led；这里画温室里的挂牌：番茄的品种和定植日期不写，只写棚号 */
export const houseSign = once(() => makeSign(['3 号温室', '二氧化碳补气区'], '#2f7a54', '#ffffff', 512, 160))
