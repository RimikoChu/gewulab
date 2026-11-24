// 各课共用的小东西：匀速走到目标、能直接拖的滑片、指针稳住了没有、按时长走完的动作。
import { useEffect, useRef, useState } from 'react'

/** 一个数匀速走向目标；snap 直接跳到某处（拖滑片时用）。返回当前值、目标、是否在走 */
export function useTween(start: number, speed: number) {
  const [goal, setGoal] = useState(start), [x, setX] = useState(start), cur = useRef(start), raf = useRef(0)
  useEffect(() => {
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const d = goal - cur.current
      cur.current = Math.abs(d) <= speed * dt ? goal : cur.current + Math.sign(d) * speed * dt
      setX(cur.current)
      if (cur.current !== goal) raf.current = requestAnimationFrame(f)
    }
    if (cur.current !== goal) raf.current = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf.current)
  }, [goal, speed])
  return { x, goal, moving: x !== goal, go: setGoal, snap: (v: number) => { cancelAnimationFrame(raf.current); cur.current = v; setX(v); setGoal(v) } }
}

/** 一件事变了以后，过 ms 毫秒才算“稳住了”：指针还在摆的时候不许记录 */
export function useSettled(sig: string | number, ms = 1300) {
  const [seen, setSeen] = useState(sig)
  useEffect(() => { if (seen === sig) return; const t = setTimeout(() => setSeen(sig), ms); return () => clearTimeout(t) }, [sig, seen, ms])
  return seen === sig
}

/** 一个按时长走完的动作：run() 开始，k 从 0 匀速走到 1，走完调用 onEnd */
export function useRun(sec: number, onEnd?: () => void) {
  const [k, setK] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ k: 0, raf: 0 }), cb = useRef(onEnd); cb.current = onEnd
  const run = () => {
    cancelAnimationFrame(s.current.raf); s.current.k = 0; setK(0); setBusy(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      s.current.k = Math.min(1, s.current.k + dt / sec); setK(s.current.k)
      if (s.current.k < 1) s.current.raf = requestAnimationFrame(f); else { setBusy(false); cb.current?.() }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  return { k, busy, run, snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.k = v; setK(v); setBusy(false) } }
}

/** 缓入缓出 */
export const ease = (t: number) => t * t * t * (t * (6 * t - 15) + 10)
export const f1 = (x: number) => x.toFixed(1), f2 = (x: number) => x.toFixed(2)
