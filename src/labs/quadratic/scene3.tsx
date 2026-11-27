// 二次函数 · 第 3 课的三维场景：沿江的音乐喷泉水槽。喷头装在池底导轨上的小车里，小车往右走、水压加大，水柱跟着平移。
// 坐标平面立在水槽正中，原点在水面上方 3 m；水面就是 y = −3。
import type { Label } from '@/lab-kit'
import { Metal } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { AxesPlane, Curve, Dash, Dot, type Axes } from './graph'
import { FLOOR3, fmt, landX, vformText } from './physics'
import { Jet } from './water'
import { P, TROUGH } from './world'

type V3 = [number, number, number]
export const O3: V3 = [P.trough[0], TROUGH.water - FLOOR3, P.trough[2]]
const W = (p: V3) => toWorld(O3, 0, p)
const A: Axes = { xr: [-3, 5], yr: [-3.2, 2], xStep: 1, yStep: 1, sx: 1, sy: 1, minor: [0.5, 0.5], xName: 'x / m', yName: 'y / m', font: 0.2, pad: 0.35 }

/** 喷头小车：不锈钢车架、四个小轮、中间朝上的喷嘴 */
function Cart() {
  return (
    <group>
      <mesh position-y={0.06}><boxGeometry args={[0.5, 0.08, 0.9]} /><Metal kind="stainless" grain="brushed" /></mesh>
      {[-0.18, 0.18].flatMap(x => [-0.35, 0.35].map(z => <mesh key={`${x}${z}`} position={[x, 0.01, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 0.04, 16]} /><meshStandardMaterial color="#2b2f33" roughness={0.6} /></mesh>))}
      <mesh position-y={0.17}><cylinderGeometry args={[0.05, 0.08, 0.16, 20]} /><Metal kind="brass" grain="turned" /></mesh>
    </group>
  )
}

export default function Scene3({ a, h, k, axis }: { a: number; h: number; k: number; axis: boolean }) {
  const L = landX(a, h, k, FLOOR3)
  const labels: Label[] = [
    { id: 'v', at: W([h + 0.12, k + 0.15, 0.1]), className: 'scene-tag key -translate-y-full', children: <><small>顶点</small>({fmt(h, 1)}, {fmt(k, 1)})</> },
    { id: 'f', at: W([h - 1.45, Math.max(-2.8, k + a * 2.1), 0.1]), ax: 1.05, className: 'scene-tag -translate-y-1/2', children: <span className="font-formula italic">{vformText(Math.round(a * 100) / 100, Math.round(h * 100) / 100, Math.round(k * 100) / 100)}</span> },
    ...(axis ? [{ id: 'ax', at: W([h + 0.1, -2.5, 0.1]), className: 'scene-tag -translate-y-1/2', children: <><small>对称轴</small>x = {fmt(h, 1)}</> } satisfies Label] : []),
    { id: 'n', at: W([L ? L[0] : -2, FLOOR3 - 0.2, 0.6]), ax: 0.5, name: true, className: 'scene-name', children: '喷头小车' },
  ]
  return (
    <At at="trough" labels={labels}>
      <Local origin={O3} az={0}>
        <Jet a={a} h={h} k={k} floor={FLOOR3} n={340} thick={1.6} seed={4} />
        {L && <group position={[L[0], FLOOR3 - TROUGH.water + 0.03, 0]}><Cart /></group>}
        <group position-z={0.05}>
          <AxesPlane A={A} frame={false}>
            <Curve A={A} f={x => -x * x} xr={[-3, 5]} color="#9fd8ff" width={0.035} opacity={0.55} />
            <Curve A={A} f={x => a * (x - h) ** 2 + k} xr={[-3, 5]} color="#ffd25a" width={0.04} opacity={0.9} />
            {axis && <Dash A={A} p={[h, -3.2]} q={[h, 2]} color="#ff9f7a" width={0.03} gap={0.18} />}
            <Dot A={A} x={h} y={k} color="#ff7a59" r={0.09} />
          </AxesPlane>
        </group>
      </Local>
    </At>
  )
}
