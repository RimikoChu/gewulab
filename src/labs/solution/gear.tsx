// 化验台上的器材：烧杯、玻璃棒、药匙、手套、温度计、三脚架和酒精灯、蒸发皿、电子天平、量筒、试剂瓶、汽水瓶、冷水槽。
// 尺寸都按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里（多半是底面正中）。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Led, Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { M } from './world'
import { beakerScaleTex, bottleLabel, cylScaleTex, thermoTex } from './mats'

export const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
const memo = <K, T>(f: (k: K) => T) => { const c = new Map<K, T>(); return (k: K) => { if (!c.has(k)) c.set(k, f(k)); return c.get(k)! } }

/** 玻璃：容器里还要画东西，用便宜的做法（半透明、不写深度、双面），反光调亮。底色压暗，免得给里面的液体蒙一层白雾 */
export const Glass = ({ tint = '#1a2629', opacity = 0.15 }: { tint?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={tint} transparent opacity={Math.min(0.5, opacity * 1.5)} roughness={0.03} metalness={0} clearcoat={1} clearcoatRoughness={0.03} envMapIntensity={2.6} depthWrite={false} side={THREE.DoubleSide} />

/** 一段液体：圆柱形的液体加一层亮的液面，液面边上一圈略亮的凹液面。原点在液体底面正中 */
export function LiquidBody({ r, h, color, opacity, top = true }: { r: number; h: number; color: string; opacity: number; top?: boolean }) {
  if (h < 0.002) return null
  return <>
    <mesh position={[0, h / 2, 0]} renderOrder={5}><cylinderGeometry args={[r, r * 0.99, h, 40]} /><meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.5} envMapIntensity={0.3} depthWrite={false} /></mesh>
    {top && <mesh position={[0, h + 0.001, 0]} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r, 40]} /><meshPhysicalMaterial color={color} transparent opacity={Math.min(0.9, opacity + 0.12)} roughness={0.05} clearcoat={0.7} envMapIntensity={1} depthWrite={false} /></mesh>}
    {top && <mesh position={[0, h - 0.004 * M / 6, 0]} renderOrder={5}><cylinderGeometry args={[r * 1.001, r * 1.001, 0.012, 40, 1, true]} /><meshBasicMaterial color="#e9f6fa" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} /></mesh>}
  </>
}
/** 水的颜色：清水淡淡的青 */
export const WATER = { color: '#bfe0e8', opacity: 0.24 }

// ---------- 烧杯 ----------
export const BEAKER = { 100: { r: 0.026, h: 0.07 }, 250: { r: 0.035, h: 0.095 }, 500: { r: 0.043, h: 0.12 } } as const
export type Vol = keyof typeof BEAKER
const beakerGeo = memo((vol: Vol) => {
  const { r, h } = BEAKER[vol]
  return shell(m([[0, 0], [r - 0.004, 0], [r, 0.004], [r, h - 0.004], [r + 0.0018, h - 0.0008], [r + 0.0024, h]]), 0.0018 * M, { segs: 56 })
})
/** 烧杯的嘴：杯口一侧往外翻出的一小段 */
const spoutGeo = memo((vol: Vol) => {
  const { r, h } = BEAKER[vol], g = new THREE.TorusGeometry(0.004 * M, 0.0012 * M, 8, 16, Math.PI)
  g.rotateY(Math.PI / 2); g.rotateX(Math.PI / 2 + 0.35); g.translate((r + 0.0012) * M, h * M - 0.0004 * M, 0)
  return g
})
/** 一只烧杯，原点在杯底正中。level 液面高度（m，从杯底内面算）；color、opacity 液体的样子；children 放在杯底内面上（晶体、沉淀） */
export function Beaker({ vol, level = 0, color = WATER.color, opacity = WATER.opacity, marks = true, children }: { vol: Vol; level?: number; color?: string; opacity?: number; marks?: boolean; children?: ReactNode }) {
  const { r, h } = BEAKER[vol], R = r * M, H = h * M, wall = 0.0018 * M
  return <group>
    <mesh geometry={beakerGeo(vol)} renderOrder={6}><Glass /></mesh>
    <mesh geometry={spoutGeo(vol)} renderOrder={6}><Glass /></mesh>
    {marks && <mesh position={[0, H * 0.46, 0]} rotation-y={-0.4} renderOrder={7}><cylinderGeometry args={[R + 0.004, R + 0.004, H * 0.8, 32, 1, true, -0.55, 1.1]} /><meshBasicMaterial map={beakerScaleTex(vol)} transparent opacity={0.85} depthWrite={false} side={THREE.FrontSide} /></mesh>}
    <group position-y={wall}>
      {level > 0.001 && <LiquidBody r={R - wall - 0.002} h={level * M} color={color} opacity={opacity} />}
      {children}
    </group>
  </group>
}

// ---------- 玻璃棒、药匙、手套 ----------
/** 玻璃棒：实心的细玻璃棒，两头烧圆。原点在下端，沿 y 朝上 */
export function GlassRod({ len = 0.2 }: { len?: number }) {
  const g = useMemo(() => lathe(m([[0, 0], [0.0022, 0.0006], [0.003, 0.003], [0.003, len - 0.003], [0.0022, len - 0.0006], [0, len]]), { segs: 16 }), [len])
  return <mesh geometry={g} renderOrder={7}><meshPhysicalMaterial color="#eef7f8" transparent opacity={0.55} roughness={0.03} clearcoat={1} envMapIntensity={2.4} depthWrite={false} /></mesh>
}
/** 药匙：不锈钢的，一头一个小勺。原点在勺心，柄朝 +x；load 勺里盛了多少，color 盛的东西的颜色 */
export function Spoon({ load = 0, color = '#f2f3ef' }: { load?: number; color?: string }) {
  return <group>
    <mesh scale={[1, 0.35, 0.75]}><sphereGeometry args={[0.012 * M, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><Metal kind="stainless" /></mesh>
    <mesh position={[0.08 * M, 0.004 * M, 0]} rotation-z={Math.PI / 2 - 0.06}><boxGeometry args={[0.004 * M, 0.14 * M, 0.0012 * M]} /><Metal kind="stainless" grain="brushed" /></mesh>
    {load > 0.05 && <mesh position-y={0.001 * M} scale={[1, 0.5 * load, 0.7]}><sphereGeometry args={[0.01 * M, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>}
  </group>
}
const FINGER = (() => { const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -1.3, 1.1], [0, -2.5, 0.6], [0, -2.8, -0.9], [0, -2.1, -1.9]].map(p => new THREE.Vector3(p[0], p[1], p[2]))); return new THREE.TubeGeometry(c, 20, 0.9, 10) })()
/** 一只握着东西的手：蓝色丁腈手套、袖口、一截白大褂的袖子。握着的东西从拳心穿过，拳心在原点；手腕朝 +y，手背朝 −z。s 是大小 */
export function Glove({ s = 0.0046 * M }: { s?: number }) {
  const glove = <meshStandardMaterial color="#4f7fc8" roughness={0.55} />
  const L = 10
  return <group scale={s}><group position={[0, -0.2, -0.9]}>
    <RoundedBox args={[8.4, 7.4, 6.2]} radius={2.4} smoothness={3} position={[0, 4.6, -0.8]} castShadow>{glove}</RoundedBox>
    {[-2.9, -0.95, 0.95, 2.9].map((x, i) => <mesh key={x} geometry={FINGER} position={[x, 1.6, 1.4]} scale={[1, 0.95 - Math.abs(i - 1.5) * 0.06, 1]} castShadow>{glove}</mesh>)}
    <mesh position={[4.2, 1.8, 1.6]} rotation={[0.5, 0, 0.9]} castShadow><capsuleGeometry args={[1.05, 3.2, 6, 12]} />{glove}</mesh>
    <mesh position={[0, 9.4, -0.8]} castShadow><cylinderGeometry args={[4.5, 4.2, 4, 24]} />{glove}</mesh>
    <mesh position={[0, 11.4 + L / 2, -0.8]} castShadow><cylinderGeometry args={[5.2, 4.6, L, 24, 1, true]} /><meshStandardMaterial color="#e6e6e1" roughness={0.85} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 11.4 + L + 4, -0.8]}><cylinderGeometry args={[5.4, 5.2, 8, 24, 1, true]} /><meshStandardMaterial color="#e6e6e1" roughness={0.85} transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group></group>
}

// ---------- 温度计 ----------
/** 玻璃温度计：细长玻璃管，底下一个红色液泡，红色液柱高到 temp（−10–110 ℃）。原点在液泡底，竖直朝上，长 0.22 m */
export function Thermometer({ temp }: { temp: number }) {
  const L = 0.22 * M, k = Math.max(0, Math.min(1, (temp + 10) / 120))
  return <group>
    <mesh position={[0, L / 2, 0]} renderOrder={7}><cylinderGeometry args={[0.0034 * M, 0.0034 * M, L, 14]} /><Glass opacity={0.3} /></mesh>
    <mesh position={[0, L + 0.002 * M, 0]}><sphereGeometry args={[0.0034 * M, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><Glass opacity={0.3} /></mesh>
    <mesh position={[0, 0.007 * M, 0]}><sphereGeometry args={[0.0042 * M, 14, 10]} /><meshStandardMaterial color="#c92c22" roughness={0.3} /></mesh>
    {/* 液柱：−10 ℃ 在液泡上 0.02 m，110 ℃ 在 0.2 m */}
    <mesh position={[0, (0.012 + (0.008 + 0.18 * k) / 2) * M, 0]}><cylinderGeometry args={[0.0011 * M, 0.0011 * M, (0.008 + 0.18 * k) * M, 8]} /><meshBasicMaterial color="#d23026" /></mesh>
    <mesh position={[0, 0.11 * M, -0.0022 * M]}><planeGeometry args={[0.005 * M, 0.2 * M]} /><meshStandardMaterial map={thermoTex()} roughness={0.8} /></mesh>
  </group>
}

// ---------- 加热 ----------
/** 酒精灯：玻璃灯身、陶瓷灯芯座、棉灯芯。原点在底面正中 */
export function AlcoholLamp() {
  const g = useMemo(() => ({
    body: shell(m([[0, 0], [0.036, 0], [0.04, 0.004], [0.042, 0.02], [0.04, 0.04], [0.032, 0.056], [0.018, 0.066], [0.013, 0.07], [0.013, 0.078]]), 0.0022 * M, { segs: 48 }),
    holder: lathe(m([[0, 0.074], [0.016, 0.074], [0.017, 0.078], [0.009, 0.082], [0.0065, 0.09], [0.0055, 0.09], [0.0055, 0.074]]), { segs: 28 }),
  }), [])
  return <group>
    <mesh geometry={g.body} renderOrder={6}><Glass opacity={0.2} /></mesh>
    <mesh position={[0, 0.018 * M, 0]} renderOrder={5}><cylinderGeometry args={[0.038 * M, 0.034 * M, 0.034 * M, 40]} /><meshStandardMaterial color="#c4d4d6" transparent opacity={0.3} roughness={0.3} depthWrite={false} /></mesh>
    <mesh geometry={g.holder} castShadow><meshStandardMaterial color="#ecebe5" roughness={0.3} /></mesh>
    <mesh position={[0, 0.06 * M, 0]}><cylinderGeometry args={[0.0028 * M, 0.0028 * M, 0.08 * M, 10]} /><meshStandardMaterial color="#f1ede2" roughness={1} /></mesh>
    <mesh position={[0, 0.097 * M, 0]}><cylinderGeometry args={[0.0026 * M, 0.003 * M, 0.004 * M, 10]} /><meshStandardMaterial color="#2a241e" roughness={1} /></mesh>
  </group>
}
export const LAMP_TOP = 0.098
/** 铁三脚架：原点在地面，圈顶在 TRIPOD.h。net 为真时上面铺一张陶土网 */
export const TRIPOD = { h: 0.15, r: 0.05 }
export function Tripod({ net = true }: { net?: boolean }) {
  const ng = useMemo(() => disc(0.065 * M, 0.002 * M), [])
  return <group>
    <mesh position-y={TRIPOD.h * M - 0.004 * M} rotation-x={Math.PI / 2}><torusGeometry args={[TRIPOD.r * M, 0.004 * M, 10, 40]} /><Metal kind="iron" grain="cast" /></mesh>
    {[0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + 0.5; return <mesh key={i} position={[Math.cos(a) * TRIPOD.r * M * 1.12, TRIPOD.h * M / 2, Math.sin(a) * TRIPOD.r * M * 1.12]} rotation={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]} castShadow><cylinderGeometry args={[0.0035 * M, 0.0035 * M, TRIPOD.h * M, 10]} /><Metal kind="iron" grain="cast" /></mesh> })}
    {net && <>
      <mesh geometry={ng} position-y={TRIPOD.h * M} castShadow receiveShadow><meshStandardMaterial color="#8e8d88" roughness={0.9} metalness={0.3} /></mesh>
      <mesh position-y={TRIPOD.h * M + 0.0022 * M} rotation-x={-Math.PI / 2}><circleGeometry args={[0.032 * M, 32]} /><meshStandardMaterial color="#e8e2d6" roughness={1} /></mesh>
    </>}
  </group>
}
/** 泥三角：搁在三脚架圈上，托住蒸发皿。原点在圈心 */
export function ClayTriangle() {
  return <group>
    {[0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + Math.PI / 6; return <group key={i} rotation-y={a}>
      <mesh position={[0, 0.003 * M, -0.024 * M]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0032 * M, 0.0032 * M, 0.04 * M, 12]} /><meshStandardMaterial color="#e9e2d2" roughness={0.6} /></mesh>
      <mesh position={[0, 0.003 * M, -0.024 * M]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0011 * M, 0.0011 * M, 0.11 * M, 6]} /><Metal kind="iron" /></mesh>
    </group> })}
  </group>
}

// ---------- 蒸发皿 ----------
/** 瓷蒸发皿：圆底浅碗，外面白釉、底下一圈素烧的足。原点在碗底正中（最低点），R 是口沿半径 */
export const DISH = { R: 0.045, h: 0.024 }
export function EvapDish({ children }: { children?: ReactNode }) {
  const g = useMemo(() => {
    const pts: RY[] = []
    for (let i = 0; i <= 10; i++) { const a = i / 10; pts.push([DISH.R * Math.sin(a * Math.PI / 2.1), DISH.h * (1 - Math.cos(a * Math.PI / 2.1)) * 1.06]) }
    pts.push([DISH.R + 0.0016, DISH.h + 0.0006])
    return shell(m([[0, 0], ...pts.slice(1)]), 0.0022 * M, { segs: 56, crease: 60 })
  }, [])
  const foot = useMemo(() => disc(0.018 * M, 0.003 * M, { hole: 0.014 * M }), [])
  return <group>
    <mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial color="#f4f1ea" roughness={0.22} clearcoat={0.8} clearcoatRoughness={0.15} /></mesh>
    <mesh geometry={foot} position-y={-0.0006 * M}><meshStandardMaterial color="#d8d0c0" roughness={0.9} /></mesh>
    {children}
  </group>
}

// ---------- 电子天平 ----------
/** 电子天平：浅灰机身，前面斜面上一块读数屏和两个键，顶上一只不锈钢秤盘。原点在底面正中，屏幕朝 +z。秤盘面在 BAL.pan */
export const BAL = { w: 0.19, d: 0.25, h: 0.07, pan: 0.082 }
export function Balance({ text }: { text: string }) {
  const W = BAL.w * M, D = BAL.d * M, H = BAL.h * M
  const pan = useMemo(() => disc(0.058 * M, 0.003 * M), [])
  return <group>
    <RoundedBox args={[W, H, D]} radius={0.01 * M} smoothness={4} position={[0, H / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#dcdfe0" roughness={0.42} clearcoat={0.4} /></RoundedBox>
    {/* 调平脚和水平泡 */}
    {[-1, 1].map(s => [-1, 1].map(t => <mesh key={`${s}${t}`} position={[s * W * 0.4, -0.002 * M, t * D * 0.4]}><cylinderGeometry args={[0.008 * M, 0.009 * M, 0.006 * M, 16]} /><meshStandardMaterial color="#2a2d30" roughness={0.6} /></mesh>))}
    <mesh position={[W * 0.36, H + 0.0005, -D * 0.4]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.007 * M, 20]} /><meshPhysicalMaterial color="#9ad0c8" roughness={0.1} clearcoat={1} /></mesh>
    {/* 前面板：深色斜面、读数屏、两个键 */}
    <group position={[0, H * 0.55, D / 2 + 0.002 * M]} rotation-x={-0.35}>
      <RoundedBox args={[W * 0.9, H * 0.62, 0.004 * M]} radius={0.002 * M}><meshStandardMaterial color="#2a3036" roughness={0.5} /></RoundedBox>
      <Led text={text} w={W * 0.5} h={H * 0.36} position={[-W * 0.12, 0, 0.0024 * M]} />
      {[0, 1].map(i => <mesh key={i} position={[W * 0.24 + i * 0.022 * M, 0, 0.0028 * M]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.006 * M, 0.006 * M, 0.002 * M, 20]} /><meshStandardMaterial color={i ? '#9aa1a6' : '#35a68f'} roughness={0.4} /></mesh>)}
    </group>
    {/* 秤盘：一根短柱托着不锈钢圆盘 */}
    <mesh position={[0, H + 0.005 * M, -0.02 * M]}><cylinderGeometry args={[0.008 * M, 0.01 * M, 0.01 * M, 16]} /><Metal kind="steel" /></mesh>
    <mesh geometry={pan} position={[0, (BAL.pan - 0.003) * M, -0.02 * M]} castShadow receiveShadow><Metal kind="stainless" grain="turned" /></mesh>
  </group>
}

// ---------- 量筒 ----------
/** 50 mL 量筒：细长玻璃筒，六角形底座，筒口有嘴。原点在底座底面正中。mL 盛了多少；液面高度见 cylLevel */
export const CYL = { r: 0.0115, base: 0.012, h: 0.22, mm50: 0.17 }
/** 量筒里 v mL 的液面离底座底面多高（m）：0 刻度在内底，50 mL 在 CYL.mm50 之上 */
export const cylLevel = (v: number) => CYL.base + 0.004 + v / 50 * CYL.mm50
export function Cylinder({ mL, color = WATER.color, opacity = WATER.opacity }: { mL: number; color?: string; opacity?: number }) {
  const g = useMemo(() => shell(m([[0, CYL.base], [CYL.r, CYL.base], [CYL.r, CYL.h - 0.003], [CYL.r + 0.0016, CYL.h]]), 0.0013 * M, { segs: 40 }), [])
  const R = (CYL.r - 0.0013) * M, h = (cylLevel(mL) - CYL.base - 0.0014) * M
  return <group>
    <mesh position-y={CYL.base * M / 2} castShadow><cylinderGeometry args={[0.032 * M, 0.034 * M, CYL.base * M, 6]} /><meshPhysicalMaterial color="#d6e4e6" transparent opacity={0.55} roughness={0.1} clearcoat={1} /></mesh>
    <mesh geometry={g} renderOrder={6}><Glass opacity={0.18} /></mesh>
    <mesh position-y={(CYL.base + 0.004 + CYL.mm50 / 2) * M} rotation-y={-0.15} renderOrder={7}><cylinderGeometry args={[(CYL.r + 0.0004) * M, (CYL.r + 0.0004) * M, CYL.mm50 * M * 1.03, 32, 1, true, -0.5, 1]} /><meshBasicMaterial map={cylScaleTex()} transparent opacity={0.9} depthWrite={false} /></mesh>
    {mL > 0.2 && <group position-y={(CYL.base + 0.0014) * M}><LiquidBody r={R} h={h} color={color} opacity={opacity} /></group>}
  </group>
}

// ---------- 试剂瓶 ----------
/** 广口瓶（固体试剂）：玻璃瓶身、磨口，瓶塞放在旁边；里面一层固体。原点在瓶底正中 */
export function JarBottle({ label, solid = '#f4f5f2', amount = 0.55, band, brown = false, stopper = true }: { label: string; solid?: string; amount?: number; band?: string; brown?: boolean; stopper?: boolean }) {
  const g = useMemo(() => shell(m([[0, 0], [0.026, 0], [0.03, 0.004], [0.03, 0.07], [0.022, 0.082], [0.02, 0.084], [0.02, 0.095]]), 0.0022 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass tint={brown ? '#4a2810' : undefined} opacity={brown ? 0.5 : 0.22} /></mesh>
    <mesh position-y={(0.004 + 0.066 * amount / 2) * M} renderOrder={4}><cylinderGeometry args={[0.0268 * M, 0.0268 * M, 0.066 * amount * M, 32]} /><meshStandardMaterial color={solid} roughness={0.8} /></mesh>
    <mesh position={[0, 0.045 * M, 0]} rotation-y={0.2}><cylinderGeometry args={[0.0305 * M, 0.0305 * M, 0.032 * M, 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    {stopper && <mesh position={[0.05 * M, 0.009 * M, 0.012 * M]} rotation-z={Math.PI / 2 - 0.1}><cylinderGeometry args={[0.017 * M, 0.015 * M, 0.02 * M, 24]} /><Glass opacity={0.35} /></mesh>}
  </group>
}
/** 细口瓶（液体试剂）：窄口、带塞，里面的液体。原点在瓶底正中 */
export function NarrowBottle({ label, color, opacity = 0.8, band, sub }: { label: string; color: string; opacity?: number; band?: string; sub?: string }) {
  const g = useMemo(() => shell(m([[0, 0], [0.026, 0], [0.03, 0.004], [0.03, 0.075], [0.014, 0.092], [0.009, 0.096], [0.009, 0.112]]), 0.0022 * M, { segs: 40 }), [])
  const cap = useMemo(() => lathe(m([[0, 0.106], [0.0098, 0.106], [0.0098, 0.112], [0.011, 0.114], [0.011, 0.122], [0.009, 0.124], [0, 0.124]]), { segs: 28 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass opacity={0.22} /></mesh>
    <mesh position-y={0.036 * M} renderOrder={5}><cylinderGeometry args={[0.0275 * M, 0.0275 * M, 0.064 * M, 32]} /><meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.1} clearcoat={0.5} depthWrite={false} /></mesh>
    <mesh geometry={cap} castShadow><Glass opacity={0.4} /></mesh>
    <mesh position={[0, 0.042 * M, 0]} rotation-y={0.2}><cylinderGeometry args={[0.0305 * M, 0.0305 * M, 0.034 * M, 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band, sub)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
  </group>
}
/** 洗涤剂：一只白色塑料挤瓶，尖嘴盖。原点在瓶底正中 */
export function SqueezeBottle({ label }: { label: string }) {
  const g = useMemo(() => lathe(m([[0, 0], [0.022, 0], [0.025, 0.004], [0.025, 0.085], [0.018, 0.1], [0.009, 0.106], [0.009, 0.112], [0, 0.112]]), { segs: 36, crease: 40 }), [])
  const nozzle = useMemo(() => lathe(m([[0, 0.112], [0.01, 0.112], [0.01, 0.12], [0.004, 0.132], [0.0015, 0.142], [0, 0.142]]), { segs: 24 }), [])
  return <group>
    <mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial color="#f3f4f0" roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh geometry={nozzle} castShadow><meshStandardMaterial color="#e2632f" roughness={0.45} /></mesh>
    <mesh position={[0, 0.048 * M, 0]} rotation-y={0.2}><cylinderGeometry args={[0.0255 * M, 0.0255 * M, 0.04 * M, 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, '#e2632f')} roughness={0.6} side={THREE.DoubleSide} /></mesh>
  </group>
}
/** 一小碟东西（泥沙）：白瓷小碟，上面一堆。原点在碟底 */
export function Dish({ color = '#7a5c3a', amount = 1 }: { color?: string; amount?: number }) {
  const g = useMemo(() => lathe(m([[0, 0], [0.025, 0], [0.032, 0.006], [0.038, 0.008], [0.037, 0.009], [0.03, 0.0075], [0.024, 0.003], [0, 0.003]]), { segs: 40, crease: 40 }), [])
  return <group>
    <mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial color="#f4f1ea" roughness={0.25} clearcoat={0.6} /></mesh>
    {amount > 0.05 && <mesh position-y={0.003 * M} scale={[1, 0.45 * amount, 1]}><sphereGeometry args={[0.02 * M, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={1} /></mesh>}
  </group>
}

// ---------- 汽水瓶 ----------
/** 玻璃汽水瓶：浅绿的玻璃，瓶颈细长；capOn 为真时有一只皇冠盖。原点在瓶底正中；液面在 SODA.level */
export const SODA = { level: 0.14, top: 0.2 }
export function SodaBottle({ capOn, label }: { capOn: boolean; label: string }) {
  const g = useMemo(() => shell(m([[0, 0], [0.028, 0], [0.031, 0.004], [0.031, 0.1], [0.026, 0.125], [0.013, 0.16], [0.011, 0.19], [0.0125, 0.194], [0.0125, 0.2]]), 0.0024 * M, { segs: 40 }), [])
  const liq = useMemo(() => lathe(m([[0, 0.003], [0.0285, 0.003], [0.0285, 0.1], [0.0235, 0.125], [0.0125, 0.14], [0, 0.14]]), { segs: 36 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass tint="#2c5a3a" opacity={0.28} /></mesh>
    <mesh geometry={liq} renderOrder={5}><meshPhysicalMaterial color="#e9d9a0" transparent opacity={0.5} roughness={0.05} clearcoat={0.6} depthWrite={false} /></mesh>
    <mesh position={[0, 0.06 * M, 0]} rotation-y={0.3}><cylinderGeometry args={[0.0315 * M, 0.0315 * M, 0.045 * M, 32, 1, true, -1.1, 2.2]} /><meshStandardMaterial map={bottleLabel(label, '#c23a2f')} roughness={0.6} side={THREE.DoubleSide} /></mesh>
    {capOn && <mesh position-y={0.2 * M + 0.003 * M}><cylinderGeometry args={[0.0138 * M, 0.0145 * M, 0.006 * M, 21]} /><Metal kind="aluminum" grain="brushed" /></mesh>}
  </group>
}

// ---------- 冷水槽 ----------
/** 一只白色塑料水槽，盛着冷水，漂着几块冰。原点在槽底正中；水面在 BASIN.water */
export const BASIN = { w: 0.17, d: 0.14, h: 0.075, water: 0.05 }
export function Basin({ ice = true }: { ice?: boolean }) {
  const W = BASIN.w * M, D = BASIN.d * M, H = BASIN.h * M, t = 0.004 * M
  const ices = useMemo(() => Array.from({ length: 5 }, (_, i) => ({ x: (Math.sin(i * 2.3) * 0.5) * W * 0.8, z: (Math.cos(i * 1.7) * 0.5) * D * 0.75, r: i * 0.9, s: 0.016 + (i % 3) * 0.004 })), [W, D])
  const wall = <meshPhysicalMaterial color="#f0f1ee" roughness={0.4} clearcoat={0.3} />
  return <group>
    <RoundedBox args={[W, t, D]} radius={t / 2} position-y={t / 2} castShadow receiveShadow>{wall}</RoundedBox>
    <RoundedBox args={[W, H, t]} radius={t / 2} position={[0, H / 2, -D / 2]} castShadow>{wall}</RoundedBox>
    <RoundedBox args={[t, H, D]} radius={t / 2} position={[-W / 2, H / 2, 0]} castShadow>{wall}</RoundedBox>
    <RoundedBox args={[t, H, D]} radius={t / 2} position={[W / 2, H / 2, 0]} castShadow>{wall}</RoundedBox>
    {/* 前壁做成半透明的，看得见里面的烧杯 */}
    <mesh position={[0, H / 2, D / 2]} renderOrder={6}><boxGeometry args={[W, H, t]} /><meshPhysicalMaterial color="#e8eef0" transparent opacity={0.22} roughness={0.15} clearcoat={1} depthWrite={false} /></mesh>
    <mesh position={[0, (BASIN.water * M + t) / 2, 0]} renderOrder={4}><boxGeometry args={[W - t * 1.2, BASIN.water * M - t, D - t * 1.2]} /><meshPhysicalMaterial color="#a9d6e3" transparent opacity={0.28} roughness={0.05} clearcoat={0.8} depthWrite={false} /></mesh>
    {ice && ices.map((c, i) => <RoundedBox key={i} args={[c.s * M, c.s * M * 0.8, c.s * M]} radius={0.003 * M} position={[c.x, BASIN.water * M - 0.004 * M, c.z]} rotation={[0.2, c.r, 0.1]}><meshPhysicalMaterial color="#e9f5fa" transparent opacity={0.7} roughness={0.15} clearcoat={1} depthWrite={false} /></RoundedBox>)}
  </group>
}
/** 一张称量纸：白色方纸，四边稍微折起。原点在纸面中心 */
export function WeighPaper({ s = 0.07 }: { s?: number }) {
  return <mesh rotation-x={-Math.PI / 2} position-y={0.0005 * M} receiveShadow><planeGeometry args={[s * M, s * M]} /><meshStandardMaterial color="#f7f6f1" roughness={0.9} side={THREE.DoubleSide} /></mesh>
}
