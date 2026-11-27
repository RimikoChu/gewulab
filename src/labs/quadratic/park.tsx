// 滨水公园里固定不动的大件：江和石砌驳岸、沿江步道和栏杆、树和路灯、对岸的城市、
// 喷泉池、沿江的音乐喷泉水槽、篮球场和篮架、江心高喷平台、游船码头、抛物线拱桥。
// 静止的小件合成一个带顶点颜色的模型，省绘制次数。各课自己的器材在 sceneN.tsx。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, lathe, shell } from '@/lab-kit'
import { archA, ARCH, heightAt, HOOP } from './physics'
import { Tree } from './trees'
import { HighJet, WaterSurface } from './water'
import { canvas, makeAshlar, makeBrick, makeCourt, makeLawn, makeSign, rep, rng, tex } from './mats'

export type V3 = [number, number, number]
/** 江：沿 x 方向，南岸驳岸在 z = −14，北岸在 z = −34；常水位 y = −1.2，江底 −4.2 */
export const RIVER = { south: -14, north: -34, level: -1.2, bed: -4.2, x0: -150, x1: 190 }
export const RIVER_Z = (RIVER.south + RIVER.north) / 2
/** 各处的位置 */
export const P = {
  bed1: [-86, 0, 12] as V3,       // 第 1 课：圆形花坛的中心
  bed7: [-64, 0, 10] as V3,       // 第 7 课：靠墙花圃，墙的中点
  basin: [-36, 0, 6] as V3,       // 第 2 课：喷泉池中心
  trough: [-8, 0, -11.2] as V3,   // 第 3 课：音乐喷泉水槽的中心
  shot: [20.4, 0, 8] as V3,       // 第 4 课：出手点正下方的地面
  high: [46, 0, RIVER_Z] as V3,   // 第 5 课：江心高喷（y 取水面）
  dock: [68, 0, -14] as V3,       // 拓展：码头
  bridge: [94, 0, RIVER_Z] as V3, // 第 6 课：拱桥正中
}
export const BASIN = { r: 7, water: 0.45 }        // 喷泉池半径、池水面高
export const TROUGH = { len: 30, w: 2.6, water: 0.32 }
export const BRIDGE = { top: RIVER.level + ARCH.rise, w: 6 }   // 拱顶（桥拱内侧最高点）的高度、桥宽
/** 桥面（局部，原点在拱顶，x 沿桥）：两头落在岸上 */
export const deckY = (x: number) => 1.3 - 0.041 * x * x

// ---------- 合成静止小件的工具 ----------
const col = new THREE.Color()
function paint(g: THREE.BufferGeometry, c: string, out: THREE.BufferGeometry[]) {
  const ng = g.index ? g.toNonIndexed() : g
  col.set(c); const n = ng.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b }
  ng.setAttribute('color', new THREE.BufferAttribute(a, 3)); ng.deleteAttribute('uv'); out.push(ng)
}
const box = (w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g }
const cyl = (r0: number, r1: number, h: number, x: number, y: number, z: number, s = 10) => { const g = new THREE.CylinderGeometry(r0, r1, h, s); g.translate(x, y, z); return g }
const merged = (gs: THREE.BufferGeometry[]) => { const m = mergeGeometries(gs); m.computeBoundingSphere(); return m }


/** 对岸城市的窗格贴图：一格一层楼 */
function makeWindows() {
  const { c, g } = canvas(256), r = rng(51)
  g.fillStyle = '#8d969c'; g.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = r(); g.fillStyle = v < 0.08 ? '#e6d9a8' : v < 0.5 ? '#4d5f6c' : '#5d707c'; g.fillRect(x * 32 + 4, y * 32 + 6, 24, 20) }
  return tex(c, true)
}
/** 对岸的楼：每栋一个盒子，贴图按楼的尺寸重复（一层 3.2 m、一格 4 m 宽） */
function makeCity() {
  const r = rng(91), gs: THREE.BufferGeometry[] = []
  /** 一个盒子：win 为真时四面贴窗格（按尺寸重复），否则整块取贴图里墙面的颜色 */
  const blk = (w: number, h: number, d: number, x: number, y: number, z: number, tint: string, win = true, cylinder = false) => {
    const g = cylinder ? new THREE.CylinderGeometry(w / 2, w / 2, h, 14) : new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv as THREE.BufferAttribute, nrm = g.attributes.normal as THREE.BufferAttribute
    for (let k = 0; k < uv.count; k++) {
      const sideX = Math.abs(nrm.getX(k)) > 0.5, top = Math.abs(nrm.getY(k)) > 0.5
      if (!win || top || cylinder) uv.setXY(k, 0.01, 0.01); else uv.setXY(k, uv.getX(k) * (sideX ? d : w) / 32, uv.getY(k) * h / 25.6)
    }
    g.translate(x, y + h / 2, z); col.set(tint)
    const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let k = 0; k < n; k++) { c[k * 3] = col.r; c[k * 3 + 1] = col.g; c[k * 3 + 2] = col.b }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); gs.push(g.index ? g.toNonIndexed() : g)
  }
  const GLASS = ['#9fb3c2', '#8ea6b8', '#b3c3cc'], HOME = ['#e3d6c0', '#d9cdb8', '#efe5d4', '#cfc6b5'], BRICK = ['#b98a6e', '#c49a7c']
  for (let i = 0; i < 40; i++) {
    const kind = r(), x = -175 + i * 9.4 + r() * 5, z = -125 - r() * 70
    if (kind < 0.3) {
      // 写字楼：玻璃幕墙，上面收进去一截，顶上一根天线
      const w = 16 + r() * 10, d = 14 + r() * 8, h = 50 + r() * 60, t = GLASS[i % 3]
      blk(w, h, d, x, -0.5, z, t); blk(w * 0.7, h * 0.12, d * 0.7, x, h - 0.5, z, t)
      blk(0.5, 8 + r() * 6, 0.5, x, h * 1.12 - 0.5, z, '#5d6266', false)
    } else if (kind < 0.8) {
      // 住宅楼：一层一道阳台板，顶上楼梯间、水箱、空调外机
      const w = 18 + r() * 14, d = 12 + r() * 4, h = 30 + r() * 45, t = HOME[i % 4]
      blk(w, h, d, x, -0.5, z, t)
      for (let y = 3.2; y < h - 2; y += 3.2) blk(w * 0.82, 0.22, 1.3, x, y - 0.5, z + d / 2 + 0.6, '#f1ece3', false)
      blk(4, 3.2, 4, x - w * 0.25, h - 0.5, z, t, false); blk(2.6, 2.2, 2.6, x + w * 0.22, h - 0.5, z, '#9aa3a8', false, true)
      for (let k = 0; k < 3; k++) blk(1.4, 0.9, 1, x + (r() - 0.5) * w * 0.6, h - 0.5, z + (r() - 0.5) * d * 0.5, '#c9ccce', false)
    } else {
      // 低一些的砖楼：坡屋顶的大屋檐用一块扁盒子代替
      const w = 20 + r() * 12, d = 14 + r() * 6, h = 14 + r() * 14, t = BRICK[i % 2]
      blk(w, h, d, x, -0.5, z, t); blk(w + 1.2, 0.6, d + 1.2, x, h - 0.5, z, '#6f6a64', false)
    }
  }
  return merged(gs)
}

/** 公园里的树、路灯、长椅、步道栏杆、篮球场的围网立柱 */
/** 树的位置和高度：花园那一段沿江一排，公园里散种，对岸一排 */
export const TREES: [number, number, number][] = (() => {
  const r = rng(7), out: [number, number, number][] = []
  const keep = (x: number, z: number) => {
    const near = (p: V3, rr: number) => Math.hypot(x - p[0], z - p[2]) < rr
    return !(near(P.bed1, 12) || near([P.bed7[0], 0, P.bed7[2] + 4], 12) || near(P.basin, 13) || (x > -6 && x < 32 && z > -2 && z < 18) || (x > 26 && x < 72 && z < 40) || (z < -6 && z > -40))
  }
  for (let x = RIVER.x0 + 4; x < -48; x += 11) out.push([x + r() * 2, -4.5 + r(), 7 + r() * 2.5])
  for (let i = 0; i < 70; i++) { const x = -130 + r() * 300, z = 16 + r() * 48, h = 6 + r() * 5; if (keep(x, z)) out.push([x, z, h]) }
  for (let i = 0; i < 40; i++) { const x = RIVER.x0 + r() * (RIVER.x1 - RIVER.x0), z = -42 - r() * 24; if (!(x > 86 && x < 102 && z > -48)) out.push([x, z, 7 + r() * 5]) }
  return out
})()

function makeProps() {
  const r = rng(7), out: THREE.BufferGeometry[] = []
  // 沿江栏杆：不锈钢立柱、两道扶手；桥头留口
  const rail = (x0: number, x1: number, z: number) => {
    for (let x = x0; x <= x1; x += 2) paint(cyl(0.035, 0.035, 1.1, x, 0.55, z, 8), '#c5c9cc', out)
    for (const y of [0.55, 1.08]) { const g = new THREE.CylinderGeometry(0.03, 0.03, x1 - x0, 8); g.rotateZ(Math.PI / 2); g.translate((x0 + x1) / 2, y, z); paint(g, '#d4d8db', out) }
  }
  rail(RIVER.x0, P.trough[0] - 16, RIVER.south + 0.3); rail(P.trough[0] + 16, P.bridge[0] - 4.2, RIVER.south + 0.3); rail(P.bridge[0] + 4.2, RIVER.x1, RIVER.south + 0.3)
  rail(RIVER.x0, P.bridge[0] - 4.2, RIVER.north - 0.3); rail(P.bridge[0] + 4.2, RIVER.x1, RIVER.north - 0.3)
  // 路灯：步道上每 18 m 一盏
  for (let x = RIVER.x0 + 9; x < RIVER.x1; x += 18) {
    if (Math.abs(x - P.trough[0]) < 16 || Math.abs(x - P.bridge[0]) < 6) continue
    paint(cyl(0.06, 0.09, 4.2, x, 2.1, -6.6, 10), '#2f3438', out); paint(box(0.7, 0.06, 0.12, x + 0.3, 4.15, -6.6), '#2f3438', out)
    paint(cyl(0.16, 0.2, 0.22, x + 0.6, 4.05, -6.6, 12), '#e9e4d4', out); paint(cyl(0.22, 0.26, 0.3, x, 0.15, -6.6, 12), '#6a6e70', out)
  }
  // 长椅：木条坐面、铸铁腿
  for (const [x, z, ry] of [[-50, -7.6, 0], [-22, -7.6, 0], [8, -7.6, 0], [36, -7.6, 0], [60, -7.6, 0], [-36, 15.5, 0], [-46, 2, Math.PI / 2]] as V3[]) {
    for (let k = 0; k < 4; k++) paint(box(1.8, 0.04, 0.09, 0, 0.45, -0.18 + k * 0.12, 0).applyMatrix4(new THREE.Matrix4().makeRotationY(ry)).translate(x, 0, z), '#9a6b43', out)
    for (const s of [-0.75, 0.75]) paint(box(0.06, 0.45, 0.5, s, 0.225, 0, 0).applyMatrix4(new THREE.Matrix4().makeRotationY(ry)).translate(x, 0, z), '#2b2e31', out)
  }
  // 篮球场的围网立柱和顶梁
  const cx0 = -2, cx1 = 32, cz0 = -0.5, cz1 = 17
  for (let x = cx0; x <= cx1; x += 3.4) for (const z of [cz0]) paint(cyl(0.05, 0.05, 3.6, x, 1.8, z, 8), '#3f6b4f', out)
  for (let z = cz0; z <= cz1; z += 3.5) paint(cyl(0.05, 0.05, 3.6, cx1, 1.8, z, 8), '#3f6b4f', out)
  return merged(out)
}

/** 围网：铁丝网贴图（透明） */
function makeMesh() {
  const { c, g } = canvas(64)
  g.strokeStyle = 'rgba(70,110,85,0.9)'; g.lineWidth = 2.2
  g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke()
  return tex(c, true)
}

// ---------- 喷泉池 ----------
function Basin() {
  const { r, water } = BASIN
  const rim = useMemo(() => lathe([[r - 0.42, 0], [r - 0.42, 0.62], [r - 0.48, 0.66], [r - 0.48, 0.72], [r + 0.42, 0.72], [r + 0.42, 0.66], [r + 0.36, 0.62], [r + 0.36, 0], [r - 0.42, 0]], { segs: 96, closed: true }), [r])
  const stone = useMemo(() => rep(makeAshlar([196, 190, 180], 5), 14, 1), [])
  const tile = useMemo(() => rep(makeCourt('#2f6f80', 9), 8, 8), [])
  return (
    <group position={P.basin}>
      <mesh geometry={rim} castShadow receiveShadow><meshStandardMaterial map={stone} roughness={0.7} /></mesh>
      <mesh position-y={0.04} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[r - 0.4, 64]} /><meshStandardMaterial map={tile} roughness={0.5} /></mesh>
      {/* 池底一圈不锈钢喷头盘 */}
      <mesh position-y={0.06} rotation-x={-Math.PI / 2}><ringGeometry args={[0.9, 1.05, 48]} /><Metal kind="stainless" grain="brushed" /></mesh>
      <group position-y={water}><WaterSurface w={(r - 0.42) * 2} d={(r - 0.42) * 2} circle={r - 0.42} color="#4b98a6" opacity={0.78} /></group>
    </group>
  )
}

// ---------- 沿江的音乐喷泉水槽 ----------
function Trough() {
  const { len, w, water } = TROUGH
  const stone = useMemo(() => rep(makeAshlar([190, 184, 174], 9), 12, 0.5), [])
  return (
    <group position={P.trough}>
      {[[0, -w / 2 - 0.2, len + 0.8, 0.4], [0, w / 2 + 0.2, len + 0.8, 0.4], [-len / 2 - 0.2, 0, 0.4, w], [len / 2 + 0.2, 0, 0.4, w]].map(([x, z, sx, sz], i) => (
        <RoundedBox key={i} args={[sx, 0.55, sz]} radius={0.04} smoothness={2} position={[x, 0.275, z]} castShadow receiveShadow><meshStandardMaterial map={stone} roughness={0.75} /></RoundedBox>
      ))}
      <mesh position-y={0.03} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[len, w]} /><meshStandardMaterial color="#25525c" roughness={0.6} /></mesh>
      {/* 池底的两条导轨：喷头小车在上面走 */}
      {[-0.35, 0.35].map(z => <mesh key={z} position={[0, 0.08, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, len - 0.4, 10]} /><Metal kind="stainless" grain="turned" /></mesh>)}
      <group position-y={water}><WaterSurface w={len} d={w} color="#4b98a6" opacity={0.75} /></group>
    </group>
  )
}

// ---------- 篮球场 ----------
/** 篮球场的地面线：边线、中线、罚球区、三分线（只画东半场一侧的篮架） */
function makeCourtLines() {
  const W = 2048, H = 1024, { c, g } = canvas(W, H), s = W / 28   // 28 m × 14 m（画布 2048 × 1024）
  g.fillStyle = '#2e6f58'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#b4553f'; g.fillRect(W - 5.8 * s, H / 2 - 2.45 * s, 5.8 * s, 4.9 * s); g.fillRect(0, H / 2 - 2.45 * s, 5.8 * s, 4.9 * s)
  g.strokeStyle = '#f3f2ec'; g.lineWidth = 0.05 * s
  g.strokeRect(0.05 * s, 0.05 * s, W - 0.1 * s, H - 0.1 * s)
  g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, 1.8 * s, 0, 7); g.stroke()
  for (const side of [0, 1]) {
    const bx = side ? W - 1.575 * s : 1.575 * s, dir = side ? -1 : 1
    g.strokeRect(side ? W - 5.8 * s : 0, H / 2 - 2.45 * s, 5.8 * s, 4.9 * s)
    g.beginPath(); g.arc(side ? W - 5.8 * s : 5.8 * s, H / 2, 1.8 * s, 0, 7); g.stroke()
    // 三分线：离篮圈中心 6.75 m 的弧，两头接到底线的直线（离边线 0.9 m）
    const dx = Math.sqrt(6.75 ** 2 - 6.6 ** 2) * dir, t0 = Math.atan2(-6.6, dx), t1 = Math.atan2(6.6, dx)
    g.beginPath(); g.moveTo(side ? W : 0, H / 2 - 6.6 * s); g.lineTo(bx + dx * s, H / 2 - 6.6 * s)
    g.arc(bx, H / 2, 6.75 * s, t0, t1, !!side); g.lineTo(side ? W : 0, H / 2 + 6.6 * s); g.stroke()
  }
  return tex(c)
}
/** 篮架：立柱、伸臂、钢化玻璃篮板、篮圈和篮网。rim 是篮圈中心的位置 */
function Hoop({ rim }: { rim: V3 }) {
  const net = useMemo(() => {
    const pts: number[] = [], N = 12, rows = 4
    for (let i = 0; i < N; i++) for (let k = 0; k < rows; k++) {
      const a0 = i / N * Math.PI * 2, a1 = (i + 0.5) / N * Math.PI * 2, r0 = 0.225 - k * 0.025, r1 = 0.225 - (k + 1) * 0.025, y0 = -k * 0.1, y1 = -(k + 1) * 0.1
      pts.push(Math.cos(a0) * r0, y0, Math.sin(a0) * r0, Math.cos(a1) * r1, y1, Math.sin(a1) * r1)
      const a2 = (i - 0.5) / N * Math.PI * 2; pts.push(Math.cos(a0) * r0, y0, Math.sin(a0) * r0, Math.cos(a2) * r1, y1, Math.sin(a2) * r1)
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g
  }, [])
  const board = useMemo(() => {
    const { c, g } = canvas(512, 300)
    g.clearRect(0, 0, 512, 300); g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 290)
    g.lineWidth = 9; g.strokeRect(172, 129, 168, 128)   // 篮圈上方 0.59 m × 0.45 m 的小框
    return tex(c)
  }, [])
  const bx = rim[0] + 0.375   // 篮板正面离篮圈中心 0.375 m
  return (
    <group>
      {/* 底座、立柱（包软垫）、伸臂 */}
      <RoundedBox args={[1.6, 0.36, 1.2]} radius={0.05} position={[bx + 1.75, 0.18, rim[2]]} castShadow receiveShadow><meshStandardMaterial color="#2a2e33" roughness={0.6} metalness={0.4} /></RoundedBox>
      <mesh position={[bx + 1.6, 1.9, rim[2]]} castShadow><boxGeometry args={[0.22, 3.4, 0.22]} /><meshStandardMaterial color="#1f4f8f" roughness={0.4} metalness={0.4} /></mesh>
      <mesh position={[bx + 1.6, 0.95, rim[2]]} castShadow><boxGeometry args={[0.34, 1.6, 0.34]} /><meshStandardMaterial color="#1a3c6d" roughness={0.85} /></mesh>
      <mesh position={[bx + 0.85, 3.45, rim[2]]} rotation-z={0.08} castShadow><boxGeometry args={[1.6, 0.14, 0.14]} /><meshStandardMaterial color="#1f4f8f" roughness={0.4} metalness={0.4} /></mesh>
      <mesh position={[bx + 0.85, 3.05, rim[2]]} rotation-z={-0.42} castShadow><boxGeometry args={[1.75, 0.1, 0.1]} /><meshStandardMaterial color="#1f4f8f" roughness={0.4} metalness={0.4} /></mesh>
      {/* 篮板：1.8 m × 1.05 m，下沿离地 2.90 m；玻璃有厚度，四周铝框 */}
      <group position={[bx + 0.03, 2.9 + 0.525, rim[2]]} rotation-y={Math.PI / 2}>
        <mesh renderOrder={2}><boxGeometry args={[1.8, 1.05, 0.03]} /><meshPhysicalMaterial color="#dfeef2" transparent opacity={0.28} roughness={0.04} clearcoat={1} envMapIntensity={1.6} depthWrite={false} /></mesh>
        <mesh position-z={-0.017} renderOrder={3}><planeGeometry args={[1.8, 1.05]} /><meshBasicMaterial map={board} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} color="#dddddd" /></mesh>
        {[[0, 0.535, 1.84, 0.04], [0, -0.535, 1.84, 0.04], [0.91, 0, 0.04, 1.1], [-0.91, 0, 0.04, 1.1]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0]}><boxGeometry args={[w, h, 0.05]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      </group>
      {/* 篮圈：内径 0.45 m 的钢圈，漆成橙红；连着篮板的托架 */}
      <mesh position={rim} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[0.235, 0.01, 10, 48]} /><meshStandardMaterial color="#e2541c" roughness={0.35} metalness={0.6} /></mesh>
      <mesh position={[rim[0] + 0.3, rim[1] - 0.04, rim[2]]} castShadow><boxGeometry args={[0.15, 0.1, 0.18]} /><meshStandardMaterial color="#e2541c" roughness={0.35} metalness={0.6} /></mesh>
      <lineSegments geometry={net} position={rim}><lineBasicMaterial color="#f4f4f0" transparent opacity={0.9} /></lineSegments>
    </group>
  )
}
function Court() {
  const lines = useMemo(makeCourtLines, [])
  const mesh = useMemo(() => rep(makeMesh(), 160, 18), [])
  const rim: V3 = [P.shot[0] + HOOP.x, HOOP.y, P.shot[2]]
  const cx = rim[0] + 0.375 + 1.2 - 14   // 篮板在底线内 1.2 m；场地 28 m
  return (
    <group>
      <mesh position={[cx, 0.02, P.shot[2]]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[28, 14]} /><meshStandardMaterial map={lines} roughness={0.75} /></mesh>
      <mesh position={[cx, 0.012, P.shot[2]]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[32, 17]} /><meshStandardMaterial color="#2b5c4a" roughness={0.8} /></mesh>
      <Hoop rim={rim} />
      {/* 围网：只在北边和东边，镜头这一侧敞开 */}
      <mesh position={[15, 1.8, -0.5]} renderOrder={2}><planeGeometry args={[34, 3.6]} /><meshStandardMaterial map={mesh} transparent alphaTest={0.3} side={THREE.DoubleSide} roughness={0.8} /></mesh>
    </group>
  )
}

// ---------- 江心高喷平台 ----------
function HighPad({ level }: { level: number }) {
  const ring = useMemo(() => shell([[0, -0.6], [2.2, -0.6], [2.4, -0.3], [2.4, 0.25]], 0.18), [])
  return (
    // 平台面和水面齐平：喷口就在水面上
    <group position={[P.high[0], level - 0.3, P.high[2]]}>
      <mesh geometry={ring} castShadow receiveShadow><meshStandardMaterial color="#e9eae6" roughness={0.45} metalness={0.2} /></mesh>
      <mesh position-y={0.18} rotation-x={-Math.PI / 2}><circleGeometry args={[2.25, 48]} /><meshStandardMaterial color="#2b3136" roughness={0.7} /></mesh>
      <mesh position-y={0.32}><cylinderGeometry args={[0.16, 0.26, 0.3, 24]} /><Metal kind="stainless" grain="turned" /></mesh>
      {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[Math.cos(i * 1.047) * 1.6, 0.24, Math.sin(i * 1.047) * 1.6]}><cylinderGeometry args={[0.07, 0.09, 0.12, 12]} /><Metal kind="stainless" grain="turned" /></mesh>)}
      {/* 四只浮筒上的航标灯 */}
      {[0, 1, 2, 3].map(i => <mesh key={`b${i}`} position={[Math.cos(i * 1.57 + 0.78) * 2.3, 0.4, Math.sin(i * 1.57 + 0.78) * 2.3]}><cylinderGeometry args={[0.06, 0.06, 0.3, 8]} /><meshStandardMaterial color="#e8b330" emissive="#e8b330" emissiveIntensity={0.4} /></mesh>)}
    </group>
  )
}

// ---------- 游船 ----------
/** 一条游船：船体（俯视是尖头的长圆形，往下收窄）、红色腰线、船舱、顶棚和栏杆。长 len、宽 w，原点在水线中心，朝 +x */
export function Boat({ len = 12, w = 6, h = 2.5, color = '#f2f2ee' }: { len?: number; w?: number; h?: number; color?: string }) {
  const hull = useMemo(() => {
    const s = new THREE.Shape(), L = len / 2, W = w / 2
    s.moveTo(-L, -W * 0.92); s.lineTo(L * 0.45, -W); s.quadraticCurveTo(L * 1.0, -W * 0.8, L, 0); s.quadraticCurveTo(L * 1.0, W * 0.8, L * 0.45, W); s.lineTo(-L, W * 0.92); s.quadraticCurveTo(-L * 1.06, 0, -L, -W * 0.92)
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.18, bevelSegments: 3, curveSegments: 16 })
    g.rotateX(-Math.PI / 2); g.translate(0, -0.6, 0)
    return g
  }, [len, w])
  const cabinH = h - 1.15
  return (
    <group>
      <mesh geometry={hull} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.3} clearcoat={0.6} /></mesh>
      <mesh position={[0, 0.55, 0]} scale={[1, 1, 1]}><boxGeometry args={[len * 0.92, 0.16, w + 0.02]} /><meshStandardMaterial color="#c23b2e" roughness={0.45} /></mesh>
      <mesh position={[0, 0.98, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[len * 0.9, w * 0.9]} /><meshStandardMaterial color="#8a6a48" roughness={0.8} /></mesh>
      {/* 船舱：玻璃窗、立柱、顶棚 */}
      <RoundedBox args={[len * 0.55, cabinH * 0.45, w * 0.78]} radius={0.06} position={[-len * 0.08, 1.0 + cabinH * 0.225, 0]} castShadow><meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.5} /></RoundedBox>
      <mesh position={[-len * 0.08, 1.0 + cabinH * 0.68, 0]}><boxGeometry args={[len * 0.55, cabinH * 0.45, w * 0.76]} /><meshPhysicalMaterial color="#1f2d36" roughness={0.08} metalness={0.4} clearcoat={1} transparent opacity={0.75} /></mesh>
      {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[-len * 0.08 + sx * len * 0.27, 1.0 + cabinH * 0.68, sz * w * 0.38]}><boxGeometry args={[0.08, cabinH * 0.45, 0.08]} /><meshStandardMaterial color={color} /></mesh>))}
      <RoundedBox args={[len * 0.66, 0.12, w * 0.92]} radius={0.04} position={[-len * 0.08, h - 0.06, 0]} castShadow><meshStandardMaterial color="#2f6f9f" roughness={0.5} /></RoundedBox>
      {/* 船头栏杆 */}
      {[-1, 1].map(sz => <mesh key={sz} position={[len * 0.32, 1.45, sz * w * 0.42]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.025, 0.025, len * 0.3, 8]} /><Metal kind="stainless" /></mesh>)}
    </group>
  )
}

function Dock({ level }: { level: number }) {
  const wood = useMemo(() => rep(makeAshlar([120, 96, 70], 33), 6, 1), [])
  const sign = makeSign('游船出租', { w: 512, h: 160, bg: '#1f5f66' })
  return (
    <group position={[P.dock[0], 0, P.dock[2]]}>
      {/* 浮码头：钢浮箱上铺木板，一道钢引桥接到岸上 */}
      <group position={[0, level + 0.35, -4.5]}>
        <RoundedBox args={[16, 0.5, 3]} radius={0.06} castShadow receiveShadow><meshStandardMaterial map={wood} roughness={0.85} /></RoundedBox>
        {[-7, -2.3, 2.3, 7].map(x => <mesh key={x} position={[x, 0.6, -1.4]}><cylinderGeometry args={[0.1, 0.12, 0.5, 12]} /><Metal kind="iron" grain="cast" /></mesh>)}
      </group>
      <mesh position={[0, (level + 0.6) / 2 + 0.05, -1.6]} rotation-x={Math.atan2(-(level + 0.6), 3)} castShadow><boxGeometry args={[1.6, 0.12, 3.4]} /><Metal kind="steel" grain="brushed" rough={0.55} /></mesh>
      <group position={[-4, level, -8.6]}><Boat /></group>
      <group position={[8, level, -8.6]} rotation-y={0.04}><Boat color="#eef1f4" /></group>
      {/* 岸上的价目牌 */}
      <group position={[-9.5, 0, 1.2]}>
        {[-0.9, 0.9].map(x => <mesh key={x} position={[x, 1.1, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, 2.2, 10]} /><Metal kind="steel" grain="brushed" /></mesh>)}
        <mesh position={[0, 1.95, 0.03]}><planeGeometry args={[2, 0.62]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
      </group>
    </group>
  )
}

// ---------- 抛物线拱桥 ----------
/** 桥的几何：桥身（拱腹是 y = ax²）、一圈拱石、桥面板、两侧石栏杆。局部坐标原点在拱顶，x 沿桥，z 是桥宽方向 */
function makeBridge() {
  const a = archA(ARCH.width, ARCH.rise), bot = -7.4, end = 10.6, xs = Math.sqrt(bot / a)
  const body = new THREE.Shape()
  body.moveTo(-end, bot); body.lineTo(-end, deckY(end) - 0.35)
  for (let x = -end; x <= end + 1e-6; x += 0.5) body.lineTo(x, deckY(x) - 0.35)
  body.lineTo(end, bot); body.lineTo(xs, bot)
  for (let i = 1; i < 80; i++) { const x = xs - 2 * xs * i / 80; body.lineTo(x, a * x * x) }
  body.lineTo(-xs, bot); body.closePath()
  const W = BRIDGE.w
  const gBody = new THREE.ExtrudeGeometry(body, { depth: W, bevelEnabled: false, curveSegments: 1 }); gBody.translate(0, 0, -W / 2)
  // 拱石：沿拱腹一块块，往外伸 0.85 m，比墙面凸出 6 cm；每块颜色略有不同
  const r = rng(61), stones: THREE.BufferGeometry[] = [], N = 34
  // 按弧长均分
  const xsAt: number[] = []; { const M = 2000, acc: number[] = [0]; for (let i = 1; i <= M; i++) { const x0 = -xs + 2 * xs * (i - 1) / M, x1 = -xs + 2 * xs * i / M; acc.push(acc[i - 1] + Math.hypot(x1 - x0, a * (x1 * x1 - x0 * x0))) } const tot = acc[M]; let j = 0; for (let k = 0; k <= N; k++) { const target = tot * k / N; while (j < M && acc[j] < target) j++; xsAt.push(-xs + 2 * xs * j / M) } }
  // 拱腹的外法线（朝拱圈里面、离开桥洞）：(−2ax, 1)
  const off = (x: number, d: number): [number, number] => { const nx = -2 * a * x, l = Math.hypot(nx, 1); return [x + nx / l * d, a * x * x + d / l] }
  for (let k = 0; k < N; k++) {
    const x0 = xsAt[k], x1 = xsAt[k + 1], s = new THREE.Shape(), o0 = off(x0, 0.85), o1 = off(x1, 0.85), gap = 0.02
    const p0: [number, number] = [x0 + gap, a * (x0 + gap) ** 2], p1: [number, number] = [x1 - gap, a * (x1 - gap) ** 2]
    s.moveTo(...p0); s.lineTo(...p1); s.lineTo(o1[0] - gap, o1[1]); s.lineTo(o0[0] + gap, o0[1]); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: W + 0.12, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1 }); g.translate(0, 0, -W / 2 - 0.06)
    const v = r(); paint(g, v < 0.33 ? '#c9c2b2' : v < 0.66 ? '#bdb6a6' : '#d2ccbd', stones)
  }
  // 桥面板（比桥身两边各宽 0.25 m）
  const deck = new THREE.Shape(); deck.moveTo(-end - 0.6, deckY(end + 0.6) - 0.4)
  for (let x = -end - 0.6; x <= end + 0.6 + 1e-6; x += 0.5) deck.lineTo(x, deckY(x))
  for (let x = end + 0.6; x >= -end - 0.6 - 1e-6; x -= 0.5) deck.lineTo(x, deckY(x) - 0.4)
  const gDeck = new THREE.ExtrudeGeometry(deck, { depth: W + 0.5, bevelEnabled: false, curveSegments: 1 }); gDeck.translate(0, 0, -W / 2 - 0.25)
  // 栏杆：望柱 + 栏板 + 扶手
  const rail: THREE.BufferGeometry[] = []
  for (const z of [-W / 2 - 0.05, W / 2 + 0.05]) {
    for (let x = -end; x <= end + 1e-6; x += 1.5) { const g = new THREE.BoxGeometry(0.26, 1.15, 0.26); g.translate(x, deckY(x) + 0.575, z); paint(g, '#d9d4c7', rail); const c = new THREE.SphereGeometry(0.14, 10, 8); c.translate(x, deckY(x) + 1.22, z); paint(c, '#d9d4c7', rail) }
    const band = (y0: number, y1: number, t: number, c: string) => { const s = new THREE.Shape(); s.moveTo(-end, deckY(end) + y0); for (let x = -end; x <= end + 1e-6; x += 0.5) s.lineTo(x, deckY(x) + y1); for (let x = end; x >= -end - 1e-6; x -= 0.5) s.lineTo(x, deckY(x) + y0); const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, z - t / 2); paint(g, c, rail) }
    band(0.1, 0.85, 0.12, '#cfc9bb'); band(0.88, 1.0, 0.2, '#e0dbcf')
  }
  return { body: gBody, stones: merged(stones), deck: gDeck, rail: merged(rail), xs }
}

function Bridge() {
  const g = useMemo(makeBridge, [])
  const ash = useMemo(() => { const t = rep(makeAshlar(), 1 / 2.4, 1 / 1.2); return t }, [])
  return (
    // 局部 x 沿桥（指向北岸），镜头在东边（局部 +z）看桥的侧面
    <group position={[P.bridge[0], BRIDGE.top, P.bridge[2]]} rotation-y={Math.PI / 2}>
      <mesh geometry={g.body} castShadow receiveShadow><meshStandardMaterial map={ash} roughness={0.85} /></mesh>
      <mesh geometry={g.stones} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.8} /></mesh>
      <mesh geometry={g.deck} castShadow receiveShadow><meshStandardMaterial color="#a39d90" roughness={0.85} /></mesh>
      <mesh geometry={g.rail} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.75} /></mesh>
    </group>
  )
}

// ---------- 花园：修剪过的绿篱、圆球灌木、碎石小路 ----------
function Garden() {
  const gravel = useMemo(() => rep(makeCourt('#b9ae98', 21), 12, 1), [])
  // 修剪平整的方形绿篱：顶面平、棱角微圆，表面用草叶贴图做出叶片的细碎质感
  const leaf = useMemo(() => rep(makeLawn(), 10, 0.5), [])
  return (
    <group>
      <RoundedBox args={[22, 0.95, 0.9]} radius={0.07} smoothness={3} position={[P.bed1[0] + 1, 0.475, P.bed1[2] - 6.2]} castShadow receiveShadow><meshStandardMaterial map={leaf} bumpMap={leaf} bumpScale={2.5} color="#6f9a52" roughness={0.95} /></RoundedBox>
      <mesh position={[P.bed1[0] + 1, 0.008, P.bed1[2] + 4.6]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[24, 1.6]} /><meshStandardMaterial map={gravel} roughness={1} /></mesh>
    </group>
  )
}

// ---------- 整个公园 ----------
export function Park({ level }: { level: number }) {
  const props = useMemo(makeProps, [])
  const city = useMemo(makeCity, [])
  const windows = useMemo(makeWindows, [])
  const ash = useMemo(() => rep(makeAshlar([150, 146, 136], 3), (RIVER.x1 - RIVER.x0) / 2.4, 4.5 / 1.2), [])
  const brick = useMemo(() => rep(makeBrick(), 30, 2), [])
  const L = RIVER.x1 - RIVER.x0, cx = (RIVER.x0 + RIVER.x1) / 2
  return (
    <group>
      <mesh geometry={props} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.8} /></mesh>
      {TREES.map(([x, z, h], i) => <Tree key={i} x={x} z={z} h={h} seed={i * 13 + 5} />)}
      <mesh geometry={city}><meshStandardMaterial vertexColors map={windows} roughness={0.5} metalness={0.2} /></mesh>
      {/* 两岸的石砌驳岸、江底 */}
      {[RIVER.south, RIVER.north].map((z, i) => <mesh key={z} position={[cx, (RIVER.bed - 0.2) / 2, z]} rotation-y={i ? 0 : Math.PI} receiveShadow><planeGeometry args={[L, -RIVER.bed + 0.2]} /><meshStandardMaterial map={ash} roughness={0.85} side={THREE.DoubleSide} /></mesh>)}
      {[RIVER.south, RIVER.north].map(z => <mesh key={`c${z}`} position={[cx, 0.06, z + (z > RIVER_Z ? -0.25 : 0.25)]} castShadow receiveShadow><boxGeometry args={[L, 0.12, 0.6]} /><meshStandardMaterial color="#cfcac0" roughness={0.7} /></mesh>)}
      <mesh position={[cx, RIVER.bed, RIVER_Z]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[L, RIVER.south - RIVER.north]} /><meshStandardMaterial color="#3d4a3c" roughness={0.95} /></mesh>
      <group position={[cx, level, RIVER_Z]}><WaterSurface w={L} d={RIVER.south - RIVER.north} color="#2f6a70" opacity={0.9} rep={0.5} speed={0.012} /></group>
      {/* 花园的矮砖墙（第 7 课的花圃靠着它） */}
      <mesh position={[P.bed7[0], 0.6, P.bed7[2] - 0.15]} castShadow receiveShadow><boxGeometry args={[22, 1.2, 0.3]} /><meshStandardMaterial map={brick} roughness={0.85} /></mesh>
      <mesh position={[P.bed7[0], 1.24, P.bed7[2] - 0.15]} castShadow><boxGeometry args={[22.2, 0.08, 0.4]} /><meshStandardMaterial color="#c9c3b6" roughness={0.7} /></mesh>
      <Garden />
      <Basin />
      <Trough />
      <Court />
      <HighPad level={level} />
      <group position={[P.high[0], level, P.high[2]]}><HighJet height={heightAt} period={4} /></group>
      <Dock level={level} />
      <Bridge />
    </group>
  )
}
