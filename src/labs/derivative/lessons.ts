// 导数实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '这几秒开了多快'], ['2', '2', '这一瞬间开多快'], ['3', '3', '坡有多陡'], ['4', '4', '导数怎么求'],
  ['5', '5', '上坡还是下坡'], ['6', '6', '坡顶和谷底'], ['7', '7', '最省料的易拉罐'], ['x', '拓展', '区间测速 · 最省油'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
