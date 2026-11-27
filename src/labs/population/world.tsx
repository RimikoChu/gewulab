// 种群和生态系统实验室的大场景：一座孤岛。四周是海和一圈沙滩，岛上是起伏的草地，西边到北边是树林，北面一座小山；
// 岛东的高处有一座观测站（板房、太阳能板、百叶箱、风速仪、天线），岛上几处立着野外监测屏，东南和西南各有一条木栈桥。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。各课的位置和机位写在 SITE、SPOT 里。1 个单位 = 1 m，x 朝东，z 朝南。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import { LabStage, Metal, Rod, useRipple, type Label } from '@/lab-kit'
import { BoardFrame, type Size } from './board'
import type { Area } from './animals'
import { ell, fbm, lin, mix3, nets, sstep, type V3 } from './sdf'
import { useJob } from './job'
import { Batch, Flesh, Plant, fuse, leafCard, leafGeo, lerp, makeWood, place, rng, tint, tube } from './parts'

/** 海岸线离岛心多远（m）：随方向变，岸线才有岬角和海湾 */
const RAD = (th: number) => 150 + 16 * Math.sin(2 * th + 0.5) + 9 * Math.sin(3 * th + 1.2) + 5 * Math.sin(5 * th)
/** 沿着 th 方向、离岛心 d 倍岸线距离的那一点 */
export const coast = (th: number, d = 1): [number, number] => [Math.cos(th) * RAD(th) * d, Math.sin(th) * RAD(th) * d]
const rel = (x: number, z: number) => Math.hypot(x, z) / RAD(Math.atan2(z, x))
// ---------- 各课的位置 ----------
const STATION = { x: 80, z: 3, R: 10 }
/** 一处带监测屏的观测点：屏立在 (x, z)，朝着方位角 az 的方向（机位也在那一边）。front(a, b)：屏前 b 米、向右 a 米的那一点 */
function site(x: number, z: number, az: number, size: Size = { w: 8, h: 4.6, lift: 0.9 }) {
  const c = Math.cos(az), s = Math.sin(az)
  const front = (a: number, b: number): [number, number] => [x + a * c + b * s, z - a * s + b * c]
  const area = (a: number, b: number, rx: number, rz: number): Area => { const [ax, az2] = front(a, b); return { x: ax, z: az2, rx, rz, az } }
  return { x, z, az, ...size, front, area }
}
export const SITE = {
  station: site(70, 13, -0.25),            // 第 3 课：观测站前
  beach: site(...coast(1.7, 0.85), 1.76),  // 第 4 课：岛南海边的登陆点，顺着海岸往西看
  meadow: site(0, -6, 0.15),               // 第 5 课：中央草场
  edge: site(-58, -40, 0.7),               // 第 6 课：西北林缘
  slope: site(40, -46, 0.3),               // 第 7 课：北坡草地
  fish: site(...coast(2.27, 0.9), 2.05, { w: 5.2, h: 3.2, lift: 0.9 }),   // 拓展：西南栈桥边的渔场屏
}
export type SiteKey = keyof typeof SITE
/** 第 1 课的调查地块（10 m × 10 m）中心；第 2 课的捕捉围栏和兔群 */
export const PLOT = { x: 2, z: 72, half: 5 }
export const PEN = { x: -75, z: 6, R: 3.3 }
export const WARREN: Area = { x: -66, z: 15, rx: 9.5, rz: 5.2, az: 0.55 }
/** 两条栈桥：伸出去的方向（从岛心看的方位） */
export const PIER = { beach: 1.93, fish: 2.27 }

// ---------- 地形 ----------
function rawGround(x: number, z: number) {
  const d = rel(x, z)
  if (d >= 1) return Math.max(-9, -(d - 1) * 38)
  const edge = d > 0.8 ? 5 * (1 - Math.pow((d - 0.8) / 0.2, 1.6)) : 5, k = sstep(0.93, 0.7, d)
  let h = edge + k * (0.8 * Math.sin(x * 0.031 + 1.3) * Math.cos(z * 0.037 - 0.4) + 0.45 * Math.sin(x * 0.07 + z * 0.05) + 0.4 * fbm(x * 0.025, 0, z * 0.025, 2))
  h += k * 24 * Math.exp(-((x + 25) ** 2 + (z + 98) ** 2) / 1700)      // 北面的小山
  h += k * 3.2 * Math.exp(-((x - STATION.x) ** 2 + (z - STATION.z) ** 2) / 520)   // 观测站所在的高地
  return h
}
/** 各课脚下推平的地方：[x, z, 半径, 推平到多高] */
const FLATS: [number, number, number, number][] = ([[STATION.x, STATION.z, STATION.R], [PLOT.x, PLOT.z, 11], [-70, 11, 18], ...(Object.values(SITE).map(S => [...S.front(0, 4.5), 16]))] as [number, number, number][]).map(([x, z, R]) => [x, z, R, rawGround(x, z)])
const STATION_Y = FLATS[0][3]
/** 地面高度（海面是 0） */
export function ground(x: number, z: number) {
  let h = rawGround(x, z)
  for (const [fx, fz, R, y] of FLATS) { const d = Math.hypot(x - fx, z - fz); if (d < R) h = lerp(h, y, sstep(R, R * 0.55, d)) }
  return h
}
export const onGround = (x: number, z: number, dy = 0): V3 => [x, ground(x, z) + dy, z]

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
const bySite = (k: SiteKey, w: number, h: number, el: number, b = 2.4, dy = 2.5, a = 0) => { const S = SITE[k], [x, z] = S.front(a, b); return spot(x, ground(S.x, S.z) + dy, z, w, h, [S.az, el]) }
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  s1: spot(PLOT.x, ground(PLOT.x, PLOT.z) + 0.5, PLOT.z + 0.9, 13.2, 6.6, [-0.36, 0.36]),
  s2: spot(-70, ground(-70, 11) + 0.9, 10, 20, 8.5, [0.55, 0.4]),
  s3: bySite('station', 12.5, 7, 0.27, 2.1, 2.6),
  s4: bySite('beach', 12.5, 7, 0.21, 2.1, 2.6),
  s5: bySite('meadow', 12.5, 7, 0.3, 2.1, 2.6),
  s6: bySite('edge', 13.5, 7.2, 0.27, 2.1, 2.6, 0.8),
  s7: bySite('slope', 12, 6.8, 0.32, 2.1, 2.5),
  xCarbon: spot(0, 20, -4, 262, 128, [0.35, 0.5]),
  xFish: bySite('fish', 7.6, 4.6, 0.2, 1.2, 1.9, 0.2),
  q: spot(0, 6, 0, 226, 90, [2.5, 0.24]),
}
export type SpotKey = keyof typeof SPOT
/** 数量增长的课：兔少的时候镜头贴近兔群（监测屏在侧后方），兔多起来再一档一档拉远，最后回到这一处的默认机位。n 是画面里兔的只数 */
export function herdShot(k: SiteKey, at: SpotKey, n: number): { span?: [number, number]; shift?: V3; view?: [number, number] } {
  const S = SITE[k], T = SPOT[at].target, stage = n <= 8 ? 0 : n <= 40 ? 1 : n <= 130 ? 2 : 3
  if (stage === 3) return {}
  const [b, dy, w, h, da, el] = [[5, 0.45, 4.6, 2.7, 0.62, 0.25], [3.9, 1.7, 9.4, 5.4, 0.3, 0.26], [3, 2.1, 11.2, 6.3, 0.14, 0.27]][stage]
  const [x, z] = S.front(0, b)
  return { span: [w, h], shift: [x - T.x, ground(x, z) + dy - T.y, z - T.z], view: [S.az + da, el] }
}
/** 这一课对整个世界的要求：dry 是中央草场退化的程度（0–1，第 5 课） */
export interface Want { dry?: number }
/** 每一课用它代替 LabStage：只要说在哪一处。shift 把看向的点挪一点，span 换一个取景范围，view 换一个角度；far 用在看整座岛的远景上 */
export function Room({ at, labels, children = null, span, shift, view, bloom = 0.45, world, far = false }: { at: SpotKey; labels: Label[]; children?: ReactNode; span?: [number, number]; shift?: V3; view?: [number, number]; bloom?: number; world?: Want; far?: boolean }) {
  const v = SPOT[at], sx = shift?.[0] ?? 0, sy = shift?.[1] ?? 0, sz = shift?.[2] ?? 0, w = span?.[0] ?? v.span[0], h = span?.[1] ?? v.span[1]
  const target = useMemo(() => v.target.clone().add(new THREE.Vector3(sx, sy, sz)), [v, sx, sy, sz])
  const sp = useMemo<[number, number]>(() => [w, h], [w, h])
  const vw = useMemo<[number, number]>(() => view ?? v.view, [view?.[0], view?.[1], v])   // eslint-disable-line react-hooks/exhaustive-deps
  const fog = useMemo<[number, number]>(() => (far ? [420, 1700] : [180, 1100]), [far])
  return <LabStage labels={labels} target={target} span={sp} view={vw} sun={3.3} env={0.95} fog={fog} bloom={bloom} world={world}>{children}</LabStage>
}

// ---------- 地面和海 ----------
/** 草皮贴图：灰底上几千道短短的草叶笔触；乘上地面的颜色，远处看是一片毛茸茸的草，不是一块平板 */
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
  const geo = useJob('terrain', function* () {
    const S = 1100, N = 330, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color()
    const green = new THREE.Color('#5f7d33'), dry = new THREE.Color('#8d8a4c'), lush = new THREE.Color('#47672a'), sand = new THREE.Color('#d8c79c'), wet = new THREE.Color('#a8956c'), rock = new THREE.Color('#7f7a6c'), floor = new THREE.Color('#4a5a2c'), deep = new THREE.Color('#0f3d4f')
    for (let i = 0; i < p.count; i++) {
      // 网格中间密、外面疏：把均匀的格点往中心挤
      let x = p.getX(i), z = p.getZ(i); const rr = Math.hypot(x, z) / (S / 2), k = rr < 1e-6 ? 1 : Math.pow(rr, 1.6) / rr; x *= k; z *= k
      const h = ground(x, z); p.setXYZ(i, x, h, z)
      const n = fbm(x * 0.05, 1, z * 0.05, 3)
      col.copy(green).lerp(dry, Math.max(0, Math.min(1, 0.25 + n * 1.3))).lerp(lush, Math.max(0, -n * 0.8))
      if (inForest(x, z)) col.lerp(floor, 0.55)
      if (h > 17) col.lerp(rock, Math.min(0.7, (h - 17) / 8))
      if (h < 2.6) col.lerp(sand, sstep(2.6, 1.5, h))
      if (h < 0.5) col.lerp(wet, sstep(0.5, -0.4, h))
      if (h < -1.5) col.lerp(deep, sstep(-1.5, -7, h))
      c.set([col.r, col.g, col.b], i * 3)
      if (i % 4000 === 0) yield
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); yield; g.computeVertexNormals()
    return g
  }, 1)
  const tex = useMemo(() => { const t = makeTurf(); t.repeat.set(860, 860); return t }, [])
  if (!geo) return null
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial vertexColors map={tex} roughness={1} envMapIntensity={0.5} /></mesh>
}
function Sea() {
  const nrm = useRipple(560, 0.02)
  // 三层不同大小、不同朝向的波纹叠在一起：从高处看不再是一格一格重复的纹路
  const water = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color: '#1b6a80', roughness: 0.24, metalness: 0.05, transparent: true, opacity: 0.86, envMapIntensity: 0.75, normalMap: nrm, normalScale: new THREE.Vector2(0.34, 0.34) })
    m.onBeforeCompile = s => {
      s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_maps>', `
        vec2 wuv = vNormalMapUv;
        vec3 w1 = texture2D( normalMap, wuv ).xyz * 2.0 - 1.0;
        vec3 w2 = texture2D( normalMap, mat2( 0.8, -0.6, 0.6, 0.8 ) * wuv * 0.2317 + vec2( 0.37, 0.11 ) ).xyz * 2.0 - 1.0;
        vec3 w3 = texture2D( normalMap, mat2( 0.28, 0.96, -0.96, 0.28 ) * wuv * 0.0473 + vec2( 0.61, 0.83 ) ).xyz * 2.0 - 1.0;
        vec3 w4 = texture2D( normalMap, mat2( -0.6, 0.8, -0.8, -0.6 ) * wuv * 0.0091 ).xyz * 2.0 - 1.0;
        float wk = 0.55 + 0.45 * w4.x * 3.0;
        vec3 mapN = normalize( vec3( w1.xy * 0.45 * wk + w2.xy * 0.8 + w3.xy * 0.9, 1.0 ) );
        mapN.xy *= normalScale;
        normal = normalize( tbn * mapN );
        diffuseColor.rgb *= 0.97 + 0.05 * w4.y + 0.03 * w3.x;`)
    }
    return m
  }, [nrm])
  // 岸边的一圈白沫：沿海岸线的一条带子
  const foam = useMemo(() => {
    const N = 360, pos: number[] = [], idx: number[] = []
    for (let i = 0; i <= N; i++) { const th = (i / N) * Math.PI * 2, w = 0.006 + 0.004 * Math.sin(th * 9); const [a, b] = coast(th, 0.999 - w), [c, d] = coast(th, 1.003 + w); pos.push(a, 0.05, b, c, 0.05, d) }
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
  }, [])
  const fm = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => { if (fm.current) fm.current.opacity = 0.34 + 0.14 * Math.sin(clock.elapsedTime * 0.8) })
  return <>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow><circleGeometry args={[4200, 96]} /><primitive object={water} attach="material" /></mesh>
    <mesh position={[0, -9.5, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[4200, 48]} /><meshBasicMaterial color="#0f3d4f" /></mesh>
    <mesh geometry={foam}><meshBasicMaterial ref={fm} color="#f4fbfb" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </>
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
function useWindMat() {
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, side: THREE.DoubleSide, envMapIntensity: 0.55 })
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
  }, [])
  useFrame(({ clock }) => { const s = mat.userData.shader; if (s) s.uniforms.uTime.value = clock.elapsedTime })
  return mat
}
const herdOf = (k: SiteKey, b = 8): [number, number] => SITE[k].front(0, b)
/** 草长得密的地方：每一课的位置附近。[x, z, 半径, 每平方米几丛, 靠中心的草矮多少] */
const DENSE: [number, number, number, number, number][] = [
  [PLOT.x - 3, PLOT.z + 4, 19, 22, 0.75], [WARREN.x + 2, WARREN.z + 3, 22, 18, 0.6], [...herdOf('station'), 19, 20, 0.6], [...herdOf('beach'), 19, 18, 0.6],
  [...herdOf('meadow'), 19, 20, 0.6], [...SITE.edge.front(1, 8), 20, 18, 0.6], [...herdOf('slope'), 19, 20, 0.65], [...herdOf('fish', 6), 14, 16, 0.7],
]
const MEADOW = herdOf('meadow')
/** 这一处不长草：沙滩、板房脚下、屏的墩子 */
const bare = (x: number, z: number) => ground(x, z) < 2.3 || (Math.abs(x - STATION.x - 2) < 4.2 && Math.abs(z - STATION.z + 3) < 2.8)
/** 这一处的草剪短：调查地块里、捕捉围栏里 */
const shortAt = (x: number, z: number) => (Math.abs(x - PLOT.x) < PLOT.half + 0.4 && Math.abs(z - PLOT.z) < PLOT.half + 0.4) || Math.hypot(x - PEN.x, z - PEN.z) < PEN.R + 0.3
interface Patch { k: number; mats: THREE.Matrix4[]; v?: boolean; far?: boolean }
/** 草丛的位置：分几帧算完（job.ts），进页面不卡 */
function* grassJob(): Generator<void, Patch[]> {
  const r = rng(20261127), out: Patch[] = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), P = new THREE.Vector3(), Sc = new THREE.Vector3()
  const fill = (list: THREE.Matrix4[], x: number, z: number, s: number) => {
    if (bare(x, z)) return
    const k = shortAt(x, z) ? 0.32 : 1, h = s * (0.6 + r() * 0.7) * k, w = s * (0.8 + r() * 0.6)
    m.compose(P.set(x, ground(x, z) - 0.01, z), q.setFromEuler(e.set((r() - 0.5) * 0.2, r() * 6.28, (r() - 0.5) * 0.2)), Sc.set(w, h, w))
    list.push(m.clone())
  }
  for (const [cx, cz, R, per, low] of DENSE) {
    const n = Math.round(Math.PI * R * R * per), lists: THREE.Matrix4[][] = [[], [], []]
    for (let i = 0; i < n; i++) { const a = r() * 6.28, d = R * Math.sqrt(r()); if (d > R * 0.7 && r() < (d / R - 0.7) * 2.5) continue; fill(lists[i % 3], cx + Math.cos(a) * d, cz + Math.sin(a) * d, (0.12 + r() * 0.1) * (d < R * 0.6 ? low : 1)); if (i % 3000 === 0) yield }
    lists.forEach((l, k) => { for (let a = 0; a < l.length; a += 4000) out.push({ k, mats: l.slice(a, a + 4000), v: cx === MEADOW[0] && cz === MEADOW[1] }) })
  }
  // 远处：40 m 一块，草丛少几根叶子
  for (let gx = -160; gx < 160; gx += 40) for (let gz = -160; gz < 160; gz += 40) {
    const lists: THREE.Matrix4[][] = [[], [], []]
    for (let i = 0; i < 3000; i++) fill(lists[i % 3], gx + r() * 40, gz + r() * 40, 0.18 + r() * 0.22)
    lists.forEach((l, k) => out.push({ k, mats: l, far: true }))
    yield
  }
  return out.filter(p => p.mats.length)
}
function Grass({ dry = 0 }: { dry?: number }) {
  const mat = useWindMat(), vmat = useWindMat()
  // 中央草场的草：退化以后枯黄（第 5 课）
  vmat.color.set('#ffffff').lerp(new THREE.Color('#a8824a'), Math.max(0, Math.min(1, dry)))
  const geos = useMemo(() => [tuftGeo(1, 11), tuftGeo(2, 11), tuftGeo(3, 11)], [])
  const farGeos = useMemo(() => [tuftGeo(4, 6, 2), tuftGeo(5, 6, 2), tuftGeo(6, 6, 2)], [])
  const patches = useJob('grass', grassJob, 4)
  // 一块一块地放进场景：几十万丛草的位置一次写进显卡会卡一下
  const [shown, setShown] = useState(0)
  useEffect(() => { if (!patches || shown >= patches.length) return; const t = setTimeout(() => setShown(n => n + 2), 24); return () => clearTimeout(t) }, [patches, shown])
  if (!patches) return null
  return <>{patches.slice(0, shown).map((p, i) => <GrassPatch key={i} geo={(p.far ? farGeos : geos)[p.k]} mat={p.v ? vmat : mat} mats={p.mats} />)}</>
}
function GrassPatch({ geo, mat, mats }: { geo: THREE.BufferGeometry; mat: THREE.Material; mats: THREE.Matrix4[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => { const im = ref.current; if (!im) return; mats.forEach((mm, j) => im.setMatrixAt(j, mm)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere() }, [mats])
  return <instancedMesh ref={ref} args={[geo, mat, mats.length]} receiveShadow />
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
/** 草地上一小片一小片的野花：白的、紫的、红的（黄的留给第 1 课的蒲公英） */
function Flowers() {
  const geos = useMemo(() => [flowerGeo('#f3f0ea', '#e6b93a', 7, 2), flowerGeo('#a487c8', '#f0d36a', 6, 3), flowerGeo('#e46a6a', '#4a2a2a', 5, 4)], [])
  const lists = useJob('flowers', function* () {
    const r = rng(77), out: THREE.Matrix4[][] = [[], [], []], m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
    const put = (x: number, z: number, k: number) => { if (bare(x, z) || Math.hypot(x - PLOT.x, z - PLOT.z) < 12) return; const s = 1 + r() * 0.9; m.compose(new THREE.Vector3(x, ground(x, z), z), q.setFromAxisAngle(up, r() * 6.28), new THREE.Vector3(s, s, s)); out[k].push(m.clone()) }
    for (const [cx, cz, R] of DENSE) { for (let c = 0; c < 16; c++) { const a = r() * 6.28, d = R * (0.2 + r() * 0.9), x0 = cx + Math.cos(a) * d, z0 = cz + Math.sin(a) * d, k = Math.floor(r() * 3); for (let i = 0; i < 30; i++) put(x0 + (r() - 0.5) * 2.6, z0 + (r() - 0.5) * 2.6, k) } yield }
    for (let c = 0; c < 90; c++) { const a = r() * 6.28, d = 8 + r() * 120, x0 = Math.cos(a) * d, z0 = Math.sin(a) * d, k = Math.floor(r() * 3); for (let i = 0; i < 24; i++) put(x0 + (r() - 0.5) * 4, z0 + (r() - 0.5) * 4, k); if (c % 20 === 0) yield }
    return out
  }, 8)
  const refs = useRef<(THREE.InstancedMesh | null)[]>([])
  useEffect(() => { lists?.forEach((l, k) => { const im = refs.current[k]; if (!im) return; l.forEach((mm, i) => im.setMatrixAt(i, mm)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere() }) }, [lists])
  if (!lists) return null
  return <>{lists.map((l, k) => <instancedMesh key={k} ref={e => { refs.current[k] = e }} args={[geos[k], undefined, l.length]} castShadow frustumCulled={false}><meshStandardMaterial vertexColors roughness={0.6} side={THREE.DoubleSide} /></instancedMesh>)}</>
}

// ---------- 树林、灌丛、石头 ----------
const CLEAR: [number, number, number][] = [[PLOT.x, PLOT.z, 26], [WARREN.x, WARREN.z, 24], [PEN.x, PEN.z, 12], [SITE.station.x, SITE.station.z, 30], [SITE.beach.x, SITE.beach.z, 30], [0, 0, 36], [SITE.edge.front(0, 6)[0], SITE.edge.front(0, 6)[1], 24], [SITE.slope.front(0, 6)[0], SITE.slope.front(0, 6)[1], 26]]
/** 树林盖着岛的西边到北边 */
function inForest(x: number, z: number) {
  const d = rel(x, z), th = Math.atan2(z, x)
  if (d < 0.3 || d > 0.86) return false
  if (!(th > 2.75 || th < -0.45)) return false
  return !CLEAR.some(([a, b, R]) => (x - a) ** 2 + (z - b) ** 2 < R * R)
}
/** 树林：阔叶树（一团团叶片冠）和针叶树（一层层下垂的枝叶），按棵分几帧生成 */
function* forestJob(): Generator<void, { w: THREE.BufferGeometry; c: THREE.BufferGeometry }[]> {
  const r = rng(17), out: { w: THREE.BufferGeometry; c: THREE.BufferGeometry }[] = []
  let wood: THREE.BufferGeometry[] = [], B = new Batch()
  const card = leafCard(0.32), c = new THREE.Color()
  const spray = leafGeo({ len: 1, wid: 0.42, basePow: 0.5, tipPow: 0.7, curl: 0.35, fold: 0.15, base: '#ffffff', tip: '#ffffff', nu: 4, nv: 1 }).toNonIndexed()
  const dark = new THREE.Color('#1c3420'), mid = new THREE.Color('#2f5230'), dk2 = new THREE.Color('#233c1e'), lt2 = new THREE.Color('#6f9446')
  // 林子外面零星的几棵
  const lone: [number, number][] = [[26, 50], [-24, 56], [46, 34], [-30, 30], [96, -22], [30, -16], [98, 44], [58, -84], [44, 96], [-58, 78], [104, 12], [70, 70]]
  let made = 0, tries = 0
  while (made < 190 && tries < 6000) {
    tries++
    let x: number, z: number
    if (made < lone.length) [x, z] = lone[made]; else { const a = r() * 6.28, d = 30 + r() * 130; x = Math.cos(a) * d; z = Math.sin(a) * d; if (!inForest(x, z)) continue }
    const y0 = ground(x, z), h = 8 + r() * 7, conifer = made >= lone.length && r() < 0.42
    made++
    wood.push(tube([[x, y0 - 0.3, z], [x + (r() - 0.5) * 0.3, y0 + h * 0.5, z], [x + (r() - 0.5) * 0.3, y0 + h * (conifer ? 0.98 : 0.7), z]], h * 0.028, h * 0.01, '#4b3a2c', '#5d4a38', 7, 8))
    if (conifer) {
      const tiers = 17
      for (let t = 0; t < tiers; t++) {
        const u = t / (tiers - 1), R = h * 0.2 * (1 - u * 0.9) + 0.2, yy = y0 + h * (0.2 + u * 0.78), n = Math.round(9 + (1 - u) * 6)
        for (let k = 0; k < n; k++) {
          const a = (k / n) * 6.28 + r() * 0.5 + t * 0.7, len = R * (0.75 + r() * 0.4), droop = 0.28 + r() * 0.2, ca = Math.cos(a), sa = Math.sin(a)
          // 每根枝：从树干斜着垂下去，上面排着一簇簇针叶
          for (let q = 0; q < 7; q++) {
            const w = (q + 0.6) / 7, d = len * w
            c.copy(dark).lerp(mid, u * 0.5 + w * 0.3 + r() * 0.25)
            B.add(spray, [x + ca * d * 0.55, yy - d * droop - 0.1, z + sa * d * 0.55], Math.PI / 2 - a + (r() - 0.5) * 0.9, 0.3 + r() * 0.5, [len * 0.42 * (1.15 - w * 0.5), len * 0.3, len * 0.5 * (1.1 - w * 0.4)], (r() - 0.5) * 0.7, c)
          }
        }
      }
    } else {
      for (let lobe = 0; lobe < 6; lobe++) {
        const a = r() * 6.28, d = h * 0.14 * r(), cy = y0 + h * (0.58 + r() * 0.24), RR = h * (0.15 + r() * 0.07), cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d
        if (lobe > 0) wood.push(tube([[x, y0 + h * 0.45, z], [(x + cx) / 2, (y0 + h * 0.45 + cy) / 2 + 0.3, (z + cz) / 2], [cx, cy, cz]], h * 0.012, h * 0.004, '#4b3a2c', '#5d4a38', 5, 6))
        for (let k = 0; k < 200; k++) {
          const th = r() * 6.28, ph = Math.acos(2 * r() - 1), rr = RR * Math.pow(r(), 0.3)
          const p: V3 = [cx + Math.sin(ph) * Math.cos(th) * rr, cy + Math.cos(ph) * rr * 0.8, cz + Math.sin(ph) * Math.sin(th) * rr]
          c.copy(dk2).lerp(lt2, Math.max(0, Math.min(1, (p[1] - cy) / RR * 0.5 + 0.45 + (r() - 0.5) * 0.4)))
          B.add(card, p, r() * 6.28, r() * 3, 1 + r() * 0.8, r() * 3, c)
        }
      }
    }
    yield
    if (made % 5 === 0) { out.push({ w: fuse(wood), c: B.build() }); wood = []; B = new Batch(); yield }
  }
  if (wood.length) out.push({ w: fuse(wood), c: B.build() })
  return out
}
function Forest() {
  const g = useJob('forest', forestJob, 6)
  if (!g) return null
  return <>{g.map((t, i) => <group key={i}>
    <mesh geometry={t.w} castShadow><Flesh rough={0.95} /></mesh>
    <mesh geometry={t.c} castShadow receiveShadow><Plant rough={0.8} /></mesh>
  </group>)}</>
}
/** 光滑的球（顶点共用，起伏以后法线也是光滑的） */
function ball(detail: number) { const g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); return mergeVertices(g) }
/** 一丛灌木：几根枝，枝头密密地长着小叶片 */
function shrubGeo(seed: number, R = 0.9) {
  const r = rng(seed), wood: THREE.BufferGeometry[] = [], B = new Batch(), L = leafCard(0.06), c0 = new THREE.Color('#2f4f1f'), c1 = new THREE.Color('#628a34'), c = new THREE.Color()
  for (let b = 0; b < 9; b++) {
    const a = r() * 6.28, up = 0.5 + r() * 0.7, len = R * (0.7 + r() * 0.5)
    const end: V3 = [Math.cos(a) * Math.cos(up) * len, Math.sin(up) * len * 0.9 + 0.1, Math.sin(a) * Math.cos(up) * len]
    wood.push(tube([[0, 0, 0], [end[0] * 0.4, end[1] * 0.5, end[2] * 0.4], end], 0.03, 0.008, '#4a3a2a', '#6a5640', 5, 8))
    for (let k = 0; k < 200; k++) {
      const s = Math.pow(r(), 0.5), rr = R * 0.38 * (0.4 + r() * 0.8), th = r() * 6.28, ph = Math.acos(2 * r() - 1)
      const p: V3 = [end[0] * (0.55 + s * 0.45) + Math.sin(ph) * Math.cos(th) * rr, end[1] * (0.6 + s * 0.4) + Math.cos(ph) * rr * 0.8, end[2] * (0.55 + s * 0.45) + Math.sin(ph) * Math.sin(th) * rr]
      c.copy(c0).lerp(c1, Math.min(1, Math.max(0, (p[1] / (R * 1.2)) + (r() - 0.5) * 0.6)))
      B.add(L, p, r() * 6.28, r() * 3, 0.7 + r() * 0.7, r() * 3, c)
    }
  }
  return { wood: fuse(wood), leaves: B.build() }
}
/** 一块石头：揉皱的球，顶面颜色浅、底下深 */
function rockGeo(seed: number, s: V3, color = '#8c877a') {
  const g = ball(4), p = g.attributes.position, r = rng(seed), o = r() * 50
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.22 * fbm(x * 1.6 + o, y * 1.6, z * 1.6, 3) + 0.05 * fbm(x * 6 + o, y * 6, z * 6, 2); p.setXYZ(i, x * k * s[0], Math.max(-0.25, y) * k * s[1], z * k * s[2]) }
  g.computeVertexNormals()
  const c = new Float32Array(p.count * 3), base = new THREE.Color(color), cc = new THREE.Color(), n = g.attributes.normal
  for (let i = 0; i < p.count; i++) { cc.copy(base).multiplyScalar(0.72 + 0.3 * Math.max(0, n.getY(i)) + 0.1 * fbm(p.getX(i) * 4, p.getY(i) * 4, p.getZ(i) * 4, 2)); c.set([cc.r, cc.g, cc.b], i * 3) }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3))
  return g
}
function Shrubs() {
  const g = useJob('shrubs', function* () {
    const r = rng(5), w: THREE.BufferGeometry[] = [], l: THREE.BufferGeometry[] = []
    let n = 0
    while (n < 46) {
      const a = r() * 6.28, d = 20 + r() * 115, x = Math.cos(a) * d, z = Math.sin(a) * d
      if (ground(x, z) < 3 || CLEAR.some(([cx, cz, R]) => (x - cx) ** 2 + (z - cz) ** 2 < R * R)) continue
      n++
      const s = shrubGeo(Math.floor(r() * 1000), 0.6 + r() * 0.8), p: V3 = [x, ground(x, z) - 0.05, z]; w.push(place(s.wood, p, r() * 6)); l.push(place(s.leaves, p, r() * 6))
      if (n % 3 === 0) yield
    }
    const out = { w: fuse(w), l: fuse(l) }
    return out
  }, 7)
  if (!g) return null
  return <>
    <mesh geometry={g.w} castShadow><Flesh rough={0.9} /></mesh>
    <mesh geometry={g.l} castShadow receiveShadow><Plant rough={0.7} /></mesh>
  </>
}
function Rocks() {
  const g = useJob('rocks', function* () {
    const r = rng(9), list: THREE.BufferGeometry[] = []
    const add = (x: number, z: number, s: V3, sink = 0.25, color?: string) => list.push(place(rockGeo(Math.floor(r() * 999), s, color), [x, ground(x, z) - s[1] * sink, z], r() * 6))
    // 海岸上的礁石：一堆一堆的
    for (let i = 0; i < 26; i++) { const th = r() * 6.28, [cx, cz] = coast(th, 0.96 + r() * 0.07); if (Math.abs(th - PIER.beach) < 0.16 || Math.abs(th - PIER.fish) < 0.16) continue; for (let k = 0; k < 5; k++) { const s = 0.5 + r() * 1.8; add(cx + (r() - 0.5) * 7, cz + (r() - 0.5) * 7, [s * (1 + r() * 0.6), s * 0.7, s], 0.3, '#77736a') } yield }
    // 山顶的岩石、草地上散落的石头
    for (let i = 0; i < 14; i++) { const s = 0.8 + r() * 1.6; add(-25 + (r() - 0.5) * 30, -98 + (r() - 0.5) * 26, [s * 1.3, s, s], 0.2); if (i % 4 === 0) yield }
    for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = 10 + r() * 120, s = 0.15 + r() * 0.45, x = Math.cos(a) * d, z = Math.sin(a) * d; if (ground(x, z) > 1 && !shortAt(x, z)) add(x, z, [s * (1 + r()), s * 0.6, s]); if (i % 6 === 0) yield }
    yield
    return fuse(list)
  }, 7)
  if (!g) return null
  return <mesh geometry={g} castShadow receiveShadow><Flesh rough={0.92} /></mesh>
}

// ---------- 观测站 ----------
/** 波纹板墙面：一道道竖棱 */
function makeCorrugated(base: string) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64
  const g = c.getContext('2d')!; g.fillStyle = base; g.fillRect(0, 0, 256, 64)
  for (let x = 0; x < 256; x += 16) { const q = g.createLinearGradient(x, 0, x + 16, 0); q.addColorStop(0, 'rgba(0,0,0,0.16)'); q.addColorStop(0.35, 'rgba(255,255,255,0.14)'); q.addColorStop(0.7, 'rgba(0,0,0,0.04)'); q.addColorStop(1, 'rgba(0,0,0,0.2)'); g.fillStyle = q; g.fillRect(x, 0, 16, 64) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t
}
function makePV() {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d')!; g.fillStyle = '#121f38'; g.fillRect(0, 0, 256, 256)
  g.strokeStyle = 'rgba(190,205,230,0.7)'; g.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke() }
  g.strokeStyle = 'rgba(150,170,205,0.28)'; g.lineWidth = 1; for (let i = 0; i <= 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t
}
/** 观测站：架在混凝土墩上的波纹板板房，单坡屋顶上三块太阳能板；旁边是百叶箱、风速仪和一根带拉线的天线杆 */
function Station() {
  const wall = useMemo(() => { const t = makeCorrugated('#e4e2da'); t.repeat.set(9, 1); return t }, [])
  const wallS = useMemo(() => { const t = makeCorrugated('#e4e2da'); t.repeat.set(5, 1); return t }, [])
  const pv = useMemo(() => { const t = makePV(); t.repeat.set(2, 1); return t }, [])
  const deck = useMemo(() => { const t = makeWood('#8d6f4b', '60,42,24', '186,152,108', 5, 4); t.repeat.set(1, 1); return t }, [])
  const cups = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (cups.current) cups.current.rotation.y -= dt * 4.2 })
  const y0 = STATION_Y, W = 6.6, D = 3.6, H = 2.7, F = 0.62
  // 百叶箱的叶片：四面各一排斜片
  const louvers = useMemo(() => { const list: THREE.BufferGeometry[] = []; for (let s = 0; s < 4; s++) for (let i = 0; i < 9; i++) { const g = new THREE.BoxGeometry(0.62, 0.012, 0.07); g.rotateX(0.6); g.translate(0, 0.07 + i * 0.058, 0.3); g.rotateY(s * Math.PI / 2); list.push(g) } return fuse(list) }, [])
  return (
    <group position={[STATION.x + 2, y0, STATION.z - 3]} rotation-y={-0.12}>
      {/* 六个混凝土墩和底梁 */}
      {[-1, 0, 1].flatMap(i => [-1, 1].map(j => <mesh key={`${i}${j}`} position={[i * (W / 2 - 0.4), F / 2 - 0.1, j * (D / 2 - 0.3)]} castShadow receiveShadow><boxGeometry args={[0.42, F + 0.2, 0.42]} /><meshStandardMaterial color="#a9a69e" roughness={0.95} /></mesh>))}
      <mesh position={[0, F + 0.07, 0]} castShadow><boxGeometry args={[W + 0.1, 0.14, D + 0.1]} /><Metal kind="steel" grain="brushed" rough={0.6} /></mesh>
      {/* 板房：四面波纹板，转角包边 */}
      <mesh position={[0, F + 0.14 + H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial attach="material-0" map={wallS} roughness={0.6} metalness={0.25} /><meshStandardMaterial attach="material-1" map={wallS} roughness={0.6} metalness={0.25} />
        <meshStandardMaterial attach="material-2" color="#d6d4cc" roughness={0.7} /><meshStandardMaterial attach="material-3" color="#8a8880" roughness={0.9} />
        <meshStandardMaterial attach="material-4" map={wall} roughness={0.6} metalness={0.25} /><meshStandardMaterial attach="material-5" map={wall} roughness={0.6} metalness={0.25} />
      </mesh>
      {[-1, 1].flatMap(i => [-1, 1].map(j => <mesh key={`c${i}${j}`} position={[i * W / 2, F + 0.14 + H / 2, j * D / 2]}><boxGeometry args={[0.09, H, 0.09]} /><meshStandardMaterial color="#5d6a70" roughness={0.5} metalness={0.5} /></mesh>))}
      {/* 单坡屋顶：出檐，前低后高 */}
      <group position={[0, F + 0.14 + H + 0.22, 0]} rotation-x={0.11}>
        <mesh castShadow receiveShadow><boxGeometry args={[W + 0.9, 0.1, D + 1.1]} /><meshStandardMaterial color="#48545b" roughness={0.55} metalness={0.5} /></mesh>
        {[-2.05, 0, 2.05].map(x => <group key={x} position={[x, 0.2, -0.2]} rotation-x={-0.42}>
          <mesh castShadow><boxGeometry args={[1.9, 0.05, 1.1]} /><meshStandardMaterial color="#d7dadb" metalness={0.7} roughness={0.4} /></mesh>
          <mesh position={[0, 0.028, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.82, 1.02]} /><meshPhysicalMaterial map={pv} roughness={0.15} clearcoat={1} envMapIntensity={1.4} /></mesh>
        </group>)}
      </group>
      {/* 门、门前的木平台和台阶 */}
      <group position={[-1.7, F + 0.14, D / 2]}>
        <mesh position={[0, 1.02, 0.02]}><boxGeometry args={[1.0, 2.04, 0.06]} /><meshStandardMaterial color="#39525c" roughness={0.5} metalness={0.3} /></mesh>
        <mesh position={[0, 1.45, 0.055]}><planeGeometry args={[0.5, 0.55]} /><meshPhysicalMaterial color="#1b2a33" roughness={0.08} metalness={0.2} envMapIntensity={1.6} /></mesh>
        <mesh position={[0.36, 1.0, 0.07]}><cylinderGeometry args={[0.018, 0.018, 0.16, 10]} /><Metal kind="stainless" /></mesh>
        <mesh position={[0, -0.06, 0.75]} castShadow receiveShadow><boxGeometry args={[1.9, 0.08, 1.4]} /><meshStandardMaterial map={deck} roughness={0.85} /></mesh>
        {[0, 1, 2].map(i => <mesh key={i} position={[0, -0.24 - i * 0.2, 1.6 + i * 0.3]} castShadow receiveShadow><boxGeometry args={[1.5, 0.06, 0.3]} /><meshStandardMaterial map={deck} roughness={0.85} /></mesh>)}
      </group>
      {/* 两扇窗：铝框、深色玻璃 */}
      {[0.5, 2.2].map(x => <group key={x} position={[x, F + 0.14 + 1.55, D / 2 + 0.01]}>
        <mesh><boxGeometry args={[1.25, 0.95, 0.06]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh position={[0, 0, 0.035]}><planeGeometry args={[1.13, 0.83]} /><meshPhysicalMaterial color="#1c2c36" roughness={0.06} metalness={0.3} envMapIntensity={1.8} clearcoat={1} /></mesh>
        <mesh position={[0, 0, 0.04]}><boxGeometry args={[0.03, 0.83, 0.02]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      </group>)}
      {/* 百叶箱：白色，四条腿，四面是斜叶片 */}
      <group position={[-6.2, 0, 2.6]}>
        {[[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27]].map(([a, b]) => <mesh key={`${a}${b}`} position={[a, 0.72, b]} castShadow><boxGeometry args={[0.05, 1.44, 0.05]} /><meshStandardMaterial color="#eeeeea" roughness={0.6} /></mesh>)}
        <group position={[0, 1.42, 0]}>
          <mesh geometry={louvers} castShadow><meshStandardMaterial color="#f4f4f0" roughness={0.55} /></mesh>
          <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.52, 0.56, 0.52]} /><meshStandardMaterial color="#d9d9d4" roughness={0.8} /></mesh>
          <mesh position={[0, 0.63, 0]} rotation-x={0.08} castShadow><boxGeometry args={[0.8, 0.04, 0.8]} /><meshStandardMaterial color="#f4f4f0" roughness={0.55} /></mesh>
          <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.68, 0.04, 0.68]} /><meshStandardMaterial color="#f4f4f0" roughness={0.55} /></mesh>
        </group>
      </group>
      {/* 风速仪：三只风杯转着 */}
      <group position={[-4.4, 0, 3.4]}>
        <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.03, 0.035, 3, 14]} /><Metal kind="zinc" grain="brushed" rough={0.5} /></mesh>
        <group ref={cups} position={[0, 3.05, 0]}>
          <mesh><cylinderGeometry args={[0.035, 0.035, 0.1, 14]} /><Metal kind="aluminum" /></mesh>
          {[0, 1, 2].map(i => <group key={i} rotation-y={i * Math.PI * 2 / 3}>
            <mesh position={[0.14, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.008, 0.008, 0.28, 8]} /><Metal kind="aluminum" /></mesh>
            <mesh position={[0.3, 0, 0]} rotation-x={Math.PI / 2}><sphereGeometry args={[0.055, 16, 10, 0, Math.PI]} /><meshStandardMaterial color="#22262a" roughness={0.4} side={THREE.DoubleSide} /></mesh>
          </group>)}
        </group>
      </group>
      {/* 柴油发电机：板房背后的一只机箱，一根排气管 */}
      <group position={[5.2, 0, 1.2]}>
        <mesh position={[0, 0.08, 0]} receiveShadow><boxGeometry args={[1.7, 0.16, 1.0]} /><meshStandardMaterial color="#a9a69e" roughness={0.95} /></mesh>
        <RoundedBox args={[1.5, 0.95, 0.8]} radius={0.05} position={[0, 0.64, 0]} castShadow><meshStandardMaterial color="#c9a227" roughness={0.5} metalness={0.3} /></RoundedBox>
        {[-0.35, 0.05, 0.45].map(x => <mesh key={x} position={[x, 0.7, 0.405]}><boxGeometry args={[0.3, 0.5, 0.01]} /><meshStandardMaterial color="#3a3320" roughness={0.6} /></mesh>)}
        <mesh position={[-0.55, 1.5, -0.2]} castShadow><cylinderGeometry args={[0.04, 0.04, 0.9, 12]} /><Metal kind="steel" grain="brushed" rough={0.5} /></mesh>
        <mesh position={[-0.55, 1.97, -0.2]}><cylinderGeometry args={[0.06, 0.04, 0.06, 12]} /><Metal kind="iron" grain="cast" /></mesh>
      </group>
      {/* 天线杆：三道拉线，顶上一副八木天线 */}
      <group position={[4.6, 0, -2.4]}>
        <mesh position={[0, 4, 0]} castShadow><cylinderGeometry args={[0.04, 0.06, 8, 14]} /><Metal kind="zinc" grain="brushed" rough={0.5} /></mesh>
        {[0, 1, 2].map(i => { const a = i * Math.PI * 2 / 3 + 0.4; return <Rod key={i} from={[0, 6.2, 0]} to={[Math.cos(a) * 3.2, 0.05, Math.sin(a) * 3.2]} r={0.008}><Metal kind="steel" /></Rod> })}
        <mesh position={[0, 7.6, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 1.5, 8]} /><Metal kind="aluminum" /></mesh>
        {[-0.6, -0.3, 0, 0.3, 0.6].map((x, i) => <mesh key={x} position={[x, 7.6, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.006, 0.006, 0.7 - i * 0.07, 6]} /><Metal kind="aluminum" /></mesh>)}
      </group>
    </group>
  )
}

// ---------- 围栏、地块、栈桥 ----------
/** 铁丝网贴图：菱形网眼，透明底 */
function makeMesh() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!; g.clearRect(0, 0, S, S); g.strokeStyle = 'rgba(170,176,180,0.95)'; g.lineWidth = 2.2
  for (let i = -S; i <= S * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.moveTo(i, 0); g.lineTo(i - S, S); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t
}
/** 一圈网围栏：木桩、铁丝网、顶上一道铁丝。pts 是一圈桩子的位置；gap 是留作门的那几档 */
const NO_GAP: number[] = [], PEN_GAP = [3]
export function Fence({ pts, h = 0.9, gap = NO_GAP }: { pts: [number, number][]; h?: number; gap?: number[] }) {
  const net = useMemo(makeMesh, [])
  const { posts, wire } = useMemo(() => {
    const posts = fuse(pts.map(([x, z], i) => place(tint(new THREE.CylinderGeometry(0.045, 0.055, h + 0.5, 9), '#6b5137', i % 2 ? '#8a6c4a' : '#7c6042'), [x, ground(x, z) + h / 2 - 0.1, z])))
    const pos: number[] = [], uv: number[] = [], idx: number[] = []
    let u = 0, n = 0
    pts.forEach(([x, z], i) => {
      const [x2, z2] = pts[(i + 1) % pts.length]; if (gap.includes(i)) return
      const L = Math.hypot(x2 - x, z2 - z), y1 = ground(x, z), y2 = ground(x2, z2)
      pos.push(x, y1, z, x, y1 + h, z, x2, y2, z2, x2, y2 + h, z2); uv.push(u, 0, u, h * 4, u + L * 4, 0, u + L * 4, h * 4); u += L * 4
      idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); n += 4
    })
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
    return { posts, wire: g }
  }, [pts, h, gap])
  return <>
    <mesh geometry={posts} castShadow receiveShadow><Flesh rough={0.9} /></mesh>
    <mesh geometry={wire}><meshStandardMaterial map={net} transparent alphaTest={0.35} side={THREE.DoubleSide} metalness={0.7} roughness={0.45} /></mesh>
  </>
}
const ring = (cx: number, cz: number, rx: number, rz: number, n: number, az = 0): [number, number][] => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, u = Math.cos(a) * rx, v = Math.sin(a) * rz, c = Math.cos(az), s = Math.sin(az); return [cx + u * c + v * s, cz - u * s + v * c] })
const PEN_PTS = ring(PEN.x, PEN.z, PEN.R, PEN.R, 14, 0.35)
/** 围栏的门：第 3 档没有拉网。门外、门里各一个落脚点 */
export const PEN_GATE = (() => { const mx = (PEN_PTS[3][0] + PEN_PTS[4][0]) / 2, mz = (PEN_PTS[3][1] + PEN_PTS[4][1]) / 2, dx = (mx - PEN.x) / PEN.R, dz = (mz - PEN.z) / PEN.R; return { cx: PEN.x, cz: PEN.z, R: PEN.R - 0.1, out: [mx + dx * 1.1, mz + dz * 1.1] as [number, number], in: [mx - dx * 0.9, mz - dz * 0.9] as [number, number] } })()
export const PADDOCK = SITE.station.area(0, 5, 5.4, 3)
const PADDOCK_PTS = ring(PADDOCK.x, PADDOCK.z, PADDOCK.rx + 0.8, PADDOCK.rz + 0.8, 22, PADDOCK.az)
/** 调查地块：四角的木桩、边上的矮桩和一圈白绳 */
function PlotMarks() {
  const g = useMemo(() => {
    const cs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]], list: THREE.BufferGeometry[] = []
    const P = cs.map(([a, b]) => [PLOT.x + a * PLOT.half, PLOT.z + b * PLOT.half] as [number, number])
    P.forEach(([x, z]) => { list.push(place(tint(new THREE.CylinderGeometry(0.045, 0.055, 1.0, 10), '#6b5137', '#94744e'), [x, ground(x, z) + 0.4, z])); list.push(place(tint(new THREE.ConeGeometry(0.045, 0.07, 10), '#94744e'), [x, ground(x, z) + 0.935, z])) })
    // 每条边中间再打两根矮桩，把绳子托起来
    P.forEach(([x, z], i) => { const [x2, z2] = P[(i + 1) % 4]; for (const t of [1 / 3, 2 / 3]) { const px = lerp(x, x2, t), pz = lerp(z, z2, t); list.push(place(tint(new THREE.CylinderGeometry(0.03, 0.036, 0.75, 8), '#6b5137', '#94744e'), [px, ground(px, pz) + 0.3, pz])) } })
    P.forEach(([x, z], i) => { const [x2, z2] = P[(i + 1) % 4], pts: V3[] = []; for (let k = 0; k <= 10; k++) { const t = k / 10, px = lerp(x, x2, t), pz = lerp(z, z2, t); pts.push([px, ground(px, pz) + 0.62 - Math.abs(Math.sin(t * Math.PI * 3)) * 0.05, pz]) } list.push(tube(pts, 0.016, 0.016, '#f4f1e6', '#f4f1e6', 6, 36)) })
    return fuse(list)
  }, [])
  return <mesh geometry={g} castShadow><Flesh rough={0.7} /></mesh>
}
/** 小木船：船壳是一整块光滑的曲面，里面挖空，三道横板 */
function* boatJob(): Generator<void, THREE.BufferGeometry> {
  const hull = lin('#e9e6dc'), red = lin('#9c3a2c'), wood = lin('#8a6a46'), trim = lin('#2f4f66')
  const f = (x: number, y: number, z: number) => {
    const taper = 1 - 0.62 * sstep(0.2, 2.5, x) - 0.2 * sstep(-0.6, -2.4, x), zz = z / Math.max(0.2, taper)
    const outer = Math.max(ell(x, y, zz, [0, 0.55, 0], [2.5, 0.72, 0.95]), y - 0.62), inner = ell(x, y, zz, [0, 0.66, 0], [2.34, 0.7, 0.84])
    let d = Math.max(outer, -inner)
    for (const sx of [-1.25, 0.1, 1.3]) d = Math.min(d, Math.max(Math.abs(x - sx) - 0.13, Math.abs(y - 0.47) - 0.022, Math.max(outer, y - 0.6)))
    return d
  }
  return yield* nets({ f, lo: [-2.6, -0.2, -1.05], hi: [2.6, 0.7, 1.05], cell: 0.035, color: (p, n) => (n[1] > 0.5 && p[1] > 0.4 && p[1] < 0.52 ? wood : p[1] > 0.585 ? trim : n[1] > 0.2 || Math.abs(p[2]) < 0.6 && n[1] > -0.2 && p[1] > 0.05 && Math.hypot(n[0], n[2]) < 0.75 ? mix3(wood, hull, 0.25) : p[1] < 0.2 ? red : hull) })
}
/** 木栈桥：从岸上伸进海里，桩子、桥面板、系船柱；旁边系着一条小木船 */
function Pier({ th, len = 17 }: { th: number; len?: number }) {
  const [x, z] = coast(th, 0.975), plank = useMemo(() => { const t = makeWood('#8a6e4c', '58,40,24', '180,150,110', 12, 6); t.repeat.set(1, 1); t.rotation = Math.PI / 2; return t }, [])
  const boat = useJob('boat', boatJob, 9), bob = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (bob.current) { bob.current.position.y = -0.12 + Math.sin(clock.elapsedTime * 0.9 + th) * 0.05; bob.current.rotation.x = Math.sin(clock.elapsedTime * 0.7) * 0.03 } })
  const piles = useMemo(() => fuse(Array.from({ length: Math.floor(len / 2.8) + 1 }, (_, i) => [-1, 1].map(s => place(tint(new THREE.CylinderGeometry(0.11, 0.13, 4.6, 12), '#4f3d2a', '#6b543a'), [1 + i * 2.8, -0.9, s * 0.95]))).flat()), [len])
  return (
    <group position={[x, 0, z]} rotation-y={-th}>
      <mesh geometry={piles} castShadow><Flesh rough={0.95} /></mesh>
      <mesh position={[len / 2 - 0.6, 1.22, 0]} castShadow receiveShadow><boxGeometry args={[len + 2.4, 0.09, 2.2]} /><meshStandardMaterial map={plank} roughness={0.88} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[len / 2 - 0.6, 1.12, s * 0.95]} castShadow><boxGeometry args={[len + 2.4, 0.16, 0.12]} /><meshStandardMaterial color="#5d4832" roughness={0.9} /></mesh>)}
      {[len * 0.55, len - 0.4].map(px => <group key={px} position={[px, 1.27, 0.9]}><mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 0.32, 14]} /><Metal kind="iron" grain="cast" /></mesh><mesh position={[0, 0.33, 0]}><cylinderGeometry args={[0.11, 0.11, 0.05, 14]} /><Metal kind="iron" grain="cast" /></mesh></group>)}
      {boat && <group position={[len * 0.62, 0, 2.3]} rotation-y={0.12}><group ref={bob}><mesh geometry={boat} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.6} /></mesh></group></group>}
    </group>
  )
}

export function World({ want }: { want?: Want }) {
  return (
    <group>
      <Terrain />
      <Sea />
      <Grass dry={want?.dry ?? 0} />
      <Flowers />
      <Forest />
      <Shrubs />
      <Rocks />
      <Station />
      <PlotMarks />
      <Fence pts={PEN_PTS} h={1.05} gap={PEN_GAP} />
      <Fence pts={PADDOCK_PTS} h={0.8} />
      <Pier th={PIER.beach} />
      <Pier th={PIER.fish} len={20} />
      {(Object.keys(SITE) as SiteKey[]).map(k => { const S = SITE[k]; return <group key={k} position={onGround(S.x, S.z)} rotation-y={S.az}><BoardFrame w={S.w} h={S.h} lift={S.lift} /></group> })}
    </group>
  )
}
