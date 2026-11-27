// 会动的小效果：热水上方的白汽、电极上冒的气泡、倒液体时的一股液流、品红在水里散开的一团颜色。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from './mats'
import type { V3 } from './world'

/** 软边的圆点贴图：白汽、颜色团都用它 */
let puffTex: THREE.CanvasTexture | null = null
function puff() {
  if (puffTex) return puffTex
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!, q = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.45, 'rgba(255,255,255,0.45)'); q.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = q; g.fillRect(0, 0, 128, 128)
  return (puffTex = new THREE.CanvasTexture(c))
}

/** 热水上方的白汽：一团团淡白的雾从水面升起、散开、消失。at 是水面中心，r 水面半径，h 升多高 */
export function Steam({ at, r, h, on = 1, n = 14 }: { at: V3; r: number; h: number; on?: number; n?: number }) {
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const seeds = useMemo(() => { const q = rng(41); return Array.from({ length: n }, () => [q(), q(), q()]) }, [n])
  const t = useRef(0)
  useFrame((_, d) => {
    t.current += Math.min(d, 1 / 30)
    seeds.forEach(([a, b, c], i) => {
      const s = refs.current[i]; if (!s) return
      const k = (t.current * 0.28 + a) % 1
      s.position.set(at[0] + (b - 0.5) * r * 1.2 + Math.sin(t.current + c * 6) * r * 0.25 * k, at[1] + k * h, at[2] + (c - 0.5) * r * 1.2)
      const sz = r * (0.5 + k * 1.4); s.scale.set(sz, sz, 1)
      ;(s.material as THREE.SpriteMaterial).opacity = on * 0.22 * Math.sin(k * Math.PI)
    })
  })
  return <group>{seeds.map((_, i) => <sprite key={i} ref={e => { refs.current[i] = e }}><spriteMaterial map={puff()} color="#ffffff" transparent depthWrite={false} opacity={0} /></sprite>)}</group>
}

/** 一串串上升的小气泡：从 at 冒出，升到 top（相对高度）消失；spread 气泡出来的范围 */
export function Bubbles({ at, top, on, rate = 30, r = 0.012, spread = 0.03, speed = 0.4, seed = 3 }: { at: V3; top: number; on: boolean; rate?: number; r?: number; spread?: number; speed?: number; seed?: number }) {
  const N = 60, mesh = useRef<THREE.InstancedMesh>(null)
  const st = useMemo(() => { const q = rng(seed); return Array.from({ length: N }, () => ({ x: (q() - 0.5) * spread, z: (q() - 0.5) * spread * 0.6, y: -1, s: 0.5 + q() * 0.8, w: q() * 6 })) }, [spread, seed])
  const acc = useRef(0), m = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => rng(seed + 1), [seed])
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), ms = mesh.current; if (!ms) return
    if (on) acc.current += dt * rate
    for (const b of st) {
      if (b.y < 0 && acc.current >= 1) { acc.current -= 1; b.y = 0; b.x = (q() - 0.5) * spread; b.z = (q() - 0.5) * spread * 0.6 }
      if (b.y >= 0) { b.y += dt * speed * (0.7 + b.s * 0.5); if (b.y > top) b.y = -1 }
    }
    st.forEach((b, i) => { const sc = b.y < 0 ? 0 : r * b.s; m.makeScale(sc, sc, sc).setPosition(at[0] + b.x + Math.sin(b.y * 40 + b.w) * r * 0.6, at[1] + Math.max(0, b.y), at[2] + b.z); ms.setMatrixAt(i, m) })
    ms.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, N]} frustumCulled={false} renderOrder={7}>
    <sphereGeometry args={[1, 10, 8]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.6} roughness={0.05} clearcoat={1} envMapIntensity={2.5} depthWrite={false} />
  </instancedMesh>
}

/** 倒液体时的一股液流：从 a 落到 b，上粗下细，表面在流动 */
export function Stream({ a, b, r, color, opacity = 0.55 }: { a: V3; b: V3; r: number; color: string; opacity?: number }) {
  const geo = useMemo(() => {
    const mid: V3 = [a[0] + (b[0] - a[0]) * 0.15, a[1] - (a[1] - b[1]) * 0.25, a[2] + (b[2] - a[2]) * 0.15]
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, b].map(p => new THREE.Vector3(...p))), 24, r, 10)
  }, [a[0], a[1], a[2], b[0], b[1], b[2], r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} renderOrder={8}><meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.05} clearcoat={1} envMapIntensity={2} depthWrite={false} /></mesh>
}

/**
 * 品红在水里散开：一粒品红沉在杯底，一缕缕洋红色的细丝从它周围往上飘、往外弯，丝越来越粗、越来越淡，
 * 最后整杯变成均匀的淡红色（整杯的颜色由外面的液体颜色负责）。每缕丝是三层半透明的管子叠起来：芯最浓、外层最淡。
 * at 杯底中心（液体里），R 杯的内半径，H 液深，k 散开的程度（0–1），seed 每杯的丝不一样
 */
export function DyeCloud({ at, R, H, k, seed = 1 }: { at: V3; R: number; H: number; k: number; seed?: number }) {
  const strands = useMemo(() => {
    const q = rng(seed)
    return Array.from({ length: 11 }, () => {
      const a0 = q() * Math.PI * 2, out = 0.35 + q() * 0.5, up = 0.45 + q() * 0.55, wig = 0.08 + q() * 0.1, ph = q() * 6.28, turn = (q() - 0.5) * 2.4
      const pts: THREE.Vector3[] = []
      for (let i = 0; i <= 16; i++) {
        const t = i / 16, a = a0 + turn * t, rr = Math.min(0.86, out * Math.pow(t, 0.8) + Math.sin(t * 7 + ph) * wig * t) * R
        pts.push(new THREE.Vector3(Math.cos(a) * rr, H * 0.94 * up * t + R * 0.02, Math.sin(a) * rr))
      }
      const curve = new THREE.CatmullRomCurve3(pts)
      return { up, geos: [1, 2.3, 4.2].map(w => new THREE.TubeGeometry(curve, 64, R * 0.018 * w, 8)) }
    })
  }, [seed, R, H])
  if (k <= 0) return null
  return <group position={at}>
    {/* 杯底的那粒品红，和它周围最浓的一小团 */}
    <mesh position-y={R * 0.03} scale={[1, 0.6, 1]}><icosahedronGeometry args={[R * 0.05, 0]} /><meshStandardMaterial color="#5a0636" roughness={0.4} /></mesh>
    <mesh position-y={R * 0.05} scale={[1, 0.45, 1]} renderOrder={6}><sphereGeometry args={[R * (0.12 + 0.5 * k), 24, 12]} /><meshBasicMaterial color="#b0106c" transparent opacity={0.35 * (1 - k * 0.7)} depthWrite={false} /></mesh>
    {strands.map((st, i) => {
      // 丝从杯底慢慢长上去：只画出已经长到的那一段；散得越开，丝越粗越淡
      const grow = Math.min(1, k * (1.4 + st.up)), fade = 1 - Math.min(1, k * 1.05)
      return st.geos.map((g, j) => {
        g.setDrawRange(0, Math.floor((g.index?.count ?? 0) * grow / 6) * 6)
        return <mesh key={`${i}-${j}`} geometry={g} scale={[1 + k * 0.6 * j, 1, 1 + k * 0.6 * j]} renderOrder={6}>
          <meshBasicMaterial color={j === 0 ? '#a50a62' : '#c8197a'} transparent opacity={[0.55, 0.22, 0.09][j] * (0.25 + 0.75 * fade)} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      })
    })}
  </group>
}
