// 地球的运动实验室的大场景：太阳、公转轨道、一颗带经纬网的地球，以及远处的一片操场。
// 整个实验室只有这一个世界，各课在里面各占一处；换课时画布不重建，镜头飞过去。
// 太阳、地球、轨道不按真实比例画。地球表面的海陆轮廓是手画的简图，只求认得出来。
import { useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Painted, Rod, mergeParts, type Part } from '@/lab-kit'
import { TERMS, TILT, orbitDir, spinAngle, subsolarLat } from './physics'

export const RO = 26, RE = 3.8, SUN_R = 3.6            // 轨道半径、地球半径、太阳半径（画面单位）
export const GROUND: [number, number, number] = [0, -3200, 0]   // 操场所在的位置：离太阳很远，互不照到
const RAD = Math.PI / 180

/** 地球中心在场景里的位置 */
export const earthAt = (day: number): [number, number, number] => { const [x, , z] = orbitDir(day); return [x * RO, 0, z * RO] }
/** 这一课对整个世界的要求 */
export interface Want {
  day?: number; utc?: number; tilt?: number
  /** 加亮一条纬线 */
  lat?: number
  /** 画出太阳直射的那束光和直射点 */
  ray?: boolean
  /** 给五带上色 */
  zones?: boolean
  /** 在这些日子的位置各留一根地轴的影子（比一比指向） */
  ghosts?: number[]
  /** 在地球上标出几座城市（纬度、经度） */
  cities?: { lat: number; lon: number }[]
  /** 拨地球：拖过去多少小时 */
  onSpin?: (hours: number) => void
}

// ---------- 地球表面 ----------
const LAND: [number, number][][] = [
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [5, 58], [12, 66], [25, 71], [40, 67], [60, 69], [75, 73], [100, 77], [140, 73], [170, 69], [180, 66], [170, 60], [160, 60], [156, 51], [142, 54], [135, 44], [129, 35], [122, 39], [121, 31], [118, 24], [108, 21], [109, 12], [104, 9], [100, 13], [98, 8], [103, 1], [98, 17], [92, 22], [86, 21], [80, 13], [77, 8], [73, 20], [66, 25], [57, 25], [51, 28], [56, 18], [45, 13], [43, 15], [35, 28], [36, 36], [27, 36], [26, 40], [22, 37], [19, 42], [13, 45], [18, 40], [15, 38], [12, 44], [3, 43], [0, 39], [-5, 36]],
  [[-17, 21], [-16, 12], [-8, 5], [5, 4], [9, 4], [9, -1], [13, -12], [12, -18], [18, -34], [26, -34], [33, -26], [40, -15], [40, -3], [51, 11], [43, 12], [37, 22], [33, 31], [20, 32], [10, 37], [-2, 35], [-10, 31]],
  [[-168, 66], [-156, 71], [-128, 70], [-95, 72], [-80, 73], [-62, 60], [-56, 52], [-66, 45], [-76, 35], [-81, 25], [-90, 29], [-97, 26], [-97, 19], [-88, 21], [-87, 15], [-83, 9], [-78, 8], [-86, 12], [-95, 16], [-105, 20], [-110, 23], [-115, 30], [-124, 40], [-124, 48], [-135, 58], [-152, 58], [-165, 55], [-160, 60]],
  [[-80, 9], [-75, 11], [-62, 10], [-50, 0], [-35, -6], [-39, -17], [-48, -27], [-58, -38], [-66, -46], [-69, -54], [-74, -50], [-72, -36], [-70, -18], [-81, -5]],
  [[114, -22], [122, -17], [131, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [131, -32], [124, -33], [115, -34]],
  [[130, 32], [136, 35], [141, 37], [142, 44], [140, 41], [136, 36]], [[-6, 50], [1, 51], [0, 54], [-3, 58], [-6, 56]], [[44, -16], [50, -15], [47, -25], [44, -23]],
  [[96, 5], [104, -5], [106, -6], [100, 0]], [[109, 1], [117, 7], [118, 1], [114, -4], [110, -2]], [[166, -46], [172, -41], [178, -38], [174, -42], [168, -47]], [[120, 18], [122, 18], [126, 7], [122, 9]],
]
const ICE: [number, number][][] = [
  [[-55, 60], [-43, 60], [-22, 70], [-20, 80], [-40, 83], [-60, 81], [-70, 77], [-56, 70]],
  [[-180, -90], [-180, -72], [-150, -76], [-100, -72], [-60, -65], [-55, -78], [-20, -73], [20, -70], [60, -67], [100, -66], [140, -67], [170, -72], [180, -72], [180, -90]],
  [[-180, 90], [-180, 84], [-90, 82], [0, 84], [90, 82], [180, 84], [180, 90]],
]
function makeEarth() {
  const W = 2048, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, X = (lon: number) => (lon + 180) / 360 * W, Y = (lat: number) => (90 - lat) / 180 * H
  const sea = g.createLinearGradient(0, 0, 0, H); sea.addColorStop(0, '#2c5f9c'); sea.addColorStop(0.5, '#2f73b6'); sea.addColorStop(1, '#2c5f9c')
  g.fillStyle = sea; g.fillRect(0, 0, W, H)
  const fill = (polys: [number, number][][], color: string, edge: string) => {
    g.fillStyle = color; g.strokeStyle = edge; g.lineWidth = 2.5; g.lineJoin = 'round'
    for (const p of polys) { g.beginPath(); p.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.closePath(); g.fill(); g.stroke() }
  }
  fill(LAND, '#86ad6f', '#6c9459'); fill(ICE, '#eef4f7', '#d5e2ea')
  // 经纬网：每 30° 一条细线
  g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.5
  for (let lo = -180; lo <= 180; lo += 30) { g.beginPath(); g.moveTo(X(lo), 0); g.lineTo(X(lo), H); g.stroke() }
  for (let la = -60; la <= 60; la += 30) { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(W, Y(la)); g.stroke() }
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(0), H); g.stroke()        // 0° 经线画粗一点
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/** 五带的颜色带：热带、南北温带、南北寒带 */
function makeZones(tilt: number) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 360
  const g = c.getContext('2d')!, y = (lat: number) => (90 - lat) * 2
  const band = (a: number, b: number, color: string) => { g.fillStyle = color; g.fillRect(0, y(a), 4, y(b) - y(a)) }
  const tr = tilt, po = 90 - tilt
  if (tilt > 0.05) {
    band(90, Math.max(po, tr), 'rgba(140,200,255,0.75)'); band(-Math.max(po, tr), -90, 'rgba(140,200,255,0.75)')
    band(Math.min(tr, po), -Math.min(tr, po), 'rgba(255,150,90,0.7)')
    if (po > tr) { band(po, tr, 'rgba(150,220,140,0.6)'); band(-tr, -po, 'rgba(150,220,140,0.6)') }
  } else band(90, -90, 'rgba(150,220,140,0.45)')
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** 一条纬线：一圈细环 */
function Parallel({ lat, color, r = 0.022, opacity = 1 }: { lat: number; color: string; r?: number; opacity?: number }) {
  const R = RE * Math.cos(lat * RAD) * 1.004
  if (R < 0.05) return null
  return <mesh position={[0, RE * Math.sin(lat * RAD) * 1.004, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[R, r, 8, 120]} /><meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} /></mesh>
}
/** 地轴：穿过南北极的一根细杆，北极那头有个红尖 */
function Axis({ faint = false }: { faint?: boolean }) {
  return (
    <group>
      <mesh><cylinderGeometry args={[0.035, 0.035, RE * 2.9, 10]} /><meshBasicMaterial color="#f3f1ea" transparent opacity={faint ? 0.45 : 0.95} toneMapped={false} /></mesh>
      <mesh position={[0, RE * 1.45 + 0.16, 0]}><coneGeometry args={[0.13, 0.36, 12]} /><meshBasicMaterial color="#ff6b4a" transparent opacity={faint ? 0.6 : 1} toneMapped={false} /></mesh>
    </group>
  )
}

function Earth({ want }: { want: Want }) {
  const day = want.day ?? 0, utc = want.utc ?? 4, tilt = want.tilt ?? TILT
  const tex = useMemo(makeEarth, [])
  const zoneTex = useMemo(() => makeZones(tilt), [tilt])
  const controls = useThree(s => s.controls) as { enabled: boolean } | null
  const drag = useRef<number | null>(null)
  const spin = want.onSpin
  const hand = spin ? {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); drag.current = e.nativeEvent.clientX; if (controls) controls.enabled = false },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => { if (drag.current == null) return; const dx = e.nativeEvent.clientX - drag.current; if (Math.abs(dx) >= 2) { spin(dx * 0.05); drag.current = e.nativeEvent.clientX } },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => { drag.current = null; (e.target as Element).releasePointerCapture?.(e.pointerId); if (controls) controls.enabled = true },
    onPointerOver: () => { document.body.style.cursor = 'ew-resize' }, onPointerOut: () => { document.body.style.cursor = '' },
  } : {}
  const sub = subsolarLat(day, tilt), [dx, , dz] = orbitDir(day)
  return (
    <group position={earthAt(day)}>
      <group rotation-z={-tilt * RAD}>
        <mesh rotation-y={spinAngle(day, utc, tilt)} {...hand}>
          <sphereGeometry args={[RE, 96, 64]} />
          <meshStandardMaterial map={tex} roughness={0.85} metalness={0} />
          {(want.cities ?? []).map((c, i) => { const k = Math.cos(c.lat * RAD); return <mesh key={i} position={[RE * 1.006 * k * Math.cos(c.lon * RAD), RE * 1.006 * Math.sin(c.lat * RAD), -RE * 1.006 * k * Math.sin(c.lon * RAD)]}><sphereGeometry args={[0.075, 12, 10]} /><meshBasicMaterial color={i ? '#ffe14d' : '#ff5a3c'} toneMapped={false} /></mesh> })}
        </mesh>
        {want.zones && <mesh><sphereGeometry args={[RE * 1.003, 64, 48]} /><meshBasicMaterial map={zoneTex} transparent depthWrite={false} toneMapped={false} /></mesh>}
        <Parallel lat={0} color="#ffe14d" />
        {tilt > 0.05 && [1, -1].map(s => <Parallel key={s} lat={s * tilt} color="#ffa24d" />)}
        {tilt > 0.05 && [1, -1].map(s => <Parallel key={s} lat={s * (90 - tilt)} color="#7fd6ff" />)}
        {want.lat != null && <Parallel lat={want.lat} color="#ffffff" r={0.045} />}
        {want.ray && <Parallel lat={sub} color="#ff5a3c" r={0.04} />}
        <Axis />
      </group>
      {/* 太阳直射的那束光：从太阳方向打到直射点 */}
      {want.ray && <Rod from={[-dx * (RE + 0.02), 0, -dz * (RE + 0.02)]} to={[-dx * (RE + 7), 0, -dz * (RE + 7)]} r={0.05}><meshBasicMaterial color="#ffd27a" toneMapped={false} /></Rod>}
      {want.ray && <mesh position={[-dx * (RE + 0.03), 0, -dz * (RE + 0.03)]}><sphereGeometry args={[0.13, 16, 12]} /><meshBasicMaterial color="#ff5a3c" toneMapped={false} /></mesh>}
    </group>
  )
}

/** 远处的一片操场：第 6 课站到这里看影子。太阳和影子由那一课自己画 */
function Playground() {
  const geo = useMemo(() => {
    const P: Part[] = []
    P.push({ p: [0, -0.06, 0], s: [70, 0.12, 56], c: '#b5553f' }, { p: [0, 0.0, 0], s: [52, 0.02, 34], c: '#4f8f5c' })                       // 跑道和草地
    for (const [x, z, w, d] of [[0, -16.9, 52, 0.25], [0, 16.9, 52, 0.25], [-25.9, 0, 0.25, 34], [25.9, 0, 0.25, 34]]) P.push({ p: [x, 0.02, z], s: [w, 0.02, d], c: '#f1efe8' })
    // 北边的教学楼
    P.push({ p: [0, 7, -40], s: [56, 14, 10], c: '#e4e1d8' }, { p: [0, 14.3, -40], s: [58, 0.6, 11], c: '#8a4a3a' })
    for (let f = 0; f < 4; f++) for (let i = 0; i < 12; i++) P.push({ p: [-24.2 + i * 4.4, 2.6 + f * 3.3, -34.95], s: [2.6, 1.7, 0.1], c: '#5d86a8' })
    // 旗台和旗杆
    P.push({ p: [0, 0.2, 0], s: [3, 0.4, 3], c: '#c9c6bb' }, { p: [0, 5.2, 0], s: [0.09, 10, 0.09], c: '#d8dde2', cyl: true }, { p: [0.9, 9.3, 0], s: [1.7, 1.1, 0.04], c: '#d6332b' })
    for (const [x, z] of [[-33, -20], [-33, 0], [-33, 20], [33, -20], [33, 0], [33, 20]]) P.push({ p: [x, 1.4, z], s: [0.3, 2.8, 0.3], c: '#6b5a45', cyl: true }, { p: [x, 4.2, z], s: [2.2, 3.4, 2.2], c: '#4c8a55', cyl: true })
    return mergeParts(P)
  }, [])
  return (
    <group position={GROUND}>
      <mesh position={[0, -0.14, 0]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[260, 48]} /><meshStandardMaterial color="#9fb48a" roughness={1} /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.85} metal={0} /></mesh>
    </group>
  )
}

/** 星星：远处一圈小亮点 */
function Stars() {
  const geo = useMemo(() => {
    const n = 900, a = new Float32Array(n * 3); let s = 11
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = 380 + rnd() * 60, q = Math.sqrt(1 - u * u); a[i * 3] = q * Math.cos(t) * r; a[i * 3 + 1] = u * r * 0.8 + 40; a[i * 3 + 2] = q * Math.sin(t) * r }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3))
    return g
  }, [])
  return <points geometry={geo}><pointsMaterial color="#dfe8ff" size={1.5} sizeAttenuation fog={false} /></points>
}

export function World({ want = {} }: { want?: Want }) {
  const tilt = want.tilt ?? TILT
  return (
    <group>
      <Stars />
      {/* 太阳：自己发光，照亮半个地球。光只照到轨道附近，不会照到远处的操场 */}
      <pointLight position={[0, 0, 0]} intensity={95} decay={1} distance={220} color="#fff3dc" />
      <mesh><sphereGeometry args={[SUN_R, 48, 32]} /><meshBasicMaterial color="#ffcf5c" toneMapped={false} fog={false} /></mesh>
      <mesh><sphereGeometry args={[SUN_R * 1.35, 32, 24]} /><meshBasicMaterial color="#ffb347" transparent opacity={0.1} depthWrite={false} toneMapped={false} fog={false} /></mesh>
      {/* 公转轨道，和上面四个节气的位置 */}
      <mesh rotation-x={Math.PI / 2}><torusGeometry args={[RO, 0.045, 8, 240]} /><meshBasicMaterial color="#8fa3c2" transparent opacity={0.7} toneMapped={false} /></mesh>
      {TERMS.map(t => { const [x, , z] = earthAt(t.day); return <mesh key={t.key} position={[x * 1.0, -RE - 1.1, z * 1.0]}><cylinderGeometry args={[0.5, 0.5, 0.1, 24]} /><meshBasicMaterial color="#ffe9a8" transparent opacity={0.85} toneMapped={false} /></mesh> })}
      <Earth want={want} />
      {(want.ghosts ?? []).map(d => <group key={d} position={earthAt(d)} rotation-z={-tilt * RAD}><Axis faint /></group>)}
      <Playground />
    </group>
  )
}
