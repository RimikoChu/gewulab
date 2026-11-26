// 质检实验室台子上反复用到的器材：烧杯、温度计、铁架台和铁夹、集气瓶和玻璃片、滴管、铅柱和钩码、注射器、
// 压缩空气引火仪、电加热器和电源盒、数显温度表。大小按真实尺寸（1 单位 = 10 cm）；每件器材的原点都在它的底面正中。
// 玻璃件里面还要画液体，所以用半透明的便宜做法（不折射），液体用“相乘”的办法把后面的东西按液体的颜色滤一遍。
import { useMemo, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, Rod, disc, lathe, shell } from '@/lab-kit'

export type V3 = [number, number, number]
const ENV = 1.6
/** 玻璃：很淡的灰蓝，边上靠清漆反光 */
export const Glass3 = ({ o = 0.16 }: { o?: number }) => <meshPhysicalMaterial color="#1b2a31" transparent opacity={o * 1.5} roughness={0.03} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={2.4} depthWrite={false} side={THREE.DoubleSide} />
/** 液体：把后面的东西按这个颜色滤一遍（相乘），亮背景前也看得出颜色；o 是颜色有多浓 */
export function Liquid({ color, o = 0.4 }: { color: string; o?: number }) {
  const c = useMemo(() => new THREE.Color('#ffffff').lerp(new THREE.Color(color), Math.min(1, o * 1.7)), [color, o])
  return <meshBasicMaterial color={c} transparent blending={THREE.CustomBlending} blendSrc={THREE.DstColorFactor} blendDst={THREE.ZeroFactor} depthWrite={false} toneMapped={false} />
}
/** 液体本身的一点颜色和光泽（普通的半透明叠在上面）：暗背景前液体也不会变成一团黑 */
export function Body({ color, o = 0.4 }: { color: string; o?: number }) {
  const c = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.25), [color])
  return <meshStandardMaterial color={c} transparent opacity={0.16 + o * 0.36} roughness={0.15} metalness={0} depthWrite={false} envMapIntensity={1.2} />
}
/** 玻璃的底色：把后面的东西稍微压暗一点，空的玻璃器皿也看得出形状 */
export const Tint = ({ color = '#cfdde3' }: { color?: string }) => <meshBasicMaterial color={color} transparent blending={THREE.CustomBlending} blendSrc={THREE.DstColorFactor} blendDst={THREE.ZeroFactor} depthWrite={false} toneMapped={false} />
/** 杯口、瓶口的一圈亮边 */
export const Rim = ({ r, y }: { r: number; y: number }) => <mesh position-y={y} rotation-x={Math.PI / 2} renderOrder={4}><torusGeometry args={[r, 0.0055, 6, 48]} /><meshBasicMaterial color="#eef6fa" transparent opacity={0.6} depthWrite={false} /></mesh>
export const WATER = '#86b9e0'
export const Rubber = ({ color = '#15171a' }: { color?: string }) => <meshStandardMaterial color={color} roughness={0.85} />

// ---------- 烧杯 ----------
export const BEAKER = { r: 0.35, h: 0.95, inR: 0.338, floor: 0.012 }
const CUP = shell([[0, 0], [0.32, 0], [0.35, 0.03], [0.35, 0.9], [0.362, 0.935], [0.375, 0.95]], 0.012, { segs: 56 })
const SPOUT = new THREE.CylinderGeometry(0.08, 0.02, 0.1, 12, 1, true, 0, Math.PI)
/** 液面的一圈弯月面和一层很淡的亮面 */
function Surface({ r, y }: { r: number; y: number }) {
  return <>
    <mesh position-y={y} rotation-x={-Math.PI / 2} renderOrder={2}><ringGeometry args={[r * 0.82, r, 48]} /><meshBasicMaterial color="#e4f2fa" transparent opacity={0.3} depthWrite={false} /></mesh>
    <mesh position-y={y + 0.004} rotation-x={Math.PI / 2} renderOrder={4}><torusGeometry args={[r - 0.002, 0.0045, 6, 48]} /><meshBasicMaterial color="#f0f8fc" transparent opacity={0.55} depthWrite={false} /></mesh>
  </>
}
/** 烧杯。level：液体有多深；children：泡在里面的东西，原点在杯底内侧正中；k：整只放大多少 */
export function Beaker({ at, level = 0, color = WATER, o = 0.5, k = 1, children = null }: { at: V3; level?: number; color?: string; o?: number; k?: number; children?: ReactNode }) {
  return <group position={at} scale={k}>
    <group position-y={BEAKER.floor}>{children}</group>
    {level > 0.004 && <>
      <mesh position={[0, BEAKER.floor + level / 2, 0]} renderOrder={2}><cylinderGeometry args={[BEAKER.inR - 0.003, BEAKER.inR - 0.022, level, 48]} /><Liquid color={color} o={o} /></mesh>
      <mesh position={[0, BEAKER.floor + level / 2, 0]} renderOrder={2}><cylinderGeometry args={[BEAKER.inR - 0.004, BEAKER.inR - 0.023, level, 48]} /><Body color={color} o={o} /></mesh>
      <Surface r={BEAKER.inR - 0.003} y={BEAKER.floor + level} />
    </>}
    <mesh geometry={CUP} renderOrder={2}><Tint /></mesh><mesh geometry={CUP} renderOrder={3} castShadow><Glass3 o={0.15} /></mesh><Rim r={0.37} y={BEAKER.h} /><Rim r={0.32} y={0.005} />
    <mesh geometry={SPOUT} position={[-0.37, BEAKER.h - 0.02, 0]} rotation-z={1.0} renderOrder={3}><Glass3 o={0.2} /></mesh>
    {[0.3, 0.5, 0.7].map((y, i) => <mesh key={y} position={[0, y, 0]} rotation-y={0.9} renderOrder={4}><cylinderGeometry args={[BEAKER.r + 0.0015, BEAKER.r + 0.0015, 0.005, 24, 1, true, -0.2, i % 2 ? 0.35 : 0.22]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>)}
  </group>
}

// ---------- 温度计 ----------
export const TH = { len: 2.9, y0: 0.34, per: 0.0175, min: -10, max: 110 }
export const thermoY = (T: number) => TH.y0 + (Math.min(TH.max, Math.max(TH.min, T)) - TH.min) * TH.per
const STEM = lathe([[0, 0], [0.024, 0.008], [0.038, 0.04], [0.042, 0.09], [0.038, 0.15], [0.034, 0.2], [0.034, TH.len - 0.06], [0.024, TH.len - 0.015], [0, TH.len]], { segs: 28, crease: 60 })
const BULB = lathe([[0, 0.014], [0.022, 0.02], [0.032, 0.05], [0.034, 0.09], [0.03, 0.14], [0.012, 0.18], [0, 0.185]], { segs: 20, crease: 60 })
function makeScale() {
  const n = TH.max - TH.min, W = 128, H = n * 10, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#10161b'; g.font = '700 26px sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'right'
  for (let v = TH.min; v <= TH.max; v++) {
    const y = H - (v - TH.min) / n * H, ten = v % 10 === 0, five = v % 5 === 0
    g.fillRect(74, Math.max(0, y - (ten ? 2.2 : 1.2)), ten ? 54 : five ? 40 : 24, ten ? 4.4 : 2.4)
    if (ten && v > TH.min && v < TH.max) g.fillText(String(v), 68, y + 1)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/** 实验用的液体温度计（红色液柱）：原点在玻璃泡的底；T 是示数 */
export function Thermo({ at, T, tilt = 0 }: { at?: V3; T: number; tilt?: number }) {
  const scale = useMemo(makeScale, [])
  const top = thermoY(T), span = (TH.max - TH.min) * TH.per
  return <group position={at} rotation-z={tilt}>
    <mesh position={[0, TH.y0 + span / 2, -0.016]}><boxGeometry args={[0.044, span + 0.1, 0.006]} /><meshStandardMaterial color="#f1eee2" roughness={0.6} /></mesh>
    <mesh geometry={BULB}><meshStandardMaterial color="#c62922" roughness={0.3} emissive="#5a0d0a" emissiveIntensity={0.6} /></mesh>
    <mesh position={[0, (0.17 + top) / 2, 0]}><cylinderGeometry args={[0.011, 0.011, top - 0.17, 10]} /><meshBasicMaterial color="#e2332a" /></mesh>
    <mesh position={[0, TH.y0 + span / 2, 0]} renderOrder={4}><cylinderGeometry args={[0.0346, 0.0346, span, 20, 1, true, -1.0, 2.0]} /><meshBasicMaterial map={scale} transparent depthWrite={false} toneMapped={false} /></mesh>
    <mesh geometry={STEM} renderOrder={3} castShadow><Glass3 o={0.2} /></mesh>
    <mesh position={[0, TH.len + 0.026, 0]}><torusGeometry args={[0.026, 0.008, 8, 20]} /><Glass3 o={0.45} /></mesh>
  </group>
}

// ---------- 铁架台 ----------
export const STAND = { rodX: -0.7, baseH: 0.14, rodH: 5.2 }
const KNOB = lathe([[0, 0], [0.04, 0], [0.04, 0.07], [0.08, 0.085], [0.085, 0.11], [0.085, 0.14], [0.07, 0.16], [0, 0.16]], { segs: 12 })
const FOOT = disc(0.1, 0.035, { chamfer: 0.008, segs: 16 })
/** 十字夹：套在立杆上的小方块，后面一颗蝶形螺丝 */
export function Boss({ y, x = STAND.rodX }: { y: number; x?: number }) {
  return <group position={[x, y, 0]}>
    <RoundedBox args={[0.2, 0.24, 0.2]} radius={0.025} smoothness={3} castShadow><Metal kind="zinc" grain="cast" env={ENV} /></RoundedBox>
    <mesh geometry={KNOB} position={[0, 0, -0.1]} rotation-x={-Math.PI / 2}><Metal kind="brass" grain="turned" env={ENV} /></mesh>
  </group>
}
/** 铁架台：铸铁底座（四个脚垫）、一根镀铬立杆。children 是装在杆上的东西 */
export function Stand({ at, h = STAND.rodH, w = 1.9, children = null }: { at: V3; h?: number; w?: number; children?: ReactNode }) {
  return <group position={at}>
    <RoundedBox args={[w, STAND.baseH - 0.035, 1.2]} radius={0.02} smoothness={3} position={[STAND.rodX + w / 2 - 0.25, 0.035 + (STAND.baseH - 0.035) / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#1b1e22" roughness={0.42} metalness={0.3} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} geometry={FOOT} position={[STAND.rodX + w / 2 - 0.25 + sx * (w / 2 - 0.15), 0, sz * 0.45]}><Rubber /></mesh>))}
    <mesh geometry={disc(0.1, 0.07, { chamfer: 0.012, segs: 6 })} position={[STAND.rodX, STAND.baseH, 0]}><Metal kind="steel" grain="turned" env={ENV} /></mesh>
    <mesh position={[STAND.rodX, STAND.baseH + h / 2, 0]} castShadow><cylinderGeometry args={[0.045, 0.045, h, 20]} /><Metal kind="chrome" rough={0.16} env={ENV} /></mesh>
    {children}
  </group>
}
/** 铁夹：从十字夹伸出一根横杆，头上两片弯爪夹住半径 grip 的东西。y 是夹口的高度，cx 是被夹的东西的 x */
export function Clamp({ y, cx, grip = 0.04, cz = 0 }: { y: number; cx: number; grip?: number; cz?: number }) {
  const jaw = useMemo(() => new THREE.TorusGeometry(grip + 0.03, 0.02, 8, 20, 2.2), [grip])
  const pad = useMemo(() => new THREE.TorusGeometry(grip + 0.008, 0.015, 6, 16, 1.5), [grip])
  return <group>
    <Boss y={y} />
    <Rod from={[STAND.rodX + 0.1, y, 0]} to={[cx - grip - 0.2, y, cz]} r={0.028}><Metal kind="steel" grain="turned" env={ENV} /></Rod>
    <group position={[cx, y, cz]}>
      <RoundedBox args={[0.15, 0.09, 0.13]} radius={0.015} smoothness={2} position={[-grip - 0.13, 0, 0]} castShadow><Metal kind="zinc" grain="cast" env={ENV} /></RoundedBox>
      {[1, -1].map(s => <group key={s} rotation-x={Math.PI / 2} scale={[1, s, 1]}>
        <mesh geometry={jaw} rotation-z={Math.PI - 2.2 + 0.1} castShadow><Metal kind="steel" env={ENV} /></mesh>
        <mesh geometry={pad} rotation-z={Math.PI - 1.5 - 0.2}><meshStandardMaterial color="#a67c4e" roughness={0.95} /></mesh>
      </group>)}
    </group>
  </group>
}

// ---------- 集气瓶和玻璃片 ----------
export const JAR = { r: 0.36, h: 1.25, neck: 0.3 }
const JAR_G = shell([[0, 0], [0.33, 0], [0.36, 0.03], [0.36, 1.0], [0.33, 1.1], [0.3, 1.16], [0.3, 1.22], [0.31, 1.25]], 0.014, { segs: 52, crease: 50 })
/** 集气瓶：直筒、圆肩、磨口。fill：瓶里气体的颜色有多浓（0 是空气）；flip：口朝下 */
export function GasJar({ at, fill, flip = false }: { at: V3; fill: number; flip?: boolean }) {
  return <group position={at} rotation-z={flip ? Math.PI : 0}>
    {fill > 0.01 && <mesh position-y={0.63} renderOrder={2}><cylinderGeometry args={[0.33, 0.33, 1.2, 40]} /><meshBasicMaterial color="#b8501f" transparent opacity={fill * 0.62} depthWrite={false} toneMapped={false} /></mesh>}
    <mesh geometry={JAR_G} renderOrder={2}><Tint /></mesh><mesh geometry={JAR_G} renderOrder={3} castShadow><Glass3 o={0.15} /></mesh>
    <Rim r={0.31} y={1.25} /><Rim r={0.345} y={0.02} />
    {/* 磨口：瓶口那一圈是毛玻璃 */}
    <mesh position-y={1.235} renderOrder={4}><cylinderGeometry args={[0.312, 0.312, 0.03, 40, 1, true]} /><meshStandardMaterial color="#e8eef0" roughness={0.9} transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group>
}
/** 盖在瓶口上的毛玻璃片 */
export function Plate({ at }: { at: V3 }) {
  return <group position={at}>
    <RoundedBox args={[0.85, 0.03, 0.85]} radius={0.01} smoothness={2} renderOrder={3}><meshPhysicalMaterial color="#cfe0e6" transparent opacity={0.45} roughness={0.25} clearcoat={1} depthWrite={false} /></RoundedBox>
  </group>
}

// ---------- 滴管 ----------
const BULB_G = lathe([[0, 0], [0.035, 0], [0.045, 0.02], [0.075, 0.08], [0.08, 0.16], [0.07, 0.22], [0.04, 0.26], [0, 0.27]], { segs: 20 })
const PIPETTE = lathe([[0, 0], [0.008, 0], [0.012, 0.03], [0.022, 0.36], [0.025, 0.5], [0, 0.5]], { segs: 16 })
/** 胶头滴管：玻璃管加红色橡胶头；squeeze 0–1 是捏扁了多少；ink：管里吸着红墨水 */
export function Dropper({ at, squeeze = 0, ink = true }: { at: V3; squeeze?: number; ink?: boolean }) {
  return <group position={at}>
    {ink && <mesh position-y={0.1} renderOrder={2}><cylinderGeometry args={[0.014, 0.006, 0.18, 10]} /><meshBasicMaterial color="#b3121a" /></mesh>}
    <mesh geometry={PIPETTE} renderOrder={3}><Glass3 o={0.3} /></mesh>
    <mesh geometry={BULB_G} position-y={0.48} scale={[1 - squeeze * 0.35, 1 - squeeze * 0.15, 1 + squeeze * 0.15]} castShadow><meshStandardMaterial color="#c2302a" roughness={0.45} /></mesh>
  </group>
}

// ---------- 铅柱和钩码 ----------
const LEAD = lathe([[0, 0], [0.195, 0], [0.2, 0.006], [0.2, 0.34], [0.19, 0.35], [0, 0.35]], { segs: 40 })
const EYE = new THREE.TorusGeometry(0.05, 0.012, 8, 20)
/** 一块铅柱：灰暗的金属，一头是刮得发亮的新断面（bright），另一头拧着一个吊环 */
export function Lead({ at, flip = false }: { at: V3; flip?: boolean }) {
  return <group position={at} rotation-z={flip ? Math.PI : 0}>
    <mesh geometry={LEAD} castShadow><meshStandardMaterial color="#6d7075" metalness={0.75} roughness={0.55} envMapIntensity={ENV} /></mesh>
    <mesh position-y={0.001} rotation-x={Math.PI / 2}><circleGeometry args={[0.194, 40]} /><meshStandardMaterial color="#b9bec3" metalness={1} roughness={0.18} envMapIntensity={ENV} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={EYE} position-y={0.4} rotation-y={Math.PI / 2}><Metal kind="steel" env={ENV} /></mesh>
    <mesh position-y={0.35}><cylinderGeometry args={[0.02, 0.02, 0.04, 8]} /><Metal kind="steel" env={ENV} /></mesh>
  </group>
}
const HOOK_W = lathe([[0, 0], [0.11, 0], [0.12, 0.012], [0.12, 0.17], [0.11, 0.18], [0.03, 0.19], [0.03, 0.21], [0, 0.21]], { segs: 32 })
const HOOK = (() => { const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, 0.1, 0], [0, 0.17, 0.0], [0.035, 0.2, 0], [0.06, 0.17, 0], [0.05, 0.13, 0]].map(p => new THREE.Vector3(...p as V3))); return new THREE.TubeGeometry(c, 20, 0.01, 6) })()
export const HOOK_H = 0.38
/** 一个钩码：黄铜圆柱，上面一个钩子。原点在钩子尖（挂在上一个的底下） */
export function HookWeight({ at }: { at: V3 }) {
  return <group position={at}>
    <group position-y={-HOOK_H}>
      <mesh geometry={HOOK_W} castShadow><Metal kind="brass" grain="turned" env={ENV} /></mesh>
      <mesh geometry={HOOK} position-y={0.2}><Metal kind="steel" env={ENV} /></mesh>
    </group>
  </group>
}

// ---------- 注射器 ----------
export const SYR = { len: 1.0, r: 0.1 }
const BARREL = shell([[0.03, -0.12], [0.03, -0.02], [0.1, 0.0], [0.1, 1.0], [0.11, 1.0]], 0.012, { segs: 32 })
/** 注射器（平放，针头那头朝 −x，用橡皮帽堵住）。fill：里面是空气还是水；push：活塞推进去了多少（0–1，占全长） */
export function Syringe({ at, fill, push }: { at: V3; fill: 'air' | 'water'; push: number }) {
  const head = SYR.len - (SYR.len - 0.08) * push           // 活塞头在筒里的位置（从针头那端量）
  return <group position={at} rotation-z={-Math.PI / 2}>
    {fill === 'water' && <mesh position-y={head / 2} renderOrder={2}><cylinderGeometry args={[0.086, 0.086, head - 0.01, 28]} /><Liquid color={WATER} o={0.55} /></mesh>}
    <mesh geometry={BARREL} renderOrder={3} castShadow><Glass3 o={0.22} /></mesh>
    {[0.2, 0.4, 0.6, 0.8].map(y => <mesh key={y} position-y={y} renderOrder={4}><cylinderGeometry args={[0.101, 0.101, 0.006, 20, 1, true, -0.4, 0.8]} /><meshBasicMaterial color="#20262a" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>)}
    {/* 指托、橡皮帽 */}
    <RoundedBox args={[0.42, 0.03, 0.16]} radius={0.01} smoothness={2} position-y={1.0}><meshPhysicalMaterial color="#e6ecee" transparent opacity={0.7} roughness={0.2} /></RoundedBox>
    <mesh position-y={-0.14}><cylinderGeometry args={[0.04, 0.045, 0.08, 16]} /><Rubber color="#3b3f44" /></mesh>
    {/* 活塞：黑色橡胶头、推杆、推柄 */}
    <group position-y={head}>
      <mesh position-y={0.03}><cylinderGeometry args={[0.087, 0.087, 0.06, 28]} /><Rubber /></mesh>
      <mesh position-y={0.06 + (SYR.len + 0.15) / 2}><boxGeometry args={[0.05, SYR.len + 0.15, 0.05]} /><meshPhysicalMaterial color="#eef1f2" transparent opacity={0.85} roughness={0.25} /></mesh>
      <mesh position-y={SYR.len + 0.22}><cylinderGeometry args={[0.12, 0.12, 0.025, 24]} /><meshPhysicalMaterial color="#eef1f2" transparent opacity={0.85} roughness={0.25} /></mesh>
    </group>
  </group>
}

// ---------- 压缩空气引火仪 ----------
const IGN_TUBE = shell([[0.05, 0], [0.13, 0], [0.13, 1.5], [0.12, 1.52]], 0.08, { segs: 40 })
const IGN_BASE = lathe([[0, 0], [0.3, 0], [0.32, 0.02], [0.32, 0.09], [0.22, 0.12], [0.18, 0.2], [0.14, 0.22], [0, 0.22]], { segs: 40 })
const IGN_KNOB = lathe([[0, 0], [0.04, 0], [0.04, 0.04], [0.14, 0.06], [0.16, 0.1], [0.15, 0.16], [0.1, 0.19], [0, 0.2]], { segs: 32 })
export const IGN = { base: 0.2, tube: 1.5, inner: 0.05 }
/** 压缩空气引火仪：黑色底座、厚壁的透明筒（内孔很细）、筒底一小团棉花、活塞杆和手柄。press：活塞压下去了多少（0–1） */
export function Igniter({ at, press, burnt }: { at: V3; press: number; burnt: number }) {
  const y = IGN.base + 0.12 + (1 - press) * 1.2
  return <group position={at}>
    <mesh geometry={IGN_BASE} castShadow receiveShadow><meshPhysicalMaterial color="#17191c" roughness={0.4} clearcoat={0.6} /></mesh>
    <mesh position-y={IGN.base + 0.04} scale={[1, 0.6 - burnt * 0.4, 1]}><sphereGeometry args={[0.042, 12, 10]} /><meshStandardMaterial color={new THREE.Color('#f4f1e8').lerp(new THREE.Color('#2b2622'), burnt)} roughness={1} /></mesh>
    <group position-y={IGN.base}>
      <mesh geometry={IGN_TUBE} renderOrder={2}><Tint color="#dbe6ea" /></mesh>
      <mesh geometry={IGN_TUBE} renderOrder={3} castShadow><Glass3 o={0.18} /></mesh>
      <Rim r={0.13} y={1.5} />
    </group>
    {/* 活塞：插在细孔里的钢杆，上面一个胶木手柄 */}
    <group position-y={y}>
      <mesh position-y={0.05}><cylinderGeometry args={[0.048, 0.048, 0.1, 20]} /><Rubber /></mesh>
      <mesh position-y={0.1 + 0.75}><cylinderGeometry args={[0.03, 0.03, 1.5, 16]} /><Metal kind="chrome" rough={0.12} env={ENV} /></mesh>
      <mesh geometry={IGN_KNOB} position-y={1.58} castShadow><meshPhysicalMaterial color="#3a1d12" roughness={0.35} clearcoat={0.7} /></mesh>
    </group>
  </group>
}

// ---------- 电加热器和电源盒 ----------
const COIL = (() => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 200; i++) { const t = i / 200, a = t * Math.PI * 2 * 4; pts.push(new THREE.Vector3(Math.cos(a) * 0.17, 0.05 + t * 0.3, Math.sin(a) * 0.17)) } pts.push(new THREE.Vector3(0.05, 0.5, 0), new THREE.Vector3(0.05, 1.1, 0)); return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 260, 0.018, 8) })()
const RET = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.17, 0.05, 0], [0.1, 0.05, 0.05], [-0.05, 0.4, 0.05], [-0.05, 1.1, 0]].map(p => new THREE.Vector3(...p as V3))), 40, 0.018, 8)
/** 浸在液体里的电加热器：一圈不锈钢的发热管，上面一个黑色胶木头，引出电线。hot：通电时发热管微微发暗红（0–1） */
export function Heater({ at, hot = 0 }: { at: V3; hot?: number }) {
  return <group position={at}>
    <mesh geometry={COIL} castShadow><meshStandardMaterial color="#9da2a6" metalness={0.9} roughness={0.35} envMapIntensity={ENV} emissive="#ff3a10" emissiveIntensity={hot * 0.25} /></mesh>
    <mesh geometry={RET}><meshStandardMaterial color="#9da2a6" metalness={0.9} roughness={0.35} envMapIntensity={ENV} /></mesh>
    <RoundedBox args={[0.22, 0.3, 0.16]} radius={0.04} smoothness={3} position={[0, 1.22, 0]} castShadow><meshPhysicalMaterial color="#16181b" roughness={0.4} clearcoat={0.6} /></RoundedBox>
  </group>
}
/** 一根软电线：从 a 弯到 b，中间垂下来一点 */
export function Cable({ a, b, sag = 0.3, color = '#1a1c1f', r = 0.018 }: { a: V3; b: V3; sag?: number; color?: string; r?: number }) {
  const geo = useMemo(() => {
    const m: V3 = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - sag, (a[2] + b[2]) / 2 + 0.05]
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, [a[0] + (m[0] - a[0]) * 0.3, a[1] - sag * 0.4, a[2]], m, [b[0] + (m[0] - b[0]) * 0.3, b[1] - sag * 0.4, b[2]], b].map(p => new THREE.Vector3(...p as V3))), 40, r, 8)
  }, [a.join(), b.join(), sag])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} castShadow><meshStandardMaterial color={color} roughness={0.6} /></mesh>
}
/** 电源盒：浅灰的小机箱，正面一个读数屏和一个翘板开关，on 时指示灯亮 */
export function PowerBox({ at, on, text }: { at: V3; on: boolean; text: string }) {
  return <group position={at}>
    <RoundedBox args={[0.9, 0.5, 0.6]} radius={0.04} smoothness={3} position-y={0.25} castShadow receiveShadow><meshPhysicalMaterial color="#d6d9d6" roughness={0.45} clearcoat={0.3} /></RoundedBox>
    <mesh position={[0, 0.28, 0.301]}><planeGeometry args={[0.86, 0.44]} /><meshStandardMaterial color="#2a3035" roughness={0.5} /></mesh>
    <Led text={text} w={0.4} h={0.16} position={[-0.15, 0.3, 0.303]} />
    <RoundedBox args={[0.12, 0.18, 0.06]} radius={0.02} smoothness={2} position={[0.25, 0.3, 0.31]} rotation-x={on ? -0.25 : 0.25}><meshStandardMaterial color="#b8312a" roughness={0.4} /></RoundedBox>
    <mesh position={[0.25, 0.14, 0.305]}><circleGeometry args={[0.025, 16]} /><meshBasicMaterial color={on ? '#7dff9a' : '#2a3a30'} toneMapped={false} /></mesh>
  </group>
}
/** 数显温度表：一个小盒子带探头线 */
export function Meter({ at, text }: { at: V3; text: string }) {
  return <group position={at}>
    <RoundedBox args={[0.5, 0.75, 0.16]} radius={0.04} smoothness={3} position-y={0.375} rotation-x={-0.35} castShadow><meshPhysicalMaterial color="#f0b41f" roughness={0.45} clearcoat={0.4} /></RoundedBox>
    <group position={[0, 0.48, 0.06]} rotation-x={-0.35}><Led text={text} w={0.36} h={0.15} position={[0, 0, 0.025]} /></group>
  </group>
}
