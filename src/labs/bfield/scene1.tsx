// 带电粒子在磁场中 · 第 1 课 安培力的器材：实验台上一块大蹄形磁体（红色 N、蓝色 S，开口朝前，两极一上一下），
// 铁架台的横杆上用两根软导线吊着一根铜棒，铜棒横穿两极之间；右边一台学生电源；左边一只左手比着左手定则。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc } from '@/lab-kit'
import { COL, ST, TOP } from './layout'
import { makeText } from './mats'
import { AMP, type V3 } from './physics'
import { Bench, Post, RED, RuleHand, Supply, Wire, supplyPosts } from './gear'
import { Arrow, FieldLines, spotsIn } from './fx'
import { swing } from './anim'

/** 器材的位置（m，以这一课的台子中心为原点） */
export const R1 = {
  gapY: TOP + 0.11,              // 两极之间的中心高度
  hangY: TOP + 0.37,             // 横杆的高度（软导线的吊点）
  rod: 0.22,                     // 铜棒的长度（在磁场里的一段是 AMP.L）
  supply: [0.5, TOP, 0.1] as V3,
  hand: [-0.31, TOP + 0.13, 0.08] as V3,
}
const WIRE_L = R1.hangY - R1.gapY

/** U 形磁体的一半（上臂或下臂）：在 z–y 平面里画出截面，沿 x 拉出 0.10 m 的宽 */
function armGeo(top: boolean) {
  const s = new THREE.Shape(), y0 = 0.08, k = top ? 1 : -1, Y = (v: number) => y0 + k * v
  // 后背是一段圆弧（外半径 0.08、内半径 0.03），前面两条直臂
  s.moveTo(-0.12, Y(0)); s.lineTo(-0.12, Y(0.03)); s.lineTo(0.05, Y(0.03)); s.lineTo(0.05, Y(0.08)); s.lineTo(-0.12, Y(0.08))
  for (let i = 1; i <= 12; i++) { const a = Math.PI / 2 + i / 12 * Math.PI / 2; s.lineTo(-0.12 + 0.08 * Math.cos(a), y0 + k * 0.08 * Math.sin(a)) }
  const g = new THREE.ExtrudeGeometry(s, { depth: AMP.L - 0.006, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 10 })
  g.rotateY(-Math.PI / 2); g.translate((AMP.L - 0.006) / 2, 0, 0)
  return g
}

/** 蹄形磁体：flip 从 0 到 1 时先往后撤、绕前后方向转半圈、再推回来（对调磁极） */
function Horseshoe({ flip }: { flip: number }) {
  const geo = useMemo(() => ({ top: armGeo(true), bot: armGeo(false) }), [])
  const nTex = makeText(['N'], { w: 128, h: 128, bg: 'transparent', fg: '#f6f2e8', size: 92, weight: 800 }), sTex = makeText(['S'], { w: 128, h: 128, bg: 'transparent', fg: '#f6f2e8', size: 92, weight: 800 })
  const phase = Math.floor(flip) % 2, f = flip - Math.floor(flip)
  const back = f < 0.33 ? f / 0.33 : f < 0.67 ? 1 : 1 - (f - 0.67) / 0.33, rot = (phase + (f < 0.33 ? 0 : f < 0.67 ? (f - 0.33) / 0.34 : 1)) * Math.PI
  const red = <meshPhysicalMaterial color="#c4342b" roughness={0.32} clearcoat={0.7} clearcoatRoughness={0.2} />
  const blue = <meshPhysicalMaterial color="#2c57a5" roughness={0.32} clearcoat={0.7} clearcoatRoughness={0.2} />
  return <group position={[0, 0, -0.22 * back]}>
    <group position={[0, R1.gapY, 0]} rotation-z={rot}>
      <group position={[0, -0.08, 0]}>
        <mesh geometry={geo.top} castShadow receiveShadow>{red}</mesh>
        <mesh geometry={geo.bot} castShadow receiveShadow>{blue}</mesh>
        {/* 两极的端面是磨亮的钢，两侧印着 N、S */}
        <mesh position={[0, 0.1095, -0.035]} rotation-x={Math.PI / 2}><planeGeometry args={[AMP.L - 0.01, 0.16]} /><Metal kind="steel" grain="brushed" /></mesh>
        <mesh position={[0, 0.0505, -0.035]} rotation-x={-Math.PI / 2}><planeGeometry args={[AMP.L - 0.01, 0.16]} /><Metal kind="steel" grain="brushed" /></mesh>
        {[1, -1].map(s => <group key={s}>
          <mesh position={[s * (AMP.L / 2 + 0.0002), 0.135, 0.02]} rotation-y={s * Math.PI / 2}><planeGeometry args={[0.04, 0.04]} /><meshBasicMaterial map={nTex} transparent /></mesh>
          <mesh position={[s * (AMP.L / 2 + 0.0002), 0.025, 0.02]} rotation-y={s * Math.PI / 2}><planeGeometry args={[0.04, 0.04]} /><meshBasicMaterial map={sTex} transparent /></mesh>
        </group>)}
      </group>
    </group>
  </group>
}

/** 铁架台：铸铁底座、镀铬立杆、十字夹、横杆；横杆两端一对绝缘夹，软导线从这里吊下来 */
function Stand() {
  const base = useMemo(() => disc(0.05, 0.016), [])
  return <group>
    {[-1, 1].map(s => <group key={s} position={[s * 0.19, TOP, -0.02]}>
      <RoundedBox args={[0.1, 0.018, 0.16]} radius={0.005} smoothness={2} position={[0, 0.009, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <mesh geometry={base} position={[0, 0.018, 0]} scale={[0.3, 0.4, 0.3]}><Metal kind="iron" grain="cast" /></mesh>
      <mesh position={[0, 0.22, 0]} castShadow><cylinderGeometry args={[0.0055, 0.0055, 0.42, 16]} /><Metal kind="stainless" grain="turned" /></mesh>
      <RoundedBox args={[0.026, 0.026, 0.026]} radius={0.004} smoothness={2} position={[0, R1.hangY - TOP, 0]} castShadow><Metal kind="aluminum" grain="cast" /></RoundedBox>
      <mesh position={[0.016 * s, R1.hangY - TOP, 0.013]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.005, 0.005, 0.012, 12]} /><Metal kind="steel" grain="turned" /></mesh>
    </group>)}
    <mesh position={[0, R1.hangY, -0.02]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.005, 0.005, 0.44, 16]} /><Metal kind="stainless" grain="turned" /></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * R1.rod / 2, R1.hangY, -0.02]}>
      <RoundedBox args={[0.022, 0.03, 0.022]} radius={0.004} smoothness={2} castShadow><meshPhysicalMaterial color="#e9e5da" roughness={0.3} clearcoat={0.6} /></RoundedBox>
      <Post at={[0, 0.015, 0]} color={s < 0 ? RED : '#1c1d1f'} />
    </group>)}
  </group>
}

/**
 * on：开关闭合；I：电流（A），cur：电流沿 +x（+1）或 −x；side：安培力朝前（+1）或朝后；
 * theta：目标偏角（弧度）；flip：对调磁极的进度（每对调一次加 1）；field：磁场竖直向下（+1）或向上；hand：左手定则的手显示多少
 */
export function Rig1({ on = false, I = 1, cur = -1, side = 1, theta = 0, flip = 0, field = 1, hand = 0 }: { on?: boolean; I?: number; cur?: 1 | -1; side?: 1 | -1; theta?: number; flip?: number; field?: 1 | -1; hand?: number }) {
  const pivot = useRef<THREE.Group>(null), tag = useRef<THREE.Group>(null), st = useRef({ a: 0, v: 0 })
  const goal = useRef(0); goal.current = on ? theta * side : 0
  useFrame((_, d) => {
    const a = swing(st.current, goal.current, Math.min(d, 1 / 30))
    if (pivot.current) pivot.current.rotation.x = -a
    if (tag.current) tag.current.position.set(0, R1.hangY - WIRE_L * Math.cos(a), -0.02 + WIRE_L * Math.sin(a))
  })
  const P = supplyPosts(), sp: V3 = [R1.supply[0], R1.supply[1], R1.supply[2]]
  const plus: V3 = [sp[0] + P.plus[0], sp[1] + P.plus[1], sp[2] + P.plus[2]], minus: V3 = [sp[0] + P.minus[0], sp[1] + P.minus[1], sp[2] + P.minus[2]]
  const flow = on ? I : 0
  const spots = useMemo(() => spotsIn({ w: AMP.L - 0.02, d: 0.13 }, 0.026, 0, -0.06), [])
  const hs = useMemo(() => spotsIn({ w: 0.06, d: 0.06 }, 0.03, R1.hand[0], R1.hand[2]), [])
  return <group position={[ST.l1, 0, 0]}>
    <Bench w={1.5} />
    {/* 磁体垫在一块木块上 */}
    <RoundedBox args={[0.14, 0.03, 0.24]} radius={0.004} smoothness={2} position={[0, TOP + 0.015, -0.06]} castShadow receiveShadow><meshPhysicalMaterial color="#b88a58" roughness={0.55} clearcoat={0.3} /></RoundedBox>
    <group position={[0, 0, 0]}><Horseshoe flip={flip} /></group>
    {/* 两极之间的磁感线：竖直，N 极在上时向下 */}
    <FieldLines spots={spots} y0={R1.gapY - 0.028} y1={R1.gapY + 0.028} dir={field > 0 ? -1 : 1} opacity={flip % 1 === 0 ? 1 : 0} head={0.008} />
    <Stand />
    {/* 吊着的铜棒：两根软导线和铜棒一起绕横杆摆 */}
    <group ref={pivot} position={[0, R1.hangY, -0.02]}>
      {[-1, 1].map(s => <mesh key={s} position={[s * R1.rod / 2, -WIRE_L / 2, 0]}><cylinderGeometry args={[0.0011, 0.0011, WIRE_L, 6]} /><Metal kind="copper" rough={0.35} /></mesh>)}
      <mesh position={[0, -WIRE_L, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.004, 0.004, R1.rod, 20]} /><Metal kind="copper" grain="turned" /></mesh>
      <Wire bare pts={[[cur > 0 ? -R1.rod / 2 : R1.rod / 2, -WIRE_L, 0], [0, -WIRE_L, 0], [cur > 0 ? R1.rod / 2 : -R1.rod / 2, -WIRE_L, 0]]} flow={flow} r={0.0042} dots={10} />
    </group>
    {/* 安培力的箭头跟着铜棒走 */}
    <group ref={tag}>{on && <Arrow from={[0, 0, 0]} dir={[0, 0, side]} len={0.06 + 0.03 * I} color={COL.FB} thick={0.12} />}</group>
    {/* 电源到横杆两端的导线 */}
    <Wire pts={[plus, [plus[0], plus[1] + 0.05, plus[2] + 0.05], [0.3, TOP + 0.04, 0.12], [-0.05, TOP + 0.02, 0.16], [-R1.rod / 2 - 0.02, TOP + 0.3, 0.02], [-R1.rod / 2, R1.hangY + 0.02, -0.02]]} color={RED} flow={flow * -cur} />
    <Wire pts={[minus, [minus[0], minus[1] + 0.06, minus[2] + 0.04], [0.32, TOP + 0.06, 0.06], [R1.rod / 2 + 0.02, TOP + 0.3, 0.0], [R1.rod / 2, R1.hangY + 0.02, -0.02]]} color="#1c1d1f" flow={flow * cur} />
    <group position={R1.supply} rotation-y={-0.35}><Supply name="学生电源" screens={[on ? `${I.toFixed(2)}A` : '0.00A', on ? 'ON' : 'OFF']} on={on} /></group>
    {/* 左手定则：磁感线穿过掌心，四指指电流，大拇指指安培力 */}
    {hand > 0.01 && <group>
      <RuleHand at={R1.hand} fingers={[cur, 0, 0]} thumbDir={[0, 0, side]} scale={1.3} />
      <FieldLines spots={hs} y0={R1.hand[1] - 0.07} y1={R1.hand[1] + 0.07} dir={field > 0 ? -1 : 1} head={0.012} />
      <Arrow from={[R1.hand[0] - cur * 0.09, R1.hand[1] + 0.045, R1.hand[2]]} dir={[cur, 0, 0]} len={0.08} color={COL.cur} thick={0.08} />
      <Arrow from={[R1.hand[0] - 0.03, R1.hand[1] + 0.03, R1.hand[2] + side * 0.02]} dir={[0, 0, side]} len={0.09} color={COL.FB} thick={0.08} />
    </group>}
  </group>
}
