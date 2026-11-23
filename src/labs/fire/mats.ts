// 程序画出来的贴图：实验厅的地砖、实验台面、训练塔的砖墙、训练场的地面标线、文字牌、安全标志、灭火器的标签。不用下载素材。
import * as THREE from 'three'
import type { Ext, Sign } from './physics'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }

/** 实验厅的地砖：浅灰的 60 cm 方砖，砖缝深一点，每块深浅略有不同 */
export const tileTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 196 + Math.floor(r() * 14); g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.fillRect(i * 256, j * 256, 256, 256) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,118,112' : '250,250,246'},${0.06 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  g.fillStyle = '#8f8c86'; for (const k of [0, 256]) { g.fillRect(k, 0, 3, S); g.fillRect(0, k, S, 3) }
  return tex(c)
})

/** 实验台面：深灰的环氧树脂板，有一点点斑 */
export const epoxyTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#464c51'; g.fillRect(0, 0, S, S)
  // 浅浅的云斑和细划痕：用久了的实验台面
  for (let i = 0; i < 60; i++) { const x = r() * S, y = r() * S, R = 10 + r() * 40; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(30,34,38,0.25)' : 'rgba(100,108,114,0.2)'); q.addColorStop(1, 'rgba(70,76,81,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,22,26' : '120,128,134'},${0.12 + r() * 0.15})`; g.fillRect(r() * S, r() * S, 1, 1) }
  for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, l = 6 + r() * 30, a = (r() - 0.5) * 0.6; g.strokeStyle = `rgba(150,158,164,${0.08 + r() * 0.1})`; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke() }
  return tex(c)
})

/** 训练塔的墙：红砖一顺一丁，砖缝灰白；烟熏过的地方发黑 */
export const brickTex = once(() => {
  const W = 512, H = 512, { c, g } = canvas(W, H), r = rng(21)
  g.fillStyle = '#b9b2a4'; g.fillRect(0, 0, W, H)
  const bh = 16, bw = 64
  for (let row = 0; row < H / bh; row++) {
    const off = row % 2 ? bw / 2 : 0
    for (let x = -bw; x < W + bw; x += bw) {
      const v = 0.78 + r() * 0.25
      g.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(66 * v)},${Math.round(48 * v)})`
      g.fillRect(x + off + 2, row * bh + 2, bw - 3, bh - 3)
    }
  }
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, R = 30 + r() * 80; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(30,26,24,0.22)'); q.addColorStop(1, 'rgba(30,26,24,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  return tex(c)
})

/** 训练场的混凝土地：浅灰，抹出来的弧纹，一道道伸缩缝，几块烧黑的地方 */
export const yardTex = once(() => {
  const S = 1024, { c, g } = canvas(S), r = rng(8)
  g.fillStyle = '#a7a49c'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 260; i++) { const x = r() * S, y = r() * S, R = 40 + r() * 140; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(120,116,108,0.22)' : 'rgba(196,192,182,0.22)'); q.addColorStop(1, 'rgba(170,166,158,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 18000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '86,84,80' : '214,210,200'},${0.08 + r() * 0.18})`; g.fillRect(r() * S, r() * S, 1 + r() * 1.6, 1 + r() * 1.6) }
  g.strokeStyle = 'rgba(66,64,60,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 1); g.lineTo(S, 1); g.moveTo(1, 0); g.lineTo(1, S); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.moveTo(0, S / 2); g.lineTo(S, S / 2); g.stroke()
  return tex(c)
})

/** 草坪：深浅两种绿掺在一起，密密的细草 */
export const grassTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(3)
  g.fillStyle = '#5d7a3a'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 160; i++) { const x = r() * S, y = r() * S, R = 20 + r() * 60; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(70,96,40,0.5)' : 'rgba(120,140,70,0.4)'); q.addColorStop(1, 'rgba(90,120,60,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 30000; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(48,72,28,0.5)' : v < 0.85 ? 'rgba(120,150,70,0.45)' : 'rgba(170,170,100,0.4)'; g.fillRect(r() * S, r() * S, 1, 2 + r() * 3) }
  return tex(c)
})

/** 黄黑相间的警示条 */
export const hazardTex = once(() => {
  const { c, g } = canvas(256, 32)
  g.fillStyle = '#e3b21c'; g.fillRect(0, 0, 256, 32); g.fillStyle = '#1d1d1b'
  for (let x = -32; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill() }
  return tex(c)
})

/** 一块写字的牌子：底色、字色，lines 每行一句，第一行大 */
export function makeSign(lines: string[], bg: string, fg: string, w = 512, h = 160) {
  const { c, g } = canvas(w, h)
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
  const big = Math.round(h * (lines.length > 1 ? 0.36 : 0.5))
  g.font = `700 ${big}px "PingFang SC", "Microsoft YaHei", sans-serif`; g.fillText(lines[0], w / 2, lines.length > 1 ? h * 0.36 : h / 2)
  if (lines[1]) { g.font = `500 ${Math.round(h * 0.18)}px "PingFang SC", "Microsoft YaHei", sans-serif`; g.fillText(lines[1], w / 2, h * 0.75) }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

/** 规程牌：白底，一个标题、几条规矩 */
export function makeBoard(title: string, rules: string[]) {
  const W = 384, H = 512, { c, g } = canvas(W, H)
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, W, H); g.fillStyle = '#b5372b'; g.fillRect(0, 0, W, 86)
  g.fillStyle = '#fff'; g.font = '700 42px "PingFang SC", "Microsoft YaHei", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, W / 2, 44)
  g.fillStyle = '#2a2b2d'; g.textAlign = 'left'; g.font = '500 25px "PingFang SC", "Microsoft YaHei", sans-serif'
  rules.forEach((s, i) => { g.fillText(`${i + 1}. ${s}`, 24, 130 + i * 58) })
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

/** 元素周期表的挂图：一格一格的色块（只是墙上的配景，不写元素） */
export const posterTex = once(() => {
  const W = 512, H = 300, { c, g } = canvas(W, H), cols = ['#e6a15a', '#f0d27a', '#9cc8e8', '#a8d8a0', '#d6b4e0', '#f2b6a8']
  g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, W, H)
  const cell = 26, x0 = 20, y0 = 40
  const has = (r: number, k: number) => r === 0 ? k === 0 || k === 17 : r < 3 ? k < 2 || k > 11 : true
  for (let r = 0; r < 7; r++) for (let k = 0; k < 18; k++) if (has(r, k)) { g.fillStyle = cols[(k < 2 ? 0 : k > 11 ? 3 + (k % 3) : 2 + (k % 2)) % cols.length]; g.fillRect(x0 + k * cell + 1, y0 + r * cell + 1, cell - 2, cell - 2) }
  for (let k = 0; k < 15; k++) for (let r = 0; r < 2; r++) { g.fillStyle = cols[4 + r]; g.fillRect(x0 + (k + 2) * cell + 1, y0 + 7.4 * cell + r * cell + 1, cell - 2, cell - 2) }
  g.fillStyle = '#2a2b2d'; g.fillRect(x0, 14, 180, 12)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
})

/** 灭火器的标签：白底，一条红边，几行字 */
export function makeExtLabel(e: Ext) {
  const W = 256, H = 384, { c, g } = canvas(W, H)
  g.fillStyle = '#f5f3ee'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#c3281f'; g.fillRect(0, 0, W, 14); g.fillRect(0, H - 14, W, 14)
  g.fillStyle = '#1e1f21'; g.textAlign = 'center'; g.textBaseline = 'middle'
  const name = { water: ['水基型', '灭火器'], powder: ['干粉', '灭火器'], co2: ['二氧化碳', '灭火器'] }[e]
  g.font = `700 ${e === 'co2' ? 44 : 54}px "PingFang SC", "Microsoft YaHei", sans-serif`; g.fillText(name[0], W / 2, 70)
  g.font = '700 46px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillText(name[1], W / 2, 128)
  // 使用方法的四个小方框
  g.strokeStyle = '#1e1f21'; g.lineWidth = 3
  for (let i = 0; i < 4; i++) { const x = 18 + i * 57; g.strokeRect(x, 172, 50, 64); g.fillStyle = '#1e1f21'; g.font = '600 22px sans-serif'; g.fillText(String(i + 1), x + 25, 252 + 14) }
  g.fillStyle = '#c3281f'; g.font = '700 22px sans-serif'
  g.fillText(['提', '拔', '握', '压'].join('   '), W / 2, 310)
  g.fillStyle = '#5a5b5d'; g.font = '500 18px sans-serif'; g.fillText(e === 'co2' ? 'MT/5' : e === 'water' ? 'MSWZ/6' : 'MFZ/ABC4', W / 2, 346)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

/** 压力表的表盘：白底，红黄绿三段弧，黑指针另外画 */
export const gaugeTex = once(() => {
  const S = 256, { c, g } = canvas(S)
  g.fillStyle = '#f6f6f2'; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.fill()
  const arc = (a0: number, a1: number, col: string) => { g.strokeStyle = col; g.lineWidth = 26; g.beginPath(); g.arc(S / 2, S / 2, S * 0.36, a0, a1); g.stroke() }
  const A = (k: number) => Math.PI * (0.75 + 1.5 * k)
  arc(A(0), A(0.3), '#d23a2f'); arc(A(0.3), A(0.6), '#2f9d4a'); arc(A(0.6), A(1), '#e3b21c')
  g.strokeStyle = '#222'; g.lineWidth = 3
  for (let i = 0; i <= 10; i++) { const a = A(i / 10); g.beginPath(); g.moveTo(S / 2 + Math.cos(a) * S * 0.44, S / 2 + Math.sin(a) * S * 0.44); g.lineTo(S / 2 + Math.cos(a) * S * 0.3, S / 2 + Math.sin(a) * S * 0.3); g.stroke() }
  g.fillStyle = '#222'; g.font = '700 30px sans-serif'; g.textAlign = 'center'; g.fillText('MPa', S / 2, S * 0.78)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
})

/** 安全标志：禁止类是白底红圈红斜杠，警告类是黄底黑边三角。图形是简化的示意 */
const signCache = new Map<Sign, THREE.CanvasTexture>()
export function makeSafetySign(k: Sign) {
  const hit = signCache.get(k); if (hit) return hit
  const W = 256, H = 320, { c, g } = canvas(W, H), cx = W / 2, cy = 120
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H)
  const ink = '#1d1d1b'
  // 图形：一团火、一支烟、一挂鞭炮、一个炸开的东西
  const flame = (x: number, y: number, s: number) => { g.fillStyle = ink; g.beginPath(); g.moveTo(x, y - s); g.bezierCurveTo(x + s * 0.9, y - s * 0.2, x + s * 0.6, y + s * 0.7, x, y + s * 0.7); g.bezierCurveTo(x - s * 0.6, y + s * 0.7, x - s * 0.8, y - s * 0.1, x - s * 0.2, y - s * 0.4); g.bezierCurveTo(x - s * 0.15, y - s * 0.1, x + s * 0.05, y - s * 0.2, x, y - s); g.fill() }
  if (k === 'boom') {
    g.fillStyle = '#f2c21b'; g.beginPath(); g.moveTo(cx, 18); g.lineTo(W - 16, 208); g.lineTo(16, 208); g.closePath(); g.fill()
    g.strokeStyle = ink; g.lineWidth = 12; g.lineJoin = 'round'; g.stroke()
    g.fillStyle = ink; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, R = i % 2 ? 22 : 50; g.lineTo(cx + Math.cos(a) * R, 140 + Math.sin(a) * R * 0.8) } g.fill()
  } else {
    if (k === 'fire') { flame(cx, cy + 6, 44); g.fillRect(cx - 4, cy + 46, 8, 34) }
    if (k === 'smoke') { g.fillStyle = ink; g.fillRect(cx - 58, cy + 8, 100, 18); g.fillStyle = '#d0a070'; g.fillRect(cx + 42, cy + 8, 20, 18); g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 50, cy); g.bezierCurveTo(cx - 70, cy - 20, cx - 30, cy - 40, cx - 50, cy - 62); g.stroke() }
    if (k === 'cracker') { g.fillStyle = ink; for (let i = 0; i < 4; i++) { g.fillRect(cx - 34 + (i % 2) * 40, cy - 40 + i * 22, 28, 16) } g.fillRect(cx - 3, cy - 64, 6, 120); flame(cx + 4, cy - 70, 14) }
    g.strokeStyle = '#d2231c'; g.lineWidth = 22; g.beginPath(); g.arc(cx, cy, 86, 0, 7); g.stroke()
    g.beginPath(); g.moveTo(cx - 61, cy - 61); g.lineTo(cx + 61, cy + 61); g.stroke()
  }
  // 下面的文字条
  g.fillStyle = k === 'boom' ? '#f2c21b' : '#d2231c'; g.fillRect(0, 232, W, 88)
  g.fillStyle = k === 'boom' ? ink : '#ffffff'; g.font = '700 40px "PingFang SC", "Microsoft YaHei", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText({ fire: '禁止烟火', smoke: '禁止吸烟', boom: '当心爆炸', cracker: '禁止燃放鞭炮' }[k], cx, 276, W - 20)
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  signCache.set(k, t)
  return t
}

/** 温度计的刻度：白底黑线，每 10 °C 一个数 */
export const thermoTex = once(() => {
  const W = 64, H = 512, { c, g } = canvas(W, H)
  g.fillStyle = '#f3f1ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#1d1d1b'; g.font = '700 22px sans-serif'; g.textAlign = 'right'
  for (let t = 0; t <= 100; t += 2) { const y = H - 20 - t / 100 * (H - 40); g.fillRect(36, y - 1, t % 10 === 0 ? 26 : 12, 2); if (t % 20 === 0) g.fillText(String(t), 34, y + 8) }
  const tx = tex(c); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping
  return tx
})

/** 边缘不规则地淡出：给一张贴图的透明度乘上一圈带噪声的渐隐（hard 为真的那一边不淡出，用在火线那一边） */
function fadeEdges(g: CanvasRenderingContext2D, W: number, H: number, margin: number, seed: number, hardBottom = false) {
  const img = g.getImageData(0, 0, W, H), d = img.data, r = rng(seed)
  const wob = Array.from({ length: 64 }, () => r())
  const n = (t: number) => { const i = Math.floor(t * 63), f = t * 63 - i; return wob[i] * (1 - f) + wob[Math.min(63, i + 1)] * f }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H
    const e = Math.min(u, 1 - u, v, hardBottom ? 1 : 1 - v) - margin * (0.4 + 0.6 * n((u + v * 0.7) % 1))
    const a = Math.max(0, Math.min(1, e / margin + 0.5))
    d[(y * W + x) * 4 + 3] *= a * a * (3 - 2 * a)
  }
  g.putImageData(img, 0, 0)
}

/** 枯草地：黄褐色的干草，一丛丛深浅不一，边缘和周围的绿草地自然过渡 */
export const dryGrassTex = once(() => {
  const W = 512, H = 320, { c, g } = canvas(W, H), r = rng(13)
  g.fillStyle = '#a58c52'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 140; i++) { const x = r() * W, y = r() * H, R = 14 + r() * 50; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(120,98,54,0.45)' : 'rgba(196,172,110,0.4)'); q.addColorStop(1, 'rgba(165,140,82,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 26000; i++) { const v = r(); g.fillStyle = v < 0.4 ? 'rgba(110,88,46,0.5)' : v < 0.8 ? 'rgba(214,190,128,0.45)' : 'rgba(120,130,70,0.35)'; g.fillRect(r() * W, r() * H, 1, 2 + r() * 4) }
  fadeEdges(g, W, H, 0.12, 5)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
})

/** 烧过的草地：焦黑，夹着灰白的草灰；靠火线那一边（贴图的下沿）不淡出 */
export const burntTex = once(() => {
  const W = 512, H = 256, { c, g } = canvas(W, H), r = rng(29)
  g.fillStyle = '#211d19'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H, R = 10 + r() * 40; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.6 ? 'rgba(10,8,6,0.6)' : 'rgba(90,84,76,0.35)'); q.addColorStop(1, 'rgba(33,29,25,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.7 ? '150,144,134' : '60,52,44'},${0.15 + r() * 0.3})`; g.fillRect(r() * W, r() * H, 1, 1 + r() * 2) }
  fadeEdges(g, W, H, 0.1, 7, true)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
})
