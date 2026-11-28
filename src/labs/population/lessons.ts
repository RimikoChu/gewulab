// 种群和生态系统实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '样方法'], ['2', '2', '标记重捕'], ['3', '3', '年龄结构'], ['4', '4', 'J 形增长'], ['5', '5', 'S 形增长'],
  ['6', '6', '捕食'], ['7', '7', '能量流动'], ['x', '拓展', '碳循环渔场'], ['q', '测', '检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
