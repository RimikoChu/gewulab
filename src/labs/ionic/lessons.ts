// 水溶液里的离子平衡实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '强弱电解质'], ['2', '2', '电离平衡'], ['3', '3', '水的电离'], ['4', '4', 'pH 的计算'], ['5', '5', '中和滴定'],
  ['6', '6', '盐类的水解'], ['7', '7', '沉淀溶解平衡'], ['x', '拓展', '纯碱和铝盐'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
