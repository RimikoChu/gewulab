// 从展板圆孔里伸出来的一只手臂（第 3 课碰杯子、第 7 课接尺子）：卷起的衬衫袖子、上臂、肘、前臂、右手。
// 皮肤是真实的肤色和质感：指节、指尖红润一点，指甲有光泽；手指按姿势弯曲（三节指骨、拇指对掌）。
// 按 1 cm 一个单位做，放进展馆时乘 0.1。手指朝 +x，手背朝 +y，拇指在 −z 一侧。肘在 x = −26，前臂和手绕肘转。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { useJob } from './job'
import { skinMat } from './mats'
import { ellipsoid, fbm, lin, mix3, noise, roundCone, smin, sminAll, sstep, surfaceNetsGen, type V3 } from './sdf'

export const ELBOW: V3 = [-26, 0.2, 0]
/** 手的姿势：四指各弯多少（0 伸直，1 握拳）、拇指往食指靠多少（0 张开，1 捏住） */
export interface Pose { curl: [number, number, number, number]; thumb: number; gap?: number }
export const POSES = {
  reach: { curl: [0.04, 0.07, 0.11, 0.16], thumb: 0.1 },
  open: { curl: [0.1, 0.85, 0.92, 0.96], thumb: 1, gap: 2.6 },
  pinch: { curl: [0.12, 0.85, 0.92, 0.96], thumb: 1, gap: 0.35 },
} satisfies Record<string, Pose>
export type PoseKey = keyof typeof POSES

type Seg = { a: V3; b: V3; ra: number; rb: number }
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
/** 绕 z 轴往手心方向（−y）弯 */
const bendDown = (d: V3, ang: number): V3 => { const c = Math.cos(ang), s = Math.sin(ang); return norm([d[0] * c + d[1] * s, -d[0] * s + d[1] * c, d[2]]) }
const FINGERS = [
  { base: [9.0, 0.15, -2.85] as V3, len: [4.1, 2.4, 1.9], r: 0.98, spread: -0.08 },
  { base: [9.5, 0.2, -0.95] as V3, len: [4.5, 2.8, 2.0], r: 1.0, spread: -0.02 },
  { base: [9.2, 0.15, 0.95] as V3, len: [4.2, 2.7, 1.9], r: 0.94, spread: 0.04 },
  { base: [8.4, 0.05, 2.7] as V3, len: [3.3, 2.0, 1.75], r: 0.8, spread: 0.12 },
]
/** 一只手在某个姿势下的骨架：每根手指三节、拇指三节，还有每个指尖的指甲在哪 */
function skeleton(p: Pose) {
  const segs: Seg[] = [], nails: { at: V3; d: V3; r: number }[] = []
  FINGERS.forEach((f, i) => {
    let d: V3 = norm([1, 0, f.spread]), at = f.base
    const c = p.curl[i], angs = [c * 1.35, c * 1.6, c * 1.05]
    for (let k = 0; k < 3; k++) {
      d = bendDown(d, angs[k] + (k === 0 ? 0.04 : 0.06))
      const b = add(at, d, f.len[k]), ra = f.r * [1, 0.88, 0.8][k], rb = f.r * [0.9, 0.81, 0.7][k]
      segs.push({ a: at, b, ra, rb })
      if (k === 2) nails.push({ at: b, d, r: rb })
      at = b
    }
  })
  // 拇指：从掌根往前、往外长出来；捏的时候指尖去找食指的指尖
  const idxTip = nails[0].at, t = p.thumb, gap = p.gap ?? 0
  const t0: V3 = [1.6, -0.9, -2.5], t1: V3 = [4.9, -1.3, -4.6]
  const openTip: V3 = [9.1, -1.0, -5.4]
  const pinchTip: V3 = add(idxTip, [-0.5, -0.55, -1.75 - gap])
  const tip: V3 = [openTip[0] + (pinchTip[0] - openTip[0]) * t, openTip[1] + (pinchTip[1] - openTip[1]) * t, openTip[2] + (pinchTip[2] - openTip[2]) * t]
  const mid: V3 = add(add(t1, tip, 0).map((v, i) => (v + tip[i]) / 2) as V3, [0, -0.3 - 0.2 * t, -0.35 * (1 - t)])
  segs.push({ a: t0, b: t1, ra: 1.5, rb: 1.12 }, { a: t1, b: mid, ra: 1.08, rb: 0.98 }, { a: mid, b: tip, ra: 0.95, rb: 0.82 })
  nails.push({ at: tip, d: norm([tip[0] - mid[0], tip[1] - mid[1], tip[2] - mid[2]]), r: 0.82 })
  return { segs, nails }
}

/** 前臂和手（肘以下）。sk 是手的骨架 */
function foreSdf(sk: ReturnType<typeof skeleton>) {
  return (x: number, y: number, z: number) => {
    const yy = y * 1.22
    let d = sminAll([
      roundCone(x, yy, z, [-25.5, 0.25, 0], [-0.6, 0, 0], 3.55, 2.55),
      ellipsoid(x, y, z, [-19, 0.6, 0.3], [6.5, 2.9, 3.3]),           // 前臂上段的肌肉
      ellipsoid(x, y, z, [-26, 0.1, 0], [2.8, 2.9, 3.4]),             // 肘
      ellipsoid(x, y, z, [4.6, 0.0, 0.0], [4.9, 1.38, 4.0]),          // 手掌
      ellipsoid(x, y, z, [8.2, 0.12, -0.05], [1.7, 1.25, 4.15]),      // 指根那一排
      ellipsoid(x, y, z, [2.9, -0.55, -2.55], [2.9, 1.5, 1.75]),      // 拇指根的肌肉
      ellipsoid(x, y, z, [3.6, -0.5, 2.7], [3.3, 1.2, 1.4]),          // 小鱼际
    ], 1.1)
    for (const s of sk.segs) d = smin(d, roundCone(x, y, z, s.a, s.b, s.ra, s.rb), 0.55)
    // 指甲：指尖背面薄薄高起一层
    for (const n of sk.nails) { const dd = ellipsoid(x, y, z, add(n.at, n.d, -0.55).map((v, i) => v + [0, n.r * 0.72, 0][i]) as V3, [0.75, 0.22, n.r * 0.62]); d = smin(d, dd, 0.12) }
    // 皮肤的细起伏
    return d + 0.04 * fbm(x * 0.9, y * 0.9, z * 0.9, 2)
  }
}
/** 上臂：从袖口到肘，二头肌鼓起 */
function upperSdf(x: number, y: number, z: number) {
  return sminAll([
    roundCone(x, y * 1.08, z, [-44, 0.4, 0], [-26.5, 0.2, 0], 4.5, 3.6),
    ellipsoid(x, y, z, [-32, 1.6, 0.2], [5.6, 2.6, 2.9]),
    ellipsoid(x, y, z, [-34, -1.2, 0], [5.6, 2.4, 3.0]),
  ], 1.2) + 0.035 * fbm(x * 0.8, y * 0.8, z * 0.8, 2)
}
/** 卷起来的衬衫袖子：卷边厚一点，往后的布有几道褶；袖口挖空，手臂从里面伸出来 */
function sleeveSdf(x: number, y: number, z: number) {
  const ang = Math.atan2(z, y)
  const fold = 0.32 * Math.sin(ang * 4 + x * 0.42) * sstep(-37, -42, x) + 0.22 * Math.sin(ang * 7 - x * 0.7) * sstep(-38, -46, x)
  let d = roundCone(x, y * 1.05, z, [-36.5, 0.5, 0], [-52, 0.8, 0], 5.4, 5.9) + fold + 0.06 * noise(x * 0.6, y * 0.6, z * 0.6)
  const roll = roundCone(x, y, z, [-35.6, 0.45, 0], [-38.6, 0.5, 0], 5.85, 5.95) + 0.12 * noise(x * 1.2 + 3, ang * 3, 1)
  d = smin(d, roll, 0.6)
  // 挖出手臂伸出来的洞
  return Math.max(d, -(Math.hypot(y - 0.4, z) - 4.7 + Math.min(0, x + 39.0) * 9))
}

const SK = { base: lin('#d39a7e'), warm: lin('#c47a66'), light: lin('#e2b39c'), nail: lin('#efc6b8'), crease: lin('#a8624f') }
/** 皮肤的顶点颜色：手心和前臂内侧浅一点，指节、指尖、肘红润一点，指甲淡粉 */
function skinColor(sk: ReturnType<typeof skeleton> | null) {
  return (p: V3, n: V3): V3 => {
    let c = SK.base
    if (n[1] < -0.3) c = mix3(c, SK.light, 0.45 * Math.min(1, -n[1]))
    if (p[0] > 8) c = mix3(c, SK.warm, 0.35 * sstep(8, 17, p[0]))
    if (p[0] < -23) c = mix3(c, SK.warm, 0.25 * sstep(-23, -27, p[0]))
    if (sk) for (const nl of sk.nails) {
      const q: V3 = [p[0] - nl.at[0], p[1] - nl.at[1], p[2] - nl.at[2]], along = -(q[0] * nl.d[0] + q[1] * nl.d[1] + q[2] * nl.d[2])
      if (along > -0.2 && along < 1.4 && q[1] > nl.r * 0.25 && Math.abs(q[2] - nl.d[2] * along) < nl.r * 0.62) c = mix3(c, SK.nail, 0.85)
    }
    const v = 0.06 * noise(p[0] * 1.7, p[1] * 1.7, p[2] * 1.7)
    return [c[0] * (1 + v), c[1] * (1 + v * 0.8), c[2] * (1 + v * 0.7)]
  }
}
function* foreGen(k: PoseKey) { const sk = skeleton(POSES[k]); return yield* surfaceNetsGen(foreSdf(sk), [[-29.5, -6.8, -8.6], [21, 4.2, 6.2]], 0.2, skinColor(sk)) }
function* upperGen() { return yield* surfaceNetsGen(upperSdf, [[-45, -4.8, -4.8], [-23, 5.2, 4.8]], 0.24, skinColor(null)) }
function* sleeveGen() { return yield* surfaceNetsGen(sleeveSdf, [[-53, -6.6, -7.2], [-34.4, 7.6, 7.2]], 0.24) }

/** 布料：棉布的绒光、细细的颜色起伏 */
const clothMat = () => new THREE.MeshPhysicalMaterial({ color: '#5f7d9a', roughness: 0.86, sheen: 0.9, sheenRoughness: 0.6, sheenColor: new THREE.Color('#bcd2e6') })

/**
 * 一只手臂。pose 是手的姿势；flex 是肘弯多少（弧度，手往上抬）；
 * fore 里的东西跟着前臂一起动（比如画在手上的神经冲动）
 */
export function Arm({ pose, flex = 0, fore, upper }: { pose: PoseKey; flex?: number; fore?: ReactNode; upper?: ReactNode }) {
  const f = useJob(`arm:${pose}`, () => foreGen(pose))
  const u = useJob('arm:upper', upperGen), s = useJob('arm:sleeve', sleeveGen)
  const m = useMemo(() => ({ skin: skinMat(), cloth: clothMat() }), [])
  return <group>
    {u && <mesh geometry={u} material={m.skin} castShadow receiveShadow />}
    {s && <mesh geometry={s} material={m.cloth} castShadow receiveShadow />}
    {upper}
    <group position={ELBOW} rotation-z={flex}><group position={[-ELBOW[0], -ELBOW[1], -ELBOW[2]]}>
      {f && <mesh geometry={f} material={m.skin} castShadow receiveShadow />}
      {fore}
    </group></group>
  </group>
}
/** 某个姿势下指尖（食指、拇指）在哪：画冲动、放尺子用 */
export function tips(k: PoseKey) { const sk = skeleton(POSES[k]); return { index: sk.nails[0].at, middle: sk.nails[1].at, thumb: sk.nails[4].at } }

/** 展板上手臂伸出来的那个圆孔：一圈黑色橡胶密封圈、一圈拉丝铝的压环 */
export function Port({ r = 6.6 }: { r?: number }) {
  return <group rotation-y={Math.PI / 2}>
    <mesh><torusGeometry args={[r, 0.9, 20, 64]} /><meshPhysicalMaterial color="#17191c" roughness={0.75} clearcoat={0.2} /></mesh>
    <mesh position={[0, 0, -0.6]}><ringGeometry args={[r * 0.2, r, 48]} /><meshStandardMaterial color="#07080a" roughness={1} /></mesh>
  </group>
}
