// 物态变化实验室的大场景：山脚下的一座气象观测站。屋里靠窗一长排实验台，各课在台上各占一处；
// 窗外是草地、观测场、松林，再往远是雪线和雪山。第 7 课和拓展课的水循环在屋外：从山脚的草地一路到雪线上。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。屋里 1 cm 画成 CM 个单位；屋外的山是缩小了画的。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, lathe, makeGround, mergeParts, useRipple, type Part } from '@/lab-kit'
import { CHANGES, CHANGE_KEYS } from './physics'
import { Fridge } from './fridge'
import { Outdoors } from './outdoor'

export const CM = 0.06, TOP = 5.1            // 1 cm 在画面里多长；实验台台面的高度（85 cm）
/** 各课在实验台上的位置（x 坐标） */
export const ST = { s1: -27, s2: -18, s3: -9, s4: 0, s5: 9, s6: 18, sx: 27 }
/** 电冰箱（屋子右头）、湖（水循环）在哪 */
export const FRIDGE_AT = { x: 39.6, z: -0.1 }, LAKE = { x: 250, z: -170, r: 80 }
/** 屋外的六处：地面被整成一块平地，各在不同的高度上 */
export const SITE = {
  dew: { x: -34, z: -44, y: 0.6, r: 13 },
  dry: { x: -4, z: -46, y: 0.8, r: 12 },
  thaw: { x: 34, z: -150, y: 7, r: 13 },
  pond: { x: -34, z: -236, y: 12.5, r: 15 },
  stiff: { x: 12, z: -262, y: 16, r: 12 },
  frost: { x: 56, z: -292, y: 20, r: 12 },
  yard: { x: 0, z: -78, y: 1.6, r: 20 },
}
const PADS = [...Object.values(SITE), { x: LAKE.x, z: LAKE.z, y: -1.6, r: LAKE.r }]

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], out = false) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, out })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  s1: spot(ST.s1 + 0.15, TOP + 1.25, 0.3, 4.3, 2.9, [-0.2, 0.12]),
  s2: spot(ST.s2 + 0.45, TOP + 1.6, 0.3, 3.8, 3.5, [0.22, 0.1]),
  s3: spot(ST.s3 - 0.35, TOP + 1.25, 0.4, 6.0, 3.0, [-0.1, 0.14]),
  s4: spot(ST.s4 + 0.1, TOP + 1.6, 0.3, 3.3, 3.5, [-0.26, 0.09]),
  s5: spot(ST.s5 + 0.5, TOP + 1.25, 0.3, 4.6, 3.0, [0.16, 0.13]),
  s5b: spot(ST.s5 + 3.1, TOP + 0.95, 0.4, 3.2, 2.7, [0.1, 0.16]),
  s6: spot(ST.s6 + 0.1, TOP + 0.75, 0.4, 3.8, 2.1, [-0.14, 0.17]),
  s6b: spot(ST.s6 + 0.3, TOP + 0.62, 0.4, 3.1, 2.0, [0.2, 0.2]),
  sx: spot(ST.sx + 0.3, TOP + 1.5, 0.3, 3.8, 3.4, [-0.18, 0.1]),
  fridge: spot(FRIDGE_AT.x + 0.3, 5.6, 0.4, 9.5, 11.6, [-0.42, 0.1]),
  dew: spot(SITE.dew.x, SITE.dew.y + 1.5, SITE.dew.z, 11, 6, [0.3, 0.16], true),
  dry: spot(SITE.dry.x, SITE.dry.y + 5, SITE.dry.z, 20, 11, [-0.3, 0.1], true),
  thaw: spot(SITE.thaw.x, SITE.thaw.y + 3.4, SITE.thaw.z, 15, 9, [0.25, 0.14], true),
  pond: spot(SITE.pond.x, SITE.pond.y + 1.5, SITE.pond.z, 26, 12, [-0.2, 0.3], true),
  stiff: spot(SITE.stiff.x, SITE.stiff.y + 5, SITE.stiff.z, 20, 11, [0.3, 0.1], true),
  frost: spot(SITE.frost.x, SITE.frost.y + 6.5, SITE.frost.z, 14, 11, [-0.35, 0.08], true),
  cycle: spot(LAKE.x + 20, 52, LAKE.z - 120, 420, 190, [0.5, 0.2], true),
}
export type SpotKey = keyof typeof SPOT
/** 舞台设置：不用天空图，自己画天穹；环境光用摄影棚式的柔光板，金属和玻璃上才有亮带 */
export const AIR = { sky: false, backdrop: '#c6d6e2', env: 0.62, fog: [260, 1500] as [number, number], studio: true }
/** 每一课交给世界的要求：主灯跟到哪一处；是不是在室外；冰箱开没开门、通没通电；水循环转不转 */
export interface Want { x: number; out: boolean; fridge?: number; power?: boolean; cycle?: boolean }

// ---------- 地形 ----------
const sm = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k) }
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x: number, y: number) => 0.5 * noise(x, y) + 0.25 * noise(x * 2.03, y * 2.03) + 0.125 * noise(x * 4.1, y * 4.1) + 0.0625 * noise(x * 8.2, y * 8.2)
/** 地面有多高：屋后是平缓的草地，越往远越高，最远处是山脊。六处平地和湖是后来整平的 */
export function ground(x: number, z: number) {
  const d = Math.max(0, -z - 16)
  const ridge = 1 - Math.abs(2 * fbm(x / 230 + 7.7, z / 280 + 2.3) - 1)
  let h = 15 * sm(d / 270) + 5 * (fbm(x / 50 + 9.2, z / 50 + 4.4) - 0.47) * sm(d / 110) + sm((d - 250) / 330) * (24 + 135 * ridge * ridge + 36 * fbm(x / 120 + 3.1, z / 120 + 1.7))
  for (const p of PADS) { const k = 1 - sm((Math.hypot(x - p.x, z - p.z) - p.r) / (p.r * 0.9)); h += (p.y - h) * k }
  return h
}
/** 雪线：这个高度以上是雪 */
export const SNOW = 10.5
function makeTerrain() {
  const NX = 170, NZ = 132, X0 = -720, X1 = 820, Z0 = 260, Z1 = -800
  const pos: number[] = [], col: number[] = [], idx: number[] = [], uv: number[] = []
  const grass = new THREE.Color('#70803f'), dry = new THREE.Color('#8f8a52'), rock = new THREE.Color('#6d7178'), snow = new THREE.Color('#e3e9ee'), shade = new THREE.Color('#bccbd8'), c = new THREE.Color()
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const x = X0 + (X1 - X0) * i / NX, z = Z0 + (Z1 - Z0) * j / NZ
    const h = ground(x, z) - (z > -6 ? 0.08 : 0), slope = Math.hypot(ground(x + 3, z) - h, ground(x, z + 3) - h) / 3
    const n = fbm(x / 30, z / 30), line = SNOW + (n - 0.5) * 5
    if (h > line) c.copy(slope > 0.85 ? rock : snow).lerp(shade, slope > 0.85 ? 0 : Math.min(0.6, slope * 0.7))
    else c.copy(grass).lerp(dry, n).lerp(snow, sm((h - line + 3.5) / 3.5) * (n > 0.45 ? 0.9 : 0.2))
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.25 && h < 3) c.set('#8a8468')
    pos.push(x, h, z); col.push(c.r, c.g, c.b); uv.push(x / 34, z / 34)
    if (i < NX && j < NZ) { const a = j * (NX + 1) + i, b = a + 1, e = a + NX + 1, f = e + 1; idx.push(a, b, e, b, f, e) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
  return g
}

let seed = 5
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
/** 给一个模型整体刷上一种颜色（顶点颜色），好和别的模型合并成一个 */
export function tint(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  const out = g.index ? g.toNonIndexed() : g
  out.deleteAttribute('uv')
  return out
}
/** 松林：三层树冠加一截树干，高矮不一，种在雪线上下的坡上 */
function makePines() {
  const out: THREE.BufferGeometry[] = []
  for (let i = 0; i < 620; i++) {
    const x = -520 + rnd() * 1120, z = -70 - rnd() * 330, h = ground(x, z)
    if (h > 34 || PADS.some(p => Math.hypot(x - p.x, z - p.z) < p.r * 1.7) || (Math.abs(x) < 60 && z > -110 && rnd() < 0.7)) continue
    const s = 5 + rnd() * 6, snowy = h > SNOW - 2, green = snowy ? '#3f5a4a' : rnd() < 0.5 ? '#2f5235' : '#3a5f3a'
    const m = new THREE.Matrix4().makeScale(s, s * (0.9 + rnd() * 0.5), s).setPosition(x, h - 0.2, z)
    const parts = [tint(new THREE.CylinderGeometry(0.06, 0.09, 0.5, 6).translate(0, 0.25, 0), '#4a3a2b'),
      ...[0, 1, 2].map(k => tint(new THREE.ConeGeometry(0.42 - k * 0.1, 0.62, 7).translate(0, 0.62 + k * 0.36, 0), k === 2 && snowy ? '#dfe7ec' : green))]
    out.push(...parts.map(g => g.applyMatrix4(m)))
  }
  return mergeGeometries(out)
}
/** 云：几团压扁的球挤在一起 */
function makeCloud(n: number, w: number) {
  return mergeGeometries(Array.from({ length: n }, (_, i) => { const r = (0.5 + rnd() * 0.6) * w * 0.3; return new THREE.IcosahedronGeometry(r, 2).scale(1.25, 0.62, 0.9).translate((i / (n - 1) - 0.5) * w + (rnd() - 0.5) * r, (rnd() - 0.3) * r * 0.5, (rnd() - 0.5) * w * 0.3) }))
}

// ---------- 屋里的贴图 ----------
/** 木地板：一条条长木板，颜色深浅不一，板缝深一点 */
function makeBoards(base: [number, number, number], rows = 8) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  for (let r = 0; r < rows; r++) {
    const y = r * S / rows, off = rnd() * S
    for (let k = 0; k < 3; k++) { const v = (rnd() - 0.5) * 26; g.fillStyle = `rgb(${base[0] + v},${base[1] + v * 0.8},${base[2] + v * 0.6})`; g.fillRect((off + k * S / 2) % S - S / 2, y, S / 2, S / rows); g.fillRect((off + k * S / 2) % S, y, S / 2, S / rows) }
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(60,36,14,${0.05 + rnd() * 0.1})`; g.lineWidth = 1; const yy = y + rnd() * S / rows; g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(S / 3, yy + (rnd() - 0.5) * 6, S * 2 / 3, yy + (rnd() - 0.5) * 6, S, yy); g.stroke() }
    g.fillStyle = 'rgba(30,18,8,0.55)'; g.fillRect(0, y, S, 2); g.fillRect((off + S / 2) % S, y, 2, S / rows); g.fillRect(off % S, y, 2, S / rows)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 台面：深色的实芯理化板，上面撒着细小的颗粒 */
function makeSpeckle() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#2b3136'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 5200; i++) { g.fillStyle = rnd() < 0.5 ? `rgba(150,160,168,${0.1 + rnd() * 0.22})` : `rgba(10,12,14,${0.15 + rnd() * 0.3})`; g.beginPath(); g.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 1.6, 0, 7); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 天穹：头顶蓝，越靠近地平线越白 */
function makeSky() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 1024
  const g = c.getContext('2d')!, k = g.createLinearGradient(0, 0, 0, 1024)
  k.addColorStop(0, '#3f78b8'); k.addColorStop(0.4, '#6f9fd0'); k.addColorStop(0.475, '#a9c6e0'); k.addColorStop(0.5, '#d2dfe9'); k.addColorStop(1, '#d6e0e8')
  g.fillStyle = k; g.fillRect(0, 0, 4, 1024)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
/** 墙上的挂图：固、液、气三种状态和六种变化，名称和吸放热都从计算核心取 */
function makePoster() {
  const c = document.createElement('canvas'); c.width = 420; c.height = 520
  const g = c.getContext('2d')!
  g.fillStyle = '#f0eee2'; g.fillRect(0, 0, 420, 520); g.strokeStyle = '#3c5568'; g.lineWidth = 6; g.strokeRect(10, 10, 400, 500)
  g.fillStyle = '#3c5568'; g.fillRect(10, 10, 400, 70); g.fillStyle = '#f0eee2'; g.font = '700 36px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('物态变化', 210, 46)
  const P: Record<string, [number, number]> = { 固态: [90, 420], 液态: [330, 420], 气态: [210, 170] }
  g.lineWidth = 4
  for (const k of CHANGE_KEYS) {
    const ch = CHANGES[k], a = P[ch.from], b = P[ch.to], hot = ch.heat === '吸热', dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l * 11, ny = dx / l * 11
    g.strokeStyle = g.fillStyle = hot ? '#c8502c' : '#2f6fa8'
    g.beginPath(); g.moveTo(a[0] + dx * 0.24 + nx, a[1] + dy * 0.24 + ny); g.lineTo(a[0] + dx * 0.76 + nx, a[1] + dy * 0.76 + ny); g.stroke()
    g.font = '600 21px sans-serif'; g.fillText(ch.name, (a[0] + b[0]) / 2 + nx * 2.9, (a[1] + b[1]) / 2 + ny * 2.9)
  }
  for (const [name, [x, y]] of Object.entries(P)) { g.fillStyle = '#f0eee2'; g.strokeStyle = '#1f2a30'; g.beginPath(); g.arc(x, y, 44, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#1f2a30'; g.font = '700 28px sans-serif'; g.fillText(name, x, y + 2) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/** 墙上的气压表：白表盘、一圈刻度、一根指针 */
function makeDial() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#f2efe4'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill()
  g.strokeStyle = '#20262b'; g.translate(128, 128)
  for (let i = 0; i <= 50; i++) { const a = Math.PI * 0.75 + i / 50 * Math.PI * 1.5; g.lineWidth = i % 5 ? 2 : 4; g.beginPath(); g.moveTo(Math.cos(a) * (i % 5 ? 104 : 96), Math.sin(a) * (i % 5 ? 104 : 96)); g.lineTo(Math.cos(a) * 114, Math.sin(a) * 114); g.stroke() }
  g.rotate(-0.5); g.fillStyle = '#b8352c'; g.beginPath(); g.moveTo(-5, 16); g.lineTo(0, -98); g.lineTo(5, 16); g.fill(); g.fillStyle = '#20262b'; g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

/** 试剂瓶：瓶身、瓶盖、标签，各刷各的颜色 */
const BOTTLE = lathe([[0, 0], [0.15, 0], [0.17, 0.02], [0.17, 0.36], [0.15, 0.43], [0.075, 0.5], [0.065, 0.52], [0.065, 0.57], [0, 0.57]], { segs: 20 })
const CAP = lathe([[0, 0.56], [0.082, 0.56], [0.088, 0.57], [0.088, 0.65], [0.074, 0.67], [0, 0.67]], { segs: 16 })
function bottle(x: number, y: number, z: number, body: string, cap: string, k: number) {
  const m = new THREE.Matrix4().makeScale(k, k * (0.85 + rnd() * 0.3), k).setPosition(x, y, z)
  const label = new THREE.CylinderGeometry(0.173, 0.173, 0.2, 20, 1, true, -1.1 + rnd(), 2.2).translate(0, 0.22, 0)
  return [tint(BOTTLE.clone(), body), tint(CAP.clone(), cap), tint(label, '#e4e0d0')].map(g => g.applyMatrix4(m))
}

const BX0 = -33, BX1 = 33, BZ0 = -2.3, BZ1 = 2.3, WALL = -2.4, SILL = TOP + 1.7, LINTEL = TOP + 10.5, H = 19.5, RX = 46
const WINDOWS = Object.values(ST), PIERS = [-22.5, -13.5, -4.5, 4.5, 13.5, 22.5]

/** 跟着当前这一课走的主灯：从前上方斜着打下来，只有它投影子。到室外时关掉，由阳光接手 */
function Key({ x, on }: { x: number; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 2.6, TOP + 8.5, 6); aim.position.set(cur.current, TOP + 0.6, 0); aim.updateMatrixWorld()
    l.intensity += ((on ? 420 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.56} penumbra={0.9} intensity={0} distance={34} decay={1.6} color="#fff1dc" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0006} shadow-normalBias={0.02} />
  </>
}
/** 天上的云：慢慢往一边飘 */
function Clouds({ geo }: { geo: THREE.BufferGeometry[] }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (g.current) g.current.position.x = Math.sin(clock.elapsedTime * 0.02) * 40 })
  const at: [number, number, number][] = [[-330, 150, -560], [-120, 175, -640], [90, 140, -520], [470, 165, -600], [-520, 130, -480], [640, 150, -520]]
  return <group ref={g}>{at.map((p, i) => <mesh key={i} geometry={geo[i % geo.length]} position={p}><meshStandardMaterial color="#eef2f5" roughness={1} emissive="#9fb2c4" emissiveIntensity={0.25} /></mesh>)}</group>
}

export function World({ x = ST.s1, out = false, fridge = 0, power = false, cycle = false }: Partial<Want>) {
  const tex = useMemo(() => {
    seed = 5
    const floor = makeBoards([150, 112, 74]); floor.repeat.set(14, 5)
    const wood = makeBoards([126, 92, 58], 4); wood.repeat.set(10, 1)
    const wall = makeGround('#d8d4c6', '196,190,176', '226,222,212', 11); wall.repeat.set(16, 4)
    const soil = makeGround('#f0f0ea', '166,174,152', '255,255,255', 31)
    return { top: makeSpeckle(), floor, wood, wall, soil, sky: makeSky(), poster: makePoster(), dial: makeDial() }
  }, [])
  const ripple = useRipple(9, 0.012)
  const geo = useMemo(() => {
    seed = 9
    const room: Part[] = [], trim: Part[] = []
    // —— 实验台：木柜体、深色踢脚、一扇扇柜门和拉手
    room.push({ p: [0, 0.25, -0.1], s: [BX1 - BX0 - 0.4, 0.5, BZ1 - BZ0 - 0.5], c: '#22262a' })
    for (let dx = BX0 + 1.5; dx < BX1; dx += 3) { trim.push({ p: [dx, 2.72, BZ1 - 0.05], s: [2.84, 4.1, 0.07], c: '#9a7a55' }); trim.push({ p: [dx, 2.72, BZ1 - 0.01], s: [2.3, 3.5, 0.03], c: '#a98862' }); trim.push({ p: [dx + 1.0, 4.3, BZ1 + 0.04], s: [0.6, 0.08, 0.1], c: '#2a2e32' }) }
    // —— 后墙的窗框、窗棂、窗台板
    for (const w of WINDOWS) {
      for (const s of [-1, 1]) trim.push({ p: [w + s * 3.3, (SILL + LINTEL) / 2, WALL - 0.2], s: [0.2, LINTEL - SILL, 0.34], c: '#5b4634' })
      for (const y of [SILL + 0.1, LINTEL - 0.1]) trim.push({ p: [w, y, WALL - 0.2], s: [6.8, 0.2, 0.34], c: '#5b4634' })
      trim.push({ p: [w, (SILL + LINTEL) / 2, WALL - 0.2], s: [0.12, LINTEL - SILL, 0.26], c: '#5b4634' }); trim.push({ p: [w, TOP + 7.4, WALL - 0.2], s: [6.6, 0.12, 0.26], c: '#5b4634' })
      trim.push({ p: [w, SILL - 0.02, WALL + 0.16], s: [7.2, 0.12, 0.6], c: '#c9b28c' })
    }
    // 屋顶的梁、吊灯的吊杆；屋顶板
    for (const z of [3.2, 12]) room.push({ p: [0, H - 0.4, z], s: [RX * 2, 0.8, 0.6], c: '#6a5440' })
    for (let bx = -RX + 6; bx < RX; bx += 11.5) room.push({ p: [bx, H - 0.25, 9.6], s: [0.5, 0.5, 25], c: '#6a5440' })
    for (const lx of [-27, -9, 9, 27]) for (const s of [-1, 1]) room.push({ p: [lx + s * 4, H - 1.6, 3.2], s: [0.05, 2.2, 0.05], c: '#30363b' })
    room.push({ p: [0, H + 0.3, 8.6], s: [RX * 2 + 4, 0.6, 28], c: '#8d8676' })
    // —— 窗间墙上的搁板和托架
    for (const m of PIERS) { for (const y of [TOP + 1.25, TOP + 2.4]) trim.push({ p: [m, y, -1.95], s: [2.3, 0.07, 0.8], c: '#b59468' }); for (const s of [-1, 1]) trim.push({ p: [m + s * 1.0, TOP + 1.82, -2.28], s: [0.07, 1.3, 0.14], c: '#7b6248' }) }
    // —— 左头的仪器柜、屋角的衣帽架
    room.push({ p: [-41, 6.5, -0.6], s: [6.4, 13, 3.4], c: '#7b6248' })
    for (const s of [-1, 1]) { trim.push({ p: [-41 + s * 1.58, 6.7, 1.12], s: [3.0, 12.2, 0.06], c: '#9a7a55' }); trim.push({ p: [-41 + s * 0.2, 6.6, 1.18], s: [0.08, 1.4, 0.08], c: '#2a2e32' }) }
    // 瓶瓶罐罐：棕色的、无色的、白塑料的
    const bodies = ['#74421a', '#74421a', '#a9c4c6', '#d5d7cf', '#3f6f96'], caps = ['#22262a', '#2f5d8a', '#b5443a', '#d5d7cf']
    const jars: THREE.BufferGeometry[] = []
    for (const m of PIERS) for (const y of [TOP + 1.29, TOP + 2.44]) for (let i = 0; i < 4; i++) {
      if (rnd() < 0.2) continue
      jars.push(...bottle(m - 0.78 + i * 0.52 + (rnd() - 0.5) * 0.06, y, -1.95 + (rnd() - 0.5) * 0.2, bodies[Math.floor(rnd() * 5)], caps[Math.floor(rnd() * 4)], 0.9 + rnd() * 0.18))
    }
    // 后墙：一整面，窗洞挖掉；两头的山墙
    const wall = new THREE.Shape(); wall.moveTo(-RX, 0); wall.lineTo(RX, 0); wall.lineTo(RX, H); wall.lineTo(-RX, H); wall.closePath()
    for (const w of WINDOWS) { const hole = new THREE.Path(); hole.moveTo(w - 3.2, SILL); hole.lineTo(w - 3.2, LINTEL); hole.lineTo(w + 3.2, LINTEL); hole.lineTo(w + 3.2, SILL); hole.closePath(); wall.holes.push(hole) }
    const back = new THREE.ExtrudeGeometry(wall, { depth: 0.5, bevelEnabled: false }).translate(0, 0, WALL - 0.5)
    const uv = back.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (RX * 2), uv.getY(i) / H)
    const ends = mergeGeometries([-1, 1].map(s => new THREE.BoxGeometry(0.5, H, 25).translate(s * (RX + 0.25), H / 2, 9.75)))
    const cab = new THREE.BoxGeometry(BX1 - BX0, TOP - 0.74, BZ1 - BZ0 - 0.16).translate(0, 0.5 + (TOP - 0.74) / 2, 0.02)
    const top = new THREE.BoxGeometry(BX1 - BX0 + 0.3, 0.24, BZ1 - BZ0 + 0.14).translate(0, TOP - 0.12, 0.07)
    { const p = top.attributes.position, u = top.attributes.uv; for (let i = 0; i < p.count; i++) u.setXY(i, p.getX(i) / 1.6, (p.getZ(i) + p.getY(i)) / 1.6) }
    seed = 21
    return { room: mergeParts(room), trim: mergeParts(trim), jars: mergeGeometries(jars), back, ends, cab, top, terrain: makeTerrain(), pines: makePines(), clouds: [makeCloud(7, 150), makeCloud(5, 110), makeCloud(9, 190)] }
  }, [])
  return (
    <group>
      {/* 光：天光、照着雪山的日光（不投影）、屋里几盏灯、跟着课走的主灯 */}
      <hemisphereLight args={['#e8f0f8', '#7c7468', out ? 0.75 : 0.6]} />
      <directionalLight position={[60, 90, 40]} intensity={out ? 0.35 : 1.05} color="#fff6ea" />
      {[-24, 0, 24].map(lx => <pointLight key={lx} position={[lx, H - 3.4, 5]} intensity={250} distance={50} decay={1.7} color="#fff0dc" />)}
      <Key x={x} on={!out} />
      <mesh position={[0, -20, 0]}><sphereGeometry args={[860, 32, 16]} /><meshBasicMaterial map={tex.sky} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      {/* 屋外：地形、松林、云、湖 */}
      <mesh geometry={geo.terrain} receiveShadow><meshStandardMaterial vertexColors map={tex.soil} roughness={0.95} flatShading /></mesh>
      <mesh geometry={geo.pines} castShadow><meshStandardMaterial vertexColors roughness={0.9} flatShading /></mesh>
      <Clouds geo={geo.clouds} />
      <mesh rotation-x={-Math.PI / 2} position={[LAKE.x, 0.1, LAKE.z]}><circleGeometry args={[LAKE.r * 1.5, 64]} /><meshPhysicalMaterial color="#2f6f96" roughness={0.12} metalness={0.1} normalMap={ripple} normalScale={new THREE.Vector2(0.5, 0.5)} envMapIntensity={1.2} /></mesh>
      <Outdoors cycle={cycle} />
      {/* 屋里 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 9.75]} receiveShadow><planeGeometry args={[RX * 2, 24.4]} /><meshStandardMaterial map={tex.floor} roughness={0.55} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial map={tex.wall} color="#9d998c" roughness={0.9} /></mesh>
      <mesh geometry={geo.ends} receiveShadow><meshStandardMaterial color="#a39f92" roughness={0.9} /></mesh>
      <mesh geometry={geo.room} receiveShadow><Painted rough={0.75} metal={0.02} /></mesh>
      <mesh geometry={geo.trim} receiveShadow castShadow><Painted rough={0.6} metal={0.02} /></mesh>
      <mesh geometry={geo.cab} receiveShadow><meshStandardMaterial map={tex.wood} roughness={0.6} /></mesh>
      <mesh geometry={geo.top} receiveShadow><meshPhysicalMaterial map={tex.top} roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} envMapIntensity={0.7} /></mesh>
      <mesh geometry={geo.jars}><meshPhysicalMaterial vertexColors roughness={0.22} clearcoat={0.7} clearcoatRoughness={0.15} /></mesh>
      {/* 窗玻璃：一整条，夹在墙厚的中间 */}
      <mesh position={[0, (SILL + LINTEL) / 2, WALL - 0.25]} renderOrder={1}><planeGeometry args={[BX1 - BX0 + 6, LINTEL - SILL]} /><meshPhysicalMaterial color="#cfe2ea" transparent opacity={0.08} roughness={0.03} clearcoat={1} depthWrite={false} envMapIntensity={1.2} /></mesh>
      {/* 窗间墙上：挂图、气压表 */}
      {PIERS.map((px, i) => i % 2 === 0
        ? <mesh key={px} position={[px, TOP + 6.1, WALL + 0.012]}><planeGeometry args={[2.1, 2.6]} /><meshStandardMaterial map={tex.poster} roughness={0.8} /></mesh>
        : <group key={px} position={[px, TOP + 5.9, WALL]}>
            <mesh rotation-x={Math.PI / 2} position-z={0.06}><cylinderGeometry args={[0.92, 0.98, 0.12, 40]} /><Metal kind="brass" grain="turned" /></mesh>
            <mesh position-z={0.125}><circleGeometry args={[0.82, 40]} /><meshStandardMaterial map={tex.dial} roughness={0.6} /></mesh>
          </group>)}
      {[-27, -9, 9, 27].map(lx => <mesh key={lx} position={[lx, H - 2.8, 3.2]}><boxGeometry args={[9.4, 0.22, 1.1]} /><meshStandardMaterial color="#3a4046" emissive="#fff2d6" emissiveIntensity={0.9} /></mesh>)}
      <Fridge at={[FRIDGE_AT.x, 0, FRIDGE_AT.z]} open={fridge} power={power} />
    </group>
  )
}
