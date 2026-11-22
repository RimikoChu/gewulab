// 力和运动实验室的大场景：一座冰雪运动场。一块冰场上画着两条冰壶道，后面是围挡、看台、记分牌和灯架，远处是松林和雪山；
// 冰场旁边有一间敞着门脸的器材室，靠墙一长排工作台，测力计、斜面、滑轮这些实验在台上各占一处。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 cm 画成 U 个单位（1 m 是 M 个单位），冰场和器材室是同一个比例。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, mergeParts, type Part } from '@/lab-kit'
import { makeIce, makePlanks, makeSign, makeSnow, makeWood } from './mats'

export const U = 0.06, M = 6, TOP = 5.1      // 1 cm、1 m 在画面里多长；工作台台面的高度（85 cm）
/** 冰场的范围、两条冰壶道中线的 z、大本营圆心的 x */
export const ICE = { x0: -110, x1: 110, z0: -70, z1: -10 }
export const LANE = -26, LANE2 = -54, HOUSE = -7.3
/** 冰场上各课的出发点（x），都在第一条冰壶道上 */
export const RINK = { push: -44, sled: 12 }
/** 器材室：工作台的范围和各课在台上的位置（x），器材摆在 z = BENCH_Z 这条线上 */
export const HUT = { x0: 60, x1: 158, z0: 25.5, z1: 46, h: 19 }
export const BENCH = { x0: 64, x1: 154, z0: 26, z1: 30.8 }, BENCH_Z = 29.3
export const ST = { l2: 76, l3: 92, l4: 109, l6: 127, l7: 143 }

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], indoor: boolean) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, indoor })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(RINK.push + 5, 1.3, LANE, 18.5, 6.5, [-0.22, 0.3], false),
  l2: spot(ST.l2 + 0.1, TOP + 1.0, BENCH_Z, 4.5, 1.7, [0.14, 0.3], true),
  l3: spot(ST.l3 + 0.35, TOP + 2.0, BENCH_Z, 3.6, 4.3, [-0.2, 0.08], true),
  l4: spot(ST.l4 - 1.3, TOP + 1.5, BENCH_Z, 9.2, 2.6, [0.06, 0.46], true),
  l5: spot(RINK.sled + 7.2, 1.6, LANE - 1.6, 22, 8, [0.2, 0.3], false),
  l6: spot(ST.l6, TOP + 1.25, BENCH_Z, 4.6, 2.9, [-0.12, 0.1], true),
  l7: spot(ST.l7 + 0.2, TOP + 1.1, BENCH_Z, 5.6, 2.1, [-0.2, 0.4], true),
  xa: spot(RINK.push + 3.4, 1.3, LANE, 14, 6, [0.2, 0.32], false),
  xb: spot(HOUSE - 9, 1.2, LANE, 25, 8, [0.1, 0.34], false),
  xc: spot(ST.l7 + 0.2, TOP + 1.1, BENCH_Z, 5.6, 2.1, [0.22, 0.44], true),
  q: spot(ST.l3 + 0.5, TOP + 1.9, BENCH_Z, 4.6, 4.3, [0.3, 0.12], true),
}
export type SpotKey = keyof typeof SPOT
/** 每一课交给世界的要求：主灯跟到哪一处；是不是在器材室里 */
export interface Want { x: number; indoor: boolean }

type V3 = [number, number, number]
/** 一块板，贴图按它在世界里的位置铺（几块拼起来花纹是连着的）。k：贴图一格多大 */
function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 4) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}
/** 给一个模型整体刷上一种颜色（顶点颜色），好和别的模型合并成一个 */
function tint(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return g.index ? g.toNonIndexed() : g
}

/** 松林和雪山：松树是一截树干加三层树冠，顶上两层落着雪；雪山下半截是灰蓝的岩石，上半截是雪 */
function makeScenery() {
  const gs: THREE.BufferGeometry[] = []; let seed = 11
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
  const cone = (r: number, h: number, x: number, y: number, z: number, c: string, n = 8) => { const g = new THREE.ConeGeometry(r, h, n); g.rotateY(rnd() * 3); g.translate(x, y + h / 2, z); gs.push(tint(g, c)) }
  const tree = (x: number, z: number, h: number) => {
    const t = new THREE.CylinderGeometry(h * 0.035, h * 0.055, h * 0.3, 6); t.translate(x, h * 0.15, z); gs.push(tint(t, '#57463a'))
    const green = ['#2f4f3f', '#37594a', '#2a473c'][Math.floor(rnd() * 3)]
    cone(h * 0.3, h * 0.42, x, h * 0.22, z, green); cone(h * 0.24, h * 0.36, x, h * 0.46, z, green); cone(h * 0.17, h * 0.32, x, h * 0.68, z, green)
    cone(h * 0.2, h * 0.16, x, h * 0.62, z, '#c9d4de'); cone(h * 0.125, h * 0.2, x, h * 0.81, z, '#d3dce5')
  }
  // 看台后面一大片，冰场两头各一片，器材室两旁几棵。各课镜头和冰场之间的空地不种树
  for (let i = 0; i < 150; i++) tree(-230 + rnd() * 460, -112 - rnd() * 90, 20 + rnd() * 18)
  for (let i = 0; i < 46; i++) { const s = i % 2 ? 1 : -1; tree(s * (135 + rnd() * 90) + (s > 0 ? 50 : 0), -100 + rnd() * 190, 18 + rnd() * 16) }
  for (let i = 0; i < 9; i++) tree(-150 - rnd() * 60, 30 + rnd() * 70, 18 + rnd() * 12)
  for (let i = 0; i < 18; i++) {
    const r = 90 + rnd() * 80, h = 70 + rnd() * 90, x = -430 + i * 52 + rnd() * 26, z = -330 - rnd() * 120
    cone(r, h, x, -4, z, ['#62758a', '#6c7f93', '#586b80'][i % 3], 7); cone(r * 0.56, h * 0.56, x, -4 + h * 0.445, z, '#cdd8e3', 7)
  }
  // 雪堆：压扁的球，让雪地有点起伏
  for (let i = 0; i < 60; i++) { const g = new THREE.SphereGeometry(1, 12, 8), r = 5 + rnd() * 14, far = rnd() < 0.5; g.scale(r, 0.6 + rnd() * 1.4, r * (0.6 + rnd() * 0.5)); g.translate(far ? -220 + rnd() * 440 : (rnd() < 0.5 ? -1 : 1) * (128 + rnd() * 70), -0.2, far ? -96 - rnd() * 40 : -90 + rnd() * 150); gs.push(tint(g, '#b9c5d1')) }
  const out = mergeGeometries(gs); out.computeVertexNormals()
  return out
}

/** 跟着当前这一课走的主灯：器材室里从前上方斜着打下来；到冰场上关掉，由阳光接手 */
function Key({ x, on }: { x: number; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 3, TOP + 9, BENCH_Z + 7); aim.position.set(cur.current, TOP + 0.3, BENCH_Z); aim.updateMatrixWorld()
    l.intensity += ((on ? 150 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.6} penumbra={0.9} intensity={0} distance={34} decay={1.6} color="#fff3e0" />
  </>
}

export function World({ x = ST.l2, indoor = false }: Partial<Want>) {
  const tex = useMemo(() => {
    const ice = makeIce(); ice.map.repeat.set(5, 1.4); ice.rough.repeat.set(5, 1.4)
    const snow = makeSnow(); snow.repeat.set(26, 20)
    const wall = makePlanks([124, 98, 70], 4), floor = makePlanks([126, 100, 74], 8), top = makeWood('#4c4038', '24,18,14', 5, 3)
    const board = makeSign(['冰雪运动场', '冰壶 · 雪橇'], '#16324a', '#e9f1f6', 512, 256)
    return { ice, snow, wall, floor, top, board, hut: makeSign(['器材室'], '#2f4a3c', '#e9efe6', 384, 128) }
  }, [])
  const geo = useMemo(() => {
    const far: Part[] = [], hut: Part[] = [], steel: Part[] = []
    const { x0, x1, z0, z1 } = ICE
    // —— 冰场四周：前面是矮的边石和一条胶垫走道，后面和两头是一人高的围挡（白板、蓝色扶手、底下一道红色踢脚、每隔一段一根立柱）
    far.push({ p: [0, 0.5, z1 + 0.4], s: [x1 - x0 + 2, 1.0, 0.8], c: '#8d99a6' }); far.push({ p: [0, 0.06, z1 + 4.6], s: [x1 - x0 + 2, 0.12, 7.4], c: '#3a4047' })
    const board = (px: number, pz: number, len: number, alongX: boolean) => {
      const s = (a: number, b: number): V3 => alongX ? [len, a, b] : [b, a, len]
      far.push({ p: [px, 3.5, pz], s: s(6.2, 0.5), c: '#b4bec8' }); far.push({ p: [px, 6.75, pz], s: s(0.5, 0.9), c: '#2c5f93' }); far.push({ p: [px, 0.55, pz], s: s(1.1, 0.7), c: '#b34238' })
      for (let d = -len / 2; d <= len / 2 + 0.1; d += 12) far.push({ p: alongX ? [px + d, 3.4, pz - 0.4] : [px - Math.sign(px) * -0.4, 3.4, pz + d], s: [0.5, 6.8, 0.5], c: '#59636e' })
    }
    board(0, z0 - 0.3, x1 - x0 + 1, true); board(x0 - 0.3, (z0 + z1) / 2, z1 - z0, false); board(x1 + 0.3, (z0 + z1) / 2, z1 - z0, false)
    // 围挡上的色块广告
    for (let i = 0; i < 12; i++) far.push({ p: [x0 + 14 + i * 17.5, 3.7, z0 + 0.0], s: [11, 3.2, 0.1], c: ['#2b5f88', '#a8853f', '#3a7560', '#8f4a44'][i % 4] })
    // —— 看台：六级台阶，每级一排座椅，后墙和雨棚
    for (let i = 0; i < 6; i++) {
      const z = z0 - 6 - i * 3.6, y = 2.4 + i * 2.2
      far.push({ p: [0, y / 2, z], s: [168, y, 3.6], c: i % 2 ? '#7d8791' : '#87919b' })
      for (let sx = -80; sx <= 80; sx += 2.2) { if (Math.abs(Math.abs(sx) - 28) < 2.4) continue; far.push({ p: [sx, y + 0.55, z - 0.5], s: [1.8, 0.24, 1.5], c: Math.abs(sx) < 28 ? '#2f6f9f' : '#c9a23e' }); far.push({ p: [sx, y + 1.3, z - 1.3], s: [1.8, 1.6, 0.2], c: Math.abs(sx) < 28 ? '#2a628d' : '#b89236' }) }
    }
    far.push({ p: [0, 12, z0 - 27], s: [170, 24, 0.8], c: '#6c7782' }); far.push({ p: [0, 25.4, z0 - 16], s: [176, 0.8, 26], c: '#4d5863' }); far.push({ p: [0, 26.1, z0 - 16], s: [177, 0.7, 27], c: '#c3ced9' })
    for (let sx = -84; sx <= 84; sx += 28) { steel.push({ p: [sx, 12.5, z0 - 4.6], s: [0.7, 25, 0.7], c: '#59636e' }); steel.push({ p: [sx, 23.6, z0 - 15], s: [0.5, 0.9, 22], c: '#59636e' }) }
    // —— 记分牌：两根立柱架着一块牌子
    for (const sx of [-9, 9]) steel.push({ p: [112 + 22 + sx, 11, z0 - 6], s: [0.9, 22, 0.9], c: '#4a545e' })
    far.push({ p: [134, 17.5, z0 - 6], s: [26, 13, 1.4], c: '#1f2a33' })
    // —— 四座灯架：一根高杆，顶上一排灯
    for (const [lx, lz] of [[x0 - 8, z0 - 8], [x1 + 8, z0 - 30], [x0 - 8, z1 + 16], [x1 + 44, z1 + 4]]) {
      steel.push({ p: [lx, 24, lz], s: [0.55, 48, 0.55], c: '#6a747e', cyl: true }); steel.push({ p: [lx, 0.6, lz], s: [1.6, 1.2, 1.6], c: '#808a94' }); steel.push({ p: [lx, 47, lz], s: [9, 0.5, 0.5], c: '#4a545e' })
      for (let k = -3; k <= 3; k++) steel.push({ p: [lx + k * 1.3, 46, lz + 0.2], s: [1, 1.4, 0.8], c: '#2d343b' })
    }
    // 走道上的长椅、雪地里的一排旗杆
    for (const bx of [-92, -74, 58, 96]) { far.push({ p: [bx, 2.6, z1 + 6.6], s: [9, 0.3, 2.2], c: '#a8814f' }); far.push({ p: [bx, 4.4, z1 + 7.7], s: [9, 1.6, 0.25], c: '#a8814f' }); for (const s of [-3.8, 3.8]) steel.push({ p: [bx + s, 1.3, z1 + 6.8], s: [0.3, 2.6, 2], c: '#3d444b' }) }
    for (let i = 0; i < 7; i++) { const fx = -102 + i * 34; steel.push({ p: [fx, 20, z0 - 31], s: [0.22, 40, 0.22], c: '#aab3bb', cyl: true }); far.push({ p: [fx + 2.4, 37.6, z0 - 31], s: [4.6, 3, 0.08], c: ['#b34238', '#2c5f93', '#d9a441', '#3d8a6a'][i % 4] }) }
    // —— 器材室：两头的山墙、屋顶和屋顶上的雪、门脸的立柱和横梁、台阶
    const H = HUT
    hut.push({ p: [(H.x0 + H.x1) / 2, H.h + 0.3, (H.z0 + H.z1) / 2 + 1], s: [H.x1 - H.x0 + 5, 0.6, H.z1 - H.z0 + 6], c: '#5a4636' }); hut.push({ p: [(H.x0 + H.x1) / 2, H.h + 1.0, (H.z0 + H.z1) / 2 + 1], s: [H.x1 - H.x0 + 5.6, 0.9, H.z1 - H.z0 + 6.6], c: '#c2cdd8' })
    for (const px of [H.x0 + 0.5, (H.x0 + H.x1) / 2, H.x1 - 0.5]) hut.push({ p: [px, H.h / 2, H.z1], s: [0.9, H.h, 0.9], c: '#6b513a' })
    hut.push({ p: [(H.x0 + H.x1) / 2, H.h - 0.6, H.z1], s: [H.x1 - H.x0, 1.2, 0.9], c: '#6b513a' }); hut.push({ p: [(H.x0 + H.x1) / 2, 0.14, H.z1 + 1.6], s: [H.x1 - H.x0 + 2, 0.28, 3.2], c: '#7d6248' })
    // 工作台：柜体、一格格抽屉和拉手、踢脚
    hut.push({ p: [(BENCH.x0 + BENCH.x1) / 2, (TOP - 0.3 + 0.5) / 2, (BENCH.z0 + BENCH.z1) / 2 - 0.1], s: [BENCH.x1 - BENCH.x0 - 0.6, TOP - 0.3 - 0.5, BENCH.z1 - BENCH.z0 - 0.5], c: '#4a3c30' }); hut.push({ p: [(BENCH.x0 + BENCH.x1) / 2, 0.25, (BENCH.z0 + BENCH.z1) / 2 - 0.3], s: [BENCH.x1 - BENCH.x0 - 1, 0.5, BENCH.z1 - BENCH.z0 - 1], c: '#262b2f' })
    for (let dx = BENCH.x0 + 2.4; dx < BENCH.x1; dx += 4.4) { for (const [dy, dh] of [[3.9, 1.2], [2.1, 2.2]]) { hut.push({ p: [dx, dy, BENCH.z1 - 0.3], s: [4.1, dh - 0.14, 0.1], c: '#5c4a3a' }); steel.push({ p: [dx, dy + dh / 2 - 0.35, BENCH.z1 - 0.2], s: [1.2, 0.1, 0.12], c: '#c9ced2' }) } }
    // 靠后墙的搁板、搁板上的收纳箱、墙角的器材柜、挂冰刷的木条
    for (const mx of [84, 100.5, 118, 135]) { hut.push({ p: [mx, TOP + 3.2, H.z0 + 1.0], s: [5.6, 0.22, 1.7], c: '#8c6c4a' }); for (const s of [-2.5, 2.5]) steel.push({ p: [mx + s, TOP + 2.75, H.z0 + 0.9], s: [0.12, 0.7, 1.5], c: '#3d444b' })
      ;[['#2f6f9f', -1.7, 1.5], ['#c9a23e', 0, 1.1], ['#b5524a', 1.6, 1.7]].forEach(([c, o, h]) => hut.push({ p: [mx + (o as number), TOP + 3.31 + (h as number) / 2, H.z0 + 1.0], s: [1.45, h as number, 1.3], c: c as string })) }
    hut.push({ p: [H.x0 + 3.2, 7.5, H.z0 + 1.8], s: [5.6, 15, 3.2], c: '#4d6a5c' }); for (const s of [-1.38, 1.38]) { hut.push({ p: [H.x0 + 3.2 + s, 7.7, H.z0 + 3.43], s: [2.66, 14, 0.08], c: '#5f8070' }); steel.push({ p: [H.x0 + 3.2 + s * 0.16, 7.6, H.z0 + 3.5], s: [0.1, 1.6, 0.1], c: '#c9ced2' }) }
    hut.push({ p: [H.x1 - 0.2, TOP + 8.6, 37], s: [0.3, 0.5, 10], c: '#8c6c4a' })
    for (let i = 0; i < 4; i++) { const bz = 33.4 + i * 2.4; steel.push({ p: [H.x1 - 0.5, TOP + 4.6, bz], s: [0.14, 8.2, 0.14], c: '#22272b', cyl: true }); hut.push({ p: [H.x1 - 0.55, TOP + 0.75, bz], s: [0.6, 0.5, 1.9], c: ['#b5524a', '#2f6f9f', '#c9a23e', '#3d8a6a'][i] }) }
    // 两只凳子
    for (const sx of [70, 118]) { hut.push({ p: [sx, 3.1, 36], s: [1.1, 0.3, 1.1], c: '#8c6c4a', cyl: true }); for (const [a, b] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) steel.push({ p: [sx + a, 1.5, 36 + b], s: [0.09, 3, 0.09], c: '#3d444b', cyl: true }) }
    // 木板墙：后墙在窗台以下、窗楣以上各一整条，窗和窗之间是窗间墙；两头的山墙
    const SILL = TOP + 4.6, LINTEL = TOP + 10.4, wins = Object.values(ST)
    const walls = [slab(H.x0, H.x1, 0, SILL, H.z0 - 0.5, H.z0), slab(H.x0, H.x1, LINTEL, H.h, H.z0 - 0.5, H.z0), slab(H.x0 - 0.5, H.x0, 0, H.h, H.z0 - 0.5, H.z1), slab(H.x1, H.x1 + 0.5, 0, H.h, H.z0 - 0.5, H.z1)]
    const edges = [H.x0, ...wins.flatMap(w => [w - 4, w + 4]), H.x1]
    for (let i = 0; i < edges.length; i += 2) walls.push(slab(edges[i], edges[i + 1], SILL, LINTEL, H.z0 - 0.5, H.z0))
    for (const w of wins) {
      for (const s of [-1, 1]) hut.push({ p: [w + s * 3.9, (SILL + LINTEL) / 2, H.z0 - 0.2], s: [0.24, LINTEL - SILL, 0.34], c: '#e2ddd0' })
      for (const y of [SILL + 0.12, LINTEL - 0.12]) hut.push({ p: [w, y, H.z0 - 0.2], s: [8, 0.24, 0.34], c: '#e2ddd0' })
      hut.push({ p: [w, (SILL + LINTEL) / 2, H.z0 - 0.2], s: [0.16, LINTEL - SILL, 0.3], c: '#e2ddd0' }); hut.push({ p: [w, SILL + 0.04, H.z0 + 0.2], s: [8.6, 0.16, 0.7], c: '#d9d2c2' })
    }
    return { far: mergeParts(far), hut: mergeParts(hut), steel: mergeParts(steel), walls: mergeGeometries(walls), scenery: makeScenery(), sill: SILL, lintel: LINTEL,
      top: slab(BENCH.x0 - 0.2, BENCH.x1 + 0.2, TOP - 0.3, TOP, BENCH.z0, BENCH.z1 + 0.2, 7), floor: slab(H.x0, H.x1, -0.2, 0.06, H.z0, H.z1, 9) }
  }, [])
  /** 冰面上的线：大本营的三道圈、中线、T 线、前掷线 */
  const paint = (cx: number, z: number, flip: 1 | -1) => <group position={[cx, 0.012, z]} rotation-x={-Math.PI / 2}>
    {([[11, 7.3, '#2c5f93'], [7.3, 3.66, '#dfe8ee'], [3.66, 0.9, '#b34238'], [0.9, 0, '#dfe8ee']] as [number, number, string][]).map(([a, b, c], i) => <mesh key={i} position-z={i * 0.001}><ringGeometry args={[b, a, 64]} /><meshStandardMaterial color={c} roughness={0.25} transparent opacity={0.9} polygonOffset polygonOffsetFactor={-2} /></mesh>)}
    <mesh position={[-flip * 16, 0, 0.004]}><planeGeometry args={[60, 0.1]} /><meshBasicMaterial color="#24303a" transparent opacity={0.7} /></mesh>
    <mesh position={[0, 0, 0.004]}><planeGeometry args={[0.1, 27]} /><meshBasicMaterial color="#24303a" transparent opacity={0.7} /></mesh>
    <mesh position={[-flip * 38.4, 0, 0.004]}><planeGeometry args={[0.6, 27]} /><meshBasicMaterial color="#b34238" transparent opacity={0.8} /></mesh>
  </group>
  return (
    <group>
      <hemisphereLight args={['#dfeaf6', '#8f9aa8', indoor ? 0.5 : 0.3]} />
      <Key x={x} on={indoor} />
      {/* 雪地和冰面 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, -40]} receiveShadow><planeGeometry args={[1300, 1000]} /><meshStandardMaterial map={tex.snow} roughness={0.95} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (ICE.z0 + ICE.z1) / 2]} receiveShadow><planeGeometry args={[ICE.x1 - ICE.x0, ICE.z1 - ICE.z0]} /><meshPhysicalMaterial map={tex.ice.map} roughnessMap={tex.ice.rough} roughness={1} clearcoat={0.5} clearcoatRoughness={0.25} envMapIntensity={1.15} /></mesh>
      {paint(HOUSE, LANE, 1)}{paint(-HOUSE - 20, LANE2, -1)}
      {/* 两条冰壶道之间的分隔线 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, (LANE + LANE2) / 2]}><planeGeometry args={[ICE.x1 - ICE.x0, 0.16]} /><meshBasicMaterial color="#2c5f93" transparent opacity={0.7} /></mesh>
      <mesh geometry={geo.scenery} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.95} flatShading /></mesh>
      <mesh geometry={geo.far} castShadow receiveShadow><Painted rough={0.7} metal={0.05} /></mesh>
      <mesh geometry={geo.steel} castShadow receiveShadow><Painted rough={0.45} metal={0.7} /></mesh>
      <mesh position={[134, 17.5, ICE.z0 - 5.28]}><planeGeometry args={[24, 11.4]} /><meshBasicMaterial map={tex.board} toneMapped={false} /></mesh>
      {/* 器材室：墙和屋顶不投影子，阳光才照得进来 */}
      <mesh geometry={geo.hut} receiveShadow><Painted rough={0.75} metal={0.02} /></mesh>
      <mesh geometry={geo.walls} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.85} /></mesh>
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.floor} roughness={0.8} /></mesh>
      <mesh geometry={geo.top} receiveShadow><meshPhysicalMaterial map={tex.top} roughness={0.5} clearcoat={0.35} clearcoatRoughness={0.45} envMapIntensity={0.6} /></mesh>
      <mesh position={[(HUT.x0 + HUT.x1) / 2, (geo.sill + geo.lintel) / 2, HUT.z0 - 0.25]} renderOrder={1}><planeGeometry args={[HUT.x1 - HUT.x0, geo.lintel - geo.sill]} /><meshPhysicalMaterial color="#cfe2ea" transparent opacity={0.1} roughness={0.03} clearcoat={1} depthWrite={false} envMapIntensity={1.4} /></mesh>
      <mesh position={[HUT.x1 - 8, TOP + 11.2, HUT.z0 + 0.03]}><planeGeometry args={[7.2, 2.4]} /><meshStandardMaterial map={tex.hut} roughness={0.7} /></mesh>
      {/* 工作台前沿包一条深色的木边 */}
      <mesh position={[(BENCH.x0 + BENCH.x1) / 2, TOP - 0.15, BENCH.z1 + 0.22]}><boxGeometry args={[BENCH.x1 - BENCH.x0 + 0.4, 0.3, 0.06]} /><meshStandardMaterial color="#2e2620" roughness={0.6} /></mesh>
    </group>
  )
}
