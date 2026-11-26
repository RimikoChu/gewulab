// 程序画出来的贴图：磁体上刻的字母、电表表盘（直流电流表、零点在中间的灵敏电流计）、铭牌和印字、
// 实验台的环氧树脂台面、木纹、穿孔挂板、墙面、草地、金属屋面。不用下载素材。
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
    lines.forEach((l, i) => g.fillText(l, align === 'center' ? w / 2 : 16, h / 2 + (i - (lines.length - 1) / 2) * size * 1.2))
    return tex(c, true, false)
  })
}

/** 磁体上刻的字母：透明底、白色的字，带一点阴刻的暗边 */
export function makeLetter(ch: string) {
  return once(`L${ch}`, () => {
    const { c, g } = canvas(128)
    g.font = `800 104px ui-sans-serif, Helvetica, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillText(ch, 66, 70)
    g.fillStyle = '#f4f1ea'; g.fillText(ch, 64, 67)
    return tex(c, true, false)
  })
}

// ---------- 电表 ----------
/** 表盘：w × h 的画布，指针转轴在 (cx, cy)，刻度弧半径 r，半张角 half（度） */
export const DIAL = { w: 1024, h: 640, cx: 512, cy: 600, r: 470, half: 48 }
/** kind：'A' 直流电流表 0–3 A；'G' 灵敏电流计，零点在中间 */
export function makeDial(kind: 'A' | 'G') {
  return once(`dial${kind}`, () => {
    const { w, h, cx, cy, r, half } = DIAL, { c, g } = canvas(w, h)
    g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, w, h)
    const ang = (k: number) => (-90 - half + 2 * half * k) * Math.PI / 180
    // 镜面弧带
    g.strokeStyle = '#c9ccd0'; g.lineWidth = 18; g.beginPath(); g.arc(cx, cy, r - 70, ang(0), ang(1)); g.stroke()
    g.strokeStyle = '#1f2326'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, ang(0), ang(1)); g.stroke()
    const N = kind === 'A' ? 30 : 20
    for (let i = 0; i <= N; i++) {
      const k = i / N, a = ang(k), big = kind === 'A' ? i % 10 === 0 : i % 5 === 0, mid = kind === 'A' && i % 5 === 0
      const l = big ? 46 : mid ? 32 : 20
      g.lineWidth = big ? 5 : 3; g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(cx + Math.cos(a) * (r - l), cy + Math.sin(a) * (r - l)); g.stroke()
      if (big) {
        g.fillStyle = '#1f2326'; g.font = `600 52px ui-sans-serif, Helvetica, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'
        const label = kind === 'A' ? String(i / 10) : String(Math.abs(i - 10) / 5)
        g.fillText(label, cx + Math.cos(a) * (r + 46), cy + Math.sin(a) * (r + 46))
      }
    }
    g.fillStyle = '#1f2326'; g.font = `700 92px ui-serif, "Times New Roman", serif`; g.textAlign = 'center'
    g.fillText(kind, cx, cy - 210)
    if (kind === 'G') { g.font = `500 34px ${FONT}`; g.fillStyle = '#4a4f54'; g.fillText('灵敏电流计', cx, cy - 120) }
    return tex(c, true, false)
  })
}

// ---------- 台面、木头、墙 ----------
/** 实验台的黑色环氧树脂台面：极细的颗粒和几道擦痕 */
export function makeResin() {
  return once('resin', () => {
    const S = 512, { c, g } = canvas(S), r = rng(3)
    g.fillStyle = '#2a3033'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.02 + r() * 0.04})`; g.fillRect(r() * S, r() * S, 1, 1) }
    g.strokeStyle = 'rgba(255,255,255,0.035)'; g.lineWidth = 1
    for (let i = 0; i < 40; i++) { const x = r() * S, y = r() * S, a = r() * Math.PI; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 60, y + Math.sin(a) * 60); g.stroke() }
    return tex(c)
  })
}
/** 浅色的木纹（底板、木块） */
export function makeWood(base = '#c79a63') {
  return once(`wood${base}`, () => {
    const W = 512, H = 128, { c, g } = canvas(W, H), r = rng(11)
    g.fillStyle = base; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 70; i++) {
      const y = r() * H, amp = 2 + r() * 5, f = 0.006 + r() * 0.01, ph = r() * 6
      g.strokeStyle = `rgba(${r() < 0.6 ? '110,70,35' : '235,200,150'},${0.1 + r() * 0.18})`; g.lineWidth = 0.6 + r() * 1.6
      g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * f + ph) * amp); g.stroke()
    }
    return tex(c)
  })
}
/** 穿孔挂板：浅灰色钢板上一排排小方孔 */
export function makePegboard() {
  return once('peg', () => {
    const S = 256, { c, g } = canvas(S)
    g.fillStyle = '#c9ced1'; g.fillRect(0, 0, S, S)
    g.fillStyle = '#5c6367'
    for (let y = 16; y < S; y += 32) for (let x = 16; x < S; x += 32) g.fillRect(x - 3, y - 6, 6, 12)
    return tex(c)
  })
}
/** 刷了乳胶漆的墙：很淡的斑驳 */
export function makeWall(base = '#e9e8e2') {
  return once(`wall${base}`, () => {
    const S = 512, { c, g } = canvas(S), r = rng(17)
    g.fillStyle = base; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 160; i++) { const x = r() * S, y = r() * S, rr = 20 + r() * 60, q = g.createRadialGradient(x, y, 0, x, y, rr); q.addColorStop(0, `rgba(${r() < 0.5 ? '255,255,255' : '120,120,110'},0.05)`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - rr, y - rr, rr * 2, rr * 2) }
    return tex(c)
  })
}
/** 浅灰的地砖（实训室地面），一格 60 cm */
export function makeTile() {
  return once('tile', () => {
    const S = 512, { c, g } = canvas(S), r = rng(23)
    g.fillStyle = '#bfc1bd'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '60,60,60'},${0.03 + r() * 0.05})`; g.fillRect(r() * S, r() * S, 2, 2) }
    g.fillStyle = '#8f928e'; g.fillRect(0, 0, S, 3); g.fillRect(0, 0, 3, S)
    return tex(c)
  })
}
/** 压型钢板屋面、墙面：一道道竖肋 */
export function makeCladding(base = '#8d969c') {
  return once(`clad${base}`, () => {
    const W = 256, H = 64, { c, g } = canvas(W, H)
    g.fillStyle = base; g.fillRect(0, 0, W, H)
    for (let x = 0; x < W; x += 32) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, 0, 4, H); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 4, 0, 3, H) }
    return tex(c)
  })
}
/** 漆包线的线圈：一圈圈紧挨着的铜色细线 */
export function makeCoil(base = '#b5562d') {
  return once(`coil${base}`, () => {
    const W = 64, H = 256, { c, g } = canvas(W, H)
    for (let y = 0; y < H; y += 8) {
      const q = g.createLinearGradient(0, y, 0, y + 8); q.addColorStop(0, '#3a1608'); q.addColorStop(0.35, base); q.addColorStop(0.55, '#f2b07a'); q.addColorStop(1, '#3a1608')
      g.fillStyle = q; g.fillRect(0, y, W, 8)
    }
    return tex(c)
  })
}
/** 风机叶片顶端的红色警示带 */
export function makeBladeTip() {
  return once('tip', () => {
    const { c, g } = canvas(4, 256)
    g.fillStyle = '#eef0ee'; g.fillRect(0, 0, 4, 256)
    g.fillStyle = '#c8392e'; g.fillRect(0, 0, 4, 18); g.fillRect(0, 34, 4, 18)
    return tex(c, true, false)
  })
}
/** 草地：底色上掺深浅两种颜色的斑块和细点 */
export function makeGrass() {
  return once('grass', () => {
    const S = 512, { c, g } = canvas(S), r = rng(41)
    g.fillStyle = '#7d8a4e'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 300; i++) {
      const x = r() * S, y = r() * S, rr = 14 + r() * 50, col = r() < 0.4 ? '150,140,80' : r() < 0.7 ? '80,100,50' : '120,110,70'
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr); q.addColorStop(0, `rgba(${col},0.4)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2) }
    }
    for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,75,35' : '170,165,105'},${0.15 + r() * 0.25})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
    return tex(c)
  })
}
/** 碎石路面 */
export function makeGravel() {
  return once('gravel', () => {
    const S = 256, { c, g } = canvas(S), r = rng(53)
    g.fillStyle = '#a59f92'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,65,58' : '215,208,195'},${0.2 + r() * 0.3})`; g.beginPath(); g.arc(r() * S, r() * S, 0.6 + r() * 1.6, 0, Math.PI * 2); g.fill() }
    return tex(c)
  })
}
