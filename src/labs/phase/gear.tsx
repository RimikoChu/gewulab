// 实验台上反复用到的器材：铁架台（底座、立杆、十字夹、铁圈、铁夹）、石棉网、酒精灯、烧杯、试管、锥形瓶、水槽、
// 温度计、停表、注射器、小风扇。大小按真实尺寸乘 CM（1 cm = 0.06）；每件器材的原点都在它的底面正中。
// 玻璃件里面还要画液体，所以用半透明的便宜做法（不折射）。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Rod, bolts, disc, lathe, shell } from '@/lab-kit'
import { THERMO } from './physics'

export type V3 = [number, number, number]
/** 实验台上环境光弱，金属件把反射调亮一些 */
const ENV = 1.6
export const Glass3 = ({ o = 0.14 }: { o?: number }) => <meshPhysicalMaterial color="#1b2a31" transparent opacity={o * 1.5} roughness={0.03} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={2.4} depthWrite={false} side={THREE.DoubleSide} />
/** 液体：不是往上叠一层颜色，而是把后面的东西按这个颜色滤一遍（相乘）。背景再亮，水也还是看得出颜色；o 是颜色有多浓 */
export function Liquid({ color, o = 0.4 }: { color: string; o?: number }) {
  const c = useMemo(() => new THREE.Color('#ffffff').lerp(new THREE.Color(color), Math.min(1, o * 1.7)), [color, o])
  return <meshBasicMaterial color={c} transparent blending={THREE.CustomBlending} blendSrc={THREE.DstColorFactor} blendDst={THREE.ZeroFactor} depthWrite={false} toneMapped={false} />
}
/** 玻璃的底色：把后面的东西稍微压暗一点（相乘）。窗外再亮，空的玻璃器皿也看得出形状 */
export const Tint = ({ color = '#cfdde3' }: { color?: string }) => <meshBasicMaterial color={color} transparent blending={THREE.CustomBlending} blendSrc={THREE.DstColorFactor} blendDst={THREE.ZeroFactor} depthWrite={false} toneMapped={false} />
export const WATER = '#2a7cc6'
/** 杯口、瓶口的一圈亮边：玻璃在亮背景前面也看得出轮廓 */
export const Rim = ({ r, y }: { r: number; y: number }) => <mesh position-y={y} rotation-x={Math.PI / 2} renderOrder={4}><torusGeometry args={[r, 0.006, 6, 48]} /><meshBasicMaterial color="#eef6fa" transparent opacity={0.55} depthWrite={false} /></mesh>
const Rubber = ({ color = '#15171a' }: { color?: string }) => <meshStandardMaterial color={color} roughness={0.85} />

// ---------- 铁架台 ----------
export const STAND = { rodX: -0.5, baseH: 0.09, rodH: 3.4 }
const KNOB = lathe([[0, 0], [0.03, 0], [0.03, 0.05], [0.055, 0.06], [0.06, 0.075], [0.06, 0.1], [0.05, 0.115], [0, 0.115]], { segs: 12 })
/** 十字夹：套在立杆上的一个小方块，后面一颗蝶形螺丝把它顶紧 */
export function Boss({ y }: { y: number }) {
  return <group position={[STAND.rodX, y, 0]}>
    <RoundedBox args={[0.15, 0.17, 0.15]} radius={0.02} smoothness={3} castShadow><Metal kind="zinc" grain="cast" env={ENV} /></RoundedBox>
    <mesh geometry={KNOB} position={[0, 0, -0.07]} rotation-x={-Math.PI / 2}><Metal kind="brass" grain="turned" env={ENV} /></mesh>
    <mesh geometry={KNOB} position={[0.07, 0, 0]} rotation-z={-Math.PI / 2} scale={0.8}><Metal kind="brass" grain="turned" env={ENV} /></mesh>
  </group>
}
/** 铁圈：一个圆环，一根横杆接到十字夹上。y 是圆环顶面的高度；cx 是圆心离底座中心多远；R 是圆环的半径 */
export function Ring({ y, cx = 0.12, R = 0.3 }: { y: number; cx?: number; R?: number }) {
  const yc = y - 0.02
  return <group>
    <Boss y={yc} />
    <Rod from={[STAND.rodX + 0.07, yc, 0]} to={[cx - R, yc, 0]} r={0.02}><Metal kind="steel" grain="turned" env={ENV} /></Rod>
    <mesh position={[cx, yc, 0]} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[R, 0.02, 10, 48]} /><Metal kind="steel" grain="turned" env={ENV} /></mesh>
  </group>
}
/** 铁夹：一根横杆伸出去，头上两片弯爪（里面垫着软木）夹住半径 grip 的东西，旁边一颗螺丝调松紧。y 是夹口的高度，cx 是被夹的东西离底座中心多远 */
export function Clamp({ y, cx = 0.12, grip = 0.08, cz = 0 }: { y: number; cx?: number; grip?: number; cz?: number }) {
  const jaw = useMemo(() => new THREE.TorusGeometry(grip + 0.022, 0.016, 8, 20, 2.2), [grip])
  const pad = useMemo(() => new THREE.TorusGeometry(grip + 0.006, 0.012, 6, 16, 1.5), [grip])
  const hx = cx - grip - 0.16
  return <group>
    <Boss y={y} />
    <Rod from={[STAND.rodX + 0.07, y, 0]} to={[hx, y, cz]} r={0.022}><Metal kind="steel" grain="turned" env={ENV} /></Rod>
    <group position={[cx, y, cz]}>
      <RoundedBox args={[0.12, 0.07, 0.1]} radius={0.012} smoothness={2} position={[-grip - 0.11, 0, 0]} castShadow><Metal kind="zinc" grain="cast" env={ENV} /></RoundedBox>
      <mesh geometry={KNOB} position={[-grip - 0.11, 0.03, 0]} scale={0.8}><Metal kind="brass" grain="turned" env={ENV} /></mesh>
      {[1, -1].map(s => <group key={s} rotation-x={Math.PI / 2} scale={[1, s, 1]}>
        <mesh geometry={jaw} rotation-z={Math.PI - 2.2 + 0.1} castShadow><Metal kind="steel" env={ENV} /></mesh>
        <mesh geometry={pad} rotation-z={Math.PI - 1.5 - 0.2}><meshStandardMaterial color="#a67c4e" roughness={0.95} /></mesh>
      </group>)}
    </group>
  </group>
}
const FOOT = disc(0.07, 0.025, { chamfer: 0.006, segs: 16 })
/** 铁架台：铸铁底座（四只脚垫）、一根立杆，杆脚一只锁紧螺母。children 是装在杆上的铁圈、铁夹 */
export function Stand({ at, h = STAND.rodH, children = null }: { at: V3; h?: number; children?: ReactNode }) {
  return <group position={at}>
    <RoundedBox args={[1.32, STAND.baseH - 0.025, 0.84]} radius={0.016} smoothness={3} position={[0, 0.025 + (STAND.baseH - 0.025) / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#1b1e22" roughness={0.42} metalness={0.3} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} geometry={FOOT} position={[sx * 0.56, 0, sz * 0.32]}><Rubber /></mesh>))}
    <mesh geometry={disc(0.075, 0.05, { chamfer: 0.01, segs: 6 })} position={[STAND.rodX, STAND.baseH, 0]}><Metal kind="steel" grain="turned" env={ENV} /></mesh>
    <mesh position={[STAND.rodX, STAND.baseH + h / 2, 0]} castShadow><cylinderGeometry args={[0.032, 0.032, h, 20]} /><Metal kind="chrome" rough={0.16} env={ENV} /></mesh>
    <mesh position={[STAND.rodX, STAND.baseH + h, 0]}><sphereGeometry args={[0.032, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><Metal kind="chrome" rough={0.16} env={ENV} /></mesh>
    {children}
  </group>
}

// ---------- 石棉网 ----------
function makeGauze() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#3d4246'; g.fillRect(0, 0, S, S)
  g.strokeStyle = '#8a9096'; g.lineWidth = 1.5
  for (let i = 0; i <= S; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke() }
  const q = g.createRadialGradient(128, 128, 30, 128, 128, 92); q.addColorStop(0, '#d9d6cc'); q.addColorStop(0.85, '#cfcbc0'); q.addColorStop(1, 'rgba(200,196,186,0)')
  g.fillStyle = q; g.beginPath(); g.arc(128, 128, 92, 0, 7); g.fill()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
export const GAUZE_T = 0.014
/** 石棉网：一张铁丝网，中间一块灰白的石棉，四边卷了边。原点在底面正中 */
export function Gauze({ at }: { at: V3 }) {
  const map = useMemo(makeGauze, [])
  return <group position={at}>
    <mesh position-y={GAUZE_T / 2} castShadow receiveShadow><boxGeometry args={[0.78, GAUZE_T, 0.78]} /><meshStandardMaterial map={map} roughness={0.9} metalness={0.2} /></mesh>
    {[0, 1, 2, 3].map(i => <mesh key={i} position={[[0.39, 0, -0.39, 0][i], GAUZE_T / 2, [0, 0.39, 0, -0.39][i]]} rotation={[Math.PI / 2, 0, i % 2 ? Math.PI / 2 : 0]}><cylinderGeometry args={[0.011, 0.011, 0.78, 8]} /><Metal kind="steel" env={ENV} /></mesh>)}
  </group>
}

// ---------- 酒精灯 ----------
const LAMP = {
  body: shell([[0, 0], [0.16, 0], [0.22, 0.03], [0.25, 0.1], [0.24, 0.17], [0.15, 0.25], [0.085, 0.28], [0.08, 0.31]], 0.01, { segs: 44, crease: 50 }),
  fuel: lathe([[0, 0.012], [0.155, 0.012], [0.21, 0.04], [0.238, 0.1], [0.232, 0.14], [0, 0.14]], { segs: 36, crease: 50 }),
  collar: lathe([[0, 0.3], [0.1, 0.3], [0.106, 0.308], [0.106, 0.33], [0.05, 0.345], [0.044, 0.39], [0, 0.39]], { segs: 28 }),
  cap: shell([[0, 0.2], [0.07, 0.2], [0.095, 0.18], [0.1, 0], [0.11, -0.005]], 0.008, { segs: 30 }),
  flame: lathe([[0, 0], [0.034, 0.014], [0.05, 0.06], [0.043, 0.12], [0.022, 0.19], [0.007, 0.24], [0, 0.26]], { segs: 20, crease: 80 }),
}
export const LAMP_H = 0.42, FLAME_H = 0.26
/** 酒精灯：玻璃壶身、里面的酒精、瓷的灯芯管、棉线灯芯；lit 从 0 到 1 是火苗烧起来的程度。灭着的时候灯帽盖在上面，点着的时候放在旁边 */
export function Lamp({ at, lit, capAt = [0.42, 0, 0.3] }: { at: V3; lit: number; capAt?: V3 }) {
  const flame = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { const t = clock.elapsedTime; flame.current?.scale.set(1 + Math.sin(t * 13) * 0.06, lit * (1 + Math.sin(t * 9) * 0.07 + Math.sin(t * 23) * 0.03), 1 + Math.cos(t * 11) * 0.06) })
  const on = lit > 0.02
  return <group position={at}>
    <mesh geometry={LAMP.fuel} renderOrder={2}><meshPhysicalMaterial color="#9cc3e6" transparent opacity={0.5} roughness={0.1} depthWrite={false} /></mesh>
    <mesh geometry={LAMP.body} renderOrder={2}><Tint /></mesh><mesh geometry={LAMP.body} renderOrder={3} castShadow><Glass3 o={0.17} /></mesh>
    <mesh geometry={LAMP.collar} castShadow><meshPhysicalMaterial color="#e3dfd2" roughness={0.3} clearcoat={0.7} /></mesh>
    <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.026, 0.032, 0.36, 10]} /><meshStandardMaterial color="#d8cfb6" roughness={1} /></mesh>
    <mesh position={[0, 0.43, 0]}><cylinderGeometry args={[0.024, 0.027, 0.03, 10]} /><meshStandardMaterial color={on ? '#2a2420' : '#b9ae93'} roughness={1} /></mesh>
    <group position={on ? capAt : [0, 0.31, 0]}><mesh geometry={LAMP.cap} renderOrder={3} castShadow><Glass3 o={0.2} /></mesh></group>
    <group ref={flame} position={[0, LAMP_H, 0]} scale={[1, 0, 1]} visible={on}>
      <mesh geometry={LAMP.flame} renderOrder={5}><meshBasicMaterial color="#ff8a24" transparent opacity={0.8} toneMapped={false} depthWrite={false} /></mesh>
      <mesh geometry={LAMP.flame} scale={[0.6, 0.72, 0.6]} position={[0, 0.012, 0]} renderOrder={6}><meshBasicMaterial color="#ffe9a0" transparent opacity={0.95} toneMapped={false} depthWrite={false} /></mesh>
      <mesh position={[0, 0.02, 0]} scale={[1, 0.8, 1]} renderOrder={6}><sphereGeometry args={[0.04, 12, 8]} /><meshBasicMaterial color="#3f7dff" transparent opacity={0.7} toneMapped={false} depthWrite={false} /></mesh>
    </group>
    {on && <pointLight position={[0, 0.6, 0.25]} intensity={2.6 * lit} distance={3.4} decay={1.6} color="#ffb060" />}
  </group>
}

// ---------- 烧杯 ----------
export const BEAKER = { r: 0.225, h: 0.66, inR: 0.212, floor: 0.012 }
const CUP = shell([[0, 0], [0.2, 0], [0.225, 0.025], [0.225, 0.62], [0.235, 0.648], [0.246, 0.66]], 0.011, { segs: 52 })
const SPOUT = new THREE.CylinderGeometry(0.06, 0.016, 0.075, 12, 1, true, 0, Math.PI)
/** 烧杯。level：里面的液体有多深（画面里的单位，0 就是空的）；children：泡在里面的东西，原点在杯底内侧正中；k：整只放大多少 */
export function Beaker({ at, level = 0, color = WATER, o = 0.5, k = 1, marks = true, children = null }: { at: V3; level?: number; color?: string; o?: number; k?: number; marks?: boolean; children?: ReactNode }) {
  return <group position={at} scale={k}>
    <group position-y={BEAKER.floor}>{children}</group>
    {level > 0.004 && <>
      <mesh position={[0, BEAKER.floor + level / 2, 0]} renderOrder={2}><cylinderGeometry args={[BEAKER.inR - 0.003, BEAKER.inR - 0.016, level, 44]} /><Liquid color={color} o={o} /></mesh>
      <mesh position={[0, BEAKER.floor + level, 0]} rotation-x={-Math.PI / 2} renderOrder={2}><ringGeometry args={[BEAKER.inR - 0.035, BEAKER.inR - 0.004, 44]} /><meshBasicMaterial color="#d9eefa" transparent opacity={0.3} depthWrite={false} /></mesh>
    </>}
    <mesh geometry={CUP} renderOrder={2}><Tint /></mesh><mesh geometry={CUP} renderOrder={3} castShadow><Glass3 o={0.16} /></mesh><Rim r={0.24} y={BEAKER.h} /><Rim r={0.2} y={0.004} />
    <mesh geometry={SPOUT} position={[-0.24, BEAKER.h - 0.014, 0]} rotation-z={1.0} renderOrder={3}><Glass3 o={0.2} /></mesh>
    {marks && [0.15, 0.27, 0.39, 0.51].map((y, i) => <mesh key={y} position={[0, y, 0]} renderOrder={4}><cylinderGeometry args={[BEAKER.r + 0.001, BEAKER.r + 0.001, 0.005, 24, 1, true, -0.3, i % 2 ? 0.8 : 0.5]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.75} side={THREE.DoubleSide} /></mesh>)}
  </group>
}
/** 盖在烧杯口上的硬纸板，中间一个插温度计的孔 */
export function Lid({ at }: { at: V3 }) {
  const g = useMemo(() => disc(0.3, 0.016, { hole: 0.045, chamfer: 0.002, segs: 40 }), [])
  return <mesh geometry={g} position={at} castShadow><meshStandardMaterial color="#b89a6a" roughness={0.95} /></mesh>
}

// ---------- 试管 ----------
export const TUBE = { r: 0.085, h: 1.1, inR: 0.077 }
const TUBE_G = shell([[0, 0], [0.045, 0.012], [0.072, 0.045], [0.085, 0.09], [0.085, 1.07], [0.092, 1.09], [0.1, 1.1]], 0.008, { segs: 36, crease: 60 })
/** 试管：圆底，口上一圈翻边。children 画在里面（原点在管底外侧） */
export function Tube({ at, children = null }: { at: V3; children?: ReactNode }) {
  return <group position={at}>{children}<mesh geometry={TUBE_G} renderOrder={2}><Tint /></mesh><mesh geometry={TUBE_G} renderOrder={3} castShadow><Glass3 o={0.15} /></mesh><Rim r={0.097} y={TUBE.h} /></group>
}

// ---------- 锥形瓶、水槽 ----------
export const FLASK = { h: 0.84, neck: 0.1, base: 0.3 }
const FLASK_G = shell([[0, 0], [0.27, 0], [0.3, 0.028], [0.3, 0.06], [0.11, 0.58], [0.1, 0.64], [0.1, 0.8], [0.108, 0.825], [0.12, 0.84]], 0.011, { segs: 52, crease: 50 })
const PLUG = lathe([[0, 0.72], [0.085, 0.72], [0.105, 0.9], [0.1, 0.915], [0, 0.915]], { segs: 28 })
const GLASS_PLUG = lathe([[0, 0.72], [0.086, 0.72], [0.096, 0.86], [0.13, 0.875], [0.13, 0.9], [0.05, 0.92], [0.05, 0.98], [0.12, 1.0], [0.12, 1.03], [0, 1.03]], { segs: 28 })
/** 锥形瓶。plug：'rubber' 橡皮塞，'glass' 磨口玻璃塞；level：瓶里的水有多深；children 画在瓶里（原点在瓶底内侧） */
export function Flask({ at, plug, level = 0, color = WATER, children = null }: { at?: V3; plug?: 'rubber' | 'glass'; level?: number; color?: string; children?: ReactNode }) {
  // 瓶身往上收：水面处的半径按高度算
  const rAt = (y: number) => y < 0.06 ? 0.285 : 0.285 - (y - 0.06) / 0.52 * 0.19
  return <group position={at}>
    <group position-y={0.012}>{children}</group>
    {level > 0.004 && <mesh position={[0, 0.012 + level / 2, 0]} renderOrder={2}><cylinderGeometry args={[rAt(level + 0.012) - 0.004, 0.27, level, 44]} /><Liquid color={color} /></mesh>}
    <mesh geometry={FLASK_G} renderOrder={2}><Tint /></mesh><mesh geometry={FLASK_G} renderOrder={3} castShadow><Glass3 o={0.15} /></mesh><Rim r={0.115} y={FLASK.h} /><Rim r={0.285} y={0.03} />
    {plug === 'rubber' && <mesh geometry={PLUG} castShadow><Rubber color="#7a2f26" /></mesh>}
    {plug === 'glass' && <mesh geometry={GLASS_PLUG} renderOrder={3}><Glass3 o={0.3} /></mesh>}
  </group>
}
export const TROUGH = { r: 0.56, h: 0.42 }
const TROUGH_G = shell([[0, 0], [0.52, 0], [0.56, 0.03], [0.56, 0.39], [0.575, 0.41], [0.59, 0.42]], 0.014, { segs: 64 })
/** 玻璃水槽：又矮又粗的一只圆缸。level 是水深 */
export function Trough({ at, level, color, o = 0.46, children = null }: { at: V3; level: number; color: string; o?: number; children?: ReactNode }) {
  return <group position={at}>
    {children}
    <mesh position={[0, 0.016 + level / 2, 0]} renderOrder={2}><cylinderGeometry args={[0.54, 0.535, level, 56]} /><Liquid color={color} o={o} /></mesh>
    <mesh position={[0, 0.016 + level, 0]} rotation-x={-Math.PI / 2} renderOrder={2}><ringGeometry args={[0.47, 0.54, 56]} /><meshBasicMaterial color="#e6f3fa" transparent opacity={0.28} depthWrite={false} /></mesh>
    <mesh geometry={TROUGH_G} renderOrder={2}><Tint /></mesh><mesh geometry={TROUGH_G} renderOrder={3} castShadow><Glass3 o={0.15} /></mesh><Rim r={0.585} y={TROUGH.h} />
  </group>
}

// ---------- 温度计 ----------
/** 温度计上各处的高度（原点在玻璃泡的底）：总长、量程下限的刻线在多高、每 1 ℃ 多高 */
export const TH = { len: 1.86, y0: 0.26, per: 0.0116, r: 0.03 }
/** 示数是 T 时，液柱顶在多高 */
export const thermoY = (T: number) => TH.y0 + (Math.min(THERMO.max, Math.max(THERMO.min, T)) - THERMO.min) * TH.per
const STEM = lathe([[0, 0], [0.022, 0.006], [0.036, 0.03], [0.04, 0.07], [0.036, 0.115], [TH.r, 0.15], [TH.r, TH.len - 0.05], [0.022, TH.len - 0.012], [0, TH.len]], { segs: 28, crease: 60 })
const BULB = lathe([[0, 0.012], [0.02, 0.018], [0.03, 0.04], [0.033, 0.07], [0.029, 0.11], [0.012, 0.14], [0, 0.145]], { segs: 20, crease: 60 })
function makeScale() {
  const W = 128, n = THERMO.max - THERMO.min, H = n * 12, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#10161b'; g.font = '700 30px sans-serif'; g.textBaseline = 'middle'
  for (let v = THERMO.min; v <= THERMO.max; v += THERMO.step) {
    const y = H - (v - THERMO.min) / n * H, ten = v % 10 === 0, five = v % 5 === 0
    g.fillRect(74, Math.max(0, y - (ten ? 2.5 : 1.5)), ten ? 54 : five ? 40 : 26, ten ? 5 : 3)
    if (ten && v > THERMO.min && v < THERMO.max) { g.textAlign = 'right'; g.fillText(String(v), 68, y + 1) }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
/**
 * 实验用的液体温度计：玻璃泡、细管里的红色液柱（随 T 升降）、背面一条白底、正面的刻度和数字、顶上一个挂环。
 * 原点在玻璃泡的底。cotton：玻璃泡上包着一小团棉花（蘸酒精用）
 */
export function Thermo({ at, T, cotton = false, wet = 0 }: { at?: V3; T: number; cotton?: boolean; wet?: number }) {
  const scale = useMemo(makeScale, [])
  const top = thermoY(T), span = (THERMO.max - THERMO.min) * TH.per
  return <group position={at} scale={[1.9, 1, 1.9]}>
    <mesh position={[0, TH.y0 + span / 2, -0.012]}><boxGeometry args={[0.034, span + 0.1, 0.006]} /><meshStandardMaterial color="#f1eee2" roughness={0.6} /></mesh>
    <mesh geometry={BULB}><meshStandardMaterial color="#c62922" roughness={0.3} emissive="#5a0d0a" emissiveIntensity={0.6} /></mesh>
    <mesh position={[0, (0.13 + top) / 2, 0]}><cylinderGeometry args={[0.0095, 0.0095, top - 0.13, 10]} /><meshBasicMaterial color="#e2332a" /></mesh>
    <mesh position={[0, TH.y0 + span / 2, 0]} renderOrder={4}><cylinderGeometry args={[TH.r + 0.0006, TH.r + 0.0006, span, 20, 1, true, -1.0, 2.0]} /><meshBasicMaterial map={scale} transparent depthWrite={false} toneMapped={false} /></mesh>
    <mesh geometry={STEM} renderOrder={3} castShadow><Glass3 o={0.2} /></mesh>
    <mesh position={[0, TH.len + 0.022, 0]}><torusGeometry args={[0.024, 0.007, 8, 20]} /><Glass3 o={0.45} /></mesh>
    {cotton && <mesh position={[0, 0.075, 0]} scale={[1, 1.5, 1]}><sphereGeometry args={[0.062, 16, 12]} /><meshStandardMaterial color={new THREE.Color('#f3f0e6').lerp(new THREE.Color('#aebfc9'), wet)} roughness={1} /></mesh>}
  </group>
}
/** 体温计：短一些，玻璃泡细长，量程只有 35–42 ℃；平放在一只托盘里。只是摆着认一认 */
export function Clinical({ at }: { at: V3 }) {
  return <group position={at}>
    <RoundedBox args={[1.0, 0.03, 0.3]} radius={0.012} smoothness={2} position={[0, 0.015, 0]} receiveShadow castShadow><meshPhysicalMaterial color="#e9ece8" roughness={0.3} clearcoat={0.6} /></RoundedBox>
    <group position={[-0.36, 0.055, 0]} rotation-z={-Math.PI / 2}>
      <mesh position-y={0.4} renderOrder={3}><cylinderGeometry args={[0.022, 0.022, 0.64, 3]} /><Glass3 o={0.3} /></mesh>
      <mesh position-y={0.04} scale={[1, 2.6, 1]}><sphereGeometry args={[0.017, 12, 10]} /><meshStandardMaterial color="#b8bcc0" metalness={0.9} roughness={0.2} /></mesh>
      <mesh position-y={0.26}><cylinderGeometry args={[0.004, 0.004, 0.36, 6]} /><meshBasicMaterial color="#c0c4c8" /></mesh>
      <mesh position={[0, 0.42, -0.008]}><boxGeometry args={[0.026, 0.46, 0.004]} /><meshStandardMaterial color="#f1eee2" roughness={0.6} /></mesh>
    </group>
  </group>
}

// ---------- 停表 ----------
function makeFace() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#f3f1e8'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill()
  g.translate(128, 128); g.strokeStyle = g.fillStyle = '#1b2026'; g.font = '700 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; g.lineWidth = i % 5 ? 2 : 4.5; g.beginPath(); g.moveTo(Math.sin(a) * (i % 5 ? 110 : 102), -Math.cos(a) * (i % 5 ? 110 : 102)); g.lineTo(Math.sin(a) * 120, -Math.cos(a) * 120); g.stroke(); if (i % 5 === 0) g.fillText(String(i || 60), Math.sin(a) * 84, -Math.cos(a) * 84) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
const WATCH = lathe([[0, 0], [0.15, 0], [0.175, 0.012], [0.185, 0.035], [0.175, 0.058], [0.16, 0.066], [0, 0.066]], { segs: 48 })
/** 停表：镀铬的表壳、白表盘、一根红指针（turn 是转了几圈）、顶上的按钮和提环。平放在台面上，表头朝后 */
export function Stopwatch({ at, turn }: { at: V3; turn: number }) {
  const face = useMemo(makeFace, [])
  return <group position={at} rotation-y={0.25}>
    <mesh geometry={WATCH} castShadow><Metal kind="chrome" rough={0.12} env={ENV} /></mesh>
    <mesh position-y={0.0675} rotation-x={-Math.PI / 2}><circleGeometry args={[0.155, 40]} /><meshStandardMaterial map={face} roughness={0.5} /></mesh>
    <group position-y={0.072} rotation-y={-turn * Math.PI * 2}><mesh position={[0, 0, -0.055]}><boxGeometry args={[0.008, 0.004, 0.15]} /><meshBasicMaterial color="#c8322a" /></mesh><mesh><cylinderGeometry args={[0.014, 0.014, 0.008, 12]} /><meshStandardMaterial color="#20262b" /></mesh></group>
    <mesh position={[0, 0.033, -0.205]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, 0.05, 16]} /><Metal kind="chrome" grain="turned" env={ENV} /></mesh>
    <mesh position={[0, 0.033, -0.25]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.038, 0.038, 0.03, 20]} /><Metal kind="brass" grain="turned" env={ENV} /></mesh>
    <mesh position={[0, 0.033, -0.3]} rotation-x={Math.PI / 2}><torusGeometry args={[0.05, 0.008, 8, 24]} /><Metal kind="chrome" env={ENV} /></mesh>
  </group>
}

// ---------- 注射器 ----------
export const SYR = { r: 0.12, len: 0.95, per: 0.04 }           // 针筒半径、长度；每 1 mL 活塞走多远
const BARREL = shell([[0.03, 0], [0.03, 0.08], [0.05, 0.1], [0.12, 0.13], [0.12, 1.05]], 0.01, { segs: 40 })
const FLANGE = disc(0.2, 0.02, { hole: 0.11, chamfer: 0.004 })
/** 注射器：平放着，针嘴朝左，用一只红色的橡皮帽堵住。V 是活塞对着的刻度（mL）；liquid 是里面出现了多少液体（0–1）。原点在针筒中段的轴线上 */
export function Syringe({ at, V, liquid }: { at: V3; V: number; liquid: number }) {
  const x = 0.13 + V * SYR.per                                         // 活塞前端离针嘴一端多远
  const ticks = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d')!; g.fillStyle = '#12202b'; g.font = '700 26px sans-serif'; g.textAlign = 'center'; for (let v = 0; v <= 20; v++) { const px = 12 + v * 24; g.fillRect(px - 1.5, 0, 3, v % 5 ? 16 : 28); if (v % 5 === 0) g.fillText(String(v), px, 54) } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }, [])
  return <group position={at}>
    <group position={[-0.55, 0, 0]} rotation-z={-Math.PI / 2}>
      <mesh geometry={BARREL} renderOrder={2}><Tint /></mesh><mesh geometry={BARREL} renderOrder={3} castShadow><Glass3 o={0.16} /></mesh>
      <mesh geometry={FLANGE} position-y={1.05} renderOrder={3}><Glass3 o={0.3} /></mesh>
      <mesh position-y={-0.01}><cylinderGeometry args={[0.045, 0.04, 0.1, 16]} /><Rubber color="#a8342b" /></mesh>
      {/* 活塞：黑橡胶头、推杆、推柄 */}
      <group position-y={x}>
        <mesh position-y={0.04}><cylinderGeometry args={[0.108, 0.108, 0.08, 28]} /><Rubber /></mesh>
        {[0.012, 0.068].map(y => <mesh key={y} position-y={y}><cylinderGeometry args={[0.111, 0.111, 0.012, 28]} /><Rubber /></mesh>)}
        <mesh position-y={0.6}><boxGeometry args={[0.15, 1.04, 0.02]} /><meshPhysicalMaterial color="#e9ece8" roughness={0.4} clearcoat={0.4} /></mesh>
        <mesh position-y={0.6}><boxGeometry args={[0.02, 1.04, 0.15]} /><meshPhysicalMaterial color="#e9ece8" roughness={0.4} clearcoat={0.4} /></mesh>
        <mesh geometry={disc(0.17, 0.03, { chamfer: 0.008 })} position-y={1.12}><meshPhysicalMaterial color="#e9ece8" roughness={0.4} clearcoat={0.4} /></mesh>
      </group>
      {/* 压出来的液体：贴着针筒下壁的一小滩 */}
      {liquid > 0.02 && <mesh position={[0.108 - 0.03 * liquid, 0.13 + (x - 0.13) / 2, 0]} scale={[0.3 * liquid, 1, 0.75]} renderOrder={2}><cylinderGeometry args={[0.1, 0.1, Math.max(0.02, x - 0.15), 20]} /><meshBasicMaterial color="#e8d36a" transparent opacity={0.75} depthWrite={false} /></mesh>}
    </group>
    <mesh position={[-0.55 + 0.13 + 10 * SYR.per, 0.05, 0.1215]} renderOrder={4}><planeGeometry args={[20.5 * SYR.per, 0.1]} /><meshBasicMaterial map={ticks} transparent depthWrite={false} toneMapped={false} /></mesh>
  </group>
}
/** 垫注射器的木托：一块木头，上面挖了一道圆槽 */
export function Cradle({ at, w = 1.0 }: { at: V3; w?: number }) {
  return <group position={at}>{[-1, 1].map(s => <RoundedBox key={s} args={[0.12, 0.22, 0.42]} radius={0.015} smoothness={2} position={[s * w / 2, 0.11, 0]} castShadow receiveShadow><meshStandardMaterial color="#a67c4e" roughness={0.8} /></RoundedBox>)}
    <RoundedBox args={[w + 0.2, 0.05, 0.46]} radius={0.012} smoothness={2} position={[0, 0.025, 0]} castShadow receiveShadow><meshStandardMaterial color="#8f6a42" roughness={0.8} /></RoundedBox>
  </group>
}

// ---------- 小风扇 ----------
const FAN = { base: lathe([[0, 0], [0.26, 0], [0.28, 0.02], [0.28, 0.05], [0.12, 0.09], [0.05, 0.1], [0, 0.1]], { segs: 40 }), motor: lathe([[0, -0.12], [0.07, -0.12], [0.1, -0.09], [0.1, 0.08], [0.07, 0.12], [0, 0.12]], { segs: 28 }) }
const BLADE = (() => { const s = new THREE.Shape(); s.moveTo(0.03, -0.02); s.quadraticCurveTo(0.2, -0.13, 0.3, -0.04); s.quadraticCurveTo(0.33, 0.07, 0.2, 0.1); s.quadraticCurveTo(0.1, 0.09, 0.03, 0.02); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 1, curveSegments: 10 }) })()
/** 小台扇：朝左吹。on 从 0 到 1 是转得多快 */
export function Fan({ at, on }: { at: V3; on: number }) {
  const rotor = useRef<THREE.Group>(null), k = useRef(on); k.current = on
  useFrame((_, d) => { if (rotor.current) rotor.current.rotation.z += Math.min(d, 1 / 30) * 26 * k.current })
  return <group position={at}>
    <mesh geometry={FAN.base} castShadow receiveShadow><meshPhysicalMaterial color="#2c5f7a" roughness={0.35} clearcoat={0.6} /></mesh>
    <mesh geometry={bolts(4, 0.2, 0.03)} position-y={0.045}><Metal kind="steel" /></mesh>
    <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.03, 0.04, 0.42, 14]} /><Metal kind="chrome" rough={0.15} env={ENV} /></mesh>
    <group position={[0, 0.58, 0]} rotation-y={-Math.PI / 2}>
      <mesh geometry={FAN.motor} rotation-x={Math.PI / 2} castShadow><meshPhysicalMaterial color="#2c5f7a" roughness={0.35} clearcoat={0.6} /></mesh>
      <group ref={rotor} position-z={0.16}>
        {[0, 1, 2].map(i => <mesh key={i} geometry={BLADE} rotation={[0.3, 0, i * Math.PI * 2 / 3]}><meshPhysicalMaterial color="#cfd6da" roughness={0.3} clearcoat={0.5} transparent opacity={1 - 0.45 * on} /></mesh>)}
        <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.045, 0.045, 0.05, 16]} /><Metal kind="aluminum" grain="turned" /></mesh>
      </group>
      {/* 网罩：前后两圈、一圈辐条 */}
      {[0.1, 0.22].map(z => <mesh key={z} position-z={z}><torusGeometry args={[0.36, 0.008, 6, 40]} /><Metal kind="chrome" env={ENV} /></mesh>)}
      {Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return <Rod key={i} from={[Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0.1]} to={[Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0.22]} r={0.005}><Metal kind="chrome" env={ENV} /></Rod> })}
      {Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return <Rod key={`f${i}`} from={[Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0.22]} to={[Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.26]} r={0.004}><Metal kind="chrome" env={ENV} /></Rod> })}
    </group>
  </group>
}

/** 一块小木垫：垫玻璃片、放东西用 */
export function Block({ at, size = [0.7, 0.12, 0.7] }: { at: V3; size?: V3 }) {
  return <RoundedBox args={size} radius={0.015} smoothness={2} position={[at[0], at[1] + size[1] / 2, at[2]]} castShadow receiveShadow><meshStandardMaterial color="#a67c4e" roughness={0.8} /></RoundedBox>
}
/** 一盒火柴 */
export function Matches({ at }: { at: V3 }) {
  return <group position={at} rotation-y={0.5}>
    <RoundedBox args={[0.3, 0.09, 0.2]} radius={0.008} smoothness={2} position-y={0.045} castShadow><meshStandardMaterial color="#b5443a" roughness={0.8} /></RoundedBox>
    <mesh position={[0, 0.045, 0.101]}><planeGeometry args={[0.28, 0.07]} /><meshStandardMaterial color="#3a2a22" roughness={1} /></mesh>
  </group>
}
