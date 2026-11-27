// 山谷的地形：一个高度函数 ground(x, z)，整个世界的地面、树、器材都按它落地。
// 山谷沿 x 方向（东西向）展开：北边是一条河（河面宽 30 m），河对岸是高山；谷底是平的训练场；东头一道山梁伸进谷里（第 7 课的山坡），再往东山谷合拢。
// 南边只是缓缓抬高的台地：各课的镜头都在南边往北看，南边不能有高山挡着。
import * as THREE from 'three'
import { HILL } from './physics'

/** 河：中线在 z = RIVER_Z，水面宽 30 m，水面高度 LEVEL */
export const RIVER_Z = -60, LEVEL = -0.6
/** 第 7 课炮口的位置（山坡以它为准）：山坡的坡面在 z = 0 附近是一个准确的斜面 */
export const MUZZLE: [number, number, number] = [280, HILL.muzzle, 0]

const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s) }
/** 平滑的杂色（0–1） */
export function noise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz)
  return (hash(ix, iz) * (1 - u) + hash(ix + 1, iz) * u) * (1 - v) + (hash(ix, iz + 1) * (1 - u) + hash(ix + 1, iz + 1) * u) * v
}
const fbm = (x: number, z: number) => noise(x, z) * 0.55 + noise(x * 2.1 + 9, z * 2.1 + 4) * 0.3 + noise(x * 4.3 + 2, z * 4.3 + 7) * 0.15

/** 第 7 课的山梁：坡脚在炮口前 foot 米，坡度 slope，升到 top 高是平顶。z 方向 ±14 m 以内是准确的斜面，再往外缓缓落下去 */
function spur(x: number, z: number) {
  const dx = x - MUZZLE[0]
  const h = Math.min(HILL.top, Math.max(-HILL.muzzle, HILL.slope * (dx - HILL.foot))) + HILL.muzzle
  return h * (1 - sm(14, 52, Math.abs(z)))
}

/** 地面的高度（m） */
export function ground(x: number, z: number) {
  let h = 0
  // 北边的高山：过了河对岸就起坡，山脊高低起伏
  const north = sm(-80, -210, z)
  h += north * (58 + 46 * fbm(x * 0.006 + 3, z * 0.006)) + sm(-80, -100, z) * 5
  // 东头合拢的山
  const east = sm(352, 440, x)
  h = Math.max(h, east * (50 + 40 * fbm(x * 0.007, z * 0.007 + 5)))
  // 西头
  const west = sm(-165, -250, x)
  h = Math.max(h, west * (40 + 30 * fbm(x * 0.007 + 8, z * 0.007)))
  // 南边的缓台地
  h += sm(70, 260, z) * (10 + 6 * fbm(x * 0.01, z * 0.01 + 2))
  // 山梁
  h = Math.max(h, spur(x, z))
  // 山上的小起伏（谷底是平的）
  h += Math.min(1, h / 12) * (fbm(x * 0.03, z * 0.03) - 0.5) * 7 * (1 - exact(x, z))
  // 河槽
  const r = 1 - sm(13, 15.9, Math.abs(z - RIVER_Z))
  h = h * (1 - sm(22, 15.9, Math.abs(z - RIVER_Z))) + (-3.4) * r + (1 - r) * 0
  return h
}
/** 是不是在第 7 课那块准确的斜面上（那里不加起伏） */
function exact(x: number, z: number) { return (1 - sm(14, 26, Math.abs(z))) * sm(MUZZLE[0] - 20, MUZZLE[0], x) * (1 - sm(MUZZLE[0] + 62, MUZZLE[0] + 80, x)) }

/** 训练场的硬地：碎石压实的场地（x、z 的范围） */
export const YARD = { x0: 4, x1: 126, z0: 4, z1: 36 }

/** 把地形做成一张带顶点色的网格。草、岩石、河滩、训练场、烧过的坡面，颜色都在这里定 */
export function terrainGeo() {
  const X0 = -260, X1 = 460, Z0 = -280, Z1 = 280, step = 2.5
  const nx = Math.round((X1 - X0) / step), nz = Math.round((Z1 - Z0) / step)
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3), col = new Float32Array(pos.length), uv = new Float32Array((nx + 1) * (nz + 1) * 2)
  const grassA = new THREE.Color('#566f33'), grassB = new THREE.Color('#7d9048'), rock = new THREE.Color('#8a857a'), sand = new THREE.Color('#b3a686'), bed = new THREE.Color('#4a4a3c'), yard = new THREE.Color('#a39d8e'), burnt = new THREE.Color('#2f2c26'), dry = new THREE.Color('#98904f'), c = new THREE.Color()
  let k = 0
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++, k++) {
    const x = X0 + i * step, z = Z0 + j * step, y = ground(x, z)
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = x / 7; uv[k * 2 + 1] = z / 7
    const slope = Math.hypot(ground(x + 1, z) - y, ground(x, z + 1) - y)
    c.copy(grassA).lerp(grassB, fbm(x * 0.05, z * 0.05))
    c.lerp(dry, sm(0.45, 0.8, noise(x * 0.012 + 5, z * 0.012)) * 0.3)
    c.lerp(rock, Math.max(sm(0.7, 1.15, slope), sm(70, 105, y) * 0.8) * (0.6 + 0.4 * noise(x * 0.2, z * 0.2)))
    const dz = Math.abs(z - RIVER_Z)
    c.lerp(sand, 1 - sm(16, 21, dz)); c.lerp(bed, 1 - sm(13.5, 15.5, dz))
    c.lerp(yard, sm(YARD.x0 - 3, YARD.x0, x) * (1 - sm(YARD.x1, YARD.x1 + 3, x)) * sm(YARD.z0 - 3, YARD.z0, z) * (1 - sm(YARD.z1, YARD.z1 + 3, z)) * 0.9)
    // 第 5 课的空投场：一片压实的沙土
    c.lerp(sand, (1 - sm(9, 13, Math.hypot(x - 224, z + 18))) * 0.8)
    // 火烧过的坡面
    c.lerp(burnt, (1 - sm(3.5, 9, Math.hypot(x - (MUZZLE[0] + HILL.fire.x), (z - 0) * 0.8))) * 0.85)
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b
  }
  const idx = new Uint32Array(nx * nz * 6); let q = 0
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1; idx[q++] = a; idx[q++] = d; idx[q++] = b; idx[q++] = b; idx[q++] = d; idx[q++] = e }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1))
  g.computeVertexNormals()
  return g
}
