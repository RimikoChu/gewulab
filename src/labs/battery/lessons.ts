// 原电池实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '连上导线以后'], ['2', '2', '电子往哪走'], ['3', '3', '少一样行不行'], ['4', '4', '换一对电极'],
  ['5', '5', '为什么要用盐桥'], ['6', '6', '剖开一节干电池'], ['7', '7', '只排出水的电池'], ['x', '拓展', '水果 · 防腐 · 回收'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
