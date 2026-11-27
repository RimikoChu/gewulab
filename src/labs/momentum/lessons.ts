// 动量和碰撞实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '动量'], ['2', '2', '冲量和动量定理'], ['3', '3', '动量守恒定律'], ['4', '4', '弹性碰撞和非弹性碰撞'],
  ['5', '5', '牛顿摆'], ['6', '6', '反冲'], ['7', '7', '火箭的推力'], ['x', '拓展', '弹开 · 长板和小车 · 斜碰'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
