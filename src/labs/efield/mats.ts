// 程序画出来的贴图：铭牌和印字、环氧地坪、防静电台面、彩钢墙板、警示条、方格板、刻度尺、纸箱、正负号、金属网。不用下载素材。
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
export function makeText(lines: string[], { w = 512, h = 128, bg = '#ffffff', fg = '#222', size = 56, weight = 600 } = {}) {
  return once(`t${lines.join('|')}${w}${h}${bg}${fg}${size}${weight}`, () => {
    const { c, g } = canvas(w, h)
    if (bg !== 'transparent') { g.fillStyle = bg; g.fillRect(0, 0, w, h) }
    g.fillStyle = fg; g.font = `${weight} ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.25))
    return tex(c, true, false)
  })
}
/** 环氧地坪：灰绿色，带一点颗粒和擦痕，每格一道伸缩缝 */
export function makeFloor() {
  return once('floor', () => {
    const S = 1024, { c, g } = canvas(S), r = rng(5)
    g.fillStyle = '#5f6f6c'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 160; i++) { const x = r() * S, y = r() * S, rr = 30 + r() * 120, q = g.createRadialGradient(x, y, 0, x, y, rr); const v = r() < 0.5 ? '255,255,255' : '0,0,0'; q.addColorStop(0, `rgba(${v},0.04)`); q.addColorStop(1, `rgba(${v},0)`); g.fillStyle = q; g.fillRect(x - rr, y - rr, rr * 2, rr * 2) }
    for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '20,20,20'},${0.04 + r() * 0.07})`; g.fillRect(r() * S, r() * S, 1.5, 1.5) }
    for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`; g.lineWidth = 1; g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 220, y + (r() - 0.5) * 60); g.stroke() }
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, S, 3); g.fillRect(0, 0, 3, S)
    return tex(c)
  })
}
/** 防静电台垫：哑光的灰绿色橡胶，带细颗粒 */
export function makeMat() {
  return once('mat', () => {
    const S = 512, { c, g } = canvas(S), r = rng(3)
    g.fillStyle = '#3d554d'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 16000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.06})`; g.fillRect(r() * S, r() * S, 1.4, 1.4) }
    for (let i = 0; i < 20; i++) { g.strokeStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`; g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 160, y + (r() - 0.5) * 30); g.stroke() }
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
/** 黄黑相间的警示条 */
export function makeHazard() {
  return once('hazard', () => {
    const { c, g } = canvas(256, 64)
    g.fillStyle = '#e8b81e'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#1a1a1a'
    for (let x = -64; x < 320; x += 64) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 32, 64); g.lineTo(x + 64, 0); g.lineTo(x + 32, 0); g.fill() }
    return tex(c)
  })
}
/** 方格板：每格一小格，每 5 格一道粗线（打印头模型的背板、纸） */
export function makeGrid(cells: [number, number], bg = '#20262b', line = 'rgba(160,190,205,0.28)', bold = 'rgba(190,215,230,0.5)') {
  return once(`grid${cells}${bg}`, () => {
    const px = 32, W = cells[0] * px, H = cells[1] * px, { c, g } = canvas(W, H)
    g.fillStyle = bg; g.fillRect(0, 0, W, H)
    for (let i = 0; i <= cells[0]; i++) { g.strokeStyle = i % 5 ? line : bold; g.lineWidth = i % 5 ? 1.5 : 3; g.beginPath(); g.moveTo(i * px, 0); g.lineTo(i * px, H); g.stroke() }
    for (let j = 0; j <= cells[1]; j++) { g.strokeStyle = j % 5 ? line : bold; g.lineWidth = j % 5 ? 1.5 : 3; g.beginPath(); g.moveTo(0, j * px); g.lineTo(W, j * px); g.stroke() }
    return tex(c, true, false)
  })
}
/** 带刻度的尺：每 1 cm 一道，每 5 cm 一道长的，每 10 cm 一个数字（从 0 到 len cm） */
export function makeRuler(len: number, { bg = '#b5ab8a', fg = '#1d2124' } = {}) {
  return once(`ruler${len}${bg}`, () => {
    const px = 40, W = len * px + 40, H = 96, { c, g } = canvas(W, H)
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = '600 30px ui-sans-serif, Helvetica, Arial'; g.textAlign = 'center'
    for (let i = 0; i <= len; i++) { const x = 20 + i * px, h = i % 10 === 0 ? 46 : i % 5 === 0 ? 34 : 22; g.fillRect(x - 1, 0, 2, h); if (i % 10 === 0) g.fillText(String(i), x, 84) }
    return tex(c, true, false)
  })
}
/** 一圈角度刻度（绕在玻璃筒外面的纸带、刻度盘的边）：每 10° 一道，每 30° 一道长的 */
export function makeDegrees(bg = '#b9b092') {
  return once(`deg${bg}`, () => {
    const W = 1440, H = 64, { c, g } = canvas(W, H)
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = '#1d2124'
    for (let d = 0; d < 360; d += 5) { const x = d * 4, h = d % 30 === 0 ? 40 : d % 10 === 0 ? 26 : 14; g.fillRect(x, H - h, d % 30 === 0 ? 4 : 2, h) }
    return tex(c)
  })
}
/** 圆刻度盘：一圈刻度和数字，中间留空 */
export function makeDial(bg = '#b9b092') {
  return once(`dial${bg}`, () => {
    const S = 512, { c, g } = canvas(S)
    g.fillStyle = bg; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#1d2124'; g.fillStyle = '#1d2124'; g.font = '600 34px ui-sans-serif, Helvetica, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'
    for (let d = 0; d < 360; d += 10) {
      const a = d * Math.PI / 180, r0 = d % 30 === 0 ? 196 : 216, x = Math.sin(a), y = -Math.cos(a)
      g.lineWidth = d % 30 === 0 ? 5 : 2.5; g.beginPath(); g.moveTo(S / 2 + x * r0, S / 2 + y * r0); g.lineTo(S / 2 + x * 244, S / 2 + y * 244); g.stroke()
      if (d % 30 === 0) g.fillText(String(d), S / 2 + x * 166, S / 2 + y * 166)
    }
    return tex(c, true, false)
  })
}
/** 纸箱：牛皮纸，中间一道封箱胶带，侧面印着一行喷码 */
export function makeCarton(code: string) {
  return once(`carton${code}`, () => {
    const W = 512, H = 384, { c, g } = canvas(W, H), r = rng(9)
    g.fillStyle = '#b08a5a'; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,240,210' : '60,40,20'},${r() * 0.07})`; g.fillRect(r() * W, r() * H, 20 + r() * 80, 1) }
    g.fillStyle = 'rgba(214,190,150,0.85)'; g.fillRect(0, H / 2 - 30, W, 60)
    g.fillStyle = '#1a1a1a'; g.font = '700 30px ui-monospace, Menlo, monospace'; g.textAlign = 'left'; g.fillText(code, 40, H - 60)
    g.strokeStyle = 'rgba(40,25,10,0.5)'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4)
    return tex(c, true, false)
  })
}
/** 正号、负号：贴在带电体上的小圆牌 */
export function makeSign(kind: '+' | '−', color: string) {
  return once(`sign${kind}${color}`, () => {
    const S = 128, { c, g } = canvas(S)
    g.fillStyle = color; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#fff'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(34, 64); g.lineTo(94, 64); if (kind === '+') { g.moveTo(64, 34); g.lineTo(64, 94) } g.stroke()
    return tex(c, true, false)
  })
}
/** 金属网：透明底上的细线格子 */
export function makeMesh() {
  return once('mesh', () => {
    const S = 64, { c, g } = canvas(S)
    g.clearRect(0, 0, S, S); g.strokeStyle = '#c9ced2'; g.lineWidth = 5; g.strokeRect(0, 0, S, S)
    return tex(c)
  })
}
