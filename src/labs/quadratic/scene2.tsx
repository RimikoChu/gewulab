// 二次函数 · 第 2 课的三维场景：喷泉池中间四道交叉的水柱，池上立一块坐标平面，原点就在水柱的最高点。
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { AxesPlane, Curve, Dash, Dot, type Axes } from './graph'
import { fmt, JET_TOP, landX } from './physics'
import { Jet } from './water'
import { BASIN, P, SPOT } from './world'

type V3 = [number, number, number]
const AZ = SPOT.basin.view[0]
export const O2: V3 = [P.basin[0], BASIN.water + JET_TOP, P.basin[2]]
const A: Axes = { xr: [-3, 3], yr: [-3.2, 2], xStep: 1, yStep: 1, sx: 1, sy: 1, minor: [0.5, 0.5], xName: 'x / m', yName: 'y / m', font: 0.2, pad: 0.35 }
const W = (p: V3) => toWorld(O2, AZ, p)

/** a：画在平面上的抛物线（过渡中）；jet：水柱用的 a（始终小于 0）；dots：描的点 */
export default function Scene2({ a, jet, dots, ghost }: { a: number; jet: number; dots: [number, number][]; ghost: boolean }) {
  const L = landX(jet, 0, 0, -JET_TOP)
  const labels: Label[] = [
    { id: 'v', at: W([0.12, 0.12, 0.1]), className: 'scene-tag key -translate-y-full', children: <><small>顶点</small>(0, 0)</> },
    { id: 'f', at: W([a > 0 ? -1.25 : -1.45, a > 0 ? Math.min(1.8, a * 1.56) : Math.max(-2.9, a * 2.1), 0.1]), ax: 1.08, className: 'scene-tag -translate-y-1/2', children: <span className="font-formula italic">y = {fmt(a) === '1' ? '' : fmt(a) === '−1' ? '−' : fmt(a)}x²</span> },
    ...(L ? [{ id: 'l', at: W([L[1], -JET_TOP + 0.05, 0.2]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>落点</small>x = ±{fmt(L[1])} m</> } satisfies Label] : []),
    { id: 'n', at: W([-2.9, -JET_TOP + 0.3, 1.2]), name: true, className: 'scene-name -translate-y-1/2', children: '喷泉池 · 水面在 y = −3' },
  ]
  return (
    <At at="basin" labels={labels}>
      <Local origin={O2} az={AZ}>
        {/* 四道水柱：一道在坐标平面里，另外三道转开 45° 一道，在池中间交叉成一个穹顶 */}
        {[0, 1, 2, 3].map(k => <group key={k} rotation-y={k * Math.PI / 4}><Jet a={jet} h={0} k={0} floor={-JET_TOP} n={k ? 180 : 360} seed={k + 1} thick={k ? 1.2 : 1.7} /></group>)}
        <group position-z={0.05}>
          <AxesPlane A={A} frame={false}>
            {ghost && <Curve A={A} f={x => -x * x} xr={[-3, 3]} color="#9fd8ff" width={0.05} opacity={0.65} />}
            <Curve A={A} f={x => a * x * x} xr={[-3, 3]} color="#ffd25a" width={0.04} opacity={0.9} />
            <Dot A={A} x={0} y={0} color="#ff7a59" r={0.09} />
            {dots.map(([x, y], i) => <Dot key={i} A={A} x={x} y={y} r={0.075} />)}
            {L && <Dash A={A} p={[L[1], -JET_TOP]} q={[L[1], 0]} width={0.025} gap={0.16} opacity={0.6} />}
          </AxesPlane>
        </group>
      </Local>
    </At>
  )
}
