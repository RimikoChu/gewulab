// 等高线地形图实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '海拔和相对高度'], ['2', '2', '等高线怎么画'], ['3', '3', '疏密和坡度'], ['4', '4', '山峰和盆地'],
  ['5', '5', '山脊和山谷'], ['6', '6', '鞍部和陡崖'], ['7', '7', '分层设色和剖面'], ['x', '拓展', '选路线 · 选址'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
