// 程序画出来的贴图：沥青、混凝土地坪、保温层外面的铝皮、剖面的斜线、耐火砖、格栅、瓷砖、台面、标牌。都缓存，只画一次。
import * as THREE from 'three'

const cache = new Map<string, THREE.Texture>()
function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, rnd: () => number) => void) {
  const hit = cache.get(key); if (hit) return hit
  const c = document.createElement('canvas'); c.width = w; c.height = h
  let s = key.length * 7919 + 13; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  draw(c.getContext('2d')!, rnd)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  cache.set(key, t); return t
}
/** 同一张贴图换一种重复次数 */
export function rep(t: THREE.Texture, x: number, y: number) { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c }
const speck = (g: CanvasRenderingContext2D, rnd: () => number, n: number, S: number, cols: string[], a0: number, a1: number, r0 = 1, r1 = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${cols[Math.floor(rnd() * cols.length)]},${a0 + rnd() * (a1 - a0)})`; const r = r0 + rnd() * (r1 - r0); g.fillRect(rnd() * S, rnd() * S, r, r) } }

/** 沥青：深灰底上撒细石子 */
export const asphaltTex = () => make('asphalt', 512, 512, (g, r) => { g.fillStyle = '#6f706e'; g.fillRect(0, 0, 512, 512); speck(g, r, 16000, 512, ['30,30,30', '150,150,146', '95,95,92'], 0.15, 0.5) })
/** 混凝土地坪：一块块浇的，有伸缩缝和水渍 */
export const slabTex = () => make('slab', 512, 512, (g, r) => {
  g.fillStyle = '#a9a69d'; g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 60; i++) { const x = r() * 512, y = r() * 512, rad = 30 + r() * 80, q = g.createRadialGradient(x, y, 0, x, y, rad); q.addColorStop(0, `rgba(${r() < 0.5 ? '70,68,62' : '205,202,192'},0.16)`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - rad, y - rad, rad * 2, rad * 2) }
  speck(g, r, 9000, 512, ['60,60,56', '215,212,204'], 0.08, 0.3)
  g.fillStyle = 'rgba(40,40,38,0.6)'; g.fillRect(0, 0, 512, 3); g.fillRect(0, 0, 3, 512)
})
/** 保温层外面包的铝皮：一圈圈搭接缝、竖缝和铆钉；压成浅灰，不用纯白 */
export const jacketTex = () => make('jacket', 512, 512, (g, r) => {
  g.fillStyle = '#b9bdc0'; g.fillRect(0, 0, 512, 512)
  for (let y = 0; y < 512; y += 4) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '90,96,102'},${0.03 + r() * 0.05})`; g.fillRect(0, y, 512, 4) }
  for (let row = 0; row < 4; row++) {
    const y = row * 128
    g.fillStyle = 'rgba(60,64,70,0.55)'; g.fillRect(0, y, 512, 3); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, y + 3, 512, 2)
    const x0 = (row % 2) * 128 + 40
    for (let x = x0; x < 512; x += 256) { g.fillStyle = 'rgba(60,64,70,0.45)'; g.fillRect(x, y, 2, 128); for (let k = 8; k < 128; k += 20) { g.fillStyle = 'rgba(70,74,80,0.7)'; g.beginPath(); g.arc(x + 6, y + k, 1.6, 0, 7); g.fill() } }
  }
  for (let i = 0; i < 26; i++) { const x = r() * 512, y = r() * 512, q = g.createLinearGradient(0, y, 0, y + 60 + r() * 80); q.addColorStop(0, 'rgba(70,66,58,0.14)'); q.addColorStop(1, 'rgba(70,66,58,0)'); g.fillStyle = q; g.fillRect(x, y, 3 + r() * 7, 140) }
})
/** 刷了漆的钢板：有焊缝和流下来的锈水印 */
export const plateTex = (base = '#8f969b') => make('plate' + base, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512)
  speck(g, r, 5000, 512, ['255,255,255', '30,30,30'], 0.03, 0.1, 1, 3)
  for (let y = 0; y < 512; y += 170) { g.fillStyle = 'rgba(30,32,36,0.4)'; g.fillRect(0, y, 512, 2); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, y + 2, 512, 2) }
  for (let x = 0; x < 512; x += 256) { g.fillStyle = 'rgba(30,32,36,0.3)'; g.fillRect(x, 0, 2, 512) }
  for (let i = 0; i < 30; i++) { const x = r() * 512, y = r() * 512, q = g.createLinearGradient(0, y, 0, y + 120); q.addColorStop(0, 'rgba(96,60,32,0.22)'); q.addColorStop(1, 'rgba(96,60,32,0)'); g.fillStyle = q; g.fillRect(x, y, 2 + r() * 5, 120) }
})
/** 剖面：45° 斜线 */
export const hatchTex = (base = '#9aa0a4', line = 'rgba(40,44,48,0.55)') => make('hatch' + base, 64, 64, g => {
  g.fillStyle = base; g.fillRect(0, 0, 64, 64); g.strokeStyle = line; g.lineWidth = 3
  for (let k = -64; k < 128; k += 16) { g.beginPath(); g.moveTo(k, 64); g.lineTo(k + 64, 0); g.stroke() }
})
/** 保温棉的剖面：米黄色的纤维 */
export const woolTex = () => make('wool', 128, 128, (g, r) => { g.fillStyle = '#d9c98f'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 700; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '120,100,50' : '250,240,200'},${0.2 + r() * 0.3})`; g.lineWidth = 1; const x = r() * 128, y = r() * 128; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 16, y + (r() - 0.5) * 6); g.stroke() } })
/** 耐火砖：错缝砌的浅黄砖 */
export const brickTex = () => make('brick', 256, 256, (g, r) => {
  g.fillStyle = '#6d6558'; g.fillRect(0, 0, 256, 256)
  for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) { const x = col * 64 + (row % 2) * 32, y = row * 32, v = 150 + r() * 50; g.fillStyle = `rgb(${v + 30},${v + 8},${v - 40})`; g.fillRect(x + 1.5, y + 1.5, 61, 29) }
  speck(g, r, 3000, 256, ['60,50,40', '255,240,210'], 0.06, 0.2)
})
/** 钢格栅板：细密的方孔 */
export const gratingTex = () => make('grating', 64, 64, g => { g.fillStyle = '#4c5257'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#16191c'; for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 8) g.fillRect(x + 1.5, y + 2, 5, 12) })
/** 化验室的地砖 */
export const tileTex = () => make('tile', 256, 256, (g, r) => { g.fillStyle = '#c9cbc6'; g.fillRect(0, 0, 256, 256); speck(g, r, 2500, 256, ['255,255,255', '120,124,120'], 0.05, 0.16, 1, 3); g.fillStyle = 'rgba(90,94,92,0.7)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 256) })
/** 化验台后面墙上的白瓷砖 */
export const wallTileTex = () => make('walltile', 128, 128, (g, r) => { g.fillStyle = '#d3d8d6'; g.fillRect(0, 0, 128, 128); g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.1})`; g.fillRect(4, 4, 120, 60); g.fillStyle = 'rgba(120,128,126,0.9)'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 0, 3, 128) })
/** 化验台的台面：深色的环氧树脂板，有细小的杂点 */
export const benchTex = () => make('bench', 256, 256, (g, r) => { g.fillStyle = '#2f3437'; g.fillRect(0, 0, 256, 256); speck(g, r, 5000, 256, ['120,128,132', '10,12,14'], 0.08, 0.3) })
/** 刷了乳胶漆的墙 */
export const wallTex = () => make('wall', 256, 256, (g, r) => { g.fillStyle = '#dcdcd4'; g.fillRect(0, 0, 256, 256); speck(g, r, 4000, 256, ['255,255,255', '150,150,140'], 0.04, 0.12, 1, 3) })
/** 压型钢板（棚子的屋面、墙面）：一道道竖棱 */
export const ribTex = (base = '#7f95a8') => make('rib' + base, 64, 64, g => { g.fillStyle = base; g.fillRect(0, 0, 64, 64); for (let x = 0; x < 64; x += 16) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, 0, 3, 64); g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x + 8, 0, 3, 64) } })
/** 皮带：黑胶面上一道道防滑纹 */
export const beltTex = () => make('belt', 64, 64, g => { g.fillStyle = '#26282a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#34373a'; g.fillRect(0, 0, 4, 64); g.fillRect(32, 0, 4, 64) })
/** 一堆白色的塑料颗粒 */
export const pelletTex = () => make('pellet', 256, 256, (g, r) => { g.fillStyle = '#d8d8d2'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { const x = r() * 256, y = r() * 256, rad = 3 + r() * 2; g.fillStyle = `rgba(${r() < 0.5 ? '250,250,246' : '170,172,170'},0.9)`; g.beginPath(); g.ellipse(x, y, rad, rad * 0.8, r() * 3, 0, 7); g.fill() } })

/** 一块标牌：几行字。bg 底色、fg 字色 */
export function makeSign(lines: string[], bg: string, fg: string, w = 512, h = 128) {
  return make('sign' + lines.join('|') + bg + w + h, w, h, g => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
    const fs = Math.min(h / lines.length * 0.62, w / Math.max(...lines.map(l => l.length)) * 0.9)
    g.font = `700 ${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`
    lines.forEach((l, i) => g.fillText(l, w / 2, h * (i + 0.5) / lines.length))
  })
}
/** 塑料回收标志：三个箭头围成的三角形，中间一个数字，下面是缩写 */
export function recycleSign(code: number, abbr: string) {
  return make('recycle2' + code, 256, 256, g => {
    g.fillStyle = '#f1efe6'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#1d5c48'; g.fillStyle = '#1d5c48'; g.lineWidth = 11; g.lineJoin = 'round'
    const P = [[128, 8], [246, 204], [10, 204]]
    for (let i = 0; i < 3; i++) {
      const a = P[i], b = P[(i + 1) % 3], ax = a[0] + (b[0] - a[0]) * 0.2, ay = a[1] + (b[1] - a[1]) * 0.2, bx = a[0] + (b[0] - a[0]) * 0.74, by = a[1] + (b[1] - a[1]) * 0.74
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke()
      const dx = (b[0] - a[0]) / 180, dy = (b[1] - a[1]) / 180
      g.beginPath(); g.moveTo(bx + dx * 26, by + dy * 26); g.lineTo(bx - dy * 17, by + dx * 17); g.lineTo(bx + dy * 17, by - dx * 17); g.fill()
    }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 124px ui-sans-serif, sans-serif'; g.fillText(String(code), 128, 142)
    g.font = '700 34px ui-sans-serif, sans-serif'; g.fillText(abbr, 128, 236)
  })
}
