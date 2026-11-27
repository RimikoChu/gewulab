// 遗传和变异 · 第 2 课的器材：显微镜，和旁边一个放大模型座（细胞 → 细胞核 → 染色体 → DNA → 基因，一级一级换上去）；面板里的“视野”。
import { useMemo } from 'react'
import * as THREE from 'three'
import { disc } from '@/lab-kit'
import { ChromoMat, CHROMO_COLORS, NucleusShell, beadsGeo, chromatid, dnaGeo, nucleusChromosomes, rootCellGeo, xChromosome } from './dna'
import { BenchProps, Microscope } from './kit'
import { Flesh, ease, type V3 } from './parts'
import { PEA_LEN } from './physics'
import { AT_LAB, LAB } from './world'

export const SCOPE_AT: V3 = [AT_LAB.scope, LAB.top, LAB.benchZ + 0.4]
/** 模型座上模型的中心 */
export const MODEL: V3 = [AT_LAB.model, LAB.top + 3.5, LAB.benchZ + 0.6]
const STAND = disc(1.1, 0.25, { chamfer: 0.06 })

/** 细胞核那一级：14 条染色体的位置（数的时候一条条亮起来） */
const NUC_R = 1.45
const NUC = (() => {
  const lens = PEA_LEN
  return { ...nucleusChromosomes(lens, NUC_R), single: lens.flatMap((L, i) => [0, 1].map(s => ({ L, i, s }))) }
})()

/** 第 3 级、第 4 级：左边一截染色体的臂，中间 DNA 缠在蛋白质上，右边松开的双螺旋 */
const DNA = (() => {
  const arm = chromatid([[-2.9, 0.5, 0], [-2.5, 0.25, 0], [-2.15, 0.05, 0]], 0.5, 0.0, CHROMO_COLORS.stain[0], CHROMO_COLORS.stain[1], 4)
  const b = beadsGeo(1.5, 4, 0.22); b.beads.translate(-2.05, 0, 0); b.wire.translate(-2.05, 0, 0)
  const d = dnaGeo(3.4, 0.17, 0.44, 3, 0.36, 0.7); d.plain.translate(-0.55, 0, 0); d.gene.translate(-0.55, 0, 0)
  return { arm, ...b, ...d }
})()
/** 基因那一段在模型里的中点 */
export const GENE_MID: V3 = [MODEL[0] - 0.55 + 3.4 * 0.53, MODEL[1] + 0.35, MODEL[2]]

/** level：现在是第几级（0–4），k：换到这一级走了多少（0–1）；counted：数到第几条染色体 */
export function ModelStand({ level, k, counted, lamp }: { level: number; k: number; counted: number; lamp: boolean }) {
  const cell = useMemo(() => rootCellGeo(2.6, 2.3, 1.7), [])
  const big = useMemo(() => xChromosome(3.1, 0.34, 0.42, CHROMO_COLORS.stain[0], CHROMO_COLORS.stain[1], 9), [])
  const s = ease(k)
  // 上一级缩小消失，这一级从中心长出来
  const show = (i: number) => i === level ? s : i === level - 1 ? 1 - s : 0
  const sc = (i: number) => Math.max(0.001, show(i))
  return <group>
    <Microscope position={SCOPE_AT} lamp={lamp} yaw={0.35} />
    <BenchProps at={[AT_LAB.scope + 1.9, LAB.top, LAB.benchZ + 2.2]} />
    {/* 模型座：黑色底盘，一根托杆 */}
    <group position={[MODEL[0], LAB.top, MODEL[2]]}>
      <mesh geometry={STAND} castShadow receiveShadow><meshPhysicalMaterial color="#1b1f23" roughness={0.4} clearcoat={0.6} /></mesh>
      <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.06, 0.06, 2.2, 12]} /><meshStandardMaterial color="#aab1b6" metalness={1} roughness={0.25} /></mesh>
    </group>
    <group position={MODEL}>
      {show(0) > 0 && <group scale={sc(0)}>
        <mesh geometry={cell}><meshPhysicalMaterial color="#9ccf86" roughness={0.25} clearcoat={0.8} transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh scale={0.94} geometry={cell}><meshPhysicalMaterial color="#e9f2d9" roughness={0.3} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <group scale={0.42}><NucleusShell R={NUC_R} opacity={0.6} /><mesh geometry={NUC.geo}><ChromoMat /></mesh></group>
      </group>}
      {show(1) > 0 && <group scale={sc(1)}>
        <NucleusShell R={NUC_R} opacity={0.42} />
        <mesh geometry={NUC.geo}><ChromoMat glow={counted >= 14 ? 0.08 : 0} /></mesh>
        {/* 数到的那几条套一圈亮环 */}
        {NUC.spots.slice(0, counted).map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.2, 16, 12]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.28} depthWrite={false} toneMapped={false} /></mesh>)}
      </group>}
      {show(2) > 0 && <group scale={sc(2)} rotation-z={0.25}><mesh geometry={big} castShadow><ChromoMat /></mesh></group>}
      {(show(3) > 0 || show(4) > 0) && <group scale={Math.max(sc(3), sc(4))}>
        <mesh geometry={DNA.arm}><ChromoMat /></mesh>
        <mesh geometry={DNA.beads}><Flesh rough={0.4} clear={0.6} /></mesh>
        <mesh geometry={DNA.wire}><Flesh rough={0.35} /></mesh>
        <mesh geometry={DNA.plain}><Flesh rough={0.35} clear={0.5} /></mesh>
        <mesh geometry={DNA.gene}><Flesh rough={0.3} clear={0.5} emissive="#ffcf4a" glow={level === 4 ? 0.35 * s : 0} /></mesh>
        {level === 4 && <mesh position={[GENE_MID[0] - MODEL[0], 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.32, 0.32, 3.4 * 0.34, 32, 1, true]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.12 * s} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>}
      </group>}
    </group>
  </group>
}

/** 显微镜的视野：豌豆根尖分生区的细胞，方方正正、排得很密，压片后用碱性染料染过，细胞核和染色体是紫红色；中间一个细胞正在分裂，染色体排在中间 */
export function ScopeView({ on }: { on: boolean }) {
  const R = 92
  const cells = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; kind: number }[] = []
    let sd = 7; const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) out.push({ x: i * 26 + (j % 2) * 6 + (r() - 0.5) * 3, y: j * 22, w: 25 + (r() - 0.5) * 3, h: 21 + (r() - 0.5) * 2, kind: i === 0 && j === 0 ? 2 : (i * 7 + j * 3) % 11 === 4 ? 1 : 0 })
    return out
  }, [])
  return (
    <svg viewBox={`${-R - 6} ${-R - 6} ${2 * R + 12} ${2 * R + 12}`} className="mx-auto mt-2 w-[200px]" role="img" aria-label="显微镜的视野">
      <defs><clipPath id="gene-view"><circle r={R} /></clipPath></defs>
      <circle r={R + 5} fill="#0b0d0f" />
      <circle r={R} fill={on ? '#f8f1ec' : '#15181b'} />
      {on && <g clipPath="url(#gene-view)">
        {cells.map((c, i) => <g key={i}>
          <rect x={c.x - c.w / 2} y={c.y - c.h / 2} width={c.w} height={c.h} rx={2} fill="#f3dfe3" stroke="#b98a9a" strokeWidth={1.1} />
          {c.kind === 0 && <circle cx={c.x} cy={c.y} r={6} fill="#a2507a" opacity={0.85} />}
          {c.kind === 1 && <g>{[-4, -1, 2, 5].map(dx => <path key={dx} d={`M${c.x + dx} ${c.y - 6} q2 6 0 12`} stroke="#6e2350" strokeWidth={1.8} fill="none" strokeLinecap="round" />)}</g>}
          {c.kind === 2 && <g>{[-7, -5, -3, -1, 1, 3, 5, 7].map((dy, k) => <path key={k} d={`M${c.x - 1.2} ${c.y + dy - 1} l${(k % 2 ? 3 : -3)} 1.6 M${c.x + 1.2} ${c.y + dy - 1} l${(k % 2 ? 3 : -3)} 1.6`} stroke="#5a1b44" strokeWidth={2} strokeLinecap="round" />)}</g>}
        </g>)}
      </g>}
      <circle r={R} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={2} />
    </svg>
  )
}
