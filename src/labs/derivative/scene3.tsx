// 导数 · 第 3 课的三维场景：下坡中段（x = 3 百米）。车停在 P 点，路边立着“下坡 6%”的警告牌；
// 路北的电子屏上是整段山路的纵断面 y = f(x)。Q 沿曲线滑向 P，割线绕着 P 转成切线。
import type { Label } from '@/lab-kit'
import At, { RoadCar } from './at'
import { axes, C, Curve, Dash, dataWorld, Dot, Line, Mounted, Panel, Seg, type Mount } from './graph'
import { tag } from './scene1'
import { avgRate, fmt, lineText, P3, road, ROAD_X, slope, tangent } from './physics'
import { P, PAD, padY } from './terrain'

/** 纵断面的坐标系：第 3、5、6 课共用 */
export const AP = axes({ xr: [0, 6], yr: [0, 18], xStep: 1, yStep: 2, minor: [0.5, 1], xName: 'x / 百米', yName: 'y / m', w: 18, h: 10, font: 0.6 })
export const M3: Mount = { origin: [P.s3[0], padY(PAD.s3), P.s3[1]], az: 0, w: 18, lift: 3.2 }

/** dx：Q 离 P 多远（0 表示还没连割线）；grow：割线画到哪；tan：切线画到哪（0 → 1） */
export default function Scene3({ dx, grow, tan }: { dx: number; grow: number; tan: number }) {
  const y0 = road(P3), qx = P3 + dx, qy = road(qx), k = dx ? avgRate(road, P3, qx) : 0, T = tangent(road, slope, P3)
  const W = (x: number, y: number) => dataWorld(M3, [0, 0], AP, x, y)
  const labels: Label[] = [
    { id: 'p', at: W(P3 - 0.12, y0 - 0.6), ax: 1, className: 'scene-tag -translate-y-full', children: <>P (3, 8)<small className="ml-1.5">车在这里</small></> },
    { id: 'n', at: [P3 * 100 - 10, padY(PAD.s3) + 1.5, 7], name: true, className: 'scene-name', children: '下坡中段 · 离起点 300 m' },
  ]
  if (dx && grow > 0.7) {
    labels.push({ id: 'k', at: W(3.9, 15.4), style: tag(C.secant), className: 'scene-tag key -translate-y-1/2', children: <><small>割线 PQ 的斜率</small>{dx < 0.05 ? k.toFixed(4).replace("-", "−") : fmt(k)}</> })
    labels.push({ id: 'q', at: W(qx + 0.1, qy + 0.5), className: 'scene-tag -translate-y-full', children: <>Q<small className="ml-1.5">Δx = {fmt(dx)}</small></> })
  }
  if (tan > 0.6) labels.push({ id: 't', at: W(1.15, 18.6), style: tag(C.tangent), className: 'scene-tag -translate-y-1/2', children: <><small>切线</small>{lineText(T.k, T.b)}</> })
  const g1 = Math.min(1, grow / 0.5)
  return (
    <At at="s3" labels={labels}>
      <RoadCar x={P3 * 100} />
      <Mounted M={M3} h={10}>
        <Panel A={AP}>
          <Curve A={AP} f={road} xr={ROAD_X} color={C.curve} width={0.13} />
          {tan > 0 && <Line A={AP} k={T.k} b={T.b} color={C.tangent} width={0.13} xr={[P3 - 3 * tan, P3 + 3 * tan]} />}
          {dx !== 0 && grow > 0 && <>
            {dx > 0.15 && <><Dash A={AP} p={[P3, y0]} q={[P3 + dx * g1, y0]} /><Dash A={AP} p={[qx, y0]} q={[qx, y0 + (qy - y0) * Math.max(0, (grow - 0.5) / 0.3)]} /></>}
            {grow > 0.7 && <><Line A={AP} k={k} b={y0 - k * P3} color={C.secant} width={0.08} opacity={0.6} /><Seg A={AP} p={[P3, y0]} q={[qx, qy]} color={C.secant} width={0.15} /></>}
            <Dot A={AP} x={qx} y={qy} color={C.secant} r={0.18} />
          </>}
          <Dot A={AP} x={P3} y={y0} color={C.dot} r={0.21} />
        </Panel>
      </Mounted>
    </At>
  )
}
