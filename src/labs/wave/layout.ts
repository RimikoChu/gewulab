// 机械振动和机械波实验室的位置表：各课在港口里的位置、机位，以及几种统一的颜色。
import * as THREE from 'three'

export type V3 = [number, number, number]
/** 码头面比水面高多少（m）；防波堤的中线在哪、堤顶多高；口门中心的 x */
export const QUAY = { y: 1.6, x0: -130, x1: 130, depth: 90 }
/** inner：堤头朝港池那一面的 z，闸门就贴在这一面上 */
export const WALL = { z: -70, top: 2.3, gx: 80, gap: 16, inner: -65.5 }
/** 各课的器材放在哪（x, z） */
export const AT = {
  spring: [-46, 9], pend: [62, 5.4], buoy: [-60, -16], line: [2, -40], twin: [38, -26], tow: [-2, -38], stand: [40, -8],
} as const satisfies Record<string, [number, number]>
/** 水面网格：中心、宽（x 方向）、深（z 方向）、格距（m） */
export interface PatchSpec { cx: number; cz: number; w: number; d: number; step: number }
export const PATCH = {
  buoy: { cx: -60, cz: -19, w: 40, d: 30, step: 0.25 },
  line: { cx: 3, cz: -40, w: 36, d: 18, step: 0.2 },
  twin: { cx: 38, cz: -33, w: 44, d: 34, step: 0.25 },
  gap: { cx: 80, cz: -58, w: 64, d: 58, step: 0.3 },
  tow: { cx: 4, cz: -38, w: 60, d: 40, step: 0.25 },
  stand: { cx: 40, cz: -9.5, w: 28, d: 25, step: 0.2 },
} as const satisfies Record<string, PatchSpec>

/** 各课的机位：看向哪里、要装进画面的宽和高、方位角和仰角；patch 是这一课用哪块水面网格 */
export interface Spot { target: THREE.Vector3; span: [number, number]; view: [number, number]; patch?: keyof typeof PATCH; fog?: [number, number]; sun?: number }
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
export const SPOT = {
  l1: { target: v(AT.spring[0] - 0.02, QUAY.y + 1.5, AT.spring[1]), span: [0.8, 0.92], view: [-0.42, 0.08], sun: 3 },
  l2: { target: v(AT.pend[0] + 0.14, QUAY.y + 0.9, AT.pend[1]), span: [1.25, 1.42], view: [-0.24, 0.08], sun: 3 },
  l3: { target: v(AT.buoy[0] - 1.0, 1.2, AT.buoy[1]), span: [6.4, 4.7], view: [-0.5, 0.28], patch: 'buoy' },
  l4: { target: v(AT.line[0] - 4.5, 0.6, AT.line[1]), span: [16, 6.5], view: [0.72, 0.2], patch: 'line' },
  l5: { target: v(AT.twin[0] + 0.5, 0.8, AT.twin[1] - 4.2), span: [19, 11], view: [-0.3, 0.4], patch: 'twin' },
  l6: { target: v(WALL.gx + 1, 2.5, WALL.z + 11), span: [44, 31], view: [-0.36, 0.5], patch: 'gap', fog: [160, 700] },
  l7: { target: v(AT.tow[0] - 1.5, 0.6, AT.tow[1]), span: [28, 12], view: [-0.24, 0.42], patch: 'tow' },
  xs: { target: v(AT.stand[0], 0.6, -3.6), span: [11, 5.5], view: [2.2, 0.2], patch: 'stand' },
  xb: { target: v(AT.tow[0] + 8, 0, AT.tow[1]), span: [48, 24], view: [-0.24, 0.72], patch: 'tow' },
  q: { target: v(WALL.gx + 2, 4.5, WALL.z + 10), span: [42, 19], view: [-0.3, 0.1], fog: [160, 700] },
} as const satisfies Record<string, Spot>
export type SpotKey = keyof typeof SPOT

export const COL = { red: '#e0452f', orange: '#f08a1c', yellow: '#f6c21c', navy: '#1f3a5c', ok: '#35c7b3', steel: '#5d6670', warn: '#ff9a7a' }
