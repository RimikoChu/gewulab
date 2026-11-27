// 酸、碱和中和实验室的大场景：一座化工园区的污水处理厂。
// 最西边是化验楼一层的化验室（敞着门脸的一间厅）：靠后墙一条长化验台，台子最西头是一台通风橱，各课占一格；
// 往东隔一条厂内道路是污水处理区：调节池、中和池（朝镜头剖开）、加药间、沉淀池、排放口和在线监测房；围墙外是化工园区。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 m 画成 M 个单位。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBox } from '@react-three/drei'
import { LabStage, Metal, Painted, mergeParts, useConcrete, type Label, type Part } from '@/lab-kit'
import { Plant, SAMPLE_T, type PondWant } from './plant'
import { benchTex, buildingTex, flowBoard, grassTex, makeBoard, makeSign, rng, tileTex, wallTileTex } from './mats'

export const M = 6, TOP = 0.85 * M      // 1 m 在画面里多长；化验台台面的高度
export type V3 = [number, number, number]

/** 一块板，贴图按它在世界里的位置铺，k 是贴图一格多大 */
export function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 6) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}

/** 化验室：x 的范围、后墙和门脸的 z、层高；化验台的前后沿；器材摆在 z = BZ 这条线上 */
export const HALL = { x0: -178, x1: -52, z0: -18, z1: 4, h: 22 }
export const BENCH = { x0: -158, z0: -17.4, z1: -12.9 }
export const BZ = -15
/** 通风橱：x 范围、进深、台面高（= 化验台）、柜高、拉门底沿离台面多高 */
export const HOOD = { x0: -168.5, x1: -160, z0: -18, z1: -11.8, h: 15, sash: 3.0 }
/** 各格的中心（x）：通风橱里是第 2 课，化验台上依次是第 1、3、4 课，第 5 课的滴定台，拓展课 */
export const ST = { l2: (HOOD.x0 + HOOD.x1) / 2, l1: -148, l3: -130, l4: -112, l5: -94, x: -76 }
const PILLARS = [-157, -139, -121, -103, -85, -67]

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], kind: 'lab' | 'out', fog: [number, number] = [160, 1200]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, kind, fog })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(ST.l1 + 0.05, TOP + 0.3, BZ + 0.45, 1.95, 1.0, [-0.12, 0.56], 'lab'),
  l2: spot(ST.l2 + 0.05, TOP + 0.72, BZ + 2.1, 2.7, 1.6, [0.12, 0.13], 'lab'),
  l3: spot(ST.l3 + 0.02, TOP + 0.78, BZ + 0.45, 1.4, 1.6, [-0.18, 0.15], 'lab'),
  l4: spot(ST.l4 + 0.05, TOP + 0.36, BZ + 1.3, 2.0, 0.95, [0.14, 0.2], 'lab'),
  l5: spot(ST.l5 + 0.5, TOP + 1.0, BZ + 0.45, 2.9, 1.8, [-0.12, 0.12], 'lab'),
  l6: spot(SAMPLE_T.x + 0.1, TOP + 0.5, SAMPLE_T.z + 0.3, 2.6, 1.3, [0.08, 0.36], 'out'),
  l7: spot(78, 14, -28, 68, 34, [-0.24, 0.2], 'out'),
  x: spot(ST.x - 0.2, TOP + 0.36, BZ + 1.3, 2.4, 1.0, [0.12, 0.2], 'lab'),
  q: spot(-10, 14, -50, 210, 74, [0.42, 0.17], 'out', [700, 2600]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：室内工作灯跟到哪；中和池的状态（第 7 课） */
export interface Want { x: number; kind: 'lab' | 'out'; pond?: PondWant }

/** 这一课的舞台：选一处机位。化验室里点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳 */
export function Place({ at, labels, children = null, pond }: { at: SpotKey; labels: Label[]; children?: ReactNode; pond?: PondWant }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, kind: v.kind, pond }), [v, pond])
  const indoor = v.kind === 'lab'
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={indoor ? 1.0 : 2.3} env={indoor ? 0.6 : 0.85} studio={indoor} fog={v.fog} bloom={0.5} world={want}>{children}</LabStage>
}

// ---------- 化验室 ----------
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH
  // 柱子：白色方柱，柱脚一圈深灰的踢脚
  for (const x of PILLARS) { P.push({ p: [x, H.h / 2, H.z0 + 0.7], s: [1.4, H.h, 1.4], c: '#e4e4df' }, { p: [x, 0.5, H.z0 + 0.7], s: [1.5, 1, 1.5], c: '#5b6063' }) }
  for (const x of [-175, -121, -67]) P.push({ p: [x, H.h / 2, H.z1 - 0.8], s: [1.6, H.h, 1.6], c: '#e4e4df' })
  P.push({ p: [(H.x0 + H.x1) / 2, H.h - 1.6, H.z1 - 0.8], s: [H.x1 - H.x0, 3.2, 1.6], c: '#d9d8d1' })
  // 化验台：一条长的柜体，柜门一扇扇，每扇一只拉手；台面下一道深色的踢脚
  for (let x = B.x0; x < H.x1 - 2; x += 4.5) {
    P.push({ p: [x + 2.25, (TOP - 0.4) / 2 + 0.3, B.z1 - 0.12], s: [4.3, TOP - 0.9, 0.2], c: '#d7dad8' })
    P.push({ p: [x + 2.25, TOP - 1.2, B.z1 + 0.04], s: [1.3, 0.16, 0.16], c: '#7b8085' })
  }
  P.push({ p: [(B.x0 + H.x1 - 2) / 2, 0.15, (B.z0 + B.z1) / 2], s: [H.x1 - 2 - B.x0, 0.3, B.z1 - B.z0 - 0.4], c: '#3d4146' })
  // 台面后面的挡板和设备带（插座）
  P.push({ p: [(B.x0 + H.x1 - 2) / 2, TOP + 0.12, B.z0 + 0.12], s: [H.x1 - 2 - B.x0, 0.24, 0.24], c: '#c9ccca' })
  for (const x of [ST.l1, ST.l3, ST.l4, ST.l5, ST.x]) for (const s of [-1, 1]) P.push({ p: [x + s * 6.6, TOP + 1.1, B.z0 + 0.3], s: [0.9, 0.6, 0.12], c: '#e8e6df' })
  // 墙上的试剂架：两层搁板
  for (const x of [ST.l1, ST.l4, ST.x]) for (const y of [TOP + 5.4, TOP + 8.2]) P.push({ p: [x, y, H.z0 + 0.9], s: [11, 0.25, 1.6], c: '#b48a5a' })
  // 滴定台后墙上低一点的两层试剂架（标准溶液、指示剂）
  for (const y of [TOP + 4.5, TOP + 6.6]) P.push({ p: [ST.l5 + 0.6, y, H.z0 + 0.9], s: [6, 0.2, 1.4], c: '#b48a5a' })
  for (const s of [-1, 1]) P.push({ p: [ST.l5 + 0.6 + s * 2.8, TOP + 5.5, H.z0 + 0.5], s: [0.12, 2.6, 0.5], c: '#8a8f92' })
  // 两格之间的水槽和鹅颈龙头
  for (const x of [ST.l3 + 8.4, ST.l5 + 8.4]) { P.push({ p: [x, TOP + 0.01, (B.z0 + B.z1) / 2 - 0.8], s: [2.2, 0.06, 1.6], c: '#9aa0a4' }); P.push({ p: [x, TOP + 1.3, B.z0 + 0.4], s: [0.12, 2.6, 0.12], c: '#c6cbce', cyl: true }) }
  return P
}
/** 墙上试剂架上的瓶子：棕色的、透明的 */
function bottles() {
  const gs: THREE.BufferGeometry[] = [], r = rng(17)
  for (const [x0, y, n] of [ST.l1, ST.l4, ST.x].flatMap(x => [[x, TOP + 5.53, 10], [x, TOP + 8.33, 10]]).concat([[ST.l5 + 2.8, TOP + 4.6, 5], [ST.l5 + 2.8, TOP + 6.7, 5]])) for (let i = 0; i < n; i++) {
    if (r() < 0.16) continue
    const rad = 0.24 + r() * 0.14, h = 0.9 + r() * 0.7, x = x0 - 4.8 + i * 1.05, z = HALL.z0 + 0.9 + (r() - 0.5) * 0.5
    const body = new THREE.CylinderGeometry(rad, rad, h, 14); body.translate(x, y + h / 2, z)
    const neck = new THREE.CylinderGeometry(rad * 0.45, rad * 0.55, h * 0.22, 12); neck.translate(x, y + h + h * 0.11, z)
    const cap = new THREE.CylinderGeometry(rad * 0.5, rad * 0.5, h * 0.12, 12); cap.translate(x, y + h * 1.28, z)
    const col = new THREE.Color(r() < 0.55 ? '#5a3214' : '#c7d6d8'), capC = new THREE.Color(r() < 0.5 ? '#1f2124' : '#d6d4cc')
    for (const [g, c] of [[body, col], [neck, col], [cap, capC]] as [THREE.BufferGeometry, THREE.Color][]) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) { a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.toNonIndexed()) }
  }
  return mergeGeometries(gs)
}

/**
 * 通风橱：白色钢制柜体，下面是两扇门的柜子；台面是黑色耐酸理化板，前沿一道挡液翻边，右后角一只小水槽和鹅颈龙头。
 * 两侧是有厚度的侧板，内衬浅灰的耐腐蚀板，右侧板内面一排水、气阀门；后面是导流挡板，上下两道排风缝；
 * 顶上一块前面板（写着“通风橱”、一块风速屏），里面一盏照明灯，再上面一截排风管通到吊顶。
 * 前面一扇铝合金框的钢化玻璃视窗，沿两侧滑槽上下拉，现在拉到台面上方 sash 处。
 */
function FumeHood() {
  const H = HOOD, W = H.x1 - H.x0, D = H.z1 - H.z0, cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2
  const T = 0.6, IN = W - 2 * T, FASCIA = 2.8, OPEN = H.h - FASCIA      // 侧板厚、内宽、前面板高、开口上沿
  const white = <meshPhysicalMaterial color="#eef0ee" roughness={0.36} clearcoat={0.4} />
  const liner = <meshStandardMaterial color="#dfe3e2" roughness={0.55} />
  const epoxy = <meshPhysicalMaterial color="#202326" roughness={0.38} clearcoat={0.5} clearcoatRoughness={0.3} />
  const sign = useMemo(() => makeSign(['通风橱', '视窗拉到安全高度以下操作'], '#f2f3f1', '#2a6f9e', 768, 160), [])
  const shell = useMemo(() => {
    const P: Part[] = []
    // 下柜：两扇柜门，中间一道缝，每扇一只拉手；踢脚
    P.push({ p: [cx, (TOP - 0.3) / 2 + 0.3, H.z1 - 0.15], s: [W - 0.2, TOP - 0.9, 0.24], c: '#e6e8e6' })
    P.push({ p: [cx, (TOP - 0.3) / 2 + 0.3, H.z1 - 0.02], s: [0.06, TOP - 1.1, 0.04], c: '#9aa0a3' })
    for (const s of [-1, 1]) P.push({ p: [cx + s * 0.9, TOP - 1.3, H.z1 + 0.02], s: [1.0, 0.14, 0.14], c: '#7b8085' })
    P.push({ p: [cx, 0.15, cz], s: [W - 0.4, 0.3, D - 0.6], c: '#3d4146' })
    // 视窗两侧的铝合金滑槽
    for (const s of [-1, 1]) P.push({ p: [cx + s * (IN / 2 - 0.08), (TOP + OPEN) / 2 + 0.3, H.z1 - 0.12], s: [0.16, OPEN - TOP + 0.6, 0.36], c: '#b9bec2' })
    // 右侧板内面的阀门：水（绿）、气（黄）、氮气（黑）
    for (const [i, c] of [['0', '#2f8f6b'], ['1', '#d9a520'], ['2', '#1f2326']] as [string, string][]) P.push({ p: [H.x1 - T - 0.12, TOP + 1.2, cz + 1.4 - +i * 0.8], s: [0.24, 0.24, 0.24], c: '#c6cbce' }, { p: [H.x1 - T - 0.32, TOP + 1.2, cz + 1.4 - +i * 0.8], s: [0.2, 0.4, 0.12], c })
    // 两根前立柱上的插座
    for (const s of [-1, 1]) P.push({ p: [cx + s * (W / 2 - T / 2), TOP + 1.4, H.z1 + 0.01], s: [0.4, 0.6, 0.04], c: '#f6f6f2' }, { p: [cx + s * (W / 2 - T / 2), TOP + 1.4, H.z1 + 0.035], s: [0.22, 0.08, 0.02], c: '#3a3e42' })
    return mergeParts(P)
  }, [cx, cz, W, D, H.z1, H.x1, IN, OPEN])
  return <group>
    <mesh geometry={shell} castShadow receiveShadow><Painted rough={0.5} metal={0.1} /></mesh>
    {/* 台面、前沿翻边、右后角的小水槽和龙头 */}
    <RoundedBox args={[W - 0.1, 0.3, D - 0.1]} radius={0.08} position={[cx, TOP - 0.15, cz]} receiveShadow castShadow>{epoxy}</RoundedBox>
    <RoundedBox args={[IN, 0.16, 0.24]} radius={0.06} position={[cx, TOP + 0.06, H.z1 - 0.28]} castShadow>{epoxy}</RoundedBox>
    <mesh position={[H.x1 - T - 0.8, TOP + 0.003, H.z0 + 1.4]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.9, 0.6]} /><meshStandardMaterial color="#0c0d0e" roughness={0.6} /></mesh>
    <mesh position={[H.x1 - T - 0.8, TOP + 0.75, H.z0 + 0.8]}><cylinderGeometry args={[0.05, 0.05, 1.5, 10]} /><Metal kind="chrome" rough={0.15} /></mesh>
    <mesh position={[H.x1 - T - 0.8, TOP + 1.5, H.z0 + 1.05]} rotation-x={Math.PI / 2}><torusGeometry args={[0.25, 0.05, 8, 16, Math.PI]} /><Metal kind="chrome" rough={0.15} /></mesh>
    {/* 两侧板：外面白，里面一层浅灰内衬 */}
    {[-1, 1].map(s => <group key={s}>
      <RoundedBox args={[T, H.h - TOP, D]} radius={0.1} position={[cx + s * (W / 2 - T / 2), TOP + (H.h - TOP) / 2, cz]} castShadow receiveShadow>{white}</RoundedBox>
      <mesh position={[cx + s * (IN / 2 + 0.005), TOP + (OPEN - TOP) / 2, cz - 0.1]} rotation-y={-s * Math.PI / 2} receiveShadow><planeGeometry args={[D - 0.6, OPEN - TOP]} />{liner}</mesh>
    </group>)}
    {/* 导流挡板：浅灰，下沿一道、上沿一道排风缝；挡板后面是排风腔 */}
    <mesh position={[cx, TOP + (OPEN - TOP) / 2, H.z0 + 0.5]} receiveShadow><boxGeometry args={[IN, OPEN - TOP - 1.2, 0.2]} />{liner}</mesh>
    <mesh position={[cx, TOP + 0.3, H.z0 + 0.3]}><boxGeometry args={[IN, 0.6, 0.1]} /><meshStandardMaterial color="#3c4145" roughness={0.9} /></mesh>
    <mesh position={[cx, OPEN - 0.3, H.z0 + 0.3]}><boxGeometry args={[IN, 0.6, 0.1]} /><meshStandardMaterial color="#121416" roughness={0.9} /></mesh>
    {[2.2, 4.2].map(y => <mesh key={y} position={[cx, TOP + y, H.z0 + 0.61]}><planeGeometry args={[IN - 0.8, 0.1]} /><meshStandardMaterial color="#9ea4a8" roughness={0.8} /></mesh>)}
    {/* 顶部：内顶板上一盏灯，前面板写着名字 */}
    <mesh position={[cx, OPEN + 0.15, cz]}><boxGeometry args={[IN, 0.3, D - 0.2]} />{liner}</mesh>
    <mesh position={[cx, OPEN - 0.01, cz - 0.6]} rotation-x={Math.PI / 2}><planeGeometry args={[IN - 1.2, 1.2]} /><meshBasicMaterial color="#fffaf0" toneMapped={false} /></mesh>
    <pointLight position={[cx, OPEN - 0.6, cz - 0.4]} intensity={18} distance={10} decay={1.6} color="#fff6e8" />
    <RoundedBox args={[W, FASCIA, D * 0.55]} radius={0.12} position={[cx, OPEN + FASCIA / 2, H.z1 - D * 0.275]} castShadow>{white}</RoundedBox>
    <mesh position={[cx - 0.6, OPEN + FASCIA * 0.55, H.z1 + 0.01]}><planeGeometry args={[4.8, 1.0]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
    <group position={[cx + W / 2 - 1.2, OPEN + FASCIA * 0.55, H.z1 + 0.01]}>
      <mesh><planeGeometry args={[1.4, 1.1]} /><meshStandardMaterial color="#2b3035" roughness={0.5} /></mesh>
      <mesh position={[0, 0.18, 0.01]}><planeGeometry args={[1.0, 0.4]} /><meshBasicMaterial color="#7dffb0" toneMapped={false} /></mesh>
      {[-0.35, 0, 0.35].map(x => <mesh key={x} position={[x, -0.3, 0.01]}><circleGeometry args={[0.1, 16]} /><meshStandardMaterial color={x === 0.35 ? '#2f8f6b' : '#9aa0a3'} roughness={0.4} /></mesh>)}
    </group>
    <RoundedBox args={[W, 0.6, D]} radius={0.1} position={[cx, H.h - 0.3 + 0.01, cz]}>{white}</RoundedBox>
    {/* 排风管：一截 PVC 圆管通到吊顶，一只风阀 */}
    <mesh position={[cx, (H.h + HALL.h) / 2, cz - 0.5]} castShadow><cylinderGeometry args={[1.0, 1.0, HALL.h - H.h, 28]} /><meshStandardMaterial color="#c9cdc9" roughness={0.55} /></mesh>
    <mesh position={[cx, H.h + 1.4, cz - 0.5]}><cylinderGeometry args={[1.15, 1.15, 0.5, 28]} /><meshStandardMaterial color="#b9bdb9" roughness={0.55} /></mesh>
    {/* 视窗：铝合金框里一块钢化玻璃，底框上一根拉手；上半截藏在前面板后面 */}
    <group position={[cx, TOP + H.sash, H.z1 - 0.12]}>
      <mesh position-y={3.2} renderOrder={8}><planeGeometry args={[IN - 0.3, 6.2]} /><meshPhysicalMaterial color="#d6e6e8" transparent opacity={0.16} roughness={0.02} clearcoat={1} envMapIntensity={2.6} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <RoundedBox args={[IN - 0.2, 0.34, 0.3]} radius={0.06} position-y={0.04}><meshPhysicalMaterial color="#dfe3e6" metalness={0.25} roughness={0.35} clearcoat={0.5} emissive="#5a6066" emissiveIntensity={0.25} /></RoundedBox>
      {[-1, 1].map(s => <mesh key={s} position={[s * (IN - 0.3) / 2, 3.2, 0]}><boxGeometry args={[0.14, 6.4, 0.26]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      <mesh position={[0, -0.02, 0.26]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, IN - 1.6, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * (IN - 1.6) / 2, -0.02, 0.16]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 0.2, 10]} /><Metal kind="stainless" /></mesh>)}
    </group>
  </group>
}

/**
 * 化验楼的外观：一层是敞着门脸的化验室，上面再盖两层（外墙一排排窗），楼顶一圈女儿墙，屋面上几台空调外机、一只水箱和排风机；
 * 东头山墙上一扇玻璃门，门上一块雨棚。这些只在室外的机位（随堂检测的全景、走过厂区时）看得见。
 */
function LabBuilding() {
  const H = HALL, Y1 = H.h + 0.6, Y2 = Y1 + 30, x0 = H.x0 - 0.6, x1 = H.x1 + 0.6, z0 = H.z0 - 0.6, z1 = H.z1
  const tex = useMemo(() => {
    const front = buildingTex().clone(); front.repeat.set((x1 - x0) / 18, 2); front.needsUpdate = true
    const side = buildingTex().clone(); side.repeat.set((z1 - z0) / 18, 2); side.needsUpdate = true
    const low = buildingTex().clone(); low.repeat.set((z1 - z0) / 18, H.h / 15); low.offset.y = 0.05; low.needsUpdate = true
    return { front, side, low, name: makeSign(['水质监测中心'], '#2a6f9e', '#ffffff', 768, 128) }
  }, [x0, x1, z0, z1, H.h])
  const geo = useMemo(() => {
    const P: Part[] = []
    // 女儿墙
    P.push({ p: [(x0 + x1) / 2, Y2 + 0.9, z1 - 0.3], s: [x1 - x0, 1.8, 0.6], c: '#d8d2c6' }, { p: [(x0 + x1) / 2, Y2 + 0.9, z0 + 0.3], s: [x1 - x0, 1.8, 0.6], c: '#d8d2c6' })
    for (const x of [x0 + 0.3, x1 - 0.3]) P.push({ p: [x, Y2 + 0.9, (z0 + z1) / 2], s: [0.6, 1.8, z1 - z0], c: '#d8d2c6' })
    // 楼顶的空调外机、水箱、排风机
    for (let i = 0; i < 6; i++) P.push({ p: [x0 + 14 + i * 9, Y2 + 1.2, z0 + 6], s: [5, 2.4, 3], c: '#e9e9e4' }, { p: [x0 + 14 + i * 9, Y2 + 2.45, z0 + 6], s: [4.6, 0.1, 2.6], c: '#9aa0a3' })
    P.push({ p: [x1 - 14, Y2 + 3, z0 + 8], s: [4, 6, 4], c: '#d0d4d4', cyl: true }, { p: [x1 - 14, Y2 + 6.2, z0 + 8], s: [4.2, 0.4, 4.2], c: '#9aa0a3', cyl: true })
    P.push({ p: [x0 + 8, Y2 + 1.6, z0 + 14], s: [3.2, 3.2, 3.2], c: '#b9bec2' }, { p: [x0 + 8, Y2 + 3.4, z0 + 14], s: [2.2, 0.5, 2.2], c: '#7b8085', cyl: true })
    // 东头山墙的玻璃门、雨棚和台阶
    P.push({ p: [x1 + 3.2, 13.6, z1 - 9], s: [6.4, 0.5, 8], c: '#c9ced2' }, { p: [x1 + 0.4, 0.3, z1 - 9], s: [5, 0.6, 7], c: '#a8a49a' })
    return mergeParts(P)
  }, [x0, x1, z0, z1, Y2])
  return <group>
    <mesh geometry={useMemo(() => slab(x0, x1, Y1, Y2, z0, z1, 6), [x0, x1, Y1, Y2, z0, z1])} castShadow receiveShadow><meshStandardMaterial color="#e4ded2" roughness={0.85} /></mesh>
    <mesh position={[(x0 + x1) / 2, (Y1 + Y2) / 2, z1 + 0.02]}><planeGeometry args={[x1 - x0, Y2 - Y1]} /><meshStandardMaterial map={tex.front} roughness={0.8} /></mesh>
    {[x0 - 0.02, x1 + 0.02].map((x, i) => <group key={i}>
      <mesh position={[x, (Y1 + Y2) / 2, (z0 + z1) / 2]} rotation-y={i ? Math.PI / 2 : -Math.PI / 2}><planeGeometry args={[z1 - z0, Y2 - Y1]} /><meshStandardMaterial map={tex.side} roughness={0.8} /></mesh>
      <mesh position={[x, H.h / 2, (z0 + z1) / 2]} rotation-y={i ? Math.PI / 2 : -Math.PI / 2}><planeGeometry args={[z1 - z0, H.h]} /><meshStandardMaterial map={tex.low} roughness={0.8} /></mesh>
    </group>)}
    <mesh position={[x1 + 0.05, 6, z1 - 9]} rotation-y={Math.PI / 2}><planeGeometry args={[5, 12]} /><meshPhysicalMaterial color="#2e3c45" roughness={0.1} clearcoat={1} /></mesh>
    <mesh position={[(x0 + x1) / 2, Y1 + 2.2, z1 + 0.05]}><planeGeometry args={[26, 3.2]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
  </group>
}

/** 室内的工作灯：跟着当前这一课从前上方打下来，只在化验室的课亮 */
function Key({ x, kind }: { x: number; kind: Want['kind'] }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 4, HALL.h - 2, BZ + 14); aim.position.set(cur.current, TOP + 1, BZ); aim.updateMatrixWorld()
    l.intensity += ((kind === 'lab' ? 170 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.9} intensity={0} distance={60} decay={1.6} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

export function World({ x = ST.l1, kind = 'lab', pond }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(30, 24)
  const tex = useMemo(() => {
    const grass = grassTex().clone(); grass.repeat.set(70, 70); grass.needsUpdate = true
    const tile = tileTex().clone(); tile.repeat.set(1, 1); tile.needsUpdate = true
    const splash = wallTileTex().clone(); splash.repeat.set((HALL.x1 - BENCH.x0 - 2) / 0.6 / 4, 4.2 / 0.6 / 4); splash.needsUpdate = true
    return { grass, tile, splash, bench: benchTex(), name: makeSign(['水质化验室'], '#2a6f9e', '#ffffff', 768, 128),
      rules: makeBoard('化验室规则', ['取用浓酸浓碱戴好手套', '浓酸在通风橱里操作', '稀释浓硫酸：酸入水', '酸碱溅到皮肤立即冲洗', '废液倒进指定的废液桶']),
      flow: flowBoard(['调节池', '中和池', '沉淀池', '生化处理', '监测排放']) }
  }, [])
  const geo = useMemo(() => {
    const H = HALL
    return {
      hall: mergeParts(hallParts()), splash: new THREE.PlaneGeometry(HALL.x1 - BENCH.x0 - 2, 4.2),
      floor: slab(H.x0, H.x1, 0, 0.12, H.z0, H.z1, 3.6), back: slab(H.x0, H.x1, 0, H.h, H.z0 - 0.6, H.z0, 12),
      ends: mergeGeometries([slab(H.x0 - 0.6, H.x0, 0, H.h, H.z0, H.z1, 12), slab(H.x1, H.x1 + 0.6, 0, H.h, H.z0, H.z1, 12)]), ceil: slab(H.x0, H.x1, H.h, H.h + 0.6, H.z0, H.z1, 12),
      top: slab(BENCH.x0, H.x1 - 2, TOP - 0.3, TOP, BENCH.z0, BENCH.z1, 3), bottles: bottles(),
    }
  }, [])
  return (
    <group>
      <hemisphereLight args={['#dfe7f0', '#7d7466', kind === 'out' ? 0.3 : 0.5]} />
      <Key x={x} kind={kind} />
      {/* 地面：草地上铺一大片混凝土厂区，一条深色的厂内道路 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, -60]} receiveShadow><planeGeometry args={[1800, 1400]} /><meshStandardMaterial map={tex.grass} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[10, 0.01, -50]} receiveShadow><planeGeometry args={[460, 200]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#b8b6ad" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[10, 0.03, 26]} receiveShadow><planeGeometry args={[460, 12]} /><meshStandardMaterial color="#4a4d50" roughness={0.9} /></mesh>
      {[0, 1].map(i => <mesh key={i} rotation-x={-Math.PI / 2} position={[10, 0.04, 20.4 + i * 11.2]}><planeGeometry args={[460, 0.5]} /><meshStandardMaterial color="#e9e6dc" roughness={0.8} /></mesh>)}
      <mesh rotation-x={-Math.PI / 2} position={[-26, 0.04, -10]}><planeGeometry args={[10, 60]} /><meshStandardMaterial color="#4a4d50" roughness={0.9} /></mesh>
      <Plant pond={pond} />
      {/* 化验室 */}
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial color="#eceeeb" roughness={0.9} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, 3.2, HALL.z0 + 0.02]}><planeGeometry args={[HALL.x1 - HALL.x0, 6.4]} /><meshStandardMaterial color="#bccacd" roughness={0.7} /></mesh>
      <mesh geometry={geo.ends} receiveShadow><meshStandardMaterial color="#e6e6e1" roughness={0.9} /></mesh>
      <mesh geometry={geo.ceil}><meshStandardMaterial color="#dadad5" roughness={0.9} /></mesh>
      {[ST.l2, ST.l1, ST.l3, ST.l4, ST.l5, ST.x].flatMap(cx => [-12, -4].map(cz => <mesh key={`${cx}${cz}`} position={[cx, HALL.h - 0.05, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[7, 3.6]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.48} clearcoat={0.3} clearcoatRoughness={0.45} /></mesh>
      <mesh position={[(BENCH.x0 + HALL.x1 - 2) / 2, TOP - 0.15, BENCH.z1]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.15, 0.15, HALL.x1 - 2 - BENCH.x0, 16]} /><meshPhysicalMaterial color="#606a6e" roughness={0.4} clearcoat={0.4} /></mesh>
      <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.88} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.h - 1.6, HALL.z1 + 0.02]}><planeGeometry args={[22, 2.4]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <mesh position={[ST.l3 - 5.6, TOP + 7.2, HALL.z0 + 0.05]}><planeGeometry args={[4.2, 5.6]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
      <mesh position={[ST.l3 + 2.2, TOP + 7.6, HALL.z0 + 0.05]}><planeGeometry args={[11.2, 2.8]} /><meshStandardMaterial map={tex.flow} roughness={0.8} /></mesh>
      <mesh geometry={geo.splash} position={[(BENCH.x0 + HALL.x1 - 2) / 2, TOP + 2.1, BENCH.z0 + 0.02]} receiveShadow><meshStandardMaterial map={tex.splash} roughness={0.25} /></mesh>
      <FumeHood />
      <LabBuilding />
    </group>
  )
}
