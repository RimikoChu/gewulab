// 功和机械能实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '力做功了没有'], ['2', '2', '功的计算'], ['3', '3', '功率'], ['4', '4', '动能'], ['5', '5', '势能'],
  ['6', '6', '动能和势能的转化'], ['7', '7', '机械能守恒'], ['x', '拓展', '蹦极 · 滚摆'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
