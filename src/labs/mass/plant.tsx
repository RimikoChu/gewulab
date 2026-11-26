// 纯碱厂的反应车间、中控室和石灰窑：
// 反应车间是钢结构厂房（门式钢架、压型钢板墙面和屋面、高侧窗），前墙剖开；车间里有朝镜头剖开的燃烧炉、两只进料计量罐、产品罐，后面一排反应釜和管廊。
// 中控室接在车间东头：大屏、一排操作台、一张长展台（第 6 课在上面摆分子模型）。
// 厂房外往东是石灰窑：两座钢壳竖窑（混凝土基础、加强圈、窑顶平台）、上料斜桥、窑下的出灰称量斗、汽车衡，窑顶的二氧化碳管道通往碳化塔。
// 尺寸按画面单位写（1 m = 6 个单位）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, bolts, disc, lathe, mergeParts, type Part, type RY } from '@/lab-kit'
import { brickTex, epoxyTex, gravelTex, makeSign, ribTex, screenTex, tankLabel, tileTex, trendTex } from './mats'
import { BIN, CR, FOOT, FURN, KILN, PH, PIT, SCALE, SHOW } from './site'

const STEEL = '#64717c'
type P3 = [number, number, number]

/** 半边罐子：给出外壁截面（从下往上，起点和终点在转轴上），壁厚 t，只转半圈（留下 z < 0 的那一半），切口贴剖面 */
function halfTank(outer: RY[], t: number) {
  const inner = outer.map(([r, y], i): RY => [Math.max(0, r - t), i === 0 ? y + t : i === outer.length - 1 ? y - t : y]).reverse()
  const loop = [...outer, ...inner]
  const body = new THREE.LatheGeometry(loop.map(([r, y]) => new THREE.Vector2(r, y)), 48, Math.PI / 2, Math.PI)
  const s = new THREE.Shape(loop.map(([r, y]) => new THREE.Vector2(r, y)))
  const capR = new THREE.ShapeGeometry(s), capL = new THREE.ShapeGeometry(s); capL.scale(-1, 1, 1)
  const cap = mergeGeometries([capR, capL]), p = cap.attributes.position, uv = cap.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 3, p.getY(i) / 3)
  return { body, cap, inner: new THREE.LatheGeometry(inner.slice().reverse().map(([r, y]) => new THREE.Vector2(r, y)), 48, Math.PI / 2, Math.PI) }
}
/** 立式罐的截面（画面单位）：半椭圆的上下封头，直筒段 */
export function tankProfile(R: number, y0: number, h: number, head: number): RY[] {
  const p: RY[] = []
  for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; p.push([Math.sin(a) * R, y0 + head - Math.cos(a) * head]) }
  for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; p.push([Math.cos(a) * R, y0 + head + h + Math.sin(a) * head]) }
  return p
}
/** 一段管子加两头的法兰 */
function pipe(P: Part[], a: P3, b: P3, r: number, c = '#c8cdd0') {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q)
  P.push({ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: [r, len, r], c, r: [e.x, e.y, e.z], cyl: true })
  for (const t of [0.01, 0.99]) P.push({ p: [a[0] + d.x * t, a[1] + d.y * t, a[2] + d.z * t], s: [r * 1.5, 0.3, r * 1.5], c, r: [e.x, e.y, e.z], cyl: true })
}
/** 一条沿几个点走的管线 */
const run = (P: Part[], pts: P3[], r: number, c?: string) => { for (let i = 1; i < pts.length; i++) pipe(P, pts[i - 1], pts[i], r, c) }
/** 栏杆：沿 x 从 x0 到 x1，在 z、高 y */
function rail(P: Part[], x0: number, x1: number, y: number, z: number, c = '#e1b21e') {
  for (let x = x0; x <= x1 + 0.01; x += 6) P.push({ p: [x, y + 3.3, z], s: [0.2, 6.6, 0.2], c, cyl: true })
  for (const h of [3.3, 6.6]) P.push({ p: [(x0 + x1) / 2, y + h, z], s: [x1 - x0, 0.18, 0.18], c })
  P.push({ p: [(x0 + x1) / 2, y + 0.4, z], s: [x1 - x0, 0.8, 0.08], c })
}

/** 进料计量罐、产品罐的位置（第 5 课在它们正面挂读数） */
export const FEED = { fuel: { x: FURN.x - 17, z: FURN.z - 2 }, o2: { x: FURN.x - 9, z: FURN.z - 8 }, prod: { x: FURN.x + 16, z: FURN.z - 2 } }
export const FEED_H = { y0: 3, h: 12, r: 2.6 }

// ---------- 反应车间 ----------
function hallParts() {
  const P: Part[] = [], H = PH, FRAMES = [-20, 12, 44, 76, 108]
  for (const x of FRAMES) {
    for (const z of (x === H.x0 || x === H.x1 ? [H.z0 + 0.6, H.z1 - 0.6] : [H.z0 + 0.6])) P.push({ p: [x, H.eave / 2, z], s: [1.2, H.eave, 1.6], c: STEEL }, { p: [x, 0.25, z], s: [2.4, 0.5, 2.6], c: '#4b555e' })
    const rn = (H.z1 - H.z0) / 2, rise = H.ridge - H.eave, len = Math.hypot(rn, rise), a = Math.atan2(rise, rn)
    for (const s of [-1, 1]) P.push({ p: [x, (H.eave + H.ridge) / 2 - 0.6, (H.z0 + H.z1) / 2 + s * rn / 2], s: [1.1, 1.8, len], c: STEEL, r: [s * a, 0, 0] })
  }
  const rn = (H.z1 - H.z0) / 2, rise = H.ridge - H.eave
  for (let k = 0; k <= 5; k++) for (const s of [-1, 1]) { const q = k / 5, z = (H.z0 + H.z1) / 2 + s * rn * (1 - q), y = H.eave + rise * q - 1.2; P.push({ p: [(H.x0 + H.x1) / 2, y, z], s: [H.x1 - H.x0, 0.6, 0.35], c: '#7c8992' }) }
  for (let y = 12; y < H.eave; y += 14.4) P.push({ p: [(H.x0 + H.x1) / 2, y, H.z0 + 1.6], s: [H.x1 - H.x0, 0.5, 0.3], c: '#7c8992' })
  for (const z of [-6, -10]) P.push({ p: [(H.x0 + H.x1) / 2, 0.16, z], s: [H.x1 - H.x0 - 4, 0.02, 0.35], c: '#e3b21c' })
  // 反应釜的操作平台：钢格板、四根柱子、栏杆、一部斜梯
  P.push({ p: [84, 10, -42], s: [44, 0.5, 14], c: '#7b868e' })
  for (const x of [63, 105]) for (const z of [-48.5, -35.5]) P.push({ p: [x, 5, z], s: [0.8, 10, 0.8], c: STEEL })
  rail(P, 62, 106, 10.2, -35.2)
  for (let k = 0; k < 14; k++) P.push({ p: [61.6 - k * 0.75, 0.4 + k * 0.7, -38], s: [0.8, 0.18, 3], c: '#7b868e' })
  // 进料罐、产品罐的裙座和爬梯
  for (const f of [FEED.fuel, FEED.o2, FEED.prod]) { P.push({ p: [f.x, FEED_H.y0 / 2, f.z], s: [FEED_H.r * 0.85, FEED_H.y0, FEED_H.r * 0.85], c: '#8a949b', cyl: true }) }
  // 燃烧炉的裙座和炉底的燃烧器
  P.push({ p: [FURN.x, FURN.y0 / 2, FURN.z], s: [FURN.r * 0.8, FURN.y0, FURN.r * 0.8], c: '#59636b', cyl: true })
  // 燃烧炉顶上的平台
  P.push({ p: [FURN.x, FURN.y0 + FURN.h + 5.2, FURN.z - 3], s: [12, 0.4, 6], c: '#7b868e' })
  return P
}
function pipeParts() {
  const P: Part[] = [], F = FURN, top = F.y0 + F.h + 4.2
  // 进料：两只计量罐底部出来，沿地面走到炉底燃烧器
  run(P, [[FEED.fuel.x, FEED_H.y0 + 0.4, FEED.fuel.z + 1.2], [FEED.fuel.x, 1.6, FEED.fuel.z + 1.2], [F.x - 1.2, 1.6, FEED.fuel.z + 1.2], [F.x - 1.2, 1.6, F.z], [F.x - 0.6, F.y0 + 0.2, F.z]], 0.5, '#9aa3a8')
  run(P, [[FEED.o2.x, FEED_H.y0 + 0.4, FEED.o2.z + 1.4], [FEED.o2.x, 2.6, FEED.o2.z + 1.4], [F.x + 0.8, 2.6, FEED.o2.z + 1.4], [F.x + 0.8, 2.6, F.z - 0.8], [F.x + 0.6, F.y0 + 0.2, F.z - 0.6]], 0.42, '#3f78b8')
  // 出料：炉顶出来，向右下到产品罐顶
  run(P, [[F.x, top - 0.6, F.z], [F.x, top + 2.4, F.z], [FEED.prod.x, top + 2.4, F.z], [FEED.prod.x, top + 2.4, FEED.prod.z], [FEED.prod.x, FEED_H.y0 + FEED_H.h + 2.4, FEED.prod.z]], 0.6, '#c8cdd0')
  // 管廊：沿后墙两层管子
  for (const [y, c] of [[30, '#c8cdd0'], [32.4, '#3f78b8'], [34.8, '#d9b21c']] as [number, string][]) pipe(P, [PH.x0 + 2, y, PH.z0 + 4], [PH.x1 - 2, y, PH.z0 + 4], 0.5, c)
  for (let x = PH.x0 + 8; x < PH.x1; x += 16) P.push({ p: [x, 29.2, PH.z0 + 4], s: [0.5, 0.5, 4], c: STEEL })
  // 反应釜的进出料管，往上接到管廊
  for (let i = 0; i < 4; i++) { const x = 68 + i * 11; pipe(P, [x + 1.2, 24, -42], [x + 1.2, 30, PH.z0 + 4], 0.35); pipe(P, [x, 4.2, -40], [x, 0.5, -40], 0.4) }
  return P
}
/** 压型钢板的墙面和屋面 */
function useCladding() {
  return useMemo(() => {
    const H = PH, rn = (H.z1 - H.z0) / 2, rise = H.ridge - H.eave, len = Math.hypot(rn, rise), a = Math.atan2(rise, rn)
    const back = mergeGeometries([new THREE.PlaneGeometry(H.x1 - H.x0, 36).translate((H.x0 + H.x1) / 2, 18, H.z0), new THREE.PlaneGeometry(H.x1 - H.x0, 8).translate((H.x0 + H.x1) / 2, 50, H.z0)])
    const gable = (x: number, s: number) => { const sh = new THREE.Shape([new THREE.Vector2(H.z0, 0), new THREE.Vector2(H.z1, 0), new THREE.Vector2(H.z1, H.eave), new THREE.Vector2((H.z0 + H.z1) / 2, H.ridge), new THREE.Vector2(H.z0, H.eave)]); const g = new THREE.ShapeGeometry(sh); g.rotateY(-Math.PI / 2); g.translate(x + s * 0.01, 0, 0); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) / 8, p.getY(i) / 8); return g }
    const roof = mergeGeometries([-1, 1].map(s => { const g = new THREE.BoxGeometry(H.x1 - H.x0 + 2, 0.4, len + 1.2); g.rotateX(s * a); g.translate((H.x0 + H.x1) / 2, (H.eave + H.ridge) / 2 + 0.3, (H.z0 + H.z1) / 2 + s * rn / 2); return g }))
    const back2 = back.clone(); const uv = back2.attributes.uv, p = back2.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 8, p.getY(i) / 8)
    return { back: back2, ends: mergeGeometries([gable(H.x0, -1), gable(H.x1, 1)]), roof, win: new THREE.PlaneGeometry(H.x1 - H.x0 - 8, 6).translate((H.x0 + H.x1) / 2, 42, H.z0 + 0.05) }
  }, [])
}

/** 燃烧炉：钢壳立式炉，内衬耐火砖，朝镜头剖开；炉底一只燃烧器，侧面一个视孔，炉顶出口 */
function Furnace() {
  const F = FURN
  const g = useMemo(() => {
    const prof = tankProfile(F.r, F.y0, F.h, 2.2)
    const out: RY[] = [[0, F.y0], ...prof.slice(1, -1), [0.9, F.y0 + F.h + 4.4], [0.9, F.y0 + F.h + 5.2], [0, F.y0 + F.h + 5.2]]
    return halfTank(out, 0.9)
  }, [F])
  const tex = useMemo(() => { const c = brickTex().clone(); c.needsUpdate = true; return { c, label: tankLabel('燃烧炉', 'R-101') } }, [])
  const burner = useMemo(() => lathe([[0, 0], [0.9, 0], [0.9, 0.6], [0.5, 0.9], [0.45, 1.8], [0.25, 1.8], [0.25, 1.2], [0, 1.2]]), [])
  const ring = useMemo(() => bolts(10, 1.25, 0.22), [])
  return <group position={[F.x, 0, F.z]}>
    <mesh geometry={g.body} castShadow receiveShadow><meshStandardMaterial color="#596a74" metalness={0.55} roughness={0.42} envMapIntensity={1.2} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.inner} scale={[0.995, 1, 0.995]}><meshStandardMaterial color="#9c6f55" roughness={0.95} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.cap}><meshStandardMaterial map={tex.c} color="#b8a48a" roughness={0.95} side={THREE.DoubleSide} /></mesh>
    {/* 炉身上的两道加强圈 */}
    {[0.3, 0.7].map(q => <mesh key={q} position-y={F.y0 + 2.2 + F.h * q}><cylinderGeometry args={[F.r + 0.25, F.r + 0.25, 0.6, 48, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#4a5960" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} /></mesh>)}
    <mesh geometry={burner} position-y={F.y0 + 0.9} castShadow><Metal kind="stainless" grain="turned" /></mesh>
    <mesh geometry={ring} position-y={F.y0 + 1.5}><Metal kind="steel" /></mesh>
    <mesh position={[-F.r - 0.05, F.y0 + F.h * 0.55, -1.4]} rotation-y={-Math.PI / 2 + 0.3}><planeGeometry args={[3.4, 1.7]} /><meshStandardMaterial map={tex.label} roughness={0.6} /></mesh>
  </group>
}
/** 计量罐：不锈钢的立式小罐，正面一块读数板（第 5 课画数字） */
function FeedTank({ x, z, name, f }: { x: number; z: number; name: string; f: string }) {
  const g = useMemo(() => lathe(tankProfile(FEED_H.r, FEED_H.y0, FEED_H.h - 2.4, 1.2), { segs: 40 }), [])
  const label = useMemo(() => tankLabel(name, f), [name, f])
  return <group position={[x, 0, z]}>
    <mesh geometry={g} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.3} /></mesh>
    <mesh position={[0, FEED_H.y0 + 7.2, FEED_H.r + 0.02]}><planeGeometry args={[3.2, 1.6]} /><meshStandardMaterial map={label} roughness={0.6} /></mesh>
    <mesh position={[0, FEED_H.y0 + 4.3, FEED_H.r + 0.15]}><boxGeometry args={[3.4, 1.7, 0.3]} /><meshStandardMaterial color="#2a3036" roughness={0.5} metalness={0.4} /></mesh>
  </group>
}
/** 反应釜：带夹套的搪瓷釜，顶上电机和减速机，坐在平台上 */
function Kettles() {
  const body = useMemo(() => lathe(tankProfile(3.2, 0, 9, 1.4), { segs: 40 }), [])
  const jacket = useMemo(() => lathe([[0, -0.6], [3.5, -0.6], [3.6, 0.4], [3.6, 7], [3.4, 7.4], [0, 7.4]], { segs: 40 }), [])
  return <group>{[0, 1, 2, 3].map(i => { const x = 68 + i * 11, y = 6.4; return <group key={i} position={[x, y, -42]}>
    <mesh geometry={jacket} castShadow receiveShadow><meshPhysicalMaterial color="#3e6f9a" roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh geometry={body} castShadow><meshPhysicalMaterial color="#e9ecea" roughness={0.25} clearcoat={0.8} /></mesh>
    <mesh position-y={13.2} castShadow><cylinderGeometry args={[1, 1.2, 2.4, 20]} /><meshStandardMaterial color="#2f6f54" roughness={0.45} metalness={0.3} /></mesh>
    <mesh position={[0, 15.2, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.9, 0.9, 3.2, 20]} /><meshStandardMaterial color="#2f6f54" roughness={0.45} metalness={0.3} /></mesh>
  </group> })}</group>
}

// ---------- 中控室 ----------
function ctrlParts() {
  const P: Part[] = [], C = CR
  // 一排操作台：斜面台面、下面的柜体
  for (let i = 0; i < 4; i++) { const x = C.x0 + 7 + i * 9.5; P.push({ p: [x, 2.4, -19], s: [8.6, 4.8, 3.4], c: '#3b4248' }, { p: [x, 5, -19.4], s: [8.8, 0.3, 4], c: '#c9ccca' }) }
  // 展台：深色台面、四条腿、一道收边
  P.push({ p: [SHOW.x, SHOW.top - 0.2, SHOW.z], s: [SHOW.len, 0.4, 4.4], c: '#22272b' }, { p: [SHOW.x, SHOW.top - 0.55, SHOW.z], s: [SHOW.len - 0.6, 0.3, 4.0], c: '#3a4146' })
  for (const s of [-1, 1]) for (const t of [-1, 1]) P.push({ p: [SHOW.x + s * (SHOW.len / 2 - 1), (SHOW.top - 0.6) / 2, SHOW.z + t * 1.6], s: [0.5, SHOW.top - 0.6, 0.5], c: '#596168' })
  // 窗框：朝车间的那面墙上一排竖框
  for (let z = C.z0 + 2; z < C.z1; z += 6) P.push({ p: [C.x0 + 0.2, C.h / 2, z], s: [0.5, C.h, 0.4], c: '#7f8a92' })
  return P
}
function ControlRoom() {
  const C = CR
  const tex = useMemo(() => { const t = tileTex().clone(); t.repeat.set(1, 1); t.needsUpdate = true; return { tile: t, screen: screenTex(), trend: trendTex(), sign: makeSign(['中控室'], '#1f6f8a', '#ffffff', 512, 128) } }, [])
  const geo = useMemo(() => ({
    parts: mergeParts(ctrlParts()),
    floor: (() => { const g = new THREE.BoxGeometry(C.x1 - C.x0, 0.2, C.z1 - C.z0); g.translate((C.x0 + C.x1) / 2, 0.1, (C.z0 + C.z1) / 2); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 3.6, p.getZ(i) / 3.6); return g })(),
  }), [C])
  return <group>
    <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
    <mesh position={[(C.x0 + C.x1) / 2, C.h / 2, C.z0]} receiveShadow><boxGeometry args={[C.x1 - C.x0, C.h, 0.6]} /><meshStandardMaterial color="#d9dcd9" roughness={0.85} /></mesh>
    <mesh position={[C.x1, C.h / 2, (C.z0 + C.z1) / 2]} receiveShadow><boxGeometry args={[0.6, C.h, C.z1 - C.z0]} /><meshStandardMaterial color="#d9dcd9" roughness={0.85} /></mesh>
    <mesh position={[(C.x0 + C.x1) / 2, C.h + 0.3, (C.z0 + C.z1) / 2]}><boxGeometry args={[C.x1 - C.x0, 0.6, C.z1 - C.z0]} /><meshStandardMaterial color="#cfd2cf" roughness={0.9} /></mesh>
    {/* 朝车间的一面大玻璃窗 */}
    <mesh position={[C.x0, C.h / 2 + 1, (C.z0 + C.z1) / 2]} rotation-y={Math.PI / 2} renderOrder={3}><planeGeometry args={[C.z1 - C.z0, C.h - 6]} /><meshPhysicalMaterial color="#9fb7c4" transparent opacity={0.18} roughness={0.05} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh position={[C.x0, 2, (C.z0 + C.z1) / 2]}><boxGeometry args={[0.6, 4, C.z1 - C.z0]} /><meshStandardMaterial color="#d9dcd9" roughness={0.85} /></mesh>
    {/* 大屏 */}
    <mesh position={[(C.x0 + C.x1) / 2, 12.4, C.z0 + 0.4]}><boxGeometry args={[34.6, 10.6, 0.4]} /><meshStandardMaterial color="#15181b" roughness={0.4} /></mesh>
    <mesh position={[(C.x0 + C.x1) / 2, 12.4, C.z0 + 0.62]}><planeGeometry args={[34, 10]} /><meshBasicMaterial map={tex.screen} toneMapped={false} color="#7f8c95" /></mesh>
    <mesh position={[(C.x0 + C.x1) / 2, 18.6, C.z0 + 0.4]}><planeGeometry args={[8, 2]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
    <mesh geometry={geo.parts} castShadow receiveShadow><Painted rough={0.45} metal={0.2} /></mesh>
    {/* 操作台上的显示器 */}
    {Array.from({ length: 8 }, (_, i) => { const x = C.x0 + 7 + Math.floor(i / 2) * 9.5 + (i % 2 ? 2 : -2); return <group key={i} position={[x, 6.8, -20.2]} rotation-x={-0.12}>
      <mesh castShadow><boxGeometry args={[3.6, 2.3, 0.2]} /><meshStandardMaterial color="#1a1d20" roughness={0.4} /></mesh>
      <mesh position-z={0.11}><planeGeometry args={[3.4, 2.1]} /><meshBasicMaterial map={tex.trend} toneMapped={false} color="#9fb0bb" /></mesh>
    </group> })}
  </group>
}

// ---------- 石灰窑 ----------
export const KILN_TOP = KILN.base + KILN.h
/** 汽车衡的仪表亭：在秤台后面 */
export const KIOSK = { x: SCALE.x - 22, z: SCALE.z - 17 }
function kilnParts() {
  const P: Part[] = [], K = KILN
  for (const x of [K.x, K.x + K.gap]) {
    // 混凝土基础，下面留出出灰的门洞
    P.push({ p: [x - 6, K.base / 2, K.z], s: [4, K.base, 16], c: '#b6b2a8' }, { p: [x + 6, K.base / 2, K.z], s: [4, K.base, 16], c: '#b6b2a8' }, { p: [x, K.base - 1.2, K.z], s: [16, 2.4, 16], c: '#c2beb4' })
    // 窑顶平台：钢格板、栏杆、加料的料钟罩
    P.push({ p: [x, K.base + K.h + 0.3, K.z], s: [16, 0.6, 16], c: '#7b868e' })
    for (const s of [-1, 1]) { P.push({ p: [x, K.base + K.h + 3.6, K.z + s * 8], s: [16, 0.2, 0.2], c: '#e1b21e' }); P.push({ p: [x + s * 8, K.base + K.h + 3.6, K.z], s: [0.2, 0.2, 16], c: '#e1b21e' }) }
    for (const s of [-1, 1]) for (const t of [-1, 1]) P.push({ p: [x + s * 8, K.base + K.h + 1.9, K.z + t * 8], s: [0.2, 3.4, 0.2], c: '#e1b21e', cyl: true })
    P.push({ p: [x, K.base + K.h + 2.8, K.z], s: [2.6, 5, 2.6], c: '#59636b', cyl: true })
    // 出灰溜槽
    P.push({ p: [x, K.base - 3.5, K.z + 4.5], s: [3, 0.4, 7], c: '#59636b', r: [0.5, 0, 0] })
    // 窑顶的加料小房：钢板墙、蓝色屋面、一扇门
    P.push({ p: [x + 2.5, K.base + K.h + 3.6, K.z - 3], s: [7, 6, 7], c: '#d6d9d6' }, { p: [x + 2.5, K.base + K.h + 6.8, K.z - 3], s: [7.8, 0.5, 7.8], c: '#3f78b8' }, { p: [x + 2.5, K.base + K.h + 2.8, K.z + 0.55], s: [2, 4, 0.15], c: '#5a6470' })
    // 窑底的卸灰锥和溜管
    P.push({ p: [x, K.base - 4.6, K.z + 2.5], s: [1.4, 3.4, 1.4], c: '#59636b', cyl: true })
    // 窑身旁的爬梯
    for (let y = K.base + 2; y < K.base + K.h; y += 1.6) P.push({ p: [x - K.r - 0.9, y, K.z + 1.5], s: [0.12, 0.12, 1.4], c: '#e1b21e' })
    for (const s of [-1, 1]) P.push({ p: [x - K.r - 0.9, K.base + K.h / 2, K.z + 1.5 + s * 0.7], s: [0.14, K.h, 0.14], c: '#e1b21e', cyl: true })
  }
  // 上料斜桥：两根桁架梁从地面斜着搭到 1 号窑顶，上面跑料车
  const a = [FOOT.x, 1, FOOT.z] as P3, b = [K.x - 7, K.base + K.h + 2, K.z] as P3
  for (const s of [-1, 1]) { const A: P3 = [a[0], a[1], a[2] + s * 1.6], B: P3 = [b[0], b[1], b[2] + s * 1.6]; pipe(P, A, B, 0.45, '#5f6a72'); for (let k = 1; k < 8; k++) { const q = k / 8; P.push({ p: [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q - 3, a[2] + s * 1.6], s: [0.4, 6, 0.4], c: '#5f6a72' }) } }
  for (let k = 1; k < 8; k++) { const q = k / 8, x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q; P.push({ p: [x, y / 2, K.z], s: [0.7, y, 0.7], c: '#5f6a72' }) }
  // 斜桥脚下的受料斗
  P.push({ p: [a[0] + 2, 3, K.z + 4], s: [7, 6, 7], c: '#6d777e' })
  // 卸料坑：一圈混凝土坑沿、上面一块钢格栅；坑旁一堆备用的石灰石
  P.push({ p: [PIT.x, 0.3, PIT.z], s: [16, 0.6, 14], c: '#a9a59b' }, { p: [PIT.x, 0.62, PIT.z], s: [13, 0.1, 11], c: '#3b4045' })
  for (let i = -5; i <= 5; i++) P.push({ p: [PIT.x + i * 1.1, 0.7, PIT.z], s: [0.18, 0.12, 11], c: '#7d858b' })
  // 皮带廊：从卸料坑底下出来，架在一排支腿上，斜着送到斜桥脚下的受料斗
  { const A = new THREE.Vector3(PIT.x, 3, PIT.z - 6), Bv = new THREE.Vector3(FOOT.x + 3, 6.5, FOOT.z + 4), d = Bv.clone().sub(A), len = d.length(), yaw = Math.atan2(-d.z, d.x), pitch = Math.asin(d.y / len)
    P.push({ p: [(A.x + Bv.x) / 2, (A.y + Bv.y) / 2, (A.z + Bv.z) / 2], s: [len, 0.8, 2.6], c: '#5f6a72', r: [0, yaw, pitch] })
    P.push({ p: [(A.x + Bv.x) / 2, (A.y + Bv.y) / 2 + 0.5, (A.z + Bv.z) / 2], s: [len, 0.2, 2.0], c: '#262a2e', r: [0, yaw, pitch] })
    for (let k = 0; k <= 8; k++) { const q = k / 8, p = A.clone().addScaledVector(d, q); P.push({ p: [p.x, (p.y - 0.4) / 2, p.z], s: [0.5, p.y - 0.4, 0.5], c: STEEL }) } }
  // 出灰称量斗的支架
  for (const s of [-1, 1]) for (const t of [-1, 1]) P.push({ p: [BIN.x + s * 3, 2.6, BIN.z + t * 3], s: [0.5, 5.2, 0.5], c: STEEL })
  // 窑顶的二氧化碳管道：两座窑汇成一根，往东去碳化塔
  run(P, [[K.x, K.base + K.h + 5.3, K.z], [K.x, K.base + K.h + 9, K.z], [K.x + K.gap, K.base + K.h + 9, K.z]], 1.0, '#d9dcd8')
  run(P, [[K.x + K.gap, K.base + K.h + 5.3, K.z], [K.x + K.gap, K.base + K.h + 9, K.z], [K.x + K.gap + 26, K.base + K.h + 9, K.z], [K.x + K.gap + 26, K.base + K.h + 9, K.z - 14], [K.x + K.gap + 46, K.base + K.h + 9, K.z - 14]], 1.0, '#d9dcd8')
  // 汽车衡的仪表亭
  P.push({ p: [KIOSK.x, 4.5, KIOSK.z], s: [8, 9, 7], c: '#dfe2df' }, { p: [KIOSK.x, 9.3, KIOSK.z], s: [9, 0.6, 8], c: '#3f78b8' }, { p: [KIOSK.x, 5.5, KIOSK.z + 3.55], s: [4, 3, 0.2], c: '#2d3a44' })
  return P
}
function Kilns() {
  const K = KILN
  const shell = useMemo(() => lathe([[0, 0], [K.r - 1.6, -2.6], [K.r, 0], [K.r, K.h], [K.r - 1.2, K.h + 1.4], [0, K.h + 1.4]], { segs: 48 }), [K])
  // 钢箍：一道道加宽的箍带；每道上一圈螺栓
  const rings = useMemo(() => mergeGeometries(Array.from({ length: 6 }, (_, i) => { const g = new THREE.CylinderGeometry(K.r + 0.42, K.r + 0.42, 1.0, 48); g.translate(0, 5 + i * 11, 0); return g })), [K])
  const ringBolts = useMemo(() => mergeGeometries(Array.from({ length: 6 }, (_, i) => bolts(24, K.r + 0.3, 0.34, 0.3).translate(0, 5.5 + i * 11, 0))), [K])
  // 中部的操作平台：一圈环形钢格板、栏杆
  const deck = useMemo(() => disc(K.r + 3.6, 0.4, { hole: K.r + 0.1 }), [K])
  const rail = useMemo(() => { const g = new THREE.TorusGeometry(K.r + 3.4, 0.12, 6, 48); g.rotateX(Math.PI / 2); return g }, [K])
  const posts = useMemo(() => mergeGeometries(Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2, g = new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6); g.translate(Math.cos(a) * (K.r + 3.4), 1.7, Math.sin(a) * (K.r + 3.4)); return g })), [K])
  const label = useMemo(() => tankLabel('石灰窑', 'CaCO₃ → CaO'), [])
  const doorYs = [14, 38, 52]
  return <group>{[K.x, K.x + K.gap].map((x, i) => <group key={x} position={[x, K.base, K.z]}>
    <mesh geometry={shell} castShadow receiveShadow><meshStandardMaterial color="#7a8087" metalness={0.5} roughness={0.6} envMapIntensity={0.8} /></mesh>
    <mesh geometry={rings} castShadow><meshStandardMaterial color="#4e545a" metalness={0.6} roughness={0.5} /></mesh>
    <mesh geometry={ringBolts}><Metal kind="steel" /></mesh>
    {/* 检修门：方门框、门板、两道铰链、一根把手 */}
    {doorYs.map(y => <group key={y} position={[0, y, K.r + 0.15]}>
      <mesh castShadow><boxGeometry args={[2.8, 3.4, 0.5]} /><meshStandardMaterial color="#3e444a" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position-z={0.3}><boxGeometry args={[2.2, 2.8, 0.2]} /><meshStandardMaterial color="#6b737a" metalness={0.5} roughness={0.55} /></mesh>
      {[-0.9, 0.9].map(h => <mesh key={h} position={[-1.15, h, 0.45]}><boxGeometry args={[0.5, 0.35, 0.2]} /><Metal kind="iron" grain="cast" /></mesh>)}
      <mesh position={[0.75, 0, 0.55]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.1, 0.1, 0.5, 8]} /><Metal kind="steel" /></mesh>
    </group>)}
    <group position-y={26}>
      <mesh geometry={deck} castShadow receiveShadow><meshStandardMaterial color="#7b868e" metalness={0.4} roughness={0.6} /></mesh>
      <mesh geometry={posts} position-y={0.4}><meshStandardMaterial color="#e1b21e" roughness={0.5} /></mesh>
      <mesh geometry={rail} position-y={3.6}><meshStandardMaterial color="#e1b21e" roughness={0.5} /></mesh>
    </group>
    <mesh position={[0, K.h * 0.62, K.r + 0.05]}><planeGeometry args={[6, 3]} /><meshStandardMaterial map={label} roughness={0.6} /></mesh>
    <mesh position={[0, K.h * 0.62 - 2.4, K.r + 0.05]}><planeGeometry args={[2.4, 1.1]} /><meshStandardMaterial map={makeSign([`${i + 1} 号`], '#1f2124', '#ffffff', 256, 128)} roughness={0.6} /></mesh>
  </group>)}
  {/* 卸料坑旁的一堆石灰石 */}
  <mesh position={[PIT.x + 22, 0, PIT.z - 6]} scale={[9, 3.6, 7]}><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color="#b3ac9d" roughness={1} flatShading /></mesh>
  </group>
}
/** 出灰称量斗：漏斗形的钢斗（第 7 课在正面挂读数）。原点在斗口 */
function Bin() {
  const g = useMemo(() => lathe([[0.8, 0], [0.8, 1.2], [3.4, 4.2], [3.4, 8], [3.6, 8.2], [0, 8.2]], { segs: 4, crease: 20 }), [])
  return <mesh geometry={g} position={[BIN.x, 4.8, BIN.z]} rotation-y={Math.PI / 4} castShadow receiveShadow><meshStandardMaterial color="#6d777e" metalness={0.5} roughness={0.5} /></mesh>
}
/** 碳化塔：一根高高的塔，几层平台 */
function Tower() {
  const x = KILN.x + KILN.gap + 52, z = KILN.z - 14
  const g = useMemo(() => lathe(tankProfile(5, 2, 96, 3), { segs: 40 }), [])
  return <group position={[x, 0, z]}>
    <mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial color="#e6e7e2" roughness={0.4} clearcoat={0.4} /></mesh>
    {[34, 68].map(y => <mesh key={y} position-y={y}><cylinderGeometry args={[8, 8, 0.6, 32]} /><meshStandardMaterial color="#7b868e" metalness={0.4} roughness={0.5} /></mesh>)}
    <mesh position={[0, 80, 5.05]}><planeGeometry args={[7, 3.5]} /><meshStandardMaterial map={tankLabel('碳化塔', 'CO₂')} roughness={0.6} /></mesh>
  </group>
}

export function Plant() {
  const clad = useCladding()
  const tex = useMemo(() => {
    const wall = ribTex([214, 218, 214]).clone(); wall.needsUpdate = true
    const roof = ribTex([150, 160, 168]).clone(); roof.repeat.set(16, 1); roof.needsUpdate = true
    const floor = epoxyTex().clone(); floor.repeat.set(8, 4); floor.needsUpdate = true
    const gravel = gravelTex().clone(); gravel.repeat.set(14, 8); gravel.needsUpdate = true
    return { wall, roof, floor, gravel, sign: makeSign(['反应车间'], '#1f6f8a', '#ffffff', 1024, 128) }
  }, [])
  const geo = useMemo(() => ({ hall: mergeParts(hallParts()), pipes: mergeParts(pipeParts()), kiln: mergeParts(kilnParts()) }), [])
  return <group>
    {/* 车间 */}
    <mesh rotation-x={-Math.PI / 2} position={[(PH.x0 + PH.x1) / 2, 0.12, (PH.z0 + PH.z1) / 2]} receiveShadow><planeGeometry args={[PH.x1 - PH.x0, PH.z1 - PH.z0]} /><meshStandardMaterial map={tex.floor} roughness={0.35} metalness={0.05} /></mesh>
    <mesh geometry={clad.back} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.55} metalness={0.2} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={clad.ends} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.55} metalness={0.2} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={clad.win}><meshPhysicalMaterial color="#25323c" roughness={0.1} clearcoat={1} envMapIntensity={1.4} /></mesh>
    <mesh geometry={clad.roof} castShadow receiveShadow><meshStandardMaterial map={tex.roof} roughness={0.55} metalness={0.25} /></mesh>
    <mesh position={[44, 44, PH.z0 + 0.1]}><planeGeometry args={[22, 2.8]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
    <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.5} metal={0.3} /></mesh>
    <mesh geometry={geo.pipes} castShadow><Painted rough={0.3} metal={0.6} /></mesh>
    <Furnace />
    <FeedTank x={FEED.fuel.x} z={FEED.fuel.z} name="燃料计量罐" f="V-101" />
    <FeedTank x={FEED.o2.x} z={FEED.o2.z} name="氧气缓冲罐" f="V-102" />
    <FeedTank x={FEED.prod.x} z={FEED.prod.z} name="产品罐" f="V-103" />
    <Kettles />
    <ControlRoom />
    {/* 石灰窑区：碎石地 */}
    <mesh rotation-x={-Math.PI / 2} position={[KILN.x + 20, 0.06, -40]} receiveShadow><planeGeometry args={[180, 90]} /><meshStandardMaterial map={tex.gravel} roughness={1} /></mesh>
    <mesh geometry={geo.kiln} castShadow receiveShadow><Painted rough={0.7} metal={0.15} /></mesh>
    <Kilns />
    <Bin />
    <Tower />
    {/* 汽车衡的秤台：一块带花纹的钢板，四周一圈混凝土 */}
    <mesh position={[SCALE.x, 0.25, SCALE.z]} receiveShadow><boxGeometry args={[SCALE.w + 2, 0.5, SCALE.d + 2]} /><meshStandardMaterial color="#a8a59c" roughness={0.9} /></mesh>
    <mesh position={[SCALE.x, 0.55, SCALE.z]} receiveShadow castShadow><boxGeometry args={[SCALE.w, 0.2, SCALE.d]} /><Metal kind="steel" grain="cast" rough={0.6} /></mesh>
  </group>
}
