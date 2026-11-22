// 托盘天平和砝码盒。天平照学校里的架盘天平来建：漆面的铸铁底座、立柱和刀口、会倾斜的横梁、指针和分度盘、
// 横梁正面的标尺和游码、两端的平衡螺母、托盘架和两只托盘。横梁的倾斜按时间算：受力不平衡就倒向一边，摆几下慢慢停住。
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, bolts, disc, lathe, shell, useSlide } from '@/lab-kit'
import { Carry, useLag, useLanded, type Live, type V3 } from './parts'
import { CAPACITY, RIDER, WEIGHTS, reading, tilt, weigh } from './physics'

/** 横梁半长、刀口的高度、托盘内底比横梁端点高多少、横梁最多歪多少（弧度） */
export const ARM = 0.84, PIVOT = 0.77, PAN_UP = 0.212, MAXT = 0.085
/** 托盘内底的位置（天平摆在 base 处、横梁水平时）。side：−1 左盘，1 右盘 */
export const panAt = (base: V3, side: -1 | 1): V3 => [base[0] + side * ARM, base[1] + PIVOT + PAN_UP, base[2]]
/** 标尺上 1 g 有多长；零刻度线在横梁中心左边多远 */
const GRAM = 0.2, ZERO = -0.5

function roundRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}
const G = (() => {
  // 底座：一块圆角的铸件，上下都有倒角
  const base = new THREE.ExtrudeGeometry(roundRect(1.96, 0.7, 0.16), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.016, bevelSegments: 3, curveSegments: 10 }); base.rotateX(-Math.PI / 2); base.translate(0, 0.036, 0)
  // 横梁：中间高、两头矮的一根扁梁，两边各掏一个减重孔
  const s = new THREE.Shape(); s.moveTo(-0.9, -0.03); s.lineTo(-0.9, 0.03); s.lineTo(-0.2, 0.06); s.lineTo(0.2, 0.06); s.lineTo(0.9, 0.03); s.lineTo(0.9, -0.03); s.lineTo(0.2, -0.06); s.lineTo(-0.2, -0.06); s.closePath()
  for (const k of [-1, 1]) { const h = new THREE.Path(); h.moveTo(k * 0.3, -0.027); h.lineTo(k * 0.7, -0.012); h.lineTo(k * 0.7, 0.012); h.lineTo(k * 0.3, 0.027); h.closePath(); s.holes.push(h) }
  const beam = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 }); beam.translate(0, 0, -0.02)
  return {
    base, beam,
    column: lathe([[0, 0], [0.1, 0], [0.105, 0.008], [0.105, 0.03], [0.07, 0.05], [0.055, 0.09], [0.045, 0.42], [0.05, 0.44], [0.05, 0.47], [0, 0.47]], { segs: 32 }),
    flange: bolts(4, 0.086, 0.022),
    hub: disc(0.058, 0.02, { chamfer: 0.004 }),
    nut: lathe([[0.011, 0], [0.044, 0], [0.05, 0.006], [0.05, 0.03], [0.044, 0.036], [0.011, 0.036]], { segs: 24, closed: true }),
    pan: shell([[0, 0], [0.25, 0], [0.29, 0.012], [0.306, 0.04], [0.316, 0.044]], 0.008, { segs: 56 }),
    boss: lathe([[0, 0], [0.04, 0], [0.04, 0.008], [0.022, 0.016], [0, 0.016]], { segs: 20 }),
    sleeve: shell([[0.034, 0], [0.034, 0.09], [0.028, 0.1]], 0.012, { segs: 20 }),
    foot: disc(0.055, 0.02, { chamfer: 0.005 }),
  }
})()

/** 标尺：0 到 5 g，每 0.2 g 一道刻线 */
function makeScale() {
  const W = 1160, H = 75, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#c4c1b0'; g.fillRect(0, 0, W, H); g.fillStyle = '#1b2026'; g.textAlign = 'center'; g.font = '700 30px sans-serif'
  const n = Math.round(RIDER.max / RIDER.step)
  for (let i = 0; i <= n; i++) {
    const x = 80 + i * 1000 / n, big = i % 5 === 0
    g.fillRect(x - (big ? 2.5 : 1.5), 0, big ? 5 : 3, big ? 34 : 20)
    if (big) g.fillText(String(Math.round(i * RIDER.step)), x, 66)
  }
  g.font = '600 26px sans-serif'; g.fillText('g', 1125, 66)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/** 分度盘：一排朝刀口聚拢的刻线，正中一道最长 */
function makeDial() {
  const W = 360, H = 180, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#bdb9a6'; g.fillRect(0, 0, W, H)
  for (let k = -10; k <= 10; k++) {
    const a = k * 0.024, r0 = 520, r1 = k === 0 ? 630 : k % 5 === 0 ? 600 : 575, cx = W / 2, cy = 90 + 560
    g.strokeStyle = k === 0 ? '#c0392b' : '#1b2026'; g.lineWidth = k === 0 ? 8 : 5
    g.beginPath(); g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); g.lineTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1); g.stroke()
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/** 铭牌 */
function makePlate() {
  const c = document.createElement('canvas'); c.width = 460; c.height = 90
  const g = c.getContext('2d')!
  g.fillStyle = '#c9ccc8'; g.fillRect(0, 0, 460, 90); g.strokeStyle = '#3a4046'; g.lineWidth = 3; g.strokeRect(5, 5, 450, 80)
  g.fillStyle = '#23282d'; g.textAlign = 'center'; g.font = '700 30px sans-serif'; g.fillText('托盘天平', 230, 40); g.font = '500 22px sans-serif'; g.fillText(`称量 ${CAPACITY} g　标尺分度值 ${RIDER.step} g`, 230, 72)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

const Enamel = () => <meshPhysicalMaterial color="#4f7385" roughness={0.36} metalness={0.1} clearcoat={0.7} clearcoatRoughness={0.22} envMapIntensity={1.2} />
const Dark = () => <meshStandardMaterial color="#22272b" metalness={0.8} roughness={0.36} envMapIntensity={1.5} />

/**
 * 托盘天平，底座中心在 at（坐在台面上）。left、right：左右两边各有多少克（砝码、游码、没调好的偏差都由课里折算进来）；
 * rider：游码在标尺上的示数；nut：平衡螺母拧到哪（−1 最左，1 最右）；leftPan、rightPan：放在两只盘里的东西（原点在盘的内底）；
 * live：把托盘此刻的高低写出去；kick：变一次就碰它一下，让它摆几下。
 */
export function Balance({ at, left, right, rider, nut = 0, live, leftPan = null, rightPan = null, kick = 0 }: { at: V3; left: number; right: number; rider: number; nut?: number; live?: RefObject<Live>; leftPan?: ReactNode; rightPan?: ReactNode; kick?: number }) {
  const beam = useRef<THREE.Group>(null), pl = useRef<THREE.Group>(null), pr = useRef<THREE.Group>(null)
  const goal = tilt(left, right) * MAXT
  const st = useRef({ th: goal, w: 0 })
  const tex = useMemo(() => ({ scale: makeScale(), dial: makeDial(), plate: makePlate() }), [])
  useEffect(() => { if (kick) st.current.w += 0.42 }, [kick])
  useFrame((_, d) => {
    const s = st.current, dt = Math.min(d, 1 / 30), W0 = 6.2, stop = Math.abs(goal) > MAXT - 1e-6
    s.w += (-W0 * W0 * (s.th - goal) - 2 * (stop ? 0.5 : 0.2) * W0 * s.w) * dt; s.th += s.w * dt
    if (Math.abs(s.th) > MAXT) { s.th = Math.sign(s.th) * MAXT; s.w *= -0.2 }      // 碰到限位就弹回一点
    const y = Math.sin(s.th) * ARM
    if (beam.current) beam.current.rotation.z = s.th
    if (pl.current) pl.current.position.y = PIVOT - y
    if (pr.current) pr.current.position.y = PIVOT + y
    if (live?.current) { live.current.th = s.th; live.current.yL = -y; live.current.yR = y }
  })
  const xr = ZERO + Math.max(0, Math.min(RIDER.max, rider)) * GRAM
  return (
    <group position={at}>
      {/* 底座：四只橡胶脚、漆面的铸件、中间一块安装板、正面的铭牌 */}
      {[-0.8, 0.8].flatMap(x => [-0.24, 0.24].map(z => <mesh key={`${x}${z}`} geometry={G.foot} position={[x, 0, z]}><meshStandardMaterial color="#121416" roughness={0.9} /></mesh>))}
      <mesh geometry={G.base} castShadow receiveShadow><Enamel /></mesh>
      <RoundedBox args={[0.5, 0.03, 0.4]} radius={0.008} smoothness={2} position={[0, 0.167, 0]} castShadow><Dark /></RoundedBox>
      <mesh position={[0, 0.086, 0.3665]}><planeGeometry args={[0.46, 0.09]} /><meshStandardMaterial map={tex.plate} metalness={0.6} roughness={0.5} /></mesh>
      {[-0.205, 0.205].map(x => <mesh key={x} position={[x, 0.086, 0.368]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.008, 0.008, 0.006, 10]} /><Metal kind="brass" /></mesh>)}
      {/* 立柱：法兰上四颗螺栓，顶上一只叉形的座，托着刀口 */}
      <mesh geometry={G.column} position-y={0.182} castShadow><Enamel /></mesh>
      <mesh geometry={G.flange} position-y={0.212}><Metal kind="steel" env={1.5} /></mesh>
      <RoundedBox args={[0.15, 0.05, 0.16]} radius={0.01} smoothness={2} position={[0, 0.675, 0]} castShadow><Enamel /></RoundedBox>
      {[-1, 1].map(s => <RoundedBox key={s} args={[0.12, 0.13, 0.022]} radius={0.006} smoothness={2} position={[0, 0.745, s * 0.058]} castShadow><Enamel /></RoundedBox>)}
      {/* 分度盘：立在后面的一根扁杆上 */}
      <mesh position={[0, 1.08, -0.075]} castShadow><boxGeometry args={[0.05, 0.64, 0.012]} /><Dark /></mesh>
      <RoundedBox args={[0.38, 0.19, 0.012]} radius={0.005} smoothness={2} position={[0, 1.345, -0.063]} castShadow><Dark /></RoundedBox>
      <mesh position={[0, 1.345, -0.0565]}><planeGeometry args={[0.36, 0.17]} /><meshStandardMaterial map={tex.dial} color="#c9c6ba" roughness={0.7} /></mesh>
      {/* 两只导向套：托盘架的导杆从这里穿下去 */}
      {[-1, 1].map(s => <mesh key={s} geometry={G.sleeve} position={[s * ARM, 0.152, 0]} castShadow><Metal kind="brass" grain="turned" env={1.6} /></mesh>)}

      {/* 横梁：绕刀口转。指针、标尺、游码、平衡螺母都固定在它上面 */}
      <group ref={beam} position={[0, PIVOT, 0]}>
        <mesh geometry={G.beam} castShadow><Metal kind="aluminum" grain="cast" rough={0.42} env={1.6} /></mesh>
        <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.014, 0.014, 0.17, 12]} /><Metal kind="steel" env={2} /></mesh>
        <mesh geometry={G.hub} position={[0, 0, 0.025]} rotation-x={Math.PI / 2}><Metal kind="steel" grain="turned" env={1.6} /></mesh>
        {/* 指针：细长的一片，尖上一点红 */}
        <mesh position={[0, 0.31, -0.04]} scale={[1, 1, 0.4]}><cylinderGeometry args={[0.003, 0.011, 0.5, 6]} /><Dark /></mesh>
        <mesh position={[0, 0.575, -0.04]} scale={[1, 1, 0.4]}><coneGeometry args={[0.006, 0.05, 6]} /><meshBasicMaterial color="#d2362f" toneMapped={false} /></mesh>
        {/* 标尺和游码 */}
        <mesh position={[0, -0.125, 0.034]} castShadow><boxGeometry args={[1.16, 0.075, 0.014]} /><Metal kind="steel" rough={0.4} /></mesh>
        <mesh position={[0, -0.125, 0.0415]}><planeGeometry args={[1.16, 0.075]} /><meshStandardMaterial map={tex.scale} color="#d2cfc4" roughness={0.6} /></mesh>
        {[-0.56, 0.56].map(x => <mesh key={x} position={[x, -0.075, 0.03]}><boxGeometry args={[0.05, 0.075, 0.03]} /><Dark /></mesh>)}
        <group position={[xr, 0, 0]}>
          <mesh position={[0.017, -0.125, 0.052]} castShadow><boxGeometry args={[0.034, 0.105, 0.02]} /><Metal kind="brass" grain="brushed" env={1.6} /></mesh>
          <mesh position={[0.017, -0.079, 0.036]}><boxGeometry args={[0.034, 0.018, 0.05]} /><Metal kind="brass" env={1.6} /></mesh>
          <mesh position={[0.002, -0.125, 0.0625]}><planeGeometry args={[0.005, 0.105]} /><meshBasicMaterial color="#d2362f" toneMapped={false} /></mesh>
        </group>
        {/* 两端的螺杆和平衡螺母 */}
        {[-1, 1].map(s => <group key={s}>
          <mesh position={[s * 1.01, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.011, 0.011, 0.24, 10]} /><Metal kind="steel" grain="turned" repeat={[1, 14]} env={1.6} /></mesh>
          <mesh geometry={G.nut} position={[s * 0.985 + nut * 0.07 + 0.018, 0, 0]} rotation-z={Math.PI / 2} castShadow><Metal kind="brass" grain="turned" env={1.8} /></mesh>
        </group>)}
      </group>

      {/* 两只托盘：托盘架始终竖直，跟着横梁的端点上下 */}
      {([[-1, pl, leftPan], [1, pr, rightPan]] as const).map(([s, ref, content]) => (
        <group key={s} ref={ref} position={[s * ARM, PIVOT, 0]}>
          <RoundedBox args={[0.07, 0.075, 0.09]} radius={0.01} smoothness={2} castShadow><Dark /></RoundedBox>
          <mesh position={[0, 0.115, 0]}><cylinderGeometry args={[0.014, 0.014, 0.16, 12]} /><Metal kind="chrome" rough={0.15} env={1.5} /></mesh>
          <mesh position={[0, -0.33, 0]}><cylinderGeometry args={[0.011, 0.011, 0.6, 10]} /><Metal kind="chrome" rough={0.15} env={1.5} /></mesh>
          {[Math.PI / 4, -Math.PI / 4].map(r => <RoundedBox key={r} args={[0.5, 0.012, 0.04]} radius={0.004} smoothness={2} position={[0, 0.198, 0]} rotation-y={r}><Metal kind="steel" grain="brushed" env={1.5} /></RoundedBox>)}
          <mesh geometry={G.boss} position={[0, 0.18, 0]} rotation-x={Math.PI}><Metal kind="steel" env={1.5} /></mesh>
          <mesh geometry={G.pan} position={[0, 0.204, 0]} castShadow receiveShadow><Metal kind="stainless" grain="turned" rough={0.3} repeat={[1, 3]} env={1.4} /></mesh>
          <group position={[0, PAN_UP, 0]}>{content}</group>
        </group>
      ))}
    </group>
  )
}

// ---------- 砝码和砝码盒 ----------
/** 每只砝码：黄铜车出来的圆柱，上面一个提钮。大小按质量的立方根缩放 */
const BRASS = WEIGHTS.map(m => {
  const k = Math.cbrt(m / 100), R = 0.085 * k, H = 0.17 * k, c = R * 0.1
  return { R, top: H + 1.08 * R, geo: lathe([[0, 0], [R - c, 0], [R, c], [R, H - c], [R - c, H], [R * 0.4, H], [R * 0.32, H + R * 0.2], [R * 0.32, H + R * 0.5], [R * 0.55, H + R * 0.62], [R * 0.6, H + R * 0.8], [R * 0.55, H + R * 0.98], [R * 0.3, H + R * 1.08], [0, H + R * 1.08]], { segs: 32 }) }
})
/** 砝码在盒里和在右盘里各放在哪（相对盒子中心、相对盘心） */
const IN_BOX: [number, number][] = [[-0.3, -0.05], [-0.115, -0.05], [0.03, -0.05], [0.15, -0.05], [0.26, -0.05], [0.35, -0.05]]
const ON_PAN: [number, number][] = [[-0.1, -0.07], [0.1, -0.08], [-0.13, 0.1], [0, 0.14], [0.14, 0.08], [0.02, 0.02]]
const FELT = 0.07
const TONG = (() => { const g = new THREE.BoxGeometry(0.46, 0.008, 0.026); g.translate(0.23, 0, 0); return g })()
/** 镊子：两片不锈钢片，一头并在一起，另一头张开一点。尖朝 −x，原点在尖上 */
function Tweezers({ open = 0.05 }: { open?: number }) {
  return <group>{[-1, 1].map(s => <mesh key={s} geometry={TONG} rotation-z={s * open} castShadow><Metal kind="stainless" grain="brushed" env={1.6} /></mesh>)}<mesh position={[0.45, 0, 0]}><boxGeometry args={[0.03, 0.05, 0.028]} /><Metal kind="stainless" env={1.6} /></mesh></group>
}
function makeWood() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64
  const g = c.getContext('2d')!; let s = 3; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  g.fillStyle = '#9b6a3c'; g.fillRect(0, 0, 256, 64)
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '70,40,18' : '190,140,90'},${0.08 + rnd() * 0.16})`; g.fillRect(0, rnd() * 64, 256, 0.6 + rnd() * 2) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/**
 * 砝码盒和一套砝码。box：盒子中心在台面上的位置；base：天平的位置；on：现在放在右盘里的砝码（序号）；
 * 砝码用镊子夹着在盒子和右盘之间来回；snap 变了就直接摆好，不走过程。
 */
export function WeightSet({ box, base, on, live, snap }: { box: V3; base: V3; on: readonly number[]; live: RefObject<Live>; snap?: string | number }) {
  const wood = useMemo(() => new THREE.MeshPhysicalMaterial({ map: makeWood(), roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.3 }), [])
  const moving = useRef<boolean[]>(WEIGHTS.map(() => false)), rest = useRef<THREE.Group>(null)
  const pan = panAt(base, 1)
  useFrame(() => { if (rest.current) rest.current.visible = !moving.current.some(Boolean) })
  const collars = useMemo(() => BRASS.map(b => disc(b.R + 0.014, 0.012, { hole: b.R + 0.003, chamfer: 0.003 })), [])
  return <>
    <group position={box}>
      {/* 盒子：木头的底盒，里面一块绒垫，每只砝码一个座；盒盖掀开立在后面 */}
      <RoundedBox args={[0.94, 0.022, 0.48]} radius={0.008} smoothness={2} position={[0, 0.011, 0]} castShadow receiveShadow material={wood} />
      {[-1, 1].map(s => <RoundedBox key={s} args={[0.94, 0.1, 0.03]} radius={0.008} smoothness={2} position={[0, 0.05, s * 0.225]} castShadow material={wood} />)}
      {[-1, 1].map(s => <RoundedBox key={s} args={[0.03, 0.1, 0.44]} radius={0.008} smoothness={2} position={[s * 0.455, 0.05, 0]} castShadow material={wood} />)}
      <mesh position={[0, 0.045, 0]} receiveShadow><boxGeometry args={[0.89, 0.05, 0.43]} /><meshStandardMaterial color="#1d4633" roughness={1} /></mesh>
      {BRASS.map((_, i) => <mesh key={i} geometry={collars[i]} position={[IN_BOX[i][0], FELT, IN_BOX[i][1]]}><meshStandardMaterial color="#17362a" roughness={1} /></mesh>)}
      <group position={[0, 0.1, -0.24]} rotation-x={-1.86}>
        <RoundedBox args={[0.94, 0.06, 0.48]} radius={0.01} smoothness={2} position={[0, 0.03, 0.24]} castShadow material={wood} />
        <mesh position={[0, -0.001, 0.24]} rotation-x={Math.PI / 2}><planeGeometry args={[0.86, 0.4]} /><meshStandardMaterial color="#1d4633" roughness={1} /></mesh>
      </group>
      {[-0.3, 0.3].map(x => <mesh key={x} position={[x, 0.1, -0.243]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.09, 10]} /><Metal kind="brass" env={1.6} /></mesh>)}
      <mesh position={[0, 0.06, 0.243]}><boxGeometry args={[0.07, 0.04, 0.012]} /><Metal kind="brass" env={1.6} /></mesh>
      {/* 镊子平时放在盒子前面那一格 */}
      <group ref={rest} position={[-0.26, FELT + 0.012, 0.12]}><Tweezers open={0.03} /></group>
    </group>
    {BRASS.map((b, i) => {
      const up = on.includes(i), at: V3 = up ? [pan[0] + ON_PAN[i][0], pan[1], pan[2] + ON_PAN[i][1]] : [box[0] + IN_BOX[i][0], box[1] + FELT, box[2] + IN_BOX[i][1]]
      return <Carry key={i} at={at} ride={up ? 'R' : null} live={live} lift={0.36} speed={2.3} snap={snap} flag={m => { moving.current[i] = m }}
        extra={<group position={[b.R * 0.3, b.top - b.R * 0.6, 0]} rotation={[0, -0.5, 0.5]}><Tweezers open={0.035} /></group>}>
        <mesh geometry={b.geo} castShadow><Metal kind="brass" grain="turned" rough={0.3} repeat={[1, 4]} env={1.7} /></mesh>
      </Carry>
    })}
  </>
}

const NONE: readonly number[] = []
/**
 * 称一样东西的全过程：m 是现在要放到左盘里的东西的质量（没有就是 null）。东西落到盘里以后，砝码才一只只夹过来，游码跟着移到位。
 * 返回值直接交给 Balance 和 WeightSet：left、right 是两边此刻实际有多少克，on 是该放在右盘里的砝码，rider 是游码此刻的示数。
 */
export function useWeigh(m: number | null, fly = 1300) {
  const got = useLag(m, fly), w = got != null ? weigh(got) : null
  const on = w ? w.on : NONE, landed = useLanded(on), rider = useSlide(w ? w.rider : 0, 2.6)
  return { left: m === got && got != null ? got : 0, right: reading(landed, rider), on, rider, sum: w ? w.sum : 0 }
}
