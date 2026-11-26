// 化验台上的器材：烧杯、锥形瓶、橡胶塞、玻璃导管、气球、试剂瓶、试管、酒精灯、铁架台和夹子、手套、
// 陶土网、坩埚钳、镁条、铁钉、钢丝棉、水电解器和学生电源。尺寸都按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里（多半是底面正中）。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { Bubbles } from './fx'
import { M, type V3 } from './site'
import { bottleLabel } from './mats'

export const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
export const memo = <K, T>(f: (k: K) => T) => { const c = new Map<K, T>(); return (k: K) => { if (!c.has(k)) c.set(k, f(k)); return c.get(k)! } }

/** 玻璃：容器里还要画东西，用便宜的做法（半透明、不写深度、双面），反光调亮；底色压暗，免得给里面的液体蒙一层白雾 */
export const Glass = ({ tint = '#9fbcc1', opacity = 0.15 }: { tint?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={tint} transparent opacity={Math.min(0.38, opacity * 1.25)} roughness={0.02} metalness={0} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={3.4} specularIntensity={1} depthWrite={false} side={THREE.DoubleSide} />
export const LiquidMat = ({ color = '#cfe6ee', opacity = 0.42 }: { color?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.06} clearcoat={0.6} depthWrite={false} />
/** 橡胶：深灰、哑光 */
const Rubber = ({ color = '#2b2b2d' }: { color?: string }) => <meshStandardMaterial color={color} roughness={0.78} />

/** 一段液体：圆柱形的液体加一层亮的液面。原点在液体底面正中 */
export function LiquidBody({ r, h, color, opacity = 0.45, top = true }: { r: number; h: number; color: string; opacity?: number; top?: boolean }) {
  if (h < 0.002) return null
  return <>
    <mesh position={[0, h / 2, 0]} renderOrder={5}><cylinderGeometry args={[r, r * 0.985, h, 40]} /><meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.5} envMapIntensity={0.3} depthWrite={false} /></mesh>
    {top && <mesh position={[0, h + 0.001, 0]} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r, 40]} /><meshPhysicalMaterial color={color} transparent opacity={Math.min(0.92, opacity + 0.12)} roughness={0.05} clearcoat={0.6} envMapIntensity={0.9} depthWrite={false} /></mesh>}
  </>
}

// ---------- 烧杯 ----------
export const BEAKER = { 100: { r: 0.026, h: 0.07 }, 250: { r: 0.035, h: 0.095 }, 500: { r: 0.043, h: 0.12 }, 1000: { r: 0.053, h: 0.145 } } as const
export type Vol = keyof typeof BEAKER
const beakerGeo = memo((vol: Vol) => {
  const { r, h } = BEAKER[vol]
  return shell(m([[0, 0], [r - 0.004, 0], [r, 0.004], [r, h - 0.004], [r + 0.0018, h - 0.0008], [r + 0.0024, h]]), 0.0018 * M, { segs: 56 })
})
/** 一只烧杯，原点在杯底正中。fill 盛了多少（0–1）；color、opacity 液体的样子 */
export function Beaker({ vol, fill = 0, color = '#cfe6ee', opacity = 0.4, marks = true, children }: { vol: Vol; fill?: number; color?: string; opacity?: number; marks?: boolean; children?: ReactNode }) {
  const { r, h } = BEAKER[vol], R = r * M, H = h * M, wall = 0.0018 * M
  return <group>
    <mesh geometry={beakerGeo(vol)} renderOrder={6}><Glass /></mesh>
    {marks && [0.3, 0.45, 0.6, 0.75].map((q, i) => <mesh key={q} position={[0, H * q, 0]} rotation-y={-0.5}><cylinderGeometry args={[R + 0.003, R + 0.003, 0.01, 24, 1, true, 0, i % 2 ? 0.3 : 0.5]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    {fill > 0.005 && <group position-y={wall}><LiquidBody r={R - wall - 0.002} h={H * fill - wall} color={color} opacity={opacity} /></group>}
    {children}
  </group>
}

// ---------- 锥形瓶、长颈漏斗、橡胶塞、导管 ----------
/** 250 mL 锥形瓶：圆底边、斜壁收到细颈，颈口外翻一圈。原点在瓶底正中；颈口在 FLASK.top */
export const FLASK = { r: 0.042, neck: 0.0135, shoulder: 0.11, top: 0.142 }
const flaskGeo = memo((_: number) => shell(m([[0, 0], [FLASK.r - 0.006, 0], [FLASK.r, 0.006], [FLASK.r - 0.001, 0.014], [FLASK.neck + 0.002, FLASK.shoulder - 0.004], [FLASK.neck, FLASK.shoulder + 0.004], [FLASK.neck, FLASK.top - 0.003], [FLASK.neck + 0.0022, FLASK.top - 0.0012], [FLASK.neck + 0.0024, FLASK.top]]), 0.0018 * M, { segs: 56 }))
/** 锥形瓶里液面高 y（m）时的内半径 */
export const flaskR = (y: number) => y < 0.014 ? FLASK.r - 0.003 : y > FLASK.shoulder ? FLASK.neck - 0.002 : FLASK.r - 0.003 - (FLASK.r - FLASK.neck - 0.001) * (y - 0.014) / (FLASK.shoulder - 0.014)
/** vivid：有颜色的溶液（硫酸铜）用带一点自发光的材质，颜色才饱和 */
export function Flask({ level = 0, color = '#dfe9ea', opacity = 0.38, vivid = false, children }: { level?: number; color?: string; opacity?: number; vivid?: boolean; children?: ReactNode }) {
  const liq = useMemo(() => {
    if (level < 0.003) return null
    const pts: RY[] = [[0, 0.002]]; for (let y = 0.002; y < level; y += 0.004) pts.push([flaskR(y) - 0.0004, y]); pts.push([flaskR(level) - 0.0004, level], [0, level])
    return lathe(m(pts), { segs: 48, crease: 60 })
  }, [Math.round(level * 500)])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>
    <mesh geometry={flaskGeo(0)} renderOrder={6}><Glass /></mesh>
    {[0.035, 0.055, 0.075].map(y => <mesh key={y} position-y={y * M} rotation-y={0.6}><cylinderGeometry args={[(flaskR(y) + 0.0042) * M, (flaskR(y) + 0.0042) * M, 0.0012 * M, 32, 1, true, 0, 0.45]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    {liq && <mesh geometry={liq} renderOrder={5}><meshStandardMaterial color={color} emissive={vivid ? color : '#000000'} emissiveIntensity={vivid ? 0.4 : 0} transparent opacity={opacity} roughness={0.25} depthWrite={false} /></mesh>}
    {liq && vivid && <mesh position-y={level * M - 0.0005} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[(flaskR(level) - 0.0004) * M, 40]} /><meshPhysicalMaterial color={color} transparent opacity={Math.min(0.95, opacity + 0.15)} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>}
    {children}
  </group>
}
/** 橡胶塞：上粗下细，原点在塞子底面正中（塞进瓶口的那一头），高 h、上口半径 r1、下口半径 r0；holes 个孔的位置（m，x 方向） */
export function Stopper({ r0 = 0.0125, r1 = 0.0155, h = 0.022, holes = [] as number[] }: { r0?: number; r1?: number; h?: number; holes?: number[] }) {
  const g = useMemo(() => lathe(m([[0, 0], [r0 - 0.001, 0], [r0, 0.001], [r1, h - 0.0015], [r1 - 0.0015, h], [0, h]]), { segs: 40 }), [r0, r1, h])
  return <group>
    <mesh geometry={g} castShadow><Rubber color="#4a3b33" /></mesh>
    {holes.map(x => <mesh key={x} position={[x * M, h * M + 0.002, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.0036 * M, 16]} /><meshBasicMaterial color="#120e0c" /></mesh>)}
  </group>
}
/** 一根玻璃导管：沿着几个点弯过去（转弯处是圆的），管外半径 r（m） */
export function GlassTube({ pts, r = 0.003, opacity = 0.32 }: { pts: V3[]; r?: number; opacity?: number }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal', 0.2), 80, r * M, 12), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} renderOrder={7}><meshPhysicalMaterial color="#9fbcc1" transparent opacity={Math.min(0.6, opacity * 1.5)} roughness={0.04} clearcoat={1} envMapIntensity={2.4} depthWrite={false} /></mesh>
}
/** 一段胶管：沿几个点弯过去 */
export function Hose({ pts, r = 0.0042 * M, color = '#8a3b2c' }: { pts: V3[]; r?: number; color?: string }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 64, r, 12), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} castShadow><meshStandardMaterial color={color} roughness={0.55} /></mesh>
}

// ---------- 试剂瓶 ----------
/** 广口瓶（大理石）：玻璃瓶身，里面一层块状固体；磨口的玻璃塞倒放在旁边。原点在瓶底正中 */
export function JarBottle({ label, amount = 0.5, band, solid }: { label: string; amount?: number; band?: string; solid: ReactNode }) {
  const g = useMemo(() => shell(m([[0, 0], [0.026, 0], [0.03, 0.004], [0.03, 0.07], [0.022, 0.082], [0.02, 0.084], [0.02, 0.095]]), 0.0022 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass opacity={0.22} /></mesh>
    <group position-y={0.004 * M} scale={[1, amount, 1]}>{solid}</group>
    <mesh position={[0, 0.045 * M, 0]} rotation-y={0.2}><cylinderGeometry args={[0.0305 * M, 0.0305 * M, 0.03 * M, 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0.05 * M, 0.012 * M, 0.01 * M]} rotation-z={0.3}><cylinderGeometry args={[0.018 * M, 0.016 * M, 0.024 * M, 24]} /><Glass opacity={0.35} /></mesh>
  </group>
}
/** 细口瓶（稀盐酸、稀硫酸、石灰水）：瓶身装着无色的液体，细颈上插着磨口塞。原点在瓶底正中 */
export function NarrowBottle({ label, band, color = '#e7eef0', brown = false }: { label: string; band?: string; color?: string; brown?: boolean }) {
  const g = useMemo(() => shell(m([[0, 0], [0.028, 0], [0.032, 0.004], [0.032, 0.08], [0.012, 0.1], [0.0095, 0.104], [0.0095, 0.12]]), 0.002 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass tint={brown ? '#4a2810' : undefined} opacity={brown ? 0.55 : 0.2} /></mesh>
    <mesh position-y={0.038 * M} renderOrder={5}><cylinderGeometry args={[0.0295 * M, 0.0295 * M, 0.07 * M, 32]} /><LiquidMat color={color} opacity={0.32} /></mesh>
    <mesh position={[0, 0.046 * M, 0]} rotation-y={0.25}><cylinderGeometry args={[0.0325 * M, 0.0325 * M, 0.032 * M, 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    {/* 磨口塞：一截锥形的塞柄加一个扁圆的头 */}
    <mesh position-y={0.124 * M}><cylinderGeometry args={[0.0085 * M, 0.0075 * M, 0.012 * M, 24]} /><Glass opacity={0.4} /></mesh>
    <mesh position-y={0.134 * M} scale={[1, 0.45, 1]}><sphereGeometry args={[0.013 * M, 24, 12]} /><Glass opacity={0.4} /></mesh>
  </group>
}

// ---------- 试管 ----------
/** 试管：直径 15 mm、长 15 cm，圆底。原点在管底，沿 y 朝上 */
export const TUBE = { r: 0.0095, h: 0.16 }
const tubeGeo = memo((_: number) => {
  const r = TUBE.r, h = TUBE.h, pts: RY[] = []
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push([Math.sin(a) * r, r - Math.cos(a) * r]) }
  pts.push([r, h - 0.001], [r + 0.0012, h])
  return shell(m(pts), 0.0009 * M, { segs: 32, crease: 50 })
})
/** fill 盛了多少（0–1）；color、opacity 液体的样子 */
export function TestTube({ fill = 0.3, color = '#e4eef0', opacity = 0.4, vivid = false }: { fill?: number; color?: string; opacity?: number; vivid?: boolean }) {
  const r = (TUBE.r - 0.0009) * M, h = TUBE.h * fill * M
  /** 有颜色的溶液（石蕊）：用不透明一点、带一点自发光的材质，颜色才饱和 */
  const Liquid = vivid ? ({ color, opacity }: { color: string; opacity: number }) => <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.25} transparent opacity={opacity} depthWrite={false} /> : LiquidMat
  return <group>
    <mesh geometry={tubeGeo(0)} renderOrder={7}><Glass opacity={0.2} /></mesh>
    {fill > 0 && <>
      <mesh position-y={r} renderOrder={vivid ? 8 : 5}><sphereGeometry args={[r * 0.98, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><Liquid color={color} opacity={opacity} /></mesh>
      <mesh position-y={r + (h - r) / 2} renderOrder={vivid ? 8 : 5}><cylinderGeometry args={[r * 0.98, r * 0.98, h - r, 20]} /><Liquid color={color} opacity={opacity} /></mesh>
      <mesh position-y={h} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r * 0.98, 20]} /><meshPhysicalMaterial color={color} transparent opacity={Math.min(0.9, opacity + 0.15)} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    </>}
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
/** 木头试管夹：两片长木条，一头夹着试管。原点在夹口中心，柄朝 +x */
export function TubeHolder() {
  const wood = <meshStandardMaterial color="#c9a06c" roughness={0.7} />
  return <group>
    {[-1, 1].map(s => <RoundedBox key={s} args={[0.18 * M, 0.006 * M, 0.01 * M]} radius={0.0018 * M} position={[0.085 * M, s * 0.0052 * M, 0]} castShadow>{wood}</RoundedBox>)}
    <mesh position={[0.05 * M, 0, 0]} rotation-z={Math.PI / 2}><torusGeometry args={[0.0045 * M, 0.0008 * M, 8, 16]} /><Metal kind="steel" /></mesh>
  </group>
}

// ---------- 酒精灯、网罩 ----------
/** 酒精灯：扁圆的玻璃灯身，细颈，瓷的灯芯管，里面大半瓶酒精。原点在灯底正中，灯芯顶在 LAMP_TOP */
export const LAMP_TOP = 0.098
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
// ---------- 铁架台、夹子 ----------
/** 铁架台：铸铁底座、立杆。原点在底座底面正中，立杆在 z = rodZ（m），高 rodH */
export function IronStand({ rodH = 0.5, rodZ = -0.04, children }: { rodH?: number; rodZ?: number; children?: ReactNode }) {
  return <group>
    <RoundedBox args={[0.13 * M, 0.014 * M, 0.2 * M]} radius={0.006 * M} smoothness={3} position={[0, 0.007 * M, 0]} castShadow receiveShadow><meshStandardMaterial color="#25292d" roughness={0.45} metalness={0.4} /></RoundedBox>
    <mesh position={[0, rodH * M / 2, rodZ * M]} castShadow><cylinderGeometry args={[0.0055 * M, 0.0055 * M, rodH * M, 20]} /><Metal kind="chrome" rough={0.12} /></mesh>
    <mesh position={[0, 0.016 * M, rodZ * M]}><cylinderGeometry args={[0.011 * M, 0.013 * M, 0.006 * M, 20]} /><Metal kind="steel" grain="turned" /></mesh>
    {children}
  </group>
}
/** 一只夹子：从立杆伸出的夹臂，前端两片夹口（垫着软木）。原点在夹口中心，夹臂朝 −z 伸回立杆，len 是夹臂长（m）；open 夹口半宽 */
export function Clamp({ len = 0.1, open = 0.012 }: { len?: number; open?: number }) {
  return <group>
    <mesh position={[0, 0, -len * M / 2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.003 * M, 0.003 * M, len * M, 10]} /><Metal kind="steel" /></mesh>
    {[-1, 1].map(s => <group key={s}>
      <RoundedBox args={[0.006 * M, 0.02 * M, 0.024 * M]} radius={0.002 * M} position={[s * (open * M + 0.003 * M), 0, 0]}><Metal kind="aluminum" grain="cast" /></RoundedBox>
      <mesh position={[s * open * M, 0, 0]}><boxGeometry args={[0.002 * M, 0.018 * M, 0.02 * M]} /><meshStandardMaterial color="#b58a5a" roughness={1} /></mesh>
    </group>)}
    <RoundedBox args={[0.022 * M, 0.024 * M, 0.022 * M]} radius={0.003 * M} position={[0, 0, -len * M]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[0.016 * M, 0, -len * M]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0035 * M, 0.0035 * M, 0.014 * M, 10]} /><Metal kind="steel" /></mesh>
    <mesh position={[0.025 * M, 0, -len * M]}><sphereGeometry args={[0.005 * M, 12, 10]} /><Metal kind="iron" grain="cast" /></mesh>
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
// ---------- 小件 ----------
/** 白瓷点滴板上的一小块：铺在台面上的白瓷砖（垫在样品下面）。原点在底面正中 */
export function Tile({ w = 0.15, d = 0.15 }: { w?: number; d?: number }) {
  return <RoundedBox args={[w * M, 0.006 * M, d * M]} radius={0.0015 * M} smoothness={2} position-y={0.003 * M} receiveShadow castShadow><meshPhysicalMaterial color="#f3f2ed" roughness={0.2} clearcoat={0.8} /></RoundedBox>
}
/** 一只带刻度盘的圆形底座（放模型、样品）。原点在底面正中 */
export function Plinth({ r = 0.06, h = 0.02 }: { r?: number; h?: number }) {
  const g = useMemo(() => disc(r * M, h * M, { chamfer: 0.004 * M }), [r, h])
  return <mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial color="#1d2124" roughness={0.35} clearcoat={0.6} /></mesh>
}

// ---------- 气球 ----------
/**
 * 套在玻璃管口上的气球：红色的薄乳胶，k 是鼓起的程度（0 瘪着，1 鼓圆）。原点在玻璃管口，气球往 +y 长。
 * 做法：沿一条“脊线”扫出一根粗细变化的管子。鼓起来时脊线竖直、中段粗成一个球；瘪的时候脊线从扎口往旁边弯下去，
 * 软塌塌地贴着管口垂下来，截面压扁，表面有一道道褶。
 */
export function Balloon({ k }: { k: number }) {
  const q = Math.max(0, Math.min(1, k))
  const g = useMemo(() => {
    const w = 1 - q, neck = 0.0045, R = 0.011 + 0.026 * q, L = 0.048 + 0.028 * q, N = 48, RS = 28
    // 脊线：先竖直走一小段（套在管口上的那截），再朝 +x 弯过去，瘪的时候弯到朝下
    const spine: THREE.Vector3[] = []
    let x = 0, y = 0, ang = 0
    const turn = w * 2.75, seg = L / N
    for (let i = 0; i <= N; i++) {
      const s = i / N
      spine.push(new THREE.Vector3(x * M, y * M, 0))
      const a = s < 0.18 ? 0 : turn * Math.min(1, (s - 0.18) / 0.55)
      ang = a; x += Math.sin(ang) * seg; y += Math.cos(ang) * seg
    }
    const curve = new THREE.CatmullRomCurve3(spine)
    const tube = new THREE.TubeGeometry(curve, N, 1, RS, false)
    const p = tube.attributes.position, frames = curve.computeFrenetFrames(N, false), c = new THREE.Vector3(), nrm = new THREE.Vector3(), bin = new THREE.Vector3()
    for (let i = 0; i <= N; i++) {
      const s = i / N, u = (s - 0.14) / 0.86
      const body = u <= 0 ? 0 : R * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, u))), 0.55)
      let r = u < 0.5 ? Math.max(neck, body) : body
      if (i === N) r = 0
      curve.getPointAt(s, c); nrm.copy(frames.normals[i]); bin.copy(frames.binormals[i])
      for (let j = 0; j <= RS; j++) {
        const a = j / RS * Math.PI * 2
        // 褶：越瘪越深；截面压扁（瘪气球是扁的一片）
        const wr = 1 - w * (0.22 * (0.5 + 0.5 * Math.sin(a * 6 + s * 23)) + 0.1 * Math.sin(a * 3 - s * 15)) * (u > 0.05 ? 1 : 0)
        const rx = r * wr * M, rz = r * wr * M * (1 - w * 0.55)
        const idx = i * (RS + 1) + j
        p.setXYZ(idx, c.x + nrm.x * Math.cos(a) * rx + bin.x * Math.sin(a) * rz, c.y + nrm.y * Math.cos(a) * rx + bin.y * Math.sin(a) * rz, c.z + nrm.z * Math.cos(a) * rx + bin.z * Math.sin(a) * rz)
      }
    }
    tube.computeVertexNormals()
    return tube
  }, [Math.round(q * 40)])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group position-y={-0.008 * M} rotation-y={0.5}>
    <mesh geometry={g} castShadow renderOrder={8}><meshPhysicalMaterial color="#c42f28" roughness={0.42 - q * 0.12} clearcoat={0.4 + q * 0.4} clearcoatRoughness={0.3} sheen={0.5} sheenColor="#ff9b8a" side={THREE.DoubleSide} /></mesh>
    {/* 扎口的一圈细线 */}
    <mesh position-y={0.006 * M}><torusGeometry args={[0.0052 * M, 0.0007 * M, 6, 20]} /><meshStandardMaterial color="#e9e3d2" roughness={0.8} /></mesh>
  </group>
}

// ---------- 红磷、细沙、铁钉、镁条、钢丝棉 ----------
/** 锥形瓶底铺的一层细沙和沙上的一小堆红磷。burnt：红磷烧掉了多少（0–1），剩下的变成一层白色的五氧化二磷 */
export function SandAndP({ burnt = 0 }: { burnt?: number }) {
  const sand = useMemo(() => { const g = new THREE.CylinderGeometry((FLASK.r - 0.0035) * M, (FLASK.r - 0.004) * M, 0.008 * M, 40); g.translate(0, 0.006 * M, 0); return g }, [])
  const p = useMemo(() => { const gs: THREE.BufferGeometry[] = []; let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 14; i++) { const q = new THREE.IcosahedronGeometry(0.0017 * M * (0.7 + r() * 0.6), 0); q.translate((r() - 0.5) * 0.008 * M, 0.0105 * M + r() * 0.002 * M, (r() - 0.5) * 0.008 * M); gs.push(q) } return mergeGeometries(gs) }, [])
  return <group>
    <mesh geometry={sand} receiveShadow><meshStandardMaterial color="#d8c69a" roughness={1} /></mesh>
    <mesh geometry={p} scale={[1, Math.max(0.05, 1 - burnt), 1]}><meshStandardMaterial color="#8f2418" roughness={0.8} flatShading /></mesh>
    {burnt > 0.05 && <mesh position-y={0.0102 * M} rotation-x={-Math.PI / 2}><circleGeometry args={[(FLASK.r - 0.005) * M, 40]} /><meshStandardMaterial color="#f2f0ea" roughness={1} transparent opacity={0.85 * burnt} depthWrite={false} /></mesh>}
  </group>
}
/** 一根铁钉：钉帽、钉身、钉尖。原点在钉帽中心，钉身朝 −y。copper：表面盖了多少铜（0–1） */
const nailGeo = lathe(m([[0, 0.003], [0.0032, 0.003], [0.0034, 0.0015], [0.0034, 0], [0.0012, -0.0004], [0.0012, -0.042], [0, -0.048]]), { segs: 20 })
export function Nail({ copper = 0 }: { copper?: number }) {
  const col = useMemo(() => new THREE.Color().setRGB(0.5, 0.5, 0.52).lerp(new THREE.Color().setRGB(0.55, 0.12, 0.04), copper), [copper])
  return <mesh geometry={nailGeo} castShadow renderOrder={5.5}><meshStandardMaterial transparent color={col} emissive={col} emissiveIntensity={copper * 0.3} metalness={0.85 - copper * 0.55} roughness={0.38 + copper * 0.35} envMapIntensity={1.4} /></mesh>
}
/** 一段镁条：打磨过的银白色薄带，卷成一个小螺旋，原点在一头，沿 +x 伸出 len（m）；burnt 烧掉了多少 */
export function MgStrip({ len = 0.1, burnt = 0 }: { len?: number; burnt?: number }) {
  const g = useMemo(() => {
    const L = len * (1 - burnt); if (L < 0.003) return null
    const pts: THREE.Vector3[] = []; for (let i = 0; i <= 40; i++) { const t = i / 40, x = t * L; const coil = Math.max(0, (t - 0.55) / 0.45); pts.push(new THREE.Vector3(x * M, Math.sin(coil * 9) * coil * 0.006 * M, Math.cos(coil * 9) * coil * 0.006 * M - coil * 0.006 * M)) }
    const curve = new THREE.CatmullRomCurve3(pts), s = new THREE.Shape(); s.moveTo(-0.0015 * M, -0.0002 * M); s.lineTo(0.0015 * M, -0.0002 * M); s.lineTo(0.0015 * M, 0.0002 * M); s.lineTo(-0.0015 * M, 0.0002 * M)
    return new THREE.ExtrudeGeometry(s, { steps: 60, extrudePath: curve, bevelEnabled: false })
  }, [len, Math.round(burnt * 30)])   // eslint-disable-line react-hooks/exhaustive-deps
  return g ? <mesh geometry={g} castShadow><meshStandardMaterial color="#d6d9dc" metalness={0.9} roughness={0.25} envMapIntensity={1.8} /></mesh> : null
}
/** 一堆白色的氧化镁粉末：铺在陶土网中间。k 是多少（0–1） */
export function MgOPile({ k }: { k: number }) {
  if (k < 0.02) return null
  return <mesh position-y={0.001 * M} scale={[1, k, 1]}><sphereGeometry args={[0.014 * M, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f4f3ef" roughness={1} /></mesh>
}
/** 陶土网：方形的铁丝网，中间一块圆形的陶土。原点在底面正中 */
export function ClayNet({ s = 0.12 }: { s?: number }) {
  const grid = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!
    g.clearRect(0, 0, 256, 256); g.strokeStyle = '#5d6064'; g.lineWidth = 2; for (let i = 0; i <= 256; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke() }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  return <group>
    <mesh position-y={0.0008 * M} rotation-x={-Math.PI / 2} castShadow receiveShadow><planeGeometry args={[s * M, s * M]} /><meshStandardMaterial map={grid} transparent alphaTest={0.3} metalness={0.6} roughness={0.5} side={THREE.DoubleSide} /></mesh>
    <mesh position-y={0.0012 * M} castShadow receiveShadow><cylinderGeometry args={[s * 0.36 * M, s * 0.37 * M, 0.0022 * M, 40]} /><meshStandardMaterial color="#e3dccd" roughness={1} /></mesh>
    {[-1, 1].map(k => <mesh key={k} position={[k * s * M / 2, 0.0008 * M, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.0008 * M, 0.0008 * M, s * M, 6]} /><Metal kind="steel" /></mesh>)}
  </group>
}
/** 坩埚钳：两根不锈钢长杆在中间铰在一起，前端弯钩夹口。原点在夹口，柄朝 +x */
export function CrucibleTongs() {
  const steel = <Metal kind="stainless" env={2} />
  return <group>
    {[-1, 1].map(s => <group key={s} rotation-y={s * 0.05}>
      <mesh position={[0.1 * M, 0, s * 0.002 * M]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0018 * M, 0.0018 * M, 0.2 * M, 10]} />{steel}</mesh>
      <mesh position={[0.204 * M, 0, s * 0.012 * M]}><torusGeometry args={[0.008 * M, 0.0016 * M, 8, 20]} />{steel}</mesh>
      <mesh position={[0.004 * M, 0.002 * M * s, s * 0.002 * M]}><sphereGeometry args={[0.0028 * M, 10, 8]} />{steel}</mesh>
    </group>)}
    <mesh position={[0.07 * M, 0, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.003 * M, 0.003 * M, 0.008 * M, 12]} />{steel}</mesh>
  </group>
}
/** 一团钢丝棉：几百根细钢丝绕成的一团，灰色发亮。burnt 烧过的程度（变黑） */
export function SteelWool({ burnt = 0 }: { burnt?: number }) {
  const g = useMemo(() => {
    let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    const gs: THREE.BufferGeometry[] = []
    for (let k = 0; k < 26; k++) {
      const pts: THREE.Vector3[] = [], a0 = r() * 6.28, b0 = r() * 3
      for (let i = 0; i < 30; i++) { const a = a0 + i * 0.5, b = b0 + i * 0.37, rr = 0.016 + 0.01 * r(); pts.push(new THREE.Vector3(Math.cos(a) * Math.sin(b) * rr * 1.3 * M, (0.012 + Math.cos(b) * rr * 0.6) * M, Math.sin(a) * Math.sin(b) * rr * M)) }
      gs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.00035 * M, 4))
    }
    return mergeGeometries(gs)
  }, [])
  const col = useMemo(() => new THREE.Color().setRGB(0.55, 0.56, 0.58).lerp(new THREE.Color().setRGB(0.12, 0.11, 0.12), burnt), [burnt])
  return <mesh geometry={g} castShadow><meshStandardMaterial color={col} metalness={0.9 - burnt * 0.5} roughness={0.35 + burnt * 0.4} envMapIntensity={1.6} /></mesh>
}
/** 一节 9 V 叠层电池：方盒，顶上两只按扣电极。原点在底面正中 */
export function Battery() {
  return <group>
    <RoundedBox args={[0.026 * M, 0.048 * M, 0.017 * M]} radius={0.002 * M} smoothness={3} position-y={0.024 * M} castShadow><meshPhysicalMaterial color="#1d2a3a" roughness={0.35} clearcoat={0.6} /></RoundedBox>
    <mesh position={[0, 0.03 * M, 0.0086 * M]}><planeGeometry args={[0.024 * M, 0.02 * M]} /><meshStandardMaterial color="#d9a320" roughness={0.5} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.0064 * M, 0.0505 * M, 0]}><cylinderGeometry args={[(s > 0 ? 0.0035 : 0.004) * M, (s > 0 ? 0.0035 : 0.004) * M, 0.004 * M, s > 0 ? 6 : 16]} /><Metal kind="stainless" /></mesh>)}
  </group>
}
/** 小烧杯底的一层白色粉末（碳酸钠）。k 剩多少 */
export function Powder({ r, k = 1 }: { r: number; k?: number }) {
  if (k < 0.02) return null
  return <mesh position-y={0.002 * M} scale={[1, k, 1]}><cylinderGeometry args={[r * 0.6 * M, r * 0.9 * M, 0.006 * M, 32]} /><meshStandardMaterial color="#f5f4f0" roughness={1} /></mesh>
}

// ---------- 水电解器和学生电源 ----------
/** 水电解器（霍夫曼式）的尺寸（m）：两根带刻度的玻璃管、中间一根长颈的储水管，底下一段横管连着 */
export const HOF = { gap: 0.06, r: 0.009, h: 0.36, base: 0.05, bulb: 0.025 }
const hofTube = memo((_: number) => shell(m([[HOF.r, 0], [HOF.r, HOF.h - 0.02], [HOF.r * 0.45, HOF.h - 0.004], [HOF.r * 0.45, HOF.h + 0.012]]), 0.0011 * M, { segs: 32 }))
/** 刻度：每 1 cm 一道短线，每 5 cm 一道长线 */
const scaleTex = (() => { let t: THREE.CanvasTexture | null = null; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = 64; c.height = 1024; const g = c.getContext('2d')!; g.clearRect(0, 0, 64, 1024); g.fillStyle = '#f3f6f6'; for (let i = 0; i <= 30; i++) { const y = 1000 - i * 32; g.fillRect(0, y, i % 5 ? 22 : 44, 3) } t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t } })()
/**
 * 水电解器：原点在底座正中。gasL、gasR：左管（接负极）、右管（接正极）顶部积了多高的气（m）。
 * 底座上一根立杆，两只夹子夹住两根管；管底各一个铂电极；中间储水管上端一只球形的储水球
 */
export function Electrolyzer({ gasL, gasR, on }: { gasL: number; gasR: number; on: boolean }) {
  const y0 = HOF.base + 0.03, water = '#d7e7ec'
  const mid = useMemo(() => shell(m([[0.006, 0], [0.006, HOF.h - 0.03], [0.02, HOF.h + 0.0], [HOF.bulb, HOF.h + 0.03], [0.02, HOF.h + 0.06], [0.012, HOF.h + 0.07], [0.013, HOF.h + 0.075]]), 0.0011 * M, { segs: 32 }), [])
  const cross = useMemo(() => { const g = new THREE.CylinderGeometry(0.007 * M, 0.007 * M, HOF.gap * 2 * M, 20, 1, true); g.rotateZ(Math.PI / 2); return g }, [])
  const tube = (x: number, gas: number, label: string) => <group position={[x * M, y0 * M, 0]}>
    <mesh geometry={hofTube(0)} renderOrder={7}><Glass opacity={0.22} /></mesh>
    <mesh position={[0, 0.17 * M, (HOF.r + 0.0003) * M]} renderOrder={8}><planeGeometry args={[0.006 * M, 0.31 * M]} /><meshBasicMaterial map={scaleTex()} transparent depthWrite={false} /></mesh>
    {/* 管里的水：从管底到气体下沿 */}
    <group position-y={0.004 * M}><LiquidBody r={(HOF.r - 0.0013) * M} h={Math.max(0.01, HOF.h - 0.024 - gas) * M} color={water} opacity={0.38} /></group>
    {/* 活塞：管顶一只玻璃旋塞 */}
    <mesh position-y={(HOF.h + 0.006) * M} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.004 * M, 0.004 * M, 0.02 * M, 12]} /><Glass opacity={0.5} /></mesh>
    <mesh position={[0.012 * M, (HOF.h + 0.006) * M, 0]}><boxGeometry args={[0.006 * M, 0.008 * M, 0.003 * M]} /><Glass opacity={0.55} /></mesh>
    {/* 铂电极：管底伸进去的一小片 */}
    <mesh position-y={0.012 * M}><boxGeometry args={[0.004 * M, 0.014 * M, 0.0006 * M]} /><Metal kind="chrome" rough={0.2} /></mesh>
    <mesh position-y={-0.006 * M}><cylinderGeometry args={[0.0045 * M, 0.0045 * M, 0.012 * M, 16]} /><meshStandardMaterial color="#202326" roughness={0.6} /></mesh>
    <mesh position-y={-0.013 * M}><cylinderGeometry args={[0.002 * M, 0.002 * M, 0.006 * M, 8]} /><meshStandardMaterial color={label === '-' ? '#2a2d31' : '#b8291f'} roughness={0.5} /></mesh>
    {on && <Bubbles at={[0, 0.02 * M, 0]} top={Math.max(0.02, HOF.h - 0.045 - gas) * M} on rate={label === '-' ? 60 : 30} r={0.0009 * M} spread={0.003 * M} speed={0.08 * M} seed={label === '-' ? 2 : 5} />}
  </group>
  return <group>
    {/* 底座、立杆、两只夹子 */}
    <RoundedBox args={[0.2 * M, 0.018 * M, 0.12 * M]} radius={0.006 * M} smoothness={3} position-y={0.009 * M} castShadow receiveShadow><meshStandardMaterial color="#25292d" roughness={0.45} metalness={0.4} /></RoundedBox>
    <mesh position={[0, 0.25 * M, -0.04 * M]} castShadow><cylinderGeometry args={[0.0055 * M, 0.0055 * M, 0.48 * M, 20]} /><Metal kind="chrome" rough={0.12} /></mesh>
    {[0.16, 0.3].map(y => <group key={y} position={[0, (y0 + y) * M, 0]}>
      <mesh position-z={-0.02 * M} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.0025 * M, 0.0025 * M, 0.04 * M, 8]} /><Metal kind="steel" /></mesh>
      <RoundedBox args={[HOF.gap * 2.5 * M, 0.012 * M, 0.006 * M]} radius={0.002 * M} position-z={-HOF.r * M - 0.004 * M}><Metal kind="aluminum" grain="cast" /></RoundedBox>
    </group>)}
    {tube(-HOF.gap, gasL, '-')}
    {tube(HOF.gap, gasR, '+')}
    {/* 中间的储水管和底下的横管 */}
    <group position-y={y0 * M}>
      <mesh geometry={mid} renderOrder={7}><Glass opacity={0.22} /></mesh>
      <group position-y={0.004 * M}><LiquidBody r={0.0048 * M} h={(HOF.h - 0.03 + (gasL + gasR) * 0.06) * M} color={water} opacity={0.38} top={false} /></group>
      <mesh geometry={cross} position-y={0.006 * M} renderOrder={7}><Glass opacity={0.25} /></mesh>
      <mesh position-y={0.006 * M} rotation-z={Math.PI / 2} renderOrder={5}><cylinderGeometry args={[0.0058 * M, 0.0058 * M, HOF.gap * 2 * M, 16]} /><LiquidMat color={water} opacity={0.36} /></mesh>
      <group position-y={(HOF.h + 0.012) * M}><LiquidBody r={0.017 * M} h={0.024 * M} color={water} opacity={0.36} /></group>
    </group>
  </group>
}
/** 学生电源：浅灰的机箱，正面一块数字表、一只旋钮、红黑两个接线柱和电源开关。原点在底面正中，正面朝 +z */
export function PowerSupply({ on }: { on: boolean }) {
  return <group>
    <RoundedBox args={[0.2 * M, 0.1 * M, 0.16 * M]} radius={0.006 * M} smoothness={3} position-y={0.05 * M} castShadow receiveShadow><meshPhysicalMaterial color="#d8dbd6" roughness={0.45} clearcoat={0.3} /></RoundedBox>
    <mesh position={[0, 0.05 * M, 0.0802 * M]}><planeGeometry args={[0.19 * M, 0.09 * M]} /><meshStandardMaterial color="#3a4148" roughness={0.6} /></mesh>
    <mesh position={[-0.05 * M, 0.065 * M, 0.081 * M]}><planeGeometry args={[0.06 * M, 0.026 * M]} /><meshBasicMaterial color={on ? '#2b0e08' : '#101214'} toneMapped={false} /></mesh>
    <mesh position={[-0.05 * M, 0.065 * M, 0.0815 * M]}><planeGeometry args={[0.05 * M, 0.016 * M]} /><meshBasicMaterial color={on ? '#ff5a3c' : '#1a1c1e'} toneMapped={false} transparent opacity={on ? 0.9 : 1} /></mesh>
    <mesh position={[0.02 * M, 0.06 * M, 0.088 * M]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.012 * M, 0.013 * M, 0.014 * M, 24]} /><meshStandardMaterial color="#1c1e21" roughness={0.5} /></mesh>
    {[[0.06, '#b8291f'], [0.08, '#1f2124']].map(([x, c]) => <mesh key={x as number} position={[(x as number) * M, 0.03 * M, 0.088 * M]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.005 * M, 0.006 * M, 0.016 * M, 12]} /><meshStandardMaterial color={c as string} roughness={0.4} /></mesh>)}
    <mesh position={[-0.075 * M, 0.025 * M, 0.084 * M]}><boxGeometry args={[0.02 * M, 0.012 * M, 0.01 * M]} /><meshStandardMaterial color={on ? '#d7372d' : '#6b6e70'} roughness={0.5} emissive={on ? '#d7372d' : '#000'} emissiveIntensity={on ? 0.6 : 0} /></mesh>
  </group>
}
