// 电磁感应和电网实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '磁通量'], ['2', '2', '感应电流的条件'], ['3', '3', '楞次定律'], ['4', '4', '法拉第电磁感应定律'], ['5', '5', '交流发电机'],
  ['6', '6', '变压器'], ['7', '7', '远距离输电'], ['x', '拓展', '涡流和电磁阻尼'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
