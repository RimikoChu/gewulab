// 神经调节实验室的大场景：一座科学馆的“人体神经系统”展馆。正中圆台上，一个半透明的人坐在高凳上，身体里亮着脑、脊髓和全身的神经；
// 头顶悬着一个放大的脑（第 7 课），左边悬着一个放大的神经元和一段神经（第 2 课），右边悬着放大的眼球（第 5 课）和耳（第 6 课），
// 左前方一张展台上一只手臂从展板里伸出来碰热水杯，头顶悬着放大的一段脊髓（第 3 课）；左后方一张展台做接尺子（第 7 课），右后方一张沙盘（拓展）。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 个单位 = 10 cm。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Metal, disc, makeGround } from '@/lab-kit'
import { Body, EAR_AT, EYE_AT, inHead, type BodyLook } from './body'
import { Brain, type TagKey } from './brain'
import { Cord } from './cord'
import { Concave, Eyeball, Penlight } from './eye'
import { Ear, Speaker, Waves } from './ear'
import { Arm, tips, type PoseKey } from './limb'
import { Bundle, Neuron, NTAG } from './neuron'
import { Ball, Board, Car, HotCup, Magnifier, Plinth, Post, Release, Road, Ruler, Tree } from './props'
import type { V3 } from './sdf'

// ---------- 各处的位置 ----------
/** 人坐的圆台面高 BODY_Y：身体模型里的一点在世界里要加上它 */
export const BODY_Y = 0.12
export const onBody = (p: V3): V3 => [p[0], p[1] + BODY_Y, p[2]]
export const BRAIN_BIG = { at: [0, 25.2, -1.5] as V3, s: 0.34 }
/** 放大的脑上一点（cm）在世界里的位置 */
export const onBig = (p: V3): V3 => [BRAIN_BIG.at[0] + p[0] * BRAIN_BIG.s, BRAIN_BIG.at[1] + p[1] * BRAIN_BIG.s, BRAIN_BIG.at[2] + p[2] * BRAIN_BIG.s]
export const NEURON_AT: V3 = [-27, 22.5, 14]
export const BUNDLE_AT: V3 = [-19.5, 19.6, 14.5]
/** 第 3 课的展台：台面高 8.5；手臂从左边的展板伸出来，指尖碰到右边的热水杯；头顶悬着放大的一段脊髓 */
export const BENCH3 = { at: [-21, 0, 10] as V3, top: 8.5 }
export const ARM3: V3 = [BENCH3.at[0] - 1.6, BENCH3.top + 0.62, BENCH3.at[2]]
export const CUP_AT: V3 = [ARM3[0] + 2.27, BENCH3.top, ARM3[2] + 0.05]
export const CORD3 = { at: [BENCH3.at[0] - 0.9, BENCH3.top + 3.1, BENCH3.at[2] - 0.6] as V3, s: 0.85 }
export const onCord = (p: V3): V3 => [CORD3.at[0] + p[0] * CORD3.s, CORD3.at[1] + p[1] * CORD3.s, CORD3.at[2] + p[2] * CORD3.s]
/** 手臂模型（cm）上的一点在世界里的位置 */
export const onArm3 = (p: V3): V3 => [ARM3[0] + p[0] * 0.1, ARM3[1] + p[1] * 0.1, ARM3[2] + p[2] * 0.1]
export const EYE_W = { at: [31, 19.5, -5.0] as V3, s: 0.25 }
/** 眼球模型（mm，光轴是模型的 y）上的一点在世界里的位置：模型转了 −90° 让光轴朝 +x */
export const onEye = (p: V3): V3 => [EYE_W.at[0] + p[1] * EYE_W.s, EYE_W.at[1] - p[0] * EYE_W.s, EYE_W.at[2] + p[2] * EYE_W.s]
export const TREE_AT: V3 = [41, 16.9, -5.0]
export const EAR_W = { at: [35, 4.6, -9.5] as V3, s: 0.15 }
export const onEar = (p: V3): V3 => [EAR_W.at[0] + p[0] * EAR_W.s, EAR_W.at[1] + p[1] * EAR_W.s, EAR_W.at[2] + p[2] * EAR_W.s]
export const SPEAKER_AT: V3 = [43, 4.8, -9.9]
/** 第 7 课接尺子的展台 */
export const BENCH7 = { at: [-37, 0, 12] as V3, top: 8.5 }
export const ARM7: V3 = [BENCH7.at[0] - 1.3, BENCH7.top + 1.25, BENCH7.at[2]]
const PT = tips('open')
/** 尺子挂在拇指和食指之间：x 是尺宽的中线，z 是两指正中，FINGER_Y 是手指的高度（尺子的 0 刻度对着它） */
export const RULER_X = ARM7[0] + (PT.index[0] + PT.thumb[0]) / 2 * 0.1 - 0.42
export const RULER_Z = ARM7[2] + (PT.index[2] + PT.thumb[2]) / 2 * 0.1
export const FINGER_Y = ARM7[1] + (PT.index[1] + PT.thumb[1]) / 2 * 0.1
/** 拓展的沙盘 */
export const BENCH_X = { at: [16, 0, 30] as V3, top: 8.5 }
export const ROAD_AT: V3 = [BENCH_X.at[0] - 4.6, BENCH_X.top, BENCH_X.at[2]]
/** 沙盘里 1 m 是几个场景单位 */
export const ROAD_K = 0.45

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
/** 各课的机位 */
export const SPOT = {
  body: spot(0, 9.6, 1.6, 6, 16.6, [0.04, 0.06]),
  split: spot(0, 11.5, 0.5, 7.5, 13, [-0.22, 0.1]),
  neuron: spot(NEURON_AT[0] + 4.4, NEURON_AT[1] - 0.2, NEURON_AT[2], 13.5, 6.5, [-0.08, 0.1]),
  soma: spot(NEURON_AT[0] - 0.4, NEURON_AT[1], NEURON_AT[2], 6, 4.4, [0.2, 0.08]),
  bundle: spot(BUNDLE_AT[0], BUNDLE_AT[1], BUNDLE_AT[2], 4.2, 3.0, [0.15, 0.16]),
  arc: spot(BENCH3.at[0] - 1.1, BENCH3.top + 2.4, BENCH3.at[2], 9.2, 7.4, [-0.06, 0.06]),
  hand: spot(CUP_AT[0] - 1.0, BENCH3.top + 0.6, CUP_AT[2], 4.4, 2.6, [-0.35, 0.22]),
  knee: spot(0.5, 11.9, 1.6, 9.5, 12.6, [0.85, 0.1]),
  head: spot(0, 16.5, 0.4, 3.6, 3.2, [0.45, 0.05]),
  eye: spot(EYE_W.at[0] + 3.2, EYE_W.at[1], EYE_W.at[2], 14.5, 7.6, [0, 0.05]),
  eyeIn: spot(EYE_W.at[0] + 0.4, EYE_W.at[1], EYE_W.at[2], 8.4, 6.2, [0, 0.04]),
  eyeBrain: spot(15, 17.5, 0.4, 36, 14, [0, 0.05]),
  ear: spot(EAR_W.at[0] + 1.4, EAR_W.at[1], EAR_W.at[2], 12.5, 7.4, [0, 0.04]),
  earIn: spot(EAR_W.at[0] - 0.8, EAR_W.at[1], EAR_W.at[2], 7.2, 5.4, [0, 0.03]),
  earBrain: spot(15, 10.4, 0.2, 35, 17, [0, 0.05]),
  brain: spot(BRAIN_BIG.at[0], BRAIN_BIG.at[1] - 0.4, BRAIN_BIG.at[2], 7.6, 6.2, [1.3, 0.1]),
  ruler: spot(RULER_X - 0.6, BENCH7.top + 2.6, BENCH7.at[2], 5.2, 6.0, [-0.25, 0.08]),
  catch: spot(1.6, 12.0, 4.0, 8.5, 11.5, [-0.18, 0.06]),
  car: spot(ROAD_AT[0] + 4.4, BENCH_X.top + 0.5, BENCH_X.at[2], 10.5, 4.2, [0.45, 0.78]),
  q: spot(0, 13, 0, 44, 24, [-0.2, 0.12]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求 */
export interface Want {
  body?: BodyLook
  neuron?: { hi: Partial<Record<keyof typeof NTAG, number>>; dim: number }
  arm3?: { flex: number; back: number }
  cord?: number
  eye?: { pupil: number; stretch: number; glasses: boolean; light: boolean }
  ear?: { vib: number; push: number; glow: number; tube: boolean; sound: boolean; loud: number }
  brain?: { hi: Partial<Record<TagKey, number>>; dim: number }
  ruler?: { y: number; pose: PoseKey; held: boolean }
  car?: { x: number; brake: boolean }
  ball?: V3 | null
}

function useFloor() { return useMemo(() => { const t = makeGround('#171b21', '52,58,66', '10,12,15', 17); t.repeat.set(30, 30); return t }, []) }
export function World({ body = {}, neuron = { hi: {}, dim: 0 }, arm3 = { flex: 0, back: 0 }, cord = 0, eye = { pupil: 2.6, stretch: 1, glasses: false, light: false }, ear = { vib: 0, push: 0, glow: 0, tube: false, sound: false, loud: 0 }, brain = { hi: {}, dim: 0 }, ruler = { y: 0, pose: 'open', held: true }, car = { x: 0, brake: false }, ball = null }: Want) {
  const floor = useFloor()
  // 放大模型晚一点再建：先把人画出来
  const [late, setLate] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLate(true), 300); return () => clearTimeout(t) }, [])
  const dais = useMemo(() => ({ top: disc(3.3, 0.12, { chamfer: 0.03, segs: 96 }), ring: disc(3.45, 0.04, { hole: 3.3, chamfer: 0.01, segs: 96 }) }), [])
  const wall = useMemo(() => new THREE.CylinderGeometry(50, 50, 44, 128, 1, true, Math.PI * 0.6, Math.PI * 0.8), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[260, 260]} /><meshStandardMaterial map={floor} roughness={0.38} metalness={0.05} color="#9aa3ad" /></mesh>
      <mesh geometry={wall} position={[0, 22, 6]}><meshStandardMaterial color="#121820" roughness={0.9} side={THREE.BackSide} /></mesh>
      {Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (0.66 + i * 0.056), x = Math.sin(a) * 49.6, z = 6 + Math.cos(a) * 49.6; return <mesh key={i} position={[x, 16, z]} rotation-y={a + Math.PI}><planeGeometry args={[0.22, 28]} /><meshBasicMaterial color="#6a8fb0" toneMapped={false} transparent opacity={0.05} /></mesh> })}
      {/* 正中的圆台和坐着的人 */}
      <mesh geometry={dais.top} receiveShadow castShadow><meshPhysicalMaterial color="#20262d" roughness={0.3} clearcoat={0.6} /></mesh>
      <mesh geometry={dais.ring}><Metal kind="aluminum" grain="turned" /></mesh>
      <mesh position={[0, 0.122, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[2.8, 2.84, 96]} /><meshBasicMaterial color="#8fb8d8" toneMapped={false} transparent opacity={0.45} /></mesh>
      <group position={[0, BODY_Y, 0]}>
        <Body look={body} />
      </group>

      {late && <>
        {/* 头顶的放大的脑 */}
        <Brain position={BRAIN_BIG.at} scale={BRAIN_BIG.s} hi={brain.hi} dim={brain.dim} />
        <Magnifier at={BRAIN_BIG.at} site={inHead([0, 4, 0])} r={3.6} />
        {/* 左边：放大的神经元和一段神经 */}
        <group position={NEURON_AT}><Neuron hi={neuron.hi} dim={neuron.dim} /></group>
        <group position={BUNDLE_AT} rotation-y={-1.1} scale={0.9}><Bundle /></group>
        {/* 右边：放大的眼球和它前面的小树 */}
        <group position={EYE_W.at} rotation-z={-Math.PI / 2} scale={EYE_W.s}><Eyeball pupil={eye.pupil} stretch={eye.stretch} /></group>
        {eye.glasses && <group position={[EYE_W.at[0] + 4.4, EYE_W.at[1], EYE_W.at[2]]} rotation-z={-Math.PI / 2} scale={EYE_W.s}><Concave /></group>}
        {eye.light && <group position={[EYE_W.at[0] + 6.2, EYE_W.at[1] + 1.0, EYE_W.at[2] + 1.0]} rotation-z={Math.PI / 2 + 0.1} scale={0.2}><Penlight on /></group>}
        <Post at={[TREE_AT[0], 0, TREE_AT[2]]} top={TREE_AT[1]} />
        <Tree at={TREE_AT} s={1.05} />
        <Magnifier at={EYE_W.at} site={EYE_AT(1)} r={4.0} />
        {/* 右下：耳的剖面和音箱 */}
        <group position={EAR_W.at} scale={EAR_W.s}><Ear vib={ear.vib} push={ear.push} glow={ear.glow} tube={ear.tube} /></group>
        <Post at={[SPEAKER_AT[0], 0, SPEAKER_AT[2]]} top={SPEAKER_AT[1] - 1.12} r={0.9} />
        <group position={SPEAKER_AT} scale={0.2}><Speaker beat={ear.sound ? 0.4 + ear.loud : 0} /></group>
        <Waves on={ear.sound} loud={ear.loud} from={[SPEAKER_AT[0] - 1.0, SPEAKER_AT[1], SPEAKER_AT[2]]} to={onEar([3, 0.4, -2])} />
        <Magnifier at={EAR_W.at} site={EAR_AT(1)} r={3.9} />
        {/* 左前：反射弧的展台 */}
        <Plinth at={[BENCH3.at[0] - 0.4, 0, BENCH3.at[2]]} w={8.2} d={3.2} top={BENCH3.top} />
        <Board at={[ARM3[0] - 4.65, BENCH3.top, ARM3[2]]} w={3.6} h={5.4} hole={ARM3} />
        <group position={[ARM3[0] - 0.12 * arm3.back, ARM3[1], ARM3[2]]} scale={0.1}><Arm pose="reach" flex={arm3.flex} /></group>
        <HotCup at={CUP_AT} />
        <group position={CORD3.at} scale={CORD3.s}><Cord hiGray={cord} /></group>
        {/* 左后：接尺子 */}
        <Plinth at={[BENCH7.at[0] - 0.6, 0, BENCH7.at[2]]} w={6.4} d={3.2} top={BENCH7.top} />
        <Board at={[ARM7[0] - 4.65, BENCH7.top, ARM7[2]]} w={3.6} h={5.4} hole={ARM7} />
        <group position={ARM7} scale={0.1}><Arm pose={ruler.pose} /></group>
        <Release at={[RULER_X - 1.2, BENCH7.top, RULER_Z]} h={FINGER_Y - BENCH7.top + 5.5} on={ruler.held} />
        <Ruler at={[RULER_X, FINGER_Y - ruler.y, RULER_Z]} />
        {/* 右后：沙盘 */}
        <Plinth at={BENCH_X.at} w={11} d={3.6} top={BENCH_X.top} />
        <Road at={ROAD_AT} len={20} k={ROAD_K} />
        <Car at={[ROAD_AT[0] + 0.4 + car.x * ROAD_K, BENCH_X.top + 0.03, ROAD_AT[2] - 0.38]} brake={car.brake} />
      </>}
      {ball && <Ball at={ball} />}
    </group>
  )
}
