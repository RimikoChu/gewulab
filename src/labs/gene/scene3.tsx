// 遗传和变异 · 第 3 课的器材：黑台面上三处透明的细胞模型。左边父本（矮茎）的一个体细胞，右边母本（高茎）的一个体细胞，各 7 对染色体；
// 形成生殖细胞时每对分开，一个精子、一个卵细胞移到中间，受精后合成受精卵，每对一条蓝（来自父方）、一条橙（来自母方）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { disc } from '@/lab-kit'
import { ChromoMat, CHROMO_COLORS, rod } from './dna'
import { ease, lerp, type V3 } from './parts'
import { PEA_LEN } from './physics'
import { AT_LAB, LAB } from './world'

export const C3 = { x: AT_LAB.cells, y: LAB.top + 2.3, z: LAB.benchZ + 0.6 }
const BODY = 3.4, FAR = 4.9, NEAR = 1.4, R = 1.5, RG = 1.2
const GEO = { dad: PEA_LEN.map((L, i) => [0, 1].map(m => rod(L * 1.05, 0.12, 0.38, m ? '#3f6fb8' : CHROMO_COLORS.dad[0], CHROMO_COLORS.dad[1], i * 2 + m))), mom: PEA_LEN.map((L, i) => [0, 1].map(m => rod(L * 1.05, 0.12, 0.38, m ? '#d47236' : CHROMO_COLORS.mom[0], CHROMO_COLORS.mom[1], 20 + i * 2 + m))) }
const STAND = disc(0.6, 0.12, { chamfer: 0.03 })
/** 在一个细胞里，第 p 对的第 m 条放在哪（相对细胞中心） */
const slot = (p: number, m: number, single: boolean): V3 => [(p - 3) * (single ? 0.26 : 0.37) + (single ? 0 : (m ? 0.08 : -0.08)), (p % 2 ? 0.06 : -0.06), 0]

/** g：形成生殖细胞走了多少（0–1）；f：受精走了多少（0–1）；gene：第 1 对上的基因亮起来 */
export function Cells({ g, f, gene }: { g: number; f: number; gene: boolean }) {
  const gk = ease(g), fk = ease(f)
  const cells = useMemo(() => new THREE.SphereGeometry(1, 48, 32), [])
  // 细胞膜：体细胞一分为二；靠里的那个（精子、卵细胞）移到中间，受精时合成一个
  const membranes: { at: V3; r: number; dim: number }[] = []
  for (const side of [-1, 1]) {
    if (gk <= 0) membranes.push({ at: [side * BODY, 0, 0], r: R, dim: 1 })
    else {
      membranes.push({ at: [side * lerp(BODY, FAR, gk), 0, 0], r: lerp(R, RG, gk), dim: lerp(1, 0.35, gk) })
      if (fk <= 0) membranes.push({ at: [side * lerp(BODY, NEAR, gk), 0, 0], r: lerp(R, RG, gk), dim: 1 })
    }
  }
  if (fk > 0) {
    if (fk < 1) for (const side of [-1, 1]) membranes.push({ at: [side * lerp(NEAR, 0, fk), 0, 0], r: lerp(RG, R * 0.75, fk), dim: 1 - fk * 0.6 })
    membranes.push({ at: [0, 0, 0], r: lerp(RG, R, fk), dim: fk })
  }
  const pos = (side: number, p: number, m: number): V3 => {
    // 父方（side −1）、母方（side +1）的第 p 对第 m 条
    const body = slot(p, m, false), x0 = side * BODY
    if (gk <= 0) return [x0 + body[0], body[1], body[2]]
    const toNear = m === 0, gx = side * (toNear ? lerp(BODY, NEAR, gk) : lerp(BODY, FAR, gk)), single = slot(p, 0, true)
    const inG: V3 = [gx + lerp(body[0], single[0], gk), lerp(body[1], single[1] + (toNear ? 0 : 0), gk), 0]
    if (!toNear || fk <= 0) return inG
    const z = slot(p, side < 0 ? 0 : 1, false)
    return [lerp(inG[0], z[0], fk), lerp(inG[1], z[1], fk), 0]
  }
  return <group position={[C3.x, C3.y, C3.z]}>
    {membranes.map((c, i) => <group key={i} position={c.at}>
      <mesh geometry={cells} scale={c.r}><meshPhysicalMaterial color="#cfe6d2" roughness={0.15} clearcoat={1} clearcoatRoughness={0.1} transparent opacity={0.16 * c.dim + 0.04} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh geometry={cells} scale={c.r * 0.55}><meshPhysicalMaterial color="#c8b6e2" roughness={0.3} transparent opacity={0.12 * c.dim} depthWrite={false} /></mesh>
    </group>)}
    {[-1, 0, 1].map(s => <group key={s} position={[s * BODY, LAB.top + 0.11 - C3.y, 0]}><mesh geometry={STAND} castShadow receiveShadow><meshPhysicalMaterial color="#2a3036" roughness={0.35} metalness={0.6} clearcoat={0.5} /></mesh><mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.04, 0.04, 0.6, 10]} /><meshStandardMaterial color="#aab1b6" metalness={1} roughness={0.25} /></mesh></group>)}
    {(['dad', 'mom'] as const).map((who, wi) => GEO[who].map((pair, p) => pair.map((geo, m) => {
      const side = wi ? 1 : -1, at = pos(side, p, m), dim = gk > 0 && m === 1 ? lerp(1, 0.35, gk) : 1
      const hi = gene && p === 0 && (m === 0)
      return <mesh key={`${who}${p}${m}`} geometry={geo} position={at} castShadow><ChromoMat glow={hi ? 0.12 : 0} opacity={dim} /></mesh>
    })))}
    {/* 第 1 对上控制茎高矮的那一段：一圈亮带 */}
    {gene && [-1, 1].map(side => { const at = pos(side, 0, 0); return <mesh key={side} position={[at[0], at[1] + 0.18, 0.0]}><cylinderGeometry args={[0.17, 0.17, 0.1, 20]} /><meshBasicMaterial color="#ffe07a" toneMapped={false} /></mesh> })}
  </group>
}
/** 标签要用的位置（世界坐标） */
export const where = {
  dad: [C3.x - BODY, C3.y - R - 0.2, C3.z] as V3, mom: [C3.x + BODY, C3.y - R - 0.2, C3.z] as V3, mid: [C3.x, C3.y - R - 0.2, C3.z] as V3,
  sperm: [C3.x - NEAR, C3.y + RG + 0.2, C3.z] as V3, egg: [C3.x + NEAR, C3.y + RG + 0.2, C3.z] as V3,
  geneD: (side: number): V3 => [C3.x + (side < 0 ? -0.08 : 0.08) + (0 - 3) * 0.37, C3.y + 0.75, C3.z],
}
