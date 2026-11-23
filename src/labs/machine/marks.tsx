// 画在器材上的示意：力的箭头、支点的记号、力的作用线（虚线延长）、力臂（带两端短线的尺寸线和直角记号）。
// 都不受遮挡、不受光照，画在器材前面一点的平面上。位置由课里从计算核心取来再换成画面坐标，这里只管画。
import { useMemo } from 'react'
import * as THREE from 'three'
import { ForceArrow } from '@/lab-kit'
import type { V3 } from './world'

/** 动力、阻力和它们的力臂用的颜色 */
export const C1 = '#ffb547', C2 = '#5ec8ff', CO = '#ffffff'
const mat = (color: string, opacity = 1) => <meshBasicMaterial color={color} depthTest={false} transparent opacity={opacity} toneMapped={false} />

/** 从 a 到 b 的一段细线；dash 为真时画成虚线（每段 seg 长） */
export function Seg({ a, b, color, r = 0.012, dash = false, seg = 0.08, opacity = 1 }: { a: V3; b: V3; color: string; r?: number; dash?: boolean; seg?: number; opacity?: number }) {
  const parts = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length()
    if (len < 1e-5) return []
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())
    const n = dash ? Math.max(1, Math.round(len / seg)) : 1, out: { p: THREE.Vector3; l: number }[] = []
    for (let i = 0; i < n; i++) { if (dash && i % 2) continue; const k0 = i / n, k1 = dash ? Math.min(1, (i + 0.62) / n) : 1; out.push({ p: A.clone().addScaledVector(d, (k0 + k1) / 2), l: (k1 - k0) * len }) }
    return out.map(o => ({ ...o, q }))
  }, [a[0], a[1], a[2], b[0], b[1], b[2], dash, seg])   // eslint-disable-line react-hooks/exhaustive-deps
  return <>{parts.map((o, i) => <mesh key={i} position={o.p} quaternion={o.q} renderOrder={12}><cylinderGeometry args={[r, r, o.l, 8]} />{mat(color, opacity)}</mesh>)}</>
}

/** 力的示意图上的一个力：从作用点 from 画出，沿 dir，长 len；作用点上一个小圆点 */
export function Force({ from, dir, len, color, thick = 0.4 }: { from: V3; dir: [number, number]; len: number; color: string; thick?: number }) {
  const n = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / n, uy = dir[1] / n
  return <>
    <ForceArrow tip={[from[0] + ux * len, from[1] + uy * len, from[2]]} dir={[ux, uy, 0]} len={len} color={color} thick={thick} />
    <mesh position={from} renderOrder={13}><sphereGeometry args={[0.07 * thick, 12, 10]} />{mat(color)}</mesh>
  </>
}

/** 支点的记号：一个小圆圈。s 是大小 */
export function Pivot({ at, s = 0.1 }: { at: V3; s?: number }) {
  return <group position={at}>
    <mesh renderOrder={13}><ringGeometry args={[s * 0.62, s, 28]} />{mat(CO)}</mesh>
    <mesh renderOrder={13}><circleGeometry args={[s * 0.28, 16]} />{mat(CO)}</mesh>
  </group>
}

/**
 * 力臂：从支点 O 垂直画到力的作用线上的垂足 F。画成一条实线，两端各一道和它垂直的短线；垂足处一个直角记号，指着作用线的方向 line。
 * s 是短线的长度。
 */
export function Arm({ O, F, line, color, s = 0.12, r = 0.012 }: { O: V3; F: V3; line: [number, number]; color: string; s?: number; r?: number }) {
  const dx = F[0] - O[0], dy = F[1] - O[1], len = Math.hypot(dx, dy)
  if (len < 1e-4) return null
  const ux = dx / len, uy = dy / len, nx = -uy * s / 2, ny = ux * s / 2, z = O[2]
  const ln = Math.hypot(line[0], line[1]) || 1, lx = line[0] / ln, ly = line[1] / ln, k = Math.min(s * 0.7, len * 0.3)
  // 直角记号：从垂足沿力臂往回 k，再沿作用线走 k
  const c1: V3 = [F[0] - ux * k, F[1] - uy * k, z], c2: V3 = [F[0] - ux * k + lx * k, F[1] - uy * k + ly * k, z], c3: V3 = [F[0] + lx * k, F[1] + ly * k, z]
  return <>
    <Seg a={O} b={F} color={color} r={r} />
    <Seg a={[O[0] - nx, O[1] - ny, z]} b={[O[0] + nx, O[1] + ny, z]} color={color} r={r} />
    <Seg a={[F[0] - nx, F[1] - ny, z]} b={[F[0] + nx, F[1] + ny, z]} color={color} r={r} />
    <Seg a={c1} b={c2} color={color} r={r * 0.7} /><Seg a={c2} b={c3} color={color} r={r * 0.7} />
  </>
}

/**
 * 力的作用线：过作用点 A、沿 dir 的一条虚线，从 A 往两头各延长，至少盖住垂足 F，再多出一点 extra。
 */
export function ActionLine({ A, F, dir, color, extra = 0.25, r = 0.007, seg = 0.07 }: { A: V3; F: V3; dir: [number, number]; color: string; extra?: number; r?: number; seg?: number }) {
  const n = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / n, uy = dir[1] / n
  const t = (F[0] - A[0]) * ux + (F[1] - A[1]) * uy
  const t0 = Math.min(0, t) - extra, t1 = Math.max(0, t) + extra
  return <Seg a={[A[0] + ux * t0, A[1] + uy * t0, A[2]]} b={[A[0] + ux * t1, A[1] + uy * t1, A[2]]} color={color} r={r} dash seg={seg} opacity={0.85} />
}
