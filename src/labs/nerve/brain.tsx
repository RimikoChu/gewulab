// 脑的模型：大脑两个半球（表面有沟和回）、小脑（细细的横纹）、脑干。按 1 cm 一个单位做，脸朝 +z，人的左手边是 +x。
// 同一个模型两处用：展厅里悬着一个放大的（第 7 课、第 4 课），人体头里放一个原大的（第 1 课等）。
// 每个顶点记一个区域号：大脑皮层的几个功能区、小脑、脑干，选中哪一块哪一块亮。
import { useEffect, useMemo } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { useJob } from './job'
import { tagged, wetMat } from './mats'
import { ellipsoid, lin, mix3, noise, roundCone, smin, sminAll, surfaceNetsGen, type V3 } from './sdf'

/** 区域号：0 大脑其余部分，1 躯体运动中枢，2 躯体感觉中枢，3 语言中枢，4 视觉中枢，5 听觉中枢，6 小脑，7 脑干 */
export const TAG = { cortex: 0, motor: 1, sense: 2, speech: 3, vision: 4, hearing: 5, cerebellum: 6, stem: 7 } as const
export type TagKey = keyof typeof TAG

/** 中央沟的位置：一条从头顶往两侧斜下去的沟，前面是运动区，后面是感觉区 */
const central = (x: number, y: number) => 0.4 - 0.32 * Math.max(0, 4.5 - y) - 0.1 * Math.abs(x)
/** 回的高度：值噪声过零的地方是沟底（0），离得越远越鼓（到 1） */
function sulci(x: number, y: number, z: number) {
  const a = noise(x * 0.95 + 11, y * 0.95, z * 0.8) + 0.25 * noise(x * 1.9, y * 1.9 + 5, z * 1.9)
  // 沟底窄、回顶圆：离过零点越远越鼓，用平方根的形状
  return Math.sqrt(Math.min(1, Math.abs(a) / 0.32))
}
function cerebrum(x: number, y: number, z: number) {
  const ax = Math.abs(x)
  let d = sminAll([
    ellipsoid(ax, y, z, [3.2, 1.3, 0.1], [3.5, 4.2, 7.6]),
    ellipsoid(ax, y, z, [3.6, 2.2, 3.4], [3.1, 3.1, 3.9]),
    ellipsoid(ax, y, z, [4.3, -1.7, 1.0], [2.5, 2.1, 4.0]),       // 颞叶
    ellipsoid(ax, y, z, [2.9, 0.2, -5.0], [3.0, 3.0, 2.9]),       // 枕叶
  ], 1.2)
  d = Math.max(d, -(ellipsoid(ax, y, z, [4.2, -4.9, -4.2], [4.6, 2.9, 3.4])))   // 给小脑让出地方
  // 纵裂：两个半球中间的深沟
  d = smin(-d, ax - 0.16 + 0.004 * y, 0.5) * -1
  return d
}
function brainParts(x: number, y: number, z: number) {
  const c = cerebrum(x, y, z)
  // 外侧沟：颞叶上面一道斜沟
  const ax = Math.abs(x)
  const lat = Math.max(0, 1 - Math.abs(y + 0.15 - 0.22 * (z - 1.5)) / 0.3) * (ax > 3.4 && z > -3.2 && z < 5 ? 1 : 0)
  const cs = Math.max(0, 1 - Math.abs(z - central(x, y)) / 0.18) * (y > 0.5 ? 1 : 0)
  const g = Math.max(1 - sulci(x, y, z), lat, cs * 0.9)
  const cer = ellipsoid(x, y, z, [0, -3.2, -4.9], [4.4, 2.2, 2.7]) + 0.05 * Math.sin(Math.hypot(y + 3.0, z + 4.4) * 10.5) * (1 - Math.min(1, Math.abs(x) / 5))
  const stem = smin(roundCone(x, y, z, [0, -0.6, -1.4], [0, -7.8, -2.9], 1.25, 0.9), ellipsoid(x, y, z, [0, -3.1, -0.9], [1.65, 1.5, 1.5]), 0.6)
  return { c: c + 0.42 * g, cer, stem, g }
}
export function brainSdf(x: number, y: number, z: number) { const p = brainParts(x, y, z); return sminAll([p.c, p.cer, p.stem], 0.35) }
/** 一个点属于哪一区 */
export function tagAt(x: number, y: number, z: number): number {
  const p = brainParts(x, y, z)
  if (p.stem < p.c && p.stem < p.cer) return TAG.stem
  if (p.cer < p.c) return TAG.cerebellum
  // 各功能区的边界用椭球和带子加一点起伏，不是直线切出来的方块
  const ax = Math.abs(x), cz = central(x, y), w = 0.35 * noise(x * 0.7 + 3, y * 0.7, z * 0.7)
  const band = y + w - 1.0
  if (band > 0 && z - cz > 0 && z - cz < 1.5 + w) return TAG.motor
  if (band > 0 && cz - z > 0 && cz - z < 1.5 + w) return TAG.sense
  if (x > 2.5 && Math.hypot((x - 6.0) / 2.6, (y - 0.3) / 1.5, (z - 4.3) / 1.7) < 1 + w) return TAG.speech       // 左半球额叶下部（人的左边是 +x）
  if (z < -5.9 + w * 2 && y > -2.4) return TAG.vision
  if (ax > 3.2 && Math.hypot((ax - 6.6) / 2.4, (y + 1.5) / 1.1, (z - 0.4) / 2.2) < 1 + w) return TAG.hearing
  return TAG.cortex
}
const C = { gyr: lin('#e6b0a2'), sul: lin('#9a4a48'), cer: lin('#d89a8c'), stem: lin('#eac2b0') }
function* brainGen(): Generator<void, THREE.BufferGeometry> {
  return yield* surfaceNetsGen(brainSdf, [[-8, -8.4, -8.8], [8, 6.2, 8.8]], 0.12, p => {
    const t = tagAt(...p)
    if (t === TAG.stem) return C.stem
    if (t === TAG.cerebellum) { const s = 0.5 + 0.5 * Math.sin(Math.hypot(p[1] + 3.0, p[2] + 4.4) * 10.5); return mix3(C.cer, C.sul, 0.35 * s) }
    return mix3(C.gyr, C.sul, Math.min(1, Math.pow(brainParts(...p).g, 2.2) * 0.75))
  }, p => tagAt(...p))
}
export const useBrainGeo = () => useJob('brain', brainGen)

/** 脑：hi 是各区亮多少（0–1），dim 让没选中的地方暗一点。scale 1 是原大（1 cm 一个单位） */
export function Brain({ hi = {}, dim = 0, glow = '#7fe3d4', ...rest }: { hi?: Partial<Record<TagKey, number>>; dim?: number; glow?: string } & ThreeElements['group']) {
  const geo = useBrainGeo()
  const m = useMemo(() => tagged(wetMat(null, { roughness: 0.5, clearcoat: 0.55 })), [])
  const cur = useMemo(() => ({ hi: new Array(8).fill(0) as number[], dim: 0 }), [])
  useEffect(() => () => m.mat.dispose(), [m])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 1 / 30) / 0.25)
    for (const [key, i] of Object.entries(TAG)) { cur.hi[i] += ((hi[key as TagKey] ?? 0) - cur.hi[i]) * k; m.u.uHi.value[i] = cur.hi[i] }
    cur.dim += (dim - cur.dim) * k; m.u.uDim.value = cur.dim; m.u.uGlow.value.set(glow)
  })
  return <group {...rest}>{geo && <mesh geometry={geo} material={m.mat} castShadow receiveShadow />}</group>
}
export type { V3 }
