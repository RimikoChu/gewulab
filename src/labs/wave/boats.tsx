// 水上的东西：船壳、靠泊的渔船、拖着起波器的工作艇、浮码头、小浮标、起波锤。
// 船壳是按站位放样出来的曲面（不是方盒子）：船头收尖上翘、船底是圆舭，水线以下刷防污漆。
import { forwardRef, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Painted, lathe, mergeParts, type Part } from '@/lab-kit'
import { plankTex } from './mats'
import type { V3 } from './layout'

const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, r?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c, r })
const cyl = (x: number, y0: number, z: number, r: number, h: number, c: string, rot?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [r, h, 0], c, cyl: true, r: rot })

/** 船壳：长 L、宽 B、干舷 F（水线到舷边）、吃水 T。船头朝 +x，水线在 y = 0。带甲板，是闭合的 */
export function hullGeo(L: number, B: number, F: number, T: number, color: string, bottom = '#7a2b22') {
  const NU = 28, NS = 10, pos: number[] = [], col: number[] = [], idx: number[] = []
  const cTop = new THREE.Color(color), cBot = new THREE.Color(bottom), cLine = new THREE.Color('#e9e6dc'), c = new THREE.Color()
  const half = (u: number) => { const bow = Math.min(1, Math.max(0, (u - 0.42) / 0.58)), st = Math.min(1, u / 0.22); return (B / 2) * Math.pow(1 - Math.pow(bow, 2.1), 0.85) * (0.8 + 0.2 * st * st * (3 - 2 * st)) }
  const sheer = (u: number) => F * (1 + 0.45 * u * u * u + 0.08 * (1 - u) * (1 - u))
  const keel = (u: number) => -T * (1 - 0.92 * Math.pow(u, 5)) * (0.75 + 0.25 * Math.min(1, u / 0.3))
  const ring = NS * 2 + 1
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, x = -L / 2 + u * L, b = half(u), ys = sheer(u), yk = keel(u)
    for (let j = -NS; j <= NS; j++) {
      const s = Math.abs(j) / NS, y = yk + (ys - yk) * Math.pow(s, 1.35), w = b * Math.pow(s, 0.42) * Math.sign(j)
      pos.push(x, y, w)
      c.copy(y < 0.06 ? cBot : y > ys - 0.09 ? cLine : cTop); col.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < ring - 1; j++) { const a = i * ring + j, b2 = a + 1, d = a + ring, e = d + 1; idx.push(a, d, b2, b2, d, e) }
  // 艉封板
  const base = pos.length / 3
  pos.push(-L / 2, sheer(0) * 0.5, 0); col.push(cTop.r, cTop.g, cTop.b)
  for (let j = 0; j < ring - 1; j++) idx.push(base, j + 1, j)
  // 甲板：比舷边低一点，留出舷墙
  const dk = pos.length / 3, cd = new THREE.Color('#b9a98a')
  for (let i = 0; i <= NU; i++) { const u = i / NU, x = -L / 2 + u * L, b = half(u) * 0.96, y = sheer(u) - 0.16; pos.push(x, y, -b, x, y, b); col.push(cd.r, cd.g, cd.b, cd.r, cd.g, cd.b) }
  for (let i = 0; i < NU; i++) { const a = dk + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
const HullMat = () => <meshPhysicalMaterial vertexColors roughness={0.45} clearcoat={0.35} clearcoatRoughness={0.4} side={THREE.DoubleSide} />

/** 靠在码头边的渔船：驾驶室、桅杆、起网机，跟着水轻轻晃 */
export function FishingBoat({ x, z, hull, turn = false }: { x: number; z: number; hull: string; turn?: boolean }) {
  const g = useRef<THREE.Group>(null), ph = useMemo(() => x * 0.37, [x])
  const geo = useMemo(() => hullGeo(10.5, 3.3, 0.95, 0.7, hull), [hull])
  const top = useMemo(() => mergeParts([
    box(-1.2, 0.85, 0, 2.6, 2.0, 2.1, '#ece9df'), box(-1.2, 2.85, 0, 2.9, 0.1, 2.4, '#d8d4c8'), box(0.12, 1.85, 0, 0.04, 0.7, 1.8, '#18242d'), box(-1.2, 1.85, 1.06, 2.0, 0.7, 0.04, '#18242d'), box(-1.2, 1.85, -1.06, 2.0, 0.7, 0.04, '#18242d'),
    cyl(-0.4, 2.95, 0, 0.05, 3.0, '#d8d4c8'), box(1.6, 3.9, 0, 4.2, 0.07, 0.07, '#d8d4c8', [0, 0, 0.28]), cyl(2.9, 0.85, 0, 0.42, 0.9, '#39424a', [Math.PI / 2, 0, 0]),
    box(-4.2, 0.9, 0, 1.2, 0.5, 1.6, '#2c6e8f'), box(3.9, 1.05, 0, 0.5, 0.35, 0.5, '#33383d'),
  ]), [])
  useFrame(({ clock }) => { const t = clock.elapsedTime; if (g.current) { g.current.rotation.x = Math.sin(t * 0.7 + ph) * 0.018; g.current.position.y = Math.sin(t * 0.55 + ph) * 0.03 } })
  return <group position={[x, 0, z]} rotation-y={turn ? Math.PI : 0}><group ref={g}>
    <mesh geometry={geo} castShadow receiveShadow><HullMat /></mesh>
    <mesh geometry={top} castShadow><Painted rough={0.5} metal={0.1} /></mesh>
    {[-2.5, 1.5].map(dx => <mesh key={dx} position={[dx, 0.35, turn ? -1.72 : 1.72]} castShadow><sphereGeometry args={[0.24, 16, 12]} /><meshStandardMaterial color="#e8641e" roughness={0.6} /></mesh>)}
  </group></group>
}

/** 工作艇：9 m 长的小艇（模型按 6 m 建，整体放大 1.5 倍），艇尾挂机，艇中有一个小操纵台；船头伸出一根支架，挂着上下拍水的起波锤（在艇首前 1.2 m） */
export const BOAT = { L: 6, lead: 1.2 }
export const WorkBoat = forwardRef<THREE.Group, { plunger?: React.RefObject<THREE.Group | null>; size?: number; children?: ReactNode }>(function WorkBoat({ plunger, size = 1.5, children }, ref) {
  const geo = useMemo(() => { const g = hullGeo(BOAT.L, 2.1, 0.6, 0.35, '#e9e4d6', '#1f3a5c'); g.translate(-BOAT.lead - BOAT.L / 2, 0, 0); return g }, [])
  const x0 = -BOAT.lead - BOAT.L / 2          // 艇身中点
  const bits = useMemo(() => mergeParts([
    box(x0 - 0.2, 0.45, 0, 0.9, 0.75, 1.1, '#f08a1c'), box(x0 + 0.26, 1.0, 0, 0.04, 0.45, 1.0, '#18242d', [0, 0, -0.25]), box(x0 - 1.3, 0.42, 0, 0.5, 0.3, 1.5, '#8a7a5c'),
    box(x0 - BOAT.L / 2 - 0.12, 0.25, 0, 0.36, 0.75, 0.42, '#22262a'), box(x0 - BOAT.L / 2 - 0.12, -0.35, 0, 0.12, 0.6, 0.12, '#33383d'),
    // 艇首的支架：两根斜撑和一根伸出去的横梁
    box(-1.5, 1.15, 0, 3.2, 0.07, 0.07, '#c9ced2', [0, 0, 0.12]), box(-2.6, 0.75, 0.5, 0.06, 0.6, 0.06, '#c9ced2', [0.5, 0, 0]), box(-2.6, 0.75, -0.5, 0.06, 0.6, 0.06, '#c9ced2', [-0.5, 0, 0]),
  ]), [x0])
  return <group ref={ref}><group scale={size}>
    <mesh geometry={geo} castShadow receiveShadow><HullMat /></mesh>
    <mesh geometry={bits} castShadow><Painted rough={0.45} metal={0.3} /></mesh>
    <group position={[0, 1.33, 0]}><Motor /></group>
    <group ref={plunger}><Plunger /></group>
    {children}
  </group></group>
})

/** 起波锤：一只上下拍水的圆柱浮锤，上面一根连杆。原点在水面，自己不动，由外面每帧改它的高度 */
const HAMMER: [number, number][] = [[0, -0.32], [0.2, -0.32], [0.27, -0.24], [0.27, 0.16], [0.22, 0.22], [0, 0.22]]
export function Plunger({ color = '#f6c21c', size = 1 }: { color?: string; size?: number }) {
  const geo = useMemo(() => lathe(HAMMER, { segs: 32 }), [])
  return <group scale={size}>
    <mesh geometry={geo} castShadow><meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh position-y={-0.02}><cylinderGeometry args={[0.275, 0.275, 0.06, 32]} /><meshStandardMaterial color="#1b1d20" roughness={0.6} /></mesh>
    <mesh position-y={0.82} castShadow><cylinderGeometry args={[0.03, 0.03, 1.2, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
  </group>
}
/** 驱动起波锤的电机盒：灰色机壳、散热筋、一圈螺栓 */
export function Motor() {
  return <group>
    <RoundedBox args={[0.5, 0.42, 0.42]} radius={0.04} smoothness={3} position-y={0.21} castShadow><meshStandardMaterial color="#4a5661" roughness={0.5} metalness={0.5} /></RoundedBox>
    {[-0.15, -0.05, 0.05, 0.15].map(z => <mesh key={z} position={[0, 0.44, z]}><boxGeometry args={[0.44, 0.04, 0.02]} /><meshStandardMaterial color="#3b454e" roughness={0.5} metalness={0.5} /></mesh>)}
    <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.07, 0.07, 0.1, 16]} /><Metal kind="steel" grain="turned" /></mesh>
  </group>
}

/** 浮码头：钢框架、木板面、底下一排黑色浮筒，四角有系缆桩。w 沿 x、d 沿 z；甲板面高出水面 0.45 m。跟着水轻轻晃 */
export const DECK = 0.45
export function Pontoon({ w, d, children, posts = true }: { w: number; d: number; children?: ReactNode; posts?: boolean }) {
  const g = useRef<THREE.Group>(null)
  const long = w >= d, map = useMemo(() => plankTex(long ? [w / 1.6, d / 1.2] : [d / 1.6, w / 1.2]), [w, d, long])
  const tex = useMemo(() => { const t = map.clone(); t.needsUpdate = true; if (!long) { t.rotation = Math.PI / 2 } return t }, [map, long])
  const frame = useMemo(() => {
    const p: Part[] = [box(0, DECK - 0.2, 0, w, 0.14, d, '#3b4650')]
    const n = Math.max(2, Math.round((long ? w : d) / 1.5))
    for (let i = 0; i < n; i++) { const t = -0.5 + (i + 0.5) / n; p.push(long ? { p: [t * w, -0.02, 0], s: [0.3, d - 0.3, 0], c: '#15181b', cyl: true, r: [Math.PI / 2, 0, 0] } : { p: [0, -0.02, t * d], s: [0.3, w - 0.3, 0], c: '#15181b', cyl: true, r: [0, 0, Math.PI / 2] }) }
    if (posts) for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(cyl(sx * (w / 2 - 0.22), DECK, sz * (d / 2 - 0.22), 0.06, 0.22, '#22262a'), cyl(sx * (w / 2 - 0.22), DECK + 0.2, sz * (d / 2 - 0.22), 0.09, 0.04, '#22262a'))
    p.push(box(0, DECK - 0.06, d / 2, w, 0.1, 0.06, '#c9a227'), box(0, DECK - 0.06, -d / 2, w, 0.1, 0.06, '#c9a227'), box(w / 2, DECK - 0.06, 0, 0.06, 0.1, d, '#c9a227'), box(-w / 2, DECK - 0.06, 0, 0.06, 0.1, d, '#c9a227'))
    return mergeParts(p)
  }, [w, d, long, posts])
  useFrame(({ clock }) => { if (g.current) g.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.004 })
  return <group ref={g}>
    <mesh geometry={frame} castShadow receiveShadow><Painted rough={0.6} metal={0.3} /></mesh>
    <mesh position-y={DECK - 0.03} castShadow receiveShadow><boxGeometry args={[w - 0.08, 0.06, d - 0.08]} /><meshStandardMaterial map={tex} roughness={0.85} /></mesh>
    {children}
  </group>
}

/** 小浮标：圆锥形的浮体加一根带球的标杆，原点在水线。由外面每帧改它的高度 */
const CONE: [number, number][] = [[0, -0.3], [0.2, -0.3], [0.36, -0.06], [0.36, 0.08], [0.1, 0.5], [0.06, 0.5], [0.06, 0.56], [0, 0.56]]
export const MarkerBuoy = forwardRef<THREE.Group, { color: string; position?: V3; size?: number }>(function MarkerBuoy({ color, position, size = 1 }, ref) {
  const geo = useMemo(() => lathe(CONE, { segs: 32 }), [])
  return <group ref={ref} position={position}><group scale={size}>
    <mesh geometry={geo} castShadow><meshPhysicalMaterial color={color} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
    <mesh position-y={0.01}><cylinderGeometry args={[0.365, 0.365, 0.07, 32]} /><meshStandardMaterial color="#ece9df" roughness={0.5} /></mesh>
    <mesh position-y={0.95}><cylinderGeometry args={[0.018, 0.018, 0.8, 8]} /><Metal kind="stainless" /></mesh>
    <mesh position-y={1.4} castShadow><sphereGeometry args={[0.1, 16, 12]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
  </group></group>
})

/** 造波的浮码头：一块 10 m 长的造波板，上沿铰在码头边上，两台电机带着它来回摆。板在 +x 一侧，离码头中心 2 m；flap 由外面每帧转 */
export function Paddle({ flap }: { flap: React.RefObject<THREE.Group | null> }) {
  return <Pontoon w={3.2} d={13}>
    {[-3.4, 3.4].map(z => <group key={z} position={[0.9, DECK, z]}><Motor />
      <mesh position={[0.55, 0.42, 0]} rotation-z={Math.PI / 2 - 0.5}><cylinderGeometry args={[0.025, 0.025, 0.8, 10]} /><Metal kind="stainless" /></mesh>
    </group>)}
    {[-5.25, 5.25].map(z => <mesh key={z} position={[1.62, DECK + 0.5, z]} castShadow><boxGeometry args={[0.1, 1.0, 0.1]} /><Metal kind="steel" grain="brushed" /></mesh>)}
    <group ref={flap} position={[1.72, DECK + 0.95, 0]}>
      <mesh position={[0.03, -0.95, 0]} castShadow><boxGeometry args={[0.06, 1.9, 10]} /><meshPhysicalMaterial color="#f6c21c" roughness={0.45} clearcoat={0.4} /></mesh>
      {[-4, -2, 0, 2, 4].map(z => <mesh key={z} position={[0.07, -0.9, z]}><boxGeometry args={[0.05, 1.8, 0.08]} /><meshStandardMaterial color="#3b454e" metalness={0.5} roughness={0.5} /></mesh>)}
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.04, 0.04, 10.6, 12]} /><Metal kind="steel" grain="turned" /></mesh>
    </group>
  </Pontoon>
}
