// 植物的一生实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '种子的结构'], ['2', '2', '萌发的环境条件'], ['3', '3', '萌发的过程'], ['4', '4', '根的生长'],
  ['5', '5', '芽发育成枝条'], ['6', '6', '开花和传粉'], ['7', '7', '受精和结果'], ['x', '拓展', '发芽率 · 无土栽培 · 人工授粉'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
