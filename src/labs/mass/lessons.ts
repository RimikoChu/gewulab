// 质量守恒定律实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '红磷燃烧'], ['2', '2', '铁和硫酸铜'], ['3', '3', '不平衡了？'], ['4', '4', '原子重组'], ['5', '5', '方程式的意义'],
  ['6', '6', '配平'], ['7', '7', '计算'], ['x', '拓展', '工厂里的守恒'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
