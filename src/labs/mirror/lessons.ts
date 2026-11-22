// 光的反射和平面镜实验室的课次表。做好一课，就把它的课号加进 READY
import type { LessonTab } from '@/components/lab/lab-shell'

const READY = new Set(['1', '2', '3', '4', '5', '6', '7', 'x', 'q'])
const ALL: [string, string, string][] = [
  ['1', '1', '光走直线'], ['2', '2', '反射定律'], ['3', '3', '镜面和白纸'], ['4', '4', '镜中的像'],
  ['5', '5', '画出像'], ['6', '6', '潜望镜 · 穿衣镜'], ['7', '7', '凹面镜 · 凸面镜'], ['x', '拓展', '日食 · 夹角镜 · 角反射'], ['q', '测', '随堂检测'],
]
export const LESSONS: LessonTab[] = ALL.map(([key, no, name]) => ({ key, no, name, disabled: !READY.has(key) }))
export const isReady = (key: string) => READY.has(key)
/** 切到另一课：改地址栏里 # 后面的课号，入口会跟着换 */
export const goLesson = (key: string) => { if (READY.has(key)) location.hash = key }
/** 顶栏左上角的名字 */
export const TITLE = '光的反射'
