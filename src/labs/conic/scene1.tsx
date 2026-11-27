// 圆锥曲线 · 第 1 课的三维场景：一个方框形的光幕架套在圆锥模型外面，框里是一片薄薄的光。光幕沿着自己的法线方向推进去，
// 圆锥被照亮的那一圈就是截口。圆锥模型本身在 world.tsx 里。
import { useMemo } from 'react'
import { Metal, type Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { strut } from './geo'
import { COL, Fill, Path } from './graph'
import { CONE, CUTS, sectionCurve, type CutKey } from './physics'
import { F } from './world'

const HALF = 1.08
/** beta、y0、z0：光幕现在的方向和位置（过渡中）；off：光幕沿法线退出去多远（m）；shown：已经切到位、该标名字的那一种 */
export default function Scene1({ beta, y0, z0, off, shown }: { beta: number; y0: number; z0: number; off: number; shown: CutKey | null }) {
  const th = (90 - beta) * Math.PI / 180, n: [number, number] = [Math.cos(th), Math.sin(th)]   // 法线的 y、z 分量
  const py = y0 + n[0] * off, pz = z0 + n[1] * off
  const cuts = sectionCurve(beta, py, pz)
  // 光幕平面里的点 (s, t) 在圆锥局部坐标里的位置
  const on = (s: number, t: number, lift = 0): [number, number, number] => [s, py + t * Math.sin(th) + lift * n[0], pz - t * Math.cos(th) + lift * n[1]]
  const edge = on(HALF + 0.03, 0), slider = Math.min(1.9, Math.max(-1.3, edge[1]))
  const arm = useMemo(() => strut([1.62, slider, 0], edge, 0.022, 8), [slider, edge[1], edge[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  const top = cuts[0]?.pts.reduce((m, p) => (p[1] > m[1] ? p : m), cuts[0].pts[0])
  const labels: Label[] = [
    ...(shown && top ? [{ id: 'k', at: toWorld(F.cone, ...on(top[0] + 0.1, top[1], 0.02)), className: 'scene-tag key -translate-y-full', children: <><small>截口</small>{CUTS[shown].name}</> } satisfies Label] : []),
    { id: 'b', at: toWorld(F.cone, ...on(HALF * 0.25, -HALF)), className: 'scene-tag', children: <><small>光幕和轴的夹角</small>β = {Math.round(beta)}°</> },
    { id: 'a', at: toWorld(F.cone, -0.5, -0.82, 0.3), ax: 1.05, className: 'scene-tag -translate-y-1/2', children: <><small>母线和轴的夹角</small>α = {CONE.alpha}°</> },
    { id: 'n1', at: toWorld(F.cone, -0.75, -CONE.H - 0.15, 0.5), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '圆锥模型（两个对顶的圆锥）' },
    { id: 'n2', at: toWorld(F.cone, ...on(-HALF, HALF * 0.6)), ax: 1.05, name: true, className: 'scene-name -translate-y-1/2', children: '光幕：一个平面' },
  ]
  return (
    <At at="cone" labels={labels} bloom={0.25}>
      <Local f={F.cone}>
        {/* 后面的立柱和滑块，一根细杆托着光幕架 */}
        <mesh position={[1.62, -0.2, 0]} castShadow><cylinderGeometry args={[0.035, 0.035, 4.3, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>
        <mesh position={[1.62, -2.2, 0]} castShadow><cylinderGeometry args={[0.22, 0.26, 0.08, 32]} /><Metal kind="iron" grain="cast" /></mesh>
        <mesh position={[1.62, slider, 0]} castShadow><boxGeometry args={[0.12, 0.14, 0.12]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh geometry={arm} castShadow><Metal kind="aluminum" grain="brushed" /></mesh>
        <group position={[0, py, pz]} rotation-x={th - Math.PI / 2}>
          {/* 光幕架：四条铝边 */}
          {[-1, 1].map(s => <mesh key={`h${s}`} position={[0, s * HALF, 0]} castShadow><boxGeometry args={[HALF * 2 + 0.05, 0.05, 0.035]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
          {[-1, 1].map(s => <mesh key={`v${s}`} position={[s * HALF, 0, 0]} castShadow><boxGeometry args={[0.05, HALF * 2 - 0.05, 0.035]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
          <mesh renderOrder={4}><planeGeometry args={[HALF * 2 - 0.05, HALF * 2 - 0.05]} /><meshBasicMaterial color="#58d8cc" transparent opacity={0.1} depthWrite={false} side={2} toneMapped={false} /></mesh>
          {cuts.map((c, i) => <group key={i}>
            <Fill pts={c.pts} color={COL.curve} opacity={0.22} z={0.002} />
            <Path pts={c.pts} closed={c.closed} color={COL.curve} width={0.026} z={0.004} />
          </group>)}
        </group>
      </Local>
    </At>
  )
}
