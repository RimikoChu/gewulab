// 大场景的布局：住宅楼一层各个房间、配电箱、电表箱、厨房台面、配电房、变压器的位置。world、各课的器材都从这里取坐标。
// 1 m 画成 10 个单位；小器材按厘米写，外面套 <Cm>（乘 CM）。
import type { ReactNode } from 'react'

export type V3 = [number, number, number]
export const M = 10, CM = 0.1
/** 住宅楼一层：层高 2.8 m，后墙在 z = −45，前面剖开在 z = 0 */
export const H = 28, BACK = -45
export const ROOM = { cor: [-130, -100], liv: [-100, -30], kit: [-30, 10], bal: [10, 40] } as const
/** 后墙上的窗洞 [x0, x1, y0, y1] */
export const WIN = { cor: [-126, -118, 16, 24], liv: [-92, -74, 8, 22], kit: [-4, 4, 13.5, 23], bal: [22, 38, 12, 25] } as const
/** 配电箱（客厅和厨房之间的墙上，箱子中心）、楼道电表箱（中心） */
export const DB: V3 = [-31.6, 16.5, BACK]
export const MB: V3 = [-110, 15, BACK]
/** 厨房台面：高 86 cm，前沿在 z = −39，从 x0 到 x1 */
export const COUNTER = { y: 8.6, z0: BACK, z1: -39, x0: -29, x1: 3 }
/** 客厅：墙壁开关、吸顶灯、电视、电视插座 */
export const LIV = { sw: [-96, 13, BACK] as V3, lamp: [-62, H, -22] as V3, tv: [-56, 11.5, BACK] as V3, tvSocket: [-49, 3, BACK] as V3, ac: [-83, 24.6, BACK] as V3 }
/** 厨房台面上方墙上的两只五孔插座 */
export const KIT_SOCKETS: V3[] = [[-26, 11.2, BACK], [-17, 11.2, BACK]]
/** 阳台：五孔插座、洗衣机用的三孔插座、洗衣机 */
export const BAL_SOCKET: V3 = [14.5, 13, BACK]
export const BAL_SOCKET3: V3 = [19, 13, BACK]
export const WASHER: V3 = [27, 0, -41.2]
/** 配电房：x、z 范围和层高；工作台 */
export const PR = { x0: 80, x1: 160, z0: -45, z1: -5, h: 38 }
export const BENCH = { y: 8, z0: -45, z1: -37.5, x0: 83, x1: 121 }
/** 变压器的中心 */
export const TF: V3 = [184, 0, -26]
/** 配电柜：四台，从 x0 起每台 8 宽 */
export const CAB = { x0: 124, w: 8, h: 22, d: 6, n: 4 }

/** 按厘米写的器材：放在 p 处，绕 y 转 yaw */
export function Cm({ p, yaw = 0, children }: { p: V3; yaw?: number; children: ReactNode }) {
  return <group position={p} rotation-y={yaw}><group scale={CM}>{children}</group></group>
}
