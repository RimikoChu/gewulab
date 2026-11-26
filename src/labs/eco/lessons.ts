// 生态系统实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '生物和环境'], ['2', '2', '生态系统的组成'], ['3', '3', '食物链'], ['4', '4', '食物网'], ['5', '5', '能量流动'],
  ['6', '6', '物质循环和生物富集'], ['7', '7', '生态平衡'], ['x', '拓展', '不同的生态系统 · 生态瓶'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
