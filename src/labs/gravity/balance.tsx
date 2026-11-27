// 精密测量实验室和卡文迪什扭秤。1 单位 = 1 m。
// 扭秤：黄铜框架顶上的扭头吊着一根石英丝，丝下挂 T 形架（1.8 m 的细杆两头各一个 0.73 kg 小铅球），架中间粘一面小镜子；
// 两个 158 kg 大铅球装在可以绕同一竖轴转的支架上；光源打到小镜子上，反射光落在 5 m 外的刻度尺上（光杠杆）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Metal, disc, lathe, useConcrete } from '@/lab-kit'
import { BAL } from './physics'

/** 铅球半径：ρ铅 = 1.134 × 10⁴ kg/m³ */
const lead = (m: number) => Math.cbrt(m / 11340 / (4 / 3 * Math.PI))
export const BIG_R = lead(BAL.M), SMALL_R = lead(BAL.m)
/** 小球、镜子离地的高度 */
export const BAR_Y = 1.55
/** 大球支架在 A、B 两侧时转到的角度：大球正好贴在小球一侧，球心距 r */
export const ARM_A = Math.atan2(BAL.r, BAL.L / 2)
export const ARM_R = Math.hypot(BAL.L / 2, BAL.r)
/** 刻度尺在镜子正对的 D 处（−z 方向，靠后墙） */
export const SCALE_Z = -BAL.D

/** 房间：浅灰的墙、水磨石地面、顶上一排灯，只画朝里的面 */
export function Room() {
  const [d, n, r] = useConcrete(6, 6)
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} receiveShadow><planeGeometry args={[14, 14]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#9a9e9f" roughness={0.6} /></mesh>
      <mesh position={[0, 2.6, 0]}><boxGeometry args={[14, 5.2, 14]} /><meshStandardMaterial color="#2b3036" roughness={0.9} side={THREE.BackSide} /></mesh>
      {/* 墙裙 */}
      <mesh position={[0, 0.6, -6.99]}><planeGeometry args={[14, 1.2]} /><meshStandardMaterial color="#1f2328" roughness={0.8} /></mesh>
      <Blackboard />
      <Cabinet />
      {[-3, 0, 3].map(x => <mesh key={x} position={[x, 5.15, 0]}><boxGeometry args={[0.3, 0.05, 6]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} /></mesh>)}
    </group>
  )
}

/** 后墙上的黑板：木框、粉笔槽，写着万有引力定律和扭秤的草图 */
function Blackboard() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 400
    const g = c.getContext('2d')!
    g.fillStyle = '#1f3a2e'; g.fillRect(0, 0, 1024, 400)
    let sd = 9; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`; g.fillRect(rnd() * 1024, rnd() * 400, 30 + rnd() * 140, 6 + rnd() * 18) }   // 擦过的粉笔印
    g.fillStyle = 'rgba(240,240,232,0.9)'; g.font = 'italic 64px "Times New Roman", serif'
    g.fillText('F = G m₁m₂ / r²', 60, 120)
    g.font = 'italic 44px "Times New Roman", serif'; g.fillText('κθ = F·L', 60, 210); g.fillText('G = κθ r² / (L M m)', 60, 290)
    g.strokeStyle = 'rgba(240,240,232,0.85)'; g.lineWidth = 4
    g.beginPath(); g.moveTo(700, 60); g.lineTo(700, 220); g.moveTo(560, 220); g.lineTo(840, 220); g.stroke()
    for (const [x, y, r] of [[560, 220, 14], [840, 220, 14], [600, 270, 34], [800, 170, 34]] as [number, number, number][]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke() }
    g.font = '30px sans-serif'; g.fillStyle = 'rgba(240,240,232,0.7)'; g.fillText('石英丝', 715, 110)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [])
  return (
    <group position={[-2.2, 2.4, -6.96]}>
      <mesh><planeGeometry args={[3.8, 1.48]} /><meshStandardMaterial map={tex} roughness={0.95} /></mesh>
      {[[0, 0.79, 3.96, 0.1], [0, -0.79, 3.96, 0.1], [1.95, 0, 0.1, 1.68], [-1.95, 0, 0.1, 1.68]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0.03]}><boxGeometry args={[w, h, 0.06]} /><meshStandardMaterial color="#6b4a2f" roughness={0.7} /></mesh>)}
      <mesh position={[0, -0.86, 0.08]}><boxGeometry args={[3.6, 0.04, 0.12]} /><meshStandardMaterial color="#6b4a2f" roughness={0.7} /></mesh>
      {[-1.2, -1.1, 0.4].map((x, i) => <mesh key={i} position={[x, -0.82, 0.1]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.09, 8]} /><meshStandardMaterial color="#f2f0e8" roughness={0.9} /></mesh>)}
    </group>
  )
}
/** 左墙边的仪器柜：钢板柜体、玻璃门、四层隔板，摆着砝码盒、黄铜仪器、量筒 */
function Cabinet() {
  return (
    <group position={[-6.55, 0, -3.2]} rotation-y={Math.PI / 2}>
      {/* 柜体：背板、两侧、顶底 */}
      <mesh position={[0, 1.1, -0.34]}><boxGeometry args={[1.8, 2.2, 0.04]} /><meshStandardMaterial color="#c9ccc8" roughness={0.6} metalness={0.2} /></mesh>
      {[-0.9, 0.9].map(x => <mesh key={x} position={[x, 1.1, 0]}><boxGeometry args={[0.04, 2.2, 0.7]} /><meshStandardMaterial color="#c9ccc8" roughness={0.6} metalness={0.2} /></mesh>)}
      {[0.02, 0.55, 1.08, 1.61, 2.18].map(y => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[1.8, 0.04, 0.7]} /><meshStandardMaterial color="#bfc2be" roughness={0.6} metalness={0.2} /></mesh>)}
      {/* 玻璃门和门框 */}
      {[-0.45, 0.45].map(x => <group key={x} position={[x, 1.1, 0.36]}>
        <mesh><boxGeometry args={[0.88, 2.16, 0.012]} /><meshPhysicalMaterial color="#dfe9ee" transparent opacity={0.16} roughness={0.05} metalness={0} envMapIntensity={1.6} depthWrite={false} /></mesh>
        {[[0, 1.06, 0.88, 0.04], [0, -1.06, 0.88, 0.04], [0.42, 0, 0.04, 2.16], [-0.42, 0, 0.04, 2.16]].map(([a, b, w, h], i) => <mesh key={i} position={[a, b, 0]}><boxGeometry args={[w, h, 0.03]} /><meshStandardMaterial color="#9fa3a0" metalness={0.5} roughness={0.4} /></mesh>)}
        <mesh position={[x > 0 ? -0.36 : 0.36, 0, 0.03]}><boxGeometry args={[0.02, 0.18, 0.03]} /><Metal kind="chrome" /></mesh>
      </group>)}
      {/* 架上的东西 */}
      <mesh position={[-0.45, 0.68, 0]}><boxGeometry args={[0.5, 0.22, 0.3]} /><meshStandardMaterial color="#5a3a26" roughness={0.6} /></mesh>
      {[0.1, 0.25, 0.38].map((x, i) => <mesh key={i} position={[x, 0.57 + 0.09 + i * 0.02, 0]}><cylinderGeometry args={[0.05 - i * 0.01, 0.05 - i * 0.01, 0.18 + i * 0.04, 20]} /><Metal kind="brass" grain="turned" /></mesh>)}
      {[-0.6, -0.4, -0.2].map((x, i) => <mesh key={i} position={[x, 1.1 + 0.16, 0.05]}><cylinderGeometry args={[0.035, 0.035, 0.32, 16, 1, true]} /><meshPhysicalMaterial color="#e6f0f4" transparent opacity={0.3} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
      <mesh position={[0.35, 1.25, 0]}><sphereGeometry args={[0.13, 24, 16]} /><meshStandardMaterial color="#5b5f63" metalness={0.7} roughness={0.45} /></mesh>
      <mesh position={[0, 1.78, 0]}><boxGeometry args={[1.2, 0.3, 0.4]} /><meshStandardMaterial color="#2e3a44" roughness={0.5} /></mesh>
      <mesh position={[0, 1.78, 0.205]}><planeGeometry args={[0.3, 0.12]} /><meshBasicMaterial color="#7dffb0" toneMapped={false} /></mesh>
    </group>
  )
}

/** 扭秤。arm：大球支架的转角（弧度，0 是 A 侧）；twist：T 形架的扭转角（弧度） */
export function Balance({ arm, twist }: { arm: number; twist: number }) {
  const big = useMemo(() => new THREE.SphereGeometry(BIG_R, 48, 32), [])
  const knob = useMemo(() => lathe([[0, 0], [0.05, 0], [0.06, 0.01], [0.06, 0.05], [0.04, 0.06], [0.015, 0.07], [0.015, 0.12], [0, 0.12]], { segs: 32 }), [])
  const base = useMemo(() => disc(0.42, 0.06), [])
  const H = 3.2   // 扭头的高度
  return (
    <group>
      {/* 石墩：防震的独立基座 */}
      <RoundedBox args={[2.9, 0.9, 1.3]} radius={0.03} position={[0, 0.45, 0]} castShadow receiveShadow><meshStandardMaterial color="#8a8780" roughness={0.85} /></RoundedBox>
      <mesh geometry={base} position={[0, 0.9, 0]}><Metal kind="iron" grain="cast" /></mesh>
      {/* 黄铜龙门架：两根立柱、顶梁、扭头 */}
      {[1, -1].map(s => <group key={s} position={[s * 1.3, 0.9, 0]}>
        <mesh position={[0, (H - 0.9) / 2, 0]} castShadow><cylinderGeometry args={[0.03, 0.035, H - 0.9, 16]} /><Metal kind="brass" grain="turned" /></mesh>
        <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.09, 0.11, 0.06, 24]} /><Metal kind="brass" grain="turned" /></mesh>
      </group>)}
      <mesh position={[0, H, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.035, 0.035, 2.68, 16]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh geometry={knob} position={[0, H - 0.08, 0]} rotation-x={Math.PI}><Metal kind="brass" grain="turned" /></mesh>
      {/* 石英丝：极细，画成亮的细线 */}
      <mesh position={[0, (H - 0.2 + BAR_Y) / 2, 0]}><cylinderGeometry args={[0.0018, 0.0018, H - 0.2 - BAR_Y, 6]} /><meshBasicMaterial color="#eaf6ff" toneMapped={false} /></mesh>
      {/* T 形架：细杆、两头的小铅球、中间的镜子 */}
      <group position={[0, BAR_Y, 0]} rotation-y={twist}>
        <mesh rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.006, 0.006, BAL.L, 10]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.004, 0.004, 0.1, 8]} /><Metal kind="aluminum" /></mesh>
        {[1, -1].map(s => <mesh key={s} position={[s * BAL.L / 2, 0, 0]} castShadow><sphereGeometry args={[SMALL_R, 32, 24]} /><meshStandardMaterial color="#6d7175" metalness={0.75} roughness={0.38} /></mesh>)}
        {/* 小镜子：朝 −z（刻度尺那边） */}
        <mesh position={[0, 0.03, -0.006]}><boxGeometry args={[0.05, 0.04, 0.004]} /><meshStandardMaterial color="#e8eef4" metalness={1} roughness={0.02} envMapIntensity={2} /></mesh>
      </group>
      {/* 大球的转臂：从底座中心的转轴伸出，两头各托一个大球 */}
      <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.05, 0.07, 0.1, 20]} /><Metal kind="steel" grain="turned" /></mesh>
      <group rotation-y={arm}>
        <mesh position={[0, 1.0, 0]} rotation-z={Math.PI / 2}><boxGeometry args={[0.06, ARM_R * 2 + 0.1, 0.06]} /><Metal kind="steel" grain="brushed" /></mesh>
        {[1, -1].map(s => (
          <group key={s} position={[s * ARM_R, 0, 0]}>
            <mesh position={[0, 1.0 + (BAR_Y - BIG_R - 1.0) / 2, 0]}><cylinderGeometry args={[0.025, 0.025, BAR_Y - BIG_R - 1.0, 12]} /><Metal kind="steel" grain="turned" /></mesh>
            <mesh position={[0, BAR_Y - BIG_R + 0.01, 0]}><cylinderGeometry args={[0.07, 0.05, 0.03, 20]} /><Metal kind="steel" /></mesh>
            <mesh geometry={big} position={[0, BAR_Y, 0]} castShadow><meshStandardMaterial color="#5b5f63" metalness={0.7} roughness={0.45} /></mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

/** 光源（左前方）和刻度尺（正前方 5 m 处）。spot：光点在尺上离零点的位置（m） */
export function Lever({ spot, lamp }: { spot: number; lamp: THREE.Vector3 }) {
  const ruler = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 160
    const g = c.getContext('2d')!
    g.fillStyle = '#f2efe4'; g.fillRect(0, 0, 2048, 160)
    g.fillStyle = '#1d2327'; g.font = '700 46px ui-monospace, Menlo, monospace'; g.textAlign = 'center'
    for (let mm = -200; mm <= 200; mm += 2) {
      const x = 1024 + mm * 5, big = mm % 20 === 0, mid = mm % 10 === 0
      g.fillRect(x - 1.5, 0, 3, big ? 70 : mid ? 48 : 26)
      if (big) g.fillText(String(Math.abs(mm / 10)), x, 120)
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [])
  const mirror = new THREE.Vector3(0, BAR_Y + 0.03, 0)
  const hit = new THREE.Vector3(spot, BAR_Y + 0.03, SCALE_Z + 0.003)
  const beam = (a: THREE.Vector3, b: THREE.Vector3, w: number, o: number) => {
    const mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    return <mesh position={mid} quaternion={q} raycast={() => null}><cylinderGeometry args={[w, w, len, 8, 1, true]} /><meshBasicMaterial color="#ff5a3c" transparent opacity={o} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
  }
  return (
    <group>
      {/* 刻度尺：0.4 m 长，装在立架上 */}
      <group position={[0, BAR_Y + 0.03, SCALE_Z]}>
        <mesh><planeGeometry args={[0.4, 0.032]} /><meshStandardMaterial map={ruler} roughness={0.6} /></mesh>
        <mesh position={[0, 0, -0.012]}><boxGeometry args={[0.44, 0.06, 0.02]} /><meshStandardMaterial color="#2a2d31" roughness={0.6} /></mesh>
        <mesh position={[0, -(BAR_Y + 0.03) / 2, -0.03]}><cylinderGeometry args={[0.015, 0.02, BAR_Y + 0.03, 12]} /><Metal kind="steel" grain="brushed" /></mesh>
        <mesh position={[0, -BAR_Y - 0.02, -0.03]}><cylinderGeometry args={[0.18, 0.2, 0.03, 24]} /><Metal kind="iron" grain="cast" /></mesh>
      </group>
      {/* 光点 */}
      <mesh position={hit}><circleGeometry args={[0.006, 20]} /><meshBasicMaterial color="#ff8a6a" toneMapped={false} side={THREE.DoubleSide} /></mesh>
      {/* 光源：小灯筒 */}
      <group position={lamp}>
        <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.05, 0.06, 0.22, 20]} /><Metal kind="iron" grain="cast" /></mesh>
        <mesh position={[0, -(lamp.y) / 2, 0]}><cylinderGeometry args={[0.015, 0.02, lamp.y, 10]} /><Metal kind="steel" /></mesh>
        <mesh position={[0, -lamp.y + 0.015, 0]}><cylinderGeometry args={[0.14, 0.16, 0.03, 20]} /><Metal kind="iron" grain="cast" /></mesh>
      </group>
      {beam(lamp, mirror, 0.004, 0.5)}
      {beam(mirror, hit, 0.004, 0.65)}
    </group>
  )
}
