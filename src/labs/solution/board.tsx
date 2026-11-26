// 第 5 课白板上的溶解度曲线：画在一张画布上，贴在白板面上。左边大图是硝酸钾和氯化钠（0–250 g），右边小图是氢氧化钙（0–0.20 g）。
// 描点、连线、交点、60 ℃ 的读数线都按进度一点点画出来；数都从计算核心取。
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { TABLE, TEMPS, crossing, solubility, type Salt } from './physics'
import { BOARD } from './world'
import { FONT } from './mats'

export const CURVE_COLOR: Record<Salt, string> = { KNO3: '#d2452f', NaCl: '#2c69b0', CaOH2: '#2f8a57' }
const CW = 2048, CH = Math.round(2048 * BOARD.h / BOARD.w)
/** 两张图在画布上的位置（像素）：x0、x1 左右，y0 上、y1 下；纵轴的最大值 */
const MAIN = { x0: 210, x1: 1250, y0: 150, y1: CH - 120, max: 250 }
const SMALL = { x0: 1480, x1: 1960, y0: 330, y1: 850, max: 0.2 }
const area = (s: Salt) => s === 'CaOH2' ? SMALL : MAIN
/** 温度 t、溶解度 v 在画布上的位置 */
export function px(s: Salt, t: number, v: number): [number, number] { const a = area(s); return [a.x0 + (a.x1 - a.x0) * t / 100, a.y1 - (a.y1 - a.y0) * Math.min(1.02, v / a.max)] }
/** 画布上的一点在白板上的位置（相对板面中心，场景单位） */
export const toBoard = ([x, y]: [number, number]): [number, number] => [(x / CW - 0.5) * BOARD.w, (0.5 - y / CH) * BOARD.h]

/** 一条曲线画到哪了：k 0–1；前一半一个个描点，后一半连线。返回现在笔尖在画布上的位置 */
export function penAt(s: Salt, k: number): [number, number] {
  const n = TEMPS.length
  if (k < 0.5) { const i = Math.min(n - 1, Math.floor(k / 0.5 * n)); return px(s, TEMPS[i], TABLE[s][i]) }
  const t = Math.min(100, (k - 0.5) / 0.5 * 100); return px(s, t, solubility(s, t))
}

export interface ChartState { k: Record<Salt, number>; cross: number; r60: number }
function draw(g: CanvasRenderingContext2D, st: ChartState) {
  g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, CW, CH)
  g.fillStyle = '#1f2326'; g.font = `700 58px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('溶解度曲线', 60, 70)
  // 坐标格
  for (const s of ['NaCl', 'CaOH2'] as Salt[]) {
    const a = area(s), stepV = s === 'CaOH2' ? 0.05 : 25
    g.strokeStyle = '#d3d9d9'; g.lineWidth = 3
    for (let t = 0; t <= 100; t += 10) { const [x] = px(s, t, 0); g.beginPath(); g.moveTo(x, a.y0); g.lineTo(x, a.y1); g.stroke() }
    for (let v = 0; v <= a.max + 1e-9; v += stepV) { const [, y] = px(s, 0, v); g.beginPath(); g.moveTo(a.x0, y); g.lineTo(a.x1, y); g.stroke() }
    g.strokeStyle = '#2b2f33'; g.lineWidth = 5; g.beginPath(); g.moveTo(a.x0, a.y0 - 30); g.lineTo(a.x0, a.y1); g.lineTo(a.x1 + 30, a.y1); g.stroke()
    g.fillStyle = '#2b2f33'; g.beginPath(); g.moveTo(a.x0, a.y0 - 50); g.lineTo(a.x0 - 14, a.y0 - 22); g.lineTo(a.x0 + 14, a.y0 - 22); g.fill(); g.beginPath(); g.moveTo(a.x1 + 50, a.y1); g.lineTo(a.x1 + 22, a.y1 - 14); g.lineTo(a.x1 + 22, a.y1 + 14); g.fill()
    const big = s !== 'CaOH2'
    g.font = `600 ${big ? 46 : 38}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'top'
    for (let t = 0; t <= 100; t += big ? 10 : 20) { const [x] = px(s, t, 0); g.fillText(String(t), x, a.y1 + 12) }
    g.textAlign = 'right'; g.textBaseline = 'middle'
    for (let v = 0; v <= a.max + 1e-9; v += big ? 50 : 0.05) { const [, y] = px(s, 0, v); g.fillText(big ? String(v) : v.toFixed(2), a.x0 - 14, y) }
    g.font = `600 ${big ? 42 : 36}px ${FONT}`; g.textAlign = 'left'; g.fillText('溶解度 / g', a.x0 + 16, a.y0 - 40); g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText('温度 / ℃', a.x1 + 40, a.y1 + 56)
  }
  g.fillStyle = '#2f8a57'; g.font = `700 52px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('氢氧化钙', SMALL.x0, SMALL.y0 - 110)
  // 曲线
  for (const s of ['KNO3', 'NaCl', 'CaOH2'] as Salt[]) {
    const k = st.k[s]; if (k <= 0) continue
    const col = CURVE_COLOR[s], n = TEMPS.length, big = s !== 'CaOH2'
    const shown = k >= 0.5 ? n : Math.floor(k / 0.5 * n) + 1
    if (k > 0.5) {
      const tEnd = Math.min(100, (k - 0.5) / 0.5 * 100)
      g.strokeStyle = col; g.lineWidth = big ? 12 : 10; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath()
      for (let t = 0; t <= tEnd + 1e-6; t += 1) { const [x, y] = px(s, t, solubility(s, t)); if (t === 0) g.moveTo(x, y); else g.lineTo(x, y) }
      g.stroke()
    }
    g.fillStyle = col
    for (let i = 0; i < Math.min(n, shown); i++) { const [x, y] = px(s, TEMPS[i], TABLE[s][i]); if (TABLE[s][i] > area(s).max * 1.02) continue; g.beginPath(); g.arc(x, y, big ? 15 : 12, 0, 7); g.fill() }
    if (k >= 1 && big) { g.font = `700 56px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; const [x, y] = s === 'KNO3' ? px(s, 86, 210) : px(s, 84, 52); g.fillText(s === 'KNO3' ? '硝酸钾' : '氯化钠', x, y) }
  }
  // 交点
  if (st.cross > 0) {
    const c = crossing(), [x, y] = px('NaCl', c.t, c.s), a = Math.min(1, st.cross * 1.5)
    g.globalAlpha = a; g.setLineDash([16, 12]); g.strokeStyle = '#5b2f80'; g.lineWidth = 4
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, MAIN.y1); g.moveTo(x, y); g.lineTo(MAIN.x0, y); g.stroke(); g.setLineDash([])
    g.lineWidth = 6; g.beginPath(); g.arc(x, y, 24, 0, 7); g.stroke()
    g.fillStyle = '#5b2f80'; g.font = `700 54px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(`约 ${Math.round(c.t)} ℃，约 ${Math.round(c.s)} g`, x + 30, y - 30)
    g.globalAlpha = 1
  }
  // 60 ℃ 的读数线
  if (st.r60 > 0) {
    const a = Math.min(1, st.r60 * 1.5), [x] = px('NaCl', 60, 0)
    g.globalAlpha = a; g.setLineDash([16, 12]); g.strokeStyle = '#7a5a12'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, MAIN.y1); g.lineTo(x, MAIN.y0); g.stroke(); g.setLineDash([])
    for (const s of ['KNO3', 'NaCl'] as Salt[]) { const v = solubility(s, 60), [, y] = px(s, 60, v); g.fillStyle = CURVE_COLOR[s]; g.beginPath(); g.arc(x, y, 15, 0, 7); g.fill(); g.font = `700 54px ${FONT}`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(`${s === 'KNO3' ? v.toFixed(0) : v.toFixed(1)} g`, x - 26, y - 30) }
    g.globalAlpha = 1
  }
}

/** 贴在白板面上的曲线图 */
export function ChartFace({ st }: { st: ChartState }) {
  const { tex, ctx } = useMemo(() => {
    const c = document.createElement('canvas'); c.width = CW; c.height = CH
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return { tex: t, ctx: c.getContext('2d')! }
  }, [])
  useEffect(() => { draw(ctx, st); tex.needsUpdate = true }, [st.k.KNO3, st.k.NaCl, st.k.CaOH2, st.cross, st.r60, ctx, tex])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tex.dispose(), [tex])
  return <mesh position={[BOARD.x, BOARD.y, BOARD.z + 0.012]}><planeGeometry args={[BOARD.w, BOARD.h]} /><meshStandardMaterial map={tex} roughness={0.4} /></mesh>
}
