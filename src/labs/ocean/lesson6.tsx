// 洋流和厄尔尼诺 · 第 6 课 洋流对航行和污染的影响：在东海外的日本暖流上，科考船从船尾投下一个漂流浮标，看它顺着洋流往东北漂；
// 再让科考船顺流、逆流各开一趟 1000 km，比一比要多久；最后模拟一次海上溢油，看油污顺着洋流漂走、越拉越长。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { R, Track, alongTrack, azFor, onSurface, sph } from './ocean'
import { Big, Fin, H2, OnSea, Rows, noteTag, useRun } from './parts'
import { BUOY_DAYS, BUOY_TRACK, KUROSHIO_MS, ROUTE, VOYAGE, driftKmPerDay, oilSpread, voyageHours } from './physics'
import { Buoy, ResearchShip, Wake } from './ships'
import { VOICE } from './voice'
import { SPACE, type Want } from './world'

type Dir = 'with' | 'against'
const TASKS: Task[] = [
  { id: 'buoy', text: '从科考船上投放漂流浮标，看它往哪漂', note: '浮标顺着日本暖流往东北漂，一天约 86 km' },
  { id: 'with', text: '顺着洋流开 1000 km，记下用时', note: '顺流航速加快，省时省燃料' },
  { id: 'against', text: '逆着洋流再开一趟', note: '逆流航速变慢，用时更长' },
  { id: 'oil', text: '模拟一次溢油，看油污怎样扩散', note: '洋流加快了油污的扩散，污染范围变大，净化速度也加快' },
]
const RAD = Math.PI / 180
const LON = 133, LAT = 30.5
const TARGET = new THREE.Vector3(...sph(LON, LAT, R * 0.95)), VIEW: [number, number] = [azFor(LON), LAT * RAD + 0.12], SPAN: [number, number] = [6.2, 4]
const SHIP = 0.0075
const BACK = [...ROUTE].reverse() as [number, number][]
const SPILL: [number, number] = [129.5, 30.2]
const OIL_ROUTE: [number, number][] = [SPILL, [131.6, 31.5], [135, 33], [138.5, 34.2]]

/** 一片海面上的油污：黑褐色、边缘不规则，带一点油膜的光泽 */
function Slick({ lon, lat, heading, sx, sy, on }: { lon: number; lat: number; heading: number; sx: number; sy: number; on: number }) {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(1, 64), p = g.attributes.position
    for (let i = 1; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)), r = 1 + 0.18 * Math.sin(a * 3 + 1) + 0.1 * Math.sin(a * 7) + 0.06 * Math.sin(a * 13 + 2); p.setXY(i, p.getX(i) * r, p.getY(i) * r) }
    g.rotateX(-Math.PI / 2); return g
  }, [])
  const o = onSurface(lon, lat, heading, 0.012)
  return <group position={o.position} quaternion={o.quaternion}>
    <mesh geometry={geo} scale={[0.07 * sy, 1, 0.07 * sx]} renderOrder={8}><meshPhysicalMaterial color="#17120d" roughness={0.12} metalness={0.2} iridescence={0.8} iridescenceIOR={1.5} transparent opacity={0.82 * on} depthWrite={false} /></mesh>
  </group>
}

export default function Lesson6() {
  const [dir, setDir] = useState<Dir>('with')
  const [buoyDone, setBuoyDone] = useState(false)
  const [trips, setTrips] = useState<Dir[]>([])
  const [oilDone, setOilDone] = useState(false)
  // 船速按航时换算：用时越长，画面上走得越慢（每 5 小时走 1 秒）
  const buoy = useRun(0.12), shipW = useRun(5 / voyageHours(true)), shipA = useRun(5 / voyageHours(false)), oil = useRun(0.11)
  const ship = dir === 'with' ? shipW : shipA
  const T = useTasks('gewu:ocean:6', TASKS)
  const busy = buoy.on || shipW.on || shipA.on || oil.on
  const drop = () => buoy.start(0, 1, () => { setBuoyDone(true); T.check(id => id === 'buoy') })
  const sail = () => { const d = dir; ship.start(0, 1, () => { setTrips(t => { const n = t.includes(d) ? t : [...t, d]; T.check(id => n.includes(id as Dir)); return n }) }) }
  const spill = () => oil.start(0, 1, () => { setOilDone(true); T.check(id => id === 'oil') })
  const resetAll = () => { setDir('with'); setBuoyDone(false); setTrips([]); setOilDone(false); buoy.reset(); shipW.reset(); shipA.reset(); oil.reset(); T.reset() }

  const task = T.current
  const wantDir: Dir | null = task && (task.id === 'with' || task.id === 'against') ? task.id : null
  const { hint, next }: { hint: string; next: 'buoy' | 'dir' | 'sail' | 'oil' | null } = (() => {
    if (!task) return { hint: '都做完了。顺流省时，污染顺着洋流扩散。', next: null }
    if (buoy.on) return { hint: '浮标顺着洋流漂…', next: null }
    if (ship.on) return { hint: dir === 'with' ? '科考船顺着洋流开…' : '科考船逆着洋流开…', next: null }
    if (oil.on) return { hint: '油污顺着洋流漂开…', next: null }
    if (task.id === 'buoy') return { hint: '从科考船的船尾投放一个漂流浮标', next: 'buoy' }
    if (wantDir && dir !== wantDir) return { hint: '换成逆着洋流开', next: 'dir' }
    if (wantDir) return { hint: wantDir === 'with' ? '让科考船顺着洋流开 1000 km' : '让科考船逆着洋流开回去', next: 'sail' }
    return { hint: '在洋流上模拟一次溢油', next: 'oil' }
  })()

  const route = dir === 'with' ? ROUTE : BACK
  const sv = ship.on ? ship.v : trips.includes(dir) ? 1 : 0
  const sp = alongTrack(route as [number, number][], sv)
  const bp = alongTrack(BUOY_TRACK, buoy.on ? buoy.v : buoyDone ? 1 : 0)
  const os = oilSpread((oil.on ? oil.v : oilDone ? 1 : 0) * 20), op = alongTrack(OIL_ROUTE, os.along * 0.5)
  const shipAt = ship.on || trips.length ? sp : buoyDone ? alongTrack(route as [number, number][], 0) : { lon: 124.2, lat: 24, heading: 40 }
  const labels: Label[] = [
    noteTag('kuro', sph(136.5, 31.4, R * 1.03), '日本暖流', true, 0.5, '#ffb4a3'),
    noteTag('ship', sph(shipAt.lon - 1.2, shipAt.lat - 1.1, R * 1.03), '科考船', true, 0.5, '#ffffff'),
    noteTag('buoy', sph(bp.lon + 1.2, bp.lat + 0.6, R * 1.03), `浮标 · ${(driftKmPerDay(KUROSHIO_MS) * (buoy.on ? buoy.v : 1) * BUOY_DAYS).toFixed(0)} km`, buoy.on || buoyDone, 0, '#ffe17a'),
    noteTag('oil', sph(op.lon, op.lat + 1.3, R * 1.03), '油污', oil.on || oilDone, 0.5, '#ffffff'),
    noteTag('jp', sph(137, 36.4, R * 1.02), '日本', true, 0.5, '#ffffff'),
  ]
  const want: Want = {
    sun: { az: azFor(LON) / RAD + 25, lat: 45 }, night: 0.55, cloud: 0.12, grid: 0.08,
    flows: { keys: ['kuroshio'], on: 0.9, speed: 0.5, size: 0.24 },
  }
  const hours = (d: Dir) => voyageHours(d === 'with')
  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title="洋流和厄尔尼诺" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="日本暖流"
      stage={<LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEW} {...SPACE} world={want}>
        <OnSea lon={shipAt.lon} lat={shipAt.lat} heading={shipAt.heading} scale={SHIP}><ResearchShip aframe={buoy.on && buoy.v < 0.15 ? 1 : 0} />{ship.on && <Wake len={70} w={16} />}</OnSea>
        {(buoy.on || buoyDone) && <><OnSea lon={bp.lon} lat={bp.lat} scale={0.16} lift={-0.002}><Buoy /></OnSea><Track pts={BUOY_TRACK} t={buoy.on ? buoy.v : 1} width={0.025} lift={1.003} /></>}
        {(ship.on || trips.includes(dir)) && <Track key={dir} pts={route as [number, number][]} t={sv} color={dir === 'with' ? '#7fe3d4' : '#ffffff'} width={0.022} lift={1.0025} />}
        {(oil.on || oilDone) && <Slick lon={op.lon} lat={op.lat} heading={op.heading} sx={os.width} sy={os.stretch} on={1} />}
      </LabStage>}
      lesson={<LessonBlock no="6" title="航行和污染" concept="顺流省时，污染顺着洋流扩散" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>海轮顺洋流航行可以节约燃料，加快速度；逆洋流航行则相反。</p>
          <p className="mt-2">洋流可以把近海的污染物携带到其他海域，有利于污染物的扩散，加快净化速度；但也使污染范围扩大。</p>
          <p className="mt-2 text-[13.5px] text-white/65">画面上的科考船、浮标放大画了很多倍。船速取 {VOYAGE.ship} km/h，日本暖流的流速约 {KUROSHIO_MS} m/s（{VOYAGE.current} km/h）。</p>
        </>} />}
      finale={T.finale && <Fin kicker="浮标、航行、溢油都看过了" big="顺流省时，污染顺着洋流扩散" small={`同样 ${VOYAGE.km} km，顺流约 ${hours('with').toFixed(1)} 小时，逆流约 ${hours('against').toFixed(1)} 小时。洋流使污染物扩散得快，净化也快，但污染范围扩大。`} />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={`${dir === 'with' ? '顺流' : '逆流'}开 ${VOYAGE.km} km 用时`} value={hours(dir).toFixed(1)} unit="h" color={dir === 'with' ? '#7fe3d4' : '#ffffff'} />
          <p className="mt-1 text-center text-[13px] text-white/60 tabular-nums">航速 {VOYAGE.ship} {dir === 'with' ? '+' : '−'} {VOYAGE.current} = {(VOYAGE.ship + (dir === 'with' ? 1 : -1) * VOYAGE.current).toFixed(1)} km/h</p>
          <H2>记录</H2>
          {!buoyDone && trips.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">先投放浮标，再开船。</p>
            : <Rows head={['项目', '结果']} rows={[
              ...(buoyDone ? [['浮标漂流', <b key="b" className="text-[#ffe17a]">往东北，约 {driftKmPerDay(KUROSHIO_MS).toFixed(0)} km/天</b>]] : []),
              ...trips.map(d => [d === 'with' ? '顺流航行' : '逆流航行', <b key={d} className={d === 'with' ? 'text-[#7fe3d4]' : ''}>{hours(d).toFixed(1)} h</b>]),
              ...(oilDone ? [['溢油', '顺流拉长，范围扩大']] : []),
            ]} />}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'buoy'} onClick={drop} disabled={busy || buoyDone}>投放浮标</LabButton>
        <LabButton primary pulse={next === 'sail'} onClick={sail} disabled={busy || !buoyDone || trips.includes(dir)}>开船</LabButton>
        <LabButton pulse={next === 'oil'} onClick={spill} disabled={busy || trips.length < 2 || oilDone}>模拟溢油</LabButton>
      </>}
      extras={<Control label="航向"><Segmented label="航向" pulse={next === 'dir'} want={wantDir} value={dir} onChange={v => setDir(v as Dir)} disabled={busy} options={[{ value: 'with', label: '顺流' }, { value: 'against', label: '逆流' }]} /></Control>}
    />
  )
}
