// 实验台上的器材：烧杯、蜡烛、酒精灯、坩埚钳、铜片和白磷红磷、温度计、通风橱、手套、粉尘爆炸罐、皮老虎、安全标志牌。
// 尺寸都按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里（多半是底面正中）。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { M, type V3 } from './world'
import { makeSafetySign, thermoTex } from './mats'
import type { Sign } from './physics'

const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
const memo = <K, T>(f: (k: K) => T) => { const c = new Map<K, T>(); return (k: K) => { if (!c.has(k)) c.set(k, f(k)); return c.get(k)! } }

/** 玻璃：容器里还要画东西，用便宜的做法（半透明、不写深度、双面），反光调亮 */
export const Glass = ({ tint = '#e4f2f5', opacity = 0.18 }: { tint?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={tint} transparent opacity={opacity} roughness={0.04} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={2.2} depthWrite={false} side={THREE.DoubleSide} />
export const Liquid = ({ color = '#cfe6ee', opacity = 0.42 }: { color?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.06} clearcoat={0.6} depthWrite={false} />

// ---------- 烧杯 ----------
/** 烧杯的外形（m）：半径、高 */
export const BEAKER = { 500: { r: 0.043, h: 0.12 }, 1000: { r: 0.053, h: 0.145 } } as const
const beakerGeo = memo((vol: 500 | 1000) => {
  const { r, h } = BEAKER[vol]
  return shell(m([[0, 0], [r - 0.004, 0], [r, 0.004], [r, h - 0.004], [r + 0.0018, h - 0.0008], [r + 0.0024, h]]), 0.0018 * M, { segs: 56 })
})
/** 一只烧杯，原点在杯底正中。fill 是盛了多少（0–1）；down 为真时倒扣（口朝下） */
export function Beaker({ vol, fill = 0, liquid = '#cfe6ee', down = false, marks = true }: { vol: 500 | 1000; fill?: number; liquid?: string; down?: boolean; marks?: boolean }) {
  const { r, h } = BEAKER[vol], R = r * M, H = h * M
  return <group rotation-x={down ? Math.PI : 0} position-y={down ? H : 0}>
    <mesh geometry={beakerGeo(vol)} renderOrder={6}><Glass /></mesh>
    {/* 刻度：几道白色的短横线，一块白色的印字区 */}
    {marks && [0.3, 0.45, 0.6, 0.75].map((k, i) => <mesh key={k} position={[0, H * k, 0]} rotation-y={-0.5}><cylinderGeometry args={[R + 0.003, R + 0.003, 0.012, 24, 1, true, 0, i % 2 ? 0.32 : 0.55]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    {marks && <mesh position={[0, H * 0.5, 0]} rotation-y={0.75}><cylinderGeometry args={[R + 0.003, R + 0.003, H * 0.22, 24, 1, true, 0, 0.5]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
    {fill > 0.005 && <>
      <mesh position={[0, H * fill / 2 + 0.006, 0]} renderOrder={5}><cylinderGeometry args={[R - 0.012, R - 0.014, H * fill, 40]} /><Liquid color={liquid} /></mesh>
      <mesh position={[0, H * fill + 0.007, 0]} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[R - 0.012, 40]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.22} roughness={0.02} clearcoat={1} envMapIntensity={2} depthWrite={false} /></mesh>
    </>}
  </group>
}

// ---------- 蜡烛 ----------
/** 一支白蜡烛，立在一小摊蜡上。原点在桌面，h 是蜡烛的高（m）。顶上的烛芯在 wickY 处 */
export const CANDLE = { r: 0.01, h: 0.07 }
const candleGeo = memo((h: number) => lathe(m([[0, 0], [CANDLE.r, 0], [CANDLE.r, h - 0.003], [CANDLE.r - 0.002, h], [0.004, h - 0.002], [0, h - 0.003]]), { segs: 32 }))
export function Candle({ h = CANDLE.h, lit = true }: { h?: number; lit?: boolean }) {
  return <group>
    <mesh position={[0, 0.002, 0]} scale={[1, 0.12, 1]}><sphereGeometry args={[CANDLE.r * 1.8 * M, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#efe9dc" roughness={0.6} /></mesh>
    <mesh geometry={candleGeo(h)} castShadow><meshPhysicalMaterial color="#f3eee2" roughness={0.55} transmission={0.15} thickness={0.2} sheen={0.3} emissive="#f0c890" emissiveIntensity={lit ? 0.12 : 0} /></mesh>
    {/* 烛芯：烧过的那截是黑的 */}
    <mesh position={[0, (h + 0.004) * M, 0]} rotation-z={lit ? 0.1 : 0.3}><cylinderGeometry args={[0.0007 * M, 0.0008 * M, 0.011 * M, 6]} /><meshStandardMaterial color="#1c1612" roughness={0.9} /></mesh>
  </group>
}

// ---------- 酒精灯 ----------
/** 酒精灯：扁圆的玻璃灯身，细颈，瓷的灯芯管，里面大半瓶酒精；灯帽放在一边。原点在灯底正中，灯芯顶在 LAMP.top */
export const LAMP = { top: 0.098 }
export function AlcoholLamp() {
  const g = useMemo(() => ({
    body: shell(m([[0, 0], [0.036, 0], [0.04, 0.004], [0.042, 0.02], [0.04, 0.04], [0.032, 0.056], [0.018, 0.066], [0.013, 0.07], [0.013, 0.078]]), 0.0022 * M, { segs: 48 }),
    holder: lathe(m([[0, 0.074], [0.016, 0.074], [0.017, 0.078], [0.009, 0.082], [0.0065, 0.09], [0.0055, 0.09], [0.0055, 0.074]]), { segs: 28, closed: false }),
    tube: lathe(m([[0, 0.078], [0.005, 0.078], [0.005, 0.094], [0.004, 0.096], [0, 0.096]]), { segs: 20 }),
  }), [])
  return <group>
    <mesh geometry={g.body} renderOrder={6}><Glass tint="#eef6f4" opacity={0.22} /></mesh>
    <mesh position={[0, 0.018 * M, 0]} renderOrder={5}><cylinderGeometry args={[0.038 * M, 0.034 * M, 0.034 * M, 40]} /><Liquid color="#e6eef0" opacity={0.3} /></mesh>
    <mesh geometry={g.holder} castShadow><meshStandardMaterial color="#ecebe5" roughness={0.3} /></mesh>
    <mesh geometry={g.tube}><Metal kind="brass" grain="turned" rough={0.4} /></mesh>
    {/* 灯芯：一束白棉线，下半截泡在酒精里；顶上烧得发黑 */}
    <mesh position={[0, 0.06 * M, 0]}><cylinderGeometry args={[0.0028 * M, 0.0028 * M, 0.08 * M, 10]} /><meshStandardMaterial color="#f1ede2" roughness={1} /></mesh>
    <mesh position={[0, 0.097 * M, 0]}><cylinderGeometry args={[0.0026 * M, 0.003 * M, 0.004 * M, 10]} /><meshStandardMaterial color="#2a241e" roughness={1} /></mesh>
  </group>
}
/** 酒精灯的灯帽：一只玻璃的小罩，原点在帽口 */
export function LampCap() {
  const g = useMemo(() => shell(m([[0, 0.045], [0.014, 0.043], [0.019, 0.03], [0.019, 0]]).reverse() as RY[], 0.002 * M, { segs: 36 }), [])
  return <mesh geometry={g} renderOrder={6}><Glass opacity={0.25} /></mesh>
}

// ---------- 坩埚钳 ----------
/** 坩埚钳：两片不锈钢的钳腿在中间铰接，前端弯成小圆钳嘴，后端两个环。原点在钳嘴，钳子朝 −x 伸向手 */
export function Tongs({ open = 0 }: { open?: number }) {
  const legs = useMemo(() => [1, -1].map(s => {
    const pts = [[0, 0], [-0.012, s * 0.006], [-0.03, s * 0.008], [-0.07, s * 0.004], [-0.11, 0], [-0.16, -s * 0.008], [-0.2, -s * 0.012]].map(([x, z]) => new THREE.Vector3(x * M, 0, z * M))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0022 * M, 8)
  }), [])
  return <group>
    {legs.map((g, i) => <mesh key={i} geometry={g} rotation-y={(i ? 1 : -1) * open * 0.08} castShadow><Metal kind="stainless" grain="brushed" /></mesh>)}
    <mesh position={[-0.11 * M, 0, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.004 * M, 0.004 * M, 0.008 * M, 12]} /><Metal kind="steel" /></mesh>
    {[1, -1].map(s => <mesh key={s} position={[-0.21 * M, 0, -s * 0.014 * M]} rotation-x={Math.PI / 2}><torusGeometry args={[0.008 * M, 0.0022 * M, 8, 20]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
  </group>
}

// ---------- 铜片实验 ----------
/** 铜片：一条薄铜片，两头微微翘起；原点在正中，长沿 x */
export const PLATE = { len: 0.14, w: 0.03, t: 0.0012 }
export function CopperPlate({ heat = 0 }: { heat?: number }) {
  return <group>
    <RoundedBox args={[PLATE.len * M, PLATE.t * M, PLATE.w * M]} radius={PLATE.t * M * 0.45} smoothness={2} castShadow receiveShadow>
      <meshStandardMaterial color={new THREE.Color().setRGB(0.95, 0.6 - heat * 0.08, 0.5 - heat * 0.1)} metalness={1} roughness={0.34} envMapIntensity={1.5} />
    </RoundedBox>
  </group>
}
/** 一小块白磷：蜡一样的淡黄色小块。一小堆红磷：暗红的粉 */
export function WhiteP({ s = 1 }: { s?: number }) {
  return <mesh scale={[1.2 * s, 0.7 * s, 1 * s]} position-y={0.003 * M * s} castShadow><dodecahedronGeometry args={[0.0042 * M, 1]} /><meshPhysicalMaterial color="#efe6b8" roughness={0.45} transmission={0.25} thickness={0.1} clearcoat={0.4} /></mesh>
}
export function RedP() {
  return <mesh scale={[1, 0.42, 1]} castShadow><sphereGeometry args={[0.007 * M, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#7a1f17" roughness={0.95} /></mesh>
}
/** 玻璃温度计：细长的玻璃管，底下一个红色的液泡，红色液柱高到 temp（0–100 °C）。原点在液泡底，竖直朝上，长 0.26 m */
export function Thermometer({ temp }: { temp: number }) {
  const L = 0.26 * M, k = Math.max(0, Math.min(1, temp / 100))
  const tex = thermoTex()
  return <group>
    <mesh position={[0, L / 2, 0]} renderOrder={7}><cylinderGeometry args={[0.0035 * M, 0.0035 * M, L, 14]} /><Glass opacity={0.3} /></mesh>
    <mesh position={[0, 0.008 * M, 0]}><sphereGeometry args={[0.0042 * M, 14, 10]} /><meshStandardMaterial color="#c92c22" roughness={0.3} /></mesh>
    {/* 液柱：0 °C 在液泡上 0.03 m，100 °C 在 0.24 m */}
    <mesh position={[0, (0.03 + 0.21 * k / 2) * M, 0]}><cylinderGeometry args={[0.0011 * M, 0.0011 * M, (0.012 + 0.21 * k) * M, 8]} /><meshBasicMaterial color="#d23026" /></mesh>
    <mesh position={[0, 0.135 * M, -0.0022 * M]}><planeGeometry args={[0.005 * M, 0.23 * M]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
  </group>
}

/** 通风橱：白色的钢柜，台面是深色的，两边侧板，上面是排风罩和接到顶棚的风管；前面一扇推拉玻璃门，开到一半。原点在台面前沿正中 */
export function FumeHood({ w = 1.5, sash = 0.62 }: { w?: number; sash?: number }) {
  const W = w * M, D = 0.8 * M, top = 1.5 * M, white = '#eceeec'
  const paint = <meshPhysicalMaterial color={white} roughness={0.42} clearcoat={0.3} />
  return <group>
    {/* 下柜和台面 */}
    <RoundedBox args={[W, 0.82 * M, D]} radius={0.04} position={[0, -0.43 * M, -D / 2]} castShadow receiveShadow>{paint}</RoundedBox>
    {[-1, 1].map(s => <mesh key={s} position={[s * W / 4, -0.38 * M, 0.012]}><boxGeometry args={[W / 2 - 0.2, 0.68 * M, 0.04]} /><meshStandardMaterial color="#e2e4e2" roughness={0.5} /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.18, -0.12 * M, 0.06]}><boxGeometry args={[0.12, 0.5, 0.08]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    <mesh position={[0, -0.015 * M, -D / 2]} receiveShadow><boxGeometry args={[W + 0.04, 0.03 * M, D + 0.04]} /><meshStandardMaterial color="#25292d" roughness={0.4} /></mesh>
    {/* 两边的侧板、后板、顶上的排风罩 */}
    {[-1, 1].map(s => <RoundedBox key={s} args={[0.08 * M, top, D]} radius={0.05} position={[s * (W / 2 - 0.04 * M), top / 2, -D / 2]} castShadow receiveShadow>{paint}</RoundedBox>)}
    <mesh position={[0, top / 2, -D + 0.06]} receiveShadow><boxGeometry args={[W, top, 0.12]} /><meshStandardMaterial color="#dfe2e0" roughness={0.7} /></mesh>
    <RoundedBox args={[W, 0.36 * M, D]} radius={0.06} position={[0, top + 0.18 * M, -D / 2]} castShadow>{paint}</RoundedBox>
    <mesh position={[0, top + 0.6 * M, -D / 2]}><cylinderGeometry args={[0.13 * M, 0.13 * M, 0.5 * M, 28]} /><Metal kind="aluminum" grain="brushed" rough={0.5} /></mesh>
    {/* 橱里顶上的一条灯 */}
    <mesh position={[0, top - 0.02, -D / 2]} rotation-x={Math.PI / 2}><planeGeometry args={[W - 1.2, 0.3]} /><meshBasicMaterial color="#fffaf0" toneMapped={false} /></mesh>
    {/* 推拉门：铝框加一块玻璃，开到一半 */}
    <group position={[0, top * sash, 0.05]}>
      <mesh position={[0, top * 0.38, 0]} renderOrder={8}><boxGeometry args={[W - 0.8, top * 0.74, 0.03]} /><Glass opacity={0.12} /></mesh>
      <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[W - 0.6, 0.12, 0.1]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[0, top * 0.76, 0]}><boxGeometry args={[W - 0.6, 0.1, 0.08]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    </group>
    {/* 右侧的风量表 */}
    <mesh position={[W / 2 - 0.04 * M, top * 0.5, 0.01]}><boxGeometry args={[0.3, 0.5, 0.04]} /><meshStandardMaterial color="#1c2024" /></mesh>
  </group>
}

// ---------- 手套 ----------
const FINGER = (() => { const c = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -1.3, 1.1], [0, -2.5, 0.6], [0, -2.8, -0.9], [0, -2.1, -1.9]].map(p => new THREE.Vector3(p[0], p[1], p[2]))); return new THREE.TubeGeometry(c, 20, 0.9, 10) })()
/**
 * 一只握着东西的手：手套、袖口、一截袖子往手腕方向伸出去，末端淡出（看得出是一个人伸手过来）。
 * 握着的东西从拳心穿过，拳心在原点；手腕朝 +y，手背朝 −z。s 是大小（拳头宽约 9 cm 时 s = 0.009 * M）。
 * lab：实验厅里的蓝色丁腈手套和白大褂；fire：训练场上的消防手套和战斗服
 */
export function Glove({ s = 0.0068 * M, kind = 'lab' }: { s?: number; kind?: 'lab' | 'fire' }) {
  const glove = kind === 'lab' ? <meshStandardMaterial color="#4f7fc8" roughness={0.55} /> : <meshStandardMaterial color="#3a3530" roughness={0.9} />
  const sleeve = kind === 'lab' ? '#cfd0cb' : '#2b3a4c', L = kind === 'lab' ? 10 : 34   // 袖子露出多长：实验台上镜头近，短一点
  return <group scale={s}><group position={[0, -0.2, -0.9]}>
    <RoundedBox args={[8.4, 7.4, 6.2]} radius={2.4} smoothness={3} position={[0, 4.6, -0.8]} castShadow>{glove}</RoundedBox>
    {[-2.9, -0.95, 0.95, 2.9].map((x, i) => <mesh key={x} geometry={FINGER} position={[x, 1.6, 1.4]} scale={[1, 0.95 - Math.abs(i - 1.5) * 0.06, 1]} castShadow>{glove}</mesh>)}
    <mesh position={[4.2, 1.8, 1.6]} rotation={[0.5, 0, 0.9]} castShadow><capsuleGeometry args={[1.05, 3.2, 6, 12]} />{glove}</mesh>
    <mesh position={[0, 9.4, -0.8]} castShadow><cylinderGeometry args={[4.5, 4.2, 4, 24]} />{kind === 'fire' ? <meshStandardMaterial color="#3a3530" roughness={0.9} /> : glove}</mesh>
    <mesh position={[0, 11.4 + L / 2, -0.8]} castShadow><cylinderGeometry args={[5.2, 4.6, L, 24, 1, true]} /><meshStandardMaterial color={sleeve} roughness={0.85} side={THREE.DoubleSide} /></mesh>
    {kind === 'fire' && [16, 20].map(y => <mesh key={y} position={[0, y, -0.8]}><cylinderGeometry args={[5.4 + (y - 12) * 0.045, 5.3 + (y - 12) * 0.045, 1.3, 24]} /><meshStandardMaterial color="#d8e04a" emissive="#5a5e10" emissiveIntensity={0.4} roughness={0.4} /></mesh>)}
    <mesh position={[0, 11.4 + L + 4, -0.8]}><cylinderGeometry args={[5.4, 5.2, 8, 24, 1, true]} /><meshStandardMaterial color={sleeve} roughness={0.85} transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group></group>
}

// ---------- 粉尘爆炸罐 ----------
/** 半个筒（剖开朝着镜头的那一半拿掉）：外半径 r、壁厚 t、高 h。切口用两条窄板补上，看得出壁厚 */
function HalfCan({ r, t, h, children }: { r: number; t: number; h: number; children: ReactNode }) {
  const g = useMemo(() => {
    const pts = [new THREE.Vector2(r - t, 0), new THREE.Vector2(r, 0), new THREE.Vector2(r, h), new THREE.Vector2(r - t, h), new THREE.Vector2(r - t, 0)]
    return new THREE.LatheGeometry(pts, 32, Math.PI / 2, Math.PI)
  }, [r, t, h])
  return <>
    <mesh geometry={g} castShadow receiveShadow>{children}</mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (r - t / 2), h / 2, 0]}><boxGeometry args={[t, h, 0.004]} />{children}</mesh>)}
  </>
}
/** 粉尘爆炸的装置：剖开的铁皮罐，罐底中间一只小漏斗盛着面粉，一根胶管从罐底接出来到皮老虎；罐盖另外画（它会被掀飞） */
export const CAN = { r: 0.075, h: 0.2 }
export function DustCan() {
  const R = CAN.r * M, H = CAN.h * M
  const funnel = useMemo(() => shell(m([[0.004, 0], [0.004, 0.01], [0.022, 0.03]]), 0.0012 * M, { segs: 28 }), [])
  return <group>
    <HalfCan r={R} t={0.0016 * M} h={H}><meshStandardMaterial color="#c9ccce" metalness={1} roughness={0.38} envMapIntensity={1.4} side={THREE.DoubleSide} /></HalfCan>
    {/* 罐底：一块圆铁皮，边上一道压出来的凸棱 */}
    <mesh geometry={useMemo(() => disc(R, 0.004 * M), [R])}><Metal kind="zinc" grain="brushed" /></mesh>
    <mesh position={[0, H * 0.04, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[R * 0.96, 0.0018 * M, 6, 40, Math.PI]} /><Metal kind="zinc" /></mesh>
    {/* 漏斗和面粉 */}
    <mesh geometry={funnel} position={[0, 0.004 * M, 0]}><Metal kind="aluminum" grain="turned" /></mesh>
  </group>
}
/** 一小堆面粉：漏斗里的一撮白粉 */
export function FlourHeap({ s = 1 }: { s?: number }) {
  return <mesh scale={[1, 0.55 * s, 1]}><sphereGeometry args={[0.016 * M, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f4efe2" roughness={1} /></mesh>
}
/** 皮老虎（打气用的橡皮球）：黑色的橡皮球，一头接胶管。原点在球心；squeeze 0–1 捏扁的程度 */
export function Bulb({ squeeze = 0 }: { squeeze?: number }) {
  return <group>
    <mesh scale={[1 + squeeze * 0.25, 1 - squeeze * 0.45, 1 + squeeze * 0.25]} castShadow><sphereGeometry args={[0.03 * M, 28, 20]} /><meshStandardMaterial color="#1d1e20" roughness={0.6} /></mesh>
    <mesh position={[0.036 * M, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.007 * M, 0.009 * M, 0.02 * M, 14]} /><meshStandardMaterial color="#1d1e20" roughness={0.6} /></mesh>
  </group>
}
/** 一段胶管：沿几个点弯过去的红色橡胶管 */
export function Hose({ pts, r = 0.003 * M, color = '#9b3a2c' }: { pts: V3[]; r?: number; color?: string }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 48, r, 10), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} castShadow><meshStandardMaterial color={color} roughness={0.6} /></mesh>
}

/** 安全标志牌：一块铝板，上面印着标志；hi 为真时外圈一道亮框 */
export function SafetySign({ k, hi = false, w = 0.26 * M }: { k: Sign; hi?: boolean; w?: number }) {
  const t = makeSafetySign(k), h = w * 1.25
  return <group>
    <mesh position={[0, 0, -0.02]} castShadow><boxGeometry args={[w + 0.06, h + 0.06, 0.03]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh><planeGeometry args={[w, h]} /><meshStandardMaterial map={t} roughness={0.6} /></mesh>
    {hi && <mesh position={[0, 0, -0.03]}><planeGeometry args={[w + 0.36, h + 0.36]} /><meshBasicMaterial color="#35c7b3" toneMapped={false} /></mesh>}
  </group>
}
