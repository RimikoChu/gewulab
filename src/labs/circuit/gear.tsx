// 桌上的器材：接线柱、电池盒、灯座和小灯泡、单刀开关、滑动变阻器、电阻示教板、鳄鱼夹。
// 全部按厘米写（外面套 Bench，乘 CM），原点在器材的底面正中，正面朝 +z。每样器材都导出它几个接线柱的位置，导线从那里接。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { makeCellWrap, makeMarks, makeText } from './mats'
import { Glove } from './parts'
import type { V3 } from './world'

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

// ---------- 接线柱 ----------
/** 接线柱：黄铜的六角螺母和螺杆，上面一只滚花的塑料帽。导线夹在螺母和帽之间，离底 POST_Y */
export const POST_Y = 0.45
const NUT = (() => { const g = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 6); g.translate(0, 0.13, 0); return g })()
const STEM = (() => { const g = new THREE.CylinderGeometry(0.17, 0.17, 0.7, 12); g.translate(0, 0.55, 0); return g })()
const WASHER = disc(0.4, 0.06, { hole: 0.17, segs: 24 })
const CAP = lathe([[0, 0.62], [0.42, 0.62], [0.5, 0.7], [0.5, 1.2], [0.44, 1.3], [0, 1.32]], { segs: 18, crease: 40 })
/** 帽上的滚花：一圈竖着的细棱 */
const KNURL = (() => { const gs: THREE.BufferGeometry[] = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, g = new THREE.BoxGeometry(0.06, 0.46, 0.06); g.translate(Math.cos(a) * 0.5, 0.95, Math.sin(a) * 0.5); gs.push(g) } return mergeAll(gs) })()
function mergeAll(gs: THREE.BufferGeometry[]) { const out = new THREE.BufferGeometry(); const pos: number[] = [], nor: number[] = [], idx: number[] = []; let o = 0; for (const g of gs) { const n = g.toNonIndexed(); const p = n.attributes.position, q = n.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(q.getX(i), q.getY(i), q.getZ(i)); idx.push(o + i) } o += p.count } out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setIndex(idx); return out }
export const RED = '#c8322a', BLACK = '#1d1e20'
export function Post({ at, color = BLACK }: { at: V3; color?: string }) {
  const cap = <meshPhysicalMaterial color={color} roughness={0.32} clearcoat={0.5} clearcoatRoughness={0.3} />
  return <group position={at}>
    <mesh geometry={NUT} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh geometry={STEM}><Metal kind="brass" rough={0.3} /></mesh>
    <mesh geometry={WASHER} position={[0, 0.52, 0]}><Metal kind="brass" /></mesh>
    <mesh geometry={CAP} castShadow>{cap}</mesh>
    <mesh geometry={KNURL}>{cap}</mesh>
  </group>
}

// ---------- 电池盒 ----------
/** 1 号干电池：长 6.1 cm、直径 3.4 cm */
const CELL_L = 6.1, CELL_R = 1.7, SLOT = 6.5
const CELL_END = lathe([[0, 0], [1.55, 0], [1.7, 0.12], [1.7, 0.2]], { segs: 40, closed: false })
const CELL_TOP = lathe([[1.7, 5.9], [1.7, 5.98], [1.56, 6.1], [0.5, 6.1], [0.48, 6.24], [0.42, 6.3], [0, 6.3]], { segs: 40 })
const SPRING = (() => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 120; i++) { const t = i / 120, a = t * Math.PI * 2 * 4.5, r = 0.95 - t * 0.45; pts.push(new THREE.Vector3(t * 0.9, Math.cos(a) * r, Math.sin(a) * r)) } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.06, 6) })()
/** 电池盒的长度（cm）：n 节 */
export const boxLen = (n: number) => n * SLOT + 2.6
/** 电池盒的两个接线柱：+ 在东头（+x），− 在西头 */
export const boxPosts = (n: number) => ({ plus: [boxLen(n) / 2 - 0.75, 3.9 + POST_Y, 0] as V3, minus: [-boxLen(n) / 2 + 0.75, 3.9 + POST_Y, 0] as V3 })
/** 电池盒：深绿色塑料的托槽，n 节 1 号电池顺着放，+ 极朝东；两头各一块端板，板上一只接线柱（+ 红、− 黑）、里面一只弹簧或铜片。hot：短路时电池发热（0–1） */
export function BatteryBox({ n = 2, hot = 0, cells = n }: { n?: number; hot?: number; cells?: number }) {
  const L = boxLen(n), wrap = useMemo(() => makeCellWrap(), []), mark = useMemo(() => makeMarks(['−', '', '+'], { w: 384, h: 64, bg: '#2a3b32', fg: '#e8e4d8', size: 48, colors: ['#e8e4d8', '#e8e4d8', '#ff8a7a'] }), [])
  const plastic = <meshPhysicalMaterial color="#2b4537" roughness={0.45} clearcoat={0.35} clearcoatRoughness={0.4} />
  const P = boxPosts(n)
  return <group>
    {/* 托槽：底板、两道矮侧壁、两头的端板 */}
    <RoundedBox args={[L, 0.5, 4.4]} radius={0.18} smoothness={3} position={[0, 0.25, 0]} castShadow receiveShadow>{plastic}</RoundedBox>
    {[-1, 1].map(s => <RoundedBox key={s} args={[L - 1.8, 1.9, 0.32]} radius={0.12} smoothness={2} position={[0, 1.25, s * 2.04]} castShadow>{plastic}</RoundedBox>)}
    {[-1, 1].map(s => <RoundedBox key={s} args={[1.4, 3.9, 4.4]} radius={0.2} smoothness={3} position={[s * (L / 2 - 0.7), 1.95, 0]} castShadow>{plastic}</RoundedBox>)}
    {/* 端板上的标记 */}
    <mesh position={[0, 3.905, 0]} rotation-x={-Math.PI / 2} visible={false}><planeGeometry args={[L, 0.6]} /><meshBasicMaterial map={mark} /></mesh>
    <mesh position={[-L / 2 + 0.7, 2.9, 2.21]}><planeGeometry args={[0.9, 0.9]} /><meshStandardMaterial map={makeMarks(['−'], { w: 64, h: 64, bg: '#2b4537', size: 54 })} /></mesh>
    <mesh position={[L / 2 - 0.7, 2.9, 2.21]}><planeGeometry args={[0.9, 0.9]} /><meshStandardMaterial map={makeMarks(['+'], { w: 64, h: 64, bg: '#2b4537', fg: '#ff8a7a', size: 54 })} /></mesh>
    <Post at={[P.plus[0], 3.9, 0]} color={RED} /><Post at={[P.minus[0], 3.9, 0]} />
    {/* 负极的弹簧和正极的铜片 */}
    <mesh geometry={SPRING} position={[-L / 2 + 1.4, 0.5 + CELL_R, 0]}><Metal kind="steel" rough={0.35} /></mesh>
    <mesh position={[L / 2 - 1.45, 0.5 + CELL_R, 0]}><boxGeometry args={[0.1, 1.6, 1.2]} /><Metal kind="brass" /></mesh>
    {/* 电池：每节一个，正极朝东。短路时外皮发红 */}
    {Array.from({ length: cells }, (_, i) => {
      const x0 = -L / 2 + 1.3 + 0.9 + i * SLOT + 0.1
      return <group key={i} position={[x0, 0.5 + CELL_R, 0]} rotation-z={-Math.PI / 2}>
        <mesh geometry={CELL_END}><Metal kind="zinc" rough={0.4} /></mesh>
        <mesh position={[0, CELL_L / 2 + 0.05, 0]} castShadow><cylinderGeometry args={[CELL_R, CELL_R, CELL_L - 0.3, 40, 1, true]} /><meshPhysicalMaterial map={wrap} roughness={0.35} clearcoat={0.6} emissive="#ff3a10" emissiveIntensity={hot * 0.7} /></mesh>
        <mesh geometry={CELL_TOP}><Metal kind="steel" rough={0.25} /></mesh>
      </group>
    })}
  </group>
}

// ---------- 灯座和小灯泡 ----------
const BASE_W = 7, BASE_D = 4.4, BASE_H = 1.0
/** 灯座的两个接线柱 */
export const lampPosts = (): { a: V3; b: V3 } => ({ a: [-2.7, BASE_H + POST_Y, 0.6], b: [2.7, BASE_H + POST_Y, 0.6] })
const SOCKET = lathe([[0, 0], [0.95, 0], [0.98, 0.1], [0.98, 1.2], [0.86, 1.35], [0.62, 1.35], [0.62, 0.45], [0, 0.45]], { segs: 32 })
const SOCK_RING = lathe([[0.6, 1.0], [0.66, 1.0], [0.66, 1.4], [0.6, 1.4]], { segs: 32, closed: true })
/** 小灯泡：E10 螺口（黄铜，有螺纹），玻璃泡（有壁厚），里面两根支架夹着一段螺旋灯丝。原点在螺口底 */
const SCREW = lathe(Array.from({ length: 13 }, (_, i): RY => [i % 2 ? 0.5 : 0.46, 0.06 + i * 0.075]).concat([[0.42, 1.0], [0.3, 1.02]] as RY[]), { segs: 32, crease: 60 })
const TIP = lathe([[0, -0.02], [0.18, -0.02], [0.2, 0.06], [0.46, 0.06]], { segs: 24 })
const GLASS = shell([[0.42, 1.0], [0.48, 1.25], [0.8, 1.8], [0.86, 2.3], [0.78, 2.75], [0.5, 3.08], [0, 3.16]] as RY[], 0.035, { segs: 40 })
const FILAMENT = (() => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 160; i++) { const t = i / 160, a = t * Math.PI * 2 * 9; pts.push(new THREE.Vector3(-0.32 + t * 0.64, 2.25 + Math.cos(a) * 0.06, Math.sin(a) * 0.06)) } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.016, 5) })()
const SUPPORT = (() => { const c = (x: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x * 0.4, 1.0, 0), new THREE.Vector3(x * 0.32, 1.6, 0), new THREE.Vector3(x * 0.34, 2.25, 0)]), 16, 0.014, 4); return [c(-1), c(1)] })()
export function Bulb({ lit = 0 }: { lit?: number }) {
  return <group>
    <mesh geometry={SCREW} castShadow><Metal kind="brass" rough={0.28} /></mesh>
    <mesh geometry={TIP}><Metal kind="brass" rough={0.2} /></mesh>
    {SUPPORT.map((g, i) => <mesh key={i} geometry={g}><Metal kind="steel" /></mesh>)}
    <mesh geometry={FILAMENT}><meshStandardMaterial color="#5a4a3a" emissive="#ffc46a" emissiveIntensity={lit * 9} toneMapped={lit < 0.01} /></mesh>
    {/* 亮着时玻璃泡里的一团光 */}
    {lit > 0.01 && <mesh position={[0, 2.25, 0]}><sphereGeometry args={[0.55, 20, 14]} /><meshBasicMaterial color="#ffd690" transparent opacity={0.22 + lit * 0.4} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>}
    <mesh geometry={GLASS} renderOrder={5}><meshPhysicalMaterial color="#eef3f5" roughness={0.06} metalness={0} transparent opacity={0.14} envMapIntensity={0.8} depthWrite={false} side={THREE.DoubleSide} clearcoat={0.5} emissive="#ffdca0" emissiveIntensity={lit * 0.35} /></mesh>
    {lit > 0.01 && <pointLight position={[0, 2.3, 0]} intensity={lit * lit * 1.2} distance={9} decay={1.6} color="#ffd9a0" />}
  </group>
}
/**
 * 灯座和小灯泡：象牙色的塑料底板、黑色的 E10 灯口，两只接线柱。lit 亮度（0–1）；out 拧下来了多少（0 在灯口里，1 已经拧下放在底板旁边）；name 印在底板前沿
 */
export function Lamp({ lit = 0, out = 0, name }: { lit?: number; out?: number; name?: string }) {
  const label = useMemo(() => name ? makeText([name], { w: 128, h: 64, bg: '#e8e2d2', fg: '#3a3a3a', size: 40 }) : null, [name])
  const P = lampPosts()
  // 拧下来：先边转边升 1.3 cm（转出螺纹），再挪到底板右前方、躺倒在台面上
  const k1 = Math.min(1, out * 2), k2 = Math.max(0, out * 2 - 1)
  const y1 = BASE_H + 0.45 + k1 * 1.3, p2: V3 = [3.7, 0.86, 2.6]
  const pos: V3 = [p2[0] * k2, y1 + (p2[1] - y1) * k2 + Math.sin(k2 * Math.PI) * 1.4, -0.2 + (p2[2] + 0.2) * k2]
  const spin = k1 * Math.PI * 4
  return <group>
    <RoundedBox args={[BASE_W, BASE_H, BASE_D]} radius={0.22} smoothness={3} position={[0, BASE_H / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#e8e2d2" roughness={0.42} clearcoat={0.3} /></RoundedBox>
    {label && <mesh position={[0, BASE_H / 2, BASE_D / 2 + 0.01]}><planeGeometry args={[1.6, 0.8]} /><meshStandardMaterial map={label} roughness={0.5} /></mesh>}
    <mesh geometry={SOCKET} position={[0, BASE_H, -0.2]} castShadow><meshPhysicalMaterial color="#1b1c1e" roughness={0.35} clearcoat={0.4} /></mesh>
    <mesh geometry={SOCK_RING} position={[0, BASE_H, -0.2]}><Metal kind="brass" /></mesh>
    {/* 灯座底板上从灯口到两个接线柱的铜片 */}
    {[-1, 1].map(s => <mesh key={s} position={[s * 1.75, BASE_H + 0.02, 0.2]}><boxGeometry args={[2.1, 0.04, 0.4]} /><Metal kind="brass" /></mesh>)}
    <Post at={[P.a[0], BASE_H, P.a[2]]} /><Post at={[P.b[0], BASE_H, P.b[2]]} />
    {/* 拧灯泡的手：捏着玻璃泡，跟着灯泡走，不跟着转 */}
    {out > 0.02 && out < 0.98 && <group position={pos} rotation-z={-k2 * Math.PI / 2}><group position={[0, 2.25, 0]}><Glove scale={0.33} /></group></group>}
    <group position={pos} rotation={[0, spin, -k2 * Math.PI / 2]}>
      <Bulb lit={out > 0.02 ? 0 : lit} />
    </group>
  </group>
}

// ---------- 单刀开关 ----------
/** 开关的两个接线柱 */
export const switchPosts = (): { a: V3; b: V3 } => ({ a: [-3.1, 0.9 + POST_Y, 0], b: [3.1, 0.9 + POST_Y, 0] })
const HANDLE = lathe([[0, 0], [0.34, 0], [0.42, 0.2], [0.42, 1.3], [0.3, 1.6], [0, 1.65]], { segs: 24 })
/** 单刀开关（闸刀）：白瓷底座，两只铜夹座；铜刀片一头绞在左边夹座上，另一头装黑胶木柄。on 0 断开（刀片翘起 60°）到 1 合上 */
export function KnifeSwitch({ on = 0 }: { on?: number }) {
  const P = switchPosts(), ang = (1 - on) * 1.05
  const porcelain = <meshPhysicalMaterial color="#f2f0ea" roughness={0.18} clearcoat={0.8} clearcoatRoughness={0.1} />
  return <group>
    <RoundedBox args={[8.2, 0.9, 3.4]} radius={0.25} smoothness={3} position={[0, 0.45, 0]} castShadow receiveShadow>{porcelain}</RoundedBox>
    {/* 两只夹座：两片竖着的铜片 */}
    {[-1.4, 2.2].map(x => [-1, 1].map(s => <RoundedBox key={`${x}${s}`} args={[0.9, 1.3, 0.1]} radius={0.04} smoothness={2} position={[x, 0.9 + 0.65, s * 0.16]} castShadow><Metal kind="copper" grain="brushed" rough={0.32} /></RoundedBox>))}
    {[-1.4, 2.2].map(x => <mesh key={x} position={[x, 0.94, 0]}><boxGeometry args={[1.2, 0.08, 0.7]} /><Metal kind="copper" /></mesh>)}
    {/* 底座上连到接线柱的铜条 */}
    {[[-2.25, 1.1], [2.65, 0.9]].map(([x, w]) => <mesh key={x} position={[x, 0.92, 0]}><boxGeometry args={[w, 0.05, 0.36]} /><Metal kind="copper" /></mesh>)}
    <Post at={[P.a[0], 0.9, 0]} /><Post at={[P.b[0], 0.9, 0]} />
    {/* 刀片：绕左夹座上的铆钉转 */}
    <group position={[-1.4, 1.95, 0]} rotation-z={ang}>
      <mesh position={[0, 0, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.16, 0.16, 0.5, 14]} /><Metal kind="brass" /></mesh>
      <RoundedBox args={[4.9, 0.6, 0.12]} radius={0.04} smoothness={2} position={[2.35, -0.05, 0]} castShadow><Metal kind="copper" grain="brushed" rough={0.26} /></RoundedBox>
      <mesh geometry={HANDLE} position={[4.75, 0, 0]} rotation-z={-Math.PI / 2 + 0.0} castShadow><meshPhysicalMaterial color="#121314" roughness={0.3} clearcoat={0.7} /></mesh>
      {/* 扳开关的手：只在刀片转动的时候出现，握着胶木柄 */}
      {on > 0.01 && on < 0.99 && <group position={[5.6, 0, 0]} rotation-z={-ang}><Glove scale={0.33} /></group>}
    </group>
  </group>
}

// ---------- 滑动变阻器 ----------
const RH = { len: 22, r: 1.55, cy: 3.2, bar: 7.2, bx: 12.4 }
/** 滑片能走的范围（x，cm）：p = 0 在西头（下接线柱 A 那一端），p = 1 在东头 */
export const sliderX = (p: number) => -10.2 + 20.4 * p
/** 变阻器的接线柱：A、B 在瓷管两头的下面，C、D 在金属杆两头 */
export const rheoPosts = () => ({ A: [-RH.bx - 0.9, 1.0 + POST_Y, 1.5] as V3, B: [RH.bx + 0.9, 1.0 + POST_Y, 1.5] as V3, C: [-RH.bx + 1.2, RH.bar + 0.35 + POST_Y, 0] as V3, D: [RH.bx - 1.2, RH.bar + 0.35 + POST_Y, 0] as V3 })
const COIL = (() => { const pts: THREE.Vector3[] = [], turns = 150, L = 20.6; for (let i = 0; i <= turns * 14; i++) { const t = i / (turns * 14), a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(-L / 2 + t * L, Math.cos(a) * (RH.r + 0.05), Math.sin(a) * (RH.r + 0.05))) } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 14, 0.055, 5) })()
const TUBE = shell([[RH.r, -RH.len / 2], [RH.r, RH.len / 2]], 0.25, { segs: 40 })
/** 滑动变阻器：白瓷管上密绕着漆包的电阻丝，两头两块钢支架，上面一根方钢杆，杆上套着能滑的滑片（下面一片铜簧压在线圈上）。p 滑片位置；onDrag 拖滑片时报告新的 p */
export function Rheostat({ p, onDrag }: { p: number; onDrag?: (p: number) => void }) {
  const plate = useMemo(() => makeText(['20 Ω  2 A'], { w: 256, h: 96, bg: '#d9d4c4', fg: '#222', size: 44 }), [])
  const P = rheoPosts(), sx = sliderX(p)
  const drag = useRef<{ x0: number; p0: number } | null>(null)
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { if (ref.current) ref.current.position.x = sx })
  /** 场景里的点换成变阻器自己的 x（cm）：拖动时按它算滑片走了多远 */
  const local = (pt: THREE.Vector3) => ref.current?.parent ? ref.current.parent.worldToLocal(pt.clone()).x : 0
  const steel = <Metal kind="steel" grain="brushed" rough={0.38} />
  return <group>
    {/* 两块支架：钢板弯成，下面带脚 */}
    {[-1, 1].map(s => <group key={s} position={[s * RH.bx, 0, 0]}>
      <RoundedBox args={[0.3, RH.bar + 0.4, 4.2]} radius={0.08} smoothness={2} position={[0, (RH.bar + 0.4) / 2, 0]} castShadow><meshPhysicalMaterial color="#2e3a44" roughness={0.4} clearcoat={0.5} /></RoundedBox>
      <RoundedBox args={[2.6, 0.3, 4.6]} radius={0.08} smoothness={2} position={[s * 0.9, 0.15, 0]} castShadow><meshPhysicalMaterial color="#2e3a44" roughness={0.4} clearcoat={0.5} /></RoundedBox>
      <RoundedBox args={[1.8, 0.24, 1.4]} radius={0.06} smoothness={2} position={[s * 0.9, 0.88, 1.5]} castShadow><meshStandardMaterial color="#e8e2d2" roughness={0.5} /></RoundedBox>
    </group>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * (RH.bx + 0.9), 0.3, 1.5]}><cylinderGeometry args={[0.12, 0.12, 0.7, 10]} /><Metal kind="brass" /></mesh>)}
    <mesh position={[-RH.bx - 0.16, 4.2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[2.6, 1]} /><meshStandardMaterial map={plate} roughness={0.5} /></mesh>
    {/* 瓷管和线圈 */}
    <group position={[0, RH.cy, 0]} rotation-z={Math.PI / 2}><mesh geometry={TUBE} castShadow><meshPhysicalMaterial color="#efece4" roughness={0.25} clearcoat={0.6} /></mesh></group>
    <mesh geometry={COIL} position={[0, RH.cy, 0]} castShadow><meshStandardMaterial color="#8a4a26" metalness={0.75} roughness={0.32} /></mesh>
    {/* 方钢杆 */}
    <mesh position={[0, RH.bar, 0]} castShadow><boxGeometry args={[RH.bx * 2, 0.7, 0.7]} />{steel}</mesh>
    <Post at={[P.A[0], 1.0, P.A[2]]} /><Post at={[P.B[0], 1.0, P.B[2]]} />
    <Post at={[P.C[0], RH.bar + 0.35, 0]} /><Post at={[P.D[0], RH.bar + 0.35, 0]} />
    {/* 滑片：黑色胶木的滑块，套在杆上；下面一片铜簧压到线圈顶上 */}
    <group ref={ref} position={[sx, 0, 0]}
      onPointerDown={e => { if (!onDrag) return; e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); drag.current = { x0: local(e.point), p0: p } }}
      onPointerMove={e => { if (!drag.current || !onDrag) return; const dx = local(e.point) - drag.current.x0; onDrag(Math.min(1, Math.max(0, drag.current.p0 + dx / 20.4))) }}
      onPointerUp={e => { drag.current = null; (e.target as Element).releasePointerCapture?.(e.pointerId) }}>
      <RoundedBox args={[2.4, 1.8, 2.2]} radius={0.25} smoothness={3} position={[0, RH.bar + 0.2, 0]} castShadow><meshPhysicalMaterial color="#17191b" roughness={0.3} clearcoat={0.6} /></RoundedBox>
      <RoundedBox args={[1.2, 1.1, 1.0]} radius={0.2} smoothness={2} position={[0, RH.bar + 1.6, 0]} castShadow><meshPhysicalMaterial color="#17191b" roughness={0.3} clearcoat={0.6} /></RoundedBox>
      <mesh position={[0, (RH.bar + RH.cy + RH.r) / 2 - 0.2, 0.25]} rotation-x={0.25}><boxGeometry args={[0.5, RH.bar - RH.cy - RH.r - 0.6, 0.06]} /><Metal kind="brass" /></mesh>
      <mesh position={[0, RH.cy + RH.r + 0.12, 0.55]}><boxGeometry args={[0.6, 0.1, 0.5]} /><Metal kind="brass" /></mesh>
      {/* 拖动用的透明把手：比滑块大一圈，好点中 */}
      <mesh position={[0, RH.bar + 0.6, 0]} visible={false}><boxGeometry args={[4, 4, 4]} /></mesh>
    </group>
  </group>
}

// ---------- 电阻示教板 ----------
/** 四根金属丝在板上的 z 位置、两头接线柱的 x（b 只有半长） */
export const BOARD = { w: 62, d: 22, h: 1.8, rows: { a: -7.5, b: -2.5, c: 2.5, d: 7.5 }, x0: -25, x1: 25 }
export type Row = keyof typeof BOARD.rows
export const boardPosts = (k: Row): { a: V3; b: V3 } => ({ a: [BOARD.x0, BOARD.h + POST_Y, BOARD.rows[k]], b: [k === 'b' ? 0 : BOARD.x1, BOARD.h + POST_Y, BOARD.rows[k]] })
/** 电阻示教板：一块漆过的木板，四根金属丝绷在两排接线柱之间；左边印着 a b c d。粗的那根画粗了一倍，好看出来 */
export function Board({ active }: { active: Row | null }) {
  const letters = useMemo(() => (['a', 'b', 'c', 'd'] as Row[]).map(k => makeText([k], { w: 64, h: 64, bg: '#7c5a36', fg: '#f3ead6', size: 46 })), [])
  const wire = (k: Row) => k === 'd' ? <meshStandardMaterial color="#c98a5a" metalness={0.9} roughness={0.32} emissive="#ff9a40" emissiveIntensity={active === k ? 0.08 : 0} /> : <Metal kind="stainless" rough={0.25} />
  return <group>
    <RoundedBox args={[BOARD.w, BOARD.h, BOARD.d]} radius={0.3} smoothness={3} position={[0, BOARD.h / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#86603a" roughness={0.45} clearcoat={0.5} clearcoatRoughness={0.25} /></RoundedBox>
    {/* 一根米尺刻在板的前沿 */}
    {Array.from({ length: 11 }, (_, i) => <mesh key={i} position={[BOARD.x0 + i * 5, BOARD.h + 0.005, BOARD.d / 2 - (i % 2 ? 0.6 : 0.9)]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.12, i % 2 ? 0.8 : 1.4]} /><meshBasicMaterial color="#f3ead6" /></mesh>)}
    {(['a', 'b', 'c', 'd'] as Row[]).map((k, i) => {
      const P = boardPosts(k), r = k === 'c' ? 0.13 : 0.085, len = P.b[0] - P.a[0]
      return <group key={k}>
        <mesh position={[BOARD.x0 - 3.4, BOARD.h + 0.01, BOARD.rows[k]]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.6, 1.6]} /><meshStandardMaterial map={letters[i]} roughness={0.6} /></mesh>
        <Post at={[P.a[0], BOARD.h, P.a[2]]} /><Post at={[P.b[0], BOARD.h, P.b[2]]} />
        <mesh position={[(P.a[0] + P.b[0]) / 2, BOARD.h + POST_Y, BOARD.rows[k]]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[r, r, len, 10]} />{wire(k)}</mesh>
      </group>
    })}
  </group>
}

// ---------- 鳄鱼夹 ----------
/** 导线头上的鳄鱼夹：两片钢的夹嘴，套着红或黑的软胶套；夹嘴朝 −x。原点在夹嘴尖 */
export function Clip({ color }: { color: string }) {
  return <group>
    {[-1, 1].map(s => <mesh key={s} position={[0.9, s * 0.16, 0]} rotation-z={s * 0.12}><boxGeometry args={[1.8, 0.12, 0.5]} /><Metal kind="steel" grain="brushed" /></mesh>)}
    <mesh position={[2.6, 0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.42, 0.34, 1.9, 14]} /><meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.3} /></mesh>
  </group>
}
