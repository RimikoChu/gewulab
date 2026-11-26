// 站房前的两块屏：天气预报屏（三天预报、多年平均）和气候资料板（气温曲线、降水柱状图）。屏面用画布画，数都从 physics.ts 取。
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { FORECAST, MONTHS, RAIN, TEMP, annual, annualMeanTemp, coldest, hottest, rainySeason, yearRange, type DayKey, type Wx } from './physics'

const FONT = '"PingFang SC","Microsoft YaHei",sans-serif'
function useCanvas(w: number, h: number) {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return { g: c.getContext('2d')!, t }
  }, [w, h])
}

// ---------- 天气符号 ----------
function sun(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.strokeStyle = '#ffc93c'; g.lineWidth = r * 0.16; g.lineCap = 'round'
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3); g.lineTo(x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 1.75); g.stroke() }
  g.fillStyle = '#ffc93c'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
}
function cloud(g: CanvasRenderingContext2D, x: number, y: number, r: number, c = '#e9eef3') {
  g.fillStyle = c; g.beginPath()
  g.arc(x - r * 0.9, y + r * 0.25, r * 0.62, 0, Math.PI * 2); g.arc(x - r * 0.2, y - r * 0.2, r * 0.85, 0, Math.PI * 2); g.arc(x + r * 0.75, y + r * 0.15, r * 0.7, 0, Math.PI * 2)
  g.rect(x - r * 0.9, y + r * 0.2, r * 1.65, r * 0.67); g.fill()
}
function symbol(g: CanvasRenderingContext2D, wx: Wx, x: number, y: number, r: number) {
  if (wx === 'sun') sun(g, x, y, r * 0.7)
  if (wx === 'cloud') { sun(g, x - r * 0.45, y - r * 0.4, r * 0.48); cloud(g, x + r * 0.2, y + r * 0.2, r * 0.72) }
  if (wx === 'rain') {
    cloud(g, x, y - r * 0.25, r * 0.8, '#b9c4cf')
    g.strokeStyle = '#5fb2ff'; g.lineWidth = r * 0.1; g.lineCap = 'round'
    for (const dx of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(x + dx * r, y + r * 0.55); g.lineTo(x + dx * r - r * 0.12, y + r * 0.95); g.stroke() }
  }
}

export type BoardView = DayKey | 'avg'
/** 天气预报屏：view 是正在看的那一条 */
export function ForecastScreen({ view, w, h }: { view: BoardView; w: number; h: number }) {
  const { g, t } = useCanvas(1600, 900)
  useEffect(() => {
    g.fillStyle = '#0d1a26'; g.fillRect(0, 0, 1600, 900)
    g.fillStyle = '#163552'; g.fillRect(0, 0, 1600, 120)
    g.fillStyle = '#ffffff'; g.font = `700 60px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('山前气象站', 50, 62)
    g.font = `500 44px ${FONT}`; g.fillStyle = '#a9c6e0'; g.textAlign = 'right'; g.fillText(view === 'avg' ? '多年平均' : '天气预报', 1550, 62)
    if (view !== 'avg') {
      const keys: DayKey[] = ['today', 'tomorrow', 'after']
      keys.forEach((k, i) => {
        const f = FORECAST[k], x = 60 + i * 500, on = k === view
        g.fillStyle = on ? '#1f4a70' : '#12263a'; g.beginPath(); g.roundRect(x, 160, 460, 690, 24); g.fill()
        if (on) { g.strokeStyle = '#ffe9a8'; g.lineWidth = 8; g.stroke() }
        g.textAlign = 'center'; g.fillStyle = on ? '#ffffff' : '#8fa7bd'; g.font = `700 64px ${FONT}`; g.fillText(f.name, x + 230, 240)
        symbol(g, f.wx, x + 230, 420, 120)
        g.fillStyle = '#ffffff'; g.font = `700 70px ${FONT}`; g.fillText(f.text, x + 230, 600)
        g.font = `600 58px ${FONT}`; g.fillStyle = '#ffd27a'; g.fillText(`${f.lo}～${f.hi} ℃`, x + 230, 700)
        g.font = `500 44px ${FONT}`; g.fillStyle = '#a9c6e0'; g.fillText(f.wind, x + 230, 790)
      })
    } else {
      // 多年平均：逐月气温（折线）和降水（柱）
      const x0 = 120, x1 = 1480, y0 = 640, y1 = 220, bw = (x1 - x0) / 12
      g.strokeStyle = '#38536b'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke()
      RAIN.forEach((r, i) => { const bh = (r / 200) * (y0 - y1); g.fillStyle = '#4f9fe0'; g.fillRect(x0 + i * bw + bw * 0.2, y0 - bh, bw * 0.6, bh) })
      g.strokeStyle = '#ff7a59'; g.lineWidth = 8; g.beginPath()
      TEMP.forEach((v, i) => { const x = x0 + (i + 0.5) * bw, y = y0 - ((v + 10) / 40) * (y0 - y1); if (i) g.lineTo(x, y); else g.moveTo(x, y) }); g.stroke()
      g.fillStyle = '#8fa7bd'; g.font = `500 34px ${FONT}`; g.textAlign = 'center'
      MONTHS.forEach((m, i) => g.fillText(m, x0 + (i + 0.5) * bw, y0 + 40))
      g.fillStyle = '#ffffff'; g.font = `700 54px ${FONT}`
      g.fillText(`年平均气温 约 ${Math.round(annualMeanTemp())} ℃　　年降水量 ${annual()} mm`, 800, 760)
      g.fillStyle = '#ffd27a'; g.font = `600 46px ${FONT}`; g.fillText('夏季高温多雨，冬季寒冷干燥', 800, 840)
    }
    t.needsUpdate = true
  }, [view, g, t])
  return <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={t} toneMapped={false} /></mesh>
}

/** 气候资料板：tN 气温曲线描到第几个月（0–12，可以是小数），pN 降水柱画到第几个月；marks 依次标出的特征 */
export interface ChartMarks { hot?: boolean; cold?: boolean; range?: boolean; wet?: boolean }
export function ClimateChart({ tN, pN, marks, w, h }: { tN: number; pN: number; marks: ChartMarks; w: number; h: number }) {
  const { g, t } = useCanvas(1600, 1066)
  useEffect(() => {
    g.fillStyle = '#f7f6f1'; g.fillRect(0, 0, 1600, 1066)
    g.fillStyle = '#26323b'; g.font = `700 54px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('山前气象站 气温曲线和降水柱状图', 800, 70)
    const x0 = 190, x1 = 1410, y0 = 860, y1 = 170, bw = (x1 - x0) / 12, ty = (v: number) => y0 - ((v + 10) / 40) * (y0 - y1), py = (v: number) => y0 - (v / 200) * (y0 - y1)
    // 网格和坐标轴：左边气温，右边降水量
    g.strokeStyle = '#d6d3c9'; g.lineWidth = 2
    for (let v = -10; v <= 30; v += 10) { g.beginPath(); g.moveTo(x0, ty(v)); g.lineTo(x1, ty(v)); g.stroke() }
    g.strokeStyle = '#3b4650'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0, y1 - 20); g.lineTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1, y1 - 20); g.stroke()
    g.fillStyle = '#c4452f'; g.font = `600 36px ${FONT}`; g.textAlign = 'right'
    for (let v = -10; v <= 30; v += 10) g.fillText(String(v), x0 - 16, ty(v))
    g.fillStyle = '#2f73b8'; g.textAlign = 'left'
    for (let v = 0; v <= 200; v += 50) g.fillText(String(v), x1 + 16, py(v))
    g.font = `600 34px ${FONT}`; g.fillStyle = '#c4452f'; g.textAlign = 'center'; g.fillText('气温 / ℃', x0, y1 - 55)
    g.fillStyle = '#2f73b8'; g.fillText('降水量 / mm', x1, y1 - 55)
    g.fillStyle = '#3b4650'; g.font = `500 36px ${FONT}`
    MONTHS.forEach((m, i) => g.fillText(m, x0 + (i + 0.5) * bw, y0 + 40)); g.fillText('月', x1 + 40, y0 + 40)
    // 雨季：淡蓝底
    if (marks.wet) {
      const [a, b] = rainySeason(), xa = x0 + a * bw, xb = x0 + (b + 1) * bw
      g.fillStyle = 'rgba(70,150,230,0.2)'; g.fillRect(xa, y1 - 10, xb - xa, y0 - y1 + 10)
      // 横轴下面一道括号，写“雨季”
      g.strokeStyle = '#2f73b8'; g.lineWidth = 5; g.beginPath(); g.moveTo(xa + 6, y0 + 70); g.lineTo(xa + 6, y0 + 86); g.lineTo(xb - 6, y0 + 86); g.lineTo(xb - 6, y0 + 70); g.stroke()
      g.fillStyle = '#2f73b8'; g.font = `700 42px ${FONT}`; g.textAlign = 'center'; g.fillText(`雨季 ${a + 1}–${b + 1} 月`, (xa + xb) / 2, y0 + 128)
    }
    // 降水柱
    RAIN.forEach((r, i) => { const k = Math.min(1, Math.max(0, pN - i)); if (k <= 0) return; const top = py(r * k); g.fillStyle = '#4a92d8'; g.fillRect(x0 + i * bw + bw * 0.18, top, bw * 0.64, y0 - top) })
    // 气温曲线：一个月一个点，平滑地连起来
    if (tN > 0) {
      g.strokeStyle = '#d4482f'; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath()
      const n = Math.floor(tN), f = tN - n
      for (let i = 0; i <= Math.min(11, n); i++) { const x = x0 + (i + 0.5) * bw, y = ty(TEMP[i]); if (i) g.lineTo(x, y); else g.moveTo(x, y) }
      if (n < 11 && n >= 0 && f > 0) g.lineTo(x0 + (n + 0.5 + f) * bw, ty(TEMP[n] + (TEMP[n + 1] - TEMP[n]) * f))
      g.stroke()
      for (let i = 0; i <= Math.min(11, n); i++) { g.fillStyle = '#d4482f'; g.beginPath(); g.arc(x0 + (i + 0.5) * bw, ty(TEMP[i]), 10, 0, Math.PI * 2); g.fill() }
    }
    const tag = (i: number, v: number, text: string, up: boolean) => {
      const x = x0 + (i + 0.5) * bw, y = ty(v)
      g.strokeStyle = '#1d2a33'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2); g.stroke()
      g.font = `700 40px ${FONT}`; const tw = g.measureText(text).width + 36, bx = Math.min(x1 - tw - 10, Math.max(x0 + 10, up ? x + 40 : x - tw / 2)), by = up ? y - 50 : y + 40
      g.fillStyle = '#1d2a33'; g.beginPath(); g.roundRect(bx, by, tw, 60, 12); g.fill(); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.fillText(text, bx + tw / 2, by + 32)
    }
    const H = hottest(), C = coldest()
    if (marks.hot) tag(H.i, H.t, `最热月 ${H.i + 1} 月 ${H.t} ℃`, true)
    if (marks.cold) tag(C.i, C.t, `最冷月 ${C.i + 1} 月 ${C.t} ℃`, false)
    if (marks.range) {
      const x = x0 + (H.i + 0.5) * bw + 70
      g.strokeStyle = '#1d2a33'; g.lineWidth = 4; g.setLineDash([12, 10]); g.beginPath(); g.moveTo(x0 + (C.i + 0.5) * bw, ty(C.t)); g.lineTo(x, ty(C.t)); g.stroke(); g.setLineDash([])
      g.beginPath(); g.moveTo(x, ty(H.t)); g.lineTo(x, ty(C.t)); g.stroke()
      g.fillStyle = '#1d2a33'; g.font = `700 40px ${FONT}`; g.textAlign = 'left'; g.fillText(`年较差 ${yearRange()} ℃`, x + 16, (ty(H.t) + ty(C.t)) / 2)
    }
    t.needsUpdate = true
  }, [tN, pN, marks.hot, marks.cold, marks.range, marks.wet, g, t])
  return <mesh><planeGeometry args={[w, h]} /><meshStandardMaterial map={t} roughness={0.55} /></mesh>
}
