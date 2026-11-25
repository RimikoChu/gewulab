// 各课摆出来的家用电器和小东西：电水壶、电饭煲、电烤箱、插线板、插头和电线、试电笔、戴手套的手。
// 全部按厘米写（外面套 Cm），原点在器件底面正中（墙上的东西是背面正中），正面朝 +z。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe, shell, type RY } from '@/lab-kit'
import { makeText } from './mats'
import { Flow } from './bench'

export type P3 = [number, number, number]

/** 一根电线：沿几个点走的软管，半径 r（cm） */
export function Cord({ pts, r = 0.35, color = '#f1f0ec' }: { pts: P3[]; r?: number; color?: string }) {
  const geo = useMemo(() => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal', 0.5); return new THREE.TubeGeometry(c, Math.max(24, pts.length * 12), r, 8, false) }, [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} castShadow><meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.2} /></mesh>
}
/** 插头：白色的方头，后面一截护线套 */
export function Plug({ three = false }: { three?: boolean }) {
  return <group>
    <RoundedBox args={[3.4, 4, 2.4]} radius={0.5} smoothness={3} position={[0, 0, 1.2]} castShadow><meshPhysicalMaterial color="#f3f2ee" roughness={0.35} clearcoat={0.4} /></RoundedBox>
    <mesh position={[0, -2.6, 1.2]}><cylinderGeometry args={[0.55, 0.7, 1.6, 14]} /><meshStandardMaterial color="#ebeae5" roughness={0.5} /></mesh>
    {three && <mesh position={[0, 1.2, 2.45]}><planeGeometry args={[0.8, 0.3]} /><meshBasicMaterial color="#c9c8c1" /></mesh>}
  </group>
}

/** 蒸汽：几团慢慢往上飘、变大、变淡的白雾 */
export function Steam({ on, at, n = 7, rise = 14 }: { on: number; at: P3; n?: number; rise?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]), t = useRef(0)
  useFrame((_, d) => {
    t.current += Math.min(d, 1 / 30)
    refs.current.forEach((m, i) => {
      if (!m) return
      const u = (t.current * 0.45 + i / n) % 1, s = 1 + u * 3
      m.position.set(at[0] + Math.sin(i * 2.1 + t.current) * u * 2, at[1] + u * rise, at[2] + Math.cos(i * 1.7) * u * 1.5)
      m.scale.setScalar(s); (m.material as THREE.MeshBasicMaterial).opacity = on * 0.22 * Math.sin(u * Math.PI)
    })
  })
  return <group>{Array.from({ length: n }, (_, i) => <mesh key={i} ref={e => { refs.current[i] = e }}><sphereGeometry args={[1, 12, 10]} /><meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} /></mesh>)}</group>
}

// ---------- 电水壶 ----------
/** 1.7 L 不锈钢电水壶：黑色的电源底座，壶身微微收腰，顶上翻盖，背后一只把手（把手根部是开关和蓝色指示灯），前面一只短壶嘴 */
export function Kettle({ on }: { on: boolean }) {
  const g = useMemo(() => {
    const body: RY[] = [[0, 2.4], [7.6, 2.4], [8.1, 3.2], [8.2, 6], [7.7, 14], [7.0, 19.5], [6.6, 20.3]]
    return {
      base: lathe([[0, 0], [9, 0], [9.3, 0.5], [9.1, 2.2], [0, 2.4]], { segs: 48 }),
      body: shell(body, 0.25, { segs: 56 }),
      lid: lathe([[0, 21.6], [6.4, 21.2], [6.9, 20.4], [6.6, 20.2], [0, 20.4]], { segs: 48, closed: true }),
      knob: lathe([[0, 21.4], [1.8, 21.4], [1.6, 22.6], [0, 22.8]], { segs: 24 }),
      spout: new THREE.CylinderGeometry(1.2, 2.4, 3.2, 20, 1, true),
      handle: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 18.6, -6.8), new THREE.Vector3(0, 19.6, -10.5), new THREE.Vector3(0, 15, -12.4), new THREE.Vector3(0, 8, -11.6), new THREE.Vector3(0, 4.6, -8.4)]), 40, 1.1, 14, false),
    }
  }, [])
  const black = <meshPhysicalMaterial color="#17181a" roughness={0.35} clearcoat={0.6} />
  return <group>
    <mesh geometry={g.base} castShadow receiveShadow>{black}</mesh>
    <mesh position={[0, 1.2, 9.25]}><planeGeometry args={[2.6, 0.5]} /><meshBasicMaterial color={on ? '#4aa8ff' : '#26313c'} toneMapped={!on} /></mesh>
    <mesh geometry={g.body} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" repeat={[3, 1]} rough={0.26} env={2.4} /></mesh>
    {/* 壶身下面一圈黑色的底圈、水位窗 */}
    <mesh position={[0, 3.2, 0]}><cylinderGeometry args={[8.15, 8.12, 1.6, 48, 1, true]} />{black}</mesh>
    <mesh geometry={g.lid} castShadow>{black}</mesh>
    <mesh geometry={g.knob} castShadow>{black}</mesh>
    <mesh geometry={g.spout} position={[0, 19.6, 7.4]} rotation-x={-0.9}>{black}</mesh>
    <mesh geometry={g.handle} castShadow>{black}</mesh>
    {/* 把手根部的开关：按下去时亮蓝光 */}
    <RoundedBox args={[2.2, 1.0, 1.8]} radius={0.3} smoothness={2} position={[0, 4.4, -9.75]}>{black}</RoundedBox>
    <mesh position={[0, 4.95, -9.75]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.6, 1.2]} /><meshStandardMaterial color="#1b2a3a" emissive="#3aa0ff" emissiveIntensity={on ? 2.5 : 0} toneMapped={!on} /></mesh>
    <Steam on={on ? 1 : 0} at={[0, 22.4, 7.8]} />
  </group>
}

// ---------- 电饭煲 ----------
/** 5 L 电饭煲：白色的圆筒，上面一只鼓起的翻盖，盖子上一只提手；前面一块黑色的控制面板，煮饭时红灯亮 */
export function RiceCooker({ on }: { on: boolean }) {
  const g = useMemo(() => ({
    body: lathe([[0, 0], [12.4, 0], [13.2, 0.8], [13.6, 3], [13.6, 14], [13.2, 15.2], [0, 15.4]], { segs: 64 }),
    lid: lathe([[0, 22], [6, 21.6], [10.5, 19.6], [12.8, 17], [13.4, 15.6], [13.2, 15.2], [0, 15.2]], { segs: 64, closed: true }),
    foot: new THREE.CylinderGeometry(12, 12.2, 0.6, 48),
  }), [])
  const label = useMemo(() => makeText(['煮饭  保温'], { w: 256, h: 64, bg: '#121315', fg: '#cfd3d6', size: 30 }), [])
  return <group>
    <mesh geometry={g.foot} position={[0, 0.3, 0]}><meshStandardMaterial color="#2a2b2d" roughness={0.7} /></mesh>
    <mesh geometry={g.body} position={[0, 0.5, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#efeee9" roughness={0.3} clearcoat={0.6} /></mesh>
    <mesh geometry={g.lid} position={[0, 0.5, 0]} castShadow><meshPhysicalMaterial color="#c9ccd0" metalness={0.5} roughness={0.25} clearcoat={0.6} /></mesh>
    <mesh position={[0, 16, 0]}><torusGeometry args={[13.25, 0.25, 8, 64]} /><meshStandardMaterial color="#2a2b2d" roughness={0.5} /></mesh>
    {/* 提手 */}
    <RoundedBox args={[8, 1.2, 1.6]} radius={0.5} smoothness={2} position={[0, 22.8, 0]} castShadow><meshStandardMaterial color="#2a2b2d" roughness={0.5} /></RoundedBox>
    {[-3.6, 3.6].map(x => <mesh key={x} position={[x, 22, 0]}><boxGeometry args={[0.9, 1.6, 1.4]} /><meshStandardMaterial color="#2a2b2d" roughness={0.5} /></mesh>)}
    {/* 控制面板 */}
    <group position={[0, 9, 13.3]} rotation-x={-0.05}>
      <RoundedBox args={[9, 5.4, 0.8]} radius={0.4} smoothness={2}><meshPhysicalMaterial color="#121315" roughness={0.25} clearcoat={0.8} /></RoundedBox>
      <mesh position={[0, 1.3, 0.41]}><planeGeometry args={[6, 1.5]} /><meshStandardMaterial map={label} roughness={0.5} /></mesh>
      {[-1.5, 1.5].map((x, i) => <mesh key={x} position={[x, -0.4, 0.42]}><circleGeometry args={[0.3, 16]} /><meshStandardMaterial color={i ? '#e9b23a' : '#ff3a2a'} emissive={i ? '#e9b23a' : '#ff3a2a'} emissiveIntensity={i === 0 && on ? 3 : 0} toneMapped={!(i === 0 && on)} /></mesh>)}
      <RoundedBox args={[3.6, 1.2, 0.5]} radius={0.3} smoothness={2} position={[0, -1.8, 0.4]}><meshStandardMaterial color="#d8d8d3" roughness={0.4} /></RoundedBox>
    </group>
    {/* 后面的排汽阀 */}
    <mesh position={[0, 20.2, -5]}><cylinderGeometry args={[1.4, 1.6, 0.8, 20]} /><meshStandardMaterial color="#2a2b2d" roughness={0.5} /></mesh>
    <Steam on={on ? 0.7 : 0} at={[0, 21.4, -5]} n={5} rise={10} />
  </group>
}

// ---------- 电烤箱 ----------
/** 30 L 电烤箱：黑色机身，前面一扇有把手的玻璃门，里面上下两根发热管（通电时发橙光），右边三只旋钮 */
export function Oven({ on }: { on: boolean }) {
  const W = 46, Hh = 28, D = 34
  const glow = useRef<THREE.MeshStandardMaterial>(null), k = useRef(0)
  useFrame((_, d) => { k.current += ((on ? 1 : 0) - k.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.9)); if (glow.current) glow.current.emissiveIntensity = k.current * 3 })
  const tube = (y: number) => <mesh position={[-4, y, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.45, 0.45, 30, 12]} /><meshStandardMaterial ref={y > 10 ? glow : undefined} color="#6a5c52" emissive="#ff6a1a" emissiveIntensity={0} toneMapped={false} roughness={0.5} /></mesh>
  return <group>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 3), 0.6, sz * (D / 2 - 3)]}><cylinderGeometry args={[1, 1.1, 1.2, 14]} /><meshStandardMaterial color="#141414" roughness={0.8} /></mesh>))}
    {/* 机壳：左右和顶是一整块，前面是门和控制条，里面是炉腔 */}
    <mesh position={[0, 1.2 + Hh / 2, -0.5]}><boxGeometry args={[W - 2, Hh - 2, D - 3]} /><meshStandardMaterial color="#3a3836" roughness={0.6} side={THREE.BackSide} /></mesh>
    {[[0, 1.2 + Hh - 0.6, 0, W, 1.2, D], [0, 1.8, 0, W, 1.2, D], [-W / 2 + 0.6, 1.2 + Hh / 2, 0, 1.2, Hh, D], [W / 2 - 0.6, 1.2 + Hh / 2, 0, 1.2, Hh, D], [0, 1.2 + Hh / 2, -D / 2 + 0.6, W, Hh, 1.2]].map(([x, y, z, w, h, d], i) =>
      <RoundedBox key={i} args={[w, h, d]} radius={0.5} smoothness={2} position={[x, y, z]} castShadow receiveShadow><meshPhysicalMaterial color="#1c1d1f" roughness={0.35} clearcoat={0.5} /></RoundedBox>)}
    <RoundedBox args={[10, Hh - 1, 1]} radius={0.4} smoothness={2} position={[W / 2 - 5.6, 1.2 + Hh / 2, D / 2 - 0.4]}><meshPhysicalMaterial color="#2a2b2e" roughness={0.3} clearcoat={0.5} /></RoundedBox>
    {[20, 13, 6].map(y => <group key={y} position={[W / 2 - 5.6, y + 1.2, D / 2 + 0.2]} rotation-x={Math.PI / 2}>
      <mesh castShadow><cylinderGeometry args={[1.8, 1.9, 1.6, 28]} /><Metal kind="aluminum" grain="turned" /></mesh>
    </group>)}
    {/* 玻璃门：黑色的门框，中间一块茶色玻璃，上面一根不锈钢把手 */}
    <group position={[-5.4, 1.2 + Hh / 2, D / 2]}>
      {[[0, Hh / 2 - 2.6, 34, 3.2], [0, -Hh / 2 + 2.2, 34, 2.4], [-15.4, 0, 3.2, Hh - 1], [15.4, 0, 3.2, Hh - 1]].map(([x, y, w, h], i) => <RoundedBox key={i} args={[w, h, 0.8]} radius={0.3} smoothness={2} position={[x, y, 0]}><meshPhysicalMaterial color="#121315" roughness={0.3} clearcoat={0.6} /></RoundedBox>)}
      <mesh position={[0, -0.4, 0.05]}><planeGeometry args={[28, 19.6]} /><meshPhysicalMaterial color="#3a2a1c" transparent opacity={0.42} roughness={0.05} envMapIntensity={1.4} depthWrite={false} /></mesh>
      {[-12, 12].map(x => <mesh key={x} position={[x, Hh / 2 - 2.6, 1.4]}><boxGeometry args={[0.8, 0.8, 2]} /><Metal kind="stainless" /></mesh>)}
      <mesh position={[0, Hh / 2 - 2.6, 2.4]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.6, 0.6, 26, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>
    </group>
    <group position={[0, 1.2, 0]}>{tube(Hh - 5)}{tube(5)}</group>
    {/* 烤网 */}
    <mesh position={[-4, 1.2 + Hh * 0.42, 0]}><boxGeometry args={[30, 0.2, 24]} /><meshStandardMaterial color="#9fa3a6" metalness={0.8} roughness={0.4} wireframe /></mesh>
    {on && <pointLight position={[-4, 1.2 + Hh / 2, 6]} color="#ff8a3a" intensity={k.current * 6} distance={30} decay={2} />}
  </group>
}

// ---------- 插线板 ----------
/** 四位插线板：长 36 cm，白色外壳，四个五孔位，一头一只带红色指示灯的总开关。孔位的 x（cm） */
export const STRIP_SLOTS = [-12, -4, 4, 12]
export function PowerStrip({ lit }: { lit: boolean }) {
  const dark = <meshStandardMaterial color="#141516" roughness={0.8} />
  return <group>
    <RoundedBox args={[40, 3.6, 6.4]} radius={1.2} smoothness={4} position={[0, 1.8, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#f4f3ef" roughness={0.32} clearcoat={0.5} /></RoundedBox>
    {STRIP_SLOTS.map(x => <group key={x} position={[x, 3.62, 0]} rotation-x={-Math.PI / 2}>
      <mesh position={[0, 0, 0]}><planeGeometry args={[6.4, 5.2]} /><meshStandardMaterial color="#ebeae5" roughness={0.45} /></mesh>
      {[-0.9, 0.9].map(dx => <mesh key={dx} position={[dx - 1.2, 1.2, 0.01]}><planeGeometry args={[0.2, 0.7]} />{dark}</mesh>)}
      <mesh position={[1.6, 1.4, 0.01]}><planeGeometry args={[0.2, 0.8]} />{dark}</mesh>
      {[[0.5, -0.6, 0.5], [2.7, -0.6, -0.5]].map(([dx, dy, a], i) => <mesh key={i} position={[dx, dy, 0.01]} rotation-z={a}><planeGeometry args={[0.2, 0.8]} />{dark}</mesh>)}
    </group>)}
    <RoundedBox args={[3, 0.8, 2.4]} radius={0.3} smoothness={2} position={[17.6, 3.9, 0]}><meshStandardMaterial color="#d23a2c" emissive="#ff3a2a" emissiveIntensity={lit ? 1.6 : 0} toneMapped={!lit} roughness={0.4} /></RoundedBox>
  </group>
}

// ---------- 试电笔 ----------
/** 笔式试电笔：长 14 cm。前面一截金属笔尖（一字口），透明的笔杆里依次是电阻、氖管、弹簧，后面是金属笔尾和笔挂。
 *  原点在笔尖，笔身沿 +z 方向（从墙里朝外伸出）。glow：氖管亮不亮 */
export function TestPen({ glow }: { glow: boolean }) {
  const neon = useRef<THREE.MeshStandardMaterial>(null), k = useRef(0)
  useFrame((_, d) => { k.current += ((glow ? 1 : 0) - k.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.05)); if (neon.current) neon.current.emissiveIntensity = k.current * 4 })
  return <group rotation-x={Math.PI / 2}>
    {/* 金属笔尖：伸在外面 2.8 cm */}
    <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.16, 0.16, 2.8, 12]} /><Metal kind="chrome" /></mesh>
    <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.3, 0.2, 0.08]} /><Metal kind="chrome" /></mesh>
    {/* 笔杆：透明的塑料管，前头一段收细的绝缘套 */}
    <mesh position={[0, 3.3, 0]}><cylinderGeometry args={[0.42, 0.25, 1.4, 20]} /><meshPhysicalMaterial color="#d6403a" roughness={0.4} clearcoat={0.4} /></mesh>
    <mesh position={[0, 7.4, 0]}><cylinderGeometry args={[0.5, 0.48, 7.0, 24, 1, true]} /><meshPhysicalMaterial color="#e8f0f4" transparent opacity={0.22} roughness={0.05} envMapIntensity={1.6} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    {/* 管里：电阻（黑色）、氖管（玻璃泡里两根电极）、弹簧 */}
    <mesh position={[0, 4.9, 0]}><cylinderGeometry args={[0.2, 0.2, 1.6, 12]} /><meshStandardMaterial color="#222" roughness={0.5} /></mesh>
    <mesh position={[0, 7.0, 0]}><capsuleGeometry args={[0.24, 1.8, 6, 14]} /><meshStandardMaterial ref={neon} color="#e8d9c8" emissive="#ff4a1a" emissiveIntensity={0} toneMapped={false} roughness={0.2} transparent opacity={0.85} /></mesh>
    {[-0.08, 0.08].map(x => <mesh key={x} position={[x, 7.0, 0]}><boxGeometry args={[0.05, 1.4, 0.05]} /><meshStandardMaterial color="#555" metalness={0.8} roughness={0.4} /></mesh>)}
    <mesh position={[0, 9.4, 0]}><cylinderGeometry args={[0.2, 0.2, 1.4, 10]} /><meshStandardMaterial color="#b9bcbf" metalness={0.9} roughness={0.3} wireframe /></mesh>
    {/* 笔尾：金属帽和笔挂，手指要按在这里 */}
    <mesh position={[0, 11.5, 0]}><cylinderGeometry args={[0.5, 0.5, 2.0, 24]} /><Metal kind="chrome" grain="turned" /></mesh>
    <mesh position={[0, 12.6, 0]}><sphereGeometry args={[0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><Metal kind="chrome" /></mesh>
    <mesh position={[0.62, 10.6, 0]}><boxGeometry args={[0.12, 3.6, 0.5]} /><Metal kind="chrome" /></mesh>
    {glow && <pointLight position={[0, 7, 0]} color="#ff5a2a" intensity={0.8} distance={4} decay={2} />}
  </group>
}

// ---------- 手 ----------
const FINGER = new THREE.CapsuleGeometry(0.62, 2.6, 6, 12)
/** 一只戴白色线手套的右手，带一截袖子（浅灰的家居服）。原点在食指指尖附近，手背朝上；pinch 时拇指和食指捏拢 */
export function Glove({ pinch = true, arm = 8.4 }: { pinch?: boolean; arm?: number }) {
  const knit = <meshStandardMaterial color="#ecebe5" roughness={0.95} />
  return <group>
    {/* 手掌 */}
    <RoundedBox args={[3.8, 1.9, 4.6]} radius={0.85} smoothness={3} position={[0, 0.2, 5.6]} castShadow>{knit}</RoundedBox>
    {/* 食指伸直搭在笔尾上，其余三指弯着握住笔杆 */}
    <mesh geometry={FINGER} position={[-0.9, 0.5, 2.0]} rotation-x={Math.PI / 2 + 0.12} castShadow>{knit}</mesh>
    {[0.25, 1.35].map((x, i) => <mesh key={x} geometry={FINGER} position={[x, -0.6, 3.0 - i * 0.2]} rotation={[Math.PI / 2 + 1.0, 0, 0.1]} scale={[1, 0.85, 1]} castShadow>{knit}</mesh>)}
    <mesh geometry={FINGER} position={[2.0, -0.4, 3.5]} rotation={[Math.PI / 2 + 0.9, 0, 0.2]} scale={[0.9, 0.7, 0.9]} castShadow>{knit}</mesh>
    <mesh geometry={FINGER} position={[-2.1, -0.5, pinch ? 3.6 : 4.4]} rotation={[Math.PI / 2 + 0.5, 0, -0.9]} scale={[1.05, 0.8, 1.05]} castShadow>{knit}</mesh>
    {/* 手腕的罗纹口、袖子 */}
    <mesh position={[0, 0.2, 8.4]} rotation-x={Math.PI / 2}><cylinderGeometry args={[1.8, 1.7, 1.4, 24]} /><meshStandardMaterial color="#dcdad3" roughness={0.95} /></mesh>
    <mesh position={[0, 0.3, 9 + arm / 2]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[2.5, 2.2, arm, 24]} /><meshStandardMaterial color="#8d97a3" roughness={0.9} /></mesh>
  </group>
}

/** 墙里的一根电线（场景单位）：沿折线走，拐角处倒一点圆；flow 是电流（A），有电流时亮点沿线走。透视墙的时候画在墙面前一点点 */
export function HouseWire({ pts, color, flow = 0, r = 0.16, max = 1 }: { pts: P3[]; color: string; flow?: number; r?: number; max?: number }) {
  const { geo, curve, len } = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>()
    const v = pts.map(p => new THREE.Vector3(...p))
    for (let i = 0; i < v.length - 1; i++) path.add(new THREE.LineCurve3(v[i], v[i + 1]))
    return { curve: path, len: path.getLength(), geo: new THREE.TubeGeometry(path, Math.max(16, v.length * 24), r, 8, false) }
  }, [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>
    <mesh geometry={geo}><meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={0.15} /></mesh>
    {Math.abs(flow) > 1e-6 && <Flow curve={curve} len={len} flow={flow} size={1.4} max={max} />}
  </group>
}
