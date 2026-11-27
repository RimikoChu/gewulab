// 各课共用的计时状态：按时长走完的动作、一直走的钟、缓动，以及“先提起、平移、再放下”的路径。
import { useEffect, useRef, useState } from 'react'

/** 一个按时长走完的动作：run() 开始，t 从 0 匀速走到 sec，走完调用 onEnd。snap() 直接停在某处 */
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

/** 从某一刻起一直在走的钟：start() 开始计时，stop() 停下归零 */
export function useClock() {
  const [t, setT] = useState(0), [on, setOn] = useState(false)
  const raf = useRef(0)
  useEffect(() => {
    if (!on) return
    let last = performance.now(), acc = 0
    const f = (now: number) => { acc += Math.min(0.05, (now - last) / 1000); last = now; setT(acc); raf.current = requestAnimationFrame(f) }
    raf.current = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf.current)
  }, [on])
  return { t, on, start: () => { setT(0); setOn(true) }, stop: () => { setOn(false); setT(0) } }
}

/** 缓入缓出 */
export const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * x * (x * (6 * x - 15) + 10) }
/** t 落在 [a, b] 里时从 0 走到 1，之前是 0、之后是 1 */
export const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type P3 = [number, number, number]
/** 从 a 到 b：先竖直提到 top，平移，再竖直放下；k 是 0–1 的进度 */
export function liftPath(a: P3, b: P3, top: number, k: number): P3 {
  const up = Math.max(0, top - a[1]), dh = Math.hypot(b[0] - a[0], b[2] - a[2]), down = Math.max(0, top - b[1]), total = up + dh + down || 1
  const u = ease(k) * total
  if (u < up) return [a[0], a[1] + u, a[2]]
  if (u < up + dh) { const q = (u - up) / (dh || 1); return [lerp(a[0], b[0], q), top, lerp(a[2], b[2], q)] }
  return [b[0], top - (u - up - dh), b[2]]
}
/** 两种颜色按 k 混合（显示用，不是计算） */
export const mixHex = (a: string, b: string, k: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), q = Math.max(0, Math.min(1, k))
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - q) + ((pb >> s) & 255) * q)
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}

/** 电极架横臂的姿态：臂长 len（m）、转角 yaw、臂离底座多高 lift（m） */
export interface Arm { len: number; yaw: number; lift: number }
/** 电极尖要落到 (dx, dz)（m，相对电极架底座）、尖离台面 tipY（m）时横臂的姿态。电极挂在臂下 0.13 m */
export const armTo = (dx: number, dz: number, tipY: number): Arm => ({ len: Math.hypot(dx, dz), yaw: Math.atan2(dz, dx), lift: tipY + 0.13 })
/** 从 a 换到 b：先把电极提到 top，转过去、伸缩到位，再放下；k 是 0–1 的进度（前 0.3 提起、中间 0.4 平移、后 0.3 放下，每段各自缓动） */
export function armPath(a: Arm, b: Arm, k: number, top = 0.3): Arm {
  if (k < 0.3) return { ...a, lift: lerp(a.lift, top, ease(k / 0.3)) }
  if (k < 0.7) { const f = ease((k - 0.3) / 0.4); return { len: lerp(a.len, b.len, f), yaw: lerp(a.yaw, b.yaw, f), lift: top } }
  return { ...b, lift: lerp(top, b.lift, ease((k - 0.7) / 0.3)) }
}
