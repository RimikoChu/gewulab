// 电磁感应和电网实验室的入口：一块常驻的画布（水电站和它送电的路），按地址栏 # 后面的课号换课。
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { StageHost } from '@/lab-kit'
import Lesson1 from './lesson1'
import Lesson2 from './lesson2'
import Lesson3 from './lesson3'
import Lesson4 from './lesson4'
import Lesson5 from './lesson5'
import Lesson6 from './lesson6'
import Lesson7 from './lesson7'
import LessonX from './lessonx'
import Quiz from './quiz'
import { isReady } from './lessons'
import { World, type Want } from './world'

// 地址栏 # 后面是课号；没有或写错就从第 1 课开始
const current = () => { const k = location.hash.slice(1); return isReady(k) ? k : '1' }
const PAGES: Record<string, () => React.ReactElement> = {
  '1': () => <Lesson1 key="1" />, '2': () => <Lesson2 key="2" />, '3': () => <Lesson3 key="3" />, '4': () => <Lesson4 key="4" />,
  '5': () => <Lesson5 key="5" />, '6': () => <Lesson6 key="6" />, '7': () => <Lesson7 key="7" />, x: () => <LessonX key="x" />, q: () => <Quiz key="q" />,
}
function Lab() {
  const [key, setKey] = useState(current)
  useEffect(() => { const on = () => setKey(current()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  return (
    <>
      {/* 整个大场景只建一次：换课时画布不重建，镜头飞到另一处 */}
      <StageHost<Want> world={w => <World {...w} />} />
      {(PAGES[key] ?? PAGES['1'])()}
    </>
  )
}
createRoot(document.getElementById('root')!).render(<Lab />)
