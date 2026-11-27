// 实验台上和游艺区里的器材：斜面和木块、滚摆、落锤架和沙箱、弹射器。尺寸按实物，1 个单位 = 1 m。
import { useMemo, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Painted, bolts, disc, lathe, mergeParts, shell, type Part } from '@/lab-kit'
import { beam, box, cyl, makeSand, makeScale, makeWood, rep } from './mats'

// ---------- 斜面、钢球、木块 ----------
/** 斜面的倾角；斜面底端在原点，往 −x 方向升高；水平板从原点往 +x 伸出去 */
export const SLOPE = 30 * Math.PI / 180
export const BOARD = { len: 0.5, w: 0.14, t: 0.018 }
/** 斜面上高 h 处的位置（球心还要再加半径） */
export const onSlope = (h: number): [number, number] => [-h / Math.tan(SLOPE), h]
const CHANNEL = (() => {
  // 斜面是一条铝槽：截面是浅浅的 V 形槽，两边有挡边
  const s = new THREE.Shape(); s.moveTo(-0.04, 0); s.lineTo(0.04, 0); s.lineTo(0.04, 0.022); s.lineTo(0.032, 0.022); s.lineTo(0.004, 0.008); s.lineTo(-0.004, 0.008); s.lineTo(-0.032, 0.022); s.lineTo(-0.04, 0.022); s.lineTo(-0.04, 0)
  const L = 0.5, g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(0, -0.008, 0)   // 沿 −x 伸出去，槽底在 y = 0
  g.rotateZ(-SLOPE)
  return g
})()
export function RampSet({ children }: { children?: ReactNode }) {
  const felt = useMemo(() => makeScale(0.35, 0.01, 5, 100), []), wood = useMemo(() => rep(makeWood('#c9a877', 6), 2, 1), [])
  const stand = useMemo(() => {
    const top = onSlope(0.235), mid = onSlope(0.13)
    return { rod: [top[0] - 0.02, top[1]] as [number, number], mid }
  }, [])
  return <group>
    <mesh geometry={CHANNEL} castShadow receiveShadow><Metal kind="aluminum" rough={0.4} env={0.7} /></mesh>
    {/* 斜面上两道释放线：10 cm、20 cm */}
    {[0.1, 0.2].map(h => { const [x, y] = onSlope(h); return <mesh key={h} position={[x, y + 0.016, 0]} rotation-z={-SLOPE}><boxGeometry args={[0.004, 0.003, 0.082]} /><meshStandardMaterial color="#c8372d" roughness={0.5} /></mesh> })}
    {/* 铁架台：底座、立杆、夹子托着斜面的高端 */}
    <group position={[stand.rod[0] - 0.02, -BOARD.t, -0.13]}>
      <RoundedBox args={[0.2, 0.022, 0.14]} radius={0.006} position={[0, 0.011, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.006, 0.006, 0.48, 14]} /><Metal kind="chrome" /></mesh>
      <mesh position={[0, stand.rod[1] + BOARD.t - 0.02, 0.065]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.005, 0.005, 0.15, 10]} /><Metal kind="steel" /></mesh>
      <RoundedBox args={[0.03, 0.035, 0.03]} radius={0.005} position={[0, stand.rod[1] + BOARD.t - 0.02, 0]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    </group>
    {/* 水平木板：上面贴着一条厘米刻度尺，0 在木块原来的前沿 */}
    <RoundedBox args={[BOARD.len, BOARD.t, BOARD.w]} radius={0.004} position={[BOARD.len / 2 - 0.03, -BOARD.t / 2, 0]} castShadow receiveShadow><meshStandardMaterial map={wood} roughness={0.7} /></RoundedBox>
    <mesh position={[BLOCK_X0 + 0.175, 0.0006, 0.052]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.35, 0.03]} /><meshStandardMaterial map={felt} roughness={0.7} /></mesh>
    {children}
  </group>
}
/** 木块原来的前沿（挨着斜面底端的那一面）在哪 */
export const BLOCK_X0 = 0.07, BLOCK = { len: 0.08, h: 0.055, w: 0.06 }
export function Ball({ r }: { r: number }) { return <mesh castShadow><sphereGeometry args={[r, 32, 24]} /><Metal kind="chrome" rough={0.12} /></mesh> }
export function WoodBlock() {
  const wood = useMemo(() => makeWood('#b88a56', 2), [])
  return <RoundedBox args={[BLOCK.len, BLOCK.h, BLOCK.w]} radius={0.004} position={[BLOCK.len / 2, BLOCK.h / 2, 0]} castShadow receiveShadow><meshStandardMaterial map={wood} roughness={0.75} /></RoundedBox>
}

/** 一张实验桌：木台面、钢腿。原点在台面中心（台面顶是 y = 0） */
export function Table({ w = 1.5, d = 0.7, h = 0.82 }: { w?: number; d?: number; h?: number }) {
  const wood = useMemo(() => rep(makeWood('#8e6a45', 8), 2, 1), [])
  const legs = useMemo(() => {
    const P: Part[] = [], C = '#4a5058'
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(sx * (w / 2 - 0.07), -h, sz * (d / 2 - 0.07), 0.05, h - 0.04, 0.05, C), cyl(sx * (w / 2 - 0.07), -h, sz * (d / 2 - 0.07), 0.035, 0.02, '#1d1f22'))
    for (const sz of [-1, 1]) P.push(box(0, -0.13, sz * (d / 2 - 0.07), w - 0.14, 0.07, 0.03, C), box(0, -h + 0.16, sz * (d / 2 - 0.07), w - 0.14, 0.04, 0.03, C))
    for (const sx of [-1, 1]) P.push(box(sx * (w / 2 - 0.07), -0.13, 0, 0.03, 0.07, d - 0.14, C))
    return mergeParts(P)
  }, [w, d, h])
  return <group>
    <RoundedBox args={[w, 0.04, d]} radius={0.012} smoothness={3} position={[0, -0.02, 0]} castShadow receiveShadow><meshPhysicalMaterial map={wood} roughness={0.55} clearcoat={0.3} clearcoatRoughness={0.5} /></RoundedBox>
    <mesh geometry={legs} castShadow receiveShadow><Painted rough={0.5} metal={0.6} /></mesh>
  </group>
}

// ---------- 滚摆 ----------
/** 横梁的高度；飞轮最低时轴的高度（都从台面算起） */
export const WHEEL_TOP = 0.66, WHEEL_LOW = 0.2, AXLE_R = 0.006
const FLY = (() => { const g = disc(0.075, 0.016, { hole: 0.006 }); g.rotateX(Math.PI / 2); g.translate(0, 0, -0.008); return g })()
/** 滚摆：门形支架，横梁上两根线吊着一只带轴的飞轮。原点在底座中心的台面上。y 是飞轮的轴离台面的高度，turn 是它转过的角度 */
export function Maxwell({ y, turn }: { y: number; turn: number }) {
  const scale = useMemo(() => makeScale(0.5, 0.01, 10, 100, true), [])
  return <group>
    <RoundedBox args={[0.34, 0.024, 0.2]} radius={0.006} position={[0, 0.012, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    {[-0.12, 0.12].map(z => <mesh key={z} position={[0, 0.024 + WHEEL_TOP / 2, z * 0.7]} castShadow><cylinderGeometry args={[0.007, 0.007, WHEEL_TOP, 14]} /><Metal kind="chrome" /></mesh>)}
    <mesh position={[0, 0.024 + WHEEL_TOP, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.008, 0.008, 0.22, 14]} /><Metal kind="chrome" /></mesh>
    {/* 背后的竖尺：0 在飞轮最低的位置 */}
    <mesh position={[-0.11, WHEEL_LOW + 0.25, -0.06]}><planeGeometry args={[0.04, 0.5]} /><meshStandardMaterial map={scale} roughness={0.7} /></mesh>
    <mesh position={[-0.11, WHEEL_LOW + 0.13, -0.066]}><boxGeometry args={[0.046, 0.78, 0.008]} /><meshStandardMaterial color="#8a5a34" roughness={0.8} /></mesh>
    {/* 两根线：从横梁到轴 */}
    {[-0.045, 0.045].map(z => <mesh key={z} position={[AXLE_R, (0.024 + WHEEL_TOP + y) / 2, z]}><cylinderGeometry args={[0.0012, 0.0012, Math.max(0.001, 0.024 + WHEEL_TOP - y), 5]} /><meshStandardMaterial color="#f1eee4" roughness={0.9} /></mesh>)}
    <group position={[0, y, 0]} rotation-z={-turn}>
      <mesh geometry={FLY} castShadow><Metal kind="brass" grain="turned" /></mesh>
      <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[AXLE_R, AXLE_R, 0.13, 14]} /><Metal kind="steel" /></mesh>
      {/* 轮上的三个减重孔和一道红漆，看得出它在转 */}
      {[0, 1, 2].map(i => <mesh key={i} position={[Math.cos(i * 2.094) * 0.045, Math.sin(i * 2.094) * 0.045, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.014, 0.014, 0.0165, 18]} /><meshStandardMaterial color="#1d1f22" roughness={0.6} /></mesh>)}
      <mesh position={[0.06, 0, 0]}><boxGeometry args={[0.024, 0.008, 0.0168]} /><meshStandardMaterial color="#c8372d" roughness={0.5} /></mesh>
    </group>
  </group>
}

// ---------- 落锤架 ----------
export const RIG = { sand: 0.45, stake: 0.5, top: 2.75 }
/** 木桩顶原来的高度（沙面以上露出 RIG.stake） */
export const STAKE_TOP = RIG.sand + RIG.stake
const WEIGHT = (r: number, h: number) => lathe([[0, 0], [r * 0.9, 0], [r, r * 0.1], [r, h - r * 0.1], [r * 0.9, h], [0, h]], { segs: 40 })
/** 重锤：一只灌了混凝土的钢筒，顶上有吊环。原点在锤底的中心 */
export function Weight({ heavy }: { heavy: boolean }) {
  const r = heavy ? 0.17 : 0.135, h = heavy ? 0.24 : 0.19, g = useMemo(() => WEIGHT(r, h), [r, h])
  return <group>
    <mesh geometry={g} castShadow><meshPhysicalMaterial color={heavy ? '#2f5f93' : '#c8372d'} roughness={0.4} metalness={0.3} clearcoat={0.4} /></mesh>
    <mesh position={[0, h * 0.5, 0]}><cylinderGeometry args={[r + 0.003, r + 0.003, 0.03, 40, 1, true]} /><meshStandardMaterial color="#f1eee4" roughness={0.6} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, h + 0.035, 0]} castShadow><torusGeometry args={[0.035, 0.009, 8, 20]} /><Metal kind="steel" /></mesh>
  </group>
}
/** 落锤架：沙箱、门架、定滑轮、竖尺。原点在沙箱中心的地面上。drop：木桩被砸下去多少（m）；children 画在门架里（重锤、绳） */
export function HammerRig({ drop, children }: { drop: number; children?: ReactNode }) {
  const sand = useMemo(() => rep(makeSand(), 2, 2), []), wood = useMemo(() => rep(makeWood('#9a7448', 3), 1, 1), []), scale = useMemo(() => makeScale(1.5, 0.1, 5, 1, true), [])
  const g = useMemo(() => {
    const P: Part[] = [], S: Part[] = [], Y = '#d9a521'
    // 沙箱：四面木板、四个角的立柱
    for (const k of [-1, 1]) { P.push(box(0, 0, k * 0.72, 1.5, RIG.sand + 0.06, 0.06, '#9a7448'), box(k * 0.72, 0, 0, 0.06, RIG.sand + 0.06, 1.38, '#9a7448')) }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(sx * 0.74, 0, sz * 0.74, 0.1, RIG.sand + 0.12, 0.1, '#7a5a38'))
    // 门架：两根立柱、横梁、斜撑、底脚
    for (const sx of [-1, 1]) { S.push(box(sx * 1.05, 0, 0, 0.12, RIG.top, 0.12, Y), box(sx * 1.05, 0, 0, 0.5, 0.06, 1.3, '#3b4046'), beam([sx * 1.05, 0.1, 0.6], [sx * 1.05, 1.1, 0], 0.06, Y), beam([sx * 1.05, 0.1, -0.6], [sx * 1.05, 1.1, 0], 0.06, Y), beam([sx * 1.05, RIG.top - 0.7, 0], [sx * 0.45, RIG.top - 0.05, 0], 0.06, Y)) }
    S.push(box(0, RIG.top - 0.12, 0, 2.22, 0.14, 0.14, Y))
    // 两根导向钢丝
    for (const sx of [-0.3, 0.3]) S.push(cyl(sx, RIG.sand, 0, 0.006, RIG.top - RIG.sand - 0.1, '#8d949a'))
    return { P: mergeParts(P), S: mergeParts(S) }
  }, [])
  return <group>
    <mesh geometry={g.P} castShadow receiveShadow><Painted rough={0.85} metal={0} /></mesh>
    <mesh geometry={g.S} castShadow receiveShadow><Painted rough={0.45} metal={0.4} /></mesh>
    <mesh position={[0, RIG.sand, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[1.4, 1.4]} /><meshStandardMaterial map={sand} roughness={1} /></mesh>
    {/* 木桩：露出沙面的一截上有红白相间的刻度，每格 5 cm */}
    <group position={[0, RIG.sand - drop, 0]}>
      <mesh position={[0, (RIG.stake - 0.3) / 2, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, RIG.stake + 0.3, 20]} /><meshStandardMaterial map={wood} roughness={0.8} /></mesh>
      {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[0, RIG.stake - 0.025 - i * 0.05, 0]}><cylinderGeometry args={[0.0515, 0.0515, 0.05, 20, 1, true]} /><meshStandardMaterial color={i % 2 ? '#f1eee4' : '#c8372d'} roughness={0.7} /></mesh>)}
      <mesh position={[0, RIG.stake + 0.006, 0]}><cylinderGeometry args={[0.058, 0.058, 0.012, 20]} /><Metal kind="steel" grain="turned" /></mesh>
    </group>
    {/* 定滑轮 */}
    <mesh position={[0, RIG.top - 0.26, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.1, 0.1, 0.04, 28]} /><Metal kind="steel" grain="turned" /></mesh>
    {/* 立柱上的竖尺：0 对着木桩顶 */}
    <mesh position={[-1.05 + 0.062, STAKE_TOP + 0.75, 0.0]} rotation-y={Math.PI / 2}><planeGeometry args={[0.1, 1.5]} /><meshStandardMaterial map={scale} roughness={0.7} /></mesh>
    <mesh position={[-1.05, STAKE_TOP + 0.75, 0.062]}><planeGeometry args={[0.1, 1.5]} /><meshStandardMaterial map={scale} roughness={0.7} /></mesh>
    {children}
  </group>
}

// ---------- 弹射器 ----------
export const LAUNCH = { base: 0.5, spring: 0.3, tube: 2.5 }
/** 小球停在弹簧托上时球心的高度 */
export const REST_Y = LAUNCH.base + LAUNCH.spring + 0.05
const COIL = (() => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2 * 8; pts.push(new THREE.Vector3(Math.cos(a) * 0.034, i / 160, Math.sin(a) * 0.034)) } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.0045, 8) })()
const FLANGE = disc(0.12, 0.03), FLANGE_BOLTS = bolts(8, 0.098, 0.016)
const TUBE = shell([[0.052, 0], [0.052, LAUNCH.tube]], 0.004, { segs: 40 })
/** 弹射器：底座、弹簧和托盘、透明的竖管、管边的米尺、拉手。原点在底座中心的地面上。press：弹簧压缩了多少（m）；ball：小球球心的高度 */
export function Launcher({ press, ball }: { press: number; ball: number }) {
  const scale = useMemo(() => makeScale(2.2, 0.1, 5, 1, true), [])
  const len = LAUNCH.spring - press
  return <group>
    {/* 底座：一只钢柜，上面是法兰 */}
    <RoundedBox args={[0.5, LAUNCH.base - 0.03, 0.5]} radius={0.03} smoothness={4} position={[0, (LAUNCH.base - 0.03) / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#2f6f9f" roughness={0.4} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
    <mesh position={[0, LAUNCH.base - 0.03, 0]} geometry={FLANGE} castShadow><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[0, LAUNCH.base, 0]} geometry={FLANGE_BOLTS}><Metal kind="stainless" /></mesh>
    {/* 底板和四只调平脚、柜门的缝和把手 */}
    <RoundedBox args={[0.62, 0.03, 0.62]} radius={0.008} position={[0, 0.015, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[0, 0.25, 0.2515]}><boxGeometry args={[0.36, 0.3, 0.003]} /><meshStandardMaterial color="#285f8a" roughness={0.45} /></mesh>
    <mesh position={[0.13, 0.25, 0.257]}><boxGeometry args={[0.02, 0.1, 0.012]} /><Metal kind="chrome" /></mesh>
    {/* 弹簧、托盘、往下拉的拉杆和拉手 */}
    <mesh geometry={COIL} position={[0, LAUNCH.base, 0]} scale={[1, len, 1]} castShadow><Metal kind="steel" rough={0.25} /></mesh>
    <mesh position={[0, LAUNCH.base + len + 0.006, 0]}><cylinderGeometry args={[0.046, 0.046, 0.012, 28]} /><Metal kind="brass" grain="turned" /></mesh>
    <group position={[0.3, 0, 0]}>
      <mesh position={[0, LAUNCH.base + 0.14 - press * 4, 0]} rotation-z={0}><cylinderGeometry args={[0.012, 0.012, 0.36, 10]} /><Metal kind="chrome" /></mesh>
      <mesh position={[0, LAUNCH.base + 0.33 - press * 4, 0]}><sphereGeometry args={[0.035, 20, 14]} /><meshStandardMaterial color="#c8372d" roughness={0.4} /></mesh>
    </group>
    <mesh position={[0.15, LAUNCH.base - 0.1, 0.251]}><boxGeometry args={[0.2, 0.1, 0.004]} /><meshStandardMaterial color="#f1eee4" roughness={0.6} /></mesh>
    {/* 竖管：透明，有壁厚；顶上一道箍 */}
    <mesh geometry={TUBE} position={[0, LAUNCH.base, 0]} renderOrder={3}><meshPhysicalMaterial color="#dfeef2" transparent opacity={0.2} roughness={0.04} depthWrite={false} side={THREE.DoubleSide} envMapIntensity={1.6} /></mesh>
    <mesh position={[0, LAUNCH.base + LAUNCH.tube, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.054, 0.006, 8, 32]} /><Metal kind="steel" /></mesh>
    {/* 管后的立柱和米尺：0 对着小球原来的位置 */}
    <mesh position={[-0.11, LAUNCH.base + LAUNCH.tube / 2, -0.04]} castShadow><boxGeometry args={[0.05, LAUNCH.tube + 0.1, 0.03]} /><meshStandardMaterial color="#3b4046" roughness={0.5} metalness={0.5} /></mesh>
    <mesh position={[-0.11, REST_Y + 1.1, -0.024]}><planeGeometry args={[0.1, 2.2]} /><meshStandardMaterial map={scale} roughness={0.7} /></mesh>
    {[0.6, 1.6, 2.4].map(y => <mesh key={y} position={[-0.055, LAUNCH.base + y, -0.02]} rotation-x={Math.PI / 2}><torusGeometry args={[0.056, 0.004, 6, 24, Math.PI]} /><Metal kind="steel" /></mesh>)}
    <mesh position={[0, ball, 0]} castShadow><sphereGeometry args={[0.04, 28, 20]} /><meshPhysicalMaterial color="#f2c230" roughness={0.3} clearcoat={0.6} /></mesh>
  </group>
}
