// 原电池 · 第 5 课 为什么要用盐桥（单液电池电流衰减；双液电池把两个半反应分开）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Beaker, LIQUID, Meter, Plate, Wire } from './parts'
import { RUN_MIN, currentAt } from './physics'
import { SPAN, SPOT, ST, TOP } from './world'

type Kind = 'single' | 'double'
const NAME: Record<Kind, string> = { single: '单液电池', double: '双液电池（带盐桥）' }
const end = (k: Kind) => Math.round(currentAt(k === 'double', RUN_MIN))
const TASKS: Task[] = [
  { id: 'single', text: `单液电池：通电 ${RUN_MIN} 分钟，记下电流`, note: `掉到 ${end('single')}：锌片直接泡在硫酸铜溶液里，铜离子就在锌片上得电子，这部分电子没走导线` },
  { id: 'double', text: `换成带盐桥的双液电池，再记一次`, note: `还有 ${end('double')}：锌和铜离子被隔开，电子只能走导线` },
]
const X = ST.two, CW = 264, CH = 84, px = (t: number) => t / RUN_MIN * CW, py = (i: number) => CH - i / 105 * CH
const curve = (k: Kind) => Array.from({ length: 41 }, (_, i) => `${i ? 'L' : 'M'}${px(i / 4).toFixed(1)},${py(currentAt(k === 'double', i / 4)).toFixed(1)}`).join(' ')

export default function Lesson5() {
  const [kind, setKind] = useState<Kind>('single')
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<Kind[]>([])
  const T = useTasks('gewu:battery:5', TASKS)
  const t = useSlide(goal, 2.6), moving = Math.abs(t - goal) > 0.01, done = goal === RUN_MIN && !moving
  const dbl = kind === 'double', now = currentAt(dbl, t), dup = rows.includes(kind)
  const pick = (k: Kind) => { if (moving) return; setKind(k); setGoal(0) }
  const record = () => { if (!done || dup) return; const next = [...rows, kind]; setRows(next); T.check(id => next.includes(id as Kind)) }
  const resetAll = () => { setKind('single'); setGoal(0); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'kind' | 'run' | 'record' | null } = !task ? { hint: '比完了。盐桥把两个半反应隔开，电流才稳得住。', next: null }
    : moving ? { hint: goal ? (dbl ? '电流几乎不变…' : '电流在往下掉：看锌片表面') : '换上新的溶液和电极…', next: null }
    : kind !== task.id ? { hint: `把电池换成“${NAME[task.id as Kind]}”`, next: 'kind' }
    : done && !dup ? { hint: `${RUN_MIN} 分钟了，电流 ${now.toFixed(0)}：按“记录”`, next: 'record' } : { hint: `按“通电 ${RUN_MIN} 分钟”`, next: 'run' }
  const dx = dbl ? 0.36 : 0.11, coat = dbl ? 0 : Math.min(1, t / RUN_MIN)
  const labels: Label[] = [
    { id: 'zn', at: [X - dx - 0.22, TOP + 0.62, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>负极</small>锌片{!dbl && t > 2 ? '（表面长出了铜）' : ''}</> },
    { id: 'cu', at: [X + dx + 0.22, TOP + 0.62, 0], className: 'scene-tag -translate-y-1/2', children: <><small>正极</small>铜片</> },
    { id: 'i', at: [X - 0.2, TOP + 0.3, -0.5], ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>电流</small>{now.toFixed(0)}</> },
    ...(dbl ? [{ id: 'br', at: [X, TOP + 0.66, 0] as [number, number, number], ax: 0.5, className: 'scene-name -translate-y-full', name: true, children: '盐桥' }, { id: 'l1', at: [X - dx, TOP + 0.02, 0.3] as [number, number, number], ax: 0.5, name: true, className: 'scene-name', children: '硫酸锌溶液' }, { id: 'l2', at: [X + dx, TOP + 0.02, 0.3] as [number, number, number], ax: 0.5, name: true, className: 'scene-name', children: '硫酸铜溶液' }]
      : [{ id: 'l', at: [X, TOP + 0.02, 0.36] as [number, number, number], ax: 0.5, name: true, className: 'scene-name', children: '硫酸铜溶液' }]),
  ]

  return (
    <LabShell title="原电池" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="铜锌原电池"
      stage={<LabStage labels={labels} target={SPOT.two} span={SPAN}>
        <group position={[X, TOP, 0]}>
          {dbl ? <><Beaker position={[-dx, 0, 0]} r={0.22} liquid={LIQUID.zinc} /><Beaker position={[dx, 0, 0]} r={0.22} liquid={LIQUID.copper} /></> : <Beaker position={[0, 0, 0]} r={0.27} liquid={LIQUID.copper} />}
          <Plate position={[-dx, 0.05, 0]} metal="Zn" /><Plate position={[dx, 0.05, 0]} metal="Cu" />
          {/* 单液电池里，锌片泡在硫酸铜溶液中的那一段慢慢长出一层铜 */}
          {coat > 0.02 && <mesh position={[-dx, 0.16, 0]}><boxGeometry args={[0.03, 0.2, 0.135]} /><meshStandardMaterial color="#8a4a26" transparent opacity={coat * 0.9} roughness={0.9} /></mesh>}
          {/* 盐桥：一根倒扣的 U 形管，两头各插进一只烧杯 */}
          {dbl && <mesh position={[0, 0.2, 0.06]}><torusGeometry args={[dx - 0.1, 0.028, 10, 32, Math.PI]} /><meshStandardMaterial color="#f1ead2" transparent opacity={0.85} roughness={0.3} /></mesh>}
          <Meter position={[0, 0, -0.5]} value={goal ? now / 100 : 0} />
          <Wire points={[[-dx, 0.52, 0], [-dx - 0.06, 0.74, -0.14], [-0.14, 0.5, -0.44], [0.14, 0.5, -0.44], [dx + 0.06, 0.74, -0.14], [dx, 0.52, 0]]} flow={goal ? 1 : 0} />
        </group>
      </LabStage>}
      lesson={<LessonBlock no="5" title="为什么要用盐桥" concept="把氧化和还原分到两只烧杯里" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>把锌片和铜片一起插进硫酸铜溶液，也是一个原电池。但锌片直接泡在硫酸铜溶液里，一部分铜离子就在<b className="text-white">锌片表面</b>直接得到电子、变成铜。这些电子没有经过导线，电流很快就小了。</p>
          <p className="mt-3">把锌片放进硫酸锌溶液、铜片放进硫酸铜溶液，中间用<b className="text-white">盐桥</b>连起来：锌碰不到铜离子，电子只能从导线过去。盐桥里的离子可以移动，让两边的溶液保持电中性，回路才是通的。</p>
          <p className="mt-3 text-[13.5px] text-white/65">电流是按简化的规律算的相对值（刚接通时算 100），只用来比较“会掉”和“稳得住”。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种电池比完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">{RUN_MIN} 分钟后，单液的电流只剩 {end('single')}，带盐桥的还有 {end('double')}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">盐桥不参加反应，它的作用是接通回路、平衡电荷。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAME[kind]} · 通电 {t.toFixed(0)} 分钟</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{goal ? now.toFixed(0) : '—'}</div>
            <div className="mt-1 text-[12.5px] text-white/50">电流，相对值</div>
          </div>
          <svg viewBox={`-2 -4 ${CW + 4} ${CH + 20}`} className="mt-3 w-full" role="img" aria-label="电流随时间的变化">
            {rows.filter(k => k !== kind).map(k => <path key={k} d={curve(k)} fill="none" stroke="#ffffff" strokeOpacity={0.4} strokeWidth={1.5} />)}
            <path d={curve(kind)} fill="none" stroke="#7fe3d4" strokeWidth={2.2} />
            <circle cx={px(t)} cy={py(now)} r={4.5} fill="#ffe14d" />
            {[0, 2, 4, 6, 8, 10].map(m => <text key={m} x={px(m)} y={CH + 13} textAnchor="middle" fontSize={10} fill="#ffffff" fillOpacity={0.5}>{m} 分</text>)}
          </svg>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="负极" value="Zn − 2e⁻ = Zn²⁺" unit="锌片" />
            <ParamTile symbol="正极" value="Cu²⁺ + 2e⁻ = Cu" unit="铜片" />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">电池</th><th className="text-right font-normal">{RUN_MIN} 分钟后的电流</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{NAME[k]}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{end(k)}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'run'} onClick={() => setGoal(RUN_MIN)} disabled={moving || goal > 0}>通电 {RUN_MIN} 分钟</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!done || dup}>记录</LabButton>
      </>}
      extras={<Control label="电池"><Segmented label="电池" pulse={next === 'kind'} want={next === 'kind' ? task!.id as Kind : null} value={kind} disabled={moving} onChange={pick} options={[{ value: 'single', label: '单液' }, { value: 'double', label: '双液（带盐桥）' }]} /></Control>}
    />
  )
}
