// 静电场 · 第 2 课 电场强度的器材：绝缘柱上一只带正电的空心金属球；一只铁架台吊着一颗带电的试探小球，和球心一样高。
// 铁架台沿台面上的米尺移动，小球停在离球心 r 处；悬线偏开的角度由小球受的力决定。金属球周围画着向外的电场线。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Metal, Rod, lathe } from '@/lab-kit'
import { COL, ST, TOP } from './layout'
import { makeRuler } from './mats'
import { DOME, type V3 } from './physics'
import { Arrow, FieldLines, Sign } from './fx'
import { Ball, InsPost } from './gear'

/** 金属球球心的位置（相对台面中心）、试探小球的半径 */
export const R2 = { c: [-0.17, 0.2, 0] as V3, ball: 0.011 }

/** r：小球到球心的距离；theta：悬线偏角（rad）；F：小球受的力（N）；which：用的是哪一颗试探小球（0 是 q，1 是 q/2） */
export function Rig2({ r = DOME.r[0], theta = 0.34, F = 1.8e-4, which = 0 }: { r?: number; theta?: number; F?: number; which?: number }) {
  const geo = useMemo(() => ({ foot: lathe([[0, 0], [0.012, 0], [0.012, 0.01], [0.007, 0.014], [0, 0.014]]) }), [])
  const ruler = makeRuler(40)
  const [cx, cy] = R2.c, L = DOME.L
  const ball: V3 = [cx + r, cy, 0], top: V3 = [ball[0] - L * Math.sin(theta), cy + L * Math.cos(theta), 0]
  // 电场线：水平一圈八条，斜向上四条，正上方一条；从球面出发向外
  const lines = useMemo(() => {
    const dirs: V3[] = [[0, 1, 0]]
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.0; dirs.push([Math.cos(a), 0, Math.sin(a)]) }
    for (let i = 0; i < 4; i++) { const a = (i + 0.5) / 4 * Math.PI * 2; dirs.push([Math.cos(a) * 0.72, 0.7, Math.sin(a) * 0.72]) }
    return dirs.map(d => [0, 1].map(k => { const s = k ? (d[1] > 0.5 ? 0.24 : 0.4) : DOME.R + 0.004; return [cx + d[0] * s, cy + d[1] * s, d[2] * s] as V3 }))
  }, [cx, cy])
  return <group position={[ST.l2, TOP, 0]}>
    {/* 带电金属球：抛光的空心铝球，下面一段黄铜接头，立在有机玻璃柱上 */}
    <group position={[cx, 0, 0]}>
      <InsPost h={cy - DOME.R + 0.022} r={0.011} base={0.06} />
      <mesh geometry={geo.foot} position={[0, cy - DOME.R - 0.012, 0]}><Metal kind="brass" grain="turned" /></mesh>
      <mesh position={[0, cy, 0]} castShadow><sphereGeometry args={[DOME.R, 64, 48]} /><Metal kind="aluminum" rough={0.36} env={1.5} /></mesh>
    </group>
    <Sign at={[cx, cy, 0]} kind="+" size={0.034} />
    <FieldLines lines={lines} heads={2} head={0.014} r={0.0013} level={0.9} />
    {/* 台面上的米尺：0 对着球心 */}
    <RoundedBox args={[0.43, 0.006, 0.032]} radius={0.002} position={[cx + 0.2, 0.003, 0.085]} receiveShadow castShadow><meshStandardMaterial color="#8f866b" roughness={0.6} /></RoundedBox>
    <mesh position={[cx + 0.2, 0.0062, 0.085]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.41, 0.03]} /><meshStandardMaterial map={ruler} roughness={0.6} /></mesh>
    {/* 铁架台：铸铁底座、镀铬立杆、横臂，吊着试探小球 */}
    <group position={[top[0], 0, 0]}>
      <RoundedBox args={[0.11, 0.014, 0.075]} radius={0.004} position={[0, 0.007, -0.075]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <mesh position={[0, top[1] / 2 + 0.02, -0.095]} castShadow><cylinderGeometry args={[0.004, 0.004, top[1] + 0.03, 16]} /><Metal kind="chrome" /></mesh>
      <mesh position={[0, top[1] + 0.012, -0.045]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.003, 0.003, 0.11, 12]} /><Metal kind="chrome" /></mesh>
      <mesh position={[0, top[1] + 0.012, -0.095]} castShadow><boxGeometry args={[0.014, 0.018, 0.014]} /><Metal kind="steel" grain="brushed" /></mesh>
      <mesh position={[0, top[1] + 0.006, 0]}><cylinderGeometry args={[0.0016, 0.0016, 0.012, 8]} /><Metal kind="chrome" /></mesh>
    </group>
    {/* 没用上的那颗试探小球：立在前面的小绝缘座上 */}
    <group position={[0.12, 0, 0.17]}>
      <InsPost h={0.075} r={0.004} base={0.028} />
      <Ball at={[0, 0.075 + R2.ball, 0]} r={which ? R2.ball : R2.ball * 0.86} sign="+" dim={which ? 1 : 0.6} kind={which ? 'brass' : 'aluminum'} />
    </group>
    <Rod from={top} to={ball} r={0.0006}><meshStandardMaterial color="#e8e8e2" roughness={0.6} /></Rod>
    <Ball at={ball} r={which ? R2.ball * 0.86 : R2.ball} sign="+" dim={which ? 0.6 : 1} kind={which ? 'aluminum' : 'brass'} />
    <Arrow from={ball} dir={[1, 0, 0]} len={0.02 + Math.min(1, F / 1.8e-4) * 0.085} color={COL.F} thick={0.07} />
  </group>
}
