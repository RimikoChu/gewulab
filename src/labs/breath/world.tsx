// 呼吸实验室的大场景：科学馆里的呼吸展厅。正中一根展柱托着半身的胸腔模型；左边展台上是头颈部的剖面模型和气管内壁的放大镜球；
// 右肺旁边和下方悬着肺泡、肺泡壁两个放大模型；右边一张实验台上是钟罩模型和两瓶澄清石灰水。远处的弧形墙上一圈灯环随呼吸明暗。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 个单位 = 10 cm。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal, disc, makeGround } from '@/lab-kit'
import { Chest, LOOK0, breathLive, type ChestLook } from './chest'
import { Cilia, HEAD_S, HeadModel, HeadPlinth } from './head'
import { Magnifier } from './zoom'
import { AlveolarSac, AlveolarWall } from './alveoli'
import { Bench, BellJar, Flask, Hose, HoseFlow, Mouthpiece, Stand, Syringe } from './bench'
import type { GasKey } from './physics'
import type { V3 } from './sdf'

/** 各处的位置 */
export const HEAD_AT: V3 = [-14.0, 9.6, 22.0]
export const CILIA_AT: V3 = [-26.0, 14.2, 23.0]
export const ALV_AT: V3 = [1.5, 14.0, 22.0]
export const WALL_AT: V3 = [1.5, 8.4, 22.4]
export const BENCH = { at: [16.5, 0, 22.5] as V3, top: 8.2, w: 12, d: 3.2 }
export const JAR_AT: V3 = [20.4, BENCH.top, 22.3]
export const FLASK_AT: V3 = [13.4, BENCH.top, 22.3]
/** 两根胶皮管（cm，石灰水那一组的坐标）：从瓶上的长管口接到吹气嘴、注射器 */
const HOSE_A: V3[] = [[-9.5, 18.1, 0], [-12, 17.5, 0.5], [-14, 10, 2], [-15.5, 2.5, 4], [-17.5, 0.6, 5]]
const HOSE_B: V3[] = [[9.5, 18.1, 0], [12.5, 17, 0], [16, 9, -0.6], [19, 3.2, -1.3], [21, 2.4, -1.5]]
/** 钟罩下口离台面多高（cm） */
export const JAR_LIFT = 9

const PI = Math.PI
/**
 * 头颈部模型、放大镜球、实验台都摆在胸腔模型的正前方一排，转过身来朝着胸腔模型（绕 y 轴转了半圈）。
 * 这样看胸腔模型的镜头都在它们和胸腔之间，背后是空的；看它们的镜头背对胸腔，背后是展厅的前墙。
 * at：这些展台上的一点（展台自己的坐标，转半圈之前）在展厅里的位置
 */
export const at = (base: V3, p: V3): V3 => [base[0] - p[0], base[1] + p[1], base[2] - p[2]]
const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
/** 各课的机位 */
export const SPOT = {
  head: spot(HEAD_AT[0] - 0.15, HEAD_AT[1] + 1.7, HEAD_AT[2], 4.6, 6.4, [PI + 0.16, 0.06]),
  cilia: spot(CILIA_AT[0], CILIA_AT[1], CILIA_AT[2], 3.4, 3.0, [PI + 0.25, 0.08]),
  chest: spot(0, 12.9, 0, 4.6, 4.4, [-0.25, 0.08]),
  tree: spot(0, 13.2, 0, 4.4, 4.2, [0.12, 0.04]),
  alv: spot(ALV_AT[0], ALV_AT[1], ALV_AT[2], 4.4, 3.9, [PI + 0.25, 0.08]),
  ribs: spot(0, 12.9, 0.2, 4.4, 4.0, [-0.42, 0.12]),
  top: spot(0, 12.6, 0, 4.2, 3.6, [-0.2, 1.25]),
  jar: spot(JAR_AT[0], JAR_AT[1] + 1.8, JAR_AT[2], 3.8, 3.6, [PI - 0.2, 0.08]),
  pair: spot(12.0, 10.0, 13.1, 14, 7.7, [0.6, 0.12]),
  side: spot(0, 14.0, 0.3, 5.2, 5.8, [-1.5, 0.06]),
  wall: spot(WALL_AT[0], WALL_AT[1], WALL_AT[2], 4.6, 3.5, [PI + 0.22, 0.05]),
  flask: spot(FLASK_AT[0] - 0.2, FLASK_AT[1] + 1.0, FLASK_AT[2], 4.8, 2.7, [PI - 0.25, 0.14]),
  front: spot(0, 12.6, 0, 5.2, 5.0, [-0.12, 0.32]),
  heim: spot(0, 13.7, 0.3, 4.8, 6.4, [-0.55, 0.08]),
  q: spot(-2, 9, 11, 40, 20, [0.3, 0.7]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求 */
export interface Want {
  look?: ChestLook
  rib?: number
  dia?: number
  /** 胸腔模型自己平静地呼吸（随堂检测的背景） */
  idle?: boolean
  /** 第 1 课：气流走到哪了、要不要标出食物的路、纤毛动不动 */
  head?: { flow: number; pharynx: boolean; cilia: boolean }
  /** 第 2、6 课：肺泡剖开多少、血流不流；肺泡壁上看哪种气、屏住呼吸多久 */
  alv?: { cut: number; flow: boolean }
  wall?: { gas: GasKey | null; flow: boolean; hold: number }
  /** 第 4 课：橡皮膜拉下多少 */
  jar?: number
  /** 第 7 课：两瓶的浑浊程度、哪瓶在冒泡、注射器推进去多少 */
  lime?: { murk: [number, number]; bub: [boolean, boolean]; push: number }
}

function useFloor() {
  return useMemo(() => { const t = makeGround('#161b20', '52,60,68', '10,12,15', 21); t.repeat.set(26, 26); return t }, [])
}

/** 展柱：托着半身像的方柱，带倒角和一圈铝边 */
function Pedestal() {
  const top = useMemo(() => disc(1.9, 0.08, { chamfer: 0.02, segs: 72 }), [])
  return <group>
    <mesh position={[0, 4.5, -0.1]} castShadow receiveShadow><boxGeometry args={[2.4, 9.0, 2.0]} /><meshPhysicalMaterial color="#1d242b" roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh geometry={top} position={[0, 9.0, -0.1]} castShadow receiveShadow><Metal kind="aluminum" grain="turned" /></mesh>
    <mesh position={[0, 0.06, -0.1]}><boxGeometry args={[2.6, 0.12, 2.2]} /><Metal kind="aluminum" grain="brushed" /></mesh>
  </group>
}

/** 远处墙上的灯环：吸气时亮一点 */
function RingLight() {
  const m = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => { if (m.current) m.current.opacity = 0.05 + 0.09 * Math.max(breathLive.rib, breathLive.dia) })
  return <mesh position={[0, 13.5, -14]}><torusGeometry args={[6.5, 0.06, 12, 160]} /><meshBasicMaterial ref={m} color="#7fd6e8" toneMapped={false} transparent opacity={0.06} /></mesh>
}

export function World({ look = LOOK0, rib = 0, dia = 0, idle = false, head = { flow: 0, pharynx: false, cilia: false }, alv = { cut: 0, flow: true }, wall = { gas: null, flow: true, hold: 0 }, jar = 0, lime = { murk: [0, 0], bub: [false, false], push: 0 } }: Want) {
  const floor = useFloor()
  const hall = useMemo(() => new THREE.CylinderGeometry(30, 30, 26, 128, 1, true), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[220, 220]} /><meshStandardMaterial map={floor} roughness={0.4} metalness={0.05} color="#9aa6b0" /></mesh>
      <mesh geometry={hall} position={[0, 13, 4]}><meshStandardMaterial color="#121820" roughness={0.9} side={THREE.BackSide} /></mesh>
      <RingLight />
      <Pedestal />
      <Chest look={look} rib={rib} dia={dia} idle={idle} />
      {/* 前排：头颈部剖面模型和气管内壁的放大镜球、肺泡和肺泡壁两个放大镜球、实验台（钟罩模型、两瓶石灰水），都转过来朝着胸腔模型 */}
      <group position={[HEAD_AT[0], 0, HEAD_AT[2]]} rotation-y={PI}>
        <HeadPlinth at={[0, HEAD_AT[1], 0]} />
        <group position={[0, HEAD_AT[1], 0]}><HeadModel flow={head.flow} show={{ pharynx: head.pharynx }} /></group>
      </group>
      <group position={CILIA_AT} rotation-y={PI}><group rotation-x={0.35}><group position={[0, -0.4, 0]}><Cilia on={head.cilia} /></group></group></group>
      <Magnifier at={CILIA_AT} site={at(HEAD_AT, [2.6 * HEAD_S, 4 * HEAD_S, -0.6 * HEAD_S])} r={1.55} />
      <group position={ALV_AT} rotation-y={PI}><AlveolarSac cut={alv.cut} flow={alv.flow} /></group>
      <Magnifier at={ALV_AT} site={[-0.95, 13.0, 0.2]} r={2.25} />
      <group position={WALL_AT} rotation-y={PI}><AlveolarWall gas={wall.gas} flow={wall.flow} hold={wall.hold} /></group>
      <Magnifier at={WALL_AT} site={at(ALV_AT, [0, -1.0, 0.4])} r={2.0} />
      <group position={BENCH.at} rotation-y={PI}><Bench at={[0, 0, 0]} top={BENCH.top} w={BENCH.w} d={BENCH.d} /></group>
      <group position={JAR_AT} rotation-y={PI} scale={0.1}>
        <group position={[-11, 0, -1]}><Stand height={46} clampY={JAR_LIFT + 19 + 0.7} reach={11} /></group>
        <group position={[0, JAR_LIFT, -1]}><BellJar k={jar} /></group>
      </group>
      <group position={FLASK_AT} rotation-y={PI} scale={0.1}>
        <group position={[-6.5, 0, 0]}><Flask murk={lime.murk[0]} bubbling={lime.bub[0]} /></group>
        <group position={[6.5, 0, 0]} scale={[-1, 1, 1]}><Flask murk={lime.murk[1]} bubbling={lime.bub[1]} /></group>
        <Hose pts={HOSE_A} />
        <HoseFlow pts={HOSE_A} on={lime.bub[0]} back />
        <group position={[-19.4, 0.5, 5.2]}><Mouthpiece /></group>
        <Hose pts={HOSE_B} />
        <HoseFlow pts={HOSE_B} on={lime.bub[1]} back />
        <group position={[22.6, 2.4, -1.5]} rotation-z={-Math.PI / 2}><Syringe k={lime.push} /></group>
      </group>
    </group>
  )
}
