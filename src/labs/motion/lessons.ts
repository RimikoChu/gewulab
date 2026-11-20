// 机械运动实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '量一量车票'], ['2', '2', '掐一掐时间'], ['3', '3', '到底谁在动'], ['4', '4', '谁跑得快'],
  ['5', '5', '一直一样快吗'], ['6', '6', '测一次平均速度'], ['7', '7', '赶火车'], ['x', '拓展', '误差 · 相对静止 · 尺度'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
