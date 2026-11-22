// 细胞实验室里的三样大件：显微镜、细胞模型（植物和动物）、正在分裂的细胞。都是用基本形状拼的，大小和数量是示意。
import { useMemo, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { disc, lathe, useSlide } from '@/lab-kit'
import { chromosomes, has, type CellKind, type PartKey, type ScopeKey } from './physics'

type V3 = [number, number, number]
const GLOW = '#35c7b3'

/** 显微镜：glow 是要点亮的那一部分；objective 是转到哪个物镜（0、1、2） */
export function Microscope({ position, glow, objective = 0 }: { position: V3; glow: ScopeKey | null; objective?: number }) {
  const m = (k: ScopeKey | null, color: string, metal = 0.5) => <meshPhysicalMaterial color={glow && glow === k ? GLOW : color} emissive={glow && glow === k ? GLOW : '#000000'} emissiveIntensity={glow && glow === k ? 0.45 : 0} metalness={metal} roughness={metal > 0.8 ? 0.22 : 0.42} clearcoat={metal < 0.5 ? 0.6 : 0} clearcoatRoughness={0.25} />
  const g = useMemo(() => {
    // 镜臂：侧面看是一道向后弓的弯臂，下端立在镜座上，上端托住镜筒
    const arm = new THREE.Shape(); arm.moveTo(-0.3, 0.07); arm.lineTo(-0.17, 0.07); arm.quadraticCurveTo(-0.2, 0.5, -0.1, 0.84); arm.lineTo(0.16, 0.84); arm.lineTo(0.16, 0.97); arm.lineTo(-0.16, 0.97); arm.quadraticCurveTo(-0.34, 0.6, -0.3, 0.07)
    const armG = new THREE.ExtrudeGeometry(arm, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 16 }); armG.translate(0, 0, -0.05); armG.rotateY(-Math.PI / 2)
    return {
      arm: armG,
      tube: lathe([[0, 0], [0.058, 0], [0.06, 0.004], [0.06, 0.36], [0.05, 0.37], [0.05, 0.42], [0.044, 0.425], [0, 0.425]]),
      eye: lathe([[0, 0], [0.04, 0], [0.04, 0.05], [0.05, 0.055], [0.05, 0.11], [0.046, 0.118], [0.03, 0.118], [0.026, 0.1], [0, 0.1]]),
      turret: disc(0.125, 0.04, { chamfer: 0.012 }),
      coarse: lathe([[0, 0], [0.066, 0], [0.078, 0.008], [0.078, 0.052], [0.066, 0.06], [0, 0.06]], { segs: 28 }),
      fine: lathe([[0, 0], [0.036, 0], [0.044, 0.006], [0.044, 0.044], [0.036, 0.05], [0, 0.05]], { segs: 22 }),
      obj: [0.07, 0.11, 0.16].map(len => lathe([[0, 0], [0.012, 0], [0.02, 0.012], [0.026, 0.014], [0.026, len - 0.03], [0.032, len - 0.026], [0.032, len], [0, len]], { segs: 20 })),
      mirror: disc(0.085, 0.016, { chamfer: 0.004 }),
    }
  }, [])
  return (
    <group position={position}>
      {/* 镜座：一块厚实的马蹄形底座；镜臂是一道弯臂 */}
      <RoundedBox args={[0.52, 0.07, 0.64]} radius={0.025} smoothness={4} position={[0, 0.035, 0]} castShadow>{m(null, '#1f2428', 0.35)}</RoundedBox>
      {[-0.2, 0.2].flatMap(x => [-0.26, 0.26].map(z => <mesh key={`${x}${z}`} position={[x, 0.004, z]}><cylinderGeometry args={[0.03, 0.03, 0.01, 12]} /><meshStandardMaterial color="#0e1012" roughness={0.9} /></mesh>))}
      <mesh geometry={g.arm} position={[0, 0, -0.02]} castShadow>{m(null, '#262c31', 0.4)}</mesh>
      {/* 镜筒、目镜、转换器和三个物镜 */}
      <mesh geometry={g.tube} position={[0, 0.65, 0.08]} castShadow>{m(null, '#2f363b', 0.6)}</mesh>
      <mesh geometry={g.eye} position={[0, 1.06, 0.08]}>{m('lens', '#111417', 0.5)}</mesh>
      <mesh geometry={g.turret} position={[0, 0.612, 0.08]}>{m(null, '#565e65', 0.9)}</mesh>
      {[0.07, 0.11, 0.16].map((len, i) => (
        <group key={i} position={[(i - objective) * 0.085, 0.61 - len, 0.08]}>
          <mesh geometry={g.obj[i]}>{m('lens', i === objective ? '#d9dde0' : '#9aa1a7', 1)}</mesh>
          <mesh position={[0, len * 0.55, 0]}><cylinderGeometry args={[0.0265, 0.0265, 0.012, 20]} /><meshStandardMaterial color={['#c63b3b', '#d9a62e', '#3b78c6'][i]} roughness={0.5} /></mesh>
          {i === objective && <mesh position={[0, len - 0.012, 0]}><cylinderGeometry args={[0.034, 0.034, 0.014, 20]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} /></mesh>}
        </group>
      ))}
      {/* 粗准焦螺旋（大）和细准焦螺旋（小），两侧各一个 */}
      {[-1, 1].map(s => <group key={s}>
        <mesh geometry={g.coarse} position={[s * 0.06, 0.55, -0.22]} rotation-z={-s * Math.PI / 2}>{m('focus', '#596168', 0.9)}</mesh>
        <mesh geometry={g.fine} position={[s * 0.06, 0.4, -0.22]} rotation-z={-s * Math.PI / 2}>{m('focus', '#8a939a', 0.9)}</mesh>
      </group>)}
      {/* 载物台、通光孔、压片夹、一张玻片 */}
      <RoundedBox args={[0.44, 0.03, 0.44]} radius={0.01} smoothness={3} position={[0, 0.4, 0.08]} castShadow>{m('stage', '#1c2024', 0.3)}</RoundedBox>
      <mesh position={[0, 0.417, 0.08]}><cylinderGeometry args={[0.03, 0.03, 0.004, 16]} /><meshBasicMaterial color="#f6f2d8" toneMapped={false} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 0.13, 0.425, 0.02]}><boxGeometry args={[0.02, 0.01, 0.2]} />{m('stage', '#b9c0c5', 0.8)}</mesh>)}
      <mesh position={[0, 0.42, 0.08]}><boxGeometry args={[0.3, 0.006, 0.1]} /><meshStandardMaterial color="#d8eef2" transparent opacity={0.5} roughness={0.05} /></mesh>
      {/* 遮光器和反光镜 */}
      <mesh position={[0.03, 0.375, 0.08]}><cylinderGeometry args={[0.11, 0.11, 0.012, 24]} />{m('light', '#3d444a')}</mesh>
      <mesh geometry={g.mirror} position={[0, 0.17, 0.08]} rotation-x={-0.7}>{m('light', '#e8eef2', 1)}</mesh>
      <mesh position={[0, 0.115, 0.08]}><cylinderGeometry args={[0.012, 0.012, 0.09, 10]} />{m(null, '#565e65', 0.9)}</mesh>
    </group>
  )
}

/** 一个放大的细胞模型，像教室里那种剖开的塑料模型：外面几层是半透明的壳，里面的结构做成有光泽的实心件。glow 是点亮的结构（可以是几个）；点亮了一些，别的就变淡 */
export function Cell({ position, kind, glow = [] }: { position: V3; kind: CellKind; glow?: PartKey[] }) {
  const lit = (k: PartKey) => glow.length === 0 || glow.includes(k)
  const mat = (k: PartKey, color: string, opacity = 1) => <meshPhysicalMaterial color={color} roughness={opacity < 1 ? 0.2 : 0.38} clearcoat={0.8} clearcoatRoughness={0.2} transparent opacity={opacity * (lit(k) ? 1 : 0.3)} depthWrite={opacity >= 1 && lit(k)} emissive={glow.includes(k) ? color : '#000000'} emissiveIntensity={glow.includes(k) ? 0.35 : 0} side={opacity < 1 ? THREE.DoubleSide : THREE.FrontSide} />
  const plant = kind === 'plant'
  const shell = (s: V3, part: PartKey, color: string, opacity: number): ReactNode => plant
    ? <RoundedBox args={s} radius={Math.min(0.16, s[2] * 0.4)} smoothness={6}>{mat(part, color, opacity)}</RoundedBox>
    : <mesh scale={[s[0] / 2, s[1] / 2, s[2] / 2]}><sphereGeometry args={[1, 48, 32]} />{mat(part, color, opacity)}</mesh>
  // 细胞质里撒一些小颗粒，看得出这是一团有东西的胶状物
  const dots = useMemo(() => { let sd = plant ? 5 : 9; const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296; return Array.from({ length: 46 }, () => { const a = r() * 6.283, q = Math.sqrt(r()); return [Math.cos(a) * q * (plant ? 0.8 : 0.7), Math.sin(a) * q * (plant ? 0.48 : 0.42), (r() - 0.5) * 0.24, 0.008 + r() * 0.012] as const }) }, [plant])
  return (
    <group position={position}>
      {/* 底座：带倒角的圆台和一根托杆 */}
      <mesh geometry={STANDS.base} position={[0, -0.82, 0]} castShadow><meshPhysicalMaterial color="#23292e" roughness={0.45} clearcoat={0.5} /></mesh>
      <mesh position={[0, -0.69, 0]}><cylinderGeometry args={[0.028, 0.028, 0.2, 14]} /><meshStandardMaterial color="#aab1b6" metalness={1} roughness={0.25} /></mesh>
      {has(kind, 'wall') && shell([1.94, 1.28, 0.6], 'wall', '#5fa040', 0.36)}
      {shell([1.8, 1.14, 0.5], 'membrane', plant ? '#f0cf62' : '#f2b890', 0.3)}
      {shell([1.72, 1.06, 0.42], 'cytoplasm', plant ? '#d6edc6' : '#fbe3d2', 0.22)}
      {dots.map(([x, y, z, r], i) => <mesh key={i} position={[x, y, z]}><sphereGeometry args={[r, 8, 6]} />{mat('cytoplasm', plant ? '#9fc487' : '#e9b99c')}</mesh>)}
      {has(kind, 'vacuole') && <mesh position={[0.22, -0.02, 0]} scale={[0.58, 0.4, 0.17]} renderOrder={2}><sphereGeometry args={[1, 40, 26]} />{mat('vacuole', '#4f9fdc', 0.8)}</mesh>}
      {/* 细胞核：外面一层半透明的核膜，里面是核仁 */}
      <group position={[plant ? -0.56 : 0, plant ? 0.2 : 0.02, 0.02]}>
        <mesh><sphereGeometry args={[0.185, 32, 24]} />{mat('nucleus', '#9a74c9', 0.55)}</mesh>
        <mesh><sphereGeometry args={[0.15, 28, 20]} />{mat('nucleus', '#7a4fb0')}</mesh>
        <mesh position={[0.045, 0.04, 0.1]}><sphereGeometry args={[0.058, 18, 14]} />{mat('nucleus', '#4b2b78')}</mesh>
      </group>
      {/* 叶绿体：扁的椭球，里面看得见一摞摞的基粒 */}
      {has(kind, 'chloroplast') && [[-0.7, -0.3], [-0.3, -0.42], [0.1, 0.42], [0.55, 0.43], [0.72, -0.4], [-0.25, 0.42], [0.78, 0.06]].map(([x, y], i) => <group key={i} position={[x, y, 0.07]} rotation-z={i * 0.9}>
        <mesh scale={[1, 0.55, 0.5]}><sphereGeometry args={[0.1, 22, 16]} />{mat('chloroplast', '#3aa652', 0.78)}</mesh>
        {[-0.045, 0, 0.045].map(dx => <mesh key={dx} position={[dx, 0, 0.012]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.019, 0.019, 0.05, 10]} />{mat('chloroplast', '#1f6e33')}</mesh>)}
      </group>)}
      {/* 线粒体：胶囊形，里面一道折来折去的内膜 */}
      {(plant ? [[-0.76, 0.02], [0.5, 0.0], [-0.05, -0.44], [0.4, -0.44]] : [[-0.45, 0.2], [0.45, 0.22], [-0.38, -0.25], [0.42, -0.24], [0, 0.36]]).map(([x, y], i) => <group key={i} position={[x, y, 0.09]} rotation-z={0.5 + i * 1.1}>
        <mesh><capsuleGeometry args={[0.04, 0.1, 8, 14]} />{mat('mito', '#f08a3c', 0.8)}</mesh>
        {[-0.04, -0.013, 0.013, 0.04].map((dy, j) => <mesh key={dy} position={[j % 2 ? 0.012 : -0.012, dy, 0.012]} rotation-z={Math.PI / 2}><capsuleGeometry args={[0.006, 0.034, 4, 8]} />{mat('mito', '#b8571a')}</mesh>)}
      </group>)}
    </group>
  )
}
const STANDS = { base: lathe([[0, 0], [0.58, 0], [0.6, 0.012], [0.6, 0.04], [0.52, 0.085], [0.5, 0.085], [0.5, 0.075], [0, 0.075]], { segs: 48 }) }

/** 正在分裂的细胞。step：做到第几步（0 还没开始，1 染色体复制，2 核一分为二，3 质分成两份，4 分成两个细胞） */
export function Dividing({ position, kind, step }: { position: V3; kind: CellKind; step: number }) {
  const apart = useSlide(step >= 2 ? 0.42 : 0, 0.5), split = useSlide(step >= 4 ? 1 : 0, 0.8), plant = kind === 'plant'
  const counts = chromosomes(step), nuclei = counts.length === 1 ? [0] : [-apart, apart]
  const rods = (n: number) => Array.from({ length: n }, (_, i) => <mesh key={i} position={[((i % 4) - 1.5) * 0.045, (Math.floor(i / 4) - (n > 4 ? 0.5 : 0)) * 0.085, 0.12]} rotation-z={0.5 + i}><capsuleGeometry args={[0.013, 0.05, 4, 8]} /><meshBasicMaterial color={i % 2 ? '#ffd27a' : '#ff8fb3'} toneMapped={false} /></mesh>)
  const body = (x: number, w: number) => plant
    ? <RoundedBox args={[w, 1.1, 0.46]} radius={0.14} smoothness={6} position={[x, 0, 0]}><meshPhysicalMaterial color="#d6edc6" roughness={0.2} clearcoat={0.8} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} /></RoundedBox>
    : <mesh position={[x, 0, 0]} scale={[w / 2, 0.55, 0.23]}><sphereGeometry args={[1, 48, 32]} /><meshPhysicalMaterial color="#fbe3d2" roughness={0.2} clearcoat={0.8} transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} /></mesh>
  return (
    <group position={position}>
      <mesh geometry={STANDS.base} position={[0, -0.82, 0]} castShadow><meshPhysicalMaterial color="#23292e" roughness={0.45} clearcoat={0.5} /></mesh>
      {plant && <RoundedBox args={[1.94, 1.28, 0.6]} radius={0.16} smoothness={6}><meshPhysicalMaterial color="#5fa040" roughness={0.2} clearcoat={0.8} transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} /></RoundedBox>}
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
