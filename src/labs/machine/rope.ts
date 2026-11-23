// 绳子绕过几只滑轮的走法（只是画图用的几何，不出任何读数）：从起点出发，依次绕过各只轮子，最后一段沿给定方向伸出去。
// 绳子全长不变：轮子的位置一变，最后伸出去的那一段就跟着变长或变短，绳端就在那里。轮子转过的角度也由绳子走过的长度算出来。
// 平面里算（x、y），单位随调用的人（这里都用画面单位）。
export type XY = [number, number]
/** 一只轮子：圆心、半径、绕的方向（1 逆时针，−1 顺时针） */
export interface Wrap { c: XY; r: number; s: 1 | -1 }

/** 从圆 A 到圆 B 的公切线：两头的切点。点就当成半径为 0 的圆 */
function tangent(a: XY, ra: number, sa: number, b: XY, rb: number, sb: number): [XY, XY] {
  const dx = b[0] - a[0], dy = b[1] - a[1], D = Math.hypot(dx, dy), k = sb * rb - sa * ra
  const th = Math.atan2(dy, dx) - Math.asin(Math.max(-1, Math.min(1, k / D)))
  const nx = -Math.sin(th), ny = Math.cos(th)
  return [[a[0] - sa * ra * nx, a[1] - sa * ra * ny], [b[0] - sb * rb * nx, b[1] - sb * rb * ny]]
}
/** 沿方向 u 离开圆时的切点 */
function leave(c: XY, r: number, s: number, u: XY): XY { const l = Math.hypot(u[0], u[1]), nx = -u[1] / l, ny = u[0] / l; return [c[0] - s * r * nx, c[1] - s * r * ny] }

/**
 * 绳子的走法：start 是绳子拴住的那一头，wraps 是依次绕过的轮子，最后从最后一只轮子沿 out 方向伸出 free 这么长。
 * 返回一串点（画绳子用）、到每只轮子时已经走过多长（算轮子转角用）、绳子从起点到最后一个切点的长度 path、绳端 end。
 */
export function route(start: XY, wraps: Wrap[], out: XY, free: number) {
  const pts: XY[] = [start], arrive: number[] = []
  let len = 0, prev: XY = start, pr = 0, ps = 1
  let cur: XY = start
  for (let i = 0; i < wraps.length; i++) {
    const w = wraps[i], [t0, t1] = tangent(prev, pr, ps, w.c, w.r, w.s)
    if (i === 0) { len += Math.hypot(t1[0] - start[0], t1[1] - start[1]) } else {
      // 上一只轮子上绕过的弧
      const pw = wraps[i - 1], a0 = Math.atan2(cur[1] - pw.c[1], cur[0] - pw.c[0]), a1 = Math.atan2(t0[1] - pw.c[1], t0[0] - pw.c[0])
      let da = (a1 - a0) * pw.s; while (da < 0) da += Math.PI * 2; while (da > Math.PI * 2) da -= Math.PI * 2
      const n = Math.max(2, Math.ceil(da / 0.15))
      for (let k = 1; k <= n; k++) { const a = a0 + pw.s * da * k / n; pts.push([pw.c[0] + Math.cos(a) * pw.r, pw.c[1] + Math.sin(a) * pw.r]) }
      len += da * pw.r + Math.hypot(t1[0] - t0[0], t1[1] - t0[1])
    }
    arrive.push(len); pts.push(t1); cur = t1; prev = w.c; pr = w.r; ps = w.s
  }
  let end: XY
  if (wraps.length) {
    const w = wraps[wraps.length - 1], t = leave(w.c, w.r, w.s, out), a0 = Math.atan2(cur[1] - w.c[1], cur[0] - w.c[0]), a1 = Math.atan2(t[1] - w.c[1], t[0] - w.c[0])
    let da = (a1 - a0) * w.s; while (da < 0) da += Math.PI * 2; while (da > Math.PI * 2) da -= Math.PI * 2
    const n = Math.max(2, Math.ceil(da / 0.15))
    for (let k = 1; k <= n; k++) { const a = a0 + w.s * da * k / n; pts.push([w.c[0] + Math.cos(a) * w.r, w.c[1] + Math.sin(a) * w.r]) }
    len += da * w.r; cur = t
  }
  const l = Math.hypot(out[0], out[1]) || 1
  end = [cur[0] + out[0] / l * free, cur[1] + out[1] / l * free]
  pts.push(end)
  return { pts, arrive, path: len, end }
}
