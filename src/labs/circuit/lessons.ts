// 电路实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '电路的组成'], ['2', '2', '串联和并联'], ['3', '3', '电流表'], ['4', '4', '电流的规律'],
  ['5', '5', '电压表'], ['6', '6', '电压的规律'], ['7', '7', '电阻和变阻器'], ['x', '拓展', '双控开关 · 插座'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
