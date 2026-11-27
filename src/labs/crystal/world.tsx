// 分子的形状和晶体实验室的大场景：一间晶体结构实验室。深色地坪；北墙一排带灯的矿物标本柜；东墙一台 X 射线衍射仪；西墙一排高窗，窗下一条矮柜。
// 屋里八个圆展台，每个展台上一只带刻度圈的铝转台，这一课的大模型立在转台上。各课各占一个展台，换课时镜头飞过去；
// 不是当前这一课的展台上摆着静止的模型。画面里 1 个单位 = 0.1 m。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Metal, Painted, disc, lathe, mergeParts, type Label, type Part } from '@/lab-kit'
import { blobTex, boardTex, dialTex, floorTex, scanTex, signTex, stoneTex, wallTex } from './mats'
import { rng } from './parts'
import { MoleculeModel } from './mol'
import { CellModel } from './cell'
import { Graphite } from './rig'
import type { V3 } from './physics'

/** 屋子的范围和层高 */
export const ROOM = { x0: -84, x1: 84, z0: -36, z1: 66, h: 38 }
/** 转台面的高度；模型中心离转台面多高 */
export const TOP = 8.92
/** 各课的展台在哪（x, z） */
export const ST = {
  l1: [-45, -12], l2: [-15, -12], l3: [15, -12], l4: [45, -12],
  l5: [-24, 16], l6: [24, 16], l7: [60, 12], x: [-60, 12],
} as const satisfies Record<string, readonly [number, number]>
export type StKey = keyof typeof ST
/** 展台上模型的中心 */
export const center = (k: StKey, h = 3.4): V3 => [ST[k][0], TOP + h, ST[k][1]]

const spot = (k: StKey, h: number, w: number, hh: number, view: [number, number], dy = 0) => ({ target: new THREE.Vector3(ST[k][0], TOP + h + dy, ST[k][1]), span: [w, hh] as [number, number], view })
/** 各课的机位：都是斜着往下看，方位、高低、远近各不一样 */
export const SPOT = {
  l1: spot('l1', 3.4, 6.6, 6.0, [-0.34, 0.3], -0.15),
  l2: spot('l2', 3.4, 6.2, 6.0, [0.3, 0.2], -0.1),
  l3: spot('l3', 3.6, 8.6, 7.4, [-0.16, 0.36], -0.4),
  l4: spot('l4', 3.4, 7.0, 6.4, [0.42, 0.26], -0.3),
  l5: spot('l5', 3.2, 7.6, 7.7, [2.75, 0.44], 0.1),
  l6: spot('l6', 3.2, 8.6, 8.8, [-2.7, 0.3], 0.25),
  l7: spot('l7', 3.2, 10.5, 7.4, [-0.95, 0.28], -0.4),
  x: spot('x', 3.3, 10.2, 7.4, [0.9, 0.3], 0),
  q: { target: new THREE.Vector3(21, 13.2, -2), span: [27, 10.5] as [number, number], view: [-0.78, 0.17] as [number, number] },
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：现在是哪一课（它的展台上不摆静止的模型，工作灯也跟过去） */
export interface Want { at: SpotKey }

/** 这一课的舞台：选一处机位。室内，摄影棚式的环境光。span：临时换一个取景范围（主体变大变小时镜头跟着推拉） */
export function Place({ at, labels, children = null, span }: { at: SpotKey; labels: Label[]; children?: ReactNode; span?: [number, number] }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ at }), [at])
  return <LabStage<Want> labels={labels} target={v.target} span={span ?? v.span} view={v.view} sun={0.5} env={0.7} studio sky={false} backdrop="#12161a" fog={[90, 320]} bloom={0.55} world={want}>{children}</LabStage>
}

// ---------- 展台 ----------
const plinthGeo = lathe([[0, 0], [3.7, 0], [3.7, 0.35], [3.45, 0.6], [3.3, 7.4], [3.9, 7.75], [0, 7.75]], { segs: 56 })
const slabGeo = disc(4.5, 0.62, { chamfer: 0.09, segs: 64 })
const tableGeo = disc(3.3, 0.32, { chamfer: 0.05, segs: 64 })
const hubGeo = lathe([[0, 0], [0.62, 0], [0.62, 0.1], [0.4, 0.22], [0.16, 0.3], [0, 0.3]], { segs: 32 })
/** 一个展台：深色的柱身、黑水磨石台面、带刻度圈的铝转台，中间一根细立柱托着模型。rod：立柱多高 */
export function Pedestal({ x, z, rod, plate = false }: { x: number; z: number; rod: number; plate?: boolean }) {
  const stone = useMemo(() => { const t = stoneTex().clone(); t.repeat.set(3, 3); t.needsUpdate = true; return t }, [])
  return <group position={[x, 0, z]}>
    <mesh geometry={plinthGeo} castShadow receiveShadow><meshPhysicalMaterial color="#262b30" roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
    <mesh geometry={slabGeo} position-y={7.75} castShadow receiveShadow><meshPhysicalMaterial map={stone} roughness={0.28} clearcoat={0.7} clearcoatRoughness={0.2} /></mesh>
    <mesh geometry={tableGeo} position-y={8.37 + 0.23} castShadow receiveShadow><Metal kind="aluminum" grain="turned" repeat={[1, 9]} rough={0.46} env={0.7} /></mesh>
    <mesh position-y={8.485}><cylinderGeometry args={[2.2, 2.4, 0.23, 48]} /><meshStandardMaterial color="#15181b" roughness={0.5} metalness={0.4} /></mesh>
    <mesh position-y={TOP + 0.004} rotation-x={-Math.PI / 2}><circleGeometry args={[3.2, 64]} /><meshBasicMaterial map={dialTex()} transparent opacity={0.8} depthWrite={false} /></mesh>
    <mesh position-y={TOP + 0.008} rotation-x={-Math.PI / 2} renderOrder={1}><circleGeometry args={[2.7, 48]} /><meshBasicMaterial map={blobTex()} transparent opacity={0.75} depthWrite={false} /></mesh>
    <mesh geometry={hubGeo} position-y={TOP} castShadow><Metal kind="chrome" /></mesh>
    {rod > 0 && <mesh position-y={TOP + 0.25 + rod / 2} castShadow><cylinderGeometry args={[0.065, 0.065, rod, 16]} /><Metal kind="chrome" /></mesh>}
    {/* 晶胞下面的一块小托板：透明的亚克力圆片 */}
    {plate && <mesh position-y={TOP + 0.25 + rod - 0.03} castShadow><cylinderGeometry args={[1.5, 1.5, 0.07, 48]} /><meshPhysicalMaterial color="#dbeaf0" transparent opacity={0.14} roughness={0.05} clearcoat={1} envMapIntensity={1.2} depthWrite={false} /></mesh>}
  </group>
}

// ---------- 北墙的矿物标本柜 ----------
const paint = (g: THREE.BufferGeometry, c: string) => { const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g }
/** 一排矿物标本：水晶和紫水晶的晶簇、黄铁矿的立方体、岩盐、萤石的八面体、硫黄。每件立在一块黑色的小底座上 */
function minerals() {
  const r = rng(41), clear: THREE.BufferGeometry[] = [], metal: THREE.BufferGeometry[] = [], solid: THREE.BufferGeometry[] = []
  const e = new THREE.Euler(), m = new THREE.Matrix4()
  const put = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => { g.applyMatrix4(m.makeRotationFromEuler(e.set(rx, ry, rz))); g.translate(x, y, z); return g }
  let n = 0
  for (let x = -66; x <= 66; x += 6.6, n++) {
    const z = -32 + (r() - 0.5) * 1.2, y = 7.3, kind = n % 5
    solid.push(paint(put(new THREE.CylinderGeometry(1.5, 1.6, 0.3, 28), x, y - 0.15, z), '#101214'))
    if (kind === 0 || kind === 3) {                      // 水晶、紫水晶的晶簇：六棱柱加六棱锥
      const col = kind === 0 ? '#e9eef0' : '#9a6fd0'
      for (let i = 0; i < 7; i++) {
        const rad = 0.22 + r() * 0.24, h = 1.2 + r() * 2.2, tx = (r() - 0.5) * 0.9, tz = (r() - 0.5) * 0.9, dx = (r() - 0.5) * 1.6, dz = (r() - 0.5) * 1.2
        const body = new THREE.CylinderGeometry(rad, rad, h, 6); body.translate(0, h / 2, 0)
        const tip = new THREE.ConeGeometry(rad, rad * 1.5, 6); tip.translate(0, h + rad * 0.75, 0)
        for (const g of [body, tip]) clear.push(paint(put(g, x + dx, y, z + dz, tz, r() * 3, -tx), col))
      }
    } else if (kind === 1) {                             // 黄铁矿：几个互相穿插的立方体
      for (let i = 0; i < 5; i++) { const s = 0.7 + r() * 0.9; metal.push(put(new THREE.BoxGeometry(s, s, s), x + (r() - 0.5) * 1.4, y + s * 0.45 + r() * 0.5, z + (r() - 0.5) * 1, r() * 0.5, r() * 3, r() * 0.5).toNonIndexed()) }
    } else if (kind === 2) {                             // 萤石：八面体
      for (let i = 0; i < 3; i++) { const s = 0.8 + r() * 0.7; clear.push(paint(put(new THREE.OctahedronGeometry(s), x + (i - 1) * 1.1, y + s * 0.8, z + (r() - 0.5) * 0.8, r() * 0.4, r() * 3, r() * 0.4), i % 2 ? '#57c9a0' : '#7f8fe0')) }
    } else {                                             // 岩盐：一堆透明的小立方体；隔一件换成硫黄
      const sul = false
      for (let i = 0; i < 6; i++) { const s = 0.6 + r() * 0.8; (sul ? solid : clear).push(paint(put(sul ? new THREE.OctahedronGeometry(s * 0.8) : new THREE.BoxGeometry(s, s, s), x + (r() - 0.5) * 1.6, y + s * 0.5 + (i > 3 ? 0.6 : 0), z + (r() - 0.5) * 1.1, sul ? r() : 0, r() * 3, 0), sul ? '#e6c62e' : '#f1e3dc')) }
    }
  }
  return { clear: mergeGeometries(clear), metal: mergeGeometries(metal), solid: mergeGeometries(solid) }
}
function Vitrine() {
  const geo = useMemo(() => {
    const P: Part[] = []
    P.push({ p: [0, 3.5, -33], s: [140, 7, 6], c: '#23282c' })                    // 底柜
    P.push({ p: [0, 7.1, -33], s: [140.6, 0.2, 6.4], c: '#0f1113' })              // 台面
    P.push({ p: [0, 16.6, -33], s: [140.6, 1.2, 6.4], c: '#1a1e21' })             // 顶盖
    for (let x = -70; x <= 70; x += 20) P.push({ p: [x, 11.6, -30.1], s: [0.5, 8.8, 0.5], c: '#1a1e21' })   // 立框
    for (let x = -65; x <= 65; x += 10) P.push({ p: [x, 3.6, -29.95], s: [9.4, 5.6, 0.12], c: '#2b3136' })  // 柜门
    return { parts: mergeParts(P), ...minerals() }
  }, [])
  return <group>
    <mesh geometry={geo.parts} castShadow receiveShadow><Painted rough={0.5} metal={0.2} /></mesh>
    {/* 柜里的背板和顶上的灯带：暖白，标本是被照亮的 */}
    <mesh position={[0, 11.6, -35.6]}><planeGeometry args={[140, 9]} /><meshStandardMaterial color="#3a3f43" roughness={0.95} /></mesh>
    <mesh position={[0, 15.95, -32.6]} rotation-x={Math.PI / 2}><planeGeometry args={[138, 1.2]} /><meshBasicMaterial color="#fff1d6" toneMapped={false} /></mesh>
    {[-50, -25, 0, 25, 50].map(x => <pointLight key={x} position={[x, 14.6, -31.6]} intensity={24} distance={26} decay={1.5} color="#ffe9c8" />)}
    <mesh geometry={geo.solid} castShadow><meshStandardMaterial vertexColors roughness={0.6} /></mesh>
    <mesh geometry={geo.metal} castShadow><Metal kind="brass" rough={0.22} /></mesh>
    <mesh geometry={geo.clear}><meshPhysicalMaterial vertexColors roughness={0.06} clearcoat={1} transparent opacity={0.82} envMapIntensity={2} flatShading /></mesh>
    <mesh position={[0, 11.6, -30.05]}><planeGeometry args={[140, 8.8]} /><meshPhysicalMaterial color="#d7e6ea" transparent opacity={0.07} roughness={0.03} clearcoat={1} envMapIntensity={2} depthWrite={false} /></mesh>
  </group>
}

// ---------- 东墙的 X 射线衍射仪 ----------
function Diffractometer() {
  const geo = useMemo(() => {
    const P: Part[] = [], X = 76, Z = -10
    P.push({ p: [X, 4.5, Z], s: [12, 9, 18], c: '#aab0b0' })                 // 下柜
    P.push({ p: [X, 0.4, Z], s: [11.4, 0.8, 17.4], c: '#2a2e31' })           // 踢脚
    P.push({ p: [X + 4.5, 15, Z], s: [3, 12, 18], c: '#aab0b0' })            // 后壁
    for (const dz of [-8.6, 8.6]) P.push({ p: [X - 1.5, 15, Z + dz], s: [9, 12, 0.8], c: '#aab0b0' })   // 两侧
    P.push({ p: [X, 21.5, Z], s: [12, 1, 18], c: '#9da3a3' })                // 顶
    P.push({ p: [X - 6.02, 5.2, Z + 5], s: [0.1, 3, 5], c: '#20262b' })      // 面板
    P.push({ p: [X - 2, 9.6, Z], s: [6, 1.2, 6], c: '#3a4046' })             // 测角仪底座
    return mergeParts(P)
  }, [])
  const X = 76, Z = -10
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.45} metal={0.15} /></mesh>
    {/* 测角仪：一个立着的大圆环，两条臂（X 射线管、探测器），中间是样品台 */}
    <group position={[X - 2, 14.6, Z]} rotation-y={Math.PI / 2}>
      <mesh castShadow><torusGeometry args={[4.2, 0.28, 16, 72]} /><Metal kind="steel" grain="turned" /></mesh>
      {[0.5, 2.64].map((a, i) => <group key={i} rotation-z={a}>
        <mesh position={[2.6, 0, 0.5]} castShadow><boxGeometry args={[3.6, 0.7, 0.7]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh position={[4.3, 0, 0.5]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.75, 0.75, 2.2, 24]} /><meshPhysicalMaterial color={i ? '#22282e' : '#8a2f2a'} roughness={0.35} clearcoat={0.6} /></mesh>
      </group>)}
      <mesh position={[0, 0, 0.6]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.9, 0.9, 0.5, 32]} /><Metal kind="brass" grain="turned" /></mesh>
    </group>
    <pointLight position={[X - 2, 19.5, Z]} intensity={50} distance={22} decay={1.5} color="#e8f4ff" />
    {/* 铅玻璃门：发暗发黄 */}
    <mesh position={[X - 6.05, 15, Z]} rotation-y={-Math.PI / 2}><planeGeometry args={[16.4, 11]} /><meshPhysicalMaterial color="#b9a86a" transparent opacity={0.16} roughness={0.04} clearcoat={1} envMapIntensity={2} depthWrite={false} /></mesh>
    <mesh position={[X - 6.1, 5.4, Z + 5]} rotation-y={-Math.PI / 2}><planeGeometry args={[3.6, 1.8]} /><meshBasicMaterial map={scanTex()} toneMapped={false} /></mesh>
    <mesh position={[X - 6.06, 21.5, Z]} rotation-y={-Math.PI / 2}><planeGeometry args={[4, 0.3]} /><meshBasicMaterial color="#7dffb0" toneMapped={false} /></mesh>
  </group>
}

/** 跟着当前这一课的工作灯：从前上方斜着打下来，主体亮、屋子暗。flip：这一课的镜头在北边往南看，灯也换到北边 */
function Key({ x, z, wide, flip }: { x: number; z: number; wide: boolean; flip: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(new THREE.Vector3(x, 0, z)), side = useRef(flip ? -1 : 1)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    cur.current.lerp(new THREE.Vector3(x, 0, z), 1 - Math.exp(-Math.min(d, 1 / 30) / 0.45))
    side.current += ((flip ? -1 : 1) - side.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.45))
    l.position.set(cur.current.x - 9 * side.current, 33, cur.current.z + 15 * side.current); aim.position.set(cur.current.x, TOP + 2, cur.current.z); aim.updateMatrixWorld()
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={wide ? 1.1 : 0.34} penumbra={0.9} intensity={wide ? 0 : 620} distance={0} decay={1.4} color="#fff2e0" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

/** 不是当前这一课的展台上摆的静止模型 */
function Resting({ k }: { k: StKey }) {
  const p = center(k, k === 'x' ? 3.3 : k === 'l3' ? 3.6 : k.startsWith('l') && +k[1] <= 4 ? 3.4 : 3.2)
  return <group position={p}>
    {k === 'l1' ? <MoleculeModel m="BF3" /> : k === 'l2' ? <MoleculeModel m="H2O" lone={1} /> : k === 'l3' ? <MoleculeModel m="CH4" /> : k === 'l4' ? <MoleculeModel m="NH3" lone={1} />
      : k === 'l5' ? <group rotation-y={0.5}><CellModel c="NaCl" /></group> : k === 'l6' ? <group rotation-y={0.5}><CellModel c="Cu" /></group> : k === 'l7' ? <group rotation-y={0.5}><CellModel c="diamond" /></group> : <Graphite />}
  </group>
}
/** 立柱的高度：分子托到中心原子下面，晶胞托到底面 */
export const ROD: Record<StKey, number> = { l1: 2.6, l2: 2.6, l3: 3.0, l4: 2.6, l5: 1.15, l6: 1.15, l7: 1.15, x: 1.15 }

export function World({ at = 'l1' }: Partial<Want>) {
  const tex = useMemo(() => {
    const floor = floorTex().clone(); floor.repeat.set((ROOM.x1 - ROOM.x0) / 20, (ROOM.z1 - ROOM.z0) / 20); floor.needsUpdate = true
    const wall = wallTex().clone(); wall.repeat.set(10, 3); wall.needsUpdate = true
    return { floor, wall, sign: signTex('晶体结构实验室', 'CRYSTAL STRUCTURE LABORATORY'), board: boardTex() }
  }, [])
  const geo = useMemo(() => {
    const P: Part[] = []
    // 西墙窗下的矮柜；东墙衍射仪旁的样品柜
    P.push({ p: [-80, 3.6, 10], s: [7, 7.2, 70], c: '#23282c' }); P.push({ p: [-80, 7.3, 10], s: [7.4, 0.24, 70.4], c: '#0f1113' })
    P.push({ p: [79.5, 11, 24], s: [8, 22, 30], c: '#3f464b' })
    for (let z = 10; z < 38; z += 7.4) P.push({ p: [75.45, 11, z + 2.6], s: [0.12, 20.6, 7], c: '#4c545a' })
    // 窗框
    for (let z = -26; z <= 46; z += 12) P.push({ p: [-83.6, 21, z], s: [0.6, 20, 0.7], c: '#1c2023' })
    P.push({ p: [-84, 19, 56], s: [0.5, 38, 20], c: '#39444a' })
    for (const y of [11, 21, 31]) P.push({ p: [-83.6, y, 10], s: [0.6, 0.6, 72], c: '#1c2023' })
    return mergeParts(P)
  }, [])
  const wide = at === 'q', cur = at === 'q' ? null : at
  const here = cur ? ST[cur] : [0, 4]
  return (
    <group>
      <hemisphereLight args={['#dfe8f0', '#3a3d40', wide ? 0.9 : 0.2]} />
      <Key x={here[0]} z={here[1]} wide={wide} flip={at === 'l5' || at === 'l6'} />
      {wide && [-45, 0, 45].map(x => <pointLight key={x} position={[x, 36, 26]} intensity={2200} distance={0} decay={1.8} color="#fff4e6" castShadow={x === 0} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} />)}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (ROOM.z0 + ROOM.z1) / 2]} receiveShadow><planeGeometry args={[ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0]} /><meshPhysicalMaterial map={tex.floor} roughness={0.45} clearcoat={0.3} clearcoatRoughness={0.4} envMapIntensity={0.7} /></mesh>
      {/* 北墙、东墙、西墙、天花板 */}
      <mesh position={[0, ROOM.h / 2, ROOM.z0]} receiveShadow><planeGeometry args={[ROOM.x1 - ROOM.x0, ROOM.h]} /><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>
      <mesh position={[ROOM.x1, ROOM.h / 2, (ROOM.z0 + ROOM.z1) / 2]} rotation-y={-Math.PI / 2} receiveShadow><planeGeometry args={[ROOM.z1 - ROOM.z0, ROOM.h]} /><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>
      <mesh position={[ROOM.x0, ROOM.h / 2, (ROOM.z0 + ROOM.z1) / 2]} rotation-y={Math.PI / 2} receiveShadow><planeGeometry args={[ROOM.z1 - ROOM.z0, ROOM.h]} /><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>
      <mesh position={[0, ROOM.h, (ROOM.z0 + ROOM.z1) / 2]} rotation-x={Math.PI / 2}><planeGeometry args={[ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0]} /><meshStandardMaterial color="#1b1f22" roughness={0.9} /></mesh>
      {/* 南墙和墙上的黑板：粉笔画的几种晶胞。铝框，下面一条粉笔槽 */}
      {!wide && <>
      <mesh position={[0, ROOM.h / 2, ROOM.z1]} rotation-y={Math.PI} receiveShadow><planeGeometry args={[ROOM.x1 - ROOM.x0, ROOM.h]} /><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>
      <group position={[-34, 15, ROOM.z1 - 0.3]} rotation-y={Math.PI}>
        <mesh position-z={-0.1}><boxGeometry args={[57, 16.4, 0.3]} /><meshStandardMaterial color="#8d9498" metalness={0.8} roughness={0.4} /></mesh>
        <mesh position-z={0.08}><planeGeometry args={[56, 15.3]} /><meshStandardMaterial map={tex.board} roughness={0.85} /></mesh>
        <mesh position={[0, -8.4, 0.5]} castShadow><boxGeometry args={[57, 0.4, 1.3]} /><meshStandardMaterial color="#8d9498" metalness={0.8} roughness={0.4} /></mesh>
      </group>
      {[-40, 0, 40].map(x => <pointLight key={x} position={[x, 31, ROOM.z1 - 9]} intensity={160} distance={60} decay={1.5} color="#fff1dc" />)}
      </>}
      {/* 天花板上的条形灯 */}
      {[-56, -28, 0, 28, 56].flatMap(x => [-14, 22].map(z => <mesh key={`${x}${z}`} position={[x, ROOM.h - 0.1, z]} rotation-x={Math.PI / 2}><planeGeometry args={[14, 0.9]} /><meshBasicMaterial color="#fff3df" toneMapped={false} /></mesh>))}
      {/* 西墙的高窗：外面是阴天的白光 */}
      <mesh position={[ROOM.x0 + 0.1, 21, 10]} rotation-y={Math.PI / 2}><planeGeometry args={[72, 20]} /><meshBasicMaterial color="#7f93a3" /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.5} metal={0.15} /></mesh>
      {/* 北墙上的字 */}
      <mesh position={[2, 30, ROOM.z0 + 0.1]}><planeGeometry args={[40, 7.5]} /><meshBasicMaterial map={tex.sign} transparent opacity={0.9} /></mesh>
      <Vitrine />
      <Diffractometer />
      {(Object.keys(ST) as StKey[]).map(k => <group key={k}>
        <Pedestal x={ST[k][0]} z={ST[k][1]} rod={ROD[k]} plate={ROD[k] < 2} />
        {k !== cur && <Resting k={k} />}
      </group>)}
    </group>
  )
}
