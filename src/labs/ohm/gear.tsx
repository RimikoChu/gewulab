// 工作台上的器材：接线柱、直流稳压电源、电流表和电压表、滑动变阻器、装在底板上的水泥电阻、灯座和小灯泡、单刀开关、防静电手套。
// 全部按厘米写（外面套 Bench，乘 CM），原点在器材的底面正中，正面朝 +z。每样器材都导出它几个接线柱的位置，导线从那里接。
import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Led, Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { DIAL, makeCement, makeCoil, makeDial, makeMarks, makeText } from './mats'

export type V3 = [number, number, number]
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const RED = '#c4302a', BLACK = '#1c1d1f'

// ---------- 接线柱 ----------
/** 接线柱：黄铜六角螺母和螺杆，上面一只滚花的塑料帽。导线夹在螺母和帽之间，离底 POST_Y */
export const POST_Y = 0.45
const NUT = (() => { const g = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 6); g.translate(0, 0.13, 0); return g })()
const STEM = (() => { const g = new THREE.CylinderGeometry(0.17, 0.17, 0.7, 12); g.translate(0, 0.55, 0); return g })()
const WASHER = disc(0.4, 0.06, { hole: 0.17, segs: 24 })
const CAP = lathe([[0, 0.62], [0.42, 0.62], [0.5, 0.7], [0.5, 1.2], [0.44, 1.3], [0, 1.32]], { segs: 20, crease: 40 })
const KNURL = mergeGeometries(Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2, g = new THREE.BoxGeometry(0.06, 0.46, 0.06); g.rotateY(-a); g.translate(Math.cos(a) * 0.5, 0.95, Math.sin(a) * 0.5); return g }))
/** flat：装在竖直面板上的接线柱（轴朝 +z） */
export function Post({ at, color = BLACK, flat = false }: { at: V3; color?: string; flat?: boolean }) {
  const cap = <meshPhysicalMaterial color={color} roughness={0.32} clearcoat={0.5} clearcoatRoughness={0.3} />
  return <group position={at} rotation-x={flat ? Math.PI / 2 : 0}>
    <mesh geometry={NUT} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh geometry={STEM}><Metal kind="brass" rough={0.3} /></mesh>
    <mesh geometry={WASHER} position={[0, 0.52, 0]}><Metal kind="brass" /></mesh>
    <mesh geometry={CAP} castShadow>{cap}</mesh>
    <mesh geometry={KNURL}>{cap}</mesh>
  </group>
}

// ---------- 直流稳压电源 ----------
/** 机壳 24 × 11 × 20 cm，脚高 0.6 cm；输出接线柱在面板右下，红正黑负 */
export const SUP = { w: 24, h: 11, d: 20, foot: 0.6 }
const PANEL_Z = SUP.d / 2 + 0.25
export const supplyPosts = (): { plus: V3; minus: V3 } => ({ plus: [4.2, SUP.foot + 2.8, PANEL_Z + POST_Y], minus: [8.6, SUP.foot + 2.8, PANEL_Z + POST_Y] })
const KNOB = lathe([[0, 0], [1.3, 0], [1.38, 0.12], [1.38, 1.35], [1.22, 1.62], [0, 1.66]], { segs: 40, crease: 40 })
const KNOB_KNURL = mergeGeometries(Array.from({ length: 30 }, (_, i) => { const a = i / 30 * Math.PI * 2, g = new THREE.BoxGeometry(0.1, 1.1, 0.1); g.rotateY(-a); g.translate(Math.cos(a) * 1.4, 0.7, Math.sin(a) * 1.4); return g }))
/** u：输出电压（显示屏上的数）；on：开着没有；knob：调压旋钮转到哪（0–1） */
export function Supply({ u, on = true, knob = 0.5 }: { u: number; on?: boolean; knob?: number }) {
  const { w, h, d, foot } = SUP, cy = foot + h / 2
  const paint = <meshPhysicalMaterial color="#d6d7d2" roughness={0.42} clearcoat={0.45} clearcoatRoughness={0.35} />
  const panel = <meshPhysicalMaterial color="#2a2e33" roughness={0.5} clearcoat={0.3} />
  const tx = useMemo(() => ({
    name: makeText(['直流稳压电源'], { w: 512, h: 64, bg: '#2a2e33', fg: '#d9dde0', size: 40, weight: 600 }),
    v: makeText(['V'], { w: 64, h: 64, bg: '#2a2e33', fg: '#d9dde0', size: 44 }),
    marks: makeMarks(['+', '−'], { w: 256, h: 64, bg: '#2a2e33', size: 50, colors: ['#ff8a7a', '#d9dde0'] }),
    adj: makeText(['电压调节'], { w: 256, h: 64, bg: '#2a2e33', fg: '#aeb4b9', size: 34, weight: 500 }),
  }), [])
  const P = supplyPosts()
  return <group>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 2), foot / 2, sz * (d / 2 - 2)]}><cylinderGeometry args={[0.9, 1, foot, 20]} /><meshStandardMaterial color="#141516" roughness={0.8} /></mesh>))}
    {/* 机壳：一只 U 形钢板罩在底盘上，前面一块黑色面板；侧面一道分缝 */}
    <RoundedBox args={[w, h, d]} radius={0.55} smoothness={4} position={[0, cy, 0]} castShadow receiveShadow>{paint}</RoundedBox>
    <mesh position={[0, cy, -d / 2 + 2.2]}><boxGeometry args={[w + 0.03, h + 0.03, 0.07]} /><meshStandardMaterial color="#8d8f8c" roughness={0.6} /></mesh>
    {/* 顶上的散热孔 */}
    {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-3, foot + h + 0.002, -7.5 + i * 1.1]} rotation-x={-Math.PI / 2}><planeGeometry args={[12, 0.42]} /><meshStandardMaterial color="#2c2e30" roughness={0.9} /></mesh>)}
    <RoundedBox args={[w - 1.2, h - 1.2, 0.36]} radius={0.18} smoothness={2} position={[0, cy, d / 2 + 0.06]}>{panel}</RoundedBox>
    <mesh position={[-5, foot + h - 1.55, PANEL_Z]}><planeGeometry args={[8.4, 1.05]} /><meshStandardMaterial map={tx.name} roughness={0.6} /></mesh>
    {/* 数字表：黑色的窗框里一块显示屏 */}
    <RoundedBox args={[9, 3.6, 0.3]} radius={0.15} smoothness={2} position={[-5.4, foot + 6.3, PANEL_Z]}><meshStandardMaterial color="#0d0f10" roughness={0.3} /></RoundedBox>
    <Led text={on ? u.toFixed(2) : ''} w={7.4} h={2.6} position={[-5.9, foot + 6.3, PANEL_Z + 0.17]} />
    <mesh position={[-1.4, foot + 5.6, PANEL_Z + 0.17]}><planeGeometry args={[0.8, 0.8]} /><meshStandardMaterial map={tx.v} roughness={0.6} /></mesh>
    {/* 调压旋钮：滚花的黑胶木，带一道白色指示线 */}
    <group position={[5.6, foot + 6.3, PANEL_Z]} rotation-x={Math.PI / 2}>
      <group rotation-y={-(-2.4 + 4.8 * knob)}>
        <mesh geometry={KNOB} castShadow><meshPhysicalMaterial color="#17181a" roughness={0.35} clearcoat={0.6} /></mesh>
        <mesh geometry={KNOB_KNURL}><meshPhysicalMaterial color="#17181a" roughness={0.4} /></mesh>
        <mesh position={[0, 1.67, -0.75]}><boxGeometry args={[0.16, 0.02, 1.0]} /><meshBasicMaterial color="#f2f2ea" /></mesh>
      </group>
      <mesh position={[0, 0.02, 0]} rotation-x={Math.PI / 2}><ringGeometry args={[1.7, 1.9, 40, 1, Math.PI * 0.3 + Math.PI / 2, Math.PI * 1.4]} /><meshBasicMaterial color="#8c9298" side={THREE.DoubleSide} /></mesh>
    </group>
    <mesh position={[5.6, foot + 3.65, PANEL_Z + 0.01]}><planeGeometry args={[3.2, 0.8]} /><meshStandardMaterial map={tx.adj} roughness={0.6} /></mesh>
    {/* 电源开关：翘板 */}
    <RoundedBox args={[2.6, 1.8, 0.4]} radius={0.12} smoothness={2} position={[-8.6, foot + 2.6, PANEL_Z + 0.1]}><meshStandardMaterial color="#0e0f10" roughness={0.4} /></RoundedBox>
    <mesh position={[-8.6, foot + 2.6, PANEL_Z + 0.35]} rotation-x={on ? -0.18 : 0.18}><boxGeometry args={[2.1, 1.35, 0.3]} /><meshPhysicalMaterial color="#c3332a" roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh position={[-5.6, foot + 2.6, PANEL_Z + 0.05]}><circleGeometry args={[0.28, 20]} /><meshStandardMaterial color={on ? '#5dff8a' : '#1f3324'} emissive="#5dff8a" emissiveIntensity={on ? 1.2 : 0} toneMapped={!on} /></mesh>
    {/* 输出接线柱 */}
    <Post at={[P.plus[0], P.plus[1], PANEL_Z]} color={RED} flat /><Post at={[P.minus[0], P.minus[1], PANEL_Z]} flat />
    <mesh position={[(P.plus[0] + P.minus[0]) / 2, foot + 1.15, PANEL_Z + 0.01]}><planeGeometry args={[6.6, 1.1]} /><meshStandardMaterial map={tx.marks} roughness={0.6} /></mesh>
  </group>
}

// ---------- 电流表、电压表 ----------
const LEDGE_Y = 2.4, LEDGE_Z = 3.4
/** 三个接线柱：“−”、小量程、大量程 */
export const meterPosts = (): { neg: V3; lo: V3; hi: V3 } => ({ neg: [-3.8, LEDGE_Y + POST_Y, LEDGE_Z], lo: [0, LEDGE_Y + POST_Y, LEDGE_Z], hi: [3.8, LEDGE_Y + POST_Y, LEDGE_Z] })
const TILT = -0.22, DW = 10.4, DH = DW * DIAL.h / DIAL.w, DY = 5.6
const PIVOT_Y = DY + DH / 2 - DH * DIAL.cy / DIAL.h, NEEDLE = DW * DIAL.r1 / DIAL.w + 0.25, HALF = DIAL.half * Math.PI / 180
const SCREW = disc(0.42, 0.2, { segs: 24 })
/** 指针停住的两头（满偏的几分之几） */
const LO = -0.05, HI = 1.06
/**
 * 课堂上的指针式电表：深灰的胶木外壳往后仰，表盘两排刻度，前面一条台阶上三个接线柱。
 * k：指针偏了满偏的几分之几（小量程）。指针带阻尼：会摆过头一点再停稳。
 */
export function Meter({ kind, k }: { kind: 'A' | 'V' | 'mA'; k: number }) {
  const dial = makeDial(kind)
  const tx = useMemo(() => ({
    marks: makeMarks(kind === 'A' ? ['−', '0.6', '3'] : kind === 'mA' ? ['−', '300', ''] : ['−', '3', '15'], { w: 768, h: 64, bg: '#232a31', size: 46, colors: ['#e9e6dc', '#ff8a7a', '#ff8a7a'] }),
    name: makeText([kind === 'A' ? '直流电流表' : kind === 'mA' ? '人体电流（示意）' : '直流电压表'], { w: 512, h: 64, bg: '#26313b', fg: '#c9d0d6', size: 38, weight: 600 }),
  }), [kind])
  const needle = useRef<THREE.Group>(null), s = useRef({ x: k, v: 0 }), goal = useRef(k); goal.current = k
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), q = s.current, w = 8.5, z = 0.34
    for (let i = 0; i < 4; i++) {
      const h = dt / 4, a = -w * w * (q.x - goal.current) - 2 * z * w * q.v
      q.v += a * h; q.x += q.v * h
      if (q.x > HI) { q.x = HI; q.v = -q.v * 0.25 } else if (q.x < LO) { q.x = LO; q.v = -q.v * 0.25 }
    }
    if (needle.current) needle.current.rotation.z = -(-HALF + 2 * HALF * q.x)
  })
  const bake = <meshPhysicalMaterial color="#26313b" roughness={0.36} clearcoat={0.55} clearcoatRoughness={0.3} />
  const P = meterPosts()
  return <group>
    <RoundedBox args={[13, 1.0, 10.4]} radius={0.3} smoothness={3} position={[0, 0.5, 0]} castShadow receiveShadow>{bake}</RoundedBox>
    <RoundedBox args={[12.4, 1.5, 3.2]} radius={0.3} smoothness={3} position={[0, 1.65, LEDGE_Z]} castShadow>{bake}</RoundedBox>
    <mesh position={[0, 1.6, LEDGE_Z + 1.61]}><planeGeometry args={[11.4, 0.95]} /><meshStandardMaterial map={tx.marks} roughness={0.5} /></mesh>
    <Post at={[P.neg[0], LEDGE_Y, LEDGE_Z]} color={BLACK} /><Post at={[P.lo[0], LEDGE_Y, LEDGE_Z]} color={RED} /><Post at={[P.hi[0], LEDGE_Y, LEDGE_Z]} color={RED} />
    <group position={[0, 0.95, -1.1]} rotation-x={TILT}>
      <RoundedBox args={[12.4, 10.2, 6.4]} radius={0.55} smoothness={4} position={[0, 5.1, 0]} castShadow>{bake}</RoundedBox>
      {/* 表盘、一圈窄边框、玻璃 */}
      <mesh position={[0, DY, 3.21]}><planeGeometry args={[DW, DH]} /><meshStandardMaterial map={dial} color="#d4d2ca" roughness={0.8} envMapIntensity={0.4} /></mesh>
      {[[0, DY + DH / 2 + 0.22, DW + 0.88, 0.44], [0, DY - DH / 2 - 0.22, DW + 0.88, 0.44]].map(([x, y, ww, hh], i) => <RoundedBox key={i} args={[ww, hh, 0.32]} radius={0.1} smoothness={2} position={[x, y, 3.3]}>{bake}</RoundedBox>)}
      {[-1, 1].map(sx => <RoundedBox key={sx} args={[0.44, DH + 0.88, 0.32]} radius={0.1} smoothness={2} position={[sx * (DW / 2 + 0.22), DY, 3.3]}>{bake}</RoundedBox>)}
      <group ref={needle} position={[0, PIVOT_Y, 3.27]}>
        <mesh position={[0, NEEDLE / 2, 0]}><boxGeometry args={[0.09, NEEDLE, 0.03]} /><meshBasicMaterial color="#121212" /></mesh>
        <mesh position={[0, -0.45, 0]}><boxGeometry args={[0.28, 0.55, 0.06]} /><meshStandardMaterial color="#121212" /></mesh>
      </group>
      <mesh position={[0, PIVOT_Y - 0.05, 3.3]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.55, 0.55, 0.1, 32]} />{bake}</mesh>
      <mesh position={[0, DY, 3.42]} renderOrder={4}><planeGeometry args={[DW, DH]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.1} roughness={0.04} envMapIntensity={1.5} depthWrite={false} clearcoat={1} /></mesh>
      {/* 调零螺丝、铭牌 */}
      <mesh geometry={SCREW} position={[0, 1.15, 3.18]} rotation-x={Math.PI / 2}><Metal kind="steel" grain="turned" /></mesh>
      <mesh position={[0, 1.15, 3.39]} rotation-z={0.5}><boxGeometry args={[0.6, 0.08, 0.03]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0, 1.05, 3.21]} visible={false}><planeGeometry args={[1, 1]} /></mesh>
      <mesh position={[3.6, 1.15, 3.21]}><planeGeometry args={[4.2, 0.53]} /><meshStandardMaterial map={tx.name} roughness={0.6} /></mesh>
    </group>
  </group>
}

// ---------- 滑动变阻器 ----------
const RH = { len: 22, r: 1.6, cy: 3.3, bar: 7.4, bx: 12.4 }
/** 滑片能走的范围：p = 0 在西头（下接线柱 A 那一端），p = 1 在东头 */
export const sliderX = (p: number) => -10.2 + 20.4 * p
/** 变阻器的接线柱：A、B 在两头支架脚上，C、D 在金属杆两头 */
export const rheoPosts = () => ({ A: [-RH.bx - 0.9, 1.0 + POST_Y, 1.6] as V3, B: [RH.bx + 0.9, 1.0 + POST_Y, 1.6] as V3, C: [-RH.bx + 1.2, RH.bar + 0.35 + POST_Y, 0] as V3, D: [RH.bx - 1.2, RH.bar + 0.35 + POST_Y, 0] as V3 })
const COIL_TURNS = 180
const TUBE = shell([[RH.r, -RH.len / 2], [RH.r, RH.len / 2]], 0.28, { segs: 40 })
const END_CAP = disc(RH.r + 0.25, 0.5, { hole: 0.4, segs: 32 })
/** 滑动变阻器：白瓷管上密绕着漆包电阻丝，两头两块钢支架，上面一根方钢杆，杆上套着能滑的滑片。p 滑片位置；onDrag 拖滑片时报告新的 p；hand 显示捏着滑片的手 */
export function Rheostat({ p, onDrag, hand = false }: { p: number; onDrag?: (p: number) => void; hand?: boolean }) {
  const plate = makeText(['20 Ω  2 A'], { w: 256, h: 96, bg: '#d9d4c4', fg: '#222', size: 44 })
  const coil = useMemo(() => { const t = makeCoil().clone(); t.repeat.set(1, COIL_TURNS / 8); t.needsUpdate = true; return t }, [])
  const P = rheoPosts(), sx = sliderX(p)
  const drag = useRef<{ x0: number; p0: number } | null>(null)
  const ref = useRef<THREE.Group>(null)
  const local = (pt: THREE.Vector3) => ref.current?.parent ? ref.current.parent.worldToLocal(pt.clone()).x : 0
  const frame = <meshPhysicalMaterial color="#33424e" roughness={0.42} clearcoat={0.5} />
  const down = (e: ThreeEvent<PointerEvent>) => { if (!onDrag) return; e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); drag.current = { x0: local(e.point), p0: p } }
  const move = (e: ThreeEvent<PointerEvent>) => { if (!drag.current || !onDrag) return; const dx = local(e.point) - drag.current.x0; onDrag(Math.min(1, Math.max(0, drag.current.p0 + dx / 20.4))) }
  const up = (e: ThreeEvent<PointerEvent>) => { drag.current = null; (e.target as Element).releasePointerCapture?.(e.pointerId) }
  return <group>
    {[-1, 1].map(s => <group key={s} position={[s * RH.bx, 0, 0]}>
      <RoundedBox args={[0.32, RH.bar + 0.4, 4.2]} radius={0.08} smoothness={2} position={[0, (RH.bar + 0.4) / 2, 0]} castShadow>{frame}</RoundedBox>
      <RoundedBox args={[2.6, 0.3, 4.8]} radius={0.08} smoothness={2} position={[s * 0.9, 0.15, 0]} castShadow receiveShadow>{frame}</RoundedBox>
      <RoundedBox args={[1.8, 0.5, 1.6]} radius={0.08} smoothness={2} position={[s * 0.9, 0.55, 1.6]} castShadow><meshStandardMaterial color="#e3ddcc" roughness={0.5} /></RoundedBox>
      <mesh position={[s * 0.18, RH.cy, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.35, 0.35, 0.3, 6]} /><Metal kind="steel" /></mesh>
    </group>)}
    <mesh position={[-RH.bx - 0.17, 4.6, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[2.8, 1.05]} /><meshStandardMaterial map={plate} roughness={0.5} /></mesh>
    {/* 瓷管、两头的瓷端盖、线圈；线圈顶上被滑片磨亮的一道 */}
    <group position={[0, RH.cy, 0]} rotation-z={Math.PI / 2}>
      <mesh geometry={TUBE} castShadow><meshPhysicalMaterial color="#efece4" roughness={0.25} clearcoat={0.6} /></mesh>
      {[-1, 1].map(s => <mesh key={s} geometry={END_CAP} position={[0, s * (RH.len / 2) - (s > 0 ? 0.5 : 0), 0]}><meshPhysicalMaterial color="#e6e1d4" roughness={0.3} clearcoat={0.5} /></mesh>)}
    </group>
    <mesh position={[0, RH.cy, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[RH.r + 0.08, RH.r + 0.08, 20.8, 48, 1, true]} /><meshStandardMaterial map={coil} metalness={0.7} roughness={0.34} /></mesh>
    <mesh position={[0, RH.cy + RH.r + 0.1, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 20.6, 6]} /><Metal kind="copper" rough={0.2} /></mesh>
    {/* 方钢杆 */}
    <mesh position={[0, RH.bar, 0]} castShadow><boxGeometry args={[RH.bx * 2, 0.7, 0.7]} /><Metal kind="steel" grain="brushed" rough={0.36} /></mesh>
    <Post at={[P.A[0], 1.0, P.A[2]]} /><Post at={[P.B[0], 1.0, P.B[2]]} />
    <Post at={[P.C[0], RH.bar + 0.35, 0]} /><Post at={[P.D[0], RH.bar + 0.35, 0]} />
    {/* 滑片：黑胶木的滑块套在杆上，下面一片铜簧压在线圈顶上 */}
    <group ref={ref} position={[sx, 0, 0]} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
      <RoundedBox args={[2.4, 1.8, 2.2]} radius={0.25} smoothness={3} position={[0, RH.bar + 0.2, 0]} castShadow><meshPhysicalMaterial color="#17191b" roughness={0.3} clearcoat={0.6} /></RoundedBox>
      <RoundedBox args={[1.2, 1.2, 1.0]} radius={0.22} smoothness={2} position={[0, RH.bar + 1.65, 0]} castShadow><meshPhysicalMaterial color="#17191b" roughness={0.3} clearcoat={0.6} /></RoundedBox>
      <mesh position={[0, (RH.bar + RH.cy + RH.r) / 2 - 0.2, 0.25]} rotation-x={0.25}><boxGeometry args={[0.5, RH.bar - RH.cy - RH.r - 0.6, 0.06]} /><Metal kind="brass" /></mesh>
      <mesh position={[0, RH.cy + RH.r + 0.14, 0.5]}><boxGeometry args={[0.6, 0.1, 0.5]} /><Metal kind="brass" /></mesh>
      <mesh position={[0, RH.bar + 0.6, 0]} visible={false}><boxGeometry args={[5, 5, 5]} /></mesh>
      {hand && <group position={[0, RH.bar + 2.3, 0.2]} rotation-x={0.75}><Glove scale={0.34} /></group>}
    </group>
  </group>
}

// ---------- 定值电阻 ----------
/** 底板 12 × 3.8 cm，厚 1.2 cm，两只接线柱在两头；中间两只瓷支座架着一只白瓷壳的水泥电阻，引线直接拧在接线柱上 */
export const RB = { w: 12, d: 3.8, h: 1.2, px: 5.0 }
export const resPosts = (): { l: V3; r: V3 } => ({ l: [-RB.px, RB.h + POST_Y, 0], r: [RB.px, RB.h + POST_Y, 0] })
const BODY_Y = 2.2
const LEAD = (s: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[s * 2.5, BODY_Y, 0], [s * 3.4, BODY_Y, 0], [s * 4.3, RB.h + POST_Y + 0.15, 0], [s * 4.85, RB.h + POST_Y, 0]].map(p => new THREE.Vector3(...(p as V3)))), 20, 0.065, 6)
const LEADS = [LEAD(-1), LEAD(1)]
/** 底板：浅米色的塑料，前沿印着这只电阻的名字，四角四颗螺钉 */
function Base({ tag }: { tag: string }) {
  const label = makeText([tag], { w: 256, h: 64, bg: '#e4ddc9', fg: '#2b2b2b', size: 42 })
  return <>
    <RoundedBox args={[RB.w, RB.h, RB.d]} radius={0.2} smoothness={3} position={[0, RB.h / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#e4ddc9" roughness={0.45} clearcoat={0.25} /></RoundedBox>
    <mesh position={[0, RB.h / 2 - 0.02, RB.d / 2 + 0.01]}><planeGeometry args={[3.6, 0.82]} /><meshStandardMaterial map={label} roughness={0.5} /></mesh>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 3.4, RB.h + 0.01, sz * 1.35]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.24, 16]} /><Metal kind="steel" /></mesh>))}
  </>
}
/** 定值电阻。tag：底板前沿的印字（R = 10 Ω、Rₓ…）；print：瓷壳上印的字 */
export function ResBoard({ tag, print }: { tag: string; print: string[] }) {
  const body = makeCement(print), P = resPosts()
  return <group>
    <Base tag={tag} />
    {[-1.6, 1.6].map(x => <mesh key={x} position={[x, RB.h + 0.16, 0]}><boxGeometry args={[0.8, 0.32, 1.1]} /><meshStandardMaterial color="#cfcabb" roughness={0.7} /></mesh>)}
    <RoundedBox args={[5.0, 1.3, 1.3]} radius={0.12} smoothness={2} position={[0, BODY_Y, 0]} castShadow><meshStandardMaterial color="#efede6" roughness={0.75} /></RoundedBox>
    <mesh position={[0, BODY_Y, 0.652]}><planeGeometry args={[4.8, 1.1]} /><meshStandardMaterial map={body} roughness={0.75} /></mesh>
    {LEADS.map((g, i) => <mesh key={i} geometry={g} castShadow><Metal kind="zinc" rough={0.3} /></mesh>)}
    <Post at={[P.l[0], RB.h, 0]} /><Post at={[P.r[0], RB.h, 0]} />
  </group>
}

// ---------- 灯座和小灯泡 ----------
const SOCKET = lathe([[0, 0], [1.25, 0], [1.3, 0.1], [1.3, 1.5], [1.15, 1.7], [0.82, 1.7], [0.82, 0.45], [0, 0.45]], { segs: 32 })
const SCREW_THREAD = lathe(Array.from({ length: 13 }, (_, i): RY => [i % 2 ? 0.5 : 0.46, 0.06 + i * 0.075]).concat([[0.42, 1.0], [0.3, 1.02]] as RY[]), { segs: 32, crease: 60 })
const GLASS = shell([[0.42, 1.0], [0.48, 1.25], [0.8, 1.8], [0.86, 2.3], [0.78, 2.75], [0.5, 3.08], [0, 3.16]] as RY[], 0.035, { segs: 40 })
const FILAMENT = (() => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 160; i++) { const t = i / 160, a = t * Math.PI * 2 * 9; pts.push(new THREE.Vector3(-0.32 + t * 0.64, 2.25 + Math.cos(a) * 0.06, Math.sin(a) * 0.06)) } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.016, 5) })()
const SUPPORT = [-1, 1].map(x => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x * 0.4, 1.0, 0), new THREE.Vector3(x * 0.32, 1.6, 0), new THREE.Vector3(x * 0.34, 2.25, 0)]), 16, 0.014, 4))
/** 灯丝的颜色：暗的时候发红，亮了变成黄白 */
const glowColor = (g: number) => new THREE.Color().setHSL(0.04 + 0.08 * Math.min(1, g), 1, 0.5 + 0.2 * Math.min(1, g))
/** 灯座和一只 2.5 V 的小灯泡。glow：亮度（0–1） */
export function LampBoard({ glow, tag }: { glow: number; tag: string }) {
  const P = resPosts(), g = Math.max(0, glow), c = glowColor(g)
  return <group>
    <Base tag={tag} />
    <mesh geometry={SOCKET} position={[0, RB.h, 0]} castShadow><meshPhysicalMaterial color="#1b1c1e" roughness={0.35} clearcoat={0.4} /></mesh>
    {/* 灯口到两只接线柱的铜片 */}
    {[-1, 1].map(s => <mesh key={s} position={[s * 2.95, RB.h + 0.02, 0]}><boxGeometry args={[4.0, 0.04, 0.42]} /><Metal kind="brass" /></mesh>)}
    <Post at={[P.l[0], RB.h, 0]} /><Post at={[P.r[0], RB.h, 0]} />
    {/* 灯泡画大到 1.4 倍，好看清灯丝 */}
    <group position={[0, RB.h + 0.45, 0]} scale={1.4}>
      <mesh geometry={SCREW_THREAD} castShadow><Metal kind="brass" rough={0.28} /></mesh>
      {SUPPORT.map((s, i) => <mesh key={i} geometry={s}><Metal kind="steel" /></mesh>)}
      <mesh geometry={FILAMENT}><meshStandardMaterial color="#5a4a3a" emissive={c} emissiveIntensity={g * 9} toneMapped={g < 0.01} /></mesh>
      {g > 0.02 && <mesh position={[0, 2.25, 0]}><sphereGeometry args={[0.7, 20, 14]} /><meshBasicMaterial color={c} transparent opacity={0.25 + g * 0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>}
      <mesh geometry={GLASS} renderOrder={5}><meshPhysicalMaterial color="#eef3f5" roughness={0.06} transparent opacity={0.14} envMapIntensity={0.8} depthWrite={false} side={THREE.DoubleSide} clearcoat={0.5} emissive="#ffdca0" emissiveIntensity={g * 0.3} /></mesh>
      {g > 0.02 && <pointLight position={[0, 2.3, 0]} intensity={g * g * 2.2} distance={14} decay={1.6} color={c} />}
    </group>
  </group>
}

// ---------- 单刀开关 ----------
export const switchPosts = (): { a: V3; b: V3 } => ({ a: [-3.1, 0.9 + POST_Y, 0], b: [3.1, 0.9 + POST_Y, 0] })
const HANDLE = lathe([[0, 0], [0.34, 0], [0.42, 0.2], [0.42, 1.3], [0.3, 1.6], [0, 1.65]], { segs: 24 })
/** 单刀开关（闸刀）：白瓷底座，两只铜夹座，铜刀片一头铰在左夹座上，另一头装黑胶木柄。on 0 断开（翘起 60°）到 1 合上 */
export function KnifeSwitch({ on = 0 }: { on?: number }) {
  const P = switchPosts(), ang = (1 - on) * 1.05
  const porcelain = <meshPhysicalMaterial color="#f2f0ea" roughness={0.18} clearcoat={0.8} clearcoatRoughness={0.1} />
  return <group>
    <RoundedBox args={[8.2, 0.9, 3.4]} radius={0.25} smoothness={3} position={[0, 0.45, 0]} castShadow receiveShadow>{porcelain}</RoundedBox>
    {[-1.4, 2.2].map(x => [-1, 1].map(s => <RoundedBox key={`${x}${s}`} args={[0.9, 1.3, 0.1]} radius={0.04} smoothness={2} position={[x, 0.9 + 0.65, s * 0.16]} castShadow><Metal kind="copper" grain="brushed" rough={0.32} /></RoundedBox>))}
    {[[-2.25, 1.1], [2.65, 0.9]].map(([x, w]) => <mesh key={x} position={[x, 0.92, 0]}><boxGeometry args={[w, 0.05, 0.36]} /><Metal kind="copper" /></mesh>)}
    <Post at={[P.a[0], 0.9, 0]} /><Post at={[P.b[0], 0.9, 0]} />
    <group position={[-1.4, 1.95, 0]} rotation-z={ang}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.16, 0.16, 0.5, 14]} /><Metal kind="brass" /></mesh>
      <RoundedBox args={[4.9, 0.6, 0.12]} radius={0.04} smoothness={2} position={[2.35, -0.05, 0]} castShadow><Metal kind="copper" grain="brushed" rough={0.26} /></RoundedBox>
      <mesh geometry={HANDLE} position={[4.75, 0, 0]} rotation-z={-Math.PI / 2} castShadow><meshPhysicalMaterial color="#121314" roughness={0.3} clearcoat={0.7} /></mesh>
      {on > 0.01 && on < 0.99 && <group position={[5.6, 0.2, 0]} rotation-z={-ang}><Glove scale={0.3} /></group>}
    </group>
  </group>
}

// ---------- 手套 ----------
// 防静电的白色针织手套，指尖和掌心浸了一层灰色的涂层，带一截蓝色防静电服的袖子。
// 按厘米写（再乘 scale）：捏东西的那一点在原点，手腕朝 +y，手背朝 −z。
const CUFF = lathe([[4.1, 0], [4.4, 0.4], [4.4, 5.6], [4.1, 6], [3.6, 6], [3.6, 0]], { segs: 28, closed: true })
const FINGER = (() => { const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -1.5, 1.0], [0, -2.8, 0.7], [0, -3.3, -0.6], [0, -2.9, -1.8]].map(p => new THREE.Vector3(...(p as V3)))); return new THREE.TubeGeometry(c, 22, 0.9, 10) })()
const ARM = 24
export function Glove({ scale = 0.5 }: { scale?: number }) {
  const knit = <meshStandardMaterial color="#e9e8e2" roughness={0.95} />
  const coat = <meshStandardMaterial color="#6b7076" roughness={0.75} />
  return <group scale={scale}><group position={[0, 2.9, 1.6]}>
    <RoundedBox args={[8.2, 7.6, 6]} radius={2.4} smoothness={3} position={[0, 4.5, -1.2]} castShadow>{knit}</RoundedBox>
    {/* 掌心一侧的涂层 */}
    <RoundedBox args={[7.6, 5.4, 0.6]} radius={0.3} smoothness={2} position={[0, 3.8, 1.75]}>{coat}</RoundedBox>
    {[-2.85, -0.95, 0.95, 2.85].map((x, i) => <group key={x} position={[x, 1.6, 1.0]} scale={[1, 0.95 - Math.abs(i - 1.5) * 0.06, 1]}>
      <mesh geometry={FINGER} castShadow>{knit}</mesh>
      <mesh position={[0, -2.95, -0.75]} scale={[1.05, 1.05, 1.05]}><sphereGeometry args={[0.95, 14, 10]} />{coat}</mesh>
    </group>)}
    <mesh position={[4.1, 1.6, 1.6]} rotation={[0.55, 0, 0.85]} castShadow><capsuleGeometry args={[1.0, 3.2, 6, 12]} />{knit}</mesh>
    <mesh geometry={CUFF} position={[0, 7.8, -1.2]} castShadow><meshStandardMaterial color="#d8d6cf" roughness={0.95} /></mesh>
    {/* 防静电服的袖子：深蓝色，袖口一圈罗纹 */}
    <mesh position={[0, 12.6, -1.2]}><cylinderGeometry args={[4.6, 4.6, 1.6, 28]} /><meshStandardMaterial color="#1f3f66" roughness={0.9} /></mesh>
    <mesh position={[0, 13.4 + ARM / 2, -1.2]} castShadow><cylinderGeometry args={[5.8, 4.8, ARM, 24]} /><meshStandardMaterial color="#2b5384" roughness={0.88} /></mesh>
    {[0.3, 0.62].map(k => <mesh key={k} position={[0, 13.4 + ARM * k, -1.2]} rotation-x={Math.PI / 2}><torusGeometry args={[4.85 + 0.9 * k, 0.16, 6, 28]} /><meshStandardMaterial color="#244a78" roughness={0.9} /></mesh>)}
  </group></group>
}
