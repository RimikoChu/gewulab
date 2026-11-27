// 导数 · 第 4 课的三维场景：服务区广场上的大电子屏（朝着公路），上下两格。
// 上格是 y = f(x)，切点从左扫到右，切线跟着转；下格把每一处切线的斜率描成点，连起来就是导函数 y = f′(x)。
import type { Label } from '@/lab-kit'
import At from './at'
import { axes, C, Curve, dataWorld, Dot, Line, Mounted, Panel, type Axes, type Mount } from './graph'
import { tag } from './scene1'
import { FN_KEYS, FUNCS, fmt, numSlope, type FnKey } from './physics'
import { P } from './terrain'

export const M4: Mount = { origin: [P.service[0], 0, P.service[1]], az: Math.PI, w: 18, lift: 3 }
const TOP: [number, number] = [0, 6.9], BOT: [number, number] = [0, 0]
/** 每个函数一套坐标系（上格 f、下格 f′） */
const AX: Record<FnKey, { top: Axes; bot: Axes }> = Object.fromEntries(FN_KEYS.map(k => {
  const c = FUNCS[k]
  return [k, {
    top: axes({ xr: c.xr, yr: c.yr, xStep: c.xStep, yStep: c.yStep, xName: 'x', yName: 'y', w: 18, h: 6.7, font: 0.5 }),
    bot: axes({ xr: c.xr, yr: c.dyr, xStep: c.xStep, yStep: c.dyStep, xName: 'x', yName: 'y', w: 18, h: 6.7, font: 0.5 }),
  }]
})) as Record<FnKey, { top: Axes; bot: Axes }>

/** fn：哪个函数；xc：切点扫到哪（null 表示还没开始）；done：描完了，写出导函数 */
export default function Scene4({ fn, xc, done }: { fn: FnKey; xc: number | null; done: boolean }) {
  const c = FUNCS[fn], { top, bot } = AX[fn]
  const labels: Label[] = [
    { id: 'f', at: dataWorld(M4, TOP, top, c.xr[0] + (c.xr[1] - c.xr[0]) * 0.06, c.yr[1] * 0.98 + c.yr[0] * 0.02), style: tag(C.curve), className: 'scene-tag -translate-y-1/2', children: <span className="font-formula italic">{c.fText}</span> },
  ]
  const k = xc === null ? 0 : numSlope(c.f, xc)
  if (xc !== null) labels.push({ id: 'k', at: dataWorld(M4, TOP, top, c.xr[0] + (c.xr[1] - c.xr[0]) * 0.62, c.yr[1] * 0.98 + c.yr[0] * 0.02), style: tag(C.tangent), className: 'scene-tag -translate-y-1/2', children: <><small>x = {fmt(xc, 2)} 处切线斜率</small>{fmt(k, 2)}</> })
  if (done) labels.push({ id: 'd', at: dataWorld(M4, BOT, bot, c.xr[0] + (c.xr[1] - c.xr[0]) * 0.06, c.dyr[1] * 0.98 + c.dyr[0] * 0.02), style: tag(C.deriv), className: 'scene-tag key -translate-y-1/2', children: <span className="font-formula italic">{c.dText}</span> })
  return (
    <At at="service" labels={labels}>
      <Mounted M={M4} h={13.6}>
        <group position={[...TOP, 0]}>
          <Panel A={top}>
            <Curve A={top} f={c.f} xr={c.xr} color={C.curve} width={0.12} />
            {xc !== null && <><Line A={top} k={k} b={c.f(xc) - k * xc} color={C.tangent} width={0.1} /><Dot A={top} x={xc} y={c.f(xc)} color={C.dot} r={0.17} /></>}
          </Panel>
        </group>
        <group position={[...BOT, 0]}>
          <Panel A={bot}>
            {xc !== null && xc > c.xr[0] + 1e-3 && <Curve A={bot} f={x => numSlope(c.f, x)} xr={[c.xr[0], xc]} color={C.deriv} width={0.12} />}
            {xc !== null && <Dot A={bot} x={xc} y={k} color={C.deriv} r={0.17} />}
          </Panel>
        </group>
      </Mounted>
    </At>
  )
}
