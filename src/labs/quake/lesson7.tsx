// 地震 · 第 7 课 房屋抗震：用不同周期的地震波摇小镇上的 3 层、10 层、20 层楼，看哪栋晃得最凶（共振）；给 20 层楼装上阻尼器。
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './world'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { BUILDINGS, WAVE_T, buildingTR, natPeriod, worst, type BuildingKey, type WaveT } from './physics'
import { SPOTS, TOWN, townSway } from './town'
import { buildingHeight, type Kind } from './building'
import { RespChart } from './charts'
import { useLater } from './clock'

const KIND: Record<BuildingKey, Kind> = { low: 'house', mid: 'slab', high: 'tower' }
const TR = (k: BuildingKey, T: number, damped = false) => buildingTR(BUILDINGS.find(b => b.key === k)!.floors, T, damped)
const TASKS: Task[] = [
  { id: 'one', text: '用 1 s 的地震波摇，看哪栋楼晃得最凶', note: `10 层楼的固有周期约 ${natPeriod(10)} s，和地震波合拍，发生共振` },
  { id: 'two', text: '换成 2 s 的地震波', note: '这回是 20 层楼共振，3 层楼几乎不动' },
  { id: 'damp', text: '给 20 层楼装上阻尼器', note: `20 层楼楼顶的晃动从地面的约 ${TR('high', 2).toFixed(0)} 倍降到约 ${TR('high', 2, true).toFixed(1)} 倍` },
]
const W = (k: BuildingKey, dy: number): [number, number, number] => [TOWN.x + SPOTS[k][0], TOWN.y + buildingHeight(KIND[k]) + dy, TOWN.z + SPOTS[k][2]]

/** 楼顶的阻尼器：一块很重的钢块，挂在楼顶的机房里，跟着楼顶反着晃（示意，画在楼顶上看得见的地方） */
function Damper({ on }: { on: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { const g = ref.current; if (!g) return; g.position.x = TOWN.x + SPOTS.high[0] + townSway.high.top.value * 0.95 })
  if (!on) return null
  const y = TOWN.y + buildingHeight('tower') + 0.45
  return <group ref={ref} position={[TOWN.x + SPOTS.high[0], y, TOWN.z + SPOTS.high[2] + 1.2]}>
    <mesh castShadow><boxGeometry args={[1.5, 0.8, 1.5]} /><meshStandardMaterial color="#c43c2f" metalness={0.4} roughness={0.45} /></mesh>
    {[[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].map(([x, z], i) => <mesh key={i} position={[x, -0.48, z]}><cylinderGeometry args={[0.1, 0.1, 0.18, 12]} /><meshStandardMaterial color="#2b2f33" metalness={0.6} roughness={0.4} /></mesh>)}
  </group>
}

export default function Lesson7() {
  const [wave, setWave] = useState<WaveT>('one')
  const [on, setOn] = useState(false)
  const [damped, setDamped] = useState(false)
  const T = useTasks('gewu:quake:7', TASKS)
  const Tg = WAVE_T[wave]
  // 摇 3.5 s 以后才算看清楚了
  useLater(on, 3500, () => T.check(id => id === T.current?.id && ((id === 'one' && wave === 'one') || (id === 'two' && wave === 'two' && !damped) || (id === 'damp' && wave === 'two' && damped))), [on, wave, damped])
  const resetAll = () => { setWave('one'); setOn(false); setDamped(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'shake' | 'wave' | 'damp' | null } = (() => {
    if (!task) return { hint: '都做完了。楼和地震波合拍，就会共振。', next: null }
    if (task.id === 'one' && wave !== 'one') return { hint: '换成周期 1 s 的地震波', next: 'wave' }
    if (task.id === 'one') return !on ? { hint: '用周期 1 s 的地震波，开始摇', next: 'shake' } : { hint: '看哪栋楼的楼顶甩得最远…', next: null }
    if (!on) return { hint: '开始摇', next: 'shake' }
    if (task.id === 'two') return wave !== 'two' ? { hint: '换成周期 2 s 的地震波', next: 'wave' } : { hint: '现在哪栋楼晃得最凶？', next: null }
    return !damped ? { hint: '给 20 层楼装上阻尼器', next: 'damp' } : { hint: '看 20 层楼的晃动变小了多少…', next: null }
  })()

  const top = worst(Tg)
  const labels: Label[] = BUILDINGS.map(b => {
    const tr = TR(b.key, Tg, b.key === 'high' && damped), hot = on && b.key === top && !(b.key === 'high' && damped)
    return { id: b.key, at: W(b.key, 2.2), ax: 0.5, className: `${on ? (hot ? 'scene-tag key' : 'scene-tag') : 'scene-name'} -translate-y-full`, children: on ? <><small>{b.name}</small>{tr.toFixed(1)} 倍</> : b.name }
  })
  return (
    <LabShell title="地震" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="摇一摇"
      stage={<Spot at="towers" labels={labels} want={{ town: { shake: on ? { Tg, damped, amp: 0.22 } : null } }}><Damper on={damped} /></Spot>}
      lesson={<LessonBlock no="7" title="房屋抗震" concept="楼和地震波合拍，就会共振" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>每栋楼被推一下，都会按自己的节奏来回晃，晃一个来回的时间叫<b className="text-white">固有周期</b>。楼越高，周期越长，大约是层数 × 0.1 s。</p>
          <p className="mt-2">地震波也有自己的节奏。两个节奏接近时，楼越晃越厉害，这叫<b className="text-white">共振</b>。所以不是越高越危险，是“合拍”才危险。</p>
          <p className="mt-2">抗震的办法：按抗震设防的标准设计和施工，加圈梁、构造柱；高楼顶上装阻尼器，把晃动的能量消耗掉；在楼底装隔震支座，让地面的晃动传不上来。</p>
          <p className="mt-3 text-[13.5px] text-white/65">倍数指楼顶的晃动是地面的几倍，按单自由度振子估算；画面里的晃动放大了，是示意。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三栋楼都摇过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">楼和地震波合拍，就会共振</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">1 s 的波让 10 层楼共振，2 s 的波让 20 层楼共振。装上阻尼器，20 层楼楼顶的晃动从约 {TR('high', 2).toFixed(0)} 倍降到约 {TR('high', 2, true).toFixed(1)} 倍。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">晃得最凶的</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight">{on ? BUILDINGS.find(b => b.key === top)!.name : '—'}</div>
            <div className="mt-2 text-[13px] text-white/60">{on ? `固有周期约 ${natPeriod(BUILDINGS.find(b => b.key === top)!.floors)} s，地震波 ${Tg} s` : ' '}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">楼顶晃动是地面的几倍（随地震波的周期）</h2>
          <div className="mt-1"><RespChart Tg={Tg} damped={damped} /></div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {BUILDINGS.map(b => <ParamTile key={b.key} symbol={b.name} value={on ? `${TR(b.key, Tg, b.key === 'high' && damped).toFixed(1)}` : '—'} unit="倍" />)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'shake'} onClick={() => setOn(o => !o)}>{on ? '停下' : '开始摇'}</LabButton>
        <LabButton pulse={next === 'damp'} onClick={() => setDamped(d => !d)} disabled={!T.done.two && !damped}>{damped ? '拆掉阻尼器' : '装阻尼器'}</LabButton>
      </>}
      extras={<Control label="地震波的周期"><Segmented label="地震波的周期" pulse={next === 'wave'} want={next === 'wave' ? (task?.id === 'one' ? 'one' : 'two') : null} value={wave} onChange={v => setWave(v as WaveT)} options={[{ value: 'short', label: '0.3 s' }, { value: 'one', label: '1 s' }, { value: 'two', label: '2 s' }]} /></Control>}
    />
  )
}
