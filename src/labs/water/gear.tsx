// 化验台上的器材：烧杯、玻璃棒、漏斗、滤纸（能折）、铁架台、浊度仪、试剂瓶、试管和试管架、手套、木条。
// 尺寸都按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里（多半是底面正中）。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Led, Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { M, type V3 } from './world'
import { bottleLabel, thermoTex } from './mats'

export const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
export const memo = <K, T>(f: (k: K) => T) => { const c = new Map<K, T>(); return (k: K) => { if (!c.has(k)) c.set(k, f(k)); return c.get(k)! } }

/** 玻璃：容器里还要画东西，用便宜的做法（半透明、不写深度、双面），反光调亮 */
/** 颜色压暗：玻璃本身几乎不散射光，看到的主要是表面的反光；底色亮了会给里面的液体蒙一层白雾 */
export const Glass = ({ tint = '#1a2629', opacity = 0.15 }: { tint?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={tint} transparent opacity={Math.min(0.5, opacity * 1.5)} roughness={0.03} metalness={0} clearcoat={1} clearcoatRoughness={0.03} envMapIntensity={2.6} depthWrite={false} side={THREE.DoubleSide} />
export const Liquid = ({ color = '#cfe6ee', opacity = 0.4 }: { color?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.06} clearcoat={0.6} depthWrite={false} />

/** 水的样子：浑浊程度 k（0 清、1 最浑）→ 颜色和透明度。清水淡淡的青，浑水是黄泥色、看不透 */
const CLEAR = new THREE.Color('#b9dbe4'), MUD = new THREE.Color('#6a4512')
/** tint：带颜色的水（滴了红墨水），tk 颜色的浓淡（0–1） */
export function waterLook(k: number, tint?: string, tk = 1) {
  const c = CLEAR.clone().lerp(MUD, Math.min(1, Math.sqrt(k) * 1.1))
  if (tint) c.lerp(new THREE.Color(tint), 0.95 * tk)
  return { color: `#${c.getHexString()}`, opacity: Math.max(0.22 + 0.74 * Math.pow(k, 0.6), tint ? 0.25 + 0.65 * tk : 0) }
}
/** 一段水：圆柱形的水体加一层亮的水面。原点在水底正中 */
export function WaterBody({ r, h, k, tint, tk = 1, top = true }: { r: number; h: number; k: number; tint?: string; tk?: number; top?: boolean }) {
  const w = waterLook(k, tint, tk)
  if (h < 0.002) return null
  return <>
    <mesh position={[0, h / 2, 0]} renderOrder={5}><cylinderGeometry args={[r, r * 0.985, h, 40]} /><meshStandardMaterial color={w.color} transparent opacity={w.opacity} roughness={0.55} envMapIntensity={0.25} depthWrite={false} /></mesh>
    {top && <mesh position={[0, h + 0.001, 0]} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r, 40]} /><meshPhysicalMaterial color={w.color} transparent opacity={Math.min(0.92, w.opacity + 0.1)} roughness={0.05} clearcoat={0.6} envMapIntensity={0.9} depthWrite={false} /></mesh>}
  </>
}

// ---------- 烧杯 ----------
/** 烧杯的外形（m）：半径、高 */
export const BEAKER = { 250: { r: 0.035, h: 0.095 }, 500: { r: 0.043, h: 0.12 }, 1000: { r: 0.053, h: 0.145 } } as const
export type Vol = keyof typeof BEAKER
const beakerGeo = memo((vol: Vol) => {
  const { r, h } = BEAKER[vol]
  return shell(m([[0, 0], [r - 0.004, 0], [r, 0.004], [r, h - 0.004], [r + 0.0018, h - 0.0008], [r + 0.0024, h]]), 0.0018 * M, { segs: 56 })
})
/** 一只烧杯，原点在杯底正中。fill 盛了多少（0–1）；k 水的浑浊程度；tint 带颜色的水；mud 杯底泥层的厚度（m） */
export function Beaker({ vol, fill = 0, k = 0, tint, tk = 1, mud = 0, mudColor = '#6e5332', marks = true, children }: { vol: Vol; fill?: number; k?: number; tint?: string; tk?: number; mud?: number; mudColor?: string; marks?: boolean; children?: ReactNode }) {
  const { r, h } = BEAKER[vol], R = r * M, H = h * M, wall = 0.0018 * M
  return <group>
    <mesh geometry={beakerGeo(vol)} renderOrder={6}><Glass /></mesh>
    {/* 刻度：白色的短横线和一块印字区 */}
    {marks && [0.3, 0.45, 0.6, 0.75].map((q, i) => <mesh key={q} position={[0, H * q, 0]} rotation-y={-0.5}><cylinderGeometry args={[R + 0.003, R + 0.003, 0.01, 24, 1, true, 0, i % 2 ? 0.3 : 0.5]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    {marks && <mesh position={[0, H * 0.5, 0]} rotation-y={0.8}><cylinderGeometry args={[R + 0.003, R + 0.003, H * 0.2, 24, 1, true, 0, 0.45]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
    {mud > 0.0005 && <mesh position={[0, wall + mud * M / 2, 0]} renderOrder={4}><cylinderGeometry args={[R - wall - 0.002, R - wall - 0.002, mud * M, 40]} /><meshStandardMaterial color={mudColor} roughness={1} /></mesh>}
    {fill > 0.005 && <group position-y={wall}><WaterBody r={R - wall - 0.002} h={H * fill - wall} k={k} tint={tint} tk={tk} /></group>}
    {children}
  </group>
}

// ---------- 玻璃棒 ----------
/** 玻璃棒：实心的细玻璃棒，两头烧圆。原点在下端，沿 y 朝上 */
export function GlassRod({ len = 0.2 }: { len?: number }) {
  const g = useMemo(() => lathe(m([[0, 0], [0.0022, 0.0006], [0.003, 0.003], [0.003, len - 0.003], [0.0022, len - 0.0006], [0, len]]), { segs: 16 }), [len])
  return <mesh geometry={g} renderOrder={7}><meshPhysicalMaterial color="#eef7f8" transparent opacity={0.55} roughness={0.03} clearcoat={1} envMapIntensity={2.4} depthWrite={false} /></mesh>
}

// ---------- 漏斗和滤纸 ----------
/** 漏斗：60° 的锥，下面一截细颈，颈口斜切。原点在颈口；锥的上沿在 FUNNEL.top，滤纸的锥尖在 FUNNEL.apex */
export const FUNNEL = { stem: 0.065, top: 0.117, rTop: 0.0345, rStem: 0.0045, apex: 0.059 }
/** 滤纸：直径 11 cm，对折两次打开成 60° 的锥：锥口半径是滤纸半径的一半 */
export const PAPER_R = 0.055
export function Funnel() {
  const g = useMemo(() => shell(m([[FUNNEL.rStem, 0], [FUNNEL.rStem, FUNNEL.stem], [FUNNEL.rTop, FUNNEL.top - 0.002], [FUNNEL.rTop + 0.0016, FUNNEL.top]]), 0.0014 * M, { segs: 48 }), [])
  return <mesh geometry={g} renderOrder={7}><Glass opacity={0.2} /></mesh>
}
/** 放进漏斗里的滤纸锥（打开的一边一层、另一边三层）。wet 0–1 湿了的程度，torn 为真时锥尖有一道破口；dirt 0–1 滤纸上积了多少泥 */
export function PaperCone({ wet = 0, torn = false, dirt = 0 }: { wet?: number; torn?: boolean; dirt?: number }) {
  const slant = PAPER_R * M, half = Math.PI / 6, rTop = slant * Math.sin(half), h = slant * Math.cos(half)
  const geo = useMemo(() => {
    const one = new THREE.ConeGeometry(rTop, h, 48, 6, true); one.rotateX(Math.PI); one.translate(0, h / 2, 0)
    const three = new THREE.ConeGeometry(rTop * 1.006, h, 24, 6, true, Math.PI * 0.5, Math.PI); three.rotateX(Math.PI); three.translate(0, h / 2 + 0.001, 0)
    return { one, three }
  }, [rTop, h])
  const col = new THREE.Color('#ebe8de').lerp(new THREE.Color('#c9c4b4'), wet * 0.6).lerp(new THREE.Color('#7a6040'), dirt * 0.7)
  return <group position-y={FUNNEL.apex * M}>
    <mesh geometry={geo.one} renderOrder={6}><meshStandardMaterial color={col} roughness={1} transparent opacity={0.92 - wet * 0.15} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh geometry={geo.three} renderOrder={6}><meshStandardMaterial color={col} roughness={1} transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    {/* 破口：锥尖往上一道深色的裂缝 */}
    {torn && <mesh position={[rTop * 0.32, h * 0.32, rTop * 0.2]} rotation={[0, -0.6, 0.53]}><planeGeometry args={[0.004 * M, 0.018 * M]} /><meshBasicMaterial color="#3a2e22" side={THREE.DoubleSide} /></mesh>}
  </group>
}
/** 平放在台上的一张滤纸，能对折两次：k1 第一次对折的进度、k2 第二次。原点在圆心，摊在 y = 0 上 */
export function PaperSheet({ k1, k2 }: { k1: number; k2: number }) {
  const R = PAPER_R * M
  const q = useMemo(() => [0, 1, 2, 3].map(i => { const g = new THREE.CircleGeometry(R, 14, i * Math.PI / 2, Math.PI / 2); g.rotateX(-Math.PI / 2); return g }), [R])
  const mat = <meshStandardMaterial color="#f4f2ea" roughness={1} side={THREE.DoubleSide} />
  const lift = 0.0006 * M
  return <group position-y={0.0004 * M}>
    <mesh geometry={q[0]} castShadow receiveShadow>{mat}</mesh>
    <group rotation-x={-Math.PI * k1} position-y={lift * k1}><mesh geometry={q[3]} castShadow>{mat}</mesh></group>
    <group rotation-z={-Math.PI * k2} position-y={lift * 2 * k2}>
      <mesh geometry={q[1]} castShadow>{mat}</mesh>
      <group rotation-x={-Math.PI * k1} position-y={lift * k1}><mesh geometry={q[2]} castShadow>{mat}</mesh></group>
    </group>
  </group>
}

// ---------- 铁架台 ----------
/** 铁架台：铸铁底座、立杆、一只铁圈。原点在底座底面正中；立杆在底座后部，铁圈伸向 +z 方向，圈心高 ringY、离立杆 reach（m） */
export function IronStand({ ringY = 0.2, reach = 0.11, ring = 0.036, rodH = 0.5, children }: { ringY?: number; reach?: number; ring?: number; rodH?: number; children?: ReactNode }) {
  const rodZ = -0.04 * M
  return <group>
    <RoundedBox args={[0.13 * M, 0.014 * M, 0.2 * M]} radius={0.006 * M} smoothness={3} position={[0, 0.007 * M, 0]} castShadow receiveShadow><meshStandardMaterial color="#25292d" roughness={0.45} metalness={0.4} /></RoundedBox>
    <mesh position={[0, rodH * M / 2, rodZ]} castShadow><cylinderGeometry args={[0.0055 * M, 0.0055 * M, rodH * M, 20]} /><Metal kind="chrome" rough={0.12} /></mesh>
    <mesh position={[0, 0.016 * M, rodZ]}><cylinderGeometry args={[0.011 * M, 0.013 * M, 0.006 * M, 20]} /><Metal kind="steel" grain="turned" /></mesh>
    {/* 双顶丝（十字夹）和铁圈的柄 */}
    <RoundedBox args={[0.022 * M, 0.024 * M, 0.022 * M]} radius={0.003 * M} position={[0, ringY * M, rodZ]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[0.016 * M, ringY * M, rodZ]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0035 * M, 0.0035 * M, 0.014 * M, 10]} /><Metal kind="steel" /></mesh>
    <mesh position={[0.025 * M, ringY * M, rodZ]}><sphereGeometry args={[0.005 * M, 12, 10]} /><Metal kind="iron" grain="cast" /></mesh>
    <mesh position={[0, ringY * M, rodZ + (reach - ring) * M / 2 + 0.006 * M]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.0028 * M, 0.0028 * M, (reach - ring) * M, 10]} /><Metal kind="steel" /></mesh>
    <mesh position={[0, ringY * M, rodZ + reach * M]} rotation-x={Math.PI / 2}><torusGeometry args={[ring * M, 0.0028 * M, 10, 40]} /><Metal kind="steel" /></mesh>
    <group position={[0, ringY * M, rodZ + reach * M]}>{children}</group>
  </group>
}
/** 一只夹子：从立杆伸出的夹臂，前端两片夹口（垫着软木）。原点在夹口中心，夹臂朝 −z 伸回立杆，len 是夹臂长（m） */
export function Clamp({ len = 0.1, open = 0.012 }: { len?: number; open?: number }) {
  return <group>
    <mesh position={[0, 0, -len * M / 2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.003 * M, 0.003 * M, len * M, 10]} /><Metal kind="steel" /></mesh>
    {[-1, 1].map(s => <group key={s}>
      <RoundedBox args={[0.006 * M, 0.02 * M, 0.024 * M]} radius={0.002 * M} position={[s * (open * M + 0.003 * M), 0, 0]}><Metal kind="aluminum" grain="cast" /></RoundedBox>
      <mesh position={[s * open * M, 0, 0]}><boxGeometry args={[0.002 * M, 0.018 * M, 0.02 * M]} /><meshStandardMaterial color="#b58a5a" roughness={1} /></mesh>
    </group>)}
    <RoundedBox args={[0.022 * M, 0.024 * M, 0.022 * M]} radius={0.003 * M} position={[0, 0, -len * M]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
  </group>
}

// ---------- 浊度仪 ----------
/** 台式浊度仪：浅灰的机身，斜面上一块读数屏，顶上一个放样品瓶的孔。原点在底面正中，屏幕朝 +z */
export function Turbidimeter({ text, vial = false, k = 0 }: { text: string; vial?: boolean; k?: number }) {
  const W = 0.2 * M, D = 0.16 * M, Hh = 0.07 * M
  const w = waterLook(k)
  return <group>
    <RoundedBox args={[W, Hh, D]} radius={0.012 * M} smoothness={4} position={[0, Hh / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#dfe2e3" roughness={0.42} clearcoat={0.4} /></RoundedBox>
    {/* 斜面的面板和读数屏 */}
    <group position={[0, Hh * 0.82, D * 0.28]} rotation-x={-0.5}>
      <RoundedBox args={[W * 0.86, 0.004 * M, D * 0.42]} radius={0.002 * M}><meshStandardMaterial color="#2a3036" roughness={0.5} /></RoundedBox>
      <Led text={text} w={W * 0.5} h={0.03 * M} position={[-W * 0.12, 0.0022 * M, 0]} rotation-x={-Math.PI / 2} />
      {[0, 1, 2].map(i => <mesh key={i} position={[W * 0.22 + i * 0.016 * M * 0, 0.003 * M, -0.012 * M + i * 0.013 * M]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.0045 * M, 20]} /><meshStandardMaterial color={i === 0 ? '#35a68f' : '#9aa1a6'} roughness={0.4} /></mesh>)}
    </group>
    {/* 样品孔和黑色的遮光盖 */}
    <mesh position={[W * 0.28, Hh + 0.0005, -D * 0.2]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.012 * M, 0.017 * M, 32]} /><meshStandardMaterial color="#1b1e21" roughness={0.6} /></mesh>
    {vial && <group position={[W * 0.28, Hh - 0.03 * M, -D * 0.2]}>
      <mesh position-y={0.04 * M} renderOrder={6}><cylinderGeometry args={[0.011 * M, 0.011 * M, 0.08 * M, 24, 1, true]} /><Glass opacity={0.3} /></mesh>
      <mesh position-y={0.035 * M} renderOrder={5}><cylinderGeometry args={[0.0098 * M, 0.0098 * M, 0.07 * M, 24]} /><Liquid color={w.color} opacity={w.opacity} /></mesh>
      <mesh position-y={0.083 * M}><cylinderGeometry args={[0.0118 * M, 0.0118 * M, 0.008 * M, 24]} /><meshStandardMaterial color="#15181b" roughness={0.5} /></mesh>
    </group>}
    <mesh position={[-W * 0.32, Hh + 0.001, -D * 0.22]} rotation-x={-Math.PI / 2}><planeGeometry args={[W * 0.26, 0.018 * M]} /><meshStandardMaterial color="#2a6f9e" roughness={0.6} /></mesh>
  </group>
}

// ---------- 试剂瓶 ----------
/** 广口瓶（明矾、活性炭）：玻璃瓶身、磨口的玻璃塞放在旁边不画；里面一层固体。原点在瓶底正中 */
export function JarBottle({ label, solid, amount = 0.5, band }: { label: string; solid: 'alum' | 'carbon'; amount?: number; band?: string }) {
  const g = useMemo(() => shell(m([[0, 0], [0.026, 0], [0.03, 0.004], [0.03, 0.07], [0.022, 0.082], [0.02, 0.084], [0.02, 0.095]]), 0.0022 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass opacity={0.22} /></mesh>
    <mesh position-y={(0.004 + 0.066 * amount / 2) * M} renderOrder={4}><cylinderGeometry args={[0.0268 * M, 0.0268 * M, 0.066 * amount * M, 32]} />{solid === 'alum' ? <meshPhysicalMaterial color="#f1f3ef" roughness={0.35} transmission={0.2} thickness={0.2} /> : <meshStandardMaterial color="#141516" roughness={0.9} />}</mesh>
    <mesh position={[0, 0.045 * M, 0]} rotation-y={0.2}><cylinderGeometry args={[0.0305 * M, 0.0305 * M, 0.03 * M, 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0.05 * M, 0.012 * M, 0.01 * M]} rotation-z={0.3}><cylinderGeometry args={[0.018 * M, 0.016 * M, 0.024 * M, 24]} /><Glass opacity={0.35} /></mesh>
  </group>
}
/** 滴瓶（肥皂水、红墨水）：小口的棕色或无色瓶，插着带橡胶头的滴管。原点在瓶底正中 */
export function DropBottle({ label, color = '#e9e4d4', brown = false, band }: { label: string; color?: string; brown?: boolean; band?: string }) {
  const g = useMemo(() => shell(m([[0, 0], [0.019, 0], [0.022, 0.003], [0.022, 0.05], [0.012, 0.062], [0.009, 0.064], [0.009, 0.072]]), 0.0018 * M, { segs: 36 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass tint={brown ? '#4a2810' : undefined} opacity={brown ? 0.5 : 0.2} /></mesh>
    <mesh position-y={0.022 * M} renderOrder={5}><cylinderGeometry args={[0.019 * M, 0.019 * M, 0.04 * M, 28]} /><Liquid color={color} opacity={0.75} /></mesh>
    <mesh position={[0, 0.032 * M, 0]} rotation-y={0.3}><cylinderGeometry args={[0.0225 * M, 0.0225 * M, 0.022 * M, 28, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    <group position-y={0.072 * M}><Dropper /></group>
  </group>
}
/** 滴管：玻璃管加一只红色的橡胶头。原点在管口塞子处，管子往下伸 */
export function Dropper() {
  return <group>
    <mesh position-y={-0.025 * M} renderOrder={7}><cylinderGeometry args={[0.003 * M, 0.0016 * M, 0.06 * M, 12]} /><Glass opacity={0.35} /></mesh>
    <mesh position-y={0.002 * M}><cylinderGeometry args={[0.0095 * M, 0.009 * M, 0.004 * M, 20]} /><meshStandardMaterial color="#d8d4c8" roughness={0.6} /></mesh>
    <mesh position-y={0.016 * M} castShadow><capsuleGeometry args={[0.0065 * M, 0.016 * M, 6, 16]} /><meshStandardMaterial color="#b8352a" roughness={0.55} /></mesh>
  </group>
}

// ---------- 试管 ----------
/** 试管：直径 15 mm、长 15 cm，圆底。原点在管底，沿 y 朝上 */
export const TUBE = { r: 0.0075, h: 0.15 }
const tubeGeo = memo((_: number) => {
  const r = TUBE.r, h = TUBE.h, pts: RY[] = []
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push([Math.sin(a) * r, r - Math.cos(a) * r]) }
  pts.push([r, h - 0.001], [r + 0.0012, h])
  return shell(m(pts), 0.0009 * M, { segs: 32, crease: 50 })
})
/** fill 盛了多少（0–1），k 浑浊程度，foam 泡沫高度（m），scum 浮渣多少（0–1） */
export function TestTube({ fill = 0.35, k = 0, tint, foam = 0, scum = 0 }: { fill?: number; k?: number; tint?: string; foam?: number; scum?: number }) {
  const r = (TUBE.r - 0.0009) * M, h = TUBE.h * fill * M, w = waterLook(k, tint)
  return <group>
    <mesh geometry={tubeGeo(0)} renderOrder={7}><Glass opacity={0.2} /></mesh>
    {fill > 0 && <>
      <mesh position-y={r} renderOrder={5}><sphereGeometry args={[r * 0.98, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><Liquid color={w.color} opacity={w.opacity} /></mesh>
      <mesh position-y={r + (h - r) / 2} renderOrder={5}><cylinderGeometry args={[r * 0.98, r * 0.98, h - r, 20]} /><Liquid color={w.color} opacity={w.opacity} /></mesh>
    </>}
    {/* 泡沫：一团白色的小泡堆在水面上；浮渣：水面上一层灰白的絮 */}
    {foam > 0.0005 && <mesh position-y={h + foam * M / 2} renderOrder={6}><cylinderGeometry args={[r * 0.97, r * 0.97, foam * M, 20]} /><meshStandardMaterial color="#fbfbf8" roughness={0.85} transparent opacity={0.94} /></mesh>}
    {foam > 0.0005 && <mesh position-y={h + foam * M} renderOrder={6}><sphereGeometry args={[r * 0.97, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#ffffff" roughness={0.8} /></mesh>}
    {scum > 0.02 && <mesh position-y={h - 0.003 * M * scum} renderOrder={6}><cylinderGeometry args={[r * 0.97, r * 0.97, 0.006 * M * scum, 20]} /><meshStandardMaterial color="#c9c4b2" roughness={1} transparent opacity={0.4 + 0.5 * scum} /></mesh>}
  </group>
}
/** 试管架：木头的，两层板，上层一排孔。原点在底面正中，n 个孔沿 x 排开，孔距 gap（m） */
export function TubeRack({ n = 4, gap = 0.035 }: { n?: number; gap?: number }) {
  const L = (n * gap + 0.02) * M, D = 0.04 * M, wood = <meshStandardMaterial color="#c49a64" roughness={0.75} />
  const top = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-L / 2, -D / 2); s.lineTo(L / 2, -D / 2); s.lineTo(L / 2, D / 2); s.lineTo(-L / 2, D / 2); s.closePath()
    for (let i = 0; i < n; i++) { const h = new THREE.Path(); h.absarc((i - (n - 1) / 2) * gap * M, 0, (TUBE.r + 0.0015) * M, 0, Math.PI * 2, true); s.holes.push(h) }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.008 * M, bevelEnabled: true, bevelSize: 0.001 * M, bevelThickness: 0.001 * M, bevelSegments: 2 }); g.rotateX(-Math.PI / 2)
    return g
  }, [L, D, n, gap])
  return <group>
    <RoundedBox args={[L, 0.008 * M, D + 0.01 * M]} radius={0.002 * M} position-y={0.004 * M} castShadow receiveShadow>{wood}</RoundedBox>
    {[-1, 1].map(s => <RoundedBox key={s} args={[0.01 * M, 0.08 * M, D]} radius={0.002 * M} position={[s * (L / 2 - 0.005 * M), 0.044 * M, 0]} castShadow>{wood}</RoundedBox>)}
    <mesh geometry={top} position-y={0.07 * M} castShadow receiveShadow>{wood}</mesh>
  </group>
}

// ---------- 手套 ----------
const FINGER = (() => { const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -1.3, 1.1], [0, -2.5, 0.6], [0, -2.8, -0.9], [0, -2.1, -1.9]].map(p => new THREE.Vector3(p[0], p[1], p[2]))); return new THREE.TubeGeometry(c, 20, 0.9, 10) })()
/**
 * 一只握着东西的手：蓝色丁腈手套、袖口、一截白大褂的袖子往手腕方向伸出去，末端淡出。
 * 握着的东西从拳心穿过，拳心在原点；手腕朝 +y，手背朝 −z。s 是大小
 */
export function Glove({ s = 0.0068 * M }: { s?: number }) {
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

// ---------- 木条 ----------
/** 一根细木条：原点在燃着的那一头，木条朝 +y 伸出去 0.16 m。ember 0–1 头上的火星亮度 */
export function Splint({ ember = 0 }: { ember?: number }) {
  return <group>
    <mesh position-y={0.08 * M} castShadow><boxGeometry args={[0.004 * M, 0.16 * M, 0.0025 * M]} /><meshStandardMaterial color="#d8b47a" roughness={0.8} /></mesh>
    <mesh position-y={0.004 * M}><boxGeometry args={[0.0042 * M, 0.01 * M, 0.0027 * M]} /><meshStandardMaterial color="#2b1d12" emissive="#ff5a10" emissiveIntensity={ember * 3} toneMapped={false} roughness={0.9} /></mesh>
  </group>
}

// ---------- 酒精灯、陶土网 ----------
export function AlcoholLamp() {
  const g = useMemo(() => ({
    body: shell(m([[0, 0], [0.036, 0], [0.04, 0.004], [0.042, 0.02], [0.04, 0.04], [0.032, 0.056], [0.018, 0.066], [0.013, 0.07], [0.013, 0.078]]), 0.0022 * M, { segs: 48 }),
    holder: lathe(m([[0, 0.074], [0.016, 0.074], [0.017, 0.078], [0.009, 0.082], [0.0065, 0.09], [0.0055, 0.09], [0.0055, 0.074]]), { segs: 28 }),
  }), [])
  return <group>
    <mesh geometry={g.body} renderOrder={6}><Glass opacity={0.2} /></mesh>
    <mesh position={[0, 0.018 * M, 0]} renderOrder={5}><cylinderGeometry args={[0.038 * M, 0.034 * M, 0.034 * M, 40]} /><meshStandardMaterial color="#b8c9cc" transparent opacity={0.3} roughness={0.3} depthWrite={false} /></mesh>
    <mesh geometry={g.holder} castShadow><meshStandardMaterial color="#ecebe5" roughness={0.3} /></mesh>
    <mesh position={[0, 0.06 * M, 0]}><cylinderGeometry args={[0.0028 * M, 0.0028 * M, 0.08 * M, 10]} /><meshStandardMaterial color="#f1ede2" roughness={1} /></mesh>
    <mesh position={[0, 0.097 * M, 0]}><cylinderGeometry args={[0.0026 * M, 0.003 * M, 0.004 * M, 10]} /><meshStandardMaterial color="#2a241e" roughness={1} /></mesh>
  </group>
}
/** 灯芯顶端的高度（m） */
export const LAMP_TOP = 0.098
/** 三脚架加一张陶土网：原点在地面，网面在 TRIPOD.h */
export const TRIPOD = { h: 0.15, r: 0.05 }
export function Tripod() {
  const net = useMemo(() => disc(0.065 * M, 0.002 * M), [])
  return <group>
    <mesh position-y={TRIPOD.h * M - 0.004 * M} rotation-x={Math.PI / 2}><torusGeometry args={[TRIPOD.r * M, 0.004 * M, 10, 40]} /><Metal kind="iron" grain="cast" /></mesh>
    {[0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + 0.5; return <mesh key={i} position={[Math.cos(a) * TRIPOD.r * M * 1.12, TRIPOD.h * M / 2, Math.sin(a) * TRIPOD.r * M * 1.12]} rotation={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]} castShadow><cylinderGeometry args={[0.0035 * M, 0.0035 * M, TRIPOD.h * M, 10]} /><Metal kind="iron" grain="cast" /></mesh> })}
    <mesh geometry={net} position-y={TRIPOD.h * M} castShadow receiveShadow><meshStandardMaterial color="#8e8d88" roughness={0.9} metalness={0.3} /></mesh>
    <mesh position-y={TRIPOD.h * M + 0.0022 * M} rotation-x={-Math.PI / 2}><circleGeometry args={[0.032 * M, 32]} /><meshStandardMaterial color="#e8e2d6" roughness={1} /></mesh>
  </group>
}

/** 一段胶管：沿几个点弯过去 */
export function Hose({ pts, r = 0.003 * M, color = '#9b3a2c' }: { pts: V3[]; r?: number; color?: string }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 48, r, 10), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} castShadow><meshStandardMaterial color={color} roughness={0.6} /></mesh>
}

/** 药匙：不锈钢的，一头一个小勺。原点在勺心，柄朝 +x；load 勺里盛了多少，color 盛的东西的颜色 */
export function Spoon({ load = 0, color = '#f2f3ef' }: { load?: number; color?: string }) {
  return <group>
    <mesh scale={[1, 0.35, 0.75]}><sphereGeometry args={[0.012 * M, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><Metal kind="stainless" /></mesh>
    <mesh position={[0.08 * M, 0.004 * M, 0]} rotation-z={Math.PI / 2 - 0.06}><boxGeometry args={[0.004 * M, 0.14 * M, 0.0012 * M]} /><Metal kind="stainless" grain="brushed" /></mesh>
    {load > 0.05 && <mesh position-y={0.001 * M} scale={[1, 0.5 * load, 0.7]}><sphereGeometry args={[0.01 * M, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>}
  </group>
}

/** 玻璃温度计：细长的玻璃管，底下一个红色的液泡，红色液柱高到 temp（0–110 °C）。原点在液泡底，竖直朝上，长 0.2 m */
export function Thermometer({ temp }: { temp: number }) {
  const L = 0.2 * M, k = Math.max(0, Math.min(1, temp / 110))
  return <group>
    <mesh position={[0, L / 2, 0]} renderOrder={7}><cylinderGeometry args={[0.0032 * M, 0.0032 * M, L, 14]} /><Glass opacity={0.3} /></mesh>
    <mesh position={[0, 0.007 * M, 0]}><sphereGeometry args={[0.004 * M, 14, 10]} /><meshStandardMaterial color="#c92c22" roughness={0.3} /></mesh>
    {/* 液柱：0 °C 在液泡上 0.025 m，110 °C 在 0.185 m */}
    <mesh position={[0, (0.025 + 0.16 * k / 2) * M, 0]}><cylinderGeometry args={[0.001 * M, 0.001 * M, (0.01 + 0.16 * k) * M, 8]} /><meshBasicMaterial color="#d23026" /></mesh>
    <mesh position={[0, 0.105 * M, -0.002 * M]}><planeGeometry args={[0.0045 * M, 0.18 * M]} /><meshStandardMaterial map={thermoTex()} roughness={0.8} /></mesh>
  </group>
}
