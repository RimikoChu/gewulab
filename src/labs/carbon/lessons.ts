// 碳和二氧化碳实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '碳的单质'], ['2', '2', '制取二氧化碳'], ['3', '3', '二氧化碳的性质'], ['4', '4', '与水、石灰水'], ['5', '5', '汽水厂'],
  ['6', '6', '一氧化碳'], ['7', '7', '碳循环'], ['x', '拓展', '干冰'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
