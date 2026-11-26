// 溶液实验室的大场景：盐湖边的一座盐场。西边是盐场化验室（朝南敞着门脸，靠北墙一条长化验台，各课占一格，中间空地上一块坐标白板）；
// 往东是水泥场院和盐堆；往北是一格格的盐田：靠场院的一排是结晶池，再往北三排蒸发池，卤水颜色一排排变浅；
// 再往北是盐湖，湖岸一圈白色盐壳，湖边一座引卤泵房；远处一溜褐色的山。画面里 1 m 画成 M 个单位。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Metal, Painted, mergeParts, useConcrete, useRipple, type Label, type Part } from '@/lab-kit'
import { benchTex, crustTex, dikeTex, makeBoard, makeSign, rng, roofTex, saltFlatTex, strataTex, tileTex, wallTex, wallTileTex } from './mats'

export const M = 6, TOP = 0.85 * M      // 1 m 在画面里多长；化验台台面的高度
export type V3 = [number, number, number]

/** 化验室：x 的范围、后墙和门脸的 z、层高；化验台的前后沿；器材摆在 z = BZ 这条线上 */
export const HALL = { x0: -112, x1: -4, z0: -18, z1: 4, h: 22 }
export const BENCH = { z0: -17.4, z1: -12.9 }
export const BZ = -15
/** 化验台上各格的中心（x）：每两根柱子之间一格 */
export const ST = { l1: -100, l2: -84, l3: -68, l4: -52, l6: -36, l7: -20 }
/** 第 5 课的坐标白板：板面中心、宽高（场景单位），板面朝 +z */
export const BOARD = { x: -60, y: 9.4, z: -3, w: 13.2, h: 7.6 }
/** 盐田：结晶池一排在 z0–z1；第 6 课看的那一格（剖开南边的池埂）在 x0–x1 */
export const POND = { x0: 20, x1: 140, z0: -150, z1: -40, floor: 0.7, brine: 2.0, dike: 3.0 }
/** 盐田的格子：每一列的 x 范围、每一排的 z 范围和卤水颜色（结晶池在最南） */
const COLS: [number, number][] = [[-220, -100], [-90, 10], [20, 140], [150, 270], [280, 400], [410, 530]]
const ROWS: { z: [number, number]; color: string; crystal?: boolean }[] = [
  { z: [POND.z0, POND.z1], color: '#d9908f', crystal: true },
  { z: [-290, -170], color: '#cdb873' },
  { z: [-430, -310], color: '#8fb894' },
  { z: [-570, -450], color: '#4f9fa3' },
]
export const LAKE = { z: -620, y: 0.7 }
export const PUMP = { x: 340, z: -600 }
export const PILE = { x: 190, z: 70 }

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], indoor: boolean, fog: [number, number] = [160, 1200]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, indoor, fog })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(ST.l1, TOP + 0.42, BZ, 1.85, 0.8, [-0.1, 0.07], true),
  l2: spot(ST.l2 - 0.1, TOP + 0.75, BZ, 2.1, 1.45, [0.12, 0.08], true),
  l3: spot(ST.l3 + 0.03, TOP + 0.82, BZ, 2.4, 1.4, [-0.16, 0.07], true),
  l4: spot(ST.l4 + 0.05, TOP + 0.6, BZ, 2.6, 1.3, [0.1, 0.09], true),
  l5: spot(BOARD.x + 0.4, BOARD.y - 0.3, BOARD.z, 14.4, 8.2, [0.0, 0.05], true),
  l6: spot(ST.l6 + 0.3, TOP + 0.55, BZ, 2.5, 1.3, [-0.08, 0.1], true),
  l6a: spot(ST.l6 - 1.05, TOP + 0.72, BZ, 1.9, 1.5, [-0.1, 0.16], true),
  l6b: spot(ST.l6 + 0.85, TOP + 0.62, BZ, 1.7, 1.15, [0.1, 0.08], true),
  l6p: spot((POND.x0 + POND.x1) / 2 - 4, 1.3, POND.z1 - 1, 12, 4.2, [0.25, 0.09], false, [300, 4200]),
  l7: spot(ST.l7, TOP + 0.78, BZ, 2.9, 1.2, [0.14, 0.07], true),
  x: spot(170, 6, -300, 520, 170, [0.42, 0.3], false, [900, 10000]),
  xw: spot(PUMP.x - 70, 2, LAKE.z - 10, 56, 18, [0.3, 0.2], false, [300, 6000]),
  q: spot(160, 30, -900, 1000, 360, [-0.25, 0.15], false, [1500, 12000]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：工作灯跟到哪、是不是室内；第 6 课那一格结晶池析出了多少盐（0–1）；所有结晶池的盐（0–1）；蒸发池里有没有卤水（0–1）；盐堆多大（0–1）；是不是冬天 */
export interface Want { x: number; indoor: boolean; crust?: number; field?: number; brine?: number; pile?: number; winter?: boolean }

/** 这一课的舞台：选一处机位。室内点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳 */
export function Place({ at, labels, children = null, crust, field, brine, pile, winter }: { at: SpotKey; labels: Label[]; children?: ReactNode; crust?: number; field?: number; brine?: number; pile?: number; winter?: boolean }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, indoor: v.indoor, crust, field, brine, pile, winter }), [v, crust, field, brine, pile, winter])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.indoor ? 1.0 : 1.35} env={v.indoor ? 0.6 : 0.42} studio={v.indoor} fog={v.fog} bloom={0.5} world={want}>{children}</LabStage>
}

/** 一块平板：x、y、z 三个方向的范围；uv 按 s 个单位一格铺，贴图不拉伸 */
export function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, s = 4) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  worldUV(g, s)
  return g
}
/** 按世界坐标重排 uv：朝上的面用 x、z，朝前后的面用 x、y，朝左右的面用 z、y */
function worldUV(g: THREE.BufferGeometry, s: number) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i))
    if (ay > 0.5) uv.setXY(i, p.getX(i) / s, p.getZ(i) / s); else if (ax > 0.5) uv.setXY(i, p.getZ(i) / s, p.getY(i) / s); else uv.setXY(i, p.getX(i) / s, p.getY(i) / s)
  }
  uv.needsUpdate = true
}

// ---------- 化验室 ----------
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH
  // 柱子：白色方柱，柱脚一圈深灰的踢脚
  for (let x = H.x0 + 4; x <= H.x1 - 8; x += 16) { P.push({ p: [x, H.h / 2, H.z0 + 0.7], s: [1.4, H.h, 1.4], c: '#e6e6e1' }, { p: [x, 0.5, H.z0 + 0.7], s: [1.5, 1, 1.5], c: '#5b6063' }) }
  for (const x of [H.x0 + 0.8, H.x1 - 0.8]) P.push({ p: [x, H.h / 2, H.z1 - 0.8], s: [1.6, H.h, 1.6], c: '#e6e6e1' })
  P.push({ p: [(H.x0 + H.x1) / 2, H.h - 1.6, H.z1 - 0.8], s: [H.x1 - H.x0, 3.2, 1.6], c: '#dcdcd6' })
  // 化验台：白色柜体，柜门一扇扇，每扇一只拉手；台面下一道深色踢脚
  for (let x = H.x0 + 2; x < H.x1 - 2; x += 4) {
    P.push({ p: [x + 2, (TOP - 0.4) / 2 + 0.3, B.z1 - 0.12], s: [3.85, TOP - 0.9, 0.2], c: '#eceeec' })
    P.push({ p: [x + 2, TOP - 1.15, B.z1 + 0.03], s: [1.6, 0.14, 0.14], c: '#8b9095' })
  }
  P.push({ p: [(H.x0 + H.x1) / 2, 0.15, (B.z0 + B.z1) / 2], s: [H.x1 - H.x0 - 4, 0.3, B.z1 - B.z0 - 0.4], c: '#3d4146' })
  // 台面后面的试剂架：钢架两层玻璃搁板，设备带上一排插座
  P.push({ p: [(H.x0 + H.x1) / 2, TOP + 0.6, B.z0 + 0.15], s: [H.x1 - H.x0 - 4, 1.2, 0.3], c: '#30353a' })
  for (const x of Object.values(ST)) for (const s of [-1, 1]) P.push({ p: [x + s * 5.6, TOP + 0.75, B.z0 + 0.32], s: [0.8, 0.5, 0.06], c: '#e8e6df' })
  // 墙上的吊柜：几组白色的柜子，柜门上一道细缝
  for (const x of [ST.l1, ST.l3, ST.l6]) { P.push({ p: [x, TOP + 7.4, H.z0 + 1.2], s: [11, 3.4, 2.2], c: '#f0f0ec' }); P.push({ p: [x, TOP + 7.4, H.z0 + 2.32], s: [0.06, 3.3, 0.04], c: '#a9adb0' }) }
  // 每格之间一只水槽和鹅颈龙头
  for (const x of [ST.l2 + 7.2, ST.l4 + 7.2, ST.l7 + 7.2]) { P.push({ p: [x, TOP + 0.01, (B.z0 + B.z1) / 2 - 0.6], s: [2.2, 0.06, 1.6], c: '#9aa0a4' }); P.push({ p: [x, TOP + 1.3, B.z0 + 0.4], s: [0.12, 2.6, 0.12], c: '#c6cbce', cyl: true }) }
  return P
}
/** 墙上试剂架上的瓶子：棕色的、透明的，高矮不一 */
function bottles() {
  const gs: THREE.BufferGeometry[] = [], r = rng(17)
  for (const x0 of [ST.l2, ST.l4, ST.l7]) for (const y of [TOP + 5.4]) for (let i = 0; i < 11; i++) {
    if (r() < 0.16) continue
    const rad = 0.22 + r() * 0.14, h = 0.8 + r() * 0.7, x = x0 - 5 + i * 1.0, z = HALL.z0 + 0.9 + (r() - 0.5) * 0.4
    const body = new THREE.CylinderGeometry(rad, rad, h, 14); body.translate(x, y + h / 2, z)
    const neck = new THREE.CylinderGeometry(rad * 0.45, rad * 0.55, h * 0.22, 12); neck.translate(x, y + h + h * 0.11, z)
    const cap = new THREE.CylinderGeometry(rad * 0.5, rad * 0.5, h * 0.12, 12); cap.translate(x, y + h * 1.28, z)
    const col = new THREE.Color(r() < 0.5 ? '#5a3214' : '#c7d6d8'), capC = new THREE.Color(r() < 0.5 ? '#1f2124' : '#d6d4cc')
    for (const [g, c] of [[body, col], [neck, col], [cap, capC]] as [THREE.BufferGeometry, THREE.Color][]) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) { a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.toNonIndexed()) }
  }
  for (const x0 of [ST.l2, ST.l4, ST.l7]) { const s = new THREE.BoxGeometry(11, 0.18, 1.5); s.translate(x0, TOP + 5.3, HALL.z0 + 0.9); const n = s.attributes.position.count, a = new Float32Array(n * 3).fill(0.55); s.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(s.toNonIndexed()) }
  return mergeGeometries(gs)
}
/** 室内的工作灯：跟着当前这一课从前上方打下来，只在室内的课亮 */
function Key({ x, on }: { x: number; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    const board = Math.abs(x - BOARD.x) < 1.5
    l.position.set(cur.current - 4, HALL.h - 2, board ? BOARD.z + 16 : BZ + 14); aim.position.set(cur.current, board ? BOARD.y : TOP + 1, board ? BOARD.z : BZ); aim.updateMatrixWorld()
    l.intensity += ((on ? 160 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.9} intensity={0} distance={60} decay={1.6} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}
/** 带轮子的坐标白板：铝合金边框、两条腿、四只脚轮。板面空白，第 5 课在上面画曲线 */
function Whiteboard() {
  const { x, y, z, w, h } = BOARD
  return <group position={[x, 0, z]}>
    <mesh position={[0, y, -0.05]} receiveShadow><boxGeometry args={[w, h, 0.1]} /><meshPhysicalMaterial color="#f7f7f4" roughness={0.35} clearcoat={0.5} /></mesh>
    {([[0, h / 2, w + 0.5, 0.35], [0, -h / 2, w + 0.5, 0.35]] as [number, number, number, number][]).map(([dx, dy, L, t], i) => <mesh key={i} position={[dx, y + dy, 0]} castShadow><boxGeometry args={[L, t, 0.3]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * (w / 2 + 0.12), y, 0]} castShadow><boxGeometry args={[0.35, h + 0.3, 0.3]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    {/* 笔槽 */}
    <mesh position={[0, y - h / 2 - 0.3, 0.3]}><boxGeometry args={[w * 0.5, 0.12, 0.5]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * (w / 2 + 0.12), 0, 0]}>
      <mesh position={[0, (y - h / 2) / 2, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, y - h / 2, 14]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[0, 0.7, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.18, 0.18, 4.2, 14]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      {[-1, 1].map(t => <mesh key={t} position={[0, 0.3, t * 1.9]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.3, 0.3, 0.22, 18]} /><meshStandardMaterial color="#25282b" roughness={0.6} /></mesh>)}
    </group>)}
  </group>
}

// ---------- 盐田 ----------
/** 盐田的土埂：每一格四周一圈；第 6 课那一格南边的埂剖开不画（剖面另画） */
function dikeGeo() {
  const gs: THREE.BufferGeometry[] = [], D = POND.dike, W = 7
  ROWS.forEach((row, ri) => COLS.forEach(([x0, x1]) => {
    const [z0, z1] = row.z, cut = ri === 0 && x0 === POND.x0
    gs.push(slab(x0 - W / 2, x1 + W / 2, 0, D, z0 - W / 2, z0 + W / 2, 8))
    if (!cut) gs.push(slab(x0 - W / 2, x1 + W / 2, 0, D, z1 - W / 2, z1 + W / 2, 8))
    else gs.push(slab(x0 - W / 2, x0 + W / 2, 0, D, z1 - W / 2, z1 + W / 2, 8), slab(x1 - W / 2, x1 + W / 2, 0, D, z1 - W / 2, z1 + W / 2, 8))
    gs.push(slab(x0 - W / 2, x0 + W / 2, 0, D, z0, z1, 8), slab(x1 - W / 2, x1 + W / 2, 0, D, z0, z1, 8))
  }))
  return mergeGeometries(gs.map(g => g.toNonIndexed()))
}
/** 一块盐田：池底、卤水面。crystal 为真的是结晶池，池底一层白盐，crust 0–1 盐层多厚 */
function Pond({ x0, x1, z0, z1, color, crystal, level, crust = 0 }: { x0: number; x1: number; z0: number; z1: number; color: string; crystal?: boolean; level: number; crust?: number }) {
  const ripple = useRipple([6, 6], 0.02)
  const floor = useMemo(() => { const t = (crystal ? crustTex() : dikeTex()).clone(); t.repeat.set((x1 - x0) / 24, (z1 - z0) / 24); t.needsUpdate = true; return t }, [crystal, x0, x1, z0, z1])
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0
  const saltTop = POND.floor + (crystal ? 0.05 + crust * 0.5 : 0)
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[cx, crystal ? saltTop : POND.floor, cz]} receiveShadow><planeGeometry args={[w, d]} /><meshStandardMaterial map={floor} color={crystal ? '#ece9e4' : '#a8987c'} roughness={0.9} /></mesh>
    {level > 0.02 && <mesh rotation-x={-Math.PI / 2} position={[cx, POND.floor + (POND.brine - POND.floor) * level, cz]} renderOrder={3}><planeGeometry args={[w, d]} />
      <meshPhysicalMaterial color={color} transparent opacity={crystal ? 0.6 : 0.88} roughness={0.08} normalMap={ripple} normalScale={new THREE.Vector2(0.15, 0.15)} clearcoat={0.8} clearcoatRoughness={0.1} envMapIntensity={0.7} depthWrite={false} /></mesh>}
  </group>
}
/** 第 6 课那一格结晶池的剖面：朝南切开，看得见卤水层、析出的盐层和下面的泥底 */
function PondCut({ crust }: { crust: number }) {
  const strata = useMemo(() => { const t = strataTex().clone(); t.repeat.set((POND.x1 - POND.x0) / 30, 1); t.needsUpdate = true; return t }, [])
  const crustSide = useMemo(() => { const t = crustTex().clone(); t.repeat.set((POND.x1 - POND.x0) / 6, 0.2); t.needsUpdate = true; return t }, [])
  const x0 = POND.x0 + 3.5, x1 = POND.x1 - 3.5, z = POND.z1, w = x1 - x0, cx = (x0 + x1) / 2
  const salt = 0.05 + crust * 0.5, brineTop = POND.brine - crust * 0.55
  return <group>
    {/* 池底：夯实的泥，剖开看得见一层层的土 */}
    <mesh position={[cx, POND.floor / 2, z + 0.01]}><planeGeometry args={[w, POND.floor]} /><meshStandardMaterial map={strata} roughness={1} /></mesh>
    <mesh position={[cx, POND.floor + 0.005, z + 0.035]}><planeGeometry args={[w, 0.03]} /><meshBasicMaterial color="#5a4c3c" /></mesh>
    {/* 盐层的剖面 */}
    <mesh position={[cx, POND.floor + salt / 2, z + 0.02]}><planeGeometry args={[w, salt]} /><meshStandardMaterial map={crustSide} color="#fbfaf7" roughness={0.6} /></mesh>
    <mesh position={[cx, POND.floor + salt + 0.01, z + 0.035]}><planeGeometry args={[w, 0.025]} /><meshBasicMaterial color="#8d7f72" /></mesh>
    {/* 卤水的剖面：半透明的一层，上沿一道亮线 */}
    <mesh position={[cx, (POND.floor + salt + brineTop) / 2, z + 0.03]} renderOrder={4}><planeGeometry args={[w, Math.max(0.01, brineTop - POND.floor - salt)]} /><meshPhysicalMaterial color="#c9837f" transparent opacity={0.72} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    <mesh position={[cx, brineTop, z + 0.04]}><planeGeometry args={[w, 0.05]} /><meshBasicMaterial color="#fff6f2" transparent opacity={0.8} /></mesh>
    {/* 剖开的两头土埂 */}
    {[POND.x0, POND.x1].map(x => <mesh key={x} position={[x, POND.dike / 2, z + 0.03]}><planeGeometry args={[7, POND.dike]} /><meshStandardMaterial map={strata} roughness={1} /></mesh>)}
  </group>
}
/** 盐堆：白色的锥形盐山，表面起伏；s 0–1 堆得多大 */
function SaltPile({ at, r, h, seed, s = 1 }: { at: [number, number]; r: number; h: number; seed: number; s?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(r, h, 72, 18, true), p = g.attributes.position, rr = rng(seed)
    const ph = [rr() * 6, rr() * 6, rr() * 6]
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - (y + h / 2) / h
      const n = 1 + 0.06 * Math.sin(a * 3 + ph[0]) + 0.04 * Math.sin(a * 7 + ph[1]) + 0.02 * Math.sin(a * 13 + y * 0.6 + ph[2])
      p.setX(i, x * n); p.setZ(i, z * n); p.setY(i, y + h / 2 - (k > 0.85 ? (k - 0.85) * h * 0.3 : 0))
    }
    g.computeVertexNormals()
    return g
  }, [r, h, seed])
  return <mesh geometry={geo} position={[at[0], 0, at[1]]} scale={[s, s, s]} castShadow receiveShadow><meshStandardMaterial color="#e4e1da" roughness={0.8} /></mesh>
}
/** 远山：一大片起伏的地形，山顶发白；在湖的北面 */
function mountains() {
  const g = new THREE.PlaneGeometry(9000, 1600, 180, 40); g.rotateX(-Math.PI / 2)
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), rock = new THREE.Color('#7d6a58'), dark = new THREE.Color('#5e5248'), snow = new THREE.Color('#e9e6e0')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), back = (z + 800) / 1600          // 0 近、1 远
    const ridge = Math.sin(x * 0.0021 + 1.3) * 0.5 + Math.sin(x * 0.0057 + 0.4) * 0.3 + Math.sin(x * 0.013) * 0.15 + Math.sin(x * 0.031 + z * 0.01) * 0.06
    const hgt = Math.max(0, (0.35 + ridge * 0.5) * 520 * Math.min(1, (1 - back) * 2.4) * (0.6 + 0.4 * Math.sin(back * 3)))
    p.setY(i, hgt)
    const k = hgt / 520
    c.copy(dark).lerp(rock, Math.min(1, k * 1.6)); if (k > 0.62) c.lerp(snow, Math.min(1, (k - 0.62) * 4))
    col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); g.translate(400, -2, -2700)
  return g
}
/** 场院里的东西：泵房、堆料机、几根电线杆、厂门 */
function yardParts() {
  const P: Part[] = [], r = rng(61)
  // 引卤泵房：湖边一间小平房，一根管子伸进湖里，另一根沿池埂送到最北一排蒸发池
  P.push({ p: [PUMP.x, 6, PUMP.z], s: [24, 12, 16], c: '#e3ded2' }, { p: [PUMP.x, 12.4, PUMP.z], s: [26, 0.8, 18], c: '#46606f' })
  P.push({ p: [PUMP.x - 3, 4, PUMP.z + 8.1], s: [5, 8, 0.2], c: '#5d6a72' })
  P.push({ p: [PUMP.x + 6, 1.4, PUMP.z - 30], s: [1.4, 1.4, 44], c: '#4a5c66', cyl: false })
  P.push({ p: [PUMP.x + 6, 1.4, PUMP.z + 24], s: [1.4, 1.4, 34], c: '#4a5c66' })
  // 堆料机：一条斜着的皮带机架，从地面伸到盐堆顶上
  const L = 70, a = 0.38
  for (let i = 0; i < 12; i++) { const t = (i + 0.5) / 12, x = PILE.x - 60 + Math.cos(a) * L * t, y = 3 + Math.sin(a) * L * t; P.push({ p: [x, y, PILE.z], s: [L / 12 + 0.2, 0.5, 3.4], c: '#d39b2a', r: [0, 0, a] }) }
  P.push({ p: [PILE.x - 60 + Math.cos(a) * L / 2, 3 + Math.sin(a) * L / 2 + 0.5, PILE.z], s: [L, 0.25, 2.4], c: '#2b2d2f', r: [0, 0, a] })
  for (const t of [0.35, 0.7]) { const x = PILE.x - 60 + Math.cos(a) * L * t, y = 3 + Math.sin(a) * L * t; P.push({ p: [x, y / 2, PILE.z - 1.4], s: [0.6, y, 0.6], c: '#c78f22' }, { p: [x, y / 2, PILE.z + 1.4], s: [0.6, y, 0.6], c: '#c78f22' }) }
  // 电线杆：沿场院北沿一排
  for (let x = -140; x <= 560; x += 60) { P.push({ p: [x, 10, -24], s: [0.5, 20, 0.5], c: '#8a8278', cyl: true }, { p: [x, 19, -24], s: [5, 0.35, 0.35], c: '#6d665e' }) }
  // 厂门：两根门柱
  for (const s of [-1, 1]) P.push({ p: [60 + s * 13, 6, 135], s: [1.6, 12, 1.6], c: '#d9d5cb' })
  P.push({ p: [60, 9, 134.6], s: [26, 3.6, 0.6], c: '#2a6f9e' })
  // 场院里停着的几辆收盐的翻斗车
  for (let i = 0; i < 3; i++) { const x = 250 + i * 18, z = 40 + r() * 10; P.push({ p: [x, 2.4, z], s: [7, 3, 14], c: '#c9b13a' }, { p: [x, 3.6, z - 8.5], s: [6.6, 4.6, 4], c: '#e1e0da' }, { p: [x, 1.2, z - 7], s: [7.4, 2.4, 2.4], c: '#1f2124' }, { p: [x, 1.2, z + 4], s: [7.4, 2.4, 2.4], c: '#1f2124' }) }
  return P
}

export function World({ x = ST.l1, indoor = true, crust, field = 0.7, brine = 1, pile = 1, winter = false }: Partial<Want>) {
  const lessonCrust = crust ?? field
  const [cd, cn, cr] = useConcrete(30, 16)
  const ripple = useRipple([30, 30], 0.02)
  const tex = useMemo(() => {
    const flat = saltFlatTex().clone(); flat.repeat.set(140, 140); flat.needsUpdate = true
    const dike = dikeTex().clone(); dike.needsUpdate = true
    const tile = tileTex().clone(); tile.repeat.set(1, 1); tile.needsUpdate = true
    return { flat, dike, tile, bench: benchTex(), wallTile: (() => { const t = wallTileTex().clone(); t.repeat.set((HALL.x1 - HALL.x0) / 1.2, 4.6 / 1.2); t.needsUpdate = true; return t })(), wall: wallTex(), roof: roofTex(),
      name: makeSign(['盐场化验室'], '#2a6f9e', '#ffffff', 768, 128), gate: makeSign(['盐湖盐场'], '#2a6f9e', '#ffffff', 768, 128),
      rules: makeBoard('化验室规则', ['进入化验室穿好实验服', '取用药品不直接用手', '试剂瓶用后盖好放回', '酒精灯用灯帽盖灭', '实验后关好水电']) }
  }, [])
  const geo = useMemo(() => {
    const H = HALL
    return {
      hall: mergeParts(hallParts()), yard: mergeParts(yardParts()), dikes: dikeGeo(), mountains: mountains(), bottles: bottles(),
      floor: slab(H.x0, H.x1, 0, 0.12, H.z0, H.z1, 3.6), back: slab(H.x0, H.x1, 0, H.h, H.z0 - 0.6, H.z0, 12),
      ends: mergeGeometries([slab(H.x0 - 0.6, H.x0, 0, H.h, H.z0, H.z1, 12), slab(H.x1, H.x1 + 0.6, 0, H.h, H.z0, H.z1, 12)]), ceil: slab(H.x0 - 1, H.x1 + 1, H.h, H.h + 0.8, H.z0 - 1, H.z1 + 1, 12),
      top: slab(H.x0 + 2, H.x1 - 2, TOP - 0.3, TOP, BENCH.z0, BENCH.z1, 3),
    }
  }, [])
  const lakeTint = winter ? '#4f8590' : '#2f8a92'
  return (
    <group>
      <hemisphereLight args={['#cfdbe8', '#6e6456', indoor ? 0.5 : 0.18]} />
      <Key x={x} on={indoor} />
      {/* 地面：灰白的盐碱地，化验室和盐堆一带铺一片水泥场院 */}
      <mesh rotation-x={-Math.PI / 2} position={[200, -0.05, -600]} receiveShadow><planeGeometry args={[4000, 3000]} /><meshStandardMaterial map={tex.flat} color={winter ? '#b9b6ae' : '#a9a094'} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[100, 0.02, 60]} receiveShadow><planeGeometry args={[520, 150]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#8c877d" /></mesh>
      {/* 盐田 */}
      <mesh geometry={geo.dikes} castShadow receiveShadow><meshStandardMaterial map={tex.dike} color="#b8a88c" roughness={1} /></mesh>
      {ROWS.map((row, ri) => COLS.map(([x0, x1]) => {
        const lesson = ri === 0 && x0 === POND.x0
        return <Pond key={`${ri}${x0}`} x0={x0 + 3.5} x1={x1 - 3.5} z0={row.z[0] + 3.5} z1={row.z[1] - (lesson ? 0 : 3.5)} color={row.color} crystal={row.crystal}
          level={row.crystal ? 1 - (lesson ? lessonCrust : field) * 0.37 : Math.min(1, brine * (1 + ri * 0.1))} crust={row.crystal ? (lesson ? lessonCrust : field) : 0} />
      }))}
      <PondCut crust={lessonCrust} />
      {/* 盐湖：湖岸一圈白色盐壳，湖面带波纹；远处的山 */}
      <mesh rotation-x={-Math.PI / 2} position={[200, 0.25, LAKE.z - 10]} receiveShadow><planeGeometry args={[4000, 60]} /><meshStandardMaterial map={crustTex()} color={winter ? '#d8d6d0' : '#c9c3b8'} roughness={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[200, LAKE.y, LAKE.z - 40 - 1400]} renderOrder={3}><planeGeometry args={[4000, 2800]} />
        <meshPhysicalMaterial color={lakeTint} roughness={0.03} normalMap={ripple} normalScale={new THREE.Vector2(0.25, 0.25)} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={0.9} /></mesh>
      <mesh geometry={geo.mountains}><meshStandardMaterial vertexColors roughness={1} /></mesh>
      {/* 盐堆、堆料机、泵房 */}
      <SaltPile at={[PILE.x, PILE.z]} r={44} h={26} seed={3} s={0.7 + 0.3 * pile} />
      <SaltPile at={[PILE.x + 70, PILE.z + 20]} r={36} h={21} seed={7} />
      <SaltPile at={[PILE.x + 20, PILE.z - 40]} r={26} h={15} seed={11} s={0.6 + 0.4 * pile} />
      <mesh geometry={geo.yard} castShadow receiveShadow><Painted rough={0.75} metal={0.1} /></mesh>
      {/* 化验室：地砖、后墙下半截瓷砖墙裙、黑色台面 */}
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, TOP + 2.3, HALL.z0 + 0.02]}><planeGeometry args={[HALL.x1 - HALL.x0, 4.6]} /><meshStandardMaterial map={tex.wallTile} roughness={0.3} /></mesh>
      <mesh geometry={geo.ends} receiveShadow castShadow><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>
      <mesh geometry={geo.ceil} castShadow><meshStandardMaterial map={tex.roof} color="#c9ced2" roughness={0.7} /></mesh>
      {[-100, -84, -68, -52, -36, -20].flatMap(cx => [-12, -3].map(cz => <mesh key={`${cx}${cz}`} position={[cx, HALL.h - 0.05, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[7, 3.4]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.55} metal={0.08} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.35} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
      <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.9} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.h - 1.6, HALL.z1 + 0.02]}><planeGeometry args={[22, 2.4]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <mesh position={[ST.l4, TOP + 7.4, HALL.z0 + 0.05]}><planeGeometry args={[4.2, 5.6]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
      <Whiteboard />
      <mesh position={[60, 9, 135]}><planeGeometry args={[24, 3.2]} /><meshStandardMaterial map={tex.gate} roughness={0.6} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}
