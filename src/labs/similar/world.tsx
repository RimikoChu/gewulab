// 相似和测量实验室的大场景：一所中学。北面四层的教学楼（南面是外廊和栏杆），楼前广场上一根旗杆，南面 200 m 跑道围着足球场，
// 西边篮球场；东边校园比外面低 3 m，挡土墙上两段护坡（30°、45°）和一道台阶，上去是公园，尽头一座七层八角古塔，塔南一片荷塘。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 个单位 = 1 m，x 朝东，z 朝南。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, disc, lathe, makeGround, mergeParts, type Part } from '@/lab-kit'
import { POLE_H, SLOPE_H, TOWER } from './physics'
import { Tree } from './trees'
import { makeHousing, makeBrick, makeCourt, makeDoor, makeFacade, makeFlag, makePavers, makeRubble, makeSlopeGrid, makeTiles, makeTrack, makeTurf, makeWindow, rep, rng } from './mats'

export type V3 = [number, number, number]
/** 各课的位置 */
export const ST = {
  l1: { x: -62, z: -3.6 },        // 篮球场北半场（中圈和三分线之间的空地）
  l2: { x: -20, z: -21 },         // 教学楼前广场西侧
  l3: { x: -62, z: 4.6 },         // 篮球场南半场
  flag: { x: 0, z: -12 },         // 旗杆
  l5: { x: 32.4, z: -35.5 },      // 镜子、标杆所在的那条线：从教学楼东山墙脚（x = 32.4）往东
  s30: { z0: -7, z1: -1 },        // 30° 护坡占的 z 范围
  s45: { z0: 4, z1: 10 },         // 45° 护坡
  tower: { x: 110, z: 0 },        // 古塔中心
}
/** 教学楼：楼前（外廊外沿、女儿墙）在 z = FRONT，层高 3.6 m，女儿墙顶 15.0 m */
export const BLD = { x0: -35, x1: 32, front: -30, back: -41, floor: 3.6, floors: 4, top: 15 }
/** 东边：挡土墙在 x = WALL，墙上是公园，地面高 TER */
export const WALL = 56, TER = SLOPE_H
/** 一段护坡的坡脚 x */
export const toeX = (a: number) => WALL - SLOPE_H / Math.tan(a * Math.PI / 180)
/** 荷塘 */
export const POND = { x0: 100, x1: 120, z0: 9, z1: 24 }

export function World() {
  return (
    <group>
      <Ground />
      <Track />
      <Court />
      <Building />
      <Flagpole />
      <Terrace />
      <Tower />
      <Trees />
      <City />
      <Hills />
    </group>
  )
}

// ---------- 地面 ----------
function Ground() {
  const grass = useMemo(() => { const t = makeGround('#5d6d3e', '74,92,50', '120,120,80', 3); t.repeat.set(90, 90); return t }, [])
  const pav = useMemo(() => { const p = makePavers(); return { map: rep(p.map, 68, 52.5), bump: rep(p.bump, 68, 52.5) } }, [])
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]} receiveShadow><planeGeometry args={[1400, 1400]} /><meshStandardMaterial map={grass} roughness={1} /></mesh>
    {/* 校园里铺透水砖：x −80…50，z −45…60 */}
    <mesh rotation-x={-Math.PI / 2} position={[-12, 0, 7.5]} receiveShadow><planeGeometry args={[136, 105]} /><meshStandardMaterial map={pav.map} bumpMap={pav.bump} bumpScale={0.6} roughness={0.9} color="#d2cdc3" /></mesh>
    {/* 校园外沿一道矮墙（只在西、南两面，看得见边界） */}
    <mesh position={[-80.2, 0.5, 7.5]} castShadow receiveShadow><boxGeometry args={[0.4, 1, 105]} /><meshStandardMaterial color="#b9b2a6" roughness={0.9} /></mesh>
    <mesh position={[-15, 0.5, 60.2]} castShadow receiveShadow><boxGeometry args={[130, 1, 0.4]} /><meshStandardMaterial color="#b9b2a6" roughness={0.9} /></mesh>
  </group>
}

/** 200 m 跑道：中心 (0, 30)，直道 50 m，内圈半径 17 m，四条道各宽 1.22 m；里面是足球场 */
const TRK = { cx: 0, cz: 30, L: 50, R: 17, lanes: 4, lw: 1.22 }
function stadium(r: number, n = 40) {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI; pts.push(new THREE.Vector2(TRK.L / 2 + Math.cos(a) * r, Math.sin(a) * r)) }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + i / n * Math.PI; pts.push(new THREE.Vector2(-TRK.L / 2 + Math.cos(a) * r, Math.sin(a) * r)) }
  return pts
}
function Track() {
  const geo = useMemo(() => {
    const outer = new THREE.Shape(stadium(TRK.R + TRK.lanes * TRK.lw + 0.6)); outer.holes.push(new THREE.Path(stadium(TRK.R).reverse()))
    const g = new THREE.ShapeGeometry(outer, 8); g.rotateX(Math.PI / 2)
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2, p.getZ(i) / 2)
    return g
  }, [])
  const field = useMemo(() => { const g = new THREE.ShapeGeometry(new THREE.Shape(stadium(TRK.R - 0.05)), 8); g.rotateX(Math.PI / 2); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 10, p.getZ(i) / 10); return g }, [])
  // 分道线：几圈细白线
  const lines = useMemo(() => mergeGeometries(Array.from({ length: TRK.lanes + 1 }, (_, i) => {
    const r = TRK.R + i * TRK.lw, s = new THREE.Shape(stadium(r + 0.025)); s.holes.push(new THREE.Path(stadium(r - 0.025).reverse()))
    const g = new THREE.ShapeGeometry(s, 4); g.rotateX(Math.PI / 2); return g
  })), [])
  const field2 = useMemo(() => mergeGeometries([
    ...[-1, 1].map(s => { const g = new THREE.BoxGeometry(0.08, 0.002, 24); g.translate(s * 22, 0, 0); return g }),
    (() => { const g = new THREE.BoxGeometry(0.08, 0.002, 24); return g })(),
    (() => { const g = new THREE.TorusGeometry(4, 0.04, 3, 48); g.rotateX(Math.PI / 2); g.scale(1, 0.02, 1); return g })(),
    ...[-1, 1].map(s => { const g = new THREE.BoxGeometry(44, 0.002, 0.08); g.translate(0, 0, s * 12); return g }),
  ]), [])
  return <group position={[TRK.cx, 0, TRK.cz]}>
    <mesh geometry={geo} position-y={0.012} receiveShadow><meshStandardMaterial map={rep(makeTrack(), 1, 1)} roughness={0.92} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={lines} position-y={0.016}><meshStandardMaterial color="#f4f2ec" roughness={0.8} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={field} position-y={0.014} receiveShadow><meshStandardMaterial map={makeTurf()} roughness={1} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={field2} position-y={0.018}><meshStandardMaterial color="#eef0ea" roughness={0.8} /></mesh>
    {/* 两个足球门 */}
    {[-1, 1].map(s => <group key={s} position={[s * 22, 0, 0]}>
      {[-1.6, 1.6].map(z => <mesh key={z} position={[0, 1, z]} castShadow><cylinderGeometry args={[0.05, 0.05, 2, 10]} /><meshStandardMaterial color="#f4f4f0" roughness={0.4} /></mesh>)}
      <mesh position={[0, 2, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.05, 0.05, 3.3, 10]} /><meshStandardMaterial color="#f4f4f0" roughness={0.4} /></mesh>
      <mesh position={[s * 0.8, 1, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[3.2, 2]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>)}
  </group>
}

/** 篮球场：28 × 15 m，长边沿 z；中心 (−62, 0) */
const COURT = { x: -62, z: 0, w: 15, l: 28 }
function Court() {
  const lines = useMemo(() => {
    const W = 0.05, gs: THREE.BufferGeometry[] = []
    const bar = (x: number, z: number, w: number, l: number) => { const g = new THREE.BoxGeometry(w, 0.002, l); g.translate(x, 0, z); gs.push(g) }
    bar(-COURT.w / 2, 0, W, COURT.l); bar(COURT.w / 2, 0, W, COURT.l); bar(0, -COURT.l / 2, COURT.w, W); bar(0, COURT.l / 2, COURT.w, W); bar(0, 0, COURT.w, W)
    const ring = (r: number, z: number, a0: number, a1: number) => { const g = new THREE.RingGeometry(r - W / 2, r + W / 2, 48, 1, a0, a1 - a0); g.rotateX(-Math.PI / 2); g.translate(0, 0, z); gs.push(g) }
    ring(1.8, 0, 0, Math.PI * 2)
    for (const s of [-1, 1]) {
      const zb = s * COURT.l / 2
      bar(-2.45, zb - s * 2.9, W, 5.8); bar(2.45, zb - s * 2.9, W, 5.8); bar(0, zb - s * 5.8, 4.9, W)
      ring(1.8, zb - s * 5.8, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI : Math.PI * 2)
      ring(6.75, zb - s * 1.575, s > 0 ? 0.06 : Math.PI + 0.06, s > 0 ? Math.PI - 0.06 : Math.PI * 2 - 0.06)
    }
    return mergeGeometries(gs.map(g => g.index ? g.toNonIndexed() : g))
  }, [])
  return <group position={[COURT.x, 0, COURT.z]}>
    <mesh position={[0, 0.01, 0]} receiveShadow><boxGeometry args={[COURT.w + 3, 0.02, COURT.l + 4]} /><meshStandardMaterial color="#6e5a4c" roughness={0.9} /></mesh>
    <mesh position={[0, 0.021, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[COURT.w, COURT.l]} /><meshStandardMaterial map={rep(makeCourt(), 10, 19)} roughness={0.85} /></mesh>
    <mesh geometry={lines} position-y={0.024}><meshStandardMaterial color="#f4f2ec" roughness={0.7} /></mesh>
    {/* 两副篮球架 */}
    {[-1, 1].map(s => <group key={s} position={[0, 0, s * (COURT.l / 2 + 1.2)]} rotation-y={s > 0 ? Math.PI : 0}>
      <mesh position={[0, 0.15, 0]} castShadow><boxGeometry args={[1.2, 0.3, 1.6]} /><meshStandardMaterial color="#2b4f7a" roughness={0.5} /></mesh>
      <mesh position={[0, 1.8, 0]} castShadow><cylinderGeometry args={[0.09, 0.11, 3.4, 16]} /><Metal kind="steel" /></mesh>
      <mesh position={[0, 3.35, 0.6]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.06, 0.06, 1.3, 12]} /><Metal kind="steel" /></mesh>
      <mesh position={[0, 3.45, 1.25]} castShadow><boxGeometry args={[1.8, 1.05, 0.04]} /><meshPhysicalMaterial color="#f2f4f4" transparent opacity={0.55} roughness={0.1} /></mesh>
      <mesh position={[0, 3.05, 1.55]} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[0.225, 0.012, 8, 32]} /><meshStandardMaterial color="#d8541e" roughness={0.4} metalness={0.4} /></mesh>
    </group>)}
  </group>
}

// ---------- 教学楼 ----------
/** 外廊里的墙面：一跨 7.5 m，一扇门、两扇窗，按层重复 */
function makeBay() {
  const W = 750, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, tile = makeFacade().image as HTMLCanvasElement
  for (let x = 0; x < W; x += 100) for (let y = 0; y < H; y += 100) g.drawImage(tile, x, y, 100, 100)
  g.fillStyle = 'rgba(200,190,170,0.25)'; g.fillRect(0, 0, W, H)
  g.drawImage(makeDoor().image as HTMLCanvasElement, 60, H - 230, 100, 230)
  g.drawImage(makeWindow().image as HTMLCanvasElement, 240, H - 280, 200, 180); g.drawImage(makeWindow().image as HTMLCanvasElement, 480, H - 280, 200, 180)
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(236, H - 102, 208, 8); g.fillRect(476, H - 102, 208, 8)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
function Building() {
  const { x0, x1, front: F, back: B, floor: h, floors: n, top } = BLD, len = x1 - x0, inner = F - 2.2
  const bay = useMemo(() => { const t = makeBay(); t.repeat.set(len / 7.5, n); return t }, [len, n])
  const tileTex = useMemo(() => makeFacade(), [])
  const wallFront = useMemo(() => rep(tileTex, len, 1.1), [tileTex, len])
  const wallSide = useMemo(() => rep(tileTex, 11, top), [tileTex, top])
  const backWin = useMemo(() => { const t = rep(makeWindow(), len / 3.75, n); return t }, [len, n])
  // 混凝土构件：楼板外沿、柱子、女儿墙压顶，合成一个模型
  const frame = useMemo(() => {
    const parts: Part[] = []
    for (let k = 1; k <= n; k++) parts.push({ p: [(x0 + x1) / 2, k * h - 0.15, (F + inner) / 2], s: [len, 0.3, F - inner], c: '#d9d4ca' })   // 每层楼板（外廊）
    for (let x = x0; x <= x1 + 0.01; x += 7.5) parts.push({ p: [x, top / 2 - 0.3, F - 0.25], s: [0.5, top - 0.6, 0.5], c: '#e4dfd4' })         // 柱子
    parts.push({ p: [(x0 + x1) / 2, 0.15, F - 1.1], s: [len + 0.6, 0.3, 2.4], c: '#bdb7ab' })                                              // 室外平台
    for (let k = 0; k < 3; k++) parts.push({ p: [(x0 + x1) / 2, 0.05 + k * 0.1, F + 0.25 + (2 - k) * 0.3], s: [len * 0.98, 0.1, 0.3], c: '#c6c1b6' })   // 台阶
    parts.push({ p: [(x0 + x1) / 2, top + 0.05, F - 0.12], s: [len + 0.1, 0.1, 0.34], c: '#d3cec3' })                                       // 女儿墙压顶
    return mergeParts(parts)
  }, [x0, x1, F, inner, h, n, len, top])
  // 栏杆：二到四层外廊的栏板顶上一道不锈钢扶手，楼顶女儿墙
  return <group>
    <mesh geometry={frame} castShadow receiveShadow><Painted rough={0.85} metal={0} /></mesh>
    {/* 外廊里的墙：门窗 */}
    <mesh position={[(x0 + x1) / 2, n * h / 2, inner]} receiveShadow><planeGeometry args={[len, n * h]} /><meshStandardMaterial map={bay} roughness={0.7} /></mesh>
    {/* 二到四层的栏板（面砖）和扶手；一层外廊敞开 */}
    {Array.from({ length: n - 1 }, (_, i) => (i + 1) * h).map(y => <group key={y}>
      <mesh position={[(x0 + x1) / 2, y + 0.55, F - 0.08]} castShadow receiveShadow><boxGeometry args={[len, 1.1, 0.16]} /><meshStandardMaterial map={wallFront} roughness={0.8} /></mesh>
      <mesh position={[(x0 + x1) / 2, y + 1.15, F - 0.1]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.035, 0.035, len, 10]} /><Metal kind="stainless" grain="brushed" /></mesh>
      {/* 楼板外沿一道蓝色腰线 */}
      <mesh position={[(x0 + x1) / 2, y - 0.15, F + 0.01]}><planeGeometry args={[len, 0.3]} /><meshStandardMaterial color="#3c6e9a" roughness={0.6} /></mesh>
    </group>)}
    {/* 屋顶和女儿墙（女儿墙顶就是第 5 课量的“楼顶”，高 15.0 m） */}
    <mesh position={[(x0 + x1) / 2, n * h + 0.1, (F + B) / 2]} castShadow receiveShadow><boxGeometry args={[len, 0.2, F - B]} /><meshStandardMaterial color="#8d8a84" roughness={0.9} /></mesh>
    <mesh position={[(x0 + x1) / 2, (n * h + top) / 2, F - 0.12]} castShadow receiveShadow><boxGeometry args={[len + 0.1, top - n * h, 0.24]} /><meshStandardMaterial map={wallFront} roughness={0.8} /></mesh>
    <mesh position={[(x0 + x1) / 2, n * h - 0.15, F + 0.01]}><planeGeometry args={[len, 0.3]} /><meshStandardMaterial color="#3c6e9a" roughness={0.6} /></mesh>
    {/* 两头的山墙、后墙 */}
    {[x0 - 0.2, x1 + 0.2].map(x => <mesh key={x} position={[x, top / 2, (F + B) / 2 - 0.2]} castShadow receiveShadow><boxGeometry args={[0.4, top, F - B + 0.4]} /><meshStandardMaterial map={wallSide} roughness={0.85} /></mesh>)}
    <mesh position={[(x0 + x1) / 2, n * h / 2, B]} castShadow receiveShadow><boxGeometry args={[len, n * h, 0.3]} /><meshStandardMaterial map={wallSide} roughness={0.85} /></mesh>
    <mesh position={[(x0 + x1) / 2, n * h / 2, B - 0.16]} rotation-y={Math.PI}><planeGeometry args={[len, n * h]} /><meshStandardMaterial map={backWin} roughness={0.5} /></mesh>
    {/* 屋里：从外廊看进去的天花是暗的 */}
    <mesh position={[(x0 + x1) / 2, n * h / 2, (inner + B) / 2]}><boxGeometry args={[len - 0.4, n * h - 0.2, inner - B - 0.4]} /><meshStandardMaterial color="#3a3a38" roughness={1} /></mesh>
  </group>
}

// ---------- 旗杆 ----------
/** 旗杆：不锈钢，下粗上细，顶上一颗金色圆球，杆顶离地 12 m；底座是一圈花岗石；国旗升在杆顶下面 */
function Flagpole() {
  const { x, z } = ST.flag
  const pole = useMemo(() => lathe([[0, 0], [0.11, 0], [0.11, 0.3], [0.09, 0.32], [0.05, POLE_H - 0.18], [0, POLE_H - 0.18]], { segs: 24 }), [])
  const base = useMemo(() => disc(0.45, 0.22, { chamfer: 0.03 }), [])
  // 旗面：一点起伏的布
  const cloth = useMemo(() => {
    const g = new THREE.PlaneGeometry(2.4, 1.6, 24, 8), p = g.attributes.position
    for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + 1.2) / 2.4; p.setZ(i, Math.sin(u * 7 + 0.6) * 0.09 * u + Math.sin(u * 3) * 0.05 * u) }
    g.translate(1.2, 0, 0); g.computeVertexNormals(); return g
  }, [])
  return <group position={[x, 0, z]}>
    <mesh geometry={base} castShadow receiveShadow><meshStandardMaterial color="#8a8680" roughness={0.6} /></mesh>
    <mesh geometry={pole} castShadow><Metal kind="stainless" grain="brushed" rough={0.25} /></mesh>
    <mesh position={[0, POLE_H - 0.1, 0]} castShadow><sphereGeometry args={[0.1, 20, 14]} /><Metal kind="brass" rough={0.2} /></mesh>
    <mesh geometry={cloth} position={[0.06, POLE_H - 1.25, 0]} rotation-y={-0.5} castShadow><meshStandardMaterial map={makeFlag()} roughness={0.8} side={THREE.DoubleSide} /></mesh>
    {/* 升旗的绳子 */}
    <mesh position={[0.08, 5.8, 0]} castShadow><cylinderGeometry args={[0.006, 0.006, 11.6, 4]} /><meshStandardMaterial color="#eeeeea" /></mesh>
  </group>
}

// ---------- 东边：挡土墙、护坡、台阶、公园 ----------
/** 一段护坡：截面是从坡脚斜上去到墙顶，沿 z 拉伸 */
function Slope({ a, z0, z1 }: { a: number; z0: number; z1: number }) {
  const t0 = toeX(a), run = WALL - t0, slant = SLOPE_H / Math.sin(a * Math.PI / 180)
  const geo = useMemo(() => {
    const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(run, 0), new THREE.Vector2(run, SLOPE_H)])
    const g = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false }); return g
  }, [run, z0, z1])
  const grid = useMemo(() => rep(makeSlopeGrid(), z1 - z0, slant), [z1, z0, slant])
  const ang = a * Math.PI / 180
  return <group>
    <mesh geometry={geo} position={[t0, 0, z0]} castShadow receiveShadow><meshStandardMaterial color="#b3ada1" roughness={0.95} /></mesh>
    {/* 坡面贴方格草皮 */}
    <group position={[(t0 + WALL) / 2 - Math.sin(ang) * 0.01, SLOPE_H / 2 + Math.cos(ang) * 0.01, (z0 + z1) / 2]} rotation-y={-Math.PI / 2}>
      <mesh rotation-x={-(Math.PI / 2 - ang)} receiveShadow><planeGeometry args={[z1 - z0, slant]} /><meshStandardMaterial map={grid} roughness={0.95} /></mesh>
    </group>
    {/* 坡脚一道混凝土压脚 */}
    <mesh position={[t0 - 0.15, 0.1, (z0 + z1) / 2]} castShadow receiveShadow><boxGeometry args={[0.4, 0.2, z1 - z0]} /><meshStandardMaterial color="#b7b2a6" roughness={0.9} /></mesh>
  </group>
}
function Terrace() {
  const rub = useMemo(() => rep(makeRubble(), 30, 1), [])
  const top = useMemo(() => { const t = makeGround('#6a7646', '80,96,52', '130,126,86', 11); t.repeat.set(40, 30); return t }, [])
  const path = useMemo(() => { const p = makePavers(); return { map: rep(p.map, 30, 3), bump: rep(p.bump, 30, 3) } }, [])
  const S30 = ST.s30, S45 = ST.s45
  // 台阶：在两段护坡之间，z 0…3
  const steps = useMemo(() => { const parts: Part[] = []; const n = 18, run = 0.3, rise = SLOPE_H / n; for (let i = 0; i < n; i++) parts.push({ p: [WALL - (n - i) * run + run / 2, (i + 1) * rise / 2, 1.5], s: [run, (i + 1) * rise, 3], c: i % 2 ? '#bcb7ab' : '#c4bfb3' }); return mergeParts(parts) }, [])
  // 墙顶栏杆：一根根立柱加两道横杆（台阶口留空）
  const rail = useMemo(() => {
    const gs: THREE.BufferGeometry[] = []
    const post = (z: number) => { const g = new THREE.CylinderGeometry(0.03, 0.03, 1.05, 8); g.translate(WALL + 0.25, TER + 0.525, z); gs.push(g) }
    const bar = (z0: number, z1: number, y: number) => { const g = new THREE.CylinderGeometry(0.025, 0.025, z1 - z0, 8); g.rotateX(Math.PI / 2); g.translate(WALL + 0.25, TER + y, (z0 + z1) / 2); gs.push(g) }
    for (const [z0, z1] of [[-45, 0], [3, 65]] as [number, number][]) { for (let z = z0; z <= z1 + 0.01; z += 1.5) post(z); bar(z0, z1, 1.05); bar(z0, z1, 0.55) }
    return mergeGeometries(gs)
  }, [])
  return <group>
    {/* 公园的台地 */}
    <mesh position={[WALL + 75, TER / 2, 10]} receiveShadow castShadow><boxGeometry args={[150, TER, 110]} /><meshStandardMaterial color="#6f6a5e" roughness={1} /></mesh>
    <mesh position={[WALL + 75, TER + 0.005, 10]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[150, 110]} /><meshStandardMaterial map={top} roughness={1} /></mesh>
    {/* 挡土墙面：毛石 */}
    <mesh position={[WALL - 0.01, TER / 2, 10]} rotation-y={-Math.PI / 2} receiveShadow><planeGeometry args={[110, TER]} /><meshStandardMaterial map={rub} roughness={0.95} /></mesh>
    <mesh position={[WALL + 0.15, TER + 0.06, 10]} castShadow receiveShadow><boxGeometry args={[0.5, 0.12, 110]} /><meshStandardMaterial color="#bdb8ac" roughness={0.85} /></mesh>
    <Slope a={30} z0={S30.z0} z1={S30.z1} />
    <Slope a={45} z0={S45.z0} z1={S45.z1} />
    <mesh geometry={steps} castShadow receiveShadow><Painted rough={0.85} metal={0} /></mesh>
    <mesh geometry={rail} castShadow><Metal kind="steel" rough={0.4} /></mesh>
    {/* 通往古塔的步道 */}
    <mesh position={[(WALL + ST.tower.x) / 2, TER + 0.01, 1.5]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[ST.tower.x - WALL, 5]} /><meshStandardMaterial map={path.map} bumpMap={path.bump} bumpScale={0.5} roughness={0.9} color="#dcd8cf" /></mesh>
    <Pond />
  </group>
}
/** 塔南的荷塘：石砌池岸，墨绿的水面，一片片荷叶（有大有小、有的翘起），几朵粉色荷花 */
function Pond() {
  const { x0, x1, z0, z1 } = POND
  const leaves = useMemo(() => { const r = rng(61); return Array.from({ length: 90 }, () => ({ x: x0 + 0.8 + r() * (x1 - x0 - 1.6), z: z0 + 0.8 + r() * (z1 - z0 - 1.6), s: 0.3 + r() * 0.55, a: r() * 6, up: r() < 0.25 ? 0.25 + r() * 0.5 : 0, tilt: (r() - 0.5) * 0.3, shade: r() })) }, [x0, x1, z0, z1])
  const flowers = useMemo(() => { const r = rng(67); return Array.from({ length: 12 }, () => ({ x: x0 + 1.5 + r() * (x1 - x0 - 3), z: z0 + 1.5 + r() * (z1 - z0 - 3), h: 0.35 + r() * 0.4 })) }, [x0, x1, z0, z1])
  const leafGeo = useMemo(() => { const g = new THREE.CircleGeometry(1, 24, 0.25, Math.PI * 2 - 0.25); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getY(i)); p.setZ(i, d * d * 0.12) } g.computeVertexNormals(); g.rotateX(-Math.PI / 2); return g }, [])
  const petal = useMemo(() => lathe([[0, 0], [0.06, 0.03], [0.09, 0.09], [0.07, 0.15], [0.03, 0.17], [0, 0.16]], { segs: 12 }), [])
  return <group>
    <mesh position={[(x0 + x1) / 2, TER + 0.02, (z0 + z1) / 2]} rotation-x={-Math.PI / 2}><planeGeometry args={[x1 - x0, z1 - z0]} /><meshStandardMaterial color="#2c4a44" roughness={0.06} metalness={0.3} envMapIntensity={1.2} /></mesh>
    {([[x0, (z0 + z1) / 2, 0.6, z1 - z0 + 0.6], [x1, (z0 + z1) / 2, 0.6, z1 - z0 + 0.6], [(x0 + x1) / 2, z0, x1 - x0, 0.6], [(x0 + x1) / 2, z1, x1 - x0, 0.6]] as [number, number, number, number][]).map(([x, z, w, l], i) =>
      <mesh key={i} position={[x, TER + 0.15, z]} castShadow receiveShadow><boxGeometry args={[w, 0.3, l]} /><meshStandardMaterial map={rep(makeRubble(), Math.max(w, l) / 3, 0.3)} color="#c9c3b6" roughness={0.85} /></mesh>)}
    {leaves.map((l, i) => <group key={i} position={[l.x, TER + 0.04 + l.up, l.z]} rotation={[l.tilt, l.a, l.tilt]}>
      <mesh geometry={leafGeo} scale={l.s} castShadow receiveShadow><meshStandardMaterial color={l.shade < 0.5 ? '#4e7a35' : '#5f8c3e'} roughness={0.55} side={THREE.DoubleSide} /></mesh>
      {l.up > 0 && <mesh position={[0, -l.up / 2, 0]}><cylinderGeometry args={[0.012, 0.012, l.up, 6]} /><meshStandardMaterial color="#5a7a38" /></mesh>}
    </group>)}
    {flowers.map((f, i) => <group key={i} position={[f.x, TER + 0.02, f.z]}>
      <mesh position={[0, f.h / 2, 0]}><cylinderGeometry args={[0.01, 0.012, f.h, 6]} /><meshStandardMaterial color="#5a7a38" /></mesh>
      <mesh geometry={petal} position={[0, f.h, 0]} castShadow><meshStandardMaterial color="#f2a4b8" roughness={0.6} /></mesh>
    </group>)}
  </group>
}

// ---------- 古塔 ----------
/** 七层八角楼阁式砖塔：塔基（须弥座）、七层塔身逐层收小、每层叠涩出檐加瓦顶、顶上塔刹（覆钵、相轮、宝盖、宝珠）。从地面到塔刹顶 31.5 m */
export const TOWER_LEVELS = (() => {
  const body = [3.8, 3.3, 3.0, 2.7, 2.45, 2.2, 2.0], eave = 0.8, plinth = 1.2
  let y = plinth
  return body.map((b, i) => { const a = 3.0 - i * 0.24, l = { y0: y, y1: y + b, a }; y += b + eave; return l })
})()
const oct = (apothem: number) => apothem / Math.cos(Math.PI / 8)   // 八边形的外接半径
function Tower() {
  const { x, z } = ST.tower
  const brick = useMemo(() => rep(makeBrick(), 3, 1), [])
  const tiles = useMemo(() => rep(makeTiles(), 6, 1), [])
  const last = TOWER_LEVELS[TOWER_LEVELS.length - 1], spireY = last.y1 + 0.8
  // 塔身和叠涩：一层层车削，8 条边
  const bodies = useMemo(() => mergeGeometries(TOWER_LEVELS.map(l => {
    const r = oct(l.a), p: [number, number][] = [[0, l.y0], [r, l.y0], [r, l.y1], [r + 0.12, l.y1], [r + 0.12, l.y1 + 0.1], [r + 0.26, l.y1 + 0.1], [r + 0.26, l.y1 + 0.2], [r + 0.42, l.y1 + 0.2], [r + 0.42, l.y1 + 0.3], [0, l.y1 + 0.3]]
    return lathe(p, { segs: 8, crease: 20 })
  })), [])
  // 瓦檐：从叠涩外沿往外、往下斜出去，角上微微翘起（车削成八边形的伞面）
  const roofs = useMemo(() => mergeGeometries(TOWER_LEVELS.map((l, i) => {
    const r = oct(l.a), next = TOWER_LEVELS[i + 1], rt = next ? oct(next.a) : r * 0.5, y = l.y1 + 0.3
    const p: [number, number][] = [[rt, y + 0.5], [r + 0.5, y + 0.18], [r + 1.05, y - 0.02], [r + 1.12, y + 0.06], [r + 1.12, y - 0.1], [r + 0.4, y - 0.02], [rt, y + 0.3]]
    return lathe(p, { segs: 8, crease: 20, closed: true })
  })), [])
  // 每层四面开拱门（逐层错开 45°），黑洞洞的
  const doors = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-0.45, 0); s.lineTo(0.45, 0); s.lineTo(0.45, 1.1); s.absarc(0, 1.1, 0.45, 0, Math.PI, false); s.lineTo(-0.45, 0)
    const base = new THREE.ShapeGeometry(s, 8)
    return mergeGeometries(TOWER_LEVELS.flatMap((l, i) => [0, 1, 2, 3].map(k => {
      const g = base.clone(), ang = k * Math.PI / 2 + (i % 2) * Math.PI / 4, sc = Math.min(1, (l.y1 - l.y0) / 2.6)
      g.scale(sc, sc, 1); g.translate(0, l.y0 + 0.5, l.a + 0.01); g.rotateY(ang); return g
    })))
  }, [])
  const spire = useMemo(() => {
    const y = spireY, H = TOWER.h
    const p: [number, number][] = [[0, y], [0.9, y], [0.9, y + 0.3], [0.7, y + 0.35], [0.8, y + 0.8], [0.35, y + 1.05], [0.3, y + 1.15]]
    const rings = 7, r0 = y + 1.15, r1 = H - 1.2
    for (let i = 0; i < rings; i++) { const yy = r0 + (r1 - r0) * i / rings, rr = 0.42 - i * 0.03; p.push([0.14, yy + 0.08], [rr, yy + 0.1], [rr, yy + 0.18], [0.14, yy + 0.2]) }
    p.push([0.12, r1], [0.55, r1 + 0.12], [0.5, r1 + 0.2], [0.1, r1 + 0.25], [0.1, H - 0.6], [0.22, H - 0.45], [0.24, H - 0.3], [0.16, H - 0.1], [0.04, H - 0.01], [0, H])
    return lathe(p, { segs: 32, crease: 30 })
  }, [spireY])
  const plinth = useMemo(() => lathe([[0, 0], [oct(4), 0], [oct(4), 0.35], [oct(3.75), 0.45], [oct(3.75), 0.85], [oct(4), 0.95], [oct(4), 1.2], [0, 1.2]], { segs: 8, crease: 20 }), [])
  return <group position={[x, TER, z]}>
    <group rotation-y={Math.PI / 8}>
      <mesh geometry={plinth} castShadow receiveShadow><meshStandardMaterial color="#a7a196" roughness={0.85} /></mesh>
      <mesh geometry={bodies} castShadow receiveShadow><meshStandardMaterial map={brick} color="#d8d6d0" roughness={0.9} /></mesh>
      <mesh geometry={roofs} castShadow receiveShadow><meshStandardMaterial map={tiles} roughness={0.75} /></mesh>
    </group>
    <mesh geometry={doors}><meshStandardMaterial color="#121212" roughness={1} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={spire} castShadow><Metal kind="brass" grain="cast" rough={0.45} /></mesh>
    {/* 塔基周围一圈石板地 */}
    <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[7.5, 8]} /><meshStandardMaterial color="#b3ada2" roughness={0.9} /></mesh>
  </group>
}

// ---------- 树、远山 ----------
/** 树的位置：校园南边、西边一排行道树，楼后一片树林，公园里阔叶树和常绿树混着（不挡各课的视线） */
const TREES = (() => {
  const r = rng(71), out: { x: number; z: number; h: number; y: number; pine: boolean }[] = []
  for (let x = -74; x <= 44; x += 9) out.push({ x: x + r() * 2, z: 57 + r() * 1.5, h: 7 + r() * 2.5, y: 0, pine: false })                   // 南边一排
  for (let z = -38; z <= 50; z += 9) out.push({ x: -77 + r() * 1.5, z: z + r() * 2, h: 7 + r() * 2.5, y: 0, pine: false })                  // 西边一排
  for (const x of [-46, -40]) out.push({ x, z: -26 + r() * 2, h: 8 + r() * 2, y: 0, pine: false })                                         // 楼前西头
  for (let x = -40; x <= 40; x += 8) for (const z of [-50, -60]) out.push({ x: x + r() * 4, z: z - r() * 4, h: 8 + r() * 4, y: 0, pine: r() < 0.3 })   // 楼后的树林
  for (let i = 0; i < 26; i++) out.push({ x: -70 + r() * 120, z: -72 - r() * 45, h: 9 + r() * 4, y: 0, pine: r() < 0.35 })                // 楼后远一点的一片林子
  for (let i = 0; i < 70 && out.length < 118; i++) {                                                                                            // 公园
    const x = 62 + r() * 90, z = -40 + r() * 100
    if (!(z < -7 || x > 128) || Math.hypot(x - ST.tower.x, z) < 13) continue
    out.push({ x, z, h: 6 + r() * 5, y: TER, pine: r() < 0.5 })
  }
  return out
})()
function Trees() {
  return <>{TREES.map((t, i) => <Tree key={i} x={t.x} z={t.z} h={t.h} y={t.y} pine={t.pine} seed={i * 13 + 5} />)}</>
}
/** 校园北面、西面远处的住宅区：一栋栋高低、颜色、样式不同的住宅楼（阳台、窗套），楼顶有电梯机房、水箱、太阳能板 */
function City() {
  const blocks = useMemo(() => {
    const r = rng(83), out: { x: number; z: number; w: number; h: number; d: number; k: number; rot: number }[] = []
    const add = (x: number, z: number, rot = 0) => { const k = Math.floor(r() * 4), fl = k === 3 ? 6 + Math.floor(r() * 2) : r() < 0.6 ? 9 + Math.floor(r() * 6) : 15 + Math.floor(r() * 6); out.push({ x, z, w: 7 * (2 + Math.floor(r() * 3)), h: fl * 3, d: 12 + r() * 3, k, rot }) }
    for (let i = 0; i < 14; i++) add(-170 + i * 26 + r() * 8, -175 - r() * 30 - (i % 2) * 34)
    for (let i = 0; i < 6; i++) add(-128 - r() * 12 - (i % 2) * 30, -70 + i * 28, Math.PI / 2)
    return out.map(b => { const t = makeHousing(b.k).clone(); t.repeat.set(b.w / 7, b.h / 3); t.needsUpdate = true; const ts = makeHousing(b.k).clone(); ts.repeat.set(b.d / 7, b.h / 3); ts.needsUpdate = true; return { ...b, t, ts } })
  }, [])
  const roof = useMemo(() => {
    const r = rng(87), parts: Part[] = []
    for (const b of blocks) {
      const ca = Math.cos(b.rot), sa = Math.sin(b.rot), at = (u: number, v: number): [number, number] => [b.x + u * ca + v * sa, b.z - u * sa + v * ca]
      const [mx, mz] = at((r() - 0.5) * b.w * 0.4, 0); parts.push({ p: [mx, b.h + 1.6, mz], s: b.rot ? [4, 3.2, 5] : [5, 3.2, 4], c: '#b8b3a8' })                      // 电梯机房
      const [tx, tz] = at(b.w * 0.3, -2); parts.push({ p: [tx, b.h + 0.9, tz], s: [1.1, 1.8, 1.1], c: '#d6d6d0', cyl: true })                                         // 水箱
      for (let i = 0; i < 4; i++) { const [px, pz] = at(-b.w * 0.35 + i * 1.4, 3); parts.push({ p: [px, b.h + 0.5, pz], s: [1.2, 0.08, 2], c: '#2e3c4e', r: [0.5, b.rot, 0] }) }   // 太阳能板
      parts.push({ p: [b.x, b.h + 0.5, b.z], s: b.rot ? [b.d + 0.3, 1, b.w + 0.3] : [b.w + 0.3, 1, b.d + 0.3], c: '#cfcac0' })                                  // 女儿墙（实心一圈，远看够了）
    }
    return mergeParts(parts)
  }, [blocks])
  return <group>
    {blocks.map((b, i) => <group key={i} position={[b.x, 0, b.z]} rotation-y={b.rot}>
      <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow><boxGeometry args={[b.w, b.h, b.d]} /><meshStandardMaterial color="#d8d4cc" roughness={0.9} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[0, b.h / 2, s * (b.d / 2 + 0.02)]} rotation-y={s < 0 ? Math.PI : 0}><planeGeometry args={[b.w, b.h]} /><meshStandardMaterial map={b.t} roughness={0.8} /></mesh>)}
      {[-1, 1].map(s => <mesh key={`e${s}`} position={[s * (b.w / 2 + 0.02), b.h / 2, 0]} rotation-y={s * Math.PI / 2}><planeGeometry args={[b.d, b.h]} /><meshStandardMaterial map={b.ts} roughness={0.8} /></mesh>)}
    </group>)}
    <mesh geometry={roof} castShadow><Painted rough={0.8} metal={0.1} /></mesh>
  </group>
}
/** 远处一圈低山，挡住地平线 */
function Hills() {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(330, 370, 60, 96, 6, true), p = g.attributes.position, r = rng(79)
    const bumps = Array.from({ length: 9 }, () => [r() * 6.28, 0.4 + r() * 0.6, 0.3 + r() * 0.5])
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x)
      let h = 0; for (const [c, w, s] of bumps) h += s * Math.exp(-((Math.atan2(Math.sin(a - c), Math.cos(a - c))) ** 2) / (w * w * 0.2))
      if (y > 0) p.setY(i, -30 + (y + 30) * (0.25 + h))
    }
    g.computeVertexNormals(); return g
  }, [])
  return <mesh geometry={geo} position={[20, 0, 0]}><meshStandardMaterial color="#6c7a6a" roughness={1} side={THREE.BackSide} fog /></mesh>
}
