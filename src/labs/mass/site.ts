// 整个大场景的布局：画面比例、化验台的高度、化验室各格、车间、中控室、石灰窑的位置。world.tsx 和 plant.tsx 都从这里取，免得互相引用。
export const M = 6, TOP = 0.85 * M      // 1 m 在画面里多长；化验台台面的高度
export type V3 = [number, number, number]

/** 化验室：x 的范围、后墙和门脸的 z、层高；化验台的前后沿；器材摆在 z = BZ 这条线上 */
export const HALL = { x0: -150, x1: -48, z0: -18, z1: 4, h: 22 }
export const BENCH = { z0: -17.4, z1: -12.9 }
export const BZ = -15
/** 化验台上各格的中心（x）：每两根柱子之间一格 */
export const ST = { l1: -138, l2: -120, l3: -102, l4: -84, lx: -66 }

/** 反应车间、中控室、石灰窑的位置（plant.tsx 用） */
export const PH = { x0: -20, x1: 108, z0: -60, z1: 10, eave: 54, ridge: 62 }
export const FURN = { x: 30, z: -26, r: 4.2, y0: 5, h: 24 }
export const CR = { x0: 116, x1: 162, z0: -26, z1: 4, h: 20 }
export const SHOW = { x: 139, z: -7, top: TOP, len: 30 }
export const KILN = { x: 266, z: -62, r: 5.4, base: 10, h: 66, gap: 30 }
export const SCALE = { x: 214, z: -16, w: 72, d: 20 }
export const BIN = { x: 266, z: -44 }
/** 卸料坑：汽车衡往前一点，卡车开过去把石灰石倒进坑里，皮带送到斜桥下 */
export const PIT = { x: 270, z: -16 }
/** 上料斜桥的脚 */
export const FOOT = { x: 220, z: -62 }

