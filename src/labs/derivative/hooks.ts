// 这间实验室自己用的小状态：一段 0 → 1 的过渡。
import { useEffect, useRef, useState } from 'react'

/** run 每换一个非 0 的值，就从 0 走到 1，用 dur 秒；run 为 0 时是 0。ease：两头慢中间快 */
export function useRamp(run: number, dur: number, ease = false) {
  const [p, setP] = useState(0), raf = useRef(0)
  useEffect(() => {
    cancelAnimationFrame(raf.current)
    if (!run) { setP(0); return }
    const t0 = performance.now()
    const f = (now: number) => { const v = Math.min(1, (now - t0) / 1000 / dur); setP(v); if (v < 1) raf.current = requestAnimationFrame(f) }
    setP(0); raf.current = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf.current)
  }, [run, dur])
  return ease ? p * p * (3 - 2 * p) : p
}
