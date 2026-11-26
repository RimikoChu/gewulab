// 地震 · 第 1 课 地震发生：把映秀以南的一条地块挪开，露出穿过震中的剖面；让龙门山断层错动，找到震源；标出震中；量成都的震中距。
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './world'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { CITIES, VP, VS, WENCHUAN, depthType, epiDist, frontDist, groundRadius } from './physics'
import { FOCUS, FAULT } from './region'
import { Y, height } from './terrain'
import { Dashed, GroundLine, Pin } from './marks'
import { useClock, useLater } from './clock'

const D_CD = Math.round(epiDist('chengdu'))
const TASKS: Task[] = [
  { id: 'open', text: '剖开地面，看看地下', note: '地下的岩层里有一条断层：龙门山断层' },
  { id: 'focus', text: '让断层错动', note: `岩层断开、错动的地方是震源，这次深 ${WENCHUAN.h} km` },
  { id: 'epi', text: '在地面上标出震中', note: '震源正上方的地面是震中：映秀' },
  { id: 'dist', text: '量出成都到震中的距离', note: `成都的震中距约 ${D_CD} km` },
]
const YX = CITIES.yingxiu.at, CD = CITIES.chengdu.at
const SURF = Y(height(0, 0))

export default function Lesson1() {
  const [open, setOpen] = useState(false)
  const [slip, setSlip] = useState(false)
  const [epi, setEpi] = useState(false)
  const [dist, setDist] = useState(false)
  const T = useTasks('gewu:quake:1', TASKS)
  const t = useClock(slip, 1.6, 14)
  const kOpen = useSlide(open ? 1 : 0, 0.62), kEpi = useSlide(epi ? 1 : 0, 0.7), kDist = useSlide(dist ? 1 : 0, 0.45)
  useLater(open && kOpen > 0.999, 200, () => T.check(id => id === 'open'), [kOpen > 0.999])
  useLater(slip && t > 4, 0, () => T.check(id => id === 'focus'), [t > 4])
  useLater(epi && kEpi > 0.999, 400, () => T.check(id => id === 'epi'), [kEpi > 0.999])
  useLater(dist && kDist > 0.999, 500, () => T.check(id => id === 'dist'), [kDist > 0.999])
  const resetAll = () => { setOpen(false); setSlip(false); setEpi(false); setDist(false); T.reset() }

  const task = T.current
  const opening = open && kOpen < 0.999, shaking = slip && t < 4
  const { hint, next }: { hint: string; next: 'open' | 'slip' | 'epi' | 'dist' | null } = (() => {
    if (!task) return { hint: '都做完了。震源在地下，震中在它正上方的地面。', next: null }
    if (opening || (task.id === 'open' && open)) return { hint: '地块正在挪开…', next: null }
    if (shaking || (task.id === 'focus' && slip)) return { hint: '岩层错动，地震波从震源向四面八方传开…', next: null }
    if (task.id === 'epi' && epi) return { hint: '在地面上标出震中', next: null }
    if (task.id === 'dist' && dist) return { hint: '从映秀量到成都…', next: null }
    if (task.id === 'open') return { hint: '先把映秀南边的这一条地块挪开，看看地下', next: 'open' }
    if (task.id === 'focus') return { hint: '这条斜着的缝是断层。让断层错动', next: 'slip' }
    if (task.id === 'epi') return { hint: '在地面上标出震中', next: 'epi' }
    if (kDist > 0 && kDist < 1) return { hint: '从映秀量到成都…', next: null }
    return { hint: '量一量成都离震中有多远', next: 'dist' }
  })()

  const wide = dist || task?.id === 'dist'
  const pf = slip ? frontDist(VP, t) : 0, sf = slip ? frontDist(VS, t) : 0
  const labels: Label[] = [
    { id: 'fault', at: [FAULT[6][0] + 1.2, FAULT[6][1], 0.5], className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: kOpen > 0.9 && !wide ? 1 : 0 }, children: '断层' },
    { id: 'focus', at: [FOCUS[0] - 2, FOCUS[1], 0.5], ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: T.done.focus || t > 1 ? 1 : 0 }, children: <><small>震源</small>深 {WENCHUAN.h} km</> },
    { id: 'epi', at: [YX[0], SURF + 3.6, YX[1]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: kEpi > 0.99 ? 1 : 0 }, children: <><small>震中</small>映秀</> },
    { id: 'yx', at: [YX[0], SURF + 1, YX[1]], ax: 0.5, name: true, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: epi ? 0 : undefined }, children: '映秀' },
    { id: 'cd', at: [CD[0], Y(CITIES.chengdu.elev) + 4, CD[1]], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: wide ? 1 : 0 }, children: '成都' },
    { id: 'dd', at: [(YX[0] + CD[0]) / 2, Y(0.8) + 2, (YX[1] + CD[1]) / 2], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: kDist > 0.99 ? 1 : 0 }, children: <><small>震中距</small>约 {D_CD} km</> },
    ...[0, 10, 20].map(d => ({ id: 'd' + d, at: [-24.5, SURF - d, 0.3] as [number, number, number], ax: 1, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: kOpen > 0.9 && !wide ? 1 : 0 }, children: d ? `地下 ${d} km` : '地面' })),
  ]
  return (
    <LabShell title="地震" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="操作"
      stage={<Spot at={wide ? 'cutWide' : open && kOpen > 0.6 ? 'cutOpen' : 'cut'} labels={labels} want={{ region: { open, slip: slip ? 1 : 0, focus: slip ? 1 : 0, waves: slip && t < 13.5 ? { p: groundRadius(VP, t, WENCHUAN.h), s: groundRadius(VS, t, WENCHUAN.h), pf, sf, epi: WENCHUAN.epi } : null } }}>
        {/* 深度刻度：剖面左边一根尺子 */}
        {kOpen > 0.9 && !wide && [0, 10, 20].map(d => <mesh key={d} position={[-23, SURF - d, 0.25]}><boxGeometry args={[2.2, 0.16, 0.1]} /><meshBasicMaterial color="#f3efe6" toneMapped={false} /></mesh>)}
        {kOpen > 0.9 && !wide && <mesh position={[-21.9, SURF - 10, 0.22]}><boxGeometry args={[0.12, 20, 0.08]} /><meshBasicMaterial color="#f3efe6" toneMapped={false} /></mesh>}
        {epi && <Dashed from={[FOCUS[0], FOCUS[1], 0.4]} to={[YX[0], SURF + 0.2, 0.4]} k={kEpi} />}
        {kEpi > 0.99 && <Pin at={YX} />}
        {dist && <GroundLine a={YX} b={CD} k={kDist} />}
        {kDist > 0.99 && <Pin at={CD} color="#7fe3d4" />}
      </Spot>}
      lesson={<LessonBlock no="1" title="地震发生" concept="震源在地下，震中在它正上方的地面" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>地下岩层受力，突然断裂、错动，引起地面震动，这就是<b className="text-white">地震</b>。岩层断裂、错动的地方叫<b className="text-white">震源</b>，震源到地面的垂直距离叫<b className="text-white">震源深度</b>。</p>
          <p className="mt-2">震源正上方的地面叫<b className="text-white">震中</b>。地面上某处到震中的距离叫<b className="text-white">震中距</b>。</p>
          <p className="mt-2">按震源深度分：小于 70 km 的是浅源地震，70–300 km 是中源地震，大于 300 km 是深源地震。破坏性大的地震多是浅源地震。</p>
          <p className="mt-3 text-[13.5px] text-white/65">2008 年 5 月 12 日的汶川地震：8.0 级，震中映秀，震源深度 14 km。沙盘上地形的高度放大了 2 倍，地下按实际深度；断层的位置和错动的距离是示意。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四步都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">震源在地下 {WENCHUAN.h} km，震中是它正上方的映秀</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">震源深度小于 70 km，这是一次浅源地震。成都离震中约 {D_CD} km，这叫成都的震中距。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">震源深度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{T.done.focus ? WENCHUAN.h : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">km</span></div>
            <div className="mt-2 text-[14px] text-[#7fe3d4]">{T.done.focus ? depthType(WENCHUAN.h) : ' '}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">汶川地震 · 2008 年 5 月 12 日</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="震级" value={WENCHUAN.M.toFixed(1)} unit="级" />
            <ParamTile symbol="震中" value={T.done.epi ? '映秀' : '—'} unit="四川汶川县" />
            <ParamTile symbol="震中距" value={T.done.dist ? `约 ${D_CD}` : '—'} unit="km · 成都" />
            <ParamTile symbol="震源深度" value={T.done.focus ? `${WENCHUAN.h}` : '—'} unit="km" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'open' || next === 'slip'} onClick={() => (open ? setSlip(true) : setOpen(true))} disabled={opening || (open && slip)}>{open ? '断层错动' : '剖开地面'}</LabButton>
        <LabButton pulse={next === 'epi'} onClick={() => setEpi(true)} disabled={!T.done.focus || epi}>标出震中</LabButton>
        <LabButton pulse={next === 'dist'} onClick={() => setDist(true)} disabled={!T.done.epi || dist}>量震中距</LabButton>
      </>}
      extras={null}
    />
  )
}
