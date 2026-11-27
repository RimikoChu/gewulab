// 带电粒子在磁场中实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '安培力'], ['2', '2', '洛伦兹力'], ['3', '3', '圆周运动的半径'], ['4', '4', '周期与速度无关'], ['5', '5', '速度选择器'],
  ['6', '6', '质谱仪'], ['7', '7', '回旋加速器'], ['x', '拓展', '磁流体发电机 · 极光'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
