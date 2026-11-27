// 程序画出来的贴图：沥青路面、文字牌、里程碑上的数字。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
export const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'
export const NUM = 'Geist, "Helvetica Neue", Arial, sans-serif'
export function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
export function tex(c: HTMLCanvasElement, wrap = false) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const cache = new Map<string, THREE.Texture>()
export const once = (key: string, f: () => THREE.Texture) => { let t = cache.get(key); if (!t) { t = f(); cache.set(key, t) } return t }

/** 沥青：深灰底上密密的骨料颗粒，带一点车轮压出来的深浅，四边能拼接 */
export function makeAsphalt() {
  return once('asphalt', () => {
    const S = 512, { c, g } = canvas(S), r = rng(9)
    g.fillStyle = '#45474a'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 26000; i++) { const v = 40 + Math.floor(r() * 70); g.fillStyle = `rgba(${v},${v},${v + 2},${0.35 + r() * 0.5})`; const w = 0.6 + r() * 1.8; g.fillRect(r() * S, r() * S, w, w) }
    for (let i = 0; i < 900; i++) { const v = 120 + Math.floor(r() * 60); g.fillStyle = `rgba(${v},${v - 4},${v - 8},0.35)`; g.fillRect(r() * S, r() * S, 1.5, 1.5) }
    for (let i = 0; i < 40; i++) { const x = r() * S, y = r() * S, q = g.createRadialGradient(x, y, 0, x, y, 30 + r() * 60); q.addColorStop(0, `rgba(${r() < 0.5 ? '20,20,22' : '110,110,110'},0.12)`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(0, 0, S, S) }
    return tex(c, true)
  })
}

/** 一块文字牌：底色、字色、字号按画布高度的比例 */
export function makeSign(text: string, { w = 512, h = 128, bg = '#1f6d4a', fg = '#ffffff', size = 0.62, font = FONT, weight = 700, border = '' }: { w?: number; h?: number; bg?: string; fg?: string; size?: number; font?: string; weight?: number; border?: string } = {}) {
  return once(`sign${text}${w}${h}${bg}${fg}${size}${border}`, () => {
    const { c, g } = canvas(w, h)
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    if (border) { g.strokeStyle = border; g.lineWidth = h * 0.05; g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12) }
    g.fillStyle = fg; g.font = `${weight} ${Math.round(h * size)}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + h * 0.03)
    return tex(c)
  })
}

/** 里程碑的正面：上半截红色，下面白底黑字 */
export function makeMilestone(km: number) {
  return once(`ms${km}`, () => {
    const { c, g } = canvas(128, 256)
    g.fillStyle = '#f2f1ec'; g.fillRect(0, 0, 128, 256)
    g.fillStyle = '#c4302b'; g.fillRect(0, 0, 128, 78)
    g.fillStyle = '#1d2024'; g.font = `700 ${km >= 1000 ? 40 : 54}px ${NUM}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(String(km), 64, 140)
    g.font = `600 30px ${NUM}`; g.fillText('km', 64, 196)
    return tex(c)
  })
}
