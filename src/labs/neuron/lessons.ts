// 兴奋的传导和传递实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '神经元'], ['2', '2', '静息电位'], ['3', '3', '动作电位'], ['4', '4', '纤维上传导'],
  ['5', '5', '电表偏转'], ['6', '6', '突触'], ['7', '7', '兴奋和抑制'], ['x', '拓展', '药物'], ['q', '测', '检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
export const TITLE = '兴奋的传导和传递'
