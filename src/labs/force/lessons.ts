// 力和运动实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '力的作用效果'], ['2', '2', '弹力和测力计'], ['3', '3', '重力'], ['4', '4', '阻力和运动'],
  ['5', '5', '惯性'], ['6', '6', '二力平衡'], ['7', '7', '滑动摩擦力'], ['x', '拓展', '合力 · 擦冰 · 滚动'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
