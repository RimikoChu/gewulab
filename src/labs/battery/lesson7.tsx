// 原电池 · 第 7 课 只排出水的电池（氢氧燃料电池）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label, lathe } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Bubbles, Bulb, Wire } from './parts'
import { FUEL, fuelRuns } from './physics'
import { SPAN, SPOT, ST, TOP } from './world'

const TASKS: Task[] = [
  { id: 'one', text: '先只通一种气体，看灯亮不亮', note: '不亮：负极要氢气，正极要氧气，缺一样都不行' },
  { id: 'both', text: '两种气体都通上', note: '灯亮了：氢气在负极失电子，氧气在正极得电子' },
  { id: 'water', text: '看它排出来的是什么', note: `只有水：${FUEL.total}` },
]
const X = ST.four

// 气瓶：圆肩、细颈、底下一圈底座；瓶口一只黄铜阀
const BOTTLE = lathe([[0, 0], [0.1, 0], [0.11, 0.012], [0.11, 0.66], [0.1, 0.72], [0.07, 0.775], [0.04, 0.8], [0.036, 0.84], [0, 0.84]], { segs: 32 })
const VALVE = lathe([[0, 0], [0.03, 0], [0.03, 0.02], [0.02, 0.024], [0.02, 0.05], [0.026, 0.054], [0.026, 0.07], [0, 0.07]], { segs: 16 })
export default function Lesson7() {
  const [h2, setH2] = useState(false)
  const [o2, setO2] = useState(false)
  const T = useTasks('gewu:battery:7', TASKS)
  const run = fuelRuns(h2, o2)
  useEffect(() => { if (h2 !== o2) T.check(id => id === 'one') }, [h2, o2])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!run) return; T.check(id => id === 'one' || id === 'both'); const t = setTimeout(() => T.check(() => true), 2600); return () => clearTimeout(t) }, [run])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setH2(false); setO2(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'h2' | 'o2' | null } = !task ? { hint: '做完了。燃料和氧气不断送进来，它就能一直发电。', next: null }
    : task.id === 'one' ? { hint: '按“通氢气”，先只通这一种', next: 'h2' }
    : run ? { hint: '灯亮了。看下面的出水口…', next: null } : { hint: !h2 ? '再把氢气也通上' : '再把氧气也通上', next: !h2 ? 'h2' : 'o2' }
  const labels: Label[] = [
    { id: 'n', at: [X - 0.5, TOP + 0.95, 0], ax: 1, className: `scene-tag -translate-y-1/2${h2 ? ' key' : ''}`, children: <><small>负极</small>{h2 ? '氢气通着' : '氢气没通'}</> },
    { id: 'p', at: [X + 0.5, TOP + 0.95, 0], className: `scene-tag -translate-y-1/2${o2 ? ' key' : ''}`, children: <><small>正极</small>{o2 ? '氧气通着' : '氧气没通'}</> },
    { id: 'w', at: [X + 0.12, TOP + 0.1, 0.3], className: 'scene-tag transition-opacity', style: { opacity: run ? 1 : 0 }, children: <><small>排出</small>水</> },
    { id: 'nE', at: [X, TOP + 0.5, 0.26], ax: 0.5, name: true, className: 'scene-name', children: '电解质' },
  ]

  return (
    <LabShell title="原电池" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="燃料电池"
      stage={<LabStage labels={labels} target={SPOT.four} span={SPAN}>
        <group position={[X, TOP, 0]}>
          {/* 中间是电解质，两边各一块多孔的电极，再外面是两间气室 */}
          <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.16, 0.7, 0.42]} /><meshStandardMaterial color="#e6d9a8" roughness={0.6} /></mesh>
          {[-1, 1].map(s => <group key={s}>
            <mesh position={[s * 0.11, 0.5, 0]}><boxGeometry args={[0.05, 0.7, 0.42]} /><meshStandardMaterial color="#30343a" roughness={0.8} /></mesh>
            <mesh position={[s * 0.26, 0.5, 0]}><boxGeometry args={[0.24, 0.7, 0.42]} /><meshStandardMaterial color={s < 0 ? '#bfe3ff' : '#ffd0c8'} transparent opacity={(s < 0 ? h2 : o2) ? 0.45 : 0.14} roughness={0.1} depthWrite={false} /></mesh>
            <mesh position={[s * 0.62, 0.72, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.025, 0.025, 0.5, 10]} /><meshStandardMaterial color="#9aa3a6" metalness={0.6} roughness={0.4} /></mesh>
            <mesh geometry={BOTTLE} position={[s * 0.98, 0, 0]} castShadow><meshPhysicalMaterial color={s < 0 ? '#3f8fd9' : '#d9534a'} metalness={0.4} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.25} /></mesh>
            <mesh geometry={VALVE} position={[s * 0.98, 0.82, 0]}><meshStandardMaterial color="#c9b06a" metalness={1} roughness={0.3} /></mesh>
            <mesh position={[s * 0.98, 0.9, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.04, 0.008, 8, 20]} /><meshStandardMaterial color="#22272b" roughness={0.6} /></mesh>
            <Bubbles at={[s * 0.26, 0.2, 0.1]} top={0.8} rate={(s < 0 ? h2 : o2) ? 0.9 : 0} n={8} />
          </group>)}
          <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.8, 0.1, 0.5]} /><meshStandardMaterial color="#20262b" roughness={0.6} /></mesh>
          <Bubbles at={[0.06, 0.02, 0.28]} top={-0.02} rate={run ? 0.6 : 0} n={4} />
          <Bulb position={[0, 1.02, 0]} on={run ? 1 : 0} />
          <Wire points={[[-0.11, 0.86, 0], [-0.1, 1.0, 0], [0, 1.03, 0], [0.1, 1.0, 0], [0.11, 0.86, 0]]} flow={run ? 1 : 0} />
        </group>
      </LabStage>}
      lesson={<LessonBlock no="7" title="只排出水的电池" concept="燃料不断送进来，电就不断发出来" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>氢氧燃料电池也是原电池：{FUEL.neg}通到负极，失去电子；{FUEL.pos}通到正极，得到电子。总反应和氢气燃烧一样：<b className="text-white">{FUEL.total}</b>，但没有火焰，化学能直接变成了电能。</p>
          <p className="mt-3">它和干电池不同：反应物不装在电池里面，而是从外面不断送进来，所以能连续发电；产物只有水，不污染环境。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">灯亮了，排出来的是水</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">{FUEL.total}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">还是“负极失电子、正极得电子”那一套，只是把电极上的反应物换成了氢气和氧气。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">小灯泡</div>
            <div className="mt-1 text-[36px] leading-none font-bold tracking-tight text-[#7fe3d4]">{run ? '亮了' : '不亮'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="负极" value={h2 ? '氢气通着' : '没通'} unit="氢气失电子" />
            <ParamTile symbol="正极" value={o2 ? '氧气通着' : '没通'} unit="氧气得电子" />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2"><ParamTile symbol="产物" value={run ? FUEL.product : '—'} unit={FUEL.total} /></div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'h2'} pulse={next === 'h2'} onClick={() => setH2(v => !v)}>{h2 ? '关掉氢气' : '通氢气'}</LabButton>
        <LabButton primary={next === 'o2'} pulse={next === 'o2'} onClick={() => setO2(v => !v)}>{o2 ? '关掉氧气' : '通氧气'}</LabButton>
      </>}
      extras={null}
    />
  )
}
