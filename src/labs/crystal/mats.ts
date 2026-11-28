// 程序画出来的贴图：晶体实验室的地坪、墙面、展台石面、转台上的刻度圈、墙上的字。不用下载素材。
import * as THREE from 'three'
import { rng } from './parts'

function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, wrap = true) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.anisotropy = 8; return t }
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
export const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif'

/** 地坪：深灰的环氧自流平，淡淡的云斑，一张图是 2 m 见方的一格，四周一道细缝 */
export const floorTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(5)
  g.fillStyle = '#4b5055'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 120; i++) { const x = r() * S, y = r() * S, R = 30 + r() * 90; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(30,33,36,0.12)' : 'rgba(110,116,120,0.08)'); q.addColorStop(1, 'rgba(70,74,78,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,22,24' : '150,154,158'},${0.05 + r() * 0.1})`; g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5) }
  g.fillStyle = 'rgba(22,24,26,0.4)'; g.fillRect(0, 0, S, 1.5); g.fillRect(0, 0, 1.5, S)
  return tex(c)
})
/** 墙面：深青灰的乳胶漆，极淡的斑驳 */
export const wallTex = once(() => {
  const S = 256, { c, g } = canvas(S), r = rng(31)
  g.fillStyle = '#39444a'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, R = 10 + r() * 40; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, r() < 0.5 ? 'rgba(30,38,42,0.3)' : 'rgba(80,92,98,0.22)'); q.addColorStop(1, 'rgba(57,68,74,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  return tex(c)
})
/** 展台的石面：黑色水磨石，嵌着灰白的小石子 */
export const stoneTex = once(() => {
  const S = 512, { c, g } = canvas(S), r = rng(9)
  g.fillStyle = '#1f2326'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 900; i++) { const x = r() * S, y = r() * S, R = 1.5 + r() * r() * 7; g.fillStyle = `rgba(${r() < 0.6 ? '170,172,168' : r() < 0.5 ? '96,104,108' : '196,170,140'},${0.25 + r() * 0.45})`; g.beginPath(); g.ellipse(x, y, R * (0.7 + r() * 0.6), R, r() * 3.14, 0, Math.PI * 2); g.fill() }
  return tex(c)
})
/** 转台面上的刻度圈：透明底，每 5° 一条短线，每 30° 一条长线和一个数 */
export const dialTex = once(() => {
  const S = 1024, { c, g } = canvas(S)
  g.translate(S / 2, S / 2); g.strokeStyle = 'rgba(20,24,28,0.85)'; g.fillStyle = 'rgba(20,24,28,0.85)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 30px "Geist", sans-serif'
  for (let d = 0; d < 360; d += 5) {
    const a = d * Math.PI / 180, big = d % 30 === 0, r0 = big ? 420 : 446, r1 = 478
    g.lineWidth = big ? 5 : 2.5; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke()
    if (big) { g.save(); g.translate(Math.cos(a) * 388, Math.sin(a) * 388); g.rotate(a + Math.PI / 2); g.fillText(String(d), 0, 0); g.restore() }
  }
  g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 484, 0, Math.PI * 2); g.stroke()
  return tex(c, false)
})
/** 接触阴影：一团中间深、边上淡的圆影，贴在转台面上 */
export const blobTex = once(() => {
  const S = 256, { c, g } = canvas(S)
  const q = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); q.addColorStop(0, 'rgba(0,0,0,0.62)'); q.addColorStop(0.45, 'rgba(0,0,0,0.3)'); q.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = q; g.fillRect(0, 0, S, S)
  return tex(c, false)
})
/** 墙上的一行字 */
export function signTex(text: string, sub = '') {
  const W = 1024, H = 192, { c, g } = canvas(W, H)
  g.clearRect(0, 0, W, H); g.fillStyle = '#e9ecea'; g.textAlign = 'left'; g.textBaseline = 'middle'
  g.font = `600 92px ${FONT}`; g.fillText(text, 8, sub ? 70 : 96)
  if (sub) { g.font = `500 34px "Geist", sans-serif`; g.fillStyle = 'rgba(233,236,234,0.6)'; g.fillText(sub, 12, 154) }
  return tex(c, false)
}
/** 仪器面板上的小屏幕：深底，一条衍射谱线 */
export const scanTex = once(() => {
  const W = 512, H = 256, { c, g } = canvas(W, H)
  g.fillStyle = '#071018'; g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(120,200,220,0.18)'; g.lineWidth = 1; for (let x = 32; x < W; x += 48) { g.beginPath(); g.moveTo(x, 16); g.lineTo(x, H - 24); g.stroke() }
  const peaks = [[70, 150], [118, 60], [176, 190], [250, 90], [300, 40], [372, 120], [430, 55]]
  g.strokeStyle = '#7fe3d4'; g.lineWidth = 3; g.beginPath()
  for (let x = 16; x < W - 16; x++) { let y = 8; for (const [px, h] of peaks) y += h * Math.exp(-((x - px) ** 2) / 14); g.lineTo(x, H - 30 - y) }
  g.stroke()
  return tex(c, false)
})
/** 南墙的黑板：粉笔画的三种立方晶胞（顶点上有粒子、体心多一个、面心多六个）和一张六边形的网，没有字 */
export const boardTex = once(() => {
  const W = 2048, H = 560, { c, g } = canvas(W, H), r = rng(77)
  g.fillStyle = '#1c2a26'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 160; i++) { const x = r() * W, y = r() * H, R = 40 + r() * 160; const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(210,220,214,0.05)'); q.addColorStop(1, 'rgba(210,220,214,0)'); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  g.strokeStyle = 'rgba(236,238,230,0.82)'; g.fillStyle = 'rgba(236,238,230,0.9)'; g.lineWidth = 4; g.lineCap = 'round'
  const line = (x0: number, y0: number, x1: number, y1: number) => { g.beginPath(); g.moveTo(x0 + (r() - 0.5) * 3, y0 + (r() - 0.5) * 3); g.lineTo(x1 + (r() - 0.5) * 3, y1 + (r() - 0.5) * 3); g.stroke() }
  const dot = (x: number, y: number, R = 13) => { g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill() }
  const cube = (x: number, y: number, kind: number) => {
    const a = 220, dx = 90, dy = -70, P = (i: number, j: number, k: number): [number, number] => [x + i * a + k * dx, y - j * a + k * dy]
    for (const k of [0, 1]) for (const [p, q] of [[[0, 0], [1, 0]], [[1, 0], [1, 1]], [[1, 1], [0, 1]], [[0, 1], [0, 0]]]) line(...P(p[0], p[1], k), ...P(q[0], q[1], k))
    for (const i of [0, 1]) for (const j of [0, 1]) { line(...P(i, j, 0), ...P(i, j, 1)); for (const k of [0, 1]) dot(...P(i, j, k)) }
    if (kind === 1) dot(...P(0.5, 0.5, 0.5), 17)
    if (kind === 2) for (const f of [[0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5], [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5]]) dot(...P(f[0], f[1], f[2]), 10)
  }
  cube(170, 440, 0); cube(640, 440, 1); cube(1110, 440, 2)
  const b = 62, s3 = Math.sqrt(3)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const cx = 1560 + (i + (j % 2) / 2) * s3 * b, cy = 150 + j * 1.5 * b; for (let k = 0; k < 6; k++) { const a0 = Math.PI / 6 + k * Math.PI / 3, a1 = a0 + Math.PI / 3; line(cx + Math.cos(a0) * b, cy + Math.sin(a0) * b, cx + Math.cos(a1) * b, cy + Math.sin(a1) * b) } }
  return tex(c, false)
})
