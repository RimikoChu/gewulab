// 各课共用的小东西：匀速走到目标的数、“稳住了没有”、按时长走完的动作、数字格式。
import { useEffect, useRef, useState } from 'react'

/** 一个数匀速走向目标；snap 直接跳到某处（拖滑片时用） */
export function useTween(start: number, speed: number) {
  const [goal, setGoal] = useState(start), [x, setX] = useState(start), [kick, setKick] = useState(0), cur = useRef(start), raf = useRef(0)
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
  }, [goal, speed, kick])
  return { x, goal, moving: x !== goal, go: (v: number) => { setGoal(v); setKick(k => k + 1) }, snap: (v: number) => { cancelAnimationFrame(raf.current); cur.current = v; setX(v); setGoal(v) } }
}

/** 一件事变了以后，过 ms 毫秒才算稳住：指针还在摆的时候不许记录 */
export function useSettled(sig: string | number, ms = 1200) {
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

/** 过 ms 毫秒后做一件事；组件卸下或重来时取消 */
export function useLater() {
  const ts = useRef<number[]>([])
  useEffect(() => () => ts.current.forEach(clearTimeout), [])
  return { after: (ms: number, f: () => void) => { ts.current.push(window.setTimeout(f, ms)) }, clear: () => { ts.current.forEach(clearTimeout); ts.current = [] } }
}

export const ease = (t: number) => t * t * (3 - 2 * t)
export const f1 = (x: number) => x.toFixed(1), f2 = (x: number) => x.toFixed(2), f0 = (x: number) => x.toFixed(0)
