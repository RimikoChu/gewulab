// 电解和金属防护实验室的大场景：一座滨海的氯碱厂。
// 最西边是厂化验室（敞着门脸的一间厅）：靠后墙一条长化验台，第 1、2、3、6 课各占一格；
// 往东隔一条厂内道路依次是氯碱车间（离子膜电解槽）、电镀车间（镀槽线）、电冶金车间（熔盐电解槽），最东头是厂外码头（钢管桩）。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 m 画成 M 个单位。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Painted, mergeParts, useConcrete, type Label, type Part } from '@/lab-kit'
import { benchTex, buildingTex, grassTex, makeBoard, makeSign, rng, tileTex, wallTileTex } from './mats'
import { CELL, PIER, POT, Plant, TANK } from './plant'

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
export const HALL = { x0: -134, x1: -40, z0: -18, z1: 4, h: 22 }
export const BENCH = { x0: -130, z0: -17.4, z1: -12.9 }
export const BZ = -15
/** 化验台上各格的中心（x） */
export const ST = { l1: -116, l2: -98, l3: -78, l6: -58 }
const PILLARS = [-125, -107, -88, -68, -48]

type Kind = 'lab' | 'shop' | 'sea'
const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], kind: Kind, fog: [number, number] = [160, 1300]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, kind, fog })
/** 各课的机位：每一处的远近和角度都不一样，主角放在画面中间 */
export const SPOT = {
  l1: spot(ST.l1 + 0.3, TOP + 1.2, BZ + 0.5, 3.3, 2.5, [-0.2, 0.16], 'lab'),
  l2: spot(ST.l2 - 0.15, TOP + 1.42, BZ + 0.6, 5.0, 2.95, [0.12, 0.2], 'lab'),
  l3: spot(ST.l3 + 0.15, TOP + 1.5, BZ + 0.5, 5.3, 2.95, [-0.1, 0.13], 'lab'),
  l6: spot(ST.l6 + 0.32, TOP + 1.05, BZ + 0.6, 3.75, 2.05, [0.16, 0.14], 'lab'),
  l4: spot(CELL.x - 1.5, CELL.y0 + CELL.h / 2 + 1.5, CELL.z, 33, 21, [-0.3, 0.14], 'shop'),
  l4m: spot(CELL.x - 1, CELL.y0 + 11.6, CELL.z, 33, 32, [-0.22, 0.1], 'shop'),
  l5: spot(TANK.x - 1, 9.5, TANK.z, 31, 21, [-0.34, 0.2], 'shop'),
  l7: spot(PIER.x - 2, -8.4, PIER.z, 50, 34, [0.16, 0.13], 'sea', [300, 1600]),
  x: spot(POT.x - 5.2, 9.5, POT.z, 36, 20, [0.2, 0.17], 'shop'),
  q: spot(57, 8.5, -40, 40, 22, [0.3, 0.14], 'shop'),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：工作灯跟到哪、这一处是室内还是车间 */
export interface Want { at: V3; kind: Kind }

/** 这一课的舞台：选一处机位。化验室里点亮工作灯、换成摄影棚式的环境光；车间和码头是傍晚的斜阳，车间里另有一盏工作灯 */
export function Place({ at, labels, children = null }: { at: SpotKey; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ at: v.target.toArray() as V3, kind: v.kind }), [v])
  const indoor = v.kind === 'lab'
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={indoor ? 1.0 : 2.0} env={indoor ? 0.6 : 0.7} studio={indoor} fog={v.fog} bloom={indoor ? 0.5 : 0.22} world={want}>{children}</LabStage>
}

// ---------- 化验室 ----------
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH
  for (const x of PILLARS) { P.push({ p: [x, H.h / 2, H.z0 + 0.7], s: [1.4, H.h, 1.4], c: '#e4e4df' }, { p: [x, 0.5, H.z0 + 0.7], s: [1.5, 1, 1.5], c: '#5b6063' }) }
  for (const x of [H.x0 + 3, -87, H.x1 - 3]) P.push({ p: [x, H.h / 2, H.z1 - 0.8], s: [1.6, H.h, 1.6], c: '#e4e4df' })
  P.push({ p: [(H.x0 + H.x1) / 2, H.h - 1.6, H.z1 - 0.8], s: [H.x1 - H.x0, 3.2, 1.6], c: '#d9d8d1' })
  // 化验台：一条长的柜体，柜门一扇扇，每扇一只拉手；台面下一道深色的踢脚
  for (let x = B.x0; x < H.x1 - 2; x += 4.5) {
    P.push({ p: [x + 2.25, (TOP - 0.4) / 2 + 0.3, B.z1 - 0.12], s: [4.3, TOP - 0.9, 0.2], c: '#d7dad8' })
    P.push({ p: [x + 2.25, TOP - 1.2, B.z1 + 0.04], s: [1.3, 0.16, 0.16], c: '#7b8085' })
  }
  P.push({ p: [(B.x0 + H.x1 - 2) / 2, 0.15, (B.z0 + B.z1) / 2], s: [H.x1 - 2 - B.x0, 0.3, B.z1 - B.z0 - 0.4], c: '#3d4146' })
  // 台面后面的挡板和设备带（插座）
  P.push({ p: [(B.x0 + H.x1 - 2) / 2, TOP + 0.12, B.z0 + 0.12], s: [H.x1 - 2 - B.x0, 0.24, 0.24], c: '#c9ccca' })
  for (const x of Object.values(ST)) for (const s of [-1, 1]) P.push({ p: [x + s * 7.2, TOP + 1.1, B.z0 + 0.3], s: [0.9, 0.6, 0.12], c: '#e8e6df' })
  // 墙上的试剂架：两层搁板，放在两格之间
  for (const x of [(ST.l1 + ST.l2) / 2, (ST.l3 + ST.l6) / 2 + 1]) for (const y of [TOP + 6.2, TOP + 8.8]) P.push({ p: [x, y, H.z0 + 0.9], s: [8, 0.25, 1.6], c: '#b48a5a' })
  // 两格之间的水槽和鹅颈龙头
  for (const x of [(ST.l2 + ST.l3) / 2]) { P.push({ p: [x, TOP + 0.01, (B.z0 + B.z1) / 2 - 0.8], s: [2.2, 0.06, 1.6], c: '#9aa0a4' }); P.push({ p: [x, TOP + 1.3, B.z0 + 0.4], s: [0.12, 2.6, 0.12], c: '#c6cbce', cyl: true }) }
  return P
}
/** 墙上试剂架上的瓶子：棕色的、透明的 */
function bottles() {
  const gs: THREE.BufferGeometry[] = [], r = rng(17)
  for (const [x0, y] of [(ST.l1 + ST.l2) / 2, (ST.l3 + ST.l6) / 2 + 1].flatMap(x => [[x, TOP + 6.33], [x, TOP + 8.93]])) for (let i = 0; i < 7; i++) {
    if (r() < 0.16) continue
    const rad = 0.24 + r() * 0.14, h = 0.9 + r() * 0.7, x = x0 - 3.3 + i * 1.1, z = HALL.z0 + 0.9 + (r() - 0.5) * 0.5
    const body = new THREE.CylinderGeometry(rad, rad, h, 14); body.translate(x, y + h / 2, z)
    const neck = new THREE.CylinderGeometry(rad * 0.45, rad * 0.55, h * 0.22, 12); neck.translate(x, y + h + h * 0.11, z)
    const cap = new THREE.CylinderGeometry(rad * 0.5, rad * 0.5, h * 0.12, 12); cap.translate(x, y + h * 1.28, z)
    const col = new THREE.Color(r() < 0.55 ? '#5a3214' : '#c7d6d8'), capC = new THREE.Color(r() < 0.5 ? '#1f2124' : '#d6d4cc')
    for (const [g, c] of [[body, col], [neck, col], [cap, capC]] as [THREE.BufferGeometry, THREE.Color][]) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) { a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.toNonIndexed()) }
  }
  return mergeGeometries(gs)
}

/** 化验楼的外观：一层是敞着门脸的化验室，上面再盖两层（外墙一排排窗），楼顶一圈女儿墙和几台空调外机。只在室外的机位看得见 */
function LabBuilding() {
  const H = HALL, Y1 = H.h + 0.6, Y2 = Y1 + 30, x0 = H.x0 - 0.6, x1 = H.x1 + 0.6, z0 = H.z0 - 0.6, z1 = H.z1
  const tex = useMemo(() => {
    const mk = (rx: number, ry: number, oy = 0) => { const t = buildingTex().clone(); t.repeat.set(rx, ry); t.offset.y = oy; t.needsUpdate = true; return t }
    return { front: mk((x1 - x0) / 18, 2), side: mk((z1 - z0) / 18, 2), low: mk((z1 - z0) / 18, H.h / 15, 0.05), name: makeSign(['质检中心'], '#1d5c56', '#ffffff', 768, 128) }
  }, [x0, x1, z0, z1, H.h])
  const geo = useMemo(() => {
    const P: Part[] = []
    P.push({ p: [(x0 + x1) / 2, Y2 + 0.9, z1 - 0.3], s: [x1 - x0, 1.8, 0.6], c: '#d8d2c6' }, { p: [(x0 + x1) / 2, Y2 + 0.9, z0 + 0.3], s: [x1 - x0, 1.8, 0.6], c: '#d8d2c6' })
    for (const x of [x0 + 0.3, x1 - 0.3]) P.push({ p: [x, Y2 + 0.9, (z0 + z1) / 2], s: [0.6, 1.8, z1 - z0], c: '#d8d2c6' })
    for (let i = 0; i < 5; i++) P.push({ p: [x0 + 14 + i * 9, Y2 + 1.2, z0 + 6], s: [5, 2.4, 3], c: '#e9e9e4' }, { p: [x0 + 14 + i * 9, Y2 + 2.45, z0 + 6], s: [4.6, 0.1, 2.6], c: '#9aa0a3' })
    return mergeParts(P)
  }, [x0, x1, z0, z1, Y2])
  return <group>
    <mesh geometry={useMemo(() => slab(x0, x1, Y1, Y2, z0, z1, 6), [x0, x1, Y1, Y2, z0, z1])} castShadow receiveShadow><meshStandardMaterial color="#e4ded2" roughness={0.85} /></mesh>
    <mesh position={[(x0 + x1) / 2, (Y1 + Y2) / 2, z1 + 0.02]}><planeGeometry args={[x1 - x0, Y2 - Y1]} /><meshStandardMaterial map={tex.front} roughness={0.8} /></mesh>
    {[x0 - 0.02, x1 + 0.02].map((x, i) => <group key={i}>
      <mesh position={[x, (Y1 + Y2) / 2, (z0 + z1) / 2]} rotation-y={i ? Math.PI / 2 : -Math.PI / 2}><planeGeometry args={[z1 - z0, Y2 - Y1]} /><meshStandardMaterial map={tex.side} roughness={0.8} /></mesh>
      <mesh position={[x, H.h / 2, (z0 + z1) / 2]} rotation-y={i ? Math.PI / 2 : -Math.PI / 2}><planeGeometry args={[z1 - z0, H.h]} /><meshStandardMaterial map={tex.low} roughness={0.8} /></mesh>
    </group>)}
    <mesh position={[(x0 + x1) / 2, Y1 + 2.2, z1 + 0.05]}><planeGeometry args={[22, 3.2]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
  </group>
}

/** 工作灯：跟着当前这一课从前上方打下来。化验室里是主光；车间里补亮棚子底下的主体；码头不开 */
function Key({ at, kind }: Want) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(new THREE.Vector3(...at))
  const aim = useMemo(() => new THREE.Object3D(), []), goal = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current.lerp(goal.set(...at), 1 - Math.exp(-dt / 0.45))
    const c = cur.current
    if (kind === 'lab') { l.position.set(c.x - 4, HALL.h - 2, BZ + 14); aim.position.set(c.x, TOP + 1, BZ) }
    else { l.position.set(c.x - 10, c.y + 22, c.z + 30); aim.position.copy(c) }
    aim.updateMatrixWorld()
    const want = kind === 'lab' ? 170 : kind === 'shop' ? 420 : 0
    l.intensity += (want - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.9} intensity={0} distance={90} decay={1.6} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

export function World({ at = SPOT.l1.target.toArray() as V3, kind = 'lab' }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(34, 22)
  const tex = useMemo(() => {
    const grass = grassTex().clone(); grass.repeat.set(70, 50); grass.needsUpdate = true
    const tile = tileTex().clone(); tile.repeat.set(1, 1); tile.needsUpdate = true
    const splash = wallTileTex().clone(); splash.repeat.set((HALL.x1 - BENCH.x0 - 2) / 0.6 / 4, 4.2 / 0.6 / 4); splash.needsUpdate = true
    return { grass, tile, splash, bench: benchTex(), name: makeSign(['化验室'], '#1d5c56', '#ffffff', 512, 128),
      rules: makeBoard('化验室规则', ['通电前检查线路和电极', '有氯气放出的实验注意通风', '铜盐废液倒进重金属废液桶', '用过的电极冲洗干净', '离开前切断电源'], '#1d5c56') }
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
  const LAND = PIER.quay          // 陆地到码头岸壁为止，再往东是海
  return (
    <group>
      <hemisphereLight args={['#dfe7f0', '#7d7466', kind === 'lab' ? 0.5 : 0.32]} />
      <Key at={at} kind={kind} />
      {/* 地面：草地上铺一大片混凝土厂区，前面一条深色的厂内道路 */}
      <mesh rotation-x={-Math.PI / 2} position={[LAND - 700, -0.05, -160]} receiveShadow><planeGeometry args={[1400, 900]} /><meshStandardMaterial map={tex.grass} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(LAND - 160) / 2, 0.01, -44]} receiveShadow><planeGeometry args={[LAND + 160, 150]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#b8b6ad" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(LAND - 160) / 2, 0.03, 38]} receiveShadow><planeGeometry args={[LAND + 160, 14]} /><meshStandardMaterial color="#4a4d50" roughness={0.9} /></mesh>
      {[0, 1].map(i => <mesh key={i} rotation-x={-Math.PI / 2} position={[(LAND - 160) / 2, 0.04, 31.4 + i * 13.2]}><planeGeometry args={[LAND + 160, 0.5]} /><meshStandardMaterial color="#e9e6dc" roughness={0.8} /></mesh>)}
      <mesh rotation-x={-Math.PI / 2} position={[-26, 0.04, -20]}><planeGeometry args={[12, 100]} /><meshStandardMaterial color="#4a4d50" roughness={0.9} /></mesh>
      <Plant />
      {/* 化验室 */}
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial color="#eceeeb" roughness={0.9} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, 3.2, HALL.z0 + 0.02]}><planeGeometry args={[HALL.x1 - HALL.x0, 6.4]} /><meshStandardMaterial color="#b9cbc8" roughness={0.7} /></mesh>
      <mesh geometry={geo.ends} receiveShadow><meshStandardMaterial color="#e6e6e1" roughness={0.9} /></mesh>
      <mesh geometry={geo.ceil}><meshStandardMaterial color="#dadad5" roughness={0.9} /></mesh>
      {Object.values(ST).flatMap(cx => [-12, -4].map(cz => <mesh key={`${cx}${cz}`} position={[cx, HALL.h - 0.05, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[7, 3.6]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.48} clearcoat={0.3} clearcoatRoughness={0.45} /></mesh>
      <mesh position={[(BENCH.x0 + HALL.x1 - 2) / 2, TOP - 0.15, BENCH.z1]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.15, 0.15, HALL.x1 - 2 - BENCH.x0, 16]} /><meshPhysicalMaterial color="#606a6e" roughness={0.4} clearcoat={0.4} /></mesh>
      <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.88} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.h - 1.6, HALL.z1 + 0.02]}><planeGeometry args={[14, 2.4]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <mesh position={[(ST.l2 + ST.l3) / 2, TOP + 8.4, HALL.z0 + 0.05]}><planeGeometry args={[4.2, 5.6]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
      <mesh geometry={geo.splash} position={[(BENCH.x0 + HALL.x1 - 2) / 2, TOP + 2.1, BENCH.z0 + 0.02]} receiveShadow><meshStandardMaterial map={tex.splash} roughness={0.25} /></mesh>
      <LabBuilding />
    </group>
  )
}
