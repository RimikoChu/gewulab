// 各课共用的东西：三边的颜色、这一课的舞台和机位、按时长走完的动作、拼图用的三角板、正方形色板、地上的彩条、绳子、木工角尺、手套。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, Metal, type Label } from '@/lab-kit'
import { woodLight } from './mats'
import { ST, TABLE_TOP, BENCH_H, POND, type Want } from './world'

/** 三边的颜色，全实验室统一：a 蓝、b 橙、c 绿 */
export const COL = { a: '#4b8df8', b: '#f5a524', c: '#2fbf71' }
export type Side = keyof typeof COL
/** 标签：边长、面积用彩色底的标签 */
export const tagCls = (s: Side) => `scene-tag -translate-y-1/2 side-${s}`
export const sideStyle = (s: Side, extra?: React.CSSProperties): React.CSSProperties => ({ background: COL[s], color: s === 'b' ? '#3a2600' : '#fff', boxShadow: 'none', ...extra })

export const spot = (x: number, y: number, z: number, w: number, h: number, az: number, el: number) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view: [az, el] as [number, number] })
/** 各处机位：拼图类的课接近俯视，应用题用实景 */
export const SPOT = {
  l1: spot(ST.l1.x + 0.8, 0, ST.l1.z - 1.05, 6.6, 5.6, 0, 1.12),
  l2: spot(ST.l2.x + 0.3, BENCH_H, ST.l2.z + 0.02, 1.3, 0.95, 0, 1.12),
  l3: spot(ST.l3.x, TABLE_TOP, ST.l3.z - 0.02, 1.25, 1.0, 0, 1.12),
  l4: spot(ST.l4.x + 0.15, 1.1, ST.l4.z + 1.6, 4.8, 3.0, 0.48, 0.22),
  l5: spot(ST.l5.x + 1.25, 1.5, ST.l5.z, 4.0, 3.7, 0.1, 0.1),
  l6: spot(ST.l6.x + 2.0, 0.1, ST.l6.z - 1.0, 4.5, 2.5, 0, 0.62),
  l7: spot(ST.l7.x + 1.25, 0, ST.l7.z - 0.8, 2.9, 2.15, 0.08, 0.92),
  bamboo: spot(ST.bamboo.x - 0.2, 1.85, ST.bamboo.z, 4.6, 4.2, -0.25, 0.16),
  reed: spot(ST.pond.x, -1.9, ST.pond.z, 5.4, 5.0, 0, 0.2),
  flag: spot(ST.flag.x + 2.6, 6.2, ST.flag.z, 8.5, 13.8, 0.12, 0.06),
  q: spot(-2, 0.5, 3, 24, 9.5, -0.3, 0.27),
}
export type SpotKey = keyof typeof SPOT

/** 这一课的舞台：选一处机位 */
export function Place({ at, labels, want, view, children = null }: { at: SpotKey; labels: Label[]; want?: Want; view?: ReturnType<typeof spot>; children?: ReactNode }) {
  const v = view ?? SPOT[at]
  const w = useMemo<Want>(() => ({ ...want }), [want?.cut, want?.ownRope])   // eslint-disable-line react-hooks/exhaustive-deps
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={3.0} env={1.0} fog={[120, 700]} world={w}>{children}</LabStage>
}

/** 缓入缓出 */
export const ease = (t: number) => t * t * t * (t * (6 * t - 15) + 10)
/** 一个按时长走完的动作：run() 开始，k 从 0 匀速走到 1（按时间算），走完调用 onEnd。back() 退回 0 */
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
  return { k, busy, run: () => go(1), back: () => go(0), snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.k = s.current.to = v; setK(v); setBusy(false) } }
}

// ---------- 平面上的坐标 ----------
/** 平面上的一点 (u, v) 放到世界里：u 朝东（+x），v 朝北（−z），y 是高度。拼图都画在这样的平面上 */
export const onPlane = (o: [number, number, number], k: number) => (u: number, v: number, y = 0): [number, number, number] => [o[0] + u * k, o[1] + y, o[2] - v * k]

/** 平面上一条彩色的线：从 p 到 q，宽 w，厚 h，贴在 y 上 */
export function Strip({ p, q, w, h = 0.004, color, y = 0, glow = false }: { p: [number, number]; q: [number, number]; w: number; h?: number; color: string; y?: number; glow?: boolean }) {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]), ang = Math.atan2(q[1] - p[1], q[0] - p[0])
  return <mesh position={[(p[0] + q[0]) / 2, y + h / 2, -(p[1] + q[1]) / 2]} rotation-y={ang} castShadow={h > 0.01} receiveShadow>
    <boxGeometry args={[len + w, h, w]} />{glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshStandardMaterial color={color} roughness={0.5} />}
  </mesh>
}

/** 平面上的一块多边形板（顶点按 (u, v)），厚 h，顶面在 y + h */
export function PolySlab({ pts, h, y = 0, color, opacity = 1, emissive = 0 }: { pts: [number, number][]; h: number; y?: number; color: string; opacity?: number; emissive?: number }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)))
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g
  }, [pts.map(p => p.join(',')).join(';'), h])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} position={[0, y, 0]} renderOrder={opacity < 1 ? 4 : 0} receiveShadow castShadow={opacity === 1}>
    <meshStandardMaterial color={color} roughness={0.45} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} emissive={color} emissiveIntensity={emissive} />
  </mesh>
}

// ---------- 三角板 ----------
/**
 * 一块直角三角板：直角在原点，长 a 的直角边朝 +u，长 b 的朝 +v，厚 t。板边磨了倒角；顶面三条边各镶一道彩条（a 蓝、b 橙、c 绿）。
 * 单位由外面的 scale 决定。tint：板的颜色（木色，或赵爽弦图的朱红）
 */
export function TriPiece({ a, b, t, tint, map = true, inset }: { a: number; b: number; t: number; tint: string; map?: boolean; inset?: number }) {
  const wood = woodLight()
  const e = inset ?? Math.min(a, b) * 0.035
  const geo = useMemo(() => {
    const bev = t * 0.18
    const s = new THREE.Shape([new THREE.Vector2(bev, bev), new THREE.Vector2(a - bev * 2.4, bev), new THREE.Vector2(bev, b - bev * 2.4)])
    const g = new THREE.ExtrudeGeometry(s, { depth: t - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2 })
    g.translate(0, 0, bev); g.rotateX(-Math.PI / 2)
    // 贴图按 u 方向铺木纹
    const p = g.attributes.position, uv = g.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (a + b) * 1.4, -p.getZ(i) / (a + b) * 0.7)
    return g
  }, [a, b, t])
  const w = Math.min(a, b) * 0.05, y = t + 0.0005
  // 三道彩条：沿三条边往里收一点
  const c = Math.hypot(a, b), nx = b / c, ny = a / c   // 斜边朝里的法线是 (−nx, −ny)
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial map={map ? wood : null} color={tint} roughness={map ? 0.62 : 0.38} /></mesh>
    <Strip p={[e * 2, e]} q={[a - e * 4.2, e]} w={w} color={COL.a} y={y} h={0.0012} glow />
    <Strip p={[e, e * 2]} q={[e, b - e * 4.2]} w={w} color={COL.b} y={y} h={0.0012} glow />
    <Strip p={[a - e * 3.2 - nx * e * 0.4, e * 0.8]} q={[e * 0.8, b - e * 3.2 - ny * e * 0.4]} w={w} color={COL.c} y={y} h={0.0012} glow />
  </group>
}

// ---------- 绳子 ----------
/** 一根绳子：过几个点的折线，每个点上可以打结 */
export function Rope({ pts, r = 0.008, color = '#d8c9a3', knots = [] as [number, number, number][] }: { pts: [number, number, number][]; r?: number; color?: string; knots?: [number, number, number][] }) {
  const geo = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i]), new THREE.Vector3(...pts[i + 1])))
    return new THREE.TubeGeometry(path as unknown as THREE.Curve<THREE.Vector3>, Math.max(8, pts.length * 4), r, 8, false)
  }, [pts.map(p => p.map(v => v.toFixed(4)).join(',')).join(';'), r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>
    <mesh geometry={geo} castShadow><meshStandardMaterial color={color} roughness={0.95} /></mesh>
    {knots.map((k, i) => <mesh key={i} position={k} castShadow><sphereGeometry args={[r * 2.3, 12, 10]} /><meshStandardMaterial color="#8a5a2a" roughness={0.9} /></mesh>)}
  </group>
}

// ---------- 木工角尺 ----------
/** 木工角尺：一长一短两条钢尺成直角，长边 L，短边 S，宽 w；刻度是一道道细线。直角在原点，长边朝 +u，短边朝 +v，平放 */
export function Square({ L = 0.6, S = 0.4, w = 0.04 }: { L?: number; S?: number; w?: number }) {
  const ticks = useMemo(() => {
    const out: [number, number, number][] = []
    for (let k = 1; k * 0.02 < L - 0.01; k++) out.push([k * 0.02, k % 5 === 0 ? w * 0.55 : w * 0.3, 0])
    for (let k = 1; k * 0.02 < S - 0.01; k++) out.push([k * 0.02, k % 5 === 0 ? w * 0.55 : w * 0.3, 1])
    return out
  }, [L, S, w])
  return <group>
    <mesh position={[L / 2, 0.002, -w / 2]} castShadow><boxGeometry args={[L, 0.004, w]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[w / 2, 0.002, -S / 2]} castShadow><boxGeometry args={[w, 0.004, S]} /><Metal kind="stainless" grain="brushed" /></mesh>
    {ticks.map(([d, l, side], i) => side === 0
      ? <mesh key={i} position={[d, 0.0042, -l / 2]}><boxGeometry args={[0.0012, 0.0005, l]} /><meshBasicMaterial color="#222" /></mesh>
      : <mesh key={i} position={[l / 2, 0.0042, -d]}><boxGeometry args={[l, 0.0005, 0.0012]} /><meshBasicMaterial color="#222" /></mesh>)}
  </group>
}

// ---------- 手套 ----------
/**
 * 一只摊平的帆布手套，掌心朝下按在东西上：手指朝 −z，袖子朝 +z 往上斜着伸出去（看得出是一个人伸手过来）。手掌中心在原点，尺寸是真人的（掌宽约 9 cm）
 */
export function Glove({ tint = '#c4ae86', arm = 0.32 }: { tint?: string; arm?: number }) {
  const knit = <meshStandardMaterial color={tint} roughness={0.95} />
  return <group>
    <RoundedBox args={[0.088, 0.032, 0.1]} radius={0.014} smoothness={3} position={[0, 0.018, 0]} castShadow>{knit}</RoundedBox>
    {[-0.031, -0.011, 0.01, 0.03].map((x, i) => <mesh key={x} position={[x, 0.014, -0.07 - (i === 1 || i === 2 ? 0.008 : 0)]} rotation-x={Math.PI / 2 + 0.12} castShadow><capsuleGeometry args={[0.0095, 0.05 + (i === 1 || i === 2 ? 0.012 : 0), 4, 10]} />{knit}</mesh>)}
    <mesh position={[0.055, 0.014, -0.01]} rotation={[Math.PI / 2, 0, -0.7]} castShadow><capsuleGeometry args={[0.011, 0.04, 4, 10]} />{knit}</mesh>
    {/* 袖口一道蓝边，再接一截工装袖子，越远越淡 */}
    <group position={[0, 0.03, 0.06]} rotation-x={-0.35}>
      <mesh position={[0, 0, 0.02]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.042, 0.04, 0.04, 20]} />{knit}</mesh>
      <mesh position={[0, 0, 0.045]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.043, 0.043, 0.012, 20]} /><meshStandardMaterial color="#2f5d8a" roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.05 + arm / 2]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.046, 0.055, arm, 20]} /><meshStandardMaterial color="#3d5a73" roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.05 + arm + 0.06]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.055, 0.06, 0.12, 20]} /><meshStandardMaterial color="#3d5a73" roughness={0.9} transparent opacity={0.4} depthWrite={false} /></mesh>
    </group>
  </group>
}

/**
 * 拼图时手套放在哪：按住三角板离图形中心最远的那个角，袖子朝外伸出去，不盖住中间的正方形。
 * pts 是三角板的三个顶点，center 是整幅图的中心（都是平面坐标）；返回手掌的平面位置和手套绕 y 轴的转角
 */
export function gripAt(pts: [number, number][], center: [number, number], inset: number) {
  let far = pts[0], best = -1
  for (const p of pts) { const d = Math.hypot(p[0] - center[0], p[1] - center[1]); if (d > best) { best = d; far = p } }
  const dx = far[0] - center[0], dy = far[1] - center[1], l = Math.hypot(dx, dy) || 1
  return { u: far[0] - dx / l * inset, v: far[1] - dy / l * inset, yaw: Math.atan2(dx, -dy) }
}

/** 池塘里的水面高度（拓展课用） */
export const WATER_Y = POND.water
