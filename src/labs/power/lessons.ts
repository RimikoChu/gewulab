// 电功率和生活用电实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '电能和电能表'], ['2', '2', '电功率'], ['3', '3', '额定功率和实际功率'], ['4', '4', '焦耳定律'], ['5', '5', '家庭电路的组成'],
  ['6', '6', '安全用电'], ['7', '7', '电流过大的原因'], ['x', '拓展', '配电房 · 一天的电'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
