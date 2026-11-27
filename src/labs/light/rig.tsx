// 第 3 课的双缝干涉仪：光源、滤光片、单缝、双缝、遮光筒、测量头，一字排在导轨上。和课本上“用双缝干涉测量光的波长”的那套器材一样。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal, bolts, lathe, shell } from '@/lab-kit'
import { Anod, Carrier, ENV, Glow, Plastic, Rail, Shaft, SlitHolder } from './gear'
import { AX, ST } from './world'

const X0 = ST.rig
/** 各件在导轨上的位置 */
export const RIG_X = { lamp: X0 - 2.0, filter: X0 - 1.4, single: X0 - 1.0, double: X0 - 0.6, tube0: X0 - 0.47, tube1: X0 + 1.2, head: X0 + 1.45 }

// 灯罩：一只立着的圆筒，顶上收口带一圈散热孔，侧面伸出一段出光筒
const HOUSE = shell([[0, 0], [0.2, 0], [0.21, 0.01], [0.21, 0.5], [0.17, 0.56], [0.1, 0.58], [0.1, 0.63]], 0.012, { segs: 40 })
const SNOUT = shell([[0.105, 0], [0.105, 0.2], [0.115, 0.2], [0.115, 0.23]], 0.012, { segs: 32 })
const CAP = lathe([[0, 0.62], [0.13, 0.62], [0.14, 0.63], [0.14, 0.65], [0.12, 0.665], [0, 0.665]], { segs: 32 })
/** 光源：白炽灯装在灯罩里，光从侧面的出光筒射出来 */
export function LampHouse({ x, y = AX }: { x: number; y?: number }) {
  return <group>
    <group position={[x, y - 0.3, 0]}>
      <mesh geometry={HOUSE} castShadow><meshStandardMaterial color="#23272c" metalness={0.6} roughness={0.5} envMapIntensity={ENV} /></mesh>
      <mesh geometry={CAP}><Anod rough={0.5} /></mesh>
      {/* 散热缝：灯罩上一圈竖缝，透出里面的亮光 */}
      {Array.from({ length: 10 }, (_, i) => i / 10 * Math.PI * 2).map(a => Math.abs(Math.cos(a)) > 0.86 && Math.sin(a) < 0.6 && Math.cos(a) > 0 ? null : <mesh key={a} position={[Math.cos(a) * 0.2115, 0.42, Math.sin(a) * 0.2115]} rotation-y={Math.PI / 2 - a}><planeGeometry args={[0.02, 0.1]} /><meshBasicMaterial color="#ffb768" toneMapped={false} /></mesh>)}
      <group position={[0.18, 0.3, 0]} rotation-z={-Math.PI / 2}>
        <mesh geometry={SNOUT} castShadow><Anod /></mesh>
        <mesh position-y={0.19} rotation-x={-Math.PI / 2}><circleGeometry args={[0.094, 28]} /><meshBasicMaterial color="#fff1d6" toneMapped={false} /></mesh>
      </group>
      <pointLight position={[0.5, 0.3, 0.2]} intensity={0.5} distance={2.2} decay={1.6} color="#ffd9a0" />
    </group>
    <Carrier x={x} y={y - 0.3} />
  </group>
}

/** 滤光片：夹持架里一块有颜色的玻璃，只让一种颜色的光过去 */
export function Filter({ x, color }: { x: number; color: string }) {
  return <SlitHolder x={x} slits={0}>
    <mesh rotation-z={Math.PI / 2} renderOrder={3}><cylinderGeometry args={[0.136, 0.136, 0.016, 40]} /><meshPhysicalMaterial color={color} transparent opacity={0.62} roughness={0.04} emissive={color} emissiveIntensity={0.22} envMapIntensity={2} depthWrite={false} /></mesh>
  </SlitHolder>
}

const TUBE = shell([[0.19, 0], [0.205, 0], [0.205, 0.02], [0.185, 0.028], [0.185, 1], [0.205, 1.008], [0.205, 1.028], [0.19, 1.028]], 0.012, { segs: 48 })
const RING = lathe([[0.186, 0], [0.215, 0], [0.22, 0.005], [0.22, 0.055], [0.215, 0.06], [0.186, 0.06]], { segs: 48, closed: true })
/** 遮光筒：一根黑色的长筒，两端各一圈法兰，由两只抱箍托在滑座上 */
export function Tube({ x0, x1 }: { x0: number; x1: number }) {
  const len = x1 - x0
  return <group>
    <group position={[x0, AX, 0]} rotation-z={-Math.PI / 2}>
      <mesh geometry={TUBE} scale={[1, len / 1.028, 1]} castShadow><meshStandardMaterial color="#111316" metalness={0.5} roughness={0.55} envMapIntensity={ENV} /></mesh>
      {[0.22, 0.78].map(k => <mesh key={k} geometry={RING} position-y={len * k - 0.03}><Metal kind="aluminum" grain="turned" env={ENV} /></mesh>)}
    </group>
    {[0.22, 0.78].map(k => <group key={k}>
      <mesh position={[x0 + len * k, AX - 0.235, 0]}><boxGeometry args={[0.08, 0.035, 0.1]} /><Metal kind="aluminum" grain="brushed" env={ENV} /></mesh>
      <Carrier x={x0 + len * k} y={AX - 0.25} />
    </group>)}
  </group>
}

const DRUM = lathe([[0.19, 0], [0.26, 0], [0.27, 0.01], [0.27, 0.2], [0.26, 0.21], [0.12, 0.21], [0.12, 0.24], [0.095, 0.24], [0.095, 0.5], [0.105, 0.5], [0.115, 0.52], [0.115, 0.58], [0.085, 0.58], [0.085, 0.55], [0, 0.55]], { segs: 48 })
const DRUM_BOLTS = bolts(6, 0.225, 0.03, 0.012)
const BARREL = lathe([[0, 0], [0.045, 0], [0.045, 0.22], [0.04, 0.225], [0, 0.225]], { segs: 28 })
const THIMBLE = lathe([[0.047, 0], [0.062, 0.02], [0.066, 0.02], [0.066, 0.17], [0.062, 0.175], [0.062, 0.2], [0.05, 0.205], [0, 0.205]], { segs: 36 })
let knurl: THREE.CanvasTexture | null = null
/** 手轮上的滚花和一圈刻度 */
function getKnurl() {
  if (knurl) return knurl
  const c = document.createElement('canvas'); c.width = 256; c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#9a9c9e'; g.fillRect(0, 0, 256, 64)
  for (let i = 0; i < 64; i++) { g.fillStyle = i % 2 ? '#5d6064' : '#c9cbcd'; g.fillRect(i * 4, 22, 2, 42) }
  g.fillStyle = '#111'; for (let i = 0; i < 50; i++) g.fillRect(i * 5.12, 0, 1.2, i % 5 === 0 ? 16 : 9)
  knurl = new THREE.CanvasTexture(c); knurl.colorSpace = THREE.SRGBColorSpace; knurl.wrapS = THREE.RepeatWrapping; knurl.anisotropy = 8
  return knurl
}
/** 测量头：前面一只装毛玻璃屏和分划板的圆鼓，后面是目镜，侧面伸出带刻度的手轮。turn：手轮转过的角度；glow：目镜里透出来的颜色 */
export function Head({ x, turn, glow }: { x: number; turn: number; glow: string }) {
  const wheel = useRef<THREE.Group>(null), cur = useRef(turn)
  useFrame((_, dt) => { cur.current += (turn - cur.current) * Math.min(1, dt * 10); if (wheel.current) wheel.current.rotation.y = cur.current })
  const tex = useMemo(getKnurl, [])
  return <group>
    <group position={[x - 0.25, AX, 0]}>
      <group rotation-z={-Math.PI / 2}>
        <mesh geometry={DRUM} castShadow><Anod rough={0.38} /></mesh>
        <mesh geometry={DRUM_BOLTS} position-y={0.21}><Metal kind="steel" env={ENV} /></mesh>
        {/* 目镜的橡胶眼罩和里面透出的光 */}
        <mesh position-y={0.59}><cylinderGeometry args={[0.12, 0.112, 0.05, 28, 1, true]} /><meshStandardMaterial color="#0c0d0f" roughness={0.9} side={THREE.DoubleSide} /></mesh>
        <mesh position-y={0.552} rotation-x={-Math.PI / 2}><circleGeometry args={[0.084, 24]} /><Glow color={glow} opacity={0.75} /></mesh>
      </group>
      {/* 手轮：固定的套管朝前伸出来，外面套着能转的微分筒 */}
      <group position={[0.105, 0, 0.24]} rotation-x={Math.PI / 2}>
        <mesh geometry={BARREL}><Metal kind="stainless" grain="turned" env={ENV} /></mesh>
        <group ref={wheel} position-y={0.12}><mesh geometry={THIMBLE} castShadow><meshStandardMaterial map={tex} metalness={0.9} roughness={0.35} envMapIntensity={ENV} /></mesh></group>
      </group>
      <mesh position={[0.105, -0.3, 0]}><boxGeometry args={[0.1, 0.06, 0.1]} /><Metal kind="aluminum" grain="brushed" env={ENV} /></mesh>
    </group>
    <Carrier x={x - 0.145} y={AX - 0.33} />
  </group>
}

/** 整套双缝干涉仪。color：滤光片的颜色；turn：手轮转过的角度 */
export function Rig({ color, turn }: { color: string; turn: number }) {
  const X = RIG_X
  return <>
    <Rail x0={X0 - 2.5} x1={X0 + 2.15} perM={2.6} />
    <LampHouse x={X.lamp} />
    <Shaft a={[X.lamp + 0.41, AX, 0]} b={[X.filter, AX, 0]} r={0.09} color="#ffe2b0" k={1.2} />
    <Filter x={X.filter} color={color} />
    <Shaft a={[X.filter, AX, 0]} b={[X.single, AX, 0]} r={0.085} color={color} k={1.6} />
    <SlitHolder x={X.single} slits={1} spot={color} />
    <Shaft a={[X.single, AX, 0]} b={[X.double, AX, 0]} r={0.03} color={color} k={2.4} />
    <SlitHolder x={X.double} slits={2} spot={color} />
    <Shaft a={[X.double, AX, 0]} b={[X.tube0, AX, 0]} r={0.04} color={color} k={2} />
    <Tube x0={X.tube0} x1={X.tube1} />
    <Head x={X.head} turn={turn} glow={color} />
    <pointLight position={[X.filter + 0.3, AX + 0.1, 0.4]} intensity={0.5} distance={2} decay={1.6} color={color} />
  </>
}
