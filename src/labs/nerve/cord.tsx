// 放大的一段脊髓（第 3、4 课）：一截脊髓横着朝镜头剖开，切面上是蝴蝶形的灰质（神经元的细胞体集中的地方）和外面一圈白质；
// 左右各伸出背根（带一个膨大的神经节）和腹根，汇成脊神经。坐标是模型自己的：脊髓半径约 1，轴线沿 z，切面在 z = LEN/2 朝镜头，背侧朝 +y。
import { useMemo } from 'react'
import * as THREE from 'three'
import { useJob } from './job'
import { wetMat } from './mats'
import { ellipsoid, fbm, lin, mix3, noise, roundCone, smin, sminAll, surfaceNetsGen, type V3 } from './sdf'

export const LEN = 2.6
const FRONT = LEN / 2
/** 切面上灰质的形状（二维，里面为负）：两个背角、两个腹角、中间的灰质连合 */
function gray2(x: number, y: number) {
  const ax = Math.abs(x)
  const ell = (cx: number, cy: number, rx: number, ry: number, a: number) => { const dx = ax - cx, dy = y - cy, c = Math.cos(a), s = Math.sin(a), u = dx * c + dy * s, v = -dx * s + dy * c; return (Math.hypot(u / rx, v / ry) - 1) * Math.min(rx, ry) }
  return sminAll([ell(0.34, 0.36, 0.11, 0.42, -0.42), ell(0.4, -0.28, 0.3, 0.29, 0.2), ell(0.2, 0.0, 0.24, 0.11, 0)], 0.12)
}
const rootPts = (s: number) => ({
  dorsal: [[s * 0.42, 0.72, 0], [s * 1.05, 0.9, 0], [s * 1.6, 0.78, 0], [s * 2.15, 0.45, 0]] as V3[],
  ventral: [[s * 0.55, -0.6, 0], [s * 1.2, -0.55, 0], [s * 1.8, -0.15, 0], [s * 2.15, 0.25, 0]] as V3[],
  nerve: [[s * 2.15, 0.36, 0], [s * 3.4, 0.3, 0], [s * 4.4, 0.15, 0]] as V3[],
  ganglion: [s * 1.55, 0.82, 0] as V3,
})
export const ROOTS = { L: rootPts(-1), R: rootPts(1) }
/** 反射在切面上走的路：从左边的脊神经进来 → 背根 → 背角 → 中间神经元 → 腹角 → 腹根 → 脊神经出去（切面略往前一点，画在切面上） */
export const ARC_IN: V3[] = [[-4.4, 0.15, 0.2], [-3.4, 0.3, 0.2], [-2.15, 0.45, 0.2], [-1.55, 0.82, 0.2], [-1.0, 0.88, 0.4], [-0.42, 0.72, 0.9], [-0.34, 0.42, FRONT + 0.02]]
export const ARC_MID: V3[] = [[-0.34, 0.42, FRONT + 0.02], [-0.26, 0.12, FRONT + 0.02], [-0.34, -0.15, FRONT + 0.02], [-0.42, -0.3, FRONT + 0.02]]
export const ARC_OUT: V3[] = [[-0.42, -0.3, FRONT + 0.02], [-0.58, -0.6, 0.9], [-1.2, -0.55, 0.3], [-1.8, -0.15, 0.2], [-2.15, 0.3, 0.2], [-3.4, 0.22, 0.2], [-4.4, 0.05, 0.2]]
/** 往上传到脑的那一条：从背角沿白质往上（往后，沿 −z 方向走出这一截） */
export const ARC_UP: V3[] = [[-0.34, 0.42, FRONT + 0.02], [-0.5, 0.62, 0.6], [-0.55, 0.66, -0.4], [-0.5, 0.66, -FRONT - 0.6]]

function cordSdf(x: number, y: number, z: number) {
  const body = Math.max(Math.hypot(x / 1.15, y / 0.92) * 0.95 - 0.95, Math.abs(z) - FRONT)
  // 背面正中的浅沟、腹面正中的深裂
  const groove = Math.max(0, 1 - Math.hypot(x / 0.05, (y - 0.9) / 0.18)) * 0.06 + Math.max(0, 1 - Math.hypot(x / 0.06, (y + 0.85) / 0.3)) * 0.12
  let d = body + groove
  for (const s of [ROOTS.L, ROOTS.R]) {
    const bundle = (pts: V3[], r0: number, r1: number) => { let e = 1e9; for (let i = 0; i < pts.length - 1; i++) e = Math.min(e, roundCone(x, y, z, pts[i], pts[i + 1], r0 + (r1 - r0) * i / (pts.length - 1), r0 + (r1 - r0) * (i + 1) / (pts.length - 1))); return e }
    d = smin(d, bundle(s.dorsal, 0.13, 0.16), 0.12)
    d = smin(d, bundle(s.ventral, 0.12, 0.15), 0.12)
    d = smin(d, bundle(s.nerve, 0.24, 0.2), 0.15)
    d = smin(d, ellipsoid(x, y, z, s.ganglion, [0.34, 0.24, 0.27]), 0.1)
  }
  return d + 0.008 * fbm(x * 6, y * 6, z * 6, 2)
}
const C = { white: lin('#efe3d3'), gray: lin('#b9837f'), canal: lin('#4a2a2e'), root: lin('#e9d49e'), pia: lin('#e8c4b8'), vessel: lin('#b4454e') }
function* cordGen() {
  return yield* surfaceNetsGen(cordSdf, [[-4.6, -1.15, -FRONT - 0.15], [4.6, 1.2, FRONT + 0.15]], 0.028, (p, n) => {
    const onFace = n[2] > 0.85 && p[2] > FRONT - 0.04
    const r = Math.hypot(p[0] / 1.15, p[1] / 0.92)
    if (onFace && r < 1.0) {
      if (Math.hypot(p[0], p[1]) < 0.035) return C.canal
      const g = gray2(p[0], p[1])
      return g < 0 ? mix3(C.gray, C.canal, 0.15 * (1 + noise(p[0] * 20, p[1] * 20, 0))) : mix3(C.white, C.gray, Math.max(0, 0.25 - g * 2))
    }
    if (r > 1.05) return mix3(C.root, C.pia, 0.15)
    // 软脊膜上细细的血管
    const v = Math.max(0, 1 - Math.abs(noise(p[0] * 3, p[1] * 3, p[2] * 2.2)) / 0.05)
    return mix3(C.pia, C.vessel, v * 0.55)
  })
}
export const useCordGeo = () => useJob('cord', cordGen)

/** 那一段脊髓。灰质（神经中枢）亮多少由 hiGray 给 */
export function Cord({ hiGray = 0 }: { hiGray?: number }) {
  const geo = useCordGeo()
  const m = useMemo(() => wetMat(null, { roughness: 0.38 }), [])
  // 切面上灰质的高亮：一张贴在切面上的发光的蝴蝶形
  const fly = useMemo(() => {
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N
    const g = c.getContext('2d')!, img = g.createImageData(N, N)
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = (i / N - 0.5) * 2.4, y = (0.5 - j / N) * 2.4, d = gray2(x, y), a = d < 0 ? 1 : Math.max(0, 1 - d / 0.05); const k = (j * N + i) * 4; img.data[k] = 140; img.data[k + 1] = 240; img.data[k + 2] = 255; img.data[k + 3] = a * 255 }
    g.putImageData(img, 0, 0)
    return new THREE.CanvasTexture(c)
  }, [])
  return <group>
    {geo && <mesh geometry={geo} material={m} castShadow receiveShadow />}
    <mesh position={[0, 0, FRONT + 0.006]} renderOrder={7}><planeGeometry args={[2.4, 2.4]} /><meshBasicMaterial map={fly} transparent opacity={0.55 * hiGray} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
  </group>
}
