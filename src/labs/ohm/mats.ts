// 程序画出来的贴图：电表表盘、接线柱下的印字、水泥电阻上的印字、色环、防静电台垫、环氧地坪、彩钢板墙、百叶挂板、标牌、油量表表盘。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true, wrap = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'
const cache = new Map<string, THREE.Texture>()
const once = (key: string, f: () => THREE.Texture) => { let t = cache.get(key); if (!t) { t = f(); cache.set(key, t) } return t }

// ---------- 电表 ----------
/** 表盘：上排大量程、下排小量程，中间一条镜面弧带，印着 A 或 V。指针转轴在 (cx, cy) */
export const DIAL = { w: 1024, h: 680, cx: 512, cy: 640, r1: 500, r2: 420, half: 46 }
export function makeDial(kind: 'A' | 'V' | 'mA') {
  return once(`dial${kind}`, () => {
    const { w, h, cx, cy, r1, r2, half } = DIAL, { c, g } = canvas(w, h)
    g.fillStyle = '#f5f3ec'; g.fillRect(0, 0, w, h)
    const hi = kind === 'A' ? ['0', '1', '2', '3'] : kind === 'mA' ? ['0', '100', '200', '300'] : ['0', '5', '10', '15']
    const lo = kind === 'A' ? ['0', '0.2', '0.4', '0.6'] : kind === 'mA' ? [] : ['0', '1', '2', '3']
    const a0 = -Math.PI / 2 - half * Math.PI / 180, a1 = -Math.PI / 2 + half * Math.PI / 180
    const at = (k: number, R: number): [number, number] => { const a = a0 + (a1 - a0) * k; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R] }
    // 镜面弧带：读数时眼睛、指针、镜中的影子三点一线
    g.fillStyle = '#c3c8cc'; g.beginPath(); g.arc(cx, cy, r2 + 46, a0, a1); g.arc(cx, cy, r2 + 28, a1, a0, true); g.fill()
    g.strokeStyle = '#1b1d20'; g.lineWidth = 3
    for (const R of [r1, r2]) { g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke() }
    for (let i = 0; i <= 30; i++) {
      const k = i / 30, big = i % 10 === 0, mid = i % 5 === 0
      g.lineWidth = big ? 4.5 : 2.2
      let [x0, y0] = at(k, r1), [x1, y1] = at(k, r1 + (big ? 36 : mid ? 25 : 15)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      [x0, y0] = at(k, r2); [x1, y1] = at(k, r2 - (big ? 36 : mid ? 25 : 15)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
    }
    g.fillStyle = '#1b1d20'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `600 46px ${FONT}`; hi.forEach((l, i) => { const [x, y] = at(i / 3, r1 + 70); g.fillText(l, x, y) })
    g.fillStyle = '#9c2a20'; g.font = `700 44px ${FONT}`; lo.forEach((l, i) => { const [x, y] = at(i / 3, r2 - 66); g.fillText(l, x, y) })
    g.fillStyle = '#1b1d20'; g.font = `700 ${kind === 'mA' ? 104 : 120}px "Times New Roman",serif`; g.fillText(kind, cx, cy - 215)
    g.font = `400 28px ${FONT}`; g.fillStyle = '#55595e'; g.fillText('1.5', cx + 290, cy - 52); g.fillText('━━', cx - 290, cy - 52)
    g.strokeStyle = '#55595e'; g.lineWidth = 2; g.beginPath(); g.arc(cx + 290, cy - 52, 30, 0, Math.PI * 2); g.stroke()
    return tex(c, true, false)
  })
}
/** 一行均匀排开的几个字（接线柱下面的标记、铭牌） */
export function makeMarks(marks: string[], { w = 512, h = 64, bg = '#1d1f22', fg = '#e9e6dc', size = 40, colors, weight = 700 }: { w?: number; h?: number; bg?: string; fg?: string; size?: number; colors?: string[]; weight?: number } = {}) {
  return once(`m${marks.join('|')}${w}${h}${bg}${fg}${size}${colors?.join()}${weight}`, () => {
    const { c, g } = canvas(w, h)
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${weight} ${size}px ${FONT}`
    marks.forEach((m, i) => { g.fillStyle = colors?.[i] ?? fg; g.fillText(m, w / marks.length * (i + 0.5), h / 2 + 2) })
    return tex(c, true, false)
  })
}
/** 几行字居中（标牌、印字） */
export function makeText(lines: string[], { w = 256, h = 64, bg = '#1d1f22', fg = '#e9e6dc', size = 40, weight = 700, gap = 1.25 }: { w?: number; h?: number; bg?: string; fg?: string; size?: number; weight?: number; gap?: number } = {}) {
  return once(`t${lines.join('|')}${w}${h}${bg}${fg}${size}${weight}${gap}`, () => {
    const { c, g } = canvas(w, h)
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${weight} ${size}px ${FONT}`
    const n = lines.length, y0 = h / 2 - (n - 1) * size * gap / 2
    lines.forEach((l, i) => g.fillText(l, w / 2, y0 + i * size * gap + 2))
    return tex(c, true, false)
  })
}

// ---------- 元件 ----------
/** 水泥电阻的瓷壳：白色，细砂面，印两行字（功率、阻值和误差）。贴在正面 */
export function makeCement(lines: string[]) {
  return once(`cem${lines.join('|')}`, () => {
    const W = 512, H = 128, { c, g } = canvas(W, H), r = rng(lines.join('').length * 7 + 3)
    g.fillStyle = '#efede6'; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 9000; i++) { const v = 200 + Math.floor(r() * 50); g.fillStyle = `rgba(${v},${v - 2},${v - 8},${0.25 + r() * 0.3})`; g.fillRect(r() * W, r() * H, 1.4, 1.4) }
    g.fillStyle = '#1e1f22'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `700 50px ${FONT}`; g.fillText(lines.join('  '), W / 2, H / 2 + 3)
    return tex(c, true, false)
  })
}
/** 色环电阻的漆皮：浅蓝灰的底，四道色环（u 绕一圈，v 沿着电阻的长度方向）。bands 是从一头数起的颜色 */
export const BAND_RGB: Record<string, string> = { 黑: '#151515', 棕: '#6b3a1e', 红: '#c22a22', 橙: '#e0731c', 黄: '#e8c21c', 绿: '#2f8a3a', 蓝: '#2a55b8', 紫: '#7a3aa8', 灰: '#8a8a8a', 白: '#f2f2f2', 金: '#c9a13b' }
export function makeBands(bands: string[]) {
  return once(`b${bands.join()}`, () => {
    const W = 64, H = 256, { c, g } = canvas(W, H)
    const q = g.createLinearGradient(0, 0, 0, H); q.addColorStop(0, '#a9b9c4'); q.addColorStop(0.5, '#b8c6cf'); q.addColorStop(1, '#a9b9c4')
    g.fillStyle = q; g.fillRect(0, 0, W, H)
    // 四道环：前三道挨着，误差环离得远一点
    const ys = [0.22, 0.36, 0.5, 0.76]
    bands.forEach((b, i) => { g.fillStyle = BAND_RGB[b]; g.fillRect(0, H * ys[i] - H * 0.045, W, H * 0.09) })
    return tex(c, true, false)
  })
}

// ---------- 车间 ----------
/** 防静电台垫：灰蓝色，橡胶的细麻面，偶尔一道浅的擦痕 */
export function makeEsdMat() {
  return once('esd', () => {
    const S = 512, { c, g } = canvas(S), r = rng(9)
    g.fillStyle = '#7f96a3'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 160; i++) {
      const x = r() * S, y = r() * S, R = 30 + r() * 90, col = r() < 0.5 ? '108,128,140' : '150,168,178'
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, R); q.addColorStop(0, `rgba(${col},0.18)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - R, y + oy - R, R * 2, R * 2) }
    }
    for (let i = 0; i < 26000; i++) { const v = 105 + Math.floor(r() * 70); g.fillStyle = `rgba(${v},${v + 16},${v + 26},${0.15 + r() * 0.2})`; g.fillRect(r() * S, r() * S, 1, 1) }
    g.lineWidth = 1; for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(170,186,196,0.25)'; g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 20); g.stroke() }
    return tex(c)
  })
}
/** 环氧地坪：灰绿色的自流平，大片极淡的深浅，细小的砂点 */
export function makeEpoxy() {
  return once('epoxy', () => {
    const S = 512, { c, g } = canvas(S), r = rng(5)
    g.fillStyle = '#7d8c83'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 120; i++) {
      const x = r() * S, y = r() * S, R = 40 + r() * 140, col = r() < 0.5 ? '104,118,110' : '146,160,150'
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, R); q.addColorStop(0, `rgba(${col},0.16)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - R, y + oy - R, R * 2, R * 2) }
    }
    for (let i = 0; i < 9000; i++) { const v = 110 + Math.floor(r() * 80); g.fillStyle = `rgba(${v},${v + 8},${v},${0.08 + r() * 0.12})`; g.fillRect(r() * S, r() * S, 1, 1) }
    return tex(c)
  })
}
/** 彩钢板墙：竖向的压型肋，一道道明暗 */
export function makePanel(base = '#d9dcdc') {
  return once(`panel${base}`, () => {
    const W = 256, H = 64, { c, g } = canvas(W, H)
    g.fillStyle = base; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 4; i++) {
      const x = i * 64
      const q = g.createLinearGradient(x, 0, x + 64, 0)
      q.addColorStop(0, 'rgba(0,0,0,0.0)'); q.addColorStop(0.08, 'rgba(0,0,0,0.16)'); q.addColorStop(0.14, 'rgba(255,255,255,0.22)'); q.addColorStop(0.22, 'rgba(0,0,0,0.05)'); q.addColorStop(0.3, 'rgba(0,0,0,0.0)'); q.addColorStop(1, 'rgba(0,0,0,0.03)')
      g.fillStyle = q; g.fillRect(x, 0, 64, H)
    }
    return tex(c)
  })
}
/** 百叶挂板（工作台后面挂零件盒的那块）：浅灰的钢板，一排排横向的挂槽 */
export function makeLouver() {
  return once('louver', () => {
    const W = 256, H = 256, { c, g } = canvas(W, H)
    g.fillStyle = '#c8ced2'; g.fillRect(0, 0, W, H)
    for (let y = 16; y < H; y += 32) for (let x = 10; x < W; x += 42) {
      g.fillStyle = '#3c4248'; g.beginPath(); g.roundRect(x, y, 30, 9, 4); g.fill()
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 2, y + 10, 26, 2)
    }
    return tex(c)
  })
}
/** 标牌：底色、字色、几行字 */
export function makeSign(lines: string[], bg: string, fg: string, w = 1024, h = 256, size = 0) {
  return makeText(lines, { w, h, bg, fg, size: size || Math.min(h / (lines.length * 1.5), w / Math.max(...lines.map(l => l.length)) * 0.9), weight: 700 })
}
/** 车间流程看板：几个工序框，中间箭头 */
export function makeFlow(steps: string[]) {
  return once(`flow${steps.join()}`, () => {
    const W = 1536, H = 256, { c, g } = canvas(W, H)
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#1f5c8a'; g.fillRect(0, 0, W, 56)
    g.fillStyle = '#ffffff'; g.font = `700 36px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('电阻器检验流程', 28, 29)
    const n = steps.length, bw = (W - 80) / n
    steps.forEach((s, i) => {
      const x = 40 + i * bw
      g.strokeStyle = '#1f5c8a'; g.lineWidth = 4; g.strokeRect(x + 10, 92, bw - 70, 110)
      g.fillStyle = '#1f2a33'; g.font = `700 40px ${FONT}`; g.textAlign = 'center'; g.fillText(s, x + 10 + (bw - 70) / 2, 148)
      if (i < n - 1) { g.fillStyle = '#1f5c8a'; g.beginPath(); g.moveTo(x + bw - 52, 132); g.lineTo(x + bw - 22, 147); g.lineTo(x + bw - 52, 162); g.fill() }
    })
    return tex(c, true, false)
  })
}
/** 防静电标志：黄底上一只黑色的手和一道斜杠，下面一行字 */
export function makeEsdSign() {
  return once('esdsign', () => {
    const W = 256, H = 320, { c, g } = canvas(W, H)
    g.fillStyle = '#f4c51c'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#141414'; g.beginPath(); g.moveTo(W / 2, 28); g.lineTo(W - 24, 230); g.lineTo(24, 230); g.closePath(); g.fill()
    g.fillStyle = '#f4c51c'; g.beginPath(); g.moveTo(W / 2, 54); g.lineTo(W - 46, 216); g.lineTo(46, 216); g.closePath(); g.fill()
    // 一只手
    g.fillStyle = '#141414'; g.beginPath(); g.roundRect(W / 2 - 22, 120, 44, 60, 10); g.fill()
    for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect(W / 2 - 22 + i * 11.5, 92 + Math.abs(i - 1.5) * 6, 9, 36, 4); g.fill() }
    g.strokeStyle = '#141414'; g.lineWidth = 8; g.beginPath(); g.moveTo(W / 2 - 50, 196); g.lineTo(W / 2 + 50, 100); g.stroke()
    g.font = `700 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('防静电区', W / 2, 276)
    return tex(c, true, false)
  })
}
/** 油量表的表盘：一段弧，左 E 右 F，中间 ½，红色的低油区 */
export function makeFuelDial() {
  return once('fuel', () => {
    const W = 512, H = 360, { c, g } = canvas(W, H), cx = W / 2, cy = 320, R = 230, half = 50 * Math.PI / 180
    g.fillStyle = '#121416'; g.fillRect(0, 0, W, H)
    const a0 = -Math.PI / 2 - half, a1 = -Math.PI / 2 + half
    g.strokeStyle = '#c33a2a'; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, R, a0, a0 + (a1 - a0) * 0.18); g.stroke()
    g.strokeStyle = '#e8e6de'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R, a0 + (a1 - a0) * 0.18, a1); g.stroke()
    for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8, big = i % 4 === 0; g.lineWidth = big ? 7 : 4; g.strokeStyle = '#e8e6de'; g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * (R - (big ? 34 : 20)), cy + Math.sin(a) * (R - (big ? 34 : 20))); g.stroke() }
    g.fillStyle = '#e8e6de'; g.font = `700 54px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    for (const [k, s] of [[0, 'E'], [0.5, '½'], [1, 'F']] as [number, string][]) { const a = a0 + (a1 - a0) * k; g.fillText(s, cx + Math.cos(a) * (R - 78), cy + Math.sin(a) * (R - 78)) }
    return tex(c, true, false)
  })
}

/** 变阻器线圈：密绕的漆包电阻丝，一圈圈亮暗相间（v 沿着瓷管的长度方向，一张图画 8 圈） */
export function makeCoil() {
  return once('coil', () => {
    const W = 16, H = 128, { c, g } = canvas(W, H)
    for (let i = 0; i < 8; i++) {
      const y = i * 16, q = g.createLinearGradient(0, y, 0, y + 16)
      q.addColorStop(0, '#3a1c0c'); q.addColorStop(0.18, '#8a4a26'); q.addColorStop(0.45, '#e0a070'); q.addColorStop(0.7, '#9a5530'); q.addColorStop(1, '#3a1c0c')
      g.fillStyle = q; g.fillRect(0, y, W, 16)
    }
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
  })
}
