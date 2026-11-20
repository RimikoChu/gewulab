// 地球的运动 · 第 3 课的三维场景。两种看法：
// 近看地球，认赤道面、黄道面和它们的夹角；退到轨道全景，看地球走一年，在停过的地方各留一根地轴的影子。
import { LabStage, type Label } from '@/lab-kit'
import { CITIES, TERMS, TILT, utcForNoon } from './physics'
import { S_ORBIT, S_PLANES, SPACE, T_ORBIT, V_ORBIT, V_PLANES, earthTarget } from './space'
import { RE, earthAt, type Want } from './world'

const RAD = Math.PI / 180, C = Math.cos(TILT * RAD), S = Math.sin(TILT * RAD)

export default function Scene3({ day, ghosts, near }: { day: number; ghosts: number[]; near: boolean }) {
  const [ex, , ez] = earthAt(day)
  const labels: Label[] = near ? [
    { id: 'ecl', at: [ex - RE * 2.35, -RE * 0.12, ez], ax: 1, className: 'scene-tag', children: <><small>公转轨道所在的平面</small>黄道面</> },
    { id: 'equ', at: [ex - RE * 2.05 * C, RE * 2.05 * S + RE * 0.12, ez], ax: 1, className: 'scene-tag -translate-y-full', children: <><small>过赤道的平面</small>赤道面</> },
    { id: 'ang', at: [ex - RE * 2.62 * Math.cos(TILT * RAD / 2), RE * 2.62 * Math.sin(TILT * RAD / 2), ez], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>黄赤交角</small>{TILT}°</> },
    { id: 'axis', at: [ex + RE * 1.55 * S, RE * 1.55 * C, ez], className: 'scene-tag -translate-y-1/2', children: <><small>地轴</small>垂直于赤道面</> },
  ] : [
    ...TERMS.map((t): Label => { const [x, , z] = earthAt(t.day); return { id: t.key, at: [x * 1.24, -RE - 1.1, z * 1.24], ax: 0.5, className: 'scene-name', children: `${t.name} · ${t.date}` } }),
    { id: 'axis', at: [ex + RE * 0.95, RE * 1.7, ez], className: 'scene-tag -translate-y-1/2', children: <><small>地轴</small>斜着 {TILT}°</> },
    { id: 'nSun', at: [0, 5.2, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '太阳' },
  ]
  const want: Want = { day, utc: utcForNoon(CITIES.beijing.lon), ghosts, planes: true }
  return near
    ? <LabStage<Want> labels={labels} target={earthTarget(day)} span={S_PLANES} view={V_PLANES} {...SPACE} world={want}>{null}</LabStage>
    : <LabStage<Want> labels={labels} target={T_ORBIT} span={S_ORBIT} view={V_ORBIT} {...SPACE} world={want}>{null}</LabStage>
}
