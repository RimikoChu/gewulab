// 培训楼一层的电磁学实验室：浅灰地砖、刷白的墙、北墙一排窗和一块白板、器材柜，吊顶上一排排平板灯。
// 外面是一栋两层的砖红色小楼，紧挨着发电机厂房的西山墙。各课的实验台由各课自己画（见 idle.tsx）。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Painted, mergeParts, type Part } from '@/lab-kit'
import { ROOM, ST } from './layout'
import { makeTile, makeWall, makeText, makeWood, rep } from './mats'

const R = ROOM
const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c })

/** 北墙的窗：每 4 m 一扇，铝合金窗框，窗外是亮的天光 */
const WINS = [-41, -35, -29, -23, -17, -12]

/** 器材柜、窗框、踢脚线这类静物，合成一个模型 */
function roomParts() {
  const P: Part[] = []
  // 踢脚线
  P.push(box((R.x0 + R.x1) / 2, 0, R.z0 + 0.01, R.x1 - R.x0, 0.1, 0.02, '#6b6e70'))
  // 窗框：外框、中梃、窗台
  for (const x of WINS) {
    const y0 = 1.0, h = 1.7, w = 2.2, z = R.z0 + 0.02
    P.push(box(x, y0 - 0.04, z, w + 0.1, 0.04, 0.06, '#c9ccce'), box(x, y0 + h, z, w + 0.1, 0.05, 0.06, '#c9ccce'))
    P.push(box(x - w / 2, y0, z, 0.05, h, 0.06, '#c9ccce'), box(x + w / 2, y0, z, 0.05, h, 0.06, '#c9ccce'), box(x, y0, z, 0.04, h, 0.06, '#c9ccce'))
    P.push(box(x, y0 - 0.06, z + 0.1, w + 0.2, 0.03, 0.22, '#e4e2dc'))
  }
  // 南墙下一排器材柜（两课之间各一组），柜门两扇、把手
  for (let i = 0; i < 5; i++) {
    const x = R.x0 + 3.5 + i * 7, z = R.z1 - 0.3
    P.push(box(x, 0, z, 1.8, 1.9, 0.5, '#d9dbd8'), box(x - 0.45, 0.06, z - 0.252, 0.86, 1.78, 0.01, '#cfd2cf'), box(x + 0.45, 0.06, z - 0.252, 0.86, 1.78, 0.01, '#cfd2cf'))
    P.push(box(x - 0.06, 0.9, z - 0.27, 0.02, 0.18, 0.02, '#8f9497'), box(x + 0.06, 0.9, z - 0.27, 0.02, 0.18, 0.02, '#8f9497'))
  }
  // 吊顶：铝格栅龙骨
  for (let x = R.x0; x <= R.x1; x += 1.2) P.push(box(x, R.h - 0.02, (R.z0 + R.z1) / 2, 0.03, 0.02, R.z1 - R.z0, '#d6d7d5'))
  for (let z = R.z0; z <= R.z1; z += 1.2) P.push(box((R.x0 + R.x1) / 2, R.h - 0.02, z, R.x1 - R.x0, 0.02, 0.03, '#d6d7d5'))
  return P
}

/** 楼外面：砖红色墙面、二层的窗、女儿墙 */
function outsideParts() {
  const P: Part[] = [], H = 7.6
  P.push(box((R.x0 + R.x1) / 2, R.h, (R.z0 + R.z1) / 2, R.x1 - R.x0 + 0.5, 0.3, R.z1 - R.z0 + 0.5, '#8d8a83'))   // 楼板
  P.push(box((R.x0 + R.x1) / 2, H, (R.z0 + R.z1) / 2, R.x1 - R.x0 + 0.6, 0.6, R.z1 - R.z0 + 0.6, '#a24f3a'))   // 女儿墙
  for (const x of WINS) for (const y of [4.6]) P.push(box(x, y, R.z1 + 0.26, 2.0, 1.6, 0.04, '#25303a'), box(x, y - 0.05, R.z1 + 0.3, 2.2, 0.06, 0.12, '#d6d4cd'))
  return P
}

export function Room() {
  const tex = useMemo(() => ({
    tile: rep(makeTile(), (R.x1 - R.x0) / 1.2, (R.z1 - R.z0) / 1.2), wall: rep(makeWall('#e7e6e0'), 6, 1), wallZ: rep(makeWall('#e7e6e0'), 2, 1),
    board: makeText(['法拉第电磁感应定律   E = n ΔΦ / Δt'], { w: 1024, h: 160, bg: '#f7f7f4', fg: '#2c3b52', size: 54, weight: 500 }),
    sign: makeText(['电磁学实验室'], { w: 512, h: 128, bg: '#1f5a8a', fg: '#ffffff', size: 64 }),
    brick: rep(makeWall('#a9543d'), 10, 2), wood: rep(makeWood('#9a6a3f'), 3, 1),
  }), [])
  const geo = useMemo(() => ({ parts: mergeParts(roomParts()), out: mergeParts(outsideParts()) }), [])
  const wallMat = (m: THREE.Texture) => <meshStandardMaterial map={m} color="#eceae4" roughness={0.9} />
  return <group>
    {/* 地砖、吊顶 */}
    <mesh rotation-x={-Math.PI / 2} position={[(R.x0 + R.x1) / 2, 0.003, (R.z0 + R.z1) / 2]} receiveShadow><planeGeometry args={[R.x1 - R.x0, R.z1 - R.z0]} /><meshPhysicalMaterial map={tex.tile} color="#d4d5d1" roughness={0.35} clearcoat={0.3} clearcoatRoughness={0.3} /></mesh>
    <mesh rotation-x={Math.PI / 2} position={[(R.x0 + R.x1) / 2, R.h, (R.z0 + R.z1) / 2]}><planeGeometry args={[R.x1 - R.x0, R.z1 - R.z0]} /><meshStandardMaterial color="#e9e9e6" roughness={0.9} /></mesh>
    {/* 平板灯：吊顶上每两格一盏，发白光 */}
    {Array.from({ length: 14 }, (_, i) => [0, 1].map(j => <mesh key={`${i}${j}`} rotation-x={Math.PI / 2} position={[R.x0 + 1.8 + i * 2.4, R.h - 0.035, -1.2 + j * 3.6]}><planeGeometry args={[0.58, 1.18]} /><meshBasicMaterial color="#fbfbf6" toneMapped={false} side={THREE.DoubleSide} /></mesh>))}
    {Object.values(ST).map(x => <pointLight key={x} position={[x, R.h - 0.4, 1.4]} intensity={3.2} distance={7} decay={1.4} color="#fff6ea" />)}
    {/* 北墙：墙面开窗（窗洞用一块发亮的“天光”面代替玻璃外的景色） */}
    <mesh position={[(R.x0 + R.x1) / 2, R.h / 2, R.z0]} receiveShadow>{wallMat(tex.wall)}<planeGeometry args={[R.x1 - R.x0, R.h]} /></mesh>
    {WINS.map(x => <group key={x}>
      <mesh position={[x, 1.85, R.z0 + 0.005]}><planeGeometry args={[2.2, 1.7]} /><meshBasicMaterial color="#cfe0ee" toneMapped={false} /></mesh>
      <mesh position={[x, 1.85, R.z0 + 0.03]}><planeGeometry args={[2.2, 1.7]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.12} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    </group>)}
    {/* 白板 */}
    <group position={[-32, 1.75, R.z0 + 0.03]}>
      <RoundedBox args={[3.4, 1.2, 0.03]} radius={0.01} smoothness={2}><meshStandardMaterial color="#b9bdc0" metalness={0.5} roughness={0.4} /></RoundedBox>
      <mesh position={[0, 0, 0.017]}><planeGeometry args={[3.3, 1.1]} /><meshPhysicalMaterial map={tex.board} roughness={0.2} clearcoat={0.8} /></mesh>
      <mesh position={[0, -0.62, 0.05]}><boxGeometry args={[3.3, 0.03, 0.08]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    </group>
    {/* 东西两面墙、南墙 */}
    <mesh position={[R.x0, R.h / 2, (R.z0 + R.z1) / 2]} rotation-y={Math.PI / 2}><planeGeometry args={[R.z1 - R.z0, R.h]} />{wallMat(tex.wallZ)}</mesh>
    <mesh position={[R.x1, R.h / 2, (R.z0 + R.z1) / 2]} rotation-y={-Math.PI / 2}><planeGeometry args={[R.z1 - R.z0, R.h]} />{wallMat(tex.wallZ)}</mesh>
    <mesh position={[(R.x0 + R.x1) / 2, R.h / 2, R.z1]} rotation-y={Math.PI}><planeGeometry args={[R.x1 - R.x0, R.h]} />{wallMat(tex.wall)}</mesh>
    <mesh position={[R.x0 + 0.02, 2.6, 1.2]} rotation-y={Math.PI / 2}><planeGeometry args={[1.6, 0.4]} /><meshStandardMaterial map={tex.sign} roughness={0.5} /></mesh>
    <mesh geometry={geo.parts} castShadow receiveShadow><Painted rough={0.55} metal={0.2} /></mesh>
    {/* 楼外：砖红色的外墙（只朝外的一面）、二层楼板、女儿墙 */}
    <mesh position={[(R.x0 + R.x1) / 2, 3.9, R.z1 + 0.25]}><boxGeometry args={[R.x1 - R.x0 + 0.5, 7.8, 0.02]} /><meshStandardMaterial map={tex.brick} roughness={0.9} /></mesh>
    <mesh position={[(R.x0 + R.x1) / 2, 3.9, R.z0 - 0.25]}><boxGeometry args={[R.x1 - R.x0 + 0.5, 7.8, 0.02]} /><meshStandardMaterial map={tex.brick} roughness={0.9} /></mesh>
    <mesh position={[R.x0 - 0.25, 3.9, (R.z0 + R.z1) / 2]}><boxGeometry args={[0.02, 7.8, R.z1 - R.z0 + 0.5]} /><meshStandardMaterial map={tex.brick} roughness={0.9} /></mesh>
    <mesh geometry={geo.out} castShadow receiveShadow><Painted rough={0.8} metal={0.05} /></mesh>
  </group>
}
