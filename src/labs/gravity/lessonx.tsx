// 万有引力与航天 · 拓展课：两个课本之外的小实验，共用一页。
// 空间站一天绕地球几圈（约 400 km 高）；月球上的第一宇宙速度（探测器贴着月面绕月飞行）。
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Satellite, Station } from './craft'
import { OrbitLine } from './earth'
import { Circle } from './orbiter'
import { LESSONS, goLesson } from './lessons'
import { BODIES, R_E, STATION_H, bodyG, bodyV1, km, laps, lowOrbitT, stationT, type BodyKey } from './physics'
import { SPACE } from './views'
import { MOON_R, RE, ST, moonAt, phaseFacing, spinFacing, toScene, type Want } from './world'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Sub = 'station' | 'moon'
const SUBS: Record<Sub, { name: string; title: string; concept: string }> = {
  station: { name: '空间站一天绕几圈', title: '空间站一天绕几圈', concept: '400 km 高，一圈约 92 分钟，一天约 15.6 圈' },
  moon: { name: '月球上的第一宇宙速度', title: '月球上的第一宇宙速度', concept: '星球越小越轻，绕它飞需要的速度越小' },
}
const ORDER: Sub[] = ['station', 'moon']
const TASKS: Task[] = [
  { id: 'station', text: '空间站：跟着它绕地球飞一圈', note: '一圈约 92 分钟，一天绕约 15.6 圈：航天员一天能看到十几次日出' },
  { id: 'moon', text: '月球：让探测器贴着月面绕一圈', note: '月球上只要 1.68 km/s，是地球上的约五分之一' },
]
/** 画面时间：空间站 1 秒 = 600 秒；绕月 1 秒 = 1200 秒 */
const SIM_ST = 600, SIM_MOON = 1200
const E = ST.earth, M = moonAt()
const ST_T = E.clone().add(new THREE.Vector3(0, 2, 0)), ST_S: [number, number] = [RE * 2.9, RE * 2.0], ST_V: [number, number] = [0.3, 0.55]
const MO_T = M.clone(), MO_S: [number, number] = [MOON_R * 4.6, MOON_R * 3.2], MO_V: [number, number] = [0.25, 0.3]
const moonPeriod = () => lowOrbitT('moon')

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('station')
  const [flying, setFlying] = useState<Sub | null>(null)
  const T = useTasks('gewu:gravity:x', TASKS)
  const period = sub === 'station' ? stationT() : moonPeriod(), sim = sub === 'station' ? SIM_ST : SIM_MOON
  useEffect(() => {
    if (!flying) return
    const ms = period / sim * 1000
    const t = setTimeout(() => { setFlying(null); T.check(id => id === flying) }, ms)
    return () => clearTimeout(t)
  }, [flying])   // eslint-disable-line react-hooks/exhaustive-deps
  const go = () => { if (!flying) setFlying(sub) }
  const resetAll = () => { setSub('station'); setFlying(null); T.reset() }
  const nextSub = ORDER.find(k => !T.done[k])
  const { hint, next }: { hint: string; next: 'sub' | 'go' | null } = (() => {
    if (flying) return { hint: '绕着飞…', next: null }
    if (T.done[sub]) return nextSub ? { hint: `这个做完了。接着做：${SUBS[nextSub].name}`, next: 'sub' } : { hint: '两个拓展实验都做完了。', next: null }
    return sub === 'station' ? { hint: '跟着空间站绕地球飞一圈', next: 'go' } : { hint: '让探测器贴着月面绕月飞一圈', next: 'go' }
  })()
  const labels: Label[] = sub === 'station' ? [
    { id: 'h', at: [E.x, E.y + RE + 1.6, E.z], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>空间站离地</small>约 {km(STATION_H)} km</> },
    { id: 'nS', at: [E.x, E.y - RE - 1.4, E.z], ax: 0.5, name: true, className: 'scene-name', children: '空间站画大了（示意）' },
  ] : [
    { id: 'v', at: [M.x, M.y + MOON_R + 1.2, M.z], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>贴着月面绕飞</small>{km(bodyV1('moon')).toFixed(2)} km/s</> },
    { id: 'nM', at: [M.x, M.y - MOON_R - 0.8, M.z], ax: 0.5, name: true, className: 'scene-name', children: '月球（探测器画大了）' },
  ]
  const want: Want = { space: true, earthLight: true, spin: spinFacing(110, ST_V[0]) }
  const stage = (
    <LabStage<Want> labels={labels} target={sub === 'station' ? ST_T : MO_T} span={sub === 'station' ? ST_S : MO_S} view={sub === 'station' ? ST_V : MO_V} {...SPACE} world={want}>
      {sub === 'station' && <group position={E}>
        <OrbitLine a={toScene(R_E + STATION_H)} color="#7fe3d4" opacity={0.7} width={1.2} />
        <Circle r={toScene(R_E + STATION_H)} T={stationT() * 2000 / SIM_ST} phase={phaseFacing(ST_V[0]) - 0.5} run={flying === 'station'}><group scale={0.12} rotation-y={Math.PI / 2}><Station /></group></Circle>
      </group>}
      {sub === 'moon' && <group position={M}>
        <OrbitLine a={MOON_R * 1.06} color="#ffd27a" opacity={0.8} width={0.6} />
        <Circle r={MOON_R * 1.06} T={moonPeriod() * 2000 / SIM_MOON} phase={phaseFacing(MO_V[0]) - 0.6} run={flying === 'moon'}><group scale={0.11}><Satellite /></group></Circle>
      </group>}
    </LabStage>
  )
  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="万有引力与航天" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={stage}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].title} concept={SUBS[sub].concept} tasks={TASKS} done={T.done} current={sub}
        theory={sub === 'station' ? <>
          <p>空间站离地约 400 km，轨道半径 r = R + h ≈ 6771 km。由 T = 2π√(r³/GM) 算得一圈约 92 分钟，一天 24 小时绕约 15.6 圈。</p>
          <p className="mt-2">每绕一圈就经过一次地球的白天和黑夜，所以航天员一天能看到十几次日出日落。</p>
          <p className="mt-3 text-[13.5px] text-white/65">空间站的实际高度在 400 km 上下变化，这里取 400 km。</p>
        </> : <>
          <p>任何星球的第一宇宙速度都是 v = √(GM/R)。月球的质量只有地球的约 1/81，半径约为地球的 3/11，算得 1.68 km/s。</p>
          <p className="mt-2">所以从月面起飞返回比从地面发射容易得多。火星上是 3.55 km/s。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="px-6 py-5">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个拓展实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">同一个公式 v = √(GM/r)，算空间站，也算月球</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/70">空间站一天绕地球约 15.6 圈；月球上的第一宇宙速度只有 1.68 km/s。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {sub === 'station' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">空间站一天绕地球</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{laps(stationT()).toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">圈</span></div>
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ParamTile symbol="h" value={String(km(STATION_H))} unit="km · 离地高度" />
              <ParamTile symbol="T" value={(stationT() / 60).toFixed(1)} unit="分钟 · 一圈" />
            </div>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">月球上的第一宇宙速度</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{km(bodyV1('moon')).toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">km/s</span></div>
            </div>
            <table className="mt-5 w-full text-[13.5px] tabular-nums">
              <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">星球</th><th className="font-normal">表面 g</th><th className="text-right font-normal">第一宇宙速度</th></tr></thead>
              <tbody>{(Object.keys(BODIES) as BodyKey[]).map(b => <tr key={b} className="border-t border-white/12"><td className="py-1.5 text-white/80">{BODIES[b].name}</td><td>{bodyG(b).toFixed(2)} m/s²</td><td className="text-right font-semibold text-[#7fe3d4]">{km(bodyV1(b)).toFixed(2)} km/s</td></tr>)}</tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={!!flying || T.done[sub]}>{sub === 'station' ? '跟着飞一圈' : '绕月飞一圈'}</LabButton>
      </>}
      extras={
        <Control label="拓展实验">
          <Segmented label="拓展实验" pulse={next === 'sub'} want={nextSub ?? null} value={sub} disabled={!!flying} onChange={k => setSub(k as Sub)} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} />
        </Control>
      }
    />
  )
}
