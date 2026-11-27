// 减数分裂和遗传规律实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(["1", "2", "3", "4", "5", "6", "7", "x", "q"])
const ALL: [string, string, string][] = [
  ['1', '1', '减数第一次分裂'], ['2', '2', '减数第二次分裂'], ['3', '3', '精子和卵细胞的形成'], ['4', '4', '受精作用'],
  ['5', '5', '分离定律'], ['6', '6', '自由组合定律'], ['7', '7', '伴性遗传'], ['x', '拓展', '遗传咨询中的概率'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
