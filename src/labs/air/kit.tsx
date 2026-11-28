// 这一间专用的器材：玻璃钟罩和水槽、燃烧匙、电子天平、盛液氧的玻璃杜瓦瓶、台式通风橱、坩埚钳、绕成螺旋的铁丝、
// 制氧用的大试管、过滤架、烘箱、药匙。尺寸都按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Led, Metal, disc, lathe, shell, type RY } from '@/lab-kit'
import { Glass, LiquidBody, m, memo } from './gear'
import { M } from './world'

const u = (v: number) => v * M

// ---------- 钟罩、水槽、燃烧匙 ----------
/** 钟罩：内截面积 200 cm²（内半径 7.98 cm），直筒高 BELL_H，上面收成肩和一段瓶口。底下敞口。原点在罩底正中，瓶口在 BELL_TOP */
export const BELL_R = 0.0798, BELL_H = 0.59, BELL_TOP = 0.675
const bellGeo = memo((_: number) => shell(m([[BELL_R + 0.004, 0], [BELL_R + 0.004, BELL_H], [BELL_R - 0.006, BELL_H + 0.026], [0.05, BELL_H + 0.05], [0.028, BELL_H + 0.06], [0.024, BELL_H + 0.066], [0.024, BELL_TOP - 0.004], [0.027, BELL_TOP]]), u(0.004), { segs: 64 }))
export function BellJar({ children }: { children?: ReactNode }) {
  return <group>
    <mesh geometry={bellGeo(0)} renderOrder={7}><Glass opacity={0.17} /></mesh>
    {/* 罩底磨砂的一圈 */}
    <mesh position-y={u(0.004)}><cylinderGeometry args={[u(BELL_R + 0.0045), u(BELL_R + 0.0045), u(0.008), 48, 1, true]} /><meshStandardMaterial color="#e6ecec" roughness={0.9} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    {children}
  </group>
}
/** 钟罩外壁的一道刻度线（白色的细环，朝镜头的一段），y 是离罩底的高度（m） */
export function BellMark({ y, long = false }: { y: number; long?: boolean }) {
  return <mesh position-y={u(y)} rotation-y={-Math.PI / 2 - (long ? 0.55 : 0.3)}><cylinderGeometry args={[u(BELL_R + 0.0046), u(BELL_R + 0.0046), u(0.0045), 40, 1, true, 0, long ? 1.4 : 0.8]} /><meshBasicMaterial color="#ffffff" transparent opacity={1} side={THREE.DoubleSide} depthWrite={false} /></mesh>
}
/** 圆形玻璃水槽：内半径 16 cm（水面 800 cm²）、高 13 cm，厚壁，口沿外翻。原点在槽底正中 */
export const TROUGH_R = 0.16, TROUGH_H = 0.13
const troughGeo = memo((_: number) => shell(m([[0, 0], [TROUGH_R - 0.004, 0], [TROUGH_R + 0.005, 0.008], [TROUGH_R + 0.005, TROUGH_H - 0.006], [TROUGH_R + 0.009, TROUGH_H - 0.002], [TROUGH_R + 0.009, TROUGH_H]]), u(0.005), { segs: 72 }))
export function Trough({ children }: { children?: ReactNode }) {
  return <group><mesh geometry={troughGeo(0)} renderOrder={8}><Glass opacity={0.14} /></mesh>{children}</group>
}
/** 一圈水（钟罩外面那一圈）：外半径 r1、内半径 r0、高 h。原点在底面正中 */
export function WaterRing({ r0, r1, h, color = '#a9d3e2' }: { r0: number; r1: number; h: number; color?: string }) {
  const g = useMemo(() => lathe([[r0, 0], [r1, 0], [r1, 1], [r0, 1]], { segs: 64, closed: true }), [r0, r1])
  if (h < 0.002) return null
  return <mesh geometry={g} scale={[1, h, 1]} renderOrder={5}><meshPhysicalMaterial color={color} transparent opacity={0.46} roughness={0.06} clearcoat={0.6} envMapIntensity={0.8} depthWrite={false} /></mesh>
}
/** 燃烧匙：一根细铁杆，下端弯出一只小铜勺。原点在勺心，杆朝 +y 伸出去 len（m） */
export function Spoon({ len = 0.3, children }: { len?: number; children?: ReactNode }) {
  const cup = useMemo(() => shell(m([[0, 0], [0.009, 0.001], [0.0125, 0.006], [0.013, 0.012]]), u(0.0012), { segs: 28 }), [])
  return <group>
    <mesh geometry={cup} position-y={-u(0.006)} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[u(0.013), u(0.012), 0]} rotation-z={-0.5}><cylinderGeometry args={[u(0.0014), u(0.0014), u(0.03), 8]} /><Metal kind="steel" /></mesh>
    <mesh position={[u(0.02), u(0.024) + u(len) / 2, 0]}><cylinderGeometry args={[u(0.0014), u(0.0014), u(len), 8]} /><Metal kind="steel" /></mesh>
    {children}
  </group>
}

// ---------- 电子天平 ----------
/** 电子天平（分度值 0.001 g）：浅灰机身，前面是读数屏和两只按键，后半边是三面玻璃的防风罩，罩里一只不锈钢秤盘。原点在底面正中，秤盘面在 PAN_Y，秤盘中心 z = PAN_Z */
export const PAN_Y = 0.074, PAN_Z = -0.045
export function Balance({ text, children }: { text: string; children?: ReactNode }) {
  const pan = useMemo(() => disc(u(0.052), u(0.004), { chamfer: u(0.001) }), [])
  const W = 0.23, D = 0.36, body = <meshPhysicalMaterial color="#e9ebea" roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} />
  const frame = <meshStandardMaterial color="#c4c9cb" roughness={0.4} metalness={0.5} />
  return <group>
    <RoundedBox args={[u(W), u(0.06), u(D)]} radius={u(0.008)} smoothness={3} position-y={u(0.032)} castShadow receiveShadow>{body}</RoundedBox>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * u(W / 2 - 0.025), u(0.002), sz * u(D / 2 - 0.03)]}><cylinderGeometry args={[u(0.012), u(0.014), u(0.004), 16]} /><meshStandardMaterial color="#2b2d30" roughness={0.7} /></mesh>))}
    {/* 前脸：斜着的读数屏、两只按键、水平泡 */}
    <group position={[0, u(0.058), u(D / 2 - 0.055)]} rotation-x={0.5}>
      <RoundedBox args={[u(W - 0.03), u(0.012), u(0.085)]} radius={u(0.004)} smoothness={2}><meshStandardMaterial color="#2a2e32" roughness={0.45} /></RoundedBox>
      <Led text={text} w={u(0.12)} h={u(0.046)} position={[-u(0.03), u(0.0065), 0]} rotation-x={-Math.PI / 2} />
      {[0.062, 0.088].map((x, i) => <mesh key={x} position={[u(x), u(0.007), 0]}><cylinderGeometry args={[u(0.009), u(0.009), u(0.003), 20]} /><meshStandardMaterial color={i ? '#3d9a7c' : '#d7d9d8'} roughness={0.5} /></mesh>)}
    </group>
    {/* 秤盘和托柱 */}
    <mesh position={[0, u(0.066), u(PAN_Z)]}><cylinderGeometry args={[u(0.008), u(0.008), u(0.01), 16]} /><Metal kind="stainless" /></mesh>
    <mesh geometry={pan} position={[0, u(PAN_Y - 0.004), u(PAN_Z)]} castShadow receiveShadow><Metal kind="stainless" grain="turned" /></mesh>
    {/* 防风罩：四根角柱、顶框、三面玻璃（朝镜头的一面敞开） */}
    {[-1, 1].flatMap(sx => [-0.155, 0.065].map(z => <mesh key={`${sx}${z}`} position={[sx * u(W / 2 - 0.008), u(0.062 + 0.12), u(z)]}><boxGeometry args={[u(0.01), u(0.24), u(0.01)]} />{frame}</mesh>))}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * u(W / 2 - 0.008), u(0.302), u(-0.045)]}><boxGeometry args={[u(0.012), u(0.012), u(0.23)]} />{frame}</mesh>)}
    {[-0.155, 0.065].map(z => <mesh key={z} position={[0, u(0.302), u(z)]}><boxGeometry args={[u(W - 0.006), u(0.012), u(0.012)]} />{frame}</mesh>)}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * u(W / 2 - 0.008), u(0.18), u(-0.045)]} renderOrder={8}><boxGeometry args={[u(0.003), u(0.23), u(0.21)]} /><Glass opacity={0.12} /></mesh>)}
    <mesh position={[0, u(0.18), u(-0.155)]} renderOrder={8}><boxGeometry args={[u(W - 0.02), u(0.23), u(0.003)]} /><Glass opacity={0.12} /></mesh>
    {children}
  </group>
}

// ---------- 杜瓦瓶 ----------
/** 透明的玻璃杜瓦瓶（演示用，没有镀银）：双层玻璃的直筒，坐在一只软木底座上。里面盛着 fill（0–1）的液体。原点在底座底面正中，瓶口在 DEWAR_TOP */
export const DEWAR_TOP = 0.3
export function Dewar({ fill = 0.6, color = '#9fd0f2', children }: { fill?: number; color?: string; children?: ReactNode }) {
  const g = useMemo(() => {
    const bowl = (r: number, y0: number, y1: number): RY[] => { const p: RY[] = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; p.push([Math.sin(a) * r, y0 + r - Math.cos(a) * r]) } p.push([r, y1]); return p }
    return {
      outer: shell(m([...bowl(0.058, 0.03, DEWAR_TOP - 0.004), [0.06, DEWAR_TOP]]), u(0.0022), { segs: 56, crease: 50 }),
      inner: shell(m(bowl(0.046, 0.045, DEWAR_TOP - 0.002)), u(0.002), { segs: 56, crease: 50 }),
      base: lathe(m([[0, 0], [0.066, 0], [0.07, 0.004], [0.07, 0.036], [0.062, 0.05], [0.052, 0.05], [0.04, 0.036], [0, 0.036]]), { segs: 48 }),
      rim: lathe(m([[0.046, DEWAR_TOP - 0.004], [0.06, DEWAR_TOP - 0.004], [0.06, DEWAR_TOP], [0.046, DEWAR_TOP]]), { segs: 48, closed: true }),
    }
  }, [])
  return <group>
    <mesh geometry={g.base} castShadow receiveShadow><meshStandardMaterial color="#8a6a48" roughness={0.9} /></mesh>
    <mesh geometry={g.inner} renderOrder={6}><Glass opacity={0.16} /></mesh>
    <group position-y={u(0.047)}><LiquidBody r={u(0.0435)} h={u((DEWAR_TOP - 0.06) * fill)} color={color} opacity={0.62} /></group>
    <mesh geometry={g.outer} renderOrder={8}><Glass opacity={0.14} /></mesh>
    <mesh geometry={g.rim} renderOrder={8}><Glass opacity={0.3} /></mesh>
    {children}
  </group>
}
/** 杜瓦瓶的盖子：一只带提钮的软木塞。原点在盖底正中 */
export function DewarLid() {
  const g = useMemo(() => lathe(m([[0, 0], [0.044, 0], [0.046, 0.004], [0.05, 0.03], [0.048, 0.034], [0.012, 0.034], [0.012, 0.044], [0.016, 0.05], [0.012, 0.056], [0, 0.056]]), { segs: 40 }), [])
  return <mesh geometry={g} castShadow><meshStandardMaterial color="#9a7a55" roughness={0.9} /></mesh>
}

// ---------- 通风橱 ----------
/** 台式通风橱：宽 1.0 m、深 0.62 m、高 0.85 m。两侧和顶是白色钢板，后面一块导流板，顶上接一截风管；前面的玻璃拉门提到上半截。原点在台面上、橱的底面正中 */
export const HOOD = { w: 1.0, d: 0.62, h: 0.85, sash: 0.47 }
export function Hood() {
  const { w, d, h, sash } = HOOD, steel = <meshPhysicalMaterial color="#e8eae8" roughness={0.45} clearcoat={0.3} clearcoatRoughness={0.5} />, dark = <meshStandardMaterial color="#3a4046" roughness={0.6} metalness={0.3} />
  return <group>
    {[-1, 1].map(s => <RoundedBox key={s} args={[u(0.03), u(h), u(d)]} radius={u(0.004)} position={[s * u(w / 2), u(h / 2), 0]} castShadow receiveShadow>{steel}</RoundedBox>)}
    <RoundedBox args={[u(w + 0.03), u(0.14), u(d)]} radius={u(0.006)} position={[0, u(h + 0.07), 0]} castShadow>{steel}</RoundedBox>
    <mesh position={[0, u(h / 2), -u(d / 2 - 0.01)]} receiveShadow><boxGeometry args={[u(w), u(h), u(0.02)]} /><meshStandardMaterial color="#d3d8d8" roughness={0.6} /></mesh>
    {/* 导流板：离后墙一点，上下各留一道缝 */}
    <mesh position={[0, u(h / 2), -u(d / 2 - 0.06)]} receiveShadow><boxGeometry args={[u(w - 0.06), u(h - 0.16), u(0.008)]} /><meshStandardMaterial color="#eef0ee" roughness={0.5} /></mesh>
    {/* 橱里的台面：一块深色的耐腐蚀板，前沿一道挡水边 */}
    <mesh position={[0, u(0.006), 0]} receiveShadow><boxGeometry args={[u(w - 0.03), u(0.012), u(d)]} /><meshPhysicalMaterial color="#2c3135" roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh position={[0, u(0.012), u(d / 2 - 0.01)]}><boxGeometry args={[u(w - 0.03), u(0.024), u(0.02)]} />{dark}</mesh>
    {/* 顶灯 */}
    <mesh position={[0, u(h - 0.004), u(0.05)]} rotation-x={Math.PI / 2}><planeGeometry args={[u(w - 0.2), u(0.12)]} /><meshBasicMaterial color="#fff6e2" toneMapped={false} /></mesh>
    {/* 玻璃拉门：提到上半截，下沿一根带拉手的横档 */}
    <mesh position={[0, u((h + sash) / 2), u(d / 2 - 0.02)]} renderOrder={9}><boxGeometry args={[u(w - 0.04), u(h - sash), u(0.006)]} /><Glass opacity={0.1} /></mesh>
    <mesh position={[0, u(sash), u(d / 2 - 0.02)]} castShadow><boxGeometry args={[u(w - 0.03), u(0.03), u(0.022)]} />{dark}</mesh>
    <mesh position={[0, u(sash), u(d / 2 - 0.002)]} rotation-z={Math.PI / 2}><cylinderGeometry args={[u(0.007), u(0.007), u(0.3), 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
    {/* 控制条：风机开关和一只绿灯 */}
    <mesh position={[u(w / 2 - 0.12), u(h + 0.07), u(d / 2 + 0.001)]}><planeGeometry args={[u(0.16), u(0.06)]} /><meshStandardMaterial color="#2a2e32" roughness={0.5} /></mesh>
    <mesh position={[u(w / 2 - 0.16), u(h + 0.07), u(d / 2 + 0.003)]}><circleGeometry args={[u(0.008), 16]} /><meshBasicMaterial color="#63e39a" toneMapped={false} /></mesh>
    {/* 风管 */}
    <mesh position={[0, u(h + 0.14 + 0.5), -u(0.08)]} castShadow><cylinderGeometry args={[u(0.1), u(0.1), u(1.0), 32]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh position={[0, u(h + 0.15), -u(0.08)]}><cylinderGeometry args={[u(0.115), u(0.115), u(0.02), 32]} /><Metal kind="steel" /></mesh>
  </group>
}

// ---------- 坩埚钳、铁丝 ----------
/** 坩埚钳：两片钢条在中间铰住，前端弯成钳口。原点在钳口夹着东西的地方，钳柄朝 +y 伸出去约 0.2 m */
export function Tongs() {
  const g = useMemo(() => [-1, 1].map(s => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[s * 0.004, 0, 0], [s * 0.012, 0.02, 0], [s * 0.006, 0.05, 0], [-s * 0.004, 0.09, 0], [-s * 0.014, 0.16, 0], [-s * 0.02, 0.19, 0], [-s * 0.012, 0.21, 0]].map(p => new THREE.Vector3(u(p[0]), u(p[1]), u(p[2])))), 40, u(0.0022), 8)), [])
  return <group>
    {g.map((x, i) => <mesh key={i} geometry={x} castShadow><Metal kind="steel" /></mesh>)}
    <mesh position={[0, u(0.07), 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.004), u(0.004), u(0.006), 12]} /><Metal kind="steel" grain="turned" /></mesh>
  </group>
}
/** 一段细铁丝，下半截绕成螺旋，末端系着一根火柴梗。原点在螺旋的下端，铁丝朝 +y 伸出去 0.24 m。hot：螺旋烧红的程度（0–1）；burnt：烧掉了多少（0–1，从下端往上） */
export function IronSpiral({ hot = 0, burnt = 0, match = true }: { hot?: number; burnt?: number; match?: boolean }) {
  const turns = 6, H = 0.07
  const g = useMemo(() => {
    const pts: THREE.Vector3[] = [], t0 = burnt * turns * Math.PI * 2
    for (let a = t0; a <= turns * Math.PI * 2; a += 0.3) pts.push(new THREE.Vector3(Math.cos(a) * u(0.006), u(H * a / (turns * Math.PI * 2)), Math.sin(a) * u(0.006)))
    pts.push(new THREE.Vector3(0, u(H + 0.01), 0), new THREE.Vector3(0, u(0.24), 0))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, u(0.0008), 6)
  }, [Math.round(burnt * 30)])   // eslint-disable-line react-hooks/exhaustive-deps
  const y0 = u(H * burnt)
  return <group>
    <mesh geometry={g} castShadow><meshStandardMaterial color="#6d7175" metalness={0.8} roughness={0.4} emissive="#ff5a1c" emissiveIntensity={hot * 1.2} /></mesh>
    {hot > 0.05 && <mesh position={[u(0.006), y0, 0]}><sphereGeometry args={[u(0.0028), 12, 10]} /><meshBasicMaterial color={new THREE.Color(4, 2.2, 0.9)} toneMapped={false} /></mesh>}
    {match && burnt < 0.02 && <mesh position={[u(0.006), -u(0.012), 0]} rotation-z={0.15}><boxGeometry args={[u(0.002), u(0.03), u(0.002)]} /><meshStandardMaterial color="#d8b47a" roughness={0.8} /></mesh>}
  </group>
}

// ---------- 制氧用的大试管 ----------
/** 大试管（直径 25 mm、长 20 cm）：管底铺着一层药品，管口一团棉花、一只单孔塞。原点在管底，沿 +y 伸到管口 BIG.h。drug：药品的颜色；spent：反应过后颜色变深的程度 */
export const BIG = { r: 0.0125, h: 0.2 }
const bigGeo = memo((_: number) => {
  const r = BIG.r, pts: RY[] = []
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push([Math.sin(a) * r, r - Math.cos(a) * r]) }
  pts.push([r, BIG.h - 0.002], [r + 0.0016, BIG.h])
  return shell(m(pts), u(0.0011), { segs: 36, crease: 50 })
})
export function BigTube({ drug = '#4a1f4e', spent = 0 }: { drug?: string; spent?: number }) {
  const col = useMemo(() => new THREE.Color(drug).lerp(new THREE.Color('#1c1a1d'), spent), [drug, spent])
  return <group>
    <mesh geometry={bigGeo(0)} renderOrder={7}><Glass opacity={0.2} /></mesh>
    {/* 药品平铺在管底（试管是斜着放的，药品铺在朝下的一侧） */}
    <mesh position={[-u(0.0055), u(0.045), 0]} scale={[0.5, 1, 1]}><capsuleGeometry args={[u(0.0105), u(0.06), 6, 14]} /><meshStandardMaterial color={col} roughness={0.95} /></mesh>
    {/* 管口的一团棉花 */}
    <mesh position-y={u(BIG.h - 0.035)} scale={[1, 1.3, 1]}><sphereGeometry args={[u(0.0108), 14, 10]} /><meshStandardMaterial color="#f4f3ee" roughness={1} /></mesh>
  </group>
}

// ---------- 过滤架、烘箱、药匙 ----------
/** 过滤：小铁架台的铁圈上架着玻璃漏斗和滤纸，下面一只小烧杯接滤液在别处画。原点在底座底面正中，漏斗的中心在 x = 0、z = FILTER_Z，漏斗口高 FILTER_TOP */
export const FILTER_Z = 0.06, FILTER_TOP = 0.2
export function FilterStand({ cake = 0 }: { cake?: number }) {
  const g = useMemo(() => ({
    funnel: shell(m([[0.004, 0.085], [0.004, 0.13], [0.006, 0.136], [0.04, FILTER_TOP - 0.002], [0.041, FILTER_TOP]]), u(0.0014), { segs: 40 }),
    paper: lathe(m([[0.003, 0.139], [0.036, 0.1965], [0.035, 0.1965], [0.002, 0.1405]]), { segs: 32, closed: true }),
  }), [])
  return <group>
    <RoundedBox args={[u(0.11), u(0.012), u(0.17)]} radius={u(0.005)} smoothness={3} position={[0, u(0.006), 0]} castShadow receiveShadow><meshStandardMaterial color="#25292d" roughness={0.45} metalness={0.4} /></RoundedBox>
    <mesh position={[0, u(0.17), -u(0.05)]} castShadow><cylinderGeometry args={[u(0.005), u(0.005), u(0.34), 16]} /><Metal kind="chrome" rough={0.12} /></mesh>
    {/* 铁圈和伸回立杆的臂 */}
    <mesh position={[0, u(0.155), u(FILTER_Z)]} rotation-x={Math.PI / 2}><torusGeometry args={[u(0.03), u(0.003), 10, 36]} /><Metal kind="iron" grain="cast" /></mesh>
    <mesh position={[0, u(0.155), u(-0.01)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.003), u(0.003), u(0.08), 10]} /><Metal kind="iron" grain="cast" /></mesh>
    <RoundedBox args={[u(0.02), u(0.024), u(0.02)]} radius={u(0.003)} position={[0, u(0.155), -u(0.05)]}><Metal kind="iron" grain="cast" /></RoundedBox>
    <group position={[0, 0, u(FILTER_Z)]}>
      <mesh geometry={g.funnel} renderOrder={7}><Glass opacity={0.22} /></mesh>
      <mesh geometry={g.paper}><meshStandardMaterial color="#f6f4ec" roughness={1} side={THREE.DoubleSide} /></mesh>
      {cake > 0.01 && <mesh position-y={u(0.158)} scale={[1, 0.35 * cake, 1]}><sphereGeometry args={[u(0.012), 16, 10]} /><meshStandardMaterial color="#17161a" roughness={1} /></mesh>}
    </group>
  </group>
}
/** 小烘箱：米白的箱体，前面一扇带玻璃窗的门，顶上一块温度屏，里面一层搁网。原点在底面正中，搁网高 OVEN_SHELF。glow：加热时窗里透出的橙光（0–1） */
export const OVEN_SHELF = 0.1
export function Oven({ glow = 0, children }: { glow?: number; children?: ReactNode }) {
  const W = 0.3, H = 0.28, D = 0.26
  return <group>
    <RoundedBox args={[u(W), u(H), u(D)]} radius={u(0.01)} smoothness={3} position-y={u(H / 2 + 0.01)} castShadow receiveShadow><meshPhysicalMaterial color="#e6e3d8" roughness={0.45} clearcoat={0.3} /></RoundedBox>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * u(W / 2 - 0.03), u(0.005), sz * u(D / 2 - 0.03)]}><cylinderGeometry args={[u(0.012), u(0.012), u(0.01), 12]} /><meshStandardMaterial color="#2b2d30" /></mesh>))}
    {/* 门：深色的门框，一块玻璃窗，右边一只拉手 */}
    <mesh position={[-u(0.02), u(H / 2 - 0.01), u(D / 2 + 0.002)]}><planeGeometry args={[u(W - 0.08), u(H - 0.09)]} /><meshStandardMaterial color="#3a3d40" roughness={0.5} /></mesh>
    <mesh position={[-u(0.02), u(H / 2 - 0.01), u(D / 2 + 0.004)]}><planeGeometry args={[u(W - 0.13), u(H - 0.15)]} /><meshStandardMaterial color="#120d0a" emissive="#ff7a2a" emissiveIntensity={glow * 1.6} roughness={0.15} /></mesh>
    <mesh position={[u(W / 2 - 0.028), u(H / 2 - 0.01), u(D / 2 + 0.012)]}><cylinderGeometry args={[u(0.005), u(0.005), u(0.12), 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[-u(0.02), u(H - 0.022), u(D / 2 + 0.002)]}><planeGeometry args={[u(W - 0.08), u(0.036)]} /><meshStandardMaterial color="#2a2e32" roughness={0.5} /></mesh>
    <mesh position={[u(W / 2 - 0.028), u(H - 0.022), u(D / 2 + 0.003)]}><circleGeometry args={[u(0.006), 16]} /><meshBasicMaterial color={glow > 0.05 ? '#ff7a3a' : '#5a5d60'} toneMapped={false} /></mesh>
    {children}
  </group>
}
/** 药匙：不锈钢的，一头是小勺。原点在勺心，柄朝 +y 伸出去 0.15 m。load：勺里的黑色粉末（0–1） */
export function Scoop({ load = 0 }: { load?: number }) {
  return <group>
    <mesh position-y={u(0.08)} castShadow><boxGeometry args={[u(0.005), u(0.15), u(0.0012)]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh scale={[1, 1.6, 0.35]} castShadow><sphereGeometry args={[u(0.007), 16, 10]} /><Metal kind="stainless" /></mesh>
    {load > 0.01 && <mesh position={[0, 0, u(0.002)]} scale={[1, 1.4, 0.6 * load]}><sphereGeometry args={[u(0.0062), 14, 10]} /><meshStandardMaterial color="#17161a" roughness={1} /></mesh>}
  </group>
}
/** 一小堆黑色粉末（二氧化锰）：原点在底面正中，r 是摊开的半径（m） */
export function Powder({ r = 0.012, k = 1, color = '#17161a' }: { r?: number; k?: number; color?: string }) {
  if (k < 0.02) return null
  return <mesh scale={[1, 0.38 * k, 1]} castShadow><sphereGeometry args={[u(r), 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
}
/** 一张称量纸 */
export function Paper({ s = 0.07 }: { s?: number }) {
  return <mesh position-y={u(0.0006)} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[u(s), u(s)]} /><meshStandardMaterial color="#f6f5ef" roughness={0.9} side={THREE.DoubleSide} /></mesh>
}
