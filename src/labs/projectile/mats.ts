// 抛体运动实验室用到的程序贴图：草地、沥青、混凝土、方格纸、文字牌、软边圆点。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
export const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'
export const NUM = 'Geist, "Helvetica Neue", Arial, sans-serif'
export function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
export function tex(c: HTMLCanvasElement, wrap = false, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const cache = new Map<string, THREE.Texture>()
export const once = (key: string, f: () => THREE.Texture) => { let t = cache.get(key); if (!t) { t = f(); cache.set(key, t) } return t }
/** 同一张贴图换一个重复次数（克隆，共享图像） */
export const rep = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c }

/** 山地的细节：一张偏亮的灰度杂斑，乘在顶点色上（草、石、砂的颜色由顶点色给） */
export function makeTurf() {
  return once('turf', () => {
    const S = 512, { c, g } = canvas(S), r = rng(5)
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 200; i++) {
      const x = r() * S, y = r() * S, rad = 18 + r() * 60, col = r() < 0.5 ? '255,255,255' : '120,120,120'
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); q.addColorStop(0, `rgba(${col},0.4)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2) }
    }
    for (let i = 0; i < 26000; i++) { const x = r() * S, y = r() * S, l = 2 + r() * 4; g.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.2 + r() * 0.3})` : `rgba(70,70,70,${0.2 + r() * 0.3})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y - l); g.stroke() }
    return tex(c, true)
  })
}

/** 沥青：深灰的颗粒面 */
export function makeAsphalt() {
  return once('asphalt', () => {
    const S = 256, { c, g } = canvas(S), r = rng(3)
    g.fillStyle = '#3c3e41'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '200,200,200'},${0.05 + r() * 0.12})`; g.fillRect(r() * S, r() * S, 1 + r(), 1 + r()) }
    return tex(c, true)
  })
}

/** 方格纸：w×h 厘米，每 1 cm 一条细线，每 5 cm 一条粗线 */
export function makeGrid(w: number, h: number) {
  return once(`grid${w}x${h}`, () => {
    const k = 20, { c, g } = canvas(w * k, h * k)
    g.fillStyle = '#fbfaf4'; g.fillRect(0, 0, w * k, h * k)
    for (let i = 0; i <= w; i++) { g.strokeStyle = i % 5 ? 'rgba(40,110,140,0.5)' : 'rgba(30,85,115,0.95)'; g.lineWidth = i % 5 ? 1.4 : 3; g.beginPath(); g.moveTo(i * k, 0); g.lineTo(i * k, h * k); g.stroke() }
    for (let i = 0; i <= h; i++) { g.strokeStyle = i % 5 ? 'rgba(40,110,140,0.5)' : 'rgba(30,85,115,0.95)'; g.lineWidth = i % 5 ? 1.4 : 3; g.beginPath(); g.moveTo(0, i * k); g.lineTo(w * k, i * k); g.stroke() }
    return tex(c)
  })
}

/** 一块文字牌 */
export function makeSign(text: string, { w = 512, h = 128, bg = '#b71f18', fg = '#ffffff', size = 0.56, font = FONT, weight = 700 }: { w?: number; h?: number; bg?: string; fg?: string; size?: number; font?: string; weight?: number } = {}) {
  return once(`sign${text}${w}${h}${bg}${fg}${size}`, () => {
    const { c, g } = canvas(w, h)
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    g.fillStyle = fg; g.font = `${weight} ${Math.round(h * size)}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + h * 0.03)
    return tex(c)
  })
}

/** 卷帘门：一条条横的铝片 */
export function makeShutter() {
  return once('shutter', () => {
    const { c, g } = canvas(64, 256)
    for (let y = 0; y < 256; y += 8) { const q = g.createLinearGradient(0, y, 0, y + 8); q.addColorStop(0, '#e4e7e9'); q.addColorStop(0.6, '#b9bec2'); q.addColorStop(1, '#6d7276'); g.fillStyle = q; g.fillRect(0, y, 64, 8) }
    const t = tex(c, true); t.repeat.set(1, 3); return t
  })
}

/** 柔边的圆点：水雾、烟用 */
export function softDot() {
  return once('soft', () => {
    const { c, g } = canvas(64), q = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.4, 'rgba(255,255,255,0.55)'); q.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = q; g.fillRect(0, 0, 64, 64)
    return tex(c, false, false)
  })
}

/** 距离刻度带：从 0 到 len 米，每 1 m 一道短线，每 5 m 一道长线并写数。贴在长台的台面上（1 m = 64 像素） */
export function makeScale(len: number) {
  return once(`scale${len}`, () => {
    const k = 64, { c, g } = canvas(len * k, 96)
    g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, len * k, 96)
    g.fillStyle = '#1d2327'
    for (let m = 0; m <= len; m++) { const big = m % 5 === 0; g.fillRect(m * k - (big ? 2.5 : 1), 0, big ? 5 : 2, big ? 44 : 24) }
    g.font = `700 40px ${NUM}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    for (let m = 5; m < len; m += 5) g.fillText(String(m), m * k, 70)
    return tex(c)
  })
}
