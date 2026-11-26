// 地震 · 第 3 课 纵波和横波：河谷小镇剖开的地下，纵波（蓝）先升上来，房子上下颠；横波（橙）后到，房子左右晃；
// 横波到水库底就没了，船只上下颠；离震中越远，横波比纵波晚到得越多。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './world'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { TOWN_DIST, VP, VS, WENCHUAN, lagSP, tP, tS, type TownDist } from './physics'
import { BOT, HOUSE_SCALE, LAKE, RISE_P, RISE_S, SPOTS, TOWN, bandY } from './town'
import { buildingHeight } from './building'
import { SeisChart, COLORS } from './charts'
import { useClock, useLater } from './clock'

const H = WENCHUAN.h
const TASKS: Task[] = [
  { id: 'feel', text: '发生地震，看房子先颠还是先晃', note: '纵波先到，房子上下颠；横波后到，左右晃' },
  { id: 'boat', text: '再来一次，看水库里的船', note: '横波过不了水，船只上下颠，不左右晃' },
  { id: 'far', text: '换到离震中 100 km，读横波晚到几秒', note: `离得越远，横波比纵波晚得越多：约 ${lagSP(100, H).toFixed(1)} s` },
]
const W = (p: [number, number, number], dy = 0): [number, number, number] => [TOWN.x + p[0], TOWN.y + p[1] + dy, TOWN.z + p[2]]

export default function Lesson3() {
  const [dist, setDist] = useState<TownDist>('mid')
  const [view, setView] = useState<'house' | 'lake'>('house')
  const [run, setRun] = useState(false)
  const T = useTasks('gewu:quake:3', TASKS)
  const d = TOWN_DIST[dist], p = tP(d, H), s = tS(d, H), end = s + 6
  // 波快到之前快放，波经过小镇时按正常速度
  const t = useClock(run, x => (x < p - RISE_P - 0.6 ? 5 : 1), end)
  const over = run && t >= end
  useLater(over, 200, () => T.check(id => (id === 'feel' && view === 'house') || (id === 'boat' && view === 'lake') || (id === 'far' && dist === 'far')), [over])
  const fire = () => { setRun(false); requestAnimationFrame(() => setRun(true)) }
  const resetAll = () => { setDist('mid'); setView('house'); setRun(false); T.reset() }

  const task = T.current, going = run && !over
  const { hint, next }: { hint: string; next: 'fire' | 'view' | 'dist' | null } = (() => {
    if (!task) return { hint: '都做完了。纵波快，先颠；横波慢，后晃。', next: null }
    if (going) return t < p ? { hint: '地震波正从震源传过来…', next: null } : t < s ? { hint: '纵波到了：地面上下颠。横波还在路上…', next: null } : { hint: '横波到了：地面左右晃', next: null }
    if (over && ((task.id === 'feel' && view === 'house') || (task.id === 'boat' && view === 'lake') || (task.id === 'far' && dist === 'far'))) return { hint: '横波到了：地面左右晃', next: null }
    if (task.id === 'feel') return view !== 'house' ? { hint: '把镜头转回房子', next: 'view' } : { hint: '发生地震，看房子先颠还是先晃', next: 'fire' }
    if (task.id === 'boat') return view !== 'lake' ? { hint: '去水库看看船', next: 'view' } : { hint: '再发生一次地震，盯住水库里的船', next: 'fire' }
    if (dist !== 'far') return { hint: '把小镇离震中的距离换成 100 km', next: 'dist' }
    return { hint: '离震中 100 km，再发生一次地震', next: 'fire' }
  })()

  const yP = run ? bandY(t, p, RISE_P) : -999, yS = run ? bandY(t, s, RISE_S) : -999
  const band = (id: string, y: number, name: string, col: string): Label => ({ id, at: [TOWN.x + LAKE.x0 - 6, y, TOWN.z + 22], ax: 1, className: 'scene-tag -translate-y-1/2', style: { opacity: y > BOT + 1 && y < -0.5 ? 1 : 0, background: col, color: '#06131a' }, children: name })
  const labels: Label[] = [
    band('bp', yP, '纵波', COLORS.P), band('bs', yS, '横波', COLORS.S),
    { id: 'house', at: W(SPOTS.house, buildingHeight('house') * HOUSE_SCALE + 1.2), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '民房' },
    { id: 'boat', at: W(SPOTS.boat, 2.2), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '小船' },
    { id: 'hut', at: W(SPOTS.hut, 3.2), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '地震台' },
    { id: 'lake', at: [TOWN.x + (LAKE.x0 + LAKE.x1) / 2, TOWN.y + (LAKE.water + LAKE.bed) / 2, TOWN.z + 22.4], ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '库水' },
    { id: 'rock', at: [TOWN.x + 20, TOWN.y - 30, TOWN.z + 22.4], ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '岩石' },
  ]
  return (
    <LabShell title="地震" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="操作"
      stage={<Spot at={view === 'lake' ? 'lake' : 'ground'} labels={labels} want={{ town: { quake: run ? { t, tP: p, tS: s } : null } }} />}
      lesson={<LessonBlock no="3" title="纵波和横波" concept="纵波快，先颠；横波慢，后晃" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>地震时，震源同时发出两种波。<b className="text-white">纵波</b>（P 波）传得快，地壳里约 {VP} km/s，质点上下振动（顺着传播方向），在固体、液体、气体里都能传播。</p>
          <p className="mt-2"><b className="text-white">横波</b>（S 波）传得慢，约 {VS} km/s，质点左右振动（垂直于传播方向），只能在固体里传播。</p>
          <p className="mt-2">所以地震时，人先感到上下颠，过一会儿才左右晃；船上的人只感到上下颠。横波破坏力更大。</p>
          <p className="mt-3 text-[13.5px] text-white/65">剖面上的波前和小点的晃动都放大、放慢了，是示意；读数按震源深度 {H} km、上面的波速算。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次地震都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">纵波快，先颠；横波慢，后晃</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">纵波能过水，横波只过固体，船上只觉得颠。离震中 60 km 时横波晚到约 {lagSP(60, H).toFixed(1)} s，100 km 时约 {lagSP(100, H).toFixed(1)} s。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-white/60">地震后</span>
            <span className="text-[13px] text-white/50">{going && t < p - RISE_P - 0.6 ? '快放' : ' '}</span>
          </div>
          <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{run ? t.toFixed(1) : '0.0'}<span className="ml-1 text-[15px] font-medium text-white/55">s</span></div>
          <h2 className="mt-4 text-[12.5px] text-white/55">小镇地震台的记录</h2>
          <div className="mt-1"><SeisChart d={d} h={H} t={run ? t : 0} /></div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol="纵波" value={run && t >= p ? p.toFixed(1) : '—'} unit="s 到" />
            <ParamTile symbol="横波" value={run && t >= s ? s.toFixed(1) : '—'} unit="s 到" />
            <ParamTile symbol="晚到" value={run && t >= s ? lagSP(d, H).toFixed(1) : '—'} unit="s" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'fire'} onClick={fire} disabled={going}>发生地震</LabButton>
        <LabButton pulse={next === 'view'} onClick={() => { setRun(false); setView(v => (v === 'lake' ? 'house' : 'lake')) }} disabled={going}>{view === 'lake' ? '看房子' : '看水库'}</LabButton>
      </>}
      extras={<Control label="小镇离震中"><Segmented label="小镇离震中" pulse={next === 'dist'} want={next === 'dist' ? 'far' : null} value={dist} disabled={going} onChange={v => { setDist(v as TownDist); setRun(false) }} options={[{ value: 'near', label: '30 km' }, { value: 'mid', label: '60 km' }, { value: 'far', label: '100 km' }]} /></Control>}
    />
  )
}
