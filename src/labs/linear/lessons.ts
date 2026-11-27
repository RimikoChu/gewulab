// 一次函数实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '谁在变'], ['2', '2', '一个对一个'], ['3', '3', '列表、描点、连线'], ['4', '4', '过原点的直线'],
  ['5', '5', 'k 和 b'], ['6', '6', '两组读数定直线'], ['7', '7', '选哪种运费'], ['x', '拓展', '生活里的一次函数'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
