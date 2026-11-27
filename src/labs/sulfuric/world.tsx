// 接触法制硫酸实验室的大场景：一座硫酸厂。最西头是中控化验楼（一层敞着门脸，里面一条化验台），往东依次是原料棚、沸腾炉、
// 净化工段、鼓风机、热交换器、接触室、吸收塔、尾气吸收塔和烟囱，最东头是成品酸罐和装车台。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。各课的机位写在 SPOT 里。单位 m。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LabStage, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { asphaltTex, benchTex, makeSign, rep, slabTex, tileTex, wallTex } from './mats'
import { box, rng } from './parts'
import { ABS, Absorber, Blower, CONV, Converter, Cyclone, Exchanger, HXV, Pipes, Precipitator, ROAST, Roaster, Stack, TailTower, WashTowers } from './plant'
import { AcidTanks, Distant, Greenery, LOAD, LoadingBay, OreYard, TANKS, Tanker } from './site'

/** 中控化验楼：x 的范围、后墙和门脸的 z、层高 */
export const HALL = { x0: -92, x1: -66, z0: -9, z1: 3, h: 4.6 }
/** 化验台：前后沿、台面高；器材摆在 z = BZ 这条线上 */
export const BENCH = { z0: -8.95, z1: -8.15, top: 0.9 }
export const BZ = -8.52, TOP = BENCH.top
/** 第 7 课三个小实验在化验台上的位置（x） */
export const ST = { a: -84.2, b: -80, c: -75.6 }

/** 一个机位：看向哪里、要装进画面的宽和高、方位角和仰角、是不是室内、雾的起止 */
export const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], indoor: boolean, fog: [number, number] = [90, 700]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, indoor, fog })
export const SPOT = {
  l1: spot(ROAST.x + 0.3, 10.2, 0, 11.5, 21.5, [-0.2, 0.16], false),
  l2: spot(8, 9.2, 0, 33, 16, [0.22, 0.26], false, [120, 800]),
  l3: spot(CONV.x, 10.6, 0, 11, 17.5, [0.16, 0.17], false),
  l4: spot(CONV.x, 10.6, 0, 15, 21, [-0.55, 0.12], false),
  l5: spot(40, 9.2, 0, 31, 22, [0.5, 0.4], false, [120, 800]),
  l6: spot(ABS.x + 5.2, 11.2, 0, 27, 24, [-0.14, 0.16], false, [120, 800]),
  a: spot(ST.a - 0.05, TOP + 0.085, BZ - 0.03, 0.3, 0.17, [-0.14, 0.13], true),
  b: spot(ST.b + 0.03, TOP + 0.11, BZ - 0.02, 0.3, 0.2, [0.12, 0.13], true),
  c: spot(ST.c + 0.05, TOP + 0.2, BZ, 0.42, 0.37, [0.14, 0.1], true),
  xh: spot(HXV.x + 0.4, 7.8, 0, 11, 13.5, [-0.2, 0.16], false),
  xt: spot(TANKS.x + 5.5, 4.8, 3, 30, 15, [0.42, 0.22], false, [150, 900]),
  q: spot(36, 25, 0, 92, 30, [-0.36, 0.13], false, [300, 1600]),
}
export type SpotKey = keyof typeof SPOT
/** 哪台设备朝镜头剖开 */
export type Cut = '' | 'roast' | 'conv' | 'abs' | 'hx'
/** 每一课交给世界的要求：工作灯跟到哪；是不是室内；剖开哪台设备；接触室床层有多热（0–1）；装车鹤管放下多少；接触室里装没装催化剂 */
export interface Want { x: number; indoor: boolean; cut: Cut; hot: number; arm: number; beds: boolean }

/** 这一课的舞台：选一处机位。室内点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳 */
export function Place({ at, labels, children = null, cut = '', hot = 0, arm = 0, beds = true }: { at: SpotKey; labels: Label[]; children?: ReactNode; cut?: Cut; hot?: number; arm?: number; beds?: boolean }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, indoor: v.indoor, cut, hot, arm, beds }), [v, cut, hot, arm, beds])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.indoor ? 1.0 : 2.7} env={v.indoor ? 0.6 : 0.9} studio={v.indoor} fog={v.fog} bloom={v.indoor ? 0.4 : 0.55} world={want}>{children}</LabStage>
}

// ---------- 中控化验楼 ----------
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH, len = H.x1 - H.x0, cx = (H.x0 + H.x1) / 2
  // 门脸上的柱子和大梁；后墙上的壁柱
  for (let x = H.x0; x <= H.x1 + 0.01; x += 6.5) P.push(box(x, 0, H.z1 - 0.3, 0.5, H.h, 0.5, '#e4e4df'), box(x, 0, H.z0 + 0.2, 0.45, H.h, 0.4, '#e9e9e4'))
  P.push(box(cx, H.h - 0.6, H.z1 - 0.3, len, 0.6, 0.55, '#d9d8d1'))
  // 化验台：一条长的柜体，柜门一扇扇，每扇一只拉手
  for (let x = H.x0 + 0.6; x < H.x1 - 1.2; x += 0.9) P.push(box(x + 0.45, 0.1, B.z1 - 0.02, 0.86, TOP - 0.16, 0.04, '#d7dad8'), box(x + 0.45, TOP - 0.16, B.z1, 0.24, 0.025, 0.03, '#7b8085'))
  P.push(box(cx, 0, (B.z0 + B.z1) / 2, len - 1, 0.1, B.z1 - B.z0 - 0.1, '#3d4146'))
  // 台面后面的挡板、试剂架（两层搁板）和立杆
  P.push(box(cx, TOP, B.z0 + 0.04, len - 1, 0.32, 0.06, '#dfe2df'))
  for (const y of [TOP + 0.66, TOP + 1.02]) P.push(box(cx, y, B.z0 + 0.14, len - 1, 0.025, 0.24, '#c9ccc9'))
  for (let x = H.x0 + 1; x < H.x1 - 1; x += 3) P.push(box(x, TOP + 0.04, B.z0 + 0.03, 0.03, 1.0, 0.03, '#a8aca9'))
  // 台面靠墙一条矮试剂架：一块搁板，下面隔一段一块立板
  P.push(box(cx, TOP + 0.2, B.z0 + 0.13, len - 1, 0.018, 0.2, '#e3e1d8'), box(cx, TOP + 0.218, B.z0 + 0.035, len - 1, 0.05, 0.012, '#cfcdc4'))
  for (let x = H.x0 + 0.6; x < H.x1 - 0.5; x += 0.6) P.push(box(x, TOP, B.z0 + 0.13, 0.018, 0.2, 0.2, '#e3e1d8'))
  // 墙上的吊柜
  for (let x = H.x0 + 2.6; x < H.x1 - 2; x += 4.5) P.push(box(x, TOP + 1.4, H.z0 + 0.25, 3.6, 0.7, 0.4, '#e8e7e1'), box(x, TOP + 1.4, H.z0 + 0.46, 0.02, 0.7, 0.02, '#a8aca9'))
  // 一只水槽和水龙头
  P.push(box(-87.6, TOP - 0.02, (B.z0 + B.z1) / 2 + 0.05, 0.6, 0.04, 0.45, '#9aa0a4'))
  P.push({ p: [-87.6, TOP + 0.3, B.z0 + 0.12], s: [0.015, 0.6, 0.015], c: '#c6cbce', cyl: true })
  // 屋里靠门脸一侧的两张中控台（方的，带屏）
  for (const x of [-72, -77]) P.push(box(x, 0, -2.2, 3.2, 0.78, 0.9, '#5d646b'), box(x, 0.78, -2.2, 3.3, 0.04, 1.0, '#c9c3b6'), box(x - 0.8, 0.9, -2.5, 0.6, 0.38, 0.03, '#16181b'), box(x, 0.9, -2.5, 0.6, 0.38, 0.03, '#16181b'), box(x + 0.8, 0.9, -2.5, 0.6, 0.38, 0.03, '#16181b'))
  return P
}
/** 楼的外壳：屋顶、二层、女儿墙、二层的窗 */
function buildingParts() {
  const P: Part[] = [], H = HALL, len = H.x1 - H.x0, cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2, d = H.z1 - H.z0
  P.push(box(cx, H.h, cz, len + 1, 0.45, d + 0.8, '#d6d2c8'), box(cx, H.h + 0.45, cz, len + 1.4, 3.6, d + 1.2, '#e1ddd2'), box(cx, H.h + 4.05, cz, len + 1.8, 0.5, d + 1.6, '#bdb8ad'))
  for (let x = H.x0 + 2; x < H.x1 - 1; x += 3.2) P.push(box(x, H.h + 1.1, H.z1 + 0.62, 1.9, 1.9, 0.08, '#33454f'), box(x, H.h + 1.0, H.z1 + 0.66, 2.1, 0.1, 0.12, '#c9c5ba'))
  return P
}
/** 试剂架上的试剂瓶：留出三个小实验背后的位置，瓶子稀一些 */
function bottles() {
  const P: Part[] = [], r = rng(17)
  for (const y of [TOP + 0.218, TOP + 0.685, TOP + 1.045]) for (let x = HALL.x0 + 0.8; x < HALL.x1 - 0.8; x += 0.1) {
    if (r() < 0.3) continue
    const rad = 0.022 + r() * 0.016, h = 0.09 + r() * 0.08, z = BENCH.z0 + 0.12 + (r() - 0.5) * 0.08
    const col = r() < 0.5 ? '#5a3214' : '#b9cccf'
    P.push({ p: [x, y + h / 2, z], s: [rad, h, rad], c: col, cyl: true }, { p: [x, y + h + 0.02, z], s: [rad * 0.55, 0.04, rad * 0.55], c: r() < 0.5 ? '#1f2124' : '#d6d4cc', cyl: true })
  }
  return mergeParts(P)
}
/** 平铺的薄板：x0–x1、y0–y1、z0–z1，贴图按 k m 一格 */
function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k: number) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const [u, v] = ay > 0.5 ? [p.getX(i), p.getZ(i)] : ax > 0.5 ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)]; uv.setXY(i, u / k, v / k) }
  return g
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
function Hall() {
  const H = HALL
  const tex = useMemo(() => ({ tile: rep(tileTex(), 1, 1), bench: rep(benchTex(), 3, 3), splash: rep(tileTex(), (HALL.x1 - HALL.x0 - 1) / 0.3, 1.0 / 0.3), wall: rep(wallTex(), 1, 1), name: makeSign(['中控化验楼'], '#2b5f86', '#ffffff', 768, 128), lab: makeSign(['化验室'], '#e9e7e0', '#2b2c2e', 384, 96) }), [])
  const geo = useMemo(() => ({
    hall: mergeParts(hallParts()), bottles: bottles(), outside: mergeParts(buildingParts()),
    floor: slab(H.x0, H.x1, 0, 0.05, H.z0, H.z1, 1.2), back: slab(H.x0, H.x1, 0, H.h, H.z0 - 0.3, H.z0, 2),
    ends: [slab(H.x0 - 0.3, H.x0, 0, H.h, H.z0, H.z1, 2), slab(H.x1, H.x1 + 0.3, 0, H.h, H.z0, H.z1, 2)],
    ceil: slab(H.x0, H.x1, H.h - 0.05, H.h, H.z0, H.z1, 2),
    top: slab(H.x0 + 0.5, H.x1 - 0.5, TOP - 0.04, TOP, BENCH.z0, BENCH.z1, 1),
  }), [H])
  return <group>
    <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
    <mesh geometry={geo.back} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>
    {geo.ends.map((g, i) => <mesh key={i} geometry={g} receiveShadow castShadow><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>)}
    <mesh geometry={geo.ceil}><meshStandardMaterial color="#dadad5" roughness={0.9} /></mesh>
    {Array.from({ length: 4 }, (_, i) => H.x0 + 3.5 + i * 6.4).flatMap(cx => [-6.5, -2].map(cz => <mesh key={`${cx}${cz}`} position={[cx, H.h - 0.06, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[1.2, 0.6]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
    <mesh position={[(H.x0 + H.x1) / 2, TOP + 0.5, H.z0 + 0.075]} receiveShadow><planeGeometry args={[H.x1 - H.x0 - 1, 1.0]} /><meshPhysicalMaterial map={tex.splash} roughness={0.25} clearcoat={0.5} /></mesh>
    <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
    <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.5} clearcoat={0.3} clearcoatRoughness={0.4} /></mesh>
    <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.9} /></mesh>
    <mesh position={[(H.x0 + H.x1) / 2, H.h + 2.3, H.z1 + 0.68]}><planeGeometry args={[9, 1.5]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
    <mesh position={[-89.5, TOP + 2.45, H.z0 + 0.02]}><planeGeometry args={[1.4, 0.35]} /><meshStandardMaterial map={tex.lab} roughness={0.7} /></mesh>
    <mesh geometry={geo.outside} castShadow receiveShadow><Painted rough={0.85} metal={0} /></mesh>
  </group>
}

export function World({ x = ROAST.x, indoor = false, cut = '', hot = 0, arm = 0, beds = true }: Partial<Want>) {
  const tex = useMemo(() => ({ ground: rep(asphaltTex(), 120, 120), slab: rep(slabTex(), 120 / 6, 34 / 6), road: rep(asphaltTex(), 30, 1) }), [])
  return (
    <group>
      <hemisphereLight args={['#eef2f6', '#8a8276', indoor ? 0.55 : 0.35]} />
      <Key x={x} on={indoor} />
      {/* 厂区地面：沥青，设备区一片混凝土地坪，一条东西向的主路 */}
      <mesh rotation-x={-Math.PI / 2} position={[20, -0.02, -40]} receiveShadow><planeGeometry args={[1600, 1200]} /><meshStandardMaterial map={tex.ground} color="#9a9894" roughness={0.95} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[32, 0.01, -5]} receiveShadow><planeGeometry args={[120, 34]} /><meshStandardMaterial map={tex.slab} color="#8f8d88" roughness={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[10, 0.015, 19.5]} receiveShadow><planeGeometry args={[300, 10]} /><meshStandardMaterial map={tex.road} color="#7d7c78" roughness={0.92} /></mesh>
      {Array.from({ length: 50 }, (_, i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[-140 + i * 6, 0.03, 19.5]}><planeGeometry args={[3, 0.15]} /><meshStandardMaterial color="#e8e4d6" roughness={0.8} /></mesh>)}
      <Hall />
      <OreYard />
      <Roaster cut={cut === 'roast'} />
      <Cyclone />
      <Precipitator />
      <WashTowers />
      <Blower />
      <Exchanger cut={cut === 'hx'} />
      <Converter cut={cut === 'conv'} hot={hot} beds={beds} />
      <Absorber cut={cut === 'abs'} />
      <TailTower />
      <Stack />
      <Pipes />
      <AcidTanks />
      <LoadingBay arm={arm} />
      <Tanker at={[LOAD.x, 0, LOAD.z]} />
      <Distant />
      <Greenery />
    </group>
  )
}
