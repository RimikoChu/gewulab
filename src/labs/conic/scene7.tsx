// 圆锥曲线 · 第 7 课的三维场景：天象厅朝镜头打开一半，里面斜放着一块深色的轨道盘。盘上画着一个天体绕太阳的椭圆轨道，
// 太阳在一个焦点上，另一个焦点是空的。每条轨道都把长半轴画成一样长（3.3 m），只比形状。
import { useMemo } from 'react'
import { Metal, disc, type Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { COL, Dot, Path, Seg } from './graph'
import { strut } from './geo'
import { ORBITS, aphelion, fmt, orbitAt, perihelion, type OrbitKey, type P2 } from './physics'
import { F } from './world'

const S = 3.3, RD = 4.4
const BODY: Record<OrbitKey, { color: string; r: number }> = { earth: { color: '#4f8fe8', r: 0.17 }, mars: { color: '#d8623a', r: 0.14 }, halley: { color: '#dff3ff', r: 0.11 } }
/** key：哪个天体；e：离心率（过渡中）；t：这一圈走了多少（0–1，从近日点起，按时间均匀） */
export default function Scene7({ k, e, t, moving }: { k: OrbitKey; e: number; t: number; moving: boolean }) {
  const g = useMemo(() => ({ plate: disc(RD, 0.1, { chamfer: 0.03, segs: 96 }), rim: disc(RD + 0.08, 0.14, { hole: RD - 0.02, chamfer: 0.02, segs: 96 }), post: strut([0, -0.3, -0.2], [0, -2.9, -3.3], 0.16, 16), foot: disc(0.9, 0.12, { chamfer: 0.03 }) }), [])
  const pts: P2[] = Array.from({ length: 361 }, (_, i) => { const p = orbitAt(1, e, i / 360).p; return [p[0] * S, p[1] * S] })
  const o = ORBITS[k], now = orbitAt(1, e, t), P: P2 = [now.p[0] * S, now.p[1] * S], sun: P2 = [e * S, 0]
  const W = (x: number, y: number, z = 0.08) => toWorld(F.orbit, x, y, z)
  const labels: Label[] = [
    { id: 's', at: W(sun[0], 0.42), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <>太阳 · 在一个焦点上</> },
    ...(e > 0.05 ? [{ id: 'f', at: W(-sun[0], -0.3), ax: 0.5, className: 'scene-tag', children: <>另一个焦点（空的）</> } satisfies Label] : []),
    { id: 'q', at: W(S - 0.1, -0.5), ax: 0.5, className: 'scene-tag', children: <><small>近日点</small>{fmt(perihelion(o.a, o.e), 3)} AU</> },
    { id: 'Q', at: W(-S + 0.1, -0.5), ax: 0.5, className: 'scene-tag', children: <><small>远日点</small>{fmt(aphelion(o.a, o.e), 3)} AU</> },
    ...(moving ? [{ id: 'r', at: W(P[0], P[1] + 0.3), ax: 0.5, className: 'scene-tag -translate-y-full', style: { borderLeft: `4px solid ${COL.r1}` }, children: <><small>{o.name}到太阳</small>{fmt(now.r * o.a, 2)} AU</> } satisfies Label] : []),
    { id: 'n', at: W(-3.4, -3.3), name: true, className: 'scene-name', children: '轨道盘 · 各条轨道的长半轴都画成一样长' },
  ]
  return (
    <At at="orbit" labels={labels} world={{ open: true }} bloom={0.7}>
      <Local f={F.orbit}>
        {/* 轨道盘：深色的圆盘、一圈金属边，背后一根斜撑落到地面 */}
        <mesh geometry={g.plate} rotation-x={Math.PI / 2} position-z={-0.1} castShadow><meshStandardMaterial color="#0b1220" roughness={0.55} metalness={0.3} /></mesh>
        <mesh geometry={g.rim} rotation-x={Math.PI / 2} position-z={-0.1}><Metal kind="stainless" grain="brushed" /></mesh>
        <mesh geometry={g.post} castShadow><Metal kind="iron" grain="cast" /></mesh>
        <group position-z={0.02}>
          <Seg a={[-S - 0.5, 0]} b={[S + 0.5, 0]} color={COL.ghost} dash={0.16} width={0.02} opacity={0.6} />
          <Path pts={pts} closed width={0.03} opacity={0.4} z={0.016} />
          <Path pts={pts} width={0.055} frac={moving ? t : 1} />
          {e > 0.05 && <Dot at={[-sun[0], 0]} color="#0b1220" r={0.07} />}
          <Seg a={sun} b={P} color={COL.r1} width={0.035} z={0.026} />
        </group>
        {/* 太阳和天体：立在盘面上的小球 */}
        <mesh position={[sun[0], 0, 0.26]}><sphereGeometry args={[0.26, 32, 20]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} /></mesh>
        <pointLight position={[sun[0], 0, 0.5]} intensity={6} distance={7} color="#ffd9a0" />
        <mesh position={[P[0], P[1], 0.02 + BODY[k].r]} castShadow><sphereGeometry args={[BODY[k].r, 32, 20]} /><meshStandardMaterial color={BODY[k].color} roughness={0.6} emissive={BODY[k].color} emissiveIntensity={0.35} /></mesh>
      </Local>
    </At>
  )
}
