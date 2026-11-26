// 河谷小镇（示意）：两山之间的一段河谷，左边一座水库，右边是镇子，一条街，几栋楼，一座地震台的小房子。单位 1 = 4 m。
// 朝镜头的一面剖开，看得见表土、河流冲下来的砂砾层和下面的基岩。第 3 课地震波从下面传上来：
// 剖面上一道蓝色的纵波、一道橙色的横波往上走，剖面上的小点跟着上下或左右动；横波到水库底就没有了。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeGround, useRipple } from '@/lab-kit'
import { BUILDINGS, natPeriod, response, ZETA, ZETA_DAMPED } from './physics'
import { Building, makeSway, type Sway } from './building'
import { fbm, smooth } from './terrain'
import { useJob } from './job'

/** 小镇在世界里的位置（沙盘东边很远处） */
export const TOWN = new THREE.Vector3(3200, 0, 0)
const BX0 = -110, BX1 = 110, BZ0 = -95, BZ1 = 22, BOT = -30
/** 水库：x 范围、水面、库底 */
export const LAKE = { x0: -100, x1: -40, z0: -26, z1: 30, water: -0.8, bed: -5 }
/** 几样东西的位置（小镇里的坐标） */
export const SPOTS = {
  house: [-27, 0, 12] as [number, number, number],
  boat: [-49, LAKE.water, 12] as [number, number, number],
  hut: [-18, 0, 15] as [number, number, number],
  school: [-6, 0, -17] as [number, number, number],
  low: [24, 0, -13] as [number, number, number],
  mid: [38, 0, -13] as [number, number, number],
  high: [53, 0, -13] as [number, number, number],
}

/** 地面高度（小镇里的坐标，单位 4 m） */
export function townH(x: number, z: number) {
  let h = 0.04 * (fbm(x * 0.2, z * 0.2, 2) - 0.5)
  // 身后的山坡、两头的山脚
  const back = smooth((-44 - z) / 48), side = smooth((Math.abs(x) - 86) / 26)
  h += back * (64 + 18 * (fbm(x * 0.03, z * 0.04, 4) - 0.5)) + 7 * back * fbm(x * 0.12, z * 0.12, 3)
  h += side * (26 + 10 * fbm(x * 0.05 + 3, z * 0.05, 3))
  // 河：沿镜头横着流，在 z ≈ −34
  const dr = Math.abs(z + 34 + 3 * Math.sin(x * 0.03)), river = 1 - smooth((dr - 4) / 3)
  h = h * (1 - river) + -2.4 * river
  // 水库：一个碗形的库盆
  if (x > LAKE.x0 - 8 && x < LAKE.x1 + 8 && z > LAKE.z0 - 8) {
    const ex = Math.min(x - LAKE.x0, LAKE.x1 - x), ez = z - LAKE.z0, e = Math.min(ex, ez)
    const k = smooth(e / 8)
    h = h * (1 - k) + LAKE.bed * k
  }
  return h
}

// ---------- 地块：地面网格、四个切面、底座 ----------
interface Ground { geo: THREE.BufferGeometry }
function* groundGen(): Generator<void, Ground> {
  const NX = 220, NZ = 117, W = NX + 1, n = W * (NZ + 1), dx = (BX1 - BX0) / NX, dz = (BZ1 - BZ0) / NZ
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color(), t = new THREE.Color()
  for (let j = 0; j <= NZ; j++) {
    for (let i = 0; i <= NX; i++) { const k = j * W + i, x = BX0 + i * dx, z = BZ0 + j * dz; pos.set([x, townH(x, z), z], k * 3) }
    if (j % 20 === 0) yield
  }
  const idx: number[] = []
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * W + i, b = a + 1, cc = a + W, d = cc + 1; idx.push(a, cc, b, b, cc, d) }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals()
  yield
  const nrm = geo.attributes.normal as THREE.BufferAttribute
  for (let k = 0; k < n; k++) {
    const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2], n1 = fbm(x * 0.15, z * 0.15, 3), steep = smooth((0.8 - nrm.getY(k)) / 0.2)
    c.set('#6f8547').lerp(t.set('#87914f'), n1)                                   // 草地
    c.lerp(t.set('#2c4527').lerp(t.clone().set('#3f5a30'), n1), smooth((y - 2) / 5))  // 山坡上的林子
    c.lerp(t.set('#6c6658'), steep * 0.7)                                          // 陡处露出岩石
    if (y < -0.5) c.lerp(t.set('#8c8170'), smooth((-0.5 - y) / 1))                 // 河滩、库岸的砂石
    col.set([c.r, c.g, c.b], k * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return { geo }
}

/** 剖面的岩层贴图：表土、砂砾层、基岩；v 从底面（BOT）往上 */
function useStrata() {
  return useMemo(() => {
    const Wd = 1024, Hd = 512, c = document.createElement('canvas'); c.width = Wd; c.height = Hd
    const g = c.getContext('2d')!, yOf = (y: number) => Hd - ((y - BOT) / (8 - BOT)) * Hd
    let s = 29; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    g.fillStyle = '#6b6862'; g.fillRect(0, 0, Wd, Hd)
    // 基岩：一层层倾斜的砂岩、页岩
    for (let i = 0; i < 26; i++) { const y = yOf(-12 - i * 1.3); g.fillStyle = ['#6f6b64', '#76716a', '#64605b', '#7b746a'][i % 4]; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= Wd; x += 32) g.lineTo(x, y + x * 0.035 + Math.sin(x * 0.01 + i) * 4); g.lineTo(Wd, Hd); g.lineTo(0, Hd); g.fill() }
    // 砂砾层
    g.fillStyle = '#9c8a6c'; g.beginPath(); g.moveTo(0, yOf(-12)); for (let x = 0; x <= Wd; x += 32) g.lineTo(x, yOf(-12) + Math.sin(x * 0.02) * 5); g.lineTo(Wd, 0); g.lineTo(0, 0); g.fill()
    for (let i = 0; i < 2600; i++) { const x = rnd() * Wd, y = yOf(-1.6) + rnd() * (yOf(-12) - yOf(-1.6)), r = 1.5 + rnd() * rnd() * 7; g.fillStyle = `rgba(${rnd() > 0.5 ? '200,188,165' : '92,80,66'},${0.35 + rnd() * 0.4})`; g.beginPath(); g.ellipse(x, y, r * 1.3, r, rnd() * 3, 0, Math.PI * 2); g.fill() }
    // 表土
    g.fillStyle = '#5a4634'; g.fillRect(0, 0, Wd, yOf(-1.4))
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(30,20,12,${0.2 + rnd() * 0.3})`; g.fillRect(rnd() * Wd, rnd() * yOf(-1.4), 1 + rnd() * 2, 1 + rnd() * 2) }
    for (let i = 0; i < 6000; i++) { const y = yOf(-12) + rnd() * (Hd - yOf(-12)); g.fillStyle = `rgba(${rnd() > 0.5 ? '215,210,200' : '40,38,36'},${0.12 + rnd() * 0.2})`; g.fillRect(rnd() * Wd, y, 1 + rnd() * 2, 1) }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 8
    return tx
  }, [])
}
/** 一面切面：沿边的一串 [水平坐标, 地面高度]，到底面 */
function wall(pts: [number, number][], span: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  pts.forEach(([u, h], i) => { pos.push(u, h, 0, u, BOT, 0); uv.push(u / span, (h - BOT) / (8 - BOT), u / span, 0); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3) } })
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g
}

// ---------- 剖面上的地震波（第 3 课） ----------
export interface TownQuake { t: number; tP: number; tS: number }
/** 波前从剖面底部升到地面要多少秒（画面放慢后的示意）：纵波快、横波慢，比例照 6.0 : 3.5 */
export const RISE_P = 2.2, RISE_S = 2.2 * 6 / 3.5
export const bandY = (t: number, tArr: number, rise: number) => (t - tArr) / rise * (0 - BOT)   // 到地面时为 0；之前是负的
/** 一个脉冲：波前经过时动一下，后面拖几下 */
const pulse = (u: number) => (u < 0 || u > 3.2 ? 0 : Math.sin(u * Math.PI * 1.4) * Math.exp(-u * 0.9))
const WAVE = {
  uYP: { value: -999 }, uYS: { value: -999 },
}
function faceMat(tex: THREE.Texture) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide })
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, WAVE)
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vQ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvQ = position;')
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
uniform float uYP, uYS; varying vec3 vQ;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float lake = step(${LAKE.x0.toFixed(1)}, vQ.x) * step(vQ.x, ${LAKE.x1.toFixed(1)}) * step(${LAKE.bed.toFixed(1)} - 0.2, vQ.y);
  float bp = exp(-pow((vQ.y - uYP) / 1.1, 2.0)) + 0.35 * exp(-pow((vQ.y - uYP + 3.0) / 2.4, 2.0)) * step(vQ.y, uYP);
  float bs = exp(-pow((vQ.y - uYS) / 1.4, 2.0)) + 0.35 * exp(-pow((vQ.y - uYS + 3.5) / 2.8, 2.0)) * step(vQ.y, uYS);
  totalEmissiveRadiance += vec3(0.25, 0.65, 1.0) * bp * 1.3 + vec3(1.0, 0.48, 0.16) * bs * 1.5 * (1.0 - lake);
}`)
  }
  return m
}
/** 剖面上的一排排小点：岩石和水里的“质点”，波经过时跟着动 */
function Particles({ q }: { q: TownQuake | null }) {
  const pts = useMemo(() => {
    const out: [number, number][] = []
    // 稀一些：一排排看得清，单个点上下动还是左右动一眼能分辨
    for (let y = -3; y > BOT + 3; y -= 4.5) for (let x = -76; x < 2; x += 5.5) out.push([x, y])
    for (let x = LAKE.x0 + 30; x < LAKE.x1 - 2; x += 5.5) out.push([x, (LAKE.water + LAKE.bed) / 2])
    return out
  }, [])
  const mesh = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshStandardMaterial({ color: '#fff6e2', roughness: 0.35, emissive: '#ffe9c0', emissiveIntensity: 0.35 }), pts.length); m.frustumCulled = false; return m }, [pts])
  const mat = useMemo(() => new THREE.Matrix4(), [])
  useFrame(() => {
    const t = q?.t ?? -1, yP = q ? bandY(t, q.tP, RISE_P) : -999, yS = q ? bandY(t, q.tS, RISE_S) : -999
    pts.forEach(([x, y], i) => {
      const inLake = x > LAKE.x0 && x < LAKE.x1 && y > LAKE.bed
      const dp = pulse((yP - y) / 4.2) * 1.2, ds = inLake ? 0 : pulse((yS - y) / 4.8) * 1.6
      mesh.setMatrixAt(i, mat.makeTranslation(x + ds, y + dp, BZ1 + 0.35))
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh} />
}

// ---------- 水、街、树、配景 ----------
function Water() {
  const ripple = useRipple([5, 5], 0.012)
  const { lake, river } = useMemo(() => {
    const lake = new THREE.PlaneGeometry(LAKE.x1 - LAKE.x0 + 8, LAKE.z1 - LAKE.z0 + 2 - 8).rotateX(-Math.PI / 2).translate((LAKE.x0 + LAKE.x1) / 2, LAKE.water, (LAKE.z0 - 4 + BZ1) / 2)
    const pos: number[] = [], idx: number[] = []
    for (let i = 0; i <= 110; i++) { const x = BX0 + (i / 110) * (BX1 - BX0), zc = -34 - 3 * Math.sin(x * 0.03); pos.push(x, -1.1, zc - 4.6, x, -1.1, zc + 4.6); if (i < 110) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) } }
    const river = new THREE.BufferGeometry(); river.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); river.setIndex(idx); river.computeVertexNormals()
    return { lake, river }
  }, [])
  return <group>
    <mesh geometry={lake} receiveShadow><meshPhysicalMaterial color="#3d6f80" roughness={0.08} normalMap={ripple} normalScale={new THREE.Vector2(0.25, 0.25)} clearcoat={0.8} envMapIntensity={1.3} transparent opacity={0.92} /></mesh>
    <mesh geometry={river}><meshPhysicalMaterial side={THREE.DoubleSide} color="#557f86" roughness={0.1} normalMap={ripple} normalScale={new THREE.Vector2(0.3, 0.3)} clearcoat={0.7} envMapIntensity={1.3} /></mesh>
    {/* 剖面上看得见的那一截库水 */}
    <mesh position={[(LAKE.x0 + LAKE.x1) / 2, (LAKE.water + LAKE.bed) / 2, BZ1 + 0.05]}><planeGeometry args={[LAKE.x1 - LAKE.x0 - 4, LAKE.water - LAKE.bed]} /><meshStandardMaterial color="#2f6f8f" transparent opacity={0.72} roughness={0.2} /></mesh>
  </group>
}
function Street() {
  const asphalt = useMemo(() => { const t = makeGround('#3c3f42', '60,62,66', '44,46,48', 11); t.repeat.set(20, 1); return t }, [])
  return <group>
    <mesh position={[30, 0.03, -3]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[150, 4]} /><meshStandardMaterial map={asphalt} roughness={0.9} /></mesh>
    {Array.from({ length: 30 }, (_, i) => <mesh key={i} position={[-42 + i * 5, 0.05, -3]} rotation-x={-Math.PI / 2}><planeGeometry args={[2, 0.12]} /><meshBasicMaterial color="#e9e4d4" /></mesh>)}
    {[-5.4, -0.6].map(z => <mesh key={z} position={[30, 0.09, z]} receiveShadow><boxGeometry args={[150, 0.18, 0.8]} /><meshStandardMaterial color="#b7b2a8" roughness={0.85} /></mesh>)}
    {/* 校园和楼前的硬地 */}
    <mesh position={[40, 0.04, -15]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[82, 16]} /><meshStandardMaterial color="#a8a398" roughness={0.9} /></mesh>
  </group>
}
function* treeGen(): Generator<void, Float32Array> {
  const out: number[] = []
  let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let k = 0; k < 9000; k++) {
    const x = BX0 + 1 + rnd() * (BX1 - BX0 - 2), z = BZ0 + 1 + rnd() * (BZ1 - BZ0 - 2), h = townH(x, z)
    if (k % 500 === 0) yield
    const slope = h > 3, near = Math.abs(z + 34) < 9 || (z > -30 && Math.abs(z + 7) < 12 && x > -30 && x < 90)
    if (x > LAKE.x0 - 6 && x < LAKE.x1 + 6 && z > LAKE.z0 - 6) continue
    if (slope && rnd() < 0.85) out.push(x, h, z, 1.6 + rnd() * rnd() * 2.6, rnd() * 6, h > 22 || rnd() < 0.3 ? 1 : 0)
    else if (!slope && !near && rnd() < 0.05 && z < -22) out.push(x, h, z, 1.6 + rnd(), rnd() * 6, 0)
  }
  // 街边的行道树
  for (let x = -26; x < 100; x += 7) out.push(x, 0, 0.4, 1.4, x, 0)
  return new Float32Array(out)
}
function Trees() {
  const data = useJob('town-trees', treeGen, 6)
  const meshes = useMemo(() => {
    if (!data) return null
    const paint = (g: THREE.BufferGeometry, c: string) => { const col = new THREE.Color(c), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) a.set([col.r, col.g, col.b], i); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g }
    const trunk = () => paint(new THREE.CylinderGeometry(0.05, 0.09, 0.5, 5).translate(0, 0.25, 0), '#55402e')
    // 阔叶树：几团大小不一的树冠；针叶树：三层叠起来的锥
    const broad = mergeAll([trunk(), paint(new THREE.IcosahedronGeometry(0.4, 1).translate(0, 0.78, 0), '#3d6330'), paint(new THREE.IcosahedronGeometry(0.3, 1).translate(0.18, 1.0, 0.08), '#4b7238'), paint(new THREE.IcosahedronGeometry(0.28, 1).translate(-0.16, 0.95, -0.1), '#365a2b')])
    const conif = mergeAll([trunk(), paint(new THREE.ConeGeometry(0.42, 0.7, 7).translate(0, 0.65, 0), '#27452a'), paint(new THREE.ConeGeometry(0.34, 0.6, 7).translate(0, 0.98, 0), '#2d4f2f'), paint(new THREE.ConeGeometry(0.22, 0.5, 7).translate(0, 1.3, 0), '#335833')])
    const out: THREE.InstancedMesh[] = []
    for (const [geo, kind] of [[broad, 0], [conif, 1]] as const) {
      const idx: number[] = []; for (let i = 0; i < data.length / 6; i++) if (data[i * 6 + 5] === kind) idx.push(i)
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), idx.length)
      const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color()
      idx.forEach((i, j) => { const o = i * 6, sz = data[o + 3]; m.setMatrixAt(j, mt.compose(p.set(data[o], data[o + 1] - 0.1, data[o + 2]), q.setFromEuler(e.set(0, data[o + 4], 0)), sc.set(sz, sz * (0.85 + (i % 4) * 0.12), sz))); m.setColorAt(j, col.setRGB(0.72 + (i % 7) * 0.05, 0.8 + (i % 5) * 0.05, 0.7 + (i % 3) * 0.06)) })
      m.castShadow = true; out.push(m)
    }
    return out
  }, [data])
  return meshes ? <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</> : null
}
function mergeAll(gs: THREE.BufferGeometry[]) {
  const n = gs.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), col = new Float32Array(n * 3)
  let o = 0
  for (const g of gs) { pos.set(g.attributes.position.array as Float32Array, o * 3); col.set(g.attributes.color.array as Float32Array, o * 3); o += g.attributes.position.count }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g
}

/** 地震台：一间带门的小砖房，房顶一块太阳能板，旁边一根天线杆；墙剖开一角，看得见里面墩子上的地震计 */
function Hut() {
  return <group position={SPOTS.hut}>
    <mesh position={[0, 0.06, 0]} receiveShadow castShadow><boxGeometry args={[2.4, 0.12, 2]} /><meshStandardMaterial color="#9d9a93" roughness={0.9} /></mesh>
    <mesh position={[-0.55, 0.72, 0]} castShadow receiveShadow><boxGeometry args={[1.3, 1.2, 1.6]} /><meshStandardMaterial color="#e5e0d4" roughness={0.85} /></mesh>
    <mesh position={[-0.55, 1.37, 0]} castShadow><boxGeometry args={[1.45, 0.1, 1.75]} /><meshStandardMaterial color="#6f6a62" roughness={0.7} /></mesh>
    <mesh position={[-0.55, 0.55, 0.805]}><boxGeometry args={[0.42, 0.84, 0.02]} /><meshStandardMaterial color="#4e6170" roughness={0.5} metalness={0.4} /></mesh>
    {/* 太阳能板 */}
    <group position={[-0.55, 1.62, 0]} rotation-x={-0.5}><mesh castShadow><boxGeometry args={[1.1, 0.04, 0.7]} /><meshStandardMaterial color="#1d2b44" roughness={0.2} metalness={0.5} /></mesh></group>
    {[-0.3, 0.3].map(z => <mesh key={z} position={[-0.55, 1.5, z]}><cylinderGeometry args={[0.02, 0.02, 0.26]} /><meshStandardMaterial color="#9aa0a6" metalness={0.8} roughness={0.35} /></mesh>)}
    {/* 天线杆和定位天线 */}
    <mesh position={[0.6, 1.3, -0.5]} castShadow><cylinderGeometry args={[0.03, 0.04, 2.6, 8]} /><meshStandardMaterial color="#c9ccce" metalness={0.8} roughness={0.3} /></mesh>
    <mesh position={[0.6, 2.62, -0.5]}><cylinderGeometry args={[0.12, 0.12, 0.08, 16]} /><meshStandardMaterial color="#f0f0ee" roughness={0.4} /></mesh>
    {/* 地震计：观测墩上的一个圆筒 */}
    <mesh position={[0.55, 0.22, 0.35]} castShadow><boxGeometry args={[0.5, 0.2, 0.5]} /><meshStandardMaterial color="#8b8780" roughness={0.9} /></mesh>
    <mesh position={[0.55, 0.42, 0.35]} castShadow><cylinderGeometry args={[0.13, 0.13, 0.22, 24]} /><meshStandardMaterial color="#2c5d7d" metalness={0.5} roughness={0.35} /></mesh>
    <mesh position={[0.55, 0.54, 0.35]}><cylinderGeometry args={[0.135, 0.135, 0.03, 24]} /><meshStandardMaterial color="#c8ccd0" metalness={0.9} roughness={0.25} /></mesh>
    {/* 一圈矮护栏 */}
    {[[0, -1], [0, 1], [-1.2, 0], [1.2, 0]].map(([x, z], i) => <mesh key={i} position={[x, 0.32, z * 0.98]}><boxGeometry args={[z ? 2.4 : 0.04, 0.04, z ? 0.04 : 2]} /><meshStandardMaterial color="#5d6064" metalness={0.6} roughness={0.5} /></mesh>)}
  </group>
}
/** 水库里的一条小船 */
function Boat({ lift }: { lift: { value: number } }) {
  const ref = useRef<THREE.Group>(null)
  const hull = useMemo(() => { const sh = new THREE.Shape(); sh.moveTo(-1.6, 0); sh.quadraticCurveTo(-1.6, -0.5, 0, -0.5); sh.quadraticCurveTo(1.4, -0.5, 1.9, 0.15); sh.lineTo(-1.6, 0.15); const g = new THREE.ExtrudeGeometry(sh, { depth: 1.0, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }); g.translate(0, 0, -0.5); return g }, [])
  useFrame(({ clock }) => { const g = ref.current; if (!g) return; g.position.set(SPOTS.boat[0], SPOTS.boat[1] + 0.12 + lift.value + Math.sin(clock.elapsedTime * 1.3) * 0.03, SPOTS.boat[2]); g.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.02 })
  return <group ref={ref} rotation-y={0.3}>
    <mesh geometry={hull} castShadow><meshStandardMaterial color="#f1eee6" roughness={0.6} /></mesh>
    <mesh position={[0.1, 0.18, 0]}><boxGeometry args={[2.8, 0.06, 0.86]} /><meshStandardMaterial color="#8a5a38" roughness={0.8} /></mesh>
    <mesh position={[-0.6, 0.45, 0]} castShadow><boxGeometry args={[0.8, 0.5, 0.7]} /><meshStandardMaterial color="#c8423a" roughness={0.6} /></mesh>
  </group>
}
/** 远处的群山：一圈雾里的山影 */
function FarRange() {
  const grass = useMemo(() => { const t = makeGround('#5d6c49', '76,92,58', '104,112,80', 9); t.repeat.set(60, 60); return t }, [])
  const geo = useMemo(() => {
    const N = 200, pos: number[] = [], idx: number[] = []
    for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, r = 360, hh = 90 + 120 * fbm(a * 6, 1, 4) + 60 * Math.max(0, Math.sin(a * 2 - 1)); pos.push(Math.cos(a) * r, BOT - 4, Math.sin(a) * r, Math.cos(a) * r, hh, Math.sin(a) * r); if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3) } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
  }, [])
  return <group>
    <mesh geometry={geo}><meshBasicMaterial color="#8d9ba6" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, BOT - 4, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[380, 64]} /><meshStandardMaterial map={grass} color="#8f9a7e" roughness={1} /></mesh>
  </group>
}

export interface TownWant {
  /** 第 3 课：这次地震此刻的时钟和两种波到这里的时刻 */
  quake?: TownQuake | null
  /** 第 7 课：用周期 Tg 的地震波摇三栋楼；amp 是地面晃动的幅度（画面单位，示意放大） */
  shake?: { Tg: number; damped: boolean; amp: number } | null
  /** 拓展课：教学楼此刻地面晃动的幅度 */
  school?: number
}

const SWAY = { house: makeSway(1), school: makeSway(1), low: makeSway(1), mid: makeSway(1), high: makeSway(1), boat: { value: 0 } }
export const townSway = SWAY
/** 第 3 课的民房画大一些，晃动看得清（示意） */
export const HOUSE_SCALE = 1.5

export function Town({ want }: { want: TownWant }) {
  const ground = useJob('town-ground', groundGen, 4)
  const tex = useStrata()
  const fmat = useMemo(() => faceMat(tex), [tex])
  const side = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide }), [tex])
  const walls = useMemo(() => {
    const along = (z: number) => Array.from({ length: 221 }, (_, i) => { const x = BX0 + i; return [x, townH(x, z)] as [number, number] })
    const across = (x: number) => Array.from({ length: 118 }, (_, j) => { const z = BZ0 + j; return [z, townH(x, z)] as [number, number] })
    return { front: wall(along(BZ1), 80), back: wall(along(BZ0), 80), left: wall(across(BX0), 80), right: wall(across(BX1), 80) }
  }, [])
  const phase = useRef(0)
  useFrame((_, dt) => {
    const q = want.quake
    // 第 3 课：波前在剖面上的位置；房子和船跟着动
    WAVE.uYP.value = q ? bandY(q.t, q.tP, RISE_P) : -999
    WAVE.uYS.value = q ? bandY(q.t, q.tS, RISE_S) : -999
    const up = q && q.t > q.tP ? 0.16 * Math.sin((q.t - q.tP) * 26) * Math.exp(-(q.t - q.tP) * 0.7) : 0
    const sx = q && q.t > q.tS ? Math.sin((q.t - q.tS) * 8) * 1.0 * Math.exp(-(q.t - q.tS) * 0.3) * Math.min(1, (q.t - q.tS) * 4) : 0
    SWAY.house.lift.value = up; SWAY.house.g.value = sx * 0.35; SWAY.house.top.value = sx
    SWAY.boat.value = up * 1.4
    // 第 7 课：三栋楼一起摇；每栋楼顶的晃动 = 地面的晃动 × 传递率，晚一个相位
    const sh = want.shake
    if (sh) {
      phase.current += (dt * 2 * Math.PI) / sh.Tg
      const g = Math.sin(phase.current) * sh.amp
      for (const b of BUILDINGS) {
        const r = response(natPeriod(b.floors), sh.Tg, b.key === 'high' && sh.damped ? ZETA_DAMPED : ZETA), s: Sway = SWAY[b.key]
        s.g.value = g; s.top.value = Math.sin(phase.current - r.phase) * sh.amp * Math.min(r.tr, 12) * 0.55
      }
    } else for (const b of BUILDINGS) { const s: Sway = SWAY[b.key]; s.g.value *= 0.9; s.top.value *= 0.9 }
    const sc = want.school ?? 0
    SWAY.school.g.value = Math.sin(performance.now() / 1000 * 8) * sc; SWAY.school.top.value = SWAY.school.g.value * 1.6
  })
  return (
    <group position={TOWN}>
      <FarRange />
      {ground && <mesh geometry={ground.geo} receiveShadow><meshStandardMaterial vertexColors roughness={0.95} /></mesh>}
      <mesh geometry={walls.front} material={fmat} position={[0, 0, BZ1]} />
      <mesh geometry={walls.back} material={side} position={[0, 0, BZ0]} />
      <mesh geometry={walls.left} material={side} position={[BX0, 0, 0]} rotation-y={-Math.PI / 2} />
      <mesh geometry={walls.right} material={side} position={[BX1, 0, 0]} rotation-y={-Math.PI / 2} />
      <mesh position={[0, BOT - 1.2, (BZ0 + BZ1) / 2]}><boxGeometry args={[BX1 - BX0 + 2, 2.4, BZ1 - BZ0 + 2]} /><meshPhysicalMaterial color="#22272b" roughness={0.45} clearcoat={0.4} /></mesh>
      <Water />
      <Street />
      <Trees />
      <Hut />
      <Boat lift={SWAY.boat} />
      <Particles q={want.quake ?? null} />
      <Building kind="house" sway={SWAY.house} position={SPOTS.house} scale={HOUSE_SCALE} />
      <Building kind="school" sway={SWAY.school} position={SPOTS.school} />
      <Building kind="house" sway={SWAY.low} position={SPOTS.low} />
      <Building kind="slab" sway={SWAY.mid} position={SPOTS.mid} />
      <Building kind="tower" sway={SWAY.high} position={SPOTS.high} />
      {/* 不晃的配景：街对面几栋矮楼 */}
      {[[84, -14, 0], [96, -13, 0.1], [-30, -16, 0]].map(([x, z, r], i) => <StaticHouse key={i} x={x} z={z} r={r} />)}
    </group>
  )
}
const STILL = makeSway(1)
function StaticHouse({ x, z, r }: { x: number; z: number; r: number }) {
  return <Building kind="house" sway={STILL} position={[x, 0, z]} rotation={r} />
}
export { BX0, BX1, BZ0, BZ1, BOT }
