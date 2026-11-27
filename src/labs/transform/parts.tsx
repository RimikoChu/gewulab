// 各课共用的东西：全实验室统一的颜色、这一课的舞台和机位、按时长走完的动作、平面上的图形板、虚线、点、角弧、手套、剪刀、黄铜钉。
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Line, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, Metal, lathe, type Label } from '@/lab-kit'
import type { P } from './physics'
import { ST } from './world'

/** 全实验室统一的颜色：原图蓝、像橙、辅助线白色细虚线、对称轴紫色虚线 */
export const COL = { src: '#3b7cf6', img: '#f7962f', aux: '#ffffff', axis: '#c58cff', srcDeep: '#2457c4', imgDeep: '#c8661a' }
export type Who = 'src' | 'img'
/** 原图和像的花砖：钴蓝釉白花、琥珀釉白花，侧面是砖坯色 */
export const TILE = { src: { base: '#2a62c4', ink: '#f3f0e6', light: '#9cc2ff' }, img: { base: '#e58a2c', ink: '#fff3df', light: '#8a3a0a' }, body: '#c89a72' }
/** 画面上点名的标签：原图的点蓝底，像的点橙底 */
export const tagStyle = (w: Who | 'axis', extra?: CSSProperties): CSSProperties => ({ background: w === 'axis' ? '#7d4bc9' : COL[w], color: '#fff', boxShadow: 'none', ...extra })
export const pt = (w: Who, i: number) => `${'ABCD'[i]}${w === 'img' ? '′' : ''}`

export const spot = (x: number, y: number, z: number, w: number, h: number, az: number, el: number) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view: [az, el] as [number, number] })
/** 各处机位：图形课接近俯视，图形占画面中间；风车板平视 */
export const SPOT = {
  l1: spot(ST.l1.x + 1.25, 0, ST.l1.z - 0.95, 3.4, 2.55, 0.28, 0.9),
  l2: spot(ST.l2.x + 0.02, ST.l2.y, ST.l2.z + 0.01, 0.46, 0.36, 0.22, 0.88),
  l3: spot(ST.l3.x, ST.l3.y, ST.l3.z - 0.02, 1.5, 1.15, 0.22, 0.95),
  l4: spot(ST.l4.x + 0.03, ST.l4.y + 0.02, ST.l4.z + 0.05, 0.95, 0.85, 0.3, 0.16),
  l5: spot(ST.l5.x + 0.07, ST.l5.y, ST.l5.z - 0.01, 0.85, 0.62, 0.22, 0.95),
  l6: spot(ST.l6.x + 0.06, ST.l6.y, ST.l6.z + 0.03, 0.74, 0.56, 0.22, 0.95),
  l7: spot(ST.l7.x + 0.02, ST.l7.y, ST.l7.z - 0.02, 1.08, 0.78, 0, 1.08),
  tuan: spot(ST.tuan.x, ST.tuan.y, ST.tuan.z, 0.32, 0.26, 0.22, 0.92),
  tess: spot(ST.tess.x + 0.05, 0, ST.tess.z - 0.1, 2.3, 1.75, 0.28, 0.95),
  q: spot(0.5, 1.4, -3.8, 9, 4.8, -0.12, 0.2),
}
export type SpotKey = keyof typeof SPOT

/** 这一课的舞台：选一处机位。室内自己打光（studio），阳光从东南的窗口斜进来 */
export function Place({ at, labels, view, children = null }: { at: SpotKey; labels: Label[]; view?: ReturnType<typeof spot>; children?: ReactNode }) {
  const v = view ?? SPOT[at]
  return <LabStage labels={labels} target={v.target} span={v.span} view={v.view} sun={2.6} env={0.75} studio sky={false} backdrop="#17130f" fog={[60, 160]}>{children}</LabStage>
}

/** 缓入缓出 */
export const ease = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * x * (x * (6 * x - 15) + 10) }
/** 把 0–1 的进度切成一段：k 在 [a, b] 里从 0 走到 1 */
export const seg = (k: number, a: number, b: number) => Math.min(1, Math.max(0, (k - a) / (b - a)))
/** 一个按时长走完的动作：run() 开始，k 从 0 匀速走到 1（按时间算），走完调用 onEnd。同一个动作可以反复 run，每次都从 0 走起 */
export function useRun(sec: number, onEnd?: () => void) {
  const [k, setK] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ k: 0, to: 0, raf: 0 }), cb = useRef(onEnd); cb.current = onEnd
  const go = (to: number) => {
    cancelAnimationFrame(s.current.raf); s.current.to = to; setBusy(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const q = s.current, d = q.to - q.k
      q.k = Math.abs(d) <= dt / sec ? q.to : q.k + Math.sign(d) * dt / sec; setK(q.k)
      if (q.k !== q.to) q.raf = requestAnimationFrame(f); else { setBusy(false); cb.current?.() }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  return { k, busy, run: () => { s.current.k = 0; setK(0); go(1) }, back: () => go(0), snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.k = s.current.to = v; setK(v); setBusy(false) } }
}

// ---------- 平面 ----------
/**
 * 一张画图的平面：flat 是平放在台面上的（u 朝东、v 朝北），否则是竖着朝南的墙板（u 朝东、v 朝上）。
 * 平面里的东西用本地坐标：x = u × k，y = v × k，z 是离开平面的高度（m）。
 */
export function Plane({ o, flat = true, children }: { o: [number, number, number]; flat?: boolean; children: ReactNode }) {
  return <group position={o} rotation-x={flat ? -Math.PI / 2 : 0}>{children}</group>
}
/** 平面上的点 (u, v) 加高度 h 换成世界坐标：标签用 */
export const toWorld = (o: [number, number, number], k: number, flat = true) => (u: number, v: number, h = 0): [number, number, number] =>
  flat ? [o[0] + u * k, o[1] + h, o[2] - v * k] : [o[0] + u * k, o[1] + v * k, o[2] + h]

/** 带孔的多边形做成 Shape：点按格，k 是一格多长 */
export function shapeOf(pts: P[], k: number, holes: P[][] = []) {
  const s = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u * k, v * k)))
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u * k, v * k))))
  return s
}

/**
 * 平面上的一块图形板：釉面砖片、纸片、木片都用它。底面在 z = 0，厚 t，四周带一圈小倒角。
 * kind：glaze 釉面（亮、有清漆），paper 纸（哑光、很薄），wood 木片。
 * map：顶面的贴图；uvBox：贴图铺满的范围 [u0, v0, u1, v1]（格），不给就按实际尺寸 cell（m）一张。side：侧面的颜色（砖坯、木芯），不给就和顶面一样
 */
export function Fig({ pts, k, t, color, holes = [], kind = 'glaze', opacity = 1, map, bevel, uvBox, side, cell = 0.25 }: { pts: P[]; k: number; t: number; color: string; holes?: P[][]; kind?: 'glaze' | 'paper' | 'wood'; opacity?: number; map?: THREE.Texture | null; bevel?: number; uvBox?: [number, number, number, number]; side?: string; cell?: number }) {
  const geo = useMemo(() => {
    const b = bevel ?? (kind === 'paper' ? 0 : Math.min(t * 0.35, 0.004))
    const g = new THREE.ExtrudeGeometry(shapeOf(pts, k, holes), { depth: Math.max(1e-4, t - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 4 })
    g.translate(0, 0, b)
    const p = g.attributes.position, uv = g.attributes.uv
    for (let i = 0; i < p.count; i++) {
      if (uvBox) uv.setXY(i, (p.getX(i) / k - uvBox[0]) / (uvBox[2] - uvBox[0]), (p.getY(i) / k - uvBox[1]) / (uvBox[3] - uvBox[1]))
      else uv.setXY(i, p.getX(i) / cell, p.getY(i) / cell)
    }
    return g
  }, [pts.map(p => p.join(',')).join(';'), holes.map(h => h.map(p => p.join(',')).join(';')).join('|'), k, t, kind, bevel, uvBox?.join(','), cell])   // eslint-disable-line react-hooks/exhaustive-deps
  const clear = opacity < 1
  const mats = useMemo(() => {
    const common = { color: new THREE.Color(color), transparent: clear, opacity, depthWrite: !clear, map: map ?? null }
    const top = kind === 'glaze'
      ? new THREE.MeshPhysicalMaterial({ ...common, roughness: 0.18, clearcoat: 0.9, clearcoatRoughness: 0.08 })
      : new THREE.MeshStandardMaterial({ ...common, roughness: kind === 'paper' ? 0.82 : 0.6, side: kind === 'paper' ? THREE.DoubleSide : THREE.FrontSide })
    if (!side) return top
    return [top, new THREE.MeshStandardMaterial({ color: new THREE.Color(side), roughness: 0.85, transparent: clear, opacity, depthWrite: !clear })]
  }, [color, clear, opacity, map, kind, side])
  useEffect(() => () => { (Array.isArray(mats) ? mats : [mats]).forEach(m => m.dispose()) }, [mats])
  return <mesh geometry={geo} material={mats} castShadow={!clear} receiveShadow renderOrder={clear ? 3 : 0} />
}

/** 平面上的一条线（点按格）：dashed 是虚线；w 是线宽（像素）。不被台面挡住 */
export function PLine({ pts, k, z = 0.002, color = COL.aux, w = 2, dashed = true, dash = 0.012, opacity = 1 }: { pts: P[]; k: number; z?: number; color?: string; w?: number; dashed?: boolean; dash?: number; opacity?: number }) {
  if (pts.length < 2 || opacity <= 0.01) return null
  return <Line points={pts.map(([u, v]) => [u * k, v * k, z] as [number, number, number])} color={color} lineWidth={w} dashed={dashed} dashSize={dash} gapSize={dash * 0.75} transparent opacity={opacity} depthTest={false} renderOrder={20} />
}

/** 平面上的一个点：白边彩心的小圆钉 */
export function Dot({ at, k, z = 0, who, r = 0.006, opacity = 1 }: { at: P; k: number; z?: number; who: Who | 'aux'; r?: number; opacity?: number }) {
  if (opacity <= 0.01) return null
  const c = who === 'aux' ? '#ffffff' : COL[who]
  return <group position={[at[0] * k, at[1] * k, z]} rotation-x={Math.PI / 2}>
    <mesh position={[0, r * 0.3, 0]} renderOrder={21}><cylinderGeometry args={[r * 1.45, r * 1.45, r * 0.6, 24]} /><meshBasicMaterial color="#ffffff" transparent opacity={opacity} depthTest={false} /></mesh>
    <mesh position={[0, r * 0.65, 0]} renderOrder={22}><cylinderGeometry args={[r, r, r * 0.3, 24]} /><meshBasicMaterial color={c} transparent opacity={opacity} depthTest={false} toneMapped={false} /></mesh>
  </group>
}

/** 角弧：以 o 为圆心、半径 r（格），从角 a0 转到 a1（度，逆时针） */
export function Arc({ o, r, a0, a1, k, z = 0.003, color = '#ffe9a8', w = 2.5, opacity = 1 }: { o: P; r: number; a0: number; a1: number; k: number; z?: number; color?: string; w?: number; opacity?: number }) {
  const pts = useMemo(() => { const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 4)); return Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [o[0] + r * Math.cos(a), o[1] + r * Math.sin(a)] as P }) }, [o[0], o[1], r, a0, a1])   // eslint-disable-line react-hooks/exhaustive-deps
  return <PLine pts={pts} k={k} z={z} color={color} w={w} dashed={false} opacity={opacity} />
}

/** 直角记号：在 foot 处，两条边沿 d1、d2 方向（单位向量），边长 s（格） */
export function RightMark({ foot, d1, d2, s, k, z = 0.003, opacity = 1 }: { foot: P; d1: P; d2: P; s: number; k: number; z?: number; opacity?: number }) {
  const a: P = [foot[0] + d1[0] * s, foot[1] + d1[1] * s], b: P = [a[0] + d2[0] * s, a[1] + d2[1] * s], c: P = [foot[0] + d2[0] * s, foot[1] + d2[1] * s]
  return <PLine pts={[a, b, c]} k={k} z={z} color="#ffe9a8" w={2} dashed={false} opacity={opacity} />
}

// ---------- 手套 ----------
/**
 * 一只帆布手套，掌心朝下按在东西上：手指朝 −z，袖子朝 +z 往上斜着伸出去（看得出是一个人伸手过来）。手掌中心在原点，尺寸是真人的（掌宽约 9 cm）。
 * 放在平面里用时，外面再转一下，让 y 朝上。
 */
export function Glove({ tint = '#cdb68e', arm = 0.34 }: { tint?: string; arm?: number }) {
  const knit = <meshStandardMaterial color={tint} roughness={0.95} />
  return <group>
    <RoundedBox args={[0.088, 0.032, 0.1]} radius={0.014} smoothness={3} position={[0, 0.018, 0]} castShadow>{knit}</RoundedBox>
    {[-0.031, -0.011, 0.01, 0.03].map((x, i) => <mesh key={x} position={[x, 0.014, -0.07 - (i === 1 || i === 2 ? 0.008 : 0)]} rotation-x={Math.PI / 2 + 0.12} castShadow><capsuleGeometry args={[0.0095, 0.05 + (i === 1 || i === 2 ? 0.012 : 0), 4, 10]} />{knit}</mesh>)}
    <mesh position={[0.055, 0.014, -0.01]} rotation={[Math.PI / 2, 0, -0.7]} castShadow><capsuleGeometry args={[0.011, 0.04, 4, 10]} />{knit}</mesh>
    {/* 指尖和掌心磨旧的深色 */}
    {[-0.031, -0.011, 0.01, 0.03].map((x, i) => <mesh key={`t${x}`} position={[x, 0.016, -0.1 - (i === 1 || i === 2 ? 0.014 : 0)]}><sphereGeometry args={[0.0098, 10, 8]} /><meshStandardMaterial color="#a58f6a" roughness={1} /></mesh>)}
    {/* 袖口一道蓝边，再接一截靛蓝的工装袖子，越远越淡 */}
    <group position={[0, 0.03, 0.06]} rotation-x={-0.35}>
      <mesh position={[0, 0, 0.02]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.042, 0.04, 0.04, 20]} />{knit}</mesh>
      <mesh position={[0, 0, 0.045]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.043, 0.043, 0.012, 20]} /><meshStandardMaterial color="#2f5d8a" roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.05 + arm / 2]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.046, 0.055, arm, 20]} /><meshStandardMaterial color="#2c3d5c" roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.05 + arm + 0.06]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.055, 0.06, 0.12, 20]} /><meshStandardMaterial color="#2c3d5c" roughness={0.9} transparent opacity={0.4} depthWrite={false} /></mesh>
    </group>
  </group>
}
/** 在平面里放一只手套：at 是掌心位置（m），yaw 是手指朝向（弧度，0 朝 +v） */
export function GloveOn({ x, y, yaw = 0, lift = 0, scale = 1, arm = 0.16 }: { x: number; y: number; yaw?: number; lift?: number; scale?: number; arm?: number }) {
  return <group position={[x, y, lift]} rotation-z={yaw}><group rotation-x={Math.PI / 2} scale={scale}><Glove arm={arm} /></group></group>
}

// ---------- 剪刀 ----------
/**
 * 剪纸用的剪刀：两片钢刃（一面磨出刃口），中间一颗铆钉，后面两个黑漆的环把。平放，刀尖朝 +x，铆钉在原点。open 是张开的角度（弧度）
 */
export function Scissors({ open = 0.25 }: { open?: number }) {
  const blade = useMemo(() => {
    const s = new THREE.Shape([new THREE.Vector2(-0.012, -0.004), new THREE.Vector2(0.03, -0.0055), new THREE.Vector2(0.085, -0.002), new THREE.Vector2(0.1, 0.0005), new THREE.Vector2(0.05, 0.0035), new THREE.Vector2(-0.012, 0.0045)])
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.0016, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0006, bevelSegments: 1 }); return g
  }, [])
  const shank = useMemo(() => {
    const s = new THREE.Shape([new THREE.Vector2(-0.012, -0.004), new THREE.Vector2(-0.045, -0.009), new THREE.Vector2(-0.048, -0.004), new THREE.Vector2(-0.012, 0.004)])
    return new THREE.ExtrudeGeometry(s, { depth: 0.0022, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0006, bevelSegments: 1 })
  }, [])
  const rivet = useMemo(() => lathe([[0, 0], [0.0042, 0], [0.0042, 0.0006], [0.0032, 0.0016], [0, 0.0019]], { segs: 24 }), [])
  const half = (s: number) => <group rotation-z={s * open / 2} position={[0, 0, s > 0 ? 0.0018 : 0]}>
    <mesh geometry={blade} castShadow><Metal kind="steel" grain="brushed" rough={0.22} /></mesh>
    <mesh geometry={shank} castShadow><meshStandardMaterial color="#1b1b1d" roughness={0.35} metalness={0.4} /></mesh>
    {/* 环把：一个扁的圆环 */}
    <mesh position={[-0.062, s * -0.012, 0.0011]} scale={[1.25, 1, 1]} castShadow><torusGeometry args={[0.0155, 0.0036, 10, 28]} /><meshStandardMaterial color="#1b1b1d" roughness={0.35} metalness={0.4} /></mesh>
  </group>
  return <group>
    {half(1)}{half(-1)}
    <mesh geometry={rivet} rotation-x={Math.PI / 2} position={[0, 0, 0.0042]}><Metal kind="brass" grain="turned" /></mesh>
  </group>
}

/** 黄铜钉：钉帽带倒角，旋转中心用它标出来。立在平面上，z 朝外 */
export function BrassPin({ r = 0.009 }: { r?: number }) {
  const geo = useMemo(() => lathe([[0, 0], [r, 0], [r, r * 0.35], [r * 0.82, r * 0.7], [r * 0.4, r * 0.82], [0, r * 0.86]], { segs: 32 }), [r])
  return <mesh geometry={geo} rotation-x={Math.PI / 2} castShadow><Metal kind="brass" grain="turned" rough={0.2} /></mesh>
}
