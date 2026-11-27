// 把看不见的东西画出来：发光的粒子和它的拖尾、电子束的辉光、垂直纸面的磁场（× 和 ·）、立体的磁感线、电场线、
// 力和速度的箭头。颜色全间统一（layout.ts 的 COL）。
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ForceArrow } from '@/lab-kit'
import { COL } from './layout'
import { makeFieldMark } from './mats'
import type { V3 } from './physics'

/** 粒子在时刻 t 的位置；还没出发或已经结束时返回 null */
export type PathFn = (t: number) => V3 | null

/**
 * 一颗发光的粒子带一条渐暗的拖尾。pos(t) 给出位置，clock() 给出现在的时刻（秒，画面里的时间）。
 * 拖尾就是它在过去 tail 秒里走过的地方，一串由大到小、由亮到暗的小球；配合泛光看着像一道光。
 */
export function Comet({ pos, clock, color, size = 0.006, tail = 0.5, n = 36 }: { pos: PathFn; clock: () => number; color: string; size?: number; tail?: number; n?: number }) {
  const head = useRef<THREE.Group>(null), inst = useRef<THREE.InstancedMesh>(null)
  const m = useMemo(() => new THREE.Matrix4(), []), c = useMemo(() => new THREE.Color(), []), base = useMemo(() => new THREE.Color(color), [color])
  const f = useRef(pos); f.current = pos
  const clk = useRef(clock); clk.current = clock
  // 每颗小球的颜色要在第一次画之前就备好，着色器才会带上逐个的颜色
  useLayoutEffect(() => { const im = inst.current; if (im && !im.instanceColor) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3) }, [n])
  useFrame(() => {
    const t = clk.current(), p = f.current(t), im = inst.current
    if (head.current) { head.current.visible = !!p; if (p) head.current.position.set(...p) }
    if (!im) return
    for (let i = 0; i < n; i++) {
      const q = f.current(t - (i + 1) / n * tail), k = 1 - i / n
      if (!q) { m.makeScale(0, 0, 0); im.setMatrixAt(i, m); continue }
      const s = size * (0.25 + 0.6 * k)
      m.makeScale(s, s, s).setPosition(...q); im.setMatrixAt(i, m)
      c.copy(base).multiplyScalar(0.15 + 0.85 * k * k); im.setColorAt(i, c)
    }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true
  })
  return <group>
    <group ref={head}>
      <mesh renderOrder={8}><sphereGeometry args={[size, 16, 12]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      <mesh renderOrder={8} scale={1.9}><sphereGeometry args={[size, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    </group>
    <instancedMesh ref={inst} args={[undefined, undefined, n]} renderOrder={7} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial toneMapped={false} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  </group>
}

/** 一道发光的轨迹（电子束在气体里的辉光、荧光屏上的亮线）：细的亮芯加一层宽的光晕。pts 是途经的点 */
export function Glow({ pts, color = COL.glow, r = 0.0016, level = 1, halo = 4 }: { pts: V3[]; color?: string; r?: number; level?: number; halo?: number }) {
  const geo = useMemo(() => {
    if (pts.length < 2) return null
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)))
    const seg = Math.min(600, pts.length * 3)
    return { core: new THREE.TubeGeometry(c, seg, r, 8), halo: new THREE.TubeGeometry(c, seg, r * halo, 10) }
  }, [JSON.stringify(pts), r, halo])   // eslint-disable-line react-hooks/exhaustive-deps
  if (!geo || level < 0.01) return null
  return <group>
    <mesh geometry={geo.core} renderOrder={6}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={level} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    <mesh geometry={geo.halo} renderOrder={5}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.16 * level} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
  </group>
}

/**
 * 垂直纸面的匀强磁场：一块 w × h 的面上一格一个符号（× 向里，· 向外），间距 step。面默认在 x–y 平面里、朝 +z，
 * 用 position、rotation 摆到别处。opacity 0 时不画。
 */
export function FieldMarks({ w, h, kind, step = 0.02, opacity = 1, color = COL.B, ...rest }: { w: number; h: number; kind: 'in' | 'out'; step?: number; opacity?: number; color?: string } & Record<string, unknown>) {
  const map = useMemo(() => { const t = makeFieldMark(kind, color).clone(); t.repeat.set(w / step, h / step); t.offset.set(0.5 - ((w / step) % 1) / 2, 0.5 - ((h / step) % 1) / 2); t.needsUpdate = true; return t }, [kind, color, w, h, step])
  if (opacity < 0.01) return null
  return <mesh {...rest} renderOrder={4}><planeGeometry args={[w, h]} /><meshBasicMaterial map={map} transparent opacity={0.85 * opacity} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
}

/**
 * 立体的磁感线：一组平行的细线，各带一个箭头，沿 dir（+1 向上，−1 向下）穿过 y0 到 y1。
 * spots 是每根线在水平面上的位置 [x, z]。箭头沿线慢慢移动，看得出方向。
 */
export function FieldLines({ spots, y0, y1, dir, opacity = 1, color = COL.B, r = 0.0012, head = 0.012 }: { spots: [number, number][]; y0: number; y1: number; dir: 1 | -1; opacity?: number; color?: string; r?: number; head?: number }) {
  const lines = useRef<THREE.InstancedMesh>(null), heads = useRef<THREE.InstancedMesh>(null), ph = useRef(0)
  const m = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), s = useMemo(() => new THREE.Vector3(), []), p = useMemo(() => new THREE.Vector3(), [])
  const len = y1 - y0
  useFrame((_, d) => {
    ph.current = (ph.current + Math.min(d, 1 / 30) * 0.25) % 1
    const L = lines.current, H = heads.current; if (!L || !H) return
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), dir > 0 ? 0 : Math.PI)
    spots.forEach(([x, z], i) => {
      m.compose(p.set(x, (y0 + y1) / 2, z), new THREE.Quaternion(), s.set(1, 1, 1)); L.setMatrixAt(i, m)
      const u = (ph.current + (i * 0.618) % 1) % 1, y = dir > 0 ? y0 + len * (0.15 + 0.7 * u) : y1 - len * (0.15 + 0.7 * u)
      m.compose(p.set(x, y, z), q, s.set(1, 1, 1)); H.setMatrixAt(i, m)
    })
    L.instanceMatrix.needsUpdate = true; H.instanceMatrix.needsUpdate = true
  })
  if (opacity < 0.01) return null
  const mat = <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.75 * opacity} depthWrite={false} />
  return <group>
    <instancedMesh ref={lines} args={[undefined, undefined, spots.length]} frustumCulled={false} renderOrder={4}><cylinderGeometry args={[r, r, len, 6]} />{mat}</instancedMesh>
    <instancedMesh ref={heads} args={[undefined, undefined, spots.length]} frustumCulled={false} renderOrder={4}><coneGeometry args={[head * 0.4, head, 10]} />{mat}</instancedMesh>
  </group>
}
/** 在一块圆形（或矩形）区域里均匀取一组磁感线的位置 */
export function spotsIn(shape: { r: number } | { w: number; d: number }, step: number, cx = 0, cz = 0): [number, number][] {
  const out: [number, number][] = []
  const half = 'r' in shape ? shape.r : Math.max(shape.w, shape.d) / 2
  for (let x = -half; x <= half + 1e-9; x += step) for (let z = -half; z <= half + 1e-9; z += step) {
    const ok = 'r' in shape ? Math.hypot(x, z) <= shape.r - step * 0.3 : Math.abs(x) <= shape.w / 2 && Math.abs(z) <= shape.d / 2
    if (ok) out.push([cx + x, cz + z])
  }
  return out
}

/** 速度（白）和力（品红、橙）的箭头：跟着一颗粒子走。thick 控制粗细（场景按米画，桌面器材一般 0.04–0.1） */
export function Arrow({ from, dir, len, color, thick = 0.06, opacity = 1 }: { from: V3; dir: V3; len: number; color: string; thick?: number; opacity?: number }) {
  const l = Math.hypot(...dir) || 1, u: V3 = [dir[0] / l, dir[1] / l, dir[2] / l]
  return <ForceArrow tip={[from[0] + u[0] * len, from[1] + u[1] * len, from[2] + u[2] * len]} dir={u} len={len} color={color} thick={thick} opacity={opacity} />
}

/**
 * 跟着粒子走的箭头：每帧问一次 get()，拿到箭头的起点、方向和长度（null 时不画）。
 * 和 Arrow 一样不受遮挡；粗细 thick 同 Arrow。
 */
export function FollowArrow({ get, color, thick = 0.06 }: { get: () => { from: V3; dir: V3; len: number } | null; color: string; thick?: number }) {
  const g = useRef<THREE.Group>(null), shaft = useRef<THREE.Mesh>(null), head = useRef<THREE.Mesh>(null)
  const f = useRef(get); f.current = get
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []), d = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const a = f.current(), G = g.current; if (!G || !shaft.current || !head.current) return
    if (!a || a.len < 1e-4) { G.visible = false; return }
    G.visible = true
    const h = Math.min(0.24 * thick, a.len * 0.6), s = a.len - h
    G.position.set(...a.from); G.quaternion.setFromUnitVectors(up, d.set(...a.dir).normalize())
    shaft.current.scale.set(1, Math.max(1e-4, s), 1); shaft.current.position.y = s / 2
    head.current.scale.set(1, h, 1); head.current.position.y = s + h / 2
  })
  const mat = <meshBasicMaterial color={color} depthTest={false} transparent toneMapped={false} />
  return <group ref={g} visible={false}>
    <mesh ref={shaft} renderOrder={10}><cylinderGeometry args={[0.04 * thick, 0.04 * thick, 1, 12]} />{mat}</mesh>
    <mesh ref={head} renderOrder={10}><coneGeometry args={[0.115 * thick, 1, 16]} />{mat}</mesh>
  </group>
}
