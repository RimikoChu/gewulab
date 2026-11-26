// 科普广场上的大地球仪：直径 2.4 m，NASA 的实拍影像（公有领域，和地球的运动、板块运动实验室共用同一张图）。
// 可以叠上三种图：7 月、1 月的气温（色带和每 10 ℃ 一条等温线）、年降水的多少（只画在陆地上）。
// 图是在画布上逐点算出来的：每一点的海陆从影像里分出来，气温、降水用 physics.ts 的简化模型（示意），分段生成（见 job.ts）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, useConcrete } from '@/lab-kit'
import { prioOf, useJob } from './job'
import { rainModel, tempModel, type LL } from './physics'

type V3 = [number, number, number]
/** 地球仪的位置、球心高度、半径 */
export const GLOBE = { x: 36, z: 6, y: 2.45, r: 1.2 }
const RAD = Math.PI / 180
/** 镜头从哪个方位角看地球仪（和 world.tsx 里的机位一致） */
export const GLOBE_AZ = -0.55
/** 让经度 lon 朝向镜头时，球要绕竖轴转多少 */
export const spinFor = (lon: number) => GLOBE_AZ - Math.PI / 2 - lon * RAD
/** 球面上一点在场景里的位置 */
export function globePoint([lon, lat]: LL, spin: number, lift = 1.02): V3 {
  const x = Math.cos(lat * RAD) * Math.cos(lon * RAD), y = Math.sin(lat * RAD), z = -Math.cos(lat * RAD) * Math.sin(lon * RAD)
  const c = Math.cos(spin), s = Math.sin(spin), R = GLOBE.r * lift
  return [GLOBE.x + (x * c + z * s) * R, GLOBE.y + y * R, GLOBE.z + (-x * s + z * c) * R]
}
/** 这一点在不在朝镜头的半边 */
export function globeFacing([lon, lat]: LL, spin: number) {
  const x = Math.cos(lat * RAD) * Math.cos(lon * RAD), z = -Math.cos(lat * RAD) * Math.sin(lon * RAD), c = Math.cos(spin), s = Math.sin(spin)
  const wx = x * c + z * s, wz = -x * s + z * c
  return wx * Math.sin(GLOBE_AZ) + wz * Math.cos(GLOBE_AZ) > 0.25
}

export type Layer = 'none' | 'jul' | 'jan' | 'rain'

// ---------- 叠加图 ----------
const W = 1024, H = 512, w = 256, h = 128
/** 一张经纬度图上的盒式模糊（经度方向首尾相接） */
function blur(src: Float32Array, rx: number, ry: number) {
  const a = new Float32Array(w * h), b = new Float32Array(w * h)
  for (let y = 0; y < h; y++) { let s = 0; for (let k = -rx; k <= rx; k++) s += src[y * w + ((k + w) % w)]; for (let x = 0; x < w; x++) { a[y * w + x] = s / (2 * rx + 1); s += src[y * w + ((x + rx + 1) % w)] - src[y * w + ((x - rx + w) % w)] } }
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { let s = 0, n = 0; for (let k = -ry; k <= ry; k++) { const yy = y + k; if (yy < 0 || yy >= h) continue; s += a[yy * w + x]; n++ } b[y * w + x] = s / n }
  return b
}
function tempColor(t: number, out: number[]) {
  // 冷到热：深蓝 → 浅蓝 → 浅黄 → 橙 → 深红
  const stops: [number, number[]][] = [[-40, [40, 60, 160]], [-15, [90, 150, 230]], [0, [190, 225, 245]], [12, [250, 240, 170]], [22, [250, 170, 70]], [32, [205, 50, 40]]]
  let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++
  const [t0, c0] = stops[i], [t1, c1] = stops[i + 1], k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))
  for (let j = 0; j < 3; j++) out[j] = c0[j] + (c1[j] - c0[j]) * k
}
function rainColor(p: number, out: number[]) {
  const dry = [214, 178, 110], mid = [150, 190, 110], wet = [30, 120, 150]
  const k = Math.min(1, Math.max(0, p))
  for (let j = 0; j < 3; j++) out[j] = k < 0.5 ? dry[j] + (mid[j] - dry[j]) * k * 2 : mid[j] + (wet[j] - mid[j]) * (k - 0.5) * 2
}
function* makeLayers(day: HTMLImageElement, aux: HTMLImageElement): Generator<void, Record<Layer, THREE.Texture>> {
  const cv = (cw: number, ch: number) => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; return c }
  const small = cv(w, h), sg = small.getContext('2d', { willReadFrequently: true })!; sg.drawImage(aux, 0, 0, w, h)
  const ad = sg.getImageData(0, 0, w, h).data, land = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) land[i] = ad[i * 4 + 1] > 110 ? 0 : 1             // 绿通道是海面范围
  yield
  const near = blur(land, 9, 5); yield
  const far = blur(land, 18, 10); yield
  const mid = blur(land, 6, 3); yield
  const at = (f: Float32Array, x: number, y: number) => f[Math.min(h - 1, Math.max(0, y)) * w + ((x % w) + w) % w]
  /** 双线性取值：x、y 是大图上的像素 */
  const bl = (f: Float32Array, X: number, Y: number) => { const fx = X / 4 - 0.5, fy = Y / 4 - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), kx = fx - x0, ky = fy - y0; return (at(f, x0, y0) * (1 - kx) + at(f, x0 + 1, y0) * kx) * (1 - ky) + (at(f, x0, y0 + 1) * (1 - kx) + at(f, x0 + 1, y0 + 1) * kx) * ky }
  const sh = Math.round(w * 12 / 360)
  const base = cv(W, H), bg = base.getContext('2d', { willReadFrequently: true })!; bg.drawImage(day, 0, 0, W, H)
  const bd = bg.getImageData(0, 0, W, H).data
  const big = cv(W, H), bgg = big.getContext('2d', { willReadFrequently: true })!; bgg.drawImage(aux, 0, 0, W, H)
  const fullSea = bgg.getImageData(0, 0, W, H).data
  yield
  const out: Partial<Record<Layer, THREE.Texture>> = {}
  const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }
  out.none = tex(base)
  const col = [0, 0, 0]
  for (const layer of ['jul', 'jan', 'rain'] as const) {
    const c = cv(W, H), g = c.getContext('2d')!, img = g.createImageData(W, H), d = img.data
    const val = new Float32Array(W * H)
    for (let y = 0; y < H; y++) {
      const lat = 90 - (y + 0.5) * 180 / H, sy = Math.floor(y / 4)
      for (let x = 0; x < W; x++) {
        const sx = Math.floor(x / 4), i = y * W + x, L = at(land, sx, sy)
        if (layer === 'rain') {
          const inland = L * Math.min(1, Math.max(0, (bl(far, x, y) - 0.5) / 0.42)), gw = bl(mid, x + sh * 4, y) - bl(mid, x - sh * 4, y)
          val[i] = rainModel(lat, inland, Math.max(0, gw) * 1.6, Math.max(0, -gw) * 1.6)
        } else val[i] = tempModel(lat, bl(near, x, y), layer === 'jul' ? 7 : 1)
      }
      if (y % 32 === 0) yield
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (x === 0 && y % 48 === 0) yield
      const i = y * W + x, k = i * 4, L = fullSea[k + 1] > 110 ? 0 : 1
      let a = 0.5
      if (layer === 'rain') { rainColor(val[i], col); a = L > 0.5 ? 0.82 : 0 } else tempColor(val[i], col)
      // 等温线：相邻两点跨过一个 10 ℃ 的整数倍
      let line = false
      if (layer !== 'rain') { const b = Math.floor(val[i] / 10), r = Math.floor(val[y * W + ((x + 1) % W)] / 10), dn = y < H - 1 ? Math.floor(val[i + W] / 10) : b, r2 = Math.floor(val[y * W + ((x + 2) % W)] / 10), dn2 = y < H - 2 ? Math.floor(val[i + 2 * W] / 10) : b; line = b !== r || b !== dn || b !== r2 || b !== dn2 }
      for (let j = 0; j < 3; j++) d[k + j] = line ? 30 : bd[k + j] * (1 - a) + col[j] * a
      d[k + 3] = 255
    }
    g.putImageData(img, 0, 0)
    out[layer] = tex(c)
    yield
  }
  return out as Record<Layer, THREE.Texture>
}

/** 地球仪：layer 叠哪一张图，spin 绕竖轴转了多少（弧度） */
export function Globe({ layer, spin }: { layer: Layer; spin: number }) {
  const [day, aux] = useTexture(['/assets/tex/earth_day.jpg', '/assets/tex/earth_aux.jpg'])
  const maps = useJob(day.image && aux.image ? 'climate:globe' : null, () => makeLayers(day.image as HTMLImageElement, aux.image as HTMLImageElement), prioOf('globe'))
  const ball = useRef<THREE.Mesh>(null), cur = useRef(spin)
  useFrame((_, d) => { cur.current += (spin - cur.current) * Math.min(1, d * 3); if (ball.current) ball.current.rotation.y = cur.current })
  const map = maps ? maps[layer] : day
  const parts = useMemo(() => ({
    base: lathe([[0, 0], [0.62, 0], [0.62, 0.06], [0.56, 0.1], [0.2, 0.16], [0.13, 0.3], [0.1, 0.62], [0.13, 0.7], [0.0, 0.72]], { segs: 64 }),
    cap: disc(0.07, 0.05, { segs: 24 }),
  }), [])
  const [, cn, cr] = useConcrete(6, 6)
  return (
    <group>
      {/* 广场：一圈浅色的铺地，几张长椅 */}
      <mesh position={[GLOBE.x, 0.03, GLOBE.z]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[8, 64]} /><meshStandardMaterial normalMap={cn} roughnessMap={cr} color="#c9c2b4" /></mesh>
      <mesh position={[GLOBE.x, 0.05, GLOBE.z]} rotation-x={-Math.PI / 2} receiveShadow><ringGeometry args={[2.0, 2.3, 64]} /><meshStandardMaterial color="#9b9488" roughness={0.9} /></mesh>
      {[0.9, 2.3, 3.9, 5.3].map((a, i) => <group key={i} position={[GLOBE.x + Math.cos(a) * 6.2, 0, GLOBE.z + Math.sin(a) * 6.2]} rotation-y={-a - Math.PI / 2}>
        <mesh position-y={0.45} castShadow><boxGeometry args={[1.8, 0.06, 0.45]} /><meshStandardMaterial color="#9a7652" roughness={0.75} /></mesh>
        {[-0.75, 0.75].map((x, j) => <mesh key={j} position={[x, 0.22, 0]} castShadow><boxGeometry args={[0.08, 0.44, 0.4]} /><Metal kind="iron" /></mesh>)}
      </group>)}
      <group position={[GLOBE.x, 0.05, GLOBE.z]}>
        <mesh geometry={parts.base} castShadow receiveShadow><Metal kind="iron" grain="cast" rough={0.55} /></mesh>
        {/* 立柱和半圆的子午圈 */}
        <mesh position-y={0.72 + 0.2} castShadow><cylinderGeometry args={[0.05, 0.07, 0.42, 20]} /><Metal kind="brass" grain="turned" /></mesh>
        <mesh position-y={GLOBE.y - 0.05} rotation={[0, GLOBE_AZ, -Math.PI / 2]} castShadow><torusGeometry args={[GLOBE.r + 0.07, 0.022, 12, 96, Math.PI]} /><Metal kind="brass" grain="turned" /></mesh>
        <mesh position-y={GLOBE.y - 0.05 - GLOBE.r - 0.07} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, 0.05, 12]} /><Metal kind="brass" /></mesh>
        <mesh position-y={GLOBE.y - 0.05 + GLOBE.r + 0.04} geometry={parts.cap}><Metal kind="brass" grain="turned" /></mesh>
      </group>
      <mesh ref={ball} position={[GLOBE.x, GLOBE.y, GLOBE.z]} castShadow>
        <sphereGeometry args={[GLOBE.r, 128, 64]} />
        <meshPhysicalMaterial map={map} roughness={0.62} clearcoat={0.25} clearcoatRoughness={0.4} envMapIntensity={0.35} />
      </mesh>
    </group>
  )
}
