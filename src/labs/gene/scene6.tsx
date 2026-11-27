// 遗传和变异 · 第 6 课的器材：墙上一块看片灯，上面排好了一个人体细胞里的 23 对染色体；台上两只布袋（精子袋、卵细胞袋）、一张记录纸。
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ChromoMat, CHROMO_COLORS, HUMAN_CEN, HUMAN_LEN, X_LEN, Y_LEN, xChromosome } from './dna'
import { ClothBag, Lightbox, STONE, StoneMat } from './kit'
import { fuse, lerp, seg, type V3 } from './parts'
import type { Draw, Sex } from './physics'
import { AT_LAB, LAB } from './world'

export const BOX = { x: AT_LAB.karyo, y: LAB.top + 4.6, z: LAB.benchZ - 1.9, w: 9.6, h: 5.6 }
const K = 1.15    // 最长的一条画多长（场景单位）
/** 排序图的版式：四行，每行几对；最后一行末尾是性染色体 */
const ROWS = [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9, 10, 11], [12, 13, 14, 15, 16, 17], [18, 19, 20, 21, 22]]
const rowY = [1.75, 0.4, -0.85, -1.95]
const pairAt = (row: number, k: number): V3 => { const n = ROWS[row].length, gap = row === 1 ? 1.2 : 1.45; return [BOX.x + (k - (n - 1) / 2) * gap, BOX.y + rowY[row], BOX.z + 0.12] }
export const SEX_AT = pairAt(3, 4)
const AUTO = (() => {
  const list: THREE.BufferGeometry[] = []
  ROWS.forEach((row, ri) => row.forEach((i, k) => {
    if (i === 22) return
    const [x, y, z] = pairAt(ri, k), L = HUMAN_LEN[i] * K
    for (const s of [-1, 1]) { const g = xChromosome(L, 0.1, HUMAN_CEN[i], CHROMO_COLORS.stain[0], CHROMO_COLORS.stain[1], i * 2 + (s > 0 ? 1 : 0)); g.translate(x + s * 0.24, y - (ri === 0 ? 0 : 0) , z); list.push(g) }
  }))
  return fuse(list)
})()
const SEXG = { X: xChromosome(X_LEN * K, 0.1, 0.4, CHROMO_COLORS.stain[0], CHROMO_COLORS.stain[1], 61), Y: xChromosome(Y_LEN * K, 0.1, 0.3, CHROMO_COLORS.stain[0], CHROMO_COLORS.stain[1], 62) }
const SEXG_HI = { X: xChromosome(X_LEN * K, 0.1, 0.4, CHROMO_COLORS.hi[0], CHROMO_COLORS.hi[1], 61), Y: xChromosome(Y_LEN * K, 0.1, 0.3, CHROMO_COLORS.hi[0], CHROMO_COLORS.hi[1], 62) }

export function Karyotype({ sex, found }: { sex: Sex; found: boolean }) {
  const G = found ? SEXG_HI : SEXG, second = sex === 'male' ? 'Y' : 'X'
  return <group>
    <group position={[BOX.x, BOX.y, BOX.z]}><Lightbox w={BOX.w} h={BOX.h} /></group>
    <mesh geometry={AUTO}><ChromoMat /></mesh>
    <mesh geometry={G.X} position={[SEX_AT[0] - 0.24, SEX_AT[1], SEX_AT[2]]}><ChromoMat glow={found ? 0.15 : 0} /></mesh>
    <mesh geometry={G[second]} position={[SEX_AT[0] + 0.24, SEX_AT[1] + (second === 'Y' ? (X_LEN - Y_LEN) * K * 0.2 : 0), SEX_AT[2]]}><ChromoMat glow={found ? 0.15 : 0} /></mesh>
    {found && <mesh position={[SEX_AT[0], SEX_AT[1], SEX_AT[2] - 0.05]}><planeGeometry args={[1.25, 1.1]} /><meshBasicMaterial color="#ffe9a8" transparent opacity={0.55} toneMapped={false} /></mesh>}
  </group>
}

/** 两只布袋、记录纸，和正在摸出来的两枚棋子 */
export const BAGS_AT = { sperm: [AT_LAB.karyo - 1.6, LAB.top, LAB.benchZ + 1.2] as V3, egg: [AT_LAB.karyo + 1.6, LAB.top, LAB.benchZ + 1.2] as V3, sheet: [AT_LAB.karyo + 4.6, LAB.top + 0.02, LAB.benchZ + 1.6] as V3 }
const MEET: V3 = [AT_LAB.karyo, LAB.top + 2.3, LAB.benchZ + 1.8]
/** 记录纸：男、女两栏，每次画一笔，五笔一个“正”字 */
function useSheet(boys: number, girls: number) {
  const { tex, ctx } = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 384; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { tex: t, ctx: c.getContext('2d')! } }, [])
  useEffect(() => {
    const g = ctx; g.fillStyle = '#f7f4ea'; g.fillRect(0, 0, 512, 384)
    g.strokeStyle = '#b9c7d6'; g.lineWidth = 2; for (let y = 64; y < 384; y += 40) { g.beginPath(); g.moveTo(16, y); g.lineTo(496, y); g.stroke() }
    g.fillStyle = '#2b3340'; g.font = '600 34px "PingFang SC", "Microsoft YaHei", sans-serif'; g.fillText('男', 40, 52); g.fillText('女', 280, 52)
    g.strokeStyle = '#333c4a'; g.lineWidth = 4; g.lineCap = 'round'
    const tally = (n: number, x0: number) => { for (let i = 0; i < n; i++) { const grp = Math.floor(i / 5), k = i % 5, gx = x0 + (grp % 4) * 52, gy = 84 + Math.floor(grp / 4) * 44
      const seg5: [number, number, number, number][] = [[0, 0, 32, 0], [16, 0, 16, 32], [16, 16, 30, 16], [4, 12, 4, 32], [0, 32, 34, 32]]; const [a, b, c, d] = seg5[k]; g.beginPath(); g.moveTo(gx + a, gy + b); g.lineTo(gx + c, gy + d); g.stroke() } }
    tally(boys, 30); tally(girls, 270); tex.needsUpdate = true
  }, [boys, girls, ctx, tex])
  return tex
}
/** draws：已经摸完的；cur：正在摸的这一次和它走了多少（0–1） */
export function Bags({ boys, girls, cur }: { boys: number; girls: number; cur: { d: Draw; u: number } | null }) {
  const tex = useSheet(boys, girls)
  const stone = (from: V3, black: boolean, side: number, u: number) => {
    const up = seg(u, 0, 0.35), down = seg(u, 0.72, 1), top: V3 = [MEET[0] + side * 0.16, MEET[1], MEET[2]]
    const p: V3 = [lerp(lerp(from[0], top[0], up), from[0], down), lerp(lerp(from[1] + 1.1, top[1], up), from[1] + 1.1, down), lerp(lerp(from[2], top[2], up), from[2], down)]
    return <mesh geometry={STONE} position={p} rotation-x={Math.PI / 2 - 0.3} scale={1.4} castShadow><StoneMat black={black} /></mesh>
  }
  return <group>
    <ClothBag position={BAGS_AT.sperm} color="#4f6377" yaw={0.3} />
    <ClothBag position={BAGS_AT.egg} color="#a2593f" yaw={-0.4} />
    <group position={BAGS_AT.sheet} rotation-y={-0.12}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[2.6, 1.95]} /><meshStandardMaterial map={tex} roughness={0.9} /></mesh>
    </group>
    {/* 两盒围棋子：放在袋子后面 */}
    {[-1, 1].map(s => <group key={s} position={[AT_LAB.karyo + s * 3.6, LAB.top, LAB.benchZ - 0.6]}>
      <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.6, 0.55, 0.6, 32]} /><meshStandardMaterial color="#8a6438" roughness={0.6} /></mesh>
      <mesh position={[0, 0.62, 0]} castShadow><cylinderGeometry args={[0.62, 0.62, 0.06, 32]} /><meshStandardMaterial color="#6f4f2c" roughness={0.6} /></mesh>
    </group>)}
    {cur && <>
      {stone(BAGS_AT.sperm, cur.d.sperm === 'Y', -1, cur.u)}
      {stone(BAGS_AT.egg, false, 1, cur.u)}
    </>}
  </group>
}
export { MEET }
