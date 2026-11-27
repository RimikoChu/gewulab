// 带电粒子在磁场中 · 第 3 课 圆周运动的半径的器材：实验台上一只黑色遮光罩，里面是洛伦兹力演示仪——
// 一对亥姆霍兹线圈（漆包线绕在黑色骨架上，两只线圈相距一个半径，轴线朝前），中间一只充了稀薄气体的玻璃泡，
// 泡底一支电子枪。电子束在泡里发出蓝绿色的辉光；线圈通电后弯成一个圆。右边一台电源。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { COL, ST, TOP } from './layout'
import { makeWinding, makeWindingRough } from './mats'
import { BULB, type V2, type V3 } from './physics'
import { Bench, Post, RED, Supply, Wire, supplyPosts } from './gear'
import { Comet, FieldMarks, Glow } from './fx'

/** 器材的位置：玻璃泡的中心、电子枪口（泡坐标）、电源 */
export const R3 = {
  bulb: [0, TOP + 0.235, 0] as V3, gun: [0, -0.05] as V2,
  supply: [0.5, TOP, -0.18] as V3,
}
/** 泡坐标（原点在泡心，x 向右、y 向上，在纸面里）换成这一课台子的坐标 */
const B3 = (p: V2, z = 0): V3 => [R3.bulb[0] + p[0], R3.bulb[1] + p[1], R3.bulb[2] + z]
const IN = BULB.R - 0.003   // 玻璃内壁的半径

/** 电子束的路：从枪口水平向右射出；r 为 Infinity 时是直线，否则逆时针转（磁场指向纸外，电子带负电）。碰到玻璃壁或转满一圈为止 */
export function beamPath(r: number): V2[] {
  const [gx, gy] = R3.gun, pts: V2[] = []
  if (!isFinite(r)) { for (let x = gx; x * x + gy * gy < IN * IN; x += 0.003) pts.push([x, gy]); return pts }
  const n = 160
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, p: V2 = [gx + r * Math.sin(a), gy + r * (1 - Math.cos(a))]
    if (p[0] * p[0] + p[1] * p[1] > IN * IN) break
    pts.push(p)
  }
  return pts
}

/** 一只亥姆霍兹线圈：黑色骨架（两片圆环挡边、一圈底筒），中间绕满漆包线；轴线沿 z */
function Coil() {
  const R = BULB.coil, W = 0.034, H = 0.024
  const geo = useMemo(() => {
    const winding = lathe([[R - H / 2, -W / 2], [R + H / 2, -W / 2], [R + H / 2, W / 2], [R - H / 2, W / 2]], { segs: 96, crease: 30, closed: true }); winding.rotateX(Math.PI / 2)
    const flange = disc(R + H / 2 + 0.008, 0.004, { hole: R - H / 2 - 0.004, segs: 96 }); flange.rotateX(Math.PI / 2)
    return { winding, flange }
  }, [R])
  const wind = useMemo(() => { const t = makeWinding([168, 82, 38], 48).clone(); t.repeat.set(1, 1); t.needsUpdate = true; return t }, [])
  const rough = useMemo(() => makeWindingRough(48), [])
  const plastic = <meshPhysicalMaterial color="#1a1b1d" roughness={0.4} clearcoat={0.4} />
  return <group>
    <mesh geometry={geo.winding} castShadow receiveShadow><meshPhysicalMaterial map={wind} roughnessMap={rough} roughness={0.5} metalness={0.55} clearcoat={0.8} clearcoatRoughness={0.15} /></mesh>
    {[-1, 1].map(s => <mesh key={s} geometry={geo.flange} position={[0, 0, s * (W / 2 + 0.002)]} castShadow>{plastic}</mesh>)}
  </group>
}

/** 玻璃泡：球形，下面一段细颈插进黑色灯座；泡里泡底一支电子枪（灯丝、阳极筒），泡后一把刻度尺 */
function Bulb({ gun }: { gun: boolean }) {
  const geo = useMemo(() => {
    const prof: [number, number][] = []
    for (let i = 0; i <= 28; i++) { const a = -Math.PI / 2 + 0.26 + i / 28 * (Math.PI - 0.26); prof.push([BULB.R * Math.cos(a), BULB.R * Math.sin(a)]) }
    prof.unshift([0.016, -BULB.R - 0.03], [0.02, -BULB.R + 0.004])
    const glass = shell(prof, 0.0018, { segs: 64 })
    const socket = lathe([[0, 0], [0.034, 0], [0.036, 0.004], [0.036, 0.04], [0.026, 0.05], [0.02, 0.052], [0, 0.052]], { segs: 40 })
    return { glass, socket, anode: shell([[0.006, 0], [0.006, 0.022]], 0.0008, { segs: 24 }) }
  }, [])
  return <group>
    <mesh geometry={geo.glass} renderOrder={9}><meshPhysicalMaterial color="#a9bcc2" transparent opacity={0.05} roughness={0.03} envMapIntensity={0.3} depthWrite={false} side={THREE.DoubleSide} clearcoat={1} /></mesh>
    <mesh position={[0, -BULB.R - 0.08 - (R3.bulb[1] - TOP - 0.03 - BULB.R - 0.08) / 2, 0]}><cylinderGeometry args={[0.012, 0.016, R3.bulb[1] - TOP - 0.03 - BULB.R - 0.08, 20]} /><Metal kind="aluminum" grain="turned" /></mesh>
    <mesh geometry={geo.socket} position={[0, -BULB.R - 0.08, 0]} castShadow><meshPhysicalMaterial color="#1b1c1e" roughness={0.4} clearcoat={0.4} /></mesh>
    {/* 电子枪：从灯座伸上来的玻璃柱，顶上横着一只阳极筒，枪口朝右 */}
    <mesh position={[R3.gun[0] - 0.012, (R3.gun[1] - BULB.R) / 2, 0]}><cylinderGeometry args={[0.004, 0.005, BULB.R + R3.gun[1] + 0.01, 12]} /><meshPhysicalMaterial color="#dfe9ea" transparent opacity={0.4} roughness={0.1} /></mesh>
    <group position={[R3.gun[0] - 0.022, R3.gun[1], 0]} rotation-z={-Math.PI / 2}><mesh geometry={geo.anode}><Metal kind="stainless" grain="turned" /></mesh></group>
    <mesh position={[R3.gun[0] - 0.024, R3.gun[1], 0]}><sphereGeometry args={[0.0028, 10, 8]} /><meshBasicMaterial color={gun ? '#ffb35a' : '#3a2e24'} toneMapped={!gun} /></mesh>
    {/* 泡后面立着的刻度尺（看圆的直径） */}
  </group>
}

/** on：电子枪接通；B：磁场（T，0 表示线圈没通电）；U：加速电压；r：圆的半径（m，Infinity 表示直线）；clock：画面里的时间 */
export function Rig3({ on = false, B = 0, U = BULB.U0, r = Infinity, clock = () => -1 }: { on?: boolean; B?: number; U?: number; r?: number; clock?: () => number }) {
  const path = useMemo(() => beamPath(r), [Math.round((isFinite(r) ? r : 9) * 2e4)])   // eslint-disable-line react-hooks/exhaustive-deps
  const glow = useMemo(() => path.map(p => B3(p)), [path])
  const len = path.length
  // 电子沿着辉光跑：转一圈 2 秒（画面放慢）；不是闭合的圆时，从枪口跑到玻璃壁
  const at = (k: number) => (t: number): V3 | null => {
    if (!on || t < 0 || len < 2) return null
    const f = (((t / 2 + k / 4) % 1) + 1) % 1 * (len - 1), i = Math.min(len - 2, Math.floor(f)), w = f - i
    return B3([path[i][0] + (path[i + 1][0] - path[i][0]) * w, path[i][1] + (path[i + 1][1] - path[i][1]) * w], 0.002)
  }
  const P = supplyPosts(), sp = R3.supply, plus: V3 = [sp[0] + P.plus[0], sp[1] + P.plus[1], sp[2] + P.plus[2]], minus: V3 = [sp[0] + P.minus[0], sp[1] + P.minus[1], sp[2] + P.minus[2]]
  const c = R3.bulb, sep = BULB.coil / 2
  const aim = useMemo(() => new THREE.Object3D(), [])
  return <group position={[ST.l3, 0, 0]}>
    <Bench w={1.4} />
    {/* 遮光罩：黑色绒布蒙在铝框上，前面敞开 */}
    <group position={[-0.02, TOP, -0.12]}>
      <mesh position={[0, 0.27, -0.2]}><boxGeometry args={[0.72, 0.54, 0.01]} /><meshStandardMaterial color="#0b0c0e" roughness={1} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 0.36, 0.27, 0.0]}><boxGeometry args={[0.01, 0.54, 0.4]} /><meshStandardMaterial color="#0d0e10" roughness={1} /></mesh>)}
      <mesh position={[0, 0.545, 0]}><boxGeometry args={[0.73, 0.01, 0.41]} /><meshStandardMaterial color="#0d0e10" roughness={1} /></mesh>
      {[-1, 1].map(s => <mesh key={`f${s}`} position={[s * 0.365, 0.27, 0.2]}><boxGeometry args={[0.012, 0.55, 0.012]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      <mesh position={[0, 0.55, 0.2]}><boxGeometry args={[0.74, 0.012, 0.012]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    </group>
    {/* 底座：黑色仪器底板，两只线圈的支架 */}
    <RoundedBox args={[0.42, 0.03, 0.26]} radius={0.006} smoothness={2} position={[c[0], TOP + 0.015, c[2]]} castShadow receiveShadow><meshPhysicalMaterial color="#232528" roughness={0.45} clearcoat={0.3} /></RoundedBox>
    {[-1, 1].map(s => <group key={s} position={[c[0], c[1], c[2] + s * sep]}>
      <Coil />
      <RoundedBox args={[0.07, c[1] - TOP - 0.03 - BULB.coil - 0.008, 0.044]} radius={0.004} smoothness={2} position={[0, -(BULB.coil + 0.008 + (c[1] - TOP - 0.03 - BULB.coil - 0.008) / 2), 0]} castShadow><meshPhysicalMaterial color="#1a1b1d" roughness={0.4} clearcoat={0.4} /></RoundedBox>
      <Post at={[0, BULB.coil + 0.016, 0]} color={s > 0 ? RED : '#1c1d1f'} />
    </group>)}
    {/* 遮光罩里一盏柔光：从前上方斜着照，线圈、底座、电源看得清；泡里仍然够暗，辉光显得出来 */}
    <primitive object={aim} position={[c[0], c[1] - 0.05, c[2]]} />
    <spotLight target={aim} position={[c[0] - 0.35, c[1] + 0.55, c[2] + 0.75]} angle={0.6} penumbra={1} intensity={5} distance={3} decay={1.2} color="#fff1df" />
    <pointLight position={[c[0] + 0.45, c[1] + 0.1, c[2] + 0.5]} intensity={0.35} distance={1.6} color="#dfe8ff" />
    <group position={c}><Bulb gun={on} /></group>
    {/* 电子束的辉光和沿着它跑的电子 */}
    <Glow pts={glow} level={on ? 1 : 0} r={0.003} halo={6} />
    <Glow pts={glow} level={on ? 0.35 : 0} r={0.009} halo={2.2} />
    {[0, 1, 2, 3].map(k => <Comet key={k} pos={at(k)} clock={clock} color={COL.neg} size={0.0024} tail={0.3} n={18} />)}
    {/* 线圈通电时，泡里是指向纸外的匀强磁场：画一层 · */}
    <FieldMarks w={0.15} h={0.15} kind="out" step={0.025} opacity={B > 0 ? 0.55 : 0} position={[c[0], c[1] + 0.005, c[2] + BULB.R + 0.01]} />
    <Wire pts={[plus, [plus[0], plus[1] + 0.05, plus[2] + 0.04], [0.3, TOP + 0.03, -0.12], [0.16, TOP + 0.44, -0.12], [c[0], c[1] + BULB.coil + 0.07, c[2] + sep - 0.02], [c[0], c[1] + BULB.coil + 0.024, c[2] + sep]]} color={RED} flow={B > 0 ? 1 : 0} />
    <Wire pts={[minus, [minus[0], minus[1] + 0.06, minus[2] - 0.02], [0.32, TOP + 0.03, -0.16], [0.15, TOP + 0.43, -0.16], [c[0], c[1] + BULB.coil + 0.07, c[2] - sep - 0.02], [c[0], c[1] + BULB.coil + 0.024, c[2] - sep]]} color="#1c1d1f" flow={B > 0 ? -1 : 0} />
    <group position={R3.supply} rotation-y={-0.35}><Supply name="演示仪电源" screens={[on ? `${Math.round(U)}V` : '0V', `${(B * 1e3).toFixed(2)}mT`]} on={on} accent="#2b8f80" /></group>
  </group>
}
