// 圆锥曲线实验室用到的程序贴图：广场铺装、草地、石材、画板的板面、天线面板、玻璃幕墙、星空。不用下载素材。
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

/** 高原上的草地：枯黄和青绿相间的斑块、细草叶 */
export function makeGrass() {
  return once('grass', () => {
    const S = 512, { c, g } = canvas(S), r = rng(5)
    g.fillStyle = '#6f7f45'; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 180; i++) {
      const x = r() * S, y = r() * S, rad = 20 + r() * 60, col = r() < 0.45 ? '128,128,72' : r() < 0.6 ? '84,112,52' : '100,106,58'
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); q.addColorStop(0, `rgba(${col},0.5)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2) }
    }
    for (let i = 0; i < 20000; i++) { const x = r() * S, y = r() * S, l = 2 + r() * 4; g.strokeStyle = r() < 0.5 ? `rgba(150,160,90,${0.2 + r() * 0.3})` : `rgba(50,66,30,${0.2 + r() * 0.3})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y - l); g.stroke() }
    return tex(c, true)
  })
}

/** 广场铺装：花岗岩方砖，砖缝、每块深浅不一 */
export function makePaving(tile = 64, base = [168, 165, 158]) {
  return once(`pave${tile}${base}`, () => {
    const S = 512, { c, g } = canvas(S), r = rng(11)
    g.fillStyle = '#7d7a74'; g.fillRect(0, 0, S, S)
    for (let y = 0; y < S; y += tile) for (let x = 0; x < S; x += tile) {
      const v = (r() - 0.5) * 18; g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`; g.fillRect(x + 1.5, y + 1.5, tile - 3, tile - 3)
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,88,84' : '235,232,226'},${0.2 + r() * 0.3})`; g.fillRect(x + 2 + r() * (tile - 4), y + 2 + r() * (tile - 4), 1 + r(), 1 + r()) }
    }
    return tex(c, true)
  })
}

/** 石材 / 清水混凝土：细颗粒加几道水渍 */
export function makeStone(base = [176, 172, 164], seed = 3) {
  return once(`stone${base}${seed}`, () => {
    const S = 512, { c, g } = canvas(S), r = rng(seed)
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, S, S)
    for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,66,60' : '240,236,228'},${0.1 + r() * 0.18})`; g.fillRect(r() * S, r() * S, 1 + r(), 1 + r()) }
    for (let i = 0; i < 40; i++) { const x = r() * S, y = r() * S, q = g.createRadialGradient(x, y, 0, x, y, 30 + r() * 60); q.addColorStop(0, 'rgba(60,62,58,0.10)'); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(0, 0, S, S) }
    return tex(c, true)
  })
}

/** 木纹：深浅相间的长条纹 */
export function makeWood(base = [168, 124, 80]) {
  return once(`wood${base}`, () => {
    const W = 64, H = 512, { c, g } = canvas(W, H), r = rng(31)
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 70; i++) { const x = r() * W, v = (r() - 0.5) * 50; g.strokeStyle = `rgba(${base[0] + v},${base[1] + v * 0.8},${base[2] + v * 0.6},0.6)`; g.lineWidth = 0.6 + r() * 2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= H; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 2, y); g.stroke() }
    return tex(c, true)
  })
}

/** 画板的板面：深墨绿的磨砂面，淡淡的方格（每格 1 dm），擦过的粉笔灰 */
export function makeSlate(wCells: number, hCells: number) {
  return once(`slate${wCells}x${hCells}`, () => {
    const per = 64, W = wCells * per, H = hCells * per, { c, g } = canvas(W, H), r = rng(17)
    g.fillStyle = '#1d2b2a'; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H, rad = 60 + r() * 160, q = g.createRadialGradient(x, y, 0, x, y, rad); q.addColorStop(0, `rgba(${r() < 0.5 ? '210,225,220' : '8,16,16'},0.06)`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - rad, y - rad, rad * 2, rad * 2) }
    for (let i = 0; i < 16000; i++) { g.fillStyle = `rgba(220,235,230,${0.03 + r() * 0.06})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1) }
    g.strokeStyle = 'rgba(200,225,220,0.13)'; g.lineWidth = 1.5
    for (let x = 0; x <= wCells; x++) { g.beginPath(); g.moveTo(x * per, 0); g.lineTo(x * per, H); g.stroke() }
    for (let y = 0; y <= hCells; y++) { g.beginPath(); g.moveTo(0, y * per); g.lineTo(W, y * per); g.stroke() }
    return tex(c)
  })
}

/** 天线的反射面：一圈圈铝面板，面板之间有细缝。u 沿圆周、v 沿半径 */
export function makePanels() {
  return once('panels', () => {
    const W = 1024, H = 512, { c, g } = canvas(W, H), r = rng(29)
    g.fillStyle = '#e9ebe9'; g.fillRect(0, 0, W, H)
    const rings = [0, 0.18, 0.42, 0.7, 1], per = [8, 16, 32, 32]
    for (let k = 0; k < 4; k++) for (let i = 0; i < per[k]; i++) { const v = (r() - 0.5) * 14; g.fillStyle = `rgb(${232 + v},${234 + v},${233 + v})`; g.fillRect(i * W / per[k] + 1, rings[k] * H + 1, W / per[k] - 2, (rings[k + 1] - rings[k]) * H - 2) }
    g.fillStyle = 'rgba(96,104,108,0.75)'
    for (let k = 0; k < 4; k++) { g.fillRect(0, rings[k] * H - 1.5, W, 3); for (let i = 0; i < per[k]; i++) g.fillRect(i * W / per[k] - 1, rings[k] * H, 2, (rings[k + 1] - rings[k]) * H) }
    return tex(c, true)
  })
}

/** 玻璃幕墙：深色玻璃一格一格，映着一点天光，格子之间是铝框 */
export function makeCurtain() {
  return once('curtain', () => {
    const W = 256, H = 256, { c, g } = canvas(W, H), r = rng(43)
    g.fillStyle = '#4a5358'; g.fillRect(0, 0, W, H)
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const q = g.createLinearGradient(0, y * 128, 0, y * 128 + 128), v = r() * 10
      q.addColorStop(0, `rgb(${28 + v},${44 + v},${56 + v})`); q.addColorStop(1, `rgb(${14 + v},${24 + v},${32 + v})`)
      g.fillStyle = q; g.fillRect(x * 128 + 2, y * 128 + 2, 124, 124)
    }
    return tex(c, true)
  })
}

/** 天象厅穹顶里的星空：深蓝底上疏密不一的星点 */
export function makeStars() {
  return once('stars', () => {
    const W = 2048, H = 1024, { c, g } = canvas(W, H), r = rng(71)
    g.fillStyle = '#070b16'; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 12; i++) { const x = r() * W, y = r() * H, rad = 150 + r() * 260, q = g.createRadialGradient(x, y, 0, x, y, rad); q.addColorStop(0, 'rgba(40,58,110,0.35)'); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - rad, y - rad, rad * 2, rad * 2) }
    for (let i = 0; i < 1500; i++) { const s = r(), a = 0.35 + r() * 0.65; g.fillStyle = `rgba(${220 + r() * 35},${225 + r() * 30},255,${a})`; g.beginPath(); g.arc(r() * W, r() * H, s < 0.9 ? 1 + r() * 1.2 : 2.2 + r() * 1.8, 0, 7); g.fill() }
    return tex(c, true)
  })
}
