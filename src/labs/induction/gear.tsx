// 各课共用的器材：戴丁腈手套的手（带工装袖子，手指能弯）、接线柱、导线（带电流的流动亮点）、实验台、
// 学生电源、示波器、灵敏电流计。全部按米写，原点在器材底面正中，正面朝 +z。
// 手、电源、示波器的写法参照带电粒子实验室（bfield），电流计参照电与磁实验室（magnet），复制到这里改写。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, disc, lathe } from '@/lab-kit'
import { COL } from './layout'
import { DIAL, makeDial, makePanel, makeResin, makeText, rep } from './mats'
import type { V3 } from './physics'

export const RED = '#c4302a', BLACK = '#1c1d1f'

// ---------- 手 ----------
const NITRILE = { color: '#7aa3d4', roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.45, sheen: 0.5, sheenColor: '#e6f2ff' }
/** 四根手指：[离掌心中线的距离, 三节的长度, 粗细] */
const FINGERS: [number, [number, number, number], number][] = [[0.027, [0.04, 0.026, 0.021], 0.0092], [0.009, [0.046, 0.029, 0.023], 0.0098], [-0.009, [0.043, 0.027, 0.022], 0.0095], [-0.026, [0.034, 0.021, 0.019], 0.0084]]
const capsule = (r: number, len: number) => { const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, 14); g.rotateZ(-Math.PI / 2); g.translate(len / 2, 0, 0); return g }
/** 一根手指：沿 +x 伸出，三节，每个关节往掌心（+z）弯 curl 弧度 */
function Finger({ seg, r, curl, mat }: { seg: number[]; r: number; curl: number; mat: ReactNode }) {
  const g = useMemo(() => seg.map((l, i) => capsule(r * (1 - i * 0.08), l + r * 0.6)), [seg, r])
  const chain = (i: number): ReactNode => i >= seg.length ? null : <group rotation-y={-curl * (i === 0 ? 0.8 : 1)}>
    <mesh geometry={g[i]} castShadow>{mat}</mesh>
    <group position={[seg[i], 0, 0]}>{chain(i + 1)}</group>
  </group>
  return <>{chain(0)}</>
}
/**
 * 戴丁腈手套的左手或右手（带一截工装袖子）。掌心朝 +z，四指沿 +x 伸出，左手的大拇指朝 +y。
 * curl：四指弯曲的程度（0 伸直，1.4 握拳）；thumb：大拇指张开的角度。右手是左手的镜像。
 */
export function Hand({ side = 'left', curl = 0, thumb = 1.3, scale = 1, sleeve = 0.15 }: { side?: 'left' | 'right'; curl?: number; thumb?: number; scale?: number; sleeve?: number }) {
  const mat = <meshPhysicalMaterial {...NITRILE} side={side === 'right' ? THREE.BackSide : THREE.FrontSide} />
  const geo = useMemo(() => ({
    cuff: lathe([[0.034, 0], [0.037, 0.004], [0.037, 0.03], [0.04, 0.034], [0.04, 0.046], [0.035, 0.05], [0.03, 0.05], [0.03, 0]], { segs: 32, closed: true }),
    sleeve: lathe([[0.041, 0], [0.044, 0.004], [0.046, 0.03], [0.049, sleeve], [0, sleeve]], { segs: 32 }),
    thumb: capsule(0.0105, 0.04), thumb2: capsule(0.0098, 0.032),
  }), [sleeve])
  return <group scale={[scale, side === 'right' ? -scale : scale, scale]}>
    {/* 手掌：扁，边缘圆滑；掌根略收 */}
    <RoundedBox args={[0.085, 0.08, 0.026]} radius={0.012} smoothness={4} position={[-0.02, 0, 0]} castShadow>{mat}</RoundedBox>
    <mesh position={[-0.065, 0, 0]} scale={[1, 1, 0.42]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.032, 0.036, 0.03, 28]} />{mat}</mesh>
    {FINGERS.map(([y, seg, r], i) => <group key={i} position={[0.02, y, 0.002]}><Finger seg={seg} r={r} curl={curl} mat={mat} /></group>)}
    {/* 大拇指：从掌根靠 +y 的一侧伸出，张开 thumb 弧度 */}
    <group position={[-0.042, 0.03, -0.004]} rotation-z={thumb} rotation-x={-0.25}>
      <mesh geometry={geo.thumb} castShadow>{mat}</mesh>
      <group position={[0.04, 0, 0]} rotation-y={-curl * 0.4}><mesh geometry={geo.thumb2} castShadow>{mat}</mesh></group>
    </group>
    {/* 袖口和工装袖子，沿 −x 伸出去 */}
    <group position={[-0.08, 0, 0]} rotation-z={Math.PI / 2}>
      <mesh geometry={geo.cuff} scale={[1, 1, 0.55]} castShadow>{mat}</mesh>
      <mesh geometry={geo.sleeve} position={[0, 0.045, 0]} scale={[1, 1, 0.72]} castShadow><meshStandardMaterial color="#27375a" roughness={0.88} /></mesh>
      <mesh position={[0, 0.07, 0]} scale={[1, 1, 0.72]}><cylinderGeometry args={[0.0466, 0.0464, 0.01, 32, 1, true]} /><meshStandardMaterial color="#c8ccc4" roughness={0.4} metalness={0.3} /></mesh>
    </group>
  </group>
}
// ---------- 接线柱、导线 ----------
const NUT = (() => { const g = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 6); g.translate(0, 0.002, 0); return g })()
const CAP = lathe([[0, 0.004], [0.0058, 0.004], [0.0068, 0.0055], [0.0068, 0.016], [0.0058, 0.0175], [0, 0.0178]], { segs: 20, crease: 40 })
/** 接线柱：黄铜螺母和一只塑料帽；导线接在离底 0.006 m 处 */
export function Post({ at, color = BLACK }: { at: V3; color?: string }) {
  return <group position={at}>
    <mesh geometry={NUT} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh geometry={CAP} castShadow><meshPhysicalMaterial color={color} roughness={0.32} clearcoat={0.5} /></mesh>
  </group>
}
/** 一根导线：pts 是途经的点，中间自然弯；flow 是电流（正负是方向，0 不流），画成沿线跑的一串黄色亮点 */
export function Wire({ pts, color = RED, flow = 0, r = 0.0024, dots = 16, bare = false }: { pts: V3[]; color?: string; flow?: number; r?: number; dots?: number; bare?: boolean }) {
  const { curve, geo, len } = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal')
    return { curve: c, geo: new THREE.TubeGeometry(c, Math.max(24, pts.length * 14), r, 8), len: c.getLength() }
  }, [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  const inst = useRef<THREE.InstancedMesh>(null), phase = useRef(0), m = useMemo(() => new THREE.Matrix4(), [])
  useFrame((_, d) => {
    const im = inst.current; if (!im) return
    phase.current += Math.min(d, 1 / 30) * flow * 0.12 / len
    for (let i = 0; i < dots; i++) {
      const u = (((i / dots + phase.current) % 1) + 1) % 1, p = curve.getPointAt(u), s = Math.abs(flow) > 0.01 ? 1 : 0
      m.makeScale(s, s, s).setPosition(p); im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return <group>
    {!bare && <mesh geometry={geo} castShadow><meshPhysicalMaterial color={color} roughness={0.42} clearcoat={0.3} /></mesh>}
    <instancedMesh ref={inst} args={[undefined, undefined, dots]} renderOrder={6} frustumCulled={false}>
      <sphereGeometry args={[r * 1.5, 8, 6]} /><meshBasicMaterial color={COL.cur} toneMapped={false} transparent opacity={0.95} depthTest={false} />
    </instancedMesh>
  </group>
}

/** 电表上的接线柱（厘米） */
const POST_Y = 0.45
const NUT_CM = (() => { const g = new THREE.CylinderGeometry(0.4, 0.4, 0.24, 6); g.translate(0, 0.12, 0); return g })()
const CAP_CM = lathe([[0, 0.6], [0.4, 0.6], [0.47, 0.68], [0.47, 1.12], [0.4, 1.22], [0, 1.24]], { segs: 20, crease: 40 })
function PostCm({ at, color = BLACK }: { at: V3; color?: string }) {
  return <group position={at}>
    <mesh geometry={NUT_CM} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh geometry={CAP_CM} castShadow><meshPhysicalMaterial color={color} roughness={0.32} clearcoat={0.5} /></mesh>
  </group>
}
// ---------- 指针式电表 ----------
const TILT = -0.32, DW = 9.6, DH = DW * DIAL.h / DIAL.w, DY = 5.8
const PIVOT_Y = DY + DH / 2 - DH * DIAL.cy / DIAL.h, NEEDLE = DW * DIAL.r / DIAL.w + 0.2, HALF = DIAL.half * Math.PI / 180
/** 两个接线柱的位置（表的局部坐标） */
const meterPostsCm = (): { neg: V3; pos: V3 } => ({ neg: [-3.2, 2.2 + POST_Y, 3.6], pos: [3.2, 2.2 + POST_Y, 3.6] })
/**
 * 课堂上的指针式电表：深灰胶木外壳往后仰，表盘一排刻度，前面台阶上两只接线柱。
 * kind 'A'：0–3 A，k = 电流 ÷ 3；'G'：零点在中间，k 从 −1 到 1。指针带阻尼，会摆过头一点再停稳。
 */
function MeterCm({ kind, k }: { kind: 'A' | 'G'; k: number }) {
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
    <PostCm at={[P.neg[0], 2.2, P.neg[2]]} /><PostCm at={[P.pos[0], 2.2, P.pos[2]]} color={RED} />
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

/** 按米摆放的指针式电表（表身按厘米建，缩小 100 倍）。kind 'G' 是零点在中间的灵敏电流计，k 从 −1 到 1 */
export function Meter({ kind, k }: { kind: 'A' | 'G'; k: number }) { return <group scale={0.01}><MeterCm kind={kind} k={k} /></group> }
/** 电表两只接线柱的位置（m，表的局部坐标）：负、正 */
export const meterPosts = (): { neg: V3; pos: V3 } => { const p = meterPostsCm(); return { neg: p.neg.map(v => v * 0.01) as V3, pos: p.pos.map(v => v * 0.01) as V3 } }

// ---------- 实验台 ----------
/** 实验台：钢制柜体（两扇门、把手、踢脚），上面一块黑色树脂台面。w × d，台面高 h */
export function Bench({ w = 1.8, d = 0.8, h = 0.86 }: { w?: number; d?: number; h?: number }) {
  const top = useMemo(() => rep(makeResin(), w / 0.8, d / 0.8), [w, d])
  const panel = useMemo(() => rep(makePanel('#c3c7c6'), 2, 2), [])
  const doors = Math.max(2, Math.round(w / 0.6))
  return <group>
    <mesh position={[0, 0.05, -0.02]} castShadow receiveShadow><boxGeometry args={[w - 0.06, 0.1, d - 0.1]} /><meshStandardMaterial color="#2a2d2f" roughness={0.7} /></mesh>
    <RoundedBox args={[w - 0.04, h - 0.14, d - 0.06]} radius={0.01} smoothness={2} position={[0, 0.1 + (h - 0.14) / 2, -0.01]} castShadow receiveShadow><meshStandardMaterial map={panel} color="#c3c7c6" roughness={0.5} metalness={0.25} /></RoundedBox>
    {Array.from({ length: doors }, (_, i) => {
      const dw = (w - 0.08) / doors, x = -w / 2 + 0.04 + dw * (i + 0.5)
      return <group key={i} position={[x, 0.1 + (h - 0.14) / 2, d / 2 - 0.035]}>
        <mesh><boxGeometry args={[dw - 0.012, h - 0.2, 0.004]} /><meshStandardMaterial color="#aeb3b3" roughness={0.45} metalness={0.3} /></mesh>
        <mesh position={[i % 2 ? -dw / 2 + 0.05 : dw / 2 - 0.05, 0.12, 0.012]}><capsuleGeometry args={[0.006, 0.09, 4, 10]} /><Metal kind="stainless" grain="brushed" /></mesh>
      </group>
    })}
    <RoundedBox args={[w, 0.03, d]} radius={0.006} smoothness={2} position={[0, h - 0.015, 0]} castShadow receiveShadow><meshPhysicalMaterial map={top} roughness={0.36} clearcoat={0.55} clearcoatRoughness={0.25} /></RoundedBox>
  </group>
}

// ---------- 旋钮、电源 ----------
const KNOB = lathe([[0, 0], [0.012, 0], [0.013, 0.002], [0.012, 0.014], [0.009, 0.016], [0, 0.0165]], { segs: 28, crease: 30 })
/** 面板上的一只旋钮（轴沿 +z） */
export function Knob({ at, turn = 0, color = '#1b1c1e' }: { at: V3; turn?: number; color?: string }) {
  return <group position={at} rotation-x={Math.PI / 2}><group rotation-y={turn}>
    <mesh geometry={KNOB} castShadow><meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.4} /></mesh>
    <mesh position={[0, 0.0168, -0.006]}><boxGeometry args={[0.002, 0.0005, 0.007]} /><meshBasicMaterial color="#e9e6dc" /></mesh>
  </group></group>
}
/**
 * 台式电源：浅灰金属机壳、深色前面板、两块数字表头、两只旋钮、一个电源开关、一对接线柱（红正黑负）。
 * screens 是两块表头上显示的字；on 时开关上的指示灯亮。posts 返回接线柱的位置（器材局部坐标）
 */
export const supplyPosts = (w = 0.26): { plus: V3; minus: V3 } => ({ plus: [w / 2 - 0.08, 0.035, 0.127], minus: [w / 2 - 0.035, 0.035, 0.127] })
export function Supply({ screens, on, name, w = 0.26, h = 0.13, d = 0.24, accent = '#c9862d' }: { screens: [string, string]; on: boolean; name: string; w?: number; h?: number; d?: number; accent?: string }) {
  const label = makeText([name], { w: 512, h: 64, bg: '#26292d', fg: '#d6d9dc', size: 30, weight: 500 })
  const P = supplyPosts(w)
  return <group>
    <RoundedBox args={[w, h, d]} radius={0.006} smoothness={3} position={[0, h / 2 + 0.006, 0]} castShadow receiveShadow><meshStandardMaterial color="#b9bdbf" roughness={0.45} metalness={0.45} /></RoundedBox>
    {[-1, 1].map(s => <mesh key={s} position={[s * (w / 2 - 0.02), 0.003, d / 2 - 0.025]}><cylinderGeometry args={[0.008, 0.009, 0.006, 16]} /><meshStandardMaterial color="#151515" roughness={0.8} /></mesh>)}
    <mesh position={[0, h / 2 + 0.006, d / 2 + 0.002]}><boxGeometry args={[w - 0.008, h - 0.008, 0.004]} /><meshPhysicalMaterial color="#2a2d31" roughness={0.5} clearcoat={0.3} /></mesh>
    <mesh position={[0, h - 0.004, d / 2 + 0.0045]}><boxGeometry args={[w - 0.008, 0.008, 0.001]} /><meshBasicMaterial color={accent} /></mesh>
    <mesh position={[-w / 4 + 0.01, h - 0.02, d / 2 + 0.0046]}><planeGeometry args={[w / 2 - 0.02, 0.012]} /><meshBasicMaterial map={label} /></mesh>
    <Led text={screens[0]} w={0.085} h={0.032} position={[-w / 4 + 0.004, h * 0.6, d / 2 + 0.005]} />
    <Led text={screens[1]} w={0.085} h={0.032} position={[w / 4 - 0.004, h * 0.6, d / 2 + 0.005]} />
    <Knob at={[-w / 4 + 0.004, 0.035, d / 2 + 0.004]} /><Knob at={[-0.006, 0.035, d / 2 + 0.004]} />
    {/* 电源开关和指示灯 */}
    <RoundedBox args={[0.02, 0.016, 0.008]} radius={0.002} smoothness={2} position={[-w / 2 + 0.024, 0.035, d / 2 + 0.006]}><meshStandardMaterial color="#111" roughness={0.5} /></RoundedBox>
    <mesh position={[-w / 2 + 0.024, 0.056, d / 2 + 0.005]}><sphereGeometry args={[0.0028, 12, 8]} /><meshBasicMaterial color={on ? '#5dff8a' : '#24352a'} toneMapped={!on} /></mesh>
    <Post at={[P.plus[0], 0.029, d / 2 + 0.003]} color={RED} /><Post at={[P.minus[0], 0.029, d / 2 + 0.003]} />
    {/* 背后的散热孔 */}
    {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[-w / 2 + 0.05 + i * 0.03, h + 0.0062, -d / 4]}><boxGeometry args={[0.018, 0.001, d / 3]} /><meshStandardMaterial color="#5f6467" roughness={0.6} /></mesh>)}
  </group>
}

// ---------- 示波器 ----------
/**
 * 示波器：深灰机壳、左边一块屏、右边一排旋钮和按键。屏上画两条线：黄色是交变电压，青色是质子每次过缝的时刻。
 * trace(g, w, h) 由使用的人画（每帧调用），屏的分辨率 512 × 320。
 */
export function Scope({ trace, label = '示波器' }: { trace: (g: CanvasRenderingContext2D, w: number, h: number) => void; label?: string }) {
  const { tex, g } = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 320
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return { tex: t, g: c.getContext('2d')! }
  }, [])
  const draw = useRef(trace); draw.current = trace
  useFrame(() => {
    g.fillStyle = '#05100e'; g.fillRect(0, 0, 512, 320)
    g.strokeStyle = 'rgba(120,200,180,0.16)'; g.lineWidth = 1
    for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(i * 51.2, 0); g.lineTo(i * 51.2, 320); g.stroke() }
    for (let j = 1; j < 8; j++) { g.beginPath(); g.moveTo(0, j * 40); g.lineTo(512, j * 40); g.stroke() }
    draw.current(g, 512, 320); tex.needsUpdate = true
  })
  const name = makeText([label], { w: 256, h: 48, bg: '#30353a', fg: '#c7ccd1', size: 26, weight: 500 })
  const W = 0.36, H = 0.2, D = 0.3
  return <group>
    <RoundedBox args={[W, H, D]} radius={0.012} smoothness={3} position={[0, H / 2 + 0.01, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#3a4046" roughness={0.5} clearcoat={0.2} /></RoundedBox>
    <RoundedBox args={[W - 0.01, H - 0.01, 0.012]} radius={0.004} smoothness={2} position={[0, H / 2 + 0.01, D / 2]}><meshStandardMaterial color="#22262a" roughness={0.55} /></RoundedBox>
    <mesh position={[-0.055, H / 2 + 0.016, D / 2 + 0.0065]}><planeGeometry args={[0.21, 0.131]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    <mesh position={[-0.055, H / 2 + 0.016, D / 2 + 0.008]}><planeGeometry args={[0.215, 0.136]} /><meshPhysicalMaterial color="#fff" transparent opacity={0.08} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    <mesh position={[-0.11, 0.03, D / 2 + 0.0065]}><planeGeometry args={[0.08, 0.015]} /><meshBasicMaterial map={name} /></mesh>
    {[[0.1, 0.16], [0.145, 0.16], [0.1, 0.115], [0.145, 0.115]].map(([x, y], i) => <Knob key={i} at={[x, y, D / 2 + 0.006]} turn={i} color="#2c2f33" />)}
    {[0, 1, 2].map(i => <RoundedBox key={i} args={[0.018, 0.01, 0.006]} radius={0.002} smoothness={2} position={[0.09 + i * 0.026, 0.06, D / 2 + 0.008]}><meshStandardMaterial color={i === 0 ? '#e8c24a' : i === 1 ? '#5cd6c4' : '#9aa1a8'} roughness={0.5} /></RoundedBox>)}
    {[0, 1].map(i => <mesh key={i} position={[0.1 + i * 0.045, 0.03, D / 2 + 0.008]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.007, 0.007, 0.012, 16]} /><Metal kind="chrome" /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * (W / 2 - 0.03), 0.005, D / 2 - 0.03]}><boxGeometry args={[0.04, 0.01, 0.03]} /><meshStandardMaterial color="#151515" roughness={0.8} /></mesh>)}
  </group>
}

/** 一只车出来的金属小圆盘（螺钉头、垫片） */
export const SCREW = disc(0.004, 0.002, { segs: 16 })
