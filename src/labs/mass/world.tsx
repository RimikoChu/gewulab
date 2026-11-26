// 质量守恒定律实验室的大场景：一座纯碱化工厂。
// 最西边是化验室（敞着门脸的一间厅，靠后墙一条长化验台，各课占一格）；往东是反应车间（钢结构厂房，前墙剖开，燃烧炉、反应釜、管廊）；
// 车间东头接着中控室（大屏、操作台、展台）；厂房外再往东是石灰窑（两座竖窑、上料斜桥、地磅）和碳化塔。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 m 画成 M 个单位。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Painted, mergeParts, useConcrete, type Label, type Part } from '@/lab-kit'
import { Plant } from './plant'
import { benchTex, facadeTex, grassTex, makeBoard, makeSign, rng, tileTex, wallTileTex } from './mats'

import { BENCH, BIN, BZ, CR, FOOT, FURN, HALL, KILN, M, PH, PIT, SCALE, SHOW, ST, TOP, type V3 } from './site'
export { BENCH, BIN, BZ, CR, FOOT, FURN, HALL, KILN, M, PH, PIT, SCALE, SHOW, ST, TOP, type V3 }

/** 一块板，贴图按它在世界里的位置铺，k 是贴图一格多大 */
export function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 6) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}

const PILLARS = [-147, -129, -111, -93, -75, -57]

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], kind: Want['kind'], fog: [number, number] = [160, 1200]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, kind, fog })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(ST.l1 - 0.15, TOP + 1.1, BZ + 0.15, 3.3, 2.4, [-0.2, 0.1], 'lab'),
  l2: spot(ST.l2 - 0.15, TOP + 1.0, BZ + 0.15, 3.35, 2.3, [0.2, 0.11], 'lab'),
  l2b: spot(ST.l2 - 1.1, TOP + 1.3, BZ + 0.05, 1.45, 0.95, [0.3, 0.2], 'lab'),
  l3: spot(ST.l3 - 0.15, TOP + 1.05, BZ + 0.15, 3.4, 2.4, [-0.12, 0.1], 'lab'),
  l4: spot(ST.l4 + 0.05, TOP + 1.25, BZ + 0.3, 3.9, 2.75, [0.12, 0.1], 'lab'),
  l5: spot(FURN.x + 5, 17, FURN.z + 2, 58, 38, [-0.16, 0.1], 'hall'),
  l6: spot(SHOW.x, TOP + 4.5, SHOW.z + 0.6, 17, 8.6, [0.0, 0.1], 'ctrl'),
  l7: spot(SCALE.x + 30, 30, -30, 120, 74, [-0.24, 0.13], 'out'),
  x1: spot(ST.lx - 0.15, TOP + 0.95, BZ + 0.15, 3.35, 2.2, [0.22, 0.11], 'lab'),
  x2: spot(KILN.x + 24, 38, -50, 175, 100, [-0.22, 0.22], 'out', [500, 2400]),
  q: spot(95, 16, -30, 470, 110, [-0.12, 0.3], 'out', [900, 3000]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：室内工作灯跟到哪（化验室的格、车间、中控室） */
export interface Want { x: number; kind: 'lab' | 'hall' | 'ctrl' | 'out' }

/** 这一课的舞台：选一处机位。室内点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳 */
export function Place({ at, labels, children = null }: { at: SpotKey; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, kind: v.kind }), [v])
  const indoor = v.kind !== 'out'
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={indoor ? 1.0 : 2.4} env={indoor ? 0.6 : 0.9} studio={indoor} sky backdrop="#0b1018" fog={v.fog} bloom={0.55} world={want}>{children}</LabStage>
}

// ---------- 化验室 ----------
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH
  for (const x of PILLARS) { P.push({ p: [x, H.h / 2, H.z0 + 0.7], s: [1.4, H.h, 1.4], c: '#e4e4df' }, { p: [x, 0.5, H.z0 + 0.7], s: [1.5, 1, 1.5], c: '#5b6063' }) }
  for (const x of [-147, -93, -57]) P.push({ p: [x, H.h / 2, H.z1 - 0.8], s: [1.6, H.h, 1.6], c: '#e4e4df' })
  P.push({ p: [(H.x0 + H.x1) / 2, H.h - 1.6, H.z1 - 0.8], s: [H.x1 - H.x0, 3.2, 1.6], c: '#d9d8d1' })
  // 化验台：一条长的柜体，柜门一扇扇，每扇一只拉手；台下一道踢脚
  for (let x = H.x0 + 2; x < H.x1 - 2; x += 4.5) {
    P.push({ p: [x + 2.25, (TOP - 0.4) / 2 + 0.3, B.z1 - 0.12], s: [4.3, TOP - 0.9, 0.2], c: '#d7dad8' })
    P.push({ p: [x + 2.25, TOP - 1.2, B.z1 + 0.04], s: [1.3, 0.16, 0.16], c: '#7b8085' })
  }
  P.push({ p: [(H.x0 + H.x1) / 2, 0.15, (B.z0 + B.z1) / 2], s: [H.x1 - H.x0 - 4, 0.3, B.z1 - B.z0 - 0.4], c: '#3d4146' })
  P.push({ p: [(H.x0 + H.x1) / 2, TOP + 0.12, B.z0 + 0.12], s: [H.x1 - H.x0 - 4, 0.24, 0.24], c: '#c9ccca' })
  for (const x of Object.values(ST)) for (const s of [-1, 1]) P.push({ p: [x + s * 6.2, TOP + 1.1, B.z0 + 0.3], s: [0.9, 0.6, 0.12], c: '#e8e6df' })
  // 墙上的试剂架：两层搁板
  for (const x of [ST.l1, ST.l3, ST.lx]) for (const y of [TOP + 5.4, TOP + 8.2]) P.push({ p: [x, y, H.z0 + 0.9], s: [11, 0.25, 1.6], c: '#b48a5a' })
  // 两格之间的水槽和鹅颈龙头
  for (const x of [ST.l2 + 8, ST.l4 + 8]) { P.push({ p: [x, TOP + 0.01, (B.z0 + B.z1) / 2 - 0.8], s: [2.2, 0.06, 1.6], c: '#9aa0a4' }); P.push({ p: [x, TOP + 1.3, B.z0 + 0.4], s: [0.12, 2.6, 0.12], c: '#c6cbce', cyl: true }) }
  return P
}
/** 墙上试剂架上的瓶子：棕色的、透明的 */
function bottles() {
  const gs: THREE.BufferGeometry[] = [], r = rng(17)
  for (const x0 of [ST.l1, ST.l3, ST.lx]) for (const y of [TOP + 5.53, TOP + 8.33]) for (let i = 0; i < 10; i++) {
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
/** 室内的工作灯：跟着当前这一课从前上方打下来 */
function Key({ x, kind }: { x: number; kind: Want['kind'] }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    const lab = kind === 'lab', ctrl = kind === 'ctrl'
    if (lab) { l.position.set(cur.current - 4, HALL.h - 2, BZ + 14); aim.position.set(cur.current, TOP + 1, BZ) }
    else if (ctrl) { l.position.set(cur.current - 6, CR.h - 1, SHOW.z + 14); aim.position.set(cur.current, TOP + 2, SHOW.z) }
    else { l.position.set(cur.current - 10, 48, 10); aim.position.set(cur.current, 8, FURN.z) }
    aim.updateMatrixWorld()
    l.angle = lab ? 0.5 : ctrl ? 0.62 : 0.75; l.distance = lab ? 60 : ctrl ? 70 : 160
    l.intensity += ((kind === 'out' ? 0 : lab ? 160 : ctrl ? 260 : 900) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.9} intensity={0} distance={60} decay={1.6} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

/** 远处：厂区的围墙、一排树干 */
function farParts() {
  const P: Part[] = [], r = rng(77)
  for (let x = -250; x <= 360; x += 12) P.push({ p: [x, 4, -190], s: [1, 8, 1], c: '#b9b4a8' })
  P.push({ p: [55, 3.5, -190], s: [610, 7, 0.5], c: '#cfcabe' })
  for (let i = 0; i < 70; i++) { const x = -240 + i * 8.5 + r() * 4, z = -202 - r() * 10, h = 5 + r() * 4; P.push({ p: [x, h / 2, z], s: [0.6, h, 0.6], c: '#4e3d2c', cyl: true }) }
  return P
}
/** 远处的楼 */
function cityGeo() {
  const r = rng(77), gs: THREE.BufferGeometry[] = []
  for (let i = 0; i < 26; i++) { const w = 30 + r() * 30, h = 24 + r() * 50, x = -320 + i * 48, z = -400 - r() * 140; gs.push(slab(x - w / 2, x + w / 2, 0, h, z - 18, z + 18, 56)) }
  return mergeGeometries(gs)
}
/** 围墙外一排树的树冠 */
function crownGeo() {
  const r = rng(79), gs: THREE.BufferGeometry[] = [], c = new THREE.Color()
  for (let i = 0; i < 70; i++) {
    const x = -240 + i * 8.5, z = -203, h = 5 + r() * 4
    for (let k = 0; k < 4; k++) {
      const s = 2.4 + r() * 2.2, g = new THREE.IcosahedronGeometry(s, 1)
      const p = g.attributes.position; for (let j = 0; j < p.count; j++) { const f = 0.85 + r() * 0.3; p.setXYZ(j, p.getX(j) * f, p.getY(j) * f * 0.85, p.getZ(j) * f) }
      g.translate(x + (r() - 0.5) * 4, h + 2 + k * 1.6 + r() * 1.5, z + (r() - 0.5) * 4)
      c.setHSL(0.26 + r() * 0.05, 0.38 + r() * 0.12, 0.13 + k * 0.025 + r() * 0.04)
      const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let j = 0; j < n; j++) { a[j * 3] = c.r; a[j * 3 + 1] = c.g; a[j * 3 + 2] = c.b }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.index ? g.toNonIndexed() : g)
    }
  }
  return mergeGeometries(gs.map(g => { g.deleteAttribute('uv'); return g }))
}

export function World({ x = ST.l1, kind = 'lab' }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(30, 24)
  const tex = useMemo(() => {
    const grass = grassTex().clone(); grass.repeat.set(70, 70); grass.needsUpdate = true
    const tile = tileTex().clone(); tile.repeat.set(1, 1); tile.needsUpdate = true
    const splash = wallTileTex().clone(); splash.repeat.set((HALL.x1 - HALL.x0 - 4) / 0.6 / 4, 4.2 / 0.6 / 4); splash.needsUpdate = true
    return { grass, tile, splash, facade: facadeTex(), bench: benchTex(), name: makeSign(['质检化验室'], '#1f6f8a', '#ffffff', 768, 128),
      rules: makeBoard('天平使用规则', ['称量前先调节天平平衡', '左盘放物品，右盘放砝码', '砝码用镊子夹取', '化学药品不直接放在托盘上', '称量完毕砝码放回盒内'], '#1f6f8a') }
  }, [])
  const geo = useMemo(() => {
    const H = HALL
    return {
      hall: mergeParts(hallParts()), far: mergeParts(farParts()), city: cityGeo(), crowns: crownGeo(), splash: new THREE.PlaneGeometry(HALL.x1 - HALL.x0 - 4, 4.2),
      floor: slab(H.x0, H.x1, 0, 0.12, H.z0, H.z1, 3.6), back: slab(H.x0, H.x1, 0, H.h, H.z0 - 0.6, H.z0, 12),
      ends: mergeGeometries([slab(H.x0 - 0.6, H.x0, 0, H.h, H.z0, H.z1, 12), slab(H.x1, H.x1 + 0.6, 0, H.h, H.z0, H.z1, 12)]), ceil: slab(H.x0, H.x1, H.h, H.h + 0.6, H.z0, H.z1, 12),
      top: slab(H.x0 + 2, H.x1 - 2, TOP - 0.3, TOP, BENCH.z0, BENCH.z1, 3), bottles: bottles(),
    }
  }, [])
  return (
    <group>
      <hemisphereLight args={['#dfe7f0', '#7d7466', kind === 'out' ? 0.3 : 0.5]} />
      <Key x={x} kind={kind} />
      {/* 地面：草地上铺一大片混凝土厂区，一条深色的路 */}
      <mesh rotation-x={-Math.PI / 2} position={[40, -0.05, -60]} receiveShadow><planeGeometry args={[1900, 1400]} /><meshStandardMaterial map={tex.grass} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[60, 0.01, -70]} receiveShadow><planeGeometry args={[480, 240]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#b8b6ad" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[60, 0.03, 22]} receiveShadow><planeGeometry args={[480, 12]} /><meshStandardMaterial color="#4a4d50" roughness={0.9} /></mesh>
      {[0, 1].map(i => <mesh key={i} rotation-x={-Math.PI / 2} position={[60, 0.04, 16.4 + i * 11.2]}><planeGeometry args={[480, 0.5]} /><meshStandardMaterial color="#e9e6dc" roughness={0.8} /></mesh>)}
      <Plant />
      {/* 化验室 */}
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial color="#eceeeb" roughness={0.9} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, 3.2, HALL.z0 + 0.02]}><planeGeometry args={[HALL.x1 - HALL.x0, 6.4]} /><meshStandardMaterial color="#c3cdd1" roughness={0.7} /></mesh>
      <mesh geometry={geo.ends} receiveShadow><meshStandardMaterial color="#e6e6e1" roughness={0.9} /></mesh>
      <mesh geometry={geo.ceil}><meshStandardMaterial color="#dadad5" roughness={0.9} /></mesh>
      {Object.values(ST).flatMap(cx => [-12, -4].map(cz => <mesh key={`${cx}${cz}`} position={[cx, HALL.h - 0.05, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[7, 3.6]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.48} clearcoat={0.3} clearcoatRoughness={0.45} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, TOP - 0.15, BENCH.z1]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.15, 0.15, HALL.x1 - HALL.x0 - 4, 16]} /><meshPhysicalMaterial color="#606a6e" roughness={0.4} clearcoat={0.4} /></mesh>
      <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.88} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.h - 1.6, HALL.z1 + 0.02]}><planeGeometry args={[22, 2.4]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <mesh position={[ST.l2, TOP + 7.2, HALL.z0 + 0.05]}><planeGeometry args={[4.2, 5.6]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
      <mesh geometry={geo.far} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh>
      <mesh geometry={geo.city} receiveShadow><meshStandardMaterial map={tex.facade} roughness={0.8} /></mesh>
      <mesh geometry={geo.crowns} castShadow><meshStandardMaterial vertexColors roughness={0.95} flatShading /></mesh>
      <mesh geometry={geo.splash} position={[(HALL.x0 + HALL.x1) / 2, TOP + 2.1, BENCH.z0 + 0.02]} receiveShadow><meshStandardMaterial map={tex.splash} roughness={0.25} /></mesh>
    </group>
  )
}
