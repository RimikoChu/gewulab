// 内能和热机 · 第 7 课 热值和热机效率：测试间乙里，发动机连着测功机运转，把燃料秤上的 0.1 kg 汽油烧完。
// 用热值算出汽油放了多少热；读测功机得到有用功，算效率；再看其余的能量去了哪里。
import { useEffect, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Led, Metal, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Beaker, Cable } from './gear'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Calc, Done, H2, useRun } from './parts'
import { FLOW, Q_PETROL, RUN, efficiency, fuelLeft, fuelQ, sci } from './physics'
import { FlowView } from './views'
import { VOICE } from './voice'
import { BAY_Z, Room, ST } from './world'

const QFUEL = fuelQ(RUN.fuel, Q_PETROL), ETA = efficiency(RUN.work, QFUEL)
const TASKS: Task[] = [
  { id: 'burn', text: `启动发动机，烧完 ${RUN.fuel} kg 汽油，算出放了多少热`, note: `Q放 = m q = ${sci(QFUEL)} J` },
  { id: 'eta', text: '读测功机，算出发动机的效率', note: `η = W有 ⁄ Q放 = ${Math.round(ETA * 100)}%` },
  { id: 'flow', text: '看一看其余的能量去了哪里', note: '大部分被废气和冷却液带走了' },
]
const X = ST.s7, Z = BAY_Z
const FX = X - 4.2, FZ = Z + 5.4, TABLE = 7.6
const FLOW_SEC = 1.1

export default function Lesson7() {
  const [run, setRun] = useState(false)
  const [t, setT] = useRun(run, 1, RUN.sec)
  const [eta, setEta] = useState(false)
  const [flow, setFlow] = useState(false)
  const [tf, setTf] = useRun(flow, 1, FLOW_SEC * FLOW.length + 0.5)
  const T = useTasks('gewu:heat:7', TASKS)
  const burnt = t >= RUN.sec - 1e-6
  const shown = flow ? Math.min(FLOW.length, Math.floor(tf / FLOW_SEC) + 1) : 0
  useEffect(() => { T.check(id => id === 'burn' ? burnt : id === 'eta' ? eta : shown >= FLOW.length && tf >= FLOW_SEC * FLOW.length) })
  const resetAll = () => { setRun(false); setT(0); setEta(false); setFlow(false); setTf(0); T.reset() }
  const left = fuelLeft(t), work = RUN.work * Math.min(1, t / RUN.sec)
  const running = run && !burnt
  const task = T.current
  const { hint, next }: { hint: string; next: 'run' | 'eta' | 'flow' | null } = (() => {
    if (!task) return { hint: '燃料放出的热，只有一部分变成了有用功。', next: null }
    if (task.id === 'burn') return !run ? { hint: `燃料秤上有 ${RUN.fuel} kg 汽油。按“启动发动机”`, next: 'run' } : { hint: '发动机在运转，燃料秤上的汽油越来越少…', next: null }
    if (task.id === 'eta') return { hint: `汽油烧完了，测功机记下有用功 ${sci(RUN.work)} J。按“算效率”`, next: 'eta' }
    return !flow ? { hint: '按“看能量去向”', next: 'flow' } : { hint: '一份一份地看…', next: null }
  })()
  const glow = running ? 0.85 : burnt ? 0.3 : 0
  const hl = (k: string) => flow && FLOW.findIndex(f => f.key === k) < shown
  const labels: Label[] = [
    { id: 'f', at: [FX + 0.6, TABLE + 1.3, FZ], className: 'scene-tag key -translate-y-1/2', children: <><small>汽油</small>{left.toFixed(3)} kg</> },
    { id: 'w', at: [X + 6.0, 9.4, Z - 5.0], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>有用功</small>{sci(work)} J</> },
    { id: 'e1', at: [X + 2.9, 2.2, Z + 2.8], className: 'scene-tag -translate-y-1/2', style: { opacity: hl('exhaust') ? 1 : 0 }, children: <><small>废气带走</small>{Math.round(FLOW[0].share * 100)}%</> },
    { id: 'e2', at: [X - 3.2, 8.8, Z + 0.9], ax: 1, className: 'scene-tag -translate-y-1/2', style: { opacity: hl('cool') ? 1 : 0 }, children: <><small>冷却液带走</small>{Math.round(FLOW[1].share * 100)}%</> },
    { id: 'e3', at: [X - 3.3, 5.2, Z + 1.2], ax: 1, className: 'scene-tag -translate-y-1/2', style: { opacity: hl('loss') ? 1 : 0 }, children: <><small>摩擦和其他</small>{Math.round(FLOW[2].share * 100)}%</> },
    { id: 'e4', at: [X + 4.6, 6.8, Z + 1.2], ax: 0.5, className: 'scene-tag key -translate-y-full', style: { opacity: hl('work') ? 1 : 0 }, children: <><small>有用功</small>{Math.round(FLOW[3].share * 100)}%</> },
    { id: 'n1', at: [FX - 0.6, TABLE + 0.4, FZ + 0.4], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '燃料秤' },
    { id: 'n2', at: [X + 8.6, 2.4, Z + 2.0], name: true, className: 'scene-name', children: '测功机' },
  ]
  return (
    <LabShell title="内能和热机" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="发动机"
      stage={<Room at="s7" labels={labels} bloom={0.55} bayB={{ run: running ? 1 : 0, hot: glow }}>
        {/* 燃料秤：钢桌上一台电子秤，秤盘上一只烧杯，汽油从这里经一根油管送到发动机 */}
        <group position={[FX, 0, FZ]}>
          {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 1.0, TABLE / 2, sz * 0.7]} castShadow><boxGeometry args={[0.2, TABLE, 0.2]} /><meshStandardMaterial color="#a9aeb1" metalness={0.6} roughness={0.35} /></mesh>))}
          <RoundedBox args={[2.4, 0.12, 1.8]} radius={0.03} smoothness={2} position={[0, TABLE - 0.06, 0]} castShadow receiveShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
          <RoundedBox args={[1.3, 0.3, 1.1]} radius={0.05} smoothness={2} position={[0, TABLE + 0.15, 0]} castShadow><meshPhysicalMaterial color="#e3e5e2" roughness={0.4} clearcoat={0.4} /></RoundedBox>
          <mesh position={[0, TABLE + 0.32, -0.08]}><cylinderGeometry args={[0.48, 0.48, 0.04, 40]} /><Metal kind="stainless" grain="turned" /></mesh>
          <mesh position={[0, TABLE + 0.16, 0.551]}><planeGeometry args={[0.9, 0.2]} /><meshStandardMaterial color="#20262b" /></mesh>
          <Led text={left.toFixed(3)} w={0.5} h={0.16} position={[-0.15, TABLE + 0.16, 0.553]} />
          <Beaker at={[0, TABLE + 0.34, -0.08]} level={0.38 * left / RUN.fuel} color="#e8c85a" o={0.35} />
        </group>
        <Cable a={[FX, TABLE + 1.2, FZ - 0.08]} b={[X - 1.0, 8.6, Z - 1.0]} sag={0.6} r={0.03} />
        {/* 测功机旁的控制台：显示累计的有用功（MJ） */}
        <group position={[X + 6.0, 0, Z - 5.2]} rotation-y={-0.2}>
          <RoundedBox args={[3.0, 8.4, 1.5]} radius={0.06} smoothness={2} position={[0, 4.2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#c9ccc9" roughness={0.5} clearcoat={0.3} /></RoundedBox>
          <mesh position={[0, 6.5, 0.76]}><planeGeometry args={[2.5, 1.6]} /><meshStandardMaterial color="#20262b" roughness={0.5} /></mesh>
          <Led text={(work / 1e6).toFixed(2)} w={1.9} h={0.75} position={[0, 6.6, 0.77]} />
          <mesh position={[0, 5.1, 0.77]}><circleGeometry args={[0.18, 20]} /><meshBasicMaterial color={running ? '#5cff8a' : '#1d3a26'} toneMapped={false} /></mesh>
        </group>
      </Room>}
      lesson={<LessonBlock no="7" title="热值和热机效率" concept="燃料放出的热只有一部分变成有用功" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>某种燃料完全燃烧放出的热量与其质量之比，叫做这种燃料的<b className="text-white">热值</b>，用 q 表示，单位是 J/kg。汽油的热值是 4.6×10⁷ J/kg。</p>
          <p className="mt-2 font-formula text-[17px] italic">Q放 = m q</p>
          <p className="mt-3">热机里，用来做有用功的那部分能量与燃料完全燃烧放出的能量之比，叫做<b className="text-white">热机的效率</b>。</p>
          <p className="mt-2 font-formula text-[17px] italic">η = W有 ⁄ Q放</p>
          <p className="mt-3 text-[13.5px] text-white/65">废气带走、冷却液带走、摩擦损失的能量都没有变成有用功，所以热机的效率总是小于 1。热值是燃料本身的一种特性，和燃料的质量、是否燃烧完全无关。</p>
        </>} />}
      finale={T.finale && <Done head="三件事都做完了" title="燃料放出的热只有一部分变成有用功" onClose={() => T.setFinale(false)}>{RUN.fuel} kg 汽油完全燃烧放热 {sci(QFUEL)} J，发动机只做了 {sci(RUN.work)} J 的有用功，效率 {Math.round(ETA * 100)}%。其余的能量被废气、冷却液带走，或者在摩擦中损失了。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <ParamTile symbol="m" value={`${RUN.fuel}`} unit="kg · 汽油" />
            <ParamTile symbol="q" value="4.6×10⁷" unit="J/kg" />
            <ParamTile symbol="W有" value={burnt ? sci(RUN.work) : '—'} unit="J · 测功机" />
          </div>
          <Calc on={burnt} f={<>Q放 = m q</>} v={burnt ? `${sci(QFUEL)} J` : '—'} />
          <Calc on={eta} f={<>η = W有 ⁄ Q放</>} v={eta ? `${Math.round(ETA * 100)}%` : '—'} />
          <H2>能量去了哪里</H2>
          <FlowView shown={shown} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'run'} pulse={next === 'run'} onClick={() => setRun(true)} disabled={run}>启动发动机</LabButton>
        <LabButton pulse={next === 'eta'} onClick={() => setEta(true)} disabled={eta || !burnt}>算效率</LabButton>
        <LabButton pulse={next === 'flow'} onClick={() => setFlow(true)} disabled={flow || !eta}>看能量去向</LabButton>
      </>}
      extras={null}
    />
  )
}
