// 太空里的几处机位，和太空场景共用的舞台设置。各课从这里取，换课时镜头在它们之间飞。
import * as THREE from 'three'
import { RE, RO, earthAt } from './world'

/** 太空里：不画天空，背景近乎全黑，环境光调到很小，只靠太阳那盏灯 */
export const SPACE = { sky: false, backdrop: '#04060b', env: 0.08, sun: 0, free: true, fog: [400, 2400] as [number, number] }
/** 轨道全景：从斜上方看整条轨道 */
export const T_ORBIT = new THREE.Vector3(0, -1.5, 0)
export const S_ORBIT: [number, number] = [RO * 2 + 22, RO * 1.3]
export const V_ORBIT: [number, number] = [0.0, 0.62]
/** 地球近景：每个日子一个机位（同一个日子始终是同一个对象，镜头才不会重复起飞） */
const near = new Map<number, THREE.Vector3>()
export const earthTarget = (day: number) => { const k = Math.round(day * 10) / 10; if (!near.has(k)) near.set(k, new THREE.Vector3(...earthAt(k))); return near.get(k)! }
export const S_EARTH: [number, number] = [RE * 3.4, RE * 3.0]
/** 近景的机位：从太阳那一侧斜着看，亮的半边朝镜头 */
const views = new Map<string, [number, number]>()
export function earthView(day: number, side = 1.2, up = 0.22): [number, number] {
  const k = `${Math.round(day * 10)}|${side}|${up}`
  if (!views.has(k)) { const [x, , z] = earthAt(day); views.set(k, [Math.atan2(-x, -z) + side, up]) }
  return views.get(k)!
}

/** 镜头朝这个机位看时，地球上这个方向的点是不是朝着镜头（背面的城市标签要藏起来） */
export const facing = (dir: [number, number, number], view: [number, number]) => {
  const [az, el] = view
  return dir[0] * Math.sin(az) * Math.cos(el) + dir[1] * Math.sin(el) + dir[2] * Math.cos(az) * Math.cos(el) > 0.12
}
/** 看两个面的机位：几乎顺着两个面的交线看过去，夹角才看得清 */
export const V_PLANES: [number, number] = [0.16, 0.1]
export const S_PLANES: [number, number] = [RE * 10.5, RE * 5.2]
/** 从北极上空、南极上空看的机位 */
export const V_NORTH: [number, number] = [0.6, 1.25], V_SOUTH: [number, number] = [0.6, -1.25]

/** 操场上：白天的天空色，靠环境光和那一课自己的太阳光 */
export const DAYLIGHT = { sky: false, backdrop: '#a9cdea', env: 1.0, sun: 0, fog: [300, 1500] as [number, number] }
