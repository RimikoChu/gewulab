// 溶液实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '溶液的形成'], ['2', '2', '吸热和放热'], ['3', '3', '饱和溶液'], ['4', '4', '溶解度'], ['5', '5', '溶解度曲线'],
  ['6', '6', '结晶'], ['7', '7', '溶质的质量分数'], ['x', '拓展', '盐场的一年'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
