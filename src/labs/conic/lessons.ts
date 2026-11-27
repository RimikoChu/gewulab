// 圆锥曲线实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '用平面切圆锥'], ['2', '2', '两钉一绳画椭圆'], ['3', '3', '椭圆的方程和离心率'], ['4', '4', '双曲线'],
  ['5', '5', '抛物线：焦点和准线'], ['6', '6', '天线为什么是抛物面'], ['7', '7', '行星的椭圆轨道'], ['x', '拓展', '回音壁 · 双曲线镜 · 冷却塔'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
