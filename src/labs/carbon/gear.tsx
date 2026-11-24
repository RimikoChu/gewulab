// 化验台上的器材：烧杯、锥形瓶、长颈漏斗、橡胶塞、玻璃导管、集气瓶和玻璃片、试剂瓶、试管和试管架、试管夹、
// 酒精灯和网罩、铁架台和夹子、蜡烛、软塑料瓶、手套、木条、胶管。尺寸都按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里（多半是底面正中）。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { M, type V3 } from './world'
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
export function Flask({ level = 0, color = '#dfe9ea', opacity = 0.38, children }: { level?: number; color?: string; opacity?: number; children?: ReactNode }) {
  const liq = useMemo(() => {
    if (level < 0.003) return null
    const pts: RY[] = [[0, 0.002]]; for (let y = 0.002; y < level; y += 0.004) pts.push([flaskR(y) - 0.0004, y]); pts.push([flaskR(level) - 0.0004, level], [0, level])
    return lathe(m(pts), { segs: 48, crease: 60 })
  }, [Math.round(level * 500)])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>
    <mesh geometry={flaskGeo(0)} renderOrder={6}><Glass /></mesh>
    {[0.035, 0.055, 0.075].map(y => <mesh key={y} position-y={y * M} rotation-y={0.6}><cylinderGeometry args={[(flaskR(y) + 0.0042) * M, (flaskR(y) + 0.0042) * M, 0.0012 * M, 32, 1, true, 0, 0.45]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    {liq && <mesh geometry={liq} renderOrder={5}><meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.25} depthWrite={false} /></mesh>}
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
/** 长颈漏斗：上面一只小漏斗，下面一根长颈。原点在颈的下端，长 len（m），漏斗口在 len + 0.045 */
export function LongFunnel({ len = 0.2 }: { len?: number }) {
  const g = useMemo(() => shell(m([[0.0032, 0], [0.0032, len], [0.006, len + 0.006], [0.024, len + 0.04], [0.0255, len + 0.045]]), 0.0011 * M, { segs: 40 }), [len])
  return <mesh geometry={g} renderOrder={7}><Glass opacity={0.24} /></mesh>
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

// ---------- 集气瓶、玻璃片 ----------
/** 集气瓶（125 mL）：圆柱形，肩部收成宽口，瓶口磨砂。原点在瓶底正中，瓶口在 JAR.h */
export const JAR = { r: 0.029, h: 0.13, mouth: 0.022 }
const jarGeo = memo((_: number) => shell(m([[0, 0], [JAR.r - 0.004, 0], [JAR.r, 0.004], [JAR.r, JAR.h - 0.022], [JAR.mouth + 0.002, JAR.h - 0.01], [JAR.mouth, JAR.h - 0.006], [JAR.mouth, JAR.h]]), 0.0022 * M, { segs: 56 }))
export function GasJar({ gas = 0, children }: { gas?: number; children?: ReactNode }) {
  return <group>
    <mesh geometry={jarGeo(0)} renderOrder={6}><Glass opacity={0.18} /></mesh>
    {/* 磨砂的瓶口：一圈白灰 */}
    <mesh position-y={(JAR.h - 0.003) * M}><cylinderGeometry args={[(JAR.mouth + 0.0002) * M, (JAR.mouth + 0.0002) * M, 0.006 * M, 40, 1, true]} /><meshStandardMaterial color="#e6ecec" roughness={0.9} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    {gas > 0 && children}
  </group>
}
/** 毛玻璃片：边长 7 cm、厚 3 mm，一面磨砂。原点在底面正中 */
export function GlassPlate({ s = 0.07 }: { s?: number }) {
  return <RoundedBox args={[s * M, 0.003 * M, s * M]} radius={0.001 * M} smoothness={2} position-y={0.0015 * M} renderOrder={8}><meshPhysicalMaterial color="#e9f1f1" transparent opacity={0.5} roughness={0.35} clearcoat={0.6} envMapIntensity={1.6} depthWrite={false} /></RoundedBox>
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
/** 灯罩形的金属网罩：罩在酒精灯火焰外面，火焰更集中、温度更高。原点在罩的底沿 */
export function LampHood() {
  const g = useMemo(() => shell(m([[0.016, 0], [0.016, 0.03], [0.012, 0.05]]), 0.0006 * M, { segs: 32 }), [])
  return <mesh geometry={g}><meshStandardMaterial color="#6e6b66" metalness={0.8} roughness={0.45} wireframe /></mesh>
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

// ---------- 蜡烛 ----------
/** 一支白蜡烛，原点在底面，h 是蜡烛的高（m），烛芯顶在 h + 0.008 */
export const CANDLE = { r: 0.0065 }
const candleGeo = memo((h: number) => lathe(m([[0, 0], [CANDLE.r, 0], [CANDLE.r, h - 0.002], [CANDLE.r - 0.0015, h], [0.003, h - 0.0015], [0, h - 0.002]]), { segs: 32 }))
export function Candle({ h = 0.05, lit = true }: { h?: number; lit?: boolean }) {
  return <group>
    <mesh geometry={candleGeo(h)} castShadow><meshPhysicalMaterial color="#f3eee2" roughness={0.55} transmission={0.15} thickness={0.2} sheen={0.3} emissive="#f0c890" emissiveIntensity={lit ? 0.14 : 0} /></mesh>
    <mesh position={[0, (h + 0.003) * M, 0]} rotation-z={lit ? 0.1 : 0.35}><cylinderGeometry args={[0.0006 * M, 0.0007 * M, 0.008 * M, 6]} /><meshStandardMaterial color="#1c1612" roughness={0.9} /></mesh>
  </group>
}

// ---------- 手套、木条 ----------
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
/** 一根细木条：原点在燃着的那一头，木条朝 +y 伸出去 0.16 m。char 头上烧黑的程度 */
export function Splint({ char = 0 }: { char?: number }) {
  return <group>
    <mesh position-y={0.08 * M} castShadow><boxGeometry args={[0.004 * M, 0.16 * M, 0.0025 * M]} /><meshStandardMaterial color="#d8b47a" roughness={0.8} /></mesh>
    <mesh position-y={0.005 * M}><boxGeometry args={[0.0042 * M, 0.012 * M, 0.0027 * M]} /><meshStandardMaterial color={new THREE.Color('#d8b47a').lerp(new THREE.Color('#2b1d12'), char)} roughness={0.9} /></mesh>
  </group>
}

// ---------- 软塑料瓶 ----------
/**
 * 软塑料瓶（矿泉水瓶，500 mL）：薄薄的透明塑料，瓶身几道加强环，螺口和瓶盖。原点在瓶底正中，瓶口在 0.2 m。
 * k：瓶子缩到原来的几成（1 是鼓的）。缩的时候瓶身一圈出现几道凹进去的褶，越缩越深
 */
export const PET = { r: 0.032, h: 0.2 }
export function SoftBottle({ k = 1, cap = true, fill = 0, color = '#dbe9ec' }: { k?: number; cap?: boolean; fill?: number; color?: string }) {
  const dent = Math.max(0, Math.min(1, (1 - k) / 0.36))
  const geo = useMemo(() => {
    const R = PET.r, prof: RY[] = [[0, 0.001], [R - 0.008, 0], [R - 0.002, 0.004], [R, 0.012]]
    for (let y = 0.02; y <= 0.14; y += 0.004) prof.push([R - (Math.abs(Math.sin(y * 80)) > 0.97 ? 0.0016 : 0), y])
    prof.push([R - 0.002, 0.148], [0.024, 0.165], [0.014, 0.18], [0.0125, 0.186], [0.0125, 0.2])
    const g = shell(m(prof), 0.0004 * M, { segs: 64, crease: 70 }), p = g.attributes.position, v = new THREE.Vector3()
    // 瓶身中段往里瘪：六道竖褶，深浅随 dent
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const y = v.y / M, w = y > 0.015 && y < 0.15 ? Math.sin((y - 0.015) / 0.135 * Math.PI) : 0
      if (w <= 0) continue
      const a = Math.atan2(v.z, v.x), q = 0.55 + 0.45 * Math.cos(a * 6 + y * 30)
      const s = 1 - dent * w * (0.12 + 0.42 * q)
      v.x *= s; v.z *= s * (1 - dent * w * 0.15); p.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    return g
  }, [Math.round(dent * 40)])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>
    <mesh geometry={geo} renderOrder={7} castShadow><meshPhysicalMaterial color="#5f7479" transparent opacity={0.2} roughness={0.08} clearcoat={0.9} envMapIntensity={1.6} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    {fill > 0.01 && <mesh position-y={(0.002 + fill * 0.07) * M} renderOrder={5} scale={[1 - dent * 0.22, 1, 1 - dent * 0.3]}><cylinderGeometry args={[(PET.r - 0.002) * M, (PET.r - 0.003) * M, fill * 0.14 * M, 40]} /><LiquidMat color={color} opacity={0.42} /></mesh>}
    {cap && <group position-y={0.188 * M}>
      <mesh castShadow><cylinderGeometry args={[0.0148 * M, 0.0148 * M, 0.016 * M, 40]} /><meshPhysicalMaterial color="#2f7fc6" roughness={0.4} clearcoat={0.4} /></mesh>
      {Array.from({ length: 24 }, (_, i) => <mesh key={i} position={[Math.cos(i / 24 * 6.283) * 0.0149 * M, 0, Math.sin(i / 24 * 6.283) * 0.0149 * M]}><boxGeometry args={[0.0012 * M, 0.014 * M, 0.0012 * M]} /><meshStandardMaterial color="#2a72b4" roughness={0.5} /></mesh>)}
    </group>}
    <mesh position-y={0.18 * M}><cylinderGeometry args={[0.019 * M, 0.019 * M, 0.0015 * M, 32]} /><meshPhysicalMaterial color="#cfe0e4" transparent opacity={0.5} roughness={0.2} depthWrite={false} /></mesh>
  </group>
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
