// 光的折射和凸透镜成像实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '光在水面拐了弯'], ['2', '2', '聚拢还是散开'], ['3', '3', '像在哪里'], ['4', '4', '三条光线画出像'],
  ['5', '5', '照相机 · 投影仪 · 放大镜'], ['6', '6', '眼睛和眼镜'], ['7', '7', '两块透镜接力'], ['x', '拓展', '色散 · 蜃景 · 变焦'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
