// 地球系里绕地球转的东西：按给定周期在赤道面上匀速转的一颗卫星，以及按椭圆轨道走的。位置每帧更新，不经过 React。
import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SIM } from './world'

/** 圆轨道：半径 r（场景单位），周期 T（真实秒），phase 起始角。children 是卫星模型（朝向：帆板沿径向会更好看，这里让它的 −z 朝运动方向） */
export function Circle({ r, T, phase = 0, children, run = true, at }: { r: number; T: number; phase?: number; children: ReactNode; run?: boolean; at?: (ang: number) => void }) {
  const g = useRef<THREE.Group>(null), ang = useRef(phase)
  useFrame((_, dt) => {
    if (run) ang.current += 2 * Math.PI * Math.min(dt, 0.05) * SIM / T
    const a = ang.current
    g.current?.position.set(Math.cos(a) * r, 0, -Math.sin(a) * r)
    if (g.current) g.current.rotation.y = a
    at?.(a)
  })
  return <group ref={g}>{children}</group>
}
