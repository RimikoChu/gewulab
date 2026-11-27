// 看得见的轨迹和现象：水炮的水柱、火焰和烟、发光的轨迹线、频闪残影、速度箭头（合速度和水平、竖直两个分量）。
// 全实验室的颜色约定写在 C 里：合速度黄色，水平分量青色，竖直分量橙红色，轨迹白色，合力粉色。
// 水柱的写法参考二次函数实验室的喷泉：一根半透明的水芯 + 几百颗拉长的水滴，每颗水滴按斜抛的位置公式（physics.ts 的 fly）走。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { ForceArrow } from '@/lab-kit'
import { fly } from './physics'
import { rng, softDot } from './mats'

export type V3 = [number, number, number]
export const C = { v: '#ffd25a', vx: '#5ad1ff', vy: '#ff7a59', path: '#ffffff', force: '#ff6fb1', ghost: '#ffe2a0' } as const

// ---------- 轨迹线、残影、箭头 ----------
/** 一条发亮的轨迹线：pts 是线上的点；r 是线的粗细（m）。不受遮挡 */
export function Trail({ pts, r = 0.05, color = C.path, opacity = 0.9 }: { pts: V3[]; r?: number; color?: string; opacity?: number }) {
  const g = useMemo(() => pts.length < 2 ? null : new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'), Math.max(8, pts.length * 3), r, 8), [pts, r])
  if (!g) return null
  return <mesh geometry={g} renderOrder={8}><meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} depthTest={false} /></mesh>
}
/** 一条虚线（参考线、分量的投影线）。w 是线宽（像素） */
export function Dashed({ a, b, color = '#ffffff', w = 2, dash = 0.3, opacity = 0.7 }: { a: V3; b: V3; color?: string; w?: number; dash?: number; opacity?: number }) {
  return <Line points={[a, b]} color={color} lineWidth={w} dashed dashSize={dash} gapSize={dash * 0.7} transparent opacity={opacity} depthTest={false} renderOrder={7} />
}
/** 频闪留下的一个残影：半透明的小球 */
export function Ghost({ at, r, color = C.ghost, opacity = 0.5 }: { at: V3; r: number; color?: string; opacity?: number }) {
  return <mesh position={at} renderOrder={6}><sphereGeometry args={[r, 20, 14]} /><meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} depthWrite={false} /></mesh>
}
/**
 * 速度箭头：从 at 出发画合速度（黄）和它的水平（青）、竖直（橙红）两个分量，再用两条虚线补成矩形。
 * vx、vy 的单位是 m/s，k 是每 1 m/s 画多长（m）；thick 是箭头的粗细倍数；parts：要不要画分量。画在局部的 xy 平面里
 */
export function Vel({ at, vx, vy, k, thick = 1, parts = true, total = true }: { at: V3; vx: number; vy: number; k: number; thick?: number; parts?: boolean; total?: boolean }) {
  const [x, y, z] = at, ex = x + vx * k, ey = y + vy * k, v = Math.hypot(vx, vy)
  return <group>
    {parts && Math.abs(vx) > 1e-6 && <ForceArrow tip={[ex, y, z]} dir={[Math.sign(vx), 0, 0]} len={Math.abs(vx) * k} color={C.vx} thick={thick} />}
    {parts && Math.abs(vy) > 1e-6 && <ForceArrow tip={[x, ey, z]} dir={[0, Math.sign(vy), 0]} len={Math.abs(vy) * k} color={C.vy} thick={thick} />}
    {parts && Math.abs(vx) > 1e-6 && Math.abs(vy) > 1e-6 && <><Dashed a={[ex, y, z]} b={[ex, ey, z]} color={C.vy} dash={0.12 * thick} /><Dashed a={[x, ey, z]} b={[ex, ey, z]} color={C.vx} dash={0.12 * thick} /></>}
    {total && v > 1e-6 && <ForceArrow tip={[ex, ey, z]} dir={[vx / v, vy / v, 0]} len={v * k} color={C.v} thick={thick * 1.15} />}
  </group>
}

// ---------- 水柱 ----------
const drop = new THREE.SphereGeometry(1, 8, 6)
const tmp = new THREE.Object3D()
function DropMat({ opacity = 0.75 }: { opacity?: number }) {
  return <meshPhysicalMaterial color="#eaf7ff" emissive="#9fc8dc" emissiveIntensity={0.3} transparent opacity={opacity} roughness={0.04} clearcoat={1} envMapIntensity={2.2} depthWrite={false} />
}
/**
 * 水炮喷出的水柱：从原点以 v0、仰角 angle 喷出，T 秒后落地（T 由 physics.ts 算好交进来）。画在局部的 xy 平面里。
 * on：开着没有。刚打开时水头沿着抛物线往前走，T 秒后才落到地；关掉以后已经喷出去的水接着飞完。
 * thick：水柱的粗细倍数
 */
export function Jet({ v0, angle, T, on, thick = 1, n = 420, seed = 1 }: { v0: number; angle: number; T: number; on: boolean; thick?: number; n?: number; seed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), core = useRef<THREE.Mesh>(null), mist = useRef<THREE.Points>(null), fx = useRef<THREE.InstancedMesh>(null)
  const seeds = useMemo(() => { const r = rng(seed * 97 + 3); return Array.from({ length: n }, () => [r(), r() - 0.5, r() - 0.5, 0.6 + r() * 0.8, r()]) }, [n, seed])
  const sp = useMemo(() => { const r = rng(seed * 31 + 7); return Array.from({ length: 150 }, () => [r(), (r() - 0.5) * 2.6, 1.2 + r() * 2.6, (r() - 0.5) * 2.6]) }, [seed])
  const mistGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(50 * 3), 3)); return g }, [])
  const mr = useMemo(() => { const r = rng(seed * 13 + 1); return Array.from({ length: 50 }, () => [r(), r() - 0.5, r(), r() - 0.5]) }, [seed])
  const st = useRef({ time: 0, since: 0, off: 0, key: '' }), coreGeo = useRef<THREE.BufferGeometry | null>(null), coat = useRef<THREE.Mesh>(null), coatGeo = useRef<THREE.BufferGeometry | null>(null)
  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 1 / 30), s = st.current, key = `${v0}|${angle}`
    if (key !== s.key) { s.key = key; s.since = 0; s.off = 0 }   // 换了条件：从头喷
    s.time += dt
    if (on) { if (s.off > 0) { if (s.off >= T) s.since = 0; s.off = 0 } s.since += dt }
    else if (s.since > 0) { s.off += dt; if (s.off >= T) s.since = 0 }
    const m = ref.current; if (!m) return
    // 这一刻水柱上有水的时间段：head 是水头的“年龄”，tail 是关水后最后一滴的年龄
    const head = Math.min(T, s.since), tail = on ? 0 : Math.min(T, s.off), live = s.since > 0 && tail < head
    m.visible = live; if (core.current) core.current.visible = live; if (coat.current) coat.current.visible = live
    const landed = live && head >= T
    if (mist.current) mist.current.visible = landed; if (fx.current) fx.current.visible = landed
    if (!live) return
    seeds.forEach(([u0, dy, dz, sz, j], i) => {
      const tau = ((u0 + s.time / T) % 1) * T
      if (tau > head || tau < tail) { tmp.scale.set(0, 0, 0); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix); return }
      const p = fly(v0, angle, tau), spread = (0.03 + 0.1 * tau / T) * thick * (1 + tau)
      tmp.position.set(p.x + dy * spread * 0.4, p.y + dy * spread, dz * spread * 1.6)
      tmp.rotation.set(0, 0, Math.atan2(p.vy, p.vx))
      const k = 0.034 * sz * thick; tmp.scale.set(k * (3 + j * 3), k, k)
      tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    if (core.current) {
      const N = 40, pts: THREE.Vector3[] = []
      for (let i = 0; i <= N; i++) { const p = fly(v0, angle, tail + (head - tail) * i / N); pts.push(new THREE.Vector3(p.x, p.y, 0)) }
      coreGeo.current?.dispose()
      const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, 56, 0.05 * thick, 8, false)
      coreGeo.current = g; core.current.geometry = g
      if (coat.current) { coatGeo.current?.dispose(); const c = new THREE.TubeGeometry(curve, 56, 0.1 * thick, 10, false); coatGeo.current = c; coat.current.geometry = c; coat.current.visible = true }
    }
    const end = fly(v0, angle, T)
    if (mist.current && landed) {
      const p = mistGeo.attributes.position as THREE.BufferAttribute
      mr.forEach(([u, dx, w, dz], i) => { const life = (u + s.time * 0.5) % 1; p.setXYZ(i, end.x + dx * (0.8 + life) * thick, end.y + 0.05 + life * (0.5 + w) * thick, dz * (0.9 + life) * thick) })
      p.needsUpdate = true
    }
    if (fx.current && landed) {
      sp.forEach(([u0, vx, vy, vz], i) => {
        const life = 0.7, t = ((u0 + s.time / life) % 1) * life, y = vy * t * Math.sqrt(thick) - 4.9 * t * t
        tmp.position.set(end.x + vx * t * 0.7 * thick, end.y + Math.max(0, y), vz * t * 0.7 * thick); tmp.rotation.set(0, 0, 0)
        const k = 0.03 * thick * (y > 0 ? 1 : 0); tmp.scale.set(k, k * 1.6, k); tmp.updateMatrix(); fx.current!.setMatrixAt(i, tmp.matrix)
      })
      fx.current.instanceMatrix.needsUpdate = true
    }
  })
  return (
    <group>
      <instancedMesh ref={ref} args={[drop, undefined, n]} frustumCulled={false} renderOrder={4}><DropMat /></instancedMesh>
      <mesh ref={core} renderOrder={3} frustumCulled={false}><meshPhysicalMaterial color="#f2fbff" emissive="#b6dcec" emissiveIntensity={0.4} transparent opacity={0.5} roughness={0.03} clearcoat={1} envMapIntensity={2} depthWrite={false} /></mesh>
      <mesh ref={coat} renderOrder={3} frustumCulled={false}><meshBasicMaterial color="#eaf6fc" transparent opacity={0.2} depthWrite={false} toneMapped={false} /></mesh>
      <points ref={mist} geometry={mistGeo} frustumCulled={false} renderOrder={5}><pointsMaterial map={softDot()} size={1.3 * thick} color="#f4fbff" transparent opacity={0.3} depthWrite={false} sizeAttenuation /></points>
      <instancedMesh ref={fx} args={[drop, undefined, 150]} frustumCulled={false} renderOrder={4}><DropMat opacity={0.85} /></instancedMesh>
    </group>
  )
}

// ---------- 火和烟 ----------
const FIRE_VERT = /* glsl */`
attribute float aSize; attribute vec4 aColor; uniform float uScale; varying vec4 vColor;
void main() { vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`
const FIRE_FRAG = /* glsl */`
varying vec4 vColor;
void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.08, d) * vColor.a; if (a < 0.004) discard; gl_FragColor = vec4(vColor.rgb * a, a * 0.7); }`
/**
 * 一团火，用几层粒子叠出来：贴着底的一层亮黄的火心、中间一层橙色的火身、最外面蹿得高的暗红火舌，再加一些往上飘的火星。
 * 底在 at，底面半宽 spread，火高约 h，w 是火团的粗细；level 0 熄灭、1 正常（慢慢过渡）
 */
export function Blaze({ at, w, h, spread, level = 1, n = 5, seed = 0 }: { at: V3; w: number; h: number; spread: number; level?: number; n?: number; seed?: number }) {
  const N = 60 + n * 34, ref = useRef<THREE.Points>(null)
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(N), 1)); g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(N * 4), 4)); return g }, [N])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    uniforms: { uScale: { value: 600 } },
  }), [])
  // 每颗粒子：出生的相位、在底面上的位置（越靠中心越密）、属于哪一层、快慢、左右摆的相位
  const sd = useMemo(() => { const r = rng(seed * 53 + N); return Array.from({ length: N }, (_, i) => { const a = r() * 6.283, q = Math.pow(r(), 0.7); return { u: r(), x: Math.cos(a) * q, z: Math.sin(a) * q * 0.6, layer: i < N * 0.3 ? 0 : i < N * 0.78 ? 1 : i < N * 0.93 ? 2 : 3, sp: 0.7 + r() * 0.6, ph: r() * 6.283, k: r() } }) }, [N, seed])
  const cur = useRef(level)
  useFrame(({ clock, size, gl }, dt) => {
    cur.current += (level - cur.current) * Math.min(1, dt * 1.6)
    const L = cur.current, pts = ref.current; if (!pts) return
    pts.visible = L > 0.02; if (!pts.visible) return
    mat.uniforms.uScale.value = size.height * gl.getPixelRatio() / (2 * Math.tan(17 * Math.PI / 180))
    const P = geo.attributes.position as THREE.BufferAttribute, S = geo.attributes.aSize as THREE.BufferAttribute, C = geo.attributes.aColor as THREE.BufferAttribute, T = clock.elapsedTime
    sd.forEach((s, i) => {
      const rate = [1.5, 1.1, 0.8, 0.45][s.layer] * s.sp, p = (s.u + T * rate) % 1
      const edge = Math.hypot(s.x, s.z / 0.6), reach = [0.42, 0.75, 1.1, 1.9][s.layer] * (1 - 0.45 * edge) * (0.75 + 0.5 * s.k)
      const y = Math.pow(p, 0.85) * h * reach * (0.3 + 0.7 * L)
      const pinch = 1 - 0.75 * p, sway = Math.sin(T * (2.2 + s.k * 2) + s.ph) * w * 0.16 * p
      P.setXYZ(i, s.x * spread * pinch + sway, y, s.z * spread * pinch)
      if (s.layer === 3) {          // 火星：小、亮、飘得高
        S.setX(i, w * 0.05 * (1 - p)); C.setXYZW(i, 2.2, 1.1, 0.3, (1 - p) * L)
      } else {
        S.setX(i, w * [0.5, 0.62, 0.5][s.layer] * (0.45 + 0.55 * Math.sin(Math.min(1, p * 1.25) * Math.PI) ** 0.6) * (0.5 + 0.5 * L))
        // 颜色随年龄：亮黄白 → 橙 → 暗红
        const q = Math.min(1, p * [1.1, 1.4, 1.8][s.layer] + [0, 0.15, 0.35][s.layer])
        const r0 = q < 0.4 ? 2.3 : 2.3 - (q - 0.4) * 2.2, g0 = q < 0.4 ? 1.75 - q * 2.2 : Math.max(0.1, 0.87 - (q - 0.4) * 1.25), b0 = Math.max(0.02, 0.75 - q * 2.4)
        C.setXYZW(i, r0, g0, b0, Math.min(1, (1 - p) * 1.5) * Math.min(1, p * 8) * [0.55, 0.42, 0.34][s.layer] * Math.min(1, L * 1.3))
      }
    })
    P.needsUpdate = S.needsUpdate = C.needsUpdate = true
  })
  return <points ref={ref} geometry={geo} material={mat} position={at} frustumCulled={false} renderOrder={20} />
}
/** 一股往上飘的烟（或者浇灭以后的白汽）：软边的圆点往上升、散开、变淡。size 是烟团的大小，rise 是升多高 */
export function Smoke({ at, size, rise, color = '#3a3a3a', level = 1, n = 36, opacity = 0.34 }: { at: V3; size: number; rise: number; color?: string; level?: number; n?: number; opacity?: number }) {
  const ref = useRef<THREE.Points>(null), mat = useRef<THREE.PointsMaterial>(null)
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); return g }, [n])
  const sd = useMemo(() => { const r = rng(n * 7 + 1); return Array.from({ length: n }, () => [r(), r() - 0.5, r() - 0.5, r()]) }, [n])
  const cur = useRef(level)
  useFrame(({ clock }, dt) => {
    cur.current += (level - cur.current) * Math.min(1, dt * 1.2)
    const p = geo.attributes.position as THREE.BufferAttribute, T = clock.elapsedTime
    sd.forEach(([u, dx, dz, w], i) => { const life = (u + T * (0.1 + w * 0.06)) % 1; p.setXYZ(i, dx * size * (0.5 + life * 2.4) + life * life * rise * 0.35, life * rise, dz * size * (0.5 + life * 2)) })
    p.needsUpdate = true
    if (mat.current) mat.current.opacity = opacity * cur.current; if (ref.current) ref.current.visible = cur.current > 0.02
  })
  return <points ref={ref} geometry={geo} position={at} frustumCulled={false} renderOrder={18}><pointsMaterial ref={mat} map={softDot()} size={size * 2.6} color={color} transparent opacity={opacity} depthWrite={false} sizeAttenuation /></points>
}
