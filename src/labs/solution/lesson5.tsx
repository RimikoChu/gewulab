// 溶液 · 第 5 课 溶解度曲线：化验室中间那块带轮子的白板。选一种物质，按溶解度表把点描上去，再连成光滑的曲线；
// 三条都画好以后找硝酸钾和氯化钠的交点，再读 60 ℃ 时两者的溶解度。氢氧化钙的数太小，画在右边的小图上。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { Glove } from './gear'
import { CURVE_COLOR, ChartFace, penAt, px, toBoard } from './board'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { SALT_NAME, crossing, g1, solubility, type Salt } from './physics'
import { BOARD, Place, type V3 } from './world'

const KEYS: Salt[] = ['KNO3', 'NaCl', 'CaOH2']
const DRAW = 7, MARK = 2.4
const C = crossing()
const TASKS: Task[] = [
  { id: 'KNO3', text: '描出硝酸钾的溶解度曲线', note: '硝酸钾的溶解度随温度升高明显增大，曲线很陡' },
  { id: 'NaCl', text: '描出氯化钠的溶解度曲线', note: '氯化钠的溶解度受温度影响很小，曲线很平' },
  { id: 'CaOH2', text: '描出氢氧化钙的溶解度曲线', note: '氢氧化钙的溶解度很小，而且随温度升高而减小' },
  { id: 'cross', text: '找硝酸钾和氯化钠两条线的交点', note: `约 ${Math.round(C.t)} ℃ 时，两者的溶解度相等，约 ${Math.round(C.s)} g` },
  { id: 'r60', text: '读 60 ℃ 时两者的溶解度', note: `60 ℃ 时硝酸钾 ${solubility('KNO3', 60).toFixed(0)} g，比氯化钠的 ${g1(solubility('NaCl', 60))} g 大得多` },
]

/** 白板笔：黑色笔杆、红色笔帽，笔尖在原点，笔杆朝 +z 伸出来 */
function Marker({ color }: { color: string }) {
  return <group>
    <mesh position={[0, 0, 0.08]} rotation-x={Math.PI / 2}><coneGeometry args={[0.05, 0.16, 12]} /><meshStandardMaterial color="#2a2c2e" roughness={0.6} /></mesh>
    <mesh position={[0, 0, 0.85]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.11, 0.11, 1.3, 20]} /><meshPhysicalMaterial color="#f2f2ee" roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh position={[0, 0, 1.58]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.115, 0.11, 0.2, 20]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
    <mesh position={[0, 0, 0.18]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.07, 0.1, 0.1, 16]} /><Metal kind="aluminum" /></mesh>
  </group>
}

export default function Lesson5() {
  const [pick, setPick] = useState<Salt>('KNO3')
  const [drawn, setDrawn] = useState<Record<Salt, boolean>>({ KNO3: false, NaCl: false, CaOH2: false })
  const [cross, setCross] = useState(false)
  const [r60, setR60] = useState(false)
  const [act, setAct] = useState<Salt>('KNO3')
  const T = useTasks('gewu:solution:5', TASKS)
  const draw = useRun(DRAW, () => { const d = { ...drawn, [act]: true }; setDrawn(d); T.check(id => (id in d) && d[id as Salt]) })
  const mark = useRun(MARK, () => { if (!cross) { setCross(true); T.check(id => id === 'cross') } else { setR60(true); T.check(id => id === 'r60') } })
  const busy = draw.busy || mark.busy
  const resetAll = () => { draw.snap(0); mark.snap(0); setPick('KNO3'); setDrawn({ KNO3: false, NaCl: false, CaOH2: false }); setCross(false); setR60(false); T.reset() }

  const k = (s: Salt) => draw.busy && act === s ? draw.k : drawn[s] ? 1 : 0
  const st = { k: { KNO3: k('KNO3'), NaCl: k('NaCl'), CaOH2: k('CaOH2') }, cross: cross ? 1 : mark.busy && !cross ? mark.k : 0, r60: r60 ? 1 : mark.busy && cross ? mark.k : 0 }
  const task = T.current, want = (task && task.id in drawn ? task.id : null) as Salt | null
  const both = drawn.KNO3 && drawn.NaCl
  const { hint, next }: { hint: string; next: 'pick' | 'draw' | 'cross' | 'r60' | null } = !task ? { hint: '硝酸钾受温度影响大，氯化钠影响小，氢氧化钙随温度升高反而减小。', next: null }
    : draw.busy ? { hint: draw.k < 0.5 ? '按溶解度表，一个温度描一个点…' : '用平滑的曲线把点连起来…', next: null }
    : mark.busy ? { hint: cross ? '从 60 ℃ 往上画一条竖线…' : '从交点往两条坐标轴画虚线…', next: null }
    : want && pick !== want ? { hint: `换成${SALT_NAME[want]}`, next: 'pick' }
    : want ? { hint: `把${SALT_NAME[want]}的溶解度描到坐标板上，连成曲线`, next: 'draw' }
    : task.id === 'cross' ? { hint: '硝酸钾和氯化钠两条线相交了。找出交点', next: 'cross' }
    : { hint: '读出 60 ℃ 时两者的溶解度', next: 'r60' }

  // 笔尖：画曲线时跟着描到的地方；找交点、读 60 ℃ 时停在那一处；平时放在笔槽里
  const tipPx = draw.busy ? penAt(act, draw.k) : mark.busy ? (cross ? px('NaCl', 60, solubility('KNO3', 60)) : px('NaCl', C.t, C.s)) : null
  const tip: V3 = tipPx ? [BOARD.x + toBoard(tipPx)[0], BOARD.y + toBoard(tipPx)[1], BOARD.z + 0.03] : [BOARD.x + 2.2, BOARD.y - BOARD.h / 2 - 0.15, BOARD.z + 0.32]
  const labels: Label[] = [
    { id: 'n1', at: [BOARD.x - BOARD.w / 2, BOARD.y + BOARD.h / 2 + 0.3, BOARD.z], ax: 0, name: true, className: 'scene-name -translate-y-full', children: '坐标白板' },
  ]
  return (
    <LabShell title="溶液" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="作图"
      stage={<Place at="l5" labels={labels}>
        <ChartFace st={st} />
        <group position={tip} rotation={tipPx ? [-0.35, 0.25, 0] : [0, Math.PI / 2, Math.PI / 2]}><Marker color={CURVE_COLOR[act]} />
          {tipPx && <group position={[0.05, -0.2, 1.0]} rotation={[-1.2, 0.2, 0.3]}><Glove s={0.06} /></group>}
        </group>
      </Place>}
      lesson={<LessonBlock no="5" title="溶解度曲线" concept="曲线上每一点，是那个温度下的溶解度" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用纵坐标表示溶解度、横坐标表示温度，把溶解度表里的数据描成点再连起来，得到物质的溶解度随温度变化的曲线，叫做<b className="text-white">溶解度曲线</b>。</p>
          <p className="mt-3">从曲线上能查出某物质在不同温度下的溶解度；比较同一温度下不同物质溶解度的大小；看出溶解度受温度影响的大小。两条曲线的<b className="text-white">交点</b>表示在该温度下两种物质的溶解度相等。</p>
          <p className="mt-3">大多数固体的溶解度随温度升高而增大（硝酸钾明显，氯化钠很小）；少数随温度升高而减小，如氢氧化钙。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三条曲线都画好了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">曲线上每一点，是那个温度下的溶解度</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">硝酸钾的曲线陡，适合降温结晶；氯化钠的曲线平，适合蒸发结晶。约 {Math.round(C.t)} ℃ 时两者的溶解度相等。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">溶解度表（g / 100 g 水）</h2>
          <table className="mt-2 w-full text-center text-[13px] tabular-nums">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium">℃</th>{KEYS.map(s => <th key={s} className="pb-1 font-medium" style={{ color: drawn[s] || (draw.busy && act === s) ? CURVE_COLOR[s] === '#2c69b0' ? '#7fb2f0' : CURVE_COLOR[s] === '#d2452f' ? '#ff9a85' : '#7fd6a4' : undefined }}>{SALT_NAME[s]}</th>)}</tr></thead>
            <tbody>{[0, 20, 40, 60, 80, 100].map(t => <tr key={t} className={t === 60 && r60 ? 'bg-white/[0.12]' : 'bg-white/[0.04]'}><td className="rounded-l-lg px-2 py-1 text-left">{t}</td><td>{solubility('KNO3', t).toFixed(t >= 60 ? 0 : 1)}</td><td>{g1(solubility('NaCl', t))}</td><td className="rounded-r-lg">{solubility('CaOH2', t).toFixed(3)}</td></tr>)}</tbody>
          </table>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white/8 px-3 py-2.5"><div className="text-[12px] text-white/55">交点</div><div className="mt-0.5 text-[19px] font-bold tabular-nums">{cross ? `约 ${Math.round(C.t)} ℃` : '—'}</div><div className="text-[12px] text-white/55">{cross ? `都约 ${Math.round(C.s)} g` : '两条线相交处'}</div></div>
            <div className="rounded-xl bg-white/8 px-3 py-2.5"><div className="text-[12px] text-white/55">60 ℃ 时</div><div className="mt-0.5 text-[19px] font-bold tabular-nums">{r60 ? `${solubility('KNO3', 60).toFixed(0)} g` : '—'}</div><div className="text-[12px] text-white/55">{r60 ? `硝酸钾；氯化钠 ${g1(solubility('NaCl', 60))} g` : '硝酸钾和氯化钠'}</div></div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'draw'} pulse={next === 'draw'} onClick={() => { if (busy || drawn[pick]) return; setAct(pick); draw.run() }} disabled={busy || drawn[pick]}>描点连线</LabButton>
        <LabButton primary={next === 'cross'} pulse={next === 'cross'} onClick={() => { if (busy || !both || cross) return; mark.run() }} disabled={busy || !both || cross}>找交点</LabButton>
        <LabButton primary={next === 'r60'} pulse={next === 'r60'} onClick={() => { if (busy || !cross || r60) return; mark.run() }} disabled={busy || !cross || r60}>读 60 ℃</LabButton>
      </>}
      extras={
        <Control label="画哪一种">
          <Segmented label="画哪一种" pulse={next === 'pick'} want={want} value={pick} disabled={busy} onChange={s => setPick(s as Salt)} options={KEYS.map(s => ({ value: s, label: SALT_NAME[s] }))} />
        </Control>
      }
    />
  )
}
