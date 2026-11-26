// 神经冲动的画法：沿着神经走的发光光点。
// Route 是一条连起来的路（若干段曲线首尾相接），按弧长等分成表；Impulse 是一个由课里给进度 s 的光点，后面拖一条光尾，
// 走过的那一截神经亮起来；Chatter 是全身神经里时不时跑过的小光点，让人体“活着”。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { curveOf, type V3 } from './sdf'

const N = 600
export interface Route { curve: THREE.CurvePath<THREE.Vector3>; len: number; table: THREE.Vector3[]; at: (s: number, out?: THREE.Vector3) => THREE.Vector3 }
/** 把几段折线连成一条路：每段各自平滑，首尾相接 */
export function route(...legs: V3[][]): Route {
  const curve = new THREE.CurvePath<THREE.Vector3>()
  for (const l of legs) if (l.length > 1) curve.add(l.length === 2 ? new THREE.LineCurve3(new THREE.Vector3(...l[0]), new THREE.Vector3(...l[1])) : curveOf(l, 0.5))
  const table = curve.getSpacedPoints(N), len = curve.getLength()
  const at = (s: number, out = new THREE.Vector3()) => { const x = Math.min(1, Math.max(0, s)) * N, a = Math.floor(x), f = x - a; return out.copy(table[a]).lerp(table[Math.min(N, a + 1)], f) }
  return { curve, len, table, at }
}
/** 这条路上离某一点最近的位置（0–1） */
export function sOf(r: Route, p: V3) { let bi = 0, bd = 1e9; const v = new THREE.Vector3(...p); r.table.forEach((q, i) => { const d = q.distanceToSquared(v); if (d < bd) { bd = d; bi = i } }); return bi / N }

const halo = new THREE.SphereGeometry(1, 20, 14)
/**
 * 一个神经冲动：s 从 0 走到 1。size 是光点的半径；color 光的颜色；lit 为真时走过的那一截路一直亮着（细的发光管）。
 * 光点本身不受色调映射，亮到会溢出光晕（舞台开了泛光）
 */
export function Impulse({ path, s, size = 0.08, color = '#9ff6ff', lit = true, width }: { path: Route; s: number; size?: number; color?: string; lit?: boolean; width?: number }) {
  const g = useRef<THREE.Group>(null), tail = useRef<THREE.InstancedMesh>(null)
  const T = 14
  const tube = useMemo(() => new THREE.TubeGeometry(path.curve, N, width ?? size * 0.32, 8), [path, size, width])
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), sc: new THREE.Vector3() }), [])
  const col = useMemo(() => new THREE.Color(color), [color])
  useEffect(() => { const total = tube.index!.count; tube.setDrawRange(0, Math.floor(total * Math.min(1, Math.max(0, s)) / 6) * 6) }, [tube, s])
  useFrame(st => {
    const on = s > 0 && s < 1
    if (g.current) { path.at(s, g.current.position); g.current.visible = on; const k = 1 + 0.18 * Math.sin(st.clock.elapsedTime * 22); g.current.scale.setScalar(k) }
    const m = tail.current; if (!m) return
    for (let i = 0; i < T; i++) {
      const ss = s - (i + 1) * 0.0035 * (0.6 / Math.max(0.3, path.len / 8))
      path.at(ss, tmp.v)
      m.setMatrixAt(i, tmp.m.compose(tmp.v, tmp.q, tmp.sc.setScalar(on && ss > 0 ? size * (1 - i / T) * 0.8 : 1e-4)))
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <group>
    <group ref={g}>
      <mesh geometry={halo} scale={size} renderOrder={9}><meshBasicMaterial color={col.clone().multiplyScalar(2.4)} toneMapped={false} /></mesh>
      <mesh geometry={halo} scale={size * 2.6} renderOrder={9}><meshBasicMaterial color={col} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
    </group>
    <instancedMesh ref={tail} args={[halo, undefined, T]} frustumCulled={false} renderOrder={9}><meshBasicMaterial color={col.clone().multiplyScalar(1.3)} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></instancedMesh>
    {lit && s > 0 && <mesh geometry={tube} renderOrder={8}><meshBasicMaterial color={col.clone().multiplyScalar(0.9)} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>}
  </group>
}

let GLOW: THREE.Texture | null = null
/** 一团柔和的光：中间亮、往外淡掉 */
const glowTex = () => {
  if (GLOW) return GLOW
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  return (GLOW = new THREE.CanvasTexture(c))
}
/** 一处感受器或效应器“响应了”：一团光一下一下往外扩开、淡掉 */
export function Flash({ at, on, r = 0.3, color = '#9ff6ff' }: { at: V3; on: boolean; r?: number; color?: string }) {
  const m = useRef<THREE.Sprite>(null), t0 = useRef(-1)
  useFrame(st => {
    if (!m.current) return
    if (on && t0.current < 0) t0.current = st.clock.elapsedTime
    if (!on) t0.current = -1
    const t = t0.current < 0 ? 1 : ((st.clock.elapsedTime - t0.current) % 0.9) / 0.9
    m.current.visible = on; m.current.scale.setScalar(r * (1.2 + t * 2.2)); (m.current.material as THREE.SpriteMaterial).opacity = 0.9 * (1 - t) ** 1.5
  })
  return <sprite ref={m} position={at} renderOrder={10}><spriteMaterial map={glowTex()} color={color} transparent blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} /></sprite>
}

/** 一群小光点在很多条路上来回跑：n 每条路上几颗；rate 每秒走过一条路的几分之几；on 为假时都藏起来 */
export function Chatter({ paths, n = 2, rate = 0.25, size = 0.035, color = '#ffe2a0', on = true }: { paths: Route[]; n?: number; rate?: number; size?: number; color?: string; on?: boolean }) {
  const m = useRef<THREE.InstancedMesh>(null)
  const st = useMemo(() => { let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; return paths.flatMap(p => Array.from({ length: n }, () => ({ p, s: rnd(), v: rate * (0.6 + rnd() * 0.8) * 8 / Math.max(2, p.len), dir: rnd() < 0.5 ? 1 : -1 }))) }, [paths, n, rate])
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), sc: new THREE.Vector3() }), [])
  const col = useMemo(() => new THREE.Color(color).multiplyScalar(1.6), [color])
  useFrame((_, dt0) => {
    const mm = m.current; if (!mm) return
    const dt = Math.min(dt0, 1 / 30)
    st.forEach((d, i) => {
      d.s += d.v * dt; if (d.s > 1) d.s -= 1
      const s = d.dir > 0 ? d.s : 1 - d.s, fade = Math.min(1, d.s / 0.08, (1 - d.s) / 0.08)
      d.p.at(s, tmp.v); mm.setMatrixAt(i, tmp.m.compose(tmp.v, tmp.q, tmp.sc.setScalar(on ? size * Math.max(0.05, fade) : 1e-4)))
    })
    mm.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={m} args={[halo, undefined, Math.max(1, st.length)]} frustumCulled={false} renderOrder={8}><meshBasicMaterial color={col} toneMapped={false} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} /></instancedMesh>
}
