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
    // 实验台的柜门缝、拉手、踢脚；台面前沿一道收边
    for (let x = -9.2; x <= 8.3; x += 1.55) { parts.push({ p: [x + 0.7, TOP - 0.22, 0.462], s: [0.3, 0.025, 0.025], c: '#8f989c' }); parts.push({ p: [x + 0.775, 0.45, 0.455], s: [1.5, 0.012, 0.012], c: '#b9c0c0' }) }
    parts.push({ p: [-0.5, 0.05, 0.4], s: [18.6, 0.1, 0.06], c: '#4a5358' }); parts.push({ p: [-0.5, TOP - 0.03, 0.71], s: [19.04, 0.07, 0.03], c: '#232b30' })
    // 水池和龙头
    parts.push({ p: [2.2, TOP + 0.005, -0.1], s: [0.9, 0.012, 0.6], c: '#c9d0d3' }); parts.push({ p: [2.2, TOP + 0.012, -0.1], s: [0.74, 0.012, 0.44], c: '#7f898e' })
    parts.push({ p: [2.2, TOP + 0.16, -0.46], s: [0.04, 0.32, 0.04], c: '#c9d0d3', cyl: true }); parts.push({ p: [2.2, TOP + 0.31, -0.36], s: [0.03, 0.03, 0.22], c: '#c9d0d3' })
    // 后墙的踢脚、两层搁板和上面的试剂瓶
    parts.push({ p: [0, 0.08, -3.48], s: [26, 0.16, 0.06], c: '#b6bbb8' })
    for (const y of [3.75, 4.15]) parts.push({ p: [0, y, -3.36], s: [24, 0.04, 0.3], c: '#d2d6d3' })
    for (let x = -11.5, i = 0; x <= 11.5; x += 0.42, i++) { if (i % 7 === 5) continue; const h = 0.2 + (i * 37 % 5) * 0.03; parts.push({ p: [x, 3.77 + h / 2, -3.36], s: [0.09, h, 0.09], c: ['#7c9aa8', '#b98a5a', '#e6e9e6', '#8fae8a', '#a98fb5'][i % 5], cyl: true }); parts.push({ p: [x, 3.77 + h + 0.02, -3.36], s: [0.04, 0.04, 0.04], c: '#2f3a40', cyl: true }) }
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
