// 从石油到塑料实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '分馏'], ['2', '2', '裂化裂解'], ['3', '3', '甲烷'], ['4', '4', '乙烯'], ['5', '5', '苯'],
  ['6', '6', '官能团'], ['7', '7', '加聚'], ['x', '拓展', '回收'], ['q', '测', '检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
