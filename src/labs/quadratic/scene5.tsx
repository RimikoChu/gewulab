// 二次函数 · 第 5 课的三维场景：江心高喷。坐标平面立在水柱旁边，纵轴就是水柱本身（高度 h），横轴是时间 t。
// 一颗橙色的“记号水滴”沿水柱升降，平面上的点同时沿 h = 20t − 5t² 走：这条抛物线不是水柱的形状，是高度随时间的变化。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { AxesPlane, Bar, Curve, Dash, Dot, at, type Axes } from './graph'
import { fmt, heightAt, timesAt } from './physics'
import { P, RIVER } from './world'

type V3 = [number, number, number]
export const O5: V3 = [P.high[0], RIVER.level, P.high[2]]
const W = (p: V3) => toWorld(O5, 0, p)
const A: Axes = { xr: [0, 4.4], yr: [0, 26], xStep: 1, yStep: 5, sx: 3, sy: 1, minor: [0.5, 1], xName: 't / s', yName: 'h / m', font: 0.85, pad: 0.9, padL: 2.4, tint: 'rgba(10,22,30,0.8)' }

/** 记号水滴和它在图上的点：一起按真实的时间走，4 秒一个来回 */
function Tracer() {
  const drop = useRef<THREE.Mesh>(null), dot = useRef<THREE.Group>(null), line = useRef<THREE.Mesh>(null), T = useRef(0)
  useFrame((_, dt) => {
    T.current = (T.current + Math.min(dt, 1 / 30)) % 4.6
    const t = Math.min(4, T.current), h = Math.max(0, heightAt(t))
    drop.current?.position.set(0, h, 3.3)
    dot.current?.position.set(...at(A, t, h, 3.28))
    if (line.current) { line.current.position.set(t * A.sx / 2, h, 3.26); line.current.scale.set(Math.max(0.01, t * A.sx), 1, 1) }
  })
  return (
    <group>
      <mesh ref={drop} renderOrder={9}><sphereGeometry args={[0.32, 24, 16]} /><meshStandardMaterial color="#ff8a3d" emissive="#ff6a1a" emissiveIntensity={0.9} toneMapped={false} /></mesh>
      <mesh ref={line} renderOrder={6}><planeGeometry args={[1, 0.06]} /><meshBasicMaterial color="#ffb27a" toneMapped={false} depthTest={false} transparent opacity={0.8} /></mesh>
      <group ref={dot}>
        <mesh renderOrder={8}><circleGeometry args={[0.36, 28]} /><meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} /></mesh>
        <mesh position-z={0.01} renderOrder={9}><circleGeometry args={[0.26, 28]} /><meshBasicMaterial color="#ff8a3d" toneMapped={false} depthTest={false} /></mesh>
      </group>
    </group>
  )
}

/** m：问的高度；solved：解过方程了，标出交点 */
export default function Scene5({ m, solved }: { m: number; solved: boolean }) {
  const ts = timesAt(m)
  const labels: Label[] = [
    { id: 'f', at: W([3.6 * A.sx, heightAt(3.6) + 0.6, 0.1]), className: 'scene-tag -translate-y-full', children: <span className="font-formula italic">h = 20t − 5t²</span> },
    { id: 'm', at: W([4.4 * A.sx + 0.4, m, 0.1]), className: 'scene-tag key -translate-y-1/2', children: <><small>高度</small>{m} m</> },
    ...(solved ? (ts.length ? ts.map((t, i) => ({ id: `t${i}`, at: W([t * A.sx, m - 0.6, 0.1]), ax: 0.5, className: 'scene-tag', children: <>t = {fmt(t)} s</> } satisfies Label)) : [{ id: 'no', at: W([2 * A.sx, m + 0.7, 0.1]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <>到不了：没有交点</> } satisfies Label]) : []),
    { id: 'n', at: W([-1.2, 3, 2]), ax: 1, name: true, className: 'scene-name', children: '江心高喷' },
  ]
  return (
    <At at="high" labels={labels}>
      <Local origin={O5} az={0}>
        <Tracer />
        <group position-z={3.2}>
          <AxesPlane A={A} frame={false} front>
            <Curve A={A} f={heightAt} xr={[0, 4]} color="#ffd25a" width={0.14} />
            <Bar A={A} p={[0, m]} q={[4.4, m]} color="#7fe3d4" width={0.12} opacity={0.9} />
            {solved && ts.map(t => <group key={t}><Dot A={A} x={t} y={m} r={0.3} color="#7fe3d4" /><Dash A={A} p={[t, 0]} q={[t, m]} width={0.08} gap={0.6} /></group>)}
          </AxesPlane>
        </group>
      </Local>
    </At>
  )
}
