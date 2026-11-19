// 地球的运动 · 第 3 课的三维场景：轨道全景。地球沿轨道走一年，在停过的地方各留一根地轴的影子，比一比指向。
import { LabStage, type Label } from '@/lab-kit'
import { CITIES, TERMS, utcForNoon } from './physics'
import { S_ORBIT, SPACE, T_ORBIT, V_ORBIT } from './space'
import { RE, earthAt, type Want } from './world'

export default function Scene3({ day, ghosts }: { day: number; ghosts: number[] }) {
  const [ex, , ez] = earthAt(day)
  const labels: Label[] = [
    ...TERMS.map((t): Label => { const [x, , z] = earthAt(t.day); return { id: t.key, at: [x * 1.24, -RE - 1.1, z * 1.24], ax: 0.5, className: 'scene-name', children: `${t.name} · ${t.date}` } }),
    { id: 'axis', at: [ex + RE * 0.95, RE * 1.7, ez], className: 'scene-tag -translate-y-1/2', children: <><small>地轴</small>斜着 23.5°</> },
    { id: 'nSun', at: [0, 5.2, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '太阳' },
  ]
  const want: Want = { day, utc: utcForNoon(CITIES.beijing.lon), ghosts }
  return <LabStage<Want> labels={labels} target={T_ORBIT} span={S_ORBIT} view={V_ORBIT} {...SPACE} world={want}>{null}</LabStage>
}
