// 热力环流和风实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '垂直分层'], ['2', '2', '削弱作用'], ['3', '3', '保温作用'], ['4', '4', '热力环流'],
  ['5', '5', '高空的风'], ['6', '6', '近地面的风'], ['7', '7', '身边的环流'], ['x', '拓展', '工厂建在哪'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
