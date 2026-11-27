// 化验台上的器材：烧杯、试管和试管架、细口瓶、滴瓶和胶头滴管、点滴板、酸式滴定管、铁架台和滴定夹、磁力搅拌器、
// 台式 pH 计和电极、玻璃棒、表面皿、温度计、吸管、手套。尺寸都按米写，乘 M 变成画面单位；每件器材的原点写在它的说明里（多半是底面正中）。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Led, Metal, disc, lathe, makeGrain, shell, type RY } from '@/lab-kit'
import { M, type V3 } from './world'
import { bottleLabel, buretteTex } from './mats'

export const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
export const u = (v: number) => v * M
const memo = <K, T>(f: (k: K) => T) => { const c = new Map<K, T>(); return (k: K) => { if (!c.has(k)) c.set(k, f(k)); return c.get(k)! } }

/** 玻璃：容器里还要画东西，用便宜的做法（半透明、不写深度、双面），反光调亮；底色压暗，免得给液体蒙一层白雾 */
export const Glass = ({ tint = '#9fbcc1', opacity = 0.15 }: { tint?: string; opacity?: number }) =>
  <meshPhysicalMaterial color={tint} transparent opacity={Math.min(0.4, opacity * 1.25)} roughness={0.02} metalness={0} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={3.2} specularIntensity={1} depthWrite={false} side={THREE.DoubleSide} />
/** 液体：无色的水溶液淡淡的、透明；带颜色的（指示剂变色后）用 vivid，饱和一些、带一点自发光，颜色才看得出 */
export function LiquidMat({ color, opacity, vivid = false }: { color: string; opacity: number; vivid?: boolean }) {
  return vivid
    ? <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.42} roughness={0.25} transparent opacity={opacity} depthWrite={false} />
    : <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.45} envMapIntensity={0.35} depthWrite={false} />
}
/** 几种溶液的样子：无色的水溶液、石灰水、变色后的颜色 */
export const LOOK = {
  clear: { color: '#cfe4ea', opacity: 0.26, vivid: false },
  red: { color: '#d8263a', opacity: 0.72, vivid: true },
  pink: { color: '#e0407e', opacity: 0.62, vivid: true },
  purple: { color: '#7a3e96', opacity: 0.68, vivid: true },
  blue: { color: '#2d57c4', opacity: 0.7, vivid: true },
  yellow: { color: '#d9a531', opacity: 0.55, vivid: true },
  green: { color: '#3d9a55', opacity: 0.66, vivid: true },
  milky: { color: '#eef1f0', opacity: 0.78, vivid: false },
} as const
export type Look = { color: string; opacity: number; vivid: boolean }

/** 一段液体：圆柱形的液体加一层亮的液面，液面边上一圈略亮的凹液面。原点在液体底面正中 */
export function LiquidBody({ r, h, look }: { r: number; h: number; look: Look }) {
  if (h < 0.002) return null
  return <>
    <mesh position={[0, h / 2, 0]} renderOrder={5}><cylinderGeometry args={[r, r * 0.99, h, 40]} /><LiquidMat {...look} /></mesh>
    <mesh position={[0, h + 0.001, 0]} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r, 40]} /><meshPhysicalMaterial color={look.color} transparent opacity={Math.min(0.9, look.opacity + 0.14)} roughness={0.05} clearcoat={0.7} envMapIntensity={1} depthWrite={false} /></mesh>
    <mesh position={[0, h - 0.008, 0]} renderOrder={5}><cylinderGeometry args={[r * 1.002, r * 1.002, 0.016, 40, 1, true]} /><meshBasicMaterial color="#eef8fb" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </>
}

// ---------- 烧杯 ----------
export const BEAKER = { 100: { r: 0.026, h: 0.07 }, 250: { r: 0.035, h: 0.095 }, 500: { r: 0.043, h: 0.12 } } as const
export type Vol = keyof typeof BEAKER
const beakerGeo = memo((vol: Vol) => {
  const { r, h } = BEAKER[vol]
  return shell(m([[0, 0], [r - 0.004, 0], [r, 0.004], [r, h - 0.004], [r + 0.0018, h - 0.0008], [r + 0.0024, h]]), 0.0018 * M, { segs: 56 })
})
const spoutGeo = memo((vol: Vol) => {
  const { r, h } = BEAKER[vol], g = new THREE.TorusGeometry(0.004 * M, 0.0012 * M, 8, 16, Math.PI)
  g.rotateY(Math.PI / 2); g.rotateX(Math.PI / 2 + 0.35); g.translate((r + 0.0012) * M, h * M - 0.0004 * M, 0)
  return g
})
/** 一只烧杯，原点在杯底正中。level 液面高度（m，从杯底内面算）；look 液体的样子；children 放在杯底内面上 */
export function Beaker({ vol, level = 0, look = LOOK.clear, marks = true, children }: { vol: Vol; level?: number; look?: Look; marks?: boolean; children?: ReactNode }) {
  const { r, h } = BEAKER[vol], R = r * M, H = h * M, wall = 0.0018 * M
  return <group>
    <mesh geometry={beakerGeo(vol)} renderOrder={6}><Glass /></mesh>
    <mesh geometry={spoutGeo(vol)} renderOrder={6}><Glass /></mesh>
    {marks && [0.3, 0.45, 0.6, 0.75].map((q, i) => <mesh key={q} position={[0, H * q, 0]} rotation-y={-0.5}><cylinderGeometry args={[R + 0.003, R + 0.003, 0.012, 24, 1, true, 0, i % 2 ? 0.3 : 0.5]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    <group position-y={wall}>
      {level > 0.001 && <LiquidBody r={R - wall - 0.002} h={level * M} look={look} />}
      {children}
    </group>
  </group>
}

// ---------- 试管、试管架 ----------
export const TUBE = { r: 0.0095, h: 0.18 }
const tubeGeo = memo((_: number) => {
  const r = TUBE.r, h = TUBE.h, pts: RY[] = []
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push([Math.sin(a) * r, r - Math.cos(a) * r]) }
  pts.push([r, h - 0.001], [r + 0.0012, h])
  return shell(m(pts), 0.0009 * M, { segs: 32, crease: 50 })
})
/** 试管：直径 19 mm、长 16 cm，圆底。原点在管底，沿 y 朝上。fill 盛了多少（0–1）；children 放在管底 */
export function TestTube({ fill = 0.3, look = LOOK.clear, children }: { fill?: number; look?: Look; children?: ReactNode }) {
  const r = (TUBE.r - 0.0009) * M, h = TUBE.h * fill * M
  return <group>
    <mesh geometry={tubeGeo(0)} renderOrder={7}><Glass opacity={0.2} /></mesh>
    {fill > 0 && <>
      <mesh position-y={r} renderOrder={5}><sphereGeometry args={[r * 0.98, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><LiquidMat {...look} /></mesh>
      <mesh position-y={r + (h - r) / 2} renderOrder={5}><cylinderGeometry args={[r * 0.98, r * 0.98, h - r, 20]} /><LiquidMat {...look} /></mesh>
      <mesh position-y={h} rotation-x={-Math.PI / 2} renderOrder={5}><circleGeometry args={[r * 0.98, 20]} /><meshPhysicalMaterial color={look.color} transparent opacity={Math.min(0.9, look.opacity + 0.15)} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    </>}
    {children}
  </group>
}
/** 一块带倒角的木板：w × d、厚 t（m），holes 是板上的圆孔 [x, z, 半径]。原点在板的底面正中 */
function board(w: number, d: number, t: number, holes: [number, number, number][] = []) {
  const W = w * M, D = d * M, s = new THREE.Shape()
  s.moveTo(-W / 2, -D / 2); s.lineTo(W / 2, -D / 2); s.lineTo(W / 2, D / 2); s.lineTo(-W / 2, D / 2); s.closePath()
  for (const [x, z, r] of holes) { const h = new THREE.Path(); h.absarc(x * M, -z * M, r * M, 0, Math.PI * 2, true); s.holes.push(h) }
  const e = 0.0012 * M, g = new THREE.ExtrudeGeometry(s, { depth: t * M - 2 * e, bevelEnabled: true, bevelSize: e, bevelThickness: e, bevelSegments: 2, curveSegments: 20 })
  g.rotateX(-Math.PI / 2); g.translate(0, e, 0)
  return g
}
/** 木纹：浅色的榉木，顺着长边几道深浅不一的纹 */
const woodTex = memo((_: number) => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64
  const g = c.getContext('2d')!; g.fillStyle = '#c99a62'; g.fillRect(0, 0, 256, 64)
  let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 70; i++) { const y = r() * 64; g.strokeStyle = `rgba(${r() < 0.5 ? '120,78,40' : '230,196,150'},${0.12 + r() * 0.2})`; g.lineWidth = 0.5 + r() * 1.6; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 2); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.25, 0.25); return t
})
/**
 * 试管架：榉木的。底板往后加宽，后沿一排沥水柱（倒插洗过的试管）；两头立板，中层板和顶板上各一排孔，试管从顶板插到中层板。
 * 原点在底板底面正中；n 个孔沿 x 排开，孔距 gap（m）；孔的中心在 z = 0。pegs：沥水柱上倒插几支试管
 */
export function TubeRack({ n = 6, gap = 0.03, pegs = 2 }: { n?: number; gap?: number; pegs?: number }) {
  const L = n * gap + 0.024, D = 0.042, F = 0.03
  const geo = useMemo(() => {
    const xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * gap)
    return {
      base: board(L, D + F, 0.012),
      top: board(L, D, 0.01, xs.map(x => [x, 0, TUBE.r + 0.0018] as [number, number, number])),
      mid: board(L - 0.02, D - 0.004, 0.008, xs.map(x => [x, 0, TUBE.r * 0.7] as [number, number, number])),
      end: board(0.012, D, 0.1),
      peg: lathe(m([[0, 0], [0.0032, 0], [0.0032, 0.05], [0.0025, 0.056], [0, 0.057]]), { segs: 16 }),
      xs,
    }
  }, [n, gap, L])
  const wood = <meshStandardMaterial map={woodTex(0)} roughness={0.62} />
  return <group>
    <mesh geometry={geo.base} position-z={-u(F / 2)} castShadow receiveShadow>{wood}</mesh>
    {[-1, 1].map(s => <mesh key={s} geometry={geo.end} position={[s * u(L / 2 - 0.006), u(0.012), 0]} castShadow>{wood}</mesh>)}
    <mesh geometry={geo.mid} position-y={u(0.04)} castShadow receiveShadow>{wood}</mesh>
    <mesh geometry={geo.top} position-y={u(0.102)} castShadow receiveShadow>{wood}</mesh>
    {geo.xs.map((x, i) => <group key={i} position={[u(x), u(0.012), -u(D / 2 + F / 2)]}>
      <mesh geometry={geo.peg} castShadow>{wood}</mesh>
      {i >= n - pegs && <group position-y={u(0.065)} rotation-x={Math.PI}><mesh position-y={-u(0.005)} geometry={tubeGeo(0)} renderOrder={7}><Glass opacity={0.22} /></mesh></group>}
    </group>)}
  </group>
}

// ---------- 试剂瓶、滴瓶、胶头滴管 ----------
/** 细口瓶（500 mL）：瓶身装着液体，细颈上插着磨口塞。原点在瓶底正中。brown：棕色瓶；plug：塞子拔下来时为 false */
export function NarrowBottle({ label, band, sub, look = LOOK.clear, brown = false, plug = true, level = 0.07 }: { label: string; band?: string; sub?: string; look?: Look; brown?: boolean; plug?: boolean; level?: number }) {
  const g = useMemo(() => shell(m([[0, 0], [0.028, 0], [0.032, 0.004], [0.032, 0.08], [0.012, 0.1], [0.0095, 0.104], [0.0095, 0.12]]), 0.002 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass tint={brown ? '#5a3010' : undefined} opacity={brown ? 0.6 : 0.2} /></mesh>
    <mesh position-y={(0.003 + level / 2) * M} renderOrder={5}><cylinderGeometry args={[0.0295 * M, 0.0295 * M, level * M, 32]} /><LiquidMat {...look} /></mesh>
    <mesh position={[0, 0.046 * M, 0]} rotation-y={0.25}><cylinderGeometry args={[0.0325 * M, 0.0325 * M, 0.034 * M, 32, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band, sub)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    {plug && <Stopper />}
  </group>
}
/** 磨口玻璃塞：一截锥形的塞柄加一个扁圆的头。原点在瓶底（和瓶子一起放）；单独放时传 alone，原点在塞头底下 */
export function Stopper({ alone = false }: { alone?: boolean }) {
  return <group position-y={alone ? -0.118 * M : 0}>
    <mesh position-y={0.124 * M}><cylinderGeometry args={[0.0085 * M, 0.0075 * M, 0.012 * M, 24]} /><Glass opacity={0.45} /></mesh>
    <mesh position-y={0.134 * M} scale={[1, 0.45, 1]}><sphereGeometry args={[0.013 * M, 24, 12]} /><Glass opacity={0.45} /></mesh>
  </group>
}
/** 胶头滴管：细玻璃管，管尖收细，上面套一只红色的橡胶头。原点在管尖，沿 y 朝上，全长约 0.12 m。fill 管里吸了多少液体（0–1） */
export function Dropper({ fill = 0, look = LOOK.clear }: { fill?: number; look?: Look }) {
  const g = useMemo(() => ({
    tube: shell(m([[0.0012, 0], [0.0016, 0.002], [0.0035, 0.025], [0.0035, 0.09]]), 0.0007 * M, { segs: 20 }),
    bulb: lathe(m([[0, 0.122], [0.004, 0.121], [0.0068, 0.115], [0.0072, 0.104], [0.0058, 0.094], [0.0048, 0.086], [0.0052, 0.084], [0.0052, 0.08], [0, 0.08]]), { segs: 28, crease: 70 }),
  }), [])
  return <group>
    <mesh geometry={g.tube} renderOrder={7}><Glass opacity={0.3} /></mesh>
    {fill > 0.02 && <mesh position-y={(0.012 + fill * 0.025) * M} renderOrder={6}><cylinderGeometry args={[0.0024 * M, 0.0018 * M, fill * 0.05 * M, 12]} /><LiquidMat {...look} /></mesh>}
    <mesh geometry={g.bulb} castShadow><meshPhysicalMaterial color="#b3262a" roughness={0.45} clearcoat={0.4} /></mesh>
  </group>
}
/** 滴瓶（60 mL，指示剂）：棕色或无色的小瓶，瓶口插着胶头滴管。原点在瓶底；dropper 为假时滴管已拿走 */
export function DropBottle({ label, band, look, brown = false, dropper = true }: { label: string; band?: string; look: Look; brown?: boolean; dropper?: boolean }) {
  const g = useMemo(() => shell(m([[0, 0], [0.018, 0], [0.021, 0.003], [0.021, 0.05], [0.011, 0.062], [0.0085, 0.064], [0.0085, 0.072]]), 0.0016 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} renderOrder={6}><Glass tint={brown ? '#5a3010' : undefined} opacity={brown ? 0.5 : 0.2} /></mesh>
    <mesh position-y={0.022 * M} renderOrder={5}><cylinderGeometry args={[0.019 * M, 0.019 * M, 0.04 * M, 28]} /><LiquidMat {...look} /></mesh>
    <mesh position={[0, 0.028 * M, 0]} rotation-y={0.2}><cylinderGeometry args={[0.0215 * M, 0.0215 * M, 0.022 * M, 28, 1, true, -0.9, 1.8]} /><meshStandardMaterial map={bottleLabel(label, band)} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    {dropper && <group position-y={0.03 * M}><Dropper fill={0.4} look={look} /></group>}
  </group>
}

// ---------- 点滴板 ----------
/** 凹穴里的一汪液体：贴着碗形的穴壁，液面是平的。q 是 0–10 的多少 */
const wellLiquid = memo((q: number) => {
  const d0 = PLATE.well * 0.75, top = PLATE.h + 0.0012, bot = top - d0, yL = bot + d0 * (0.4 + 0.035 * q), pts: RY[] = [[0, bot + 0.0003]]
  for (let i = 1; i <= 20; i++) { const a = i / 20 * Math.PI / 2, y = top - Math.cos(a) * d0; if (y >= yL) break; pts.push([Math.sin(a) * PLATE.well * 0.97, y + 0.0003]) }
  const aL = Math.acos((top - yL) / d0); pts.push([Math.sin(aL) * PLATE.well * 0.97, yL], [0, yL])
  return lathe(m(pts), { segs: 32, crease: 60 })
})
export const PLATE = { cols: 3, rows: 2, gap: 0.042, w: 0.15, d: 0.1, h: 0.014, well: 0.015 }
/** 一个凹穴的中心（相对点滴板原点，m） */
export const wellAt = (row: number, col: number): V3 => [(col - (PLATE.cols - 1) / 2) * PLATE.gap, PLATE.h, (row - (PLATE.rows - 1) / 2) * PLATE.gap]
/**
 * 白瓷点滴板：一块带圆角的白釉瓷板，两排各三个半球形的凹穴。原点在底面正中。
 * fill[row][col]：每个凹穴里液体的样子和多少（0–1）
 */
export function SpotPlate({ fill }: { fill: ({ look: Look; k: number } | null)[][] }) {
  const g = useMemo(() => {
    const W = PLATE.w * M, D = PLATE.d * M, R = 0.008 * M, s = new THREE.Shape()
    s.moveTo(-W / 2 + R, -D / 2); s.lineTo(W / 2 - R, -D / 2); s.quadraticCurveTo(W / 2, -D / 2, W / 2, -D / 2 + R); s.lineTo(W / 2, D / 2 - R); s.quadraticCurveTo(W / 2, D / 2, W / 2 - R, D / 2)
    s.lineTo(-W / 2 + R, D / 2); s.quadraticCurveTo(-W / 2, D / 2, -W / 2, D / 2 - R); s.lineTo(-W / 2, -D / 2 + R); s.quadraticCurveTo(-W / 2, -D / 2, -W / 2 + R, -D / 2)
    for (let r = 0; r < PLATE.rows; r++) for (let c = 0; c < PLATE.cols; c++) { const [x, , z] = wellAt(r, c); const h = new THREE.Path(); h.absarc(x * M, -z * M, PLATE.well * M, 0, Math.PI * 2, true); s.holes.push(h) }
    const top = new THREE.ExtrudeGeometry(s, { depth: (PLATE.h - 0.002) * M, bevelEnabled: true, bevelSize: 0.0012 * M, bevelThickness: 0.0012 * M, bevelSegments: 3, curveSegments: 24 })
    top.rotateX(-Math.PI / 2); top.translate(0, 0.0012 * M, 0)
    // 凹穴：一只浅碗，口沿接在板面的孔上
    const bowl: RY[] = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; bowl.push([Math.sin(a) * PLATE.well, PLATE.h + 0.0012 - Math.cos(a) * PLATE.well * 0.75]) }
    const cup = lathe(m(bowl), { segs: 32, crease: 80 })
    return { top, cup }
  }, [])
  const glaze = <meshPhysicalMaterial color="#f6f5f0" roughness={0.16} clearcoat={0.9} clearcoatRoughness={0.1} side={THREE.DoubleSide} />
  return <group>
    <mesh geometry={g.top} castShadow receiveShadow>{glaze}</mesh>
    {Array.from({ length: PLATE.rows }, (_, r) => Array.from({ length: PLATE.cols }, (_, c) => {
      const [x, , z] = wellAt(r, c), f = fill[r]?.[c]
      return <group key={`${r}${c}`} position={[x * M, 0, z * M]}>
        <mesh geometry={g.cup} receiveShadow>{glaze}</mesh>
        {f && f.k > 0.01 && <mesh geometry={wellLiquid(Math.round(f.k * 10))} renderOrder={6}><LiquidMat {...f.look} opacity={Math.min(0.95, f.look.opacity + 0.15)} /></mesh>}
      </group>
    }))}
  </group>
}

// ---------- 酸式滴定管 ----------
/** 25 mL 酸式滴定管：内半径 4.5 mm，25 mL 一段长 0.39 m。原点在管尖，沿 y 朝上。0 刻度在 BUR.zero，25 刻度在 BUR.full */
export const BUR = { cap: 25, ri: 0.0045, ro: 0.0062, tip: 0.0, cock: 0.05, full: 0.095, zero: 0.488, top: 0.53 }
/** v mL 刻度在多高（m，相对管尖） */
export const burY = (v: number) => BUR.zero - v / BUR.cap * (BUR.zero - BUR.full)
/**
 * level：液面在几毫升的刻度（0 是满到 0 刻度）；open：活塞开着（0–1，手柄转过去的程度）
 * 管身是有壁厚的玻璃管，正面一条白色刻度带；下面是磨口玻璃活塞和收细的尖嘴
 */
export function Burette({ level, open = 0, look = LOOK.clear }: { level: number; open?: number; look?: Look }) {
  const g = useMemo(() => ({
    body: shell(m([[BUR.ro * 0.75, BUR.cock + 0.012], [BUR.ro, BUR.cock + 0.03], [BUR.ro, BUR.top - 0.002], [BUR.ro + 0.0008, BUR.top]]), 0.0012 * M, { segs: 32 }),
    tip: shell(m([[0.0014, 0], [0.0018, 0.003], [0.0034, 0.03], [0.004, BUR.cock - 0.008]]), 0.0008 * M, { segs: 20 }),
    cock: lathe(m([[0, -0.012], [0.0042, -0.012], [0.0055, -0.009], [0.0062, 0.009], [0.0052, 0.012], [0, 0.012]]), { segs: 24 }),
    knob: lathe(m([[0, 0], [0.009, 0], [0.0105, 0.002], [0.0105, 0.005], [0.006, 0.008], [0.003, 0.012], [0, 0.012]]), { segs: 24 }),
  }), [])
  const yL = burY(Math.max(0, Math.min(BUR.cap, level)))
  const bandH = (BUR.cap + 2) / BUR.cap * (BUR.zero - BUR.full), bandTop = burY(-1)
  return <group>
    <mesh geometry={g.body} renderOrder={7}><Glass opacity={0.3} /></mesh>
    <mesh geometry={g.tip} renderOrder={7}><Glass opacity={0.34} /></mesh>
    {/* 活塞外壳：一段粗一点的玻璃，横穿一只磨口活塞，活塞一头是扁平的手柄 */}
    <mesh position-y={u(BUR.cock)} renderOrder={7}><cylinderGeometry args={[u(0.0058), u(0.0058), u(0.028), 24]} /><Glass opacity={0.35} /></mesh>
    <group position-y={u(BUR.cock)} rotation-z={Math.PI / 2}>
      <mesh geometry={g.cock} renderOrder={8}><meshPhysicalMaterial color="#e6eeef" transparent opacity={0.55} roughness={0.35} clearcoat={0.6} depthWrite={false} /></mesh>
      <group position-y={u(0.012)} rotation-y={open * Math.PI / 2}>
        <mesh geometry={g.knob} castShadow><meshPhysicalMaterial color="#eef3f3" transparent opacity={0.8} roughness={0.25} clearcoat={0.8} /></mesh>
        <RoundedBox args={[u(0.028), u(0.006), u(0.008)]} radius={u(0.002)} position-y={u(0.012)} castShadow><meshPhysicalMaterial color="#eef3f3" transparent opacity={0.8} roughness={0.25} clearcoat={0.8} /></RoundedBox>
      </group>
    </group>
    {/* 管里的液体：尖嘴和活塞里一直是满的，管身里到液面 */}
    <mesh position-y={u((BUR.cock + 0.016 + yL) / 2)} renderOrder={5}><cylinderGeometry args={[u(BUR.ri - 0.0003), u(BUR.ri - 0.0003), u(Math.max(0.001, yL - BUR.cock - 0.016)), 20]} /><LiquidMat {...look} opacity={look.opacity + 0.1} /></mesh>
    {/* 凹液面：一圈下凹的亮边 */}
    <mesh position-y={u(yL)} rotation-x={Math.PI} renderOrder={6}><sphereGeometry args={[u(BUR.ri - 0.0003), 20, 6, 0, Math.PI * 2, 0, 0.9]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.45} roughness={0.05} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh position-y={u(0.026)} renderOrder={5}><cylinderGeometry args={[u(0.0022), u(0.001), u(0.044), 10]} /><LiquidMat {...look} /></mesh>
    {/* 刻度带：贴在管子正面 */}
    <mesh position-y={u(bandTop - bandH / 2)} rotation-y={-0.15} renderOrder={8}><cylinderGeometry args={[u(BUR.ro + 0.0003), u(BUR.ro + 0.0003), u(bandH), 24, 1, true, -0.55, 1.1]} /><meshBasicMaterial map={buretteTex()} transparent depthWrite={false} /></mesh>
    {/* 管口：一圈火抛光的厚沿 */}
    <mesh position-y={u(BUR.top)} rotation-x={Math.PI / 2}><torusGeometry args={[u(BUR.ro), u(0.0009), 8, 24]} /><Glass opacity={0.4} /></mesh>
  </group>
}

// ---------- 铁架台、滴定夹 ----------
/**
 * 铁架台：铸铁底座（厚 25 mm、四边倒角、漆成深灰锤纹，底下四只橡胶脚），立杆旋进底座后部的凸台，顶上一只圆帽。
 * 原点在底座底面正中，立杆在 z = rodZ（m），高 rodH
 */
export function IronStand({ rodH = 0.75, rodZ = -0.06, w = 0.16, d = 0.24, children }: { rodH?: number; rodZ?: number; w?: number; d?: number; children?: ReactNode }) {
  const base = useMemo(() => board(w, d, 0.022), [w, d])
  const boss = useMemo(() => lathe(m([[0, 0], [0.02, 0], [0.02, 0.004], [0.016, 0.014], [0.012, 0.016], [0, 0.016]]), { segs: 32 }), [])
  const paint = <meshPhysicalMaterial color="#2c3135" roughness={0.55} metalness={0.35} clearcoat={0.35} clearcoatRoughness={0.5} roughnessMap={makeGrain("cast")} />
  return <group>
    {[-1, 1].flatMap(a => [-1, 1].map(b => <mesh key={`${a}${b}`} position={[a * u(w / 2 - 0.015), u(0.0015), b * u(d / 2 - 0.02)]}><cylinderGeometry args={[u(0.008), u(0.009), u(0.003), 16]} /><meshStandardMaterial color="#111" roughness={0.9} /></mesh>))}
    <mesh geometry={base} position-y={u(0.003)} castShadow receiveShadow>{paint}</mesh>
    <mesh geometry={boss} position={[0, u(0.025), u(rodZ)]} castShadow>{paint}</mesh>
    <mesh position={[0, u(rodH / 2 + 0.03), u(rodZ)]} castShadow><cylinderGeometry args={[u(0.006), u(0.006), u(rodH), 24]} /><Metal kind="chrome" rough={0.1} /></mesh>
    <mesh position={[0, u(rodH + 0.032), u(rodZ)]}><sphereGeometry args={[u(0.0065), 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><Metal kind="chrome" rough={0.1} /></mesh>
    {children}
  </group>
}
/**
 * 蝴蝶夹（滴定管夹）：铸铝的夹座套在立杆上，后面一只黑色胶木头的紧固螺钉；左右各伸出一条臂，
 * 臂端是一对弹簧夹爪：两片弯成 V 形的钢片，内面衬白色塑料，中间一圈弹簧。原点在立杆中心，臂朝 +z，夹爪的中心在 (±gap, 0, reach)
 */
export function ButterflyClamp({ gap = 0.045, reach = 0.09, hold = [true, false] }: { gap?: number; reach?: number; hold?: [boolean, boolean] }) {
  const g = useMemo(() => {
    const sleeve = shell(m([[0.011, -0.016], [0.011, 0.016]]), u(0.004), { segs: 28 })
    const spring = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => new THREE.Vector3(Math.cos(i / 40 * Math.PI * 8) * u(0.004), (i / 40 - 0.5) * u(0.012), Math.sin(i / 40 * Math.PI * 8) * u(0.004)))), 60, u(0.0006), 6)
    return { sleeve, spring }
  }, [])
  const alu = <Metal kind="aluminum" grain="cast" rough={0.45} />
  return <group>
    <mesh geometry={g.sleeve} castShadow>{alu}</mesh>
    <mesh position={[0, 0, -u(0.017)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.003), u(0.003), u(0.014), 10]} /><Metal kind="steel" /></mesh>
    <mesh position={[0, 0, -u(0.027)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.009), u(0.008), u(0.008), 16]} /><meshStandardMaterial color="#17191b" roughness={0.45} /></mesh>
    <RoundedBox args={[u(0.03), u(0.02), u(0.02)]} radius={u(0.004)} position={[0, 0, u(0.016)]} castShadow>{alu}</RoundedBox>
    {[-1, 1].map((s, i) => {
      const ex = s * u(gap), ez = u(reach), sx = s * u(0.012), sz = u(0.024), len = Math.hypot(ex - sx, ez - sz - u(0.014)), ang = Math.atan2(ex - sx, ez - sz - u(0.014))
      return <group key={s}>
        <RoundedBox args={[u(0.008), u(0.012), len]} radius={u(0.003)} position={[(sx + ex) / 2, 0, (sz + ez - u(0.014)) / 2]} rotation-y={ang} castShadow>{alu}</RoundedBox>
        {/* 夹爪：两片 V 形钢片，衬塑料，夹着管子；不夹的一边合拢 */}
        <group position={[ex, 0, ez]}>
          {[-1, 1].map(t => <group key={t} position={[t * u(hold[i] ? 0.0085 : 0.004), 0, 0]} rotation-y={t * 0.25}>
            <RoundedBox args={[u(0.0024), u(0.014), u(0.026)]} radius={u(0.001)} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
            <mesh position={[-t * u(0.0016), 0, 0]}><boxGeometry args={[u(0.0012), u(0.012), u(0.02)]} /><meshStandardMaterial color="#efeee8" roughness={0.6} /></mesh>
          </group>)}
          <mesh geometry={g.spring} position={[0, 0, -u(0.016)]} rotation-z={Math.PI / 2}><Metal kind="steel" /></mesh>
        </group>
      </group>
    })}
  </group>
}

// ---------- 磁力搅拌器、pH 计 ----------
/** 磁力搅拌器：白色的机身，正面一只调速旋钮和一盏指示灯，顶面一块陶瓷盘。原点在底面正中，顶面在 0.06 m。spin：转子在转 */
export function MagStirrer({ on }: { on: boolean }) {
  return <group>
    <RoundedBox args={[u(0.15), u(0.056), u(0.17)]} radius={u(0.008)} smoothness={3} position-y={u(0.028)} castShadow receiveShadow><meshPhysicalMaterial color="#e5e8e7" roughness={0.42} clearcoat={0.35} /></RoundedBox>
    <RoundedBox args={[u(0.13), u(0.004), u(0.13)]} radius={u(0.0015)} position={[0, u(0.058), -u(0.01)]} receiveShadow><meshPhysicalMaterial color="#f4f3ee" roughness={0.3} clearcoat={0.7} /></RoundedBox>
    <mesh position={[u(0.035), u(0.028), u(0.086)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[u(0.012), u(0.013), u(0.012), 24]} /><meshStandardMaterial color="#26292c" roughness={0.5} /></mesh>
    <mesh position={[-u(0.04), u(0.03), u(0.0855)]}><circleGeometry args={[u(0.004), 16]} /><meshBasicMaterial color={on ? '#5cff8a' : '#2a3a2f'} toneMapped={!on} /></mesh>
    <mesh position={[0, u(0.012), u(0.0855)]}><planeGeometry args={[u(0.14), u(0.003)]} /><meshStandardMaterial color="#9aa1a3" /></mesh>
  </group>
}
/** 搅拌子：白色的聚四氟乙烯小胶囊，在杯底转。原点在杯底 */
export function StirBar({ on }: { on: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, d) => { if (on && ref.current) ref.current.rotation.y += Math.min(d, 1 / 30) * 14 })
  return <group ref={ref} position-y={u(0.004)}><mesh rotation-z={Math.PI / 2}><capsuleGeometry args={[u(0.0035), u(0.022), 6, 12]} /><meshStandardMaterial color="#f4f4f0" roughness={0.35} /></mesh></group>
}
/** pH 复合电极：黑色的塑料杆，下端一截玻璃，玻璃泡在最底下。原点在玻璃泡底，朝 +y，长 0.16 m */
export function Electrode() {
  return <group>
    <mesh position-y={u(0.004)} renderOrder={7}><sphereGeometry args={[u(0.0055), 20, 12]} /><meshPhysicalMaterial color="#dfeeee" transparent opacity={0.5} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    <mesh position-y={u(0.022)} renderOrder={7}><cylinderGeometry args={[u(0.006), u(0.006), u(0.032), 20, 1, true]} /><Glass opacity={0.3} /></mesh>
    <mesh position-y={u(0.098)} castShadow><cylinderGeometry args={[u(0.0062), u(0.0062), u(0.124), 20]} /><meshStandardMaterial color="#1b1d20" roughness={0.45} /></mesh>
    <mesh position-y={u(0.163)}><cylinderGeometry args={[u(0.004), u(0.0055), u(0.008), 16]} /><meshStandardMaterial color="#2c2f33" roughness={0.5} /></mesh>
  </group>
}
/** 台式 pH 计：斜面的机身，一块绿字读数屏，几只按键。原点在底面正中，屏幕朝 +z */
export function PhMeter({ text }: { text: string }) {
  return <group>
    <RoundedBox args={[u(0.17), u(0.05), u(0.15)]} radius={u(0.008)} smoothness={3} position-y={u(0.025)} castShadow receiveShadow><meshPhysicalMaterial color="#e8ebea" roughness={0.42} clearcoat={0.35} /></RoundedBox>
    <group position={[0, u(0.062), u(0.02)]} rotation-x={0.95}>
      <RoundedBox args={[u(0.16), u(0.012), u(0.11)]} radius={u(0.004)} castShadow><meshPhysicalMaterial color="#dfe3e2" roughness={0.4} clearcoat={0.4} /></RoundedBox>
      <mesh position={[0, u(0.0065), -u(0.012)]} rotation-x={-Math.PI / 2}><planeGeometry args={[u(0.12), u(0.06)]} /><meshStandardMaterial color="#1c2228" roughness={0.4} /></mesh>
      <Led text={text} w={u(0.11)} h={u(0.05)} position={[0, u(0.0068), -u(0.012)]} rotation-x={-Math.PI / 2} />
      {[-0.045, -0.015, 0.015, 0.045].map(x => <RoundedBox key={x} args={[u(0.022), u(0.004), u(0.012)]} radius={u(0.0015)} position={[u(x), u(0.007), u(0.035)]}><meshStandardMaterial color={x === 0.045 ? '#2f8f6b' : '#3a4046'} roughness={0.5} /></RoundedBox>)}
    </group>
  </group>
}

// ---------- 小件 ----------
/** 玻璃棒：实心的细玻璃棒，两头烧圆。原点在下端，沿 y 朝上 */
export function GlassRod({ len = 0.2, wet }: { len?: number; wet?: Look }) {
  const g = useMemo(() => lathe(m([[0, 0], [0.0022, 0.0006], [0.003, 0.003], [0.003, len - 0.003], [0.0022, len - 0.0006], [0, len]]), { segs: 16 }), [len])
  return <group>
    <mesh geometry={g} renderOrder={7}><meshPhysicalMaterial color="#eef7f8" transparent opacity={0.55} roughness={0.03} clearcoat={1} envMapIntensity={2.4} depthWrite={false} /></mesh>
    {wet && <mesh position-y={u(0.004)} renderOrder={8}><sphereGeometry args={[u(0.0034), 14, 10]} /><LiquidMat {...wet} opacity={Math.max(0.55, wet.opacity)} /></mesh>}
  </group>
}
/** 表面皿：一只浅浅的玻璃圆碟。原点在底面正中 */
export function WatchGlass({ r = 0.04, children }: { r?: number; children?: ReactNode }) {
  const g = useMemo(() => { const p: RY[] = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * 0.62; p.push([Math.sin(a) / Math.sin(0.62) * r, (1 - Math.cos(a)) / Math.sin(0.62) * r]) } return shell(m(p), 0.0015 * M, { segs: 48, crease: 80 }) }, [r])
  return <group>
    <mesh geometry={g} renderOrder={7}><Glass opacity={0.25} /></mesh>
    {children}
  </group>
}
/** 玻璃温度计：细玻璃管，底下一只液泡，红色液柱。原点在液泡底，朝 +y，长 0.2 m；col 液柱高到管长的几成（0–1） */
export function Thermometer({ col = 0.3 }: { col?: number }) {
  return <group>
    <mesh position-y={u(0.006)} renderOrder={7}><capsuleGeometry args={[u(0.0028), u(0.007), 6, 12]} /><meshStandardMaterial color="#c8232c" roughness={0.3} /></mesh>
    <mesh position-y={u(0.1)} renderOrder={7}><cylinderGeometry args={[u(0.0032), u(0.0032), u(0.19), 16]} /><Glass opacity={0.3} /></mesh>
    <mesh position-y={u(0.012 + col * 0.17 / 2)}><cylinderGeometry args={[u(0.0009), u(0.0009), u(col * 0.17), 8]} /><meshStandardMaterial color="#d22a33" roughness={0.3} emissive="#5a0a0e" /></mesh>
    {Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[0, u(0.03 + i * 0.009), u(0.0031)]}><planeGeometry args={[u(i % 5 === 0 ? 0.0034 : 0.002), u(0.0004)]} /><meshBasicMaterial color="#222" /></mesh>)}
  </group>
}
/** 塑料吸管：白底红条的弯头吸管。原点在下端，朝 +y */
export function Straw() {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0, 0], [0, 0.12, 0], [0, 0.15, 0.005], [0, 0.17, 0.03]].map(p => new THREE.Vector3(p[0] * M, p[1] * M, p[2] * M))), 40, u(0.0028), 12), [])
  return <mesh geometry={g} castShadow><meshPhysicalMaterial color="#f2f0ea" roughness={0.35} clearcoat={0.5} /></mesh>
}
/** 一块带倒角的白瓷砖（垫在器材下面）。原点在底面正中 */
export function Tile({ w = 0.15, d = 0.15 }: { w?: number; d?: number }) {
  return <RoundedBox args={[u(w), u(0.006), u(d)]} radius={u(0.0015)} smoothness={2} position-y={u(0.003)} receiveShadow castShadow><meshPhysicalMaterial color="#f3f2ed" roughness={0.2} clearcoat={0.8} /></RoundedBox>
}
/** 一只黑色的圆底座（放温度计、电极用的小支架的底盘）。原点在底面正中 */
export function Plinth({ r = 0.04, h = 0.012 }: { r?: number; h?: number }) {
  const g = useMemo(() => disc(u(r), u(h), { chamfer: u(0.003) }), [r, h])
  return <mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial color="#1d2124" roughness={0.35} clearcoat={0.6} /></mesh>
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
