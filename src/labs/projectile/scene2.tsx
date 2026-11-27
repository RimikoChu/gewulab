// 抛体运动 · 第 2 课的三维场景：一条冲锋舟从南岸开到北岸。河宽 30 m，水往东流（画面的右边）。
// 船上方平放着三支箭头：水流的速度（青）、船在静水里的速度（橙红，沿船头）、两个合成的合速度（黄，船实际走的方向）。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ForceArrow, type Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { C, Dashed, Trail, type V3 } from './fx'
import { boatAt, cross, fmt, HEADS, rad, RIVER, type HeadKey } from './physics'
import { Boat } from './props'
import { P } from './world'

const W = (p: V3) => toWorld(P.ferry, 0, p)
/** 河面上的坐标 (顺水 x, 离南岸 y) 换成局部三维坐标 */
const L = (x: number, y: number, h = 0): V3 => [x, h, -y]
const K = 1.7, UP = 1.9   // 每 1 m/s 画 1.7 m；箭头离水面的高度

/** 岸边的一根标志杆：红白相间 */
function Pole({ at, h = 2.6, flag }: { at: V3; h?: number; flag?: string }) {
  return <group position={at}>
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} position-y={(i + 0.5) * h / 5} castShadow><cylinderGeometry args={[0.07, 0.07, h / 5, 12]} /><meshStandardMaterial color={i % 2 ? '#f1efe6' : '#d0271d'} roughness={0.6} /></mesh>)}
    {flag && <mesh position={[0.55, h - 0.35, 0]}><boxGeometry args={[1.1, 0.7, 0.03]} /><meshStandardMaterial color={flag} roughness={0.7} /></mesh>}
  </group>
}

/** 船在水上轻轻起伏 */
function Bob({ children }: { children: React.ReactNode }) {
  const boat = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (boat.current) { boat.current.position.y = Math.sin(clock.elapsedTime * 2.1) * 0.04; boat.current.rotation.x = Math.sin(clock.elapsedTime * 1.7) * 0.03 } })
  return <group ref={boat}>{children}</group>
}

export default function Scene2({ head, t, done, kept }: { head: HeadKey; t: number | null; done: boolean; kept: HeadKey[] }) {
  const ang = HEADS[head].angle, c = cross(ang)
  const [bx, by] = boatAt(ang, t ?? 0)
  const vb: [number, number] = [-RIVER.vBoat * Math.sin(rad(ang)), RIVER.vBoat * Math.cos(rad(ang))]   // 船在静水里的速度
  const o = L(bx, by, UP)
  const arrow = (vx: number, vy: number, color: string, thick = 3.4) => { const v = Math.hypot(vx, vy); return v < 1e-6 ? null : <ForceArrow tip={[o[0] + vx * K, UP, o[2] - vy * K]} dir={[vx / v, 0, -vy / v]} len={v * K} color={color} thick={thick} /> }
  const end = (k: HeadKey) => L(cross(HEADS[k].angle).drift, RIVER.width, 0.25)
  const labels: Label[] = [
    { id: 'w', at: W(L(-1.2, RIVER.width * 0.62, 0.5)), ax: 1, className: 'scene-tag -translate-y-full', children: <><small>河宽</small>{RIVER.width} m</> },
    { id: 'flow', at: W(L(-8, 4.5, 1.2)), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>水流</small>{RIVER.vWater} m/s</> },
    { id: 'tar', at: W(L(0, RIVER.width + 1.6, 3.4)), ax: 0.5, className: 'scene-tag -translate-y-full', children: '正对岸' },
    ...kept.map(k => ({ id: `e${k}`, at: W(L(cross(HEADS[k].angle).drift + (k === 'up' ? -1.5 : 1.5), RIVER.width - 2.5, 0.4)), ax: k === 'up' ? 1 : 0, className: 'scene-tag key', children: k === 'up' ? <><small>{fmt(cross(HEADS[k].angle).time, 1)} s</small>正对岸靠岸</> : <><small>{fmt(cross(HEADS[k].angle).time, 1)} s</small>下漂 {fmt(cross(HEADS[k].angle).drift, 0)} m</> } satisfies Label)),
    { id: 'n', at: W(L(bx, by - 2.6, 0.6)), ax: 0.5, name: true, className: 'scene-name', children: '冲锋舟' },
  ]
  return (
    <At at="ferry" labels={labels}>
      <Local origin={P.ferry}>
        {/* 两岸的标志杆：出发点、正对岸的靶旗、下游每 6 m 一根 */}
        <Pole at={L(-3, -1.6, 0.6)} flag="#e8651c" />
        <Pole at={L(0, RIVER.width + 1.2, 0.6)} h={3.2} flag="#ffd25a" />
        {[6, 12, 18].map(x => <Pole key={x} at={L(x, RIVER.width + 1.2, 0.6)} h={1.8} />)}
        {/* 正对岸的连线（最短的过河路线） */}
        <Dashed a={L(0, 0, 0.2)} b={L(0, RIVER.width, 0.2)} w={2} dash={0.8} opacity={0.6} />
        {/* 水流：水面上三支往下游的青色箭头 */}
        {[5, 15, 25].map(y => <ForceArrow key={y} tip={L(-6, y, 0.3)} dir={[1, 0, 0]} len={RIVER.vWater * K} color={C.vx} thick={2.4} opacity={0.75} />)}
        {/* 走过的航线 */}
        {kept.filter(k => k !== head || done).map(k => <Trail key={k} pts={[L(0, 0, 0.25), end(k)]} r={0.1} opacity={k === head ? 0.9 : 0.45} />)}
        {t !== null && !done && <Trail pts={[L(0, 0, 0.25), L(bx, by, 0.25)]} r={0.1} />}
        {/* 冲锋舟 */}
        <group position={L(bx, by)} rotation-y={Math.PI / 2 + rad(ang)}><Bob><Boat /></Bob></group>
        {/* 速度的合成：水速 + 船速 = 合速度 */}
        {!done && <group>
          {arrow(RIVER.vWater, 0, C.vx)}{arrow(vb[0], vb[1], C.vy)}{arrow(c.along, c.across, C.v, 4)}
          <Dashed a={[o[0] + RIVER.vWater * K, UP, o[2]]} b={[o[0] + c.along * K, UP, o[2] - c.across * K]} color={C.vy} dash={0.5} />
          <Dashed a={[o[0] + vb[0] * K, UP, o[2] - vb[1] * K]} b={[o[0] + c.along * K, UP, o[2] - c.across * K]} color={C.vx} dash={0.5} />
        </group>}
      </Local>
    </At>
  )
}
