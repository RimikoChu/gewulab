// 等高线地形图实验室的大场景：一块切开的山地沙盘。西边是海和平原，中间是 A、B 两座山峰和连着它们的山脊（中间是鞍部），
// 两峰之间的山谷里流出一条河，穿过峡谷向西入海；西北是一块高原，南缘有陡崖和瀑布；东南是一个盆地，河南边是一片丘陵。
// 整个实验室只有这一个世界，换课时镜头在里面飞。山可以被半透明的水平面一层层切开，交线（等高线）在山体上发光；
// 也可以整块“压平”成一张地图：这就是把等高线垂直投影到平面上。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { makeGround, makeStrata, useRipple } from '@/lab-kit'
import { BROOK, PLATEAU, RIVER, VILLAGE, X0, X1, Y, Z0, Z1, contourSegments, fbm, gridGen, height, type Grid } from './physics'
import { useJob } from './job'

/** 这一课对世界的要求 */
export interface Want {
  /** 压平成地图 */
  flat?: boolean
  /** 地面的颜色：自然的样子、分层设色 */
  tint?: 'nature' | 'layers'
  /** 画出哪些等高线（海拔，m） */
  lines?: number[]
  /** 加亮的等高线 */
  glow?: number[]
  /** 正在切的那一层水平面（海拔，m） */
  plane?: number | null
  /** 把这几条线标成红色（陡崖重合处） */
  warn?: number[]
}

type V3 = [number, number, number]
const NX = 300, NZ = 200
const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k) }
/** 块的底面 */
export const FLOOR = -3.2

// ---------- 压平的程度：世界每帧更新，各课自己的东西（路线、标记）跟着它一起压平 ----------
export const FLAT = { k: 0 }
/** 压平时高度乘的系数 */
export const flatScale = (k: number) => 1 - 0.994 * k
/** 地图上一点：压平时贴着地图，立起来时贴着地面 */
export function useFollowFlat(ref: React.RefObject<THREE.Object3D | null>, lift = 0.06) {
  useFrame(() => { const o = ref.current; if (!o) return; o.scale.y = flatScale(FLAT.k); o.position.y = lift })
}

// ---------- 地形网格 ----------
interface TerrainData { grid: Grid; geo: THREE.BufferGeometry; nature: Float32Array; layers: Float32Array; paper: Float32Array; layersPaper: Float32Array }
const C = (s: string) => new THREE.Color(s)
const COL = {
  sand: C('#cbb784'), field: C('#86a04f'), field2: C('#a3a25a'), meadow: C('#7d9a4c'), forest: C('#355f2f'), forest2: C('#4c6e38'),
  rock: C('#665f55'), rock2: C('#7b7366'), scree: C('#9c9282'), bare: C('#a49470'), seabed: C('#b7a67c'), plat: C('#b3a467'),
}
/** 分层设色：海拔越高颜色从绿到黄到棕（按地图上常见的配色） */
const LAYERS: [number, THREE.Color][] = [[-1e9, C('#7fb7d9')], [0, C('#5f9e57')], [200, C('#9cc06a')], [500, C('#e3d58c')], [1000, C('#d39b5a')], [1500, C('#a8683a')]]
export const LAYER_STOPS = LAYERS.slice(1).map(([h, c]) => ({ h, color: `#${c.getHexString()}` }))
function layerColor(h: number, out: THREE.Color) {
  let c = LAYERS[0][1]
  for (const [lo, col] of LAYERS) if (h >= lo) c = col
  return out.copy(c)
}

function* terrainGen(): Generator<void, TerrainData> {
  const gg = gridGen(NX, NZ); let r = gg.next(); while (!r.done) { yield; r = gg.next() }
  const grid = r.value, W = NX + 1, n = W * (NZ + 1)
  const pos = new Float32Array(n * 3), nature = new Float32Array(n * 3), layers = new Float32Array(n * 3), paper = new Float32Array(n * 3), layersPaper = new Float32Array(n * 3)
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const k = j * W + i; pos[k * 3] = X0 + i * grid.dx; pos[k * 3 + 1] = Y(grid.h[k]); pos[k * 3 + 2] = Z0 + j * grid.dz }
  const idx: number[] = []
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d) }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals()
  yield
  const nrm = geo.attributes.normal as THREE.BufferAttribute, c = new THREE.Color(), t = new THREE.Color(), L = new THREE.Vector3(-0.55, 0.75, -0.4).normalize()
  for (let j = 0; j <= NZ; j++) {
    for (let i = 0; i <= NX; i++) {
      const k = j * W + i, x = pos[k * 3], z = pos[k * 3 + 2], h = grid.h[k], ny = nrm.getY(k)
      const n1 = fbm(x * 2.2, z * 2.2, 2), n2 = fbm(x * 0.6 + 50, z * 0.6, 2)
      const steep = smooth((0.72 - ny) / 0.2)          // 陡坡露出岩石
      // 自然的样子：海边沙滩 → 农田和草地 → 森林 → 高处的灌丛和裸岩；高原顶上是草原
      c.copy(COL.field).lerp(COL.field2, smooth(n2 * 2 + 0.5) * 0.7)
      c.lerp(COL.sand, smooth((10 - h) / 8))
      if (h < 0) c.copy(COL.seabed).lerp(t.set('#8f7f5e'), smooth(-h / 80))
      c.lerp(t.copy(COL.forest).lerp(COL.forest2, smooth(n1 + 0.5)), smooth((h - 170 - 60 * n2) / 90) * (1 - smooth((h - 1180 - 80 * n1) / 160)))
      c.lerp(t.copy(COL.meadow).lerp(COL.bare, smooth(n1 + 0.4)), smooth((h - 1150 - 60 * n2) / 150))
      c.lerp(t.copy(COL.rock).lerp(COL.rock2, smooth(n1 * 1.5 + 0.5)), Math.max(steep, smooth((h - 1420) / 120)) * 0.92)
      const pr = Math.hypot((x - PLATEAU[0]) / 13, (z - PLATEAU[1]) / 9), onPlat = smooth((0.93 - pr) / 0.08) * smooth((h - 650) / 40)
      c.lerp(t.copy(COL.plat).lerp(COL.meadow, smooth(n1 + 0.5) * 0.5), onPlat)
      nature.set([c.r, c.g, c.b], k * 3)
      // 地图上的明暗：按 3D 时的坡向打一层“晕渲”，压平以后还能看出起伏
      const shade = Math.min(1.12, Math.max(0.68, 0.84 + 0.34 * (nrm.getX(k) * L.x + ny * L.y + nrm.getZ(k) * L.z - 0.75)))
      layerColor(h, t); layers.set([t.r, t.g, t.b], k * 3)
      layersPaper.set([t.r * shade, t.g * shade, t.b * shade], k * 3)
      if (h < 0) t.set('#bcd8e6'); else t.set('#e9e2cc')
      const ps = 0.35 + 0.65 * shade
      paper.set([t.r * ps, t.g * ps, t.b * ps], k * 3)
    }
    if (j % 8 === 0) yield
  }
  geo.setAttribute('color', new THREE.BufferAttribute(nature.slice(), 3))
  return { grid, geo, nature, layers, paper, layersPaper }
}

/** 一条等高线的线段（世界坐标，压平之前） */
function lineGen(grid: Grid, level: number) {
  return function* (): Generator<void, Float32Array> {
    yield
    const s = contourSegments(grid, level), y = Y(level), out = new Float32Array((s.length / 2) * 3)
    for (let i = 0, o = 0; i < s.length; i += 2, o += 3) { out[o] = s[i]; out[o + 1] = y; out[o + 2] = s[i + 1] }
    return out
  }
}

/** 一条等高线：发光的细线；压平时跟着地图一起变平，颜色从亮黄换成地图上的棕色 */
function Contour({ grid, level, on, glow, warn, prio }: { grid: Grid; level: number; on: boolean; glow: boolean; warn: boolean; prio: number }) {
  const pts = useJob(`line-${level}`, lineGen(grid, level), prio)
  const obj = useMemo(() => {
    if (!pts) return null
    const g = new LineSegmentsGeometry(); g.setPositions(pts)
    const l = new LineSegments2(g, new LineMaterial({ color: 0xffffff, linewidth: 2, transparent: true, depthWrite: false, toneMapped: false })); l.renderOrder = 5; l.frustumCulled = false
    // 外面再套一圈宽而淡的光晕，线看起来在发光
    const halo = new LineSegments2(g, new LineMaterial({ color: 0xffffff, linewidth: 9, transparent: true, depthWrite: false, toneMapped: false })); halo.renderOrder = 4; halo.frustumCulled = false
    const grp = new THREE.Group(); grp.add(halo, l)
    return { grp, l, halo }
  }, [pts])
  useEffect(() => () => { if (!obj) return; obj.l.geometry.dispose(); (obj.l.material as LineMaterial).dispose(); (obj.halo.material as LineMaterial).dispose() }, [obj])
  const a = useRef(0), glowC = useMemo(() => new THREE.Color(), []), hot = useMemo(() => new THREE.Color(), [])
  const index = level % 500 === 0
  useFrame((_, dt) => {
    if (!obj) return
    const m = obj.l.material as LineMaterial, hm = obj.halo.material as LineMaterial
    a.current += ((on ? 1 : 0) - a.current) * Math.min(1, dt * 5)
    obj.grp.visible = a.current > 0.01
    const k = FLAT.k
    // 立体时：淡黄的细光线，加亮的是饱和的橙色；压平成地图时：地图上常用的棕色细线，加亮的是更深更粗的线
    // 立体时：亮白的细线（计曲线稍粗），加亮的是橙色稍粗的线；压平成地图时：地图上常用的棕色细线
    glowC.set(warn ? '#ff5a45' : glow ? '#ffa630' : '#fffaf0').multiplyScalar(warn || glow ? 1.2 : 1.0)
    hot.set(warn ? '#d7261b' : glow ? '#3d1c05' : '#7a4a1f')
    m.color.copy(glowC).lerp(hot, k)
    m.opacity = a.current * (glow || warn ? 1 : 0.88 + 0.12 * k)
    m.linewidth = (glow || warn ? 2.6 : index ? 1.5 : 0.9) * (1 + 0.6 * k) + (glow ? 0.8 * k : 0)
    // 只有加亮的线带一圈很淡的光晕，普通的线不加，免得山坡看着像一层层台阶
    hm.color.set(warn ? '#ff4030' : '#ff9a1f')
    hm.opacity = glow || warn ? a.current * 0.22 * (1 - k) : 0
    obj.halo.visible = (glow || warn) && k < 0.98
    hm.linewidth = 7
    obj.grp.scale.y = flatScale(k); obj.grp.position.y = 0.05 + 0.03 * k
  })
  return obj ? <primitive object={obj.grp} /> : null
}

/** 切山的水平面：一块半透明的玻璃板，四边一圈亮边 */
function SlicePlane({ level }: { level: number | null }) {
  const ref = useRef<THREE.Group>(null), y = useRef(level == null ? Y(1700) : Y(level)), op = useRef(0)
  const mat = useRef<THREE.MeshBasicMaterial>(null), edge = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return
    const goal = level == null ? y.current : Y(level)
    y.current += (goal - y.current) * Math.min(1, dt * 3.2)
    op.current += ((level == null ? 0 : 1) - op.current) * Math.min(1, dt * 4)
    g.position.y = y.current * flatScale(FLAT.k); g.visible = op.current > 0.01
    if (mat.current) mat.current.opacity = 0.09 * op.current
    if (edge.current) edge.current.opacity = 0.85 * op.current
  })
  const w = X1 - X0, d = Z1 - Z0
  return (
    <group ref={ref}>
      <mesh rotation-x={-Math.PI / 2} position={[(X0 + X1) / 2, 0, (Z0 + Z1) / 2]} renderOrder={8}>
        <planeGeometry args={[w + 1.2, d + 1.2]} />
        <meshBasicMaterial ref={mat} color="#8fd8ff" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* 玻璃板的四条边 */}
      {([[0, -d / 2 - 0.6, w + 1.4, 0.12], [0, d / 2 + 0.6, w + 1.4, 0.12], [-w / 2 - 0.6, 0, 0.12, d + 1.2], [w / 2 + 0.6, 0, 0.12, d + 1.2]] as const).map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[(X0 + X1) / 2 + x, 0, (Z0 + Z1) / 2 + z]}><boxGeometry args={[sx, 0.12, sz]} /><meshBasicMaterial ref={i === 0 ? edge : undefined} color="#e8f8ff" transparent opacity={0.85} toneMapped={false} /></mesh>
      ))}
    </group>
  )
}

/** 河和小溪：一条贴着河床的水带，下游越来越宽 */
function Stream({ path, w0, w1 }: { path: [number, number, number][]; w0: number; w1: number }) {
  const geo = useMemo(() => {
    const pts = new THREE.CatmullRomCurve3(path.map(([x, z, b]) => new THREE.Vector3(x, b, z)), false, 'centripetal')
    const N = 260, pos: number[] = [], uv: number[] = [], idx: number[] = []
    let len = 0, prev = pts.getPointAt(0)
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = pts.getPointAt(t), tg = pts.getTangentAt(t), side = new THREE.Vector3(-tg.z, 0, tg.x).normalize(), w = (w0 + (w1 - w0) * t) / 2
      len += p.distanceTo(prev); prev = p
      for (const s of [-1, 1]) {
        const x = p.x + side.x * w * s, z = p.z + side.z * w * s
        // 水面：取这一处河床的海拔，比地面低一点点也没关系，两岸会把它夹住
        pos.push(x, Y(Math.max(p.y + 5, Math.min(height(x, z), p.y + 9))) + 0.03, z); uv.push(s * 0.5 + 0.5, len * 0.35)
      }
      if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
    return g
  }, [path, w0, w1])
  const ripple = useRipple([1, 1], -0.25)
  return <mesh geometry={geo} renderOrder={2}><meshPhysicalMaterial color="#3f8fc4" roughness={0.12} metalness={0.05} normalMap={ripple} normalScale={new THREE.Vector2(0.35, 0.35)} clearcoat={0.8} transparent opacity={0.92} envMapIntensity={1.3} /></mesh>
}

/** 瀑布：小溪从高原南缘的陡崖上跌下去 */
function Waterfall() {
  const [top, lip, foot] = [BROOK[2], BROOK[2], BROOK[3]]
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256
    const g = c.getContext('2d')!; g.fillStyle = '#d8eef8'; g.fillRect(0, 0, 64, 256)
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`; g.fillRect(Math.random() * 64, Math.random() * 256, 1 + Math.random() * 3, 20 + Math.random() * 60) }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(120,170,200,0.35)'; g.fillRect(Math.random() * 64, Math.random() * 256, 2, 30 + Math.random() * 50) }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useFrame((_, dt) => { tex.offset.y += dt * 1.6 })
  const x = (lip[0] + foot[0]) / 2, z = (lip[1] + foot[1]) / 2, y0 = Y(top[2] + 4), y1 = Y(foot[2] + 2)
  return (
    <group>
      <mesh position={[x, (y0 + y1) / 2, z + 0.05]} rotation-x={-0.08}><planeGeometry args={[0.55, y0 - y1, 1, 1]} /><meshBasicMaterial map={tex} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} color="#cfe6f2" /></mesh>
      {/* 落水处的水花 */}
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[x + (i - 2) * 0.14, y1 + 0.06, z + 0.25 + (i % 2) * 0.1]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.16 + (i % 3) * 0.04, 12, 8]} /><meshStandardMaterial color="#f2f8fb" roughness={0.9} transparent opacity={0.85} /></mesh>)}
    </group>
  )
}

/** 树和石头：山坡上的森林、陡坡下的碎石 */
function* plantGen(grid: Grid): Generator<void, { conifer: Float32Array; broad: Float32Array; rock: Float32Array }> {
  const conifer: number[] = [], broad: number[] = [], rock: number[] = []
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const at = (x: number, z: number) => { const i = Math.round((x - X0) / grid.dx), j = Math.round((z - Z0) / grid.dz); return grid.h[j * (grid.nx + 1) + i] }
  const slope = (x: number, z: number) => Math.hypot(at(x + 0.4, z) - at(x - 0.4, z), at(x, z + 0.4) - at(x, z - 0.4)) / 80
  const nearWater = (x: number, z: number) => [RIVER, BROOK].some(p => p.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.3))
  for (let k = 0; k < 16000; k++) {
    const x = X0 + 0.5 + rnd() * (X1 - X0 - 1), z = Z0 + 0.5 + rnd() * (Z1 - Z0 - 1), h = at(x, z), sl = slope(x, z)
    if (k % 400 === 0) yield
    if (h < 2) continue
    const dense = fbm(x * 0.9 + 7, z * 0.9, 2)
    if (sl > 1.8 && rnd() < 0.08) { rock.push(x, Y(h), z, 0.12 + rnd() * 0.25, rnd() * 6); continue }
    if (nearWater(x, z) || Math.hypot(x - VILLAGE[0], z - VILLAGE[1]) < 4) continue
    if (h > 690 && h < 790 && sl < 0.25) continue                                            // 高原顶上是草原
    if (h > 170 + 80 * dense && h < 1200 + 60 * dense && sl < 2.2 && rnd() < 0.55 + dense * 0.5) (h > 700 ? conifer : broad).push(x, Y(h), z, 0.7 + rnd() * 0.5, rnd() * 6)
    else if (h > 30 && h < 170 && rnd() < 0.008) broad.push(x, Y(h), z, 0.6 + rnd() * 0.4, rnd() * 6)
  }
  return { conifer: new Float32Array(conifer), broad: new Float32Array(broad), rock: new Float32Array(rock) }
}
function paint(g: THREE.BufferGeometry, col: string) { const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
function Instances({ data, kind }: { data: Float32Array; kind: 'conifer' | 'broad' | 'rock' }) {
  const mesh = useMemo(() => {
    let geo: THREE.BufferGeometry
    if (kind === 'conifer') {
      const trunk = paint(new THREE.CylinderGeometry(0.025, 0.035, 0.16, 5).translate(0, 0.08, 0), '#5d4632')
      const c1 = paint(new THREE.ConeGeometry(0.17, 0.34, 7).translate(0, 0.3, 0), '#24451f'), c2 = paint(new THREE.ConeGeometry(0.12, 0.28, 7).translate(0, 0.46, 0), '#2c5225')
      geo = mergeAll([trunk, c1, c2])
    } else if (kind === 'broad') {
      const trunk = paint(new THREE.CylinderGeometry(0.025, 0.035, 0.16, 5).translate(0, 0.08, 0), '#5d4632')
      const c1 = paint(new THREE.IcosahedronGeometry(0.17, 1).translate(0, 0.27, 0), '#2f5726'), c2 = paint(new THREE.IcosahedronGeometry(0.12, 1).translate(0.08, 0.36, 0.04), '#3c6a2c')
      geo = mergeAll([trunk, c1, c2])
    } else geo = paint(new THREE.DodecahedronGeometry(0.5, 0), '#6a645a')
    const n = data.length / 5, m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: kind === 'rock' }), n)
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color()
    for (let i = 0; i < n; i++) {
      const [x, y, z, s, r] = data.subarray(i * 5, i * 5 + 5)
      q.setFromEuler(e.set(kind === 'rock' ? r : 0, r, 0))
      mat.compose(p.set(x, y - (kind === 'rock' ? s * 0.25 : 0.02), z), q, kind === 'rock' ? sc.set(s * 1.2, s * 0.7, s) : sc.set(s, s * (0.9 + (i % 3) * 0.12), s))
      m.setMatrixAt(i, mat)
      // 颜色已经画在模型上，这里只让每棵深浅略有不同
      col.setScalar(0.78 + (i % 5) * 0.07)
      m.setColorAt(i, col)
    }
    m.castShadow = true; m.receiveShadow = kind === 'rock'
    return m
  }, [data, kind])
  return <primitive object={mesh} />
}
function mergeAll(gs: THREE.BufferGeometry[]) {
  const parts = gs.map(g => g.index ? g.toNonIndexed() : g)
  const n = parts.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3)
  let o = 0
  for (const g of parts) { g.computeVertexNormals(); pos.set(g.attributes.position.array as Float32Array, o * 3); nor.set(g.attributes.normal.array as Float32Array, o * 3); col.set(g.attributes.color.array as Float32Array, o * 3); o += g.attributes.position.count }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

/** 山脚的村子：几户白墙灰瓦的房子 */
function Village() {
  const houses = useMemo(() => {
    const out: { p: V3; r: number; s: number }[] = []
    for (let k = 0; k < 14; k++) {
      const a = k * 2.399, d = 0.6 + Math.sqrt(k) * 0.75, x = VILLAGE[0] + Math.cos(a) * d * 1.3, z = VILLAGE[1] + Math.sin(a) * d
      out.push({ p: [x, Y(height(x, z)), z], r: (k % 3) * 0.5 + Math.round(a) * 0.1, s: 1.5 + (k % 3) * 0.25 })
    }
    return out
  }, [])
  return <group>{houses.map((h, i) => (
    <group key={i} position={h.p} rotation-y={h.r} scale={h.s}>
      <mesh position={[0, 0.11, 0]} castShadow receiveShadow><boxGeometry args={[0.42, 0.22, 0.26]} /><meshStandardMaterial color="#ece6da" roughness={0.85} /></mesh>
      <mesh position={[0, 0.27, 0]} rotation-z={Math.PI / 4} scale={[1, 1, 1]} castShadow><boxGeometry args={[0.22, 0.22, 0.3]} /><meshStandardMaterial color="#4c5258" roughness={0.7} /></mesh>
    </group>
  ))}</group>
}

/** 地块的四个切面：一层层的土和岩石；下面是一块深色的底座 */
function Sides({ grid }: { grid: Grid }) {
  const strata = useMemo(() => { const t = makeStrata(['#8a6f4e', '#93785a', '#7d6447', '#8a7050', '#76603f', '#6c583c']); t.repeat.set(0.04, 0.16); t.wrapT = THREE.RepeatWrapping; return t }, [])
  const geos = useMemo(() => {
    const W = grid.nx + 1
    const side = (pts: [number, number][]) => {
      const pos: number[] = [], uv: number[] = [], idx: number[] = []
      pts.forEach(([u, h], i) => { pos.push(u, Y(Math.max(h, -200)), 0, u, FLOOR, 0); uv.push(u, Y(h) - FLOOR, u, 0); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3) } })
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g
    }
    const row = (j: number) => Array.from({ length: W }, (_, i) => [X0 + i * grid.dx, grid.h[j * W + i]] as [number, number])
    const col = (i: number) => Array.from({ length: grid.nz + 1 }, (_, j) => [Z0 + j * grid.dz, grid.h[j * W + i]] as [number, number])
    return { south: side(row(grid.nz)), north: side(row(0)), west: side(col(0)), east: side(col(grid.nx)) }
  }, [grid])
  const mat = <meshStandardMaterial color="#b89a72" map={strata} roughness={1} side={THREE.DoubleSide} />
  return (
    <group>
      <mesh geometry={geos.south} position={[0, 0, Z1]}>{mat}</mesh>
      <mesh geometry={geos.north} position={[0, 0, Z0]}>{mat}</mesh>
      <mesh geometry={geos.west} position={[X0, 0, 0]} rotation-y={-Math.PI / 2}>{mat}</mesh>
      <mesh geometry={geos.east} position={[X1, 0, 0]} rotation-y={-Math.PI / 2}>{mat}</mesh>
      {/* 剖面上看到的那一截海水 */}
      <mesh position={[X0 - 0.03, Y(-100) / 2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[Z1 - Z0, -Y(-100)]} /><meshStandardMaterial color="#2c6f9f" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, FLOOR - 0.5, 0]} receiveShadow castShadow><boxGeometry args={[X1 - X0 + 1.6, 1.0, Z1 - Z0 + 1.6]} /><meshPhysicalMaterial color="#23282c" roughness={0.5} clearcoat={0.4} /></mesh>
      <mesh position={[0, FLOOR - 1.1, 0]}><boxGeometry args={[X1 - X0 + 2.6, 0.24, Z1 - Z0 + 2.6]} /><meshStandardMaterial color="#15181b" roughness={0.7} /></mesh>
    </group>
  )
}

/** 海：海面有细细的波纹 */
function Sea() {
  const ripple = useRipple([6, 8], 0.01)
  const x1 = -38
  return <mesh position={[(X0 + x1) / 2, 0.02, (Z0 + Z1) / 2]} rotation-x={-Math.PI / 2} renderOrder={1}><planeGeometry args={[x1 - X0, Z1 - Z0]} /><meshPhysicalMaterial color="#2b78ad" transparent opacity={0.86} roughness={0.1} metalness={0.05} normalMap={ripple} normalScale={new THREE.Vector2(0.2, 0.2)} clearcoat={0.7} envMapIntensity={1.3} /></mesh>
}

/** 远处的群山：一圈雾里的山影，让沙盘不是悬在空中 */
function FarHills() {
  const grass = useMemo(() => { const t = makeGround('#6f8250', '86,104,58', '120,128,84', 3); t.repeat.set(60, 60); return t }, [])
  const geo = useMemo(() => {
    const N = 220, pos: number[] = [], idx: number[] = []
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, r = 230, hgt = 18 + 22 * (0.5 + 0.5 * fbm(a * 9, 3, 3)) + 14 * Math.max(0, Math.sin(a * 3 + 1))
      pos.push(Math.cos(a) * r, FLOOR - 1.3, Math.sin(a) * r, Math.cos(a) * r, FLOOR - 1.3 + hgt, Math.sin(a) * r)
      if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
  }, [])
  return (
    <group>
      <mesh geometry={geo}><meshBasicMaterial color="#8fa0ae" side={THREE.DoubleSide} fog /></mesh>
      <mesh position={[0, FLOOR - 1.23, 0]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[240, 72]} /><meshStandardMaterial map={grass} color="#9aa883" roughness={1} /></mesh>
    </group>
  )
}

function Terrain({ data, tint }: { data: TerrainData; tint: 'nature' | 'layers' }) {
  const ref = useRef<THREE.Group>(null), mix = useRef({ layer: tint === 'layers' ? 1 : 0, flat: 0 }), last = useRef('')
  useFrame(() => {
    const g = ref.current; if (!g) return
    g.scale.y = flatScale(FLAT.k)
    const m = mix.current, goal = tint === 'layers' ? 1 : 0
    m.layer += (goal - m.layer) * 0.08; if (Math.abs(goal - m.layer) < 0.004) m.layer = goal
    const key = `${m.layer.toFixed(3)}|${FLAT.k.toFixed(3)}`
    if (key === last.current) return
    last.current = key
    const col = data.geo.attributes.color as THREE.BufferAttribute, a = col.array as Float32Array, f = smooth(FLAT.k * 1.4 - 0.2), l = m.layer
    for (let i = 0; i < a.length; i++) {
      const solid = data.nature[i] + (data.layers[i] - data.nature[i]) * l
      const map = data.paper[i] + (data.layersPaper[i] - data.paper[i]) * l
      a[i] = solid + (map - solid) * f
    }
    col.needsUpdate = true
  })
  return (
    <group ref={ref}>
      <mesh geometry={data.geo} receiveShadow castShadow><meshStandardMaterial vertexColors roughness={0.96} /></mesh>
    </group>
  )
}

/** 压平和树、石头、河、村子：都放在同一个跟着压平的组里 */
function Dressing({ data }: { data: TerrainData }) {
  const ref = useRef<THREE.Group>(null)
  const plants = useJob('plants', () => plantGen(data.grid), 5)
  useFrame(() => { const g = ref.current; if (!g) return; g.scale.y = flatScale(FLAT.k); g.visible = FLAT.k < 0.85 })
  const water = useRef<THREE.Group>(null)
  useFrame(() => { if (water.current) water.current.scale.y = flatScale(FLAT.k) })
  return (
    <>
      <group ref={ref}>
        {plants && <><Instances data={plants.conifer} kind="conifer" /><Instances data={plants.broad} kind="broad" /><Instances data={plants.rock} kind="rock" /></>}
        <Village />
        <Waterfall />
      </group>
      <group ref={water}>
        <Stream path={RIVER} w0={0.35} w1={1.5} />
        <Stream path={BROOK} w0={0.22} w1={0.4} />
      </group>
    </>
  )
}

export const ALL_LEVELS = Array.from({ length: 16 }, (_, k) => (k + 1) * 100)

export function World({ want = {} }: { want?: Want }) {
  const data = useJob('terrain', terrainGen, 0)
  // 压平：慢慢变化（先慢后快再慢），大约 1.6 秒
  const goal = want.flat ? 1 : 0
  useFrame((_, dt) => { const d = goal - FLAT.k; FLAT.k = Math.abs(d) < 0.002 ? goal : FLAT.k + Math.sign(d) * Math.min(Math.abs(d), dt * (0.25 + 1.4 * Math.sin(Math.PI * Math.min(1, Math.max(0.05, FLAT.k))))) })
  const lines = new Set(want.lines ?? []), glow = new Set(want.glow ?? []), warn = new Set(want.warn ?? [])
  return (
    <group>
      <FarHills />
      {data && <>
        <Terrain data={data} tint={want.tint ?? 'nature'} />
        <Sides grid={data.grid} />
        <Dressing data={data} />
        {ALL_LEVELS.map((lv, i) => <Contour key={lv} grid={data.grid} level={lv} on={lines.has(lv)} glow={glow.has(lv)} warn={warn.has(lv)} prio={2 + (lines.has(lv) ? 0 : 1) + i * 0.01} />)}
      </>}
      <Sea />
      <SlicePlane level={want.plane ?? null} />
    </group>
  )
}
