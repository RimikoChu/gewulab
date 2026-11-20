// 光的折射和凸透镜成像实验室的大场景：一间光学暗室。一条长台子，从左到右是水槽、光具座、眼球模型、望远镜。
// 整个实验室只有这一个世界，换课时画布不重建，镜头沿着台子飞过去。画面里 1 cm 画成 CM 个单位。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Painted, mergeParts, type Part } from '@/lab-kit'

export const TOP = 0.9, AXIS = TOP + 0.74, CM = 0.06      // 台面高度、主光轴的高度、1 cm 在画面里多长
/** 光具座导轨从透镜往两边各伸出多少厘米 */
export const RAIL = 40
export const ST = { tank: -9, bench: 0, eye: 8, scope: 14.5 }
const at = (x: number, w: number, h: number, up = 0) => ({ target: new THREE.Vector3(x, AXIS + up, 0), span: [w, h] as [number, number], view: [0, 0.1] as [number, number] })
export const SPOT = { tank: at(ST.tank, 3.4, 2.0, 0.08), bench: at(ST.bench, 5.15, 2.4, 0.1), eye: at(ST.eye, 3.4, 2.0, 0.12), scope: at(ST.scope, 4.3, 2.0, 0.12) }
/** 暗室里的舞台设置：不画天空，背景近黑，环境光调小 */
export const DARK = { sky: false, backdrop: '#0b0e12', env: 0.3, sun: 0.6, fog: [40, 160] as [number, number] }

/** 导轨正面的标尺：0 到 80 cm，每厘米一道刻线，每 10 cm 一个数字。透镜立在 40 cm 处 */
function makeScale() {
  const W = 4096, H = 96, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, px = W / (RAIL * 2)
  g.fillStyle = '#f2efe4'; g.fillRect(0, 0, W, H); g.fillStyle = '#1c2024'; g.textAlign = 'center'; g.font = '600 44px sans-serif'
  for (let cm = 0; cm <= RAIL * 2; cm++) {
    const x = Math.min(W - 2, Math.max(2, cm * px)), h = cm % 10 === 0 ? 40 : cm % 5 === 0 ? 30 : 18
    g.fillRect(x - (cm % 10 === 0 ? 2.5 : 1.5), 0, cm % 10 === 0 ? 5 : 3, h)
    if (cm % 10 === 0 && cm > 0 && cm < RAIL * 2) g.fillText(String(cm), x, 88)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
function Scale() {
  const tex = useMemo(makeScale, [])
  return <mesh position={[ST.bench, TOP + 0.078, 0.0865]}><planeGeometry args={[RAIL * 2 * CM, 0.056]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
}

export function World() {
  const geo = useMemo(() => {
    const parts: Part[] = []
    parts.push({ p: [3, TOP - 0.03, 0], s: [30, 0.06, 1.5], c: '#1c2227' }); parts.push({ p: [3, (TOP - 0.06) / 2, -0.1], s: [29.6, TOP - 0.06, 1.2], c: '#2b3136' })
    parts.push({ p: [3, 2.2, -3], s: [40, 4.4, 0.2], c: '#151a1e' }); parts.push({ p: [3, 0, 0], s: [40, 0.02, 12], c: '#22272b' })
    // 光具座：一根带刻度的导轨，每 10 cm 一道长刻度
    // 光具座：一根黑色的铝轨，上面两道导棱，两端各一只底脚（正面的标尺另画，见 Scale）
    const len = RAIL * 2 * CM + 0.24
    parts.push({ p: [ST.bench, TOP + 0.075, 0], s: [len, 0.07, 0.17], c: '#23282d' })
    for (const z of [-0.06, 0.06]) parts.push({ p: [ST.bench, TOP + 0.118, z], s: [len, 0.016, 0.022], c: '#3b4248' })
    for (const s of [-1, 1]) { parts.push({ p: [ST.bench + s * (len / 2 - 0.09), TOP + 0.02, 0], s: [0.16, 0.04, 0.4], c: '#2b3136' }); parts.push({ p: [ST.bench + s * (len / 2 - 0.09), TOP + 0.045, 0], s: [0.1, 0.03, 0.2], c: '#3b4248' }) }
    return mergeParts(parts)
  }, [])
  return (
    <group>
      <mesh geometry={geo} receiveShadow><Painted rough={0.8} metal={0.1} /></mesh>
      <Scale />
      <pointLight position={[3, 3.2, 2.5]} intensity={6} distance={24} decay={1.2} color="#cfd8e6" />
    </group>
  )
}
