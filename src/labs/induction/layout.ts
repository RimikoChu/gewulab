// 电磁感应和电网实验室的布局：各课器材在大场景里的位置、机位、全间统一的颜色。
// 单独一个文件，场景（world）和各课的器材（sceneN）都从这里取，免得互相引用。1 个单位 = 1 m。
import * as THREE from 'three'
import type { V3 } from './physics'

/** 实验室里五张台的位置（x，m），台子沿 z = 0 一字排开，正面朝 +z */
export const ST = { l1: -38, l2: -32, l3: -26, l4: -20, x: -14 }
export type StKey = keyof typeof ST | 'l5' | 'l6' | 'l7'
/** 台面高度 */
export const TOP = 0.86
/** 培训楼一层的实验室 */
export const ROOM = { x0: -44, x1: -9, z0: -3.6, z1: 6, h: 3.6 }
/** 发电机厂房 */
export const HALL = { x0: -7, x1: 42, z0: -14, z1: 18, h: 19 }
/** 三台发电机的中心（1 号机剖开，第 5 课） */
export const UNITS = [4, 18, 32]
/** 升压站：场地范围、主变压器的位置、出线构架的 x */
export const YARD = { x0: 46, x1: 76, z0: -8, z1: 16, tf: [56, 0, 3] as V3, gantry: 70 }
/** 输电线：铁塔的 x、线路的 z、塔高 */
export const LINE = { towers: [96, 158, 220, 282], z: 3, h: 30 }
/** 城郊变电站和城里 */
export const CITY = { sub: 312, pole: 338, x0: 346, x1: 410 }
/** 大坝 */
export const DAM = { z: -56, h: 34, x0: -90, x1: 70 }

/** 全间统一的颜色：磁场、感应电流的磁场、电流光点、N 极、S 极、损耗发热 */
export const COL = {
  B: '#7fa6ff', Bi: '#ffa13d', cur: '#ffd34d', N: '#c8352b', S: '#2c5aa8', hot: '#ff5a2a', glow: '#5cffc8',
}

interface Spot { target: THREE.Vector3; span: [number, number]; view: [number, number]; indoor: boolean; light: V3 }
const spot = (t: V3, span: [number, number], view: [number, number], indoor: boolean): Spot =>
  ({ target: new THREE.Vector3(...t), span, view, indoor, light: [t[0] - 1.4, t[1] + 2.2, t[2] + 2.0] })
export const SPOT = {
  l1: spot([ST.l1 + 0.04, TOP + 0.25, 0.0], [0.66, 0.44], [0.95, 0.26], true),
  l2: spot([ST.l2 + 0.08, TOP + 0.16, 0.02], [0.56, 0.34], [-0.32, 0.2], true),
  l3: spot([ST.l3 + 0.08, TOP + 0.22, 0.02], [0.56, 0.4], [0.3, 0.16], true),
  l4: spot([ST.l4 - 0.04, TOP + 0.1, -0.02], [0.86, 0.5], [-0.42, 0.5], true),
  x: spot([ST.x - 0.03, TOP + 0.41, 0.0], [0.5, 0.8], [0.22, 0.1], true),
  l5: spot([UNITS[0] - 0.6, 1.6, 0.0], [9.0, 4.8], [0.62, 0.42], true),
  l6: spot([YARD.tf[0] - 0.2, 2.9, YARD.tf[2]], [8.6, 6.4], [0.12, 0.2], false),
  l7: spot([206, 13, LINE.z], [96, 34], [-1.05, 0.13], false),
  l7c: spot([CITY.pole + 14, 6, LINE.z + 4], [62, 24], [-0.5, 0.24], false),
  q: spot([46, 13, -16], [62, 26], [1.02, 0.1], false),
}
export type SpotKey = keyof typeof SPOT
