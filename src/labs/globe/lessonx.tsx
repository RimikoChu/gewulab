// 地球和经纬网 · 拓展课：两个课本之外的小实验，共用一页。
// 六分仪量纬度：夜里在罗经甲板上量北极星的高度角；经度一度有多长：在地球仪上沿经线、沿纬线各走 10°。
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { ROUTES, SEXTANT_LATS, arcLength, latShort, polarisAltitude, type RouteKey } from './physics'
import { faceLon, globeToWorld, onSphere, GR } from './globe'
import { Sextant } from './scenex'
import { Zoom, aim } from './lens'
import { LESSONS, goLesson } from './lessons'
import { GLOBE_VIEWS, INDOOR } from './views'
import { DIPPER, ST, skyDir, type Want } from './world'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Sub = 'sextant' | 'arc'
type LatKey = typeof SEXTANT_LATS[number]
const SUBS: Record<Sub, { name: string; title: string; concept: string }> = {
  sextant: { name: '六分仪量纬度', title: '六分仪量纬度', concept: '北极星有多高，这里就是北纬多少度' },
  arc: { name: '经度一度有多长', title: '经度一度有多长', concept: '纬度 1° 约 111 km，经度 1° 越往北越短' },
}
const ORDER: Sub[] = ['sextant', 'arc']
const TASKS: Task[] = [
  { id: 'sextant', text: '六分仪：在赤道、18°N、40°N 各量一次北极星', note: '北极星的高度角约等于当地的纬度：在赤道贴着海平线，在北纬 40° 高 40°' },
  { id: 'arc', text: '一度有多长：沿经线、赤道、60°N 各走 10°', note: '沿经线和在赤道上走 10° 都约 1112 km；在 60°N 只有一半' },
]
const LAT_NAME: Record<LatKey, string> = { 0: '赤道', 18: '18°N', 40: '40°N' }
const RK = Object.keys(ROUTES) as RouteKey[]
const RAD = Math.PI / 180
const SX = new THREE.Vector3(22.6, 19.15, 5.2)
/** 六分仪举起来以后转轴所在的高度：两条视线从这里出发 */
const P = SX.clone().add(new THREE.Vector3(0, 0.35, 0))
/** 夜里的机位：站在观察者左后方，略仰着看北偏东的天空；视角放宽，星空和六分仪都装得下 */
const NIGHT = aim(SX.clone().add(new THREE.Vector3(-0.42, 0.26, 0.6)), SX.clone().add(new THREE.Vector3(0.32, 1.05, -1.4)))
/** 视线画多长（m）：够远，看上去就连到了天上的星 */
const L = 400

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('sextant')
  const T = useTasks('gewu:globe:x', TASKS)
  // 六分仪
  const [lat, setLat] = useState<LatKey>(0), [up, setUp] = useState(false), [seen, setSeen] = useState<LatKey[]>([])
  const lift = useSlide(up ? 1 : 0, 1.2), alt = useSlide(up ? polarisAltitude(lat) : 0, 20), aiming = up && (lift < 0.999 || Math.abs(alt - polarisAltitude(lat)) > 0.01)
  const measured = up && !aiming
  const recSextant = () => { if (!measured || seen.includes(lat)) return; const n = [...seen, lat]; setSeen(n); if (n.length === 3) T.check(id => id === 'sextant') }
  // 一度有多长
  const [route, setRoute] = useState<RouteKey>('meridian'), [go, setGo] = useState(false), [walked, setWalked] = useState<RouteKey[]>([])
  const t = useSlide(go ? 1 : 0, 0.5), moving = go && t < 0.999
  const R = ROUTES[route], km = R.km() * t
  const recArc = () => { if (!go || moving || walked.includes(route)) return; const n = [...walked, route]; setWalked(n); if (n.length === 3) T.check(id => id === 'arc') }
  useEffect(() => { setGo(false) }, [route])
  useEffect(() => { setUp(false) }, [lat])

  const resetAll = () => { setSub('sextant'); setLat(0); setUp(false); setSeen([]); setRoute('meridian'); setGo(false); setWalked([]); T.reset() }
  const nextSub = ORDER.find(k => !T.done[k])
  const { hint, next }: { hint: string; next: string | null } = (() => {
    if (T.done[sub]) return nextSub ? { hint: `这个做完了。接着做：${SUBS[nextSub].name}`, next: 'sub' } : { hint: '两个拓展实验都做完了。', next: null }
    if (sub === 'sextant') {
      if (seen.includes(lat)) return { hint: '换一个纬度再量', next: 'seg' }
      if (!up) return { hint: `船在${LAT_NAME[lat]}：举起六分仪，对准北极星`, next: 'a' }
      if (aiming) return { hint: '正在对准北极星…', next: null }
      return { hint: `北极星的高度角 ${polarisAltitude(lat)}°：记下来`, next: 'b' }
    }
    if (walked.includes(route)) return { hint: '换一条路线再走', next: 'seg' }
    if (!go) return { hint: `${R.name}走 10°：让小船开过去`, next: 'a' }
    if (moving) return { hint: '小船在走…', next: null }
    return { hint: `走了 ${Math.round(R.km())} km：记下来`, next: 'b' }
  })()

  // 六分仪的视线：一条平着朝北（海平线），一条朝北极星
  const a = alt * RAD
  const sxLabels: Label[] = [
    { id: 'p', at: P.clone().add(skyDir(0, 90, lat).multiplyScalar(L)).toArray(), ax: 0.5, className: 'scene-tag -translate-y-[150%]', children: '北极星' },
    { id: 'bd', at: DIPPER.reduce((v, [ra, dec]) => v.add(skyDir(ra, dec, lat).multiplyScalar(900 / DIPPER.length)), new THREE.Vector3()).toArray(), ax: 0.5, className: 'scene-name -translate-y-[160%]', children: '北斗七星' },
    { id: 'h', at: [P.x, P.y, P.z - 60], ax: 0.5, className: 'scene-name translate-y-1', children: '海平线（正北）' },
    { id: 'ang', at: P.clone().add(new THREE.Vector3(0, Math.sin(a / 2), -Math.cos(a / 2)).multiplyScalar(0.42)).toArray(), ax: 1, className: 'scene-tag key -translate-y-1/2 -translate-x-2 transition-opacity', style: { opacity: up ? 1 : 0 }, children: <><small>高度角</small>{alt.toFixed(1)}°</> },
  ]
  const at = ST.globe
  const arcSpin = faceLon(125)
  const arcLabels: Label[] = [
    { id: 'km', at: globeToWorld(at, onSphere(R.from.lat + (R.to.lat - R.from.lat) * t, R.from.lon + (R.to.lon - R.from.lon) * t, GR * 1.03), arcSpin), ax: 0, className: 'scene-tag key -translate-y-full translate-x-2', children: <><small>走了</small>{Math.round(km)} km</> },
    { id: 'from', at: globeToWorld(at, onSphere(R.from.lat, R.from.lon, GR * 1.02), arcSpin), ax: 1, className: 'scene-name -translate-x-2 translate-y-1', children: '出发' },
  ]
  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="地球和经纬网" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint}
      actionsLabel={sub === 'sextant' ? '六分仪' : '地球仪上的小船'}
      stage={sub === 'sextant'
        ? <LabStage<Want> labels={sxLabels} {...NIGHT} free sky={false} backdrop="#070c1a" sun={0} env={0.25} bloom={0.8} studio fog={[300, 2000]} world={{ night: { lat } }}>
            <Zoom fov={60} />
            <group position={[SX.x, SX.y + 0.23 + lift * 0.12, SX.z]}><Sextant alt={alt} /></group>
            {/* 两条视线：一条平着朝北（海平线），一条朝北极星；中间的弧是高度角 */}
            <group position={P.toArray()}>
              <mesh position={[0, 0, -L / 2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.003, 0.003, L, 6]} /><meshBasicMaterial color="#9fc7ff" toneMapped={false} transparent opacity={up ? 0.8 : 0.3} /></mesh>
              <group rotation-x={a}><mesh position={[0, 0, -L / 2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.003, 0.003, L, 6]} /><meshBasicMaterial color="#ffe14d" toneMapped={false} transparent opacity={up ? 0.9 : 0} /></mesh></group>
              {alt > 0.5 && <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.36, 0.0025, 6, 48, a]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>}
            </group>
            {/* 月光：从西南边斜照过来，把罗经甲板、栏杆、桅杆勾出来 */}
            <directionalLight position={[SX.x - 30, 45, SX.z + 30]} intensity={1.1} color="#aebfff" />
            {/* 甲板灯：桅杆根部和栏杆上各一盏 */}
            {[[16.9, 20.25, 0.7], [21.2, 20.25, -7.9], [24.6, 20.25, 7.9]].map(([x, y, z], i) => <group key={i} position={[x, y, z]}>
              <mesh><cylinderGeometry args={[0.07, 0.09, 0.14, 16]} /><meshStandardMaterial color="#2a2d31" roughness={0.5} /></mesh>
              <mesh position={[0, -0.09, 0]}><sphereGeometry args={[0.06, 14, 10]} /><meshBasicMaterial color="#ffd9a8" toneMapped={false} /></mesh>
              <pointLight position={[0, -0.2, 0]} intensity={5} distance={7} decay={2} color="#ffd2a0" />
            </group>)}
          </LabStage>
        : <LabStage<Want> labels={arcLabels} {...GLOBE_VIEWS.close} {...INDOOR} world={{ globe: { spin: arcSpin, route: { from: R.from, to: R.to, t }, lats: route === 'north60' ? [{ lat: 60, color: '#7fe3d4' }] : route === 'equator' ? [{ lat: 0, color: '#7fe3d4' }] : [], lons: route === 'meridian' ? [{ lon: 120, color: '#7fe3d4' }] : [] } }}>{null}</LabStage>}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].title} concept={SUBS[sub].concept} tasks={TASKS} done={T.done} current={sub}
        theory={sub === 'sextant'
          ? <><p>北极星差不多正好在地轴的延长线上。站在北极，它在头顶；站在赤道，它贴着海平线。北极星离海平线的高度角，约等于当地的纬度。</p>
              <p className="mt-2">六分仪是航海上量天体高度的仪器：从望远镜里同时看到海平线和星星，把两者对齐，弧上就读出高度角。南半球看不到北极星，要改用别的星。</p></>
          : <><p>每条经线一样长，所以沿经线走，纬度每差 1°，距离都约 111 km。</p>
              <p className="mt-2">纬线越往两极越短，所以沿纬线走，经度每差 1° 的距离也越来越短：在赤道上约 111 km，在 60° 纬线上只有一半。</p></>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个拓展实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">经纬网量得出位置，也量得出距离</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">北极星的高度告诉我们纬度；纬度 1° 约 111 km，经度 1° 越往两极越短。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {sub === 'sextant' ? <>
            <div className="text-center"><div className="text-[13px] text-white/60">北极星的高度角</div>
              <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{up ? `${alt.toFixed(1)}°` : '—'}</div></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="船在" value={LAT_NAME[lat]} unit="纬度" />
              <ParamTile symbol="指标臂" value={up ? `${(alt / 2).toFixed(1)}°` : '—'} unit="转过高度角的一半" />
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
            {seen.length === 0 ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">还没有记录。</p>
              : <table className="mt-1 w-full text-[13.5px] tabular-nums"><thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">纬度</th><th className="text-right font-normal">北极星高度角</th></tr></thead>
                <tbody>{seen.map(l => <tr key={l} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{l === 0 ? '0°（赤道）' : latShort(l)}</td><td className="text-right font-semibold text-[#7fe3d4]">约 {polarisAltitude(l)}°</td></tr>)}</tbody></table>}
          </> : <>
            <div className="text-center"><div className="text-[13px] text-white/60">{R.name}走了</div>
              <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{Math.round(km)}<span className="ml-1 text-[16px] font-medium text-white/55">km</span></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="走过" value="10°" unit={route === 'meridian' ? '纬度差' : '经度差'} />
              <ParamTile symbol="1°" value={`约 ${Math.round(route === 'meridian' ? arcLength(1) : arcLength(1, R.from.lat))} km`} unit={route === 'north60' ? '在 60°N 上' : '在赤道 / 经线上'} />
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
            {walked.length === 0 ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">还没有记录。</p>
              : <table className="mt-1 w-full text-[13.5px] tabular-nums"><tbody>{walked.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{ROUTES[k].name} 10°</td><td className="text-right font-semibold text-[#7fe3d4]">{Math.round(ROUTES[k].km())} km</td></tr>)}</tbody></table>}
          </>}
        </Glass>
      }
      actions={sub === 'sextant'
        ? <><LabButton pulse={next === 'a'} onClick={() => setUp(u => !u)} disabled={aiming}>{up ? '放下六分仪' : '举起六分仪'}</LabButton><LabButton primary pulse={next === 'b'} onClick={recSextant} disabled={!measured || seen.includes(lat)}>记录</LabButton></>
        : <><LabButton pulse={next === 'a'} onClick={() => setGo(g => !g)} disabled={moving}>{go ? '回到出发点' : '开过去'}</LabButton><LabButton primary pulse={next === 'b'} onClick={recArc} disabled={!go || moving || walked.includes(route)}>记录</LabButton></>}
      extras={<>
        {sub === 'sextant' && <Control label="船在"><Segmented label="船在" pulse={next === 'seg'} want={SEXTANT_LATS.find(l => !seen.includes(l)) === undefined ? null : String(SEXTANT_LATS.find(l => !seen.includes(l)))} value={String(lat)} onChange={k => setLat(+k as LatKey)} options={SEXTANT_LATS.map(l => ({ value: String(l), label: LAT_NAME[l] }))} /></Control>}
        {sub === 'arc' && <Control label="怎么走"><Segmented label="怎么走" pulse={next === 'seg'} want={RK.find(k => !walked.includes(k)) ?? null} value={route} onChange={k => setRoute(k as RouteKey)} options={RK.map(k => ({ value: k, label: ROUTES[k].name }))} /></Control>}
        <Control label="拓展实验"><Segmented label="拓展实验" pulse={next === 'sub'} want={nextSub ?? null} value={sub} onChange={k => setSub(k as Sub)} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>
      </>}
    />
  )
}
