// 生态系统实验室的大场景：一片温带草原。起伏的草地（实例化的草丛、野花）、灌丛、石堆、一片小湖（芦苇、睡莲）、
// 北边一片树林、南边一块麦田和农舍、远处一圈低山；草原边上一张野外观察桌；远处一群绵羊在吃草，天上一只鹰在盘旋。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。各课的位置和机位写在 ST、SPOT 里。1 个单位 = 1 m。
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import { LabStage, makeGround, useRipple, type Label } from '@/lab-kit'
import { fbm } from './sdf'
import { Eagle, Sheep } from './animals'
import { useJob, useLazy } from './job'
import { Batch, Flesh, Plant, fuse, leafCard, leafGeo, lerp, makeWood, place, rng, tint, tube, type V3 } from './parts'

// ---------- 地形 ----------
/** 小湖：中心和半径 */
export const LAKE = { x: -46, z: -30, r: 15, depth: 1.4, level: -0.35 }
/** 各课所在的位置 */
export const ST = {
  table: { x: -22, z: 16 },      // 第 1 课、拓展“生态瓶”：观察桌
  meadow: { x: 0, z: 0 },        // 第 2 课
  chain: { x: 24, z: -2 },       // 第 3 课
  web: { x: 48, z: 8 },          // 第 4 课
  hill: { x: 10, z: -36 },       // 第 5 课
  shore: { x: -28, z: -20 },     // 第 6 课
  valley: { x: 78, z: -34 },     // 第 7 课
  forest: { x: 6, z: -112 },     // 拓展：树林
  farm: { x: -30, z: 70 },       // 拓展：麦田
}
/** 地面高度：缓缓起伏，湖是一个洼地，各课的位置附近放平一点 */
export function ground(x: number, z: number) {
  let h = 0.9 * Math.sin(x * 0.035 + 1.3) * Math.cos(z * 0.042 - 0.4) + 0.5 * Math.sin(x * 0.081 + z * 0.06) + 0.35 * fbm(x * 0.03, 0, z * 0.03, 2)
  const hillK = Math.exp(-((x - ST.hill.x) ** 2 + (z - ST.hill.z - 4) ** 2) / 260); h += hillK * 3.2
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z) / LAKE.r
  if (dl < 1.6) h = lerp(h, -LAKE.depth * (1 - dl * dl), Math.max(0, Math.min(1, (1.6 - dl) / 0.75)))
  const far = Math.hypot(x, z); if (far > 160) h += (far - 160) * 0.05 * (1 + Math.sin(Math.atan2(z, x) * 5))
  return h
}
/** 一个点贴着地面：[x, 地面高度, z] */
export const onGround = (x: number, z: number, dy = 0): V3 => [x, ground(x, z) + dy, z]

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
const gy = (k: keyof typeof ST, dy: number) => ground(ST[k].x, ST[k].z) + dy
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  s1: spot(ST.table.x, gy('table', 0.86), ST.table.z, 0.62, 0.36, [-0.1, 0.62]),
  s2: spot(ST.meadow.x, gy('meadow', 1.2), ST.meadow.z, 15, 6.5, [-0.35, 0.16]),
  s3: spot(ST.chain.x, gy('chain', 0.45), ST.chain.z, 4.2, 1.8, [-0.2, 0.18]),
  s4: spot(ST.web.x, gy('web', 0.6), ST.web.z, 6.8, 3.4, [0.25, 0.42]),
  s5: spot(ST.hill.x, gy('hill', 0.9), ST.hill.z, 5.6, 2.6, [-0.15, 0.14]),
  s6: spot(ST.shore.x, gy('shore', 0.7), ST.shore.z, 6.4, 2.9, [0.45, 0.2]),
  s7: spot(ST.valley.x, gy('valley', 1), ST.valley.z, 30, 12, [-0.3, 0.3]),
  xLake: spot(LAKE.x + 4.5, LAKE.level + 0.7, LAKE.z + 7.5, 9, 3.8, [0.55, 0.14]),
  xForest: spot(ST.forest.x + 2, ground(ST.forest.x + 2, ST.forest.z - 4) + 4.5, ST.forest.z - 4, 22, 9, [0.05, 0.1]),
  xFarm: spot(ST.farm.x + 2, gy('farm', 1.3), ST.farm.z - 6, 14, 5.6, [3.0, 0.15]),
  xBottle: spot(ST.table.x + 0.42, gy('table', 0.93), ST.table.z, 0.66, 0.38, [-0.35, 0.18]),
  q: spot(-6, ground(-6, -18) + 0.55, -18, 8, 3.4, [-0.35, 0.12]),
}
export type SpotKey = keyof typeof SPOT
/** 每一课用它代替 LabStage：只要说在哪一处。shift 把看向的点挪一点，span 换一个取景范围，view 换一个角度 */
/** 这一课对整个世界的要求：valley 是第 7 课宽谷里草的多少（0–100） */
export interface Want { valley?: number }
export function Room({ at, labels, children = null, span, shift, view, bloom = 0.5, world }: { at: SpotKey; labels: Label[]; children?: ReactNode; span?: [number, number]; shift?: V3; view?: [number, number]; bloom?: number; world?: Want }) {
  const v = SPOT[at], sx = shift?.[0] ?? 0, sy = shift?.[1] ?? 0, sz = shift?.[2] ?? 0, w = span?.[0] ?? v.span[0], h = span?.[1] ?? v.span[1]
  const target = useMemo(() => v.target.clone().add(new THREE.Vector3(sx, sy, sz)), [v, sx, sy, sz])
  const sp = useMemo<[number, number]>(() => [w, h], [w, h])
  const vw = useMemo<[number, number]>(() => view ?? v.view, [view?.[0], view?.[1], v])   // eslint-disable-line react-hooks/exhaustive-deps
  return <LabStage labels={labels} target={target} span={sp} view={vw} sun={3.2} env={0.9} fog={[160, 980]} bloom={bloom} world={world}>{children}</LabStage>
}

// ---------- 地面 ----------
/** 草皮贴图：灰底上几千道短短的、朝各个方向的草叶笔触，深浅不一；乘上地面的颜色，远处看是一片毛茸茸的草，不是一块平板 */
function makeTurf() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(13)
  g.fillStyle = '#bdbdb4'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 9000; i++) {
    const x = r() * S, y = r() * S, a = -Math.PI / 2 + (r() - 0.5) * 1.4, L = 6 + r() * 16, v = r()
    g.strokeStyle = v < 0.45 ? `rgba(40,48,30,${0.25 + r() * 0.3})` : v < 0.85 ? `rgba(225,230,200,${0.2 + r() * 0.3})` : `rgba(255,240,180,${0.3 + r() * 0.3})`
    g.lineWidth = 0.8 + r() * 1.6
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * L, y + oy + Math.sin(a) * L); g.stroke() }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
function Terrain() {
  const geo = useLazy('terrain', () => {
    const S = 1400, N = 340, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color()
    const green = new THREE.Color('#5c7a32'), dry = new THREE.Color('#8f874c'), lush = new THREE.Color('#4a6a2a'), mud = new THREE.Color('#5d5037'), rock = new THREE.Color('#7f7a6c')
    for (let i = 0; i < p.count; i++) {
      // 网格中间密、外面疏：把均匀的格点往中心挤
      let x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z) / (S / 2), k = r < 1e-6 ? 1 : Math.pow(r, 1.7) / r; x *= k; z *= k
      const h = ground(x, z); p.setXYZ(i, x, h, z)
      const n = fbm(x * 0.05, 1, z * 0.05, 3)
      col.copy(green).lerp(dry, Math.max(0, Math.min(1, 0.3 + n * 1.3))).lerp(lush, Math.max(0, -n * 0.8))
      const dl = Math.hypot(x - LAKE.x, z - LAKE.z) / LAKE.r
      if (dl < 1.1) col.lerp(mud, Math.min(1, (1.1 - dl) * 4))
      if (Math.hypot(x, z) > 170) col.lerp(rock, Math.min(0.6, (Math.hypot(x, z) - 170) / 300))
      c.set([col.r, col.g, col.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeVertexNormals()
    return g
  })
  const tex = useMemo(() => { const t = makeTurf(); t.repeat.set(1100, 1100); return t }, [])
  if (!geo) return null
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial vertexColors map={tex} roughness={1} envMapIntensity={0.5} /></mesh>
}

// ---------- 草：实例化的草丛 ----------
/** 一丛草：十来根窄而尖的草叶从一处长出来，向四面弯；高 1 */
function tuftGeo(seed: number, blades = 14, N = 3) {
  const r = rng(seed), list: THREE.BufferGeometry[] = []
  for (let i = 0; i < blades; i++) {
    const g = new THREE.BufferGeometry(), w = 0.014 + r() * 0.014, lean = 0.2 + r() * 0.55, h = 0.5 + r() * 0.5, pos: number[] = [], col: number[] = [], idx: number[] = []
    const c0 = new THREE.Color('#3b5320'), c1 = new THREE.Color(r() < 0.25 ? '#a99d5e' : r() < 0.5 ? '#7d9444' : '#8f9e52'), c = new THREE.Color()
    for (let k = 0; k <= N; k++) { const u = k / N, ww = w * (1 - u * 0.9); c.copy(c0).lerp(c1, Math.pow(u, 0.8)); for (const s of [-1, 1]) { pos.push(s * ww, u * h, lean * u * u * h); col.push(c.r, c.g, c.b) } }
    for (let k = 0; k < N; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
    // 法线朝上偏：草叶从上面看是亮的，不会一片黑一片白
    const n = g.attributes.normal; for (let k = 0; k < n.count; k++) { const v = new THREE.Vector3(n.getX(k), n.getY(k) + 1.2, n.getZ(k)).normalize(); n.setXYZ(k, v.x, v.y, v.z) }
    const a = r() * 6.28, d = r() * 0.11
    list.push(place(g, [Math.cos(a) * d, 0, Math.sin(a) * d], r() * 6.28, 0))
  }
  return fuse(list)
}
/** 风吹草动：顶点着色器里按世界位置让草叶尖左右摆 */
function useWindMat(color = '#ffffff') {
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, side: THREE.DoubleSide, color, envMapIntensity: 0.55 })
    m.onBeforeCompile = s => {
      s.uniforms.uTime = { value: 0 }; m.userData.shader = s
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
vec4 wp0 = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
#else
vec4 wp0 = vec4(0.0);
#endif
float sw = sin(uTime * 1.6 + wp0.x * 0.31 + wp0.z * 0.23) * 0.6 + sin(uTime * 2.7 + wp0.x * 1.7 - wp0.z * 1.1) * 0.25;
transformed.x += sw * position.y * position.y * 0.18; transformed.z += sw * position.y * position.y * 0.08;`)
    }
    return m
  }, [color])
  useFrame(({ clock }) => { const s = mat.userData.shader; if (s) s.uniforms.uTime.value = clock.elapsedTime })
  return mat
}
/** 草长在哪：每一课的位置附近又密又细，远处稀一些（远处靠地面的颜色）。[x, z, 半径, 每平方米几丛] */
const DENSE: [number, number, number, number, number?][] = [
  [ST.table.x, ST.table.z, 9, 26], [ST.meadow.x - 2, ST.meadow.z - 4, 26, 30], [ST.chain.x + 1, ST.chain.z, 9, 34, 0.7], [ST.web.x, ST.web.z, 11, 30, 0.65],
  [ST.hill.x, ST.hill.z, 9, 32, 0.6], [ST.shore.x + 2, ST.shore.z - 1, 10, 30, 0.7], [ST.valley.x, ST.valley.z, 28, 12], [ST.farm.x + 20, ST.farm.z - 14, 14, 6],
  [ST.forest.x + 2, ST.forest.z + 8, 14, 14], [ST.farm.x + 2, ST.farm.z - 17, 9, 16], [LAKE.x + 7, LAKE.z + 11, 7, 22], [-6, -14, 8, 20],
]
/** 这几处的草被啃得很矮：田鼠和蛇趴在这里，草太高会把它们挡住。[x, z, 半径] */
const SHORT: [number, number, number][] = [
  [ST.web.x + 0.55, ST.web.z + 0.85, 0.5], [ST.web.x + 1.4, ST.web.z + 0.7, 0.75],
  [ST.hill.x - 0.38, ST.hill.z + 0.62, 0.5], [ST.hill.x + 0.6, ST.hill.z + 0.55, 0.7],
  [ST.chain.x + 1.6, ST.chain.z - 0.55, 0.45], [ST.chain.x + 2.75, ST.chain.z - 1.0, 0.7],
]
const shortAt = (x: number, z: number) => SHORT.some(([a, b, R]) => (x - a) ** 2 + (z - b) ** 2 < R * R)
/** 这一处不长草 */
const bare = (x: number, z: number) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.02 || (x > ST.farm.x - 22 && x < ST.farm.x + 22 && z > ST.farm.z - 12 && z < ST.farm.z + 16) || (Math.abs(x - ST.table.x) < 0.95 && Math.abs(z - ST.table.z) < 0.6)
interface Patch { k: number; mats: THREE.Matrix4[]; v?: boolean; far?: boolean }
/** 草丛的位置：分几帧算完（job.ts），进页面不卡 */
function* grassJob(): Generator<void, Patch[]> {
  const r = rng(20261125), out: Patch[] = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), P = new THREE.Vector3(), Sc = new THREE.Vector3()
  const fill = (list: THREE.Matrix4[], x: number, z: number, s: number) => {
    if (bare(x, z)) return
    const k = shortAt(x, z) ? 0.3 : 1, h = s * (0.6 + r() * 0.7) * k, w = s * (0.8 + r() * 0.6)
    m.compose(P.set(x, ground(x, z) - 0.01, z), q.setFromEuler(e.set((r() - 0.5) * 0.2, r() * 6.28, (r() - 0.5) * 0.2)), Sc.set(w, h, w))
    list.push(m.clone())
  }
  for (const [cx, cz, R, per, low = 1] of DENSE) {
    const n = Math.round(Math.PI * R * R * per), lists: THREE.Matrix4[][] = [[], [], []]
    for (let i = 0; i < n; i++) { const a = r() * 6.28, d = R * Math.sqrt(r()); if (d > R * 0.7 && r() < (d / R - 0.7) * 2.5) continue; fill(lists[i % 3], cx + Math.cos(a) * d, cz + Math.sin(a) * d, (0.12 + r() * 0.1) * (d < R * 0.6 ? low : 1)); if (i % 3000 === 0) yield }
    lists.forEach((l, k) => out.push({ k, mats: l, v: cx === ST.valley.x }))
  }
  // 远处：40 m 一块，草丛少几根叶子
  for (let gx = -160; gx < 200; gx += 40) for (let gz = -170; gz < 150; gz += 40) {
    const lists: THREE.Matrix4[][] = [[], [], []]
    for (let i = 0; i < 3600; i++) fill(lists[i % 3], gx + r() * 40, gz + r() * 40, 0.22 + r() * 0.26)
    lists.forEach((l, k) => out.push({ k, mats: l, far: true }))
    yield
  }
  return out.filter(p => p.mats.length)
}
function Grass({ valley = 80 }: { valley?: number }) {
  const mat = useWindMat(), vmat = useWindMat('#fffffe')
  // 宽谷里的草：草越少越枯黄（第 7 课）
  vmat.color.set('#ffffff').lerp(new THREE.Color('#9a7a4a'), Math.max(0, Math.min(1, (80 - valley) / 70)))
  const geos = useMemo(() => [tuftGeo(1, 11), tuftGeo(2, 11), tuftGeo(3, 11)], [])
  const farGeos = useMemo(() => [tuftGeo(4, 6, 2), tuftGeo(5, 6, 2), tuftGeo(6, 6, 2)], [])
  const patches = useJob('grass', grassJob, 4)
  const refs = useRef<(THREE.InstancedMesh | null)[]>([])
  useEffect(() => { patches?.forEach((p, i) => { const im = refs.current[i]; if (!im) return; p.mats.forEach((mm, j) => im.setMatrixAt(j, mm)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere() }) }, [patches])
  if (!patches) return null
  return <>{patches.map((p, i) => <instancedMesh key={i} ref={e => { refs.current[i] = e }} args={[(p.far ? farGeos : geos)[p.k], p.v ? vmat : mat, p.mats.length]} receiveShadow />)}</>
}

// ---------- 野花 ----------
function flowerGeo(petal: string, heart: string, n: number, seed: number) {
  const r = rng(seed), list: THREE.BufferGeometry[] = []
  list.push(tube([[0, 0, 0], [0.01, 0.12, 0.005], [0.0, 0.26, 0.01]], 0.004, 0.003, '#56712e', '#6d8a3b', 4, 6))
  for (let i = 0; i < n; i++) {
    const g = new THREE.CircleGeometry(0.022, 6, 0, Math.PI); g.scale(0.55, 1, 1); g.translate(0, 0.02, 0); g.rotateX(-Math.PI / 2 + 0.35)
    list.push(place(tint(g, petal, '#ffffff'), [0, 0.262, 0.01], (i / n) * Math.PI * 2 + r() * 0.2, 0))
  }
  list.push(place(tint(new THREE.SphereGeometry(0.011, 8, 6), heart), [0, 0.266, 0.01], 0, 0, [1, 0.55, 1]))
  return fuse(list)
}
function Flowers() {
  const geos = useMemo(() => [flowerGeo('#f2c94a', '#d7861e', 9, 1), flowerGeo('#f3f0ea', '#e6b93a', 7, 2), flowerGeo('#a487c8', '#f0d36a', 6, 3), flowerGeo('#e46a6a', '#4a2a2a', 5, 4)], [])
  const lists = useLazy('flowers', () => {
    const r = rng(77), out: THREE.Matrix4[][] = [[], [], [], []], m = new THREE.Matrix4(), q = new THREE.Quaternion()
    const put = (x: number, z: number) => { if (bare(x, z)) return; const s = 0.9 + r() * 0.8; m.compose(new THREE.Vector3(x, ground(x, z), z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28), new THREE.Vector3(s, s, s)); out[Math.floor(r() * 4)].push(m.clone()) }
    for (const [cx, cz, R] of DENSE) for (let c = 0; c < 12; c++) { const a = r() * 6.28, d = R * (0.3 + r()), x0 = cx + Math.cos(a) * d, z0 = cz + Math.sin(a) * d; for (let i = 0; i < 26; i++) put(x0 + (r() - 0.5) * 3, z0 + (r() - 0.5) * 3) }
    for (let i = 0; i < 2500; i++) { const a = r() * 6.28, d = 8 + r() * 110; put(Math.cos(a) * d, Math.sin(a) * d) }
    return out
  })
  const refs = useRef<(THREE.InstancedMesh | null)[]>([])
  useEffect(() => { lists?.forEach((l, k) => { const im = refs.current[k]; if (!im) return; l.forEach((mm, i) => im.setMatrixAt(i, mm)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere() }) }, [lists])
  if (!lists) return null
  return <>{lists.map((l, k) => <instancedMesh key={k} ref={e => { refs.current[k] = e }} args={[geos[k], undefined, l.length]} castShadow frustumCulled={false}><meshStandardMaterial vertexColors roughness={0.6} side={THREE.DoubleSide} /></instancedMesh>)}</>
}

// ---------- 灌丛、树、石头 ----------
/** 光滑的球（顶点共用，起伏以后法线也是光滑的） */
function ball(detail: number) { const g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); return mergeVertices(g) }
/** 一丛灌木：几根枝，枝头密密地长着小叶片 */
export function shrubGeo(seed: number, R = 0.9, leaf = ['#2f4f1f', '#628a34']) {
  const r = rng(seed), wood: THREE.BufferGeometry[] = [], B = new Batch(), L = leafCard(0.06), c0 = new THREE.Color(leaf[0]), c1 = new THREE.Color(leaf[1]), c = new THREE.Color()
  for (let b = 0; b < 9; b++) {
    const a = r() * 6.28, up = 0.5 + r() * 0.7, len = R * (0.7 + r() * 0.5)
    const end: V3 = [Math.cos(a) * Math.cos(up) * len, Math.sin(up) * len * 0.9 + 0.1, Math.sin(a) * Math.cos(up) * len]
    wood.push(tube([[0, 0, 0], [end[0] * 0.4, end[1] * 0.5, end[2] * 0.4], end], 0.03, 0.008, '#4a3a2a', '#6a5640', 5, 8))
    for (let k = 0; k < 220; k++) {
      const s = Math.pow(r(), 0.5), rr = R * 0.38 * (0.4 + r() * 0.8), th = r() * 6.28, ph = Math.acos(2 * r() - 1)
      const p: V3 = [end[0] * (0.55 + s * 0.45) + Math.sin(ph) * Math.cos(th) * rr, end[1] * (0.6 + s * 0.4) + Math.cos(ph) * rr * 0.8, end[2] * (0.55 + s * 0.45) + Math.sin(ph) * Math.sin(th) * rr]
      c.copy(c0).lerp(c1, Math.min(1, Math.max(0, (p[1] / (R * 1.2)) + (r() - 0.5) * 0.6)))
      B.add(L, p, r() * 6.28, r() * 3, 0.7 + r() * 0.7, r() * 3, c)
    }
  }
  return { wood: fuse(wood), leaves: B.build() }
}
/** 一块石头：揉皱的球，顶面颜色浅、底下深 */
export function rockGeo(seed: number, s: V3, color = '#8c877a') {
  const g = ball(4), p = g.attributes.position, r = rng(seed), o = r() * 50
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.22 * fbm(x * 1.6 + o, y * 1.6, z * 1.6, 3) + 0.05 * fbm(x * 6 + o, y * 6, z * 6, 2); p.setXYZ(i, x * k * s[0], Math.max(-0.25, y) * k * s[1], z * k * s[2]) }
  g.computeVertexNormals()
  const c = new Float32Array(p.count * 3), base = new THREE.Color(color), cc = new THREE.Color(), n = g.attributes.normal
  for (let i = 0; i < p.count; i++) { cc.copy(base).multiplyScalar(0.72 + 0.3 * Math.max(0, n.getY(i)) + 0.1 * fbm(p.getX(i) * 4, p.getY(i) * 4, p.getZ(i) * 4, 2)); if (n.getY(i) > 0.7 && r() < 0.3) cc.lerp(new THREE.Color('#7d8a4a'), 0.35); c.set([cc.r, cc.g, cc.b], i * 3) }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3))
  return g
}
function Shrubs() {
  const g = useLazy('shrubs', () => {
    const r = rng(5), w: THREE.BufferGeometry[] = [], l: THREE.BufferGeometry[] = []
    const at: [number, number][] = [[-7, -6], [6, -9], [-12, 4], [15, 6], [30, -9], [19, 3.5], [40, 2], [55, 13], [-30, 6], [-18, 22], [-27, 23], [14, -40], [4, -30], [-33, -5], [-22, -26], [66, -22], [90, -40], [60, -46], [-5, 20], [10, 18]]
    for (const [x, z] of at) { const s = shrubGeo(Math.floor(r() * 1000), 0.6 + r() * 0.7), p: V3 = [x, ground(x, z) - 0.05, z]; w.push(place(s.wood, p, r() * 6)); l.push(place(s.leaves, p, r() * 6)) }
    return { w: fuse(w), l: fuse(l) }
  })
  if (!g) return null
  return <>
    <mesh geometry={g.w} castShadow><Flesh rough={0.9} /></mesh>
    <mesh geometry={g.l} castShadow receiveShadow><Plant rough={0.7} /></mesh>
  </>
}
function Rocks() {
  const g = useLazy('rocks', () => {
    const r = rng(9), list: THREE.BufferGeometry[] = []
    const add = (x: number, z: number, s: V3, sink = 0.25) => list.push(place(rockGeo(Math.floor(r() * 999), s), [x, ground(x, z) - s[1] * sink, z], r() * 6))
    // 第 3 课的石堆、第 4 课鹰站的石头、第 5 课坡顶的岩石、散落的石头
    add(ST.chain.x + 4.1, ST.chain.z - 2.4, [0.7, 0.42, 0.55]); add(ST.chain.x + 4.7, ST.chain.z - 1.7, [0.4, 0.25, 0.35]); add(ST.chain.x + 3.6, ST.chain.z - 2.9, [0.35, 0.2, 0.3])
    add(ST.web.x + 1.6, ST.web.z - 3.4, [0.6, 0.5, 0.5], 0.2)
    add(ST.hill.x + 2.3, ST.hill.z - 0.8, [0.8, 0.75, 0.6], 0.15); add(ST.hill.x + 1.4, ST.hill.z - 1.1, [0.5, 0.35, 0.45]); add(ST.hill.x + 0.6, ST.hill.z - 0.9, [0.4, 0.22, 0.35])
    for (let i = 0; i < 60; i++) { const a = r() * 6.28, d = 10 + r() * 120, s = 0.15 + r() * 0.5; add(Math.cos(a) * d, Math.sin(a) * d, [s * (1 + r()), s * 0.6, s]) }
    return fuse(list)
  })
  if (!g) return null
  return <mesh geometry={g} castShadow receiveShadow><Flesh rough={0.92} /></mesh>
}
/** 一截倒在草里的枯木，上面长着几朵蘑菇（第 2 课、第 6 课的分解者） */
export const LOG = { x: ST.meadow.x - 6.2, z: ST.meadow.z - 1.4, yaw: 0.4 }
export const LOG2 = { x: ST.shore.x + 1.3, z: ST.shore.z - 0.3, yaw: -0.3 }
function bark() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(9)
  g.fillStyle = '#5a4a3a'; g.fillRect(0, 0, S, S)
  // 顺着木头长度方向（贴图的竖向）的裂纹和树皮条
  for (let i = 0; i < 260; i++) { const x = r() * S, y = r() * S, L = 30 + r() * 90; g.strokeStyle = `rgba(${r() < 0.65 ? '28,20,14' : '150,132,108'},${0.25 + r() * 0.35})`; g.lineWidth = 1 + r() * 3.5; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + (r() - 0.5) * 8, y + L / 3, x + (r() - 0.5) * 8, y + L * 2 / 3, x + (r() - 0.5) * 6, y + L); g.stroke() }
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '96,120,52' : '120,140,70'},${0.35 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * S, r() * S, 8 + r() * 20, 5 + r() * 12, 0, 0, 6.3); g.fill() }
  for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(200,190,160,${0.25 + r() * 0.2})`; g.beginPath(); g.arc(r() * S, r() * S, 2 + r() * 5, 0, 6.3); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); t.anisotropy = 8; return t
}
function mushroomGeo(seed: number) {
  const r = rng(seed), list: THREE.BufferGeometry[] = []
  for (let i = 0; i < 6; i++) {
    const s = 0.6 + r() * 0.8, h = 0.05 * s, R = 0.035 * s
    const stem = new THREE.LatheGeometry([new THREE.Vector2(0.008 * s, 0), new THREE.Vector2(0.007 * s, h * 0.7), new THREE.Vector2(0.006 * s, h)], 10)
    const cap = new THREE.LatheGeometry([new THREE.Vector2(0.005, h - 0.004), new THREE.Vector2(R * 0.9, h - 0.006), new THREE.Vector2(R, h - 0.002), new THREE.Vector2(R * 0.9, h + 0.008 * s), new THREE.Vector2(R * 0.55, h + 0.016 * s), new THREE.Vector2(0, h + 0.019 * s)], 18)
    const p: V3 = [(r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.12]
    list.push(place(tint(stem, '#e8dcc2', '#efe6d0'), p, 0, (r() - 0.5) * 0.3), place(tint(cap, '#d8c9a8', '#a87a48'), p, 0, (r() - 0.5) * 0.3))
  }
  return fuse(list)
}
export function Log({ at, yaw = 0, rot = 0 }: { at: V3; yaw?: number; rot?: number }) {
  const tex = useMemo(bark, [])
  const g = useMemo(() => fuse([tube([[-1.1, 0.16, 0], [-0.3, 0.19, 0.04], [0.5, 0.16, -0.03], [1.05, 0.13, 0]], 0.19, 0.13, '#ffffff', '#e8e0d0', 16, 24), tube([[-0.4, 0.3, 0.08], [-0.45, 0.45, 0.22], [-0.42, 0.55, 0.3]], 0.05, 0.03, '#ffffff', '#ffffff', 8, 6), tube([[0.3, 0.26, -0.1], [0.4, 0.3, -0.35], [0.45, 0.32, -0.5]], 0.04, 0.02, '#ffffff', '#ffffff', 8, 6)]), [])
  const shrooms = useMemo(() => mushroomGeo(3), [])
  const shrooms2 = useMemo(() => mushroomGeo(8), [])
  return (
    <group position={at} rotation-y={yaw}>
      <mesh geometry={g} castShadow receiveShadow><meshStandardMaterial map={tex} vertexColors roughness={0.95} /></mesh>
      <group position={[0.15, 0.3, 0.03]} scale={1 - rot * 0.5}><mesh geometry={shrooms} castShadow><Flesh rough={0.55} /></mesh></group>
      <group position={[-0.5, 0.05, 0.22]} scale={1.2}><mesh geometry={shrooms2} castShadow><Flesh rough={0.55} /></mesh></group>
    </group>
  )
}

// ---------- 湖 ----------
function Lake() {
  const nrm = useRipple(16, 0.02)
  const reeds = useLazy('reeds', () => {
    const r = rng(41), list: THREE.BufferGeometry[] = []
    for (let i = 0; i < 1500; i++) {
      const a = r() * 6.28, d = LAKE.r * (0.86 + r() * 0.2), x = LAKE.x + Math.cos(a) * d, z = LAKE.z + Math.sin(a) * d * 0.95
      if (Math.sin(a * 3) < -0.4) continue
      const h = 1 + r() * 1.1, lean = (r() - 0.5) * 0.25
      list.push(tube([[x, ground(x, z) - 0.2, z], [x + lean * 0.3, ground(x, z) + h * 0.5, z], [x + lean, ground(x, z) + h, z + lean * 0.3]], 0.008, 0.003, '#5d7136', '#a69a5c', 3, 5))
      if (r() < 0.25) list.push(place(tint(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 6), '#6a4a2a'), [x + lean, ground(x, z) + h - 0.05, z + lean * 0.3]))
    }
    const pads: THREE.BufferGeometry[] = []
    for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = LAKE.r * (0.35 + r() * 0.45), s = 0.18 + r() * 0.2; const g = new THREE.CircleGeometry(s, 16, 0.3, Math.PI * 2 - 0.4); g.rotateX(-Math.PI / 2); pads.push(place(tint(g, '#3f6a2e', '#5e8a3e'), [LAKE.x + Math.cos(a) * d, LAKE.level + 0.012, LAKE.z + Math.sin(a) * d], r() * 6)) }
    return { reeds: fuse(list), pads: fuse(pads) }
  })
  if (!reeds) return null
  return <>
    <mesh rotation-x={-Math.PI / 2} position={[LAKE.x, LAKE.level, LAKE.z]} receiveShadow><circleGeometry args={[LAKE.r * 1.22, 64]} /><meshPhysicalMaterial color="#2f4a48" roughness={0.08} metalness={0.1} normalMap={nrm} normalScale={new THREE.Vector2(0.3, 0.3)} transparent opacity={0.9} envMapIntensity={1.2} clearcoat={1} /></mesh>
    <mesh geometry={reeds.reeds} castShadow><Plant rough={0.8} /></mesh>
    <mesh geometry={reeds.pads}><Plant rough={0.4} /></mesh>
  </>
}

// ---------- 树林、麦田和农舍、远山 ----------
/** 一棵孤零零的大树：粗干分出几根枝，枝头是一团团叶片（每片是一张小叶，朝向各不相同），远看是蓬松的树冠，不是一个球 */
function leafyTree(seed: number, h: number) {
  const r = rng(seed), wood: THREE.BufferGeometry[] = [], B = new Batch(), L = leafCard(0.18), c0 = new THREE.Color('#2c4a22'), c1 = new THREE.Color('#7a9c48'), c = new THREE.Color()
  const top: V3 = [(r() - 0.5) * 0.4, h * 0.5, (r() - 0.5) * 0.4]
  wood.push(tube([[0, -0.4, 0], [0.1, h * 0.25, 0], top], h * 0.04, h * 0.025, '#4a3a2c', '#5d4a38', 9, 10))
  for (let b = 0; b < 7; b++) {
    const a = (b / 7) * 6.28 + r() * 0.6, up = 0.5 + r() * 0.6, len = h * (0.28 + r() * 0.12)
    const end: V3 = [top[0] + Math.cos(a) * Math.cos(up) * len, top[1] + Math.sin(up) * len, top[2] + Math.sin(a) * Math.cos(up) * len]
    wood.push(tube([top, [(top[0] + end[0]) / 2, (top[1] + end[1]) / 2 + 0.3, (top[2] + end[2]) / 2], end], h * 0.018, h * 0.006, '#4a3a2c', '#5d4a38', 6, 8))
    const R = h * (0.17 + r() * 0.06)
    for (let k = 0; k < 700; k++) {
      const th = r() * 6.28, ph = Math.acos(2 * r() - 1), rr = R * Math.pow(r(), 0.35)
      const p: V3 = [end[0] + Math.sin(ph) * Math.cos(th) * rr, end[1] + Math.cos(ph) * rr * 0.75, end[2] + Math.sin(ph) * Math.sin(th) * rr]
      c.copy(c0).lerp(c1, Math.max(0, Math.min(1, (p[1] - h * 0.55) / (h * 0.6) + (r() - 0.5) * 0.5)))
      B.add(L, p, r() * 6.28, r() * 3, 1 + r() * 0.8, r() * 3, c)
    }
  }
  return { wood: fuse(wood), leaves: B.build() }
}
function LoneTrees() {
  const g = useLazy('lone', () => {
    const w: THREE.BufferGeometry[] = [], l: THREE.BufferGeometry[] = []
    for (const [x, z, h] of [[-14, -18, 9], [36, -28, 10], [-40, 34, 8.5], [-34, 12, 7.5], [62, 20, 9]] as [number, number, number][]) { const t = leafyTree(x * 7 + z, h), p: V3 = [x, ground(x, z), z]; w.push(place(t.wood, p)); l.push(place(t.leaves, p)) }
    return { w: fuse(w), l: fuse(l) }
  })
  if (!g) return null
  return <>
    <mesh geometry={g.w} castShadow receiveShadow><Flesh rough={0.95} /></mesh>
    <mesh geometry={g.l} castShadow receiveShadow><Plant rough={0.75} /></mesh>
  </>
}
/** 树林：阔叶树（一团团叶片冠）和针叶树（一层层下垂的枝叶），按棵分几帧生成 */
function* forestJob(): Generator<void, { w: THREE.BufferGeometry; c: THREE.BufferGeometry }> {
  const r = rng(17), wood: THREE.BufferGeometry[] = [], B = new Batch(), card = leafCard(0.32), c = new THREE.Color()
  const spray = leafGeo({ len: 1, wid: 0.42, basePow: 0.5, tipPow: 0.7, curl: 0.35, fold: 0.15, base: '#ffffff', tip: '#ffffff', nu: 4, nv: 1 }).toNonIndexed()
  const dark = new THREE.Color('#1c3420'), mid = new THREE.Color('#2f5230'), lit = new THREE.Color('#5e8442'), dk2 = new THREE.Color('#233c1e'), lt2 = new THREE.Color('#6f9446')
  for (let i = 0; i < 110; i++) {
    const x = ST.forest.x + (r() - 0.5) * 110, z = ST.forest.z - 4 - r() * 46 + Math.abs(x - ST.forest.x) * 0.08, y0 = ground(x, z), h = 9 + r() * 7, conifer = r() < 0.45
    wood.push(tube([[x, y0 - 0.3, z], [x + (r() - 0.5) * 0.3, y0 + h * 0.5, z], [x + (r() - 0.5) * 0.3, y0 + h * (conifer ? 0.98 : 0.7), z]], h * 0.028, h * 0.01, '#4b3a2c', '#5d4a38', 7, 8))
    if (conifer) {
      const tiers = 14
      for (let t = 0; t < tiers; t++) {
        const u = t / (tiers - 1), R = h * 0.22 * (1 - u * 0.88) + 0.25, yy = y0 + h * (0.2 + u * 0.78), n = Math.round(14 + (1 - u) * 10)
        for (let k = 0; k < n; k++) { const a = (k / n) * 6.28 + r() * 0.4 + t * 0.7; c.copy(dark).lerp(mid, u * 0.6 + r() * 0.35); B.add(spray, [x, yy, z], a + Math.PI / 2, 0.35 + r() * 0.25, [R * 1.25, R * 0.9, R], 0, c) }
      }
    } else {
      for (let lobe = 0; lobe < 5; lobe++) {
        const a = r() * 6.28, d = h * 0.12 * r(), cy = y0 + h * (0.6 + r() * 0.22), RR = h * (0.15 + r() * 0.06), cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d
        for (let k = 0; k < 190; k++) {
          const th = r() * 6.28, ph = Math.acos(2 * r() - 1), rr = RR * Math.pow(r(), 0.3)
          const p: V3 = [cx + Math.sin(ph) * Math.cos(th) * rr, cy + Math.cos(ph) * rr * 0.8, cz + Math.sin(ph) * Math.sin(th) * rr]
          c.copy(dk2).lerp(lt2, Math.max(0, Math.min(1, (p[1] - cy) / RR * 0.5 + 0.45 + (r() - 0.5) * 0.4)))
          B.add(card, p, r() * 6.28, r() * 3, 1 + r() * 0.8, r() * 3, c)
        }
      }
    }
    if (i % 6 === 0) yield
  }
  return { w: fuse(wood), c: B.build() }
}
function Forest() {
  const g = useJob('forest', forestJob, 9)
  if (!g) return null
  return <>
    <mesh geometry={g.w} castShadow><Flesh rough={0.95} /></mesh>
    <mesh geometry={g.c} castShadow receiveShadow><Plant rough={0.8} /></mesh>
  </>
}
/** 一丛麦子：七八根麦秆，顶上一个麦穗（压扁的长纺锤，带芒）；高 1 */
function wheatGeo() {
  const r = rng(8), list: THREE.BufferGeometry[] = []
  for (let i = 0; i < 8; i++) {
    const a = r() * 6.28, d = r() * 0.06, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.85 + r() * 0.2, lean = (r() - 0.5) * 0.12
    const st = new THREE.BufferGeometry(), pos: number[] = [], col: number[] = [], idx: number[] = []
    for (let k = 0; k <= 3; k++) { const u = k / 3, w = 0.004; for (const sd of [-1, 1]) { pos.push(x + sd * w + lean * u * u, u * h, z); col.push(0.55 + u * 0.2, 0.5 + u * 0.18, 0.25) } }
    for (let k = 0; k < 3; k++) { const q = k * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2) }
    st.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); st.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); st.setIndex(idx); st.computeVertexNormals()
    list.push(st)
    const ear = new THREE.OctahedronGeometry(1, 0); ear.scale(0.012, 0.045, 0.008)
    list.push(place(tint(ear, '#b99848', '#e2c878'), [x + lean, h + 0.035, z], r() * 6.28, (r() - 0.5) * 0.3))
    for (let k = 0; k < 1; k++) list.push(tube([[x + lean, h + 0.03 + k * 0.02, z], [x + lean + (r() - 0.5) * 0.02, h + 0.1 + k * 0.02, z + (r() - 0.5) * 0.02]], 0.0008, 0.0004, '#d8c27a', '#efe0a8', 3, 2))
  }
  return fuse(list)
}
/** 砖墙、瓦顶的贴图 */
function makeBrick() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d')!, r = rng(3)
  g.fillStyle = '#d8cfc0'; g.fillRect(0, 0, 256, 256)
  for (let row = 0; row < 16; row++) for (let k = -1; k < 9; k++) { const x = k * 32 + (row % 2) * 16, y = row * 16; const v = 0.85 + r() * 0.3; g.fillStyle = `rgb(${150 * v | 0},${78 * v | 0},${58 * v | 0})`; g.fillRect(x + 1.5, y + 1.5, 29, 13) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t
}
function makeTiles() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d')!, r = rng(5)
  g.fillStyle = '#2f3336'; g.fillRect(0, 0, 256, 256)
  for (let row = 0; row < 16; row++) for (let k = 0; k < 16; k++) { const v = 0.8 + r() * 0.35, x = k * 16 + (row % 2) * 8, y = row * 16; const gr = g.createLinearGradient(x, y, x + 14, y); gr.addColorStop(0, `rgb(${70 * v | 0},${76 * v | 0},${80 * v | 0})`); gr.addColorStop(0.5, `rgb(${100 * v | 0},${106 * v | 0},${110 * v | 0})`); gr.addColorStop(1, `rgb(${60 * v | 0},${64 * v | 0},${68 * v | 0})`); g.fillStyle = gr; g.fillRect(x, y, 14, 14) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t
}
function Farm() {
  const mat = useWindMat()
  const wheat = useMemo(wheatGeo, [])
  const F = { x0: ST.farm.x - 20, x1: ST.farm.x + 20, z0: ST.farm.z - 10, z1: ST.farm.z + 12 }
  const ims = useLazy('wheat', () => {
    const r = rng(3), out: THREE.Matrix4[] = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), P = new THREE.Vector3(), Sc = new THREE.Vector3()
    for (let z = F.z0; z < F.z1; z += 0.34) for (let x = F.x0; x < F.x1; x += 0.3) {
      const xx = x + (r() - 0.5) * 0.12, zz = z + (r() - 0.5) * 0.08, s = 0.85 + r() * 0.3
      m.compose(P.set(xx, ground(xx, zz), zz), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28), Sc.set(s, s, s)); out.push(m.clone())
    }
    return out
  })   // eslint-disable-line react-hooks/exhaustive-deps
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => { const im = ref.current; if (!im || !ims) return; ims.forEach((mm, i) => im.setMatrixAt(i, mm)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere() }, [ims])
  const straw = useMemo(() => { const g = new THREE.PlaneGeometry(F.x1 - F.x0 + 1, F.z1 - F.z0 + 1, 40, 24); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (F.x0 + F.x1) / 2, z = p.getZ(i) + (F.z0 + F.z1) / 2; p.setXYZ(i, x, ground(x, z) + 0.03, z) } g.computeVertexNormals(); return g }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  const brick = useMemo(() => { const t = makeBrick(); t.repeat.set(4, 1.4); return t }, []), brick2 = useMemo(() => { const t = makeBrick(); t.repeat.set(2.6, 1.4); return t }, []), tiles = useMemo(() => { const t = makeTiles(); t.repeat.set(5, 2.4); return t }, [])
  const wood = useMemo(() => { const t = makeWood('#7a5a3a'); t.repeat.set(1, 2); return t }, [])
  const hx = ST.farm.x + 4, hz = ST.farm.z + 19, hy = ground(hx, hz)
  return <>
    <mesh geometry={straw} receiveShadow><meshStandardMaterial color="#a8904e" roughness={1} /></mesh>
    {ims && <instancedMesh ref={ref} args={[wheat, mat, ims.length]} castShadow receiveShadow />}
    {/* 农舍：砖墙、灰瓦的双坡屋顶、木门、带窗框的窗、烟囱 */}
    <group position={[hx, hy, hz]} rotation-y={0.1}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow><boxGeometry args={[9.3, 0.5, 6.3]} /><meshStandardMaterial color="#8a847a" roughness={1} /></mesh>
      {[[0, -3, 9, 0], [0, 3, 9, 0], [-4.5, 0, 6, 1], [4.5, 0, 6, 1]].map(([x, z, L, rot], i) => <mesh key={i} position={[x, 1.85, z]} rotation-y={rot ? Math.PI / 2 : 0} castShadow receiveShadow><boxGeometry args={[L, 2.7, 0.3]} /><meshStandardMaterial map={rot ? brick2 : brick} roughness={0.95} /></mesh>)}
      <mesh position={[0, 3.25, 0]} rotation-y={Math.PI / 2} castShadow><extrudeGeometry args={[new THREE.Shape([new THREE.Vector2(-3.1, 0), new THREE.Vector2(3.1, 0), new THREE.Vector2(0, 1.75)]), { depth: 9.1, bevelEnabled: false }]} /><meshStandardMaterial color="#c9b8a0" roughness={0.95} /></mesh>
      {[1, -1].map(s => <mesh key={s} position={[0, 4.12, s * 1.66]} rotation-x={s * 0.515} castShadow receiveShadow><boxGeometry args={[10.2, 0.14, 4.0]} /><meshStandardMaterial map={tiles} roughness={0.7} /></mesh>)}
      <mesh position={[0, 5.03, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.14, 0.14, 10.3, 10]} /><meshStandardMaterial color="#3a3e40" roughness={0.6} /></mesh>
      <mesh position={[2.8, 5.0, 1.2]} castShadow><boxGeometry args={[0.6, 1.6, 0.6]} /><meshStandardMaterial map={brick2} roughness={0.95} /></mesh>
      <mesh position={[1.4, 1.5, -3.17]}><boxGeometry args={[1.1, 2.0, 0.06]} /><meshStandardMaterial map={wood} roughness={0.8} /></mesh>
      {[-2.4, 3.4].map(x => <group key={x} position={[x, 1.95, -3.16]}>
        <mesh><boxGeometry args={[1.3, 1.1, 0.06]} /><meshStandardMaterial color="#e8e2d6" roughness={0.8} /></mesh>
        <mesh position={[0, 0, -0.02]}><boxGeometry args={[1.1, 0.9, 0.04]} /><meshPhysicalMaterial color="#2a3a44" roughness={0.08} metalness={0.2} clearcoat={1} /></mesh>
        <mesh position={[0, 0, -0.045]}><boxGeometry args={[0.05, 0.9, 0.02]} /><meshStandardMaterial color="#e8e2d6" /></mesh>
      </group>)}
    </group>
  </>
}
function Mountains() {
  const g = useLazy('mountains', () => {
    const geo = new THREE.PlaneGeometry(1, 1, 220, 18), p = geo.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color()
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, a = u * Math.PI * 2, R = 560 + 60 * Math.sin(a * 3 + 1)
      const peak = 40 + 70 * Math.max(0, fbm(Math.cos(a) * 3, 2, Math.sin(a) * 3, 4) + 0.35) + 25 * Math.abs(Math.sin(a * 7))
      const y = v * peak * (1 + 0.15 * fbm(u * 40, v * 3, 0, 2)) - 10
      p.setXYZ(i, Math.cos(a) * (R + (1 - v) * 40), y, Math.sin(a) * (R + (1 - v) * 40))
      col.set('#5d6f5e').lerp(new THREE.Color('#8b9aa4'), v * 0.7); if (y > 95) col.lerp(new THREE.Color('#e8edf0'), 0.8)
      c.set([col.r, col.g, col.b], i * 3)
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); geo.computeVertexNormals()
    return geo
  })
  if (!g) return null
  return <mesh geometry={g}><meshStandardMaterial vertexColors roughness={1} side={THREE.DoubleSide} /></mesh>
}

// ---------- 观察桌 ----------
export const TABLE_H = 0.76
function Table() {
  const wood = useMemo(() => { const t = makeWood('#a07a4e', '70,48,26', '200,166,118', 5, 7); t.repeat.set(1, 1); return t }, [])
  const x = ST.table.x, z = ST.table.z, y = ground(x, z)
  return (
    <group position={[x, y, z]}>
      <RoundedBox args={[1.6, 0.04, 0.8]} radius={0.012} position={[0, TABLE_H - 0.02, 0]} castShadow receiveShadow><meshStandardMaterial map={wood} roughness={0.7} /></RoundedBox>
      {[[-0.74, -0.34], [0.74, -0.34], [-0.74, 0.34], [0.74, 0.34]].map(([lx, lz], i) => <RoundedBox key={i} args={[0.05, TABLE_H - 0.04, 0.05]} radius={0.008} position={[lx, (TABLE_H - 0.04) / 2, lz]} castShadow><meshStandardMaterial color="#7a5a38" roughness={0.8} /></RoundedBox>)}
      <mesh position={[0, 0.18, 0.34]} castShadow><boxGeometry args={[1.48, 0.03, 0.03]} /><meshStandardMaterial color="#7a5a38" roughness={0.8} /></mesh>
      {/* 记录本、铅笔 */}
      <RoundedBox args={[0.21, 0.012, 0.29]} radius={0.003} position={[-0.42, TABLE_H + 0.006, 0.12]} rotation-y={0.25} castShadow><meshStandardMaterial color="#2e4a5e" roughness={0.7} /></RoundedBox>
      <mesh position={[-0.42, TABLE_H + 0.013, 0.12]} rotation={[-Math.PI / 2, 0, 0.25]}><planeGeometry args={[0.19, 0.27]} /><meshStandardMaterial color="#f2efe6" roughness={0.9} /></mesh>
      <mesh position={[-0.3, TABLE_H + 0.006, 0.2]} rotation={[0, 0.9, Math.PI / 2]} castShadow><cylinderGeometry args={[0.004, 0.004, 0.17, 6]} /><meshStandardMaterial color="#e0b53a" roughness={0.5} /></mesh>
    </group>
  )
}

// ---------- 远处的羊群、天上的鹰 ----------
const FLOCK: [number, number, number][] = [[-8, -16, 0.3], [-5.5, -18, 1.4], [-10, -19.5, 2.2], [-3, -15, -0.6], [-7, -21.5, 0.9], [-12.5, -16.5, 2.8], [-1.5, -19, 3.4]]
function Soaring() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { const t = clock.elapsedTime * 0.12, g = ref.current; if (!g) return; g.position.set(Math.cos(t) * 26 + 8, 32 + Math.sin(t * 2) * 2, Math.sin(t) * 26 - 12); g.rotation.set(0.25, -t - Math.PI / 2, 0) })
  return <group ref={ref}><group scale={1.1}><Eagle fly /></group></group>
}

/** 宽谷里草被吃光的地方露出黄土：一块贴着地面起伏的薄片，边缘渐隐 */
function BareSoil({ k }: { k: number }) {
  const { geo, alpha } = useMemo(() => {
    const g = new THREE.PlaneGeometry(56, 56, 70, 70); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + ST.valley.x, z = p.getZ(i) + ST.valley.z; p.setXYZ(i, x, ground(x, z) + 0.035, z) }
    g.computeVertexNormals()
    const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d')!, r = rng(4)
    const grd = ctx.createRadialGradient(128, 128, 30, 128, 128, 128); grd.addColorStop(0, '#fff'); grd.addColorStop(1, '#000'); ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(0,0,0,${r() * 0.5})`; ctx.beginPath(); ctx.arc(r() * 256, r() * 256, 2 + r() * 7, 0, 6.3); ctx.fill() }
    return { geo: g, alpha: new THREE.CanvasTexture(c) }
  }, [])
  if (k <= 0.01) return null
  return <mesh geometry={geo} receiveShadow renderOrder={1}><meshStandardMaterial color="#8a7350" roughness={1} transparent opacity={k} alphaMap={alpha} depthWrite={false} polygonOffset polygonOffsetFactor={-2} /></mesh>
}

export function World({ want }: { want?: Want }) {
  const v = want?.valley ?? 80
  return (
    <group>
      <Terrain />
      <Grass valley={v} />
      <BareSoil k={Math.max(0, Math.min(0.85, (70 - v) / 70))} />
      <Flowers />
      <Shrubs />
      <Rocks />
      <Lake />
      <Forest />
      <LoneTrees />
      <Farm />
      <Mountains />
      <Table />
      <Log at={onGround(LOG.x, LOG.z, -0.04)} yaw={LOG.yaw} />
      <Log at={onGround(LOG2.x, LOG2.z, -0.04)} yaw={LOG2.yaw} />
      {FLOCK.map(([x, z, yaw], i) => <Sheep key={i} position={onGround(x, z, -0.01)} rotation-y={yaw} seed={i} />)}
      <Soaring />
    </group>
  )
}
