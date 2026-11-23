// 物态变化 · 第 2 课 熔化和凝固（水浴加热海波和石蜡：晶体有熔点，非晶体没有；温度–时间图线；凝固放热）
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Micro } from './fx'
import { BEAKER, Beaker, Clamp, GAUZE_T, Gauze, Lamp, Liquid, Ring, STAND, Stand, Stopwatch, TUBE, Thermo, Tube, thermoY } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Done, H2, Room, useRun } from './parts'
import { BATH, HYPO_MELT, STUFF, coolT, heatT, hypoReach, liquidLeft, meltFrac, readT, samples, stateName, type Stuff } from './physics'
import { TChart, ThermoView } from './views'
import { ST, TOP } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS: Stuff[] = ['hypo', 'wax']
const TASKS: Task[] = [
  { id: 'h48', text: '点燃酒精灯给海波加热，看温度升到多少度停住', note: `到 ${HYPO_MELT} ℃ 海波开始熔化，温度停住不升` },
  { id: 'hup', text: '继续加热，直到海波全部熔化', note: `熔化用了 ${BATH.hold} 分钟，一直吸热，温度保持 ${HYPO_MELT} ℃；全部熔化后才又上升` },
  { id: 'cool', text: '熄灭酒精灯，让液态的海波冷却、凝固', note: `凝固时温度也停在 ${HYPO_MELT} ℃：凝固放热，凝固点和熔点相同` },
  { id: 'wax', text: '换成石蜡，再加热一次，比一比图线', note: '石蜡边吸热边变软，温度一直上升：没有固定的熔化温度' },
]
const X = ST.s2, Z = 0.3, CX = X + 0.12, RING = 0.86, CUP = TOP + RING + GAUZE_T
const TUBE_Y = CUP + BEAKER.floor + 0.09, FILL = 0.36, BULB = TUBE_Y + 0.05, LENS: [number, number, number] = [X + 1.42, TOP + 1.78, Z + 0.25]
const TONE: Record<Stuff, string> = { hypo: '#8fc8ff', wax: '#ffd27a' }, LINE: Record<Stuff | 'cool', string> = { hypo: '#ff9a6a', cool: '#7fb8ff', wax: '#ffd24a' }

/** 搅拌器：一根细铜丝，下头弯成一个圈套在温度计外面，加热时上下提拉 */
function Stirrer({ on }: { on: boolean }) {
  const g = useRef<THREE.Group>(null), k = useRef(0)
  useFrame(({ clock }, d) => { k.current += ((on ? 1 : 0) - k.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.4)); if (g.current) g.current.position.y = 0.13 + (0.5 + 0.5 * Math.sin(clock.elapsedTime * 4.2)) * 0.12 * k.current })
  const wire = <meshStandardMaterial color="#c98a5a" metalness={1} roughness={0.35} />
  return <group ref={g} position-y={0.13}>
    <mesh rotation-x={Math.PI / 2}><torusGeometry args={[0.052, 0.006, 6, 24]} />{wire}</mesh>
    <mesh position={[0.052, 0.62, 0]}><cylinderGeometry args={[0.006, 0.006, 1.24, 6]} />{wire}</mesh>
    <mesh position={[0.052, 1.27, 0]} rotation-y={Math.PI / 2}><torusGeometry args={[0.035, 0.006, 6, 18]} />{wire}</mesh>
  </group>
}

export default function Lesson2() {
  const [stuff, setStuff] = useState<Stuff>('hypo')
  const [mode, setMode] = useState<'idle' | 'heat' | 'cool'>('idle')
  const [kept, setKept] = useState<{ hypo?: number; cool?: number; wax?: number }>({})
  const [t, setT] = useRun(mode === 'heat', 1, BATH.total)
  const [tc, setTc] = useRun(mode === 'cool', 1, BATH.total)
  const T = useTasks('gewu:phase:2', TASKS)
  const lit = useSlide(mode === 'heat' ? 1 : 0, 2.5)
  const temp = mode === 'cool' ? coolT(tc) : heatT(stuff, t), f = mode === 'cool' ? liquidLeft(tc) : meltFrac(stuff, t)
  const heated = t >= BATH.total, cooled = tc >= BATH.total, busy = (mode === 'heat' && !heated) || (mode === 'cool' && !cooled)
  useEffect(() => { T.check(id => id === 'h48' ? stuff === 'hypo' && t >= hypoReach() + 1 : id === 'hup' ? stuff === 'hypo' && heated : id === 'cool' ? stuff === 'hypo' && mode === 'cool' && cooled : stuff === 'wax' && heated) })
  const pick = (s: Stuff) => { if (busy || s === stuff) return; setKept(k => ({ ...k, [stuff]: Math.max(t, k[stuff] ?? 0), ...(stuff === 'hypo' ? { cool: Math.max(tc, k.cool ?? 0) } : null) })); setStuff(s); setMode('idle'); setT(0); setTc(0) }
  const resetAll = () => { setStuff('hypo'); setMode('idle'); setKept({}); setT(0); setTc(0); T.reset() }
  const task = T.current, name = STUFF[stuff].name, need: Stuff = task?.id === 'wax' ? 'wax' : 'hypo'
  const { hint, next }: { hint: string; next: 'stuff' | 'on' | 'off' | null } = !task ? { hint: '海波是晶体，有固定的熔点；石蜡是非晶体，没有。', next: null }
    : busy ? { hint: mode === 'cool' ? (tc < hypoReach() ? '停止加热，液态的海波在降温…' : tc < hypoReach() + BATH.hold ? `到 ${HYPO_MELT} ℃ 了：海波开始凝固，放热，温度停住…` : '全部凝固了，温度继续下降…')
        : stuff === 'wax' ? '石蜡慢慢变软、变稀，温度一直在升…' : t < hypoReach() ? '海波还是固态，温度在上升…' : t < hypoReach() + BATH.hold ? `到 ${HYPO_MELT} ℃ 了：海波在熔化，一直吸热，温度却不升…` : '全部熔化成液态，温度又上升了…', next: null }
    : stuff !== need ? { hint: `把试管里的物质换成${STUFF[need].name}`, next: 'stuff' }
    : mode === 'idle' ? { hint: `试管里是${name}，水浴已经热到 ${BATH.start} ℃。按“点燃酒精灯”，每分钟记一个点`, next: 'on' }
    : task.id === 'cool' && mode === 'heat' ? { hint: '海波全部熔化了。按“熄灭酒精灯”，看它冷却时温度怎么变', next: 'off' }
    : { hint: '这一次做完了。', next: null }
  const tH = stuff === 'hypo' && (mode !== 'idle' || t > 0) ? t : kept.hypo ?? 0, tC = stuff === 'hypo' && mode === 'cool' ? tc : kept.cool ?? 0, tW = stuff === 'wax' ? t : kept.wax ?? 0
  const labels: Label[] = [
    { id: 't', at: [CX + 0.1, BULB + thermoY(temp), Z], className: 'scene-tag key -translate-y-1/2', children: <><small>{name}</small>{readT(temp)} ℃</> },
    { id: 'm', at: [LENS[0], LENS[1] + 0.56, LENS[2]], ax: 0.5, className: 'scene-name -translate-y-full', children: `放大看：${name}里的粒子` },
    { id: 'n1', at: [CX + 0.26, CUP + 0.2, Z + 0.2], name: true, className: 'scene-name', children: '水浴' },
    { id: 'n2', at: [CX - 0.02, TUBE_Y + TUBE.h + 0.42, Z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '搅拌器' },
    { id: 'n3', at: [CX + 0.11, TUBE_Y + 0.82, Z], name: true, className: 'scene-name -translate-y-1/2', children: `试管里装着${name}` },
  ]
  return (
    <LabShell title="物态变化" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="酒精灯"
      stage={<Room at="s2" labels={labels} bloom={0.35}>
        <Stand at={[X, TOP, Z]}>
          <Ring y={RING} />
          <Clamp y={TUBE_Y - TOP + 0.92} grip={TUBE.r} />
        </Stand>
        <Lamp at={[CX, TOP + STAND.baseH, Z]} lit={lit} capAt={[0.62, -STAND.baseH, 0.42]} />
        <Gauze at={[CX, TOP + RING, Z]} />
        <Beaker at={[CX, CUP, Z]} level={0.5} o={0.3} />
        <Tube at={[CX, TUBE_Y, Z]}>
          {/* 试管里的东西：熔化成的液体，和还没熔化、沉在下面的固体 */}
          <mesh position-y={0.03 + FILL / 2} renderOrder={2}><cylinderGeometry args={[TUBE.inR - 0.004, TUBE.inR - 0.02, FILL, 24]} /><Liquid color={stuff === 'hypo' ? '#9db6c4' : '#d9b45a'} o={0.2 + 0.25 * f} /></mesh>
          {f < 0.995 && <mesh position-y={0.03 + FILL * (stuff === 'hypo' ? 1 - f : 1) / 2} scale={[1, stuff === 'hypo' ? Math.max(0.02, 1 - f) : 1, 1]}><cylinderGeometry args={[TUBE.inR - 0.006, TUBE.inR - 0.024, FILL, 20]} /><meshStandardMaterial color={stuff === 'hypo' ? '#f1f3f1' : '#ead9a6'} roughness={0.95} transparent opacity={stuff === 'hypo' ? 1 : 1 - f} /></mesh>}
          <Stirrer on={busy} />
        </Tube>
        <Thermo at={[CX, BULB, Z]} T={temp} />
        <Micro at={LENS} from={[CX + 0.07, TUBE_Y + 0.22, Z + 0.05]} liquid={f} gas={0} loose={stuff === 'wax'} tone={TONE[stuff]} />
        <Stopwatch at={[X - 0.95, TOP, Z + 0.8]} turn={(t + tc) / 60} />
      </Room>}
      lesson={<LessonBlock no="2" title="熔化和凝固" concept="晶体熔化时吸热，温度保持不变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物质从固态变成液态叫<b className="text-white">熔化</b>，从液态变成固态叫<b className="text-white">凝固</b>。熔化吸热，凝固放热。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">晶体</b>（海波、冰、各种金属）：熔化时温度保持不变，这个温度叫熔点。海波的熔点是 {HYPO_MELT} ℃</li>
            <li><b className="text-white">非晶体</b>（石蜡、松香、玻璃、沥青）：没有固定的熔化温度，边吸热边变软、变稀</li>
            <li>同一种晶体的凝固点和它的熔点相同</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">把试管泡在水里加热（水浴），是为了让里面的物质受热均匀、温度升得慢，便于记录。放大镜里的粒子是示意：晶体里粒子排列得整齐，非晶体里不整齐。</p>
        </>} />}
      finale={T.finale && <Done head="三条图线都画出来了" title="晶体有熔点，非晶体没有" onClose={() => T.setFinale(false)}>海波熔化和凝固时温度都停在 {HYPO_MELT} ℃，图线上有一段水平线；石蜡的图线一路上升。熔化吸热，凝固放热。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">温度计</h2>
          <ThermoView T={temp} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="t" value={`${Math.floor((mode === 'cool' ? tc : t) + 1e-6)} min`} unit={mode === 'cool' ? '停止加热以后' : '开始加热以后'} />
            <ParamTile symbol="状态" value={stateName(stuff, f)} unit={name} />
          </div>
          <H2>温度–时间图</H2>
          <TChart tmax={BATH.total} lo={38} hi={58} step={4} mark={{ T: HYPO_MELT, text: `${HYPO_MELT} ℃` }} series={[
            { name: '海波加热', color: LINE.hypo, pts: tH > 0 || (stuff === 'hypo' && mode !== 'idle') ? samples(m => heatT('hypo', m), tH) : [], live: stuff === 'hypo' && mode === 'heat' },
            { name: '海波冷却', color: LINE.cool, pts: tC > 0 || (stuff === 'hypo' && mode === 'cool') ? samples(coolT, tC) : [], live: stuff === 'hypo' && mode === 'cool' },
            { name: '石蜡加热', color: LINE.wax, pts: tW > 0 || (stuff === 'wax' && mode !== 'idle') ? samples(m => heatT('wax', m), tW) : [], live: stuff === 'wax' },
          ]} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'on'} onClick={() => setMode('heat')} disabled={mode !== 'idle'}>点燃酒精灯</LabButton>
        <LabButton pulse={next === 'off'} onClick={() => setMode('cool')} disabled={stuff !== 'hypo' || mode !== 'heat' || !heated}>熄灭酒精灯</LabButton>
      </>}
      extras={<Control label="试管里的物质"><Segmented label="试管里的物质" pulse={next === 'stuff'} want={next === 'stuff' ? need : null} value={stuff} disabled={busy} onChange={pick} options={KEYS.map(k => ({ value: k, label: STUFF[k].name }))} /></Control>}
    />
  )
}
