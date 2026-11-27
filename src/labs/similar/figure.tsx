// 第 1–3 课共用：平放在地上的多边形。四边是彩色木条（对应边同色），每个角一段同色小弧；边长、角度的标签位置也在这里算。
import type { Label } from '@/lab-kit'
import type { P2 } from './physics'
import { ANG, Arc, Lath, SIDE, tag, tagStyle, type V3 } from './parts'

/** 平面上的一点 (u, v) 放到世界里：u 朝东（+x），v 朝北（−z），y 是离地高度 */
export const onPlane = (o: V3) => (u: number, v: number, y = 0): V3 => [o[0] + u, o[1] + y, o[2] - v]

/** 边的外侧法线（顶点逆时针） */
const outward = (a: P2, b: P2): P2 => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l] }
/** 角平分线朝里的方向 */
const inward = (pts: P2[], i: number): P2 => {
  const n = pts.length, p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]
  const u = [a[0] - p[0], a[1] - p[1]], w = [b[0] - p[0], b[1] - p[1]], lu = Math.hypot(u[0], u[1]), lw = Math.hypot(w[0], w[1])
  const x = u[0] / lu + w[0] / lw, y = u[1] / lu + w[1] / lw, l = Math.hypot(x, y) || 1
  return [x / l, y / l]
}

/** 木条拼成的多边形，每个角一段弧。arcs：弧的透明度（0 不画）；rad：弧半径 */
export function Figure({ pts, at, arcs = 1, rad = 0.16, colors = SIDE as readonly string[], lath = 0.05 }: { pts: P2[]; at: (u: number, v: number, y?: number) => V3; arcs?: number; rad?: number; colors?: readonly string[]; lath?: number }) {
  const n = pts.length
  return <group>
    {pts.map((p, i) => { const q = pts[(i + 1) % n]; return <Lath key={i} p={at(p[0], p[1], 0.002 + (i % 2) * 0.003)} q={at(q[0], q[1], 0.002 + (i % 2) * 0.003)} color={colors[i % colors.length]} w={lath} /> })}
    {arcs > 0 && pts.map((p, i) => { const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]; return <Arc key={`a${i}`} v={at(p[0], p[1], 0.04)} p={at(a[0], a[1], 0.04)} q={at(b[0], b[1], 0.04)} rad={rad} color={ANG[i % ANG.length]} r={0.012} opacity={arcs} /> })}
  </group>
}

/** 边长标签：贴在每条边外侧；text(i) 给出第 i 条边的文字 */
export function sideLabels(id: string, pts: P2[], at: (u: number, v: number, y?: number) => V3, text: (i: number) => string, opacity = 1, off = 0.17): Label[] {
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length], [nx, ny] = outward(p, q), m: P2 = [(p[0] + q[0]) / 2 + nx * off, (p[1] + q[1]) / 2 + ny * off]
    return { id: `${id}s${i}`, at: at(m[0], m[1], 0.05), ax: 0.5, className: `${tag} transition-opacity`, style: tagStyle(SIDE[i % SIDE.length], { opacity }), children: text(i) }
  })
}
/** 角度标签：在每个角的平分线上、弧的里面一点 */
export function angleLabels(id: string, pts: P2[], at: (u: number, v: number, y?: number) => V3, text: (i: number) => string, opacity = 1, off = 0.32): Label[] {
  return pts.map((p, i) => {
    const [dx, dy] = inward(pts, i)
    return { id: `${id}a${i}`, at: at(p[0] + dx * off, p[1] + dy * off, 0.05), ax: 0.5, className: `${tag} transition-opacity`, style: tagStyle(ANG[i % ANG.length], { opacity, fontSize: 14, padding: '1px 7px' }), children: text(i) }
  })
}
/** 顶点名称：在角的外侧 */
export function vertexLabels(id: string, pts: P2[], at: (u: number, v: number, y?: number) => V3, names: string[], off = 0.14): Label[] {
  return pts.map((p, i) => {
    const [dx, dy] = inward(pts, i)
    return { id: `${id}v${i}`, at: at(p[0] - dx * off, p[1] - dy * off, 0.05), ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: names[i] }
  })
}
