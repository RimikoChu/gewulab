// 万有引力与航天 · 第 7 课的三维场景：先在发射场（火箭点火升空），再到太空（近地圆轨道 → 椭圆转移轨道 → 同步圆轨道）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import { Satellite } from './craft'
import { OrbitLine } from './earth'
import { GEO_R, ORBITS, transfer } from './physics'
import { PAD_Y, Rocket } from './site'
import { GROUND, SPACE } from './views'
import { ST, spinFacing, toScene, type Want } from './world'

const PAD_T = ST.site.clone().add(new THREE.Vector3(4, 34, 0)), PAD_S: [number, number] = [70, 78], PAD_V: [number, number] = [-0.55, 0.12]
const SP_T = ST.earth.clone(), SP_S: [number, number] = [toScene(GEO_R) * 1.75, toScene(GEO_R) * 0.85], SP_V: [number, number] = [-0.5, 0.62]
export type Phase = 'pad' | 'launch' | 'leo' | 'transfer' | 'geo'

/** 发射时腾起的白烟：一圈慢慢胀大的烟团 */
function Smoke({ k }: { k: number }) {
  const puffs = useMemo(() => Array.from({ length: 26 }, (_, i) => { const a = i / 26 * Math.PI * 2 + (i % 3) * 0.3; return { a, d: 6 + (i % 5) * 3, s: 4 + (i % 4) * 1.5, y: (i % 6) * 0.8 } }), [])
  if (k <= 0) return null
  return <group>{puffs.map((p, i) => { const g = Math.min(1, k * 1.4); return <mesh key={i} position={[Math.cos(p.a) * p.d * (0.4 + g), 2 + p.y + g * 3, Math.sin(p.a) * p.d * (0.4 + g) - (p.a > 3.5 && p.a < 5.9 ? 10 * g : 0)]} scale={p.s * (0.4 + g)}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color="#e9e7e2" roughness={1} transparent opacity={0.85 - 0.3 * g} depthWrite={false} /></mesh> })}</group>
}

export default function Scene7({ phase, rise, fire, sat, theta0, burn, speedText }: { phase: Phase; rise: number; fire: number; sat: [number, number]; theta0: number; burn: number; speedText: string }) {
  const ground = phase === 'pad' || phase === 'launch'
  const tr = transfer(), E = ST.earth
  const rLeo = toScene(ORBITS.leo.r), rGeo = toScene(GEO_R)
  const satW: [number, number, number] = [E.x + toScene(sat[0]), E.y, E.z - toScene(sat[1])]
  const labels: Label[] = ground ? [
    { id: 'nR', at: [ST.site.x - 4.5, PAD_Y + 30 + rise, ST.site.z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '运载火箭（顶上整流罩里是卫星）' },
    { id: 'nT', at: [ST.site.x + 19, 60, ST.site.z], name: true, className: 'scene-name -translate-y-1/2', children: '脐带塔' },
  ] : [
    { id: 'sat', at: [satW[0], satW[1] + 2.2, satW[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>卫星</small>{speedText}</> },
    { id: 'leo', at: [E.x - rLeo * 0.7, E.y - 1, E.z + rLeo * 0.7], ax: 1, className: 'scene-name -translate-y-1/2', children: '近地圆轨道' },
    { id: 'geo', at: [E.x - rGeo * 0.72, E.y, E.z + rGeo * 0.7], ax: 1, className: 'scene-name -translate-y-1/2', children: '同步圆轨道' },
    ...(phase !== 'leo' ? [{ id: 'P', at: [E.x + Math.cos(theta0) * rLeo, E.y + 1.2, E.z - Math.sin(theta0) * rLeo] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>近地点</small>第一次点火</> } as Label] : []),
    ...(phase !== 'leo' ? [{ id: 'A', at: [E.x - Math.cos(theta0) * rGeo, E.y + 1.2, E.z + Math.sin(theta0) * rGeo] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>远地点</small>{phase === 'geo' ? '第二次点火' : '在这里再点火'}</> } as Label] : []),
  ]
  const want: Want = ground ? {} : { space: true, earthLight: true, spin: spinFacing(110, SP_V[0]) }
  const stage = ground ? { target: PAD_T, span: PAD_S, view: PAD_V, ...GROUND } : { target: SP_T, span: SP_S, view: SP_V, ...SPACE }
  return (
    <LabStage<Want> labels={labels} {...stage} world={want}>
      {ground && <group position={[ST.site.x, PAD_Y + rise, ST.site.z]}><Rocket fire={fire} /></group>}
      {ground && <group position={ST.site}><Smoke k={phase === 'launch' ? Math.min(1, rise / 40 + 0.3) : 0} /></group>}
      {!ground && <group position={E}>
        <OrbitLine a={rLeo} color="#7fe3d4" opacity={phase === 'leo' ? 0.95 : 0.4} width={1.4} />
        <OrbitLine a={rGeo} color="#ffd27a" opacity={phase === 'geo' ? 0.95 : 0.3} width={phase === 'geo' ? 2.2 : 1.2} />
        {phase !== 'leo' && <group rotation-y={theta0}><OrbitLine a={toScene(tr.a)} e={tr.e} color="#ffb347" opacity={phase === 'transfer' ? 0.95 : 0.4} width={1.6} /></group>}
      </group>}
      {!ground && <group position={satW} rotation-y={Math.atan2(sat[0], sat[1])}><group scale={0.8}><Satellite glow={burn} /></group></group>}
    </LabStage>
  )
}
