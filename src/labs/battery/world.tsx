// 原电池实验室的大场景：电池工厂里的一间检验室。一条长实验台，各课的器材沿着它排开；后墙的架子上码着成排的电池。
// 整个实验室只有这一个世界，换课时画布不重建，镜头沿着实验台飞过去。各课的位置写在 ST 里。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Painted, mergeParts, useConcrete, type Part } from '@/lab-kit'

export const ST = { one: -7.5, two: -2.5, three: 2.5, four: 7.5 }
export const TOP = 0.9
const at = (x: number, up: number) => new THREE.Vector3(x, TOP + up, 0)
export const SPOT = { one: at(ST.one, 0.42), two: at(ST.two, 0.42), three: at(ST.three, 0.62), four: at(ST.four, 0.5) }
export const SPAN: [number, number] = [2.9, 1.7]

export function World() {
  const [d, n, r] = useConcrete(10, 6)
  const geo = useMemo(() => {
    const parts: Part[] = []
    parts.push({ p: [0, TOP - 0.03, 0], s: [20, 0.06, 1.4], c: '#2b3338' })
    parts.push({ p: [0, (TOP - 0.06) / 2, -0.1], s: [19.6, TOP - 0.06, 1.1], c: '#e3e6e4' })
    for (let x = -9.75; x <= 9.75; x += 1.625) parts.push({ p: [x, (TOP - 0.06) / 2, 0.46], s: [0.03, TOP - 0.2, 0.02], c: '#9aa3a6' })
    // 后墙和货架：一层层码着电池
    parts.push({ p: [0, 2.4, -3.8], s: [28, 4.8, 0.2], c: '#dfe3e6' })
    for (const y of [0.5, 1.4, 2.3, 3.2]) parts.push({ p: [0, y, -3.35], s: [26, 0.06, 0.7], c: '#7f8a90' })
    for (let x = -13; x <= 13; x += 3.25) parts.push({ p: [x, 1.9, -3.35], s: [0.08, 3.8, 0.7], c: '#6d777d' })
    const tint = ['#a99a6e', '#6f8798', '#9a7670', '#74897c', '#868b90']
    let k = 0
    for (const y of [0.53, 1.43, 2.33, 3.23]) for (let x = -12.6; x <= 12.6; x += 0.36) { k++; if (k % 9 === 0) continue; const c = tint[Math.abs((k * 7 + Math.floor(x)) % 5)]; parts.push({ p: [x, y + 0.2, -3.3], s: [0.24, 0.4, 0.24], c, cyl: true }); parts.push({ p: [x, y + 0.415, -3.3], s: [0.2, 0.03, 0.2], c: '#c9cdd0', cyl: true }); parts.push({ p: [x, y + 0.445, -3.3], s: [0.07, 0.03, 0.07], c: '#c9cdd0', cyl: true }); parts.push({ p: [x, y + 0.2, -3.3], s: [0.244, 0.1, 0.244], c: '#e6e3d8', cyl: true }) }
    // 实验台的拉手、柜门中缝、踢脚和台面收边；后墙的踢脚
    for (let x = -9.75; x <= 9.75; x += 1.625) { parts.push({ p: [x + 0.72, TOP - 0.22, 0.462], s: [0.3, 0.025, 0.025], c: '#8f989c' }); parts.push({ p: [x + 0.81, 0.45, 0.455], s: [1.58, 0.012, 0.012], c: '#b9c0c0' }) }
    parts.push({ p: [0, 0.05, 0.4], s: [19.6, 0.1, 0.06], c: '#4a5358' }); parts.push({ p: [0, TOP - 0.03, 0.71], s: [20.04, 0.07, 0.03], c: '#20272b' }); parts.push({ p: [0, 0.08, -3.68], s: [28, 0.16, 0.06], c: '#b6bbb8' })
    return mergeParts(parts)
  }, [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[60, 30]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#b9bdbb" /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.65} metal={0.15} /></mesh>
    </group>
  )
}
