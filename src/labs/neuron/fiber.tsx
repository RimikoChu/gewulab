// 兴奋的传导和传递 · 第 4、5 课共用：一长段神经纤维上的位置换算，和“兴奋区从刺激点朝两边走”的驱动。
import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { smooth, type Run } from './kit'
import { SPEED } from './physics'
import { setZones } from './wave'

/** 这段纤维在大场景里从哪到哪；1 cm 画成 0.8 个单位 */
export const FX0 = 44.2, UNIT = 0.8
/** 纤维上的 cm 换成大场景里的 x */
export const xOf = (cm: number) => FX0 + cm * UNIT
/** 慢放：刺激电极在第 T0 秒放电；之后兴奋区每秒走 1.6 个单位 */
export const T0 = 0.8, V_ANIM = 1.6, ZONE_W = 0.72
/** 画面上的第 t 秒，对应刺激后多少毫秒 */
export const msOf = (t: number) => Math.max(0, t - T0) * V_ANIM / UNIT / 100 / SPEED * 1000
/** 刺激后多少毫秒，对应画面上的第几秒 */
export const secOf = (ms: number) => T0 + ms / 1000 * SPEED * 100 * UNIT / V_ANIM
/** 兴奋区离刺激点多远（场景单位） */
export const reach = (t: number) => Math.max(0, t - T0) * V_ANIM

/** 兴奋区从 x = s 处朝两边走；走出 [lo, hi] 就淡掉。right、left：哪边能走 */
export function Fronts({ run, s, lo, hi, left = true, right = true }: { run: Run; s: number; lo: number; hi: number; left?: boolean; right?: boolean }) {
  useFrame(() => {
    if (run.idle) { setZones([]); return }
    const t = run.ref.current, d = reach(t), on = smooth(T0 - 0.05, T0 + 0.25, t)
    const z = (x: number) => ({ x, w: ZONE_W, a: on * (1 - smooth(hi + 0.3, hi + 1.6, x)) * smooth(lo - 1.6, lo - 0.3, x) })
    setZones([...(right ? [z(s + d)] : []), ...(left ? [z(s - d)] : [])])
  })
  useEffect(() => () => setZones([]), [])
  return null
}
