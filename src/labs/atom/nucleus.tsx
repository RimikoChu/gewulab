// 原子核和电子云的模型。原子核：质子（红）和中子（灰）挤成一团，个数按真实的；大小在原子那一级是画大了的（示意）。
// 电子云：核外一团闪烁的小亮点，点密的地方电子出现得多；不画轨道。模型单位：原子核用 fm，电子云用 Å，由外面缩放。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { nucleusRadius } from './physics'
import { rng } from './mats'

export const P_COLOR = '#e2553e', N_COLOR = '#8d99a6'
const RN = 0.86                                   // 一个核子的半径（fm）

/** 把 A 个核子挤成一团：随机撒开，再反复推开重叠的、往中心拉。返回每个核子的位置（fm） */
const packCache = new Map<number, THREE.Vector3[]>()
export function pack(A: number) {
  const hit = packCache.get(A); if (hit) return hit
  const r = rng(11 + A), pts = Array.from({ length: A }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(2))
  const d = new THREE.Vector3()
  for (let it = 0; it < 400; it++) {
    for (const p of pts) p.multiplyScalar(0.985)
    for (let i = 0; i < A; i++) for (let j = i + 1; j < A; j++) {
      d.subVectors(pts[j], pts[i]); const l = d.length() || 1e-3
      if (l < RN * 1.9) { d.multiplyScalar((RN * 1.9 - l) / l * 0.5); pts[i].sub(d); pts[j].add(d) }
    }
  }
  const c = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / A); pts.forEach(p => p.sub(c))
  packCache.set(A, pts)
  return pts
}
/** 哪几个是质子：从上往下排好，质子和中子尽量错开 */
function roles(p: number, n: number) {
  const A = p + n, pts = pack(A), order = pts.map((v, i) => ({ i, k: v.y * 1.3 + v.x * 0.4 + v.z * 0.2 })).sort((a, b) => b.k - a.k).map(x => x.i)
  const isP = new Array(A).fill(false); let placed = 0
  order.forEach((idx, k) => { if (placed < p && (k * p / A >= placed - 0.01 || A - k <= p - placed)) { isP[idx] = true; placed++ } })
  // 数的顺序：先数质子，再数中子，各自从上往下
  const countOrder = [...order.filter(i => isP[i]), ...order.filter(i => !isP[i])]
  return { pts, isP, countOrder }
}

const ball = new THREE.SphereGeometry(1, 28, 18)
/**
 * 一个原子核：p 个质子、n 个中子。radius：画出来的半径（画面单位）；lit：已经数到的个数（按先质子后中子的顺序亮起来）；
 * only：只让质子或中子亮着，另一种变暗
 */
export function Nucleus({ p, n, radius, lit = 0, only, glow = 0 }: { p: number; n: number; radius: number; lit?: number; only?: 'p' | 'n'; glow?: number }) {
  const { pts, isP, countOrder } = useMemo(() => roles(p, n), [p, n])
  const real = nucleusRadius(p + n), k = radius / Math.max(real, RN * 1.05)
  const mats = useMemo(() => pts.map((_, i) => new THREE.MeshPhysicalMaterial({ color: isP[i] ? P_COLOR : N_COLOR, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 1.2 })), [pts, isP])
  const rank = useMemo(() => { const r: number[] = []; countOrder.forEach((idx, k) => { r[idx] = k }); return r }, [countOrder])
  mats.forEach((m, i) => {
    const on = rank[i] < lit, dim = only && (only === 'p') !== isP[i]
    m.emissive.set(on ? (isP[i] ? '#ff8a5c' : '#c9d6e2') : isP[i] ? '#ff5a3a' : '#9fb0c0'); m.emissiveIntensity = on ? 0.55 : glow * 0.9
    m.opacity = dim ? 0.25 : 1; m.transparent = !!dim
  })
  return <group scale={k}>
    {pts.map((v, i) => <mesh key={i} geometry={ball} material={mats[i]} position={v} scale={RN} />)}
  </group>
}
/** 第 k 个被数到的核子在哪（fm，模型里的位置） */
export function countedAt(p: number, n: number, k: number) { const { pts, countOrder } = roles(p, n); return pts[countOrder[Math.min(k, countOrder.length - 1)]] }

/**
 * 电子云：e 个电子分两层（2、e−2），用一团闪烁的亮点表示电子出现的地方。r：原子的半径（Å），点在这个范围里，越靠里越密。
 * 每一帧换掉一部分点的位置，看起来电子在很快地跑。
 */
export function ElectronCloud({ e, r, opacity = 1, seed = 5 }: { e: number; r: number; opacity?: number; seed?: number }) {
  const N = 160 + e * 300
  const { geo, sample } = useMemo(() => {
    const rr = rng(seed), g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3)
    // 内层的电子靠近原子核，外层的散得开
    const sample = (i: number) => {
      const inner = e > 2 ? i % e < 2 : true
      const a = inner && e > 2 ? r * 0.12 : r * 0.36
      let d = 0; for (let k = 0; k < 3; k++) d += -Math.log(1 - rr() * 0.999) * a / 1.6   // 指数分布叠起来：中间密、往外稀
      d = Math.min(d, r * 1.05)
      const u = rr() * 2 - 1, t = rr() * Math.PI * 2, s = Math.sqrt(1 - u * u)
      pos[i * 3] = d * s * Math.cos(t); pos[i * 3 + 1] = d * u; pos[i * 3 + 2] = d * s * Math.sin(t)
    }
    for (let i = 0; i < N; i++) sample(i)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { geo: g, sample }
  }, [N, e, r, seed])
  const at = useRef(0)
  useFrame(() => {
    if (opacity < 0.01) return
    for (let k = 0; k < N * 0.18; k++) { sample(at.current); at.current = (at.current + 7) % N }
    geo.attributes.position.needsUpdate = true
  })
  return <points geometry={geo} visible={opacity > 0.01}>
    <pointsMaterial color="#9fe7ff" size={3.2} sizeAttenuation={false} transparent opacity={0.85 * opacity} depthWrite={false} toneMapped={false} />
  </points>
}
