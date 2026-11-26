// 程序画出来的贴图：化验室的地砖、台面、墙面，盐田的盐壳、泥底、土埂，牌子、标签、刻度。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
export const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif'

/** 化验室的地砖：浅米灰的 60 cm 方砖 */
export const tileTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 204 + Math.floor(r() * 10); g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.fillRect(i * 256, j * 256, 256, 256) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,116,108' : '250,250,246'},${0.06 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  g.fillStyle = '#8f8b84'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, S); g.fillRect(0, k, S, 3) }
  return tex(c)
})

/** 化验台面：黑色环氧树脂板，有极细的浅色斑点 */
export const benchTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#23272a'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 40; i++) { const x = r() * S, y = r() * S, R = 10 + r() * 40; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(10,12,14,0.3)' : 'rgba(70,76,80,0.18)'); q.addColorStop(1, 'rgba(35,39,42,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '10,10,12' : '120,126,130'},${0.1 + r() * 0.15})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
})

/** 墙裙瓷砖：白色的 20 cm 小方砖，灰缝 */
export const wallTileTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(12)
  g.fillStyle = '#bfc3c1'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 232 + Math.floor(r() * 10); g.fillStyle = `rgb(${v},${v + 1},${v})`; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60) }
  return tex(c)
})

/** 盐碱地：灰白的地面，夹着浅褐色的斑和细碎的盐粒 */
export const saltFlatTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(21)
  g.fillStyle = '#c9bfae'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 220; i++) { const x = r() * S, y = r() * S, R = 16 + r() * 60, col = r() < 0.55 ? '150,134,110' : '222,216,204'
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, R); q.addColorStop(0, `rgba(${col},0.5)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - R, y + oy - R, R * 2, R * 2) } }
  for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '140,128,108' : '255,255,252'},${0.12 + r() * 0.25})`; g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5) }
  return tex(c)
})

/** 结晶池底的盐层：白里透一点粉，一块块的结晶面和细缝 */
export const crustTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(33)
  g.fillStyle = '#f1ede8'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 900; i++) { const x = r() * S, y = r() * S, w = 4 + r() * 14; g.fillStyle = `rgba(${r() < 0.3 ? '236,214,214' : r() < 0.6 ? '255,255,255' : '214,210,204'},${0.35 + r() * 0.4})`; g.save(); g.translate(x, y); g.rotate(r() * 3); g.fillRect(-w / 2, -w / 2, w, w); g.restore() }
  g.strokeStyle = 'rgba(170,160,150,0.35)'; g.lineWidth = 1
  for (let i = 0; i < 60; i++) { g.beginPath(); let x = r() * S, y = r() * S; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y) } g.stroke() }
  return tex(c)
})

/** 土埂：夯实的黄褐色泥土，有车辙一样的细纹 */
export const dikeTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(44)
  g.fillStyle = '#a8957a'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 120; i++) { const x = r() * S, y = r() * S, R = 8 + r() * 30; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(130,112,88,0.5)' : 'rgba(200,190,170,0.4)'); q.addColorStop(1, 'rgba(168,149,122,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,76,60' : '230,225,210'},${0.15 + r() * 0.2})`; g.fillRect(r() * S, r() * S, 1, 1 + r() * 2) }
  return tex(c)
})

/** 剖面上的地层：最上面一层白盐，下面是压实的青灰色泥、再下面黄褐色的土，夹着盐粒 */
export const strataTex = once(() => {
  const W = 512, H = 256, { c, g } = canvas(W, H), r = rng(55)
  const bands: [number, string][] = [[0, '#5f574b'], [0.35, '#6e5f4b'], [0.7, '#7a6449']]
  bands.forEach(([y, col], i) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, y * H); for (let x = 0; x <= W; x += 16) g.lineTo(x, y * H + Math.sin(x * 0.02 + i) * 4); g.lineTo(W, H); g.lineTo(0, H); g.fill() })
  for (let i = 0; i < 1600; i++) { const x = r() * W, y = r() * H, R = 0.6 + r() * r() * 4; g.fillStyle = `rgba(${r() > 0.5 ? '236,232,224' : '60,54,46'},${0.2 + r() * 0.3})`; g.beginPath(); g.ellipse(x, y, R * 1.4, R, r() * 3, 0, 7); g.fill() }
  const t = tex(c); t.wrapT = THREE.ClampToEdgeWrapping
  return t
})

/** 外墙：浅灰白的真石漆墙面，分格，下面一点雨渍 */
export const wallTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(43)
  g.fillStyle = '#e6e2d8'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '150,144,132' : '250,248,240'},${0.08 + r() * 0.12})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  for (let i = 0; i < 14; i++) { const x = r() * S, w = 6 + r() * 20; const q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, 'rgba(110,104,92,0.14)'); q.addColorStop(1, 'rgba(110,104,92,0)'); g.fillStyle = q; g.fillRect(x, 0, w, S * (0.3 + r() * 0.5)) }
  g.fillStyle = 'rgba(120,114,102,0.5)'; for (const k of [0, 256]) { g.fillRect(k, 0, 2, S); g.fillRect(0, k, S, 2) }
  return tex(c)
})
/** 彩钢屋面：一道道竖肋 */
export const roofTex = once(() => {
  const S = 256, { c, g } = canvas(S)
  for (let x = 0; x < S; x++) { const k = (x % 32) / 32, v = k < 0.12 ? 0.7 : k < 0.2 ? 1.15 : 0.95; g.fillStyle = `rgb(${Math.round(70 * v)},${Math.round(96 * v)},${Math.round(112 * v)})`; g.fillRect(x, 0, 1, S) }
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

/** 试剂瓶的标签：白底，一条色带，一行字（第二行小字可选） */
const labelCache = new Map<string, THREE.CanvasTexture>()
export function bottleLabel(text: string, band = '#2f6fb3', sub?: string) {
  const key = text + band + (sub ?? ''), hit = labelCache.get(key); if (hit) return hit
  const W = 256, H = 160, { c, g } = canvas(W, H)
  g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H); g.fillStyle = band; g.fillRect(0, 0, W, 24); g.fillRect(0, H - 12, W, 12)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${text.length > 4 ? 38 : 50}px ${FONT}`; g.fillText(text, W / 2, sub ? 72 : 84, W - 16)
  if (sub) { g.font = `600 30px ${FONT}`; g.fillStyle = '#3a3c3f'; g.fillText(sub, W / 2, 118, W - 16) }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  labelCache.set(key, t)
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

/** 温度计的刻度：白底黑线，−10–110 ℃，每 10 ℃ 一个数 */
export const thermoTex = once(() => {
  const W = 64, H = 512, { c, g } = canvas(W, H)
  g.fillStyle = '#f3f1ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#1d1d1b'; g.font = '700 20px sans-serif'; g.textAlign = 'right'
  for (let t = -10; t <= 110; t += 2) { const y = H - 20 - (t + 10) / 120 * (H - 40); g.fillRect(36, y - 1, t % 10 === 0 ? 26 : 12, 2); if (t % 20 === 0) g.fillText(String(t), 34, y + 7) }
  const tx = tex(c); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping
  return tx
})

/** 量筒的刻度：透明底白线，0–50 mL，每 1 mL 短线、每 5 mL 长线、每 10 mL 一个数 */
export const cylScaleTex = once(() => {
  const W = 128, H = 1024, { c, g } = canvas(W, H)
  g.clearRect(0, 0, W, H); g.fillStyle = '#ffffff'; g.font = '700 40px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle'
  for (let v = 0; v <= 50; v++) {
    const y = H - 12 - v / 50 * (H - 24), len = v % 10 === 0 ? 64 : v % 5 === 0 ? 46 : 26
    g.fillRect(0, y - 2.5, len, 5)
    if (v % 10 === 0 && v > 0) g.fillText(String(v), 70, y)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
})

/** 烧杯外壁的刻度：透明底白线，几道刻度和数 */
const beakerScale = new Map<number, THREE.CanvasTexture>()
export function beakerScaleTex(max: number) {
  const hit = beakerScale.get(max); if (hit) return hit
  const W = 256, H = 512, { c, g } = canvas(W, H)
  g.clearRect(0, 0, W, H); g.fillStyle = '#ffffff'; g.font = '600 34px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle'
  const step = max / 5
  for (let i = 1; i <= 4; i++) { const y = H - i / 5 * H; g.fillRect(20, y - 3, i % 2 ? 60 : 90, 6); g.fillText(String(Math.round(step * i)), 100, y) }
  for (let i = 1; i <= 9; i++) { if (i % 2 === 0) continue; const y = H - i / 10 * H; g.fillRect(20, y - 2, 36, 4) }
  g.font = '700 40px ui-monospace, Menlo, monospace'; g.fillText(`${max}mL`, 30, 60)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  beakerScale.set(max, t)
  return t
}
