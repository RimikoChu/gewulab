// 大棚里的几处机位。各课从这里取，同一处始终是同一个对象，换课时镜头才会飞过去而不是重复起飞。
import * as THREE from 'three'
import { ST, TOP } from './world'

const at = (x: number, up = 0.5) => new THREE.Vector3(x, TOP + up, 0)
export const SPOT = { one: at(ST.one), two: at(ST.two), three: at(ST.three, 0.45), four: at(ST.four, 0.62), five: at(ST.five, 0.45), six: at(ST.six, 0.5) }
/** 实验台上一处的取景范围（宽、高，米） */
export const S_BENCH: [number, number] = [2.9, 1.65]
/** 整座大棚：从一头斜着往里看 */
export const T_HOUSE = new THREE.Vector3(-3, 1.6, 0)
export const S_HOUSE: [number, number] = [26, 9]
export const V_HOUSE: [number, number] = [-0.62, 0.3]
