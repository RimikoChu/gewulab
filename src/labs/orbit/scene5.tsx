// 地球的运动 · 第 5、7 课的三维场景：地球近景。第 5 课加亮一条纬线，看它有多长的一段在亮的半边；第 7 课给五带上色。
import { LabStage, type Label } from '@/lab-kit'
import { CITIES, dayLength, geoDir, hoursText, subsolarLat, utcForNoon, zones } from './physics'
import { S_EARTH, SPACE, earthTarget, earthView, facing } from './space'
import { RE, earthAt, type Want } from './world'

const UTC = utcForNoon(CITIES.beijing.lon)

export default function Scene5({ day, lat, tilt, zonesOn }: { day: number; lat?: number; tilt?: number; zonesOn?: boolean }) {
  const [ex, , ez] = earthAt(day), view = earthView(day), sub = subsolarLat(day, tilt)
  const lon0 = 15 * (12 - UTC) + 62                       // 朝着镜头的那条经线附近：标签都贴在这一侧
  const at = (la: number, k = 1.08): [number, number, number] => { const d = geoDir(la, lon0, day, UTC, tilt); return [ex + d[0] * RE * k, d[1] * RE * k, ez + d[2] * RE * k] }
  const see = (la: number) => facing(geoDir(la, lon0, day, UTC, tilt), view)
  const z = zones(tilt ?? 23.5)
  const labels: Label[] = zonesOn ? [
    ...(z.tropic > 0.05 ? [
      { id: 'tr', at: at(z.tropic), className: 'scene-tag -translate-y-1/2', children: <><small>北回归线</small>{z.tropic}°</> },
      { id: 'po', at: at(z.polar), className: 'scene-tag -translate-y-1/2', children: <><small>北极圈</small>{z.polar}°</> },
      { id: 'z1', at: at(0, 1.02), ax: 1, className: 'scene-name -translate-y-1/2', children: '热带' },
      ...(z.polar > z.tropic ? [{ id: 'z2', at: at((z.tropic + z.polar) / 2, 1.02), ax: 1, className: 'scene-name -translate-y-1/2', children: '北温带' }] : []),
      { id: 'z3', at: at(Math.max(z.polar, z.tropic) + (90 - Math.max(z.polar, z.tropic)) / 2, 1.02), ax: 1, className: 'scene-name -translate-y-1/2', style: { opacity: see(80) ? 1 : 0 }, children: '北寒带' },
    ] as Label[] : [{ id: 'z0', at: at(20, 1.02), ax: 0.5, className: 'scene-name', children: '没有回归线和极圈：分不出五带' }]),
  ] : lat != null ? [
    { id: 'len', at: at(lat), className: 'scene-tag key -translate-y-1/2', children: <><small>这条纬线上 昼长</small>{dayLength(lat, sub) === 24 ? '24 小时（极昼）' : dayLength(lat, sub) === 0 ? '0（极夜）' : hoursText(dayLength(lat, sub))}</> },
    { id: 'nLine', at: at(lat - 9), name: true, className: 'scene-name -translate-y-1/2', children: '白圈亮着的一段是白天，暗的一段是黑夜' },
  ] : []
  const want: Want = { day, utc: UTC, tilt, lat, zones: zonesOn, ray: zonesOn }
  return <LabStage<Want> labels={labels} target={earthTarget(day)} span={S_EARTH} view={view} {...SPACE} world={want}>{null}</LabStage>
}
