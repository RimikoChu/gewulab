// 化验台上的器材：烧杯、试管和试管架、橡胶塞、导管、酒精灯、酒精喷灯、铁架台和夹子、硬质玻璃管、坩埚钳、手套，
// 以及几样金属样品（镁条、铜丝、铁钉、锌粒、铝块、黄铜片）。尺寸都按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里（多半是底面正中）。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Metal, disc, lathe, shell, type MetalName, type RY } from '@/lab-kit'
import { M, type V3 } from './world'
import { bottleLabel } from './mats'

export const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
export const memo = <K, T>(f: (k: K) => T) => { const c = new Map<K, T>(); return (k: K) => { if (!c.has(k)) c.set(k, f(k)); return c.get(k)! } }

/** 玻璃：容器里还要画东西，用便宜的做法（半透明、不写深度、双面），底色压暗，反光调亮 */
/** 只画正面：壳体是闭合的实体（外壁、内壁、管口），正面就已经有两层，管壁边缘自然更浓，看得出厚度；中间透亮，里面的液体和金属看得见 */
export const Glass = ({ tint = '#d3e6e8', opacity = 0.15 }: { tint?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={tint} transparent opacity={Math.min(0.32, opacity * 0.6)} roughness={0.02} metalness={0} clearcoat={1} clearcoatRoughness={0.02} specularIntensity={1} envMapIntensity={2.4} depthWrite={false} side={THREE.FrontSide} />
/** 溶液：颜色和透明度 */
export const Liquid = ({ color = '#d7eef2', opacity = 0.35 }: { color?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.06} clearcoat={0.6} envMapIntensity={0.8} depthWrite={false} />

/** 几种溶液的颜色 */
export const SOL = {
  water: { color: '#d4ecf2', opacity: 0.28 },
  acid: { color: '#e2f1f3', opacity: 0.3 },           // 稀盐酸：无色透明
  cuso4: { color: '#2f86d6', opacity: 0.72 },         // 硫酸铜：蓝色
  feso4: { color: '#a9d6a2', opacity: 0.5 },          // 硫酸亚铁：浅绿色
  fecl2: { color: '#b8dcae', opacity: 0.42 },         // 氯化亚铁：浅绿色
  agno3: { color: '#e6f1f2', opacity: 0.3 },          // 硝酸银：无色
  cuno3: { color: '#3d8fd8', opacity: 0.6 },          // 硝酸铜：蓝色
  al2so4: { color: '#e6f1f2', opacity: 0.3 },         // 硫酸铝：无色
  lime: { color: '#eef3f2', opacity: 0.28 },          // 澄清石灰水
  limeMilk: { color: '#f2f2ec', opacity: 0.92 },      // 浑浊的石灰水
  oil: { color: '#e8c35a', opacity: 0.75 },           // 植物油
}
/** 两种溶液颜色之间按 k 过渡 */
export function mixSol(a: { color: string; opacity: number }, b: { color: string; opacity: number }, k: number) {
  const c = new THREE.Color(a.color).lerp(new THREE.Color(b.color), Math.max(0, Math.min(1, k)))
  return { color: `#${c.getHexString()}`, opacity: a.opacity + (b.opacity - a.opacity) * k }
}

// ---------- 烧杯 ----------
export const BEAKER = { 100: { r: 0.026, h: 0.07 }, 250: { r: 0.035, h: 0.095 } } as const
export type Vol = keyof typeof BEAKER
const beakerGeo = memo((vol: Vol) => {
  const { r, h } = BEAKER[vol]
  return shell(m([[0, 0], [r - 0.004, 0], [r, 0.004], [r, h - 0.004], [r + 0.0018, h - 0.0008], [r + 0.0024, h]]), 0.0018 * M, { segs: 56 })
})
/** 一只烧杯，原点在杯底正中。fill 盛了多少（0–1）；sol 溶液的颜色 */
export function Beaker({ vol, fill = 0, sol = SOL.water, children }: { vol: Vol; fill?: number; sol?: { color: string; opacity: number }; children?: ReactNode }) {
  const { r, h } = BEAKER[vol], R = r * M, H = h * M, wall = 0.0018 * M
  return <group>
    <mesh geometry={beakerGeo(vol)} renderOrder={6}><Glass /></mesh>
    {[0.3, 0.45, 0.6, 0.75].map((q, i) => <mesh key={q} position={[0, H * q, 0]} rotation-y={-0.5}><cylinderGeometry args={[R + 0.003, R + 0.003, 0.008, 24, 1, true, 0, i % 2 ? 0.3 : 0.5]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    {fill > 0.01 && <group position-y={wall}>
      <mesh position-y={(H * fill - wall) / 2} renderOrder={5}><cylinderGeometry args={[R - wall - 0.002, R - wall - 0.002, H * fill - wall, 40]} /><Liquid {...sol} /></mesh>
      <mesh position-y={H * fill - wall + 0.001} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[R - wall - 0.002, 40]} /><meshPhysicalMaterial color={sol.color} transparent opacity={Math.min(0.9, sol.opacity + 0.12)} roughness={0.04} clearcoat={0.8} depthWrite={false} /></mesh>
    </group>}
    {children}
  </group>
}

// ---------- 试管 ----------
/** 试管：直径 15 mm、长 15 cm，圆底。原点在管底，沿 y 朝上 */
export const TUBE = { r: 0.0075, h: 0.15, wall: 0.0009 }
const tubeGeo = memo((big: boolean) => {
  const r = big ? 0.0105 : TUBE.r, h = big ? 0.2 : TUBE.h, pts: RY[] = []
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push([Math.sin(a) * r, r - Math.cos(a) * r]) }
  pts.push([r, h - 0.0012], [r + 0.0012, h - 0.0004], [r + 0.0012, h])
  return shell(m(pts), TUBE.wall * M, { segs: 32, crease: 50 })
})
/** 一段装在圆底管里的液体：底下半球、上面圆柱 */
function TubeLiquid({ r, h, sol }: { r: number; h: number; sol: { color: string; opacity: number } }) {
  if (h < 0.002) return null
  return <>
    <mesh position-y={r} renderOrder={5}><sphereGeometry args={[r * 0.98, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><Liquid {...sol} /></mesh>
    {h > r && <mesh position-y={r + (h - r) / 2} renderOrder={5}><cylinderGeometry args={[r * 0.98, r * 0.98, h - r, 20]} /><Liquid {...sol} /></mesh>}
    <mesh position-y={Math.max(h, r * 0.4)} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r * 0.98, 20]} /><meshPhysicalMaterial color={sol.color} transparent opacity={Math.min(0.9, sol.opacity + 0.15)} roughness={0.04} clearcoat={0.8} depthWrite={false} /></mesh>
  </>
}
/** 一支试管。fill 液面高度（m，从管底算）；sol 溶液；big 是大号试管（直径 21 mm、长 20 cm）；layer 液面上另一层（油）的厚度 */
export function TestTube({ fill = 0, sol = SOL.water, big = false, layer = 0, layerSol = SOL.oil, children }: { fill?: number; sol?: { color: string; opacity: number }; big?: boolean; layer?: number; layerSol?: { color: string; opacity: number }; children?: ReactNode }) {
  const r = ((big ? 0.0105 : TUBE.r) - TUBE.wall) * M
  return <group>
    <mesh geometry={tubeGeo(big)} renderOrder={7}><Glass opacity={0.2} /></mesh>
    <TubeLiquid r={r} h={fill * M} sol={sol} />
    {layer > 0 && <mesh position-y={(fill + layer / 2) * M} renderOrder={5}><cylinderGeometry args={[r * 0.98, r * 0.98, layer * M, 20]} /><Liquid {...layerSol} /></mesh>}
    {children}
  </group>
}
/** 试管的内半径（画面单位） */
export const tubeIn = (big = false) => ((big ? 0.0105 : TUBE.r) - TUBE.wall) * M
/** 橡胶塞：上大下小的圆台，原点在下底面。hole 打一个孔（插导管用） */
export function Stopper({ r = 0.0082, h = 0.02, hole = false }: { r?: number; h?: number; hole?: boolean }) {
  const g = useMemo(() => lathe(m([[hole ? 0.0025 : 0, 0], [r * 0.82, 0], [r * 0.86, 0.0012], [r, h - 0.0015], [r - 0.0012, h], [hole ? 0.0025 : 0, h]]), { segs: 32, closed: hole }), [r, h, hole])
  return <mesh geometry={g} castShadow><meshStandardMaterial color="#3a3634" roughness={0.75} /></mesh>
}
/** 试管架：木头的，两层板，上层一排孔。原点在底面正中，n 个孔沿 x 排开，孔距 gap（m） */
export function TubeRack({ n = 4, gap = 0.035, big = false }: { n?: number; gap?: number; big?: boolean }) {
  const L = (n * gap + 0.02) * M, D = 0.045 * M, wood = <meshStandardMaterial color="#c49a64" roughness={0.72} />
  const top = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-L / 2, -D / 2); s.lineTo(L / 2, -D / 2); s.lineTo(L / 2, D / 2); s.lineTo(-L / 2, D / 2); s.closePath()
    for (let i = 0; i < n; i++) { const h = new THREE.Path(); h.absarc((i - (n - 1) / 2) * gap * M, 0, ((big ? 0.0105 : TUBE.r) + 0.0016) * M, 0, Math.PI * 2, true); s.holes.push(h) }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.008 * M, bevelEnabled: true, bevelSize: 0.001 * M, bevelThickness: 0.001 * M, bevelSegments: 2 }); g.rotateX(-Math.PI / 2)
    return g
  }, [L, D, n, gap, big])
  return <group>
    <RoundedBox args={[L, 0.008 * M, D + 0.01 * M]} radius={0.002 * M} position-y={0.004 * M} castShadow receiveShadow>{wood}</RoundedBox>
    {[-1, 1].map(s => <RoundedBox key={s} args={[0.01 * M, 0.08 * M, D]} radius={0.002 * M} position={[s * (L / 2 - 0.005 * M), 0.044 * M, 0]} castShadow>{wood}</RoundedBox>)}
    <mesh geometry={top} position-y={0.07 * M} castShadow receiveShadow>{wood}</mesh>
  </group>
}

/** 一段玻璃导管或胶管：沿几个点弯过去（画面单位） */
export function Pipe({ pts, r = 0.0032 * M, glass = true, color = '#6a2e26' }: { pts: V3[]; r?: number; glass?: boolean; color?: string }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.1), 64, r, 12), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={g} castShadow={!glass} renderOrder={glass ? 7 : 0}>{glass ? <meshPhysicalMaterial color="#d6e8ea" transparent opacity={0.26} roughness={0.02} clearcoat={1} envMapIntensity={2.4} depthWrite={false} /> : <meshStandardMaterial color={color} roughness={0.55} />}</mesh>
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

// ---------- 酒精灯 ----------
/** 灯芯顶端的高度（m） */
export const LAMP_TOP = 0.098
/** 酒精灯：玻璃灯身、瓷灯芯管、棉灯芯。cap 盖着灯帽。原点在灯底正中 */
export function AlcoholLamp({ cap = false }: { cap?: boolean }) {
  const g = useMemo(() => ({
    body: shell(m([[0, 0], [0.036, 0], [0.04, 0.004], [0.042, 0.02], [0.04, 0.04], [0.032, 0.056], [0.018, 0.066], [0.013, 0.07], [0.013, 0.078]]), 0.0022 * M, { segs: 48 }),
    holder: lathe(m([[0, 0.074], [0.016, 0.074], [0.017, 0.078], [0.009, 0.082], [0.0065, 0.09], [0.0055, 0.09], [0.0055, 0.074]]), { segs: 28 }),
    cap: shell(m([[0, 0.112], [0.008, 0.111], [0.013, 0.104], [0.0165, 0.09], [0.0175, 0.074]]).reverse() as RY[], 0.0016 * M, { segs: 32 }),
  }), [])
  return <group>
    <mesh geometry={g.body} renderOrder={6}><Glass opacity={0.2} /></mesh>
    <mesh position={[0, 0.018 * M, 0]} renderOrder={5}><cylinderGeometry args={[0.038 * M, 0.034 * M, 0.034 * M, 40]} /><meshStandardMaterial color="#b8c9cc" transparent opacity={0.3} roughness={0.3} depthWrite={false} /></mesh>
    <mesh geometry={g.holder} castShadow><meshStandardMaterial color="#ecebe5" roughness={0.3} /></mesh>
    <mesh position={[0, 0.06 * M, 0]}><cylinderGeometry args={[0.0028 * M, 0.0028 * M, 0.08 * M, 10]} /><meshStandardMaterial color="#f1ede2" roughness={1} /></mesh>
    <mesh position={[0, 0.097 * M, 0]}><cylinderGeometry args={[0.0026 * M, 0.003 * M, 0.004 * M, 10]} /><meshStandardMaterial color="#2a241e" roughness={1} /></mesh>
    {cap && <mesh geometry={g.cap} renderOrder={6}><Glass opacity={0.3} /></mesh>}
  </group>
}

/** 酒精喷灯（座式）：黄铜的储液壶，壶上一根竖的灯管，灯管下部一圈预热盘，侧面一只调节手轮。原点在底面正中，火焰从 TORCH_TOP 喷出 */
export const TORCH_TOP = 0.26
export function SpiritTorch() {
  const g = useMemo(() => ({
    pot: lathe(m([[0, 0], [0.05, 0], [0.054, 0.004], [0.056, 0.03], [0.05, 0.05], [0.03, 0.064], [0.016, 0.068], [0, 0.068]]), { segs: 48 }),
    tube: lathe(m([[0, 0.068], [0.011, 0.068], [0.011, 0.07], [0.009, 0.075], [0.009, TORCH_TOP - 0.012], [0.0105, TORCH_TOP - 0.008], [0.0105, TORCH_TOP], [0, TORCH_TOP]]), { segs: 28 }),
    dish: disc(0.026 * M, 0.006 * M, { hole: 0.009 * M }),
  }), [])
  return <group>
    <mesh geometry={g.pot} castShadow receiveShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh geometry={g.tube} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh geometry={g.dish} position-y={0.12 * M} castShadow><Metal kind="brass" /></mesh>
    {/* 加注口的螺帽、调节手轮 */}
    <mesh position={[0.03 * M, 0.066 * M, 0.02 * M]}><cylinderGeometry args={[0.008 * M, 0.008 * M, 0.01 * M, 6]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[0.026 * M, 0.17 * M, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0025 * M, 0.0025 * M, 0.03 * M, 10]} /><Metal kind="steel" /></mesh>
    <mesh position={[0.043 * M, 0.17 * M, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.011 * M, 0.011 * M, 0.005 * M, 24]} /><meshStandardMaterial color="#1f2124" roughness={0.5} /></mesh>
    {/* 灯管顶上的空气调节孔：一圈深色的小孔 */}
    {[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.cos(i * 1.57) * 0.0092 * M, 0.2 * M, Math.sin(i * 1.57) * 0.0092 * M]} rotation-y={-i * 1.57}><boxGeometry args={[0.0004 * M, 0.008 * M, 0.004 * M]} /><meshStandardMaterial color="#1b1712" /></mesh>)}
  </group>
}

// ---------- 铁架台 ----------
/** 铁架台：铸铁底座、立杆。原点在底座底面正中；立杆在底座后部（−z），高 rodH（m） */
export function IronStand({ rodH = 0.5, children }: { rodH?: number; children?: ReactNode }) {
  const rodZ = -0.06 * M
  return <group>
    <RoundedBox args={[0.14 * M, 0.016 * M, 0.22 * M]} radius={0.006 * M} smoothness={3} position={[0, 0.008 * M, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[0, rodH * M / 2, rodZ]} castShadow><cylinderGeometry args={[0.0055 * M, 0.0055 * M, rodH * M, 20]} /><Metal kind="chrome" rough={0.12} /></mesh>
    <mesh position={[0, 0.018 * M, rodZ]}><cylinderGeometry args={[0.011 * M, 0.013 * M, 0.006 * M, 20]} /><Metal kind="steel" grain="turned" /></mesh>
    <group position-z={rodZ}>{children}</group>
  </group>
}
/** 铁夹：从立杆伸出的夹臂（沿 +z），前端两片垫软木的夹口。原点在立杆上的双顶丝，夹口中心在 (0, 0, len)。tilt 绕 x 轴转夹口 */
export function Clamp({ len = 0.1, open = 0.012, yaw = 0 }: { len?: number; open?: number; yaw?: number }) {
  return <group rotation-y={yaw}>
    <RoundedBox args={[0.022 * M, 0.024 * M, 0.022 * M]} radius={0.003 * M} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    <mesh position={[0.016 * M, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0035 * M, 0.0035 * M, 0.014 * M, 10]} /><Metal kind="steel" /></mesh>
    <mesh position={[0.025 * M, 0, 0]}><sphereGeometry args={[0.005 * M, 12, 10]} /><Metal kind="iron" grain="cast" /></mesh>
    <mesh position={[0, 0, len * M / 2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.003 * M, 0.003 * M, len * M, 10]} /><Metal kind="steel" /></mesh>
    {[-1, 1].map(s => <group key={s}>
      <RoundedBox args={[0.006 * M, 0.02 * M, 0.024 * M]} radius={0.002 * M} position={[s * (open * M + 0.003 * M), 0, len * M]}><Metal kind="aluminum" grain="cast" /></RoundedBox>
      <mesh position={[s * open * M, 0, len * M]}><boxGeometry args={[0.002 * M, 0.018 * M, 0.02 * M]} /><meshStandardMaterial color="#b58a5a" roughness={1} /></mesh>
    </group>)}
  </group>
}

// ---------- 坩埚钳 ----------
/** 坩埚钳：两片弯臂的不锈钢钳子，钳口在原点，柄沿 +x 伸出去 0.2 m */
export function Tongs() {
  const arm = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0, 0], [0.02, 0.006, 0], [0.06, 0.016, 0], [0.12, 0.02, 0], [0.2, 0.018, 0]].map(p => new THREE.Vector3(p[0] * M, p[1] * M, p[2] * M))), 32, 0.0022 * M, 8), [])
  return <group>
    {[-1, 1].map(s => <group key={s} position-z={s * 0.0028 * M} rotation-y={s * 0.035}><mesh geometry={arm} castShadow><Metal kind="stainless" grain="brushed" /></mesh></group>)}
    <mesh position={[0.07 * M, 0.017 * M, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.0035 * M, 0.0035 * M, 0.012 * M, 12]} /><Metal kind="steel" /></mesh>
  </group>
}

// ---------- 金属样品 ----------
/** 一种金属的颜色，用在样块、金属丝上 */
export const METAL_LOOK: Record<string, { kind: MetalName; rough?: number }> = {
  Mg: { kind: 'aluminum', rough: 0.45 }, Al: { kind: 'aluminum', rough: 0.3 }, Zn: { kind: 'zinc' }, Fe: { kind: 'steel', rough: 0.42 },
  Cu: { kind: 'copper' }, Ag: { kind: 'chrome', rough: 0.14 }, Au: { kind: 'brass', rough: 0.18 },
}
/** 一段金属丝：沿几个点弯过去（画面单位）。kind 金属材质；coat 外面再包一层颜色（析出的铜、生成的银、变黑的氧化铜），coatK 包了多少 */
export function Wire({ pts, r = 0.0007 * M, kind = 'copper', rough, coat, coatK = 0 }: { pts: V3[]; r?: number; kind?: MetalName; rough?: number; coat?: string; coatK?: number }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 80, r, 8), [JSON.stringify(pts), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <mesh geometry={g} castShadow><Metal kind={kind} rough={rough} /></mesh>
    {coat && coatK > 0.02 && <mesh geometry={g} scale={1} renderOrder={1}><meshStandardMaterial color={coat} roughness={0.85} transparent opacity={Math.min(1, coatK * 1.2)} polygonOffset polygonOffsetFactor={-2} /></mesh>}
  </>
}
/** 一圈一圈的螺旋：金属丝绕成的线圈（在试管里增大接触面积）。原点在线圈下端，沿 +y */
export function coilPts(r: number, h: number, turns: number, lead: number): V3[] {
  const pts: V3[] = [], n = Math.round(turns * 24)
  for (let i = 0; i <= n; i++) { const a = i / 24 * Math.PI * 2; pts.push([Math.cos(a) * r, i / n * h, Math.sin(a) * r]) }
  pts.push([r, h + lead * 0.4, 0], [r * 0.3, h + lead, 0])
  return pts
}

/** 铁钉：钉帽、钉身、钉尖。原点在钉尖，沿 +y，长 0.05 m。rust 0–1 生锈的程度，rustBand：只在 [a, b]（m）这一段生锈；guard 表面的防护层 */
export function Nail({ rust = 0, band = [0, 0.05], guard }: { rust?: number; band?: [number, number]; guard?: 'paint' | 'oil' | 'zinc' }) {
  const g = useMemo(() => lathe(m([[0, 0], [0.0016, 0.006], [0.0016, 0.047], [0.004, 0.0475], [0.004, 0.05], [0, 0.05]]), { segs: 20 }), [])
  const [a, b] = band
  return <group>
    <mesh geometry={g} castShadow>{guard === 'paint' ? <meshPhysicalMaterial color="#2b5f86" roughness={0.32} clearcoat={0.6} clearcoatRoughness={0.2} /> : guard === 'zinc' ? <Metal kind="zinc" grain="cast" /> : <Metal kind="steel" grain="brushed" rough={guard === 'oil' ? 0.12 : 0.35} />}</mesh>
    {guard === 'oil' && <mesh geometry={g} scale={[1.08, 1.002, 1.08]} renderOrder={4}><meshPhysicalMaterial color="#e4c060" transparent opacity={0.28} roughness={0.02} clearcoat={1} depthWrite={false} /></mesh>}
    {/* 锈：一截红褐色的疏松外层，在规定的那一段 */}
    {rust > 0.02 && <mesh position-y={(a + b) / 2 * M} renderOrder={2}><cylinderGeometry args={[(0.0017 + 0.0006 * rust) * M, (0.0017 + 0.0006 * rust) * M, (b - a) * M, 16, 4]} /><meshStandardMaterial color="#8a3d17" roughness={1} transparent opacity={Math.min(1, rust * 1.3)} /></mesh>}
    {rust > 0.3 && [0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[Math.cos(i * 1.9) * 0.0021 * M, (a + (b - a) * ((i * 0.37) % 1)) * M, Math.sin(i * 1.9) * 0.0021 * M]} scale={[1, 0.7, 1]}><sphereGeometry args={[0.0008 * M * rust, 8, 6]} /><meshStandardMaterial color={i % 2 ? '#a24b1c' : '#6f2f12'} roughness={1} /></mesh>)}
  </group>
}

/** 带标签的试剂瓶（细口瓶）：玻璃瓶身、塞子，里面盛着溶液。原点在瓶底正中 */
export function ReagentBottle({ label, sol = SOL.water, brown = false, band }: { label: string; sol?: { color: string; opacity: number }; brown?: boolean; band?: string }) {
  const g = useMemo(() => shell(m([[0, 0], [0.027, 0], [0.03, 0.004], [0.03, 0.07], [0.02, 0.085], [0.011, 0.09], [0.011, 0.1]]), 0.0022 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass tint={brown ? '#4a2810' : undefined} opacity={brown ? 0.55 : 0.22} /></mesh>
    <mesh position-y={0.035 * M} renderOrder={5}><cylinderGeometry args={[0.027 * M, 0.027 * M, 0.062 * M, 32]} /><Liquid {...sol} /></mesh>
    <mesh position={[0, 0.042 * M, 0]} rotation-y={0.2}><cylinderGeometry args={[0.0305 * M, 0.0305 * M, 0.03 * M, 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    <mesh position-y={0.104 * M}><cylinderGeometry args={[0.0118 * M, 0.0098 * M, 0.014 * M, 20]} /><Glass opacity={0.45} /></mesh>
    <mesh position-y={0.113 * M}><cylinderGeometry args={[0.014 * M, 0.014 * M, 0.006 * M, 20]} /><Glass opacity={0.45} /></mesh>
  </group>
}
