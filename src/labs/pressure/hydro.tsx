// 整座水电站：压强实验室所有的课都在这一个大场景里，各占一处。整个世界朝镜头剖开（剖面在 z = 0），镜头始终在剖面这一侧。
// 从左到右：下游河道 → 大坝 → 水库（坝前 100 m 深，往右变浅到 6 m）→ 挡墙和泥浆井 → 岸上的工地（软土路、沙地）。
// 画面单位 1 = 1 m。岸顶的高度是 0，水库蓄满时水面在 −0.8。
import { useMemo } from 'react'
import * as THREE from 'three'
import { DAM, SITE3 } from './physics'
import { Hills, Pines } from './world'
import { Painted, makeStrata, mergeParts, useConcrete, useFaceGradient, useRipple, useSlide, type Part } from '@/lab-kit'

/** 各课所在的位置（x 坐标） */
export const ST = { lock: 150, tunnel: 102, sand: 72, road: 40, bank: 0, dam: -250 }
export const WY = -0.8                                   // 水库蓄满时的水面
export const SHELF = WY - SITE3.depth                    // 岸边浅水区的水底
export const DEEP = WY - DAM.max                         // 坝前的水底
const WALL0 = -0.7, WALL1 = 0.9, WELL1 = 3.9             // 挡墙和泥浆井的边界（和第 3 课一致）
const SLOPE0 = -60, SLOPE1 = -45                         // 水底从深到浅的那段斜坡
const BACK = -460, FLOOR = DEEP - 9
/** 引水渠：船闸所在的那一段水道，在岸上挖出来的。x 的范围、渠底高度、后壁的位置 */
export const CANAL = { x0: 120, x1: 180, bed: -7, back: -8 }
/** 坝顶（观测站在这里）和远处雪山顶上的平台 */
export const CREST = { x: ST.dam - 5, y: DEEP + DAM.height }
export const PEAK = { x: 150, y: 318, z: -560 }
const SAND = ['#c9b287', '#bfa57a', '#b3986c', '#a58a60', '#977d56', '#8a714e']
const SOIL = ['#7a6a4c', '#6e5d42', '#63533b', '#594a35', '#50432f', '#483c2b']

/** 水面高度为 y 时，水底在这个高度上的最右端（斜坡上是插值） */
const bedX = (y: number) => y >= SHELF ? WALL0 : SLOPE0 + (SLOPE1 - SLOPE0) * (y - DEEP) / (SHELF - DEEP)

/** 大坝：上窄下宽的梯形坝体、坝顶护栏、坝面刻度、下游的厂房和输电塔。按 1:10 画好再放大，水在它右边 */
function Dam() {
  const [d, n, r] = useConcrete(1.2, 1.6)
  const K = 0.1, H = DAM.height * K, TOP = DAM.crest * K, BASE = DAM.base * K, len = -BACK * K
  const body = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(BASE, 0); s.lineTo(TOP, H * 0.86); s.lineTo(TOP, H); s.lineTo(0, H); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len)
    return g
  }, [BASE, H, TOP, len])
  const extra = useMemo(() => {
    const P: Part[] = []
    for (let i = 0; i < 24; i++) P.push({ p: [0.06, H + 0.06, -0.4 - i * 1.9], s: [0.03, 0.12, 0.03], c: '#e8b21e' }, { p: [TOP - 0.06, H + 0.06, -0.4 - i * 1.9], s: [0.03, 0.12, 0.03], c: '#e8b21e' })
    for (const x of [0.06, TOP - 0.06]) P.push({ p: [x, H + 0.12, -len / 2], s: [0.03, 0.02, len], c: '#e8b21e' })
    for (let m = 0; m <= 100; m += 10) P.push({ p: [-0.012, m * K, -0.05], s: [0.02, 0.025, m % 50 ? 0.5 : 0.9], c: '#f3f1e8' })
    P.push({ p: [BASE + 1.6, 0.7, -6], s: [2.4, 1.4, 5], c: '#d8d4c8' }, { p: [BASE + 1.6, 1.46, -6], s: [2.6, 0.12, 5.2], c: '#3c5964' })
    for (let i = 0; i < 4; i++) P.push({ p: [BASE + 0.39, 0.8, -4.3 - i * 1.1], s: [0.02, 0.6, 0.6], c: '#22354a' })
    for (const x of [BASE + 6, BASE + 13]) { P.push({ p: [x, 1.6, -9], s: [0.08, 3.2, 0.08], c: '#8d949c' }); for (const y of [2.4, 3]) P.push({ p: [x, y, -9], s: [0.9, 0.05, 0.05], c: '#8d949c' }) }
    return mergeParts(P)
  }, [BASE, H, TOP, len])
  return (
    <group position={[ST.dam, DEEP, 0]} scale={[-10, 10, 10]}>
      <mesh geometry={body} castShadow receiveShadow><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#bcb9ae" envMapIntensity={0.5} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={extra}><Painted rough={0.7} metal={0.2} /></mesh>
      <Pines at={[[BASE + 4, -4, 0.3], [BASE + 5.2, -7, 0.35], [BASE + 9, -5, 0.3], [BASE + 11, -12, 0.4], [BASE + 15, -6, 0.35], [BASE + 3, -14, 0.4]]} />
    </group>
  )
}

/** 水库的水：水面高度可变（第 4 课拖水位）。narrow 时只留坝前 30 m 宽的一段 */
function Water({ level, narrow }: { level: number; narrow: boolean }) {
  const ys = DEEP + level, x1 = narrow ? ST.dam + 30 : bedX(ys)
  const ripple = useRipple([90, 140], 0.012)
  const face = useFaceGradient('40,150,185')
  const geo = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(ST.dam, DEEP)
    if (narrow) { s.lineTo(x1, DEEP); s.lineTo(x1, ys) }
    else { s.lineTo(SLOPE0, DEEP); if (ys > SHELF) { s.lineTo(SLOPE1, SHELF); s.lineTo(WALL0, SHELF); s.lineTo(WALL0, ys) } else s.lineTo(x1, ys) }
    s.lineTo(ST.dam, ys); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: -BACK, bevelEnabled: false }); g.translate(0, 0, BACK)
    return g
  }, [ys, x1, narrow])
  if (level < 0.3) return null
  const w = x1 - ST.dam, cx = (x1 + ST.dam) / 2
  const shelf = !narrow && ys > SHELF + 0.05
  return (
    <group>
      <mesh geometry={geo} renderOrder={2}><meshBasicMaterial color="#0a2a33" transparent opacity={0.48} depthWrite={false} /></mesh>
      {/* 剖面上的渐变：坝前深水一块，岸边浅水一块 */}
      <mesh position={[(ST.dam + Math.min(x1, SLOPE0)) / 2, (DEEP + ys) / 2, 0.02]} renderOrder={4}><planeGeometry args={[Math.min(x1, SLOPE0) - ST.dam, level]} /><meshBasicMaterial map={face} transparent depthWrite={false} toneMapped={false} /></mesh>
      {shelf && <mesh position={[(SLOPE1 + WALL0) / 2, (SHELF + ys) / 2, 0.02]} renderOrder={4}><planeGeometry args={[WALL0 - SLOPE1, ys - SHELF]} /><meshBasicMaterial map={face} transparent depthWrite={false} toneMapped={false} /></mesh>}
      <mesh position={[cx, ys + 0.004, BACK / 2]} rotation-x={-Math.PI / 2} renderOrder={3}><planeGeometry args={[w, -BACK]} /><meshPhysicalMaterial color="#2a8fb0" transparent opacity={0.55} roughness={0.05} envMapIntensity={1.4} normalMap={ripple} normalScale={new THREE.Vector2(0.4, 0.4)} clearcoat={1} depthWrite={false} /></mesh>
    </group>
  )
}

/** 地形：岸上的地面、水底、剖开的岩土面、剖面前面的垫层 */
function Terrain() {
  const [d, n, r] = useConcrete(70, 60)
  const tex = useMemo(() => {
    const base = makeStrata(['#6f6a55', '#8a7a5c', '#7b6a4e', '#6a5a44', '#5c5142', '#54493d']), sand = makeStrata(SAND), soil = makeStrata(SOIL)
    base.wrapT = THREE.RepeatWrapping; base.repeat.set(0.07, 0.2); sand.repeat.set(3, 1); soil.repeat.set(3, 1)
    return { base, sand, soil }
  }, [])
  // 剖面：整条岩土面是一个多边形，泥浆井那里挖一个洞
  const face = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-700, FLOOR); s.lineTo(-700, DEEP); s.lineTo(SLOPE0, DEEP); s.lineTo(SLOPE1, SHELF); s.lineTo(WALL0, SHELF); s.lineTo(WALL0, FLOOR + 0.01)
    s.lineTo(WALL1, FLOOR + 0.01); s.lineTo(WALL1, 0); s.lineTo(CANAL.x0, 0); s.lineTo(CANAL.x0, CANAL.bed); s.lineTo(CANAL.x1, CANAL.bed); s.lineTo(CANAL.x1, 0); s.lineTo(700, 0); s.lineTo(700, FLOOR); s.closePath()
    const hole = new THREE.Path(); hole.moveTo(WALL1 + 0.001, SHELF); hole.lineTo(WELL1, SHELF); hole.lineTo(WELL1, -0.001); hole.lineTo(WALL1 + 0.001, -0.001); hole.closePath(); s.holes.push(hole)
    return new THREE.ShapeGeometry(s)
  }, [])
  const rock = <meshStandardMaterial color="#6c7166" roughness={1} />
  const site = useMemo(() => {
    const P: Part[] = []
    // 岸上的机房、灯杆
    P.push({ p: [11.5, 1.7, -10], s: [5.5, 3.4, 4.2], c: '#e4e1d8' }, { p: [11.5, 3.55, -10], s: [6, 0.3, 4.7], c: '#3c5964' }, { p: [10.2, 1.05, -7.88], s: [1, 2.1, 0.06], c: '#2f6f8f' }, { p: [12.6, 2, -7.88], s: [1.5, 0.9, 0.06], c: '#22354a' }, { p: [11.5, 0.08, -10], s: [6.4, 0.16, 5.2], c: '#8f8b80' })
    P.push({ p: [6.2, 3.5, -5.2], s: [0.08, 7, 0.08], c: '#6f777e', cyl: true }, { p: [5.8, 7, -5.2], s: [1.2, 0.18, 0.4], c: '#3a3f45' })
    // 挡墙顶上的护栏（从探头后面往远处排）、泥浆井后沿的护栏
    for (let i = 0; i < 14; i++) P.push({ p: [WALL0 + 0.12, 0.55, -4.2 - i * 2.2], s: [0.05, 1.1, 0.05], c: '#e8b21e', cyl: true })
    for (const y of [0.55, 1.08]) P.push({ p: [WALL0 + 0.12, y, -18.5], s: [0.05, 0.05, 28.6], c: '#e8b21e' })
    for (let i = 0; i <= 4; i++) P.push({ p: [WALL1 + i * 0.75, 0.55, -3.45], s: [0.05, 1.1, 0.05], c: '#e8b21e', cyl: true })
    for (const y of [0.55, 1.08]) P.push({ p: [(WALL1 + WELL1) / 2, y, -3.45], s: [WELL1 - WALL1, 0.05, 0.05], c: '#e8b21e' })
    // 工地：备用的混凝土块、路锥、工棚、围挡
    const sx = ST.sand, rx = ST.road
    for (let k = 0; k < 3; k++) P.push({ p: [sx - 7.5, 0.25 + k * 0.5, -7 - (k % 2) * 0.1], s: [2, 0.5, 1], c: k % 2 ? '#b9b4a8' : '#aeaa9e' })
    P.push({ p: [sx - 5.2, 0.25, -7.3], s: [2, 0.5, 1], c: '#b9b4a8' })
    for (const [x, z] of [[sx - 4.6, -3.2], [sx + 5.2, -3.4], [sx + 6.4, -1.2], [rx + 8.5, -4.2], [rx + 10, -1.4], [rx - 2.6, -4.4]] as const) P.push({ p: [x, 0.03, z], s: [0.42, 0.06, 0.42], c: '#22262a' }, { p: [x, 0.36, z], s: [0.1, 0.6, 0.1], c: '#e8651e', cyl: true }, { p: [x, 0.36, z], s: [0.105, 0.14, 0.105], c: '#f1efe8', cyl: true })
    P.push({ p: [sx + 9, 1.4, -11], s: [6, 2.8, 3], c: '#e4e1d8' }, { p: [sx + 9, 2.95, -11], s: [6.4, 0.3, 3.4], c: '#2f6f8f' }, { p: [sx + 7.6, 1.05, -9.48], s: [1, 2.1, 0.05], c: '#3c5964' })
    for (let i = 0; i < 30; i++) P.push({ p: [22 + i * 2.4, 1, -14], s: [2.3, 2, 0.06], c: i % 2 ? '#2f6f8f' : '#e9e6dc' })
    // 软土路左边的一段硬地面
    P.push({ p: [rx - 13, 0.03, -4], s: [20, 0.06, 8], c: '#c9c6bb' })
    return mergeParts(P)
  }, [])
  return (
    <group>
      {/* 岸上的地面，以及沙地、软土两块 */}
      {[[WALL1, CANAL.x0, BACK, 0], [CANAL.x1, 700, BACK, 0], [CANAL.x0, CANAL.x1, BACK, CANAL.back]].map(([xa, xb, za, zb], i) => (
        <mesh key={i} position={[(xa + xb) / 2, 0, (za + zb) / 2]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[xb - xa, zb - za]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#a3a58c" envMapIntensity={0.5} /></mesh>
      ))}
      {/* 引水渠：渠底、后壁、两头的端墙 */}
      <mesh position={[(CANAL.x0 + CANAL.x1) / 2, CANAL.bed, CANAL.back / 2]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[CANAL.x1 - CANAL.x0, -CANAL.back]} /><meshStandardMaterial color="#27505a" roughness={0.9} /></mesh>
      <mesh position={[(CANAL.x0 + CANAL.x1) / 2, CANAL.bed / 2, CANAL.back]}><planeGeometry args={[CANAL.x1 - CANAL.x0, -CANAL.bed]} /><meshStandardMaterial color="#8f8d84" roughness={0.9} /></mesh>
      <mesh position={[CANAL.x0, CANAL.bed / 2, CANAL.back / 2]} rotation-y={Math.PI / 2}><planeGeometry args={[-CANAL.back, -CANAL.bed]} /><meshStandardMaterial color="#8f8d84" roughness={0.9} /></mesh>
      <mesh position={[CANAL.x1, CANAL.bed / 2, CANAL.back / 2]} rotation-y={-Math.PI / 2}><planeGeometry args={[-CANAL.back, -CANAL.bed]} /><meshStandardMaterial color="#8f8d84" roughness={0.9} /></mesh>
      <mesh position={[ST.sand + 1, 0.012, -7]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[26, 14]} /><meshStandardMaterial color="#d8c08f" roughness={1} /></mesh>
      <mesh position={[ST.road + 6.5, 0.012, -4.5]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[19, 9]} /><meshStandardMaterial color="#8f7d5b" roughness={1} /></mesh>
      {/* 水底：岸边浅水区、斜坡、坝前和下游的河床 */}
      <mesh position={[(SLOPE1 + WALL0) / 2, SHELF, BACK / 2]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[WALL0 - SLOPE1, -BACK]} /><meshStandardMaterial color="#27505a" roughness={0.9} /></mesh>
      <mesh position={[(SLOPE0 + SLOPE1) / 2, (DEEP + SHELF) / 2, BACK / 2]} rotation={[-Math.PI / 2, -Math.atan2(SHELF - DEEP, SLOPE1 - SLOPE0), 0]}><planeGeometry args={[Math.hypot(SLOPE1 - SLOPE0, SHELF - DEEP), -BACK]} />{rock}</mesh>
      <mesh position={[(SLOPE0 - 700) / 2, DEEP, BACK / 2]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[SLOPE0 + 700, -BACK]} />{rock}</mesh>
      {/* 剖面，以及盖在上面的沙层、软土层 */}
      <mesh geometry={face}><meshStandardMaterial map={tex.base} roughness={0.95} /></mesh>
      <mesh position={[ST.sand + 1, -1.2, 0.004]}><planeGeometry args={[26, 2.4]} /><meshStandardMaterial map={tex.sand} roughness={0.95} /></mesh>
      <mesh position={[ST.road + 6.5, -1.3, 0.004]}><planeGeometry args={[19, 2.6]} /><meshStandardMaterial map={tex.soil} roughness={0.95} /></mesh>
      <mesh position={[ST.road - 13, -0.16, 0.006]}><planeGeometry args={[20, 0.32]} /><meshStandardMaterial color="#a9a69b" roughness={0.9} /></mesh>
      {/* 剖面前面：一块深色的垫层 */}
      <mesh position={[0, FLOOR, 300]} rotation-x={-Math.PI / 2}><planeGeometry args={[1600, 600]} /><meshStandardMaterial color="#343939" roughness={0.95} /></mesh>
      <mesh geometry={site} castShadow receiveShadow><Painted rough={0.8} metal={0.1} /></mesh>
      {[[ST.sand - 11, -5, 2.6, 1.7], [ST.sand + 13, -6, 3.2, 2.1], [ST.sand + 15.5, -4.4, 2, 1.3]].map(([x, z, rr, h], i) => <mesh key={i} position={[x, h / 2, z]} castShadow receiveShadow><coneGeometry args={[rr, h, 24]} /><meshStandardMaterial color="#cdb588" roughness={1} /></mesh>)}
      <Pines at={[[7, -15, 1], [9.5, -19, 1.3], [16, -17, 1.1], [18, -22, 1.4], [13, -27, 1.2], [26, -18, 1.5], [8, -30, 1.1], [30, -30, 1.6], [20, -36, 1.3], [15, -5, 0.8],
        [44, -19, 1.2], [52, -22, 1.4], [60, -18, 1.3], [68, -20, 1.1], [78, -19, 1.4], [88, -16, 1.5], [96, -24, 1.4], [36, -24, 1.3]]} />
    </group>
  )
}

/** 整座水电站。level：水库水深（m）；narrow：只留坝前一小段水（第 4 课的对比） */
export function HydroWorld({ level = DAM.max, narrow = false }: { level?: number; narrow?: boolean }) {
  const lv = useSlide(level, 70)          // 换课时水位慢慢回到该有的高度，不突然跳
  return (
    <group>
      <Terrain />
      <Dam />
      <Water level={lv} narrow={narrow} />
      <Hills />
      {/* 远处一座雪山：山顶有一块小平台，第 6 课把器材带到那里再做一次 */}
      <mesh position={[PEAK.x, 162, PEAK.z]}><coneGeometry args={[300, 330, 9, 3]} /><meshStandardMaterial color="#8b98a2" roughness={1} flatShading /></mesh>
      <mesh position={[PEAK.x, 262, PEAK.z]}><coneGeometry args={[119, 131, 9, 2]} /><meshStandardMaterial color="#eef3f6" roughness={0.9} flatShading /></mesh>
      <mesh position={[PEAK.x, PEAK.y - 0.4, PEAK.z]} receiveShadow><cylinderGeometry args={[5, 5.5, 0.8, 24]} /><meshStandardMaterial color="#c9cdd0" roughness={0.9} /></mesh>
    </group>
  )
}
