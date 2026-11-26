// 各课共用的计时状态和搬运：按时长走完的动作、缓动、“先提起、平移、再放下”的路径，
// 以及让托盘上的东西跟着托盘上下的 Carry。
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type V3 = [number, number, number]
/** 天平此刻的状态：左右两只托盘比水平位置高出多少、横梁的倾角。天平每帧写，盘里的东西每帧读 */
export interface Live { yL: number; yR: number; th: number }
export const newLive = (): Live => ({ yL: 0, yR: 0, th: 0 })

/** 一个按时长走完的动作：run() 开始，t 从 0 匀速走到 sec（按时间算），走完调用 onEnd。snap() 直接跳到某处 */
export function useRun(sec: number, onEnd?: () => void) {
  const [t, setT] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ t: 0, raf: 0 }), cb = useRef(onEnd); cb.current = onEnd
  const run = () => {
    cancelAnimationFrame(s.current.raf); s.current.t = 0; setT(0); setBusy(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      s.current.t = Math.min(sec, s.current.t + dt); setT(s.current.t)
      if (s.current.t < sec) s.current.raf = requestAnimationFrame(f); else { setBusy(false); cb.current?.() }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  return { t, k: t / sec, busy, run, snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.t = v; setT(v); setBusy(false) } }
}

/** 一件事变了以后，过 ms 毫秒才算“稳住了”：天平摆动、砝码还在半路的时候不许读数 */
export function useSettled(sig: string | number, ms = 2200) {
  const [seen, setSeen] = useState(sig)
  useEffect(() => { if (seen === sig) return; const t = setTimeout(() => setSeen(sig), ms); return () => clearTimeout(t) }, [sig, seen, ms])
  return seen === sig
}
/** 晚 ms 毫秒才跟上的值：东西还在半路上的时候，天平先不动 */
export function useLag<T>(v: T, ms: number) {
  const [seen, setSeen] = useState(v)
  useEffect(() => { if (Object.is(seen, v)) return; const t = setTimeout(() => setSeen(v), ms); return () => clearTimeout(t) }, [v, ms])   // eslint-disable-line react-hooks/exhaustive-deps
  return seen
}

/** 缓入缓出 */
export const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * x * (x * (6 * x - 15) + 10) }
/** t 落在 [a, b] 里时从 0 走到 1，之前是 0、之后是 1 */
export const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
/** 从 a 到 b：先竖直提到 top，平移，再竖直放下；k 是 0–1 的进度 */
export function liftPath(a: V3, b: V3, top: number, k: number): V3 {
  const up = Math.max(0, top - a[1]), dh = Math.hypot(b[0] - a[0], b[2] - a[2]), down = Math.max(0, top - b[1]), total = up + dh + down || 1
  const u = ease(k) * total
  if (u < up) return [a[0], a[1] + u, a[2]]
  if (u < up + dh) { const q = (u - up) / (dh || 1); return [lerp(a[0], b[0], q), top, lerp(a[2], b[2], q)] }
  return [b[0], top - (u - up - dh), b[2]]
}

/**
 * 搬运：at 一变，里面的东西先竖直提起来，平移过去，再竖直放下，不会横着撞到别的器材。
 * ride：落在哪只托盘上（落稳以后跟着托盘上下）；lift：平移时比两头高出多少；snap 变了就直接到位，不走过程；
 * extra：只在搬的过程中出现的东西（夹着它的镊子、拿着它的手）；flag：每帧报告是不是还在路上。
 */
export function Carry({ at, ride = null, live, lift = 0.45, speed = 2, snap, extra, flag, children }: { at: V3; ride?: 'L' | 'R' | null; live?: RefObject<Live>; lift?: number; speed?: number; snap?: string | number; extra?: ReactNode; flag?: (moving: boolean) => void; children: ReactNode }) {
  const g = useRef<THREE.Group>(null), ex = useRef<THREE.Group>(null)
  const s = useRef({ p: new THREE.Vector3(...at), from: new THREE.Vector3(...at), to: new THREE.Vector3(...at), t: 1, a: 0, b: 0, c: 0 })
  useLayoutEffect(() => { const q = s.current; q.p.set(...at); q.to.set(...at); q.t = 1 }, [snap])   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const q = s.current
    if (q.to.x === at[0] && q.to.y === at[1] && q.to.z === at[2]) return
    q.from.copy(q.p); q.to.set(...at); q.t = 0
    const dh = Math.hypot(at[0] - q.from.x, at[2] - q.from.z), top = Math.max(q.from.y, at[1]) + lift
    if (dh < 0.01) { q.a = 0; q.b = 0; q.c = Math.abs(at[1] - q.from.y) } else { q.a = top - q.from.y; q.b = dh; q.c = top - at[1] }
  }, [at[0], at[1], at[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, d) => {
    const q = s.current, dt = Math.min(d, 1 / 30), total = q.a + q.b + q.c
    if (q.t < 1) {
      q.t = Math.min(1, q.t + dt * speed / Math.max(total, 0.5))
      const u = ease(q.t) * total
      if (q.b === 0) q.p.set(q.to.x, q.from.y + (q.to.y - q.from.y) * ease(q.t), q.to.z)
      else if (u < q.a) q.p.set(q.from.x, q.from.y + u, q.from.z)
      else if (u < q.a + q.b) { const k = (u - q.a) / q.b; q.p.set(q.from.x + (q.to.x - q.from.x) * k, q.from.y + q.a, q.from.z + (q.to.z - q.from.z) * k) }
      else q.p.set(q.to.x, q.from.y + q.a - (u - q.a - q.b), q.to.z)
    }
    const off = ride && live?.current ? (ride === 'L' ? live.current.yL : live.current.yR) * q.t ** 6 : 0
    g.current?.position.set(q.p.x, q.p.y + off, q.p.z)
    if (ex.current) ex.current.visible = q.t < 1
    flag?.(q.t < 1)
  })
  return <group ref={g} position={at}>{children}{extra && <group ref={ex} visible={false}>{extra}</group>}</group>
}

/** 跟着托盘上下：放在托盘上的东西（不搬动的时候）每帧读天平的状态 */
export function OnPan({ side, live, children }: { side: 'L' | 'R'; live: RefObject<Live>; children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => { if (g.current && live.current) g.current.position.y = side === 'L' ? live.current.yL : live.current.yR })
  return <group ref={g}>{children}</group>
}
