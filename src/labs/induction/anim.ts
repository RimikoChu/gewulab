// 这间实验室常用的几个动画状态：等一会儿再算“停稳了”、一只会走的钟（每帧取时间，不引起重绘）。
import { useEffect, useRef, useState } from 'react'

/** key 变了以后，过 ms 毫秒才算停稳 */
export function useSettled(key: string, ms: number) {
  const [okKey, setOkKey] = useState<string | null>(null)
  useEffect(() => { const t = setTimeout(() => setOkKey(key), ms); return () => clearTimeout(t) }, [key, ms])
  return okKey === key
}

/** 每隔 ms 毫秒加一的计数（交变的东西在画面上来回翻向用） */
export function useTick(ms: number, on = true) {
  const [n, setN] = useState(0)
  useEffect(() => { if (!on) return; const t = setInterval(() => setN(x => x + 1), ms); return () => clearInterval(t) }, [ms, on])
  return n
}

/** 一个每帧往前走的量：rate（每秒走多少）可以随时改；goal 不为 null 时走到 goal 就停。返回取当前值的函数和一个 10 Hz 刷新的读数 */
export function useRunner(start: number) {
  const v = useRef(start), rate = useRef(0), goal = useRef<number | null>(null)
  const [shown, setShown] = useState(start)
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (rate.current) {
        const n = v.current + rate.current * dt
        if (goal.current !== null && (n - goal.current) * Math.sign(rate.current) >= 0) { v.current = goal.current; rate.current = 0; goal.current = null; setShown(v.current) }
        else v.current = n
      }
      acc += dt; if (acc > 0.1) { acc = 0; setShown(v.current) }
      raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [])
  return {
    get: () => v.current, shown, moving: () => rate.current !== 0,
    to: (g: number, speed: number) => { goal.current = g; rate.current = g > v.current ? speed : -speed },
    run: (speed: number) => { goal.current = null; rate.current = speed },
    stop: () => { rate.current = 0; goal.current = null; setShown(v.current) },
    set: (x: number) => { v.current = x; rate.current = 0; goal.current = null; setShown(x) },
  }
}
