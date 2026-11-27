// 程序画出来的贴图：青灰方砖地、粉墙、瓦、木纹、花岗石、数轴石条、楼窗、漏窗、泥土剖面。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }

/**
 * 方砖地：一张图 8 × 8 块砖（每块 0.5 m，一张图 4 m 见方）。每块砖颜色略有深浅，边上有一道磨圆的亮边和暗边，砖缝是深灰的灰浆。
 * 同时出一张凹凸图：砖面高、砖缝低。
 */
export const makeTiles = once(() => {
  const S = 1024, N = 8, P = S / N, { c, g } = canvas(S), b = canvas(S), r = rng(11)
  g.fillStyle = '#4c4f4c'; g.fillRect(0, 0, S, S)
  b.g.fillStyle = '#000'; b.g.fillRect(0, 0, S, S)
  const gap = 5
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = i * P + gap / 2, y = j * P + gap / 2, w = P - gap
    // 深浅不一；偶尔一块是后来补的新砖（偏暖或偏青、颜色浅一些），或者旧得发黑的
    const odd = r(), v = (odd < 0.06 ? 142 : odd < 0.12 ? 96 : 116) + Math.floor(r() * 30) - 15
    const warm = odd < 0.03 ? 14 : odd < 0.06 ? -6 : Math.floor(r() * 8) - 2, cool = odd >= 0.03 && odd < 0.06 ? 8 : 0
    g.fillStyle = `rgb(${v - 4 + warm},${v + 1 + Math.round(warm / 3)},${v + 2 + cool})`; g.fillRect(x, y, w, w)
    // 踩得多的地方中间磨亮一点
    { const q = g.createRadialGradient(x + w / 2, y + w / 2, 0, x + w / 2, y + w / 2, w * 0.7); q.addColorStop(0, `rgba(255,255,250,${0.03 + r() * 0.06})`); q.addColorStop(1, 'rgba(255,255,250,0)'); g.fillStyle = q; g.fillRect(x, y, w, w) }
    // 砖面上的斑和细小的气孔
    for (let k = 0; k < 9; k++) { const cx = x + r() * w, cy = y + r() * w, R = 8 + r() * 30, q = g.createRadialGradient(cx, cy, 0, cx, cy, R), d = r() < 0.5 ? '70,74,74' : '170,172,168'; q.addColorStop(0, `rgba(${d},0.14)`); q.addColorStop(1, `rgba(${d},0)`); g.fillStyle = q; g.fillRect(x, y, w, w) }
    for (let k = 0; k < 220; k++) { const u = 60 + Math.floor(r() * 120); g.fillStyle = `rgba(${u},${u},${u},${0.12 + r() * 0.2})`; g.fillRect(x + r() * w, y + r() * w, 1 + r() * 1.6, 1 + r() * 1.6) }
    // 磨圆的边：上沿、左沿亮，下沿、右沿暗
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, w)
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x, y + w - 2, w, 2); g.fillRect(x + w - 2, y, 2, w)
    // 偶尔一块砖缺个角
    if (r() < 0.08) { g.fillStyle = 'rgba(60,62,60,0.8)'; g.beginPath(); const cx = x + (r() < 0.5 ? 0 : w), cy = y + (r() < 0.5 ? 0 : w); g.arc(cx, cy, 4 + r() * 6, 0, 7); g.fill() }
    b.g.fillStyle = '#fff'; b.g.fillRect(x + 1, y + 1, w - 2, w - 2)
  }
  // 砖缝里的青苔：沿着缝一小段一小段的绿，有的漫到砖边上
  for (let i = 0; i < 160; i++) {
    const along = r() * S, line = Math.floor(r() * N) * P, hor = r() < 0.5, len = 8 + r() * 40
    for (let k = 0; k < len; k += 1.5) {
      const px = hor ? along + k : line + (r() - 0.5) * 7, py = hor ? line + (r() - 0.5) * 7 : along + k
      g.fillStyle = `rgba(${70 + r() * 30},${96 + r() * 40},${48 + r() * 20},${0.35 + r() * 0.4})`; g.fillRect(((px % S) + S) % S, ((py % S) + S) % S, 1.5 + r() * 2, 1.5 + r() * 2)
    }
  }
  return { map: tex(c), bump: tex(b.c, false) }
})

/** 粉墙：米白的灰浆墙，下半截被雨水溅脏、颜色发灰，有几道淡淡的水痕 */
export const makeWhitewash = once(() => {
  const W = 512, H = 512, { c, g } = canvas(W, H), r = rng(3)
  g.fillStyle = '#ece8de'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 120; i++) { const x = r() * W, y = r() * H, R = 20 + r() * 70, q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(200,196,184,0.25)' : 'rgba(255,253,246,0.3)'); q.addColorStop(1, 'rgba(230,226,216,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  const q = g.createLinearGradient(0, H * 0.72, 0, H); q.addColorStop(0, 'rgba(120,118,108,0)'); q.addColorStop(1, 'rgba(110,108,98,0.42)'); g.fillStyle = q; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 14; i++) { const x = r() * W, l = 40 + r() * 160, y = r() * 60; const s = g.createLinearGradient(0, y, 0, y + l); s.addColorStop(0, 'rgba(150,146,134,0.22)'); s.addColorStop(1, 'rgba(150,146,134,0)'); g.fillStyle = s; g.fillRect(x, y, 2 + r() * 5, l) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '160,156,146' : '255,255,250'},${0.12 + r() * 0.2})`; g.fillRect(r() * W, r() * H, 1, 1) }
  return tex(c)
})

/** 小青瓦：一垄一垄的瓦，竖着的条纹，每垄有亮面和暗缝，瓦头一排圆的勾头 */
export const makeRoof = once(() => {
  const W = 256, H = 256, { c, g } = canvas(W, H), r = rng(9)
  g.fillStyle = '#3b3e40'; g.fillRect(0, 0, W, H)
  const n = 8, w = W / n
  for (let i = 0; i < n; i++) {
    const x = i * w, q = g.createLinearGradient(x, 0, x + w, 0)
    q.addColorStop(0, '#2c2f31'); q.addColorStop(0.35, '#5a5e60'); q.addColorStop(0.55, '#4b4f51'); q.addColorStop(1, '#262829')
    g.fillStyle = q; g.fillRect(x, 0, w, H)
    for (let y = 0; y < H; y += 16) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y, w, 2) }
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,20,20' : '120,124,120'},${0.1 + r() * 0.15})`; g.fillRect(r() * W, r() * H, 1, 1) }
  return tex(c)
})

/** 木纹：顺着 x 方向的长纹，偶尔一个节疤 */
export function makeWood(base: string, dark: string, seed = 5, knots = 2) {
  const W = 512, H = 256, { c, g } = canvas(W, H), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 150; i++) {
    const y = r() * H, amp = 1 + r() * 4, ph = r() * 6, k = 1 + Math.floor(r() * 2)
    g.strokeStyle = dark; g.globalAlpha = 0.08 + r() * 0.22; g.lineWidth = 0.6 + r() * 1.8
    g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / W * Math.PI * 2 * k + ph) * amp); g.stroke()
  }
  g.globalAlpha = 1
  for (let i = 0; i < knots; i++) { const x = r() * W, y = r() * H; for (let k = 6; k > 0; k--) { g.strokeStyle = dark; g.globalAlpha = 0.25; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, k * 4, k * 1.6, 0, 0, 7); g.stroke() } }
  g.globalAlpha = 1
  return tex(c)
}
export const woodLight = once(() => makeWood('#c49a62', '#7a5530', 5))
export const woodDark = once(() => makeWood('#7b5434', '#3e2614', 7, 1))
export const woodPlank = once(() => makeWood('#d9bb8a', '#9b7445', 13, 1))

/** 花岗石：浅灰底上密密的黑白斑点 */
export function makeGranite(base = '#a7a59e', seed = 21) {
  const S = 512, { c, g } = canvas(S), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 26000; i++) { const t = r(), v = t < 0.45 ? 50 + r() * 40 : t < 0.8 ? 190 + r() * 50 : 140 + r() * 30; g.fillStyle = `rgba(${v},${v - 2},${v - 4},${0.35 + r() * 0.4})`; g.fillRect(r() * S, r() * S, 1 + r() * 2.2, 1 + r() * 2.2) }
  return tex(c)
}
export const granite = once(() => makeGranite())
export const stoneDark = once(() => makeGranite('#7d7b75', 23))

/**
 * 数轴石条：花岗石上刻出的数轴，一张图是 6.5 m（从 −0.5 到 6）× 0.4 m。每 1 m 一道长刻线、每 0.1 m 一道短刻线，长刻线下方刻着数字。
 * 刻痕是深色的阴刻，填了一点白，远看也清楚。
 */
export const makeAxis = once(() => {
  const W = 2600, H = 280, { c, g } = canvas(W, H), r = rng(31), px = W / 6.5
  g.fillStyle = '#b8b5ac'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 40000; i++) { const t = r(), v = t < 0.45 ? 60 + r() * 40 : 200 + r() * 40; g.fillStyle = `rgba(${v},${v},${v - 4},${0.3 + r() * 0.35})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2) }
  // 石条两边一道磨出来的倒角线
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6)
  const y = H * AXIS_V
  g.fillStyle = '#25272a'; g.fillRect(0, y - 4, W, 8)
  for (let k = -5; k <= 60; k++) {
    const x = (k / 10 + 0.5) * px, major = k % 10 === 0, half = k % 5 === 0
    g.fillRect(x - (major ? 4 : 2), y - (major ? 44 : half ? 28 : 16), major ? 8 : 4, major ? 88 : half ? 56 : 32)
  }
  g.font = '700 112px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let k = 0; k <= 5; k++) { const x = (k + 0.5) * px; g.fillStyle = '#25272a'; g.fillText(String(k), x, H * 0.74) }
  // 正方向的箭头
  g.beginPath(); g.moveTo(W - 8, y); g.lineTo(W - 80, y - 30); g.lineTo(W - 80, y + 30); g.closePath(); g.fill()
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t
})
/** 数轴的那条线在石条宽度上的位置（从北边量起的比例） */
export const AXIS_V = 0.3

/** 高楼的玻璃幕墙：一格一格的窗，有的亮有的暗，横竖的窗框 */
export function makeTower(seed: number, tint = [92, 112, 128]) {
  const W = 256, H = 512, { c, g } = canvas(W, H), r = rng(seed)
  g.fillStyle = '#c9ccc9'; g.fillRect(0, 0, W, H)
  const cols = 8, rows = 32, cw = W / cols, rh = H / rows
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const k = 0.75 + r() * 0.4, lit = r() < 0.06
    g.fillStyle = lit ? 'rgb(236,226,196)' : `rgb(${tint[0] * k},${tint[1] * k},${tint[2] * k})`
    g.fillRect(i * cw + 2, j * rh + 3, cw - 4, rh - 5)
  }
  return tex(c)
}

/** 二楼的木格窗：深色窗框、细格子、后面是暗的屋里 */
export const makeLattice = once(() => {
  const S = 256, { c, g } = canvas(S)
  g.fillStyle = '#1c1714'; g.fillRect(0, 0, S, S)
  g.strokeStyle = '#6b4a2e'; g.lineWidth = 7
  for (let k = 0; k <= 8; k++) { const p = k * S / 8; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke() }
  g.lineWidth = 16; g.strokeRect(0, 0, S, S)
  return tex(c)
})

/** 漏窗：粉墙上的花窗，灰色的砖瓦拼成的冰裂纹 */
export const makeLeak = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(17)
  g.clearRect(0, 0, S, S)
  g.strokeStyle = '#5b5f60'; g.lineWidth = 9; g.lineCap = 'round'
  const pts: [number, number][] = Array.from({ length: 16 }, () => [20 + r() * (S - 40), 20 + r() * (S - 40)])
  for (const [x, y] of pts) { const n = pts.map(p => [p, Math.hypot(p[0] - x, p[1] - y)] as const).sort((a, b) => a[1] - b[1]).slice(1, 4); for (const [[x2, y2]] of n) { g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke() } }
  g.lineWidth = 18; g.strokeRect(9, 9, S - 18, S - 18)
  return tex(c)
})

/** 泥土剖面：上面一层灰黄的垫层，下面是褐色的土，夹着小石子 */
export const makeSoil = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(41)
  const q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, '#8b7a5e'); q.addColorStop(0.08, '#7a6447'); q.addColorStop(1, '#5a4530')
  g.fillStyle = q; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 1800; i++) { const v = 70 + Math.floor(r() * 90); g.fillStyle = `rgba(${v + 10},${v},${v - 14},${0.3 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * S, r() * S, 1 + r() * 4, 1 + r() * 3, r() * 3, 0, 7); g.fill() }
  for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,30,20' : '150,130,100'},${0.15})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
})

/** 门头上的木匾：深色木底、金色的字 */
export function makeSign(text: string) {
  const W = 512, H = 160, { c, g } = canvas(W, H)
  const q = g.createLinearGradient(0, 0, 0, H); q.addColorStop(0, '#4a2f1c'); q.addColorStop(1, '#2e1c10'); g.fillStyle = q; g.fillRect(0, 0, W, H)
  g.strokeStyle = '#8a6a3a'; g.lineWidth = 8; g.strokeRect(8, 8, W - 16, H - 16)
  g.fillStyle = '#d9b46a'; g.font = '700 92px "Songti SC", "STSong", "SimSun", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 4)
  return tex(c)
}

/** 大片的旧化：雨水冲出来的深浅、积灰、几处水渍。铺得比方砖大得多，盖在地面上打破方砖贴图的重复 */
export const makeGrime = once(() => {
  const S = 1024, { c, g } = canvas(S), r = rng(57)
  g.clearRect(0, 0, S, S)
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, R = 40 + r() * 200, dark = r() < 0.6
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, R); q.addColorStop(0, dark ? `rgba(40,44,38,${0.12 + r() * 0.14})` : `rgba(230,228,215,${0.06 + r() * 0.08})`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x + ox - R, y + oy - R, R * 2, R * 2) }
  }
  return tex(c)
})
