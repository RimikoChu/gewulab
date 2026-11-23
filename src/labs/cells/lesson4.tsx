// 细胞 · 第 4 课 做一张临时装片（擦、滴、取、展、盖、染）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { SAMPLES, SLIDE, type SampleKey } from './physics'
import View from './view'
import { SPAN, SPOT, ST, TOP } from './world'

const KEYS = Object.keys(SAMPLES) as SampleKey[]
const TASKS: Task[] = [
  { id: 'onion', text: '用洋葱鳞片叶表皮做一张装片', note: `滴的是${SAMPLES.onion.liquid}：${SAMPLES.onion.why}` },
  { id: 'cheek', text: '换成口腔上皮细胞，再做一张', note: `滴的是${SAMPLES.cheek.liquid}：${SAMPLES.cheek.why}` },
]
const TAKE: Record<SampleKey, string> = { onion: '用镊子从洋葱鳞片叶内侧撕下一小块透明的表皮', cheek: '先漱口，再用消毒牙签在口腔内侧壁上轻轻刮几下' }
const X = ST.prep

export default function Lesson4() {
  const [sample, setSample] = useState<SampleKey>('onion')
  const [step, setStep] = useState(0)
  const [made, setMade] = useState<SampleKey[]>([])
  const T = useTasks('gewu:cells:4', TASKS)
  const go = () => { if (step >= SLIDE.length) return; const s = step + 1; setStep(s); if (s >= SLIDE.length) { const next = made.includes(sample) ? made : [...made, sample]; setMade(next); T.check(id => next.includes(id as SampleKey)) } }
  const pick = (k: SampleKey) => { setSample(k); setStep(0) }
  const resetAll = () => { setSample('onion'); setStep(0); setMade([]); T.reset() }
  const does = (i: number) => SLIDE[i].key === 'drop' ? `在载玻片中央滴一滴${SAMPLES[sample].liquid}` : SLIDE[i].key === 'take' ? TAKE[sample] : SLIDE[i].does
  const task = T.current, todo = SLIDE[step], done = step >= SLIDE.length
  const { hint, next }: { hint: string; next: 'sample' | 'go' | null } = !task ? { hint: '两张装片都做好了。差别只在滴的那一滴液体。', next: null }
    : sample !== task.id ? { hint: `把材料换成“${SAMPLES[task.id as SampleKey].name}”`, next: 'sample' }
    : todo ? { hint: `按“下一步”——${todo.name}：${does(step)}`, next: 'go' } : { hint: '装片做好了，可以放到显微镜下看', next: null }
  const labels: Label[] = [
    { id: 'slide', at: [X, TOP + 0.12, 0.25], ax: 0.5, className: 'scene-tag key -translate-y-full', children: step ? <><small>第 {step} 步</small>{SLIDE[step - 1].name}</> : '载玻片' },
    { id: 'nDrop', at: [X + 0.55, TOP + 0.36, -0.1], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: SAMPLES[sample].liquid },
    { id: 'nIod', at: [X + 0.85, TOP + 0.3, -0.1], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '碘液' },
  ]

  return (
    <LabShell title="细胞" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="装片"
      stage={<LabStage labels={labels} target={SPOT.prep} span={SPAN.prep}>
        <group position={[X, TOP, 0]}>
          {/* 载玻片、中央的液滴、材料、盖玻片 */}
          <mesh position={[0, 0.008, 0.25]}><boxGeometry args={[0.75, 0.016, 0.26]} /><meshStandardMaterial color="#d8eef2" transparent opacity={0.55} roughness={0.05} /></mesh>
          {step >= 2 && <mesh position={[0, 0.022, 0.25]} scale={[1, 0.25, 1]}><sphereGeometry args={[0.07, 20, 12]} /><meshStandardMaterial color={step >= 6 ? '#c9a35a' : '#bfe3f2'} transparent opacity={0.75} roughness={0.05} /></mesh>}
          {step >= 3 && <mesh position={[0, 0.026, 0.25]} rotation-x={-Math.PI / 2}><planeGeometry args={[step >= 4 ? 0.09 : 0.06, step >= 4 ? 0.09 : 0.05]} /><meshStandardMaterial color={sample === 'onion' ? '#f2ead0' : '#f3d9c9'} side={2} /></mesh>}
          {step >= 5 && <mesh position={[0, 0.036, 0.25]}><boxGeometry args={[0.2, 0.006, 0.2]} /><meshStandardMaterial color="#eef8fa" transparent opacity={0.45} roughness={0.05} /></mesh>}
          {/* 用具：纱布、滴瓶、碘液瓶、镊子、半个洋葱 */}
          <mesh position={[-0.7, 0.01, 0.2]}><boxGeometry args={[0.3, 0.02, 0.3]} /><meshStandardMaterial color="#f4f4ee" roughness={1} /></mesh>
          {[[0.55, '#bfe3f2'], [0.85, '#6b3b1c']].map(([x, c], i) => <group key={i} position={[x as number, 0, -0.1]}><mesh position={[0, 0.09, 0]} castShadow><cylinderGeometry args={[0.055, 0.06, 0.18, 16]} /><meshStandardMaterial color={c as string} transparent opacity={0.8} roughness={0.2} /></mesh><mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.015, 0.025, 0.09, 10]} /><meshStandardMaterial color="#1c1c1c" /></mesh></group>)}
          <mesh position={[-0.35, 0.012, -0.15]} rotation-y={0.5}><boxGeometry args={[0.32, 0.012, 0.02]} /><meshStandardMaterial color="#c9ced2" metalness={0.8} roughness={0.3} /></mesh>
          {sample === 'onion' && <mesh position={[-0.75, 0.1, -0.25]} scale={[1, 0.8, 1]} castShadow><sphereGeometry args={[0.14, 20, 14, 0, Math.PI]} /><meshStandardMaterial color="#a8497a" roughness={0.6} side={2} /></mesh>}
        </group>
      </LabStage>}
      lesson={<LessonBlock no="4" title="做一张临时装片" concept="擦、滴、取、展、盖、染" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ol className="flex flex-col gap-1.5 text-[14px] text-white/80">{SLIDE.map((s, i) => <li key={s.key}><b className="text-[#7fe3d4]">{s.name}：</b>{does(i)}。{s.why}</li>)}</ol>
          <p className="mt-3">两种材料只有一处不同：洋葱表皮滴<b className="text-white">清水</b>，口腔上皮细胞滴<b className="text-white">生理盐水</b>。{SAMPLES.cheek.why}。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两张装片都做好了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">步骤一样，只有滴的液体不一样</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">植物细胞有细胞壁，用清水；动物细胞没有，要用生理盐水才不会涨破。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SAMPLES[sample].name}</div>
            <div className="mt-1 text-[26px] leading-none font-bold tracking-tight text-[#7fe3d4]">{done ? '装片做好了' : step ? `做到“${SLIDE[step - 1].name}”` : '还没开始'}</div>
          </div>
          {done && <View mode="sharp" row={6} animal={sample === 'cheek'} />}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="滴的液体" value={SAMPLES[sample].liquid} unit="保持细胞的形状" />
            <ParamTile symbol="染色" value="碘液" unit="把细胞核染深" />
          </div>
          {step > 0 && <ol className="mt-4 flex flex-col gap-1.5 text-[13.5px]">{SLIDE.slice(0, step).map((s, i) => <li key={s.key} className="row-in rounded-xl bg-white/6 px-3 py-2"><b className="text-white">{s.name}</b><span className="ml-2 text-white/65">{does(i)}</span></li>)}</ol>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'go'} onClick={go} disabled={done}>{todo ? `下一步：${todo.name}` : '六步做完了'}</LabButton></>}
      extras={<Control label="材料"><Segmented label="材料" pulse={next === 'sample'} want={next === 'sample' ? task!.id as SampleKey : null} value={sample} onChange={pick} options={KEYS.map(k => ({ value: k, label: k === 'onion' ? '洋葱表皮' : '口腔上皮细胞' }))} /></Control>}
    />
  )
}
