// 万有引力与航天实验室的大场景：整个实验室只有这一个世界，各课在里面各占一处。换课时画布不重建，镜头飞过去。
// 发射场在原点（1 单位 = 1 m）；测量实验室在发射场西侧；地球系在发射场正上方（地球半径 10 单位，1 单位 = 637.1 km）；太阳系在地球系东边。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Earth, FarSun, Moon, OrbitLine, SUN_DIR, Stars, Sun } from './earth'
import { LaunchSite } from './site'
import { Room } from './balance'
import { MOON, R_E } from './physics'

/** 各处的位置 */
export const ST = {
  site: new THREE.Vector3(0, 0, 0),
  room: new THREE.Vector3(-260, 0, 120),
  earth: new THREE.Vector3(0, 20000, 0),
  solar: new THREE.Vector3(40000, 20000, 0),
}
/** 地球系：地球半径（场景单位），以及把真实距离（m）换成场景单位 */
export const RE = 10
export const toScene = (m: number) => m / R_E * RE
/** 月球轨道压缩显示（示意）：真实是 60 个地球半径 */
export const MOON_D = 120
export const MOON_R = toScene(MOON.R)
export const MOON_ANG = 2.4
export const moonAt = (ang = MOON_ANG) => new THREE.Vector3(ST.earth.x + Math.cos(ang) * MOON_D, ST.earth.y, ST.earth.z - Math.sin(ang) * MOON_D)
/** 太阳系：1 AU = 11 单位（轨道半径之比真实），太阳和行星画大了 */
export const AU_S = 11
export const SUN_R = 2.2

/** 让地球上经度 lon（°E）的地方朝着方位角 az（镜头那一侧）时，地球要转的角度 */
export const spinFacing = (lon: number, az: number) => az - Math.PI / 2 - lon * Math.PI / 180
/** 赤道面上的圆轨道里，正对方位角 az 的那一点的角度 */
export const phaseFacing = (az: number) => az - Math.PI / 2
/** 太空里画面时间和真实时间之比：画面 1 秒 = 真实 SIM 秒 */
export const SIM = 2000

export interface Want {
  /** 在太空里：画星空和远处的太阳光 */
  space?: boolean
  /** 地球系的阳光开不开（在太阳系和地面时关掉） */
  earthLight?: boolean
  /** 地球自转角 */
  spin?: number
  /** 地球自转的角速度（rad/s，画面上的快慢）；不为 0 时地球一直转 */
  spinRate?: number
  /** 画不画月球轨道 */
  moonOrbit?: boolean
}

function Solar() {
  return (
    <group position={ST.solar}>
      <pointLight intensity={4.2} decay={0} distance={260} color="#fff1dc" />
      <Sun r={SUN_R} halo={4.6} />
    </group>
  )
}

function EarthSystem({ want }: { want: Want }) {
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.copy(ST.earth); o.updateMatrixWorld(); return o }, [])
  const m = moonAt()
  return (
    <group>
      <primitive object={target} />
      {want.earthLight && <directionalLight target={target} position={ST.earth.clone().addScaledVector(SUN_DIR, 300).toArray()} intensity={3.2} color="#fff4e6" />}
      {want.earthLight && <ambientLight intensity={0.05} />}
      <group position={ST.earth}><Earth r={RE} spin={want.spin ?? 0} rate={want.spinRate ?? 0} /></group>
      <group position={m}><Moon r={MOON_R} /></group>
      {want.moonOrbit && <group position={ST.earth}><OrbitLine a={MOON_D} color="#c9d4e6" opacity={0.45} /></group>}
    </group>
  )
}

function Lab() {
  return (
    <group position={ST.room}>
      <Room />
      <pointLight position={[0, 4.6, 0]} intensity={18} distance={14} decay={1.6} color="#fff4e6" />
      <pointLight position={[-2, 3, 4]} intensity={6} distance={12} decay={1.6} color="#dfe8ff" />
    </group>
  )
}

export function World({ want = {} }: { want?: Want }) {
  return (
    <group>
      <LaunchSite />
      <Lab />
      <EarthSystem want={want} />
      <Solar />
      {want.space && <Stars />}
      {want.space && want.earthLight && <FarSun />}
    </group>
  )
}
