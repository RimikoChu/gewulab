// 碳和二氧化碳 · 第 7 课 碳循环：厂区东边的玻璃温室。棚里几行番茄，走道一头是二氧化碳钢瓶组，棚中间一台浓度计。
// 关上天窗，作物进行光合作用，棚里的二氧化碳越来越少；打开钢瓶补到 1000 ppm，光合作用加快；天黑了，光合作用停止，呼吸作用放出二氧化碳，浓度回升。
// 最后把镜头拉远，看自然界里碳的循环：光合作用吸收，呼吸作用和燃烧放出。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, Led, useTasks, type Label } from '@/lab-kit'
import { Puffs } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, seg, useRun } from './parts'
import { AIR_PPM, GH_FAST, TARGET_PPM, greenhouseStep, photoRel } from './physics'
import { CYL, GH, ROWS, ROW_Z, SENSOR } from './house'
import { Place, type V3 } from './world'

type View = 'house' | 'cycle'
const TASKS: Task[] = [
  { id: 'close', text: '关上天窗，看棚里的二氧化碳', note: '作物进行光合作用，吸收二氧化碳，棚里的二氧化碳越来越少' },
  { id: 'feed', text: '打开钢瓶，补充二氧化碳', note: '补到 1000 ppm，光合作用加快：二氧化碳是光合作用的原料' },
  { id: 'night', text: '天黑以后，再看浓度', note: '没有光，光合作用停止；作物的呼吸作用放出二氧化碳，浓度回升' },
  { id: 'cycle', text: '看自然界的碳循环', note: '光合作用吸收二氧化碳；动植物的呼吸、燃料的燃烧放出二氧化碳' },
]
const LOW = 300

/** 天窗：每跨屋脊两侧各几扇，以屋脊为轴往上推开。k 0 关、1 开 */
function Vents({ k }: { k: number }) {
  const half = GH.bay / 2, a = Math.atan2(GH.rise, half), w = 7, L = 5
  return <group>
    {Array.from({ length: (GH.x1 - GH.x0) / GH.bay }, (_, b) => [-56, -33, -10].map(z => [-1, 1].map(s => {
      const xr = GH.x0 + (b + 0.5) * GH.bay, yr = GH.gutter + 0.6 + GH.rise
      return <group key={`${b}${z}${s}`} position={[xr, yr, z]} rotation-z={s * (-a + 0.5 * k)}>
        <mesh position={[s * L / 2, 0, 0]} renderOrder={3}><boxGeometry args={[L, 0.14, w]} /><meshPhysicalMaterial color="#e8f2f2" transparent opacity={0.16} roughness={0.04} clearcoat={1} depthWrite={false} /></mesh>
        {[-1, 1].map(e => <mesh key={e} position={[s * L / 2, 0.05, e * w / 2]}><boxGeometry args={[L, 0.22, 0.2]} /><meshStandardMaterial color="#d4d7d9" metalness={0.5} roughness={0.4} /></mesh>)}
        <mesh position={[s * L, 0.05, 0]}><boxGeometry args={[0.2, 0.22, w]} /><meshStandardMaterial color="#d4d7d9" metalness={0.5} roughness={0.4} /></mesh>
      </group>
    })))}
  </group>
}

export default function Lesson7() {
  const [closed, setClosed] = useState(false)
  const [feed, setFeed] = useState(false)
  const [night, setNight] = useState(false)
  const [view, setView] = useState<View>('house')
  const [c, setC] = useState(AIR_PPM)
  const [nightFrom, setNightFrom] = useState(0)
  const T = useTasks('gewu:carbon:7', TASKS)
  const vent = useRun(2.4, () => setClosed(true))
  // 棚里的二氧化碳：每一帧按光合作用、呼吸作用、补气算一步。天窗开着时和室外空气慢慢拉平
  const st = useRef({ c: AIR_PPM, closed, feed, night })
  st.current.closed = closed; st.current.feed = feed; st.current.night = night
  useEffect(() => {
    let raf = 0, last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) * GH_FAST; last = now
      const s = st.current
      s.c = s.closed ? greenhouseStep(s.c, !s.night, s.feed, dt) : s.c + (AIR_PPM - s.c) * Math.min(1, dt * 0.8)
      setC(s.c); raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [])
  useEffect(() => { if (closed && c <= LOW) T.check(id => id === 'close') }, [closed, c <= LOW])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (feed && c >= TARGET_PPM - 1) T.check(id => id === 'feed') }, [feed, c >= TARGET_PPM - 1])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (night && c >= nightFrom + 60) T.check(id => id === 'night') }, [night, c >= nightFrom + 60])   // eslint-disable-line react-hooks/exhaustive-deps
  const toggleNight = () => { if (!night) { setNight(true); setFeed(false); setNightFrom(st.current.c) } else setNight(false) }
  const pickView = (v: View) => { setView(v); if (v === 'cycle') T.check(id => id === 'cycle') }
  const resetAll = () => { vent.snap(0); setClosed(false); setFeed(false); setNight(false); setView('house'); st.current.c = AIR_PPM; setC(AIR_PPM); T.reset() }

  const ventK = closed ? 0 : vent.busy ? 1 - ease(seg(vent.t, 0, 2.2)) : 1
  const rel = night ? 0 : photoRel(c)
  const task = T.current
  const { hint, next }: { hint: string; next: 'close' | 'feed' | 'night' | 'view' | null } = !task ? { hint: '二氧化碳是光合作用的原料。自然界中，光合作用吸收二氧化碳，呼吸作用和燃烧放出二氧化碳。', next: null }
    : vent.busy ? { hint: '天窗慢慢关上…', next: null }
    : task.id === 'close' ? (!closed ? { hint: '天窗开着，棚里和室外一样，约 420 ppm。关上天窗', next: 'close' } : { hint: '作物在阳光下进行光合作用，看浓度…', next: null })
    : task.id === 'feed' ? (!feed ? { hint: '二氧化碳不够了，光合作用变慢。打开钢瓶补充二氧化碳', next: 'feed' } : { hint: '二氧化碳沿着补气管送到每一行作物…', next: null })
    : task.id === 'night' ? (!night ? { hint: '补到 1000 ppm 了。等到天黑，再看浓度', next: 'night' } : { hint: '天黑了，看浓度…', next: null })
    : { hint: '把镜头拉远，看自然界的碳循环', next: 'view' }

  const sensorTag: V3 = [SENSOR[0] - 1.6, SENSOR[1], SENSOR[2]]
  const cycle = view === 'cycle'
  const labels: Label[] = cycle ? [
    { id: 'a1', at: [ROWS[2], 54, -40], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>光合作用</small>吸收二氧化碳</> },
    { id: 'a2', at: [88, 104, -96], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>燃料燃烧</small>放出二氧化碳</> },
    { id: 'a3', at: [ROWS[4] + 2, 48, -30], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>呼吸作用</small>放出二氧化碳</> },
    { id: 'a4', at: [30, 70, -60], ax: 0.5, className: 'scene-tag -translate-y-1/2', children: <><small>大气中的二氧化碳</small>约 {AIR_PPM} ppm</> },
  ] : [
    { id: 's', at: sensorTag, ax: 1, className: `scene-tag key -translate-y-1/2`, children: <><small>棚里的二氧化碳</small>{Math.round(c)} ppm</> },
    ...(feed ? [{ id: 'f', at: [CYL.x + 2, 11, CYL.z] as V3, ax: 0.5, className: 'scene-name -translate-y-full', children: '正在补气' }] : []),
    { id: 'n1', at: [CYL.x + 1.7, 0.5, CYL.z + 2], ax: 0.5, name: true, className: 'scene-name', children: '二氧化碳钢瓶组' },
    { id: 'n2', at: [ROWS[3], 23, -30], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '番茄' },
  ]
  return (
    <LabShell title="碳和二氧化碳" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="温室"
      stage={<Place at={cycle ? 'l7c' : 'l7'} labels={labels} night={night && !cycle}>
        <Vents k={ventK} />
        {!cycle && <Led text={String(Math.round(c))} w={1.9} h={0.72} position={[SENSOR[0], SENSOR[1] + 0.1, SENSOR[2] + 0.12]} />}
        {/* 补气：二氧化碳从补气管的小孔里出来，沿作物行往上散（示意） */}
        {ROWS.map((x, i) => [0.25, 0.6, 0.9].map(q => <Puffs key={`${i}${q}`} at={[x, 0.6, ROW_Z[0] + (ROW_Z[1] - ROW_Z[0]) * q]} on={feed} opt={{ rate: 2.5, life: 3, size: [0.6, 3], speed: 1.2, dir: [0, 1, 0], spread: 0.4, color: '#e8eef0', opacity: 0.08, accel: [0, 0.2, 0], drag: 0.4 }} seed={i * 3 + q * 10} />))}
        {cycle && <>
          <ForceArrow tip={[ROWS[2], 30, -40]} dir={[0, -1, 0]} len={26} color="#5fd39b" thick={22} />
          <ForceArrow tip={[88, 104, -96]} dir={[0, 1, 0]} len={30} color="#ffb04a" thick={22} />
          <ForceArrow tip={[ROWS[4], 46, -30]} dir={[0, 1, 0]} len={22} color="#ffb04a" thick={22} />
        </>}
      </Place>}
      lesson={<LessonBlock no="7" title="碳循环" concept="光合作用吸收，呼吸和燃烧放出" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>绿色植物在光照下进行光合作用，把二氧化碳和水转化成有机物，放出氧气；所以温室里补充二氧化碳，能促进作物生长。</p>
          <p className="mt-3">自然界中，二氧化碳不断被消耗，又不断产生：</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>消耗：绿色植物的光合作用，海水的吸收</li>
            <li>产生：动植物的呼吸作用，煤、石油、天然气等化石燃料的燃烧</li>
          </ul>
          <p className="mt-3">大气中的二氧化碳能像温室的玻璃一样，使地球保持温暖，这叫温室效应。化石燃料大量使用、森林被砍伐，大气中的二氧化碳增多，温室效应增强，全球变暖。减少化石燃料的使用、更多地利用清洁能源、植树造林，日常生活中节约用电、绿色出行，都是低碳的做法。</p>
          <p className="mt-3 text-[13.5px] text-white/65">温室里浓度的升降按简化的模型算，过程加快了；以 400 ppm 时的光合作用为 100%。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">温室里一天的二氧化碳看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">光合作用吸收二氧化碳，呼吸和燃烧放出二氧化碳</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">关上天窗，棚里的二氧化碳降到 {LOW} ppm 以下；补到 {TARGET_PPM} ppm，光合作用快了约 {Math.round(photoRel(TARGET_PPM) - 100)}%；天黑以后，呼吸作用让浓度回升。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">棚里的二氧化碳</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{Math.round(c)}<span className="ml-1 text-[15px] font-medium text-white/55">ppm</span></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[12.5px] text-white/55"><span>光合作用的快慢（示意）</span><span className="tabular-nums">{Math.round(rel)}%</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#7fe3d4] transition-[width] duration-300" style={{ width: `${Math.min(100, rel / 1.6)}%` }} /></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="室外" value={String(AIR_PPM)} unit="ppm · 大气中的二氧化碳" />
            <ParamTile symbol="目标" value={String(TARGET_PPM)} unit={`ppm · 补气 · 过程加快`} />
          </div>
          <ul className="mt-3 flex flex-col gap-1 text-[13.5px] text-white/75">
            <li>天窗：{closed ? '关着' : '开着'}　光照：{night ? '天黑' : '白天'}</li>
            <li>补气：{feed ? '开着' : '关着'}</li>
          </ul>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'close'} pulse={next === 'close'} onClick={() => vent.run()} disabled={closed || vent.busy}>关上天窗</LabButton>
        <LabButton primary={next === 'feed'} pulse={next === 'feed'} onClick={() => setFeed(f => !f)} disabled={!closed || night}>{feed ? '停止补气' : '补充二氧化碳'}</LabButton>
        <LabButton primary={next === 'night'} pulse={next === 'night'} onClick={toggleNight} disabled={!closed}>{night ? '天亮' : '天黑'}</LabButton>
      </>}
      extras={
        <Control label="看">
          <Segmented label="看" pulse={next === 'view'} want={next === 'view' ? 'cycle' : 'house'} value={view} onChange={k => pickView(k as View)} options={[{ value: 'house', label: '温室里' }, { value: 'cycle', label: '自然界' }]} />
        </Control>
      }
    />
  )
}
