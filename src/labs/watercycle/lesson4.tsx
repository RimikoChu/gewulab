// 水循环 · 第 4 课 雨落在什么地上（下渗和地表径流；地面状况的影响）
import { useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import Basin from './basin'
import { LESSONS, goLesson } from './lessons'
import { GROUNDS, RAIN, runoff, seep, type GroundKey } from './physics'

const KEYS = Object.keys(GROUNDS) as GroundKey[]
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `给${GROUNDS[k].name}下一场 ${RAIN} mm 的雨，记下结果`, note: `流走 ${runoff(k)} mm，渗下去 ${seep(k)} mm` }))
const COLOR: Record<GroundKey, string> = { forest: '#3f7a3c', grass: '#8fbf5a', bare: '#a07a52', paved: '#7b8086' }
const PX = (i: number) => -6 + i * 3, Y0 = 1.9, Z0 = 10.4

/** 四块并排的径流小区：坡面、坡脚接水的槽（流走的）、坡面下面的土箱（渗下去的） */
function Plots({ wet, pick, raining }: { wet: Record<GroundKey, number>; pick: GroundKey; raining: boolean }) {
  return (
    <group>
      {KEYS.map((k, i) => (
        <group key={k} position={[PX(i), Y0, Z0]}>
          <mesh position={[0, 0.75, 0]} rotation-x={0.22} castShadow><boxGeometry args={[2.3, 0.16, 3.2]} /><meshStandardMaterial color={COLOR[k]} roughness={0.9} /></mesh>
          {k === 'forest' && [[-0.7, -0.9], [0.5, -0.5], [-0.2, 0.2], [0.7, 0.8], [-0.7, 1]].map(([x, z], j) => <mesh key={j} position={[x, 1.25 - z * 0.22, z]}><coneGeometry args={[0.28, 0.9, 6]} /><meshStandardMaterial color="#2c5e2e" flatShading /></mesh>)}
          <mesh position={[0, -0.05, -0.1]}><boxGeometry args={[2.3, 1.1, 3]} /><meshStandardMaterial color="#6f5a44" transparent opacity={0.55} roughness={1} /></mesh>
          <mesh position={[0, -0.6 + 0.55 * wet[k] * seep(k) / RAIN, 1.42]}><boxGeometry args={[2.2, 1.1 * wet[k] * seep(k) / RAIN + 0.01, 0.06]} /><meshBasicMaterial color="#5aa7e6" toneMapped={false} /></mesh>
          <mesh position={[0, 0.02, 2.05]}><boxGeometry args={[2.3, 1.25, 0.6]} /><meshStandardMaterial color="#cfe6ee" transparent opacity={0.25} roughness={0.1} depthWrite={false} /></mesh>
          <mesh position={[0, -0.6 + 0.6 * wet[k] * runoff(k) / RAIN, 2.05]}><boxGeometry args={[2.2, 1.2 * wet[k] * runoff(k) / RAIN + 0.01, 0.5]} /><meshBasicMaterial color="#2f8fe0" toneMapped={false} /></mesh>
          <mesh position={[0, -0.62, 0.4]} rotation-x={-Math.PI / 2}><ringGeometry args={[2.0, 2.12, 4, 1, Math.PI / 4]} /><meshBasicMaterial color="#35c7b3" transparent opacity={pick === k ? 0.95 : 0} toneMapped={false} /></mesh>
          {raining && pick === k && Array.from({ length: 16 }, (_, j) => <mesh key={j} position={[((j * 37) % 20) / 10 - 1, 1.6 + ((j * 53) % 17) / 10, ((j * 71) % 28) / 10 - 1.4]}><boxGeometry args={[0.03, 0.4, 0.03]} /><meshBasicMaterial color="#bfe3ff" toneMapped={false} /></mesh>)}
        </group>
      ))}
    </group>
  )
}

export default function Lesson4() {
  const [pick, setPick] = useState<GroundKey>('forest')
  const [rained, setRained] = useState<GroundKey[]>([])
  const [raining, setRaining] = useState(false)
  const [rows, setRows] = useState<GroundKey[]>([])
  const T = useTasks('gewu:watercycle:4', TASKS)
  const timer = useRef(0)
  const wetAll = Object.fromEntries(KEYS.map(k => [k, 0])) as Record<GroundKey, number>
  const level = useSlide(raining || rained.includes(pick) ? 1 : 0, 0.45)
  for (const k of rained) wetAll[k] = 1
  wetAll[pick] = rained.includes(pick) ? 1 : level
  const rain = () => { if (raining || rained.includes(pick)) return; setRaining(true); timer.current = window.setTimeout(() => { setRaining(false); setRained(r => [...r, pick]) }, 2400) }
  const dup = rows.includes(pick), ready = rained.includes(pick) && !raining
  const record = () => { if (!ready || dup) return; const next = [...rows, pick]; setRows(next); T.check(id => next.includes(id as GroundKey)) }
  const resetAll = () => { clearTimeout(timer.current); setPick('forest'); setRained([]); setRaining(false); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'pick' | 'rain' | 'record' | null } = !task ? { hint: '四块地都记完了。地面越硬，渗下去的越少，流走的越多。', next: null }
    : raining ? { hint: '下着雨：看坡脚的水槽和坡面下面的土', next: null }
    : pick !== task.id ? { hint: `换到“${GROUNDS[task.id as GroundKey].name}”`, next: 'pick' }
    : ready && !dup ? { hint: '雨停了：按“记录”', next: 'record' } : { hint: '按“下一场雨”', next: 'rain' }
  const labels: Label[] = KEYS.flatMap((k, i): Label[] => [
    { id: `n${k}`, at: [PX(i), Y0 + 2.0, Z0 - 1.2], ax: 0.5, className: `scene-tag -translate-y-full${pick === k ? ' key' : ''}`, children: GROUNDS[k].name },
    { id: `r${k}`, at: [PX(i), Y0 - 0.75, Z0 + 2.4], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: rained.includes(k) ? 1 : 0 }, children: `流走 ${runoff(k)} mm · 渗下 ${seep(k)} mm` },
  ])

  return (
    <LabShell title="水循环" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="试验小区"
      stage={<Basin at="plots" labels={labels}><Plots wet={wetAll} pick={pick} raining={raining} /></Basin>}
      lesson={<LessonBlock no="4" title="雨落在什么地上" concept="地面越容易透水，渗下去的越多，流走的越少" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>雨落到地面，一部分渗进土里（<b className="text-white">下渗</b>），一部分顺着地面流走（<b className="text-white">地表径流</b>）。各占多少，要看地面是什么样：</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">植被：</b>树冠和落叶拦住雨水，根系让土壤疏松，下渗多</li>
            <li><b className="text-[#7fe3d4]">硬化地面：</b>水泥、沥青几乎不透水，雨水大多直接流走</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">这里用的是简化的算法：流走的水 = 降雨量 × 径流系数（林地 0.2、草地 0.3、裸地 0.5、硬化地面 0.9），其余算下渗。只用来比较大小。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四块地都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">同样的雨，林地流走 {runoff('forest')} mm，硬化地面流走 {runoff('paved')} mm</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">地面不同，下渗和地表径流的比例就不同。人改变地面，就改变了这两个环节。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{GROUNDS[pick].name} · 降雨 {RAIN} mm · 流走的</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{ready ? runoff(pick) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">mm</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="径流系数" value={String(GROUNDS[pick].k)} unit="流走的占降雨的几成" />
            <ParamTile symbol="下渗" value={ready ? String(seep(pick)) : '—'} unit="mm · 渗进地里的" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每块地下完雨后按“记录”。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">地面</th><th className="text-right font-normal">流走</th><th className="text-right font-normal">渗下</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{GROUNDS[k].name}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{runoff(k)} mm</td><td className="text-right tabular-nums">{seep(k)} mm</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'rain'} onClick={rain} disabled={raining || rained.includes(pick)}>下一场雨</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!ready || dup}>记录</LabButton>
      </>}
      extras={<Control label="哪块地"><Segmented label="哪块地" pulse={next === 'pick'} want={next === 'pick' ? task!.id as GroundKey : null} value={pick} disabled={raining} onChange={setPick} options={KEYS.map(k => ({ value: k, label: GROUNDS[k].name }))} /></Control>}
    />
  )
}
