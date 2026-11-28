// 港池的水面。平时是一整张不动的水面；上到水面上的课，把那一块换成一张会起伏的网格（WavePatch）：
// 每个顶点的高度每帧由这一课交来的函数算出来，法线和深浅跟着变，波峰亮、波谷暗，看得清波形。
// 网格四周一小圈把起伏收到 0，和外面不动的水面接上。
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRipple } from '@/lab-kit'
import type { PatchSpec } from './layout'

const UV = 1 / 5.5          // 水面细纹每 5.5 m 重复一次
const WATER = '#0f5563'

/** 水的材质：深青色、很光滑，映着天；细纹用法线贴图。tint 为真时按顶点颜色调深浅 */
function WaterMat({ tint = false }: { tint?: boolean }) {
  const ripple = useRipple(UV, 0.012)
  const scale = useMemo(() => new THREE.Vector2(0.11, 0.11), [])
  return <meshPhysicalMaterial color={WATER} roughness={0.14} metalness={0.05} normalMap={ripple} normalScale={scale} envMapIntensity={1.15} vertexColors={tint} clearcoat={0.3} clearcoatRoughness={0.2} />
}

/** 不动的大水面；hole 是让给起伏网格的那一块 */
export function Sea({ hole }: { hole: PatchSpec | null }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape(), R = 900
    s.moveTo(-R, -R); s.lineTo(R, -R); s.lineTo(R, R); s.lineTo(-R, R); s.closePath()
    if (hole) {
      const h = new THREE.Path(), e = 0.4, x0 = hole.cx - hole.w / 2 + e, x1 = hole.cx + hole.w / 2 - e, y0 = -hole.cz - hole.d / 2 + e, y1 = -hole.cz + hole.d / 2 - e   // 洞比网格小一圈，接缝处两层叠着，不露底
      h.moveTo(x0, y0); h.lineTo(x0, y1); h.lineTo(x1, y1); h.lineTo(x1, y0); h.closePath(); s.holes.push(h)
    }
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2)
    return g
  }, [hole])
  useLayoutEffect(() => () => geo.dispose(), [geo])
  return <mesh geometry={geo} position-y={-0.012} receiveShadow><WaterMat /></mesh>
}

/** 网格上各顶点的位置：xs、zs 是世界坐标，nx、nz 是两个方向的点数 */
export interface Grid { spec: PatchSpec; nx: number; nz: number; n: number; xs: Float32Array; zs: Float32Array; fade: Float32Array }
export function makeGrid(spec: PatchSpec): Grid {
  const nx = Math.round(spec.w / spec.step) + 1, nz = Math.round(spec.d / spec.step) + 1, n = nx * nz
  const xs = new Float32Array(n), zs = new Float32Array(n), fade = new Float32Array(n), band = 3
  const sm = (u: number) => { const k = Math.min(1, Math.max(0, u)); return k * k * (3 - 2 * k) }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, x = -spec.w / 2 + i * spec.step, z = -spec.d / 2 + j * spec.step
    xs[k] = spec.cx + x; zs[k] = spec.cz + z
    fade[k] = sm((spec.w / 2 - Math.abs(x)) / band) * sm((spec.d / 2 - Math.abs(z)) / band)
  }
  return { spec, nx, nz, n, xs, zs, fade }
}
/**
 * 会起伏的水面。fill 每帧被叫一次：把各顶点此刻的高度写进 out（序号和 grid 的 xs、zs 对应），dt 是这一帧的时间（封顶 1/30 s）。
 * chop：平时水面上一层很浅的碎波有多高（m，只为了水面不是死平的，不参与读数）。
 * high：波高到这个数时颜色的深浅变化到头（一般给这一课的最大振幅）。四周的收边在这里统一做，fill 不用管。
 */
export function WavePatch({ grid, fill, high = 0.2, chop = 0 }: { grid: Grid; fill: (out: Float32Array, dt: number) => void; high?: number; chop?: number }) {
  const { geo, y } = useMemo(() => {
    const { nx, nz, n, xs, zs } = grid, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3).fill(1), uv = new Float32Array(n * 2)
    for (let k = 0; k < n; k++) { pos[k * 3] = xs[k]; pos[k * 3 + 2] = zs[k]; nor[k * 3 + 1] = 1; uv[k * 2] = xs[k]; uv[k * 2 + 1] = -zs[k] }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    g.setIndex(new THREE.BufferAttribute(idx, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(grid.spec.cx, 0, grid.spec.cz), Math.hypot(grid.spec.w, grid.spec.d) / 2 + 2)
    return { geo: g, y: new Float32Array(n) }
  }, [grid])
  useLayoutEffect(() => () => geo.dispose(), [geo])
  const cb = useRef(fill); cb.current = fill
  const clock = useRef(0)
  useFrame((_, d) => {
    const { nx, nz, n, fade, spec, xs, zs } = grid
    cb.current(y, Math.min(d, 1 / 30))
    if (chop > 0) { const t = (clock.current += Math.min(d, 1 / 30)); for (let k = 0; k < n; k++) y[k] += chop * (Math.sin(1.9 * xs[k] + 0.7 * zs[k] + 1.7 * t) + Math.sin(0.8 * xs[k] - 2.3 * zs[k] - 2.1 * t) + 0.6 * Math.sin(3.1 * zs[k] + 1.1 * xs[k] + 2.6 * t)) }
    const pos = geo.attributes.position.array as Float32Array, nor = geo.attributes.normal.array as Float32Array, col = geo.attributes.color.array as Float32Array
    for (let k = 0; k < n; k++) { const h = y[k] * fade[k]; y[k] = h; pos[k * 3 + 1] = h }
    const inv = 1 / (2 * spec.step)
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i
      const dx = (y[i < nx - 1 ? k + 1 : k] - y[i > 0 ? k - 1 : k]) * inv, dz = (y[j < nz - 1 ? k + nx : k] - y[j > 0 ? k - nx : k]) * inv
      const l = 1 / Math.sqrt(dx * dx + dz * dz + 1)
      nor[k * 3] = -dx * l; nor[k * 3 + 1] = l; nor[k * 3 + 2] = -dz * l
      const h = Math.max(-1.4, Math.min(1.5, y[k] / high))
      const c = h > 0 ? 1 + h * 1.1 : 1 + h * 0.5
      col[k * 3] = c + (h > 0 ? h * 0.5 : 0); col[k * 3 + 1] = c; col[k * 3 + 2] = c
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.attributes.color.needsUpdate = true
  })
  return <mesh geometry={geo} receiveShadow><WaterMat tint /></mesh>
}

