// 二次函数实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '画一个圆形花坛'], ['2', '2', '喷泉的水柱'], ['3', '3', '把水柱挪一挪'], ['4', '4', '投篮的轨迹'],
  ['5', '5', '水滴能升多高'], ['6', '6', '桥下的水面'], ['7', '7', '围一个最大的花圃'], ['x', '拓展', '租金 · 三点定水柱'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
