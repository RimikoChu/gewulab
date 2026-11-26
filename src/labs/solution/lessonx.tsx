// 溶液 · 拓展课 盐场的一年：盐田全景。湖边的泵房把卤水抽进蒸发池，太阳和风把水晒走，卤水一排排变浓，进结晶池析出盐；
// 收盐堆成盐山，剩下的母液还能提取别的物质。最后换到冬天：天冷了，湖边析出的是纯碱——“冬天捞碱，夏天晒盐”。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { ease, seg, useRun } from './parts'
import { LAKE, PILE, POND, PUMP, Place, type V3 } from './world'

const STEPS = ['yin', 'shai', 'shou'] as const
const DUR = { yin: 6, shai: 8, shou: 6 }
const TASKS: Task[] = [
  { id: 'yin', text: '把湖里的卤水引进蒸发池', note: '泵房把湖里的卤水抽进盐田，一格格往下流' },
  { id: 'shai', text: '晒卤：卤水一级级变浓，流进结晶池', note: '水分不断蒸发，卤水越来越浓，到结晶池里达到饱和，盐析出来' },
  { id: 'shou', text: '收盐，看看剩下的母液', note: '盐堆成盐山；析出盐以后剩下的母液，还能提取氯化镁、氯化钾等' },
  { id: 'dong', text: '换到冬天，看看湖边', note: '冬天气温低，溶解度随温度变化大的纯碱析出来：冬天捞碱，夏天晒盐' },
]

/** 冬天湖边析出的碱：贴着湖岸的一片片不规则白色薄层，中间夹着几处低矮的小堆。k 0–1 长出来多少 */
function SodaBeach({ at, k }: { at: V3; k: number }) {
  const geo = useMemo(() => {
    let s = 41; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    const patches = Array.from({ length: 16 }, (_, i) => {
      const R = 3 + r() * 7, n = 28, pts: THREE.Vector2[] = [], ph = [r() * 6, r() * 6]
      for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2, q = R * (1 + 0.28 * Math.sin(a * 3 + ph[0]) + 0.16 * Math.sin(a * 5 + ph[1]) + (r() - 0.5) * 0.12); pts.push(new THREE.Vector2(Math.cos(a) * q, Math.sin(a) * q)) }
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.12 + r() * 0.1, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.08, bevelSegments: 2 })
      g.rotateX(-Math.PI / 2)
      return { g, x: (r() - 0.5) * 60, z: -6 - r() * 26 + (i % 3) * 2, d: r() * 0.5 }
    })
    const mounds = Array.from({ length: 14 }, () => ({ x: (r() - 0.5) * 50, z: -8 - r() * 22, r: 0.8 + r() * 1.8, d: r() * 0.6 }))
    return { patches, mounds }
  }, [])
  const mat = <meshStandardMaterial color="#f3f1ec" roughness={0.65} />
  return <group position={at}>
    {geo.patches.map((p, i) => { const g = Math.max(0, Math.min(1, (k - p.d) * 2.2)); return g > 0.01 && <mesh key={i} geometry={p.g} position={[p.x, -0.3, p.z]} scale={[g, 1, g]} receiveShadow>{mat}</mesh> })}
    {geo.mounds.map((m, i) => { const g = Math.max(0, Math.min(1, (k - m.d) * 2.5)); return g > 0.01 && <mesh key={i} position={[m.x, -0.2, m.z]} scale={[m.r * g, m.r * 0.35 * g, m.r * g]} castShadow>{mat}<sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh> })}
  </group>
}

export default function LessonX() {
  const [step, setStep] = useState(0)
  const [season, setSeason] = useState<'summer' | 'winter'>('summer')
  const T = useTasks('gewu:solution:x', TASKS)
  const cur = STEPS[Math.min(2, step)]
  const run = useRun(DUR[cur], () => { const s = step + 1; setStep(s); T.check(id => STEPS.indexOf(id as typeof STEPS[number]) >= 0 && STEPS.indexOf(id as typeof STEPS[number]) < s) })
  const [cold, setCold] = useState(0)
  const chill = useRun(5, () => { setCold(1); T.check(id => id === 'dong') })
  const resetAll = () => { run.snap(0); chill.snap(0); setStep(0); setSeason('summer'); setCold(0); T.reset() }
  const busy = run.busy || chill.busy
  const doing = (s: typeof STEPS[number]) => run.busy && cur === s

  const brine = doing('yin') ? ease(seg(run.t, 0.5, DUR.yin - 0.3)) : step >= 1 ? 1 : 0
  const crust = doing('shai') ? ease(seg(run.t, 0.6, DUR.shai - 0.3)) : step >= 2 ? (doing('shou') ? 1 - ease(seg(run.t, 0.5, DUR.shou - 0.5)) * 0.9 : step >= 3 ? 0.1 : 1) : 0
  const pile = doing('shou') ? ease(seg(run.t, 0.5, DUR.shou - 0.5)) : step >= 3 ? 1 : 0
  const winter = season === 'winter'
  const soda = chill.busy ? ease(seg(chill.t, 2.2, 4.8)) : cold

  const task = T.current
  const { hint, next }: { hint: string; next: 'main' | 'season' | null } = !task ? { hint: '夏天蒸发快，晒出氯化钠；冬天气温低，析出纯碱。', next: null }
    : run.busy ? { hint: cur === 'yin' ? '水泵把卤水抽进最北边的蒸发池…' : cur === 'shai' ? '风吹日晒，卤水一排排变浓，流进结晶池…' : '把结晶池里的盐收起来，堆成盐山…', next: null }
    : chill.busy ? { hint: '到了冬天，湖水变冷…', next: null }
    : task.id === 'yin' ? { hint: '开动泵房，把湖里的卤水引进蒸发池', next: 'main' }
    : task.id === 'shai' ? { hint: '卤水进池了。让太阳和风把它晒浓', next: 'main' }
    : task.id === 'shou' ? { hint: '结晶池里铺满了盐。收盐', next: 'main' }
    : { hint: '换到冬天，看看湖边析出了什么', next: 'season' }

  const label = ['引卤', '晒卤', '收盐'][Math.min(2, step)]
  const shore: V3 = [PUMP.x - 70, 0.6, LAKE.z + 4]
  const labels: Label[] = winter ? [
    { id: 'w1', at: [shore[0], 3, shore[2]], ax: 0.5, className: `scene-tag ${soda > 0.5 ? 'key' : ''} -translate-y-full`, children: <><small>冬天的湖边</small>{soda > 0.5 ? '析出纯碱' : '湖水变冷'}</> },
    { id: 'w2', at: [PUMP.x, 16, PUMP.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '引卤泵房' },
  ] : [
    { id: 'l1', at: [200, 4, LAKE.z - 200], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>盐湖</small>卤水</> },
    { id: 'l2', at: [PUMP.x, 16, PUMP.z], ax: 0.5, className: `scene-tag ${doing('yin') ? 'key' : ''} -translate-y-full`, children: <><small>泵房</small>{doing('yin') ? '抽卤水' : '引卤'}</> },
    { id: 'l3', at: [470, 4, -370], ax: 0.5, className: `scene-tag ${doing('shai') ? 'key' : ''} -translate-y-full`, children: <><small>蒸发池</small>{brine > 0.1 ? '卤水一排排变浓' : '空着'}</> },
    { id: 'l4', at: [(POND.x0 + POND.x1) / 2 + 130, 4, (POND.z0 + POND.z1) / 2], ax: 0.5, className: `scene-tag ${crust > 0.5 ? 'key' : ''} -translate-y-full`, children: <><small>结晶池</small>{crust > 0.5 ? '析出盐' : step >= 3 ? '剩下母液' : '—'}</> },
    { id: 'l5', at: [PILE.x, 30, PILE.z], ax: 0.5, className: `scene-tag ${pile > 0.5 ? 'key' : ''} -translate-y-full`, children: <><small>盐堆</small>{pile > 0.5 ? '收盐' : '去年的盐'}</> },
  ]
  return (
    <LabShell title="溶液" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel="盐场"
      stage={<Place at={winter ? 'xw' : 'x'} labels={labels} brine={brine} field={crust} pile={0.5 + 0.5 * pile} winter={winter}>
        {winter && <SodaBeach at={shore} k={soda} />}
      </Place>}
      lesson={<LessonBlock no="拓展" title="盐场的一年" concept="夏天晒盐，冬天捞碱" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>盐湖和海边的盐场，把卤水引进一格格的盐田。卤水在<b className="text-white">蒸发池</b>里经风吹日晒，水分不断蒸发，越来越浓；浓到饱和以后进<b className="text-white">结晶池</b>，继续蒸发，氯化钠就结晶析出。这就是蒸发结晶。</p>
          <p className="mt-3">析出盐以后剩下的液体叫<b className="text-white">母液</b>（苦卤），它仍是氯化钠的饱和溶液，里面还有氯化镁、氯化钾等，可以再提取利用。</p>
          <p className="mt-3">纯碱的溶解度受温度影响很大。冬天气温低，它从湖水里结晶析出，所以有“冬天捞碱，夏天晒盐”的说法。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">盐场的一年走完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">夏天晒盐靠蒸发，冬天捞碱靠降温</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">氯化钠的溶解度受温度影响小，用蒸发结晶；纯碱的溶解度受温度影响大，天冷时降温结晶。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">盐田里的流程</h2>
          <ol className="mt-2 flex flex-col gap-1 text-[14px]">
            {['湖里的卤水', '蒸发池：晒浓', '结晶池：析出盐', '收盐、剩下母液'].map((s, i) => <li key={s} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${step >= i || (i === 0) ? 'bg-white/[0.08] text-white' : 'text-white/45'}`}><span className="w-4 tabular-nums text-white/50">{i + 1}</span>{s}</li>)}
          </ol>
          <h2 className="mt-4 text-[12.5px] text-white/55">两种结晶</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <tbody>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">夏天</td><td>氯化钠</td><td className="rounded-r-lg">蒸发结晶</td></tr>
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">冬天</td><td>纯碱</td><td className="rounded-r-lg">降温结晶</td></tr>
            </tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'main'} pulse={next === 'main'} onClick={() => { if (busy || step > 2 || winter) return; run.run() }} disabled={busy || step > 2 || winter}>{label}</LabButton>
      </>}
      extras={
        <Control label="季节">
          <Segmented label="季节" pulse={next === 'season'} want={next === 'season' ? 'winter' : null} value={season} disabled={busy || step < 3} onChange={v => { setSeason(v as 'summer' | 'winter'); if (v === 'winter' && !cold) chill.run() }} options={[{ value: 'summer', label: '夏天' }, { value: 'winter', label: '冬天' }]} />
        </Control>
      }
    />
  )
}
