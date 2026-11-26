// 实验台上的通用器材：接线柱、导线（带电流的流动亮点）、指针式电表（直流电流表、灵敏电流计）、电池盒、单刀开关、
// 学生电源、滑动变阻器、木底板、劳保手套。全部按厘米写（外面套 Bench，乘 CM），原点在器材底面正中，正面朝 +z。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Led, Metal, disc, lathe } from '@/lab-kit'
import { DIAL, makeCoil, makeDial, makeText, makeWood } from './mats'

export type V3 = [number, number, number]
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const RED = '#c4302a', BLACK = '#1c1d1f'

// ---------- 接线柱 ----------
/** 接线柱：黄铜六角螺母和螺杆，上面一只滚花的塑料帽；导线夹在离底 0.45 cm 处 */
export const POST_Y = 0.45
const NUT = (() => { const g = new THREE.CylinderGeometry(0.4, 0.4, 0.24, 6); g.translate(0, 0.12, 0); return g })()
const STEM = (() => { const g = new THREE.CylinderGeometry(0.15, 0.15, 0.7, 12); g.translate(0, 0.55, 0); return g })()
const CAP = lathe([[0, 0.6], [0.4, 0.6], [0.47, 0.68], [0.47, 1.12], [0.4, 1.22], [0, 1.24]], { segs: 20, crease: 40 })
const KNURL = mergeGeometries(Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2, g = new THREE.BoxGeometry(0.05, 0.42, 0.05); g.rotateY(-a); g.translate(Math.cos(a) * 0.47, 0.9, Math.sin(a) * 0.47); return g }))
export function Post({ at, color = BLACK }: { at: V3; color?: string }) {
  const cap = <meshPhysicalMaterial color={color} roughness={0.32} clearcoat={0.5} clearcoatRoughness={0.3} />
  return <group position={at}>
    <mesh geometry={NUT} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh geometry={STEM}><Metal kind="brass" rough={0.3} /></mesh>
    <mesh geometry={CAP} castShadow>{cap}</mesh>
    <mesh geometry={KNURL}>{cap}</mesh>
  </group>
}

// ---------- 导线 ----------
/** 一根导线：pts 是途经的点（第一点、最后一点在接线柱上），中间自然下垂；flow 是电流（正负是方向，0 不流），画成沿线跑的一串黄色亮点 */
export function Wire({ pts, color = RED, flow = 0, r = 0.16, dots = 14, bare = false }: { pts: V3[]; color?: string; flow?: number; r?: number; dots?: number; bare?: boolean }) {
  const { curve, geo, len } = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal')
    return { curve: c, geo: new THREE.TubeGeometry(c, Math.max(24, pts.length * 16), r, 8), len: c.getLength() }
  }, [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  const inst = useRef<THREE.InstancedMesh>(null), phase = useRef(0), m = useMemo(() => new THREE.Matrix4(), [])
  useFrame((_, d) => {
    const im = inst.current; if (!im) return
    phase.current += Math.min(d, 1 / 30) * flow * 6 / len
    for (let i = 0; i < dots; i++) {
      const u = (((i / dots + phase.current) % 1) + 1) % 1
      const p = curve.getPointAt(u), s = Math.abs(flow) > 0.01 ? 1 : 0
      m.makeScale(s, s, s).setPosition(p); im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return <group>
    {!bare && <mesh geometry={geo} castShadow><meshPhysicalMaterial color={color} roughness={0.42} clearcoat={0.3} /></mesh>}
    {/* 两头剥出来的一小截铜线 */}
    {!bare && [pts[0], pts[pts.length - 1]].map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[r * 1.15, 10, 8]} /><Metal kind="copper" rough={0.3} /></mesh>)}
    <instancedMesh ref={inst} args={[undefined, undefined, dots]} renderOrder={6} frustumCulled={false}>
      <sphereGeometry args={[r * 1.35, 8, 6]} /><meshBasicMaterial color="#ffd34d" toneMapped={false} transparent opacity={0.95} depthTest={false} />
    </instancedMesh>
  </group>
}

// ---------- 底板 ----------
/** 一块木底板：w × d，厚 h，四边倒圆 */
export function Board({ w, d, h = 1.2, color = '#c79a63' }: { w: number; d: number; h?: number; color?: string }) {
  const wood = useMemo(() => { const t = makeWood(color).clone(); t.repeat.set(w / 30, d / 12); t.needsUpdate = true; return t }, [w, d, color])
  return <RoundedBox args={[w, h, d]} radius={Math.min(0.3, h * 0.3)} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial map={wood} roughness={0.55} clearcoat={0.35} clearcoatRoughness={0.4} /></RoundedBox>
}

// ---------- 指针式电表 ----------
const TILT = -0.32, DW = 9.6, DH = DW * DIAL.h / DIAL.w, DY = 5.8
const PIVOT_Y = DY + DH / 2 - DH * DIAL.cy / DIAL.h, NEEDLE = DW * DIAL.r / DIAL.w + 0.2, HALF = DIAL.half * Math.PI / 180
/** 两个接线柱的位置（表的局部坐标） */
export const meterPosts = (): { neg: V3; pos: V3 } => ({ neg: [-3.2, 2.2 + POST_Y, 3.6], pos: [3.2, 2.2 + POST_Y, 3.6] })
/**
 * 课堂上的指针式电表：深灰胶木外壳往后仰，表盘一排刻度，前面台阶上两只接线柱。
 * kind 'A'：0–3 A，k = 电流 ÷ 3；'G'：零点在中间，k 从 −1 到 1。指针带阻尼，会摆过头一点再停稳。
 */
export function Meter({ kind, k }: { kind: 'A' | 'G'; k: number }) {
  const dial = makeDial(kind)
  const name = makeText([kind === 'A' ? '直流电流表' : 'G'], { w: 512, h: 64, bg: '#283039', fg: '#c9d0d6', size: 38, weight: 600 })
  const marks = makeText(kind === 'A' ? ['−          3'] : ['−          +'], { w: 512, h: 64, bg: '#283039', fg: '#e9e6dc', size: 46 })
  const needle = useRef<THREE.Group>(null), s = useRef({ x: 0, v: 0 }), goal = useRef(k); goal.current = k
  const lo = kind === 'A' ? -0.04 : -1.05, hi = 1.05
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), q = s.current, w = 8, z = 0.32
    for (let i = 0; i < 4; i++) { const h = dt / 4, a = -w * w * (q.x - goal.current) - 2 * z * w * q.v; q.v += a * h; q.x += q.v * h; if (q.x > hi) { q.x = hi; q.v *= -0.25 } else if (q.x < lo) { q.x = lo; q.v *= -0.25 } }
    const frac = kind === 'A' ? q.x : (q.x + 1) / 2
    if (needle.current) needle.current.rotation.z = -(-HALF + 2 * HALF * frac)
  })
  const bake = <meshPhysicalMaterial color="#283039" roughness={0.36} clearcoat={0.55} clearcoatRoughness={0.3} />
  const P = meterPosts()
  return <group>
    <RoundedBox args={[12, 1.0, 9.6]} radius={0.3} smoothness={3} position={[0, 0.5, 0]} castShadow receiveShadow>{bake}</RoundedBox>
    <RoundedBox args={[11.4, 1.3, 2.6]} radius={0.3} smoothness={3} position={[0, 1.55, 3.4]} castShadow>{bake}</RoundedBox>
    <mesh position={[0, 1.5, 4.71]}><planeGeometry args={[10, 0.9]} /><meshStandardMaterial map={marks} roughness={0.5} /></mesh>
    <Post at={[P.neg[0], 2.2, P.neg[2]]} /><Post at={[P.pos[0], 2.2, P.pos[2]]} color={RED} />
    <group position={[0, 0.95, -0.9]} rotation-x={TILT}>
      <RoundedBox args={[11.4, 10, 6]} radius={0.55} smoothness={4} position={[0, 5, 0]} castShadow>{bake}</RoundedBox>
      <mesh position={[0, DY, 3.01]}><planeGeometry args={[DW, DH]} /><meshStandardMaterial map={dial} color="#d8d6ce" roughness={0.8} envMapIntensity={0.4} /></mesh>
      {[[0, DY + DH / 2 + 0.22, DW + 0.88, 0.44], [0, DY - DH / 2 - 0.22, DW + 0.88, 0.44]].map(([x, y, ww, hh], i) => <RoundedBox key={i} args={[ww, hh, 0.32]} radius={0.1} smoothness={2} position={[x, y, 3.1]}>{bake}</RoundedBox>)}
      {[-1, 1].map(sx => <RoundedBox key={sx} args={[0.44, DH + 0.88, 0.32]} radius={0.1} smoothness={2} position={[sx * (DW / 2 + 0.22), DY, 3.1]}>{bake}</RoundedBox>)}
      <group ref={needle} position={[0, PIVOT_Y, 3.07]}>
        <mesh position={[0, NEEDLE / 2, 0]}><boxGeometry args={[0.08, NEEDLE, 0.03]} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0, -0.4, 0]}><boxGeometry args={[0.26, 0.5, 0.06]} /><meshStandardMaterial color="#111" /></mesh>
      </group>
      <mesh position={[0, DY, 3.22]} renderOrder={4}><planeGeometry args={[DW, DH]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.1} roughness={0.04} envMapIntensity={1.5} depthWrite={false} clearcoat={1} /></mesh>
      <mesh position={[0, 1.15, 3.02]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.4, 0.4, 0.2, 20]} /><Metal kind="steel" grain="turned" /></mesh>
      <mesh position={[3.4, 1.15, 3.01]}><planeGeometry args={[4, 0.5]} /><meshStandardMaterial map={name} roughness={0.6} /></mesh>
    </group>
  </group>
}

// ---------- 电池盒 ----------
/** 两节 1 号干电池的电池盒：黑色塑料槽，两节电池并排串联，弹簧压着负极；盒头两只接线柱（红正黑负） */
export const batteryPosts = (): { plus: V3; minus: V3 } => ({ plus: [5.2, 1.6 + POST_Y, 1.6], minus: [5.2, 1.6 + POST_Y, -1.6] })
const CELL = lathe([[0, 0], [1.25, 0], [1.3, 0.08], [1.3, 5.9], [1.22, 6.0], [0.42, 6.0], [0.42, 6.15], [0.3, 6.22], [0, 6.22]], { segs: 32 })
export function BatteryBox({ flip = false }: { flip?: boolean }) {
  const label = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!
    g.fillStyle = '#1d4f8a'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#e8c24a'; g.fillRect(330, 0, 182, 128)
    g.fillStyle = '#fff'; g.font = '700 54px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1.5V', 170, 66)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  const tray = <meshPhysicalMaterial color="#1a1b1d" roughness={0.45} clearcoat={0.3} />
  const P = batteryPosts()
  return <group>
    <RoundedBox args={[13.4, 1.0, 6.6]} radius={0.25} smoothness={3} position={[0, 0.5, 0]} castShadow receiveShadow>{tray}</RoundedBox>
    {[-1, 1].map(s => <RoundedBox key={`w${s}`} args={[13.4, 2.0, 0.3]} radius={0.12} smoothness={2} position={[0, 1.5, s * 3.15]} castShadow>{tray}</RoundedBox>)}
    {[-1, 1].map(s => <RoundedBox key={`e${s}`} args={[0.4, 2.0, 6.6]} radius={0.12} smoothness={2} position={[s * 6.5, 1.5, 0]} castShadow>{tray}</RoundedBox>)}
    <mesh position={[0, 1.5, 0]}><boxGeometry args={[12.6, 1.6, 0.18]} />{tray}</mesh>
    {/* 两节电池：一节正极朝东，一节朝西，盒底一片铜片把它们串起来 */}
    {[-1, 1].map((s, i) => <group key={s} position={[(i === 0) !== flip ? -3.1 : 3.1, 2.3, s * 1.6]} rotation-z={(i === 0) !== flip ? -Math.PI / 2 : Math.PI / 2}>
      <mesh geometry={CELL} castShadow><meshPhysicalMaterial map={label} roughness={0.35} clearcoat={0.6} /></mesh>
      <mesh position={[0, 6.1, 0]}><cylinderGeometry args={[0.42, 0.42, 0.14, 20]} /><Metal kind="steel" rough={0.2} /></mesh>
      <mesh position={[0, -0.02, 0]}><cylinderGeometry args={[1.1, 1.1, 0.06, 24]} /><Metal kind="steel" rough={0.25} /></mesh>
    </group>)}
    {[-1, 1].map(s => <mesh key={`sp${s}`} position={[s * 6.0, 2.3, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.7, 0.7, 0.6, 12, 1, true]} /><Metal kind="steel" /></mesh>)}
    <Post at={[P.plus[0], 1.6, P.plus[2]]} color={RED} /><Post at={[P.minus[0], 1.6, P.minus[2]]} />
  </group>
}

// ---------- 单刀开关 ----------
export const switchPosts = (): { a: V3; b: V3 } => ({ a: [-3, 0.9 + POST_Y, 0], b: [3, 0.9 + POST_Y, 0] })
const HANDLE = lathe([[0, 0], [0.32, 0], [0.4, 0.2], [0.4, 1.25], [0.28, 1.55], [0, 1.6]], { segs: 24 })
/** 单刀开关：白瓷底座，两只铜夹座，铜刀片一头铰在左夹座上，另一头装黑胶木柄。on 0 断开（翘起 60°）到 1 合上 */
export function KnifeSwitch({ on = 0 }: { on?: number }) {
  const P = switchPosts(), ang = (1 - on) * 1.05
  const porcelain = <meshPhysicalMaterial color="#f2f0ea" roughness={0.18} clearcoat={0.8} clearcoatRoughness={0.1} />
  return <group>
    <RoundedBox args={[8, 0.9, 3.2]} radius={0.25} smoothness={3} position={[0, 0.45, 0]} castShadow receiveShadow>{porcelain}</RoundedBox>
    {[-1.4, 2.2].map(x => [-1, 1].map(s => <RoundedBox key={`${x}${s}`} args={[0.9, 1.3, 0.1]} radius={0.04} smoothness={2} position={[x, 1.55, s * 0.16]} castShadow><Metal kind="copper" grain="brushed" rough={0.32} /></RoundedBox>))}
    <Post at={[P.a[0], 0.9, 0]} /><Post at={[P.b[0], 0.9, 0]} />
    <group position={[-1.4, 1.95, 0]} rotation-z={ang}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.16, 0.16, 0.5, 14]} /><Metal kind="brass" /></mesh>
      <RoundedBox args={[4.8, 0.58, 0.12]} radius={0.04} smoothness={2} position={[2.3, -0.05, 0]} castShadow><Metal kind="copper" grain="brushed" rough={0.26} /></RoundedBox>
      <mesh geometry={HANDLE} position={[4.65, 0, 0]} rotation-z={-Math.PI / 2} castShadow><meshPhysicalMaterial color="#121314" roughness={0.3} clearcoat={0.7} /></mesh>
    </group>
  </group>
}

// ---------- 学生电源 ----------
/** 学生电源：浅灰机壳 20 × 10 × 16 cm，前面板一块数字表、调压旋钮、两只输出接线柱 */
export const supplyPosts = (): { plus: V3; minus: V3 } => ({ plus: [3.6, 2.6, 8.23 + POST_Y], minus: [7.2, 2.6, 8.23 + POST_Y] })
const KNOB = lathe([[0, 0], [1.15, 0], [1.22, 0.12], [1.22, 1.2], [1.06, 1.45], [0, 1.5]], { segs: 36, crease: 40 })
export function Supply({ u, on = true }: { u: number; on?: boolean }) {
  const paint = <meshPhysicalMaterial color="#cfd2cf" roughness={0.42} clearcoat={0.45} clearcoatRoughness={0.35} />
  const panel = <meshPhysicalMaterial color="#2a2e33" roughness={0.5} clearcoat={0.3} />
  const name = makeText(['学生电源'], { w: 256, h: 64, bg: '#2a2e33', fg: '#d9dde0', size: 40, weight: 600 })
  return <group>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 8, 0.3, sz * 6]}><cylinderGeometry args={[0.8, 0.9, 0.6, 16]} /><meshStandardMaterial color="#141516" roughness={0.8} /></mesh>))}
    <RoundedBox args={[20, 10, 16]} radius={0.5} smoothness={4} position={[0, 5.6, 0]} castShadow receiveShadow>{paint}</RoundedBox>
    <mesh position={[0, 5.6, -6]}><boxGeometry args={[20.03, 10.03, 0.07]} /><meshStandardMaterial color="#8d8f8c" roughness={0.6} /></mesh>
    {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[-3, 10.61, -5.5 + i * 1.1]} rotation-x={-Math.PI / 2}><planeGeometry args={[10, 0.4]} /><meshStandardMaterial color="#2c2e30" roughness={0.9} /></mesh>)}
    <RoundedBox args={[19, 9, 0.34]} radius={0.16} smoothness={2} position={[0, 5.6, 8.06]}>{panel}</RoundedBox>
    <mesh position={[-4.6, 9.0, 8.25]}><planeGeometry args={[6, 1.5]} /><meshStandardMaterial map={name} roughness={0.6} /></mesh>
    <RoundedBox args={[7.8, 3.2, 0.3]} radius={0.15} smoothness={2} position={[-4.6, 5.9, 8.25]}><meshStandardMaterial color="#0d0f10" roughness={0.3} /></RoundedBox>
    <Led text={on ? u.toFixed(1) + 'V' : ''} w={6.6} h={2.4} position={[-4.6, 5.9, 8.42]} />
    <group position={[5.4, 6.2, 8.2]} rotation-x={Math.PI / 2}>
      <mesh geometry={KNOB} castShadow><meshPhysicalMaterial color="#17181a" roughness={0.35} clearcoat={0.6} /></mesh>
      <mesh position={[0, 1.51, -0.7]}><boxGeometry args={[0.14, 0.02, 0.9]} /><meshBasicMaterial color="#f2f2ea" /></mesh>
    </group>
    <mesh position={[-7.6, 2.6, 8.3]}><circleGeometry args={[0.26, 20]} /><meshStandardMaterial color={on ? '#5dff8a' : '#1f3324'} emissive="#5dff8a" emissiveIntensity={on ? 1.2 : 0} toneMapped={!on} /></mesh>
    {/* 输出接线柱装在面板上：轴朝 +z */}
    {[[3.6, RED], [7.2, BLACK]].map(([x, c]) => <group key={x as number} position={[x as number, 2.6, 8.23]} rotation-x={Math.PI / 2}><Post at={[0, 0, 0]} color={c as string} /></group>)}
  </group>
}

// ---------- 滑动变阻器 ----------
/** 滑动变阻器（20 Ω 2 A）：白瓷管上密绕电阻丝，两头钢支架，上面一根方钢杆和滑片。p：滑片位置 0–1 */
export const rheoPosts = (): { A: V3; D: V3 } => ({ A: [-11.3, 1.0 + POST_Y, 1.6], D: [9.6, 7.75 + POST_Y, 0] })
export function Rheostat({ p }: { p: number }) {
  const coil = useMemo(() => { const t = makeCoil('#8f8a80').clone(); t.repeat.set(1, 22); t.needsUpdate = true; return t }, [])
  const frame = <meshPhysicalMaterial color="#33424e" roughness={0.42} clearcoat={0.5} />
  const P = rheoPosts(), sx = -9.6 + 19.2 * p
  return <group>
    {[-1, 1].map(s => <group key={s} position={[s * 11.6, 0, 0]}>
      <RoundedBox args={[0.32, 7.8, 4]} radius={0.08} smoothness={2} position={[0, 3.9, 0]} castShadow>{frame}</RoundedBox>
      <RoundedBox args={[2.4, 0.3, 4.6]} radius={0.08} smoothness={2} position={[s * 0.8, 0.15, 0]} castShadow receiveShadow>{frame}</RoundedBox>
      <RoundedBox args={[1.6, 0.5, 1.5]} radius={0.08} smoothness={2} position={[s * 0.8, 0.55, 1.6]} castShadow><meshStandardMaterial color="#e3ddcc" roughness={0.5} /></RoundedBox>
    </group>)}
    <mesh position={[0, 3.2, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[1.5, 1.5, 22.6, 40]} /><meshPhysicalMaterial color="#efece4" roughness={0.25} clearcoat={0.6} /></mesh>
    <mesh position={[0, 3.2, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[1.58, 1.58, 20, 48, 1, true]} /><meshStandardMaterial map={coil} metalness={0.7} roughness={0.34} /></mesh>
    <mesh position={[0, 7.4, 0]} castShadow><boxGeometry args={[23.2, 0.7, 0.7]} /><Metal kind="steel" grain="brushed" rough={0.36} /></mesh>
    <Post at={[P.A[0], 1.0, P.A[2]]} /><Post at={[P.D[0], 7.75, 0]} />
    <group position={[sx, 0, 0]}>
      <RoundedBox args={[2.2, 1.7, 2.1]} radius={0.24} smoothness={3} position={[0, 7.5, 0]} castShadow><meshPhysicalMaterial color="#17191b" roughness={0.3} clearcoat={0.6} /></RoundedBox>
      <RoundedBox args={[1.1, 1.1, 0.9]} radius={0.2} smoothness={2} position={[0, 8.9, 0]} castShadow><meshPhysicalMaterial color="#17191b" roughness={0.3} clearcoat={0.6} /></RoundedBox>
      <mesh position={[0, 5.7, 0.25]} rotation-x={0.25}><boxGeometry args={[0.46, 2.6, 0.06]} /><Metal kind="brass" /></mesh>
    </group>
  </group>
}

// ---------- 手套 ----------
// 运维人员的丁腈实验手套：浅蓝色、贴手、手指细长，手腕处翻边的袖口，往上一截深蓝工装袖子和小臂。
// 按真实尺寸写（厘米，再乘 scale）：手掌宽约 8 cm、厚约 2.6 cm，中指约 8 cm。指尖捏东西的地方在原点附近，手腕朝 +y，手背朝 −z，指尖微微往 +z 弯。
const fingerGeo = (len: number, r: number) => {
  const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -len * 0.45, 0.5], [0, -len * 0.78, 1.5], [0, -len * 0.95, 2.8]].map(p => new THREE.Vector3(...(p as V3))))
  const g = new THREE.TubeGeometry(c, 20, r, 12)
  // 指头从根部往指尖慢慢变细
  const pos = g.attributes.position, tmp = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    const seg = Math.floor(i / 13) / 20, center = c.getPoint(seg)
    tmp.fromBufferAttribute(pos, i).sub(center).multiplyScalar(1 - 0.22 * seg).add(center)
    pos.setXYZ(i, tmp.x, tmp.y, tmp.z)
  }
  g.computeVertexNormals()
  return g
}
const FINGERS: { x: number; len: number; r: number }[] = [{ x: -2.6, len: 6.3, r: 0.7 }, { x: -0.88, len: 7.5, r: 0.78 }, { x: 0.88, len: 7.8, r: 0.78 }, { x: 2.6, len: 7.1, r: 0.74 }]
const FINGER_GEO = FINGERS.map(f => fingerGeo(f.len, f.r))
const THUMB = (() => { const c = new THREE.CatmullRomCurve3([[3.4, 9.6, 0.6], [4.6, 7.4, 1.4], [4.4, 4.8, 2.4], [3.4, 3.0, 2.6]].map(p => new THREE.Vector3(...(p as V3)))); return new THREE.TubeGeometry(c, 20, 0.85, 12) })()
const CUFF = lathe([[3.05, 0], [3.35, 0.2], [3.45, 2.6], [3.65, 2.8], [3.65, 3.6], [3.4, 3.8], [2.9, 3.8], [2.9, 0]], { segs: 32, closed: true })
const SLEEVE = lathe([[3.9, 0], [4.15, 0.25], [4.3, 2.2], [4.5, 12], [0, 12]], { segs: 32 })
export function Glove({ scale = 1 }: { scale?: number }) {
  const nitrile = <meshPhysicalMaterial color="#9cc3e8" roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} sheen={0.4} sheenColor="#e6f2ff" />
  return <group scale={scale}><group position={[0, 0, -1.0]}>
    {/* 手掌：扁的，边缘圆滑 */}
    <RoundedBox args={[7.8, 8.6, 2.6]} radius={1.05} smoothness={4} position={[0, 12.0, -0.2]} castShadow>{nitrile}</RoundedBox>
    {/* 四根手指：从掌根往下，略微弯向 +z */}
    {FINGERS.map((f, i) => <group key={i} position={[f.x, 7.9, 0.1]}>
      <mesh geometry={FINGER_GEO[i]} castShadow>{nitrile}</mesh>
      <mesh position={[0, -f.len * 0.95, 2.8]}><sphereGeometry args={[f.r * 0.78, 14, 10]} />{nitrile}</mesh>
      <mesh><sphereGeometry args={[f.r * 1.02, 14, 10]} />{nitrile}</mesh>
    </group>)}
    <mesh geometry={THUMB} castShadow>{nitrile}</mesh>
    <mesh position={[3.4, 3.0, 2.6]}><sphereGeometry args={[0.72, 14, 10]} />{nitrile}</mesh>
    {/* 手腕：收细，接袖口 */}
    <mesh position={[0, 17.0, -0.2]} scale={[1, 1, 0.62]}><cylinderGeometry args={[3.1, 3.7, 2.4, 28]} />{nitrile}</mesh>
    <mesh geometry={CUFF} position={[0, 17.8, -0.2]} scale={[1, 1, 0.72]} castShadow>{nitrile}</mesh>
    {/* 工装袖子和一截小臂 */}
    <mesh geometry={SLEEVE} position={[0, 21.2, -0.2]} scale={[1, 1, 0.78]} castShadow><meshStandardMaterial color="#26385a" roughness={0.88} /></mesh>
    <mesh position={[0, 25.6, -0.2]} scale={[1, 1, 0.78]}><cylinderGeometry args={[4.42, 4.36, 1.1, 32, 1, true]} /><meshStandardMaterial color="#d9dcd6" roughness={0.3} metalness={0.4} /></mesh>
  </group></group>
}

/** 一只车出来的金属小圆盘（螺钉头、垫片） */
export const SCREW = disc(0.32, 0.12, { segs: 16 })

/** 两个接线柱之间的一根导线：从 a 竖着出来，落到台面上走，再上到 b。via 是台面上途经的点（只给 x、z） */
export function route(a: V3, b: V3, via: [number, number][] = [], y = 0.3): V3[] {
  const up = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]]
  const d = (p: V3, q: [number, number]): V3 => { const dx = q[0] - p[0], dz = q[1] - p[2], l = Math.hypot(dx, dz) || 1; return [p[0] + dx / l * 2.2, Math.max(y, p[1] * 0.4), p[2] + dz / l * 2.2] }
  const first: [number, number] = via[0] ?? [b[0], b[2]], last: [number, number] = via[via.length - 1] ?? [a[0], a[2]]
  return [a, up(a, 1.2), d(a, first), ...via.map(([x, z]): V3 => [x, y, z]), d(b, last), up(b, 1.2), b]
}
/** 拨开关的那只手：捏在闸刀柄上 */
export function SwitchHand({ on }: { on: number }) {
  const ang = (1 - on) * 1.05
  return <group position={[-1.4, 1.95, 0]} rotation-z={ang}><group position={[5.4, 0.3, 0]} rotation-z={-ang}><group rotation-x={-0.4}><Glove scale={0.95} /></group></group></group>
}
