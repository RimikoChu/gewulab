// 合成氨工厂实验室的大场景：一座化肥厂。最西头是中控化验楼（一层敞着门脸，西半是化验室、东半是中控室，中间一道玻璃隔断），
// 往东是合成区（压缩机厂房、合成塔、冷却器、氨分离器、循环压缩机、管廊），再往东是液氨储罐和尿素造粒塔。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。单位 m。
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LabStage, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { asphaltTex, benchTex, dcsTex, makeSign, rep, slabTex, tileTex, wallTex } from './mats'
import { box, latheArc, rng, type V3 } from './parts'
import { CV, PRILL, Plant, TANK } from './plant'

/** 中控化验楼：x 的范围、后墙和门脸的 z、层高；化验室和中控室的分界 */
export const HALL = { x0: -62, x1: -20, z0: -9, z1: 3, h: 4.6, split: -37 }
/** 化验台：前后沿、台面高；器材摆在 z = BZ 这条线上 */
export const BENCH = { z0: -8.95, z1: -8.2, top: 0.9 }
export const BZ = -8.55, TOP = BENCH.top
const CONSOLE_Z = -4.6
/** 各课器材所在的位置（x） */
export const ST = { l1: -54, l5: -45, wall: -28.5 }

/** 一个机位：看向哪里、要装进画面的宽和高、方位角和仰角、是不是室内、雾的起止 */
export const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], indoor: boolean, fog: [number, number] = [60, 400]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, indoor, fog })
export const SPOT = {
  l1: spot(ST.l1 + 0.0, TOP + 0.3, BZ + 0.12, 1.3, 0.72, [-0.16, 0.3], true),
  l2: spot(ST.l1 + 0.26, TOP + 0.36, BZ + 0.2, 1.05, 0.66, [0.2, 0.18], true),
  l3: spot(CV.x + 3.8, 11.4, CV.z, 17, 19.5, [-0.2, 0.08], false, [80, 700]),
  l4: spot(ST.wall + 0.42, 2.15, HALL.z0 + 0.4, 7.5, 2.9, [0.04, 0.08], true),
  l5: spot(ST.l5 - 0.13, TOP + 0.24, BZ + 0.1, 0.86, 0.46, [0.08, 0.3], true),
  l6: spot(CV.x - 0.5, 11.5, CV.z, 15, 23, [-0.62, 0.1], false, [80, 700]),
  l7: spot(17, 7, -9, 54, 22, [0.16, 0.36], false, [150, 900]),
  xt: spot(TANK.x - 2, 8, TANK.z, 34, 22, [-0.35, 0.2], false, [200, 1200]),
  xp: spot(PRILL.x + 4, 34, PRILL.z, 40, 76, [-0.3, 0.1], false, [200, 1400]),
  q: spot(15, 9, -10, 68, 30, [-0.55, 0.16], false, [300, 1600]),
}
export type SpotKey = keyof typeof SPOT
export type Spot = ReturnType<typeof spot>

/** 每一课交给世界的要求：工作灯跟到哪；是不是室内；合成塔剖不剖开、床层温度、管道里的气流 */
export interface Want { x: number; indoor: boolean; cut: boolean; temp: number; flow: number; speed: number }

/** 这一课的舞台：选一处机位。室内点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳 */
export function Place({ at, labels, children = null, cut = false, temp = 450, flow = 0, speed = 1 }: { at: SpotKey | Spot; labels: Label[]; children?: ReactNode; cut?: boolean; temp?: number; flow?: number; speed?: number }) {
  const v = typeof at === 'string' ? SPOT[at] : at
  const want = useMemo<Want>(() => ({ x: v.target.x, indoor: v.indoor, cut, temp, flow, speed }), [v, cut, temp, flow, speed])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.indoor ? 1.0 : 2.6} env={v.indoor ? 0.6 : 0.9} studio={v.indoor} fog={v.fog} bloom={v.indoor ? 0.5 : 0.6} world={want}>{children}</LabStage>
}

// ---------- 中控化验楼 ----------
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH
  // 门脸上的柱子和大梁；后墙上的壁柱
  for (let x = H.x0; x <= H.x1 + 0.01; x += 6) { P.push(box(x, 0, H.z1 - 0.3, 0.5, H.h, 0.5, '#e4e4df')); if (x < H.split || x > H.x1 - 1) P.push(box(x, 0, H.z0 + 0.2, 0.45, H.h, 0.4, '#e9e9e4')) }
  P.push(box((H.x0 + H.x1) / 2, H.h - 0.6, H.z1 - 0.3, H.x1 - H.x0, 0.6, 0.55, '#d9d8d1'))
  // 化验台：西半一条长的柜体，柜门一扇扇，每扇一只拉手
  for (let x = H.x0 + 0.6; x < H.split - 0.8; x += 0.9) {
    P.push(box(x + 0.45, 0.1, B.z1 - 0.02, 0.86, TOP - 0.16, 0.04, '#d7dad8'))
    P.push(box(x + 0.45, TOP - 0.16, B.z1, 0.24, 0.025, 0.03, '#7b8085'))
  }
  P.push(box((H.x0 + H.split) / 2, 0, (B.z0 + B.z1) / 2, H.split - H.x0 - 1, 0.1, B.z1 - B.z0 - 0.1, '#3d4146'))
  // 台面后面的挡板、试剂架（两层搁板）、一条插座带
  P.push(box((H.x0 + H.split) / 2, TOP, B.z0 + 0.04, H.split - H.x0 - 1, 0.32, 0.06, '#dfe2df'))
  for (const y of [TOP + 0.62, TOP + 0.98]) P.push(box((H.x0 + H.split) / 2, y, B.z0 + 0.14, H.split - H.x0 - 1, 0.025, 0.24, '#c9ccc9'))
  for (let x = H.x0 + 1; x < H.split - 1; x += 3) P.push(box(x, TOP + 0.04, B.z0 + 0.03, 0.03, 1.0, 0.03, '#a8aca9'))
  // 墙上的吊柜
  for (let x = H.x0 + 2; x < H.split - 2; x += 4.5) {
    P.push(box(x, TOP + 1.35, H.z0 + 0.25, 3.6, 0.7, 0.4, '#e8e7e1'))
    P.push(box(x, TOP + 1.35, H.z0 + 0.46, 0.02, 0.7, 0.02, '#a8aca9'))
  }
  // 两格之间的水槽
  P.push(box(-49.5, TOP - 0.02, (B.z0 + B.z1) / 2 + 0.05, 0.6, 0.04, 0.45, '#9aa0a4'))
  P.push({ p: [-49.5, TOP + 0.3, B.z0 + 0.12], s: [0.015, 0.6, 0.015], c: '#c6cbce', cyl: true })
  // 玻璃隔断的竖框
  for (let z = H.z0; z <= H.z1 - 0.5; z += 1.5) P.push(box(H.split, 0, z, 0.08, H.h - 0.6, 0.08, '#8d9396'))
  P.push(box(H.split, H.h - 0.7, (H.z0 + H.z1) / 2, 0.12, 0.12, H.z1 - H.z0, '#8d9396'), box(H.split, 0, (H.z0 + H.z1) / 2, 0.12, 0.1, H.z1 - H.z0, '#8d9396'))
  // 中控室：大屏下面的底座柜（弧形操作台另做，见 Console）
  P.push(box(ST.wall, 0, H.z0 + 0.35, 9.2, 0.9, 0.5, '#2a2e32'))
  return P
}
/** 楼的外壳：屋顶、女儿墙、后墙外侧，门脸两边的实墙 */
function buildingParts() {
  const P: Part[] = [], H = HALL
  P.push(box((H.x0 + H.x1) / 2, H.h, (H.z0 + H.z1) / 2, H.x1 - H.x0 + 1, 0.45, H.z1 - H.z0 + 0.8, '#d6d2c8'))
  P.push(box((H.x0 + H.x1) / 2, H.h + 0.45, (H.z0 + H.z1) / 2, H.x1 - H.x0 + 1.4, 3.6, H.z1 - H.z0 + 1.2, '#e1ddd2'))
  P.push(box((H.x0 + H.x1) / 2, H.h + 4.05, (H.z0 + H.z1) / 2, H.x1 - H.x0 + 1.8, 0.5, H.z1 - H.z0 + 1.6, '#bdb8ad'))
  for (let x = H.x0 + 2; x < H.x1 - 1; x += 3.2) P.push(box(x, H.h + 1.1, H.z1 + 0.62, 1.9, 1.9, 0.08, '#33454f'))
  return P
}
/** 吊柜里、试剂架上的试剂瓶 */
function bottles() {
  const P: Part[] = [], r = rng(17)
  for (const y of [TOP + 0.645, TOP + 1.005]) for (let x = HALL.x0 + 0.8; x < HALL.split - 0.8; x += 0.11) {
    if (r() < 0.3 || Math.abs(x - ST.l1) < 0.9 || Math.abs(x - ST.l5) < 0.9) continue
    const rad = 0.03 + r() * 0.02, h = 0.12 + r() * 0.1, z = BENCH.z0 + 0.12 + (r() - 0.5) * 0.08
    const col = r() < 0.5 ? '#5a3214' : '#b9cccf'
    P.push({ p: [x, y + h / 2, z], s: [rad, h, rad], c: col, cyl: true }, { p: [x, y + h + 0.02, z], s: [rad * 0.55, 0.04, rad * 0.55], c: r() < 0.5 ? '#1f2124' : '#d6d4cc', cyl: true })
  }
  return mergeParts(P)
}
/** 平铺的薄板：x0–x1、y0–y1、z0–z1，uv 按 k m 一格 */
export function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k: number) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const [u, v] = ay > 0.5 ? [p.getX(i), p.getZ(i)] : ax > 0.5 ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)]; uv.setXY(i, u / k, v / k) }
  return g
}
/** 中控室的弧形操作台：一段圆弧形的台体和台面，前沿包边；五个工位，每个工位三台显示器（有流程画面）、一副键盘和鼠标 */
function Console({ dcs }: { dcs: THREE.Texture }) {
  const RAD = 7, cx = ST.wall, cz = CONSOLE_Z + RAD, half = 0.55
  const geo = useMemo(() => {
    const arc = (p: [number, number][]) => latheArc(p, Math.PI / 2 - half, half * 2, { segs: 64 })
    return {
      body: arc([[RAD - 0.32, 0.08], [RAD + 0.36, 0.08], [RAD + 0.36, 0.72], [RAD - 0.32, 0.72]]),
      kick: arc([[RAD - 0.22, 0], [RAD + 0.3, 0], [RAD + 0.3, 0.08], [RAD - 0.22, 0.08]]),
      top: arc([[RAD - 0.48, 0.72], [RAD + 0.42, 0.72], [RAD + 0.42, 0.755], [RAD - 0.48, 0.755]]),
      edge: arc([[RAD - 0.52, 0.7], [RAD - 0.47, 0.7], [RAD - 0.47, 0.765], [RAD - 0.52, 0.765]]),
      riser: arc([[RAD + 0.26, 0.755], [RAD + 0.4, 0.755], [RAD + 0.4, 0.83], [RAD + 0.26, 0.83]]),
    }
  }, [])
  /** 圆弧上角度 t 处、半径 r 的位置，以及正对圆心的转角 */
  const at = (t: number, r: number, y: number) => ({ position: [cx + r * Math.cos(t), y, cz - r * Math.sin(t)] as V3, rot: Math.atan2(-Math.cos(t), Math.sin(t)) })
  const seats = [-2, -1, 0, 1, 2].map(i => Math.PI / 2 + i * 0.2)
  return <group>
    <mesh geometry={geo.body} position={[cx, 0, cz]} castShadow receiveShadow><meshStandardMaterial attach="material-0" color="#5d646b" roughness={0.5} metalness={0.3} /><meshStandardMaterial attach="material-1" color="#5d646b" /></mesh>
    <mesh geometry={geo.kick} position={[cx, 0, cz]}><meshStandardMaterial attach="material-0" color="#26292c" roughness={0.6} /><meshStandardMaterial attach="material-1" color="#26292c" /></mesh>
    <mesh geometry={geo.top} position={[cx, 0, cz]} castShadow receiveShadow><meshPhysicalMaterial attach="material-0" color="#c9c3b6" roughness={0.45} clearcoat={0.4} /><meshStandardMaterial attach="material-1" color="#c9c3b6" /></mesh>
    <mesh geometry={geo.edge} position={[cx, 0, cz]}><meshStandardMaterial attach="material-0" color="#2b2f33" roughness={0.4} /><meshStandardMaterial attach="material-1" color="#2b2f33" /></mesh>
    <mesh geometry={geo.riser} position={[cx, 0, cz]} castShadow><meshStandardMaterial attach="material-0" color="#3a3f44" roughness={0.5} /><meshStandardMaterial attach="material-1" color="#3a3f44" /></mesh>
    {seats.flatMap((t0, i) => [-0.075, 0, 0.075].map((d, j) => {
      const m = at(t0 + d, RAD + 0.24, 1.06), tilt = j === 1 ? 0 : -d * 2.2
      return <group key={`${i}${j}`} position={m.position} rotation-y={m.rot + tilt}>
        <mesh castShadow><boxGeometry args={[0.56, 0.35, 0.03]} /><meshStandardMaterial color="#16181b" roughness={0.4} metalness={0.3} /></mesh>
        <mesh position-z={0.0155}><planeGeometry args={[0.53, 0.32]} /><meshBasicMaterial map={dcs} toneMapped={false} color="#c8d2da" /></mesh>
        <mesh position={[0, -0.22, -0.03]}><boxGeometry args={[0.05, 0.12, 0.03]} /><meshStandardMaterial color="#2a2e32" /></mesh>
      </group>
    }))}
    {seats.map((t, i) => { const k = at(t, RAD - 0.22, 0.762), mo = at(t - 0.04, RAD - 0.2, 0.762); return <group key={`k${i}`}>
      <mesh position={k.position} rotation-y={k.rot} castShadow><boxGeometry args={[0.46, 0.018, 0.15]} /><meshStandardMaterial color="#2a2d31" roughness={0.6} /></mesh>
      <mesh position={mo.position} rotation-y={mo.rot}><boxGeometry args={[0.06, 0.02, 0.1]} /><meshStandardMaterial color="#2a2d31" roughness={0.6} /></mesh>
    </group> })}
  </group>
}
/** 厂区绿化：道路两侧和楼前的草坪、一排排行道树（树干加两团树冠，逐棵高矮和颜色略有不同）；道路边线和人行横道 */
function Greenery() {
  const trees = useMemo(() => {
    const r = rng(29), out: { p: V3; s: number; c: THREE.Color }[] = []
    const row = (x0: number, x1: number, z: number, step: number) => { for (let x = x0; x <= x1; x += step) out.push({ p: [x + (r() - 0.5) * 1.5, 0, z + (r() - 0.5) * 1.2], s: 0.8 + r() * 0.5, c: new THREE.Color().setHSL(0.25 + r() * 0.06, 0.45 + r() * 0.15, 0.13 + r() * 0.06) }) }
    row(-70, 120, 24.5, 7); row(-66, 120, 28.5, 9); row(-60, 110, 44, 23); row(-50, 110, 58, 29); row(-18, 58, -31, 8); row(-60, -22, 7.5, 6); row(-80, -66, -20, 5); row(100, 125, -5, 6)
    return out
  }, [])
  const trunk = useRef<THREE.InstancedMesh>(null), crown = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const o = new THREE.Object3D()
    trees.forEach((t, i) => {
      o.position.set(t.p[0], 1.2 * t.s, t.p[2]); o.scale.set(t.s, t.s, t.s); o.rotation.set(0, 0, 0); o.updateMatrix(); trunk.current?.setMatrixAt(i, o.matrix)
      for (const k of [0, 1]) { o.position.set(t.p[0] + k * 0.6, (3.4 + k * 1.3) * t.s, t.p[2] - k * 0.3); o.scale.set(t.s * (1.9 - k * 0.6), t.s * (1.7 - k * 0.5), t.s * (1.9 - k * 0.6)); o.rotation.set(0, i + k, 0); o.updateMatrix(); crown.current?.setMatrixAt(i * 2 + k, o.matrix); crown.current?.setColorAt(i * 2 + k, t.c) }
    })
    for (const m of [trunk.current, crown.current]) if (m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true }
  }, [trees])
  const crownGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const grass = <meshStandardMaterial color="#5e7448" roughness={1} />
  return <group>
    {([[25, 24.7, 190, 8.4], [25, 50, 200, 42], [-41, 7.6, 42, 6.6], [20, -31, 80, 6], [-73, -20, 16, 30], [112, -5, 28, 40]] as const).map(([x, z, w, d], i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.02, z]} receiveShadow><planeGeometry args={[w, d]} />{grass}</mesh>)}
    {/* 路缘石 */}
    {[11.25, 20.75].map(z => <mesh key={z} position={[25, 0.08, z]} receiveShadow><boxGeometry args={[300, 0.16, 0.3]} /><meshStandardMaterial color="#bdb9ae" roughness={0.9} /></mesh>)}
    {[11.9, 20.1].map(z => <mesh key={z} rotation-x={-Math.PI / 2} position={[25, 0.032, z]}><planeGeometry args={[300, 0.15]} /><meshStandardMaterial color="#e8e4d6" roughness={0.8} /></mesh>)}
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[-40 + i * 0.9 - 3.15, 0.033, 16]}><planeGeometry args={[0.5, 7.6]} /><meshStandardMaterial color="#e8e4d6" roughness={0.8} /></mesh>)}
    <instancedMesh ref={trunk} args={[undefined, undefined, trees.length]} castShadow><cylinderGeometry args={[0.12, 0.18, 2.4, 8]} /><meshStandardMaterial color="#5a4632" roughness={0.9} /></instancedMesh>
    <instancedMesh ref={crown} args={[crownGeo, undefined, trees.length * 2]} castShadow receiveShadow><meshStandardMaterial roughness={0.9} flatShading /></instancedMesh>
  </group>
}
/** 室内的工作灯：跟着当前这一课从前上方打下来，只在室内的课亮 */
function Key({ x, on }: { x: number; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 1.2, HALL.h - 0.4, BZ + 4.2); aim.position.set(cur.current, TOP + 0.2, BZ); aim.updateMatrixWorld()
    l.intensity += ((on ? 60 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.55} penumbra={0.9} intensity={0} distance={18} decay={1.4} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.01} />
  </>
}

export function World({ x = ST.l1, indoor = true, cut = false, temp = 450, flow = 0, speed = 1 }: Partial<Want>) {
  const tex = useMemo(() => ({
    ground: rep(asphaltTex(), 120, 120), slab: rep(slabTex(), 1, 1), tile: rep(tileTex(), 1, 1), bench: rep(benchTex(), 6, 1), wall: rep(wallTex(), 1, 1),
    name: makeSign(['中控化验楼'], '#2b5f86', '#ffffff', 768, 128), lab: makeSign(['化验室'], '#e9e7e0', '#2b2c2e', 384, 96), ctrl: makeSign(['合成氨装置 中控室'], '#1f2a33', '#e8eef2', 768, 96), dcs: dcsTex(),
  }), [])
  const geo = useMemo(() => {
    const H = HALL
    return {
      hall: mergeParts(hallParts()), bottles: bottles(), outside: mergeParts(buildingParts()),
      floor: slab(H.x0, H.x1, 0, 0.05, H.z0, H.z1, 1.2), back: slab(H.x0, H.x1, 0, H.h, H.z0 - 0.3, H.z0, 2),
      ends: [slab(H.x0 - 0.3, H.x0, 0, H.h, H.z0, H.z1, 2), slab(H.x1, H.x1 + 0.3, 0, H.h, H.z0, H.z1, 2)],
      ceil: slab(H.x0, H.x1, H.h - 0.05, H.h, H.z0, H.z1, 2),
      top: slab(H.x0 + 0.5, H.split - 0.5, TOP - 0.04, TOP, BENCH.z0, BENCH.z1, 1),
    }
  }, [])
  return (
    <group>
      <hemisphereLight args={['#eef2f6', '#8a8276', indoor ? 0.55 : 0.35]} />
      <Key x={x} on={indoor} />
      {/* 厂区地面：沥青，设备区一片混凝土地坪，一条东西向的主路 */}
      <mesh rotation-x={-Math.PI / 2} position={[20, -0.02, -40]} receiveShadow><planeGeometry args={[1600, 1200]} /><meshStandardMaterial map={tex.ground} color="#9a9894" roughness={0.95} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[35, 0.01, -8]} receiveShadow><planeGeometry args={[100, 34]} /><meshStandardMaterial map={rep(slabTex(), 100 / 6, 34 / 6)} color="#8f8d88" roughness={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[20, 0.015, 16]} receiveShadow><planeGeometry args={[300, 9]} /><meshStandardMaterial map={rep(asphaltTex(), 30, 1)} color="#7d7c78" roughness={0.92} /></mesh>
      {Array.from({ length: 50 }, (_, i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[-130 + i * 6, 0.03, 16]}><planeGeometry args={[3, 0.15]} /><meshStandardMaterial color="#e8e4d6" roughness={0.8} /></mesh>)}
      {/* 中控化验楼 */}
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>
      <mesh position={[(HALL.x0 + HALL.split) / 2, 0.06, HALL.z0 + 0.01]}><planeGeometry args={[HALL.split - HALL.x0, 0.12]} /><meshStandardMaterial color="#8a8f92" roughness={0.8} /></mesh>
      {geo.ends.map((g, i) => <mesh key={i} geometry={g} receiveShadow castShadow><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>)}
      <mesh geometry={geo.ceil}><meshStandardMaterial color="#dadad5" roughness={0.9} /></mesh>
      {Array.from({ length: 7 }, (_, i) => HALL.x0 + 3 + i * 6).flatMap(cx => [-6.5, -2].map(cz => <mesh key={`${cx}${cz}`} position={[cx, HALL.h - 0.06, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[1.2, 0.6]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
      <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.9} /></mesh>
      {/* 玻璃隔断 */}
      <mesh position={[HALL.split, (HALL.h - 0.6) / 2, (HALL.z0 + HALL.z1) / 2]} rotation-y={Math.PI / 2} renderOrder={3}><planeGeometry args={[HALL.z1 - HALL.z0, HALL.h - 0.6]} /><meshPhysicalMaterial color="#cfe2e3" transparent opacity={0.1} roughness={0.03} clearcoat={1} envMapIntensity={2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      {/* 牌子 */}
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.h + 2.3, HALL.z1 + 0.68]}><planeGeometry args={[9, 1.5]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <mesh position={[-58, TOP + 2.35, HALL.z0 + 0.02]}><planeGeometry args={[1.4, 0.35]} /><meshStandardMaterial map={tex.lab} roughness={0.7} /></mesh>
      <mesh position={[ST.wall, 4.05, HALL.z0 + 0.03]}><planeGeometry args={[4.2, 0.52]} /><meshStandardMaterial map={tex.ctrl} roughness={0.7} /></mesh>
      <Console dcs={tex.dcs} />
      <mesh geometry={geo.outside} castShadow receiveShadow><Painted rough={0.85} metal={0} /></mesh>
      {/* 合成区、罐区、远景 */}
      <Plant cut={cut} temp={temp} flow={flow} speed={speed} />
      <Greenery />
    </group>
  )
}
export type { V3 }
