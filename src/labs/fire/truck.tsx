// 消防车：一辆水罐消防车，按真车的比例（长约 9.6 m、宽 2.5 m、高约 3.3 m）。
// 驾驶室是双排座，带挡风玻璃和侧窗、车顶一排警灯；后面是器材厢，两侧各四扇卷帘门；厢顶一架拉梯、前头一门水炮；三根轴，轮毂、挡泥板都有。
// 原点在车头保险杠下面的地面中点，车头朝 −x。尺寸按米写，乘 M。
import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Metal, disc } from '@/lab-kit'

import { makeSign } from './mats'

/** 1 m 在画面里多长：和 world.tsx 的 M 一样（这里不引用 world，免得两个文件互相引用） */
const M = 6

/** 卷帘门：一条条横的铝片，片与片之间一道暗缝 */
function shutterTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256
  const g = c.getContext('2d')!
  for (let y = 0; y < 256; y += 8) { const q = g.createLinearGradient(0, y, 0, y + 8); q.addColorStop(0, '#e4e7e9'); q.addColorStop(0.6, '#b9bec2'); q.addColorStop(1, '#6d7276'); g.fillStyle = q; g.fillRect(0, y, 64, 8) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); t.anisotropy = 8
  return t
}

const RED = <meshPhysicalMaterial color="#c21d16" roughness={0.28} clearcoat={0.9} clearcoatRoughness={0.12} />
const GLASS = <meshPhysicalMaterial color="#1d2a33" roughness={0.05} metalness={0.2} clearcoat={1} envMapIntensity={1.8} />
const BLACK = <meshStandardMaterial color="#17181a" roughness={0.7} />

function Wheel({ x, z }: { x: number; z: number }) {
  const rim = useMemo(() => disc(0.3 * M, 0.06 * M, { hole: 0.06 * M }), [])
  const s = Math.sign(z)
  return <group position={[x * M, 0.52 * M, z * M]} rotation-x={Math.PI / 2}>
    <mesh castShadow><cylinderGeometry args={[0.52 * M, 0.52 * M, 0.38 * M, 32]} />{BLACK}</mesh>
    <mesh position={[0, s * 0.17 * M, 0]} rotation-x={s > 0 ? Math.PI : 0}><torusGeometry args={[0.46 * M, 0.06 * M, 8, 32]} />{BLACK}</mesh>
    {/* 轮毂：一只银色的钢圈，中间一个轮心盖 */}
    <mesh geometry={rim} position={[0, s * 0.16 * M, 0]} rotation-x={s > 0 ? 0 : Math.PI}><Metal kind="aluminum" grain="turned" rough={0.3} /></mesh>
    <mesh position={[0, s * 0.21 * M, 0]}><cylinderGeometry args={[0.09 * M, 0.11 * M, 0.06 * M, 16]} /><Metal kind="chrome" rough={0.15} /></mesh>
  </group>
}
/** 挡泥板：轮子上面一道半圆的黑色弧板 */
function Fender({ x, z, w = 0.42 }: { x: number; z: number; w?: number }) {
  return <mesh position={[x * M, 0.55 * M, z * M]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.62 * M, 0.62 * M, w * M, 24, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#1b1c1e" roughness={0.6} side={THREE.DoubleSide} /></mesh>
}

export function FireTruck() {
  const shutter = useMemo(shutterTex, [])
  const door = useMemo(() => makeSign(['119'], '#c21d16', '#ffffff', 256, 160), [])
  const W = 2.5, half = W / 2
  return <group>
    {/* 底盘：一根黑色的大梁，前后保险杠 */}
    <mesh position={[4.8 * M, 0.75 * M, 0]} castShadow><boxGeometry args={[9.2 * M, 0.3 * M, 1.0 * M]} />{BLACK}</mesh>
    <RoundedBox args={[0.25 * M, 0.35 * M, W * M]} radius={0.05 * M} position={[0.12 * M, 0.75 * M, 0]} castShadow><Metal kind="chrome" rough={0.2} /></RoundedBox>
    {/* 驾驶室：双排座，圆角；前脸一块格栅、两只大灯 */}
    <RoundedBox args={[2.3 * M, 2.0 * M, W * M]} radius={0.22 * M} smoothness={4} position={[1.35 * M, 2.1 * M, 0]} castShadow receiveShadow>{RED}</RoundedBox>
    <mesh position={[0.19 * M, 1.35 * M, 0]}><boxGeometry args={[0.04 * M, 0.5 * M, 1.4 * M]} /><meshStandardMaterial color="#26282b" metalness={0.6} roughness={0.4} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[0.2 * M, 1.35 * M, s * 0.95 * M]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.13 * M, 0.13 * M, 0.04 * M, 20]} /><meshBasicMaterial color="#fff6dc" toneMapped={false} /></mesh>)}
    {/* 挡风玻璃（略往后倾）和侧窗：前排、后排各一扇 */}
    <mesh position={[0.2 * M, 2.45 * M, 0]} rotation-z={-0.08}><boxGeometry args={[0.04 * M, 0.95 * M, (W - 0.3) * M]} />{GLASS}</mesh>
    {[-1, 1].flatMap(s => [0.75, 1.85].map(x => <mesh key={`${s}${x}`} position={[x * M, 2.5 * M, s * (half + 0.005) * M]}><boxGeometry args={[0.85 * M, 0.75 * M, 0.02 * M]} />{GLASS}</mesh>))}
    {[-1, 1].map(s => <mesh key={s} position={[1.3 * M, 1.6 * M, s * (half + 0.01) * M]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[0.7 * M, 0.44 * M]} /><meshStandardMaterial map={door} roughness={0.4} /></mesh>)}
    {/* 后视镜、上车踏板 */}
    {[-1, 1].map(s => <group key={s}>
      <mesh position={[0.35 * M, 2.4 * M, s * (half + 0.25) * M]} castShadow><boxGeometry args={[0.06 * M, 0.42 * M, 0.2 * M]} />{BLACK}</mesh>
      <mesh position={[0.5 * M, 2.4 * M, s * (half + 0.12) * M]}><boxGeometry args={[0.3 * M, 0.03 * M, 0.03 * M]} />{BLACK}</mesh>
      <mesh position={[1.35 * M, 0.72 * M, s * (half - 0.05) * M]}><boxGeometry args={[1.9 * M, 0.05 * M, 0.3 * M]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    </group>)}
    {/* 驾驶室顶的警灯：红蓝两色的一排 */}
    <RoundedBox args={[0.4 * M, 0.14 * M, 1.8 * M]} radius={0.05 * M} position={[0.9 * M, 3.17 * M, 0]}><meshStandardMaterial color="#2a2b2e" /></RoundedBox>
    {[-3, -2, -1, 1, 2, 3].map(i => <mesh key={i} position={[0.9 * M, 3.26 * M, i * 0.26 * M]}><boxGeometry args={[0.3 * M, 0.08 * M, 0.2 * M]} /><meshStandardMaterial color={i < 0 ? '#ff2a1f' : '#2f6fff'} emissive={i < 0 ? '#ff2a1f' : '#2f6fff'} emissiveIntensity={1.4} toneMapped={false} transparent opacity={0.9} /></mesh>)}
    {/* 器材厢 */}
    <RoundedBox args={[6.9 * M, 2.0 * M, W * M]} radius={0.1 * M} smoothness={3} position={[5.95 * M, 2.1 * M, 0]} castShadow receiveShadow>{RED}</RoundedBox>
    {/* 两侧的卷帘门：四扇，每扇一圈铝框 */}
    {[-1, 1].flatMap(s => [0, 1, 2, 3].map(i => <group key={`${s}${i}`} position={[(3.15 + i * 1.6) * M, 2.15 * M, s * (half + 0.01) * M]} rotation-y={s > 0 ? 0 : Math.PI}>
      <mesh><planeGeometry args={[1.4 * M, 1.55 * M]} /><meshStandardMaterial map={shutter} metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, -0.8 * M, 0.02 * M]}><boxGeometry args={[1.44 * M, 0.08 * M, 0.04 * M]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[0, -0.72 * M, 0.04 * M]}><boxGeometry args={[0.3 * M, 0.05 * M, 0.04 * M]} /><Metal kind="chrome" /></mesh>
    </group>))}
    {/* 车身下沿一道白色反光条 */}
    {[-1, 1].map(s => <mesh key={s} position={[4.8 * M, 1.22 * M, s * (half + 0.012) * M]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[9.1 * M, 0.12 * M]} /><meshStandardMaterial color="#f4f2ea" emissive="#555" roughness={0.3} /></mesh>)}
    {/* 厢顶：一圈栏杆、一架铝合金拉梯（两根梯梁、一档档横档） */}
    {[-1, 1].map(s => <mesh key={s} position={[6.2 * M, 3.3 * M, s * 1.1 * M]}><boxGeometry args={[6.2 * M, 0.04 * M, 0.04 * M]} /><Metal kind="aluminum" /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[6.0 * M, 3.22 * M, s * 0.28 * M]} castShadow><boxGeometry args={[6.4 * M, 0.08 * M, 0.06 * M]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    {Array.from({ length: 21 }, (_, i) => <mesh key={i} position={[(2.95 + i * 0.3) * M, 3.22 * M, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.018 * M, 0.018 * M, 0.56 * M, 8]} /><Metal kind="aluminum" /></mesh>)}
    {/* 轮子和挡泥板：前一根轴，后两根轴 */}
    {[1.35, 6.3, 7.7].flatMap(x => [-1, 1].map(s => <group key={`${x}${s}`}><Wheel x={x} z={s * (half - 0.28)} /><Fender x={x} z={s * (half - 0.25)} /></group>))}
  </group>
}
