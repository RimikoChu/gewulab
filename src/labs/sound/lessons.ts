// 声现象实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '声音的产生'], ['2', '2', '声音的传播'], ['3', '3', '声速和回声'], ['4', '4', '音调'],
  ['5', '5', '响度'], ['6', '6', '音色'], ['7', '7', '噪声的控制'], ['x', '拓展', '共鸣 · 超声 · 声呐'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
