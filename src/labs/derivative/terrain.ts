// 山路和地形：路面高度 R(x)、地面高度 H(x, z)、各课在世界里的位置。世界坐标 x 沿公路向东，单位 m。
// 山路段 x = 0 到 600 m 就是纵断面 y = f(x) 的 0 到 6 百米：路面高 = f(x / 100) + Y0（谷底的桥面比平地低 8.75 m）。
// 山路两头接一段竖曲线（坡度匀匀地变到 0），平地上的路面高 0。
import * as THREE from 'three'
import { road, slope } from './physics'

export const Y0 = -8.75
/** 横断面（z）：中间双黄线，车道宽 3.5 m，白线在 ±3.55，路面到 ±4.4，护栏在 ±4.7 */
export const LANE = 1.75
export const EDGE = 4.4
/** 路面高度 */
export function R(x: number) {
  if (x <= -100) return 0
  if (x < 0) return (0.075 * (x + 100) ** 2) / 200
  if (x <= 600) return road(x / 100) + Y0
  if (x < 750) { const u = x - 600; return road(6) + Y0 + 0.075 * u - (0.075 * u * u) / 300 }
  return road(6) + Y0 + 5.625
}
/** 路面坡度 dy/dx（车身俯仰用） */
export function Rp(x: number) {
  if (x <= -100 || x >= 750) return 0
  if (x < 0) return (0.075 * (x + 100)) / 100
  if (x <= 600) return slope(x / 100) / 100
  return 0.075 * (1 - (x - 600) / 150)
}

type V3 = [number, number, number]
/** 各处的位置：电子屏屏面底边中点 [x, z]（屏面朝 +z，服务区那块朝 −z） */
export const P = {
  zone: -782,                  // 拓展：区间测速的龙门架
  sx: [-770, -17] as [number, number],
  service: [-570, 34] as [number, number], // 第 4 课：服务区广场的大屏（朝 −z，对着公路）
  shop: [-528, 47] as [number, number],    // 第 7 课：便利店门口的柜台
  start: -308,                 // 第 1、2 课：停车线
  s1: [-298, -16] as [number, number],
  radar: -304,                 // 雷达测速屏：停车线往前 4 m
  s5: [100, -17] as [number, number],    // 第 5 课：坡顶
  s3: [306, -16] as [number, number],    // 第 3 课：下坡中段
  s6: [517, -17] as [number, number],    // 第 6 课：谷底桥头
  creek: 500,
}
export const BRIDGE: [number, number] = [P.creek - 13, P.creek + 13]

/** 推平的场地：屏的基础、服务区 */
const PADS = [
  { x: P.sx[0], z: P.sx[1] - 1, rx: 13, rz: 4.5, y: R(P.sx[0]) - 0.15 },
  { x: P.s1[0], z: P.s1[1] - 1, rx: 13, rz: 4.5, y: R(P.s1[0]) - 0.15 },
  { x: P.s5[0], z: P.s5[1] - 1, rx: 13, rz: 4.5, y: R(P.s5[0]) - 0.15 },
  { x: P.s3[0], z: P.s3[1] - 1, rx: 13, rz: 4.5, y: R(P.s3[0]) - 0.15 },
  { x: P.s6[0], z: P.s6[1] - 1, rx: 13, rz: 4.5, y: R(P.s6[0]) - 0.15 },
  { x: -570, z: 38, rx: 86, rz: 34, y: -0.02 },
]
export const padY = (i: number) => PADS[i].y
export const PAD = { sx: 0, s1: 1, s5: 2, s3: 3, s6: 4 }

const sp = (u: number, k = 1.5) => (u > 8 / k ? u : Math.log1p(Math.exp(k * u)) / k)   // 平滑的 max(0, u)
const sstep = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
function noise(x: number, z: number) {
  return Math.sin(x * 0.011 + Math.sin(z * 0.013) * 1.7) * 0.5 + Math.sin(z * 0.021 + x * 0.006 + 1.3) * 0.32 + Math.sin((x - z) * 0.043 + 0.4) * 0.12 + Math.sin(x * 0.09 + z * 0.07) * 0.06
}
/** 地面高度 */
export function H(x: number, z: number) {
  const r = R(x), e = Math.abs(z) - EDGE
  let h: number
  if (e <= 0) h = r - 0.22
  else {
    const ditch = -0.45 * Math.exp(-(((e - 1.4) / 0.8) ** 2))
    if (z < 0) {
      // 北侧：路堑边坡先陡后缓，再往后是连绵的山
      const lift = 0.05 * sp(e - 3) + 0.6 * sp(e - 15) - 0.34 * sp(e - 27) - 0.12 * sp(e - 80)
      const mtn = 46 * (1 - Math.exp(-sp(e - 40) / 160)) * (0.65 + 0.35 * noise(x * 0.6, z * 0.6))
      h = r - 0.22 + ditch + lift + mtn + noise(x, z) * 3.2 * sstep(18, 50, e)
    } else {
      // 南侧：缓缓往下的草坡，远处是起伏的丘陵
      const near = r - 0.22 + ditch - 0.06 * sp(e - 2.5) + noise(x + 300, z) * 1.6 * sstep(6, 40, e)
      const far = -3 + noise(x * 0.7 + 90, z * 0.7) * 9 + 14 * sstep(160, 420, e)
      h = near + (far - near) * sstep(50, 180, e)
    }
  }
  // 谷底的小溪：沿 z 方向流过桥下，往北是一道山沟
  const ez = Math.max(0, z < 0 ? e : e * 0.4)
  h -= (3.3 + 0.18 * ez) * Math.exp(-(((x - P.creek) / (6 + 0.1 * ez)) ** 2))
  for (const p of PADS) {
    const d = Math.max(Math.abs(x - p.x) / p.rx, Math.abs(z - p.z) / p.rz)
    if (d < 1.7) h += (p.y - h) * (1 - sstep(1, 1.7, d))
  }
  return h
}
export const CREEK_Y = R(P.creek) - 2.6

/** 地形网格：路附近密、远处疏；顶点色分草、土、岩 */
export function terrainGeo() {
  const xs: number[] = []
  for (let x = -1300; x < 1500; x += x > 470 && x < 530 ? 1.5 : x > -900 && x < 900 ? 3 : 10) xs.push(x)
  const zs: number[] = []
  for (let z = -900; z < 700; z += Math.abs(z) < 14 ? 0.7 : Math.abs(z) < 45 ? 1.6 : Math.abs(z) < 140 ? 4 : 14) zs.push(z)
  const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2)
  const grass = new THREE.Color(), dirt = new THREE.Color('#8a7a60'), rock = new THREE.Color('#8f8c84'), c = new THREE.Color()
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = xs[i], z = zs[j], y = H(x, z), k = i * nz + j
    pos.set([x, y, z], k * 3); uv.set([x / 4, z / 4], k * 2)
    // 坡陡的地方露岩石，路肩和沟里是土
    const gx = (H(x + 1.5, z) - H(x - 1.5, z)) / 3, gz = (H(x, z + 1.5) - H(x, z - 1.5)) / 3, steep = Math.hypot(gx, gz)
    // 草色：大块的深浅（几十米）、小块的斑驳（几米），偏黄的干草地
    const n = noise(x * 2.3, z * 2.3), big = noise(x * 0.35 + 50, z * 0.35), dry = Math.max(0, noise(x * 0.8 - 20, z * 0.8 + 7))
    grass.setRGB(0.78 + n * 0.1 + big * 0.12 + dry * 0.16, 0.83 + n * 0.08 + big * 0.1 + dry * 0.05, 0.72 + n * 0.05 + big * 0.05 - dry * 0.06)
    c.copy(grass).lerp(rock, sstep(0.55, 0.95, steep) * 0.85)
    const e = Math.abs(z) - EDGE
    if (e < 3.2) c.lerp(dirt, 0.6 * (1 - sstep(1.8, 3.2, e)))
    col.set([c.r, c.g, c.b], k * 3)
  }
  const idx: number[] = []
  for (let i = 0; i < nx - 1; i++) for (let j = 0; j < nz - 1; j++) { const a = i * nz + j, b = a + nz; idx.push(a, a + 1, b, b, a + 1, b + 1) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}

/** 沿路的一条带子：z 从 z0 到 z1，比路面高 dy；x 每 step 米一段。uScale：贴图沿路方向每多少米重复一次 */
export function stripGeo(x0: number, x1: number, z0: number, z1: number, dy: number, step = 2, uScale = 12) {
  const n = Math.ceil((x1 - x0) / step), pos: number[] = [], uv: number[] = [], idx: number[] = []
  for (let i = 0; i <= n; i++) {
    const x = Math.min(x1, x0 + i * step), y = R(x) + dy
    pos.push(x, y, z0, x, y, z1); uv.push(x / uScale, 0, x / uScale, 1)
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
  return g
}

/** 波形护栏的板：沿路一条 W 形截面的薄板，z 是护栏的位置，s 是朝外的一侧（+1 南、−1 北） */
export function railGeo(x0: number, x1: number, z: number, s: 1 | -1) {
  const prof: [number, number][] = [[0.0, 0.46], [0.05, 0.53], [0.02, 0.61], [0.05, 0.69], [0.0, 0.77]]
  const step = 2, n = Math.ceil((x1 - x0) / step), pos: number[] = [], idx: number[] = []
  for (let i = 0; i <= n; i++) { const x = Math.min(x1, x0 + i * step), y = R(x); for (const [dz, dy] of prof) pos.push(x, y + dy, z - s * dz) }
  const m = prof.length
  for (let i = 0; i < n; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + m; idx.push(a, b, a + 1, a + 1, b, b + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
/** 路上 x 处的一点（车道中心 z） */
export const onRoad = (x: number, z = LANE, up = 0): V3 => [x, R(x) + up, z]
