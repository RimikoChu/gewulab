// 地球的运动 · 拓展课里“傅科摆”的三维场景：操场南边的一座高架子，吊着一只长摆，地上一圈刻度。
// 摆动面相对地面慢慢转。其余两个小实验用的是第 4、6 课的场景。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LabStage, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { DAYLIGHT } from './space'
import { GROUND, type Want } from './world'

const [GX, GY, GZ] = GROUND, PX = 0, PZ = 78            // 傅科摆在操场南边
const H = 16, R = 6.5                                    // 架子高度、地上刻度圈的半径
const TARGET = new THREE.Vector3(GX + PX, GY + 6.5, GZ + PZ)
const SPAN: [number, number] = [26, 19]
const VIEW: [number, number] = [0.5, 0.5]
const RAD = Math.PI / 180

/** 摆：一根细线吊着一只铜球，来回摆。它在画布里面，才能逐帧动 */
function Swing() {
  const bob = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (bob.current) bob.current.rotation.x = Math.sin(clock.elapsedTime * 1.25) * 0.36 })
  return (
    <group ref={bob}>
      <mesh position={[0, -(H - 1.4) / 2, 0]}><cylinderGeometry args={[0.025, 0.025, H - 1.4, 8]} /><meshStandardMaterial color="#22262a" /></mesh>
      <mesh position={[0, -(H - 1.4), 0]} castShadow><sphereGeometry args={[0.55, 32, 24]} /><meshStandardMaterial color="#c9a23a" metalness={1} roughness={0.25} /></mesh>
    </group>
  )
}

export default function PendulumScene({ turned, place }: { turned: number; place: string }) {
  const frame = useMemo(() => {
    const P: Part[] = []
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push({ p: [sx * 4.2, H / 2, sz * 4.2], s: [0.3, H + 0.6, 0.3], c: '#59626b', r: [sz * 0.26, 0, -sx * 0.26] })
    P.push({ p: [0, H + 0.1, 0], s: [1.2, 0.5, 1.2], c: '#3c4249' }, { p: [0, 0.03, 0], s: [R + 0.6, 0.06, R + 0.6], c: '#d8d4c8', cyl: true })
    for (let d = 0; d < 360; d += 10) { const a = d * RAD; P.push({ p: [Math.sin(a) * R * 0.94, 0.07, -Math.cos(a) * R * 0.94], s: [0.07, 0.02, d % 30 ? 0.35 : 0.75], c: '#1d2327', r: [0, -a, 0] }) }
    return mergeParts(P)
  }, [])
  // 摆动面：从北往东转了 turned 度（北半球顺时针）
  const dir: [number, number] = [Math.sin(turned * RAD), -Math.cos(turned * RAD)]
  const labels: Label[] = [
    { id: 'turn', at: [GX + PX + dir[0] * (R + 1.2), GY + 0.8, GZ + PZ + dir[1] * (R + 1.2)], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>摆动面转过了</small>{turned.toFixed(1)}°</> },
    { id: 'start', at: [GX + PX, GY + 0.8, GZ + PZ - R - 1.2], ax: 0.5, className: 'scene-name -translate-y-full', children: '开始时朝这个方向摆' },
    { id: 'nP', at: [GX + PX + 5, GY + H * 0.7, GZ + PZ], name: true, className: 'scene-name -translate-y-1/2', children: `傅科摆 · ${place}` },
  ]
  return (
    <LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEW} {...DAYLIGHT} world={{}}>
      <group position={[GX + PX, GY, GZ + PZ]}>
        <directionalLight position={[10, 30, 20]} intensity={2.2} color="#fff6e6" />
        <mesh position={[0, -0.02, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[30, 48]} /><meshStandardMaterial color="#b9b7ad" roughness={1} /></mesh>
        <mesh geometry={frame} castShadow receiveShadow><Painted rough={0.7} metal={0.3} /></mesh>
        {/* 开始时的摆动方向（淡）和现在的摆动方向（亮） */}
        <mesh position={[0, 0.075, 0]}><boxGeometry args={[0.08, 0.01, R * 1.9]} /><meshBasicMaterial color="#9aa3ad" /></mesh>
        <mesh position={[0, 0.085, 0]} rotation-y={-turned * RAD}><boxGeometry args={[0.12, 0.01, R * 1.9]} /><meshBasicMaterial color="#ff5a3c" toneMapped={false} /></mesh>
        <group position={[0, H, 0]} rotation-y={-turned * RAD}>
          <Swing />
        </group>
      </group>
    </LabStage>
  )
}
