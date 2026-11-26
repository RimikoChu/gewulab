// 天气和气候实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '天气和气候'], ['2', '2', '气温的测量'], ['3', '3', '气温的分布'], ['4', '4', '降水的测量'],
  ['5', '5', '降水的分布'], ['6', '6', '气候资料图'], ['7', '7', '影响气候的因素'], ['x', '拓展', '翻过这座山'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
