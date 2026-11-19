// 地球的运动实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '地球在自转'], ['2', '2', '东边先天亮'], ['3', '3', '斜着身子绕太阳'], ['4', '4', '太阳直射到哪了'],
  ['5', '5', '白天有多长'], ['6', '6', '影子的长短'], ['7', '7', '五带'], ['x', '拓展', '算高度 · 不倾斜 · 傅科摆'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
