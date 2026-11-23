// 程序画出来的贴图：抹灰墙、多层板、电池的包装纸、电表的表盘和铭牌、配电箱的标签。不用下载素材。
import * as THREE from 'three'
import type { MeterKind } from './physics'

export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! } }
function tex(c: HTMLCanvasElement, srgb = true, wrap = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t }
const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'

/** 水泥砂浆抹灰的墙：灰色，抹子留下的大片深浅，细砂点 */
export function makePlaster(seed = 3, base = '#a8a59c') {
  const S = 512, { c, g } = canvas(S), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 220; i++) {
    const x = r() * S, y = r() * S, R = 30 + r() * 110, col = r() < 0.5 ? '128,124,116' : '190,186,176'
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, R); q.addColorStop(0, `rgba(${col},0.22)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - R, y + oy - R, R * 2, R * 2) }
  }
  // 抹子的弧纹
  g.lineWidth = 1.2
  for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, R = 20 + r() * 60; g.strokeStyle = `rgba(${r() < 0.5 ? '120,116,108' : '200,196,188'},0.18)`; g.beginPath(); g.arc(x, y, R, r() * 6, r() * 6 + 1.2); g.stroke() }
  for (let i = 0; i < 16000; i++) { const v = 120 + Math.floor(r() * 90); g.fillStyle = `rgba(${v},${v - 3},${v - 10},${0.12 + r() * 0.2})`; g.fillRect(r() * S, r() * S, 1 + r(), 1 + r()) }
  return tex(c)
}

/** 多层板（胶合板）：浅黄的木纹，偶尔一个补过的节疤 */
export function makePly(seed = 5, base = '#c9a876') {
  const W = 512, H = 256, { c, g } = canvas(W, H), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 140; i++) {
    const y = r() * H, amp = 2 + r() * 6, ph = r() * 6, k = 1 + Math.floor(r() * 2)
    g.strokeStyle = `rgba(${r() < 0.5 ? '150,110,66' : '214,186,140'},${0.18 + r() * 0.25})`; g.lineWidth = 0.6 + r() * 1.6
    g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / W * Math.PI * 2 * k + ph) * amp); g.stroke()
  }
  for (let i = 0; i < 3; i++) { const x = r() * W, y = r() * H; g.fillStyle = 'rgba(140,96,52,0.45)'; g.beginPath(); g.ellipse(x, y, 10 + r() * 6, 4 + r() * 2, 0, 0, 7); g.fill() }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(120,86,50,${r() * 0.12})`; g.fillRect(r() * W, r() * H, 1, 1) }
  return tex(c)
}

/** 一节 1 号干电池的包装纸：绕电池一圈的贴图。u 绕一圈，v 从负极（下）到正极（上）；字顺着电池的长度方向印 */
export function makeCellWrap() {
  const W = 512, H = 256, { c, g } = canvas(W, H)
  g.fillStyle = '#1f2a24'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#d6a133'; g.fillRect(0, 0, W, H * 0.3)            // 正极一头的金色环带
  g.fillStyle = '#b9862a'; g.fillRect(0, H * 0.3, W, 4)
  g.textAlign = 'center'; g.textBaseline = 'middle'
  // 两组字，绕电池半圈一组。贴图的横向是绕电池一圈，所以字竖着写，贴上去才是顺着电池的长度方向
  for (const x of [W * 0.25, W * 0.75]) {
    g.save(); g.translate(x, H * 0.64); g.rotate(-Math.PI / 2)
    g.fillStyle = '#f2efe6'; g.font = `700 64px ${FONT}`; g.fillText('1.5V', 0, -20)
    g.fillStyle = '#9fb0a6'; g.font = `600 30px ${FONT}`; g.fillText('R20 1号', 0, 34)
    g.restore()
    g.save(); g.translate(x, H * 0.15); g.rotate(-Math.PI / 2); g.fillStyle = '#1f2a24'; g.font = `700 46px ${FONT}`; g.fillText('+', 0, 0); g.restore()
  }
  const t = tex(c, true, false)
  return t
}

/** 电表的表盘：两排弧形刻度，上排大量程、下排小量程；中间印着 A 或 V。指针的转轴在 (0.5, PIVOT_V) */
export const DIAL = { w: 1024, h: 640, cx: 512, cy: 600, r1: 470, r2: 392, half: 45 }
export function makeDial(kind: MeterKind) {
  const { w, h, cx, cy, r1, r2, half } = DIAL, { c, g } = canvas(w, h)
  g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, w, h)
  const hi = kind === 'A' ? { max: 3, n: 30, labels: [0, 1, 2, 3] } : { max: 15, n: 30, labels: [0, 5, 10, 15] }
  const lo = kind === 'A' ? { max: 0.6, n: 30, labels: ['0', '0.2', '0.4', '0.6'] } : { max: 3, n: 30, labels: ['0', '1', '2', '3'] }
  const ang = (k: number) => (-half + 2 * half * k) * Math.PI / 180
  const at = (k: number, R: number): [number, number] => [cx + Math.sin(ang(k)) * R, cy - Math.cos(ang(k)) * R]
  // 镜面弧带和刻度弧线
  g.strokeStyle = '#1b1d20'; g.lineWidth = 3
  for (const R of [r1, r2]) { g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2 - half * Math.PI / 180, -Math.PI / 2 + half * Math.PI / 180); g.stroke() }
  g.fillStyle = '#c9ccd0'; g.beginPath(); g.arc(cx, cy, r2 - 18, -Math.PI / 2 - half * Math.PI / 180, -Math.PI / 2 + half * Math.PI / 180); g.arc(cx, cy, r2 - 34, -Math.PI / 2 + half * Math.PI / 180, -Math.PI / 2 - half * Math.PI / 180, true); g.fill()
  // 刻度：每 10 格一道长线，每 5 格中线
  for (let i = 0; i <= 30; i++) {
    const k = i / 30, big = i % 10 === 0, mid = i % 5 === 0
    g.lineWidth = big ? 4 : 2.2
    let [x0, y0] = at(k, r1), [x1, y1] = at(k, r1 + (big ? 34 : mid ? 24 : 15)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    [x0, y0] = at(k, r2); [x1, y1] = at(k, r2 - (big ? 34 : mid ? 24 : 15)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
  }
  g.fillStyle = '#1b1d20'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `700 50px ${FONT}`; hi.labels.forEach((l, i) => { const [x, y] = at(i / 3, r1 + 66); g.fillText(String(l), x, y) })
  g.font = `700 42px ${FONT}`; lo.labels.forEach((l, i) => { const [x, y] = at(i / 3, r2 - 64); g.fillText(l, x, y) })
  g.font = `700 112px ${FONT}`; g.fillText(kind, cx, cy - 190)
  g.font = `400 30px ${FONT}`; g.fillStyle = '#4a4d52'; g.fillText('1.5 级', cx + 300, cy - 30); g.fillText('━ 直流', cx - 300, cy - 30)
  return tex(c, true, false)
}

/** 小块的印字：电表接线柱下面的“−、0.6、3”，铭牌，示教板上的字母 */
export function makeText(lines: string[], { w = 256, h = 64, bg = '#1d1f22', fg = '#e9e6dc', size = 40, weight = 700 } = {}) {
  const { c, g } = canvas(w, h)
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${weight} ${size}px ${FONT}`
  lines.forEach((l, i) => g.fillText(l, w / 2, h / (lines.length + 1) * (i + 1) + 2))
  return tex(c, true, false)
}
/** 一行均匀排开的几个字（电表接线柱下面的标记） */
export function makeMarks(marks: string[], { w = 512, h = 64, bg = '#1d1f22', fg = '#e9e6dc', size = 40, colors }: { w?: number; h?: number; bg?: string; fg?: string; size?: number; colors?: string[] } = {}) {
  const { c, g } = canvas(w, h)
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${size}px ${FONT}`
  marks.forEach((m, i) => { g.fillStyle = colors?.[i] ?? fg; g.fillText(m, w / marks.length * (i + 0.5), h / 2 + 2) })
  return tex(c, true, false)
}

/** 窗玻璃上贴着的蓝色保护膜：大片淡蓝，几道没贴平的褶 */
export function makeFilm() {
  const { c, g } = canvas(256)
  g.fillStyle = 'rgba(120,170,205,0.5)'; g.fillRect(0, 0, 256, 256)
  const r = rng(12)
  for (let i = 0; i < 18; i++) { g.strokeStyle = `rgba(230,245,255,${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const x = r() * 256; g.moveTo(x, 0); g.bezierCurveTo(x + r() * 40 - 20, 90, x + r() * 40 - 20, 170, x + r() * 30 - 15, 256); g.stroke() }
  return tex(c)
}
