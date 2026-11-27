// 这间实验室自己的小状态：一段有头有尾的动画（画一圈、走一遍、光线飞过去）。
import { useEffect, useRef, useState } from 'react'

/** 一段 seconds 秒的动画：t 从 0 匀速走到 1。start 从头开始，reset 回到 0 */
export function useRun(seconds: number) {
  const [t, setT] = useState(0), raf = useRef(0)
  const stop = () => cancelAnimationFrame(raf.current)
  useEffect(() => stop, [])
  const start = () => {
    stop(); const t0 = performance.now()
    const f = (now: number) => { const k = Math.min(1, Math.max(0, (now - t0) / 1000 / seconds)); setT(k); if (k < 1) raf.current = requestAnimationFrame(f) }
    setT(0); raf.current = requestAnimationFrame(f)
  }
  return { t, start, reset: () => { stop(); setT(0) }, running: t > 0 && t < 1, done: t >= 1 }
}
/** 先慢、中间快、最后慢 */
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
