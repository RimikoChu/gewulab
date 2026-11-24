// 水的净化和组成实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '天然水里有什么'], ['2', '2', '沉淀'], ['3', '3', '过滤'], ['4', '4', '吸附'], ['5', '5', '自来水厂'],
  ['6', '6', '硬水和软水'], ['7', '7', '水的组成'], ['x', '拓展', '开放日展台'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
