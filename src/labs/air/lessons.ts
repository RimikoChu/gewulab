// 空气和氧气实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '空气成分'], ['2', '2', '一瓶氧气'], ['3', '3', '氧气里燃烧'], ['4', '4', '多变一'], ['5', '5', '制氧气'],
  ['6', '6', '催化剂'], ['7', '7', '工厂制氧'], ['x', '拓展', '小实验'], ['q', '测', '检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
