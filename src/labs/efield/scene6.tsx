// 静电场 · 第 6 课 粒子的加速的器材：一支示波管横放在两只托架上。玻璃管的细颈里是电子枪：左边的阴极发出电子，
// 右边 3 cm 处是带小孔的阳极，两者之间加着加速电压；电子穿过小孔以后匀速飞到右端的荧光屏，打出一个亮点。
// 电子用带拖尾的亮点表示，放慢了很多；管里的辉光是电子束。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, shell } from '@/lab-kit'
import { COL, ST, TOP } from './layout'
import { GUN, type V3 } from './physics'
import { Arrow, Comet, Glow, Sign } from './fx'
import { Acrylic, Bakelite, Cable, Supply } from './gear'

/** 管轴的高度；阴极、阳极、荧光屏的 x */
export const R6 = { y: 0.17, k: -0.2, a: -0.2 + GUN.gap + 0.008, s: 0.155 }

/** U：加速电压；reversed：电源反接；clock：画面里的时间（没发射时返回 −1）；speed：电子在画面上飞的速度（m/s，放慢后的） */
export function Rig6({ U = 500, reversed = false, clock = () => -1, speed = 0.25 }: { U?: number; reversed?: boolean; clock?: () => number; speed?: number }) {
  const geo = useMemo(() => ({
    glass: shell([[0, 0], [0.019, 0.003], [0.022, 0.01], [0.022, 0.21], [0.03, 0.26], [0.06, 0.33], [0.086, 0.375], [0.088, 0.4]], 0.003, { segs: 64 }),
    anode: disc(0.016, 0.003, { hole: 0.0028, segs: 40 }), socket: disc(0.025, 0.034, { segs: 40 }), ring: shell([[0.066, 0], [0.066, 0.016]], 0.005, { segs: 48 }),
  }), [])
  const y = R6.y, on = !reversed
  const k0 = R6.k + 0.008, gap = R6.a - k0, t1 = 2 * gap / speed, T = t1 + (R6.s - R6.a) / speed + 0.5
  // 电子：在阴极和阳极之间匀加速，过了小孔匀速；反接时刚离开阴极就被推回去
  const path = (shift: number) => (t: number): V3 | null => {
    if (t < 0) return null
    const u = (t + shift * T) % T
    if (reversed) { const w = (t + shift * 0.9) % 0.9; return [k0 + 0.007 * Math.sin(Math.PI * w / 0.9), y, 0] }
    if (u < t1) return [k0 + gap * (u / t1) ** 2, y, 0]
    const x = R6.a + (u - t1) * speed
    return x > R6.s ? null : [x, y, 0]
  }
  const lvl = Math.min(1, 0.45 + U / 3600)
  return <group position={[ST.l6, TOP, 0]}>
    {/* 两只托架：颈部一只有机玻璃 V 形座，锥体处一只金属箍 */}
    <RoundedBox args={[0.4, 0.016, 0.16]} radius={0.004} position={[-0.04, 0.008, 0]} castShadow receiveShadow><Bakelite color="#202326" /></RoundedBox>
    <RoundedBox args={[0.014, y - 0.03, 0.07]} radius={0.003} position={[-0.12, (y - 0.03) / 2 + 0.012, 0]} castShadow><Acrylic /></RoundedBox>
    <RoundedBox args={[0.014, y - 0.075, 0.09]} radius={0.003} position={[0.08, (y - 0.075) / 2 + 0.012, 0]} castShadow><Acrylic /></RoundedBox>
    <mesh geometry={geo.ring} position={[0.072, y, 0]} rotation-z={-Math.PI / 2} castShadow><Metal kind="aluminum" grain="brushed" rough={0.4} /></mesh>
    {/* 管座和引脚、玻璃管 */}
    <mesh geometry={geo.socket} position={[-0.275, y, 0]} rotation-z={-Math.PI / 2} castShadow><Bakelite /></mesh>
    <mesh geometry={geo.glass} position={[-0.245, y, 0]} rotation-z={-Math.PI / 2} renderOrder={9}><meshPhysicalMaterial color="#d6ecf2" transparent opacity={0.08} roughness={0.02} envMapIntensity={0.7} depthWrite={false} /></mesh>
    {/* 电子枪：两根支撑的细杆、阴极（发红的小圆筒）、带孔的阳极 */}
    {[-0.012, 0.012].map(z => <mesh key={z} position={[(R6.a - 0.24) / 2, y - 0.012, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0009, 0.0009, R6.a + 0.24, 8]} /><Metal kind="chrome" /></mesh>)}
    <mesh position={[R6.k, y, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.007, 0.007, 0.016, 24]} /><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[k0 + 0.0005, y, 0]} rotation-y={Math.PI / 2}><circleGeometry args={[0.0055, 24]} /><meshBasicMaterial color="#ff8a3c" toneMapped={false} /></mesh>
    <mesh geometry={geo.anode} position={[R6.a, y, 0]} rotation-z={-Math.PI / 2} castShadow><Metal kind="steel" grain="turned" /></mesh>
    <Sign at={[R6.k, y + 0.04, 0]} kind={on ? '−' : '+'} size={0.022} />
    <Sign at={[R6.a, y + 0.04, 0]} kind={on ? '+' : '−'} size={0.022} />
    {/* 荧光屏：管子大头里面一层荧光粉，电子打到的地方发亮 */}
    <mesh position={[R6.s, y, 0]} rotation-y={-Math.PI / 2}><circleGeometry args={[0.084, 64]} /><meshStandardMaterial color="#8fa698" roughness={0.9} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <Beam clock={clock} on={on} from={[R6.a, y, 0]} to={[R6.s - 0.001, y, 0]} level={lvl} />
    {[0, 0.34, 0.67].map(s => <Comet key={s} pos={path(s)} clock={clock} color={COL.neg} size={0.0042} tail={0.22} n={22} />)}
    {/* 两极之间的电场（黄）和电子受的力（品红） */}
    <Arrow from={[on ? R6.a - 0.004 : k0 + 0.004, y + 0.016, 0]} dir={[on ? -1 : 1, 0, 0]} len={gap - 0.008} color={COL.E} thick={0.05} />
    <Arrow from={[k0 + 0.012, y - 0.014, 0]} dir={[on ? 1 : -1, 0, 0]} len={0.016} color={COL.F} thick={0.05} />
    {/* 高压电源和导线 */}
    <group position={[-0.5, 0, -0.1]} rotation-y={0.45}><Supply text={`${reversed ? '−' : ''}${U} V`} name="加速电压" /></group>
    <Cable pts={[[-0.42, 0.045, 0.0], [-0.36, 0.02, 0.07], [-0.32, 0.08, 0.04], [-0.292, y - 0.008, 0.012]]} />
    <Cable color="#1c1d1f" pts={[[-0.4, 0.045, -0.02], [-0.34, 0.03, -0.05], [-0.31, 0.1, -0.03], [-0.292, y + 0.006, -0.012]]} />
  </group>
}

/** 电子束的辉光和屏上的亮点：发射以后、电子到达小孔时才亮起来 */
function Beam({ clock, on, from, to, level }: { clock: () => number; on: boolean; from: V3; to: V3; level: number }) {
  const lit = on && clock() >= 0
  return <group visible={lit}>
    <Glow pts={[from, to]} color={COL.glow} r={0.0012} level={0.55 * level} halo={3.5} />
    <mesh position={[to[0] - 0.0005, to[1], to[2]]} rotation-y={-Math.PI / 2} renderOrder={10}><circleGeometry args={[0.004 + 0.003 * level, 24]} /><meshBasicMaterial color="#c9ffe6" toneMapped={false} /></mesh>
    <mesh position={[to[0] - 0.0004, to[1], to[2]]} rotation-y={-Math.PI / 2} renderOrder={10}><circleGeometry args={[0.02, 32]} /><meshBasicMaterial color={COL.glow} toneMapped={false} transparent opacity={0.22 * level} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
  </group>
}
