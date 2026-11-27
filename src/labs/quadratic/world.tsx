// 二次函数实验室的大场景：一座城市滨水公园。江沿 x 方向流过，南岸从西往东依次是花园、喷泉广场、沿江音乐喷泉、
// 篮球场、江心高喷、游船码头，最东头一座抛物线拱桥跨过江。整个实验室只有这一个世界，换课时镜头沿着江岸飞。
// 各课的位置和机位写在 SPOT 里；第 6 课要涨落江水，通过 LabStage 的 world 交上来。
import { useMemo } from 'react'
import * as THREE from 'three'
import { useSlide } from '@/lab-kit'
import { makeLawn, makePaving, rep } from './mats'
import { BASIN, P, Park, RIVER, RIVER_Z, TROUGH, BRIDGE } from './park'
import { JET_TOP } from './physics'

export { P, RIVER, RIVER_Z, BASIN, TROUGH, BRIDGE }
export interface WorldWant { level?: number }

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
type Spot = { target: THREE.Vector3; span: [number, number]; view: [number, number] }
/** 各处的机位。view 的方位角也是这一处“局部坐标”绕 y 轴转的角度：局部 +x 是屏幕的右边、局部 +z 朝着镜头 */
export const SPOT: Record<string, Spot> = {
  bed1: { target: v(P.bed1[0], 0.9, P.bed1[2] - 1.3), span: [6.8, 4.6], view: [0.04, 0.52] },
  basin: { target: v(P.basin[0], BASIN.water + JET_TOP - 1.2, P.basin[2]), span: [8.6, 5.6], view: [0.22, 0.1] },
  basinx: { target: v(P.basin[0], BASIN.water + 1.3, P.basin[2]), span: [6.4, 3.6], view: [0.22, 0.12] },
  trough: { target: v(P.trough[0] + 1, TROUGH.water + 2.0, P.trough[2]), span: [11, 6.2], view: [-0.12, 0.12] },
  shot: { target: v(P.shot[0] + 2.4, 2.1, P.shot[2]), span: [7.6, 4.5], view: [0.08, 0.1] },
  high: { target: v(P.high[0] + 6.4, RIVER.level + 11.2, P.high[2]), span: [18, 30], view: [-0.1, 0.1] },
  bridge: { target: v(P.bridge[0], RIVER.level + 2.6, P.bridge[2]), span: [19, 10.5], view: [Math.PI / 2, 0.13] },
  bed7: { target: v(P.bed7[0], 1.7, P.bed7[2] + 2.2), span: [10.5, 5.2], view: [0.06, 0.36] },
  dock: { target: v(P.dock[0], 2.3, P.dock[2] + 1.8), span: [9, 5.6], view: [0, 0.12] },
  over: { target: v(P.bridge[0] - 6, 3, P.bridge[2] + 4), span: [46, 22], view: [Math.PI / 2 - 0.6, 0.3] },
}

export function World({ want }: { want?: WorldWant }) {
  const level = useSlide(RIVER.level + (want?.level ?? 0), 0.5)
  const lawn = useMemo(() => rep(makeLawn(), 60, 26), [])
  const lawnN = useMemo(() => rep(makeLawn(), 60, 14), [])
  const walk = useMemo(() => rep(makePaving(64), 170, 4), [])
  const plaza = useMemo(() => rep(makePaving(96, [206, 200, 190]), 13, 13), [])
  const L = RIVER.x1 - RIVER.x0, cx = (RIVER.x0 + RIVER.x1) / 2
  return (
    <group>
      {/* 南岸草坪（z > −14）、北岸草坪（z < −34）：中间空出江 */}
      <mesh position={[cx, 0, 56]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[L, 140]} /><meshStandardMaterial map={lawn} roughness={0.95} /></mesh>
      <mesh position={[cx, 0, -84]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[L, 100]} /><meshStandardMaterial map={lawnN} roughness={0.95} /></mesh>
      {/* 沿江步道、喷泉广场的铺装 */}
      <mesh position={[cx, 0.01, -9.6]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[L, 8.8]} /><meshStandardMaterial map={walk} roughness={0.8} /></mesh>
      <mesh position={[P.basin[0], 0.012, P.basin[2]]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[13, 72]} /><meshStandardMaterial map={plaza} roughness={0.8} /></mesh>
      <Park level={level} />
    </group>
  )
}
