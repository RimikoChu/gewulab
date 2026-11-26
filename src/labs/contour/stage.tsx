// 等高线地形图 · 各课共用的舞台：整块山地，和几处机位。同一处机位始终是同一个对象，换课时镜头才会飞过去。
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import type { Want } from './world'

type View = { target: THREE.Vector3; span: [number, number]; view: [number, number] }
const v = (x: number, y: number, z: number, w: number, h: number, az: number, el: number): View => ({ target: new THREE.Vector3(x, y, z), span: [w, h], view: [az, el] })
/** 各处机位：target 看向哪里，span 要装进画面的宽高，view 方位角和仰角 */
export const VIEWS = {
  all: v(-2, 4, 2, 118, 52, -0.18, 0.62),
  side: v(-5, 7, 2, 60, 24, -0.05, 0.22),         // 第 1 课：从南边平看，左边是海，右边是 A 峰
  peak: v(10, 9, -6, 50, 30, -0.3, 0.36),          // 第 2 课：A 峰
  peakMap: v(10, 2, -5, 58, 40, 0, 1.18),
  slope: v(12, 8, -6, 44, 26, 0.05, 0.42),         // 第 3 课：A 峰的西坡和东坡
  slopeMap: v(5, 2, -6, 40, 25, 0, 1.18),
  top: v(8, 2, -8, 30, 22, 0, 1.15),               // 第 4 课：山顶
  basin: v(42, 2, 20, 32, 24, 0, 1.15),            // 第 4 课：盆地
  top3d: v(8, 10, -8, 36, 24, -0.2, 0.42),
  basin3d: v(42, 4, 20, 34, 18, -0.2, 0.5),
  ridge: v(6, 6, 3, 30, 22, -0.22, 0.6),           // 第 5 课：A 峰向南伸出的山脊
  valley: v(18, 4, 2, 30, 22, 0.22, 0.6),        // 第 5 课：两峰之间的山谷
  saddle: v(21, 9, -11, 46, 28, -0.1, 0.62),      // 第 6 课：鞍部
  cliff: v(-29, 6, -16, 22, 13, -0.12, 0.34),      // 第 6 课：高原南缘的陡崖和瀑布
  cliffMap: v(-29, 1, -17, 24, 17, 0, 1.2),
  layers: v(5, 1, 0, 116, 76, 0, 1.22),            // 第 7 课：整张图
  profile: v(2, 5, -10, 124, 40, 0, 0.45),
  trail: v(15, 6, -12, 44, 38, -0.35, 1.05),
  dam: v(16, 4, 6, 30, 20, 0.1, 0.62),             // 拓展：坝址
  sunrise: v(30, 9, -14, 84, 30, -0.4, 0.22),      // 拓展：看日出
}
export type ViewKey = keyof typeof VIEWS
const FOG: [number, number] = [220, 900]

export default function Spot({ at = 'all', want = {}, labels, bloom = 0, children = null }: { at?: ViewKey; want?: Want; labels: Label[]; bloom?: number; children?: ReactNode }) {
  const s = VIEWS[at]
  return <LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} fog={FOG} bloom={bloom} sun={2.6} env={0.75} world={want}>{children}</LabStage>
}
