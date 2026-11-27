// 带电粒子在磁场中实验室的布局：各课装置在大厅里的位置、机位、全间统一的颜色。
// 单独一个文件，场景（world）和各课的器材（sceneN）都从这里取，免得互相引用。1 个单位 = 1 m。
import * as THREE from 'three'
import type { V3 } from './physics'

/** 各课装置所在的位置（x，m）。装置沿屏蔽墙（z = WALL_Z）一字排开，正面朝 +z */
export const ST = { l1: -15, l2: -9, l3: -3, l4: 3, l5: 9, l6: 15, l7: 22, x: 29 }
export type StKey = keyof typeof ST
/** 实验台台面的高度 */
export const TOP = 0.86
/** 屏蔽墙的前表面 */
export const WALL_Z = -2.6
/** 大厅的范围和高度 */
export const HALL = { x0: -24, x1: 38, z0: -2.6, z1: 14, h: 13 }

/** 全间统一的颜色：场、力、速度、电荷 */
export const COL = {
  B: '#8fa9ff', E: '#ffc65c', FB: '#ff4fa0', FE: '#ffa12e', v: '#eef4ff',
  pos: '#ff6b4a', neg: '#46a6ff', glow: '#5cffc8', cur: '#ffd34d',
}

interface Spot { target: THREE.Vector3; span: [number, number]; view: [number, number]; light: V3 }
/** 一处机位：x 是哪一课的位置，local 是看向那里的哪一点，span 装进画面的宽和高（m），view 方位角和仰角 */
function at(st: StKey, local: V3, span: [number, number], view: [number, number]): Spot {
  const t: V3 = [ST[st] + local[0], local[1], local[2]]
  return { target: new THREE.Vector3(...t), span, view, light: [t[0] - 1.6, t[1] + 3.2, t[2] + 2.4] }
}
export const SPOT = {
  l1: at('l1', [-0.04, TOP + 0.17, 0.05], [0.95, 0.5], [0.42, 0.36]),
  l2: at('l2', [-0.02, TOP + 0.15, 0.02], [0.44, 0.22], [-0.1, 0.26]),
  l3: at('l3', [0.02, TOP + 0.24, 0.05], [0.5, 0.3], [0.24, 0.12]),
  l4: at('l4', [0, 0.95, 0.0], [0.62, 0.34], [-0.28, 0.72]),
  l5: at('l5', [0.01, 1.12, 0.0], [0.3, 0.15], [0.2, 0.22]),
  l6: at('l6', [0.12, 1.0, -0.02], [0.56, 0.3], [0.38, 0.68]),
  l7: at('l7', [0, 0.92, 0.05], [1.7, 0.9], [-0.36, 0.62]),
  l7s: at('l7', [2.556, 0.9, 1.09], [0.5, 0.27], [-0.65, 0.14]),
  x: at('x', [-0.4, 1.04, 0.0], [1.0, 0.5], [0.22, 0.2]),
  xa: at('x', [0.75, 1.12, 0.0], [0.85, 0.55], [-0.3, 0.16]),
  q: { target: new THREE.Vector3(18.2, 1.1, -0.5), span: [8.5, 3.6] as [number, number], view: [0.9, 0.17] as [number, number], light: [21, 6, 4] as V3 },
}
export type SpotKey = keyof typeof SPOT
