// 血液循环实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '血液的组成'], ['2', '2', '三种血管'], ['3', '3', '心脏的结构'], ['4', '4', '心脏怎样泵血'],
  ['5', '5', '体循环'], ['6', '6', '肺循环'], ['7', '7', '在哪里换了气'], ['x', '拓展', '量血压 · 数脉搏'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
