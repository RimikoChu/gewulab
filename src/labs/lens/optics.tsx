// 光学暗室里反复用到的东西：一条光线、一块透镜、一支蜡烛（物体和它的像）、主光轴、一块光屏。
// 光路都画在正对镜头的那个竖直平面里（z = 0）。
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { LabStage, Rod, type Label } from '@/lab-kit'
import { DARK, SPOT } from './world'

type V2 = [number, number]
/** 这一课的舞台：选一处机位，暗室的设置都一样 */
export function Dark({ at, labels, children = null }: { at: keyof typeof SPOT; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  return <LabStage labels={labels} target={v.target} span={v.span} view={v.view} {...DARK}>{children}</LabStage>
}

/** 一条光线：从 a 到 b（都是平面里的坐标）。dash 画成虚线（反向延长线、虚像的光路） */
export function Ray({ a, b, color = '#ffd24a', r = 0.011, dash = false, z = 0 }: { a: V2; b: V2; color?: string; r?: number; dash?: boolean; z?: number }) {
  if (!dash) return <Rod from={[a[0], a[1], z]} to={[b[0], b[1], z]} r={r}><meshBasicMaterial color={color} toneMapped={false} /></Rod>
  const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.09))
  return <>{Array.from({ length: n }, (_, i) => i % 2 ? null : <Rod key={i} from={[a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, z]} to={[a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n, z]} r={r * 0.75}><meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} /></Rod>)}</>
}

/** 一块透镜，立在 x 处，中心在主光轴上。凸透镜中间厚，凹透镜中间薄 */
export function Lens({ x, y, h = 0.5, kind = 'convex', tint = '#9fd8ff' }: { x: number; y: number; h?: number; kind?: 'convex' | 'concave'; tint?: string }) {
  const m = <meshStandardMaterial color={tint} transparent opacity={0.42} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} emissive={tint} emissiveIntensity={0.25} />
  return (
    <group position={[x, y, 0]}>
      {kind === 'convex'
        ? <mesh scale={[0.16, 1, 0.5]}><sphereGeometry args={[h, 24, 24]} />{m}</mesh>
        : <>{[-1, 1].map(s => <mesh key={s} position={[0, s * h * 0.78, 0]}><boxGeometry args={[0.13, h * 0.44, h * 0.5]} />{m}</mesh>)}<mesh><boxGeometry args={[0.04, h * 1.2, h * 0.5]} />{m}</mesh></>}
      <mesh position={[0, -h - 0.12, 0.06]}><boxGeometry args={[0.03, 0.26, 0.03]} /><meshStandardMaterial color="#8f9499" metalness={0.6} roughness={0.4} /></mesh>
    </group>
  )
}

/** 一支蜡烛：底在主光轴上，高 h；h 是负数就倒过来画（倒立的像）。ghost 画成半透明（虚像） */
export function Candle({ x, y, h, ghost = false }: { x: number; y: number; h: number; ghost?: boolean }) {
  const up = h >= 0 ? 1 : -1, len = Math.abs(h), o = ghost ? 0.45 : 1
  return (
    <group position={[x, y, 0]} scale={[1, up, 1]}>
      <mesh position={[0, len * 0.38, 0]}><cylinderGeometry args={[len * 0.12 + 0.012, len * 0.12 + 0.012, len * 0.76, 12]} /><meshBasicMaterial color={ghost ? '#bfe3ff' : '#f1e6d0'} transparent opacity={o} toneMapped={false} /></mesh>
      <mesh position={[0, len * 0.88, 0]}><coneGeometry args={[len * 0.1 + 0.012, len * 0.26, 10]} /><meshBasicMaterial color="#ff9a3c" transparent opacity={o} toneMapped={false} /></mesh>
    </group>
  )
}

/** 主光轴：一条细细的点划线，上面标出焦点（F）和二倍焦距（2F）的位置 */
export function Axis({ x0, x1, y, marks = [] }: { x0: number; x1: number; y: number; marks?: number[] }) {
  return <>
    <Ray a={[x0, y]} b={[x1, y]} color="#7f8b96" r={0.004} dash z={-0.02} />
    {marks.map(x => <mesh key={x} position={[x, y, -0.02]}><sphereGeometry args={[0.022, 10, 8]} /><meshBasicMaterial color="#ff6b4a" toneMapped={false} /></mesh>)}
  </>
}

/** 光屏：一块立着的白板 */
export function Screen({ x, y, h = 0.6 }: { x: number; y: number; h?: number }) {
  return <group position={[x, y, 0]}><mesh position={[0.012, 0, 0]}><boxGeometry args={[0.02, h * 2, 0.5]} /><meshStandardMaterial color="#eef0ee" roughness={0.9} /></mesh><mesh position={[0, -h - 0.12, 0.06]}><boxGeometry args={[0.03, 0.26, 0.03]} /><meshStandardMaterial color="#8f9499" metalness={0.6} roughness={0.4} /></mesh></group>
}
