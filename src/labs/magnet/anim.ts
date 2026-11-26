// 这间实验室里常用的几个动画状态：一组数匀速走到目标、等一会儿再算“停稳了”、按顺序做几件事。
import { useEffect, useRef, useState } from 'react'

/** 一组数（位置、角度）以恒定速度一起走到目标；moving 表示还在走 */
export function useGoto(to: number[], speed: number) {
  const [x, setX] = useState(to), cur = useRef(to.slice()), key = to.join(',')
  useEffect(() => {
    let raf = 0, last = performance.now()
    const goal = key.split(',').map(Number)
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now
      const d = goal.map((g, i) => g - (cur.current[i] ?? g)), len = Math.hypot(...d)
      if (len <= Math.max(1e-9, speed * dt)) cur.current = goal.slice()
      else cur.current = cur.current.map((c, i) => c + d[i] / len * speed * dt)
      setX(cur.current.slice())
      if (len > Math.max(1e-9, speed * dt)) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [key, speed])
  const moving = x.some((v, i) => Math.abs(v - to[i]) > 1e-4)
  /** 立刻跳到目标（重做本课时用） */
  const snap = (v: number[]) => { cur.current = v.slice(); setX(v.slice()) }
  return { x, moving, snap }
}

/** key 变了以后，过 ms 毫秒才算停稳 */
export function useSettled(key: string, ms: number) {
  // 记下是哪个 key 停稳的：key 刚变的那一帧，旧的“停稳”不算数
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

/** 阻尼摆动：一个角度朝目标摆过去，会摆过头几次再停（悬挂的磁体、小磁针） */
export function swing(s: { a: number; v: number }, goal: number, dt: number, w = 3.2, z = 0.12) {
  for (let i = 0; i < 4; i++) { const h = dt / 4, e = Math.atan2(Math.sin(goal - s.a), Math.cos(goal - s.a)); s.v += (w * w * e - 2 * z * w * s.v) * h; s.a += s.v * h }
  return s.a
}
