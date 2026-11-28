// 兴奋的传导和传递实验室的入口：常驻舞台（整个大场景只建一次）+ 按课号切换各课。
import { useEffect, useState, type ComponentType } from 'react'
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
import { World } from './world'

// 做好一课，在这里加一项
const PAGES: Record<string, ComponentType> = { '1': Lesson1, '2': Lesson2, '3': Lesson3, '4': Lesson4, '5': Lesson5, '6': Lesson6, '7': Lesson7, x: LessonX, q: Quiz }
// 地址栏 # 后面是课号；没有或写错就从第 1 课开始
const current = () => { const k = location.hash.slice(1); return isReady(k) && PAGES[k] ? k : '1' }
function Lab() {
  const [key, setKey] = useState(current)
  useEffect(() => { const on = () => setKey(current()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  const Page = PAGES[key]
  return (
    <>
      {/* 整个大场景只建一次：换课时画布不重建，镜头沿着神经纤维飞过去 */}
      <StageHost<{ open: boolean }> world={w => <World open={!!w?.open} />} />
      <Page key={key} />
    </>
  )
}
createRoot(document.getElementById('root')!).render(<Lab />)
