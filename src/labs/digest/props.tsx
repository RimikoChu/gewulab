// 展厅里几样共用的东西：展台、放大镜圈（把放大的模型和人体上的位置连起来）、玻璃材质。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import type { V3 } from './sdf'

/** 便宜的玻璃：容器里还要画液体，所以不用真折射；很淡、双面、不写深度、反光强一点 */
export const GLASS = { color: '#e8f4f6', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, depthWrite: false, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide } as const

/** 展台：白色人造石台面、深灰的柜体、不锈钢踢脚，台面下沿一道缝 */
export function Plinth({ at, w, d, top }: { at: V3; w: number; d: number; top: number }) {
  return <group position={at}>
    <RoundedBox args={[w, 0.4, d]} radius={0.06} smoothness={3} position={[0, top - 0.2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#e9e6df" roughness={0.32} clearcoat={0.4} clearcoatRoughness={0.3} /></RoundedBox>
    <RoundedBox args={[w - 0.5, top - 0.55, d - 0.5]} radius={0.05} smoothness={3} position={[0, (top - 0.35) / 2 + 0.15, 0]} castShadow receiveShadow><meshStandardMaterial color="#2a2f35" roughness={0.55} /></RoundedBox>
    <mesh position={[0, 0.08, 0]}><boxGeometry args={[w - 0.42, 0.16, d - 0.42]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[0, top - 0.42, d / 2 - 0.245]}><boxGeometry args={[w - 0.5, 0.03, 0.02]} /><meshStandardMaterial color="#14171a" /></mesh>
  </group>
}

/** 放大镜圈：放大模型外面一圈细金属环，一条细线连到人体上对应的地方，那一头一个小圆点 */
export function Magnifier({ at, site, r, line: showLine = true }: { at: V3; site: V3; r: number; line?: boolean }) {
  const line = useMemo(() => {
    const a = new THREE.Vector3(...at), b = new THREE.Vector3(...site), d = b.clone().sub(a).normalize()
    const p0 = a.clone().addScaledVector(d, r + 0.02)
    return new THREE.BufferGeometry().setFromPoints([p0, b])
  }, [at, site, r])
  return <group>
    <mesh position={at}><torusGeometry args={[r, 0.022, 10, 128]} /><Metal kind="aluminum" grain="turned" /></mesh>
    {showLine && <lineSegments geometry={line}><lineBasicMaterial color="#c9dbe6" transparent opacity={0.55} /></lineSegments>}
    {showLine && <mesh position={site}><sphereGeometry args={[0.05, 16, 12]} /><meshBasicMaterial color="#ffe0a8" toneMapped={false} /></mesh>}
  </group>
}
