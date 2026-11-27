// 光反应和暗反应实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '叶绿体的结构'], ['2', '2', '色素的提取和分离'], ['3', '3', '色素吸收什么光'], ['4', '4', '光反应'],
  ['5', '5', '暗反应'], ['6', '6', '两个阶段的联系'], ['7', '7', '影响光合速率的因素'], ['x', '拓展', '黄叶 · 补光 · 气肥'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
/** 实验室的名字 */
export const TITLE = '光反应和暗反应'
