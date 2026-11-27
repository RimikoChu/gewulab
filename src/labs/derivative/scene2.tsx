// 导数 · 第 2 课的三维场景：还是起步点那块屏，镜头推近，屏上放大 0–4 s 这一段。
// P 固定在 t = 2 s，Q 在 t = 2 + Δt；Δt 连续变小，割线绕着 P 转，最后贴成切线。车开过路边的雷达测速屏时，屏上显示那一刻的速度。
import type { Label } from '@/lab-kit'
import At, { RoadCar } from './at'
import { axes, C, Curve, Dash, dataWorld, Dot, Line, Mounted, Panel, Seg } from './graph'
import { carX, H1, M1, RadarSign, StopLine, tag } from './scene1'
import { dist, fmt, lineText, quotient, speed, T0 } from './physics'

export const A2 = axes({ xr: [0, 4], yr: [0, 16], xStep: 0.5, yStep: 2, minor: [0.25, 1], xName: 't / s', yName: 's / m', w: 18, h: 10, font: 0.6 })

/** dt：现在的 Δt（0 表示还没开始）；tangent：画出切线；tc：车开到第几秒；radar：测速屏上的字 */
export default function Scene2({ dt, tangent, tc, radar }: { dt: number; tangent: boolean; tc: number; radar: string }) {
  const y0 = dist(T0), t1 = T0 + dt, y1 = dist(t1), k = dt ? quotient(T0, dt) : 0, x = carX(dist(tc))
  const kt = speed(T0)
  const labels: Label[] = [
    { id: 'p', at: dataWorld(M1, [0, 0], A2, T0 + 0.08, y0 - 0.5), className: 'scene-tag -translate-y-full', children: <>P (2, 4)</> },
  ]
  if (dt) {
    labels.push({ id: 'k', at: dataWorld(M1, [0, 0], A2, 0.55, 13.6), style: tag(C.secant), className: 'scene-tag key -translate-y-1/2', children: <><small>割线斜率 Δs/Δt</small>{k.toFixed(Math.abs(dt) < 0.0095 ? 3 : Math.abs(dt) < 0.095 ? 2 : 1)} m/s</> })
    labels.push({ id: 'q', at: dataWorld(M1, [0, 0], A2, t1 + (dt > 0 ? 0.1 : -0.1), y1 + (dt > 0 ? 0.4 : 0.3)), ax: dt > 0 ? 0 : 1, className: 'scene-tag -translate-y-full', children: <>Q<small className="ml-1.5">Δt = {fmt(dt)} s</small></> })
  }
  if (tangent) labels.push({ id: 't', at: dataWorld(M1, [0, 0], A2, 3.2, 8.8), style: tag(C.tangent), className: 'scene-tag -translate-y-1/2', children: <><small>切线</small>{lineText(kt, y0 - kt * T0, 't', 's')}</> })
  return (
    <At at="s1b" labels={labels}>
      <StopLine />
      <RadarSign value={radar} />
      <RoadCar x={x} />
      <Mounted M={M1} h={H1}>
        <Panel A={A2}>
          <Curve A={A2} f={dist} xr={[0, 4]} color={C.curve} width={0.13} />
          {tangent && <Line A={A2} k={kt} b={y0 - kt * T0} color={C.tangent} width={0.12} />}
          {dt !== 0 && <>
            <Line A={A2} k={k} b={y0 - k * T0} color={C.secant} width={0.08} opacity={0.6} />
            <Seg A={A2} p={[T0, y0]} q={[t1, y1]} color={C.secant} width={0.15} />
            {Math.abs(dt) > 0.05 && <><Dash A={A2} p={[Math.min(T0, t1), Math.min(y0, y1)]} q={[Math.max(T0, t1), Math.min(y0, y1)]} /><Dash A={A2} p={[dt > 0 ? t1 : T0, Math.min(y0, y1)]} q={[dt > 0 ? t1 : T0, Math.max(y0, y1)]} /></>}
            <Dot A={A2} x={t1} y={y1} color={C.secant} r={0.17} />
          </>}
          <Dot A={A2} x={T0} y={y0} color={C.dot} r={0.2} />
        </Panel>
      </Mounted>
    </At>
  )
}
