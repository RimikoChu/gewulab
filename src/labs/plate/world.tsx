// 板块运动实验室的大场景：一条从太平洋经安第斯山、南美洲、大西洋中脊、非洲、东非大裂谷、印度洋、印度到喜马拉雅山和青藏高原的“地球切片”，
// 朝镜头的一面剖开，看得见地壳、地幔、软流层和岩浆；正上方很高的太空里是一颗地球。整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。
// 各课的机位写在 SPOT 里。
import * as THREE from 'three'
import { Globe, GLOBE, RG, Stars, type GlobeWant } from './globe'
import { Section } from './section'
import { NOW, X, type Shape } from './shape'

/** 这一课对整个世界的要求 */
export interface Want {
  shape?: Shape; peakM?: number; ridgeT?: number; slabT?: number; stripes?: number; fossil?: number; glow?: number
  globe?: GlobeWant
}
const FACE0: GlobeWant = { face: [-20, 0] }

export function World({ want = {} }: { want?: Want }) {
  return (
    <group>
      <Section shape={want.shape ?? NOW} peakM={want.peakM ?? 8848.86} ridgeT={want.ridgeT ?? 0} slabT={want.slabT ?? 0} stripes={want.stripes} fossil={want.fossil} glow={want.glow} />
      <Globe w={want.globe ?? FACE0} />
      <Stars />
    </group>
  )
}

/** 机位：看向哪、装进多宽多高、从哪个方向看 */
const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
/** 剖面上的几处：镜头在剖开的那一面前面，略微俯视 */
export const SPOT = {
  ridge: spot(X.ridge + 6, 18, 0, 68, 24, [0.12, 0.3]),
  ridgeNear: spot(X.ridge, -6, 0, 70, 20, [0.1, 0.1]),
  rift: spot(X.rift + 4, 12, 0, 62, 24, [-0.14, 0.3]),
  collide: spot(X.suture - 36, 12, 0, 100, 28, [-0.1, 0.28]),
  andes: spot(X.trench + 20, 2, 0, 72, 30, [0.14, 0.28]),
  all: spot((X.west + X.east) / 2 + 10, -22, 0, 880, 92, [0, 0.16]),
  globe: spot(GLOBE.x, GLOBE.y, GLOBE.z, RG * 2.5, RG * 2.3, [0, 0]),
}
/** 剖面上：白天的天空，雾推得远一些 */
export const DAYLIGHT = { fog: [170, 1100] as [number, number], sun: 2.6, env: 0.95 }
/** 太空里：不画天空，背景近乎全黑 */
export const SPACE = { sky: false, backdrop: '#03050a', env: 0.05, sun: 0, free: true, fog: [6000, 9000] as [number, number] }
