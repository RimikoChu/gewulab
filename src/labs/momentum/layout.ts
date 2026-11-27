// 动量和碰撞实验室的布局：冰场、场边器材区、馆外试车台各在哪里，各课的机位，全间统一的颜色。
// 单独一个文件，场景（world）和各课都从这里取，免得互相引用。1 个单位 = 1 m，镜头都从南（+z）往北看。
import * as THREE from 'three'

export type V3 = [number, number, number]
/** 冰面：东西 60 m、南北 26 m，四角是半径 8.5 m 的圆弧 */
export const ICE = { x0: -30, x1: 30, z0: -28, z1: -2, r: 8.5 }
/** 冰球馆：四面墙的位置和屋架的高度（南面敞开） */
export const HALL = { x0: -44, x1: 60, z0: -40, z1: 7, h: 13 }
/** 冰面上各课的出发点 */
export const RINK = { shot: { x: 26.44, z: -15 }, clash: { x: -8, z: -13 }, jet: { x: -24, z: -14 }, pen: { x: 6, z: -12 }, quiz: { x: 21, z: -8.5 } }
/** 第 1 课撞板墙那一种击法走的道 */
export const WALL_LANE = -13.6
/** 球门线的位置（东端） */
export const GOAL_X = 28.74
/** 场边器材区：实验台台面的高度、三张实验台的位置、后面隔墙的位置 */
export const TOP = 0.9, BENCH_Z = -15, PART_Z = -16.9
export const ST = { egg: 39.5, track: 45, cradle: 50.5 }
export type StKey = keyof typeof ST
/** 馆外的试车台：发动机喷管出口所在的位置，轴线高度 */
export const STAND = { x: 172, z: -22, axis: 2.6 }

/** 全间统一的颜色：速度、动量、力；先动的物体 A、另一个物体 B */
export const COL = { v: '#eaf4ff', p: '#ffd24a', F: '#ff7a59', A: '#d2452f', B: '#2f6fb8', ok: '#7fe3d4' }

export interface Spot { target: THREE.Vector3; span: [number, number]; view: [number, number]; where: 'ice' | 'bench' | 'out' }
const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], where: Spot['where']): Spot => ({ target: new THREE.Vector3(x, y, z), span: [w, h], view, where })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(RINK.shot.x + 0.7, 0.7, -14.5, 3.7, 1.5, [-0.22, 0.08], 'ice'),
  l2: spot(ST.egg + 0.04, TOP + 0.5, BENCH_Z, 0.95, 1.25, [0.34, 0.1], 'bench'),
  l2h: spot(ST.egg + 0.04, TOP + 0.66, BENCH_Z, 1.1, 1.6, [0.34, 0.1], 'bench'),
  l3: spot(ST.track - 0.03, TOP + 0.33, BENCH_Z - 0.03, 1.52, 0.5, [-0.16, 0.5], 'bench'),
  l4: spot(RINK.clash.x + 0.1, 0.55, RINK.clash.z, 3.0, 1.1, [0.3, 0.13], 'ice'),
  l5: spot(ST.cradle, TOP + 0.13, BENCH_Z, 0.42, 0.27, [0.3, 0.16], 'bench'),
  l6: spot(RINK.jet.x + 0.55, 0.6, RINK.jet.z, 2.6, 1.0, [-0.4, 0.14], 'ice'),
  l7: spot(STAND.x + 1.7, 3.6, STAND.z, 12.5, 5.2, [-0.22, 0.1], 'out'),
  xa: spot(RINK.pen.x, 0.5, RINK.pen.z, 2.9, 1.0, [0.2, 0.15], 'ice'),
  xb: spot(RINK.pen.x - 0.15, 0.4, RINK.pen.z, 2.7, 0.9, [-0.24, 0.17], 'ice'),
  xc: spot(RINK.pen.x + 0.1, 0.1, RINK.pen.z, 3.1, 2.2, [0.12, 0.5], 'ice'),
  q: spot(RINK.quiz.x + 0.05, TOP + 0.3, RINK.quiz.z, 1.15, 0.6, [-0.72, 0.2], 'ice'),
}
export type SpotKey = keyof typeof SPOT
