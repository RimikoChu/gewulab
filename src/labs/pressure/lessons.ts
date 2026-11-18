// 压强实验室的课次表。ready 为 true 的才能点开
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '压出来的坑'], ['2', '2', '压强'], ['3', '3', '水里的压强'], ['4', '4', '大坝为什么上窄下宽'],
  ['5', '5', '船怎样翻过大坝'], ['6', '6', '空气也在压'], ['7', '7', '流得快，压得轻'], ['x', '拓展', '半球 · 深海 · 高原 · 千斤顶'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
