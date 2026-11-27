// 这间实验室自己的台面器材（通用玻璃器材在 gear.tsx）：直流电源、导线（里面有电子光点）、U 形管、石墨棒和鳄鱼夹、
// 金属电极片、电流表、闸刀开关、镊子夹着的试纸、弯成几折的玻璃导管。
// 尺寸按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里（多半是底面正中）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Led, Metal, type MetalName } from '@/lab-kit'
import { Glass, LiquidMat, u, type Look } from './gear'
import { FONT } from './mats'
import type { V3 } from './world'

const plastic = (c: string, r = 0.42) => <meshPhysicalMaterial color={c} roughness={r} clearcoat={0.35} clearcoatRoughness={0.4} />

// ---------- 电源、导线、开关 ----------
/** 直流稳压电源的两个接线柱相对机身原点的位置（m）：红的是正极，黑的是负极 */
export const POST = { pos: [0.045, 0.032, 0.092] as V3, neg: [0.075, 0.032, 0.092] as V3 }
/**
 * 学生用直流稳压电源：灰白的钢机壳，两侧一排散热孔，顶上一只提手；面板上一块电压表、一只调压旋钮、电源开关、
 * 红黑两个接线柱（红正黑负）。原点在底面正中，正面朝 +z
 */
export function DCSupply({ on, volts }: { on: boolean; volts: string }) {
  const face = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256
    const g = c.getContext('2d')!; g.fillStyle = '#30363c'; g.fillRect(0, 0, 512, 256)
    g.fillStyle = '#e9ecea'; g.font = `600 22px ${FONT}`; g.textAlign = 'center'
    g.fillText('直流稳压电源', 130, 40); g.fillText('电压 / V', 130, 196); g.fillText('调压', 282, 196); g.font = `700 30px ${FONT}`; g.fillText('+', 373, 120); g.fillText('−', 447, 120)
    g.strokeStyle = '#8d9499'; g.lineWidth = 2; g.strokeRect(8, 8, 496, 240)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
  }, [])
  return <group>
    <RoundedBox args={[u(0.2), u(0.11), u(0.17)]} radius={u(0.006)} smoothness={3} position-y={u(0.058)} castShadow receiveShadow><meshPhysicalMaterial color="#d3d8d6" roughness={0.45} metalness={0.3} clearcoat={0.3} /></RoundedBox>
    {[-1, 1].flatMap(s => [-1, 1].map(q => <mesh key={`${s}${q}`} position={[s * u(0.08), u(0.0025), q * u(0.065)]}><cylinderGeometry args={[u(0.008), u(0.009), u(0.005), 14]} /><meshStandardMaterial color="#111" roughness={0.9} /></mesh>))}
    {[-1, 1].map(s => Array.from({ length: 7 }, (_, i) => <mesh key={`${s}${i}`} position={[s * u(0.1005), u(0.075), u(-0.045 + i * 0.015)]} rotation-y={s * Math.PI / 2}><planeGeometry args={[u(0.006), u(0.04)]} /><meshStandardMaterial color="#1c2023" roughness={0.8} /></mesh>))}
    <mesh position={[0, u(0.058), u(0.0856)]}><planeGeometry args={[u(0.19), u(0.095)]} /><meshStandardMaterial map={face} roughness={0.55} /></mesh>
    <Led text={on ? volts : '0.0'} w={u(0.072)} h={u(0.03)} position={[-u(0.047), u(0.066), u(0.0885)]} />
    <mesh position={[u(0.01), u(0.07), u(0.092)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.011), u(0.012), u(0.013), 28]} /><meshStandardMaterial color="#1b1d20" roughness={0.45} /></mesh>
    <mesh position={[u(0.01), u(0.079), u(0.099)]}><boxGeometry args={[u(0.002), u(0.006), u(0.001)]} /><meshBasicMaterial color="#f2f2f2" /></mesh>
    {/* 电源开关：一只翘板开关，开着的时候亮绿灯 */}
    <RoundedBox args={[u(0.014), u(0.022), u(0.006)]} radius={u(0.002)} position={[-u(0.082), u(0.03), u(0.088)]} rotation-x={on ? 0.25 : -0.25}>{plastic(on ? '#2f8f6b' : '#3a4046')}</RoundedBox>
    <mesh position={[-u(0.06), u(0.03), u(0.0862)]}><circleGeometry args={[u(0.0035), 16]} /><meshBasicMaterial color={on ? '#5cff8a' : '#24352a'} toneMapped={!on} /></mesh>
    {([[POST.pos, '#c8262c'], [POST.neg, '#16181b']] as [V3, string][]).map(([p, c]) => <group key={c} position={[u(p[0]), u(p[1]), u(p[2] - 0.006)]} rotation-x={Math.PI / 2}>
      <mesh><cylinderGeometry args={[u(0.0075), u(0.0085), u(0.006), 20]} /><meshStandardMaterial color={c} roughness={0.4} /></mesh>
      <mesh position-y={u(0.007)}><cylinderGeometry args={[u(0.006), u(0.006), u(0.008), 6]} /><meshStandardMaterial color={c} roughness={0.4} /></mesh>
      <mesh position-y={u(0.012)}><cylinderGeometry args={[u(0.0025), u(0.0025), u(0.004), 10]} /><Metal kind="brass" /></mesh>
    </group>)}
    <mesh position={[0, u(0.116), 0]} rotation-z={Math.PI / 2} rotation-y={Math.PI / 2}><torusGeometry args={[u(0.03), u(0.004), 8, 20, Math.PI]} />{plastic('#3a4046')}</mesh>
  </group>
}

/** 一根导线：沿几个点弯过去（点按画面单位写）。flow 不为 0 时里面有电子光点在走：正数顺着点的顺序，负数反过来 */
export function Wire({ pts, color = '#c8262c', r = 0.0018, flow = 0, n = 7 }: { pts: V3[]; color?: string; r?: number; flow?: number; n?: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5), [JSON.stringify(pts)])   // eslint-disable-line react-hooks/exhaustive-deps
  const g = useMemo(() => new THREE.TubeGeometry(curve, 64, u(r), 8), [curve, r])
  const ref = useRef<THREE.Group>(null), v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => { ref.current?.children.forEach((m, i) => { const k = (((clock.elapsedTime * 0.3 * Math.sign(flow) + i / n) % 1) + 1) % 1; curve.getPointAt(k, v); m.position.copy(v) }) })
  return <group>
    <mesh geometry={g} castShadow><meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.3} /></mesh>
    {flow !== 0 && <group ref={ref}>{Array.from({ length: n }, (_, i) => <mesh key={i} renderOrder={16}><sphereGeometry args={[u(r * 2.3), 10, 8]} /><meshBasicMaterial color="#ffe45c" toneMapped={false} depthTest={false} transparent /></mesh>)}</group>}
  </group>
}

/** 闸刀开关：胶木底板，一对铜夹座，一片铜刀闸绕后端转轴转下来合上。原点在底板底面正中，刀闸沿 +z。on 合上 */
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

// ---------- U 形管和电极 ----------
/** U 形管：两臂中心相距 g，外半径 ro，壁厚 t，管口高 H；管底圆弧的圆心高 yc（都是 m，原点在管底最低点） */
export const UT = { g: 0.076, ro: 0.0125, t: 0.0016, H: 0.21, yc: 0.0505 }
/** U 形管中心线上的点：从左臂 y = top 往下，绕过管底，到右臂 y = top */
function uPath(top: number) {
  const { g, yc } = UT, pts: THREE.Vector3[] = []
  for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(-g / 2, top - (top - yc) * i / 8, 0))
  for (let i = 0; i <= 20; i++) { const a = Math.PI + i / 20 * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * g / 2, yc + Math.sin(a) * g / 2, 0)) }
  for (let i = 1; i <= 8; i++) pts.push(new THREE.Vector3(g / 2, yc + (top - yc) * i / 8, 0))
  return new THREE.CatmullRomCurve3(pts.map(p => p.multiplyScalar(u(1))), false, 'centripetal')
}
const uGlass = (() => { let g: { out: THREE.TubeGeometry; inn: THREE.TubeGeometry } | null = null; return () => (g ??= { out: new THREE.TubeGeometry(uPath(UT.H), 96, u(UT.ro), 28), inn: new THREE.TubeGeometry(uPath(UT.H), 96, u(UT.ro - UT.t), 24) }) })()
/**
 * 一只 U 形管：有壁厚的玻璃管（内外两层面），两个管口各一圈火抛光的厚沿。level：液面高（m，从管底算）；look：溶液的样子；
 * arm：左右两臂里另外叠一层颜色（比如阴极附近酚酞变红），[左, 右]，各是 { look, k }
 */
export function UTube({ level, look, arm }: { level: number; look: Look; arm?: [({ look: Look; k: number } | null), ({ look: Look; k: number } | null)] }) {
  const g = uGlass(), ri = UT.ro - UT.t - 0.0004
  const liq = useMemo(() => new THREE.TubeGeometry(uPath(level), 80, u(ri), 20), [level, ri])
  return <group>
    <mesh geometry={g.out} renderOrder={7}><Glass opacity={0.17} /></mesh>
    <mesh geometry={g.inn} renderOrder={6}><Glass opacity={0.08} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * u(UT.g / 2), u(UT.H), 0]} rotation-x={Math.PI / 2} renderOrder={7}><torusGeometry args={[u(UT.ro - UT.t / 2), u(UT.t * 0.9), 8, 28]} /><Glass opacity={0.4} /></mesh>)}
    <mesh geometry={liq} renderOrder={5}><LiquidMat {...look} /></mesh>
    {[-1, 1].map((s, i) => <group key={s} position={[s * u(UT.g / 2), 0, 0]}>
      <mesh position-y={u(level)} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[u(ri), 24]} /><meshPhysicalMaterial color={look.color} transparent opacity={Math.min(0.92, look.opacity + 0.2)} roughness={0.05} clearcoat={0.8} depthWrite={false} /></mesh>
      <mesh position-y={u(level - 0.0015)} renderOrder={5}><cylinderGeometry args={[u(ri * 1.01), u(ri * 1.01), u(0.003), 24, 1, true]} /><meshBasicMaterial color="#eef8fb" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      {arm?.[i] && arm[i]!.k > 0.02 && <mesh position-y={u((UT.yc + level) / 2)} renderOrder={5}><cylinderGeometry args={[u(ri * 1.005), u(ri * 1.005), u(level - UT.yc), 20]} /><meshStandardMaterial color={arm[i]!.look.color} emissive={arm[i]!.look.color} emissiveIntensity={0.35} transparent opacity={arm[i]!.look.opacity * arm[i]!.k} depthWrite={false} roughness={0.3} /></mesh>}
    </group>)}
  </group>
}

/**
 * 一根石墨棒电极：深灰的石墨棒，顶上一只黄铜接线帽，帽上夹着一只鳄鱼夹（clip 是夹子护套的颜色）。
 * 原点在棒的下端，沿 y 朝上，长 len（m）。coat：下面 wet 这一段覆上了多少铜（0–1）
 */
export function GraphiteRod({ len = 0.2, r = 0.004, coat = 0, wet = 0.1, clip = '#c8262c' }: { len?: number; r?: number; coat?: number; wet?: number; clip?: string }) {
  return <group>
    <mesh position-y={u(len / 2)} castShadow><cylinderGeometry args={[u(r), u(r), u(len), 18]} /><meshStandardMaterial color="#2a2c2f" roughness={0.62} metalness={0.35} /></mesh>
    <mesh position-y={u(0.0005)}><sphereGeometry args={[u(r), 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color="#2a2c2f" roughness={0.62} metalness={0.35} /></mesh>
    {coat > 0.01 && <mesh position-y={u(wet / 2)}><cylinderGeometry args={[u(r * (1.05 + 0.35 * coat)), u(r * (1.05 + 0.35 * coat)), u(wet), 18]} /><meshStandardMaterial color={new THREE.Color('#2a2c2f').lerp(new THREE.Color('#e0522a'), Math.min(1, coat * 1.3))} emissive="#c23a12" emissiveIntensity={0.9 * coat} roughness={0.6} metalness={0.3} /></mesh>}
    <mesh position-y={u(len + 0.004)} castShadow><cylinderGeometry args={[u(r * 1.3), u(r * 1.3), u(0.012), 16]} /><Metal kind="brass" grain="turned" /></mesh>
    {/* 鳄鱼夹：两片夹嘴咬着接线帽，后面一截彩色的护套 */}
    <group position={[0, u(len + 0.004), 0]}>
      {[-1, 1].map(s => <RoundedBox key={s} args={[u(0.004), u(0.003), u(0.022)]} radius={u(0.001)} position={[0, s * u(0.0052), -u(0.006)]} rotation-x={s * 0.12} castShadow><Metal kind="steel" /></RoundedBox>)}
      <mesh position={[0, 0, -u(0.026)]} rotation-x={Math.PI / 2} castShadow><capsuleGeometry args={[u(0.0045), u(0.016), 6, 12]} />{plastic(clip, 0.5)}</mesh>
    </group>
  </group>
}
/** 鳄鱼夹护套尾巴相对电极顶端的位置（m）：导线接到这里 */
export const CLIP_TAIL: V3 = [0, 0.004, -0.04]

/** 一块金属电极片：原点在下端正中，沿 y 朝上，宽 w、高 h、厚 t（m）；顶上打一个孔，夹着鳄鱼夹 */
export function PlateElectrode({ kind, w = 0.03, h = 0.12, t = 0.002, clip = '#c8262c' }: { kind: MetalName; w?: number; h?: number; t?: number; clip?: string }) {
  return <group>
    <RoundedBox args={[u(w), u(h), u(t)]} radius={u(t * 0.4)} position-y={u(h / 2)} castShadow><Metal kind={kind} grain="brushed" rough={0.4} /></RoundedBox>
    <group position={[0, u(h - 0.004), 0]}>
      {[-1, 1].map(s => <RoundedBox key={s} args={[u(0.005), u(0.016), u(0.002)]} radius={u(0.0008)} position={[0, u(0.004), s * u(0.0022)]} castShadow><Metal kind="steel" /></RoundedBox>)}
      <mesh position={[0, u(0.022), 0]} castShadow><capsuleGeometry args={[u(0.0045), u(0.016), 6, 12]} />{plastic(clip, 0.5)}</mesh>
    </group>
  </group>
}

// ---------- 电流表 ----------
/** 演示用电流表：黑色胶木外壳，一块白色表盘（零点在中间），指针按 value（−1 到 1）偏转；顶上两个接线柱。原点在底面正中，表盘朝 +z */
export function Meter({ value }: { value: number }) {
  const face = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 384; c.height = 256
    const g = c.getContext('2d')!; g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, 384, 256)
    g.strokeStyle = '#1d2327'; g.lineWidth = 3; g.beginPath(); g.arc(192, 250, 170, Math.PI * 1.22, Math.PI * 1.78); g.stroke()
    for (let i = -5; i <= 5; i++) { const a = -Math.PI / 2 + i * 0.176, r0 = i % 5 === 0 ? 146 : 156; g.beginPath(); g.moveTo(192 + Math.cos(a) * r0, 250 + Math.sin(a) * r0); g.lineTo(192 + Math.cos(a) * 170, 250 + Math.sin(a) * 170); g.stroke() }
    g.fillStyle = '#1d2327'; g.font = '700 58px Georgia, serif'; g.textAlign = 'center'; g.fillText('G', 192, 190); g.font = '600 26px Georgia, serif'; g.fillText('0', 192, 62)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
  }, [])
  const ref = useRef<THREE.Group>(null), cur = useRef(0)
  useFrame((_, d) => { cur.current += (value - cur.current) * Math.min(1, d * 5); if (ref.current) ref.current.rotation.z = -cur.current * 0.75 })
  return <group>
    <RoundedBox args={[u(0.12), u(0.1), u(0.06)]} radius={u(0.006)} smoothness={3} position-y={u(0.05)} castShadow receiveShadow>{plastic('#1c1f22', 0.4)}</RoundedBox>
    <mesh position={[0, u(0.056), u(0.0305)]}><planeGeometry args={[u(0.1), u(0.068)]} /><meshStandardMaterial map={face} roughness={0.6} /></mesh>
    <group ref={ref} position={[0, u(0.024), u(0.032)]}><mesh position-y={u(0.026)}><boxGeometry args={[u(0.0012), u(0.052), u(0.0006)]} /><meshBasicMaterial color="#c8262c" /></mesh></group>
    <mesh position={[0, u(0.056), u(0.034)]} renderOrder={8}><planeGeometry args={[u(0.104), u(0.072)]} /><meshPhysicalMaterial color="#dfeef0" transparent opacity={0.12} roughness={0.02} clearcoat={1} depthWrite={false} /></mesh>
    {([[-0.035, '#16181b'], [0.035, '#c8262c']] as [number, string][]).map(([x, c]) => <group key={x} position={[u(x), u(0.1), 0]}>
      <mesh position-y={u(0.005)}><cylinderGeometry args={[u(0.007), u(0.008), u(0.01), 16]} /><meshStandardMaterial color={c} roughness={0.4} /></mesh>
      <mesh position-y={u(0.012)}><cylinderGeometry args={[u(0.0025), u(0.0025), u(0.005), 10]} /><Metal kind="brass" /></mesh>
    </group>)}
  </group>
}

// ---------- 试纸、导管 ----------
/** 一把不锈钢镊子夹着一条试纸。原点在试纸的下端，镊子柄朝 +y 斜上去。blue：试纸变蓝的程度（0–1）；wet：试纸是湿的（颜色略深、反光） */
export function PaperInTweezers({ color }: { color: string }) {
  return <group>
    <mesh position-y={u(0.016)}><boxGeometry args={[u(0.009), u(0.032), u(0.0005)]} /><meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.4} side={THREE.DoubleSide} /></mesh>
    <group position-y={u(0.028)} rotation-z={-0.5}>
      {[-1, 1].map(s => <RoundedBox key={s} args={[u(0.005), u(0.11), u(0.0012)]} radius={u(0.0005)} position={[0, u(0.055), s * u(0.001 + 0.0025)]} rotation-x={-s * 0.045} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>)}
    </group>
  </group>
}
/** 镊子柄上手握的位置（相对试纸下端，m） */
export const TWEEZER_GRIP: V3 = [0.038, 0.098, 0]

/** 一根玻璃导管：沿几个点弯过去（点按米写，相对它所在的组）。r 外半径 */
export function GlassTube({ pts, r = 0.003 }: { pts: V3[]; r?: number }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(u(p[0]), u(p[1]), u(p[2]))), false, 'catmullrom', 0.12), pts.length * 12, u(r), 12), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} renderOrder={7}><Glass opacity={0.3} /></mesh>
}
