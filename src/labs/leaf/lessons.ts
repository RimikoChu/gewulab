// 光合作用和呼吸作用实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '叶片见光才有淀粉'], ['2', '2', '冒出来的气泡'], ['3', '3', '没有二氧化碳行不行'], ['4', '4', '走进一片叶子'],
  ['5', '5', '种子也在呼吸'], ['6', '6', '大棚的一昼夜'], ['7', '7', '让大棚多产一点'], ['x', '拓展', '蜡烛 · 柳树 · 银边'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
