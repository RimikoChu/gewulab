// 图形的变换实验室的大场景：一座做瓷砖、窗花、花布的工坊院子。北面一排木梁瓦顶的敞廊，廊下是剪纸桌、木工台、彩绘瓷砖台，
// 后墙是青砖墙和贴着红窗花的木花窗，墙上挂着风车板；院子中间铺 30 cm 的青砖，摆着拷贝台和印花长桌；西边是放瓷砖的木架，东边晾着蓝印花布。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 个单位 = 1 m，x 朝东，z 朝南。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, mergeParts, Painted, shell, type Part } from '@/lab-kit'
import { tileFace } from './crafts'
import { makeBrick, makeCotton, makeFloor, makeGlaze, makeIndigo, makeLattice, makePinBoard, makePlaster, makeRedPaper, makeRoof, rng, woodDark, woodLight, woodRed } from './mats'

/** 各课的位置：x、z 是器材中心，y 是台面（或板面）的高度 */
export const TABLE_H = 0.8
export const ST = {
  l1: { x: -9.9, y: 0, z: 3.3 },         // 院子西南的青砖地
  l2: { x: -6, y: TABLE_H + 0.006, z: -5 },  // 剪纸桌（桌上铺一块毡垫）
  l3: { x: -0.5, y: 0.86 + 0.03, z: -5 },  // 木工台上平放的花窗底板
  l4: { x: 5, y: 1.45, z: -8.72 },       // 后墙上的风车板（板面朝南）
  l5: { x: 10.5, y: TABLE_H + 0.012, z: -4.6 }, // 彩绘瓷砖台
  l6: { x: -3, y: 0.92, z: 3.4 },        // 拷贝台的灯箱面
  l7: { x: 4.5, y: TABLE_H + 0.004, z: 3.4 },  // 印花长桌上的白布
  tuan: { x: -12, y: TABLE_H + 0.006, z: -5 }, // 西头的剪纸桌
  tess: { x: 10.6, y: 0, z: 4.6 },       // 院子东南的一块空地
}
const HALL = { x0: -16, x1: 16, z0: -9, z1: 10, eaveZ: -2.6, eaveH: 3.5, backH: 5.2 }

// ---------- 小工具 ----------
/** 一块按世界坐标铺贴图的板：贴图一格 k 米 */
function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? -p.getZ(i) / k : p.getY(i) / k)
  return g
}
const cloned = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c }

// ---------- 地面 ----------
function Ground() {
  const { map, bump } = makeFloor()
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(HALL.x1 - HALL.x0, HALL.z1 - HALL.z0); g.rotateX(-Math.PI / 2); g.translate((HALL.x0 + HALL.x1) / 2, 0, (HALL.z0 + HALL.z1) / 2)
    const p = g.attributes.position, uv = g.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.2, -p.getZ(i) / 1.2)   // 一张图 1.2 m；砖缝落在 0.3 m 的整数倍上（第 1 课的花砖沿砖缝走）
    return g
  }, [])
  const dirt = useMemo(() => { const t = makePlaster().clone(); t.needsUpdate = true; t.repeat.set(60, 60); return t }, [])
  return <group>
    <mesh geometry={geo} receiveShadow><meshStandardMaterial map={map} bumpMap={bump} bumpScale={1.2} roughness={0.88} color="#d9dad5" /></mesh>
    {/* 院墙外：夯土地 */}
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[600, 600]} /><meshStandardMaterial map={dirt} color="#8c8066" roughness={1} /></mesh>
    {/* 廊下的台基：比院子高一级 */}
    <mesh position={[0, 0.06, (HALL.z0 + HALL.eaveZ - 0.4) / 2]} receiveShadow><boxGeometry args={[HALL.x1 - HALL.x0, 0.12, HALL.eaveZ - 0.4 - HALL.z0]} /><meshStandardMaterial map={cloned(map, 26, 5.4)} bumpMap={cloned(bump, 26, 5.4)} bumpScale={1.2} roughness={0.88} color="#cfd0ca" /></mesh>
    <mesh position={[0, 0.06, HALL.eaveZ - 0.4]} castShadow receiveShadow><boxGeometry args={[HALL.x1 - HALL.x0, 0.12, 0.18]} /><meshStandardMaterial color="#8d8a82" roughness={0.85} /></mesh>
  </group>
}

// ---------- 北面的敞廊 ----------
/** 后墙（青砖，开一排木花窗，窗上贴红窗花）、檐柱、梁、瓦顶 */
function NorthHall() {
  const brick = useMemo(() => cloned(makeBrick(), 1, 1), [])
  const wall = useMemo(() => {
    // 后墙按 1.6 m 一格贴图；窗洞处断开
    const H = HALL.backH, z0 = HALL.z0 - 0.4, z1 = HALL.z0, wins = [-10, -2.5, 8.5, 13.5], ww = 1.6, y0 = 1.25, y1 = 2.65
    const parts: THREE.BufferGeometry[] = [slab(HALL.x0, HALL.x1, 0, y0, z0, z1, 1.6), slab(HALL.x0, HALL.x1, y1, H, z0, z1, 1.6)]
    let x = HALL.x0
    for (const w of wins) { parts.push(slab(x, w - ww / 2, y0, y1, z0, z1, 1.6)); x = w + ww / 2 }
    parts.push(slab(x, HALL.x1, y0, y1, z0, z1, 1.6))
    return { parts, wins, ww, y0, y1 }
  }, [])
  const lat = makeLattice(), red = makeRedPaper(), dark = woodDark()
  const roof = useMemo(() => cloned(makeRoof(), 18, 3), [])
  const cols = [-15.6, -12.9, -9, -3.3, 2.1, 7.7, 12.9, 15.6]
  const depth = HALL.eaveZ - HALL.z0, slope = Math.atan2(HALL.backH + 0.5 - HALL.eaveH, depth)
  const tiles = useMemo(() => {
    const L = Math.hypot(depth, HALL.backH + 0.5 - HALL.eaveH) + 1.6, r = rng(13), parts: Part[] = []
    for (let x = HALL.x0 - 0.2; x <= HALL.x1 + 0.2; x += 0.24) {
      const c = 52 + Math.floor(r() * 16), col = `rgb(${c},${c + 3},${c + 6})`
      parts.push({ p: [x, 0.05, 0], s: [0.072, L, 0], c: col, r: [Math.PI / 2, 0, 0], cyl: true })
      parts.push({ p: [x, 0.05, L / 2 + 0.012], s: [0.08, 0.024, 0], c: '#2c2f31', r: [Math.PI / 2, 0, 0], cyl: true })
    }
    return mergeParts(parts)
  }, [depth])
  // 窗花：一朵八瓣的红剪纸，贴在窗格中间
  const flower = useMemo(() => {
    const s = new THREE.Shape(); const n = 16
    for (let i = 0; i <= n * 4; i++) { const a = i / (n * 4) * Math.PI * 2, r = 0.22 + 0.07 * Math.cos(a * 8) + 0.02 * Math.cos(a * 24); const p = new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r); if (i === 0) s.moveTo(p.x, p.y); else s.lineTo(p.x, p.y) }
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2, h = new THREE.Path(); h.absarc(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.03, 0, Math.PI * 2, false); s.holes.push(h) }
    return new THREE.ShapeGeometry(s)
  }, [])
  return <group>
    {wall.parts.map((g, i) => <mesh key={i} geometry={g} receiveShadow><meshStandardMaterial map={brick} roughness={0.92} color="#d6d4cf" /></mesh>)}
    {/* 窗：窗框、木花窗格、窗后一层发白的窗纸，正中贴一朵红窗花 */}
    {wall.wins.map(wx => <group key={wx} position={[wx, (wall.y0 + wall.y1) / 2, HALL.z0 - 0.2]}>
      <mesh position={[0, 0, -0.06]}><planeGeometry args={[wall.ww, wall.y1 - wall.y0]} /><meshStandardMaterial color="#f3ecd8" emissive="#fff4d8" emissiveIntensity={0.55} roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.02]}><planeGeometry args={[wall.ww, wall.y1 - wall.y0]} /><meshStandardMaterial map={lat} transparent alphaTest={0.5} roughness={0.7} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={flower} position={[0, 0, -0.03]}><meshStandardMaterial map={red} color="#ff4b3a" roughness={0.85} side={THREE.DoubleSide} /></mesh>
      {[[-1, 0], [1, 0]].map(([s]) => <mesh key={s} position={[s * (wall.ww / 2 + 0.05), 0, 0.12]} castShadow><boxGeometry args={[0.1, wall.y1 - wall.y0 + 0.2, 0.1]} /><meshStandardMaterial map={dark} roughness={0.7} /></mesh>)}
      {[-1, 1].map(s => <mesh key={s} position={[0, s * ((wall.y1 - wall.y0) / 2 + 0.05), 0.12]} castShadow><boxGeometry args={[wall.ww + 0.2, 0.1, 0.12]} /><meshStandardMaterial map={dark} roughness={0.7} /></mesh>)}
    </group>)}
    {/* 檐柱：朱红，石柱础 */}
    {cols.map(cx => <group key={cx} position={[cx, 0.12, HALL.eaveZ]}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow><cylinderGeometry args={[0.2, 0.24, 0.12, 20]} /><meshStandardMaterial color="#9a978e" roughness={0.85} /></mesh>
      <mesh position={[0, (HALL.eaveH - 0.12) / 2, 0]} castShadow><cylinderGeometry args={[0.13, 0.14, HALL.eaveH - 0.12, 20]} /><meshStandardMaterial color="#7e2b1f" roughness={0.5} /></mesh>
    </group>)}
    {/* 檐檩和穿插枋 */}
    <mesh position={[0, HALL.eaveH, HALL.eaveZ]} castShadow><boxGeometry args={[HALL.x1 - HALL.x0, 0.24, 0.22]} /><meshStandardMaterial map={dark} roughness={0.7} /></mesh>
    {cols.map(cx => <mesh key={cx} position={[cx, HALL.eaveH - 0.15, (HALL.z0 + HALL.eaveZ) / 2]} castShadow><boxGeometry args={[0.16, 0.22, depth]} /><meshStandardMaterial map={dark} roughness={0.7} /></mesh>)}
    {/* 一坡的瓦顶：从后墙顶斜到檐口，伸出檐柱 0.8 m；檐下一排椽子 */}
    <group position={[0, (HALL.eaveH + HALL.backH + 0.5) / 2 + 0.12, (HALL.z0 + HALL.eaveZ) / 2 + 0.4]} rotation-x={slope}>
      <mesh castShadow receiveShadow><boxGeometry args={[HALL.x1 - HALL.x0 + 0.6, 0.1, Math.hypot(depth, HALL.backH + 0.5 - HALL.eaveH) + 1.6]} /><meshStandardMaterial map={roof} roughness={0.85} /></mesh>
      {/* 小青瓦：一垄一垄的盖瓦顺着坡往下，檐口一排圆的瓦当 */}
      <mesh geometry={tiles} castShadow receiveShadow><Painted rough={0.75} metal={0.05} /></mesh>
      <mesh position={[0, -0.09, 0]}><boxGeometry args={[HALL.x1 - HALL.x0 + 0.5, 0.06, Math.hypot(depth, HALL.backH + 0.5 - HALL.eaveH) + 1.5]} /><meshStandardMaterial map={woodLight()} color="#8a6a4a" roughness={0.8} /></mesh>
    </group>
    {/* 两头的山墙 */}
    {[HALL.x0 - 0.2, HALL.x1 + 0.2].map(x => <mesh key={x} position={[x, HALL.backH / 2, (HALL.z0 + HALL.eaveZ) / 2]} castShadow receiveShadow><boxGeometry args={[0.4, HALL.backH, depth + 0.4]} /><meshStandardMaterial map={cloned(makeBrick(), 4, 3)} roughness={0.92} color="#cfcdc8" /></mesh>)}
    {/* 檐下两盏红灯笼 */}
    {[-3.3 + 2.7, 7.7 + 2.6].map(x => <Lantern key={x} x={x} z={HALL.eaveZ + 0.1} y={HALL.eaveH - 0.55} />)}
  </group>
}

function Lantern({ x, y, z }: { x: number; y: number; z: number }) {
  const body = useMemo(() => lathe([[0, -0.2], [0.12, -0.19], [0.2, -0.1], [0.22, 0], [0.2, 0.1], [0.12, 0.19], [0, 0.2]], { segs: 24, crease: 50 }), [])
  return <group position={[x, y, z]}>
    <mesh geometry={body} castShadow><meshStandardMaterial color="#c4271f" emissive="#ff5a2a" emissiveIntensity={0.35} roughness={0.7} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[0, s * 0.215, 0]}><cylinderGeometry args={[0.07, 0.07, 0.04, 16]} /><Metal kind="brass" /></mesh>)}
    <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.004, 0.004, 0.28, 6]} /><meshStandardMaterial color="#2a1a10" /></mesh>
    <mesh position={[0, -0.32, 0]}><cylinderGeometry args={[0.03, 0.01, 0.2, 10]} /><meshStandardMaterial color="#e8b440" roughness={0.9} /></mesh>
  </group>
}

// ---------- 家具 ----------
/** 一张木桌：厚台面（带倒角）、四条方腿、牙板、下面一圈横撑 */
export function Table({ x, z, w, d, h = TABLE_H, wood = 'light' }: { x: number; z: number; w: number; d: number; h?: number; wood?: 'light' | 'dark' | 'red' }) {
  const map = wood === 'light' ? woodLight() : wood === 'dark' ? woodDark() : woodRed()
  const top = 0.05, leg = 0.065, base = x > -20 && z < HALL.eaveZ - 0.4 ? 0.12 : 0
  return <group position={[x, base, z]}>
    <RoundedBox args={[w, top, d]} radius={0.012} smoothness={2} position={[0, h - base - top / 2, 0]} castShadow receiveShadow><meshStandardMaterial map={map} roughness={0.62} /></RoundedBox>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.08), (h - base - top) / 2, sz * (d / 2 - 0.08)]} castShadow><boxGeometry args={[leg, h - base - top, leg]} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>)}
    {[-1, 1].map(s => <mesh key={`a${s}`} position={[0, h - base - top - 0.05, s * (d / 2 - 0.08)]} castShadow><boxGeometry args={[w - 0.2, 0.09, 0.025]} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>)}
    {[-1, 1].map(s => <mesh key={`b${s}`} position={[s * (w / 2 - 0.08), 0.16, 0]} castShadow><boxGeometry args={[0.035, 0.04, d - 0.2]} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>)}
    <mesh position={[0, 0.16, 0]} castShadow><boxGeometry args={[w - 0.2, 0.04, 0.035]} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>
  </group>
}

/** 方凳 */
function Stool({ x, z, r = 0 }: { x: number; z: number; r?: number }) {
  const map = woodDark()
  return <group position={[x, x > -20 && z < HALL.eaveZ - 0.4 ? 0.12 : 0, z]} rotation-y={r}>
    <RoundedBox args={[0.34, 0.04, 0.34]} radius={0.01} smoothness={2} position={[0, 0.46, 0]} castShadow receiveShadow><meshStandardMaterial map={map} roughness={0.6} /></RoundedBox>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[sx * 0.13, 0.22, sz * 0.13]} rotation={[sz * 0.06, 0, -sx * 0.06]} castShadow><boxGeometry args={[0.04, 0.46, 0.04]} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>)}
  </group>
}

/** 第 3 课的木工台：更厚的台面、台钳、台面下一层放刨子和木条的隔板 */
function Workbench() {
  const { x, z } = ST.l3, h = 0.86, map = woodLight(), w = 1.9, d = 1.25
  return <group position={[x, 0.12, z]}>
    <RoundedBox args={[w, 0.08, d]} radius={0.015} smoothness={2} position={[0, h - 0.12 - 0.04, 0]} castShadow receiveShadow><meshStandardMaterial map={map} roughness={0.62} color="#d9b88a" /></RoundedBox>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.1), (h - 0.2) / 2, sz * (d / 2 - 0.1)]} castShadow><boxGeometry args={[0.09, h - 0.2, 0.09]} /><meshStandardMaterial map={map} roughness={0.7} color="#b8946a" /></mesh>)}
    <mesh position={[0, 0.22, 0]} receiveShadow castShadow><boxGeometry args={[w - 0.2, 0.03, d - 0.2]} /><meshStandardMaterial map={map} roughness={0.8} color="#a88660" /></mesh>
    {/* 隔板上的一摞木条 */}
    {[0, 1, 2, 3, 4].map(k => <mesh key={k} position={[-0.3 + (k % 3) * 0.05, 0.26 + Math.floor(k / 3) * 0.03, -0.2]} castShadow><boxGeometry args={[0.03, 0.025, 0.9]} /><meshStandardMaterial map={woodDark()} roughness={0.7} /></mesh>)}
    {/* 前沿右边一只木台钳 */}
    <mesh position={[w / 2 - 0.3, h - 0.2, d / 2 + 0.03]} castShadow><boxGeometry args={[0.32, 0.16, 0.06]} /><meshStandardMaterial map={map} roughness={0.7} color="#9c7650" /></mesh>
    <mesh position={[w / 2 - 0.3, h - 0.2, d / 2 + 0.12]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.18, 12]} /><Metal kind="steel" grain="turned" /></mesh>
  </group>
}

/** 第 6 课的拷贝台：铝框灯箱，乳白的亚克力面板从里面透出光 */
function LightBox() {
  const { x, z } = ST.l6, top = ST.l6.y, W = 0.86, D = 0.62
  return <group>
    <Table x={x} z={z} w={1.3} d={0.9} h={TABLE_H} wood="dark" />
    <group position={[x, TABLE_H, z]}>
      <RoundedBox args={[W, top - TABLE_H - 0.004, D]} radius={0.01} smoothness={2} position={[0, (top - TABLE_H) / 2, 0]} castShadow receiveShadow><Metal kind="aluminum" rough={0.42} env={0.7} /></RoundedBox>
      <mesh position={[0, top - TABLE_H - 0.002, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[W - 0.05, D - 0.05]} /><meshStandardMaterial color="#fbfaf4" emissive="#fff8e6" emissiveIntensity={0.9} roughness={0.3} /></mesh>
      {/* 前面一个开关、一根电线 */}
      <mesh position={[W / 2 - 0.08, 0.06, D / 2 + 0.001]}><boxGeometry args={[0.04, 0.02, 0.004]} /><meshStandardMaterial color="#222" roughness={0.4} /></mesh>
    </group>
  </group>
}

/** 东边的晾布架：两排竹竿，挂着蓝印花布 */
function DryingRack() {
  const ind = makeIndigo()
  const cloths = [[13.2, 0.4], [13.2, 2.8], [13.2, 5.2], [14.6, 1.6], [14.6, 4.0], [14.6, 6.4]] as const
  return <group>
    {[13.2, 14.6].map(x => <group key={x}>
      {[-0.8, 7.6].map(z => <mesh key={z} position={[x, 1.6, z]} castShadow><cylinderGeometry args={[0.04, 0.05, 3.2, 10]} /><meshStandardMaterial color="#b49a62" roughness={0.7} /></mesh>)}
      <mesh position={[x, 3.1, 3.4]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.03, 0.03, 8.6, 10]} /><meshStandardMaterial color="#c9b27a" roughness={0.6} /></mesh>
    </group>)}
    {cloths.map(([x, z], i) => <Cloth key={i} x={x} z={z} map={ind} seed={i} />)}
  </group>
}
/** 一匹挂在竹竿上的布：从竿上搭下来，下摆微微飘起 */
function Cloth({ x, z, map, seed }: { x: number; z: number; map: THREE.Texture; seed: number }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(2.2, 2.6, 24, 12), p = g.attributes.position, r = rng(seed + 3), ph = r() * 6
    for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i), k = (1.3 - v) / 2.6; p.setZ(i, Math.sin(u * 4 + ph) * 0.05 + k * k * 0.18 * Math.sin(u * 2 + ph)) }
    g.computeVertexNormals(); return g
  }, [seed])
  const m = useMemo(() => cloned(map, 1.2, 1.4), [map])
  return <mesh geometry={geo} position={[x, 3.1 - 1.3, z]} rotation-y={Math.PI / 2} castShadow receiveShadow><meshStandardMaterial map={m} roughness={0.95} side={THREE.DoubleSide} /></mesh>
}

/** 西边的瓷砖架：三层木板，码着青花、白釉、绿釉的方砖 */
function TileShelf() {
  const geo = useMemo(() => {
    const r = rng(91), parts: Part[] = []
    const cols = ['#e8ecef', '#2d5a9a', '#3e8a6c', '#c9a14a', '#f0efe8', '#8b3a2e']
    for (let lvl = 0; lvl < 3; lvl++) for (let k = 0; k < 9; k++) {
      const z = -0.2 + k * 0.62 + (r() - 0.5) * 0.06, n = 3 + Math.floor(r() * 9), c = cols[Math.floor(r() * cols.length)]
      for (let j = 0; j < n; j++) parts.push({ p: [0, 0.42 + lvl * 0.62 + j * 0.012 + 0.006, z + (r() - 0.5) * 0.01], s: [0.3, 0.01, 0.3], c: j % 4 === 3 ? '#b9b2a4' : c })
    }
    return mergeParts(parts)
  }, [])
  const map = woodDark()
  return <group position={[-15.4, 0, 0.8]}>
    {[0, 1, 2].map(l => <mesh key={l} position={[0, 0.4 + l * 0.62, 2.3]} castShadow receiveShadow><boxGeometry args={[0.42, 0.03, 5.6]} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>)}
    {[-0.4, 2.3, 5].map(z => <mesh key={z} position={[0, 1.0, z]} castShadow><boxGeometry args={[0.44, 2.0, 0.05]} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>)}
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.3} metal={0} /></mesh>
  </group>
}

/** 染缸：深褐釉的大陶缸，口沿外翻，里面是一缸靛蓝 */
function Vat({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  const geo = useMemo(() => shell([[0, 0], [0.22, 0], [0.34, 0.12], [0.4, 0.36], [0.38, 0.6], [0.34, 0.68], [0.37, 0.7]], 0.025, { segs: 40, crease: 40 }), [])
  return <group position={[x, 0, z]} scale={s}>
    <mesh geometry={geo} castShadow receiveShadow><meshPhysicalMaterial color="#3b2518" roughness={0.3} clearcoat={0.6} /></mesh>
    <mesh position={[0, 0.6, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.33, 32]} /><meshStandardMaterial color="#0f1c3a" roughness={0.15} /></mesh>
  </group>
}

/** 一摞铺地用的青砖，靠在院子边上 */
function BrickPile({ x, z, n = 8 }: { x: number; z: number; n?: number }) {
  const geo = useMemo(() => { const r = rng(x * 7 + z), parts: Part[] = []; for (let j = 0; j < n; j++) for (let i = 0; i < 2; i++) parts.push({ p: [i * 0.31 + (r() - 0.5) * 0.02, 0.02 + j * 0.042, (r() - 0.5) * 0.02], s: [0.3, 0.04, 0.3], c: `rgb(${100 + r() * 20},${104 + r() * 20},${106 + r() * 20})` }); return mergeParts(parts) }, [x, z, n])
  return <mesh geometry={geo} position={[x, 0, z]} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh>
}

/** 南面的矮院墙和门 */
function SouthWall() {
  const plaster = useMemo(() => cloned(makePlaster(), 8, 1), [])
  const roof = useMemo(() => cloned(makeRoof(), 20, 1), [])
  return <group>
    {[[-16, -2], [2, 16]].map(([a, b]) => <group key={a}>
      <mesh position={[(a + b) / 2, 1.2, HALL.z1 + 0.2]} castShadow receiveShadow><boxGeometry args={[b - a, 2.4, 0.36]} /><meshStandardMaterial map={plaster} roughness={0.95} /></mesh>
      <mesh position={[(a + b) / 2, 2.5, HALL.z1 + 0.2]} castShadow><boxGeometry args={[b - a + 0.2, 0.16, 0.7]} /><meshStandardMaterial map={roof} roughness={0.85} /></mesh>
    </group>)}
    {[HALL.x0 - 0.2, HALL.x1 + 0.2].map(x => <mesh key={x} position={[x, 1.2, (HALL.eaveZ + HALL.z1) / 2]} castShadow receiveShadow><boxGeometry args={[0.36, 2.4, HALL.z1 - HALL.eaveZ + 0.4]} /><meshStandardMaterial map={plaster} roughness={0.95} /></mesh>)}
  </group>
}

/** 第 4 课的风车板：挂在后墙上的一块松木板，四边一圈深色的木框 */
function PinBoard() {
  const { x, y, z } = ST.l4, S = 0.96, map = makePinBoard(), dark = woodDark()
  return <group position={[x, y, z]}>
    <mesh position={[0, 0, -0.012]} receiveShadow castShadow><boxGeometry args={[S, S, 0.024]} /><meshStandardMaterial map={map} roughness={0.75} /></mesh>
    {[[0, 1], [0, -1], [1, 0], [-1, 0]].map(([sx, sy]) => <RoundedBox key={`${sx}${sy}`} args={sx ? [0.06, S + 0.12, 0.05] : [S + 0.12, 0.06, 0.05]} radius={0.008} smoothness={2} position={[sx * (S / 2 + 0.03), sy * (S / 2 + 0.03), 0]} castShadow><meshStandardMaterial map={dark} roughness={0.6} /></RoundedBox>)}
    {/* 挂板的两颗铁钉 */}
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.4, S / 2 + 0.03, 0.03]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.008, 0.008, 0.01, 12]} /><Metal kind="iron" /></mesh>)}
  </group>
}

/** 剪纸桌上的东西：墨绿的毡垫、一摞红纸、一只针线笸箩 */
function PaperTable({ x, z }: { x: number; z: number }) {
  const red = makeRedPaper()
  const bowl = useMemo(() => shell([[0, 0], [0.09, 0], [0.13, 0.05], [0.14, 0.06]], 0.006, { segs: 32 }), [])
  return <group>
    <Table x={x} z={z} w={1.5} d={0.9} wood="red" />
    <RoundedBox args={[0.7, 0.006, 0.5]} radius={0.002} smoothness={1} position={[x, TABLE_H + 0.003, z]} receiveShadow><meshStandardMaterial color="#27463a" roughness={0.95} /></RoundedBox>
    {[0, 1, 2, 3, 4, 5].map(k => <mesh key={k} position={[x - 0.56, TABLE_H + 0.001 + k * 0.0012, z - 0.12 + k * 0.004]} rotation-y={k * 0.05} receiveShadow castShadow><boxGeometry args={[0.24, 0.0012, 0.24]} /><meshStandardMaterial map={red} roughness={0.85} /></mesh>)}
    <mesh geometry={bowl} position={[x + 0.56, TABLE_H, z - 0.2]} castShadow receiveShadow><meshStandardMaterial map={woodLight()} color="#c8a46e" roughness={0.8} side={THREE.DoubleSide} /></mesh>
    <Stool x={x} z={z + 0.75} />
  </group>
}

/** 彩绘瓷砖台：台面铺满白釉方砖，旁边一只调色碟、一支毛笔 */
function TileTable() {
  const { x, z } = ST.l5, glaze = useMemo(() => cloned(makeGlaze(), 1.6 / 0.8, 1 / 0.8), [])
  const dish = useMemo(() => shell([[0, 0], [0.05, 0], [0.065, 0.012], [0.07, 0.016]], 0.003, { segs: 32 }), [])
  return <group>
    <Table x={x} z={z} w={1.6} d={1.0} wood="dark" />
    {/* 白釉砖面：一张图 0.8 m，和台面的中心对齐 */}
    <mesh position={[x, TABLE_H + 0.006, z]} receiveShadow><boxGeometry args={[1.6, 0.012, 1.0]} /><meshPhysicalMaterial map={glaze} roughness={0.2} clearcoat={0.6} clearcoatRoughness={0.15} /></mesh>
    <mesh geometry={dish} position={[x + 0.62, TABLE_H + 0.012, z - 0.32]} castShadow receiveShadow><meshPhysicalMaterial color="#f2f2ee" roughness={0.15} clearcoat={0.8} /></mesh>
    <mesh position={[x + 0.62, TABLE_H + 0.016, z - 0.32]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.03, 20]} /><meshStandardMaterial color="#1f4fae" roughness={0.3} /></mesh>
    <group position={[x + 0.55, TABLE_H + 0.02, z + 0.3]} rotation={[0, 0.5, Math.PI / 2]}>
      <mesh castShadow><cylinderGeometry args={[0.0045, 0.0045, 0.2, 10]} /><meshStandardMaterial color="#9b7b3a" roughness={0.6} /></mesh>
      <mesh position={[0, -0.115, 0]}><coneGeometry args={[0.006, 0.03, 10]} /><meshStandardMaterial color="#222" roughness={0.9} /></mesh>
    </group>
    <Stool x={x - 0.2} z={z + 0.85} r={0.3} />
  </group>
}

/** 印花长桌：上面铺的白布由第 7 课画；这里是桌子、布下面的毡垫、一摞叠好的布和一只蓝靛盆 */
function PrintTable() {
  const { x, z } = ST.l7, cot = useMemo(() => cloned(makeCotton(), 3, 3), [])
  return <group>
    <Table x={x} z={z} w={2.0} d={1.0} wood="light" />
    {[0, 1, 2].map(k => <RoundedBox key={k} args={[0.34, 0.03, 0.26]} radius={0.01} smoothness={2} position={[x - 0.8, TABLE_H + 0.015 + k * 0.03, z - 0.3 + k * 0.005]} castShadow receiveShadow><meshStandardMaterial map={cot} color={k === 2 ? '#2a3f78' : '#efeadf'} roughness={0.95} /></RoundedBox>)}
    <Vat x={x + 1.6} z={z - 0.9} s={0.9} />
  </group>
}

/** 院子西南、第 1 课旁边：靠墙一摞青砖、一把扫帚 */
function FloorProps() {
  return <group>
    <BrickPile x={-14.4} z={7.6} n={10} />
    <BrickPile x={-13.7} z={8.2} n={6} />
    <BrickPile x={14.0} z={8.6} n={7} />
    <Vat x={8.6} z={7.4} />
    <Vat x={9.6} z={7.9} s={0.85} />
    <Stool x={-2.2} z={4.3} r={0.2} />
    <Stool x={4.0} z={4.5} r={-0.3} />
  </group>
}

/** 院子中间一块拼花地面：青花白釉的方砖，30 cm 一块，四周一圈青砖 */
function FloorInlay() {
  const map = useMemo(() => { const t = tileFace('#ece6d6', '#2b4f9a', '#7d9fd6').clone(); t.needsUpdate = true; t.repeat.set(10, 8); return t }, [])
  return <group position={[0.15, 0, 6.3]}>
    <mesh position={[0, 0.004, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[3.0, 2.4]} /><meshPhysicalMaterial map={map} roughness={0.25} clearcoat={0.6} clearcoatRoughness={0.2} /></mesh>
    {[[0, 1.25, 3.2, 0.1], [0, -1.25, 3.2, 0.1], [1.55, 0, 0.1, 2.6], [-1.55, 0, 0.1, 2.6]].map(([x, z, w, d], i) => <mesh key={i} position={[x, 0.008, z]} receiveShadow><boxGeometry args={[w, 0.016, d]} /><meshStandardMaterial color="#6e6a62" roughness={0.9} /></mesh>)}
  </group>
}

/** 码在地上的一摞釉面花砖：每块 30 cm 见方、2.2 cm 厚，顶面是花砖面，侧面是砖坯 */
function TilePile({ x, z, n, face, r = 0 }: { x: number; z: number; n: number; face: 'src' | 'img'; r?: number }) {
  const mats = useMemo(() => {
    const c = face === 'src' ? ['#2a62c4', '#f3f0e6', '#9cc2ff'] : ['#e58a2c', '#fff3df', '#8a3a0a']
    const top = new THREE.MeshPhysicalMaterial({ map: tileFace(c[0], c[1], c[2]), roughness: 0.18, clearcoat: 0.9 }), body = new THREE.MeshStandardMaterial({ color: '#c89a72', roughness: 0.85 })
    return [body, body, top, body, body, body]
  }, [face])
  return <group position={[x, 0, z]} rotation-y={r}>
    {Array.from({ length: n }, (_, i) => <mesh key={i} position={[(i % 2) * 0.006, 0.011 + i * 0.023, (i % 3) * 0.004]} rotation-y={(i % 3 - 1) * 0.03} material={mats} castShadow receiveShadow><boxGeometry args={[0.3, 0.022, 0.3]} /></mesh>)}
  </group>
}

export function World() {
  const disk = useMemo(() => disc(0.18, 0.05), [])
  return (
    <group>
      <Ground />
      <NorthHall />
      <SouthWall />
      <PinBoard />
      <PaperTable x={ST.l2.x} z={ST.l2.z} />
      <PaperTable x={ST.tuan.x} z={ST.tuan.z} />
      <Workbench />
      <TileTable />
      <LightBox />
      <PrintTable />
      <TileShelf />
      <DryingRack />
      <FloorProps />
      {/* 院子东南一口石臼 */}
      <mesh geometry={disk} position={[7.2, 0, 8.6]} castShadow receiveShadow><meshStandardMaterial color="#8f8c84" roughness={0.9} /></mesh>
      <FloorInlay />
      <TilePile x={-11.3} z={2.6} n={7} face="src" />
      <TilePile x={-11.25} z={1.95} n={4} face="img" r={0.3} />
      <TilePile x={9.6} z={5.6} n={5} face="img" r={-0.2} />
    </group>
  )
}
