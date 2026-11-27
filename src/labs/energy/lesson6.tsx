// 功和机械能 · 第 6 课 动能和势能的转化：过山车。链条把列车拉上 20 m 高的坡顶，松开以后列车冲到谷底、再冲上 12 m 的第二个坡，
// 一路上重力势能和动能来回转化（不计摩擦和空气阻力，两样加起来不变）。到谷底和第二个坡顶各定格一次。
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { CAR_GAP, Train, getTrack } from './coaster'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { COASTER, COASTER_STATION, coasterAt, fmt, liftAt, liftWork } from './physics'
import { Bars, COL, Finale } from './views'
import { VOICE } from './voice'
import { Place } from './world'

type Phase = 'station' | 'lifting' | 'top' | 'drop' | 'valley' | 'climb' | 'hill' | 'home' | 'brake' | 'done'
const kJ = (j: number) => j / 1000
const TASKS: Task[] = [
  { id: 'top', text: '用链条把列车拉上 20 m 高的坡顶', note: `链条对列车做功 ${fmt(kJ(liftWork()), 1)} kJ，列车的重力势能增加到 ${fmt(kJ(coasterAt(COASTER.top).Ep), 0)} kJ` },
  { id: 'valley', text: '松开列车，看它冲到谷底', note: `高度降到 0：${fmt(kJ(coasterAt(0).Ek), 0)} kJ 的重力势能全部转化成动能，这里最快` },
  { id: 'hill', text: '接着走，看它冲上第二个坡顶', note: `高度升到 ${COASTER.hill} m：动能转化回 ${fmt(kJ(coasterAt(COASTER.hill).Ep), 1)} kJ 的重力势能，慢下来了` },
  { id: 'home', text: '再接着走，让列车回站', note: '一路上动能和势能来回转化，两样加起来始终是 98 kJ' },
]
const LIFT_V = 6.5
/** 让列车沿轨道走：每帧按这一段的规则往前挪，到了节点报告一次；每帧把中间那节车的位置写进 tag，约每 0.08 s 报一次高度 */
function Runner({ phase, drive, tag, onArrive, onHeight }: { phase: Phase; drive: { s: number }; tag: [number, number, number]; onArrive: (p: Phase) => void; onHeight: (h: number) => void }) {
  const tr = getTrack(), acc = useRef(0), p = useMemo(() => new THREE.Vector3(), [])
  const mid = () => drive.s - CAR_GAP
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), h = tr.height(mid())
    if (phase === 'station') drive.s = tr.sStation
    else if (phase === 'lifting') { drive.s = Math.min(tr.sTop + CAR_GAP, drive.s + LIFT_V * dt); if (drive.s >= tr.sTop + CAR_GAP) onArrive('top') }
    else if (phase === 'drop' || phase === 'climb' || phase === 'home') {
      drive.s += Math.max(1.6, coasterAt(h).v) * dt
      if (phase === 'drop' && mid() >= tr.sValley) { drive.s = tr.sValley + CAR_GAP; onArrive('valley') }
      if (phase === 'climb' && mid() >= tr.sHill) { drive.s = tr.sHill + CAR_GAP; onArrive('hill') }
      if (phase === 'home' && drive.s >= tr.sBrake) onArrive('brake')
    } else if (phase === 'brake') {
      // 刹车进站：越靠近站台越慢，停在出发的位置
      const left = tr.len + tr.sStation - drive.s
      drive.s += Math.max(0.8, Math.min(14, left * 0.55)) * dt
      if (left <= 0.05) { drive.s = tr.sStation; onArrive('done') }
    }
    tr.at(mid(), p); tag[0] = p.x; tag[1] = p.y + 2.6; tag[2] = p.z
    acc.current += dt; if (acc.current > 0.08) { acc.current = 0; onHeight(tr.height(mid())) }
  })
  return null
}

export default function Lesson6() {
  const [phase, setPhase] = useState<Phase>('station')
  const [h, setH] = useState(COASTER_STATION)
  const T = useTasks('gewu:energy:6', TASKS)
  const drive = useMemo(() => ({ s: getTrack().sStation }), []), tag = useMemo<[number, number, number]>(() => [8, 6, -14], [])
  const arrive = (p: Phase) => { setPhase(p); if (p === 'top' || p === 'valley' || p === 'hill') T.check(id => id === p); if (p === 'brake') T.check(id => id === 'home') }
  const resetAll = () => { drive.s = getTrack().sStation; setPhase('station'); setH(COASTER_STATION); T.reset() }
  const task = T.current
  // 读数：定格的时候用整数的高度；刹车以后不再读
  const hh = phase === 'top' ? COASTER.top : phase === 'valley' ? COASTER.valley : phase === 'hill' ? COASTER.hill : phase === 'station' || phase === 'done' ? COASTER_STATION : Math.round(h * 10) / 10
  const pulled = phase === 'station' || phase === 'lifting' || phase === 'done', braking = phase === 'brake'
  const e = pulled ? liftAt(hh) : coasterAt(hh)
  const go = () => { if (phase === 'top') setPhase('drop'); else if (phase === 'valley') setPhase('climb'); else if (phase === 'hill') setPhase('home') }
  const { hint, next }: { hint: string; next: 'lift' | 'go' | null } = !task ? { hint: '下坡，重力势能转化成动能；上坡，动能转化成重力势能。', next: null }
    : phase === 'station' ? { hint: '按“拉上坡顶”：链条挂住列车，把它拉上去', next: 'lift' }
    : phase === 'lifting' ? { hint: '链条拉着列车慢慢往上爬：越高，重力势能越大…', next: null }
    : phase === 'top' ? { hint: '按“松开列车”', next: 'go' }
    : phase === 'drop' ? { hint: '下坡：高度越来越低，速度越来越快…', next: null }
    : phase === 'valley' ? { hint: '到谷底了（画面定格）。按“接着走”', next: 'go' }
    : phase === 'climb' ? { hint: '上坡：高度越来越高，速度越来越慢…', next: null }
    : phase === 'hill' ? { hint: '到第二个坡顶了（画面定格）。按“接着走”', next: 'go' }
    : phase === 'home' ? { hint: '转过弯道往回走：高一点就慢一点，低一点就快一点…', next: null }
    : { hint: '刹车进站…', next: null }
  // 机位跟着列车换：站台和提升段的下半 → 坡顶 → 谷底 → 第二个坡顶 → 回程看全景 → 回站
  const view = phase === 'station' || phase === 'done' || (phase === 'lifting' && h < 9) ? 'lift' : phase === 'lifting' || phase === 'top' ? 'top' : phase === 'drop' || phase === 'valley' ? 'valley' : phase === 'climb' || phase === 'hill' ? 'hill' : 'drop'
  const tr = getTrack(), mark = (s: number, dy: number): [number, number, number] => { const p = new THREE.Vector3(); tr.at(s, p); return [p.x, p.y + dy, p.z] }
  const marks = useMemo(() => ({ top: mark(tr.sTop, 4.6), valley: mark(tr.sValley, -1.2), hill: mark(tr.sHill, 4.6) }), [])   // eslint-disable-line react-hooks/exhaustive-deps
  const labels: Label[] = [
    { id: 'car', at: tag, ax: 0.5, className: 'scene-tag key -translate-y-full', style: { opacity: braking ? 0 : 1 }, children: <><small>高 {fmt(hh, 1)} m</small>{fmt(e.v, 1)} m/s</> },
    { id: 'top', at: marks.top, ax: 0.5, className: 'scene-name -translate-y-full', children: `第一个坡顶 · 高 ${COASTER.top} m` },
    { id: 'valley', at: marks.valley, ax: 0.5, className: 'scene-name', children: '谷底 · 高 0 m' },
    { id: 'hill', at: marks.hill, ax: 0.5, className: 'scene-name -translate-y-full', children: `第二个坡顶 · 高 ${COASTER.hill} m` },
  ]
  return (
    <LabShell title="功和机械能" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="过山车"
      stage={<Place at={view} cur={['train']} labels={labels}>
        <Train drive={drive} />
        <Runner phase={phase} drive={drive} tag={tag} onArrive={arrive} onHeight={x => { if (phase !== 'brake' && phase !== 'done') setH(x) }} />
      </Place>}
      lesson={<LessonBlock no="6" title="动能和势能的转化" concept="下坡势能变动能，上坡动能变势能" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>动能和势能可以<b className="text-white">相互转化</b>。列车从高处往下冲，高度降低、速度变大，重力势能转化为动能；冲上坡，高度升高、速度变小，动能转化为重力势能。</p>
          <p className="mt-3">动能、重力势能和弹性势能统称为<b className="text-white">机械能</b>。如果只有动能和势能相互转化，机械能的总和不变，或者说机械能是守恒的。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这一课不计摩擦和空气阻力，高度从谷底算起。链条把列车拉上坡时速度很小，这一段的动能按 0 算。真实的过山车有摩擦，后面的坡都要比前面的矮。</p>
        </>} />}
      finale={T.finale && <Finale kicker="列车跑完一圈了" title="下坡，重力势能转化为动能；上坡，动能转化为重力势能" more={`坡顶 ${fmt(kJ(coasterAt(COASTER.top).Ep), 0)} kJ 全是势能；谷底 ${fmt(kJ(coasterAt(0).Ek), 0)} kJ 全是动能；第二个坡顶势能 ${fmt(kJ(coasterAt(COASTER.hill).Ep), 1)} kJ、动能 ${fmt(kJ(coasterAt(COASTER.hill).Ek), 1)} kJ。两样加起来一直不变。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">{phase === 'done' ? '列车回到站台，停稳了' : pulled ? '链条对列车做功，机械能增加' : braking ? '刹车进站：读数停在刹车前' : '松开以后：机械能 = 动能 + 重力势能'}</div>
          <div className="mt-4"><Bars max={kJ(coasterAt(COASTER.top).E)} items={[{ name: '重力势能', value: kJ(e.Ep), color: COL.ep }, { name: '动能', value: kJ(e.Ek), color: COL.ek }, { name: '机械能', value: kJ(e.E), color: COL.e }]} /></div>
          <h2 className="mt-5 text-[12.5px] text-white/55">列车这一刻</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="h" value={fmt(hh, 1)} unit="m · 离谷底的高度" />
            <ParamTile symbol="v" value={fmt(e.v, 1)} unit="m/s · 速度" />
          </div>
          <p className="mt-3 text-[12.5px] text-white/50">列车 {COASTER.mass} kg，不计摩擦和空气阻力</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'lift'} pulse={next === 'lift'} onClick={() => { if (phase === 'station') setPhase('lifting') }} disabled={phase !== 'station'}>拉上坡顶</LabButton>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={go} disabled={!(phase === 'top' || phase === 'valley' || phase === 'hill')}>{phase === 'valley' || phase === 'hill' ? '接着走' : '松开列车'}</LabButton>
      </>}
      extras={null}
    />
  )
}
