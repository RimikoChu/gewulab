// 大山和周围的地面：一座南北走向的大山，西坡（迎风坡）是森林，东坡（背风坡）是黄褐色的草原和荒漠，山顶积雪；
// 西边远处是海。地形用一个高度函数算出来，分几块分段生成（见 job.ts），雪线由这一课交上来的高度决定（着色器里画）。
// 场景单位 1 = 1 m 用在观测场；大山竖直方向 1 单位代表 10 m（示意，见 physics.ts 的 altAt）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { useRipple } from '@/lab-kit'
import { prioOf, useJob } from './job'

type V3 = [number, number, number]
const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k) }

// ---------- 噪声 ----------
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
function vnoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}
function fbm(x: number, y: number, oct = 4) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5 } return v }
function ridged(x: number, y: number) { let v = 0, a = 0.55, f = 1; for (let i = 0; i < 4; i++) { const n = 1 - Math.abs(vnoise(x * f, y * f) * 2 - 1); v += a * n * n; f *= 2.1; a *= 0.5 } return v }

// ---------- 大山的形状 ----------
/** 山脊在 x = CX，最高峰在 z = PZ；迎风坡山脚 X_FOOT，背风坡山脚 X_LEE */
export const CX = 700, PZ = -60, X_FOOT = 180, X_LEE = 1150
/** 背风坡外面的高地：场景高度 40（海拔 600 m） */
export const LEE_Y = 40
/** 山脊沿南北方向的高度：最高峰 450，往南很快变低（在南边看过去是山的侧影），往北连成一道山岭 */
export function crestH(z: number) {
  if (z >= PZ) return 450 * Math.exp(-(((z - PZ) / 520) ** 2))
  const d = PZ - z
  return 310 + 140 * Math.exp(-((d / 260) ** 2)) + 55 * Math.sin(d / 230) * smooth(d / 300)
}
/** 迎风坡、背风坡上的 0–1：0 是山脚，1 是山脊 */
export const slopeK = (x: number) => (x <= CX ? smooth((x - X_FOOT) / (CX - X_FOOT)) : smooth((X_LEE - x) / (X_LEE - CX))) ** 1.35
function baseGround(x: number, z: number) {
  const H = crestH(z), k = slopeK(x), lee = LEE_Y * smooth((x - 500) / 800)
  let h = lee * (1 - k) + H * k
  // 山上的沟和梁：越高越陡峭
  const kk = Math.pow(k, 0.6)
  h += (10 + 0.3 * H * k) * (fbm(x / 120, z / 120) * 0.8 + ridged(x / 170 + 3.1, z / 140) * 0.7 - 0.78) * kk
  // 平原上起伏的小丘（观测场附近是平的）
  const dist = Math.hypot(x - 10, z), flat = smooth((dist - 70) / 160)
  h += (fbm(x / 260 + 7, z / 260) - 0.45) * 9 * flat * (1 - k)
  h *= x < CX ? flat + (1 - flat) * 0 : 1
  // 背风坡外的干草原：缓缓起伏的岗地和冲沟
  const far = smooth((x - CX - 120) / 320)
  h += ((fbm(x / 230 + 11, z / 230) - 0.45) * 18 + (ridged(x / 120, z / 120 + 5) - 0.5) * 6) * far
  // 西边远处入海
  h = h + ((-14) - h) * smooth((-560 - x) / 320)
  return h
}

// ---------- 翻山公路 ----------
/** 公路的中线（x, z）：从观测场东门出发，在迎风坡上之字形爬升，过山口，下到背风坡的小气象站 */
const ROUTE: [number, number][] = [[16, 4], [80, 20], [190, 34], [330, 6], [300, 70], [450, 40], [430, 108], [575, 76], [565, 118], [700, 83], [790, 104], [890, 76], [1010, 112], [1160, 96], [1300, 110]]
function buildRoad() {
  const pts: { x: number; z: number; s: number }[] = []
  let s = 0
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const [ax, az] = ROUTE[i], [bx, bz] = ROUTE[i + 1], l = Math.hypot(bx - ax, bz - az), n = Math.ceil(l / 4)
    for (let j = 0; j < n; j++) { const t = j / n; pts.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, s: s + l * t }) }
    s += l
  }
  pts.push({ x: ROUTE[ROUTE.length - 1][0], z: ROUTE[ROUTE.length - 1][1], s })
  // 弯道抹圆一点
  for (let it = 0; it < 6; it++) for (let i = 1; i < pts.length - 1; i++) { pts[i].x = (pts[i - 1].x + pts[i].x * 2 + pts[i + 1].x) / 4; pts[i].z = (pts[i - 1].z + pts[i].z * 2 + pts[i + 1].z) / 4 }
  // 路面高度：沿线的地面高度再抹平，路才是顺的
  let y = pts.map(p => Math.max(-0.2, baseGround(p.x, p.z)))
  for (let it = 0; it < 30; it++) y = y.map((v, i) => (i === 0 || i === y.length - 1 ? v : (y[i - 1] + v * 2 + y[i + 1]) / 4))
  return pts.map((p, i) => ({ ...p, y: y[i] + 0.25 }))
}
export const ROAD = buildRoad()
const ROAD_BOX = { x0: -10, x1: 1330, z0: -20, z1: 150 }
/** 离公路中线最近的点 */
function nearRoad(x: number, z: number) {
  if (x < ROAD_BOX.x0 - 30 || x > ROAD_BOX.x1 + 30 || z < ROAD_BOX.z0 - 30 || z > ROAD_BOX.z1 + 30) return null
  let best = 1e9, by = 0
  for (let i = 0; i < ROAD.length; i += 2) { const p = ROAD[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) { best = d; by = p.y } }
  return { d: Math.sqrt(best), y: by }
}
/** 地面的高度：公路两边挖填出一条平整的路基 */
export function ground(x: number, z: number) {
  const h = baseGround(x, z), r = nearRoad(x, z)
  if (!r) return h
  const k = 1 - smooth((r.d - 6) / 16)
  return h + (r.y - 0.35 - h) * k
}
/** 公路上走了 s 米的位置和朝向 */
export function roadAt(s: number): { p: V3; yaw: number; pitch: number } {
  const L = ROAD[ROAD.length - 1].s, t = Math.min(L, Math.max(0, s))
  let i = 1; while (i < ROAD.length - 1 && ROAD[i].s < t) i++
  const a = ROAD[i - 1], b = ROAD[i], k = (t - a.s) / Math.max(1e-6, b.s - a.s)
  const dx = b.x - a.x, dz = b.z - a.z, dy = b.y - a.y
  return { p: [a.x + dx * k, a.y + dy * k, a.z + dz * k], yaw: Math.atan2(-dz, dx), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }
}
/** 公路上第一个到达场景高度 y 的位置（沿路的米数）；fromEnd 从另一头找 */
export function roadS(y: number, fromEnd = false) {
  const list = fromEnd ? [...ROAD].reverse() : ROAD
  return (list.find(p => p.y >= y) ?? list[list.length - 1]).s
}
export const ROAD_LEN = ROAD[ROAD.length - 1].s
/** 山口：公路的最高点 */
export const PASS_S = ROAD.reduce((m, p) => (p.y > m.y ? p : m), ROAD[0]).s

// ---------- 地面的颜色 ----------
const C = (h: string) => new THREE.Color(h)
const PAL = {
  farm: C('#728f43'), farm2: C('#93a352'), fallow: C('#9c8a62'), crop: C('#5f8a3a'), grass: C('#7c9a4c'), forest: C('#34562e'), forest2: C('#466b38'), meadow: C('#86905c'), rock: C('#7b7268'), rock2: C('#958c80'),
  steppe: C('#928a50'), steppe2: C('#82793f'), tan: C('#9e894f'), olive: C('#8f8f52'), leeGrass: C('#9a9d57'), leeRock: C('#86684a'), sand: C('#d8c79a'), seabed: C('#7c8a86'),
}
const tmp = new THREE.Color(), tmp2 = new THREE.Color()
/** 背风的程度（0 迎风坡、1 背风坡）：分界沿山脊弯弯曲曲，过渡带很宽 */
function leeK(x: number, z: number) {
  const e = x - CX + (fbm(z / 260 + 3, x / 400) - 0.5) * 160 + (fbm(x / 60, z / 60, 3) - 0.5) * 70
  return smooth((e + 30) / 280)
}
function paint(x: number, z: number, h: number, slope: number, out: THREE.Color) {
  const n = fbm(x / 60, z / 60, 3), n2 = vnoise(x / 18, z / 18)
  // 迎风坡：田和草 → 森林 → 高山草甸 → 裸岩
  const w = out.copy(PAL.farm).lerp(PAL.farm2, smooth((n - 0.42) / 0.2) * 0.7)
  // 平原上一块块的田：庄稼、草地、休耕地，颜色各不相同
  const fx = Math.floor((x + 13) / 70), fz = Math.floor((z + 7) / 46), f = hash(fx, fz)
  if (x < CX - 200 && x > -520) w.lerp(f < 0.3 ? PAL.crop : f < 0.55 ? PAL.farm2 : f < 0.7 ? PAL.fallow : PAL.farm, 0.75 * (1 - smooth((h - 6) / 12)))
  w.lerp(tmp.copy(PAL.forest).lerp(PAL.forest2, n2 * 0.6), smooth((h - 22 + n * 20) / 20))
  w.lerp(PAL.meadow, smooth((h - 290 + n * 30) / 30))
  w.lerp(tmp.copy(PAL.rock).lerp(PAL.rock2, n2), smooth((h - 350 + n * 40) / 40))
  // 背风坡：分界不是一条直线——沿山脊有远有近，过渡带很宽；上部还有稀疏灌丛的黄绿草坡，往下变成黄褐色的干草原
  const lee = leeK(x, z)
  const d = tmp2.copy(PAL.steppe).lerp(PAL.steppe2, n2 * 0.6).lerp(PAL.tan, smooth((fbm(x / 140 + 7, z / 140) - 0.45) / 0.2) * 0.6)
  d.lerp(PAL.olive, smooth((n2 - 0.6) / 0.25) * 0.5)
  d.lerp(tmp.copy(PAL.leeGrass).lerp(PAL.olive, n2), smooth((h - 120 + n * 60) / 90) * (1 - smooth((h - 330) / 40)))
  d.lerp(tmp.copy(PAL.leeRock).lerp(PAL.rock2, n2 * 0.5), smooth((h - 320 + n * 50) / 60))
  out.lerp(d, lee)
  // 陡的地方露出岩石
  out.lerp(tmp.copy(x > CX ? PAL.leeRock : PAL.rock).lerp(PAL.rock2, n2 * 0.4), smooth((slope - 0.75) / 0.5) * smooth(h / 40))
  // 海边：沙滩，再往下是海底
  if (h < 2 && x < -480) out.lerp(PAL.sand, smooth((2 - h) / 2.5)); if (h < -3) out.lerp(PAL.seabed, smooth((-3 - h) / 6))
}

/** 一块地形（分段生成）：x0..x1、z0..z1，格距 cell；hole 里面的格子不出三角形（精细地形盖住的地方） */
function* makeTile(x0: number, x1: number, z0: number, z1: number, cell: number, hole?: { x0: number; x1: number; z0: number; z1: number }): Generator<void, THREE.BufferGeometry> {
  const nx = Math.round((x1 - x0) / cell), nz = Math.round((z1 - z0) / cell), W = nx + 1
  const pos = new Float32Array(W * (nz + 1) * 3), col = new Float32Array(W * (nz + 1) * 3), c = new THREE.Color(), e = cell * 0.5
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * cell, z = z0 + j * cell, h = ground(x, z), k = (j * W + i) * 3
      const sl = Math.hypot(ground(x + e, z) - ground(x - e, z), ground(x, z + e) - ground(x, z - e)) / (2 * e)
      const inHole = hole && x > hole.x0 && x < hole.x1 && z > hole.z0 && z < hole.z1
      pos[k] = x; pos[k + 1] = inHole ? h - 3 : h; pos[k + 2] = z
      paint(x, z, h, sl, c); col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b
    }
    if (j % 6 === 0) yield
  }
  const idx: number[] = []
  const inner = hole && { x0: hole.x0 + cell, x1: hole.x1 - cell, z0: hole.z0 + cell, z1: hole.z1 - cell }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * W + i
    if (inner) { const cx = x0 + (i + 0.5) * cell, cz = z0 + (j + 0.5) * cell; if (cx > inner.x0 && cx < inner.x1 && cz > inner.z0 && cz < inner.z1) continue }
    idx.push(a, a + W, a + 1, a + 1, a + W, a + W + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx)
  yield
  g.computeVertexNormals()
  return g
}
/** 精细地形覆盖的范围 */
const FINE = { x0: -880, x1: 1680, z0: -1440, z1: 880 }
const TILES: [number, number, number, number][] = [[-880, 400, -1440, -280], [400, 1680, -1440, -280], [-880, 400, -280, 880], [400, 1680, -280, 880]]

/** 地面材质：顶点颜色 + 雪线以上铺雪（雪线的场景高度由 snow 给出） */
function useGroundMat(snow: number) {
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })
    const u = { uSnow: { value: 999 } }
    m.onBeforeCompile = s => {
      Object.assign(s.uniforms, u)
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normal;')
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform float uSnow;\nfloat h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}')
        .replace('#include <color_fragment>', `#include <color_fragment>
        float nn = n2(vWP.xz / 22.0) * 0.6 + n2(vWP.xz / 7.0) * 0.4;
        float flt = smoothstep(0.42, 0.78, normalize(vWN).y);
        float sn = smoothstep(uSnow - 6.0, uSnow + 10.0, vWP.y + (nn - 0.5) * 34.0) * mix(0.35, 1.0, flt);
        diffuseColor.rgb *= 0.84 + 0.2 * n2(vWP.xz * 0.9) + 0.12 * n2(vWP.xz * 0.11);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), sn);`)
    }
    m.userData.u = u
    return m
  }, [])
  ;(mat.userData.u as { uSnow: { value: number } }).uSnow.value = snow
  return mat
}

function Tile({ t, mat, i }: { t: [number, number, number, number]; mat: THREE.Material; i: number }) {
  const g = useJob(`climate:tile${i}`, () => makeTile(t[0], t[1], t[2], t[3], 8), prioOf('terrain'))
  return g ? <mesh geometry={g} material={mat} receiveShadow castShadow={false} /> : null
}
function Far({ mat }: { mat: THREE.Material }) {
  const g = useJob('climate:far', () => makeTile(-4000, 5200, -5600, 2800, 60, FINE), prioOf('terrain') + 0.5)
  return g ? <mesh geometry={g} material={mat} receiveShadow /> : null
}

/** 地形：精细的四块 + 远处一大块粗的 + 西边的海。snow：雪线的场景高度 */
export function Terrain({ snow }: { snow: number }) {
  const mat = useGroundMat(snow)
  const sea = useRipple([60, 60], 0.004)
  return (
    <group>
      {TILES.map((t, i) => <Tile key={i} t={t} mat={mat} i={i} />)}
      <Far mat={mat} />
      <mesh position={[-6000, -1.6, -1400]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[11000, 9000]} />
        <meshPhysicalMaterial color="#25607e" roughness={0.16} metalness={0.05} normalMap={sea} normalScale={new THREE.Vector2(0.3, 0.3)} clearcoat={0.5} envMapIntensity={1.2} />
      </mesh>
    </group>
  )
}

// ---------- 森林 ----------
const rnd = (i: number, k: number) => hash(i * 1.37 + k * 17.1, k * 3.7 - i * 0.11)
function* makeForest(): Generator<void, { trees: THREE.InstancedMesh; shrubs: THREE.InstancedMesh }> {
  const spots: { x: number; y: number; z: number; s: number; c: number }[] = [], bush: { x: number; y: number; z: number; s: number }[] = []
  for (let i = 0; i < 26000; i++) {
    const x = -500 + rnd(i, 1) * 1400, z = -1300 + rnd(i, 2) * 2100
    if (x > CX + 150 || rnd(i, 13) < leeK(x, z) * 1.6) continue   // 森林往背风坡一侧渐渐稀疏，没有一条直的边
    const h = ground(x, z), r = nearRoad(x, z)
    if (r && r.d < 10) continue
    if (Math.hypot(x - 15, z) < 75) continue                                    // 观测场和科普广场附近不种
    const band = smooth((h - 18) / 16) * (1 - smooth((h - 300) / 25))            // 森林带
    const grove = h < 18 && Math.hypot(x - 15, z) > 260 && fbm(x / 90 + 2, z / 90) > 0.68 ? 0.7 : 0   // 平原上零星的小树林
    if (rnd(i, 3) > Math.max(band * (0.55 + fbm(x / 120, z / 120) * 0.6), grove)) continue
    const slope = Math.hypot(ground(x + 4, z) - ground(x - 4, z), ground(x, z + 4) - ground(x, z - 4)) / 8
    if (slope > 1.3) continue
    spots.push({ x, y: h, z, s: (h < 18 ? 9 : 11) * (0.7 + rnd(i, 4) * 0.6) * (1 - 0.35 * smooth((h - 220) / 80)), c: rnd(i, 5) })
    if (i % 400 === 0) yield
  }
  for (let i = 0; i < 16000; i++) {
    const x = CX - 40 + rnd(i, 7) * 1150, z = -1300 + rnd(i, 8) * 2100, h = ground(x, z)
    if (h > 330 || rnd(i, 9) > (h > 110 ? 0.55 : 0.18) * (1 - smooth((h - 290) / 40))) continue
    const r = nearRoad(x, z); if (r && r.d < 9) continue
    bush.push({ x, y: h, z, s: 2.2 + rnd(i, 10) * 3 })
  }
  yield
  const tint = (g: THREE.BufferGeometry, c: string) => { const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([col.r, col.g, col.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.toNonIndexed() }
  // 一棵针叶树：树干 + 七层往下垂的枝叶。每层是一圈参差的枝梢，上面亮、枝梢中等、底下暗，看得出一层层的分枝
  const trunk = new THREE.CylinderGeometry(0.035, 0.065, 0.6, 6); trunk.translate(0, 0.3, 0); trunk.deleteAttribute('uv')
  const tiers: THREE.BufferGeometry[] = []
  for (let t = 0; t < 7; t++) {
    const yb = 0.28 + t * 0.19, yt = yb + 0.44 - t * 0.02, R = 0.52 * (1 - t / 7.6) + 0.05, N = 11, rot = t * 0.9
    const pos: number[] = [], col: number[] = []
    const tip = (i: number) => { const a = rot + (i / N) * Math.PI * 2, r = R * (i % 2 ? 0.74 : 1) * (0.92 + 0.16 * Math.sin(i * 7.3 + t)); return [Math.cos(a) * r, yb - (i % 2 ? 0.03 : 0.08), Math.sin(a) * r] }
    for (let i = 0; i < N; i++) {
      const a = tip(i), b = tip(i + 1)
      pos.push(0, yt, 0, ...b, ...a); col.push(1, 1, 1, 0.72, 0.78, 0.7, 0.72, 0.78, 0.7)                 // 上面
      pos.push(0, yb + 0.05, 0, ...a, ...b); col.push(0.32, 0.36, 0.3, 0.55, 0.6, 0.52, 0.55, 0.6, 0.52)   // 底下
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals()
    tiers.push(g)
  }
  const tree = mergeGeometries([tint(trunk, '#5e4a38'), ...tiers])
  const trees = new THREE.InstancedMesh(tree, new THREE.MeshStandardMaterial({ vertexColors: true, color: '#7f9a74', roughness: 0.92, envMapIntensity: 0.45, side: THREE.DoubleSide }), spots.length)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color()
  spots.forEach((t, i) => {
    q.setFromAxisAngle(up, t.c * 6.28); m.compose(p.set(t.x, t.y - 0.3, t.z), q, sc.set(t.s, t.s * (0.95 + t.c * 0.3), t.s)); trees.setMatrixAt(i, m)
    trees.setColorAt(i, col.setHSL(0.28 + t.c * 0.06, 0.4 + t.c * 0.15, 0.1 + t.c * 0.06))
  })
  trees.castShadow = true; trees.receiveShadow = true
  const bg = new THREE.IcosahedronGeometry(0.5, 0); bg.scale(1, 0.55, 1)
  const shrubs = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ color: '#8b8a52', roughness: 1, flatShading: true }), bush.length)
  bush.forEach((b, i) => { q.setFromAxisAngle(up, i); m.compose(p.set(b.x, b.y, b.z), q, sc.set(b.s, b.s, b.s)); shrubs.setMatrixAt(i, m); shrubs.setColorAt(i, col.setHSL(0.17 + rnd(i, 11) * 0.06, 0.32, 0.22 + rnd(i, 12) * 0.07)) })
  return { trees, shrubs }
}
export function Forest() {
  const f = useJob('climate:forest', makeForest, prioOf('forest'))
  return f ? <group><primitive object={f.trees} /><primitive object={f.shrubs} /></group> : null
}

// ---------- 公路 ----------
export function Road() {
  const { road, lines } = useMemo(() => {
    const W = 3.6, pos: number[] = [], idx: number[] = [], lp: number[] = []
    for (let i = 0; i < ROAD.length; i++) {
      const a = ROAD[Math.max(0, i - 1)], b = ROAD[Math.min(ROAD.length - 1, i + 1)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, p = ROAD[i]
      pos.push(p.x + nx * W, p.y, p.z + nz * W, p.x - nx * W, p.y, p.z - nz * W)
      if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1) }
      if (i % 3 === 0 && i + 1 < ROAD.length) { const q = ROAD[i + 1]; lp.push(p.x, p.y + 0.06, p.z, q.x, q.y + 0.06, q.z) }   // 中间的虚线
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3))
    return { road: g, lines: lg }
  }, [])
  return <group>
    <mesh geometry={road} receiveShadow><meshStandardMaterial color="#4a4b4d" roughness={0.9} polygonOffset polygonOffsetFactor={-2} side={THREE.DoubleSide} /></mesh>
    <lineSegments geometry={lines}><lineBasicMaterial color="#e8e4d4" /></lineSegments>
  </group>
}
