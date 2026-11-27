// 地球和经纬网实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '地球是个球体'], ['2', '2', '地球仪'], ['3', '3', '纬线和纬度'], ['4', '4', '经线和经度'],
  ['5', '5', '用经纬网定位'], ['6', '6', '半球的划分'], ['7', '7', '经纬网上的方向'], ['x', '拓展', '六分仪 · 一度有多长'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
