// 光合作用和呼吸作用 · 第 2 课的三维场景：二号台。一缸金鱼藻，上面倒扣一只漏斗，漏斗嘴上套一支装满水的试管；旁边一盏能移远移近的灯。
import { useMemo } from 'react'
import * as THREE from 'three'
import { LabStage, useSlide, type Label } from '@/lab-kit'
import { Beaker, Bubbles, C, GLASS, Lamp } from './parts'
import { bubbles } from './physics'
import { S_BENCH, SPOT } from './spots'
import { ST, TOP } from './world'

const X = ST.two
const lampX = (cm: number) => -(0.5 + cm * 0.028)

/** cm：灯的距离；on：灯开着；gas：试管里攒了多少气（0–1）；tested：正在用带火星的木条检验 */
export default function Scene2({ cm, on, gas, tested }: { cm: number; on: boolean; gas: number; tested: boolean }) {
  const lx = useSlide(lampX(cm), 0.8), lift = useSlide(tested ? 0.28 : 0, 0.5)
  const weeds = useMemo(() => Array.from({ length: 11 }, (_, i) => ({ x: Math.cos(i * 2.4) * 0.11, z: Math.sin(i * 2.4) * 0.11, h: 0.16 + (i % 4) * 0.035, lean: (i % 3 - 1) * 0.22 })), [])
  const g = Math.min(gas, 1) * 0.2
  const labels: Label[] = [
    { id: 'd', at: [X + lx / 2 - 0.1, TOP + 0.03, 0.45], ax: 0.5, className: 'scene-tag', children: <><small>灯到水草</small>{cm} cm</> },
    { id: 'gas', at: [X + 0.08, TOP + 0.82 + lift, 0], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: tested ? 1 : 0 }, children: '木条复燃：是氧气' },
    { id: 'nWeed', at: [X + 0.36, TOP + 0.2, 0.2], name: true, className: 'scene-name -translate-y-1/2', children: '金鱼藻' },
    { id: 'nTube', at: [X - 0.08, TOP + 0.74 + lift, 0], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '试管里攒下的气体' },
  ]
  return (
    <LabStage labels={labels} target={SPOT.two} span={S_BENCH}>
      <group position={[X, TOP, 0]}>
        <Beaker position={[0, 0, 0]} r={0.32} h={0.5} fill={0.86} opacity={0.35} />
        {weeds.map((w, i) => <mesh key={i} position={[w.x, w.h / 2 + 0.01, w.z]} rotation-z={w.lean}><cylinderGeometry args={[0.012, 0.016, w.h, 6]} /><meshStandardMaterial color={i % 2 ? C.leaf : C.leafDark} roughness={0.6} /></mesh>)}
        {/* 倒扣的漏斗和上面的试管；检验时把试管提起来 */}
        <mesh position={[0, 0.3, 0]}><coneGeometry args={[0.22, 0.2, 28, 1, true]} /><meshStandardMaterial {...GLASS} opacity={0.3} side={THREE.DoubleSide} /></mesh>
        <group position={[0, lift, 0]}>
          <mesh position={[0, 0.56, 0]}><cylinderGeometry args={[0.04, 0.04, 0.34, 18, 1, true]} /><meshStandardMaterial {...GLASS} opacity={0.35} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 0.73, 0]}><sphereGeometry args={[0.04, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial {...GLASS} opacity={0.35} side={THREE.DoubleSide} /></mesh>
          {!tested && <mesh position={[0, 0.39 + (0.34 - g) / 2, 0]}><cylinderGeometry args={[0.036, 0.036, 0.34 - g, 16]} /><meshStandardMaterial color={C.water} transparent opacity={0.5} depthWrite={false} /></mesh>}
        </group>
        <Bubbles from={[0, 0.2, 0]} top={0.7 - g} rate={on && !tested ? bubbles(cm) / 12 : 0} size={0.013} />
        <Lamp position={[lx, 0, 0]} on={on} h={0.62} />
        {/* 带火星的木条：伸到提起来的试管口，烧了起来 */}
        {tested && <group position={[0.02, 0.36 + lift, 0]}>
          <mesh position={[0.18, -0.09, 0]} rotation-z={1.1}><cylinderGeometry args={[0.006, 0.006, 0.42, 6]} /><meshStandardMaterial color={C.wood} /></mesh>
          <mesh position={[0, 0.03, 0]}><coneGeometry args={[0.02, 0.07, 10]} /><meshBasicMaterial color="#ffb347" toneMapped={false} /></mesh>
          <pointLight position={[0, 0.05, 0]} intensity={0.5} distance={1.2} color="#ffb060" />
        </group>}
      </group>
    </LabStage>
  )
}
