// 高炉区：一座中型高炉和它周围的设备。尺寸按米写，整组放大 M 倍放进世界里。
// 高炉：炉基、炉缸（出铁口、风口）、炉腹、炉腰、炉身、炉喉、炉顶（无料钟炉顶的罩子）、上升管和下降管、炉顶放散阀；
// 外面一圈热风围管和风口支管，四根框架柱和几层平台；前面是架高的出铁场（主铁沟、撇渣器、铁沟、渣沟、泥炮、开口机），
// 出铁场下面的铁轨上停着铁水罐车；东边三座热风炉和热风总管、烟囱；西边重力除尘器；炉顶往北一条上料皮带通廊，皮带上送着铁矿石、焦炭、石灰石。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, lathe, mergeParts, type Part, type RY } from '@/lab-kit'
import { cladTex, gratingTex, pileTex, rep, warnSign } from './mats'
import { Flame, Glow, Puffs, Sparks, useMolten } from './fx'
import { rng } from './parts'

/** 高炉区在世界里的原点（画面单位）；以下尺寸都是米 */
export const BF = { x: 420, z: -120 }
/** 出铁场地坪的高度、出铁口、撇渣器、铁水落进罐车的口、渣沟的末端（米，相对高炉中心） */
export const CAST = { floor: 8, tap: [0, 8.55, 4.75] as [number, number, number], skim: 12.5, spout: 20, slagEnd: 15.6, rail: 20 }
const SHELL: RY[] = [[0, 5], [4.75, 5], [4.75, 12.2], [4.95, 12.6], [4.95, 13.4], [5.9, 16.8], [5.9, 18.8], [4.45, 33.5], [4.45, 35.4], [2.4, 38.2], [2.4, 38.4], [0, 38.4]]
const BUSTLE = { R: 8.2, y: 15.6, r: 0.95 }
const STOVES = [28, 40, 52], STOVE = { z: -2, r: 4.2, h: 34 }
const MAIN = { y: 15.6, z: 4.4, r: 1.05 }
const DUST = { x: -26, z: -7 }
/** 上料皮带通廊：从炉顶往北（−z）斜下去，坡度 16° */
const GAL = { top: [0, 42.4, -5] as [number, number, number], slope: 16 * Math.PI / 180, len: 150, w: 4, h: 3.4, open: 26 }

const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, r?: [number, number, number]): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c, r })
const cyl = (x: number, y0: number, z: number, rad: number, h: number, c: string): Part => ({ p: [x, y0 + h / 2, z], s: [rad, h, rad], c, cyl: true })
/** 两点之间的一根圆管（几何体） */
function tubeBetween(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 20) {
  const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()))
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
  return g
}
/** 沿几个点弯过去的管子（几何体） */
const bent = (pts: [number, number, number][], r: number, seg = 48) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.05), seg, r, 16)
/** 一块中间开圆孔的方板（平台、出铁场地坪）：x0–x1、z0–z1，圆孔圆心 (hx, hz)、半径 hr；顶面在 y，厚 t */
function plate(x0: number, x1: number, z0: number, z1: number, y: number, t: number, holes: [number, number, number][]) {
  const s = new THREE.Shape(); s.moveTo(x0, -z0); s.lineTo(x1, -z0); s.lineTo(x1, -z1); s.lineTo(x0, -z1); s.closePath()
  for (const [hx, hz, hr] of holes) { const h = new THREE.Path(); if (hr > 0) h.absarc(hx, -hz, hr, 0, Math.PI * 2, true); else { const q = -hr; h.moveTo(hx - q, -hz - q); h.lineTo(hx - q, -hz + q); h.lineTo(hx + q, -hz + q); h.lineTo(hx + q, -hz - q); h.closePath() } s.holes.push(h) }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 40 }); g.rotateX(-Math.PI / 2); g.translate(0, y - t, 0)
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2, p.getZ(i) / 2)
  return g
}
/** 一圈栏杆：半径 R、高 y 的平台边上的立柱和扶手 */
function ringRail(R: number, y: number, P: Part[], n = 40) {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; P.push(cyl(Math.cos(a) * R, y, Math.sin(a) * R, 0.035, 1.1, '#d8b23a')) }
}
/** 方平台四边的栏杆 */
function squareRail(x0: number, x1: number, z0: number, z1: number, y: number, P: Part[]) {
  for (const [a, b, z, alongX] of [[x0, x1, z0, true], [x0, x1, z1, true], [z0, z1, x0, false], [z0, z1, x1, false]] as [number, number, number, boolean][]) {
    const L = b - a, n = Math.max(2, Math.round(L / 1.6))
    for (let i = 0; i <= n; i++) { const u = a + L * i / n; P.push(alongX ? cyl(u, y, z, 0.035, 1.1, '#d8b23a') : cyl(z, y, u, 0.035, 1.1, '#d8b23a')) }
    for (const hy of [0.55, 1.1]) P.push(alongX ? box((a + b) / 2, y + hy - 0.03, z, L, 0.06, 0.06, '#d8b23a') : box(z, y + hy - 0.03, (a + b) / 2, 0.06, 0.06, L, '#d8b23a'))
  }
}

/** 高炉区的静态部分：拼成几大块，各用一种材质 */
function useFurnaceGeo() {
  return useMemo(() => {
    // 炉壳：车削出来的钢壳
    const shell = lathe(SHELL, { segs: 72, crease: 20 })
    // 炉身上一道道冷却壁的水管环、炉缸上的箍
    const rings: THREE.BufferGeometry[] = []
    const rAt = (y: number) => { for (let i = 0; i < SHELL.length - 1; i++) { const [r0, y0] = SHELL[i], [r1, y1] = SHELL[i + 1]; if (y >= y0 && y <= y1 && y1 > y0) return r0 + (r1 - r0) * (y - y0) / (y1 - y0) } return 0 }
    for (let y = 6; y < 12; y += 1.1) { const g = new THREE.TorusGeometry(rAt(y) + 0.06, 0.12, 6, 72); g.rotateX(Math.PI / 2); g.translate(0, y, 0); rings.push(g) }
    for (let y = 19.6; y < 33; y += 1.35) { const g = new THREE.TorusGeometry(rAt(y) + 0.05, 0.07, 6, 72); g.rotateX(Math.PI / 2); g.translate(0, y, 0); rings.push(g) }
    // 炉身上竖着的冷却水管：一圈 24 根
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); rings.push(tubeBetween(new THREE.Vector3(c * 6.05, 17.2, s * 6.05), new THREE.Vector3(c * 6.05, 18.6, s * 6.05), 0.09, 8), tubeBetween(new THREE.Vector3(c * 4.62, 33.2, s * 4.62), new THREE.Vector3(c * 6.03, 19.0, s * 6.03), 0.09, 8)) }
    // 热风围管、风口支管（一圈 18 个风口）、热风总管和它到每座热风炉的支管
    const blast: THREE.BufferGeometry[] = []
    { const g = new THREE.TorusGeometry(BUSTLE.R, BUSTLE.r, 16, 96); g.rotateX(Math.PI / 2); g.translate(0, BUSTLE.y, 0); blast.push(g) }
    for (let i = 0; i < 18; i++) {
      const a = (i + 0.5) / 18 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a)
      blast.push(bent([[c * BUSTLE.R, BUSTLE.y - 0.6, s * BUSTLE.R], [c * (BUSTLE.R - 0.4), 14.2, s * (BUSTLE.R - 0.4)], [c * 6.6, 13.1, s * 6.6], [c * 5.0, 12.9, s * 5.0]], 0.26, 16))
      const k = new THREE.CylinderGeometry(0.42, 0.42, 0.5, 12); k.rotateZ(Math.PI / 2); k.rotateY(-a); k.translate(c * 5.15, 12.9, s * 5.15); blast.push(k)
    }
    blast.push(tubeBetween(new THREE.Vector3(BUSTLE.R * 0.9, MAIN.y, MAIN.z), new THREE.Vector3(STOVES[2] + 3, MAIN.y, MAIN.z), MAIN.r, 24))
    for (const x of STOVES) { blast.push(tubeBetween(new THREE.Vector3(x, MAIN.y, STOVE.z + STOVE.r - 0.3), new THREE.Vector3(x, MAIN.y, MAIN.z), 0.8, 16)); const v = new THREE.CylinderGeometry(1.25, 1.25, 1.1, 20); v.rotateX(Math.PI / 2); v.translate(x, MAIN.y, (STOVE.z + STOVE.r + MAIN.z) / 2); blast.push(v) }
    // 冷风管、煤气管：热风炉后面两根长管
    for (const [y, r] of [[4, 0.8], [7.5, 0.6]] as [number, number][]) { blast.push(tubeBetween(new THREE.Vector3(STOVES[0] - 6, y, STOVE.z - STOVE.r - 1.6), new THREE.Vector3(STOVES[2] + 14, y, STOVE.z - STOVE.r - 1.6), r, 16)); for (const x of STOVES) blast.push(tubeBetween(new THREE.Vector3(x, y, STOVE.z - STOVE.r + 0.2), new THREE.Vector3(x, y, STOVE.z - STOVE.r - 1.6), r * 0.7, 12)) }
    // 烟道：热风炉底下通到烟囱
    blast.push(tubeBetween(new THREE.Vector3(STOVES[0], 1.6, STOVE.z - 1), new THREE.Vector3(66, 1.6, STOVE.z - 1), 1.3, 16))
    // 炉顶：上升管四根、交叉的连接管、下降管、放散阀
    const gas: THREE.BufferGeometry[] = []
    for (let i = 0; i < 4; i++) { const a = (i + 0.5) / 4 * Math.PI * 2, c = Math.cos(a) * 2.9, s = Math.sin(a) * 2.9; gas.push(bent([[c * 0.9, 36.6, s * 0.9], [c, 38.6, s], [c * 1.05, 44, s * 1.05], [c * 1.05, 50, s * 1.05]], 0.85, 24)); gas.push(tubeBetween(new THREE.Vector3(c * 1.05, 50, s * 1.05), new THREE.Vector3(c * 1.05, 52.2, s * 1.05), 0.5, 12)); const cap = new THREE.CylinderGeometry(0.75, 0.75, 0.5, 16); cap.translate(c * 1.05, 52.6, s * 1.05); gas.push(cap) }
    gas.push(tubeBetween(new THREE.Vector3(-3.1, 50.4, -3.1), new THREE.Vector3(3.1, 50.4, 3.1), 0.85, 20), tubeBetween(new THREE.Vector3(-3.1, 50.4, 3.1), new THREE.Vector3(3.1, 50.4, -3.1), 0.85, 20))
    gas.push(tubeBetween(new THREE.Vector3(-2, 50.4, 0), new THREE.Vector3(DUST.x + 0.6, 29.8, DUST.z), 1.3, 24))
    // 重力除尘器：上下两个锥，中间圆筒，四条腿
    gas.push(lathe([[0, 7], [0.8, 7], [0.8, 8.2], [5, 14], [5, 26], [1.3, 29.6], [1.3, 30.6], [0, 30.6]], { segs: 48, crease: 20 }).translate(DUST.x, 0, DUST.z))
    // 热风炉：炉壳加圆顶
    const stoves: THREE.BufferGeometry[] = []
    for (const x of STOVES) stoves.push(lathe([[0, 0], [STOVE.r + 0.3, 0], [STOVE.r + 0.3, 1.2], [STOVE.r, 1.4], ...Array.from({ length: 13 }, (_, i) => { const a = i / 12 * Math.PI / 2; return [STOVE.r * Math.cos(a), STOVE.h + STOVE.r * 0.9 * Math.sin(a)] as RY }), [0, STOVE.h + STOVE.r * 0.9]], { segs: 48, crease: 20 }).translate(x, 0, STOVE.z))
    for (const x of STOVES) for (const y of [10, 22, STOVE.h - 0.4]) { const g = new THREE.TorusGeometry(STOVE.r + 0.08, 0.14, 6, 64); g.rotateX(Math.PI / 2); g.translate(x, y, STOVE.z); stoves.push(g) }
    return { shell, rings: mergeGeometries(rings), blast: mergeGeometries(blast.map(g => g.index ? g.toNonIndexed() : g)), gas: mergeGeometries(gas.map(g => g.index ? g.toNonIndexed() : g)), stoves: mergeGeometries(stoves) }
  }, [])
}

/** 钢结构：框架柱、平台的梁、出铁场的柱子和屋架、炉顶的设备间、热风炉的平台、铁轨等，拼成一个带顶点颜色的模型 */
function steelParts() {
  const P: Part[] = []
  const col = '#5c6166', beam = '#6b7075', yellow = '#d8b23a'
  // 炉基：八角形的混凝土台
  P.push({ p: [0, 2.5, 0], s: [7.2, 5, 7.2], c: '#a39f96', cyl: true })
  // 炉体框架：四根大柱从地面到炉顶，每层平台一圈梁
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(sx * 10.5, 0, sz * 10.5, 1.2, 46, 1.2, col))
  for (const y of [15, 24, 32, 38.4, 46]) for (const s of [-1, 1]) { P.push(box(0, y - 0.9, s * 10.5, 22.2, 0.9, 0.6, beam), box(s * 10.5, y - 0.9, 0, 0.6, 0.9, 22.2, beam)) }
  // 斜撑
  for (const s of [-1, 1]) for (const [y0, y1] of [[15, 24], [24, 32], [32, 38.4]]) { const L = Math.hypot(21, y1 - y0); P.push({ p: [0, (y0 + y1) / 2 - 0.5, s * 10.5], s: [L, 0.4, 0.4], c: beam, r: [0, 0, Math.atan2(y1 - y0, 21) * (s > 0 ? 1 : -1)] }) }
  for (const y of [24, 32, 38.4, 46]) squareRail(-10.8, 10.8, -10.8, 10.8, y, P)
  // 炉顶设备间：方形的钢结构小楼，压型钢板墙
  P.push(box(0, 38.4, 0, 2.4, 3.4, 2.4, '#6a6f73'))
  // 出铁场：地坪下的柱子（铁轨两边留出通道）
  for (const x of [-16, -8, 8, 16]) for (const z of [-12, -2, 9, 16.5, 24.5]) P.push(box(x, 0, z, 1.1, CAST.floor - 0.8, 1.1, '#a7a399'))
  for (const z of [-12, -2, 9, 16.5, 24.5]) P.push(box(0, CAST.floor - 1.6, z, 33, 0.8, 0.9, '#a7a399'))
  // 出铁场的厂房：两边一排柱子，屋架，屋面盖在后半边
  for (const x of [-19, 19]) for (let z = -12; z <= 28; z += 8) P.push(box(x, CAST.floor, z, 0.8, 18, 0.8, col))
  for (let z = -12; z <= 12; z += 8) { P.push(box(0, CAST.floor + 18, z, 39, 0.8, 0.5, beam)); for (let k = -3; k <= 3; k++) P.push({ p: [k * 5.4, CAST.floor + 19.6, z], s: [0.25, 3.2, 0.25], c: beam, r: [0, 0, (k % 2) * 0.5] }) }
  for (const x of [-19, 19]) P.push(box(x, CAST.floor + 16.2, 8, 0.6, 1.0, 40, beam))
  squareRail(-16, 16, 25.8, 25.8, CAST.floor, P)
  // 泥炮（左）和开口机（右）：底座、转臂
  // 泥炮：底座、立柱、转臂，转臂头上一只炮筒（停在一旁）
  P.push(box(-4.6, CAST.floor, 5.6, 1.8, 0.5, 1.8, '#3b3f43'), { p: [-4.6, CAST.floor + 1.2, 5.6], s: [0.45, 1.6, 0.45], c: '#4a4f54', cyl: true }, box(-3.3, CAST.floor + 1.9, 6.4, 3.2, 0.5, 0.7, '#d0a52a', [0, 0.55, 0]))
  P.push({ p: [-2.2, CAST.floor + 1.5, 7.3], s: [0.42, 2.4, 0.42], c: '#3b3f43', r: [Math.PI / 2 - 0.3, 0.6, 0], cyl: true })
  // 开口机：一根斜的长导轨，上面的钻机和钻杆
  P.push(box(4.6, CAST.floor, 7.4, 1.4, 0.8, 1.4, '#3b3f43'), box(3.2, CAST.floor + 1.0, 8.2, 0.5, 0.45, 5.4, '#d0a52a', [0.05, -0.35, 0]), box(3.6, CAST.floor + 1.45, 7.6, 0.7, 0.6, 1.0, '#3b3f43', [0, -0.35, 0]))
  // 铁水罐车的铁轨：沿 x 方向两根钢轨，下面一根根枕木
  for (const s of [-0.72, 0.72]) P.push(box(0, 0.25, CAST.rail + s, 180, 0.16, 0.08, '#55575a'))
  for (let x = -90; x <= 90; x += 0.9) P.push(box(x, 0, CAST.rail, 0.22, 0.22, 2.4, '#5d5248'))
  // 渣罐车的轨道
  for (const s of [-0.72, 0.72]) P.push(box(CAST.slagEnd + 3, 0.25, CAST.skim + s, 0.08, 0.16, 40, '#55575a'))
  // 热风炉：顶上的平台、爬梯；烟囱
  for (const x of STOVES) { P.push({ p: [x, STOVE.h - 0.6, STOVE.z], s: [STOVE.r + 1.2, 0.3, STOVE.r + 1.2], c: '#585c60', cyl: true }); P.push(box(x + STOVE.r + 0.6, 0, STOVE.z, 0.5, STOVE.h, 0.5, '#d8b23a')) }
  // 上料皮带通廊的支架：一组组门形的钢支架
  const c = Math.cos(GAL.slope), sn = Math.sin(GAL.slope)
  for (let d = 18; d < GAL.len - 4; d += 18) { const z = GAL.top[2] - d * c, y = GAL.top[1] - d * sn - GAL.h / 2 - 0.3; for (const s of [-1, 1]) P.push(box(s * (GAL.w / 2 + 0.4), 0, z, 0.6, y, 0.6, col)); P.push(box(0, y - 0.6, z, GAL.w + 1.4, 0.6, 0.6, beam)) }
  // 原料场：通廊脚下的三个料堆之间的挡墙
  P.push(box(0, 0, GAL.top[2] - GAL.len * c - 10, 60, 3, 1.2, '#9a968c'))
  // 地面上的几样东西：道路的边线、管道支架
  for (let x = -20; x <= 60; x += 10) P.push(box(x, 0, MAIN.z + 26, 0.2, 0.02, 4, '#e9e6dc'))
  return P
}

/** 出铁场地坪上的耐火材料铁沟：主铁沟从出铁口到撇渣器，再到落铁口；渣沟从撇渣器往东。返回几块，都是 U 形槽的两道墙和底 */
function runnerParts() {
  const P: Part[] = [], F = CAST.floor, w = 1.1, wall = 0.45, h = 0.7, c = '#2f2a27'
  const along = (z0: number, z1: number, x = 0) => { P.push(box(x, F, (z0 + z1) / 2, w + wall * 2, 0.2, z1 - z0, c)); for (const s of [-1, 1]) P.push(box(x + s * (w / 2 + wall / 2), F, (z0 + z1) / 2, wall, h, z1 - z0, c)) }
  const across = (x0: number, x1: number, z: number) => { P.push(box((x0 + x1) / 2, F, z, x1 - x0, 0.2, w * 0.9 + wall * 2, c)); for (const s of [-1, 1]) P.push(box((x0 + x1) / 2, F, z + s * (w * 0.45 + wall / 2), x1 - x0, h, wall, c)) }
  along(CAST.tap[2] + 0.1, CAST.spout - 0.8)
  across(w / 2 + wall, CAST.slagEnd, CAST.skim)
  // 撇渣器：横在铁沟上的一道挡墙（下面留着让铁水过去的口子）
  P.push(box(0, F + 0.55, CAST.skim + 0.9, w + wall * 2 + 0.3, 0.9, 0.5, '#5a463b'))
  // 落铁口外围一圈挡墙
  P.push(box(0, F, CAST.spout + 1.1, 2.6, 0.9, 0.4, c))
  return P
}

/** 上料皮带通廊：斜着的一条盒子，下段包压型钢板，上段只剩桁架，能看见皮带上的料 */
function Gallery() {
  const clad = useMemo(() => rep(cladTex(), 12, 1), [])
  const geo = useMemo(() => {
    const P: Part[] = [], L = GAL.len, W = GAL.w, H = GAL.h
    // 局部坐标：沿 −z 往下走 d 米；先在水平的盒子里拼，再整体转过坡度
    for (let d = 0; d <= GAL.open; d += 2.2) { for (const sx of [-1, 1]) P.push(box(sx * W / 2, 0, -d, 0.18, H, 0.18, '#5c6166')); P.push(box(0, H - 0.1, -d, W, 0.18, 0.18, '#5c6166')) }
    for (const sx of [-1, 1]) for (const y of [0, H - 0.1]) P.push(box(sx * W / 2, y, -GAL.open / 2, 0.2, 0.2, GAL.open, '#5c6166'))
    // 皮带机：托辊架和下面的回程带
    P.push(box(0, 0.2, -L / 2, 1.6, 0.12, L, '#202224'), box(0, 0.75, -L / 2, 1.5, 0.06, L, '#1a1b1c'))
    for (let d = 1; d < L; d += 1.5) P.push(box(0, 0.45, -d, 1.8, 0.28, 0.12, '#6a6e72'))
    P.push(box(0, -0.25, -L / 2, W + 0.4, 0.25, L, '#6b7075'))
    return mergeParts(P)
  }, [])
  const cladGeo = useMemo(() => { const g = new THREE.BoxGeometry(GAL.w + 0.2, GAL.h, GAL.len - GAL.open); g.translate(0, GAL.h / 2, -(GAL.open + (GAL.len - GAL.open) / 2)); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i)); return g }, [])
  return <group position={GAL.top} rotation-x={-GAL.slope}>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.65} metal={0.3} /></mesh>
    <mesh geometry={cladGeo} castShadow receiveShadow><meshStandardMaterial map={clad} color="#b9c2c6" roughness={0.6} metalness={0.25} /></mesh>
    <Belt />
  </group>
}
/** 皮带上的料：一批铁矿石、一批焦炭、一批石灰石，一直往炉顶走（皮带往 +z，也就是往上走） */
function Belt() {
  const N = 150, mesh = useRef<THREE.InstancedMesh>(null)
  const items = useMemo(() => { const r = rng(91); return Array.from({ length: N }, (_, i) => ({ d: i / N * 60, x: (r() - 0.5) * 1.1, s: 0.22 + r() * 0.16, rot: r() * 6, kind: Math.floor(i / 10) % 3 })) }, [])
  const cols = useMemo(() => [new THREE.Color('#6e3420'), new THREE.Color('#1d1d1e'), new THREE.Color('#d9d4c6')], [])
  const m4 = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(), []), p = useMemo(() => new THREE.Vector3(), []), sc = useMemo(() => new THREE.Vector3(), [])
  const ready = useRef(false)
  useFrame(({ clock }) => {
    const me = mesh.current; if (!me) return
    if (!ready.current) { items.forEach((it, i) => me.setColorAt(i, cols[it.kind])); if (me.instanceColor) me.instanceColor.needsUpdate = true; ready.current = true }
    const t = clock.elapsedTime * 1.6
    items.forEach((it, i) => {
      const d = (it.d + t) % 60, z = -60 + d      // 从 −60 m 走到 0（炉顶）
      p.set(it.x, 0.88 + it.s * 0.6, z); e.set(it.rot, it.rot * 1.3, 0); q.setFromEuler(e); sc.setScalar(it.s * Math.min(1, (60 - d) / 2))
      m4.compose(p, q, sc); me.setMatrixAt(i, m4)
    })
    me.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, N]} castShadow frustumCulled={false}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={0.9} /></instancedMesh>
}

/** 铁水罐车（鱼雷罐车）：两头尖、中间粗的罐体，顶上一个罐口，下面两组转向架 */
function Torpedo({ x }: { x: number }) {
  const body = useMemo(() => { const g = lathe([[0, -8], [0.9, -7.6], [1.7, -5.8], [2.0, -3.6], [2.0, 3.6], [1.7, 5.8], [0.9, 7.6], [0, 8]], { segs: 40, crease: 30 }); g.rotateZ(Math.PI / 2); return g }, [])
  const parts = useMemo(() => {
    const P: Part[] = []
    for (const s of [-1, 1]) { P.push(box(s * 5.2, 0.6, 0, 4.6, 0.9, 2.2, '#2a2c2e'), box(s * 5.2, 1.5, 0, 2, 1.4, 2.6, '#33363a')); for (const w of [-1.3, 1.3]) for (const t of [-0.72, 0.72]) P.push({ p: [s * 5.2 + w, 0.55, t], s: [0.45, 0.16, 0.45], c: '#3a3c3e', r: [Math.PI / 2, 0, 0], cyl: true }) }
    P.push(box(0, 1.2, 0, 12, 0.5, 1.4, '#2f3134'))
    // 罐口
    P.push({ p: [0, 5.05, 0], s: [0.85, 0.5, 0.85], c: '#2b2b2b', cyl: true })
    return mergeParts(P)
  }, [])
  return <group position={[x, 0, CAST.rail]}>
    <mesh geometry={body} position-y={3.0} castShadow receiveShadow><meshStandardMaterial color="#4a4744" roughness={0.75} metalness={0.4} /></mesh>
    {/* 罐体上被烤出来的一圈锈色 */}
    <mesh position-y={3.0} rotation-z={Math.PI / 2}><cylinderGeometry args={[2.02, 2.02, 4, 40, 1, true]} /><meshStandardMaterial color="#6d4a35" roughness={0.9} transparent opacity={0.55} /></mesh>
    <mesh geometry={parts} castShadow><Painted rough={0.7} metal={0.4} /></mesh>
  </group>
}

/** 整个高炉区（静态 + 一直在动的皮带） */
export function Plant() {
  const G = useFurnaceGeo()
  const tex = useMemo(() => ({ grate: rep(gratingTex(), 1, 1), brick: rep(pileTex('#4e4844', '#625a52', '#3a3531', 4, 11), 1, 1), ore: rep(pileTex('#6a3420', '#8a4a2c', '#4c2416', 6, 3), 6, 6), coke: rep(pileTex('#1c1c1c', '#3a3936', '#0c0c0c', 6, 5), 6, 6), lime: rep(pileTex('#cfc9bb', '#e7e2d6', '#aaa498', 6, 7), 6, 6), warn: warnSign('高温危险') }), [])
  const geo = useMemo(() => ({
    steel: mergeParts(steelParts()), runner: mergeParts(runnerParts()),
    floor: plate(-16.5, 16.5, -12.5, 26, CAST.floor, 0.8, [[0, 0, 5.0], [0, CAST.spout, -0.9]]),
    decks: mergeGeometries([24, 32, 38.4, 46].map((y, i) => plate(-10.8, 10.8, -10.8, 10.8, y, 0.2, [[0, 0, i < 3 ? [5.4, 4.9, 4.9][i] : 2.5]]))),
    tuyereDeck: plate(-10.8, 10.8, -10.8, 10.8, 14.2, 0.2, [[0, 0, 5.3]]),
    roof: plate(-19.5, 19.5, -12.5, 12.5, CAST.floor + 18.8, 0.3, [[0, 0, 6.0]]),
    piles: [0, 1, 2].map(i => { const g = new THREE.ConeGeometry(9, 7, 28, 1, true); g.translate((i - 1) * 20, 3.5, GAL.top[2] - GAL.len * Math.cos(GAL.slope) - 20); return g }),
  }), [])
  return (
    <group position={[BF.x, 0, BF.z]} scale={6}>
      {/* 炉壳：深灰的钢板，冷却水管环 */}
      <mesh geometry={G.shell} castShadow receiveShadow><meshStandardMaterial color="#4f5357" roughness={0.55} metalness={0.55} /></mesh>
      <mesh geometry={G.rings} castShadow><Metal kind="steel" grain="cast" rough={0.5} /></mesh>
      {/* 热风系统：围管、风口支管、总管，外面包着浅灰的保温层 */}
      <mesh geometry={G.blast} castShadow receiveShadow><meshStandardMaterial color="#8e918f" roughness={0.65} metalness={0.25} /></mesh>
      {/* 煤气系统：上升管、下降管、除尘器 */}
      <mesh geometry={G.gas} castShadow receiveShadow><meshStandardMaterial color="#6d7174" roughness={0.6} metalness={0.45} /></mesh>
      <mesh geometry={G.stoves} castShadow receiveShadow><meshStandardMaterial color="#8d9296" roughness={0.55} metalness={0.4} /></mesh>
      <mesh geometry={geo.steel} castShadow receiveShadow><Painted rough={0.6} metal={0.35} /></mesh>
      <mesh geometry={geo.decks} castShadow receiveShadow><meshStandardMaterial map={tex.grate} color="#9a9890" roughness={0.6} metalness={0.5} /></mesh>
      <mesh geometry={geo.tuyereDeck} castShadow receiveShadow><meshStandardMaterial map={tex.grate} color="#9a9890" roughness={0.6} metalness={0.5} /></mesh>
      {/* 出铁场：耐火砖铺的地坪、铁沟 */}
      <mesh geometry={geo.floor} castShadow receiveShadow><meshStandardMaterial map={tex.brick} color="#c9c1b8" roughness={0.95} /></mesh>
      <mesh geometry={geo.runner} castShadow receiveShadow><Painted rough={0.95} metal={0} /></mesh>
      <mesh geometry={geo.roof} castShadow receiveShadow><meshStandardMaterial color="#7d8a92" roughness={0.6} metalness={0.4} side={THREE.DoubleSide} /></mesh>
      <mesh position={[-6.5, CAST.floor + 2.4, 2.4]} rotation-y={0.7}><planeGeometry args={[2.2, 1.1]} /><meshStandardMaterial map={tex.warn} roughness={0.6} /></mesh>
      {/* 热风炉顶上的一缕热气、炉顶放散阀边的白汽 */}
      <Puffs at={[66, 70, -10]} on opt={{ rate: 2, life: 7, size: [4, 14], speed: 1.6, dir: [0.3, 1, 0], color: '#dcdcd6', opacity: 0.35, jitter: 1 }} seed={4} />
      <Gallery />
      {[tex.ore, tex.coke, tex.lime].map((m, i) => <mesh key={i} geometry={geo.piles[i]} receiveShadow castShadow><meshStandardMaterial map={m} roughness={1} /></mesh>)}
      <Torpedo x={0} />
      <Torpedo x={-34} />
      {/* 渣罐车 */}
      <group position={[CAST.slagEnd + 3, 0, CAST.skim]}>
        <mesh position-y={2.4}><cylinderGeometry args={[2.1, 1.4, 2.6, 28]} /><Metal kind="iron" grain="cast" /></mesh>
        <mesh position-y={0.8}><boxGeometry args={[2.6, 1, 3.6]} /><meshStandardMaterial color="#2d2f31" roughness={0.7} /></mesh>
      </group>
      {/* 烟囱 */}
      <group position={[66, 0, -10]}>
        {Array.from({ length: 7 }, (_, i) => <mesh key={i} position-y={10 * (i + 0.5)} castShadow><cylinderGeometry args={[2.9 - (i + 1) * 0.15, 2.9 - i * 0.15, 10, 24]} /><meshStandardMaterial color={i % 2 ? '#e8e4dc' : '#b23a2c'} roughness={0.85} /></mesh>)}
      </group>
    </group>
  )
}

/**
 * 出铁：k 0–1 是这一次出铁进行到哪了（0 出铁口还堵着，开始后铁水沿铁沟流到撇渣器，炉渣被分到渣沟，铁水流进罐车）。
 * 放在课里，用世界坐标（自己乘 M、加原点）
 */
export function Tapping({ k }: { k: number }) {
  const iron = useMolten(1, 0.9, 0.15), slag = useMolten(0.55, 0.6, 0.75), fall = useMolten(1.1, 2.2, 0.05)
  const F = CAST.floor, on = k > 0.02
  const reach = Math.min(1, k * 3.2)                                  // 铁水的前锋走到哪（0–1：出铁口到落铁口）
  const z0 = CAST.tap[2] + 0.2, z1 = CAST.spout - 0.9, front = z0 + (z1 - z0) * reach
  const slagK = Math.max(0, Math.min(1, (k - 0.22) * 3)), sx1 = 0.8 + (CAST.slagEnd - 0.8) * slagK
  const falling = k > 0.32
  return <group position={[BF.x, 0, BF.z]} scale={6}>
    {on && <>
      {/* 主铁沟里的铁水：下面一层亮的铁水，上面浮着一层暗的炉渣，一直到撇渣器 */}
      <mesh position={[0, F + 0.42, (z0 + front) / 2]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.08, front - z0, 1, 8]} /><primitive object={iron} attach="material" /></mesh>
      {front > CAST.skim - 0.6 && <mesh position={[0, F + 0.44, (z0 + CAST.skim) / 2]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.0, CAST.skim - z0 - 0.3]} /><primitive object={slag} attach="material" /></mesh>}
      {/* 渣沟里的炉渣 */}
      {slagK > 0 && <mesh position={[(0.8 + sx1) / 2, F + 0.4, CAST.skim]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}><planeGeometry args={[0.95, sx1 - 0.8]} /><primitive object={slag} attach="material" /></mesh>}
      {slagK > 0.98 && <mesh position={[CAST.slagEnd + 0.4, F / 2 + 0.6, CAST.skim]}><cylinderGeometry args={[0.2, 0.3, F - 1.6, 10]} /><primitive object={slag} attach="material" /></mesh>}
      {/* 落铁口：铁水从地坪的口子里落进下面的罐车 */}
      {falling && <mesh position={[0, (F + 5.1) / 2, CAST.spout]}><cylinderGeometry args={[0.28, 0.42, F - 5.1, 14]} /><primitive object={fall} attach="material" /></mesh>}
      {/* 出铁口喷出的火花、发光、烟 */}
      <Sparks at={[0, F + 0.7, CAST.tap[2] + 0.3]} on={k < 0.97} rate={120} speed={6} g={9} life={1.2} size={0.11} dir={[0, 0.9, 1]} spread={1.1} />
      {falling && <Sparks at={[0, 5.3, CAST.spout]} on rate={40} speed={3} g={9} life={0.8} size={0.06} dir={[0, 1, 0]} spread={1.6} seed={7} />}
      <Puffs at={[0, F + 1, CAST.tap[2] + 1.5]} on={k < 0.98} opt={{ rate: 7, life: 6, size: [1.5, 8], speed: 2.5, dir: [0, 1, 0.3], color: '#b89a80', opacity: 0.45, jitter: 0.8 }} seed={9} />
    </>}
    {/* 发光和灯光一直挂着（强度跟着走），免得出铁时灯的数目变了、着色器重新编译 */}
    <Glow at={[0, F + 0.9, CAST.tap[2] + 0.6]} size={6} color="#ffb070" level={on ? Math.min(1, k * 4) : 0} light={2200} distance={140} />
    <Glow at={[0, F + 0.6, CAST.skim]} size={4} color="#ff9a50" level={on && reach > 0.6 ? 0.8 : 0} light={900} distance={90} />
    <Glow at={[0, 5.4, CAST.spout]} size={5} color="#ffb070" level={on && falling ? 1 : 0} light={1400} distance={90} />
    {/* 出铁口堵着时：一块暗红的泥炮泥 */}
    <mesh position={[0, F + 0.7, CAST.tap[2] + 0.02]}><sphereGeometry args={[0.32, 16, 10]} /><meshStandardMaterial color={on ? '#3a1d10' : '#4a3226'} emissive="#ff5a14" emissiveIntensity={on ? 2.4 : 0.15} roughness={0.8} /></mesh>
    <Flame at={[0, F + 0.4, CAST.tap[2] + 0.4]} w={0.9} h={1.6} kind="match" level={on && k < 0.97 ? 1 : 0} seed={3} />
  </group>
}
