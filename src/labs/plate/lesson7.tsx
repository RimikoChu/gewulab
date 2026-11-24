// 板块运动 · 第 7 课 火山和地震带：回到太空里的地球。先标出著名的火山和大地震，再叠上板块边界，看它们落在哪里；
// 最后把两条带分别加亮：环太平洋火山地震带、地中海—喜马拉雅火山地震带。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { globeFacing, globePoint } from './globe'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BELTS, beltCount, farthestFromBoundary, type BeltKey } from './physics'
import { QUAKES, VOLCANOES, type LL } from './plates'
import { VOICE } from './voice'
import { SPACE, SPOT, type Want } from './world'

const TASKS: Task[] = [
  { id: 'marks', text: '在地球上标出火山和大地震', note: '火山和地震不是到处都有，而是集中在几条带上' },
  { id: 'lines', text: '叠上板块的边界', note: '火山、地震几乎都在板块交界的地方' },
  { id: 'pacific', text: '看环太平洋火山地震带', note: '围着太平洋一圈：太平洋板块和周围板块的交界处' },
  { id: 'alpide', text: '看地中海—喜马拉雅火山地震带', note: '从地中海往东，经喜马拉雅山到印度尼西亚：亚欧板块和非洲、印度洋板块的交界处' },
]
const FACES: Record<'start' | BeltKey, LL> = { start: [20, 20], pacific: [-165, 8], alpide: [55, 26] }
const BELT_KEYS = Object.keys(BELTS) as BeltKey[]
const SHORT: Record<BeltKey, string> = { pacific: '环太平洋', alpide: '地中海—喜马拉雅' }
/** 每条带上挑两处标名字 */
const NAMED: Record<BeltKey, string[]> = { pacific: ['富士山', '2011 日本东北', '1960 智利', '圣海伦斯火山'], alpide: ['维苏威火山', '2015 尼泊尔', '2004 苏门答腊'] }

export default function Lesson7() {
  const [marks, setMarks] = useState(false), [lines, setLines] = useState(false)
  const mk = useSlide(marks ? 1 : 0, 0.8), ln = useSlide(lines ? 1 : 0, 0.8)
  const [belt, setBelt] = useState<BeltKey | null>(null)
  const [lonGoal, setLonGoal] = useState(FACES.start[0]), [latGoal, setLatGoal] = useState(FACES.start[1])
  const lon = useSlide(lonGoal, 60), lat = useSlide(latGoal, 25), turning = Math.abs(lon - lonGoal) > 0.05 || Math.abs(lat - latGoal) > 0.05
  const T = useTasks('gewu:plate:7', TASKS)
  useEffect(() => { if (mk > 0.99) T.check(id => id === 'marks') }, [mk > 0.99])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ln > 0.99) T.check(id => id === 'lines') }, [ln > 0.99])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (belt && !turning && T.done.lines) T.check(id => id === belt) }, [belt, turning])   // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (b: BeltKey) => { setBelt(b); const [l, a] = FACES[b], d = ((l - lon) % 360 + 540) % 360 - 180; setLonGoal(lon + d); setLatGoal(a) }
  const resetAll = () => { setMarks(false); setLines(false); setBelt(null); setLonGoal(FACES.start[0]); setLatGoal(FACES.start[1]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'marks' | 'lines' | 'belt' | null } = (() => {
    if (!task) return { hint: '都做完了。火山和地震集中在板块交界的地带。', next: null }
    if (turning) return { hint: '地球转过来…', next: null }
    if (task.id === 'marks') return mk > 0.01 ? { hint: '标出火山和地震…', next: null } : { hint: '在地球上标出著名的火山和大地震', next: 'marks' }
    if (task.id === 'lines') return ln > 0.01 ? { hint: '叠上板块边界…', next: null } : { hint: '它们在哪？叠上板块的边界看看', next: 'lines' }
    return { hint: `看${BELTS[task.id as BeltKey]}`, next: 'belt' }
  })()

  const face: LL = [lon, lat]
  const named = belt ? [...VOLCANOES, ...QUAKES].filter(x => NAMED[belt].includes(x.name)) : []
  const labels: Label[] = named.map(x => ({ id: x.name, at: globePoint(x.at, face, 1.03), ax: 0, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: globeFacing(x.at, face) && !turning ? 1 : 0 }, children: x.name }))
  const n = belt ? beltCount(belt) : null
  const s = SPOT.globe
  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title="板块运动" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...SPACE} world={{ globe: { face, lines: ln, volcanoes: mk, quakes: mk, belt } }}>{null}</LabStage>}
      lesson={<LessonBlock no="7" title="火山和地震带" concept="火山、地震多在板块交界处" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>板块内部比较稳定；板块和板块的交界地带，地壳比较活跃，多火山、地震。世界上的火山和地震主要集中在两条带上：</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">环太平洋火山地震带：</b>围着太平洋一圈，日本、智利都在这条带上</li>
            <li><b className="text-[#7fe3d4]">地中海—喜马拉雅火山地震带：</b>从地中海经喜马拉雅山到印度尼西亚</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">图上标的是一些著名的火山和二十世纪以来的大地震，不是全部。橙色锥是火山，红点是地震。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两条火山地震带都找到了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">火山、地震多分布在板块交界处</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">环太平洋带和地中海—喜马拉雅带，都在板块和板块交界的地方。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{belt ? `${SHORT[belt]}带上（图上）` : '图上标出的'}</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{mk > 0.5 ? (n ? `${n.v + n.q}` : VOLCANOES.length + QUAKES.length) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">处</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="火山" value={mk > 0.5 ? (n ? `${n.v} / ${n.vAll}` : String(VOLCANOES.length)) : '—'} unit={n ? '座 · 在这条带上 / 全部' : '座'} />
            <ParamTile symbol="大地震" value={mk > 0.5 ? (n ? `${n.q} / ${n.qAll}` : String(QUAKES.length)) : '—'} unit={n ? '次 · 在这条带上 / 全部' : '次'} />
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">{ln > 0.5 ? `图上的每一处，离最近的板块交界都不超过约 ${Math.ceil(farthestFromBoundary() / 100) * 100} km。` : '火山：橙色锥；地震：红点。'}</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'marks'} pulse={next === 'marks'} onClick={() => setMarks(true)} disabled={marks}>标出火山和地震</LabButton>
        <LabButton primary={next === 'lines'} pulse={next === 'lines'} onClick={() => setLines(true)} disabled={!marks || lines}>叠上板块边界</LabButton>
      </>}
      extras={
        <Control label="加亮一条带">
          <Segmented label="火山地震带" pulse={next === 'belt'} want={next === 'belt' ? (task?.id as BeltKey) : null} value={(belt ?? '') as BeltKey} onChange={b => choose(b as BeltKey)} disabled={!lines || turning} options={BELT_KEYS.map(b => ({ value: b, label: SHORT[b] }))} />
        </Control>
      }
    />
  )
}
