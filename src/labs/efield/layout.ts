// 静电场实验室的布局：各课器材在车间里的位置、机位、全间统一的颜色。
// 单独一个文件，场景（world）和各课的器材（sceneN）都从这里取，免得互相引用。1 个单位 = 1 m。
import * as THREE from 'three'
import type { V3 } from './physics'

/** 各课实验台所在的位置（x，m）。实验台在车间中间一字排开，正面朝 +z */
export const ST = { l1: -13.5, l2: -9, l3: -4.5, l4: 0, l5: 4.5, l6: 9, l7: 13.5, x: 18 }
export type StKey = keyof typeof ST
/** 实验台台面的高度 */
export const TOP = 0.9
/** 车间的范围和高度；北墙前是包装输送线 */
export const HALL = { x0: -19, x1: 24, z0: -6.4, z1: 10, h: 9.5 }
export const LINE_Z = -3.9

/** 全间统一的颜色：电场线、正负电荷、力、速度、等势面、墨滴 */
export const COL = { E: '#ffc65c', pos: '#ff5a48', neg: '#4aa6ff', F: '#ff4fa0', v: '#eef4ff', eq: '#63d6ff', ink: '#38e0ff', glow: '#7dffc2' }

export interface Spot { target: THREE.Vector3; span: [number, number]; view: [number, number]; light: V3 }
/** 一处机位：st 是哪张台，local 是看向台面上方的哪一点（y 从台面算起），span 装进画面的宽和高（m），view 方位角和仰角 */
function at(st: StKey, local: V3, span: [number, number], view: [number, number]): Spot {
  const t: V3 = [ST[st] + local[0], TOP + local[1], local[2]]
  return { target: new THREE.Vector3(...t), span, view, light: [t[0] - 1.3, t[1] + 2.6, t[2] + 2.2] }
}
export const SPOT = {
  l1: at('l1', [0, 0.225, 0], [0.5, 0.53], [-0.36, 0.3]),
  l2: at('l2', [-0.01, 0.175, 0.02], [0.56, 0.37], [0.3, 0.13]),
  l3: at('l3', [-0.02, 0.07, 0.0], [0.56, 0.36], [-0.3, 0.46]),
  l4: at('l4', [0, 0.25, 0.03], [0.74, 0.52], [0.5, 0.3]),
  l5: at('l5', [0.05, 0.2, 0], [0.8, 0.46], [-0.52, 0.34]),
  l6: at('l6', [-0.07, 0.15, 0], [0.56, 0.3], [0.22, 0.3]),
  l7: at('l7', [0, 0.2, 0], [0.96, 0.44], [-0.2, 0.15]),
  xa: at('l7', [0.07, 0.4, 0], [0.98, 0.76], [-0.38, 0.14]),
  xb: at('x', [0.07, 0.3, 0], [0.62, 0.66], [0.3, 0.2]),
  q: { target: new THREE.Vector3(15.2, 0.95, -2.4), span: [3.6, 1.55] as [number, number], view: [-0.5, 0.12] as [number, number], light: [14, 4.5, 1.5] as V3 },
}
export type SpotKey = keyof typeof SPOT
