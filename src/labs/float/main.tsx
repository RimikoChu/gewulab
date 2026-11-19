import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import Lesson1 from './lesson1'
import Lesson2 from './lesson2'
import Lesson3 from './lesson3'
import Lesson4 from './lesson4'
import Lesson5 from './lesson5'
import Lesson6 from './lesson6'
import Lesson7 from './lesson7'
import LessonX from './lessonx'
import Quiz from './quiz'
import { StageHost } from '@/lab-kit'
import { Shipyard, type DockWant } from './dock'
import { isReady } from './lessons'

// 地址栏 # 后面是课号；没有或写错就从第 1 课开始
const current = () => { const k = location.hash.slice(1); return isReady(k) ? k : '1' }
function FloatLab() {
  const [key, setKey] = useState(current)
  useEffect(() => { const on = () => setKey(current()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  return (
    <>
      {/* 整座造船厂只建一次：换课时画布不重建，镜头飞到另一处 */}
      <StageHost<DockWant> world={w => <Shipyard want={w} />} />
      {key === 'q' ? <Quiz key="q" /> : key === 'x' ? <LessonX key="x" /> : key === '7' ? <Lesson7 key="7" /> : key === '6' ? <Lesson6 key="6" /> : key === '5' ? <Lesson5 key="5" /> : key === '4' ? <Lesson4 key="4" /> : key === '3' ? <Lesson3 key="3" /> : key === '2' ? <Lesson2 key="2" /> : <Lesson1 key="1" />}
    </>
  )
}
createRoot(document.getElementById('root')!).render(<FloatLab />)
