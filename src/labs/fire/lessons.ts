// 燃烧和灭火实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '燃烧需要可燃物'], ['2', '2', '燃烧需要氧气'], ['3', '3', '温度要达到着火点'], ['4', '4', '燃烧的三个条件'],
  ['5', '5', '灭火的原理'], ['6', '6', '灭火器的选择'], ['7', '7', '易燃物和易爆物'], ['x', '拓展', '训练场上的三件事'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
