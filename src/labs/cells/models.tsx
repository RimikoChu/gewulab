// 细胞实验室里的三样大件：显微镜、细胞模型（植物和动物）、正在分裂的细胞。都是用基本形状拼的，大小和数量是示意。
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { useSlide } from '@/lab-kit'
import { chromosomes, has, type CellKind, type PartKey, type ScopeKey } from './physics'

type V3 = [number, number, number]
const GLOW = '#35c7b3'

/** 显微镜：glow 是要点亮的那一部分；objective 是转到哪个物镜（0、1、2） */
export function Microscope({ position, glow, objective = 0 }: { position: V3; glow: ScopeKey | null; objective?: number }) {
  const m = (k: ScopeKey | null, color: string, metal = 0.5) => <meshStandardMaterial color={glow && glow === k ? GLOW : color} emissive={glow && glow === k ? GLOW : '#000000'} emissiveIntensity={glow && glow === k ? 0.45 : 0} metalness={metal} roughness={0.4} />
  return (
    <group position={position}>
      <mesh position={[0, 0.035, 0]} castShadow><boxGeometry args={[0.52, 0.07, 0.64]} />{m(null, '#22272b')}</mesh>
      <mesh position={[0, 0.48, -0.22]} castShadow><boxGeometry args={[0.1, 0.84, 0.13]} />{m(null, '#2b3136')}</mesh>
      <mesh position={[0, 0.9, -0.08]} castShadow><boxGeometry args={[0.1, 0.12, 0.4]} />{m(null, '#2b3136')}</mesh>
      {/* 镜筒、目镜、转换器和三个物镜 */}
      <mesh position={[0, 0.86, 0.08]}><cylinderGeometry args={[0.055, 0.055, 0.42, 20]} />{m(null, '#3a4147')}</mesh>
      <mesh position={[0, 1.12, 0.08]}><cylinderGeometry args={[0.04, 0.045, 0.12, 20]} />{m('lens', '#111417')}</mesh>
      <mesh position={[0, 0.63, 0.08]}><cylinderGeometry args={[0.12, 0.12, 0.035, 24]} />{m(null, '#4a5158')}</mesh>
      {[0.07, 0.11, 0.16].map((len, i) => (
        <group key={i} position={[(i - objective) * 0.085, 0.61 - len / 2, 0.08]}>
          <mesh><cylinderGeometry args={[0.03, 0.026, len, 14]} />{m('lens', i === objective ? '#d9dde0' : '#8a9197', 0.8)}</mesh>
          {i === objective && <mesh position={[0, len / 2 - 0.012, 0]}><cylinderGeometry args={[0.033, 0.033, 0.014, 14]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} /></mesh>}
        </group>
      ))}
      {/* 粗准焦螺旋（大）和细准焦螺旋（小），两侧各一个 */}
      {[-1, 1].map(s => <group key={s}>
        <mesh position={[s * 0.1, 0.55, -0.22]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.075, 0.075, 0.06, 20]} />{m('focus', '#596168')}</mesh>
        <mesh position={[s * 0.115, 0.4, -0.22]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.042, 0.042, 0.05, 16]} />{m('focus', '#7a838a')}</mesh>
      </group>)}
      {/* 载物台、通光孔、压片夹、一张玻片 */}
      <mesh position={[0, 0.4, 0.08]} castShadow><boxGeometry args={[0.44, 0.03, 0.44]} />{m('stage', '#1c2024')}</mesh>
      <mesh position={[0, 0.417, 0.08]}><cylinderGeometry args={[0.03, 0.03, 0.004, 16]} /><meshBasicMaterial color="#f6f2d8" toneMapped={false} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 0.13, 0.425, 0.02]}><boxGeometry args={[0.02, 0.01, 0.2]} />{m('stage', '#b9c0c5', 0.8)}</mesh>)}
      <mesh position={[0, 0.42, 0.08]}><boxGeometry args={[0.3, 0.006, 0.1]} /><meshStandardMaterial color="#d8eef2" transparent opacity={0.5} roughness={0.05} /></mesh>
      {/* 遮光器和反光镜 */}
      <mesh position={[0.03, 0.375, 0.08]}><cylinderGeometry args={[0.11, 0.11, 0.012, 24]} />{m('light', '#3d444a')}</mesh>
      <mesh position={[0, 0.17, 0.08]} rotation-x={-0.7}><cylinderGeometry args={[0.085, 0.085, 0.015, 24]} />{m('light', '#e8eef2', 0.95)}</mesh>
    </group>
  )
}

/** 一个放大的细胞模型。glow 是点亮的结构（可以是几个）；点亮了一些，别的就变淡 */
export function Cell({ position, kind, glow = [] }: { position: V3; kind: CellKind; glow?: PartKey[] }) {
  const lit = (k: PartKey) => glow.length === 0 || glow.includes(k)
  const mat = (k: PartKey, color: string, opacity = 1) => <meshStandardMaterial color={color} roughness={0.5} transparent opacity={opacity * (lit(k) ? 1 : 0.3)} depthWrite={opacity >= 1 && lit(k)} emissive={glow.includes(k) ? color : '#000000'} emissiveIntensity={glow.includes(k) ? 0.35 : 0} side={opacity < 1 ? THREE.DoubleSide : THREE.FrontSide} />
  const plant = kind === 'plant'
  const shell = (s: V3, part: PartKey, color: string, opacity: number): ReactNode => plant
    ? <mesh><boxGeometry args={s} />{mat(part, color, opacity)}</mesh>
    : <mesh scale={[s[0] / 2, s[1] / 2, s[2] / 2]}><sphereGeometry args={[1, 32, 20]} />{mat(part, color, opacity)}</mesh>
  return (
    <group position={position}>
      <mesh position={[0, -0.78, 0]} castShadow><cylinderGeometry args={[0.5, 0.6, 0.08, 32]} /><meshStandardMaterial color="#2a3136" roughness={0.6} /></mesh>
      <mesh position={[0, -0.68, -0.2]}><cylinderGeometry args={[0.025, 0.025, 0.2, 8]} /><meshStandardMaterial color="#5a6068" metalness={0.5} /></mesh>
      {has(kind, 'wall') && shell([1.9, 1.24, 0.56], 'wall', '#6fae4f', 0.32)}
      {shell([1.78, 1.12, 0.48], 'membrane', plant ? '#f0cf62' : '#f2b890', 0.3)}
      {shell([1.72, 1.06, 0.42], 'cytoplasm', plant ? '#d6edc6' : '#fbe3d2', 0.22)}
      {has(kind, 'vacuole') && <mesh position={[0.22, -0.02, 0]} scale={[0.56, 0.4, 0.17]}><sphereGeometry args={[1, 28, 18]} />{mat('vacuole', '#6fb7e8', 0.6)}</mesh>}
      <mesh position={[plant ? -0.56 : 0, plant ? 0.2 : 0.02, 0]}><sphereGeometry args={[0.17, 24, 18]} />{mat('nucleus', '#7a4fb0')}</mesh>
      <mesh position={[plant ? -0.52 : 0.04, plant ? 0.24 : 0.06, 0.12]}><sphereGeometry args={[0.055, 14, 10]} />{mat('nucleus', '#4b2b78')}</mesh>
      {has(kind, 'chloroplast') && [[-0.7, -0.3], [-0.3, -0.42], [0.1, 0.42], [0.55, 0.43], [0.72, -0.4], [-0.25, 0.42]].map(([x, y], i) => <mesh key={i} position={[x, y, 0.06]} rotation-z={i * 0.9} scale={[1, 0.55, 0.5]}><sphereGeometry args={[0.095, 14, 10]} />{mat('chloroplast', '#2f9a45')}</mesh>)}
      {(plant ? [[-0.76, 0.02], [0.78, 0.08], [-0.05, -0.44], [0.4, -0.44]] : [[-0.45, 0.2], [0.45, 0.22], [-0.38, -0.25], [0.42, -0.24], [0, 0.36]]).map(([x, y], i) => <mesh key={i} position={[x, y, 0.08]} rotation-z={0.5 + i * 1.1}><capsuleGeometry args={[0.035, 0.09, 6, 10]} />{mat('mito', '#f08a3c')}</mesh>)}
    </group>
  )
}

/** 正在分裂的细胞。step：做到第几步（0 还没开始，1 染色体复制，2 核一分为二，3 质分成两份，4 分成两个细胞） */
export function Dividing({ position, kind, step }: { position: V3; kind: CellKind; step: number }) {
  const apart = useSlide(step >= 2 ? 0.42 : 0, 0.5), split = useSlide(step >= 4 ? 1 : 0, 0.8), plant = kind === 'plant'
  const counts = chromosomes(step), nuclei = counts.length === 1 ? [0] : [-apart, apart]
  const rods = (n: number) => Array.from({ length: n }, (_, i) => <mesh key={i} position={[((i % 4) - 1.5) * 0.045, (Math.floor(i / 4) - (n > 4 ? 0.5 : 0)) * 0.085, 0.12]} rotation-z={0.5 + i}><capsuleGeometry args={[0.013, 0.05, 4, 8]} /><meshBasicMaterial color={i % 2 ? '#ffd27a' : '#ff8fb3'} toneMapped={false} /></mesh>)
  const body = (x: number, w: number) => plant
    ? <mesh position={[x, 0, 0]}><boxGeometry args={[w, 1.1, 0.46]} /><meshStandardMaterial color="#d6edc6" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    : <mesh position={[x, 0, 0]} scale={[w / 2, 0.55, 0.23]}><sphereGeometry args={[1, 32, 20]} /><meshStandardMaterial color="#fbe3d2" transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} /></mesh>
  return (
    <group position={position}>
      <mesh position={[0, -0.78, 0]} castShadow><cylinderGeometry args={[0.5, 0.6, 0.08, 32]} /><meshStandardMaterial color="#2a3136" roughness={0.6} /></mesh>
      {plant && <mesh><boxGeometry args={[1.9, 1.24, 0.54]} /><meshStandardMaterial color="#6fae4f" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
      {plant || split < 0.05 ? body(0, 1.74) : <>{body(-0.44 - split * 0.1, 0.9)}{body(0.44 + split * 0.1, 0.9)}</>}
      {/* 第 3 步：细胞质从中间分开的那条线；第 4 步：植物细胞在这里长出新的细胞膜和细胞壁 */}
      {step >= 3 && (plant || split < 0.05) && <mesh><boxGeometry args={[plant && step >= 4 ? 0.07 : 0.02, plant ? 1.12 : 0.9, 0.44]} /><meshStandardMaterial color={plant && step >= 4 ? '#6fae4f' : '#f0cf62'} transparent opacity={plant && step >= 4 ? 0.9 : 0.6} /></mesh>}
      {nuclei.map((x, i) => (
        <group key={i} position={[x + (nuclei.length > 1 && !plant ? Math.sign(x) * split * 0.1 : 0), 0, 0]}>
          <mesh><sphereGeometry args={[step === 1 ? 0.21 : 0.17, 24, 18]} /><meshStandardMaterial color="#7a4fb0" transparent opacity={0.55} depthWrite={false} /></mesh>
          {rods(counts[i])}
        </group>
      ))}
    </group>
  )
}
