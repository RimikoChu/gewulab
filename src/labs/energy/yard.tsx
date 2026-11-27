// 货场和大道上的器材：叉车、木箱、戴工作手套的手、售货推车、货运升降机。尺寸按实物，1 个单位 = 1 m。
import { useMemo, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, Painted, lathe, mergeParts, type Part } from '@/lab-kit'
import { beam, box, makeSign, makeStripes, makeWood, rep } from './mats'

// ---------- 木箱 ----------
/** 钉着木条的货箱，放在托盘上。原点在托盘底面的中心；s 是箱子的边长，tag 是喷在箱子上的字 */
export function Crate({ s = 1, tag = '200 kg', pallet = true }: { s?: number; tag?: string; pallet?: boolean }) {
  const wood = useMemo(() => rep(makeWood('#c49a62', 4), 1, 3), []), sign = useMemo(() => makeSign([tag], '#c9a368', '#3a2a18', 256, 96), [tag])
  const bars = useMemo(() => {
    const P: Part[] = [], e = s / 2, t = 0.07 * s, c = '#a67c48', y0 = pallet ? 0.14 : 0
    for (const k of [-1, 1]) {
      for (const j of [-1, 1]) P.push(box(j * (e - t / 2), y0, k * (e + 0.012), t, s, 0.024, c), box(k * (e + 0.012), y0, j * (e - t / 2), 0.024, s, t, c))
      P.push(box(0, y0, k * (e + 0.012), s, t, 0.024, c), box(0, y0 + s - t, k * (e + 0.012), s, t, 0.024, c), box(k * (e + 0.012), y0, 0, 0.024, t, s, c), box(k * (e + 0.012), y0 + s - t, 0, 0.024, t, s, c))
      P.push(beam([-e + t, y0 + t, k * (e + 0.012)], [e - t, y0 + s - t, k * (e + 0.012)], 0.05 * s, c))
    }
    if (pallet) { for (const x of [-0.42, 0, 0.42]) P.push(box(x * s, 0, 0, 0.1 * s, 0.1, 1.02 * s, '#b08a58')); for (const z of [-0.44, -0.22, 0, 0.22, 0.44]) P.push(box(0, 0.1, z * s, 1.06 * s, 0.035, 0.14 * s, '#bb9460')) }
    return mergeParts(P)
  }, [s, pallet])
  const y0 = pallet ? 0.14 : 0
  return <group>
    <RoundedBox args={[s, s, s]} radius={0.012} position={[0, y0 + s / 2, 0]} castShadow receiveShadow><meshStandardMaterial map={wood} roughness={0.85} /></RoundedBox>
    <mesh geometry={bars} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh>
    <mesh position={[0, y0 + s * 0.62, s / 2 + 0.014]}><planeGeometry args={[s * 0.5, s * 0.19]} /><meshStandardMaterial map={sign} roughness={0.85} /></mesh>
  </group>
}

// ---------- 叉车 ----------
const TIRE = (r: number, w: number) => { const g = lathe([[r * 0.55, -w / 2], [r * 0.93, -w / 2], [r, -w * 0.32], [r, w * 0.32], [r * 0.93, w / 2], [r * 0.55, w / 2]], { segs: 32, closed: true }); g.rotateX(Math.PI / 2); return g }
const FRONT = TIRE(0.33, 0.22), REAR = TIRE(0.26, 0.18)
function Wheel({ r, geo, spin }: { r: number; geo: THREE.BufferGeometry; spin: number }) {
  return <group rotation-z={-spin}>
    <mesh geometry={geo} castShadow><meshStandardMaterial color="#1b1d20" roughness={0.9} /></mesh>
    <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[r * 0.56, r * 0.56, 0.16, 24]} /><meshStandardMaterial color="#d9a521" roughness={0.5} metalness={0.3} /></mesh>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.cos(i * 1.2566) * r * 0.36, Math.sin(i * 1.2566) * r * 0.36, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.022, 0.022, 0.18, 6]} /><Metal kind="steel" /></mesh>)}
  </group>
}
const FORK = (() => {
  // 货叉的侧面：竖的一段挂在叉架上，横的一段越往前越薄
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.12, 0); s.lineTo(1.12, 0.02); s.lineTo(0.09, 0.055); s.lineTo(0.09, 0.62); s.lineTo(0, 0.62); s.lineTo(0, 0)
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.11, bevelEnabled: false }); g.translate(0, 0, -0.055)
  return g
})()
/**
 * 平衡重式叉车。原点在前轮中间的地面上，+x 朝前（货叉那一头）。
 * lift：货叉离地的高度（m）；spin：车轮转过的角度；children 画在货叉上（原点在叉面上、离叉根 0.6 m 处）
 */
export function Forklift({ lift = 0.15, spin = 0, children }: { lift?: number; spin?: number; children?: ReactNode }) {
  const body = <meshPhysicalMaterial color="#e3a81c" roughness={0.38} metalness={0.2} clearcoat={0.6} clearcoatRoughness={0.25} />
  const frame = useMemo(() => {
    const P: Part[] = [], D = '#2a2d31'
    // 护顶架：四根立柱、顶上一圈和几根横条
    for (const z of [-0.5, 0.5]) { P.push(beam([-0.2, 1.05, z], [-0.02, 2.12, z], 0.07, D), beam([-1.45, 1.1, z], [-1.3, 2.12, z], 0.07, D), box(-0.66, 2.1, z, 1.36, 0.07, 0.07, D)) }
    for (let x = -1.3; x <= -0.02; x += 0.16) P.push(box(x, 2.11, 0, 0.035, 0.035, 1.0, D))
    // 外门架：两根槽钢，上下各一道横梁
    for (const z of [-0.36, 0.36]) P.push(box(0.5, 0.08, z, 0.12, 2.12, 0.1, D))
    P.push(box(0.5, 2.1, 0, 0.1, 0.1, 0.82, D), box(0.5, 0.5, 0, 0.08, 0.1, 0.82, D))
    // 倾斜油缸
    for (const z of [-0.42, 0.42]) P.push(beam([-0.05, 0.75, z], [0.46, 1.05, z], 0.06, '#8d949a'))
    return mergeParts(P)
  }, [])
  const carriage = useMemo(() => {
    const P: Part[] = [], D = '#2a2d31'
    P.push(box(0, 0.38, 0, 0.06, 0.1, 1.0, D), box(0, 0.05, 0, 0.06, 0.1, 1.0, D))
    // 挡货架
    for (const z of [-0.48, -0.24, 0, 0.24, 0.48]) P.push(box(0, 0.05, z, 0.04, 1.15, 0.04, D))
    P.push(box(0, 1.16, 0, 0.04, 0.05, 1.0, D), box(0, 0.78, 0, 0.04, 0.04, 1.0, D))
    return mergeParts(P)
  }, [])
  const inner = Math.max(0, lift - 0.9)
  return <group>
    {/* 车身、配重、发动机罩 */}
    <RoundedBox args={[1.5, 0.62, 1.08]} radius={0.08} smoothness={4} position={[-0.75, 0.62, 0]} castShadow receiveShadow>{body}</RoundedBox>
    <RoundedBox args={[0.62, 0.86, 1.12]} radius={0.16} smoothness={4} position={[-1.62, 0.66, 0]} castShadow><meshStandardMaterial color="#33373c" roughness={0.6} metalness={0.4} /></RoundedBox>
    <RoundedBox args={[0.74, 0.3, 0.86]} radius={0.07} smoothness={4} position={[-1.0, 1.06, 0]} castShadow>{body}</RoundedBox>
    <RoundedBox args={[0.34, 0.4, 0.9]} radius={0.06} position={[0.06, 0.74, 0]} castShadow>{body}</RoundedBox>
    {/* 座椅、方向盘、操纵杆 */}
    <RoundedBox args={[0.46, 0.1, 0.48]} radius={0.04} position={[-0.98, 1.27, 0]}><meshStandardMaterial color="#1d1f22" roughness={0.85} /></RoundedBox>
    <RoundedBox args={[0.1, 0.5, 0.48]} radius={0.04} position={[-1.23, 1.5, 0]} rotation-z={0.15}><meshStandardMaterial color="#1d1f22" roughness={0.85} /></RoundedBox>
    <mesh position={[-0.28, 1.2, 0]} rotation-z={-0.45}><cylinderGeometry args={[0.022, 0.022, 0.52, 10]} /><meshStandardMaterial color="#2a2d31" /></mesh>
    <mesh position={[-0.4, 1.44, 0]} rotation={[0, Math.PI / 2, 0.45]}><torusGeometry args={[0.17, 0.02, 8, 24]} /><meshStandardMaterial color="#1d1f22" roughness={0.6} /></mesh>
    {[0.2, 0.3].map(z => <mesh key={z} position={[-0.12, 1.08, z]} rotation-z={-0.3}><cylinderGeometry args={[0.012, 0.012, 0.3, 8]} /><meshStandardMaterial color="#1d1f22" /></mesh>)}
    {/* 警示灯、尾灯 */}
    <mesh position={[-1.3, 2.2, 0.4]}><cylinderGeometry args={[0.05, 0.06, 0.1, 14]} /><meshStandardMaterial color="#ff9d2a" emissive="#ff7a00" emissiveIntensity={0.6} roughness={0.3} /></mesh>
    <mesh geometry={frame} castShadow><Painted rough={0.5} metal={0.5} /></mesh>
    {/* 车轮 */}
    {[-0.5, 0.5].map(z => <group key={z} position={[0, 0.33, z * 1.12]}><Wheel r={0.33} geo={FRONT} spin={spin / 0.33} /></group>)}
    {[-0.45, 0.45].map(z => <group key={z} position={[-1.5, 0.26, z * 1.0]}><Wheel r={0.26} geo={REAR} spin={spin / 0.26} /></group>)}
    {/* 内门架：举得高了才伸出来；链条 */}
    <group position={[0.5, 0.1 + inner, 0]}>
      {[-0.27, 0.27].map(z => <mesh key={z} position={[0.02, 1.05, z]} castShadow><boxGeometry args={[0.08, 2.05, 0.07]} /><Metal kind="steel" grain="brushed" /></mesh>)}
      <mesh position={[0.02, 2.06, 0]}><boxGeometry args={[0.08, 0.07, 0.6]} /><Metal kind="steel" grain="brushed" /></mesh>
    </group>
    <mesh position={[0.5, 0.25 + (1.2 + inner) / 2, 0]}><cylinderGeometry args={[0.05, 0.05, 1.2 + inner, 14]} /><Metal kind="chrome" /></mesh>
    {/* 叉架和两根货叉，跟着 lift 升降 */}
    <group position={[0.6, lift, 0]}>
      <mesh geometry={carriage} castShadow><Painted rough={0.5} metal={0.5} /></mesh>
      {[-0.27, 0.27].map(z => <mesh key={z} geometry={FORK} position={[0.03, -0.04, z]} castShadow><Metal kind="steel" grain="brushed" rough={0.45} /></mesh>)}
      <group position={[0.66, 0.016, 0]}>{children}</group>
    </group>
  </group>
}

// ---------- 手 ----------
const U = 0.0105
const CUFF = lathe([[4.1, 0], [4.5, 0.4], [4.5, 5.2], [4.1, 5.6], [3.6, 5.6], [3.6, 0]].map(([r, y]) => [r * U, y * U]) as [number, number][], { segs: 28, closed: true })
const FINGER = (() => { const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -1.4, 1.2], [0, -2.6, 0.6], [0, -2.9, -1.0], [0, -2.2, -2.1]].map(p => new THREE.Vector3(p[0] * U, p[1] * U, p[2] * U))); return new THREE.TubeGeometry(c, 18, 0.95 * U, 10) })()
/**
 * 一只握着东西的工作手套：灰色针织手背、红色涂胶的手指，袖口往后是一截深蓝工装的小臂（末端淡出）。
 * 握着的东西从拳心穿过，拳心在原点；手腕朝 +y。open：张开手（刚松手的样子）
 */
export function Glove({ scale = 1, open = false }: { scale?: number; open?: boolean }) {
  const knit = <meshStandardMaterial color="#b9bcbf" roughness={0.95} />, dip = <meshStandardMaterial color="#b8372e" roughness={0.7} />
  return <group scale={scale}><group position={[0, -0.2 * U, -0.9 * U]}>
    <RoundedBox args={[8.4 * U, 7.4 * U, 6.0 * U]} radius={2.4 * U} smoothness={3} position={[0, 4.6 * U, -0.8 * U]} castShadow>{knit}</RoundedBox>
    {[-2.9, -0.95, 0.95, 2.9].map((x, i) => <mesh key={x} geometry={FINGER} position={[x * U, 1.6 * U, 1.4 * U]} rotation-x={open ? -0.9 : 0} scale={[1, 0.95 - Math.abs(i - 1.5) * 0.06, 1]} castShadow>{dip}</mesh>)}
    <mesh position={[4.2 * U, 1.8 * U, 1.6 * U]} rotation={[0.5, 0, open ? 0.3 : 0.9]} castShadow><capsuleGeometry args={[1.05 * U, 3.2 * U, 6, 12]} />{dip}</mesh>
    <mesh geometry={CUFF} position={[0, 7.6 * U, -0.8 * U]} castShadow>{knit}</mesh>
    <mesh position={[0, 12 * U, -0.8 * U]}><cylinderGeometry args={[4.5 * U, 4.5 * U, 1.3 * U, 28]} /><meshStandardMaterial color="#d8b23a" roughness={0.9} /></mesh>
    <mesh position={[0, 26 * U, -0.8 * U]} castShadow><cylinderGeometry args={[5.7 * U, 4.7 * U, 27 * U, 24]} /><meshStandardMaterial color="#2f4660" roughness={0.9} /></mesh>
    {[17, 25].map(y => <mesh key={y} position={[0, y * U, -0.8 * U]} rotation-x={Math.PI / 2}><torusGeometry args={[(4.6 + (y - 12) * 0.037) * U, 0.18 * U, 6, 28]} /><meshStandardMaterial color="#273b52" roughness={0.9} /></mesh>)}
    <mesh position={[0, 45.5 * U, -0.8 * U]}><cylinderGeometry args={[6.2 * U, 5.7 * U, 12 * U, 24]} /><meshStandardMaterial color="#2f4660" roughness={0.9} transparent opacity={0.45} depthWrite={false} /></mesh>
  </group></group>
}

// ---------- 售货推车 ----------
const SPOKE = (() => { const P: Part[] = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; P.push(beam([0, 0, 0], [Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0], 0.022, '#e9e5d8')) } return mergeParts(P) })()
const RIM = new THREE.TorusGeometry(0.38, 0.035, 10, 40)
/** 冰淇淋售货车：白色车厢、彩条遮阳篷、两只大辐条轮、推手。原点在两只轮子中间的地面上，+x 朝前。full：车上码满货箱 */
export function VendorCart({ spin = 0, full = false }: { spin?: number; full?: boolean }) {
  const stripes = useMemo(() => { const t = rep(makeStripes('#c8372d', '#f4efe2', 5), 1, 1); t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; return t }, []), sign = useMemo(() => makeSign(['冰淇淋'], '#f4efe2', '#c8372d', 384, 128), [])
  const parts = useMemo(() => {
    const P: Part[] = []
    for (const x of [-0.62, 0.62]) for (const z of [-0.36, 0.36]) P.push(box(x, 1.02, z, 0.035, 1.02, 0.035, '#e9e5d8'))
    // 推手和两根支杆、前面的支脚
    P.push(box(-1.02, 1.0, 0, 0.04, 0.04, 0.86, '#8a5a34'))
    for (const z of [-0.4, 0.4]) P.push(beam([-0.7, 0.86, z], [-1.02, 1.02, z], 0.035, '#9aa0a6'))
    P.push(box(0.6, 0, 0, 0.05, 0.42, 0.05, '#9aa0a6'), box(0.6, 0, 0, 0.16, 0.03, 0.16, '#3b4046'))
    return mergeParts(P)
  }, [])
  return <group>
    <RoundedBox args={[1.4, 0.62, 0.82]} radius={0.05} smoothness={4} position={[0, 0.72, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#f4f0e6" roughness={0.4} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
    <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.42, 0.1, 0.84]} /><meshStandardMaterial color="#c8372d" roughness={0.5} /></mesh>
    <mesh position={[0.1, 0.74, 0.412]}><planeGeometry args={[0.8, 0.27]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
    {/* 台面上的两只冰桶盖、一摞蛋筒 */}
    {[-0.3, 0.12].map(x => <mesh key={x} position={[x, 1.04, 0]}><cylinderGeometry args={[0.15, 0.15, 0.03, 28]} /><Metal kind="stainless" grain="turned" /></mesh>)}
    {[0, 1, 2].map(i => <mesh key={i} position={[0.5, 1.09 + i * 0.035, 0.18]} rotation-x={Math.PI}><coneGeometry args={[0.045, 0.14, 14, 1, true]} /><meshStandardMaterial color="#d7a965" roughness={0.9} side={THREE.DoubleSide} /></mesh>)}
    {full && [[-0.38, 0], [0.1, 0.02], [-0.14, 0.42]].map(([x, y], i) => <group key={i} position={[x, 1.05 + y, i === 2 ? 0 : (i ? -0.16 : 0.14)]} rotation-y={i * 0.2}><Crate s={0.42} tag="货" pallet={false} /></group>)}
    <mesh geometry={parts} castShadow><Painted rough={0.5} metal={0.2} /></mesh>
    {/* 遮阳篷：拱起来的彩条布 */}
    <mesh position={[0, 1.66, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.62, 0.62, 1.5, 24, 1, true, Math.PI / 2 - 0.9, 1.8]} /><meshStandardMaterial map={stripes} roughness={0.8} side={THREE.DoubleSide} /></mesh>
    {[-0.5, 0.5].map(z => <group key={z} position={[-0.1, 0.415, z]} rotation-z={-spin / 0.415}>
      <mesh geometry={RIM} castShadow><meshStandardMaterial color="#c8372d" roughness={0.5} /></mesh>
      <mesh geometry={SPOKE}><Painted rough={0.5} metal={0.2} /></mesh>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.06, 0.06, 0.1, 16]} /><Metal kind="brass" grain="turned" /></mesh>
    </group>)}
  </group>
}

// ---------- 货运升降机 ----------
/** 一台升降机：桁架导轨、顶上的电机、吊笼和钢丝绳。原点在导轨脚下的地面上，吊笼在导轨的 +z 一侧。y 是吊笼底板离地的高度 */
export function Hoist({ y, top = 8.6, color = '#2f6f9f', time, children }: { y: number; top?: number; color?: string; time: string; children?: ReactNode }) {
  const g = useMemo(() => {
    const P: Part[] = [], a = 0.3, C = '#d9a521'
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(sx * a, 0, sz * a, 0.07, top, 0.07, C))
    for (let h = 0; h < top - 0.1; h += 0.75) {
      for (const s of [-1, 1]) { P.push(box(0, h, s * a, 2 * a, 0.045, 0.045, C), box(s * a, h, 0, 0.045, 0.045, 2 * a, C)) }
      const f = Math.round(h / 0.75) % 2 ? 1 : -1
      for (const s of [-1, 1]) P.push(beam([-f * a, h, s * a], [f * a, h + 0.75, s * a], 0.035, C), beam([s * a, h, -f * a], [s * a, h + 0.75, f * a], 0.035, C))
    }
    P.push(box(0, 0, 0, 1.0, 0.12, 1.0, '#a9a79f'), box(0, top, 0.3, 0.9, 0.12, 1.5, '#3b4046'))
    return mergeParts(P)
  }, [top])
  const cage = useMemo(() => {
    const P: Part[] = [], D = '#4a5058'
    P.push(box(0, 0, 0, 1.7, 0.08, 1.5, '#6f757b'))
    for (const sx of [-0.82, 0.82]) for (const sz of [-0.72, 0.72]) P.push(box(sx, 0.08, sz, 0.06, 1.9, 0.06, D))
    for (const sx of [-0.82, 0.82]) { P.push(box(sx, 1.0, 0, 0.04, 0.04, 1.44, D), box(sx, 0.5, 0, 0.04, 0.04, 1.44, D), box(sx, 1.94, 0, 0.06, 0.06, 1.5, D)); for (let z = -0.54; z <= 0.55; z += 0.18) P.push(box(sx, 0.08, z, 0.015, 0.92, 0.015, D)) }
    for (const sz of [-0.72, 0.72]) P.push(box(0, 1.94, sz, 1.7, 0.06, 0.06, D))
    P.push(box(0, 1.0, -0.72, 1.64, 0.04, 0.04, D), box(0, 0.5, -0.72, 1.64, 0.04, 0.04, D), box(0, 0.08, 0.72, 1.64, 0.2, 0.03, '#d9a521'))
    // 抱着导轨的滚轮架
    P.push(box(0, 0.2, -0.95, 0.9, 0.12, 0.4, D), box(0, 1.7, -0.95, 0.9, 0.12, 0.4, D))
    return mergeParts(P)
  }, [])
  return <group>
    <mesh geometry={g} castShadow receiveShadow><Painted rough={0.5} metal={0.4} /></mesh>
    {/* 电机和卷筒 */}
    <RoundedBox args={[0.7, 0.5, 0.6]} radius={0.05} position={[0, top + 0.37, 0]} castShadow><meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.5} /></RoundedBox>
    <mesh position={[0, top + 0.32, 0.72]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.2, 0.2, 0.5, 24]} /><Metal kind="steel" grain="turned" /></mesh>
    {/* 钢丝绳：从卷筒到吊笼顶 */}
    <mesh position={[0, (top + 0.3 + y + 1.98) / 2, 1.05 - 0.3]}><cylinderGeometry args={[0.014, 0.014, Math.max(0.01, top + 0.3 - y - 1.98), 6]} /><meshStandardMaterial color="#2a2d31" metalness={0.6} roughness={0.5} /></mesh>
    <group position={[0, y, 1.1]}>
      <mesh geometry={cage} castShadow receiveShadow><Painted rough={0.55} metal={0.5} /></mesh>
      <mesh position={[0, 0.18, 0.74]}><boxGeometry args={[1.0, 0.16, 0.02]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
      <group position={[0, 0.08, 0]}>{children}</group>
    </group>
    {/* 计时器：立在机脚旁边 */}
    <group position={[1.25, 0, 0.5]}>
      <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.03, 0.03, 1.1, 10]} /><Metal kind="steel" /></mesh>
      <RoundedBox args={[0.66, 0.34, 0.1]} radius={0.03} position={[0, 1.22, 0]} castShadow><meshStandardMaterial color="#23272c" roughness={0.6} /></RoundedBox>
      <Led text={time} w={0.58} h={0.25} position={[0, 1.22, 0.052]} />
    </group>
  </group>
}
