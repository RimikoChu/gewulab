// 面板里的小图：地震记录、预警的时间线、波速随深度的变化、楼的晃动倍数。数都从 physics.ts 取，这里只画。
import { useEffect, useRef } from 'react'
import { BUILDINGS, D_CMB, D_ICB, R_E, WARN_CITIES, alertTime, buildingTR, natPeriod, seismogram, tS, epiDist, CITIES, velAtDepth, WENCHUAN } from './physics'

const P_COL = '#5ec8ff', S_COL = '#ff8a4c', DIM = 'rgba(255,255,255,0.5)', GRID = 'rgba(255,255,255,0.08)'
const FONT = (w: number, s: number) => `${w} ${s}px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif`
function useCanvas(h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth
    c.width = w * dpr; c.height = h * dpr
    const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h)
    draw(g, w, h)
  }, deps)   // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} style={{ width: '100%', height: h, display: 'block' }} />
}

/** 第 3 课：小镇地震台的记录，上下、水平两个分量，画到此刻为止 */
export function SeisChart({ d, h, t }: { d: number; h: number; t: number }) {
  const rec = useRef<{ d: number; s: ReturnType<typeof seismogram> } | null>(null)
  if (!rec.current || rec.current.d !== d) rec.current = { d, s: seismogram(d, h, 40, 900, Math.round(d)) }
  const s = rec.current.s
  return useCanvas(150, (g, w, H) => {
    const L = 34, X = (tt: number) => L + (tt / s.dur) * (w - L - 6)
    g.font = FONT(500, 11); g.fillStyle = DIM; g.textAlign = 'center'
    for (let k = 0; k <= 40; k += 10) { g.strokeStyle = GRID; g.beginPath(); g.moveTo(X(k), 8); g.lineTo(X(k), H - 18); g.stroke(); g.fillText(`${k} s`, X(k), H - 4) }
    const rows: [Float32Array, string, string, number][] = [[s.z, '上下', P_COL, 40], [s.x, '水平', S_COL, 98]]
    for (const [arr, name, col, y0] of rows) {
      g.textAlign = 'left'; g.fillStyle = DIM; g.fillText(name, 0, y0 + 4)
      g.beginPath(); const n = arr.length
      for (let i = 0; i < n; i++) { const tt = (i / n) * s.dur; if (tt > t) break; const x = X(tt), y = y0 - arr[i] * 22; i ? g.lineTo(x, y) : g.moveTo(x, y) }
      g.strokeStyle = col; g.lineWidth = 1.3; g.stroke()
    }
    for (const [tt, col, name] of [[s.p, P_COL, 'P'], [s.q, S_COL, 'S']] as const) if (t >= tt) { g.strokeStyle = col; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(tt), 10); g.lineTo(X(tt), H - 20); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.font = FONT(700, 12); g.textAlign = 'center'; g.fillText(name === 'P' ? '纵波' : '横波', X(tt), 12) }
    if (t > 0 && t < s.dur) { g.strokeStyle = 'rgba(255,233,168,0.8)'; g.beginPath(); g.moveTo(X(t), 18); g.lineTo(X(t), H - 20); g.stroke() }
  }, [d, Math.round(t * 20)])
}

/** 第 5 课：三个台站的记录，标出纵波、横波的到时和时间差 */
export function TrioChart({ rows }: { rows: { name: string; d: number; h: number; show: boolean; lag: number }[] }) {
  return useCanvas(rows.length * 44 + 18, (g, w, H) => {
    const L = 22, X = (tt: number) => L + (tt / 16) * (w - L - 4)
    g.font = FONT(500, 11); g.textAlign = 'center'; g.fillStyle = DIM
    for (let k = 0; k <= 16; k += 4) { g.strokeStyle = GRID; g.beginPath(); g.moveTo(X(k), 2); g.lineTo(X(k), H - 14); g.stroke(); g.fillText(`${k} s`, X(k), H - 2) }
    rows.forEach((r, i) => {
      const y0 = 22 + i * 44, s = seismogram(r.d, r.h, 16, 420, i + 3), arr = s.z.map((v, k) => v * 0.6 + s.x[k])
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = FONT(700, 13); g.textAlign = 'left'; g.fillText(r.name, 0, y0 + 4)
      g.beginPath(); arr.forEach((v, k) => { const x = X((k / arr.length) * 16), y = y0 - v * 13; k ? g.lineTo(x, y) : g.moveTo(x, y) })
      g.strokeStyle = r.show ? 'rgba(235,240,245,0.9)' : 'rgba(235,240,245,0.35)'; g.lineWidth = 1; g.stroke()
      if (r.show) {
        g.fillStyle = 'rgba(255,233,168,0.22)'; g.fillRect(X(s.p), y0 - 17, X(s.q) - X(s.p), 34)
        for (const [tt, col] of [[s.p, P_COL], [s.q, S_COL]] as const) { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(X(tt), y0 - 17); g.lineTo(X(tt), y0 + 17); g.stroke() }
        g.fillStyle = '#ffe9a8'; g.font = FONT(700, 12); g.textAlign = 'left'; g.fillText(`${r.lag.toFixed(1)} s`, X(s.q) + 5, y0 - 8)
      }
    })
  }, [rows.map(r => `${r.show}`).join()])
}

/** 第 4 课：每座城市——警报什么时候到（竖线）、横波什么时候到（条的尽头） */
export function WarnChart({ t, pick }: { t: number; pick: string }) {
  const ta = alertTime()
  return useCanvas(WARN_CITIES.length * 30 + 26, (g, w, H) => {
    const L = 62, X = (tt: number) => L + (tt / 40) * (w - L - 8)
    g.font = FONT(500, 11); g.textAlign = 'center'; g.fillStyle = DIM
    for (let k = 0; k <= 40; k += 10) { g.strokeStyle = GRID; g.beginPath(); g.moveTo(X(k), 4); g.lineTo(X(k), H - 16); g.stroke(); g.fillText(`${k} s`, X(k), H - 3) }
    WARN_CITIES.forEach((k, i) => {
      const y = 10 + i * 30, ts = tS(epiDist(k), WENCHUAN.h), on = k === pick
      g.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.65)'; g.font = FONT(on ? 700 : 500, 12.5); g.textAlign = 'left'; g.fillText(CITIES[k].name, 0, y + 12)
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(X(0), y + 3, X(40) - X(0), 14)
      g.fillStyle = on ? 'rgba(255,138,76,0.9)' : 'rgba(255,138,76,0.45)'; g.fillRect(X(0), y + 3, X(Math.min(t, ts)) - X(0), 14)
      if (t >= ts) { g.fillStyle = S_COL; g.fillRect(X(ts) - 1.5, y, 3, 20) }
    })
    if (t >= ta) { g.strokeStyle = '#7fe3d4'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(ta), 4); g.lineTo(X(ta), H - 16); g.stroke(); g.fillStyle = '#7fe3d4'; g.font = FONT(700, 11.5); g.textAlign = 'left'; g.fillText('警报', X(ta) + 4, H - 18) }
  }, [Math.round(t * 10), pick])
}

/** 第 6 课：纵波、横波的速度随深度的变化，加亮的界面画一条线 */
export function VelChart({ hi }: { hi: 0 | 1 | 2 }) {
  return useCanvas(230, (g, w, H) => {
    const T = 16, B = H - 18, L = 46, Yd = (d: number) => T + (d / R_E) * (B - T), Xv = (v: number) => L + (v / 14) * (w - L - 8)
    g.font = FONT(500, 11); g.fillStyle = DIM; g.textAlign = 'right'
    for (const d of [0, 2900, 5150, 6371]) { g.strokeStyle = GRID; g.beginPath(); g.moveTo(L, Yd(d)); g.lineTo(w - 6, Yd(d)); g.stroke(); g.fillText(`${d}`, L - 5, Yd(d) + 4) }
    g.textAlign = 'center'; for (const v of [0, 4, 8, 12]) g.fillText(`${v}`, Xv(v), H - 3)
    // 圈层的底色
    const band = (a: number, b: number, c: string) => { g.fillStyle = c; g.fillRect(L, Yd(a), w - 6 - L, Yd(b) - Yd(a)) }
    band(D_CMB, D_ICB, 'rgba(255,170,60,0.12)'); band(D_ICB, R_E, 'rgba(255,240,190,0.1)')
    for (const [key, col] of [['vp', P_COL], ['vs', S_COL]] as const) {
      g.beginPath(); let pen = false
      for (let i = 0; i <= 600; i++) { const d = (R_E * i) / 600, v = velAtDepth(d)[key]; if (key === 'vs' && v === 0) { pen = false; continue } const x = Xv(v), y = Yd(d); pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true }
      g.strokeStyle = col; g.lineWidth = 2.2; g.stroke()
    }
    g.font = FONT(700, 12); g.textAlign = 'left'; g.fillStyle = P_COL; g.fillText('纵波', Xv(12.2), T + 8); g.fillStyle = S_COL; g.fillText('横波', Xv(6.3), T + 8)
    g.fillStyle = DIM; g.font = FONT(500, 11); g.fillText('深度 km', 0, 10); g.textAlign = 'right'; g.fillText('km/s', w - 6, H - 3)
    if (hi) { const d = hi === 1 ? 33 : D_CMB, y = Yd(d); g.strokeStyle = '#7fe3d4'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, y); g.lineTo(w - 6, y); g.stroke(); g.fillStyle = '#7fe3d4'; g.font = FONT(700, 12); g.textAlign = 'right'; g.fillText(hi === 1 ? '莫霍面' : '古登堡面', w - 8, y - 5) }
  }, [hi])
}

/** 第 7 课：三栋楼的晃动倍数随地震波周期的变化 */
export function RespChart({ Tg, damped }: { Tg: number; damped: boolean }) {
  const COLS = ['#9fe0c8', '#ffd166', '#ff8a6b']
  return useCanvas(170, (g, w, H) => {
    const L = 30, B = H - 18, X = (T: number) => L + ((T - 0.1) / 2.4) * (w - L - 6), Yv = (a: number) => B - (Math.min(a, 12) / 12) * (B - 8)
    g.font = FONT(500, 11); g.fillStyle = DIM; g.textAlign = 'center'
    for (const T of [0.3, 1, 2]) { g.strokeStyle = GRID; g.beginPath(); g.moveTo(X(T), 6); g.lineTo(X(T), B); g.stroke(); g.fillText(`${T} s`, X(T), H - 3) }
    g.textAlign = 'right'; for (const a of [1, 5, 10]) { g.fillText(`${a}`, L - 5, Yv(a) + 4); g.strokeStyle = GRID; g.beginPath(); g.moveTo(L, Yv(a)); g.lineTo(w - 6, Yv(a)); g.stroke() }
    BUILDINGS.forEach((b, i) => {
      g.beginPath()
      for (let k = 0; k <= 240; k++) { const T = 0.1 + (2.4 * k) / 240, a = buildingTR(b.floors, T, b.key === 'high' && damped); k ? g.lineTo(X(T), Yv(a)) : g.moveTo(X(T), Yv(a)) }
      g.strokeStyle = COLS[i]; g.lineWidth = 2; g.stroke()
      const a = buildingTR(b.floors, Tg, b.key === 'high' && damped); g.fillStyle = COLS[i]; g.beginPath(); g.arc(X(Tg), Yv(a), 4.5, 0, 7); g.fill()
      g.font = FONT(700, 11.5); g.textAlign = 'left'; g.fillText(b.name, X(natPeriod(b.floors)) + 5, Yv(Math.min(12, buildingTR(b.floors, natPeriod(b.floors), b.key === 'high' && damped))) + 12)
    })
    g.strokeStyle = 'rgba(255,233,168,0.8)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(Tg), 6); g.lineTo(X(Tg), B); g.stroke(); g.setLineDash([])
  }, [Tg, damped])
}
export const COLORS = { P: P_COL, S: S_COL }
