// 工地上的几件工具：撬棍、石块、垫块、手推车和车里的砖、铁锹和锹上的沙、托盘天平、混凝土试块。
// 这些都按米写尺寸，乘 M 变成画面单位；每件工具的原点写在它的说明里（多半是它绕着转的那一点：支点）。
import { useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { makeConcrete, makeSand, makeWood, rng } from './mats'
import { M } from './world'

const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
const once = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()) }
const paint = (color: string, rough = 0.4) => <meshPhysicalMaterial color={color} roughness={rough} clearcoat={0.5} clearcoatRoughness={0.3} />
const rubber = <meshStandardMaterial color="#1b1d20" roughness={0.88} />
const tex = once(() => ({ wood: makeWood('#a8794a', '90,58,30', 15, 2), conc: makeConcrete(13), sand: makeSand() }))

// ---------- 撬棍、石块、垫块 ----------
/** 撬棍的半径（m） */
export const BAR_R = 0.0125
/**
 * 撬棍：一根 1.2 m 的六角钢，撬的那一头锻成扁扁的、微微上翘的铲尖，手压的那一头套着一截橡胶。
 * 原点在支点，沿 +x 是手柄那一头；toTip、toHand 是支点到两头的长度（m）
 */
export function Crowbar({ toTip, toHand }: { toTip: number; toHand: number }) {
  const len = toTip + toHand
  return <group>
    <mesh position={[(toHand - toTip) / 2 * M, 0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[BAR_R * M, BAR_R * M, (len - 0.08) * M, 6]} /><Metal kind="iron" grain="brushed" rough={0.5} /></mesh>
    {/* 铲尖：压扁、收窄 */}
    <mesh position={[(-toTip + 0.035) * M, -0.004 * M, 0]} rotation-z={-0.08} castShadow scale={[1, 0.38, 1]}><boxGeometry args={[0.08 * M, BAR_R * 2 * M, BAR_R * 2.3 * M]} /><Metal kind="iron" grain="brushed" rough={0.45} /></mesh>
    <mesh position={[(-toTip + 0.002) * M, -0.007 * M, 0]} rotation-z={-0.08} castShadow scale={[1, 0.25, 1]}><boxGeometry args={[0.012 * M, BAR_R * 2 * M, BAR_R * 2.6 * M]} /><Metal kind="steel" grain="brushed" /></mesh>
    {/* 手柄上的橡胶套和红漆 */}
    <mesh position={[(toHand - 0.09) * M, 0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[BAR_R * 1.35 * M, BAR_R * 1.35 * M, 0.18 * M, 16]} />{rubber}</mesh>
    <mesh position={[(toHand - 0.3) * M, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[BAR_R * 1.02 * M, BAR_R * 1.02 * M, 0.24 * M, 6]} />{paint('#b3362b', 0.45)}</mesh>
  </group>
}
/** 一块大石头：不规则的多面体，底面压平。原点在它右下角着地的那条棱（撬棍从这里伸进去），石头在 −x 一侧 */
const ROCK = once(() => {
  // 一个细分很密的球，按几层不同频率的起伏往里往外推，再压扁、底面压平：像一块风化过的大石头，而不是多面体
  const g = new THREE.IcosahedronGeometry(1, 5), p = g.attributes.position
  const n = (x: number, y: number, z: number) => Math.sin(x * 2.1 + 1.3) * Math.cos(y * 2.7 - 0.4) * Math.sin(z * 1.9 + 2.2) * 0.13 + Math.sin(x * 5.3 + z * 4.1) * Math.cos(y * 4.7) * 0.05 + Math.sin(x * 11 + y * 9 + z * 13) * 0.015
  for (let i = 0; i < p.count; i++) {
    const x0 = p.getX(i), y0 = p.getY(i), z0 = p.getZ(i), k = 1 + n(x0, y0, z0)
    const x = x0 * k * 0.3, z = z0 * k * 0.26, y = Math.max(y0 * k * 0.23, -0.16 + Math.abs(x0) * 0.01)
    p.setXYZ(i, (x - 0.3) * M, (y + 0.16) * M, z * M)
  }
  g.computeVertexNormals()
  return g
})
export function Rock() {
  const map = useMemo(() => { const t = makeConcrete(29).clone(); t.repeat.set(2, 2); t.needsUpdate = true; return t }, [])
  return <mesh geometry={ROCK()} castShadow receiveShadow><meshStandardMaterial map={map} bumpMap={map} bumpScale={3} color="#a09784" roughness={0.92} /></mesh>
}
/** 垫块：一截方木，顶面有点磨圆。原点在顶面正中 */
export function Chock({ h = 0.1 }: { h?: number }) {
  const map = useMemo(() => { const t = tex().wood.clone(); t.repeat.set(0.6, 0.6); t.needsUpdate = true; return t }, [])
  return <RoundedBox args={[0.1 * M, h * M, 0.16 * M]} radius={0.02 * M} smoothness={3} position={[0, -h / 2 * M, 0]} castShadow receiveShadow><meshStandardMaterial map={map} roughness={0.8} /></RoundedBox>
}

// ---------- 手推车 ----------
/** 手推车的尺寸（m）：轮子半径、车厢底离轮轴多高、车厢的前后、车把的长度、两根车把的间距 */
export const BARROW = { r: 0.2, tray0: 0.12, tray1: 0.78, grip: 1.2, half: 0.27 }
const TRAY = once(() => {
  // 车厢：前面斜、后面陡的一只钢盆。先拉伸出侧面的梯形，再让越往上越宽（两侧外撇），最后包一圈卷边
  const s = new THREE.Shape(); s.moveTo(0.2, 0.06); s.lineTo(0.68, 0.06); s.lineTo(0.84, 0.36); s.lineTo(0.0, 0.38); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3, steps: 2 })
  g.translate(0, 0, -0.2)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + 0.55 * Math.max(0, (y - 0.06) / 0.32); p.setZ(i, p.getZ(i) * k) }
  g.computeVertexNormals(); g.scale(M, M, M)
  return g
})
const RIMLIP = once(() => {
  const z = 0.2 * 1.55 + 0.03, pts = [[0.84, 0.375, z], [0.0, 0.395, z], [0.0, 0.395, -z], [0.84, 0.375, -z]].map(q => new THREE.Vector3(q[0] * M, q[1] * M, q[2] * M))
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.05), 64, 0.018 * M, 8, true)
})
const TIRE = once(() => { const g = lathe(m([[0.12, -0.05], [0.17, -0.055], [0.195, -0.04], [0.2, 0], [0.195, 0.04], [0.17, 0.055], [0.12, 0.05]]), { segs: 40, closed: true }); g.rotateX(Math.PI / 2); return g })
const RIM = once(() => { const g = lathe(m([[0.03, -0.045], [0.1, -0.035], [0.125, -0.04], [0.13, 0], [0.125, 0.04], [0.1, 0.035], [0.03, 0.045]]), { segs: 36, closed: true }); g.rotateX(Math.PI / 2); return g })
const RAILS = once(() => [-1, 1].map(k => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0, k * 0.07], [0.12, 0.05, k * 0.16], [0.5, 0.09, k * 0.24], [0.9, 0.12, k * BARROW.half], [BARROW.grip, 0.16, k * BARROW.half]].map(p => new THREE.Vector3(p[0] * M, p[1] * M, p[2] * M))), 40, 0.017 * M, 10)))
/**
 * 手推车：一只轮子、两根钢管车架（前头夹着轮轴，后头是车把和橡胶把套）、两条支腿、一只钢车厢，车厢里码着砖。
 * 原点在轮轴中心；tilt 是车架绕轮轴转过的角度（弧度，车把抬起为正），每帧读。
 */
export function Wheelbarrow({ tilt, children }: { tilt: RefObject<number>; children?: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => { if (g.current) g.current.rotation.z = tilt.current ?? 0 })
  const B = BARROW
  const bricks = useMemo(() => { const out: { p: [number, number, number]; c: string; r: number }[] = [], r = rng(5); for (let l = 0; l < 6; l++) for (let i = 0; i < 4 - (l > 3 ? 1 : 0); i++) for (let k = 0; k < 2 + (l > 1 && l < 5 ? 1 : 0); k++) { const n = 2 + (l > 1 && l < 5 ? 1 : 0); out.push({ p: [0.22 + i * 0.13 + (l % 2) * 0.04 + (r() - 0.5) * 0.02, 0.09 + l * 0.058, (k - (n - 1) / 2) * 0.25 + (r() - 0.5) * 0.02], c: `rgb(${Math.round(150 + r() * 30)},${Math.round(70 + r() * 18)},${Math.round(50 + r() * 12)})`, r: (r() - 0.5) * 0.12 }) } return out }, [])
  return <group>
    <mesh geometry={TIRE()} castShadow>{rubber}</mesh>
    <mesh geometry={RIM()}><Metal kind="zinc" grain="turned" rough={0.45} /></mesh>
    <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.014 * M, 0.014 * M, 0.2 * M, 10]} /><Metal kind="steel" /></mesh>
    {[-1, 1].map(k => <mesh key={k} position={[0, 0, k * 0.05 * M]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.024 * M, 0.024 * M, 0.012 * M, 6]} /><Metal kind="zinc" /></mesh>)}
    <group ref={g}>
      {[-1, 1].map(k => <group key={k}>
        {/* 车架：从轮轴两侧往后、往上弯到车把 */}
        <mesh geometry={RAILS()[k > 0 ? 1 : 0]} castShadow>{paint('#2c3135', 0.45)}</mesh>
        <mesh position={[(B.grip - 0.06) * M, 0.153 * M, k * B.half * M]} rotation-z={Math.PI / 2 - 0.035} castShadow><cylinderGeometry args={[0.021 * M, 0.021 * M, 0.14 * M, 14]} />{rubber}</mesh>
        {/* 支腿 */}
        <mesh position={[0.82 * M, -0.05 * M, k * 0.25 * M]} castShadow><cylinderGeometry args={[0.013 * M, 0.013 * M, 0.3 * M, 8]} />{paint('#2c3135', 0.45)}</mesh>
        <mesh position={[0.82 * M, -0.198 * M, k * 0.25 * M]}><boxGeometry args={[0.06 * M, 0.006 * M, 0.04 * M]} />{rubber}</mesh>
      </group>)}
      <mesh geometry={TRAY()} castShadow receiveShadow>{paint('#3d6f8f', 0.5)}</mesh>
      <mesh geometry={RIMLIP()} castShadow>{paint('#365f7a', 0.45)}</mesh>
      {bricks.map((b, i) => <RoundedBox key={i} args={[0.12 * M, 0.053 * M, 0.23 * M]} radius={0.004 * M} smoothness={2} position={[b.p[0] * M, (b.p[1] + 0.03) * M, b.p[2] * M]} rotation-y={b.r} castShadow><meshStandardMaterial color={b.c} roughness={0.92} /></RoundedBox>)}
      {children}
    </group>
  </group>
}
/** 车厢和砖的重心离轮轴多远（m，水平方向） */
export const BARROW_LOAD = 0.4

// ---------- 铁锹 ----------
const BLADE = once(() => {
  // 锹头：前面尖一点的铲面，两边往上卷一点
  const s = new THREE.Shape(); s.moveTo(0, -0.11); s.lineTo(0.22, -0.12); s.quadraticCurveTo(0.31, 0, 0.22, 0.12); s.lineTo(0, 0.11); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 })
  g.rotateX(-Math.PI / 2); g.scale(M, M, M)
  return g
})
const SANDHEAP = once(() => { const g = new THREE.SphereGeometry(0.12 * M, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1.05, 0.45, 0.82); return g })
const DGRIP = once(() => [-1, 1].map(k => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0, k * 0.055], [0.05, 0, k * 0.05], [0.1, 0, k * 0.02], [0.13, 0, 0]].map(p => new THREE.Vector3(p[0] * M, p[1] * M, p[2] * M))), 16, 0.012 * M, 8)))
/**
 * 铁锹：木锹把，顶上一只 D 形握把，前头一只钢锹头，锹头上一堆沙。原点在握把（后手握着、当支点的地方），锹头朝 +x。
 * tilt：绕握把转过的角度（弧度，锹头抬起为正），每帧读。
 */
export function Shovel({ tilt, to = 1.05, children }: { tilt: RefObject<number>; to?: number; children?: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => { if (g.current) g.current.rotation.z = tilt.current ?? 0 })
  const sand = useMemo(() => { const t = tex().sand.clone(); t.repeat.set(1, 1); t.needsUpdate = true; return t }, [])
  const wood = useMemo(() => { const t = tex().wood.clone(); t.repeat.set(3, 0.2); t.needsUpdate = true; return t }, [])
  return <group ref={g}>
    {/* D 形握把：一根横档，两边各一根往前收的弯杆 */}
    <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.018 * M, 0.018 * M, 0.11 * M, 12]} /><meshStandardMaterial map={wood} roughness={0.7} /></mesh>
    {[0, 1].map(k => <mesh key={k} geometry={DGRIP()[k]}><Metal kind="steel" grain="brushed" rough={0.4} /></mesh>)}
    {/* 锹把 */}
    <mesh position={[(0.13 + (to - 0.2 - 0.13) / 2) * M, 0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.019 * M, 0.02 * M, (to - 0.2 - 0.13) * M, 14]} /><meshStandardMaterial map={wood} roughness={0.65} /></mesh>
    {/* 锹头：铁箍、锹面、锹上的沙 */}
    <mesh position={[(to - 0.2) * M, 0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.024 * M, 0.021 * M, 0.09 * M, 14]} /><Metal kind="steel" grain="brushed" rough={0.45} /></mesh>
    <mesh geometry={BLADE()} position={[(to - 0.16) * M, -0.012 * M, 0]} rotation-z={-0.12} castShadow><Metal kind="steel" grain="brushed" rough={0.5} /></mesh>
    <mesh geometry={SANDHEAP()} position={[to * M, 0, 0]} castShadow><meshStandardMaterial map={sand} roughness={1} /></mesh>
    {children}
  </group>
}

// ---------- 托盘天平 ----------
/** 天平横梁的半长（m）和刀口的高度（m） */
export const BAL = { arm: 0.12, pivot: 0.16 }
const PAN = once(() => shell(m([[0, 0], [0.05, 0], [0.058, 0.006], [0.062, 0.014]]), 0.0015 * M, { segs: 40 }))
const WEIGHT = once(() => { const R = 0.012 * M, H = 0.026 * M; return lathe([[0, 0], [R * 0.92, 0], [R, R * 0.08], [R, H], [R * 0.4, H], [R * 0.32, H + R * 0.25], [R * 0.32, H + R * 0.5], [R * 0.55, H + R * 0.62], [R * 0.58, H + R * 0.85], [R * 0.3, H + R * 1.05], [0, H + R * 1.05]], { segs: 28 }) })
/**
 * 托盘天平：漆面底座、立柱、横梁和指针，两端各一根竖杆托着一只托盘；左盘一块 100 g 的铁块，右盘一只 100 g 的砝码。
 * 原点在底座底面中心；th：横梁此刻的倾角（弧度，左端下沉为正）。
 */
export function MiniBalance({ th }: { th: RefObject<number> }) {
  const beam = useRef<THREE.Group>(null), pans = useRef<(THREE.Group | null)[]>([])
  useFrame(() => {
    const a = th.current ?? 0
    if (beam.current) beam.current.rotation.z = a
    pans.current.forEach((p, i) => { if (p) p.position.y = (BAL.pivot + (i ? 1 : -1) * Math.sin(a) * BAL.arm) * M })
  })
  const enamel = <meshPhysicalMaterial color="#4f7385" roughness={0.36} metalness={0.1} clearcoat={0.7} clearcoatRoughness={0.22} />
  return <group>
    <RoundedBox args={[0.36 * M, 0.03 * M, 0.13 * M]} radius={0.01 * M} smoothness={3} position={[0, 0.015 * M, 0]} castShadow receiveShadow>{enamel}</RoundedBox>
    <mesh geometry={useMemo(() => lathe(m([[0, 0], [0.024, 0], [0.024, 0.006], [0.012, 0.016], [0.01, 0.125], [0.014, 0.13], [0, 0.13]]), { segs: 24 }), [])} position={[0, 0.03 * M, 0]} castShadow>{enamel}</mesh>
    <group ref={beam} position={[0, BAL.pivot * M, 0]}>
      <RoundedBox args={[(BAL.arm * 2 + 0.03) * M, 0.012 * M, 0.008 * M]} radius={0.002 * M} smoothness={2} castShadow><Metal kind="aluminum" grain="brushed" /></RoundedBox>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.006 * M, 0.006 * M, 0.02 * M, 12]} /><Metal kind="steel" /></mesh>
      <mesh position={[0, 0.045 * M, -0.006 * M]}><boxGeometry args={[0.003 * M, 0.08 * M, 0.002 * M]} /><meshStandardMaterial color="#22272b" /></mesh>
    </group>
    {[0, 1].map(i => <group key={i} ref={e => { pans.current[i] = e }} position={[(i ? 1 : -1) * BAL.arm * M, BAL.pivot * M, 0]}>
      <mesh position={[0, 0.015 * M, 0]}><cylinderGeometry args={[0.003 * M, 0.003 * M, 0.03 * M, 8]} /><Metal kind="chrome" /></mesh>
      <mesh geometry={PAN()} position={[0, 0.03 * M, 0]} castShadow receiveShadow><Metal kind="stainless" grain="turned" rough={0.3} /></mesh>
      {i ? <mesh geometry={WEIGHT()} position={[0, 0.032 * M, 0]} castShadow><Metal kind="brass" grain="turned" /></mesh>
        : <RoundedBox args={[0.022 * M, 0.026 * M, 0.022 * M]} radius={0.002 * M} smoothness={2} position={[0, 0.045 * M, 0]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>}
    </group>)}
  </group>
}

/** 工地试验室里的混凝土试块：150 mm 的立方块。原点在底面中心 */
export function TestCube() {
  const map = useMemo(() => { const t = tex().conc.clone(); t.repeat.set(0.3, 0.3); t.needsUpdate = true; return t }, [])
  return <RoundedBox args={[0.15 * M, 0.15 * M, 0.15 * M]} radius={0.006 * M} smoothness={2} position={[0, 0.075 * M, 0]} castShadow receiveShadow><meshStandardMaterial map={map} roughness={0.95} /></RoundedBox>
}
