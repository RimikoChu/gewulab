// 生态系统 · 第 7 课 生态平衡和自我调节：东边一条宽谷，一大片草场，兔群和狼群。
// 选“不捕杀 / 少量捕杀 / 大量捕杀”，按“观察 12 年”：谷里兔和狼的只数、草的颜色跟着变，面板里画出三条曲线。
// 数量来自 physics.ts 的简化模型（示意）。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Rabbit, Wolf } from './animals'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { HUNT_NAME, START, YEARS, simulate, summary, type Hunt, type Point } from './physics'
import { rng } from './parts'
import { Finale, H } from './ui'
import { VOICE } from './voice'
import { Room, ST, ground } from './world'

const HUNTS: Hunt[] = ['none', 'some', 'many']
const RUNS: Record<Hunt, Point[]> = { none: simulate('none'), some: simulate('some'), many: simulate('many') }
const MAXR = 700, PER = 20, MAX_SHOWN = Math.ceil(MAXR / PER)
const at = (pts: Point[], year: number) => pts[Math.max(0, Math.min(pts.length - 1, Math.round(year * 4)))]
const S = summary(RUNS.many), SOME = summary(RUNS.some)

const TASKS: Task[] = [
  { id: 'none', text: '不捕杀狼，观察 12 年', note: '草、兔、狼的数量基本保持稳定：生态平衡' },
  { id: 'some', text: '少量捕杀狼，再观察 12 年', note: `兔先增多到约 ${Math.round(SOME.maxRabbit)} 只，几年后又回落：生态系统能自我调节` },
  { id: 'many', text: '大量捕杀狼，再观察 12 年', note: `兔先猛增到约 ${Math.round(S.maxRabbit)} 只，把草吃光后又锐减：调节能力是有限的` },
]

/** 谷里的兔群和狼群：只数跟着模型变（每 20 只兔画 1 只，狼画实际只数），各自慢慢走动 */
function Herd({ rabbits, wolves }: { rabbits: number; wolves: number }) {
  const spots = useMemo(() => { const r = rng(71); return Array.from({ length: MAX_SHOWN }, () => { const a = r() * 6.28, d = 0.6 + Math.sqrt(r()) * 4.6; return { x: ST.valley.x - 1.2 + Math.cos(a) * d, z: ST.valley.z + 0.6 + Math.sin(a) * d * 0.6, yaw: r() * 6.28 } }) }, [])
  // 狼群：大多站着望向兔群，每三只里有一只沿着狼群外沿慢慢走
  const wolfSpots = useMemo(() => { const r = rng(9); return Array.from({ length: 14 }, (_, i) => ({ x: ST.valley.x + 2.4 + (i % 4) * 1.25 - 1.9 + (r() - 0.5) * 0.5, z: ST.valley.z - 2.2 + Math.floor(i / 4) * 1.0 - 1.0 + (r() - 0.5) * 0.4, yaw: Math.PI * 0.85 + (r() - 0.5) * 0.9, walk: i % 3 === 2, ph: r() * 6.28 })) }, [])
  const wolfRefs = useRef<(THREE.Group | null)[]>([])
  useFrame(({ clock }) => {
    wolfRefs.current.forEach((g, i) => {
      if (!g) return
      const w = wolfSpots[i]
      if (!w.walk) { g.position.set(w.x, ground(w.x, w.z), w.z); g.rotation.y = w.yaw; return }
      const R = 3.6, t = clock.elapsedTime * (0.5 / R) + w.ph, cx = ST.valley.x + 2.4, cz = ST.valley.z - 2.2, x = cx + Math.cos(t) * R, z = cz + Math.sin(t) * R * 0.7
      g.position.set(x, ground(x, z), z); g.rotation.y = Math.atan2(-(Math.cos(t) * R * 0.7), -Math.sin(t) * R)
    })
  })
  return <>
    {spots.slice(0, rabbits).map((p, i) => <Rabbit key={i} lo act={i % 3 === 0 ? 'hop' : 'idle'} seed={i} position={[p.x, ground(p.x, p.z), p.z]} rotation-y={p.yaw} />)}
    {wolfSpots.slice(0, wolves).map((w, i) => <group key={i} ref={e => { wolfRefs.current[i] = e }}><Wolf lo act={w.walk ? 'walk' : 'idle'} seed={i} speed={0.8} /></group>)}
  </>
}

/** 三条小曲线叠在一起，横轴是年份 */
function Charts({ hunt, year, done }: { hunt: Hunt; year: number; done: Record<string, boolean> }) {
  const W = 290, Hh = 62, rows: { key: 'grass' | 'rabbit' | 'wolf'; name: string; unit: string; max: number; color: string }[] = [
    { key: 'grass', name: '草', unit: '%', max: 100, color: '#8fd16a' }, { key: 'rabbit', name: '兔', unit: '只', max: MAXR, color: '#e8c48a' }, { key: 'wolf', name: '狼', unit: '只', max: 16, color: '#a8b4c4' },
  ]
  const path = (pts: Point[], key: 'grass' | 'rabbit' | 'wolf', max: number, upto: number) => pts.filter(p => p.year <= upto + 1e-6).map((p, i) => `${i ? 'L' : 'M'}${(p.year / YEARS) * W},${Hh - (Math.min(max, p[key]) / max) * (Hh - 4) - 2}`).join(' ')
  return (
    <div className="flex flex-col gap-2">
      {rows.map(r => (
        <div key={r.key}>
          <div className="mb-0.5 flex justify-between text-[12px] text-white/55"><span>{r.name}（{r.unit}）</span><span className="tabular-nums">{Math.round(at(RUNS[hunt], year)[r.key])}</span></div>
          <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full rounded-md bg-white/6">
            {HUNTS.filter(h => h !== hunt && done[h]).map(h => <path key={h} d={path(RUNS[h], r.key, r.max, YEARS)} fill="none" stroke="#ffffff" strokeOpacity={0.18} strokeWidth={1.5} />)}
            <path d={path(RUNS[hunt], r.key, r.max, year)} fill="none" stroke={r.color} strokeWidth={2.4} strokeLinejoin="round" />
          </svg>
        </div>
      ))}
      <div className="flex justify-between text-[11.5px] text-white/45 tabular-nums"><span>0 年</span><span>6</span><span>{YEARS} 年</span></div>
    </div>
  )
}

export default function Lesson7() {
  const [hunt, setHunt] = useState<Hunt>('none'), [year, setYear] = useState(0), [running, setRunning] = useState(false)
  const T = useTasks('gewu:eco:7', TASKS)
  // 时间往前走：每 0.7 秒一年
  useEffect(() => {
    if (!running) return
    let raf = 0, last = performance.now()
    const f = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; setYear(y => Math.min(YEARS, y + dt / 0.7)); raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [running])
  useEffect(() => { if (running && year >= YEARS) { setRunning(false); T.check(id => id === hunt) } }, [year >= YEARS, running])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setHunt('none'); setYear(0); setRunning(false); T.reset() }
  const choose = (h: Hunt) => { if (running) return; setHunt(h); setYear(0) }
  const p = year === 0 ? { ...START, year: 0, wolf: START.wolf * (hunt === 'many' ? 0.05 : hunt === 'some' ? 0.6 : 1) } : at(RUNS[hunt], year)
  const task = T.current, want = (task?.id ?? null) as Hunt | null
  const { hint, nx }: { hint: string; nx: 'hunt' | 'run' | null } = (() => {
    if (!task) return { hint: '比较三次的曲线：生态系统能自我调节，但这种能力是有限的。', nx: null }
    if (running) return { hint: `第 ${Math.floor(year)} 年…`, nx: null }
    if (want && hunt !== want) return { hint: `换成“${HUNT_NAME[want]}”`, nx: 'hunt' }
    if (hunt === 'none') return { hint: '草原上有草、兔和狼。先不捕杀狼，按“观察 12 年”', nx: 'run' }
    if (hunt === 'some') return { hint: '少量捕杀：去掉一部分狼。按“观察 12 年”', nx: 'run' }
    return { hint: '大量捕杀：几乎把狼打光，以后还一直捕杀。按“观察 12 年”', nx: 'run' }
  })()
  const labels: Label[] = [
    { id: 'r', at: [ST.valley.x - 3, ground(ST.valley.x - 3, ST.valley.z + 1.2) + 0.7, ST.valley.z + 1.2], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>兔</small>{Math.round(p.rabbit)} 只</> },
    { id: 'w', at: [ST.valley.x + 3.2, ground(ST.valley.x + 3.2, ST.valley.z - 2.4) + 1.3, ST.valley.z - 2.4], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>狼</small>{Math.round(p.wolf)} 只</> },
    { id: 'g', at: [ST.valley.x + 0.5, ground(ST.valley.x + 0.5, ST.valley.z + 3.2) + 0.35, ST.valley.z + 3.2], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>草</small>{Math.round(p.grass)}%</> },
  ]
  return (
    <LabShell title="生态系统" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={HUNT_NAME[hunt]}
      stage={<Room at="s7" labels={labels} world={{ valley: p.grass }} span={[7.6, 3.3]} view={[-0.3, 0.2]} shift={[0.3, -0.3, 0]}><Herd rabbits={Math.max(1, Math.round(p.rabbit / PER))} wolves={Math.round(p.wolf)} /></Room>}
      lesson={<LessonBlock no="7" title="生态平衡" concept="生态系统的调节能力有限" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在一般情况下，生态系统中各种生物的数量和所占的比例总是维持在<b className="text-white">相对稳定</b>的状态，这叫生态平衡。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>生态系统具有一定的<b className="text-white">自我调节能力</b>：狼少了一些，兔多了，草就不够吃，兔又会减少，狼慢慢恢复。</li>
            <li>但这种能力是<b className="text-white">有一定限度</b>的。外界干扰超过了限度，生态系统就会遭到破坏，很难恢复。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="三种做法都看完了" title="生态系统能自我调节，但调节能力是有限的" text={`不捕杀，三者基本稳定；少量捕杀，几年后又恢复平衡；大量捕杀，兔先猛增到约 ${Math.round(S.maxRabbit)} 只，草被吃到只剩约 ${Math.round(S.minGrass)}%，兔又大量饿死，12 年后草也只恢复到约 ${Math.round(S.end.grass)}%。`} notes="曲线来自一个简化的数量模型，年份和只数都是示意；谷里每画 1 只兔代表 20 只。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <ParamTile symbol="草" value={`${Math.round(p.grass)}%`} unit="覆盖" />
            <ParamTile symbol="兔" value={`${Math.round(p.rabbit)}`} unit="只" />
            <ParamTile symbol="狼" value={`${Math.round(p.wolf)}`} unit="只" />
          </div>
          <H>{HUNT_NAME[hunt]} · 第 {Math.floor(year)} 年（示意）</H>
          <Charts hunt={hunt} year={year} done={T.done} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={nx === 'run'} onClick={() => { setYear(0); setRunning(true) }} disabled={running || year > 0}>观察 12 年</LabButton>
      </>}
      extras={<Control label="对狼"><Segmented label="对狼" pulse={nx === 'hunt'} want={nx === 'hunt' ? want : null} value={hunt} onChange={v => choose(v)} options={HUNTS.map(h => ({ value: h, label: HUNT_NAME[h] }))} /></Control>}
    />
  )
}
