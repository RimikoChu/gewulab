// 万有引力与航天 · 第 3 课的三维场景：测量实验室里的卡文迪什扭秤和光杠杆。
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import { ARM_R, BAR_Y, Balance, BIG_R, Lever, SCALE_Z } from './balance'
import { BAL } from './physics'
import { ROOM } from './views'
import { ST, type Want } from './world'

const R0 = ST.room
const TARGET = R0.clone().add(new THREE.Vector3(0, 1.9, -1.2))
const SPAN: [number, number] = [3.6, 3.4]
const VIEW: [number, number] = [0.5, 0.3]
const LAMP = new THREE.Vector3(0.32, BAR_Y + 0.03, SCALE_Z + 0.25)

export default function Scene3({ arm, twist, spot, side }: { arm: number; twist: number; spot: number; side: 'A' | 'B' | null }) {
  const w = (x: number, y: number, z: number): [number, number, number] => [R0.x + x, R0.y + y, R0.z + z]
  const ca = Math.cos(arm), sa = Math.sin(arm)
  const labels: Label[] = [
    { id: 'spot', at: w(spot, BAR_Y + 0.12, SCALE_Z), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>光点</small>{spot >= 0 ? '+' : '−'}{Math.abs(spot * 100).toFixed(2)} cm</> },
    { id: 'nBig', at: w(ARM_R * ca + 0.25, BAR_Y - BIG_R - 0.1, -ARM_R * sa), name: true, className: 'scene-name -translate-y-1/2', children: `大铅球 ${BAL.M} kg` },
    { id: 'nSmall', at: w(-BAL.L / 2 - 0.08, BAR_Y + 0.12, 0), ax: 1, name: true, className: 'scene-name -translate-y-full', children: `小铅球 ${BAL.m} kg` },
    { id: 'nFib', at: w(0.05, 2.5, 0), name: true, className: 'scene-name -translate-y-1/2', children: '石英丝' },
    { id: 'nMir', at: w(0.08, BAR_Y - 0.08, 0), name: true, className: 'scene-name', children: '小镜子' },
    { id: 'nScale', at: w(-0.25, BAR_Y - 0.12, SCALE_Z), ax: 1, name: true, className: 'scene-name', children: `刻度尺（离镜子 ${BAL.D} m）` },
    ...(side ? [{ id: 'side', at: w(-ARM_R * ca, BAR_Y + BIG_R + 0.1, ARM_R * sa), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>大球在</small>{side} 侧</> } as Label] : []),
  ]
  return (
    <LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEW} {...ROOM} world={{}}>
      <group position={R0}>
        <Balance arm={arm} twist={twist} />
        <Lever spot={spot} lamp={LAMP} />
      </group>
    </LabStage>
  )
}
