// 细胞实验室的大场景：一间生物实验室。一条长实验台，左边是一台显微镜，中间是做装片的地方，右边是放细胞模型的台子。
// 整个实验室只有这一个世界，换课时画布不重建，镜头沿着实验台飞过去。各课的位置写在 ST 里。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Painted, mergeParts, useConcrete, type Part } from '@/lab-kit'

export const ST = { scope: -7, prep: -1.5, model: 5.5 }
export const TOP = 0.9
export const SPOT = { scope: new THREE.Vector3(ST.scope, TOP + 0.62, 0), prep: new THREE.Vector3(ST.prep, TOP + 0.3, 0), model: new THREE.Vector3(ST.model, TOP + 0.95, 0) }
export const SPAN = { scope: [2.6, 1.6] as [number, number], prep: [2.2, 1.3] as [number, number], model: [3.6, 2.2] as [number, number] }

export function World() {
  const [d, n, r] = useConcrete(10, 6)
  const geo = useMemo(() => {
    const parts: Part[] = []
    // 实验台：深色台面、柜体、台腿
    parts.push({ p: [-0.5, TOP - 0.03, 0], s: [19, 0.06, 1.4], c: '#2f3a40' })
    parts.push({ p: [-0.5, (TOP - 0.06) / 2, -0.1], s: [18.6, TOP - 0.06, 1.1], c: '#dfe3e2' })
    for (let x = -9.2; x <= 8.3; x += 1.55) parts.push({ p: [x, (TOP - 0.06) / 2, 0.46], s: [0.03, TOP - 0.2, 0.02], c: '#9aa3a6' })
    // 后墙、窗、墙边的柜子
    parts.push({ p: [0, 2.2, -3.6], s: [26, 4.4, 0.2], c: '#e9ece8' })
    for (const x of [-8, -2.5, 3, 8.5]) { parts.push({ p: [x, 2.5, -3.48], s: [3.6, 2.0, 0.06], c: '#bcdcea' }); parts.push({ p: [x, 2.5, -3.44], s: [0.06, 2.0, 0.06], c: '#f6f7f5' }); parts.push({ p: [x, 2.5, -3.44], s: [3.6, 0.06, 0.06], c: '#f6f7f5' }) }
    parts.push({ p: [0, 0.5, -3.1], s: [24, 1.0, 0.7], c: '#c9d2d1' }); parts.push({ p: [0, 1.02, -3.1], s: [24.2, 0.05, 0.8], c: '#2f3a40' })
    for (const x of [-10, -6.5, 6, 10.5]) parts.push({ p: [x, 1.25, -3.1], s: [0.26, 0.4, 0.26], c: '#7c9aa8', cyl: true })
    // 模型台后面的一块深色背板：细胞模型是半透明的，衬着深色才看得清
    parts.push({ p: [ST.model, TOP + 1.05, -0.5], s: [3.4, 2.1, 0.05], c: '#1d2328' })
    return mergeParts(parts)
  }, [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[60, 30]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#c8ccc8" /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
    </group>
  )
}
