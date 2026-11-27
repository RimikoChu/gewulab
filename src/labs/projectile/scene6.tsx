// 抛体运动 · 第 6 课的三维场景：喷水训练场。一门拖车式水炮对着一道和炮口一样高的混凝土长台喷水，台面上有距离刻度，20 m 处放着一只火盆。
// 水以 14 m/s 喷出，仰角 30°、45°、60° 三档。炮口的三支箭头是初速度（黄）和它的水平（青）、竖直（橙红）分量。
// 记录过的仰角留下一条细的轨迹线，三条放在一起比。
import { RoundedBox } from '@react-three/drei'
import { Metal, type Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { Blaze, C, Dashed, Jet, Smoke, Trail, Vel, type V3 } from './fx'
import { apexOf, CANNON, flightTime, fly, fmt, rangeOf } from './physics'
import { BigMonitor, P } from './world'

const W = (p: V3) => toWorld(P.cannon, 0, p)
const TINT: Record<number, string> = { 30: '#9fe0ff', 45: '#ffffff', 60: '#ffc9a8' }
const arc = (a: number): V3[] => { const T = flightTime(CANNON.v0, a), out: V3[] = []; for (let i = 0; i <= 32; i++) { const s = fly(CANNON.v0, a, T * i / 32); out.push([s.x, s.y, 0]) } return out }

/** 火盆：三条腿的铁盆，里面是烧着的木柴 */
function Brazier({ lit }: { lit: boolean }) {
  return <group>
    <mesh position-y={0.28} castShadow><cylinderGeometry args={[0.42, 0.3, 0.22, 24, 1, true]} /><Metal kind="iron" grain="cast" /></mesh>
    <mesh position-y={0.18}><cylinderGeometry args={[0.3, 0.3, 0.03, 24]} /><Metal kind="iron" grain="cast" /></mesh>
    {[0, 2.1, 4.2].map(a => <mesh key={a} position={[Math.cos(a) * 0.26, 0.09, Math.sin(a) * 0.26]}><cylinderGeometry args={[0.018, 0.018, 0.18, 8]} /><Metal kind="iron" grain="cast" /></mesh>)}
    {[0.2, 1.4, 2.6].map(a => <mesh key={a} position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, a]}><cylinderGeometry args={[0.045, 0.05, 0.62, 8]} /><meshStandardMaterial color={lit ? '#3a2416' : '#241a14'} roughness={0.95} emissive="#ff5a1a" emissiveIntensity={lit ? 0.5 : 0} /></mesh>)}
    <Blaze at={[0, 0.36, 0]} w={1.5} h={2.4} spread={0.42} level={lit ? 1 : 0} n={3} />
    <Smoke at={[0, 0.5, 0]} size={0.5} rise={3} color="#f2f2f2" level={lit ? 0 : 0.9} n={20} opacity={0.3} />
  </group>
}

export default function Scene6({ angle, barrel, on, landed, kept, out }: { angle: number; barrel: number; on: boolean; landed: boolean; kept: number[]; out: boolean }) {
  const v0 = CANNON.v0, T = flightTime(v0, angle), R = rangeOf(v0, angle), Hm = apexOf(v0, angle)
  const s0 = fly(v0, barrel, 0)
  const labels: Label[] = [
    ...(landed || kept.includes(angle) ? [
      { id: 'R', at: W([R, -1.7, 1.4]), ax: 0.5, className: 'scene-tag key', children: <><small>射程</small>{fmt(R)} m</> } satisfies Label,
      { id: 'H', at: W([R / 2, Hm + 0.25, 0]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>射高</small>{fmt(Hm, 1)} m</> } satisfies Label,
    ] : []),
    ...kept.filter(a => a !== angle).map(a => ({ id: `k${a}`, at: W([rangeOf(v0, a) * 0.5, apexOf(v0, a) + 0.2, 0]), ax: 0.5, className: 'scene-name -translate-y-full', children: `${a}°` } satisfies Label)),
    { id: 'pot', at: W([CANNON.pot, 3.6, 0]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '火盆 · 20 m 处' },
    { id: 'n', at: W([-0.6, -1.7, 1.6]), ax: 0.5, name: true, className: 'scene-name', children: '拖车式水炮（示意大小）' },
  ]
  return (
    <At at="cannon" labels={labels}>
      <Local origin={P.cannon}>
        <BigMonitor angle={barrel} />
        <Jet v0={v0} angle={angle} T={T} on={on} thick={2.6} n={520} />
        {/* 和炮口同高的水平线 */}
        <Dashed a={[0, 0, 0]} b={[4, 0, 0.9]} w={1.6} dash={0.25} opacity={0.6} />
        {/* 初速度和它的两个分量（水柱开着时让开，不挡水柱） */}
        {!on && <Vel at={[0, 0, 0.6]} vx={s0.vx} vy={s0.vy} k={0.34} thick={3} />}
        {/* 记录过的轨迹，和这一次的射高 */}
        {kept.map(a => <Trail key={a} pts={arc(a)} r={0.05} color={TINT[a]} opacity={a === angle ? 0.9 : 0.55} />)}
        {(landed || kept.includes(angle)) && <Dashed a={[R / 2, 0, 0]} b={[R / 2, Hm, 0]} color={C.vy} w={2} dash={0.22} />}
        {/* 20 m 处的火盆：只有 45° 够得着 */}
        <group position={[CANNON.pot, 0.02, 0]} scale={1.7}><Brazier lit={!out} /></group>
        {/* 长台上的落点标记 */}
        {kept.map(a => <RoundedBox key={a} args={[0.12, 0.5, 0.12]} radius={0.02} position={[rangeOf(v0, a), 0.25, -0.9]}><meshStandardMaterial color={a === 45 ? '#ffd25a' : '#e8651c'} roughness={0.6} /></RoundedBox>)}
      </Local>
    </At>
  )
}
