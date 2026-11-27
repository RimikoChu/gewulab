// 概率实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '摸球箱'], ['2', '2', '掷骰子'], ['3', '3', '转盘和扑克'], ['4', '4', '两枚骰子'],
  ['5', '5', '摸两次球'], ['6', '6', '抛硬币'], ['7', '7', '抽检瓷碗'], ['x', '拓展', '投针和图钉'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
