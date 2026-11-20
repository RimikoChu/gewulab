// 光的折射和凸透镜成像实验室的大场景：一间光学暗室。一条长台子，从左到右是水槽、光具座、眼球模型、望远镜。
// 整个实验室只有这一个世界，换课时画布不重建，镜头沿着台子飞过去。画面里 1 cm 画成 CM 个单位。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Painted, mergeParts, type Part } from '@/lab-kit'

export const TOP = 0.9, AXIS = TOP + 0.62, CM = 0.045      // 台面高度、主光轴的高度、1 cm 在画面里多长
export const ST = { tank: -9, bench: 0, eye: 8, scope: 14.5 }
const at = (x: number, w: number, h: number, up = 0) => ({ target: new THREE.Vector3(x, AXIS + up, 0), span: [w, h] as [number, number], view: [0, 0.1] as [number, number] })
export const SPOT = { tank: at(ST.tank, 3.4, 2.0, -0.1), bench: at(ST.bench + 0.25, 4.3, 2.0), eye: at(ST.eye, 3.4, 2.0), scope: at(ST.scope, 4.3, 2.0) }
/** 暗室里的舞台设置：不画天空，背景近黑，环境光调小 */
export const DARK = { sky: false, backdrop: '#0b0e12', env: 0.3, sun: 0.6, fog: [40, 160] as [number, number] }

export function World() {
  const geo = useMemo(() => {
    const parts: Part[] = []
    parts.push({ p: [3, TOP - 0.03, 0], s: [30, 0.06, 1.5], c: '#1c2227' }); parts.push({ p: [3, (TOP - 0.06) / 2, -0.1], s: [29.6, TOP - 0.06, 1.2], c: '#2b3136' })
    parts.push({ p: [3, 2.2, -3], s: [40, 4.4, 0.2], c: '#151a1e' }); parts.push({ p: [3, 0, 0], s: [40, 0.02, 12], c: '#22272b' })
    // 光具座：一根带刻度的导轨，每 10 cm 一道长刻度
    parts.push({ p: [ST.bench + 0.25, TOP + 0.03, 0.12], s: [4.2, 0.06, 0.16], c: '#8f9499' })
    for (let cm = -45; cm <= 55; cm += 5) parts.push({ p: [ST.bench + cm * CM, TOP + 0.065, 0.18], s: [0.008, 0.012, cm % 10 ? 0.03 : 0.06], c: '#f1f1ee' })
    return mergeParts(parts)
  }, [])
  return (
    <group>
      <mesh geometry={geo} receiveShadow><Painted rough={0.8} metal={0.1} /></mesh>
      <pointLight position={[3, 3.2, 2.5]} intensity={6} distance={24} decay={1.2} color="#cfd8e6" />
    </group>
  )
}
