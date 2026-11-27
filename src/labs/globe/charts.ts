// 画在屏幕和纸上的海图：驾驶台电子海图屏（第 5 课）、卫星定位接收机的小屏、海图桌上的纸海图（第 7 课）。
// 只负责画：经纬度、点的位置都从 physics.ts 取；这里只把经纬度换成画布上的像素。
import * as THREE from 'three'
import { CHART, CHART_POINTS, PAPER, eastOf, latShort, lonShort, type PointKey } from './physics'

export interface EcdisState { ship: { lat: number; lon: number } | null; picked: PointKey | null; track: { lat: number; lon: number }[]; sailing: number }
export interface PaperState { start: { lat: number; lon: number }; goals: readonly { id: string; name: string; lat: number; lon: number }[]; lines: string[]; drawing: { id: string; t: number } | null }

export const ECDIS_PX: [number, number] = [1280, 900]
export const PAPER_PX: [number, number] = [1600, 1200]
/** 电子海图上，经纬网所在的那一块（像素） */
const EG = { x0: 120, x1: 1220, y0: 110, y1: 820 }
/** 纸海图上，经纬网所在的那一块（像素） */
const PG = { x0: 150, x1: 1450, y0: 110, y1: 1090 }

/** 电子海图上一个经纬度落在画布上的哪个像素 */
export function ecdisXY(lat: number, lon: number): [number, number] {
  const span = eastOf(CHART.lon[1], CHART.lon[0]), fx = eastOf(lon, CHART.lon[0]) / span, fy = (CHART.lat[1] - lat) / (CHART.lat[1] - CHART.lat[0])
  return [EG.x0 + (EG.x1 - EG.x0) * fx, EG.y0 + (EG.y1 - EG.y0) * fy]
}
export function paperXY(lat: number, lon: number): [number, number] {
  const fx = (lon - PAPER.lon[0]) / (PAPER.lon[1] - PAPER.lon[0]), fy = (PAPER.lat[1] - lat) / (PAPER.lat[1] - PAPER.lat[0])
  return [PG.x0 + (PG.x1 - PG.x0) * fx, PG.y0 + (PG.y1 - PG.y0) * fy]
}

export function makeCanvas([w, h]: [number, number]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return { c, g: c.getContext('2d')!, t }
}
const FONT = '"Geist", "PingFang SC", "Microsoft YaHei", Arial, sans-serif'

/** 电子海图屏：深色底的海，经纬网每 10° 一条，标着 A、B、C、D 四个点和船的位置 */
export function drawEcdis(g: CanvasRenderingContext2D, s: EcdisState) {
  const [W, H] = ECDIS_PX
  g.fillStyle = '#0a1a2a'; g.fillRect(0, 0, W, H)
  // 海：深浅两层蓝，像电子海图的水深分色
  const grd = g.createLinearGradient(0, EG.y0, 0, EG.y1); grd.addColorStop(0, '#103a5c'); grd.addColorStop(1, '#0d3252')
  g.fillStyle = grd; g.fillRect(EG.x0, EG.y0, EG.x1 - EG.x0, EG.y1 - EG.y0)
  // 经纬网
  g.strokeStyle = 'rgba(160,200,235,0.45)'; g.lineWidth = 2
  for (let lat = CHART.lat[0]; lat <= CHART.lat[1]; lat += 10) { const [, y] = ecdisXY(lat, CHART.lon[0]); g.beginPath(); g.moveTo(EG.x0, y); g.lineTo(EG.x1, y); g.stroke() }
  for (let k = 0; k <= 4; k++) { const lon = CHART.lon[0] + k * 10, [x] = ecdisXY(0, lon); g.beginPath(); g.moveTo(x, EG.y0); g.lineTo(x, EG.y1); g.stroke() }
  g.strokeStyle = 'rgba(255,230,140,0.85)'; g.lineWidth = 3.2
  { const [, y] = ecdisXY(0, 180); g.beginPath(); g.moveTo(EG.x0, y); g.lineTo(EG.x1, y); g.stroke() }
  { const [x] = ecdisXY(0, 180); g.beginPath(); g.moveTo(x, EG.y0); g.lineTo(x, EG.y1); g.stroke() }
  // 边上的度数
  g.font = `600 30px ${FONT}`; g.fillStyle = '#cfe3f5'; g.textBaseline = 'middle'
  for (let lat = CHART.lat[0]; lat <= CHART.lat[1]; lat += 10) { const [, y] = ecdisXY(lat, CHART.lon[0]); g.textAlign = 'right'; g.fillText(latShort(lat), EG.x0 - 12, y) }
  for (let k = 0; k <= 4; k++) { const lon = CHART.lon[0] + k * 10, [x] = ecdisXY(0, lon); g.textAlign = 'center'; g.fillText(lonShort(lon), x, EG.y0 - 30); g.fillText(lonShort(lon), x, EG.y1 + 32) }
  g.strokeStyle = 'rgba(190,220,245,0.8)'; g.lineWidth = 2.5; g.strokeRect(EG.x0, EG.y0, EG.x1 - EG.x0, EG.y1 - EG.y0)
  // 走过的航迹
  if (s.track.length > 1) {
    g.strokeStyle = 'rgba(255,170,80,0.9)'; g.lineWidth = 4; g.setLineDash([14, 10]); g.beginPath()
    s.track.forEach((p, i) => { const [x, y] = ecdisXY(p.lat, p.lon); if (i) g.lineTo(x, y); else g.moveTo(x, y) }); g.stroke(); g.setLineDash([])
  }
  // 四个点
  for (const k of Object.keys(CHART_POINTS) as PointKey[]) {
    const p = CHART_POINTS[k], [x, y] = ecdisXY(p.lat, p.lon), on = s.picked === k
    g.fillStyle = on ? '#ffe14d' : '#ffffff'; g.beginPath(); g.arc(x, y, on ? 13 : 10, 0, Math.PI * 2); g.fill()
    g.font = `700 44px ${FONT}`; g.textAlign = 'left'; g.fillStyle = on ? '#ffe14d' : '#ffffff'; g.fillText(k, x + 18, y - 26)
  }
  // 船：一个指向前进方向的三角
  if (s.ship) {
    const [x, y] = ecdisXY(s.ship.lat, s.ship.lon)
    g.save(); g.translate(x, y); g.strokeStyle = '#ff6b4a'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 26 + 6 * Math.sin(s.sailing * 6), 0, Math.PI * 2); g.stroke()
    g.fillStyle = '#ff6b4a'; g.beginPath(); g.moveTo(0, -18); g.lineTo(12, 14); g.lineTo(-12, 14); g.closePath(); g.fill(); g.restore()
  }
  // 顶部的状态栏
  g.fillStyle = '#06111c'; g.fillRect(0, 0, W, 54); g.fillRect(0, H - 40, W, 40)
  g.font = `600 26px ${FONT}`; g.fillStyle = '#7fe3d4'; g.textAlign = 'left'; g.fillText('ECDIS', 24, 28)
  g.fillStyle = '#cfe3f5'; g.textAlign = 'right'; g.fillText('N ↑', W - 24, 28)
}

/** 卫星定位接收机的小屏：两行大字，纬度、经度 */
export function drawGnss(g: CanvasRenderingContext2D, p: { lat: number; lon: number } | null) {
  g.fillStyle = '#0b130f'; g.fillRect(0, 0, 640, 360)
  g.fillStyle = '#5fbf8a'; g.font = `600 30px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('GNSS', 28, 36)
  g.fillStyle = '#9dffc4'; g.font = `700 92px ui-monospace, Menlo, monospace`
  if (!p) { g.fillText('— —', 40, 170); return }
  const ns = p.lat === 0 ? '' : p.lat > 0 ? 'N' : 'S', ew = Math.abs(p.lon) === 180 || p.lon === 0 ? '' : p.lon > 0 ? 'E' : 'W'
  g.fillText(`${ns} ${String(Math.abs(p.lat)).padStart(2, '0')}°00′`, 30, 150)
  g.fillText(`${ew} ${String(Math.abs(p.lon)).padStart(3, '0')}°00′`, 30, 270)
}

/** 纸海图：米黄的纸，每 5° 一条细线、10° 一条粗线，边上印度数和比例分划，出发点和三个目的地，画过的航线 */
export function drawPaper(g: CanvasRenderingContext2D, s: PaperState) {
  const [W, H] = PAPER_PX
  g.fillStyle = '#efe6cf'; g.fillRect(0, 0, W, H)
  // 纸面上浅浅的污迹和纤维
  let seed = 4; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(120,95,60,${r() * 0.05})`; g.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3) }
  // 经纬网
  for (let lat = PAPER.lat[0]; lat <= PAPER.lat[1]; lat += 5) { const [, y] = paperXY(lat, PAPER.lon[0]); g.strokeStyle = lat % 10 ? 'rgba(60,80,110,0.28)' : 'rgba(40,60,95,0.7)'; g.lineWidth = lat % 10 ? 1.5 : 2.6; g.beginPath(); g.moveTo(PG.x0, y); g.lineTo(PG.x1, y); g.stroke() }
  for (let lon = PAPER.lon[0]; lon <= PAPER.lon[1]; lon += 5) { const [x] = paperXY(PAPER.lat[0], lon); g.strokeStyle = lon % 10 ? 'rgba(60,80,110,0.28)' : 'rgba(40,60,95,0.7)'; g.lineWidth = lon % 10 ? 1.5 : 2.6; g.beginPath(); g.moveTo(x, PG.y0); g.lineTo(x, PG.y1); g.stroke() }
  // 边框和度数分划
  g.strokeStyle = '#2b3a55'; g.lineWidth = 4; g.strokeRect(PG.x0, PG.y0, PG.x1 - PG.x0, PG.y1 - PG.y0)
  g.lineWidth = 1.5; g.strokeRect(PG.x0 - 22, PG.y0 - 22, PG.x1 - PG.x0 + 44, PG.y1 - PG.y0 + 44)
  for (let lat = PAPER.lat[0]; lat < PAPER.lat[1]; lat += 1) { const [, y0] = paperXY(lat, 0), [, y1] = paperXY(lat + 1, 0); g.fillStyle = lat % 2 ? '#2b3a55' : '#efe6cf'; g.fillRect(PG.x0 - 22, y1, 22, y0 - y1); g.fillRect(PG.x1, y1, 22, y0 - y1) }
  for (let lon = PAPER.lon[0]; lon < PAPER.lon[1]; lon += 1) { const [x0] = paperXY(0, lon), [x1] = paperXY(0, lon + 1); g.fillStyle = lon % 2 ? '#2b3a55' : '#efe6cf'; g.fillRect(x0, PG.y0 - 22, x1 - x0, 22); g.fillRect(x0, PG.y1, x1 - x0, 22) }
  g.font = `600 34px ${FONT}`; g.fillStyle = '#22304a'; g.textBaseline = 'middle'
  for (let lat = PAPER.lat[0]; lat <= PAPER.lat[1]; lat += 10) { const [, y] = paperXY(lat, 0); g.textAlign = 'right'; g.fillText(`${lat}°N`, PG.x0 - 34, y) }
  for (let lon = PAPER.lon[0]; lon <= PAPER.lon[1]; lon += 10) { const [x] = paperXY(0, lon); g.textAlign = 'center'; g.fillText(`${lon}°E`, x, PG.y1 + 58) }
  // 罗经花：右下角，指北
  { const cx = PG.x1 - 150, cy = PG.y1 - 160; g.strokeStyle = '#7a2e2a'; g.lineWidth = 2; for (const rr of [92, 70]) { g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke() }
    for (let a = 0; a < 360; a += 10) { const t = a * Math.PI / 180; g.beginPath(); g.moveTo(cx + Math.sin(t) * 92, cy - Math.cos(t) * 92); g.lineTo(cx + Math.sin(t) * (a % 90 ? 84 : 72), cy - Math.cos(t) * (a % 90 ? 84 : 72)); g.stroke() }
    g.fillStyle = '#7a2e2a'; for (let k = 0; k < 4; k++) { const t = k * Math.PI / 2; g.beginPath(); g.moveTo(cx + Math.sin(t) * 66, cy - Math.cos(t) * 66); g.lineTo(cx + Math.sin(t + 0.5) * 12, cy - Math.cos(t + 0.5) * 12); g.lineTo(cx + Math.sin(t - 0.5) * 12, cy - Math.cos(t - 0.5) * 12); g.closePath(); g.fill() }
    g.font = `700 36px ${FONT}`; g.textAlign = 'center'; g.fillText('N', cx, cy - 116) }
  // 画过的航线（铅笔线）和正在画的那一条
  const line = (to: { lat: number; lon: number }, t: number) => { const [x0, y0] = paperXY(s.start.lat, s.start.lon), [x1, y1] = paperXY(to.lat, to.lon); g.strokeStyle = '#d6332b'; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); g.stroke() }
  for (const id of s.lines) { const goal = s.goals.find(x => x.id === id); if (goal) line(goal, 1) }
  if (s.drawing) { const goal = s.goals.find(x => x.id === s.drawing!.id); if (goal) line(goal, s.drawing.t) }
  // 出发点和目的地
  const dot = (p: { lat: number; lon: number }, name: string, color: string) => { const [x, y] = paperXY(p.lat, p.lon); g.fillStyle = color; g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#efe6cf'; g.lineWidth = 3; g.stroke(); g.font = `700 46px ${FONT}`; g.textAlign = 'left'; g.fillStyle = color; g.fillText(name, x + 20, y - 28) }
  dot(s.start, '出发', '#c0392b')
  for (const goal of s.goals) dot(goal, goal.name, '#1f4f8f')
}
