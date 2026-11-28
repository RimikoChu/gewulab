// 功和机械能 · 第 5 课 势能：游艺区里两件器材。落锤架：重锤举得越高、质量越大，把木桩砸得越深（重力势能）；
// 弹射器：弹簧压得越紧，把小球弹得越高（弹性势能）。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { HammerRig, Launcher, REST_Y, RIG, STAKE_TOP, Weight } from './bench'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { G, HAMMER, SPRING, fmt, sink, springRise, type DropKey, type MassKey } from './physics'
import { ease, useRun } from './run'
import { Big, Finale, Records } from './views'
import { VOICE } from './voice'
import { P, Place } from './world'

type RigKey = MassKey | 'spring'
const RIGS: Record<RigKey, string> = { light: '20 kg 重锤', heavy: '40 kg 重锤', spring: '弹射器' }
const WANT: Record<string, [RigKey, DropKey]> = { a: ['light', 'low'], b: ['light', 'high'], c: ['heavy', 'high'], d: ['spring', 'low'], e: ['spring', 'high'] }
const cm = (m: MassKey, h: DropKey) => fmt(sink(m, h) * 100)
const TASKS: Task[] = [
  { id: 'a', text: '20 kg 的重锤升到 0.5 m，松手', note: `木桩被砸进沙里 ${cm('light', 'low')} cm` },
  { id: 'b', text: '同一只重锤升到 1 m，松手', note: `砸进 ${cm('light', 'high')} cm：质量相同，位置越高，重力势能越大` },
  { id: 'c', text: '换 40 kg 的重锤，还升到 1 m', note: `砸进 ${cm('heavy', 'high')} cm：高度相同，质量越大，重力势能越大` },
  { id: 'd', text: '弹射器：把弹簧压缩 5 cm，松手', note: `小球被弹到 ${fmt(springRise('low'), 1)} m 高` },
  { id: 'e', text: '把弹簧压缩 10 cm，松手', note: `弹到 ${fmt(springRise('high'), 1)} m 高：弹性形变越大，弹性势能越大` },
]
const SINK = 0.3
const result = (r: RigKey, l: DropKey) => r === 'spring' ? `弹到 ${fmt(springRise(l), 1)} m` : `砸进 ${cm(r, l)} cm`

export default function Lesson5() {
  const [rig, setRig] = useState<RigKey>('light')
  const [level, setLevel] = useState<DropKey | null>(null)
  const [rows, setRows] = useState<[RigKey, DropKey][]>([])
  const T = useTasks('gewu:energy:5', TASKS)
  const spring = rig === 'spring', lv = level ?? 'low'
  // 落锤：下落的时间 √(2h ÷ g)，砸到桩上以后桩再往下走 SINK 秒；弹射器：小球上去再落回来，一共 2√(2H ÷ g)
  const H = spring ? springRise(lv) : HAMMER.heights[lv], fall = Math.sqrt(2 * H / G)
  const run = useRun(spring ? 2 * fall + 0.3 : fall + SINK + 0.4)
  useEffect(() => { run.reset(); setLevel(null) }, [rig])   // eslint-disable-line react-hooks/exhaustive-deps
  const t = run.t, released = t !== null, done = run.done && level !== null
  // 准备：重锤升到位、弹簧压到位
  const raise = useSlide(!spring && level && !released ? HAMMER.heights[level] : 0, released ? 99 : 0.9), press = useSlide(spring && level && !released ? SPRING.press[level] : 0, released ? 99 : 0.12)
  const ready = level !== null && !released && (spring ? press === SPRING.press[level] : raise === HAMMER.heights[level])
  useEffect(() => { if (!done) return; setRows(r => r.some(q => q[0] === rig && q[1] === level) ? r : [...r, [rig, level!]]); T.check(id => WANT[id][0] === rig && WANT[id][1] === level) }, [done])   // eslint-disable-line react-hooks/exhaustive-deps
  const set = (l: DropKey) => { if (run.running) return; run.reset(); setLevel(l) }
  const resetAll = () => { setRig('light'); setLevel(null); setRows([]); run.reset(); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'rig' | DropKey | 'go' | null } = !task ? { hint: '位置越高、质量越大，重力势能越大；弹性形变越大，弹性势能越大。', next: null }
    : run.running ? { hint: spring ? '弹簧把小球弹了上去…' : '重锤落下来，砸在木桩上…', next: null }
    : rig !== WANT[task.id][0] ? { hint: `把器材换成“${RIGS[WANT[task.id][0]]}”`, next: 'rig' }
    : level !== WANT[task.id][1] || done ? { hint: spring ? `按“${WANT[task.id][1] === 'low' ? '压缩 5 cm' : '压缩 10 cm'}”` : `按“${WANT[task.id][1] === 'low' ? '升到 0.5 m' : '升到 1 m'}”`, next: WANT[task.id][1] }
    : ready ? { hint: '按“松手”', next: 'go' } : { hint: spring ? '正在把弹簧往下压…' : '正在把重锤往上拉…', next: null }

  // 落锤这一刻的位置：锤底离桩顶多高、桩被砸下去多少
  const d = !spring && level ? sink(rig as MassKey, level) : 0
  const above = !released ? raise : Math.max(0, H - 0.5 * G * t! * t!), drop = released && t! > fall ? d * ease(Math.min(1, (t! - fall) / SINK)) : 0
  // 小球这一刻的高度（从原来的位置算起）
  const v0 = Math.sqrt(2 * G * H), up = spring && released ? Math.max(0, v0 * t! - 0.5 * G * t! * t!) : 0, peak = spring && released && t! >= fall
  const [hx, , hz] = P.hammer, [lx, , lz] = P.launcher
  const labels: Label[] = spring ? [
    { id: 'x', at: [lx + 0.42, 0.72, lz], className: 'scene-tag -translate-y-1/2', style: { opacity: level ? 1 : 0 }, children: <><small>弹簧压缩</small>{fmt(press * 100)} cm</> },
    { id: 'top', at: [lx + 0.2, REST_Y + H, lz], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: peak ? 1 : 0 }, children: <><small>最高</small>{fmt(H, 1)} m</> },
    { id: 'n1', at: [lx, 3.15, lz], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '透明竖管和米尺' },
    { id: 'n2', at: [lx - 0.35, 0.65, lz], ax: 1, name: true, className: 'scene-name', children: '弹簧' },
  ] : [
    { id: 'h', at: [hx + 0.42, STAKE_TOP - drop + above + 0.12, hz], className: 'scene-tag -translate-y-1/2', style: { opacity: level && !released ? 1 : 0 }, children: <><small>离桩顶</small>{fmt(above, 1)} m</> },
    { id: 'd', at: [hx + 0.35, STAKE_TOP - drop - 0.1, hz + 0.3], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: released && t! > fall ? 1 : 0 }, children: <><small>木桩砸进</small>{fmt(drop * 100, done ? 0 : 1)} cm</> },
    { id: 'n1', at: [hx, RIG.top + 0.15, hz], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '落锤架' },
    { id: 'n2', at: [hx - 0.25, RIG.sand + 0.25, hz + 0.75], ax: 1, name: true, className: 'scene-name', children: '木桩（每格 5 cm）' },
  ]
  const wy = STAKE_TOP - drop + 0.012 + above
  return (
    <LabShell title="功和机械能" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={spring ? '弹射器' : '落锤架'}
      stage={<Place at={spring ? 'launcher' : 'hammer'} cur={spring ? ['launcher'] : ['hammer']} labels={labels}>
        {spring ? <group position={P.launcher}><Launcher press={press} ball={REST_Y - press + up} /></group>
          : <group position={P.hammer}><HammerRig drop={drop}>
            <group position={[0, wy, 0]}><Weight heavy={rig === 'heavy'} /></group>
            {/* 吊绳：松手以前从定滑轮垂到重锤的吊环上 */}
            {!released && <mesh position={[0, (RIG.top - 0.3 + wy + 0.3) / 2, 0]}><cylinderGeometry args={[0.008, 0.008, Math.max(0.01, RIG.top - 0.3 - wy - 0.26), 6]} /><meshStandardMaterial color="#d8cfb8" roughness={0.9} /></mesh>}
          </HammerRig></group>}
      </Place>}
      lesson={<LessonBlock no="5" title="势能" concept="举得越高、压得越紧，势能越大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在地球表面附近，物体由于受到重力并处在一定高度时所具有的能，叫做<b className="text-white">重力势能</b>。物体的质量越大，位置越高，重力势能越大。</p>
          <p className="mt-3">物体由于发生弹性形变而具有的能，叫做<b className="text-white">弹性势能</b>。物体的弹性形变越大，弹性势能越大。重力势能和弹性势能是常见的两种势能。</p>
          <p className="mt-3 text-[13.5px] text-white/65">重锤砸桩、弹簧弹球，都是在对外做功。桩砸得越深、球弹得越高，说明原来存着的势能越大。木桩砸进的深度是按简化的模型算的，只用来比较。</p>
        </>} />}
      finale={T.finale && <Finale kicker="五次都做完了" title="质量越大、位置越高，重力势能越大；弹性形变越大，弹性势能越大" more={`木桩依次砸进 ${cm('light', 'low')}、${cm('light', 'high')}、${cm('heavy', 'high')} cm；小球依次弹到 ${fmt(springRise('low'), 1)}、${fmt(springRise('high'), 1)} m。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          {spring ? <Big formula="小球弹起的高度" value={peak ? fmt(H, 1) : '—'} unit="m" /> : <Big formula="木桩砸进沙里" value={done ? cm(rig as MassKey, level!) : released && t! > fall ? fmt(drop * 100, 1) : '—'} unit="cm" />}
          <h2 className="mt-5 text-[12.5px] text-white/55">这一次的条件</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {spring ? <>
              <ParamTile symbol="形变" value={level ? fmt(SPRING.press[level] * 100) : '—'} unit="cm · 弹簧压缩" />
              <ParamTile symbol="m" value={String(SPRING.ball)} unit="kg · 小球的质量" />
            </> : <>
              <ParamTile symbol="m" value={String(HAMMER.masses[rig as MassKey])} unit="kg · 重锤的质量" />
              <ParamTile symbol="h" value={level ? String(HAMMER.heights[level]) : '—'} unit="m · 离桩顶的高度" />
            </>}
          </div>
          <Records title="记录" head={['器材', '条件', '结果']} rows={rows.map(([r, l]) => [RIGS[r], r === 'spring' ? `压缩 ${fmt(SPRING.press[l] * 100)} cm` : `高 ${HAMMER.heights[l]} m`, result(r, l)])} />
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'low'} onClick={() => set('low')} disabled={run.running}>{spring ? '压缩 5 cm' : '升到 0.5 m'}</LabButton>
        <LabButton pulse={next === 'high'} onClick={() => set('high')} disabled={run.running}>{spring ? '压缩 10 cm' : '升到 1 m'}</LabButton>
        <LabButton primary pulse={next === 'go'} onClick={run.start} disabled={!ready}>松手</LabButton>
      </>}
      extras={
        <Control label="器材">
          <Segmented label="器材" pulse={next === 'rig'} want={next === 'rig' ? WANT[task!.id][0] : null} value={rig} onChange={k => { if (!run.running) setRig(k) }} options={(Object.keys(RIGS) as RigKey[]).map(k => ({ value: k, label: RIGS[k] }))} />
        </Control>
      }
    />
  )
}
