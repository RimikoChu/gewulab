// 一段“有过程的动作”的计时：按下去以后时间从 0 匀速走到 duration（秒），到了就停。飞行、过河、喷水都用它。
import { useCallback, useEffect, useRef, useState } from 'react'

/** rate：画面里的时间比真实时间快多少倍（1 是原速，小于 1 是慢放） */
export function useRun(duration: number, rate = 1) {
  const [t, setT] = useState<number | null>(null)          // null：还没开始
  const [running, setRunning] = useState(false)
  const raf = useRef(0), dur = useRef(duration); dur.current = duration
  const rt = useRef(rate); rt.current = rate
  const stop = () => { cancelAnimationFrame(raf.current); raf.current = 0 }
  useEffect(() => stop, [])
  const start = useCallback(() => {
    stop(); let cur = 0, last = performance.now(); setT(0); setRunning(true)
    const frame = (now: number) => {
      cur = Math.min(dur.current, cur + Math.min(0.05, (now - last) / 1000) * rt.current); last = now; setT(cur)
      if (cur >= dur.current) { raf.current = 0; setRunning(false); return }
      raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
  }, [])
  const reset = useCallback(() => { stop(); setT(null); setRunning(false) }, [])
  return { t, running, done: t !== null && !running, start, reset }
}
