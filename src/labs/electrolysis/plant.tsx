// 化验室以外的厂区：氯碱车间（一排离子膜电解槽、整流柜，最前面一台单元槽朝镜头剖开）、电镀车间（镀槽线、单轨吊）、
// 电冶金车间（剖开的熔盐电解槽、抬包）、厂外码头（栈桥、钢管桩，海水朝镜头剖开），以及储罐、管廊、盐堆、行道树和远处的厂房。
// 这里只画不动的东西；气泡、镀件、锌块这些随课变化的由各课自己画。尺寸按画面单位写（1 m = 6 个单位）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, makeStrata, mergeParts, useFaceGradient, useRipple, type Part } from '@/lab-kit'
import { cutTex, facadeTex, makeSign, meshTex, ribTex, rng, tankLabel, wallTex } from './mats'
import { Tree } from './trees'

type V3 = [number, number, number]
/** 剖开的单元槽：中心 x、z，宽、高、进深，底面高度，壁厚，液面到槽高的几成 */
export const CELL = { x: 38, z: -15, w: 20, h: 13, d: 6.5, y0: 4.2, wall: 0.5, level: 0.8 }
/** 前壁透明的镀槽：三根横在槽口的铜排在 x 方向的位置（两边挂阳极，中间挂阴极） */
export const TANK = { x: 138, z: -15, w: 18, h: 8.5, d: 8, y0: 0.6, wall: 0.45, level: 0.86, bars: [-6.2, 0, 6.2], rail: 25 }
/** 熔盐电解槽 */
export const POT = { x: 234, z: -15, w: 22, h: 9.5, d: 8, y0: 3.2, lining: 1.4, level: 0.6 }
/** 码头：岸壁的 x、钢管桩的位置和半径、海面和海床的高度、栈桥桥面的高度、海水剖面的 z */
export const PIER = { quay: 312, x: 346, z: -10, r: 1.25, sea: -4.5, bed: -24, deck: 2.4, cut: -3.2 }
const SHEDS = [
  { x0: 0, x1: 76, z0: -62, z1: -3, eave: 31, name: '氯碱车间', color: [176, 190, 196] as [number, number, number] },
  { x0: 96, x1: 176, z0: -62, z1: -3, eave: 31, name: '电镀车间', color: [196, 190, 172] as [number, number, number] },
  { x0: 196, x1: 272, z0: -62, z1: -3, eave: 31, name: '电冶金车间', color: [186, 178, 170] as [number, number, number] },
]

/** 沿几个点走的一根管子，拐角略带圆弧 */
export function pipeGeo(pts: V3[], r: number, seg = 10) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.06)
  return new THREE.TubeGeometry(c, pts.length * 14, r, seg)
}
const box = (P: Part[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, c: string) => P.push({ p: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], s: [x1 - x0, y1 - y0, z1 - z0], c })

// ---------- 钢结构敞棚 ----------
/** 一座钢结构车间：四排工字钢柱、人字屋架、压型钢板的屋面和后墙（后墙上一条采光带），两侧上半截封板，正面敞开，檐口一块厂名牌 */
function Shed({ x0, x1, z0, z1, eave, name, color }: typeof SHEDS[number]) {
  const ridge = eave + 7, zc = (z0 + z1) / 2, n = 3, span = (x1 - x0) / n
  const tex = useMemo(() => {
    const mk = (rx: number, ry: number, rot = false) => { const t = ribTex(color).clone(); t.repeat.set(rx, ry); if (rot) { t.rotation = Math.PI / 2; t.center.set(0.5, 0.5) } t.needsUpdate = true; return t }
    return { back: mk((x1 - x0) / 5, 1), side: mk((z1 - z0) / 5, 1), roof: mk((x1 - x0) / 5, 1), sign: makeSign([name], '#1d5c56', '#ffffff', 512, 112) }
  }, [x0, x1, z0, z1, name, color])
  const geo = useMemo(() => {
    const P: Part[] = [], steel = '#5d6f7a'
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * span
      for (const z of [z0 + 0.6, z1 - 0.6]) { box(P, x - 0.45, x + 0.45, 0, eave, z - 0.5, z + 0.5, steel); box(P, x - 0.9, x + 0.9, 0, 0.5, z - 0.9, z + 0.9, '#8d8a80') }
      // 人字屋架：上弦、下弦和几根腹杆
      const L = Math.hypot(zc - z0, ridge - eave), a = Math.atan2(ridge - eave, zc - z0)
      for (const s of [-1, 1]) P.push({ p: [x, (eave + ridge) / 2, zc + s * (zc - z0) / 2], s: [0.4, 0.5, L], c: steel, r: [s * a, 0, 0] })
      box(P, x - 0.2, x + 0.2, eave - 0.25, eave + 0.25, z0, z1, steel)
      for (const k of [-0.6, -0.3, 0, 0.3, 0.6]) { const z = zc + k * (z1 - z0) / 2, top = ridge - Math.abs(k) * (ridge - eave); box(P, x - 0.12, x + 0.12, eave, top, z - 0.12, z + 0.12, steel) }
    }
    // 檩条和檐口的通长梁
    for (const k of [-0.8, -0.4, 0.4, 0.8]) { const z = zc + k * (z1 - z0) / 2, y = ridge - Math.abs(k) * (ridge - eave) + 0.3; box(P, x0, x1, y - 0.15, y + 0.15, z - 0.15, z + 0.15, '#7b8a92') }
    box(P, x0, x1, eave - 3.4, eave, z1 - 0.9, z1 - 0.5, '#d9dcd8')
    // 棚顶吊着的一排工矿灯
    for (let i = 0; i < n; i++) for (const z of [zc - 12, zc + 14]) { const x = x0 + (i + 0.5) * span; box(P, x - 0.06, x + 0.06, eave - 3, eave, z - 0.06, z + 0.06, '#33383c'); P.push({ p: [x, eave - 3.4, z], s: [1.1, 0.8, 1.1], c: '#2c3135', cyl: true }) }
    return mergeParts(P)
  }, [x0, x1, z0, z1, eave, ridge, zc, span])
  const roof = useMemo(() => {
    const L = Math.hypot(zc - z0, ridge - eave) + 1.2, a = Math.atan2(ridge - eave, zc - z0)
    return [-1, 1].map(s => ({ p: [(x0 + x1) / 2, (eave + ridge) / 2 + 0.5, zc + s * (zc - z0 + 1) / 2] as V3, r: [s * a, 0, 0] as V3, L }))
  }, [x0, x1, z0, eave, ridge, zc])
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.55} metal={0.3} /></mesh>
    {roof.map((r, i) => <mesh key={i} position={r.p} rotation={r.r} castShadow receiveShadow><boxGeometry args={[x1 - x0 + 2, 0.3, r.L]} /><meshStandardMaterial map={tex.roof} roughness={0.6} metalness={0.3} /></mesh>)}
    {/* 后墙：下面一截砖墙，中间压型钢板，一条乳白的采光带 */}
    <mesh position={[(x0 + x1) / 2, 2, z0]} receiveShadow><boxGeometry args={[x1 - x0, 4, 0.6]} /><meshStandardMaterial color="#a9a69b" roughness={0.9} /></mesh>
    <mesh position={[(x0 + x1) / 2, 10, z0]} receiveShadow><boxGeometry args={[x1 - x0, 12, 0.3]} /><meshStandardMaterial map={tex.back} roughness={0.6} metalness={0.25} /></mesh>
    <mesh position={[(x0 + x1) / 2, 19.5, z0]}><boxGeometry args={[x1 - x0, 7, 0.2]} /><meshStandardMaterial color="#e6ece6" emissive="#dfe9e2" emissiveIntensity={0.28} roughness={0.5} /></mesh>
    <mesh position={[(x0 + x1) / 2, (23 + eave) / 2, z0]}><boxGeometry args={[x1 - x0, eave - 23, 0.3]} /><meshStandardMaterial map={tex.back} roughness={0.6} metalness={0.25} /></mesh>
    {[x0, x1].map(x => <mesh key={x} position={[x, (16 + eave) / 2, zc]} castShadow><boxGeometry args={[0.3, eave - 16, z1 - z0]} /><meshStandardMaterial map={tex.side} roughness={0.6} metalness={0.25} /></mesh>)}
    <mesh position={[(x0 + x1) / 2, eave - 1.7, z1 - 0.48]}><planeGeometry args={[15, 3]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
    {/* 车间地坪：比厂区地面略高的一块环氧地坪，四周一道黄线 */}
    <mesh position={[(x0 + x1) / 2, 0.06, zc]} receiveShadow><boxGeometry args={[x1 - x0, 0.12, z1 - z0]} /><meshStandardMaterial color="#7f8f8a" roughness={0.42} /></mesh>
    <mesh position={[(x0 + x1) / 2, 0.125, z1 - 1.6]} rotation-x={-Math.PI / 2}><planeGeometry args={[x1 - x0 - 4, 0.35]} /><meshStandardMaterial color="#e3b21c" roughness={0.6} /></mesh>
  </group>
}

// ---------- 氯碱车间 ----------
/** 一台复极式离子膜电解槽：两块厚端板夹着几十片单元槽框，四根拉杆拉紧，坐在带绝缘子的钢底架上；上面两根总管（氯气、氢气），每隔几片一根软管接上去 */
function stackParts(P: Part[], x0: number, x1: number, z: number) {
  const y0 = 3.2, h = 9, d = 5
  box(P, x0 - 1, x1 + 1, 1.6, 2.2, z - 2.2, z + 2.2, '#4b5560')
  for (let x = x0; x <= x1 + 0.1; x += (x1 - x0) / 4) for (const s of [-1, 1]) { P.push({ p: [x, 0.8, z + s * 1.8], s: [0.5, 1.6, 0.5], c: '#e9e7df', cyl: true }); box(P, x - 0.6, x + 0.6, 0, 0.3, z + s * 1.8 - 0.6, z + s * 1.8 + 0.6, '#6c7377') }
  for (const x of [x0, x1]) { box(P, x - 0.5, x + 0.5, y0 - 0.6, y0 + h + 0.6, z - d / 2 - 0.5, z + d / 2 + 0.5, '#2f5f8a'); for (const a of [-1, 1]) for (const b of [0.12, 0.88]) P.push({ p: [x + (x === x0 ? -0.65 : 0.65), y0 + h * b, z + a * (d / 2 + 0.1)], s: [0.35, 0.3, 0.35], c: '#9aa0a4', cyl: true, r: [0, 0, Math.PI / 2] }) }
  const n = Math.round((x1 - x0 - 1) / 0.42)
  for (let i = 0; i < n; i++) { const x = x0 + 0.5 + (i + 0.5) * (x1 - x0 - 1) / n; box(P, x - 0.15, x + 0.15, y0, y0 + h, z - d / 2, z + d / 2, i % 2 ? '#3d4348' : '#8a9096'); if (i % 4 === 1) for (const s of [-1, 1]) P.push({ p: [x, y0 + h + 1.6, z + s * 1.2], s: [0.09, 3.2, 0.09], c: '#eeeeea', cyl: true, r: [s * 0.25, 0, 0] }) }
  for (const a of [-1, 1]) for (const b of [0.12, 0.88]) P.push({ p: [(x0 + x1) / 2, y0 + h * b, z + a * (d / 2 + 0.1)], s: [0.12, x1 - x0 + 1.4, 0.12], c: '#b9bec2', cyl: true, r: [0, 0, Math.PI / 2] })
  P.push({ p: [(x0 + x1) / 2, y0 + h + 3.2, z + 1.6], s: [0.55, x1 - x0 + 3, 0.55], c: '#b9c43a', cyl: true, r: [0, 0, Math.PI / 2] }, { p: [(x0 + x1) / 2, y0 + h + 3.2, z - 1.6], s: [0.5, x1 - x0 + 3, 0.5], c: '#d9dee2', cyl: true, r: [0, 0, Math.PI / 2] })
}
/** 整流柜：灰白的钢柜，柜门上一排百叶、两块表、指示灯，顶上出铜排 */
function rectifier(P: Part[], x: number, z: number, w = 5.4, h = 11.5, d = 4) {
  box(P, x - w / 2, x + w / 2, 0.5, h, z - d / 2, z + d / 2, '#cfd4d2'); box(P, x - w / 2 - 0.1, x + w / 2 + 0.1, 0, 0.5, z - d / 2 - 0.1, z + d / 2 + 0.1, '#3d4146')
  box(P, x - 0.03, x + 0.03, 0.8, h - 0.4, z + d / 2, z + d / 2 + 0.04, '#7b8085')
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) box(P, x + s * w / 4 - 0.9, x + s * w / 4 + 0.9, 1.6 + k * 0.42, 1.78 + k * 0.42, z + d / 2, z + d / 2 + 0.08, '#8d9396')
    box(P, x + s * w / 4 - 0.7, x + s * w / 4 + 0.7, h - 3.4, h - 2.2, z + d / 2, z + d / 2 + 0.06, '#f1f1ea'); box(P, x + s * w / 4 - 0.5, x + s * w / 4 + 0.5, h - 3.2, h - 2.4, z + d / 2 + 0.06, z + d / 2 + 0.08, '#20262b')
    box(P, x + s * 0.3 - 0.08, x + s * 0.3 + 0.08, 4.6, 5.8, z + d / 2 + 0.04, z + d / 2 + 0.2, '#2a2e32')
  }
  for (const [k, c] of [[-1, '#c8323a'], [0, '#e3b21c'], [1, '#2f8f6b']] as [number, string][]) P.push({ p: [x - w / 4 + k * 0.5, h - 1.3, z + d / 2 + 0.05], s: [0.16, 0.12, 0.16], c, cyl: true, r: [Math.PI / 2, 0, 0] })
}
function CellRoom() {
  const C = CELL, S = SHEDS[0]
  const tex = useMemo(() => ({ mesh: meshTex(), sign: makeSign(['离子膜电解槽', '单元槽剖面'], '#f2f1ec', '#1d5c56', 512, 160), warn: makeSign(['当心触电'], '#e3b21c', '#1d1d1b', 384, 96) }), [])
  const geo = useMemo(() => {
    const P: Part[] = []
    stackParts(P, 6, 34, -34); stackParts(P, 44, 70, -34); stackParts(P, 6, 34, -50); stackParts(P, 44, 70, -50)
    rectifier(P, 9, -16); rectifier(P, 15.4, -16)
    // 剖开的单元槽下面的钢底架和绝缘子
    box(P, C.x - C.w / 2 - 0.6, C.x + C.w / 2 + 0.6, C.y0 - 1, C.y0 - 0.3, C.z - C.d / 2, C.z + C.d / 2, '#4b5560')
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = C.x + sx * (C.w / 2 - 1.2), z = C.z + sz * (C.d / 2 - 1); P.push({ p: [x, C.y0 - 1.7, z], s: [0.7, 1.4, 0.7], c: '#eceae2', cyl: true }, { p: [x, C.y0 - 1.7, z], s: [0.85, 0.22, 0.85], c: '#dcdad2', cyl: true }); box(P, x - 0.9, x + 0.9, 0.12, C.y0 - 2.4, z - 0.9, z + 0.9, '#5d6f7a') }
    // 操作平台和栏杆（在一排电解槽后面）
    box(P, 2, 74, 2.6, 2.9, -43.5, -40.5, '#6c7377')
    for (let x = 2; x <= 74; x += 6) box(P, x - 0.08, x + 0.08, 2.9, 5.9, -40.6, -40.4, '#e3b21c')
    box(P, 2, 74, 5.8, 5.95, -40.6, -40.4, '#e3b21c'); box(P, 2, 74, 4.3, 4.4, -40.6, -40.4, '#e3b21c')
    return mergeParts(P)
  }, [C])
  const pipes = useMemo(() => {
    const xl = C.x - C.w / 4, xr = C.x + C.w / 4, top = C.y0 + C.h, zb = C.z - C.d / 2 - 2.2
    return {
      cl: pipeGeo([[xl, top, C.z - 0.6], [xl, top + 5, C.z - 0.6], [xl, top + 5.6, C.z - 2], [xl, top + 5.6, -34 + 1.6], [xl - 2, top + 5.6, -34 + 1.6]], 0.42),
      h2: pipeGeo([[xr, top, C.z - 0.6], [xr, top + 3.4, C.z - 0.6], [xr, top + 4, C.z - 2], [xr, top + 4, -34 - 1.6], [xr + 2, top + 4, -34 - 1.6]], 0.38),
      brine: pipeGeo([[C.x - C.w / 2 - 6, 0.8, zb], [C.x - C.w / 2 + 2.4, 0.8, zb], [C.x - C.w / 2 + 2.4, 2.2, C.z - 1.2], [C.x - C.w / 2 + 2.4, C.y0, C.z - 1.2]], 0.36),
      water: pipeGeo([[C.x + C.w / 2 + 6, 0.8, zb], [C.x + C.w / 2 - 2.4, 0.8, zb], [C.x + C.w / 2 - 2.4, 2.2, C.z - 1.2], [C.x + C.w / 2 - 2.4, C.y0, C.z - 1.2]], 0.36),
      weak: pipeGeo([[C.x - C.w / 2, C.y0 + C.h * 0.74, C.z - 1.2], [C.x - C.w / 2 - 2.6, C.y0 + C.h * 0.74, C.z - 1.2], [C.x - C.w / 2 - 2.6, 1.6, C.z - 1.6], [C.x - C.w / 2 - 2.6, 1.6, zb - 2], [C.x - C.w / 2 - 7, 1.6, zb - 2]], 0.32),
      naoh: pipeGeo([[C.x + C.w / 2, C.y0 + C.h * 0.74, C.z - 1.2], [C.x + C.w / 2 + 2.6, C.y0 + C.h * 0.74, C.z - 1.2], [C.x + C.w / 2 + 2.6, 1.6, C.z - 1.6], [C.x + C.w / 2 + 2.6, 1.6, zb - 2], [C.x + C.w / 2 + 7, 1.6, zb - 2]], 0.32),
      // 铜排：从整流柜顶上出来，一根接阳极一侧的槽壁，一根从槽后绕到阴极一侧
      pos: pipeGeo([[15.4, 11.5, -16], [15.4, 13.2, -16], [C.x - C.w / 2 - 2, 13.2, -16], [C.x - C.w / 2 - 2, C.y0 + C.h * 0.45, C.z + 1.6], [C.x - C.w / 2, C.y0 + C.h * 0.45, C.z + 1.6]], 0.3, 4),
      neg: pipeGeo([[9, 11.5, -16], [9, 14.6, -16], [9, 14.6, -22], [C.x + C.w / 2 + 2, 14.6, -22], [C.x + C.w / 2 + 2, C.y0 + C.h * 0.45, C.z + 1.6], [C.x + C.w / 2, C.y0 + C.h * 0.45, C.z + 1.6]], 0.3, 4),
    }
  }, [C])
  const shell = useMemo(() => {
    const x0 = C.x - C.w / 2, x1 = C.x + C.w / 2, y0 = C.y0, y1 = C.y0 + C.h, z0 = C.z - C.d / 2, z1 = C.z + C.d / 2, t = C.wall, P: Part[] = []
    box(P, x0, x1, y0 - 0.3, y0 + t, z0, z1, '#3f6f96'); box(P, x0, x1, y1 - t, y1, z0, z1, '#3f6f96')
    box(P, x0, x0 + t, y0, y1, z0, z1, '#3f6f96'); box(P, x1 - t, x1, y0, y1, z0, z1, '#3f6f96'); box(P, x0, x1, y0, y1, z0, z0 + t, '#35617f')
    // 外壁的加强筋和法兰边
    for (const y of [y0 + 3, y0 + 6.5, y0 + 10]) { box(P, x0 - 0.18, x0, y - 0.25, y + 0.25, z0, z1, '#2f5f8a'); box(P, x1, x1 + 0.18, y - 0.25, y + 0.25, z0, z1, '#2f5f8a') }
    // 顶上的两个出气短管和法兰
    for (const x of [C.x - C.w / 4, C.x + C.w / 4]) P.push({ p: [x, y1 + 0.5, C.z - 0.6], s: [0.75, 1, 0.75], c: '#35617f', cyl: true }, { p: [x, y1 + 1.05, C.z - 0.6], s: [1.1, 0.22, 1.1], c: '#9aa0a4', cyl: true })
    return mergeParts(P)
  }, [C])
  const x0 = C.x - C.w / 2 + C.wall, x1 = C.x + C.w / 2 - C.wall, yb = C.y0 + C.wall, lv = C.h * C.level, z1 = C.z + C.d / 2, zin = C.d - C.wall
  const half = (x1 - x0) / 2 - 0.12
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.5} metal={0.35} /></mesh>
    <mesh geometry={shell} castShadow receiveShadow><meshPhysicalMaterial vertexColors roughness={0.42} metalness={0.3} clearcoat={0.4} clearcoatRoughness={0.4} /></mesh>
    {/* 剖面：槽壁被切开的地方露出浅色的断面 */}
    {[[C.x - C.w / 2 + C.wall / 2, C.y0 + C.h / 2, C.wall, C.h], [C.x + C.w / 2 - C.wall / 2, C.y0 + C.h / 2, C.wall, C.h], [C.x, C.y0 + C.wall / 2, C.w, C.wall], [C.x, C.y0 + C.h - C.wall / 2, C.w, C.wall]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, z1 + 0.01]}><planeGeometry args={[w, h]} /><meshStandardMaterial color="#c9d3da" roughness={0.5} metalness={0.4} /></mesh>)}
    {/* 阳极室的盐水（溶了氯气，淡黄绿）、阴极室的碱液（无色） */}
    <mesh position={[x0 + half / 2, yb + lv / 2, C.z + C.wall / 2]} renderOrder={4}><boxGeometry args={[half, lv, zin]} /><meshPhysicalMaterial color="#b9cf5a" transparent opacity={0.42} roughness={0.1} depthWrite={false} /></mesh>
    <mesh position={[x1 - half / 2, yb + lv / 2, C.z + C.wall / 2]} renderOrder={4}><boxGeometry args={[half, lv, zin]} /><meshPhysicalMaterial color="#6fa9cf" transparent opacity={0.42} roughness={0.1} depthWrite={false} /></mesh>
    {[x0 + half / 2, x1 - half / 2].map((x, i) => <mesh key={i} position={[x, yb + lv + 0.01, C.z + C.wall / 2]} rotation-x={-Math.PI / 2} renderOrder={5}><planeGeometry args={[half, zin]} /><meshPhysicalMaterial color={i ? '#e6f3f8' : '#e4efb0'} transparent opacity={0.55} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>)}
    {/* 阳离子交换膜：一张淡黄的薄膜，上下夹在框里 */}
    <mesh position={[C.x, C.y0 + C.h / 2, C.z + C.wall / 2]} renderOrder={6}><boxGeometry args={[0.16, C.h - 2 * C.wall, zin]} /><meshPhysicalMaterial color="#f2d77a" transparent opacity={0.78} roughness={0.35} clearcoat={0.5} depthWrite={false} /></mesh>
    {[yb + 0.2, C.y0 + C.h - C.wall - 0.2].map(y => <mesh key={y} position={[C.x, y, C.z + C.wall / 2]}><boxGeometry args={[0.6, 0.4, zin]} /><meshStandardMaterial color="#2a2e32" roughness={0.6} /></mesh>)}
    {/* 两张网状电极：阳极钛网（涂层发黑）、阴极镍网（银白），各用几根导电筋接到槽壁 */}
    {[-1, 1].map(s => <group key={s}>
      <mesh position={[C.x + s * 1.5, yb + (C.h - 2 * C.wall) * 0.46, C.z + C.wall / 2]} rotation-y={Math.PI / 2} castShadow><planeGeometry args={[zin - 0.3, (C.h - 2 * C.wall) * 0.86]} /><meshStandardMaterial map={tex.mesh} alphaTest={0.4} color={s < 0 ? '#4a4d55' : '#d9dde0'} metalness={0.9} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      <mesh position={[C.x + s * 1.5, yb + (C.h - 2 * C.wall) * 0.46, z1 - 0.02]}><boxGeometry args={[0.2, (C.h - 2 * C.wall) * 0.86, 0.04]} /><meshStandardMaterial color={s < 0 ? '#3a3d44' : '#c9cdd2'} metalness={0.9} roughness={0.3} /></mesh>
      {[0.22, 0.5, 0.78].map(k => <mesh key={k} position={[C.x + s * (1.5 + (C.w / 2 - C.wall - 1.5) / 2), yb + (C.h - 2 * C.wall) * k, C.z - 1]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.14, 0.14, C.w / 2 - C.wall - 1.5, 10]} /><Metal kind={s < 0 ? 'steel' : 'stainless'} /></mesh>)}
    </group>)}
    {/* 管路：氯气（黄绿）、氢气（白）、进料和出料 */}
    <mesh geometry={pipes.cl} castShadow><meshPhysicalMaterial color="#b9c43a" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={pipes.h2} castShadow><meshPhysicalMaterial color="#e3e7e9" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={pipes.brine} castShadow><meshPhysicalMaterial color="#3f8f7a" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={pipes.weak} castShadow><meshPhysicalMaterial color="#7fae9f" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={pipes.water} castShadow><meshPhysicalMaterial color="#3a78b8" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={pipes.naoh} castShadow><meshPhysicalMaterial color="#8f6fb0" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={pipes.pos} castShadow><Metal kind="copper" grain="brushed" /></mesh>
    <mesh geometry={pipes.neg} castShadow><Metal kind="copper" grain="brushed" /></mesh>
    <mesh position={[12.2, 9.6, -13.94]}><planeGeometry args={[3.4, 0.85]} /><meshStandardMaterial map={tex.warn} roughness={0.6} /></mesh>
  </group>
}

// ---------- 电镀车间 ----------
/** 一只聚丙烯镀槽：灰白的槽体，外壁几道加强筋，槽口一圈翻边；里面一槽溶液。front：前壁透明（另画） */
function vat(P: Part[], x: number, z: number, w: number, h: number, d: number, y0: number, front = true) {
  const t = 0.45, c = '#a9a698', rib = '#8f8c80'
  box(P, x - w / 2, x + w / 2, y0, y0 + t, z - d / 2, z + d / 2, c); box(P, x - w / 2, x + w / 2, y0, y0 + h, z - d / 2, z - d / 2 + t, c)
  box(P, x - w / 2, x - w / 2 + t, y0, y0 + h, z - d / 2, z + d / 2, c); box(P, x + w / 2 - t, x + w / 2, y0, y0 + h, z - d / 2, z + d / 2, c)
  if (front) box(P, x - w / 2, x + w / 2, y0, y0 + h, z + d / 2 - t, z + d / 2, c)
  for (const k of [0.3, 0.62, 0.97]) { const y = y0 + h * k; box(P, x - w / 2 - 0.3, x - w / 2, y - 0.22, y + 0.22, z - d / 2 - 0.3, z + d / 2 + 0.3, rib); box(P, x + w / 2, x + w / 2 + 0.3, y - 0.22, y + 0.22, z - d / 2 - 0.3, z + d / 2 + 0.3, rib); box(P, x - w / 2 - 0.3, x + w / 2 + 0.3, y - 0.22, y + 0.22, z - d / 2 - 0.3, z - d / 2, rib); if (front || k > 0.9) box(P, x - w / 2 - 0.3, x + w / 2 + 0.3, y - 0.22, y + 0.22, z + d / 2, z + d / 2 + 0.3, rib) }
  for (const s of [-1, 1]) for (const q of [-1, 1]) box(P, x + s * (w / 2 - 0.8) - 0.5, x + s * (w / 2 - 0.8) + 0.5, 0.12, y0, z + q * (d / 2 - 0.8) - 0.5, z + q * (d / 2 - 0.8) + 0.5, '#6c7377')
  // 槽后沿的吸风罩
  box(P, x - w / 2, x + w / 2, y0 + h, y0 + h + 1.3, z - d / 2 - 1.1, z - d / 2 + 0.2, '#aeb4b6'); box(P, x - w / 2 + 0.3, x + w / 2 - 0.3, y0 + h + 0.3, y0 + h + 1.0, z - d / 2 + 0.2, z - d / 2 + 0.24, '#23272a')
}
function PlatingShop() {
  const T = TANK
  const side = [{ x: 106, c: '#6fae8e', n: '除油' }, { x: 120, c: '#9fc3cf', n: '水洗' }, { x: 156, c: '#9fc3cf', n: '水洗' }, { x: 169, c: '#c9b56a', n: '钝化' }]
  const tex = useMemo(() => side.map(s => makeSign([s.n], '#f2f1ec', '#2a2d30', 192, 96)).concat(makeSign(['镀铜槽', 'CuSO₄ 溶液'], '#f2f1ec', '#1d5c56', 384, 144)), [])   // eslint-disable-line react-hooks/exhaustive-deps
  const geo = useMemo(() => {
    const P: Part[] = []
    for (const s of side) vat(P, s.x, T.z, 10.5, 7.2, T.d, T.y0)
    vat(P, T.x, T.z, T.w, T.h, T.d, T.y0, false)
    // 排风总管：沿槽后沿一条方管，尽头立一座喷淋塔
    box(P, 99, 176, T.y0 + 9.75, T.y0 + 11.6, T.z - T.d / 2 - 3.2, T.z - T.d / 2 - 1.4, '#aeb4b6')
    for (const s of [...side.map(q => q.x), T.x]) box(P, s - 0.8, s + 0.8, T.y0 + 7.4, T.y0 + 9.75, T.z - T.d / 2 - 1.1, T.z - T.d / 2 + 0.1, '#aeb4b6')
    P.push({ p: [170, 9, -34], s: [3.2, 18, 3.2], c: '#d9dcd4', cyl: true }, { p: [170, 18.6, -34], s: [1.2, 3, 1.2], c: '#aeb4b6', cyl: true })
    box(P, 168.8, 171.2, T.y0 + 9.75, T.y0 + 11.6, -34, T.z - T.d / 2 - 1.4, '#aeb4b6')
    // 槽前的操作格栅和踏步
    box(P, 100, 176, 0.9, 1.15, T.z + T.d / 2 + 0.6, T.z + T.d / 2 + 4.2, '#5f666b')
    for (let x = 100; x <= 176; x += 2) box(P, x - 0.05, x + 0.05, 1.15, 1.2, T.z + T.d / 2 + 0.6, T.z + T.d / 2 + 4.2, '#3c4246')
    for (let x = 101; x <= 175; x += 9.25) for (const z of [T.z + T.d / 2 + 0.9, T.z + T.d / 2 + 3.9]) box(P, x - 0.15, x + 0.15, 0.12, 0.9, z - 0.15, z + 0.15, '#5f666b')
    // 单轨吊的工字钢轨道：吊在屋架下面
    box(P, 98, 176, T.rail, T.rail + 0.9, T.z - 0.12, T.z + 0.12, '#d9a520'); box(P, 98, 176, T.rail - 0.15, T.rail, T.z - 0.5, T.z + 0.5, '#d9a520'); box(P, 98, 176, T.rail + 0.9, T.rail + 1.05, T.z - 0.5, T.z + 0.5, '#d9a520')
    for (const x of [96 + 80 / 6, 96 + 80 / 2, 96 + 80 * 5 / 6]) box(P, x - 0.15, x + 0.15, T.rail + 1, 31, T.z - 0.15, T.z + 0.15, '#5d6f7a')
    rectifier(P, 152, -31, 5, 10, 3.6)
    // 靠后墙的挂具架：几排横杆上挂着待镀的挂具
    for (const x of [104, 116]) { box(P, x - 0.12, x + 0.12, 0.12, 12, -56.1, -55.9, '#6c7377'); }
    box(P, 104, 116, 11.6, 11.9, -56.15, -55.85, '#6c7377'); box(P, 104, 116, 6.6, 6.9, -56.15, -55.85, '#6c7377')
    for (let x = 105.5; x < 116; x += 2.1) { box(P, x - 0.06, x + 0.06, 7.2, 11.6, -56.05, -55.95, '#b87333'); for (let y = 7.6; y < 11; y += 0.8) box(P, x - 0.5, x + 0.5, y, y + 0.06, -56.05, -55.95, '#b87333') }
    // 化学品桶
    for (const [x, z, c] of [[124, -52, '#2f6fb3'], [128, -53, '#2f6fb3'], [126, -49.5, '#e9e9e4'], [132, -52, '#2f6fb3']] as [number, number, string][]) { P.push({ p: [x, 2.8, z], s: [1.7, 5.4, 1.7], c, cyl: true }, { p: [x, 5.55, z], s: [1.8, 0.2, 1.8], c: '#22262a', cyl: true }) }
    return mergeParts(P)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  const bars = useMemo(() => {
    const P: Part[] = []
    // 槽口两端的绝缘座：每根铜排两头各一只
    for (const bx of T.bars) for (const s of [-1, 1]) box(P, T.x + bx - 0.5, T.x + bx + 0.5, T.y0 + T.h, T.y0 + T.h + 0.5, T.z + s * (T.d / 2 - 0.22) - 0.4, T.z + s * (T.d / 2 - 0.22) + 0.4, '#e9e7df')
    return mergeParts(P)
  }, [T])
  const bus = useMemo(() => ({
    pos: pipeGeo([[151, 10, -31], [151, 12.6, -31], [151, 12.6, T.z - T.d / 2 - 2.3], [T.x + T.bars[2], 12.6, T.z - T.d / 2 - 2.3], [T.x + T.bars[2], T.y0 + T.h + 0.75, T.z - T.d / 2 - 0.6], [T.x + T.bars[2], T.y0 + T.h + 0.75, T.z - T.d / 2 + 0.2]], 0.24, 4),
    pos2: pipeGeo([[T.x + T.bars[2], 12.6, T.z - T.d / 2 - 2.3], [T.x + T.bars[0], 12.6, T.z - T.d / 2 - 2.3], [T.x + T.bars[0], T.y0 + T.h + 0.75, T.z - T.d / 2 - 0.6], [T.x + T.bars[0], T.y0 + T.h + 0.75, T.z - T.d / 2 + 0.2]], 0.24, 4),
    neg: pipeGeo([[153, 10, -31], [153, 13.6, -31], [153, 13.6, T.z - T.d / 2 - 2.8], [T.x, 13.6, T.z - T.d / 2 - 2.8], [T.x, T.y0 + T.h + 0.75, T.z - T.d / 2 - 0.6], [T.x, T.y0 + T.h + 0.75, T.z - T.d / 2 + 0.2]], 0.24, 4),
  }), [T])
  const lv = T.h * T.level
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
    <mesh geometry={bars} castShadow><meshPhysicalMaterial vertexColors roughness={0.3} clearcoat={0.6} /></mesh>
    {side.map((s, i) => <group key={s.x}>
      <mesh position={[s.x, T.y0 + 7.2 * 0.88, T.z]} rotation-x={-Math.PI / 2}><planeGeometry args={[9.6, T.d - 0.9]} /><meshPhysicalMaterial color={s.c} roughness={0.08} clearcoat={1} transparent opacity={0.9} /></mesh>
      <mesh position={[s.x, T.y0 + 4.2, T.z + T.d / 2 + 0.31]}><planeGeometry args={[2.6, 1.3]} /><meshStandardMaterial map={tex[i]} roughness={0.6} /></mesh>
    </group>)}
    {/* 主镀槽：前壁是一块透明的有机玻璃，看得见槽里的 CuSO₄ 溶液 */}
    <mesh position={[T.x, T.y0 + T.h / 2, T.z + T.d / 2 - T.wall / 2]} renderOrder={8}><boxGeometry args={[T.w, T.h, T.wall]} /><meshPhysicalMaterial color="#cfe6ee" transparent opacity={0.1} roughness={0.03} clearcoat={1} envMapIntensity={1.2} depthWrite={false} /></mesh>
    <mesh position={[T.x, T.y0 + T.wall + lv / 2, T.z]} renderOrder={4}><boxGeometry args={[T.w - 2 * T.wall - 0.04, lv, T.d - 2 * T.wall - 0.04]} /><meshPhysicalMaterial color="#1668d8" emissive="#0f4fc0" emissiveIntensity={0.3} transparent opacity={0.3} roughness={0.1} depthWrite={false} /></mesh>
    <mesh position={[T.x, T.y0 + T.wall + lv + 0.01, T.z]} rotation-x={-Math.PI / 2} renderOrder={5}><planeGeometry args={[T.w - 2 * T.wall, T.d - 2 * T.wall]} /><meshPhysicalMaterial color="#3f8fe8" transparent opacity={0.7} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    <mesh position={[T.x + T.w / 2 - 3, T.y0 + 1.6, T.z + T.d / 2 + 0.02]}><planeGeometry args={[3.6, 1.35]} /><meshStandardMaterial map={tex[4]} roughness={0.6} /></mesh>
    {/* 三根铜排横在槽口上（前后方向）：两边接整流柜正极，中间接负极 */}
    {T.bars.map(bx => <mesh key={bx} position={[T.x + bx, T.y0 + T.h + 0.75, T.z]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.24, 0.24, T.d + 0.6, 16]} /><Metal kind="copper" grain="brushed" /></mesh>)}
    <mesh geometry={bus.pos} castShadow><meshPhysicalMaterial color="#b8322c" roughness={0.45} clearcoat={0.4} /></mesh>
    <mesh geometry={bus.pos2} castShadow><meshPhysicalMaterial color="#b8322c" roughness={0.45} clearcoat={0.4} /></mesh>
    <mesh geometry={bus.neg} castShadow><meshPhysicalMaterial color="#1b1d20" roughness={0.45} clearcoat={0.4} /></mesh>
  </group>
}

// ---------- 电冶金车间 ----------
function SmeltShop() {
  const C = POT
  const brick = useMemo(() => { const t = cutTex().clone(); t.repeat.set(4, 2); t.needsUpdate = true; return t }, [])
  const geo = useMemo(() => {
    const P: Part[] = [], x0 = C.x - C.w / 2, x1 = C.x + C.w / 2, z0 = C.z - C.d / 2, z1 = C.z + C.d / 2, y1 = C.y0 + C.h
    // 钢壳：底、后壁、两侧壁，外面一圈摇篮架的立筋；槽坐在四条钢腿上
    box(P, x0, x1, C.y0, C.y0 + 0.3, z0, z1, '#4b5258'); box(P, x0, x1, C.y0, y1, z0, z0 + 0.3, '#4b5258'); box(P, x0, x0 + 0.3, C.y0, y1, z0, z1, '#4b5258'); box(P, x1 - 0.3, x1, C.y0, y1, z0, z1, '#4b5258')
    for (let x = x0 + 2; x < x1; x += 4.5) box(P, x - 0.25, x + 0.25, C.y0 - 0.4, C.y0, z0 - 0.3, z1, '#3a4046')
    for (const z of [z0 + 1.5, z1 - 1.5]) { box(P, x0 - 0.4, x0, C.y0, y1 + 0.3, z - 0.25, z + 0.25, '#3a4046'); box(P, x1, x1 + 0.4, C.y0, y1 + 0.3, z - 0.25, z + 0.25, '#3a4046') }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(P, C.x + sx * (C.w / 2 - 2) - 0.6, C.x + sx * (C.w / 2 - 2) + 0.6, 0.12, C.y0 - 0.4, C.z + sz * (C.d / 2 - 1.2) - 0.6, C.z + sz * (C.d / 2 - 1.2) + 0.6, '#3a4046')
    // 后面还有两台同样的槽（盖着罩板），一排阳极导杆伸出来
    for (const x of [C.x - 26, C.x + 26]) {
      box(P, x - 10, x + 10, 3.2, 11, -44, -36, '#4b5258'); box(P, x - 10.3, x + 10.3, 11, 14.5, -44.3, -35.7, '#8d9396')
      for (let k = -3; k <= 3; k++) { box(P, x + k * 2.6 - 0.18, x + k * 2.6 + 0.18, 14.5, 19, -40.2, -39.8, '#c9cdd0'); box(P, x + k * 2.6 - 1.1, x + k * 2.6 + 1.1, 11.2, 14.3, -35.68, -35.6, '#737a7f') }
      box(P, x - 10.5, x + 10.5, 19, 19.8, -40.6, -39.4, '#b87333')
      for (const sx of [-1, 1]) box(P, x + sx * 8 - 0.6, x + sx * 8 + 0.6, 0.12, 3.2, -41, -39, '#3a4046')
    }
    // 排烟总管
    box(P, 198, 270, 23, 25.4, -48.2, -45.8, '#9aa0a4')
    // 抬包小车的轨道
    for (const z of [C.z + 0.2, C.z + 3.4]) box(P, x0 - 16, x0 - 1, 0.12, 0.35, z - 0.12, z + 0.12, '#3a4046')
    return mergeParts(P)
  }, [C])
  const x0 = C.x - C.w / 2 + 0.3, x1 = C.x + C.w / 2 - 0.3, L = C.lining, z1 = C.z + C.d / 2, inner = { w: x1 - x0 - 2 * L, d: C.d - 0.3 - L, h: C.h - 0.3 - L }
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.6} metal={0.4} /></mesh>
    {/* 耐火内衬：底和三面壁，剖面上是砖红的断面 */}
    <mesh position={[C.x, C.y0 + 0.3 + L / 2, C.z + 0.15]} castShadow receiveShadow><boxGeometry args={[x1 - x0, L, C.d - 0.3]} /><meshStandardMaterial color="#8a5c44" roughness={0.9} /></mesh>
    {[x0 + L / 2, x1 - L / 2].map(x => <mesh key={x} position={[x, C.y0 + 0.3 + C.h / 2, C.z + 0.15]} castShadow><boxGeometry args={[L, C.h - 0.3, C.d - 0.3]} /><meshStandardMaterial color="#8a5c44" roughness={0.9} /></mesh>)}
    <mesh position={[C.x, C.y0 + 0.3 + C.h / 2, C.z - C.d / 2 + 0.3 + L / 2]}><boxGeometry args={[x1 - x0, C.h - 0.3, L]} /><meshStandardMaterial color="#7d523c" roughness={0.9} /></mesh>
    {[[x0 + L / 2, C.y0 + 0.3 + C.h / 2 - 0.15, L, C.h - 0.3], [x1 - L / 2, C.y0 + 0.3 + C.h / 2 - 0.15, L, C.h - 0.3], [C.x, C.y0 + 0.3 + L / 2, x1 - x0, L]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, z1 + 0.012]}><planeGeometry args={[w, h]} /><meshStandardMaterial map={brick} color="#c98a6a" roughness={0.9} /></mesh>)}
    {/* 熔融的电解质：亮橙色，自己发光 */}
    <mesh position={[C.x, C.y0 + 0.3 + L + inner.h * C.level / 2, C.z + 0.15 + L / 2]} renderOrder={4}><boxGeometry args={[inner.w, inner.h * C.level, inner.d]} /><meshStandardMaterial color="#ff8a2a" emissive="#ff5a12" emissiveIntensity={0.95} transparent opacity={0.82} roughness={0.4} depthWrite={false} toneMapped={false} /></mesh>
    <pointLight position={[C.x, C.y0 + C.h + 1, C.z + 3]} intensity={140} distance={40} decay={1.7} color="#ff9a4a" />
  </group>
}

// ---------- 码头 ----------
function Pier() {
  const Q = PIER
  const rip = useRipple([40, 26], 0.02), face = useFaceGradient('70,170,180', 0.6)
  const tex = useMemo(() => { const s = makeStrata(['#8f8468', '#7d745e', '#6c6452', '#5d5648', '#514b40', '#48433a']); s.repeat.set(5, 1); const w = wallTex().clone(); w.repeat.set(2, 2); w.needsUpdate = true; return { s, w } }, [])
  const geo = useMemo(() => {
    const P: Part[] = [], x0 = Q.quay, x1 = Q.quay + 96
    // 岸壁和岸上的护轮坎、系船柱
    box(P, x0 - 3, x0, Q.bed - 10, 0.6, -90, 60, '#aaa69a'); box(P, x0 - 1.2, x0, 0.6, 1.3, -90, 60, '#e3b21c')
    for (const z of [-40, 20]) { P.push({ p: [x0 - 2.2, 1.2, z], s: [0.9, 1.6, 0.9], c: '#22262a', cyl: true }, { p: [x0 - 2.2, 2.1, z], s: [1.3, 0.4, 1.3], c: '#22262a', cyl: true }) }
    // 栈桥：桥面板、两道纵梁、每排桩顶一道横梁，两侧栏杆
    box(P, x0, x1, Q.deck, Q.deck + 0.7, -17, -5, '#b9b6ab')
    for (const z of [-15, -7]) box(P, x0, x1, Q.deck - 1.3, Q.deck, z - 0.5, z + 0.5, '#8d8a80')
    for (let x = x0 + 10; x < x1; x += 24) box(P, x - 0.9, x + 0.9, Q.deck - 1.9, Q.deck - 1.3, -17, -5, '#8d8a80')
    for (const z of [-16.8, -5.2]) { for (let x = x0; x <= x1; x += 4) box(P, x - 0.07, x + 0.07, Q.deck + 0.7, Q.deck + 4.2, z - 0.07, z + 0.07, '#d9dcd8'); for (const y of [2.4, 4.1]) box(P, x0, x1, Q.deck + y, Q.deck + y + 0.14, z - 0.07, z + 0.07, '#d9dcd8') }
    // 其余的钢管桩（主角那一根另画）
    for (let x = x0 + 10; x < x1; x += 24) for (const z of [-14, Q.z]) if (!(Math.abs(x - Q.x) < 1 && z === Q.z)) P.push({ p: [x, (Q.deck - 1.9 + Q.bed - 6) / 2, z], s: [Q.r, Q.deck - 1.9 - Q.bed + 6, Q.r], c: '#5a4a3e', cyl: true })
    // 桥头的灯杆、输送管
    P.push({ p: [x0 + 4, Q.deck + 7, -15.6], s: [0.16, 12.6, 0.16], c: '#6c7377', cyl: true }); box(P, x0 + 3.2, x0 + 5.6, Q.deck + 13.1, Q.deck + 13.4, -15.9, -15.3, '#2c3135')
    P.push({ p: [(x0 + x1) / 2, Q.deck + 1.3, -14.4], s: [0.5, x1 - x0, 0.5], c: '#b9c43a', cyl: true, r: [0, 0, Math.PI / 2] }, { p: [(x0 + x1) / 2, Q.deck + 1.3, -13], s: [0.45, x1 - x0, 0.45], c: '#8f6fb0', cyl: true, r: [0, 0, Math.PI / 2] })
    for (let x = x0 + 6; x < x1; x += 12) box(P, x - 0.2, x + 0.2, Q.deck + 0.7, Q.deck + 1.0, -15.2, -12.2, '#6c7377')
    // 远处停着的一条化学品船
    box(P, x0 + 120, x0 + 300, Q.sea - 4, Q.sea + 9, -140, -112, '#2f3f55'); box(P, x0 + 120, x0 + 300, Q.sea + 9, Q.sea + 9.6, -140.4, -111.6, '#9c3a30')
    box(P, x0 + 250, x0 + 286, Q.sea + 9.6, Q.sea + 30, -137, -115, '#e9e9e4'); box(P, x0 + 258, x0 + 280, Q.sea + 30, Q.sea + 36, -133, -119, '#e9e9e4')
    for (let x = x0 + 136; x < x0 + 240; x += 26) P.push({ p: [x, Q.sea + 14, -126], s: [9, 9, 9], c: '#c9cdd0', cyl: true })
    return mergeParts(P)
  }, [Q])
  const pile = useMemo(() => {
    const top = Q.deck - 1.9, len = top - Q.bed + 7
    return { len, y: (top + Q.bed - 7) / 2 }
  }, [Q])
  const barnacles = useMemo(() => {
    const r = rng(53), gs: THREE.BufferGeometry[] = []
    for (let i = 0; i < 150; i++) { const a = r() * Math.PI * 2, y = Q.sea + 1.2 - Math.pow(r(), 1.6) * 9, s = 0.07 + r() * 0.11, g = new THREE.ConeGeometry(s, s * 1.1, 6); g.rotateZ(-Math.PI / 2); g.rotateY(-a); g.translate(Math.cos(a) * (Q.r + s * 0.4), y, Math.sin(a) * (Q.r + s * 0.4)); gs.push(g) }
    return mergeGeometries(gs)
  }, [Q])
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.75} metal={0.1} /></mesh>
    {/* 主角：一根钢管桩。哑光的碳钢，水面以上一段挂着锈迹，潮差段长着一圈藤壶 */}
    <mesh position={[Q.x, pile.y, Q.z]} castShadow><cylinderGeometry args={[Q.r, Q.r, pile.len, 40]} /><meshStandardMaterial color="#4f4b47" metalness={0.15} roughness={0.92} /></mesh>
    <mesh position={[Q.x, (Q.sea + Q.deck - 1.9) / 2, Q.z]}><cylinderGeometry args={[Q.r + 0.012, Q.r + 0.012, Q.deck - 1.9 - Q.sea, 40, 1, true]} /><meshStandardMaterial color="#7a4a30" roughness={1} transparent opacity={0.55} depthWrite={false} /></mesh>
    <mesh geometry={barnacles} position={[Q.x, 0, Q.z]} castShadow><meshStandardMaterial color="#cfc9b8" roughness={0.95} /></mesh>
    <mesh position={[Q.x, Q.deck - 2.4, Q.z]}><cylinderGeometry args={[Q.r + 0.25, Q.r + 0.25, 1, 40]} /><meshStandardMaterial color="#8d8a80" roughness={0.9} /></mesh>
    {/* 海：水面一张，朝镜头的一面是剖面；海床是一层层的泥沙 */}
    <mesh rotation-x={-Math.PI / 2} position={[Q.quay + 500, Q.sea, Q.cut - 400]}><planeGeometry args={[1000, 800]} /><meshStandardMaterial color="#3f6f78" normalMap={rip} roughness={0.12} metalness={0.2} transparent opacity={0.9} /></mesh>
    <mesh position={[Q.quay + 500, (Q.sea + Q.bed) / 2, Q.cut]} renderOrder={12}><planeGeometry args={[1000, Q.sea - Q.bed]} /><meshBasicMaterial map={face} transparent depthWrite={false} toneMapped={false} /></mesh>
    <mesh position={[Q.quay + 500, (Q.sea + Q.bed) / 2, Q.z - 14]}><planeGeometry args={[1000, Q.sea - Q.bed]} /><meshBasicMaterial color="#2c6f7c" transparent opacity={0.82} depthWrite={false} toneMapped={false} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[Q.quay + 500, Q.bed, Q.cut - 400]} receiveShadow><planeGeometry args={[1000, 800]} /><meshStandardMaterial color="#8a8068" roughness={1} /></mesh>
    <mesh position={[Q.quay + 500, Q.bed - 8, Q.cut]}><planeGeometry args={[1000, 16]} /><meshStandardMaterial map={tex.s} roughness={1} /></mesh>
    <mesh position={[Q.quay - 1.5, (Q.bed - 16) / 2, Q.cut]}><planeGeometry args={[3, -Q.bed + 16]} /><meshStandardMaterial map={tex.w} roughness={0.9} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[Q.quay + 500, Q.bed - 16, Q.cut + 200]}><planeGeometry args={[1000, 400]} /><meshStandardMaterial color="#2b2f31" roughness={1} /></mesh>
    <mesh position={[Q.quay - 0.01, (Q.bed - 16) / 2, Q.cut + 200]} rotation-y={Math.PI / 2}><planeGeometry args={[400, -Q.bed + 16]} /><meshStandardMaterial color="#3a3d3e" roughness={1} /></mesh>
  </group>
}

// ---------- 厂区的其他东西 ----------
function Yard() {
  const tex = useMemo(() => {
    const city = facadeTex().clone(); city.repeat.set(4, 2); city.needsUpdate = true
    return { city, naoh: tankLabel('烧碱', 'NaOH 32%'), hcl: tankLabel('盐酸', 'HCl 31%'), brine: tankLabel('精盐水', 'NaCl'), gate: makeSign(['滨海氯碱厂'], '#1d5c56', '#ffffff', 768, 128) }
  }, [])
  const geo = useMemo(() => {
    const P: Part[] = [], r = rng(41)
    // 立式储罐：罐体、罐顶、一圈盘梯扶手、围堰
    for (const [x, rad, h] of [[18, 9, 22], [44, 9, 22], [70, 7, 18], [118, 8, 20], [142, 8, 20], [214, 9, 22], [246, 7, 17]] as [number, number, number][]) {
      P.push({ p: [x, h / 2 + 0.6, -92], s: [rad, h, rad], c: '#e2e3de', cyl: true }, { p: [x, h + 0.9, -92], s: [rad + 0.25, 0.6, rad + 0.25], c: '#c9cdd0', cyl: true }, { p: [x, h + 1.6, -92], s: [rad * 0.5, 0.9, rad * 0.5], c: '#d6d9d4', cyl: true })
      for (let k = 0; k < 14; k++) { const a = -0.4 + k * 0.2; P.push({ p: [x + Math.cos(a) * (rad + 0.5), 1.5 + k * (h - 1) / 14, -92 + Math.sin(a) * (rad + 0.5)], s: [1.4, 0.15, 1.9], c: '#8d9396', r: [0, -a, 0] }) }
      box(P, x - rad - 3, x + rad + 3, 0, 1.6, -92 + rad + 2.6, -92 + rad + 3.2, '#a9a69b')
    }
    // 管廊：一排门形钢架，上面几根不同颜色的管子，从化验楼后面一直通到码头
    for (let x = -20; x <= 300; x += 16) { for (const z of [-70, -66]) box(P, x - 0.3, x + 0.3, 0, 12, z - 0.3, z + 0.3, '#5d6f7a'); box(P, x - 0.3, x + 0.3, 11.4, 12, -70, -66, '#5d6f7a'); box(P, x - 0.3, x + 0.3, 8, 8.5, -70, -66, '#5d6f7a') }
    for (const [z, y, c, rr] of [[-69.2, 12.5, '#b9c43a', 0.5], [-68, 12.5, '#e3e7e9', 0.45], [-66.8, 12.6, '#8f6fb0', 0.6], [-69, 9, '#3f8f7a', 0.45], [-67.4, 9.1, '#3a78b8', 0.6]] as [number, number, string, number][]) P.push({ p: [140, y, z], s: [rr, 322, rr], c, cyl: true, r: [0, 0, Math.PI / 2] })
    // 原盐堆场：一堆白色的盐，一条皮带机斜着伸上去
    P.push({ p: [-18, 5, -100], s: [0.6, 30, 0.6], c: '#6c7377', cyl: true, r: [0, 0, 1.2] })
    // 围墙和厂门
    for (let x = -150; x < PIER.quay - 8; x += 6) if (x < -40 || x > -14) { box(P, x, x + 5.6, 0, 5.2, 52.8, 53.2, '#cfcabd'); box(P, x + 5.6, x + 6, 0, 5.8, 52.6, 53.4, '#b9b4a6') }
    box(P, -41, -39.6, 0, 9, 52.3, 53.7, '#d9d6cc'); box(P, -14.4, -13, 0, 9, 52.3, 53.7, '#d9d6cc'); box(P, -41, -13, 9, 11.4, 52.5, 53.5, '#1d5c56')
    // 远处：几座厂房的屋顶设备、一根烟囱
    P.push({ p: [-70, 34, -230], s: [4, 68, 4], c: '#c9c2b6', cyl: true }, { p: [-70, 62, -230], s: [4.3, 5, 4.3], c: '#b8322c', cyl: true })
    for (let i = 0; i < 6; i++) { const x = -160 + i * 76 + r() * 20; box(P, x - 4, x + 4, 40 + (i % 3) * 12, 43 + (i % 3) * 12, -252, -244, '#9aa0a3') }
    return mergeParts(P)
  }, [])
  const far = useMemo(() => mergeGeometries(Array.from({ length: 6 }, (_, i) => { const h = 40 + (i % 3) * 12, g = new THREE.BoxGeometry(56, h, 30); g.translate(-160 + i * 76, h / 2, -250); return g })), [])
  const salt = useMemo(() => { const g = new THREE.ConeGeometry(17, 13, 28, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 6.4) { const k = 1 + Math.sin(p.getX(i) * 0.9 + p.getZ(i) * 1.3) * 0.06; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k) } } g.computeVertexNormals(); return g }, [])
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.65} metal={0.15} /></mesh>
    <mesh geometry={far}><meshStandardMaterial map={tex.city} color="#c9cbc6" roughness={0.85} /></mesh>
    <mesh geometry={salt} position={[-34, 6.5, -104]} castShadow receiveShadow><meshStandardMaterial color="#f2f1ea" roughness={0.95} /></mesh>
    {[[18, tex.naoh, 9], [44, tex.naoh, 9], [118, tex.hcl, 8], [214, tex.brine, 9]].map(([x, t, rad]) => <mesh key={x as number} position={[x as number, 12, -92]} rotation-y={-Math.PI / 2 - 0.7}><cylinderGeometry args={[(rad as number) + 0.04, (rad as number) + 0.04, 5, 32, 1, true, 0, 1.4]} /><meshStandardMaterial map={t as THREE.Texture} roughness={0.6} side={THREE.DoubleSide} /></mesh>)}
    <mesh position={[-27, 10.2, 53.52]}><planeGeometry args={[20, 2.2]} /><meshStandardMaterial map={tex.gate} roughness={0.6} /></mesh>
    <mesh position={[-27, 10.2, 52.48]} rotation-y={Math.PI}><planeGeometry args={[20, 2.2]} /><meshStandardMaterial map={tex.gate} roughness={0.6} /></mesh>
    {/* 行道树：车间之间的空地和后面的绿化带 */}
    {[[86, -22, 24, 3], [86, -46, 21, 8], [186, -24, 25, 11], [186, -50, 22, 14], [284, -22, 23, 17], [292, -52, 26, 21], [-152, -30, 26, 5], [-146, 14, 22, 9], [100, -118, 28, 2], [176, -122, 30, 6], [-8, -128, 27, 12]].map(([x, z, h, s]) => <Tree key={`${x}${z}`} x={x} z={z} h={h} seed={s} />)}
  </group>
}

export function Plant() {
  return <group>
    {SHEDS.map(s => <Shed key={s.name} {...s} />)}
    <CellRoom />
    <PlatingShop />
    <SmeltShop />
    <Pier />
    <Yard />
  </group>
}
