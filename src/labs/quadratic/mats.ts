// 二次函数实验室用到的程序贴图：草坪、广场铺装、塑胶球场、石砌桥面、篮球皮、文字牌。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
export const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'
export const NUM = 'Geist, "Helvetica Neue", Arial, sans-serif'
export const SERIF = '"STIX Two Text","Times New Roman",serif'
export function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
export function tex(c: HTMLCanvasElement, wrap = false, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const cache = new Map<string, THREE.Texture>()
export const once = (key: string, f: () => THREE.Texture) => { let t = cache.get(key); if (!t) { t = f(); cache.set(key, t) } return t }
/** 同一张贴图换一个重复次数（克隆，共享图像） */
export const rep = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c }

/** 草坪：深浅两种绿的斑块、细密的草叶短线 */
export function makeLawn() {
  return once('lawn', () => {
    const S = 512, { c, g } = canvas(S), r = rng(5)
    g.fillStyle = '#4f7a35'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 160; i++) {
      const x = r() * S, y = r() * S, rad = 20 + r() * 60, col = r() < 0.5 ? '70,110,44' : '58,92,36'
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); q.addColorStop(0, `rgba(${col},0.5)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2) }
    }
    for (let i = 0; i < 22000; i++) { const x = r() * S, y = r() * S, l = 2 + r() * 4, v = r(); g.strokeStyle = v < 0.5 ? `rgba(110,150,70,${0.25 + r() * 0.3})` : `rgba(38,64,26,${0.2 + r() * 0.3})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y - l); g.stroke() }
    return tex(c, true)
  })
}

/** 广场铺装：浅灰花岗岩方砖，砖缝、每块深浅不一 */
export function makePaving(tile = 64, base = [196, 192, 184]) {
  return once(`pave${tile}${base}`, () => {
    const S = 512, { c, g } = canvas(S), r = rng(11)
    g.fillStyle = '#8f8b84'; g.fillRect(0, 0, S, S)
    for (let y = 0; y < S; y += tile) for (let x = 0; x < S; x += tile) {
      const v = (r() - 0.5) * 18; g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`; g.fillRect(x + 1.5, y + 1.5, tile - 3, tile - 3)
      for (let i = 0; i < 90; i++) { const w = r() * 18; g.fillStyle = `rgba(${r() < 0.5 ? '90,88,84' : '235,232,226'},${0.25 + r() * 0.3})`; g.fillRect(x + 2 + r() * (tile - 4), y + 2 + r() * (tile - 4), 1 + r(), 1 + r()); void w }
    }
    return tex(c, true)
  })
}

/** 塑胶球场：哑光的颗粒面 */
export function makeCourt(base: string, seed = 3) {
  return once(`court${base}`, () => {
    const S = 256, { c, g } = canvas(S), r = rng(seed)
    g.fillStyle = base; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.04 + r() * 0.06})`; g.fillRect(r() * S, r() * S, 1, 1) }
    return tex(c, true)
  })
}

/** 石砌墙面：一层层错缝的条石，灰白花岗岩。每 1 个贴图单位 = 2.4 m 宽、1.2 m 高 */
export function makeAshlar(base = [176, 170, 158], seed = 17) {
  return once(`ashlar${base}${seed}`, () => {
    const W = 512, H = 256, { c, g } = canvas(W, H), r = rng(seed), rows = 4, rh = H / rows
    g.fillStyle = '#6d6860'; g.fillRect(0, 0, W, H)
    for (let row = 0; row < rows; row++) {
      let x = row % 2 ? -W / 6 : 0
      while (x < W) {
        const w = W / 4 + (r() - 0.5) * W / 8, v = (r() - 0.5) * 26
        for (const ox of [0, W]) {
          g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v - 2})`; g.fillRect(x + 2 - ox, row * rh + 2, w - 4, rh - 4)
        }
        x += w
      }
    }
    for (let i = 0; i < 16000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,66,60' : '240,236,228'},${0.12 + r() * 0.2})`; g.fillRect(r() * W, r() * H, 1 + r(), 1 + r()) }
    for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H, q = g.createRadialGradient(x, y, 0, x, y, 20 + r() * 40); q.addColorStop(0, 'rgba(60,70,50,0.10)'); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(0, 0, W, H) }
    return tex(c, true)
  })
}

/** 红砖墙：每 1 个贴图单位 = 1 m × 0.5 m */
export function makeBrick() {
  return once('brick', () => {
    const W = 512, H = 256, { c, g } = canvas(W, H), r = rng(23), rows = 8, rh = H / rows, bw = W / 4
    g.fillStyle = '#b9b2a4'; g.fillRect(0, 0, W, H)
    for (let row = 0; row < rows; row++) for (let i = -1; i < 5; i++) {
      const x = i * bw + (row % 2 ? bw / 2 : 0), v = (r() - 0.5) * 30
      g.fillStyle = `rgb(${150 + v},${74 + v * 0.6},${54 + v * 0.4})`; g.fillRect(x + 3, row * rh + 3, bw - 6, rh - 6)
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,30,20' : '230,200,180'},${0.1 + r() * 0.15})`; g.fillRect(r() * W, r() * H, 1, 1) }
    return tex(c, true)
  })
}

/** 木纹：深浅相间的长条纹 */
export function makeWood(base = [150, 110, 72]) {
  return once(`wood${base}`, () => {
    const W = 64, H = 512, { c, g } = canvas(W, H), r = rng(31)
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 70; i++) { const x = r() * W, v = (r() - 0.5) * 50; g.strokeStyle = `rgba(${base[0] + v},${base[1] + v * 0.8},${base[2] + v * 0.6},0.6)`; g.lineWidth = 0.6 + r() * 2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= H; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 2, y); g.stroke() }
    return tex(c, true)
  })
}

/** 篮球皮：橙色的颗粒面加八条黑色的缝（经纬图，贴在球上） */
export function makeBall() {
  return once('ball', () => {
    const W = 1024, H = 512, { c, g } = canvas(W, H), r = rng(41)
    g.fillStyle = '#d2651f'; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 60000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,40,10' : '255,170,110'},${0.15 + r() * 0.2})`; g.beginPath(); g.arc(r() * W, r() * H, 1.1 + r() * 1.1, 0, 7); g.fill() }
    g.strokeStyle = '#1b1310'; g.lineWidth = 9
    for (const u of [0, 0.5]) { g.beginPath(); g.moveTo(u * W, 0); g.lineTo(u * W, H); g.stroke(); g.beginPath(); g.moveTo(u * W + W / 2 - 1, 0); g.lineTo(u * W + W / 2 - 1, H); g.stroke() }
    g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke()
    // 两条弯缝：在经纬图上是两道正弦弧
    for (const ph of [0, Math.PI]) { g.beginPath(); for (let x = 0; x <= W; x += 4) { const y = H / 2 + Math.cos(x / W * Math.PI * 2 + ph) * H * 0.3; if (x) g.lineTo(x, y); else g.moveTo(x, y) } g.stroke() }
    return tex(c, true)
  })
}

/** 一块文字牌 */
export function makeSign(text: string, { w = 512, h = 128, bg = '#1f5f66', fg = '#ffffff', size = 0.56, font = FONT, weight = 700 }: { w?: number; h?: number; bg?: string; fg?: string; size?: number; font?: string; weight?: number } = {}) {
  return once(`sign${text}${w}${h}${bg}${fg}${size}`, () => {
    const { c, g } = canvas(w, h)
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    g.fillStyle = fg; g.font = `${weight} ${Math.round(h * size)}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    const lines = text.split('\n'); lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * h * size * 1.25 + h * 0.03))
    return tex(c)
  })
}

/** 水尺：白底红黑相间，每 0.1 m 一小格，每 1 m 写数。从 top 米往下标到 0 */
export function makeGauge(top: number) {
  return once(`gauge${top}`, () => {
    const per = 160, { c, g } = canvas(96, per * top)
    g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, 96, per * top)
    for (let m = 0; m < top; m++) {
      const y0 = (top - m - 1) * per
      g.fillStyle = m % 2 ? '#1d2327' : '#c8372d'
      for (let k = 0; k < 10; k += 2) g.fillRect(0, y0 + k * per / 10, 40, per / 10)
      g.fillStyle = '#1d2327'; g.fillRect(0, y0 + per - 3, 96, 3)
      g.font = `700 52px ${NUM}`; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(String(m + 1), 68, y0 + per * 0.1 + 24)
    }
    return tex(c)
  })
}
