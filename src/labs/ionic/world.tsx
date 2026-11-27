// 水溶液里的离子平衡实验室的大场景：城市水质检测中心的实验大厅。
// 大厅靠后墙一条长实验台，台面以上是一排大玻璃窗，窗外是河道和对岸的自来水厂；台子从西往东各课占一格，最东头一台通风橱（拓展课）。
// 大楼外面是河边的厂区路和草地；随堂检测的机位在室外高处斜看大楼、河道和水厂。整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。
// 画面里 1 m 画成 M 个单位。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBox } from '@react-three/drei'
import { LabStage, Metal, Painted, mergeParts, useConcrete, type Label, type Part } from '@/lab-kit'
import { benchTex, buildingTex, grassTex, makeBoard, makeSign, rng, tileTex, wallTileTex } from './mats'
import { Outside } from './outside'
import { Facade } from './facade'

export const M = 6, TOP = 0.85 * M      // 1 m 在画面里多长；实验台台面的高度
export type V3 = [number, number, number]

/** 一块板，贴图按它在世界里的位置铺，k 是贴图一格多大 */
export function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 6) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}

/** 实验大厅：x 的范围、后墙和前墙的 z、层高；实验台的前后沿；器材摆在 z = BZ 这条线上 */
export const HALL = { x0: -172, x1: 4, z0: -18, z1: 14, h: 22 }
export const BENCH = { x0: -166, x1: -11, z0: -17.4, z1: -12.9 }
export const BZ = -15
/** 后墙的窗带：下沿、上沿（画面单位） */
const WIN = { y0: TOP + 2.6, y1: 19 }
/** 通风橱：x 范围、进深、柜高、拉门底沿离台面多高 */
export const HOOD = { x0: -10.5, x1: -2, z0: -18, z1: -11.8, h: 15, sash: 3.0 }
/** 各格的中心（x） */
export const ST = { l1: -150, l2: -132, l3: -114, l4: -96, l5: -76, l6: -56, l7: -36, x: (HOOD.x0 + HOOD.x1) / 2 }

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], kind: 'lab' | 'out', fog: [number, number] = [160, 1400]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, kind, fog })
/** 各课的机位：每一处的远近和角度都不一样，主角放在画面中间 */
export const SPOT = {
  l1: spot(ST.l1 - 0.25, TOP + 0.7, BZ + 0.6, 3.0, 1.6, [-0.16, 0.24], 'lab'),
  l2: spot(ST.l2 + 0.09, TOP + 0.75, BZ + 0.5, 3.6, 1.7, [0.2, 0.16], 'lab'),
  l3: spot(ST.l3 - 0.03, TOP + 0.7, BZ + 0.6, 3.5, 1.6, [-0.26, 0.26], 'lab'),
  l4: spot(ST.l4 - 0.1, TOP + 0.75, BZ + 0.3, 3.9, 1.8, [0.14, 0.2], 'lab'),
  l5: spot(ST.l5 - 0.7, TOP + 1.3, BZ + 0.4, 3.5, 1.9, [-0.12, 0.14], 'lab'),
  l6: spot(ST.l6 + 0.05, TOP + 0.62, BZ + 0.7, 3.4, 1.55, [0.28, 0.3], 'lab'),
  l7: spot(ST.l7 - 0.05, TOP + 0.6, BZ + 0.6, 3.1, 1.45, [-0.2, 0.26], 'lab'),
  x: spot(ST.x - 0.1, TOP + 0.75, BZ + 1.2, 2.7, 1.2, [0.1, 0.3], 'lab'),
  q: spot(-70, 22, -100, 170, 66, [1.66, 0.07], 'out', [600, 2600]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：室内工作灯跟到哪 */
export interface Want { x: number; kind: 'lab' | 'out' }

/** 这一课的舞台：选一处机位。大厅里点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳 */
export function Place({ at, labels, children = null }: { at: SpotKey; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, kind: v.kind }), [v])
  const indoor = v.kind === 'lab'
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={indoor ? 1.0 : 1.9} env={indoor ? 0.6 : 0.7} studio={indoor} fog={v.fog} bloom={indoor ? 0.5 : 0} world={want}>{children}</LabStage>
}

// ---------- 实验大厅 ----------
const BAYS = [ST.l1, ST.l2, ST.l3, ST.l4, ST.l5, ST.l6, ST.l7]
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH
  // 后墙的窗间柱和前墙的柱子
  for (let x = H.x0 + 9; x < H.x1 - 2; x += 9) P.push({ p: [x, (WIN.y0 + WIN.y1) / 2, H.z0 + 0.15], s: [0.5, WIN.y1 - WIN.y0, 0.5], c: '#d6d8d6' })
  P.push({ p: [(H.x0 + H.x1) / 2, (WIN.y0 + WIN.y1) / 2, H.z0 + 0.15], s: [H.x1 - H.x0, 0.4, 0.4], c: '#d6d8d6' })
  P.push({ p: [(H.x0 + H.x1) / 2, WIN.y0 - 0.25, H.z0 + 0.5], s: [H.x1 - H.x0, 0.24, 1.2], c: '#cfd2d0' })
  for (const x of [-140, -100, -60, -20]) P.push({ p: [x, H.h / 2, H.z1 - 0.8], s: [1.6, H.h, 1.6], c: '#e4e4df' })
  // 实验台：一条长的柜体，柜门一扇扇，每扇一只拉手；台面下一道深色的踢脚
  for (let x = B.x0; x < B.x1 - 0.1; x += 4.5) {
    const w = Math.min(4.5, B.x1 - x)
    P.push({ p: [x + w / 2, (TOP - 0.4) / 2 + 0.3, B.z1 - 0.12], s: [w - 0.2, TOP - 0.9, 0.2], c: '#dfe2e0' })
    P.push({ p: [x + w / 2, TOP - 1.2, B.z1 + 0.04], s: [1.3, 0.16, 0.16], c: '#7b8085' })
  }
  P.push({ p: [(B.x0 + B.x1) / 2, 0.15, (B.z0 + B.z1) / 2], s: [B.x1 - B.x0, 0.3, B.z1 - B.z0 - 0.4], c: '#3d4146' })
  // 台面后沿的挡板和设备带（插座）
  P.push({ p: [(B.x0 + B.x1) / 2, TOP + 0.12, B.z0 + 0.12], s: [B.x1 - B.x0, 0.24, 0.24], c: '#c9ccca' })
  for (const x of BAYS) for (const s of [-1, 1]) P.push({ p: [x + s * 6.2, TOP + 1.1, B.z0 + 0.3], s: [0.9, 0.6, 0.12], c: '#e8e6df' })
  // 两格之间的水槽和鹅颈龙头
  for (const x of [ST.l2 + 9, ST.l4 + 10, ST.l6 + 10]) { P.push({ p: [x, TOP + 0.01, (B.z0 + B.z1) / 2 - 0.8], s: [2.2, 0.06, 1.6], c: '#9aa0a4' }); P.push({ p: [x, TOP + 1.3, B.z0 + 0.4], s: [0.12, 2.6, 0.12], c: '#c6cbce', cyl: true }) }
  return P
}
/** 台面后沿的一排试剂瓶（棕色的、透明的），在每两格之间 */
function bottles() {
  const gs: THREE.BufferGeometry[] = [], r = rng(37)
  for (const x0 of [ST.l1 + 9, ST.l3 + 9, ST.l5 + 10, ST.l7 + 12]) for (let i = 0; i < 6; i++) {
    if (r() < 0.15) continue
    const rad = 0.2 + r() * 0.12, h = 0.7 + r() * 0.5, x = x0 - 2.6 + i * 1.0, z = BENCH.z0 + 0.7 + r() * 0.4, y = TOP
    const body = new THREE.CylinderGeometry(rad, rad, h, 14); body.translate(x, y + h / 2, z)
    const neck = new THREE.CylinderGeometry(rad * 0.45, rad * 0.55, h * 0.22, 12); neck.translate(x, y + h + h * 0.11, z)
    const cap = new THREE.CylinderGeometry(rad * 0.5, rad * 0.5, h * 0.12, 12); cap.translate(x, y + h * 1.28, z)
    const col = new THREE.Color(r() < 0.5 ? '#5a3214' : '#c7d6d8'), capC = new THREE.Color(r() < 0.5 ? '#1f2124' : '#d6d4cc')
    for (const [g, c] of [[body, col], [neck, col], [cap, capC]] as [THREE.BufferGeometry, THREE.Color][]) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) { a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.toNonIndexed()) }
  }
  return mergeGeometries(gs)
}

/**
 * 通风橱：白色钢制柜体，下面是两扇门的柜子；台面是黑色耐酸理化板，前沿一道挡液翻边。
 * 两侧是有厚度的侧板，内衬浅灰的耐腐蚀板；后面是导流挡板；顶上一块前面板（写着“通风橱”、一块风速屏），里面一盏照明灯，再上面一截排风管通到吊顶。
 * 前面一扇铝合金框的钢化玻璃视窗，拉到台面上方 sash 处。
 */
function FumeHood() {
  const H = HOOD, W = H.x1 - H.x0, D = H.z1 - H.z0, cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2
  const T = 0.6, IN = W - 2 * T, FASCIA = 2.8, OPEN = H.h - FASCIA
  const white = <meshPhysicalMaterial color="#eef0ee" roughness={0.36} clearcoat={0.4} />
  const liner = <meshStandardMaterial color="#dfe3e2" roughness={0.55} />
  const epoxy = <meshPhysicalMaterial color="#202326" roughness={0.38} clearcoat={0.5} clearcoatRoughness={0.3} />
  const sign = useMemo(() => makeSign(['通风橱', '视窗拉到安全高度以下操作'], '#f2f3f1', '#2a6f9e', 768, 160), [])
  const shell = useMemo(() => {
    const P: Part[] = []
    P.push({ p: [cx, (TOP - 0.3) / 2 + 0.3, H.z1 - 0.15], s: [W - 0.2, TOP - 0.9, 0.24], c: '#e6e8e6' })
    P.push({ p: [cx, (TOP - 0.3) / 2 + 0.3, H.z1 - 0.02], s: [0.06, TOP - 1.1, 0.04], c: '#9aa0a3' })
    for (const s of [-1, 1]) P.push({ p: [cx + s * 0.9, TOP - 1.3, H.z1 + 0.02], s: [1.0, 0.14, 0.14], c: '#7b8085' })
    P.push({ p: [cx, 0.15, cz], s: [W - 0.4, 0.3, D - 0.6], c: '#3d4146' })
    for (const s of [-1, 1]) P.push({ p: [cx + s * (IN / 2 - 0.08), (TOP + OPEN) / 2 + 0.3, H.z1 - 0.12], s: [0.16, OPEN - TOP + 0.6, 0.36], c: '#b9bec2' })
    for (const [i, c] of [[0, '#2f8f6b'], [1, '#d9a520'], [2, '#1f2326']] as [number, string][]) P.push({ p: [H.x1 - T - 0.12, TOP + 1.2, cz + 1.4 - i * 0.8], s: [0.24, 0.24, 0.24], c: '#c6cbce' }, { p: [H.x1 - T - 0.32, TOP + 1.2, cz + 1.4 - i * 0.8], s: [0.2, 0.4, 0.12], c })
    return mergeParts(P)
  }, [cx, cz, W, D, H.z1, H.x1, IN, OPEN])
  return <group>
    <mesh geometry={shell} castShadow receiveShadow><Painted rough={0.5} metal={0.1} /></mesh>
    <RoundedBox args={[W - 0.1, 0.3, D - 0.1]} radius={0.08} position={[cx, TOP - 0.15, cz]} receiveShadow castShadow>{epoxy}</RoundedBox>
    <RoundedBox args={[IN, 0.16, 0.24]} radius={0.06} position={[cx, TOP + 0.06, H.z1 - 0.28]} castShadow>{epoxy}</RoundedBox>
    {[-1, 1].map(s => <group key={s}>
      <RoundedBox args={[T, H.h - TOP, D]} radius={0.1} position={[cx + s * (W / 2 - T / 2), TOP + (H.h - TOP) / 2, cz]} castShadow receiveShadow>{white}</RoundedBox>
      <mesh position={[cx + s * (IN / 2 + 0.005), TOP + (OPEN - TOP) / 2, cz - 0.1]} rotation-y={-s * Math.PI / 2} receiveShadow><planeGeometry args={[D - 0.6, OPEN - TOP]} />{liner}</mesh>
    </group>)}
    <mesh position={[cx, TOP + (OPEN - TOP) / 2, H.z0 + 0.5]} receiveShadow><boxGeometry args={[IN, OPEN - TOP - 1.2, 0.2]} />{liner}</mesh>
    <mesh position={[cx, TOP + 0.3, H.z0 + 0.3]}><boxGeometry args={[IN, 0.6, 0.1]} /><meshStandardMaterial color="#3c4145" roughness={0.9} /></mesh>
    <mesh position={[cx, OPEN - 0.3, H.z0 + 0.3]}><boxGeometry args={[IN, 0.6, 0.1]} /><meshStandardMaterial color="#121416" roughness={0.9} /></mesh>
    <mesh position={[cx, OPEN + 0.15, cz]}><boxGeometry args={[IN, 0.3, D - 0.2]} />{liner}</mesh>
    <mesh position={[cx, OPEN - 0.01, cz - 0.6]} rotation-x={Math.PI / 2}><planeGeometry args={[IN - 1.2, 1.2]} /><meshBasicMaterial color="#fffaf0" toneMapped={false} /></mesh>
    <pointLight position={[cx, OPEN - 0.6, cz - 0.4]} intensity={18} distance={10} decay={1.6} color="#fff6e8" />
    <RoundedBox args={[W, FASCIA, D * 0.55]} radius={0.12} position={[cx, OPEN + FASCIA / 2, H.z1 - D * 0.275]} castShadow>{white}</RoundedBox>
    <mesh position={[cx - 0.6, OPEN + FASCIA * 0.55, H.z1 + 0.01]}><planeGeometry args={[4.8, 1.0]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
    <group position={[cx + W / 2 - 1.2, OPEN + FASCIA * 0.55, H.z1 + 0.01]}>
      <mesh><planeGeometry args={[1.4, 1.1]} /><meshStandardMaterial color="#2b3035" roughness={0.5} /></mesh>
      <mesh position={[0, 0.18, 0.01]}><planeGeometry args={[1.0, 0.4]} /><meshBasicMaterial color="#7dffb0" toneMapped={false} /></mesh>
    </group>
    <RoundedBox args={[W, 0.6, D]} radius={0.1} position={[cx, H.h - 0.3 + 0.01, cz]}>{white}</RoundedBox>
    <mesh position={[cx, (H.h + HALL.h) / 2, cz - 0.5]} castShadow><cylinderGeometry args={[1.0, 1.0, HALL.h - H.h, 28]} /><meshStandardMaterial color="#c9cdc9" roughness={0.55} /></mesh>
    <group position={[cx, TOP + H.sash, H.z1 - 0.12]}>
      <mesh position-y={3.2} renderOrder={8}><planeGeometry args={[IN - 0.3, 6.2]} /><meshPhysicalMaterial color="#d6e6e8" transparent opacity={0.14} roughness={0.02} clearcoat={1} envMapIntensity={2.6} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <RoundedBox args={[IN - 0.2, 0.34, 0.3]} radius={0.06} position-y={0.04}><meshPhysicalMaterial color="#dfe3e6" metalness={0.25} roughness={0.35} clearcoat={0.5} /></RoundedBox>
      {[-1, 1].map(s => <mesh key={s} position={[s * (IN - 0.3) / 2, 3.2, 0]}><boxGeometry args={[0.14, 6.4, 0.26]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      <mesh position={[0, -0.02, 0.26]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, IN - 1.6, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
    </group>
  </group>
}

/**
 * 检测中心大楼的外观：一层是实验大厅，上面再盖三层（外墙一排排窗），楼顶一圈女儿墙和几台空调外机；
 * 前墙是带窗的实墙，门头一块“水质检测中心”的牌子。这些只在室外的机位看得见。
 */
function Building() {
  const H = HALL, Y1 = H.h + 0.6, Y2 = Y1 + 42, x0 = H.x0 - 0.6, x1 = H.x1 + 0.6, z0 = H.z0 - 0.6, z1 = H.z1 + 0.6
  const tex = useMemo(() => {
    const mk = (rx: number, ry: number) => { const t = buildingTex().clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return t }
    return { front: mk((x1 - x0) / 18, 3), side: mk((z1 - z0) / 18, 3), low: mk((x1 - x0) / 18, H.h / 14), name: makeSign(['城市水质检测中心'], '#1f4e79', '#ffffff', 1024, 128) }
  }, [x0, x1, z0, z1, H.h])
  const geo = useMemo(() => {
    const P: Part[] = []
    for (const z of [z0 + 0.3, z1 - 0.3]) P.push({ p: [(x0 + x1) / 2, Y2 + 0.9, z], s: [x1 - x0, 1.8, 0.6], c: '#d8d2c6' })
    for (const x of [x0 + 0.3, x1 - 0.3]) P.push({ p: [x, Y2 + 0.9, (z0 + z1) / 2], s: [0.6, 1.8, z1 - z0], c: '#d8d2c6' })
    for (let i = 0; i < 9; i++) P.push({ p: [x0 + 14 + i * 18, Y2 + 1.2, z0 + 8], s: [5, 2.4, 3], c: '#e9e9e4' })
    // 门头的雨棚和台阶
    P.push({ p: [-80, 13.6, z1 + 3.4], s: [16, 0.5, 6.8], c: '#c9ced2' }, { p: [-80, 0.3, z1 + 2.5], s: [14, 0.6, 5], c: '#a8a49a' })
    return mergeParts(P)
  }, [x0, x1, z0, z1, Y2])
  // 外墙：前、后、两头的实墙，后墙的一层是窗带（从室内那一面画），这里只盖二层以上
  const shell = useMemo(() => mergeGeometries([slab(x0, x1, Y1, Y2, z0, z1, 6)]), [x0, x1, Y1, Y2, z0, z1])
  return <group>
    <mesh geometry={shell} castShadow receiveShadow><meshStandardMaterial color="#cfc8ba" roughness={0.85} /></mesh>
    <mesh position={[(x0 + x1) / 2, (Y1 + Y2) / 2, z1 + 0.02]}><planeGeometry args={[x1 - x0, Y2 - Y1]} /><meshStandardMaterial map={tex.front} roughness={0.8} /></mesh>
    <mesh position={[(x0 + x1) / 2, (Y1 + Y2) / 2, z0 - 0.02]} rotation-y={Math.PI}><planeGeometry args={[x1 - x0, Y2 - Y1]} /><meshStandardMaterial map={tex.front} roughness={0.8} /></mesh>
    {[x0 - 0.02, x1 + 0.02].map((x, i) => <mesh key={i} position={[x, (Y1 + Y2) / 2, (z0 + z1) / 2]} rotation-y={i ? Math.PI / 2 : -Math.PI / 2}><planeGeometry args={[z1 - z0, Y2 - Y1]} /><meshStandardMaterial map={tex.side} roughness={0.8} /></mesh>)}
    <mesh position={[(x0 + x1) / 2, H.h / 2, z1 + 0.02]}><planeGeometry args={[x1 - x0, H.h]} /><meshStandardMaterial map={tex.low} roughness={0.8} /></mesh>
    <mesh position={[-80, 16.2, z1 + 0.05]}><planeGeometry args={[30, 3.6]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
    <mesh position={[-80, 6, z1 + 0.06]}><planeGeometry args={[9, 12]} /><meshPhysicalMaterial color="#2e3c45" roughness={0.1} clearcoat={1} /></mesh>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
  </group>
}

/** 室内的工作灯：跟着当前这一课从前上方打下来，只在大厅里的课亮 */
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

export function World({ x = ST.l1, kind = 'lab' }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(30, 24)
  const tex = useMemo(() => {
    const tile = tileTex().clone(); tile.repeat.set(1, 1); tile.needsUpdate = true
    const splash = wallTileTex().clone(); splash.repeat.set((BENCH.x1 - BENCH.x0) / 0.6 / 4, (WIN.y0 - TOP) / 0.6 / 4); splash.needsUpdate = true
    const grass = grassTex().clone(); grass.repeat.set(60, 12); grass.needsUpdate = true
    return { tile, splash, grass, bench: benchTex(),
      rules: makeBoard('实验室规则', ['取用浓酸浓碱戴好手套', '挥发性试剂在通风橱里操作', '电极用完冲洗后插回保护液', '银盐废液倒进重金属废液桶', '离心机放管要对称配平']),
      name: makeSign(['离子检测室'], '#1f4e79', '#ffffff', 768, 128) }
  }, [])
  const geo = useMemo(() => {
    const H = HALL
    return {
      hall: mergeParts(hallParts()),
      floor: slab(H.x0, H.x1, 0, 0.12, H.z0, H.z1, 3.6),
      back: mergeGeometries([slab(H.x0, H.x1, 0, WIN.y0, H.z0 - 0.6, H.z0, 12), slab(H.x0, H.x1, WIN.y1, H.h, H.z0 - 0.6, H.z0, 12)]),
      front: slab(H.x0, H.x1, 0, H.h, H.z1, H.z1 + 0.6, 12),
      ends: mergeGeometries([slab(H.x0 - 0.6, H.x0, 0, H.h, H.z0, H.z1, 12), slab(H.x1, H.x1 + 0.6, 0, H.h, H.z0, H.z1, 12)]), ceil: slab(H.x0, H.x1, H.h, H.h + 0.6, H.z0, H.z1, 12),
      top: slab(BENCH.x0, BENCH.x1, TOP - 0.3, TOP, BENCH.z0, BENCH.z1, 3), bottles: bottles(),
      mull: mergeParts(Array.from({ length: Math.floor((HALL.x1 - HALL.x0) / 3) }, (_, i) => ({ p: [HALL.x0 + 1.5 + i * 3, (WIN.y0 + WIN.y1) / 2, HALL.z0 - 0.3], s: [0.12, WIN.y1 - WIN.y0, 0.2], c: '#9aa1a5' } as Part))),
    }
  }, [])
  return (
    <group>
      <hemisphereLight args={['#dfe7f0', '#7d7466', kind === 'out' ? 0.3 : 0.45]} />
      <Key x={x} kind={kind} />
      {/* 地面：大楼前后一大片混凝土厂区，大楼前一条道路；北面是河道和水厂 */}
      <mesh rotation-x={-Math.PI / 2} position={[-80, 0.01, -20]} receiveShadow><planeGeometry args={[520, 84]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#b8b6ad" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-80, -0.02, 120]} receiveShadow><planeGeometry args={[900, 180]} /><meshStandardMaterial map={tex.grass} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-80, 0.02, 24]} receiveShadow><planeGeometry args={[900, 6]} /><meshStandardMaterial color="#b9b4a8" roughness={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-80, 0.03, 34]} receiveShadow><planeGeometry args={[900, 14]} /><meshStandardMaterial color="#4a4d50" roughness={0.9} /></mesh>
      <Outside />
      {/* 实验大厅 */}
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial color="#eceeeb" roughness={0.9} /></mesh>
      <mesh geometry={geo.front} receiveShadow><meshStandardMaterial color="#e6e6e1" roughness={0.9} /></mesh>
      <mesh geometry={geo.ends} receiveShadow><meshStandardMaterial color="#e6e6e1" roughness={0.9} /></mesh>
      <mesh geometry={geo.ceil}><meshStandardMaterial color="#dadad5" roughness={0.9} /></mesh>
      {/* 后墙的窗：一整条铝合金窗框，竖梃每 0.5 m 一根，淡淡的灰绿玻璃 */}
      <mesh geometry={geo.mull} castShadow><Painted rough={0.4} metal={0.5} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, (WIN.y0 + WIN.y1) / 2, HALL.z0 - 0.3]}><planeGeometry args={[HALL.x1 - HALL.x0, WIN.y1 - WIN.y0]} /><meshPhysicalMaterial color="#7f9396" transparent opacity={0.34} roughness={0.04} clearcoat={1} envMapIntensity={1.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      {[...BAYS, ST.x].flatMap(cx => [-11, -3, 6].map(cz => <mesh key={`${cx}${cz}`} position={[cx, HALL.h - 0.05, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[7, 3.6]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.48} clearcoat={0.3} clearcoatRoughness={0.45} /></mesh>
      <mesh position={[(BENCH.x0 + BENCH.x1) / 2, TOP - 0.15, BENCH.z1]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.15, 0.15, BENCH.x1 - BENCH.x0, 16]} /><meshPhysicalMaterial color="#606a6e" roughness={0.4} clearcoat={0.4} /></mesh>
      <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.88} /></mesh>
      <mesh position={[(BENCH.x0 + BENCH.x1) / 2, (TOP + WIN.y0 - 0.4) / 2 + 0.05, BENCH.z0 + 0.02]} receiveShadow><planeGeometry args={[BENCH.x1 - BENCH.x0, WIN.y0 - 0.4 - TOP]} /><meshStandardMaterial map={tex.splash} roughness={0.25} /></mesh>
      <mesh position={[HALL.x0 + 0.05, TOP + 6, -6]} rotation-y={Math.PI / 2}><planeGeometry args={[4.2, 5.6]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
      <mesh position={[-80, HALL.h - 1.6, HALL.z1 - 0.02]} rotation-y={Math.PI}><planeGeometry args={[20, 2.2]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <FumeHood />
      <Building />
      <Facade />
    </group>
  )
}
