// 电解和金属防护实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '电解氯化铜'], ['2', '2', '电解池原理'], ['3', '3', '放电顺序'], ['4', '4', '氯碱工业'], ['5', '5', '电镀和精炼'],
  ['6', '6', '电化学腐蚀'], ['7', '7', '电化学防护'], ['x', '拓展', '电冶金'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
