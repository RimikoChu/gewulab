// 内能和热机实验室的大场景：一座汽车发动机厂的厂房。整个实验室只有这一个世界，各课在里面各占一处；换课时画布不重建，镜头飞过去。
// 厂房沿 x 方向：左头是质检实验室（靠后墙一长排实验台，第 1–4 课），中间两间发动机测试间（第 5、7 课），再往右是培训区（第 6 课），右头是总装线（拓展课）。
// 场景单位：1 = 1 dm（10 cm）。实验台上的器材按真实尺寸画。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Metal, Painted, lathe, makeGround, mergeParts, useConcrete, type Label, type Part } from '@/lab-kit'
import { Engine, TestStand } from './engine'

/** 1 cm 在画面里多长；实验台台面的高度（90 cm） */
export const CM = 0.1, TOP = 9
/** 实验台台面前后的中线（z） */
export const BZ = -61.5
/** 各课的位置（x 坐标） */
export const ST = { s1: -212, s2: -192, s3: -172, s4: -152, s5: -72, s7: -12, s6: 62, sx: 160 }
/** 测试间里发动机台架的位置（z），培训区展示台、总装线 */
export const BAY_Z = -44, SHOW_Z = -40, LINE_Z = -40
/** 展示台台面高度 */
export const PLINTH = 8.2

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
/** 各课的机位：每处的远近和角度都不一样 */
export const SPOT = {
  s1: spot(ST.s1 - 0.1, TOP + 1.45, BZ, 4.3, 3.3, [-0.2, 0.1]),
  s2: spot(ST.s2 + 0.15, TOP + 1.85, BZ, 2.0, 2.4, [0.22, 0.1]),
  s2s: spot(ST.s2 + 1.25, TOP + 0.42, BZ + 0.7, 2.5, 1.3, [0.28, 0.3]),
  s3w: spot(ST.s3 - 0.55, TOP + 0.95, BZ + 0.2, 2.4, 1.7, [-0.05, 0.16]),
  s3b: spot(ST.s3 + 1.95, TOP + 0.75, BZ, 2.7, 1.9, [0.12, 0.14]),
  s3: spot(ST.s3 - 3.3, TOP + 1.75, BZ, 2.4, 3.6, [-0.15, 0.1]),
  s4: spot(ST.s4 - 0.3, TOP + 1.2, BZ, 3.9, 2.6, [0.16, 0.12]),
  s5: spot(ST.s5 - 2.4, 6.6, BAY_Z + 1.2, 15, 9.2, [-0.22, 0.14]),
  s6: spot(ST.s6 - 0.1, PLINTH + 2.6, SHOW_Z, 5.4, 6.4, [-0.36, 0.07]),
  s7: spot(ST.s7 + 0.6, 6.6, BAY_Z + 1.2, 16, 9.2, [0.24, 0.13]),
  sx: spot(ST.sx + 0.2, PLINTH + 2.5, LINE_Z + 4, 9.6, 7.4, [0.12, 0.07]),
  all: spot(55, 4, -40, 105, 72, [-0.72, 0.52]),
}
export type SpotKey = keyof typeof SPOT
/** 每一课交给世界的要求：主灯跟到哪一处；两间测试间的发动机转不转、多热 */
export interface Want { x: number; z: number; bayA?: { run: number; hot: number }; bayB?: { run: number; hot: number } }

/** 这一课的舞台：选一处机位。bloom：火焰、烧红的排气管周围溢出一点光 */
export function Room({ at, labels, bloom = 0.25, bayA, bayB, fog = [180, 700], children = null }: { at: SpotKey; labels: Label[]; bloom?: number; bayA?: Want['bayA']; bayB?: Want['bayB']; fog?: [number, number]; children?: ReactNode }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, z: v.target.z, bayA, bayB }), [v, bayA?.run, bayA?.hot, bayB?.run, bayB?.hot])   // eslint-disable-line react-hooks/exhaustive-deps
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={0} bloom={bloom} sky={false} backdrop="#1a1e22" env={0.55} fog={fog} studio world={want}>{children}</LabStage>
}

// ---------- 贴图 ----------
let seed = 3
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
/** 压型钢板的墙：竖向的波纹，用法线贴图做出起伏 */
function makeRibNormal() {
  const W = 256, H = 8, d = new Uint8Array(W * H * 4)
  for (let x = 0; x < W; x++) {
    const u = x / W * Math.PI * 2 * 4, s = Math.cos(u) * 0.55   // 一张贴图里四道波纹
    const l = Math.hypot(s, 1)
    for (let y = 0; y < H; y++) { const i = (y * W + x) * 4; d[i] = (s / l * 0.5 + 0.5) * 255; d[i + 1] = 128; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255 }
  }
  const t = new THREE.DataTexture(d, W, H); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true
  return t
}
/** 吸声墙板：深灰底上一排排小圆孔 */
function makePerforated() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#4a5056'; g.fillRect(0, 0, S, S)
  g.fillStyle = '#23272b'
  for (let y = 8; y < S; y += 16) for (let x = (y / 16) % 2 ? 16 : 8; x < S; x += 16) { g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill() }
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, S, 3); g.fillRect(0, 0, 3, S)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 实验台台面：深色的实芯理化板，撒着细小的颗粒 */
function makeSpeckle() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#4c545a'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 5200; i++) { g.fillStyle = rnd() < 0.5 ? `rgba(150,160,168,${0.08 + rnd() * 0.2})` : `rgba(10,12,14,${0.15 + rnd() * 0.3})`; g.beginPath(); g.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 1.6, 0, 7); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 墙上的瓷砖：白色小方砖，缝是浅灰的 */
function makeTiles() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#b9bcbc'; g.fillRect(0, 0, S, S)
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 228 + (rnd() - 0.5) * 10; g.fillStyle = `rgb(${v},${v + 1},${v})`; g.fillRect(x * 64 + 1.5, y * 64 + 1.5, 61, 61) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 安全标线：黄底黑斜纹（台架四周的警戒带） */
function makeHazard() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 16
  const g = c.getContext('2d')!
  g.fillStyle = '#e0b21e'; g.fillRect(0, 0, 128, 16); g.fillStyle = '#1b1c1d'
  for (let x = -16; x < 140; x += 32) { g.beginPath(); g.moveTo(x, 16); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, 16); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}

// ---------- 厂房的尺寸 ----------
const X0 = -250, X1 = 250, BACK = -68, FRONT = 70, H = 110
const COLS = Array.from({ length: 9 }, (_, i) => X0 + 30 + i * 55)          // 柱网：每 5.5 m 一根
const LAB = { x0: -236, x1: -128 }                                          // 质检实验室这一段
const BAYS = [ST.s5, ST.s7]

/** 试剂瓶：瓶身、瓶盖、标签，各刷各的颜色 */
const BOTTLE = lathe([[0, 0], [0.32, 0], [0.36, 0.04], [0.36, 0.78], [0.3, 0.92], [0.15, 1.02], [0.13, 1.06], [0.13, 1.16], [0, 1.16]], { segs: 18 })
const CAP = lathe([[0, 1.13], [0.16, 1.13], [0.17, 1.15], [0.17, 1.32], [0.14, 1.35], [0, 1.35]], { segs: 14 })
function tint(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  const out = g.index ? g.toNonIndexed() : g
  out.deleteAttribute('uv')
  return out
}
function bottle(x: number, y: number, z: number, body: string, cap: string, k: number) {
  const m = new THREE.Matrix4().makeScale(k, k * (0.85 + rnd() * 0.3), k).setPosition(x, y, z)
  const label = new THREE.CylinderGeometry(0.364, 0.364, 0.4, 18, 1, true, -1.1 + rnd(), 2.2).translate(0, 0.42, 0)
  return [tint(BOTTLE.clone(), body), tint(CAP.clone(), cap), tint(label, '#e6e2d4')].map(g => g.applyMatrix4(m))
}

/** 跟着当前这一课走的主灯：从前上方斜着打下来，只有它投影子 */
function Key({ x, z }: { x: number; z: number }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(new THREE.Vector2(x, z))
  const aim = useMemo(() => new THREE.Object3D(), [])
  const lab = z < -55
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30), k = 1 - Math.exp(-dt / 0.45)
    cur.current.x += (x - cur.current.x) * k; cur.current.y += (z - cur.current.y) * k
    const near = cur.current.y < -55
    l.position.set(cur.current.x - (near ? 3 : 14), near ? TOP + 14 : 58, cur.current.y + (near ? 9 : 26))
    aim.position.set(cur.current.x, near ? TOP : 5, cur.current.y); aim.updateMatrixWorld()
    l.distance = near ? 40 : 120; l.angle = near ? 0.5 : 0.42
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.85} intensity={lab ? 520 : 5200} distance={40} decay={1.6} color="#fff3e2" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-normalBias={0.02} />
  </>
}

export function World({ x = ST.s1, z = BZ, bayA, bayB }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(30, 9)
  const tex = useMemo(() => {
    seed = 3
    const rib = makeRibNormal(); rib.repeat.set(140, 1)
    const perf = makePerforated(); perf.repeat.set(30, 7)
    const tiles = makeTiles(); tiles.repeat.set(27, 4)
    const vinyl = makeGround('#b7bbb8', '160,166,164', '206,210,206', 17); vinyl.repeat.set(16, 3)
    const hazard = makeHazard(); hazard.repeat.set(6, 1)
    return { rib, perf, tiles, vinyl, hazard, top: makeSpeckle() }
  }, [])
  const geo = useMemo(() => {
    seed = 7
    const steel: Part[] = [], paint: Part[] = [], dark: Part[] = []
    // —— 钢柱（H 型：两片翼缘一片腹板）和柱脚
    for (const cx of COLS) for (const cz of [BACK + 1.4, FRONT - 1.4]) {
      for (const s of [-1, 1]) steel.push({ p: [cx + s * 1.3, H / 2, cz], s: [0.22, H, 2.6], c: '#3f6b8c' })
      steel.push({ p: [cx, H / 2, cz], s: [2.4, H, 0.16], c: '#3f6b8c' })
      steel.push({ p: [cx, 0.4, cz], s: [3.6, 0.8, 3.6], c: '#8a8c88' })
      steel.push({ p: [cx, H - 18, cz + (cz < 0 ? 2.2 : -2.2)], s: [2.2, 1.6, 3.2], c: '#3f6b8c' })     // 吊车梁的牛腿
    }
    // —— 屋架：每根柱上一榀，上下弦和斜腹杆
    for (const cx of COLS) {
      const y0 = H - 6
      steel.push({ p: [cx, y0, (BACK + FRONT) / 2], s: [0.8, 0.9, FRONT - BACK], c: '#5d6d78' })
      steel.push({ p: [cx, H + 4, (BACK + FRONT) / 2], s: [0.8, 0.9, FRONT - BACK], c: '#5d6d78' })
      for (let k = 0; k < 14; k++) {
        const za = BACK + k * (FRONT - BACK) / 14, zb = za + (FRONT - BACK) / 14, a = Math.atan2(10, zb - za)
        steel.push({ p: [cx, y0 + 5, (za + zb) / 2], s: [0.45, 0.45, Math.hypot(10, zb - za)], c: '#5d6d78', r: [k % 2 ? a : -a, 0, 0] })
      }
    }
    // 檩条
    for (let zz = BACK + 4; zz < FRONT; zz += 12) steel.push({ p: [0, H + 4.9, zz], s: [X1 - X0, 0.7, 0.5], c: '#5d6d78' })
    // —— 桥式吊车：轨道梁一前一后，横跨厂房的大梁停在测试间上方
    for (const cz of [BACK + 3.6, FRONT - 3.6]) paint.push({ p: [0, H - 16.4, cz], s: [X1 - X0, 1.6, 1.4], c: '#d2a21c' })
    for (const s of [-1, 1]) paint.push({ p: [22 + s * 2, H - 14.4, (BACK + FRONT) / 2], s: [1.2, 3.2, FRONT - BACK - 4], c: '#e0b21e' })
    paint.push({ p: [22, H - 12.4, -20], s: [6.4, 2.4, 6], c: '#e0b21e' })
    // —— 实验台：柜体、柜门、拉手、踢脚
    const W = LAB.x1 - LAB.x0 - 8
    dark.push({ p: [(LAB.x0 + LAB.x1) / 2, 0.4, BZ + 0.2], s: [W - 0.4, 0.8, 6.2], c: '#1c1f22' })
    for (let dx = LAB.x0 + 4 + 3; dx < LAB.x1 - 4; dx += 6) {
      paint.push({ p: [dx, 4.6, BZ + 3.62], s: [5.84, 7.2, 0.12], c: '#d9dbd7' })
      paint.push({ p: [dx + 2.2, 7.4, BZ + 3.74], s: [0.18, 1.4, 0.16], c: '#7c8287' })
    }
    // —— 实验台上方的吊柜和墙上的搁板
    for (let dx = LAB.x0 + 10; dx < LAB.x1 - 8; dx += 20) {
      paint.push({ p: [dx, TOP + 15.5, BACK + 2.2], s: [12, 7, 3.6], c: '#d9dbd7' })
      for (const s of [-1, 1]) dark.push({ p: [dx + s * 3, TOP + 15.5, BACK + 4.04], s: [5.7, 6.6, 0.1], c: '#c8cbc7' })
      paint.push({ p: [dx, TOP + 11.95, BACK + 4.06], s: [11.8, 0.14, 0.14], c: '#7c8287' })
    }
    for (let dx = LAB.x0 + 20; dx < LAB.x1 - 8; dx += 20) paint.push({ p: [dx, TOP + 6, BACK + 1.2], s: [7, 0.2, 2.2], c: '#c9ccc8' })
    // —— 测试间：后墙一整块吸声板（另画），两侧的隔墙、控制台
    for (const bx of BAYS) {
      for (const s of [-1, 1]) dark.push({ p: [bx + s * 25, 13, (BACK + BAY_Z + 18) / 2], s: [1.2, 26, BAY_Z + 18 - BACK], c: '#3c4248' })
    }
    // —— 培训区：后面两排货架，上面放着曲轴、缸盖之类的零件
    for (const rx of [ST.s6 - 20, ST.s6 + 20]) {
      for (const s of [-1, 1]) for (const dz of [0, 9]) paint.push({ p: [rx + s * 7, 16, BACK + 3 + dz * 0 + (dz ? 4.6 : 0)], s: [0.5, 32, 0.5], c: '#2f68a8' })
      for (const y of [1, 11, 21, 31]) { paint.push({ p: [rx, y, BACK + 3], s: [14.5, 0.6, 0.4], c: '#e0782c' }); paint.push({ p: [rx, y, BACK + 7.6], s: [14.5, 0.6, 0.4], c: '#e0782c' }); dark.push({ p: [rx, y + 0.35, BACK + 5.3], s: [14, 0.12, 4.6], c: '#6d7377' }) }
      for (const y of [1.5, 11.5, 21.5]) for (let k = 0; k < 3; k++) dark.push({ p: [rx - 4.5 + k * 4.5, y + 1.6, BACK + 5.3], s: [3.6, 3, 3.6], c: k % 2 ? '#6f6a5e' : '#8b8f8f' })
    }
    // —— 总装线：传送线的两根边梁、支腿、滚筒罩
    const L0 = ST.sx + 10, L1 = X1 - 4
    for (const s of [-1, 1]) paint.push({ p: [(L0 + L1) / 2, 7.2, LINE_Z - 12 + s * 3.2], s: [L1 - L0, 1.2, 0.6], c: '#cfd3d4' })
    for (let lx = L0 + 2; lx < L1; lx += 10) for (const s of [-1, 1]) dark.push({ p: [lx, 3.3, LINE_Z - 12 + s * 3.0], s: [0.6, 6.6, 0.6], c: '#5b6166' })
    for (let lx = L0; lx < L1; lx += 1.2) dark.push({ p: [lx, 7.5, LINE_Z - 12], s: [0.5, 0.5, 6.2], c: '#9ea3a5', cyl: false })
    // 线上方的工位灯和电动拧紧枪的吊轨
    for (let lx = L0 + 6; lx < L1; lx += 16) { dark.push({ p: [lx, 30, LINE_Z - 12], s: [0.3, 32, 0.3], c: '#40464b' }); paint.push({ p: [lx, 22, LINE_Z - 6], s: [0.5, 0.5, 12], c: '#40464b' }) }
    // —— 前面的备件区：一排排木箱和托盘（在各课机位的身后，只有总览时看得见）
    for (let k = 0; k < 14; k++) {
      const cx = -60 + (k % 7) * 16, cz = 30 + Math.floor(k / 7) * 18, n = 1 + Math.floor(rnd() * 3)
      paint.push({ p: [cx, 0.6, cz], s: [10, 1.2, 8], c: '#8a6a44' })
      for (let j = 0; j < n; j++) paint.push({ p: [cx + (rnd() - 0.5) * 2, 1.2 + 3 + j * 6, cz + (rnd() - 0.5) * 1.5], s: [8.5, 6, 6.5], c: j % 2 ? '#a27c50' : '#b38a5a' })
    }
    for (const rx of [150, 185, 220]) for (const y of [1, 12, 23]) { paint.push({ p: [rx, y, 52], s: [26, 0.6, 7], c: '#e0782c' }); for (let k = 0; k < 3; k++) dark.push({ p: [rx - 8 + k * 8, y + 2.6, 52], s: [6, 4.6, 5], c: k % 2 ? '#6f6a5e' : '#8b8f8f' }) }
    for (const rx of [150, 185, 220]) for (const s2 of [-1, 1]) for (const dz of [-3.2, 3.2]) paint.push({ p: [rx + s2 * 13, 15, 52 + dz], s: [0.5, 30, 0.5], c: '#2f68a8' })
    // 后墙下面一圈深色的墙裙
    dark.push({ p: [0, 6, BACK + 0.35], s: [X1 - X0, 12, 0.3], c: '#45525c' })

    // 试剂瓶：吊柜下的搁板上
    const bodies = ['#74421a', '#74421a', '#a9c4c6', '#d5d7cf', '#3f6f96'], caps = ['#22262a', '#2f5d8a', '#b5443a', '#d5d7cf']
    const jars: THREE.BufferGeometry[] = []
    for (let dx = LAB.x0 + 20; dx < LAB.x1 - 8; dx += 20) for (let i = 0; i < 7; i++) {
      if (rnd() < 0.2) continue
      jars.push(...bottle(dx - 3 + i * 1, TOP + 6.1, BACK + 1.2 + (rnd() - 0.5) * 0.6, bodies[Math.floor(rnd() * 5)], caps[Math.floor(rnd() * 4)], 0.85 + rnd() * 0.2))
    }
    // 后墙：一整面压型钢板；上面一圈高窗的窗框
    const wall = new THREE.PlaneGeometry(X1 - X0, H).translate(0, H / 2, BACK)
    const lamps = mergeGeometries(Array.from({ length: 36 }, (_, i) => { const lx = X0 + 25 + (i % 9) * 55, lz = BACK + 14 + Math.floor(i / 9) * 32; return lathe([[0, 0], [1.4, 0], [1.6, 0.4], [1.2, 1.6], [0.3, 1.9], [0.3, 3.4], [0, 3.4]], { segs: 20 }).translate(lx, H - 14, lz) }))
    const bulbs = mergeGeometries(Array.from({ length: 36 }, (_, i) => { const lx = X0 + 25 + (i % 9) * 55, lz = BACK + 14 + Math.floor(i / 9) * 32; return new THREE.CircleGeometry(1.35, 20).rotateX(Math.PI / 2).translate(lx, H - 14.02, lz) }))
    return { steel: mergeParts(steel), paint: mergeParts(paint), dark: mergeParts(dark), jars: mergeGeometries(jars), wall, lamps, bulbs }
  }, [])
  const benchW = LAB.x1 - LAB.x0 - 8, benchX = (LAB.x0 + LAB.x1) / 2
  return (
    <group>
      {/* 光：厂房的天光、高处一排排工矿灯、跟着课走的主灯 */}
      <hemisphereLight args={['#dfe7ee', '#5a554c', 0.55]} />
      <directionalLight position={[60, 120, 80]} intensity={0.55} color="#fff6ea" />
      {[-200, -150, -70, -10, 60, 160, 220].map(lx => <pointLight key={lx} position={[lx, H - 18, -30]} intensity={1400} distance={140} decay={1.6} color="#fff0dc" />)}
      <pointLight position={[benchX, TOP + 20, BZ + 18]} intensity={900} distance={90} decay={1.6} color="#f2f6ff" />
      <Key x={x} z={z} />
      {/* 地面：厂房是环氧地坪；实验室那一段铺浅灰的地胶 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (BACK + FRONT) / 2]} receiveShadow><planeGeometry args={[X1 - X0, FRONT - BACK]} /><meshPhysicalMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#8f9a92" roughness={0.6} clearcoat={0.4} clearcoatRoughness={0.35} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[benchX, 0.02, (BACK + 0) / 2]} receiveShadow><planeGeometry args={[LAB.x1 - LAB.x0, -BACK]} /><meshStandardMaterial map={tex.vinyl} roughness={0.55} /></mesh>
      {/* 通道两边的黄色标线 */}
      {[2, 14].map(lz => <mesh key={lz} rotation-x={-Math.PI / 2} position={[30, 0.03, lz]}><planeGeometry args={[440, 0.7]} /><meshStandardMaterial color="#e0b21e" roughness={0.55} /></mesh>)}
      {/* 测试间台架四周的警戒带 */}
      {BAYS.map(bx => <group key={bx}>
        {[[0, 9], [0, -9]].map(([dx, dz]) => <mesh key={dz} rotation-x={-Math.PI / 2} position={[bx + dx, 0.03, BAY_Z + dz]}><planeGeometry args={[34, 1.0]} /><meshStandardMaterial map={tex.hazard} roughness={0.6} /></mesh>)}
        {[-17, 17].map(dx => <mesh key={dx} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[bx + dx, 0.03, BAY_Z]}><planeGeometry args={[18, 1.0]} /><meshStandardMaterial map={tex.hazard} roughness={0.6} /></mesh>)}
        <mesh position={[bx, 13, BACK + 0.6]}><planeGeometry args={[50, 26]} /><meshStandardMaterial map={tex.perf} roughness={0.85} /></mesh>
      </group>)}
      {/* 墙、钢结构、屋面 */}
      <mesh geometry={geo.wall} receiveShadow><meshStandardMaterial color="#c3c8c6" normalMap={tex.rib} roughness={0.55} metalness={0.35} /></mesh>
      <mesh position={[0, H + 5.6, (BACK + FRONT) / 2]} rotation-x={Math.PI / 2}><planeGeometry args={[X1 - X0, FRONT - BACK]} /><meshStandardMaterial color="#8d9196" roughness={0.9} side={THREE.DoubleSide} /></mesh>
      {/* 屋面上的采光带 */}
      {[BACK + 20, BACK + 52, BACK + 84].map(lz => <mesh key={lz} position={[0, H + 5.5, lz]} rotation-x={Math.PI / 2}><planeGeometry args={[X1 - X0 - 10, 6]} /><meshBasicMaterial color="#d9e6ee" side={THREE.DoubleSide} /></mesh>)}
      <mesh geometry={geo.steel} castShadow receiveShadow><Painted rough={0.45} metal={0.3} /></mesh>
      <mesh geometry={geo.paint} castShadow receiveShadow><Painted rough={0.5} metal={0.15} /></mesh>
      <mesh geometry={geo.dark} castShadow receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
      <mesh geometry={geo.lamps}><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh geometry={geo.bulbs}><meshBasicMaterial color="#fff6e6" toneMapped={false} /></mesh>
      {/* 质检实验室：墙上的白瓷砖、实验台台面、试剂瓶 */}
      <mesh position={[benchX, TOP + 6, BACK + 0.55]} receiveShadow><planeGeometry args={[LAB.x1 - LAB.x0, 12]} /><meshStandardMaterial map={tex.tiles} roughness={0.35} /></mesh>
      <mesh position={[benchX, TOP - 0.2, BZ + 0.15]} castShadow receiveShadow><boxGeometry args={[benchW, 0.4, 7.6]} /><meshPhysicalMaterial map={tex.top} roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} envMapIntensity={0.7} /></mesh>
      <mesh position={[benchX, TOP - 4.4, BZ + 0.1]} receiveShadow><boxGeometry args={[benchW - 0.2, 8, 7]} /><meshStandardMaterial color="#cfd2ce" roughness={0.6} /></mesh>
      {/* 台面后沿的挡水条和一排电源插座 */}
      <mesh position={[benchX, TOP + 0.5, BACK + 2.65]} castShadow><boxGeometry args={[benchW, 1, 0.5]} /><meshStandardMaterial color="#2a3035" roughness={0.5} /></mesh>
      {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[LAB.x0 + 12 + i * 10, TOP + 2.6, BACK + 0.62]}><boxGeometry args={[1.4, 0.9, 0.12]} /><meshStandardMaterial color="#f0f0ec" roughness={0.4} /></mesh>)}
      <mesh geometry={geo.jars}><meshPhysicalMaterial vertexColors roughness={0.22} clearcoat={0.7} clearcoatRoughness={0.15} /></mesh>
      {/* 实验室和厂房之间的玻璃隔断（右头），铝框 */}
      <group position={[LAB.x1 + 2, 0, (BACK + 0) / 2]}>
        <mesh position={[0, 15, 0]} renderOrder={1}><boxGeometry args={[0.12, 30, -BACK]} /><meshPhysicalMaterial color="#cfe2ea" transparent opacity={0.12} roughness={0.04} depthWrite={false} envMapIntensity={1.2} /></mesh>
        {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, 15, BACK / 2 + i * (-BACK / 5)]}><boxGeometry args={[0.5, 30, 0.4]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
        {[0.3, 30].map(y => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[0.6, 0.6, -BACK]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      </group>
      {/* 两间测试间里的台架和发动机 */}
      <TestStand at={[ST.s5, 0, BAY_Z]} kind="radiator" run={bayA?.run ?? 0} />
      <Engine at={[ST.s5, 0, BAY_Z]} run={bayA?.run ?? 0} hot={bayA?.hot ?? 0} />
      <TestStand at={[ST.s7, 0, BAY_Z]} kind="dyno" run={bayB?.run ?? 0} />
      <Engine at={[ST.s7, 0, BAY_Z]} run={bayB?.run ?? 0} hot={bayB?.hot ?? 0} />
      {/* 总装线上排着的发动机：放在托盘上，一台台往右走 */}
      {[ST.sx + 22, ST.sx + 42, ST.sx + 62, ST.sx + 82].map(lx => <Engine key={lx} at={[lx, 8.1, LINE_Z - 12]} run={0} hot={0} pallet />)}
      {/* 备件区里等着上线的发动机 */}
      {[50, 70, 90, 110, 130].map((lx, i) => <Engine key={lx} at={[lx, 0, 32 + (i % 2) * 14]} run={0} hot={0} pallet />)}
    </group>
  )
}
