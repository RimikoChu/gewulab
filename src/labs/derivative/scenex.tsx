// 导数 · 拓展课的三维场景：平地西头的区间测速起点。龙门架上挂着摄像机和“区间测速起点”的牌子，路北一块电子屏。
// 专题一：一辆车在测速区间里的 s–t 图像，割线的斜率是平均速度；一条切线沿曲线滑动，找到和割线平行的地方。
// 专题二：走 100 km 的耗油 Q(v)，切线滑到放平的地方就是最省油的车速。
import type { Label } from '@/lab-kit'
import At from './at'
import { Sedan } from './car'
import { axes, C, Curve, dataWorld, Dot, Line, Mounted, Panel, Seg, type Mount } from './graph'
import { tag } from './scene1'
import { fmt, fuel, fuelD, trip, tripSpeed, ZONE, zoneAvg } from './physics'
import { LANE, P, PAD, padY } from './terrain'

export const MX: Mount = { origin: [P.sx[0], padY(PAD.sx), P.sx[1]], az: 0, w: 18, lift: 3.2 }
const AT = axes({ xr: [0, 12], yr: [0, 20], xStep: 2, yStep: 4, minor: [1, 2], xName: 't / min', yName: 's / km', w: 18, h: 10, font: 0.6 })
const AF = axes({ xr: [40, 120], yr: [0, 20], xStep: 20, yStep: 5, minor: [10, 2.5], xName: 'v / (km/h)', yName: 'Q / L', w: 18, h: 10, font: 0.6 })

/** topic：哪个专题；avg：画出割线；tc：切线滑到哪（t，min；null 表示还没有）；both：两处平行的切线都画出来；vc：耗油曲线上的切点（km/h） */
export default function SceneX({ topic, avg, tc, both, vc }: { topic: 'zone' | 'fuel'; avg: boolean; tc: number | null; both: number[]; vc: number | null }) {
  const W = (A: typeof AT, x: number, y: number) => dataWorld(MX, [0, 0], A, x, y)
  const labels: Label[] = []
  const k0 = ZONE.km / ZONE.min
  if (topic === 'zone') {
    labels.push({ id: 'n', at: [P.zone - 3, padY(PAD.sx) + 0.6, 8], name: true, className: 'scene-name', children: '区间测速 · 全长 20 km，限速 80 km/h' })
    if (avg) labels.push({ id: 'a', at: W(AT, 1.2, 18.6), style: tag(C.secant), className: 'scene-tag key -translate-y-1/2', children: <><small>平均速度</small>{fmt(zoneAvg())} km/h</> })
    if (tc !== null) labels.push({ id: 't', at: W(AT, 7.4, 4.2), style: tag(C.tangent), className: 'scene-tag -translate-y-1/2', children: <><small>t = {fmt(tc, 2)} min 时的速度</small>{fmt(tripSpeed(tc), 1)} km/h</> })
  } else if (vc !== null) {
    labels.push({ id: 'v', at: W(AF, 86, 18.2), style: tag(C.tangent), className: 'scene-tag -translate-y-1/2', children: <><small>v = {fmt(vc, 1)} km/h</small>Q = {fmt(fuel(vc), 2)} L</> })
  }
  return (
    <At at="sx" labels={labels}>
      <Sedan position={[P.zone + 14, 0, LANE]} color="#8a1f24" />
      <Mounted M={MX} h={10}>
        {topic === 'zone' ? (
          <Panel A={AT}>
            <Curve A={AT} f={trip} xr={[0, 12]} color={C.curve} width={0.13} />
            {avg && <><Line A={AT} k={k0} b={0} color={C.secant} width={0.08} opacity={0.6} /><Seg A={AT} p={[0, 0]} q={[12, 20]} color={C.secant} width={0.13} /><Dot A={AT} x={0} y={0} color={C.secant} /><Dot A={AT} x={12} y={20} color={C.secant} /></>}
            {both.map(t => <Line key={t} A={AT} k={k0} b={trip(t) - k0 * t} color={C.tangent} width={0.1} xr={[t - 2.5, t + 2.5]} />)}
            {both.map(t => <Dot key={`d${t}`} A={AT} x={t} y={trip(t)} color={C.tangent} />)}
            {tc !== null && <><Line A={AT} k={tripSpeed(tc) / 60} b={trip(tc) - (tripSpeed(tc) / 60) * tc} color={C.tangent} width={0.12} xr={[tc - 2.5, tc + 2.5]} /><Dot A={AT} x={tc} y={trip(tc)} color={C.dot} /></>}
          </Panel>
        ) : (
          <Panel A={AF}>
            <Curve A={AF} f={fuel} xr={[40, 120]} color={C.curve} width={0.13} />
            {vc !== null && <><Line A={AF} k={fuelD(vc)} b={fuel(vc) - fuelD(vc) * vc} color={C.tangent} width={0.12} xr={[vc - 18, vc + 18]} /><Dot A={AF} x={vc} y={fuel(vc)} color={C.dot} /></>}
          </Panel>
        )}
      </Mounted>
    </At>
  )
}
