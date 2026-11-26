// 内能和热机 · 第 5 课 热量的计算：测试间甲里，发动机带着散热器在台架上运转。启动后冷却液（水）从 20 ℃ 升到 90 ℃，
// 算它吸了多少热；熄火冷却到 40 ℃，算放了多少热；换成 10 kg 冷却液再来一次，看质量加倍、吸热加倍。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { RoundedBox } from '@react-three/drei'
import { Led, Metal, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Calc, Done, H2, useRun } from './parts'
import { C_WATER, COOL, COOL_SEC, WARM_SEC, absorbed, coolT, released, sci, warmT, type Mass } from './physics'
import { VOICE } from './voice'
import { BAY_Z, Room, ST } from './world'

const TASKS: Task[] = [
  { id: 'warm', text: `启动发动机，等 5 kg 冷却液升到 ${COOL.hot} ℃`, note: `吸热 Q吸 = ${sci(absorbed(5, COOL.start, COOL.hot))} J` },
  { id: 'cool', text: `熄火，等冷却液降到 ${COOL.cold} ℃`, note: `放热 Q放 = ${sci(released(5, COOL.hot, COOL.cold))} J` },
  { id: 'big', text: '换成 10 kg 冷却液，再启动一次', note: `质量加倍，吸热也加倍：${sci(absorbed(10, COOL.start, COOL.hot))} J` },
]
const X = ST.s5, Z = BAY_Z
type Phase = 'cold' | 'warm' | 'hot' | 'cool' | 'done'

export default function Lesson5() {
  const [mass, setMass] = useState<Mass>('5')
  const [phase, setPhase] = useState<Phase>('cold')
  const [tw, setTw] = useRun(phase === 'warm', 1, WARM_SEC)
  const [tc, setTc] = useRun(phase === 'cool', 1, COOL_SEC)
  const T = useTasks('gewu:heat:5', TASKS)
  const m = +mass
  const temp = phase === 'warm' || phase === 'hot' ? warmT(tw) : phase === 'cool' || phase === 'done' ? coolT(tc) : COOL.start
  useEffect(() => { if (phase === 'warm' && tw >= WARM_SEC) setPhase('hot'); if (phase === 'cool' && tc >= COOL_SEC) setPhase('done') }, [phase, tw, tc])
  useEffect(() => { T.check(id => id === 'warm' ? m === 5 && (phase === 'hot' || phase === 'cool' || phase === 'done') : id === 'cool' ? m === 5 && phase === 'done' : m === 10 && phase === 'hot') })
  const start = () => { if (phase !== 'cold') return; setTw(0); setPhase('warm') }
  const stop = () => { if (phase !== 'hot') return; setTc(0); setPhase('cool') }
  const switchMass = (k: Mass) => { if (phase === 'warm' || phase === 'cool') return; setMass(k); setPhase('cold'); setTw(0); setTc(0) }
  const resetAll = () => { setMass('5'); setPhase('cold'); setTw(0); setTc(0); T.reset() }
  const running = phase === 'warm' || phase === 'hot'
  const task = T.current
  const { hint, next }: { hint: string; next: 'start' | 'stop' | 'mass' | null } = (() => {
    if (!task) return { hint: '物体吸收或放出的热量 Q = c m Δt，Δt 是温度变化了多少。', next: null }
    if (task.id === 'warm') return phase === 'cold' ? { hint: `冷却液 5 kg，现在 ${COOL.start} ℃。按“启动发动机”`, next: 'start' } : { hint: '发动机在运转，冷却液在吸热，温度往上升…', next: null }
    if (task.id === 'cool') return phase === 'hot' ? { hint: `冷却液升到 ${COOL.hot} ℃ 了，升高了 ${COOL.hot - COOL.start} ℃。按“熄火”`, next: 'stop' } : { hint: '熄火了，冷却液在放热，温度往下降…', next: null }
    if (m !== 10) return { hint: '把冷却液换成 10 kg', next: 'mass' }
    return phase === 'cold' ? { hint: `换上了 10 kg 冷却液，也是 ${COOL.start} ℃。按“启动发动机”`, next: 'start' } : { hint: '同样升到 90 ℃，看吸热是多少…', next: null }
  })()
  const hot = running ? 0.25 + 0.75 * (temp - COOL.start) / (COOL.hot - COOL.start) : Math.max(0, (temp - COOL.start) / (COOL.hot - COOL.start) - 0.3)
  const labels: Label[] = [
    { id: 't', at: [X - 4.6, 8.6, Z + 4.2], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>冷却液</small>{temp.toFixed(1)} ℃</> },
    { id: 'n1', at: [X - 7.4, 5.4, Z + 3.6], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '散热器' },
    { id: 'n2', at: [X - 4.4, 9.2, Z - 1.0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '膨胀水箱' },
    { id: 'n3', at: [X - 4.6, 8.6, Z + 1.0], name: true, className: 'scene-name -translate-y-full', children: '冷却液管' },
    { id: 'n4', at: [X + 0.6, 4.4, Z + 3.0], name: true, className: 'scene-name', children: '排气管' },
    { id: 'n5', at: [X + 8.6, 8.0, Z + 0.5], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '测功机' },
  ]
  const Qa = absorbed(m, COOL.start, Math.min(temp, COOL.hot))
  return (
    <LabShell title="内能和热机" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="发动机"
      stage={<Room at="s5" labels={labels} bloom={0.55} bayA={{ run: running ? 1 : 0, hot }}>
        {/* 台架边上立着的水温表 */}
        <group position={[X - 4.6, 0, Z + 4.2]} rotation-y={-0.2}>
          <mesh position={[0, 3.6, 0]} castShadow><cylinderGeometry args={[0.12, 0.12, 7.2, 16]} /><Metal kind="steel" grain="brushed" /></mesh>
          <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.7, 0.8, 0.12, 32]} /><Metal kind="iron" grain="cast" /></mesh>
          <RoundedBox args={[2.4, 1.3, 0.5]} radius={0.06} smoothness={2} position={[0, 7.8, 0]} castShadow><meshPhysicalMaterial color="#d0d3d0" roughness={0.45} clearcoat={0.3} /></RoundedBox>
          <mesh position={[0, 7.8, 0.251]}><planeGeometry args={[2.2, 1.1]} /><meshStandardMaterial color="#20262b" roughness={0.5} /></mesh>
          <Led text={temp.toFixed(1)} w={1.7} h={0.68} position={[-0.1, 7.8, 0.253]} />
          <mesh position={[0.95, 7.8, 0.253]}><circleGeometry args={[0.1, 16]} /><meshBasicMaterial color={running ? '#5cff8a' : '#1d3a26'} toneMapped={false} /></mesh>
        </group>
      </Room>}
      lesson={<LessonBlock no="5" title="热量的计算" concept="热量 Q = c m Δt" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物体温度升高时吸收的热量和温度降低时放出的热量：</p>
          <p className="mt-2 font-formula text-[17px] italic">Q吸 = c m (t − t₀)</p>
          <p className="mt-1 font-formula text-[17px] italic">Q放 = c m (t₀ − t)</p>
          <p className="mt-3">t₀ 是初温，t 是末温。“升高了 70 ℃”是 Δt = 70 ℃；“升高到 90 ℃”是末温 t = 90 ℃，两者不要弄混。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里的冷却液按水算，比热容取 4.2×10³ J/(kg·℃)。冷却液在发动机里吸了热，流到散热器里再把热放给空气。</p>
        </>} />}
      finale={T.finale && <Done head="三步都做完了" title="热量 Q = c m Δt" onClose={() => T.setFinale(false)}>5 kg 冷却液升高 {COOL.hot - COOL.start} ℃ 吸热 {sci(absorbed(5, COOL.start, COOL.hot))} J，降低 {COOL.hot - COOL.cold} ℃ 放热 {sci(released(5, COOL.hot, COOL.cold))} J；换成 10 kg，同样升高 {COOL.hot - COOL.start} ℃ 吸热 {sci(absorbed(10, COOL.start, COOL.hot))} J。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <Big label="冷却液的温度" value={temp.toFixed(1)} unit="℃" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="c" value="4.2×10³" unit="J/(kg·℃)" />
            <ParamTile symbol="m" value={`${m}`} unit="kg" />
            <ParamTile symbol="t₀" value={`${COOL.start}`} unit="℃ · 初温" />
          </div>
          <H2>吸热（启动以后）</H2>
          <Calc on={phase !== 'cold'} f={<>Q吸 = {C_WATER / 1000}×10³ × {m} × ({Math.min(temp, COOL.hot).toFixed(0)} − {COOL.start})</>} v={phase !== 'cold' ? `${sci(Qa)} J` : '—'} />
          <H2>放热（熄火以后）</H2>
          <Calc on={phase === 'cool' || phase === 'done'} f={<>Q放 = {C_WATER / 1000}×10³ × {m} × ({COOL.hot} − {(phase === 'cool' || phase === 'done' ? temp : COOL.hot).toFixed(0)})</>} v={phase === 'cool' || phase === 'done' ? `${sci(released(m, COOL.hot, temp))} J` : '—'} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'start'} pulse={next === 'start'} onClick={start} disabled={phase !== 'cold'}>启动发动机</LabButton>
        <LabButton pulse={next === 'stop'} onClick={stop} disabled={phase !== 'hot'}>熄火</LabButton>
      </>}
      extras={
        <Control label="冷却液">
          <Segmented label="冷却液" pulse={next === 'mass'} want={next === 'mass' ? '10' : null} disabled={phase === 'warm' || phase === 'cool'} value={mass} onChange={k => switchMass(k as Mass)} options={[{ value: '5', label: '5 kg' }, { value: '10', label: '10 kg' }]} />
        </Control>
      }
    />
  )
}
