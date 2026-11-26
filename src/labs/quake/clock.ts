// 各课的时钟：地震后过了多少秒（画面里的时间）。rate 可以是一个数，也可以是“按此刻的时间给出快放倍数”的函数。
import { useEffect, useRef, useState } from 'react'

export function useClock(run: boolean, rate: number | ((t: number) => number), end: number) {
  const [t, setT] = useState(0), cur = useRef(0), rateRef = useRef(rate)
  rateRef.current = rate
  useEffect(() => {
    if (!run) { cur.current = 0; setT(0); return }
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const r = rateRef.current, k = typeof r === 'number' ? r : r(cur.current)
      cur.current = Math.min(end, cur.current + dt * k); setT(cur.current)
      if (cur.current < end) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [run, end])
  return t
}
/** 一件事延迟 ms 毫秒后做；deps 变了就重新计时 */
export function useLater(on: boolean, ms: number, f: () => void, deps: unknown[] = []) {
  const ref = useRef(f); ref.current = f
  useEffect(() => { if (!on) return; const id = setTimeout(() => ref.current(), ms); return () => clearTimeout(id) }, [on, ms, ...deps])   // eslint-disable-line react-hooks/exhaustive-deps
}
