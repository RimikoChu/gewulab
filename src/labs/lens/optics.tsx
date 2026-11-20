// 光学暗室里反复用到的东西：光线和光束、透镜、蜡烛（物体和它的像）、光屏、主光轴、标尺寸的线。
// 光路都画在正对镜头的那个竖直平面里（z = 0）。器材都立在导轨上的滑座上。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { LabStage, Rod, type Label } from '@/lab-kit'
import { DARK, SPOT, TOP } from './world'

type V2 = [number, number]
const RAIL_Y = TOP + 0.126
/** 这一课的舞台：选一处机位，暗室的设置都一样 */
export function Dark({ at, labels, children = null }: { at: keyof typeof SPOT; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  return <LabStage labels={labels} target={v.target} span={v.span} view={v.view} {...DARK}>{children}</LabStage>
}

/** 一条光线：从 a 到 b（都是平面里的坐标）。实线带一圈淡淡的光晕；dash 画成虚线（反向延长线、虚像的光路） */
export function Ray({ a, b, color = '#ffd24a', r = 0.009, dash = false, z = 0, glow = true }: { a: V2; b: V2; color?: string; r?: number; dash?: boolean; z?: number; glow?: boolean }) {
  if (!dash) return <>
    <Rod from={[a[0], a[1], z]} to={[b[0], b[1], z]} r={r}><meshBasicMaterial color={color} toneMapped={false} /></Rod>
    {glow && <Rod from={[a[0], a[1], z]} to={[b[0], b[1], z]} r={r * 3.4}><meshBasicMaterial color={color} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></Rod>}
  </>
  const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.09))
  return <>{Array.from({ length: n }, (_, i) => i % 2 ? null : <Rod key={i} from={[a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, z]} to={[a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n, z]} r={r * 0.75}><meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} /></Rod>)}</>
}

/** 一片光：几个点围成的半透明亮区，用来画“一束光”经过的范围 */
export function Beam({ pts, color = '#ffe6b8', opacity = 0.085 }: { pts: V2[]; color?: string; opacity?: number }) {
  const key = pts.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ')
  const geo = useMemo(() => { const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); return new THREE.ShapeGeometry(s) }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} position={[0, 0, -0.012]}><meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
}

/** 立在导轨上的滑座和立杆：从导轨一直顶到 y 处 */
export function Stand({ x, y }: { x: number; y: number }) {
  return <>
    {/* 滑块：骑在导轨上的一块铝座，两侧的裙边卡住导轨；正面一颗紧固螺丝；上面是插支杆的套管 */}
    <mesh position={[x, RAIL_Y + 0.02, 0]} castShadow><boxGeometry args={[0.15, 0.05, 0.24]} /><meshStandardMaterial color="#8d969d" metalness={0.75} roughness={0.35} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[x, RAIL_Y - 0.035, s * 0.104]}><boxGeometry args={[0.15, 0.07, 0.03]} /><meshStandardMaterial color="#7d868d" metalness={0.75} roughness={0.4} /></mesh>)}
    <mesh position={[x, RAIL_Y - 0.03, 0.135]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, 0.03, 14]} /><meshStandardMaterial color="#1c2024" roughness={0.6} /></mesh>
    <mesh position={[x, RAIL_Y + 0.085, 0]}><cylinderGeometry args={[0.026, 0.03, 0.09, 14]} /><meshStandardMaterial color="#6f787f" metalness={0.8} roughness={0.3} /></mesh>
    <mesh position={[x + 0.034, RAIL_Y + 0.09, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.011, 0.011, 0.03, 10]} /><meshStandardMaterial color="#1c2024" roughness={0.6} /></mesh>
    <mesh position={[x, (RAIL_Y + 0.12 + y) / 2, 0]}><cylinderGeometry args={[0.013, 0.013, Math.max(0.01, y - RAIL_Y - 0.12), 12]} /><meshStandardMaterial color="#c4cace" metalness={0.9} roughness={0.22} /></mesh>
  </>
}

/** 凹透镜的形状：中间薄、边缘厚的一块，绕着主光轴转一圈得到 */
const concaves = new Map<number, THREE.LatheGeometry>()
function concave(h: number) {
  if (!concaves.has(h)) {
    const t = (r: number) => 0.012 + 0.07 * (r / h) ** 2, N = 12
    const pts = [...Array.from({ length: N + 1 }, (_, i) => new THREE.Vector2(h * i / N, t(h * i / N))), ...Array.from({ length: N + 1 }, (_, i) => new THREE.Vector2(h * (N - i) / N, -t(h * (N - i) / N)))]
    concaves.set(h, new THREE.LatheGeometry(pts, 40))
  }
  return concaves.get(h)!
}

/** 一块透镜，立在 x 处，中心在主光轴上。凸透镜中间厚，凹透镜中间薄；外面一圈镜框。stand 是给它配上滑座 */
export function Lens({ x, y, h = 0.5, kind = 'convex', tint = '#9fd8ff', stand = true, frame = true, bulge = 0.17 }: { x: number; y: number; h?: number; kind?: 'convex' | 'concave'; tint?: string; stand?: boolean; frame?: boolean; bulge?: number }) {
  // 玻璃：通透、有反光，带一点点颜色
  const m = <meshPhysicalMaterial color={tint} transmission={0.92} thickness={0.35} ior={1.5} roughness={0.03} metalness={0} clearcoat={1} clearcoatRoughness={0.05} attenuationColor={tint} attenuationDistance={1.2} envMapIntensity={2.4} transparent opacity={0.96} side={THREE.DoubleSide} />
  return (
    <group>
      <group position={[x, y, 0]}>
        {kind === 'convex'
          ? <mesh scale={[bulge, 1, 1]}><sphereGeometry args={[h, 32, 32]} />{m}</mesh>
          : <mesh geometry={concave(h)} rotation-z={Math.PI / 2}>{m}</mesh>}
        {/* 镜框：一圈黑色的塑料框，下面一截插进支杆的柄 */}
        {frame && <mesh rotation-y={Math.PI / 2}><torusGeometry args={[h + 0.02, 0.028, 12, 56]} /><meshStandardMaterial color="#16191c" roughness={0.55} /></mesh>}
        {stand && <mesh position={[0, -h - 0.08, 0]}><cylinderGeometry args={[0.02, 0.02, 0.1, 10]} /><meshStandardMaterial color="#16191c" roughness={0.55} /></mesh>}
      </group>
      {stand && <Stand x={x} y={y - h - 0.12} />}
    </group>
  )
}

/** 一支蜡烛：底在主光轴上，高 h；h 是负数就倒过来画（倒立的像）。image 表示这是像而不是实物：不发光、没有底座；ghost 再画成半透明（虚像） */
export function Candle({ x, y, h, image = false, ghost = false }: { x: number; y: number; h: number; image?: boolean; ghost?: boolean }) {
  const up = h >= 0 ? 1 : -1, len = Math.abs(h), o = ghost ? 0.42 : image ? 0.9 : 1, w = len * 0.11 + 0.012
  return (
    <group>
      <group position={[x, y, 0]} scale={[1, up, 1]}>
        <mesh position={[0, len * 0.36, 0]}><cylinderGeometry args={[w, w, len * 0.72, 16]} />{image ? <meshBasicMaterial color={ghost ? '#bfe3ff' : '#f6e7c8'} transparent opacity={o} toneMapped={false} /> : <meshStandardMaterial color="#f3ead7" roughness={0.55} emissive="#f0c98a" emissiveIntensity={0.25} />}</mesh>
        <mesh position={[0, len * 0.745, 0]}><cylinderGeometry args={[w * 0.12, w * 0.12, len * 0.05, 5]} /><meshBasicMaterial color="#2a2018" transparent opacity={o} /></mesh>
        <mesh position={[0, len * 0.875, 0]} scale={[1, 1, 0.8]}><coneGeometry args={[w * 0.82, len * 0.25, 14]} /><meshBasicMaterial color={ghost ? '#9fd0ff' : '#ff9a2e'} transparent opacity={o} toneMapped={false} /></mesh>
        <mesh position={[0, len * 0.82, 0.004]} scale={[1, 1, 0.8]}><coneGeometry args={[w * 0.42, len * 0.13, 12]} /><meshBasicMaterial color={ghost ? '#e6f3ff' : '#fff3b0'} transparent opacity={o} toneMapped={false} /></mesh>
        {!image && <pointLight position={[0, len * 0.9, 0.25]} intensity={0.9} distance={2.2} decay={1.6} color="#ffb060" />}
        {!image && <Glow y={len * 0.86} s={len * 1.5} />}
        {/* 烛台：一只带沿的金属小碟，蜡烛立在上面 */}
        {!image && <><mesh position={[0, -0.012, 0]}><cylinderGeometry args={[w * 2.4, w * 1.9, 0.024, 24]} /><meshStandardMaterial color="#b9a26a" metalness={0.85} roughness={0.3} /></mesh><mesh position={[0, 0.004, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[w * 2.4, 0.008, 8, 28]} /><meshStandardMaterial color="#b9a26a" metalness={0.85} roughness={0.3} /></mesh></>}
      </group>
      {!image && <Stand x={x} y={y - 0.024} />}
    </group>
  )
}

/** 烛焰周围的一团光晕：一张始终朝着镜头的贴图 */
let glowTex: THREE.CanvasTexture | null = null
function Glow({ y, s }: { y: number; s: number }) {
  const tex = useMemo(() => {
    if (!glowTex) {
      const c = document.createElement('canvas'); c.width = c.height = 128
      const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
      r.addColorStop(0, 'rgba(255,220,150,0.9)'); r.addColorStop(0.25, 'rgba(255,170,70,0.35)'); r.addColorStop(1, 'rgba(255,140,40,0)')
      g.fillStyle = r; g.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace
    }
    return glowTex
  }, [])
  return <sprite position={[0, y, 0.02]} scale={[s, s, 1]}><spriteMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
}

/** 主光轴：一条细细的虚线，上面标出焦点和二倍焦距的位置 */
export function Axis({ x0, x1, y, marks = [] }: { x0: number; x1: number; y: number; marks?: number[] }) {
  return <>
    <Ray a={[x0, y]} b={[x1, y]} color="#8a96a2" r={0.0035} dash z={-0.02} />
    {marks.map(x => <mesh key={x} position={[x, y, -0.02]}><sphereGeometry args={[0.02, 12, 10]} /><meshBasicMaterial color="#ff6b4a" toneMapped={false} /></mesh>)}
  </>
}

/** 光屏：一块带边框的白板，立在滑座上 */
export function Screen({ x, y, h = 0.62 }: { x: number; y: number; h?: number }) {
  return <group>
    {/* 白屏：一块白色的板，背后一块黑底板，下面一截柄插进支杆 */}
    <mesh position={[x + 0.008, y, 0]}><boxGeometry args={[0.014, h * 2, 0.9]} /><meshStandardMaterial color="#cfcdc4" roughness={1} /></mesh>
    <mesh position={[x + 0.024, y, 0]}><boxGeometry args={[0.018, h * 2 + 0.04, 0.94]} /><meshStandardMaterial color="#16191c" roughness={0.6} /></mesh>
    <mesh position={[x + 0.024, y - h - 0.07, 0]}><cylinderGeometry args={[0.02, 0.02, 0.1, 10]} /><meshStandardMaterial color="#16191c" roughness={0.55} /></mesh>
    <Stand x={x + 0.024} y={y - h - 0.1} />
  </group>
}

/** 标尺寸的线：两头各一道短竖线，中间一条细线，画在主光轴下面 */
export function Dim({ a, b, y, color = '#c9d2da' }: { a: number; b: number; y: number; color?: string }) {
  return <>
    <Ray a={[a, y]} b={[b, y]} color={color} r={0.004} glow={false} z={0.02} />
    {[a, b].map(x => <Ray key={x} a={[x, y - 0.045]} b={[x, y + 0.045]} color={color} r={0.004} glow={false} z={0.02} />)}
  </>
}
