// 把看不见的东西画出来：电场线（细线加沿线移动的箭头）、力和速度的箭头、正负号、发光的粒子和拖尾、电子束的辉光、火花。
// 颜色全间统一（layout.ts 的 COL）。
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { ForceArrow } from '@/lab-kit'
import { COL } from './layout'
import { makeSign } from './mats'
import type { V3 } from './physics'

/** 力（品红）、速度（白）的箭头：从 from 出发，沿 dir，长 len。thick 控制粗细（桌面器材一般 0.05–0.1） */
export function Arrow({ from, dir, len, color, thick = 0.07, opacity = 1 }: { from: V3; dir: V3; len: number; color: string; thick?: number; opacity?: number }) {
  const l = Math.hypot(...dir) || 1, u: V3 = [dir[0] / l, dir[1] / l, dir[2] / l]
  return <ForceArrow tip={[from[0] + u[0] * len, from[1] + u[1] * len, from[2] + u[2] * len]} dir={u} len={len} color={color} thick={thick} opacity={opacity} />
}

/**
 * 一组电场线：每条是一串点，画成细管；每条线上有 heads 个箭头顺着线慢慢走，看得出方向。
 * level 是整体的明暗（0 不画）。线不多画，疏密由调用的人按场强给。
 */
export function FieldLines({ lines, color = COL.E, r = 0.0012, head = 0.012, heads = 1, level = 1, speed = 0.12 }: { lines: V3[][]; color?: string; r?: number; head?: number; heads?: number; level?: number; speed?: number }) {
  const data = useMemo(() => {
    const curves = lines.filter(l => l.length >= 2).map(l => new THREE.CatmullRomCurve3(l.map(p => new THREE.Vector3(...p)), false, 'centripetal'))
    const geo = curves.length ? mergeGeometries(curves.map(c => new THREE.TubeGeometry(c, Math.max(2, Math.min(80, c.points.length * 2)), r, 6))) : null
    return { geo, samples: curves.map(c => c.getSpacedPoints(48)) }
  }, [lines, r])
  const inst = useRef<THREE.InstancedMesh>(null), ph = useRef(0)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), d: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), up: new THREE.Vector3(0, 1, 0) }), [])
  const n = data.samples.length * heads
  useFrame((_, dt) => {
    ph.current = (ph.current + Math.min(dt, 1 / 30) * speed) % 1
    const im = inst.current; if (!im) return
    data.samples.forEach((pts, i) => {
      for (let j = 0; j < heads; j++) {
        const u = 0.12 + 0.76 * ((ph.current + j / heads + (i * 0.37) % 1) % 1), k = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)))
        tmp.d.subVectors(pts[k + 1], pts[k]).normalize(); tmp.q.setFromUnitVectors(tmp.up, tmp.d)
        const fade = Math.min(1, Math.min(u - 0.12, 0.88 - u) / 0.08)
        tmp.m.compose(pts[k], tmp.q, tmp.s.setScalar(Math.max(0.001, fade))); im.setMatrixAt(i * heads + j, tmp.m)
      }
    })
    im.instanceMatrix.needsUpdate = true
  })
  if (!data.geo || level < 0.01) return null
  const mat = <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85 * level} depthWrite={false} />
  return <group>
    <mesh geometry={data.geo} renderOrder={4}>{mat}</mesh>
    <instancedMesh key={n} ref={inst} args={[undefined, undefined, n]} frustumCulled={false} renderOrder={4}><coneGeometry args={[head * 0.38, head, 10]} />{mat}</instancedMesh>
  </group>
}

/** 正号或负号的小圆牌：总朝着镜头，贴在带电体上 */
export function Sign({ at, kind, size = 0.02, opacity = 1 }: { at: V3; kind: '+' | '−'; size?: number; opacity?: number }) {
  const map = makeSign(kind, kind === '+' ? COL.pos : COL.neg)
  if (opacity < 0.02) return null
  return <sprite position={at} scale={[size, size, 1]} renderOrder={12}><spriteMaterial map={map} depthTest={false} transparent opacity={opacity} toneMapped={false} /></sprite>
}

/** 粒子在时刻 t 的位置；还没出发或已经结束时返回 null */
export type PathFn = (t: number) => V3 | null
/** 一颗发光的粒子带一条渐暗的拖尾。pos(t) 给出位置，clock() 给出现在的时刻（秒）。拖尾是它过去 tail 秒里走过的地方 */
export function Comet({ pos, clock, color, size = 0.006, tail = 0.4, n = 28 }: { pos: PathFn; clock: () => number; color: string; size?: number; tail?: number; n?: number }) {
  const head = useRef<THREE.Group>(null), inst = useRef<THREE.InstancedMesh>(null)
  const m = useMemo(() => new THREE.Matrix4(), []), c = useMemo(() => new THREE.Color(), []), base = useMemo(() => new THREE.Color(color), [color])
  const f = useRef(pos); f.current = pos
  const clk = useRef(clock); clk.current = clock
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
    <group ref={head} visible={false}>
      <mesh renderOrder={8}><sphereGeometry args={[size, 16, 12]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      <mesh renderOrder={8} scale={1.9}><sphereGeometry args={[size, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    </group>
    <instancedMesh ref={inst} args={[undefined, undefined, n]} renderOrder={7} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial toneMapped={false} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  </group>
}

/** 一道发光的轨迹（电子束、墨滴走过的路）：细的亮芯加一层宽的光晕 */
export function Glow({ pts, color = COL.glow, r = 0.0016, level = 1, halo = 4 }: { pts: V3[]; color?: string; r?: number; level?: number; halo?: number }) {
  const geo = useMemo(() => {
    if (pts.length < 2) return null
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'), seg = Math.min(300, pts.length * 3)
    return { core: new THREE.TubeGeometry(c, seg, r, 8), halo: new THREE.TubeGeometry(c, seg, r * halo, 10) }
  }, [JSON.stringify(pts), r, halo])   // eslint-disable-line react-hooks/exhaustive-deps
  if (!geo || level < 0.01) return null
  return <group>
    <mesh geometry={geo.core} renderOrder={6}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={level} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    <mesh geometry={geo.halo} renderOrder={5}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.16 * level} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
  </group>
}

/** 火花：亮一下就灭。fire 每加一就闪一次 */
export function Spark({ at, fire, size = 0.02 }: { at: V3; fire: number; size?: number }) {
  const g = useRef<THREE.Group>(null), t = useRef(9), seen = useRef(fire)
  useFrame((_, dt) => {
    if (seen.current !== fire) { seen.current = fire; t.current = 0 }
    t.current += dt
    const k = t.current < 0.05 ? t.current / 0.05 : Math.exp(-(t.current - 0.05) / 0.12)
    if (g.current) { g.current.visible = k > 0.02; g.current.scale.setScalar(size * (0.6 + k)) }
  })
  return <group ref={g} position={at} visible={false}>
    <mesh renderOrder={11}><sphereGeometry args={[0.5, 12, 10]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
    <mesh renderOrder={11} scale={2.4}><sphereGeometry args={[0.5, 12, 10]} /><meshBasicMaterial color="#9fd0ff" toneMapped={false} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
  </group>
}
