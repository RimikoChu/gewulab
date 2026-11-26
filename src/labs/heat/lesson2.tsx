// 内能和热机 · 第 2 课 分子间的作用力：两块铅柱的断面对齐压紧，下面挂钩码也拉不开（引力）；
// 推装空气和装水的注射器，空气容易压缩，水几乎压不动（斥力）。
import { useEffect, useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, Rod, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Boss, HOOK_H, HookWeight, Lead, STAND, Stand, SYR, Syringe } from './gear'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Done, Glove, H2 } from './parts'
import { HOOKS, SYRINGE, syringe, type Fill } from './physics'
import { VOICE } from './voice'
import { BZ, Room, ST, TOP } from './world'

const TASKS: Task[] = [
  { id: 'press', text: '把两块铅柱的断面对齐，用力压紧', note: '两块铅柱粘在了一起' },
  { id: 'hook', text: '下面挂上钩码，看铅柱分不分开', note: `挂了 ${HOOKS.n} 个钩码也没分开：分子之间有引力` },
  { id: 'air', text: '推装空气的注射器的活塞', note: '空气很容易被压缩' },
  { id: 'water', text: '换成装水的注射器，再推', note: '水几乎压不动：分子之间有斥力' },
]
const X = ST.s2, Z = BZ + 0.2
const ARM = TOP + 2.7, HX = X - 0.15                     // 吊钩在多高、在哪
const TOPLEAD = ARM - 0.47                                 // 上面那块铅柱的下端面
const REST = TOP + 1.38                                    // 下面那块铅柱先放在一个木垫块上
const SX = X + 0.45, SY = TOP + 0.36                       // 注射器针头那一端
const SZ: Record<Fill, number> = { air: Z + 0.75, water: Z + 0.25 }

export default function Lesson2() {
  const [stage, setStage] = useState<'apart' | 'pressing' | 'stuck'>('apart')
  const [hooks, setHooks] = useState(0)
  const [hanging, setHanging] = useState(false)
  const [fill, setFill] = useState<Fill>('air')
  const [pushed, setPushed] = useState<Record<Fill, boolean>>({ air: false, water: false })
  const T = useTasks('gewu:heat:2', TASKS)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (f: () => void, ms: number) => { timers.current.push(window.setTimeout(f, ms)) }
  // 下面那块铅柱：放在台上 → 举到上面那块的下面压紧（压的时候拧一下） → 松手，吊在上面
  const up = useSlide(stage === 'apart' ? 0 : 1, 0.9)
  const twist = stage === 'pressing' && up > 0.99 ? 1 : 0, tw = useSlide(twist, 2.4)
  const push = useSlide(pushed[fill] ? syringe(fill) : 0, fill === 'air' ? 0.45 : 0.05)
  const done = (f: Fill) => pushed[f] && Math.abs(push - syringe(f)) < 0.002 && fill === f
  useEffect(() => { T.check(id => id === 'press' ? stage === 'stuck' : id === 'hook' ? hooks >= HOOKS.n && !hanging : id === 'air' ? done('air') : done('water')) })
  const press = () => { if (stage !== 'apart') return; setStage('pressing'); later(() => setStage('stuck'), 2600) }
  const hang = () => {
    if (stage !== 'stuck' || hanging || hooks >= HOOKS.n) return
    setHanging(true)
    for (let k = 1; k <= HOOKS.n; k++) later(() => { setHooks(k); if (k === HOOKS.n) later(() => setHanging(false), 700) }, k * 900)
  }
  const resetAll = () => { timers.current.forEach(clearTimeout); timers.current = []; setStage('apart'); setHooks(0); setHanging(false); setFill('air'); setPushed({ air: false, water: false }); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'press' | 'hang' | 'push' | 'fill' | null } = (() => {
    if (!task) return { hint: '分子之间既有引力，又有斥力。', next: null }
    if (task.id === 'press') return stage === 'apart' ? { hint: '两块铅柱的断面都刮得很干净。按“压紧铅柱”', next: 'press' } : { hint: '对齐、压紧，再拧一拧…', next: null }
    if (task.id === 'hook') return hanging || hooks > 0 ? { hint: `挂上第 ${hooks} 个钩码了…`, next: null } : { hint: '松开手，下面那块铅柱没有掉。按“挂上钩码”', next: 'hang' }
    if (task.id === 'air') return fill !== 'air' ? { hint: '换到装空气的注射器', next: 'fill' } : pushed.air ? { hint: '活塞往里走…', next: null } : { hint: '注射器的口用橡皮帽堵住了，里面是空气。按“推活塞”', next: 'push' }
    return fill !== 'water' ? { hint: '换到装水的注射器', next: 'fill' } : pushed.water ? { hint: '用同样的力推…', next: null } : { hint: '这一支里装满了水，口也堵住了。按“推活塞”', next: 'push' }
  })()
  // 下面那块铅柱的位置：台上 → 上面那块的下方
  const lx = X + 0.7 + (HX - X - 0.7) * Math.min(1, up * 1.6), ly = REST + (TOPLEAD - REST) * up
  const hand = stage === 'pressing' ? 1 : 0
  const eye = ly - 0.4 - 0.05                                  // 下面那块的吊环底
  const labels: Label[] = [
    { id: 'k', at: [HX + 0.25, eye - HOOKS.n * (HOOK_H + 0.02) / 2, Z], className: 'scene-tag key -translate-y-1/2', style: { opacity: hooks ? 1 : 0 }, children: <><small>钩码</small>{hooks} 个</> },
    { id: 'p', at: [SX + SYR.len * 0.5, SY + 0.2, SZ[fill]], ax: 0.5, className: 'scene-tag -translate-y-full', style: { opacity: pushed[fill] ? 1 : 0 }, children: <><small>{SYRINGE[fill].name}</small>推进 {Math.round(push * 100)}%</> },
    { id: 'n1', at: [HX - 0.2, TOPLEAD + 0.2, Z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '铅柱' },
    { id: 'n2', at: [X - 0.95, TOP + 1.8, Z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '铁架台' },
    { id: 'n3', at: [SX - 0.1, SY, SZ.air + 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '注射器' },
  ]
  return (
    <LabShell title="内能和热机" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="操作"
      stage={<Room at={task && (task.id === 'air' || task.id === 'water') ? 's2s' : 's2'} labels={labels}>
        <Stand at={[X - 0.2, TOP, Z]} h={2.95}>
          <Boss y={ARM - TOP} />
          <Rod from={[STAND.rodX + 0.1, ARM - TOP, 0]} to={[HX - X + 0.2 + 0.25, ARM - TOP, 0]} r={0.03}><Metal kind="steel" grain="turned" /></Rod>
        </Stand>
        {/* 横杆上的 S 形挂钩 */}
        <mesh position={[HX, ARM - 0.02, Z]} rotation-y={Math.PI / 2}><torusGeometry args={[0.05, 0.012, 8, 20, Math.PI * 1.4]} /><Metal kind="steel" /></mesh>
        <Lead at={[HX, TOPLEAD, Z]} />
        <group position={[lx, ly, Z]} rotation-y={tw * 0.6}><Lead at={[0, 0, 0]} flip /></group>
        {hand > 0 && <group position={[lx, ly - 0.25, Z + 0.05]} rotation={[0, 0, Math.PI]} scale={0.9}><Glove /></group>}
        {Array.from({ length: hooks }, (_, k) => <HookWeight key={k} at={[HX, eye - k * (HOOK_H + 0.02), Z]} />)}
        {hanging && hooks < HOOKS.n && <group position={[HX + 0.05, eye - hooks * (HOOK_H + 0.02) + 0.05, Z + 0.08]} rotation-z={Math.PI * 0.5} scale={0.8}><Glove /></group>}
        {/* 放铅柱的木垫块 */}
        <RoundedBox args={[0.6, 0.9, 0.6]} radius={0.03} smoothness={2} position={[X + 0.7, TOP + 0.45, Z]} castShadow receiveShadow><meshStandardMaterial color="#9c7a52" roughness={0.75} /></RoundedBox>
        {/* 钩码盒 */}
        <RoundedBox args={[0.9, 0.25, 0.5]} radius={0.03} smoothness={2} position={[X - 1.1, TOP + 0.125, Z + 0.55]} castShadow receiveShadow><meshStandardMaterial color="#6b4a2e" roughness={0.7} /></RoundedBox>
        {/* 注射器放在一块木托上 */}
        <RoundedBox args={[1.5, 0.2, 1.0]} radius={0.03} smoothness={2} position={[SX + 0.6, TOP + 0.1, Z + 0.5]} castShadow receiveShadow><meshStandardMaterial color="#b58a5a" roughness={0.75} /></RoundedBox>
        {(['air', 'water'] as Fill[]).map(f => <Syringe key={f} at={[SX, SY, SZ[f]]} fill={f} push={f === fill ? push : 0} />)}
        {pushed[fill] && <group position={[SX + (SYR.len - (SYR.len - 0.08) * push) + SYR.len + 0.32, SY, SZ[fill]]} rotation={[0, 0.7, -Math.PI / 2]} scale={0.7}><Glove sleeve={0.45} /></group>}
      </Room>}
      lesson={<LessonBlock no="2" title="分子间的作用力" concept="分子之间既有引力，又有斥力" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>两块铅柱的断面刮干净、紧紧压在一起，断面上的分子靠得很近，分子之间的<b className="text-white">引力</b>把两块铅柱粘在一起，下面挂上钩码也拉不开。</p>
          <p className="mt-3">固体和液体很难被压缩，是因为分子靠得更近时，分子之间表现为<b className="text-white">斥力</b>。气体分子之间的距离很大，作用力很小，所以气体容易被压缩。</p>
          <p className="mt-3 text-[13.5px] text-white/65">分子之间的引力和斥力是同时存在的。</p>
        </>} />}
      finale={T.finale && <Done head="四件事都做完了" title="分子之间既有引力，又有斥力" onClose={() => T.setFinale(false)}>压紧的铅柱挂上钩码也不分开，是分子之间的引力；水几乎压不动，是分子靠近时的斥力。空气分子之间离得远，所以容易压缩。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="铅柱" value={stage === 'stuck' ? '粘住了' : stage === 'pressing' ? '压紧中' : '分开'} unit="两块铅柱" />
            <ParamTile symbol="钩码" value={`${hooks} 个`} unit={`每个 ${HOOKS.mass * 1000} g`} />
          </div>
          <H2>同样用力推活塞，推进去多少</H2>
          {(['air', 'water'] as Fill[]).map(f => <div key={f} className="mt-2">
            <div className="flex justify-between text-[13.5px]"><span>装{SYRINGE[f].name}</span><span className="tabular-nums text-white/70">{pushed[f] ? `${Math.round((f === fill ? push : syringe(f)) * 100)}%` : '—'}</span></div>
            <div className="mt-1 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-[#7fb8ff]" style={{ width: `${(pushed[f] ? (f === fill ? push : syringe(f)) : 0) * 100}%` }} /></div>
          </div>)}
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">气体分子之间距离大，容易压缩；液体分子挨得很近，再靠近就互相排斥。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'press'} pulse={next === 'press'} onClick={press} disabled={stage !== 'apart'}>压紧铅柱</LabButton>
        <LabButton pulse={next === 'hang'} onClick={hang} disabled={stage !== 'stuck' || hanging || hooks >= HOOKS.n}>挂上钩码</LabButton>
        <LabButton pulse={next === 'push'} onClick={() => setPushed(p => ({ ...p, [fill]: true }))} disabled={pushed[fill] || !T.done.hook}>推活塞</LabButton>
      </>}
      extras={
        <Control label="注射器里">
          <Segmented label="注射器里" pulse={next === 'fill'} want={next === 'fill' ? (task?.id as Fill) : null} value={fill} onChange={k => setFill(k as Fill)} options={[{ value: 'air', label: '空气' }, { value: 'water', label: '水' }]} />
        </Control>
      }
    />
  )
}
