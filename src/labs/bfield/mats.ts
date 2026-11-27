// 程序画出来的贴图：铭牌和印字、环氧地坪（带黄色安全线）、实验台的树脂台面、彩钢墙板、漆包线绕组、
// 荧光屏、示波器屏幕、场的符号（× 和 ·）。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true, wrap = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'
const cache = new Map<string, THREE.Texture>()
const once = (key: string, f: () => THREE.Texture) => { let t = cache.get(key); if (!t) { t = f(); cache.set(key, t) } return t }
/** 换重复次数：复制一份贴图 */
export const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c }

/** 一行或几行字：铭牌、印字 */
export function makeText(lines: string[], { w = 512, h = 128, bg = '#ffffff', fg = '#222', size = 56, weight = 600, align = 'center' as CanvasTextAlign } = {}) {
  return once(`t${lines.join('|')}${w}${h}${bg}${fg}${size}${weight}${align}`, () => {
    const { c, g } = canvas(w, h)
    if (bg !== 'transparent') { g.fillStyle = bg; g.fillRect(0, 0, w, h) }
    g.fillStyle = fg; g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle'
    lines.forEach((l, i) => g.fillText(l, align === 'center' ? w / 2 : 18, h / 2 + (i - (lines.length - 1) / 2) * size * 1.25))
    return tex(c, true, false)
  })
}

/** 环氧地坪：浅灰、带一点颗粒和擦痕；每 6 m 一道伸缩缝 */
export function makeFloor() {
  return once('floor', () => {
    const S = 1024, { c, g } = canvas(S), r = rng(5)
    g.fillStyle = '#6c7174'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 160; i++) { const x = r() * S, y = r() * S, rr = 30 + r() * 120, q = g.createRadialGradient(x, y, 0, x, y, rr); const v = r() < 0.5 ? '255,255,255' : '0,0,0'; q.addColorStop(0, `rgba(${v},0.035)`); q.addColorStop(1, `rgba(${v},0)`); g.fillStyle = q; g.fillRect(x - rr, y - rr, rr * 2, rr * 2) }
    for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '20,20,20'},${0.04 + r() * 0.07})`; g.fillRect(r() * S, r() * S, 1.5, 1.5) }
    for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`; g.lineWidth = 1; g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 220, y + (r() - 0.5) * 60); g.stroke() }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, S, 3); g.fillRect(0, 0, 3, S)
    return tex(c)
  })
}
/** 黄黑相间的警示条 */
export function makeHazard() {
  return once('hazard', () => {
    const { c, g } = canvas(256, 64)
    g.fillStyle = '#e8b81e'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#1a1a1a'
    for (let x = -64; x < 320; x += 64) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 32, 64); g.lineTo(x + 64, 0); g.lineTo(x + 32, 0); g.fill() }
    return tex(c)
  })
}
/** 实验台的黑色树脂台面 */
export function makeResin() {
  return once('resin', () => {
    const S = 512, { c, g } = canvas(S), r = rng(3)
    g.fillStyle = '#1d2022'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * S, r() * S, 1, 1) }
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`; g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 160, y + (r() - 0.5) * 30); g.stroke() }
    return tex(c)
  })
}
/** 彩钢墙板：竖向的压型肋 */
export function makeCladding(base = '#59636b') {
  return once(`clad${base}`, () => {
    const { c, g } = canvas(256, 64)
    g.fillStyle = base; g.fillRect(0, 0, 256, 64)
    for (let x = 0; x < 256; x += 32) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, 0, 4, 64); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 4, 0, 3, 64); g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + 18, 0, 10, 64) }
    return tex(c)
  })
}
/** 漆包线绕组：一圈圈并排的铜线，每根中间亮两边暗，偶尔有一点颜色深浅（漆层） */
export function makeWinding(base: [number, number, number] = [176, 92, 44], turns = 64) {
  return once(`wind${base}${turns}`, () => {
    const W = 64, H = 1024, { c, g } = canvas(W, H), r = rng(11), per = H / turns
    for (let i = 0; i < turns; i++) {
      const k = 0.9 + r() * 0.16
      for (let y = 0; y < per; y++) {
        const u = y / per, l = Math.pow(Math.sin(u * Math.PI), 0.7), hi = Math.exp(-Math.pow((u - 0.35) / 0.09, 2)) * 0.6
        const col = base.map(v => Math.min(255, Math.round(v * k * (0.35 + 0.75 * l) + 255 * hi * 0.5)))
        g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; g.fillRect(0, i * per + y, W, 1)
      }
    }
    return tex(c)
  })
}
/** 绕组的粗糙度：线与线之间的缝更粗糙 */
export function makeWindingRough(turns = 64) {
  return once(`windr${turns}`, () => {
    const W = 16, H = 1024, { c, g } = canvas(W, H), per = H / turns
    for (let i = 0; i < turns; i++) for (let y = 0; y < per; y++) { const v = Math.round(90 + 140 * (1 - Math.sin(y / per * Math.PI))); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, i * per + y, W, 1) }
    return tex(c, false)
  })
}
/** 场的符号：× 表示垂直纸面向里，· 表示向外。透明底，一格一个符号 */
export function makeFieldMark(kind: 'in' | 'out', color: string) {
  return once(`mark${kind}${color}`, () => {
    const S = 128, { c, g } = canvas(S)
    g.strokeStyle = color; g.fillStyle = color; g.lineCap = 'round'
    if (kind === 'in') { g.lineWidth = 9; const a = 40, b = 88; g.beginPath(); g.moveTo(a, a); g.lineTo(b, b); g.moveTo(b, a); g.lineTo(a, b); g.stroke() }
    else { g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 26, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(64, 64, 9, 0, Math.PI * 2); g.fill() }
    return tex(c)
  })
}
/** 荧光屏：涂着荧光粉的白板，印着方格（每格 1 cm） */
export function makeGrid(cells: [number, number], bg = '#d9e6df', line = 'rgba(30,60,50,0.35)') {
  return once(`grid${cells}${bg}`, () => {
    const px = 64, W = cells[0] * px, H = cells[1] * px, { c, g } = canvas(W, H)
    g.fillStyle = bg; g.fillRect(0, 0, W, H)
    g.strokeStyle = line; g.lineWidth = 2
    for (let i = 0; i <= cells[0]; i++) { g.beginPath(); g.moveTo(i * px, 0); g.lineTo(i * px, H); g.stroke() }
    for (let j = 0; j <= cells[1]; j++) { g.beginPath(); g.moveTo(0, j * px); g.lineTo(W, j * px); g.stroke() }
    return tex(c, true, false)
  })
}
/** 带刻度的尺：每 1 cm 一道，每 5 cm 一道长的，每 10 cm 一个数字（从 0 到 len cm） */
export function makeRuler(len: number, { bg = '#efe9d6', fg = '#1d2124' } = {}) {
  return once(`ruler${len}${bg}`, () => {
    const px = 40, W = len * px + 40, H = 96, { c, g } = canvas(W, H)
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = '600 30px ui-sans-serif, Helvetica, Arial'; g.textAlign = 'center'
    for (let i = 0; i <= len * 2; i++) {
      const x = 20 + i * px / 2, cm = i / 2, h = i % 20 === 0 ? 46 : i % 10 === 0 ? 34 : i % 2 === 0 ? 24 : 14
      g.fillRect(x - 1, 0, 2, h)
      if (i % 20 === 0) g.fillText(String(cm), x, 84)
    }
    return tex(c, true, false)
  })
}
/** 铝板上的拉丝细纹（面板、机柜门） */
export function makePanel(base = '#c9cdd0') {
  return once(`panel${base}`, () => {
    const S = 256, { c, g } = canvas(S), r = rng(17)
    g.fillStyle = base; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.05})`; g.fillRect(r() * S, r() * S, 10 + r() * 60, 1) }
    return tex(c)
  })
}
