// 看得见的现象：白雾（浓盐酸挥发、石灰乳）、气泡（金属和酸反应）、一滴一滴落下的液滴、热气的扭动。
// 白雾是软边贴片粒子；气泡用一批实例化的小球，每帧按时间重排。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type V3 = [number, number, number]

let puffTex: THREE.CanvasTexture | null = null
/** 一团软边的“云”：几个错开的径向渐变叠起来，边缘不规则 */
function getPuff() {
  if (puffTex) return puffTex
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 14; i++) {
    const ox = (r() - 0.5) * 30, oy = (r() - 0.5) * 30, x = S / 2 + ox, y = S / 2 + oy, R = Math.min(62 - Math.max(Math.abs(ox), Math.abs(oy)), 20 + r() * 26)
    const q = g.createRadialGradient(x, y, 0, x, y, R); q.addColorStop(0, 'rgba(255,255,255,0.32)'); q.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = q; g.fillRect(0, 0, S, S)
  }
  puffTex = new THREE.CanvasTexture(c); puffTex.colorSpace = THREE.SRGBColorSpace
  return puffTex
}

export interface PuffOpt { rate: number; life: number; size: [number, number]; speed: number; dir?: V3; spread?: number; color: string; opacity: number; accel?: V3; drag?: number; jitter?: number }
/** 一个粒子喷口：on 为真时持续往外冒 */
export function Puffs({ at, on, opt, seed = 1 }: { at: V3; on: boolean; opt: PuffOpt; seed?: number }) {
  const N = Math.min(90, Math.ceil(opt.rate * opt.life) + 2)
  const st = useMemo(() => {
    const tex = getPuff()
    const sprites = Array.from({ length: N }, () => { const m = new THREE.SpriteMaterial({ map: tex, color: opt.color, transparent: true, depthWrite: false, opacity: 0 }); const sp = new THREE.Sprite(m); sp.visible = false; sp.renderOrder = 15; return sp })
    let sd = seed * 977 + 13
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    return { sprites, p: sprites.map(() => ({ age: 1e9, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: 0, spin: 0 })), acc: 0, next: 0, rnd }
  }, [N, opt.color, seed])   // eslint-disable-line react-hooks/exhaustive-deps
  const dir = useMemo(() => new THREE.Vector3(...(opt.dir ?? [0, 1, 0])).normalize(), [opt.dir?.[0], opt.dir?.[1], opt.dir?.[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), { p, sprites, rnd } = st
    if (on) st.acc += opt.rate * dt
    while (st.acc >= 1) {
      st.acc -= 1
      const q = p[st.next], sp = opt.spread ?? 0.3, j = opt.jitter ?? 0
      st.next = (st.next + 1) % N
      q.age = 0; q.pos.set(at[0] + (rnd() - 0.5) * j * 2, at[1] + (rnd() - 0.5) * j, at[2] + (rnd() - 0.5) * j * 2)
      q.vel.set(dir.x + (rnd() - 0.5) * sp * 2, dir.y + (rnd() - 0.5) * sp * 2, dir.z + (rnd() - 0.5) * sp * 2).normalize().multiplyScalar(opt.speed * (0.7 + rnd() * 0.6))
      q.rot = rnd() * 6.28; q.spin = (rnd() - 0.5) * 0.8
    }
    const a = opt.accel ?? [0, 0, 0], drag = opt.drag ?? 0
    for (let i = 0; i < N; i++) {
      const q = p[i], s = sprites[i]
      q.age += dt
      if (q.age > opt.life) { s.visible = false; continue }
      q.vel.x += a[0] * dt; q.vel.y += a[1] * dt; q.vel.z += a[2] * dt
      q.vel.multiplyScalar(Math.max(0, 1 - drag * dt))
      q.pos.addScaledVector(q.vel, dt)
      const k = q.age / opt.life, size = opt.size[0] + (opt.size[1] - opt.size[0]) * Math.sqrt(k)
      s.visible = true; s.position.copy(q.pos); s.scale.set(size, size, 1)
      const m = s.material as THREE.SpriteMaterial
      m.opacity = opt.opacity * Math.min(1, k / 0.12) * (1 - k) ** 1.3
      m.rotation = q.rot + q.spin * q.age
    }
  })
  return <group>{st.sprites.map((s, i) => <primitive key={i} object={s} />)}</group>
}

const sph = new THREE.SphereGeometry(1, 10, 8)
const dummy = new THREE.Object3D()
/** 一串往上冒的气泡：从 at 附近冒出，升到 top（相对高度）消失。rate 每秒几个，spread 出生点散开的半径（或 [x 方向, z 方向]） */
export function Bubbles({ at, top, on, rate = 30, r = 0.01, spread = 0.02, speed = 0.4, color = '#ffffff', seed = 1, opacity = 0.55 }: { at: V3; top: number; on: boolean; rate?: number; r?: number; spread?: number | [number, number]; speed?: number; color?: string; seed?: number; opacity?: number }) {
  const N = Math.min(160, Math.ceil(rate * top / speed * 1.3) + 4)
  const ref = useRef<THREE.InstancedMesh>(null)
  const st = useMemo(() => { let s = seed * 7919 + 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; return { p: Array.from({ length: N }, () => ({ age: 1e9, x: 0, z: 0, v: 0, s: 1, w: 0 })), acc: 0, next: 0, rnd } }, [N, seed])
  const [sx, sz] = typeof spread === 'number' ? [spread, spread] : spread
  useFrame((_, d) => {
    const m = ref.current; if (!m) return
    const dt = Math.min(d, 1 / 30)
    if (on) st.acc += rate * dt
    while (st.acc >= 1) { st.acc -= 1; const q = st.p[st.next]; st.next = (st.next + 1) % N; const a = st.rnd() * 6.283, rr = Math.sqrt(st.rnd()); q.age = 0; q.x = Math.cos(a) * rr * sx; q.z = Math.sin(a) * rr * sz; q.v = speed * (0.7 + st.rnd() * 0.6); q.s = 0.5 + st.rnd() * 0.8; q.w = st.rnd() * 6 }
    for (let i = 0; i < N; i++) {
      const q = st.p[i], y = q.age * q.v
      q.age += dt
      if (y > top) dummy.scale.setScalar(0)
      else { dummy.position.set(at[0] + q.x + Math.sin(q.age * 9 + q.w) * r * 0.4, at[1] + y, at[2] + q.z); dummy.scale.setScalar(r * q.s * Math.min(1, q.age * 8)) }
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[sph, undefined, N]} renderOrder={9} frustumCulled={false}><meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.05} clearcoat={1} envMapIntensity={2} depthWrite={false} /></instancedMesh>
}

/** 一滴液体：从 at 往下落 drop 的高度。t 是 0–1 的进度：前一半在管口长大，后一半落下去。t ≤ 0 或 ≥ 1 时不画 */
export function Drop({ at, drop, t, r, color = '#e4eef0' }: { at: V3; drop: number; t: number; r: number; color?: string }) {
  if (t <= 0 || t >= 1) return null
  const grow = Math.min(1, t / 0.45), fall = Math.max(0, (t - 0.45) / 0.55)
  return <mesh position={[at[0], at[1] - r - drop * fall * fall, at[2]]} scale={[r * (0.5 + 0.5 * grow), r * (0.6 + 0.6 * grow + fall * 0.4), r * (0.5 + 0.5 * grow)]} geometry={sph} renderOrder={9}>
    <meshPhysicalMaterial color={color} transparent opacity={0.8} roughness={0.02} clearcoat={1} envMapIntensity={2.2} depthWrite={false} />
  </mesh>
}

/** 一股细细往下流的液体：从 top 到 bottom，带一点流动的明暗 */
export function Stream({ top, bottom, r, on, color = '#e8eef0', opacity = 0.6 }: { top: V3; bottom: V3; r: number; on: boolean; color?: string; opacity?: number }) {
  const m = useRef<THREE.MeshPhysicalMaterial>(null)
  useFrame((_, d) => { if (m.current) m.current.opacity += ((on ? opacity : 0) - m.current.opacity) * Math.min(1, d * 6) })
  const len = Math.hypot(top[0] - bottom[0], top[1] - bottom[1], top[2] - bottom[2])
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(top[0] - bottom[0], top[1] - bottom[1], top[2] - bottom[2]).normalize()), [top[0], top[1], top[2], bottom[0], bottom[1], bottom[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh position={[(top[0] + bottom[0]) / 2, (top[1] + bottom[1]) / 2, (top[2] + bottom[2]) / 2]} quaternion={quat} renderOrder={9}>
    <cylinderGeometry args={[r * 0.7, r, len, 12, 1, true]} />
    <meshPhysicalMaterial ref={m} color={color} transparent opacity={0} roughness={0.05} clearcoat={1} envMapIntensity={2} depthWrite={false} />
  </mesh>
}
