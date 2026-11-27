// 基因的表达实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', 'DNA 的双螺旋'], ['2', '2', 'DNA 的复制'], ['3', '3', '基因与 DNA'], ['4', '4', '转录'],
  ['5', '5', '遗传密码'], ['6', '6', '翻译'], ['7', '7', '基因突变'], ['x', '拓展', '中心法则 · DNA 指纹'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
