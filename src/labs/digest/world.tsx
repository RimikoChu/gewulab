// 消化和吸收实验室的大场景：科学馆里“人体的营养”展厅（暗场，自己打光）。1 个单位 = 10 cm。
// 从左到右：食堂餐桌和膳食宝塔（第 7 课）、生物实验台（第 1、3 课）、悬着的十二指肠放大球（第 5 课）、
// 正中圆台上的人体模型（第 2 课、拓展）、放大的胃（第 4 课）、放大的小肠和绒毛（第 6 课）。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Metal, disc, makeGround } from '@/lab-kit'
import { Body, Bolus, type BodyLook } from './body'
import { Bench, BENCH, L1_AT, L1_SPOTS, L3_AT, type L1Want, type L3Want } from './bench'
import { StomachModel, ST_AT, ST_S, type StWant } from './stomach'
import { DuoSphere, DUO_AT, DUO_R, DUO_SITE, type DuoWant } from './duo'
import { GutModel, GUT_AT, VIL_AT, type GutWant } from './villi'
import { Canteen, MEAL_AT, type MealWant } from './meal'
import { Magnifier, Plinth } from './props'
import type { V3 } from './sdf'

/** 人站在一个圆台上，圆台面高 BODY_Y */
export const BODY_Y = 0.12
/** 身体上的一点在世界里的位置 */
export const onBody = (p: V3): V3 => [p[0], p[1] + BODY_Y, p[2]]

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(L1_AT[0], BENCH.top + 0.55, L1_AT[2], 2.9, 1.7, [0.12, 0.42]),
  l1a: spot(L1_SPOTS.bun[0] + 0.2, L1_SPOTS.bun[1] + 0.05, L1_SPOTS.bun[2] - 0.25, 2.0, 1.3, [0.15, 0.5]),
  l1b: spot(L1_SPOTS.paper[0], L1_SPOTS.paper[1] + 0.18, L1_SPOTS.paper[2], 1.4, 0.95, [0.05, 0.55]),
  l1c: spot(L1_SPOTS.beaker[0] + 0.05, L1_SPOTS.beaker[1] - 0.25, L1_SPOTS.beaker[2] + 0.2, 1.5, 1.2, [-0.1, 0.3]),
  l3: spot(L3_AT[0] - 0.02, BENCH.top + 0.72, L3_AT[2], 2.75, 1.65, [-0.08, 0.2]),
  tract: spot(0, 12.3, 0, 4.6, 9.4, [-0.12, 0.05]),
  head: spot(0.05, 15.92 + BODY_Y, 0.1, 2.2, 1.9, [-0.95, 0.08]),
  chest: spot(0.15, 13.4 + BODY_Y, 0, 2.6, 4.4, [-0.25, 0.05]),
  belly: spot(0, 10.4 + BODY_Y, 0.2, 3.6, 3.6, [-0.15, 0.08]),
  st: spot(ST_AT[0] - 0.3, ST_AT[1] + 1.25 * ST_S, ST_AT[2], 5.8, 4.7, [-0.12, 0.12]),
  duo: spot(DUO_AT[0], DUO_AT[1], DUO_AT[2], DUO_R * 2.6, DUO_R * 2.3, [0.1, 0.06]),
  gut: spot(GUT_AT[0] + 0.1, GUT_AT[1] + 1.2, GUT_AT[2] + 0.2, 6.2, 3.6, [-0.5, 0.36]),
  vil: spot(VIL_AT[0], VIL_AT[1] + 1.35, VIL_AT[2], 4.6, 4.8, [-0.08, 0.06]),
  meal: spot(MEAL_AT[0] + 0.2, MEAL_AT[1] + 0.75, MEAL_AT[2] - 0.2, 5.2, 3.0, [0.1, 0.45]),
  q: spot(-3, 8.5, 1.5, 40, 13, [-0.62, 0.08]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求 */
export interface Want {
  body?: BodyLook
  bolus?: { s: number; size: number; color: string } | null
  l1?: L1Want
  l3?: L3Want
  st?: StWant
  duo?: DuoWant
  gut?: GutWant
  meal?: MealWant
}

/** 地面上的一圈圈灯光：每个展台底下一片暖色的光斑，中间亮、往外淡出 */
function usePool() {
  return useMemo(() => {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S
    const g = c.getContext('2d')!, q = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    q.addColorStop(0, 'rgba(255,236,210,0.55)'); q.addColorStop(0.45, 'rgba(255,230,200,0.28)'); q.addColorStop(1, 'rgba(255,230,200,0)')
    g.fillStyle = q; g.fillRect(0, 0, S, S)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
}
const POOLS: [number, number, number][] = [[-34, 1.6, 7], [-22, 2.2, 6.5], [-12.5, 0.8, 4], [0, 0.4, 6.5], [15.5, 1.4, 5.5], [26.5, 1.3, 6.5]]
/** 地面：深色的水磨石，细细的白点 */
function useFloor() {
  return useMemo(() => { const t = makeGround('#1b1f24', '60,64,70', '12,14,17', 21); t.repeat.set(30, 30); return t }, [])
}
export function World({ body = {}, bolus = null, l1, l3, st, duo, gut, meal }: Want) {
  const floor = useFloor(), pool = usePool()
  // 远处几件晚一点再建：先把这一课要看的东西画出来，页面不会一下子卡住
  const [late, setLate] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLate(true), 500); return () => clearTimeout(t) }, [])
  const dais = useMemo(() => ({ top: disc(3.0, BODY_Y, { chamfer: 0.03, segs: 96 }), ring: disc(3.15, 0.04, { hole: 3.0, chamfer: 0.01, segs: 96 }) }), [])
  // 远处的弧形展墙
  const wall = useMemo(() => new THREE.CylinderGeometry(44, 44, 30, 128, 1, true, Math.PI * 0.6, Math.PI * 0.8), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[260, 260]} /><meshStandardMaterial map={floor} roughness={0.4} metalness={0.05} color="#9aa2ab" /></mesh>
      {POOLS.map(([x, z, r], i) => <mesh key={i} position={[x, 0.004, z]} rotation-x={-Math.PI / 2} renderOrder={1}><planeGeometry args={[r * 2, r * 2]} /><meshBasicMaterial map={pool} transparent opacity={0.5} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} /></mesh>)}
      <mesh geometry={wall} position={[-2, 15, 12]}><meshStandardMaterial color="#12171d" roughness={0.92} side={THREE.BackSide} /></mesh>
      {Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (0.66 + i * 0.055), x = -2 + Math.sin(a) * 43.6, z = 12 + Math.cos(a) * 43.6; return <mesh key={i} position={[x, 13, z]} rotation-y={a + Math.PI}><planeGeometry args={[0.22, 20]} /><meshBasicMaterial color="#6a8aa0" toneMapped={false} transparent opacity={0.04} /></mesh> })}

      {/* 正中：人体模型 */}
      <mesh geometry={dais.top} receiveShadow castShadow><meshPhysicalMaterial color="#20262d" roughness={0.3} clearcoat={0.6} /></mesh>
      <mesh geometry={dais.ring}><Metal kind="aluminum" grain="turned" /></mesh>
      <mesh position={[0, BODY_Y + 0.002, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[2.55, 2.59, 96]} /><meshBasicMaterial color="#f0c89a" toneMapped={false} transparent opacity={0.4} /></mesh>
      <group position={[0, BODY_Y, 0]}>
        <Body look={body} />
        {bolus && <Bolus {...bolus} />}
      </group>

      {/* 左：实验台 */}
      <Bench l1={l1} l3={l3} />
      {/* 悬着的十二指肠放大球 */}
      <DuoSphere want={duo} />
      <Magnifier at={DUO_AT} site={onBody(DUO_SITE)} r={DUO_R} line={!!duo} />

      {/* 右：放大的胃 */}
      <Plinth at={[ST_AT[0], 0, ST_AT[2]]} w={5.4} d={3.4} top={ST_AT[1]} />
      <StomachModel want={st} />

      {/* 更右：放大的小肠和绒毛 */}
      {late && <>
        <Plinth at={[GUT_AT[0], 0, GUT_AT[2]]} w={7.0} d={3.8} top={GUT_AT[1]} />
        <GutModel want={gut} />
      </>}

      {/* 最左：食堂餐桌和膳食宝塔 */}
      {late && <Canteen want={meal} />}
    </group>
  )
}
