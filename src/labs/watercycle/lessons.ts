// 水循环实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '水都在哪里'], ['2', '2', '一滴水的旅行'], ['3', '3', '三种循环'], ['4', '4', '雨落在什么地上'],
  ['5', '5', '修一座水库'], ['6', '6', '城市为什么会内涝'], ['7', '7', '一年的水账'], ['x', '拓展', '更新 · 调水 · 森林'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
