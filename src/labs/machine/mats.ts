// 程序画出来的贴图：工地的砂石地、水泥地、木纹、彩钢瓦、红砖墙、楼的窗、安全网、围挡、沙堆。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }

/** 砂石地：黄褐色的土上撒满大小不一的碎石，压过的地方颜色深一点 */
export function makeGravel(seed = 4, base = '#8a806d') {
  const S = 512, { c, g } = canvas(S), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 260; i++) {
    const x = r() * S, y = r() * S, R = 24 + r() * 90, col = r() < 0.5 ? '112,102,86' : '156,146,126'
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, R); q.addColorStop(0, `rgba(${col},0.3)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - R, y + oy - R, R * 2, R * 2) }
  }
  // 细砂：密密的小点；碎石：少量稍大、颜色各异的小石子
  for (let i = 0; i < 26000; i++) { const v = 95 + Math.floor(r() * 90); g.fillStyle = `rgba(${v},${v - 6},${v - 18},${0.18 + r() * 0.3})`; g.fillRect(r() * S, r() * S, 1 + r() * 1.2, 1 + r() * 1.2) }
  for (let i = 0; i < 1400; i++) {
    const x = r() * S, y = r() * S, R = 0.8 + r() * r() * 2.6, v = 110 + Math.floor(r() * 100), t = r()
    g.fillStyle = `rgba(${v + (t < 0.3 ? 12 : 0)},${v - 6},${v - 16 - (t > 0.7 ? 14 : 0)},${0.45 + r() * 0.4})`; g.beginPath(); g.ellipse(x, y, R * 1.3, R, r() * 3, 0, 7); g.fill()
  }
  return tex(c)
}

/** 水泥地：浅灰，抹子留下的淡淡的弧纹，几道伸缩缝 */
export function makeConcrete(seed = 8) {
  const S = 512, { c, g } = canvas(S), r = rng(seed)
  g.fillStyle = '#a9a69d'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 160; i++) { const x = r() * S, y = r() * S, R = 30 + r() * 90; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(130,126,118,0.25)' : 'rgba(190,186,176,0.25)'); q.addColorStop(1, 'rgba(170,166,158,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,88,82' : '210,206,198'},${0.1 + r() * 0.2})`; g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5) }
  g.strokeStyle = 'rgba(70,68,64,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 1); g.lineTo(S, 1); g.moveTo(1, 0); g.lineTo(1, S); g.stroke()
  return tex(c)
}

/** 木纹：顺着 x 方向的长纹，偶尔一个节疤 */
export function makeWood(base: string, dark: string, seed = 5, knots = 2) {
  const W = 512, H = 256, { c, g } = canvas(W, H), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 160; i++) {
    const y = r() * H, amp = 1 + r() * 4, ph = r() * 6, k = 1 + Math.floor(r() * 2)
    g.strokeStyle = `rgba(${dark},${0.05 + r() * 0.2})`; g.lineWidth = 0.6 + r() * 2.2; g.beginPath()
    for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x / W * Math.PI * 2 * k + ph) * amp)
    g.stroke()
  }
  for (let i = 0; i < knots; i++) { const x = r() * W, y = r() * H; for (let k = 6; k > 0; k--) { g.strokeStyle = `rgba(${dark},${0.12 + k * 0.04})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, k * 4, k * 1.8, 0, 0, 7); g.stroke() } }
  return tex(c)
}

/** 彩钢瓦：一道道压出来的波峰，峰上亮、谷里暗。颜色 rgb 是 [r,g,b] */
export function makeSteelSheet(rgb: [number, number, number], ribs = 8) {
  const W = 256, H = 64, { c, g } = canvas(W, H), r = rng(31)
  for (let x = 0; x < W; x++) {
    const ph = (x / W) * ribs % 1, k = ph < 0.16 ? 1.12 : ph < 0.22 ? 0.72 : ph < 0.9 ? 0.95 + 0.04 * Math.sin(ph * 9) : 0.82
    g.fillStyle = `rgb(${rgb.map(v => Math.min(255, Math.round(v * k))).join(',')})`; g.fillRect(x, 0, 1, H)
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.6 ? '70,60,50' : '230,230,230'},${0.04 + r() * 0.08})`; g.fillRect(r() * W, r() * H, 1 + r() * 18, 1) }
  return tex(c)
}

/** 红砖墙：一顺一丁地砌，砖缝是灰白的砂浆，每块砖深浅略有不同 */
export function makeBrick(seed = 12) {
  const W = 256, H = 256, { c, g } = canvas(W, H), r = rng(seed)
  g.fillStyle = '#b9b2a4'; g.fillRect(0, 0, W, H)
  const bh = 16, bw = 48
  for (let row = 0; row < H / bh; row++) for (let i = -1; i < W / bw + 1; i++) {
    const x = i * bw + (row % 2) * bw / 2, v = r()
    g.fillStyle = `rgb(${150 + v * 40},${70 + v * 22},${52 + v * 16})`; g.fillRect(x + 1.5, row * bh + 1.5, bw - 3, bh - 3)
    g.fillStyle = 'rgba(40,20,14,0.12)'; g.fillRect(x + 1.5, row * bh + bh - 4, bw - 3, 2.5)
  }
  return tex(c)
}

/** 楼的外立面：一格格的窗，玻璃反着天光，有的亮着灯。cols、rows 是一张贴图里几列几行 */
export function makeWindows(seed: number, wall: string, cols = 4, rows = 4) {
  const S = 256, { c, g } = canvas(S), r = rng(seed)
  g.fillStyle = wall; g.fillRect(0, 0, S, S)
  const cw = S / cols, rh = S / rows
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const lit = r() < 0.12, v = r()
    g.fillStyle = lit ? `rgb(${220 + v * 30},${200 + v * 30},${150})` : `rgb(${70 + v * 40},${90 + v * 40},${110 + v * 40})`
    g.fillRect(i * cw + cw * 0.18, j * rh + rh * 0.22, cw * 0.64, rh * 0.56)
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(i * cw + cw * 0.18, j * rh + rh * 0.22, cw * 0.64, rh * 0.08)
  }
  return tex(c)
}

/** 密目安全网：绿色的细网，带一点透光 */
export function makeNet() {
  const S = 128, { c, g } = canvas(S), r = rng(17)
  g.fillStyle = 'rgba(46,110,64,0.86)'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < S; i += 4) { g.fillStyle = 'rgba(20,60,30,0.5)'; g.fillRect(i, 0, 1, S); g.fillRect(0, i, S, 1) }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,160,100' : '20,50,26'},0.25)`; g.fillRect(r() * S, r() * S, 2, 2) }
  return tex(c)
}

/** 围挡：蓝色的彩钢板，上下两道白边，每块板之间一道立柱 */
export function makeHoarding() {
  const W = 512, H = 128, { c, g } = canvas(W, H)
  g.fillStyle = '#2f5f93'; g.fillRect(0, 0, W, H)
  for (let x = 0; x < W; x += 16) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, 0, 3, H) }
  g.fillStyle = '#e8edf1'; g.fillRect(0, 0, W, 12); g.fillRect(0, H - 14, W, 14)
  g.fillStyle = '#1f3e61'; g.fillRect(0, 0, 6, H); g.fillRect(W / 2, 0, 6, H)
  return tex(c)
}

/** 沙子：细密的黄沙，带一点湿的深色 */
export function makeSand() {
  const S = 256, { c, g } = canvas(S), r = rng(21)
  g.fillStyle = '#c2a679'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(150,124,86,${0.2 + r() * 0.3})` : `rgba(222,204,166,${0.2 + r() * 0.3})`; g.fillRect(r() * S, r() * S, 1, 1) }
  return tex(c)
}

/** 一块写着字的牌子：底色、字色，几行字 */
export function makeSign(lines: string[], bg: string, fg: string, w = 512, h = 160) {
  const { c, g } = canvas(w, h)
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16)
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
  lines.forEach((t, i) => { g.font = `700 ${i ? 0.18 * h : 0.32 * h}px sans-serif`; g.fillText(t, w / 2, h * (lines.length === 1 ? 0.52 : 0.38 + i * 0.32)) })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

/** 墙上的一张规程：标题一行，下面几条，白底深字 */
export function makeBoard(title: string, lines: string[]) {
  const w = 480, h = 320, { c, g } = canvas(w, h)
  g.fillStyle = '#e8e6dd'; g.fillRect(0, 0, w, h); g.fillStyle = '#24476b'; g.fillRect(0, 0, w, 64)
  g.fillStyle = '#f3f1ea'; g.font = '700 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, w / 2, 33)
  g.fillStyle = '#23282d'; g.textAlign = 'left'; g.font = '500 25px sans-serif'
  lines.forEach((t, i) => { g.fillText(`${i + 1}. ${t}`, 28, 100 + i * 46) })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
