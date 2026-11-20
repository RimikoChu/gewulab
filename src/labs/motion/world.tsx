// 机械运动实验室的大场景：一座高铁站。站台、两条股道、雨棚和站房；站外有一段标着里程的正线；站台尽头是一段检修坡道。
// 整个实验室只有这一个世界，换课时画布不重建，镜头在车站里飞。站外正线按 1∶10 缩小来画，界面上的数都是真实的。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Painted, mergeParts, useConcrete, type Part } from '@/lab-kit'

export const PLAT = 1.1                       // 站台面的高度
export const TRACK = { near: 0, far: -4.2 }   // 站台边两条股道的 z
export const LINE = { z: 36, x0: -52, scale: 0.1 }   // 站外正线：z、起点的 x、画面单位 ÷ 真实的米
export const DESK: [number, number, number] = [-14, PLAT, 5.2]   // 工作台
export const RAMP: [number, number, number] = [32, PLAT, 5.0]    // 检修坡道
type V3 = [number, number, number]
/** 正线上离起点 m 米的地方在画面里的 x */
export const lineX = (m: number) => LINE.x0 + m * LINE.scale

export const SPOT = {
  desk: { target: new THREE.Vector3(DESK[0], PLAT + 1.05, DESK[2]), span: [1.9, 1.1] as [number, number], view: [-0.3, 0.62] as [number, number] },
  // 站台这一处从股道那一侧看过去：列车在前，站台和雨棚在后
  platform: { target: new THREE.Vector3(-4, 2.4, -1), span: [46, 15] as [number, number], view: [Math.PI + 0.42, 0.3] as [number, number] },
  line: { target: new THREE.Vector3(-2, 2.5, LINE.z), span: [116, 26] as [number, number], view: [0, 0.34] as [number, number] },
  ramp: { target: new THREE.Vector3(RAMP[0], PLAT + 1.2, RAMP[2]), span: [6.6, 3.6] as [number, number], view: [0, 0.2] as [number, number] },
}

/** 一列车：圆角的车身、车窗带、车头。len 是车长，x 是车头所在的位置，朝 +x 开 */
export function Train({ x, z, len = 26, color = '#f4f6f7', stripe = '#2f7fb8', y = 0.35, s = 1 }: { x: number; z: number; len?: number; color?: string; stripe?: string; y?: number; s?: number }) {
  return (
    <group position={[x, y, z]} scale={s}>
      <RoundedBox args={[len, 2.5, 2.7]} radius={0.5} position={[-len / 2, 1.5, 0]} castShadow><meshStandardMaterial color={color} roughness={0.35} metalness={0.2} /></RoundedBox>
      <mesh position={[-len / 2, 1.85, 0]}><boxGeometry args={[len - 1.6, 0.6, 2.74]} /><meshStandardMaterial color="#1d2a33" roughness={0.2} metalness={0.4} /></mesh>
      <mesh position={[-len / 2, 0.75, 0]}><boxGeometry args={[len - 0.6, 0.22, 2.74]} /><meshStandardMaterial color={stripe} roughness={0.5} /></mesh>
      <mesh position={[0.5, 1.2, 0]} rotation-z={-Math.PI / 2} scale={[1, 1, 1.05]}><coneGeometry args={[1.25, 2.6, 16]} /><meshStandardMaterial color={color} roughness={0.35} metalness={0.2} /></mesh>
    </group>
  )
}

export function World() {
  const [d, n, r] = useConcrete(24, 4)
  const geo = useMemo(() => {
    const parts: Part[] = []
    const track = (z: number, x0: number, x1: number, k = 1) => {
      for (const dz of [-0.72, 0.72]) parts.push({ p: [(x0 + x1) / 2, 0.14 * k, z + dz * k], s: [x1 - x0, 0.14 * k, 0.1 * k], c: '#8f9499' })
      for (let x = x0; x <= x1; x += 1.3 * k) parts.push({ p: [x, 0.04 * k, z], s: [0.3 * k, 0.08 * k, 2.4 * k], c: '#6b5e52' })
      parts.push({ p: [(x0 + x1) / 2, 0.005, z], s: [x1 - x0, 0.02, 3.4 * k], c: '#7d776f' })
    }
    track(TRACK.near, -70, 70); track(TRACK.far, -70, 70); track(LINE.z, LINE.x0 - 8, LINE.x0 + 112, 0.8)
    // 站台、雨棚、站房
    parts.push({ p: [0, PLAT / 2, 5.6], s: [84, PLAT, 7], c: '#bfc3c0' }); parts.push({ p: [0, PLAT + 0.01, 2.5], s: [84, 0.02, 0.5], c: '#e9c63f' })
    for (let x = -36; x <= 36; x += 9) { parts.push({ p: [x, PLAT + 2.4, 6.6], s: [0.3, 4.8, 0.3], c: '#dfe3e6' }); parts.push({ p: [x, PLAT + 4.7, 4.9], s: [0.25, 0.25, 4], c: '#dfe3e6' }) }
    parts.push({ p: [0, PLAT + 4.95, 4.6], s: [82, 0.16, 6.6], c: '#f3f5f6' })
    parts.push({ p: [0, PLAT + 3, 13], s: [50, 6, 8], c: '#d9dcd6' }); parts.push({ p: [0, PLAT + 3.6, 8.96], s: [44, 3.4, 0.1], c: '#8fb7cf' })
    // 正线边的里程桩：每 100 m 一根，500 m 和 1000 m 的高一些
    for (let m = 0; m <= 1000; m += 100) parts.push({ p: [lineX(m), m % 500 ? 0.7 : 1.1, LINE.z + 2.6], s: [0.16, m % 500 ? 1.4 : 2.2, 0.16], c: m % 500 ? '#f1f1ee' : '#e9c63f' })
    // 工作台
    parts.push({ p: [DESK[0], PLAT + 0.86, DESK[2]], s: [2.2, 0.06, 1.2], c: '#3a4348' }); for (const dx of [-1, 1]) for (const dz of [-0.5, 0.5]) parts.push({ p: [DESK[0] + dx, PLAT + 0.43, DESK[2] + dz], s: [0.07, 0.86, 0.07], c: '#6d767b' })
    return mergeParts(parts)
  }, [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[700, 500]} /><meshStandardMaterial color="#86956f" roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -2]} receiveShadow><planeGeometry args={[150, 12]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#a9a59c" /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.15} /></mesh>
    </group>
  )
}
export type { V3 }
