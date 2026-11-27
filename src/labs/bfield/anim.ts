// 这间实验室常用的几个动画状态：等一会儿再算“停稳了”、按顺序做几件事、一只会走的钟、阻尼摆动。
import { useEffect, useRef, useState } from 'react'

/** key 变了以后，过 ms 毫秒才算停稳 */
export function useSettled(key: string, ms: number) {
  const [okKey, setOkKey] = useState<string | null>(null)
  useEffect(() => { const t = setTimeout(() => setOkKey(key), ms); return () => clearTimeout(t) }, [key, ms])
  return okKey === key
}

/** 按顺序做几件事：run([[等多少毫秒, 做什么], …])；busy 表示还没做完。重做本课时 stop() 取消 */
export function useSeq() {
  const [busy, setBusy] = useState(false), timers = useRef<number[]>([])
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; setBusy(false) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const run = (steps: [number, () => void][]) => {
    stop(); setBusy(true); let t = 0
    steps.forEach(([ms, f], i) => { t += ms; timers.current.push(window.setTimeout(() => { f(); if (i === steps.length - 1) setBusy(false) }, t)) })
    if (!steps.length) setBusy(false)
  }
  return { busy, run, stop }
}

/**
 * 画面里的时间：从 start() 那一刻起走，单位秒。三维部分每帧调 now() 取时间（不引起重绘）；
 * tick 每隔 step 秒变一次，界面上要跟着时间变的读数用它。
 */
export function useClock(step = 0.1) {
  const t0 = useRef<number | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => { if (t0.current !== null) setTick((performance.now() - t0.current) / 1000) }, step * 1000)
    return () => clearInterval(id)
  }, [step])
  return {
    now: () => (t0.current === null ? -1 : (performance.now() - t0.current) / 1000),
    start: () => { t0.current = performance.now(); setTick(0) },
    stop: () => { t0.current = null; setTick(0) },
    running: t0.current !== null,
    tick,
  }
}

/** 阻尼摆动：一个量朝目标摆过去，会摆过头几次再停（吊着的导体棒） */
export function swing(s: { a: number; v: number }, goal: number, dt: number, w = 4.2, z = 0.16) {
  for (let i = 0; i < 4; i++) { const h = dt / 4; s.v += (w * w * (goal - s.a) - 2 * z * w * s.v) * h; s.a += s.v * h }
  return s.a
}
