// 细胞实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '认识显微镜'], ['2', '2', '放大多少倍'], ['3', '3', '对光和调焦'], ['4', '4', '做一张临时装片'],
  ['5', '5', '植物细胞里有什么'], ['6', '6', '动物细胞少了什么'], ['7', '7', '一个变两个'], ['x', '拓展', '长大 · 多莉 · 分化'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
