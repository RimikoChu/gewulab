// 欧姆定律实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '电流与电压'], ['2', '2', '电流与电阻'], ['3', '3', '欧姆定律'], ['4', '4', '伏安法测电阻'], ['5', '5', '小灯泡的电阻'],
  ['6', '6', '串联和并联的电阻'], ['7', '7', '安全用电'], ['x', '拓展', '色环电阻 · 油量表'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
