// 电与磁 · 第 7 课 发电机的台上器材：一台手摇交流发电机模型。立着的蹄形磁体两脚朝上，矩形线圈在两极之间绕水平轴转；
// 轴的前端两只滑环、一对电刷，接到零点在中间的灵敏电流计和一只小灯泡；最前面是手柄。按厘米写，原点在第 7 格台面中心。
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe, shell } from '@/lab-kit'
import { Board, Glove, Meter, Post, RED, BLACK, Wire, add, meterPosts, type V3 } from './gear'
import { HorseMagnet } from './magnets'

export const L7 = { sc: 1.6, axisY: 15.5, zc: -1.63, g: [-26, 0, -4] as V3, lamp: [-16, 0, 11] as V3 }
const COIL = (() => {
  const a = 3.2, h = 1.8, pts = [[a, 0, -h], [a, 0, h], [-a, 0, h], [-a, 0, -h]].map(([x, y, z]) => new THREE.Vector3(x, y, z))
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.05), 80, 0.45, 10, true)
})()
const BULB = shell([[0.42, 0], [0.48, 0.25], [0.8, 0.8], [0.86, 1.3], [0.78, 1.75], [0.5, 2.08], [0, 2.16]], 0.035, { segs: 36 })
const SOCKET = lathe([[0, 0], [1.2, 0], [1.25, 0.1], [1.25, 1.4], [1.1, 1.6], [0.8, 1.6], [0.8, 0.4], [0, 0.4]], { segs: 32 })

/** theta：线圈转过的角度；k：电流（相对值，−1 到 1）；glow：小灯泡亮度 */
export function Scene7({ theta, k, glow, crank }: { theta: number; k: number; glow: number; crank: boolean }) {
  const ay = L7.axisY, P = meterPosts()
  const gp = add(L7.g, P.pos), gn = add(L7.g, P.neg)
  const lampA: V3 = [L7.lamp[0] - 4, 1.2 + 0.45, L7.lamp[2]], lampB: V3 = [L7.lamp[0] + 4, 1.2 + 0.45, L7.lamp[2]]
  const bA: V3 = [-3.6, 6, 8], bB: V3 = [3.6, 6, 8]
  const g = Math.max(0, glow), col = new THREE.Color().setHSL(0.1, 1, 0.5 + 0.2 * g)
  return <group>
    <Board w={30} d={20} h={1.2} />
    {/* 蹄形磁体立着，两脚朝上：西脚 N 极、东脚 S 极 */}
    <group position={[0, 1.2 + 8 * L7.sc, 0]} rotation-x={-Math.PI / 2}><HorseMagnet scale={L7.sc} /></group>
    {/* 前后两只轴承架 */}
    {[-7, 4.6].map(z => <group key={z} position={[0, 1.2, z]}>
      <RoundedBox args={[2.2, ay - 1.2 + 1, 1]} radius={0.15} position={[0, (ay - 1.2) / 2, 0]} castShadow><Metal kind="aluminum" grain="brushed" /></RoundedBox>
      <mesh position={[0, ay - 1.2, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.6, 0.6, 1.3, 20]} /><Metal kind="brass" /></mesh>
    </group>)}
    {/* 转子：轴、线圈、两只滑环、手柄 */}
    <group position={[0, ay, L7.zc]} rotation-z={theta}>
      <mesh rotation-x={Math.PI / 2} position={[0, 0, 3.5]}><cylinderGeometry args={[0.22, 0.22, 17, 12]} /><Metal kind="steel" grain="turned" /></mesh>
      <mesh geometry={COIL} castShadow><meshStandardMaterial color="#b8582c" metalness={0.65} roughness={0.32} /></mesh>
      {[0, 1].map(i => <mesh key={i} position={[0, 0, 7.6 + i * 1.5]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.85, 0.85, 0.7, 28]} /><Metal kind="copper" grain="turned" rough={0.2} /></mesh>)}
      <mesh position={[0, 0, 8.35]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.6, 0.6, 0.8, 20]} /><meshStandardMaterial color="#e8e2d3" /></mesh>
      <group position={[0, 0, 12]}>
        <RoundedBox args={[1, 6, 0.6]} radius={0.2} position={[0, -3, 0]} castShadow><Metal kind="steel" grain="brushed" /></RoundedBox>
        <mesh position={[0, -5.6, 1.4]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.55, 0.55, 2.6, 16]} /><meshPhysicalMaterial color="#202124" roughness={0.3} clearcoat={0.5} /></mesh>
        {crank && <group position={[0, -5.6, 3.4]} rotation={[-0.2, 0, -theta]}><group rotation-x={Math.PI / 2 - 0.3}><Glove scale={0.9} /></group></group>}
      </group>
    </group>
    {/* 电刷：两片铜片从下面压在两只滑环上 */}
    {[0, 1].map(i => <group key={i} position={[i ? 3.6 : -3.6, 0, L7.zc + 7.6 + i * 1.5]}>
      <mesh position={[i ? -1.8 : 1.8, ay - 0.9, 0]} rotation-z={i ? 0.5 : -0.5}><boxGeometry args={[3, 0.08, 0.5]} /><Metal kind="brass" /></mesh>
      <mesh position={[0, (ay - 1) / 2 + 0.6, 0]}><boxGeometry args={[0.7, ay - 2, 0.7]} /><meshPhysicalMaterial color="#e8e4d8" roughness={0.4} /></mesh>
    </group>)}
    <Post at={[bA[0], 1.2, bA[2]]} color={RED} /><Post at={[bB[0], 1.2, bB[2]]} />
    {/* 灵敏电流计和小灯泡 */}
    <group position={L7.g}><Meter kind="G" k={k} /></group>
    <group position={L7.lamp}>
      <Board w={10} d={4} h={1.2} color="#d9cdb2" />
      <mesh geometry={SOCKET} position={[0, 1.2, 0]} castShadow><meshPhysicalMaterial color="#1b1c1e" roughness={0.35} clearcoat={0.4} /></mesh>
      <Post at={[-4, 1.2, 0]} /><Post at={[4, 1.2, 0]} />
      <group position={[0, 2.6, 0]} scale={1.3}>
        <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[0.45, 0.45, 0.6, 20]} /><Metal kind="brass" /></mesh>
        <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color="#5a4a3a" emissive={col} emissiveIntensity={g * 8} toneMapped={g < 0.01} /></mesh>
        {g > 0.03 && <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.6, 16, 12]} /><meshBasicMaterial color={col} transparent opacity={0.2 + g * 0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>}
        <mesh geometry={BULB} renderOrder={5}><meshPhysicalMaterial color="#eef3f5" roughness={0.06} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} emissive="#ffdca0" emissiveIntensity={g * 0.4} /></mesh>
      </group>
    </group>
    <Wire pts={[add(bA, [0, 0.45, 0]), [-8, 0.4, 10], lampB]} color={RED} flow={k * 2} r={0.15} />
    <Wire pts={[lampA, [-22, 0.4, 8], gp]} color={RED} flow={k * 2} r={0.15} />
    <Wire pts={[gn, [-16, 0.4, -12], [6, 0.4, -10], [8, 0.4, 6], add(bB, [0, 0.45, 0])]} color={BLACK} flow={k * 2} r={0.15} />
  </group>
}
