// 万有引力与航天 · 第 2 课的三维场景：太阳系全景，斜着看。水星到木星按真实的轨道半径之比和周期之比绕太阳转（画面 1 秒 = 0.15 年）；
// 行星画大了（示意大小），名字标在旁边；选中的那颗轨道加亮。
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import { OrbitBand, Planet } from './earth'
import { PLANETS, type PlanetKey } from './physics'
import { SPACE } from './views'
import { AU_S, ST, type Want } from './world'

/** 两个机位：看内侧四颗行星（近），看到木星（远）。选木星时镜头拉远 */
const NEAR_T = ST.solar.clone().add(new THREE.Vector3(0, -1, 1)), NEAR_S: [number, number] = [PLANETS.mars.a * AU_S * 2.5, PLANETS.mars.a * AU_S * 1.3]
const FAR_T = ST.solar.clone().add(new THREE.Vector3(0, -2, 2)), FAR_S: [number, number] = [PLANETS.jupiter.a * AU_S * 2 + 4, PLANETS.jupiter.a * AU_S * 1.0]
const VIEW: [number, number] = [0.15, 0.52]
const KEYS = Object.keys(PLANETS) as PlanetKey[]
const YEAR_PER_S = 0.15
const R = (k: PlanetKey, far: boolean) => PLANETS[k].size * (far ? (k === 'jupiter' ? 1.3 : 1.0) : (k === 'jupiter' ? 1.3 : 0.72))
const COLOR: Record<PlanetKey, string> = { mercury: '#c9c3bb', venus: '#f3e6c4', earth: '#7fb4ff', mars: '#ff8a5c', jupiter: '#e9c99e' }

export default function Scene2({ focus }: { focus: PlanetKey }) {
  const [t, setT] = useState(0)
  useEffect(() => { let raf = 0; const t0 = performance.now(); const f = (now: number) => { setT((now - t0) / 1000); raf = requestAnimationFrame(f) }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf) }, [])
  const S = ST.solar, far = focus === 'jupiter'
  const pos = (k: PlanetKey, i: number): [number, number, number] => { const a = PLANETS[k].a * AU_S, ang = 2 * Math.PI * t * YEAR_PER_S / PLANETS[k].T + i * 1.7 + 0.9; return [Math.cos(ang) * a, 0, -Math.sin(ang) * a] }
  const labels: Label[] = KEYS.map((k, i) => {
    const p = pos(k, i), on = k === focus
    return { id: k, at: [S.x + p[0], S.y + p[1] + R(k, far) + 0.5, S.z + p[2]] as [number, number, number], ax: 0.5, className: on ? 'scene-tag key -translate-y-full' : 'scene-name -translate-y-full', children: on ? <><small>{PLANETS[k].name}</small>a = {PLANETS[k].a} AU</> : PLANETS[k].name }
  })
  labels.push({ id: 'nS', at: [S.x, S.y - 2.9, S.z], ax: 0.5, name: true, className: 'scene-name', children: '太阳' })
  return (
    <LabStage<Want> labels={labels} target={far ? FAR_T : NEAR_T} span={far ? FAR_S : NEAR_S} view={VIEW} {...SPACE} world={{ space: true }}>
      <group position={S}>
        {KEYS.map((k, i) => (
          <group key={k}>
            <OrbitBand a={PLANETS[k].a * AU_S} width={(k === focus ? 0.9 : 0.5) * (far ? 1 : 0.45)} color={k === focus ? '#ffe9a8' : COLOR[k]} opacity={k === focus ? 1 : 0.45} />
            <group position={pos(k, i)}><Planet kind={k} r={R(k, far)} /></group>
          </group>
        ))}
      </group>
    </LabStage>
  )
}
