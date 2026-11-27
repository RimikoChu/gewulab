// 抛体运动实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '弯道上的速度方向'], ['2', '2', '冲锋舟过河'], ['3', '3', '无人机同时投弹'], ['4', '4', '描轨迹求初速度'],
  ['5', '5', '空投：提前多远投'], ['6', '6', '水炮的射高和射程'], ['7', '7', '打中山坡上的火点'], ['x', '拓展', '斜面和风'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
