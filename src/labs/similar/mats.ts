// 程序画出来的贴图：塑胶跑道、草皮、篮球场面、广场透水砖、教学楼面砖、窗、护坡、青砖、瓦、卷尺刻度、量角器、国旗、手机屏。不用下载素材。
import * as THREE from 'three'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
/** 拿一份能单独设重复次数的贴图 */
export const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c }

/** 撒一层细小颗粒：颜色在 a、b 之间 */
function speckle(g: CanvasRenderingContext2D, W: number, H: number, n: number, cols: string[], r: () => number, a0 = 0.15, a1 = 0.35, s = 2) {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${cols[Math.floor(r() * cols.length)]},${a0 + r() * (a1 - a0)})`; g.fillRect(r() * W, r() * H, 1 + r() * s, 1 + r() * s) }
}

/** 塑胶跑道：砖红色的颗粒面，一张图 2 m */
export const makeTrack = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  g.fillStyle = '#a5463a'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 60; i++) { const x = r() * S, y = r() * S, R = 30 + r() * 80, q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(120,40,32,0.25)' : 'rgba(190,96,80,0.2)'); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  speckle(g, S, S, 26000, ['90,30,24', '200,110,92', '150,60,48', '60,24,20'], r, 0.2, 0.5, 1.6)
  return tex(c)
})
/** 人造草皮：一深一浅的割草条纹（每条 5 m），细小的草丝 */
export const makeTurf = once(() => {
  const W = 512, H = 512, { c, g } = canvas(W, H), r = rng(8)
  for (let i = 0; i < 2; i++) { g.fillStyle = i ? '#3f7a3a' : '#477f40'; g.fillRect(i * W / 2, 0, W / 2, H) }
  speckle(g, W, H, 40000, ['40,80,36', '90,140,70', '30,60,30', '110,150,80'], r, 0.1, 0.35, 1.2)
  return tex(c)
})
/** 篮球场的丙烯酸面：蓝绿色、细砂面 */
export const makeCourt = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(17)
  g.fillStyle = '#3c7d80'; g.fillRect(0, 0, S, S)
  speckle(g, S, S, 16000, ['30,70,72', '110,160,160', '200,220,220'], r, 0.08, 0.25, 1.2)
  return tex(c)
})
/** 广场透水砖：20 × 10 cm 的砖错缝铺，灰白和浅灰两种；一张图 2 m */
export const makePavers = once(() => {
  const S = 1024, { c, g } = canvas(S), b = canvas(S), r = rng(23), PX = S / 2  // 1 m = 512 px
  g.fillStyle = '#6d6a64'; g.fillRect(0, 0, S, S); b.g.fillStyle = '#000'; b.g.fillRect(0, 0, S, S)
  const w = PX * 0.2, h = PX * 0.1, gap = 3
  for (let row = 0; row < S / h; row++) for (let i = -1; i < S / w + 1; i++) {
    const x = i * w + (row % 2) * w / 2, y = row * h, v = 168 + Math.floor(r() * 26) - (r() < 0.12 ? 26 : 0)
    g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.fillRect(x + gap / 2, y + gap / 2, w - gap, h - gap)
    b.g.fillStyle = '#fff'; b.g.fillRect(x + gap, y + gap, w - gap * 2, h - gap * 2)
  }
  speckle(g, S, S, 30000, ['120,118,110', '210,208,200', '90,88,84'], r, 0.1, 0.3, 1.5)
  return { map: tex(c), bump: tex(b.c, false) }
})
/** 教学楼的外墙面砖：米白色 45 × 95 mm 的小条砖；一张图 1 m */
export const makeFacade = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(29)
  g.fillStyle = '#c9c4b8'; g.fillRect(0, 0, S, S)
  const w = S / 10.5, h = S / 22
  for (let y = 0; y < 22; y++) for (let x = 0; x < 11; x++) { const v = 226 + Math.floor(r() * 16); g.fillStyle = `rgb(${v},${v - 3},${v - 10})`; g.fillRect(x * w + 1.5, y * h + 1.5, w - 3, h - 3) }
  const q = g.createLinearGradient(0, 0, 0, S); q.addColorStop(0, 'rgba(0,0,0,0)'); q.addColorStop(1, 'rgba(90,86,76,0.08)'); g.fillStyle = q; g.fillRect(0, 0, S, S)
  return tex(c)
})
/** 一扇推拉窗：铝框、两扇玻璃（天空的反光渐变）、中间一根竖挺 */
export const makeWindow = once(() => {
  const W = 256, H = 256, { c, g } = canvas(W, H)
  g.fillStyle = '#d7dadc'; g.fillRect(0, 0, W, H)
  const glass = g.createLinearGradient(0, 0, W * 0.3, H); glass.addColorStop(0, '#9fb9cc'); glass.addColorStop(0.45, '#5f7a8e'); glass.addColorStop(0.5, '#89a3b6'); glass.addColorStop(1, '#3d5363'); g.fillStyle = glass
  g.fillRect(12, 12, W / 2 - 18, H - 24); g.fillRect(W / 2 + 6, 12, W / 2 - 18, H - 24)
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(20, 12); g.lineTo(70, 12); g.lineTo(20, 110); g.fill()
  g.fillStyle = '#b9bdc0'; g.fillRect(W / 2 - 6, 8, 12, H - 16); g.fillRect(0, H * 0.24, W, 6)
  g.strokeStyle = '#8f9496'; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, H - 12)
  return tex(c)
})
/** 教室门：浅木色门板，上半截一块小玻璃 */
export const makeDoor = once(() => {
  const W = 128, H = 256, { c, g } = canvas(W, H), r = rng(31)
  g.fillStyle = '#b48a5c'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(90,60,30,${0.08 + r() * 0.1})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const x = r() * W; g.moveTo(x, 0); g.bezierCurveTo(x + 6, H * 0.3, x - 6, H * 0.6, x + 3, H); g.stroke() }
  g.fillStyle = '#4b6474'; g.fillRect(34, 30, 60, 70); g.strokeStyle = '#7a5a36'; g.lineWidth = 5; g.strokeRect(34, 30, 60, 70)
  g.fillStyle = '#d8d8d4'; g.fillRect(100, 132, 14, 6)
  g.strokeStyle = 'rgba(60,40,20,0.5)'; g.lineWidth = 3; g.strokeRect(2, 2, W - 4, H - 4)
  return tex(c)
})
/** 护坡：混凝土方格骨架里长着草，一格 1 m */
export const makeSlopeGrid = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(37)
  g.fillStyle = '#5c7a3e'; g.fillRect(0, 0, S, S)
  speckle(g, S, S, 9000, ['70,110,50', '110,140,70', '40,70,30', '130,120,70'], r, 0.2, 0.5, 2)
  g.fillStyle = '#b4b0a4'; g.fillRect(0, 0, S, 22); g.fillRect(0, 0, 22, S)
  speckle(g, 22, S, 600, ['120,116,108', '200,196,186'], r, 0.2, 0.4, 2); speckle(g, S, 22, 600, ['120,116,108', '200,196,186'], r, 0.2, 0.4, 2)
  return tex(c)
})
/** 毛石挡土墙：大小不一的石块和灰缝 */
export const makeRubble = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(41)
  g.fillStyle = '#6a665e'; g.fillRect(0, 0, S, S)
  let y = 0
  while (y < S) { const h = 40 + r() * 30; let x = -r() * 60; while (x < S) { const w = 50 + r() * 70, v = 128 + Math.floor(r() * 50); g.fillStyle = `rgb(${v},${v - 4},${v - 12})`; g.beginPath(); g.roundRect(x + 3, y + 3, w - 6, h - 6, 10); g.fill(); x += w } y += h }
  speckle(g, S, S, 12000, ['80,78,72', '200,196,186'], r, 0.1, 0.3, 2)
  return tex(c)
})
/** 古塔的青砖墙：一顺一丁的灰砖，旧得发暗 */
export const makeBrick = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(43)
  g.fillStyle = '#4e4d4a'; g.fillRect(0, 0, S, S)
  const h = S / 16, w = S / 4
  for (let row = 0; row < 16; row++) for (let i = -1; i < 5; i++) { const x = i * w + (row % 2) * w / 2, v = 112 + Math.floor(r() * 26); g.fillStyle = `rgb(${v},${v + 2},${v + 2})`; g.fillRect(x + 2, row * h + 2, w - 4, h - 4) }
  for (let i = 0; i < 30; i++) { const x = r() * S, y0 = r() * S * 0.5, l = 60 + r() * 200, q = g.createLinearGradient(0, y0, 0, y0 + l); q.addColorStop(0, 'rgba(40,40,36,0.25)'); q.addColorStop(1, 'rgba(40,40,36,0)'); g.fillStyle = q; g.fillRect(x, y0, 4 + r() * 10, l) }
  speckle(g, S, S, 10000, ['70,70,66', '170,170,164'], r, 0.1, 0.3, 2)
  return tex(c)
})
/** 塔檐上的小青瓦：一垄一垄 */
export const makeTiles = once(() => {
  const W = 256, H = 128, { c, g } = canvas(W, H), r = rng(47)
  g.fillStyle = '#2d3032'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 16; i++) { const x = i * W / 16, q = g.createLinearGradient(x, 0, x + W / 16, 0); q.addColorStop(0, '#2a2c2e'); q.addColorStop(0.5, `rgb(${78 + r() * 14},${82 + r() * 14},${86 + r() * 14})`); q.addColorStop(1, '#232527'); g.fillStyle = q; g.fillRect(x, 0, W / 16, H) }
  speckle(g, W, H, 3000, ['40,42,44', '120,124,126'], r, 0.1, 0.3, 2)
  return tex(c)
})
/** 卷尺尺带：黄底，每厘米一道短线，每 10 厘米一道长线，每米一道红线。一张图 1 m */
export const makeTapeTicks = once(() => {
  const W = 1024, H = 64, { c, g } = canvas(W, H)
  g.fillStyle = '#f2c94a'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#1d1d1b'
  for (let i = 0; i < 100; i++) { const x = i * W / 100; g.fillRect(x, 0, 2, i % 10 === 0 ? 40 : i % 5 === 0 ? 26 : 14) }
  g.fillStyle = '#c8372d'; g.fillRect(0, 0, 6, H)
  g.fillStyle = '#1d1d1b'; g.font = '700 22px ui-monospace, Menlo, monospace'
  for (let i = 1; i < 10; i++) g.fillText(String(i * 10), i * W / 10 + 5, 58)
  return tex(c)
})
/** 半圆量角器（测角仪用）：透明塑料上印的刻度，直边在上、圆弧朝下，中心在上边正中。刻度从正下方的 0 往两边数到 90，正下方一道红线 */
export const makeProtractor = once(() => {
  const W = 1024, H = 540, { c, g } = canvas(W, H), cx = W / 2, cy = 20, R = 500
  g.clearRect(0, 0, W, H)
  g.fillStyle = 'rgba(240,246,250,0.88)'; g.beginPath(); g.moveTo(cx + R, cy); g.arc(cx, cy, R, 0, Math.PI); g.closePath(); g.fill()
  g.strokeStyle = '#1c2a33'; g.fillStyle = '#1c2a33'
  for (let d = 0; d <= 180; d++) {
    const a = d * Math.PI / 180, l = d % 10 === 0 ? 60 : d % 5 === 0 ? 40 : 22
    g.lineWidth = d % 10 === 0 ? 3 : 1.6
    g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l)); g.stroke()
  }
  g.font = '600 30px ui-sans-serif, system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let d = 0; d <= 180; d += 10) { const a = d * Math.PI / 180, rr = R - 86; g.fillText(String(Math.abs(90 - d)), cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) }
  g.strokeStyle = '#c8372d'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + R); g.stroke()
  g.lineWidth = 2; g.strokeStyle = '#1c2a33'; g.beginPath(); g.arc(cx, cy, R - 120, 0, Math.PI); g.stroke()
  g.fillStyle = '#1c2a33'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
})
/** 国旗：长宽 3 ∶ 2，大五角星在左上，四颗小星各有一个尖正对大星中心 */
export const makeFlag = once(() => {
  const W = 600, H = 400, { c, g } = canvas(W, H), u = W / 30
  g.fillStyle = '#de2910'; g.fillRect(0, 0, W, H)
  const star = (x: number, y: number, R: number, rot: number) => {
    g.beginPath()
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? R * 0.382 : R, a = rot + i * Math.PI / 5; g.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr) }
    g.closePath(); g.fill()
  }
  g.fillStyle = '#ffde00'
  star(5 * u, 5 * u, 3 * u, 0)
  for (const [x, y] of [[10, 2], [12, 4], [12, 7], [10, 9]]) star(x * u, y * u, u, Math.atan2(5 - x, -(5 - y)))
  return tex(c)
})
/** 手机测角工具的屏幕：深色底，大字角度 */
export function makePhoneScreen(text: string) {
  const W = 256, H = 512, { c, g } = canvas(W, H)
  g.fillStyle = '#0d1114'; g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(20, H / 2); g.lineTo(W - 20, H / 2); g.stroke()
  g.strokeStyle = '#7fe3d4'; g.lineWidth = 4; g.beginPath(); g.arc(W / 2, H / 2, 70, -Math.PI / 2, -Math.PI / 2 + 1.2); g.stroke()
  g.fillStyle = '#ffffff'; g.font = '700 64px ui-sans-serif, system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 120)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
/** 树皮 */
export const makeBark = once(() => {
  const W = 128, H = 256, { c, g } = canvas(W, H), r = rng(53)
  g.fillStyle = '#5a4a3a'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '40,30,22' : '120,104,86'},${0.3 + r() * 0.3})`; g.lineWidth = 1 + r() * 3; const x = r() * W; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, H / 3, x - 8, H * 2 / 3, x, H); g.stroke() }
  return tex(c)
})
/** 标杆（花杆）：每 20 cm 一段，红白相间 */
export const makeRodStripes = once(() => {
  const { c, g } = canvas(8, 256)
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#f2f0ea' : '#c8372d'; g.fillRect(0, i * 25.6, 8, 25.6) }
  const t = tex(c); t.wrapS = THREE.ClampToEdgeWrapping
  return t
})
/** 住宅楼的外墙：一张图是一层两户（宽 7 m、高 3 m）。k 选样式：0 白墙带凸阳台和栏杆，1 米黄面砖带窗套，2 浅灰墙带封闭阳台的玻璃窗，3 砖红色老楼 */
export const makeHousing = (k: number) => housing[k] ??= (() => {
  const W = 280, H = 120, { c, g } = canvas(W, H), r = rng(91 + k)
  const wall = ['#e8e4dc', '#d9c49c', '#bfc3c4', '#a8624c'][k], trim = ['#b9b4aa', '#b49c72', '#8f9597', '#7d4636'][k]
  g.fillStyle = wall; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + r() * 0.04})`; g.fillRect(r() * W, r() * H, 2, 2) }
  const glass = (x: number, y: number, w: number, h: number) => { const q = g.createLinearGradient(x, y, x + w * 0.4, y + h); q.addColorStop(0, '#8ea7b8'); q.addColorStop(0.5, '#4d6474'); q.addColorStop(1, '#2e3e4a'); g.fillStyle = q; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(230,230,225,0.9)'; g.fillRect(x + w / 2 - 1, y, 2, h); g.fillRect(x, y, w, 2) }
  for (const ox of [0, 140]) {
    if (k === 0) { glass(ox + 20, 26, 46, 62); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(ox + 76, 22, 52, 74); glass(ox + 80, 26, 44, 66); g.fillStyle = '#f4f2ee'; g.fillRect(ox + 72, 84, 60, 20); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(ox + 72, 104, 60, 4); g.strokeStyle = '#6d7276'; g.lineWidth = 2; for (let x = ox + 74; x < ox + 132; x += 6) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 84); g.stroke() } g.beginPath(); g.moveTo(ox + 72, 70); g.lineTo(ox + 132, 70); g.stroke() }
    else if (k === 1) { for (const x of [ox + 18, ox + 82]) { g.fillStyle = trim; g.fillRect(x - 4, 22, 48, 66); glass(x, 26, 40, 58) } }
    else if (k === 2) { g.fillStyle = trim; g.fillRect(ox + 10, 18, 120, 80); glass(ox + 14, 22, 112, 60); g.fillStyle = '#d8d9d6'; g.fillRect(ox + 10, 82, 120, 16) }
    else { for (const x of [ox + 22, ox + 86]) { g.fillStyle = '#e8e2d8'; g.fillRect(x - 3, 26, 38, 54); glass(x, 29, 32, 48) } g.fillStyle = 'rgba(40,20,14,0.25)'; for (let y = 0; y < H; y += 8) g.fillRect(ox, y, 140, 1) }
  }
  g.fillStyle = trim; g.fillRect(0, H - 6, W, 6)
  return tex(c)
})()
const housing: THREE.Texture[] = []
/** 木条的木纹：浅色松木，顺着长度方向的纹理和几个小节疤。一张图是 1 m 长的一段 */
export const makeWood = once(() => {
  const W = 1024, H = 64, { c, g } = canvas(W, H), r = rng(97)
  g.fillStyle = '#e2cfa8'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 70; i++) {
    const y0 = r() * H, amp = 2 + r() * 5, f = 0.004 + r() * 0.01, ph = r() * 6
    g.strokeStyle = `rgba(${130 + r() * 40},${90 + r() * 30},${50 + r() * 20},${0.18 + r() * 0.3})`; g.lineWidth = 0.6 + r() * 1.8
    g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, y0 + Math.sin(x * f + ph) * amp); g.stroke()
  }
  for (let i = 0; i < 3; i++) { const x = 100 + r() * 820, y = 12 + r() * 40, q = g.createRadialGradient(x, y, 0, x, y, 9); q.addColorStop(0, 'rgba(90,55,25,0.8)'); q.addColorStop(1, 'rgba(90,55,25,0)'); g.fillStyle = q; g.beginPath(); g.ellipse(x, y, 14, 7, 0, 0, 7); g.fill() }
  return tex(c)
})
/** 教学用大量角器的印刷层（透明底）：外圈、内圈两套 0–180 的刻度，每度一短线、每 5 度一中线、每 10 度一长线和数字，中心一个十字。直边在下，中心在下边正中 */
export const makeProtractorFlat = once(() => {
  const W = 1024, H = 540, { c, g } = canvas(W, H), cx = W / 2, cy = 512, R = 496
  g.clearRect(0, 0, W, H)
  g.strokeStyle = '#0d2233'; g.fillStyle = '#0d2233'
  for (let d = 0; d <= 180; d++) {
    const a = Math.PI + d * Math.PI / 180, l = d % 10 === 0 ? 52 : d % 5 === 0 ? 34 : 18
    g.lineWidth = d % 10 === 0 ? 3.2 : 1.8
    g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l)); g.stroke()
  }
  g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let d = 0; d <= 180; d += 10) {
    const a = Math.PI + d * Math.PI / 180
    g.save(); g.translate(cx + Math.cos(a) * (R - 80), cy + Math.sin(a) * (R - 80)); g.rotate(a + Math.PI / 2); g.font = '700 30px ui-sans-serif, system-ui'; g.fillStyle = '#0d2233'; g.fillText(String(d), 0, 0); g.restore()
    g.save(); g.translate(cx + Math.cos(a) * (R - 122), cy + Math.sin(a) * (R - 122)); g.rotate(a + Math.PI / 2); g.font = '600 24px ui-sans-serif, system-ui'; g.fillStyle = '#b0262b'; g.fillText(String(180 - d), 0, 0); g.restore()
  }
  g.lineWidth = 2; g.strokeStyle = '#0d2233'; g.beginPath(); g.arc(cx, cy, R - 150, Math.PI, 0); g.stroke()
  g.beginPath(); g.moveTo(cx - R, cy - 2); g.lineTo(cx + R, cy - 2); g.stroke()
  g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx - 22, cy - 2); g.lineTo(cx + 22, cy - 2); g.moveTo(cx, cy - 24); g.lineTo(cx, cy); g.stroke()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16
  return t
})
