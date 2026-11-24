// 板块运动 · 第 3 课 六大板块：在太空里给地球画上板块边界，转一圈认出六大板块，找到中国所在的板块；
// 最后飞回剖面，看板块（岩石圈）漂浮在软流层上。
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { globeFacing, globePoint } from './globe'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { LITHO_KM, PLATE_COUNT, plateName } from './physics'
import { PLATE_KEYS, PLATES, type LL, type PlateKey } from './plates'
import { X } from './shape'
import { VOICE } from './voice'
import { DAYLIGHT, SPACE, SPOT, type Want } from './world'

const TASKS: Task[] = [
  { id: 'lines', text: '画出板块的边界', note: '全球的岩石圈被分成几大块，叫板块' },
  { id: 'spin', text: '让地球转一圈，认一认六大板块', note: '六大板块：亚欧、非洲、美洲、太平洋、印度洋、南极洲板块' },
  { id: 'eurasia', text: '找到中国所在的板块', note: '中国在亚欧板块上，西南挨着印度洋板块，东边挨着太平洋板块' },
  { id: 'pacific', text: '找到几乎全是海洋的板块', note: '太平洋板块几乎全是海洋：板块不等于大陆' },
  { id: 'under', text: '剖开看看板块下面', note: '板块是一块块岩石圈，漂浮在软流层上，不停地运动' },
]
/** 板块名字标在哪 */
const TAG_AT: Record<PlateKey, LL> = { eurasia: [88, 52], africa: [18, 4], america: [-98, 42], pacific: [-155, 8], indian: [82, -24], antarctic: [50, -64] }
const SHORT: Record<PlateKey, string> = { eurasia: '亚欧', africa: '非洲', america: '美洲', pacific: '太平洋', indian: '印度洋', antarctic: '南极洲' }
const LOOK: Record<PlateKey, LL> = { eurasia: [100, 32], africa: [20, 0], america: [-80, 15], pacific: [-160, 0], indian: [85, -12], antarctic: [40, -50] }
const START: LL = [40, 18]
const UNDER = { target: new THREE.Vector3(X.ridge + 30, 9, 0), span: [104, 30] as [number, number], view: [0.08, 0.22] as [number, number] }

export default function Lesson3() {
  const [lines, setLines] = useState(false)
  const ln = useSlide(lines ? 1 : 0, 0.8)
  const [lonGoal, setLonGoal] = useState(START[0])
  const [latGoal, setLatGoal] = useState(START[1])
  const lon = useSlide(lonGoal, 45), lat = useSlide(latGoal, 20), turning = Math.abs(lon - lonGoal) > 0.05 || Math.abs(lat - latGoal) > 0.05
  const [pick, setPick] = useState<PlateKey | null>(null)
  const [under, setUnder] = useState(false)
  const T = useTasks('gewu:plate:3', TASKS)
  const [spun, setSpun] = useState(false)
  useEffect(() => { if (!spun || turning) return; T.check(id => id === 'spin') }, [spun, turning])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ln > 0.99) T.check(id => id === 'lines') }, [ln > 0.99])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!under) return; const t = setTimeout(() => T.check(id => id === 'under'), 3200); return () => clearTimeout(t) }, [under])   // eslint-disable-line react-hooks/exhaustive-deps
  const spin = () => { setLonGoal(g => g + 360); setLatGoal(START[1]); setSpun(true) }
  const choose = (k: PlateKey) => {
    setPick(k); setUnder(false)
    const [l, b] = LOOK[k], d = ((l - lon) % 360 + 540) % 360 - 180
    setLonGoal(lon + d); setLatGoal(b)
    if (T.done.spin) T.check(id => id === k)
  }
  const resetAll = () => { setLines(false); setLonGoal(START[0]); setLatGoal(START[1]); setPick(null); setUnder(false); setSpun(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'lines' | 'spin' | 'pick' | 'under' | null } = (() => {
    if (!task) return { hint: '都做完了。点一块板块，看看它在哪。', next: null }
    if (task.id === 'lines') return ln > 0.01 ? { hint: '画出板块的边界…', next: null } : { hint: '画出板块的边界', next: 'lines' }
    if (task.id === 'spin') return turning ? { hint: '地球在转：数一数一共几块', next: null } : { hint: '让地球转一圈，认一认六大板块', next: 'spin' }
    if (task.id === 'eurasia') return { hint: '中国在哪一块板块上？选出来', next: 'pick' }
    if (task.id === 'pacific') return { hint: '哪一块板块几乎全是海洋？选出来', next: 'pick' }
    return under ? { hint: '镜头飞到剖面…', next: null } : { hint: '剖开看看板块下面是什么', next: 'under' }
  })()
  const want: PlateKey | null = task?.id === 'eurasia' ? 'eurasia' : task?.id === 'pacific' ? 'pacific' : null

  const face: LL = [lon, lat]
  const globeLabels: Label[] = PLATE_KEYS.map(k => ({ id: k, at: globePoint(TAG_AT[k], face, 1.02), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: ln > 0.5 && globeFacing(TAG_AT[k], face) ? (pick && pick !== k ? 0.45 : 1) : 0 }, children: plateName(k) }))
  if (pick === 'eurasia') globeLabels.push({ id: 'cn', at: globePoint([104, 34], face, 1.02), ax: 0, className: 'scene-name -translate-y-1/2', children: '中国' })
  const secLabels: Label[] = [
    { id: 'am', at: [X.ridge - 13, 2.5, 0], ax: 0.5, className: 'scene-tag -translate-y-full', children: '美洲板块' },
    { id: 'af', at: [X.ridge + 42, 2.5, 0], ax: 0.5, className: 'scene-tag -translate-y-full', children: '非洲板块' },
    { id: 'mar', at: [X.ridge, -2.4, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '大西洋中脊' },
    { id: 'li', at: [X.ridge + 42, -8, 0], ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <><small>岩石圈</small>约 {LITHO_KM} km 厚</> },
    { id: 'as', at: [X.ridge + 42, -15.5, 0], ax: 0.5, className: 'scene-tag -translate-y-1/2', children: '软流层' },
  ]
  const g = SPOT.globe
  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title="板块运动" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球"
      stage={under
        ? <LabStage<Want> labels={secLabels} target={UNDER.target} span={UNDER.span} view={UNDER.view} {...DAYLIGHT} world={{}}>
            {/* 板块往两边分开：洋中脊和裂谷处 */}
            {[-1, 1].map(d => <ForceArrow key={'m' + d} tip={[X.ridge + d * 30, 2.2, 0.5]} dir={[d, 0, 0]} len={20} color="#ffe9a8" thick={2.4} />)}
            {[-1, 1].map(d => <ForceArrow key={'r' + d} tip={[X.rift + d * 26, 6.5, 0.5]} dir={[d, 0, 0]} len={14} color="#ffe9a8" thick={2.4} />)}
          </LabStage>
        : <LabStage<Want> labels={globeLabels} target={g.target} span={g.span} view={g.view} {...SPACE} world={{ globe: { face, lines: ln, fill: ln, hi: pick ? [pick] : [] } }}>{null}</LabStage>}
      lesson={<LessonBlock no="3" title="六大板块" concept="地球的岩石圈分成六大板块" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>地球表面的岩石圈不是完整的一块，而是被海岭、海沟、山脉这样的地带分割成六大板块：<b className="text-white">亚欧板块、非洲板块、美洲板块、太平洋板块、印度洋板块、南极洲板块</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">板块漂浮在软流层上，</b>处在不断运动之中</li>
            <li><b className="text-[#7fe3d4]">板块内部</b>比较稳定，<b className="text-[#7fe3d4]">板块交界处</b>地壳比较活跃</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">图上的边界线：黄色是张裂的地方（海岭、裂谷），红色是碰撞挤压的地方（海沟、山脉）。线是简化过的，示意。六大板块是一种粗的分法，大板块里还能分出一些小板块。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">六大板块都认出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">岩石圈分成六大板块，漂浮在软流层上</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">中国在亚欧板块上。板块不等于大陆：太平洋板块几乎全是海洋。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">全球的板块</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{ln > 0.5 ? PLATE_COUNT : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">大块</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="选中" value={pick ? SHORT[pick] : '—'} unit={pick ? plateName(pick) : '点下面的按钮选一块'} />
            <ParamTile symbol="岩石圈" value={`约 ${LITHO_KM}`} unit="km 厚 · 下面是软流层" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">图例</h2>
          <div className="mt-2 flex flex-col gap-1.5 text-[13.5px] text-white/75">
            <div className="flex items-center gap-2"><span className="h-1 w-6 rounded bg-[#ffd166]" />张裂的地方（海岭、裂谷）</div>
            <div className="flex items-center gap-2"><span className="h-1 w-6 rounded bg-[#ff5a47]" />碰撞挤压的地方（海沟、山脉）</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">{PLATE_KEYS.map(k => <span key={k} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: PLATES[k].color }} />{SHORT[k]}</span>)}</div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'lines'} pulse={next === 'lines'} onClick={() => setLines(true)} disabled={lines}>画出边界</LabButton>
        <LabButton primary={next === 'spin'} pulse={next === 'spin'} onClick={spin} disabled={!lines || turning || under}>转一圈</LabButton>
        <LabButton primary={next === 'under'} pulse={next === 'under'} onClick={() => setUnder(true)} disabled={!T.done.pacific || under}>剖开看</LabButton>
      </>}
      extras={
        <Control label="选一块板块">
          <Segmented label="板块" pulse={next === 'pick'} want={want} value={(pick ?? '') as PlateKey} onChange={k => choose(k as PlateKey)} disabled={!lines || turning} options={PLATE_KEYS.map(k => ({ value: k, label: SHORT[k] }))} />
        </Control>
      }
    />
  )
}
