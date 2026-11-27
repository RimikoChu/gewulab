// 一次函数 · 第 6 课的器材：公路 B 段。一辆货车，头顶的坐标平面横轴是里程（0–1000 km），纵轴是油箱里的柴油（0–300 L）；800 km 处有一座加油站的指示牌。
import { RoundedBox } from '@react-three/drei'
import type { Label } from '@/lab-kit'
import At from './at'
import { Truck } from './car'
import { Dot, Guides, Seg } from './graph'
import { makeSign } from './mats'
import { STATION, lin, truckFuel } from './physics'
import { RoadPlane, roadPoint, roadX, type Road } from './roadgraph'
import { LANE, P } from './world'

export const R6: Road = { A: { xr: [0, 1000], yr: [0, 300], xStep: 100, yStep: 50, minor: [50, 25], sx: 0.036, sy: 0.06, ox: 3.6, oy: 1.9, xName: '里程 x / km', yName: '油量 y / L', font: 0.9, w: 43.4, h: 22.4 }, X0: P.plane6, base: 3.6 }
/** x：货车开到了哪；pts：记下的点；line：直线画出来的程度（0–1）；kb：求出的 k、b；pred：算没算 800 km */
export default function Scene6({ x, pts, line, kb, pred }: { x: number; pts: number[]; line: number; kb: { k: number; b: number } | null; pred: boolean }) {
  const tx = roadX(R6, x)
  const sign = makeSign('加油站 800 km', { w: 512, h: 128, bg: '#1f5fa8', fg: '#ffffff', size: 0.5, border: '#ffffff' })
  const labels: Label[] = [
    { id: 'fuel', at: [tx, 0, LANE.fast + 2.6], ax: 0.5, className: 'scene-tag key translate-y-1', children: <><small>油量</small>{truckFuel(x).toFixed(0)} L</> },
    ...pts.map(p => ({ id: `p${p}`, at: roadPoint(R6, p, truckFuel(p)), ax: 0, className: 'scene-tag translate-x-3 -translate-y-full', children: `(${p}, ${truckFuel(p)})` })),
    ...(pred && kb ? [{ id: 'pred', at: roadPoint(R6, STATION, lin(kb.k, kb.b, STATION)), ax: 0, className: 'scene-tag key translate-x-3 -translate-y-full', children: <><small>800 km</small>剩 {lin(kb.k, kb.b, STATION)} L</> }] : []),
    { id: 'nT', at: [tx, 4.3, LANE.fast], ax: 0.5, name: true, className: 'scene-name', children: '货车 · 满箱 300 L' },
  ]
  // 直线从两个点的中间往两头长出来
  const mid = 200, half = line * 800
  const a = Math.max(0, mid - half), b = Math.min(1000, mid + half)
  return (
    <At at="plane6" labels={labels}>
      <RoadPlane R={R6} posts={[0, 100, 300]}>
        {kb && line > 0 && <Seg A={R6.A} p={[a, lin(kb.k, kb.b, a)]} q={[b, lin(kb.k, kb.b, b)]} color="#5fd8ff" width={0.16} />}
        {pts.map(p => <Dot key={p} A={R6.A} x={p} y={truckFuel(p)} r={0.36} />)}
        {pred && kb && <><Guides A={R6.A} x={STATION} y={lin(kb.k, kb.b, STATION)} /><Dot A={R6.A} x={STATION} y={lin(kb.k, kb.b, STATION)} color="#ff8a5c" r={0.34} /></>}
      </RoadPlane>
      {/* 800 km 处的加油站指示牌 */}
      <group position={[roadX(R6, STATION), 0, 11.6]}>
        {[-1.3, 1.3].map(d => <mesh key={d} position={[d, 1.6, 0]} castShadow><cylinderGeometry args={[0.07, 0.07, 3.2, 12]} /><meshStandardMaterial color="#9aa0a4" metalness={0.6} roughness={0.4} /></mesh>)}
        <RoundedBox args={[3.4, 0.9, 0.08]} radius={0.04} position={[0, 2.9, 0]} castShadow><meshStandardMaterial color="#1f5fa8" roughness={0.5} /></RoundedBox>
        <mesh position={[0, 2.9, 0.045]}><planeGeometry args={[3.3, 0.82]} /><meshStandardMaterial map={sign} roughness={0.5} /></mesh>
      </group>
      <Truck position={[tx, 0, LANE.fast]} />
    </At>
  )
}
