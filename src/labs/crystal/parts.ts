// 各课共用的小工具：按时长走完的动作、一直走的钟、缓动。
import { useEffect, useRef, useState } from 'react'

/** 一个按时长走完的动作：run() 开始，t 从 0 匀速走到 sec，走完调用 onEnd。snap() 直接跳到某处 */
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
export type Run = ReturnType<typeof useRun>

/** 一个一直走的钟（秒）：粒子的振动、电子的流动这类一直在动的东西用 */
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
/** 弹一下再停住：松开的电子对冲过头一点再回来 */
export const spring = (t: number) => { const x = Math.max(0, Math.min(1, t)); return 1 - Math.exp(-5.2 * x) * Math.cos(9.5 * x) * (1 - x) }
export const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
