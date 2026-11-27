// 动量和碰撞实验室的大场景：一座室内冰球馆，加上馆外雪地里的一座火箭发动机试车台。
// 冰面四周是板墙和防护玻璃，北面是看台，头顶是钢屋架；冰场东端板墙外面是场边器材区，三张实验台靠着一道隔墙；
// 往东 110 m 是试车台（见 stand.tsx），四周是树林和远山。整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 个单位 = 1 m。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Metal, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { BENCH_Z, GOAL_X, HALL, ICE, PART_Z, SPOT, ST, STAND, TOP, type SpotKey, type StKey, type V3 } from './layout'
import { benchTex, iceTex, makeBlocks, makeSign, rep, rubberTex, snowTex } from './mats'
import { Egg } from './bench'
import { Goal } from './gear'
import { IDLE } from './idle'
import { TestStand } from './stand'

/** 每一课交给世界的要求：台灯照哪（不在实验台上就是 null）；哪一张实验台上的器材由这一课自己画 */
export interface Want { lamp: V3 | null; cur: StKey | null }
export function Place({ at, cur = null, labels, children = null }: { at: SpotKey; cur?: StKey | null; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ lamp: v.where === 'bench' ? v.target.toArray() as V3 : null, cur }), [v, cur])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.where === 'bench' ? 0.5 : v.where === 'ice' ? 1.7 : 2.6} env={v.where === 'out' ? 1 : 0.75}
    fog={v.where === 'out' ? [150, 820] : [90, 520]} bloom={v.where === 'out' ? 0.22 : 0} world={want}>{children}</LabStage>
}

const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, r?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c, r })
const cyl = (x: number, y0: number, z: number, r: number, h: number, c: string, rot?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [r, h, 0], c, cyl: true, r: rot })

/** 冰面的轮廓（圆角矩形），d 是向外扩多少。画在 (x, −z) 平面上，转平以后正好落在世界坐标里 */
function outline(d: number) {
  const x0 = ICE.x0 - d, x1 = ICE.x1 + d, y0 = -ICE.z1 - d, y1 = -ICE.z0 + d, r = ICE.r + d, s = new THREE.Shape(), q = Math.PI / 2
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -q, 0, false); s.lineTo(x1, y1 - r); s.absarc(x1 - r, y1 - r, r, 0, q, false)
  s.lineTo(x0 + r, y1); s.absarc(x0 + r, y1 - r, r, q, 2 * q, false); s.lineTo(x0, y0 + r); s.absarc(x0 + r, y0 + r, r, 2 * q, 3 * q, false)
  return s
}
/** 沿冰面四周的一圈：从向外 d0 到 d1，高度从 y0 到 y1（板墙、踢脚板、扶手、玻璃都是它） */
function band(d0: number, d1: number, y0: number, y1: number) {
  const s = outline(d1); s.holes.push(outline(d0))
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 16 }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0)
  return g
}
/** 只留下满足条件的三角形（按三角形中心的位置判断） */
function keep(g: THREE.BufferGeometry, ok: (x: number, y: number, z: number) => boolean) {
  const s = g.index ? g.toNonIndexed() : g, p = s.attributes.position.array, n = s.attributes.normal.array, P: number[] = [], N: number[] = []
  for (let i = 0; i < p.length; i += 9) {
    if (!ok((p[i] + p[i + 3] + p[i + 6]) / 3, (p[i + 1] + p[i + 4] + p[i + 7]) / 3, (p[i + 2] + p[i + 5] + p[i + 8]) / 3)) continue
    for (let k = 0; k < 9; k++) { P.push(p[i + k]); N.push(n[i + k]) }
  }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
  return out
}
function tint(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv')
  return g.index ? g.toNonIndexed() : g
}

/** 馆外的树林和雪堆：树是一截树干托着几团圆的树冠，顶上压着雪 */
function makeScenery() {
  const gs: THREE.BufferGeometry[] = []; let seed = 23
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
  const blob = (x: number, y: number, z: number, rx: number, ry: number, c: string) => { const g = new THREE.SphereGeometry(1, 8, 5); g.rotateY(rnd() * 3); g.scale(rx, ry, rx * (0.85 + rnd() * 0.3)); g.translate(x, y, z); gs.push(tint(g, c)) }
  const tree = (x: number, z: number, h: number) => {
    const t = new THREE.CylinderGeometry(h * 0.025, h * 0.045, h * 0.5, 6); t.translate(x, h * 0.25, z); gs.push(tint(t, '#5a4a3e'))
    const green = ['#3f5a47', '#486350', '#37513f', '#4f6a4c'][Math.floor(rnd() * 4)], r = h * (0.24 + rnd() * 0.08)
    blob(x, h * 0.62, z, r, r * 0.9, green)
    blob(x + r * 0.55, h * 0.5, z + r * 0.2, r * 0.7, r * 0.6, green); blob(x - r * 0.5, h * 0.54, z - r * 0.25, r * 0.72, r * 0.62, green)
    blob(x + r * 0.1, h * 0.8, z, r * 0.66, r * 0.6, green)
    blob(x + r * 0.08, h * 0.86, z, r * 0.56, r * 0.42, '#cdd7e0'); blob(x - r * 0.4, h * 0.63, z - r * 0.2, r * 0.5, r * 0.3, '#c5d0da')
  }
  // 试车台北面和东面一大片林子，冰球馆后面一片；镜头和试车台之间的空地不种树
  for (let i = 0; i < 115; i++) tree(70 + rnd() * 330, -95 - rnd() * 120, 9 + rnd() * 8)
  for (let i = 0; i < 45; i++) tree(250 + rnd() * 140, -90 + rnd() * 150, 9 + rnd() * 8)
  for (let i = 0; i < 30; i++) tree(-150 + rnd() * 200, -60 - rnd() * 110, 9 + rnd() * 8)
  for (let i = 0; i < 50; i++) { const g = new THREE.SphereGeometry(1, 12, 8), r = 4 + rnd() * 10; g.scale(r, 0.5 + rnd() * 1.2, r * (0.6 + rnd() * 0.5)); g.translate(75 + rnd() * 300, -0.2, -110 + rnd() * 80 + (rnd() < 0.3 ? 120 : 0)); gs.push(tint(g, '#b9c5d1')) }
  return mergeGeometries(gs)
}
/** 远山：几道起伏平缓的山脊，下半截是灰蓝的岩石，越往上雪越多；远的一道颜色更淡 */
function makeHills() {
  const gs: THREE.BufferGeometry[] = []
  const ridge = (from: [number, number], to: [number, number], H: number, depth: [number, number], ph: number, low: string, high: string) => {
    const N = 90, pos: number[] = [], col: number[] = [], idx: number[] = [], c0 = new THREE.Color(low), c1 = new THREE.Color(high), cm = c0.clone().lerp(c1, 0.45)
    for (let i = 0; i <= N; i++) {
      const k = i / N, x = from[0] + (to[0] - from[0]) * k, z = from[1] + (to[1] - from[1]) * k
      const h = H * Math.max(0.2, 0.5 + 0.28 * Math.sin(i * 0.11 + ph) + 0.14 * Math.sin(i * 0.29 + ph * 2.3) + 0.08 * Math.sin(i * 0.67 + ph * 5.1))
      pos.push(x + depth[0], -6, z + depth[1], x + depth[0] * 0.45, h * 0.5, z + depth[1] * 0.45, x, h, z, x - depth[0] * 0.5, -6, z - depth[1] * 0.5)
      col.push(c0.r, c0.g, c0.b, cm.r, cm.g, cm.b, c1.r, c1.g, c1.b, c0.r, c0.g, c0.b)
      if (i < N) for (let j = 0; j < 3; j++) { const a = i * 4 + j, b = a + 4; idx.push(a, b, a + 1, a + 1, b, b + 1) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals()
    gs.push(g)
  }
  ridge([-420, -470], [760, -470], 120, [0, 150], 0.4, '#8194a8', '#e3eaf0')
  ridge([-480, -620], [820, -620], 190, [0, 170], 2.1, '#a3b3c4', '#eaf0f5')
  ridge([640, -560], [640, 260], 110, [-150, 0], 1.3, '#8a9cb0', '#e3eaf0')
  ridge([-520, -520], [-520, 200], 100, [150, 0], 3.3, '#8a9cb0', '#e3eaf0')
  return mergeGeometries(gs)
}

/** 冰球馆的结构：看台和座椅、屋架、吊灯、南面的柱子、板墙上的广告和玻璃的立柱、场边的替补席长椅 */
function hallParts() {
  const far: Part[] = [], steel: Part[] = [], lamp: Part[] = []
  const { x0, x1, z0, z1 } = ICE, H = HALL
  // 看台：七级，每级一排翻板椅，两条走道
  for (let i = 0; i < 7; i++) {
    const z = z0 - 2.0 - i * 1.05, y = 0.7 + i * 0.5
    far.push(box(0, 0, z, 62, y, 1.05, i % 2 ? '#7c8690' : '#868f99'))
    for (let sx = -29.4; sx <= 29.4; sx += 0.62) {
      if (Math.abs(Math.abs(sx) - 11) < 0.9) continue
      const c = Math.abs(sx) < 11 ? '#2b6695' : '#b9433a'
      far.push(box(sx, y, z - 0.1, 0.5, 0.08, 0.46, c), box(sx, y + 0.08, z - 0.36, 0.5, 0.42, 0.07, c))
    }
  }
  far.push(box(0, 0, z0 - 1.25, 62, 1.25, 0.14, '#59636d'))                                   // 看台前沿的矮墙
  steel.push(box(0, 1.25, z0 - 1.25, 62, 0.05, 0.05, '#aeb6bd'), box(0, 1.7, z0 - 1.25, 62, 0.05, 0.05, '#aeb6bd'))
  for (let sx = -30; sx <= 30; sx += 2.5) steel.push(box(sx, 1.25, z0 - 1.25, 0.05, 0.5, 0.05, '#aeb6bd'))
  // 屋架：每 8 m 一榀，上下弦之间是斜腹杆；檩条；一排排吊灯
  for (let tx = H.x0 + 4; tx <= H.x1 - 2; tx += 8) {
    steel.push(box(tx, H.h - 1.6, (H.z0 + H.z1) / 2, 0.22, 0.22, H.z1 - H.z0, '#3f4a55'), box(tx, H.h, (H.z0 + H.z1) / 2, 0.22, 0.22, H.z1 - H.z0, '#3f4a55'))
    for (let k = 0; k < 16; k++) { const z = H.z0 + (k + 0.5) * (H.z1 - H.z0) / 16; steel.push(box(tx, H.h - 0.8, z, 0.1, 2.25, 0.1, '#3f4a55', [k % 2 ? 0.75 : -0.75, 0, 0])) }
    steel.push(box(tx, 0, H.z1, 0.45, H.h, 0.45, '#46515c'), box(tx, 0, H.z1, 0.7, 0.25, 0.7, '#6d7780'))
    for (const lz of [-33, -24, -15, -6, 2]) { steel.push(box(tx - 4, H.h - 2.9, lz, 0.04, 1.3, 0.04, '#2a3138')); lamp.push(box(tx - 4, H.h - 3.15, lz, 1.5, 0.12, 0.5, '#fff6e0')); far.push(box(tx - 4, H.h - 3.03, lz, 1.6, 0.14, 0.6, '#30373e')) }
  }
  for (let k = 0; k <= 8; k++) steel.push(box((H.x0 + H.x1) / 2, H.h + 0.12, H.z0 + k * (H.z1 - H.z0) / 8, H.x1 - H.x0, 0.14, 0.12, '#3f4a55'))
  // 板墙里侧的广告色块（北面和东端），玻璃的铝立柱
  for (let i = 0; i < 9; i++) far.push(box(-20 + i * 5, 0.3, z0 + 0.012, 4.2, 0.62, 0.02, ['#2b5f88', '#a8853f', '#3a7560', '#8f4a44'][i % 4]))
  for (let i = 0; i < 3; i++) far.push(box(x1 - 0.012, 0.3, -19.5 + i * 4.5, 0.02, 0.62, 3.6, ['#3a7560', '#2b5f88', '#a8853f'][i]))
  for (let sx = x0 + ICE.r; sx <= x1 - ICE.r + 0.1; sx += 2.4) steel.push(box(sx, 1.1, z0 - 0.09, 0.05, 1.85, 0.07, '#c5cbd0'))
  for (let sz = z0 + ICE.r; sz <= z1 - ICE.r + 0.1; sz += 2.4) for (const ex of [x0 - 0.09, x1 + 0.09]) steel.push(box(ex, 1.1, sz, 0.07, 1.85, 0.05, '#c5cbd0'))
  // 南面板墙外的替补席：两段长椅和矮隔板
  for (const bx of [-13, 13]) {
    far.push(box(bx, 0.42, z1 + 1.5, 9, 0.06, 0.4, '#a8814f'), box(bx, 0, z1 + 2.1, 9.6, 1.1, 0.08, '#b9c1c9'))
    for (let k = -4; k <= 4; k += 2) steel.push(box(bx + k, 0, z1 + 1.5, 0.05, 0.42, 0.34, '#3d444b'))
  }
  // 后墙上的记分牌
  far.push(box(0, 6.6, H.z0 + 0.35, 9, 3.4, 0.5, '#1c232a'))
  return { far, steel, lamp }
}

/** 场边器材区：三张实验台、隔墙上的白板、球杆架和搁板、收纳箱和冰球桶 */
function labParts() {
  const P: Part[] = [], S: Part[] = []
  const table = (x: number, w: number) => {
    const d = 0.82, z = BENCH_Z, y = TOP - 0.04
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) S.push(box(x + sx * (w / 2 - 0.06), 0.03, z + sz * (d / 2 - 0.06), 0.05, y - 0.03, 0.05, '#c9ced3'), cyl(x + sx * (w / 2 - 0.06), 0, z + sz * (d / 2 - 0.06), 0.03, 0.03, '#22262a'))
    for (const sz of [-1, 1]) S.push(box(x, y - 0.1, z + sz * (d / 2 - 0.06), w - 0.12, 0.08, 0.03, '#c9ced3'), box(x, 0.18, z + sz * (d / 2 - 0.06), w - 0.12, 0.04, 0.03, '#c9ced3'))
    for (const sx of [-1, 1]) S.push(box(x + sx * (w / 2 - 0.06), y - 0.1, z, 0.03, 0.08, d - 0.12, '#c9ced3'), box(x + sx * (w / 2 - 0.06), 0.18, z, 0.03, 0.04, d - 0.12, '#c9ced3'))
    P.push(box(x, 0.2, z, w - 0.16, 0.02, d - 0.16, '#8f979e'))                                             // 下层搁板
    P.push(box(x + w / 2 - 0.34, y - 0.34, z + 0.04, 0.46, 0.24, d - 0.2, '#dfe3e6'), box(x + w / 2 - 0.34, y - 0.3, z + d / 2 - 0.055, 0.42, 0.16, 0.012, '#eef0f1'))   // 抽屉
    S.push(box(x + w / 2 - 0.34, y - 0.23, z + d / 2 - 0.04, 0.14, 0.014, 0.02, '#8d949a'))
  }
  table(ST.egg, 1.5); table(ST.track, 2.2); table(ST.cradle, 1.5)
  // 隔墙：墙裙压条、白板、球杆架、搁板
  const wz = PART_Z + 0.105
  P.push(box(45.5, 1.0, wz, 21, 0.06, 0.03, '#2e5c84'))
  P.push(box(ST.track, 1.32, wz, 2.5, 1.25, 0.03, '#b8bec4'), box(ST.track, 1.36, wz + 0.016, 2.42, 1.17, 0.006, '#f1f2ee'), box(ST.track, 1.3, wz + 0.05, 2.3, 0.02, 0.07, '#9aa1a8'))
  const rack = 42.25
  P.push(box(rack, 1.72, wz + 0.03, 1.5, 0.05, 0.08, '#6b5038'), box(rack, 0.3, wz + 0.22, 1.5, 0.06, 0.3, '#6b5038'))
  for (let i = 0; i < 5; i++) { const sx = rack - 0.6 + i * 0.3, c = ['#1d1f22', '#b5372d', '#1d1f22', '#2b5f93', '#e8e4d8'][i]; P.push(box(sx, 0.36, wz + 0.15, 0.03, 1.48, 0.02, c, [-0.08, 0, 0]), box(sx + 0.1, 0.33, wz + 0.26, 0.24, 0.07, 0.012, c, [0, 0.3, 0])) }
  P.push(box(ST.cradle + 0.2, 1.62, wz + 0.13, 1.7, 0.03, 0.28, '#8c6c4a')); for (const s of [-0.7, 0.7]) S.push(box(ST.cradle + 0.2 + s, 1.42, wz + 0.12, 0.02, 0.2, 0.24, '#3d444b'))
  ;[['#2f6f9f', -0.55, 0.22], ['#c9a23e', -0.1, 0.16], ['#b5524a', 0.42, 0.26]].forEach(([c, o, h]) => P.push(box(ST.cradle + 0.2 + (o as number), 1.65, wz + 0.13, 0.36, h as number, 0.24, c as string)))
  // 墙角一摞收纳箱、两只装冰球的桶、一辆器材推车
  P.push(box(35.7, 0, PART_Z + 0.5, 0.6, 0.4, 0.42, '#2f6f9f'), box(35.7, 0.4, PART_Z + 0.5, 0.6, 0.4, 0.42, '#3d7d74'), box(36.45, 0, PART_Z + 0.5, 0.6, 0.4, 0.42, '#5a7186'))
  // 台面上的小东西。导轨那张：一盒配重片、一把水平尺；牛顿摆那张：记录本和笔、秒表、一盒砝码；鸡蛋那张：一托鸡蛋、一卷纸巾
  const T = TOP, z = BENCH_Z
  P.push(box(ST.track - 0.72, T, z + 0.27, 0.17, 0.012, 0.1, '#8c6c4a'), box(ST.track - 0.72, T, z + 0.222, 0.17, 0.035, 0.008, '#8c6c4a'), box(ST.track - 0.72, T, z + 0.318, 0.17, 0.035, 0.008, '#8c6c4a'), box(ST.track - 0.803, T, z + 0.27, 0.008, 0.035, 0.1, '#8c6c4a'), box(ST.track - 0.637, T, z + 0.27, 0.008, 0.035, 0.1, '#8c6c4a'))
  for (let i = 0; i < 4; i++) S.push(cyl(ST.track - 0.77 + i * 0.034, T + 0.03, z + 0.27, 0.02, 0.007, '#d9c06a', [Math.PI / 2, 0, 0.3]))
  P.push(box(ST.track + 0.72, T, z + 0.29, 0.24, 0.022, 0.05, '#d8b02c', [0, 0.12, 0]), box(ST.track + 0.72, T + 0.022, z + 0.29, 0.05, 0.004, 0.02, '#9fe07a', [0, 0.12, 0]))
  P.push(box(ST.cradle + 0.34, T, z + 0.2, 0.21, 0.012, 0.15, '#27496b', [0, -0.25, 0]), box(ST.cradle + 0.34, T + 0.012, z + 0.2, 0.2, 0.003, 0.14, '#f1efe6', [0, -0.25, 0]), cyl(ST.cradle + 0.3, T + 0.02, z + 0.22, 0.004, 0.14, '#c2362c', [Math.PI / 2, 0, 0.9]))
  S.push(cyl(ST.cradle - 0.3, T, z + 0.22, 0.03, 0.014, '#c9ced3'), cyl(ST.cradle - 0.3, T + 0.014, z + 0.22, 0.026, 0.002, '#f1efe6'), cyl(ST.cradle - 0.3, T + 0.006, z + 0.186, 0.006, 0.014, '#c9ced3', [Math.PI / 2, 0, 0]))
  P.push(box(ST.cradle - 0.42, T, z - 0.2, 0.2, 0.03, 0.09, '#8c6c4a')); for (let i = 0; i < 4; i++) S.push(cyl(ST.cradle - 0.49 + i * 0.047, T + 0.03, z - 0.2, 0.016 + i * 0.002, 0.03 + i * 0.006, '#d9c06a'))
  P.push(box(ST.egg - 0.5, T, z + 0.24, 0.3, 0.035, 0.11, '#b9b2a2', [0, 0.2, 0]), cyl(ST.egg + 0.52, T, z - 0.22, 0.055, 0.22, '#f1efe6'), cyl(ST.egg + 0.52, T + 0.22, z - 0.22, 0.018, 0.004, '#8c8272'))
  P.push(cyl(54.2, 0, PART_Z + 0.5, 0.17, 0.36, '#e9e6dc'), cyl(54.65, 0, PART_Z + 0.45, 0.17, 0.36, '#3a6f9c'), cyl(54.2, 0.36, PART_Z + 0.5, 0.15, 0.012, '#15171a'))
  P.push(box(47.9, 0.14, PART_Z + 0.42, 0.8, 0.02, 0.5, '#9aa2a8'), box(47.9, 0.52, PART_Z + 0.42, 0.8, 0.02, 0.5, '#9aa2a8'))
  for (const sx of [-0.38, 0.38]) for (const sz of [-0.23, 0.23]) S.push(box(47.9 + sx, 0.06, PART_Z + 0.42 + sz, 0.025, 0.8, 0.025, '#c9ced3'), cyl(47.9 + sx, 0, PART_Z + 0.42 + sz, 0.035, 0.06, '#1b1d20'))
  return { P, S }
}

/** 跟着当前这一课走的台灯：在实验台上时从左前上方斜着打下来，投清楚的影子；到冰面和馆外关掉，由阳光接手 */
function Key({ at }: { at: V3 | null }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef<V3>(at ?? [ST.track, TOP, BENCH_Z])
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30), k = 1 - Math.exp(-dt / 0.4)
    if (at) for (let i = 0; i < 3; i++) cur.current[i] += (at[i] - cur.current[i]) * k
    l.position.set(cur.current[0] - 1.1, cur.current[1] + 2.3, cur.current[2] + 1.7); aim.position.set(cur.current[0], cur.current[1], cur.current[2]); aim.updateMatrixWorld()
    l.intensity += ((at ? 34 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.85} intensity={0} distance={9} decay={1.5} color="#fff1dc" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.004}>
      <perspectiveCamera attach="shadow-camera" args={[58, 1, 0.8, 7]} />
    </spotLight>
  </>
}

export function World({ lamp: at = null, cur = null }: Partial<Want>) {
  const tex = useMemo(() => ({
    ice: iceTex(), snow: rep(snowTex(), 60, 46), rubber: rep(rubberTex(), 104, 47), mat: rep(rubberTex(), 12, 9),
    wall: makeBlocks([170, 178, 184], 3), part: makeBlocks([196, 200, 198], 7), top: benchTex(),
    board: makeSign(['北极星冰球馆', '主队 0 : 0 客队'], '#10202c', '#ffcf5c', 512, 192), name: makeSign(['场边器材区'], '#2e5c84', '#eef3f6', 512, 96),
  }), [])
  const geo = useMemo(() => {
    const { far, steel, lamp } = hallParts(), lab = labParts(), H = HALL
    const ice = new THREE.ShapeGeometry(outline(0), 16); ice.rotateX(-Math.PI / 2)
    const glass = keep(band(0.05, 0.065, 1.1, 2.9), (_x, _y, z) => z < -5.5)
    // 墙：北墙、东西山墙，贴图按世界坐标铺
    const slab = (ax: number, bx: number, ay: number, by: number, az: number, bz: number, k = 3.2) => {
      const g = new THREE.BoxGeometry(bx - ax, by - ay, bz - az); g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
      for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) : p.getX(i)) / k, (Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) : p.getY(i)) / k)
      return g
    }
    return {
      ice, glass, far: mergeParts(far), steel: mergeParts(steel), lamp: mergeParts(lamp), lab: mergeParts(lab.P), labSteel: mergeParts(lab.S), scenery: makeScenery(), hills: makeHills(),
      boards: band(0, 0.12, 0, 1.07), kick: band(-0.012, 0.13, 0, 0.2), cap: band(-0.02, 0.15, 1.07, 1.12),
      walls: mergeGeometries([slab(H.x0, H.x1, 0, H.h + 0.4, H.z0 - 0.4, H.z0), slab(H.x0 - 0.4, H.x0, 0, H.h + 0.4, H.z0, H.z1), slab(H.x1, H.x1 + 0.4, 0, H.h + 0.4, H.z0, H.z1)]),
      part: slab(35, 56, 0, 3.0, PART_Z - 0.1, PART_Z + 0.1, 1.6),
    }
  }, [])
  const line = (x: number, z: number, w: number, d: number, c: string, o = 0.9) => <mesh rotation-x={-Math.PI / 2} position={[x, 0.004, z]}><planeGeometry args={[w, d]} /><meshStandardMaterial color={c} roughness={0.3} transparent opacity={o} polygonOffset polygonOffsetFactor={-2} /></mesh>
  const ring = (x: number, z: number, r: number, c: string) => <mesh rotation-x={-Math.PI / 2} position={[x, 0.004, z]}><ringGeometry args={[r - 0.05, r, 64]} /><meshStandardMaterial color={c} roughness={0.3} transparent opacity={0.9} polygonOffset polygonOffsetFactor={-2} /></mesh>
  const dot = (x: number, z: number, r: number, c: string) => <mesh rotation-x={-Math.PI / 2} position={[x, 0.004, z]}><circleGeometry args={[r, 32]} /><meshStandardMaterial color={c} roughness={0.3} transparent opacity={0.9} polygonOffset polygonOffsetFactor={-2} /></mesh>
  const mid = (ICE.z0 + ICE.z1) / 2, gz = 9.3
  return (
    <group>
      <hemisphereLight args={['#e6eef8', '#8f9aa8', at ? 0.55 : 0.4]} />
      <Key at={at} />
      {/* 馆外的雪地，馆里的橡胶地垫，冰面 */}
      <mesh rotation-x={-Math.PI / 2} position={[120, -0.06, -60]} receiveShadow><planeGeometry args={[1500, 1150]} /><meshStandardMaterial map={tex.snow} roughness={0.95} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(HALL.x0 + HALL.x1) / 2, -0.012, (HALL.z0 + HALL.z1) / 2]} receiveShadow><planeGeometry args={[HALL.x1 - HALL.x0, HALL.z1 - HALL.z0]} /><meshStandardMaterial map={tex.rubber} roughness={0.9} /></mesh>
      <mesh geometry={geo.ice} receiveShadow><meshPhysicalMaterial map={tex.ice.map} roughnessMap={tex.ice.rough} roughness={1} clearcoat={0.55} clearcoatRoughness={0.22} envMapIntensity={1.1} map-repeat={[0.11, 0.11]} roughnessMap-repeat={[0.11, 0.11]} /></mesh>
      {/* 冰面上的线：中线、两条蓝线、球门线、中圈、四个争球圈、球门区 */}
      {line(0, mid, 0.3, 26, '#b93a32')}{line(-8.5, mid, 0.3, 26, '#2c5f93')}{line(8.5, mid, 0.3, 26, '#2c5f93')}
      {line(GOAL_X, mid, 0.06, 2 * gz, '#b93a32')}{line(-GOAL_X, mid, 0.06, 2 * gz, '#b93a32')}
      {ring(0, mid, 4.5, '#2c5f93')}{dot(0, mid, 0.15, '#2c5f93')}
      {[[-19, mid - 6.5], [-19, mid + 6.5], [19, mid - 6.5], [19, mid + 6.5]].map(([x, z], i) => <group key={i}>{ring(x, z, 4.5, '#b93a32')}{dot(x, z, 0.3, '#b93a32')}</group>)}
      {[1, -1].map(s => <mesh key={s} rotation={[-Math.PI / 2, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2]} position={[s * GOAL_X, 0.0035, mid]}><circleGeometry args={[1.8, 32, 0, Math.PI]} /><meshStandardMaterial color="#7fb2d9" roughness={0.3} transparent opacity={0.55} polygonOffset polygonOffsetFactor={-1} /></mesh>)}
      {/* 板墙、踢脚板、扶手、防护玻璃 */}
      <mesh geometry={geo.boards} castShadow receiveShadow><meshPhysicalMaterial color="#d9dee2" roughness={0.45} clearcoat={0.3} clearcoatRoughness={0.4} /></mesh>
      <mesh geometry={geo.kick}><meshStandardMaterial color="#d8b23a" roughness={0.5} /></mesh>
      <mesh geometry={geo.cap}><meshStandardMaterial color="#2c5f93" roughness={0.45} /></mesh>
      <mesh geometry={geo.glass} renderOrder={2}><meshPhysicalMaterial color="#cfe2ea" transparent opacity={0.13} roughness={0.04} clearcoat={1} depthWrite={false} envMapIntensity={1.5} side={THREE.DoubleSide} /></mesh>
      <group position={[GOAL_X, 0, mid]}><Goal /></group>
      <group position={[-GOAL_X, 0, mid]} rotation-y={Math.PI}><Goal /></group>
      {/* 看台、屋架、墙。墙和屋顶不投影子，斜阳才照得进来 */}
      <mesh geometry={geo.far} receiveShadow><Painted rough={0.7} metal={0.05} /></mesh>
      <mesh geometry={geo.steel} receiveShadow><Painted rough={0.45} metal={0.7} /></mesh>
      <mesh geometry={geo.lamp}><meshBasicMaterial color="#fff3d6" toneMapped={false} /></mesh>
      <mesh geometry={geo.walls} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.h + 0.35, (HALL.z0 + HALL.z1) / 2]}><boxGeometry args={[HALL.x1 - HALL.x0 + 1.5, 0.25, HALL.z1 - HALL.z0 + 1.5]} /><meshStandardMaterial color="#39424b" roughness={0.8} /></mesh>
      <mesh position={[0, 8.3, HALL.z0 + 0.62]}><planeGeometry args={[8.4, 2.9]} /><meshBasicMaterial map={tex.board} toneMapped={false} /></mesh>
      {/* 场边器材区：蓝色地垫、隔墙、实验台 */}
      <mesh rotation-x={-Math.PI / 2} position={[45.5, 0.004, -13]} receiveShadow><planeGeometry args={[23, 9]} /><meshStandardMaterial map={tex.mat} color="#7f9fc4" roughness={0.9} /></mesh>
      <mesh geometry={geo.part} receiveShadow><meshStandardMaterial map={tex.part} roughness={0.85} /></mesh>
      <mesh position={[45.5, 0.5, PART_Z + 0.103]}><planeGeometry args={[21, 1.0]} /><meshStandardMaterial color="#48657e" roughness={0.8} /></mesh>
      <mesh position={[ST.cradle + 3.4, 2.5, PART_Z + 0.11]}><planeGeometry args={[2.2, 0.42]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <mesh geometry={geo.lab} castShadow receiveShadow><Painted rough={0.65} metal={0.05} /></mesh>
      <mesh geometry={geo.labSteel} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" /></mesh>
      {([['egg', 1.5], ['track', 2.2], ['cradle', 1.5]] as [StKey, number][]).map(([k, w]) => (
        <RoundedBox key={k} args={[w, 0.04, 0.82]} radius={0.012} smoothness={3} position={[ST[k], TOP - 0.02, BENCH_Z]} castShadow receiveShadow>
          <meshPhysicalMaterial map={tex.top} roughness={0.55} clearcoat={0.25} clearcoatRoughness={0.5} envMapIntensity={0.7} />
        </RoundedBox>
      ))}
      {[-0.1, -0.05, 0, 0.05, 0.1].map((dx, i) => <group key={i} position={[ST.egg - 0.5 + dx * 0.98 + 0.004 * i, TOP + 0.012, BENCH_Z + 0.24 - dx * 0.2]}><Egg /></group>)}
      {/* 不在这一课的实验台上，器材照样摆着 */}
      {(Object.keys(IDLE) as StKey[]).filter(k => k !== cur).map(k => <group key={k}>{IDLE[k]()}</group>)}
      {/* 馆外：树林、远山、试车台 */}
      <mesh geometry={geo.scenery} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
      <mesh geometry={geo.hills}><meshStandardMaterial vertexColors roughness={1} side={THREE.DoubleSide} /></mesh>
      <group position={[STAND.x, 0, STAND.z]}><TestStand /></group>
    </group>
  )
}
