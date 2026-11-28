// 游乐园里的三样大设施：海盗船（人字架、转轴、船身、座椅）、蹦极塔（钢桁架、跳台、水池、测试假人和弹力绳）、摩天轮。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Painted, mergeParts, useRipple, type Part } from '@/lab-kit'
import { BUNGEE, SHIP } from './physics'
import { beam, box, cyl, fuse, tint, type V3 } from './mats'

function rod(a: V3, b: V3, r: number, c: string): Part { const q = beam(a, b, r, c); return { ...q, s: [r, q.s[1], 0], cyl: true } }

// ---------- 海盗船 ----------
/** 转轴离地的高度；船的重心在转轴下面 SHIP.arm 米 */
export const PIVOT = 13.4
const KEEL = SHIP.arm + 1.25, HALF = 7.2
const gunwale = (x: number) => -SHIP.arm + 0.55 + 0.05 * x * x, beamAt = (x: number) => 1.55 * (1 - Math.pow(Math.abs(x) / (HALF + 0.5), 3.2))
/** 船壳：沿船长一段段放样，截面是半个椭圆；外面刷三道色带。原点在转轴上 */
function hullGeo() {
  const M = 44, K = 14, pos: number[] = [], col: number[] = [], idx: number[] = [], c = new THREE.Color()
  for (let i = 0; i <= M; i++) {
    const x = -HALF + 2 * HALF * i / M, top = gunwale(x), bot = -Math.sqrt(KEEL * KEEL - x * x), w = beamAt(x)
    for (let k = 0; k <= K; k++) {
      const a = Math.PI * k / K, y = top - (top - bot) * Math.pow(Math.sin(a), 0.8)
      pos.push(x, y, -w * Math.cos(a))
      const f = (top - y) / (top - bot); c.set(f < 0.13 ? '#e8c04a' : f < 0.2 ? '#f3ead6' : f < 0.72 ? '#a52f27' : '#5b3524'); col.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < M; i++) for (let k = 0; k < K; k++) { const a = i * (K + 1) + k, b = a + K + 1; idx.push(a, b, a + 1, a + 1, b, b + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
function shipParts() {
  const P: Part[] = [], S: Part[] = []
  // 甲板和一排排座椅：两头的座椅朝着中间
  for (let x = -5.4; x <= 5.41; x += 1.2) {
    const y = gunwale(x) - 0.95, w = beamAt(x) * 2 - 0.25, face = x < -0.1 ? 1 : x > 0.1 ? -1 : 0
    P.push(box(x, y - 0.12, 0, 1.22, 0.1, w, '#7a5a3c'))
    if (!face) continue
    P.push(box(x, y, 0, 0.46, 0.34, w - 0.1, '#2f4a6e'), box(x - face * 0.26, y, 0, 0.1, 0.95, w - 0.1, '#2f4a6e'))
    S.push(rod([x + face * 0.3, y + 0.62, -w / 2 + 0.05], [x + face * 0.3, y + 0.62, w / 2 - 0.05], 0.03, '#d9dcdf'))
  }
  // 船舷的压条、船头船尾的立柱
  for (const k of [-1, 1]) for (let i = 0; i < 36; i++) { const x0 = -HALF + 0.3 + i * 0.4, x1 = x0 + 0.4; P.push(beam([x0, gunwale(x0), k * beamAt(x0)], [x1, gunwale(x1), k * beamAt(x1)], 0.13, '#e8c04a')) }
  for (const e of [-1, 1]) P.push(beam([e * HALF, gunwale(HALF) - 0.6, 0], [e * (HALF + 0.9), gunwale(HALF) + 1.5, 0], 0.26, '#5b3524'))
  // 四根吊臂，从转轴接到船舷
  for (const e of [-1, 1]) for (const k of [-1, 1]) S.push(rod([e * 0.3, -0.1, k * 1.25], [e * 4.4, gunwale(4.4) - 0.1, k * (beamAt(4.4) - 0.06)], 0.11, '#e9e5d8'))
  for (const k of [-1, 1]) S.push(rod([-4.4, gunwale(4.4) - 0.5, k * (beamAt(4.4) - 0.06)], [4.4, gunwale(4.4) - 0.5, k * (beamAt(4.4) - 0.06)], 0.05, '#e9e5d8'))
  return { P: mergeParts(P), S: mergeParts(S) }
}
const SCROLL = (() => { const g = new THREE.TorusGeometry(0.55, 0.14, 10, 28, Math.PI * 1.6); return g })()
/** 会摆的那一部分：船身、座椅、吊臂。挂在转轴上，绕 z 轴转 */
export function ShipBody() {
  const g = useMemo(() => ({ hull: hullGeo(), ...shipParts() }), [])
  return <group>
    <mesh geometry={g.hull} castShadow receiveShadow><meshPhysicalMaterial vertexColors side={THREE.DoubleSide} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
    <mesh geometry={g.P} castShadow receiveShadow><Painted rough={0.6} metal={0.05} /></mesh>
    <mesh geometry={g.S} castShadow><Painted rough={0.35} metal={0.6} /></mesh>
    {[-1, 1].map(e => <mesh key={e} geometry={SCROLL} position={[e * (HALF + 0.75), gunwale(HALF) + 1.9, 0]} rotation={[0, e > 0 ? 0 : Math.PI, 0.6]} castShadow><meshPhysicalMaterial color="#e8c04a" roughness={0.35} metalness={0.4} clearcoat={0.4} /></mesh>)}
    {/* 转轴上的轴套 */}
    <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.5, 0.5, 3.1, 28]} /><Metal kind="steel" grain="turned" /></mesh>
  </group>
}
/** 不动的那一部分：两榀人字架、转轴、上客平台和栏杆、台阶、底下的驱动轮。原点在船正下方的地面上 */
export function ShipFrame() {
  const g = useMemo(() => {
    const P: Part[] = [], S: Part[] = [], W = '#e9e5d8'
    for (const k of [-1, 1]) {
      const z = k * 3.5
      for (const e of [-1, 1]) { S.push(rod([e * 7.6, 0.4, z], [0, PIVOT, z], 0.3, W)); P.push(box(e * 7.6, 0, z, 1.5, 0.45, 1.5, '#a9a79f')); S.push(rod([e * 7.6, 0.4, z], [e * 2.2, PIVOT * 0.62, z + k * 0.01], 0.12, W)) }
      S.push(rod([-3.5, PIVOT * 0.56, z], [3.5, PIVOT * 0.56, z], 0.16, W), rod([-1.55, PIVOT * 0.8, z], [1.55, PIVOT * 0.8, z], 0.13, W))
      S.push({ p: [0, PIVOT, z], s: [0.75, 0.5, 0], c: '#c8372d', cyl: true, r: [Math.PI / 2, 0, 0] })
      // 平台：船的前后各一条，朝外有栏杆
      P.push(box(0, 0, k * 4.2, 17, 1.9, 3.2, '#8d9094'), box(0, 1.9, k * 4.2, 17, 0.06, 3.2, '#b98d5a'))
      for (let i = -8; i <= 8; i++) P.push(box(i * 1.05, 1.96, k * 5.7, 0.05, 1.05, 0.05, '#d9dcdf'))
      P.push(box(0, 2.98, k * 5.7, 17, 0.06, 0.06, '#d9dcdf'), box(0, 2.5, k * 5.7, 17, 0.04, 0.04, '#d9dcdf'))
      for (let i = 0; i < 8; i++) P.push(box(-9.4 - i * 0.32 + 0.9, 0, k * 4.2, 0.32, 1.9 - i * 0.24, 2.2, '#9a9da0'))
    }
    S.push({ p: [0, PIVOT, 0], s: [0.3, 8.2, 0], c: '#9aa0a6', cyl: true, r: [Math.PI / 2, 0, 0] })
    // 船底下的驱动轮和电机
    P.push(box(0, 0, 0, 3.4, 0.5, 2.2, '#5c6268'), box(1.5, 0.5, 0, 1.1, 0.7, 1.0, '#2f6f9f'))
    S.push({ p: [0, 0.78, 0], s: [0.42, 0.5, 0], c: '#1d1f22', cyl: true, r: [Math.PI / 2, 0, 0] })
    return { P: mergeParts(P), S: mergeParts(S) }
  }, [])
  return <group>
    <mesh geometry={g.P} castShadow receiveShadow><Painted rough={0.75} metal={0.05} /></mesh>
    <mesh geometry={g.S} castShadow receiveShadow><Painted rough={0.4} metal={0.45} /></mesh>
  </group>
}
/** 整艘海盗船：angle() 每帧给出摆角（弧度，船头朝 +x 抬起为正） */
export function PirateShip({ angle }: { angle?: () => number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { if (ref.current) ref.current.rotation.z = angle ? angle() : 0 })
  return <group><ShipFrame /><group ref={ref} position={[0, PIVOT, 0]}><ShipBody /></group></group>
}

// ---------- 蹦极塔 ----------
/** 跳台伸出塔身的方向是 +x；起跳点在塔中心东边 JUMP_X 米 */
export const JUMP_X = 8.5
export function BungeeTower() {
  const ripple = useRipple(5, 0.02)
  const g = useMemo(() => {
    const S: Part[] = [], P: Part[] = [], W = '#e9e5d8', R = '#c8372d', H = BUNGEE.top, a = 2.4
    // 塔身：四根角柱，每 4 m 一圈横杆，四个面上交叉的斜杆；红白相间
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let y = 0; y < H + 4; y += 4) S.push(box(sx * a, y, sz * a, 0.3, 4, 0.3, Math.floor(y / 8) % 2 ? R : W))
    for (let y = 4; y <= H + 4; y += 4) {
      const c = Math.floor((y - 1) / 8) % 2 ? R : W
      for (const s of [-1, 1]) { S.push(box(0, y - 0.1, s * a, 2 * a, 0.16, 0.16, c), box(s * a, y - 0.1, 0, 0.16, 0.16, 2 * a, c)) }
      const f = (y / 4) % 2 ? 1 : -1
      for (const s of [-1, 1]) { S.push(beam([-f * a, y - 4, s * a], [f * a, y, s * a], 0.11, c), beam([s * a, y - 4, -f * a], [s * a, y, f * a], 0.11, c)) }
    }
    // 楼梯：塔里面一折一折往上
    for (let y = 0; y < H; y += 4) { const f = (y / 4) % 2 ? 1 : -1; P.push(beam([-f * 1.6, y + 0.1, 0.9 * f], [f * 1.6, y + 3.9, 0.9 * f], 0.5, '#7b8187')) }
    // 跳台：从塔顶往东伸出去的悬臂，下面有斜撑，三面有栏杆，尽头开口
    P.push(box(JUMP_X / 2 + 0.6, H - 0.25, 0, JUMP_X + 2.6, 0.25, 2.6, '#6f757b'), box(JUMP_X / 2 + 0.6, H, 0, JUMP_X + 2.6, 0.04, 2.6, '#d8b23a'))
    for (const s of [-1, 1]) {
      S.push(beam([a, H - 7, s * 1.1], [JUMP_X + 0.6, H - 0.3, s * 1.1], 0.2, W), beam([a, H + 4, s * 1.1], [JUMP_X + 1.2, H + 1.25, s * 1.25], 0.07, '#3b4046'))
      for (let x = a; x <= JUMP_X + 1.8; x += 1.05) P.push(box(x, H, s * 1.25, 0.05, 1.15, 0.05, '#d9dcdf'))
      P.push(box((a + JUMP_X + 1.8) / 2, H + 1.12, s * 1.25, JUMP_X + 1.8 - a, 0.06, 0.06, '#d9dcdf'), box((a + JUMP_X + 1.8) / 2, H + 0.6, s * 1.25, JUMP_X + 1.8 - a, 0.04, 0.04, '#d9dcdf'))
    }
    // 塔顶的小屋和旗杆
    P.push(box(0, H + 0.02, 0, 4.4, 2.6, 4.4, '#f1eee4'), box(0, H + 2.6, 0, 5.2, 0.22, 5.2, R), box(0, H + 0.9, 2.21, 2.2, 1.1, 0.03, '#33526b'))
    S.push(cyl(0, H + 2.8, 0, 0.06, 5, '#d9dcdf')); P.push(box(0.75, H + 6.7, 0, 1.5, 0.95, 0.03, R))
    // 水池的池沿
    const rim = new THREE.TorusGeometry(8.2, 0.4, 10, 64); rim.rotateX(Math.PI / 2); rim.translate(JUMP_X, 0.3, 0)
    return { S: mergeParts(S), P: mergeParts(P), rim }
  }, [])
  return <group>
    <mesh geometry={g.S} castShadow receiveShadow><Painted rough={0.45} metal={0.4} /></mesh>
    <mesh geometry={g.P} castShadow receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
    <mesh geometry={g.rim} castShadow receiveShadow><meshStandardMaterial color="#d8d3c4" roughness={0.8} /></mesh>
    <mesh position={[JUMP_X, 0.05, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[8.2, 64]} /><meshStandardMaterial color="#1c5a72" roughness={0.9} /></mesh>
    <mesh position={[JUMP_X, 0.42, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[8.1, 64]} /><meshPhysicalMaterial color="#3fa3c2" roughness={0.08} transparent opacity={0.78} normalMap={ripple} normalScale={new THREE.Vector2(0.5, 0.5)} envMapIntensity={1.4} /></mesh>
  </group>
}

/** 测试假人：橙色连体服、白头盔、腰上和脚踝上的绑带。原点在两只脚踝中间，头朝 +y。身高约 1.75 m */
export function Dummy() {
  const suit = <meshStandardMaterial color="#e2702a" roughness={0.75} />, dark = <meshStandardMaterial color="#23272c" roughness={0.8} />
  return <group>
    {[-0.11, 0.11].map(z => <group key={z} position={[0, 0, z]}>
      <mesh position={[0, 0.25, 0]} castShadow><capsuleGeometry args={[0.07, 0.36, 6, 12]} />{suit}</mesh>
      <mesh position={[0, 0.68, 0]} castShadow><capsuleGeometry args={[0.085, 0.34, 6, 12]} />{suit}</mesh>
      <mesh position={[0.06, 0, 0]} rotation-z={Math.PI / 2} scale={[1, 1, 0.9]} castShadow><capsuleGeometry args={[0.05, 0.16, 6, 12]} /><meshStandardMaterial color="#1d1f22" roughness={0.7} /></mesh>
      <mesh position={[0, 0.06, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.085, 0.085, 0.07, 14]} />{dark}</mesh>
    </group>)}
    <mesh position={[0, 1.16, 0]} castShadow><capsuleGeometry args={[0.17, 0.36, 8, 16]} />{suit}</mesh>
    <mesh position={[0, 0.94, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.19, 0.19, 0.09, 20]} />{dark}</mesh>
    {[-1, 1].map(k => <group key={k}>
      <mesh position={[0, 1.2, k * 0.25]} rotation-x={k * 0.14} castShadow><capsuleGeometry args={[0.058, 0.52, 6, 12]} />{suit}</mesh>
      <mesh position={[0, 0.86, k * 0.29]} castShadow><sphereGeometry args={[0.065, 12, 10]} /><meshStandardMaterial color="#d8c9a8" roughness={0.9} /></mesh>
      <mesh position={[0, 1.26, k * 0.1]} rotation-z={0.04}><boxGeometry args={[0.36, 0.5, 0.04]} />{dark}</mesh>
    </group>)}
    <mesh position={[0, 1.6, 0]} castShadow><sphereGeometry args={[0.125, 20, 16]} /><meshStandardMaterial color="#f3efe6" roughness={0.35} /></mesh>
    <mesh position={[0.07, 1.58, 0]}><sphereGeometry args={[0.1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} /><meshStandardMaterial color="#1f2a33" roughness={0.2} /></mesh>
  </group>
}

/** 一根朝镜头的扁带（弹力绳）：points() 每帧给出一串点（世界坐标里的 x、y，z 不变） */
export function Rope({ points, n = 40, width = 0.16, color = '#f4f1e4' }: { points: (out: Float32Array) => void; n?: number; width?: number; color?: string }) {
  const { geo, line } = useMemo(() => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3))
    const idx: number[] = []; for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3)
    geo.setIndex(idx)
    return { geo, line: new Float32Array(n * 2) }
  }, [n])
  useFrame(() => {
    points(line); const a = geo.attributes.position.array as Float32Array
    for (let i = 0; i < n; i++) {
      const j = Math.min(n - 1, i + 1), k = Math.max(0, i - 1), dx = line[j * 2] - line[k * 2], dy = line[j * 2 + 1] - line[k * 2 + 1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * width / 2, ny = dx / l * width / 2
      a[i * 6] = line[i * 2] + nx; a[i * 6 + 1] = line[i * 2 + 1] + ny; a[i * 6 + 2] = 0; a[i * 6 + 3] = line[i * 2] - nx; a[i * 6 + 4] = line[i * 2 + 1] - ny; a[i * 6 + 5] = 0
    }
    geo.attributes.position.needsUpdate = true; geo.computeBoundingSphere()
  })
  return <mesh geometry={geo} frustumCulled={false}><meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} /></mesh>
}

// ---------- 摩天轮 ----------
export function FerrisWheel({ R = 24, cabins = 18 }: { R?: number; cabins?: number }) {
  const wheel = useRef<THREE.Group>(null), cab = useRef<(THREE.Group | null)[]>([])
  const g = useMemo(() => {
    const S: Part[] = [], L: Part[] = [], W = '#e9e5d8'
    for (const k of [-1, 1]) for (let i = 0; i < cabins * 2; i++) {
      const a = i / (cabins * 2) * Math.PI * 2, b = (i + 1) / (cabins * 2) * Math.PI * 2, z = k * 1.5
      S.push(rod([Math.cos(a) * R, Math.sin(a) * R, z], [Math.cos(b) * R, Math.sin(b) * R, z], 0.16, W), rod([Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72, z], [Math.cos(b) * R * 0.72, Math.sin(b) * R * 0.72, z], 0.08, W))
      if (i % 2 === 0) S.push(rod([0, 0, k * 0.8], [Math.cos(a) * R, Math.sin(a) * R, z], 0.07, W)); else S.push(rod([Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72, z], [Math.cos(b) * R, Math.sin(b) * R, z], 0.05, W))
    }
    for (let i = 0; i < cabins; i++) { const a = i / cabins * Math.PI * 2; S.push(rod([Math.cos(a) * R, Math.sin(a) * R, -1.5], [Math.cos(a) * R, Math.sin(a) * R, 1.5], 0.09, '#c8372d')) }
    S.push({ p: [0, 0, 0], s: [1.1, 3.2, 0], c: '#c8372d', cyl: true, r: [Math.PI / 2, 0, 0] })
    for (const k of [-1, 1]) for (const e of [-1, 1]) { L.push(rod([e * 10, -R - 3, k * 4.5], [0, 0, k * 1.9], 0.42, W), box(e * 10, -R - 3.4, k * 4.5, 2.4, 0.6, 2.4, '#a9a79f')) }
    L.push(box(0, -R - 3.4, 0, 14, 1.5, 7, '#8d9094'), box(0, -R - 1.9, 0, 15, 0.14, 7.6, '#c8372d'))
    return { S: mergeParts(S), L: mergeParts(L) }
  }, [R, cabins])
  const cabin = useMemo(() => { const b = new THREE.SphereGeometry(1, 16, 12); b.scale(1.15, 1.05, 1.0); b.translate(0, -1.9, 0); const h = new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6); h.translate(0, -0.55, 0); return fuse([tint(b, '#ffffff'), tint(h, '#9aa0a6')]) }, [])
  useFrame(({ clock }) => { const a = clock.elapsedTime * 0.05; if (wheel.current) wheel.current.rotation.z = a; cab.current.forEach(c => { if (c) c.rotation.z = -a }) })
  const colors = ['#c8372d', '#e8c04a', '#2f6f9f', '#3d8d6a', '#e2702a', '#f1eee4']
  return <group position={[0, R + 3.4, 0]}>
    <mesh geometry={g.L} castShadow receiveShadow><Painted rough={0.5} metal={0.3} /></mesh>
    <group ref={wheel}>
      <mesh geometry={g.S} castShadow><Painted rough={0.45} metal={0.4} /></mesh>
      {Array.from({ length: cabins }, (_, i) => { const a = i / cabins * Math.PI * 2; return <group key={i} ref={e => { cab.current[i] = e }} position={[Math.cos(a) * R, Math.sin(a) * R, 0]}><mesh geometry={cabin} castShadow><meshPhysicalMaterial vertexColors color={colors[i % colors.length]} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.2} /></mesh><mesh position={[0, -1.75, 0]} scale={[1.17, 0.42, 1.02]}><sphereGeometry args={[1, 16, 8]} /><meshPhysicalMaterial color="#1f2a33" roughness={0.1} metalness={0.3} /></mesh></group> })}
    </group>
  </group>
}

/** 一顶彩条尖顶帐篷（游艺摊位）：圆筒形的围布、尖顶、顶上一面小旗。r 是半径 */
export function Tent({ r = 3, h = 2.6, a = '#c8372d', b = '#f4efe2', children }: { r?: number; h?: number; a?: string; b?: string; children?: ReactNode }) {
  const g = useMemo(() => {
    const n = 16, top = new THREE.ConeGeometry(r * 1.12, r * 0.95, n, 4, true), p = top.attributes.position
    // 篷顶：每一幅布在两根撑杆之间微微下垂
    for (let i = 0; i < p.count; i++) { const ang = Math.atan2(p.getZ(i), p.getX(i)), sag = Math.abs(Math.sin(ang * n / 2)), rad = Math.hypot(p.getX(i), p.getZ(i)); p.setY(i, p.getY(i) - sag * 0.1 * rad / r) }
    top.translate(0, h + r * 0.475, 0); top.computeVertexNormals()
    const wall = new THREE.CylinderGeometry(r, r, h, n, 1, true, 0.5, Math.PI * 2 - 1); wall.translate(0, h / 2, 0)
    const val = new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.36, n, 1, true); val.translate(0, h - 0.1, 0)
    return { top, wall, val }
  }, [r, h])
  const stripes = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 8; const x = c.getContext('2d')!; for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * 16, 0, 16, 8) } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }, [a, b])
  return <group>
    <mesh geometry={g.top} castShadow><meshStandardMaterial map={stripes} roughness={0.8} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.val}><meshStandardMaterial map={stripes} roughness={0.8} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.wall} castShadow receiveShadow><meshStandardMaterial color={b} roughness={0.85} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, h + r * 0.95 + 0.5, 0]}><cylinderGeometry args={[0.03, 0.03, 1.1, 6]} /><meshStandardMaterial color="#d9dcdf" /></mesh>
    <mesh position={[0.3, h + r * 0.95 + 0.85, 0]}><boxGeometry args={[0.6, 0.36, 0.02]} /><meshStandardMaterial color={a} roughness={0.7} /></mesh>
    {children}
  </group>
}
