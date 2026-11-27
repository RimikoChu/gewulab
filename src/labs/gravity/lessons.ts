// 万有引力与航天实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '行星的运动'], ['2', '2', '周期定律'], ['3', '3', '称出引力常量'], ['4', '4', '称量地球'],
  ['5', '5', '宇宙速度'], ['6', '6', '人造卫星'], ['7', '7', '卫星变轨'], ['x', '拓展', '空间站 · 别的星球'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
