// 合成氨工厂实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '化学反应速率'], ['2', '2', '影响速率的因素'], ['3', '3', '化学平衡状态'], ['4', '4', '化学平衡常数'],
  ['5', '5', '影响平衡的因素'], ['6', '6', '合成氨的适宜条件'], ['7', '7', '分离氨和循环'], ['x', '拓展', '从氨到化肥'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
