// 消化和吸收实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '食物中的营养物质'], ['2', '2', '消化系统的组成'], ['3', '3', '口腔里的消化'], ['4', '4', '胃里的消化'],
  ['5', '5', '小肠里的消化'], ['6', '6', '吸收'], ['7', '7', '合理营养'], ['x', '拓展', '一顿饭的旅程'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
