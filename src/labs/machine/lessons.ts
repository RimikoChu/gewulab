// 简单机械实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '杠杆'], ['2', '2', '杠杆的平衡条件'], ['3', '3', '斜着拉'], ['4', '4', '杠杆的分类'],
  ['5', '5', '定滑轮和动滑轮'], ['6', '6', '滑轮组'], ['7', '7', '机械效率'], ['x', '拓展', '塔吊 · 轮轴 · 斜面'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
