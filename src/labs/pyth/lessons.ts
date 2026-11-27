// 勾股定理实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '方砖上的发现'], ['2', '2', '拼图证明'], ['3', '3', '赵爽弦图'], ['4', '4', '木板过门框'],
  ['5', '5', '梯子滑下来'], ['6', '6', '数轴上的 √13'], ['7', '7', '结绳定直角'], ['x', '拓展', '三道古题'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
