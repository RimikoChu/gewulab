// 这间实验室自己的器材（化验台上的通用玻璃器材在 gear.tsx）：小灯泡和灯座、学生电源、闸刀开关、石墨电极、导线、
// 容量瓶、移液管、恒温水浴、电热板、电极架、台式 pH 计、电位滴定仪主机（带曲线屏）、离心机和离心管。
// 尺寸按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里（多半是底面正中）。
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Led, Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { Electrode, Glass, LiquidMat, LOOK, m, u, type Look } from './gear'
import { FONT } from './mats'
import type { V3 } from './world'

const plastic = (c: string, r = 0.42) => <meshPhysicalMaterial color={c} roughness={r} clearcoat={0.35} clearcoatRoughness={0.4} />

// ---------- 导电性装置 ----------
/** 小灯泡（2.5 V）：梨形玻璃泡、里面一根钨丝、黄铜螺口；装在一只白瓷灯座上。原点在灯座底面。glow 0–1 亮到几成 */
export function Bulb({ glow }: { glow: number }) {
  const g = useMemo(() => ({
    bulb: shell(m([[0.004, 0], [0.006, 0.004], [0.012, 0.012], [0.015, 0.022], [0.0135, 0.032], [0.008, 0.039], [0, 0.041]]), u(0.0006), { segs: 32 }),
    screw: lathe(m(([[0, -0.0125]] as RY[]).concat(Array.from({ length: 11 }, (_, i) => [0.0062 + (i % 2) * 0.0007, -0.012 + i * 0.0012] as RY), [[0.0045, 0.0013], [0, 0.0013]])), { segs: 24 }),
    seat: lathe(m([[0, 0], [0.022, 0], [0.023, 0.003], [0.02, 0.012], [0.011, 0.016], [0.0085, 0.024], [0, 0.024]]), { segs: 40 }),
    fil: new THREE.TorusGeometry(u(0.003), u(0.00035), 6, 20, Math.PI * 1.6),
  }), [])
  const ref = useRef<THREE.MeshBasicMaterial>(null), light = useRef<THREE.PointLight>(null), cur = useRef(0)
  useFrame((_, d) => {
    cur.current += (glow - cur.current) * Math.min(1, d * 4)
    const k = cur.current
    if (ref.current) ref.current.color.setRGB(0.25 + 3.2 * k, 0.18 + 2.4 * k, 0.1 + 1.0 * k)
    if (light.current) light.current.intensity = 6 * k
  })
  return <group>
    <mesh geometry={g.seat} castShadow receiveShadow><meshPhysicalMaterial color="#f2f0ea" roughness={0.18} clearcoat={0.9} /></mesh>
    <group position-y={u(0.036)}>
      <mesh geometry={g.screw} castShadow><Metal kind="brass" grain="turned" /></mesh>
      <group position-y={u(0.0013)}>
        <mesh geometry={g.bulb} renderOrder={7}><Glass tint="#eef3f2" opacity={0.22} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[s * u(0.0022), u(0.012), 0]}><cylinderGeometry args={[u(0.0003), u(0.0003), u(0.016), 6]} /><meshStandardMaterial color="#b8bcc0" metalness={0.8} roughness={0.3} /></mesh>)}
        <mesh geometry={g.fil} position-y={u(0.021)} rotation-z={Math.PI * 1.3}><meshBasicMaterial ref={ref} toneMapped={false} /></mesh>
        <pointLight ref={light} position-y={u(0.02)} intensity={0} distance={u(0.5)} decay={2} color="#ffd59a" />
      </group>
    </group>
  </group>
}
/** 学生电源：灰白机壳，正面一块电压表、两只旋钮、红黑两个接线柱，顶上一只提手。原点在底面正中，正面朝 +z */
export function PowerSupply({ on, volts }: { on: boolean; volts: string }) {
  return <group>
    <RoundedBox args={[u(0.2), u(0.11), u(0.16)]} radius={u(0.008)} smoothness={3} position-y={u(0.055)} castShadow receiveShadow>{plastic('#d8dcdb')}</RoundedBox>
    <RoundedBox args={[u(0.19), u(0.095), u(0.006)]} radius={u(0.003)} position={[0, u(0.056), u(0.081)]}>{plastic('#33393f', 0.5)}</RoundedBox>
    <Led text={on ? volts : '0.0'} w={u(0.07)} h={u(0.03)} position={[-u(0.05), u(0.075), u(0.0845)]} />
    {[0.02, 0.06].map(x => <mesh key={x} position={[u(x), u(0.072), u(0.088)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.009), u(0.01), u(0.01), 24]} /><meshStandardMaterial color="#1b1d20" roughness={0.45} /></mesh>)}
    {[[-0.03, '#c8262c'], [0.0, '#16181b']].map(([x, c]) => <group key={x as number} position={[u(x as number), u(0.03), u(0.086)]} rotation-x={Math.PI / 2}>
      <mesh><cylinderGeometry args={[u(0.006), u(0.006), u(0.012), 16]} /><meshStandardMaterial color={c as string} roughness={0.4} /></mesh>
      <mesh position-y={u(0.008)}><cylinderGeometry args={[u(0.0025), u(0.0025), u(0.006), 10]} /><Metal kind="brass" /></mesh>
    </group>)}
    <mesh position={[u(0.07), u(0.03), u(0.085)]}><circleGeometry args={[u(0.004), 16]} /><meshBasicMaterial color={on ? '#5cff8a' : '#24352a'} toneMapped={!on} /></mesh>
    <mesh position={[0, u(0.115), 0]} rotation-z={Math.PI / 2}><torusGeometry args={[u(0.025), u(0.004), 8, 20, Math.PI]} />{plastic('#3a4046')}</mesh>
  </group>
}
/** 闸刀开关：胶木底板，一对铜夹座，一片铜刀闸绕后端转轴转下来合上，刀柄是黑色胶木。原点在底板底面正中，刀闸沿 +z。on 合上 */
export function KnifeSwitch({ on }: { on: boolean }) {
  const ref = useRef<THREE.Group>(null), cur = useRef(on ? 0 : -1.1)
  useFrame((_, d) => { cur.current += ((on ? 0 : -1.1) - cur.current) * Math.min(1, d * 6); if (ref.current) ref.current.rotation.x = cur.current })
  return <group>
    <RoundedBox args={[u(0.05), u(0.01), u(0.1)]} radius={u(0.002)} position-y={u(0.005)} castShadow receiveShadow>{plastic('#3b2a1e', 0.5)}</RoundedBox>
    {[-0.035, 0.03].map(z => <RoundedBox key={z} args={[u(0.012), u(0.016), u(0.008)]} radius={u(0.0015)} position={[0, u(0.018), u(z)]} castShadow><Metal kind="copper" /></RoundedBox>)}
    <group ref={ref} position={[0, u(0.022), -u(0.035)]}>
      <RoundedBox args={[u(0.004), u(0.01), u(0.075)]} radius={u(0.001)} position={[0, 0, u(0.037)]} castShadow><Metal kind="copper" grain="brushed" /></RoundedBox>
      <mesh position={[0, u(0.002), u(0.082)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.005), u(0.005), u(0.022), 16]} /><meshStandardMaterial color="#141516" roughness={0.4} /></mesh>
    </group>
  </group>
}
/** 一对石墨电极：两根深灰的石墨棒，上端插在一块白色塑料夹板上，夹板架在杯口。原点在杯口正中，棒往下伸 depth（m） */
export function GraphitePair({ depth = 0.08, gap = 0.03 }: { depth?: number; gap?: number }) {
  return <group>
    <RoundedBox args={[u(gap + 0.03), u(0.008), u(0.016)]} radius={u(0.002)} position-y={u(0.004)} castShadow>{plastic('#eceae4')}</RoundedBox>
    {[-1, 1].map(s => <group key={s} position-x={s * u(gap / 2)}>
      <mesh position-y={-u(depth / 2) + u(0.012)} castShadow><cylinderGeometry args={[u(0.003), u(0.003), u(depth + 0.012), 14]} /><meshStandardMaterial color="#2c2e30" roughness={0.75} metalness={0.3} /></mesh>
      <mesh position-y={u(0.014)}><cylinderGeometry args={[u(0.0035), u(0.0035), u(0.008), 12]} /><Metal kind="brass" /></mesh>
    </group>)}
  </group>
}
/** 一根导线：沿几个点弯过去 */
export function Wire({ pts, color = '#c8262c', r = 0.0016 }: { pts: V3[]; color?: string; r?: number }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 48, u(r), 8), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} castShadow><meshStandardMaterial color={color} roughness={0.5} /></mesh>
}

// ---------- 玻璃器材 ----------
/** 100 mL 容量瓶：平底梨形瓶身、细长的颈，颈上一圈白色刻线，顶上磨口塞。原点在瓶底。level 0–1：液面到刻线的几成（1 是到刻线） */
export const VOLF = { neck: 0.0065, mark: 0.15, bulbTop: 0.075 }
export function VolFlask({ level = 0, look = LOOK.clear, plug = true }: { level?: number; look?: Look; plug?: boolean }) {
  const g = useMemo(() => {
    const outer: RY[] = [[0, 0], [0.024, 0], [0.03, 0.004], [0.034, 0.018], [0.033, 0.04], [0.026, 0.06], [0.014, 0.072], [VOLF.neck + 0.0012, 0.08], [VOLF.neck + 0.0012, 0.175], [VOLF.neck + 0.0025, 0.18]]
    return shell(m(outer), u(0.0013), { segs: 48 })
  }, [])
  // 液体：瓶身部分按 level 填，过了瓶肩进颈
  const lvY = 0.003 + level * (VOLF.mark - 0.003)
  const body = useMemo(() => {
    const top = Math.min(lvY, 0.079), pts: RY[] = [[0, 0.0015], [0.023, 0.0015], [0.0285, 0.005], [0.0325, 0.018], [0.0315, 0.04], [0.0245, 0.06], [0.0125, 0.072], [VOLF.neck - 0.0003, 0.08]].filter(p => p[1] <= top) as RY[]
    if (pts.length < 2) return null
    const last = pts[pts.length - 1]; if (last[1] < top) pts.push([last[0], top]); pts.push([0, top])
    return lathe(m(pts), { segs: 40 })
  }, [lvY])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass /></mesh>
    {body && level > 0.01 && <mesh geometry={body} renderOrder={5}><LiquidMat {...look} /></mesh>}
    {lvY > 0.08 && <mesh position-y={u((0.08 + lvY) / 2)} renderOrder={5}><cylinderGeometry args={[u(VOLF.neck - 0.0003), u(VOLF.neck - 0.0003), u(lvY - 0.08), 16]} /><LiquidMat {...look} /></mesh>}
    <mesh position-y={u(VOLF.mark)} renderOrder={8}><cylinderGeometry args={[u(VOLF.neck + 0.0016), u(VOLF.neck + 0.0016), u(0.0012), 24, 1, true]} /><meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} /></mesh>
    {plug && <group position-y={u(0.178)}>
      <mesh position-y={u(0.004)}><cylinderGeometry args={[u(0.0075), u(0.0065), u(0.012), 16]} />{plastic('#e9ece8', 0.3)}</mesh>
      <mesh position-y={u(0.013)}><cylinderGeometry args={[u(0.011), u(0.011), u(0.006), 6]} />{plastic('#e9ece8', 0.3)}</mesh>
    </group>}
  </group>
}
/** 10 mL 移液管：细长玻璃管，中间一只胖肚子，上面一圈刻线；上端套一只洗耳球。原点在管尖，朝 +y。fill 吸了多少（0–1） */
export function Pipette({ fill = 0, look = LOOK.clear }: { fill?: number; look?: Look }) {
  const g = useMemo(() => ({
    tube: shell(m([[0.0012, 0], [0.002, 0.004], [0.003, 0.05], [0.003, 0.08], [0.0075, 0.095], [0.0075, 0.145], [0.003, 0.16], [0.003, 0.3]]), u(0.0007), { segs: 20 }),
    bulb: lathe(m([[0, 0.3], [0.0045, 0.3], [0.0045, 0.33], [0.01, 0.335], [0.022, 0.355], [0.023, 0.375], [0.014, 0.395], [0, 0.4]]), { segs: 28, crease: 60 }),
  }), [])
  return <group>
    <mesh geometry={g.tube} renderOrder={7}><Glass opacity={0.3} /></mesh>
    {fill > 0.02 && <>
      <mesh position-y={u(0.04)} renderOrder={6}><cylinderGeometry args={[u(0.0022), u(0.0012), u(0.08), 12]} /><LiquidMat {...look} /></mesh>
      <mesh position-y={u(0.08 + fill * 0.04)} renderOrder={6}><cylinderGeometry args={[u(0.0066), u(0.0066), u(fill * 0.08), 16]} /><LiquidMat {...look} /></mesh>
    </>}
    <mesh position-y={u(0.2)} renderOrder={8}><cylinderGeometry args={[u(0.0035), u(0.0035), u(0.0008), 16, 1, true]} /><meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.bulb} castShadow><meshPhysicalMaterial color="#b3262a" roughness={0.45} clearcoat={0.4} /></mesh>
  </group>
}

// ---------- 加热、搅拌、支架 ----------
/** 恒温水浴锅：不锈钢的方锅，锅盖上一个圆孔放烧杯，正面一块控制面板显示水温。原点在底面正中，孔在顶面正中 */
export const BATH = { w: 0.22, d: 0.2, h: 0.12, hole: 0.042 }
export function WaterBath({ temp, on }: { temp: string; on: boolean }) {
  const lid = useMemo(() => {
    const W = u(BATH.w), D = u(BATH.d), s = new THREE.Shape()
    s.moveTo(-W / 2, -D / 2); s.lineTo(W / 2, -D / 2); s.lineTo(W / 2, D / 2); s.lineTo(-W / 2, D / 2); s.closePath()
    const h = new THREE.Path(); h.absarc(0, 0, u(BATH.hole), 0, Math.PI * 2, true); s.holes.push(h)
    const g = new THREE.ExtrudeGeometry(s, { depth: u(0.004), bevelEnabled: true, bevelSize: u(0.0015), bevelThickness: u(0.0015), bevelSegments: 2, curveSegments: 32 }); g.rotateX(-Math.PI / 2); return g
  }, [])
  return <group>
    <RoundedBox args={[u(BATH.w), u(BATH.h), u(BATH.d)]} radius={u(0.006)} smoothness={3} position-y={u(BATH.h / 2)} castShadow receiveShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
    <mesh geometry={lid} position-y={u(BATH.h)} castShadow><Metal kind="stainless" grain="brushed" rough={0.3} /></mesh>
    <mesh position-y={u(BATH.h - 0.012)} rotation-x={-Math.PI / 2}><circleGeometry args={[u(BATH.hole), 32]} /><meshStandardMaterial color="#5f7e86" roughness={0.12} metalness={0.2} /></mesh>
    <RoundedBox args={[u(0.16), u(0.06), u(0.01)]} radius={u(0.003)} position={[0, u(0.05), u(BATH.d / 2 + 0.003)]}>{plastic('#2b3035', 0.5)}</RoundedBox>
    <Led text={temp} w={u(0.07)} h={u(0.028)} position={[-u(0.03), u(0.055), u(BATH.d / 2 + 0.0085)]} />
    <mesh position={[u(0.05), u(0.055), u(BATH.d / 2 + 0.0085)]}><circleGeometry args={[u(0.004), 16]} /><meshBasicMaterial color={on ? '#ff8a3c' : '#3a2a20'} toneMapped={!on} /></mesh>
  </group>
}
/** 电热板：白色机身，顶上一块微晶玻璃面板，加热时面板中间发出暗红的光。原点在底面正中，顶面在 0.07 m */
export function HotPlate({ heat }: { heat: number }) {
  return <group>
    <RoundedBox args={[u(0.18), u(0.066), u(0.2)]} radius={u(0.008)} smoothness={3} position-y={u(0.033)} castShadow receiveShadow>{plastic('#e5e8e7')}</RoundedBox>
    <RoundedBox args={[u(0.16), u(0.004), u(0.16)]} radius={u(0.0015)} position={[0, u(0.068), -u(0.012)]} receiveShadow><meshPhysicalMaterial color="#17191b" roughness={0.12} clearcoat={1} /></RoundedBox>
    <mesh position={[0, u(0.0705), -u(0.012)]} rotation-x={-Math.PI / 2}><ringGeometry args={[u(0.03), u(0.06), 48]} /><meshBasicMaterial color={new THREE.Color(0.08 + heat * 0.75, 0.03 + heat * 0.08, 0.02)} toneMapped={false} transparent opacity={0.7} /></mesh>
    <mesh position={[u(0.05), u(0.033), u(0.101)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.012), u(0.013), u(0.012), 24]} /><meshStandardMaterial color="#26292c" roughness={0.5} /></mesh>
    <Led text={heat > 0.05 ? 'HI' : 'OFF'} w={u(0.05)} h={u(0.022)} position={[-u(0.03), u(0.036), u(0.1005)]} />
  </group>
}
/**
 * 电极架：黑色圆底座，立一根不锈钢杆，杆上一只能转、能上下滑的横臂，臂端夹着 pH 复合电极。
 * 原点在底座底面；yaw 横臂转到哪个方向（绕 y，0 指 +x）；lift 臂离底座多高（m）；len 臂长（m）
 */
export function ElectrodeStand({ yaw, lift, len = 0.12, rod = 0.36 }: { yaw: number; lift: number; len?: number; rod?: number }) {
  const base = useMemo(() => disc(u(0.05), u(0.016), { chamfer: u(0.004) }), [])
  return <group>
    <mesh geometry={base} castShadow receiveShadow><meshPhysicalMaterial color="#1d2124" roughness={0.35} clearcoat={0.6} /></mesh>
    <mesh position-y={u(rod / 2 + 0.016)} castShadow><cylinderGeometry args={[u(0.005), u(0.005), u(rod), 16]} /><Metal kind="stainless" grain="turned" /></mesh>
    <group position-y={u(lift)} rotation-y={-yaw}>
      <RoundedBox args={[u(0.024), u(0.022), u(0.022)]} radius={u(0.004)} castShadow>{plastic('#2a2e32', 0.5)}</RoundedBox>
      <RoundedBox args={[u(len), u(0.008), u(0.014)]} radius={u(0.003)} position-x={u(len / 2)} castShadow>{plastic('#2a2e32', 0.5)}</RoundedBox>
      <group position={[u(len), -u(0.13), 0]}><Electrode /></group>
      <mesh position={[u(len), u(0.006), 0]}><cylinderGeometry args={[u(0.009), u(0.009), u(0.018), 16]} />{plastic('#2a2e32', 0.5)}</mesh>
    </group>
  </group>
}
/** 电极臂转到 (dx, dz)（m，相对底座）时的 yaw */
export const yawTo = (dx: number, dz: number) => Math.atan2(dz, dx)
/** 台式 pH 计：斜面的机身，一块大的读数屏，几只按键；屏下一行小字。原点在底面正中，屏幕朝 +z */
export function PhMeter({ text, sub = '' }: { text: string; sub?: string }) {
  const subTex = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 48; return { c, t: new THREE.CanvasTexture(c) } }, [])
  useEffect(() => { const g = subTex.c.getContext('2d')!; g.fillStyle = '#0c1410'; g.fillRect(0, 0, 256, 48); g.fillStyle = '#7dffb0'; g.font = `600 26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sub, 128, 25); subTex.t.colorSpace = THREE.SRGBColorSpace; subTex.t.needsUpdate = true }, [sub, subTex])
  return <group>
    <RoundedBox args={[u(0.2), u(0.05), u(0.17)]} radius={u(0.008)} smoothness={3} position-y={u(0.025)} castShadow receiveShadow>{plastic('#e8ebea')}</RoundedBox>
    <group position={[0, u(0.07), u(0.0)]} rotation-x={-0.9}>
      <RoundedBox args={[u(0.19), u(0.13), u(0.016)]} radius={u(0.005)} castShadow>{plastic('#dfe3e2')}</RoundedBox>
      <mesh position={[0, u(0.016), u(0.0085)]}><planeGeometry args={[u(0.15), u(0.075)]} /><meshStandardMaterial color="#1c2228" roughness={0.4} /></mesh>
      <Led text={text} w={u(0.14)} h={u(0.052)} position={[0, u(0.022), u(0.009)]} />
      <mesh position={[0, -u(0.008), u(0.009)]}><planeGeometry args={[u(0.14), u(0.016)]} /><meshBasicMaterial map={subTex.t} toneMapped={false} /></mesh>
      {[-0.06, -0.02, 0.02, 0.06].map(x => <RoundedBox key={x} args={[u(0.03), u(0.012), u(0.006)]} radius={u(0.002)} position={[u(x), -u(0.045), u(0.009)]}>{plastic(x === 0.06 ? '#2f8f6b' : '#3a4046', 0.5)}</RoundedBox>)}
    </group>
    <mesh position={[0, u(0.0), -u(0.06)]}><boxGeometry args={[u(0.01), u(0.01), u(0.01)]} /><meshStandardMaterial color="#111" /></mesh>
  </group>
}

// ---------- 屏幕上的曲线 ----------
export interface Chart { title: string; xLabel: string; yLabel: string; x: [number, number]; y: [number, number]; xTicks: number[]; yTicks: number[]; series: { pts: [number, number][]; color: string; dots?: boolean }[]; marker?: [number, number]; band?: [number, number, string][]; note?: string }
/** 一块仪器屏：深色底、刻度格、几条曲线、当前点；数据变了就重画。w、h 是屏幕大小（画面单位） */
export function Screen({ chart, w, h, ...rest }: { chart: Chart; w: number; h: number } & Record<string, unknown>) {
  const CW = 1024, CH = Math.round(1024 * h / w)
  const st = useMemo(() => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, t } }, [CW, CH])
  useEffect(() => {
    const g = st.c.getContext('2d')!, A = { x0: 120, x1: CW - 40, y0: 96, y1: CH - 90 }
    const px = (x: number) => A.x0 + (A.x1 - A.x0) * (x - chart.x[0]) / (chart.x[1] - chart.x[0])
    const py = (y: number) => A.y1 - (A.y1 - A.y0) * (y - chart.y[0]) / (chart.y[1] - chart.y[0])
    g.fillStyle = '#0d151c'; g.fillRect(0, 0, CW, CH)
    g.fillStyle = '#e9f2f5'; g.font = `700 44px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(chart.title, 40, 48)
    if (chart.note) { g.textAlign = 'right'; g.fillStyle = '#ffe28a'; g.font = `700 40px ${FONT}`; g.fillText(chart.note, CW - 40, 48) }
    for (const [a, b, c] of chart.band ?? []) { g.fillStyle = c; g.fillRect(A.x0, py(b), A.x1 - A.x0, py(a) - py(b)) }
    g.strokeStyle = 'rgba(180,210,220,0.16)'; g.lineWidth = 2
    g.font = `500 32px ${FONT}`; g.fillStyle = 'rgba(220,235,240,0.75)'
    for (const t of chart.xTicks) { g.beginPath(); g.moveTo(px(t), A.y0); g.lineTo(px(t), A.y1); g.stroke(); g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(String(t), px(t), A.y1 + 10) }
    for (const t of chart.yTicks) { g.beginPath(); g.moveTo(A.x0, py(t)); g.lineTo(A.x1, py(t)); g.stroke(); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(String(t), A.x0 - 14, py(t)) }
    g.strokeStyle = 'rgba(220,235,240,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(A.x0, A.y0); g.lineTo(A.x0, A.y1); g.lineTo(A.x1, A.y1); g.stroke()
    g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(chart.xLabel, A.x1, CH - 8); g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(chart.yLabel, 18, A.y0 - 8)
    for (const s of chart.series) {
      if (!s.pts.length) continue
      g.strokeStyle = s.color; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath(); s.pts.forEach(([x, y], i) => i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y))); g.stroke()
      if (s.dots) { g.fillStyle = s.color; for (const [x, y] of s.pts) { g.beginPath(); g.arc(px(x), py(y), 12, 0, 7); g.fill() } }
    }
    if (chart.marker) { const [x, y] = chart.marker; g.fillStyle = '#ffe28a'; g.beginPath(); g.arc(px(x), py(y), 15, 0, 7); g.fill() }
    st.t.needsUpdate = true
  }, [JSON.stringify(chart), st, CW, CH])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh {...rest}><planeGeometry args={[w, h]} /><meshBasicMaterial map={st.t} toneMapped={false} /></mesh>
}

/**
 * 电位滴定仪主机：浅灰的机身，前面一块斜放的彩色触摸屏（实时画 pH—V 曲线），屏下一排按键，侧面一个电极接口。
 * 原点在底面正中，屏幕朝 +z。chart 屏幕上画什么
 */
export function Titrator({ chart }: { chart: Chart }) {
  return <group>
    <RoundedBox args={[u(0.3), u(0.08), u(0.26)]} radius={u(0.012)} smoothness={3} position-y={u(0.04)} castShadow receiveShadow>{plastic('#e3e6e5')}</RoundedBox>
    <RoundedBox args={[u(0.3), u(0.2), u(0.08)]} radius={u(0.012)} smoothness={3} position={[0, u(0.14), -u(0.09)]} castShadow>{plastic('#e3e6e5')}</RoundedBox>
    <group position={[0, u(0.155), -u(0.04)]} rotation-x={-0.28}>
      <RoundedBox args={[u(0.28), u(0.19), u(0.014)]} radius={u(0.006)} castShadow>{plastic('#22272c', 0.4)}</RoundedBox>
      <Screen chart={chart} w={u(0.26)} h={u(0.17)} position={[0, 0, u(0.0075)]} />
    </group>
    {[-0.09, -0.045, 0, 0.045].map(x => <RoundedBox key={x} args={[u(0.032), u(0.008), u(0.02)]} radius={u(0.002)} position={[u(x), u(0.082), u(0.09)]}>{plastic(x === 0.045 ? '#2f8f6b' : '#4a5258', 0.5)}</RoundedBox>)}
    <mesh position={[u(0.152), u(0.05), u(0.04)]} rotation-z={Math.PI / 2}><cylinderGeometry args={[u(0.008), u(0.008), u(0.01), 16]} /><Metal kind="chrome" /></mesh>
  </group>
}

// ---------- 离心机 ----------
/** 离心管：10 mL 的尖底塑料管，带刻度，螺纹盖。原点在管尖，朝 +y。fill 盛了多少（0–1）；sed 管底沉淀的颜色和多少（0–1）；cloud 浑浊程度 */
export const CTUBE = { r: 0.0075, h: 0.1 }
export function CentTube({ fill = 0.3, look = LOOK.clear, sed, cloud, cap = true }: { fill?: number; look?: Look; sed?: { color: string; k: number }; cloud?: { color: string; k: number }; cap?: boolean }) {
  const g = useMemo(() => ({ tube: shell(m([[0.0012, 0], [0.003, 0.004], [CTUBE.r, 0.018], [CTUBE.r, CTUBE.h]]), u(0.0007), { segs: 28 }) }), [])
  const H = 0.018 + fill * (CTUBE.h - 0.03), ri = CTUBE.r - 0.0008
  return <group>
    <mesh geometry={g.tube} renderOrder={7}><meshPhysicalMaterial color="#e8eef0" transparent opacity={0.28} roughness={0.25} clearcoat={0.6} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    {fill > 0 && <>
      <mesh position-y={u(0.009)} renderOrder={5}><cylinderGeometry args={[u(ri), u(0.0018), u(0.016), 20]} /><LiquidMat {...look} /></mesh>
      <mesh position-y={u((0.017 + H) / 2)} renderOrder={5}><cylinderGeometry args={[u(ri), u(ri), u(H - 0.017), 20]} /><LiquidMat {...look} /></mesh>
      <mesh position-y={u(H)} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[u(ri), 20]} /><meshPhysicalMaterial color={look.color} transparent opacity={Math.min(0.9, look.opacity + 0.15)} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    </>}
    {cloud && cloud.k > 0.01 && <mesh position-y={u((0.004 + H) / 2)} renderOrder={6}><cylinderGeometry args={[u(ri * 0.97), u(0.002), u(H - 0.006), 20]} /><meshStandardMaterial color={cloud.color} transparent opacity={0.85 * cloud.k} roughness={0.9} depthWrite={false} /></mesh>}
    {sed && sed.k > 0.01 && <mesh position-y={u(0.004 + 0.006 * sed.k)} renderOrder={6}><cylinderGeometry args={[u(0.0018 + 0.0035 * sed.k), u(0.0016), u(0.012 * sed.k), 20]} /><meshStandardMaterial color={sed.color} roughness={0.95} /></mesh>}
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, u(0.022 + i * 0.009), u(CTUBE.r + 0.0001)]}><planeGeometry args={[u(i % 2 ? 0.003 : 0.005), u(0.0005)]} /><meshBasicMaterial color="#2a3a4a" /></mesh>)}
    {cap && <mesh position-y={u(CTUBE.h + 0.005)} castShadow><cylinderGeometry args={[u(0.0095), u(0.0095), u(0.012), 20]} />{plastic('#2f6fb3', 0.5)}</mesh>}
  </group>
}
/**
 * 台式离心机：圆角的白色机身，顶上一只铰链翻盖（盖上一块透明观察窗），里面一个铝合金角转子，一圈 8 个斜孔；正面一块转速屏。
 * 原点在底面正中，正面朝 +z。open 盖子开到几成（0–1）；spin 转子在转；rpm 屏幕显示的字
 */
export const CENT = { r: 0.15, h: 0.2 }
export function Centrifuge({ open, spin, rpm, children }: { open: number; spin: boolean; rpm: string; children?: ReactNode }) {
  const rotor = useRef<THREE.Group>(null), w = useRef(0)
  useFrame((_, d) => {
    const r = rotor.current; if (!r) return
    const dt = Math.min(d, 1 / 30)
    w.current += ((spin ? 40 : 0) - w.current) * Math.min(1, dt * 1.5)
    if (spin || w.current > 3) r.rotation.y += w.current * dt
    else { const goal = Math.ceil(r.rotation.y / (Math.PI * 2)) * Math.PI * 2; r.rotation.y += Math.min(goal - r.rotation.y, Math.max(0.3, w.current) * dt * 2.5); w.current *= 0.9 }   // 慢下来以后转到 0 位停住，取管时管子还在原来那个孔
  })
  const g = useMemo(() => ({
    bowl: shell(m([[0, 0.05], [0.11, 0.05], [0.115, CENT.h - 0.005], [0.12, CENT.h]]), u(0.004), { segs: 56 }),
    rotor: lathe(m([[0, 0], [0.07, 0], [0.085, 0.02], [0.06, 0.05], [0.015, 0.055], [0, 0.055]]), { segs: 48, crease: 40 }),
  }), [])
  return <group>
    <RoundedBox args={[u(0.34), u(CENT.h), u(0.36)]} radius={u(0.03)} smoothness={4} position-y={u(CENT.h / 2)} castShadow receiveShadow>{plastic('#eef0ee', 0.34)}</RoundedBox>
    <mesh geometry={g.bowl} position-y={u(0.001)} receiveShadow><Metal kind="stainless" grain="turned" rough={0.3} /></mesh>
    <mesh position-y={u(CENT.h + 0.0015)} rotation-x={-Math.PI / 2}><ringGeometry args={[u(0.122), u(0.15), 48]} /><meshStandardMaterial color="#c9cdcd" roughness={0.4} /></mesh>
    <group ref={rotor} position-y={u(0.05)}>
      <mesh geometry={g.rotor} castShadow><Metal kind="aluminum" grain="turned" /></mesh>
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos(i / 8 * Math.PI * 2) * u(0.058), u(0.045), Math.sin(i / 8 * Math.PI * 2) * u(0.058)]} rotation-y={-i / 8 * Math.PI * 2}><cylinderGeometry args={[u(0.009), u(0.009), u(0.003), 16]} /><meshStandardMaterial color="#202326" roughness={0.6} /></mesh>)}
      {children}
    </group>
    {/* 翻盖：绕后沿的铰链往上翻 */}
    <group position={[0, u(CENT.h), -u(0.16)]} rotation-x={-open * 1.75}>
      <group position-z={u(0.16)}>
        <RoundedBox args={[u(0.33), u(0.03), u(0.33)]} radius={u(0.012)} position-y={u(0.015)} castShadow>{plastic('#e9ecea', 0.3)}</RoundedBox>
        <mesh position-y={u(0.0305)} rotation-x={-Math.PI / 2}><circleGeometry args={[u(0.07), 40]} /><meshPhysicalMaterial color="#2a3640" transparent opacity={0.6} roughness={0.05} clearcoat={1} /></mesh>
      </group>
    </group>
    <RoundedBox args={[u(0.2), u(0.06), u(0.01)]} radius={u(0.004)} position={[0, u(0.08), u(0.18)]}>{plastic('#2b3035', 0.5)}</RoundedBox>
    <Led text={rpm} w={u(0.1)} h={u(0.03)} position={[-u(0.035), u(0.085), u(0.1856)]} />
    {[0.05, 0.08].map(x => <mesh key={x} position={[u(x), u(0.08), u(0.186)]}><circleGeometry args={[u(0.009), 20]} /><meshStandardMaterial color={x === 0.08 ? '#2f8f6b' : '#c8323a'} roughness={0.4} /></mesh>)}
  </group>
}
