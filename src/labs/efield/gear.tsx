// 各课共用的器材：防静电实验台、高压电源、绝缘支柱、导线、玻璃材质、带电小球、闸刀开关。尺寸按米。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, disc, lathe } from '@/lab-kit'
import { TOP } from './layout'
import { makeMat, makeText, rep } from './mats'
import type { V3 } from './physics'
import { Sign } from './fx'

/** 玻璃：透明、有反光；里面还要画东西，所以不写深度 */
export const GlassMat = ({ opacity = 0.16, color = '#dff1f5' }: { opacity?: number; color?: string }) =>
  <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.03} clearcoat={1} envMapIntensity={0.9} depthWrite={false} side={THREE.DoubleSide} />
/** 有机玻璃的绝缘件：半透明，带一点乳白 */
export const Acrylic = ({ color = '#e9f1f2', opacity = 0.55 }: { color?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.12} clearcoat={0.8} envMapIntensity={1.2} />
/** 黑色的胶木、塑料件 */
export const Bakelite = ({ color = '#1b1c1e' }: { color?: string }) => <meshPhysicalMaterial color={color} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.35} />

/** 防静电实验台：方钢腿、调平脚、横撑，台面铺灰绿色的防静电台垫，铝包边，后沿一条电源线槽。台面在 y = TOP，中心在原点 */
export function Bench({ w = 1.7, d = 0.82 }: { w?: number; d?: number }) {
  const mat = useMemo(() => rep(makeMat(), w * 2.2, d * 2.2), [w, d])
  const steel = <meshStandardMaterial color="#d9dcdd" roughness={0.5} metalness={0.3} />
  const plate = makeText(['防静电工作台'], { w: 512, h: 96, bg: '#e7d43a', fg: '#1b1b1b', size: 46 })
  return <group>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <group key={`${sx}${sz}`} position={[sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06)]}>
      <mesh position={[0, (TOP - 0.05) / 2 + 0.02, 0]} castShadow receiveShadow><boxGeometry args={[0.05, TOP - 0.09, 0.05]} />{steel}</mesh>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.03, 0.036, 0.024, 20]} /><meshStandardMaterial color="#17181a" roughness={0.6} /></mesh>
    </group>))}
    {[-1, 1].map(sz => <mesh key={sz} position={[0, 0.22, sz * (d / 2 - 0.06)]} castShadow><boxGeometry args={[w - 0.17, 0.04, 0.03]} />{steel}</mesh>)}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.06), 0.22, 0]} castShadow><boxGeometry args={[0.03, 0.04, d - 0.17]} />{steel}</mesh>)}
    <mesh position={[0, TOP - 0.075, 0]} castShadow><boxGeometry args={[w - 0.08, 0.06, d - 0.08]} />{steel}</mesh>
    {/* 台面：木芯板包铝边，上面铺台垫 */}
    <RoundedBox args={[w, 0.036, d]} radius={0.008} smoothness={3} position={[0, TOP - 0.021, 0]} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" rough={0.5} env={0.5} /></RoundedBox>
    <mesh position={[0, TOP - 0.0015, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[w - 0.03, d - 0.03]} /><meshStandardMaterial map={mat} roughness={0.9} /></mesh>
    <mesh position={[w / 2 - 0.2, TOP - 0.022, d / 2 + 0.0005]}><planeGeometry args={[0.2, 0.028]} /><meshStandardMaterial map={plate} roughness={0.6} /></mesh>
    {/* 后沿的电源线槽和两只插座 */}
    <RoundedBox args={[w - 0.1, 0.07, 0.05]} radius={0.006} position={[0, TOP + 0.035, -d / 2 + 0.03]} castShadow><meshStandardMaterial color="#c9cdd0" roughness={0.55} metalness={0.3} /></RoundedBox>
    {[-0.5, 0.5].map(x => <mesh key={x} position={[x, TOP + 0.036, -d / 2 + 0.0555]}><planeGeometry args={[0.1, 0.045]} /><meshStandardMaterial color="#f1f1ee" roughness={0.5} /></mesh>)}
  </group>
}

/** 高压电源：铝面板的机箱，一块读数屏、一只旋钮、红黑两个接线柱。底面在 y = 0，面板朝 +z */
export function Supply({ text, name = '高压电源', w = 0.24, h = 0.12, d = 0.2 }: { text: string; name?: string; w?: number; h?: number; d?: number }) {
  const plate = makeText([name], { w: 384, h: 72, bg: '#2a2f33', fg: '#e8ecee', size: 40 })
  const knob = useMemo(() => lathe([[0, 0], [0.016, 0], [0.016, 0.004], [0.013, 0.006], [0.012, 0.018], [0.01, 0.02], [0, 0.02]]), [])
  return <group>
    <RoundedBox args={[w, h, d]} radius={0.008} smoothness={3} position={[0, h / 2 + 0.008, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#39424a" roughness={0.45} clearcoat={0.4} clearcoatRoughness={0.4} /></RoundedBox>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.03), 0.004, sz * (d / 2 - 0.03)]}><cylinderGeometry args={[0.012, 0.012, 0.008, 16]} /><meshStandardMaterial color="#111" roughness={0.7} /></mesh>))}
    <mesh position={[0, h / 2 + 0.008, d / 2 + 0.0006]}><planeGeometry args={[w - 0.016, h - 0.016]} /><Metal kind="aluminum" grain="brushed" rough={0.5} env={0.6} /></mesh>
    <Led text={text} w={w * 0.46} h={h * 0.4} position={[-w * 0.2, h * 0.62 + 0.008, d / 2 + 0.0012]} />
    <mesh position={[-w * 0.2, h * 0.22 + 0.008, d / 2 + 0.0012]}><planeGeometry args={[w * 0.46, h * 0.16]} /><meshStandardMaterial map={plate} roughness={0.6} /></mesh>
    <mesh geometry={knob} position={[w * 0.2, h * 0.66 + 0.008, d / 2]} rotation-x={Math.PI / 2}><Bakelite /></mesh>
    {[[w * 0.12, '#c4302a'], [w * 0.3, '#1c1d1f']].map(([x, c]) => <mesh key={c as string} position={[x as number, h * 0.24 + 0.008, d / 2 + 0.008]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.008, 0.009, 0.016, 16]} /><meshPhysicalMaterial color={c as string} roughness={0.35} clearcoat={0.6} /></mesh>)}
  </group>
}

/** 绝缘支柱：铸铁圆底座上一根有机玻璃圆柱，高 h。底面在 y = 0 */
export function InsPost({ h, r = 0.008, base = 0.045 }: { h: number; r?: number; base?: number }) {
  const geo = useMemo(() => ({ base: lathe([[0, 0], [base, 0], [base, 0.008], [base * 0.82, 0.016], [r * 1.9, 0.02], [r * 1.9, 0.034], [0, 0.034]]), rod: disc(r, h - 0.03, { chamfer: r * 0.2, segs: 24 }) }), [h, r, base])
  return <group>
    <mesh geometry={geo.base} castShadow receiveShadow><Bakelite color="#222528" /></mesh>
    <mesh geometry={geo.rod} position={[0, 0.03, 0]} castShadow><Acrylic /></mesh>
  </group>
}

/** 导线：沿几个点走的软线 */
export function Cable({ pts, color = '#c4302a', r = 0.0022 }: { pts: V3[]; color?: string; r?: number }) {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'), pts.length * 10, r, 8), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} castShadow><meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.3} /></mesh>
}

/** 带电的金属小球：sign 是它带的电（不带电时不贴牌），dim 是电荷量减半时把牌子调淡 */
export function Ball({ at, r = 0.012, sign, dim = 1, kind = 'brass' }: { at: V3; r?: number; sign?: '+' | '−' | null; dim?: number; kind?: 'brass' | 'aluminum' | 'chrome' }) {
  return <group position={at}>
    <mesh castShadow><sphereGeometry args={[r, 32, 24]} /><Metal kind={kind} rough={0.22} /></mesh>
    {sign && <Sign at={[0, 0, 0]} kind={sign} size={r * 1.5} opacity={dim} />}
  </group>
}

/** 闸刀开关：胶木底座、两只铜夹、一把带绝缘柄的铜刀。closed 是合上的程度（0 拉开，1 合上）。底面在 y = 0，刀沿 x 方向 */
export function Knife({ closed }: { closed: number }) {
  return <group>
    <RoundedBox args={[0.11, 0.012, 0.04]} radius={0.003} position={[0, 0.006, 0]} castShadow receiveShadow><Bakelite /></RoundedBox>
    {[-0.035, 0.035].map(x => <mesh key={x} position={[x, 0.022, 0]} castShadow><boxGeometry args={[0.008, 0.022, 0.014]} /><Metal kind="copper" grain="brushed" /></mesh>)}
    <group position={[-0.035, 0.028, 0]} rotation-z={(1 - closed) * 0.9}>
      <mesh position={[0.04, 0, 0]} castShadow><boxGeometry args={[0.086, 0.01, 0.003]} /><Metal kind="copper" grain="brushed" /></mesh>
      <mesh position={[0.092, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.007, 0.007, 0.03, 16]} /><Bakelite color="#7a1f1a" /></mesh>
    </group>
  </group>
}
