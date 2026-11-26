// 地震实验室的大场景：整个实验室只有这一个世界，三处地方，换课时画布不重建，镜头飞过去。
//   龙门山沙盘（原点，1 单位 = 1 km）：第 1、2、4、5 课
//   河谷小镇（沙盘东边很远，1 单位 = 4 m）：第 3、7 课和拓展课的“预警响了”
//   太空里的地球（沙盘正上方很高处）：第 6 课、拓展课的地震带、随堂检测
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import { Region, type RegionWant } from './region'
import { TOWN, Town, type TownWant } from './town'
import { GLOBE, Globe, RG, Stars, type GlobeWant } from './globe'

/** 这一课对整个世界的要求 */
export interface Want { region?: RegionWant; town?: TownWant; globe?: GlobeWant }

export function World({ want = {} }: { want?: Want }) {
  return (
    <group>
      <Region want={want.region ?? {}} />
      <Town want={want.town ?? {}} />
      <Globe w={want.globe ?? {}} />
      <Stars />
    </group>
  )
}

/** 太空里：不画天空，背景近乎全黑 */
function SPACE(): Partial<View> { return { sky: false, backdrop: '#03050a', env: 0.05, sun: 0, free: true, fog: [6000, 9000] } }
type View = { target: THREE.Vector3; span: [number, number]; view: [number, number]; fog: [number, number]; sky?: boolean; backdrop?: string; env?: number; sun?: number; free?: boolean; bloom?: number }
const v = (x: number, y: number, z: number, w: number, h: number, az: number, el: number, extra: Partial<View> = {}): View =>
  ({ target: new THREE.Vector3(x, y, z), span: [w, h], view: [az, el], fog: [500, 2200], sun: 2.8, env: 0.85, ...extra })
/** 各处机位：同一处始终是同一个对象，换课时镜头才会飞 */
export const SPOT = {
  cut: v(-12, -1, -8, 60, 34, 0.4, 0.36),            // 第 1 课：穿过震中的剖面
  cutOpen: v(-3, -6, 0, 54, 32, 0.34, 0.26),        // 第 1 课：剖开以后，对着剖面
  cutWide: v(32, -3, -8, 100, 40, 0.06, 0.42),      // 第 1 课：从映秀量到成都
  map: v(18, 0, -55, 170, 130, 0, 1.22),        // 第 2 课：俯看整块沙盘
  warn: v(30, 0, -50, 150, 70, -0.42, 0.5),        // 第 4 课：斜看
  locate: v(42, 0, -62, 105, 92, 0, 1.4),           // 第 5 课：正上方
  // 河谷小镇（1 单位 = 4 m）
  ground: v(TOWN.x - 36, -2, 20, 36, 24, 0.1, 0.32, { fog: [260, 900] }),          // 第 3 课：剖开的地下、房子、水库
  lake: v(TOWN.x - 50, -1, 18, 26, 15, -0.12, 0.34, { fog: [260, 900] }),            // 第 3 课：水库和船
  towers: v(TOWN.x + 39, 7, -13, 44, 19, -0.12, 0.14, { fog: [260, 900] }),         // 第 7 课：三栋楼
  school: v(TOWN.x - 6, 3.2, -16, 30, 14, 0.12, 0.16, { fog: [260, 900] }),          // 拓展：教学楼
  // 太空
  section: v(GLOBE.x, GLOBE.y, GLOBE.z, RG * 2.4, RG * 2.4, 0.62, 0.26, SPACE()),   // 第 6 课：剖开的地球
  globe: v(GLOBE.x, GLOBE.y, GLOBE.z, RG * 2.5, RG * 2.35, 0, 0, SPACE()),          // 拓展、随堂检测
}
export type SpotKey = keyof typeof SPOT

export default function Spot({ at, want = {}, labels, children = null }: { at: SpotKey; want?: Want; labels: Label[]; children?: ReactNode }) {
  const s = SPOT[at]
  return <LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} fog={s.fog} sun={s.sun} env={s.env} sky={s.sky} backdrop={s.backdrop} free={s.free} bloom={s.bloom} world={want}>{children}</LabStage>
}
