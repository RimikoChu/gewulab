// 浮力实验室的课次表。ready 为 true 的才能点开
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '水里变轻了'], ['2', '2', '浮力从哪来'], ['3', '3', '和什么有关'], ['4', '4', '阿基米德原理'],
  ['5', '5', '沉还是浮'], ['6', '6', '钢铁变成船'], ['7', '7', '飘在空中'], ['x', '拓展', '太空 · 冰山 · 沉船 · 王冠'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
