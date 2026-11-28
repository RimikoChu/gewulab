// 空分厂的室外部分：厂门和质检站的遮阳棚、空压机房、冷箱和剖开的精馏塔、氮氧两只产品罐、储罐区、槽车、灌装台、厂界的围栏和采样站、远处的输电塔和山。
// 都是不动的东西，尽量合并成几个模型。精馏塔里会变的液体、读数在第 7 课自己画。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Painted, lathe, makeGround, mergeParts, type Part, type RY } from '@/lab-kit'
import { makeSign, ribTex, rng, tankLabel } from './mats'
import { KIOSK, ST, TOP, TOWER, slab } from './world'

const paint = (g: THREE.BufferGeometry, color: string) => { const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
const flat = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map(g => { const q = g.index ? g.toNonIndexed() : g; q.deleteAttribute('uv'); return q }))

// ---------- 厂门、质检站 ----------
/** 遮阳棚的尺寸：四根钢柱、一片略斜的顶 */
const CAN = { w: 17, d: 12, h: 15.5 }
function gateParts() {
  const P: Part[] = [], kx = KIOSK.x, kz = KIOSK.z
  // 遮阳棚：四根方钢柱、柱脚板、檐梁、檩条
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    P.push({ p: [kx + sx * (CAN.w / 2 - 0.6), CAN.h / 2, kz + sz * (CAN.d / 2 - 0.6)], s: [0.5, CAN.h, 0.5], c: '#e9ebec' })
    P.push({ p: [kx + sx * (CAN.w / 2 - 0.6), 0.08, kz + sz * (CAN.d / 2 - 0.6)], s: [1.2, 0.16, 1.2], c: '#6d7377' })
  }
  for (const sz of [-1, 1]) P.push({ p: [kx, CAN.h - 0.1, kz + sz * (CAN.d / 2 - 0.6)], s: [CAN.w + 1.6, 0.6, 0.4], c: '#d9dcdd' })
  for (let i = 0; i < 6; i++) P.push({ p: [kx - CAN.w / 2 + 0.6 + i * (CAN.w - 1.2) / 5, CAN.h + 0.3, kz], s: [0.3, 0.3, CAN.d + 1.2], c: '#c9cdd0' })
  // 钢台：不锈钢台面在世界里另画；这里是四条腿、横撑、下层搁板
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ p: [kx + sx * 3.2, (TOP - 0.2) / 2, kz + sz * 1.8], s: [0.28, TOP - 0.2, 0.28], c: '#aeb4b8' })
  P.push({ p: [kx, 1.3, kz], s: [6.5, 0.12, 3.7], c: '#9aa1a6' })
  // 厂门：两根门柱、门楣、一道伸缩门（一排竖杆）、门卫亭
  for (const x of [-198, -182]) P.push({ p: [x, 5, 12], s: [1.6, 10, 1.6], c: '#d8d4c8' }, { p: [x, 10.3, 12], s: [2, 0.6, 2], c: '#8e9195' })
  P.push({ p: [-190, 11.6, 12], s: [18.4, 2, 1], c: '#2f5f8f' })
  for (let i = 0; i < 12; i++) P.push({ p: [-197 + i * 0.55, 2.2, 12], s: [0.14, 4.4, 0.5], c: '#c8ccd0' })
  P.push({ p: [-194, 4.5, 12], s: [6.6, 0.2, 0.6], c: '#c8ccd0' }, { p: [-194, 0.4, 12], s: [6.6, 0.3, 0.6], c: '#8e9195' })
  P.push({ p: [-206.5, 5, 10], s: [7, 10, 7], c: '#e6e3da' }, { p: [-206.5, 10.3, 10], s: [8, 0.6, 8], c: '#6c7379' }, { p: [-206.5, 6, 13.52], s: [4.4, 3.6, 0.1], c: '#5e7f95' }, { p: [-202.98, 6, 10], s: [0.1, 3.6, 3.6], c: '#5e7f95' })
  // 公示牌的两根立柱（牌面另画）
  for (const s of [-1, 1]) P.push({ p: [kx - 9.5 + s * 2.4, 4.3, kz - 3.5], s: [0.18, 8.6, 0.18], c: '#7d858b', cyl: true })
  return P
}

/** 空气质量自动监测站：白色的仪器柜，柜顶一根采样杆，杆顶是防雨的采样头，旁边一只小风杯。原点在柜底正中 */
export function Sampler({ position }: { position: [number, number, number] }) {
  const g = useMemo(() => {
    const P: Part[] = [
      { p: [0, 0.2, 0], s: [4.6, 0.4, 3.6], c: '#8d9194' },
      { p: [0, 3.4, 0], s: [4, 6, 3], c: '#b3bbbd' }, { p: [0, 5.75, 1.51], s: [4, 0.5, 0.04], c: '#2f6f9a' }, { p: [0, 6.5, 0], s: [4.4, 0.25, 3.4], c: '#c9ced1' },
      { p: [-0.95, 3, 1.52], s: [1.8, 4.6, 0.06], c: '#a4adb0' }, { p: [0.95, 3, 1.52], s: [1.8, 4.6, 0.06], c: '#a4adb0' }, { p: [0.15, 3.4, 1.58], s: [0.1, 0.9, 0.1], c: '#5b6165' },
      { p: [0.95, 4.4, 1.56], s: [1.1, 0.6, 0.04], c: '#1c2a26' },
      { p: [-1.1, 9.3, -0.6], s: [0.11, 5.4, 0.11], c: '#c9cdd0', cyl: true }, { p: [1.3, 8.4, -0.6], s: [0.07, 3.6, 0.07], c: '#c9cdd0', cyl: true },
      { p: [1.3, 10.2, -0.6], s: [0.05, 1.5, 0.05], r: [0, 0, Math.PI / 2], c: '#9aa0a4', cyl: true },
      { p: [2.25, 0.9, 0.9], s: [0.5, 1.8, 0.5], c: '#b9bdc0' },
    ]
    const head = lathe([[0, 0], [0.55, 0], [0.62, 0.1], [0.62, 0.5], [0.3, 0.95], [0.12, 1.05], [0, 1.05]], { segs: 28 }); head.translate(-1.1, 12, -0.6)
    const neck = lathe([[0, 0], [0.24, 0], [0.24, 0.5], [0.4, 0.62], [0.4, 0.7], [0, 0.7]], { segs: 20 }); neck.translate(-1.1, 11.4, -0.6)
    const cups = [0, 1, 2].map(i => { const s = new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI); s.rotateY(i * 2.094); s.translate(1.3 + Math.cos(i * 2.094) * 0.7, 10.2, -0.6 + Math.sin(i * 2.094) * 0.7); return s })
    return flat([mergeParts(P), paint(head, '#e3e6e6'), paint(neck, '#aab0b4'), ...cups.map(c => paint(c, '#30353a'))])
  }, [])
  return <mesh geometry={g} position={position} castShadow receiveShadow><Painted rough={0.5} metal={0.2} /></mesh>
}

// ---------- 空压机房 ----------
const CH = { x0: 42, x1: 72, z0: -96, z1: -66, h: 17 }, CZ = -81
function compressorParts() {
  const P: Part[] = [], cx = (CH.x0 + CH.x1) / 2
  P.push({ p: [cx, 0.5, (CH.z0 + CH.z1) / 2], s: [CH.x1 - CH.x0 + 0.6, 1, CH.z1 - CH.z0 + 0.6], c: '#8d9092' })
  // 卷帘门、小门、雨棚、落水管
  P.push({ p: [cx - 5, 5.5, CH.z1 + 0.06], s: [9, 9, 0.1], c: '#7c858c' }, { p: [cx - 5, 10.3, CH.z1 + 0.5], s: [10, 0.3, 1.2], c: '#5d646a' }, { p: [cx + 8, 4, CH.z1 + 0.06], s: [2.6, 6, 0.1], c: '#3f5f7c' })
  for (let i = 1; i < 9; i++) P.push({ p: [cx - 5, 1 + i, CH.z1 + 0.12], s: [9, 0.08, 0.06], c: '#666e75' })
  for (const x of [CH.x0 + 0.4, CH.x1 - 0.4]) P.push({ p: [x, CH.h / 2, CH.z1 + 0.25], s: [0.2, CH.h, 0.2], c: '#d9dcdd', cyl: true })
  // 吸风口：一只带百叶的过滤箱架在钢腿上，粗管接进机房
  P.push({ p: [CH.x0 - 6, 9, CZ], s: [7, 7, 9], c: '#dfe2e0' }, { p: [CH.x0 - 6, 12.9, CZ], s: [7.8, 0.4, 9.7], c: '#8a9197' })
  for (let i = 0; i < 9; i++) P.push({ p: [CH.x0 - 9.55, 6.4 + i * 0.65, CZ], s: [0.12, 0.3, 8.2], r: [0, 0, 0.5], c: '#b7bcbf' })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ p: [CH.x0 - 6 + sx * 3, 2.75, CZ + sz * 4], s: [0.4, 5.5, 0.4], c: '#6f767b' })
  P.push({ p: [CH.x0 - 1.3, 9, CZ], s: [1.3, 2.8, 1.3], r: [0, 0, Math.PI / 2], c: '#c9cdd0', cyl: true })
  // 屋脊上的通风器
  for (const x of [cx - 8, cx, cx + 8]) P.push({ p: [x, CH.h + 4.4, (CH.z0 + CH.z1) / 2], s: [1.2, 1.6, 1.2], c: '#b9bdc0', cyl: true }, { p: [x, CH.h + 5.4, (CH.z0 + CH.z1) / 2], s: [1.7, 0.3, 1.7], c: '#9aa0a4', cyl: true })
  // 管廊：从机房到冷箱，再到储罐区，走在后面；一根粗的空气管，两根细的产品管
  for (let x = 82; x <= 190; x += 18) P.push({ p: [x, 6, -44], s: [0.5, 12, 0.5], c: '#6f767b' }, { p: [x, 6, -40], s: [0.5, 12, 0.5], c: '#6f767b' }, { p: [x, 11.8, -42], s: [0.5, 0.5, 5], c: '#6f767b' })
  P.push({ p: [133, 12.9, -43], s: [0.8, 114, 0.8], r: [0, 0, Math.PI / 2], c: '#c9cdd0', cyl: true }, { p: [150, 12.6, -41.4], s: [0.45, 80, 0.45], r: [0, 0, Math.PI / 2], c: '#3f7fb8', cyl: true }, { p: [150, 12.6, -40.4], s: [0.4, 80, 0.4], r: [0, 0, Math.PI / 2], c: '#d8c23a', cyl: true })
  return P
}
/** 机房的墙和双坡屋顶：贴压型钢板 */
function compressorShell() {
  const { x0, x1, z0, z1, h } = CH, zc = (z0 + z1) / 2, rise = 4
  const walls = mergeGeometries([slab(x0, x1, 1, h, z1 - 0.3, z1, 4), slab(x0, x1, 1, h, z0, z0 + 0.3, 4), slab(x0, x0 + 0.3, 1, h, z0, z1, 4), slab(x1 - 0.3, x1, 1, h, z0, z1, 4)])
  // 山墙的三角和两片屋面
  const tri = new THREE.Shape(); tri.moveTo(z0, h); tri.lineTo(z1, h); tri.lineTo(zc, h + rise); tri.closePath()
  const gable = new THREE.ExtrudeGeometry(tri, { depth: x1 - x0, bevelEnabled: false }); gable.rotateY(-Math.PI / 2); gable.translate(x1, 0, 0)
  const half = (z1 - z0) / 2 + 1, len = Math.hypot(half, rise), a = Math.atan2(rise, half)
  const roofs = [-1, 1].map(s => { const g = new THREE.BoxGeometry(x1 - x0 + 2, 0.25, len + 0.6); g.rotateX(s * a); g.translate((x0 + x1) / 2, h + rise / 2 + 0.2, zc + s * half / 2); return g })
  return { walls, roof: mergeGeometries([gable.toNonIndexed(), ...roofs.map(r => r.toNonIndexed())]) }
}

// ---------- 冷箱和精馏塔 ----------
/** 冷箱：外壳的半宽、底和顶 */
export const BOX = { half: 10.4, y0: 3, y1: 55 }
/** 剖面上露出来的保温层（珠光砂）：一整片，中间按塔的轮廓挖空 */
function perliteGeo() {
  const { r, low, up } = TOWER, s = new THREE.Shape()
  s.moveTo(-BOX.half + 0.4, BOX.y0 + 0.4); s.lineTo(BOX.half - 0.4, BOX.y0 + 0.4); s.lineTo(BOX.half - 0.4, BOX.y1 - 0.4); s.lineTo(-BOX.half + 0.4, BOX.y1 - 0.4); s.closePath()
  const h = new THREE.Path(), R = r + 0.02, cap = 2.2
  h.moveTo(-R, low[0]); h.lineTo(-R, up[1]); h.absellipse(0, up[1], R, cap, Math.PI, 0, true); h.lineTo(R, low[0]); h.absellipse(0, low[0], R, cap, 0, Math.PI, true); h.closePath()
  s.holes.push(h)
  return new THREE.ShapeGeometry(s, 40)
}
/** 半边的塔壁（留下靠后的一半）：外壁、内壁、剖口的两道边、上下封头 */
function towerGeo() {
  const { r, low, up } = TOWER, wall = 0.28, y0 = low[0], y1 = up[1], H = y1 - y0
  const cyl = (rad: number) => { const g = new THREE.CylinderGeometry(rad, rad, H, 56, 1, true, Math.PI / 2, Math.PI); g.translate(0, y0 + H / 2, 0); return g.toNonIndexed() }
  const cap = (top: boolean) => { const g = new THREE.SphereGeometry(r, 56, 16, Math.PI, Math.PI, top ? 0 : Math.PI / 2, Math.PI / 2); g.scale(1, 2.2 / r, 1); g.translate(0, top ? y1 : y0, 0); return g.toNonIndexed() }
  const edge = (s: number) => new THREE.BoxGeometry(wall, H, 0.3).translate(s * (r - wall / 2), y0 + H / 2, 0).toNonIndexed()
  return mergeGeometries([cyl(r), cyl(r - wall), cap(true), cap(false), edge(-1), edge(1)].map(g => { g.deleteAttribute('uv'); return g }))
}
/** 塔里的筛板：一层层半圆的薄板，下段四层、上段六层；中间一块厚隔板把上下两段分开 */
export const TRAYS = { low: [15, 20], up: [33, 38, 43, 47] }
function trayGeo() {
  const { r, low, up } = TOWER, R = r - 0.3
  const half = (y: number, t: number) => { const g = new THREE.CylinderGeometry(R, R, t, 48, 1, false, Math.PI / 2, Math.PI); g.translate(0, y, 0); return g.toNonIndexed() }
  // 每层塔板朝镜头的一面补一条剖口，旁边一段降液管
  return { trays: mergeGeometries([...TRAYS.low, ...TRAYS.up].flatMap(y => [half(y, 0.4), new THREE.BoxGeometry(R * 2, 0.4, 0.06).translate(0, y, 0.02).toNonIndexed(), new THREE.BoxGeometry(0.4, 2.6, 0.3).translate(((y / 5) % 2 < 1 ? 1 : -1) * (R - 1.2), y - 1.3, -0.2).toNonIndexed()])), deck: mergeGeometries([half((low[1] + up[0]) / 2, up[0] - low[1])]) }
}
function towerParts() {
  const P: Part[] = [], b = BOX.half
  // 混凝土基础、冷箱的钢骨架（四角立柱、几道腰梁）
  P.push({ p: [0, 1.5, -b / 2], s: [b * 2 + 3, 3, b + 3], c: '#9a9b97' })
  for (const s of [-1, 1]) { P.push({ p: [s * b, (BOX.y0 + BOX.y1) / 2, -b], s: [0.7, BOX.y1 - BOX.y0, 0.7], c: '#dfe3e6' }); P.push({ p: [s * b, (BOX.y0 + BOX.y1) / 2, 0], s: [0.7, BOX.y1 - BOX.y0, 0.7], c: '#dfe3e6' }) }
  for (let y = BOX.y0; y <= BOX.y1; y += 12) for (const s of [-1, 1]) P.push({ p: [s * b, y, -b / 2], s: [0.5, 0.5, b], c: '#cfd4d8' })
  for (const y of [BOX.y0, BOX.y1]) P.push({ p: [0, y, 0.05], s: [b * 2, 0.7, 0.6], c: '#dfe3e6' })
  // 塔的裙座
  P.push({ p: [0, 5, -1.6], s: [8, 4, 3.2], c: '#8d9399' })
  // 顶上的平台和栏杆，左侧一架带护笼的直梯
  P.push({ p: [0, BOX.y1 + 0.5, -b / 2], s: [b * 2 + 2, 0.3, b + 2], c: '#70777c' })
  for (let x = -b - 1; x <= b + 1; x += 2.25) P.push({ p: [x, BOX.y1 + 2.4, 1], s: [0.07, 3.6, 0.07], c: '#e0b21d', cyl: true })
  for (const y of [BOX.y1 + 2.4, BOX.y1 + 4.2]) P.push({ p: [0, y, 1], s: [0.07, b * 2 + 2, 0.07], r: [0, 0, Math.PI / 2], c: '#e0b21d', cyl: true })
  for (const z of [-1.2, -2.4]) P.push({ p: [-b - 0.8, (BOX.y0 + BOX.y1) / 2 + 2, z], s: [0.09, BOX.y1 - BOX.y0 + 4, 0.09], c: '#d9dcdd', cyl: true })
  for (let y = BOX.y0 + 1; y < BOX.y1 + 3; y += 1.2) P.push({ p: [-b - 0.8, y, -1.8], s: [0.05, 1.2, 0.05], r: [Math.PI / 2, 0, 0], c: '#d9dcdd', cyl: true })
  // 塔顶出氮气的管：穿出冷箱往右，沿冷箱外壁下到氮气罐顶；塔底出氧的管：往右到氧气罐
  const top = TOWER.up[1] + 3.6, tankTop = REC_Y + REC_H
  P.push({ p: [0, top - 0.9, -0.5], s: [0.45, 2.6, 0.45], c: '#d8c23a', cyl: true }, { p: [REC[0] / 2, top, -0.5], s: [0.45, REC[0] + 0.9, 0.45], r: [0, 0, Math.PI / 2], c: '#d8c23a', cyl: true }, { p: [REC[0], (top + tankTop) / 2, -0.5 + (REC_Z + 0.5) / 2], s: [0.45, top - tankTop, 0.45], c: '#d8c23a', cyl: true })
  P.push({ p: [3, 5.5, 0.3], s: [0.45, 3.2, 0.45], c: '#3f7fb8', cyl: true }, { p: [(3 + REC[1]) / 2, 4.1, 0.3], s: [0.45, REC[1] - 3 + 0.9, 0.45], r: [0, 0, Math.PI / 2], c: '#3f7fb8', cyl: true }, { p: [REC[1], 4.6, 0.3], s: [0.45, 1.2, 0.45], c: '#3f7fb8', cyl: true })
  // 两只产品罐的支腿和围堰
  for (const tx of REC) { for (let i = 0; i < 4; i++) P.push({ p: [tx + Math.cos(i * 1.571 + 0.785) * 2.3, 2.6, REC_Z + Math.sin(i * 1.571 + 0.785) * 2.3], s: [0.28, 5.2, 0.28], c: '#7d858b', cyl: true }) }
  P.push({ p: [(REC[0] + REC[1]) / 2, 0.3, REC_Z], s: [18, 0.6, 9], c: '#a3a49f' })
  return P
}
/** 两只产品罐（氮、氧）在塔右边的位置（相对塔心 x），以及它们的 z、罐底、罐高、半径 */
export const REC = [19.5, 29], REC_Z = 0.5, REC_Y = 5, REC_H = 13, REC_R = 3.1
const recProfile: RY[] = [[0, 0], [1.8, 0.25], [2.8, 1], [REC_R, 2], [REC_R, REC_H - 2], [2.8, REC_H - 1], [1.8, REC_H - 0.25], [0, REC_H]]

// ---------- 储罐区、灌装台、槽车 ----------
const TANKS = [{ x: 150, name: '液氧', f: 'O₂' }, { x: 172, name: '液氮', f: 'N₂' }], TZ = -26, TR = 6.6, TH = 34
const tankProfile: RY[] = [[0, 0], [4, 0.5], [6, 1.8], [TR, 4], [TR, TH - 4], [6, TH - 1.8], [4, TH - 0.5], [0, TH]]
function yardParts() {
  const P: Part[] = [], r = rng(31)
  for (const t of TANKS) {
    for (let i = 0; i < 6; i++) P.push({ p: [t.x + Math.cos(i * 1.047) * 5.4, 2.5, TZ + Math.sin(i * 1.047) * 5.4], s: [0.45, 5, 0.45], c: '#7d858b', cyl: true })
    P.push({ p: [t.x, 0.35, TZ], s: [16, 0.7, 16], c: '#a3a49f' })
    // 罐前的一组空温式气化器：一排排带翅片的铝管
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) P.push({ p: [t.x - 3.2 + i * 1.6, 5.5, TZ + 12 + j * 1.6], s: [0.9, 9, 0.9], c: '#c8ccd0' }, { p: [t.x - 3.2 + i * 1.6, 5.5, TZ + 12 + j * 1.6], s: [0.16, 9.6, 0.16], c: '#9aa0a4', cyl: true })
    P.push({ p: [t.x, 0.6, TZ + 13.6], s: [9, 0.5, 5.4], c: '#8d9092' }, { p: [t.x, 10.3, TZ + 13.6], s: [8.4, 0.25, 5], c: '#8d9399' })
    // 罐侧的直梯
    for (const dz of [-0.5, 0.5]) P.push({ p: [t.x + TR + 0.6, 19, TZ + dz], s: [0.08, 32, 0.08], c: '#d9dcdd', cyl: true })
  }
  // 灌装台：一条矮的混凝土平台，后沿一排充装架（横管、立柱），台上一排气瓶在别处画
  const fx = ST.fill
  P.push({ p: [fx, 0.5, 2], s: [34, 1, 9], c: '#a9aaa5' }, { p: [fx, 1.02, 6.45], s: [34, 0.04, 0.3], c: '#e0b21d' })
  for (let x = fx - 15; x <= fx + 15; x += 7.5) P.push({ p: [x, 5.5, -1.6], s: [0.3, 9, 0.3], c: '#6f767b' })
  P.push({ p: [fx, 9.6, -1.6], s: [0.22, 30, 0.22], r: [0, 0, Math.PI / 2], c: '#3f7fb8', cyl: true }, { p: [fx, 10.2, -1.6], s: [30.6, 0.3, 0.5], c: '#6f767b' })
  // 厂界：东头的铁栅栏（立柱、两道横杆、一排竖杆）
  for (let z = -150; z <= 16; z += 8) P.push({ p: [272, 3.4, z], s: [0.5, 6.8, 0.5], c: '#70777c' })
  for (const y of [1, 6]) P.push({ p: [272, y, -67], s: [0.18, 0.18, 166], c: '#70777c' })
  for (let z = -150; z < 16; z += 1) P.push({ p: [272, 3.5, z + r() * 0.02], s: [0.1, 5.6, 0.1], c: '#8a9197' })
  return P
}
/** 灌装台上的一排气瓶：瓶身、瓶肩、瓶帽 */
function cylinderGeo() {
  const prof: RY[] = [[0, 0.12], [0.5, 0], [0.66, 0.08], [0.66, 6.6], [0.56, 7.3], [0.3, 7.75], [0.24, 7.8], [0.24, 8.0]]
  const cap: RY[] = [[0.3, 7.7], [0.34, 7.7], [0.34, 8.6], [0.22, 8.9], [0, 8.95]]
  const gs: THREE.BufferGeometry[] = [], fx = ST.fill
  for (let i = 0; i < 14; i++) {
    if (i === 6 || i === 7) continue
    const x = fx - 13.6 + i * 2.1, z = -0.2
    gs.push(paint(lathe(prof, { segs: 24 }).translate(x, 1, z), '#7fb0d8'), paint(lathe(cap, { segs: 16 }).translate(x, 1, z), '#3a3f44'))
  }
  return flat(gs)
}
/** 槽车：驾驶室、大梁、三根轴的轮子、一只卧式的低温罐 */
function truckGeo() {
  const P: Part[] = [
    { p: [-9.6, 4.6, 0], s: [4.6, 5.6, 5.4], c: '#f1f1ec' }, { p: [-11.6, 5.6, 0], s: [0.7, 2.2, 4.8], c: '#2c3a44' }, { p: [-9.4, 5.9, 2.72], s: [2.4, 1.9, 0.06], c: '#2c3a44' }, { p: [-9.4, 5.9, -2.72], s: [2.4, 1.9, 0.06], c: '#2c3a44' },
    { p: [-12, 2.3, 0], s: [0.5, 1.4, 5.4], c: '#3b4045' }, { p: [1, 2.3, 0], s: [22, 0.7, 2.6], c: '#3b4045' }, { p: [10.8, 3, 0], s: [0.5, 2, 4.6], c: '#c9cdd0' },
    ...[-9.4, 5.2, 8.2].flatMap(x => [-1, 1].map(s => ({ p: [x, 1.25, s * 2.2], s: [1.25, 1.1, 1.25], r: [Math.PI / 2, 0, 0], c: '#1d1f21', cyl: true }) as Part)),
    ...[-9.4, 5.2, 8.2].flatMap(x => [-1, 1].map(s => ({ p: [x, 1.25, s * 2.78], s: [0.6, 0.1, 0.6], r: [Math.PI / 2, 0, 0], c: '#b9bdc0', cyl: true }) as Part)),
    ...[-3, 3, 9].map(x => ({ p: [x, 3.2, 0], s: [1.2, 1.4, 4.4], c: '#55595d' }) as Part),
  ]
  const tank = lathe([[0, 0], [1.6, 0.25], [2.5, 0.9], [2.75, 1.8], [2.75, 15.2], [2.5, 16.1], [1.6, 16.75], [0, 17]], { segs: 40 }); tank.rotateZ(-Math.PI / 2); tank.translate(-6.4, 5.5, 0)
  return flat([mergeParts(P), paint(tank, '#f4f5f3')])
}

// ---------- 远景 ----------
/** 远处的输电塔和山：塔是四条斜腿、几道横担；山是几座压扁的圆丘 */
function distantGeo() {
  const P: Part[] = []
  for (const x of [-260, -90, 80, 250, 420]) {
    for (const s of [-1, 1]) for (const t of [-1, 1]) P.push({ p: [x + s * 2.6, 22, -250 + t * 2.6], s: [0.4, 45, 0.4], r: [t * 0.1, 0, -s * 0.1], c: '#8d959b' })
    for (const y of [30, 37, 43]) P.push({ p: [x, y, -250], s: [0.5, 0.5, 22 - (y - 30) * 0.5], c: '#8d959b' })
    for (let y = 6; y < 42; y += 7) P.push({ p: [x, y, -250], s: [7 - y * 0.12, 0.25, 7 - y * 0.12], c: '#99a1a7' })
  }
  // 电线：每一档用几段折线近似下垂
  for (const z of [-260, -240]) for (let x = -260; x < 420; x += 170) for (let k = 0; k < 6; k++) { const a = (k + 0.5) / 6, sag = 4 * (1 - (2 * a - 1) ** 2); P.push({ p: [x + a * 170, 37 - sag * 2, z], s: [28.6, 0.12, 0.12], r: [0, 0, -(1 - 2 * a) * 0.18], c: '#555b60' }) }
  const hills = [[-420, 190, 60], [-120, 260, 85], [200, 220, 70], [520, 280, 95]].map(([x, w, h]) => { const g = new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(w, h, 110); g.translate(x, -2, -720); return paint(g, '#5d7566') })
  return flat([mergeParts(P), ...hills])
}

export function Plant() {
  const geo = useMemo(() => {
    const shell = compressorShell(), tray = trayGeo()
    const b = BOX.half, H = BOX.y1 - BOX.y0, yc = (BOX.y0 + BOX.y1) / 2
    return {
      gate: mergeParts(gateParts()), comp: mergeParts(compressorParts()), walls: shell.walls, roof: shell.roof,
      tower: mergeParts(towerParts()), perlite: perliteGeo(), column: towerGeo(), trays: tray.trays, deck: tray.deck,
      box: mergeGeometries([slab(-b, b, BOX.y0, BOX.y1, -b - 0.3, -b, 4), slab(-b - 0.3, -b, BOX.y0, BOX.y1, -b, 0, 4), slab(b, b + 0.3, BOX.y0, BOX.y1, -b, 0, 4), slab(-b - 0.3, b + 0.3, BOX.y1, BOX.y1 + 0.3, -b - 0.3, 0, 4)]),
      rim: mergeParts([[-1, 0], [1, 0]].map(([s]) => ({ p: [s * (b - 0.1), yc, 0.02], s: [0.5, H, 0.08], c: '#dfe3e6' }) as Part)),
      rec: lathe(recProfile, { segs: 40 }), yard: mergeParts(yardParts()), tank: lathe(tankProfile, { segs: 56 }), cyl: cylinderGeo(), truck: truckGeo(), distant: distantGeo(),
      canopy: new THREE.BoxGeometry(CAN.w + 2, 0.18, CAN.d + 2),
    }
  }, [])
  const tex = useMemo(() => {
    const wall = ribTex([203, 211, 216]).clone(); wall.needsUpdate = true
    const roof = ribTex([86, 118, 150]).clone(); roof.repeat.set(1, 1); roof.needsUpdate = true
    const box = ribTex([226, 230, 232]).clone(); box.needsUpdate = true
    const perlite = makeGround('#ebe6d8', '205,198,180', '252,250,244', 5); perlite.repeat.set(1 / 9, 1 / 9)
    return {
      wall, roof, box, perlite,
      gate: makeSign(['空气分离厂'], '#2f5f8f', '#ffffff', 768, 96), comp: makeSign(['空压机房'], '#f1f1ec', '#2a3a48', 512, 128),
      board: makeSign(['空气质量公示', '监测项目：颗粒物、二氧化硫、二氧化氮、一氧化碳、臭氧'], '#1f6f7a', '#ffffff', 768, 300), fill: makeSign(['氧气灌装台'], '#f1f1ec', '#2a3a48', 512, 96),
      tanks: TANKS.map(t => tankLabel(t.name, t.f)), recs: [tankLabel('氮气', 'N₂'), tankLabel('氧气', 'O₂')], cold: makeSign(['冷箱 · 精馏塔'], '#2f5f8f', '#ffffff', 640, 96),
    }
  }, [])
  const TX = TOWER.x, TZ0 = TOWER.z
  return <group>
    {/* 厂门、遮阳棚、质检站的钢台 */}
    <mesh geometry={geo.gate} castShadow receiveShadow><Painted rough={0.55} metal={0.25} /></mesh>
    <mesh geometry={geo.canopy} position={[KIOSK.x, CAN.h + 0.55, KIOSK.z]} rotation-x={0.03} castShadow receiveShadow><meshStandardMaterial map={tex.roof} roughness={0.5} metalness={0.4} /></mesh>
    <mesh position={[KIOSK.x, TOP - 0.1, KIOSK.z]} castShadow receiveShadow><boxGeometry args={[7.2, 0.2, 4.4]} /><meshStandardMaterial color="#7f898e" roughness={0.6} /></mesh>
    <mesh position={[-190, 11.6, 12.52]}><planeGeometry args={[16, 1.8]} /><meshStandardMaterial map={tex.gate} roughness={0.6} /></mesh>
    <mesh position={[KIOSK.x - 9.5, 6.4, KIOSK.z - 3.38]}><planeGeometry args={[6.4, 3.6]} /><meshStandardMaterial map={tex.board} roughness={0.7} /></mesh>
    <mesh position={[KIOSK.x - 9.5, 6.4, KIOSK.z - 3.45]} castShadow><boxGeometry args={[6.7, 3.9, 0.12]} /><meshStandardMaterial color="#59626a" roughness={0.6} /></mesh>
    <Sampler position={[KIOSK.x - 14, 0, KIOSK.z + 5]} />
    <Sampler position={[ST.pole, 0, 6]} />
    {/* 空压机房 */}
    <mesh geometry={geo.comp} castShadow receiveShadow><Painted rough={0.6} metal={0.2} /></mesh>
    <mesh geometry={geo.walls} castShadow receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.55} metalness={0.3} /></mesh>
    <mesh geometry={geo.roof} castShadow><meshStandardMaterial color="#56769a" roughness={0.5} metalness={0.4} /></mesh>
    <mesh position={[(CH.x0 + CH.x1) / 2 + 6, 13.4, CH.z1 + 0.34]}><planeGeometry args={[9, 2.2]} /><meshStandardMaterial map={tex.comp} roughness={0.6} /></mesh>
    {/* 冷箱和精馏塔：前半边剖掉，露出保温层和塔的内部 */}
    <group position={[TX, 0, TZ0]}>
      <mesh geometry={geo.tower} castShadow receiveShadow><Painted rough={0.5} metal={0.3} /></mesh>
      <mesh geometry={geo.box} castShadow receiveShadow><meshStandardMaterial map={tex.box} roughness={0.42} metalness={0.5} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.perlite} position-z={-0.02} receiveShadow><meshStandardMaterial map={tex.perlite} roughness={1} /></mesh>
      <mesh geometry={geo.rim}><Painted rough={0.5} metal={0.3} /></mesh>
      <mesh geometry={geo.column} castShadow><meshStandardMaterial color="#74838e" roughness={0.75} metalness={0.15} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.trays}><meshStandardMaterial color="#e9eef1" roughness={0.6} metalness={0.1} /></mesh>
      <mesh geometry={geo.deck}><meshStandardMaterial color="#dfe5e9" roughness={0.6} metalness={0.1} /></mesh>
      <mesh position={[0, BOX.y1 + 6.2, 1.06]}><planeGeometry args={[13, 1.9]} /><meshStandardMaterial map={tex.cold} roughness={0.6} /></mesh>
      {REC.map((x, i) => <group key={x} position={[x, REC_Y, REC_Z]}>
        <mesh geometry={geo.rec} castShadow receiveShadow><meshPhysicalMaterial color="#f1f2f0" roughness={0.35} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
        <mesh position={[0, REC_H * 0.78, 0]} rotation-y={-Math.PI / 2 + 0.52}><cylinderGeometry args={[REC_R + 0.02, REC_R + 0.02, 2.4, 32, 1, true, 0, 1.04]} /><meshStandardMaterial map={tex.recs[i]} roughness={0.6} /></mesh>
      </group>)}
    </group>
    {/* 储罐区、灌装台、槽车 */}
    <mesh geometry={geo.yard} castShadow receiveShadow><Painted rough={0.55} metal={0.3} /></mesh>
    {TANKS.map((t, i) => <group key={t.x} position={[t.x, 5, TZ]}>
      <mesh geometry={geo.tank} castShadow receiveShadow><meshPhysicalMaterial color="#f3f4f2" roughness={0.32} clearcoat={0.6} clearcoatRoughness={0.3} /></mesh>
      <mesh position={[0, TH * 0.62, 0]} rotation-y={-Math.PI / 2 + 0.45}><cylinderGeometry args={[TR + 0.03, TR + 0.03, 5.4, 40, 1, true, 0, 0.9]} /><meshStandardMaterial map={tex.tanks[i]} roughness={0.6} /></mesh>
    </group>)}
    <mesh geometry={geo.cyl} castShadow receiveShadow><Painted rough={0.38} metal={0.35} /></mesh>
    <mesh position={[ST.fill, 11.2, -1.3]}><planeGeometry args={[10, 1.7]} /><meshStandardMaterial map={tex.fill} roughness={0.6} /></mesh>
    <mesh geometry={geo.truck} position={[204, 0, 8]} rotation-y={0.12} castShadow receiveShadow><Painted rough={0.4} metal={0.3} /></mesh>
    <mesh geometry={geo.distant}><Painted rough={0.9} metal={0.05} /></mesh>
  </group>
}
