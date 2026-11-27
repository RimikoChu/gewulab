// 程序画出来的贴图：青砖地、砖墙、木纹、红纸、白布、白釉方砖、木板上的铅笔格、描图纸、木花窗、蓝印花布。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
/** 撒一层细小的斑点 */
function speck(g: CanvasRenderingContext2D, W: number, H: number, n: number, a: string, b: string, r: () => number, alpha = 0.18) {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < 0.5 ? a : b},${alpha * (0.4 + r())})`; g.fillRect(r() * W, r() * H, 1 + r() * 1.5, 1 + r() * 1.5) }
}
/** 柔和的大斑：让大面积的东西不显得一样平 */
function blotch(g: CanvasRenderingContext2D, W: number, H: number, n: number, col: string, r: () => number, alpha = 0.12) {
  for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H, R = 20 + r() * 80, q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, `rgba(${col},${alpha})`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
}

/** 青砖地：一张图 4 × 4 块砖（每块 30 cm，一张图 1.2 m 见方），灰缝浅，砖面青灰、深浅不一；另出一张凹凸图 */
export const makeFloor = once(() => {
  const S = 1024, N = 4, P = S / N, { c, g } = canvas(S), b = canvas(S), r = rng(17)
  g.fillStyle = '#b4b0a6'; g.fillRect(0, 0, S, S)
  b.g.fillStyle = '#000'; b.g.fillRect(0, 0, S, S)
  const gap = 10
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = i * P + gap / 2, y = j * P + gap / 2, w = P - gap, v = 122 + Math.floor(r() * 26)
    g.fillStyle = `rgb(${v - 6},${v},${v + 3})`; g.fillRect(x, y, w, w)
    for (let k = 0; k < 7; k++) { const cx = x + r() * w, cy = y + r() * w, R = 20 + r() * 70, q = g.createRadialGradient(cx, cy, 0, cx, cy, R), d = r() < 0.5 ? '60,64,66' : '150,152,148'; q.addColorStop(0, `rgba(${d},0.16)`); q.addColorStop(1, `rgba(${d},0)`); g.fillStyle = q; g.fillRect(x, y, w, w) }
    for (let k = 0; k < 500; k++) { const u = 50 + Math.floor(r() * 110); g.fillStyle = `rgba(${u},${u},${u},${0.12 + r() * 0.2})`; g.fillRect(x + r() * w, y + r() * w, 1 + r() * 2, 1 + r() * 2) }
    g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(x, y, w, 3); g.fillRect(x, y, 3, w)
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y + w - 3, w, 3); g.fillRect(x + w - 3, y, 3, w)
    b.g.fillStyle = '#fff'; b.g.fillRect(x + 2, y + 2, w - 4, w - 4)
  }
  return { map: tex(c), bump: tex(b.c, false) }
})

/** 砖墙：青灰的顺砖，一皮一皮错缝，灰缝发白，下半截颜色深一些 */
export const makeBrick = once(() => {
  const W = 512, H = 512, { c, g } = canvas(W, H), r = rng(5)
  g.fillStyle = '#b9b3a6'; g.fillRect(0, 0, W, H)
  const bw = 64, bh = 21.33
  for (let row = 0; row < 24; row++) for (let k = -1; k < 9; k++) {
    const x = k * bw + (row % 2 ? bw / 2 : 0), y = row * bh, v = 88 + Math.floor(r() * 34)
    g.fillStyle = `rgb(${v + 2},${v + 4},${v + 6})`; g.fillRect(x + 2, y + 2, bw - 4, bh - 4)
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 2, y + 2, bw - 4, 2)
  }
  speck(g, W, H, 7000, '40,40,40', '200,200,195', r, 0.16)
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
  for (let i = 0; i < knots; i++) { const x = r() * W, y = r() * H; for (let k = 8; k > 0; k--) { g.strokeStyle = dark; g.globalAlpha = 0.18; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, k * 3.4, k * 1.4, 0, 0, 7); g.stroke() } }
  g.globalAlpha = 1
  return tex(c)
}
export const woodLight = once(() => makeWood('#c99f6e', '#7a5530', 5))
export const woodDark = once(() => makeWood('#6a4429', '#2e1b0e', 8, 1))
export const woodRed = once(() => makeWood('#7a3424', '#3a140b', 21, 1))

/** 红纸：大红，带一点纤维和深浅；凹凸图让纸面看得出不是塑料 */
export const makeRedPaper = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(31)
  g.fillStyle = '#c8191c'; g.fillRect(0, 0, S, S)
  blotch(g, S, S, 30, '230,40,40', r, 0.25); blotch(g, S, S, 20, '140,10,14', r, 0.2)
  for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '255,90,90' : '120,0,0'},${0.12 + r() * 0.18})`; g.lineWidth = 0.6; g.beginPath(); const x = r() * S, y = r() * S, a = r() * 6; g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8, x + Math.cos(a + 0.6) * 16, y + Math.sin(a + 0.6) * 16); g.stroke() }
  return tex(c)
})

/** 白布：细密的经纬纹，有一点发黄 */
export const makeCotton = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(41)
  g.fillStyle = '#eee9dc'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < S; i += 2) { g.fillStyle = `rgba(150,140,120,${0.05 + r() * 0.07})`; g.fillRect(0, i, S, 1); g.fillRect(i, 0, 1, S) }
  blotch(g, S, S, 12, '200,190,160', r, 0.1)
  return tex(c)
})

/** 白釉方砖台面：一块 10 cm，一张图 8 × 8 块；釉面略带青白，灰缝米灰；每块砖上还用铅笔画了 5 cm 一格的细线 */
export const makeGlaze = once(() => {
  const S = 1024, N = 8, P = S / N, { c, g } = canvas(S), r = rng(51)
  g.fillStyle = '#a7a397'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = i * P + 3, y = j * P + 3, w = P - 6, v = 236 + Math.floor(r() * 10)
    const q = g.createLinearGradient(x, y, x + w, y + w); q.addColorStop(0, `rgb(${v},${v + 2},${v})`); q.addColorStop(1, `rgb(${v - 10},${v - 7},${v - 8})`)
    g.fillStyle = q; g.fillRect(x, y, w, w)
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x, y, w, 2)
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(120,130,130,${0.05 + r() * 0.08})`; g.fillRect(x + r() * w, y + r() * w, 1, 1) }
  }
  // 铅笔格：5 cm 一格（半块砖）
  g.strokeStyle = 'rgba(70,74,80,0.34)'; g.lineWidth = 1.4
  for (let k = 0; k <= N * 2; k++) { const t = k * P / 2; g.beginPath(); g.moveTo(t, 0); g.lineTo(t, S); g.stroke(); g.beginPath(); g.moveTo(0, t); g.lineTo(S, t); g.stroke() }
  return tex(c)
})

/** 木板上的铅笔格：浅色松木拼板，step 像素一格 */
function pencilBoard(seed: number, cells: number, base: string, line: string) {
  const S = 1024, { c, g } = canvas(S), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 220; i++) {
    const y = r() * S, amp = 1 + r() * 5, ph = r() * 6
    g.strokeStyle = '#8a6438'; g.globalAlpha = 0.06 + r() * 0.16; g.lineWidth = 0.8 + r() * 2
    g.beginPath(); for (let x = 0; x <= S; x += 8) g.lineTo(x, y + Math.sin(x / S * Math.PI * 4 + ph) * amp); g.stroke()
  }
  g.globalAlpha = 1
  const P = S / cells
  g.strokeStyle = line; g.lineWidth = 1.6
  for (let k = 0; k <= cells; k++) { g.beginPath(); g.moveTo(k * P, 0); g.lineTo(k * P, S); g.stroke(); g.beginPath(); g.moveTo(0, k * P); g.lineTo(S, k * P); g.stroke() }
  return tex(c)
}
/** 第 3 课花窗底板：一张图 10 × 10 格 */
export const makeBoardGrid = once(() => pencilBoard(61, 10, '#d8b98c', 'rgba(60,50,40,0.32)'))
/** 第 4 课风车板：一张图 12 × 12 格 */
export const makePinBoard = once(() => pencilBoard(67, 12, '#e2c9a0', 'rgba(60,50,40,0.22)'))

/** 描图纸：半透明的白纸，4 cm 一格的淡蓝格子；一张图 10 × 10 格 */
export const makeTracing = once(() => {
  const S = 512, { c, g } = canvas(S), N = 10, P = S / N
  g.fillStyle = '#f6f8f7'; g.fillRect(0, 0, S, S)
  g.strokeStyle = 'rgba(90,140,170,0.45)'; g.lineWidth = 1.2
  for (let k = 0; k <= N; k++) { g.beginPath(); g.moveTo(k * P, 0); g.lineTo(k * P, S); g.stroke(); g.beginPath(); g.moveTo(0, k * P); g.lineTo(S, k * P); g.stroke() }
  return tex(c)
})

/** 木花窗：深色木条的方格套菱形（透明处是空的），用在墙上的窗洞里 */
export const makeLattice = once(() => {
  const S = 512, { c, g } = canvas(S)
  g.clearRect(0, 0, S, S)
  g.strokeStyle = '#4a2e1b'; g.lineCap = 'square'
  const n = 4, P = S / n
  g.lineWidth = 16
  for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * P, 0); g.lineTo(k * P, S); g.stroke(); g.beginPath(); g.moveTo(0, k * P); g.lineTo(S, k * P); g.stroke() }
  g.lineWidth = 10
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = i * P, y = j * P; g.beginPath(); g.moveTo(x + P / 2, y + 14); g.lineTo(x + P - 14, y + P / 2); g.lineTo(x + P / 2, y + P - 14); g.lineTo(x + 14, y + P / 2); g.closePath(); g.stroke(); g.beginPath(); g.arc(x + P / 2, y + P / 2, 9, 0, 7); g.fillStyle = '#4a2e1b'; g.fill() }
  return tex(c)
})

/** 蓝印花布：靛蓝底、白色的小团花和点子，晾在竹竿上 */
export const makeIndigo = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(71)
  g.fillStyle = '#1d2f5e'; g.fillRect(0, 0, S, S)
  blotch(g, S, S, 30, '40,70,130', r, 0.25)
  g.fillStyle = '#e9edf2'
  const flower = (x: number, y: number, R: number) => { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * R, y + Math.sin(a) * R, R * 0.55, R * 0.28, a, 0, 7); g.fill() } g.beginPath(); g.arc(x, y, R * 0.3, 0, 7); g.fill() }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) flower(i * 128 + 64 + (j % 2) * 32, j * 128 + 64, 22)
  for (let i = 0; i < 260; i++) { g.beginPath(); g.arc(r() * S, r() * S, 1.5 + r() * 2, 0, 7); g.fill() }
  g.fillStyle = 'rgba(29,47,94,0.35)'; for (let i = 0; i < 4000; i++) g.fillRect(r() * S, r() * S, 1, 1)
  return tex(c)
})

/** 白墙：灰浆抹面，略有斑驳 */
export const makePlaster = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(81)
  g.fillStyle = '#e4dfd3'; g.fillRect(0, 0, S, S)
  blotch(g, S, S, 80, '200,194,180', r, 0.22); blotch(g, S, S, 40, '250,248,240', r, 0.25)
  speck(g, S, S, 5000, '150,146,136', '255,255,250', r)
  return tex(c)
})

/** 小青瓦：一垄一垄 */
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
  speck(g, W, H, 2500, '20,20,20', '120,124,120', r)
  return tex(c)
})
