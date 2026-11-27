// 带电粒子在磁场中 · 第 4 课 周期与速度无关的器材：地上一台 C 形电磁铁（蓝色铁轭、上下两个圆磁极、各套一只铜线圈），
// 两极之间一只扁圆的不锈钢真空室，玻璃盖板，里面一只质子源。上磁极、上线圈和上半截铁轭画成透视的，好看清里面。
// 质子在水平面里转圈，磁场竖直向上，用立体的磁感线表示。
import { useMemo } from 'react'
import { Edges, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, shell } from '@/lab-kit'
import { COL, ST } from './layout'
import { makeWinding, makeText } from './mats'
import type { V3 } from './physics'
import { Comet, FieldLines, FollowArrow, Glow, spotsIn } from './fx'

/** 两极之间那一层的高度、磁极半径、两极面的间隙、质子源的位置（相对磁极中心，m） */
export const R4 = { y: 0.95, pole: 0.2, gap: 0.08, src: [0, -0.13] as [number, number] }
const BLUE = '#2d5aa8'

/** 一个粒子：半径 r、visual 周期 P（秒），从质子源沿 +x 出发，受力指向 +z（磁场向上，正电荷） */
export interface Orbit { r: number; P: number; t0: number; k: number }
/** 粒子在时刻 t 的位置和速度方向（水平面，相对磁极中心） */
export function orbitAt(o: Orbit, t: number) {
  const th = (t - o.t0) / o.P * Math.PI * 2, [sx, sz] = R4.src
  return { p: [sx + o.r * Math.sin(th), sz + o.r * (1 - Math.cos(th))] as [number, number], v: [Math.cos(th), Math.sin(th)] as [number, number], th }
}

/** 一块圆磁极和套在它外面的线圈；up 为真时是上面那一组 */
function PoleCoil({ up, ghost }: { up: boolean; ghost?: boolean }) {
  const geo = useMemo(() => ({ coil: shell([[0.3, 0], [0.3, 0.1]], 0.06), pole: disc(R4.pole, 0.12, { chamfer: 0.006, segs: 64 }) }), [])
  const wind = useMemo(() => { const t = makeWinding([170, 90, 46], 40).clone(); t.repeat.set(1, 3); t.needsUpdate = true; return t }, [])
  const s = up ? -1 : 1, faceY = R4.y + s * -R4.gap / 2
  const ghostMat = <meshBasicMaterial color="#9fc0ff" transparent opacity={0.03} depthWrite={false} />
  return <group position={[0, faceY, 0]} scale={[1, s, 1]}>
    <mesh geometry={geo.pole} position={[0, -0.12, 0]} castShadow={!ghost} receiveShadow>{ghost ? ghostMat : <Metal kind="iron" grain="turned" rough={0.45} />}{ghost && <Edges threshold={30} color="#9fc0ff" />}</mesh>
    <mesh geometry={geo.coil} position={[0, -0.12, 0]} castShadow={!ghost}>{ghost ? ghostMat : <meshPhysicalMaterial map={wind} color="#d08a5c" roughness={0.4} metalness={0.4} clearcoat={0.7} />}{ghost && <Edges threshold={30} color="#ffb98a" />}</mesh>
  </group>
}

/** C 形铁轭：截面在 y–z 平面，开口朝前；top 为真时只要上半截（透视画） */
function yokeGeo(part: 'top' | 'bottom' | 'back') {
  const W = 0.72, y0 = R4.y - R4.gap / 2 - 0.12 - 0.2, y1 = R4.y + R4.gap / 2 + 0.12 + 0.2
  const g = part === 'back' ? new THREE.BoxGeometry(W, y1 - y0, 0.22) : new THREE.BoxGeometry(W, 0.2, 0.8)
  if (part === 'back') g.translate(0, (y0 + y1) / 2, -0.51)
  else g.translate(0, part === 'top' ? y1 - 0.1 : y0 + 0.1, -0.02)
  return g
}

/** B：磁场（T）；orbits：正在转的粒子；clock：画面里的时间；arrows：画速度和受力的箭头 */
export function Rig4({ B = 0.5, orbits = [], clock = () => -1, arrows = true }: { B?: number; orbits?: Orbit[]; clock?: () => number; arrows?: boolean }) {
  const geo = useMemo(() => ({ top: yokeGeo('top'), bottom: yokeGeo('bottom'), back: yokeGeo('back'), chamber: shell([[R4.pole + 0.012, 0], [R4.pole + 0.012, 0.064]], 0.008, { segs: 72 }), flange: disc(R4.pole + 0.03, 0.01, { hole: R4.pole + 0.004, segs: 72 }) }), [])
  const spots = useMemo(() => spotsIn({ r: R4.pole - 0.01 }, 0.06), [])
  const plate = makeText(['C 形电磁铁'], { w: 512, h: 96, bg: '#d8d6cf', fg: '#22313f', size: 44 })
  const paint = <meshPhysicalMaterial color={BLUE} roughness={0.38} clearcoat={0.5} clearcoatRoughness={0.3} />
  const ghost = <meshBasicMaterial color="#9fc0ff" transparent opacity={0.025} depthWrite={false} />
  const W = (p: [number, number], dy = 0): V3 => [p[0], R4.y + dy, p[1]]
  const lvl = B > 0.75 ? 1 : 0.65
  return <group position={[ST.l4, 0, 0]}>
    {/* 底座：两根工字钢和四只调平脚 */}
    {[-0.26, 0.26].map(x => <group key={x} position={[x, 0, -0.12]}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow><boxGeometry args={[0.12, 0.5, 0.9]} /><meshStandardMaterial color="#454d55" roughness={0.6} metalness={0.4} /></mesh>
      {[-0.38, 0.38].map(z => <mesh key={z} position={[0, 0.02, z]}><cylinderGeometry args={[0.05, 0.06, 0.04, 20]} /><Metal kind="steel" grain="turned" /></mesh>)}
    </group>)}
    <mesh position={[0, 0.535, -0.12]} castShadow receiveShadow><boxGeometry args={[0.8, 0.07, 0.92]} /><meshStandardMaterial color="#3c434a" roughness={0.6} metalness={0.4} /></mesh>
    {/* 铁轭：下臂、后柱是实的，上臂透视 */}
    <mesh geometry={geo.bottom} castShadow receiveShadow>{paint}</mesh>
    <mesh geometry={geo.back} castShadow receiveShadow>{paint}</mesh>
    <mesh geometry={geo.top}>{ghost}<Edges threshold={20} color="#8fb0f0" /></mesh>
    <mesh position={[0, R4.y - 0.05, 0.381]}><planeGeometry args={[0.3, 0.056]} /><meshStandardMaterial map={plate} roughness={0.5} /></mesh>
    <PoleCoil up={false} /><PoleCoil up ghost />
    {/* 真空室：不锈钢圆筒，上下法兰，玻璃盖板；前面一根抽气管 */}
    <group position={[0, R4.y - 0.032, 0]}>
      <mesh geometry={geo.chamber} castShadow><Metal kind="stainless" grain="brushed" /></mesh>
      <mesh geometry={geo.flange}><Metal kind="stainless" grain="turned" /></mesh>
      <mesh position={[0, 0.064, 0]} rotation-x={-Math.PI / 2} renderOrder={9}><circleGeometry args={[R4.pole + 0.02, 64]} /><meshPhysicalMaterial color="#e8f2f5" transparent opacity={0.1} roughness={0.03} clearcoat={1} depthWrite={false} /></mesh>
      <mesh position={[0, 0.001, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[R4.pole + 0.004, 64]} /><meshStandardMaterial color="#20262b" roughness={0.55} metalness={0.3} /></mesh>
      <mesh position={[0.08, 0.032, R4.pole + 0.08]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.018, 0.018, 0.12, 20]} /><Metal kind="stainless" grain="brushed" /></mesh>
    </group>
    {/* 质子源：小圆筒，出口朝 +x */}
    <group position={W(R4.src, -0.012)}>
      <mesh position={[-0.02, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.009, 0.009, 0.03, 16]} /><Metal kind="copper" grain="turned" /></mesh>
      <mesh position={[-0.038, 0, 0]}><boxGeometry args={[0.01, 0.03, 0.03]} /><meshStandardMaterial color="#d9d3c3" roughness={0.6} /></mesh>
    </group>
    {/* 磁感线：竖直向上，穿过两极之间 */}
    <FieldLines spots={spots} y0={R4.y - R4.gap / 2} y1={R4.y + R4.gap / 2 + 0.03} dir={1} opacity={lvl * 0.8} head={0.016} r={0.0013} />
    {/* 粒子：发光的点和拖尾，加上速度（白）和洛伦兹力（品红）箭头 */}
    {orbits.map((o, i) => <group key={`${i}-${o.t0}`}>
      <Glow pts={Array.from({ length: 73 }, (_, k) => W(orbitAt(o, o.t0 + o.P * k / 72).p, -0.012))} color={COL.pos} level={0.5} r={0.0022} halo={3} />
      <Comet pos={t => (t < o.t0 ? null : W(orbitAt(o, t).p, -0.012))} clock={clock} color={COL.pos} size={0.006} tail={o.P * 0.6} n={40} />
      {arrows && <>
        <FollowArrow color={COL.v} thick={0.11} get={() => { const t = clock(); if (t < o.t0) return null; const a = orbitAt(o, t); return { from: W(a.p, -0.012), dir: [a.v[0], 0, a.v[1]], len: 0.025 + 0.02 * o.k } }} />
        <FollowArrow color={COL.FB} thick={0.11} get={() => { const t = clock(); if (t < o.t0) return null; const a = orbitAt(o, t); return { from: W(a.p, -0.012), dir: [-a.v[1], 0, a.v[0]], len: 0.02 + 0.015 * o.k } }} />
      </>}
    </group>)}
  </group>
}
