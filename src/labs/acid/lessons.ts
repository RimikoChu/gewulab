// 酸、碱和中和实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '酸碱指示剂'], ['2', '2', '常见的酸'], ['3', '3', '酸的性质'], ['4', '4', '常见的碱'], ['5', '5', '中和反应'],
  ['6', '6', '酸碱度'], ['7', '7', '中和池'], ['x', '拓展', '紫甘蓝和中和热'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
