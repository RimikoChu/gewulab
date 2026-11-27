// 各课共用的计时状态：按时长走完的动作、缓动，以及“先提起、平移、再放下”的路径。
import { useEffect, useRef, useState } from 'react'

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

/** 一个一直走的钟（秒）：分子抖动、气泡这类一直在动的东西用 */
export function useTime(on = true) {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!on) return
    let raf = 0, last = performance.now(), acc = 0
    const f = (now: number) => { acc += Math.min(0.05, (now - last) / 1000); last = now; setT(acc); raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [on])
  return t
}

/** 缓入缓出 */
export const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * x * (x * (6 * x - 15) + 10) }
/** t 落在 [a, b] 里时从 0 走到 1，之前是 0、之后是 1 */
export const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type P3 = [number, number, number]
export const lerp3 = (a: P3, b: P3, k: number): P3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]
/** 从 a 到 b：先竖直提到 top，平移，再竖直放下；k 是 0–1 的进度 */
export function liftPath(a: P3, b: P3, top: number, k: number): P3 {
  const up = Math.max(0, top - a[1]), dh = Math.hypot(b[0] - a[0], b[2] - a[2]), down = Math.max(0, top - b[1]), total = up + dh + down || 1
  const d = ease(k) * total
  if (d < up) return [a[0], a[1] + d, a[2]]
  if (d < up + dh) { const q = (d - up) / (dh || 1); return [lerp(a[0], b[0], q), top, lerp(a[2], b[2], q)] }
  return [b[0], top - (d - up - dh), b[2]]
}
