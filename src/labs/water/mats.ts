// 程序画出来的贴图：化验室的地砖和台面、草地、滤料（砂、卵石、活性炭）、刻度管的刻度、牌子和标签。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif'

/** 化验室的地砖：浅灰的 60 cm 方砖 */
export const tileTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 200 + Math.floor(r() * 12); g.fillStyle = `rgb(${v - 4},${v},${v + 2})`; g.fillRect(i * 256, j * 256, 256, 256) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,124,126' : '250,252,252'},${0.06 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  g.fillStyle = '#8c9294'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, S); g.fillRect(0, k, S, 3) }
  return tex(c)
})

/** 化验台面：浅灰的实验台板（理化板），有细小的斑点 */
export const benchTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#5b6468'; g.fillRect(0, 0, S, S)
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

/** 河滩：湿的泥沙和碎石 */
export const bankTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(31)
  g.fillStyle = '#8a7a5e'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 200; i++) { const x = r() * S, y = r() * S, R = 14 + r() * 50; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(96,82,60,0.5)' : 'rgba(160,146,116,0.4)'); q.addColorStop(1, 'rgba(138,122,94,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 1600; i++) { const x = r() * S, y = r() * S, R = 1 + r() * r() * 6; g.fillStyle = `rgba(${r() < 0.5 ? '190,180,160' : '70,62,50'},${0.3 + r() * 0.4})`; g.beginPath(); g.ellipse(x, y, R * 1.3, R, r() * 3, 0, 7); g.fill() }
  return tex(c)
})

/** 颗粒状的滤料：base 是底色，a、b 是颗粒的两种颜色，size 是颗粒大小（像素） */
const grainCache = new Map<string, THREE.CanvasTexture>()
export function grainTex(base: string, a: string, b: string, size: number, seed = 7) {
  const key = `${base}${a}${b}${size}`, hit = grainCache.get(key); if (hit) return hit
  const S = 256, { c, g } = canvas(S), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  const n = Math.round(S * S / (size * size) * 1.4)
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, R = size * (0.35 + r() * 0.5)
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.fillStyle = r() < 0.5 ? a : b; g.beginPath(); g.ellipse(x + ox, y + oy, R * 1.2, R, r() * 3, 0, 7); g.fill() }
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x - R * 0.3, y - R * 0.3, R * 0.4, R * 0.3, 0, 0, 7); g.fill()
  }
  const t = tex(c); grainCache.set(key, t)
  return t
}

/** 刻度管的刻度：白色的线和数，透明底。从下往上 0 到 max（mL），每 1 mL 一短线，每 5 mL 长线，每 10 mL 一个数。上下颠倒：霍夫曼管的 0 在上面 */
const scaleCache = new Map<string, THREE.CanvasTexture>()
export function scaleTex(max: number, topZero = true) {
  const key = `${max}${topZero}`, hit = scaleCache.get(key); if (hit) return hit
  const W = 128, H = 1024, { c, g } = canvas(W, H)
  g.clearRect(0, 0, W, H); g.fillStyle = '#ffffff'; g.font = `700 34px ui-monospace, Menlo, monospace`; g.textBaseline = 'middle'
  for (let v = 0; v <= max; v++) {
    const k = v / max, y = topZero ? 16 + k * (H - 32) : H - 16 - k * (H - 32)
    const len = v % 10 === 0 ? 60 : v % 5 === 0 ? 44 : 26
    g.fillRect(0, y - 2, len, 4)
    if (v % 10 === 0) g.fillText(String(v), 66, y)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  scaleCache.set(key, t)
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
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${text.length > 4 ? 40 : 52}px ${FONT}`; g.fillText(text, W / 2, 86, W - 16)
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

/** 流程图挂板：一排方框加箭头（水厂的工艺流程） */
export function flowBoard(steps: string[]) {
  const W = 1024, H = 256, { c, g } = canvas(W, H)
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, W, H); g.fillStyle = '#2a6f9e'; g.fillRect(0, 0, W, 60)
  g.fillStyle = '#fff'; g.font = `700 36px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('净水工艺流程', W / 2, 31)
  const n = steps.length, bw = (W - 40) / n
  steps.forEach((s, i) => {
    const x = 20 + i * bw
    g.strokeStyle = '#2a6f9e'; g.lineWidth = 4; g.strokeRect(x + 8, 100, bw - 40, 90)
    g.fillStyle = '#1e2a33'; g.font = `600 28px ${FONT}`; g.fillText(s, x + 8 + (bw - 40) / 2, 145, bw - 50)
    if (i < n - 1) { g.fillStyle = '#2a6f9e'; g.beginPath(); g.moveTo(x + bw - 28, 132); g.lineTo(x + bw - 12, 145); g.lineTo(x + bw - 28, 158); g.fill() }
  })
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

/** 剖开的池壁切口：浅灰的混凝土，上面一层细斜线（工程图里剖面的画法） */
export const cutTex = once(() => {
  const S = 128, { c, g } = canvas(S)
  g.fillStyle = '#b9b6ad'; g.fillRect(0, 0, S, S)
  g.strokeStyle = 'rgba(80,78,72,0.35)'; g.lineWidth = 2
  for (let k = -S; k < S * 2; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke() }
  return tex(c)
})

/** 温度计的刻度：白底黑线，0–110 °C，每 10 °C 一个数 */
export const thermoTex = once(() => {
  const W = 64, H = 512, { c, g } = canvas(W, H)
  g.fillStyle = '#f3f1ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#1d1d1b'; g.font = '700 22px sans-serif'; g.textAlign = 'right'
  for (let t = 0; t <= 110; t += 2) { const y = H - 20 - t / 110 * (H - 40); g.fillRect(36, y - 1, t % 10 === 0 ? 26 : 12, 2); if (t % 20 === 0) g.fillText(String(t), 34, y + 8) }
  const tx = tex(c); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping
  return tx
})

/** 厂房的外墙：浅色的真石漆墙面，按 1.2 m 一块分格，有雨水留下的淡淡污渍 */
export const wallTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(43)
  g.fillStyle = '#e3ded2'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '150,144,132' : '250,248,240'},${0.08 + r() * 0.12})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  for (let i = 0; i < 14; i++) { const x = r() * S, w = 6 + r() * 20; const q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, 'rgba(110,104,92,0.16)'); q.addColorStop(1, 'rgba(110,104,92,0)'); g.fillStyle = q; g.fillRect(x, 0, w, S * (0.3 + r() * 0.5)) }
  g.fillStyle = 'rgba(120,114,102,0.55)'; for (const k of [0, 256]) { g.fillRect(k, 0, 2, S); g.fillRect(0, k, S, 2) }
  return tex(c)
})
/** 彩钢屋面：深灰蓝的压型钢板，一道道竖肋 */
export const roofTex = once(() => {
  const S = 256, { c, g } = canvas(S)
  for (let x = 0; x < S; x++) { const k = (x % 32) / 32, v = k < 0.12 ? 0.7 : k < 0.2 ? 1.15 : 0.95; g.fillStyle = `rgb(${Math.round(58 * v)},${Math.round(84 * v)},${Math.round(104 * v)})`; g.fillRect(x, 0, 1, S) }
  return tex(c)
})
/** 储罐上的标识：白底，罐名、化学式，一道黄黑警示条 */
export function tankLabel(name: string, formula: string) {
  const W = 512, H = 256, { c, g } = canvas(W, H)
  g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `700 76px ${FONT}`; g.fillText(name, W / 2, 88, W - 30)
  g.font = `600 48px ${FONT}`; g.fillText(formula, W / 2, 166)
  g.fillStyle = '#e3b21c'; g.fillRect(0, H - 36, W, 36); g.fillStyle = '#1d1d1b'; for (let x = -36; x < W; x += 36) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 18, H); g.lineTo(x + 36, H - 36); g.lineTo(x + 18, H - 36); g.fill() }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
/** 开放日展板：标题、一排净水流程的方框，下面一行“节约用水”的口号 */
export const expoTex = once(() => {
  const W = 1024, H = 512, { c, g } = canvas(W, H)
  const q = g.createLinearGradient(0, 0, 0, H); q.addColorStop(0, '#edf3f5'); q.addColorStop(1, '#dce9ee'); g.fillStyle = q; g.fillRect(0, 0, W, H)
  g.fillStyle = '#2a6f9e'; g.fillRect(0, 0, W, 64)
  g.fillStyle = '#fff'; g.font = `700 36px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('一滴水的旅程', W / 2, 33)
  const steps = ['取水', '絮凝沉淀', '过滤', '活性炭吸附', '消毒', '配水'], bw = (W - 200) / steps.length
  steps.forEach((s, i) => {
    const x = 100 + i * bw
    g.fillStyle = '#ffffff'; g.fillRect(x + 6, 110, bw - 26, 56); g.strokeStyle = '#7fa9c4'; g.lineWidth = 2; g.strokeRect(x + 6, 110, bw - 26, 56)
    g.fillStyle = '#3a4a55'; g.font = `500 19px ${FONT}`; g.fillText(s, x + 6 + (bw - 26) / 2, 138, bw - 32)
    if (i < steps.length - 1) { g.fillStyle = '#7fa9c4'; g.beginPath(); g.moveTo(x + bw - 16, 130); g.lineTo(x + bw - 4, 138); g.lineTo(x + bw - 16, 146); g.fill() }
  })
  g.fillStyle = '#4f8f78'; g.font = `600 24px ${FONT}`; g.fillText('节约用水，从关紧每一个龙头做起', W / 2, 440)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
})
