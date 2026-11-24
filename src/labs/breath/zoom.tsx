// 放大镜球：一圈淡淡的球壳把放大的模型罩住，一根细线连回模型上的那一处。气管内壁、肺泡、肺泡壁三个放大模型都用它。
import { useMemo } from 'react'
import * as THREE from 'three'
import { ghostMat } from './chest'
import type { V3 } from './sdf'

export function Magnifier({ at, site, r, opacity = 1 }: { at: V3; site: V3; r: number; opacity?: number }) {
  const shell = useMemo(() => { const m = ghostMat('#9ad8ff', 0.0, 0.32, 3.2); m.side = THREE.DoubleSide; return m }, [])
  shell.uniforms.uFade.value = opacity
  const line = useMemo(() => {
    const d = new THREE.Vector3(...site).sub(new THREE.Vector3(...at)), e = new THREE.Vector3(...at).addScaledVector(d.clone().normalize(), r)
    return new THREE.BufferGeometry().setFromPoints([e, new THREE.Vector3(...site)])
  }, [at, site, r])
  return <group visible={opacity > 0.02}>
    <mesh position={at} material={shell} renderOrder={10}><sphereGeometry args={[r, 48, 32]} /></mesh>
    <lineSegments geometry={line}><lineBasicMaterial color="#9ad8ff" transparent opacity={0.5 * opacity} /></lineSegments>
    <mesh position={site}><sphereGeometry args={[0.05, 16, 12]} /><meshBasicMaterial color="#9ad8ff" toneMapped={false} transparent opacity={opacity} /></mesh>
  </group>
}
