// 地球的运动 · 第 1、2 课的三维场景：地球近景。地球在自转，标出一两座城市。
// 太阳、轨道、地球都在 world.tsx，这里只交出机位、文字标签和对世界的要求。
import { LabStage, type Label } from '@/lab-kit'
import { CITIES, TILT, clockText, geoDir, isDay, localTime, type CityKey } from './physics'
import { S_EARTH, SPACE, V_NORTH, V_SOUTH, earthTarget, earthView, facing } from './space'
import { RE, earthAt, type Want } from './world'

export const DAY0 = 20                          // 这两课地球停在轨道上的这个位置（春分后 20 天）
export type Look = 'side' | 'north' | 'south'
const RAD = Math.PI / 180

export default function Scene1({ utc, look = 'side', cities, onSpin, dragHint, times }: { utc: number; look?: Look; cities: CityKey[]; onSpin: (h: number) => void; dragHint?: boolean; times?: boolean }) {
  const [ex, , ez] = earthAt(DAY0)
  const view = look === 'north' ? V_NORTH : look === 'south' ? V_SOUTH : earthView(DAY0)
  const at = (d: [number, number, number], k = 1.07): [number, number, number] => [ex + d[0] * RE * k, d[1] * RE * k, ez + d[2] * RE * k]
  const pole: [number, number, number] = [Math.sin(TILT * RAD), Math.cos(TILT * RAD), 0]
  const labels: Label[] = [
    ...cities.map((c, i): Label => {
      const C = CITIES[c], d = geoDir(C.lat, C.lon, DAY0, utc), day = isDay(C.lat, C.lon, DAY0, utc)
      return { id: c, at: at(d), className: `scene-tag ${i ? '' : 'key '}-translate-y-1/2 transition-opacity`, style: { opacity: facing(d, view) ? 1 : 0 }, children: <><small>{C.name}</small>{times ? clockText(localTime(utc, C.lon)) : day ? '白天' : '黑夜'}</> }
    }),
    { id: 'np', at: at(pole, 1.62), ax: 0.5, className: 'scene-name -translate-y-full', style: { opacity: look === 'south' ? 0 : 1 }, children: '北极' },
    { id: 'sp', at: at([-pole[0], -pole[1], 0], 1.62), ax: 0.5, className: 'scene-name', style: { opacity: look === 'north' ? 0 : 1 }, children: '南极' },
    { id: 'drag', at: at([0, -1, 0], 1.25), ax: 0.5, className: '', style: { display: dragHint ? undefined : 'none' }, children: <div className="drag-hint" style={{ animation: 'none', transform: 'none' }}>↔ 抓住地球可以拨着转</div> },
  ]
  const want: Want = { day: DAY0, utc, cities: cities.map(c => CITIES[c]), onSpin }
  return <LabStage<Want> labels={labels} target={earthTarget(DAY0)} span={S_EARTH} view={view} {...SPACE} world={want}>{null}</LabStage>
}
