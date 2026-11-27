// 一次函数 · 第 7 课的器材：公路 C 段。一车货要运走，坐标平面横轴是运距（0–250 km），纵轴是运费（0–1800 元）；两家公司的报价是两条直线。
import type { Label } from '@/lab-kit'
import At from './at'
import { Truck } from './car'
import { Dot, FnLine, Guides } from './graph'
import { PLAN, formula, planA, planB } from './physics'
import { RoadPlane, roadPoint, roadX, type Road } from './roadgraph'
import { LANE, P } from './world'

export const R7: Road = { A: { xr: [0, 250], yr: [0, 1800], xStep: 50, yStep: 300, minor: [25, 150], sx: 0.144, sy: 0.01, ox: 3.8, oy: 1.9, xName: '运距 x / km', yName: '运费 y / 元', font: 0.9, w: 43.6, h: 22.4 }, X0: P.plane7, base: 3.6 }
export const COL = { a: '#ffb347', b: '#5fd8ff' }
/** x：货车开到了哪；line：两条直线画出来的程度；at：停在哪个运距（读两家报价）；same：是不是一样贵的那一处 */
export default function Scene7({ x, line, at }: { x: number; line: number; at: number | null }) {
  const tx = roadX(R7, x)
  const end = 250 * line
  const lab = (id: 'a' | 'b', v: number): Label => ({ id: `l${id}`, at: roadPoint(R7, v, id === 'a' ? planA(v) : planB(v)), ax: id === 'a' ? 1 : 0, className: `scene-tag ${id === 'a' ? '-translate-y-full -translate-x-1' : 'translate-y-2 translate-x-2'}`, children: <><small style={{ color: COL[id] }}>{PLAN[id].name}</small>{formula(PLAN[id].k, PLAN[id].b)}</> })
  const labels: Label[] = [
    ...(line >= 1 ? [lab('a', 28), lab('b', 28)] : []),
    ...(at !== null ? [
      { id: 'ra', at: roadPoint(R7, at, planA(at)), ax: 1, className: `scene-tag -translate-x-3 ${planA(at) >= planB(at) ? '-translate-y-full' : ''}`, children: <><small style={{ color: COL.a }}>甲</small>{planA(at)} 元</> },
      { id: 'rb', at: roadPoint(R7, at, planB(at)), ax: 0, className: `scene-tag translate-x-3 ${planB(at) > planA(at) ? '-translate-y-full' : ''}`, children: <><small style={{ color: COL.b }}>乙</small>{planB(at)} 元</> },
    ] : []),
    { id: 'nT', at: [tx - 2, 0.6, LANE.fast + 1.9], ax: 0.5, name: true, className: 'scene-name', children: '货车 · 一车货' },
  ]
  return (
    <At at="plane7" labels={labels}>
      <RoadPlane R={R7} posts={[0, 60, 100, 200]}>
        {line > 0 && <>
          <FnLine A={R7.A} k={PLAN.a.k} b={PLAN.a.b} color={COL.a} width={0.16} xr={[0, end]} />
          <FnLine A={R7.A} k={PLAN.b.k} b={PLAN.b.b} color={COL.b} width={0.16} xr={[0, end]} />
        </>}
        {at !== null && <>
          <Guides A={R7.A} x={at} y={Math.max(planA(at), planB(at))} both={false} />
          <Dot A={R7.A} x={at} y={planA(at)} color={COL.a} r={0.34} />
          <Dot A={R7.A} x={at} y={planB(at)} color={COL.b} r={0.34} />
        </>}
      </RoadPlane>
      <Truck position={[tx, 0, LANE.fast]} cab="#c2452f" />
    </At>
  )
}
