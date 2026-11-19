// 地球的运动 · 第 4 课的三维场景：轨道全景。地球沿轨道走，一束光从太阳打到直射点，直射点所在的纬线用红圈标出来。
// 太阳、轨道、地球都在 world.tsx，这里只交出机位、文字标签和对世界的要求。
import { LabStage, type Label } from '@/lab-kit'
import { TERMS, latText, subsolarLat, utcForNoon, CITIES } from './physics'
import { S_ORBIT, SPACE, T_ORBIT, V_ORBIT } from './space'
import { RE, earthAt, type Want } from './world'

export default function Scene4({ day, tilt }: { day: number; tilt?: number }) {
  const [ex, , ez] = earthAt(day), sub = subsolarLat(day, tilt)
  const labels: Label[] = [
    { id: 'sub', at: [ex, RE + 1.5, ez], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>直射点</small>{latText(sub)}</> },
    ...TERMS.map((t): Label => { const [x, , z] = earthAt(t.day); return { id: t.key, at: [x * 1.24, -RE - 1.1, z * 1.24], ax: 0.5, className: 'scene-name', children: `${t.name} · ${t.date}` } }),
    { id: 'nSun', at: [0, 5.2, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '太阳' },
    { id: 'nRing', at: [ex + RE + 0.6, 0, ez], name: true, className: 'scene-name -translate-y-1/2', children: '红圈：直射点所在的纬线' },
  ]
  const want: Want = { day, tilt, utc: utcForNoon(CITIES.beijing.lon), ray: true }
  return <LabStage<Want> labels={labels} target={T_ORBIT} span={S_ORBIT} view={V_ORBIT} {...SPACE} world={want}>{null}</LabStage>
}
