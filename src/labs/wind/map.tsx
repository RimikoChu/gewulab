// 第 5、6 课共用：悬在空中的一张示意天气图（深色玻璃板上画着等压线），一团空气在上面走，
// 身上画着它受的力：水平气压梯度力（橙）、地转偏向力（紫）、摩擦力（灰），风向是青色箭头，走过的路留一条线。
import { useMemo } from 'react'
import * as THREE from 'three'
import { ForceArrow, type Label } from '@/lab-kit'
import { CASES, parcelPath, windAt, type CaseKey } from './physics'

type V3 = [number, number, number]
export const F_PGF = '#ff9f43', F_COR = '#c08bff', F_FR = '#d5dbe0', F_WIND = '#35c7b3'
/** 地图上的方向（从北顺时针的角度）换成场景里的方向：北是 −z，东是 +x */
export const dirOf = (deg: number): V3 => { const a = deg * Math.PI / 180; return [Math.sin(a), 0, -Math.cos(a)] }
const DT = 0.05

/** 一张示意天气图。c 是中心，w×d 大小；values 从南到北的等压线数值（hPa）；start 是气块出发点（相对中心，x 东、z 南为正） */
export function WeatherMap({ c, w, d, values, kind, t, started, start, forces = true }: { c: V3; w: number; d: number; values: number[]; kind: CaseKey; t: number; started: boolean; start: [number, number]; forces?: boolean }) {
  const path = useMemo(() => parcelPath(kind, 200, DT), [kind])
  const i = Math.max(0, Math.min(path.length - 1, Math.floor(t / DT)))
  const at = (j: number): V3 => [c[0] + start[0] + path[j][0], c[1] + 0.35, c[2] + start[1] - path[j][1]]
  const pos = at(i)
  const trail = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(path.length * 3), 3)); return g }, [path])
  const a = trail.attributes.position as THREE.BufferAttribute
  for (let j = 0; j < path.length; j++) { const p = at(Math.min(j, i)); a.setXYZ(j, p[0], p[1] - 0.1, p[2]) }
  a.needsUpdate = true; trail.setDrawRange(0, started ? i + 1 : 0)
  const C = CASES[kind], wv = windAt(kind, t), sp = wv.speed
  const lines = values.map((_, k) => c[2] + d / 2 - (k + 0.5) * d / values.length)
  const L = 2.6
  return <group>
    {/* 玻璃板 */}
    <mesh position={[c[0], c[1] - 0.05, c[2]]} renderOrder={3}><boxGeometry args={[w, 0.1, d]} /><meshPhysicalMaterial color="#0f2234" transparent opacity={0.55} roughness={0.2} clearcoat={0.8} depthWrite={false} /></mesh>
    {[[0, d / 2], [0, -d / 2]].map(([, z], k) => <mesh key={k} position={[c[0], c[1], c[2] + z]}><boxGeometry args={[w, 0.14, 0.12]} /><meshStandardMaterial color="#c9d6e2" metalness={0.6} roughness={0.3} /></mesh>)}
    {[[w / 2, 0], [-w / 2, 0]].map(([x], k) => <mesh key={k} position={[c[0] + x, c[1], c[2]]}><boxGeometry args={[0.12, 0.14, d]} /><meshStandardMaterial color="#c9d6e2" metalness={0.6} roughness={0.3} /></mesh>)}
    {/* 等压线：东西走向，微微弯一点 */}
    {lines.map((z, k) => <mesh key={k} position={[c[0], c[1] + 0.02, z]}><boxGeometry args={[w - 1, 0.03, 0.09]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.85} toneMapped={false} /></mesh>)}
    {/* 气块和它走过的路 */}
    <line><primitive object={trail} attach="geometry" /><lineBasicMaterial color={F_WIND} transparent opacity={0.9} toneMapped={false} /></line>
    <mesh position={pos} renderOrder={12}><sphereGeometry args={[0.55, 24, 16]} /><meshStandardMaterial color="#f4f8ff" emissive="#dfeaff" emissiveIntensity={0.35} roughness={0.6} transparent opacity={0.92} /></mesh>
    {forces && started && <>
      <ForceArrow tip={add(pos, scale(dirOf(0), L))} dir={dirOf(0)} len={L} color={F_PGF} />
      {C.cor !== 0 && <ForceArrow tip={add(pos, scale(dirOf(wv.theta + C.cor * 90), L * sp))} dir={dirOf(wv.theta + C.cor * 90)} len={L * sp} color={F_COR} />}
      {C.fr > 0 && <ForceArrow tip={add(pos, scale(dirOf(wv.theta + 180), L * sp * C.fr))} dir={dirOf(wv.theta + 180)} len={L * sp * C.fr} color={F_FR} />}
      <ForceArrow tip={add(pos, scale(dirOf(wv.theta), 1.1 + 1.6 * Math.min(1, sp)))} dir={dirOf(wv.theta)} len={1.1 + 1.6 * Math.min(1, sp)} color={F_WIND} thick={0.8} />
    </>}
  </group>
}
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]

/** 天气图上的文字：等压线数值、高压低压、几个力的名字 */
export function mapLabels(c: V3, w: number, d: number, values: number[], kind: CaseKey, t: number, started: boolean, start: [number, number]): Label[] {
  const path = parcelPath(kind, 200, DT), i = Math.max(0, Math.min(path.length - 1, Math.floor(t / DT)))
  const pos: V3 = [c[0] + start[0] + path[i][0], c[1] + 0.35, c[2] + start[1] - path[i][1]]
  const C = CASES[kind], wv = windAt(kind, t)
  const tag = (id: string, at: V3, text: string, color: string, show: boolean, ax = 0.5): Label => ({ id, at, ax, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: show ? 1 : 0, background: color, color: '#10151a', boxShadow: 'none', fontSize: 14 }, children: text })
  const far = (deg: number, k: number) => add(pos, scale(dirOf(deg), k))
  return [
    ...values.map((v, k): Label => ({ id: `iso${k}`, at: [c[0] - w / 2 + 1.2, c[1] + 0.3, c[2] + d / 2 - (k + 0.5) * d / values.length], ax: 0, className: 'scene-tag -translate-y-1/2', style: { fontSize: 13, padding: '1px 6px', background: 'rgb(15 20 24 / 0.6)', color: '#fff', boxShadow: 'none' }, children: `${v}` })),
    { id: 'hi', at: [c[0] + w / 2 - 2.5, c[1] + 0.4, c[2] + d / 2 - 1.5], ax: 0.5, className: 'scene-tag -translate-y-1/2', style: { background: '#ff6b5a', color: '#fff', boxShadow: 'none' }, children: '高压' },
    { id: 'lo', at: [c[0] + w / 2 - 2.5, c[1] + 0.4, c[2] - d / 2 + 1.5], ax: 0.5, className: 'scene-tag -translate-y-1/2', style: { background: '#4a8cff', color: '#fff', boxShadow: 'none' }, children: '低压' },
    tag('fp', far(0, 3.3), '水平气压梯度力', F_PGF, started, 1.05),
    tag('fc', far(wv.theta + C.cor * 90, 2.9 * wv.speed + 0.8), '地转偏向力', F_COR, started && C.cor !== 0 && wv.speed > 0.4),
    tag('ff', far(wv.theta + 180, 2.6 * wv.speed * C.fr + 0.9), '摩擦力', F_FR, started && C.fr > 0 && wv.speed > 0.4),
    tag('fw', far(wv.theta, 3.4), '风向', F_WIND, started, -0.1),
  ]
}
