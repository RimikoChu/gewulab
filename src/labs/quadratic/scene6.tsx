// 二次函数 · 第 6 课的三维场景：河上的抛物线拱桥，镜头在下游的水面上看桥的侧面。
// 坐标平面贴在桥的这一面，原点在拱顶（桥拱内侧最高点）；江水涨落时，水面线跟着动。一条游船从下游开过来过桥。
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { AxesPlane, Bar, Curve, Dash, Dot, type Axes } from './graph'
import { archA, ARCH, BOAT, fmt, waterWidth } from './physics'
import { Boat } from './park'
import { BRIDGE, P } from './world'

type V3 = [number, number, number]
const AZ = Math.PI / 2
export const O6: V3 = [P.bridge[0], BRIDGE.top, P.bridge[2]]
const W = (p: V3) => toWorld(O6, AZ, p)
const A: Axes = { xr: [-8, 8], yr: [-5.5, 1.5], xStep: 2, yStep: 1, sx: 1, sy: 1, minor: [1, 0.5], xName: 'x / m', yName: 'y / m', font: 0.36, pad: 0.5, tint: 'rgba(12,26,36,0.48)' }
const FACE = BRIDGE.w / 2 + 0.2
const a = archA(ARCH.width, ARCH.rise)

/** depth：水面在拱顶下多深（过渡中）；fit：解析式求出来了；boat：船的位置 [x, z]；blocked：船过不去 */
export default function Scene6({ depth, fit, boat, blocked, showBoat }: { depth: number; fit: boolean; boat: [number, number]; blocked: boolean; showBoat: boolean }) {
  const half = waterWidth(a, depth) / 2, edge = BOAT.w / 2, archAt = a * edge * edge, top = -depth + BOAT.h
  const labels: Label[] = [
    { id: 'w', at: W([0, -depth - 0.35, FACE]), ax: 0.5, className: 'scene-tag key', children: <><small>水面宽</small>{fmt(half * 2)} m</> },
    { id: 'd', at: W([0.25, -depth / 2, FACE]), className: 'scene-tag -translate-y-1/2', children: <><small>拱顶离水面</small>{fmt(depth)} m</> },
    ...(fit ? [{ id: 'f', at: W([-6.9, a * 6.9 * 6.9 + 0.3, FACE]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <span className="font-formula italic">y = −x²/9</span> } satisfies Label] : [{ id: 'p', at: W([6.2, -4.2, FACE]), className: 'scene-tag -translate-y-full', children: <>(6, −4)</> } satisfies Label]),
    ...(showBoat && Math.abs(boat[0]) < 0.3 ? [{ id: 'c', at: W([edge + 0.2, (top + archAt) / 2 + 0.3, FACE]), className: `scene-tag -translate-y-1/2${blocked ? '' : ' key'}`, children: <><small>船边上方</small>{fmt(archAt + depth)} m{blocked ? ' · 过不去' : ''}</> } satisfies Label] : []),
    { id: 'n', at: W([-9.6, 1.6, FACE]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '抛物线拱桥' },
    ...(showBoat ? [{ id: 'nb', at: W([boat[0], -depth + BOAT.h + 0.3, boat[1]]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '游船 · 宽 6 m，露出水面 2.5 m' } satisfies Label] : []),
  ]
  return (
    <At at="bridge" labels={labels} world={{ level: ARCH.rise - depth }}>
      <Local origin={O6} az={AZ}>
        {showBoat && <group position={[boat[0], -depth, boat[1]]} rotation-y={-Math.PI / 2}><Boat /></group>}
        <group position-z={FACE}>
          <AxesPlane A={A} frame={false}>
            {fit ? <Curve A={A} f={x => a * x * x} xr={[-8, 8]} color="#ffd25a" width={0.08} /> : <><Dot A={A} x={-6} y={-4} r={0.16} /><Dot A={A} x={6} y={-4} r={0.16} /></>}
            <Dot A={A} x={0} y={0} r={0.16} color="#ff7a59" />
            <Bar A={A} p={[-half, -depth]} q={[half, -depth]} color="#7fe3d4" width={0.1} />
            <Dash A={A} p={[0, -depth]} q={[0, 0]} width={0.05} gap={0.3} />
            {showBoat && Math.abs(boat[0]) < 0.3 && <>
              <Dash A={A} p={[edge, top]} q={[edge, archAt]} color={blocked ? '#ff7a7a' : '#7fe3d4'} width={0.06} gap={0.25} />
              <Bar A={A} p={[-edge, top]} q={[edge, top]} color={blocked ? '#ff7a7a' : '#ffffff'} width={0.05} opacity={0.8} />
            </>}
          </AxesPlane>
        </group>
      </Local>
    </At>
  )
}
