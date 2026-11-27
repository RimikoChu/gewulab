// 水：抛物线形的水柱、竖直的高喷、落点的水花和涟漪、池水和江水的水面。
// 水柱 = 一根半透明的水芯 + 几百颗拉长的水滴（每颗按斜抛的速度沿抛物线走）+ 落点溅起的水花和一圈圈涟漪 + 一层水雾。
// 水滴的水平速度由 a 算出（physics.ts 的 jetSpeed），所以 a 越大（越窄）的水柱，水走得越慢、越陡。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRipple } from '@/lab-kit'
import { jetSpeed, landX } from './physics'
import { canvas, rng } from './mats'

/** 柔边的圆点贴图：水雾、水花用 */
let soft: THREE.Texture | null = null
function softDot() {
  if (soft) return soft
  const { c, g } = canvas(64), q = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.4, 'rgba(255,255,255,0.55)'); q.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = q; g.fillRect(0, 0, 64, 64)
  return (soft = new THREE.CanvasTexture(c))
}

const drop = new THREE.SphereGeometry(1, 8, 6)
const tmp = new THREE.Object3D()

/** 水滴的材质：亮、透、反光 */
function DropMat({ opacity = 0.7 }: { opacity?: number }) {
  return <meshPhysicalMaterial color="#eaf7ff" emissive="#9fc8dc" emissiveIntensity={0.25} transparent opacity={opacity} roughness={0.04} clearcoat={1} envMapIntensity={2.2} depthWrite={false} />
}

/**
 * 一道抛物线形的水柱：y = a(x − h)² + k（局部坐标，单位 m），从水面 floor 左边的落点喷出、在右边落回。
 * 水柱在局部的 xy 平面里；rotY 让它绕 y 轴转（一圈喷头）。on 为假时水柱慢慢停下。
 */
export function Jet({ a, h, k, floor, n = 260, thick = 1, on = 1, seed = 1, splash = true }: { a: number; h: number; k: number; floor: number; n?: number; thick?: number; on?: number; seed?: number; splash?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null), core = useRef<THREE.Mesh>(null), mist = useRef<THREE.Points>(null), fx = useRef<THREE.InstancedMesh>(null), rings = useRef<THREE.Group>(null)
  const seeds = useMemo(() => { const r = rng(seed * 97 + 3); return Array.from({ length: n }, () => [r(), r() - 0.5, r() - 0.5, 0.6 + r() * 0.8, r()]) }, [n, seed])
  const sp = useMemo(() => { const r = rng(seed * 31 + 7); return Array.from({ length: 90 }, () => [r(), (r() - 0.5) * 2.2, 0.9 + r() * 1.6, (r() - 0.5) * 2.2, r() < 0.5 ? 0 : 1]) }, [seed])
  const mistGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3)); return g }, [])
  const mr = useMemo(() => { const r = rng(seed * 13 + 1); return Array.from({ length: 60 }, () => [r(), r() - 0.5, r(), r() - 0.5]) }, [seed])
  const coreGeo = useRef<THREE.BufferGeometry | null>(null)
  const time = useRef(0)
  useFrame((_, dt) => {
    time.current += Math.min(dt, 1 / 30)
    const L = landX(a, h, k, floor), m = ref.current
    if (!m) return
    if (!L || on < 0.02) { m.visible = false; if (core.current) core.current.visible = false; if (mist.current) mist.current.visible = false; if (fx.current) fx.current.visible = false; if (rings.current) rings.current.visible = false; return }
    m.visible = true
    const [x0, x1] = L, len = x1 - x0, v = jetSpeed(a), T = time.current
    // 水滴
    seeds.forEach(([u0, dy, dz, sz, j], i) => {
      const u = (u0 + T * v / len) % 1, x = x0 + u * len, y = a * (x - h) ** 2 + k
      const spread = (0.025 + 0.06 * Math.sin(u * Math.PI) + 0.05 * u) * thick
      const ang = Math.atan(2 * a * (x - h))
      tmp.position.set(x + dy * spread, y + dy * spread * 0.6, dz * spread * 2)
      tmp.rotation.set(0, 0, ang)
      const s = 0.022 * sz * thick * on
      tmp.scale.set(s * (2.6 + j * 2), s, s)
      tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    // 水芯：沿抛物线的一根细管，两头收细
    if (core.current) {
      const N = 48, pts: THREE.Vector3[] = []
      for (let i = 0; i <= N; i++) { const x = x0 + len * i / N; pts.push(new THREE.Vector3(x, a * (x - h) ** 2 + k, 0)) }
      coreGeo.current?.dispose()
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.028 * thick * on, 8, false)
      coreGeo.current = g; core.current.geometry = g; core.current.visible = true
    }
    // 水雾：落点附近一团，最高点附近淡淡一层
    if (mist.current) {
      const p = mistGeo.attributes.position as THREE.BufferAttribute
      mr.forEach(([u, dx, w, dz], i) => {
        const side = i % 3 === 0 ? x0 : x1, life = (u + T * 0.35) % 1
        if (i % 5 === 4) { const x = x0 + len * (0.35 + w * 0.3); p.setXYZ(i, x + dx * 0.3, a * (x - h) ** 2 + k + 0.05, dz * 0.3) }
        else p.setXYZ(i, side + dx * 0.7 * thick, floor + 0.05 + life * 0.55 * thick, dz * 0.8 * thick)
      })
      p.needsUpdate = true; mist.current.visible = true
    }
    // 水花：落点溅起的小水珠，各自做一段小抛物线
    if (fx.current) {
      fx.current.visible = splash
      sp.forEach(([u0, vx, vy, vz, side], i) => {
        const life = 0.42, t = ((u0 + T / life) % 1) * life, X = side ? x1 : x0
        const y = floor + vy * t * thick - 4.9 * t * t
        tmp.position.set(X + vx * t * 0.6 * thick, Math.max(floor, y), vz * t * 0.6 * thick); tmp.rotation.set(0, 0, 0)
        const s = 0.018 * thick * on * (y > floor ? 1 : 0); tmp.scale.set(s, s, s); tmp.updateMatrix(); fx.current!.setMatrixAt(i, tmp.matrix)
      })
      fx.current.instanceMatrix.needsUpdate = true
    }
    // 涟漪：落点一圈圈往外扩、变淡
    if (rings.current) {
      rings.current.visible = splash
      rings.current.children.forEach((r, i) => {
        const side = i % 2, life = ((T * 0.7 + i * 0.37) % 1), X = side ? x1 : x0
        r.position.set(X, floor + 0.012, 0); r.scale.setScalar((0.08 + life * 0.7) * thick)
        ;((r as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - life) * on
      })
    }
  })
  return (
    <group>
      <instancedMesh ref={ref} args={[drop, undefined, n]} frustumCulled={false} renderOrder={4}><DropMat /></instancedMesh>
      <mesh ref={core} renderOrder={3}><meshPhysicalMaterial color="#f2fbff" emissive="#b6dcec" emissiveIntensity={0.3} transparent opacity={0.4} roughness={0.03} clearcoat={1} envMapIntensity={2} depthWrite={false} /></mesh>
      <points ref={mist} geometry={mistGeo} frustumCulled={false} renderOrder={5}><pointsMaterial map={softDot()} size={0.55 * thick} color="#f4fbff" transparent opacity={0.32} depthWrite={false} sizeAttenuation /></points>
      <instancedMesh ref={fx} args={[drop, undefined, 90]} frustumCulled={false} renderOrder={4}><DropMat opacity={0.8} /></instancedMesh>
      <group ref={rings}>{Array.from({ length: 6 }, (_, i) => <mesh key={i} rotation-x={-Math.PI / 2} renderOrder={3}><ringGeometry args={[0.8, 1, 40]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} /></mesh>)}</group>
    </group>
  )
}

/** 竖直往上喷的高喷：水滴按 h = v·t − 5t² 升到最高、往四周散开落下。top 是最高高度（m），用来画水芯 */
export function HighJet({ height, period, n = 2400, on = 1 }: { height: (t: number) => number; period: number; n?: number; on?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), mist = useRef<THREE.Points>(null)
  const seeds = useMemo(() => { const r = rng(77); return Array.from({ length: n }, () => [r(), r() * Math.PI * 2, 0.4 + r() * 0.9, r()]) }, [n])
  const mistGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(260 * 3), 3)); return g }, [])
  const mr = useMemo(() => { const r = rng(5); return Array.from({ length: 260 }, () => [r(), r() * Math.PI * 2, r(), r()]) }, [])
  const time = useRef(0)
  const top = height(period / 2)
  const curtain = useMemo(() => { const pts: THREE.Vector2[] = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new THREE.Vector2(0.4 + 3.4 * Math.pow(u, 0.7), top - 0.3 - (top - 0.1) * u * u)) } return new THREE.LatheGeometry(pts, 40) }, [top])
  useFrame((_, dt) => {
    time.current += Math.min(dt, 1 / 30)
    const m = ref.current; if (!m) return
    const T = time.current
    seeds.forEach(([u0, th, sp, j], i) => {
      const t = ((u0 + T / period) % 1) * period, y = height(t), up = t < period / 2
      // 往上时紧紧一束，过了最高点散开
      const r = (0.18 + (up ? 0.1 * t : 0.2 + 1.1 * (t - period / 2) ** 1.6) * sp) * on
      tmp.position.set(Math.cos(th) * r, y, Math.sin(th) * r)
      tmp.rotation.set(0, 0, Math.PI / 2)
      const s = (0.04 + 0.04 * j) * on; tmp.scale.set(s * (up ? 6 : 2.6), s, s)
      tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    if (mist.current) {
      const p = mistGeo.attributes.position as THREE.BufferAttribute
      mr.forEach(([u, th, w, b], i) => {
        const life = (u + T * 0.18) % 1
        if (i < 90) { const r = 0.4 + w * 2.6 + life * 1.2; p.setXYZ(i, Math.cos(th) * r, top - 1.2 - b * 3 + life * 0.8, Math.sin(th) * r) }
        else if (i < 160) { const r = 0.6 + w * 3.2; p.setXYZ(i, Math.cos(th) * r, 0.2 + life * 1.6, Math.sin(th) * r) }
        else { const r = 0.3 + w * 0.7, y = ((b + life * 0.3) % 1) * (top - 1); p.setXYZ(i, Math.cos(th) * r, y, Math.sin(th) * r) }   // 沿着水柱裹一层水雾
      })
      p.needsUpdate = true
    }
  })
  return (
    <group>
      <instancedMesh ref={ref} args={[drop, undefined, n]} frustumCulled={false} renderOrder={4}><DropMat opacity={0.65} /></instancedMesh>
      {/* 水芯：里面一根亮白的实心柱，外面一层更粗、更淡的水套，从下往上收细，连成一整股 */}
      <mesh position-y={top * 0.47} renderOrder={3}><cylinderGeometry args={[0.1 * on, 0.32 * on, top * 0.95, 20, 1, false]} /><meshStandardMaterial color="#f6fbff" emissive="#d8ecf4" emissiveIntensity={0.55} transparent opacity={0.85 * on} roughness={0.2} depthWrite={false} /></mesh>
      <mesh position-y={top * 0.46} renderOrder={3}><cylinderGeometry args={[0.45 * on, 0.75 * on, top * 0.98, 24, 1, true]} /><meshStandardMaterial color="#eef7fb" emissive="#cfe5ee" emissiveIntensity={0.3} transparent opacity={0.3 * on} roughness={0.4} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      {/* 顶上翻下来的一圈水幕：像伞一样往四周落 */}
      <mesh geometry={curtain} renderOrder={3}><meshStandardMaterial color="#eef7fb" emissive="#cfe5ee" emissiveIntensity={0.25} transparent opacity={0.16 * on} roughness={0.5} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <points ref={mist} geometry={mistGeo} frustumCulled={false} renderOrder={5}><pointsMaterial map={softDot()} size={3.2} color="#f4fbff" transparent opacity={0.28 * on} depthWrite={false} sizeAttenuation /></points>
    </group>
  )
}

/** 一块水面：带波纹的半透明水（池水、江水）。w、d 是宽和深（x、z），color 是水色 */
export function WaterSurface({ w, d, color = '#3d7f86', opacity = 0.86, rep = 1, speed = 0.02, circle = 0 }: { w: number; d: number; color?: string; opacity?: number; rep?: number; speed?: number; circle?: number }) {
  const ripple = useRipple([Math.max(1, w / 6 * rep), Math.max(1, d / 6 * rep)], speed)
  const ns = useMemo(() => new THREE.Vector2(0.5, 0.5), [])
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow renderOrder={1}>
      {circle ? <circleGeometry args={[circle, 64]} /> : <planeGeometry args={[w, d]} />}
      <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.06} metalness={0.05} normalMap={ripple} normalScale={ns} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={1.3} depthWrite={false} />
    </mesh>
  )
}
