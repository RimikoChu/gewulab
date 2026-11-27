// 手工活的贴图：釉面花砖的砖面（带一朵印花）、正多边形花砖、剪纸（镂空的锯齿纹、月牙纹、细线连接）和铅笔描的花样、蓝印花布的花瓣。
// 全部用 canvas 画，不用下载素材。坐标约定：花样按 cm 给，画到贴图上时 1 cm = PX 像素。
import * as THREE from 'three'
import { rng } from './mats'
import type { P } from './physics'

function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }
const memo = new Map<string, THREE.Texture>()
const once = (key: string, f: () => THREE.Texture) => { const hit = memo.get(key); if (hit) return hit; const t = f(); memo.set(key, t); return t }

// ---------- 花砖 ----------
/** 一朵四瓣（或 n 瓣）印花：画在 (x, y)，半径 R */
function flower(g: CanvasRenderingContext2D, x: number, y: number, R: number, n: number, ink: string, light: string, rot = 0) {
  for (let k = 0; k < n; k++) {
    const a = rot + k / n * Math.PI * 2
    g.save(); g.translate(x, y); g.rotate(a)
    g.fillStyle = ink; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(R * 0.35, -R * 0.42, R * 0.95, -R * 0.3, R, 0); g.bezierCurveTo(R * 0.95, R * 0.3, R * 0.35, R * 0.42, 0, 0); g.fill()
    g.fillStyle = light; g.beginPath(); g.ellipse(R * 0.55, 0, R * 0.2, R * 0.07, 0, 0, 7); g.fill()
    // 瓣间的小叶
    g.rotate(Math.PI / n); g.fillStyle = ink; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(R * 0.62, 0, R * 0.2, R * 0.08, 0, 0, 7); g.fill(); g.globalAlpha = 1
    g.restore()
  }
  g.fillStyle = light; g.beginPath(); g.arc(x, y, R * 0.16, 0, 7); g.fill()
  g.fillStyle = ink; g.beginPath(); g.arc(x, y, R * 0.07, 0, 7); g.fill()
}
/** 釉面的底：中间亮、边上略深，带几粒釉面的小气孔 */
function glazeBase(g: CanvasRenderingContext2D, S: number, base: string, seed: number) {
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  const q = g.createRadialGradient(S * 0.4, S * 0.35, S * 0.05, S / 2, S / 2, S * 0.75); q.addColorStop(0, 'rgba(255,255,255,0.16)'); q.addColorStop(1, 'rgba(0,0,0,0.14)')
  g.fillStyle = q; g.fillRect(0, 0, S, S)
  const r = rng(seed); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.05 + r() * 0.08})`; g.beginPath(); g.arc(r() * S, r() * S, 0.6 + r() * 1.4, 0, 7); g.fill() }
}
/** 方形釉面花砖的砖面：一格一朵印花，四角各四分之一朵，内圈一道边线。base 釉色，ink 花色，light 点缀色 */
export function tileFace(base: string, ink: string, light: string, seed = 3) {
  return once(`tile:${base}:${ink}`, () => {
    const S = 256, { c, g } = canvas(S)
    glazeBase(g, S, base, seed)
    g.strokeStyle = ink; g.lineWidth = 3; g.globalAlpha = 0.75; g.strokeRect(14, 14, S - 28, S - 28); g.lineWidth = 1.2; g.strokeRect(22, 22, S - 44, S - 44); g.globalAlpha = 1
    flower(g, S / 2, S / 2, S * 0.3, 4, ink, light, Math.PI / 4)
    for (const [x, y] of [[0, 0], [S, 0], [0, S], [S, S]]) flower(g, x, y, S * 0.16, 4, ink, light)
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
  })
}
/** 正多边形花砖的砖面：贴图铺满多边形的外接方框；pts 是多边形顶点（单位随意），画成釉面、内圈描边、正中一朵 n 瓣花 */
export function polyFace(pts: P[], base: string, ink: string, light: string) {
  return once(`poly:${pts.map(p => p.join(',')).join(';')}:${base}`, () => {
    const S = 512, { c, g } = canvas(S)
    const u0 = Math.min(...pts.map(p => p[0])), u1 = Math.max(...pts.map(p => p[0])), v0 = Math.min(...pts.map(p => p[1])), v1 = Math.max(...pts.map(p => p[1]))
    const X = (u: number) => (u - u0) / (u1 - u0) * S, Y = (v: number) => (v1 - v) / (v1 - v0) * S
    glazeBase(g, S, base, pts.length)
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
    for (const [k, w] of [[0.86, 5], [0.8, 2]] as const) { g.strokeStyle = ink; g.lineWidth = w; g.globalAlpha = 0.8; g.beginPath(); pts.forEach(([u, v], i) => { const x = X(cx + (u - cx) * k), y = Y(cy + (v - cy) * k); if (i) g.lineTo(x, y); else g.moveTo(x, y) }); g.closePath(); g.stroke() }
    g.globalAlpha = 1
    flower(g, X(cx), Y(cy), S * 0.28, pts.length, ink, light, -Math.PI / 2)
    return tex(c)
  })
}

// ---------- 剪纸 ----------
const PX = 40   // 1 cm = 40 像素
/** 红纸的底色和纤维 */
function redPaper(g: CanvasRenderingContext2D, W: number, H: number, seed: number) {
  g.fillStyle = '#c8191c'; g.fillRect(0, 0, W, H)
  const r = rng(seed)
  for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H, R = 30 + r() * 90, q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(230,40,40,0.25)' : 'rgba(140,10,14,0.2)'); q.addColorStop(1, 'rgba(200,25,28,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '255,90,90' : '110,0,0'},${0.1 + r() * 0.16})`; g.lineWidth = 0.7; g.beginPath(); const x = r() * W, y = r() * H, a = r() * 6; g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10, x + Math.cos(a + 0.6) * 22, y + Math.sin(a + 0.6) * 22); g.stroke() }
}
/** 一个月牙：中心 (x, y)，外圆半径 R，开口朝 dir（弧度）。返回多边形的点（像素） */
function crescent(x: number, y: number, R: number, dir: number): [number, number][] {
  const d = R * 0.45, r = Math.hypot(d, R), out: [number, number][] = []
  for (let i = 0; i <= 16; i++) { const t = Math.PI / 2 + i / 16 * Math.PI; out.push([R * Math.cos(t), R * Math.sin(t)]) }
  const a1 = Math.atan2(-R, -d), a0 = Math.atan2(R, -d)
  const s = a1 < 0 ? a1 + Math.PI * 2 : a1
  for (let i = 0; i <= 16; i++) { const t = s + (a0 - s) * i / 16; out.push([d + r * Math.cos(t), r * Math.sin(t)]) }
  const c = Math.cos(dir + Math.PI), sn = Math.sin(dir + Math.PI)
  return out.map(([u, v]) => [x + u * c - v * sn, y + u * sn + v * c])
}
/**
 * 剪纸花样的装饰：沿轮廓往里一圈锯齿，里面撒几个月牙，再加上原来的镂空。都在剪影里面，不碰外缘，所以留下的是细线连接的纸。
 * 返回要剪掉的一组多边形（cm）
 */
function decorate(sil: P[], holes: P[][], seed: number, keep?: (p: P) => boolean) {
  const r = rng(seed)
  const c: P = [sil.reduce((s, p) => s + p[0], 0) / sil.length, sil.reduce((s, p) => s + p[1], 0) / sil.length]
  const inside = (p: P) => { let o = false; for (let i = 0, j = sil.length - 1; i < sil.length; j = i++) { const [xi, yi] = sil[i], [xj, yj] = sil[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) o = !o } return o }
  const distEdge = (p: P) => { let m = Infinity; for (let i = 0; i < sil.length; i++) { const a = sil[i], b = sil[(i + 1) % sil.length], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); m = Math.min(m, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)) } return m }
  const ok = (p: P, gap: number) => inside(p) && distEdge(p) > gap && (!keep || keep(p))
  const cuts: P[][] = []
  const inHole = (p: P) => holes.some(h => { let o = false; for (let i = 0, j = h.length - 1; i < h.length; j = i++) { const [xi, yi] = h[i], [xj, yj] = h[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) o = !o } return o })
  // 锯齿：轮廓往里收 0.82 倍的一圈上，每 0.6 cm 一个小三角，尖朝外
  const ring = sil.map(p => [c[0] + (p[0] - c[0]) * 0.8, c[1] + (p[1] - c[1]) * 0.8] as P)
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(L / 0.6)
    const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L
    for (let k = 0; k < n; k++) {
      const m: P = [a[0] + tx * (k + 0.5) * 0.6 * L / (n * 0.6), a[1] + ty * (k + 0.5) * 0.6 * L / (n * 0.6)]
      let nx = -ty, ny = tx; if ((m[0] - c[0]) * nx + (m[1] - c[1]) * ny < 0) { nx = -nx; ny = -ny }
      const tri: P[] = [[m[0] - tx * 0.22, m[1] - ty * 0.22], [m[0] + tx * 0.22, m[1] + ty * 0.22], [m[0] + nx * 0.42, m[1] + ny * 0.42]]
      if (tri.every(p => ok(p, 0.32) && !inHole(p))) cuts.push(tri)
    }
  }
  // 月牙：在里圈的格点上，开口朝向中心
  const xs = sil.map(p => p[0]), ys = sil.map(p => p[1])
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1.7) for (let y = Math.min(...ys); y <= Math.max(...ys); y += 1.7) {
    const p: P = [x + (r() - 0.5) * 0.5, y + (r() - 0.5) * 0.5]
    const R = 0.55 + r() * 0.2
    if (!ok(p, R + 1.1) || inHole(p) || holes.some(h => h.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < R + 0.6))) continue
    const pts = crescent(p[0], p[1], R, Math.atan2(c[1] - p[1], c[0] - p[0]))
    cuts.push(pts as P[])
  }
  return [...holes, ...cuts]
}
function path(g: CanvasRenderingContext2D, pts: P[], X: (u: number) => number, Y: (v: number) => number) { g.beginPath(); pts.forEach(([u, v], i) => { if (i) g.lineTo(X(u), Y(v)); else g.moveTo(X(u), Y(v)) }); g.closePath() }

/**
 * 剪纸的两张贴图：cut 是剪好的（剪掉的地方透明），pencil 是整张红纸上用铅笔描好的花样。
 * box：贴图覆盖的范围 [u0, v0, u1, v1]（cm）；sil：剪影；holes：原有的镂空；edge：只描这几段边（剪的路线），不描折痕
 */
export function paperCut(key: string, box: [number, number, number, number], sil: P[], holes: P[][], seed = 5, keep?: (p: P) => boolean) {
  const [u0, v0, u1, v1] = box, W = Math.round((u1 - u0) * PX), H = Math.round((v1 - v0) * PX)
  const X = (u: number) => (u - u0) * PX, Y = (v: number) => (v1 - v) * PX
  const cuts = decorate(sil, holes, seed, keep)
  const cut = once(`cut:${key}`, () => {
    const { c, g } = canvas(W, H)
    redPaper(g, W, H, seed)
    // 剪影以外全部剪掉，再剪去装饰
    g.fillStyle = '#000'
    g.globalCompositeOperation = 'destination-in'; path(g, sil, X, Y); g.fill()
    g.globalCompositeOperation = 'destination-out'; for (const h of cuts) { path(g, h, X, Y); g.fill() }
    g.globalCompositeOperation = 'source-over'
    return tex(c)
  })
  const pencil = once(`pencil:${key}`, () => {
    const { c, g } = canvas(W, H)
    redPaper(g, W, H, seed)
    g.strokeStyle = 'rgba(28,22,22,0.9)'; g.lineWidth = 3.2; path(g, sil, X, Y); g.stroke()
    g.lineWidth = 2; g.strokeStyle = 'rgba(28,22,22,0.75)'; for (const h of cuts) { path(g, h, X, Y); g.stroke() }
    return tex(c)
  })
  return { cut, pencil }
}

// ---------- 蓝印花布的花瓣 ----------
/** 印上去的一片花瓣：靛蓝的底、白色的防染花纹（中脉、一串白点、边上一圈细白线）。box 是花瓣的外接框（cm），外面透明 */
export function indigoPetal(pts: P[], box: [number, number, number, number]) {
  return once('petal', () => {
    const [u0, v0, u1, v1] = box, S = 40, W = Math.round((u1 - u0) * S), H = Math.round((v1 - v0) * S)
    const X = (u: number) => (u - u0) * S, Y = (v: number) => (v1 - v) * S
    const { c, g } = canvas(W, H), r = rng(77)
    path(g, pts, X, Y); g.fillStyle = '#1f3672'; g.fill()
    g.save(); path(g, pts, X, Y); g.clip()
    for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, R = 6 + r() * 20, q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(60,90,160,0.35)'); q.addColorStop(1, 'rgba(60,90,160,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
    // 边上一圈细白线：轮廓往里收一点
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
    g.strokeStyle = '#eef1f5'; g.lineWidth = 2.2; g.setLineDash([5, 3]); path(g, pts.map(([u, v]) => [cx + (u - cx) * 0.8, cy + (v - cy) * 0.8] as P), X, Y); g.stroke(); g.setLineDash([])
    // 中脉和两边的白点
    g.strokeStyle = '#eef1f5'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(u0 + 1), Y(cy)); g.quadraticCurveTo(X(cx), Y(cy + 1.4), X(u1 - 1.8), Y(cy + 0.3)); g.stroke()
    g.fillStyle = '#eef1f5'
    for (let k = 0; k < 7; k++) { const t = 0.15 + k * 0.11, x = u0 + 1 + (u1 - u0 - 2.8) * t, y = cy + Math.sin(t * Math.PI) * 1.2; for (const s of [-1, 1]) { g.beginPath(); g.arc(X(x), Y(y + s * 0.85), 3.2, 0, 7); g.fill() } }
    g.restore()
    return tex(c)
  })
}
