// 热力环流和风 · 第 1 课 大气的垂直分层：从气象观测站放飞探空气球，看它一路读出的气温。
// 气象站上空竖着一根剖开的大气柱（按气温着色），换纬度时对流层顶的高度跟着变。镜头在远处侧看整根大气柱。
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Cloud, Slab } from './air'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Fin, noteTag, useRun } from './parts'
import { BURST, LAPSE, LATS, LAYER_NAME, STRAT_TOP, TOP_KM, layerAt, tempAt, tropoT, type LatKey } from './physics'
import { VOICE } from './voice'
import { P, SPOT, skyFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'mid', text: '在中纬度放飞探空气球，升过对流层顶', note: '对流层里越高越冷，到 12 km 降到 −57 ℃' },
  { id: 'strat', text: '让气球升进平流层，到 30 km', note: '平流层里气温不降反升' },
  { id: 'low', text: '换到低纬度，再放一次', note: '低纬度对流层顶约 17 km，最厚' },
  { id: 'high', text: '换到高纬度，再放一次', note: '高纬度对流层顶约 9 km，最薄' },
]
const [CX, , CZ] = P.station
const Y0 = P.station[1], KM = 1.0
const yOf = (h: number) => Y0 + h * KM
const X0 = CX - 36, X1 = CX + 36
/** 气球上升的速度（画面里每秒多少千米，示意） */
const RATE = 1.8

function Balloon({ h, burst }: { h: number; burst: boolean }) {
  const r = 0.55 + 1.1 * (h / BURST) ** 1.5, y = yOf(h)
  if (burst) return null
  return <group position={[CX, y, CZ + 0.6]}>
    <mesh position-y={r + 2.2} castShadow><sphereGeometry args={[r, 32, 24]} /><meshPhysicalMaterial color="#f7f4ec" roughness={0.35} transmission={0.2} thickness={0.2} clearcoat={0.6} /></mesh>
    <mesh position-y={1.1}><cylinderGeometry args={[0.012, 0.012, 2.2, 4]} /><meshBasicMaterial color="#e8e4dc" /></mesh>
    <mesh><boxGeometry args={[0.34, 0.26, 0.24]} /><meshStandardMaterial color="#e6e2d7" roughness={0.6} /></mesh>
    <mesh position={[0, 0, 0.125]}><planeGeometry args={[0.2, 0.08]} /><meshBasicMaterial color="#2a5d8a" /></mesh>
  </group>
}

/** 一架民航客机：机身、机翼、尾翼 */
function Plane({ at }: { at: [number, number, number] }) {
  const g = useRef<THREE.Group>(null)
  useEffect(() => { let raf = 0; const f = (t: number) => { if (g.current) g.current.position.x = at[0] + Math.sin(t / 4000) * 3; raf = requestAnimationFrame(f) }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf) }, [at])
  const white = <meshStandardMaterial color="#f2f3f5" roughness={0.35} metalness={0.2} />
  return <group ref={g} position={at} rotation-y={-0.15} scale={2.2}>
    <mesh rotation-z={Math.PI / 2}><capsuleGeometry args={[0.26, 3.2, 6, 14]} />{white}</mesh>
    <mesh position={[0.2, -0.05, 0]} rotation-x={Math.PI / 2}><boxGeometry args={[0.9, 3.8, 0.06]} />{white}</mesh>
    <mesh position={[-1.75, 0.5, 0]}><boxGeometry args={[0.55, 0.9, 0.05]} /><meshStandardMaterial color="#1f5fa8" roughness={0.4} /></mesh>
    <mesh position={[-1.7, 0.1, 0]} rotation-x={Math.PI / 2}><boxGeometry args={[0.4, 1.4, 0.05]} />{white}</mesh>
  </group>
}

export default function Lesson1() {
  const [lat, setLat] = useState<LatKey>('mid')
  const run = useRun(RATE, BURST)
  const [flown, setFlown] = useState(false)
  const T = useTasks('gewu:wind:1', TASKS)
  const h = run.v, top = LATS[lat].top, burst = flown && !run.on && h >= BURST
  // 气球每升过一处，就把对应的任务打勾
  const tRef = useRef(T); tRef.current = T
  useEffect(() => {
    if (!flown) return
    tRef.current.check(id => (id === 'mid' && lat === 'mid' && h > LATS.mid.top + 0.5) || (id === 'strat' && lat === 'mid' && h >= BURST) || (id === 'low' && lat === 'low' && h > LATS.low.top + 0.5) || (id === 'high' && lat === 'high' && h > LATS.high.top + 0.5))
  }, [h, lat, flown])
  const launch = () => { setFlown(true); run.start() }
  const pick = (k: LatKey) => { setLat(k); run.reset(); setFlown(false) }
  const resetAll = () => { pick('mid'); T.reset() }

  const task = T.current
  const want: LatKey | null = task ? (task.id === 'low' ? 'low' : task.id === 'high' ? 'high' : 'mid') : null
  const { hint, next }: { hint: string; next: 'launch' | 'lat' | null } = (() => {
    if (!task) return { hint: '都做完了。对流层越高越冷，平流层越高越暖。', next: null }
    if (want && lat !== want) return { hint: `换到${LATS[want].name}的探空站`, next: 'lat' }
    if (run.on && task.id === 'strat') return { hint: '气球进了平流层，看气温怎样变…', next: null }
    if (run.on) return { hint: '气球在上升，看气温一路怎样变…', next: null }
    if (task.id === 'strat') return { hint: '再放一次，让气球一直升到 30 km', next: 'launch' }
    return { hint: `在${LATS[lat].name}放飞探空气球`, next: 'launch' }
  })()

  const T0 = tempAt(lat, flown ? h : 0), layer = layerAt(lat, flown ? h : 0)
  const field = (_u: number, v: number) => (tempAt(lat, v * TOP_KM) + 25) / 45
  const labels: Label[] = [
    noteTag('l1', [X0 - 1, yOf(top / 2), CZ], LAYER_NAME.tropo, true, 1),
    noteTag('l2', [X0 - 1, yOf((top + STRAT_TOP) / 2), CZ], LAYER_NAME.strato, true, 1),
    noteTag('l3', [X0 - 1, yOf(66), CZ], LAYER_NAME.upper, true, 1),
    noteTag('tp', [X1 + 1, yOf(top), CZ], `对流层顶 ${top} km`, true, 0),
    noteTag('sp', [X1 + 1, yOf(STRAT_TOP), CZ], `平流层顶 ${STRAT_TOP} km`, true, 0),
    noteTag('oz', [X1 + 1, yOf(25), CZ], '臭氧层', true, 0),
    { id: 'b', at: [CX + 2.2, yOf(h) + 2.6, CZ], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: flown && !burst ? 1 : 0 }, children: <><small>{h.toFixed(1)} km</small>{T0.toFixed(0)} ℃</> },
    noteTag('bb', [CX + 2, yOf(BURST), CZ], '气球胀破', burst, 0),
  ]
  const s = SPOT.column
  // 面板里的气温曲线：横轴气温、纵轴高度
  const X = (t: number) => 18 + (t + 95) / 130 * 266, Y = (k: number) => 182 - k / TOP_KM * 170
  const curve = Array.from({ length: 161 }, (_, i) => { const k = i / 2; return `${i ? 'L' : 'M'}${X(tempAt(lat, k)).toFixed(1)} ${Y(k).toFixed(1)}` }).join(' ')
  return (
    <LabShell narration={voiced(NARRATION['1'], VOICE)} title="热力环流和风" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="探空气球"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...skyFor(1, [900, 4000])} world={{ day: 1, cloud: 0.4 }}>
        <Slab x0={X0} x1={X1} y0={Y0} y1={yOf(TOP_KM)} z={CZ} field={field} fieldKey={lat} amount={1} tint={0.14} />
        {/* 对流层顶、平流层顶：两张横着的淡色薄片 */}
        {[top, STRAT_TOP].map((k, i) => <mesh key={i} position={[CX, yOf(k), CZ - 4]} rotation-x={-Math.PI / 2} renderOrder={7}><planeGeometry args={[X1 - X0, 8]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} /></mesh>)}
        {/* 臭氧层：20～30 km 一带淡紫色 */}
        <mesh position={[CX, yOf(25), CZ + 0.02]} renderOrder={7}><planeGeometry args={[X1 - X0, 10 * KM]} /><meshBasicMaterial color="#b7a1ff" transparent opacity={0.13} depthWrite={false} /></mesh>
        {/* 刻度：每 10 km 一道 */}
        {Array.from({ length: TOP_KM / 10 + 1 }, (_, i) => <mesh key={i} position={[X1 + 0.4, yOf(i * 10), CZ]}><boxGeometry args={[0.8, 0.08, 0.08]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.7} /></mesh>)}
        {/* 对流层里的云：天气现象都发生在这一层 */}
        <Cloud c={[CX - 6, yOf(2.5), CZ - 2]} size={[10, 4, 6]} n={12} r={[3, 5]} seed={2} />
        <Cloud c={[CX + 6, yOf(4), CZ - 3]} size={[7, 8, 5]} n={14} r={[3, 5.5]} seed={5} dark={0.3} />
        <Cloud c={[CX + 6, yOf(Math.min(top - 1.2, 9)), CZ - 3]} size={[11, 3, 5]} n={8} r={[3.5, 6]} seed={8} />
        <Plane at={[CX - 6, yOf(top + 1.5), CZ + 1]} />
        <Balloon h={flown ? h : 0} burst={burst} />
      </LabStage>}
      lesson={<LessonBlock no="1" title="大气的垂直分层" concept="对流层越高越冷，平流层越高越暖" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>按气温、密度和大气运动状况在垂直方向上的差异，大气自下而上分为<b className="text-white">对流层、平流层和高层大气</b>。</p>
          <p className="mt-2"><b className="text-white">对流层</b>：气温随高度增加而降低，约每升高 1 km 降 6 ℃——地面是对流层大气主要的直接热源。空气对流运动显著，云、雨、雪等天气现象都发生在这一层。厚度随纬度变：低纬 17～18 km，中纬 10～12 km，高纬 8～9 km。</p>
          <p className="mt-2"><b className="text-white">平流层</b>：从对流层顶到约 50 km。气温随高度升高——这里的臭氧吸收太阳紫外线。大气以水平运动为主，天气晴朗，利于高空飞行。</p>
          <p className="mt-2">高层大气在平流层以上，有电离层，能反射无线电短波。</p>
          <p className="mt-2 text-[13.5px] text-white/65">大气柱的高度按比例画，宽度和地面不按比例。各纬度地面气温是示意值。</p>
        </>} />}
      finale={T.finale && <Fin kicker="三个纬度都放过了" big="对流层越高越冷，平流层越高越暖" small={`对流层里每升高 1 km 约降 ${LAPSE} ℃，对流层顶低纬约 17 km、中纬约 12 km、高纬约 9 km；平流层里臭氧吸收紫外线，气温随高度升高。`} />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={flown ? `气球 · ${LAYER_NAME[layer]}` : `${LATS[lat].name} · 地面`} value={T0.toFixed(0)} unit="℃" />
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="h" value={`${(flown ? h : 0).toFixed(1)} km`} unit="气球高度" />
            <ParamTile symbol="H" value={`${top} km`} unit="对流层顶" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">气温随高度的变化</h2>
          <svg viewBox="0 0 296 200" className="mt-2 w-full">
            {[0, 20, 40, 60, 80].map(k => <g key={k}><line x1={18} x2={284} y1={Y(k)} y2={Y(k)} stroke="rgb(255 255 255 / 0.08)" /><text x={2} y={Y(k) + 4} fontSize="10" fill="rgb(255 255 255 / 0.45)">{k}</text></g>)}
            {[-80, -40, 0, 20].map(t => <text key={t} x={X(t)} y={197} fontSize="10" fill="rgb(255 255 255 / 0.45)" textAnchor="middle">{t}℃</text>)}
            <line x1={18} x2={284} y1={Y(top)} y2={Y(top)} stroke="#ffe9a8" strokeDasharray="4 3" />
            <path d={curve} fill="none" stroke="rgb(255 255 255 / 0.75)" strokeWidth="2" />
            {flown && <circle cx={X(T0)} cy={Y(h)} r="5" fill="#35c7b3" />}
            <text x={284} y={Y(top) - 4} fontSize="10" fill="#ffe9a8" textAnchor="end">对流层顶 {tropoT(lat)}℃</text>
          </svg>
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'launch'} onClick={launch} disabled={run.on || (want !== null && lat !== want)}>放飞探空气球</LabButton>}
      extras={
        <Control label="探空站所在的纬度">
          <Segmented label="纬度" pulse={next === 'lat'} want={want} value={lat} onChange={k => pick(k as LatKey)} disabled={run.on} options={(Object.keys(LATS) as LatKey[]).map(k => ({ value: k, label: LATS[k].name }))} />
        </Control>
      }
    />
  )
}
