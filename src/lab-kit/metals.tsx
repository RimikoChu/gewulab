// 金属材质：底色用实测的反射率，表面再贴一层加工留下的细纹，看着才像金属而不是灰塑料。
import { useMemo } from 'react'
import * as THREE from 'three'

/** 常见金属：color 是线性空间里的反射率，rough 是磨到什么程度 */
export const METALS = {
  steel:     { color: [0.56, 0.57, 0.58], rough: 0.3, metal: 1 },      // 钢
  stainless: { color: [0.67, 0.66, 0.64], rough: 0.2, metal: 1 },      // 不锈钢
  chrome:    { color: [0.78, 0.79, 0.8], rough: 0.06, metal: 1 },      // 镀铬
  aluminum:  { color: [0.88, 0.89, 0.9], rough: 0.38, metal: 1 },      // 铝
  copper:    { color: [0.95, 0.64, 0.54], rough: 0.28, metal: 1 },     // 铜
  brass:     { color: [0.91, 0.78, 0.42], rough: 0.24, metal: 1 },     // 黄铜
  zinc:      { color: [0.66, 0.68, 0.7], rough: 0.42, metal: 1 },      // 锌
  iron:      { color: [0.3, 0.3, 0.3], rough: 0.62, metal: 0.9 },      // 铸铁
} as const
export type MetalName = keyof typeof METALS

/** 加工留下的细纹：turned 车出来的一圈圈，brushed 拉丝，cast 铸件的麻面 */
export type Grain = 'turned' | 'brushed' | 'cast'

/** 细纹的明暗图（0–1，越大越粗糙），四边能无缝拼接。单独拿出来是为了能测 */
export function grainData(kind: Grain, N = 256) {
  let s = kind === 'turned' ? 11 : kind === 'brushed' ? 23 : 37
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  const d = new Float32Array(N * N)
  if (kind === 'turned') {
    // 车刀一圈圈走过：每一行一个明暗，再叠一层更密的
    const row = Array.from({ length: N }, () => rnd())
    for (let y = 0; y < N; y++) { const v = 0.62 + 0.26 * (row[y] * 0.6 + row[(y * 3) % N] * 0.4) + 0.08 * Math.sin(y / N * Math.PI * 2 * 12); for (let x = 0; x < N; x++) d[y * N + x] = v }
  } else if (kind === 'brushed') {
    d.fill(0.7)
    for (let i = 0; i < 2600; i++) {            // 几千条长短不一的横向细划痕
      const y = Math.floor(rnd() * N), x0 = Math.floor(rnd() * N), len = 12 + Math.floor(rnd() * 90), v = (rnd() - 0.5) * 0.34
      for (let k = 0; k < len; k++) d[y * N + (x0 + k) % N] += v * Math.sin(k / len * Math.PI)
    }
  } else {
    d.fill(0.74)
    for (let i = 0; i < 520; i++) {             // 柔和的斑块
      const cx = rnd() * N, cy = rnd() * N, r = 3 + rnd() * 9, v = (rnd() - 0.5) * 0.3
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const q = 1 - Math.hypot(x - cx, y - cy) / r
        if (q > 0) d[((y % N + N) % N) * N + (x % N + N) % N] += v * q * q
      }
    }
    for (let i = 0; i < d.length; i++) d[i] += (rnd() - 0.5) * 0.1   // 再撒一层细砂
  }
  for (let i = 0; i < d.length; i++) d[i] = Math.min(1, Math.max(0.3, d[i]))
  return d
}

const cache = new Map<string, THREE.DataTexture>()
/** 把细纹做成贴图。只用在粗糙度上（颜色不变），所以金属的高光会被纹路拉长、打散 */
export function makeGrain(kind: Grain, repeat: [number, number] = kind === 'turned' ? [1, 6] : kind === 'brushed' ? [2, 4] : [3, 3]) {
  const key = `${kind}:${repeat}`, hit = cache.get(key)
  if (hit) return hit
  const N = 256, d = grainData(kind, N), px = new Uint8Array(N * N * 4)
  for (let i = 0; i < d.length; i++) { const v = Math.round(d[i] * 255); px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255 }
  const t = new THREE.DataTexture(px, N, N)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true
  cache.set(key, t)
  return t
}

interface MetalProps { kind: MetalName; grain?: Grain; repeat?: [number, number]; rough?: number; env?: number }
/**
 * 金属材质，和别的材质一样写在 mesh 里：<mesh><cylinderGeometry /><Metal kind="brass" grain="turned" /></mesh>
 * grain：表面的细纹，不写就是抛光面；rough：想比默认更亮或更毛时改它；env：反射环境的强度。
 * 细纹贴图会把粗糙度压低一些，所以带纹路时底数自动放大，整体亮度和不带时差不多。
 */
export function Metal({ kind, grain, repeat, rough, env = 1 }: MetalProps) {
  const m = METALS[kind]
  const color = useMemo(() => new THREE.Color().setRGB(m.color[0], m.color[1], m.color[2]), [m])
  const map = useMemo(() => grain ? makeGrain(grain, repeat) : null, [grain, repeat?.[0], repeat?.[1]])   // eslint-disable-line react-hooks/exhaustive-deps
  const r = rough ?? m.rough
  return <meshStandardMaterial color={color} metalness={m.metal} roughness={map ? Math.min(1, r / 0.72) : r} roughnessMap={map} envMapIntensity={env} />
}
