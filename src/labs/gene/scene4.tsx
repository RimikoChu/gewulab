// 遗传和变异 · 第 4 课的器材：温室前台两盆豌豆（高茎、矮茎），高茎上推近看的那朵花（放大了画），戴手套的手拿镊子、毛笔，纸袋。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { Brush, Hand, Tweezers } from './kit'
import { RoundedBox } from '@react-three/drei'
import { Flesh, LeafMat, blob, fuse, helix, leafGeo, lerp, makeWood, place, seg, tube, type V3 } from './parts'
import { BAG, HF, HeroFlower, PeaPatch, paperTex, variant } from './pea'
import { POTS, Pot, SPOT } from './world'

/** 推近看的那朵花在世界里的位置和朝向 */
export const FLOWER_AT: V3 = SPOT.flower.target.toArray().map((v, i) => v + [0, -0.2, 0][i]) as V3
const YAW = -0.35
const M = new THREE.Matrix4().compose(new THREE.Vector3(...FLOWER_AT), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, YAW, 0)), new THREE.Vector3(1, 1, 1))
/** 花自己坐标里的一点，在世界里的位置 */
export const inFlower = (p: V3): V3 => new THREE.Vector3(...p).applyMatrix4(M).toArray() as V3
const POT_Y = 4.1 * 1.25 - 0.4

/** 两盆豌豆：高茎一盆（插一根竹竿），矮茎一盆；花后面一张小工作台，台上有镊子、一摞纸袋、毛笔和一小盆开着花的矮茎 */
export function Pots() {
  const tall = useMemo(() => [variant({ tall: true, stage: 1, seed: 401 })], []), short = useMemo(() => [variant({ tall: false, stage: 1, seed: 402 })], [])
  const top = useMemo(() => { const t = makeWood('#a5865a', '84,58,32', '210,180,130', 4, 13); t.repeat.set(1.2, 0.6); return t }, [])
  const T = { x: FLOWER_AT[0] + 1.3, z: FLOWER_AT[2] - 2.0, y: 10.6 }
  return <>
    <Pot at={[POTS.tall[0], 0, POTS.tall[1]]} s={1.25} />
    <Pot at={[POTS.short[0], 0, POTS.short[1]]} s={1.25} />
    <PeaPatch spots={[{ x: POTS.tall[0], z: POTS.tall[1], yaw: 2.2, s: 0.92, v: 0 }]} variants={tall} y={POT_Y} />
    <PeaPatch spots={[{ x: POTS.short[0], z: POTS.short[1], yaw: 0.6, s: 1.1, v: 0 }]} variants={short} y={POT_Y} />
    <mesh position={[POTS.tall[0] - 0.3, 13, POTS.tall[1] - 0.4]} castShadow><cylinderGeometry args={[0.1, 0.12, 22, 8]} /><meshStandardMaterial color="#b79a62" roughness={0.8} /></mesh>
    <group position={[T.x, 0, T.z]}>
      <RoundedBox args={[5.2, 0.3, 2.4]} radius={0.05} position={[0, T.y - 0.15, 0]} castShadow receiveShadow><meshStandardMaterial map={top} roughness={0.75} /></RoundedBox>
      {[-1, 1].flatMap(a => [-1, 1].map(b => <mesh key={`${a}${b}`} position={[a * 2.4, (T.y - 0.3) / 2, b * 1.0]} castShadow><boxGeometry args={[0.2, T.y - 0.3, 0.2]} /><Metal kind="zinc" grain="brushed" /></mesh>))}
      {/* 平放的镊子、毛笔 */}
      <group position={[-1.6, T.y + 0.03, 0.55]} rotation={[Math.PI / 2, 0, 1.2]} scale={0.6}><Tweezers open={0.04} /></group>
      <group position={[-0.6, T.y + 0.05, 0.75]} rotation={[Math.PI / 2, 0, 1.75]} scale={0.6}><Brush /></group>
      {/* 一摞扁平的纸袋 */}
      {[0, 1, 2].map(i => <mesh key={i} geometry={FLAT_BAG} position={[-1.7 + i * 0.05, T.y + 0.015 + i * 0.02, -0.4 + i * 0.04]} rotation={[-Math.PI / 2, 0, 0.15 + i * 0.12]} castShadow><meshStandardMaterial map={paperTex()} roughness={0.75} side={THREE.DoubleSide} /></mesh>)}
      {/* 一小盆开花的矮茎豌豆：授粉用的花粉从这里取 */}
      <Pot at={[2.0, T.y, -0.6]} s={0.38} />
      <PeaPatch spots={[{ x: 2.0, z: -0.6, yaw: 1.4, s: 0.5, v: 0 }]} variants={short} y={T.y + 1.4} />
    </group>
  </>
}
/** 平放的纸袋：一张长方形，一头剪成锯齿口 */
const FLAT_BAG = (() => { const s = new THREE.Shape(); s.moveTo(-0.45, -0.75); s.lineTo(0.45, -0.75); s.lineTo(0.45, 0.7); for (let k = 0; k <= 9; k++) s.lineTo(0.45 - k * 0.1, k % 2 ? 0.75 : 0.7); s.lineTo(-0.45, -0.75); const g = new THREE.ShapeGeometry(s); const p = g.attributes.position, uv: number[] = []; for (let i = 0; i < p.count; i++) uv.push((p.getX(i) + 0.45) / 0.9, (p.getY(i) + 0.75) / 1.5); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g })()

/** 那朵花所在的一截茎（和花一样放大了画）：茎从下往上，一个节上一对抱茎的托叶、一片带卷须的复叶，花梗从叶腋伸出来，旁边还有一个花蕾。画在花自己的坐标里 */
function Sprig() {
  const g = useMemo(() => {
    const body: THREE.BufferGeometry[] = [], leaf: THREE.BufferGeometry[] = []
    const node: V3 = [-0.68, -0.32, -0.92]
    body.push(tube([[-0.8, -2.6, -0.85], [-0.72, -1.2, -0.9], node, [-0.6, 0.6, -0.98], [-0.66, 1.7, -1.0]], 0.075, 0.06, '#7d9f64', '#93b675', 10, 30))
    const st = leafGeo({ len: 1.1, wid: 0.9, basePow: 0.42, tipPow: 0.75, curl: 0.1, fold: 0.1, wave: 0.03, base: '#4b8058', tip: '#75a477', back: '#a4c3a1', nu: 10, nv: 3 })
    for (const s of [-1, 1]) leaf.push(place(st.clone(), [node[0], node[1] - 0.05, node[2]], s * 0.9 - 0.3, -0.4, 1, s * 0.35))
    // 复叶：叶轴往左后方伸，两对小叶，末端三根卷须
    const end: V3 = [-2.0, 0.1, -1.5]
    body.push(tube([node, [-1.3, -0.05, -1.2], end], 0.035, 0.022, '#7fa266', '#90b674', 6, 10))
    const lf = leafGeo({ len: 0.9, wid: 0.6, basePow: 0.78, tipPow: 0.9, curl: 0.15, fold: 0.22, wave: 0.02, base: '#4f8460', tip: '#78a77a', back: '#9bbb9a', nu: 10, nv: 3 })
    for (const [x, y, z] of [[-1.2, -0.06, -1.18], [-1.7, 0.04, -1.38]] as V3[]) for (const s of [-1, 1]) leaf.push(place(lf.clone(), [x, y, z], -1.9 + s * 1.2, 0.25, 1, s * 0.25))
    for (let t = 0; t < 3; t++) { const e: V3 = [end[0] - 0.4 - t * 0.1, end[1] + 0.2 + t * 0.15, end[2] - 0.1 + t * 0.2]; body.push(tube([end, e, ...helix(0.07, 0, -0.12, 1.6, t).map(([x, y, z]) => [e[0] + x, e[1] + y, e[2] + z] as V3)], 0.014, 0.008, '#8fb46e', '#a8c784', 4, 18)) }
    // 花梗：从叶腋伸到花的花柄，半路分出一个花蕾
    body.push(tube([node, [-0.4, -0.25, -0.85], [0, -0.05, -0.78]], 0.033, 0.03, '#7ea266', '#8fb575', 8, 12))
    body.push(tube([[-0.4, -0.25, -0.85], [-0.45, -0.5, -0.5], [-0.42, -0.62, -0.3]], 0.025, 0.022, '#7ea266', '#8fb575', 6, 8))
    body.push(place(blob(0.08, 0.07, 0.15, '#6f9a58', '#c8a6d0'), [-0.42, -0.64, -0.2], 0, 0.2))
    return { body: fuse(body), leaf: fuse(leaf) }
  }, [])
  return <>
    <mesh geometry={g.body} castShadow><Flesh rough={0.55} /></mesh>
    <mesh geometry={g.leaf} castShadow receiveShadow><LeafMat /></mesh>
  </>
}

/**
 * 那朵花和操作它的手。e：去雄走了多少；b：纸袋套上了多少；p：授粉走了多少；pod：结荚走了多少（都是 0–1）
 */
export function Work({ e, b, p, pod }: { e: number; b: number; p: number; pod: number }) {
  // 手：去雄时拿镊子，授粉时拿蘸了花粉的毛笔
  const tweezAt = (): V3 | null => {
    if (e <= 0 || e >= 1) return null
    const t = HF.anther, far: V3 = [0.9, 1.4, 1.3], near: V3 = [t[0] + 0.02, t[1] + 0.3, t[2] + 0.05]
    const k1 = seg(e, 0, 0.3), up = seg(e, 0.5, 0.8), out = seg(e, 0.8, 1)
    const base: V3 = [lerp(far[0], near[0], k1), lerp(far[1], near[1], k1) + up * 0.45, lerp(far[2], near[2], k1) + up * 0.3]
    return [lerp(base[0], far[0], out), lerp(base[1], far[1] + 0.4, out), lerp(base[2], far[2], out)]
  }
  const brushAt = (): V3 | null => {
    if (p <= 0.18 || p >= 0.82) return null
    const t = HF.stigma, far: V3 = [1.0, 1.5, 1.2], near: V3 = [t[0] + 0.03, t[1] + 0.31, t[2] + 0.02]
    const k1 = seg(p, 0.2, 0.42), dab = Math.sin(seg(p, 0.45, 0.6) * Math.PI * 2) * 0.03, out = seg(p, 0.62, 0.8)
    return [lerp(lerp(far[0], near[0], k1), far[0], out), lerp(lerp(far[1], near[1], k1), far[1], out) + dab, lerp(lerp(far[2], near[2], k1), far[2], out)]
  }
  const tw = tweezAt(), br = brushAt()
  const open = p > 0 ? lerp(0.35, 1, seg(p, 0, 0.2)) : 0.35
  const part = e > 0 ? seg(e, 0.3, 0.5) * (1 - seg(e, 0.85, 1) * 0.7) : 0
  const lift = seg(e, 0.5, 0.8), stamens = e >= 0.8 ? 1 - seg(e, 0.8, 0.95) : 1
  // 纸袋：套上（b），授粉时先取下、授完再套上，结荚时取下
  const bag = pod > 0 ? 1 - seg(pod, 0, 0.25) : p > 0 ? (p < 0.2 ? 1 - seg(p, 0, 0.18) : seg(p, 0.82, 1)) : b
  return <group position={FLOWER_AT} rotation-y={YAW}>
    <Sprig />
    <HeroFlower open={pod > 0 ? 1 : open} part={part} stamens={e >= 1 ? 0 : stamens} lift={lift} pollen={p >= 0.55 ? 1 : p > 0.45 ? seg(p, 0.45, 0.55) : 0} wither={seg(pod, 0.2, 0.6)} pod={seg(pod, 0.35, 1)} />
    {tw && <group position={tw} rotation={[0.3, 0.5, 0.45]}><group position={[0, 0.95, 0]} scale={0.8}><Hand /></group><Tweezers open={0.03 * (1 - seg(e, 0.3, 0.5))} /></group>}
    {br && <group position={br} rotation={[0.3, 0.5, 0.45]}><group position={[0, 0.95, 0]} scale={0.8}><Hand /></group><Brush dusted /></group>}
    {bag > 0.001 && <group position={[0, 0.2, lerp(1.9, -0.08, bag)]} rotation={[Math.PI / 2, 0, 0]}><group rotation-y={Math.PI / 2}>
      <mesh geometry={BAG} castShadow><meshPhysicalMaterial map={paperTex()} roughness={0.6} sheen={0.4} sheenColor="#fffaf0" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 0.06, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.1, 0.014, 6, 16]} /><Metal kind="steel" /></mesh>
    </group></group>}
  </group>
}
