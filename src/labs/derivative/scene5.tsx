// 导数 · 第 5 课的三维场景：坡顶（x = 1 百米）路北一块上下两格的电子屏。上格是纵断面 y = f(x)，车所在处画一小段切线；
// 下格是导函数 y = f′(x)，车开到哪描到哪。标出区间时，两格同时铺上绿色（递增）、橙色（递减）的底色。
import type { Label } from '@/lab-kit'
import At, { RoadCar } from './at'
import { axes, Band, C, Curve, dataWorld, Dot, Mounted, Panel, Seg, type Mount } from './graph'
import { tag } from './scene1'
import { fmt, monotone, road, ROAD_X, slope } from './physics'
import { LANE, P, PAD, padY, R } from './terrain'

export const M5: Mount = { origin: [P.s5[0], padY(PAD.s5), P.s5[1]], az: 0, w: 18, lift: 3 }
const TOP: [number, number] = [0, 6.7], BOT: [number, number] = [0, 0]
export const A5 = axes({ xr: [0, 6], yr: [0, 18], xStep: 1, yStep: 4, minor: [0.5, 2], xName: 'x / 百米', yName: 'y / m', w: 18, h: 7.3, font: 0.52 })
export const D5 = axes({ xr: [0, 6], yr: [-8, 8], xStep: 1, yStep: 4, minor: [0.5, 2], xName: 'x', yName: 'f′(x)', w: 18, h: 6.5, font: 0.52 })
const MONO = monotone()

/** u：车开到哪（百米）；trace：下格描到哪；up、down：铺不铺递增、递减的底色 */
export default function Scene5({ u, trace, up, down }: { u: number; trace: number; up: boolean; down: boolean }) {
  const k = slope(u), y = road(u), col = Math.abs(k) < 0.05 ? C.dot : k > 0 ? C.up : C.down, h = 0.45
  const labels: Label[] = [
    { id: 'car', at: [u * 100, R(u * 100) + 2.1, LANE], ax: 0.5, style: tag(col), className: 'scene-tag -translate-y-full', children: <><small>坡度</small>{k > 0 ? '+' : ''}{fmt(k, 1)}%<small className="ml-1.5">{Math.abs(k) < 0.05 ? '平' : k > 0 ? '上坡' : '下坡'}</small></> },
    { id: 'f', at: dataWorld(M5, TOP, A5, 2.2, 18.3), style: tag(C.curve), className: 'scene-tag -translate-y-1/2', children: <span className="font-formula italic">y = f(x)</span> },
    { id: 'd', at: dataWorld(M5, BOT, D5, 2.2, 7.6), style: tag(C.deriv), className: 'scene-tag -translate-y-1/2', children: <span className="font-formula italic">y = f′(x)</span> },
  ]
  if (up) labels.push({ id: 'u', at: dataWorld(M5, BOT, D5, 5.5, -6.2), ax: 0.5, style: tag(C.up), className: 'scene-tag -translate-y-1/2', children: <>f′ &gt; 0 · 递增</> })
  if (down) labels.push({ id: 'w', at: dataWorld(M5, BOT, D5, 3, -6.2), ax: 0.5, style: tag(C.down), className: 'scene-tag -translate-y-1/2', children: <>f′ &lt; 0 · 递减</> })
  return (
    <At at="s5" labels={labels}>
      <RoadCar x={u * 100} />
      <Mounted M={M5} h={14}>
        <group position={[...TOP, 0]}>
          <Panel A={A5}>
            {up && MONO.up.map(([a, b]) => <Band key={a} A={A5} x0={a} x1={b} color={C.up} />)}
            {down && MONO.down.map(([a, b]) => <Band key={a} A={A5} x0={a} x1={b} color={C.down} />)}
            <Curve A={A5} f={road} xr={ROAD_X} color={C.curve} width={0.12} />
            <Seg A={A5} p={[u - h, y - h * k]} q={[u + h, y + h * k]} color={C.tangent} width={0.13} />
            <Dot A={A5} x={u} y={y} color={col} r={0.19} />
          </Panel>
        </group>
        <group position={[...BOT, 0]}>
          <Panel A={D5}>
            {up && MONO.up.map(([a, b]) => <Band key={a} A={D5} x0={a} x1={b} color={C.up} />)}
            {down && MONO.down.map(([a, b]) => <Band key={a} A={D5} x0={a} x1={b} color={C.down} />)}
            {trace > 0.001 && <Curve A={D5} f={slope} xr={[0, trace]} color={C.deriv} width={0.12} />}
            {trace > 0.001 && <Dot A={D5} x={trace} y={slope(trace)} color={col} r={0.17} />}
          </Panel>
        </group>
      </Mounted>
    </At>
  )
}
