// 实验台上的器材：烧杯、具塞量筒、表面皿、胶头滴管、滴瓶、细口瓶、温度计、试管和试管架、铁架台和夹子、
// 戴手套的手（带实验服袖子）、注射器、乒乓球。尺寸按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里（多半是底面正中）。
import { useEffect, useMemo, type ReactNode } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { M, u, type V3 } from './world'
import { bottleLabel, gradTex, notebookTex } from './mats'

export const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
export const memo = <K, T>(f: (k: K) => T) => { const c = new Map<K, T>(); return (k: K) => { if (!c.has(k)) c.set(k, f(k)); return c.get(k)! } }

/** 玻璃：容器里还要画东西，用便宜的做法（半透明、不写深度、双面），反光调亮 */
export const Glass = ({ tint = '#a9c3c7', opacity = 0.16 }: { tint?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={tint} transparent opacity={Math.min(0.42, opacity * 1.25)} roughness={0.02} metalness={0} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={3.2} specularIntensity={1} depthWrite={false} side={THREE.DoubleSide} />
const Rubber = ({ color = '#2b2b2d' }: { color?: string }) => <meshStandardMaterial color={color} roughness={0.75} />

/** 一段液体：截面沿着容器内壁的圆柱，顶上一层亮的液面（带一点弯月面）。原点在液体底面正中 */
export function LiquidBody({ r, h, color, opacity = 0.45, top = true }: { r: number; h: number; color: string; opacity?: number; top?: boolean }) {
  if (h < 0.002) return null
  return <>
    <mesh position={[0, h / 2, 0]} renderOrder={5}><cylinderGeometry args={[r, r * 0.99, h, 48, 1, false]} /><meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.3} envMapIntensity={0.4} depthWrite={false} /></mesh>
    {top && <mesh position={[0, h + 0.0008, 0]} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r, 48]} /><meshPhysicalMaterial color={color} transparent opacity={Math.min(0.9, opacity + 0.15)} roughness={0.04} clearcoat={0.8} envMapIntensity={1.1} depthWrite={false} /></mesh>}
    {/* 液面贴着玻璃的一圈稍稍往上爬：弯月面 */}
    {top && <mesh position={[0, h, 0]} renderOrder={5}><torusGeometry args={[r * 0.985, Math.min(r * 0.04, 0.012), 6, 48]} /><meshPhysicalMaterial color={color} transparent opacity={Math.min(0.85, opacity + 0.2)} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>}
  </>
}

/** 印在玻璃上的白色刻度：一段弧面朝着 +z（镜头那边）。y0–y1 是刻度在器皿上的高度（画面单位） */
export function Marks({ r, y0, y1, lo, hi, step, major, unit = 'mL', arc = 1.1, label = '', ink = '#ffffff' }: { r: number; y0: number; y1: number; lo: number; hi: number; step: number; major: number; unit?: string; arc?: number; label?: string; ink?: string }) {
  // 贴图的高宽比和弧面一样，数字才是正常的比例
  const TH = Math.max(256, Math.min(4096, Math.round(256 * (y1 - y0) / (r * arc))))
  const t = useMemo(() => gradTex(lo, hi, step, major, unit, label, ink, TH), [lo, hi, step, major, unit, label, ink, TH])
  const pad = Math.round(TH * 18 / 1024) / TH, h = (y1 - y0) / (1 - 2 * pad)
  return <mesh position-y={y0 - h * pad + h / 2} renderOrder={7}><cylinderGeometry args={[r, r, h, 40, 1, true, -arc / 2, arc]} /><meshBasicMaterial map={t} transparent alphaTest={0.05} side={THREE.FrontSide} depthWrite={false} toneMapped={false} opacity={0.95} /></mesh>
}

// ---------- 烧杯 ----------
export const BEAKER = { 50: { r: 0.021, h: 0.058 }, 100: { r: 0.026, h: 0.07 }, 250: { r: 0.035, h: 0.095 }, 500: { r: 0.043, h: 0.12 }, 1000: { r: 0.053, h: 0.145 } } as const
export type Vol = keyof typeof BEAKER
const WALL = 0.0018
const beakerGeo = memo((vol: Vol) => {
  const { r, h } = BEAKER[vol]
  // 杯底的圆角、直壁、杯口外翻一圈，前面一只尖嘴
  const g = shell(m([[0, 0], [r - 0.004, 0], [r, 0.004], [r, h - 0.004], [r + 0.0018, h - 0.0008], [r + 0.0024, h]]), WALL * M, { segs: 64 })
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i), zz = p.getZ(i), a = Math.atan2(-zz, x); const near = Math.max(0, 1 - Math.abs(a - Math.PI * 0.75) / 0.28); const top = Math.max(0, (y - (h - 0.012) * M) / (0.012 * M)); if (near > 0 && top > 0) { const k = near * near * top * 0.005 * M; p.setXYZ(i, x - k * 0.7, y + k * 0.3, zz + k * 0.7) } }
  g.computeVertexNormals()
  return g
})
/** 一只烧杯，原点在杯底正中。fill 盛了多少（0–1）；color、opacity 液体的样子 */
export function Beaker({ vol, fill = 0, color = '#d6ebf0', opacity = 0.35, marks = true, children }: { vol: Vol; fill?: number; color?: string; opacity?: number; marks?: boolean; children?: ReactNode }) {
  const { r, h } = BEAKER[vol], R = u(r), H = u(h), wall = u(WALL)
  const top = vol === 50 ? 40 : vol === 100 ? 80 : vol === 250 ? 200 : vol === 500 ? 400 : 800, step = top / 4
  return <group>
    <mesh geometry={beakerGeo(vol)} renderOrder={6}><Glass /></mesh>
    {marks && <Marks r={R + 0.004} y0={wall + u(step * 1e-6 / (Math.PI * (r - WALL) ** 2))} y1={wall + u(top * 1e-6 / (Math.PI * (r - WALL) ** 2))} lo={step} hi={top} step={step / 2} major={2} arc={0.7} />}
    {fill > 0.005 && <group position-y={wall}><LiquidBody r={R - wall - 0.002} h={H * fill - wall} color={color} opacity={opacity} /></group>}
    {children}
  </group>
}
/** 烧杯里盛 v mL 时液面离杯底多高（0–1，按杯高算） */
export const beakerFill = (vol: Vol, v: number) => (WALL + v * 1e-6 / (Math.PI * (BEAKER[vol].r - WALL) ** 2)) / BEAKER[vol].h
/** 一只倒扣的大烧杯（罩子）：原点在杯口正中 */
export function BeakerCover({ vol = 1000 as Vol }) {
  return <group rotation-x={Math.PI} position-y={u(BEAKER[vol].h)}><Beaker vol={vol} marks={false} /></group>
}

// ---------- 具塞量筒 ----------
/** 100 mL 具塞量筒：六角形的底座、细长的筒身、磨口和一只玻璃塞。原点在底座底面正中。刻度 0 在 CYL.y0，100 mL 在 CYL.y100 */
export const CYL = { r: 0.0145, wall: 0.0014, y0: 0.022, y100: 0.022 + 100e-6 / (Math.PI * 0.0131 ** 2), h: 0.26 }
const cylGeo = memo((_: number) => shell(m([[0, 0.006], [CYL.r, 0.006], [CYL.r, CYL.h - 0.008], [CYL.r - 0.001, CYL.h - 0.006], [CYL.r + 0.0012, CYL.h - 0.004], [CYL.r + 0.0016, CYL.h]]), CYL.wall * M, { segs: 56 }))
/** level：液面读数（mL）；bottom、top 两层液体的颜色（没混匀时上下两层），mix 混匀了多少（0–1） */
export function GradCylinder({ level = 0, split = 0, bottom = '#d6ebf0', top = '#e8f2f2', mix = 0, stopper = false }: { level?: number; split?: number; bottom?: string; top?: string; mix?: number; stopper?: boolean }) {
  const ri = u(CYL.r - CYL.wall) - 0.002, yOf = (v: number) => u(CYL.y0 + (CYL.y100 - CYL.y0) * v / 100)
  const base = useMemo(() => { const g = new THREE.CylinderGeometry(u(0.04), u(0.043), u(0.008), 6); g.translate(0, u(0.004), 0); return g }, [])
  const mixed = new THREE.Color(bottom).lerp(new THREE.Color(top), 0.42).getStyle()
  const lower = mix > 0.5 ? level : split, upper = level - lower
  return <group>
    <mesh geometry={base} castShadow><meshPhysicalMaterial color="#cfe0e2" transparent opacity={0.55} roughness={0.05} clearcoat={1} envMapIntensity={2.5} /></mesh>
    <mesh geometry={cylGeo(0)} renderOrder={6}><Glass opacity={0.15} /></mesh>
    <Marks r={u(CYL.r) + 0.004} y0={yOf(0)} y1={yOf(100)} lo={0} hi={100} step={1} major={10} arc={1.5} ink="#10276a" />
    {level > 0.2 && <group position-y={yOf(0)}>
      {lower > 0.1 && <LiquidBody r={ri} h={yOf(lower) - yOf(0)} color={mix > 0.5 ? mixed : bottom} opacity={0.62} top={upper < 0.2} />}
      {upper > 0.1 && <group position-y={yOf(lower) - yOf(0)}><LiquidBody r={ri} h={yOf(level) - yOf(lower)} color={top} opacity={0.3} /></group>}
    </group>}
    {stopper && <group position-y={u(CYL.h - 0.006)}>
      <mesh position-y={u(0.008)}><cylinderGeometry args={[u(0.0128), u(0.0112), u(0.018), 32]} /><Glass opacity={0.45} /></mesh>
      <mesh position-y={u(0.022)}><cylinderGeometry args={[u(0.016), u(0.016), u(0.008), 32]} /><Glass opacity={0.5} /></mesh>
    </group>}
  </group>
}
export const cylLevelY = (v: number) => u(CYL.y0 + (CYL.y100 - CYL.y0) * v / 100)

// ---------- 表面皿、滴管、滴瓶、细口瓶 ----------
/** 表面皿：直径 9 cm 的浅玻璃碟，中间低。原点在碟底最低点 */
export const WATCH = { r: 0.045, sag: 0.009 }
export function WatchGlass() {
  const g = useMemo(() => { const pts: RY[] = []; for (let i = 0; i <= 16; i++) { const k = i / 16; pts.push([WATCH.r * k, WATCH.sag * k * k]) } return shell(m(pts), 0.0016 * M, { segs: 64 }) }, [])
  return <mesh geometry={g} renderOrder={6}><Glass opacity={0.22} /></mesh>
}
/** 胶头滴管：细玻璃管，下端拉成尖嘴，上面套红色胶头。原点在尖嘴，朝 +y；squeeze 胶头被捏扁的程度 */
export function Dropper({ squeeze = 0, fill = 0.3, color = '#e2eef0' }: { squeeze?: number; fill?: number; color?: string }) {
  const g = useMemo(() => ({
    tube: shell(m([[0.0009, 0], [0.0011, 0.002], [0.0032, 0.03], [0.0034, 0.1]]), 0.0006 * M, { segs: 24 }),
    bulb: lathe(m([[0, 0.142], [0.004, 0.141], [0.0072, 0.135], [0.0078, 0.124], [0.0062, 0.108], [0.0046, 0.1], [0.0046, 0.088], [0.0039, 0.088]]), { segs: 28 }),
  }), [])
  return <group>
    <mesh geometry={g.tube} renderOrder={7}><Glass opacity={0.35} /></mesh>
    {fill > 0 && <mesh position-y={u(0.004 + 0.03 * fill)} renderOrder={6}><cylinderGeometry args={[u(0.0024), u(0.0012), u(0.06 * fill), 16]} /><meshStandardMaterial color={color} transparent opacity={0.55} depthWrite={false} /></mesh>}
    <mesh geometry={g.bulb} scale={[1 - squeeze * 0.35, 1, 1 + squeeze * 0.15]} castShadow><meshPhysicalMaterial color="#b3261e" roughness={0.45} clearcoat={0.5} clearcoatRoughness={0.4} /></mesh>
  </group>
}
/** 滴瓶：棕色或无色的瓶身，瓶口插着一支滴管。原点在瓶底正中；dropper 为假时滴管被拿走了 */
export function DropBottle({ label, band, brown = false, dropper = true, color = '#e4eef0' }: { label: string; band?: string; brown?: boolean; dropper?: boolean; color?: string }) {
  const g = useMemo(() => shell(m([[0, 0], [0.019, 0], [0.022, 0.004], [0.022, 0.068], [0.011, 0.082], [0.009, 0.086], [0.009, 0.094]]), 0.0018 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass tint={brown ? '#5a2c0c' : undefined} opacity={brown ? 0.62 : 0.2} /></mesh>
    <mesh position-y={u(0.03)} renderOrder={5}><cylinderGeometry args={[u(0.0198), u(0.0198), u(0.054), 32]} /><meshStandardMaterial color={brown ? '#3a1d08' : color} transparent opacity={brown ? 0.7 : 0.3} depthWrite={false} /></mesh>
    <mesh position={[0, u(0.036), 0]} rotation-y={0.2}><cylinderGeometry args={[u(0.0225), u(0.0225), u(0.028), 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    {dropper && <group position-y={u(0.006)}><Dropper fill={0} /></group>}
  </group>
}
/** 细口瓶（试剂瓶）：瓶身装着液体，细颈上插着磨口塞。原点在瓶底正中 */
export function NarrowBottle({ label, band, sub, color = '#e7eef0', brown = false }: { label: string; band?: string; sub?: string; color?: string; brown?: boolean }) {
  const g = useMemo(() => shell(m([[0, 0], [0.028, 0], [0.032, 0.004], [0.032, 0.08], [0.012, 0.1], [0.0095, 0.104], [0.0095, 0.12]]), 0.002 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass tint={brown ? '#4a2810' : undefined} opacity={brown ? 0.58 : 0.2} /></mesh>
    <mesh position-y={u(0.038)} renderOrder={5}><cylinderGeometry args={[u(0.0295), u(0.0295), u(0.07), 32]} /><meshStandardMaterial color={color} transparent opacity={0.32} depthWrite={false} /></mesh>
    <mesh position={[0, u(0.046), 0]} rotation-y={0.25}><cylinderGeometry args={[u(0.0325), u(0.0325), u(0.034), 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band, sub)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    <mesh position-y={u(0.124)}><cylinderGeometry args={[u(0.0085), u(0.0075), u(0.012), 24]} /><Glass opacity={0.4} /></mesh>
    <mesh position-y={u(0.134)} scale={[1, 0.45, 1]}><sphereGeometry args={[u(0.013), 24, 12]} /><Glass opacity={0.4} /></mesh>
  </group>
}

// ---------- 温度计 ----------
/** 实验室温度计：细玻璃棒，下端一个红色液泡，红色液柱到 t（°C），刻度 0–100。原点在液泡底，朝 +y，长 0.2 m */
export function Thermometer({ t }: { t: number }) {
  const g = useMemo(() => lathe(m([[0, 0], [0.0022, 0.001], [0.0026, 0.006], [0.0024, 0.012], [0.0034, 0.016], [0.0034, 0.196], [0.0026, 0.2], [0, 0.2]]), { segs: 20 }), [])
  const y0 = 0.03, y1 = 0.18, col = y0 + (y1 - y0) * Math.max(0, Math.min(1, t / 100))
  return <group>
    <mesh geometry={g} renderOrder={7}><Glass opacity={0.3} /></mesh>
    <mesh position-y={u(0.0065)}><sphereGeometry args={[u(0.0018), 16, 10]} /><meshStandardMaterial color="#c4161c" roughness={0.3} /></mesh>
    <mesh position-y={u((0.006 + col) / 2)}><cylinderGeometry args={[u(0.0006), u(0.0006), u(col - 0.006), 8]} /><meshStandardMaterial color="#d01c20" roughness={0.3} emissive="#600" /></mesh>
    <Marks r={u(0.0035)} y0={u(y0)} y1={u(y1)} lo={0} hi={100} step={2} major={10} unit="°C" arc={1.6} />
  </group>
}

// ---------- 试管、试管架 ----------
export const TUBE = { r: 0.0085, h: 0.15 }
const tubeGeo = memo((_: number) => { const r = TUBE.r, pts: RY[] = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push([Math.sin(a) * r, r - Math.cos(a) * r]) } pts.push([r, TUBE.h - 0.001], [r + 0.0012, TUBE.h]); return shell(m(pts), 0.0009 * M, { segs: 32, crease: 50 }) })
/** 试管，原点在管底。fill 盛了多少（0–1） */
export function TestTube({ fill = 0.3, color = '#e4eef0', opacity = 0.45 }: { fill?: number; color?: string; opacity?: number }) {
  const ri = u(TUBE.r - 0.0009) - 0.002, h = u(TUBE.h * fill)
  return <group>
    <mesh geometry={tubeGeo(0)} renderOrder={6}><Glass opacity={0.22} /></mesh>
    {fill > 0.01 && <group>
      <mesh position-y={ri} renderOrder={5}><sphereGeometry args={[ri, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} /></mesh>
      <group position-y={ri}><LiquidBody r={ri} h={Math.max(0.01, h - ri)} color={color} opacity={opacity} /></group>
    </group>}
  </group>
}
/** 木头试管架：两层板，上层一排孔。原点在底面正中，n 个孔沿 x 排开，孔距 gap（m） */
export function TubeRack({ n = 4, gap = 0.032 }: { n?: number; gap?: number }) {
  const W = (n + 0.6) * gap, wood = <meshStandardMaterial color="#b98a58" roughness={0.68} />
  const top = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-u(W) / 2, -u(0.025)); s.lineTo(u(W) / 2, -u(0.025)); s.lineTo(u(W) / 2, u(0.025)); s.lineTo(-u(W) / 2, u(0.025)); for (let i = 0; i < n; i++) { const h = new THREE.Path(); h.absarc(u((i - (n - 1) / 2) * gap), 0, u(0.0105), 0, Math.PI * 2, true); s.holes.push(h) } const g = new THREE.ExtrudeGeometry(s, { depth: u(0.008), bevelEnabled: true, bevelSize: u(0.001), bevelThickness: u(0.001), bevelSegments: 2 }); g.rotateX(-Math.PI / 2); return g }, [n, gap, W])
  return <group>
    <RoundedBox args={[u(W), u(0.008), u(0.05)]} radius={u(0.002)} position-y={u(0.004)} castShadow receiveShadow>{wood}</RoundedBox>
    <mesh geometry={top} position-y={u(0.07)} castShadow receiveShadow>{wood}</mesh>
    {[-1, 1].map(s => <RoundedBox key={s} args={[u(0.008), u(0.08), u(0.05)]} radius={u(0.002)} position={[s * u(W / 2 - 0.004), u(0.04), 0]} castShadow>{wood}</RoundedBox>)}
  </group>
}

// ---------- 铁架台、夹子 ----------
/** 铁架台：铸铁底座、镀铬立杆。原点在底座底面正中，立杆在 z = rodZ（m），高 rodH */
export function IronStand({ rodH = 0.5, rodZ = -0.05, children }: { rodH?: number; rodZ?: number; children?: ReactNode }) {
  return <group>
    <RoundedBox args={[u(0.13), u(0.012), u(0.2)]} radius={u(0.004)} smoothness={3} position={[0, u(0.006), u(rodZ + 0.06)]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[0, u(rodH / 2), u(rodZ)]} castShadow><cylinderGeometry args={[u(0.0055), u(0.0055), u(rodH), 20]} /><Metal kind="chrome" grain="turned" /></mesh>
    <mesh position={[0, u(0.016), u(rodZ)]}><cylinderGeometry args={[u(0.011), u(0.012), u(0.01), 20]} /><Metal kind="iron" /></mesh>
    {children}
  </group>
}
/** 一只夹子：从立杆伸出来的夹臂，前端两片夹口（垫着软木）。原点在夹口中心，夹臂朝 −z 伸回立杆，len 是夹臂长（m） */
export function Clamp({ len = 0.06, open = 0.004 }: { len?: number; open?: number }) {
  return <group>
    <mesh position={[0, 0, -u(len) / 2]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[u(0.003), u(0.003), u(len), 12]} /><Metal kind="steel" grain="turned" /></mesh>
    <RoundedBox args={[u(0.016), u(0.022), u(0.016)]} radius={u(0.002)} position={[0, 0, -u(len)]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    {[-1, 1].map(s => <group key={s} position-x={s * u(open + 0.004)}>
      <RoundedBox args={[u(0.004), u(0.014), u(0.022)]} radius={u(0.001)} castShadow><Metal kind="steel" /></RoundedBox>
      <mesh position-x={-s * u(0.0028)}><boxGeometry args={[u(0.0016), u(0.012), u(0.018)]} /><meshStandardMaterial color="#b58b5c" roughness={0.9} /></mesh>
    </group>)}
  </group>
}

// ---------- 手 ----------
const FINGER = new THREE.CapsuleGeometry(1, 3.2, 6, 14)
/** 戴蓝色丁腈手套的右手，接一截白色实验服袖子。手掌朝 −z，手指朝 −y，原点在掌心；s 是大小（画面单位，默认按真手） */
export function Hand({ s = u(0.0068), grip = 0.5 }: { s?: number; grip?: number }) {
  const glove = <meshPhysicalMaterial color="#5b86c9" roughness={0.5} clearcoat={0.25} clearcoatRoughness={0.6} />
  const cloth = <meshStandardMaterial color="#eeefea" roughness={0.88} />
  return <group scale={s}>
    <RoundedBox args={[8.2, 8.6, 3.4]} radius={1.5} smoothness={4} position={[0, 4.4, 0]} castShadow>{glove}</RoundedBox>
    {[-2.85, -0.95, 0.95, 2.85].map((x, i) => <group key={x} position={[x, 0.2, 0]} rotation-x={-grip * 1.1}>
      <mesh geometry={FINGER} position={[0, -2.2 + Math.abs(i - 1.5) * 0.4, 0]} scale={[0.95, 0.95 - Math.abs(i - 1.5) * 0.08, 0.95]} castShadow>{glove}</mesh>
    </group>)}
    <group position={[4.4, 3.4, -0.6]} rotation={[-grip * 0.6, 0, 0.75]}><mesh geometry={FINGER} position-y={-2.4} scale={[1.08, 0.82, 1.08]} castShadow>{glove}</mesh></group>
    {/* 手套口翻边、手腕、实验服袖子和袖口 */}
    <mesh position={[0, 10.2, 0]} castShadow><cylinderGeometry args={[3.7, 4.3, 3.2, 28]} />{glove}</mesh>
    <mesh position={[0, 11.9, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[3.75, 0.4, 8, 28]} />{glove}</mesh>
    <mesh position={[0, 21, 0]} castShadow><cylinderGeometry args={[5.4, 4.9, 18, 28]} />{cloth}</mesh>
    <mesh position={[0, 12.4, 0]} castShadow><cylinderGeometry args={[4.95, 4.95, 1.2, 28]} /><meshStandardMaterial color="#e2e3de" roughness={0.9} /></mesh>
  </group>
}

// ---------- 注射器、乒乓球 ----------
/** 20 mL 塑料注射器，堵住了针头：筒身透明，活塞推到 v（mL）处。原点在针座，朝 +y；inside 是筒里的东西（空气画成淡淡的，水画成浅蓝） */
export const SYR = { r: 0.0102, len: 0.085, per: 0.0034 }       // 每 mL 0.0034 m
export function Syringe({ v, water = false }: { v: number; water?: boolean }) {
  const g = useMemo(() => shell(m([[0.003, -0.008], [0.003, 0.004], [SYR.r, 0.006], [SYR.r, SYR.len]]), 0.0012 * M, { segs: 40 }), [])
  const py = 0.007 + v * SYR.per
  return <group>
    <mesh geometry={g} renderOrder={6}><meshPhysicalMaterial color="#eef4f4" transparent opacity={0.3} roughness={0.12} clearcoat={0.8} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    {/* 手柄的两只耳朵 */}
    <RoundedBox args={[u(0.05), u(0.003), u(0.018)]} radius={u(0.0012)} position-y={u(SYR.len)} castShadow><meshPhysicalMaterial color="#f2f5f5" transparent opacity={0.7} roughness={0.2} /></RoundedBox>
    <Marks r={u(SYR.r) + 0.003} y0={u(0.007)} y1={u(0.007 + 20 * SYR.per)} lo={0} hi={20} step={1} major={5} arc={0.9} unit="mL" />
    {/* 堵住针头的橡胶帽 */}
    <mesh position-y={u(-0.012)}><cylinderGeometry args={[u(0.0045), u(0.004), u(0.01), 16]} /><Rubber color="#3a3a3c" /></mesh>
    {water && <mesh position-y={u((0.006 + py) / 2)} renderOrder={5}><cylinderGeometry args={[u(SYR.r - 0.0014), u(SYR.r - 0.0014), u(py - 0.006), 28]} /><meshStandardMaterial color="#8fc6e0" transparent opacity={0.5} depthWrite={false} /></mesh>}
    {/* 活塞：黑橡胶头、白色推杆、按柄 */}
    <mesh position-y={u(py + 0.003)}><cylinderGeometry args={[u(SYR.r - 0.0013), u(SYR.r - 0.0013), u(0.006), 28]} /><Rubber /></mesh>
    <mesh position-y={u(py + 0.006 + 0.05)} castShadow><boxGeometry args={[u(0.012), u(0.1), u(0.002)]} /><meshStandardMaterial color="#f4f4f0" roughness={0.5} /></mesh>
    <mesh position-y={u(py + 0.006 + 0.05)} castShadow><boxGeometry args={[u(0.002), u(0.1), u(0.012)]} /><meshStandardMaterial color="#f4f4f0" roughness={0.5} /></mesh>
    <mesh position-y={u(py + 0.106)} castShadow><cylinderGeometry args={[u(0.013), u(0.013), u(0.003), 28]} /><meshStandardMaterial color="#f4f4f0" roughness={0.5} /></mesh>
  </group>
}
/** 乒乓球：直径 40 mm 的白球；dent 是瘪进去的深度（0–1） */
export function PingPong({ dent = 1 }: { dent?: number }) {
  const g = useMemo(() => {
    const s = new THREE.SphereGeometry(u(0.02), 48, 32), p = s.attributes.position, c = new THREE.Vector3(0, 0, 1)
    const base = Float32Array.from(p.array as Float32Array)
    return { s, base, c }
  }, [])
  useMemo(() => {
    const p = g.s.attributes.position, v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.set(g.base[i * 3], g.base[i * 3 + 1], g.base[i * 3 + 2])
      const d = v.clone().normalize().dot(g.c), k = Math.max(0, (d - 0.72) / 0.28)
      v.multiplyScalar(1 - dent * 0.32 * k * k * (3 - 2 * k))
      p.setXYZ(i, v.x, v.y, v.z)
    }
    p.needsUpdate = true; g.s.computeVertexNormals()
  }, [dent, g])
  return <mesh geometry={g.s} castShadow><meshPhysicalMaterial color="#f7f6f0" roughness={0.38} clearcoat={0.4} clearcoatRoughness={0.5} /></mesh>
}

/** 实验台上一块垫着的白瓷板。原点在底面正中 */
export function Tile({ w = 0.15, d = 0.15 }: { w?: number; d?: number }) {
  return <RoundedBox args={[u(w), u(0.008), u(d)]} radius={u(0.002)} smoothness={3} position-y={u(0.004)} receiveShadow castShadow><meshPhysicalMaterial color="#f2f1ec" roughness={0.25} clearcoat={0.7} /></RoundedBox>
}
/** 带倒角的圆形底座 */
export function Plinth({ r = 0.06, h = 0.02, color = '#2d3236' }: { r?: number; h?: number; color?: string }) {
  const g = useMemo(() => disc(u(r), u(h), { chamfer: u(Math.min(r, h) * 0.2) }), [r, h])
  return <mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.6} /></mesh>
}
/** 实验记录本：硬壳本子摊开在台面上，左页画了表格，右页写着几行字；旁边一支笔。原点在本子底面正中 */
export function Notebook({ rot = 0 }: { rot?: number }) {
  const t = useMemo(() => notebookTex(), [])
  return <group rotation-y={rot}>
    <RoundedBox args={[u(0.3), u(0.006), u(0.21)]} radius={u(0.002)} position-y={u(0.003)} castShadow receiveShadow><meshStandardMaterial color="#1f3b5c" roughness={0.7} /></RoundedBox>
    <mesh position-y={u(0.0068)} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[u(0.288), u(0.2)]} /><meshStandardMaterial map={t} roughness={0.85} /></mesh>
    <mesh position={[u(0.07), u(0.011), u(0.06)]} rotation={[0, 0.5, Math.PI / 2]} castShadow><cylinderGeometry args={[u(0.004), u(0.004), u(0.14), 12]} /><meshPhysicalMaterial color="#2c3e8f" roughness={0.3} clearcoat={0.6} /></mesh>
  </group>
}
/** 洗瓶：半透明白色塑料瓶，弯管伸出来。原点在瓶底正中 */
export function WashBottle() {
  const g = useMemo(() => ({ body: lathe(m([[0, 0], [0.032, 0], [0.036, 0.006], [0.036, 0.13], [0.026, 0.15], [0.012, 0.158], [0, 0.158]]), { segs: 40 }),
    tube: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.16, 0], [0, 0.2, 0], [0.01, 0.215, 0], [0.04, 0.215, 0], [0.065, 0.195, 0]].map(p => new THREE.Vector3(u(p[0]), u(p[1]), u(p[2])))), 30, u(0.0025), 8) }), [])
  return <group>
    <mesh geometry={g.body} castShadow><meshPhysicalMaterial color="#f1f3ef" transparent opacity={0.82} roughness={0.35} clearcoat={0.3} /></mesh>
    <mesh position-y={u(0.04)}><cylinderGeometry args={[u(0.0362), u(0.0362), u(0.075), 32]} /><meshStandardMaterial color="#cfe6ee" transparent opacity={0.35} depthWrite={false} /></mesh>
    <mesh position-y={u(0.162)}><cylinderGeometry args={[u(0.014), u(0.014), u(0.012), 24]} /><meshStandardMaterial color="#e2e4e0" roughness={0.5} /></mesh>
    <mesh geometry={g.tube} castShadow><meshStandardMaterial color="#e9ebe7" roughness={0.4} /></mesh>
  </group>
}
/**
 * 容器斜着、倒着的时候，里面的液体：一整段圆柱，用一个水平面切掉上面的部分，液面始终是平的。
 * r 内半径，y0–y1 圆柱在容器里从哪到哪（画面单位），level 液面在世界里的高度
 */
export function TiltLiquid({ r, y0, y1, level, color, opacity = 0.6 }: { r: number; y0: number; y1: number; level: number; color: string; opacity?: number }) {
  const gl = useThree(st => st.gl)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), [])
  plane.constant = level
  return <mesh position-y={(y0 + y1) / 2} renderOrder={5}>
    <cylinderGeometry args={[r, r, y1 - y0, 40]} />
    <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.25} side={THREE.DoubleSide} clippingPlanes={[plane]} depthWrite={false} />
  </mesh>
}
export type { V3 }
