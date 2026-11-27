// 兴奋的传导和传递 · 各课共用的小工具：向量、插值、可重复的随机数、一只“秒表”（三维画面每帧读它，界面隔一会儿读一次）。
import { useCallback, useEffect, useRef, useState } from 'react'

export type V3 = [number, number, number]
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** 平滑的 0→1：x 从 a 走到 b */
export const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t) }
export const mix = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
/** 可重复的伪随机数 */
export function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
/** 折线上走到 t（0–1）的位置：各段按长度分配 */
export function along(pts: V3[], t: number): V3 {
  const L = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2])), sum = L.reduce((a, b) => a + b, 0)
  let d = clamp(t) * sum
  for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) return mix(pts[i], pts[i + 1], L[i] ? clamp(d / L[i]) : 0); d -= L[i] }
  return pts[0]
}

/**
 * 一只秒表：start() 以后 ref.current 从 0 走到 total（秒），到了就停，done 变成 true。
 * 三维画面在 useFrame 里读 ref；now 是给界面用的（每 80 ms 更新一次）。start(until, hold)：只走到 until 秒；hold 为真时到了算“定住”，不算走完
 */
export function useRun(total: number) {
  const ref = useRef(0), stop = useRef(total), holdAt = useRef(false)
  const [state, setState] = useState<'idle' | 'run' | 'hold' | 'done'>('idle')
  const [now, setNow] = useState(0)
  const [n, setN] = useState(0)             // 第几次开始：换一次就重新走
  useEffect(() => {
    if (state !== 'run') return
    let raf = 0, last = performance.now(), shown = 0
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t
      ref.current = Math.min(stop.current, ref.current + dt)
      if (t - shown > 80) { shown = t; setNow(ref.current) }
      if (ref.current >= stop.current) { setNow(ref.current); setState(holdAt.current ? 'hold' : 'done'); return }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [state, n, total])
  const start = useCallback((until = total, hold = false) => { ref.current = 0; stop.current = until; holdAt.current = hold; setNow(0); setN(k => k + 1); setState('run') }, [total])
  const resume = useCallback(() => { stop.current = total; holdAt.current = false; setN(k => k + 1); setState('run') }, [total])
  const reset = useCallback(() => { ref.current = 0; setNow(0); setState('idle') }, [])
  return { ref, now, state, running: state === 'run', done: state === 'done', held: state === 'hold', idle: state === 'idle', start, resume, reset }
}
export type Run = ReturnType<typeof useRun>

/** 在一个长方体里撒 n 个点，彼此不挨着（离子的位置）。lo、hi 是长方体的两个角 */
export function scatter(n: number, lo: V3, hi: V3, seed: number, gap = 0.42): V3[] {
  const rnd = rng(seed), out: V3[] = []
  for (let k = 0; out.length < n && k < n * 60; k++) {
    const p: V3 = [lerp(lo[0], hi[0], rnd()), lerp(lo[1], hi[1], rnd()), lerp(lo[2], hi[2], rnd())]
    if (out.every(o => Math.hypot(o[0] - p[0], o[1] - p[1], o[2] - p[2]) > gap)) out.push(p)
  }
  return out
}
