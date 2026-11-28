// 光的波动性和光电效应实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '双缝干涉'], ['2', '2', '条纹间距'], ['3', '3', '测波长'], ['4', '4', '薄膜干涉'], ['5', '5', '衍射和偏振'], ['6', '6', '光电效应'], ['7', '7', '遏止电压'], ['x', '拓展', '拓展课'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
/** 顶栏上显示的实验室名字 */
export const TITLE = '光的波动性和光电效应'
