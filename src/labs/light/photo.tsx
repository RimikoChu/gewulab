// 第 6、7 课的光电效应实验装置：光源、光电管、微安表、电压表、直流电源和连接的导线。
// 光电管画得比实物大，里面的光电子是示意：用小亮点表示从阴极飞出的电子，个数和快慢不按比例。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe } from '@/lab-kit'
import { Anod, ENV, Glow, KNOB, Plastic, Shaft, type V3 } from './gear'
import { ST, TOP } from './world'

const X0 = ST.photo
/** 各件的位置：光电管、光源、两只表、电源 */
export const P = { tube: [X0 - 0.55, TOP, 0.1] as V3, src: [X0 - 1.95, TOP, 0.1] as V3, amp: [X0 + 0.72, TOP, -0.55] as V3, volt: [X0 + 1.92, TOP, -0.55] as V3, supply: [X0 + 1.32, TOP, 0.75] as V3, beamY: TOP + 0.74 }

// ---------- 指针式电表 ----------
const HALF = 50 * Math.PI / 180
/** 表盘：一道弧形刻度、数字和单位 */
function makeDial(unit: string, max: number, major: number, minor: number, digits: number) {
  const W = 640, HH = 400, c = document.createElement('canvas'); c.width = W; c.height = HH
  const g = c.getContext('2d')!, cx = W / 2, cy = HH * 1.02, R = HH * 0.8
  g.fillStyle = '#efece2'; g.fillRect(0, 0, W, HH)
  g.strokeStyle = '#16181a'; g.fillStyle = '#16181a'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2 - HALF, -Math.PI / 2 + HALF); g.stroke()
  const n = Math.round(max / minor)
  for (let i = 0; i <= n; i++) {
    const v = i * minor, t = -HALF + 2 * HALF * v / max, big = Math.abs(v / major - Math.round(v / major)) < 1e-6, r1 = R + (big ? 26 : 14)
    g.lineWidth = big ? 4 : 2; g.beginPath(); g.moveTo(cx + Math.sin(t) * R, cy - Math.cos(t) * R); g.lineTo(cx + Math.sin(t) * r1, cy - Math.cos(t) * r1); g.stroke()
    if (big) { g.font = '600 34px sans-serif'; g.fillText(v.toFixed(digits), cx + Math.sin(t) * (R + 52), cy - Math.cos(t) * (R + 52)) }
  }
  g.font = '700 64px sans-serif'; g.fillText(unit, cx, HH * 0.56)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
const POST = lathe([[0, 0], [0.03, 0], [0.03, 0.012], [0.016, 0.016], [0.016, 0.04], [0.034, 0.044], [0.036, 0.048], [0.036, 0.085], [0.03, 0.09], [0, 0.09]], { segs: 20 })
/** 接线柱：下面一圈金属座，上面一只带颜色的旋帽 */
export function Post({ at, color }: { at: V3; color: string }) {
  return <group position={at}>
    <mesh position-y={0.008}><cylinderGeometry args={[0.03, 0.03, 0.016, 20]} /><Metal kind="brass" grain="turned" env={ENV} /></mesh>
    <mesh geometry={POST}><Plastic color={color} /></mesh>
  </group>
}
/** 一只指针式电表：黑色胶木外壳，表面往后仰，前面的台阶上两只接线柱。k：指针偏到满刻度的几分之几 */
export function Meter({ at, unit, max, major, minor, digits = 0, k }: { at: V3; unit: string; max: number; major: number; minor: number; digits?: number; k: number }) {
  const tex = useMemo(() => makeDial(unit, max, major, minor, digits), [unit, max, major, minor, digits])
  const needle = useRef<THREE.Group>(null), s = useRef({ x: 0, v: 0 }), goal = useRef(k); goal.current = Math.min(1.05, Math.max(-0.04, k))
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), q = s.current, w = 9, z = 0.42
    for (let i = 0; i < 4; i++) { const h = dt / 4; q.v += (-w * w * (q.x - goal.current) - 2 * z * w * q.v) * h; q.x += q.v * h }   // 指针带一点惯性：摆过头一点再停稳
    if (needle.current) needle.current.rotation.z = HALF - 2 * HALF * q.x
  })
  const bake = <meshPhysicalMaterial color="#17181a" roughness={0.36} clearcoat={0.55} clearcoatRoughness={0.3} />
  const DW = 0.74, DH = DW * 400 / 640, PY = -DH * 0.52
  return <group position={at} scale={1.2}>
    <RoundedBox args={[0.96, 0.09, 0.72]} radius={0.02} smoothness={3} position={[0, 0.045, 0]} castShadow receiveShadow>{bake}</RoundedBox>
    <RoundedBox args={[0.92, 0.1, 0.24]} radius={0.02} smoothness={3} position={[0, 0.13, 0.22]} castShadow>{bake}</RoundedBox>
    <Post at={[-0.24, 0.18, 0.22]} color="#1c1d20" /><Post at={[0.24, 0.18, 0.22]} color="#c0261d" />
    <group position={[0, 0.08, -0.1]} rotation-x={-0.22}>
      <RoundedBox args={[0.92, 0.7, 0.44]} radius={0.035} smoothness={4} position={[0, 0.35, 0]} castShadow>{bake}</RoundedBox>
      <group position={[0, 0.38, 0.221]}>
        <mesh><planeGeometry args={[DW, DH]} /><meshStandardMaterial map={tex} color="#8f8c84" roughness={0.9} envMapIntensity={0.2} /></mesh>
        <group ref={needle} position={[0, PY, 0.008]}>
          <mesh position={[0, DH * 0.46, 0]}><boxGeometry args={[0.007, DH * 0.92, 0.002]} /><meshBasicMaterial color="#b0201a" /></mesh>
        </group>
        <mesh position={[0, -DH / 2 + 0.03, 0.012]}><boxGeometry args={[DW + 0.04, 0.09, 0.012]} />{bake}</mesh>
        {/* 表框和玻璃 */}
        {[-1, 1].map(sx => <mesh key={sx} position={[sx * (DW / 2 + 0.014), 0, 0.006]}><boxGeometry args={[0.028, DH + 0.056, 0.02]} />{bake}</mesh>)}
        <mesh position={[0, DH / 2 + 0.014, 0.006]}><boxGeometry args={[DW + 0.056, 0.028, 0.02]} />{bake}</mesh>
        <mesh position-z={0.018} renderOrder={4}><planeGeometry args={[DW, DH]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.05} roughness={0.08} envMapIntensity={0.6} depthWrite={false} /></mesh>
      </group>
    </group>
  </group>
}

// ---------- 导线 ----------
/** 一根导线：从 a 到 b，中间垂到台面上 */
export function Wire({ a, b, color, bend = 0 }: { a: V3; b: V3; color: string; bend?: number }) {
  const geo = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), y = TOP + 0.016, d = B.clone().sub(A).setY(0), n = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(bend)
    const p1 = A.clone().addScaledVector(d, 0.14).add(n.clone().multiplyScalar(0.6)).setY(y), p2 = A.clone().addScaledVector(d, 0.5).add(n).setY(y), p3 = A.clone().addScaledVector(d, 0.86).add(n.clone().multiplyScalar(0.6)).setY(y)
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([A.clone().setY(A.y + 0.03), A.clone().add(new THREE.Vector3(0, 0.08, 0)).addScaledVector(d, 0.03), p1, p2, p3, B.clone().add(new THREE.Vector3(0, 0.08, 0)).addScaledVector(d, -0.03), B.clone().setY(B.y + 0.03)], false, 'catmullrom', 0.4), 64, 0.014, 8)
  }, [a[0], a[1], a[2], b[0], b[1], b[2], bend])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} castShadow><meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.3} /></mesh>
}

// ---------- 光电管 ----------
const BULB = lathe([[0.21, 0.16], [0.21, 0.24], [0.36, 0.4], [0.41, 0.58], [0.41, 0.98], [0.35, 1.16], [0.2, 1.29], [0.06, 1.33], [0, 1.335]], { segs: 56, crease: 60 })
const SOCKET = lathe([[0, 0], [0.31, 0], [0.33, 0.015], [0.33, 0.1], [0.3, 0.12], [0.25, 0.13], [0.23, 0.17], [0, 0.17]], { segs: 48 })
const STEM = lathe([[0, 0.17], [0.13, 0.17], [0.13, 0.2], [0.05, 0.3], [0.03, 0.36], [0, 0.36]], { segs: 24 })
const N_E = 26
/** 光电管：玻璃泡里一片弧形的阴极 K（涂着钾），正中一根阳极 A。light：照进来的光的颜色；emit：有没有电子飞出来（0–1 的多少）；stop：反向电压和遏止电压之比（0 是加正向电压，电子全部到达阳极；到 1 时电子刚好到不了） */
export function Tube({ emit, stop, glow }: { emit: number; stop: number; glow: string }) {
  const inst = useRef<THREE.InstancedMesh>(null), t = useRef(0), m = useMemo(() => new THREE.Matrix4(), [])
  // 每个电子：从阴极上哪一点出发、带着多少初动能（占最大初动能的几分之几）、出发的时刻
  const seeds = useMemo(() => { let s = 3; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; return Array.from({ length: N_E }, () => ({ a: (rnd() - 0.5) * 1.5, y: 0.55 + rnd() * 0.42, e: 0.25 + 0.75 * rnd(), ph: rnd() })) }, [])
  useFrame((_, dt) => {
    t.current += Math.min(dt, 1 / 30) * 0.55
    const mesh = inst.current; if (!mesh) return
    const n = Math.round(N_E * Math.min(1, emit))
    seeds.forEach((q, i) => {
      let k = 0
      if (i < n) {
        const u = (t.current * (0.6 + 0.4 * q.e) + q.ph) % 1, reach = stop <= 0 ? 1 : Math.min(1, q.e / stop)      // 能冲到离阴极多远（1 是到阳极）
        const s = reach >= 1 ? u : (u < 0.5 ? reach * (1 - (1 - u * 2) ** 2) : reach * (1 - ((u - 0.5) * 2) ** 2))  // 到不了的：减速、停下、被拉回阴极
        const r = 0.265 * (1 - s) + 0.02 * s
        m.makeScale(1, 1, 1).setPosition(Math.cos(q.a) * r, q.y + (0.76 - q.y) * s * 0.5, Math.sin(q.a) * r * (1 - s * 0.4)); k = 1
      }
      if (!k) m.makeScale(0, 0, 0)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <group position={P.tube}>
    <mesh geometry={SOCKET} castShadow receiveShadow><Plastic color="#1a1512" /></mesh>
    <mesh position-y={0.105}><cylinderGeometry args={[0.332, 0.332, 0.012, 48]} /><Metal kind="brass" grain="turned" env={ENV} /></mesh>
    <mesh geometry={STEM}><meshPhysicalMaterial color="#000000" roughness={0.05} envMapIntensity={2.4} transparent blending={THREE.AdditiveBlending} depthWrite={false} clearcoat={1} /></mesh>
    {/* 阴极 K：一片弧形的金属片，朝着光的那一面涂着钾，被光照亮 */}
    <mesh position-y={0.76}><cylinderGeometry args={[0.28, 0.28, 0.56, 40, 1, true, Math.PI / 2 - 1.05, 2.1]} /><meshStandardMaterial color="#8a8f96" metalness={0.9} roughness={0.38} side={THREE.DoubleSide} envMapIntensity={ENV} emissive={glow} emissiveIntensity={0.07} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[0.2, 0.33, s * 0.19]} rotation-z={0.08}><cylinderGeometry args={[0.008, 0.008, 0.32, 8]} /><Metal kind="steel" env={ENV} /></mesh>)}
    {/* 阳极 A：正中一根细金属杆，顶上弯成一个小环 */}
    <mesh position-y={0.62}><cylinderGeometry args={[0.011, 0.011, 0.72, 10]} /><Metal kind="stainless" env={ENV} /></mesh>
    <mesh position-y={1.02}><torusGeometry args={[0.045, 0.009, 8, 24]} /><Metal kind="stainless" env={ENV} /></mesh>
    <instancedMesh ref={inst} args={[undefined, undefined, N_E]} frustumCulled={false}><sphereGeometry args={[0.03, 14, 10]} /><meshBasicMaterial color="#eafcff" toneMapped={false} /></instancedMesh>
    {/* 玻璃泡 */}
    <mesh geometry={BULB} renderOrder={7}><meshPhysicalMaterial color="#000000" roughness={0.02} metalness={0} envMapIntensity={2.4} transparent blending={THREE.AdditiveBlending} depthWrite={false} clearcoat={1} clearcoatRoughness={0.02} /></mesh>
    <Post at={[-0.16, 0.115, 0.26]} color="#1c1d20" /><Post at={[0.16, 0.115, 0.26]} color="#c0261d" />
  </group>
}

// ---------- 光源 ----------
const BASE = lathe([[0, 0], [0.26, 0], [0.28, 0.012], [0.28, 0.035], [0.25, 0.05], [0.05, 0.062], [0.04, 0.09], [0, 0.09]], { segs: 40 })
const BARREL = lathe([[0.1, 0], [0.13, 0], [0.135, 0.005], [0.135, 0.3], [0.15, 0.31], [0.15, 0.36], [0.115, 0.36], [0.115, 0.33], [0.1, 0.33]], { segs: 40, closed: true })
/** 光源：一只方的灯箱，前面一段出光筒，里面可以换不同颜色的发光管；顶上一只调光旋钮。level：光强是弱光的几倍 */
export function Source({ color, level }: { color: string; level: number }) {
  const [x, , z] = P.src, y = P.beamY, knob = useRef<THREE.Mesh>(null), lens = useRef<THREE.MeshBasicMaterial>(null), goal = useMemo(() => new THREE.Color(color), [color])
  useFrame((_, dt) => { if (knob.current) knob.current.rotation.y += (-(level - 1) * 1.6 - knob.current.rotation.y) * Math.min(1, dt * 8); lens.current?.color.lerp(goal, Math.min(1, dt * 6)) })
  return <group>
    <group position={[x, y, z]}>
      <RoundedBox args={[0.62, 0.5, 0.46]} radius={0.03} smoothness={3} castShadow><meshStandardMaterial color="#2b3036" metalness={0.55} roughness={0.5} envMapIntensity={ENV} /></RoundedBox>
      {[-0.18, -0.09, 0, 0.09, 0.18].map(k => <mesh key={k} position={[k - 0.02, 0.252, 0]}><boxGeometry args={[0.03, 0.006, 0.3]} /><meshBasicMaterial color="#050607" /></mesh>)}
      <group position={[0.3, 0, 0]} rotation-z={-Math.PI / 2}>
        <mesh geometry={BARREL} castShadow><Anod /></mesh>
        <mesh position-y={0.32} rotation-x={-Math.PI / 2}><circleGeometry args={[0.1, 28]} /><meshBasicMaterial ref={lens} color={color} toneMapped={false} /></mesh>
      </group>
      <mesh ref={knob} geometry={KNOB} position={[-0.2, 0.25, 0.12]} scale={1.5}><Plastic /></mesh>
      <mesh position={[-0.2, 0.2505, 0.12]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.05, 0.058, 24, 1, 0.6, 4.2]} /><meshBasicMaterial color="#c9ccd0" /></mesh>
      <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[0.03, 0.03, 0.1, 16]} /><Metal kind="stainless" env={ENV} /></mesh>
    </group>
    <mesh position={[x, (TOP + 0.09 + y - 0.34) / 2, z]} castShadow><cylinderGeometry args={[0.022, 0.022, y - 0.34 - TOP - 0.09, 16]} /><Metal kind="chrome" rough={0.14} env={ENV} /></mesh>
    <mesh geometry={BASE} position={[x, TOP, z]} castShadow receiveShadow><Metal kind="iron" grain="cast" env={3} /></mesh>
  </group>
}

// ---------- 直流电源 ----------
const DIAL = disc(0.07, 0.05, { chamfer: 0.008 })
let faceTex: THREE.CanvasTexture | null = null
/** 电源面板上印的字：名称、旋钮一圈的刻度、开关两边的“正向”“反向” */
function getFace() {
  if (faceTex) return faceTex
  const c = document.createElement('canvas'); c.width = 940; c.height = 300
  const g = c.getContext('2d')!
  g.fillStyle = '#e4e1d6'; g.fillRect(0, 0, 940, 300); g.strokeStyle = '#2a2d31'; g.lineWidth = 3; g.strokeRect(14, 14, 912, 272)
  g.fillStyle = '#2a2d31'; g.textAlign = 'center'; g.font = '600 30px sans-serif'; g.fillText('直流电源', 750, 64)
  g.font = '500 22px sans-serif'; g.fillText('电压调节', 220, 268); g.fillText('正向', 492, 130); g.fillText('反向', 608, 130); g.fillText('电源', 830, 268)
  for (let i = 0; i <= 10; i++) { const a = (-120 + i * 24) * Math.PI / 180; g.lineWidth = i % 5 === 0 ? 5 : 2.5; g.beginPath(); g.moveTo(220 + Math.sin(a) * 86, 150 - Math.cos(a) * 86); g.lineTo(220 + Math.sin(a) * 102, 150 - Math.cos(a) * 102); g.stroke() }
  faceTex = new THREE.CanvasTexture(c); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8
  return faceTex
}
/** 直流电源：一只矮的铁壳箱，面板上一只调压旋钮、一只换向的扳动开关、两只输出接线柱。turn：旋钮拧到几分之几；reverse：是不是反接 */
export function Supply({ turn, reverse }: { turn: number; reverse: boolean }) {
  const knob = useRef<THREE.Group>(null), lever = useRef<THREE.Mesh>(null), face = useMemo(getFace, [])
  useFrame((_, dt) => { if (knob.current) knob.current.rotation.z += (-turn * 4.2 - knob.current.rotation.z) * Math.min(1, dt * 10); if (lever.current) lever.current.rotation.z += ((reverse ? -0.45 : 0.45) - lever.current.rotation.z) * Math.min(1, dt * 10) })
  return <group position={P.supply}>
    <RoundedBox args={[1.0, 0.36, 0.6]} radius={0.025} smoothness={3} position={[0, 0.2, 0]} castShadow receiveShadow><meshStandardMaterial color="#3a424a" metalness={0.5} roughness={0.55} envMapIntensity={ENV} /></RoundedBox>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 0.42, 0.01, sz * 0.24]}><cylinderGeometry args={[0.04, 0.045, 0.02, 16]} /><Plastic /></mesh>))}
    {/* 朝前的面板 */}
    <mesh position={[0, 0.2, 0.301]}><planeGeometry args={[0.94, 0.3]} /><meshStandardMaterial map={face} color="#b9b6ac" roughness={0.7} /></mesh>
    <group ref={knob} position={[-0.25, 0.2, 0.302]}>
      <mesh geometry={DIAL} rotation-x={Math.PI / 2}><Plastic /></mesh>
      <mesh position={[0, 0.045, 0.051]}><boxGeometry args={[0.012, 0.04, 0.004]} /><meshBasicMaterial color="#f2f2f2" /></mesh>
    </group>
    <mesh position={[0.08, 0.2, 0.31]}><cylinderGeometry args={[0.028, 0.028, 0.02, 6]} /><Metal kind="steel" env={ENV} /></mesh>
    <mesh ref={lever} position={[0.08, 0.2, 0.345]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.012, 0.009, 0.08, 10]} /><Metal kind="chrome" env={ENV} /></mesh>
    <mesh position={[0.36, 0.29, 0.303]}><circleGeometry args={[0.014, 12]} /><meshBasicMaterial color="#7dffb0" toneMapped={false} /></mesh>
    <Post at={[-0.2, 0.38, -0.12]} color="#1c1d20" /><Post at={[0.2, 0.38, -0.12]} color="#c0261d" />
  </group>
}

const at = (p: V3, dx: number, dy: number, dz: number): V3 => [p[0] + dx, p[1] + dy, p[2] + dz]
/** 整套装置。hex：光的颜色；level：光强；emit：飞出电子的多少（0–1）；stop：反向电压和遏止电压之比；amp、volt：两只表的指针偏到几分之几；reverse：电源是不是反接 */
export function PhotoRig({ hex, level, emit, stop, amp, volt, reverse }: { hex: string; level: number; emit: number; stop: number; amp: number; volt: number; reverse: boolean }) {
  const K = at(P.tube, -0.16, 0.2, 0.26), A = at(P.tube, 0.16, 0.2, 0.26)
  const a0 = at(P.amp, -0.29, 0.32, 0.26), a1 = at(P.amp, 0.29, 0.32, 0.26), v0 = at(P.volt, -0.29, 0.32, 0.26), v1 = at(P.volt, 0.29, 0.32, 0.26)
  const s0 = at(P.supply, -0.2, 0.47, -0.12), s1 = at(P.supply, 0.2, 0.47, -0.12)
  return <>
    <Source color={hex} level={level} />
    <Shaft a={[P.src[0] + 0.66, P.beamY, P.src[2]]} b={[P.tube[0] + 0.24, P.beamY, P.tube[2]]} r={0.1} color={hex} k={0.5 + level * 0.5} />
    <Shaft a={[P.src[0] + 0.66, P.beamY, P.src[2]]} b={[P.tube[0] + 0.24, P.beamY, P.tube[2]]} r={0.045} color={hex} k={level * 0.8} />
    <pointLight position={[P.tube[0] - 0.1, P.beamY, P.tube[2] + 0.3]} intensity={0.5 * level} distance={2.4} decay={1.6} color={hex} />
    <Tube emit={emit} stop={stop} glow={hex} />
    <Meter at={P.amp} unit="μA" max={30} major={10} minor={2} k={amp} />
    <Meter at={P.volt} unit="V" max={1.5} major={0.5} minor={0.1} digits={1} k={volt} />
    <Supply turn={volt} reverse={reverse} />
    <Wire a={K} b={a0} color="#16181b" bend={-0.25} />
    <Wire a={a1} b={s0} color="#16181b" bend={0.12} />
    <Wire a={s1} b={A} color="#b3241c" bend={-0.3} />
    <Wire a={s0} b={v0} color="#16181b" bend={-0.1} />
    <Wire a={s1} b={v1} color="#b3241c" bend={0.14} />
    {/* 光照到阴极上的亮斑 */}
    <mesh position={[P.tube[0] + 0.262, P.beamY, P.tube[2]]} rotation-y={-Math.PI / 2}><circleGeometry args={[0.1, 24]} /><Glow color={hex} opacity={0.3 + 0.2 * level} /></mesh>
  </>
}
