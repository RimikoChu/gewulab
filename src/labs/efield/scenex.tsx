// 静电场 · 拓展课里“静电屏蔽”的器材：一只验电器（玻璃瓶里一根黄铜杆，顶上一只圆盘，下端两片金箔）；
// 右边滑座上横着一根带负电的橡胶棒，可以推近；后面的支架上吊着一只金属网罩，可以放下来把验电器罩住。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Rod, disc, lathe, shell } from '@/lab-kit'
import { ST, TOP } from './layout'
import { makeMesh, rep } from './mats'
import { Sign } from './fx'
import { Acrylic, Bakelite, GlassMat } from './gear'

/** 验电器圆盘的高度、网罩的半径和高、橡胶棒离圆盘最近时的距离 */
export const RX = { top: 0.25, cage: 0.105, cageH: 0.3, near: 0.13, far: 0.36 }

/** rod：橡胶棒尖端到验电器轴线的距离；cage：网罩升起的高度（0 是罩住）；open：金箔张开的角度（rad） */
export function RigX({ rod = RX.far, cage = 0.3, open = 0 }: { rod?: number; cage?: number; open?: number }) {
  const geo = useMemo(() => ({
    base: lathe([[0, 0], [0.07, 0], [0.07, 0.008], [0.064, 0.014], [0, 0.014]], { segs: 64 }),
    jar: shell([[0, 0], [0.056, 0], [0.062, 0.012], [0.062, 0.13], [0.05, 0.16], [0.022, 0.178], [0.02, 0.2]], 0.003, { segs: 64 }),
    bung: lathe([[0.004, 0], [0.019, 0], [0.022, 0.022], [0.004, 0.022]], { closed: true }), plate: disc(0.026, 0.005, { segs: 48 }),
    cage: new THREE.CylinderGeometry(RX.cage, RX.cage, RX.cageH, 48, 1, true), hoop: shell([[RX.cage + 0.002, 0], [RX.cage + 0.002, 0.008]], 0.004, { segs: 48 }),
  }), [])
  const mesh = useMemo(() => ({ side: rep(makeMesh(), 44, 21), top: rep(makeMesh(), 14, 14) }), [])
  const y0 = 0.014, hinge = y0 + 0.085
  const net = (map: THREE.Texture) => <meshStandardMaterial map={map} alphaTest={0.4} transparent side={THREE.DoubleSide} metalness={0.8} roughness={0.35} color="#d5d9dc" />
  return <group position={[ST.x, TOP, 0]}>
    {/* 验电器 */}
    <mesh geometry={geo.base} castShadow receiveShadow><Bakelite /></mesh>
    <mesh position={[0, y0 + 0.16, 0]} castShadow><cylinderGeometry args={[0.0028, 0.0028, RX.top - y0 - 0.085, 12]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh geometry={geo.plate} position={[0, RX.top - 0.005, 0]} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh geometry={geo.bung} position={[0, y0 + 0.18, 0]}><meshStandardMaterial color="#e6dfc8" roughness={0.6} /></mesh>
    {[-1, 1].map(s => <group key={s} position={[0, hinge, 0]} rotation-z={s * open}>
      <mesh position={[s * 0.0006, -0.026, 0]}><boxGeometry args={[0.0006, 0.052, 0.014]} /><meshStandardMaterial color="#e8c35a" metalness={1} roughness={0.3} side={THREE.DoubleSide} /></mesh>
    </group>)}
    <mesh geometry={geo.jar} position={[0, y0, 0]} renderOrder={9}><GlassMat opacity={0.16} /></mesh>
    <Sign at={[0, RX.top + 0.028, 0]} kind="+" size={0.022} opacity={open > 0.05 ? 1 : 0} />
    <Sign at={[0, hinge - 0.062, 0.02]} kind="−" size={0.02} opacity={open > 0.05 ? 1 : 0} />
    {/* 橡胶棒：横在一只滑座的夹子上 */}
    <group position={[rod, 0, 0]}>
      <RoundedBox args={[0.1, 0.014, 0.075]} radius={0.004} position={[0.2, 0.007, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <mesh position={[0.2, RX.top / 2, 0]} castShadow><cylinderGeometry args={[0.005, 0.005, RX.top - 0.02, 16]} /><Acrylic /></mesh>
      <mesh position={[0.2, RX.top, 0]} castShadow><boxGeometry args={[0.022, 0.026, 0.026]} /><Bakelite color="#7a1f1a" /></mesh>
      <mesh position={[0.14, RX.top, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.008, 0.008, 0.28, 24]} /><meshPhysicalMaterial color="#17181a" roughness={0.35} clearcoat={0.6} /></mesh>
      <Sign at={[0.02, RX.top + 0.026, 0]} kind="−" size={0.022} /><Sign at={[0.07, RX.top + 0.026, 0]} kind="−" size={0.022} />
    </group>
    {/* 网罩：吊在后面支架的横臂上 */}
    <RoundedBox args={[0.14, 0.016, 0.1]} radius={0.004} position={[0, 0.008, -0.2]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[0, 0.345, -0.22]} castShadow><cylinderGeometry args={[0.006, 0.006, 0.67, 16]} /><Metal kind="chrome" /></mesh>
    <mesh position={[0, 0.67, -0.11]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.004, 0.004, 0.24, 12]} /><Metal kind="chrome" /></mesh>
    <Rod from={[0, 0.67, 0]} to={[0, RX.cageH + cage + 0.004, 0]} r={0.0012}><meshStandardMaterial color="#d9d9d4" roughness={0.6} /></Rod>
    <group position={[0, cage, 0]}>
      <mesh geometry={geo.cage} position={[0, RX.cageH / 2, 0]} renderOrder={10}>{net(mesh.side)}</mesh>
      <mesh position={[0, RX.cageH, 0]} rotation-x={-Math.PI / 2} renderOrder={10}><circleGeometry args={[RX.cage, 48]} />{net(mesh.top)}</mesh>
      <mesh geometry={geo.hoop} castShadow><Metal kind="steel" grain="turned" /></mesh>
      <mesh geometry={geo.hoop} position={[0, RX.cageH - 0.008, 0]} castShadow><Metal kind="steel" grain="turned" /></mesh>
    </group>
  </group>
}
