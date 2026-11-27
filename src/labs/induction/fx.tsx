// 把看不见的东西画出来：磁感线（一束细线，每根上一只顺着方向慢慢走的小箭头）、力和方向的箭头、沿闭合线圈流动的电流光点。
// 颜色全间统一（layout.ts 的 COL）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { ForceArrow } from '@/lab-kit'
import { COL } from './layout'
import type { V3 } from './physics'

/**
 * 一束磁感线：lines 是每根线途经的点（按磁感线的方向排）。线画成细管，每根上有 heads 只小箭头沿线移动。
 * 同一束线颜色相同；要区分“穿过线圈的”和“没穿过的”，就分成两束画（亮的、暗的）。
 */
export function FieldLines({ lines, color = COL.B, opacity = 1, r = 0.0011, head = 0.01, heads = 1, speed = 0.18, flip = false }: { lines: V3[][]; color?: string; opacity?: number; r?: number; head?: number; heads?: number; speed?: number; flip?: boolean }) {
  const { geo, curves } = useMemo(() => {
    const cs = lines.filter(l => l.length > 1).map(l => new THREE.CatmullRomCurve3(l.map(p => new THREE.Vector3(...p))))
    const gs = cs.map((c, i) => new THREE.TubeGeometry(c, Math.max(4, lines[i].length * 4), r, 5))
    return { geo: gs.length ? mergeGeometries(gs) : null, curves: cs }
  }, [JSON.stringify(lines), r])   // eslint-disable-line react-hooks/exhaustive-deps
  const inst = useRef<THREE.InstancedMesh>(null), ph = useRef(0)
  const m = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), up = useMemo(() => new THREE.Vector3(0, 1, 0), []), t = useMemo(() => new THREE.Vector3(), []), s = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const n = curves.length * heads
  useFrame((_, d) => {
    ph.current = (ph.current + Math.min(d, 1 / 30) * speed) % 1
    const im = inst.current; if (!im) return
    curves.forEach((c, i) => {
      for (let k = 0; k < heads; k++) {
        let u = (ph.current + k / heads + (i * 0.618) % 1) % 1; if (flip) u = 1 - u
        u = 0.06 + 0.88 * u
        c.getTangentAt(u, t); if (flip) t.negate()
        q.setFromUnitVectors(up, t.normalize())
        m.compose(c.getPointAt(u), q, s); im.setMatrixAt(i * heads + k, m)
      }
    })
    im.instanceMatrix.needsUpdate = true
  })
  if (opacity < 0.01 || !geo) return null
  const mat = <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.8 * opacity} depthWrite={false} />
  return <group>
    <mesh geometry={geo} renderOrder={4}>{mat}</mesh>
    {n > 0 && <instancedMesh key={n} ref={inst} args={[undefined, undefined, n]} frustumCulled={false} renderOrder={4}><coneGeometry args={[head * 0.42, head, 10]} />{mat}</instancedMesh>}
  </group>
}

/** 方向箭头：从 from 出发、沿 dir 长 len。不受遮挡，随时看得见。thick 控制粗细（桌面器材一般 0.04–0.1） */
export function Arrow({ from, dir, len, color, thick = 0.06, opacity = 1 }: { from: V3; dir: V3; len: number; color: string; thick?: number; opacity?: number }) {
  const l = Math.hypot(...dir) || 1, u: V3 = [dir[0] / l, dir[1] / l, dir[2] / l]
  return <ForceArrow tip={[from[0] + u[0] * len, from[1] + u[1] * len, from[2] + u[2] * len]} dir={u} len={len} color={color} thick={thick} opacity={opacity} />
}

/**
 * 沿一条闭合路线流动的电流光点：pts 是路线上的点（首尾相接），flow 是电流（正负是方向，0 不流）。
 * 线圈里的感应电流、导轨回路里的电流都用它；光点不受遮挡。flowFn：每帧问一次电流（交变电流用），给了就不看 flow
 */
export function LoopFlow({ pts, flow, flowFn, dots = 24, size = 0.0035, closed = true, speed = 1, color = COL.cur }: { pts: V3[]; flow: number; flowFn?: () => number; dots?: number; size?: number; closed?: boolean; speed?: number; color?: string }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed, 'centripetal', 0.1), [JSON.stringify(pts), closed])   // eslint-disable-line react-hooks/exhaustive-deps
  const inst = useRef<THREE.InstancedMesh>(null), ph = useRef(0), m = useMemo(() => new THREE.Matrix4(), [])
  const f = useRef(flow); f.current = flow
  const fn = useRef(flowFn); fn.current = flowFn
  useFrame((_, d) => {
    const im = inst.current; if (!im) return
    if (fn.current) f.current = fn.current()
    ph.current += Math.min(d, 1 / 30) * f.current * 0.25 * speed
    const on = Math.abs(f.current) > 0.02 ? 1 : 0
    for (let i = 0; i < dots; i++) {
      const u = (((i / dots + ph.current) % 1) + 1) % 1
      m.makeScale(on, on, on).setPosition(curve.getPointAt(u)); im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={inst} args={[undefined, undefined, dots]} renderOrder={9} frustumCulled={false}>
    <sphereGeometry args={[size, 10, 8]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent opacity={0.95} />
  </instancedMesh>
}

/** 条形磁铁周围的磁感线（磁铁竖着放，N 极朝下或朝上）：在过磁铁轴线的几个竖直平面里，各画几条从 N 极出发、绕回 S 极的弧线 */
export function barLines(c: V3, half: number, nDown: boolean, rings = [0.012, 0.024, 0.04, 0.062], planes = 4): V3[][] {
  const out: V3[][] = []
  for (let p = 0; p < planes; p++) {
    const a = p / planes * Math.PI
    for (const sgn of [1, -1]) for (const w of rings) {
      const pts: V3[] = []
      // 一条近似的偶极子磁感线：r = k sin²θ，从轴线的一端绕到另一端
      const k = w * 2.2 + half * 1.4
      for (let i = 0; i <= 28; i++) {
        const th = 0.18 + (Math.PI - 0.36) * i / 28, rr = k * Math.sin(th) ** 2
        const rad = rr * Math.sin(th), ax = rr * Math.cos(th) * 1.25
        const y = nDown ? -ax : ax   // N 极在下：线从下端出来
        pts.push([c[0] + sgn * rad * Math.cos(a), c[1] + y + (nDown ? 0 : 0), c[2] + sgn * rad * Math.sin(a)])
      }
      out.push(pts)
    }
  }
  return out
}
