// 接触法制硫酸实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '沸腾炉'], ['2', '2', '净化'], ['3', '3', '接触室'], ['4', '4', '选温度'],
  ['5', '5', '压强和空气'], ['6', '6', '吸收'], ['7', '7', '浓硫酸'], ['x', '拓展', '热和料'], ['q', '测', '检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
