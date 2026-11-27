// 大气环流 · 第 1 课 单圈环流：假设地球不自转、地表均匀。大气沿经线方向剖开一刀，剖面上看赤道受热上升、极地冷却下沉，转成一个大圈；
// 地面上的白色箭头是近地面的风。镜头从非洲上空侧看，剖面斜着朝向镜头。
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Fin, H2, noteTag, pTag } from './parts'
import { windAtName, type Air } from './physics'
import { VOICE } from './voice'
import { SPACE, at, azFor, cutView, type Want } from './world'

const TASKS: Task[] = [
  { id: 'heat', text: '让太阳照射地球，赤道受热多、两极受热少', note: '赤道变暖、两极变冷' },
  { id: 'loop', text: '看剖面上的空气怎样流动', note: '赤道上升，高空流向极地，极地下沉，近地面流回赤道' },
  { id: 'measure', text: '量一量近地面的气压和风向', note: '赤道低压、两极高压；北半球吹北风，南半球吹南风' },
]
const LON = 20, AZ = azFor(LON), EL = 0.16
const VIEW: [number, number] = [AZ, EL], TARGET = new THREE.Vector3(...cutView(AZ, 40, 0.62)), SPAN: [number, number] = [21, 10.5]
const AIR: Air = { k: 0, sunLat: 0 }

export default function Lesson1() {
  const [heat, setHeat] = useState(false)
  const [looped, setLooped] = useState(false)
  const [measured, setMeasured] = useState(false)
  const T = useTasks('gewu:circulation:1', TASKS)
  const tRef = useRef(T); tRef.current = T
  useEffect(() => { if (!heat) return; const t = setTimeout(() => { setLooped(true); tRef.current.check(id => id === 'loop') }, 5200); return () => clearTimeout(t) }, [heat])
  const doHeat = () => { setHeat(true); T.check(id => id === 'heat') }
  const measure = () => { setMeasured(true); T.check(id => id === 'measure') }
  const resetAll = () => { setHeat(false); setLooped(false); setMeasured(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'heat' | 'measure' | null } = (() => {
    if (!task) return { hint: '都做完了。不自转时，每个半球只有一个大环流。', next: null }
    if (!heat) return { hint: '让太阳照射：赤道受热多，两极受热少', next: 'heat' }
    if (!looped) return { hint: '赤道的空气受热上升，看它往哪里去…', next: null }
    return { hint: '量一量近地面的气压和风向', next: 'measure' }
  })()

  const nWind = windAtName(LON, 35, AIR)
  const labels: Label[] = [
    noteTag('eq', cutView(AZ, 8, 0.5), '赤道 · 受热上升', heat, 1),
    noteTag('np', cutView(AZ, 80, 0.5), '极地 · 冷却下沉', heat, 1),
    noteTag('up', cutView(AZ, 45, 1.08), '高空：从赤道流向极地', looped, 0),
    noteTag('down', cutView(AZ, 45, -0.12), measured ? `近地面：从极地流回赤道 · ${nWind}` : '近地面：从极地流回赤道', looped, 0.5),
    noteTag('shell', cutView(AZ, 62, 1.06), '大气层（厚度放大，示意）', true, 0),
    pTag('pLow', cutView(AZ, 3, -0.3), '低压', false, measured, 0.5),
    pTag('pHn', cutView(AZ, 86, -0.3), '高压', true, measured, 0.5),
  ]
  const want: Want = {
    sun: { az: AZ / (Math.PI / 180) + 38, lat: 0 }, uniform: 0.95, night: 0.12, cloud: 0.3, grid: 0.45,
    tilt: true, cut: { az: AZ, heat: heat ? 1 : 0, k: 0, on: 1 },
    winds: { air: AIR, on: looped ? 1 : 0, n: 1100 },
    press: { air: AIR, key: 'single', on: measured ? 0.7 : 0 },
  }
  return (
    <LabShell narration={voiced(NARRATION['1'], VOICE)} title="大气环流" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球不自转 · 地表均匀"
      stage={<LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEW} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="1" title="单圈环流" concept="不自转时，赤道和两极之间只有一个环流" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>先假设两件事：<b className="text-white">地球不自转，地表是均匀的</b>。这样大气的运动只由冷热不均决定。</p>
          <p className="mt-2">赤道受热多，空气膨胀上升，近地面形成<b className="text-[#ff8a8f]">低压</b>，高空形成高压；极地受热少，空气冷却下沉，近地面形成<b className="text-[#8fb0ff]">高压</b>，高空形成低压。</p>
          <p className="mt-2">于是高空的空气从赤道流向极地，近地面的空气从极地流回赤道，每个半球形成一个闭合的环流，叫<b className="text-white">单圈环流</b>。北半球近地面吹北风，南半球吹南风。</p>
          <p className="mt-2 text-[13.5px] text-white/65">大气层的厚度放大了很多倍，真实的对流层只有地球半径的约千分之二。</p>
        </>} />}
      finale={T.finale && <Fin kicker="单圈环流转起来了" big="不自转时，每个半球只有一个大环流" small="赤道受热上升、近地面成低压；极地冷却下沉、近地面成高压。近地面的风从极地吹向赤道：北半球是北风，南半球是南风。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label="北半球近地面的风" value={measured ? nWind : '—'} />
          <H2>关键参数</H2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="自转" value="不自转" unit="假设" />
            <ParamTile symbol="地表" value="均匀" unit="假设" />
            <ParamTile symbol="赤道" value={measured ? '低压' : '—'} unit="近地面" />
            <ParamTile symbol="极地" value={measured ? '高压' : '—'} unit="近地面" />
          </div>
          <H2>看图</H2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">剖面上红色是暖空气、蓝色是冷空气，箭头是气流；地面上的白色箭头是近地面的风。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={!heat} pulse={next === 'heat'} onClick={doHeat} disabled={heat}>让太阳照射</LabButton>
        <LabButton primary={heat} pulse={next === 'measure'} onClick={measure} disabled={!looped || measured}>量气压和风向</LabButton>
      </>}
      extras={null}
    />
  )
}
