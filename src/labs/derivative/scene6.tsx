// 导数 · 第 6 课的三维场景：谷底桥头（x = 5 百米）路北的电子屏，屏上是纵断面 y = f(x)。
// 车停在坡顶、谷底时，屏上在它左右各画一小段切线，看 f′ 的符号怎么变；求最值时铺出 [2, 6] 这一段，比较端点和极值点。
import type { Label } from '@/lab-kit'
import At, { RoadCar } from './at'
import { Band, C, Curve, dataWorld, Dot, Mounted, Panel, Seg, type Mount } from './graph'
import { AP } from './scene3'
import { tag } from './scene1'
import { classify, extremaOn, fmt, RANGE6, road, ROAD_X, slope } from './physics'
import { P, PAD, padY } from './terrain'

export const M6: Mount = { origin: [P.s6[0], padY(PAD.s6), P.s6[1]], az: 0, w: 18, lift: 3.2 }
const EX = extremaOn(...RANGE6)

/** 在 x0 左右各画一小段切线，颜色按 f′ 的正负 */
function SideTangents({ x0 }: { x0: number }) {
  const c = classify(x0), h = 0.28
  return <>{[[x0 - 0.5, c.left], [x0 + 0.5, c.right]].map(([x, k]) => <Seg key={x} A={AP} p={[x - h, road(x) - h * k]} q={[x + h, road(x) + h * k]} color={k > 0 ? C.up : C.down} width={0.13} />)}
    <Seg A={AP} p={[x0 - 0.45, road(x0)]} q={[x0 + 0.45, road(x0)]} color={C.tangent} width={0.13} /></>
}

/** u：车在哪；top、bottom：看过坡顶、谷底；range：标出 [2, 6] 上的最值 */
export default function Scene6({ u, top, bottom, range }: { u: number; top: boolean; bottom: boolean; range: boolean }) {
  const W = (x: number, y: number) => dataWorld(M6, [0, 0], AP, x, y)
  const labels: Label[] = []
  if (top) labels.push({ id: 'top', at: W(1.25, 16.8), ax: 0, style: tag(C.tangent), className: 'scene-tag -translate-y-full', children: <><small>极大值</small>f(1) = 16</> })
  if (top && !range) labels.push({ id: 'tl', at: W(0.2, 11.2), ax: 0.5, style: tag(C.up), className: 'scene-tag -translate-y-1/2', children: <>f′ &gt; 0</> })
  if (top && !range) labels.push({ id: 'tr', at: W(1.95, 11.6), ax: 0.5, style: tag(C.down), className: 'scene-tag -translate-y-1/2', children: <>f′ &lt; 0</> })
  if (bottom) labels.push({ id: 'bot', at: W(5, -0.6), ax: 0.5, style: tag(C.tangent), className: 'scene-tag', children: <><small>极小值</small>f(5) = 0</> })
  if (bottom && !range) labels.push({ id: 'bl', at: W(4.1, 4.2), ax: 0.5, style: tag(C.down), className: 'scene-tag -translate-y-1/2', children: <>f′ &lt; 0</> })
  if (bottom && !range) labels.push({ id: 'br', at: W(5.85, 6.4), ax: 0.5, style: tag(C.up), className: 'scene-tag -translate-y-1/2', children: <>f′ &gt; 0</> })
  if (range) labels.push({ id: 'mx', at: W(2.12, 14.1), style: tag(C.guide), className: 'scene-tag key -translate-y-full', children: <><small>[2, 6] 上最大</small>f(2) = {fmt(EX.max.y)}</> })
  if (range) labels.push({ id: 'end', at: W(6, 3.5 + 0.6), ax: 1, className: 'scene-tag -translate-y-full', children: <>f(6) = {fmt(road(6))}</> })
  return (
    <At at="s6" labels={labels}>
      <RoadCar x={u * 100} />
      <Mounted M={M6} h={10}>
        <Panel A={AP}>
          {range && <Band A={AP} x0={RANGE6[0]} x1={RANGE6[1]} color={C.guide} opacity={0.09} />}
          <Curve A={AP} f={road} xr={ROAD_X} color={C.curve} width={0.13} />
          {range && <Curve A={AP} f={road} xr={RANGE6} color={C.guide} width={0.2} />}
          {top && <SideTangents x0={1} />}
          {bottom && <SideTangents x0={5} />}
          {range && EX.cand.map(c => <Dot key={c.x} A={AP} x={c.x} y={c.y} color={C.guide} r={0.2} />)}
          <Dot A={AP} x={u} y={road(u)} color={Math.abs(slope(u)) < 0.05 ? C.dot : slope(u) > 0 ? C.up : C.down} r={0.2} />
        </Panel>
      </Mounted>
    </At>
  )
}
