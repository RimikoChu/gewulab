// 兴奋的传导和传递 · 各课共用的器材和小东西：膜上的通道蛋白、一颗颗离子、膜两侧的正负号、电表、玻璃微电极、刺激电极、导线、箭头。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { along, clamp, smooth, type V3 } from './kit'
import { blob, glyph } from './membrane'
import { excitedAt } from './wave'

type Num = number | (() => number)
const val = (n: Num) => typeof n === 'function' ? n() : n

// ---------- 通道蛋白 ----------
const LOBE = () => blob([0.19, 0.5, 0.24], 0.1, 2, 22)
let lobeG: THREE.BufferGeometry | null = null
/**
 * 一个通道：两瓣蛋白质夹着中间的孔，开的时候两瓣分开。at 是孔的中心（膜厚的正中）；open 0 关、1 开；
 * turn：膜是竖着的（突触后膜），通道横过来；dim：被堵住时变暗
 */
export function Channel({ at, color, open, turn = false, size = 1 }: { at: V3; color: string; open: Num; turn?: boolean; size?: number }) {
  const g = (lobeG ??= LOBE()), a = useRef<THREE.Mesh>(null), b = useRef<THREE.Mesh>(null)
  const m = useMemo(() => new THREE.MeshPhysicalMaterial({ color, roughness: 0.48, sheen: 0.8, sheenRoughness: 0.4, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.35, clearcoatRoughness: 0.4 }), [color])
  useFrame(() => { const o = clamp(val(open)), d = 0.15 + 0.12 * o; if (a.current) a.current.position.x = -d; if (b.current) b.current.position.x = d; m.emissive.set(color); m.emissiveIntensity = 0.05 + 0.3 * o })
  return <group position={at} rotation={[0, 0, turn ? Math.PI / 2 : 0]} scale={size}>
    <mesh ref={a} geometry={g} material={m} castShadow />
    <mesh ref={b} geometry={g} material={m} rotation={[0, Math.PI, 0]} castShadow />
  </group>
}
/** 钠钾泵：比通道大的一整块蛋白质 */
export function Pump({ at, color }: { at: V3; color: string }) {
  const g = useMemo(() => blob([0.42, 0.6, 0.36], 0.13, 5, 28), [])
  return <mesh geometry={g} position={at} castShadow><meshPhysicalMaterial color={color} roughness={0.5} sheen={0.8} sheenColor="#ffffff" clearcoat={0.3} emissive={color} emissiveIntensity={0.12} /></mesh>
}

// ---------- 离子 ----------
const ionMat = (color: string) => <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} roughness={0.35} />
/** 一小群漂着的离子：在原地轻轻晃。at 是各自的位置；show 是显示其中的前几成（0–1） */
export function IonCloud({ at, color, r = 0.085, show = 1 }: { at: V3[]; color: string; r?: number; show?: Num }) {
  const ref = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const m = ref.current; if (!m) return
    const t = clock.elapsedTime, n = val(show) * at.length
    at.forEach((p, i) => {
      o.position.set(p[0] + 0.07 * Math.sin(t * 0.9 + i * 2.1), p[1] + 0.07 * Math.sin(t * 1.1 + i * 1.3), p[2] + 0.07 * Math.sin(t * 0.7 + i * 3.7))
      o.scale.setScalar(clamp(n - i)); o.updateMatrix(); m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, at.length]} frustumCulled={false}><sphereGeometry args={[r, 14, 10]} />{ionMat(color)}</instancedMesh>
}
/**
 * 一串沿着一条路走的离子（穿过通道）：on 为真时一颗接一颗出发，走到头消失；on 变假后，已经在路上的走完。
 * n 同时在路上的颗数，speed 每秒走完整条路的几分之几
 */
export function IonStream({ path, color, on, n = 3, speed = 0.3, r = 0.085 }: { path: V3[]; color: string; on: () => boolean; n?: number; speed?: number; r?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), [])
  const st = useRef<{ ph: number[]; alive: boolean[] } | null>(null)
  st.current ??= { ph: Array.from({ length: n }, (_, i) => i / n), alive: Array.from({ length: n }, () => false) }
  useFrame((_, dt) => {
    const m = ref.current, s = st.current!; if (!m) return
    const go = on()
    for (let i = 0; i < n; i++) {
      s.ph[i] += Math.min(0.05, dt) * speed
      if (s.ph[i] >= 1) { s.ph[i] -= 1; s.alive[i] = go }
      if (!s.alive[i] && go && s.ph[i] < 0.1) s.alive[i] = true
      const ph = s.ph[i], p = along(path, ph)
      o.position.set(...p); o.scale.setScalar(s.alive[i] ? smooth(0, 0.08, ph) * (1 - smooth(0.9, 1, ph)) : 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}><sphereGeometry args={[r, 14, 10]} />{ionMat(color)}</instancedMesh>
}

// ---------- 膜两侧的电荷 ----------
let GLY: { plus: THREE.Texture; minus: THREE.Texture } | null = null
/** 沿着膜的一排正负号：膜外一排、膜内一排。静息处外正内负，兴奋处反过来（读 wave.ts 里的兴奋区）。xs 各个位置的 x */
export function Charges({ xs, yOut, yIn, z = 0.12, size = 1.5 }: { xs: number[]; yOut: number; yIn: number; z?: number; size?: number }) {
  const t = (GLY ??= { plus: glyph('+', '#ff9d86'), minus: glyph('−', '#8fc6ff') })
  const g = useMemo(() => { const mk = () => new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(xs.length * 6), 3)); return { p: mk(), m: mk() } }, [xs])
  useFrame(() => {
    const P = g.p.attributes.position as THREE.BufferAttribute, M = g.m.attributes.position as THREE.BufferAttribute
    xs.forEach((x, i) => { const e = excitedAt(x) > 0.5; P.setXYZ(i * 2, x, e ? yIn : yOut, z); M.setXYZ(i * 2, x, e ? yOut : yIn, z); P.setXYZ(i * 2 + 1, 0, 1e5, 0); M.setXYZ(i * 2 + 1, 0, 1e5, 0) })
    P.needsUpdate = M.needsUpdate = true
  })
  return <group>
    <points geometry={g.p} frustumCulled={false}><pointsMaterial map={t.plus} size={size} transparent alphaTest={0.2} sizeAttenuation depthWrite={false} toneMapped={false} /></points>
    <points geometry={g.m} frustumCulled={false}><pointsMaterial map={t.minus} size={size} transparent alphaTest={0.2} sizeAttenuation depthWrite={false} toneMapped={false} /></points>
  </group>
}

// ---------- 电表 ----------
function dial(ticks: string[], unit: string) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 300
  const g = c.getContext('2d')!; g.fillStyle = '#f3f0e6'; g.fillRect(0, 0, 512, 300)
  const cx = 256, cy = 292, r = 216, A = 52 * Math.PI / 180
  g.strokeStyle = '#1d2226'; g.fillStyle = '#1d2226'; g.lineCap = 'butt'
  g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2 - A, -Math.PI / 2 + A); g.stroke()
  const n = (ticks.length - 1) * 5
  for (let i = 0; i <= n; i++) {
    const a = -A + 2 * A * i / n, big = i % 5 === 0, s = Math.sin(a), co = Math.cos(a)
    g.lineWidth = big ? 5 : 2.5; g.beginPath(); g.moveTo(cx + s * r, cy - co * r); g.lineTo(cx + s * (r - (big ? 26 : 14)), cy - co * (r - (big ? 26 : 14))); g.stroke()
    if (big) { g.font = '600 30px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ticks[i / 5], cx + s * (r - 52), cy - co * (r - 52)) }
  }
  g.font = '600 34px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#5b6068'; g.fillText(unit, cx, 232)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}
/** 电表两个接线柱在电表自己坐标里的位置 */
export const POSTS: [V3, V3] = [[-0.72, -1.02, 0.05], [0.72, -1.02, 0.05]]
/** 一只指针式电表：ticks 刻度上的字（从左到右），unit 单位；value 指针位置（−1 最左，0 正中，1 最右） */
export function Meter({ position, rotation = [0, 0, 0], scale = 1, ticks, unit, value }: { position: V3; rotation?: V3; scale?: number; ticks: string[]; unit: string; value: () => number }) {
  const tex = useMemo(() => dial(ticks, unit), [ticks.join(), unit])   // eslint-disable-line react-hooks/exhaustive-deps
  const needle = useRef<THREE.Group>(null), cur = useRef(0)
  useFrame((_, dt) => { cur.current += (clamp(value(), -1.08, 1.08) - cur.current) * Math.min(1, dt * 9); if (needle.current) needle.current.rotation.z = -cur.current * 52 * Math.PI / 180 })
  return <group position={position} rotation={rotation} scale={scale}>
    <RoundedBox args={[2.5, 1.8, 0.6]} radius={0.09} smoothness={4} castShadow><meshPhysicalMaterial color="#1c2227" roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
    <RoundedBox args={[2.26, 1.34, 0.06]} radius={0.03} position={[0, 0.12, 0.29]}><meshStandardMaterial color="#0c0f12" roughness={0.6} /></RoundedBox>
    <mesh position={[0, 0.12, 0.325]}><planeGeometry args={[2.14, 1.22]} /><meshStandardMaterial map={tex} roughness={0.7} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.32} /></mesh>
    <group ref={needle} position={[0, -0.45, 0.35]}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.026, 1.0, 0.012]} /><meshStandardMaterial color="#d0342c" emissive="#d0342c" emissiveIntensity={0.4} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.075, 0.04, 20]} /><meshStandardMaterial color="#15181b" roughness={0.4} /></mesh>
    </group>
    <mesh position={[0, 0.12, 0.37]}><planeGeometry args={[2.14, 1.22]} /><meshPhysicalMaterial color="#ffffff" roughness={0.05} transparent opacity={0.08} clearcoat={1} depthWrite={false} /></mesh>
    {/* 吊杆：电表挂在一根从上方垂下来的细杆上，杆的上端在画面外 */}
    <mesh position={[0, 0.96, -0.05]}><cylinderGeometry args={[0.16, 0.2, 0.14, 20]} /><meshStandardMaterial color="#14181b" roughness={0.45} /></mesh>
    <mesh position={[0, 8.0, -0.05]}><cylinderGeometry args={[0.065, 0.065, 14, 14]} /><Metal kind="steel" grain="turned" /></mesh>
    {POSTS.map((p, i) => <group key={i} position={p}>
      <mesh><cylinderGeometry args={[0.085, 0.1, 0.26, 16]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.13, 0.13, 0.07, 6]} /><meshStandardMaterial color={i ? '#22262a' : '#b3261e'} roughness={0.5} /></mesh>
    </group>)}
  </group>
}
/** 一根导线：过这几个点的光滑曲线 */
export function Wire({ pts, color = '#2a2f35', r = 0.04 }: { pts: V3[]; color?: string; r?: number }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5), 48, r, 8), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} castShadow><meshStandardMaterial color={color} roughness={0.55} /></mesh>
}

// ---------- 电极 ----------
const UP = new THREE.Vector3(0, 1, 0)
const aimQ = (dir: V3) => new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize())
/** 玻璃微电极：拉得很细的玻璃管，里面灌着电解液、插着一根银丝。tip 尖端的位置（可以每帧变），dir 从尖端指向尾端 */
export function Pipette({ tip, dir, len = 3.4 }: { tip: () => V3; dir: V3; len?: number }) {
  const ref = useRef<THREE.Group>(null), q = useMemo(() => aimQ(dir), [dir.join()])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => { ref.current?.position.set(...tip()) })
  return <group ref={ref} quaternion={q}>
    <mesh position={[0, len * 0.42, 0]}><cylinderGeometry args={[0.035, 0.006, len * 0.84, 10]} /><meshStandardMaterial color="#9fd0e6" emissive="#4aa3c8" emissiveIntensity={0.25} transparent opacity={0.5} /></mesh>
    <mesh position={[0, len * 0.56, 0]}><cylinderGeometry args={[0.014, 0.014, len * 0.88, 6]} /><Metal kind="steel" /></mesh>
    <mesh position={[0, len / 2, 0]} renderOrder={3}><cylinderGeometry args={[0.17, 0.016, len, 20, 1, true]} /><meshPhysicalMaterial color="#dff3ff" roughness={0.04} clearcoat={1} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} envMapIntensity={1.6} /></mesh>
    <mesh position={[0, len + 0.12, 0]}><cylinderGeometry args={[0.2, 0.2, 0.26, 20]} /><meshStandardMaterial color="#22272c" roughness={0.5} /></mesh>
  </group>
}
/** 一根金属电极：细金属丝，带一小段绝缘套。tip 尖端，dir 从尖端指向尾端 */
export function Probe({ tip, dir, len = 2.4, sleeve = '#2a2f35', thick = 1 }: { tip: V3; dir: V3; len?: number; sleeve?: string; thick?: number }) {
  const q = useMemo(() => aimQ(dir), [dir.join()])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group position={tip} quaternion={q} scale={[thick, 1, thick]}>
    <mesh position={[0, 0.02, 0]}><sphereGeometry args={[0.045, 12, 8]} /><Metal kind="steel" /></mesh>
    <mesh position={[0, len * 0.3, 0]}><cylinderGeometry args={[0.035, 0.04, len * 0.6, 10]} /><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[0, len * 0.8, 0]}><cylinderGeometry args={[0.085, 0.07, len * 0.4, 14]} /><meshStandardMaterial color={sleeve} roughness={0.5} /></mesh>
  </group>
}
/** 刺激电极：并排两根细针，装在一个小绝缘块上；flash 大于 0 时针尖闪一下（0–1） */
export function Stim({ tip, dir = [0, 1, 0], flash, len = 2.2, thick = 1 }: { tip: V3; dir?: V3; flash: () => number; len?: number; thick?: number }) {
  const q = useMemo(() => aimQ(dir), [dir.join()])   // eslint-disable-line react-hooks/exhaustive-deps
  const glow = useRef<THREE.Mesh>(null)
  useFrame(() => { const f = clamp(flash()); if (glow.current) { glow.current.scale.setScalar(0.001 + f * 0.5); (glow.current.material as THREE.MeshBasicMaterial).opacity = f } })
  return <group position={tip} quaternion={q} scale={[thick, 1, thick]}>
    {[-0.11, 0.11].map(x => <mesh key={x} position={[x, len * 0.35, 0]}><cylinderGeometry args={[0.035, 0.012, len * 0.7, 10]} /><Metal kind="steel" grain="turned" /></mesh>)}
    <RoundedBox args={[0.5, len * 0.42, 0.26]} radius={0.05} position={[0, len * 0.86, 0]}><meshStandardMaterial color="#d7a23a" roughness={0.5} /></RoundedBox>
    <mesh position={[0, len * 0.72, 0.135]}><boxGeometry args={[0.5, 0.03, 0.01]} /><meshStandardMaterial color="#5c4311" /></mesh>
    {/* 一根引线，往上接到画面外的刺激器 */}
    <mesh position={[0, len * 1.07 + 7, 0]}><cylinderGeometry args={[0.035, 0.035, 14, 8]} /><meshStandardMaterial color="#2a2f35" roughness={0.55} /></mesh>
    <mesh ref={glow} position={[0, 0.02, 0]}><sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color="#fff3b0" transparent depthWrite={false} toneMapped={false} /></mesh>
  </group>
}

// ---------- 箭头 ----------
/** 一支弯箭头：从 from 到 to，中间朝 bulge 鼓出去 */
export function Arrow({ from, to, bulge, color, r = 0.05, opacity = 1 }: { from: V3; to: V3; bulge: V3; color: string; r?: number; opacity?: number }) {
  const g = useMemo(() => {
    const mid: V3 = [(from[0] + to[0]) / 2 + bulge[0], (from[1] + to[1]) / 2 + bulge[1], (from[2] + to[2]) / 2 + bulge[2]]
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...from), new THREE.Vector3(...mid), new THREE.Vector3(...to))
    const end = c.getPoint(0.86), tan = c.getTangent(0.93)
    const sub = new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => c.getPoint(0.86 * i / 11)))
    return { tube: new THREE.TubeGeometry(sub, 24, r, 8), end: end.clone().addScaledVector(tan, c.getPoint(1).distanceTo(end) / 2), q: new THREE.Quaternion().setFromUnitVectors(UP, tan), h: c.getPoint(1).distanceTo(end) }
  }, [from.join(), to.join(), bulge.join(), r])   // eslint-disable-line react-hooks/exhaustive-deps
  const mat = <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
  return <group>
    <mesh geometry={g.tube}>{mat}</mesh>
    <mesh position={g.end} quaternion={g.q}><coneGeometry args={[r * 3, g.h, 14]} />{mat}</mesh>
  </group>
}
