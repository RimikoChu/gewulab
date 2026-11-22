// 看不见的过程怎么画：白气和雾（一团团柔边的小片）、水里的气泡、离开液面的小颗粒、放大镜里的粒子、一点点长出来的霜。
// 都按时间算；强弱由外面给的 0–1 的数控制，这里只管画。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'

type V3 = [number, number, number]
const TAU = Math.PI * 2
const frac = (x: number) => x - Math.floor(x)
/** 每个颗粒自己的几个固定的随机数 */
const rnd = (i: number, k: number) => frac(Math.sin(i * 127.1 + k * 311.7) * 43758.5453)

let dot: THREE.CanvasTexture | null = null
/** 一个中间亮、边上淡出去的圆点：白气、雾、蒸气都用它叠出来 */
export function softDot() {
  if (dot) return dot
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')!, q = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.45, 'rgba(255,255,255,0.45)'); q.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = q; g.fillRect(0, 0, 64, 64)
  return (dot = new THREE.CanvasTexture(c))
}

/**
 * 一股往上飘的“白气”（也用来画雾、碘蒸气）：n 团柔边的小片，从 at 出发，往 dir 方向飘 len 这么远，边飘边变大、变淡。
 * on：强弱（0–1）；skip：开头这一段看不见（紧挨着管口的那一小段是水蒸气，看不见）；swirl：不往外飘，只在原地打转（瓶子里的蒸气）
 */
export function Puffs({ at, on, n = 16, dir = [0, 1, 0], len = 0.9, size = 0.3, spread = 0.12, color = '#c9d3da', dense = 0.3, speed = 0.4, skip = 0, swirl = false, order = 6 }: { at: V3; on: number; n?: number; dir?: V3; len?: number; size?: number; spread?: number; color?: string; dense?: number; speed?: number; skip?: number; swirl?: boolean; order?: number }) {
  const g = useRef<THREE.Group>(null), k = useRef(on); k.current = on
  const map = useMemo(softDot, []), cur = useRef(0)
  useFrame(({ clock }, d) => {
    cur.current += (k.current - cur.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.5))
    const t = clock.elapsedTime
    g.current?.children.forEach((s, i) => {
      const p = frac(t * speed * (0.7 + rnd(i, 1) * 0.6) + rnd(i, 2)), a = rnd(i, 3) * TAU + t * (swirl ? 0.5 : 0.2), r = spread * (swirl ? 0.4 + 0.6 * rnd(i, 4) : 0.3 + p * 1.6)
      const q = swirl ? rnd(i, 5) : p
      s.position.set(dir[0] * len * q + Math.cos(a) * r * (1 - Math.abs(dir[0])), dir[1] * len * q + Math.sin(a * 1.3) * r * (1 - Math.abs(dir[1])), dir[2] * len * q + Math.sin(a) * r)
      s.scale.setScalar(size * (swirl ? 0.8 + 0.4 * Math.sin(t * 0.7 + i) : 0.35 + p * 1.1))
      const fade = swirl ? 0.6 + 0.4 * Math.sin(t * 0.9 + i * 1.7) : Math.min(1, Math.max(0, (p - skip) * 6)) * (1 - p) ** 1.3
      ;((s as THREE.Sprite).material as THREE.SpriteMaterial).opacity = Math.min(1, dense * cur.current * fade)
    })
  })
  return <group ref={g} position={at}>{Array.from({ length: n }, (_, i) => <sprite key={i} renderOrder={order}><spriteMaterial map={map} color={color} transparent opacity={0} depthWrite={false} /></sprite>)}</group>
}

/**
 * 烧杯里的气泡。kind：'before' 沸腾前（从杯底上升，越升越小，没到水面就不见了）；'boil' 沸腾（越升越大，到水面破裂）。
 * r：水柱的半径；h：水深；vigor：多不多（0–1）。原点在杯底内侧的正中
 */
export function Bubbles({ r, h, kind, vigor, n = 46, size = 1 }: { r: number; h: number; kind: 'none' | 'before' | 'boil'; vigor: number; n?: number; size?: number }) {
  const m = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), [])
  const live = useRef({ kind, vigor }); live.current = { kind, vigor }
  const mix = useRef(0), amt = useRef(0)                      // mix：0 是沸腾前的样子，1 是沸腾的样子，慢慢过渡
  useFrame(({ clock }, d) => {
    const dt = Math.min(d, 1 / 30), L = live.current, t = clock.elapsedTime
    mix.current += ((L.kind === 'boil' ? 1 : 0) - mix.current) * (1 - Math.exp(-dt / 0.8))
    amt.current += ((L.kind === 'none' ? 0 : 0.25 + 0.75 * L.vigor) - amt.current) * (1 - Math.exp(-dt / 0.7))
    const im = m.current; if (!im) return
    for (let i = 0; i < n; i++) {
      const p = frac(t * (0.45 + rnd(i, 1) * 0.5) * (0.6 + 0.6 * mix.current) + rnd(i, 2)), a = rnd(i, 3) * TAU, rr = Math.sqrt(rnd(i, 4)) * r * 0.82
      const shown = rnd(i, 5) < amt.current ? 1 : 0, base = size * r * (0.035 + rnd(i, 6) * 0.05)
      // 沸腾前：升到一半多就缩没了；沸腾：一路长大，快到水面时最大
      const before = base * 1.1 * Math.max(0, 1 - p / (0.45 + 0.4 * rnd(i, 7))), boil = base * (0.7 + 2.6 * p) * Math.min(1, (1 - p) * 14)
      const s = shown * (before + (boil - before) * mix.current)
      o.position.set(Math.cos(a) * rr + Math.sin(t * 5 + i) * r * 0.03, 0.012 + p * (h - 0.02), Math.sin(a) * rr + Math.cos(t * 4 + i * 2) * r * 0.03)
      o.scale.setScalar(Math.max(1e-4, s)); o.updateMatrix(); im.setMatrixAt(i, o.matrix)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={m} args={[undefined, undefined, n]} renderOrder={2} frustumCulled={false}><sphereGeometry args={[1, 14, 10]} /><meshPhysicalMaterial color="#eaf6ff" transparent opacity={0.55} roughness={0.05} clearcoat={1} envMapIntensity={2.5} depthWrite={false} /></instancedMesh>
}

/** 一粒粒离开液面、往上飘走的小颗粒（蒸发、升华）：rate 越大，同时在飘的越多（0–1）。原点在液面正中，r 是液面的半径 */
export function Motes({ at, r, rate, h = 0.5, color = '#9fd4ff', size = 0.014, n = 18, wind = 0 }: { at: V3; r: number; rate: number; h?: number; color?: string; size?: number; n?: number; wind?: number }) {
  const m = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), []), k = useRef(rate); k.current = rate
  const cur = useRef(0)
  useFrame(({ clock }, d) => {
    cur.current += (k.current - cur.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.4))
    const im = m.current, t = clock.elapsedTime; if (!im) return
    for (let i = 0; i < n; i++) {
      const p = frac(t * (0.25 + rnd(i, 1) * 0.2) + rnd(i, 2)), a = rnd(i, 3) * TAU, rr = Math.sqrt(rnd(i, 4)) * r
      o.position.set(Math.cos(a) * rr + Math.sin(t * 2 + i) * 0.02 + wind * p * p * h * 2, p * h, Math.sin(a) * rr + Math.cos(t * 1.6 + i) * 0.02)
      o.scale.setScalar(rnd(i, 5) < cur.current ? size * Math.min(1, p * 8) * (1 - p) ** 0.6 + 1e-5 : 1e-5); o.updateMatrix(); im.setMatrixAt(i, o.matrix)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={m} args={[undefined, undefined, n]} position={at} renderOrder={5} frustumCulled={false}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} /></instancedMesh>
}

// ---------- 放大镜里的粒子 ----------
/** 一圈蜂窝状排好的点（晶体里粒子的位置），在半径 R 的圆里 */
function lattice(R: number, s: number, pool: boolean) {
  const out: [number, number][] = []
  for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) {
    const x = (i + (j & 1) * 0.5) * s, y = j * s * 0.866
    if (pool ? y < -0.08 * R && Math.hypot(x, y) < R * 0.9 : Math.hypot(x, y) < R * 0.66) out.push([x, y])
  }
  return out
}
/**
 * 放大了看：一只圆框里的几十个粒子，总是正对着镜头。
 * liquid：有多少已经挣脱了固定的位置、可以到处游走（0–1）；gas：有多少已经飞散开（0–1）；
 * loose：固体时本来就排得不整齐（非晶体）；pool：粒子聚在下半边，上面留空（液面上方）；from：从哪里引一条线过来
 */
export function Micro({ at, R = 0.5, liquid, gas, loose = false, pool = false, tone = '#ffd27a', from }: { at: V3; R?: number; liquid: number; gas: number; loose?: boolean; pool?: boolean; tone?: string; from?: V3 }) {
  const grp = useRef<THREE.Group>(null), m = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), [])
  const live = useRef({ liquid, gas }); live.current = { liquid, gas }
  const P = useMemo(() => {
    const pts = lattice(R, R * 0.158, pool), far = Math.max(...pts.map(([x, y]) => pool ? y : Math.hypot(x, y)))
    const lo = Math.min(...pts.map(([, y]) => y))
    // 排名：靠外面（或者靠上面）的先变
    return pts.map(([x, y], i) => ({ x: x + (loose ? (rnd(i, 1) - 0.5) * R * 0.09 : 0), y: y + (loose ? (rnd(i, 2) - 0.5) * R * 0.09 : 0), rank: Math.min(0.999, Math.max(0, pool ? 1 - (y - lo) / (far - lo + 1e-6) : 1 - Math.hypot(x, y) / far) * 0.85 + rnd(i, 3) * 0.15) }))
  }, [R, loose, pool])
  const leader = useMemo(() => {
    if (!from) return null
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...at), d = b.clone().sub(a)
    return { pos: a.clone().add(b).multiplyScalar(0.5), len: d.length(), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()) }
  }, [from?.[0], from?.[1], from?.[2], at[0], at[1], at[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  const cs = useMemo(() => ({ a: new THREE.Color(tone).multiplyScalar(0.8), b: new THREE.Color(tone).lerp(new THREE.Color('#ffffff'), 0.25).multiplyScalar(0.8), c: new THREE.Color('#a9c8e6'), v: new THREE.Color() }), [tone])
  useFrame(({ clock, camera }) => {
    grp.current?.quaternion.copy(camera.quaternion)
    const im = m.current, t = clock.elapsedTime, L = live.current; if (!im) return
    P.forEach((p, i) => {
      const wl = Math.min(1, Math.max(0, (L.liquid * 1.18 - p.rank) / 0.18)), wg = Math.min(1, Math.max(0, (L.gas * 1.18 - p.rank) / 0.18))
      const f1 = rnd(i, 4) * TAU, f2 = rnd(i, 5) * TAU, vib = R * 0.012 * (1 + 0.6 * L.liquid)
      let x = p.x + Math.sin(t * 17 + f1) * vib, y = p.y + Math.cos(t * 19 + f2) * vib
      // 液体：还挨在一起，但各自到处游走
      const lx = p.x * 0.97 + R * 0.13 * (Math.sin(t * 1.1 + f1) + 0.5 * Math.sin(t * 2.3 + f2)), ly = p.y * 0.97 + R * 0.11 * (Math.cos(t * 0.9 + f2) + 0.5 * Math.sin(t * 2.0 + f1)) - (pool ? 0 : R * 0.1)
      x += (lx - x) * wl; y += (ly - y) * wl
      // 气体：离得很远，飞得很快，满处跑
      let gx = R * 0.86 * Math.sin(t * (0.9 + rnd(i, 6) * 1.4) + f1), gy = R * 0.86 * Math.sin(t * (0.8 + rnd(i, 7) * 1.5) + f2)
      const gl = Math.hypot(gx, gy); if (gl > R * 0.84) { gx *= R * 0.84 / gl; gy *= R * 0.84 / gl }
      x += (gx - x) * wg; y += (gy - y) * wg
      o.position.set(x, y, R * 0.06); o.scale.set(R * 0.062, R * 0.062, R * 0.02); o.updateMatrix(); im.setMatrixAt(i, o.matrix)
      im.setColorAt(i, cs.v.copy(cs.a).lerp(cs.b, wl).lerp(cs.c, wg))
    })
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true
  })
  return <>
    {leader && <mesh position={leader.pos} quaternion={leader.quat}><cylinderGeometry args={[0.006, 0.006, leader.len, 6]} /><meshBasicMaterial color="#ffe9a8" transparent opacity={0.7} toneMapped={false} /></mesh>}
    {from && <mesh position={from}><sphereGeometry args={[0.022, 12, 8]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh>}
    <group ref={grp} position={at}>
      <mesh><circleGeometry args={[R, 56]} /><meshBasicMaterial color="#0d1820" /></mesh>
      <mesh><torusGeometry args={[R * 1.03, R * 0.045, 12, 64]} /><Metal kind="brass" grain="turned" /></mesh>
      {pool && <mesh position={[0, -R * 0.52, R * 0.02]}><planeGeometry args={[R * 1.7, R * 0.9]} /><meshBasicMaterial color="#1c4662" transparent opacity={0.5} /></mesh>}
      <instancedMesh ref={m} args={[undefined, undefined, P.length]} frustumCulled={false}><sphereGeometry args={[1, 14, 10]} /><meshBasicMaterial /></instancedMesh>
    </group>
  </>
}

/**
 * 一圈一圈长出来的霜：贴在一只竖着的圆筒外面（半径 r，高 h，底在 y = 0）。grow 从 0 到 1，小冰晶一粒粒冒出来、长大
 */
export function Frost({ r, h, grow, n = 520 }: { r: number; h: number; grow: number; n?: number }) {
  const m = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), []), k = useRef(grow); k.current = grow
  const seen = useRef(-1)
  useFrame(() => {
    const im = m.current; if (!im || Math.abs(seen.current - k.current) < 1e-4) return
    seen.current = k.current
    for (let i = 0; i < n; i++) {
      const a = rnd(i, 1) * TAU, y = (0.04 + 0.92 * rnd(i, 2)) * h, s = Math.min(1, Math.max(0, (k.current * 1.3 - rnd(i, 3)) / 0.3))
      o.position.set(Math.cos(a) * r, y, Math.sin(a) * r); o.rotation.set(rnd(i, 4) * 3, -a, rnd(i, 5) * 3)
      o.scale.set(1, 0.35, 1).multiplyScalar(Math.max(1e-5, s * r * (0.035 + rnd(i, 6) * 0.05))); o.updateMatrix(); im.setMatrixAt(i, o.matrix)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return <group>
    <mesh position-y={h / 2} renderOrder={4}><cylinderGeometry args={[r * 1.004, r * 1.004, h * 0.96, 40, 1, true]} /><meshStandardMaterial color="#f1f6fa" transparent opacity={0.75 * Math.min(1, grow * 1.4)} roughness={1} depthWrite={false} /></mesh>
    <instancedMesh ref={m} args={[undefined, undefined, n]} frustumCulled={false}><octahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#f6fafc" roughness={0.5} emissive="#aebccc" emissiveIntensity={0.5} flatShading /></instancedMesh>
  </group>
}
