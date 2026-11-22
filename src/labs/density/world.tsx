// 质量与密度实验室的大场景：一座金属冶炼厂的化验室，和窗外的料场。化验室里靠墙一长排实验台，各课在台上各占一处；
// 墙上一排窗，窗外是成垛的铝锭、铜板、钢坯，一台龙门吊，远处是熔炼车间和烟囱。料场上有一张检验台和一块大铝锭。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 cm 画成 CM 个单位。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, lathe, makeGround, mergeParts, type Part } from '@/lab-kit'
import { RHO, sci, toSI, type Stuff } from './physics'

export const CM = 0.06, TOP = 5.1            // 1 cm 在画面里多长；实验台台面的高度（85 cm）
/** 各课在实验台上的位置（x 坐标），和料场上检验台、大铝锭的位置 */
export const ST = { s1: -27, s2: -18, s3: -9, s4: 0, s5: 9, s6: 18, sx: 27 }
export const YARD = { x: -4, z: -40 }, SLAB = { x: 13, z: -45 }
const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], yard = false) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, yard })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  s1: spot(ST.s1 + 0.12, TOP + 0.7, 0.3, 3.6, 2.2, [-0.3, 0.2]),
  s2: spot(ST.s2 + 0.35, TOP + 0.7, 0.3, 3.6, 2.2, [0.24, 0.21]),
  s3: spot(ST.s3 + 0.05, TOP + 0.84, 0.3, 2.6, 2.2, [-0.1, 0.1]),
  s4: spot(ST.s4 + 0.1, TOP + 0.66, 0.4, 4.1, 2.4, [-0.24, 0.27]),
  s5: spot(ST.s5 + 0.1, TOP + 0.7, 0.3, 3.9, 2.3, [0.3, 0.18]),
  s6: spot(ST.s6 + 0.3, TOP + 0.72, 0.3, 5.0, 2.5, [-0.13, 0.3]),
  sx: spot(ST.sx, TOP + 0.56, 0.3, 2.9, 1.9, [0.12, 0.13]),
  sx2: spot(ST.sx - 0.1, TOP + 0.72, 0.3, 2.0, 1.95, [0.12, 0.13]),
  sx3: spot(ST.sx, TOP + 0.36, 0.3, 1.9, 1.5, [0.12, 0.16]),
  yard: spot(YARD.x + 0.12, TOP + 0.7, YARD.z + 0.3, 3.6, 2.2, [-0.42, 0.2], true),
  yard7: spot(YARD.x + 0.25, TOP + 0.72, YARD.z + 0.4, 4.5, 2.4, [-0.42, 0.2], true),
  slab: spot(SLAB.x, 3.2, SLAB.z, 19, 9, [-0.62, 0.3], true),
}
export type SpotKey = keyof typeof SPOT
/** 舞台设置：不用天空图，自己画一个天穹；环境光用摄影棚式的柔光板，金属和玻璃上才有亮带 */
export const AIR = { sky: false, backdrop: '#b9c6cf', env: 0.75, fog: [110, 380] as [number, number], studio: true }
/** 每一课交给世界的要求：主灯跟到哪一处；是不是在室外 */
export interface Want { x: number; yard: boolean }

const BX0 = -33, BX1 = 33, BZ0 = -2.3, BZ1 = 2.3, WALL = -2.4, SILL = TOP + 2, LINTEL = TOP + 9.5, H = 19, RX = 46
const SINK = { x0: 12, x1: 15, z0: -0.9, z1: 1.3 }
const WINDOWS = Object.values(ST), SHELVES = [-22.5, -13.5, -4.5, 4.5, 22.5]

let seed = 5
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
/** 给一个模型整体刷上一种颜色（顶点颜色），好和别的模型合并成一个 */
function tint(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return g
}
/** 一块板，贴图按它在世界里的位置铺（几块拼起来花纹是连着的） */
function plank(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.6, (p.getZ(i) + p.getY(i)) / 1.6)
  return g
}
/** 墙上的瓷砖：浅灰绿的方砖，砖缝深一点，每块砖深浅略有不同 */
function makeTiles() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#566663'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = 112 + Math.round(rnd() * 10); g.fillStyle = `rgb(${v - 18},${v + 6},${v + 2})`; g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 台面：深灰的实芯理化板，上面撒着细小的浅色和深色颗粒 */
function makeSpeckle() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#30353a'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 5200; i++) { const v = rnd(); g.fillStyle = v < 0.5 ? `rgba(150,160,168,${0.1 + rnd() * 0.25})` : `rgba(12,14,16,${0.15 + rnd() * 0.3})`; g.beginPath(); g.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 1.6, 0, 7); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 天穹：头顶蓝一些，越靠近地平线越白 */
function makeSky() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256
  const g = c.getContext('2d')!, k = g.createLinearGradient(0, 0, 0, 256)
  k.addColorStop(0, '#6f97c2'); k.addColorStop(0.36, '#a9c2d8'); k.addColorStop(0.5, '#d3dde3'); k.addColorStop(1, '#d3dde3')
  g.fillStyle = k; g.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
/** 墙上贴的密度表：数都从计算核心里取 */
function makePoster() {
  const c = document.createElement('canvas'); c.width = 400; c.height = 520
  const g = c.getContext('2d')!
  g.fillStyle = '#eef0e6'; g.fillRect(0, 0, 400, 520); g.strokeStyle = '#2f5a66'; g.lineWidth = 6; g.strokeRect(10, 10, 380, 500)
  g.fillStyle = '#2f5a66'; g.fillRect(10, 10, 380, 86); g.fillStyle = '#eef0e6'; g.font = '700 38px sans-serif'; g.textAlign = 'center'; g.fillText('常见物质的密度', 200, 54); g.font = '500 22px sans-serif'; g.fillText('kg/m³', 200, 84)
  g.fillStyle = '#1f2a30';
  (['cu', 'fe', 'al', 'water', 'ice', 'alcohol'] as Stuff[]).forEach((k, i) => { const y = 150 + i * 62; g.font = '600 36px sans-serif'; g.textAlign = 'left'; g.fillText(RHO[k].name, 46, y); g.textAlign = 'right'; g.fillText(sci(toSI(RHO[k].rho)), 356, y); g.fillRect(40, y + 18, 320, 1.5) })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

/** 试剂瓶：瓶身、瓶盖、标签，各刷各的颜色 */
const BOTTLE = lathe([[0, 0], [0.15, 0], [0.17, 0.02], [0.17, 0.36], [0.15, 0.43], [0.075, 0.5], [0.065, 0.52], [0.065, 0.57], [0, 0.57]], { segs: 20 })
const CAP = lathe([[0, 0.56], [0.082, 0.56], [0.088, 0.57], [0.088, 0.65], [0.074, 0.67], [0, 0.67]], { segs: 16 })
function bottle(x: number, y: number, z: number, body: string, cap: string, k: number) {
  const m = new THREE.Matrix4().makeScale(k, k * (0.85 + rnd() * 0.3), k).setPosition(x, y, z)
  const label = new THREE.CylinderGeometry(0.173, 0.173, 0.2, 20, 1, true, -1.1 + rnd(), 2.2); label.translate(0, 0.22, 0)
  return [tint(BOTTLE.clone(), body), tint(CAP.clone(), cap), tint(label, '#dedccf')].map(g => g.applyMatrix4(m))
}

/** 一捆铝锭：一层横一层竖地码起来，外面两道打包带，底下两根垫木 */
function bundle(out: Part[], x: number, z: number, y0: number, layers = 10) {
  const tones = ['#c2c7cc', '#ced2d6', '#b7bdc3', '#c8ccd0']
  for (const s of [-1.3, 1.3]) out.push({ p: [x + s, y0 + 0.2, z], s: [0.5, 0.4, 4.5], c: '#7a6248' })
  for (let l = 0; l < layers; l++) for (let i = 0; i < 5; i++) {
    const o = (i - 2) * 0.88, y = y0 + 0.4 + l * 0.52 + 0.26, t = tones[Math.floor(rnd() * 4)]
    out.push(l % 2 ? { p: [x + o, y, z], s: [0.8, 0.5, 4.3], c: t } : { p: [x, y, z + o], s: [4.3, 0.5, 0.8], c: t })
  }
  for (const s of [-1.1, 1.1]) out.push({ p: [x + s, y0 + 0.4 + layers * 0.26, z], s: [0.14, layers * 0.52 + 0.06, 4.46], c: '#2d4d80' })
}

/** 跟着当前这一课走的主灯：从前上方斜着打下来，只有它投影子。到室外时关掉，由阳光接手 */
function Key({ x, on }: { x: number; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 2.2, TOP + 7.5, 5.2); aim.position.set(cur.current, TOP + 0.2, 0); aim.updateMatrixWorld()
    l.intensity += ((on ? 340 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.52} penumbra={0.9} intensity={0} distance={30} decay={1.6} color="#fff1dc" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0006} shadow-normalBias={0.02} />
  </>
}

export function World({ x = ST.s1, yard = false }: Partial<Want>) {
  const tex = useMemo(() => {
    const top = makeSpeckle()
    const floor = makeGround('#8d9189', '122,126,118', '98,102,96', 5); floor.repeat.set(12, 4)
    const ground = makeGround('#8a8982', '112,110,102', '72,72,68', 9); ground.repeat.set(40, 30)
    const tiles = makeTiles(); tiles.repeat.set((BX1 - BX0 + 26) / 2, 1)
    return { top, floor, ground, tiles, sky: makeSky(), poster: makePoster() }
  }, [])
  const geo = useMemo(() => {
    seed = 5
    const room: Part[] = [], metal: Part[] = [], yardP: Part[] = []
    // —— 实验台：柜体（水池下面留空）、踢脚、一扇扇柜门和拉手
    const body = (x0: number, x1: number, y1: number) => room.push({ p: [(x0 + x1) / 2, (0.5 + y1) / 2, 0.02], s: [x1 - x0, y1 - 0.5, BZ1 - BZ0 - 0.16], c: '#3f4a54' })
    body(BX0, SINK.x0, TOP - 0.24); body(SINK.x1, BX1, TOP - 0.24); body(SINK.x0, SINK.x1, TOP - 1.3)
    room.push({ p: [0, 0.25, -0.1], s: [BX1 - BX0 - 0.4, 0.5, BZ1 - BZ0 - 0.5], c: '#22282d' })
    for (let dx = BX0 + 1.5; dx < BX1; dx += 3) { room.push({ p: [dx, 2.72, BZ1 - 0.05], s: [2.86, 4.1, 0.07], c: '#7b8d9a' }); room.push({ p: [dx + 1.0, 4.3, BZ1 + 0.03], s: [0.6, 0.08, 0.09], c: '#c5cacd' }) }
    // 水池：不锈钢的池子，嵌在台面里
    const sx = (SINK.x0 + SINK.x1) / 2, sz = (SINK.z0 + SINK.z1) / 2, sw = SINK.x1 - SINK.x0, sd = SINK.z1 - SINK.z0
    room.push({ p: [sx, TOP - 1.22, sz], s: [sw, 0.06, sd], c: '#aeb5ba' })
    for (const s of [-1, 1]) { room.push({ p: [sx + s * (sw / 2 - 0.03), TOP - 0.62, sz], s: [0.06, 1.2, sd], c: '#b9c0c5' }); room.push({ p: [sx, TOP - 0.62, sz + s * (sd / 2 - 0.03)], s: [sw, 1.2, 0.06], c: '#b9c0c5' }) }
    room.push({ p: [sx, TOP - 1.18, sz], s: [0.3, 0.03, 0.3], c: '#565d63', cyl: true })
    // —— 后墙：窗台以下一整条、窗楣以上一整条、窗间墙；两头的山墙
    room.push({ p: [0, SILL / 2, WALL - 0.25], s: [RX * 2, SILL, 0.5], c: '#a9b0a9' }); room.push({ p: [0, (LINTEL + H) / 2, WALL - 0.25], s: [RX * 2, H - LINTEL, 0.5], c: '#aeb5ad' })
    const edges = [-RX, ...WINDOWS.flatMap(w => [w - 3.2, w + 3.2]), RX]
    for (let i = 0; i < edges.length; i += 2) room.push({ p: [(edges[i] + edges[i + 1]) / 2, (SILL + LINTEL) / 2, WALL - 0.25], s: [edges[i + 1] - edges[i], LINTEL - SILL, 0.5], c: '#aeb5ad' })
    for (const s of [-1, 1]) room.push({ p: [s * (RX + 0.25), H / 2, 9.75], s: [0.5, H, 25], c: '#bfc6be' })
    // 窗框、窗棂和窗台板
    for (const w of WINDOWS) {
      for (const s of [-1, 1]) room.push({ p: [w + s * 3.12, (SILL + LINTEL) / 2, WALL - 0.2], s: [0.16, LINTEL - SILL, 0.3], c: '#46515b' })
      for (const y of [SILL + 0.08, LINTEL - 0.08, TOP + 7.2]) room.push({ p: [w, y, WALL - 0.2], s: [6.4, 0.14, 0.3], c: '#46515b' })
      room.push({ p: [w, (SILL + LINTEL) / 2, WALL - 0.2], s: [0.12, LINTEL - SILL, 0.26], c: '#46515b' })
      room.push({ p: [w, SILL + 0.02, WALL + 0.12], s: [6.8, 0.1, 0.5], c: '#d6d3c8' })
    }
    // 屋顶的两根钢梁和吊着的灯
    for (const z of [3.2, 12]) room.push({ p: [0, H - 0.3, z], s: [RX * 2, 0.6, 0.5], c: '#59636b' })
    for (const lx of [-27, -9, 9, 27]) for (const s of [-1, 1]) room.push({ p: [lx + s * 4, H - 1.6, 3.2], s: [0.05, 2.2, 0.05], c: '#30363b' })
    // —— 试剂架：四根立柱、两层隔板
    for (const m of SHELVES) {
      for (const sx2 of [-1.75, 1.75]) for (const z of [-2.2, -1.42]) room.push({ p: [m + sx2, TOP + 1.5, z], s: [0.08, 3.0, 0.08], c: '#8f989e' })
      for (const y of [TOP + 0.95, TOP + 1.9]) room.push({ p: [m, y, -1.8], s: [3.6, 0.06, 0.9], c: '#cdd2cd' })
    }
    // —— 右头的通风橱、左头的药品柜
    room.push({ p: [39.5, TOP / 2, 0], s: [8, TOP, 4.6], c: '#c2c8c2' }); room.push({ p: [39.5, TOP + 0.08, 0], s: [8.1, 0.16, 4.7], c: '#343a3f' })
    for (const s of [-1, 1]) room.push({ p: [39.5 + s * 3.85, TOP + 4.1, 0], s: [0.3, 8, 4.6], c: '#c2c8c2' })
    room.push({ p: [39.5, TOP + 8.4, 0], s: [8, 0.6, 4.6], c: '#c2c8c2' }); room.push({ p: [39.5, TOP + 4.1, -2.2], s: [7.4, 8, 0.2], c: '#9aa5a4' }); room.push({ p: [39.5, TOP + 6.9, 2.2], s: [8, 2.5, 0.2], c: '#c9cec8' })
    room.push({ p: [39.5, TOP + 10.2, -0.6], s: [1.1, 3.2, 1.1], c: '#aab2b6', cyl: true }); room.push({ p: [39.5, TOP + 5.5, 2.32], s: [3, 0.14, 0.06], c: '#59636b' })
    room.push({ p: [-41, 6.5, -0.6], s: [6.4, 13, 3.4], c: '#667987' })
    for (const s of [-1, 1]) { room.push({ p: [-41 + s * 1.58, 6.7, 1.12], s: [3.06, 12.2, 0.06], c: '#7b8d9a' }); room.push({ p: [-41 + s * 0.2, 6.6, 1.18], s: [0.08, 1.4, 0.08], c: '#c5cacd' }) }
    // —— 料场：检验台、垫木、木箱、地上的黄线
    const T = YARD
    for (const dx of [-4.5, 4.5]) for (const dz of [-1.5, 1.5]) yardP.push({ p: [T.x + dx, (TOP - 0.18) / 2, T.z + dz], s: [0.3, TOP - 0.18, 0.3], c: '#2f5d4f' })
    yardP.push({ p: [T.x, TOP - 0.36, T.z], s: [9.3, 0.36, 3.3], c: '#2f5d4f' }); yardP.push({ p: [T.x, 1.5, T.z], s: [9, 0.12, 3], c: '#3c6c5c' })
    for (const dx of [-4.5, 4.5]) yardP.push({ p: [T.x + dx, 0.9, T.z], s: [0.2, 0.2, 3], c: '#2f5d4f' })
    yardP.push({ p: [T.x - 8.2, 1.3, T.z - 1.6], s: [3.2, 2.6, 3.2], c: '#a8875a' }); yardP.push({ p: [T.x - 8.2, 2.66, T.z - 1.6], s: [3.4, 0.14, 3.4], c: '#8f7048' })
    for (const dx of [-3.6, 3.6]) yardP.push({ p: [SLAB.x + dx, 0.25, SLAB.z], s: [0.9, 0.5, 6.6], c: '#7a6248' })
    for (const z of [-18, -62]) yardP.push({ p: [4, 0.012, z], s: [150, 0.02, 0.4], c: '#c9a53a' })
    // 铝锭垛（前后两排，有的码两捆高）、铜板垛、钢坯垛
    for (let i = 0; i < 9; i++) for (let r = 0; r < 2; r++) { const bx = -34 + i * 8.2, bz = -56 - r * 9; if (Math.abs(bx - SLAB.x) < 9 && r === 0) continue; bundle(metal, bx, bz, 0); if ((i + r) % 3 !== 1) bundle(metal, bx, bz, 5.6) }
    for (let i = 0; i < 4; i++) { const cx = 30 + i * 8.5, cz = -34
      for (const s of [-2, 2]) yardP.push({ p: [cx + s, 0.2, cz], s: [0.5, 0.4, 6.2], c: '#7a6248' })
      for (let l = 0; l < 34; l++) metal.push({ p: [cx + (rnd() - 0.5) * 0.16, 0.47 + l * 0.14, cz + (rnd() - 0.5) * 0.16], s: [6, 0.12, 6], c: l % 3 ? '#c27a55' : '#b0694a' })
    }
    for (let l = 0; l < 5; l++) for (let i = 0; i < 7; i++) metal.push({ p: [-52, 0.5 + l * 0.95, -30 - i * 1.0], s: [26, 0.9, 0.9], c: (i + l) % 2 ? '#4a4f55' : '#565b61' })
    // 龙门吊：四条腿、两根主梁、小车和吊钩
    for (const gx of [-44, 62]) { for (const gz of [-52, -70]) yardP.push({ p: [gx, 19, gz], s: [1.8, 38, 1.8], c: '#d39b1e' }); yardP.push({ p: [gx, 1, -61], s: [2.4, 2, 22], c: '#b9871a' }) }
    for (const gz of [-55, -67]) yardP.push({ p: [9, 39.5, gz], s: [110, 3, 1.8], c: '#d9a521' })
    yardP.push({ p: [24, 41.6, -61], s: [7, 2.4, 14], c: '#3b454d' }); yardP.push({ p: [24, 31, -61], s: [0.16, 19, 0.16], c: '#22272b' }); yardP.push({ p: [24, 21, -61], s: [1.6, 1.6, 1], c: '#c9a53a' })
    // 熔炼车间：大厂房、屋脊上的通风天窗、一排高窗、大门、两根烟囱
    yardP.push({ p: [10, 24, -128], s: [170, 48, 40], c: '#73808a' }); yardP.push({ p: [10, 51, -128], s: [170, 6, 14], c: '#5d6972' })
    for (let wx = -68; wx <= 88; wx += 9) yardP.push({ p: [wx, 36, -107.9], s: [5.4, 4.4, 0.3], c: '#a9bfcd' })
    yardP.push({ p: [-14, 11, -107.8], s: [18, 22, 0.4], c: '#3f4a52' }); yardP.push({ p: [10, 46.5, -107.9], s: [170, 0.8, 0.3], c: '#5d6972' })
    for (const [cx, ch] of [[66, 96], [80, 78]]) { yardP.push({ p: [cx, ch / 2, -124], s: [3.4, ch, 3.4], c: '#b3aba0', cyl: true }); yardP.push({ p: [cx, ch - 6, -124], s: [3.5, 4, 3.5], c: '#b5503f', cyl: true }) }
    // 试剂瓶：棕色的、无色的、白塑料的，瓶盖有黑有蓝有红
    const bodies = ['#74421a', '#74421a', '#a9c4c6', '#d5d7cf', '#3f6f96'], caps = ['#22262a', '#2f5d8a', '#b5443a', '#d5d7cf']
    const jars: THREE.BufferGeometry[] = []
    for (const m of SHELVES) for (const y of [TOP, TOP + 0.98, TOP + 1.93]) for (let i = 0; i < 7; i++) {
      if (rnd() < 0.2) continue
      jars.push(...bottle(m - 1.44 + i * 0.48 + (rnd() - 0.5) * 0.06, y, -1.8 + (rnd() - 0.5) * 0.2, bodies[Math.floor(rnd() * 5)], caps[Math.floor(rnd() * 4)], 0.92 + rnd() * 0.16))
    }
    // 台面：水池的位置留一个洞
    const top = mergeGeometries([plank(BX0 - 0.1, SINK.x0, TOP - 0.24, TOP, BZ0, BZ1 + 0.12), plank(SINK.x1, BX1 + 0.1, TOP - 0.24, TOP, BZ0, BZ1 + 0.12), plank(SINK.x0, SINK.x1, TOP - 0.24, TOP, BZ0, SINK.z0), plank(SINK.x0, SINK.x1, TOP - 0.24, TOP, SINK.z1, BZ1 + 0.12)])
    // 水龙头：一根鹅颈管
    const neck = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0, 0], [0, 1.1, 0], [0.05, 1.5, 0.25], [0.05, 1.5, 0.75], [0.05, 1.22, 0.95]].map(p => new THREE.Vector3(...p))), 40, 0.055, 12)
    return { room: mergeParts(room), metal: mergeParts(metal), yard: mergeParts(yardP), jars: mergeGeometries(jars), top, neck, tapBase: lathe([[0, 0], [0.13, 0], [0.14, 0.01], [0.14, 0.05], [0.08, 0.09], [0.07, 0.2], [0, 0.2]], { segs: 24 }) }
  }, [])
  return (
    <group>
      {/* 光：天光、从窗外斜着进来的背光、屋里几盏不投影的灯、跟着课走的主灯 */}
      <hemisphereLight args={['#e6eef6', '#7a726a', 0.55]} />
      <directionalLight position={[-30, 70, -60]} intensity={0.9} color="#eef4ff" />
      {[-24, 0, 24].map(lx => <pointLight key={lx} position={[lx, H - 3.2, 5]} intensity={230} distance={48} decay={1.7} color="#fff3e2" />)}
      <Key x={x} on={!yard} />
      {/* 天穹 */}
      <mesh position={[0, -6, -60]}><sphereGeometry args={[430, 32, 16]} /><meshBasicMaterial map={tex.sky} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      {/* 地面：屋里是磨石地，屋外是料场的水泥地 */}
      <mesh rotation-x={-Math.PI / 2} position={[10, -0.02, -110]} receiveShadow><planeGeometry args={[520, 380]} /><meshStandardMaterial map={tex.ground} roughness={0.95} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 9.75]} receiveShadow><planeGeometry args={[RX * 2, 24.4]} /><meshStandardMaterial map={tex.floor} roughness={0.7} /></mesh>
      <mesh geometry={geo.room} receiveShadow><Painted rough={0.7} metal={0.05} /></mesh>
      <mesh geometry={geo.yard} castShadow receiveShadow><Painted rough={0.8} metal={0.1} /></mesh>
      <mesh geometry={geo.metal} castShadow receiveShadow><Painted rough={0.42} metal={0.92} /></mesh>
      <mesh geometry={geo.top} receiveShadow><meshPhysicalMaterial map={tex.top} roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} envMapIntensity={0.7} /></mesh>
      <mesh geometry={geo.jars}><meshPhysicalMaterial vertexColors roughness={0.22} clearcoat={0.7} clearcoatRoughness={0.15} /></mesh>
      {/* 台面后面那一截墙贴瓷砖 */}
      <mesh position={[0, (TOP + SILL) / 2 - 0.5, WALL + 0.006]}><planeGeometry args={[BX1 - BX0 + 26, SILL - TOP + 1]} /><meshStandardMaterial map={tex.tiles} roughness={0.32} envMapIntensity={0.6} /></mesh>
      {/* 窗玻璃：一整条，夹在墙厚的中间 */}
      <mesh position={[0, (SILL + LINTEL) / 2, WALL - 0.25]} renderOrder={1}><planeGeometry args={[BX1 - BX0, LINTEL - SILL]} /><meshPhysicalMaterial color="#cfe2ea" transparent opacity={0.1} roughness={0.03} clearcoat={1} depthWrite={false} envMapIntensity={1.5} /></mesh>
      {/* 密度表和吊灯 */}
      {[-13.5, 4.5].map(px => <mesh key={px} position={[px, TOP + 5.6, WALL + 0.01]}><planeGeometry args={[2.1, 2.73]} /><meshStandardMaterial map={tex.poster} roughness={0.8} /></mesh>)}
      {[-27, -9, 9, 27].map(lx => <mesh key={lx} position={[lx, H - 2.8, 3.2]}><boxGeometry args={[9.4, 0.22, 1.1]} /><meshStandardMaterial color="#3a4046" emissive="#fff2d6" emissiveIntensity={0.9} /></mesh>)}
      {/* 水龙头 */}
      <group position={[(SINK.x0 + SINK.x1) / 2, TOP, SINK.z0 - 0.45]}>
        <mesh geometry={geo.tapBase} castShadow><Metal kind="chrome" rough={0.12} /></mesh>
        <mesh geometry={geo.neck} position-y={0.18} castShadow><Metal kind="chrome" rough={0.1} /></mesh>
        <mesh position={[0.3, 0.12, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 0.34, 12]} /><Metal kind="chrome" rough={0.12} /></mesh>
      </group>
      {/* 通风橱的玻璃拉门 */}
      <mesh position={[39.5, TOP + 3.6, 2.2]} renderOrder={1}><planeGeometry args={[7.4, 3.9]} /><meshPhysicalMaterial color="#cfe2ea" transparent opacity={0.14} roughness={0.03} clearcoat={1} depthWrite={false} /></mesh>
      {/* 料场检验台的钢台面，和一块轧制用的大铝锭 */}
      <mesh position={[YARD.x, TOP - 0.09, YARD.z]} castShadow receiveShadow><boxGeometry args={[9.6, 0.18, 3.6]} /><Metal kind="steel" grain="brushed" rough={0.55} repeat={[6, 3]} env={0.7} /></mesh>
      <RoundedBox args={[12, 3, 6]} radius={0.16} smoothness={3} position={[SLAB.x, 2, SLAB.z]} castShadow receiveShadow><Metal kind="aluminum" grain="cast" rough={0.5} repeat={[6, 3]} env={0.7} /></RoundedBox>
    </group>
  )
}
