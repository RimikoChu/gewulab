// 遗传和变异实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '性状和相对性状'], ['2', '2', '染色体、DNA 和基因'], ['3', '3', '基因经生殖细胞传递'], ['4', '4', '孟德尔的杂交实验'],
  ['5', '5', '显性和隐性'], ['6', '6', '人的性别遗传'], ['7', '7', '生物的变异'], ['x', '拓展', '豆荚里的 3∶1 · 测交'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
