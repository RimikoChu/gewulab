// 静电场 · 第 1 课 库仑定律的器材：一台库仑扭秤。玻璃圆筒里，一根细银丝吊着一根横杆，杆的一头是镀金小球 A，另一头是配重片；
// 小球 C 装在一根绝缘杆上，从盖板的弧形槽伸进筒里，可以沿槽推近。筒顶的细玻璃管上是悬丝头：一只刻度盘和一只旋钮。
// A 被 C 推开以后，转旋钮把它拉回原位，旋钮转过的角度和力成正比。另有一只不带电的同样小球 D，放下来碰一下 C，C 的电荷量就减半。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { COL, ST, TOP } from './layout'
import { makeDegrees, makeDial } from './mats'
import { TORSION, type V3 } from './physics'
import { Arrow } from './fx'
import { Acrylic, Bakelite, Ball, GlassMat, Supply } from './gear'

/** 横杆的高度（从台面算起）、小球到转轴的距离、小球半径 */
export const R1 = { y: 0.17, arm: 0.10, ball: 0.016, head: 0.39 }
/** 弦长 r 对应的圆心角（rad）：两球都在半径 arm 的圆上 */
export const chordAngle = (r: number) => 2 * Math.asin(r / (2 * R1.arm))
/** 圆上角度 a 处的位置（a 从 +x 起，朝 +z 转） */
export const onRing = (a: number, y = R1.y): V3 => [R1.arm * Math.cos(a), y, R1.arm * Math.sin(a)]

/** charged：两球带了电；r：两球的球心距离；half：C 的电荷量减半了；dip：D 球放下来的程度（0–1）；twistDeg：旋钮转过的角度；kick：A 被推开的角度（rad）；F：力（N） */
export function Rig1({ charged = false, r = TORSION.r0, half = false, dip = 0, twistDeg = 0, kick = 0, F = 0 }: { charged?: boolean; r?: number; half?: boolean; dip?: number; twistDeg?: number; kick?: number; F?: number }) {
  const geo = useMemo(() => ({
    base: lathe([[0, 0], [0.175, 0], [0.175, 0.012], [0.168, 0.02], [0, 0.02]], { segs: 72 }),
    foot: lathe([[0, 0], [0.016, 0], [0.018, 0.004], [0.012, 0.012], [0, 0.012]]),
    jar: shell([[0.15, 0], [0.15, 0.3]], 0.004, { segs: 72 }), lid: disc(0.156, 0.006, { hole: 0.017, segs: 72 }),
    tube: shell([[0.02, 0], [0.02, 0.07]], 0.003), collar: disc(0.028, 0.014, { hole: 0.004 }), dial: disc(0.05, 0.004, { segs: 64 }),
    knob: lathe([[0, 0], [0.017, 0], [0.017, 0.016], [0.014, 0.02], [0.006, 0.021], [0.006, 0.03], [0, 0.03]]),
    cap: lathe([[0, 0], [0.007, 0], [0.008, 0.004], [0.006, 0.012], [0, 0.012]]),
  }), [])
  const deg = useMemo(() => { const t = makeDegrees().clone(); t.repeat.set(1, 1); t.needsUpdate = true; return t }, [])
  const dial = makeDial()
  const phi = chordAngle(r), A = onRing(-kick), C = onRing(phi), dA = phi + 2.2 * R1.ball / R1.arm
  const D: V3 = onRing(dA, R1.y + (1 - dip) * 0.115)
  const away = (a: V3, b: V3): V3 => [a[0] - b[0], 0, a[2] - b[2]]
  const len = 0.022 + Math.min(1, F / 5.76e-3) * 0.07
  return <group position={[ST.l1, TOP, 0]}>
    <mesh geometry={geo.base} castShadow receiveShadow><Bakelite color="#2a211a" /></mesh>
    {[0.5, 2.6, 4.7].map(a => <mesh key={a} geometry={geo.foot} position={[0.16 * Math.cos(a), -0.0, 0.16 * Math.sin(a)]}><Metal kind="brass" grain="turned" /></mesh>)}
    {/* 筒里的东西：银丝、横杆、A 球和配重片 */}
    <mesh position={[0, (R1.y + R1.head) / 2, 0]}><cylinderGeometry args={[0.0008, 0.0008, R1.head - R1.y, 6]} /><Metal kind="chrome" /></mesh>
    <group position={[0, R1.y, 0]} rotation-y={kick}>
      <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.003, 0.003, R1.arm * 2, 12]} /><meshStandardMaterial color="#d9c48f" roughness={0.5} /></mesh>
      <mesh position={[0, 0.004, 0]}><cylinderGeometry args={[0.004, 0.004, 0.012, 12]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh position={[-R1.arm, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.02, 0.02, 0.0014, 24]} /><meshStandardMaterial color="#e9e3cf" roughness={0.8} side={THREE.DoubleSide} /></mesh>
    </group>
    <Ball at={A} r={R1.ball} sign={charged ? '+' : null} />
    {/* C 球：装在绝缘杆上，从盖板伸进来 */}
    <Ball at={C} r={R1.ball} sign={charged ? '+' : null} dim={half ? 0.55 : 1} />
    <mesh position={[C[0], (R1.y + 0.36) / 2 + R1.ball / 2, C[2]]}><cylinderGeometry args={[0.003, 0.003, 0.36 - R1.y - R1.ball, 12]} /><Acrylic /></mesh>
    <mesh geometry={geo.cap} position={[C[0], 0.36, C[2]]}><Bakelite /></mesh>
    {/* D 球：不带电的同样小球，放下来碰一下 C */}
    <Ball at={D} r={R1.ball} sign={half && dip > 0.05 ? '+' : null} dim={0.55} />
    <mesh position={[D[0], D[1] + 0.09, D[2]]}><cylinderGeometry args={[0.003, 0.003, 0.18 - R1.ball, 12]} /><Acrylic /></mesh>
    <mesh geometry={geo.cap} position={[D[0], D[1] + 0.18, D[2]]}><Bakelite color="#7a1f1a" /></mesh>
    {/* 玻璃筒、刻度纸带、盖板、细玻璃管 */}
    <mesh position={[0, 0.02 + 0.105, 0]}><cylinderGeometry args={[0.1508, 0.1508, 0.018, 72, 1, true]} /><meshStandardMaterial map={deg} roughness={0.8} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={geo.jar} position={[0, 0.02, 0]} renderOrder={9}><GlassMat opacity={0.1} /></mesh>
    <mesh geometry={geo.lid} position={[0, 0.32, 0]} renderOrder={9}><GlassMat opacity={0.1} /></mesh>
    <mesh geometry={geo.tube} position={[0, 0.326, 0]} renderOrder={9}><GlassMat opacity={0.15} /></mesh>
    {/* 悬丝头：黄铜套环、刻度盘、带指针的旋钮 */}
    <mesh geometry={geo.collar} position={[0, R1.head, 0]} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh geometry={geo.dial} position={[0, R1.head + 0.014, 0]} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[0, R1.head + 0.0185, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.048, 64]} /><meshStandardMaterial map={dial} roughness={0.7} /></mesh>
    <group position={[0, R1.head + 0.019, 0]} rotation-y={-twistDeg * Math.PI / 180}>
      <mesh geometry={geo.knob} castShadow><Metal kind="brass" grain="turned" /></mesh>
      <mesh position={[0, 0.003, -0.028]}><boxGeometry args={[0.003, 0.002, 0.034]} /><meshStandardMaterial color="#b3261e" roughness={0.5} /></mesh>
    </group>
    {/* 两球之间的斥力 */}
    {charged && F > 0 && <><Arrow from={A} dir={away(A, C)} len={len} color={COL.F} thick={0.07} /><Arrow from={C} dir={away(C, A)} len={len} color={COL.F} thick={0.07} /></>}
    {/* 台面左后方：给小球带电用的高压电源 */}
    <group position={[-0.47, 0, -0.27]} rotation-y={0.2}><Supply text={charged ? '5.0 kV' : '0.0 kV'} name="起电电源" w={0.2} h={0.1} d={0.16} /></group>
  </group>
}
