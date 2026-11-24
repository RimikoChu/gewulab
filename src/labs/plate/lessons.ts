// 板块运动实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '大陆漂移的猜想'], ['2', '2', '海底扩张'], ['3', '3', '六大板块'], ['4', '4', '板块张裂'],
  ['5', '5', '大陆和大陆相撞'], ['6', '6', '大洋和大陆相撞'], ['7', '7', '火山和地震带'], ['x', '拓展', '日本 · 板块的速度'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
