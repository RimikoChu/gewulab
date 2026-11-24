// 水的净化和组成实验室的大场景：一座自来水厂。最西边是一条河和取水泵房，河岸上一张取样台；
// 往东是化验楼一层敞着门脸的化验室，靠后墙一条长化验台，各课占一格；再往东是厂区：絮凝沉淀池、滤池、活性炭池、加氯间、清水池、送水泵房。
// 厂门口有一张开放日的展台。整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 m 画成 M 个单位。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Painted, mergeParts, useConcrete, useRipple, type Label, type Part } from '@/lab-kit'
import { CUT, Plant, slab } from './plant'
import { bankTex, benchTex, flowBoard, grassTex, makeBoard, makeSign, rng, tileTex } from './mats'

export const M = 6, TOP = 0.85 * M      // 1 m 在画面里多长；化验台台面的高度
export type V3 = [number, number, number]

/** 化验室：x 的范围、后墙和门脸的 z、层高；化验台的前后沿；器材摆在 z = BZ 这条线上 */
export const HALL = { x0: -204, x1: -108, z0: -18, z1: 4, h: 22 }
export const BENCH = { z0: -17.4, z1: -12.9 }
export const BZ = -15
/** 化验台上各格的中心（x）：每两根柱子之间一格 */
export const ST = { l2: -192, l3: -174, l4: -156, l6: -138, l7: -120 }
/** 河：西岸边线的 x、水面高度 */
export const RIVER = { bank: -238, y: -4.2, far: -334 }
/** 室外的几处：河边的取样台、开放日展台 */
export const SITE = { sample: { x: RIVER.bank - 8.4, z: 14 }, expo: { x: -70, z: 40 } }

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], indoor: boolean, fog: [number, number] = [160, 1200]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, indoor, fog })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(-288, 1.5, SITE.sample.z + 5, 34, 13, [1.57, 0.19], false),
  l2: spot(ST.l2 + 0.2, TOP + 0.55, BZ, 2.6, 1.4, [-0.14, 0.2], true),
  l3: spot(ST.l3 - 0.05, TOP + 0.95, BZ + 0.15, 2.7, 1.75, [0.16, 0.14], true),
  l4: spot(ST.l4 + 0.75, TOP + 0.9, BZ + 0.1, 3.0, 1.8, [-0.18, 0.15], true),
  l6a: spot(ST.l6 - 1.1, TOP + 0.6, BZ + 0.15, 2.6, 1.45, [0.1, 0.2], true),
  l6b: spot(ST.l6 + 1.65, TOP + 1.35, BZ + 0.1, 2.7, 2.5, [-0.08, 0.14], true),
  l7: spot(ST.l7 + 0.15, TOP + 1.8, BZ + 0.1, 1.9, 3.3, [-0.12, 0.1], true),
  x: spot(SITE.expo.x + 0.2, TOP + 1.0, SITE.expo.z, 4.4, 2.6, [0.02, 0.17], false),
  q: spot(90, 14, -40, 420, 120, [-0.1, 0.36], false, [700, 2600]),
}
export type SpotKey = keyof typeof SPOT
/** 第 5 课各站的机位 */
export const STATION_SPOT = [
  spot(-262, 12, -38, 84, 44, [0.5, 0.22], false),
  spot(1, 17, -34, 124, 44, [-0.06, 0.22], false),
  spot(114, 10, -36, 78, 36, [0.1, 0.24], false),
  spot(189, 10, -36, 68, 34, [-0.1, 0.24], false),
  spot(246, 10, -30, 64, 36, [0.3, 0.22], false),
  spot(366, 12, -42, 180, 56, [-0.1, 0.2], false),
]

/** 每一课交给世界的要求：化验室的工作灯跟到哪；是不是在室内；第 5 课在第几站、消毒剂投了没有 */
export interface Want { x: number; indoor: boolean; station?: number; chlorine?: boolean }

/** 这一课的舞台：选一处机位。室内点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳 */
export function Place({ at, labels, children = null, station, chlorine }: { at: SpotKey | number; labels: Label[]; children?: ReactNode; station?: number; chlorine?: boolean }) {
  const v = typeof at === 'number' ? STATION_SPOT[at] : SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, indoor: v.indoor, station, chlorine }), [v, station, chlorine])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.indoor ? 1.0 : 2.2} env={v.indoor ? 0.6 : 0.8} studio={v.indoor} fog={v.fog} bloom={0.55} world={want}>{children}</LabStage>
}

// ---------- 化验室 ----------
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH
  // 柱子：白色方柱，柱脚一圈深灰的踢脚
  for (const x of [-201, -183, -165, -147, -129, -111]) { P.push({ p: [x, H.h / 2, H.z0 + 0.7], s: [1.4, H.h, 1.4], c: '#e4e4df' }, { p: [x, 0.5, H.z0 + 0.7], s: [1.5, 1, 1.5], c: '#5b6063' }) }
  for (const x of [-201, -156, -111]) P.push({ p: [x, H.h / 2, H.z1 - 0.8], s: [1.6, H.h, 1.6], c: '#e4e4df' })
  P.push({ p: [(H.x0 + H.x1) / 2, H.h - 1.6, H.z1 - 0.8], s: [H.x1 - H.x0, 3.2, 1.6], c: '#d9d8d1' })
  // 化验台：一条长的柜体，柜门一扇扇，每扇一只拉手；台面下一道深色的收边
  for (let x = H.x0 + 2; x < H.x1 - 2; x += 4.5) {
    P.push({ p: [x + 2.25, (TOP - 0.4) / 2 + 0.3, B.z1 - 0.12], s: [4.3, TOP - 0.9, 0.2], c: '#d7dad8' })
    P.push({ p: [x + 2.25, TOP - 1.2, B.z1 + 0.04], s: [1.3, 0.16, 0.16], c: '#7b8085' })
  }
  P.push({ p: [(H.x0 + H.x1) / 2, 0.15, (B.z0 + B.z1) / 2], s: [H.x1 - H.x0 - 4, 0.3, B.z1 - B.z0 - 0.4], c: '#3d4146' })
  // 台面后面的挡板和一条设备带（插座、水龙头）
  P.push({ p: [(H.x0 + H.x1) / 2, TOP + 0.8, B.z0 + 0.12], s: [H.x1 - H.x0 - 4, 1.6, 0.24], c: '#2a2e32' })
  for (const x of Object.values(ST)) for (const s of [-1, 1]) P.push({ p: [x + s * 6.2, TOP + 1.1, B.z0 + 0.3], s: [0.9, 0.6, 0.12], c: '#e8e6df' })
  // 墙上的试剂架：两层搁板
  for (const x of [ST.l2, ST.l4, ST.l7]) for (const y of [TOP + 5.4, TOP + 8.2]) P.push({ p: [x, y, H.z0 + 0.9], s: [11, 0.25, 1.6], c: '#b48a5a' })
  // 每格后墙一只水槽和鹅颈龙头
  for (const x of [ST.l3 + 6.5, ST.l6 + 6.5]) { P.push({ p: [x, TOP + 0.01, (B.z0 + B.z1) / 2 - 0.8], s: [2.2, 0.06, 1.6], c: '#9aa0a4' }); P.push({ p: [x, TOP + 1.3, B.z0 + 0.4], s: [0.12, 2.6, 0.12], c: '#c6cbce', cyl: true }) }
  return P
}
/** 墙上试剂架上的瓶子：棕色的、透明的 */
function bottles() {
  const gs: THREE.BufferGeometry[] = [], r = rng(17)
  for (const x0 of [ST.l2, ST.l4, ST.l7]) for (const y of [TOP + 5.53, TOP + 8.33]) for (let i = 0; i < 10; i++) {
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
/** 室内的工作灯：跟着当前这一课从前上方打下来，只在室内的课亮 */
function Key({ x, on }: { x: number; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 4, HALL.h - 2, BZ + 14); aim.position.set(cur.current, TOP + 1, BZ); aim.updateMatrixWorld()
    l.intensity += ((on ? 160 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.9} intensity={0} distance={60} decay={1.6} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

// ---------- 河 ----------
/** 河：一道往西倾斜的河岸，岸边几块石头；水面带波纹；对岸一溜树和远山 */
function River() {
  const ripple = useRipple([7, 40], 0.035)
  const bank = useMemo(() => { const t = bankTex().clone(); t.repeat.set(4, 30); t.needsUpdate = true; return t }, [])
  const grass = useMemo(() => { const t = grassTex().clone(); t.repeat.set(6, 60); t.needsUpdate = true; return t }, [])
  /** 水面的颜色：从近岸到对岸，浅水处偏黄偏亮，河心深一些、偏绿 */
  const tint = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 4
    const g = c.getContext('2d')!, q = g.createLinearGradient(0, 0, 256, 0)
    q.addColorStop(0, '#9b8b5c'); q.addColorStop(0.1, '#6f6844'); q.addColorStop(0.5, '#4d5238'); q.addColorStop(0.85, '#655f40'); q.addColorStop(0.97, '#a39463'); q.addColorStop(1, '#b4a372')
    g.fillStyle = q; g.fillRect(0, 0, 256, 4)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const W = RIVER.bank - RIVER.far
  const geo = useMemo(() => {
    // 这一岸的岸坡：从岸顶 (bank, 0) 斜到水下
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(-16, RIVER.y - 6); s.lineTo(-16, RIVER.y - 7); s.lineTo(4, RIVER.y - 7); s.lineTo(4, 0); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 900, bevelEnabled: false }); g.translate(RIVER.bank, 0, -450)
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 20, p.getZ(i) / 30)
    // 对岸的河堤：迎水坡下半截是块石护坡，上面是草坡，堤顶一条路，背水坡下去
    const f = new THREE.Shape(); f.moveTo(0, RIVER.y - 7); f.lineTo(14, RIVER.y - 7); f.lineTo(0, RIVER.y + 1.5); f.lineTo(-14, 7); f.lineTo(-24, 7); f.lineTo(-40, 0); f.lineTo(-40, RIVER.y - 7); f.closePath()
    const levee = new THREE.ExtrudeGeometry(f, { depth: 900, bevelEnabled: false }); levee.translate(RIVER.far, 0, -450)
    const q = levee.attributes.position, uv2 = levee.attributes.uv; for (let i = 0; i < q.count; i++) uv2.setXY(i, q.getX(i) / 12, q.getZ(i) / 12)
    return { near: g, levee }
  }, [])
  const trees = useMemo(() => {
    const P: Part[] = [], r = rng(41)
    // 堤顶的路肩石、背水坡后面一排树、再远处的一片楼
    P.push({ p: [RIVER.far - 19, 7.15, 0], s: [9, 0.3, 900], c: '#6c6c68' })
    for (let i = 0; i < 90; i++) { const z = -440 + i * 10 + r() * 5, x = RIVER.far - 46 - r() * 30, h = 12 + r() * 14; P.push({ p: [x, h / 2, z], s: [0.7, h, 0.7], c: '#5a4632', cyl: true }, { p: [x, h + 2.5, z], s: [4.5 + r() * 3, 9 + r() * 6, 4.5 + r() * 3], c: r() < 0.5 ? '#3f5f33' : '#4d6b3a', cyl: true }) }
    for (let i = 0; i < 18; i++) { const z = -380 + i * 46 + r() * 10, x = RIVER.far - 150 - r() * 120, w = 26 + r() * 26, h = 24 + r() * (r() < 0.3 ? 110 : 40); P.push({ p: [x, h / 2, z], s: [w, h, 20 + r() * 20], c: r() < 0.5 ? '#b7b6ae' : '#a9aeb2' }) }
    // 这一岸的芦苇和草丛
    for (let i = 0; i < 160; i++) { const x = RIVER.bank - 7 + r() * 13, z = -70 + r() * 150, h = 1.2 + r() * (x < RIVER.bank - 3 ? 4 : 1.6), y = x < RIVER.bank ? -(RIVER.bank - x) * 10.2 / 16 : 0
      for (let k = 0; k < 6; k++) P.push({ p: [x + (r() - 0.5) * 0.8, y + h * 0.3, z + (r() - 0.5) * 0.8], s: [0.035, h * 0.6, 0.035], c: r() < 0.5 ? '#5d7a38' : '#7c8f48', r: [(r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3], cyl: true }) }
    // 对岸水边的块石护坡：一条灰色的大小石块
    for (let i = 0; i < 500; i++) { const z = -250 + r() * 500, u = r(); P.push({ p: [RIVER.far + 1 + u * 7, RIVER.y + 1.2 - u * 1.6 + (r() - 0.5) * 0.5, z], s: [1 + r() * 1.6, 0.6 + r() * 0.8, 1 + r() * 1.6], c: r() < 0.5 ? '#8b877c' : '#a29d90', r: [0, r() * 3, 0.3] }) }
    // 对岸水边的芦苇
    for (let i = 0; i < 220; i++) { const x = RIVER.far + 1 + r() * 4, z = -200 + r() * 400, h = 2 + r() * 3; for (let k = 0; k < 4; k++) P.push({ p: [x + (r() - 0.5) * 0.8, RIVER.y + h * 0.4, z + (r() - 0.5) * 0.8], s: [0.06, h, 0.06], c: r() < 0.5 ? '#6b8640' : '#8a9a52', cyl: true }) }
    for (let i = 0; i < 70; i++) { const x = RIVER.bank - 1 - r() * 6, z = -60 + r() * 130; P.push({ p: [x, Math.max(-(RIVER.bank - x) * 10.2 / 16, RIVER.y - 0.2) - 0.1, z], s: [0.6 + r() * 1.4, 0.35 + r() * 0.4, 0.6 + r() * 1.2], c: r() < 0.5 ? '#7d776a' : '#948e7e', r: [0, r() * 3, 0] }) }
    return mergeParts(P)
  }, [])
  return <group>
    <mesh geometry={geo.near} receiveShadow castShadow><meshStandardMaterial map={bank} roughness={0.95} /></mesh>
    <mesh geometry={geo.levee} receiveShadow castShadow><meshStandardMaterial map={grass} color="#b9bf9a" roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[RIVER.far - 440, -0.02, 0]} receiveShadow><planeGeometry args={[800, 1400]} /><meshStandardMaterial map={grass} color="#b9bf9a" roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[(RIVER.bank + RIVER.far) / 2 - 1, RIVER.y, 0]} renderOrder={3}><planeGeometry args={[W + 18, 900]} /><meshPhysicalMaterial map={tint} transparent opacity={0.94} roughness={0.03} normalMap={ripple} normalScale={new THREE.Vector2(0.3, 0.3)} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={2.2} depthWrite={false} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[(RIVER.bank + RIVER.far) / 2, RIVER.y - 6.5, 0]}><planeGeometry args={[W + 30, 900]} /><meshStandardMaterial color="#4e4530" roughness={1} /></mesh>
    <mesh geometry={trees} castShadow><Painted rough={0.9} metal={0} /></mesh>
  </group>
}

/** 远处的城市：一排高高矮矮的楼，自来水就是送到那里去的 */
function cityParts() {
  const P: Part[] = [], r = rng(77)
  for (let i = 0; i < 22; i++) { const w = 30 + r() * 30, h = 50 + r() * 140; P.push({ p: [-300 + i * 46, h / 2, -360 - r() * 140], s: [w, h, 36], c: r() < 0.5 ? '#a9aeb2' : '#bdb8ae' }) }
  // 厂区的围墙和大门
  for (let x = -230; x <= 560; x += 12) P.push({ p: [x, 4, -150], s: [1, 8, 1], c: '#b9b4a8' })
  P.push({ p: [165, 3.5, -150], s: [790, 7, 0.5], c: '#cfcabe' })
  for (const s of [-1, 1]) P.push({ p: [-70 + s * 16, 7, 56], s: [3, 14, 3], c: '#d9d5cb' })
  P.push({ p: [-70, 14.5, 56], s: [35, 2.4, 2.6], c: '#2a6f9e' })
  return P
}
/** 开放日展台：一张折叠桌，铺蓝色桌布；旁边一块易拉宝 */
function expoParts() {
  const P: Part[] = [], { x, z } = SITE.expo, T = TOP
  P.push({ p: [x, T - 0.15, z], s: [11, 0.3, 4.4], c: '#3d5a73' }, { p: [x, T / 2 - 0.15, z + 2.15], s: [11, T - 0.3, 0.08], c: '#3d5a73' })
  for (const s of [-1, 1]) for (const t of [-1, 1]) P.push({ p: [x + s * 5, (T - 0.3) / 2, z + t * 1.8], s: [0.25, T - 0.3, 0.25], c: '#9aa0a4' })
  P.push({ p: [x + 8.5, 6, z - 1.4], s: [4.4, 12, 0.15], c: '#e8e6df' }, { p: [x + 8.5, 0.15, z - 1.4], s: [4.6, 0.3, 1.2], c: '#3c4044' })
  return P
}

export function World({ x = ST.l3, indoor = true, station = -1, chlorine = false }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(30, 24)
  const tex = useMemo(() => {
    const grass = grassTex().clone(); grass.repeat.set(70, 70); grass.needsUpdate = true
    const tile = tileTex().clone(); tile.repeat.set(1, 1); tile.needsUpdate = true
    return { grass, tile, bench: benchTex(), name: makeSign(['水质化验室'], '#2a6f9e', '#ffffff', 768, 128), gate: makeSign(['城市供水 · 第二水厂'], '#2a6f9e', '#ffffff', 1024, 128),
      rules: makeBoard('化验室规则', ['进入化验室穿好实验服', '取用药品不直接用手', '试剂瓶用后盖好放回', '酒精灯用灯帽盖灭', '实验后关好水电']),
      flow: flowBoard(['取水', '絮凝沉淀', '过滤', '活性炭吸附', '消毒', '配水']),
      expo: makeBoard('公众开放日', ['自制一个简易净水器', '看看一只滴水的龙头', '一天漏掉多少水', '节约用水', '从我做起'], '#2f8f6b') }
  }, [])
  const geo = useMemo(() => {
    const H = HALL
    return {
      hall: mergeParts(hallParts()), city: mergeParts(cityParts()), expo: mergeParts(expoParts()),
      floor: slab(H.x0, H.x1, 0, 0.12, H.z0, H.z1, 3.6), back: slab(H.x0, H.x1, 0, H.h, H.z0 - 0.6, H.z0, 12),
      ends: mergeGeometries([slab(H.x0 - 0.6, H.x0, 0, H.h, H.z0, H.z1, 12), slab(H.x1, H.x1 + 0.6, 0, H.h, H.z0, H.z1, 12)]), ceil: slab(H.x0, H.x1, H.h, H.h + 0.6, H.z0, H.z1, 12),
      top: slab(H.x0 + 2, H.x1 - 2, TOP - 0.3, TOP, BENCH.z0, BENCH.z1, 3), bottles: bottles(),
    }
  }, [])
  return (
    <group>
      <hemisphereLight args={['#dfe7f0', '#7d7466', indoor ? 0.5 : 0.3]} />
      <Key x={x} on={indoor} />
      {/* 地面：草地上铺一大片混凝土厂区，几条深色的路 */}
      <mesh rotation-x={-Math.PI / 2} position={[RIVER.bank + 800, -0.05, -60]} receiveShadow><planeGeometry args={[1600, 1400]} /><meshStandardMaterial map={tex.grass} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[130, 0.01, -45]} receiveShadow><planeGeometry args={[720, 200]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#b8b6ad" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[130, 0.03, 14]} receiveShadow><planeGeometry args={[720, 12]} /><meshStandardMaterial color="#4a4d50" roughness={0.9} /></mesh>
      {[0, 1].map(i => <mesh key={i} rotation-x={-Math.PI / 2} position={[130, 0.04, 8.4 + i * 11.2]}><planeGeometry args={[720, 0.5]} /><meshStandardMaterial color="#e9e6dc" roughness={0.8} /></mesh>)}
      <River />
      <Plant station={station} chlorine={chlorine} />
      {/* 化验室 */}
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial color="#eceeeb" roughness={0.9} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, 3.2, HALL.z0 + 0.02]}><planeGeometry args={[HALL.x1 - HALL.x0, 6.4]} /><meshStandardMaterial color="#bccacd" roughness={0.7} /></mesh>
      <mesh geometry={geo.ends} receiveShadow><meshStandardMaterial color="#e6e6e1" roughness={0.9} /></mesh>
      <mesh geometry={geo.ceil}><meshStandardMaterial color="#dadad5" roughness={0.9} /></mesh>
      {[-190, -172, -154, -136, -118].flatMap(cx => [-12, -4].map(cz => <mesh key={`${cx}${cz}`} position={[cx, HALL.h - 0.05, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[7, 3.6]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.48} clearcoat={0.3} clearcoatRoughness={0.45} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, TOP - 0.15, BENCH.z1]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.15, 0.15, HALL.x1 - HALL.x0 - 4, 16]} /><meshPhysicalMaterial color="#606a6e" roughness={0.4} clearcoat={0.4} /></mesh>
      <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.88} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.h - 1.6, HALL.z1 + 0.02]}><planeGeometry args={[22, 2.4]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <mesh position={[ST.l3 + 2, TOP + 7.2, HALL.z0 + 0.05]}><planeGeometry args={[4.2, 5.6]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
      <mesh position={[ST.l6, TOP + 7.6, HALL.z0 + 0.05]}><planeGeometry args={[14, 3.5]} /><meshStandardMaterial map={tex.flow} roughness={0.8} /></mesh>
      {/* 城市、围墙、大门、展台 */}
      <mesh geometry={geo.city} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh>
      <mesh position={[-70, 14.5, 57.4]}><planeGeometry args={[33, 2.2]} /><meshStandardMaterial map={tex.gate} roughness={0.6} /></mesh>
      <mesh geometry={geo.expo} castShadow receiveShadow><Painted rough={0.8} metal={0.05} /></mesh>
      <mesh position={[SITE.expo.x + 8.5, 6.6, SITE.expo.z - 1.3]}><planeGeometry args={[4.1, 5.5]} /><meshStandardMaterial map={tex.expo} roughness={0.8} /></mesh>
    </group>
  )
}
