// 第 5 课的器材：缝宽可以调的单缝、两片装在转盘里的偏振片。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal, lathe } from '@/lab-kit'
import { Anod, Carrier, ENV, FRAME, Glow, KNOB, Plastic } from './gear'
import { AX } from './world'

const BARREL = lathe([[0, 0], [0.02, 0], [0.02, 0.1], [0, 0.1]], { segs: 20 })
const THIMBLE = lathe([[0.021, 0], [0.03, 0.01], [0.032, 0.01], [0.032, 0.09], [0.03, 0.1], [0, 0.1]], { segs: 24 })
/** 可调单缝：两片磨得很直的钢刀口，一片固定、一片由侧面的测微螺杆推着走。a：缝宽（mm）；画面上把缝画宽了，才看得见它在变 */
export function JawSlit({ x, a, spot }: { x: number; a: number; spot: string }) {
  const gap = 0.006 + a * 0.05, turn = useRef<THREE.Mesh>(null)
  useFrame(() => { if (turn.current) turn.current.rotation.y = a * 40 })
  return <group>
    <group position={[x, AX, 0]}>
      <mesh geometry={FRAME} castShadow><Anod /></mesh>
      {/* 两片刀口：朝缝的一边削成斜面 */}
      {[-1, 1].map(s => <group key={s} position={[0, 0, s * (gap / 2 + 0.07)]}>
        <mesh><boxGeometry args={[0.012, 0.26, 0.14]} /><Metal kind="stainless" grain="brushed" env={ENV} /></mesh>
        <mesh position={[-0.006, 0, -s * 0.066]} rotation-y={s * 0.5}><boxGeometry args={[0.004, 0.26, 0.012]} /><Metal kind="chrome" env={ENV} /></mesh>
      </group>)}
      <mesh position={[-0.0065, 0, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[gap, 0.05]} /><Glow color={spot} /></mesh>
      <mesh position={[0.0065, 0, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[gap, 0.2]} /><Glow color={spot} opacity={0.7} /></mesh>
      {/* 侧面的测微螺杆 */}
      <group position={[0, 0, 0.23]} rotation-x={Math.PI / 2}>
        <mesh geometry={BARREL}><Metal kind="stainless" grain="turned" env={ENV} /></mesh>
        <mesh ref={turn} geometry={THIMBLE} position-y={0.07 + a * 0.05}><Metal kind="aluminum" grain="turned" env={ENV} /></mesh>
      </group>
      <mesh geometry={KNOB} position={[0, 0.23, 0]}><Plastic /></mesh>
      <mesh position={[0, -0.27, 0]}><cylinderGeometry args={[0.016, 0.016, 0.08, 14]} /><Metal kind="stainless" env={ENV} /></mesh>
    </group>
    <Carrier x={x} y={AX - 0.29} />
  </group>
}

const MOUNT = lathe([[0.2, -0.03], [0.29, -0.03], [0.3, -0.02], [0.3, 0.02], [0.29, 0.03], [0.2, 0.03]], { segs: 64, closed: true })
const ROTOR = lathe([[0.17, -0.036], [0.2, -0.036], [0.2, 0.036], [0.17, 0.036]], { segs: 64, closed: true })
let dial: THREE.CanvasTexture | null = null
/** 转盘正面的一圈角度刻线 */
function getDial() {
  if (dial) return dial
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.translate(S / 2, S / 2); g.strokeStyle = '#e2e4e6'; g.fillStyle = '#e2e4e6'; g.font = '600 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let a = 0; a < 360; a += 10) {
    const r0 = S / 2 * (a % 90 === 0 ? 0.7 : a % 30 === 0 ? 0.74 : 0.78), r1 = S / 2 * 0.84, t = a * Math.PI / 180
    g.lineWidth = a % 30 === 0 ? 5 : 2.5; g.beginPath(); g.moveTo(Math.sin(t) * r0, -Math.cos(t) * r0); g.lineTo(Math.sin(t) * r1, -Math.cos(t) * r1); g.stroke()
    if (a % 90 === 0) g.fillText(String(a > 180 ? 360 - a : a), Math.sin(t) * S / 2 * 0.92, -Math.cos(t) * S / 2 * 0.92)
  }
  dial = new THREE.CanvasTexture(c); dial.colorSpace = THREE.SRGBColorSpace; dial.anisotropy = 8
  return dial
}
/** 偏振片：灰色的薄片装在能转的内圈里，外圈刻着角度。片上的一道亮线标出透振方向。deg：从竖直方向转过多少度 */
export function Polarizer({ x, deg, lit = 1 }: { x: number; deg: number; lit?: number }) {
  const tex = useMemo(getDial, []), a = deg * Math.PI / 180
  return <group>
    <group position={[x, AX, 0]}>
      <mesh geometry={MOUNT} rotation-z={-Math.PI / 2} castShadow><Anod /></mesh>
      <mesh position-x={-0.0305} rotation-y={-Math.PI / 2}><ringGeometry args={[0.2, 0.3, 64]} /><meshStandardMaterial map={tex} transparent roughness={0.6} /></mesh>
      <group rotation-x={a}>
        <mesh geometry={ROTOR} rotation-z={-Math.PI / 2}><Metal kind="aluminum" grain="turned" env={ENV} /></mesh>
        <mesh rotation-z={Math.PI / 2} renderOrder={3}><cylinderGeometry args={[0.17, 0.17, 0.01, 48]} /><meshPhysicalMaterial color="#59606a" transparent opacity={0.55} roughness={0.08} envMapIntensity={2.5} depthWrite={false} /></mesh>
        {/* 透振方向：片上一道细线，转盘边上一个红色的指针 */}
        {[-1, 1].map(s => <mesh key={s} position={[s * 0.006, 0, 0]} rotation-y={s * Math.PI / 2}><planeGeometry args={[0.008, 0.33]} /><Glow color="#ffffff" opacity={0.35 + 0.4 * lit} /></mesh>)}
        <mesh position={[-0.037, 0.185, 0]}><boxGeometry args={[0.006, 0.05, 0.022]} /><meshBasicMaterial color="#ff5a4a" toneMapped={false} /></mesh>
        <mesh geometry={KNOB} position={[0, 0.2, 0]} scale={0.8}><Plastic /></mesh>
      </group>
      <mesh position={[0, -0.33, 0]}><cylinderGeometry args={[0.016, 0.016, 0.08, 14]} /><Metal kind="stainless" env={ENV} /></mesh>
    </group>
    <Carrier x={x} y={AX - 0.35} />
  </group>
}
