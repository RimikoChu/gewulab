// 内能和热机 · 第 3 课 内能：做功和热传递都能改变内能。迅速压下引火仪的活塞，筒底的棉花烧起来；反复弯折铁丝，弯折处变热；
// 把 20 ℃ 的铝活塞放进 80 ℃ 的热水，水温降、铝的温度升，最后一样。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Metal, lathe, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Flash, Puffs } from './fx'
import { BEAKER, Beaker, Cable, Clamp, IGN, Igniter, Meter, Stand, Thermo, WATER } from './gear'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Done, Glove, H2, useRun } from './parts'
import { AL, BATH, bathEnd, transfer, TRANSFER_TAU } from './physics'
import { VOICE } from './voice'
import { BZ, Room, ST, TOP } from './world'

const TASKS: Task[] = [
  { id: 'fire', text: '迅速压下引火仪的活塞', note: '棉花烧起来了：对空气做功，空气的内能增加、温度升高' },
  { id: 'bend', text: '反复弯折铁丝，摸一摸弯折处', note: '弯折处变热了：做功使铁丝的内能增加' },
  { id: 'heat', text: '把冷的铝活塞放进热水，等两边温度一样', note: `都到了约 ${Math.round(bathEnd())} ℃：热传递使水的内能减少、铝的内能增加` },
]
const X = ST.s3, Z = BZ + 0.2
const IX = X - 3.3, WX = X - 0.55, WY = TOP + 0.95, BX = X + 1.95, IK = 1.3
const LEVEL = 0.7, BENDS = 10, BEND_SEC = 3.2
/** 一段粗铁丝：从中间往两边各 0.9，中间弯一个角；弯折处那一小段越热越红越亮 */
const HALF = 0.9, HOT_LEN = 0.16
function Wire({ bend, heat }: { bend: number; heat: number }) {
  const geo = useMemo(() => [-1, 1].map(s => ({
    cold: new THREE.CylinderGeometry(0.035, 0.035, HALF - HOT_LEN, 14).rotateZ(Math.PI / 2).translate(s * (HOT_LEN + (HALF - HOT_LEN) / 2), 0, 0),
    hot: new THREE.CylinderGeometry(0.035, 0.035, HOT_LEN, 14).rotateZ(Math.PI / 2).translate(s * HOT_LEN / 2, 0, 0),
  })), [])
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  useFrame(() => mats.current.forEach(m => { if (m) m.emissiveIntensity = heat * 2.4 }))
  return <group>
    {[-1, 1].map((s, i) => <group key={s} rotation-z={s * bend / 2}>
      <mesh geometry={geo[i].cold} castShadow><Metal kind="iron" grain="brushed" rough={0.45} env={1.6} /></mesh>
      <mesh geometry={geo[i].hot}><meshStandardMaterial ref={e => { mats.current[i] = e }} color="#4b4a4a" metalness={0.8} roughness={0.45} emissive="#ff3c0c" emissiveIntensity={0} toneMapped={false} /></mesh>
    </group>)}
    <mesh><sphereGeometry args={[0.036, 14, 10]} /><meshStandardMaterial ref={e => { mats.current[2] = e }} color="#4b4a4a" metalness={0.8} roughness={0.45} emissive="#ff3c0c" emissiveIntensity={0} toneMapped={false} /></mesh>
  </group>
}
const ALP = lathe([[0, 0.02], [0.17, 0.02], [0.17, -0.2], [0.21, -0.2], [0.215, -0.19], [0.215, 0.05], [0.2, 0.05], [0.2, 0.065], [0.215, 0.065], [0.215, 0.085], [0.2, 0.085], [0.2, 0.1], [0.215, 0.1], [0.215, 0.115], [0.205, 0.12], [0, 0.12]], { segs: 40, crease: 40 })

export default function Lesson3() {
  const [pressed, setPressed] = useState(false)
  const [tf, setTf] = useRun(pressed, 1, 4)
  const [bending, setBending] = useState(false)
  const [tb, setTb] = useRun(bending, 1, BEND_SEC + 3)
  const [inWater, setIn] = useState(false)
  const [tw, setTw] = useRun(inWater, 1, 30)
  const T = useTasks('gewu:heat:3', TASKS)
  const press = pressed ? Math.min(1, tf / 0.18) : 0
  const flash = pressed ? (tf < 0.18 ? 0 : Math.max(0, 1 - (tf - 0.18) / 1.6) ** 0.7) : 0
  const burnt = pressed ? Math.min(1, Math.max(0, (tf - 0.2) / 1.2)) : 0
  const bendT = Math.min(tb, BEND_SEC), bend = bending && tb < BEND_SEC ? Math.abs(Math.sin(bendT / BEND_SEC * Math.PI * BENDS)) * 1.2 : 0
  const warm = bending ? Math.min(1, tb / BEND_SEC) : 0
  const drop = useSlide(inWater ? 1 : 0, 0.8)
  const dip = inWater && drop > 0.99, settle = dip ? Math.max(0, tw - 1.3) : 0
  const temps = dip ? transfer(settle) : { water: BATH.T, al: AL.T }
  const equal = dip && settle > TRANSFER_TAU * 4.6
  useEffect(() => { T.check(id => id === 'fire' ? tf >= 2.0 : id === 'bend' ? tb >= BEND_SEC + 0.6 : equal) })
  const resetAll = () => { setPressed(false); setTf(0); setBending(false); setTb(0); setIn(false); setTw(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'press' | 'bend' | 'dip' | null } = (() => {
    if (!task) return { hint: '做功和热传递都能改变物体的内能。', next: null }
    if (task.id === 'fire') return !pressed ? { hint: '筒底放了一小团棉花。按“压下活塞”：要迅速地压', next: 'press' } : { hint: '看筒底的棉花…', next: null }
    if (task.id === 'bend') return !bending ? { hint: '按“弯折铁丝”：来回弯折十次', next: 'bend' } : { hint: '来回弯折…', next: null }
    return !inWater ? { hint: `热水 ${BATH.T} ℃，铝活塞 ${AL.T} ℃。按“放进热水”`, next: 'dip' } : { hint: '看两个温度：一个降，一个升…', next: null }
  })()
  const py = TOP + BEAKER.floor + 0.24 + (1 - drop) * 1.1
  const labels: Label[] = [
    { id: 'w', at: [BX - 0.5, TOP + 0.45, Z + 0.3], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>水温</small>{temps.water.toFixed(1)} ℃</> },
    { id: 'a', at: [BX + 1.05, TOP + 1.05, Z + 0.55], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>铝活塞</small>{temps.al.toFixed(1)} ℃</> },
    { id: 'b', at: [WX, WY + 0.32, Z], ax: 0.5, className: 'scene-tag -translate-y-full', style: { opacity: tb > BEND_SEC * 0.6 ? 1 : 0 }, children: <><small>弯折处</small>变热了</> },
    { id: 'n1', at: [IX + 0.3, TOP + 1.6, Z + 0.1], name: true, className: 'scene-name -translate-y-1/2', children: '压缩空气引火仪' },
    { id: 'n2', at: [IX + 0.25, TOP + 0.4, Z + 0.15], name: true, className: 'scene-name -translate-y-1/2', children: '棉花' },
    { id: 'n3', at: [WX + 0.45, WY + 0.12, Z], name: true, className: 'scene-name -translate-y-full', children: '铁丝' },
  ]
  const ty = TOP + BEAKER.floor + 0.08
  return (
    <LabShell title="内能和热机" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="操作"
      stage={<Room at={task?.id === 'bend' ? 's3w' : task?.id === 'heat' || !task ? 's3b' : 's3'} labels={labels} bloom={0.8}>
        {/* 引火仪和压活塞的手 */}
        <group position={[IX, TOP, Z]} scale={IK}><Igniter at={[0, 0, 0]} press={press} burnt={burnt} /></group>
        <Flash at={[IX, TOP + (IGN.base + 0.01) * IK, Z]} level={flash} size={0.2} light={2.6} />
        <Puffs at={[IX, TOP + (IGN.base + 0.08) * IK, Z]} on={burnt > 0 && burnt < 1 ? 1 : 0} len={0.4} size={0.06} spread={0.02} dense={0.6} color="#9a958e" speed={0.5} />
        <group position={[IX, TOP + (IGN.base + 0.12 + (1 - press) * 1.2 + 1.82) * IK, Z]} rotation-y={0.3} scale={0.85}><Glove sleeve={0.9} /></group>
        {/* 铁丝和两只捏着两头的手 */}
        <group position={[WX, WY, Z]}>
          <Wire bend={bend} heat={warm} />
          {/* 两只手从下面伸进来，捏住铁丝的两头 */}
          {[-1, 1].map(s => <group key={s} rotation-z={s * bend / 2}><group position={[s * 0.78, 0, 0]} rotation={[-0.75, 0, Math.PI + s * 0.25]} scale={0.8}><Glove sleeve={1.6} /></group></group>)}
          <Puffs at={[0, 0.03, 0]} on={warm > 0.3 ? 1 : 0} len={0.4} size={0.14} spread={0.03} dense={0.14} color="#ffe2c8" speed={0.5} />
        </group>
        {/* 热水、温度计、铁架台；铝活塞吊在细铁丝上，连着数显温度表 */}
        <Beaker at={[BX, TOP, Z]} level={LEVEL} color={WATER} o={0.5} k={1.15} />
        <Puffs at={[BX, TOP + BEAKER.h * 1.15 - 0.05, Z]} on={1} len={0.6} size={0.25} spread={0.12} dense={0.14} />
        <Stand at={[BX - 0.6, TOP, Z - 0.6]} h={3.4} w={1.2}><Clamp y={2.9} cx={0.46} grip={0.035} cz={0.6} /></Stand>
        <Thermo at={[BX - 0.14, ty, Z]} T={temps.water} />
        <group position={[BX + 0.08, py, Z + 0.02]}>
          <mesh geometry={ALP} castShadow><Metal kind="aluminum" grain="turned" rough={0.3} env={1.6} /></mesh>
          <mesh position={[0, 0.12 + 0.8, 0]}><cylinderGeometry args={[0.005, 0.005, 1.6, 6]} /><Metal kind="steel" /></mesh>
          <group position={[0, 1.88, 0.02]} rotation-y={0.2} scale={0.72}><Glove sleeve={0.7} /></group>
        </group>
        <Cable a={[BX + 0.08, py + 0.12, Z + 0.1]} b={[BX + 0.95, TOP + 0.3, Z + 0.55]} sag={0.25} r={0.012} color="#c22f2a" />
        <Meter at={[BX + 1.05, TOP, Z + 0.55]} text={temps.al.toFixed(1)} />
      </Room>}
      lesson={<LessonBlock no="3" title="内能" concept="做功和热传递都能改变内能" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>构成物体的所有分子，其热运动的动能与分子势能的总和，叫做物体的<b className="text-white">内能</b>。同一物体，温度越高，内能越大。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">做功</b>：压缩空气、弯折铁丝，机械能转化为内能，物体的内能增加</li>
            <li><b className="text-white">热传递</b>：热水把能量传给铝活塞，内能从高温物体转移到低温物体，直到温度相同</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">在热传递过程中，传递的能量的多少叫做<b className="text-white/85">热量</b>。热量是一个过程量，不能说物体“含有”多少热量。这里忽略了向空气散热。</p>
        </>} />}
      finale={T.finale && <Done head="三件事都做完了" title="做功和热传递都能改变内能" onClose={() => T.setFinale(false)}>压缩空气、弯折铁丝是对物体做功，物体的内能增加；铝活塞放进热水是热传递，水的内能减少、铝的内能增加，最后温度相同，都约 {Math.round(bathEnd())} ℃。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="t水" value={`${temps.water.toFixed(1)} ℃`} unit={`热水 ${BATH.m} kg`} />
            <ParamTile symbol="t铝" value={`${temps.al.toFixed(1)} ℃`} unit={`铝活塞 ${AL.m} kg`} />
          </div>
          <H2>改变内能的两种方式</H2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[13.5px] leading-snug">
            {[['做功', '能量的转化', '机械能 → 内能', T.done.fire || T.done.bend], ['热传递', '能量的转移', '高温物体 → 低温物体', T.done.heat]].map(([a, b, c, on]) => <div key={a as string} className={`rounded-xl px-3 py-2.5 ${on ? 'bg-[#35c7b3]/20' : 'bg-white/8'}`}>
              <div className="text-[15px] font-bold">{a}</div><div className="mt-1 text-white/70">{b}</div><div className="mt-0.5 text-white/90">{c}</div>
            </div>)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'press'} pulse={next === 'press'} onClick={() => setPressed(true)} disabled={pressed}>压下活塞</LabButton>
        <LabButton pulse={next === 'bend'} onClick={() => setBending(true)} disabled={bending || !T.done.fire}>弯折铁丝</LabButton>
        <LabButton pulse={next === 'dip'} onClick={() => setIn(true)} disabled={inWater || !T.done.bend}>放进热水</LabButton>
      </>}
      extras={null}
    />
  )
}
