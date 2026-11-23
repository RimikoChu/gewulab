// 血液循环实验室的大场景：一座科学馆的人体展厅。正中圆台上站着一个半透明的人，身体里有心脏、两肺、血管；
// 左边展台放试管和血细胞视野（第 1 课），右边展台放三段剖开的血管（第 2 课），肺和腿旁边各悬着一个放大模型（第 7 课），
// 左臂缠着血压计的袖带（拓展）。整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 个单位 = 10 cm。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Metal, disc, makeGround } from '@/lab-kit'
import { BloodTube, FIELD, Field, FlowArrow, Plinth, Rack, VES, VesselSeg } from './bench'
import { BEDS, Body, H, HEART_AT, HEART_S, Stream, type BodyLook } from './body'
import { Heart, type HeartProps } from './heart'
import type { CellKey, VesselKey } from './physics'
import type { V3 } from './sdf'
import { Alveoli, Cuff, Hose, Magnifier, Monitor, SideTable, Tissue } from './zoom'

/** 人站在一个圆台上，圆台面高 BODY_Y */
export const BODY_Y = 0.12
/** 人身上的一点（身体坐标）在世界里的位置 */
export const onBody = (p: V3): V3 => [p[0], p[1] + BODY_Y, p[2]]
/** 心脏里的一点（cm）在世界里的位置 */
export const onHeart = (p: V3): V3 => onBody(H(p))
/** 两张展台、两个放大模型、血压计的位置 */
export const BENCH1 = { at: [-11, 0, 2.5] as V3, top: 9.0 }
export const RACK_AT: V3 = [-10.75, BENCH1.top, 3.1]
export const TUBE_AT: V3 = [RACK_AT[0] + 0.2, BENCH1.top + 0.04, RACK_AT[2]]
export const FIELD_AT: V3 = [-12.55, BENCH1.top + 3.25, 1.3]
export const BENCH2 = { at: [11, 0, 2.4] as V3, top: 8.0 }
export const VES_AT = (k: VesselKey): V3 => [BENCH2.at[0], BENCH2.top + 0.7, 0.75 + VES[k].z]
export const ALV_AT: V3 = [-6.0, 13.8, 1.4]
export const TIS_AT: V3 = [-4.6, 4.7, 1.9]
export const ARM = { a: onBody([1.95, 14.3, -0.05]), b: onBody([2.62, 11.4, 0.02]), wrist: onBody([3.16, 9.05, 0.36]) }
export const TABLE_AT: V3 = [4.9, 0, 2.0]
export const MONITOR_AT: V3 = [4.9, 9.3, 2.0]

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
const HC = onHeart([0.2, -0.6, 0])
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  tube: spot(TUBE_AT[0] - 0.22, TUBE_AT[1] + 0.62, TUBE_AT[2], 1.75, 1.25, [0.22, 0.06]),
  field: spot(FIELD_AT[0], FIELD_AT[1] + 0.05, FIELD_AT[2], 3.5, 3.4, [0.14, 0.05]),
  ves: spot(BENCH2.at[0] - 0.2, BENCH2.top + 0.7, 2.25, 5.6, 3.6, [-0.3, 0.6]),
  heart: spot(HC[0], HC[1] + 0.03, HC[2], 1.5, 1.45, [0, 0.05]),
  pump: spot(HC[0] - 0.02, HC[1] - 0.02, HC[2], 1.2, 1.2, [-0.2, 0.1]),
  body: spot(0, 8.9, 0, 8.6, 18.2, [-0.2, 0.06]),
  chest: spot(0, 12.95, 0, 4.4, 3.7, [0.22, 0.1]),
  lung: spot(ALV_AT[0] + 0.2, ALV_AT[1], ALV_AT[2], 4.8, 4.1, [0.28, 0.08]),
  tissue: spot(TIS_AT[0] + 0.1, TIS_AT[1], TIS_AT[2], 4.4, 3.8, [0.3, 0.12]),
  bp: spot(3.6, 11.4, 1.2, 5.4, 6.4, [-0.25, 0.08]),
  wrist: spot(ARM.wrist[0] + 0.1, ARM.wrist[1] - 0.25, ARM.wrist[2], 3.2, 2.6, [-0.35, 0.12]),
  q: spot(0, 8.6, 0, 28, 16.5, [-0.25, 0.14]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：身体各部分显示多少、心脏的样子、试管、视野、血管、气体交换、血压计 */
export interface Want {
  look?: BodyLook
  heart?: HeartProps
  stream?: 'all' | 'lung' | 'none'
  tube?: { k: number; hl: 'plasma' | 'buffy' | 'red' | null }
  field?: CellKey | 'plasma' | null
  ves?: { cut: number; hl: VesselKey | null; rev: boolean }
  gas?: { lung: boolean; tissue: boolean }
  bp?: { on: boolean; lines: [string, string, string]; busy: boolean; squeeze: number }
}
const LOOK: BodyLook = { shell: 1, lungs: 1, tree: 1 }
const SYS = ['leg', 'gut', 'head', 'arm'] as const, LUNG = ['lungL', 'lungR'] as const

/** 地面：深色的水磨石，细细的白点 */
function useFloor() {
  return useMemo(() => { const t = makeGround('#1a1f25', '58,64,72', '12,14,17', 13); t.repeat.set(26, 26); return t }, [])
}
export function World({ look = LOOK, heart = { cut: 0 }, stream = 'all', tube = { k: 1, hl: null }, field = null, ves = { cut: 1, hl: null, rev: false }, gas = { lung: false, tissue: false }, bp = { on: false, lines: ['SYS ---', 'DIA ---', 'PUL ---'], busy: false, squeeze: 0 } }: Want) {
  const floor = useFloor()
  // 两个放大模型晚一点再建：先把人和心脏画出来，页面不会一下子卡住太久
  const [late, setLate] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLate(true), 400); return () => clearTimeout(t) }, [])
  const dais = useMemo(() => ({ top: disc(3.1, BODY_Y, { chamfer: 0.03, segs: 96 }), ring: disc(3.25, 0.04, { hole: 3.1, chamfer: 0.01, segs: 96 }) }), [])
  // 远处的弧形展墙和墙上的竖灯带
  const wall = useMemo(() => { const g = new THREE.CylinderGeometry(30, 30, 26, 96, 1, true, Math.PI * 0.62, Math.PI * 0.76); return g }, [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[220, 220]} /><meshStandardMaterial map={floor} roughness={0.42} metalness={0.05} color="#9aa3ad" /></mesh>
      <mesh geometry={wall} position={[0, 13, 4]}><meshStandardMaterial color="#141a21" roughness={0.9} side={THREE.BackSide} /></mesh>
      {Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.68 + i * 0.08), x = Math.sin(a) * 29.6, z = 4 + Math.cos(a) * 29.6; return <mesh key={i} position={[x, 11, z]} rotation-y={a + Math.PI}><planeGeometry args={[0.25, 18]} /><meshBasicMaterial color="#5f7f99" toneMapped={false} transparent opacity={0.035} /></mesh> })}
      {/* 人站的圆台 */}
      <mesh geometry={dais.top} receiveShadow castShadow><meshPhysicalMaterial color="#20262d" roughness={0.3} clearcoat={0.6} /></mesh>
      <mesh geometry={dais.ring}><Metal kind="aluminum" grain="turned" /></mesh>
      <mesh position={[0, BODY_Y + 0.002, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[2.6, 2.64, 96]} /><meshBasicMaterial color="#8fb8d8" toneMapped={false} transparent opacity={0.5} /></mesh>

      {/* 人：身体、两肺、血管、心脏 */}
      <group position={[0, BODY_Y, 0]}>
        <Body look={look} />
        <group position={HEART_AT} scale={HEART_S}><Heart {...heart} /></group>
        {stream === 'all' && <Stream which={[...SYS, ...LUNG]} n={70} />}
        {stream === 'lung' && <Stream which={[...LUNG]} n={90} />}
        {bp.on && <Cuff a={[1.95, 14.3, -0.05]} b={[2.62, 11.4, 0.02]} r={0.44} squeeze={bp.squeeze} />}
      </group>

      {/* 左展台：试管架、试管、视野展板 */}
      <Plinth at={BENCH1.at} w={3.4} d={2.6} top={BENCH1.top} />
      <group position={RACK_AT}><Rack /></group>
      <group position={TUBE_AT}><BloodTube k={tube.k} hl={tube.hl} /></group>
      <Field at={FIELD_AT} focus={field} />
      <mesh position={[FIELD_AT[0], BENCH1.top + (FIELD_AT[1] - FIELD.r - BENCH1.top) / 2, FIELD_AT[2] - 0.1]} castShadow><cylinderGeometry args={[0.04, 0.05, FIELD_AT[1] - FIELD.r - BENCH1.top, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>
      <mesh position={[FIELD_AT[0], BENCH1.top + 0.02, FIELD_AT[2] - 0.1]} castShadow><cylinderGeometry args={[0.32, 0.34, 0.04, 32]} /><Metal kind="stainless" grain="turned" /></mesh>

      {/* 右展台：三段剖开的血管，各躺在两个透明托架上 */}
      <Plinth at={BENCH2.at} w={6.0} d={4.2} top={BENCH2.top} />
      {(['artery', 'vein', 'capillary'] as VesselKey[]).map(k => <group key={k}>
        <VesselSeg kind={k} at={VES_AT(k)} cut={ves.cut} hl={ves.hl === k} reverse={ves.rev && k === 'vein'} />
        {[-1.5, 1.5].map(x => <mesh key={x} position={[VES_AT(k)[0] + x, BENCH2.top + (VES_AT(k)[1] - VES[k].R - BENCH2.top) / 2, VES_AT(k)[2] - 0.05]}><boxGeometry args={[0.08, VES_AT(k)[1] - VES[k].R - BENCH2.top, 0.5]} /><meshPhysicalMaterial color="#dfeff2" transparent opacity={0.3} roughness={0.05} /></mesh>)}
        <FlowArrow at={[VES_AT(k)[0], BENCH2.top + 0.03, VES_AT(k)[2] - VES[k].R - 0.18]} len={1.4} />
      </group>)}

      {/* 两个放大模型 */}
      {late && <group position={ALV_AT}><Alveoli on={gas.lung} /></group>}
      <Magnifier at={ALV_AT} site={onBody(BEDS.lungR.c)} r={2.15} />
      {late && <group position={TIS_AT} scale={0.86}><Tissue on={gas.tissue} /></group>}
      <Magnifier at={TIS_AT} site={onBody([-0.95, 6.6, 0.3])} r={1.95} />

      {/* 血压计 */}
      <SideTable at={TABLE_AT} top={MONITOR_AT[1]} />
      <group position={MONITOR_AT} scale={1.3}><Monitor at={[0, 0, 0]} lines={bp.lines} busy={bp.busy} /></group>
      {bp.on && <Hose pts={[onBody([2.72, 12.95, 0.5]), [3.3, 12.4, 1.4], [3.85, 10.6, 2.0], [MONITOR_AT[0] - 0.82, MONITOR_AT[1] + 0.3, MONITOR_AT[2] + 0.3]]} />}
    </group>
  )
}
