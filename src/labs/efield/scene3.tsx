// 静电场 · 第 3 课 电场线的器材：黑色底座上一只浅玻璃盘，盛着蓖麻油，油面上撒了头发屑。盘上方一根有机玻璃横梁，
// 电极从横梁上垂下来插进油里；横梁两头的接线柱接高压电源。接通高压，头发屑沿电场线排开：这里把它们连成线画出来，
// 线上的箭头表示电场的方向。中点处一只小圈是读场强的位置。
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Metal, disc, shell } from '@/lab-kit'
import { ST, TOP } from './layout'
import { DISH, LAYOUTS, fieldLines, hairDir, type Layout, type V3 } from './physics'
import { rng } from './mats'
import { FieldLines, Sign } from './fx'
import { Acrylic, Bakelite, Cable, GlassMat, Supply } from './gear'

/** 油面的高度、横梁的高度（从台面算起） */
export const R3 = { oil: 0.038, bar: 0.13 }
/** 盘里的平面坐标 → 场景里的位置 */
export const inDish = (p: [number, number], y = R3.oil + 0.002): V3 => [p[0], y, -p[1]]

/** 油面上的头发屑：几百根短短的细丝。没通电时方向杂乱；通电后各自转到当地电场的方向（level 是转过去的程度） */
function Hair({ layout, level, y }: { layout: Layout; level: number; y: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), N = 520
  const bits = useMemo(() => { const r = rng(21); return Array.from({ length: N }, () => { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.15; return { p: [d * Math.cos(a), d * Math.sin(a)] as [number, number], rot: r() * Math.PI, len: 0.6 + r() * 0.8 } }) }, [])
  useLayoutEffect(() => {
    const im = ref.current; if (!im) return
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3()
    bits.forEach((b, i) => {
      const d = hairDir(layout, b.p)
      let a = b.rot
      if (d) { let to = Math.atan2(d[1], d[0]); to += Math.round((a - to) / Math.PI) * Math.PI; a += (to - a) * level * level * (3 - 2 * level) }   // 头发屑没有头尾，转最近的那一边
      m.compose(v.set(b.p[0], y, -b.p[1]), q.setFromEuler(e.set(0, a, 0)), s.set(b.len, 1, 1)); im.setMatrixAt(i, m)
    })
    im.instanceMatrix.needsUpdate = true
  }, [bits, layout, level, y])
  return <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}><boxGeometry args={[0.0075, 0.0006, 0.0009]} /><meshStandardMaterial color="#e9dcc0" roughness={0.8} /></instancedMesh>
}

/** layout：电极的摆法；level：电场线显出来的程度（0–1）；mark：中点的小圈 */
export function Rig3({ layout = 'dipole', level = 1, mark = [0, 0] }: { layout?: Layout; level?: number; mark?: [number, number] }) {
  const geo = useMemo(() => ({ dish: shell([[0, 0], [0.158, 0], [0.165, 0.008], [0.165, 0.036]], 0.004, { segs: 72 }), oil: disc(0.16, 0.012, { chamfer: 0.001, segs: 72 }), post: disc(0.009, R3.bar - 0.004, { chamfer: 0.001, segs: 20 }) }), [])
  const lines = useMemo(() => fieldLines(layout).map(l => l.filter((_, i) => i % 2 === 0 || i === l.length - 1).map(p => inDish(p, R3.oil - 0.02 + 0.0016))), [layout])
  const cs = LAYOUTS[layout].charges, y0 = 0.02
  return <group position={[ST.l3, TOP, 0]}>
    {/* 底座：黑色的铝板，四角各一只调平脚 */}
    <RoundedBox args={[0.46, 0.018, 0.4]} radius={0.005} smoothness={3} position={[0, 0.011, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#15181b" roughness={0.5} clearcoat={0.3} /></RoundedBox>
    <group position={[0, y0, 0]}>
      <mesh geometry={geo.oil} position={[0, 0.005, 0]}><meshPhysicalMaterial color="#6b4a12" transparent opacity={0.8} roughness={0.08} clearcoat={1} /></mesh>
      <Hair layout={layout} level={level} y={R3.oil - y0 + 0.0008} />
      <FieldLines lines={lines} level={level * 0.85} r={0.0011} head={0.011} heads={layout === 'plates' ? 2 : 1} />
      <mesh position={inDish(mark, R3.oil - y0 + 0.003)} rotation-x={Math.PI / 2}><torusGeometry args={[0.006, 0.0009, 8, 28]} /><meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={level} /></mesh>
      <mesh geometry={geo.dish} renderOrder={9}><GlassMat opacity={0.2} /></mesh>
    </group>
    {/* 横梁和两根立柱 */}
    {[-0.205, 0.205].map(x => <mesh key={x} geometry={geo.post} position={[x, y0, 0]} castShadow><Metal kind="chrome" /></mesh>)}
    <RoundedBox args={[0.45, 0.012, 0.03]} radius={0.003} position={[0, y0 + R3.bar, 0]} castShadow><Acrylic opacity={0.5} /></RoundedBox>
    {[-0.19, 0.19].map(x => <mesh key={x} position={[x, y0 + R3.bar + 0.013, 0]} castShadow><cylinderGeometry args={[0.006, 0.007, 0.014, 16]} /><Bakelite color={x < 0 ? '#c4302a' : '#1c1d1f'} /></mesh>)}
    {/* 电极：点电极是黄铜细棒，平行板是两条黄铜片 */}
    {layout !== 'plates' && cs.map((c, i) => <group key={i} position={[c.p[0], 0, 0]}>
      <mesh position={[0, y0 + (R3.bar + 0.012) / 2, 0]} castShadow><cylinderGeometry args={[0.0035, 0.0035, R3.bar - 0.012, 16]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh position={[0, y0 + 0.02, 0]}><sphereGeometry args={[0.007, 20, 16]} /><Metal kind="brass" /></mesh>
      <Sign at={[0, y0 + R3.bar + 0.03, 0]} kind={c.q > 0 ? '+' : '−'} size={0.026} />
    </group>)}
    {layout === 'plates' && [-1, 1].map(s => <group key={s} position={[s * (DISH.d / 2 + 0.002), 0, 0]}>
      <mesh position={[0, y0 + (R3.bar + 0.03) / 2, 0]} castShadow><cylinderGeometry args={[0.003, 0.003, R3.bar - 0.03, 12]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh position={[0, y0 + 0.024, 0]} castShadow><boxGeometry args={[0.003, 0.034, DISH.w]} /><Metal kind="brass" grain="brushed" /></mesh>
      <Sign at={[0, y0 + R3.bar + 0.03, 0]} kind={s < 0 ? '+' : '−'} size={0.026} />
    </group>)}
    {/* 高压电源和两根导线 */}
    <group position={[-0.5, 0, -0.16]} rotation-y={0.3}><Supply text={level > 0.02 ? '5.0 kV' : '0.0 kV'} /></group>
    <Cable pts={[[-0.19, y0 + R3.bar + 0.02, 0], [-0.26, y0 + R3.bar + 0.03, -0.04], [-0.36, 0.05, -0.02], [-0.44, 0.045, -0.045]]} />
    <Cable color="#1c1d1f" pts={[[0.19, y0 + R3.bar + 0.02, 0], [0.2, y0 + R3.bar + 0.05, -0.1], [-0.1, 0.012, -0.24], [-0.36, 0.03, -0.1], [-0.4, 0.045, -0.058]]} />
  </group>
}
