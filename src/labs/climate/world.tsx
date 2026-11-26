// 天气和气候实验室的大场景：西边是海，海岸平原上一座山前气象站（观测场、站房、两块屏、科普广场的地球仪），
// 东边是一座南北走向的大山（迎风坡森林、山腰云雨、山顶积雪、背风坡草原荒漠），一条公路翻过山口通到背风坡的小气象站。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。各课的机位写在 SPOT 里。
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { ClimateChart, ForecastScreen, type BoardView, type ChartMarks } from './boards'
import { Clouds, Flow, Rain } from './fx'
import { GLOBE, GLOBE_AZ, Globe, type Layer } from './globe'
import { MOUNT, yAt, type Wx } from './physics'
import { Aws, Board, Building, Gauge, P, Screen, StationGround, Tower } from './station'
import { CX, Forest, PZ, Road, Terrain, ground, roadAt } from './terrain'

type V3 = [number, number, number]
/** 这一课对整个世界的要求 */
export interface Want {
  /** 观测场上空的天气 */ wx?: Wx
  /** 迎风坡的云和雨（0–1） */ mtn?: number
  /** 翻山的气流（0–1） */ flow?: number
  /** 雪线的海拔（m） */ snowAlt?: number
  globe?: { layer: Layer; spin: number }
  screen?: { door: number; t: number; tmax: number; tmin: number; lamp?: number }
  gauge?: { lift: number; bottle: number; water: number; cup: number; pour: boolean }
  board?: BoardView
  chart?: { tN: number; pN: number; marks: ChartMarks }
  /** 公路上的车走了多少米；没有就不画车 */ car?: number
  /** 风从哪个方向吹来（度） */ windFrom?: number
}

/** 迎风坡上海拔 alt 的一点（沿最高峰那条东西线找） */
function onSlope(alt: number, z = PZ): V3 {
  const y = yAt(alt); let x = 180
  while (x < CX && ground(x, z) < y) x += 2
  return [x, ground(x, z), z]
}
function peakPoint(): V3 {
  let best: V3 = [CX, 0, PZ]
  for (let x = CX - 60; x <= CX + 60; x += 3) for (let z = PZ - 60; z <= PZ + 60; z += 3) { const y = ground(x, z); if (y > best[1]) best = [x, y, z] }
  return best
}
/** 山上的两座自动气象站、背风坡的小气象站 */
export const MT = { mid: onSlope(MOUNT.mid), peak: peakPoint(), lee: [1300, ground(1300, 150), 150] as V3 }
/** 翻山气流走的路线：贴着最高峰那一条线的地面往上爬、翻过去，画在山的南侧 */
const FLOW_PTS: V3[] = [-700, -400, -100, 150, 300, 450, 560, 650, 700, 760, 860, 1000, 1150, 1400].map(x => [x, Math.max(0, ground(x, PZ)) + 40, 180] as V3)

function Car({ s }: { s: number }) {
  const { p, yaw, pitch } = roadAt(s)
  return <group position={p} rotation={[0, yaw, 0]}><group rotation-z={pitch} scale={4}>
    <RoundedBox args={[4.4, 1.0, 1.8]} radius={0.18} position-y={0.75} castShadow><meshPhysicalMaterial color="#c43c2e" roughness={0.3} clearcoat={0.8} metalness={0.3} /></RoundedBox>
    <RoundedBox args={[2.5, 0.75, 1.66]} radius={0.16} position={[-0.25, 1.55, 0]} castShadow><meshPhysicalMaterial color="#2a3640" roughness={0.08} metalness={0.4} clearcoat={1} /></RoundedBox>
    {[[1.4, 0.92], [-1.4, 0.92], [1.4, -0.92], [-1.4, -0.92]].map(([x, z], i) => <mesh key={i} position={[x, 0.38, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.38, 0.38, 0.26, 20]} /><meshStandardMaterial color="#1b1c1e" roughness={0.9} /></mesh>)}
    <mesh position={[2.21, 0.8, 0.6]}><boxGeometry args={[0.02, 0.18, 0.36]} /><meshBasicMaterial color="#fff6dc" /></mesh>
    <mesh position={[2.21, 0.8, -0.6]}><boxGeometry args={[0.02, 0.18, 0.36]} /><meshBasicMaterial color="#fff6dc" /></mesh>
  </group></group>
}

/** 背风坡山脚的小气象站：一间平房、一只百叶箱、一只雨量器（都放大画，远处才看得见） */
function LeeStation() {
  const [x, y, z] = MT.lee
  return <group position={[x, y, z]}>
    <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[60, 40]} /><meshStandardMaterial color="#c2ad7c" roughness={1} /></mesh>
    <RoundedBox args={[22, 9, 12]} radius={0.3} position={[-8, 4.5, -8]} castShadow><meshStandardMaterial color="#e6e2d8" roughness={0.8} /></RoundedBox>
    <mesh position={[-8, 9.2, -8]}><boxGeometry args={[23, 0.6, 13]} /><meshStandardMaterial color="#9c5a3c" roughness={0.8} /></mesh>
    <group position={[10, 0, 4]} scale={5}><Gauge lift={0} bottle={0} water={0} cup={0} pour={false} /></group>
    <group position={[2, 0, 8]} scale={5}><Screen door={0} t={24} tmax={30} tmin={18} /></group>
  </group>
}

export function World({ want = {} }: { want?: Want }) {
  const wx = want.wx ?? 'cloud', mtn = want.mtn ?? 0.7
  return (
    <group>
      <Terrain snow={yAt(want.snowAlt ?? 4200)} />
      <Forest />
      <Road />
      {/* 观测场和站房 */}
      <StationGround />
      <group position={P.building}><Building /></group>
      <group position={P.screen}><Screen {...(want.screen ?? { door: 0, t: 24, tmax: 30, tmin: 18 })} /></group>
      <group position={P.gauge}><Gauge {...(want.gauge ?? { lift: 0, bottle: 0, water: 0, cup: 0, pour: false })} /></group>
      <group position={P.tower}><Tower from={want.windFrom ?? 200} /></group>
      <group position={P.aws}><Aws /></group>
      <group position={P.forecast} rotation-y={-Math.PI / 2}><Board w={3.2} h={1.8} y0={1.25}><ForecastScreen view={want.board ?? 'today'} w={3.2} h={1.8} /></Board></group>
      <group position={P.chart}><Board w={3.6} h={2.4} y0={1.05} dark={false}><ClimateChart tN={want.chart?.tN ?? 12} pN={want.chart?.pN ?? 12} marks={want.chart?.marks ?? {}} w={3.6} h={2.4} /></Board></group>
      <Globe layer={want.globe?.layer ?? 'none'} spin={want.globe?.spin ?? GLOBE_AZ - Math.PI / 2 - (115 * Math.PI) / 180} />
      {/* 山上：山腰和山顶的自动气象站（放大画） */}
      <group position={MT.mid}><Aws s={7} /></group>
      <group position={MT.peak}><Aws s={7} /></group>
      <LeeStation />
      {want.car !== undefined && <Car s={want.car} />}
      {/* 天气：观测场上空的云和雨、迎风坡的云雨带、背风坡上空零星的淡云 */}
      <Clouds c={[0, 170, -120]} size={[900, 70, 700]} n={46} r={[130, 260]} amount={wx === 'sun' ? 0 : wx === 'cloud' ? 0.55 : 1} dark={wx === 'rain' ? 0.85 : 0.15} seed={3} />
      <Rain box={[-45, 45, -45, 40]} top={45} floor={() => 0} amount={wx === 'rain' ? 1 : 0} n={2600} len={0.9} speed={14} />
      <Clouds c={[460, 200, 20]} size={[420, 150, 520]} n={170} r={[70, 170]} amount={mtn} dark={mtn * 0.9} seed={7} floor={ground} />
      <Clouds c={[640, 300, -60]} size={[160, 90, 420]} n={40} r={[70, 140]} amount={mtn * 0.85} dark={mtn * 0.6} seed={9} floor={ground} />
      <Rain box={[280, 640, -320, 300]} top={290} floor={ground} amount={Math.max(0, (mtn - 0.4) / 0.6)} n={3000} len={16} speed={80} color="#e4edf5" />
      <Flow pts={FLOW_PTS} r={9} on={want.flow ?? 0} turn={0.66} />
      {/* 观测场的照明灯杆 */}
      {[[-13.5, -13.5], [13.5, 13.5]].map(([x, z], i) => <group key={i} position={[x, 0, z]}><mesh position-y={3} castShadow><cylinderGeometry args={[0.06, 0.09, 6, 12]} /><Metal kind="steel" grain="brushed" /></mesh><mesh position={[0, 6, 0]}><boxGeometry args={[0.5, 0.12, 0.25]} /><meshStandardMaterial color="#d8d8d4" /></mesh></group>)}
    </group>
  )
}

/** 机位：看向哪、装进多宽多高、从哪个方向看 */
const spot = (t: V3, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(...t), span: [w, h] as [number, number], view })
export const SPOT = {
  forecast: spot([P.forecast[0], 2.05, P.forecast[2]], 5.0, 3.0, [-Math.PI / 2 - 0.3, 0.1]),
  screen: spot([P.screen[0], 1.45, P.screen[2]], 2.6, 2.3, [Math.PI + 0.45, 0.14]),
  screenIn: spot([P.screen[0] - 0.02, 1.52, P.screen[2] - 0.2], 0.75, 0.55, [Math.PI + 0.22, 0.06]),
  gauge: spot([P.gauge[0] + 0.3, 0.5, P.gauge[2]], 1.35, 1.0, [-0.3, 0.24]),
  cup: spot([P.gauge[0] + 0.58, 0.8, P.gauge[2] + 0.02], 0.5, 0.36, [0.45, 0.1]),
  overview: spot([210, 90, -30], 540, 320, [-Math.PI / 2 + 0.42, 0.13]),
  chart: spot([P.chart[0], 2.25, P.chart[2]], 4.4, 2.9, [0.12, 0.05]),
  globe: spot([GLOBE.x, GLOBE.y, GLOBE.z], 3.2, 2.9, [GLOBE_AZ, 0.14]),
  slope: spot([440, 210, -60], 900, 520, [0.12, 0.1]),
  profile: spot([680, 220, -60], 1150, 540, [0, 0.07]),
}
/** 观测场：雾推远一些，远处的大山看得见 */
export const NEAR = { fog: [380, 3200] as [number, number], env: 0.8 }
/** 看大山：雾更远 */
export const FAR = { fog: [5000, 16000] as [number, number] }
