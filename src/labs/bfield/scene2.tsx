// 带电粒子在磁场中 · 第 2 课 洛伦兹力的器材：木架上夹着一支电子射线管（玻璃管、左端阴极、右端阳极，管里一块斜放的荧光屏），
// 两根高压线接到右边的高压电源；一只戴手套的右手拿着条形磁体，从前面靠近管子。
// 电子束在荧光屏上留下一道蓝绿色的亮线；磁体靠近时，管里画出 × 或 · 表示垂直纸面的磁场。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { COL, ST, TOP } from './layout'
import { makeGrid, makeText } from './mats'
import { CRT, arc, crtRadius, type V2, type V3 } from './physics'
import { Bench, GRIP_UP, Hand, Post, RED, Supply, Wire, supplyPosts } from './gear'
import { Arrow, Comet, FieldMarks, Glow } from './fx'

/** 器材的位置（m，以这一课的台子中心为原点）：管子的中心、荧光屏的范围（管子坐标里的 x） */
export const R2 = {
  tube: [-0.04, TOP + 0.17, 0] as V3, len: 0.3, rad: 0.032,
  screen: { x0: -0.1, x1: 0.1, h: 0.05 },
  field: { x0: -0.05, x1: 0.07 },
  supply: [0.4, TOP, 0.06] as V3,
}
/** 管子坐标（原点在管子中心，x 沿管子）换成这一课台子的坐标 */
const T = (p: V2, z = 0.0015): V3 => [R2.tube[0] + p[0], R2.tube[1] + p[1], R2.tube[2] + z]

/** 电子在荧光屏上走的路：先直线，进入磁场后沿圆弧拐弯，出了荧光屏就停。bend：+1 向上、−1 向下、0 不弯。返回途经的点和每一点的方向 */
export function crtPath(bend: number) {
  const r = crtRadius(), pts: { p: V2; a: number }[] = [], S = R2.screen
  for (let x = S.x0; x < R2.field.x0 - 1e-6; x += 0.005) pts.push({ p: [x, 0], a: 0 })
  if (!bend) { for (let x = R2.field.x0; x <= S.x1; x += 0.005) pts.push({ p: [x, 0], a: 0 }); return pts }
  for (let s = 0; s < 0.3; s += 0.003) {   // 从磁场边界起沿圆弧走（第一个点就是边界，前面的直线段不含它）
    const e = arc([R2.field.x0, 0], 0, r, bend, s)
    if (e.p[0] > S.x1 || Math.abs(e.p[1]) > S.h / 2) break
    pts.push(e)
  }
  return pts
}

/** 条形磁体：一半红（N）一半蓝（S），长 0.15 m；N 端朝 +x */
function BarMagnet() {
  const n = makeText(['N'], { w: 128, h: 128, bg: 'transparent', fg: '#f6f2e8', size: 90, weight: 800 }), s = makeText(['S'], { w: 128, h: 128, bg: 'transparent', fg: '#f6f2e8', size: 90, weight: 800 })
  const paint = (c: string) => <meshPhysicalMaterial color={c} roughness={0.32} clearcoat={0.7} clearcoatRoughness={0.2} />
  return <group>
    <RoundedBox args={[0.075, 0.022, 0.03]} radius={0.003} smoothness={2} position={[0.0375, 0, 0]} castShadow>{paint('#c4342b')}</RoundedBox>
    <RoundedBox args={[0.075, 0.022, 0.03]} radius={0.003} smoothness={2} position={[-0.0375, 0, 0]} castShadow>{paint('#2c57a5')}</RoundedBox>
    <mesh position={[0.05, 0.0111, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.02, 0.02]} /><meshBasicMaterial map={n} transparent /></mesh>
    <mesh position={[-0.05, 0.0111, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.02, 0.02]} /><meshBasicMaterial map={s} transparent /></mesh>
  </group>
}

/** 电子射线管：玻璃管、两端的电极、管里的荧光屏 */
function Tube({ on }: { on: boolean }) {
  const L = R2.len, r = R2.rad
  const geo = useMemo(() => {
    // 玻璃管：中间是直的，两头收成圆肩，再接一段细颈插进电极座
    const prof: [number, number][] = [[0.012, -L / 2 - 0.01], [0.014, -L / 2 + 0.004], [r * 0.8, -L / 2 + 0.018], [r, -L / 2 + 0.035], [r, L / 2 - 0.035], [r * 0.8, L / 2 - 0.018], [0.014, L / 2 - 0.004], [0.012, L / 2 + 0.01]]
    const g = shell(prof, 0.0016, { segs: 48 }); g.rotateZ(-Math.PI / 2)
    const cap = lathe([[0, 0], [0.017, 0], [0.019, 0.003], [0.019, 0.03], [0.016, 0.034], [0.006, 0.036], [0, 0.036]], { segs: 32 })
    return { glass: g, cap, ring: disc(0.0185, 0.004, { hole: 0.012 }) }
  }, [L, r])
  const grid = makeGrid([20, 5], '#3d4c48', 'rgba(190,230,215,0.35)')
  const S = R2.screen
  return <group>
    <mesh geometry={geo.glass} renderOrder={9}><meshPhysicalMaterial color="#eef6f8" transparent opacity={0.16} roughness={0.04} envMapIntensity={1.6} depthWrite={false} side={THREE.DoubleSide} clearcoat={1} /></mesh>
    {/* 两端的电极座：左边阴极（黑色胶木座、四根插针），右边阳极 */}
    {[-1, 1].map(s => <group key={s} position={[s * (L / 2 + 0.005), 0, 0]} rotation-z={s * -Math.PI / 2}>
      <mesh geometry={geo.cap} castShadow><meshPhysicalMaterial color="#1d1e20" roughness={0.38} clearcoat={0.5} /></mesh>
      <mesh geometry={geo.ring} position={[0, 0.002, 0]}><Metal kind="aluminum" grain="turned" /></mesh>
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 0.008, 0.042, Math.sin(i * Math.PI / 2) * 0.008]}><cylinderGeometry args={[0.0012, 0.0012, 0.012, 8]} /><Metal kind="brass" /></mesh>)}
    </group>)}
    {/* 阴极（灯丝座）和阳极上的狭缝 */}
    <mesh position={[-L / 2 + 0.03, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.005, 0.005, 0.02, 16]} /><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[-L / 2 + 0.042, 0, 0]}><sphereGeometry args={[0.0022, 10, 8]} /><meshBasicMaterial color={on ? '#ffb15c' : '#4b3a2b'} toneMapped={!on} /></mesh>
    <mesh position={[S.x0 - 0.006, 0, 0]} rotation-y={Math.PI / 2}><boxGeometry args={[0.03, 0.03, 0.0012]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    {/* 荧光屏：白底方格，略往后仰，屏后有两根支杆 */}
    <mesh position={[(S.x0 + S.x1) / 2, 0, 0]}><planeGeometry args={[S.x1 - S.x0, S.h]} /><meshStandardMaterial map={grid} roughness={0.85} emissive="#0d2a24" emissiveIntensity={on ? 0.5 : 0} /></mesh>
    <mesh position={[(S.x0 + S.x1) / 2, 0, -0.0012]}><boxGeometry args={[S.x1 - S.x0 + 0.004, S.h + 0.004, 0.001]} /><meshStandardMaterial color="#9da7aa" roughness={0.6} /></mesh>
  </group>
}

/**
 * on：高压接通；near：磁体靠近的程度（0 拿开，1 贴近管子）；face：朝前的一端；show：显示一颗电子的速度和受力；
 * clock：画面里的时间（秒）
 */
export function Rig2({ on = false, near = 0, face = 'N', show = false, clock = () => -1 }: { on?: boolean; near?: number; face?: 'N' | 'S'; show?: boolean; clock?: () => number }) {
  const bend = near > 0.98 ? (face === 'N' ? -1 : 1) : 0
  const path = useMemo(() => crtPath(bend), [bend])
  const glow = useMemo(() => path.map(e => T(e.p)), [path])
  // 电子沿着亮线跑：每 0.9 秒一颗，跑完一趟用 1.4 秒（画面放慢）
  const len = path.length, dur = 1.4
  const at = (k: number) => (t: number): V3 | null => {
    if (!on || t < 0) return null
    const f = ((t + k * dur / 3) % dur) / dur * (len - 1), i = Math.min(len - 2, Math.floor(f)), w = f - i
    const a = path[i].p, b = path[i + 1].p
    return T([a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w], 0.004)
  }
  // 显示速度和受力：沿亮线取三颗电子，各画一支速度箭头（白）和洛伦兹力箭头（品红），看出两者总是垂直、速度一样长
  const marks = show && on ? [0.3, 0.62, 0.92].map(u => path[Math.min(len - 1, Math.floor(len * u))]) : []
  const P = supplyPosts(), sp = R2.supply
  const plus: V3 = [sp[0] + P.plus[0], sp[1] + P.plus[1], sp[2] + P.plus[2]], minus: V3 = [sp[0] + P.minus[0], sp[1] + P.minus[1], sp[2] + P.minus[2]]
  const tb = R2.tube, L = R2.len
  return <group position={[ST.l2, 0, 0]}>
    <Bench w={1.4} />
    {/* 木架：底板、两根立柱、两只夹住管子的弹簧夹 */}
    <RoundedBox args={[0.36, 0.02, 0.12]} radius={0.004} smoothness={2} position={[tb[0], TOP + 0.01, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#b88a58" roughness={0.55} clearcoat={0.3} /></RoundedBox>
    {[-1, 1].map(s => <group key={s} position={[tb[0] + s * 0.1, TOP + 0.02, -0.0]}>
      <mesh position={[0, (tb[1] - TOP - 0.02 - R2.rad) / 2, 0]} castShadow><cylinderGeometry args={[0.005, 0.006, tb[1] - TOP - 0.02 - R2.rad, 14]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[0, tb[1] - TOP - 0.02, 0]} rotation-z={Math.PI / 2}><torusGeometry args={[R2.rad + 0.002, 0.0022, 8, 32, Math.PI * 1.3]} /><Metal kind="stainless" /></mesh>
    </group>)}
    <group position={tb}><Tube on={on} /></group>
    <Glow pts={glow} level={on ? 1 : 0} r={0.0022} halo={4} />
    {[0, 1, 2].map(k => <Comet key={k} pos={at(k)} clock={clock} color={COL.neg} size={0.0028} tail={0.35} n={20} />)}
    {/* 磁场：磁体贴近时，荧光屏那一段画上 × 或 · */}
    <FieldMarks w={R2.field.x1 - R2.field.x0 + 0.04} h={0.05} kind={face === 'N' ? 'in' : 'out'} step={0.014} opacity={bend ? 1 : 0} position={[tb[0] + (R2.field.x0 + R2.field.x1) / 2 + 0.02, tb[1], tb[2] + R2.rad + 0.004]} />
    {marks.map((e, i) => { const p = T(e.p, 0.006); return <group key={i}>
      <mesh position={p} renderOrder={9}><sphereGeometry args={[0.0034, 14, 10]} /><meshBasicMaterial color={COL.neg} toneMapped={false} depthTest={false} /></mesh>
      <Arrow from={p} dir={[Math.cos(e.a), Math.sin(e.a), 0]} len={0.045} color={COL.v} thick={0.045} />
      {bend !== 0 && <Arrow from={p} dir={[-Math.sin(e.a) * bend, Math.cos(e.a) * bend, 0]} len={0.032} color={COL.FB} thick={0.045} />}
    </group> })}
    {/* 高压线：从电源接到管子两端 */}
    <Wire pts={[plus, [plus[0], plus[1] + 0.06, plus[2] + 0.02], [0.22, TOP + 0.08, 0.06], [tb[0] + L / 2 + 0.06, tb[1], 0.0], [tb[0] + L / 2 + 0.045, tb[1], 0]]} color={RED} r={0.003} />
    <Wire pts={[minus, [minus[0], minus[1] + 0.05, minus[2] - 0.04], [0.2, TOP + 0.03, -0.12], [-0.1, TOP + 0.02, -0.12], [tb[0] - L / 2 - 0.08, tb[1] - 0.04, -0.02], [tb[0] - L / 2 - 0.045, tb[1], 0]]} color="#1c1d1f" r={0.003} />
    <group position={R2.supply} rotation-y={-0.3}><Supply name="高压电源" screens={[on ? `${(CRT.U / 1000).toFixed(1)}kV` : '0.0kV', on ? 'ON' : 'OFF']} on={on} accent="#c43a2b" /></group>
    {/* 拿磁体的手：磁体在管子前下方，斜着指向荧光屏，朝管子的一端是 face；手从下面托着握住它 */}
    <group position={[tb[0] + 0.085, tb[1] - 0.07 - 0.05 * (1 - near), 0.065 + 0.3 * (1 - near)]} rotation-x={0.85}>
      <group rotation-y={face === 'N' ? Math.PI / 2 : -Math.PI / 2}><BarMagnet /></group>
      <group position={[0.012, -0.03, 0.06]} quaternion={GRIP_UP}><Hand side="right" curl={1.2} thumb={0.5} scale={0.72} sleeve={0.06} /></group>
    </group>
  </group>
}
export { Post }
