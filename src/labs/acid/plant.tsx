// 污水处理区：调节池、中和池（朝镜头剖开，池里一台立式搅拌机，池边一支在线 pH 计）、加药间（钢结构小厂房，前墙拿掉：
// 石灰乳罐、液碱罐、加药泵）、沉淀池（带刮泥桥）、排放渠、在线监测房和取样台；围墙外是化工园区（精馏塔、球罐、烟囱、管廊）。
// 尺寸在这里按画面单位写（1 m = 6 个单位）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBox } from '@react-three/drei'
import { Led, Metal, Painted, bolts, lathe, mergeParts, useRipple, type Part, type RY } from '@/lab-kit'
import { cutTex, facadeTex, makeSign, ribTex, rng, tankLabel, wallTex } from './mats'
import { mixHex } from './parts'

/** 中和池：内壁的 x、z 范围（前面 z1 是剖面），池壁高、水面高、墙厚 */
export const POND3 = { x0: 46, x1: 78, z0: -46, z1: -14, h: 27, water: 24, wall: 2.4, floor: 1.4 }
/** 加药间 */
export const DOSE_HOUSE = { x0: 86, x1: 118, z0: -50, z1: -20, eave: 21, ridge: 24 }
/** 石灰乳罐、加药管伸进池里的出口、在线 pH 计的显示屏 */
export const LIME_TANK = { x: 96, z: -38, r: 4.2, h: 11 }
export const OUTLET: [number, number, number] = [72, POND3.h + 1.2, -20]
export const PH_BOX: [number, number, number] = [POND3.x1 + POND3.wall / 2, POND3.h + 5.2, POND3.z1 - 2.8]
/** 第 6 课的取样台：台面中心 */
export const SAMPLE_T = { x: 168, z: 8 }

/** 第 7 课交给世界的中和池状态：搅拌机在不在转、石灰乳在不在流、石灰乳和池水混匀到几成、在线 pH 计显示什么 */
export interface PondWant { stir: boolean; dosing: boolean; mix: number; ph: string; milk: number }

/** 一块板，贴图按它在世界里的位置铺，k 是贴图一格多大 */
function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 6) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}
/** 池顶走道的栏杆：立柱每 1.5 m 一根，两道横杆，脚下一道黄色踢脚板。沿着 x 从 x0 到 x1，在 z、高 y */
function railX(P: Part[], x0: number, x1: number, y: number, z: number, c = '#e2b21c') {
  for (let x = x0; x <= x1 + 0.01; x += 9) P.push({ p: [x, y + 3.3, z], s: [0.22, 6.6, 0.22], c, cyl: true })
  for (const h of [3.4, 6.6]) P.push({ p: [(x0 + x1) / 2, y + h, z], s: [0.16, x1 - x0, 0.16], c, r: [0, 0, Math.PI / 2], cyl: true })
  P.push({ p: [(x0 + x1) / 2, y + 0.45, z], s: [x1 - x0, 0.9, 0.08], c })
}
function railZ(P: Part[], z0: number, z1: number, y: number, x: number, c = '#e2b21c') {
  for (let z = z0; z <= z1 + 0.01; z += 9) P.push({ p: [x, y + 3.3, z], s: [0.22, 6.6, 0.22], c, cyl: true })
  for (const h of [3.4, 6.6]) P.push({ p: [x, y + h, (z0 + z1) / 2], s: [0.16, z1 - z0, 0.16], c, r: [Math.PI / 2, 0, 0], cyl: true })
  P.push({ p: [x, y + 0.45, (z0 + z1) / 2], s: [0.08, 0.9, z1 - z0], c })
}
/** 一段管子加两头的法兰 */
function pipe(P: Part[], a: [number, number, number], b: [number, number, number], r: number, c = '#d9d6cc') {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q)
  P.push({ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: [r, len, r], c, r: [e.x, e.y, e.z], cyl: true })
  for (const t of [0.02, 0.98]) P.push({ p: [a[0] + d.x * t, a[1] + d.y * t, a[2] + d.z * t], s: [r * 1.4, 0.4, r * 1.4], c, r: [e.x, e.y, e.z], cyl: true })
}

// ---------- 中和池 ----------
/** 石灰乳流进池里散开：出口下方几团乳白的浑浊，随着搅拌往外、往下扩散，越散越淡。k 是混匀的进度 */
function MilkCloud({ k, fade }: { k: number; fade: number }) {
  const blobs = useMemo(() => { let s = 21; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; return Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * Math.PI * 2 + r(), d: 2 + r() * 9, y: 1 + r() * 12, s: 2.2 + r() * 2.4 })) }, [])
  return <group position={[OUTLET[0], POND3.water, OUTLET[2] - 1]}>
    {blobs.map((b, i) => { const q = Math.min(1, k * 1.2 + 0.08); return <mesh key={i} position={[Math.cos(b.a) * b.d * q, -b.y * q - 0.6, Math.sin(b.a) * b.d * q * 0.6]} scale={[1, 0.7, 1]} renderOrder={4}>
      <sphereGeometry args={[b.s * (0.5 + q), 16, 12]} /><meshBasicMaterial color="#e9ece6" transparent opacity={0.34 * fade * (1 - 0.5 * q)} depthWrite={false} />
    </mesh> })}
  </group>
}
function Pond({ pond }: { pond?: PondWant }) {
  const P = POND3, W = P.wall
  const wall = useMemo(() => { const t = wallTex().clone(); t.needsUpdate = true; return t }, [])
  const cut = useMemo(() => { const t = cutTex().clone(); t.repeat.set(0.6, 0.6); t.needsUpdate = true; return t }, [])
  const geo = useMemo(() => ({
    // 池壁、底板，池顶一圈压顶（往外挑出一点）
    walls: mergeGeometries([slab(P.x0 - W, P.x1 + W, -0.6, P.h, P.z0 - W, P.z0, 12), slab(P.x0 - W, P.x0, -0.6, P.h, P.z0, P.z1, 12), slab(P.x1, P.x1 + W, -0.6, P.h, P.z0, P.z1, 12), slab(P.x0 - W, P.x1 + W, -0.6, P.floor, P.z0, P.z1, 12),
      slab(P.x0 - W - 0.6, P.x0, P.h, P.h + 0.7, P.z0 - W, P.z1, 6), slab(P.x1, P.x1 + W + 0.6, P.h, P.h + 0.7, P.z0 - W, P.z1, 6), slab(P.x0, P.x1, P.h, P.h + 0.7, P.z0 - W - 0.6, P.z0, 6)]),
    // 剖面：两侧池壁、底板的切口（混凝土剖面，带斜线）
    cut: mergeGeometries([new THREE.PlaneGeometry(W + 0.6, P.h + 1.3).translate(P.x0 - (W + 0.6) / 2, (P.h + 0.7 - 0.6) / 2, P.z1 + 0.01), new THREE.PlaneGeometry(W + 0.6, P.h + 1.3).translate(P.x1 + (W + 0.6) / 2, (P.h + 0.7 - 0.6) / 2, P.z1 + 0.01), new THREE.PlaneGeometry(P.x1 - P.x0, P.floor + 0.6).translate((P.x0 + P.x1) / 2, (P.floor - 0.6) / 2, P.z1 + 0.01)]),
    // 剖面上的钢筋：一排排小圆点
    rebar: mergeGeometries([P.x0 - W + 0.5, P.x0 - 0.5, P.x1 + 0.5, P.x1 + W - 0.5].flatMap(x => Array.from({ length: 13 }, (_, i) => new THREE.CircleGeometry(0.16, 10).translate(x, 1.4 + i * 2, P.z1 + 0.03)))
      .concat(Array.from({ length: 16 }, (_, i) => [0.1, 0.9].map(y => new THREE.CircleGeometry(0.16, 10).translate(P.x0 + 1 + i * 2, y - 0.3 + 0.3, P.z1 + 0.03))).flat())),
    deck: (() => { const D: Part[] = []
      railX(D, P.x0 - W, P.x1 + W, P.h, P.z0 - W - 0.2); railZ(D, P.z0 - W, P.z1, P.h, P.x0 - W - 0.2); railZ(D, P.z0 - W, P.z1, P.h, P.x1 + W + 0.2)
      // 搅拌机的桥：两根工字钢从左墙跨到右墙，上面铺格栅板
      for (const s of [-1, 1]) D.push({ p: [(P.x0 + P.x1) / 2, P.h + 0.6, -30 + s * 1.6], s: [P.x1 - P.x0 + W * 2, 1.2, 0.5], c: '#3f6f8f' })
      D.push({ p: [(P.x0 + P.x1) / 2, P.h + 1.25, -30], s: [P.x1 - P.x0 + W * 2, 0.12, 3.8], c: '#8a9298' })
      railX(D, P.x0 - W, P.x1 + W, P.h + 1.3, -32.2, '#d6dadb'); railX(D, P.x0 - W, P.x1 + W, P.h + 1.3, -27.8, '#d6dadb')
      // 池壁上的爬梯
      for (let y = 2; y < P.h; y += 1.8) D.push({ p: [P.x1 + W + 0.9, y, P.z1 - 12], s: [0.12, 2.4, 0.12], c: '#c6cbce', r: [0, 0, Math.PI / 2], cyl: true })
      for (const s of [-1, 1]) D.push({ p: [P.x1 + W + 0.9, P.h / 2, P.z1 - 12 + s * 1.2], s: [0.18, P.h + 6, 0.18], c: '#c6cbce', cyl: true })
      return mergeParts(D) })(),
  }), [P, W])
  const ripple = useRipple([(P.x1 - P.x0) / 12, (P.z1 - P.z0) / 12], 0.012)
  // 池水的颜色：酸性废水是浑浊的灰绿；石灰乳刚流进去的地方发白，搅匀以后整池略带乳白
  const mix = pond?.mix ?? 0, milk = pond?.milk ?? 0
  const top = mixHex('#4d6a5c', '#a3afa4', milk * mix)
  const face = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256
    const g = c.getContext('2d')!, q = g.createLinearGradient(0, 0, 0, 256)
    q.addColorStop(0, top); q.addColorStop(0.55, mixHex(top, '#3e4f47', 0.5)); q.addColorStop(1, '#2f3b35')
    g.fillStyle = q; g.fillRect(0, 0, 128, 256)
    // 水里悬浮的细小颗粒：一层浑浊的斑点，越往下越密
    let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 900; i++) { const y = Math.sqrt(r()) * 256; g.fillStyle = `rgba(${r() < 0.6 ? '200,210,196' : '60,72,64'},${0.05 + r() * 0.12})`; g.fillRect(r() * 128, y, 1 + r() * 2, 1 + r() * 2) }
    g.fillStyle = 'rgba(235,248,250,0.95)'; g.fillRect(0, 0, 128, 3); g.fillStyle = 'rgba(235,248,250,0.35)'; g.fillRect(0, 3, 128, 5)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [top])
  const imp = useRef<THREE.Group>(null)
  useFrame((_, d) => { if (imp.current && pond?.stir) imp.current.rotation.y += Math.min(d, 1 / 30) * 2.4 })
  // 石灰乳刚流进池里：出口下方一团发白的水，随着混匀慢慢散开、变淡
  const plume = pond?.dosing || (mix > 0 && mix < 1) ? 1 - mix : 0
  return <group>
    <mesh geometry={geo.walls} castShadow receiveShadow><meshStandardMaterial map={wall} roughness={0.9} /></mesh>
    <mesh geometry={geo.cut}><meshStandardMaterial map={cut} roughness={0.95} /></mesh>
    <mesh geometry={geo.rebar}><meshStandardMaterial color="#4a3a30" roughness={0.7} /></mesh>
    <mesh geometry={geo.deck} castShadow receiveShadow><Painted rough={0.55} metal={0.3} /></mesh>
    {/* 池水：水体、朝镜头的剖面、带波纹的水面 */}
    <mesh position={[(P.x0 + P.x1) / 2, (P.floor + P.water) / 2, (P.z0 + P.z1) / 2]} renderOrder={2}><boxGeometry args={[P.x1 - P.x0, P.water - P.floor, P.z1 - P.z0]} /><meshBasicMaterial color={new THREE.Color(top).multiplyScalar(0.45)} transparent opacity={0.3} depthWrite={false} /></mesh>
    <mesh position={[(P.x0 + P.x1) / 2, (P.floor + P.water) / 2, P.z1 + 0.02]} renderOrder={3}><planeGeometry args={[P.x1 - P.x0, P.water - P.floor]} /><meshBasicMaterial map={face} transparent opacity={0.62} depthWrite={false} toneMapped={false} /></mesh>
    <mesh position={[(P.x0 + P.x1) / 2, P.water, (P.z0 + P.z1) / 2]} rotation-x={-Math.PI / 2} renderOrder={3}><planeGeometry args={[P.x1 - P.x0, P.z1 - P.z0]} /><meshPhysicalMaterial color={top} transparent opacity={0.86} roughness={0.08} normalMap={ripple} normalScale={new THREE.Vector2(pond?.stir ? 0.7 : 0.3, pond?.stir ? 0.7 : 0.3)} clearcoat={1} envMapIntensity={1.2} depthWrite={false} /></mesh>
    {plume > 0.02 && <MilkCloud k={mix} fade={plume} />}
    {/* 立式搅拌机：桥上一台电机和减速箱，一根长轴伸到池底，轴下端两层四叶桨 */}
    <group position={[(P.x0 + P.x1) / 2, 0, -30]}>
      <RoundedBox args={[3.4, 2.4, 3.4]} radius={0.3} position-y={P.h + 2.6} castShadow><meshPhysicalMaterial color="#2f6f9a" roughness={0.4} clearcoat={0.5} /></RoundedBox>
      <mesh position-y={P.h + 5.2} castShadow><cylinderGeometry args={[1.25, 1.25, 3, 24]} /><meshPhysicalMaterial color="#2f6f9a" roughness={0.4} clearcoat={0.5} /></mesh>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[Math.cos(i / 12 * 6.283) * 1.3, P.h + 5.2, Math.sin(i / 12 * 6.283) * 1.3]} rotation-y={-i / 12 * 6.283}><boxGeometry args={[0.12, 2.6, 0.3]} /><meshStandardMaterial color="#285f84" roughness={0.5} /></mesh>)}
      <mesh position-y={P.h + 6.9}><cylinderGeometry args={[1.1, 1.25, 0.4, 24]} /><meshStandardMaterial color="#1f2326" roughness={0.6} /></mesh>
      <group ref={imp}>
        <mesh position-y={(P.h + 1.4 + 3) / 2}><cylinderGeometry args={[0.28, 0.28, P.h + 1.4 - 3, 16]} /><Metal kind="stainless" grain="turned" /></mesh>
        {[4, 13].map(y => <group key={y} position-y={y}>
          <mesh><cylinderGeometry args={[0.7, 0.7, 0.8, 16]} /><Metal kind="stainless" /></mesh>
          {[0, 1, 2, 3].map(i => <mesh key={i} rotation-y={i * Math.PI / 2} position={[Math.cos(i * Math.PI / 2) * 3, 0, -Math.sin(i * Math.PI / 2) * 3]}><boxGeometry args={[4.6, 0.12, 1.4]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
        </group>)}
      </group>
    </group>
    {/* 在线 pH 计：池边一根立柱，顶上一只带遮阳罩的变送器和显示屏；一根护管把电极伸进水里 */}
    <group position={[PH_BOX[0], P.h, PH_BOX[2] - 1.2]}>
      <mesh position-y={2.3}><cylinderGeometry args={[0.22, 0.22, 4.6, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
      <RoundedBox args={[3.2, 2.5, 1.3]} radius={0.18} position={[0, 5.2, 0.6]} castShadow><meshPhysicalMaterial color="#e8eae6" roughness={0.4} clearcoat={0.4} /></RoundedBox>
      <mesh position={[0, 6.8, 0.9]} rotation-x={0.3}><boxGeometry args={[3.8, 0.12, 2.2]} /><Metal kind="stainless" grain="brushed" /></mesh>
      <Led text={pond?.ph ?? '2.0'} w={2.4} h={1.0} position={[0, 5.4, 1.27]} />
      <mesh position={[0, 4.3, 1.27]}><planeGeometry args={[2.4, 0.3]} /><meshBasicMaterial color="#2f8f6b" /></mesh>
      {/* 护管从池顶弯下去 */}
      <mesh position={[-1.6, 0.4, 0.2]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.22, 0.22, 3.2, 12]} /><meshStandardMaterial color="#9aa0a3" roughness={0.5} /></mesh>
      <mesh position={[-3.2, -P.h / 2 + 4, 0.2]}><cylinderGeometry args={[0.24, 0.24, P.h - 8, 12]} /><meshStandardMaterial color="#9aa0a3" roughness={0.5} /></mesh>
      <mesh position={[-3.2, -P.h + 7.6, 0.2]}><cylinderGeometry args={[0.18, 0.18, 0.8, 12]} /><meshStandardMaterial color="#1b1d20" roughness={0.5} /></mesh>
    </group>
  </group>
}

// ---------- 加药间 ----------
function DoseHouse({ pond }: { pond?: PondWant }) {
  const D = DOSE_HOUSE, L = LIME_TANK
  const tex = useMemo(() => {
    const wall = ribTex([214, 218, 214]).clone(); wall.repeat.set(4, 1.6); wall.needsUpdate = true
    const roof = ribTex([70, 112, 150]).clone(); roof.repeat.set(4, 2); roof.needsUpdate = true
    return { wall, roof, lime: tankLabel('石灰乳', 'Ca(OH)₂'), naoh: tankLabel('液碱', 'NaOH'), sign: makeSign(['加药间'], '#2a6f9e', '#ffffff', 512, 128) }
  }, [])
  const geo = useMemo(() => {
    const P: Part[] = []
    // 门式钢架：四榀，前后两根柱、一道斜梁
    for (const x of [D.x0, (D.x0 * 2 + D.x1) / 3, (D.x0 + D.x1 * 2) / 3, D.x1]) for (const z of [D.z0, D.z1]) P.push({ p: [x, D.eave / 2, z], s: [0.7, D.eave, 0.9], c: '#5a6d7c' })
    for (const x of [D.x0, D.x1]) P.push({ p: [x, D.eave + 0.2, (D.z0 + D.z1) / 2], s: [0.7, 0.9, D.z1 - D.z0 + 0.6], c: '#5a6d7c' })
    // 地坪抬高一阶，前沿一道黄线
    P.push({ p: [(D.x0 + D.x1) / 2, 0.25, (D.z0 + D.z1) / 2], s: [D.x1 - D.x0 + 1, 0.5, D.z1 - D.z0 + 1], c: '#9ea3a0' })
    P.push({ p: [(D.x0 + D.x1) / 2, 0.52, D.z1 + 0.2], s: [D.x1 - D.x0, 0.04, 0.4], c: '#e2b21c' })
    // 石灰乳罐的四条支腿、加药泵的底座、熟石灰袋子的托盘
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) P.push({ p: [L.x + a * L.r * 0.7, 1.5, L.z + b * L.r * 0.7], s: [0.5, 3, 0.5], c: '#5a6d7c' })
    P.push({ p: [101, 0.9, -25], s: [5, 0.8, 2.6], c: '#3d4146' })
    P.push({ p: [112, 0.8, -25], s: [5.6, 0.6, 4], c: '#a07c4f' })
    const r = rng(9); for (let i = 0; i < 9; i++) P.push({ p: [110 + (i % 3) * 1.8 + (r() - 0.5) * 0.2, 1.5 + Math.floor(i / 3) * 0.9, -26.2 + (i % 2) * 0.4], s: [1.7, 0.85, 3.4], c: r() < 0.5 ? '#ecebe3' : '#e2e0d6' })
    // 加药管：石灰乳罐底 → 泵 → 出门 → 架在池壁上 → 伸到池中
    const pc = '#e9e7df'
    pipe(P, [L.x, 2.4, L.z + L.r * 0.3], [L.x, 1.5, -25], 0.36, pc)
    pipe(P, [L.x, 1.5, -25], [99, 1.5, -25], 0.36, pc)
    pipe(P, [103.5, 1.5, -25], [103.5, 1.5, -16], 0.36, pc)
    pipe(P, [103.5, 1.5, -16], [103.5, POND3.h + 1.2, -16], 0.36, pc)
    pipe(P, [103.5, POND3.h + 1.2, -16], [POND3.x1 + POND3.wall, POND3.h + 1.2, -16], 0.36, pc)
    pipe(P, [POND3.x1 + POND3.wall, POND3.h + 1.2, -16], [OUTLET[0], OUTLET[1], -16], 0.36, pc)
    pipe(P, [OUTLET[0], OUTLET[1], -16], [OUTLET[0], OUTLET[1], OUTLET[2]], 0.36, pc)
    for (let x = 84; x <= 100; x += 8) P.push({ p: [x, (POND3.h + 1.2) / 2, -16], s: [0.4, POND3.h + 1.2, 0.4], c: '#5a6d7c' })
    // 液碱罐的鞍座
    P.push({ p: [110, 0.9, -40], s: [7.5, 1.4, 1.2], c: '#5a6d7c' })
    return { frame: mergeParts(P),
      back: slab(D.x0, D.x1, 0, D.eave, D.z0 - 0.3, D.z0, 6), sides: mergeGeometries([slab(D.x0 - 0.3, D.x0, 0, D.eave, D.z0, D.z1, 6), slab(D.x1, D.x1 + 0.3, 0, D.eave, D.z0, D.z1, 6)]),
      roof: (() => { const s = new THREE.Shape(); s.moveTo(D.z0 - 1, D.eave); s.lineTo((D.z0 + D.z1) / 2, D.ridge); s.lineTo(D.z1 + 1, D.eave); s.lineTo(D.z1 + 1, D.eave + 0.35); s.lineTo((D.z0 + D.z1) / 2, D.ridge + 0.35); s.lineTo(D.z0 - 1, D.eave + 0.35); s.closePath()
        const g = new THREE.ExtrudeGeometry(s, { depth: D.x1 - D.x0 + 2, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(D.x1 + 1, 0, 0)
        const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 8, p.getZ(i) / 8); return g })(),
      gable: (() => { const s = new THREE.Shape(); s.moveTo(D.z0, D.eave); s.lineTo((D.z0 + D.z1) / 2, D.ridge); s.lineTo(D.z1, D.eave); s.closePath(); const g = new THREE.ShapeGeometry(s); g.rotateY(-Math.PI / 2); return mergeGeometries([g.clone().translate(D.x0 - 0.15, 0, 0), g.clone().translate(D.x1 + 0.15, 0, 0)]) })(),
      limeTank: lathe([[0, 3], [L.r - 0.3, 3], [L.r, 3.4], [L.r, 3 + L.h], [L.r - 0.2, 3.2 + L.h], [0, 3.2 + L.h]] as RY[], { segs: 48 }),
      naoh: (() => { const g = lathe([[0, -6], [2.6, -5.6], [3.2, -4.6], [3.3, 4.6], [2.6, 5.6], [0, 6]] as RY[], { segs: 40, crease: 50 }); g.rotateZ(Math.PI / 2); g.translate(110, 4.9, -40); return g })(),
      flange: bolts(16, L.r - 0.6, 0.3),
    }
  }, [D, L])
  const mixer = useRef<THREE.Group>(null)
  useFrame((_, d) => { if (mixer.current) mixer.current.rotation.y += Math.min(d, 1 / 30) * 1.2 })
  return <group>
    <mesh geometry={geo.frame} castShadow receiveShadow><Painted rough={0.6} metal={0.2} /></mesh>
    <mesh geometry={geo.back} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.6} metalness={0.2} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={geo.sides} receiveShadow castShadow><meshStandardMaterial map={tex.wall} roughness={0.6} metalness={0.2} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={geo.gable}><meshStandardMaterial map={tex.wall} roughness={0.6} metalness={0.2} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={geo.roof} castShadow><meshStandardMaterial map={tex.roof} roughness={0.5} metalness={0.3} side={THREE.DoubleSide} /></mesh>
    <mesh position={[(D.x0 + D.x1) / 2, D.eave - 1.6, D.z1 + 0.5]}><planeGeometry args={[9, 2.2]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
    {/* 石灰乳罐：不锈钢罐身，顶盖一圈螺栓，罐顶一台搅拌电机；罐身贴着标识 */}
    <group position={[L.x, 0, L.z]}>
      <mesh geometry={geo.limeTank} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.4} env={0.6} /></mesh>
      <mesh position-y={3.2 + L.h} geometry={geo.flange}><Metal kind="steel" /></mesh>
      <mesh position={[0, 3 + L.h * 0.55, 0]} rotation-y={0.4}><cylinderGeometry args={[L.r + 0.03, L.r + 0.03, 3, 40, 1, true, -0.55, 1.1]} /><meshStandardMaterial map={tex.lime} roughness={0.6} side={THREE.DoubleSide} /></mesh>
      <group ref={mixer} position-y={3.2 + L.h}>
        <mesh position-y={1.2} castShadow><cylinderGeometry args={[0.9, 0.9, 2.2, 20]} /><meshPhysicalMaterial color="#2f6f9a" roughness={0.4} clearcoat={0.5} /></mesh>
        <mesh position-y={2.5}><cylinderGeometry args={[0.8, 0.9, 0.4, 20]} /><meshStandardMaterial color="#1f2326" roughness={0.6} /></mesh>
      </group>
    </group>
    {/* 液碱罐：卧式玻璃钢罐，罐身贴着标识 */}
    <mesh geometry={geo.naoh} castShadow receiveShadow><meshPhysicalMaterial color="#cfd6cf" roughness={0.45} clearcoat={0.4} /></mesh>
    <mesh position={[110, 4.9, -36.62]}><planeGeometry args={[5, 2.5]} /><meshStandardMaterial map={tex.naoh} roughness={0.6} /></mesh>
    {/* 加药泵：电机加泵头 */}
    <group position={[101, 1.3, -25]}>
      <mesh position={[-0.8, 0.9, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.8, 0.8, 2.4, 20]} /><meshPhysicalMaterial color="#2f6f9a" roughness={0.4} clearcoat={0.5} /></mesh>
      <RoundedBox args={[1.6, 1.6, 1.6]} radius={0.2} position={[1.2, 0.9, 0]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <mesh position={[1.2, 2.3, 0]}><sphereGeometry args={[0.3, 12, 10]} /><meshBasicMaterial color={pond?.dosing ? '#5cff8a' : '#2a3a2f'} toneMapped={!pond?.dosing} /></mesh>
    </group>
  </group>
}

// ---------- 调节池、沉淀池、排放口、监测房、取样台 ----------
function Others() {
  const wall = useMemo(() => { const t = wallTex().clone(); t.needsUpdate = true; return t }, [])
  const ripple = useRipple([6, 6], 0.01)
  const geo = useMemo(() => {
    const P: Part[] = []
    railX(P, 4, 40, 9, -10); railX(P, 124, 166, 6, -12)
    // 沉淀池的刮泥桥：一道横跨的钢桁架
    P.push({ p: [140, 7.6, -31], s: [1.6, 1.4, 42], c: '#3f6f8f' }, { p: [140, 9, -31], s: [2.4, 0.15, 42], c: '#8a9298' })
    railZ(P, -52, -10, 9.1, 139, '#d6dadb'); railZ(P, -52, -10, 9.1, 141, '#d6dadb')
    // 排放渠：一道矮墙夹着的明渠，渠头一块巴歇尔槽的收缩段
    P.push({ p: [174, 1.2, -3], s: [44, 2.4, 0.8], c: '#a9a79f' }, { p: [174, 1.2, 3], s: [44, 2.4, 0.8], c: '#a9a79f' })
    // 取样台：不锈钢台面，四条腿，下面一层搁板；旁边一只废液桶
    const T = SAMPLE_T, h = 0.85 * 6
    for (const a of [-1, 1]) for (const b of [-1, 1]) P.push({ p: [T.x + a * 3.4, h / 2, T.z + b * 1.6], s: [0.25, h, 0.25], c: '#c9cdcf' })
    P.push({ p: [T.x, 1.2, T.z], s: [7, 0.12, 3.4], c: '#b9bdbf' })
    P.push({ p: [T.x + 5, 1.3, T.z - 0.4], s: [1.3, 2.6, 1.3], c: '#2f6f9a', cyl: true })
    // 监测房：一间带空调外机的小房子
    P.push({ p: [186, 5, -16], s: [12, 10, 8], c: '#e4e2da' }, { p: [186, 10.2, -16], s: [12.8, 0.5, 8.8], c: '#8d9295' })
    P.push({ p: [183, 3.4, -11.95], s: [2.2, 6.8, 0.1], c: '#5a6d7c' }, { p: [189, 6, -11.95], s: [3, 2, 0.1], c: '#3e4852' })
    P.push({ p: [193, 2.2, -14], s: [1.4, 1.6, 2.6], c: '#d6d8d4' })
    return { rails: mergeParts(P),
      tanks: mergeGeometries([
        slab(2, 4, 0, 9, -50, -10, 12), slab(40, 42, 0, 9, -50, -10, 12), slab(2, 42, 0, 9, -52, -50, 12), slab(2, 42, 0, 9, -10, -8, 12),
        slab(122, 124, 0, 6, -54, -10, 12), slab(166, 168, 0, 6, -54, -10, 12), slab(122, 168, 0, 6, -56, -54, 12), slab(122, 168, 0, 6, -10, -8, 12),
      ]),
    }
  }, [])
  const sign = useMemo(() => makeSign(['在线监测站', '出水 pH、COD、氨氮'], '#2f8f6b', '#ffffff', 512, 160), [])
  const tableTop = useMemo(() => slab(SAMPLE_T.x - 3.7, SAMPLE_T.x + 3.7, 0.85 * 6 - 0.15, 0.85 * 6, SAMPLE_T.z - 1.9, SAMPLE_T.z + 1.9, 3), [])
  return <group>
    <mesh geometry={geo.tanks} castShadow receiveShadow><meshStandardMaterial map={wall} roughness={0.9} /></mesh>
    <mesh geometry={geo.rails} castShadow receiveShadow><Painted rough={0.55} metal={0.3} /></mesh>
    {[[22, 7.6, -30, 36, 40, '#6f8d84'], [145, 5, -32, 42, 44, '#5f7f86']].map(([x, y, z, w, d, c], i) => <mesh key={i} position={[x as number, y as number, z as number]} rotation-x={-Math.PI / 2} renderOrder={3}><planeGeometry args={[w as number, d as number]} /><meshPhysicalMaterial color={c as string} roughness={0.08} normalMap={ripple} normalScale={new THREE.Vector2(0.3, 0.3)} clearcoat={1} envMapIntensity={1.3} /></mesh>)}
    <mesh position={[174, 1.0, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[44, 5.2]} /><meshPhysicalMaterial color="#6e8d8e" roughness={0.06} normalMap={ripple} normalScale={new THREE.Vector2(0.5, 0.5)} clearcoat={1} envMapIntensity={1.4} /></mesh>
    <mesh geometry={tableTop} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.35} env={0.7} /></mesh>
    <mesh position={[186, 8.2, -11.9]}><planeGeometry args={[7, 2.2]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
  </group>
}

// ---------- 围墙外的化工园区 ----------
function Park() {
  const geo = useMemo(() => {
    const P: Part[] = [], r = rng(77)
    // 围墙和墙外的一排树
    for (let x = -250; x <= 300; x += 12) P.push({ p: [x, 4, -150], s: [1, 8, 1], c: '#b9b4a8' })
    P.push({ p: [25, 3.5, -150], s: [550, 7, 0.5], c: '#cfcabe' })
    const crowns: THREE.BufferGeometry[] = [], cc = new THREE.Color()
    for (let i = 0; i < 60; i++) { const x = -240 + i * 9 + r() * 4, z = -160 - r() * 8, h = 6 + r() * 4; P.push({ p: [x, h / 2, z], s: [0.6, h, 0.6], c: '#4e3d2c', cyl: true })
      for (let k = 0; k < 3; k++) { const g = new THREE.IcosahedronGeometry(2.6 + r() * 1.6, 1); g.scale(1, 0.85, 1); g.translate(x + (r() - 0.5) * 3, h + 1.5 + k * 1.8, z + (r() - 0.5) * 3); cc.setHSL(0.26 + r() * 0.05, 0.38, 0.15 + k * 0.03 + r() * 0.04); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let j = 0; j < n; j++) { a[j * 3] = cc.r; a[j * 3 + 1] = cc.g; a[j * 3 + 2] = cc.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); crowns.push(g.index ? g.toNonIndexed() : g) } }
    // 精馏塔：一组高高低低的塔，塔身几道平台，旁边一根爬梯
    for (let i = 0; i < 9; i++) { const x = -120 + i * 34 + r() * 10, z = -230 - r() * 50, rr = 2 + r() * 2.6, h = 40 + r() * 50
      P.push({ p: [x, h / 2, z], s: [rr, h, rr], c: r() < 0.5 ? '#c9cbc8' : '#b9bcb9', cyl: true })
      for (let y = 12; y < h; y += 14) P.push({ p: [x, y, z], s: [rr + 1.4, 0.5, rr + 1.4], c: '#c9a12e', cyl: true })
      P.push({ p: [x, h + 2, z], s: [rr * 0.6, 4, rr * 0.6], c: '#9a9d9a', cyl: true }) }
    // 管廊：一条长长的钢架，上面几根管子
    for (let x = -160; x <= 260; x += 14) P.push({ p: [x, 6, -196], s: [0.7, 12, 0.7], c: '#5a6d7c' }, { p: [x, 12, -196], s: [0.6, 0.8, 9], c: '#5a6d7c' })
    for (const [z, c] of [[-199, '#d9d6cc'], [-197, '#c23a2a'], [-195, '#2f6fb3'], [-193, '#d9d6cc']] as [number, string][]) P.push({ p: [50, 13, z], s: [0.9, 420, 0.9], c, r: [0, 0, Math.PI / 2], cyl: true })
    // 烟囱：红白相间
    for (const [x, z, h] of [[150, -280, 110], [-70, -300, 90]]) for (let k = 0; k < 10; k++) P.push({ p: [x, h / 20 + k * h / 10, z], s: [4 - k * 0.15, h / 10, 4 - k * 0.15], c: k % 2 ? '#c8372d' : '#ecebe5', cyl: true })
    // 立式储罐
    for (let i = 0; i < 6; i++) { const x = 40 + i * 22, z = -250 - (i % 2) * 22, rr = 8, h = 14 + r() * 6; P.push({ p: [x, h / 2, z], s: [rr, h, rr], c: '#e7e6e0', cyl: true }, { p: [x, h + 0.6, z], s: [rr * 0.98, 1.2, rr * 0.98], c: '#cfcfc8', cyl: true }) }
    return { parts: mergeParts(P), crowns: mergeGeometries(crowns),
      spheres: mergeGeometries([[-20, -255], [6, -262], [-46, -262]].map(([x, z]) => { const g = new THREE.SphereGeometry(10, 32, 20); g.translate(x, 14, z); return g })),
      legs: mergeGeometries([[-20, -255], [6, -262], [-46, -262]].flatMap(([x, z]) => Array.from({ length: 8 }, (_, k) => { const g = new THREE.CylinderGeometry(0.5, 0.5, 14, 8); g.translate(x + Math.cos(k / 8 * 6.283) * 9.4, 7, z + Math.sin(k / 8 * 6.283) * 9.4); return g }))),
      city: mergeGeometries(Array.from({ length: 18 }, (_, i) => { const w = 40 + r() * 30, h = 20 + r() * 34, x = -420 + i * 60, z = -620 - r() * 160; return slab(x - w / 2, x + w / 2, 0, h, z - 18, z + 18, 56) })),
    }
  }, [])
  return <group>
    <mesh geometry={geo.parts} castShadow receiveShadow><Painted rough={0.7} metal={0.2} /></mesh>
    <mesh geometry={geo.crowns} castShadow><meshStandardMaterial vertexColors roughness={0.95} flatShading /></mesh>
    <mesh geometry={geo.spheres} castShadow><meshPhysicalMaterial color="#eceae4" roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh geometry={geo.legs}><meshStandardMaterial color="#5a6d7c" roughness={0.6} /></mesh>
    <mesh geometry={geo.city}><meshStandardMaterial map={facadeTex()} roughness={0.8} /></mesh>
  </group>
}

export function Plant({ pond }: { pond?: PondWant }) {
  return <group>
    <Pond pond={pond} />
    <DoseHouse pond={pond} />
    <Others />
    <Park />
  </group>
}
