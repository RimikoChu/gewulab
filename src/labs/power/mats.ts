// 程序画出来的贴图：木地板、乳胶漆墙、瓷砖、砖墙、小区地砖、草地、文字和铭牌。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true, wrap = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
export const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'
const cache = new Map<string, THREE.Texture>()
const once = (key: string, f: () => THREE.Texture) => { let t = cache.get(key); if (!t) { t = f(); cache.set(key, t) } return t }
/** 拿一张贴图的副本，设好重复次数 */
export const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c }

/** 木地板：一条条错缝的橡木板，每条深浅不一，带木纹 */
export function makeWood() {
  return once('wood', () => {
    const W = 1024, H = 1024, { c, g } = canvas(W, H), r = rng(3), rows = 8, bh = H / rows
    for (let y = 0; y < rows; y++) {
      let x = -r() * 400
      while (x < W) {
        const len = 320 + r() * 380, v = r()
        const base = [158 + v * 36, 112 + v * 28, 72 + v * 20]
        g.fillStyle = `rgb(${base.map(Math.round).join(',')})`; g.fillRect(x, y * bh, len, bh)
        // 木纹：一条条弯曲的深色细线
        for (let k = 0; k < 18; k++) {
          const yy = y * bh + r() * bh, a = (r() - 0.5) * 6
          g.strokeStyle = `rgba(80,50,28,${0.06 + r() * 0.12})`; g.lineWidth = 0.8 + r() * 1.6
          g.beginPath(); g.moveTo(x, yy); for (let s = 0; s <= 10; s++) g.lineTo(x + len * s / 10, yy + Math.sin(s * 0.9 + k) * a); g.stroke()
        }
        g.fillStyle = 'rgba(40,26,14,0.55)'; g.fillRect(x, y * bh, 2, bh)
        x += len
      }
      g.fillStyle = 'rgba(40,26,14,0.5)'; g.fillRect(0, y * bh, W, 2)
    }
    return tex(c)
  })
}
/** 乳胶漆墙：很淡的滚筒纹 */
export function makePaint(base = '#ece7dd') {
  return once(`paint${base}`, () => {
    const S = 256, { c, g } = canvas(S), r = rng(11)
    g.fillStyle = base; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 9000; i++) { const v = r() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${0.02 + r() * 0.03})`; g.fillRect(r() * S, r() * S, 1.5, 1.5) }
    return tex(c)
  })
}
/** 瓷砖：方砖加灰缝。n 每张贴图几块 */
export function makeTile(base: string, grout: string, n = 4, seed = 5, rect = 1) {
  return once(`tile${base}${grout}${n}${rect}`, () => {
    const S = 512, { c, g } = canvas(S, S), r = rng(seed), w = S / n, h = S / (n * rect)
    g.fillStyle = grout; g.fillRect(0, 0, S, S)
    for (let y = 0; y < n * rect; y++) for (let x = 0; x < n; x++) {
      const q = g.createLinearGradient(x * w, y * h, (x + 1) * w, (y + 1) * h), d = (r() - 0.5) * 14
      const col = new THREE.Color(base); const k = 1 + d / 255
      q.addColorStop(0, `rgb(${Math.min(255, col.r * 255 * k + 6)},${Math.min(255, col.g * 255 * k + 6)},${Math.min(255, col.b * 255 * k + 6)})`)
      q.addColorStop(1, `rgb(${col.r * 255 * k - 6},${col.g * 255 * k - 6},${col.b * 255 * k - 6})`)
      g.fillStyle = q; g.fillRect(x * w + 2, y * h + 2, w - 4, h - 4)
    }
    return tex(c)
  })
}
/** 红砖墙：错缝的砖加水泥缝 */
export function makeBrick() {
  return once('brick', () => {
    const W = 512, H = 512, { c, g } = canvas(W, H), r = rng(21), bw = 64, bh = 24
    g.fillStyle = '#b9b2a4'; g.fillRect(0, 0, W, H)
    for (let y = 0; y < H / bh; y++) for (let x = -1; x < W / bw + 1; x++) {
      const v = r(), ox = (y % 2) * bw / 2
      g.fillStyle = `rgb(${150 + v * 40},${70 + v * 22},${52 + v * 16})`; g.fillRect(x * bw + ox + 2, y * bh + 2, bw - 4, bh - 4)
    }
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * W, r() * H, 2, 2) }
    return tex(c)
  })
}
/** 小区道路的透水砖：灰色长方砖人字铺 */
export function makePaver() {
  return once('paver', () => {
    const S = 512, { c, g } = canvas(S), r = rng(8), bw = 64, bh = 32
    g.fillStyle = '#6d6c68'; g.fillRect(0, 0, S, S)
    for (let y = 0; y < S / bh; y++) for (let x = -1; x < S / bw + 1; x++) {
      const v = r(), ox = (y % 2) * bw / 2
      g.fillStyle = `rgb(${132 + v * 30},${130 + v * 28},${124 + v * 26})`; g.fillRect(x * bw + ox + 2, y * bh + 2, bw - 4, bh - 4)
    }
    for (let i = 0; i < 9000; i++) { const v = 90 + r() * 90; g.fillStyle = `rgba(${v},${v},${v},0.12)`; g.fillRect(r() * S, r() * S, 1.5, 1.5) }
    return tex(c)
  })
}
/** 草地：深浅绿的细点 */
export function makeGrass() {
  return once('grass', () => {
    const S = 512, { c, g } = canvas(S), r = rng(17)
    g.fillStyle = '#4f6b3a'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 40000; i++) { const v = r(); g.fillStyle = `rgba(${60 + v * 60},${90 + v * 70},${40 + v * 30},0.5)`; g.fillRect(r() * S, r() * S, 1.5, 3) }
    return tex(c)
  })
}
/** 水泥地面（配电房里）：浅灰的细麻面 */
export function makeCement() {
  return once('cement', () => {
    const S = 512, { c, g } = canvas(S), r = rng(29)
    g.fillStyle = '#8f8f8a'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 80; i++) { const x = r() * S, y = r() * S, R = 40 + r() * 120, q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, `rgba(${r() < 0.5 ? '70,70,66' : '170,170,164'},0.12)`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
    for (let i = 0; i < 20000; i++) { const v = 100 + r() * 90; g.fillStyle = `rgba(${v},${v},${v - 4},0.14)`; g.fillRect(r() * S, r() * S, 1, 1) }
    return tex(c)
  })
}

/** 几行字居中（标牌、铭牌、印字） */
export function makeText(lines: string[], { w = 256, h = 64, bg = '#1d1f22', fg = '#e9e6dc', size = 40, weight = 700, gap = 1.25, align = 'center' as CanvasTextAlign } = {}) {
  return once(`t${lines.join('|')}${w}${h}${bg}${fg}${size}${weight}${gap}${align}`, () => {
    const { c, g } = canvas(w, h)
    if (bg !== 'transparent') { g.fillStyle = bg; g.fillRect(0, 0, w, h) }
    g.fillStyle = fg; g.textAlign = align; g.textBaseline = 'middle'; g.font = `${weight} ${size}px ${FONT}`
    const n = lines.length, y0 = h / 2 - (n - 1) * size * gap / 2, x = align === 'left' ? size * 0.4 : w / 2
    lines.forEach((l, i) => g.fillText(l, x, y0 + i * size * gap + 2))
    return tex(c, true, false)
  })
}
/** 铭牌：浅底细框，第一行粗一点 */
export function makePlate(lines: string[], { w = 512, h = 256, bg = '#eceae3', fg = '#26282b', size = 34 } = {}) {
  return once(`plate${lines.join('|')}${w}${h}${bg}${size}`, () => {
    const { c, g } = canvas(w, h)
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    g.strokeStyle = fg; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16)
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
    const n = lines.length, lh = (h - 40) / n
    lines.forEach((l, i) => { g.font = `${i === 0 ? 700 : 500} ${i === 0 ? size * 1.1 : size}px ${FONT}`; g.fillText(l, w / 2, 20 + lh * (i + 0.5)) })
    return tex(c, true, false)
  })
}
