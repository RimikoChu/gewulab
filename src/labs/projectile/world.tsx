// 抛体运动实验室的大场景：一条山谷里的山地消防训练基地。整个实验室只有这一个世界，各课在里面各占一处，换课时镜头飞过去。
// 山谷东西向：北边一条河（河面宽 30 m），河对岸是长满针叶林的高山；一条盘山路从西头绕两个弯进谷，沿谷底往东；
// 路南是训练场（平抛实验台、喷水训练长台），路北的草地上空是无人机和直升机的投放区；东头一道山梁伸进谷里，是水炮要打的山坡。
// 各课的位置写在 P 里，机位写在 SPOT 里。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeParts, useConcrete, useRipple, type Part } from '@/lab-kit'
import { makeAsphalt, makeTurf, rep, rng } from './mats'
import { HILL, ROAD_LEN, roadAt } from './physics'
import { FireTruck, Hose, LongDeck, Monitor, Rocks } from './props'
import { ground, LEVEL, MUZZLE, noise, RIVER_Z, terrainGeo } from './terrain'
import { Conifers, Pines, Tree } from './trees'

type V3 = [number, number, number]
/** 各课的位置 */
export const P = {
  road: [-122, 0, 34] as V3,              // 第 1 课：盘山路的起点（局部 x 朝东，左手边朝北）
  ferry: [-20, LEVEL, RIVER_Z + 15] as V3, // 第 2 课：冲锋舟出发的岸边
  drone: [38, 0, -26] as V3,              // 第 3 课：无人机投放点正下方的地面
  bench: [18, 0, 16] as V3,               // 第 4 课：平抛实验台
  heli: [224, 0, -18] as V3,              // 第 5 课：空投的目标
  cannon: [88, HILL.muzzle, 22] as V3,    // 第 6 课：水炮的炮口
  muzzle: MUZZLE,                         // 第 7 课：水炮的炮口
}
/** 路面的宽度 */
export const ROAD_W = 9

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
type Spot = { target: THREE.Vector3; span: [number, number]; view: [number, number] }
/** 各处的机位 */
export const SPOT: Record<string, Spot> = {
  road: { target: v(P.road[0] + 20, 0, P.road[2] - 25), span: [50, 19], view: [0.2, 0.42] },
  ferry: { target: v(P.ferry[0] + 8, 0, RIVER_Z - 4), span: [42, 23], view: [0.05, 0.56] },
  drone: { target: v(P.drone[0] + 7.5, 13.2, P.drone[2]), span: [28, 28], view: [0.1, 0.03] },
  bench: { target: v(P.bench[0] - 0.1, 1.36, P.bench[2]), span: [1.12, 0.92], view: [0.3, 0.02] },
  heli: { target: v(P.heli[0] - 34, 22, P.heli[2]), span: [80, 62], view: [0.08, 0.03] },
  cannon: { target: v(P.cannon[0] + 10, 5.6, P.cannon[2]), span: [24.5, 10.5], view: [-0.1, 0.04] },
  hill: { target: v(MUZZLE[0] + 17, 8.6, 0), span: [40, 18], view: [0.06, 0.05] },
  slope: { target: v(MUZZLE[0] + 33.5, 13.5, 0), span: [46, 25], view: [-0.06, 0.05] },
  wind: { target: v(P.heli[0] - 22, 11.5, P.heli[2]), span: [52, 26], view: [0.08, 0.03] },
  over: { target: v(MUZZLE[0] + 13, 6.5, -2), span: [34, 15], view: [-0.72, 0.1] },
}

/** 把路的中线（世界坐标）做成一条贴地的带子。off：往左偏多少；w：宽 */
function ribbon(line: [number, number][], off: number, w: number, y: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  let len = 0
  line.forEach(([x, z], i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1
    const nx = dz / l, nz = -dx / l   // 左手边
    if (i) len += Math.hypot(x - line[i - 1][0], z - line[i - 1][1])
    for (const s of [1, -1]) { pos.push(x + nx * (off + s * w / 2), y, z + nz * (off + s * w / 2)); uv.push(s > 0 ? 0 : 1, len / 6) }
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k, k - 1, k + 1) }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
/** 路的中线：西头从山里出来，绕过第 1 课的两个弯，再沿谷底一直往东到山坡脚下 */
function roadLine(): [number, number][] {
  const out: [number, number][] = []
  for (let x = -70; x < 0; x += 5) out.push([P.road[0] + x, P.road[2]])
  for (let s = 0; s <= ROAD_LEN; s += 1) { const p = roadAt(s); out.push([P.road[0] + p.x, P.road[2] - p.z]) }
  const e = roadAt(ROAD_LEN), ex = P.road[0] + e.x, ez = P.road[2] - e.z
  for (let x = ex + 5; x <= MUZZLE[0] - 16; x += 5) out.push([x, ez])
  return out
}

/** 树和石头摆在哪：用固定的随机数种子，每次进来都一样 */
function plant() {
  const r = rng(77), leafy: [number, number, number, number, number][] = [], firs: [number, number, number, number][] = [], pines: [number, number, number, number][] = [], rocks: [number, number, number, number][] = []
  // 河南岸的一排阔叶树（第 2 课的渡口前面空着）
  for (let x = -150; x < 345; x += 13 + r() * 9) { if (x > -50 && x < 22) continue; const z = -39 + r() * 4.5; leafy.push([x, ground(x, z), z, 8 + r() * 4, Math.floor(r() * 1e4)]) }
  // 河对岸的阔叶树
  for (let x = -140; x < 340; x += 15 + r() * 12) { const z = -81 - r() * 6; leafy.push([x, ground(x, z), z, 9 + r() * 5, Math.floor(r() * 1e4)]) }
  // 盘山路两个弯的里侧、训练场边上的几棵
  for (const [x, z] of [[-84, -24], [-62, -22], [-128, -6], [8, -22], [70, -20], [128, -20], [150, 18], [262, -22], [300, -22], [322, -30]] as [number, number][]) leafy.push([x, ground(x, z), z, 8 + r() * 4, Math.floor(r() * 1e4)])
  // 远山上的针叶林：北山、东山、西山，越陡越高的地方越稀
  for (let i = 0; i < 5200 && firs.length + pines.length < 1300; i++) {
    const x = -250 + r() * 700, z = -275 + r() * 400, y = ground(x, z)
    if (y < 3.5 || y > 98) continue
    if (Math.abs(z) < 14 && x > MUZZLE[0] - 5 && x < MUZZLE[0] + 75) continue   // 第 7 课的坡面上不种
    if (z > 3 && x > MUZZLE[0] - 40 && x < MUZZLE[0] + 80) continue             // 山坡朝镜头的一面不种，免得挡住水柱
    const slope = Math.hypot(ground(x + 1.5, z) - y, ground(x, z + 1.5) - y) / 1.5
    if (slope > 0.95 || noise(x * 0.03 + 4, z * 0.03) < 0.28) continue
    ;(z > -150 && x > -175 && x < 370 ? pines : firs).push([x, y, z, 10 + r() * 8])
  }
  // 河滩上的石头
  for (let i = 0; i < 46; i++) { const x = -160 + r() * 500, side = r() < 0.5 ? -1 : 1, z = RIVER_Z + side * (15.4 + r() * 3.4); rocks.push([x, ground(x, z) + 0.1, z, 0.35 + r() * 0.9]) }
  return { leafy, firs, pines, rocks }
}

export function World() {
  const terrain = useMemo(terrainGeo, [])
  const turf = useMemo(() => makeTurf(), [])
  const asphalt = useMemo(() => rep(makeAsphalt(), 1, 1), [])
  const ripple = useRipple([69, 3], 0.03)
  const ns = useMemo(() => new THREE.Vector2(0.35, 0.35), [])
  const line = useMemo(roadLine, [])
  const road = useMemo(() => ribbon(line, 0, ROAD_W, 0.04), [line])
  const edges = useMemo(() => [ribbon(line, ROAD_W / 2 - 0.3, 0.14, 0.055), ribbon(line, -ROAD_W / 2 + 0.3, 0.14, 0.055)], [line])
  const dashes = useMemo(() => {
    const parts: Part[] = []
    for (let i = 2; i < line.length - 1; i += 1) { const [x, z] = line[i], [x2, z2] = line[i + 1], l = Math.hypot(x2 - x, z2 - z); if (l > 2 ? true : i % 6 < 3) parts.push({ p: [(x + x2) / 2, 0.056, (z + z2) / 2], s: [l > 2 ? 2.4 : l, 0.004, 0.14], c: '#e8e6dc', r: [0, Math.atan2(-(z2 - z), x2 - x), 0] }) }
    return mergeParts(parts)
  }, [line])
  const { leafy, firs, pines, rocks } = useMemo(plant, [])
  const [cd, cn, cr] = useConcrete(3, 2)
  const hose6 = useMemo<V3[]>(() => ([[-2.2, 0.93, 0], [-3.4, 0.08, 0.2], [-5.5, 0.06, 2.5], [-8.5, 0.06, 4.2], [-10.5, 0.06, 5.3], [-11, 1.1, 5.76]] as V3[]).map(([x, y, z]) => [P.cannon[0] + x, y, P.cannon[2] + z] as V3), [])
  const hose7 = useMemo<V3[]>(() => [[MUZZLE[0] - 2.2, 0.93, 0], [MUZZLE[0] - 3.4, 0.08, -0.2], [MUZZLE[0] - 5.5, 0.06, -2.2], [MUZZLE[0] - 8.5, 0.06, -3.4], [MUZZLE[0] - 11.6, 0.06, -5.6], [MUZZLE[0] - 12.7, 1.4, -6.5]], [])
  return (
    <group>
      {/* 山谷的地面 */}
      <mesh geometry={terrain} receiveShadow><meshStandardMaterial vertexColors map={turf} roughness={0.96} envMapIntensity={0.55} /></mesh>
      {/* 河水 */}
      <mesh position={[100, LEVEL, RIVER_Z]} rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={[720, 31.5]} />
        <meshPhysicalMaterial color="#3b7c80" transparent opacity={0.88} roughness={0.08} metalness={0.05} normalMap={ripple} normalScale={ns} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={1.3} depthWrite={false} />
      </mesh>
      {/* 路：沥青路面、两道边线、中间的虚线 */}
      <mesh geometry={road} receiveShadow><meshStandardMaterial map={asphalt} roughness={0.9} /></mesh>
      {edges.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#e8e6dc" roughness={0.7} /></mesh>)}
      <mesh geometry={dashes}><meshStandardMaterial vertexColors roughness={0.7} /></mesh>
      {/* 平抛实验台下面的一块混凝土地坪 */}
      <mesh position={[P.bench[0], 0.03, P.bench[2]]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[9, 6]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#bdbab0" /></mesh>
      {/* 喷水训练：长台、供水的消防车和水带 */}
      <group position={[P.cannon[0], 0, P.cannon[2]]}><LongDeck len={22} h={HILL.muzzle} /></group>
      <group position={[P.cannon[0] - 11, 0, P.cannon[2] + 7]}><FireTruck /></group>
      <Hose pts={hose6} r={0.07} />
      {/* 山坡脚下：供水的消防车和水带 */}
      <group position={[MUZZLE[0] - 17, 0, -6.5]}><FireTruck lights /></group>
      <Hose pts={hose7} r={0.07} />
      {/* 空投场：地上画的靶环、风向袋 */}
      <group position={[P.heli[0], 0.06, P.heli[2]]}>
        {[[1.2, 1.9, '#d0271d'], [3.6, 4.1, '#f1efe6'], [6.2, 6.7, '#d0271d']].map(([a, b, c]) => <mesh key={a} rotation-x={-Math.PI / 2}><ringGeometry args={[a as number, b as number, 64]} /><meshStandardMaterial color={c as string} roughness={0.8} /></mesh>)}
        <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[0.6, 32]} /><meshStandardMaterial color="#f1efe6" roughness={0.8} /></mesh>
        <group position={[9, 0, -9]}>
          <mesh position-y={3}><cylinderGeometry args={[0.05, 0.07, 6, 10]} /><meshStandardMaterial color="#d9d7cf" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0.9, 5.8, 0]} rotation-z={-Math.PI / 2 - 0.15}><coneGeometry args={[0.32, 1.8, 14, 1, true]} /><meshStandardMaterial color="#e8651c" roughness={0.8} side={THREE.DoubleSide} /></mesh>
        </group>
      </group>
      {/* 树、针叶林、石头 */}
      {leafy.map(([x, y, z, h, seed]) => <Tree key={seed} x={x} y={y} z={z} h={h} seed={seed} />)}
      <Conifers list={firs} />
      <Pines list={pines} />
      <Rocks list={rocks} />
    </group>
  )
}
/** 各课用的水炮：原点在俯仰轴上 */
/** 水炮画成实物的 2 倍大（示意大小），炮口的俯仰轴离地 HILL.muzzle */
export const MON = 2
export function BigMonitor({ angle }: { angle: number }) { return <group scale={MON}><Monitor angle={angle} pivot={HILL.muzzle / MON} /></group> }
