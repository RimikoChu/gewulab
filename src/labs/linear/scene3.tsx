// 一次函数 · 第 3 课的器材：公路 A 段，中央分隔带上空立着坐标平面（横轴里程、纵轴油量），一辆小轿车在去程的快车道上开。
import type { Label } from '@/lab-kit'
import At from './at'
import { Sedan } from './car'
import { Milestone } from './equip'
import { AxesPlane, Dot, GlassFrame, Guides, Seg, at, type Axes } from './graph'
import { READ_X, TRIP_XS, fuelLeft } from './physics'
import { LANE, P } from './world'

export const A3: Axes = { xr: [0, 500], yr: [0, 50], xStep: 100, yStep: 10, minor: [50, 5], sx: 0.064, sy: 0.36, ox: 3.4, oy: 1.9, xName: '里程 x / km', yName: '油量 y / L', font: 1.0, w: 39.5, h: 22.6 }
const BASE = 0.9                       // 平面下沿离地多高
const X0 = P.plane3
/** 数据点 (x, y) 在世界里的位置 */
const W = (x: number, y: number, z = 0.1): [number, number, number] => { const p = at(A3, x, y, z); return [X0 + p[0], BASE + p[1], p[2]] }

export default function Scene3({ x, xs, line, read }: { x: number; xs: number[]; line: number; read: boolean }) {
  const carX = X0 + A3.ox + x * A3.sx
  const labels: Label[] = [
    { id: 'fuel', at: [carX, 0, LANE.fast + 2.6], ax: 0.5, className: 'scene-tag key translate-y-1', children: <><small>油量</small>{fuelLeft(x).toFixed(0)} L</> },
    { id: 'nCar', at: [carX, 1.9, LANE.fast], ax: 0.5, name: true, className: 'scene-name', children: '小轿车 · 满箱 50 L' },
    { id: 'nMs', at: [X0 + A3.ox + 100 * A3.sx, 0.2, 1.3], ax: 0.5, name: true, className: 'scene-name', children: '里程碑' },
    ...(read ? [{ id: 'read', at: W(READ_X, fuelLeft(READ_X), 0.2), ax: 0, className: 'scene-tag key translate-x-3 -translate-y-full', children: <><small>250 km</small>剩 {fuelLeft(READ_X)} L</> }] : []),
  ]
  const end = line * 500
  return (
    <At at="plane3" labels={labels}>
      <group position={[X0, BASE, 0]}>
        <GlassFrame A={A3} base={BASE} />
        <AxesPlane A={A3}>
          {line > 0 && <Seg A={A3} p={[0, fuelLeft(0)]} q={[end, fuelLeft(end)]} color="#5fd8ff" width={0.16} />}
          {xs.map(v => <Dot key={v} A={A3} x={v} y={fuelLeft(v)} r={0.32} />)}
          {read && <><Guides A={A3} x={READ_X} y={fuelLeft(READ_X)} /><Dot A={A3} x={READ_X} y={fuelLeft(READ_X)} color="#ff8a5c" r={0.3} /></>}
        </AxesPlane>
      </group>
      {TRIP_XS.map(km => <Milestone key={km} km={km} position={[X0 + A3.ox + km * A3.sx, 0, 1.05]} />)}
      <Sedan position={[carX, 0, LANE.fast]} color="#2f6fb5" />
    </At>
  )
}
