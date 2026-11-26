// 电与磁 · 第 6 课 电磁感应的器材：一块侧立的蹄形磁体，一根铜棒沿南北方向放在两极之间，前端套着绝缘手柄，戴手套的手握着它；
// 铜棒两头各接一根软导线，连到西边的灵敏电流计，组成闭合电路。按厘米写，原点在第 6 格台面中心。
import { RoundedBox } from '@react-three/drei'
import { Metal } from '@/lab-kit'
import { Meter, Wire, BLACK, RED, add, meterPosts, type V3 } from './gear'
import { HorseMagnet } from './magnets'

export const L6 = { sc: 1.4, rodY: 7, rodZ: [-4.5, 5.5] as [number, number], g: [-24, 0, -4] as V3 }

export function Scene6({ b, dx, dy, k }: { b: 1 | -1; dx: number; dy: number; k: number }) {
  const [z0, z1] = L6.rodZ, y = L6.rodY + dy, P = meterPosts()
  const gn = add(L6.g, P.neg), gp = add(L6.g, P.pos)
  return <group>
    <HorseMagnet stand flip={b < 0} scale={L6.sc} />
    {/* 铜棒和绝缘手柄 */}
    <group position={[dx, y, 0]}>
      <mesh position={[0, 0, (z0 + z1) / 2]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.32, 0.32, z1 - z0, 20]} /><Metal kind="copper" grain="turned" rough={0.22} /></mesh>
      <mesh position={[0, 0, z1 + 5.5]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.6, 0.55, 11, 20]} /><meshPhysicalMaterial color="#1c1d20" roughness={0.35} clearcoat={0.5} /></mesh>
      {[z0, z1].map(z => <mesh key={z} position={[0, 0, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.45, 0.45, 0.5, 6]} /><Metal kind="brass" /></mesh>)}
    </group>
    {/* 两根软导线：从铜棒两头接到灵敏电流计 */}
    <Wire pts={[[dx, y, z0], [dx - 4, y + 4, z0 - 3], [-14, 6, -8], gn]} color={BLACK} r={0.14} />
    <Wire pts={[[dx, y - 0.3, z1], [dx - 3, y - 3, z1 + 1], [-12, 0.4, 8], [-20, 0.4, 6], gp]} color={RED} r={0.14} />
    <group position={L6.g}><Meter kind="G" k={k} /></group>
    {/* 磁体下面垫一块木板，台面上一只放导线的托盘 */}
    <RoundedBox args={[10, 0.4, 20]} radius={0.1} position={[0, -0.2, -2]} receiveShadow><meshStandardMaterial color="#8c6a45" roughness={0.7} /></RoundedBox>
  </group>
}
