// 油浸式电力变压器：钢板焊的油箱（加强筋、底座、滚轮），顶上三只高压套管（瓷件一节节伞裙）、三只低压套管、储油柜，
// 背后一排片式散热器。cut 时把朝前的油箱壁去掉：看得见三柱式铁芯（硅钢片叠成，上下铁轭），每柱上内层低压绕组、外层高压绕组；
// 中间那一柱的高压绕组再剖开一半，看得见里面的低压绕组。flux 是铁芯里交变的磁通（−1 到 1），i1、i2 是两侧电流的相对大小。
// 单位 m，原点在油箱底面中心，油箱长边沿 x。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe, mergeParts, Painted, type Part, type RY } from '@/lab-kit'
import { COL } from './layout'
import { makeText, makeWinding, rep } from './mats'
import type { V3 } from './physics'
import { FieldLines, LoopFlow } from './fx'

/** 油箱：长、深、高；三根铁芯柱的 x */
export const TK = { L: 4.4, D: 1.9, H: 2.9, base: 0.35, limbs: [-1.25, 0, 1.25] }
const CORE = { r: 0.3, y0: 0.82, y1: 2.32, yoke: 0.36 }
const LV = { r0: 0.34, r1: 0.44 }, HV = { r0: 0.5, r1: 0.6 }

/** 一只瓷套管：法兰、一节节伞裙的瓷件、顶上的接线端子。h 是瓷件高度 */
export function Bushing({ h, r = 0.12, sheds = 12, color = '#8a5a3c' }: { h: number; r?: number; sheds?: number; color?: string }) {
  const geo = useMemo(() => {
    const p: RY[] = [[0, 0], [r + 0.03, 0], [r + 0.03, 0.06]]
    for (let i = 0; i < sheds; i++) { const y = 0.1 + i * (h - 0.16) / sheds, s = i % 2 ? 1.55 : 1.9; p.push([r, y], [r * s, y + 0.02], [r * s, y + 0.035], [r, y + 0.08]) }
    p.push([r * 0.8, h], [0.03, h], [0.03, h + 0.12], [0, h + 0.12])
    return lathe(p, { segs: 32, crease: 50 })
  }, [h, r, sheds])
  return <mesh geometry={geo} castShadow><meshPhysicalMaterial color={color} roughness={0.18} clearcoat={0.9} clearcoatRoughness={0.1} /></mesh>
}

/** 油箱、底座、加强筋、散热器、储油柜：静物合成一个模型 */
function tankParts(cut: boolean) {
  const P: Part[] = [], { L, D, H, base } = TK
  const b = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string) => P.push({ p: [x, y0 + h / 2, z], s: [w, h, d], c })
  b(0, 0, 0, L + 0.4, base, D + 0.4, '#555b60')                          // 底座
  b(0, base, -D / 2, L, H - base, 0.02, '#78868a')                      // 后壁
  b(-L / 2, base, 0, 0.02, H - base, D, '#78868a'); b(L / 2, base, 0, 0.02, H - base, D, '#78868a')
  if (!cut) b(0, base, D / 2, L, H - base, 0.02, '#78868a')
  b(0, H, 0, L + 0.12, 0.08, D + 0.12, '#6f7c80')                        // 箱盖
  // 箱壁外的竖向加强筋
  for (let k = -3; k <= 3; k++) { b(k * 0.62, base, -D / 2 - 0.05, 0.08, H - base, 0.1, '#6f7c80'); if (!cut) b(k * 0.62, base, D / 2 + 0.05, 0.08, H - base, 0.1, '#6f7c80') }
  // 背后的片式散热器：12 片，上下两根联管
  for (let k = 0; k < 12; k++) b(-1.65 + k * 0.3, base + 0.3, -D / 2 - 0.75, 0.04, H - 0.9, 1.1, '#87949a')
  b(0, H - 0.5, -D / 2 - 0.3, 3.6, 0.12, 0.12, '#6f7c80'); b(0, base + 0.25, -D / 2 - 0.3, 3.6, 0.12, 0.12, '#6f7c80')
  // 储油柜的支架
  b(-1.2, H, -D / 2 + 0.25, 0.1, 0.9, 0.1, '#6f7c80'); b(1.2, H, -D / 2 + 0.25, 0.1, 0.9, 0.1, '#6f7c80')
  return P
}

/** 铁芯：三根芯柱、上下铁轭。表面贴一道道硅钢片的叠缝 */
function Core() {
  const tex = useMemo(() => { const t = rep(makeWinding([120, 126, 132], 128), 1, 1); return t }, [])
  const texY = useMemo(() => { const t = tex.clone(); t.rotation = Math.PI / 2; t.needsUpdate = true; return t }, [tex])
  const mat = <meshStandardMaterial map={tex} color="#7f8c99" metalness={0.6} roughness={0.38} />
  const span = TK.limbs[2] - TK.limbs[0] + 2 * CORE.r
  return <group>
    {TK.limbs.map(x => <mesh key={x} position={[x, (CORE.y0 + CORE.y1) / 2, 0]} castShadow><boxGeometry args={[CORE.r * 2, CORE.y1 - CORE.y0, CORE.r * 1.7]} />{mat}</mesh>)}
    {[CORE.y0 - CORE.yoke / 2, CORE.y1 + CORE.yoke / 2].map(y => <mesh key={y} position={[0, y, 0]} castShadow><boxGeometry args={[span, CORE.yoke, CORE.r * 1.7]} /><meshStandardMaterial map={texY} color="#7f8c99" metalness={0.6} roughness={0.38} /></mesh>)}
    {/* 夹件：上下两根槽钢夹着铁轭 */}
    {[CORE.y0 - CORE.yoke / 2, CORE.y1 + CORE.yoke / 2].flatMap(y => [-1, 1].map(s => <mesh key={`${y}${s}`} position={[0, y, s * (CORE.r * 0.85 + 0.04)]}><boxGeometry args={[span + 0.1, CORE.yoke + 0.06, 0.06]} /><meshStandardMaterial color="#3d4246" metalness={0.4} roughness={0.5} /></mesh>))}
  </group>
}

/** 一柱上的两层绕组。open：高压绕组朝前剖开一半 */
function Windings({ open }: { open: boolean }) {
  const lvT = useMemo(() => { const t = rep(makeWinding([186, 104, 52], 18), 1, 1); t.rotation = Math.PI / 2; t.repeat.set(1, 1); return t }, [])
  const hvT = useMemo(() => { const t = rep(makeWinding([150, 104, 66], 90), 1, 1); t.rotation = Math.PI / 2; t.repeat.set(1, 1); return t }, [])
  const h = CORE.y1 - CORE.y0 - 0.12, y = (CORE.y0 + CORE.y1) / 2
  const ring = (r0: number, r1: number, a0 = 0, da = Math.PI * 2) => {
    const s = new THREE.Shape(); s.absarc(0, 0, r1, a0, a0 + da, false); s.absarc(0, 0, r0, a0 + da, a0, true); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 48 }); g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0)
    // 竖着贴绕组的纹理：u 绕一圈，v 沿高度
    const p = g.attributes.position, uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, Math.atan2(p.getZ(i), p.getX(i)) / Math.PI, p.getY(i) / h + 0.5)
    return g
  }
  const geo = useMemo(() => ({ lv: ring(LV.r0, LV.r1), hv: ring(HV.r0, HV.r1), hvHalf: ring(HV.r0, HV.r1, 0, Math.PI) }), [])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group position={[0, y, 0]}>
    <mesh geometry={geo.lv} castShadow><meshPhysicalMaterial map={lvT} color="#e3a06c" metalness={0.45} roughness={0.35} clearcoat={0.4} /></mesh>
    <mesh geometry={open ? geo.hvHalf : geo.hv} castShadow><meshPhysicalMaterial map={hvT} color="#c99a6a" roughness={0.55} clearcoat={0.2} side={THREE.DoubleSide} /></mesh>
    {/* 上下两块绝缘压板 */}
    {[-1, 1].map(s => <mesh key={s} position={[0, s * (h / 2 + 0.03), 0]}><cylinderGeometry args={[HV.r1 + 0.03, HV.r1 + 0.03, 0.05, 40]} /><meshStandardMaterial color="#5b4630" roughness={0.7} /></mesh>)}
  </group>
}

/** 铁芯里的磁感线：中间一柱向上（或向下），从两边的铁轭、边柱绕回来；flux 的正负是方向 */
function CoreFlux({ flux }: { flux: number }) {
  const lines = useMemo(() => {
    const out: V3[][] = []
    for (const side of [-1, 1]) for (const d of [-0.12, 0, 0.12]) {
      const x0 = d, x1 = side * (TK.limbs[2] + d * side), y0 = CORE.y0 - CORE.yoke / 2 + d * 0.6 * side, y1 = CORE.y1 + CORE.yoke / 2 - d * 0.6 * side
      const xa = x0, z = HV.r1 + 0.06   // 画在绕组前面一层：沿着铁芯的轮廓走一圈
      const corners: V3[] = [[xa, y0, z], [xa, y1, z], [x1, y1, z], [x1, y0, z], [xa, y0 + 0.001, z]], pts: V3[] = []
      // 每条边上多取几个点，拐角处才不会被曲线甩出去
      for (let i = 0; i < corners.length - 1; i++) for (let k = 0; k < 8; k++) { const a = corners[i], b = corners[i + 1], u = k / 8; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, z]) }
      pts.push(corners[corners.length - 1])
      out.push(pts)
    }
    return out
  }, [])
  const a = Math.abs(flux)
  return <FieldLines lines={lines} opacity={a > 0.05 ? 0.35 + 0.65 * a : 0} heads={3} head={0.09} r={0.012} speed={0.3} flip={flux < 0} />
}

export function Transformer({ cut = false, flux = 0, i1 = 0, i2 = 0, name = '' }: { cut?: boolean; flux?: number; i1?: number; i2?: number; name?: string }) {
  const geo = useMemo(() => mergeParts(tankParts(cut)), [cut])
  const plate = makeText([name], { w: 512, h: 128, bg: '#e8e6de', fg: '#22303c', size: 56, weight: 700 })
  const { L, D, H } = TK
  // 两侧电流的流动光点：低压绕组外面一圈（粗、慢、密），高压绕组外面一圈
  const ringPts = (r: number, y: number): V3[] => Array.from({ length: 24 }, (_, k) => { const a = k / 24 * Math.PI * 2; return [r * Math.cos(a), y, r * Math.sin(a)] as V3 })
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.5} metal={0.35} /></mesh>
    {/* 滚轮 */}
    {[-1.6, 1.6].flatMap(x => [-0.7, 0.7].map(z => <mesh key={`${x}${z}`} position={[x, 0.12, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.14, 0.14, 0.1, 20]} /><Metal kind="iron" grain="cast" /></mesh>))}
    {/* 储油柜 */}
    <mesh position={[0, H + 0.95, -D / 2 + 0.25]} rotation-z={Math.PI / 2} castShadow><capsuleGeometry args={[0.32, 2.6, 8, 24]} /><meshStandardMaterial color="#7c898e" roughness={0.5} metalness={0.35} /></mesh>
    {/* 高压套管（前面一排高的）和低压套管（后面一排矮的）、中性点套管 */}
    {TK.limbs.map(x => <group key={x} position={[x, H + 0.04, 0.35]}><Bushing h={1.9} /></group>)}
    <group position={[1.9, H + 0.04, 0.35]}><Bushing h={0.9} r={0.09} sheds={5} /></group>
    {TK.limbs.map(x => <group key={x} position={[x * 0.7, H + 0.04, -0.4]}><Bushing h={0.55} r={0.1} sheds={3} color="#7a5038" /></group>)}
    {name && <mesh position={[L / 2 + 0.012, 1.7, 0.3]} rotation-y={Math.PI / 2}><planeGeometry args={[0.9, 0.22]} /><meshStandardMaterial map={plate} roughness={0.5} /></mesh>}
    {cut && <group>
      <Core />
      {TK.limbs.map((x, i) => <group key={x} position={[x, 0, 0]}><Windings open={i === 1} /></group>)}
      <CoreFlux flux={flux} />
      {/* 剖开的油箱里是淡黄的变压器油 */}
      <mesh position={[0, (TK.base + H) / 2, 0]} renderOrder={2}><boxGeometry args={[L - 0.04, H - TK.base - 0.06, D - 0.04]} /><meshPhysicalMaterial color="#e8c870" transparent opacity={0.05} roughness={0.1} depthWrite={false} /></mesh>
      {/* 剖口的四条边：油箱壁的厚度 */}
      <mesh position={[0, H - 0.02, D / 2]}><boxGeometry args={[L, 0.06, 0.06]} /><meshStandardMaterial color="#e7d9b8" roughness={0.6} /></mesh>
      <mesh position={[0, TK.base + 0.02, D / 2]}><boxGeometry args={[L, 0.06, 0.06]} /><meshStandardMaterial color="#e7d9b8" roughness={0.6} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * L / 2, (H + TK.base) / 2, D / 2]}><boxGeometry args={[0.06, H - TK.base, 0.06]} /><meshStandardMaterial color="#e7d9b8" roughness={0.6} /></mesh>)}
      <group position={[0, (CORE.y0 + CORE.y1) / 2 + 0.3, 0]}>
        <LoopFlow pts={ringPts(LV.r1 + 0.01, 0)} flow={i1} dots={Math.round(10 + 22 * Math.min(1, Math.abs(i1)))} size={0.022} speed={0.8} />
      </group>
      <group position={[0, (CORE.y0 + CORE.y1) / 2 + 0.55, 0]}>
        <LoopFlow pts={ringPts(HV.r1 + 0.02, 0)} flow={i2} dots={Math.round(4 + 6 * Math.min(1, Math.abs(i2)))} size={0.016} speed={0.8} color={COL.glow} />
      </group>
    </group>}
  </group>
}

/** 变压器旁的一只铭牌底座（混凝土基础、油坑卵石） */
export function Pad() {
  return <group>
    <RoundedBox args={[TK.L + 2.4, 0.3, TK.D + 3.4]} radius={0.04} smoothness={2} position={[0, 0.15, -0.5]} receiveShadow><meshStandardMaterial color="#b4b0a6" roughness={0.9} /></RoundedBox>
    <mesh position={[0, 0.31, -0.5]} rotation-x={-Math.PI / 2}><planeGeometry args={[TK.L + 2.2, TK.D + 3.2]} /><meshStandardMaterial color="#8d877b" roughness={1} /></mesh>
  </group>
}
