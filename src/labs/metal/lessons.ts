// 金属和炼铁实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '金属的物理性质'], ['2', '2', '金属和氧气'], ['3', '3', '金属和酸'], ['4', '4', '金属和盐溶液'], ['5', '5', '金属活动性顺序'],
  ['6', '6', '铁的冶炼'], ['7', '7', '铁的锈蚀和防护'], ['x', '拓展', '轧钢车间'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
