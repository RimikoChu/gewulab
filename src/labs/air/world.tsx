// 空气和氧气实验室的大场景：一座连续的空气分离厂。沿厂区主路从西到东：厂门和质检站（遮阳棚下一张钢台）、化验室、制氧车间
//（两间敞着门脸的厅，靠后墙各一条长台，各课占一格）、空压机房、冷箱和剖开的精馏塔、储罐区和灌装台，最东头是厂界的采样杆。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 m 画成 M 个单位。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Painted, mergeParts, useConcrete, type Label, type Part } from '@/lab-kit'
import { Plant } from './plant'
import { benchTex, epoxyTex, grassTex, makeBoard, makeSign, rng, tileTex, wallTileTex } from './mats'

export const M = 6, TOP = 0.85 * M      // 1 m 在画面里多长；台面的高度
export type V3 = [number, number, number]

/** 一块板，贴图按它在世界里的位置铺，k 是贴图一格多大 */
export function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 6) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}

/** 两间厅共用的进深和层高；长台的前后沿；器材摆在 z = BZ 这条线上 */
export const HALL = { z0: -18, z1: 4, h: 22 }
export const BENCH = { z0: -17.4, z1: -12.9 }
export const BZ = -15
/** 化验室和制氧车间各自的 x 范围、柱子 */
const LAB = { x0: -122, x1: -40, pillars: [-120, -98, -78, -58, -42], name: '化验室' }
const SHOP = { x0: -34, x1: 34, pillars: [-32, 0, 32], name: '制氧车间' }
/** 各课在长台上的位置（x）；质检站钢台、厂界采样杆、精馏塔、灌装台的位置 */
export const ST = { l2: -109, l3: -88, l4: -68, x1: -50, l5: -17, l6: 16, gate: -152, pole: 236, tower: 100, fill: 168 }
/** 质检站的钢台：台面中心 */
export const KIOSK = { x: ST.gate, z: -4 }
/** 精馏塔：塔心、塔半径、下段和上段的起止高度 */
export const TOWER = { x: ST.tower, z: -24, r: 7.4, low: [9, 25] as [number, number], up: [28, 50] as [number, number] }

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], kind: 'lab' | 'out', fog: [number, number] = [160, 1200]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, kind, fog })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(KIOSK.x + 0.1, TOP + 2.15, KIOSK.z, 4.2, 4.7, [-0.3, 0.19], 'lab'),
  l2: spot(ST.l2 - 0.15, TOP + 0.8, BZ + 0.3, 4.6, 1.9, [0.1, 0.3], 'lab'),
  l3: spot(ST.l3 - 0.42, TOP + 0.62, BZ + 0.2, 2.3, 1.5, [0.22, 0.26], 'lab'),
  l4: spot(ST.l4, TOP + 4.05, BZ - 1.6, 10.2, 5.0, [0, 0.06], 'lab'),
  l5: spot(ST.l5, TOP + 1.15, BZ - 0.2, 4.9, 3.0, [-0.26, 0.4], 'lab'),
  l6: spot(ST.l6 + 0.1, TOP + 1.45, BZ + 0.2, 5.8, 2.0, [0.12, 0.47], 'lab'),
  l7: spot(TOWER.x + 5.5, 29, TOWER.z, 56, 58, [-0.08, 0.07], 'out'),
  x1: spot(ST.x1 + 0.18, TOP + 0.42, BZ + 0.1, 3.3, 1.4, [-0.2, 0.34], 'lab'),
  x2: spot(ST.fill + 2.4, 5.4, 3.4, 13, 9.5, [0.16, 0.1], 'out'),
  x3a: spot(KIOSK.x - 14, 7, KIOSK.z + 5, 13, 13.5, [0.3, 0.13], 'out'),
  x3b: spot(ST.pole, 7, 6, 13, 13.5, [-0.34, 0.13], 'out'),
  q: spot(TOWER.x + 28, 24, -24, 128, 62, [-0.26, 0.09], 'out', [260, 1500]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：室内工作灯跟到哪 */
export interface Want { x: number; z: number; kind: 'lab' | 'out' }

/** 这一课的舞台：选一处机位。厅里点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳 */
export function Place({ at, labels, children = null, bloom = 0.55 }: { at: SpotKey; labels: Label[]; children?: ReactNode; bloom?: number }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, z: v.target.z < -10 ? BZ : v.target.z, kind: v.kind }), [v])
  const indoor = v.kind === 'lab'
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={indoor ? 1.0 : 2.3} env={indoor ? 0.6 : 0.9} studio={indoor} fog={v.fog} bloom={bloom} world={want}>{children}</LabStage>
}

// ---------- 两间厅 ----------
type Hall = typeof LAB
function hallParts(H: Hall, shop: boolean) {
  const P: Part[] = [], B = BENCH, L = H.x1 - H.x0, cx = (H.x0 + H.x1) / 2
  const col = shop ? '#d9dde0' : '#e4e4df'
  for (const x of H.pillars) P.push({ p: [x, HALL.h / 2, HALL.z0 + 0.7], s: [1.4, HALL.h, 1.4], c: col }, { p: [x, 0.5, HALL.z0 + 0.7], s: [1.5, 1, 1.5], c: '#5b6063' })
  for (const x of [H.pillars[0], H.pillars[H.pillars.length - 1]]) P.push({ p: [x, HALL.h / 2, HALL.z1 - 0.8], s: [1.6, HALL.h, 1.6], c: col })
  P.push({ p: [cx, HALL.h - 1.6, HALL.z1 - 0.8], s: [L, 3.2, 1.6], c: shop ? '#3f6f9a' : '#d9d8d1' })
  // 长台：一条柜体，柜门一扇扇，每扇一只拉手；车间的柜体是深灰的钢柜
  for (let x = H.x0 + 2; x < H.x1 - 2.2; x += 4.5) {
    P.push({ p: [x + 2.25, (TOP - 0.4) / 2 + 0.3, B.z1 - 0.12], s: [4.3, TOP - 0.9, 0.2], c: shop ? '#6c7a86' : '#d7dad8' })
    P.push({ p: [x + 2.25, TOP - 1.2, B.z1 + 0.04], s: [1.3, 0.16, 0.16], c: shop ? '#4f5a63' : '#7b8085' })
  }
  P.push({ p: [cx, 0.15, (B.z0 + B.z1) / 2], s: [L - 4, 0.3, B.z1 - B.z0 - 0.4], c: '#3d4146' })
  P.push({ p: [cx, TOP + 0.12, B.z0 + 0.12], s: [L - 4, 0.24, 0.24], c: '#c9ccca' })
  // 后墙上一条设备带：隔一段一只插座
  for (let x = H.x0 + 6; x < H.x1 - 4; x += 9) P.push({ p: [x, TOP + 1.1, B.z0 + 0.3], s: [0.9, 0.6, 0.12], c: '#e8e6df' })
  // 车间：后墙高处一道管廊（两根管），每根柱子上一只管卡
  if (shop) {
    P.push({ p: [cx, 16.2, HALL.z0 + 1.3], s: [0.42, L - 2, 0.42], r: [0, 0, Math.PI / 2], c: '#3f7fb8', cyl: true }, { p: [cx, 17.4, HALL.z0 + 1.3], s: [0.3, L - 2, 0.3], r: [0, 0, Math.PI / 2], c: '#d8c23a', cyl: true })
    for (const x of H.pillars) P.push({ p: [x, 16.7, HALL.z0 + 1.5], s: [0.5, 2.4, 0.3], c: '#55595d' })
  }
  return P
}
/** 化验室墙上的试剂架和瓶子：棕色的、透明的 */
function shelfParts(xs: number[]) { return xs.flatMap(x => [TOP + 5.6, TOP + 8.4].map(y => ({ p: [x, y, HALL.z0 + 0.9], s: [9, 0.25, 1.6], c: '#b48a5a' }) as Part)) }
function bottles(xs: number[]) {
  const gs: THREE.BufferGeometry[] = [], r = rng(17)
  for (const x0 of xs) for (const y of [TOP + 5.73, TOP + 8.53]) for (let i = 0; i < 8; i++) {
    if (r() < 0.16) continue
    const rad = 0.24 + r() * 0.14, h = 0.9 + r() * 0.7, x = x0 - 3.8 + i * 1.05, z = HALL.z0 + 0.9 + (r() - 0.5) * 0.5
    const body = new THREE.CylinderGeometry(rad, rad, h, 14); body.translate(x, y + h / 2, z)
    const neck = new THREE.CylinderGeometry(rad * 0.45, rad * 0.55, h * 0.22, 12); neck.translate(x, y + h + h * 0.11, z)
    const cap = new THREE.CylinderGeometry(rad * 0.5, rad * 0.5, h * 0.12, 12); cap.translate(x, y + h * 1.28, z)
    const col = new THREE.Color(r() < 0.55 ? '#5a3214' : '#c7d6d8'), capC = new THREE.Color(r() < 0.5 ? '#1f2124' : '#d6d4cc')
    for (const [g, c] of [[body, col], [neck, col], [cap, capC]] as [THREE.BufferGeometry, THREE.Color][]) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) { a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.toNonIndexed()) }
  }
  return mergeGeometries(gs)
}
/** 室内的工作灯：跟着当前这一课从前上方打下来，只在厅里的课亮 */
function Key({ x, z, kind }: Want) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    if (kind === 'lab') cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 4, HALL.h - 2, z + 14); aim.position.set(cur.current, TOP + 1, z); aim.updateMatrixWorld()
    l.intensity += ((kind === 'lab' ? 170 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.9} intensity={0} distance={60} decay={1.6} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

function HallShell({ H, shop = false }: { H: Hall; shop?: boolean }) {
  const L = H.x1 - H.x0, cx = (H.x0 + H.x1) / 2
  const tex = useMemo(() => {
    const tile = (shop ? epoxyTex() : tileTex()).clone(); tile.needsUpdate = true
    const splash = wallTileTex().clone(); splash.repeat.set((L - 4) / 0.6 / 4, 4.2 / 0.6 / 4); splash.needsUpdate = true
    return { tile, splash, top: shop ? epoxyTex() : benchTex(), name: makeSign([H.name], shop ? '#2f5f8f' : '#1f6f7a', '#ffffff', 640, 128) }
  }, [H, L, shop])
  const geo = useMemo(() => ({
    parts: mergeParts(hallParts(H, shop)),
    floor: slab(H.x0, H.x1, 0, 0.12, HALL.z0, HALL.z1, 3.6), back: slab(H.x0, H.x1, 0, HALL.h, HALL.z0 - 0.6, HALL.z0, 12),
    ends: mergeGeometries([slab(H.x0 - 0.6, H.x0, 0, HALL.h, HALL.z0, HALL.z1, 12), slab(H.x1, H.x1 + 0.6, 0, HALL.h, HALL.z0, HALL.z1, 12)]), ceil: slab(H.x0 - 0.6, H.x1 + 0.6, HALL.h, HALL.h + 0.8, HALL.z0 - 0.6, HALL.z1 + 0.6, 12),
    top: slab(H.x0 + 2, H.x1 - 2, TOP - 0.3, TOP, BENCH.z0, BENCH.z1, 3),
  }), [H, shop])
  return <group>
    <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} color={shop ? '#8e9aa0' : '#ffffff'} roughness={0.4} /></mesh>
    <mesh geometry={geo.back} receiveShadow><meshStandardMaterial color={shop ? '#e3e6e6' : '#eceeeb'} roughness={0.9} /></mesh>
    <mesh position={[cx, 3.2, HALL.z0 + 0.02]}><planeGeometry args={[L, 6.4]} /><meshStandardMaterial color={shop ? '#9fb3c2' : '#c3cfc8'} roughness={0.7} /></mesh>
    <mesh geometry={geo.ends} receiveShadow><meshStandardMaterial color="#e6e6e1" roughness={0.9} /></mesh>
    <mesh geometry={geo.ceil} castShadow><meshStandardMaterial color="#dadad5" roughness={0.9} /></mesh>
    {H.pillars.slice(0, -1).flatMap((x, i) => [-12, -4].map(cz => <mesh key={`${x}${cz}`} position={[(x + H.pillars[i + 1]) / 2, HALL.h - 0.05, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[7, 3.6]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
    <mesh geometry={geo.parts} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
    <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.top} color={shop ? '#5d6468' : '#ffffff'} roughness={0.48} clearcoat={0.3} clearcoatRoughness={0.45} /></mesh>
    <mesh position={[cx, TOP - 0.15, BENCH.z1]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.15, 0.15, L - 4, 16]} /><meshPhysicalMaterial color="#606a6e" roughness={0.4} clearcoat={0.4} /></mesh>
    <mesh position={[cx, HALL.h - 1.6, HALL.z1 + 0.02]}><planeGeometry args={[16, 2.6]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
    <mesh position={[cx, TOP + 2.1, BENCH.z0 + 0.02]} receiveShadow><planeGeometry args={[L - 4, 4.2]} /><meshStandardMaterial map={tex.splash} roughness={0.25} /></mesh>
  </group>
}

/** 远处：厂区的围墙、一排树的树干 */
function farParts() {
  const P: Part[] = [], r = rng(77)
  for (let x = -250; x <= 300; x += 12) P.push({ p: [x, 4, -150], s: [1, 8, 1], c: '#b9b4a8' })
  P.push({ p: [25, 3.5, -150], s: [550, 7, 0.5], c: '#cfcabe' })
  for (let i = 0; i < 66; i++) { const x = -250 + i * 8.5 + r() * 4, z = -162 - r() * 10, h = 5 + r() * 4; P.push({ p: [x, h / 2, z], s: [0.6, h, 0.6], c: '#4e3d2c', cyl: true }) }
  return P
}
/** 围墙外一排树的树冠：每棵五六团大小不一的叶簇叠起来，细分两次，颜色深浅不一 */
function crownGeo() {
  const r = rng(79), gs: THREE.BufferGeometry[] = [], c = new THREE.Color()
  const tree = (x: number, z: number, h: number, k = 1) => {
    for (let j = 0; j < 5; j++) {
      const s = (2.2 + r() * 2.0) * k, g = new THREE.SphereGeometry(s, 14, 10)
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const f = 0.86 + 0.14 * Math.sin(p.getX(i) * 2.3 + j) * Math.cos(p.getZ(i) * 1.9 + p.getY(i)); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.85, p.getZ(i) * f) }
      const cy = h + 1.5 * k + j * 1.3 * k + r() * 1.2
      g.translate(x + (r() - 0.5) * 4 * k, cy, z + (r() - 0.5) * 4 * k); g.computeVertexNormals()
      c.setHSL(0.26 + r() * 0.05, 0.36 + r() * 0.12, 0.12 + j * 0.02 + r() * 0.04)
      const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const sh = 0.8 + 0.4 * Math.max(0, g.attributes.position.getY(i) - cy) / s; a[i * 3] = c.r * sh; a[i * 3 + 1] = c.g * sh; a[i * 3 + 2] = c.b * sh }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); gs.push(g.toNonIndexed())
    }
  }
  for (let i = 0; i < 66; i++) tree(-250 + i * 8.5, -163, 5 + r() * 4)
  for (const [x, z] of TREES) tree(x, z, 6, 0.9)
  return mergeGeometries(gs)
}
/** 厂区里近处的几棵树（厂界的绿化带、厂门旁） */
export const TREES: [number, number][] = [[250, -6], [258, 4], [247, -20], [262, -14], [-216, -22], [-222, -6]]

export function World({ x = ST.l2, z = BZ, kind = 'lab' }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(34, 22)
  const tex = useMemo(() => {
    const grass = grassTex().clone(); grass.repeat.set(70, 70); grass.needsUpdate = true
    return { grass, rules: makeBoard('化验室规则', ['进入化验室穿好实验服', '取用药品不直接用手', '氧气瓶远离明火和油脂', '酒精灯用灯帽盖灭', '实验后关好水电'], '#1f6f7a') }
  }, [])
  const geo = useMemo(() => ({
    far: mergeParts([...farParts(), ...TREES.map(([tx, tz]) => ({ p: [tx, 3.5, tz], s: [0.5, 7, 0.5], c: '#4e3d2c', cyl: true }) as Part)]), crowns: crownGeo(),
    shelves: mergeParts(shelfParts([ST.l2, ST.x1 - 1])), bottles: bottles([ST.l2, ST.x1 - 1]),
  }), [])
  return (
    <group>
      <hemisphereLight args={['#dfe7f0', '#7d7466', kind === 'out' ? 0.3 : 0.5]} />
      <Key x={x} z={z} kind={kind} />
      {/* 地面：草地上铺一大片混凝土厂区，一条深色的主路 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, -60]} receiveShadow><planeGeometry args={[1800, 1400]} /><meshStandardMaterial map={tex.grass} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[20, 0.01, -50]} receiveShadow><planeGeometry args={[500, 200]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#b8b6ad" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[20, 0.03, 26]} receiveShadow><planeGeometry args={[700, 13]} /><meshStandardMaterial color="#4a4d50" roughness={0.9} /></mesh>
      {[0, 1].map(i => <mesh key={i} rotation-x={-Math.PI / 2} position={[20, 0.04, 20 + i * 12]}><planeGeometry args={[700, 0.5]} /><meshStandardMaterial color="#e9e6dc" roughness={0.8} /></mesh>)}
      <HallShell H={LAB} />
      <HallShell H={SHOP} shop />
      <mesh geometry={geo.shelves} castShadow receiveShadow><Painted rough={0.7} metal={0} /></mesh>
      <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.88} /></mesh>
      <mesh position={[ST.l2 + 8, TOP + 7.2, HALL.z0 + 0.05]}><planeGeometry args={[4.2, 5.6]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
      <Plant />
      <mesh geometry={geo.far} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh>
      <mesh geometry={geo.crowns} castShadow><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
    </group>
  )
}
