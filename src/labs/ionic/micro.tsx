// 微观放大窗：浮在器材旁边的一扇圆窗，里面是溶液里的离子和分子（示意，不按比例、不按数目）。
// 颜色全间统一，写在 SP 里；面板上的图例也从这里取。窗口用一根细引线连到它放大的那一处。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import type { V3 } from './world'

/** 粒子的样子：颜色、半径（相对窗口半径）；分子是两个球连在一起（pair 是第二个球的颜色和半径） */
export const SP = {
  H: { name: 'H⁺（H₃O⁺）', color: '#ff5a4a', r: 0.05 },
  OH: { name: 'OH⁻', color: '#3f86ff', r: 0.055 },
  Cl: { name: 'Cl⁻', color: '#46c96a', r: 0.06 },
  Na: { name: 'Na⁺', color: '#a77bff', r: 0.05 },
  Ac: { name: 'CH₃COO⁻', color: '#f2a43a', r: 0.07 },
  HAc: { name: 'CH₃COOH 分子', color: '#f2a43a', r: 0.07, pair: { color: '#ff5a4a', r: 0.045 } },
  NH4: { name: 'NH₄⁺', color: '#2fd0c4', r: 0.062 },
  NH3: { name: 'NH₃·H₂O 分子', color: '#2fd0c4', r: 0.062, pair: { color: '#3f86ff', r: 0.045 } },
  Ag: { name: 'Ag⁺', color: '#e3e7ee', r: 0.055 },
  I: { name: 'I⁻', color: '#7a4fd6', r: 0.07 },
  NO3: { name: 'NO₃⁻', color: '#8a96a3', r: 0.06 },
  K: { name: 'K⁺', color: '#d77bd0', r: 0.055 },
  CO3: { name: 'CO₃²⁻', color: '#c9b27a', r: 0.07 },
  HCO3: { name: 'HCO₃⁻', color: '#c9b27a', r: 0.07, pair: { color: '#ff5a4a', r: 0.045 } },
  AgCl: { name: 'AgCl 沉淀', color: '#f4f4f0', r: 0.04, cluster: true },
  AgI: { name: 'AgI 沉淀', color: '#ecd34a', r: 0.04, cluster: true },
  H2O: { name: '水分子', color: '#8fa9b8', r: 0.032 },
} as const
export type Sp = keyof typeof SP
export type Mix = Partial<Record<Sp, number>>

interface P { sp: Sp; x: number; y: number; z: number; vx: number; vy: number; a: number; w: number; s: number }
const sph = new THREE.SphereGeometry(1, 16, 12)
const dummy = new THREE.Object3D(), col = new THREE.Color()
/** 颗粒团：7 个小球挤在一起的相对位置 */
const CLUMP: [number, number, number][] = [[0, 0, 0], [1.6, 0.3, 0], [-1.5, 0.5, 0.3], [0.4, 1.6, -0.2], [-0.5, -1.5, 0.2], [1.1, -1.2, -0.3], [-1.2, 1.4, -0.3]]

/**
 * 放大窗。at：窗的中心；r：窗的半径（画面单位）；yaw：窗面朝向（和机位的方位角一致，正对镜头）；
 * from：引线落在器材上的那一点；mix：每种粒子画几个；water：画不画水分子
 */
export function Micro({ at, r, yaw = 0, from, mix, water = true, seed = 1 }: { at: V3; r: number; yaw?: number; from?: V3; mix: Mix; water?: boolean; seed?: number }) {
  const MAX = 260
  const ref = useRef<THREE.InstancedMesh>(null)
  const st = useRef<{ list: P[]; rnd: () => number }>(null as never)
  if (!st.current) { let s = seed * 7919 + 11; st.current = { list: [], rnd: () => (s = (s * 16807) % 2147483647) / 2147483647 } }
  const key = JSON.stringify(mix) + water
  // 数目变了：同一种粒子保留原来的位置，多出来的从随机位置长出来，少了的去掉
  useEffect(() => {
    const { list, rnd } = st.current, next: P[] = []
    const want: Mix = { ...mix, ...(water ? { H2O: 26 } : {}) }
    for (const sp of Object.keys(want) as Sp[]) {
      const n = Math.round(want[sp] ?? 0), have = list.filter(p => p.sp === sp)
      for (let i = 0; i < n; i++) {
        if (have[i]) { next.push(have[i]); continue }
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.8, sp0 = (sp === 'AgCl' || sp === 'AgI') ? 0.04 : sp === 'H2O' ? 0.12 : 0.22
        next.push({ sp, x: Math.cos(a) * d, y: Math.sin(a) * d, z: (rnd() - 0.5) * 0.2, vx: (rnd() - 0.5) * sp0, vy: (rnd() - 0.5) * sp0, a: rnd() * 6.28, w: (rnd() - 0.5) * 3, s: 0 })
      }
    }
    st.current.list = next
  }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    const m = ref.current; if (!m) return
    const dt = Math.min(d, 1 / 30), lim = 0.84
    let k = 0
    for (const p of st.current.list) {
      // 布朗运动：速度慢慢随机拐弯，碰到窗边弹回来
      const jit = p.sp === 'AgCl' || p.sp === 'AgI' ? 0.02 : 0.25
      p.vx += (st.current.rnd() - 0.5) * jit * dt * 6; p.vy += (st.current.rnd() - 0.5) * jit * dt * 6
      const sp = Math.hypot(p.vx, p.vy), cap = jit * 0.9; if (sp > cap) { p.vx *= cap / sp; p.vy *= cap / sp }
      p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.w * dt; p.s = Math.min(1, p.s + dt * 2.5)
      const dd = Math.hypot(p.x, p.y); if (dd > lim) { p.x *= lim / dd; p.y *= lim / dd; p.vx = -p.vx; p.vy = -p.vy }
      const def = SP[p.sp] as { color: string; r: number; pair?: { color: string; r: number }; cluster?: boolean }
      const put = (x: number, y: number, z: number, rr: number, c: string) => {
        if (k >= MAX) return
        dummy.position.set(x * r, y * r, z * r); dummy.scale.setScalar(rr * r * p.s); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix)
        m.setColorAt(k, col.set(c)); k++
      }
      if (def.cluster) for (const [cx, cy, cz] of CLUMP) put(p.x + cx * def.r * 1.05, p.y + cy * def.r * 1.05, p.z + cz * def.r, def.r, def.color)
      else {
        put(p.x, p.y, p.z, def.r, def.color)
        if (def.pair) { const off = def.r + def.pair.r * 0.7; put(p.x + Math.cos(p.a) * off, p.y + Math.sin(p.a) * off, p.z, def.pair.r, def.pair.color) }
      }
    }
    for (let i = k; i < MAX; i++) { dummy.scale.setScalar(0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix) }
    m.count = MAX; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  // 引线：从器材上的一点连到窗边最近的地方
  const lead = useMemo(() => {
    if (!from) return null
    const c = new THREE.Vector3(...at), f = new THREE.Vector3(...from), dir = f.clone().sub(c).normalize()
    const e = c.clone().addScaledVector(dir, r * 1.04), len = e.distanceTo(f), mid = e.clone().add(f).multiplyScalar(0.5)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.clone().sub(e).normalize())
    return { mid: mid.toArray() as V3, len, q }
  }, [at[0], at[1], at[2], from?.[0], from?.[1], from?.[2], r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>
    <group position={at} rotation-y={yaw}>
      {/* 窗底：深色、半透明，像显微镜视野 */}
      <mesh renderOrder={20}><circleGeometry args={[r, 64]} /><meshBasicMaterial color="#0b1822" transparent opacity={0.86} depthWrite={false} /></mesh>
      <mesh position-z={-0.002} renderOrder={19}><circleGeometry args={[r * 1.02, 64]} /><meshBasicMaterial color="#1f3442" transparent opacity={0.5} depthWrite={false} /></mesh>
      <mesh><torusGeometry args={[r * 1.02, r * 0.035, 12, 72]} /><Metal kind="aluminum" grain="turned" /></mesh>
      <group position-z={r * 0.12}>
        <instancedMesh ref={ref} args={[sph, undefined, MAX]} frustumCulled={false} renderOrder={21}>
          <meshStandardMaterial roughness={0.35} metalness={0.05} emissive="#ffffff" emissiveIntensity={0.08} />
        </instancedMesh>
      </group>
    </group>
    {lead && from && <>
      <mesh position={lead.mid} quaternion={lead.q} renderOrder={18}><cylinderGeometry args={[r * 0.012, r * 0.012, lead.len, 6]} /><meshBasicMaterial color="#dfe8ee" transparent opacity={0.7} depthWrite={false} /></mesh>
      <mesh position={from} renderOrder={18}><sphereGeometry args={[r * 0.04, 12, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
    </>}
  </group>
}

/** 面板上的图例：这扇窗里有哪几种粒子 */
export function Legend({ items }: { items: Sp[] }) {
  return <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[13px] text-white/80">
    {items.map(k => { const d = SP[k] as { name: string; color: string; pair?: { color: string } }; return <span key={k} className="flex items-center gap-1.5">
      <span className="inline-block size-3 rounded-full" style={{ background: d.color }} />{d.pair && <span className="-ml-2 inline-block size-2 rounded-full" style={{ background: d.pair.color }} />}{d.name}
    </span> })}
  </div>
}
