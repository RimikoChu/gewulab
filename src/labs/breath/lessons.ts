// 呼吸实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '呼吸道'], ['2', '2', '肺和肺泡'], ['3', '3', '呼吸运动：胸廓'], ['4', '4', '呼吸运动：膈'],
  ['5', '5', '吸气和呼气'], ['6', '6', '肺泡里的气体交换'], ['7', '7', '呼出的气体'], ['x', '拓展', '胸围差 · 海姆立克'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
