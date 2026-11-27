// 往前推演若干年：时间匀速走，走到头自己停。各课的“观察 N 年”都用它。
import { useEffect, useState } from 'react'

/** years：一共推演几年；sec：一年走几秒。t 是现在走到第几年（带小数） */
export function useYears(years: number, sec: number) {
  const [t, setT] = useState(0), [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    let raf = 0, last = performance.now()
    const f = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; setT(v => Math.min(years, v + dt / sec)); raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [running, years, sec])
  useEffect(() => { if (running && t >= years) setRunning(false) }, [t, running, years])
  return { t, running, done: !running && t >= years, start: () => { setT(0); setRunning(true) }, clear: () => { setT(0); setRunning(false) } }
}
/** 0 到 t 之间每隔 step 一个点，最后补上 t 自己 */
export const upto = (t: number, step = 1) => { const out: number[] = []; for (let x = 0; x <= t + 1e-9; x += step) out.push(Math.round(x * 1000) / 1000); return out }
